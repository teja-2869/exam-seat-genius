import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Plus, Upload, Activity, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { generateTemplate, parseExcel, validateData } from '@/services/excelService';

export default function HODStudentUpload() {
    const { user, college } = useAuth();
    const hodObj = user as any;
    const institutionId = college?.id || hodObj?.institutionId;
    const branch = hodObj?.branch || '';

    const [activeTab, setActiveTab] = useState('upload');
    const [showDialog, setShowDialog] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);

    // Manual form
    const [formData, setFormData] = useState({
        name: '', rollNumber: '', gender: '', section: '',
        examType: 'Regular', status: 'Active', year: '1st Year',
        batchStartYear: new Date().getFullYear().toString(),
        batchEndYear: (new Date().getFullYear() + 4).toString()
    });

    // Multi-Year Upload
    type UploadBlock = { file: File | null; startYear: string; endYear: string; parsed: any[] };
    const [uploadBlocks, setUploadBlocks] = useState<Record<string, UploadBlock>>({
        '1st Year': { file: null, startYear: '', endYear: '', parsed: [] },
        '2nd Year': { file: null, startYear: '', endYear: '', parsed: [] },
        '3rd Year': { file: null, startYear: '', endYear: '', parsed: [] },
        '4th Year': { file: null, startYear: '', endYear: '', parsed: [] }
    });

    const resetForm = () => {
        setFormData({ name: '', rollNumber: '', gender: '', section: '', examType: 'Regular', status: 'Active', year: '1st Year', batchStartYear: new Date().getFullYear().toString(), batchEndYear: (new Date().getFullYear() + 4).toString() });
        setUploadBlocks({
            '1st Year': { file: null, startYear: '', endYear: '', parsed: [] },
            '2nd Year': { file: null, startYear: '', endYear: '', parsed: [] },
            '3rd Year': { file: null, startYear: '', endYear: '', parsed: [] },
            '4th Year': { file: null, startYear: '', endYear: '', parsed: [] }
        });
    };

    const fetchStudents = async () => {
        if (!institutionId || !branch) return;
        setBatchLoading(true);
        try {
            const q = query(collection(db, 'students'), where('institutionId', '==', institutionId), where('branch', '==', branch));
            const snap = await getDocs(q);
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        } catch (err) {
            console.error(err);
        } finally {
            setBatchLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, [user, college]);

    // === MANUAL ADD ===
    const handleCreateStudent = async () => {
        if (!formData.name || !formData.rollNumber || !formData.gender || !formData.section) {
            alert('Please fill in all required fields.'); return;
        }
        setSubmitLoading(true);
        try {
            const dupQuery = query(collection(db, 'students'), where('institutionId', '==', institutionId), where('rollNumber', '==', formData.rollNumber));
            const dupSnap = await getDocs(dupQuery);
            if (!dupSnap.empty) { alert('Roll Number already exists.'); setSubmitLoading(false); return; }

            await addDoc(collection(db, 'students'), {
                ...formData, branch, institutionId, createdAt: serverTimestamp()
            });
            alert('Student added successfully.');
            setShowDialog(false);
            resetForm();
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert('Failed to add student.');
        } finally {
            setSubmitLoading(false);
        }
    };

    // === FILE HANDLING ===
    const handleDownloadTemplate = () => {
        generateTemplate(['Name', 'Roll Number', 'Gender', 'Section', 'Exam Type', 'Status'], 'Student_Template.xlsx');
    };

    const handleFileChange = async (year: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { setUploadBlocks(prev => ({ ...prev, [year]: { ...prev[year], file: null, parsed: [] } })); return; }
        try {
            const rawData = await parseExcel(file);
            const validated = validateData(rawData, {
                'Name': 'name', 'Roll Number': 'rollNumber', 'Gender': 'gender',
                'Section': 'section', 'Exam Type': 'examType', 'Status': 'status'
            }, ['name', 'rollNumber', 'section']);
            if (validated.length === 0) { alert(`No valid rows found in ${year} upload.`); e.target.value = ''; return; }
            setUploadBlocks(prev => ({ ...prev, [year]: { ...prev[year], file, parsed: validated } }));
        } catch (err: any) {
            alert(err.message || `Failed to parse Excel file for ${year}.`);
            e.target.value = '';
        }
    };

    const handleBulkUploadAll = async () => {
        const activeUploads = Object.entries(uploadBlocks).filter(([_, data]) => data.file);
        if (activeUploads.length === 0) { alert('No files selected.'); return; }
        for (const [year, data] of activeUploads) {
            if (!data.startYear || !data.endYear) { alert(`Please enter both Start and End years for ${year}.`); return; }
        }
        setUploadLoading(true);
        try {
            const batch = writeBatch(db);
            let totalAdds = 0;
            const messages: string[] = [];
            for (const [year, data] of activeUploads) {
                let yearCount = 0;
                for (const row of data.parsed) {
                    const dupQuery = query(collection(db, 'students'), where('institutionId', '==', institutionId), where('rollNumber', '==', String(row.rollNumber)));
                    const dupSnap = await getDocs(dupQuery);
                    if (!dupSnap.empty) continue;
                    const newDocRef = doc(collection(db, 'students'));
                    batch.set(newDocRef, {
                        institutionId, branch, year,
                        name: row.name, rollNumber: String(row.rollNumber),
                        gender: row.gender || 'Unknown', section: row.section || '',
                        examType: row.examType || 'Regular', status: row.status || 'Active',
                        batchStartYear: data.startYear, batchEndYear: data.endYear,
                        createdAt: serverTimestamp()
                    });
                    totalAdds++; yearCount++;
                }
                if (yearCount > 0) messages.push(`${year}: ${yearCount} records uploaded.`);
            }
            if (totalAdds > 0) {
                await batch.commit();
                alert(messages.join('\n'));
            } else {
                alert('No valid rows or all Roll Numbers were duplicates.');
            }
            setShowDialog(false);
            resetForm();
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert('Failed to execute bulk upload.');
        } finally {
            setUploadLoading(false);
        }
    };

    // === BATCH MANAGEMENT ===
    const uniqueBatches = Array.from(new Set(students.map(s => JSON.stringify({
        batchStartYear: s.batchStartYear || 'Unknown',
        batchEndYear: s.batchEndYear || 'Unknown',
        year: s.year || '1st Year'
    }))))
    .map(str => JSON.parse(str))
    .filter(b => b.batchStartYear !== 'Unknown')
    .sort((a, b) => Number(a.batchStartYear) - Number(b.batchStartYear));

    const performBatchOperation = async (startY: string, endY: string, operation: 'promote' | 'remove') => {
        if (!window.confirm(`Are you sure you want to ${operation} this batch (${startY}-${endY})?`)) return;
        setBatchLoading(true);
        try {
            const bQuery = query(collection(db, 'students'),
                where('institutionId', '==', institutionId),
                where('branch', '==', branch),
                where('batchStartYear', '==', startY),
                where('batchEndYear', '==', endY)
            );
            const snap = await getDocs(bQuery);
            const batch = writeBatch(db);
            const yearMap: Record<string, string> = {
                '1st Year': '2nd Year', '2nd Year': '3rd Year',
                '3rd Year': '4th Year', '4th Year': 'Graduated'
            };
            snap.docs.forEach(docSnap => {
                if (operation === 'promote') {
                    const currY = docSnap.data().year || '1st Year';
                    batch.update(docSnap.ref, { year: yearMap[currY] || currY });
                } else {
                    batch.delete(docSnap.ref);
                }
            });
            if (snap.docs.length > 0) {
                await batch.commit();
                alert(`Batch '${operation}' completed for ${snap.docs.length} students.`);
                await fetchStudents();
            } else {
                alert('No students found for this batch.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to perform batch operation.');
        } finally {
            setBatchLoading(false);
        }
    };

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Upload Students</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Student Upload & Batch Management
                        </h1>
                        <p className="text-muted-foreground">
                            Upload student cohorts and manage academic batches for <strong>{branch || 'Unknown Department'}</strong>.
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                    <TabsList className="grid w-full sm:w-1/2 grid-cols-2">
                        <TabsTrigger value="upload">Student Upload</TabsTrigger>
                        <TabsTrigger value="batches">Batch Management</TabsTrigger>
                    </TabsList>

                    {/* UPLOAD TAB */}
                    <TabsContent value="upload" className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border shadow-sm gap-4">
                            <Label className="text-gray-700 font-semibold whitespace-nowrap">Global Master Roster</Label>
                            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" /> Cohort Add / Upload
                            </Button>
                        </div>

                        <div className="text-center py-12 text-muted-foreground bg-white border rounded-xl shadow-sm">
                            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold text-gray-700">Upload Student Data</h3>
                            <p className="text-sm mt-1">Use the button above to add students manually or upload Excel files for all 4 years.</p>
                            <p className="text-xs mt-2 text-muted-foreground">Total students in branch: <strong>{students.length}</strong></p>
                        </div>
                    </TabsContent>

                    {/* BATCH MANAGEMENT TAB */}
                    <TabsContent value="batches" className="space-y-8">
                        <Card className="border-none shadow-sm bg-muted/20">
                            <CardHeader>
                                <CardTitle>Branch Cohort Lifecycle</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-8">
                                    Manage student batches for <strong>{branch}</strong>. Promote cohorts through academic years or remove passed-out batches.
                                </p>
                                {batchLoading ? (
                                    <div className="h-40 flex items-center justify-center"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                                ) : uniqueBatches.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground bg-white rounded-xl border">
                                        No batch cohorts found. Upload student data first.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {uniqueBatches.map((batch: any, i: number) => (
                                            <Card key={i} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                                                <CardContent className="p-6">
                                                    <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">{batch.year}</Badge>
                                                    <h3 className="text-xl font-bold mb-1">{batch.batchStartYear} - {batch.batchEndYear}</h3>
                                                    <p className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">{branch} Cohort</p>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                                                            onClick={() => performBatchOperation(batch.batchStartYear, batch.batchEndYear, 'promote')}
                                                            disabled={batchLoading}
                                                        >
                                                            Promote Yr
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                                            onClick={() => performBatchOperation(batch.batchStartYear, batch.batchEndYear, 'remove')}
                                                            disabled={batchLoading}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" /> Clear
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ADD STUDENT DIALOG */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Register Students</DialogTitle></DialogHeader>
                        <Tabs defaultValue="manual" className="w-full mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="file">Upload File (Excel)</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Full Name <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., Ravi Kumar" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Roll Number <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., 23BFA33001" value={formData.rollNumber} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Student Year <span className="text-red-500">*</span></Label>
                                        <Select value={formData.year} onValueChange={(val) => setFormData({ ...formData, year: val })}>
                                            <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1st Year">1st Year</SelectItem>
                                                <SelectItem value="2nd Year">2nd Year</SelectItem>
                                                <SelectItem value="3rd Year">3rd Year</SelectItem>
                                                <SelectItem value="4th Year">4th Year</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Gender <span className="text-red-500">*</span></Label>
                                        <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                                            <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Section <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., A, B, C" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Batch Start Year <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., 2023" value={formData.batchStartYear} onChange={e => setFormData({ ...formData, batchStartYear: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Batch End Year <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., 2027" value={formData.batchEndYear} onChange={e => setFormData({ ...formData, batchEndYear: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Exam Type</Label>
                                        <Select value={formData.examType} onValueChange={(val) => setFormData({ ...formData, examType: val })}>
                                            <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Regular">Regular</SelectItem>
                                                <SelectItem value="Supplementary">Supplementary</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Active">Active</SelectItem>
                                                <SelectItem value="Inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button variant="outline" onClick={() => setShowDialog(false)} disabled={submitLoading}>Cancel</Button>
                                    <Button onClick={handleCreateStudent} disabled={submitLoading}>
                                        {submitLoading ? 'Saving...' : 'Register Student'}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>

                            <TabsContent value="file" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold">Bulk Institutional Matrix</h3>
                                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>Download Template</Button>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">Attach datasets for each active year cohort. Empty files are safely ignored.</p>
                                <div className="space-y-6">
                                    {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => (
                                        <div key={yr} className={`p-4 border-2 border-dashed rounded-xl ${uploadBlocks[yr].file ? 'border-green-300 bg-green-50/20' : 'border-gray-200 bg-muted/10'}`}>
                                            <h4 className="font-bold flex items-center gap-2 mb-3">
                                                {yr === '1st Year' ? '📘' : yr === '2nd Year' ? '📗' : yr === '3rd Year' ? '📙' : '📕'} {yr} Upload
                                            </h4>
                                            <Input type="file" accept=".xlsx, .xls" className="mb-4 bg-white cursor-pointer" onChange={(e) => handleFileChange(yr, e)} disabled={uploadLoading} />
                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Batch Start Year</Label>
                                                    <Input placeholder="e.g. 2022" value={uploadBlocks[yr].startYear} onChange={e => setUploadBlocks(prev => ({ ...prev, [yr]: { ...prev[yr], startYear: e.target.value } }))} disabled={uploadLoading} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Batch End Year</Label>
                                                    <Input placeholder="e.g. 2026" value={uploadBlocks[yr].endYear} onChange={e => setUploadBlocks(prev => ({ ...prev, [yr]: { ...prev[yr], endYear: e.target.value } }))} disabled={uploadLoading} />
                                                </div>
                                            </div>
                                            {uploadBlocks[yr].parsed.length > 0 && (
                                                <div className="mt-3 text-sm text-green-700 font-medium">✓ {uploadBlocks[yr].parsed.length} valid records parsed</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <hr className="my-6" />
                                <Button onClick={handleBulkUploadAll} disabled={uploadLoading} className="w-full h-12 text-lg font-semibold shadow-sm">
                                    {uploadLoading ? 'Uploading Sequences...' : 'Upload All Cohort Data'}
                                </Button>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>
        </HODLayout>
    );
}
