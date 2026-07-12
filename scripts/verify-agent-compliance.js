const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let exitCode = 0;

function fail(message) {
    console.error(`[İHLAL] ${message}`);
    exitCode = 1;
}

const args = process.argv.slice(2);
const checkStagedOnly = args.includes('--staged');

const rootDir = process.env.COMPLIANCE_TEST_ROOT || path.resolve(__dirname, '..');
const policyPath = path.join(rootDir, 'agent-policy.json');

let policy;
try {
    policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
} catch (e) {
    fail(`agent-policy.json okunamadı veya ayrıştırılamadı: ${e.message}`);
    process.exit(exitCode);
}

let filesToCheck = [];
if (checkStagedOnly) {
    try {
        const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        filesToCheck = output.split('\n').map(f => f.trim()).filter(f => f.length > 0);
    } catch (e) {
        fail(`Staged dosyalar Git'ten okunamadı: ${e.message}`);
    }
}

// Check test quality
function checkTests(files) {
    const testsDir = path.join(rootDir, 'tests');
    if (!fs.existsSync(testsDir)) return;
    
    let targetFiles = [];
    if (files) {
        targetFiles = files.filter(f => f.startsWith('tests/') && f.endsWith('.test.js')).map(f => path.join(rootDir, f));
    } else {
        const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
        targetFiles = testFiles.map(f => path.join(testsDir, f));
    }

    for (const filePath of targetFiles) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of policy.prohibitedTestPatterns) {
            // Case-sensitive exact match
            if (content.includes(pattern)) {
                fail(`Yasaklı test kalıbı bulundu. Dosya: ${path.relative(rootDir, filePath)}, Kalıp: "${pattern}"`);
            }
        }
    }
}

// Check schedule review panel innerHTML and network
function checkScheduleReviewPanel(files) {
    for (const fileReq of policy.innerHTMLProhibitedFiles) {
        if (files && !files.includes(fileReq)) continue;
        const filePath = path.join(rootDir, fileReq);
        if (!fs.existsSync(filePath)) continue;
        
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('innerHTML')) {
            fail(`Yasaklı API (innerHTML) kullanımı tespit edildi. Dosya: ${fileReq}`);
        }
    }

    const netPolicy = policy.prohibitedNetworkAndStoragePatterns;
    for (const fileReq of netPolicy.files) {
        if (files && !files.includes(fileReq)) continue;
        const filePath = path.join(rootDir, fileReq);
        if (!fs.existsSync(filePath)) continue;
        
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of netPolicy.patterns) {
            if (content.includes(pattern)) {
                fail(`Yasaklı ağ/depolama API'si veya isteği tespit edildi. Dosya: ${fileReq}, Kalıp: "${pattern}"`);
            }
        }
    }
}

// Check admin HTML
function checkAdminHtml(files) {
    const adminReq = policy.adminHtmlRequirements;
    if (files && !files.includes(adminReq.file)) return;
    const filePath = path.join(rootDir, adminReq.file);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');

    for (const id of adminReq.requiredIds) {
        if (!content.includes(`id="${id}"`)) {
            fail(`Eksik HTML ID'si tespit edildi. Dosya: ${adminReq.file}, Beklenen: "${id}"`);
        } else {
            const matches = content.match(new RegExp(`id="${id}"`, 'g'));
            if (matches && matches.length > 1) {
                fail(`Tekrarlanan HTML ID'si tespit edildi. Dosya: ${adminReq.file}, ID: "${id}"`);
            }
        }
    }

    for (const heading of adminReq.requiredHeadings) {
        if (!content.includes(heading)) {
            fail(`Eksik Editable Table başlığı tespit edildi. Dosya: ${adminReq.file}, Beklenen: "${heading}"`);
        }
    }

    let lastIdx = -1;
    for (const script of adminReq.requiredScriptOrder) {
        const idx = content.indexOf(script);
        if (idx === -1) {
            fail(`Eksik script tespiti yapıldı. Dosya: ${adminReq.file}, Script: "${script}"`);
        } else if (idx < lastIdx) {
            fail(`Yanlış script sırası tespit edildi. Dosya: ${adminReq.file}, Script: "${script}"`);
        }
        lastIdx = idx;
    }

    for (const pattern of adminReq.prohibitedMarkupPatterns) {
        if (new RegExp(pattern).test(content)) {
            fail(`Bozuk veya yasaklı HTML işaretlemesi bulundu. Dosya: ${adminReq.file}, Kalıp: "${pattern}"`);
        }
    }
}

// Check package.json
function checkPackage(files) {
    const pkgReq = policy.packageRequirements;
    if (files && !files.includes(pkgReq.file)) return;
    const filePath = path.join(rootDir, pkgReq.file);
    if (!fs.existsSync(filePath)) return;

    let pkg;
    try {
        pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        fail(`package.json ayrıştırılamadı: ${e.message}`);
        return;
    }

    const scripts = pkg.scripts || {};
    for (const script of pkgReq.requiredScripts) {
        if (!scripts[script]) {
            fail(`Eksik package.json betiği tespit edildi: "${script}"`);
        }
    }

    if (scripts['test:core']) {
        for (const tf of pkgReq.coreTestFiles) {
            if (!scripts['test:core'].includes(tf)) {
                fail(`test:core betiği zorunlu test dosyasını içermiyor: "${tf}"`);
            }
        }
    }
}

if (checkStagedOnly) {
    checkTests(filesToCheck);
    checkScheduleReviewPanel(filesToCheck);
    checkAdminHtml(filesToCheck);
    checkPackage(filesToCheck);
} else {
    checkTests(null);
    checkScheduleReviewPanel(null);
    checkAdminHtml(null);
    checkPackage(null);
}

if (exitCode === 0) {
    console.log("Tüm uygunluk kontrolleri başarıyla geçildi.");
}
process.exit(exitCode);
