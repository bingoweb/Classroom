# Magic Park Ders Akışı Büyülü Cam Amblem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portakallı gazoz, kavanoz ve alt bağlam katmanına dokunmadan Ders Akışı başlığı, kalan süre açıklaması ve ana sayacı Büyülü Cam Amblem sistemiyle yeniden tasarlamak.

**Architecture:** Kutuya özel JSON yeni `typography` sözleşmesinin tek sahibi olur. Controller bu sözleşmeyi doğrulanmış CSS custom property'lerine aktarır ve sayaç değerini erişilebilir segmentlere böler. Bütün görünüm kutuya özel CSS pseudo-elementleri, gradyan harf yüzleri ve kısa GSAP/CSS hareketleriyle üretilir; Three.js/LiquidFun katmanı değişmez.

**Tech Stack:** Box-local JSON, CSS container units, CSS custom properties, GSAP, mevcut vanilla JavaScript controller, Node test runner, Playwright canlı kiosk kabulü.

**Durum:** Tamamlandı — 12 Ağustos 2026.

## Global Constraints

- Yalnız `title`, `kicker` ve countdown tipografisi değişir; `ŞİMDİ / sıradaki` bağlam alanı değişmez.
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.css` bütün görsel kuralların tek sahibidir.
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json` renk ve hareket değerlerinin tek sahibidir.
- `water` JSON dalının SHA-256 değeri uygulama öncesi ve sonrası `0d998ee65eef4315d061bea9083260eba07c0043f6860aca463e90015666f0b9` kalmalıdır.
- `createThreeFlowLayer` bloğunun SHA-256 değeri uygulama öncesi ve sonrası `eae2626f580b7fe39fda52ede427b9ce191f50905c52ba462868d813c500498d` kalmalıdır.
- Yeni resim, ikon, harf, oyuncak, boncuk veya üçüncü taraf bağımlılık eklenmez.
- Commit/push bu planda yoktur; yalnız ayrıca açık yetki verilirse yapılır.

---

### Task 1: Kutuya özel tipografi sözleşmesi

**Files:**

- Modify: `tests/magic-lesson-flow.test.js`
- Modify: `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json`

**Interfaces:**

- Consumes: mevcut JSON kök nesnesi ve `timingMs` sözleşmesi.
- Produces: `manifest.typography` nesnesi; Task 2 ve Task 3 bu alan adlarını aynen kullanır.

- [x] **Step 1: Yazı sözleşmesini isteyen kırmızı testi yaz**

```js
assert.deepEqual(manifest.typography, {
    concept: 'enchanted-glass-crest',
    palette: {
        dryFace: '#245D5B',
        dryEdge: '#FFF8E6',
        wetFace: '#FFF8E6',
        wetEdge: '#245D5B',
        depth: '#5D3C78',
        glass: '#8FE8E1',
        warmGlint: '#FFB12D'
    },
    motionMs: {
        titleSettle: 520,
        kickerReveal: 380,
        separatorPulse: 1000,
        sheenCycle: 9000
    },
    depthLayers: 4
});
```

- [x] **Step 2: Odaklı testi çalıştır ve eski JSON nedeniyle kırmızı olduğunu doğrula**

Run: `node --test --test-name-pattern='enchanted glass typography contract' tests/magic-lesson-flow.test.js`

Expected: FAIL; `manifest.typography` mevcut değildir.

- [x] **Step 3: JSON köküne tam sözleşmeyi ekle**

`typography`, `motion` ile `water` arasında bulunur. `water` dalı yeniden biçimlendirilmez veya değiştirilmez.

- [x] **Step 4: Odaklı testi yeşile geçir**

Run: `node --test --test-name-pattern='enchanted glass typography contract' tests/magic-lesson-flow.test.js`

Expected: PASS.

### Task 2: Erişilebilir sayaç segmentleri ve JSON değişken aktarımı

**Files:**

- Modify: `tests/magic-lesson-flow.test.js`
- Modify: `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`

**Interfaces:**

- Produces: `splitCountdownParts(value: string): string[] | null`.
- Produces: `renderPrimaryValue(node, value, isCountdown)`; countdown sırasında `.lesson-flow__digits` ve `.lesson-flow__separator` span'lerini günceller.
- Produces: `applyTypographyStyle(scene, typography)`; güvenli renk/süre değerlerini `--lesson-flow-*` custom property'lerine aktarır.

- [x] **Step 1: Saf segmentleme ve DOM sözleşmesi testlerini kırmızı yaz**

```js
assert.deepEqual(splitCountdownParts('18:00'), ['18', ':', '00']);
assert.deepEqual(splitCountdownParts('1:05:09'), ['1', ':', '05', ':', '09']);
assert.equal(splitCountdownParts('Ders bilgisi hazırlanıyor'), null);
assert.match(runtime, /lesson-flow__separator/);
assert.match(runtime, /applyTypographyStyle/);
```

- [x] **Step 2: Testi çalıştır ve eksik fonksiyonlarla kırmızı olduğunu doğrula**

Run: `node --test --test-name-pattern='countdown typography segments|typography manifest values' tests/magic-lesson-flow.test.js`

Expected: FAIL; `splitCountdownParts` dışa aktarılmamıştır.

- [x] **Step 3: `splitCountdownParts` saf fonksiyonunu controller'dan önce ekle**

```js
function splitCountdownParts(value) {
    const text = safeText(value);
    if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) return null;
    return text.split(/(:)/).filter(Boolean);
}
```

- [x] **Step 4: `renderPrimaryValue` ile yalnız sayaç DOM'unu segmentlere ayır**

- Çift indeksler `.lesson-flow__digits`, tek indeksler `.lesson-flow__separator` olur.
- `node.setAttribute('aria-label', value)` korunur.
- Countdown olmayan mesajlarda `textContent` kullanılır ve `aria-label` kaldırılır.
- Aynı değer tekrar gelirse DOM yeniden kurulmaz.

- [x] **Step 5: `applyTypographyStyle` ile yalnız izinli JSON alanlarını CSS'e aktar**

```js
const typographyProperties = {
    dryFace: '--lesson-flow-type-dry-face',
    dryEdge: '--lesson-flow-type-dry-edge',
    wetFace: '--lesson-flow-type-wet-face',
    wetEdge: '--lesson-flow-type-wet-edge',
    depth: '--lesson-flow-type-depth',
    glass: '--lesson-flow-type-glass',
    warmGlint: '--lesson-flow-type-warm-glint'
};
```

Renkler yalnız `^#[0-9a-f]{6}$` eşleşirse; süreler yalnız `200..20000` ms aralığındaysa aktarılır.

- [x] **Step 6: Manifest yüklemede `applyTypographyStyle(scene, manifest.typography)` çağır**

Three.js katmanına veya `water` alanına yeni çağrı eklenmez.

- [x] **Step 7: Segment ve manifest testlerini yeşile geçir**

Run: `node --test --test-name-pattern='countdown typography segments|typography manifest values' tests/magic-lesson-flow.test.js`

Expected: PASS.

### Task 3: Büyülü Cam Amblem CSS sistemi

**Files:**

- Modify: `tests/magic-lesson-flow.test.js`
- Modify: `public/themes/magic-park/boxes/lesson-flow/lesson-flow.css`

**Interfaces:**

- Consumes: Task 1 JSON alanlarından Task 2'nin ürettiği `--lesson-flow-type-*`, `--lesson-flow-title-settle`, `--lesson-flow-kicker-reveal`, `--lesson-flow-separator-pulse`, `--lesson-flow-crest-sheen` değişkenleri.
- Consumes: mevcut `.is-on-fill` sınıfları ve `.lesson-flow__separator` span'i.
- Produces: şekilli saydam amblem, ışık raylı kicker, dört katmanlı emaye sayaç ve reduced-motion fallback.

- [x] **Step 1: Görsel sözleşme testini kırmızı yaz**

```js
assert.match(css, /\.lesson-flow__title::before/);
assert.match(css, /\.lesson-flow__title::after/);
assert.match(css, /clip-path:\s*polygon/);
assert.match(css, /\.lesson-flow__kicker::before/);
assert.match(css, /\.lesson-flow__kicker::after/);
assert.match(css, /\.lesson-flow__separator/);
assert.match(css, /@keyframes lesson-flow-separator-breathe/);
assert.match(css, /background-clip:\s*text/);
assert.match(css, /prefers-reduced-motion/);
```

- [x] **Step 2: Testi çalıştır ve eski hap/kicker nedeniyle kırmızı olduğunu doğrula**

Run: `node --test --test-name-pattern='enchanted glass crest CSS' tests/magic-lesson-flow.test.js`

Expected: FAIL; yeni pseudo-element ve keyframe sözleşmesi yoktur.

- [x] **Step 3: Sahne varsayılan custom property'lerini ekle**

JSON yüklenmeden önce bile palet ve süreler Task 1 değerleriyle aynı görünür.

- [x] **Step 4: İç grid'i gerçek hiyerarşiye ayarla**

`grid-template-rows` başlık ve kicker'ı yakın, sayacı ana odak yapacak şekilde güncellenir. `inset` ve alt bağlam satırı değiştirilmez.

- [x] **Step 5: Başlık hapını saydam cam armaya dönüştür**

- Ana yüzey opaklığı `0.12` değerini geçmez.
- `::before` iki kenarlı kesimli arma siluetini, `::after` yavaş speküler yayı üretir.
- Metin katmanı pseudo-elementlerin üzerinde kalır.

- [x] **Step 6: Kicker ışık raylarını ekle**

`display:flex` ve `::before/::after` gradyan rayları kullanılır; yeni ikon veya DOM gerekmez.

- [x] **Step 7: Sayaç yüzünü dört kısa derinlik katmanıyla çiz**

- Kuru durumda petrol yüz + krem çizgi.
- `.is-on-fill` durumunda krem yüz + petrol çizgi.
- Mor/petrol ekstrüzyon en fazla `0.10em` aşağı iner.
- `background-clip:text` gradyanı emaye yüzü verir; metin okunamazsa `color` fallback'i vardır.

- [x] **Step 8: Yalnız ayraçlara bir saniyelik düşük genlikli nefes ekle**

Opacity aralığı `0.72..1`, scale aralığı `0.97..1.02` olur. Rakamlar sürekli hareket etmez.

- [x] **Step 9: Reduced-motion altında yeni animasyonları kapat**

Arma ve sayaç son görsel durumda kalır.

- [x] **Step 10: CSS sözleşme testini yeşile geçir**

Run: `node --test --test-name-pattern='enchanted glass crest CSS' tests/magic-lesson-flow.test.js`

Expected: PASS.

### Task 4: Canlı kabul ve proje kaydı

**Files:**

- Modify: `public/themes/magic-park/boxes/lesson-flow/README.md`
- Modify: `docs/PROJE_OZETI.md`
- Modify: `docs/superpowers/plans/2026-08-12-magic-park-lesson-flow-typography-implementation.md`

**Interfaces:**

- Consumes: tamamlanmış JSON/JS/CSS yazı sistemi.
- Produces: gerçek kiosk kabul kaydı ve sıvı-katmanı değişmezlik kanıtı.

- [x] **Step 1: Odaklı test, sözdizimi, JSON ve diff kontrolünü çalıştır**

Run:

```bash
node --check public/themes/magic-park/boxes/lesson-flow/lesson-flow.js
node -e "JSON.parse(require('node:fs').readFileSync('public/themes/magic-park/boxes/lesson-flow/lesson-flow.json','utf8'))"
node --test tests/magic-lesson-flow.test.js
git diff --check
```

Expected: bütün komutlar sıfır çıkış kodu; Ders Akışı testlerinin tamamı geçer.

- [x] **Step 2: Sıvı değişmezlik SHA-256 değerlerini yeniden hesapla**

Expected:

```text
liquid-layer eae2626f580b7fe39fda52ede427b9ce191f50905c52ba462868d813c500498d
water-json 0d998ee65eef4315d061bea9083260eba07c0043f6860aca463e90015666f0b9
```

- [x] **Step 3: 3840×2160 canlı görünümde `12:42 / 4. Teneffüs / %55` durumunu kontrol et**

Başlık arma gibi, sayaç birinci odak, kicker ikinci grup; sıvı ve alt bağlam önceki konumundadır.

- [x] **Step 4: 1920×1080 canlı görünümde gerçek `365 × 236 px` kutuyu kontrol et**

Metin taşması, sayaç kırpılması, ray çakışması ve konsol hatası olmamalıdır.

- [x] **Step 5: README, proje özeti ve bu planın sonuç kaydını güncelle**

Yalnız doğrulanan davranışlar yazılır; commit/push yapılmaz.

## Sonuç Kaydı

- Kutuya özel `typography` JSON sözleşmesi, doğrulanmış CSS değişken aktarımı ve erişilebilir sayaç segmentleri tamamlandı.
- Kesimli saydam cam amblem, iki yanda görünür ışık rayları, dört katmanlı emaye sayaç ve yalnız ayraçlarda nefes animasyonu uygulandı.
- 3840×2160 kabulünde kutu `730 × 472 px`; 1920×1080 kabulünde `365 × 236 px` ölçüldü. Başlık, ara başlık ve sayaç her iki çözünürlükte de kutu içinde kaldı; konsol hatası görülmedi.
- 1080p ölçümünde ara başlık `15.15 px`, sayaç `66.43 px`; ışık rayı `1 px` altına düşmedi.
- `node --check`, JSON parse ve `git diff --check` başarılı. Odaklı Ders Akışı paketi 23/23; `node --test --test-concurrency=1 tests/*.test.js` ile depo geneli 1644/1644 test geçti. Paket içinde toplu `npm test` betiği tanımlı değildir.
- `createThreeFlowLayer` imzası `eae2626f580b7fe39fda52ede427b9ce191f50905c52ba462868d813c500498d`, `water` JSON imzası `0d998ee65eef4315d061bea9083260eba07c0043f6860aca463e90015666f0b9` olarak değişmeden kaldı.
- Commit ve push yapılmadı.
