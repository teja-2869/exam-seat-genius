import * as XLSX from 'xlsx';

export const generateTemplate = (headers: string[], fileName: string) => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    // Use the first word of the filename or 'Template' as sheet name
    const sheetName = fileName.split('_')[0] || 'Template';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
};

export const parseExcel = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            reject(new Error("Invalid file format. Please upload an Excel (.xlsx or .xls) file."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                resolve(jsonData as any[]);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};

export const validateData = (data: any[], schemaMapping: Record<string, string>, requiredFields: string[]): any[] => {
    return data.map((row) => {
        const mappedRow: any = {};
        for (const [colHeader, mappedKey] of Object.entries(schemaMapping)) {
            // Find the key in the JSON row that matches the colHeader, case-insensitively and trimming spaces.
            const matchingKey = Object.keys(row).find(k => k.trim().toLowerCase() === colHeader.trim().toLowerCase());
            mappedRow[mappedKey] = matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null 
                ? String(row[matchingKey]).trim() 
                : '';
        }
        return mappedRow;
    }).filter(row => {
        // Validate required fields mapping specifically to the mapped keys
        return requiredFields.every(field => row[field] && String(row[field]).trim() !== '');
    });
};
