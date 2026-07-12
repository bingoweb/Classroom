const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();
const POLICY_FILE = path.join(PROJECT_ROOT, 'agent-policy.json');
const BASELINE_FILE = path.join(PROJECT_ROOT, '.agent/quality-baseline.json');
const AGENTS_FILE = path.join(PROJECT_ROOT, 'AGENTS.md');
const AI_CONTEXT_FILE = path.join(PROJECT_ROOT, 'AI_PROJECT_CONTEXT.md');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const TESTS_DIR = path.join(PROJECT_ROOT, 'tests');

const modes = {
    scan: process.argv.includes('--scan'),
    staged: process.argv.includes('--staged'),
    repository: process.argv.includes('--repository'),
    ci: process.argv.includes('--ci')
};

if (!modes.scan && !modes.staged && !modes.repository && !modes.ci) {
    console.error('Mode belirtilmedi. --scan, --staged, --repository veya --ci kullanın.');
    process.exit(1);
}

let policy = {};
try {
    policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
} catch (e) {
    console.error(`❌ agent-policy.json okunamadı veya parse edilemedi: ${e.message}`);
    process.exit(1);
}

let baseline = [];
let baselineCounts = {};
if (fs.existsSync(BASELINE_FILE)) {
    try {
        baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
        const seen = new Set();
        baseline.forEach(b => {
            const entryStr = JSON.stringify({ruleId: b.ruleId, path: b.path, line: b.line, fingerprint: b.fingerprint});
            if (seen.has(entryStr)) {
                console.error(`❌ quality-baseline.json içerisinde duplicate kayıt tespit edildi: ${entryStr}`);
                process.exit(1);
            }
            seen.add(entryStr);
            if (!/^[a-f0-9]{64}$/.test(b.fingerprint)) {
                console.error(`❌ quality-baseline.json içerisinde geçersiz fingerprint tespit edildi: ${b.fingerprint}`);
                process.exit(1);
            }
            const key = `${b.ruleId}|${b.path}|${b.fingerprint}`;
            baselineCounts[key] = (baselineCounts[key] || 0) + 1;
        });
    } catch (e) {
        console.error(`❌ quality-baseline.json okunamadı: ${e.message}`);
        process.exit(1);
    }
}

let currentCounts = {};

function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'fixtures') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
}

function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only', { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
        return output.split('\n').filter(Boolean).map(f => path.join(PROJECT_ROOT, f));
    } catch (e) {
        return [];
    }
}

function getDiffAddedLines() {
    const addedLines = {};
    try {
        let diffCmd = '';
        if (modes.staged) {
            diffCmd = 'git diff --cached --unified=0';
        } else if (modes.ci) {
            const baseRef = process.env.GITHUB_BASE_REF || process.env.GITHUB_SHA + '^1';
            const sha = process.env.GITHUB_SHA || 'HEAD';
            if (!process.env.GITHUB_SHA && !process.env.GITHUB_BASE_REF && process.env.NODE_ENV !== 'test') {
                console.error(`❌ CI ortamında GITHUB_SHA veya GITHUB_BASE_REF bulunamadı. Karşılaştırma yapılamıyor.`);
                process.exit(1);
            }
            diffCmd = `git diff ${baseRef} ${sha} --unified=0`;
        }
        
        if (diffCmd) {
            const diffOutput = execSync(diffCmd, { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
            let currentFile = null;
            diffOutput.split('\n').forEach(line => {
                if (line.startsWith('+++ b/')) {
                    currentFile = path.join(PROJECT_ROOT, line.replace('+++ b/', ''));
                    addedLines[currentFile] = [];
                } else if (line.startsWith('+') && !line.startsWith('+++')) {
                    if (currentFile) addedLines[currentFile].push(line.substring(1));
                }
            });
        }
    } catch (e) {
        // Ignore diff errors
    }
    return addedLines;
}

const addedLinesByFile = getDiffAddedLines();

function getFilesToScan() {
    if (modes.staged) return getStagedFiles();
    return getAllFiles(PROJECT_ROOT).filter(f => !f.includes('/node_modules/') && !f.includes('/.git/'));
}

const violations = [];
const executedTests = {
    topLevel: 0,
    nested: 0,
    expected: 0
};

function addViolation(ruleId, severity, file, line, msg) {
    const relFile = path.relative(PROJECT_ROOT, file);
    violations.push({ ruleId, severity, file: relFile, line, msg });
}

function checkBaselineAllowed(ruleId, relFile, textLine) {
    const fingerprint = sha256(textLine);
    const key = `${ruleId}|${relFile}|${fingerprint}`;
    
    currentCounts[key] = (currentCounts[key] || 0) + 1;
    
    if (!baselineCounts[key]) {
        return false; // new violation
    }
    if (currentCounts[key] > baselineCounts[key]) {
        return false; // increased occurrence
    }
    return true;
}

function checkJson(filePath, content) {
    try {
        JSON.parse(content);
    } catch (e) {
        addViolation('invalid-json', 'high', filePath, 0, `Geçersiz JSON: ${e.message}`);
    }
}

function checkJsSyntax(filePath, content) {
    try {
        new (require('vm').Script)(content);
    } catch (e) {
        addViolation('invalid-js', 'high', filePath, 0, `JS Sentaks Hatası: ${e.message}`);
    }
}

function checkHtml(filePath, content) {
    const relFile = path.relative(PROJECT_ROOT, filePath);
    const lines = content.split('\n');
    const idMap = new Set();
    
    if (relFile === 'public/admin/index.html') {
        const reqIds = policy.adminHtmlRequirements?.requiredIds || [];
        reqIds.forEach(id => {
            if (!content.includes(`id="${id}"`)) {
                if (!checkBaselineAllowed('missing-required-id', relFile, id)) {
                    addViolation('missing-required-id', 'high', filePath, 0, `HTML dosyasında zorunlu ID eksik: ${id}`);
                }
            }
        });
        
        const prohibited = policy.adminHtmlRequirements?.prohibitedMarkupPatterns || [];
        prohibited.forEach(p => {
            const regex = new RegExp(p);
            if (regex.test(content)) {
                if (!checkBaselineAllowed('malformed-html-attribute', relFile, p)) {
                    addViolation('malformed-html-attribute', 'high', filePath, 0, `Bozuk veya yasaklı HTML işaretlemesi bulundu: ${p}`);
                }
            }
        });
        
        const reqScripts = policy.adminHtmlRequirements?.requiredScriptOrder || [];
        let lastIdx = -1;
        let isOrdered = true;
        reqScripts.forEach(script => {
            const idx = content.indexOf(`src="${script}"`);
            if (idx !== -1) {
                if (idx < lastIdx) isOrdered = false;
                lastIdx = idx;
            }
        });
        if (!isOrdered) {
            addViolation('incorrect-script-order', 'high', filePath, 0, `Script sıralaması yanlış.`);
        }
    }

    lines.forEach((line, i) => {
        if (line.trim().startsWith('```')) {
            addViolation('markdown-fence-in-html', 'medium', filePath, i+1, `HTML içinde Markdown kod bloğu bulundu.`);
        }
        const idMatch = line.match(/id="([^"]+)"/g);
        if (idMatch) {
            idMatch.forEach(idStr => {
                const id = idStr.replace('id="', '').replace('"', '');
                if (idMap.has(id)) {
                    addViolation('duplicate-id', 'high', filePath, i+1, `Tekrarlanan HTML ID'si tespit edildi: ${id}`);
                }
                idMap.add(id);
            });
        }
    });
}

function checkUnsafeDom(filePath, content) {
    const relFile = path.relative(PROJECT_ROOT, filePath);
    const lines = content.split('\n');
    const prohibited = policy.prohibitedUnsafeDomPatterns || [];
    
    lines.forEach((line, i) => {
        prohibited.forEach(p => {
            if (line.includes(p)) {
                if (!checkBaselineAllowed('unsafe-dom-inner-html', relFile, line)) {
                    addViolation('unsafe-dom-inner-html', 'high', filePath, i+1, `Yasaklı API kullanımı tespit edildi: ${p}`);
                }
            }
        });
    });
}

function checkSensitiveBehaviours(filePath, content) {
    const relFile = path.relative(PROJECT_ROOT, filePath);
    const added = addedLinesByFile[filePath];
    if (!added || added.length === 0) return;

    let hasContract = fs.existsSync(path.join(PROJECT_ROOT, '.agent/task-contract.json'));
    let contract = null;
    if (hasContract) {
        try {
            contract = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, '.agent/task-contract.json'), 'utf8'));
        } catch (e) {}
    }

    const sensitivePatterns = policy.prohibitedNetworkAndStoragePatterns || [];
    
    added.forEach((line, i) => {
        sensitivePatterns.forEach(p => {
            if (line.includes(p)) {
                // If it's a conservative match, require task contract
                if (!hasContract) {
                    addViolation('unapproved-network-storage', 'high', filePath, 0, `İzinsiz hassas API (Network/Storage) kullanımı: ${p}. Task contract gereklidir.`);
                } else if (contract) {
                    // Check if file is allowed in contract
                    if (!contract.allowedExistingFiles?.includes(relFile) && !contract.allowedNewFiles?.includes(relFile)) {
                        addViolation('unapproved-network-storage', 'high', filePath, 0, `İzinsiz hassas API kullanımı: ${p}. Dosya task contract allowedFiles listesinde yok.`);
                    }
                }
            }
        });

        if (policy.maintenanceMode) {
            // "new action buttons, new navigation tabs or links, new UI panels or sections, new pages, new Express routes, new API endpoints, new persistence or write operations, new database tables or fields, new runtime dependencies, new external integrations"
            const newFeatures = [
                /<button[^>]*>Yeni/i, /<button[^>]*>Ekle/i, /<button[^>]*>Add/i, /<button[^>]*>Create/i,
                /app\.get\(/i, /app\.post\(/i, /app\.put\(/i, /app\.delete\(/i, /router\./i,
                /CREATE TABLE/i, /ALTER TABLE/i
            ];
            newFeatures.forEach(regex => {
                if (regex.test(line)) {
                    if (!hasContract || contract?.newFeaturesAllowed) {
                        addViolation('unapproved-maintenance-feature', 'high', filePath, 0, `Maintenance modunda yeni özellik eklenmesi yasaktır (veya izinsizdir). Satır: ${line.trim()}`);
                    }
                }
            });
        }
    });
}

function checkTests(filePath, content) {
    const lines = content.split('\n');
    const prohibited = policy.prohibitedTestPatterns || [];
    
    lines.forEach((line, i) => {
        prohibited.forEach(p => {
            if (line.includes(p)) {
                addViolation('prohibited-test-pattern', 'high', filePath, i+1, `Yasaklı test kalıbı bulundu: ${p}`);
            }
        });
        
        if (line.match(/^test\(/)) {
            executedTests.topLevel++;
        }
        if (line.match(/\s+test\(/)) {
            executedTests.nested++;
        }
        if (line.match(/assert\./)) {
            executedTests.expected++;
        }
    });
}

function checkLanguage(filePath, content) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.match(/<button[^>]*>[A-Za-z]+<\/button>/)) {
            if (!line.includes('ID') && !line.includes('API')) {
                if (line.match(/Save|Submit|Cancel|Delete/i)) {
                    addViolation('english-ui-text', 'medium', filePath, i+1, `İngilizce kullanıcı arayüzü metni bulundu.`);
                }
            }
        }
    });
}

function checkDocumentationTruth() {
    if (!fs.existsSync(AI_CONTEXT_FILE)) return;
    const content = fs.readFileSync(AI_CONTEXT_FILE, 'utf8');
    
    if (content.includes('innerHTML kullanımı engellendi') || content.includes('innerHTML kullanılmaz')) {
        const hasInnerHtml = baseline.some(b => b.ruleId === 'unsafe-dom-inner-html');
        if (hasInnerHtml) {
            if (!checkBaselineAllowed('documentation-contradicts-code', 'AI_PROJECT_CONTEXT.md', 'innerHTML')) {
                addViolation('documentation-contradicts-code', 'high', AI_CONTEXT_FILE, 0, `Dokümantasyon innerHTML olmadığını iddia ediyor ancak kodda mevcut.`);
            }
        }
    }
    
    if (content.includes('GitHub CI başarılı') && !modes.ci) {
        addViolation('false-ci-claim', 'high', AI_CONTEXT_FILE, 0, `Lokal test sonuçları GitHub CI sonucu olarak raporlanmış.`);
    }

    if (policy.maintenanceMode && content.match(/PUT persistence/i)) {
         addViolation('false-docs-claim', 'high', AI_CONTEXT_FILE, 0, `Maintenance modunda PUT persistence tavsiye edilemez.`);
    }
}

function checkPackageJson() {
    if (!fs.existsSync(PACKAGE_JSON)) return;
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    const req = policy.packageScriptRequirements || {};
    
    Object.keys(req).forEach(script => {
        if (script !== 'test:core') {
            if (!pkg.scripts[script]) {
                addViolation('missing-package-script', 'high', PACKAGE_JSON, 0, `Gerekli npm script eksik: ${script}`);
            }
        }
    });
    
    if (pkg.scripts['test:core']) {
        const coreStr = pkg.scripts['test:core'];
        if (!coreStr.includes('tests/agent-compliance.test.js') && !coreStr.includes('tests/project-guard.test.js')) {
            addViolation('missing-core-test', 'high', PACKAGE_JSON, 0, `Core testleri arasında compliance/guard testi eksik.`);
        }
    }
}

function checkTaskContract() {
    const contractPath = path.join(PROJECT_ROOT, '.agent', 'task-contract.json');
    const hasContract = fs.existsSync(contractPath);
    let contract = null;
    
    if (hasContract) {
        try {
            contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        } catch (e) {
            addViolation('invalid-task-contract', 'high', contractPath, 0, `Task contract parse edilemedi: ${e.message}`);
            return;
        }
        
        if (contract.newFeaturesAllowed !== false) {
            addViolation('task-contract-new-features', 'high', contractPath, 0, `newFeaturesAllowed false olmalıdır.`);
        }
        
        if (!policy.permittedMaintenanceChangeTypes?.includes(contract.changeType)) {
            addViolation('task-contract-change-type', 'high', contractPath, 0, `changeType geçersiz: ${contract.changeType}`);
        }
        
        if (!/^[0-9a-f]{40}$/.test(contract.baseCommit)) {
            addViolation('task-contract-base-commit', 'high', contractPath, 0, `baseCommit 40 karakterlik SHA olmalıdır.`);
        } else {
            // Check if baseCommit is ancestor of HEAD
            try {
                execSync(`git merge-base --is-ancestor ${contract.baseCommit} HEAD`, { cwd: PROJECT_ROOT, stdio: 'ignore' });
            } catch (e) {
                addViolation('task-contract-base-commit', 'high', contractPath, 0, `baseCommit HEAD'in atası değil veya mevcut değil.`);
            }
        }
    }

    if (modes.staged) {
        const staged = getStagedFiles();
        const hasApp = staged.some(f => (policy.applicationPaths.some(p => f.includes(p)) || f.includes('/tests/') || f.includes('AI_PROJECT_CONTEXT.md')) && !f.includes('/tests/agent-compliance.test.js') && !f.includes('/tests/project-guard.test.js'));
        const hasPolicy = staged.some(f => policy.policySensitivePaths.some(p => f.includes(p)));
        const hasBaseline = staged.some(f => f.includes('.agent/quality-baseline.json'));
        const hasContractChange = staged.some(f => f.includes('.agent/task-contract.json'));
        
        if (hasApp && !hasContract) {
            addViolation('missing-task-contract', 'high', 'git-staged', 0, `Uygulama/Test dosyaları değiştirildiğinde aktif bir task-contract.json bulunmalıdır.`);
        }
        
        if (hasApp && hasPolicy && !hasContractChange) {
            addViolation('mixed-policy-app-commit', 'high', 'git-staged', 0, `Policy dosyaları ile uygulama kodları aynı committe değiştirilemez.`);
        }

        if (hasApp && hasBaseline) {
            addViolation('mixed-baseline-app-commit', 'high', 'git-staged', 0, `Baseline ve uygulama dosyaları aynı committe değiştirilemez. Baseline değişiklikleri policy-only commit olmalıdır.`);
        }

        if (hasContract && hasApp) {
            staged.forEach(f => {
                const rel = path.relative(PROJECT_ROOT, f);
                const isExisting = fs.existsSync(f);
                // Simple logic: if it's application file, check contract allowed files
                if (policy.applicationPaths.some(p => rel.includes(p))) {
                    if (contract.protectedFiles?.includes(rel)) {
                        addViolation('protected-file-modified', 'high', f, 0, `Korunan dosya değiştirilemez: ${rel}`);
                    }
                    if (!contract.allowedExistingFiles?.includes(rel) && !contract.allowedNewFiles?.includes(rel)) {
                        addViolation('out-of-scope-file', 'high', f, 0, `Dosya task contract allowedFiles listesinde yok: ${rel}`);
                    }
                }
            });
        }
    }
}

function checkPolicySelfProtection() {
    if (policy.maintenanceMode !== true) {
        addViolation('policy-weakening', 'high', POLICY_FILE, 0, `maintenanceMode true olmalıdır.`);
    }
    if (policy.newFeaturesAllowed !== false) {
        addViolation('policy-weakening', 'high', POLICY_FILE, 0, `newFeaturesAllowed false olmalıdır.`);
    }
    if (policy.baselineAndRatchetRules?.allowGrowth !== false) {
        addViolation('policy-weakening', 'high', POLICY_FILE, 0, `allowGrowth false olmalıdır.`);
    }
    
    const workflowFile = path.join(PROJECT_ROOT, '.github/workflows/agent-compliance.yml');
    if (fs.existsSync(workflowFile)) {
        const wf = fs.readFileSync(workflowFile, 'utf8');
        if (wf.includes('continue-on-error')) {
            addViolation('policy-weakening', 'high', workflowFile, 0, `Workflow içinde continue-on-error kullanılamaz.`);
        }
    }
}

// ---------------------------------------------------------
// Main Scan Loop
// ---------------------------------------------------------

const files = getFilesToScan();

files.forEach(file => {
    if (fs.statSync(file).isDirectory()) return;
    const content = fs.readFileSync(file, 'utf8');
    const ext = path.extname(file);

    if (ext === '.json') {
        checkJson(file, content);
    }
    
    if (ext === '.js') {
        checkJsSyntax(file, content);
        checkUnsafeDom(file, content);
        checkSensitiveBehaviours(file, content);
    }
    
    if (ext === '.html') {
        checkHtml(file, content);
        checkUnsafeDom(file, content);
        checkLanguage(file, content);
        checkSensitiveBehaviours(file, content);
    }
    
    if (ext === '.js' && file.includes('/tests/')) {
        checkTests(file, content);
    }
});

// Post-Scan Baseline Check
Object.keys(baselineCounts).forEach(key => {
    const baselined = baselineCounts[key];
    const actual = currentCounts[key] || 0;
    if (actual < baselined) {
        const [ruleId, relFile] = key.split('|');
        addViolation('stale-baseline-entry', 'high', path.join(PROJECT_ROOT, relFile), 0, `Baseline'da var olan ancak artık kullanılmayan (veya sayısı azalan) kayıt: ${ruleId}`);
    }
});

// Global Checks
checkPackageJson();
checkDocumentationTruth();
checkTaskContract();
checkPolicySelfProtection();

// ---------------------------------------------------------
// Output & Exit
// ---------------------------------------------------------

if (violations.length > 0) {
    console.error(`\n❌ UYUMSUZLUK TESPİT EDİLDİ (${violations.length} hata)`);
    violations.forEach(v => {
        console.error(`[${v.severity.toUpperCase()}] ${v.ruleId} - ${v.file}:${v.line || '?'} -> ${v.msg}`);
    });
    process.exit(1);
} else {
    console.log(`\n✔ Tüm uygunluk kontrolleri başarıyla geçildi.`);
    process.exit(0);
}
