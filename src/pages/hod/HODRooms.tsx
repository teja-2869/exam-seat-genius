import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import {
    Building2,
    Plus,
    Trash2,
    ArrowLeft,
    Layers,
    DoorOpen,
    Upload,
    Download,
    Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ExcelUpload } from '@/components/ui/ExcelUpload';
import { ClassroomRenderer } from '@/components/classroom/ClassroomRenderer';

export default function HODRooms() {
    const { college, user } = useAuth();
    const [myBlock, setMyBlock] = useState<any | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI state
    const [showDialog, setShowDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('manual');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        floorNumber: '',
        roomNumber: '',
        roomType: 'Classroom',
        rowsOfBenches: 5,
        columnsOfBenches: 8,
        boardPosition: 'top',
        doorPosition: 'front'
    });

    const hodObj = user as any;
    const institutionId = college?.id || hodObj?.institutionId;
    const assignedBlock = hodObj?.assignedBlock;
    const branch = hodObj?.branch || '';

    const fetchData = async () => {
        if (!institutionId || !assignedBlock) {
            setLoading(false);
            return;
        }
        try {
            // Fetch Block doc for floors definitions
            const bQuery = query(collection(db, 'blocks'), 
                where('institutionId', '==', institutionId),
                where('blockNumber', '==', assignedBlock)
            );
            const bSnap = await getDocs(bQuery);
            if (!bSnap.empty) {
                setMyBlock({ id: bSnap.docs[0].id, ...bSnap.docs[0].data() });
            }

            // Fetch Rooms for this specific block
            const rQuery = query(collection(db, 'classrooms'), 
                where('institutionId', '==', institutionId),
                where('blockNumber', '==', assignedBlock)
            );
            const rSnap = await getDocs(rQuery);
            setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [college, user]);

    const handleCreateRoom = async () => {
        const userData = user as any;
        if (!userData || !userData.role || !userData.institutionId) {
            console.log("User data missing ❌");
            return;
        }
        console.log("User Data:", userData);

        if (!assignedBlock) return;

        try {
            setSubmitLoading(true);
            if (!formData.floorNumber || !formData.roomNumber) {
                alert('Missing required fields');
                setSubmitLoading(false);
                return;
            }

            // Check duplicate room
            const dupQuery = query(collection(db, 'classrooms'), 
                where('institutionId', '==', institutionId), 
                where('blockNumber', '==', assignedBlock),
                where('floorNumber', '==', formData.floorNumber),
                where('roomNumber', '==', formData.roomNumber)
            );
            const dupSnap = await getDocs(dupQuery);
            if (!dupSnap.empty) {
                alert('Room number already exists on this floor.');
                setSubmitLoading(false);
                return;
            }

            await addDoc(collection(db, 'classrooms'), {
                institutionId: userData.institutionId,
                blockNumber: assignedBlock,
                branch,
                floorNumber: formData.floorNumber,
                roomNumber: formData.roomNumber,
                roomType: formData.roomType,
                rowsOfBenches: Number(formData.rowsOfBenches),
                columnsOfBenches: Number(formData.columnsOfBenches),
                boardPosition: formData.boardPosition,
                doorPosition: formData.doorPosition,
                createdAt: serverTimestamp()
            });

            setShowDialog(false);
            setFormData({
                floorNumber: '', roomNumber: '', roomType: 'Classroom',
                rowsOfBenches: 5, columnsOfBenches: 8, boardPosition: 'top', doorPosition: 'front'
            });
            await fetchData();
            alert('Room added successfully');
        } catch (err) {
            console.error('Save error', err);
            alert('Failed to save room.');
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

        if (!assignedBlock || previewData.length === 0) return;
        setUploadLoading(true);

        try {
            const batch = writeBatch(db);
            let validAdds = 0;
            
            for (const row of previewData) {
                // check duplicate room
                const dupQuery = query(collection(db, 'classrooms'), 
                    where('institutionId', '==', institutionId), 
                    where('blockNumber', '==', assignedBlock),
                    where('floorNumber', '==', String(row.floorNumber)),
                    where('roomNumber', '==', String(row.roomNumber))
                );
                const dupSnap = await getDocs(dupQuery);
                if (!dupSnap.empty) continue; // skip duplicates silently per row, safe measure

                const newDocRef = doc(collection(db, 'classrooms'));
                batch.set(newDocRef, {
                    institutionId: userData.institutionId,
                    blockNumber: assignedBlock,
                    branch,
                    floorNumber: String(row.floorNumber),
                    roomNumber: String(row.roomNumber),
                    roomType: row.roomType || 'Classroom',
                    rowsOfBenches: Number(row.rowsOfBenches),
                    columnsOfBenches: Number(row.columnsOfBenches),
                    boardPosition: row.boardPosition || 'top',
                    doorPosition: row.doorPosition || 'front',
                    createdAt: serverTimestamp()
                });
                validAdds++;
            }

            if (validAdds > 0) {
                await batch.commit();
                alert(`Successfully added ${validAdds} rooms.`);
            } else {
                alert('No valid rows or all rooms were duplicates.');
            }

            setShowDialog(false);
            setPreviewData([]);
            await fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to execute bulk upload.');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        try {
            await deleteDoc(doc(db, 'classrooms', roomId));
            await fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>HOD</span><span>/</span><span>Infrastructure</span><span>/</span><span className="text-foreground font-medium">Rooms & Layouts</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Rooms Registration Engine
                        </h1>
                        <p className="text-muted-foreground">
                            Define physical room boundaries for your assigned block: <strong>{assignedBlock || 'N/A'}</strong>.
                        </p>
                    </div>
                    {assignedBlock && (
                        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Add Rooms</Button>
                    )}
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : !assignedBlock ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Building2 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No block has been assigned to you by the Admin yet.</p>
                    </div>
                ) : selectedRoom ? (
                    <div className="bg-[#f0f2f5] p-6 lg:p-10 rounded-2xl w-full">
                        <div className="animate-fade-in space-y-4">
                            <Button variant="ghost" className="mb-2" onClick={() => setSelectedRoom(null)}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Rooms</Button>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-[#1a1c1e]"><DoorOpen className="w-5 h-5 text-primary" /> Room {selectedRoom.roomNumber} ({selectedRoom.roomType}) Layout</h2>
                            <ClassroomRenderer layout={selectedRoom} />
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#f0f2f5] p-6 lg:p-10 rounded-2xl w-full text-left">
                        <div className="animate-fade-in w-full">
                            <h2 className="text-2xl font-bold text-[#1a1c1e] mb-8">Rooms <span className="text-muted-foreground font-normal">/ {assignedBlock}</span></h2>
                            
                            {!myBlock ? (
                                <p className="text-muted-foreground">Block definition not found. Admin needs to register this block's structure.</p>
                            ) : (
                                <div className="space-y-6">
                                    {myBlock.floors?.map((floor: any, fIdx: number) => {
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
                                                                <button key={room.id} onClick={() => setSelectedRoom(room)} className="relative flex-shrink-0 w-24 h-24 bg-white rounded-xl shadow-sm border border-transparent hover:border-primary transition-all flex flex-col overflow-hidden group">
                                                                    <div className="flex-1 flex flex-col items-center justify-center text-[#1a1c1e] group-hover:scale-110 transition-transform w-full">
                                                                        <span className="text-xl font-bold">{room.roomNumber}</span>
                                                                        <span className="text-[10px] text-muted-foreground uppercase truncate w-full px-1">{room.roomType || 'ROOM'}</span>
                                                                    </div>
                                                                    <div className={`h-1.5 w-full ${badgeColor}`}></div>
                                                                    <div 
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }} 
                                                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all bg-white"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Add Rooms to {assignedBlock}</DialogTitle></DialogHeader>
                        
                        <Tabs defaultValue="manual" className="w-full mt-4" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="upload">Upload File (Excel)</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="manual" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Floor Number <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., 1, 2" value={formData.floorNumber} onChange={e => setFormData({ ...formData, floorNumber: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Room Number <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., 101, 102" value={formData.roomNumber} onChange={e => setFormData({ ...formData, roomNumber: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 col-span-2 sm:col-span-1">
                                        <Label>Room Type <span className="text-red-500">*</span></Label>
                                        <Select value={formData.roomType} onValueChange={(val) => setFormData({ ...formData, roomType: val })}>
                                            <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Classroom">Classroom</SelectItem>
                                                <SelectItem value="Lab">Lab</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Rows of Benches <span className="text-red-500">*</span></Label>
                                        <Input type="number" min="1" value={formData.rowsOfBenches} onChange={e => setFormData({ ...formData, rowsOfBenches: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Columns of Benches <span className="text-red-500">*</span></Label>
                                        <Input type="number" min="1" value={formData.columnsOfBenches} onChange={e => setFormData({ ...formData, columnsOfBenches: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Board Position</Label>
                                        <Select value={formData.boardPosition} onValueChange={(val) => setFormData({ ...formData, boardPosition: val })}>
                                            <SelectTrigger><SelectValue placeholder="Board Position" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="top">Top</SelectItem>
                                                <SelectItem value="bottom">Bottom</SelectItem>
                                                <SelectItem value="left">Left</SelectItem>
                                                <SelectItem value="right">Right</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Door Position</Label>
                                        <Select value={formData.doorPosition} onValueChange={(val) => setFormData({ ...formData, doorPosition: val })}>
                                            <SelectTrigger><SelectValue placeholder="Door Position" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="front">Front</SelectItem>
                                                <SelectItem value="back">Back</SelectItem>
                                                <SelectItem value="left">Left</SelectItem>
                                                <SelectItem value="right">Right</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                <DialogFooter className="mt-6">
                                    <Button variant="outline" onClick={() => setShowDialog(false)} disabled={submitLoading}>Cancel</Button>
                                    <Button onClick={handleCreateRoom} disabled={submitLoading}>
                                        {submitLoading ? 'Saving...' : 'Add Room Data'}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4 py-4">
                                <ExcelUpload 
                                    templateHeaders={['floorNumber', 'roomNumber', 'roomType', 'rowsOfBenches', 'columnsOfBenches', 'boardPosition', 'doorPosition']}
                                    templateName="classrooms_template.xlsx"
                                    schemaMapping={{
                                        'floorNumber': 'floorNumber',
                                        'roomNumber': 'roomNumber',
                                        'roomType': 'roomType',
                                        'rowsOfBenches': 'rowsOfBenches',
                                        'columnsOfBenches': 'columnsOfBenches',
                                        'boardPosition': 'boardPosition',
                                        'doorPosition': 'doorPosition'
                                    }}
                                    requiredFields={['floorNumber', 'roomNumber', 'rowsOfBenches', 'columnsOfBenches']}
                                    onDataParsed={setPreviewData}
                                    previewData={previewData}
                                    onUpload={handleBulkUpload}
                                    uploadLoading={uploadLoading}
                                    previewColumns={[
                                        { key: 'floorNumber', label: 'Floor #' },
                                        { key: 'roomNumber', label: 'Room #' },
                                        { key: 'roomType', label: 'Type' },
                                        { key: 'rowsOfBenches', label: 'Rows' },
                                        { key: 'columnsOfBenches', label: 'Cols' },
                                        { key: 'boardPosition', label: 'Board' },
                                        { key: 'doorPosition', label: 'Door' }
                                    ]}
                                />
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>
        </HODLayout>
    );
}
