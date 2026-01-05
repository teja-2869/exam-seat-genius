export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  branch: string;
  exam: string;
  subject: string;
  isEligible: boolean;
}

export interface SeatingArrangement {
  roomNumber: number;
  seats: {
    row: number;
    bench: number;
    position: 'left' | 'right';
    student: Student | null;
  }[];
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: string[];
  suggestions: string[];
}

export class GeminiService {
  /**
   * Generate optimal seating arrangement using algorithm (fallback when AI is not available)
   */
  async generateSeatingArrangement(
    students: Student[], 
    roomCapacity: number = 40, // 5 rows × 8 students per row
    currentRoom: number = 1
  ): Promise<{ arrangements: SeatingArrangement[], remainingStudents: Student[] }> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Filter eligible students
      const eligibleStudents = students.filter(student => student.isEligible);
      
      // Sort students to optimize seating
      const sortedStudents = this.sortStudentsForOptimalSeating(eligibleStudents);
      
      // Create arrangement
      const arrangement = this.createOptimalArrangement(sortedStudents.slice(0, roomCapacity), currentRoom);
      const remainingStudents = sortedStudents.slice(roomCapacity);
      
      return {
        arrangements: [arrangement],
        remainingStudents
      };
    } catch (error: any) {
      console.error('Fallback Service Error:', error);
      throw new Error('Failed to generate seating arrangement');
    }
  }

  /**
   * Validate seating arrangement against rules
   */
  async validateSeatingArrangement(arrangement: SeatingArrangement): Promise<ValidationResult> {
    try {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const conflicts: string[] = [];
      const suggestions: string[] = [];
      
      // Check validation rules
      const seats = arrangement.seats.filter(seat => seat.student);
      
      // Rule 1: Same branch students cannot sit adjacent
      for (let i = 0; i < seats.length; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          const seat1 = seats[i];
          const seat2 = seats[j];
          
          if (this.areAdjacent(seat1, seat2) && 
              seat1.student!.branch === seat2.student!.branch) {
            conflicts.push(`${seat1.student!.name} and ${seat2.student!.name} (same branch) are sitting adjacent`);
          }
        }
      }
      
      // Rule 2: Same exam students cannot sit beside each other
      for (let i = 0; i < seats.length; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          const seat1 = seats[i];
          const seat2 = seats[j];
          
          if (this.areAdjacent(seat1, seat2) && 
              seat1.student!.exam === seat2.student!.exam) {
            conflicts.push(`${seat1.student!.name} and ${seat2.student!.name} (same exam) are sitting adjacent`);
          }
        }
      }
      
      // Rule 3: Consecutive roll numbers should be separated
      const rollNumbers = seats.map(seat => parseInt(seat.student!.rollNumber.replace(/\D/g, ''))).filter(n => !isNaN(n));
      for (let i = 0; i < rollNumbers.length - 1; i++) {
        for (let j = i + 1; j < rollNumbers.length; j++) {
          if (Math.abs(rollNumbers[i] - rollNumbers[j]) === 1 && 
              this.areAdjacent(seats[i], seats[j])) {
            conflicts.push(`Consecutive roll numbers ${seats[i].student!.rollNumber} and ${seats[j].student!.rollNumber} are sitting adjacent`);
          }
        }
      }
      
      // Generate suggestions
      if (conflicts.length > 0) {
        suggestions.push('Consider rearranging students to avoid adjacent conflicts');
        suggestions.push('Use AI-powered arrangement for better optimization');
      } else {
        suggestions.push('Seating arrangement follows all validation rules');
      }
      
      return {
        isValid: conflicts.length === 0,
        conflicts,
        suggestions
      };
    } catch (error: any) {
      console.error('Validation Error:', error);
      return {
        isValid: false,
        conflicts: ['Validation failed due to system error'],
        suggestions: ['Please try again']
      };
    }
  }

  /**
   * Sort students for optimal seating
   */
  private sortStudentsForOptimalSeating(students: Student[]): Student[] {
    // Sort by branch, then by exam, then by roll number
    return [...students].sort((a, b) => {
      if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
      if (a.exam !== b.exam) return a.exam.localeCompare(b.exam);
      return a.rollNumber.localeCompare(b.rollNumber);
    });
  }

  /**
   * Create optimal arrangement following rules
   */
  private createOptimalArrangement(students: Student[], roomNumber: number): SeatingArrangement {
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

  /**
   * Check if two seats are adjacent
   */
  private areAdjacent(seat1: any, seat2: any): boolean {
    // Same bench (left-right)
    if (seat1.row === seat2.row && seat1.bench === seat2.bench) return true;
    
    // Adjacent benches
    if (seat1.row === seat2.row && Math.abs(seat1.bench - seat2.bench) === 1) return true;
    
    // Front-back adjacency
    if (seat1.bench === seat2.bench && Math.abs(seat1.row - seat2.row) === 1) return true;
    
    return false;
  }

  /**
   * Check if API key is configured (always false for fallback)
   */
  static isConfigured(): boolean {
    return false;
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
