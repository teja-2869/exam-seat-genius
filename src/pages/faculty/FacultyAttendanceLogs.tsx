import React, { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ClipboardList, Search, Activity, Eye, FileText, BadgeCheck, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AttendanceLog {
  id: string;
  sessionName: string;
  date: string;
  slot: string;
  roomNumber: string;
  blockNumber: string;
  subjectCode: string;
  subjectName: string;
  presentCount: number;
  absentCount: number;
  malpracticeCount: number;
  lateCount: number;
  totalStudents: number;
  records: Array<{
    rollNumber: string;
    name: string;
    branch: string;
    status: string;
    remarks: string;
  }>;
  timestamp: any;
}

export default function FacultyAttendanceLogs() {
  const { user, college } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const castedUser = user as any;
      const collId = castedUser?.institutionId || castedUser?.collegeId || college?.id;
      const uid = castedUser?.uid || castedUser?.id;

      if (!uid || !collId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const q = query(
          collection(db, 'attendance'),
          where('institutionId', '==', collId),
          where('facultyId', '==', uid)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        // Sort by timestamp descending
        fetched.sort((a, b) => {
          const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return tB - tA;
        });
        setLogs(fetched);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user, college]);

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      log.sessionName.toLowerCase().includes(q) ||
      log.subjectCode.toLowerCase().includes(q) ||
      log.subjectName.toLowerCase().includes(q) ||
      log.roomNumber.toLowerCase().includes(q) ||
      log.date.includes(q)
    );
  });

  return (
    <FacultyLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Faculty</span><span>/</span><span className="text-foreground font-medium">Attendance Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            Attendance Submission Log
          </h1>
          <p className="text-muted-foreground">
            View detailed historical records of classroom attendance sheets and reports you have submitted.
          </p>
        </div>

        {/* Filter and search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by exam name, subject code, room or date..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center border border-dashed rounded-xl bg-card">
            <Activity className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card className="border-none shadow-sm flex items-center justify-center p-12 bg-card">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 text-muted-foreground/30">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">No Logs Found</h3>
              <p className="text-sm text-muted-foreground">
                No matching attendance sheets found in your records.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="shadow-sm border-none bg-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Exam / Subject</TableHead>
                      <TableHead>Date & Slot</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Malpractice</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id} className="hover:bg-muted/10">
                        <TableCell>
                          <p className="font-semibold text-sm">{log.sessionName}</p>
                          <p className="text-xs text-muted-foreground">{log.subjectCode} — {log.subjectName}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{log.date}</p>
                          <Badge variant="outline" className="text-[10px] uppercase mt-0.5">{log.slot}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold">Room {log.roomNumber}</p>
                          <p className="text-xs text-muted-foreground">Block {log.blockNumber}</p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-emerald-600">{log.presentCount}</TableCell>
                        <TableCell className="text-center font-bold text-red-600">{log.absentCount}</TableCell>
                        <TableCell className="text-center font-bold text-purple-600">{log.malpracticeCount || 0}</TableCell>
                        <TableCell className="text-center font-bold text-amber-600">{log.lateCount || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="w-4 h-4 mr-1" /> View Roster
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drill-down View Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-emerald-600" />
              Attendance Report Details
            </DialogTitle>
            <DialogDescription className="mt-1">
              {selectedLog && (
                <>
                  <span className="font-semibold">{selectedLog.sessionName}</span>
                  <span className="mx-2">•</span>
                  <span>Room {selectedLog.roomNumber}</span>
                  <span className="mx-2">•</span>
                  <span>{selectedLog.date} ({selectedLog.slot})</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto p-6 flex-1 bg-gray-50">
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Present</p>
                    <p className="font-bold text-emerald-700 text-lg mt-0.5">{selectedLog.presentCount}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Absent</p>
                    <p className="font-bold text-red-700 text-lg mt-0.5">{selectedLog.absentCount}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Malpractice</p>
                    <p className="font-bold text-purple-700 text-lg mt-0.5">{selectedLog.malpracticeCount || 0}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Late Entry</p>
                    <p className="font-bold text-amber-700 text-lg mt-0.5">{selectedLog.lateCount || 0}</p>
                  </div>
                </div>

                <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLog.records.map((rec, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-semibold">{rec.rollNumber}</TableCell>
                          <TableCell className="font-medium">{rec.name}</TableCell>
                          <TableCell>{rec.branch}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] ${
                                rec.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                                rec.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                rec.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                                'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {rec.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rec.remarks ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                {rec.remarks}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </FacultyLayout>
  );
}
