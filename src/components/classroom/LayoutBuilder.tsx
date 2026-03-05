import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Classroom, BenchStructure } from '@/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Save, LayoutGrid, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const LayoutBuilder: React.FC = () => {
    const { user, college } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        floorNumber: '',
        roomNumber: '',
        rows: 5,
        columns: 4,
        boardPosition: 'top' as 'top' | 'bottom' | 'left' | 'right',
        doorPosition: 'front' as 'front' | 'back' | 'left' | 'right',
    });

    const handleCreate = async () => {
        if (!formData.floorNumber || !formData.roomNumber) {
            toast({ title: 'Missing Information', description: 'Floor and Room Number are required.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const institutionId = (user as any)?.institutionId || (user as any)?.collegeId || college?.id;
            if (!institutionId) throw new Error("Institution ID is missing");

            const benchStructure: BenchStructure[] = [];
            for (let r = 0; r < formData.rows; r++) {
                for (let c = 0; c < formData.columns; c++) {
                    benchStructure.push({
                        row: r,
                        column: c,
                        seatLeft: { seatId: `${formData.roomNumber}-R${r}C${c}-L` },
                        seatRight: { seatId: `${formData.roomNumber}-R${r}C${c}-R` }
                    });
                }
            }

            const newClassroom: Omit<Classroom, 'id'> = {
                institutionId,
                branch: user?.branchId || '',
                floorNumber: formData.floorNumber,
                roomNumber: formData.roomNumber,
                rows: formData.rows,
                columns: formData.columns,
                boardPosition: formData.boardPosition,
                doorPosition: formData.doorPosition,
                benchStructure,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'classrooms'), newClassroom);
            toast({ title: 'Classroom Saved', description: 'Layout created and stored successfully.' });

            // Reset
            setFormData(prev => ({ ...prev, roomNumber: '' }));
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error Saving Layout', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="dashboard-card border-none shadow-sm animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-panel-hod/10 rounded-bl-full translate-x-8 -translate-y-8" />
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-panel-hod/10 rounded-xl">
                        <LayoutGrid className="w-5 h-5 text-panel-hod" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-display font-bold">Classroom Layout Builder</CardTitle>
                        <CardDescription>Design structural seating configurations.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Room Number</Label>
                        <Input
                            placeholder="e.g., 101"
                            value={formData.roomNumber}
                            onChange={(e) => setFormData(p => ({ ...p, roomNumber: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Floor Number</Label>
                        <Input
                            placeholder="e.g., 1 or Ground"
                            value={formData.floorNumber}
                            onChange={(e) => setFormData(p => ({ ...p, floorNumber: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Rows</Label>
                        <Input
                            type="number" min={1} max={20}
                            value={formData.rows}
                            onChange={(e) => setFormData(p => ({ ...p, rows: parseInt(e.target.value) || 1 }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Columns</Label>
                        <Input
                            type="number" min={1} max={20}
                            value={formData.columns}
                            onChange={(e) => setFormData(p => ({ ...p, columns: parseInt(e.target.value) || 1 }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Board Position</Label>
                        <Select
                            value={formData.boardPosition}
                            onValueChange={(v: 'top' | 'bottom' | 'left' | 'right') => setFormData(p => ({ ...p, boardPosition: v }))}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="top">Front / Top</SelectItem>
                                <SelectItem value="bottom">Back / Bottom</SelectItem>
                                <SelectItem value="left">Left Wall</SelectItem>
                                <SelectItem value="right">Right Wall</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Door Position</Label>
                        <Select
                            value={formData.doorPosition}
                            onValueChange={(v: 'front' | 'back' | 'left' | 'right') => setFormData(p => ({ ...p, doorPosition: v }))}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="front">Front Near Board</SelectItem>
                                <SelectItem value="back">Back of Class</SelectItem>
                                <SelectItem value="left">Left Wall</SelectItem>
                                <SelectItem value="right">Right Wall</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={handleCreate} disabled={loading} className="w-full bg-panel-hod hover:bg-panel-hod/90 text-white">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Classroom Layout
                </Button>
            </CardContent>
        </Card>
    );
};
