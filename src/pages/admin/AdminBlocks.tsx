import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    AlertCircle,
    Eye,
    Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function AdminBlocks() {
    const { college, user } = useAuth();
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        blockNumber: '',
        blockName: '',
        positionDescription: '',
        floorsCount: 1,
        status: 'Active'
    });

    const fetchBlocks = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) { setLoading(false); return; }
        try {
            const bQuery = query(collection(db, 'blocks'), where('institutionId', '==', institutionId));
            const snap = await getDocs(bQuery);
            setBlocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, [college, user]);

    const handleCreateBlock = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) return;

        // generate rudimentary floors array
        const floorsArray = Array.from({ length: Number(formData.floorsCount) }, (_, i) => ({
            floorNumber: i + 1,
            classrooms: [],
            labs: []
        }));

        try {
            await addDoc(collection(db, 'blocks'), {
                institutionId,
                blockNumber: formData.blockNumber,
                blockName: formData.blockName,
                positionDescription: formData.positionDescription,
                status: formData.status,
                floors: floorsArray,
                createdAt: serverTimestamp()
            });
            setShowDialog(false);
            fetchBlocks();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!showConfirmDelete) return;
        try {
            await deleteDoc(doc(db, 'blocks', showConfirmDelete));
            setShowConfirmDelete(null);
            fetchBlocks();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Infrastructure</span><span>/</span><span className="text-foreground font-medium">Blocks & Rooms</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Rooms & Blocks Engine
                        </h1>
                        <p className="text-muted-foreground">
                            Manage global physical infrastructure constraints securely.
                        </p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Add Block</Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : blocks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Building2 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No blocks or infrastructure registered yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {blocks.map((block) => (
                            <Card key={block.id} className="dashboard-card relative">
                                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Block {block.blockNumber} {block.blockName ? `- ${block.blockName}` : ''}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{block.positionDescription}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${block.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{block.status}</span>
                                        <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setShowConfirmDelete(block.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <p className="font-semibold text-sm">Floors Configuration ({block.floors?.length || 0})</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {block.floors?.map((floor: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                                                <h4 className="font-bold text-sm mb-2 border-b pb-1">Floor {floor.floorNumber}</h4>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <p>Rooms: {floor.classrooms?.length || 0}</p>
                                                    <p>Labs: {floor.labs?.length || 0}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Register New Block</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Block Tag / Number</Label>
                                <Input placeholder="e.g., Block A, 01, Main Block" onChange={e => setFormData({ ...formData, blockNumber: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Position Description</Label>
                                <Input placeholder="e.g., Beside Admin Office" onChange={e => setFormData({ ...formData, positionDescription: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Floors</Label>
                                <Input type="number" min="1" value={formData.floorsCount} onChange={e => setFormData({ ...formData, floorsCount: Number(e.target.value) })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleCreateBlock}>Register Block</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!showConfirmDelete} onOpenChange={() => setShowConfirmDelete(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Confirm Integrity Notice</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Are you sure you want to completely erase this infrastructure block? This action bypasses institutional safeguards and removes the entity permanently.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Abort</Button>
                            <Button variant="destructive" onClick={handleDelete}>Confirm Deletion</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
