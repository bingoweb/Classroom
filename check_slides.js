const https = require('http'); // HTTP for localhost

const url = 'http://localhost:3000/api/slides';

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const slides = JSON.parse(data);
            console.log('Total Slides:', slides.length);
            slides.forEach(slide => {
                console.log('------------------------------------------------');
                console.log('ID:', slide.id);
                console.log('Title:', slide.title);
                console.log('Content Type:', slide.content_type);
                console.log('Media Type:', slide.media_type);
                console.log('Path:', slide.media_path);
                console.log('Text Content:', slide.text_content || '(empty)');
                console.log('Is Active:', slide.is_active);
                console.log('Order:', slide.display_order);
            });
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw data:', data);
        }
    });

}).on('error', (err) => {
    console.error('Error fetching slides:', err.message);
});
