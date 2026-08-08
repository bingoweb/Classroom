# Classroom Projesi — Güncel Proje Tomografisi

**Hazırlanma tarihi:** 8 Ağustos 2026  
**Proje kökü:** `/Users/bingoweb/Projeler/Classroom-ilk-surum`  
**GitHub:** `bingoweb/Classroom`  
**Ana dal:** `main`  
**Bu belgenin esas aldığı kod:** `68656301d9cbcd5bce42fafa5f1cc02488c134d5` — `feat: refresh classroom admin and kiosk` — 6 Ağustos 2026 22:08:58 +03:00

> Bu belge, eski proje özetlerinin devamı değildir. Mevcut kod, gerçek SQLite şeması, test paketi, Git geçmişi, GitHub Actions kayıtları, çalışma zamanı incelemesi, kökteki `Classroom Projesi/` klasöründeki dokuz belge ve geçmiş geliştirme notları çapraz kontrol edilerek sıfırdan hazırlanmış güncel durum fotoğrafıdır.

---

## 1. Belgenin amacı ve kaynak hiyerarşisi

Bu dosyanın amacı, yeni bir geliştirme oturumu açıldığında projenin ne olduğunu, hangi mimari kararların bugün gerçekten geçerli olduğunu, hangi özelliklerin çalışır durumda bulunduğunu, hangi eski belgelerin artık geçersiz kaldığını ve bundan sonra hangi sırayla ilerlenmesi gerektiğini tek dosyadan anlayabilmektir.

Çelişki olduğunda aşağıdaki kaynak sırası esas alınmalıdır:

1. **Mevcut `main`/HEAD kodu ve gerçek çalışma zamanı davranışı**
2. **HEAD üzerindeki testler ve gerçek SQLite şeması**
3. **Git commit geçmişi ve aynı SHA üzerindeki GitHub Actions kanıtı**
4. **`Classroom Projesi/01 - Güncel Belgeler` içeriği**
5. **`Classroom Projesi/02 - Devir ve Oturum Notları` ile `03 - Tasarım ve Kiosk` belgeleri**
6. **`AI_PROJECT_CONTEXT.md`, `docs/PROJE_OZETI.md`, eski geçici belgeler ve geçmiş konuşma notları**

Önemli sonuç: Temmuz 2026 tarihli birçok belge o gün için doğru olmakla birlikte, 2 Ağustos ve özellikle 6 Ağustos 2026 commitlerinden sonra artık güncel ürün durumunu tek başına temsil etmemektedir.

---

## 2. Yönetici özeti — bugün proje tam olarak nerede?

Classroom, sınıf içindeki büyük ekranda sürekli çalışan bir **dijital sınıf panosu/kiosk** ve öğretmenin telefon veya bilgisayardan kullandığı bir **yönetim paneli** olmak üzere iki ana yüzeyden oluşuyor.

Bugünkü ürün kimliği artık eski “neon/glassmorphism dashboard” aşamasının ötesinde. Ana kiosk, kod ve görsel varlıklarda **“2/D Sihirli Pano / Sihirli Öğrenme Parkı”** olarak tanımlanıyor. Sekiz bilgi bölgesini tek 16:9 sahne içine oturtan, yüksek çözünürlüklü çizilmiş bir park kabuğu, yerel 3D ikonlar, Fredoka/Nunito fontları, GSAP mikro animasyonları, yüz odaklama, akıllı slayt geçişleri ve üç durumlu sınıf ses göstergesi kullanılıyor.

Admin paneli ise 6 Ağustos'ta özellikle sadeleştirilmiş durumda. Ana navigasyonda yalnızca dört günlük iş bırakılmıştır:

- Öğrenciler
- Görevler
- Yoklama
- Slaytlar

Sistem/hata günlükleri üst çubuktaki ayrı bir düğmeden açılıyor. Temmuz ayında geliştirilen **ders programı tanılama, taslak editörü ve kaynak-vs-taslak inceleme prototipleri** 6 Ağustos commitinde bilinçli olarak kaldırılmıştır. Buna karşılık backend'deki normalize program altyapısı ve kiosk fallback mantığı yaşamaya devam etmektedir.

Güvenlik tarafı Temmuz ortasındaki yoğun çalışmayla önemli ölçüde güçlendirilmiştir: yönetici oturumu, HttpOnly/SameSite cookie, CSRF, giriş ve yazma rate-limitleri, korumalı mutasyon rotaları, geniş hata redaksiyonu, atomik SQLite işlemleri ve dosya yolu doğrulamaları vardır.

Test tabanı geniştir. Bugünkü yerel HEAD üzerinde `npm run test:core` sonucu **1270/1270 başarılı**dır. Aynı SHA için GitHub Actions'ta Node 22 ve Node 24 matrisini geçen başarılı bir manuel koşu vardır. Son push koşusunun kırmızı görünmesinin nedeni test hatası değil, GitHub'ın iki hosted runner job'unu 15 dakika içinde runner'a alamayıp iptal etmesidir.

Bununla birlikte proje “tamamlandı” sayılmamalıdır. Kod incelemesinde bugün hâlâ gerçek olan birkaç işlevsel ve bakım riski doğrulandı. En önemlisi admin'deki slayt **Aktif/Pasif** düğmesinin backend tarafından desteklenmemesi ve bu nedenle 400 dönmesidir. Ayrıca görünür başarı/hata toast sistemi fiilen yok, admin SheetJS'i CDN'den ve package.json'dan farklı bir sürümle çekiyor, default yönetici parola fallback'i fail-closed değil, bazı slide delete hata yolları ham SQLite hata metnini döndürüyor, bağımlılık ağacında güncel npm advisories var ve bazı eski bakım scriptleri tamamen güncelliğini yitirmiş durumda.

---

## 3. Repo, Git ve çalışma ağacı durumu

### 3.1 Güncel Git noktası

- Dal: `main`
- Uzak: `origin = https://github.com/bingoweb/Classroom.git`
- HEAD: `68656301d9cbcd5bce42fafa5f1cc02488c134d5`
- Mesaj: `feat: refresh classroom admin and kiosk`
- Tarih: 6 Ağustos 2026 22:08:58 +03:00
- `origin/main` ile bu commit seviyesi senkronizeydi.

### 3.2 Bu tomografi sırasında çalışma ağacı

Kullanıcı tarafından sonradan eklenen şu klasör Git açısından untracked durumdadır:

`Classroom Projesi/`

Bu dosya da yeni oluşturulduğu için commit edilene kadar untracked olacaktır:

`CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`

Tomografi sırasında mevcut kaynak kodunda başka değişiklik yapılmadı. Testlerden sonra `git diff --check` temizdi.

### 3.3 Repo ölçeği

- Toplam Git commit sayısı: **230**
- İlk commit: `9b19100` — 7 Aralık 2025 — `Initial commit: Sinif Paneli v1.0`
- `tests/*.test.js` sayısı: **73**
- `backend`, `public` ve `scripts` altında vendor hariç JS/CSS/HTML kaynak dosyası yaklaşık: **51**
- Büyük kaynak + test alanının toplam satır büyüklüğü yaklaşık **48 bin satır** ölçeğindedir.

Başlıca büyük dosyalar:

| Dosya | Yaklaşık satır | Rol |
|---|---:|---|
| `public/css/style.css` | 4740 | Eski/temel kiosk stil katmanı; Magic Park bunun üstüne override olur |
| `backend/server.js` | 2807 | Express API ve ana backend orkestrasyonu |
| `public/admin/admin.js` | 1828 | Admin CRUD ve UI davranışı |
| `public/js/script.js` | 1616 | Kiosk ana runtime orkestrasyonu |
| `public/css/kiosk-magic-park.css` | 1433 | Güncel kiosk görsel tasarımının ana katmanı |
| `public/admin/index.html` | 830 | Admin arayüzü |
| `public/js/noise-meter.js` | 637 | Mikrofon, kalibrasyon, ses skoru, ekolayzer |
| `public/js/transitions.js` | 502 | Slayt geçiş motoru |
| `public/js/media-analyzer.js` | 428 | Geçiş seçimi ve transition family mantığı |
| `public/js/schedule-manager.js` | 399 | Ders/teneffüs/gün modu |
| `public/js/face-focus.js` | 394 | Öğrenci portrelerinin yüz odaklama sistemi |

---

## 4. Git geçmişinden gelişim çizgisi

Temmuz ortasından itibaren repo çok yoğun bir güvenlik, veri bütünlüğü ve kiosk olgunlaştırma döneminden geçti.

### 4.1 12 Temmuz 2026 — Ders programı ve dashboard temeli

27 commitlik yoğun blokta:

- yinelenen script importları temizlendi,
- geliştirme zamanı simülatörü eklendi,
- alternating schedule varsayımları kaldırıldı,
- `ScheduleNormalizer` ve doğrulama sözleşmesi eklendi,
- güvenli fallback programı entegre edildi,
- İstanbul tarih anahtarı yoklama/statistik akışına taşındı,
- normalize program API'si oluşturuldu,
- dashboard normalize API ile bağlandı,
- admin için read-only program diagnostics prototipi oluşturuldu.

### 4.2 13 Temmuz — Veri bütünlüğü ve regresyon sertleştirmesi

84 commitlik blokta:

- admin ders programı taslak editörü ve source-vs-draft review panel prototipleri geliştirildi,
- frontend API yolları same-origin hale getirildi,
- öğrenci fotoğraf yolları web yolu biçimine geçirildi,
- dosya adı sanitizasyonu ve güvenli eski fotoğraf silme eklendi,
- malformed ID kontrolleri öğrenci/rol/slayt alanlarında yaygınlaştırıldı,
- toplu yoklama atomik hale getirildi,
- sınıf başkanı değiştirme atomik hale getirildi,
- rol limitleri ve duplicate davranışları güçlendirildi,
- slayt reorder route'u erişilebilir ve transactional hale getirildi,
- create/update/delete/reorder sonrası slideshow cache invalidation eklendi,
- log yazımının response'dan önce tamamlanması güvenceye alındı,
- slideshow transition race lock düzeltildi,
- öğrenci isimleri DOM'a güvenli biçimde yazılmaya başlandı.

### 4.3 14 Temmuz — UI güvenliği, medya ve transaction bütünlüğü

49 commitlik blokta:

- Excel import UI XSS yüzeyi kapatıldı,
- rol duplicate atamaları reddedildi,
- yoklama tarih validasyonu takvim açısından sertleştirildi,
- slide reorder transaction davranışları hata senaryolarıyla ispatlandı,
- admin hata logları paneli tamamlandı,
- slayt silme DB işlemi atomik hale getirildi,
- slayt medya URL'leri kanonik hale getirildi,
- dış medya URL'lerinin silinmemesi korundu,
- rol limitleri atomik SQL ile güvenceye alındı,
- CI Node 22/24 matrisine taşındı.

### 4.4 15–16 Temmuz — Admin güvenlik sınırı

Bu dönemde:

- admin erişim planı çıkarıldı,
- username/password konfigürasyonu eklendi,
- constant-time credential karşılaştırması getirildi,
- server-side session store eklendi,
- login/logout/session API'leri eklendi,
- admin sayfası ve mutasyon rotaları oturuma bağlandı,
- CSRF koruması eklendi,
- permissive CORS kaldırıldı / same-origin browser modeli korundu,
- login ve admin write rate-limitleri eklendi,
- log okuma admin'e kapatıldı,
- SheetJS backend paketi 0.20.3'e yükseltildi,
- çok sayıda API hata yolu kullanıcıya DB/internal ayrıntı döndürmeyecek şekilde redakte edildi,
- slayt silme ve diğer SQLite transaction'ları isolated connection modeline geçirildi.

### 4.5 18 Temmuz — 4K kiosk ve 3D görsel dil

Ana commitler:

- `6320f77` — `Optimize kiosk home page for 4K displays`
- `e4cf51d` — `Repair kiosk responsive layout and portrait focus`
- `e5a37f7` — `Modernize kiosk cards and 3D icon system`

Burada büyük ekran bilgi hiyerarşisi, öğrenci portreleri, 3D ikonlar, responsive oranlar ve kiosk okunabilirliği ciddi şekilde yenilendi.

### 4.6 19 Temmuz — Otomatik Atatürk fallback slaytları

`06849cf` — `feat: add automatic Atatürk fallback slides`

- SQLite'a bir kez seed edilen yedi fallback slayt eklendi.
- Admin tarafından oluşturulmuş aktif/geçerli slayt varsa onlar tercih edilir.
- Hiç admin slaytı kalmazsa Atatürk fallback seti otomatik görünür.

### 4.7 2 Ağustos — Kiosk geri bildirimi, admin erişimi ve transition sertleştirmesi

`5738200` — `Improve kiosk feedback and admin access`

Önemli kazanımlar:

- admin username desteği,
- daha gelişmiş mikrofon durum mesajları,
- profesyonel geçiş havuzu,
- art arda aynı transition family kullanılmasını azaltan mantık,
- `prefers-reduced-motion` için sade fade profili,
- slide dataset generation ile eski callback'lerin iptali,
- değişmeyen slide verisinin rotasyonu gereksiz restart etmemesi,
- geçiş sırasında outgoing ve incoming slaytların aynı anda compositing'de tutulması.

### 4.8 6 Ağustos — Güncel büyük kırılma: Magic Park + admin sadeleştirme

`6865630` — `feat: refresh classroom admin and kiosk`

53 dosyada yaklaşık **+4218 / -6541** değişiklik vardır.

Bu commit:

- `public/css/kiosk-magic-park.css` ekledi,
- `public/js/kiosk-motion.js` ekledi,
- yüksek çözünürlüklü `kiosk-magic-park-shell.webp` ekledi,
- quiet/attention/loud WebP görsellerini ekledi,
- yerel Fredoka/Nunito fontlarını ekledi,
- GSAP 3.15.0 ve canvas-confetti 1.9.4'ü vendor olarak yerelleştirdi,
- favicon ve optimize tribute WebP ekledi,
- face-focus ve kiosk runtime performansını optimize etti,
- statik cache politikasını ayırdı,
- admin ayarlar/ses tema karmaşasını kaldırdı,
- admin ders programı diagnostics/draft/review prototiplerini kaldırdı,
- ana admin navigasyonunu dört günlük işe indirdi,
- yeni kiosk ve runtime regresyon testleri ekledi.

Bu commit bugün için **tasarım ve işlev tabanıdır**.

---

## 5. Güncel sistem mimarisi

```text
                   ┌─────────────────────────────┐
                   │         Browser/Kiosk       │
                   │   public/index.html         │
                   │   2/D Sihirli Pano          │
                   └──────────────┬──────────────┘
                                  │ same-origin HTTP
                                  ▼
┌─────────────────────┐   ┌───────────────────────────────┐
│ Admin Browser       │   │ Express 4 backend             │
│ /admin-login.html   │──▶│ backend/server.js             │
│ /admin/             │   │                               │
└─────────────────────┘   │ auth + CSRF + rate limiting   │
                          │ students / roles / attendance  │
                          │ schedule / slides / logs       │
                          └──────────────┬────────────────┘
                                         │
                    ┌────────────────────┼───────────────────┐
                    ▼                    ▼                   ▼
             SQLite database       backend/uploads/    logs/
             classroom.db          photos/slides       error log
```

Mimari klasik server-rendered bir uygulama değildir. HTML/CSS/Vanilla JS statik olarak Express üzerinden servis edilir, runtime verileri `/api/*` ile çekilir.

Framework kullanılmıyor. Frontend modülleri çoğunlukla `window.*` global sözleşmeleri üzerinden birbirine bağlanıyor.

---

## 6. Kaynak ağacı — dosya bazında tomografi

### 6.1 Backend

| Dosya | Bugünkü sorumluluk |
|---|---|
| `backend/server.js` | Express app, middleware, tüm HTTP endpointleri, upload akışları, öğrenci/rol/yoklama/slayt/log iş kuralları |
| `backend/database.js` | SQLite bağlantısı, tablo/index init, migration köprüsü, default settings, 7 Atatürk fallback seed'i, isolated connection factory |
| `backend/admin-auth-config.js` | Admin username/password kaynağı ve constant-time SHA-256 karşılaştırma |
| `backend/admin-session-cookie.js` | Session cookie serialize/parse; HttpOnly, SameSite=Strict, 8 saat |
| `backend/admin-session-store.js` | In-memory session Map'i; 32-byte random ID; TTL temizliği |
| `backend/request-rate-limiter.js` | Login failure limiter ve session-keyed admin write limiter |
| `backend/date-utils.js` | İstanbul timezone'una göre `YYYY-MM-DD` tarih anahtarı |
| `backend/schedule-schema.js` | Legacy schedule tablosunu normalize zaman alanlarıyla migration etme |
| `backend/schedule-service.js` | Schedule validation, fatal warning sınıflandırması, day key doğrulama |
| `backend/schedule-repository.js` | Normalize program read ve transactional replace |
| `backend/static-cache-policy.js` | HTML/admin no-store; statik asset/upload revalidation politikası |
| `backend/logger.js` | Server log formatlama, component/level sistemi |
| `backend/utils.js` | Tarihsel shared utility kopyası; mevcut server importlarında kullanılmıyor görünmektedir |
| `backend/config.js` | Tarihsel shared config kopyası; mevcut backend importlarında kullanılmıyor görünmektedir |
| `backend/classroom.db` | Yerel SQLite veri dosyası |
| `backend/uploads/` | Öğrenci fotoğrafları ve kullanıcı yüklemeleri; `slides/` runtime'da oluşturulur |

### 6.2 Ana kiosk

| Dosya | Bugünkü sorumluluk |
|---|---|
| `public/index.html` | Sekiz bölgeli güncel kiosk DOM'u ve script dependency sırası |
| `public/css/style.css` | Büyük eski/temel stil katmanı; Magic Park tarafından yoğun biçimde override edilir |
| `public/css/kiosk-magic-park.css` | Güncel 16:9 Magic Park sahnesi, 4K oranları, kart içi yerleşimler |
| `public/css/kiosk-mode.css` | Kiosk cursor/user-select davranışı |
| `public/css/dev-time-simulator.css` | Geliştirme zamanı simülatörü görünümü |
| `public/js/script.js` | Ana dashboard orkestrasyonu, roller, stats, slideshow, clock, schedule status, refresh lifecycle |
| `public/js/config.js` | Same-origin API, refresh interval, okul saatleri, avatar varsayılanları |
| `public/js/api-service.js` | Ortak fetch wrapper |
| `public/js/logger.js` | Browser logger ve component sabitleri |
| `public/js/settings-loader.js` | `/settings` poll; displayMode/theme/fontSize/autoRefresh eski ayarlarını uygulayabilen legacy katman |
| `public/js/display-mode-manager.js` | Fullscreen/kiosk mode helper; browser Fullscreen API |
| `public/js/time-provider.js` | Gerçek/simüle tarih-zaman sağlayıcısı |
| `public/js/dev-time-simulator.js` | Geliştirme için saat/gün simülasyonu |
| `public/js/schedule-normalizer.js` | Schedule satırlarını normalize/validate eden shared UMD modül |
| `public/js/schedule-manager.js` | Fallback program + aktif external program; weekend/before/in-class/break/after-school state machine |
| `public/js/dashboard-schedule-loader.js` | Normalize schedule API'sini güvenli biçimde aktive/fallback etme |
| `public/js/noise-meter.js` | Web Audio mikrofon pipeline'ı, auto calibration, score, durum görselleri, equalizer |
| `public/js/face-focus.js` | Portre heuristiği, downsample, queue, cache, object-position |
| `public/js/media-analyzer.js` | Slayt transition seçimi, family çeşitliliği |
| `public/js/transitions.js` | Gerçek transition uygulaması ve cleanup |
| `public/js/interval-manager.js` | Timer lifecycle merkezi |
| `public/js/kiosk-motion.js` | GSAP entrance/ambient/role/noise/clock mikro hareketleri |
| `public/js/confetti.js` | Yerel canvas-confetti adaptörü |
| `public/js/utils.js` | Path/avatar/time/fetch/escapeHtml yardımcıları; `getWeatherInfo` artık kullanılmayan legacy fonksiyondur |

### 6.3 Admin

| Dosya | Bugünkü sorumluluk |
|---|---|
| `public/admin-login.html` | Kullanıcı adı + parola girişi, session check, login redirect |
| `public/admin/index.html` | Öğrenci/Görev/Yoklama/Slayt ana yüzeyi, system/log paneli ve modallar |
| `public/admin/admin.js` | Öğrenci CRUD, Excel import, roller, fotoğraf, slayt CRUD/reorder/settings, yoklama, mobil adres |
| `public/admin/error-logs.js` | Log filtreleme, refresh/export/cleanup/debug görünümü |
| `public/admin/style.css` | Admin glass/premium stil, responsive form/kart düzeni |

6 Ağustos itibarıyla **artık yok**:

- `public/admin/schedule-diagnostics.js`
- `public/admin/schedule-draft-editor.js`
- `public/admin/schedule-review-panel.js`
- `public/admin/settings-handler.js`

Bunları kullanan testler de kaldırıldı.

### 6.4 Script ve bakım araçları

| Dosya | Durum |
|---|---|
| `scripts/db-helpers.js` | SQLite Promise wrapper yardımcıları |
| `scripts/seed_data.js` | Seed verisi |
| `scripts/seed_schedule.js` | Program seed'i |
| `scripts/update_db_schema.js` | Eski migration yardımcı scripti |
| `scripts/fix_database_consistency.js` | Veri tutarlılığı bakım scripti |
| `scripts/check_student_photos.js` | Fotoğraf veri kontrolü |
| `scripts/test_system.js` | **Stale:** `/api/word` bekliyor, `/admin/` için artık geçersiz 200 beklentisi var |
| `scripts/verify-code.js` | **Tamamen stale:** kaldırılmış Gemini/AI dosya ve endpointlerini arıyor |
| `start.sh` | Linux'ta server açıp Chromium/Chrome/Firefox kiosk modunda başlatıyor; browser kapanınca server PID'ini öldürüyor |

---

## 7. Güncel kiosk bilgi mimarisi — 8 canlı bölge

Ana sayfa sekiz ayrı işlevsel bölgeyi tek görsel sahneye bindiriyor:

1. **Günün Zamanı**
   - gün adı
   - tam tarih
   - HH:MM dijital saat
   - hafta sonu sayacı / tatil durumu

2. **Sınıf Mevcudu / Yoklama**
   - bugün sınıfta öğrenci sayısı
   - toplam sınıf mevcudu
   - kız/erkek dağılımı
   - yoklama tamam/tamam değil durumu
   - gelmeyen öğrenciler için kayan avatar+isim listesi

3. **Ders Akışı**
   - okul öncesi countdown
   - ders/teneffüs countdown
   - progress bar
   - external schedule aktifse “Şimdi / Sıradaki ders” bağlamı
   - okul sonrası/gün bazlı farewell
   - hafta sonu modu

4. **Sınıfın Ses Dengesi**
   - microphone state
   - üç görsel durum: Sessiz / Dikkat / Gürültü
   - progress/meter
   - equalizer
   - retry davranışı

5. **Sınıfımızdan**
   - resim, GIF, video slaytları
   - caption
   - akıllı transition
   - admin içerikleri yoksa Atatürk fallback seti

6. **Sınıf Başkanı**
   - 1 büyük başkan portresi
   - en fazla 2 yardımcı
   - face focus

7. **Nöbetçiler**
   - en fazla 4 öğrenci
   - face focus
   - uzun isim için özel sınıf

8. **Haftanın Yıldızları**
   - yıldız öğrenciler
   - 4 saniyelik mini slideshow
   - farklı transition class'ları
   - dot göstergeleri

---

## 8. Magic Park tasarım sistemi

### 8.1 Güncel görsel kimlik

Ana tema `body.magic-park-theme` ile uygulanıyor. Stil dosyasındaki kendi tanımı **“Sihirli Öğrenme Parkı”**dır.

Ana ilkeler:

- çocuk ekranında canlı ve neşeli kimlik,
- tek 16:9 illüstrasyon kabuğu,
- sekiz bölgenin bağımsız web kartı gibi değil aynı fiziksel parkın bölümleri gibi görünmesi,
- şeffaf kart yüzeyleri; asıl chrome çizilmiş shell görselinde,
- büyük 3D ikonlar ve karakterler,
- güçlü ama okunaklı renkler,
- Fredoka başlık, Nunito içerik tipografisi,
- düşük dikkat maliyetli sürekli hareket,
- reduced-motion desteği.

### 8.2 Sahne geometrisi

Ana stage:

- gerçek 16:9 oranı,
- `width: min(100vw, 177.7777778vh)`,
- `height: min(100vh, 56.25vw)`,
- `kiosk-magic-park-shell.webp` arka planı %100×%100,
- container query adı: `kiosk-stage`.

Kolon oranları:

- sol: %27
- center+right: %73
- bu alan içinde center %65.1 / right %34.9

Satır oranları:

- sol: %36.4 / %31.1 / %32.5
- center: %39.1 / %60.9
- sağ: %39.1 / %31.2 / %29.7

### 8.3 Hedef çözünürlük

Eski kabul belgelerindeki ana hedef **3840×2160 4K TV**dir. Ayrıca 2560×1440, 1920×1080 ve 1366×768 ölçekleri önemsenmiştir.

Bu tomografi için gerçek browser render'ı geçici DB kopyasında test edildi:

- 3840×2160 fresh load: stage viewport'u tam doldurdu, body scroll oluşmadı, başlıklar kendi kart sınırında kaldı.
- 1366×768 fresh load: body scroll oluşmadı, title overflow görülmedi.
- Console'da error/warn yoktu.
- Kiosk kaynaklarının tamamı 200/304 same-origin yükleniyordu.

**Responsive resize notu:** Sayfa başka bir genişlikte yüklendikten sonra browser viewport'u canlı olarak değiştirilirse, GSAP ilk beş titlebar'ın CSS yüzde transformunu piksel inline transformuna çevirmiş olduğundan resize sonrası başlık merkezleri geçici olarak kayabiliyor. Hedef kiosk sabit çözünürlükte fresh load ile çalıştığında sorun görülmedi; ancak dinamik resize/hotplug senaryosu ayrı regresyon testi hak ediyor.

### 8.4 Hareket sistemi

`kiosk-motion.js`:

- 12 adet ambient park sparkle katmanı oluşturuyor,
- GSAP `matchMedia()` kullanıyor,
- title/content entrance timeline uygular,
- noise karakterine hafif float verir,
- rol alanlarını `MutationObserver` ile izleyip değişen içeriğe mikro giriş hareketi uygular,
- noise state değişiminde pulse verir,
- saat dakikası değişince küçük tick animasyonu yapar,
- `prefers-reduced-motion` aktifse hareketleri minimuma indirir,
- `pagehide` sırasında observer ve GSAP media context temizlenir.

---

## 9. Ana kiosk runtime veri akışı

### 9.1 Polling frekansları

- Saat: **1 saniye**
- Roller + stats + normalize schedule refresh: **5 saniye**
- Settings loader: **10 saniye**
- Slideshow değişiklik kontrolü: **30 saniye**
- Haftanın yıldızları mini slideshow: **4 saniye**

### 9.2 Gereksiz render önleme

`script.js`:

- roles ve stats isteklerini `Promise.all` ile paralel yapar,
- roles/stats JSON snapshot hash'i değişmediyse DOM'u yeniden kurmaz,
- clock text değişmediyse yazmaz,
- countdown yardımcıları yalnız değer değişince DOM/style günceller,
- period context için render key kullanır,
- slideshow verisi değişmediyse 30 saniyelik refresh rotasyonu yeniden başlatmaz.

### 9.3 Timer lifecycle

`interval-manager.js` interval/timeout cleanup'ını merkezileştirir. `beforeunload` ve `pagehide` sırasında slideshow/video/timer kaynakları temizlenir.

---

## 10. Ders programı mimarisi

### 10.1 İki katmanlı model

Sistem bugün iki program kaynağı kullanabilir:

1. **Veritabanından normalize external schedule**
2. **Kod içindeki garantili fallback schedule**

`DashboardScheduleLoader`, backend'den gelen normalize programı yalnız şu durumda kabul eder:

- doğru `day`,
- `source === database`,
- `valid === true`,
- boş olmayan periods,
- warnings/errors contract doğru,
- backend errors yok,
- ScheduleManager ikinci kez normalize edip kabul ediyor.

Transport hatasında mevcut aktif program korunur. Backend 200 döndürür ama veri eksik/geçersiz ise fallback'e dönülür.

### 10.2 Mevcut fallback saatleri

- 09:00–09:40 — 1. Ders
- 09:40–09:55 — 1. Teneffüs
- 09:55–10:35 — 2. Ders
- 10:35–10:50 — 2. Teneffüs
- 10:50–11:30 — 3. Ders (Beslenme)
- 11:30–11:40 — 3. Teneffüs
- 11:40–12:20 — 4. Ders
- 12:20–13:00 — Öğle Teneffüsü
- 13:00–13:40 — 5. Ders
- 13:40–13:50 — Son Teneffüs
- 13:50–14:30 — Son Ders

### 10.3 Bugünkü yerel DB durumu

Tomografi anındaki yerel `classroom.db` içinde `schedule` satır sayısı **0** idi. Dolayısıyla mevcut yerel çalışma durumunda kiosk **fallback schedule** kullanır.

Bu bir kod hatası değildir; mevcut veri durumudur.

### 10.4 Admin UI durumu

Backend'de hem:

- `GET/PUT /api/schedule/normalized`
- legacy `GET/POST /api/schedule`

yaşamaktadır.

Ancak 6 Ağustos'ta admin'deki schedule diagnostics, draft editor ve review panel kaldırılmıştır. Yani normal admin UI bugün program düzenleme sunmaz.

---

## 11. Ses ölçer tomografisi

`public/js/noise-meter.js` güncel sürümde admin tarafından elle threshold ayarlanan eski modelden uzaklaşmıştır.

### 11.1 Audio pipeline

- `navigator.mediaDevices.getUserMedia()`
- audio only
- `autoGainControl: false`
- `echoCancellation: false`
- `noiseSuppression: false`
- Web Audio `AnalyserNode`
- `fftSize = 1024`
- `smoothingTimeConstant = 0.7`
- waveform için `getByteTimeDomainData`
- equalizer için `getByteFrequencyData`

### 11.2 Otomatik kalibrasyon

- 120 calibration sample toplanır.
- Sessiz taban, sıralı örneklerin yaklaşık %25 percentile noktasından çıkarılır.
- floor sınırı -72 dB ile -38 dB arasında tutulur.
- kalibrasyon sonrası çevre tabanı yavaşça adapte olabilir.

### 11.3 Gürültü skoru

- normalized loudness 0..1 aralığına çevrilir.
- 0..100 noise score üretilir.
- yükselirken yaklaşık 2.2 s, düşerken 3.2 s time constant ile yumuşatılır.
- threshold: 70 / 85
- hysteresis: 4 puan

Bu sayede tek ani sample yüzünden state'in hızlı ileri geri zıplaması azaltılır.

### 11.4 Üç durum

- `low` — Sessiz — `quiet.webp`
- `medium` — Dikkat — `attention.webp`
- `high` — Gürültü — `loud.webp`

State değişince:

- meter rengi,
- karakter resmi,
- kart class'ı,
- aktif scale label,
- `aria-valuenow` ve `aria-valuetext`,
- öğrenciye gösterilen kısa mesaj

güncellenir.

### 11.5 Equalizer

Runtime'da DocumentFragment ile 128 kolon üretilir. Magic Park CSS görsel yoğunluğu azaltmak için çift kolonları gizler. Peak hold sistemi vardır.

### 11.6 Mikrofon başarısızlık UX'i

NotAllowed, NotFound, NotReadable, Abort vb. beklenen hatalar ayrı, sakin mesajlarla karşılanır. “Tekrar Dene” butonu gösterilir. Beklenen mikrofon hataları console error yerine info olarak ele alınır; gerçek beklenmeyen hata error olur.

Bu alan, Temmuzdaki “mikrofon kurulum/izin UX'i eksik” açık maddesinin büyük ölçüde kapatılmış halidir.

---

## 12. Slideshow mimarisi

### 12.1 Backend active slide seçimi

`GET /api/slides/active`:

- aktif,
- süresi dolmamış,
- admin-created içerik varsa yalnız admin içerikleri,
- admin-created aktif içerik yoksa fallback içerikleri

döndürür.

Sonuç 5 dakika server-side cache edilir. Create/update/delete/reorder başarıyla commit olduğunda cache invalid edilir.

### 12.2 Atatürk fallback sistemi

`database.js` ilk init'te yedi fallback satır seed eder ve bir marker setting yazar.

- `is_fallback = 1`
- `fallback_key` unique
- medya `/assets/ataturk-slides/ataturk-1.webp` … `ataturk-7.webp`
- varsayılan 12 saniye
- fade/auto profile

Fallback satırlar normal SQLite kaydıdır ve admin listesine de gelebilir.

**Önemli davranış:** seed marker bir kez yazıldıktan sonra admin bir fallback satırını silerse sistem her restart'ta otomatik yeniden oluşturmaz. “Permanent” burada “repo/DB seed'i olarak kalıcı ve editable” anlamındadır, self-healing değildir.

### 12.3 Frontend slideshow performansı

- İlk slayt eager hydrate edilir.
- Tüm galeri ilk paint'te indirilmez.
- Sadece bir sonraki slide look-ahead olarak hydrate edilir.
- Görsel aspect ratio frame'e yakınsa `cover`, uzaksa `contain` + blurred backdrop kullanılır.
- Video autoplay için muted çalışır.
- `video_auto_advance` desteklenir.
- Media error loglanır; video ayarına göre ilerleme yapılabilir.
- Caption `textContent` ile oluşturulur.
- 120/220 karakter sınırlarında tipografik compact class'ları vardır.

### 12.4 Transition motoru

Auto/random profesyonel havuz:

- fade
- dissolve
- slide-left/right/up/down
- zoom-in/out
- push
- cover

Transition family'leri:

- soft
- directional
- depth

Yakın tekrarları azaltmak için exact transition ve family geçmişi dikkate alınır.

Manual admin seçenekleri daha geniştir; rotate/flip/blur/glitch/particle/morph/wipe/cube/uncover gibi ağır efektler hâlâ seçilebilir.

Geçiş sırasında:

- current ve next slide birlikte görünür/composite edilir,
- transition lock eşzamanlı geçişi engeller,
- süre 350–1800 ms bandına clamp edilir,
- reduced-motion'da kısa fade'e düşülür,
- bitince will-change/z-index/transition state temizlenir.

### 12.5 Generation invalidation

Slide set değiştiğinde `slideshowGeneration` artırılır. Eski setin bekleyen callback'leri generation mismatch ile no-op olur. Bu, eski WIP belgelerinde anlatılan stale callback/race riskinin bugün çözülmüş halidir.

---

## 13. Öğrenci fotoğrafı ve face-focus sistemi

Öğrenci fotoğrafları artık DB'de web yolu olarak saklanır (`/uploads/...`).

Server tarafında:

- geçersiz ID reddedilir,
- yeni fotoğraf upload boyutu Multer ile sınırlıdır,
- eski fotoğraf yalnız gerçekten managed `/uploads/<tek-güvenli-dosya-adı>` ise silinir,
- `..`, slash, backslash, NUL vb. path escape kalıpları reddedilir,
- default avatarlar silinmez,
- öğrenci silinince managed fotoğraf temizlenir.

Face-focus tarafında:

- büyük görsel pixel analizi en fazla 320 px eksene downsample edilir,
- aynı fotoğrafın birden fazla rol kartında aynı anda analiz edilmesi tek pending job'da birleştirilir,
- sonuç cache'den tekrar kullanılır,
- queue seri/ölçülü yürütülür,
- role/card boyutuna göre object-position uygulanır.

Bu, 4K'da portrelerin yanlış kırpılması ve CPU yükü problemlerine yönelik mevcut çözüm katmanıdır.

---

## 14. Roller ve iş kuralları

Rol türleri:

- `president`
- `vice_president`
- `duty`
- `star`

Kurallar:

- Başkan: tam 1; yeni atama eskisini atomik transaction içinde değiştirir.
- Başkan yardımcısı: maksimum 2.
- Nöbetçi: maksimum 4.
- Yıldız: adet sınırı yok.
- Aynı öğrenci aynı role iki kez atanamaz.
- Olmayan öğrenci ID'si rol atamasında reddedilir.

VP ve duty limitleri `INSERT ... SELECT ... WHERE` ile count/duplicate/student existence koşullarını tek SQL kararında uygular. Zero-change sonrası neden sınıflandırılır ve kullanıcıya uygun Türkçe mesaj döner.

---

## 15. Yoklama

Yoklama iki kullanım biçimine sahiptir:

- tarih bazlı toplu replacement,
- tek attendance satırı update.

Toplu kayıtta:

- body tipi kontrol edilir,
- tarih `YYYY-MM-DD` ve takvim günü olarak doğrulanır,
- student ID safe integer olmalıdır,
- duplicate student ID reddedilir,
- status yalnız `present/absent`,
- ayrı SQLite connection + `BEGIN IMMEDIATE`,
- o tarihin eski kayıtları silinir,
- yeni kayıtların tamamı yazılır,
- hata halinde rollback,
- commit tamamlanmadan success dönmez.

Dashboard stats bugünün tarihini backend'de **Europe/Istanbul mantığına uygun tarih anahtarı** ile hesaplar.

---

## 16. SQLite şeması — güncel gerçek

Gerçek `backend/classroom.db` şeması incelendi.

### 16.1 `students`

- `id`
- `name`
- `photo`
- `gender M/F`

### 16.2 `roles`

- `id`
- `student_id` → students FK CASCADE
- `role_type`

### 16.3 `settings`

- `key`
- `value`

Default seed:

- `message`
- `city`
- fallback slide seed marker

### 16.4 `attendance`

- `id`
- `student_id` FK CASCADE
- `date`
- `status present/absent`
- unique `(student_id, date)`

### 16.5 `schedule`

Güncel şema eski dokümandan daha geniştir:

- `id`
- `day`
- `period`
- `course`
- `period_type`
- `start_time`
- `end_time`
- `is_active`
- unique `(day, period)`

Ayrıca `idx_schedule_day_active_period` index'i vardır.

### 16.6 `slides`

- id
- title
- content_type
- media_type
- media_path
- text_content
- display_duration
- video_auto_advance
- transition_type
- transition_duration
- transition_mode
- display_order
- is_active
- expires_at
- priority
- is_poster
- **is_fallback**
- **fallback_key**
- created_at

`fallback_key` üzerinde unique index vardır.

### 16.7 `slide_settings`

Default değerler:

- `default_duration = 10000`
- `default_transition_mode = auto`
- `default_transition_duration = 1000`
- `default_announcement_duration = 7`

### 16.8 `error_logs`

- timestamp
- level
- component
- message
- error_details
- context
- stack_trace
- user_agent
- url
- created_at

### 16.9 Tomografi anındaki yerel DB sayımları

Kişisel öğrenci isimleri bu rapora alınmamıştır.

- students: 8
- roles: 10
- attendance: 8
- schedule: 0
- slides: 7
- settings: 3
- slide_settings: 4
- error_logs: 50

Bu veri seti geliştirme/fixture niteliğinde olabilir; üretim öğrenci listesi olduğu varsayılmamalıdır.

---

## 17. API envanteri — mevcut 35 route

### Yönetici oturumu

| Method | Route | Koruma |
|---|---|---|
| POST | `/api/admin/login` | login failure rate limit |
| POST | `/api/admin/logout` | cookie varsa session delete |
| GET | `/api/admin/session` | session durumunu ve CSRF header'ını verir |

### Öğrenci

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/students` | public read |
| POST | `/api/students` | session + CSRF + write rate limit |
| POST | `/api/students/import` | session + CSRF + write rate limit |
| DELETE | `/api/students/:id` | session + CSRF + write rate limit |
| PUT | `/api/students/:id/photo` | session + CSRF + write rate limit |

### Roller

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/roles` | public read |
| POST | `/api/roles` | session + CSRF + write rate limit |
| DELETE | `/api/roles/:id` | session + CSRF + write rate limit |

### Settings

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/settings` | public read |
| POST | `/api/settings` | session + CSRF + write rate limit |

### Schedule

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/schedule/normalized` | public read |
| PUT | `/api/schedule/normalized` | session + CSRF + write rate limit |
| GET | `/api/schedule` | public legacy read |
| POST | `/api/schedule` | session + CSRF + write rate limit |

### Network / stats

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/network-info` | public read |
| GET | `/api/stats` | public read |

### Attendance

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/attendance/today` | public read |
| GET | `/api/attendance/:date` | public read |
| POST | `/api/attendance` | session + CSRF + write rate limit |
| PUT | `/api/attendance/:id` | session + CSRF + write rate limit |

### Slides

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/slides/active` | public read + cache |
| GET | `/api/slides` | public read; **yalnız active** |
| GET | `/api/slides/:id` | public read |
| POST | `/api/slides` | session + CSRF + write rate limit |
| PUT | `/api/slides/reorder` | session + CSRF + write rate limit |
| PUT | `/api/slides/:id` | session + CSRF + write rate limit |
| DELETE | `/api/slides/:id` | session + CSRF + write rate limit |

### Slide settings

| Method | Route | Koruma |
|---|---|---|
| GET | `/api/slide-settings` | public read |
| POST | `/api/slide-settings` | session + CSRF + write rate limit |

### Log

| Method | Route | Koruma |
|---|---|---|
| POST | `/api/logs` | session + CSRF + write rate limit |
| GET | `/api/logs` | session |
| DELETE | `/api/logs/cleanup` | session + CSRF + write rate limit |

---

## 18. Güvenlik modeli

### 18.1 Session

- Session ID: 32 random byte → base64url, 43 karakter.
- Session store: process içindeki `Map`.
- TTL: 8 saat.
- Restart olduğunda tüm session'lar geçersiz olur.

### 18.2 Cookie

Cookie adı: `classroom_admin_session`

Flags:

- `HttpOnly`
- `SameSite=Strict`
- `Path=/`
- `Max-Age=28800`
- `Secure` yalnız `CLASSROOM_ADMIN_COOKIE_SECURE=true` ise

### 18.3 CSRF

- process başında random 32-byte secret,
- session ID için HMAC-SHA256,
- client 64 hex token gönderir,
- timing-safe compare,
- admin index fetch wrapper tüm `/api/` POST/PUT/PATCH/DELETE isteklerine token ekler,
- XHR slide upload da token'ı ayrıca ekler.

### 18.4 Rate limiting

- Login: 15 dakikada 5 başarısız giriş / remote address.
- Admin write: 60 istek/dakika / session.

### 18.5 CORS modeli

Uygulamada permissive `Access-Control-Allow-Origin` yoktur. Browser işlemleri same-origin tasarlanmıştır. Core testler hostile/null-origin için browser permission header'ı verilmediğini doğrular.

### 18.6 Hata redaksiyonu

Temmuz 15–16 arasında öğrenciler, settings, roller, schedule, stats, attendance, slides, log ve import alanlarında çok sayıda 500 response raw internal hata yerine sabit Türkçe mesajlara geçirildi.

Ancak tüm yol tamamlanmış değildir; aşağıdaki açık risklerde slide delete örneği vardır.

---

## 19. Statik cache ve offline kiosk davranışı

### Kiosk ana sayfası

Kiosk `index.html` içinde runtime CDN scripti kullanmaz.

Yerel pinli varlıklar:

- GSAP 3.15.0
- canvas-confetti 1.9.4
- Fredoka font
- Nunito Sans font
- Magic Park shell
- noise state görselleri
- UI 3D ikonları

### Cache policy

- HTML ve admin statik dosyaları: `no-store, no-cache, must-revalidate, private`
- diğer public assetler: `public, max-age=0, must-revalidate`
- uploads: `public, max-age=0, must-revalidate`

Geçici runtime server üzerinde header'lar canlı olarak doğrulandı.

### Önemli ayrım

**Kiosk sunum yüzeyi runtime CDN'e bağımlı değildir.**

Fakat admin `index.html`, Excel tarafında hâlâ dış CDN'den SheetJS 0.20.1 yüklemektedir. Bu nedenle uygulamanın bütünü için “tamamen offline” demek bugün doğru değildir.

---

## 20. Admin paneli — güncel ürün yüzeyi

### 20.1 Navigasyon

Ana tabs:

1. Öğrenciler
2. Görevler
3. Yoklama
4. Slaytlar

Header:

- Sistem
- Mobil Bağlan
- Çıkış Yap

### 20.2 Öğrenciler

- tek öğrenci ekleme
- cinsiyet
- opsiyonel fotoğraf
- Excel import
- öğrenci sayısı/kız/erkek admin stats
- arama
- cinsiyet filtreleme
- fotoğraf değiştirme
- silme

### 20.3 Görevler

- başkan
- 2 yardımcı
- 4 nöbetçi
- sınırsız yıldız
- mevcut roller görünümü ve kaldırma

### 20.4 Yoklama

- tarih seçme
- öğrenci listesi
- present/absent
- özet
- toplu kaydet

### 20.5 Slaytlar

- yeni slayt
- edit
- medya preview
- image/GIF/video
- content type
- metin
- duration
- video auto advance
- transition mode/type/duration
- drag/drop reorder
- slide settings
- active/pasif görünüm düğmesi — **bugün işlevsel değildir; açık riskler bölümüne bakın**

### 20.6 Sistem/Hata logları

- level filter
- component filter
- zaman filter
- refresh
- export
- eski log temizleme
- debug mode UI

### 20.7 “Mobil Bağlan” gerçekte QR değil

UI hâlâ “QR” modal isimlerini taşır fakat `showQRCode()` gerçek QR üretmez. `/api/network-info` ile yerel ana ekran adresini bulup düz metin URL gösterir. Eski dokümandaki `QRCode.js` özelliği artık güncel davranışı temsil etmez.

---

## 21. Test sistemi

### 21.1 Yerel doğrulama — 8 Ağustos 2026

Çalıştırılan komut:

`npm run test:core`

Sonuç:

- tests: **1270**
- pass: **1270**
- fail: **0**
- skipped: 0
- cancelled: 0

### 21.2 Test kapsamı ana başlıkları

Testler özellikle şunları kapsıyor:

- schedule manager / normalizer / dashboard loader
- Istanbul date utils
- admin auth config/session/cookie/API
- CSRF ve route auth
- login/write rate limits
- CORS policy
- student body/photo/import/delete
- photo path security
- role create/delete/limits/atomicity/duplicates
- attendance validation/update/transaction
- slide ID validation
- slide create/update/delete/reorder cache invalidation
- slide delete/reorder transaction atomicity
- slide media path canonicalization
- slideshow transition lock ve refresh lifecycle
- DOM XSS safety
- Excel DOM safety
- error redaction
- error logs parsing/limit/cleanup
- Magic Park asset/layout contracts
- kiosk icon system
- face-focus optimization
- kiosk runtime optimization
- static cache policy

### 21.3 Test log gürültüsü

Core suite geçmesine rağmen bazı test izolasyon senaryolarında console şu tip mesajları basıyor:

- `no such table: error_logs`
- kapatılmış test DB handle üzerinde migration denemeleri
- `Schedule schema migration failed` test teardown gürültüsü

Bunlar test assert failure değildir; hem yerelde hem başarılı GitHub run'ında görülüyor. Ancak test çıktısının güvenilirliğini/okunabilirliğini azaltan teknik borçtur ve temizlenmelidir.

---

## 22. GitHub Actions durumu

Workflow: `.github/workflows/core-tests.yml`

- push
- pull_request
- workflow_dispatch
- `permissions: contents: read`
- Node 22 ve 24 matrix
- `actions/checkout@v6`
- `actions/setup-node@v6`
- `npm ci`
- `npm run test:core`

### Aynı HEAD için kanıt

SHA: `68656301...`

**Başarılı manual run:** `31126782007`

- Node 22: success
- Node 24: success
- core tests: 1270 pass / 0 fail

**Son push run:** `31127032805`

GitHub UI sonucu `failure` görünmektedir ancak iki test job'u da test çalıştırmadan iptal edilmiştir. Annotation:

> job hosted runner tarafından birden fazla denemeye rağmen acquire edilemedi.

Dolayısıyla bu kırmızı run **kod/test regresyonu kanıtı değildir; runner acquisition altyapı sorunudur**.

CI değerlendirmesi: **Kod/test sağlığı yeşil, GitHub hosted runner teslim güvenilirliği sarı.**

---

## 23. Bağımlılık sağlığı — 8 Ağustos 2026 npm audit

`npm audit --omit=dev --json` çalıştırıldı.

Rapor:

- total: 14
- critical: 1
- high: 9
- moderate: 2
- low: 2

Doğrudan ilgili ana paketler:

- `express@4.21.2`
- `sqlite3@5.1.7`

Önemli alt zincirler:

- Express → body-parser / qs / path-to-regexp
- sqlite3 → node-gyp → make-fetch-happen / cacache / tar

`tar` zincirinde npm audit critical advisory raporluyor. `sqlite3` için audit önerisi major upgrade (`6.0.1`) gerektirebiliyor.

Bu rapor **otomatik olarak Classroom'ın uzaktan exploitable olduğu anlamına gelmez**. Bazı zincirler build/install tooling'dedir. Ancak 2026-08-08 itibarıyla bağımlılık ağacı temiz değildir ve yükseltme + regresyon testi yapılması gereklidir.

---

## 24. Eski belgelerde yazan ama artık güncel olmayan özellikler

### Hava durumu

Eski README ve `docs/PROJE_OZETI.md` hava durumu/OpenMeteo anlatır. Bugünkü `public/index.html` sekiz bölgesinde hava kartı yoktur; OpenMeteo runtime çağrısı yoktur. Yalnız `Utils.getWeatherInfo()` isimli kullanılmayan helper kalmıştır.

**Durum: legacy/dead code izi.**

### Günün kelimesi

Eski dokümanlarda `daily_word` tablosu ve `/api/word` vardır.

Bugünkü gerçek DB şemasında `daily_word` tablosu yok, `server.js` içinde `/api/word` route'u yoktur.

**Durum: kaldırılmış özellik.**

Buna rağmen `scripts/test_system.js` hâlâ `/api/word` bekler; bu script stale'dir.

### 10 equalizer teması

README hâlâ 10 equalizer teması listeler. 6 Ağustos admin sadeleştirmesinde tema seçimi ve noise sensitivity/threshold UI kaldırıldı. Noise meter tek görsel dil + otomatik kalibrasyon kullanır.

**Durum: README stale.**

### Admin Settings tab

Eski belgelerde sistem/theme/font/display/noise ayarları geniş bir admin tab olarak bulunur. Bugün ana tab yoktur ve `settings-handler.js` kaldırılmıştır.

**Durum: kaldırılmış UI.**

### Admin schedule diagnostics/draft/review

Temmuzda geliştirildi, 6 Ağustos'ta silindi.

**Durum: tarihsel prototip; bugünkü ürün özelliği değil.**

### Generative AI/Gemini

`docs/AI-TEMIZLIK-RAPORU.md` eski AI deneylerinin temizlendiğini anlatır. Bugünkü üretim kodunda generative AI entegrasyonu yoktur. “AI optimized” gibi bazı eski yorumlar yalnız etiket kalıntısıdır.

`scripts/verify-code.js` hâlâ kaldırılmış Gemini dosya ve endpointlerini aradığı için tamamen stale'dir.

---

## 25. `Classroom Projesi/` klasöründeki 9 belgenin bugünkü anlamı

### 25.1 `Classroom Ana Sayfa — A — Ayrıntılı Envanter.docx`

Değerli tasarım kabul kriterleri içeriyor: 4K, sekiz bölge, çocuk ekranında clipping/overlap olmaması, canlı 3D kimliğin korunması. Ancak ana code snapshot olarak daha eski HEAD'e dayanıyor.

**Kullanım:** tasarım niyeti ve kabul kriteri.

### 25.2 `Classroom Ana Sayfa — B — Yapılacaklar ve Kabul Planı.docx`

P1/P2/P3 backlog içeriyor. Maddelerin önemli bölümü 2 ve 6 Ağustos commitleriyle kapatılmış veya şekil değiştirmiş durumda.

**Kullanım:** tarihsel roadmap; güncel backlog diye kopyalanmamalı.

### 25.3 `Classroom Projesi — Güncel Durum ve Aktif Görev.docx`

16 Temmuzdaki `bcab7bc` çevresini ve “ciddi risk taraması” aşamasını anlatıyor.

**Kullanım:** 16 Temmuz güvenlik geçişinin tarihi.

### 25.4 `Classroom Projesi — Güncel Özellik Envanteri ve Açık Riskler.docx`

O tarihteki admin schedule UI'sını ve riskleri anlatır.

**Kullanım:** güvenlik/refactor öncesi durum karşılaştırması.

### 25.5 `Yeni Sohbet Devir Belgesi — 15 Temmuz 2026.docx`

Error redaction ve dar scope güvenlik işlerinin ayrıntılı kanıtını verir.

**Kullanım:** security hardening geçmişi.

### 25.6 `Codex Devir Notu ... PR #22.docx`

Slide deletion transaction isolation çalışmasının tarihini verir.

**Kullanım:** atomicity kararının kökeni.

### 25.7 `Geçici ChatGPT Proje Devir Notu.md`

Çok eski branch ve P0/P1 listesidir. Örneğin auth olmadığı dönemi anlatır.

**Kullanım:** yalnız tarihsel; bugün bağlayıcı değildir.

### 25.8 `Yeni Codex Oturumu Devir Belgesi — 16 Temmuz 2026.docx`

Shared transaction P1'lerin bittiği ve design aşamasından önce risk scan beklendiği noktayı anlatır.

**Kullanım:** güvenlik→tasarım geçiş sınırı.

### 25.9 `Classroom Kiosk Ana Sayfa — 3D İkon Sistemi Geçiş Belgesi.docx`

`06849cf` çevresindeki 3D ikon/4K sistemini ve o sırada commit edilmemiş slide transition WIP'ini anlatır.

**Bugünkü önemli düzeltme:** Belgede “uncommitted WIP” olan geçiş çalışması daha sonra commit edilmiştir ve `5738200`/`6865630` ile daha da geliştirilmiştir.

---

## 26. Güncel doğrulanmış açık sorunlar ve riskler

Aşağıdaki maddeler varsayım değil; mevcut kod/runtime üzerinden doğrulanmış güncel bulgulardır.

### P1 — Slayt Aktif/Pasif özelliği kırık

Admin `toggleSlideActive()` şu body'yi yollar:

`{ "is_active": 0|1 }`

Fakat backend `PUT /api/slides/:id` update edilebilir alanlar listesinde `is_active` yoktur.

Geçici DB kopyasında canlı test:

- login başarılı,
- CSRF token 64 karakter,
- `PUT /api/slides/<id>` + `{is_active:0}`
- sonuç: **HTTP 400**
- mesaj: `Güncellenecek alan belirtilmedi`

Ek sorun: `GET /api/slides` yalnız `is_active = 1` satırlarını döndürür. Backend update desteği eklense bile pasif slayt admin listesinden kaybolacağı için tekrar aktif etme UX'i ayrıca çözülmelidir.

### P1 — Admin başarı/hata geri bildirimi görünür değil

`Utils.showSuccess()` bugün no-op'tur. `Utils.showError()` yalnız logger'a yazar.

Admin kodunun birçok CRUD akışı bunlara dayanır. Sonuç: işlem başarılı/başarısız olsa bile öğretmen görünür toast/banner görmeyebilir.

Bu madde eski P1 backlog'dan bugüne taşınmış gerçek bir açık iştir.

### P1/P2 — Default admin credential modeli fail-closed değil

`CLASSROOM_ADMIN_USERNAME` yoksa username `admin` olur.

`CLASSROOM_ADMIN_PASSWORD` yoksa login tamamen kapanmak yerine kod içindeki sabit password digest fallback'i kullanılır.

Eski security plan “password yoksa admin erişimi kapalı olmalı” hedefini tarif ediyordu; mevcut uygulama bununla çelişiyor.

Öneri: üretim davranışını fail-closed yapmak veya en azından zorunlu first-run secret provisioning modeli kurmak.

### P1/P2 — Slide delete hata redaksiyonu tam değil

Slide delete transactional route'un bazı failure path'lerinde response hâlâ `err.message` / SQLite hata metni döndürebiliyor.

Temmuzdaki diğer route redaction standardıyla tutarsızdır.

### P1/P2 — Güncel npm dependency advisories

`npm audit --omit=dev` 14 vulnerability raporladı; 1 critical / 9 high dahil.

Özellikle Express 4.21.2 alt zinciri ve sqlite3 5.1.7 build zinciri incelenmelidir.

### P2 — Admin SheetJS sürüm/online bağımlılık tutarsızlığı

Backend/package dependency:

- SheetJS 0.20.3 package

Admin HTML runtime CDN:

- SheetJS 0.20.1

Sonuç:

- admin internet bağımlılığı taşıyor,
- iki farklı sürüm var,
- backend güvenlik güncellemesi client scriptine yansımamış.

### P2 — Admin slide settings response kontrolü zayıf

Üç settings POST isteği sequential gönderiliyor fakat her `fetch` için `response.ok` kontrol edilmiyor. HTTP 4xx/5xx response Promise'i reject etmediği için fonksiyon hata olmamış gibi devam edebilir.

Üstelik son `showSuccess` görünür değildir.

### P2 — Admin “Bugün” tarihi UTC kullanıyor

`setTodayDate()`:

`new Date().toISOString().split('T')[0]`

kullanıyor. Bu UTC tarihidir. Türkiye'de gece/UTC sınırında backend'in İstanbul günü ile admin input günü ayrışabilir.

Backend stats tarafında İstanbul tarih anahtarı düzeltilmişken admin helper eski kalmıştır.

### P2 — Dinamik viewport resize sonrası GSAP titlebar merkezleme

Fresh-load 4K ve 1366 testleri düzgün. Ancak yüklemeden sonra viewport değiştirilirse ilk beş titlebar'ın yüzde merkezleme transformu GSAP tarafından piksel inline transform olarak sabit kaldığından kayma oluşabiliyor.

Sabit kiosk ekranında düşük risk; responsive test/hotplug/devtools resize senaryosunda gerçek regresyon.

### P2 — Atatürk fallback seed'i self-healing değil

Fallback set seed marker ile yalnız bir kez eklenir. Admin bir fallback satırını silerse marker kaldığı için restart'ta otomatik geri gelmez.

“Fallback her koşulda var” beklentisi varsa davranış güçlendirilmelidir.

### P2 — CI son push kırmızı ama runner altyapısı kaynaklı

Kod hatası değil; yine de branch/check UX'ini kırmızı gösteriyor. Gerekirse run rerun edilerek branch görünümü temizlenmeli.

### P3 — Stale bakım scriptleri

- `scripts/test_system.js`: kaldırılmış `/api/word`, auth'suz admin 200 beklentisi.
- `scripts/verify-code.js`: kaldırılmış Gemini dosya/API'lerini arıyor.

Bunlar yanlış negatif sonuç üretir; kaldırılmalı veya güncellenmelidir.

### P3 — Stale dokümantasyon

- README Node 18+ diyor; package engines Node >=22 <25.
- README 10 equalizer teması diyor; artık yok.
- README hava durumu diyor; aktif kiosk'ta yok.
- `docs/PROJE_OZETI.md` eski dosya ağacını, daily_word ve admin özelliklerini anlatıyor.
- `AI_PROJECT_CONTEXT.md` Temmuz admin schedule prototiplerini güncelmiş gibi taşıyor.

### P3 — Legacy/orphan kod

- `backend/config.js` mevcut backend tarafından import edilmiyor görünmektedir.
- `backend/utils.js` mevcut server tarafından import edilmiyor görünmektedir.
- `settings-loader.js` hâlâ displayMode/colorTheme/fontSize/autoRefresh gibi artık admin'den yönetilmeyen eski özellikleri poll eder.
- `display-mode-manager.js` bu legacy settings yüzeyiyle ilişkili kalmıştır.
- `public/css/style.css` 4740 satır, üstüne 1433 satır Magic Park override vardır; stil borcu büyüktür.
- `backend/server.js` 2807 satırlık monolit hâlâ bakım maliyeti yaratır.
- Admin HTML'de çok fazla inline style vardır.

### P3 — Test console gürültüsü

Core suite yeşil olsa da test DB startup/teardown logları gerçek failure loglarıyla karışmaktadır.

### Kabul dışı / repo ile doğrulanamayan

Eski belgelerdeki **gerçek 55" fiziksel 4K TV kabul testi** repo üzerinden doğrulanamaz. Browser emülasyonu iyi görünse bile fiziksel TV testi ayrı kalite kapısı olarak kalmalıdır.

---

## 27. Eski roadmap maddelerinin bugünkü durumu

| Tarihsel madde | Bugünkü durum |
|---|---|
| Bilgi hiyerarşisi / 4K kart taşmaları | Büyük ölçüde kapalı; Magic Park ile yeniden tasarlandı; fiziksel TV kabulü hâlâ gerekli |
| Gerçek TV doğrulaması | **Açık** |
| Kiosk/fullscreen reliability | `start.sh` gerçek browser `--kiosk` kullanıyor; fiziksel/boot lifecycle doğrulaması ayrıca yapılmalı |
| Mikrofon izin/hata UX'i | **Büyük ölçüde kapalı** — retry ve sakin state'ler var |
| Slideshow transition quality | **Büyük ölçüde kapalı** — professional pool + lock + reduced motion + generation invalidation |
| Slideshow performansı | **Önemli ölçüde iyileşti** — one-item preload, DOM guards, WebP, cache |
| Face crop/portrait performance | **Kapatılmışa yakın** — 320px analysis + queue/cache |
| Configurable class identity | **Açık** — `2/D` kimliği hâlâ hardcoded tasarım başlıklarında |
| Admin sadeleştirme | **Kapalı** — günlük dört tab modeline geçildi |
| Admin visible feedback | **Açık** |
| Slayt active/passive | **Açık ve kırık** |
| Kod/style cleanup | **Kısmen açık** |
| Güvenlik risk scan | Büyük bölümü kapatılmış; default credential, slide delete redaction ve dependency audit yeni/kalıcı maddeler |

---

## 28. Güncel geliştirme için önerilen sıra

Bu bölüm “yapıldı” değildir; mevcut tomografiden çıkan önerilen sıra budur.

### Aşama 1 — Kırık kullanıcı fonksiyonlarını düzelt

1. Slide `is_active` update contract'ını backend + test ile ekle.
2. Admin slide listesine inactive satırları da yönetilebilir biçimde getir.
3. Gerçek toast/banner success/error sistemi kur.
4. Slide settings response.ok kontrolü ve atomik/tek endpoint UX'i değerlendir.
5. Admin bugün tarihini İstanbul timezone ile hizala.

### Aşama 2 — Güvenlik ve dependency bakım turu

1. Admin default credential fallback'ini fail-closed hale getir.
2. Slide delete raw DB hata response'larını redakte et.
3. Express/qs/body-parser/path-to-regexp güncellemelerini kontrollü uygula.
4. sqlite3 6.x geçişini ayrı branch/test turunda değerlendir.
5. `npm audit` bulgularını runtime erişilebilirlik açısından sınıflandır.
6. Admin SheetJS'i 0.20.3+ ve mümkünse tamamen local vendor hale getir.

### Aşama 3 — Kiosk kabul turu

1. 3840×2160 fiziksel 55" TV.
2. 2560×1440.
3. 1920×1080.
4. 1366×768.
5. Mikrofon var/yok/izin reddi.
6. Çok uzun öğrenci adı.
7. 0 rol / 1 rol / tam rol seti.
8. Fotoğraf yatay/dikey/kare.
9. 1 slide / 7 slide / video / bozuk media.
10. Live resize/hotplug ile titlebar GSAP transform testi.

### Aşama 4 — Temizlik ve dokümantasyon

1. `scripts/test_system.js` güncelle veya kaldır.
2. `scripts/verify-code.js` kaldır.
3. README'yi bu tomografiye göre güncelle.
4. `AI_PROJECT_CONTEXT.md` ve `docs/PROJE_OZETI.md` için açıkça `HISTORICAL/STALE` etiketi veya güncelleme.
5. unused backend config/utils doğrula ve temizle.
6. settings/display-mode legacy katmanını ürün kararıyla ya yeniden bağla ya kaldır.
7. admin inline styles'i component/class bazlı CSS'e taşı.
8. `server.js` domain router/service parçalarına bölme planı çıkar.

---

## 29. Test edilmeden değiştirilmemesi gereken kritik sözleşmeler

Yeni geliştirmede aşağıdakiler regress edilmemelidir:

- öğrenci fotoğraflarının `/uploads/...` web path olarak saklanması,
- managed path dışında dosya silinmemesi,
- default avatarların silinmemesi,
- student/role/slide ID strict validation,
- bulk attendance atomikliği,
- president replacement atomikliği,
- VP=2, duty=4 limitlerinin yarış koşuluna açık olmaması,
- slide reorder transaction ve cache invalidation sırası,
- slide create/update/delete sonrası cache invalidation,
- slideshow transition lock,
- slideshow generation invalidation,
- unchanged slide refresh'te rotation restart olmaması,
- student name DOM escaping,
- Excel import DOM escaping,
- same-origin API yolları,
- admin session + CSRF + rate limit middleware sırası,
- error response redaction,
- kiosk'ta runtime CDN olmaması,
- 16:9 Magic Park stage geometrisi,
- reduced motion desteği,
- face focus downsample + duplicate queue collapse.

---

## 30. Kiosk ile admin arasında bugün bilinmesi gereken önemli ayrımlar

| Konu | Kiosk | Admin |
|---|---|---|
| Runtime CDN | Yok | SheetJS CDN var |
| Authentication | Public read display | Login gerekir |
| Ana amaç | Sürekli gösterim | Öğretmen CRUD |
| Tasarım dili | Magic Park / 3D / çocuk odaklı | Glass/premium utility UI |
| Refresh | Otomatik polling | Kullanıcı aksiyonu + load |
| Schedule UI | State/countdown gösterir | Artık edit UI yok |
| Noise | Otomatik kalibrasyon | Ayar UI kaldırıldı |
| Slides | active/fallback gösterir | CRUD/reorder var; active toggle kırık |
| Fullscreen | start.sh/browser kiosk yolu | Normal web UI |

---

## 31. Bugünkü ürün olmayan legacy kalıntılar

Aşağıdaki kelimeler/dosyalar görülürse “aktif feature” varsayılmamalıdır:

- weather helper
- `message`/`city` default settings
- colorTheme
- displayMode
- fontSize
- autoRefreshInterval
- eski QR isimlendirmeleri
- AI/Gemini verification scriptleri
- eski schedule admin prototype belgeleri

Bunlar ya kullanılmayan helper, ya eski ayar veri modeli, ya da geçmiş geliştirme izi olabilir.

---

## 32. Gerçek çalışma zamanı incelemesinin sonucu

Tomografi için gerçek DB'ye dokunmamak adına `backend/classroom.db` `/tmp` içine kopyalandı ve ayrı bir portta denetim server'ı çalıştırıldı.

Doğrulananlar:

- ana sayfa HTTP 200,
- tüm kiosk JS/CSS/font/vendor/local image istekleri 200/304,
- normalize schedule API 200,
- roles/stats/slides active API 200,
- 4K DOM stage tam 3840×2160,
- body overflow yok,
- fresh 4K titlebar overflow yok,
- fresh 1366×768 titlebar overflow yok,
- console error/warn yok,
- mikrofon olmayan denetim bağlamında UI doğru “Ses Ölçer Dinlenmede / Tekrar Dene” state'ine geçti,
- Atatürk fallback slideshow gerçekten render oldu,
- mevcut roller ve uzun isimli fixture içeriği DOM'a render oldu,
- cache headers beklenen şekilde geldi,
- temp admin login + CSRF akışı çalıştı,
- temp DB üzerinde slide active toggle'ın 400 döndüğü canlı doğrulandı.

Gerçek `backend/classroom.db` bu runtime deneyi için değiştirilmedi.

---

## 33. Bu belgeye göre “en son kaldığımız yer”

En son gerçek geliştirme noktası Temmuzdaki security WIP veya `06849cf` değildir.

**Son kabul edilebilir teknik taban:**

`6865630 — feat: refresh classroom admin and kiosk`

Bu noktada:

- Magic Park kiosk tasarımı repo içinde,
- 4K layout katmanı aktif,
- yerel fonts/vendor assets aktif,
- noise meter otomatik kalibrasyonlu yeni UI'da,
- admin sadeleştirilmiş,
- eski schedule admin prototipleri kaldırılmış,
- face focus/runtime/cache optimizasyonları eklenmiş,
- 1270 testlik güncel core suite yeşil,
- aynı SHA Node 22/24 GitHub CI'da bir kez başarıyla doğrulanmış,
- son push kırmızısı runner provisioning kaynaklı,
- fakat admin slide active/pasif ve görünür geri bildirim gibi birkaç gerçek ürün açığı hâlâ çözülmemiş.

Dolayısıyla bundan sonraki oturumda eski Temmuz task listesine geri dönmek yerine **önce Bölüm 26'daki doğrulanmış güncel açıklar** esas alınmalıdır.

---

## 34. Eski dokümanlar için kullanım etiketi

| Belge | Etiket |
|---|---|
| `CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md` | **CURRENT SOURCE OF TRUTH** |
| `Classroom Projesi/01 - Güncel Belgeler/*` | DESIGN/ROADMAP HISTORY + kısmen geçerli kabul kriterleri |
| `Classroom Projesi/02 - Devir ve Oturum Notları/*` | HISTORICAL HANDOFF |
| `Classroom Projesi/03 - Tasarım ve Kiosk/*` | DESIGN HISTORY; 06849cf sonrası superseded |
| `AI_PROJECT_CONTEXT.md` | STALE AFTER AUG-06 |
| `docs/PROJE_OZETI.md` | STALE ARCHITECTURE/FEATURE INVENTORY |
| `docs/AI-TEMIZLIK-RAPORU.md` | HISTORICAL CLEANUP RECORD |
| `docs/security/admin-access-control-plan.md` | SECURITY DESIGN HISTORY; uygulamayla bazı farkları var |
| `README.md` | BASIC INTRO; several sections stale |

---

## 35. Son karar özeti

Classroom bugün basit bir HTML dashboard değildir. Güçlü test tabanı, transaction güvenliği, auth/CSRF katmanı, schedule fallback mekanizması, medya yönetimi, 4K Magic Park görsel sistemi ve optimize edilmiş kiosk runtime'ı olan gerçek bir sınıf ürünü haline gelmiştir.

En büyük geçmiş risklerin çoğu Temmuz–Ağustos geliştirmelerinde kapatılmıştır. Buna karşın bugünkü kaliteyi ileri taşımak için yeni iş listesi geçmiş dokümanlardan değil mevcut HEAD'deki gerçek kusurlardan üretilmelidir.

**Bugünkü doğru başlangıç cümlesi:**

> Classroom `main` dalı `6865630` tabanında, 2/D Sihirli Pano / Magic Park kiosk tasarımına ve sadeleştirilmiş dört sekmeli admin paneline ulaşmıştır. Core testleri 1270/1270 geçmektedir. Bundan sonraki öncelik yeni büyük özellik eklemekten önce kırık slide active/pasif akışını, admin geri bildirimini, kalan güvenlik/dependency borcunu ve stale bakım/dokümantasyon katmanını temizlemektir; ardından fiziksel 55" 4K kabul turu yapılmalıdır.
