import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { FileUp, Info, Activity, AlertCircle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { ExcelUpload } from '@/components/ui/ExcelUpload';

export default function AdminBulkImport() {
    const { college, user } = useAuth();

    const [importType, setImportType] = useState<string>('students');
    const [fileType, setFileType] = useState<string>('csv');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);

    const handleUploadExecution = async () => {
        const userData = user as any;
        if (!userData || !userData.role || !userData.institutionId) {
            console.log("User data missing ❌");
            return;
        }

        if (importType !== 'students') {
            alert('Currently only Student Upload mapping is active in this module!');
            return;
        }

        if (previewData.length === 0) return;

        setUploadLoading(true);
        try {
            const batch = writeBatch(db);
            let validAdds = 0;

            for (const row of previewData) {
                const mappedName = String(row.name || 'Unknown');
                const mappedRoll = String(row.rollNumber);
                const mappedBranch = String(row.branch || 'N/A');
                const mappedYear = Number(row.year || 1);

                // Skip duplicates dynamically
                const dupQ = query(collection(db, 'students'), 
                    where('institutionId', '==', userData.institutionId),
                    where('rollNumber', '==', mappedRoll)
                );
                const snap = await getDocs(dupQ);
                if (!snap.empty) continue; // skip

                const newDocRef = doc(collection(db, 'students'));
                batch.set(newDocRef, {
                    institutionId: userData.institutionId,
                    name: mappedName,
                    rollNumber: mappedRoll,
                    branch: mappedBranch,
                    year: mappedYear,
                    academicStatus: 'Active'
                });
                validAdds++;
            }

            if (validAdds > 0) {
                await batch.commit();
                alert(`Successfully batch uploaded ${validAdds} students!`);
            } else {
                alert('No new students to upload. Roll numbers completely exist.');
            }
            
            setPreviewData([]); // Reset
        } catch (err: any) {
            console.error(err);
            alert(`Upload execution failed. Error: ${err.message}`);
        } finally {
            setUploadLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Options</span><span>/</span><span className="text-foreground font-medium">Bulk Ingestion</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Institutional Bulk Data Import
                        </h1>
                        <p className="text-muted-foreground">
                            Process large datasets securely. Handled in backend transaction batches.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="dashboard-card border-none shadow-sm md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase">Dataset Type</label>
                                <Select value={importType} onValueChange={setImportType}>
                                    <SelectTrigger><SelectValue placeholder="Select Data Target" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blocks">Blocks & Infrastructure</SelectItem>
                                        <SelectItem value="branches">Branches & HODs</SelectItem>
                                        <SelectItem value="faculty">Faculty Matrix</SelectItem>
                                        <SelectItem value="students">Master Student Roster</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase">File Format</label>
                                <Select value={fileType} onValueChange={setFileType} disabled>
                                    <SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mt-4 flex items-start gap-3">
                                <Info className="w-5 h-5 text-primary shrink-0" />
                                <p className="text-xs text-primary font-medium leading-relaxed">Downloads templates for expected schema formatting are generated and enforced strictly per active backend validation. For students CSV, ensure exactly headers: `Name`, `Roll Number`, `Branch`, `Year`.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="dashboard-card border-none shadow-sm md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Secure Ingestion Zone</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {importType === 'students' ? (
                                <ExcelUpload 
                                    templateHeaders={['name', 'rollNumber', 'branch', 'year']}
                                    templateName="students_template.xlsx"
                                    schemaMapping={{
                                        'name': 'name',
                                        'rollNumber': 'rollNumber',
                                        'branch': 'branch',
                                        'year': 'year'
                                    }}
                                    requiredFields={['name', 'rollNumber', 'branch']}
                                    onDataParsed={setPreviewData}
                                    previewData={previewData}
                                    onUpload={handleUploadExecution}
                                    uploadLoading={uploadLoading}
                                    previewColumns={[
                                        { key: 'name', label: 'Name' },
                                        { key: 'rollNumber', label: 'Roll Number' },
                                        { key: 'branch', label: 'Branch' },
                                        { key: 'year', label: 'Year' }
                                    ]}
                                />
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center">
                                    <Database className="w-12 h-12 mb-4 opacity-30" />
                                    <p>Only Student Upload mapping is currently active in this module.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AdminLayout>
    );
}
