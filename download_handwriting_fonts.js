const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = [
    {
        name: 'PermanentMarker-Regular.ttf',
        url: 'https://github.com/google/fonts/raw/main/apache/permanentmarker/PermanentMarker-Regular.ttf'
    },
    {
        name: 'Kalam-Regular.ttf',
        url: 'https://github.com/google/fonts/raw/main/ofl/kalam/Kalam-Regular.ttf'
    },
    {
        name: 'PatrickHand-Regular.ttf',
        url: 'https://github.com/google/fonts/raw/main/ofl/patrickhand/PatrickHand-Regular.ttf'
    }
];

const downloadDir = path.join(__dirname, 'public', 'fonts');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

fonts.forEach(font => {
    const file = fs.createWriteStream(path.join(downloadDir, font.name));
    https.get(font.url, function (response) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${font.name}`);
        });
    });
});
