# Classroom Projesi — Magic Park Foreground Görsel Bakım Checkpoint — 11 Ağustos 2026

Bu kısa checkpoint, `sontema` tabanlı Magic Park genel görsel bakım-onarım / foreground alpha-mask temizliğinin kapanış bağlamını taşır.

## Aktif zincir

- Source-of-truth: `public/assets/sontema.png` — 3840×2160
- Builder: `scripts/build-sontema-foreground.js`
- Foreground: `public/assets/sontema-foreground.png`
- Regression: `tests/kiosk-magic-park.test.js`

## Kapatılan iki kök neden

1. Global opening-growth ilk halka ve sonraki 2–4 px bandında güçlü kromatik artwork üzerinden ilerleyebiliyor, dekor/anti-alias edge'lerini yiyebiliyordu.
2. Noise ve Class TV gibi lokal koyu/negative-space cleanup'lar bazı gerçek artwork piksellerini background sanabiliyordu.

Çözüm: global chromatic growth guard + Noise lokal black-island guard + Class TV dark-warm edge repair.

## Ölçülen değişiklik

- Alpha değişen piksel: **31.244**
- RGB değişen piksel: **0**
- `0→255`: **15.479**
- `0→partial`: **2.676**
- `partial→255`: **13.089**
- Final foreground SHA-256: `61fa4e4dd366bdbce9a3994186e6be130de085df12318fc3d557c90383100f41`

## RED → GREEN özeti

4 px chromatic growth-band RED: `clock=214`, `attendance=608`, `lesson-flow=322`, `noise=135`, `class-tv=43`, `president=334`, `duty=62`, `stars=800`.

Global fix sonrası yedi panel temizlendi. Noise'ta kalan 10 piksel lokal black-island cleanup'a kadar izlenip korundu. Class TV lokal negative-space testinde yalnız sol bölgede 494 koyu sıcak artwork edge pikselinin silindiği kanıtlandı; lokal repair sonrası GREEN oldu.

## Korunan önceki düzeltmeler

- Attendance white-halo + kalem/kitap/bardak/fener cleanup'ları
- Class TV perde/fold/lamba-negatif-boşluk düzeltmeleri
- Noise sağ dekoru
- sekiz opening'in mevcut geometrisi

## Kapanış prosedürü

Belgeleme sonrası fresh olarak:

```bash
node --test tests/kiosk-magic-park.test.js
npm run test:kiosk-magic-park
npm run test:kiosk-theme-system
pngcheck public/assets/sontema.png
pngcheck public/assets/sontema-foreground.png
git diff --check
```

Builder determinism/SHA, Playwright `3840×2160 / 2560×1440 / 1920×1080` ve Chrome DevTools asset/layer/console/network kabulü yeniden doğrulanacak. Fresh sonuçlar yeşilse ilgili dirty Classroom değişiklikleri kontrollü stage edilip `git diff --cached` ile incelenecek, commit edilecek ve force kullanmadan `git push origin main` yapılacak.

## Fresh doğrulama sonucu

- `node --test tests/kiosk-magic-park.test.js` → **30/30 PASS**
- `npm run test:kiosk-magic-park` → **33/33 PASS**
- `npm run test:kiosk-theme-system` → **20/20 PASS**
- `node --check scripts/build-sontema-foreground.js` → temiz
- rebuild öncesi/sonrası foreground SHA-256 → `61fa4e4dd366bdbce9a3994186e6be130de085df12318fc3d557c90383100f41`
- `pngcheck` source + foreground → OK
- `git diff --check` → temiz
- Playwright `3840×2160 / 2560×1440 / 1920×1080`: stage tam viewport, overflow `0`, console error/warn `0`, failed request `0`, HTTP `>=400` `0`, foreground doğal boyut `3840×2160`, layer sözleşmesi doğru.
- Chrome DevTools isolated 4K: foreground HTTP `200`, natural size `3840×2160`, `z-index:20`, `pointer-events:none`, `opacity:1`, console error/warn/issue `0`, runtime requestler `200/304`.
- Fresh regression/runtime kabulünde yeni doğrulanmış görsel artefakt tespit edilmedi; Attendance/Class TV/Noise önceki lokal düzeltmeleri korunuyor.

Sonraki adım: commit kapsamını `git diff --cached` ile doğrula, ardından force kullanmadan `git push origin main`; push sonrası `HEAD == origin/main` doğrulaması yap.
