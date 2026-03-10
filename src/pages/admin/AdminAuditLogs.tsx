import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { History, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminAuditLogs() {
    const { college, user } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    useEffect(() => {
        const fetchLogs = async () => {
            const institutionId = getInstitutionId();
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'auditLogs'), where('institutionId', '==', institutionId), limit(100)));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                data.sort((a: any, b: any) => {
                    const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
                    const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
                    return bTime - aTime;
                });
                setLogs(data);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load audit logs');
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [college, user]);

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Admin</span><span>/</span><span>Settings</span><span>/</span><span className="text-foreground font-medium">Audit Logs</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Audit Logs</h1>
                    <p className="text-muted-foreground">Track all system activities and changes across the platform.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : logs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <History className="w-12 h-12 mb-4 opacity-50" />
                        <p>No audit logs recorded yet. Actions will appear here as users interact with the system.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Action</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 text-muted-foreground text-xs">{log.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</td>
                                        <td className="px-6 py-4 font-medium">{log.action || 'Unknown'}</td>
                                        <td className="px-6 py-4">{log.userName || log.userId?.slice(0, 8) || 'System'}</td>
                                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{log.details || '-'}</td>
                                        <td className="px-6 py-4"><Badge variant="outline" className="text-[10px] uppercase">{log.type || 'info'}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
