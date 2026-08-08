# Classroom — 2/D Sihirli Pano

Classroom, sınıf içindeki büyük ekranda sürekli çalışan **2/D Sihirli Pano / Sihirli Öğrenme Parkı (Magic Park)** kiosk yüzeyi ile öğretmenin kullandığı güvenli yönetim panelinden oluşan yerel-first bir sınıf uygulamasıdır.

Bu README kurulum, çalıştırma ve günlük kullanım içindir. Değişen teknik ayrıntılarda **Git HEAD kaynak gerçekliktir**. Ayrıntılı proje tomografisi ve yaşayan iş kuyruğu için:

- `CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`
- `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`

## Güncel ürün yüzeyleri

### Kiosk — 2/D Sihirli Pano

Ana ekran tek bir 16:9 Magic Park sahnesi içinde sekiz bilgi bölgesi sunar:

1. Günün zamanı — gün, tarih, dijital saat ve hafta sonu/tatil bağlamı.
2. Sınıf mevcudu — toplam, kız/erkek dağılımı, yoklama durumu ve gelmeyen öğrenciler.
3. Ders akışı — ders/teneffüs durumu, countdown ve sıradaki dönem bağlamı.
4. Sınıfın ses dengesi — mikrofon, otomatik kalibrasyon, Sessiz/Dikkat/Gürültü durumları.
5. Sınıfımızdan — görsel/GIF/video slayt alanı.
6. Sınıf başkanı — başkan ve yardımcılar.
7. Nöbetçiler — günlük görevli öğrenciler.
8. Haftanın yıldızları — yıldız öğrenciler için mini slideshow.

Kiosk görsel sistemi `public/css/kiosk-magic-park.css` ve `public/js/kiosk-motion.js` üzerinde kuruludur. Fredoka/Nunito fontları, GSAP ve canvas-confetti çalışma zamanında yerel dosyalardan servis edilir.

### Yönetim paneli

Admin ana navigasyonu günlük öğretmen işlerine indirgenmiştir:

- **Öğrenciler** — ekleme, silme, fotoğraf güncelleme, arama/filtreleme ve Excel import.
- **Görevler** — başkan, yardımcı, nöbetçi ve yıldız atamaları.
- **Yoklama** — tarih bazlı present/absent kaydı.
- **Slaytlar** — öğretmen slaytlarının create/update/delete, aktif/pasif ve sıralama yönetimi.

Sistem/hata günlükları üst çubuktaki ayrı Sistem yüzeyinden erişilir.

Atatürk fallback slaytları öğretmen içeriği değildir. Bunlar **system-owned** kiosk güvenlik ağıdır; admin listesinde gösterilmez, doğrudan update/delete/reorder edilemez ve her startup'ta canonical olarak reconcile edilir.

## Teknoloji tabanı

Güncel desteklenen Node çalışma aralığı:

- **Node.js 22 / 24**
- `package.json` engine: `>=22 <25`

Ana runtime bağımlılıkları:

- Express **4.22.2**
- sqlite3 **6.0.1**
- Multer **2.2.0**
- SheetJS **0.20.3**
- GSAP **3.15.0**
- canvas-confetti **1.9.4**

SheetJS admin runtime'da paket içinden yerel olarak servis edilir; admin Excel işlevi dış CDN'e bağımlı değildir.

Frontend framework kullanmaz. Kiosk ve admin yüzeyi HTML/CSS/Vanilla JavaScript'tir. Backend tek Express uygulaması üzerinden SQLite, statik dosyalar ve `/api/*` endpointlerini sunar.

## Kurulum

Gereksinimler:

```text
Node.js >=22 <25
npm
```

Bağımlılıkları lockfile ile kurun:

```bash
npm ci
```

Geliştirme/yerel kullanımda admin parolası process environment üzerinden sağlanmalıdır:

```bash
export CLASSROOM_ADMIN_PASSWORD='güçlü-bir-parola'
npm start
```

Opsiyonel admin kullanıcı adı:

```bash
export CLASSROOM_ADMIN_USERNAME='admin'
```

`CLASSROOM_ADMIN_PASSWORD` tanımlı değilse uygulama **fail-closed** davranır: kiosk/public read yüzeyi çalışmaya devam eder, admin login ise 503 ile yapılandırılmamış olarak reddedilir.

Secret değerleri repo, Markdown belge veya commit edilen ortam dosyalarına yazılmamalıdır. `.env`, `.env.local` ve `.env.production` Git dışında bırakılmıştır.

Varsayılan uygulama adresi:

```text
http://localhost:3000
```

Kiosk:

```text
/
```

Admin login:

```text
/admin-login.html
```

Admin panel:

```text
/admin/
```

## Linux kiosk başlatma

Repo kökündeki:

```bash
./start.sh
```

scripti backend'i açıp uygun tarayıcı bulunduğunda Chromium/Chrome/Firefox kiosk modunu kullanır.

Gerçek 55" 4K TV kabulü ayrı donanım kalite kapısıdır. Browser tarafındaki 3840×2160, 2560×1440, 1920×1080 ve 1366×768 ön-kabul testleri yapılmış olsa da HDMI scaling, overscan, sınıf ışığı, fiziksel mikrofon ve cihaz reboot davranışı gerçek donanımda ayrıca kontrol edilmelidir.

## Veritabanı

Varsayılan SQLite dosyası:

```text
backend/classroom.db
```

Test ve bakım araçları mümkün olduğunda gerçek DB yerine `CLASSROOM_DB_PATH` ile temp DB kullanır.

Ana tablolar:

- `students`
- `roles`
- `settings`
- `attendance`
- `schedule`
- `slides`
- `slide_settings`
- `error_logs`

Schedule tarafı legacy satırları normalize eden migration katmanı ve kiosk için güvenli fallback programı kullanır. Tarih anahtarları backend ve admin tarafında **Europe/Istanbul** takvim gününe göre üretilir.

## Güvenlik modeli

Admin mutasyonları aşağıdaki katmanlarla korunur:

- kullanıcı adı + environment tabanlı parola,
- server-side in-memory session,
- HttpOnly session cookie,
- `SameSite=Strict`,
- 8 saat session TTL,
- session'a bağlı CSRF token,
- login failure rate limit,
- admin write rate limit,
- same-origin browser modeli,
- hata response redaction,
- managed upload path kontrolü,
- kritik SQLite işlemlerinde transaction/rollback.

Admin parolası yoksa hiçbir fallback parola veya commit edilmiş digest kullanılmaz.

## Slayt davranışı

Öğretmen slaytları:

- image/GIF/video içeriklerini destekler,
- aktif/pasif yapılabilir,
- admin listesinde pasif halde görünmeye devam eder,
- sıralanabilir,
- caption ve transition ayarları taşır.

Kiosk aktif slayt seçimi:

- aktif/geçerli öğretmen slaytı varsa yalnız öğretmen içeriği,
- aktif öğretmen içeriği yoksa yedi canonical Atatürk system fallback slaytı.

Fallback set her startup'ta `fallback_key` üzerinden idempotent UPSERT/reconciliation ile korunur.

## Ders programı

Kiosk iki katmanlı program modeli kullanır:

1. backend normalize schedule,
2. normalize kaynak kullanılamazsa kod içindeki güvenli fallback schedule.

Güncel admin ana yüzeyinde schedule editor bulunmaz. Backend normalize schedule API'si yaşamaya devam eder; kaldırılmış eski admin schedule prototipleri güncel ürün özelliği değildir.

## Testler

Ana kalite kapısı:

```bash
npm run test:core
```

Bu suite; schedule, auth/session/CSRF/rate-limit, öğrenci/fotoğraf/import, roller, yoklama, slayt transaction/cache, error redaction, Magic Park, kiosk runtime, native SQLite, Multer multipart runtime, dependency baseline ve bakım smoke davranışlarını kapsar.

İzole gerçek uygulama smoke:

```bash
npm run test:system-smoke
```

Bu komut temp SQLite DB, random test admin secret ve ephemeral port kullanır; gerçek `classroom.db` dosyasına dokunmaz.

Eski uyumluluk komutu:

```bash
npm run verify:code
```

artık doğrudan yaşayan `test:core` kalite kapısına delegasyon yapar.

Dependency güvenliği:

```bash
npm audit --omit=dev
```

Güncel doğrulanmış dependency baseline'ında üretim audit sonucu 0 bulgudur. Değişen audit durumu için her zaman komutu yeniden çalıştırın; bu README'deki tarihsel sonuç yerine araç çıktısını kaynak gerçeklik kabul edin.

## Önemli npm test komutları

```bash
npm run test:core
npm run test:system-smoke
npm run test:dependency-security-baseline
npm run test:sqlite-native-smoke
npm run test:multer-runtime-smoke
npm run test:kiosk-titlebar-resize
npm run verify:code
```

## Proje ağacı

```text
backend/                 Express, SQLite ve backend modülleri
public/                  kiosk + admin statik uygulaması
public/admin/            öğretmen yönetim paneli
public/js/               kiosk runtime modülleri
public/css/              kiosk stil katmanları
scripts/                 seed/bakım/smoke araçları
tests/                   Node test suite
docs/                    teknik özet, güvenlik ve yardımcı belgeler
Classroom Projesi/       yaşayan geliştirme/devir belgeleri
```

## Belge kaynak-of-truth zinciri

Belge çatışmasında şu sıra kullanılmalıdır:

1. **Git HEAD ve gerçek kod/test davranışı** — teknik gerçeklik.
2. **`Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`** — yaşayan açık işler, tamamlanan düzeltmeler ve güncel kanıtlar.
3. **`CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`** — 8 Ağustos 2026 kapsamlı mimari/tarihsel tarama.
4. **`AI_PROJECT_CONTEXT.md`** — yeni AI/geliştirme oturumu için kısa güncel devir özeti.
5. **`docs/PROJE_OZETI.md`** — insan okuyucu için güncel ürün ve teknik mimari özeti.
6. `Classroom Projesi/02 - Devir ve Oturum Notları/` ve eski belgeler — tarihsel kayıt; güncel kod gerçeğini override etmez.

Eski dokümanlarda yazan ama mevcut HEAD'de bulunmayan özellikler yeni geliştirme görevi olarak otomatik kabul edilmemelidir.

## Geliştirme disiplini

Bir düzeltme tamamlandı sayılmadan önce mümkün olduğunda:

1. sorun yeniden üretilir veya kırmızı test yazılır,
2. hedef test yeşil yapılır,
3. komşu regresyonlar çalıştırılır,
4. `npm run test:core` geçer,
5. anlamlıysa gerçek HTTP/browser/native/DB smoke yapılır,
6. `git diff --check` ve syntax kontrolleri geçer,
7. dependency değişiminde audit çalıştırılır,
8. commit/push sonrası GitHub Actions Node 22 ve Node 24 sonucu kontrol edilir,
9. yaşayan `.md` plan kanıtlarıyla güncellenir.

Bu repo için “test edilmeden tamamlandı” kabulü yapılmamalıdır.
