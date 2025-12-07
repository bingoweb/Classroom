const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'public/fonts/MyDigitalClock.ttf');
const cssPath = path.join(__dirname, 'public/css/fonts.css');

try {
    console.log("İşlem başlıyor...");

    if (!fs.existsSync(fontPath)) {
        console.error('HATA: Font dosyası bulunamadı:', fontPath);
        process.exit(1);
    }

    const fontBuffer = fs.readFileSync(fontPath);
    console.log(`Font dosyası okundu (${fontBuffer.length} bytes).`);

    // Base64 çevrimi
    const fontBase64 = fontBuffer.toString('base64');
    const dataUri = `data:font/ttf;charset=utf-8;base64,${fontBase64}`;

    let cssContent = fs.readFileSync(cssPath, 'utf8');

    // Hedef font bloğunu oluştur
    const newFontFaceBlock = `/* --- DIGITAL CLOCK --- */
@font-face {
  font-family: 'MyClockFont';
  font-style: normal;
  font-weight: 700;
  font-display: block;
  src: url('${dataUri}') format('truetype');
}`;

    // Dosyadaki eski Digital Clock bloğunu bul ve değiştir
    // En güvenli yöntem: "/* --- DIGITAL CLOCK --- */" yorumundan sonrasını tamamen silip yenisini eklemek
    // çünkü bu blok dosyanın en sonundaydı.

    if (cssContent.includes('/* --- DIGITAL CLOCK --- */')) {
        const parts = cssContent.split('/* --- DIGITAL CLOCK --- */');
        // İlk parçayı al (önceki fontlar), sonuna yeni bloğu ekle
        cssContent = parts[0].trim() + '\n\n' + newFontFaceBlock;
        console.log("CSS dosyası güncellendi (Eski blok değiştirildi).");
    } else {
        // Blok yoksa sona ekle
        cssContent += '\n\n' + newFontFaceBlock;
        console.log("CSS dosyası güncellendi (Sona eklendi).");
    }

    fs.writeFileSync(cssPath, cssContent);
    console.log('BAŞARILI: Font dosyası CSS icine başarıyla gömüldü.');

} catch (err) {
    console.error('BEKLENMEYEN HATA:', err);
    process.exit(1);
}
