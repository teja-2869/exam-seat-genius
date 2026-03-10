import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
    Building2, Plus, Edit, Trash2, AlertCircle, Activity, Save, X, DoorOpen, FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminBlocks() {
    const { college, user } = useAuth();
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
    const [editingBlock, setEditingBlock] = useState<any | null>(null);
    const [showRoomDialog, setShowRoomDialog] = useState<{ blockId: string; floorIndex: number } | null>(null);

    const [formData, setFormData] = useState({
        blockNumber: '',
        blockName: '',
        positionDescription: '',
        floorsCount: 1,
        status: 'Active'
    });

    const [roomForm, setRoomForm] = useState({
        roomNumber: '',
        type: 'classroom',
        capacity: 30,
        rows: 5,
        columns: 6
    });

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    const fetchBlocks = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId) { setLoading(false); return; }
        try {
            const bQuery = query(collection(db, 'blocks'), where('institutionId', '==', institutionId));
            const snap = await getDocs(bQuery);
            setBlocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch blocks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBlocks(); }, [college, user]);

    const resetForm = () => {
        setFormData({ blockNumber: '', blockName: '', positionDescription: '', floorsCount: 1, status: 'Active' });
        setEditingBlock(null);
    };

    const openCreateDialog = () => { resetForm(); setShowDialog(true); };

    const openEditDialog = (block: any) => {
        setEditingBlock(block);
        setFormData({
            blockNumber: block.blockNumber || '',
            blockName: block.blockName || '',
            positionDescription: block.positionDescription || '',
            floorsCount: block.floors?.length || 1,
            status: block.status || 'Active'
        });
        setShowDialog(true);
    };

    const handleSaveBlock = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId) return;
        if (!formData.blockNumber.trim()) { toast.error('Block tag is required'); return; }

        const floorsArray = Array.from({ length: Number(formData.floorsCount) }, (_, i) => {
            const existingFloor = editingBlock?.floors?.[i];
            return existingFloor || { floorNumber: i + 1, classrooms: [], labs: [] };
        });

        try {
            if (editingBlock) {
                await updateDoc(doc(db, 'blocks', editingBlock.id), {
                    blockNumber: formData.blockNumber,
                    blockName: formData.blockName,
                    positionDescription: formData.positionDescription,
                    status: formData.status,
                    floors: floorsArray,
                    updatedAt: serverTimestamp()
                });
                toast.success('Block updated successfully');
            } else {
                await addDoc(collection(db, 'blocks'), {
                    institutionId,
                    blockNumber: formData.blockNumber,
                    blockName: formData.blockName,
                    positionDescription: formData.positionDescription,
                    status: formData.status,
                    floors: floorsArray,
                    createdAt: serverTimestamp()
                });
                toast.success('Block registered successfully');
            }
            setShowDialog(false);
            resetForm();
            fetchBlocks();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save block');
        }
    };

    const handleDelete = async () => {
        if (!showConfirmDelete) return;
        try {
            await deleteDoc(doc(db, 'blocks', showConfirmDelete));
            setShowConfirmDelete(null);
            toast.success('Block deleted');
            fetchBlocks();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete block');
        }
    };

    const handleAddRoom = async () => {
        if (!showRoomDialog || !roomForm.roomNumber.trim()) { toast.error('Room number is required'); return; }
        const block = blocks.find(b => b.id === showRoomDialog.blockId);
        if (!block) return;

        const updatedFloors = [...(block.floors || [])];
        const floor = updatedFloors[showRoomDialog.floorIndex];
        if (!floor) return;

        const room = {
            roomNumber: roomForm.roomNumber,
            type: roomForm.type,
            capacity: roomForm.capacity,
            rows: roomForm.rows,
            columns: roomForm.columns,
            addedAt: new Date().toISOString()
        };

        if (roomForm.type === 'lab') {
            floor.labs = [...(floor.labs || []), room];
        } else {
            floor.classrooms = [...(floor.classrooms || []), room];
        }

        try {
            await updateDoc(doc(db, 'blocks', showRoomDialog.blockId), { floors: updatedFloors, updatedAt: serverTimestamp() });
            toast.success(`Room ${roomForm.roomNumber} added to Floor ${floor.floorNumber}`);
            setShowRoomDialog(null);
            setRoomForm({ roomNumber: '', type: 'classroom', capacity: 30, rows: 5, columns: 6 });
            fetchBlocks();
        } catch (err) {
            console.error(err);
            toast.error('Failed to add room');
        }
    };

    const handleRemoveRoom = async (blockId: string, floorIndex: number, roomType: 'classrooms' | 'labs', roomIndex: number) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;
        const updatedFloors = [...(block.floors || [])];
        updatedFloors[floorIndex][roomType].splice(roomIndex, 1);
        try {
            await updateDoc(doc(db, 'blocks', blockId), { floors: updatedFloors, updatedAt: serverTimestamp() });
            toast.success('Room removed');
            fetchBlocks();
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove room');
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Infrastructure</span><span>/</span><span className="text-foreground font-medium">Blocks & Rooms</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Rooms & Blocks Engine</h1>
                        <p className="text-muted-foreground">Manage global physical infrastructure constraints securely.</p>
                    </div>
                    <Button onClick={openCreateDialog}><Plus className="w-4 h-4 mr-2" /> Add Block</Button>
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
                                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Block {block.blockNumber} {block.blockName ? `- ${block.blockName}` : ''}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{block.positionDescription}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${block.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{block.status}</span>
                                        <Button variant="outline" size="icon" onClick={() => openEditDialog(block)}><Edit className="w-4 h-4" /></Button>
                                        <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setShowConfirmDelete(block.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <p className="font-semibold text-sm">Floors Configuration ({block.floors?.length || 0})</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {block.floors?.map((floor: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                                                <div className="flex items-center justify-between mb-2 border-b pb-1">
                                                    <h4 className="font-bold text-sm">Floor {floor.floorNumber}</h4>
                                                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowRoomDialog({ blockId: block.id, floorIndex: idx })}>
                                                        <Plus className="w-3 h-3 mr-1" /> Room
                                                    </Button>
                                                </div>
                                                <div className="text-xs space-y-1">
                                                    {floor.classrooms?.map((room: any, ri: number) => (
                                                        <div key={ri} className="flex items-center justify-between bg-background/50 p-1.5 rounded">
                                                            <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3 text-primary" /> {room.roomNumber} ({room.capacity})</span>
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveRoom(block.id, idx, 'classrooms', ri)}><X className="w-3 h-3" /></Button>
                                                        </div>
                                                    ))}
                                                    {floor.labs?.map((room: any, ri: number) => (
                                                        <div key={ri} className="flex items-center justify-between bg-background/50 p-1.5 rounded">
                                                            <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3 text-accent" /> {room.roomNumber} ({room.capacity})</span>
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveRoom(block.id, idx, 'labs', ri)}><X className="w-3 h-3" /></Button>
                                                        </div>
                                                    ))}
                                                    {(!floor.classrooms?.length && !floor.labs?.length) && <p className="text-muted-foreground italic">No rooms yet</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create/Edit Block Dialog */}
                <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingBlock ? 'Edit Block' : 'Register New Block'}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Block Tag / Number</Label>
                                <Input placeholder="e.g., Block A, 01, Main Block" value={formData.blockNumber} onChange={e => setFormData({ ...formData, blockNumber: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Block Name (optional)</Label>
                                <Input placeholder="e.g., Science Block" value={formData.blockName} onChange={e => setFormData({ ...formData, blockName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Position Description</Label>
                                <Input placeholder="e.g., Beside Admin Office" value={formData.positionDescription} onChange={e => setFormData({ ...formData, positionDescription: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Floors</Label>
                                <Input type="number" min="1" value={formData.floorsCount} onChange={e => setFormData({ ...formData, floorsCount: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
                            <Button onClick={handleSaveBlock}><Save className="w-4 h-4 mr-2" /> {editingBlock ? 'Update Block' : 'Register Block'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Room Dialog */}
                <Dialog open={!!showRoomDialog} onOpenChange={() => setShowRoomDialog(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Room to Floor</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Room Number</Label>
                                <Input placeholder="e.g., 101, LAB-A" value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={roomForm.type} onValueChange={v => setRoomForm({ ...roomForm, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="classroom">Classroom</SelectItem>
                                        <SelectItem value="lab">Lab</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label>Capacity</Label>
                                    <Input type="number" min="1" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rows</Label>
                                    <Input type="number" min="1" value={roomForm.rows} onChange={e => setRoomForm({ ...roomForm, rows: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Columns</Label>
                                    <Input type="number" min="1" value={roomForm.columns} onChange={e => setRoomForm({ ...roomForm, columns: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRoomDialog(null)}>Cancel</Button>
                            <Button onClick={handleAddRoom}><Plus className="w-4 h-4 mr-2" /> Add Room</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Confirm Delete */}
                <Dialog open={!!showConfirmDelete} onOpenChange={() => setShowConfirmDelete(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Are you sure you want to permanently delete this block and all its rooms?</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete Block</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
