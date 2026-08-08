# Classroom Projesi — P3-5 Büyük Refactor Yol Haritası — 8 Ağustos 2026

## 1. Belgenin amacı

Bu belge P3-5 kapsamındaki büyük yapısal refactor işlerinin **uygulama sırasını, güvenlik sınırlarını ve test kapılarını** tanımlar.

Bu belge bir “hemen bütün dosyaları parçala” talimatı değildir. P3-5'in amacı, mevcut stabil ürünü bozmadan ileride yapılacak büyük refactor işlerini küçük, bağımsız ve geri izlenebilir dalgalara ayırmaktır.

Değişen teknik gerçeklerde kaynak-of-truth sırası:

1. Git HEAD ve çalışan kod/test davranışı.
2. `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`.
3. Bu refactor yol haritası.

## 2. Bağlayıcı güvenlik ve ürün sınırları

- Mevcut `main` davranışı korunacaktır; büyük-bang yeniden yazım yapılmayacaktır.
- Backend `/api/settings` endpoint'i korunacaktır.
- SQLite `settings` tablosu korunacaktır.
- Kiosk fullscreen sorumluluğu `start.sh` içindeki `--kiosk --app=http://localhost:3000` davranışında kalacaktır.
- P2-6 gerçek 55" 4K TV fiziksel kabul testi ayrı açık kalite kapısıdır.
- P2-6 tamamlanmadan kiosk CSS'te agresif selector silme, büyük yeniden adlandırma veya layout yeniden yazımı yapılmayacaktır.
- Node.js destek aralığı `>=22 <25` olarak kalacaktır.
- Express/SQLite/Vanilla JavaScript mimarisi korunacaktır; React/Vue/framework rewrite yapılmayacaktır.
- Yeni runtime bağımlılığı yalnız zorunlu teknik gerekçeyle eklenebilir; refactor kendi başına yeni framework gerekçesi değildir.
- Mevcut uncommitted kullanıcı çalışmaları korunacaktır.

## 3. 8 Ağustos 2026 gerçek kod envanteri

Refactor planı aşağıdaki gerçek HEAD verilerine göre hazırlanmıştır:

| Alan | Dosya | Yaklaşık satır |
|---|---|---:|
| Backend ana uygulama | `backend/server.js` | 3064 |
| Admin ana JS | `public/admin/admin.js` | 1804 |
| Kiosk ana CSS | `public/css/style.css` | 4740 |
| Magic Park override | `public/css/kiosk-magic-park.css` | 1433 |
| Kiosk mode CSS | `public/css/kiosk-mode.css` | 19 |
| Admin CSS | `public/admin/style.css` | 389 |
| Admin error log modülü | `public/admin/error-logs.js` | 320 |

Admin HTML'de yaklaşık 195 statik inline `style` attribute, admin JS template'lerinde yaklaşık 103 inline style fragment vardır.

`backend/server.js` halihazırda bazı sorumlulukları ayrı modüllere devretmektedir:

- `admin-auth-config.js`
- `admin-session-cookie.js`
- `admin-session-store.js`
- `date-utils.js`
- `request-rate-limiter.js`
- `schedule-repository.js`
- `schedule-schema.js`
- `schedule-service.js`
- `static-cache-policy.js`
- `utils.js`

Bu mevcut desen refactor için referans alınacaktır. Yeni soyutlama katmanları mevcut kodun ihtiyacı kanıtlanmadan oluşturulmayacaktır.

## 4. Değerlendirilen yaklaşımlar

### Yaklaşım A — Büyük-bang dosya parçalama

`server.js`, `admin.js` ve CSS'i tek büyük PR/commit serisinde yeniden düzenlemek.

**Avantaj:** kısa sürede daha küçük dosya görünümü.

**Risk:** route sırası, middleware sırası, inline handler global'leri, slayt cache davranışı ve kiosk CSS override sırası aynı anda değişebilir. Hata çıktığında kök neden ayrıştırması zorlaşır.

**Karar:** reddedildi.

### Yaklaşım B — Davranış korumalı, domain-by-domain extraction

Her dalga tek bir domaini taşır. Önce regression contract yazılır, sonra kod fiziksel olarak başka dosyaya taşınır; endpoint path, middleware sırası, response shape ve frontend global API aynı kalır.

**Avantaj:** her commit ayrı test edilebilir, geri izlenebilir ve küçük blast radius taşır.

**Risk:** geçiş döneminde bazı geçici adaptör/global export'lar kalır.

**Karar:** **önerilen ve seçilen yaklaşım**.

### Yaklaşım C — Framework/modern build sistemiyle yeniden yazım

Admin'i React/Vue/Vite benzeri bir yapıya geçirmek ve backend'i aynı anda yeni router/service mimarisine taşımak.

**Avantaj:** teorik olarak daha modern proje düzeni.

**Risk:** ürün davranışını koruma hedefiyle orantısız değişiklik, yeni bağımlılıklar, kiosk/admin deployment riskleri ve gereksiz migration maliyeti.

**Karar:** reddedildi.

## 5. Hedef mimari ilkeleri

### 5.1 Backend

İlk hedef `server.js` dosyasını tamamen “ince controller” yapmak değildir. İlk hedef route kayıtlarını domain bazında fiziksel olarak ayırmaktır.

Önerilen ilk sözleşme:

```js
function registerStudentsRoutes(app, deps) {
    // mevcut /api/students route'ları aynı sırayla burada kayıt edilir
}

module.exports = { registerStudentsRoutes };
```

Bu `registerXRoutes(app, deps)` modeli ilk aşamada `express.Router()` dönüşümüne tercih edilir. Nedeni:

- mevcut absolute endpoint path'leri aynı kalır,
- middleware kayıt sırası daha kolay korunur,
- `app.use('/admin', requireAdminSession)` ve statik dosya sırası değişmez,
- mevcut testlerin source-contract beklentileri daha kontrollü güncellenir,
- taşıma ile davranış değişikliği birbirinden ayrılır.

`express.Router()` ancak domain route'ları stabil biçimde ayrıldıktan sonra ve gerçek fayda sağlıyorsa ikinci aşama olarak değerlendirilebilir.

### 5.2 Admin JavaScript

Admin tarafında doğrudan ES module dönüşümü ilk adım olmayacaktır. Mevcut HTML çok sayıda inline handler kullanır:

- `showTab(...)`
- `assignRole(...)`
- `saveAttendance()`
- `showSlideForm()`
- `clearOldLogs()`
- benzeri global fonksiyonlar.

Bu nedenle domain modülleri önce klasik script olarak ayrılacak ve mevcut global sözleşme geçici adaptörlerle korunacaktır.

Önerilen namespace:

```js
window.ClassroomAdmin = window.ClassroomAdmin || {};
window.ClassroomAdmin.students = { /* ... */ };
```

Geçiş sırasında:

```js
window.filterStudents = window.ClassroomAdmin.students.filterStudents;
```

gibi adaptörler mevcut inline HTML'i kırmadan modülerleşmeye izin verir.

Inline handler'ların HTML'den tamamen kaldırılması ayrı ve daha sonraki bir davranış değişimi/refactor dalgasıdır; domain extraction ile aynı committe yapılmamalıdır.

### 5.3 CSS

Admin CSS ve kiosk CSS aynı risk sınıfında değildir.

- Admin statik inline stilleri kontrollü biçimde class'lara taşınabilir.
- Dinamik değerler (`width`, `display`, runtime progress vb.) ilk turda JS'te kalabilir.
- Kiosk CSS temizliği P2-6 fiziksel 4K kabulünden önce yapılmayacaktır.

## 6. Refactor dalgaları

Bu bölümdeki A1 → A8 sırası **uygulama/commit sırasıdır**. Mevcut Express route registration sırasını yeniden düzenleme talimatı değildir. Bir domain başka dosyaya taşınırken route'lar `server.js` içindeki mevcut göreli kayıt noktasında çağrılmalı; özellikle statik middleware, `/admin` auth middleware, schedule storage guard ve `/api/slides/active` / `/:id` sırası korunmalıdır.

### P3-5A — Backend route modülerleştirme

**Durum:** 🟨 Uygulanıyor — A1 tamamlandı ve doğrulandı; sıradaki dalga A2 schedule extraction.

#### A0 — Contract baseline

Her domain taşınmadan önce o domainin route path, middleware ve response davranışını kilitleyen test bulunmalıdır.

Zorunlu genel kapılar:

```bash
npm run test:core
npm run test:system-smoke
npm audit --omit=dev
git diff --check
```

#### A1 — Küçük ve düşük riskli route grupları

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

İlk extraction adayı:

- settings
- network-info
- stats

Önerilen dosyalar:

```text
backend/routes/settings-routes.js
backend/routes/system-routes.js
```

`/api/settings` davranışı ve SQLite `settings` tablosu kesinlikle kaldırılmayacaktır.

##### A1 uygulama sonucu

İlk gerçek backend extraction dalgası planlandığı sınırlar içinde uygulandı:

- `backend/routes/settings-routes.js` oluşturuldu.
- `backend/routes/system-routes.js` oluşturuldu.
- `GET /api/settings` ve korumalı `POST /api/settings` settings route modülüne taşındı.
- `GET /api/network-info` ve `GET /api/stats` system route modülüne taşındı.
- `server.js` yeni modülleri `registerSettingsRoutes(app, deps)` ve `registerSystemRoutes(app, deps)` ile eski göreli kayıt noktalarında çağırmaya devam ediyor.
- `POST /api/settings` middleware zinciri `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit` olarak aynen korundu.
- SQLite `settings` tablosu ve backend settings uyumluluk sözleşmesi korunuyor.
- `/api/stats` içindeki `Europe/Istanbul` gün anahtarı `getIstanbulDateKey()` bağımlılığı üzerinden korunuyor.
- `networkInterfaces` ve `PORT` system route modülüne explicit dependency olarak aktarılıyor; yeni global/shared state eklenmedi.
- `backend/server.js` 3064 satırdan 2944 satıra indi.

TDD ve regresyon kanıtı:

1. Yeni `tests/backend-route-extraction.test.js` önce route modülleri bulunmadığı için RED verdi.
2. Modüller oluşturulduktan sonra extraction testi GREEN oldu.
3. Eski source-contract testlerinden `backend-date-utils.test.js`, `cors-policy.test.js` ve `legacy-settings-cleanup.test.js` yalnız dosya yerleşimine bağlı literal `server.js` varsayımları nedeniyle kırıldı; runtime sözleşmeleri gevşetilmeden yeni modül konumlarını izleyecek şekilde güncellendi.
4. Settings read/write, stats error redaction, admin auth, CORS ve rate-limit odak grubu 94/94 geçti.
5. Tam `npm run test:core`: **1385/1385 pass**.
6. `npm run test:system-smoke`: **SYSTEM_SMOKE_PASS**; temp settings write/readback PASS.
7. `npm audit --omit=dev`: **0 vulnerability**.
8. `node --check` üç backend dosyasında ve `git diff --check` temiz.

Tarayıcı kanıtı, izole temp DB + ayrı port üzerinde:

- Playwright: `/api/settings` 200, `/api/stats` 200, `/api/network-info` 200.
- Chrome DevTools: aynı üç endpoint 200; console `error/warn/issue` **0**.
- Kiosk yüklenmeye devam etti ve başlık `2/D Sihirli Pano` olarak kaldı.

Kod/test milestone:

- Commit: `8c2bf70f8b1f8dd0e1dc2ac87ee931c23b34e791`
- GitHub Actions: `31280357663`
- Node 22: PASS (29 sn)
- Node 24: PASS (35 sn)

Bilinen fresh-DB `error_logs` cleanup-order log gürültüsü bu refactor sırasında değiştirilmedi; A6 notunda belirtildiği gibi ayrı bugfix olarak kalıyor.

**Sıradaki backend dalgası: A2 — Schedule.** `schedule-service.js`, `schedule-repository.js`, `schedule-schema.js` ve `requireScheduleStorageReady` davranışı korunarak ayrıca ele alınacaktır.

#### A2 — Schedule

Önerilen dosya:

```text
backend/routes/schedule-routes.js
```

Mevcut `schedule-service.js`, `schedule-repository.js` ve `schedule-schema.js` aynen kullanılmalıdır. `requireScheduleStorageReady` middleware sırası korunmalıdır.

#### A3 — Students

Önerilen dosya:

```text
backend/routes/student-routes.js
```

Taşınacak alanlar:

- listeleme
- create
- Excel import
- delete
- photo update

Managed photo cleanup ve upload path güvenliği davranışı değiştirilmemelidir.

#### A4 — Roles

Önerilen dosya:

```text
backend/routes/role-routes.js
```

President replacement transaction ile VP/duty bounded SQL davranışı aynı kalmalıdır.

#### A5 — Attendance

Önerilen dosya:

```text
backend/routes/attendance-routes.js
```

`Europe/Istanbul` date key ve bulk attendance transaction sözleşmeleri korunmalıdır.

#### A6 — Logs

Önerilen dosya:

```text
backend/routes/log-routes.js
```

Error redaction ve cleanup validation testleri taşımadan önce ve sonra aynı sonucu vermelidir.

Startup `error_logs` cleanup-order log problemi bu extraction ile gizlice çözülmemelidir; ayrı bugfix olarak ele alınmalıdır. Böylece refactor ile davranış düzeltmesi aynı committe karışmaz.

#### A7 — Slides — en son

Önerilen başlangıç dosyaları:

```text
backend/routes/slide-routes.js
backend/slide-media-paths.js
```

Slides en yüksek riskli domain olduğu için backend extraction'ın sonunda yapılmalıdır.

Korunacak kritik sözleşmeler:

- active/admin list ayrımı,
- system-owned fallback koruması,
- fallback reconciliation,
- cache invalidation sırası,
- reorder transaction,
- update/delete media cleanup,
- canonical slide media path,
- raw database error redaction,
- `/api/slides/active` route'unun `/:id` route'undan önce kayıt edilmesi.

#### A8 — Admin auth/session — ayrıca ve en son değerlendir

Auth/session kodu güvenlik sınırı olduğu için sırf dosya küçülsün diye erken taşınmayacaktır.

Ancak tüm domain extraction tamamlandıktan sonra aşağıdaki mevcut modüllerle birlikte ayrı bir auth route registration modülü değerlendirilebilir:

- `admin-auth-config.js`
- `admin-session-cookie.js`
- `admin-session-store.js`
- `request-rate-limiter.js`

Auth refactor ayrı security regression turu gerektirir.

## 7. P3-5B — Admin JavaScript modülerleştirme

**Durum:** Planlandı, henüz uygulanmadı.

Mevcut `error-logs.js` dosyası admin tarafında domain ayrımının çalışan örneğidir.

Önerilen hedef yapı:

```text
public/admin/admin.js
public/admin/js/students.js
public/admin/js/roles.js
public/admin/js/attendance.js
public/admin/js/slides.js
public/admin/error-logs.js
```

`admin.js` geçiş sonunda shell sorumluluklarına yaklaşmalıdır:

- tab navigation,
- ortak bootstrap,
- ortak notification wiring,
- QR/modal gibi gerçekten ortak küçük yüzeyler,
- domain modüllerini başlatma.

### B1 — Students

İlk adaydır; students fonksiyon grubu dosyanın başında görece bağımsızdır.

Korunacaklar:

- DOM safety,
- Excel import,
- photo upload,
- student stats,
- search/filter,
- mevcut notification davranışı.

### B2 — Roles

`assignRole`, `removeRole`, `renderRoles` ve select population aynı domain modülüne taşınır.

### B3 — Attendance

`setTodayDate`, `loadAttendanceForDate`, `renderAttendanceList`, `updateAttendanceSummary`, `saveAttendance` aynı modülde tutulur.

Istanbul tarih davranışı regression testle korunur.

### B4 — Slides — en son

Slides yaklaşık dosyanın yarısını oluşturan en yoğun admin alanıdır. Drag/drop, form state, media preview, active toggle ve slide settings aynı anda taşınmamalıdır.

Önerilen alt sıra:

1. read/render,
2. active toggle,
3. drag/reorder,
4. form open/close/edit,
5. media preview,
6. create/update/delete,
7. slide settings.

Her alt adım mevcut global fonksiyon adını geçici adaptörle korur.

## 8. P3-5C — Admin inline CSS temizliği

**Durum:** Planlandı, backend/admin JS modülerleşmesinden sonra uygulanmalı.

Amaç görsel redesign değildir. Amaç mevcut görünümü class tabanlı hale getirmektir.

Sıra:

1. `public/admin/index.html` içindeki statik inline stilleri domain bazında CSS class'larına taşı.
2. `public/admin/admin.js` template string içindeki statik inline stilleri class'lara taşı.
3. Runtime'a bağlı `display`, progress width, media preview state gibi dinamik stilleri ilk turda koru.
4. Daha sonra yalnız test varsa state class modeline geçir.

Her görsel dalgada en az:

- 1366×768 admin smoke,
- 1920×1080 admin smoke,
- console warning/error kontrolü,
- horizontal overflow kontrolü,
- öğrenciler/görevler/yoklama/slaytlar tab smoke,
- create/edit/delete feedback smoke

çalıştırılmalıdır.

## 9. P3-5D — Kiosk CSS küçültme ve dead-style temizliği

**Durum:** **P2-6 fiziksel 55" 4K kabulüne bağlı; şu anda uygulanmayacak.**

P2-6 yeşil olmadan yapılabilecek tek çalışma:

- selector envanteri,
- duplicate declaration raporu,
- hiç eşleşmeyen selector aday listesi,
- CSS source-order/override haritası,
- screenshot baseline hazırlığı.

P2-6 sonrası gerçek temizlik sırası:

1. fiziksel kabul edilen görüntünün baseline ekran görüntülerini kaydet,
2. bir selector grubu için gerçekten kullanılmadığını kanıtla,
3. küçük bir CSS cleanup commit'i yap,
4. 3840×2160 browser smoke,
5. 2560×1440 browser smoke,
6. 1920×1080 browser smoke,
7. 1366×768 browser smoke,
8. live resize,
9. reduced-motion,
10. fiziksel 55" 4K tekrar kabul.

Kiosk CSS'te `style.css` ile `kiosk-magic-park.css` tek committe birleştirilmeyecektir.

## 10. Her extraction commitinin kabul kriterleri

Bir domain refactor commit'i ancak aşağıdakilerle kapanır:

1. Davranışı kilitleyen hedef regression testleri yeşil.
2. `npm run test:core` yeşil.
3. İlgiliyse temp DB HTTP/system smoke yeşil.
4. İlgiliyse Playwright browser smoke yeşil.
5. Console warning/error yeni regresyon üretmiyor.
6. `git diff --check` temiz.
7. Değişen JS dosyaları `node --check` ile temiz.
8. Dependency değiştiyse `npm audit --omit=dev` çalıştırılmış.
9. Commit/push sonrası GitHub Actions Node 22 ve Node 24 yeşil.
10. Yaşayan plan kanıtlarla güncellenmiş.

## 11. Commit stratejisi

Tek “refactor everything” commit'i yasaktır.

Örnek sınırlar:

```text
refactor: extract settings and system routes
refactor: extract schedule routes
refactor: extract student routes
refactor: extract role routes
refactor: extract attendance routes
refactor: extract log routes
refactor: isolate slide media path helpers
refactor: extract slide routes
refactor: split admin student module
refactor: split admin role module
refactor: split admin attendance module
refactor: split admin slide module
refactor: move admin static inline styles to classes
```

Kiosk CSS cleanup commitleri P2-6'dan sonra ayrıca ve çok küçük tutulmalıdır.

## 12. Başlangıç sırası — kesin karar

P3-5 uygulamasına ileride başlanacaksa ilk gerçek kod refactor işi:

> **Settings + system route registration extraction**

olacaktır.

Neden:

- küçük route yüzeyi,
- mevcut testleri güçlü,
- upload/transaction/cache karmaşıklığı yok,
- `/api/settings` sözleşmesini koruyarak registration pattern'ini doğrulamak için uygun,
- sonraki domain extraction'ları için düşük riskli şablon oluşturur.

İkinci adım schedule, üçüncü adım students olacaktır. Slides en sona bırakılacaktır.

## 13. P3-5 planlama sonucu

P3-5'in bu turdaki teslimatı **refactor'ın kendisi değil, güvenli ve testlenebilir refactor yol haritasıdır**.

Bu belgeyle:

- backend büyük dosya refactor sırası,
- admin JS modülerleşme sırası,
- admin CSS temizleme sınırı,
- kiosk CSS için P2-6 fiziksel kapısı,
- her dalganın test ve commit disiplini

belirlenmiştir.

Bu nedenle yaşayan durum tablosundaki “Büyük server/admin/CSS refactor planı” işi tamamlanabilir; gerçek refactor dalgaları gelecekte ayrı işler olarak açılmalıdır.
