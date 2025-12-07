// Veritabanı tutarlılığını kontrol eden ve düzelten script
const db = require('./database');
const path = require('path');
const fs = require('fs');

console.log('Veritabanı tutarlılık kontrolü başlatılıyor...');

db.serialize(() => {
    // 1. Slides tablosundaki media_path'leri normalize et
    console.log('1. Slides media_path normalizasyonu...');
    db.all("SELECT id, media_path FROM slides", [], (err, rows) => {
        if (err) {
            console.error('Slides sorgusu hatası:', err);
            return;
        }
        
        let fixed = 0;
        rows.forEach(row => {
            if (row.media_path) {
                // Windows backslash'leri forward slash'e çevir
                const normalized = row.media_path.replace(/\\/g, '/');
                if (normalized !== row.media_path) {
                    db.run("UPDATE slides SET media_path = ? WHERE id = ?", [normalized, row.id], (updateErr) => {
                        if (updateErr) {
                            console.error(`Slayt ${row.id} güncelleme hatası:`, updateErr);
                        } else {
                            fixed++;
                            console.log(`✓ Slayt ${row.id} düzeltildi: ${row.media_path} -> ${normalized}`);
                        }
                    });
                }
            }
        });
        
        setTimeout(() => {
            console.log(`   ${fixed} slayt media_path düzeltildi.`);
            
            // 2. Öğrenci fotoğraflarını kontrol et
            console.log('2. Öğrenci fotoğraf yolları kontrol ediliyor...');
            db.all("SELECT id, photo FROM students WHERE photo IS NOT NULL", [], (err, studentRows) => {
                if (err) {
                    console.error('Öğrenci sorgusu hatası:', err);
                    return;
                }
                
                let photoFixed = 0;
                let photoMissing = 0;
                studentRows.forEach(student => {
                    if (student.photo) {
                        const normalized = student.photo.replace(/\\/g, '/');
                        if (normalized !== student.photo) {
                            db.run("UPDATE students SET photo = ? WHERE id = ?", [normalized, student.id], (updateErr) => {
                                if (!updateErr) {
                                    photoFixed++;
                                }
                            });
                        }
                        
                        // Dosyanın gerçekten var olup olmadığını kontrol et
                        const filePath = path.join(__dirname, normalized);
                        if (!fs.existsSync(filePath)) {
                            photoMissing++;
                            console.log(`⚠ Öğrenci ${student.id} fotoğrafı bulunamadı: ${filePath}`);
                        }
                    }
                });
                
                setTimeout(() => {
                    console.log(`   ${photoFixed} öğrenci fotoğraf yolu düzeltildi.`);
                    if (photoMissing > 0) {
                        console.log(`   ⚠ ${photoMissing} öğrenci fotoğrafı eksik.`);
                    }
                    
                    // 3. Orphaned slides kontrolü (media dosyası olmayan)
                    console.log('3. Orphaned slides kontrol ediliyor...');
                    db.all("SELECT id, media_path FROM slides WHERE media_path IS NOT NULL", [], (err, slideRows) => {
                        if (err) {
                            console.error('Slides sorgusu hatası:', err);
                            return;
                        }
                        
                        let orphaned = 0;
                        slideRows.forEach(slide => {
                            const filePath = path.join(__dirname, slide.media_path);
                            if (!fs.existsSync(filePath)) {
                                orphaned++;
                                console.log(`⚠ Slayt ${slide.id} medya dosyası bulunamadı: ${slide.media_path}`);
                            }
                        });
                        
                        if (orphaned > 0) {
                            console.log(`   ⚠ ${orphaned} slayt medya dosyası eksik.`);
                        } else {
                            console.log('   ✓ Tüm slayt medya dosyaları mevcut.');
                        }
                        
                        // 4. Display order tutarlılığı
                        console.log('4. Display order tutarlılığı kontrol ediliyor...');
                        db.all("SELECT id, display_order FROM slides WHERE is_active = 1 ORDER BY display_order", [], (err, orderRows) => {
                            if (err) {
                                console.error('Display order sorgusu hatası:', err);
                                return;
                            }
                            
                            let reordered = 0;
                            orderRows.forEach((row, index) => {
                                const expectedOrder = index + 1;
                                if (row.display_order !== expectedOrder) {
                                    db.run("UPDATE slides SET display_order = ? WHERE id = ?", [expectedOrder, row.id], (updateErr) => {
                                        if (!updateErr) {
                                            reordered++;
                                        }
                                    });
                                }
                            });
                            
                            setTimeout(() => {
                                if (reordered > 0) {
                                    console.log(`   ✓ ${reordered} slayt display_order düzeltildi.`);
                                } else {
                                    console.log('   ✓ Display order tutarlı.');
                                }
                                
                                console.log('\n✓ Veritabanı tutarlılık kontrolü tamamlandı!');
                                process.exit(0);
                            }, 500);
                        });
                    });
                }, 500);
            });
        }, 500);
    });
});










