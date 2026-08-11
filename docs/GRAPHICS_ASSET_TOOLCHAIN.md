# Classroom Grafik / Asset Geliştirme Araç Zinciri

**Son doğrulama:** 11 Ağustos 2026
**Platform:** macOS / Apple Silicon / Homebrew
**Kapsam:** geliştirme ve asset üretimi; Classroom runtime dependency sözleşmesi değildir.

Bu belge transparan foreground, maske, alpha, anti-aliasing, halo/fringe, raster kalite ve görsel asset incelemelerinde kullanılabilecek yerel araçları tanımlar.

## Bağlayıcı geliştirme kuralı

- Görsel hata düzeltmesinde yalnız mevcut Node/CSS araçlarıyla sınırlı kalma.
- Gerekli CLI, program veya kütüphane eksikse uygun yöntemle kur, doğrula ve çalışmaya devam et.
- Geliştirme için kullanılan grafik araçlarını yalnız gerçekten runtime'da gerekmiyorsa `package.json`/uygulama dependency'si yapma.
- Kullanıcının gönderdiği crop veya ekran görüntüsü hata referansıdır. Mevcut proje assetini düzenleme isteğinde yeni görsel üretme; source asset / foreground / mask üretim zincirini düzelt.
- Global threshold veya geniş mask değişikliklerinden önce sorunu piksel/komponent/edge ölçümüyle kanıtla; mümkün olduğunda RED → GREEN regression testi kullan.
- Transparan piksellerde yalnız alpha kanalını değil RGB kontaminasyonunu da incele. Straight-alpha / premultiplied-alpha davranışı ve browser scaling halo riski göz önünde bulundurulmalıdır.
- Önceden doğrulanmış lokal artwork preserve bölgelerini geniş global morphology ile bozma.

## Kurulu ve doğrulanmış araçlar

11 Ağustos 2026 itibarıyla:

| Araç | Sürüm | Başlıca kullanım |
|---|---:|---|
| ImageMagick | 7.1.2-29 | channel/alpha inceleme, morphology, composite, crop, compare, edge ve renk işlemleri |
| libvips | 8.18.5 | büyük 4K rasterlarda hızlı crop/resize/channel/statistik ve düşük bellekli pipeline |
| OpenCV | 5.0.0 | connected-components, flood fill, morphology, contours, distance transform, edge detection, local segmentation |
| G'MIC | 4.0.3 | gelişmiş filtreleme, edge/morphology ve teşhis amaçlı raster işlemleri |
| pngquant | 3.0.3 | gerektiğinde palette/quantization denemeleri; ana RGBA source-of-truth'u kayıplı biçimde ezmek için kullanılmaz |
| oxipng | 10.2.0 | lossless PNG optimizasyonu |
| pngcheck | 4.0.1 | PNG yapısal doğrulama |
| NumPy | 2.5.2 | piksel matrisleri, mask/istatistik ve custom analiz |
| Pillow | 12.3.0 | PNG/RGBA okuma-yazma, crop, channel ve teşhis çıktıları |

## Homebrew kurulumu

Eksik kurulum için tercih edilen komut:

```bash
brew install imagemagick vips opencv gmic pngquant oxipng pngcheck numpy
```

Pillow Homebrew Python ortamında import edilemiyorsa proje runtime dependency'si yapmadan geliştirme Python ortamına kurulmalıdır.

## Doğrulama

```bash
magick -version
vips --version
gmic version
pngquant --version
oxipng --version
pngcheck public/assets/sontema.png
python3 -c 'import numpy, cv2; from PIL import Image; print(numpy.__version__, cv2.__version__, Image.__version__)'
```

Homebrew OpenCV Python binding'i standart site-packages yolunda bulunamazsa önce gerçek Cellar yolunu doğrula; rastgele başka OpenCV pip paketi kurarak ortamı çoğaltma.

## Hangi problemde hangi araç?

### Alpha / halo / fringe

- Pillow + NumPy: kaynak ve foreground RGBA karşılaştırma, alpha histogramı, lokal neighbourhood ölçümü.
- ImageMagick: channel extraction, morphology/edge önizleme, composite-on-white/black halo kontrolü.
- OpenCV: mask sınırı, distance transform, connected-components ve lokal morphology.

### Obje çevresindeki yanlış background pikselleri

- OpenCV connected-components + flood fill ile background adaylarını ayır.
- Kaynak RGB/chroma/luminance değerlerini foreground alpha ile çapraz kontrol et.
- Lokal preserve mask oluştur; geniş global threshold değişikliğinden kaçın.

### Jagged/pixelated kenar

- Binary alpha yerine gerektiğinde kontrollü bir partial-alpha bandı kullan.
- Edge RGB değerini doğru artwork/background renklerinden türet; beyaz/siyah kontamine RGB'yi düşük alpha ile bırakma.
- ImageMagick composite testleriyle beyaz, siyah ve renkli arka planlarda halo kontrolü yap.

### 4K teşhis çıktıları

- libvips veya ImageMagick ile doğal çözünürlükte crop üret.
- 200–400% zoom yalnız teşhis içindir; shell/source asseti yeniden çizme veya yeniden tasarlama değildir.

### PNG son doğrulama

- `pngcheck` ile yapı doğrula.
- `oxipng` yalnız lossless son optimizasyon gerektiğinde kullan.
- `pngquant` kayıplı/palette dönüşümü yapabildiğinden Magic Park ana RGBA foreground üzerinde otomatik son adım değildir.

## Magic Park özel sözleşmesi

Aktif görsel zinciri:

```text
public/assets/sontema.png
        ↓
scripts/build-sontema-foreground.js
        ↓
public/assets/sontema-foreground.png
```

`sontema.png` geometri ve artwork source-of-truth'tur. Foreground builder yalnız transparan açıklıkları/edge kalitesini üretir; objeleri yeniden tasarlamaz.

Magic Park düzeltmelerinde korunması gereken temel prensipler:

- sekiz opening aynı 4K geometriye kayıtlı kalır,
- opening maskesi büyürken güçlü kromatik artwork pikselleri maske için geçiş yolu sayılmaz; global growth painted frame/dekor anti-aliasing'inin içinden tünelleyemez,
- Class TV perde ve lamba artwork preserve alanları korunur,
- Class TV üst negatif-boşluk temizliğinde koyu sıcak/kromatik artwork kenarları tam transparan yapılmaz; gerçek boşluk korunurken bu kenarlar kontrollü partial/opaque coverage taşır,
- Noise sağ dekoru ve siyah ada düzeltmeleri korunur,
- Attendance kalem/bardak/kitap/fener gibi dekorlarda lokal mask uygulanır,
- yeni bir lokal düzeltme komşu panel maskelerini değiştirmemelidir.

## Test disiplini

Foreground/alpha düzeltmesi için mümkün olduğunda:

1. source RGB + foreground RGBA ölç,
2. gerçek problem piksel/bölgesini kanıtla,
3. regression assertion ekle ve RED'i gör,
4. minimal lokal mask/alpha düzeltmesini uygula,
5. builder ile foreground'u yeniden üret,
6. hedef testleri GREEN yap,
7. 4K before/after diagnostic crop incele,
8. Playwright üç çözünürlük kabulü yap,
9. Chrome DevTools ile gerçek asset request/boyut/console/network doğrula,
10. `pngcheck` ve fresh testleri çalıştır.

## 11 Ağustos 2026 — Magic Park genel alpha-mask bakım checkpoint'i

Aktif zincir değişmedi:

```text
public/assets/sontema.png                 # 3840×2160 source-of-truth
        ↓
scripts/build-sontema-foreground.js
        ↓
public/assets/sontema-foreground.png
```

### Doğrulanan iki kök neden

1. **Global growth tünellemesi:** opening-growth ilk halka ve sonraki 2–4 px bantta güçlü kromatik artwork'i background geçiş yolu sayabiliyordu. Sonuç, sekiz opening çevresinde renkli anti-alias/dekor kenarlarının yenmesiydi.
2. **Lokal cleanup yanlış sınıflandırması:** siyaha/koyu tona dayanan özel temizleyiciler gerçek artwork'i negative space/background sanabiliyordu. Noise sağında 10 kahverengi/kırmızı piksel; Class TV üst negatif-boşluk bölgesinde yalnız sol tarafta 494 koyu sıcak edge pikseli bunun ölçülmüş örnekleridir.

### Uygulanan korumalar

- Global **chromatic growth guard**: ilk growth halkası ve sonraki 2–4 px bandı güçlü kromatik artwork üzerinden ilerleyemez.
- Noise lokal black-island cleanup guard: sağ dekorun doğrulanmış 10 renkli artwork pikselini silmez.
- Class TV dark-warm edge repair: üst negative-space temizliği gerçek koyu sıcak/kromatik anti-alias artwork kenarlarını korur.
- Attendance'ın daha önceki white-halo ile kalem/kitap/bardak/fener cleanup'ları korunur.
- Class TV perde/fold/lamba-negatif-boşluk düzeltmeleri korunur.
- Noise sağ dekoru korunur.
- Sekiz opening geometrisi değiştirilmez.

### Alpha-only değişiklik kanıtı

Başlangıç foreground'u geçici yeniden üretilip finalle karşılaştırıldı:

- toplam alpha değişen piksel: **31.244**
- RGB değişen piksel: **0**
- `alpha 0 → 255`: **15.479**
- `alpha 0 → partial`: **2.676**
- `partial → 255`: **13.089**
- final SHA-256: `61fa4e4dd366bdbce9a3994186e6be130de085df12318fc3d557c90383100f41`

### RED → GREEN regression kanıtı

4 px chromatic growth-band RED sayımları:

```text
clock=214
attendance=608
lesson-flow=322
noise=135
class-tv=43
president=334
duty=62
stars=800
```

Global fix sonrası yedi panel sıfırlandı. Noise'ta kalan 10 piksel lokal black-island cleanup'a kadar izlenip guard ile giderildi. Class TV lokal negative-space regression'ında sol bölgede **494** koyu sıcak artwork edge pikseli RED verdi; dark-warm edge repair sonrası GREEN oldu.

### Fresh kapanış kapısı

Belgeleme sonrası aynı çalışma ağacında yeniden çalıştırılması gereken authoritative kapı:

```bash
node --test tests/kiosk-magic-park.test.js
npm run test:kiosk-magic-park
npm run test:kiosk-theme-system
pngcheck public/assets/sontema.png
pngcheck public/assets/sontema-foreground.png
git diff --check
```

Builder ayrıca tekrar çalıştırılıp SHA-256'nın yukarıdaki değerle deterministik kaldığı doğrulanmalıdır. Browser kapanışında Playwright `3840×2160`, `2560×1440`, `1920×1080`; Chrome DevTools ise foreground request/boyut/layer/console/network sözleşmesini yeniden doğrular.

**Fresh kapanış sonucu — 11 Ağustos 2026:**

- `node --test tests/kiosk-magic-park.test.js` → **30/30 PASS**
- `npm run test:kiosk-magic-park` → **33/33 PASS**
- `npm run test:kiosk-theme-system` → **20/20 PASS**
- builder syntax → temiz
- foreground rebuild öncesi/sonrası SHA-256 → `61fa4e4dd366bdbce9a3994186e6be130de085df12318fc3d557c90383100f41`; deterministik
- `pngcheck public/assets/sontema.png` → OK, 3840×2160 RGB
- `pngcheck public/assets/sontema-foreground.png` → OK, 3840×2160 RGBA
- `git diff --check` → temiz
- Playwright `3840×2160 / 2560×1440 / 1920×1080`: viewport=document=stage; overflow `0×0`; Magic Park aktif; foreground doğal boyut `3840×2160`; `z-index:20`; `pointer-events:none`; `opacity:1`; console error/warn `0`; failed request `0`; HTTP `>=400` `0`.
- Chrome DevTools isolated 4K: viewport/document/stage `3840×2160`, overflow `0×0`; `sontema-foreground.png` HTTP `200`; natural size `3840×2160`; `z-index:20`; `pointer-events:none`; `opacity:1`; console error/warn/issue `0`; görülen runtime/network istekleri `200/304`.
- Fresh regression/runtime kabulünde yeni doğrulanmış görsel artefakt tespit edilmedi; önceki Attendance/Class TV/Noise lokal düzeltmeleri regression testleriyle korunuyor.
