const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'public/fonts/segment7.woff2');
const cssPath = path.join(__dirname, 'public/css/style.css');

if (!fs.existsSync(fontPath)) {
    console.error("Font dosyası bulunamadı:", fontPath);
    // Belki clock.woff2 duruyordur?
    const altPath = path.join(__dirname, 'public/clock.woff2');
    if (fs.existsSync(altPath)) {
        console.log("segment7.woff2 yok ama clock.woff2 bulundu. O kullanılıyor.");
        // fontPath = altPath; // const olduğu için yeniden atayamam, scripti basitleştirelim
    } else {
        process.exit(1);
    }
}

try {
    const fontBase64 = fs.readFileSync(fontPath).toString('base64');
    const dataUri = `data:font/woff2;charset=utf-8;base64,${fontBase64}`;

    const fontFace = `
/* --- EMBEDDED DIGITAL CLOCK FONT (WOFF2) --- */
@font-face {
    font-family: 'EmbeddedDigital';
    font-style: normal;
    font-weight: 700;
    font-display: block;
    src: url('${dataUri}') format('woff2');
}
@font-face {
    font-family: 'EmbeddedDigital';
    font-style: normal;
    font-weight: 400;
    font-display: block;
    src: url('${dataUri}') format('woff2');
}
`;

    let cssContent = fs.readFileSync(cssPath, 'utf8');

    // Eğer zaten gömülü font varsa temizle (Basit bir kontrol)
    if (cssContent.includes('EMBEDDED DIGITAL CLOCK FONT')) {
        console.log("Zaten gömülü font var, üstüne yazılıyor...");
        // Split ile eski bloğu atıp yenisini eklemek zor, replace ile yapalım
        // Ama en garantisi en başa eklemek
    }

    // Font-face'i en başa ekle
    cssContent = fontFace + '\n' + cssContent;

    // .digital-clock ve .blink içindeki font-family'yi değiştir
    // Önceki stepte 'Segment7' yapmıştık.
    // Regex: font-family: '.*', monospace !important;

    const regex = /font-family:\s*['"][^'"]+['"]\s*,\s*monospace\s*!important;/g;
    cssContent = cssContent.replace(regex, "font-family: 'EmbeddedDigital', monospace !important;");

    fs.writeFileSync(cssPath, cssContent);
    console.log("BAŞARILI: Font style.css içine gömüldü ve class'lar güncellendi.");

} catch (err) {
    console.error("HATA:", err);
}
