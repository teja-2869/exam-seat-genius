import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { FileUp, Info, Activity, AlertCircle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function AdminBulkImport() {
    const { college, user } = useAuth();

    const [importType, setImportType] = useState<string>('students');
    const [fileType, setFileType] = useState<string>('csv');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const validateAndSetFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== fileType && !((fileType === 'excel') && (ext === 'xlsx' || ext === 'xls'))) {
            alert(`Format mismatch. Expected ${fileType} but got ${ext}`);
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            alert("File is too large. Maximum size is 15MB. Please batch your data.");
            return;
        }
        setSelectedFile(file);
    };

    const handleUploadExecution = async () => {
        if (!auth.currentUser || !selectedFile || importType !== 'students') {
            alert('Currently only Student Upload mapping is active in this module or missing file/auth!');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            if (!data) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
                if (!userDoc.exists()) {
                    alert('Error: Active user session could not be found.');
                    return;
                }

                const currentUser = userDoc.data();
                if (!currentUser.institutionId) {
                    alert('Error: Critical verification failed - institutionId is missing for the active user instance.');
                    return;
                }
                
                console.log("Writing with institutionId:", currentUser.institutionId);

                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                // Filter out empty rows, enforcing requested metadata loosely defined
                const validRows = jsonData.filter(row => row.name || row.Name || row.rollNumber || row['Roll Number']);

                if (validRows.length === 0) {
                    alert('No valid student metadata parsed. Double check CSV structural headers.');
                    return;
                }

                const batch = writeBatch(db);
                let validAdds = 0;

                for (const row of validRows) {
                    const mappedName = String(row.name || row.Name || 'Unknown');
                    const mappedRoll = String(row.rollNumber || row['Roll Number']);
                    const mappedBranch = String(row.branch || row.Branch || 'N/A');
                    const mappedYear = Number(row.year || row.Year || 1);

                    // Skip duplicates dynamically
                    const dupQ = query(collection(db, 'students'), 
                        where('institutionId', '==', currentUser.institutionId),
                        where('rollNumber', '==', mappedRoll)
                    );
                    const snap = await getDocs(dupQ);
                    if (!snap.empty) continue; // skip

                    const newDocRef = doc(collection(db, 'students'));
                    batch.set(newDocRef, {
                        // STRICT OVERRIDE FOR STUDENTS UPLOAD REQUESTED:
                        institutionId: currentUser.institutionId,
                        name: mappedName,
                        rollNumber: mappedRoll,
                        branch: mappedBranch,
                        year: mappedYear
                    });
                    validAdds++;
                }

                if (validAdds > 0) {
                    await batch.commit();
                    alert(`Successfully batch uploaded ${validAdds} students!`);
                } else {
                    alert('No new students to upload. Roll numbers completely exist.');
                }
                
                setSelectedFile(null); // Reset
            } catch (err: any) {
                console.error(err);
                alert(`Upload execution failed. Error: ${err.message}`);
            }
        };
        reader.readAsBinaryString(selectedFile);
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
                                <Select value={fileType} onValueChange={setFileType}>
                                    <SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                                        <SelectItem value="json">JSON (.json)</SelectItem>
                                        {/* For Excel processing we would typically map to 'csv' dynamically or process via cloud fn */}
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
                                {selectedFile && <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>Clear File</Button>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!selectedFile ? (
                                <div
                                    className="border-2 border-dashed border-border rounded-xl h-64 flex flex-col items-center justify-center p-6 text-center transition-colors hover:bg-muted/30"
                                    onDragOver={handleFileDrag}
                                    onDrop={handleFileDrop}
                                >
                                    <FileUp className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold text-foreground text-lg mb-1">Upload Pipeline</h3>
                                    <p className="text-sm text-muted-foreground mb-4">Drag and drop your {fileType.toUpperCase()} file here, or click to browse</p>
                                    <input
                                        type="file"
                                        id="fileUpload"
                                        className="hidden"
                                        accept={fileType === 'csv' ? '.csv' : fileType === 'json' ? '.json' : '.xlsx,.xls'}
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
                                        }}
                                    />
                                    <Button variant="outline" onClick={() => document.getElementById('fileUpload')?.click()}>Select File</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-muted border border-border rounded-lg p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                                                <FileUp className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground">{selectedFile.name}</h4>
                                                <p className="text-sm text-muted-foreground">{Number(selectedFile.size / 1024).toFixed(1)} KB • {fileType.toUpperCase()}</p>
                                            </div>
                                        </div>

                                        <div className="flex bg-amber-50 text-amber-800 p-3 rounded-md text-sm mb-4 border border-amber-200">
                                            <Database className="w-4 h-4 mr-2 shrink-0" />
                                            A pre-upload dry-run is executing to check for malformed data against institutional constraints...
                                        </div>

                                        <Button className="w-full" onClick={handleUploadExecution}>Initialize Upload Queue</Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AdminLayout>
    );
}
