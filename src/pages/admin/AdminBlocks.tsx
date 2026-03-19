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
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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

    const ensureAdminSession = async () => {
        const firebaseUser = auth.currentUser;
        console.log('Current User:', firebaseUser);

        if (!firebaseUser) {
            throw new Error('You must be logged in as an admin to upload block data.');
        }

        await firebaseUser.getIdToken(true);
        const tokenResult = await firebaseUser.getIdTokenResult();
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (!userDoc.exists()) {
            throw new Error('User session invalid.');
        }

        const currentUser = userDoc.data() as {
            institutionId?: string;
            role?: string;
        };

        if (!currentUser.institutionId) {
            throw new Error('institutionId is missing for the active user.');
        }

        const normalizedRole = String(currentUser.role || tokenResult.claims.role || '').toUpperCase();
        if (normalizedRole !== 'ADMIN') {
            throw new Error('Only admin users can manage blocks.');
        }

        return {
            firebaseUser,
            currentUser,
            claims: tokenResult.claims,
        };
    };

    const fetchBlocks = async () => {
        const institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) {
            setLoading(false);
            return;
        }

        try {
            await ensureAdminSession();
            const bQuery = query(collection(db, 'blocks'), where('institutionId', '==', institutionId));
            const snap = await getDocs(bQuery);
            setBlocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
        const institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) return;

        try {
            await ensureAdminSession();
            const rQuery = query(collection(db, 'classrooms'),
                where('institutionId', '==', institutionId),
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
        try {
            setSubmitLoading(true);

            const { firebaseUser, currentUser } = await ensureAdminSession();

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
                where('institutionId', '==', currentUser.institutionId),
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
                institutionId: currentUser.institutionId,
                blockNumber: formData.blockNumber,
                blockName: formData.blockName || '',
                totalFloors: Number(formData.floorsCount),
                status: formData.status,
                floors: floorsArray,
                createdBy: firebaseUser.uid,
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

    const downloadDemoTemplate = () => {
        const template = [
            ['blockNumber', 'blockName', 'totalFloors', 'status'],
            ['Block-1', 'CSE(CYBER)', '4', 'Active'],
            ['Block-2', 'CSE(Data Science)', '3', 'Active']
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(template);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Blocks');
        XLSX.writeFile(workbook, 'blocks_template.csv');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            const validData = jsonData.filter(row => row.blockNumber && row.totalFloors);
            setPreviewData(validData);
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkUpload = async () => {
        if (previewData.length === 0) return;
        setUploadLoading(true);

        try {
            const { firebaseUser, currentUser } = await ensureAdminSession();
            const batch = writeBatch(db);
            let validAdds = 0;

            for (const row of previewData) {
                const dupQuery = query(collection(db, 'blocks'),
                    where('institutionId', '==', currentUser.institutionId),
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
                    institutionId: currentUser.institutionId,
                    blockNumber: String(row.blockNumber),
                    blockName: row.blockName ? String(row.blockName) : '',
                    totalFloors: floorsCount,
                    status: row.status || 'Active',
                    floors: floorsArray,
                    createdBy: firebaseUser.uid,
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
                                        const floorRooms = rooms.filter(r => String(r.floorNumber) === String(floor.floorNumber));
                                        return (
                                            <div key={fIdx} className="bg-[#e4e6ea]/50 rounded-xl p-6 border border-[#d1d5db]">
                                                <h3 className="text-center font-semibold text-sm text-[#4b5563] mb-4">Floor {floor.floorNumber}</h3>
                                                {floorRooms.length === 0 ? (
                                                    <div className="text-center text-xs text-muted-foreground py-4">No rooms added to this floor.</div>
                                                ) : (
                                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                        {floorRooms.map((room, rIdx) => {
                                                            const colorClasses = ['bg-blue-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500'];
                                                            const badgeColor = colorClasses[rIdx % colorClasses.length];
                                                            return (
                                                                <button key={room.id} onClick={() => setSelectedRoom(room)} className="flex-shrink-0 w-24 h-24 bg-white rounded-xl shadow-sm border border-transparent hover:border-primary transition-all flex flex-col relative overflow-hidden group">
                                                                    <div className="flex-1 flex items-center justify-center text-xl font-bold text-[#1a1c1e] group-hover:scale-110 transition-transform">
                                                                        {room.roomNumber}
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
                                <TabsTrigger value="upload">Upload File (CSV/Excel)</TabsTrigger>
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
                                <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-muted/20">
                                    <Upload className="w-8 h-8 text-muted-foreground mb-4" />
                                    <h3 className="font-semibold mb-1">Upload Block Data</h3>
                                    <p className="text-sm text-muted-foreground mb-4">Supports .csv or .xlsx files</p>
                                    <Input type="file" accept=".csv, .xlsx" className="max-w-xs cursor-pointer" onChange={handleFileUpload} />
                                </div>
                                
                                <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                    <div className="text-sm text-blue-800">
                                        <p className="font-semibold">Need a template?</p>
                                        <p>Download our sample file to see the required format.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadDemoTemplate} className="bg-white">
                                        <Download className="w-4 h-4 mr-2" /> Download Demo Template
                                    </Button>
                                </div>

                                {previewData.length > 0 && (
                                    <div className="mt-4 border rounded-xl overflow-x-auto max-h-48 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2">Block #</th>
                                                    <th className="px-4 py-2">Name</th>
                                                    <th className="px-4 py-2">Floors</th>
                                                    <th className="px-4 py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="border-b">
                                                        <td className="px-4 py-2">{row.blockNumber}</td>
                                                        <td className="px-4 py-2">{row.blockName}</td>
                                                        <td className="px-4 py-2">{row.totalFloors}</td>
                                                        <td className="px-4 py-2">{row.status}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                                    <Button onClick={handleBulkUpload} disabled={previewData.length === 0 || uploadLoading}>
                                        {uploadLoading ? 'Uploading...' : `Upload ${previewData.length} Blocks`}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                        </Tabs>
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
