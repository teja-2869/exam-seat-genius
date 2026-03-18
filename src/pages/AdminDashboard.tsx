import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Building2,
  Users,
  GraduationCap,
  Network,
  FileSpreadsheet,
  Grid3X3,
  Server,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AdminDashboard: React.FC = () => {
  const { college, user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    blocks: 0,
    floors: 0,
    classrooms: 0,
    labs: 0,
    students: 0,
    faculty: 0,
    staff: 0,
    branches: 0,
    exams: 0,
    capacity: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchKPIs = async () => {
      let institutionId = college?.id || (user as any)?.institutionId;
      if (!institutionId) {
        setLoading(false);
        return;
      }

      try {
        // Blocks
        const blocksQuery = query(collection(db, 'blocks'), where('institutionId', '==', institutionId));
        const blocksSnap = await getDocs(blocksQuery);
        let blocksCount = blocksSnap.size;
        let floorsCount = 0;

        blocksSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.floors) floorsCount += data.floors.length;
        });

        // Classrooms/Labs
        const classroomsQuery = query(collection(db, 'classrooms'), where('institutionId', '==', institutionId));
        const classSnap = await getDocs(classroomsQuery);

        let classCount = 0;
        let labCount = 0;
        let seatCapacity = 0;

        classSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.type === 'lab') labCount++;
          else classCount++;

          // estimate capacity
          if (data.columns && data.rows) {
            seatCapacity += (data.columns * data.rows * 2);
          }
        });

        // Faculty
        const facultyQuery = query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty'));
        const facultySnap = await getDocs(facultyQuery);

        // HODs (Branches proxy)
        const hodQuery = query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'hod'));
        const hodSnap = await getDocs(hodQuery);

        // Students
        const studentQuery = query(collection(db, 'students'), where('institutionId', '==', institutionId));
        const studentSnap = await getDocs(studentQuery);

        // Exams
        const examQuery = query(collection(db, 'exams'), where('collegeId', '==', institutionId));
        const examSnap = await getDocs(examQuery);

        setStats({
          blocks: blocksCount,
          floors: floorsCount,
          classrooms: classCount,
          labs: labCount,
          students: studentSnap.size,
          faculty: facultySnap.size,
          branches: hodSnap.size,
          staff: 0, // placeholder non-teaching
          exams: examSnap.size,
          capacity: seatCapacity
        });

        // Mock recent logs to fulfill UI layout structure, 
        // normally we would query a 'system_logs' collection.
        setRecentLogs([
          { id: 1, action: "Upload Seating Layout via HOD", module: "Infrastructure", time: "10 mins ago" },
          { id: 2, action: "New Faculty Registered", module: "Faculty", time: "1 hr ago" },
          { id: 3, action: "Student Batch Verified", module: "Students", time: "2 hrs ago" },
        ]);

      } catch (err) {
        console.error("Dashboard KPI fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [college, user]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        {/* Header Section */}
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Admin</span>
            <span>/</span>
            <span className="text-foreground font-medium">Institutional Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            Institution Control Center
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Server className="w-4 h-4" /> Global Infrastructure and User Management
          </p>
        </div>

        {/* Top Section - KPI Cards */}
        {loading ? (
          <div className="h-40 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <Card className="dashboard-card shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Total Blocks</span>
                  <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-blue-500" /><span className="text-2xl font-bold">{stats.blocks}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm border-l-4 border-l-emerald-500">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Total Floors</span>
                  <div className="flex items-center gap-3"><Grid3X3 className="w-5 h-5 text-emerald-500" /><span className="text-2xl font-bold">{stats.floors}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Classrooms</span>
                  <div className="flex items-center gap-3"><Users className="w-5 h-5 text-amber-500" /><span className="text-2xl font-bold">{stats.classrooms}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm border-l-4 border-l-rose-500">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Total Labs</span>
                  <div className="flex items-center gap-3"><Network className="w-5 h-5 text-rose-500" /><span className="text-2xl font-bold">{stats.labs}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm border-l-4 border-l-purple-500">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Students</span>
                  <div className="flex items-center gap-3"><GraduationCap className="w-5 h-5 text-purple-500" /><span className="text-2xl font-bold">{stats.students}</span></div>
                </CardContent>
              </Card>

              <Card className="dashboard-card shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Faculty</span>
                  <div className="flex items-center gap-3"><Users className="w-5 h-5 text-indigo-500" /><span className="text-2xl font-bold">{stats.faculty}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Staff</span>
                  <div className="flex items-center gap-3"><Users className="w-5 h-5 text-gray-500" /><span className="text-2xl font-bold">{stats.staff}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Branches</span>
                  <div className="flex items-center gap-3"><Network className="w-5 h-5 text-teal-500" /><span className="text-2xl font-bold">{stats.branches}</span></div>
                </CardContent>
              </Card>
              <Card className="dashboard-card shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Active Exams</span>
                  <div className="flex items-center gap-3"><FileSpreadsheet className="w-5 h-5 text-orange-500" /><span className="text-2xl font-bold">{stats.exams}</span></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="dashboard-card h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-display text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Institution Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Institution Name</span>
                    <span className="font-semibold">{college?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Institution Code</span>
                    <span className="font-semibold">{college?.code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Address / Location</span>
                    <span className="font-semibold">{college?.location || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Contact Email</span>
                    <span className="font-semibold">{college?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 border-primary/20 border rounded-lg">
                    <span className="text-sm font-bold text-primary">Total Infrastructure Capacity</span>
                    <span className="font-bold text-primary">{stats.capacity} Seats</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-card h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-display text-foreground flex items-center gap-2"><Activity className="w-5 h-5 text-secondary" /> System Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentLogs.length > 0 ? (
                    <div className="space-y-4">
                      {recentLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
                          <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{log.action}</p>
                            <p className="text-xs text-muted-foreground">Module: {log.module}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">No recent activity</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
