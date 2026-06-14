import React, { useRef, useState } from 'react';
import { Upload, Download, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseExcelAllSheets, validateData, generateTemplate } from '@/services/excelService';
import * as XLSX from 'xlsx';

export interface SheetResult {
    sheetName: string;
    totalRows: number;
    validRows: any[];
    invalidCount: number;
    error?: string;
}

interface Props {
    templateHeaders: string[];
    templateName: string;          // e.g. "subject_template_multisheet.xlsx"
    sheetTemplates?: string[];     // e.g. ['1st Year', '2nd Year', '3rd Year', '4th Year']
    schemaMapping: Record<string, string>;
    requiredFields: string[];
    onUpload: (sheets: SheetResult[]) => Promise<void> | void;
    uploadLoading: boolean;
}

export const MultiSheetExcelUpload: React.FC<Props> = ({
    templateHeaders,
    templateName,
    sheetTemplates = ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    schemaMapping,
    requiredFields,
    onUpload,
    uploadLoading,
}) => {
    const [parsing, setParsing] = useState(false);
    const [sheets, setSheets] = useState<SheetResult[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleDownload = () => {
        const wb = XLSX.utils.book_new();
        sheetTemplates.forEach((name) => {
            const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
            XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
        });
        XLSX.writeFile(wb, templateName);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { setSheets([]); return; }
        setParsing(true);
        try {
            const all = await parseExcelAllSheets(file);
            const results: SheetResult[] = all.map((s) => {
                try {
                    const valid = validateData(s.rows, schemaMapping, requiredFields);
                    return {
                        sheetName: s.sheetName,
                        totalRows: s.rows.length,
                        validRows: valid,
                        invalidCount: s.rows.length - valid.length,
                    };
                } catch (err: any) {
                    return {
                        sheetName: s.sheetName,
                        totalRows: s.rows.length,
                        validRows: [],
                        invalidCount: s.rows.length,
                        error: err.message || 'Failed to parse sheet',
                    };
                }
            });
            setSheets(results);
        } catch (err: any) {
            alert(err.message || 'Failed to read workbook');
            setSheets([]);
            if (fileRef.current) fileRef.current.value = '';
        } finally {
            setParsing(false);
        }
    };

    const totalValid = sheets.reduce((a, s) => a + s.validRows.length, 0);
    const totalInvalid = sheets.reduce((a, s) => a + s.invalidCount, 0);

    return (
        <div className="space-y-6">
            <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-muted/10 relative">
                {parsing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Upload Multi-Sheet Workbook</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    One .xlsx file with separate sheets per year (or any grouping).
                </p>
                <Input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="max-w-sm cursor-pointer file:cursor-pointer pb-8 border-dashed shadow-sm"
                    onChange={handleFile}
                    disabled={uploadLoading || parsing}
                />
                <div className="flex flex-col items-center gap-2 mt-8 pt-6 border-t w-full max-w-md mx-auto">
                    <span className="text-sm text-foreground font-medium">Need a template?</span>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={uploadLoading} className="w-full max-w-xs shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Download Multi-Sheet Template
                    </Button>
                </div>
            </div>

            {sheets.length > 0 && (
                <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="bg-gray-50/80 p-4 border-b flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm">
                            <span className="font-semibold">{sheets.length}</span> sheet(s) ·
                            <span className="text-green-700 font-semibold"> {totalValid} valid</span>
                            {totalInvalid > 0 && <span className="text-amber-700 font-semibold"> · {totalInvalid} skipped</span>}
                        </div>
                        <Button
                            size="sm"
                            onClick={() => onUpload(sheets)}
                            disabled={uploadLoading || totalValid === 0}
                            className="shadow-md"
                        >
                            {uploadLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {uploadLoading ? 'Uploading...' : `Confirm & Upload ${totalValid} Records`}
                        </Button>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {sheets.map((s, i) => {
                            const ok = !s.error && s.validRows.length > 0;
                            const empty = !s.error && s.totalRows === 0;
                            return (
                                <div key={i} className="p-4 flex items-start gap-3">
                                    {ok ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                    ) : empty ? (
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm">{s.sheetName}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {s.error
                                                ? <span className="text-destructive">{s.error}</span>
                                                : empty
                                                    ? 'Sheet is empty — skipped'
                                                    : `${s.validRows.length} valid of ${s.totalRows} rows${s.invalidCount > 0 ? ` · ${s.invalidCount} skipped (missing required fields)` : ''}`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
