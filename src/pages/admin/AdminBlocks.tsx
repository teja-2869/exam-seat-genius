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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, orderBy } from 'firebase/firestore';
import { ExcelUpload } from '@/components/ui/ExcelUpload';
import { Upload, Download, ArrowLeft, Layers, DoorOpen } from 'lucide-react';
import { ClassroomRenderer } from '@/components/classroom/ClassroomRenderer';
import { useToast } from '@/hooks/use-toast';

export default function AdminBlocks() {
    const { college, user } = useAuth();
    const { toast } = useToast();
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        blockNumber: '',
        blockName: '',
        floorsCount: 1,
        status: 'Active'
    });

    const [activeTab, setActiveTab] = useState('manual');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Drill down state
    const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<any | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);

    const fetchBlocks = async () => {
        const userData = user as any;
        if (!userData || !userData.role || !userData.institutionId) {
            setLoading(false);
            return;
        }

        try {
            const bQuery = query(collection(db, 'blocks'), where('institutionId', '==', userData.institutionId));
            const snap = await getDocs(bQuery);
            const sortedBlocks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            sortedBlocks.sort((a: any, b: any) => String(a.blockNumber).localeCompare(String(b.blockNumber), undefined, { numeric: true }));
            setBlocks(sortedBlocks);
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Unable to load blocks',
                description: err?.message || 'Permission check failed while loading blocks.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async (blockNumber: string, floorNumber: number) => {
        const userData = user as any;
        if (!userData || !userData.institutionId) return;

        try {
            const rQuery = query(collection(db, 'classrooms'),
                where('institutionId', '==', userData.institutionId),
                where('blockNumber', '==', blockNumber),
                where('floorNumber', '==', String(floorNumber))
            );
            const snap = await getDocs(rQuery);
            setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, [college, user]);

    const handleCreateBlock = async () => {
        const userData = user as any;
        if (!userData || !userData.role || !userData.institutionId) {
            console.log("User data missing ❌");
            return;
        }
        console.log("User Data:", userData);

        try {
            setSubmitLoading(true);

            const floorsArray = Array.from({ length: Number(formData.floorsCount) }, (_, i) => ({
                floorNumber: i + 1,
                classrooms: [],
                labs: []
            }));

            if (!formData.blockNumber || !formData.floorsCount) {
                toast({
                    title: 'Missing required fields',
                    description: 'Block number and floors count are required.',
                    variant: 'destructive',
                });
                return;
            }

            const dupQuery = query(collection(db, 'blocks'),
                where('institutionId', '==', userData.institutionId),
                where('blockNumber', '==', formData.blockNumber)
            );
            const dupSnap = await getDocs(dupQuery);
            if (!dupSnap.empty) {
                toast({
                    title: 'Duplicate block',
                    description: 'Block number already exists in this institution.',
                    variant: 'destructive',
                });
                return;
            }

            await addDoc(collection(db, 'blocks'), {
                institutionId: userData.institutionId,
                blockNumber: formData.blockNumber,
                blockName: formData.blockName || '',
                totalFloors: Number(formData.floorsCount),
                capacity: 0,
                status: formData.status,
                floors: floorsArray,
                createdBy: userData.uid || userData.id || 'admin',
                createdAt: serverTimestamp()
            });

            setShowDialog(false);
            setFormData({ blockNumber: '', blockName: '', floorsCount: 1, status: 'Active' });
            await fetchBlocks();
            toast({
                title: 'Block saved',
                description: 'The block was created successfully.',
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Failed to save block',
                description: err?.message || 'Permission denied while creating block.',
                variant: 'destructive',
            });
        } finally {
            setSubmitLoading(false);
        }
    };



    const handleBulkUpload = async () => {
        const userData = user as any;
        if (!userData || !userData.role || !userData.institutionId) {
            console.log("User data missing ❌");
            return;
        }
        console.log("User Data:", userData);

        if (previewData.length === 0) return;
        setUploadLoading(true);

        try {
            const batch = writeBatch(db);
            let validAdds = 0;

            for (const row of previewData) {
                const dupQuery = query(collection(db, 'blocks'),
                    where('institutionId', '==', userData.institutionId),
                    where('blockNumber', '==', String(row.blockNumber))
                );
                const dupSnap = await getDocs(dupQuery);
                if (!dupSnap.empty) continue;

                const floorsCount = Number(row.totalFloors) || 1;
                const floorsArray = Array.from({ length: floorsCount }, (_, i) => ({
                    floorNumber: i + 1,
                    classrooms: [],
                    labs: []
                }));

                const newDocRef = doc(collection(db, 'blocks'));
                batch.set(newDocRef, {
                    institutionId: userData.institutionId,
                    blockNumber: String(row.blockNumber),
                    blockName: row.blockName ? String(row.blockName) : '',
                    totalFloors: floorsCount,
                    capacity: Number(row.capacity) || 0,
                    status: row.status || 'Active',
                    floors: floorsArray,
                    createdBy: userData.uid || userData.id || 'admin',
                    createdAt: serverTimestamp()
                });
                validAdds++;
            }

            if (validAdds > 0) {
                await batch.commit();
                toast({
                    title: 'Upload complete',
                    description: `Successfully uploaded ${validAdds} block${validAdds > 1 ? 's' : ''}.`,
                });
            } else {
                toast({
                    title: 'Nothing uploaded',
                    description: 'All blocks in the file already exist.',
                });
            }

            setShowDialog(false);
            setPreviewData([]);
            await fetchBlocks();
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Failed to upload block data',
                description: err?.message || 'Missing or insufficient permissions.',
                variant: 'destructive',
            });
        } finally {
            setUploadLoading(false);
        }
    };

    const handleEditBlock = async () => {
        if (!selectedBlockId) return;
        setSubmitLoading(true);
        try {
            const docRef = doc(db, 'blocks', selectedBlockId);
            await updateDoc(docRef, {
                blockNumber: formData.blockNumber,
                blockName: formData.blockName,
                totalFloors: Number(formData.floorsCount),
                status: formData.status
            });
            setShowEditDialog(false);
            setFormData({ blockNumber: '', blockName: '', floorsCount: 1, status: 'Active' });
            setSelectedBlockId(null);
            await fetchBlocks();
            toast({
                title: 'Block updated',
                description: 'The block was modified successfully.',
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Failed to update block',
                description: err?.message || 'Permission denied while modifying block.',
                variant: 'destructive',
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    const openEdit = (block: any) => {
        setFormData({
            blockNumber: block.blockNumber || '',
            blockName: block.blockName || '',
            floorsCount: block.totalFloors || 1,
            status: block.status || 'Active'
        });
        setSelectedBlockId(block.id);
        setShowEditDialog(true);
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
                    <div className="bg-[#f0f2f5] p-6 lg:p-10 rounded-2xl w-full">
                        {selectedRoom ? (
                            <div className="animate-fade-in space-y-4">
                                <Button variant="ghost" className="mb-2" onClick={() => setSelectedRoom(null)}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Rooms</Button>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-[#1a1c1e]"><DoorOpen className="w-5 h-5 text-primary" /> Room {selectedRoom.roomNumber} ({selectedRoom.roomType}) Layout</h2>
                                <ClassroomRenderer layout={selectedRoom} />
                            </div>
                        ) : selectedBlock ? (
                            <div className="animate-fade-in w-full">
                                <div className="flex items-center gap-4 mb-8">
                                    <Button variant="ghost" onClick={() => { setSelectedBlock(null); setSelectedFloor(null); }} className="hover:bg-white/50"><ArrowLeft className="w-5 h-5" /></Button>
                                    <h2 className="text-2xl font-bold text-[#1a1c1e]">Blocks <span className="text-muted-foreground font-normal">/ Rooms</span></h2>
                                </div>
                                <div className="space-y-6">
                                    {selectedBlock.floors?.map((floor: any, fIdx: number) => {
                                        // Find rooms belonging to this floor from the global 'rooms' array
                                        const floorRooms = rooms
                                            .filter(r => String(r.floorNumber) === String(floor.floorNumber))
                                            .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));

                                        const getRoomColor = (type: string) => {
                                            const t = (type || '').trim().toLowerCase();
                                            if (t === 'classroom') return 'bg-blue-500';
                                            if (t === 'facultyroom' || t === 'faculty room') return 'bg-rose-500';
                                            if (t === 'hodroom' || t === 'hod room' || t === 'hod cabin') return 'bg-purple-500';
                                            if (t === 'lab') return 'bg-emerald-500';
                                            return 'bg-amber-500';
                                        };
                                        return (
                                            <div key={fIdx} className="bg-[#e4e6ea]/50 rounded-xl p-6 border border-[#d1d5db]">
                                                <h3 className="text-center font-semibold text-sm text-[#4b5563] mb-4">Floor {floor.floorNumber}</h3>
                                                {floorRooms.length === 0 ? (
                                                    <div className="text-center text-xs text-muted-foreground py-4">No rooms added to this floor.</div>
                                                ) : (
                                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                        {floorRooms.map((room) => {
                                                            const badgeColor = getRoomColor(room.roomType);
                                                            return (
                                                                <button key={room.id} onClick={() => setSelectedRoom(room)} className="flex-shrink-0 w-24 h-24 bg-white rounded-xl shadow-sm border border-transparent hover:border-primary transition-all flex flex-col relative overflow-hidden group">
                                                                    <div className="flex-1 flex flex-col items-center justify-center text-[#1a1c1e] group-hover:scale-110 transition-transform w-full">
                                                                        <span className="text-xl font-bold">{room.roomNumber}</span>
                                                                        <span className="text-[10px] text-muted-foreground uppercase truncate w-full px-1">{room.roomType || 'ROOM'}</span>
                                                                    </div>
                                                                    <div className={`h-1.5 w-full ${badgeColor}`}></div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in w-full">
                                <h2 className="text-2xl font-bold text-[#1a1c1e] mb-8">Blocks</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {blocks.map((block, idx) => {
                                        const colorClasses = ['bg-blue-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500'];
                                        const badgeColor = colorClasses[idx % colorClasses.length];
                                        return (
                                            <button key={block.id} onClick={() => {
                                                setSelectedBlock(block);
                                                // Fetch rooms for all floors in this block concurrently or broadly
                                                // As HODRooms is doing, we just fetch all rooms for this block and filter locally
                                                const fetchAllBlockRooms = async () => {
                                                    let instId = college?.id || (user as any)?.institutionId;
                                                    if (!instId) return;
                                                    // In our old fetchRooms we limited by floor. Let's fetch all per block
                                                    const rQ = query(collection(db, 'classrooms'), where('institutionId', '==', instId), where('blockNumber', '==', block.blockNumber));
                                                    const sn = await getDocs(rQ);
                                                    setRooms(sn.docs.map(d => ({ id: d.id, ...d.data()})));
                                                };
                                                fetchAllBlockRooms();
                                            }} className="bg-white rounded-2xl shadow-sm border border-transparent hover:border-primary transition-all flex flex-col relative overflow-hidden group text-left">
                                                <div className="py-8 w-full flex items-center justify-center">
                                                    <span className="text-xl font-bold text-[#1a1c1e] group-hover:scale-105 transition-transform">{block.blockNumber}</span>
                                                </div>
                                                <div className={`h-1 w-3/4 mx-auto ${badgeColor} rounded-full`}></div>
                                                <div className="text-[10px] text-muted-foreground uppercase py-3 w-full text-center mt-auto truncate px-2">
                                                    {block.blockName || 'NO NAME'}
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openEdit(block); }} 
                                                    className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(block.id); }} 
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Register New Block</DialogTitle></DialogHeader>
                        
                        <Tabs defaultValue="manual" className="w-full mt-4" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="upload">Upload File (Excel)</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="manual" className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Block Number <span className="text-red-500">*</span></Label>
                                    <Input placeholder="e.g., Block-1, A, Main" value={formData.blockNumber} onChange={e => setFormData({ ...formData, blockNumber: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Block Name</Label>
                                    <Input placeholder="e.g., CSE(CYBER)" value={formData.blockName} onChange={e => setFormData({ ...formData, blockName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Floors <span className="text-red-500">*</span></Label>
                                    <Input type="number" min="1" value={formData.floorsCount} onChange={e => setFormData({ ...formData, floorsCount: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status <span className="text-red-500">*</span></Label>
                                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowDialog(false)} disabled={submitLoading}>Cancel</Button>
                                    <Button onClick={handleCreateBlock} disabled={submitLoading}>
                                        {submitLoading ? 'Registering...' : 'Register Block'}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4 py-4">
                                <ExcelUpload 
                                    templateHeaders={['blockNumber', 'blockName', 'totalFloors', 'capacity', 'status']}
                                    templateName="blocks_template.xlsx"
                                    schemaMapping={{
                                        'blockNumber': 'blockNumber',
                                        'blockName': 'blockName',
                                        'totalFloors': 'totalFloors',
                                        'capacity': 'capacity',
                                        'status': 'status'
                                    }}
                                    requiredFields={['blockNumber', 'totalFloors']}
                                    onDataParsed={setPreviewData}
                                    previewData={previewData}
                                    onUpload={handleBulkUpload}
                                    uploadLoading={uploadLoading}
                                    previewColumns={[
                                        { key: 'blockNumber', label: 'Block #' },
                                        { key: 'blockName', label: 'Name' },
                                        { key: 'totalFloors', label: 'Floors' },
                                        { key: 'capacity', label: 'Capacity' },
                                        { key: 'status', label: 'Status' }
                                    ]}
                                />
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Edit Infrastructure Block</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Block Number</Label>
                                <Input placeholder="e.g., Block-1" value={formData.blockNumber} onChange={e => setFormData({ ...formData, blockNumber: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Block Name</Label>
                                <Input placeholder="e.g., CSE" value={formData.blockName} onChange={e => setFormData({ ...formData, blockName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Floors</Label>
                                <Input type="number" min="1" value={formData.floorsCount} onChange={e => setFormData({ ...formData, floorsCount: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitLoading}>Cancel</Button>
                            <Button onClick={handleEditBlock} disabled={submitLoading}>
                                {submitLoading ? 'Updating...' : 'Save Changes'}
                            </Button>
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
