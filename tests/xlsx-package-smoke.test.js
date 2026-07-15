const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const XLSX = require('xlsx');

test('XLSX Package Smoke Test', async () => {
    // 1. Assert version
    assert.strictEqual(XLSX.version, '0.20.3', 'XLSX version should be exactly 0.20.3');

    // 2. Create unique temp dir
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-xlsx-test-'));

    try {
        // 3 & 4. Representative source data
        const sourceRows = [
            ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyeti'],
            [17, 'Ada', 'Yılmaz', 'K'],
            [3, 'Mert', 'Demir', 'E']
        ];

        // Build in-memory workbook
        const wb = XLSX.utils.book_new();
        
        // First worksheet: Öğrenciler
        const ws1 = XLSX.utils.aoa_to_sheet(sourceRows);
        XLSX.utils.book_append_sheet(wb, ws1, 'Öğrenciler');

        // 5. Second worksheet with unrelated data
        const ws2 = XLSX.utils.aoa_to_sheet([['Dummy', 'Data'], [1, 2]]);
        XLSX.utils.book_append_sheet(wb, ws2, 'UnrelatedSheet');

        // 6. Test both formats
        const formats = ['xlsx', 'xls'];

        for (const fmt of formats) {
            const filePath = path.join(tempDir, `test_students.${fmt}`);
            
            // Write workbook to file
            XLSX.writeFile(wb, filePath);
            
            // Read it back
            const readWb = XLSX.readFile(filePath);
            
            // Assert first sheet is Öğrenciler
            assert.strictEqual(readWb.SheetNames[0], 'Öğrenciler', `First sheet name should be Öğrenciler for ${fmt}`);
            
            // Convert sheet
            const readWs = readWb.Sheets['Öğrenciler'];
            const readRows = XLSX.utils.sheet_to_json(readWs, { header: 1 });
            
            // Assert rows match exactly
            assert.deepStrictEqual(readRows, sourceRows, `Data mismatch for format ${fmt}`);
        }
    } finally {
        // 7. Cleanup
        try {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                fs.unlinkSync(path.join(tempDir, file));
            }
            fs.rmdirSync(tempDir);
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    }
});
