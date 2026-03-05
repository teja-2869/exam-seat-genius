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

export interface BenchStructure {
  row: number;
  column: number;
  seatLeft: { seatId: string };
  seatRight: { seatId: string };
}

export interface Classroom {
  id: string;
  institutionId: string;
  branch?: string;
  floorNumber: number | string;
  roomNumber: string;
  rows: number;
  columns: number;
  boardPosition: 'top' | 'bottom' | 'left' | 'right';
  doorPosition: 'left' | 'right' | 'front' | 'back';
  benchStructure: BenchStructure[];
  createdAt: any;
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
  seatNumber: string;
  row: number;
  column: number;
  studentId: string;
  attendance?: 'present' | 'absent';
}

export interface SeatingPlanLayout {
  row: number;
  column: number;
  leftSeat: { studentId: string; rollNumber: string } | null;
  rightSeat: { studentId: string; rollNumber: string } | null;
}

export interface SeatingPlan {
  id: string;
  institutionId: string;
  examId: string;
  classroomId: string;
  seatingPlan: SeatingPlanLayout[];
  generatedAt: any;
}

export interface Invigilation {
  id: string;
  examId: string;
  classroomId: string;
  facultyId: string;
  assignedBy: string;
  status: 'assigned' | 'confirmed' | 'completed';
}
