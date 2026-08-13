# Classroom — Güncel Proje Özeti

**Güncelleme:** 12 Ağustos 2026
**Repo:** `bingoweb/Classroom`
**Aktif dal:** `main`

Bu belge Classroom ürününün güncel insan-okur teknik özetidir. Değişen kod ayrıntılarında **Git HEAD kaynak gerçekliktir**.

Ders Akışı kutusunun hata kök nedenleri, fizik/optik mimarisi, dosya sahipliği, iterasyonları ve gerçek boyutlu kabul kanıtları:

`docs/DERS_AKISI_GELISTIRME_RAPORU_2026-08-12.md`

Açık işler, tamamlanan düzeltmeler ve güncel test/CI kanıtları:

`Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`

Derin mimari ve Git geçmişi taraması:

`CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`

## 1. Ürün amacı

Classroom, ilkokul sınıfında büyük ekranda sürekli çalışan bir dijital pano ile öğretmenin günlük yönetim işlerini yaptığı web panelini aynı yerel uygulamada birleştirir.

İki ana yüzey vardır:

1. **2/D Sihirli Pano / Sihirli Öğrenme Parkı (Magic Park)** — öğrenciye dönük kiosk.
2. **Admin Panel** — öğretmene dönük yönetim yüzeyi.

Uygulama yerel-first tasarlanmıştır. Kiosk'un temel çalışma zamanında dış CDN zorunluluğu yoktur.

## 2. Kiosk bilgi mimarisi

Ana kiosk tek 16:9 sahne içinde **8 ana bölge** taşır.

### 2.1 Günün zamanı

- gün adı,
- tarih,
- dijital saat,
- hafta sonu/tatil bağlamı.

### 2.2 Sınıf mevcudu

- toplam öğrenci,
- kız öğrenci sayısı,
- erkek öğrenci sayısı,
- üç sahneli soldan sağa akış,
- cinsiyet sahnelerinde çocuk → etiket → sayı koreografisi.

Günlük yoklama ve gelmeyen öğrenci ayrıntıları artık bu kutuda tekrar edilmez; merkez Class TV yayınında gösterilir. Magic Park kutusu kendi `attendance.css`, `attendance.json`, `attendance.js` ve asset paketine sahiptir.

### 2.3 Ders akışı

- okul öncesi durum,
- gerçek saniyelik ders/teneffüs geri sayımı,
- uzaktan okunabilen `kaçıncı ders / kaçıncı teneffüs` başlığı,
- aşağıdan yukarıya dolan özel GLSL portakallı gazoz yüzeyi,
- 72 büyük ve 168 mikro gazoz kabarcığı; 12 dip çekirdeklenme zinciri ve 36 cama tutunan kabarcık,
- dolum seviyesine duyarlı yazı kontrastı,
- su yüksekliğinin kendisini kullanan hassas zaman göstergesi,
- şimdi/sıradaki ders bağlamı,
- okul sonrası ve hafta sonu durumları.

Magic Park Ders Akışı görünümü kendi `lesson-flow.css`, `lesson-flow.json`, `lesson-flow.js`, `liquid-physics.js` ve `assets/glass-jar-interior-v1.webp` paketine sahiptir. LiquidFun parçacık çözümü basınç, viskozite, yüzey gerilimi, yerçekimi, tank çarpışması ve kabarcık akıntısını; 128 örnekli sönümlü sığ-su çözücüsü ile sürekli kapiler basınç alanı ise sık, ilerleyen ve yansıyan serbest yüzey dalgasını hesaplar. Görünür sıvı `lesson-flow.json` tarafından tanımlanan berrak, posasız portakallı gazozdur. Three.js gerçek kavanoz arka plakasını sıvı içinden kırar; derinliğe bağlı üstel RGB geçirgenliği, turuncu hacim saçılımı, hareketli caustic, Fresnel yansıması, cam kenarında yükselen menisküs ve kavisli taban merceğini tek malzemede birleştirir. 72 büyük fiziksel kabarcığın yanında 12 düzensiz dip noktasından doğan 168 mikro kabarcık vardır; 36'sı cam duvarında bekleyip sonra akışa katılır. Özel arka plaka ve saydam CSS cam kenarı sıvıyı gerçek bir kavanoz hacmine oturtur. JSON sahipli `glass.interiorMask`, sıvı ile kabarcıkları cam yan duvarlarının, yuvarlak omuzların ve iki yana yükselen oval tabanın içinde keser; düşük dolum düz bir çizgiden değil taban çanağının merkezinden başlar. Ortalama sıvı yüksekliği zaman ilerlemesine aynı karede kilitlidir ve yeni parçacıklar yüzey altında doğar. Bilgi alanları sıvıyı kapatmayan optik camdır; boş mevcut/sıradaki bağlamı DOM'dan gizlenir. Ayrı bir ilerleme çubuğu yoktur. WebGL kullanılamazsa DOM metinleri ile aynı yüzdeyi kullanan turuncu CSS dolumu bilgi kaybı olmadan devam eder.

Başlık, kalan süre açıklaması ve sayaç 12 Ağustos 2026'da kutuya özel **Büyülü Cam Amblem** sistemiyle yenilendi. Kesimli saydam amblem, küçük ölçekte de görünen çift ışık rayı ve dört katmanlı emaye sayaç; yükselen sıvıya göre yüz/kenar renklerini tersleyerek okunurluğu korur. Palet ve hareket değerleri `lesson-flow.json > typography` alanından gelir; CSS ve JSON sahipliği başka kutularla paylaşılmaz. Bu revizyonda sıvı, gazoz fiziği, kabarcıklar, kavanoz maskesi ve dolum senkronu değiştirilmedi.

### 2.4 Sınıfın ses dengesi

- Web Audio mikrofon pipeline'ı,
- otomatik kalibrasyon,
- Sessiz / Dikkat / Gürültü durumları,
- gerçek analyser verisini kullanan 128 bant equalizer,
- retry ve izin/hata mesajları.

Magic Park görünümü 12 Ağustos 2026'da bağımsız `public/themes/magic-park/boxes/noise-meter/` paketine taşındı. Son tasarım **Sihirli Ses Konsolu** yaklaşımıdır: kutu çocuk dostu bir elektronik cihaz / mini oto teyibi ön yüzü gibi görünür. Aktif faceplate kullanıcı kaynaklı `public/assets/panel.png` dosyasından GIMP 3.2 ile dış beyaz canvas temizlenip gerçek cihaz sınırına kırpılarak `assets/noise-console-panel.webp` üretilir. Runtime geometri sözleşmesi 4K açıklıkta `1420×638`, 1080p'de `710×319`; faceplate yatay fit değeri kesin `100.55% auto`, dikey ölçek `scaleY(1.018)` ve alt üç kontrol grubu `top: 74.0%` değerindedir. `panel2.png` runtime'da kullanılmaz.

Alt fiziksel kontrol bölgesinde yalnız `Sessiz / Dikkat / Gürültü` görünür; eski manuel `Tekrar Dene` katmanı tamamen kaldırılmıştır. Mikrofon yokken 128 bantlı doğal demo equalizer ile alt seviye çubuğu birlikte hareket eder; bu demo ARIA meter değerini veya gerçek ses durumunu taklit etmez. Tarayıcı `devicechange` ile yeni mikrofon bildirdiğinde `public/js/noise-meter.js` otomatik yeniden bağlanır ve gerçek analyser hem equalizer'ı hem ilerleme çubuğunu anında devralır. Gerçek analyser tarafında eski 5% quantization kaldırıldı; düşük enerjili bantlar da görünür kalır ve attack/release yumuşatması ile daha hassas, akışkan tepki verir. Equalizer ve demo çubuğu Magic Park'ın mavi/cyan, mint, sarı, pembe ve mor paletine bağlanmıştır.

Gerçek işlevin tek sahibi `public/js/noise-meter.js` olarak korunur: `getUserMedia`, `AudioContext`, kalibrasyon, RMS loudness, skor yumuşatma, eşik/histerezis, 128 bant verisi, otomatik mikrofon yeniden bağlanması, ARIA meter ve `classroom:noise-state` burada kalır. Durum metinleri ve üç kontrol etiketi yüksek-keskinlik font smoothing, kontrollü `-webkit-text-stroke` ve çok katmanlı gölge ile 4K/1080p okunabilirliğe göre güçlendirilmiştir. Lavunu/gürültü karakterleri yalnız Class TV'de kalır.

### 2.5 Sınıfımızdan slideshow

- image/GIF/video,
- caption,
- profesyonel transition havuzu,
- reduced-motion desteği,
- bir sonraki medyanın kontrollü hydrate edilmesi,
- stale callback'lere karşı generation invalidation.

### 2.6 Sınıf başkanı

- bir başkan,
- en fazla iki yardımcı,
- face-focus destekli portreler.

### 2.7 Nöbetçiler

- en fazla dört öğrenci,
- uzun isim desteği,
- face-focus.

### 2.8 Haftanın yıldızları

- sınırsız yıldız rolü,
- mini slideshow,
- geçiş ve dot göstergeleri.

## 3. Magic Park görsel sistemi

Güncel kiosk kimliği çocuk odaklı **Magic Park / Sihirli Öğrenme Parkı** tasarımıdır.

Ana parçalar:

- `public/index.html`
- `public/css/style.css`
- `public/css/kiosk-magic-park.css`
- `public/js/script.js`
- `public/js/kiosk-motion.js`

Stage gerçek 16:9 oran kullanır. Büyük arka plan kabuğu, yerel 3D ikonlar ve yerel Fredoka/Nunito fontlarıyla bütünleşik bir sınıf parkı görünümü oluşturur.

GSAP hareketleri layout'tan ayrıştırılmıştır. Entrance tamamlandığında titlebar inline transformları temizlenir; bu sayede viewport resize/fullscreen sırasında CSS merkezleme source of truth olarak kalır.

Browser ön-kabulünde:

- 3840×2160,
- 2560×1440,
- 1920×1080,
- 1366×768

hedeflerinde stage/kart/titlebar overflow görülmemiştir.

Gerçek 55" fiziksel 4K TV kabulü ayrı donanım kalite kapısı olarak hâlâ açıktır.

### Magic Park — Sınıf Başkanı kutusu

Başkan kutusu artık kendi `public/themes/magic-park/boxes/president/` paketine sahiptir:

- `president.css` — kutuya özel sunum ve optik geometri,
- `president.json` — box manifesti / görsel dil,
- `assets/president-stage.webp` — açık, sıcak iç yüzey asseti,
- `README.md` — kutu sahipliği ve kabul kuralları.

Canlı içerik yalnız **başkan fotoğrafı + başkan adı**dır. Dış artwork zaten `Sınıf Başkanı` başlığını taşıdığı için ikinci başlık, taç, slogan veya açıklama render edilmez. Başkan yardımcıları Class TV sahipliğinde kalır.

İç tasarım koyu madalyon görünümünden çıkarılmış; açık krem/şeftali zemin, organik fotoğraf çerçevesi ve açık isim plakası kullanılmıştır. Başkan kutusuna özel selectorlar ortak `magic-components.css` / generic kiosk CSS'e geri taşınmaz.

Foreground artwork'ün transparan açıklığı geometrik olarak kart bounding-box'ıyla simetrik değildir. Bu yüzden Başkan fotoğrafı ve isim plakası kaba kart merkezine değil gerçek açıklığın ölçülmüş optik merkezine hizalanır; runtime transition transformunun bu merkezi bozması box-local CSS tarafından nötralize edilir. 1920×1080 ve 4K kabulünde fotoğraf ve isim aynı eksende, üst/alt boşlukları dengeli doğrulanmıştır.

Mevcut 30 gerçek öğrenci importunda yüklenmiş bireysel fotoğraf yoktur. Eski `default_boy.png` / `default_girl.png` dosyalarında dama deseni gömülü olduğundan yalnız bu default yollar Başkan kutusunda temiz Magic Park 3D cinsiyet fallback'ine çevrilir; gerçek `/uploads/...` öğrenci fotoğrafı geldiğinde gerçek fotoğraf korunur.

## 4. Admin paneli

Admin ana navigasyonunda dört günlük iş vardır:

### Öğrenciler

- öğrenci ekleme,
- silme,
- fotoğraf ekleme/değiştirme,
- arama/filtreleme,
- Excel import.

### Görevler

Roller:

- `president` — 1,
- `vice_president` — en fazla 2,
- `duty` — en fazla 4,
- `star` — sınırsız.

Duplicate rol atamaları reddedilir. Başkan değiştirme ve bounded rol limitleri transaction/atomic SQL davranışıyla korunur.

### Yoklama

- tarih bazlı,
- present/absent,
- toplu replacement transaction,
- strict tarih ve student ID doğrulaması.

Admin “Bugün” ile backend istatistik günü **Europe/Istanbul** takvim gününü kullanır.

### Slaytlar

Teacher-owned slaytlar:

- create,
- update,
- delete,
- reorder,
- aktif/pasif,
- image/GIF/video,
- caption,
- süre,
- transition ayarları.

Pasif teacher slide admin listesinde kalır ve tekrar aktive edilebilir.

## 5. System-owned Atatürk fallback slaytları

Kiosk boş kalmasın diye yedi canonical Atatürk fallback slaytı vardır.

Bunlar öğretmen içeriği değildir; **system-owned** güvenlik ağıdır.

Startup reconciliation:

- eksik fallback'i geri ekler,
- bozulmuş canonical değerleri onarır,
- pasifleşmiş fallback'i aktive eder,
- duplicate `fallback_key` oluşturmaz.

Admin management listesi system fallback'leri göstermez.

Doğrudan API:

- fallback update → 403,
- fallback delete → 403,
- fallback reorder → 403.

Aktif teacher slide varsa kiosk yalnız teacher content gösterir. Aktif teacher slide kalmazsa sistem otomatik yedi fallback'e döner.

## 6. Backend mimarisi

Ana uygulama:

`backend/server.js`

Ayrı destek modülleri:

- `backend/database.js` — SQLite init/schema/fallback reconciliation,
- `backend/admin-auth-config.js` — admin credential config,
- `backend/admin-session-cookie.js` — session cookie,
- `backend/admin-session-store.js` — in-memory session store,
- `backend/request-rate-limiter.js` — login/write limitleri,
- `backend/date-utils.js` — Istanbul tarih anahtarı,
- `backend/schedule-schema.js` — schedule migration,
- `backend/schedule-service.js` — normalize/validation,
- `backend/schedule-repository.js` — read/transactional replace,
- `backend/static-cache-policy.js` — statik cache header politikası.

Frontend server-rendered değildir. Statik HTML/CSS/JS Express tarafından servis edilir, runtime verileri `/api/*` ile alınır.

## 7. Güncel runtime bağımlılıkları

Node:

- engine `>=22 <25`
- CI Node 22 ve Node 24.

Ana paketler:

- Express **4.22.2**
- sqlite3 **6.0.1**
- Multer **2.2.0**
- SheetJS **0.20.3**
- GSAP **3.15.0**
- canvas-confetti **1.9.4**

Native SQLite baseline testinde SQLite 3.52.0 doğrulanmıştır.

SheetJS admin tarafında yerel paket runtime'ından servis edilir.

Güncel dependency güvenlik turu sonrasında `npm audit --omit=dev` sonucu **0 vulnerability** olarak doğrulanmıştır. Güncel karar için yine de audit komutu yeniden çalıştırılmalıdır.

## 8. SQLite veri modeli

Ana tablolar:

### `students`

- id,
- name,
- photo,
- gender.

### `roles`

- student_id,
- role_type.

Student silinince role FK cascade uygulanır.

### `attendance`

- student_id,
- date,
- status,
- unique student/date.

### `schedule`

- day,
- period,
- course,
- period_type,
- start_time,
- end_time,
- is_active.

### `slides`

Teacher ve system fallback satırları aynı tabloda tutulur; ownership `is_fallback` ve `fallback_key` ile ayrılır.

Alanlar medya, duration, transition, order, active/expiry/priority/poster/fallback bilgilerini taşır.

### `slide_settings`

Slideshow genel varsayılanları.

Güncelleme tek atomik `PUT /api/slide-settings` transaction'ı üzerinden yapılır.

### `settings`

Küçük key/value runtime ayarları ve tarihsel/internal markerlar.

### `error_logs`

Uygulama log kayıtları.

## 9. Ders programı

Program iki kaynaklıdır:

1. normalize database schedule,
2. güvenli code fallback schedule.

`dashboard-schedule-loader.js` database programını yalnız validation contract doğruysa aktive eder.

Transport hatası ile semantik invalid response birbirinden ayrılır. Geçersiz/eksik program kiosk'u tamamen bozmak yerine fallback'e düşürür.

Admin ana menüsünde program editor bulunmaz.

`ScheduleManager` gün içi konumu saniye cinsinden hesaplar. Ders öncesi, ders ve teneffüs sayaçları `MM:SS`; bir saati aşan süreler `H:MM:SS` biçimindedir. Ders/teneffüs ilerleme yüzdesi de saniye hassasiyetindedir ve kesin sınır anında bir sonraki duruma geçer. Durum nesnesi ayrıca mevcut tür içindeki sıra numarasını (`currentPeriodNumber`) taşır.

## 10. Ses ölçer

`public/js/noise-meter.js`:

- `getUserMedia`,
- Web Audio analyser,
- otomatik sessiz taban kalibrasyonu,
- noise score smoothing,
- hysteresis,
- üç durumlu görsel state,
- accessible meter değerleri,
- 128 bantlı hassas/akışkan analyser equalizer,
- mikrofon yokken demo equalizer + demo seviye çubuğu,
- `devicechange` tabanlı otomatik mikrofon yeniden bağlanması

kullanır.

Gerçek fiziksel sınıf mikrofonu ile kabul testi donanım kalite kapısında ayrıca yapılmalıdır.

## 11. Face-focus ve öğrenci fotoğrafları

Fotoğraflar DB'de `/uploads/...` web yolu olarak tutulur.

Managed file cleanup yalnız güvenli tek dosya adına sahip upload yollarında çalışır; path traversal ve default avatar silme engellenir.

Face-focus:

- downsample,
- queue,
- duplicate pending-job collapse,
- cache,
- object-position

ile büyük ekran portre maliyetini sınırlar.

## 12. Upload mimarisi

Multer **2.2.0** kullanılır.

Gerçek multipart kabulünde doğrulanan akışlar:

- öğrenci fotoğraf create,
- öğrenci fotoğraf replacement + eski file cleanup,
- gerçek XLSX import + temp file cleanup,
- slayt image create,
- slayt media replacement + eski file cleanup,
- uygulama 5 MB fotoğraf limiti cleanup,
- Multer middleware limit/rejection sonrası orphan oluşmaması.

Bazı parser rejection/limit hatalarının global error handler üzerinden generic 500'e eşlenmesi tarihsel davranıştır; migration regresyonu değildir, fakat ayrı error UX iyileştirmesi olarak ele alınabilir.

## 13. Slideshow ve cache

Backend aktif slayt listesi server-side cache kullanır.

Teacher slide create/update/delete/reorder ve active değişikliği başarılı transaction/commit sonrasında cache invalid eder.

Frontend:

- yalnız gerekli medya hydrate edilir,
- first/next preloading kontrollüdür,
- transition lock vardır,
- changed slide data generation artırır,
- stale callback yeni slide setini overwrite edemez,
- unchanged periodic refresh rotasyonu gereksiz restart etmez,
- reduced-motion kısa fade kullanır.

## 14. Güvenlik modeli

### Credential

- username env ile override edilebilir,
- parola `CLASSROOM_ADMIN_PASSWORD`,
- parola yoksa fail-closed 503,
- commit edilmiş fallback parola/digest yok.

### Session

- server-side in-memory Map,
- cryptographic random ID,
- 8 saat TTL.

### Cookie

- HttpOnly,
- `SameSite=Strict`,
- `Path=/`,
- 8 saat Max-Age,
- Secure deployment ayarına göre.

### CSRF

Session ID'ye bağlı HMAC token kullanılır.

### Rate limit

- başarısız login limiti,
- authenticated admin write limiti.

### Error redaction

Çok sayıda DB/internal error yolu kullanıcıya ham internal ayrıntı yerine sabit güvenli mesaj döndürür.

## 15. Statik/runtime dosya modeli

Kiosk temel çalışma zamanı için önemli kütüphaneler lokaldir:

- GSAP,
- canvas-confetti,
- fontlar,
- Magic Park shell,
- 3D ikonlar,
- noise state görselleri.

Admin Excel tarafı SheetJS 0.20.3'ü yerel servis yolundan alır.

HTML/admin yüzeyleri no-store/no-cache politikasına, asset/upload yolları revalidation politikasına sahiptir.

## 16. Test sistemi

Ana kalite kapısı:

```bash
npm run test:core
```

Kapsam başlıkları:

- schedule,
- Istanbul date,
- auth/session/cookie/CSRF,
- rate limit,
- student/photo/import,
- role/atomic limits,
- attendance transaction,
- slide ID/CRUD/cache/transaction/reorder,
- system fallback reconciliation/ownership,
- error redaction,
- DOM/XSS güvenliği,
- Magic Park,
- titlebar resize,
- kiosk runtime/lifecycle,
- native sqlite3,
- Multer gerçek multipart,
- dependency baseline,
- system smoke.

İzole gerçek uygulama smoke:

```bash
npm run test:system-smoke
```

Temp DB + ephemeral port + random test admin secret kullanır.

Legacy doğrulama komutu:

```bash
npm run verify:code
```

artık gerçek `test:core` kapısına delegasyon yapar.

CI:

- GitHub Actions,
- Node 22,
- Node 24,
- clean `npm ci`,
- `npm run test:core`.

Güncel CI durumu yaşayan plandaki son commit kanıtlarından veya GitHub Actions'tan doğrulanmalıdır.

## 17. Browser/donanım kabul durumu

Browser otomasyonuyla doğrulananlar:

- 3840×2160,
- 2560×1440,
- 1920×1080,
- 1366×768,
- titlebar resize,
- reduced-motion,
- fullscreen enter/exit,
- backend restart sırasında kiosk'un mevcut render'ı koruması ve polling sonrası toparlanması,
- uzun isimlerin dar hedef çözünürlükte taşmaması.

**Gerçek 55" 4K TV fiziksel kabulü tamamlanmış sayılmaz.**

Açık donanım kontrolleri:

- overscan/HDMI scaling,
- gerçek izleme mesafesi,
- sınıf ışığı,
- fiziksel mikrofon,
- gerçek cihaz boot/kiosk,
- reboot/ağ kesintisi,
- uzun süreli gerçek medya karması.

## 18. Bakım araçları

`scripts/test_system.js` güncel mimariye uygun gerçek izole smoke'tur; kaldırılmış endpointlere veya sabit portta çalışan dış sunucuya bağımlı değildir.

`scripts/verify-code.js` güncel `test:core` wrapper'ıdır.

Seed/migration/fotoğraf bakım scriptleri ayrıca `scripts/` altında bulunur; çalıştırılmadan önce gerçek DB etkileri değerlendirilmelidir.

## 19. Doküman kaynak-of-truth zinciri

Çelişki durumunda:

1. **Git HEAD ve gerçek test/runtime davranışı** — teknik gerçek.
2. **`Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`** — yaşayan iş kuyruğu ve kanıtlar.
3. **`CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`** — derin tarih/mimari tarama.
4. **`AI_PROJECT_CONTEXT.md`** — kısa güncel AI devir bağlamı.
5. **Bu dosya** — güncel insan-okur ürün/teknik özeti.
6. Eski `Classroom Projesi/02 - Devir ve Oturum Notları/` ve DOCX belgeleri — tarihsel kayıt.

Eski belgelerdeki kaldırılmış bir modül veya “sıradaki görev” ifadesi, mevcut HEAD ve yaşayan planla doğrulanmadan güncel backlog kabul edilmemelidir.

## 20. Güncel geliştirme yaklaşımı

Classroom'da yeni özellik/düzeltme kabulü için tercih edilen disiplin:

1. kırmızı test veya gerçek yeniden üretim,
2. minimal düzeltme,
3. hedef test,
4. komşu regresyon,
5. tam core,
6. anlamlıysa gerçek HTTP/browser/native/DB/multipart kabul,
7. syntax/diff/audit,
8. ayrı commit/push,
9. GitHub Actions Node 22/24,
10. yaşayan `.md` plan güncellemesi.

Fiziksel donanım gerektiren kalite kapıları, repo içinde bağımsız yapılabilir bakım işlerinin ilerlemesini engellemez; fakat donanım görülmeden tamamlandı olarak işaretlenmez.
