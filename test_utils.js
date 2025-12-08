const { normalizePath } = require('./backend/utils');

const badPath = 'C:\\Users\\tayla\\OneDrive\\Masaüstü\\sonpanel_Anti\\backend\\uploads\\slides\\1765115898337-rwort6.mp4';
const badPath2 = '/C:/Users/tayla/OneDrive/Masaüstü/sonpanel_Anti/backend/uploads/slides/1765115898337-rwort6.mp4';

console.log('Fixed 1:', normalizePath(badPath, true));
console.log('Fixed 2:', normalizePath(badPath2, true));
