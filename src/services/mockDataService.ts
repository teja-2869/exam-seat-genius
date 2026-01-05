import { Student, SeatingArrangement } from './geminiService';

export interface MockStudent {
  id: string;
  name: string;
  rollNumber: string;
  branch: string;
  exam: string;
  subject: string;
  isEligible: boolean;
}

export const mockStudents: MockStudent[] = [
  // Computer Science Branch
  { id: '1', name: 'Alice Johnson', rollNumber: 'CS001', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '2', name: 'Bob Smith', rollNumber: 'CS002', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '3', name: 'Charlie Brown', rollNumber: 'CS003', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '4', name: 'Diana Prince', rollNumber: 'CS004', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '5', name: 'Eve Wilson', rollNumber: 'CS005', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '6', name: 'Frank Miller', rollNumber: 'CS006', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '7', name: 'Grace Lee', rollNumber: 'CS007', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '8', name: 'Henry Ford', rollNumber: 'CS008', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  
  // Information Technology Branch
  { id: '9', name: 'Iris Taylor', rollNumber: 'IT001', branch: 'Information Technology', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '10', name: 'Jack Anderson', rollNumber: 'IT002', branch: 'Information Technology', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '11', name: 'Kate Moore', rollNumber: 'IT003', branch: 'Information Technology', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  { id: '12', name: 'Liam Davis', rollNumber: 'IT004', branch: 'Information Technology', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: true },
  
  // Computer Science (Different Exam)
  { id: '13', name: 'Mia Garcia', rollNumber: 'CS009', branch: 'Computer Science', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  { id: '14', name: 'Noah Martinez', rollNumber: 'CS010', branch: 'Computer Science', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  { id: '15', name: 'Olivia Robinson', rollNumber: 'CS011', branch: 'Computer Science', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  { id: '16', name: 'Peter Clark', rollNumber: 'CS012', branch: 'Computer Science', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  
  // Information Technology (Different Exam)
  { id: '17', name: 'Quinn Lewis', rollNumber: 'IT005', branch: 'Information Technology', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  { id: '18', name: 'Rachel Walker', rollNumber: 'IT006', branch: 'Information Technology', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  { id: '19', name: 'Sam Hall', rollNumber: 'IT007', branch: 'Information Technology', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  { id: '20', name: 'Tina Young', rollNumber: 'IT008', branch: 'Information Technology', exam: 'Database Management', subject: 'Database Systems', isEligible: true },
  
  // Computer Networks Exam
  { id: '21', name: 'Uma King', rollNumber: 'CS013', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '22', name: 'Victor Wright', rollNumber: 'CS014', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '23', name: 'Wendy Scott', rollNumber: 'CS015', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '24', name: 'Xavier Green', rollNumber: 'CS016', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  
  // Some ineligible students (detained)
  { id: '25', name: 'Yara Adams', rollNumber: '', branch: 'Computer Science', exam: 'Data Structures', subject: 'Data Structures & Algorithms', isEligible: false },
  { id: '26', name: 'Zoe Baker', rollNumber: '', branch: 'Information Technology', exam: 'Database Management', subject: 'Database Systems', isEligible: false },
  
  // Additional students for testing multiple rooms
  { id: '27', name: 'Aaron Nelson', rollNumber: 'CS017', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '28', name: 'Bella Carter', rollNumber: 'CS018', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '29', name: 'Chris Mitchell', rollNumber: 'CS019', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '30', name: 'Diana Perez', rollNumber: 'CS020', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '31', name: 'Eric Roberts', rollNumber: 'CS021', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '32', name: 'Fiona Turner', rollNumber: 'CS022', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '33', name: 'George Phillips', rollNumber: 'CS023', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '34', name: 'Hannah Campbell', rollNumber: 'CS024', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '35', name: 'Ian Parker', rollNumber: 'CS025', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '36', name: 'Julia Evans', rollNumber: 'CS026', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '37', name: 'Kevin Edwards', rollNumber: 'CS027', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '38', name: 'Laura Collins', rollNumber: 'CS028', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '39', name: 'Mark Stewart', rollNumber: 'CS029', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '40', name: 'Nancy Sanchez', rollNumber: 'CS030', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '41', name: 'Oscar Morris', rollNumber: 'CS031', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '42', name: 'Paula Rogers', rollNumber: 'CS032', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '43', name: 'Quinn Reed', rollNumber: 'CS033', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '44', name: 'Rachel Cook', rollNumber: 'CS034', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
  { id: '45', name: 'Steve Morgan', rollNumber: 'CS035', branch: 'Computer Science', exam: 'Computer Networks', subject: 'Networking', isEligible: true },
];

export const mockRooms = [
  // Block 1 - Floor 1
  { id: 1101, name: 'Room 1101', capacity: 40, block: 'Block 1', floor: 1, roomNumber: '1101' },
  { id: 1102, name: 'Room 1102', capacity: 40, block: 'Block 1', floor: 1, roomNumber: '1102' },
  { id: 1103, name: 'Room 1103', capacity: 40, block: 'Block 1', floor: 1, roomNumber: '1103' },
  { id: 1104, name: 'Room 1104', capacity: 40, block: 'Block 1', floor: 1, roomNumber: '1104' },
  { id: 1105, name: 'Room 1105', capacity: 40, block: 'Block 1', floor: 1, roomNumber: '1105' },
  
  // Block 1 - Floor 2
  { id: 1201, name: 'Room 1201', capacity: 35, block: 'Block 1', floor: 2, roomNumber: '1201' },
  { id: 1202, name: 'Room 1202', capacity: 35, block: 'Block 1', floor: 2, roomNumber: '1202' },
  { id: 1203, name: 'Room 1203', capacity: 35, block: 'Block 1', floor: 2, roomNumber: '1203' },
  { id: 1204, name: 'Room 1204', capacity: 35, block: 'Block 1', floor: 2, roomNumber: '1204' },
  { id: 1205, name: 'Room 1205', capacity: 35, block: 'Block 1', floor: 2, roomNumber: '1205' },
  
  // Block 1 - Floor 3
  { id: 1301, name: 'Room 1301', capacity: 30, block: 'Block 1', floor: 3, roomNumber: '1301' },
  { id: 1302, name: 'Room 1302', capacity: 30, block: 'Block 1', floor: 3, roomNumber: '1302' },
  { id: 1303, name: 'Room 1303', capacity: 30, block: 'Block 1', floor: 3, roomNumber: '1303' },
  { id: 1304, name: 'Room 1304', capacity: 30, block: 'Block 1', floor: 3, roomNumber: '1304' },
  { id: 1305, name: 'Room 1305', capacity: 30, block: 'Block 1', floor: 3, roomNumber: '1305' },
  
  // Block 2 - Floor 1
  { id: 2101, name: 'Room 2101', capacity: 40, block: 'Block 2', floor: 1, roomNumber: '2101' },
  { id: 2102, name: 'Room 2102', capacity: 40, block: 'Block 2', floor: 1, roomNumber: '2102' },
  { id: 2103, name: 'Room 2103', capacity: 40, block: 'Block 2', floor: 1, roomNumber: '2103' },
  { id: 2104, name: 'Room 2104', capacity: 40, block: 'Block 2', floor: 1, roomNumber: '2104' },
  { id: 2105, name: 'Room 2105', capacity: 40, block: 'Block 2', floor: 1, roomNumber: '2105' },
  
  // Block 2 - Floor 2
  { id: 2201, name: 'Room 2201', capacity: 35, block: 'Block 2', floor: 2, roomNumber: '2201' },
  { id: 2202, name: 'Room 2202', capacity: 35, block: 'Block 2', floor: 2, roomNumber: '2202' },
  { id: 2203, name: 'Room 2203', capacity: 35, block: 'Block 2', floor: 2, roomNumber: '2203' },
  { id: 2204, name: 'Room 2204', capacity: 35, block: 'Block 2', floor: 2, roomNumber: '2204' },
  { id: 2205, name: 'Room 2205', capacity: 35, block: 'Block 2', floor: 2, roomNumber: '2205' },
  
  // Block 3 - Floor 1
  { id: 3101, name: 'Room 3101', capacity: 40, block: 'Block 3', floor: 1, roomNumber: '3101' },
  { id: 3102, name: 'Room 3102', capacity: 40, block: 'Block 3', floor: 1, roomNumber: '3102' },
  { id: 3103, name: 'Room 3103', capacity: 40, block: 'Block 3', floor: 1, roomNumber: '3103' },
  { id: 3104, name: 'Room 3104', capacity: 40, block: 'Block 3', floor: 1, roomNumber: '3104' },
  { id: 3105, name: 'Room 3105', capacity: 40, block: 'Block 3', floor: 1, roomNumber: '3105' },
];

export const mockExams = [
  { id: '1', name: 'Data Structures Midterm', subject: 'Data Structures & Algorithms', date: '2025-01-15', duration: '3 hours' },
  { id: '2', name: 'Database Management Final', subject: 'Database Systems', date: '2025-01-18', duration: '3 hours' },
  { id: '3', name: 'Computer Networks Quiz', subject: 'Networking', date: '2025-01-20', duration: '2 hours' },
];

export const mockFaculty = [
  { id: '1', name: 'Dr. Sarah Johnson', department: 'Computer Science', available: true },
  { id: '2', name: 'Prof. Michael Chen', department: 'Computer Science', available: true },
  { id: '3', name: 'Dr. Emily Williams', department: 'Information Technology', available: false },
  { id: '4', name: 'Prof. David Brown', department: 'Computer Science', available: true },
  { id: '5', name: 'Dr. Lisa Anderson', department: 'Information Technology', available: true },
  { id: '6', name: 'Prof. James Wilson', department: 'Computer Science', available: true },
];

export class MockDataService {
  /**
   * Get mock students for demonstration
   */
  static getStudents(): Student[] {
    return mockStudents.filter(student => student.isEligible).map(student => ({
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      branch: student.branch,
      exam: student.exam,
      subject: student.subject,
      isEligible: student.isEligible
    }));
  }

  /**
   * Get all students including ineligible ones
   */
  static getAllStudents(): Student[] {
    return mockStudents.map(student => ({
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      branch: student.branch,
      exam: student.exam,
      subject: student.subject,
      isEligible: student.isEligible
    }));
  }

  /**
   * Get students by exam
   */
  static getStudentsByExam(examName: string): Student[] {
    return this.getStudents().filter(student => student.exam === examName);
  }

  /**
   * Get students by branch
   */
  static getStudentsByBranch(branch: string): Student[] {
    return this.getStudents().filter(student => student.branch === branch);
  }

  /**
   * Get mock rooms
   */
  static getRooms() {
    return mockRooms;
  }

  /**
   * Get mock exams
   */
  static getExams() {
    return mockExams;
  }

  /**
   * Get mock faculty
   */
  static getFaculty() {
    return mockFaculty;
  }

  /**
   * Generate seating arrangement without AI (fallback)
   */
  static generateBasicSeating(students: Student[], roomNumber: number = 1): SeatingArrangement {
    const seats = [];
    let studentIndex = 0;

    for (let row = 1; row <= 5; row++) {
      for (let bench = 1; bench <= 4; bench++) {
        for (const position of ['left', 'right'] as const) {
          if (studentIndex < students.length) {
            seats.push({
              row,
              bench,
              position,
              student: students[studentIndex++]
            });
          } else {
            seats.push({
              row,
              bench,
              position,
              student: null
            });
          }
        }
      }
    }

    return {
      roomNumber,
      seats
    };
  }
}
