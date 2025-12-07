// Öğrenci fotoğraflarını kontrol eden script
const db = require('./database');
const path = require('path');
const fs = require('fs');

console.log('Öğrenci fotoğrafları kontrol ediliyor...\n');

db.serialize(() => {
    // Tüm öğrencileri getir
    db.all("SELECT id, name, gender, photo FROM students ORDER BY name", [], (err, students) => {
        if (err) {
            console.error('Öğrenci sorgusu hatası:', err);
            process.exit(1);
        }

        if (students.length === 0) {
            console.log('Veritabanında öğrenci bulunamadı.');
            process.exit(0);
        }

        console.log(`Toplam ${students.length} öğrenci bulundu.\n`);
        console.log('='.repeat(80));

        let withPhoto = 0;
        let withoutPhoto = 0;
        let photoExists = 0;
        let photoMissing = 0;
        const missingPhotos = [];

        students.forEach((student, index) => {
            const hasPhoto = student.photo && student.photo.trim() !== '';
            const photoStatus = hasPhoto ? '✓ VAR' : '✗ YOK';

            if (hasPhoto) {
                withPhoto++;
                // Normalize path
                let photoPath = student.photo.replace(/\\/g, '/');
                if (!photoPath.startsWith('http') && !photoPath.startsWith('/')) {
                    photoPath = photoPath;
                }

                // Check if file exists
                const fullPath = path.join(__dirname, photoPath);
                const exists = fs.existsSync(fullPath);

                if (exists) {
                    photoExists++;
                    const stats = fs.statSync(fullPath);
                    const sizeKB = (stats.size / 1024).toFixed(2);
                    console.log(`${index + 1}. ${student.name.padEnd(30)} | ${student.gender} | ${photoStatus} | ${photoPath} | ${sizeKB} KB`);
                } else {
                    photoMissing++;
                    missingPhotos.push({ id: student.id, name: student.name, path: photoPath });
                    console.log(`${index + 1}. ${student.name.padEnd(30)} | ${student.gender} | ${photoStatus} | ${photoPath} | ⚠ DOSYA BULUNAMADI`);
                }
            } else {
                withoutPhoto++;
                const defaultPhoto = student.gender === 'F' ? 'assets/default_girl.png' : 'assets/default_boy.png';
                const defaultExists = fs.existsSync(path.join(__dirname, defaultPhoto));
                const defaultStatus = defaultExists ? '✓' : '✗';
                console.log(`${index + 1}. ${student.name.padEnd(30)} | ${student.gender} | ${photoStatus} | Default: ${defaultPhoto} ${defaultStatus}`);
            }
        });

        console.log('='.repeat(80));
        console.log('\nÖZET:');
        console.log(`  Toplam öğrenci: ${students.length}`);
        console.log(`  Fotoğrafı olan: ${withPhoto}`);
        console.log(`  Fotoğrafı olmayan: ${withoutPhoto}`);
        console.log(`  Fotoğraf dosyası mevcut: ${photoExists}`);
        console.log(`  Fotoğraf dosyası eksik: ${photoMissing}`);

        if (missingPhotos.length > 0) {
            console.log('\n⚠ EKSİK FOTOĞRAF DOSYALARI:');
            missingPhotos.forEach(mp => {
                console.log(`  - ${mp.name} (ID: ${mp.id}): ${mp.path}`);
            });
        }

        if (withoutPhoto > 0) {
            console.log(`\n📝 ${withoutPhoto} öğrencinin fotoğrafı yok - default avatar kullanılacak.`);
        }

        // Roles kontrolü
        console.log('\n' + '='.repeat(80));
        console.log('ROLLER VE FOTOĞRAFLARI:');
        db.all(`
            SELECT r.id as role_id, r.role_type, s.id, s.name, s.gender, s.photo 
            FROM roles r 
            JOIN students s ON r.student_id = s.id 
            ORDER BY r.role_type, s.name
        `, [], (roleErr, roles) => {
            if (roleErr) {
                console.error('Rol sorgusu hatası:', roleErr);
            } else {
                const roleGroups = {
                    'president': [],
                    'duty': [],
                    'star': []
                };

                roles.forEach(role => {
                    if (roleGroups[role.role_type]) {
                        roleGroups[role.role_type].push(role);
                    }
                });

                if (roleGroups.president.length > 0) {
                    console.log('\n👑 Sınıf Başkanı:');
                    roleGroups.president.forEach(r => {
                        const hasPhoto = r.photo && r.photo.trim() !== '';
                        console.log(`  - ${r.name} ${hasPhoto ? '✓' : '✗ (default)'}`);
                    });
                }

                if (roleGroups.duty.length > 0) {
                    console.log('\n📋 Nöbetçiler:');
                    roleGroups.duty.forEach(r => {
                        const hasPhoto = r.photo && r.photo.trim() !== '';
                        console.log(`  - ${r.name} ${hasPhoto ? '✓' : '✗ (default)'}`);
                    });
                }

                if (roleGroups.star.length > 0) {
                    console.log('\n⭐ Haftanın Yıldızları:');
                    roleGroups.star.forEach(r => {
                        const hasPhoto = r.photo && r.photo.trim() !== '';
                        console.log(`  - ${r.name} ${hasPhoto ? '✓' : '✗ (default)'}`);
                    });
                }
            }

            console.log('\n✓ Kontrol tamamlandı!');
            process.exit(0);
        });
    });
});










