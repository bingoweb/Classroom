# Classroom — Güncel AI Proje Bağlamı

**Son bağlam yenilemesi:** 8 Ağustos 2026  
**Repo:** `/Users/bingoweb/Projeler/Classroom-ilk-surum`  
**GitHub:** `bingoweb/Classroom`  
**Aktif dal:** `main`

Bu dosya yeni bir AI/geliştirme oturumunun Classroom projesini yanlış tarihsel bağlamdan devam ettirmemesi için kısa, güncel devir belgesidir.

## 1. Kaynak gerçeklik kuralı

Değişen teknik ayrıntılarda **Git HEAD kaynak gerçekliktir**. Bu dosyadaki bir ifade kodla çelişirse HEAD ve güncel test davranışı esas alınır.

Açık işler ve tamamlanan düzeltmelerin yaşayan kaydı:

`Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`

Derin mimari/tarihsel tarama:

`CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`

İnsan okuyucu için güncel teknik özet:

`docs/PROJE_OZETI.md`

Eski devir belgeleri ve DOCX'ler tarihsel kayıttır; güncel görevi tek başına belirlemez.

## 2. Proje kimliği

Classroom iki ana yüzeyden oluşur:

1. **2/D Sihirli Pano / Sihirli Öğrenme Parkı (Magic Park)** kiosk ekranı.
2. Öğretmenin kullandığı auth/session/CSRF korumalı admin paneli.

Kiosk büyük 16:9 sınıf ekranında sekiz bilgi bölgesi gösterir:

- gün/tarih/saat,
- sınıf mevcudu ve yoklama özeti,
- ders/teneffüs akışı,
- sınıf ses dengesi,
- sınıf slideshow'u,
- sınıf başkanı/yardımcıları,
- nöbetçiler,
- haftanın yıldızları.

Admin ana işleri:

- Öğrenciler,
- Görevler,
- Yoklama,
- Slaytlar.

Sistem/hata günlükları ayrı admin yardımcı yüzeyidir.

## 3. Güncel teknik taban

Runtime:

- Node.js engine: `>=22 <25`
- Express 4.22.2
- sqlite3 6.0.1
- native SQLite 3.52.0 doğrulanmış baseline
- Multer 2.2.0
- SheetJS 0.20.3 yerel runtime
- GSAP 3.15.0 yerel runtime
- canvas-confetti 1.9.4 yerel runtime

Frontend:

- framework yok,
- HTML/CSS/Vanilla JS,
- modüller ağırlıkla `window.*` sözleşmeleriyle bağlanır.

Backend:

- Express,
- SQLite,
- public statik kiosk/admin dosyaları,
- `/api/*` endpointleri,
- ayrı auth/session/rate-limit/schedule/cache/date modülleri.

Güncel dependency security baseline'ında:

- `npm audit --omit=dev` → **0 vulnerability**.

Bu sayı ileride değişebilir; karar verirken audit komutunu yeniden çalıştır.

## 4. Güncel güvenlik sözleşmesi

Admin:

- username environment ile override edilebilir; varsayılan kullanıcı adı `admin`,
- parola yalnız `CLASSROOM_ADMIN_PASSWORD` üzerinden gelir,
- parola yapılandırılmamışsa login **fail-closed** ve 503,
- commit edilmiş fallback password/digest yok,
- server-side in-memory session,
- 8 saat TTL,
- HttpOnly cookie,
- `SameSite=Strict`,
- session tabanlı CSRF,
- login failure rate-limit,
- admin write rate-limit,
- protected mutasyon rotaları,
- hata response redaction.

Kiosk/public read yüzeyi admin parolası olmasa bile çalışır.

## 5. Tarih ve program sözleşmesi

Backend ve admin “bugün” kavramında **Europe/Istanbul** takvim gününü kullanır.

Schedule iki katmandır:

1. normalize database programı,
2. güvenli code fallback schedule.

Kiosk normalize schedule'u yalnız validation contract sağlamsa aktive eder. Geçersiz/eksik normalize veri fallback'e düşer.

Güncel admin ana yüzeyinde schedule editor yoktur. Tarihsel admin schedule prototype dosyaları bugünkü ürünün parçası değildir.

## 6. Slayt sistemi — güncel kritik sözleşmeler

Teacher-owned slaytlar:

- admin management listesinde görünür,
- aktif/pasif yapılabilir,
- pasif halde admin listesinde kalır,
- update/delete/reorder yapılabilir,
- create/update/delete/reorder sonrası kiosk active-slide cache invalid edilir.

Slide settings artık tek atomik `PUT /api/slide-settings` sözleşmesiyle transaction içinde güncellenir.

### Atatürk fallback seti

Yedi Atatürk fallback slaytı **system-owned** güvenlik ağıdır.

Her startup'ta canonical reconciliation yapılır:

- eksik fallback geri gelir,
- bozulmuş satır canonical hale döner,
- deactivate edilmiş fallback tekrar active olur,
- duplicate `fallback_key` oluşmaz.

Admin:

- fallback satırlarını management listesinde görmez,
- fallback update → 403,
- fallback delete → 403,
- fallback reorder → 403.

Aktif teacher slide varsa kiosk teacher content gösterir. Aktif teacher slide yoksa yedi system fallback otomatik devralır.

## 7. Upload ve medya sözleşmesi

Multer 2.2.0 kullanılır.

Gerçek multipart smoke ile doğrulanmış yüzeyler:

- öğrenci fotoğraf create,
- öğrenci fotoğraf replacement,
- XLSX öğrenci import,
- slayt medya create,
- slayt medya replacement,
- boyut-limit cleanup,
- file-filter rejection cleanup.

Öğrenci fotoğrafları DB'de `/uploads/...` web yolu olarak saklanır. Managed path dışındaki dosyalar silinmez.

Not: bazı upload middleware rejection/limit hataları tarihsel olarak global error handler üzerinden generic 500'e düşmektedir. Bu Multer 2 regresyonu değildir; ayrı error-UX bakım konusu olabilir.

## 8. Kiosk görsel sistemi

Ana güncel stil katmanı:

`public/css/kiosk-magic-park.css`

Ana motion katmanı:

`public/js/kiosk-motion.js`

Magic Park stage gerçek 16:9 geometri kullanır.

Son resize düzeltmesinde GSAP titlebar entrance animasyonu tamamlandıktan sonra inline transformlar temizlenir; CSS `left:50% + translateX(-50%)` yeniden layout source of truth olur.

Gerçek Chromium ile doğrulandı:

- 3840↔1920 canlı resize,
- 2560→1366,
- reduced-motion,
- Fullscreen API enter/exit,
- titlebar overflow 0.

## 9. Fiziksel 4K kalite kapısı

Browser/otomatik ön-kabul başarılıdır fakat **gerçek 55" 4K TV fiziksel kabulü hâlâ açık**.

Araçlarla doğrulanamayan donanım maddeleri:

- gerçek TV overscan/HDMI scaling,
- sınıf ışığında okunabilirlik,
- gerçek kiosk cihazı boot/fullscreen,
- fiziksel sınıf mikrofonu,
- gerçek cihaz reboot/ağ kesintisi,
- uzun süreli gerçek medya karması.

Bu madde tamamlandı diye işaretlenmemelidir; yaşayan planda 🟨 kalır.

## 10. Test ve kabul disiplini

Bir düzeltmeyi yalnız hedef test geçti diye kabul etme.

Mümkün olduğunda sıra:

1. sorunu yeniden üret veya kırmızı test yaz,
2. hedef testi geçir,
3. komşu regresyonları çalıştır,
4. `npm run test:core`,
5. anlamlıysa gerçek HTTP/browser/native/SQLite/multipart smoke,
6. `git diff --check`,
7. JS syntax check,
8. dependency değişiminde `npm audit --omit=dev`,
9. ayrı commit/push,
10. `HEAD == origin/main`,
11. GitHub Actions Core Tests Node 22 + Node 24 success,
12. yaşayan `.md` planı kanıtlarıyla güncelle.

Test sırasında yeni bir kırmızı görülürse sebebi ayrıştırılmadan “flaky” diye geçme.

## 11. Güncel bakım araçları

Ana suite:

```bash
npm run test:core
```

İzole gerçek uygulama smoke:

```bash
npm run test:system-smoke
```

Dependency guard:

```bash
npm run test:dependency-security-baseline
```

Native SQLite guard:

```bash
npm run test:sqlite-native-smoke
```

Multer multipart runtime guard:

```bash
npm run test:multer-runtime-smoke
```

Kiosk resize guard:

```bash
npm run test:kiosk-titlebar-resize
```

Legacy komut uyumluluğu:

```bash
npm run verify:code
```

Bu son komut artık yaşayan `test:core` kapısına delegasyon yapar.

## 12. Önemli veri bütünlüğü sözleşmeleri

Regres etmemesi gerekenler:

- strict numeric ID validation,
- bulk attendance transaction,
- president replacement transaction,
- VP max 2,
- duty max 4,
- duplicate role rejection,
- slide reorder atomicity,
- slide delete transaction,
- slide settings atomic transaction,
- slide cache invalidation commit sonrası,
- managed-photo safe cleanup,
- DOM'a öğrenci adlarının güvenli yazılması,
- Excel DOM safety,
- slideshow transition lock,
- slideshow generation invalidation,
- face-focus queue/cache/downsample,
- system-owned fallback reconciliation.

## 13. Dokümanların görev ayrımı

### `README.md`

Kurulum, çalıştırma ve günlük teknik kullanım.

### `AI_PROJECT_CONTEXT.md`

Bu dosya. Yeni AI/geliştirme oturumunun kısa güncel başlangıç bağlamı.

### `docs/PROJE_OZETI.md`

Güncel ürün ve teknik mimarinin insan okuyucu özeti.

### `CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`

Derin kod/tarih/tasarım taraması. Hazırlandığı tarih itibarıyla kapsamlı referans; yeni değişikliklerde yaşayan plan ve HEAD üstündür.

### Yaşayan düzeltme planı

`Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`

Bugünkü açık iş sırası, tamamlanan işlerin kanıtları ve kalan riskler burada tutulur.

## 14. Yeni oturum için başlangıç prosedürü

Classroom üzerinde yeni bir geliştirme oturumu açıldığında:

1. `git status --short --branch`
2. `git fetch --prune origin`
3. `git rev-parse HEAD` ve `origin/main`
4. bu dosya,
5. yaşayan düzeltme planı,
6. gerekiyorsa tomografi

okunmalıdır.

Ardından yaşayan plandaki ilk gerçekten açık ve araçlarla yapılabilir maddeye geçilmelidir.

Fiziksel 55" TV gerektiren P2 kalite kapısı repo içindeki yapılabilir P3 bakım işlerini engellemez.

## 15. Tarihsel bağlam için uyarı

Temmuz 2026 döneminde çok sayıda güvenlik, transaction ve schedule prototipi geliştirildi. Bazıları daha sonra ürün yönü değiştiği için kaldırıldı veya farklı biçimde çözüldü.

Bu nedenle eski commit/devir notundaki “sıradaki görev” ifadesini güncel görev sanma. Her zaman yaşayan plan + mevcut HEAD ile çapraz kontrol et.
