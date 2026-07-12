const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();
const POLICY_FILE = path.join(PROJECT_ROOT, 'agent-policy.json');
const BASELINE_FILE = path.join(PROJECT_ROOT, '.agent/quality-baseline.json');
const CONTRACT_FILE = path.join(PROJECT_ROOT, '.agent/task-contract.json');
const CONTRACT_SCHEMA_FILE = path.join(PROJECT_ROOT, '.agent/task-contract.schema.json');
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

const violations = [];

function addViolation(ruleId, severity, file, line, msg) {
    violations.push({ ruleId, severity, file, line, msg });
}

function loadJsonOrDie(file, name) {
    if (!fs.existsSync(file)) {
        if (name === 'Contract') return null;
        console.error(`❌ ${name} bulunamadı: ${file}`);
        process.exit(1);
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`❌ ${name} parse edilemedi: ${e.message}`);
        process.exit(1);
    }
}

const policy = loadJsonOrDie(POLICY_FILE, 'Policy');
const baseline = loadJsonOrDie(BASELINE_FILE, 'Baseline') || [];
const contractSchema = loadJsonOrDie(CONTRACT_SCHEMA_FILE, 'Contract Schema');
let contract = loadJsonOrDie(CONTRACT_FILE, 'Contract');

let baselineCounts = {};
function prepareBaseline() {
    const seen = new Set();
    baseline.forEach(b => {
        const entryStr = JSON.stringify({ruleId: b.ruleId, path: b.path, line: b.line, fingerprint: b.fingerprint});
        if (seen.has(entryStr)) {
            console.error(`❌ quality-baseline.json içerisinde duplicate kayıt tespit edildi: ${entryStr}`);
            process.exit(1);
        }
        seen.add(entryStr);
        if (!b.fingerprint || !/^[a-f0-9]{64}$/.test(b.fingerprint)) {
            console.error(`❌ quality-baseline.json içerisinde geçersiz fingerprint tespit edildi: ${b.fingerprint}`);
            process.exit(1);
        }
        const key = `${b.ruleId}|${b.path}|${b.fingerprint}`;
        baselineCounts[key] = (baselineCounts[key] || 0) + 1;
    });
}
prepareBaseline();
let currentCounts = {};

function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function checkBaselineAllowed(ruleId, relFile, textLine) {
    const fingerprint = sha256(textLine);
    const key = `${ruleId}|${relFile}|${fingerprint}`;
    currentCounts[key] = (currentCounts[key] || 0) + 1;
    
    if (!baselineCounts[key]) return false;
    if (currentCounts[key] > baselineCounts[key]) return false;
    return true;
}

function validateContract() {
    if (!contract) return;
    const req = contractSchema.required || [];
    req.forEach(f => {
        if (contract[f] === undefined) {
            addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `Eksik alan: ${f}`);
        }
    });

    Object.keys(contractSchema.properties || {}).forEach(key => {
        if (contract[key] !== undefined) {
            const type = contractSchema.properties[key].type;
            if (type === 'array' && !Array.isArray(contract[key])) {
                addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `${key} bir array olmalıdır.`);
            } else if (type === 'boolean' && typeof contract[key] !== 'boolean') {
                addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `${key} bir boolean olmalıdır.`);
            } else if (type === 'string' && typeof contract[key] !== 'string') {
                addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `${key} bir string olmalıdır.`);
            }
        }
    });

    if (contract.newFeaturesAllowed !== false) {
        addViolation('task-contract-new-features', 'high', '.agent/task-contract.json', 0, `newFeaturesAllowed false olmalıdır.`);
    }

    if (!contract.taskId || contract.taskId.trim() === '') {
        addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `taskId boş olamaz.`);
    }

    if (contract.changeType && contractSchema.properties.changeType?.enum && !contractSchema.properties.changeType.enum.includes(contract.changeType)) {
        addViolation('task-contract-change-type', 'high', '.agent/task-contract.json', 0, `changeType geçersiz: ${contract.changeType}`);
    }

    if (!contract.baseCommit || !/^[0-9a-f]{40}$/.test(contract.baseCommit)) {
        addViolation('task-contract-base-commit', 'high', '.agent/task-contract.json', 0, `baseCommit 40 karakterlik SHA olmalıdır.`);
    }

    const arrays = ['allowedExistingFiles', 'allowedNewFiles', 'protectedFiles', 'allowedSensitiveChanges', 'allowedUiStructureChanges', 'allowedBackendChanges', 'allowedDatabaseChanges', 'allowedDependencyChanges'];
    arrays.forEach(arrName => {
        if (Array.isArray(contract[arrName])) {
            const set = new Set();
            contract[arrName].forEach(f => {
                if (set.has(f)) addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `Duplicate allowlist entry: ${f} in ${arrName}`);
                if (path.isAbsolute(f)) addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `Absolute path yasak: ${f}`);
                if (f.includes('..')) addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `Path traversal yasak: ${f}`);
                set.add(f);
            });
        }
    });
}
validateContract();

let changedFilesStatus = {};
let addedLinesByFile = {};

function determineBaseAndHead() {
    let base = '', head = 'HEAD';
    if (modes.ci) {
        base = process.env.BASE_SHA;
        head = process.env.HEAD_SHA;
        if (!base || !head || base === '0000000000000000000000000000000000000000') {
            console.error(`❌ CI ortamında geçerli BASE_SHA ve HEAD_SHA bulunamadı.`);
            process.exit(1);
        }
        if (contract && contract.baseCommit !== base) {
            addViolation('invalid-task-contract', 'high', '.agent/task-contract.json', 0, `Contract baseCommit (${contract.baseCommit}) BASE_SHA (${base}) ile eslesmiyor.`);
        }
    } else if (modes.staged) {
        if (!contract) {
            console.error(`❌ --staged modunda task contract zorunludur.`);
            process.exit(1);
        }
        base = contract.baseCommit;
        head = '';
        
        try {
            const targetBase = execSync('git merge-base HEAD origin/ilk-surum-gelistirme 2>/dev/null || git merge-base HEAD master 2>/dev/null || echo ""', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
            if (targetBase && targetBase !== base) {
                addViolation('task-contract-base-commit', 'high', '.agent/task-contract.json', 0, `baseCommit (${base}) branchin baslangic commit'i (${targetBase}) ile eslesmiyor.`);
            }
        } catch (e) {}
    } else {
        return null;
    }
    return { base, head };
}

function parseGitDiffs() {
    const range = determineBaseAndHead();
    if (!range) return;
    const { base, head } = range;
    
    try {
        let nameStatusCmd = modes.staged ? 'git diff --cached --name-status' : `git diff --name-status ${base} ${head}`;
        const nsOutput = execSync(nameStatusCmd, { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
        nsOutput.split('\n').filter(Boolean).forEach(line => {
            const parts = line.split('\t');
            const status = parts[0][0];
            const file = parts[parts.length - 1];
            changedFilesStatus[file] = status;
        });

        let diffCmd = modes.staged ? 'git diff --cached --unified=0' : `git diff --unified=0 ${base} ${head}`;
        const diffOutput = execSync(diffCmd, { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
        let currentFile = null;
        diffOutput.split('\n').forEach(line => {
            if (line.startsWith('+++ b/')) {
                currentFile = line.replace('+++ b/', '');
                addedLinesByFile[currentFile] = [];
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                if (currentFile) addedLinesByFile[currentFile].push(line.substring(1));
            }
        });
    } catch (e) {
        console.error(`❌ Git diff çalıştırılamadı: ${e.message}`);
        process.exit(1);
    }
}
parseGitDiffs();

function enforceMixedCommits() {
    if (!modes.staged && !modes.ci) return;

    let commitsToCheck = [];
    if (modes.ci) {
        const { base, head } = determineBaseAndHead();
        const revs = execSync(`git rev-list ${base}..${head}`, { cwd: PROJECT_ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
        commitsToCheck = revs;
    } else {
        commitsToCheck = ['staged'];
    }

    commitsToCheck.forEach(commit => {
        let hasContractChange = false;
        let hasPolicyChange = false;
        let hasBaselineChange = false;
        let hasAppChange = false;
        let hasDocChange = false;
        let fileCount = 0;

        let files = [];
        if (commit === 'staged') {
            files = Object.keys(changedFilesStatus);
        } else {
            const nsOutput = execSync(`git diff-tree --no-commit-id --name-only -r ${commit}`, { cwd: PROJECT_ROOT, encoding: 'utf8' });
            files = nsOutput.split('\n').filter(Boolean);
        }

        files.forEach(file => {
            fileCount++;
            if (file === '.agent/task-contract.json') hasContractChange = true;
            else if (policy.policySensitivePaths && policy.policySensitivePaths.some(p => file.includes(p))) hasPolicyChange = true;
            
            if (file === '.agent/quality-baseline.json') hasBaselineChange = true;
            
            if (policy.applicationPaths && policy.applicationPaths.some(p => file.includes(p)) || file.includes('/tests/')) hasAppChange = true;
            
            if (policy.documentationPaths && policy.documentationPaths.some(p => file.includes(p))) hasDocChange = true;
        });

        if (hasContractChange && fileCount > 1) {
            addViolation('mixed-commit', 'high', 'git', 0, `Task contract değiştiğinde başka dosya değiştirilemez. Commit: ${commit}`);
        }

        if (hasPolicyChange && hasAppChange) {
            addViolation('mixed-commit', 'high', 'git', 0, `Policy dosyaları ile uygulama dosyaları aynı committe değiştirilemez. Commit: ${commit}`);
        }

        if (hasBaselineChange && hasAppChange) {
            addViolation('mixed-commit', 'high', 'git', 0, `Baseline ile uygulama dosyaları aynı committe değiştirilemez. Commit: ${commit}`);
        }

        if (contract && contract.documentationRequired && hasDocChange && hasAppChange) {
             addViolation('mixed-commit', 'high', 'git', 0, `Dokümantasyon ile uygulama kodu ayrı commitlerde olmalıdır. Commit: ${commit}`);
        }
    });
}

function enforceScope() {
    if (!modes.staged && !modes.ci) return;
    
    Object.keys(changedFilesStatus).forEach(file => {
        if (file === '.agent/task-contract.json') return;
        
        const status = changedFilesStatus[file];
        if (contract && contract.protectedFiles && contract.protectedFiles.includes(file)) {
            addViolation('protected-file-modified', 'high', file, 0, `Korunan dosya değiştirilemez.`);
        }
        if (status === 'M') {
            if (!contract || !contract.allowedExistingFiles || !contract.allowedExistingFiles.includes(file)) {
                addViolation('out-of-scope-file', 'high', file, 0, `Mevcut dosya izinsiz değiştirildi: ${file}`);
            }
        } else if (status === 'A') {
            if (!contract || !contract.allowedNewFiles || !contract.allowedNewFiles.includes(file)) {
                addViolation('out-of-scope-file', 'high', file, 0, `Yeni dosya izinsiz eklendi: ${file}`);
            }
        } else if (status === 'D') {
             if (!contract || !contract.allowedExistingFiles || !contract.allowedExistingFiles.includes(file)) {
                addViolation('out-of-scope-file', 'high', file, 0, `Dosya izinsiz silindi: ${file}`);
             }
        } else if (status === 'R') {
             if (!contract || (!contract.allowedNewFiles?.includes(file) && !contract.allowedExistingFiles?.includes(file))) {
                addViolation('out-of-scope-file', 'high', file, 0, `Dosya izinsiz yeniden adlandırıldı: ${file}`);
             }
        }
    });
}
enforceMixedCommits();
enforceScope();

function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) return [];
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

function getFilesToScan() {
    if (modes.staged || modes.ci) {
        return Object.keys(changedFilesStatus)
            .filter(f => changedFilesStatus[f] !== 'D')
            .map(f => path.join(PROJECT_ROOT, f));
    }
    return getAllFiles(PROJECT_ROOT).filter(f => !f.includes('/node_modules/') && !f.includes('/.git/'));
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
    if (relFile === 'public/admin/index.html') {
        const reqIds = policy.adminHtmlRequirements?.requiredIds || [];
        reqIds.forEach(id => {
            if (!content.includes(`id="${id}"`)) {
                if (!checkBaselineAllowed('missing-required-id', relFile, id)) {
                    addViolation('missing-required-id', 'high', filePath, 0, `HTML dosyasında zorunlu ID eksik: ${id}`);
                }
            }
        });
    }
}

function checkUnsafeDom(filePath, content) {
    const relFile = path.relative(PROJECT_ROOT, filePath);
    const lines = content.split('\n');
    const prohibited = policy.prohibitedUnsafeDomPatterns || [];
    
    lines.forEach((line, i) => {
        prohibited.forEach(p => {
            if (line.includes(p)) {
                if (!checkBaselineAllowed('unsafe-dom-inner-html', relFile, line)) {
                    addViolation('unsafe-dom-inner-html', 'high', filePath, i+1, `Yasaklı API: ${p}`);
                }
            }
        });
    });
}

function checkSensitiveBehaviours(filePath, content) {
    if (filePath.includes('/tests/') || filePath.includes('/scripts/') || filePath.includes('/fixtures/')) return;
    const relFile = path.relative(PROJECT_ROOT, filePath);
    const added = addedLinesByFile[relFile];
    if (!added || added.length === 0) return;

    added.forEach((line, i) => {
        const networkStorage = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'caches.', 'serviceWorker'];
        networkStorage.forEach(p => {
            if (line.includes(p)) {
                if (!contract?.allowedSensitiveChanges?.includes(relFile)) {
                    addViolation('unapproved-network-storage', 'high', filePath, i+1, `İzinsiz hassas API: ${p}`);
                }
            }
        });

        if (line.match(/app\.(get|post|put|patch|delete)\(/i) || line.match(/router\./i)) {
            if (!contract?.allowedBackendChanges?.includes(relFile)) {
                addViolation('unapproved-backend-change', 'high', filePath, i+1, `İzinsiz backend route değişikliği`);
            }
        }

        if (line.match(/CREATE TABLE/i) || line.match(/ALTER TABLE/i) || line.match(/DROP TABLE/i) || line.includes('db.run(') || line.includes('db.all(')) {
            if (!contract?.allowedDatabaseChanges?.includes(relFile)) {
                addViolation('unapproved-database-change', 'high', filePath, i+1, `İzinsiz veritabanı değişikliği`);
            }
        }

        if (line.match(/<button/i) || line.match(/<table/i) || line.match(/<form/i)) {
            if (!contract?.allowedUiStructureChanges?.includes(relFile)) {
                addViolation('unapproved-ui-structure', 'high', filePath, i+1, `İzinsiz UI yapısal değişiklik`);
            }
        }
    });
}

function checkTests(filePath, content) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('.only(') || line.includes('.skip(') || line.includes('.todo(')) {
            addViolation('prohibited-test-pattern', 'high', filePath, i+1, `Yasaklı test kalıbı: ${line.trim()}`);
        }
        if (line.includes('assert.equal(true, true)') || line.includes('assert.ok(true)')) {
            addViolation('prohibited-test-pattern', 'high', filePath, i+1, `Anlamsız test assertion`);
        }
    });
}

function checkPackageJson() {
    if (!fs.existsSync(PACKAGE_JSON)) return;
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    
    const expectedGateCi = 'npm run policy:ci && npm run test:core';
    if (pkg.scripts['gate:ci'] !== expectedGateCi) {
        addViolation('missing-package-script', 'high', PACKAGE_JSON, 0, `gate:ci scripti yanlış.`);
    }

    const coreScript = pkg.scripts['test:core'] || '';
    const testFiles = getAllFiles(TESTS_DIR).filter(f => f.endsWith('.test.js')).map(f => path.relative(PROJECT_ROOT, f));
    
    testFiles.forEach(tf => {
        const matches = coreScript.split(' ').filter(p => p === tf);
        if (matches.length === 0) {
            addViolation('missing-core-test', 'high', PACKAGE_JSON, 0, `Test dosyası test:core içerisinde yok: ${tf}`);
        } else if (matches.length > 1) {
            addViolation('missing-core-test', 'high', PACKAGE_JSON, 0, `Test dosyası test:core içerisinde birden fazla kez tanımlı: ${tf}`);
        }
    });

    const referencedFiles = coreScript.split(' ').filter(p => p.endsWith('.test.js'));
    referencedFiles.forEach(rf => {
        if (!fs.existsSync(path.join(PROJECT_ROOT, rf))) {
            addViolation('missing-core-test', 'high', PACKAGE_JSON, 0, `Olmayan test dosyası referansı: ${rf}`);
        }
    });

    if (modes.staged || modes.ci) {
        if (changedFilesStatus['package.json'] === 'M') {
            const added = addedLinesByFile['package.json'] || [];
            if (added.length > 0 && !contract?.allowedDependencyChanges?.includes('package.json')) {
                addViolation('unapproved-dependency-change', 'high', PACKAGE_JSON, 0, `İzinsiz bağımlılık değişikliği.`);
            }
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
        if (!wf.includes('fetch-depth: 0')) {
            addViolation('policy-weakening', 'high', workflowFile, 0, `Workflow içinde fetch-depth: 0 olmalıdır.`);
        }
    }
}

function validateBaselineRatchet() {
    if (!modes.ci && !modes.staged) return;
    const range = determineBaseAndHead();
    if (!range) return;

    let baseBaselineStr = '';
    try {
        baseBaselineStr = execSync(`git show ${range.base}:.agent/quality-baseline.json`, { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
    } catch (e) {
        return;
    }

    let baseBaseline = [];
    try {
        baseBaseline = JSON.parse(baseBaselineStr);
    } catch (e) {
        return;
    }

    let baseCounts = {};
    baseBaseline.forEach(b => {
        const key = `${b.ruleId}|${b.path}|${b.fingerprint}`;
        baseCounts[key] = (baseCounts[key] || 0) + 1;
    });

    const currentTotal = baseline.length;
    const baseTotal = baseBaseline.length;
    
    if (currentTotal > baseTotal) {
        addViolation('baseline-growth', 'high', BASELINE_FILE, 0, `Baseline büyüyemez.`);
    }

    baseline.forEach(b => {
        const key = `${b.ruleId}|${b.path}|${b.fingerprint}`;
        if (!baseCounts[key]) {
            addViolation('baseline-addition', 'high', BASELINE_FILE, 0, `Baseline'a yeni kayıt eklenemez: ${key}`);
        }
    });
}

function checkDocsTruth() {
    if (fs.existsSync(AI_CONTEXT_FILE)) {
        const content = fs.readFileSync(AI_CONTEXT_FILE, 'utf8');
        if (content.includes('PUT persistence')) {
            addViolation('false-docs-claim', 'high', AI_CONTEXT_FILE, 0, `PUT persistence tavsiyesi kaldirilmalidir.`);
        }
    }
}

const filesToScan = getFilesToScan();
filesToScan.forEach(file => {
    if (fs.statSync(file).isDirectory()) return;
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const ext = path.extname(file);

    if (ext === '.js') {
        checkJsSyntax(file, content);
        checkUnsafeDom(file, content);
        checkSensitiveBehaviours(file, content);
    }
    
    if (ext === '.html') {
        checkHtml(file, content);
        checkUnsafeDom(file, content);
        checkSensitiveBehaviours(file, content);
    }
    
    if (ext === '.js' && file.includes('/tests/')) {
        checkTests(file, content);
    }
});

Object.keys(baselineCounts).forEach(key => {
    const [ruleId, relFile] = key.split('|');
    const fullPath = path.join(PROJECT_ROOT, relFile);
    if (!filesToScan.includes(fullPath)) return;
    const baselined = baselineCounts[key];
    const actual = currentCounts[key] || 0;
    if (actual < baselined) {
        addViolation('stale-baseline-entry', 'high', relFile, 0, `Baseline'da var olan ancak kullanılmayan kayıt: ${ruleId}`);
    } else if (actual > baselined) {
        addViolation('baseline-exceeded', 'high', relFile, 0, `Baseline sınırı aşıldı: ${ruleId}`);
    }
});

checkPackageJson();
checkPolicySelfProtection();
validateBaselineRatchet();
checkDocsTruth();

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
