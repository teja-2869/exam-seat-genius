import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import {
  Users,
  Building2,
  GraduationCap,
  DoorOpen,
  Layers,
  Activity,
  UserCheck,
  Monitor
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function HODDashboard() {
  const { college, user } = useAuth();
  
  const hodObj = user as any;
  const institutionId = college?.id || hodObj?.institutionId;
  const assignedBlock = hodObj?.assignedBlock || 'N/A';
  const branch = hodObj?.branch || 'N/A';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalFloors: 0,
    totalRooms: 0,
    totalClassrooms: 0,
    totalLabs: 0,
    totalCapacity: 0,
    studentsByYear: { '1st Year': 0, '2nd Year': 0, '3rd Year': 0, '4th Year': 0 }
  });

  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!institutionId) return;

      try {
        // Students Count
        const sQ = query(collection(db, 'students'), where('institutionId', '==', institutionId), where('branch', '==', branch));
        const sSnap = await getDocs(sQ);
        const totalStudents = sSnap.size;
        
        let yearsCount = { '1st Year': 0, '2nd Year': 0, '3rd Year': 0, '4th Year': 0 };
        sSnap.forEach(doc => {
            const y = doc.data().year;
            if (y && yearsCount[y as keyof typeof yearsCount] !== undefined) {
                yearsCount[y as keyof typeof yearsCount]++;
            }
        });

        // Faculty Count: check both 'faculty' and 'users' collections
        const fQ = query(collection(db, 'faculty'), where('institutionId', '==', institutionId), where('department', '==', branch));
        const fSnap = await getDocs(fQ);
        const fQ2 = query(collection(db, 'faculty'), where('institutionId', '==', institutionId), where('branch', '==', branch));
        const fSnap2 = await getDocs(fQ2);
        const uQ = query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty'), where('branch', '==', branch));
        const uSnap = await getDocs(uQ);
        const totalFaculty = Math.max(fSnap.size, fSnap2.size, uSnap.size);

        // Block definition for floors
        let totalFloors = 0;
        const bQ = query(collection(db, 'blocks'), where('institutionId', '==', institutionId), where('blockNumber', '==', assignedBlock));
        const bSnap = await getDocs(bQ);
        if (!bSnap.empty) {
            const bData = bSnap.docs[0].data();
            totalFloors = bData.totalFloors || bData.floors?.length || 0;
        }

        // Rooms data specific to this branch & block
        const rQ = query(collection(db, 'classrooms'), 
            where('institutionId', '==', institutionId), 
            where('branch', '==', branch),
            where('blockNumber', '==', assignedBlock) // as per prompt logic: all room data entered by HOD must be saved under assignedBlock
        );
        const rSnap = await getDocs(rQ);
        
        let classrooms = 0;
        let labs = 0;
        let capacity = 0;
        const roomsList: any[] = [];

        rSnap.forEach(doc => {
            const data = doc.data();
            if (data.roomType === 'Classroom') classrooms++;
            if (data.roomType === 'Lab') labs++;
            capacity += (Number(data.rowsOfBenches || 0) * Number(data.columnsOfBenches || 0));
            roomsList.push({ ...data, id: doc.id });
        });

        setStats({
            totalStudents,
            totalFaculty,
            totalFloors,
            totalRooms: rSnap.size,
            totalClassrooms: classrooms,
            totalLabs: labs,
            totalCapacity: capacity,
            studentsByYear: yearsCount
        });

        // Generate synthetic activity from rooms logic since "recent activity" doesn't have a distinct collection
        const recentActivities = [];
        const sortedRooms = roomsList.sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
        });

        for (const r of sortedRooms.slice(0, 5)) {
            recentActivities.push({
                id: r.id,
                title: `Room ${r.roomNumber} Added`,
                description: `A new ${r.roomType.toLowerCase()} was registered on Floor ${r.floorNumber}. Layout: ${r.rowsOfBenches}x${r.columnsOfBenches}.`,
                time: r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'Recently',
                icon: <DoorOpen className="w-4 h-4 text-primary" />
            });
        }

        setActivities(recentActivities);

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [institutionId, branch, assignedBlock]);

  if (loading) {
      return (
          <HODLayout>
              <div className="flex items-center justify-center h-full pt-32">
                  <Activity className="w-10 h-10 text-primary animate-spin" />
              </div>
          </HODLayout>
      );
  }

  return (
    <HODLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>HOD</span>
            <span>/</span>
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            Branch Infrastructure Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of physical capacity and institutional metrics for {branch}.
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="dashboard-card border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Students</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalStudents}</div>
                </CardContent>
            </Card>
            <Card className="dashboard-card border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Faculty</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalFaculty}</div>
                </CardContent>
            </Card>
            <Card className="dashboard-card border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Floors</CardTitle>
                    <Layers className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalFloors}</div>
                </CardContent>
            </Card>
            <Card className="dashboard-card border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                    <Building2 className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalRooms}</div>
                </CardContent>
            </Card>
            <Card className="dashboard-card border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Classrooms</CardTitle>
                    <GraduationCap className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
                </CardContent>
            </Card>
            <Card className="dashboard-card border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Labs</CardTitle>
                    <Monitor className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalLabs}</div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Branch Overview Panel */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm h-full">
                    <CardHeader>
                        <CardTitle className="text-xl">Branch Overview</CardTitle>
                        <CardDescription>Mapping Configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Department / Branch</Label>
                            <div className="text-lg font-bold text-foreground mt-1">{branch}</div>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                            <Label className="text-xs text-primary uppercase tracking-wider">Assigned Block</Label>
                            <div className="text-lg font-bold text-primary mt-1">{assignedBlock}</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Max Seating Capacity</Label>
                            <div className="text-2xl font-bold text-foreground mt-1 flex items-end gap-2">
                                {stats.totalCapacity} <span className="text-sm font-normal text-muted-foreground mb-1">seats</span>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Student Breakdown</Label>
                            <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
                                <div className="bg-white p-2 text-center rounded shadow-sm">1st Yr: <strong>{stats.studentsByYear['1st Year']}</strong></div>
                                <div className="bg-white p-2 text-center rounded shadow-sm">2nd Yr: <strong>{stats.studentsByYear['2nd Year']}</strong></div>
                                <div className="bg-white p-2 text-center rounded shadow-sm">3rd Yr: <strong>{stats.studentsByYear['3rd Year']}</strong></div>
                                <div className="bg-white p-2 text-center rounded shadow-sm">4th Yr: <strong>{stats.studentsByYear['4th Year']}</strong></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
                <Card className="border-none shadow-sm h-full">
                    <CardHeader>
                        <CardTitle className="text-xl">Infrastructure Activity</CardTitle>
                        <CardDescription>Latest rooms added and modified</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activities.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-xl">
                                No recent infrastructure additions mapped yet.
                            </div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent pt-4">
                                {activities.map((activity, index) => (
                                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-primary/10 text-slate-500 group-[.is-active]:text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                                            {activity.icon}
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 shadow-sm bg-white">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900">{activity.title}</div>
                                                <time className="text-xs font-medium text-slate-500">{activity.time}</time>
                                            </div>
                                            <div className="text-sm text-slate-500">{activity.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

      </div>
    </HODLayout>
  );
}
