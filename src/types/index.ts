export type UserRole = 'admin' | 'hod' | 'faculty' | 'student';

export interface College {
  id: string;
  name: string;
  code: string;
  location: string;
  email: string;
  blocks: number;
  branches: Branch[];
  createdAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  collegeId: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  collegeId: string;
  branchId?: string;
  name: string;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  branchId: string;
  semester: number;
  collegeId: string;
}

export interface Faculty {
  id: string;
  facultyId: string;
  name: string;
  branchId: string;
  collegeId: string;
}

export interface Classroom {
  id: string;
  name: string;
  block: string;
  floor: number;
  rows: number;
  seatsPerRow: number;
  totalSeats: number;
  collegeId: string;
}

export interface Exam {
  id: string;
  name: string;
  type: 'internal' | 'external';
  semester: number;
  year: number;
  subjectCode: string;
  subjectName: string;
  date: Date;
  startTime: string;
  endTime: string;
  collegeId: string;
  status: 'draft' | 'published' | 'locked';
}

export interface SeatingArrangement {
  id: string;
  examId: string;
  classroomId: string;
  seatNumber: number;
  row: number;
  column: number;
  studentId: string;
  attendance?: 'present' | 'absent';
}

export interface Invigilation {
  id: string;
  examId: string;
  classroomId: string;
  facultyId: string;
  assignedBy: string;
  status: 'assigned' | 'confirmed' | 'completed';
}
