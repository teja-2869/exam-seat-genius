import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlusCircle, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { auth, db, functions } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateExam() {
  const { college, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [availableBlocks, setAvailableBlocks] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    // Basic Info
    examName: '',
    subject: '',
    examType: 'Internal',
    date: '',
    startTime: '',
    endTime: '',
    // Targeting
    targetYears: [] as string[],
    branches: [] as string[],
    sections: [] as string[],
    studentType: 'Regular',
    // Infrastructure
    selectedBlocks: [] as string[],
    roomTypesAllowed: ['classroom', 'lab'],
    excludeRoomTypes: [] as string[],
    // Rules
    noSameBranchAdjacent: true,
    noSameSubjectAdjacent: true,
    minRollGap: 1,
    alternateSeating: false
  });

  const hodObj = user as any;
  const institutionId = college?.id || hodObj?.institutionId;

  const fetchData = async () => {
    if (!institutionId) return;
    try {
        const [eq, bq, blq] = await Promise.all([
          getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'branches'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'blocks'), where('institutionId', '==', institutionId)))
        ]);
        
        setExams(eq.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt?.toDate?.() || 0).getTime() - new Date(a.createdAt?.toDate?.() || 0).getTime()));
        setAvailableBranches(bq.docs.map(d => ({ id: d.id, ...d.data() })));
        setAvailableBlocks(blq.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
     fetchData();
  }, [institutionId]);

  const handleCheckboxArray = (key: keyof typeof formData, value: string) => {
      const arr = formData[key] as string[];
      if (arr.includes(value)) {
          setFormData({ ...formData, [key]: arr.filter(i => i !== value) });
      } else {
          setFormData({ ...formData, [key]: [...arr, value] });
      }
  };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        const userData = user as any;
        if (!userData || !userData.role || !userData.institutionId) {
            console.log("User data missing ❌");
            return;
        }
        
        // Ensure date/time valid
        if (new Date(`${formData.date}T${formData.endTime}`) <= new Date(`${formData.date}T${formData.startTime}`)) {
            alert("Validation Error: End time must be after start time.");
            return;
        }

        setLoading(true);
        try {
            // Fetch matching students for validation & metrics
            const sQuery = query(collection(db, 'students'), where('institutionId', '==', userData.institutionId));
            const sSnap = await getDocs(sQuery);
            const filteredStudents = sSnap.docs.map(d => d.data()).filter(s => {
                if (formData.targetYears.length > 0 && !formData.targetYears.includes(s.year || '1st Year')) return false;
                if (formData.branches.length > 0 && !formData.branches.includes(s.branch)) return false;
                if (formData.sections.length > 0 && !formData.sections.includes(s.section)) return false;
                if (formData.studentType !== 'Both' && formData.studentType !== (s.examType || 'Regular')) return false;
                return true;
            });

            if (filteredStudents.length === 0) {
                alert('Validation Error: No students match your targeting criteria.');
                setLoading(false);
                return;
            }

            // Fetch rooms and validate capacity
            const cQuery = query(collection(db, 'classrooms'), where('institutionId', '==', userData.institutionId));
            const cSnap = await getDocs(cQuery);
            let maxCapacity = 0;
            
            cSnap.docs.forEach(docSnap => {
                const r = docSnap.data();
                if (formData.selectedBlocks.length > 0 && !formData.selectedBlocks.includes(r.blockNumber)) return;
                
                const rType = (r.roomType || 'classroom').toLowerCase();
                if (!formData.roomTypesAllowed.includes(rType)) return;
                if (formData.excludeRoomTypes.includes(rType)) return;
                
                const rows = parseInt(r.rowsOfBenches, 10) || 0;
                const cols = parseInt(r.columnsOfBenches, 10) || 0;
                // lab=1 per bench, classroom=2 per bench based on layout rendering logic
                maxCapacity += (rType === 'lab') ? (rows * cols) : (rows * cols * 2);
            });

            if (maxCapacity < filteredStudents.length) {
                alert(`Validation Error: Insufficient room capacity mapped. Mapped max capacity is ${maxCapacity}, but total matching students is ${filteredStudents.length}.`);
                setLoading(false);
                return;
            }

            const newExamRef = await addDoc(collection(db, 'exams'), {
                institutionId: userData.institutionId,
                examName: formData.examName,
                subject: formData.subject,
                examType: formData.examType,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,

                targetYears: formData.targetYears,
                branches: formData.branches,
                sections: formData.sections,
                studentType: formData.studentType,

                selectedBlocks: formData.selectedBlocks,
                roomTypesAllowed: formData.roomTypesAllowed,
                excludeRoomTypes: formData.excludeRoomTypes,

                noSameBranchAdjacent: formData.noSameBranchAdjacent,
                noSameSubjectAdjacent: formData.noSameSubjectAdjacent,
                minRollGap: formData.minRollGap,
                alternateSeating: formData.alternateSeating,

                totalStudents: filteredStudents.length,
                status: "CREATED",
                createdAt: serverTimestamp()
            });

            // Trigger mapping Cloud Function
            try {
                const generateSeatingPlan = httpsCallable(functions, 'generateSeatingPlan');
                generateSeatingPlan({ examId: newExamRef.id }); // Background trigger without awaiting full resolution to maintain fast UI redirect
            } catch (triggerErr) {
                console.error("AI trigger failed to initiate:", triggerErr);
            }

            alert(`Exam "${formData.examName}" created successfully. Processing initiated for ${filteredStudents.length} students into ${maxCapacity} mapped seating capacities.`);
            navigate('/admin/exams/schedule');
        } catch (err: any) {
            console.error(err);
            alert(`Failed to create exam. Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Create Exam</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                      New Exam Configuration
                  </h1>
                  <p className="text-muted-foreground">
                      Define global examination parameters securely scoped to your institution.
                  </p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-none shadow-sm h-fit">
                  <CardHeader>
                      <CardTitle>Exam Parameters</CardTitle>
                      <CardDescription>Enter the mandatory fields for the exam metadata.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleCreateExam} className="space-y-8">
                          
                          {/* 1. Basic Info */}
                          <div className="space-y-4">
                              <h3 className="font-semibold text-lg border-b pb-2">1. Basic Info</h3>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label>Exam Name <span className="text-red-500">*</span></Label>
                                      <Input required placeholder="e.g., Final Exam 2026" value={formData.examName} onChange={e => setFormData({ ...formData, examName: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label>Subject <span className="text-red-500">*</span></Label>
                                      <Input required placeholder="e.g., Advanced Mathematics" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label>Exam Type <span className="text-red-500">*</span></Label>
                                      <Select value={formData.examType} onValueChange={(val) => setFormData({ ...formData, examType: val })}>
                                          <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="Internal">Internal</SelectItem>
                                              <SelectItem value="External">External</SelectItem>
                                              <SelectItem value="Mid">MidTerm</SelectItem>
                                              <SelectItem value="Final">Final</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <div className="space-y-2">
                                      <Label>Date <span className="text-red-500">*</span></Label>
                                      <Input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label>Start Time <span className="text-red-500">*</span></Label>
                                      <Input required type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label>End Time <span className="text-red-500">*</span></Label>
                                      <Input required type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                                  </div>
                              </div>
                          </div>

                          {/* 2. Targeting */}
                          <div className="space-y-4">
                              <h3 className="font-semibold text-lg border-b pb-2">2. Student Targeting</h3>
                              
                              <div className="space-y-2">
                                  <Label>Target Years</Label>
                                  <div className="flex flex-wrap gap-4 mt-2">
                                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => (
                                          <label key={yr} className="flex items-center space-x-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50">
                                              <Checkbox checked={formData.targetYears.includes(yr)} onCheckedChange={() => handleCheckboxArray('targetYears', yr)} />
                                              <span>{yr}</span>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                              
                              <div className="space-y-2">
                                  <Label>Target Branches</Label>
                                  <div className="flex flex-wrap gap-3 mt-2">
                                      {availableBranches.map((b) => (
                                          <label key={b.id} className="flex items-center space-x-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50">
                                              <Checkbox checked={formData.branches.includes(b.branchName)} onCheckedChange={() => handleCheckboxArray('branches', b.branchName)} />
                                              <span>{b.branchName}</span>
                                          </label>
                                      ))}
                                      {availableBranches.length === 0 && <span className="text-xs text-muted-foreground">No branches found.</span>}
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div className="space-y-2">
                                      <Label>Specific Sections (Optional)</Label>
                                      <Input placeholder="e.g. A, B (comma separated)" onChange={e => setFormData({...formData, sections: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label>Student Type</Label>
                                      <Select value={formData.studentType} onValueChange={(val) => setFormData({ ...formData, studentType: val })}>
                                          <SelectTrigger><SelectValue placeholder="Select Student Type" /></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="Regular">Regular Only</SelectItem>
                                              <SelectItem value="Supplementary">Supplementary Only</SelectItem>
                                              <SelectItem value="Both">Both Regular + Supp</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                          </div>

                          {/* 3. Infrastructure */}
                          <div className="space-y-4">
                              <h3 className="font-semibold text-lg border-b pb-2">3. Infrastructure Mapping</h3>
                              
                              <div className="space-y-2">
                                  <Label>Allowed Blocks</Label>
                                  <div className="flex flex-wrap gap-3 mt-2">
                                      {availableBlocks.map((b) => (
                                          <label key={b.id} className="flex items-center space-x-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50">
                                              <Checkbox checked={formData.selectedBlocks.includes(b.blockNumber)} onCheckedChange={() => handleCheckboxArray('selectedBlocks', b.blockNumber)} />
                                              <span>{b.blockName || `Block ${b.blockNumber}`}</span>
                                          </label>
                                      ))}
                                      {availableBlocks.length === 0 && <span className="text-xs text-muted-foreground">No blocks deployed.</span>}
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <Label>Room Types Allowed to Host Seating</Label>
                                  <div className="flex flex-wrap gap-4 mt-2">
                                      {['classroom', 'lab'].map((rt) => (
                                          <label key={rt} className="flex items-center space-x-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50 capitalize">
                                              <Checkbox checked={formData.roomTypesAllowed.includes(rt)} onCheckedChange={() => handleCheckboxArray('roomTypesAllowed', rt)} />
                                              <span>{rt}</span>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <Label>Exclude Structural Types</Label>
                                  <div className="flex flex-wrap gap-4 mt-2">
                                      {['faculty room', 'hod room', 'washroom'].map((rt) => (
                                          <label key={rt} className="flex items-center space-x-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50 capitalize">
                                              <Checkbox checked={formData.excludeRoomTypes.includes(rt)} onCheckedChange={() => handleCheckboxArray('excludeRoomTypes', rt)} />
                                              <span>{rt}</span>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          {/* 4. Generation Rules */}
                          <div className="space-y-4">
                              <h3 className="font-semibold text-lg border-b pb-2">4. AI Seating Rules</h3>
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="flex items-center justify-between">
                                      <Label className="cursor-pointer" htmlFor="nba">No Same Branch Adjacent</Label>
                                      <Switch id="nba" checked={formData.noSameBranchAdjacent} onCheckedChange={(c) => setFormData({ ...formData, noSameBranchAdjacent: c })} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                      <Label className="cursor-pointer" htmlFor="nsa">No Same Subject Adjacent</Label>
                                      <Switch id="nsa" checked={formData.noSameSubjectAdjacent} onCheckedChange={(c) => setFormData({ ...formData, noSameSubjectAdjacent: c })} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                      <Label className="cursor-pointer" htmlFor="alt">Force Alternate Seating</Label>
                                      <Switch id="alt" checked={formData.alternateSeating} onCheckedChange={(c) => setFormData({ ...formData, alternateSeating: c })} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label>Minimum Roll Gap</Label>
                                      <Input type="number" min={1} max={10} value={formData.minRollGap} onChange={e => setFormData({ ...formData, minRollGap: parseInt(e.target.value)||1 })} />
                                  </div>
                              </div>
                          </div>
                          
                          <Button type="submit" disabled={loading || !formData.date || !formData.examName || !formData.subject || formData.targetYears.length===0 || formData.branches.length===0} className="w-full mt-8 p-6 text-lg">
                              {loading ? <><Activity className="w-5 h-5 mr-2 animate-spin" /> Preparing Sub-Engine Validation...</> : 'Initiate Engine Mapping & Create Exam'}
                          </Button>
                      </form>
                  </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-muted/20">
                  <CardHeader>
                      <CardTitle>Recent Exams</CardTitle>
                      <CardDescription>Exams previously configured.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {exams.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                              No exams have been created yet.
                          </div>
                      ) : (
                          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                              {exams.map((exam, i) => (
                                  <div key={i} className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-border group hover:border-primary transition-colors">
                                      <div className="font-bold text-[#1a1c1e] text-lg">{exam.examName}</div>
                                      <div className="text-muted-foreground font-medium text-sm mt-1">{exam.subject}</div>
                                      <div className="flex items-center gap-2 mt-3 text-xs text-primary bg-primary/10 w-fit px-2 py-1 rounded-md">
                                          <CalendarIcon className="w-3 h-3" />
                                          {exam.date}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      </div>
    </AdminLayout>
  );
}
