# Magic Park Ders Akışı Kutusu

Bu klasör, Magic Park temasındaki Ders Akışı kutusunun bağımsız sunum paketidir.

## Sahiplik

- `lesson-flow.css`: kutunun tüm görsel ve durum stilleri
- `lesson-flow.json`: durum, renk, yerleşim, su ve hareket sözleşmesi
- `lesson-flow.js`: görünüm modeli, olay aboneliği, GSAP geçişi ve Three.js yüzey-profili/kırılma su çizimi
- `liquid-physics.js`: LiquidFun parçacık dünyası, kapalı tank ve sabit zaman adımlı fizik adaptörü

Kutunun ders saati hesaplama yetkisi yoktur. Tek veri kaynağı `ScheduleManager.getScheduleStatus(now)` çıktısıdır. Dashboard bu çıktıyı `classroom:schedule-status-updated` olayıyla pakete iletir.

## Veri akışı ve gerçek zaman

`ScheduleManager` duvar saatini saniye cinsinden hesaplar; `MM:SS` ve gerektiğinde `H:MM:SS` geri sayımı, kesintisiz `0..100` ilerleme ve ders/teneffüs sıra numarası üretir. Dashboard bu nesneyi saniyede bir yayınlar. Kutu yalnız görünüm modeli üretir; program hesabını tekrar etmez. Harici program yoksa bilinmeyen sıradaki ders tahmin edilmez.

## Görünür durumlar

`before-school`, `in-class`, `in-break`, `after-school`, `weekend` ve `error`.

Ana odak ders/teneffüs sıra numarası ile saniyelik büyük süredir. Ayrı bir ilerleme çubuğu kullanılmaz; kutunun kesin ilerleme oranı portakallı gazoz yüzeyinin ortalama yüksekliğine aynı karede kilitlenir. LiquidFun basınç, viskozite, yüzey gerilimi, tank çarpışması ve akıntıyı; 128 örnekli sönümlü sığ-su çözücüsü ise sık, ilerleyen ve kenarlardan yansıyan dalgayı üretir. Three.js kavanoz arka plakasını sıvı içinden hareketli normalle kırar; derinliğe bağlı üstel RGB emilimi ince bölgeleri berrak altın sarısı, uzun optik yolu doygun portakal gösterir. Posa kullanılmaz. İnce krem menisküs, kavisli taban merceği, hareketli caustic ve Fresnel yansıması aynı hacim malzemesinde birleşir. Akıntıyı izleyen 72 büyük kabarcığa ek olarak 12 düzensiz çekirdeklenme noktasından doğan 168 mikro kabarcık bulunur; bunların 36'sı cam duvarına geçici olarak tutunur. Optik ve karbonasyon değerlerinin tek sahibi `lesson-flow.json` sözleşmesidir. Özel üretilmiş `assets/glass-jar-interior-v1.webp` arka plakası şeffaf kavanozun yan kalınlığını ve ağır tabanını verir; CSS yalnız canlı cam kenarı/parlama katmanını tamamlar. Optik cam bilgi alanları sıvıyı örtmez; boş bağlam alanları tamamen gizlenir. Sıvı her okuma bölgesini geçtiğinde o bölgenin yazısı otomatik olarak açık enamel renge döner. Dış artwork'te yeterli dekor bulunduğu için paket yeni oyuncak, harf, boncuk, kitap veya çiçek eklemez.

Sıvı ve kabarcıklar, JSON içindeki `glass.interiorMask` geometrisini ortak kullanır. Maske camın iç yan sınırlarını, omuz kıvrımını ve merkezde alçak olup iki yana gerçek elips denklemiyle yükselen oval tabanı tanımlar. Bu nedenle düşük dolum merkezdeki taban çanağından başlar; turuncu hacim veya kabarcıklar cam duvarlarının ve kalın tabanın içine taşamaz.

## Yerel fizik ve vendor üretimi

Three.js modülleri `public/vendor/three/`, LiquidFun tarayıcı bundle'ı `public/vendor/liquidfun/` altında lisanslarıyla tutulur. LiquidFun çıktısı `@box2d/core`, `@box2d/particles` ve `esbuild` kullanılarak `npm run build:liquidfun-vendor` komutuyla tekrar üretilebilir. Bunlar build bağımlılığıdır; kiosk çalışma zamanında `node_modules` veya CDN gerekmez. Bundle elle düzenlenmez.

## Büyülü Cam Amblem yazı sistemi

Üst bilgi hiyerarşisi `başlık → kalan süre açıklaması → sayaç` sırasındadır. Ders/teneffüs başlığı kesimli, saydam cam amblem içinde; açıklama iki yanda camgöbeği ve sıcak turuncu ışık raylarıyla; sayaç ise dört kısa derinlik katmanlı emaye yüzle çizilir. Rakamlar sabit kalır, yalnız iki nokta ayraçları düşük genlikli nefes alır. Sıvı okuma bölgesine yükseldiğinde metin yüzü ile kenar rengi yer değiştirerek kontrastı korur. Palet ve hareket süreleri kutunun kendi `lesson-flow.json` dosyasındaki `typography` sözleşmesine aittir; bütün çizim kuralları yalnız `lesson-flow.css` içindedir.

## Doğrulama

- Ders Akışı paketi: `23/23` test.
- Depo geneli tek süreçli Node koşusu: `1644/1644` test.
- Canlı kabul: 3840×2160 görünümde yaklaşık `730 × 472 px`, 1920×1080 görünümde `365 × 236 px` gerçek kutu.
- Her iki görünümde metin taşması/kırpılması ve tarayıcı konsol hatası yoktur.
- Ayrıntılı geliştirme raporu: `docs/DERS_AKISI_GELISTIRME_RAPORU_2026-08-12.md`.

## Fallback

JSON, GSAP, WebGL veya Three.js yüklenemese de DOM metinleri, saniyelik sayaç ve aşağıdan yukarı dolan CSS yüzeyi görünür kalır. Magic Park dışındaki temalar mevcut legacy Ders Akışı DOM'unu kullanır.

## Cam arka plaka üretim kaydı

`assets/glass-jar-interior-v1.webp`, yerleşik görsel üretim aracıyla aşağıdaki son istem kullanılarak oluşturuldu; kaynak çıktı proje içine WebP olarak alınmıştır:

> Create an empty transparent glass jar interior for the background opening of a children's classroom kiosk card. Match the polished, rounded, colorful 3D visual language of the supplied Magic Park reference, but include no text, numbers, frame, furniture, school objects, bubbles or orange liquid. Fill the canvas with a straight-on glass interior: thick clear side walls, gently rounded upper corners, a heavy curved glass base, pale aqua/mint and warm cream daylight, believable refraction, internal reflection, subtle imperfections and faint caustics. Keep the central 72% quiet and readable for large UI text. No watermark.

Kaynak tasarım:

`docs/superpowers/specs/2026-08-12-magic-park-lesson-flow-box-design.md`
