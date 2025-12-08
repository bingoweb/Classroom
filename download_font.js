const https = require('https');
const fs = require('fs');
const path = require('path');

// CDNFonts direct link (usually reliable)
// Using http or https
const fontUrl = 'https://github.com/shiffman/The-Nature-of-Code-Examples-p5.js/raw/master/chp08_fractals/NOC_8_09_LSystem/data/digital-7.ttf';
const dest = path.join(__dirname, 'public', 'fonts', 'Digital7Mono.ttf');

const file = fs.createWriteStream(dest);

console.log('Alternatif kaynak indiriliyor...');

https.get(fontUrl, function (response) {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, function (redirectResponse) {
            redirectResponse.pipe(file);
            file.on('finish', () => {
                file.close(() => console.log('Font indirildi (Yönlendirme ile).'));
            });
        });
        return;
    }

    if (response.statusCode !== 200) {
        console.error(`Hata: ${response.statusCode}`);
        return;
    }

    response.pipe(file);
    file.on('finish', function () {
        file.close(() => {
            console.log('Font başarıyla indirildi.');
        });
    });
}).on('error', function (err) {
    console.error('Hata:', err.message);
});
