# Magic Park Ders Akışı Kutusu — Uygulama Yol Haritası

**Tarih:** 12 Ağustos 2026
**Tasarım kaynağı:** `docs/superpowers/specs/2026-08-12-magic-park-lesson-flow-box-design.md`
**Kapsam:** Yalnız Magic Park Ders Akışı kutusu
**Uygulama durumu:** Revizyon 8 — gerçek portakallı gazoz optiği tamamlandı

## Hedef

`ScheduleManager` gerçek zaman hatasını saniye hassasiyetinde düzeltmek; Ders Akışı görünümünü bağımsız `lesson-flow.css`, `lesson-flow.json` ve `lesson-flow.js` paketine taşımak; ayrı ilerleme çubuğu kullanmadan aşağıdan yukarı dolan gerçekçi suyu tek zaman göstergesi yapmak.

## Görev 1 — Paket ve veri modeli testleri

**Dosya:** `tests/magic-lesson-flow.test.js`

1. Paket dosyalarının, `theme.css` importunun ve `index.html` script girişinin beklentilerini yaz.
2. JSON şeması, durumlar, soldan sağa hareket ve görünür alan sözleşmesini test et.
3. `lesson-flow.js` saf görünüm modeli için ders öncesi, ders, teneffüs, gün sonu, hafta sonu ve hata testlerini yaz.
4. Testi çalıştır ve uygulama henüz olmadığı için doğru nedenle başarısız olduğunu doğrula.

## Görev 2 — Bağımsız paket iskeleti ve JSON

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json`
- `public/themes/magic-park/boxes/lesson-flow/README.md`
- `public/themes/magic-park/theme.css`
- `public/index.html`

1. Onaylanan durum, palet, yerleşim ve hareket sözleşmesini JSON'a yaz.
2. Paket sınırlarını ve veri sahipliğini README'de belgeleyin.
3. Kutunun CSS ve JS girişlerini tema/HTML akışına ekle.
4. Paket sözleşmesi testlerini çalıştır.

## Görev 3 — Durum modeli ve olay entegrasyonu

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`
- `public/js/script.js`
- `tests/magic-lesson-flow.test.js`

1. `ScheduleManager` status nesnesini güvenli sunum modeline çeviren saf fonksiyonu uygula.
2. `classroom:schedule-status-updated` olayını `script.js` içindeki mevcut hesaplamadan yayımla.
3. Controller'ı olaya ve tema değişimine bağla; ders hesabını tekrar etme.
4. Başlık, sayaç, mevcut/sıradaki bağlam, su yüksekliği ve erişilebilirlik değerlerini güncelle.
5. JSON veya animasyon yüklenmediğinde DOM fallback'i koru.
6. Model ve controller testlerini çalıştır.

## Görev 4 — Sihirli Su Saati görünümü

**Dosyalar:**

- `public/index.html`
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.css`
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`

1. Kararlı mevcut DOM kimliklerini koruyarak su yüzeyi ve derinlik katmanı kancalarını ekle.
2. Dört bölümlü, optik ortalanmış ve boşluksuz yerleşimi CSS'te uygula.
3. Durum bazlı lila/mor, mint/turkuaz, gök/lila ve krem/şeftali yüzeylerini uygula.
4. Büyük tabular geri sayım, güvenli uzun ders adı ve tek/çift bağlam düzenini uygula.
5. Geçen süreyi yalnız su yüksekliğiyle göster; ayrı ray, çubuk, küre veya hedef noktası kullanma.
6. GSAP durum geçişi ile Three.js derinlik yüzeyini ekle; CSS fallback ve reduced-motion davranışını koru.
7. İlk sürüm için özel GLSL dalga/ışık/köpük shader'ını, instanced kabarcıkları ve dolum bölgesine duyarlı metin kontrastını uygula; Revizyon 2'de analitik suyu fizik tabanlı sisteme geçir.

## Görev 4A — Gerçek zaman düzeltmesi

**Dosyalar:**

- `public/js/schedule-manager.js`
- `tests/schedule-manager.test.js`

1. Dakikaya yuvarlanan eski hesaplamayı gerçek gün içi saniye hesabına geçir.
2. Ders öncesi, ders ve teneffüs sürelerini saniyelik biçimle üret.
3. İlerleme yüzdesini saniye hassasiyetinde hesapla ve kesin sınır davranışını düzelt.
4. Mevcut ders veya teneffüsün kendi türü içindeki sıra numarasını üret.

## Görev 5 — Eski ortak CSS sahipliğini temizleme

**Dosyalar:**

- `public/css/kiosk-magic-park.css`
- `public/themes/magic-park/magic-components.css`
- `public/themes/magic-park/magic-states.css`
- ilgili kiosk testleri

1. Ders Akışı'na özel eski görünüm kurallarını ortak dosyalardan kaldır.
2. Ortak dosyalarda yalnız genel kiosk/yerleşim sorumluluklarını bırak.
3. Eski selector beklentilerini bağımsız paket beklentilerine güncelle.
4. Kiosk ve Ders Akışı odaklı testleri çalıştır.

## Görev 6 — Belgeler ve doğrulama

**Dosyalar:**

- `docs/PROJE_OZETI.md`
- `docs/superpowers/specs/2026-08-12-magic-park-lesson-flow-box-design.md`
- `docs/superpowers/plans/2026-08-12-magic-park-lesson-flow-box-implementation.md`

1. Tasarım belgesini `uygulandı` durumuna yalnız uygulama tamamlanınca geçir.
2. Proje özetine bağımsız paket ve davranış kaydını ekle.
3. Odaklı testleri, kiosk regresyon testlerini ve kod doğrulamasını çalıştır.
4. Altı durumu 3840×2160 ve 1920×1080 boyutlarında canlı kontrol et.
5. Foreground çakışması, kırpma, boş frame, okunaksız sayı ve yanlış hareket yönü olmadığını doğrula.
6. Son diff ve Git durumunu incele; kullanıcı ayrıca istemedikçe commit/push yapma.

## Sonuç kaydı — 12 Ağustos 2026

- Gerçek `ScheduleManager` saniye hassasiyetine geçirildi; sayaç, ilerleme yüzdesi, kesin sınırlar ve ders/teneffüs sıra numaraları düzeltildi.
- Magic Park Ders Akışı kutusu bağımsız CSS, JSON ve JavaScript paketine taşındı.
- Ayrı ilerleme rayı/çubuğu, gezgin küre ve hedef işareti tasarımdan tamamen çıkarıldı.
- Geçen sürenin tek göstergesi aşağıdan yukarı dolan fizik tabanlı su kütlesi oldu.
- LiquidFun basınç, viskozite, yüzey gerilimi ve tank çarpışması; sönümlü sığ-su dalga çözücüsü ve Three.js yüzey-profili kırılması, menisküs, eğime duyarlı köpük ve 72 fiziksel gaz kabarcığı ile birleştirildi.
- Three.js ve LiquidFun yerel vendor kopyalarıyla çevrimdışı çalışır; hazır su sahnesi kullanılmaz.
- Odaklı Ders Akışı ve gerçek program testlerinde 46/46 başarı, JavaScript/JSON bütünlüğü ve temiz diff kontrolü alındı.
- 1920×1080 kısa tasarım önizlemesinde WebGL su katmanı aktif, tarayıcı konsolu hatasız ve eski ilerleme elemanı sayısı sıfır olarak görüldü.
- Kullanıcının isteği doğrultusunda tekrarlı ara doğrulamalar ve geniş çözünürlük matrisi çalıştırılmadı; ayrıntılı görsel kabul kullanıcı kontrolündedir.

## Revizyon 2 uygulama görevleri

### Görev 7 — Fizik sözleşmesi ve kırmızı testler

**Dosyalar:**

- `tests/magic-lesson-flow.test.js`
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json`

1. Manifestte `liquidfun-particles`, basınç/viskozite/yüzey gerilimi, metaball renderer ve fiziksel kabarcık sözleşmesini zorunlu kıl.
2. Runtime'da analitik ana su düzlemini ve opak bilgi plakası rengini reddeden testleri yaz.
3. Testi çalıştırıp mevcut uygulamanın doğru nedenlerle başarısız olduğunu gör.

### Görev 8 — Yerel LiquidFun browser bundle

**Dosyalar:**

- `package.json`
- `package-lock.json`
- `scripts/vendor/liquidfun-entry.mjs`
- `scripts/build-liquidfun-vendor.cjs`
- `public/vendor/liquidfun/liquidfun.module.js`
- `public/vendor/liquidfun/LICENSE`

1. `@box2d/core@0.11.0`, `@box2d/particles@0.11.0` ve `esbuild@0.28.2` sürümlerini build-time bağımlılık yap.
2. Yalnız gereken dünya, vektör, parçacık ve şekil API'lerini ESM browser bundle olarak dışa aktar.
3. Vendor çıktısını tamamen yerel üret ve lisansını birlikte sakla.

### Görev 9 — Sıvı fizik adaptörü

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/liquid-physics.js`
- `tests/magic-lesson-flow.test.js`

1. Kapalı tank sınırları, yerçekimi, parçacık yarıçapı, yoğunluk, sönüm ve tensile/viscous bayraklarıyla fizik dünyasını kur.
2. `setTargetFill(0..1)` ile hedef parçacık hacmini kontrollü giriş/çıkışa dönüştür.
3. Sabit zaman adımıyla dünya çözümünü çalıştır ve normalize parçacık konumlarını renderer'a ver.
4. Durum sıfırlamasını ve kaynak temizliğini ekle.

### Görev 10 — Metaball su ve gaz kabarcığı renderer'ı

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json`

1. Fizik parçacıklarını düşük çözünürlüklü yoğunluk render target'ına instanced sprite olarak çiz.
2. Tam ekran sıvı shader'ında yumuşak metaball eşik, yoğunluk normali, Fresnel, kırılma, derinlik, caustic ve yüzey köpüğü uygula.
3. Gaz kabarcıklarına kaldırma kuvveti, drag, akıntı örnekleme ve yüzeyde patlama davranışı ver.
4. CSS fallback ve reduced-motion durumunda parçacık motorunu güvenli biçimde kapat.

### Görev 11 — Optik cam bilgi katmanı

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.css`
- `tests/magic-lesson-flow.test.js`

1. `%78` opak mor dolgu ve sayaç gradyanlarını tamamen kaldır.
2. Mevcut/sıradaki bilgi alanlarını `%4–12` beyaz alfa, backdrop blur/saturation, ince cam kenarı ve iç yansımayla kur.
3. Sayaç rengini iki duruma indir: su dışında koyu erik, su içinde kırık beyaz; ince karşıt kontur kullan.
4. Camların su yüzeyini kapatmadığını ve opak tema renginin geri dönemediğini test et.

### Görev 12 — Tek canlı tasarım döngüsü ve belgeler

1. 1920×1080 sahnede orta dolumlu ders durumunu aç.
2. Suyun kesintisiz kütle, görünür kabarcıklar ve cam arkasından okunur biçimde hareket ettiğini tek önizlemede kontrol et.
3. Konsol hatası ve WebGL fallback durumunu kontrol et.
4. Tasarım/plan/proje özetine gerçek fizik mimarisini işle; tekrarlı geniş doğrulama yapma.

## Revizyon 3 uygulama görevleri — kesintisiz optik su

### Görev 13 — Serbest yüzey profili sözleşmesi

**Dosyalar:**

- `tests/magic-lesson-flow.test.js`
- `public/themes/magic-park/boxes/lesson-flow/liquid-physics.js`

1. `getSurfaceProfile(sampleCount)` davranışı için dalgalı üst zarfı, boş suyu, sabit örnek sayısını ve ortalama seviyenin hedef ilerlemeye aynı karede kilitlenmesini doğrulayan kırmızı test yaz.
2. Testi çalıştır ve API olmadığı için beklenen şekilde başarısız olduğunu doğrula.
3. Snapshot parçacıklarından üst zarf çıkaran, komşu boşluklarını dolduran, iki geçişli yerel yumuşatma yapan ve ortalamasını hedef doluma sabitleyen profili uygula; yeni parçacıkları yüzey altında doğur.
4. Aynı odaklı testi yeşile geçir.

### Görev 14 — Yoğunluk gövdesini sürekli hacimle değiştirme

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json`
- `tests/magic-lesson-flow.test.js`

1. Nihai renderer'ın parçacık yoğunluğunu gövde alfa/rengine bağlamadığını; yüzey profili dokusu kullandığını doğrulayan kırmızı sözleşme testi yaz.
2. Density render target, instanced yoğunluk sprite'ları ve iki blur geçişini kaldır.
3. 128×1 `DataTexture` yüzey profilini her fizik karesinde güncelle.
4. Su shader'ında profil altını kesintisiz saydam hacim; profil türevini yüzey normali; ince kenarı Fresnel/köpük olarak çiz.
5. JSON renderer adını `surface-profile-refraction` olarak güncelle ve fizik/kabarcık sözleşmesini koru.

### Görev 15 — Canlı kabul ve belge kaydı

1. Orta-yüksek dolumlu gerçek Ders Akışı kutusunu 1920×1080 sahnede bir kez kontrol et.
2. Yatay sıra/şerit görünümü olmadığını, suyun tek parça hacim ve üst yüzey olarak okunduğunu, kabarcıkların yalnız su içinde kaldığını doğrula.
3. Tarayıcı konsolunu, odaklı testleri, JavaScript sözdizimini ve `git diff --check` sonucunu kontrol et.
4. Kök proje özetinde yoğunluk/metaball gövde ifadesini serbest yüzey profili mimarisiyle değiştir; commit/push yalnız kullanıcı ayrıca isterse yapılır.

### Revizyon 3 sonuç kaydı — 12 Ağustos 2026

- Kullanıcının 38,86 saniyelik gerçek ekran kaydında eski su yüzeyinin cetvel gibi düz kaldığı, yalnız kabarcıkların hareket ettiği ve parçacık izlerinin damlama hissi verdiği doğrulandı.
- Yoğunluk/metaball gövde çizimi tamamen kaldırıldı; nihai renge hiçbir LiquidFun parçacık satırı katılmıyor.
- Ortalama yüzey yüksekliği zaman yüzdesine aynı karede kilitlendi; `%100` ilerleme tam dolumdur.
- 128 örnekli sönümlü sığ-su denklemi ilerleyen/yansıyan dalgayı çözüyor; başlangıç hareketi, kenar kuvvetleri ve kabarcık patlamaları yüzeye fiziksel darbe veriyor.
- Yeni parçacıklar yüzey altında doğduğu için yukarıdan damlama görünümü kaldırıldı.
- Canlı 1920×1080 orta-dolum kontrolünde su gövdesi kesintisiz ve saydam, yüzey belirgin dalgalı, kabarcıklar su içinde ve sayaç/ortalama seviye `%50` eşleşmeli görüldü.

### Revizyon 4 sonuç kaydı — portakal suyu

- Kullanıcının 15,02 saniyelik ikinci ekran kaydında açık mavi hacmin pastel kutu zemininden yeterince ayrışmadığı doğrulandı.
- `lesson-flow.json` sıvı türü ve dört renkli portakal suyu paletinin tek sahibi yapıldı.
- Shader altın sarısı–koyu portakal hacim saçılımı, krem menisküs/köpük ve seyrek hareketli posa ile güncellendi.
- CSS fallback dahil tüm durumlarda turuncu sıvı kullanıldı; fiziksel dalga, `%100` tam dolum, yüzey altı parçacık doğumu ve 72 kabarcık korundu.

### Revizyon 5 sonuç kaydı — sık dalga ve cam kavanoz

- 16,48 saniyelik üçüncü ekran kaydı dalga aralıklarının geniş ve yüzey yüksekliğinin sakin kaldığını gösterdi.
- Yayılma `0.225`, hız korunumu `0.996`, yer değiştirme korunumu `0.99965`, kenar yansıması `0.82`, darbe yarıçapı `7` ve en yüksek sapma `0.086` olarak kutu JSON'unda tanımlandı.
- Beş noktasal kaynak, iki yönlü kapiler basınç ve `0.012` shader kapiler yüksekliğiyle yüzeyde daha sık ve sürekli hareket sağlandı.
- Özel üretilmiş `glass-jar-interior-v1.webp` kutu paketine alındı; CSS saydam kenar/yansıma, Three.js ise sıvı optik yolu, kenar yoğunluğu, yüzey alt dudağı ve taban merceği ekledi.
- 1920×1080 gerçek kiosk önizlemesinde cam yan kalınlığı ve tabanı dış çerçevenin arkasında görünür, merkez metinleri açık, turuncu hacim yüzde 50 dolumla eşleşir ve yüzeyde çoklu küçük dalga tepeleri okunur durumdadır.

### Revizyon 6 sonuç kaydı — kavanoz iç maskesi

- 17,77 saniyelik dördüncü ekran kaydı, sıvının cam yan kalınlığının altında ve oval tabanın dışında görünmesini yeniden üretti.
- Kök nedenin arka plan görselinde değil, tam ekran su quad'ında iç siluet maskesi bulunmaması olduğu doğrulandı.
- Önce `resolveJarInteriorBounds` regresyon testi kırmızı çalıştırıldı; ardından JSON sahipli iç sınır, oval taban ve omuz geometrisi shader ile kabarcıklara ortak uygulandı.
- 1920×1080 gerçek kiosk görünümünde `12:31 / 4. Teneffüs` düşük dolumu merkez taban çanağında; `1. Ders` orta dolumu cam yan duvarlarının içinde doğrulandı.

### Revizyon 7 sonuç kaydı — eliptik taban düzeltmesi

- 13,20 saniyelik beşinci ekran kaydı tabanın ortada fazla düz, yanlarda fazla dik yükseldiğini gösterdi.
- Önce gerçek elips orta-nokta yüksekliğini doğrulayan test kırmızı çalıştırıldı; güç rampası hem JavaScript hem GLSL tarafında aynı elips denklemiyle değiştirildi.
- 1920×1080 görünümde `12:42 / 4. Teneffüs` durumu kontrol edildi; sıvı alt kenarı cam taban yayıyla paralel ve kesintisiz, kabul edilen yan duvar sınırları değişmeden kaldı.

## Revizyon 8 uygulama planı — gerçek portakallı gazoz

> **Uygulama yöntemi:** Bu oturumda `superpowers:executing-plans` ile sıralı uygulanır. Her davranış önce kırmızı test, sonra en küçük uygulama ve yeşil test döngüsünü izler. Commit/push yalnız kullanıcı ayrıca isterse yapılır.

**Hedef:** Kavanoz arka planını gerçekten kıran, derinliğe bağlı turuncu ışık emilimi ve yüzey/cam nükleasyonlu karbonasyon içeren berrak portakallı gazoz üretmek.

**Mimari:** Three.js arka plan plakasını aynı sahnede çizer ve sıvı shader'ına örnekleme dokusu verir. Shader kavanoz maskesi içindeki kırılmış arka planı üstel geçirgenlik ve yüzey yansımasıyla birleştirir. Mevcut büyük kabarcıklara ikinci bir instanced mikro-karbonasyon katmanı eklenir; iki katman LiquidFun akıntısını ve ortak kavanoz geometrisini kullanır.

**Teknoloji:** Three.js `TextureLoader`, özel GLSL fragment shader, `InstancedMesh`, LiquidFun hız alanı, kutuya özel CSS/JSON, Node test runner.

### Görev 16 — Gazoz JSON ve optik sözleşmesi

**Dosyalar:**

- `tests/magic-lesson-flow.test.js`
- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.json`

1. `liquidKind: orange-soda`, posasız palet, `optics.absorption`, `optics.density`, `optics.refractionStrength` ve karbonasyon sayılarını isteyen kırmızı testi yaz.
2. Testi çalıştır; eski `orange-juice` ve `pulp` alanı nedeniyle başarısız olduğunu doğrula.
3. JSON'u tam olarak şu sözleşmeyle güncelle: 72 büyük, 168 mikro, 12 nükleasyon noktası, 36 duvar kabarcığı; optik yoğunluk ve RGB emilim katsayıları sayısal olmalı.
4. Aynı odaklı testi yeşile geçir.

### Görev 17 — Gerçek arka plan kırılması ve hacim emilimi

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`
- `tests/magic-lesson-flow.test.js`

1. `TextureLoader.loadAsync`, `uJarBackdrop`, kırılmış UV örneklemesi ve `exp(-uAbsorption * liquidPath)` ifadelerini isteyen kırmızı renderer testi yaz.
2. Kavanoz WebP'sini Three.js dokusu olarak yükle; tam ekran arka düzlemi sıvının gerisinde çiz.
3. Eski opak renk/alfa gövdesi ve posa hücrelerini kaldır. Kırılmış arka plan + üstel geçirgenlik + turuncu saçılım + Fresnel/menisküs birleşimini uygula.
4. `setSodaStyle(optics, palette)` ile JSON değerlerini uniformlara aktar; doku yüklenemezse güvenli cam rengi kullan.
5. Odaklı renderer testini ve JavaScript sözdizimi kontrolünü yeşile geçir.

### Görev 18 — Nükleasyon zincirleri ve cam kabarcıkları

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`
- `tests/magic-lesson-flow.test.js`

1. `buildCarbonationSites(count, interiorMask)` saf fonksiyonunun tam sayı kadar, simetrik olmayan ve kavanoz içinde nokta üretmesini isteyen kırmızı test yaz.
2. Fonksiyonu dışa aktar ve 12 deterministik nükleasyon noktası üret.
3. 168 örnekli ikinci `InstancedMesh` oluştur; 132 yükselen zincir ve 36 cama tutunan mikro kabarcık davranışı uygula.
4. Mikro kabarcıkları eliptik tabandan doğur, yüzeye yaklaşırken büyüt, cam sınırlarında tut ve yüzey üstünde gizle.
5. Büyük kabarcıkların mevcut LiquidFun sürüklenmesini ve yüzey patlamasını koru; mikro katmanın ayrı geometri/malzeme kaynaklarını dispose et.
6. Fonksiyon ve renderer sözleşmesi testlerini yeşile geçir.

### Görev 19 — Canlı kabul, fallback ve belge kaydı

**Dosyalar:**

- `public/themes/magic-park/boxes/lesson-flow/README.md`
- `docs/PROJE_OZETI.md`
- `docs/superpowers/specs/2026-08-12-magic-park-lesson-flow-box-design.md`
- `docs/superpowers/plans/2026-08-12-magic-park-lesson-flow-box-implementation.md`

1. 3840×2160 düşük/orta dolum durumunda kırılma, berraklık, nükleasyon zincirleri ve metin kontrastını kontrol et.
2. 1920×1080 aynı durumları kontrol et; sıvı/kabarcıkların kavanoz maskesinden taşmadığını doğrula.
3. Tarayıcı uyarı/hata kayıtlarını, odaklı testleri, sözdizimini, JSON parse ve `git diff --check` sonucunu çalıştır.
4. README ve proje özetine posasız gazoz optiği ile iki kabarcık katmanını işle; sonuç kaydına gerçek kabul durumunu yaz.

### Revizyon 8 sonuç kaydı — gerçek portakallı gazoz

- Kırmızı/yeşil test döngüsüyle `orange-soda`, RGB emilim, optik yoğunluk, 72 büyük + 168 mikro kabarcık, 12 çekirdeklenme noktası ve 36 duvar kabarcığı kutuya özel JSON sözleşmesine alındı.
- Three.js kavanoz WebP'sini sahne dokusu olarak yükleyip sıvı içinden kırıyor; shader derinliğe bağlı `exp(-absorption × path)` geçirgenliğini turuncu saçılım, Fresnel, caustic, menisküs ve eliptik taban merceğiyle birleştiriyor. Eski posa alanı kaldırıldı.
- Mikro kabarcıklar deterministik fakat simetrik olmayan dip noktalarından zincir hâlinde doğuyor; cam kabarcıkları bekleyip ayrılıyor, bütün katmanlar ortak kavanoz maskesi ve LiquidFun hız alanında kalıyor.
- 3840×2160 önizlemede `12:42 / 4. Teneffüs / %55` durumu; 1920×1080 görünümde `365 × 236 px` gerçek kutu boyutu doğrulandı. Her iki boyutta metin içeride ve okunaklı, canvas kutuya tam oturuyor; tarayıcı konsolunda hata yok.
