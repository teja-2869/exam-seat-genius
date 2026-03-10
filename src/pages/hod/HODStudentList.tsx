import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Users, Activity, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODStudentList() {
    const { college, user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId), limit(200)));
                setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); toast.error('Failed to load students'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) || s.rollNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Student List</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Student List</h1>
                    <p className="text-muted-foreground">View students in your department.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search by name or roll number..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filtered.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p>No students found.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Roll Number</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Branch</th>
                                    <th className="px-6 py-4">Year</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-bold">{s.rollNumber || s.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4">{s.name || 'Unnamed'}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{s.branch || 'N/A'}</td>
                                        <td className="px-6 py-4">{s.year || 1}</td>
                                        <td className="px-6 py-4"><Badge variant={s.academicStatus === 'Detained' ? 'destructive' : 'default'} className="text-[10px] uppercase">{s.academicStatus || 'Active'}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </HODLayout>
    );
}
