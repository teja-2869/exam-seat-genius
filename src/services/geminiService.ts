import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with API key from environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

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
  private model: any;

  constructor() {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }
    
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * Generate optimal seating arrangement using AI
   */
  async generateSeatingArrangement(
    students: Student[], 
    roomCapacity: number = 40, // 5 rows × 8 students per row
    currentRoom: number = 1
  ): Promise<{ arrangements: SeatingArrangement[], remainingStudents: Student[] }> {
    try {
      const prompt = this.buildSeatingPrompt(students, roomCapacity, currentRoom);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the AI response and create seating arrangements
      const arrangements = this.parseSeatingResponse(text, students, roomCapacity, currentRoom);
      const remainingStudents = students.slice(roomCapacity);
      
      return {
        arrangements,
        remainingStudents
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      
      // Handle API rate limits
      if (error.status === 429 || error.message?.includes('quota')) {
        throw new Error('API_LIMIT_EXCEEDED');
      }
      
      throw new Error('Failed to generate seating arrangement');
    }
  }

  /**
   * Validate seating arrangement against rules
   */
  async validateSeatingArrangement(arrangement: SeatingArrangement): Promise<ValidationResult> {
    try {
      const prompt = this.buildValidationPrompt(arrangement);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseValidationResponse(text);
    } catch (error: any) {
      console.error('Validation Error:', error);
      
      if (error.status === 429 || error.message?.includes('quota')) {
        throw new Error('API_LIMIT_EXCEEDED');
      }
      
      return {
        isValid: false,
        conflicts: ['Validation failed due to API error'],
        suggestions: ['Please try again later']
      };
    }
  }

  /**
   * Build prompt for seating arrangement generation
   */
  private buildSeatingPrompt(students: Student[], roomCapacity: number, currentRoom: number): string {
    return `
You are an AI assistant for exam seat allocation. Generate optimal seating arrangements following these strict rules:

STUDENTS DATA:
${students.map(s => `- Roll: ${s.rollNumber}, Name: ${s.name}, Branch: ${s.branch}, Exam: ${s.exam}, Eligible: ${s.isEligible}`).join('\n')}

ROOM CONFIGURATION:
- Room ${currentRoom} capacity: ${roomCapacity} students
- Layout: 5 rows × 8 students per row (4 benches per row, 2 students per bench)
- Bench structure: [Left Seat] [Right Seat]

VALIDATION RULES (MUST FOLLOW):
1. Same branch students CANNOT sit adjacent (horizontally or vertically)
2. Same exam students CANNOT sit beside each other
3. Consecutive roll numbers MUST be separated by at least 2 seats
4. Detained/ineligible students should be EXCLUDED from seating
5. Optimize room utilization - fill front rows first
6. Maintain gender diversity if possible (if gender data available)

OUTPUT FORMAT:
Provide JSON response with this exact structure:
{
  "roomNumber": ${currentRoom},
  "seats": [
    {
      "row": 1,
      "bench": 1,
      "position": "left",
      "student": {"id": "1", "name": "Student Name", "rollNumber": "ROLL001", "branch": "CS", "exam": "Math", "subject": "Mathematics", "isEligible": true}
    }
  ]
}

Generate seating for maximum ${roomCapacity} eligible students from the list.
    `;
  }

  /**
   * Build prompt for validation
   */
  private buildValidationPrompt(arrangement: SeatingArrangement): string {
    const seatingText = arrangement.seats
      .filter(seat => seat.student)
      .map(seat => `Row ${seat.row}, Bench ${seat.bench}, ${seat.position}: ${seat.student?.name} (${seat.student?.rollNumber}, ${seat.student?.branch})`)
      .join('\n');

    return `
Validate this seating arrangement against the rules:

SEATING ARRANGEMENT:
Room ${arrangement.roomNumber}:
${seatingText}

VALIDATION RULES:
1. Same branch students cannot sit adjacent
2. Same exam students cannot sit beside each other  
3. Consecutive roll numbers must be separated
4. No ineligible students should be seated

Provide JSON response:
{
  "isValid": true/false,
  "conflicts": ["list of rule violations"],
  "suggestions": ["list of improvements"]
}
    `;
  }

  /**
   * Parse AI seating response
   */
  private parseSeatingResponse(text: string, students: Student[], roomCapacity: number, roomNumber: number): SeatingArrangement[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const aiData = JSON.parse(jsonMatch[0]);
      
      // If AI provided valid data, use it
      if (aiData.seats && Array.isArray(aiData.seats)) {
        return [{
          roomNumber: roomNumber,
          seats: aiData.seats
        }];
      }

      // Fallback: Create manual arrangement if AI fails
      return this.createFallbackArrangement(students.slice(0, roomCapacity), roomNumber);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Fallback arrangement
      return this.createFallbackArrangement(students.slice(0, roomCapacity), roomNumber);
    }
  }

  /**
   * Parse validation response
   */
  private parseValidationResponse(text: string): ValidationResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          isValid: false,
          conflicts: ['Unable to validate'],
          suggestions: ['Please check arrangement manually']
        };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      return {
        isValid: false,
        conflicts: ['Validation parsing failed'],
        suggestions: ['Please try again']
      };
    }
  }

  /**
   * Create fallback arrangement when AI fails
   */
  private createFallbackArrangement(students: Student[], roomNumber: number): SeatingArrangement[] {
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

    return [{
      roomNumber,
      seats
    }];
  }

  /**
   * Check if API key is configured
   */
  static isConfigured(): boolean {
    return !!import.meta.env.VITE_GEMINI_API_KEY;
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
