const http = require('http');

http.get('http://localhost:3000/api/slides', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const slides = JSON.parse(data);
            if (slides[0] && slides[0].text_content) {
                const tc = slides[0].text_content;
                console.log('=== IMAGE SIZE CHECK ===');

                // Check specific width values
                const widthMatch = tc.match(/width:\s*[\d.]+px/g);
                console.log('Width values in HTML:', widthMatch);

                console.log('\n=== FONT SIZE CHECK ===');
                console.log('Contains font-size:', tc.includes('font-size'));
                console.log('Contains 56px:', tc.includes('56px'));
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    });
});
