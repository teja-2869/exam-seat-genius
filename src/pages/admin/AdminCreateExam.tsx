import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlusCircle, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminCreateExam() {
  const { college, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    examName: '',
    date: '',
    subject: ''
  });

  const hodObj = user as any;
  const institutionId = college?.id || hodObj?.institutionId;

  const fetchExams = async () => {
    if (!institutionId) return;
    try {
        const eq = query(collection(db, 'exams'), where('institutionId', '==', institutionId));
        const snap = await getDocs(eq);
        setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
     fetchExams();
  }, [institutionId]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const userData = user as any;
    if (!userData || !userData.role || !userData.institutionId) {
        console.log("User data missing ❌");
        return;
    }
    console.log("User Data:", userData);

    setLoading(true);
    try {
        // EXACT FORMAT AS REQUESTED:
        await addDoc(collection(db, 'exams'), {
            institutionId: userData.institutionId,
            examName: formData.examName,
            date: formData.date,
            subject: formData.subject,
            createdAt: serverTimestamp() // Always good to have
        });

        alert('Exam created successfully!');
        setFormData({ examName: '', date: '', subject: '' });
        fetchExams();
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
                      <form onSubmit={handleCreateExam} className="space-y-4">
                          <div className="space-y-2">
                              <Label>Exam Name <span className="text-red-500">*</span></Label>
                              <Input required placeholder="e.g., Mid Sem 1, Final Exam 2026" value={formData.examName} onChange={e => setFormData({ ...formData, examName: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                              <Label>Subject <span className="text-red-500">*</span></Label>
                              <Input required placeholder="e.g., Advanced Mathematics" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                              <Label>Date <span className="text-red-500">*</span></Label>
                              <Input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                          </div>
                          
                          <Button type="submit" disabled={loading} className="w-full mt-4">
                              {loading ? 'Creating...' : 'Create Exam'}
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
