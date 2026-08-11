const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

const CLOCK_ROOT = 'public/themes/magic-park/boxes/clock';
const CLOCK_RUNTIME = `${CLOCK_ROOT}/clock.js`;

test('Clock owns a dedicated box package instead of living in shared Magic Park component CSS', () => {
    const themeCss = read('public/themes/magic-park/theme.css');
    const sharedCss = read('public/themes/magic-park/magic-components.css');

    assert.match(themeCss, /@import url\('\.\/boxes\/clock\/clock\.css'\);/);
    assert.ok(exists(`${CLOCK_ROOT}/clock.css`));
    assert.ok(exists(CLOCK_RUNTIME));
    assert.ok(exists(`${CLOCK_ROOT}/README.md`));
    assert.doesNotMatch(sharedCss, /\.clock-observatory|\.digital-clock|\.weekend-pill|\.clock-weather|\.day-highlight|\.date-full/);
});

test('Clock markup is rebuilt as date then day then time, with balanced helper cards', () => {
    const html = read('public/index.html');

    assert.match(html, /class="[^"]*\bclock-board\b[^"]*"/);
    assert.match(html, /class="clock-board__date"[^>]*id="date"|id="date"[^>]*class="clock-board__date"/);
    assert.match(html, /class="clock-board__day"[^>]*id="day-name"|id="day-name"[^>]*class="clock-board__day"/);
    assert.match(html, /class="clock-board__time"[^>]*id="clock"|id="clock"[^>]*class="clock-board__time"/);
    assert.match(html, /class="clock-board__helpers"/);
    assert.match(html, /id="clock-weather"/);
    assert.match(html, /id="weekend-counter"/);
    assert.match(html, /themes\/magic-park\/boxes\/clock\/clock\.js/);

    const dateIndex = html.indexOf('id="date"');
    const dayIndex = html.indexOf('id="day-name"');
    const timeIndex = html.indexOf('id="clock"');
    assert.ok(dateIndex >= 0 && dayIndex > dateIndex && timeIndex > dayIndex, 'Clock reading order must be date → day → time');
});

test('Clock deliberately uses no WebGL, Blender model, or background image', () => {
    const html = read('public/index.html');
    const css = read(`${CLOCK_ROOT}/clock.css`);
    const runtime = read(CLOCK_RUNTIME);

    assert.doesNotMatch(html, /magic-clock-webgl|clock-observatory__stage/);
    assert.doesNotMatch(runtime, /three\.module|GLTFLoader|observatory\.glb|WebGLRenderer|requestAnimationFrame/);
    assert.doesNotMatch(css, /background-image\s*:\s*url\(/i);
    assert.doesNotMatch(css, /mask-image|mix-blend-mode|backdrop-filter/);
    assert.match(css, /linear-gradient\(/);
});

test('Clock package owns its typography and uses Baloo 2 for child-friendly readable numerals', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    assert.ok(exists('public/fonts/baloo2-600.woff2'));
    assert.ok(exists('public/fonts/baloo2-800.woff2'));
    assert.match(css, /@font-face\s*\{[^}]*font-family:\s*'Baloo Clock'/s);
    assert.match(css, /\.clock-board__time\s*\{[^}]*font-family:\s*'Baloo Clock'/s);
    assert.doesNotMatch(css, /Fredoka Classroom|Nunito Classroom/);
});

test('Clock colon keeps a visible local blink animation instead of being frozen', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    const blinkRule = css.match(/\.clock-board__time \.blink\s*\{([^}]*)\}/s);
    assert.ok(blinkRule, 'Clock must own a local colon style');
    assert.doesNotMatch(blinkRule[1], /animation:\s*none/i);
    assert.match(blinkRule[1], /animation:\s*magic-clock-colon-blink\b/i);
    assert.match(css, /@keyframes\s+magic-clock-colon-blink\s*\{/i);
});

test('Clock numerals use a layered 2.5D enamel treatment without WebGL', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    const timeRule = css.match(/\.clock-board__time\s*\{([^}]*)\}/s);
    assert.ok(timeRule, 'Clock time style must exist');
    assert.match(timeRule[1], /text-shadow:\s*[^;]*,[^;]*,[^;]*,[^;]*/s);
    assert.match(timeRule[1], /-webkit-text-stroke:/i);
    assert.match(timeRule[1], /font-size:\s*clamp\(3\.35rem,\s*23\.4cqw,\s*8rem\)/i);
});

test('Every Clock teaching label opts into high-clarity text rendering', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);
    const clarityRule = css.match(/\.clock-board__date,\s*[\s\S]*?\.clock-board__weekend-value\s*\{([^}]*)\}/);

    assert.ok(clarityRule, 'Clock teaching text must share one clarity contract');
    assert.match(clarityRule[1], /text-rendering:\s*geometricPrecision/i);
    assert.match(clarityRule[1], /-webkit-font-smoothing:\s*antialiased/i);
    assert.match(clarityRule[1], /-moz-osx-font-smoothing:\s*grayscale/i);
});

test('Date, day and weekend text use controlled edge contrast instead of flat glyphs', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);
    for (const selector of ['clock-board__date', 'clock-board__day', 'clock-board__weekend-label', 'clock-board__weekend-value']) {
        const rules = [...css.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'gs'))];
        assert.ok(rules.length, `${selector} style must exist`);
        assert.ok(rules.some(rule => /-webkit-text-stroke:/i.test(rule[1]) && /text-shadow:/i.test(rule[1])), `${selector} must own edge contrast`);
    }
});

test('Clock weather artwork uses a multi-layer shadow for legibility over bright cards', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    const iconRule = css.match(/\.clock-board__weather-icon\s*\{([^}]*)\}/s);
    assert.ok(iconRule, 'Weather icon style must exist');
    assert.equal((iconRule[1].match(/drop-shadow\(/g) || []).length, 2);
});

test('Clock weather content is vertically constrained and optically centered inside its own card', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    const cardRule = css.match(/\.clock-board__helper--weather\s*\{([^}]*)\}/s);
    const iconRule = css.match(/\.clock-board__weather-icon\s*\{([^}]*)\}/s);
    const tempRule = css.match(/\.clock-board__weather-temperature\s*\{([^}]*)\}/s);

    assert.ok(cardRule && iconRule && tempRule);
    assert.match(cardRule[1], /grid-template-rows:\s*minmax\(0,\s*1fr\)/);
    assert.match(iconRule[1], /align-self:\s*center/);
    assert.match(iconRule[1], /justify-self:\s*center/);
    assert.match(iconRule[1], /width:\s*auto/);
    assert.match(iconRule[1], /height:\s*100%/);
    assert.match(iconRule[1], /aspect-ratio:\s*1/);
    assert.match(tempRule[1], /align-self:\s*center/);
});

test('Clock weather temperature uses crisp edge treatment for distant classroom reading', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);
    const tempRule = css.match(/\.clock-board__weather-temperature\s*\{([^}]*)\}/s);

    assert.ok(tempRule);
    assert.match(tempRule[1], /text-rendering:\s*geometricPrecision/i);
    assert.match(tempRule[1], /-webkit-font-smoothing:\s*antialiased/i);
    assert.match(tempRule[1], /-webkit-text-stroke:/i);
    assert.match(tempRule[1], /text-shadow:\s*[^;]*,[^;]*,[^;]*/s);
    assert.match(tempRule[1], /font-size:\s*clamp\(1\.05rem,\s*6\.4cqw,\s*1\.85rem\)/);
});

test('Clock helper cards read as opposing inward ribbons', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    const helpersRule = css.match(/\.clock-board__helpers\s*\{([^}]*)\}/s);
    const weatherRule = css.match(/\.clock-board__helper--weather\s*\{([^}]*)\}/s);
    const weekendRule = css.match(/body\.magic-park-theme\.theme-magic-park \.clock-board__helper--weekend\s*\{([^}]*)\}/s);
    const weatherTip = css.match(/\.clock-board__helper--weather::after\s*\{([^}]*)\}/s);
    const weekendTip = css.match(/body\.magic-park-theme\.theme-magic-park \.clock-board__helper--weekend::before\s*\{([^}]*)\}/s);

    assert.ok(helpersRule && weatherRule && weekendRule && weatherTip && weekendTip);
    assert.match(helpersRule[1], /justify-self:\s*center/);
    assert.match(helpersRule[1], /width:\s*112%/);
    assert.match(weatherRule[1], /justify-self:\s*start/);
    assert.match(weekendRule[1], /justify-self:\s*end/);
    assert.match(weatherRule[1], /border-radius:\s*999px\s+1\.1cqw\s+1\.1cqw\s+999px/);
    assert.match(weekendRule[1], /border-radius:\s*1\.1cqw\s+999px\s+999px\s+1\.1cqw/);
    assert.match(weatherTip[1], /rotate\(45deg\)/);
    assert.match(weekendTip[1], /rotate\(45deg\)/);
});

test('Weekend ribbon text stays large enough for distant classroom reading', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);
    assert.match(css, /\.clock-board__weekend-label\s*\{[^}]*font-size:\s*clamp\(0\.68rem,\s*3\.5cqw,\s*1rem\)/s);
    assert.match(css, /\.clock-board__weekend-value\s*\{[^}]*font-size:\s*clamp\(0\.82rem,\s*4\.8cqw,\s*1\.35rem\)/s);
});

test('Clock palette is derived from the real Magic Park shell colors', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);
    for (const hex of ['#0d97dd', '#0278cd', '#055ba4', '#18488a', '#56bae2', '#fcd920', '#f7a006', '#c44818', '#f6fafc', '#d4e6ef']) {
        assert.match(css.toLowerCase(), new RegExp(hex.replace('#', '\\#')));
    }
});

test('Clock layout uses one centered axis and two equal helper cards', () => {
    const css = read(`${CLOCK_ROOT}/clock.css`);

    assert.match(css, /\.clock-board__content\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:/s);
    assert.match(css, /\.clock-board__date-group\s*\{[^}]*text-align:\s*center/s);
    assert.match(css, /\.clock-board__clock-face\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s*35%[^}]*place-items:\s*center/s);
    assert.match(css, /\.clock-board__helpers\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
});

test('day phase boundaries still drive only lightweight gradient palette changes', () => {
    const { getDayPhase } = require('../public/themes/magic-park/boxes/clock/clock.js');

    assert.equal(getDayPhase(4), 'night');
    assert.equal(getDayPhase(5), 'morning');
    assert.equal(getDayPhase(9), 'morning');
    assert.equal(getDayPhase(10), 'day');
    assert.equal(getDayPhase(16), 'day');
    assert.equal(getDayPhase(17), 'evening');
    assert.equal(getDayPhase(20), 'evening');
    assert.equal(getDayPhase(21), 'night');
});

test('WMO weather codes collapse to four allowed kiosk kinds', () => {
    const { weatherCodeToKind } = require('../public/themes/magic-park/boxes/clock/clock.js');

    assert.equal(weatherCodeToKind(0, 1), 'sun');
    assert.equal(weatherCodeToKind(0, 0), 'cloud');
    assert.equal(weatherCodeToKind(3, 1), 'cloud');
    assert.equal(weatherCodeToKind(61, 1), 'rain');
    assert.equal(weatherCodeToKind(95, 1), 'rain');
    assert.equal(weatherCodeToKind(71, 1), 'snow');
});

test('weather payload normalization rejects incomplete data and rounds temperature', () => {
    const { normalizeWeatherPayload } = require('../public/themes/magic-park/boxes/clock/clock.js');

    assert.equal(normalizeWeatherPayload({}), null);
    assert.equal(normalizeWeatherPayload({ current: { temperature_2m: 'x', weather_code: 0 } }), null);
    assert.deepEqual(
        normalizeWeatherPayload({ current: { temperature_2m: 22.6, weather_code: 61, is_day: 1, time: '2026-08-11T21:00' } }),
        { temperature: 23, weatherCode: 61, isDay: true, observedAt: '2026-08-11T21:00' }
    );
});
