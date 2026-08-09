# Classroom Projesi — P3-5D0 Kiosk CSS Analiz Raporu — 9 Ağustos 2026

## 1. Amaç ve bağlayıcı sınır

Bu rapor **P3-5D gerçek kiosk CSS temizliği değildir**. P2-6 gerçek 55" 4K fiziksel kabul kapısı tamamlanmadan kiosk CSS selector/declaration silme, büyük yeniden adlandırma, katman birleştirme veya layout yeniden yazımı yapılmayacaktır.

D0 hazırlık dalgasının tek amacı:

- gerçek kiosk stylesheet yükleme sırasını sayısallaştırmak,
- selector/declaration envanteri çıkarmak,
- duplicate selector ve same-selector property chain'lerini görünür hale getirmek,
- duplicate declaration-block adaylarını ölçmek,
- statik olarak kaynak kodda görünmeyen selector **adaylarını** listelemek,
- mevcut kiosk görünümü için browser baseline kanıtı hazırlamak,
- P2-6 sonrasında yapılacak küçük cleanup commit'lerinin karşılaştırma tabanını oluşturmaktır.

**Bu rapordaki hiçbir “unused” veya “duplicate” bulgusu tek başına silme onayı değildir.**

## 2. D0 başlangıç source-of-truth

D0 başlamadan önce:

- `HEAD = origin/main = 22d8726217eff701a0e149e51a141c10517001d7`
- P3-5C tamamlanmıştı.
- P3-5D cleanup P2-6 fiziksel kabul kapısına bağlıydı.
- protected untracked devir belgeleri ve `docs/superpowers/` korunuyordu.

D0 sırasında kullanıcı tarafından eklenen bağlayıcı “eksik yerel araç/program güvenli biçimde kurulabiliyorsa kur” kuralı ayrıca living docs'a işlendi. macOS'ta eksik olduğu görülen `rg`/ripgrep Homebrew ile kuruldu ve **ripgrep 15.2.0** olarak doğrulandı. Analiz aracı buna rağmen CI taşınabilirliği için yalnız Node built-in modülleriyle yazıldı.

## 3. Kiosk CSS gerçek yükleme sırası

`public/index.html` stylesheet sırası:

1. `public/css/style.css?v=8`
2. `public/css/kiosk-mode.css?v=1`
3. `public/css/kiosk-magic-park.css?v=11`

Analiz dosya metrikleri (`wc -l` newline-count semantiği):

| Dosya | Satır | Rule | Selector | Declaration |
|---|---:|---:|---:|---:|
| `public/css/style.css` | 4740 | 565 | 681 | 2310 |
| `public/css/kiosk-mode.css` | 19 | 3 | 4 | 6 |
| `public/css/kiosk-magic-park.css` | 1433 | 145 | 219 | 868 |
| **Toplam** | **6192** | **713** | **904** | **3184** |

## 4. CSS bütünlük hash'leri

D0 başlangıcında ve tooling kapanışında aynı SHA-256 değerleri alındı:

```text
0ade192f13a1db201881117e45e627475cc588f70604cb6cd168d379141f9673  public/css/style.css
340d61733fcc8a9def7143179d93f681967162f9ea5b8fda1f080ac935c6047a  public/css/kiosk-mode.css
379f9dea5c54ca09569e8480bdbef2e1e7782191255a1990d44d090c6e23f9ba  public/css/kiosk-magic-park.css
```

`git diff -- public/css/style.css public/css/kiosk-mode.css public/css/kiosk-magic-park.css` boş kaldı.

**D0 sırasında kiosk CSS declaration/selector/source-order değişmedi.**

## 5. Tekrar üretilebilir analiz aracı

Yeni araç:

- `scripts/analyze-kiosk-css.js`

Yeni regression paketi:

- `tests/kiosk-css-analysis.test.js`
- `npm run test:kiosk-css-analysis`
- test `test:core` zincirine dahil edildi.

Araç:

- CSS comment/quote/paren/bracket/brace durumlarını dikkate alan dependency-free scanner kullanır,
- `@media`, `@supports`, `@layer`, `@container`, `@document`, `@scope` grouping context'lerini korur,
- keyframe frame'lerini selector diye saymaz,
- comma-separated selector listesini doğru ayırır,
- declaration ve `!important` bilgisini çıkarır,
- aynı selector + property + aynı at-rule context zincirlerini source-order'a göre raporlar,
- exact declaration-block tekrarlarını **ayrı CSS rule blokları** arasında raporlar,
- HTML/JS raw source'ta hiç görülmeyen class/id token'larını yalnız `candidate` olarak işaretler.

CLI:

```bash
node scripts/analyze-kiosk-css.js --json
node scripts/analyze-kiosk-css.js --markdown
```

## 6. Analyzer geliştirilirken bulunan ve düzeltilen iki analiz kusuru

### 6.1 Satır sayısı semantiği

İlk implementation trailing newline nedeniyle `4741 / 20 / 1434` değerleri raporluyordu. Projenin yaşayan envanteri `wc -l` kullandığı için ayrı RED regression eklendi ve metrik `4740 / 19 / 1433` ile source-of-truth'a eşitlendi.

### 6.2 Comma-selector duplicate declaration şişmesi

İlk implementation tek rule içindeki `h1, h2, ...` selector listesini birden fazla “duplicate declaration block” olarak sayıyordu. Ayrı RED regression ile duplicate-block analizi selector occurrence yerine **distinct rule occurrence** seviyesine taşındı.

Bu düzeltme production kiosk için duplicate declaration-block sayısını **105 → 22** düşürdü.

Focused final analyzer sonucu: **7/7 PASS**.

## 7. Duplicate selector envanteri

Toplam **198** selector en az iki kez tanımlanıyor. Bu sayı tek başına teknik borç değildir; responsive/media override ve kasıtlı tema layering de bu gruba dahildir.

En yoğun örnekler:

- `.president-card .card-header` — 8 occurrence
- `.duty-card .card-header` — 8 occurrence
- `.star-card .card-header` — 8 occurrence
- `.stats-card` — 7 occurrence
- `.countdown-mode .countdown-text` — 7 occurrence
- `.vice-president-name` — 7 occurrence
- `:root` — 6 occurrence
- `.clock-card` — 6 occurrence
- `.countdown-mode` — 6 occurrence
- `.countdown-mode h3` — 6 occurrence

Bu occurrence'ların bir kısmı `@media (max-height: 1100px)`, `@media (min-width: 3840px)` veya Magic Park override katmanındadır. Dolayısıyla “aynı selector birden fazla geçti” gerekçesiyle doğrudan birleştirme yapılmamalıdır.

## 8. Same-selector property override haritası

Araç **248** same-selector property chain buldu. Zincirler yalnız exact selector + exact property + aynı at-rule context içinde karşılaştırılır.

Önemli örnekler:

- `:root / --font-main` → son etkili değer `public/css/style.css:4559`
- `html / height` → Magic Park `100%`
- `html / overflow` → Magic Park `hidden`
- `.card / border`, `border-radius`, `box-shadow` → `style.css:3514` sonraki değerleri
- `.clock-card / background` → `style.css:4633` final gradient
- `.stats-card / background` → `style.css:4642` final gradient
- `.countdown-card / background` → `style.css:4651` final gradient
- `.noise-meter-card / background` → `style.css:4660` final gradient
- `.slideshow-card / background` → `style.css:4669` final gradient
- `.president-card .card-header / background` → `style.css:4702`
- `.duty-card .card-header / background` → `style.css:4708`
- `.star-card .card-header / background` → `style.css:4714`

P2-6 sonrası cleanup sırasında bu zincirler source-order değişikliğinin en riskli alanlarıdır.

## 9. Duplicate declaration-block envanteri

Distinct rule seviyesinde **22** exact declaration-block grubu bulundu.

Örnekler:

- çeşitli görünmez yardımcı/pseudo/state rule'larında `display:none`
- `.column`, `.main-content-area`, `.col-center`, `.col-right` için aynı gap blokları
- `.vice-president-name`, `.duty-name`, `.star-name` için aynı tipografi blokları
- farklı role/name/stat yüzeylerinde tekrar eden font/color blokları

Bu gruplar P2-6 sonrası shared utility veya selector-list konsolidasyonu adayı olabilir; ancak cascade/specificity ve media context kanıtı olmadan birleştirilmeyecektir.

## 10. Statik unused-selector adayları

Analiz sonucu:

- **40 candidate occurrence**
- **32 benzersiz selector**

Benzersiz adaylar:

```text
.stats-header-icon
.mic-icon
.tribute-slide
.tribute-slide::before
.tribute-slide::after
.tribute-text
.tribute-text h2
.tribute-text p
.rules-slide
.rules-slide::before
.rules-slide::after
.rules-icon
.rules-text
.celebration-slide
.announcement-slide
.slide-title
.slideshow-progress
.slideshow-progress-bar
.student-name-large
.student-display-small
.student-name-small
.star-animated
.student-name
.date-display
.stats-title
.stat-item
.stat-value
.slides-list
.slide-item
.slide-item:hover
.slide-item.dragging
.card-titlebar-icon
```

### 10.1 Canlı DOM çapraz kontrolü

İzole temp-DB kiosk fallback durumunda Chrome DevTools ile bu 32 selector'ın class/id token'ları canlı DOM'da tarandı. Mevcut senaryoda **32/32 runtime token eşleşmesi yoktu**.

Bu yalnız mevcut fallback/Sunday/default role-state senaryosunun kanıtıdır. Farklı:

- admin tarafından oluşturulan slide tipleri,
- announcement/rule/celebration state'leri,
- geçmiş/legacy dynamic DOM yolları,
- fiziksel kiosk akışları

ayrı davranış üretebilir. Bu nedenle 32 adayın hiçbiri bugün silme onayı almamıştır.

## 11. Chrome DevTools browser baseline

İzole server:

- `http://127.0.0.1:49376/`
- temp SQLite DB
- production kiosk fallback verisi

Stylesheet load order browser'da da:

1. `css/style.css?v=8`
2. `css/kiosk-mode.css?v=1`
3. `css/kiosk-magic-park.css?v=11`

### 11.1 Viewport / overflow

| Baseline | Viewport | Horizontal overflow |
|---|---:|---:|
| Chrome native | 1366×768 | 0 |
| Chrome emulated | 1920×1080 | 0 |
| Chrome emulated | 2560×1440 | 0 |
| Chrome emulated | 3840×2160 | 0 |

3840×2160'da `.bento-grid` **3840×2160** alanı doldurdu. 1920×1080 ve 2560×1440 emulation'da da document scrollWidth/clientWidth eşitti.

### 11.2 Görsel baseline

Chrome DevTools oturumunda 1366×768 ve browser-emulated 3840×2160 full-page screenshot'lar alındı. Görsel kontrolde:

- sekiz kiosk ana bölgesi görünür,
- titlebar clipping yok,
- merkez slideshow çerçevesi taşmıyor,
- sağ role panelleri viewport dışına çıkmıyor,
- sol saat/mevcut/ders-akışı panelleri kesilmiyor.

Bu browser screenshot'ları **P2-6 fiziksel 55" 4K kabulünün yerine geçmez**.

### 11.3 Console / network

Chrome final baseline:

- console error: **0**
- console warning: **0**
- DevTools issue: **0**
- initial static asset/API zinciri: **200/304**
- stylesheet, local fonts, local GSAP/confetti, kiosk JS, role/stats/schedule/slides API'leri yükleniyor.

## 12. Playwright ikinci browser kanıtı

Playwright MCP:

- `/` → title `2/D Sihirli Pano`
- default viewport ölçümünde **1280×720**
- horizontal overflow **0**
- grid display `grid`
- console error **0**, warning **0**

Playwright `browser_resize` ve screenshot işlemleri sonrasında bilinen MCP/tool-side `about:blank` davranışını tekrar gösterdi. Fresh `browser_navigate` ile kiosk tekrar sorunsuz açıldı; aynı davranış Chrome DevTools'ta oluşmadı. Bu nedenle production kiosk hatası olarak sınıflandırılmadı.

## 13. Test / CI evidence

Tooling ağacı final doğrulaması:

- `npm run test:kiosk-css-analysis` → **7/7 PASS**
- `npm run test:kiosk-magic-park` → **12/12 PASS**
- `npm run test:kiosk-titlebar-resize` → **4/4 PASS**
- `npm run test:core` → **1482/1482 PASS**
- SQLite lifecycle/lock log taraması → **NONE**
- `npm run test:system-smoke` → **PASS**
- `npm audit --omit=dev` → **0 vulnerability**
- `node --check scripts/analyze-kiosk-css.js` → temiz
- `package.json` parse → temiz
- `git diff --check` → temiz

Tooling/test commit:

```text
67b4c28c801bcf5bcd5003a1252ef53acd9bec31
test: add kiosk css analysis tooling
```

GitHub Actions `31328518565`:

- Node 24: **PASS — 24 sn**
- Node 22: **PASS — 27 sn**

## 14. D0 sonucu ve sonraki kapı

**P3-5D0 hazırlık dalgası tamamlandı.** Artık P2-6 sonrası küçük kiosk cleanup commit'leri için:

- tekrar üretilebilir selector/declaration envanteri,
- duplicate selector listesi,
- override chain haritası,
- gerçek duplicate declaration-block listesi,
- 32 benzersiz static-unused adayı,
- 1366 / 1920 / 2560 / 3840 browser baseline'ı,
- console/network baseline'ı

mevcuttur.

Ancak **P3-5D gerçek CSS temizliği hâlâ başlamayacaktır**. Önce P2-6 gerçek 55" 4K fiziksel kabul tamamlanmalı; ardından her selector grubu küçük commit + dört viewport browser smoke + live resize + reduced-motion + fiziksel 4K tekrar kabul ile ele alınmalıdır.
