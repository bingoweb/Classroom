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

**Durum:** 🟩 Backend domain extraction A1–A7 tamamlandı ve doğrulandı. A8 admin auth/session ayrı güvenlik refactor değerlendirmesi olarak bekliyor; sıradaki aktif refactor fazı P3-5B admin JavaScript modülerleştirmedir.

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

**A1 sonrası sıradaki backend dalgası A2 — Schedule idi.** Bu dalga aşağıdaki A2 kanıtlarıyla tamamlandı.

#### A2 — Schedule

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

Önerilen dosya:

```text
backend/routes/schedule-routes.js
```

Mevcut `schedule-service.js`, `schedule-repository.js` ve `schedule-schema.js` aynen kullanılmalıdır. `requireScheduleStorageReady` middleware sırası korunmalıdır.

##### A2 uygulama sonucu

Schedule route yüzeyi planlanan `registerXRoutes(app, deps)` kalıbıyla ayrıldı:

- `backend/routes/schedule-routes.js` oluşturuldu.
- `requireScheduleStorageReady` guard'ı route modülüne taşındı ve `app.use('/api/schedule', requireScheduleStorageReady)` kayıt sırası korunuyor.
- `GET /api/schedule/normalized` ve korumalı `PUT /api/schedule/normalized` yeni modüle taşındı.
- legacy `GET /api/schedule` ve korumalı `POST /api/schedule` yeni modüle taşındı.
- `server.js`, `registerScheduleRoutes(app, deps)` çağrısını settings ile system route kayıtlarının arasındaki eski göreli konumda yapıyor.
- `schedule-service.js`, `schedule-repository.js` ve `schedule-schema.js` yeniden yazılmadı.
- normalized write için isolated SQLite connection + `replaceNormalizedSchedule(...)` + close sırası korunuyor.
- legacy schedule SQL, response metinleri ve auth → CSRF → write-rate-limit middleware zinciri değiştirilmedi.
- `backend/server.js` 2944 satırdan 2725 satıra indi; yeni `backend/routes/schedule-routes.js` 251 satır.

TDD ve regresyon kanıtı:

1. `tests/backend-route-extraction.test.js` içine A2 sözleşmesi önce eklendi ve `backend/routes/schedule-routes.js must exist` nedeniyle RED verdi.
2. Route ve readiness guard extraction sonrası aynı test GREEN oldu; A1 + A2 extraction testi 2/2 geçti.
3. Schedule odak grubu (`backend-schedule`, legacy write, schedule read redaction, admin route auth) **127/127 pass** verdi.
4. Tam `npm run test:core`: **1386/1386 pass**.
5. `npm run test:system-smoke`: **SYSTEM_SMOKE_PASS**.
6. `npm audit --omit=dev`: **0 vulnerability**.
7. `node --check backend/server.js`, `node --check backend/routes/schedule-routes.js` ve `git diff --check` temiz.

Tarayıcı kanıtı, izole temp DB + ayrı port üzerinde:

- Playwright kiosk yükünde `GET /api/schedule/normalized?day=weekday` **200**.
- Chrome DevTools gerçek admin session akışında `x-csrf-token` uzunluğu 64 olarak doğrulandı.
- Aynı browser session'da normalized `PUT` **200**, ardından normalized `GET` **200** ve legacy `GET /api/schedule` **200** döndü.
- Temiz kiosk reload sonrası Chrome console `error/warn/issue` **0**; schedule network çağrıları 200/304 dışında hata üretmedi.

Kod/test milestone:

- Commit: `17838a510758309d4a50b30c846b4dbe7990a9df`
- GitHub Actions: `31280821858`
- Node 24: PASS (24 sn)
- Node 22: PASS (30 sn)

Bilinen fresh-DB `error_logs` cleanup-order log gürültüsü bu refactor sırasında yine değiştirilmedi.

**A2 sonrası sıradaki backend dalgası A3 — Students idi.** Bu dalga aşağıdaki A3 kanıtlarıyla tamamlandı.

#### A3 — Students

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

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

##### A3 uygulama sonucu

Student route yüzeyi mevcut HTTP ve dosya yaşam döngüsü davranışları korunarak tek domain kayıt modülüne ayrıldı:

- `backend/routes/student-routes.js` oluşturuldu.
- `GET /api/students` yeni modüle taşındı.
- korumalı `POST /api/students` + `upload.single('photo')` yeni modüle taşındı.
- korumalı `POST /api/students/import` + `upload.single('excel')` yeni modüle taşındı.
- korumalı `DELETE /api/students/:id` yeni modüle taşındı.
- korumalı `PUT /api/students/:id/photo` + `upload.single('photo')` yeni modüle taşındı.
- `validateStudentInput`, `safeDeleteFile` ve `cleanupManagedPhoto` student domaini içinde tutuldu; helper davranışları yeniden tasarlanmadı.
- `server.js`, `registerStudentRoutes(app, deps)` çağrısını eski student route bloğunun göreli konumunda, roles route'larından önce yapmaya devam ediyor.
- `upload` ve `uploadsDir` explicit dependency olarak aktarılıyor; slide upload storage/runtime akışı değiştirilmedi.
- `backend/server.js` 2725 satırdan 2210 satıra indi; yeni `backend/routes/student-routes.js` 496 satır.

Korunan kritik sözleşmeler:

- student write middleware sırası `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit → Multer`,
- öğrenci create/photo update için JPEG/JPG/PNG/GIF/WEBP MIME listesi,
- tam 5 MB kabul / 5 MB üstü ret sınırı,
- kaydedilen fotoğraf yolunun yalnız `/uploads/<safe-filename>` biçiminde olması,
- default boy/girl görsellerinin ve uploads dışı/nested/traversal yolların silinmemesi,
- eski managed fotoğrafın yalnız başarılı DB update/delete sonrasında temizlenmesi,
- Excel temp dosya cleanup davranışı,
- E-okul başlık/cinsiyet parsing ve öğrenci sıralama davranışı,
- Excel/database hata ayrıntılarının HTTP response'a sızmaması,
- strict positive safe-integer student ID doğrulaması.

TDD ve regresyon kanıtı:

1. `tests/backend-route-extraction.test.js` içine A3 sözleşmesi önce eklendi ve `backend/routes/student-routes.js must exist` nedeniyle RED verdi.
2. Student extraction sonrası A1 + A2 + A3 extraction testi **3/3 pass** verdi.
3. Student create/body/photo/import/read/delete + admin auth/rate-limit odak grubu **141/141 pass** verdi.
4. Eski `cors-policy.test.js` yalnız `server.js` içinde literal student route aradığı için RED verdi; CORS davranışı gevşetilmeden test yeni registration modülünü izleyecek şekilde güncellendi ve **6/6 pass** verdi.
5. Tam `npm run test:core`: **1387/1387 pass**.
6. `npm run test:system-smoke`: **SYSTEM_SMOKE_PASS**.
7. `npm audit --omit=dev`: **0 vulnerability**.
8. `node --check backend/server.js`, `node --check backend/routes/student-routes.js` ve `git diff --check` temiz.

Tarayıcı kanıtı, izole temp DB + ayrı port üzerinde:

- Playwright: `GET /api/students` **200** ve fresh DB için `[]`.
- Chrome DevTools: admin login **200**, session authenticated, CSRF uzunluğu **64**.
- Aynı browser session'da student create **200**, public listede yeni öğrenci görüldü, student delete **200**, final liste yeniden `[]` oldu.
- Temiz kiosk reload sonrası Chrome console `error/warn/issue` **0**; normal kiosk fetch/XHR trafiği 200/304 kaldı.

Kod/test milestone:

- Commit: `894e9504d4436abc871877c9bc845e8cc15981a5`
- GitHub Actions: `31281322228`
- Node 24: PASS (yaklaşık 27 sn)
- Node 22: PASS (yaklaşık 31 sn)

Bilinen fresh-DB `error_logs` cleanup-order log gürültüsü bu refactor sırasında yine değiştirilmedi.

**A3 sonrası sıradaki backend dalgası A4 — Roles idi.** Bu dalga aşağıdaki A4 kanıtlarıyla tamamlandı.

#### A4 — Roles

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

Önerilen dosya:

```text
backend/routes/role-routes.js
```

President replacement transaction ile VP/duty bounded SQL davranışı aynı kalmalıdır.

##### A4 uygulama sonucu

Role route yüzeyi mevcut transaction, bounded-insert ve response sözleşmeleri korunarak tek domain kayıt modülüne ayrıldı:

- `backend/routes/role-routes.js` oluşturuldu.
- `GET /api/roles`, korumalı `POST /api/roles` ve korumalı `DELETE /api/roles/:id` yeni modüle taşındı.
- `server.js`, `registerRoleRoutes(app, deps)` çağrısını eski göreli konumda student route'larından sonra ve settings route'larından önce yapmaya devam ediyor.
- `db`, `logger`, `COMPONENTS`, admin session, CSRF ve write-rate-limit middleware'leri explicit dependency olarak aktarılıyor.
- President replacement için mevcut isolated SQLite connection + `BEGIN IMMEDIATE → DELETE → INSERT → COMMIT` akışı yeniden tasarlanmadı.
- Vice-president ve duty rollerinin tek-statement bounded `INSERT ... SELECT` SQL'i ile zero-change classification akışı aynı kaldı.
- Star rolündeki duplicate-prevention insert ve role delete ID doğrulaması aynı kaldı.
- `backend/server.js` 2210 satırdan 1853 satıra indi; yeni `backend/routes/role-routes.js` 380 satır.

Korunan kritik sözleşmeler:

- role write middleware sırası `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit`,
- president değişiminde eski başkanın silinmesi ile yeni başkanın eklenmesinin aynı transaction içinde olması,
- president insert/commit/delete hata yollarında rollback + redacted HTTP response,
- VP için en fazla 2, duty için en fazla 4 kişi sınırı,
- bounded insert içinde student-exists + duplicate-not-exists + count-limit kontrollerinin atomik SQL içinde kalması,
- zero-change classification sırası: limit → duplicate → student existence → unknown-state redaction,
- star duplicate mesajı ve foreign-key hata sınıflandırması,
- strict positive safe-integer role/student ID davranışı,
- raw SQLite/error ayrıntılarının HTTP response'a sızmaması.

TDD ve regresyon kanıtı:

1. `tests/backend-route-extraction.test.js` içine A4 sözleşmesi önce eklendi ve `backend/routes/role-routes.js must exist` nedeniyle RED verdi.
2. Extraction sonrası A1 + A2 + A3 + A4 testi **4/4 pass** verdi.
3. Role create/delete/atomicity/read + president + star + bounded count/create/duplicate/student/unknown redaction odak paketi **238/238 pass** verdi.
4. İki eski source-contract testi yalnız `backend/server.js` konumuna bağlıydı; güvenlik beklentileri gevşetilmeden `backend/routes/role-routes.js` üretim kaynağını izleyecek şekilde güncellendi.
5. Daha önce var olup `test:core` listesine dahil olmayan `role-bounded-duplicate-error-redaction.test.js` core kapısına eklendi.
6. Tam `npm run test:core`: **1404/1404 pass**.
7. `npm run test:system-smoke`: **SYSTEM_SMOKE_PASS**.
8. `npm audit --omit=dev`: **0 vulnerability**.
9. `node --check backend/server.js`, `node --check backend/routes/role-routes.js`, package JSON parse ve `git diff --check` temiz.

Browser/HTTP kanıtı, izole temp DB + ayrı port üzerinde:

- Playwright: public `GET /api/roles` **200** ve fresh DB için `[]`.
- Chrome DevTools temiz kiosk reload: console `error/warn/issue` **0**; `/api/roles` dahil normal kiosk fetch/XHR çağrıları 200/304.
- Credential içeren DevTools `evaluate` çağrısı araç güvenlik katmanı tarafından engellendiği için admin mutation smoke aynı izole sunucuya cookie + CSRF kullanan doğrudan HTTP istemcisiyle tamamlandı.
- Admin login **200**, session authenticated ve CSRF uzunluğu **64**.
- Dört temp öğrenci create işlemi **200**.
- President atama 1 → **200**, president replacement → **200**; replacement sonrasında tam **1** president kaldı ve yeni öğrenciye ait olduğu doğrulandı.
- VP atamaları **200, 200, 400**; üçüncü atama `En fazla 2 başkan yardımcısı olabilir` sözleşmesini döndürdü.
- Star atama **200**, aynı öğrenciye duplicate star **400** ve `Bu öğrenci zaten haftanın yıldızı`.
- Dört oluşmuş rolün delete işlemleri **200**; final role listesi `[]`; dört temp öğrenci de **200** ile temizlendi.

Kod/test milestone:

- Commit: `ec16dcc9e2c0990d6215a674c4b7b3f49a2445a0`
- GitHub Actions: `31281933728`
- Node 24: PASS (27 sn)
- Node 22: PASS (31 sn)

Bilinen fresh-DB `error_logs` cleanup-order log gürültüsü bu refactor sırasında yine değiştirilmedi.

**Sıradaki backend dalgası: A5 — Attendance.** `Europe/Istanbul` gün anahtarı ve bulk attendance transaction davranışı mevcut test sözleşmeleriyle korunarak ayrıca ele alınacaktır.

#### A5 — Attendance

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

Önerilen dosya:

```text
backend/routes/attendance-routes.js
```

`Europe/Istanbul` date key ve bulk attendance transaction sözleşmeleri korunmalıdır.

##### A5 uygulama sonucu

Attendance route yüzeyi mevcut tarih, validation ve transaction davranışları korunarak tek domain kayıt modülüne ayrıldı:

- `backend/routes/attendance-routes.js` oluşturuldu.
- `GET /api/attendance/today` yeni modüle taşındı.
- `GET /api/attendance/:date` yeni modüle taşındı.
- korumalı bulk `POST /api/attendance` yeni modüle taşındı.
- korumalı single-record `PUT /api/attendance/:id` yeni modüle taşındı.
- `server.js`, `registerAttendanceRoutes(app, deps)` çağrısını system route'larından sonra ve slides route'larından önce, eski attendance bloğunun göreli kayıt noktasında yapıyor.
- `getIstanbulDateKey`, DB, logger ve admin write middleware'leri explicit dependency olarak aktarılıyor.
- `backend/server.js` 1853 satırdan 1617 satıra indi; yeni `backend/routes/attendance-routes.js` 262 satır.

Korunan kritik sözleşmeler:

- `/api/attendance/today` için `Europe/Istanbul` gün anahtarı,
- bulk write middleware sırası `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit`,
- isolated connection + `BEGIN IMMEDIATE → DELETE → INSERT... → COMMIT` replacement transaction akışı,
- begin/delete/insert/commit failure rollback ve connection-close yolları,
- boş listeyle günün attendance kayıtlarını atomik biçimde temizleme,
- strict `YYYY-MM-DD`, gerçek ay/gün ve leap-year validation,
- strict positive safe-integer student/attendance ID doğrulaması,
- yalnız `present` / `absent` status değerleri,
- duplicate normalized student ID reddi,
- read/update database error ayrıntılarının HTTP response'a sızmaması.

TDD ve regresyon kanıtı:

1. `tests/backend-route-extraction.test.js` içine A5 sözleşmesi önce eklendi ve `backend/routes/attendance-routes.js must exist` nedeniyle RED verdi.
2. Extraction sonrası A1–A5 structural testleri **5/5 pass** verdi.
3. Attendance bulk/read/update + Istanbul date + admin auth/rate-limit + CORS odak grubu **193/193 pass** verdi.
4. Bulk suite içindeki gerçek SQLite rollback, successful replacement, empty-list replacement ve shared-connection isolation kanıtları yeni modül üzerinden geçti.
5. `backend-date-utils.test.js` yalnız fiziksel dosya konumuna bağlı eski `server.js` varsayımından yeni gerçek attendance modülünü izleyecek şekilde güncellendi; tarih davranışı gevşetilmedi.
6. Tam `npm run test:core`: **1405/1405 pass**.
7. `npm run test:system-smoke`: **SYSTEM_SMOKE_PASS**.
8. `npm audit --omit=dev`: **0 vulnerability**.
9. `node --check` iki backend dosyasında ve `git diff --check` temiz.

Tarayıcı ve gerçek HTTP kanıtı, izole temp DB + ayrı port üzerinde:

- Playwright: public `GET /api/attendance/today` **200** ve fresh DB için `[]`.
- Admin login **200**, authenticated session **200**, CSRF token uzunluğu **64**.
- İki temp öğrenci create **200/200**.
- İlk bulk attendance **200**; date GET ve today GET **200**, iki kayıt görüldü.
- Single attendance update **200** ve güncellenen status `absent` olarak geri okundu.
- İkinci bulk write **200** ve aynı gün için önceki iki kayıt tek yeni kayıtla atomik olarak değiştirildi.
- Empty-list cleanup **200**; temp öğrenciler **200/200** ile temizlendi.
- Chrome DevTools temiz kiosk reload: console error/warn/issue **0**; normal kiosk XHR/fetch trafiği 200/304.

Kod/test milestone:

- Commit: `84ad2ee1986d55a05182c542365b216e2bb469d8`
- GitHub Actions: `31282429187`
- İlk koşuda Node 22 PASS olurken Node 24 runner `test:core` adımında transient biçimde takıldı; run kontrollü olarak iptal edilip aynı exact SHA üzerinde rerun edildi.
- Exact-SHA rerun: Node 22 PASS (25 sn), Node 24 PASS (24 sn).

Bilinen fresh-DB `error_logs` cleanup-order log gürültüsü bu refactor sırasında yine değiştirilmedi.

**Sıradaki backend dalgası: A6 — Logs.** Error redaction ve cleanup validation davranışları korunacak; startup `error_logs` cleanup-order problemi extraction ile karıştırılmayacaktır.

#### A6 — Logs

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

Önerilen dosya:

```text
backend/routes/log-routes.js
```

Error redaction ve cleanup validation testleri taşımadan önce ve sonra aynı sonucu vermelidir.

Startup `error_logs` cleanup-order log problemi bu extraction ile gizlice çözülmemelidir; ayrı bugfix olarak ele alınmalıdır. Böylece refactor ile davranış düzeltmesi aynı committe karışmaz.

##### A6 uygulama sonucu

Log route yüzeyi mevcut güvenlik, validation, JSON parse ve redaction davranışları korunarak tek domain kayıt modülüne ayrıldı:

- `backend/routes/log-routes.js` oluşturuldu.
- korumalı `POST /api/logs` yeni modüle taşındı.
- korumalı `GET /api/logs` yeni modüle taşındı.
- korumalı `DELETE /api/logs/cleanup` yeni modüle taşındı.
- `server.js`, `registerLogRoutes(app, deps)` çağrısını eski log route bloğunun göreli kayıt noktasında, slide route'larından sonra ve startup cleanup fonksiyonundan önce yapıyor.
- DB, filesystem, logger ve admin write middleware'leri explicit dependency olarak aktarılıyor.
- `cleanupOldLogs()`, günlük `setInterval` ve startup `cleanupOldLogs()` çağrısı bilerek `server.js` içinde bırakıldı.
- `backend/server.js` 1617 satırdan 1460 satıra indi; yeni `backend/routes/log-routes.js` 182 satır.

Korunan kritik sözleşmeler:

- `POST /api/logs` middleware sırası `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit`,
- `GET /api/logs` yalnız `requireAdminSession` ile korunan read route olarak kalır; CSRF/write rate-limit eklenmez,
- `DELETE /api/logs/cleanup` middleware sırası `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit`,
- create için zorunlu `timestamp`, `level`, `component`, `message` validation'ı,
- optional `errorDetails` / `context` JSON serialization ve null davranışı,
- DB insert başarıya ulaşmadan filesystem append yapılmaması,
- filesystem append hatasının başarılı DB insert request'ini başarısız saymaması,
- GET `limit` varsayılanı 100; kabul aralığı yalnız canonical `1..1000`,
- GET filtre parametre sırası `level → component → since → limit`,
- malformed veya primitive JSON alanlarının güvenli `safeParseJSON` davranışı,
- cleanup `days` varsayılanı 30 ve strict positive safe-integer validation,
- create/read/cleanup DB hatalarında raw SQLite/stack ayrıntılarının HTTP response'a sızmaması.

TDD ve regresyon kanıtı:

1. `tests/backend-route-extraction.test.js` içine A6 sözleşmesi önce eklendi ve `backend/routes/log-routes.js must exist` nedeniyle RED verdi.
2. Extraction sonrası A1–A6 structural testleri **6/6 pass** verdi.
3. Logs cleanup/create/read + admin error-log UI + admin auth/rate-limit odak grubu **75/75 pass** verdi.
4. Tam core **1406/1406 pass** verdi.
5. System smoke PASS; npm audit 0; syntax ve `git diff --check` temiz.
6. İzole temp DB HTTP smoke: unauth GET 401, admin login/session 200, CSRF 64, invalid limit/days 400, create/read 200, JSON error/context parse doğru, cleanup 200 ve final filtered GET boş.
7. Playwright korumalı `/admin` erişiminin `admin-login.html?next=/admin/` yüzeyine yönlendiğini doğruladı. Bu oturumda Playwright `browser_evaluate` aracı sayfayı `about:blank`e düşüren tool-side hata verdiği için API davranışı ayrıca Chrome DevTools ve gerçek HTTP smoke ile doğrulandı.
8. Chrome DevTools isolated browser context: login/session/create/filter GET 200, CSRF 64, JSON context doğru ve console error/warn/issue **0**; ilgili XHR/fetch trafiği 200/304.

Kod/test milestone:

- Commit: `1394fa033b1a470331c2025e50f4b2ab748790b0`
- GitHub Actions: `31313198706`
- Node 24: PASS (~23 sn)
- Node 22: PASS (~34 sn)

Bilinen fresh-DB `error_logs` cleanup-order logu extraction sırasında kasıtlı olarak aynı kaldı; startup cleanup hâlâ tablo oluşmadan çalıştığı için bu bağımsız bug ayrı iş olarak ele alınacaktır.

**Sıradaki backend dalgası: A7 — Slides.** Bu, backend extraction serisinin en riskli domainidir; active/admin list ayrımı, fallback ownership/reconciliation, cache invalidation, media cleanup, reorder transaction ve `/api/slides/active` route sırası özel kapılarla korunacaktır.

#### A7 — Slides — en son

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

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

##### A7 uygulama sonucu

Backend extraction serisinin en riskli domaini, mevcut route davranışları yeniden tasarlanmadan iki modüle ayrıldı:

- `backend/routes/slide-routes.js` oluşturuldu ve slide + slide-settings HTTP yüzeyini devraldı.
- `backend/slide-media-paths.js` oluşturuldu ve canonical/public/managed media-path yardımcılarını devraldı.
- `backend/server.js`, eski slide bloğunun göreli kayıt noktasında yalnız `registerSlideRoutes(app, deps)` çağrısını tutuyor.
- slide active cache state'i route registration closure'ına taşındı; başarılı create/update/reorder/delete sonrası invalidation davranışı korundu.
- fallback seed/reconciliation ve sistem sahipliği DB katmanında bırakıldı; bu extraction sırasında veri modeli veya reconciliation algoritması değiştirilmedi.
- `backend/server.js` 1460 satırdan **416 satıra** indi; `backend/routes/slide-routes.js` 994 satır, `backend/slide-media-paths.js` 66 satır.

Korunan kritik sözleşmeler:

- route sırası: `GET /api/slides/active` → `GET /api/slides` → `GET /api/admin/slides` → `GET /api/slides/:id`,
- write sırası: `PUT /api/slides/reorder`, parameterized `PUT /api/slides/:id` route'undan önce kayıtlı,
- admin write middleware sırası `requireAdminSession → requireCsrfToken → requireAdminWriteRateLimit`,
- public active list ile authenticated admin management list ayrımı,
- admin-created aktif slayt varsa fallback setinin gizlenmesi; aktif öğretmen slaytı kalmadığında permanent fallback setine dönülmesi,
- `is_fallback = 1` sistem slaytlarının update/delete/reorder ile değiştirilememesi,
- active-slide 5 dakikalık cache'in yalnız başarılı create/update/reorder/delete sonrasında invalidasyonu,
- reorder için isolated connection + transaction/rollback davranışı,
- delete için transaction sonrası display-order compaction ve ancak başarılı commit sonrasında media cleanup,
- update sırasında yeni media DB'ye başarıyla yazılmadan eski managed media'nın silinmemesi,
- canonical `/uploads/slides/<filename>` URL sözleşmesi ve dış/data URL passthrough davranışı,
- path traversal / nested filename değerlerinin managed file deletion hedefi olamaması,
- slide ve slide-settings DB hatalarında raw SQLite/stack ayrıntılarının HTTP response'a sızmaması,
- atomik üçlü slide-settings PUT transaction davranışı,
- mevcut slideshow transition-lock frontend davranışının değişmemesi.

TDD ve regresyon kanıtı:

1. `tests/backend-route-extraction.test.js` içine A7 sözleşmesi production dosyalarından önce eklendi ve `backend/routes/slide-routes.js must exist` nedeniyle RED verdi.
2. Extraction sonrası A1–A7 structural testleri **7/7 pass** verdi.
3. Slide/settings/admin auth/rate-limit/CORS odak grubu, extraction öncesi baseline ile birebir **354/354 pass** verdi.
4. İlk modular koşuda üç source/semantics farkı sistematik olarak ayrıştırıldı: exact active-slide SQL whitespace sözleşmesi, eski non-strict callback `this` semantiği ve taşınmış route'u hâlâ `server.js` içinde arayan source guard. Davranış yeniden tasarlanmadan minimal düzeltmelerle baseline'a dönüldü.
5. `normalizePath` aktif backend dependency'si kaldırılmadı; tüketim noktası `server.js`ten `slide-media-paths.js`e taşındığı için P3-4 source-contract testi yeni gerçek konumu izleyecek şekilde güncellendi.
6. Tam core **1407/1407 pass** verdi.
7. System smoke PASS; npm audit 0; üç backend dosyasının syntax kontrolü ve `git diff --check` temiz.
8. İzole temp DB gerçek HTTP smoke: başlangıçta 7 fallback; admin login/session 200 + CSRF 64; slide-settings GET/atomik PUT 200; iki gerçek multipart PNG create 200; active/admin list 2; single GET canonical `/uploads/slides/...`; reorder 200; `is_active=false` update 200 ve active list 1; son aktif öğretmen slaytı delete edilince active list yeniden 7 fallback; ikinci delete sonrası admin list 0.
9. İki multipart smoke upload'ının delete sonrasında `backend/uploads/slides` altında fiziksel olarak kalmadığı doğrulandı.
10. Playwright kiosk navigasyonu `2/D Sihirli Pano` başlığıyla başarılı oldu. Console sorgusunda tool-side `about:blank` davranışı tekrar görüldüğü için browser API/console kanıtı Chrome DevTools ile tamamlandı.
11. Chrome DevTools isolated context: `/api/slides/active` 200/304, login/session 200, `/api/admin/slides` 200, `/api/slide-settings` 200, CSRF 64, console error/warn/issue **0**.

Kod/test milestone:

- Commit: `facb944a6363f0bb464d1a4457fd90217674169a`
- GitHub Actions: `31314361667`
- Node 24: PASS (27 sn)
- Node 22: PASS (31 sn)

Bilinen fresh-DB `error_logs` cleanup-order bug'ı A7 sırasında kasıtlı olarak değiştirilmedi. P2-6 gerçek 55" 4K fiziksel kabul kapısı da ayrı biçimde açık kalır.

**Backend domain extraction A1–A7 tamamlandı.** A8 auth/session ancak ayrı security regression turuyla değerlendirilecektir. Sıradaki aktif refactor fazı **P3-5B — Admin JavaScript modülerleştirme**dir.

#### A8 — Admin auth/session — ayrıca ve en son değerlendir

Auth/session kodu güvenlik sınırı olduğu için sırf dosya küçülsün diye erken taşınmayacaktır.

Ancak tüm domain extraction tamamlandıktan sonra aşağıdaki mevcut modüllerle birlikte ayrı bir auth route registration modülü değerlendirilebilir:

- `admin-auth-config.js`
- `admin-session-cookie.js`
- `admin-session-store.js`
- `request-rate-limiter.js`

Auth refactor ayrı security regression turu gerektirir.

## 7. P3-5B — Admin JavaScript modülerleştirme

**Durum:** 🟨 Uygulanıyor — B1 tamamlandı ve doğrulandı; sıradaki dalga B2 Roles.

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

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

Korunacaklar:

- DOM safety,
- Excel import,
- photo upload,
- student stats,
- search/filter,
- mevcut notification davranışı.

#### B1 uygulama sonucu

Admin öğrenciler domaini klasik script düzeni korunarak `admin.js` dışına ayrıldı:

- `public/admin/js/students.js` oluşturuldu.
- Öğrenci render/stats/filter, create/delete, photo modal/upload/preview ve Excel preview/import akışları bu modüle taşındı.
- Modül `window.AdminStudents = { init, renderStudents, displayStudents }` namespace'ini kullanıyor; ES module veya framework eklenmedi.
- Mevcut inline/global çağrılar için `window.filterStudents`, `window.deleteStudent`, `window.showPhotoUploadModal`, `window.closePhotoUploadModal`, `window.clearExcelFile` ve `window.clearPhotoFile` adaptörleri korunuyor.
- `fetchStudents()` shell sorumluluğu olarak `admin.js` içinde kaldı; aynı fetch sonucu önce `AdminStudents.renderStudents(students)` ile öğrenci modülüne, sonra mevcut `updateRoleSelects(students)` ile role-select akışına dağıtılıyor. Böylece B1, B2 Roles sorumluluğunu erken taşımadı.
- Ana bootstrap `AdminStudents.init({ refreshStudents: fetchStudents, refreshRoles: fetchRoles })` ile refresh callback'lerini açıkça enjekte ediyor.
- Script sırası `error-logs.js → js/students.js → admin.js` olacak şekilde güncellendi.
- `public/admin/admin.js` **1804 → 1176 satıra** indi; yeni `public/admin/js/students.js` **609 satır**.

TDD ve regresyon kanıtı:

1. `tests/admin-student-module.test.js` production modülünden önce yazıldı ve `public/admin/js/students.js must exist` nedeniyle beklenen RED verdi.
2. Minimal extraction sonrası structural test **1/1 pass** verdi.
3. Extraction öncesi student DOM/Excel/notification/copy baseline grubu **32/32 pass** idi.
4. İlk modular test koşusunda eski VM harness'lerinin yalnız monolit `admin.js` yüklediği doğrulandı; `AdminStudents is not defined` ve taşınmış `displayStudents` lexical-scope hataları production bug olarak yorumlanmadı. Harness'ler gerçek script zincirini izleyecek şekilde, güvenlik assertion'ları zayıflatılmadan güncellendi.
5. Geniş admin-source odak grubu **77/77 pass** verdi.
6. Tam core **1408/1408 pass** verdi.
7. System smoke PASS; npm audit 0; `admin.js` ve `students.js` syntax kontrolleri ile `git diff --check` temiz.
8. İzole temp DB + gerçek admin browser smoke: login 200; `/admin/js/students.js` ve `/admin/admin.js` 200; student create sonrası sayaç 0→1; isim/gender render doğru; search/filter doğru; fotoğraf modalı doğru öğrenci adı/ID'si ile açıldı; delete 200 sonrası sayaç 1→0 ve boş state geri geldi.
9. 1366×768 ve 1920×1080 admin viewport'larında horizontal overflow **0**; Chrome DevTools console error/warn **0**.
10. Chrome DevTools script zincirinde `js/students.js`in `admin.js`ten önce yüklendiği ve geçici global adaptörlerin function olarak mevcut olduğu doğrulandı.
11. Playwright `/admin/` erişiminin doğru biçimde login yüzeyine yönlendiğini doğruladı. Login sayfasında mevcut `/favicon.ico` 404 dışında B1 kaynaklı hata görülmedi; sonraki `browser_evaluate` çağrısında daha önceki turlarda da görülen tool-side `about:blank` davranışı tekrarlandığı için gerçek admin API/UI/console kanıtı Chrome DevTools ile tamamlandı.

Kod/test milestone:

- Commit: `aeba60092fc6ba51036e7df58defe8351bdaf12c`
- GitHub Actions: `31315184119`
- Node 24: PASS (28 sn)
- Node 22: PASS (29 sn)

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B1 sırasında değiştirilmedi. P2-6 gerçek 55" 4K fiziksel kabul kapısı da ayrı biçimde açık kalır.

**Sıradaki admin JS dalgası: B2 — Roles.** `assignRole`, `removeRole`, `renderRoles` ve role select population tek role modülüne taşınacak; B1'in `fetchStudents()` fan-out köprüsü bu dalgada kontrollü olarak yeniden değerlendirilecektir.

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
