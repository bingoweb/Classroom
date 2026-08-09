# Classroom Projesi — P3-5 Büyük Refactor Yol Haritası — 8 Ağustos 2026

## 1. Belgenin amacı

Bu belge P3-5 kapsamındaki büyük yapısal refactor işlerinin **uygulama sırasını, güvenlik sınırlarını ve test kapılarını** tanımlar.

Bu belge bir “hemen bütün dosyaları parçala” talimatı değildir. P3-5'in amacı, mevcut stabil ürünü bozmadan ileride yapılacak büyük refactor işlerini küçük, bağımsız ve geri izlenebilir dalgalara ayırmaktır.

Değişen teknik gerçeklerde kaynak-of-truth sırası:

1. Git HEAD ve çalışan kod/test davranışı.
2. `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`.
3. Bu refactor yol haritası.

## 2. Bağlayıcı güvenlik ve ürün sınırları

- **Zorunlu geliştirme araç zinciri:** Classroom geliştirmesinin her dalgasında **DevSpace + Playwright MCP + Chrome DevTools MCP** birlikte kullanılacaktır. Dosya/Git/test/server/commit işlemlerinin source-of-truth yürütücüsü DevSpace'tir; Playwright ve Chrome DevTools ise ilgili gerçek browser/auth/UI/network/console/regresyon doğrulamalarında birlikte kullanılacaktır.
- **DevSpace zorunlu operasyon kapısı:** DevSpace erişilemezse, disabled mesajı verirse, araç kataloğunda görünmezse veya çağrıya cevap vermezse geliştirme derhal durdurulacaktır; GitHub connector, başka MCP, container veya herhangi bir alternatif geliştirme aracıyla dosya/Git/test/commit işlemlerine devam edilmeyecektir. Aynı oturumda alternatif geliştirme yoluna geçmek yerine yeni sohbet oturumuna devir yapılacak; yeni oturumda DevSpace erişimi sağlandıktan ve gerçek yerel checkout durumu tekrar doğrulandıktan sonra devam edilecektir.
- **Tesadüfen bulunan gerçek hata zorunlu düzeltme kapısı:** Geliştirme/refactor/test/browser doğrulaması sırasında ana kapsam dışında dahi olsa gerçek ürün/runtime/güvenlik/veri bütünlüğü hatası tespit edilirse ana iş geçici olarak durdurulacak; kök neden araştırılacak, mümkünse önce RED regresyon testi yazılacak, hata düzeltilecek ve focused + komşu + gerektiğinde Playwright/Chrome gerçek browser doğrulaması ile GREEN kanıtı alınacaktır. “Önceden vardı” veya “bu dalganın kapsamı değil” gerekçesiyle doğrulanmış hata açık bırakılmayacaktır. Tool-side sorunlar yalnız production'dan bağımsız oldukları kanıtlandığında bu kuralın dışında sayılır. Bugfix mümkün olduğunda ayrı product/test commit'inde tutulacak ve exact-SHA Node 22 + Node 24 CI yeşil olmadan ana refactor dalgasına dönülmeyecektir.
- **Eksik yerel araç/program kurulum kapısı:** macOS üzerinde geliştirme/test/analiz/browser doğrulama için gerekli bir uygulama veya CLI eksikse ve güvenli/makul biçimde mevcut yetkilerle kurulabiliyorsa “yok” denilerek geçilmeyecek; DevSpace üzerinden kurulacak, sürümü/çalışması doğrulanacak ve ana işe devam edilecektir. Homebrew ile kurulabilir CLI/formüllerde Homebrew tercih edilebilir. Kullanıcı etkileşimi, ayrı lisans veya ek yetki gerektiren gerçek blocker'lar açıkça raporlanacaktır.
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

Bu bölümdeki A1 → A7 sırası **domain extraction uygulama/commit sırasıdır**. A8 ise extraction zorunluluğu değil, auth/session sınırını tüm domain extraction'lardan sonra ayrı security-regression turunda değerlendirme kapısıdır. Mevcut Express route registration sırasını yeniden düzenleme talimatı değildir. Bir domain başka dosyaya taşınırken route'lar `server.js` içindeki mevcut göreli kayıt noktasında çağrılmalı; özellikle statik middleware, `/admin` auth middleware, schedule storage guard ve `/api/slides/active` / `/:id` sırası korunmalıdır.

### P3-5A — Backend route modülerleştirme

**Durum:** 🟩 Backend domain extraction A1–A7 tamamlandı ve doğrulandı. A8 admin auth/session ayrı security-regression turunda değerlendirildi ve yeni route extraction yapılmaması bilinçli mimari karar olarak kapatıldı. Backend refactor fazı bu sınırla tamamlanmıştır.

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

**Backend domain extraction A1–A7, A8 auth/session security refactor değerlendirmesi, P3-5B Admin JavaScript modülerleştirme ve P3-5C Admin inline CSS temizliği tamamlandı/doğrulandı.** A8 sonunda auth/session composition root'un `server.js` içinde kalması bilinçli karar olarak sabitlendi; yeni auth route extraction yapılmadı. C1–C5 sonunda admin HTML/JS template statik `style="..."` attribute envanteri **0** oldu; runtime state yazımları yaşayan planın sınırı gereği behavior-owned bırakıldı. C3 sırasında stored slide admin XSS, fresh-DB `error_logs` cleanup-order ve admin-login favicon 404; C4 sırasında admin form accessibility ve SQLite test-harness yarışları; C5 sırasında QR fallback URL kusuru ayrı bugfix commit'leriyle kapatıldı. **P3-5D0 kiosk CSS analiz/baseline hazırlığı tamamlandı; gerçek P3-5D selector/declaration cleanup P2-6 gerçek 55" 4K fiziksel kabul kapısına bağlı olduğu için başlatılmayacaktır.**

#### A8 — Admin auth/session — ayrıca ve en son değerlendir

**Durum:** 🟩 9 Ağustos 2026 — ayrı security-regression değerlendirmesi tamamlandı; **yeni extraction yapılmaması** bilinçli mimari karar olarak kapatıldı.

Auth/session kodu güvenlik sınırı olduğu için sırf dosya küçülsün diye taşınmadı.

Ancak tüm domain extraction tamamlandıktan sonra aşağıdaki mevcut modüllerle birlikte ayrı bir auth route registration modülü değerlendirilebilir:

- `admin-auth-config.js`
- `admin-session-cookie.js`
- `admin-session-store.js`
- `request-rate-limiter.js`

### A8 değerlendirme sonucu

Mevcut sınır zaten katmanlıdır:

- `backend/admin-auth-config.js` — credential/fail-closed policy,
- `backend/admin-session-cookie.js` — cookie serialization/parsing,
- `backend/admin-session-store.js` — session yaşam döngüsü,
- `backend/request-rate-limiter.js` — login/write limiter primitives.

`backend/server.js` A1–A7 sonrasında yaklaşık **420 satırdır**. Auth tarafında burada kalan sorumluluklar esas olarak composition-root sorumluluklarıdır:

- process başına CSRF secret + HMAC token üretimi/doğrulaması,
- tek `adminSessionStore` instance'ı,
- `requireAdminSession`,
- session-keyed admin write limiter instance'ı,
- `/admin` koruma middleware registration'ı,
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session`,
- bu middleware'lerin yedi domain route modülüne dependency injection'ı.

Tek bir `registerAdminAuthRoutes()` extraction'ı mevcut mimariyi sadeleştirmemektedir. `/admin` guard **static serving'den önce** kayıtlıyken login/logout/session endpoint'leri static/upload setup'tan **sonra** kayıtlıdır. Aynı modülün bu iki farklı source-order noktasını koruması için iki fazlı registration/factory API'si gerekir; bu da güvenlik sınırını azaltmak yerine ek indirection ve coupling üretir. Ayrıca `requireAdminSession`, `requireCsrfToken` ve `requireAdminWriteRateLimit` yedi domain route modülüne dependency olarak dağıtılmaya devam edeceği için composition root bağımlılığı ortadan kalkmaz.

Bu nedenle A8 kararı:

> **Mevcut auth/session composition root korunacak; sırf `server.js` birkaç satır daha küçülsün diye yeni auth route registration modülü oluşturulmayacaktır.**

Bu karar ancak aşağıdaki gerçek ihtiyaçlardan biri ortaya çıkarsa yeniden açılmalıdır:

- ikinci bağımsız admin/auth surface'i,
- memory store dışında harici session backend ihtiyacı,
- SSO / identity-provider entegrasyonu,
- auth middleware'lerinin başka bir Express app/server tarafından yeniden kullanılması,
- `server.js` composition root'unun tekrar belirgin biçimde büyümesi.

### A8 security-regression kanıtı

- Auth/session/rate-limit/CORS/JSON focused grup: **67/67 PASS**.
- Fail-closed password, 32-byte base64url session ID, exact expiry boundary, logout invalidation, `HttpOnly`, `SameSite=Strict`, optional `Secure`, login/write rate-limit ve auth → CSRF → write-rate middleware sırası mevcut testlerle korunuyor.
- Chrome DevTools gerçek UI: `/admin/` → login redirect; `admin` + temp parola ile login **200**; authenticated admin page **200**.
- `GET /api/admin/session` → `authenticated:true`, CSRF token uzunluğu **64**, `document.cookie` boş (session cookie HttpOnly).
- Admin sayfasının `window.fetch` wrapper'ı write isteklerine CSRF token'ını otomatik ekliyor. Wrapper bypass edilerek ham `XMLHttpRequest` ile doğrulama yapıldığında tokensız `POST /api/settings` **403**, doğru token ile **200** ve temp DB readback doğru.
- UI logout **200**; logout sonrası session `authenticated:false`, korumalı `/admin/` JSON erişimi **401**.
- Negatif 403/401 proplarından sonra temiz login reload'unda Chrome console error/warn/issue **0**.
- Playwright bağımsız `/admin/` erişiminde login redirect + `Yönetici Girişi` title doğrulandı; warning/error **0**. Takip console çağrısındaki bilinen tool-side `about:blank` davranışı ürün hatası değildir.
- Final full core: **1485/1485 PASS**, SQLite lifecycle/lock taraması **NONE**.
- `npm run test:system-smoke` → **SYSTEM_SMOKE_PASS**; admin login 200, CSRF 64.
- `npm audit --omit=dev` → **0 vulnerability**.
- A8 sırasında production auth/session kodunda **0 değişiklik** yapıldı.
- A8 karar commit'i `eae46d5301e2f70278a9572a98c48ed14215a397`; GitHub Actions `31330329809`: Node 22 **PASS (28 sn)**, Node 24 **PASS (31 sn)**.

## 7. P3-5B — Admin JavaScript modülerleştirme

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı. B1 Students, B2 Roles, B3 Attendance ve B4 Slides'in B4.1–B4.7 alt dalgalarının tamamı kapatıldı.

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

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

#### B2 uygulama sonucu

Admin görevler/roller domaini klasik script düzeni korunarak `admin.js` dışına ayrıldı:

- `public/admin/js/roles.js` oluşturuldu.
- role-select population, `assignRole`, `renderRoles`, `removeRole` ve `.remove-role-btn` event delegation bu modüle taşındı.
- Modül `window.AdminRoles = { init, updateRoleSelects, renderRoles, assignRole, removeRole }` namespace'ini kullanıyor; ES module/framework eklenmedi.
- Mevcut inline/global çağrılar için `window.assignRole` ve `window.removeRole` adaptörleri korunuyor.
- `fetchStudents()` shell'de kalıp aynı öğrenci listesini `AdminStudents.renderStudents(students)` ve `AdminRoles.updateRoleSelects(students)` arasında dağıtmaya devam ediyor.
- `fetchRoles()` shell'de kalıp aldığı role listesini `AdminRoles.renderRoles(roles)` ile domain modülüne aktarıyor.
- Ana bootstrap `AdminRoles.init({ refreshRoles: fetchRoles })` ile role refresh callback'ini açıkça enjekte ediyor.
- Script sırası `error-logs.js → js/students.js → js/roles.js → admin.js` oldu.
- `public/admin/admin.js` **1176 → 1052 satıra** indi; yeni `public/admin/js/roles.js` **137 satır**.

TDD ve regresyon kanıtı:

1. `tests/admin-role-module.test.js` production modülünden önce yazıldı ve `public/admin/js/roles.js must exist` nedeniyle beklenen RED verdi.
2. Minimal extraction sonrası B2 structural test **1/1 pass** verdi.
3. İlk geniş modular testte yalnız gerçek HTML'deki `roles.js` scriptini yüklemeyen eski VM harness'leri `AdminRoles is not defined` / taşınmış lexical function hataları üretti. Production davranışı değiştirilmeden harness'ler gerçek `students.js → roles.js → admin.js` zincirine geçirildi; DOM-safety assertion'ları zayıflatılmadı.
4. Geniş admin-source odak grubu **76/76 pass** verdi.
5. Tam core **1409/1409 pass** verdi.
6. System smoke PASS; npm audit 0; `admin.js`, `students.js`, `roles.js` syntax kontrolleri, package JSON parse ve `git diff --check` temiz.
7. İzole temp DB + gerçek admin browser smoke: dört öğrenci create ile role select'ler doldu; president POST 200; iki vice-president POST 200; üçüncü vice-president denemesi beklenen 400 / `En fazla 2 başkan yardımcısı olabilir`; star POST 200; remove-role event delegation + confirm sonrası DELETE 200 ve UI listesi yenilendi.
8. Chrome DevTools network: `/admin/js/roles.js` 200; role GET/POST/DELETE akışları beklenen status kodlarıyla görüldü. Beklenen limit 400'ünün logger console kaydından sonra yapılan temiz reload'da console error/warn **0**; yalnız önceden var olan form label/autocomplete DevTools issue kayıtları kaldı.
9. 1366×768 ve 1920×1080 admin viewport'larında horizontal overflow **0**.
10. Playwright korumalı `/admin/` erişiminin login sayfasına yönlendiğini doğruladı.

Kod/test milestone:

- Commit: `1e04860d296a3f5bcda2a3f0497fc4c8f46c83a6`
- GitHub Actions: `31315902265`
- Node 22: PASS (27 sn)
- Node 24: PASS (31 sn)

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B2 sırasında değiştirilmedi. P2-6 gerçek 55" 4K fiziksel kabul kapısı da ayrı biçimde açık kalır.

**Sıradaki admin JS dalgası: B3 — Attendance.** Istanbul tarih anahtarı, attendance render/summary ve bulk-save davranışı aynı domain modülünde korunacaktır.

### B3 — Attendance

`setTodayDate`, `loadAttendanceForDate`, `renderAttendanceList`, `updateAttendanceSummary`, `saveAttendance` aynı modülde tutulur.

Istanbul tarih davranışı regression testle korunur.

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı.

#### B3 uygulama sonucu

Admin yoklama domaini klasik script düzeni korunarak `admin.js` dışına ayrıldı:

- `public/admin/js/attendance.js` oluşturuldu.
- Istanbul `Bugün` tarihi, tarih bazlı yoklama load, attendance list render, özet ve bulk save akışları aynı modülde tutuldu.
- Modül `window.AdminAttendance = { init, setTodayDate, loadAttendanceForDate, renderAttendanceList, updateAttendanceSummary, saveAttendance }` namespace'ini kullanıyor; ES module/framework eklenmedi.
- Mevcut inline/global HTML çağrıları için `window.setTodayDate`, `window.loadAttendanceForDate` ve `window.saveAttendance` adaptörleri korunuyor.
- Attendance state (`allStudentsForAttendance`, `currentAttendanceDate`) modül closure'ına taşındı.
- Ana bootstrap yalnız `AdminAttendance.init()` çağırıyor; `init()` önceki DOMContentLoaded davranışıyla aynı şekilde Istanbul gününü seçip yoklamayı yüklüyor.
- Script sırası `error-logs.js → js/students.js → js/roles.js → js/attendance.js → admin.js` oldu.
- `public/admin/admin.js` **1052 → 897 satıra** indi; yeni `public/admin/js/attendance.js` **161 satır**.

TDD ve regresyon kanıtı:

1. `tests/admin-attendance-module.test.js` production modülünden önce yazıldı ve `public/admin/js/attendance.js must exist` nedeniyle beklenen RED verdi.
2. Minimal extraction sonrası B3 structural test **1/1 pass** verdi.
3. Extraction öncesi Istanbul/attendance DOM + ortak admin harness baseline grubu **34/34 pass** idi.
4. İlk modular focused koşusunda eski VM harness'lerinin `attendance.js` yüklememesi ve Istanbul source-contract testinin taşınmış fonksiyonu hâlâ `admin.js` içinde araması doğrulandı. Harness'ler gerçek script zincirine geçirildi; Istanbul testinde gerçek `AdminAttendance` modülü çalıştırılıp `/api/attendance/2026-08-09` isteği doğrulandı.
5. Attendance focused grup structural dahil **35/35 pass** verdi; commit öncesi slide-settings source-contract regresyonu da dahil geniş B3 odak kapısı **43/43 pass** verdi.
6. İlk full core koşusunda yalnız `tests/admin-slide-settings-submit.test.js` eski `// Attendance Functions` yorumunu fonksiyon bitiş işareti olarak kullandığı için stale source-contract hatası verdi; slide settings davranışı değişmeden test dosya sonunu izleyecek şekilde güncellendi.
7. Final tam core **1410/1410 pass** verdi.
8. System smoke PASS; npm audit 0; `admin.js`, `students.js`, `roles.js`, `attendance.js` syntax kontrolleri, package JSON parse ve `git diff --check` temiz.
9. İzole temp DB + gerçek admin browser smoke: login 200; `AdminAttendance` namespace/global adaptörleri mevcut; `Bugün` tarihi `2026-08-09`; iki öğrenci UI create sonrası yoklama load özeti 2 toplam / 2 var / 0 yok; ikinci öğrenci `Yok` seçilip bulk save edildiğinde POST 200 ve refresh sonrası özet 2 / 1 / 1 olarak korundu.
10. API readback aynı tarihte ilk öğrenciyi `present`, ikinci öğrenciyi `absent` döndürdü; DOM radio checked-state de aynı sonucu gösterdi.
11. Chrome DevTools network: `/admin/js/attendance.js` 200, attendance GET 200/304 ve bulk POST 200; clean reload'da console error/warn 0, yalnız önceden var olan form label/autocomplete issue kayıtları ve normal slide info logu.
12. 1366×768 ve 1920×1080 admin viewport'larında horizontal overflow **0**.
13. Playwright `/admin/` auth redirect PASS.

Kod/test milestone:

- Commit: `83d81ecd1184bfa36ead67b9f7a14b6e91d58dca`
- GitHub Actions: `31316702669`
- Node 22: PASS (28 sn)
- Node 24: PASS (28 sn)

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B3 sırasında değiştirilmedi. P2-6 gerçek 55" 4K fiziksel kabul kapısı da ayrı biçimde açık kalır.

**Sıradaki admin JS dalgası: B4 — Slides.** B4 en yoğun frontend domainidir; read/render → active toggle → reorder → form/media → CRUD → settings alt sırası korunacak ve tek big-bang taşıma yapılmayacaktır.

### B4 — Slides — en son

Slides yaklaşık dosyanın yarısını oluşturan en yoğun admin alanıdır. Drag/drop, form state, media preview, active toggle ve slide settings aynı anda taşınmamalıdır.

**Durum:** 🟩 9 Ağustos 2026 — B4.1 read/render, B4.2 active toggle, B4.3 drag/reorder, B4.4 form open/close/edit, B4.5 media preview, B4.6 create/update/delete ve B4.7 slide settings tamamlandı/doğrulandı.

Önerilen alt sıra:

1. read/render — 🟩 B4.1 tamamlandı,
2. active toggle — 🟩 B4.2 tamamlandı,
3. drag/reorder — 🟩 B4.3 tamamlandı,
4. form open/close/edit — 🟩 B4.4 tamamlandı,
5. media preview — 🟩 B4.5 tamamlandı,
6. create/update/delete — 🟩 B4.6 tamamlandı,
7. slide settings — 🟩 B4.7 tamamlandı.

Her alt adım mevcut global fonksiyon adını geçici adaptörle korur.

#### B4.1 — read/render uygulama sonucu

Slides domaininin yalnız yönetim listesi okuma/render ownership'i klasik script düzeni korunarak `admin.js` dışına çıkarıldı; active toggle, drag/reorder, form/edit state, media preview, CRUD ve slide settings bilerek shell'de bırakıldı.

- `public/admin/js/slides.js` oluşturuldu ve `renderSlides(slides)` davranışını devraldı.
- Modül `window.AdminSlides = { init, renderSlides }` namespace'ini kullanıyor; ES module/framework eklenmedi.
- `fetchSlides()` `public/admin/admin.js` içinde shell bridge olarak kaldı ve aldığı authenticated management listesini `AdminSlides.renderSlides(allSlides)` ile modüle aktarıyor.
- Render sonrasındaki mevcut drag/drop kurulumu B4.3'ü erken taşımamak için `AdminSlides.init({ setupDragAndDrop })` callback injection'ı üzerinden shell'e geri delege ediliyor.
- Existing inline `editSlide(...)`, `toggleSlideActive(...)` ve `deleteSlide(...)` çağrıları render markup'ında korunuyor; ilgili davranışların ownership'i sonraki B4 alt dalgalarına bırakıldı.
- `public/admin/index.html` script sırası `students.js → roles.js → attendance.js → slides.js → admin.js` oldu.
- `tests/admin-slide-module.test.js`, fiziksel extraction/script sırası/namespace/shell sınırı yanında B4.2–B4.7 davranışlarının erken taşınmadığını da structural regression olarak kilitliyor.
- Admin VM harness'leri gerçek `slides.js → admin.js` zincirini yükleyecek şekilde güncellendi; DOM-safety ve error-log assertion'ları zayıflatılmadı.
- `public/admin/admin.js` **897 → 827 satıra** indi; yeni `public/admin/js/slides.js` **85 satır**.

Korunan kritik sözleşmeler:

- authenticated `GET /api/admin/slides` management list kullanımı,
- pasif slaytların öğretmen yönetim listesinde görünmeye devam etmesi,
- aktif slaytta `Pasif Yap`, pasif slaytta `Aktif Yap` etiketi,
- media preview path'inin `Utils.normalizePath(mediaPath, true)` ile normalize edilmesi,
- empty-list render davranışı,
- render sonrası mevcut drag/drop wiring'inin çalışması,
- public permanent fallback seti ile teacher-managed admin list ayrımı,
- classic script düzeni ve mevcut global inline callback isimleri,
- B4.1 dışında active toggle/reorder/form/media/CRUD/settings ownership'inin `admin.js` içinde kalması.

TDD ve regresyon kanıtı:

1. Extraction öncesi slide/admin DOM/error-log/Istanbul baseline grubu **51/51 pass** verdi.
2. `tests/admin-slide-module.test.js` production modülünden önce yazıldı ve `public/admin/js/slides.js must exist` nedeniyle beklenen RED verdi.
3. Minimal extraction sonrası B4.1 structural test **1/1 pass** verdi.
4. İlk geniş modular koşuda yalnız eski VM harness'lerinin yeni `slides.js` scriptini yüklememesi ve `admin-slide-management` testinin eski global `renderSlides` varsayımı tespit edildi. Production davranışı gevşetilmeden harness'ler gerçek HTML script zincirine geçirildi.
5. Commit öncesi geniş B4.1 focused kapısı **52/52 pass** verdi.
6. Tam core **1411/1411 pass** verdi.
7. System smoke PASS; `npm audit --omit=dev` **0 vulnerability**; `slides.js`, `admin.js` ve ilgili test syntax kontrolleri ile `git diff --check` temiz.
8. İzole temp SQLite + gerçek admin browser smoke: public `/api/slides` **200** ve permanent fallback seti **7**; authenticated `/api/admin/slides` **200** ve yalnız eklenen teacher-managed pasif smoke slaytı **1**; bu slayt DOM'da görünür ve `Aktif Yap` etiketi doğru.
9. Playwright: `/admin/js/slides.js` 200, `/admin/admin.js` 200, authenticated management API 200; `window.AdminSlides` ve `renderSlides` runtime'da mevcut; clean reload console error/warn **0**, page error **0**; 1366×768 ve 1920×1080 horizontal overflow **0**.
10. Chrome DevTools isolated context: `slides.js` 200, `admin.js` 200, `/api/admin/slides` 200; cache-bypass reload sonrası console error/warn **0** ve pasif slayt/`Aktif Yap` state'i korunuyor. Yalnız B4.1 öncesinden var olan form-label/autocomplete DevTools issue kayıtları ayrı ve non-blocking kaldı.
11. Product/test commit `338802d4df09accf73c14a5f35146a6f1b1ca497` exact SHA'sında GitHub Actions `31317816068`: Node 22 **PASS (26 sn)**, Node 24 **PASS (29 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.1 sırasında değiştirilmedi. P2-6 gerçek 55" 4K fiziksel kabul kapısı da ayrı biçimde açık kalır.

#### B4.2 — active toggle uygulama sonucu

Slides domaininin yalnız active/passive toggle ownership'i `admin.js` dışına çıkarıldı. Drag/reorder, form open/close/edit, media preview, create/update/delete ve slide settings bu alt dalgada bilerek shell'de bırakıldı.

- `toggleSlideActive(id)` artık `public/admin/js/slides.js` içinde yaşıyor ve inline HTML sözleşmesi için `window.toggleSlideActive = toggleSlideActive` adaptörü korunuyor.
- Slide state erişimi ve refresh bağımlılığı global değişken kopyalamak yerine `AdminSlides.init({ getSlides: () => allSlides, refreshSlides: fetchSlides, setupDragAndDrop })` ile açık callback injection üzerinden veriliyor.
- Mevcut `PUT /api/slides/:id` çağrısı ve `{ is_active: 0|1 }` payload sözleşmesi aynen korundu.
- Existing success/error feedback, `logger.warn/debug/info/error` kayıtları ve successful update sonrası `fetchSlides()` refresh davranışı korundu.
- Aktif/pasif render işaretleri ile `Pasif Yap` / `Aktif Yap` buton metinleri değişmedi.
- B4.3–B4.7 ownership sınırı structural regression ile kilitlendi; drag/drop, reorder, form, media preview, CRUD ve settings hâlâ `public/admin/admin.js` içinde.
- `public/admin/admin.js` **827 → 779 satıra** indi; `public/admin/js/slides.js` **85 → 145 satıra** çıktı.

TDD ve regresyon kanıtı:

1. Değişiklik öncesi focused slide/admin baseline **54/54 pass**, full core baseline **1411/1411 pass** verdi.
2. B4.2 structural/behavior testi production değişikliğinden önce yazıldı; RED koşusunda B4.1 testi geçti, yeni structural test `slides.js` içinde `toggleSlideActive` olmadığı için fail oldu ve 5 behavior alt testi `window.toggleSlideActive is not a function` nedeniyle beklenen biçimde fail verdi (**1 pass / 7 fail**).
3. Minimal extraction sonrası `npm run test:admin-slide-module` **8/8 pass** verdi.
4. Geniş focused slide/admin kapısı **61/61 pass** verdi.
5. Tam core **1418/1418 pass** verdi.
6. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; `admin.js`, `slides.js` ve B4.2 test syntax kontrolleri ile `git diff --check` temiz.
7. İzole temp SQLite + gerçek admin browser smoke: teacher-managed `B4.2 Browser Smoke` slaytı aktif başladı; aktif→pasif PUT **200** / `{ "is_active": 0 }`, ardından pasif→aktif PUT **200** / `{ "is_active": 1 }`; UI `✓ Aktif / Pasif Yap → ✗ Pasif / Aktif Yap → ✓ Aktif / Pasif Yap` olarak refresh oldu ve DB final state `is_active=1` verdi.
8. Playwright gerçek UI doğrulamasında iki PUT da **200**, payload'lar doğru, refresh sonrası state/label doğru; 1366×768 ve 1920×1080 ölçülerinde `scrollWidth === clientWidth`, horizontal overflow **0**.
9. Chrome DevTools isolated context doğrulamasında iki PUT da **200**; request body'leri sırasıyla `{ "is_active": 0 }` ve `{ "is_active": 1 }`; başarı notification'ı ve her toggle sonrası `/api/admin/slides` refresh görüldü. Toggle ile ilişkili console error yok; yalnız önceden var olan form-label/autocomplete DevTools issue kayıtları non-blocking kaldı.
10. Product/test commit `b8971f692113c2365de85b11b81aa825d2be65ad` exact SHA'sında GitHub Actions `31318593581`: Node 22 **PASS (33 sn)**, Node 24 **PASS (28 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.2 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

**B4.2 kapanışındaki sıradaki alt dalga B4.3 — drag/reorder ownership extraction idi; bu alt dalga aşağıdaki B4.3 kaydında tamamlanmıştır.** Form open/close/edit → media preview → create/update/delete → slide settings sırası korunur.

#### B4.3 — drag/reorder uygulama sonucu

Slides domaininin drag/drop binding ve reorder ownership'i `admin.js` dışına çıkarıldı. Form open/close/edit, media preview, create/update/delete ve slide settings bu alt dalgada bilerek shell'de bırakıldı.

- `setupDragAndDrop()`, `handleDragStart()`, `handleDragOver()`, `handleDrop()`, `handleDragEnd()` ve `reorderSlides()` artık `public/admin/js/slides.js` içinde yaşıyor.
- Render sonrası drag binding artık shell callback injection'ına dönmüyor; `renderSlides()` doğrudan modül içindeki `setupDragAndDrop()` çağrısını yapıyor.
- `AdminSlides.init(...)` yalnız mevcut slide state'i için `getSlides: () => allSlides` ve management-list refresh'i için `refreshSlides: fetchSlides` bağımlılıklarını alıyor; `setupDragAndDrop` injection'ı kaldırıldı.
- Reorder payload üretimi shell'deki `allSlides` yerine enjekte edilen `getSlidesHandler()` listesini kullanıyor; başarı/hata sonrası refresh `refreshSlidesHandler()` üzerinden aynı `fetchSlides()` davranışına dönüyor.
- Mevcut `PUT /api/slides/reorder` ve `{ slideOrders: [...] }` sözleşmesi, yalnız dragged/target `display_order` swap mantığı, logger mesajları ve kullanıcı feedback metinleri korunuyor.
- B4.4–B4.7 ownership sınırı structural regression ile kilitlendi; form/edit, media preview, CRUD ve settings hâlâ `public/admin/admin.js` içinde.
- `public/admin/admin.js` **779 → 658 satıra** indi; `public/admin/js/slides.js` **145 → 262 satıra** çıktı.

TDD ve regresyon kanıtı:

1. Değişiklik öncesi `npm run test:admin-slide-module` **8/8 pass**, full core baseline **1418/1418 pass** verdi.
2. B4.3 structural + behavior testleri production değişikliğinden önce yazıldı. RED koşusunda önceki B4.1/B4.2 sözleşmeleri geçerken yeni ownership ve dört drag/reorder behavior alt testi beklenen nedenle kırıldı: toplam **8 pass / 6 fail**.
3. Minimal extraction sonrası `npm run test:admin-slide-module` **14/14 pass** verdi.
4. Admin/slide/reorder komşu kapısı **137/137 pass** verdi.
5. Tam core yeni alt testlerle **1424/1424 pass** verdi.
6. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; `admin.js`, `slides.js` ve B4.3 test syntax kontrolleri ile `git diff --check` temiz.
7. DevSpace ortamında Playwright/Puppeteer package'ı bulunmadığı doğrulandı; bağlayıcı DevSpace-only kuralı gereği başka MCP/browser aracına geçilmedi. Bunun yerine aynı DevSpace oturumundan sistemdeki **Google Chrome 151.0.7922.109** doğrudan headless CDP ile sürüldü.
8. İzole temp SQLite + gerçek Chrome drag/reorder smoke: browser admin login **200**; başlangıç UI sırası `id=8/#1 → id=9/#2`; gerçek `dragstart → dragover → drop → dragend` dispatch'i tek `PUT /api/slides/reorder` üretti; body `{ "slideOrders": [{"id":8,"display_order":2},{"id":9,"display_order":1}] }`; response **200**.
9. Aynı smoke'da authenticated management API readback ve doğrudan SQLite readback `id=9/#1 → id=8/#2` verdi; UI refresh aynı sırayı gösterdi ve `Sıralama başarıyla güncellendi` notification'ı görünür oldu.
10. Browser smoke başlangıç/final horizontal overflow **0 → 0**; console warning/error **0**, page error **0**. İlk smoke harness turunda yalnız yanlış notification DOM id'si kullanıldığı için harness assertion'ı kırıldı; gerçek reorder PUT/DB swap o turda da başarılıydı. Selector gerçek `adminNotificationRegion` sözleşmesine düzeltildikten sonra final smoke PASS verdi.
11. Product/test commit `365aa84511d94eb464b93b8458216de8b8d49d30` exact SHA'sında GitHub Actions `31319187815`: Node 22 **PASS (36 sn)**, Node 24 **PASS (36 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.3 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

**B4.3 kapanışındaki sıradaki alt dalga B4.4 — form open/close/edit idi; bu alt dalga aşağıdaki B4.4 kaydında tamamlanmıştır.** Media preview → create/update/delete → slide settings sırası korunur.

#### B4.4 — form open/close/edit uygulama sonucu

Slides domaininin form açma/kapatma/edit alias'ı ve aktif düzenleme state ownership'i `admin.js` dışına çıkarıldı. Media preview/reset üretimi, dosya değişimi, submit/create/update/delete ve slide settings bu alt dalgada bilerek shell'de bırakıldı.

- `currentEditingSlide` state'i artık `public/admin/js/slides.js` closure'ında yaşıyor.
- `showSlideForm(slideId)`, `closeSlideForm()`, `editSlide(id)` ve `getCurrentEditingSlideId()` slide modülüne taşındı.
- Mevcut inline HTML sözleşmesi için `window.showSlideForm`, `window.closeSlideForm` ve `window.editSlide` adaptörleri korundu.
- Edit akışında title/content/text/duration/video-auto-advance/transition alanları modül tarafından dolduruluyor; milisaniye tabanlı sürelerin saniye alanlarına dönüşümü korunuyor.
- B4.5'i erken taşımamak için mevcut medya preview/reset davranışı shell'de `prepareSlideMediaForm(slide)` ve `resetSlideMediaForm()` olarak tutuldu; bunlar `AdminSlides.init(...)` üzerinden callback olarak enjekte ediliyor.
- Content-type ve transition-mode görünürlük senkronizasyonu da mevcut shell handler'larına callback ile delege ediliyor.
- `handleSlideMediaChange()` ve `handleContentTypeChange()` artık global editing değişkeni yerine `AdminSlides.getCurrentEditingSlideId()` kullanıyor.
- Chrome gerçek UI kontrolünde eski akıştan kalan bir form-state açığı bulundu: edit → iptal → yeni slayt akışında hidden `slideId` değeri resetlenmiyordu. Ayrı RED regresyonu yazıldı ve hem new-form hem close akışında `slideId=''` açıkça garanti altına alındı.
- `public/admin/admin.js` **658 → 624 satıra** indi; `public/admin/js/slides.js` **262 → 346 satıra** çıktı.

TDD ve regresyon kanıtı:

1. Değişiklik öncesi `npm run test:admin-slide-module` **14/14 pass** verdi.
2. B4.4 structural + add/edit/close behavior testleri production değişikliğinden önce yazıldı. Önceki B4.1–B4.3 sözleşmeleri yeşil kalırken yeni B4.4 ownership'i doğru nedenle kırıldı: toplam **14 pass / 5 fail**.
3. Minimal extraction sonrası focused paket **19/19 pass** verdi.
4. Chrome DevTools gerçek edit→close→new akışında stale hidden `slideId` keşfedildi. Bu kusur için ikinci RED turu **16 pass / 3 fail** verdi; iki anlamlı failure stale ID'nin `88` ve `51` olarak kaldığını kanıtladı.
5. Minimal hidden-ID düzeltmesinden sonra focused paket yeniden **19/19 pass** verdi.
6. Admin/slide/notification/DOM-safety komşu kapısı **72/72 pass** verdi.
7. Tam core **1429/1429 pass** verdi.
8. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; `admin.js`, `slides.js`, ilgili test syntax kontrolleri ve `git diff --check` temiz.
9. İzole temp SQLite + Chrome DevTools gerçek admin UI: edit modalı `B4.4 Form Smoke` slaydını doğru alanlarla açtı; editing state `8`, hidden ID `8`, mevcut image preview görünür ve media input editte opsiyonel. Close sonrası editing `null`, hidden ID boş, modal kapalı ve media input tekrar required. New form sonrası editing `null`, hidden ID boş, preview temiz ve başlık `Yeni Slayt Ekle`.
10. Chrome DevTools network: `/admin/js/slides.js` **200**, `/admin/admin.js` **200**, `/api/admin/slides` **200**; console error/warn **0**. 1366×768 window kontrolünde horizontal overflow **0**; 1920×1080 window kontrolünde inner viewport 1920×863 ve horizontal overflow yine **0**.
11. Playwright MCP final koda karşı korumalı `/admin/` erişiminin `admin-login.html?next=/admin/` yüzeyine yönlendiğini doğruladı. Takip eden çağrıda daha önce de bilinen tool-side `about:blank` davranışı tekrarlandığı için authenticated form-state/UI/network kanıtı Chrome DevTools ile tamamlandı.
12. Product/test commit `02bdabf569f40727236d34408334c09e606714b2` exact SHA'sında GitHub Actions `31320136399`: Node 24 **PASS (27 sn)**, Node 22 **PASS (28 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.4 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

**B4.4 kapanışında sıradaki alt dalga B4.5 — media preview ownership extraction idi; bu alt dalga aşağıdaki B4.5 kaydında tamamlanmıştır.** Create/update/delete → slide settings sırası korunur.

#### B4.5 — media preview uygulama sonucu

Slides domaininin mevcut medya hazırlama/reset, file-input change binding ve FileReader tabanlı yeni medya preview ownership'i `admin.js` dışına çıkarıldı. Create/update/delete submit akışı ile slide settings bu alt dalgada bilerek shell'de bırakıldı.

- `prepareSlideMediaForm(slide)`, `resetSlideMediaForm()`, `handleSlideMediaChange(e)` ve ortak `renderExistingMediaPreview(slide)` artık `public/admin/js/slides.js` içinde yaşıyor.
- `showSlideForm()` ve `closeSlideForm()` artık B4.4'teki shell callback seam'ine dönmeden doğrudan modül içindeki media prepare/reset fonksiyonlarını çağırıyor.
- `AdminSlides.init(...)` içinden `prepareMediaForm` ve `resetMediaForm` callback injection'ları kaldırıldı; yalnız slide state/refresh ile B4.6+ kapsamındaki content/transition senkron callback'leri kaldı.
- `slideMedia` için `change` event binding ownership'i de slide modülünün `init()` fonksiyonuna taşındı; `admin.js` artık bu listener'ı bağlamıyor.
- Edit sırasında mevcut media path `Utils.normalizePath(slide.media_path, true)` ile normalize edilmeye devam ediyor; image/GIF/video preview metin ve markup sözleşmeleri korunuyor.
- Yeni medya seçiminde 100 MB sınırı, `Yeni dosya: <name> (<MB> MB)` bilgisi, mevcut medya bilgisinin gizlenmesi ve FileReader data-URL preview davranışı korunuyor.
- Edit sırasında file input boşaltılırsa mevcut medya preview'ının geri gelmesi modül içi `currentEditingSlide` + `getSlidesHandler()` state'i üzerinden korunuyor.
- B4.6 create/update/delete ve B4.7 slide settings ownership'i structural regression ile hâlâ `public/admin/admin.js` içinde kilitli.
- `public/admin/admin.js` **624 → 481 satıra** indi; `public/admin/js/slides.js` **346 → 453 satıra** çıktı.

TDD ve regresyon kanıtı:

1. Değişiklik öncesi `npm run test:admin-slide-module` **19/19 pass** verdi.
2. B4.5 structural + media behavior testleri production değişikliğinden önce yazıldı. Önceki B4.1–B4.4/active/reorder sözleşmeleri geçerken yeni ownership/change-binding/form-internalization testleri doğru nedenle kırıldı: toplam **15 pass / 10 fail**.
3. Minimal extraction sonrası `npm run test:admin-slide-module` **25/25 pass** verdi; `admin.js`, `slides.js`, test syntax kontrolleri ve `git diff --check` temizdi.
4. Admin/slide/media/cache/notification/DOM-safety komşu kapısı **139/139 pass** verdi.
5. Tam core yeni testlerle **1435/1435 pass** verdi.
6. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**.
7. İzole temp SQLite + Chrome DevTools gerçek admin UI baseline'ında `B4.5 Media Smoke` slaytı editte mevcut `default_boy.png` image preview'ını ve opsiyonel media-input state'ini doğru gösterdi.
8. Aynı gerçek browser oturumunda `File` + `DataTransfer` ile `browser.png` image seçimi gerçek `change` event'ini tetikledi; `Yeni dosya: browser.png (0.00 MB)`, boş current-media info, FileReader data URL ve `Yeni Resim Önizlemesi` doğrulandı. Input tekrar boşaltıldığında mevcut `default_boy.png` preview ve `Mevcut Resim` bilgisi geri geldi.
9. Chrome DevTools network: `/admin/js/slides.js` **200**, `/admin/admin.js` **200**, `/api/admin/slides` **200**; console error/warn **0**, horizontal overflow **0**.
10. Playwright MCP final koda karşı korumalı `/admin/` erişiminin `admin-login.html?next=/admin/` yüzeyine yönlendiğini doğruladı; takip eden çağrıda bilinen tool-side `about:blank` davranışı tekrarlandığı için authenticated media UI/network kanıtı Chrome DevTools ile tamamlandı.
11. Product/test commit `1247e4775950c2236517cd7afe8ad546016b4a88` exact SHA'sında GitHub Actions `31320857054`: Node 24 **PASS (27 sn)**, Node 22 **PASS (29 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.5 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

**B4.5 kapanışında sıradaki alt dalga B4.6 — create/update/delete idi; bu alt dalga aşağıdaki B4.6 kaydında tamamlanmıştır.** Ardından B4.7 slide settings ile B4 bütünü kapatılmıştır.

#### B4.6 — create/update/delete uygulama sonucu

Slides domaininin form submit/create/update ve delete ownership'i `public/admin/admin.js` dışına çıkarıldı; B4.7 slide settings bu alt dalgada bilerek shell'de bırakıldı.

- `handleSlideSubmit(e)` ve `deleteSlide(id)` artık `public/admin/js/slides.js` içinde yaşıyor.
- `slideForm` submit listener ownership'i `AdminSlides.init()` içine taşındı; shell bu event'i artık bağlamıyor.
- Inline render sözleşmesi için `window.deleteSlide = deleteSlide` adaptörü korunuyor.
- Create/update akışında mevcut content/media validation, 100 MB limiti, media-type MIME/extension fallback'i, `FormData`, `XMLHttpRequest`, CSRF header, upload progress, success/error feedback ve logger davranışı korundu.
- Edit sırasında yeni medya seçilmezse mevcut `media_type`, shell `allSlides` yerine `getSlidesHandler()` üzerinden korunuyor.
- Success sonrası management-list refresh shell `fetchSlides()` çağrısına doğrudan bağlı olmak yerine mevcut `refreshSlidesHandler()` seam'i üzerinden çalışıyor.
- Delete akışında confirm, `DELETE /api/slides/:id`, safe HTTP/network feedback ve successful refresh sözleşmesi korunuyor.
- B4.7 settings ownership'i structural regression ile bu aşamada `public/admin/admin.js` içinde kilitli tutuldu.
- `public/admin/admin.js` **481 → 301 satıra** indi; `public/admin/js/slides.js` **453 → 627 satıra** çıktı.

TDD ve regresyon kanıtı:

1. B4.6 production değişikliğinden önce structural + CRUD behavior testleri yazıldı. Mevcut B4.1–B4.5 testleri yeşil kalırken yeni ownership/binding/CRUD testleri doğru nedenle kırıldı: **25 pass / 10 fail**.
2. Minimal extraction sonrası `npm run test:admin-slide-module` **35/35 pass** verdi.
3. CRUD/cache/delete/media/notification komşu kapısı **124/124 pass** verdi.
4. Tam core **1445/1445 pass** verdi.
5. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; syntax ve `git diff --check` temiz.
6. İzole temp SQLite + Chrome DevTools gerçek admin UI'da `File + DataTransfer + change` ile image seçildi; gerçek create **POST /api/slides 200**, edit/update **PUT /api/slides/8 200** ve delete **DELETE /api/slides/8 200** verdi. Her write sonrası authenticated management-list refresh **200**; API final readback **0 teacher slide**.
7. Aynı browser turunda console error/warn **0**, horizontal overflow **0**. Chrome DevTools `upload_file` yalnız MCP workspace-root sınırı nedeniyle proje dosya yolunu kabul etmedi; aynı MCP sayfasındaki browser-native `File/DataTransfer` ile upload akışı doğrulandı ve bu production problemi değildir.
8. Playwright MCP korumalı `/admin/` erişiminin `admin-login.html?next=/admin/` yüzeyine yönlendiğini doğruladı; takip eden snapshot çağrısında bilinen tool-side `about:blank` davranışı tekrarlandı.
9. Product/test commit `9e8d9f528a214b7fcb1e1fb57f7fdfbab2683db9` exact SHA'sında GitHub Actions `31321479475`: Node 22 **PASS (25 sn)**, Node 24 **PASS (29 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.6 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

#### B4.7 — slide settings ve final ownership uygulama sonucu

B4'ün son alt dalgasında slide settings read/save ile slide-form'a özel content/video/transition visibility ownership'i `public/admin/js/slides.js` içine taşındı. Bu adımla slide domaininin planlanan B4.1–B4.7 ownership transferi tamamlandı.

- `fetchSlideSettings()`, `handleSlideSettingsSubmit(e)`, `handleContentTypeChange()` ve `handleTransitionModeChange()` artık slide modülü içinde yaşıyor.
- `slideContentType`, `slideTransitionMode` ve `slideSettingsForm` event listener'ları `AdminSlides.init()` içinde bağlanıyor; shell bu listener'ları artık yönetmiyor.
- B4.4 form open/edit akışı content/video/transition görünürlüğünü callback injection yerine doğrudan modül içi handler'larla senkronize ediyor; `syncContentType` / `syncTransitionMode` injection'ları kaldırıldı.
- Settings GET ownership'i modülde olsa da bootstrap side-effect'i açık tutuldu: `admin.js` composition root, `AdminSlides.init({ getSlides, refreshSlides })` sonrasında `AdminSlides.fetchSlideSettings()` çağırıyor. Böylece init gizli network isteği üretmiyor.
- Mevcut settings GET ms→s dönüşümü ve atomik tek `PUT /api/slide-settings` sözleşmesi, üç setting payload'ı, bounded HTTP error fallback'i, server validation error feedback'i ve logger davranışı korundu.
- `tests/admin-slide-settings-submit.test.js` artık eski monolit `admin.js` fonksiyonunu çıkarmak yerine gerçek `public/admin/js/slides.js` modülünü çalıştırıyor.
- `public/admin/admin.js` **301 → 171 satıra** indi; `public/admin/js/slides.js` **627 → 742 satıra** çıktı. `admin.js` artık slide tarafında yalnız management-list state/bridge, module init ve settings bootstrap composition sorumluluğunu taşıyor.

TDD ve regresyon kanıtı:

1. B4.7 structural/behavior ve settings harness migration testleri production değişikliğinden önce yazıldı; ilk birleşik RED **26 pass / 18 fail** verdi ve kırılmalar settings/form-sync ownership'inin hâlâ shell'de olmasından kaynaklandı.
2. Minimal extraction sonrası module + atomic settings focused kapısı **48/48 pass** verdi.
3. Slide/settings/CRUD/reorder/cache/DOM-safety geniş komşu kapısı **217/217 pass** verdi.
4. Final tam core **1450/1450 pass** verdi.
5. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; syntax ve `git diff --check` temiz.
6. İzole temp SQLite + Chrome DevTools gerçek admin UI'da new form başlangıcı `text/video/manual = none/none/none`; rule + gerçek browser `video/mp4` File + manual geçiş sonrası `block/block/block` oldu.
7. Gerçek settings UI'da değerler `17 / random / 1.5` yapılıp save edildi; **PUT /api/slide-settings 200**. API readback `default_duration=17000`, `default_transition_mode=random`, `default_transition_duration=1500` verdi. Cache-bypass reload sonrası settings GET formu tekrar `17 / random / 1.5` ile doldurdu.
8. Chrome DevTools final reload console error/warn **0**, horizontal overflow **0**; `AdminSlides` namespace'i settings + CRUD + form + render/reorder/toggle API'lerini birlikte taşıyor.
9. Playwright MCP B4.7 final koda karşı `/admin/` auth redirect PASS verdi; takip snapshot'ında bilinen tool-side `about:blank` davranışı tekrarlandı.
10. Product/test commit `d9376fee556470124ff0c1f4ab13e8cd58f959ee` exact SHA'sında GitHub Actions `31321996082`: Node 22 **PASS (29 sn)**, Node 24 **PASS (29 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı B4.7 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

**P3-5B ve P3-5C tamamlandı ve doğrulandı.** B1 Students, B2 Roles, B3 Attendance, B4 Slides B4.1–B4.7 ve C1–C5 admin inline CSS dalgaları artık 🟩 durumundadır. **P3-5D0 kiosk CSS analiz/baseline hazırlığı da 🟩 tamamlandı; gerçek P3-5D cleanup fiziksel 55" 4K kabul kapısı nedeniyle beklemededir.**

## 8. P3-5C — Admin inline CSS temizliği

**Durum:** 🟩 9 Ağustos 2026 — tamamlandı ve doğrulandı. C1 `index.html`, C2 Students, C3 Slides, C4 Attendance ve C5 `admin.js` shell template static inline CSS extraction kapatıldı.

Amaç görsel redesign değildir. Amaç mevcut görünümü class tabanlı hale getirmektir.

Sıra:

1. `public/admin/index.html` içindeki statik inline stilleri domain bazında CSS class'larına taşı — 🟩 **C1 tamamlandı**.
2. JS template string içindeki statik inline stilleri domain bazında küçük dalgalarla taşı — 🟩 **C2 Students**, 🟩 **C3 Slides**, 🟩 **C4 Attendance**, 🟩 **C5 admin shell tamamlandı**.
3. Runtime'a bağlı `display`, progress width, media preview state, hover state gibi dinamik stilleri ilk turda koru.
4. Daha sonra yalnız davranış testi ve browser kanıtı varsa state class modeline geçir.

### C1 — `index.html` static inline CSS uygulama sonucu

Admin HTML içindeki statik presentation ownership'i DOM/behavior sözleşmeleri değiştirilmeden `public/admin/style.css` içine taşındı. Bu dalga redesign değildir; mevcut computed-style değerleri korunmuştur.

- `public/admin/index.html` içindeki **195** `style="..."` attribute'u semantic/domain CSS class'larına taşındı; final inline-style sayısı **0**.
- Page-local `<style>` bloğu kaldırıldı; body font smoothing/text-rendering/font-feature ayarları `public/admin/style.css` içine taşındı.
- Students, Roles, Attendance, Slides, Error Logs, QR/photo modal ve slide form yüzeyleri admin-prefixed semantic class'larla temsil ediliyor.
- Runtime hook ID'leri ve classic-script callback sözleşmeleri korunuyor; `slideFormModal`, `slideUploadProgress`, `slideProgressBar`, `slideTextContentDiv`, `slideVideoSettings`, `slideTransitionManualDiv` gibi state yüzeyleri aynı ID'lerle yaşamaya devam ediyor.
- İlk `display:none` / progress `width:0%` presentation state'i CSS'e taşındı; JavaScript'in runtime `element.style.*` yazımları bu dalgada değiştirilmedi.
- C1 sonrası `public/admin/index.html` **837 → 763 satır**, `public/admin/style.css` **389 → 1290 satır** oldu. Stylesheet büyümesi yeni görsel tasarımdan değil, HTML'deki 195 statik declaration'ın açık class kurallarına taşınmasından kaynaklanıyor.
- JS/template tarafındaki kalan inline-style envanteri bilerek sonraki dalgalara bırakıldı: `students.js` **46**, `slides.js` **35**, `attendance.js` **7**, `admin.js` **8**; toplam **96**.

TDD ve regresyon kanıtı:

1. Production değişikliğinden önce `tests/admin-inline-style-refactor.test.js` yazıldı. İlk RED'de iki C1 sözleşmesi de doğru nedenle kırıldı: HTML'de **195 inline style** vardı ve runtime başlangıç-state CSS kuralları henüz stylesheet'te değildi (**0 pass / 2 fail**).
2. İlk extraction sonrası focused paket **2/2 pass** ve `git diff --check` temizdi; `index.html` inline-style sayısı **0** oldu.
3. 1366×768 Chrome DevTools computed-style karşılaştırması tek gerçek cascade regresyonu buldu: slide modal shell baseline'da **30px** padding iken generic `.qr-content` source-order nedeniyle **40px** kazanıyordu.
4. Bu browser bulgusu için ayrı RED regresyonu eklendi; focused sonuç **2 pass / 1 fail** oldu. Selector `.qr-content.slide-form-shell` yapılarak baseline 30px specificity açıkça korundu; final focused paket **3/3 pass** verdi.
5. Geniş admin/domain/notification/error-log/DOM-safety regresyon kapısı **88/88 pass** verdi.
6. Yeni C1 testi `package.json` içindeki `test:core` zincirine dahil edildi; tam core **1453/1453 pass** verdi.
7. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; `package.json` parse ve `git diff --check` temiz.
8. Chrome DevTools 1366×768 final computed-style setinde students hero/stats, role select, attendance date, slide settings, modal shell, basic/media/text/video/transition state yüzeyleri pre-change baseline ile eşleşti; horizontal overflow **0**.
9. Chrome'da 1920×1080 istenen window inner viewport **1920×863** oldu; horizontal overflow yine **0**. Students/Görevler/Yoklama/Slaytlar ve Sistem/Error Logs tab yüzeyleri açıldı.
10. Gerçek authenticated slide feedback smoke C1 sonrası create → edit → delete akışını doğruladı: `POST /api/slides` **200**, `PUT /api/slides/8` **200**, `DELETE /api/slides/8` **200**; UI sırasıyla `Slayt başarıyla eklendi!`, `Slayt başarıyla güncellendi!`, `Slayt başarıyla silindi!` gösterdi ve final management readback kaydı kaldırılmış buldu.
11. Chrome network'te `/admin/style.css`, admin scripts ve ilgili management API'leri **200/304**; final console error/warn **0**.
12. Playwright MCP korumalı `/admin/` erişimini `admin-login.html?next=/admin/` yüzeyine yönlendirerek auth boundary'yi doğruladı; takip snapshot'ında bilinen tool-side `about:blank` davranışı tekrarlandı, authenticated visual/network kanıtı Chrome DevTools ile tamamlandı.
13. Product/test commit `61d10237688647698c01c9bbd735216d4cdf7bda` exact SHA'sında GitHub Actions `31323081934`: Node 22 **PASS (30 sn)**, Node 24 **PASS (29 sn)**.

Bilinen fresh-DB `error_logs` startup cleanup-order bug'ı C1 sırasında değiştirilmedi. Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### C2 — `students.js` template static CSS uygulama sonucu

Students domainindeki statik template presentation `public/admin/style.css` içine taşındı; öğrenci işlevleri, güvenlik kaçışları ve runtime state yazımları korunarak görsel redesign yapılmadı.

- `public/admin/js/students.js` içindeki template `style="..."` attribute sayısı **46 → 0** oldu.
- Empty-state, erkek/kız öğrenci kartları, avatar alanı, action button'ları, Excel seçili-dosya/preview/result yüzeyleri ve fotoğraf preview alt öğeleri `admin-student-*`, `admin-excel-*` ve `admin-photo-preview-*` class'larına taşındı.
- Erkek/kız renkleri artık açık modifier class'larla korunuyor: `admin-student-card--male` / `admin-student-card--female`; browser computed-style baseline'ı erkek `#2196F3`, kız `#E91E63` ve iki alpha-gradient seviyesinde aynı kaldı.
- Kart `onmouseover/onmouseout` transform/shadow/border davranışı ve action button opacity yazımları bilinçli olarak runtime-owned bırakıldı.
- Runtime-created `photoPreviewContainer` için mevcut tek `container.style.cssText` yazımı ayrı state-class dalgasına bırakıldı ve regresyon testiyle korunuyor.
- C2 sonrası `public/admin/js/students.js` **609 → 604 satır**, `public/admin/style.css` **1290 → 1583 satır** oldu. Stylesheet artışı yeni tasarımdan değil, students template içindeki statik declaration'ların class kurallarına taşınmasından kaynaklanıyor.
- Admin template `style="..."` envanteri C2 sonunda **50** attribute'a indi: `students.js` **0**, `slides.js` **35**, `attendance.js` **7**, `admin.js` **8**.

TDD ve regresyon kanıtı:

1. Production değişikliğinden önce `tests/admin-student-style-refactor.test.js` yazıldı ve Excel DOM-safety expectation'ı yeni class sözleşmesine çevrildi. İlk RED'de C2 structural paketin iki yeni ownership testi doğru nedenle fail verdi; runtime `style.cssText` sınır testi pass kaldı. Excel DOM-safety içindeki yeni class expectation'ı da eski markup yüzünden beklenen şekilde fail verdi.
2. Minimal extraction sonrası Student/C2/Excel/XSS focused grup **18/18 pass** verdi.
3. Admin error logs + notifications + C1 + Student/Excel/XSS geniş frontend komşu grubu **38/38 pass** verdi.
4. Yeni C2 testi `package.json` içindeki `test:core` zincirine eklendi; final tam core iki ayrı fresh koşuda **1456/1456 pass**, **0 fail** verdi.
5. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; `node --check public/admin/js/students.js` ve `git diff --check` temiz.
6. Chrome DevTools pre-change baseline'da empty-state, erkek/kız kartları, avatar, button, Excel preview table/cell ve photo preview computed-style değerleri kaydedildi. Post-change 1366×768 ölçümleri bu değerlerle eşleşti; horizontal overflow **0**.
7. Kart hover davranışı post-change tekrar ölçüldü: `translateY(-4px)`, `0 4px 16px rgba(0,0,0,0.15)`, primary border ve action opacity `0.9`; mouseout sonrası baseline state'e geri döndü.
8. Gerçek browser XLSX üretimi + `DataTransfer` ile Excel preview çalıştırıldı; wrapper/header/clear button/table/header-cell/body-cell computed-style değerleri baseline ile eşleşti ve preview subtree içinde inline style **0** kaldı.
9. Gerçek browser File + `DataTransfer` ile photo preview çalıştırıldı; child template inline style **0**, korunmuş runtime container `style.cssText` ve tüm image/meta computed-style değerleri baseline ile aynı kaldı.
10. Gerçek authenticated student CRUD smoke form üzerinden create → list render → event-delegated delete akışını doğruladı: UI `Öğrenci başarıyla eklendi!` ve `Öğrenci başarıyla silindi!` feedback'lerini verdi; final listede geçici kayıt kalmadı.
11. Search + gender filter browser smoke: `Kız` araması yalnız kız öğrenciyi, `M` yalnız erkek öğrenciyi, `F` yalnız kız öğrenciyi gösterdi; reset sonrası iki kart geri geldi ve student-list subtree inline style **0** kaldı.
12. Chrome 1920×1080 istenen window inner viewport **1920×863** oldu; Students/Roles/Attendance/Slides/Error Logs tab smoke PASS ve horizontal overflow **0**. Küçük window kontrolünde inner viewport **500×844**, iki kart tek kolonda ve overflow **0** kaldı.
13. Chrome final authenticated reload console warning/error **0**; `/admin/style.css`, `students.js`, diğer admin scripts ve API'ler **200/304**. Default avatarların ikisi de `naturalWidth/naturalHeight = 1024×1024` ile gerçekten yüklendi.
14. Playwright MCP `/admin/` auth redirect'i post-change tekrar PASS verdi. Login sayfasında C2 öncesi baseline'da da bulunan `/favicon.ico` **404** tek console error olarak kaldı; authenticated admin Chrome yüzeyinde bu hata yok ve C2 ile ilişkili değildir.
15. Product/test commit `cc742990210b8db14d01985a0b87a4cc53e88a07` exact SHA'sında GitHub Actions `31323998676`: Node 22 **PASS (26 sn)**, Node 24 **PASS (30 sn)**.

Fresh-DB `error_logs` startup cleanup-order bug'ı C2 sırasında henüz açıktı; **bu tarihsel durum C3 sırasında aşağıdaki ayrı bugfix dalgasıyla kapatılmıştır.** Korunan untracked devir belgeleri ve `docs/superpowers/` commit kapsamına alınmadı. P2-6 gerçek 55" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### C3 sırasında tespit edilen runtime hataları — ayrı bugfix sonucu

C3 hazırlığı ve gerçek browser kontrolleri sırasında üç gerçek runtime kusur tespit edildi; kullanıcı talebi gereği refactor kapsamının dışında bırakılmadan ayrı TDD döngüsüyle düzeltildi:

1. **Admin slide list stored-XSS:** `title`, `text_content`, bilinmeyen `content_type` fallback'i ve manuel `transition_type` doğrudan `innerHTML` içine yazılıyordu. `tests/admin-slide-dom-safety.test.js` ilk RED'de gerçek `<img onerror=...>` markup'ını üretti. `renderSlides()` artık bu metinsel alanları `Utils.escapeHtml()` ile kaçırıyor. Gerçek temp-DB malicious kayıt Chrome'da metin olarak render edildi; enjekte edilmiş element **0**, `globalThis.__slideXss = 0`.
2. **Fresh DB `error_logs` cleanup-order:** startup `cleanupOldLogs()` çağrısı tablo kurulmadan DELETE kuyruğa alıyordu. `db.errorLogsReadyPromise` eklendi; `CREATE TABLE IF NOT EXISTS error_logs` callback'i readiness'i çözüyor ve server startup cleanup yalnız bu promise sonrasında çalışıyor. Brand-new SQLite server yeniden başlatmasında artık `no such table: error_logs` yok.
3. **Admin login favicon 404:** `admin-login.html` favicon ilan etmediği için browser `/favicon.ico` istiyordu. Mevcut `/assets/favicon.png` açık `<link rel="icon">` ile bağlandı; Chrome ve Playwright login yüzeyinde final warning/error **0**.

Bugfix doğrulaması:

- slide XSS regression **1/1**, slide module **40/40**, startup-order **2/2** ve ilgili auth/backend extraction testleri PASS,
- full core **1460/1460 pass**, system smoke PASS, `npm audit --omit=dev` **0 vulnerability**, syntax/diff temiz,
- fresh DB startup console'u temiz; Chrome + Playwright login warning/error **0**,
- bugfix commit `5a31414ad08ea48e79b860fad5753e02819209d3`, GitHub Actions `31324588354`: Node 22 **PASS (26 sn)**, Node 24 **PASS (30 sn)**.

### C3 — `slides.js` template static CSS uygulama sonucu

Slides domainindeki statik template presentation C3 ile class tabanlı hale getirildi; gerçek runtime state yazımları ve B4 davranış sözleşmeleri korunarak redesign yapılmadı.

- `public/admin/js/slides.js` template `style="..."` attribute sayısı **35 → 0** oldu.
- Empty state, active/passive slide card, drag handle, media/no-media preview, metadata, text, action button'ları ve edit/new media preview child markup'ı `admin-slide-*` class'larına taşındı.
- Active/passive durum ve toggle button renkleri açık modifier class'larla temsil ediliyor; mevcut `.slide-item.is-inactive` opacity/filter/dashed-border davranışı korunuyor.
- C3 sonrası `slides.js` **749 satır**, `style.css` **1740 satır**. `slides.js` içindeki **21 adet** gerçek runtime `.style.*` state yazımı (drag opacity, modal/display, form visibility, upload progress display/width) bilinçli olarak yerinde kaldı.
- Admin template inline-style envanteri artık **15** attribute: `index.html` **0**, `students.js` **0**, `slides.js` **0**, `attendance.js` **7**, `admin.js` **8**.

TDD ve browser doğrulaması:

1. `tests/admin-slide-style-refactor.test.js` production değişikliğinden önce RED verdi: **35 inline style** ve eksik active/passive modifier class'ları yakalandı; runtime-state koruma testi baştan PASS kaldı.
2. Minimal extraction sonrası C3 style **3/3**, slide module **40/40**, stored-XSS **1/1**, C1 CSS **3/3**; geniş slide/settings/notification/DOM-safety komşu grubu **45/45 pass**.
3. `test:core` zincirine C3 testi eklendi; final full core **1463/1463 pass**, **0 fail**.
4. `npm run test:system-smoke` PASS ve fresh-DB startup artık cleanup-order error üretmiyor; `npm audit --omit=dev` **0 vulnerability**; syntax, package parse ve `git diff --check` temiz.
5. Chrome pre/post computed-style karşılaştırmasında active/passive card, drag handle, media/no-media yüzeyi, metadata, status, text ve edit/activate/deactivate/delete button değerleri birebir aynı kaldı; slide-card subtree inline style **0**.
6. Existing ve yeni File/DataTransfer media preview'larında max-size/radius/shadow/caption/current-link baseline değerleri aynı kaldı ve preview subtree inline style **0**.
7. Gerçek browser CRUD: POST/PUT/DELETE **200**; UI MutationObserver ile sırasıyla `Slayt başarıyla eklendi!`, `Slayt başarıyla güncellendi!`, `Slayt başarıyla silindi!` görüldü. Geçici uploaded file delete sonrası filesystem'den de kaldırıldı.
8. Active toggle active→passive→active ve reorder `20/21 → 21/20 → 20/21` gerçek API **200** ile doğrulandı. Drag handler inline opacity `0.5`/`1` yazıyor; mevcut 0.2 sn transition sonrası computed değerler doğru settle oluyor.
9. Chrome 1366×768 ve 1920-wide kontrollerinde horizontal overflow **0**; empty-state class presentation baseline ile aynı. Final authenticated console warning/error **0**, ilgili static/API network istekleri **200/304**.
10. Playwright final `/admin/` auth redirect PASS ve login console warning/error **0**.
11. Product/test commit `31fd5cf00d823bdf7d125ad60a9e8165ab6cc01f`, GitHub Actions `31324982438`: Node 22 **PASS (24 sn)**, Node 24 **PASS (28 sn)**.

### C4 sırasında tespit edilen admin form erişilebilirlik kusurları — ayrı bugfix sonucu

C4 gerçek browser doğrulaması sırasında Chrome DevTools production issue taraması **19 adet “No label associated with a form field”** ve **1 adet autocomplete eksikliği** raporladı. Yeni bağlayıcı “tesadüfen bulunan gerçek hatayı anında düzelt” kuralı gereği C4 geçici olarak durduruldu ve sorun ayrı TDD bugfix dalgasıyla kapatıldı.

- Kök neden, admin HTML'deki 19 görünür `<label>` öğesinin görsel olarak kontrol yanında bulunmasına rağmen `for/id` ile programatik bağının olmamasıydı. Bu 19 çift Students, Attendance, Slide Settings, Error Logs filtreleri ve Slide modal form alanlarına dağılıyordu.
- Add Student içindeki ad/cinsiyet/fotoğraf kontrollerine stabil `id` eklendi; mevcut diğer kontrollerin ID'leri korundu. Tüm 19 label gerçek kontrolüne `for` ile bağlandı.
- Öğrenci adı input'u `autocomplete="name"` aldı. Görsel class/layout ve form submit davranışı değiştirilmedi.
- `tests/admin-form-accessibility.test.js` ilk RED'de **0/2 pass** verdi; label/control ilişkileri ve autocomplete eksikliği doğru nedenle yakalandı. Düzeltme sonrası focused **2/2**, ilgili Student/Role/Attendance/Slide/Error Logs/DOM-safety komşu grubu **82/82 pass** verdi.
- Bugfix testi `test:core` zincirine eklendi; bugfix + devam eden C4 çalışma ağacıyla local full core **1465/1465 pass**, system smoke PASS ve `npm audit --omit=dev` **0 vulnerability** verdi.
- Chrome cache-bypass reload sonrası production issue taraması **0 error / 0 warning / 0 issue** oldu. Playwright `/admin/` auth redirect PASS ve warning/error **0** verdi; takipteki `about:blank` davranışı yalnız MCP/tool-side olarak ayrıştırıldı.
- Ayrı bugfix commit `8be0c1114c15e7adabab2ad6fd85af0e4c56f2fa`, GitHub Actions `31325940938`: Node 22 **PASS (1 dk 5 sn)**, Node 24 **PASS (28 sn)**.

### C4 — `attendance.js` template static CSS uygulama sonucu

Attendance domainindeki statik template presentation C4 ile class tabanlı hale getirildi; yoklama veri akışı, isim escape'i, radio sözleşmesi ve bulk save davranışı korunarak redesign yapılmadı.

- `public/admin/js/attendance.js` template `style="..."` attribute sayısı **7 → 0** oldu.
- Student row, avatar, name flex alanı, present/absent radio label'ları ve summary present/absent renkleri `admin-attendance-*` class'larına taşındı.
- Mevcut generic `.student-item` ve `.student-thumb` hook/class'ları korunarak attendance'a özel class'lar yanına eklendi; böylece global student CSS davranışı ve avatar border/object-fit sözleşmesi değişmedi.
- `attendance.js` içinde runtime `.style.*` yazımı zaten yoktu; C4 yalnız statik presentation ownership'ini taşıdı.
- C4 sonunda `public/admin/js/attendance.js` **161 satır**, `public/admin/style.css` **1776 satır**. Admin template inline-style envanteri **8** attribute'a indi: `index.html` **0**, `students.js` **0**, `slides.js` **0**, `attendance.js` **0**, `admin.js` **8**.

TDD ve browser doğrulaması:

1. `tests/admin-attendance-style-refactor.test.js` production değişikliğinden önce **0/3 pass** RED verdi: 7 inline style, eksik attendance class ownership'i ve eksik behavior-hook eşlemesi doğru nedenle yakalandı.
2. Minimal extraction sonrası C4 + B3 Attendance + student-name DOM-safety focused grup **11/11 pass**; final C4 focused **3/3**.
3. Accessibility fix dahil admin/C1–C4/notification/error-log/DOM-safety komşu grubu **39/39 pass** verdi.
4. C4 testi `test:core` zincirine eklendi; final full core **1468/1468 pass**, **0 fail**. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; syntax/package parse/diff-check temiz.
5. Chrome 1366×768 pre/post computed-style karşılaştırmasında attendance card, 50×50 avatar, name flex, radio label'ları ve green/red summary renkleri birebir aynı kaldı; attendance subtree inline style **0**, horizontal overflow **0**.
6. Gerçek browser save smoke'ta iki öğrencinin present/absent state'i değiştirildi; UI `Yoklama başarıyla kaydedildi!` gösterdi ve `/api/attendance/2026-08-09` readback seçilen durumları doğruladı.
7. Students/Görevler/Yoklama/Slaytlar tab smoke 1366×768'de PASS; 1920×1080 istenen window inner viewport **1920×863** oldu, Sistem/Error Logs görünür ve horizontal overflow **0** kaldı.
8. Chrome final warning/error/issue **0**; ilgili students/roles/slides/attendance/logs network çağrıları **200/304**. Playwright `/admin/` auth redirect PASS ve warning/error **0**.
9. Product/test commit `e3f189256d81d8b1c09c2613b7cb470436754e46`, GitHub Actions `31326122652`: Node 22 **PASS (27 sn)**, Node 24 **PASS (34 sn)**.

### C4 evidence CI sırasında tespit edilen SQLite test-harness yarışları — ayrı bugfix sonucu

C4 evidence commit'i `883ae6fb536f31fd89f96ea8a13dc668c2edde5c` sonrası GitHub Actions `31326254441` Node 24'te PASS olurken Node 22'de role/SQLite integration testlerinde timeout verdi. Yeni bağlayıcı incidental-bug kuralı gereği C5'e geçilmedi; CI kırılması kök nedene kadar incelendi.

- Node 22 fail'i ürün role davranışından değil iki test-harness kusurundan kaynaklanıyordu: gerçek SQLite handler'lar için **100 ms / 500 ms** sabit watchdog kullanılması ve bazı server/database tabanlı testlerin schema/migration readiness tamamlanmadan route çalıştırıp DB teardown'a geçmesi.
- Local Node sürümü de **v22.23.1** idi; role testleri tek başına hızlı PASS verirken full-suite paralel yükte watchdog false-negative üretebiliyordu. `role-create` + `role-limit-atomicity` Node 22'de **12 ardışık tur × 93/93 PASS** stress ile doğrulandı.
- `tests/helpers/database-test-utils.js` içindeki ortak `awaitDatabaseReady(db)` helper'ı schedule migration + error-log schema readiness sinyallerini birlikte bekliyor. Admin rate-limit, logs, roles, slides cache ve student photo/import/read integration testleri bu readiness kapısına alındı.
- Role helper self-regression no-response kontrolleri **50 ms** kısa watchdog ile korunurken gerçek handler çağrıları **5000 ms** test-harness watchdog'a ayrıldı; bu bir ürün performans SLA'sı değildir, full-suite scheduler yükünü ürün hatası saymamak içindir.
- `tests/sqlite-test-harness-stability.test.js` önce **0/2 RED**, final **2/2 PASS** verdi ve `test:core` zincirine eklendi.
- Daha önce tek başına PASS olsa bile `SQLITE_MISUSE` üreten testler yeniden çalıştırıldığında lifecycle/lock error **0** oldu. Final full core **1470/1470 PASS** ve ayrıca log taramasında `SQLITE_MISUSE`, `SQLITE_BUSY`, premature schema callback hatası **NONE** verdi.
- System smoke PASS, `npm audit --omit=dev` **0 vulnerability**, package parse/diff-check temiz.
- Ayrı test-harness bugfix commit `23bccf8a8955900e3348b7e9b45b64b4d705ed67`, GitHub Actions `31326738654`: Node 22 **PASS (30 sn)**, Node 24 **PASS (30 sn)**.

### C5 sırasında tespit edilen QR fallback URL kusuru — ayrı bugfix sonucu

C5 pre-change browser baseline'ı alınırken `/api/network-info` isteği zorla fail ettirildi. Fallback QR içeriğinin public kiosk yerine mevcut admin URL'sini (`/admin/`) gösterdiği doğrulandı. Yeni bağlayıcı incidental-bug kuralı gereği style extraction durduruldu ve hata ayrı TDD dalgasıyla kapatıldı.

- Kök neden legacy `window.location.href.replace('/admin/index.html', '/index.html')` varsayımıydı; modern korumalı admin route'u `/admin/` olduğu için replace eşleşmiyordu.
- `tests/admin-qr-fallback.test.js` ilk RED'de **0/2 pass** verdi: forced network failure `/admin/` adresini üretiyor ve source hâlâ legacy path replacement kullanıyordu.
- Fallback URL artık `new URL('/index.html', window.location.origin).href` ile origin tabanlı üretiliyor.
- Cache-bypass reload sonrası Chrome forced-failure smoke `http://127.0.0.1:49375/index.html` gösterdi ve beklenen public kiosk URL'siyle birebir eşleşti.
- Focused **2/2**, full core **1472/1472**, system smoke PASS, `npm audit --omit=dev` **0 vulnerability**, syntax/package/diff temiz.
- Ayrı bugfix commit `74b0e81f009b987a1acd44acb45b4e52b3951ef9`, GitHub Actions `31327035378`: Node 22 **PASS (28 sn)**, Node 24 **PASS (28 sn)**.

### C5 — `admin.js` shell template static CSS uygulama sonucu

Admin composition shell içinde kalan son statik presentation yalnız QR / “Ana Ekran Adresi” success ve fallback template'lerindeydi. C5 bu iki kopyayı aynı semantic class sözleşmesine taşıdı; modal runtime state ownership'i ve C5 sırasında düzeltilen fallback davranışı korundu.

- `public/admin/admin.js` template `style="..."` attribute sayısı **8 → 0** oldu.
- Success ve fallback template'lerinin ikisi de `admin-qr-address`, `admin-qr-address__title`, `admin-qr-address__value`, `admin-qr-address__note` class'larını kullanıyor.
- Runtime `qrModal.style.display = 'flex'/'none'` yazımları bilinçli olarak JavaScript'te kaldı; C5 style-only sınırını aşmadı.
- `admin.js` **171 satır**, `style.css` **1804 satır** oldu.
- C5 sonunda admin statik inline-style envanteri tamamıyla sıfırlandı: `index.html` **0**, `admin.js` **0**, `students.js` **0**, `attendance.js` **0**, `slides.js` **0**.
- Behavior-owned runtime state yazımları statik inline-CSS borcu sayılmıyor: `admin.js` QR modal display; Students hover/photo-preview state; Slides drag/modal/form visibility/upload progress gibi state değişimleri planın 3. maddesi gereği yerinde tutuldu.

TDD ve browser doğrulaması:

1. `tests/admin-shell-style-refactor.test.js` production değişikliğinden önce **1 pass / 2 fail** RED verdi: runtime-state koruma baştan PASS; 8 inline style ve eksik class/CSS ownership beklenen şekilde fail verdi.
2. Minimal extraction sonrası C5 + QR fallback focused paket **5/5 pass**; C5 focused **3/3**.
3. C1–C5 + accessibility/QR/notification/error-log/DOM-safety komşu grup **43/43 pass** verdi.
4. C5 testi `test:core` zincirine eklendi; final full core **1475/1475 pass**, **0 fail** ve SQLite lifecycle/lock log taraması **NONE**. System smoke PASS, audit **0**, syntax/package/diff temiz.
5. Chrome 1366×768 success-path pre/post computed-style karşılaştırmasında QR root/title/value/note değerleri birebir aynı kaldı; subtree inline style **0**, overflow **0**.
6. Forced-failure fallback de aynı computed-style değerlerini ve public `/index.html` URL'sini verdi; subtree inline style **0**.
7. Chrome 1920×1080 istenen window inner viewport **1920×863**; Students/Görevler/Yoklama/Slaytlar + Sistem/Error Logs smoke PASS, overflow **0**, final warning/error/issue **0**, ilgili API network istekleri **200/304**.
8. Playwright `/admin/` auth redirect PASS ve warning/error **0**.
9. Product/test commit `5e983d759ab356d7ff1aa0b7ffb610104ab6a10e`, GitHub Actions `31327284550`: Node 22 **PASS (27 sn)**, Node 24 **PASS (30 sn)**.

**P3-5C tamamlandı ve doğrulandı.** Statik admin inline-CSS temizliği C1–C5 ile kapandı. Runtime state yazımları yalnız davranış testi + browser kanıtı gerektiren ayrı bir ürün davranışı kararı olmadan class'a çevrilmeyecektir. **P3-5D0 analiz/baseline hazırlığı tamamlandı; gerçek P3-5D kiosk CSS cleanup P2-6 gerçek 55" 4K fiziksel kabul kapısı nedeniyle bloke/beklemededir.**

## 8.1 P3-5E — Admin inline event handler temizliği

**Durum:** 🟨 9 Ağustos 2026 — uygulanıyor. E1 shell/navigation/QR/logout handler temizliği tamamlandı ve doğrulandı; sıradaki kontrollü dalga **E2 Students**.

Bu faz P3-5B sırasında geçici uyumluluk için korunan inline HTML/template event handler'larını domain bazında kaldırır. Amaç framework değişimi veya behavior redesign değildir; mevcut classic-script davranışı açık `addEventListener` / event-delegation ownership'ine taşınacaktır.

E fazı başlangıç envanteri:

- `public/admin/index.html`: **27** inline event attribute,
- `public/admin/js/students.js`: **9**,
- `public/admin/js/slides.js`: **4**,
- `public/admin/js/attendance.js`: **1**,
- toplam: **41**.

İlk E1 raporunda kullanılan olay-adı listesi `onerror` attribute'unu kapsamıyordu ve toplamı **38** olarak eksik saymıştı. E2 hazırlığında geniş `\son[a-zA-Z]+=` taraması bu metodoloji açığını görünür hale getirdi; yaşayan envanter **41** olarak düzeltildi. E1'in gerçek kapsamı/değişikliği değişmez: kaldırılan sekiz shell handler aynı sekiz kontroldür.

Dalga sırası küçük tutulacaktır:

1. **E1 shell/navigation/QR/logout — 🟩 tamamlandı**,
2. **E2 Students — sıradaki**,
3. Roles + Attendance,
4. Slides,
5. Error Logs ve kalan modal/domain handler'ları.

Runtime hover/state davranışları yalnız mevcut computed-style/interaction sözleşmesi test + browser kanıtıyla korunabiliyorsa inline handler dışına taşınacaktır; E fazı runtime `.style.*` state ownership'ini otomatik olarak CSS refactor kapsamına almaz.

### E1 — shell/navigation/QR/logout uygulama sonucu

E1 yalnız sekiz düşük-risk shell handler'ını taşıdı:

- Sistem → `data-admin-tab="error-logs"`,
- dört ana tab → `data-admin-tab="students|roles|attendance|slides"`,
- Mobil Bağlan → `#mobileConnectButton`,
- Çıkış Yap → `#logoutButton`,
- QR Kapat → `#qrCloseButton`.

`showTab()` artık `onclick` source-text parse etmiyor; primary tab active state'i `dataset.adminTab` üzerinden bulunuyor. Tüm tab/system kontrolleri ortak `[data-admin-tab]` click binding'i kullanıyor. `logoutAdmin()` trailing inline `<script>` bloğundan `public/admin/admin.js` shell ownership'ine taşındı. CSRF fetch wrapper güvenlik sınırı E1 kapsamına alınmadı ve değiştirilmedi.

E1 sonrası inline event envanteri:

- shell hedef grubu: **8 → 0**,
- `public/admin/index.html`: **27 → 19**,
- `students.js`: **9**,
- `slides.js`: **4**,
- `attendance.js`: **1**,
- toplam: **41 → 33**.

TDD / regresyon / browser kanıtı:

1. `tests/admin-shell-event-handler-refactor.test.js` production değişikliğinden önce **0/3 PASS** RED verdi; data hook'ları yoktu, `admin.js` `onclick` parse ediyordu ve logout hâlâ HTML inline script'indeydi.
2. Minimal E1 değişikliği sonrası focused E1 **3/3 PASS**; Error Logs source-shape harness'i yeni `data-admin-tab` sözleşmesine taşındı ve birleşik E1 + Error Logs **15/15 PASS** oldu.
3. İlk full-core koşusu **1478 PASS / 10 FAIL** verdi. Kök neden production regresyonu değil, üç eski test harness'inin yeni gerçek DOM sözleşmesini eksik modellemesiydi: `admin-settings-simplification` eski `onclick` markup'ını arıyordu; Excel DOM-safety ve Student Name DOM-safety sandbox'larında `document.querySelectorAll` yoktu. Beklentiler gevşetilmeden yeni DOM kontratına hizalandı; ilgili paketler final **32/32 PASS** verdi.
4. Fresh final full core **1488/1488 PASS**, SQLite lifecycle/lock taraması **NONE**.
5. `npm run test:system-smoke` PASS; `npm audit --omit=dev` **0 vulnerability**; syntax/package/diff temiz.
6. Chrome pre/post 1366×768 ve 1920-wide: horizontal overflow **0**; Students → Roles → Attendance → Slides → Sistem/Error Logs geçişleri aynı; Sistem active state ve error-log refresh aynı.
7. Chrome post-change sekiz E1 hook'unun tamamında `onclick === null`; QR aç/kapat aynı; logout `POST /api/admin/logout` **200** ve login sayfasına dönüş aynı; normal akış final console error/warn/issue **0**.
8. Chrome MCP Sistem post-check sırasında tek geçici upstream **502 tool-side** hata verdi; servis yeniden erişilebilir olduğunda aynı kontroller başarıyla tamamlandı ve production etkilenmedi.
9. Playwright pre/post `/admin/` auth redirect + `Yönetici Girişi` title PASS; post-change snapshot çağrısında bilinen tool-side `about:blank` davranışı tekrarlandı.
10. Product/test commit `46485e067c0e79c15d37f6add656f9ca9816c0d6`; GitHub Actions `31331183368`: Node 22 **PASS (24 sn)**, Node 24 **PASS (28 sn)**.

Her görsel dalgada en az:

- 1366×768 admin smoke,
- 1920×1080 admin smoke,
- console warning/error kontrolü,
- horizontal overflow kontrolü,
- öğrenciler/görevler/yoklama/slaytlar tab smoke,
- create/edit/delete feedback smoke

çalıştırılmalıdır.

## 9. P3-5D — Kiosk CSS küçültme ve dead-style temizliği

**Durum:** **D0 analiz/baseline hazırlığı 🟩 tamamlandı. Gerçek selector/declaration cleanup P2-6 fiziksel 55" 4K kabulüne bağlı; şu anda uygulanmayacak.**

P2-6 yeşil olmadan yapılabilecek hazırlık işleri D0 ile tamamlandı:

- selector envanteri — 🟩
- duplicate declaration raporu — 🟩
- hiç eşleşmeyen selector aday listesi — 🟩
- CSS source-order/override haritası — 🟩
- screenshot/browser baseline hazırlığı — 🟩

### D0 — Kiosk CSS analiz/baseline hazırlığı uygulama sonucu

D0 sırasında kiosk CSS dosyalarının hiçbir selector/declaration/source-order değeri değiştirilmedi. Tekrar üretilebilir dependency-free analiz aracı ve browser baseline evidence üretildi.

- yeni araç: `scripts/analyze-kiosk-css.js`
- yeni regression: `tests/kiosk-css-analysis.test.js`
- `npm run test:kiosk-css-analysis` ve `test:core` entegrasyonu
- ayrıntılı rapor: `Classroom Projesi/03 - Tasarım ve Kiosk/Classroom Projesi — P3-5D0 Kiosk CSS Analiz Raporu — 9 Ağustos 2026.md`

Gerçek envanter:

- `public/css/style.css`: **4740 satır / 565 rule / 681 selector / 2310 declaration**
- `public/css/kiosk-mode.css`: **19 / 3 / 4 / 6**
- `public/css/kiosk-magic-park.css`: **1433 / 145 / 219 / 868**
- toplam: **713 rule / 904 selector / 3184 declaration**
- duplicate selector: **198**
- same-selector property chain: **248**
- gerçek distinct-rule duplicate declaration block: **22**
- static-unused candidate occurrence: **40**, benzersiz selector: **32**

Analyzer TDD sırasında iki metodoloji hatası yakalanıp düzeltildi: trailing-newline satır sayımı yaşayan `wc -l` envanteriyle eşitlendi ve tek comma-separated selector rule'unun duplicate declaration sayısını yapay biçimde şişirmesi engellendi. Final focused paket **7/7 PASS**.

Chrome DevTools temp-DB kiosk baseline:

- 1366×768 → horizontal overflow **0**
- emüle 1920×1080 → **0**
- emüle 2560×1440 → **0**
- emüle 3840×2160 → **0**
- final console error/warn/issue **0**
- ilgili static/API network zinciri **200/304**
- 1366×768 ve 3840×2160 full-page screenshot evidence alındı.

Static-unused 32 benzersiz selector'ın class/id token'ları mevcut fallback kiosk DOM'unda canlı olarak tarandı; mevcut senaryoda **32/32 runtime eşleşmesi yoktu**. Bu yalnız aday kanıtıdır; farklı slide/state/legacy yolları ve fiziksel kullanım görülmeden selector silme onayı değildir.

Playwright `/` → `2/D Sihirli Pano`, default viewport overflow **0**, console error/warning **0**. `browser_resize`/screenshot sonrası bilinen tool-side `about:blank` davranışı yeniden görüldü; fresh navigate kiosk'u geri açtı ve Chrome'da tekrarlanmadı.

Tooling/test final kapıları:

- kiosk analysis **7/7**
- kiosk Magic Park/icon **12/12**
- titlebar resize **4/4**
- full core **1482/1482**
- SQLite lifecycle/lock taraması **NONE**
- system smoke **PASS**
- audit **0 vulnerability**
- syntax/package/diff temiz
- tooling commit `67b4c28c801bcf5bcd5003a1252ef53acd9bec31`
- GitHub Actions `31328518565`: Node 24 **PASS (24 sn)**, Node 22 **PASS (27 sn)**

D0 başı/sonu CSS SHA-256 değerleri birebir aynıdır:

```text
0ade192f13a1db201881117e45e627475cc588f70604cb6cd168d379141f9673  public/css/style.css
340d61733fcc8a9def7143179d93f681967162f9ea5b8fda1f080ac935c6047a  public/css/kiosk-mode.css
379f9dea5c54ca09569e8480bdbef2e1e7782191255a1990d44d090c6e23f9ba  public/css/kiosk-magic-park.css
```

**D0 tamamlanmıştır; bu evidence gerçek cleanup başlatma izni değildir.**

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
