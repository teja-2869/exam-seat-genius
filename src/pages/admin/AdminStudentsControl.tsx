import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Users, Filter, CheckCircle, XCircle, Search, Activity, ShieldAlert, Lock, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AdminStudentsControl() {
    const { college, user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [datasetLocked, setDatasetLocked] = useState(false);
    const [showLockPrompt, setShowLockPrompt] = useState(false);

    const fetchStudents = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) { setLoading(false); return; }
        try {
            const sQuery = query(collection(db, 'students'), where('institutionId', '==', institutionId), limit(150));
            const snap = await getDocs(sQuery);
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [college, user]);

    const toggleStudentStatus = async (studentId: string, currentStatus: string) => {
        if (datasetLocked) return;
        try {
            let newStatus = currentStatus === 'Active' ? 'Detained' : 'Active';
            await updateDoc(doc(db, 'students', studentId), { academicStatus: newStatus });
            fetchStudents();
        } catch (err) {
            console.error(err);
        }
    };

    const handleLockDataset = () => {
        setDatasetLocked(true);
        setShowLockPrompt(false);
    };

    const filteredStudents = students.filter(s => {
        let branchMatch = filterBranch === 'All' || s.branch === filterBranch;
        let statusMatch = filterStatus === 'All' || s.academicStatus === filterStatus;
        let searchMatch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return branchMatch && statusMatch && searchMatch;
    });

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Academics</span><span>/</span><span className="text-foreground font-medium">Master Dataset</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                            Student Dataset Engine
                        </h1>
                        <p className="text-muted-foreground">
                            Govern global student visibility, filter ingestion batches, and secure generation locking.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto"><UploadCloud className="w-4 h-4 mr-2" /> HOD Upload Requests</Button>
                        {datasetLocked ? (
                            <Button variant="destructive" disabled className="w-full sm:w-auto"><Lock className="w-4 h-4 mr-2" /> Dataset Locked</Button>
                        ) : (
                            <Button variant="destructive" onClick={() => setShowLockPrompt(true)} className="w-full sm:w-auto"><ShieldAlert className="w-4 h-4 mr-2" /> Lock Seating Roster</Button>
                        )}
                    </div>
                </div>

                <Card className="dashboard-card border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center bg-muted/20">
                        <div className="relative w-full md:w-96 flex-shrink-0">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Search Roll No or Name..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={datasetLocked} />
                        </div>
                        <Select value={filterBranch} onValueChange={setFilterBranch} disabled={datasetLocked}>
                            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Branch" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Branches</SelectItem>
                                {/* Deriving unique branches simply for UI demo */}
                                {[...new Set(students.map(s => s.branch).filter(Boolean))].map((br, i) => (
                                    <SelectItem key={i} value={br as string}>{br as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus} disabled={datasetLocked}>
                            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="Active">Active / Eligible</SelectItem>
                                <SelectItem value="Detained">Detained</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filteredStudents.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p>No student records match the active filters or roster is empty.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                     <tr>
                                         <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Roll Number</th>
                                         <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Student Name</th>
                                         <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Branch & Yr</th>
                                         <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Academic Status</th>
                                         <th className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">Overrides</th>
                                     </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                                             <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold whitespace-nowrap">{student.rollNumber || student.id.slice(0, 6).toUpperCase()}</td>
                                             <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">{student.name || 'Unnamed Record'}</td>
                                             <td className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground whitespace-nowrap">{student.branch || 'None'} - Yr {student.year || 1}</td>
                                             <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                <Badge variant={student.academicStatus === 'Active' || !student.academicStatus ? 'default' : 'destructive'} className="uppercase text-[10px] tracking-wider font-bold">
                                                    {student.academicStatus || 'Active'}
                                                </Badge>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={student.academicStatus === 'Detained' ? 'text-green-600' : 'text-red-500'}
                                                    disabled={datasetLocked}
                                                    onClick={() => toggleStudentStatus(student.id, student.academicStatus || 'Active')}
                                                >
                                                    {student.academicStatus === 'Detained' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                                    {student.academicStatus === 'Detained' ? 'Re-induct' : 'Detain'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Dialog open={showLockPrompt} onOpenChange={setShowLockPrompt}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Dataset Seating Lock Protocol</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="flex gap-4 p-4 bg-orange-100 text-orange-800 rounded-lg items-start border border-orange-200">
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Warning: Engaging the Dataset Lock freezes all HOD student uploads, faculty availability edits, and detainment filters. This ensures the AI Generation engine works with a structurally sound snapshot. Do you proceed?</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowLockPrompt(false)}>Abort Sequence</Button>
                            <Button onClick={handleLockDataset}>Engage Lock</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
