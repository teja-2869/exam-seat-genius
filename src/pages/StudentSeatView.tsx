import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { MapPin, Calendar, BookOpen, Building2, ArrowLeft, Clock } from 'lucide-react';

// Generate demo seating grid
const generateSeatingGrid = (rows: number, cols: number, currentSeat: { row: number; col: number }) => {
  const grid: ('empty' | 'occupied' | 'current')[][] = [];
  
  for (let r = 0; r < rows; r++) {
    const row: ('empty' | 'occupied' | 'current')[] = [];
    for (let c = 0; c < cols; c++) {
      if (r === currentSeat.row && c === currentSeat.col) {
        row.push('current');
      } else if (Math.random() > 0.3) {
        row.push('occupied');
      } else {
        row.push('empty');
      }
    }
    grid.push(row);
  }
  
  return grid;
};

const StudentSeatView: React.FC = () => {
  const navigate = useNavigate();
  
  const studentId = sessionStorage.getItem('studentId') || '24BFA33001';
  const examDetails = JSON.parse(sessionStorage.getItem('examDetails') || '{}');
  
  // Demo seating data
  const seatInfo = {
    block: 'Block 1',
    floor: 1,
    roomNumber: '1101',
    seatNumber: 'R3-B4-L',
    row: 2,
    column: 3,
    examDate: examDetails.examDate || '2025-01-15',
    examTime: '10:00 AM - 1:00 PM',
    subject: 'CS301 - Data Structures',
  };

  const seatingGrid = generateSeatingGrid(5, 8, { row: seatInfo.row, col: seatInfo.column });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/student/exam-details')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exam Details
          </Button>

          {/* Header Card */}
          <div className="glass-card p-6 mb-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-1">
                  Your Exam Seat
                </h1>
                <p className="text-muted-foreground">Student ID: {studentId}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{seatInfo.examDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{seatInfo.examTime}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seat Details */}
            <div className="lg:col-span-1 space-y-4 animate-slide-up">
              <div className="dashboard-card">
                <h3 className="font-display font-semibold text-lg mb-4">Seat Information</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Block</p>
                      <p className="font-semibold">Block {seatInfo.block}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{seatInfo.block} - Floor {seatInfo.floor} - Room {seatInfo.roomNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <span className="font-bold text-accent">#{seatInfo.row + 1}-{seatInfo.column + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Seat Number</p>
                      <p className="font-semibold">{seatInfo.seatNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-panel-student/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-panel-student" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subject</p>
                      <p className="font-semibold">{seatInfo.subject}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="dashboard-card">
                <h3 className="font-display font-semibold text-lg mb-4">Legend</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="seat seat-current">You</div>
                    <span className="text-sm">Your Seat</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="seat seat-occupied"></div>
                    <span className="text-sm">Occupied</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="seat seat-empty"></div>
                    <span className="text-sm">Empty</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Classroom Layout */}
            <div className="lg:col-span-2 animate-slide-up stagger-2">
              <div className="dashboard-card">
                <h3 className="font-display font-semibold text-lg mb-6">Classroom Layout</h3>
                
                {/* Board */}
                <div className="w-full h-8 bg-foreground/90 rounded-lg flex items-center justify-center mb-8">
                  <span className="text-primary-foreground text-sm font-medium">BOARD</span>
                </div>

                {/* Seating Grid */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex flex-col gap-3 min-w-fit mx-auto">
                    {seatingGrid.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-3 justify-center">
                        <span className="w-6 text-xs text-muted-foreground flex items-center">
                          R{rowIndex + 1}
                        </span>
                        {row.map((seat, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`seat ${
                              seat === 'current' ? 'seat-current' :
                              seat === 'occupied' ? 'seat-occupied' :
                              'seat-empty'
                            }`}
                          >
                            {seat === 'current' ? 'You' : ''}
                          </div>
                        ))}
                      </div>
                    ))}
                    {/* Column numbers */}
                    <div className="flex gap-3 justify-center mt-2">
                      <span className="w-6"></span>
                      {Array.from({ length: 8 }, (_, i) => (
                        <span key={i} className="w-10 text-center text-xs text-muted-foreground">
                          C{i + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Door indicator */}
                <div className="flex justify-end mt-6">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                    <div className="w-3 h-6 bg-foreground/30 rounded"></div>
                    <span className="text-xs text-muted-foreground">Door</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentSeatView;
