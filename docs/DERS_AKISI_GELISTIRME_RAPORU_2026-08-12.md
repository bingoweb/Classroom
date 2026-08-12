# Magic Park Ders Akışı — Ayrıntılı Geliştirme ve Kabul Raporu

**Tarih:** 12 Ağustos 2026
**Kapsam:** Magic Park `Ders Akışı` kutusu ve bu kutunun kullandığı gerçek program zamanı
**Durum:** Uygulandı, gerçek kiosk boyutlarında doğrulandı
**Tasarım adı:** Sihirli Su Saati / Büyülü Cam Amblem

Bu belge, Ders Akışı kutusunun ilk işlevsel hata düzeltmesinden nihai portakallı gazoz, cam kavanoz ve üst yazı sistemine kadar yapılan geliştirmelerin tek tamamlanma kaydıdır. Kod ayrıntılarında Git HEAD; tasarım kararlarında `docs/superpowers/specs/2026-08-12-magic-park-lesson-flow-box-design.md` kaynak gerçektir.

## 1. Sonuç özeti

Ders Akışı kutusu eski ortak Magic Park CSS'sine bağlı, dakika çözünürlüklü ve ayrı ilerleme çubuğu kullanan yapıdan çıkarıldı. Yeni yapı:

- gerçek duvar saati saniyesiyle ilerleyen ders/teneffüs geri sayımı,
- her ders ve teneffüs için insan tarafından okunabilen sıra numarası,
- dolum yüksekliğinin zamanı doğrudan temsil ettiği tek ilerleme göstergesi,
- özel Three.js/GLSL hacim çizimi,
- LiquidFun parçacık ve akıntı fiziği,
- 128 örnekli sürekli serbest yüzey profili,
- gerçek kavanoz arka plan kırılması,
- berrak portakallı gazoz optiği,
- büyük, mikro ve cama tutunan karbonasyon kabarcıkları,
- gerçek elips tabanlı ortak kavanoz iç maskesi,
- dolum seviyesine duyarlı, uzaktan okunabilen Büyülü Cam Amblem yazı sistemi,
- CSS/WebGL/asset yükleme hatalarında bilgi kaybettirmeyen fallback

sağlar.

Ayrı ilerleme çubuğu kaldırılmıştır. Sıvı yüksekliği hem görsel anlatım hem de kesin zaman ilerleme göstergesidir.

## 2. Düzeltilen gerçek işlev hataları

### 2.1 Saniyenin çalışmaması

Eski `ScheduleManager`, saati yalnız saat ve dakika üzerinden hesaplıyordu. Bu nedenle aynı dakika boyunca sayaç değeri değişmiyor, saniye geçişi görünmüyor ve kutu gerçek zamanlı çalışmıyormuş gibi görünüyordu.

Yeni hesaplama:

- gün içi zamanı saniyeye çevirir,
- ders ve teneffüs başlangıç/bitişlerini saniye cinsinden karşılaştırır,
- kalan süreyi `MM:SS`, bir saati aşan değerleri `H:MM:SS` biçiminde üretir,
- tam dönem sınırında eski dönemin `00:00` değerinde takılı kalmadan yeni döneme geçer.

Örnek doğrulamalar:

- `09:10:00 → 30:00`
- `09:10:01 → 29:59`
- `09:39:59 → 00:01`
- `09:40:00 → 15:00` ve teneffüs durumu
- `07:59:59 → 1:00:01`

### 2.2 Teneffüs ilerlemesinin sıfırlanması

Eski yapı ders ilerlemesini hesaplıyor, teneffüsü ise sıfırda bırakıyordu. Artık hem ders hem teneffüs için `progress = elapsedSeconds / durationSeconds × 100` hesaplanır. Değer `0..100` aralığına sınırlandırılır. Örneğin 15 dakikalık teneffüsün 7 dakika 30. saniyesi tam `%50` ilerlemedir.

### 2.3 Ders/teneffüs sıra numarası

Durum çıktısına `currentPeriodNumber` eklendi. Sıra numarası aynı türdeki önceki program satırları sayılarak üretilir; böylece `4. DERS` ve `4. TENEFFÜS` başlıkları ayrı ve doğru diziler üzerinden okunur.

### 2.4 Tek veri kaynağı

`public/js/script.js`, mevcut `ScheduleManager.getScheduleStatus(now)` sonucunu saniyede bir `classroom:schedule-status-updated` olayıyla yayınlar. Magic Park Ders Akışı controller'ı bu olaya abonedir; kendi saat/program hesabını yapmaz. Magic Park dışı temaların eski DOM davranışı korunur.

## 3. Kutuya özel mimari

Her kutunun kendi CSS ve JSON dosyasına sahip olması kuralı Ders Akışı için eksiksiz uygulandı:

```text
public/themes/magic-park/boxes/lesson-flow/
├── README.md
├── assets/
│   └── glass-jar-interior-v1.webp
├── lesson-flow.css
├── lesson-flow.js
├── lesson-flow.json
└── liquid-physics.js
```

Sahiplik sınırları:

- `lesson-flow.css`: bütün kutu yerleşimi, cam katmanları, tipografi, kontrast ve CSS fallback.
- `lesson-flow.json`: durum paletleri, hareket süreleri, tipografi, sıvı, optik, dalga, karbonasyon, fizik ve kavanoz maskesi değerleri.
- `lesson-flow.js`: görünüm modeli, erişilebilir DOM üretimi, JSON doğrulama, olay yaşam döngüsü, Three.js sahnesi ve özel GLSL shader.
- `liquid-physics.js`: LiquidFun dünyası, parçacık tankı, sabit zaman adımı, dolum hedefi, akıntı örneklemesi ve yüzey profili.
- `glass-jar-interior-v1.webp`: kutuya özel optik kavanoz iç arka plakası.

`theme.css` yalnız kutu CSS'sini içe aktarır. Eski Ders Akışı görünüm kuralları `kiosk-magic-park.css`, `magic-components.css` ve `magic-states.css` içinden kaldırılmıştır. Böylece ortak dosyalarda kutuya özel görsel sahiplik kalmaz.

## 4. Yerel ve çevrimdışı çalışma zamanı

Kiosk'un internet olmadan çalışması korunmuştur.

- Three.js `0.185.1` tarayıcı modülleri `public/vendor/three/` altında lisansıyla saklanır.
- LiquidFun uyumlu parçacık çalışma zamanı `@box2d/core` ve `@box2d/particles` kaynaklarından `esbuild` ile yerel ESM bundle olarak üretilir.
- Üretim komutu: `npm run build:liquidfun-vendor`.
- Üretim girdisi: `scripts/vendor/liquidfun-entry.mjs`.
- Üretim çıktısı: `public/vendor/liquidfun/liquidfun.module.js`.
- Lisans ve `type: module` paket işareti vendor klasöründe tutulur.

`@box2d/core`, `@box2d/particles` ve `esbuild` yalnız build/test geliştirme bağımlılığıdır; kiosk çalışma anında `node_modules` veya CDN kullanmaz.

## 5. Sıvı fiziği ve yüzey mimarisi

### 5.1 LiquidFun sorumluluğu

LiquidFun katmanı yerçekimi, basınç, viskozite, yüzey gerilimi, tank çarpışması, parçacık hız alanı ve büyük kabarcık sürüklenmesi üretir. Fizik sabit `60 Hz` adımla çalışır ve en fazla `640` parçacık kullanır.

### 5.2 Neden parçacıklar doğrudan çizilmiyor

İlk yoğunluk/metaball denemesinde dinlenmiş parçacık sıraları yatay şeritler gibi görünüyordu. Bu nedenle parçacık yoğunluğu nihai su rengine bağlanmadı. Parçacıklar yalnız fizik ve akıntı kaynağıdır.

Görünür serbest yüzey:

- parçacık üst zarfından türetilen,
- boşlukları doldurulan,
- iki geçişli yerel yumuşatma uygulanan,
- ortalaması zamanın hedef dolumuna kilitlenen,
- `128` örnekli bir yükseklik profilidir.

Bu profile sönümlü sığ-su çözücüsü eklenir. Dalga yayılması `0.225`, hız korunumu `0.996`, yer değiştirme korunumu `0.99965`, kenar yansıması `0.82`, en yüksek sapma `0.086` değerleriyle JSON tarafından yönetilir.

### 5.3 Dolum senkronu

Programın `progress` değeri ile görünür ortalama yüzey yüksekliği aynı render karesinde eşleştirilir. `%100` tam dolumdur. Yeni parçacıklar yüzeyin altında oluşturulduğu için yukarıdan damlama görünümü oluşmaz.

## 6. Portakallı gazoz optiği

Sıvı türü `orange-soda` olarak tanımlanmıştır; posa kullanılmaz.

Shader şu katmanları tek hacim malzemesinde birleştirir:

- gerçek kavanoz arka planının dalga normaline göre kırılması,
- derinliğe bağlı üstel RGB ışık emilimi,
- altın sarısı ince bölge ve doygun portakal derin bölge,
- turuncu hacim saçılımı,
- Fresnel yansıması,
- hareketli caustic,
- cam kenarında yükselen menisküs,
- kavisli taban merceği,
- yalnız yüzey eğiminde görünen ince krem parlama.

Başlıca JSON değerleri:

- emilim: `[0.18, 0.72, 1.55]`
- optik yoğunluk: `1.18`
- kırılma gücü: `0.018`
- Fresnel: `0.36`
- menisküs yükselişi: `0.018`

Arka doku yüklenemezse güvenli cam rengi kullanılır; DOM metni ve zaman bilgisi kaybolmaz.

## 7. Karbonasyon sistemi

Üç birlikte çalışan kabarcık davranışı vardır:

1. `72` büyük yükselen kabarcık,
2. `12` düzensiz dip çekirdeklenme noktasından doğan `168` mikro kabarcık,
3. bunların içinde cam duvarında geçici olarak bekleyen `36` kabarcık.

Çekirdeklenme noktaları deterministik fakat tam simetrik olmayan biçimde üretilir. Mikro kabarcıklar kavanozun eliptik tabanından doğar, yükselirken büyür, akıntı hızını izler ve yüzeye ulaştığında yeniden çevrilir. Duvar kabarcıkları camda bekler, büyür ve sonra akışa katılır.

## 8. Cam kavanoz ve ortak iç maske

İlk kavanoz sürümünde sıvı yan cam kalınlığının ve oval tabanın dışına taşıyordu. Kök neden tam ekran sıvı quad'ında kavanoz iç geometrisi bulunmamasıydı.

`glass.interiorMask` artık sıvı, yüzey ve bütün kabarcık katmanlarının ortak geometrisidir:

- yan iç boşluk: `0.075`
- merkez taban yüksekliği: `0.072`
- kenar taban yüksekliği: `0.18`
- taban eğrisi: gerçek elips, `bottomCurve: 2`
- tavan: `0.955`
- omuz daralması: `0.055`
- yumuşatma: `0.012`

Taban ortada alçak, iki yana doğru gerçek elips denklemiyle yükselir. Düşük dolum merkezdeki taban çanağından başlar; sıvı ve kabarcıklar kalın camın içine veya dışına taşmaz.

## 9. Bilgi ve tipografi sistemi

### 9.1 Hiyerarşi

Okuma sırası:

1. büyük sayaç,
2. ders/teneffüs sıra başlığı,
3. `DERSE/TENEFFÜSE KALAN` açıklaması,
4. varsa `ŞİMDİ / SIRADAKİ` bağlamı.

### 9.2 Büyülü Cam Amblem

- Ders/teneffüs başlığı kesimli, saydam cam arma içindedir.
- Arma camgöbeği, lila ve sıcak turuncu ışık kırılmaları taşır; sıvıyı opak bir panelle kapatmaz.
- Ara başlık iki yanda küçük ölçekte de görünen ışık rayları kullanır.
- Sayaç dört kısa derinlik katmanlı emaye yüzdür.
- Rakamlar sürekli hareket etmez; yalnız `:` ayraçları düşük genlikli nefes animasyonu yapar.
- `prefers-reduced-motion` altında yeni animasyonlar kapanır.

Renk ve hareket değerleri `lesson-flow.json > typography` alanının tek sahipliğindedir. Controller yalnız geçerli altı haneli renkleri ve `200..20000 ms` aralığındaki süreleri CSS değişkenlerine aktarır.

### 9.3 Erişilebilirlik

Sayaç görsel olarak rakam ve ayraç span'lerine ayrılır; bütün değer ebeveyn üzerindeki `aria-label` ile tek parça okunur. Görünmez ilerleme ölçeri `role=progressbar`, `aria-valuemin`, `aria-valuemax` ve güncel `aria-valuenow` değerlerini taşır. Sahne `aria-live=polite` kullanır.

### 9.4 Doluma duyarlı kontrast

Sıvı aşağıdan yukarı yükseldikçe okuma bölgeleri ayrı eşiklerde renk değiştirir:

- alt bağlam: `%24`
- sayaç: `%50`
- ara başlık: `%74`
- başlık: `%90`

Kuru bölgede petrol yüz/krem kenar; sıvı içinde krem yüz/petrol kenar kullanılır. Arka tarafa opak bilgi plakası eklenmez.

## 10. Durum modeli

Desteklenen durumlar:

- `before-school`: başlangıca gerçek saniyelik süre,
- `in-class`: kaçıncı ders ve teneffüse kalan süre,
- `in-break`: kaçıncı teneffüs ve derse kalan süre,
- `after-school`: gün sonu mesajı,
- `weekend`: hafta sonu mesajı,
- `error`: program hazırlanıyor fallback'i.

Harici program yüklenmemişse bilinmeyen “sıradaki ders” tahmin edilmez. Fallback program yalnız kesin mevcut dönem bilgisini gösterir.

## 11. DOM ve tema uyumluluğu

`public/index.html` içinde yeni Magic Park sahnesi, WebGL hostu, glow katmanı, erişilebilir progress ölçeri ve metin hiyerarşisi eklenmiştir. Eski Ders Akışı DOM'u `.lesson-flow-legacy` içinde korunur.

- Magic Park temasında yeni kutu gösterilir, legacy görünüm gizlenir.
- Diğer temalarda mevcut legacy çalışma düzeni devam eder.
- `lesson-flow.js` tema değişimini dinler ve WebGL yaşam döngüsünü aktif/pasif hâle getirir.
- Dispose aşamasında olay dinleyicileri, geometri, malzeme, doku ve fizik kaynakları bırakılır.

## 12. Fallback ve hata davranışı

- JSON yüklenemezse CSS varsayılanları okunabilir tasarımı korur.
- GSAP yoksa metin ve durum değişir; yalnız koreografi atlanır.
- Three.js/WebGL/LiquidFun yoksa aynı yüzdeyi kullanan turuncu CSS dolumu görünür.
- Kavanoz arka görseli yüklenemezse güvenli cam rengi kullanılır.
- Hata durumunda kullanıcı teknik hata yerine `PROGRAM BEKLENİYOR` ve açıklayıcı metin görür.

## 13. Dosya değişiklik özeti

### Yeni dosyalar

- `public/themes/magic-park/boxes/lesson-flow/*`: kutu paketi.
- `public/vendor/liquidfun/*`: yerel parçacık fiziği bundle ve lisansı.
- `public/vendor/three/*`: yerel Three.js modülleri ve lisansı.
- `scripts/build-liquidfun-vendor.cjs`: tekrar üretilebilir vendor build'i.
- `scripts/vendor/liquidfun-entry.mjs`: sınırlı tarayıcı export girişi.
- `tests/magic-lesson-flow.test.js`: paket, fizik, optik, erişilebilirlik ve sahiplik sözleşmeleri.
- tasarım ve uygulama planları: `docs/superpowers/specs/` ve `docs/superpowers/plans/`.

### Güncellenen dosyalar

- `public/js/schedule-manager.js`: saniye hassasiyeti, kesintisiz ilerleme ve sıra numarası.
- `public/js/script.js`: tek schedule status olayı.
- `public/index.html`: yeni sahne DOM'u ve yerel script yükleme sırası.
- `public/themes/magic-park/theme.css`: kutu CSS importu.
- ortak Magic Park CSS dosyaları: eski Ders Akışı sahipliğinin kaldırılması.
- `package.json` / `package-lock.json`: tekrar üretilebilir LiquidFun build araçları ve test komutu.
- kiosk ve program testleri: yeni sahiplik ve saniyelik çalışma sözleşmeleri.
- `docs/PROJE_OZETI.md`, kutu README'si ve bu rapor: güncel mimari ve kabul kanıtı.

## 14. Görsel kabul

Kullanıcı ekran kayıtlarıyla yapılan iterasyonlarda sırasıyla şu sorunlar ele alındı:

- yatay parçacık çizgileri ve “yoğurt kıvamı” görünümü,
- sıvı ile zamanın tam eşleşmemesi,
- yukarıdan damlama hissi,
- yüzey dalgasının az ve düşük olması,
- şeffaf suyun arka plandan ayrışmaması,
- portakallı gazoz rengi ve berraklığı,
- cam kavanoz derinliği,
- sıvının yan cam ve taban dışına taşması,
- alt ovalin gerçek elipse uymaması,
- başlığın gri/yalın kalması ve ara yazının küçük olması.

Nihai canlı kabul:

| Görünüm | Gerçek kutu | Sonuç |
| --- | ---: | --- |
| 3840×2160 | yaklaşık `730 × 472 px` | Başlık, ara başlık, sayaç ve bağlam içeride; canvas kutuya tam oturuyor; konsol hatası yok. |
| 1920×1080 | yaklaşık `365 × 236 px` | Taşma/kırpılma yok; ara başlık `15.15 px`, sayaç `66.43 px`; ışık rayı en az `1 px`. |

Kabul durumu `12:42 / 4. Teneffüs / yaklaşık %55` üzerinden; hem orta dolum hem sıvının metin bölgelerini geçtiği yüksek dolum üzerinden kontrol edildi.

## 15. Test ve doğrulama kaydı

Tamamlanma sırasında alınan sonuçlar:

- `node --check public/themes/magic-park/boxes/lesson-flow/lesson-flow.js`: başarılı.
- `lesson-flow.json` parse: başarılı.
- `node --test tests/magic-lesson-flow.test.js`: `23/23` başarılı.
- `node --test --test-concurrency=1 tests/*.test.js`: `1644/1644` başarılı.
- son odaklı Ders Akışı + dokümantasyon koşusu: `31/31` başarılı.
- `git diff --check`: temiz.
- 4K ve 1080p tarayıcı kabulünde konsol hatası: `0`.

Üst yazı revizyonunda sıvıya dokunulmadığını kanıtlayan SHA-256 değerleri:

```text
createThreeFlowLayer eae2626f580b7fe39fda52ede427b9ce191f50905c52ba462868d813c500498d
water JSON          0d998ee65eef4315d061bea9083260eba07c0043f6860aca463e90015666f0b9
```

Paket içinde genel `npm test` betiği tanımlı değildir; depo geneli doğrulama doğrudan Node test runner ile yapılmıştır.

## 16. Bakım ve geliştirme notları

- Fizik/optik değerleri CSS veya JavaScript sabitlerine dağıtılmamalı; `lesson-flow.json` tek kaynak olarak kalmalıdır.
- Kutuya özel yeni görsel kurallar ortak Magic Park CSS dosyalarına eklenmemelidir.
- LiquidFun vendor çıktısı elle düzenlenmemeli; build komutuyla yeniden üretilmelidir.
- Üçüncü taraf vendor lisansları silinmemelidir.
- Sıvı değişikliğinde düşük, orta ve yüksek dolum; hem 4K hem 1080p gerçek kiosk görünümünde kontrol edilmelidir.
- Tipografi değişikliğinde `365 × 236 px` gerçek kutu boyutu temel kabul ölçüsüdür.
- Ayrı ilerleme çubuğu tekrar eklenmemelidir; zamanın görsel kaynağı sıvı yüksekliğidir.

## 17. İlgili belgeler

- Tasarım sözleşmesi: `docs/superpowers/specs/2026-08-12-magic-park-lesson-flow-box-design.md`
- Ana uygulama yol haritası: `docs/superpowers/plans/2026-08-12-magic-park-lesson-flow-box-implementation.md`
- Büyülü Cam Amblem uygulama planı: `docs/superpowers/plans/2026-08-12-magic-park-lesson-flow-typography-implementation.md`
- Kutu teknik README'si: `public/themes/magic-park/boxes/lesson-flow/README.md`
- Güncel proje özeti: `docs/PROJE_OZETI.md`
