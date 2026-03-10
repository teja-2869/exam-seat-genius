import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Upload, FileUp, Activity, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODStudentUpload() {
    const { college, user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [branch, setBranch] = useState('');
    const [year, setYear] = useState('1');
    const [results, setResults] = useState<{ added: number } | null>(null);

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            if (!f.name.endsWith('.csv')) { toast.error('Only CSV files supported'); return; }
            setFile(f);
            setResults(null);
        }
    };

    const parseCSV = (text: string) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        return lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
            return obj;
        });
    };

    const handleUpload = async () => {
        if (!file || !branch) { toast.error('Select branch and file'); return; }
        const institutionId = getInstitutionId();
        if (!institutionId) return;

        setUploading(true);
        try {
            const text = await file.text();
            const rows = parseCSV(text);
            if (rows.length === 0) { toast.error('No data found in CSV'); setUploading(false); return; }

            let added = 0;
            for (const row of rows) {
                await addDoc(collection(db, 'students'), {
                    institutionId,
                    name: row.name || row.student_name || '',
                    rollNumber: row.rollnumber || row.roll_number || row.roll || '',
                    branch,
                    year: Number(year),
                    semester: Number(row.semester || 1),
                    academicStatus: 'Active',
                    createdAt: serverTimestamp()
                });
                added++;
            }
            setResults({ added });
            toast.success(`${added} students uploaded successfully`);
        } catch (err) {
            console.error(err);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <HODLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Upload Students</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Upload Students</h1>
                    <p className="text-muted-foreground">Import student data via CSV for your department.</p>
                </div>

                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> CSV Upload</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Input placeholder="e.g., Computer Science" value={branch} onChange={e => setBranch(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select value={year} onValueChange={setYear}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1st Year</SelectItem>
                                        <SelectItem value="2">2nd Year</SelectItem>
                                        <SelectItem value="3">3rd Year</SelectItem>
                                        <SelectItem value="4">4th Year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                            <FileUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-sm text-muted-foreground mb-4">CSV must have columns: name, rollNumber (or roll_number)</p>
                            <input type="file" id="csvUpload" className="hidden" accept=".csv" onChange={handleFileSelect} />
                            <Button variant="outline" onClick={() => document.getElementById('csvUpload')?.click()}>
                                {file ? file.name : 'Select CSV File'}
                            </Button>
                        </div>

                        {results && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <p className="text-sm font-medium text-green-800">{results.added} students added successfully!</p>
                            </div>
                        )}

                        <Button className="w-full" onClick={handleUpload} disabled={uploading || !file}>
                            {uploading ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload Students
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </HODLayout>
    );
}
