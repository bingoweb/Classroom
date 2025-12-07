// Kod doğrulama scripti
const fs = require('fs');
const path = require('path');

console.log('=== KOD DOĞRULAMA ===\n');

// 1. Dosya varlığı kontrolü
const files = [
    'gemini-ai.js',
    'server.js',
    'database.js',
    'package.json',
    '.env'
];

console.log('1. Dosya Kontrolleri:');
files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 2. Package.json kontrolü
console.log('\n2. Package.json Bağımlılıkları:');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = ['dotenv', '@google/generative-ai', 'axios'];
    deps.forEach(dep => {
        const has = pkg.dependencies && pkg.dependencies[dep];
        console.log(`   ${has ? '✅' : '❌'} ${dep}`);
    });
} catch (e) {
    console.log('   ❌ package.json okunamadı');
}

// 3. .env kontrolü
console.log('\n3. .env Dosyası:');
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasGemini = envContent.includes('GEMINI_API_KEY');
    console.log(`   ${hasGemini ? '✅' : '❌'} GEMINI_API_KEY tanımlı`);
} catch (e) {
    console.log('   ❌ .env dosyası okunamadı');
}

// 4. Kod yapısı kontrolü
console.log('\n4. Kod Yapısı Kontrolleri:');
try {
    const geminiCode = fs.readFileSync('gemini-ai.js', 'utf8');
    const checks = [
        { name: 'optimizeSlides fonksiyonu', pattern: /async function optimizeSlides/ },
        { name: 'generateRuleImage fonksiyonu', pattern: /async function generateRuleImage/ },
        { name: 'Nano Banana API çağrısı', pattern: /NANO_BANANA_API_URL/ },
        { name: 'Fallback kaldırıldı', pattern: /heuristicFallback/, shouldExist: false }
    ];
    
    checks.forEach(check => {
        const found = check.pattern.test(geminiCode);
        const result = check.shouldExist === false ? !found : found;
        console.log(`   ${result ? '✅' : '❌'} ${check.name}`);
    });
} catch (e) {
    console.log('   ❌ gemini-ai.js okunamadı');
}

// 5. Server.js kontrolü
console.log('\n5. Server.js Endpoint Kontrolleri:');
try {
    const serverCode = fs.readFileSync('server.js', 'utf8');
    const endpoints = [
        '/api/slides/active',
        '/api/rules/generate-image',
        '/api/rules/:id/approve',
        '/api/rules'
    ];
    
    endpoints.forEach(endpoint => {
        const found = serverCode.includes(endpoint);
        console.log(`   ${found ? '✅' : '❌'} ${endpoint}`);
    });
} catch (e) {
    console.log('   ❌ server.js okunamadı');
}

console.log('\n=== DOĞRULAMA TAMAMLANDI ===');








