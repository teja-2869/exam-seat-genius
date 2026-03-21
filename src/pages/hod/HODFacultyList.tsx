import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import {
    Plus, Trash2, Edit, Upload, Download, Activity, UserCheck, Search, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ExcelUpload } from '@/components/ui/ExcelUpload';

export default function HODFacultyList() {
    const { user, college } = useAuth();
    const hodObj = user as any;
    const institutionId = college?.id || hodObj?.institutionId;
    const branch = hodObj?.branch || '';
    const assignedBlock = hodObj?.assignedBlock || '';

    const [facultyList, setFacultyList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [showDialog, setShowDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('manual');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    
    // Editing State
    const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        facultyId: '',
        gender: '',
        email: '',
        phone: '',
        status: 'Active'
    });

    const resetForm = () => {
        setFormData({ name: '', facultyId: '', gender: '', email: '', phone: '', status: 'Active' });
        setSelectedFacultyId(null);
    };

    const fetchFaculty = async () => {
        if (!institutionId || !branch) {
            setLoading(false);
            return;
        }
        try {
            const q = query(
                collection(db, "faculty"),
                where("institutionId", "==", institutionId),
                where("branch", "==", branch)
            );
            const snap = await getDocs(q);
            const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            sorted.sort((a: any, b: any) => String(a.facultyId).localeCompare(String(b.facultyId), undefined, { numeric: true }));
            setFacultyList(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaculty();
    }, [user, college]);

    const handleCreateFaculty = async () => {
        if (!formData.name || !formData.facultyId || !formData.email || !formData.gender) {
            alert("Please fill in all required fields.");
            return;
        }

        setSubmitLoading(true);
        try {
            // Duplicate Check
            const dupQuery = query(collection(db, 'faculty'), 
                where('institutionId', '==', institutionId), 
                where('facultyId', '==', formData.facultyId)
            );
            const dupSnap = await getDocs(dupQuery);
            if (!dupSnap.empty) {
                alert("Faculty ID already exists.");
                setSubmitLoading(false);
                return;
            }

            await addDoc(collection(db, "faculty"), {
                ...formData,
                branch,
                institutionId,
                assignedBlock,
                availability: true, // Auto-default to strictly available
                createdAt: serverTimestamp()
            });

            alert("Faculty member added successfully.");
            setShowDialog(false);
            resetForm();
            await fetchFaculty();
        } catch (err) {
            console.error(err);
            alert("Failed to add faculty.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditFaculty = async () => {
        if (!selectedFacultyId) return;
        setSubmitLoading(true);
        try {
            const docRef = doc(db, 'faculty', selectedFacultyId);
            await updateDoc(docRef, { ...formData });
            alert("Faculty details updated.");
            setShowEditDialog(false);
            resetForm();
            await fetchFaculty();
        } catch (err) {
            console.error(err);
            alert("Failed to update faculty.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteFaculty = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this faculty member?")) return;
        try {
            await deleteDoc(doc(db, "faculty", id));
            await fetchFaculty();
        } catch (err) {
            console.error(err);
            alert("Failed to delete faculty.");
        }
    };

    const toggleAvailability = async (id: string, currentVal: boolean) => {
        try {
            await updateDoc(doc(db, "faculty", id), {
                availability: !currentVal
            });
            await fetchFaculty();
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (faculty: any) => {
        setFormData({
            name: faculty.name || '',
            facultyId: faculty.facultyId || '',
            gender: faculty.gender || '',
            email: faculty.email || '',
            phone: faculty.phone || '',
            status: faculty.status || 'Active'
        });
        setSelectedFacultyId(faculty.id);
        setShowEditDialog(true);
    };

    // EXCEL BULK UPLOAD PIPELINE
    // Replaced by generic ExcelUpload component

    const handleBulkUpload = async () => {
        if (previewData.length === 0) return;
        setUploadLoading(true);

        try {
            const batch = writeBatch(db);
            let validAdds = 0;
            
            for (const row of previewData) {
                const dupQuery = query(collection(db, 'faculty'), 
                    where('institutionId', '==', institutionId), 
                    where('facultyId', '==', String(row.facultyId))
                );
                const dupSnap = await getDocs(dupQuery);
                if (!dupSnap.empty) continue; 

                const newDocRef = doc(collection(db, 'faculty'));
                batch.set(newDocRef, {
                    institutionId,
                    branch,
                    assignedBlock,
                    name: row.name,
                    facultyId: String(row.facultyId),
                    gender: row.gender || 'Unknown',
                    email: row.email,
                    phone: row.phone || '',
                    status: row.status || 'Active',
                    availability: true,
                    createdAt: serverTimestamp()
                });
                validAdds++;
            }

            if (validAdds > 0) {
                await batch.commit();
                alert(`Successfully added ${validAdds} faculty members.`);
            } else {
                alert('No valid rows or all faculty IDs were duplicates.');
            }

            setShowDialog(false);
            setPreviewData([]);
            await fetchFaculty();
        } catch (err) {
            console.error(err);
            alert('Failed to execute bulk upload.');
        } finally {
            setUploadLoading(false);
        }
    };

    // Color mapper for Gender tags
    const getGenderColor = (gender: string) => {
        const lower = (gender || '').trim().toLowerCase();
        if (lower === 'female') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (lower === 'male') return 'bg-rose-100 text-rose-800 border-rose-200';
        if (lower === 'hod' || lower === 'admin') return 'bg-purple-100 text-purple-800 border-purple-200';
        return 'bg-amber-100 text-amber-800 border-amber-200';
    };

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Faculty Registry</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Faculty Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage department faculty, contact info, and exam duty availability for <strong>{branch || 'Unknown Department'}</strong>.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => { resetForm(); setShowDialog(true); }}><Plus className="w-4 h-4 mr-2" /> Add Faculty</Button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : facultyList.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-white shadow-sm">
                        <Users className="w-12 h-12 mb-4 opacity-50 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700">No Faculty Registered</h3>
                        <p className="text-sm mt-1">Upload an Excel sheet or add manually to get started.</p>
                        <Button variant="outline" className="mt-6" onClick={() => setShowDialog(true)}>Add Faculty Now</Button>
                    </div>
                ) : (
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 border-b text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Faculty Member</th>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Gender</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Exam Duty Avail.</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {facultyList.map((faculty) => (
                                        <tr key={faculty.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {faculty.name.charAt(0).toUpperCase()}
                                                </div>
                                                {faculty.name}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-500">
                                                {faculty.facultyId}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getGenderColor(faculty.gender)}`}>
                                                    {faculty.gender || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-600 block">{faculty.email}</div>
                                                <div className="text-gray-400 text-xs mt-0.5">{faculty.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${faculty.status === 'Active' ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                                                    {faculty.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    <Switch 
                                                        checked={faculty.availability ?? true} 
                                                        onCheckedChange={() => toggleAvailability(faculty.id, faculty.availability ?? true)}
                                                        className={faculty.availability ? 'bg-green-500' : 'bg-gray-300'}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(faculty)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFaculty(faculty.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
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

                {/* ADD FACULTY DIALOG */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Register Faculty Member</DialogTitle></DialogHeader>
                        
                        <Tabs defaultValue="manual" className="w-full mt-4" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="upload">Upload File (Excel)</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="manual" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Full Name <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., Dr. Alice Davis" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Faculty ID <span className="text-red-500">*</span></Label>
                                        <Input placeholder="e.g., CSE-F001" value={formData.facultyId} onChange={e => setFormData({ ...formData, facultyId: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
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
                                        <Label>Status</Label>
                                        <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Active">Active</SelectItem>
                                                <SelectItem value="Inactive">Inactive</SelectItem>
                                                <SelectItem value="On Leave">On Leave</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Email <span className="text-red-500">*</span></Label>
                                        <Input type="email" placeholder="alice@college.edu" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input type="tel" placeholder="+1234567890" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button variant="outline" onClick={() => setShowDialog(false)} disabled={submitLoading}>Cancel</Button>
                                    <Button onClick={handleCreateFaculty} disabled={submitLoading}>
                                        {submitLoading ? 'Saving...' : 'Register Faculty'}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4 py-4">
                                <ExcelUpload 
                                    templateHeaders={['Name', 'Faculty ID', 'Gender', 'Email', 'Phone', 'Status']}
                                    templateName="faculty_template.xlsx"
                                    schemaMapping={{
                                        'Name': 'name',
                                        'Faculty ID': 'facultyId',
                                        'Gender': 'gender',
                                        'Email': 'email',
                                        'Phone': 'phone',
                                        'Status': 'status'
                                    }}
                                    requiredFields={['name', 'facultyId', 'email']}
                                    onDataParsed={setPreviewData}
                                    previewData={previewData}
                                    onUpload={handleBulkUpload}
                                    uploadLoading={uploadLoading}
                                    previewColumns={[
                                        { key: 'name', label: 'Name' },
                                        { key: 'facultyId', label: 'Faculty ID' },
                                        { key: 'gender', label: 'Gender' },
                                        { key: 'email', label: 'Email' }
                                    ]}
                                />
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>

                {/* EDIT FACULTY DIALOG */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Edit Faculty Details</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Faculty ID</Label>
                                <Input disabled value={formData.facultyId} className="bg-muted text-muted-foreground" />
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
                                    <Label>Status</Label>
                                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="On Leave">On Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitLoading}>Cancel</Button>
                            <Button onClick={handleEditFaculty} disabled={submitLoading}>
                                {submitLoading ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </HODLayout>
    );
}
