import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  writeBatch,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// ==========================================
// AUDIT LOG SERVICE
// ==========================================
export async function logAudit(
  userId: string,
  userName: string,
  userRole: string,
  institutionId: string,
  action: string,
  details: string
) {
  try {
    if (!institutionId) return;
    await addDoc(collection(db, 'audit_logs'), {
      institutionId,
      userId: userId || 'system',
      userName: userName || 'System Engine',
      userRole: userRole || 'system',
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// ==========================================
// NOTIFICATION SERVICE
// ==========================================
export async function createNotification(
  userId: string,
  institutionId: string,
  type: 'DUTY_ASSIGNED' | 'DUTY_UPDATED' | 'DUTY_CANCELLED',
  title: string,
  message: string,
  dutyId?: string
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      institutionId,
      userId,
      type,
      title,
      message,
      read: false,
      dutyId: dutyId || null,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// ==========================================
// AI INVIGILATION DUTY ENGINE
// ==========================================
export interface AllocationStats {
  totalRooms: number;
  assigned: number;
  unassigned: number;
  warnings: string[];
}

export async function generateDutiesForSession(
  sessionId: string,
  institutionId: string,
  adminId: string,
  adminName: string
): Promise<AllocationStats> {
  const stats: AllocationStats = {
    totalRooms: 0,
    assigned: 0,
    unassigned: 0,
    warnings: []
  };

  if (!sessionId || !institutionId) {
    throw new Error('Session ID and Institution ID are required.');
  }

  // 1. Fetch Seating Plans (rooms to be invigilated)
  const plansSnap = await getDocs(
    query(
      collection(db, 'seatingPlans'),
      where('institutionId', '==', institutionId),
      where('sessionId', '==', sessionId)
    )
  );
  const seatingPlans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  stats.totalRooms = seatingPlans.length;

  if (seatingPlans.length === 0) {
    throw new Error('No seating plans found for this session. Please generate seating arrangements first.');
  }

  // 2. Fetch Eligible Faculty Members (role == 'faculty')
  const facultySnap = await getDocs(
    query(
      collection(db, 'users'),
      where('institutionId', '==', institutionId),
      where('role', '==', 'faculty')
    )
  );
  let facultyList = facultySnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(f => f.examEligibility !== false && f.availabilityStatus !== 'Unavailable');

  if (facultyList.length === 0) {
    throw new Error('No available faculty members found matching eligibility criteria.');
  }

  // 3. Fetch HODs to map department (branch) to their home blocks
  const hodSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('institutionId', '==', institutionId),
      where('role', '==', 'hod')
    )
  );
  const branchBlocks: Record<string, string> = {};
  hodSnap.forEach(d => {
    const data = d.data();
    if (data.branch && data.assignedBlock) {
      branchBlocks[String(data.branch).trim().toLowerCase()] = String(data.assignedBlock).trim();
    }
  });

  // 4. Clear existing invigilations for this session to allow safe regeneration
  const existingDutiesSnap = await getDocs(
    query(
      collection(db, 'invigilations'),
      where('institutionId', '==', institutionId),
      where('sessionId', '==', sessionId)
    )
  );
  const clearBatch = writeBatch(db);
  existingDutiesSnap.docs.forEach(docSnap => {
    clearBatch.delete(docSnap.ref);
  });
  await clearBatch.commit();

  // 5. Build global workload history mapping (number of non-cancelled assignments across all exams)
  const allDutiesSnap = await getDocs(
    query(
      collection(db, 'invigilations'),
      where('institutionId', '==', institutionId),
      where('status', '!=', 'cancelled')
    )
  );
  const workloadMap: Record<string, number> = {};
  facultyList.forEach(f => {
    workloadMap[f.id] = 0;
  });
  allDutiesSnap.forEach(d => {
    const data = d.data();
    if (data.assignedFacultyId && workloadMap[data.assignedFacultyId] !== undefined) {
      workloadMap[data.assignedFacultyId]++;
    }
  });

  // 6. Group seating plans by date & slot. Faculty cannot have two duties in the same slot.
  const slotsGroup: Record<string, any[]> = {};
  seatingPlans.forEach(plan => {
    const key = `${plan.examDate}|${plan.examSlot}`;
    if (!slotsGroup[key]) slotsGroup[key] = [];
    slotsGroup[key].push(plan);
  });

  const finalDuties: any[] = [];

  // Sort slots chronologically
  const sortedSlotKeys = Object.keys(slotsGroup).sort();

  for (const slotKey of sortedSlotKeys) {
    const [date, slot] = slotKey.split('|');
    const plansInSlot = slotsGroup[slotKey];
    const blockedFacultyInSlot = new Set<string>();

    for (const plan of plansInSlot) {
      // Find all student branches present in this room
      const studentBranches = new Set<string>();
      (plan.seats || []).forEach((s: any) => {
        if (s.branch) {
          studentBranches.add(String(s.branch).trim().toLowerCase());
        }
      });

      // Filter eligible faculty members for this room
      const candidates = facultyList.filter(f => {
        // Rule A: Not already assigned to another room in this slot
        if (blockedFacultyInSlot.has(f.id)) return false;

        // Rule B: Department Isolation (No invigilating students of their own branch)
        const facultyBranchClean = String(f.branchId || f.branch || '').trim().toLowerCase();
        if (studentBranches.has(facultyBranchClean)) return false;

        return true;
      });

      if (candidates.length === 0) {
        stats.unassigned++;
        stats.warnings.push(
          `No eligible faculty available for Room ${plan.roomNumber} (Block ${plan.blockNumber}) on ${date} (${slot}).`
        );
        continue;
      }

      // Workload and Proximity preference scoring:
      // Score = (workloadCount * 10) + (isSameBlock ? 0 : 1)
      // We pick the candidate with the lowest score.
      const scoredCandidates = candidates.map(f => {
        const homeBlock = branchBlocks[String(f.branchId || f.branch || '').trim().toLowerCase()] || f.assignedBlock || '';
        const sameBlock = String(homeBlock).trim().toLowerCase() === String(plan.blockNumber).trim().toLowerCase();
        const score = (workloadMap[f.id] || 0) * 10 + (sameBlock ? 0 : 1);
        return { faculty: f, score };
      });

      scoredCandidates.sort((a, b) => a.score - b.score);
      const chosen = scoredCandidates[0].faculty;

      // Assign duty
      blockedFacultyInSlot.add(chosen.id);
      workloadMap[chosen.id] = (workloadMap[chosen.id] || 0) + 1;
      stats.assigned++;

      const dutyDoc = {
        institutionId,
        sessionId,
        sessionName: plan.sessionName || 'Exam Session',
        date,
        slot,
        startTime: plan.startTime || '',
        endTime: plan.endTime || '',
        roomId: plan.roomId || '',
        roomNumber: plan.roomNumber || '',
        blockNumber: plan.blockNumber || '',
        floorNumber: plan.floorNumber ?? '',
        roomType: plan.roomType || 'classroom',
        studentCount: plan.occupiedSeats || (plan.seats || []).length,
        assignedFacultyId: chosen.id,
        assignedFacultyName: chosen.name,
        assignedFacultyIdCard: chosen.facultyId || chosen.id.slice(0, 6),
        facultyEmail: chosen.email,
        facultyPhone: chosen.phone || '',
        facultyDepartment: chosen.branchId || chosen.branch || 'General',
        status: 'upcoming' as const,
        attendanceSubmitted: false,
        malpracticeCount: 0,
        absenteeCount: 0,
        presentCount: 0,
        reportSubmitted: false
      };

      finalDuties.push(dutyDoc);
    }
  }

  // 7. Write assignments in batches
  const writeBatchSize = 400;
  for (let i = 0; i < finalDuties.length; i += writeBatchSize) {
    const chunk = finalDuties.slice(i, i + writeBatchSize);
    const dutyBatch = writeBatch(db);

    for (const duty of chunk) {
      const dutyRef = doc(collection(db, 'invigilations'));
      dutyBatch.set(dutyRef, {
        ...duty,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Dispatch notifications
      const notifyRef = doc(collection(db, 'notifications'));
      dutyBatch.set(notifyRef, {
        institutionId,
        userId: duty.assignedFacultyId,
        type: 'DUTY_ASSIGNED',
        title: 'New Invigilation Duty Assigned',
        message: `You have been assigned to invigilate Room ${duty.roomNumber} (Block ${duty.blockNumber}) on ${duty.date} at ${duty.slot} (${duty.startTime} - ${duty.endTime}).`,
        read: false,
        dutyId: dutyRef.id,
        createdAt: serverTimestamp()
      });
    }

    await dutyBatch.commit();
  }

  // 8. Log the operations event
  await logAudit(
    adminId,
    adminName,
    'admin',
    institutionId,
    'Duty Generated',
    `Generated invigilation duties for session "${seatingPlans[0].sessionName || sessionId}". Mapped ${stats.assigned} rooms (${stats.unassigned} unassigned).`
  );

  return stats;
}
