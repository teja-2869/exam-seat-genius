import * as XLSX from 'xlsx';

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
   * Parse Excel file and extract student data
   */
  static async parseExcelFile(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const result = this.processExcelData(jsonData);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + error));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }

  /**
   * Process raw Excel data and validate
   */
  private static processExcelData(jsonData: any[][]): ParsedExcelData {
    const students: ExcelStudentData[] = [];
    const errors: string[] = [];
    
    // Skip header row and process data
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) continue;
      
      try {
        const student = this.validateAndTransformRow(row, i + 1);
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
      totalRows: jsonData.length - 1, // Exclude header
      successfulRows: students.length
    };
  }

  /**
   * Validate and transform individual row
   */
  private static validateAndTransformRow(row: any, rowNumber: number): ExcelStudentData | null {
    // Expected columns: Name, Roll Number, Branch, Exam, Subject
    const [name, rollNumber, branch, exam, subject] = row;
    
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
    const isEligible = !!rollNumber && rollNumber.toString().trim() !== '';
    
    return {
      name: name.toString().trim(),
      rollNumber: rollNumber.toString().trim(),
      branch: branch.toString().trim(),
      exam: exam.toString().trim(),
      subject: subject ? subject.toString().trim() : exam.toString().trim(),
      isEligible
    };
  }

  /**
   * Create template Excel file for download
   */
  static createTemplate(): void {
    const template = [
      ['Name', 'Roll Number', 'Branch', 'Exam', 'Subject'],
      ['John Doe', 'CS001', 'Computer Science', 'Data Structures', 'Data Structures & Algorithms'],
      ['Jane Smith', 'CS002', 'Computer Science', 'Database Management', 'Database Systems'],
      ['Mike Johnson', 'CS003', 'Computer Science', 'Computer Networks', 'Networking']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    XLSX.writeFile(workbook, 'student_template.xlsx');
  }

  /**
   * Export students to Excel
   */
  static exportStudents(students: ExcelStudentData[], filename: string = 'students_export.xlsx'): void {
    const data = [
      ['Name', 'Roll Number', 'Branch', 'Exam', 'Subject', 'Eligible'],
      ...students.map(student => [
        student.name,
        student.rollNumber,
        student.branch,
        student.exam,
        student.subject,
        student.isEligible ? 'Yes' : 'No'
      ])
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    XLSX.writeFile(workbook, filename);
  }
}
