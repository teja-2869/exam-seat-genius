import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import {
    Plus, Trash2, Edit, Activity, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { generateTemplate, parseExcel, validateData } from '@/services/excelService';

export default function HODStudentList() {
    const { user, college } = useAuth();
    const hodObj = user as any;
    const institutionId = college?.id || hodObj?.institutionId;
    const branch = hodObj?.branch || '';

    const [studentList, setStudentList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // UI State
    const [showDialog, setShowDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    
    // Multi-Year Upload State
    type UploadBlock = { file: File | null; startYear: string; endYear: string; parsed: any[] };
    const [uploadBlocks, setUploadBlocks] = useState<Record<string, UploadBlock>>({
        '1st Year': { file: null, startYear: '', endYear: '', parsed: [] },
        '2nd Year': { file: null, startYear: '', endYear: '', parsed: [] },
        '3rd Year': { file: null, startYear: '', endYear: '', parsed: [] },
        '4th Year': { file: null, startYear: '', endYear: '', parsed: [] }
    });
    
    // Editing State
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        rollNumber: '',
        gender: '',
        section: '',
        examType: 'Regular',
        status: 'Active',
        year: '1st Year',
        batchStartYear: new Date().getFullYear().toString(),
        batchEndYear: (new Date().getFullYear() + 4).toString()
    });

    const resetForm = () => {
        setFormData({ name: '', rollNumber: '', gender: '', section: '', examType: 'Regular', status: 'Active', year: '1st Year', batchStartYear: new Date().getFullYear().toString(), batchEndYear: (new Date().getFullYear() + 4).toString() });
        setSelectedStudentId(null);
        setUploadBlocks({
            '1st Year': { file: null, startYear: '', endYear: '', parsed: [] },
            '2nd Year': { file: null, startYear: '', endYear: '', parsed: [] },
            '3rd Year': { file: null, startYear: '', endYear: '', parsed: [] },
            '4th Year': { file: null, startYear: '', endYear: '', parsed: [] }
        });
    };

    const fetchStudents = async () => {
        if (!institutionId || !branch) {
            setStudentList([]);
            return;
        }
        setLoading(true);
        try {
            const q = query(
                collection(db, "students"),
                where("institutionId", "==", institutionId),
                where("branch", "==", branch)
            );
            const snap = await getDocs(q);
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            fetched.sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }));
            setStudentList(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [user, college]);

    const handleCreateStudent = async () => {
        if (!formData.name || !formData.rollNumber || !formData.gender || !formData.section) {
            alert("Please fill in all required fields.");
            return;
        }

        setSubmitLoading(true);
        try {
            // Duplicate Check
            const dupQuery = query(collection(db, 'students'), 
                where('institutionId', '==', institutionId), 
                where('rollNumber', '==', formData.rollNumber)
            );
            const dupSnap = await getDocs(dupQuery);
            if (!dupSnap.empty) {
                alert("Roll Number already exists.");
                setSubmitLoading(false);
                return;
            }

            await addDoc(collection(db, "students"), {
                ...formData,
                branch,
                institutionId,
                createdAt: serverTimestamp()
            });

            alert("Student added successfully.");
            setShowDialog(false);
            resetForm();
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert("Failed to add student.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditStudent = async () => {
        if (!selectedStudentId) return;
        setSubmitLoading(true);
        try {
            const docRef = doc(db, 'students', selectedStudentId);
            await updateDoc(docRef, { ...formData });
            alert("Student details updated.");
            setShowEditDialog(false);
            resetForm();
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert("Failed to update student.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this student?")) return;
        try {
            await deleteDoc(doc(db, "students", id));
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert("Failed to delete student.");
        }
    };

    const openEdit = (student: any) => {
        setFormData({
            name: student.name || '',
            rollNumber: student.rollNumber || '',
            gender: student.gender || '',
            section: student.section || '',
            examType: student.examType || 'Regular',
            status: student.status || 'Active',
            year: student.year || '1st Year',
            batchStartYear: student.batchStartYear || '',
            batchEndYear: student.batchEndYear || ''
        });
        setSelectedStudentId(student.id);
        setShowEditDialog(true);
    };

    const handleDownloadTemplate = () => {
        generateTemplate(['Name', 'Roll Number', 'Gender', 'Section', 'Exam Type', 'Status'], 'Student_Template.xlsx');
    };

    const handleFileChange = async (year: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setUploadBlocks(prev => ({ ...prev, [year]: { ...prev[year], file: null, parsed: [] } }));
            return;
        }
        try {
            const rawData = await parseExcel(file);
            const validated = validateData(rawData, {
                'Name': 'name',
                'Roll Number': 'rollNumber',
                'Gender': 'gender',
                'Section': 'section',
                'Exam Type': 'examType',
                'Status': 'status'
            }, ['name', 'rollNumber', 'section']);
            
            if (validated.length === 0) {
                alert(`No valid rows found in ${year} upload. Please check the template format.`);
                e.target.value = '';
                return;
            }
            
            setUploadBlocks(prev => ({
                ...prev,
                [year]: { ...prev[year], file, parsed: validated }
            }));
        } catch (err: any) {
            alert(err.message || `Failed to parse Excel file for ${year}.`);
            e.target.value = '';
        }
    };

    const handleBulkUploadAll = async () => {
        const activeUploads = Object.entries(uploadBlocks).filter(([_, data]) => data.file);
        if (activeUploads.length === 0) {
            alert("No files selected. Please upload at least one year's data.");
            return;
        }

        // Validate start/end years for selected files
        for (const [year, data] of activeUploads) {
            if (!data.startYear || !data.endYear) {
                alert(`Please enter both Start and End years for the ${year} upload.`);
                return;
            }
        }

        setUploadLoading(true);

        try {
            const batch = writeBatch(db);
            let totalAdds = 0;
            const messages: string[] = [];
            
            for (const [year, data] of activeUploads) {
                let yearCount = 0;
                for (const row of data.parsed) {
                    const dupQuery = query(collection(db, 'students'), 
                        where('institutionId', '==', institutionId), 
                        where('rollNumber', '==', String(row.rollNumber))
                    );
                    const dupSnap = await getDocs(dupQuery);
                    if (!dupSnap.empty) continue; 
    
                    const newDocRef = doc(collection(db, 'students'));
                    batch.set(newDocRef, {
                        institutionId,
                        branch,
                        year: year,
                        name: row.name,
                        rollNumber: String(row.rollNumber),
                        gender: row.gender || 'Unknown',
                        section: row.section || '',
                        examType: row.examType || 'Regular',
                        status: row.status || 'Active',
                        batchStartYear: data.startYear,
                        batchEndYear: data.endYear,
                        createdAt: serverTimestamp()
                    });
                    totalAdds++;
                    yearCount++;
                }
                if (yearCount > 0) messages.push(`${year} uploaded successfully (${yearCount} records).`);
            }

            if (totalAdds > 0) {
                await batch.commit();
                alert(messages.join('\n'));
            } else {
                alert('No valid rows or all Roll Numbers were duplicates across files.');
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

    const getGenderColor = (gender: string) => {
        const lower = (gender || '').trim().toLowerCase();
        if (lower === 'female') return 'bg-[#10B981] text-white border-none';
        if (lower === 'male') return 'bg-[#F43F5E] text-white border-none';
        return 'bg-[#F59E0B] text-white border-none';
    };

    const handleOpenDialog = () => {
        resetForm();
        setShowDialog(true);
    };

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Student Registry</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Student Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage department students for <strong>{branch || 'Unknown Department'}</strong>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border shadow-sm gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Label className="text-gray-700 font-semibold whitespace-nowrap">Global Master Roster</Label>
                    </div>
                    <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Cohort Add / Upload
                    </Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : studentList.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-white shadow-sm">
                        <Users className="w-12 h-12 mb-4 opacity-50 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700">No Students Registered</h3>
                        <p className="text-sm mt-1">Upload cohort sheets or add manually to build your roster.</p>
                        <Button variant="outline" className="mt-6" onClick={handleOpenDialog}>Add Student Data Now</Button>
                    </div>
                ) : (
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 border-b text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Student Name</th>
                                        <th className="px-6 py-4">Roll Number</th>
                                        <th className="px-6 py-4">Year</th>
                                        <th className="px-6 py-4">Gender</th>
                                        <th className="px-6 py-4">Section</th>
                                        <th className="px-6 py-4">Exam Type</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {studentList.map((student) => (
                                        <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-500">
                                                {student.rollNumber}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getGenderColor(student.gender)}`}>
                                                    {student.gender || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-700">
                                                {student.section}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {student.examType || 'Regular'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${student.status === 'Active' ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                                                    {student.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(student)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ADD STUDENT DIALOG */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Register Students</DialogTitle></DialogHeader>
                        
                        <Tabs defaultValue="manual" className="w-full mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="upload">Upload File (Excel)</TabsTrigger>
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

                            <TabsContent value="upload" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold">Bulk Institutional Matrix</h3>
                                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                                        Download Template
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">Attach relevant datasets uniquely for each active year cohort. Empty files are safely ignored.</p>
                                
                                <div className="space-y-6">
                                    {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => (
                                        <div key={yr} className={`p-4 border-2 border-dashed rounded-xl ${uploadBlocks[yr].file ? 'border-green-300 bg-green-50/20' : 'border-gray-200 bg-muted/10'}`}>
                                            <h4 className="font-bold flex items-center gap-2 mb-3">
                                                {yr === '1st Year' ? '📘' : yr === '2nd Year' ? '📗' : yr === '3rd Year' ? '📙' : '📕'} 
                                                {yr} Upload
                                            </h4>
                                            
                                            <Input 
                                                type="file" 
                                                accept=".xlsx, .xls" 
                                                className="mb-4 bg-white cursor-pointer" 
                                                onChange={(e) => handleFileChange(yr, e)} 
                                                disabled={uploadLoading} 
                                            />
                                            
                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Batch Start Year</Label>
                                                    <Input 
                                                        placeholder="e.g. 2022" 
                                                        value={uploadBlocks[yr].startYear} 
                                                        onChange={e => setUploadBlocks(prev => ({ ...prev, [yr]: { ...prev[yr], startYear: e.target.value } }))} 
                                                        disabled={uploadLoading}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Batch End Year</Label>
                                                    <Input 
                                                        placeholder="e.g. 2026" 
                                                        value={uploadBlocks[yr].endYear} 
                                                        onChange={e => setUploadBlocks(prev => ({ ...prev, [yr]: { ...prev[yr], endYear: e.target.value } }))}
                                                        disabled={uploadLoading} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            {uploadBlocks[yr].parsed.length > 0 && (
                                                <div className="mt-3 text-sm text-green-700 font-medium">
                                                    ✓ {uploadBlocks[yr].parsed.length} valid records parsed
                                                </div>
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

                {/* EDIT STUDENT DIALOG */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Edit Student Details</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Roll Number</Label>
                                <Input disabled value={formData.rollNumber} className="bg-muted text-muted-foreground" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                                        <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Section</Label>
                                    <Input value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} />
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitLoading}>Cancel</Button>
                            <Button onClick={handleEditStudent} disabled={submitLoading}>
                                {submitLoading ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </HODLayout>
    );
}
