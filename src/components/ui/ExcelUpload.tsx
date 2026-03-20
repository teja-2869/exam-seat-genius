import React, { useState, useRef } from 'react';
import { Download, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateTemplate, parseExcel, validateData } from '@/services/excelService';

interface ExcelUploadProps {
    templateHeaders: string[];
    templateName: string;
    schemaMapping: Record<string, string>; // Maps Excel Column -> Object Key
    requiredFields: string[]; // List of Object Keys that are mandatory
    onDataParsed: (data: any[]) => void;
    previewData: any[];
    onUpload: () => void;
    uploadLoading: boolean;
    previewColumns: { key: string; label: string }[];
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({
    templateHeaders,
    templateName,
    schemaMapping,
    requiredFields,
    onDataParsed,
    previewData,
    onUpload,
    uploadLoading,
    previewColumns
}) => {
    const [parseLoading, setParseLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        generateTemplate(templateHeaders, templateName);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            onDataParsed([]);
            return;
        }

        setParseLoading(true);
        try {
            const rawData = await parseExcel(file);
            const validated = validateData(rawData, schemaMapping, requiredFields);
            
            if (validated.length === 0) {
                alert("No valid rows found. Please check your Excel structure and ensure required fields are present.");
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
            onDataParsed(validated);
        } catch (err: any) {
            alert(err.message || 'Failed to parse Excel file. Please try again.');
            onDataParsed([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setParseLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-muted/10 relative">
                {parseLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
                
                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Upload Data</h3>
                <p className="text-sm text-muted-foreground mb-6">Supports .xlsx files</p>
                
                <Input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="max-w-sm cursor-pointer file:cursor-pointer pb-8 border-dashed shadow-sm" 
                    onChange={handleFileChange} 
                    disabled={uploadLoading || parseLoading} 
                />

                <div className="flex flex-col items-center gap-2 mt-8 pt-6 border-t w-full max-w-md mx-auto">
                    <span className="text-sm text-foreground font-medium">Need a template?</span>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate} disabled={uploadLoading} className="w-full max-w-xs shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Download Excel Template
                    </Button>
                </div>
            </div>

            {previewData.length > 0 && (
                <div className="mt-6 border rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="bg-gray-50/80 p-4 border-b flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Preview ({previewData.length} Valid Records)</h4>
                        {previewData.length > 0 && (
                            <Button size="sm" onClick={onUpload} disabled={uploadLoading} className="shadow-md">
                                {uploadLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {uploadLoading ? 'Uploading...' : `Confirm & Upload`}
                            </Button>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground bg-gray-50 sticky top-0 uppercase tracking-wider font-semibold z-10 shadow-sm">
                                <tr>
                                    {previewColumns.map((col, i) => (
                                        <th key={i} className="px-6 py-3">{col.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {previewData.map((row, i) => (
                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                        {previewColumns.map((col, j) => (
                                            <td key={j} className="px-6 py-3">{row[col.key] || '-'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {previewData.length === 0 && fileInputRef.current?.value && !parseLoading && (
                <div className="flex items-center gap-2 p-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">No valid records were found in the uploaded file. Ensure you are using the correct template format.</p>
                </div>
            )}
        </div>
    );
};
