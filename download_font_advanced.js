const https = require('https');
const fs = require('fs');
const path = require('path');

const fontUrl = 'https://github.com/skishore/makemeahankook/raw/master/data/digital-7.ttf';
const dest = path.join(__dirname, 'public', 'fonts', 'Digital7Mono.ttf');

const file = fs.createWriteStream(dest);
console.log('Font indiriliyor...');

function download(url) {
    https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            download(res.headers.location);
            return;
        }
        if (res.statusCode !== 200) { console.log('Hata: ' + res.statusCode); return; }
        res.pipe(file);
        file.on('finish', () => file.close(() => console.log('DONE')));
    });
}
download(fontUrl);
