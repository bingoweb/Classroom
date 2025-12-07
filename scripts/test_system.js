// Sistem test scripti
const http = require('http');

const tests = [
    { name: 'Ana Sayfa', url: 'http://localhost:3000/', expected: 200 },
    { name: 'Admin Panel', url: 'http://localhost:3000/admin/', expected: 200 },
    { name: 'API - Öğrenciler', url: 'http://localhost:3000/api/students', expected: 200 },
    { name: 'API - Roller', url: 'http://localhost:3000/api/roles', expected: 200 },
    { name: 'API - Slaytlar', url: 'http://localhost:3000/api/slides', expected: 200 },
    { name: 'API - Ayarlar', url: 'http://localhost:3000/api/settings', expected: 200 },
    { name: 'API - Günün Kelimesi', url: 'http://localhost:3000/api/word', expected: 200 },
    { name: 'API - Program', url: 'http://localhost:3000/api/schedule', expected: 200 },
    { name: 'API - İstatistikler', url: 'http://localhost:3000/api/stats', expected: 200 },
    { name: 'API - Slayt Ayarları', url: 'http://localhost:3000/api/slide-settings', expected: 200 }
];

function testEndpoint(name, url, expectedStatus) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            const statusCode = res.statusCode;
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const success = statusCode === expectedStatus;
                const result = {
                    name,
                    url,
                    status: statusCode,
                    expected: expectedStatus,
                    success,
                    hasData: data.length > 0
                };
                resolve(result);
            });
        }).on('error', (err) => {
            resolve({
                name,
                url,
                status: 0,
                expected: expectedStatus,
                success: false,
                error: err.message,
                hasData: false
            });
        });
    });
}

async function runTests() {
    console.log('🧪 Sistem Testleri Başlatılıyor...\n');
    console.log('='.repeat(80));

    const results = [];
    
    for (const test of tests) {
        const result = await testEndpoint(test.name, test.url, test.expected);
        results.push(result);
        
        const statusIcon = result.success ? '✅' : '❌';
        const statusText = result.success ? 'BAŞARILI' : 'BAŞARISIZ';
        
        console.log(`${statusIcon} ${test.name.padEnd(30)} | Status: ${result.status} | ${statusText}`);
        
        if (!result.success && result.error) {
            console.log(`   ⚠ Hata: ${result.error}`);
        }
        
        // Kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('='.repeat(80));
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);

    console.log(`\n📊 Test Sonuçları:`);
    console.log(`   Toplam: ${totalCount}`);
    console.log(`   Başarılı: ${successCount}`);
    console.log(`   Başarısız: ${totalCount - successCount}`);
    console.log(`   Başarı Oranı: %${successRate}`);

    if (successCount === totalCount) {
        console.log('\n🎉 Tüm testler başarılı! Sistem çalışıyor.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Bazı testler başarısız. Lütfen kontrol edin.');
        process.exit(1);
    }
}

// 3 saniye bekle (server başlasın)
setTimeout(() => {
    runTests();
}, 3000);










