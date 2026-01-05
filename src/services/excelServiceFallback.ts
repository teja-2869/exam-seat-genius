export interface ExcelStudentData {
  name: string;
  rollNumber: string;
  branch: string;
  exam: string;
  subject: string;
  isEligible: boolean;
}

export interface ParsedExcelData {
  students: ExcelStudentData[];
  errors: string[];
  totalRows: number;
  successfulRows: number;
}

export class ExcelService {
  /**
   * Parse CSV file (fallback when Excel library is not available)
   */
  static async parseExcelFile(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          const result = this.processCSVData(lines);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse file: ' + error));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Process CSV data and validate
   */
  private static processCSVData(lines: string[]): ParsedExcelData {
    const students: ExcelStudentData[] = [];
    const errors: string[] = [];
    
    // Skip header row and process data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const student = this.validateAndTransformRow(line, i + 1);
        if (student) {
          students.push(student);
        }
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return {
      students,
      errors,
      totalRows: lines.length - 1, // Exclude header
      successfulRows: students.length
    };
  }

  /**
   * Validate and transform individual row
   */
  private static validateAndTransformRow(line: string, rowNumber: number): ExcelStudentData | null {
    // Parse CSV line (simple comma-separated)
    const parts = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''));
    
    // Expected columns: Name, Roll Number, Branch, Exam, Subject
    const [name, rollNumber, branch, exam, subject] = parts;
    
    // Skip empty rows
    if (!name && !rollNumber) return null;
    
    // Validate required fields
    if (!name || typeof name !== 'string') {
      throw new Error('Name is required and must be text');
    }
    
    if (!rollNumber) {
      throw new Error('Roll number is required');
    }
    
    if (!branch) {
      throw new Error('Branch is required');
    }
    
    if (!exam) {
      throw new Error('Exam is required');
    }
    
    // Check if student is eligible (roll number present = eligible, missing = detained)
    const isEligible = !!rollNumber && rollNumber.trim() !== '';
    
    return {
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      branch: branch.trim(),
      exam: exam.trim(),
      subject: subject ? subject.trim() : exam.trim(),
      isEligible
    };
  }

  /**
   * Create template CSV file for download
   */
  static createTemplate(): void {
    const template = [
      'Name,Roll Number,Branch,Exam,Subject',
      'John Doe,CS001,Computer Science,Data Structures,Data Structures & Algorithms',
      'Jane Smith,CS002,Computer Science,Database Management,Database Systems',
      'Mike Johnson,CS003,Computer Science,Computer Networks,Networking'
    ];
    
    const csvContent = template.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export students to CSV
   */
  static exportStudents(students: ExcelStudentData[], filename: string = 'students_export.csv'): void {
    const data = [
      'Name,Roll Number,Branch,Exam,Subject,Eligible',
      ...students.map(student => [
        `"${student.name}"`,
        student.rollNumber,
        student.branch,
        `"${student.exam}"`,
        `"${student.subject}"`,
        student.isEligible ? 'Yes' : 'No'
      ].join(','))
    ];
    
    const csvContent = data.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
