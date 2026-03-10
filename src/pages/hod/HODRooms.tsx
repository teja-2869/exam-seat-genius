import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Building2, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODRooms() {
    const { college, user } = useAuth();
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'blocks'), where('institutionId', '==', institutionId)));
                setBlocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); toast.error('Failed to load rooms'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    const totalRooms = blocks.reduce((acc, b) => acc + (b.floors?.reduce((a: number, f: any) => a + (f.classrooms?.length || 0) + (f.labs?.length || 0), 0) || 0), 0);

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Rooms</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Department Rooms</h1>
                    <p className="text-muted-foreground">View classrooms and labs available in the institution ({totalRooms} total rooms).</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : blocks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Building2 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No blocks registered by admin yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {blocks.map(block => (
                            <Card key={block.id} className="dashboard-card">
                                <CardHeader className="border-b pb-4">
                                    <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Block {block.blockNumber} {block.blockName ? `- ${block.blockName}` : ''}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{block.positionDescription}</p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {block.floors?.map((floor: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                                                <h4 className="font-bold text-sm mb-2 border-b pb-1">Floor {floor.floorNumber}</h4>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <p>Classrooms: {floor.classrooms?.length || 0}</p>
                                                    <p>Labs: {floor.labs?.length || 0}</p>
                                                    {floor.classrooms?.map((r: any, i: number) => (
                                                        <p key={i} className="text-foreground">📚 {r.roomNumber} ({r.capacity} seats)</p>
                                                    ))}
                                                    {floor.labs?.map((r: any, i: number) => (
                                                        <p key={i} className="text-foreground">🔬 {r.roomNumber} ({r.capacity} seats)</p>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </HODLayout>
    );
}
