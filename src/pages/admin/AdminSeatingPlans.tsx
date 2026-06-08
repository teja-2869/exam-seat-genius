import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ClipboardList, LayoutGrid, Download, Filter, Search, ChevronRight, Activity, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';

export default function AdminSeatingPlans() {
    const { user, college } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [seatingPlans, setSeatingPlans] = useState<any[]>([]);
    
    // Filters
    const [selectedExamId, setSelectedExamId] = useState<string>('All');
    const [selectedBlock, setSelectedBlock] = useState<string>('All');
    
    // UI State
    const [loadingExams, setLoadingExams] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
    const [isGridModalOpen, setIsGridModalOpen] = useState(false);

    const institutionId = college?.id || (user as any)?.institutionId;

    // Fetch Exams first
    useEffect(() => {
        if (!institutionId) return;
        setLoadingExams(true);
        const q = query(collection(db, 'exams'), where('institutionId', '==', institutionId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            // Client sort
            fetched.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            setExams(fetched);
            if (fetched.length > 0 && selectedExamId === 'All') {
                setSelectedExamId(fetched[0].id);
            }
            setLoadingExams(false);
        }, (err) => {
            console.error("Error fetching exams:", err);
            setLoadingExams(false);
        });
        return () => unsubscribe();
    }, [institutionId]);

    // Fetch seatingPlans when Exam is selected
    useEffect(() => {
        if (!institutionId || selectedExamId === 'All') {
            setSeatingPlans([]);
            return;
        }

        setLoadingPlans(true);
        const fetchPlans = async () => {
            try {
                const q = query(
                    collection(db, 'seatingPlans'),
                    where('institutionId', '==', institutionId),
                    where('examId', '==', selectedExamId)
                );
                const snapshot = await getDocs(q);
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSeatingPlans(fetched);
            } catch (err) {
                console.error("Failed to load seating plans:", err);
            } finally {
                setLoadingPlans(false);
            }
        };

        fetchPlans();
    }, [institutionId, selectedExamId]);

    const activeExam = exams.find(e => e.id === selectedExamId);
    
    // Derived valid blocks for the currently loaded seating plans
    const availableBlocks = Array.from(new Set(seatingPlans.map(p => p.blockNumber))).sort();

    const filteredPlans = seatingPlans.filter(plan => {
        if (selectedBlock !== 'All' && plan.blockNumber !== selectedBlock) return false;
        return true;
    });

    // Render Logic for the Graphic Engine Grid
    const handleViewGrid = (plan: any) => {
        setSelectedRoom(plan);
        setIsGridModalOpen(true);
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Seating Plans</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                            Seating Arrangement Viewer
                        </h1>
                        <p className="text-muted-foreground">
                            Browse deployed AI seating map matrices graphically. Export parameters natively.
                        </p>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row flex-wrap gap-4 items-center bg-muted/20 rounded-xl">
                        <div className="w-full sm:w-auto min-w-[300px]">
                            <Select value={selectedExamId} onValueChange={(val) => { setSelectedExamId(val); setSelectedBlock('All'); }}>
                                <SelectTrigger className="bg-white">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><SelectValue placeholder="Select Academic Exam..." /></div>
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingExams ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                                    ) : exams.length === 0 ? (
                                        <SelectItem value="All" disabled>No Exams Found</SelectItem>
                                    ) : (
                                        exams.map(e => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.examName} ({e.date})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="w-full sm:w-auto min-w-[200px]">
                            <Select value={selectedBlock} onValueChange={setSelectedBlock} disabled={!seatingPlans.length}>
                                <SelectTrigger className="bg-white">
                                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><SelectValue placeholder="All Blocks" /></div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Blocks</SelectItem>
                                    {availableBlocks.map((b: any) => (
                                        <SelectItem key={b} value={b}>Block {b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="ml-auto w-full sm:w-auto">
                            <Button variant="outline" className="w-full sm:w-auto" disabled={filteredPlans.length === 0} onClick={() => alert("Export functionality initiates layout processing... (Coming Soon)")}>
                                <Download className="w-4 h-4 mr-2" />
                                Export as PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                {selectedExamId === 'All' ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-white shadow-sm">
                        <ClipboardList className="w-12 h-12 mb-4 opacity-50 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700">No Exam Selected</h3>
                        <p className="text-sm mt-1">Please select an exam from the dropdown to continue.</p>
                    </div>
                ) : loadingPlans ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl shadow-sm bg-white gap-4">
                        <Activity className="animate-spin text-primary w-8 h-8" />
                        <p className="text-sm text-muted-foreground">Pulling mapped matrices from Cloud...</p>
                    </div>
                ) : seatingPlans.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-white shadow-sm p-4 text-center">
                        <LayoutGrid className="w-12 h-12 mb-4 opacity-50 text-amber-500" />
                        <h3 className="text-lg font-semibold text-gray-800">No Layouts Generated</h3>
                        <p className="text-sm mt-2 max-w-lg text-gray-500">
                            The seating plan for <strong>{activeExam?.examName}</strong> hasn't been mapped yet. 
                            Ensure the background AI worker completes its layout execution.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlans.map(plan => {
                            // Calculate occupied / total dynamically
                            let occupied = 0;
                            let totalSeats = 0;
                            (plan.seatingMatrix || []).forEach((row: any[]) => {
                                row.forEach((bench: any) => {
                                    if (!bench) return;
                                    totalSeats += 2;
                                    if (bench.seat1?.rollNumber) occupied++;
                                    if (bench.seat2?.rollNumber) occupied++;
                                });
                            });

                            return (
                                <Card key={plan.id} className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group" onClick={() => handleViewGrid(plan)}>
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl">Room {plan.roomId || 'Unknown'}</CardTitle>
                                            <CardDescription className="mt-1">Block {plan.blockNumber} • Floor {plan.floorNumber}</CardDescription>
                                        </div>
                                        <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <LayoutGrid className="w-5 h-5" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between mt-4 border-t pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Occupancy Map</span>
                                                <span className="text-base font-bold text-gray-900 mt-0.5">
                                                    {occupied} <span className="text-sm font-normal text-muted-foreground">/ {totalSeats}</span>
                                                </span>
                                            </div>
                                            <Badge variant={occupied === totalSeats ? "secondary" : "outline"} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                                                {occupied === totalSeats ? 'Fully Booked' : 'Partially Mapped'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SEATING GRID RENDERER MODAL */}
            <Dialog open={isGridModalOpen} onOpenChange={setIsGridModalOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle className="text-2xl font-display">
                            Room {selectedRoom?.roomId} Layout
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {activeExam?.examName} • Block {selectedRoom?.blockNumber} • Floor {selectedRoom?.floorNumber}
                        </p>
                    </DialogHeader>
                    
                    <div className="overflow-auto p-6 flex-1 bg-gray-50 custom-scrollbar">
                        <div className="min-w-max mx-auto space-y-4">
                            {/* Rendering visual Matrix directly matching requirements */}
                            {selectedRoom?.seatingMatrix?.map((row: any[], rowIndex: number) => (
                                <div key={rowIndex} className="flex gap-4">
                                    {/* Row Label */}
                                    <div className="flex items-center justify-center w-8 text-sm font-bold text-gray-400 bg-white border rounded-md shadow-sm">
                                        R{rowIndex + 1}
                                    </div>
                                    
                                    {/* Bench Sets */}
                                    {row.map((bench: any, colIndex: number) => (
                                        <div key={colIndex} className="relative flex gap-1 p-2 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                                            
                                            {/* Column Marker Above Bench (Only render on first row for visual cleanliness) */}
                                            {rowIndex === 0 && (
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400">
                                                    C{colIndex + 1}
                                                </div>
                                            )}

                                            {/* SEAT 1 */}
                                            <div className={`w-28 h-16 rounded-md flex items-center justify-center text-sm font-medium border shadow-sm transition-colors
                                                ${bench?.seat1?.rollNumber 
                                                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900 shadow-yellow-100/50' 
                                                    : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                            >
                                                {bench?.seat1?.rollNumber || 'Empty'}
                                            </div>
                                            
                                            {/* SEAT 2 */}
                                            <div className={`w-28 h-16 rounded-md flex items-center justify-center text-sm font-medium border shadow-sm transition-colors
                                                ${bench?.seat2?.rollNumber 
                                                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900 shadow-yellow-100/50' 
                                                    : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                            >
                                                {bench?.seat2?.rollNumber || 'Empty'}
                                            </div>
                                            
                                        </div>
                                    ))}
                                </div>
                            ))}
                            
                            {/* Empty State Fallback if Matrix array is malformed but exists */}
                            {(!selectedRoom?.seatingMatrix || selectedRoom.seatingMatrix.length === 0) && (
                                <div className="text-center p-8 text-muted-foreground bg-white border rounded-xl">
                                    Corrupted layout payload. Standard matrix bounds not resolvable.
                                </div>
                            )}
                            
                            {/* Marker Key */}
                            <div className="flex items-center justify-center gap-6 mt-8 p-4 bg-white border rounded-xl sticky left-4 w-fit mx-auto shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                                    <span className="text-sm font-medium text-gray-700">Allocated Seat</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                                    <span className="text-sm font-medium text-gray-700">Empty Parameter</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 flex gap-0.5"><div className="w-full h-1 border-t-2 border-dashed border-gray-300"></div></div>
                                    <span className="text-sm font-medium text-gray-700">Bench Unit Boundary</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
