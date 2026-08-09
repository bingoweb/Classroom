# Classroom Projesi — Önceliklendirilmiş Düzeltme Planı

**Tarih:** 8 Ağustos 2026  
**Durum:** Aktif / yaşayan düzeltme belgesi  
**Esas kod tabanı:** `main` — `68656301d9cbcd5bce42fafa5f1cc02488c134d5` — `feat: refresh classroom admin and kiosk`  
**Ana teknik referans:** `CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`

---

## 0. Belgeleme kuralı — bundan sonra bağlayıcı

Classroom projesine ait geliştirme belgeleri bundan sonra Google Drive üzerinde oluşturulmayacak veya ana çalışma kaynağı olarak tutulmayacaktır.

Yeni çalışma düzeni:

- Tüm yeni proje belgeleri repo içindeki **`Classroom Projesi/`** klasöründe tutulacaktır.
- Yeni belgeler **yalnız Markdown (`.md`)** formatında oluşturulacaktır.
- Güncel durum, düzeltme planı ve aktif görev belgeleri mümkün olduğunca `Classroom Projesi/01 - Güncel Belgeler/` altında tutulacaktır.
- Oturum/devir notları gerekiyorsa `Classroom Projesi/02 - Devir ve Oturum Notları/` altında `.md` olarak tutulacaktır.
- Tasarım karar belgeleri gerekiyorsa `Classroom Projesi/03 - Tasarım ve Kiosk/` altında `.md` olarak tutulacaktır.
- Eski `.docx` dosyaları tarihsel kaynak olarak kalabilir; ancak yeni `.docx` oluşturulmayacaktır.
- Kod değiştikçe bu belge “yapıldı / doğrulandı / bekliyor” durumlarıyla güncellenecektir.
- Bir düzeltme yalnız kod yazıldığı için tamamlanmış sayılmayacaktır. İlgili testler, `npm run test:core` ve gerekiyorsa gerçek browser/kiosk doğrulaması geçmeden madde kapatılmayacaktır.

---

# 1. Bu planın amacı

Tomografi çalışmasında proje genel olarak sağlıklı görünmekle birlikte, bugünkü HEAD üzerinde kullanıcıya doğrudan yanlış davranış üreten, güvenlik sınırını zayıflatan veya bakım güvenilirliğini azaltan bazı gerçek açıklar bulundu.

Bu belge bu açıkları önem sırasına koyar ve her biri için şunları tanımlar:

1. **Sorun tam olarak nedir?**
2. **Neden şimdi düzeltilmelidir?**
3. **Nasıl düzeltilecektir?**
4. **Hangi dosyalara dokunulacaktır?**
5. **Hangi yeni testler yazılacaktır?**
6. **Hangi mevcut davranışlar korunacaktır?**
7. **Madde hangi kabul kriteriyle kapatılacaktır?**

Amaç rastgele temizlik yapmak değil, risk ve bağımlılık sırasına göre kontrollü ilerlemektir.

---

# 2. Öncelik mantığı

Bu planda öncelik aşağıdaki ölçütlere göre verildi:

### P0 — Çalışmayı durduran / veri kaybettiren

Şu an P0 seviyesinde doğrulanmış açık bulunmadı.

### P1 — Kullanıcıya yanlış davranış veren veya güvenlik sınırını doğrudan etkileyen

Bunlar önce düzeltilecek.

### P2 — Güvenilirlik, bakım, bağımlılık ve kiosk dayanıklılığı

P1'ler sabitlendikten sonra yapılacak.

### P3 — Refactor, stale kod ve dokümantasyon temizliği

Davranış değişikliklerinin tamamlanmasından sonra yapılacak.

---

# 3. Uygulanacak ana sıra

## Faz 0 — Güvenli geliştirme tabanını sabitle

1. Mevcut HEAD ve test sonucunu başlangıç referansı olarak kaydet.
2. Her düzeltme için önce regresyon testi yaz.
3. Her maddede küçük ve geri alınabilir commit kullan.

## Faz 1 — Kullanıcıya doğrudan yanlış davranış veren admin sorunları

1. **Slayt Aktif/Pasif yönetimini düzelt.**
2. **Admin başarı/hata bildirimlerini görünür hale getir.**
3. **Yoklamadaki “Bugün” tarihini İstanbul saatine bağla.**
4. **Slayt ayarlarının başarısız HTTP cevaplarını doğru yakala.**

## Faz 2 — Güvenlik sınırını kapat

5. **Admin parola modelini fail-closed hale getir.**
6. **Slide delete ham SQLite hata sızıntısını kapat.**
7. **Admin SheetJS'i yerelleştir ve sürümü tekleştir.**

## Faz 3 — Bağımlılık ve platform güvenilirliği

8. **npm audit bulgularını kontrollü paket yükseltmeleriyle azalt.**
9. **GitHub Actions runner kaynaklı kırmızı koşuyu temizle ve CI görünümünü doğrula.**

## Faz 4 — Kiosk dayanıklılığı

10. **Dinamik resize sonrası GSAP titlebar kaymasını düzelt.**
11. **Atatürk fallback slaytlarının sistem sahipliği davranışını netleştir ve güçlendir.**
12. **Fiziksel 4K kiosk kabul turunu tamamla.**

## Faz 5 — Teknik borç ve proje temizliği

13. **Stale bakım scriptlerini kaldır veya güncelle.**
14. **Stale README / AI context / proje özetlerini güncelle.**
15. **Legacy frontend settings katmanını değerlendir.**
16. **Kullanılmayan backend config/utils kopyalarını doğrula ve temizle.**
17. **Büyük `server.js`, admin inline CSS ve çift kiosk CSS katmanı için ayrı refactor planı çıkar.**

---

# 4. FAZ 0 — Değişiklikten önce tabanı sabitle

**Öncelik:** Zorunlu başlangıç  
**Kod değişikliği:** Hayır / test disiplini  
**Durum:** ⬜ Bekliyor

## 4.1 Başlangıç gerçekliği

8 Ağustos 2026 tomografisinde:

- `main` = `6865630`
- `origin/main` aynı committeydi.
- `npm run test:core` = **1270 / 1270 pass**
- aynı SHA GitHub Actions Node 22 + Node 24 manual run'da başarılı.
- çalışma ağacındaki yeni dokümanlar dışında kaynak kod değişmemişti.

Bu nokta düzeltme serisinin “önceki sağlıklı durum” referansıdır.

## 4.2 Çalışma kuralı

Her gerçek düzeltme şu sırada yapılmalıdır:

1. Sorunu tekrar üret.
2. Sorunu yakalayan test ekle; mümkünse test önce kırmızı olsun.
3. En küçük davranış değişikliğini uygula.
4. İlgili hedef testi çalıştır.
5. İlgili komşu testleri çalıştır.
6. `npm run test:core` çalıştır.
7. Gerekliyse geçici DB ile gerçek HTTP/browser smoke test yap.
8. `git diff --check` çalıştır.
9. Bu belgedeki maddeyi güncelle.
10. Sonra commit.

## 4.3 Neden bu faz önce?

Projenin test tabanı geniş. Büyük bir toplu “temizlik commit'i” hem regresyon kaynağını gizler hem de sorun çıkarsa geri dönüşü zorlaştırır. Bu nedenle düzeltmeler davranış bazlı ve küçük commitler halinde yapılmalıdır.

---

# 5. P1-1 — Slayt Aktif/Pasif yönetimini düzelt

**Öncelik:** P1 / ilk gerçek kod işi  
**Kullanıcı etkisi:** Yüksek  
**Risk:** Orta  
**Bağımlılık:** Yok  
**Durum:** 🟩 Tamamlandı — 8 Ağustos 2026

## 5.1 Doğrulanmış sorun

Admin UI'da her slayt için:

- `Aktif`
- `Pasif`

butonu gösteriliyor.

Frontend:

`public/admin/admin.js`

`toggleSlideActive()` şu body'yi gönderiyor:

```json
{ "is_active": 0 }
```

veya:

```json
{ "is_active": 1 }
```

Fakat backend `PUT /api/slides/:id` içinde destructure edilen/update edilebilen alanlarda `is_active` bulunmuyor.

Sonuç:

```text
HTTP 400
Güncellenecek alan belirtilmedi
```

Bu davranış geçici DB kopyasında canlı login + CSRF ile doğrulandı.

## 5.2 İkinci sorun: pasif slayt tekrar açılamaz

Bugünkü:

`GET /api/slides`

sorgusu:

```sql
SELECT * FROM slides WHERE is_active = 1 ORDER BY display_order ASC
```

Admin aynı endpoint'i listeleme için kullanıyor.

Yalnız backend update'e `is_active` eklenirse şu problem oluşur:

1. admin bir slaytı pasif yapar,
2. `fetchSlides()` yeniden çalışır,
3. `/api/slides` yalnız active satır döndürür,
4. pasif slayt admin listesinden kaybolur,
5. kullanıcı tekrar aktif yapamaz.

Bu nedenle yalnız tek satır backend değişikliği yeterli değildir.

## 5.3 Seçilen çözüm mimarisi

Kiosk ve admin okuma sözleşmesi ayrılmalıdır.

### Kiosk sözleşmesi değişmeyecek

`GET /api/slides/active`

yalnız kiosk için active/fallback mantığını sürdürür.

### Mevcut public `/api/slides` davranışı mümkün olduğunca korunacak

Mevcut testler ve geriye uyumluluk nedeniyle bu endpoint'i doğrudan “tüm slaytları döndür” şeklinde değiştirmek gereksiz risk yaratır.

### Admin için ayrı yönetim listesi eklenecek

Önerilen endpoint:

`GET /api/admin/slides`

Özellikleri:

- `requireAdminSession`
- active + inactive tüm slaytları döndürür
- `display_order ASC`
- `media_path` mevcut güvenli normalize fonksiyonuyla normalize edilir
- hata halinde ham DB mesajı döndürmez

Admin `fetchSlides()` bu endpoint'e geçirilecektir.

## 5.4 Update contract

Mevcut:

`PUT /api/slides/:id`

`is_active` alanını da desteklemelidir.

Kabul edilen değerler bilinçli olarak dar tutulmalıdır:

- boolean `true/false`
- veya tam sayı `1/0`

Şunlar reddedilmelidir:

- `"1"`
- `"0"`
- `2`
- `-1`
- `null`
- object/array

Normalize edilen DB değeri yalnız `0` veya `1` olmalıdır.

## 5.5 Cache davranışı

`is_active` değişimi kiosk active setini doğrudan etkiler.

Bu nedenle başarılı update sonrası mevcut:

- `slidesCache = null`
- `cacheTimestamp = null`

invalidasyonu mutlaka korunmalıdır.

## 5.6 Admin UX

Admin listesinde:

- aktif slaytlar normal görünür,
- pasif slaytlar görsel olarak soluk/etiketli görünür,
- buton aktif → “Pasif Yap”,
- pasif → “Aktif Yap” olmalıdır.

Pasif slayt listeden kaybolmamalıdır.

## 5.7 Dokunulacak dosyalar

Beklenen minimum:

- `backend/server.js`
- `public/admin/admin.js`
- `public/admin/style.css`
- yeni veya mevcut slide test dosyaları
- gerekirse `package.json` test script listesi

## 5.8 Yazılacak testler

### Backend update

Yeni testler:

1. `is_active: 0` → 200 ve DB 0.
2. `is_active: 1` → 200 ve DB 1.
3. boolean true/false normalize edilir.
4. geçersiz değer → 400.
5. nonexistent slide → mevcut 404 korunur.
6. update başarıyla commit olmadan cache invalid edilmez.
7. update başarıdan sonra active cache invalid edilir.

### Admin list endpoint

1. auth yok → 401.
2. active + inactive birlikte döner.
3. order korunur.
4. media path normalize edilir.
5. DB error → sabit redacted 500.

### Frontend

1. `fetchSlides()` admin endpoint'ini kullanır.
2. pasif slayt listede kalır.
3. doğru buton etiketi gösterilir.

## 5.9 Regresyon olarak korunacaklar

- `/api/slides/active` davranışı değişmeyecek.
- Atatürk fallback seçim mantığı bozulmayacak.
- reorder transaction bozulmayacak.
- media path security bozulmayacak.
- create/update/delete cache testleri yeşil kalacak.
- route order `/api/slides/reorder` → `/api/slides/:id` korunacak.

## 5.10 Kapanış kriteri

Bu madde ancak:

- admin'de bir slayt pasif yapılabiliyor,
- listede kalıyor,
- tekrar aktif yapılabiliyor,
- kiosk active endpoint'i anında yeni seti görüyor,
- hedef testler + core suite geçiyor

ise tamamlanmış sayılacaktır.

## 5.11 Uygulama ve doğrulama kaydı — 8 Ağustos 2026

Bu madde tamamlandı.

Uygulanan değişiklikler:

- `backend/server.js` içinde `PUT /api/slides/:id`, `is_active` alanını destekleyecek şekilde genişletildi.
- Kabul edilen değerler boolean `true/false` ve tam sayı `0/1` ile sınırlandı; diğer tip/değerler `400` ile reddediliyor.
- Değer SQLite için yalnız `0/1` biçimine normalize ediliyor.
- Başarılı aktiflik değişiminde mevcut slideshow cache invalidation yolu korunuyor.
- Kiosk için `/api/slides/active` ve geriye uyumluluk için mevcut public `/api/slides` sözleşmesi değiştirilmedi.
- Yönetim amacıyla auth korumalı `GET /api/admin/slides` eklendi; active ve inactive slaytları `display_order ASC` sırasıyla döndürüyor, medya yollarını normalize ediyor ve DB hatalarını kullanıcıya sızdırmıyor.
- `public/admin/admin.js` artık yönetim listesini `/api/admin/slides` üzerinden alıyor.
- Pasif slaytlar listede kalıyor; `is-inactive` durumu ile görsel olarak ayrılıyor.
- Buton metinleri açık biçimde `Pasif Yap` / `Aktif Yap` oldu.
- `public/admin/style.css` içine pasif slayt görünümü eklendi.
- Yeni regresyon testleri `tests/admin-slide-management.test.js` ve `tests/admin-slides-list.test.js` olarak eklendi ve `test:core` kapısına dahil edildi.
- Mevcut `slides-update-id` ve `slides-update-cache` testleri strict active-state ve cache invalidation senaryolarıyla genişletildi.

TDD kanıtı:

- Üretim kodu değiştirilmeden önce yeni testler çalıştırıldı ve tam olarak beklenen eksiklerde kırmızı oldu: `/api/admin/slides` yoktu, admin `/api/slides` kullanıyordu ve `is_active` update `400` dönüyordu.
- Düzeltme sonrası hedef test seti: **32 / 32 pass**.
- Komşu slayt/auth regresyon seti: **168 / 168 pass**.
- Yeni testler `test:core` içine dahil edildikten sonraki son tam koşu: **1282 / 1282 pass, 0 fail**.

Gerçek HTTP smoke testi gerçek `classroom.db` dosyasına dokunmadan `/tmp` kopyası üzerinde yapıldı:

1. admin login başarılı,
2. CSRF token alındı,
3. seçilen aktif slayt `is_active=0` yapıldı,
4. slayt admin listesinde `is_active=0` olarak kaldı,
5. kiosk `/api/slides/active` listesinden çıktı,
6. aynı slayt yeniden `is_active=1` yapıldı,
7. admin listesinde aktif oldu,
8. kiosk active listesine geri döndü.

Smoke sonucu:

`SMOKE_PASS slide deactivate/list/reactivate/kiosk-refresh`

Bu nedenle P1-1 kapanış kriterlerinin tamamı karşılandı.

### Commit ve GitHub kaydı

- Commit: `eb52bcb8fb4814ee8e99762d624fab1812cf12ec`
- Mesaj: `fix: complete slide activation management`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası `git fetch --prune origin` ile yerel `HEAD` ve `origin/main` aynı SHA olarak doğrulandı.

---

# 6. P1-2 — Admin başarı/hata geri bildirimini görünür yap

**Öncelik:** P1  
**Kullanıcı etkisi:** Yüksek  
**Risk:** Düşük-Orta  
**Bağımlılık:** Slayt toggle düzeltmesinden hemen sonra  
**Durum:** 🟩 Tamamlandı — 8 Ağustos 2026

## 6.1 Sorun

`public/js/utils.js`:

`showError()` yalnız logger'a yazar.

`showSuccess()` fiilen hiçbir şey yapmaz.

Admin'in onlarca işlem akışı buna güvenmektedir:

- öğrenci ekleme/silme
- görev atama/kaldırma
- fotoğraf yükleme
- Excel import
- slayt create/update/delete/reorder/toggle
- slide settings
- yoklama

Bu nedenle öğretmen işlem sonucunu göremeyebilir.

## 6.2 Seçilen çözüm

Global `alert()` kullanılmayacaktır.

Admin'e erişilebilir bir toast/notification bölgesi eklenecektir.

### HTML

`public/admin/index.html` içine tek bir notification region:

- `aria-live="polite"` success/info
- error için gerektiğinde `role="alert"`
- DOM'a güvenli metin ekleme

### JS

`Utils.showSuccess(message)` ve `Utils.showError(message, error)`:

- admin notification region varsa görünür bildirim üretir,
- kiosk sayfasında region yoksa görsel UI oluşturmaz,
- error logger davranışı korunur,
- `innerHTML` yerine `textContent` kullanılır,
- aynı anda çok fazla toast birikmez,
- önceki timer temizlenir,
- kullanıcı tıklayarak kapatabilir veya birkaç saniye sonra otomatik kapanır.

## 6.3 Neden Utils üzerinden?

Admin kodunda onlarca mevcut çağrı zaten `Utils.showSuccess/Error` kullanıyor.

Her handler'ı tek tek yeniden yazmak yerine shared sözleşmeyi doğru hale getirmek:

- daha az kod,
- daha az regresyon,
- mevcut çağrıların tamamını tek seferde düzeltir.

## 6.4 Görsel davranış

Success:

- yeşil/pozitif ama sakin,
- kısa mesaj.

Error:

- belirgin kırmızı/uyarı,
- mesaj okunabilecek kadar uzun görünür.

Mobil:

- ekran dışına taşmaz,
- admin formunu kapatmaz.

## 6.5 Testler

1. success metni DOM'a text olarak yazılır.
2. error metni DOM'a text olarak yazılır.
3. `<script>` benzeri mesaj HTML olarak çalışmaz.
4. error logger'a yine gider.
5. notification region olmayan kiosk ortamında exception oluşmaz.
6. `aria-live`/`role` contract korunur.

## 6.6 Kapanış kriteri

Öğrenci, rol, slayt ve yoklama alanlarında en az birer başarılı ve başarısız işlem gerçek admin browser'ında denenip görünür sonuç vermelidir.

## 6.7 Uygulama ve doğrulama kaydı — 8 Ağustos 2026

Bu madde tamamlandı.

### Kök neden

Admin tarafında mevcut kodda **15 adet `Utils.showSuccess()` ve 41 adet `Utils.showError()` çağrısı**, yani toplam **56 mevcut geri bildirim çağrı noktası** bulunuyordu. Ancak ortak `public/js/utils.js` katmanında:

- `showSuccess()` hiçbir kullanıcı arayüzü üretmiyordu,
- `showError()` yalnız logger'a yazıyordu,
- `public/admin/index.html` içinde bildirimlerin gösterileceği bir live region bulunmuyordu.

Bu nedenle tek tek 56 işlem handler'ını değiştirmek yerine ortak sözleşme düzeltildi.

### Uygulanan mimari

- `public/admin/index.html` içine tek bir `#adminNotificationRegion` eklendi.
- Region `aria-live="polite"` ve `aria-atomic="true"` kullanıyor.
- `public/js/utils.js` içine ortak admin notification katmanı eklendi.
- Success bildirimi `role="status"`, error bildirimi `role="alert"` kullanıyor.
- Mesajlar HTML olarak yorumlanmıyor; yalnız `textContent` ile DOM'a yazılıyor.
- Aynı anda yalnız bir bildirim tutuluyor; yeni bildirim önceki timer'ı temizleyip eski bildirimin yerini alıyor.
- Bildirim kullanıcı tarafından tıklanarak veya 5 saniye sonra otomatik kapatılabiliyor.
- `showError()` mevcut logger davranışını aynen koruyor.
- Notification region bulunmayan kiosk sayfalarında ortak `Utils` hiçbir görsel UI oluşturmuyor ve exception üretmiyor.
- DOM test/mimari uyumluluğu için `replaceChildren()` bulunmayan minimal DOM ortamlarında güvenli fallback eklendi.
- `public/admin/style.css` içine sabit sağ-üst konumlu, responsive success/error notification stilleri ve keyboard focus görünümü eklendi.

### TDD ve otomatik test kanıtı

Yeni test:

`tests/admin-notifications.test.js`

Üretim kodu değiştirilmeden önce test çalıştırıldı. Kırmızı aşamada yalnız “notification region yoksa UI üretme” davranışı mevcut kodda geçti; görünür success/error, erişilebilir region, güvenli text render, timer/replacement ve CSS sözleşmeleri beklenen şekilde kırıldı.

Düzeltme sonrası:

- hedef notification testi: **8 / 8 pass**,
- komşu admin/frontend/kiosk regresyon seti: **53 / 53 pass**,
- yeni test `package.json` içindeki `test:core` kapısına kalıcı olarak eklendi,
- son tam `npm run test:core`: **1290 / 1290 pass, 0 fail**,
- `public/js/utils.js` syntax kontrolü başarılı.

### Gerçek browser kabul testi

Asıl `classroom.db` dosyasına dokunmamak için geçici bir ortam kullanıldı:

- geçici HTTP portu: `3317`,
- geçici DB: `/tmp/classroom-notification-browser.db`,
- test sonunda geçici browser sekmesi, sunucu süreci ve DB dosyaları kapatılıp silindi.

Gerçek Chromium admin sayfasında doğrudan görsel contract doğrulandı:

- success: yeşil bildirim, beyaz metin, `role="status"`, fixed notification region,
- error: kırmızı bildirim, beyaz metin, `role="alert"`.

Gerçek admin işlem akışlarıyla kabul turu:

1. **Öğrenci başarı:** gerçek öğrenci formu gönderildi → `Öğrenci başarıyla eklendi!` görünür `status` bildirimi ve DB kaydı doğrulandı.
2. **Öğrenci hata:** boş ad ile form gönderildi → `Öğrenci adı gereklidir` görünür `alert` bildirimi.
3. **Görev başarı:** gerçek başkan atama akışı çalıştırıldı → `Rol başarıyla atandı` görünür `status` bildirimi ve `/api/roles` kaydı doğrulandı.
4. **Görev hata:** öğrenci seçmeden atama denendi → `Lütfen bir öğrenci seçin.` görünür `alert` bildirimi.
5. **Slayt başarı:** gerçek `toggleSlideActive()` akışı çalıştırıldı → slayt DB durumu `1 -> 0` değişti ve `Slayt durumu başarıyla güncellendi!` görünür `status` bildirimi.
6. **Slayt hata:** aynı gerçek frontend handler'ına kontrollü HTTP 500 cevabı verildi → backend hata metni `Smoke slide failure` görünür `alert` olarak gösterildi.
7. **Yoklama hata:** tarih seçmeden yoklama yükleme denendi → `Lütfen bir tarih seçin.` görünür `alert` bildirimi.
8. **Yoklama başarı:** `2026-08-08` için gerçek yoklama yükle/kaydet akışı çalıştırıldı → bir `present` kaydı API'den geri okundu ve `Yoklama başarıyla kaydedildi!` görünür `status` bildirimi doğrulandı.

Böylece P1-2'nin gerçek browser kabul kriterlerinin tamamı karşılandı.

### Commit ve GitHub kaydı

- Commit: `43249e861c753e82f28c5b1edf9a5a6969b3a3e1`
- Mesaj: `fix: show admin operation feedback`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 7. P1-3 — Admin “Bugün” tarihini İstanbul saatine bağla

**Öncelik:** P1  
**Kullanıcı etkisi:** Orta-Yüksek  
**Risk:** Düşük  
**Durum:** 🟩 Tamamlandı — 8 Ağustos 2026

## 7.1 Sorun

Backend bugünün tarihini İstanbul timezone'a göre düzeltti.

Fakat admin:

```js
new Date().toISOString().split('T')[0]
```

kullanıyor.

`toISOString()` UTC'dir.

Türkiye ile UTC arasında gün sınırında admin input'u ve backend bugünü farklı tarihe düşebilir.

Özellikle gece saatlerinde yanlış güne yoklama açılması olasıdır.

## 7.2 Seçilen çözüm

Frontend'e tek bir Istanbul date helper eklenecek.

Tercih:

`Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', ... })`

veya mevcut `TimeProvider`/shared date mantığıyla uyumlu, test edilebilir bir yardımcı.

Amaç yalnız format üretmek değil, **Europe/Istanbul gününü** üretmektir.

## 7.3 Kullanılacağı yer

En az:

- admin `setTodayDate()`

Ayrıca admin içinde başka UTC-today kullanımı varsa aynı helper'a geçirilecektir.

## 7.4 Test

UTC gününün Türkiye gününden farklı olduğu sınır anı test edilmelidir.

Örnek mantık:

- UTC'de bir önceki gün,
- İstanbul'da yeni gün.

Admin helper İstanbul tarihini vermelidir.

## 7.5 Kapanış kriteri

Backend date-utils testi ile frontend today helper aynı örnek zaman için aynı `YYYY-MM-DD` değerini vermelidir.

## 7.6 Uygulama ve doğrulama kaydı — 8 Ağustos 2026

Bu madde tamamlandı.

### Kök neden

Backend daha önce `backend/date-utils.js` içindeki `getIstanbulDateKey()` ile `Europe/Istanbul` takvim gününe geçirilmişti. Admin ise `setTodayDate()` içinde hâlâ:

```js
new Date().toISOString().split('T')[0]
```

kullanıyordu. `toISOString()` UTC günü verdiği için Türkiye'de özellikle **00:00–02:59** aralığında admin “Bugün” butonu backend'in “bugün” kavramından bir gün geride kalabiliyordu.

### Uygulanan çözüm

- `public/js/utils.js` içine frontend için `getIstanbulDateKey(date = new Date())` eklendi.
- Helper backend ile aynı temel sözleşmeyi kullanıyor:
  - timezone: `Europe/Istanbul`,
  - Gregorian calendar,
  - Latin rakamları,
  - `Intl.DateTimeFormat(...).formatToParts()` ile yıl/ay/gün ayrıştırma,
  - çıktı: strict `YYYY-MM-DD`,
  - invalid/non-Date giriş için `TypeError`.
- Helper hem Node test export'una hem browser `window.Utils` export'una eklendi.
- `public/admin/admin.js` içindeki `setTodayDate()` artık doğrudan `Utils.getIstanbulDateKey()` kullanıyor.
- Admin tarafındaki UTC `toISOString()` today üretimi kaldırıldı.
- `admin-error-logs.test.js` içindeki eski minimal `Utils` test double'ı yeni shared sözleşmeye uygun hale getirildi; üretim koduna UTC fallback eklenmedi.

### TDD kanıtı

Yeni test:

`tests/admin-istanbul-date.test.js`

Üretim kodu değiştirilmeden önce kırmızı koşuda:

- `Utils.getIstanbulDateKey` mevcut değildi,
- `2026-08-08T21:30:00.000Z` anında İstanbul tarihi `2026-08-09` olması gerekirken admin `2026-08-08` üretiyordu,
- `setTodayDate()` hâlâ `toISOString()` kullanıyordu.

Düzeltme sonrası P1-3 + backend date-utils + notification + attendance komşu seti:

- **192 / 192 pass**.

Özellikle sınır testleri:

- `2026-08-08T20:59:59.999Z` → İstanbul `2026-08-08`,
- `2026-08-08T21:30:00.000Z` → İstanbul `2026-08-09`,
- `2026-12-31T21:15:00.000Z` → İstanbul `2027-01-01`.

İlk tam core koşusunda tek hata, `admin-error-logs.test.js` içindeki eski `Utils` mock'unun yeni `getIstanbulDateKey()` metodunu taşımamasından kaynaklandı. Bu üretim hatası değildi; test double gerçek shared sözleşmeye güncellendi ve tam paket yeniden çalıştırıldı.

Son tam `npm run test:core`:

- **1298 / 1298 pass**,
- **0 fail**.

Böylece frontend “Bugün” ve backend “bugün” aynı `Europe/Istanbul` takvim günü sözleşmesine bağlandı.

### Commit ve GitHub kaydı

- Commit: `16cdda5cf741da7dd450c20ffe458a6791a0f4b8`
- Mesaj: `fix: use Istanbul date in admin attendance`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 8. P1-4 — Slayt ayarları HTTP hata kontrolünü düzelt

**Öncelik:** P1  
**Kullanıcı etkisi:** Orta  
**Risk:** Düşük  
**Durum:** 🟩 Tamamlandı ve doğrulandı — 8 Ağustos 2026

## 8.1 Sorun

`handleSlideSettingsSubmit()` üç ayrı `fetch()` çalıştırıyor.

Ancak `response.ok` kontrol edilmiyor.

Browser `fetch()` HTTP 400/500 için Promise reject etmez.

Yani:

- ilk POST 500 olabilir,
- ikinci/üçüncü devam eder,
- fonksiyon `catch`'e düşmez,
- sonunda “Ayarlar başarıyla kaydedildi” çağrılabilir.

Bugün bu mesaj ayrıca görünmüyor; P1-2 tamamlandıktan sonra yanlış success mesajı daha görünür hale gelecektir. Bu nedenle bu düzeltme feedback işinin hemen arkasında yapılmalıdır.

## 8.2 Kısa vadeli çözüm

Her response:

```js
if (!response.ok) { ... }
```

ile kontrol edilir.

Server error JSON'i güvenli biçimde parse edilip uygun mesaj üretilir.

## 8.3 Daha iyi orta vadeli çözüm

Üç ayrı key update yerine tek atomik endpoint düşünülebilir:

`PUT /api/slide-settings`

body:

```json
{
  "default_duration": "10000",
  "default_transition_mode": "auto",
  "default_transition_duration": "1000"
}
```

Backend transaction ile üç ayarı tek başarı/başarısızlık halinde yazar.

### Karar

İlk düzeltmede scope büyütmemek için response check yapılacak.

Atomik tek-endpoint refactor'u ayrı P2 iyileştirmesi olarak ele alınabilir.

## 8.4 Test

1. üç response 200 → success.
2. birinci 500 → diğerleri çalıştırılmaz, error.
3. ikinci 500 → success gösterilmez.
4. üçüncü 500 → success gösterilmez.
5. malformed error body → generic error.

## 8.5 Uygulama ve doğrulama kaydı — 8 Ağustos 2026

### Kök neden

`handleSlideSettingsSubmit()` üç ayrı `POST /api/slide-settings` isteğini `await` ediyordu fakat dönen `Response` nesnelerinin `ok` alanını hiç kontrol etmiyordu. Browser `fetch()` HTTP 400/500 yanıtlarında Promise reject etmediği için 500 yanıtı dahi normal akış gibi devam ediyor, sonraki ayarlar gönderiliyor ve fonksiyon sonunda yanlış success bildirimi üretiyordu.

### Uygulanan çözüm

- `public/admin/admin.js` içindeki `handleSlideSettingsSubmit()` içinde ortak `updateSetting(key, value)` yardımcı akışı eklendi.
- Her `POST /api/slide-settings` yanıtında `response.ok` zorunlu olarak kontrol ediliyor.
- İlk HTTP hatasında sonraki ayar yazmaları durduruluyor.
- Backend güvenli `{ error: "..." }` mesajı döndürürse kullanıcıya bu mesaj gösteriliyor.
- Error body JSON değilse, `error` alanı string değilse veya boşsa sınırlı bir `HTTP status + statusText` mesajına düşülüyor.
- Ağ hatasının dahili detayı logger'da kalıyor; `ECONNRESET` benzeri teknik ayrıntılar kullanıcıya sızdırılmıyor.
- Success bildirimi yalnız üç isteğin de `ok === true` olması halinde gösteriliyor.
- Yeni regresyon testi `tests/admin-slide-settings-submit.test.js` olarak eklendi ve `test:core` kapısına dahil edildi.

### TDD kırmızı kanıtı

Üretim kodu değiştirilmeden önce yeni hedef test çalıştırıldı:

- toplam **8 test**,
- **2 pass / 6 fail**.

Kırmızı koşuda doğrulanan gerçek eski davranışlar:

- ilk 500'den sonra beklenen 1 POST yerine **3 POST** yapılıyordu,
- ikinci 400'den sonra beklenen 2 POST yerine **3 POST** yapılıyordu,
- üçüncü 503/malformed body durumunda success bildirimi çıkıyordu,
- HTTP hata yanıtları hiçbir `response.ok` kontrolünden geçmiyordu.

### Hedef test sonucu

Düzeltme sonrası:

- `tests/admin-slide-settings-submit.test.js` → **8 / 8 pass**.

Test kapsamı:

1. üç başarılı response ve exact normalize payload'lar,
2. birinci HTTP 500,
3. ikinci HTTP 400,
4. üçüncü HTTP 503 + malformed JSON,
5. network exception,
6. null/blank/non-string server error gövdeleri,
7. dahili network detayının UI'a sızmaması,
8. source guard ile `response.ok` kontrolünün kalıcı olması.

### Komşu regresyon sonucu

Admin notification, slide management, admin auth/session, rate-limit, settings update ve error-redaction dahil komşu paket:

- **100 / 100 pass**,
- **0 fail**.

Bu pakette backend `POST /api/slide-settings` için:

- validation,
- başarılı SQLite write,
- gerçek SQLite regression,
- database error redaction

da yeniden doğrulandı.

### Tam çekirdek sonucu

Yeni P1-4 testi `test:core` içine dahil edilmiş halde:

- `npm run test:core` → **1306 / 1306 pass**,
- **0 fail**.

### Gerçek browser + temp SQLite kabul turu

Asıl `backend/classroom.db` dosyasına dokunulmadı. DB `/tmp` altında kopyalanıp ayrı portta geçici Classroom server çalıştırıldı ve gerçek Chromium admin paneli kullanıldı.

#### Başarı yolu

Form değerleri:

- duration: `11 s`,
- transition mode: `random`,
- transition duration: `1.4 s`.

Gerçek backend'e üç POST gönderildi. Sonrasında `/api/slide-settings` tekrar okunarak SQLite persistence doğrulandı:

- `default_duration = 11000`,
- `default_transition_mode = random`,
- `default_transition_duration = 1400`.

UI sonucu:

- `Ayarlar başarıyla kaydedildi!`,
- `role="status"`.

#### Kontrollü birinci 500

Gerçek admin handler'ında ilk slide-settings response 500 olarak enjekte edildi:

- POST sayısı: **1**,
- sonraki iki POST gönderilmedi,
- success yok,
- error notification `role="alert"`.

#### Kontrollü ikinci 400

İkinci response 400 olarak enjekte edildi:

- POST sayısı: **2**,
- üçüncü POST gönderilmedi,
- success yok,
- hata notification görünür.

#### Kontrollü üçüncü malformed 503

Üçüncü response `503 Service Unavailable` ve JSON olmayan body ile enjekte edildi:

- POST sayısı: **3**,
- success yok,
- UI mesajı: `Ayarlar kaydedilirken hata oluştu (503 Service Unavailable).`,
- `role="alert"`.

#### Gerçek backend 400

Aynı temp sunucuda eksik key ile gerçek `POST /api/slide-settings`:

- HTTP **400**,
- `{ "error": "Key ve value gereklidir" }`.

#### Gerçek SQLite 500

Yalnız temp DB'deki `slide_settings` tablosu test amacıyla kaldırıldı. Gerçek admin form handler tekrar çalıştırıldı:

- gerçek ağ kaydı: `POST /api/slide-settings` → **500**,
- POST sayısı: **1**,
- sonraki POST'lar gönderilmedi,
- success yok,
- kullanıcı mesajı: `Slayt ayarları güncellenirken hata oluştu`,
- `role="alert"`.

Chrome network kaydında hem gerçek **400** hem gerçek **500** response görüldü.

Geçici server kapatıldı ve `/tmp` test DB/log/pid dosyaları temizlendi.

### Bilinen residual risk — atomiklik

P1-4'ün kapsamı yanlış success ve hata sonrası gereksiz devamı kapatmaktır. Üç ayrı POST hâlâ tek transaction değildir.

Gerçek browser testinde bu açıkça gözlendi:

- ikinci istek 400 olduğunda `default_duration` yeni değere yazılmış kaldı, diğer iki eski değerde kaldı,
- üçüncü istek 503 olduğunda ilk iki ayar yeni değere yazılmış kaldı, üçüncü ayar eski değerde kaldı.

Bu nedenle **kısmi yazma mümkündür**. Bu durum P1-4'ün kapanış kriterini bozmaz; çünkü planın 8.3 kararında atomik refactor ayrı P2 olarak tanımlanmıştır. Ancak risk kapatılmış sayılmayacaktır.

Açık P2 işi:

**Slide settings için tek atomik `PUT /api/slide-settings` endpoint'i + backend transaction + frontend tek-request geçişi.**

P1-4 yalnız false-success / HTTP error handling problemi açısından 🟩 kapatılmıştır.

### Commit ve GitHub kaydı

- Commit: `4e4dc277edd9d0db7a1a2017d3caabc446d3838d`
- Mesaj: `fix: handle slide settings HTTP failures`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 9. P1-5 — Admin parola modelini fail-closed yap

**Öncelik:** P1 güvenlik  
**Kullanıcı etkisi:** Yönetici erişimi  
**Risk:** Orta-Yüksek  
**Bağımlılık:** Admin kullanım akışları düzeldikten sonra  
**Durum:** 🟩 Tamamlandı ve doğrulandı — 8 Ağustos 2026
**Operasyonel not:** Admin kullanımı için çalışma ortamında `CLASSROOM_ADMIN_PASSWORD` açıkça sağlanmalıdır.

## 9.1 Sorun

Mevcut `backend/admin-auth-config.js`:

- username yoksa `admin`,
- password env yoksa `DEFAULT_ADMIN_PASSWORD_DIGEST_HEX`

kullanıyor.

Bu, deployment yanlış yapılandırılsa bile tahmin edilebilir/sabit bir fallback credential'ın etkin kalması anlamına gelir.

Daha önceki güvenlik tasarım hedefi:

> admin password yapılandırılmamışsa admin girişi kapalı olmalı

idi.

Mevcut davranış bu hedefle çelişiyor.

## 9.2 Seçilen güvenlik modeli

### Username

`CLASSROOM_ADMIN_USERNAME` yoksa `admin` varsayılanı kalabilir.

Username gizli değildir; password kadar kritik değildir.

### Password

`CLASSROOM_ADMIN_PASSWORD` yoksa:

- hiçbir parola eşleşmemeli,
- sabit fallback digest kullanılmamalı,
- admin login fail-closed olmalı.

## 9.3 Deployment güvenliği

Bu değişiklik uygulanmadan önce gerçek çalışma ortamında parola sağlama yolu doğrulanmalıdır.

Parola:

- repo içine yazılmayacak,
- `.md` belgeye yazılmayacak,
- client JS'e yazılmayacak,
- commit edilen `.env` içine yazılmayacak.

Uygun kaynak:

- process environment,
- sistem servis environment ayarı,
- veya `.gitignore` kapsamındaki yerel secret dosyası.

## 9.4 Server davranışı

Parola yoksa iki seçenek vardır:

### Önerilen

Login endpoint'i:

- `503` veya güvenli konfigürasyon hatası,
- kullanıcıya kısa “Yönetici girişi yapılandırılmamış” mesajı,
- server log'a ayrıntılı config warning.

Kiosk public ekranı çalışmaya devam eder.

Bu, admin yapılandırması eksik diye sınıf ekranını tamamen düşürmez.

## 9.5 Kod değişikliği

`DEFAULT_ADMIN_PASSWORD_DIGEST_HEX` tamamen kaldırılmalıdır.

`matchesAdminPassword()`:

- configuredPassword `null` ise `false`.
- configured ise mevcut constant-time digest compare devam eder.

`matchesAdminCredentials()` sözleşmesi korunur.

## 9.6 Test değişiklikleri

Mevcut `admin-auth-config.test.js` fallback digest'i doğrulayan testler değişecektir.

Yeni contract:

1. env password yok → hiçbir candidate eşleşmez.
2. boş password → eşleşmez.
3. doğru configured password → eşleşir.
4. yanlış configured password → eşleşmez.
5. unicode password → doğru çalışır.
6. process.env runtime değişimi → okunur.
7. login endpoint env yok → fail-closed.
8. kiosk public read endpointleri etkilenmez.

## 9.7 Kapanış kriteri

`CLASSROOM_ADMIN_PASSWORD` bilinçli olarak kaldırılmış test server'ında bilinen hiçbir parola ile admin session açılamamalıdır.

## 9.8 Uygulama ve doğrulama kaydı — 8 Ağustos 2026

### Kök neden

`backend/admin-auth-config.js`, `CLASSROOM_ADMIN_PASSWORD` eksik veya boş olduğunda `null` üretmesine rağmen parola karşılaştırmasında commit edilmiş sabit bir SHA-256 digest'i fallback credential olarak kullanıyordu. Bu nedenle deployment yanlış yapılandırılmış olsa bile uygulama gerçek anlamda fail-closed değildi.

Login endpoint'i de yapılandırma eksikliğini ayırt etmiyor, normal yanlış parola gibi `401` davranışına sokuyordu.

### Uygulanan çözüm

- Commit edilmiş default admin password digest sabiti üretim kodundan tamamen kaldırıldı.
- `matchesAdminPassword()` artık:
  - configured password `null` ise koşulsuz `false`,
  - candidate string değilse `false`,
  - configured password varsa mevcut SHA-256 sabit uzunluk digest + `crypto.timingSafeEqual()` karşılaştırmasını kullanıyor.
- `matchesAdminCredentials()` mevcut username + password sözleşmesini koruyor.
- `POST /api/admin/login` valid gövdede önce parola konfigürasyonunu kontrol ediyor.
- `CLASSROOM_ADMIN_PASSWORD` yok/boş ise:
  - HTTP `503`,
  - `{ authenticated: false, message: 'Yönetici girişi yapılandırılmamış.' }`,
  - session cookie yok,
  - failed-login sayacı artırılmıyor,
  - server tarafında config warning loglanıyor.
- Parola configured ise:
  - yanlış credential yine `401`,
  - doğru credential yine session üretip `200` döndürüyor.
- Public kiosk/read endpointleri admin config eksikliğinden etkilenmiyor.

### TDD kırmızı kanıtı

Üretim değişikliğinden önce `admin-auth-config` ve `admin-session-api` sözleşmeleri fail-closed beklentisine çevrildi.

İlk kırmızı koşu:

- toplam test: **33**,
- pass: **30**,
- fail: **3** (iki anlamlı alt test + suite aggregate failure).

Anlamlı kırılmalar:

1. üretim modülü hâlâ fallback digest export ediyordu,
2. parola env'i yokken login beklenen `503` yerine `401` dönüyordu.

Bu, testin mevcut eski davranışı gerçekten yakaladığını doğruladı.

### Hedef ve genişletilmiş güvenlik testleri

İlk düzeltme sonrası hedef paket:

- **33 / 33 pass**.

Ardından kabul standardı güçlendirildi:

- yapılandırılmamış durumda **7 ardışık** valid-format login denemesi yapıldı,
- yedisi de `503` kalmalı,
- hiçbirinde `Set-Cookie` olmamalı,
- hiçbirinde `Retry-After` olmamalı,
- config hatası failed-login rate-limit kotasını tüketmemeli.

Ayrıca source-level negatif guard eklendi:

- auth production source içinde fallback digest sembolü bulunmamalı,
- unconfigured branch'te `Buffer.from(..., 'hex')` benzeri fallback yolu bulunmamalı.

Admin auth config, login form, route auth, login/write rate limit, session store, session API ve session error-redaction komşu paketi:

- **59 / 59 pass**,
- **0 fail**.

### Secret-hygiene doğrulaması

Production `backend/` taramasında:

- fallback digest sembolü yok,
- `backend/admin-auth-config.js` içinde commit edilmiş 64-hex credential materyali yok.

Test dosyasındaki fallback sembolü yalnız **negatif regression assertion** olarak bulunuyor; credential değeri testte tutulmuyor.

Repo `.gitignore` zaten şunları dışlıyor:

- `.env`,
- `.env.local`,
- `.env.production`.

Repo kökünde doğrulama anında `.env` bulunmuyordu. Otomasyon tarafından yeni bir gerçek parola üretilip repo veya belgeye yazılmadı.

### Gerçek HTTP — unconfigured sunucu

Asıl DB yerine ayrı `/tmp` SQLite DB ve ayrı port kullanıldı. `CLASSROOM_ADMIN_PASSWORD` bilinçli olarak boş verilerek gerçek Node/Express sunucusu başlatıldı.

Aynı IP'den 7 ayrı valid-format login denemesi:

- 1 → `503`, cookie 0, Retry-After 0,
- 2 → `503`, cookie 0, Retry-After 0,
- 3 → `503`, cookie 0, Retry-After 0,
- 4 → `503`, cookie 0, Retry-After 0,
- 5 → `503`, cookie 0, Retry-After 0,
- 6 → `503`, cookie 0, Retry-After 0,
- 7 → `503`, cookie 0, Retry-After 0.

Aynı sunucuda:

- `GET /api/slides` → **200**,
- `/admin-login.html` → **200**.

Böylece admin fail-closed olurken kiosk/public uygulamanın çalışmaya devam ettiği gerçek HTTP üzerinde doğrulandı.

### Gerçek browser — unconfigured login

Chromium login sayfasında gerçek form submit yapıldı.

Sonuç:

- sayfa `/admin-login.html` üzerinde kaldı,
- görünür mesaj: `Yönetici girişi yapılandırılmamış.`,
- submit butonu tekrar aktif hale geldi,
- buton metni tekrar `Giriş Yap` oldu,
- password input submit sonrasında temizlendi.

### Gerçek HTTP — configured sunucu

Ayrı temp DB/sunucu bu kez yalnız test süreci için bir parola environment değeri ile açıldı.

Sonuç:

- yanlış parola → **401**, cookie yok,
- doğru parola → **200**, session cookie var,
- cookie ile `GET /api/admin/session` → **200**, `{ authenticated: true }`,
- `GET /api/slides` → **200**.

### Gerçek browser — configured login

Ayrı Chromium context'inde gerçek login formu doğru configured credential ile submit edildi ve browser:

- `/admin-login.html` → `/admin/`

navigasyonunu başarıyla yaptı.

### Tam çekirdek kabul kapısı

Commit edilecek çalışma ağacında:

- `node --check backend/admin-auth-config.js` → pass,
- `node --check backend/server.js` → pass,
- `git diff --check` → temiz,
- `npm run test:core` → **1308 / 1308 pass**, **0 fail**.

### Operasyonel durum / deployment gereksinimi

Kodun güvenlik hedefi gereği `CLASSROOM_ADMIN_PASSWORD` olmadan admin erişimi **bilinçli olarak kapalıdır**. Mevcut checkout'ta kalıcı `.env` bulunmadığından normal `npm start` / `start.sh` çalıştırmasında public kiosk açılır ancak admin login `503` verir.

Admin'in gerçek kullanım ortamında açılması için parola repo dışından sağlanmalıdır. Uygun yollar:

- process environment,
- Git tarafından ignore edilen yerel `.env`,
- servis/daemon environment konfigürasyonu.

Gerçek secret değeri **repo'ya, bu MD dosyasına veya client koduna yazılmayacaktır**.

Bu operasyonel prerequisite güvenlik davranışının bir parçasıdır; sabit fallback credential geri getirilmeyecektir.

P1-5 fail-closed güvenlik sözleşmesi açısından 🟩 kapatılmıştır.

### Commit ve GitHub kaydı

- Commit: `b599b743ab96ac55574d5c38f6f47ca72ae809e3`
- Mesaj: `fix: fail closed when admin password is unset`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 10. P1-6 — Slide delete ham DB hata sızıntısını kapat

**Öncelik:** P1 güvenlik / consistency  
**Risk:** Düşük-Orta  
**Durum:** 🟩 Tamamlandı ve doğrulandı — 8 Ağustos 2026

## 10.1 Sorun

Temmuz hardening turunda birçok endpoint ham SQLite hata metni döndürmeyecek hale getirildi.

Fakat `DELETE /api/slides/:id` içinde bazı yollar bugün hâlâ:

```js
res.status(500).json({ error: err.message })
```

veya eşdeğeri ile internal hata döndürebilir.

Doğrulanan noktalar:

- isolated connection error
- begin transaction error
- lookup error
- delete error
- compaction error
- commit error

## 10.2 Seçilen çözüm

Client response her internal DB hatasında sabit mesaj kullanmalıdır:

`Slayt silinirken hata oluştu`

Internal ayrıntı:

- server logger'a,
- requestId,
- slideId,
- işlem aşaması

ile yazılmalıdır.

404 “Slayt bulunamadı” gibi iş kuralı mesajları korunacaktır.

## 10.3 Rollback davranışı

Redaction düzeltmesi transaction akışını bozmamalıdır.

Özellikle:

- lookup/delete/compaction hata → rollback,
- commit hata → rollback denemesi,
- response yalnız bir kez,
- DB close her yolda,
- file delete yalnız DB commit sonrası

sözleşmeleri korunmalıdır.

## 10.4 Testler

Ayrı error-redaction testi eklenmeli veya `slides-delete-transaction.test.js` genişletilmelidir.

Her failure point için distinctive secret error string enjekte edilip response'da bulunmadığı doğrulanmalıdır.

## 10.5 Uygulama ve doğrulama kaydı — 8 Ağustos 2026

### Kök neden

`DELETE /api/slides/:id` transaction akışı doğru rollback mantığına sahipti ancak internal DB hatalarını client response'a doğrudan taşıyordu. Sızıntı tek bir dalda değildi; aşağıdaki aşamaların tamamında ham `.message` kullanımı vardı:

- isolated connection,
- `BEGIN IMMEDIATE`,
- slide lookup,
- primary `DELETE`,
- display-order compaction,
- `COMMIT`.

Mevcut regresyon testlerinin bir bölümü de bu ham SQLite mesajlarını doğru davranış olarak bekliyordu. Dolayısıyla yalnız production kodu değil, test sözleşmesi de güvenli client contract'a çevrildi.

### Uygulanan çözüm

`backend/server.js` içindeki slide DELETE route'unda tek internal client mesajı tanımlandı:

`Slayt silinirken hata oluştu`

Internal failure'lar artık:

- client'a sabit güvenli 500 mesajı verir,
- özgün `Error` nesnesini server logger'da korur,
- `slideId`,
- `requestId`,
- `stage`

bağlamıyla loglanır.

Stage değerleri:

- `connection`,
- `begin`,
- `lookup`,
- `delete`,
- `compaction`,
- `commit`.

Rollback kendisi de hata verirse secondary hata ayrıca:

- `stage: rollback`,
- `originalStage`,
- `originalError`

bağlamıyla loglanır; primary veya rollback iç detayı client'a çıkmaz.

404 business-rule sözleşmesi aynen korunur:

`Slayt bulunamadı`

### Gerçek HTTP testinde yakalanan ikinci eksik — requestId

İlk gerçek HTTP/SQLite acceptance turunda redaction ve rollback doğru çalıştı fakat log context'inde `requestId` bulunmadığı görüldü.

Nedeni:

- backend'de birçok route `req.requestId` kullanıyor,
- ancak gerçek HTTP isteklerine requestId atayan global middleware yok,
- unit testler requestId'yi elle enjekte ettiği için bu eksik daha önce görünmüyordu.

P1-6 kapsamını tüm uygulamada middleware refactor'una büyütmemek için slide DELETE route'una lokal correlation fallback eklendi:

- mevcut geçerli `req.requestId` varsa korunur,
- yoksa `crypto.randomUUID()` ile UUID v4 üretilir,
- route'un error ve success loglarının tamamı aynı requestId'yi kullanır.

Bu eksiklik ayrıca önce kırmızı testle yeniden üretildi; production değişikliğinden önce requestId `undefined` olduğu için test beklendiği gibi fail oldu.

### TDD kırmızı kanıtı — ana redaction davranışı

Production route değiştirilmeden önce:

`slides-delete-error-redaction + slides-delete-id + slides-delete-cache + slides-delete-transaction`

birlikte çalıştırıldı.

Sonuç:

- **36 test**,
- **16 pass**,
- **20 fail**.

Kırmızı koşu connection/begin/lookup/delete/compaction/commit iç hata metinlerinin client response'a gerçekten sızdığını gösterdi.

Distinctive test marker'ları response'da doğrudan görüldüğü için testin yanlış nedenle kırılmadığı doğrulandı.

### Yeni özel redaction testi

Yeni dosya:

`tests/slides-delete-error-redaction.test.js`

Kapsam:

1. gerçek-style request'te requestId yoksa UUID v4 üretimi,
2. isolated connection failure,
3. begin failure,
4. lookup failure,
5. delete failure,
6. compaction failure,
7. commit failure,
8. rollback failure,
9. missing-slide 404 korunması.

Son hedef sonucu:

- **10 / 10 pass**.

Her internal failure testinde:

- distinctive internal detail client body'de bulunmuyor,
- özgün Error logger'da kalıyor,
- stage doğru,
- slideId doğru,
- requestId mevcut,
- DB close ve rollback sayıları kontrol ediliyor,
- response exactly once contract korunuyor.

### Transaction / cache odaklı regresyon

Redaction testi hariç mevcut DELETE transaction/cache/ID paketleri de tekrar çalıştırıldı.

Sonuç:

- **27 / 27 pass**.

Yeni redaction testiyle birlikte delete-focused toplam:

- **36 / 36 pass**.

Gerçek SQLite trigger tabanlı transaction testi de yeşil kaldı; zorlanan compaction hatasında rollback gerçek SQLite üzerinde doğrulandı.

### Geniş komşu slide/auth regresyonu

Aşağıdaki alanlar birlikte çalıştırıldı:

- delete redaction,
- delete ID validation,
- delete cache,
- delete real transaction,
- reorder route/cache,
- slide update route/cache,
- slide create/read/active error redaction,
- admin route auth,
- admin session,
- admin rate-limit.

Sonuç:

- **189 / 189 pass**,
- **0 fail**.

### Gerçek HTTP + gerçek SQLite acceptance turu

Asıl `backend/classroom.db` kullanılmadı. Ayrı `/tmp` SQLite DB ve ayrı portta gerçek Node/Express server çalıştırıldı. Admin auth yalnız test süreci için environment üzerinden sağlandı; credential değeri repo veya belgeye yazılmadı.

Temp DB'ye üç slayt oluşturuldu:

- `P16-A`, order 1,
- `P16-B`, order 2,
- `P16-C`, order 3.

Ardından compaction update'inde bilerek internal hata oluşturan temp SQLite trigger eklendi.

#### Hatalı DELETE

Gerçek browser admin session + gerçek CSRF token ile `P16-B` DELETE edildi.

Sonuç:

- HTTP **500**,
- body tam olarak güvenli generic error,
- internal test marker client response'da **yok**.

DB rollback doğrulaması:

- üç slayt da hâlâ mevcut,
- ID'ler değişmedi,
- order değerleri hâlâ `1 / 2 / 3`.

Server log:

- özgün SQLite constraint ayrıntısını korudu,
- `slideId` doğru,
- `stage: compaction`,
- gerçek HTTP request için üretilmiş UUID v4 `requestId` mevcut.

Bu acceptance turu, unit testlerin kaçırdığı gerçek requestId eksikliğini de yakalayıp kapattı.

#### Başarılı DELETE

Temp trigger kaldırıldı ve aynı `P16-B` gerçek HTTP üzerinden tekrar silindi.

Sonuç:

- HTTP **200**,
- `{ message: 'Slayt başarıyla silindi', changes: 1 }`,
- DB'de `P16-B` yok,
- `P16-A` order 1,
- `P16-C` order **2**.

Yani post-delete compaction gerçek SQLite üzerinde başarılı.

Success logunda da UUID requestId mevcut.

#### Missing slide ve public read

Aynı authenticated gerçek HTTP ortamında:

- olmayan slide DELETE → **404** `Slayt bulunamadı`,
- `/api/slides/active` → **200**.

### Tam çekirdek kabul kapısı

Yeni redaction testi `test:core` içine dahil edilmiş halde:

- `node --check backend/server.js` → pass,
- `git diff --check` → temiz,
- `npm run test:core` → **1318 / 1318 pass**,
- **0 fail**.

Geçici Chromium context, Node server, SQLite DB, trigger ve `/tmp` test dosyaları kapatılıp temizlendi. Gerçek proje DB'sine dokunulmadı.

P1-6 yalnız hata metnini değiştirme değil; client redaction + transaction preservation + server diagnostics + real request correlation birlikte doğrulandığı için 🟩 kapatılmıştır.

### Commit ve GitHub kaydı

- Commit: `288d98101766eb87391bd890b6d5ff4ba2f970c3`
- Mesaj: `fix: redact slide delete database errors`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 10A. P2-0 — Slide settings'i tek atomik endpoint'e geçir

**Öncelik:** P2
**Kullanıcı etkisi:** Orta-Yüksek
**Risk:** Orta
**Kaynak:** P1-4 gerçek browser/SQLite acceptance turunda kanıtlanan kısmi yazma riski
**Durum:** 🟩 Tamamlandı ve doğrulandı — 8 Ağustos 2026

## 10A.1 Neden P2 sırasının başına alındı?

P1-4 yanlış success mesajını ve HTTP hatasından sonra gereksiz devamı kapattı. Ancak admin formu üç ayrı `POST /api/slide-settings` kullandığı için ikinci veya üçüncü yazma başarısız olduğunda önceki başarılı yazmalar DB'de kalabiliyordu.

Bu risk P1-4 gerçek SQLite testinde gözlendiği için SheetJS ve diğer P2 bakım işlerinden önce ele alındı.

Hedef yalnız request sayısını azaltmak değil, şu sözleşmeyi sağlamaktır:

> Üç admin slayt ayarı ya birlikte commit olur ya da hiçbirisi değişmez.

## 10A.2 Yeni API sözleşmesi

Yeni korumalı endpoint:

`PUT /api/slide-settings`

Middleware sırası:

1. `requireAdminSession`
2. `requireCsrfToken`
3. `requireAdminWriteRateLimit`
4. route handler

Body tam olarak üç alan taşır:

```json
{
  "default_duration": 10000,
  "default_transition_mode": "auto",
  "default_transition_duration": 1200
}
```

Validation:

- body plain object olmalı,
- üç alanın tamamı zorunlu,
- bilinmeyen ek key reddedilir,
- `default_duration`: integer `1000–60000` ms,
- `default_transition_mode`: yalnız `auto | random | manual`,
- `default_transition_duration`: integer `500–3000` ms,
- transition duration 100 ms adımlı olmalı.

Invalid payload DB bağlantısı/transaction açılmadan `400` döner.

Mevcut `POST /api/slide-settings` backward compatibility amacıyla şimdilik korunmuştur. Admin UI artık POST endpoint'ini kullanmaz.

## 10A.3 Backend atomiklik modeli

Backend ayrı SQLite connection kullanır:

1. `BEGIN IMMEDIATE`
2. `default_duration` upsert
3. `default_transition_mode` upsert
4. `default_transition_duration` upsert
5. `COMMIT`

Herhangi bir upsert veya commit hatasında:

- `ROLLBACK` denenir,
- client'a yalnız `Slayt ayarları güncellenirken hata oluştu` verilir,
- iç SQLite ayrıntısı client'a sızmaz,
- özgün Error server log'da korunur,
- `requestId`, `stage` ve gerektiğinde `settingKey` log context'ine yazılır.

Gerçek HTTP request'te requestId yoksa route `crypto.randomUUID()` ile UUID v4 üretir.

Rollback kendisi de hata verirse secondary hata ayrıca loglanır; client contract değişmez.

## 10A.4 Frontend değişikliği

`public/admin/admin.js` içindeki `handleSlideSettingsSubmit()` artık üç POST döngüsü yapmaz.

Tek request:

- method: `PUT`,
- endpoint: `/api/slide-settings`,
- üç ayar tek JSON body içinde.

Success notification yalnız tek atomik PUT `2xx` olduğunda gösterilir.

400/500/malformed response ve network exception davranışlarında P1-4'te kurulan güvenli görünür feedback korunmuştur.

## 10A.5 TDD kırmızı kanıtı

Production kodu değiştirilmeden önce birlikte çalıştırıldı:

- `tests/slide-settings-atomic.test.js`
- `tests/admin-slide-settings-submit.test.js`
- `tests/admin-route-auth.test.js`

İlk RED sonucu:

- toplam **20 test**,
- **4 pass**,
- **16 fail**.

Beklenen kırılmalar doğrulandı:

- `PUT /api/slide-settings` route'u yoktu,
- auth testi PUT için `404` görüyordu,
- frontend bir request yerine **3 POST** gönderiyordu,
- source contract'ta PUT bulunmuyordu.

Bu nedenle yeni testlerin mevcut eski davranışı gerçekten yakaladığı doğrulandı.

## 10A.6 Yeni atomiklik test kapsamı

Yeni dosya:

`tests/slide-settings-atomic.test.js`

Kapsam:

- structural validation,
- eksik field,
- bilinmeyen field,
- type/range/enum/100 ms-step validation,
- successful exact SQL/order/params,
- requestId UUID fallback,
- connection failure,
- BEGIN failure,
- 1., 2. ve 3. upsert failure,
- COMMIT failure,
- rollback failure,
- client error redaction,
- real SQLite trigger rollback,
- real SQLite success commit,
- ilgisiz `default_announcement_duration` değerinin korunması.

İlk production değişikliği sonrası hedef paket:

- **20 / 20 pass**.

## 10A.7 Komşu regresyonlar

Atomik settings, frontend submit, legacy settings POST, settings GET redaction, admin notification, route auth, session, error-redaction, rate-limit ve admin simplification birlikte çalıştırıldı.

İlk komşu turda yalnız eski write-route sayacı kırıldı:

- yeni PUT nedeniyle actual `19`, eski assertion `18`.

Test yalnız sayı olarak güncellenmedi. Yeni PUT için özel olarak şu middleware sırası assertion'a eklendi:

`requireAdminSession → requireCsrfToken → write-rate-limit middleware`

Tekrar koşu sonucu:

- **109 / 109 pass**,
- **0 fail**.

Legacy `POST /api/slide-settings` testleri de yeşil kaldı; geriye uyumluluk bozulmadı.

## 10A.8 Tam çekirdek kabul kapısı

Yeni atomik test `test:core` içine dahil edilmiş halde:

- `node --check backend/server.js` → pass,
- `node --check public/admin/admin.js` → pass,
- `git diff --check` → temiz,
- `npm run test:core` → **1329 / 1329 pass**,
- **0 fail**.

## 10A.9 Gerçek browser + gerçek SQLite rollback acceptance

Asıl proje DB'sine dokunulmadı. Ayrı `/tmp` SQLite DB, ayrı port ve yalnız test sürecine ait admin environment credential ile gerçek Classroom server çalıştırıldı.

Baseline:

- `default_duration = 10000`,
- `default_transition_mode = auto`,
- `default_transition_duration = 1000`,
- ilgisiz `default_announcement_duration = 7`.

Temp SQLite'a `default_transition_mode` upsert'inde bilerek internal constraint üreten trigger eklendi.

Gerçek Chromium admin formunda:

- süre `15 s`,
- mode `random`,
- transition `1.8 s`

seçilip gerçek form submit edildi.

Network sonucu:

- tam **1 adet** `PUT /api/slide-settings`,
- HTTP **500**,
- eski `POST /api/slide-settings` **yok**.

Admin UI:

- success yok,
- görünür error notification,
- `role="alert"`.

DB rollback sonrası:

- `10000 / auto / 1000` aynen korundu,
- `default_announcement_duration = 7` aynen korundu.

Server log:

- internal SQLite marker yalnız server tarafında kaldı,
- `stage: update`,
- `settingKey: default_transition_mode`,
- UUID v4 `requestId` mevcut.

İç SQLite ayrıntısı client notification/response'a çıkmadı.

## 10A.10 Gerçek browser + gerçek SQLite success acceptance

Trigger kaldırıldı ve aynı gerçek admin form tekrar submit edildi.

Network:

- tam **1 adet** yeni `PUT /api/slide-settings`,
- HTTP **200**.

UI:

- `Ayarlar başarıyla kaydedildi!`,
- `role="status"`.

GET `/api/slide-settings` ve doğrudan temp SQLite okuması birlikte doğruladı:

- `default_duration = 15000`,
- `default_transition_mode = random`,
- `default_transition_duration = 1800`,
- ilgisiz `default_announcement_duration = 7`.

Yani üç yönetilen ayar birlikte commit olurken dördüncü ilgisiz ayar değişmedi.

## 10A.11 Gerçek HTTP validation acceptance

Authenticated gerçek browser context'inden invalid mode (`smart`) ile PUT gönderildi.

Sonuç:

- HTTP **400**,
- `Geçiş modu geçersiz`,
- request öncesi ve sonrası DB değerleri birebir aynı.

Validation transaction açmadan mutation'ı engelliyor.

Geçici browser context, Node server, trigger ve `/tmp` SQLite dosyaları kapatılıp temizlendi.

P1-4'te kanıtlanan kısmi yazma residual riski bu refactor ile kapatılmıştır. P2-0 🟩 tamamlanmıştır.

### Commit ve GitHub kaydı

- Commit: `a4e7aa88234ad20c55581db936eabf5bc3e260a0`
- Mesaj: `fix: make slide settings updates atomic`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 11. P2-1 — SheetJS'i yerelleştir ve sürümü tekleştir

**Öncelik:** P2
**Kullanıcı etkisi:** Excel import güvenilirliği / offline admin
**Risk:** Düşük-Orta
**Durum:** 🟩 Tamamlandı ve doğrulandı — 8 Ağustos 2026

## 11.1 Sorun

Backend/npm kaynağı:

- SheetJS `0.20.3`

Admin browser runtime:

- CDN SheetJS `0.20.1`

Bu nedenle aynı projede iki farklı sürüm vardı ve admin Excel ekranı dış `cdn.sheetjs.com` erişimine bağımlıydı.

## 11.2 Uygulanan çözüm

İlk taslak planda browser bundle'ın `public/vendor/sheetjs/` altına kopyalanması düşünülüyordu. Kod incelemesinde bunun aynı 951 KB bundle'ın ikinci bir repo kopyasını yaratacağı ve zamanla package/vendor drift'i oluşturabileceği görüldü.

Bu nedenle daha sıkı tek-source-of-truth modeli seçildi:

- backend ve browser aynı kurulu `xlsx` npm paketini kullanır,
- browser bundle path'i `require.resolve('xlsx/dist/xlsx.full.min.js')` ile çözülür,
- Express yalnız bu dosyayı dedicated local route üzerinden servis eder:

`GET /vendor/sheetjs/xlsx.full.min.js`

- admin HTML artık yalnız:

```html
<script src="/vendor/sheetjs/xlsx.full.min.js"></script>
```

kullanır,
- `cdn.sheetjs.com` tamamen kaldırıldı,
- `public/vendor/` içine ikinci SheetJS kopyası eklenmedi.

Böylece `package.json` / `package-lock.json` gerçek tek sürüm kaynağı olarak kaldı.

## 11.3 Local asset HTTP sözleşmesi

Gerçek temp Classroom server üzerinde:

- `GET /vendor/sheetjs/xlsx.full.min.js` → HTTP **200**,
- `Content-Type: application/javascript; charset=utf-8`,
- `Cache-Control: public, max-age=0, must-revalidate`,
- `Content-Length: 951904`.

Servis edilen dosyanın boyutu kurulu `node_modules/xlsx/dist/xlsx.full.min.js` ile aynıdır.

## 11.4 TDD kırmızı kanıtı

Yeni test:

`tests/admin-xlsx-local-runtime.test.js`

İlk test harness denemesi SheetJS package `exports` kısıtı nedeniyle `require.resolve('xlsx/package.json')` üzerinde yanlış nedenle kırıldı. Bu sonuç ürün RED'i olarak kabul edilmedi; package root ana modül yolundan türetilerek test harness düzeltildi.

Düzeltilmiş gerçek RED koşusu:

- kurulu package/browser bundle `0.20.3` kontrolü geçti,
- package source-of-truth kontrolü geçti,
- admin HTML'de CDN bulunması nedeniyle local-runtime HTML testi kırıldı,
- server'da local SheetJS route'u bulunmadığı için route source contract testi kırıldı.

Özet:

- **5 test**,
- **2 pass**,
- **3 fail**; bunun iki tanesi anlamlı alt davranış, biri suite aggregate.

Bu, testin tam olarak mevcut CDN/local-route eksiklerini yakaladığını doğruladı.

## 11.5 Hedef test sonucu

Production değişikliğinden sonra:

`tests/admin-xlsx-local-runtime.test.js` → **5 / 5 pass**.

Kapsam:

1. npm package version `0.20.3`,
2. CommonJS backend `XLSX.version` ile package version eşitliği,
3. browser-ready minified bundle VM içinde `window.XLSX.version === 0.20.3`,
4. admin HTML'de SheetJS CDN yok,
5. admin HTML'de tam bir local SheetJS script tag'i var,
6. server bundle'ı kurulu package path'inden resolve ediyor,
7. repoda ikinci `public/vendor/sheetjs/xlsx.full.min.js` kopyası yok,
8. package ve lockfile aynı `0.20.3` kaynağını kullanıyor.

Yeni test `test:core` içine dahil edildi.

## 11.6 Komşu Excel/admin regresyonları

Birlikte çalıştırıldı:

- local runtime contract,
- XLSX package smoke,
- `.xlsx` / `.xls` round-trip,
- Excel preview DOM/XSS safety,
- student import error redaction,
- admin simplification,
- login form,
- route auth,
- notifications,
- static cache policy.

Sonuç:

- **30 / 30 pass**,
- **0 fail**.

Türkçe öğrenci başlık ve değerleriyle `.xlsx` ve `.xls` yazma/okuma round-trip'i korunmuştur.

## 11.7 Tam core sırasında yakalanan eski sözleşme

İlk full `test:core` koşusunda:

- toplam **1334**,
- **1331 pass**,
- **3 fail**.

Üç kırmızının tamamı `tests/internet-requirement-copy.test.js` içindeki eski CDN kararından kaynaklandı:

- test SheetJS CDN URL'sinin admin HTML'de tam bir kez bulunmasını şart koşuyordu,
- eski CDN script tag'inin aynen korunmasını bekliyordu,
- üçüncü fail suite aggregate idi.

Bu testler silinmedi veya gevşetilmedi. Yeni güvenilirlik kararını savunacak şekilde çevrildi:

- `cdn.sheetjs.com` bulunmamalı,
- local `/vendor/sheetjs/xlsx.full.min.js` tam bir kez bulunmalı,
- local SheetJS script'i `admin.js` öncesinde yüklenmeli.

Diğer README/internet gereksinimi metin sözleşmelerine dokunulmadı.

Güncelleme sonrası tam core:

- `npm run test:core` → **1334 / 1334 pass**,
- **0 fail**.

## 11.8 Gerçek browser acceptance

Ayrı temp SQLite DB ve ayrı portta gerçek Classroom server çalıştırıldı. Admin gerçek login formuyla açıldı.

Browser sonucu:

- `/admin/` başarıyla açıldı,
- `window.XLSX.version` → **0.20.3**,
- browser SheetJS script URL'si yalnız `http://127.0.0.1:<test-port>/vendor/sheetjs/xlsx.full.min.js`,
- dış SheetJS script listesi boş.

Chrome script network kaydı:

- local SheetJS → **200**,
- config/api-service/interval-manager/utils/logger/admin scriptleri → **200**,
- `cdn.sheetjs.com` veya başka dış SheetJS request'i → **0**.

## 11.9 Offline browser XLSX round-trip

Admin sayfası ve local runtime yüklendikten sonra Chromium network emulation **Offline** yapıldı.

Tarayıcı belleğinde:

1. Türkçe başlıklı üç satırlık öğrenci verisi oluşturuldu,
2. `XLSX.utils.aoa_to_sheet()` ile worksheet üretildi,
3. `XLSX.write(..., { type: 'array', bookType: 'xlsx' })` ile gerçek XLSX byte array üretildi,
4. `XLSX.read(..., { type: 'array' })` ile tekrar okundu,
5. `sheet_to_json(..., { header: 1 })` çıktısı kaynak satırlarla karşılaştırıldı.

Sonuç:

- `XLSX.version = 0.20.3`,
- XLSX byte length: `16237`,
- Türkçe öğrenci verisi kaynakla **birebir eşit**,
- dış ağ kapalıyken parse/write/read akışı başarılı.

Bu test admin Excel runtime'ının artık SheetJS CDN erişimine ihtiyaç duymadığını gerçek browser üzerinde doğruladı.

Temp browser context ve server kapatıldı; `/tmp` test dosyaları temizlendi. Asıl proje DB'sine dokunulmadı.

P2-1 🟩 tamamlanmıştır.

### Commit ve GitHub kaydı

- Commit: `75bfa9366ce64a1fd449469f0993bbf419882965`
- Mesaj: `fix: serve SheetJS locally from pinned package`
- Dal: `main`
- Push: `main -> origin/main` başarılı.
- Push sonrası yerel `HEAD` ile `origin/main` aynı SHA olarak doğrulandı.

---

# 12. P2-2 — npm audit bulgularını kontrollü kapat

**Öncelik:** P2 güvenlik/bakım
**Risk:** Orta-Yüksek
**Durum:** 🟩 Tamamlandı — Express/non-major, sqlite3 6 ve Multer 2 güvenlik/uyumluluk turları doğrulandı; üretim audit sonucu 0

## 12.1 Mevcut doğrulama

8 Ağustos 2026:

`npm audit --omit=dev`

- 14 total
- 1 critical
- 9 high
- 2 moderate
- 2 low

Ana zincirler:

### Express tarafı

`express@4.21.2`

altında:

- body-parser
- qs
- path-to-regexp

### sqlite3 tarafı

`sqlite3@5.1.7`

altında build/tool zinciri:

- node-gyp
- make-fetch-happen
- cacache
- tar

## 12.2 Neden toplu `npm audit fix --force` yapılmamalı?

Çünkü:

- sqlite3 major geçişi native binding davranışını değiştirebilir,
- Express major geçişi route/middleware semantics değiştirebilir,
- projenin 1270 testlik stabil tabanı vardır,
- toplu major update regresyon kaynağını belirsizleştirir.

## 12.3 Seçilen yükseltme sırası

### Tur A — Express ailesi

1. İşe başlanacağı gün `npm audit` yeniden çalıştır.
2. O günkü patched Express 4.x sürümü varsa önce 4.x üzerinde kal.
3. lockfile'ı güncelle.
4. auth/rate-limit/CORS/JSON middleware/slides/student route testlerini çalıştır.
5. core suite.
6. gerçek login + CRUD smoke.

Express 5'e yalnız 4.x güvenli yol kalmadıysa ayrı migration olarak geçilmelidir.

### Tur B — sqlite3

Ayrı commit/branch mantığıyla:

1. sqlite3 6.x compatibility kontrolü.
2. install/native build.
3. DB init/migration.
4. isolated connection.
5. schedule migration.
6. attendance transaction.
7. role transaction.
8. slide delete/reorder transaction.
9. full core suite.
10. gerçek DB'nin kopyasıyla server smoke.

## 12.4 Audit değerlendirme kuralı

Her advisory için:

- runtime mı?
- yalnız install/build zinciri mi?
- kullanıcı kontrollü input ona ulaşabiliyor mu?
- exploit precondition nedir?

ayrı not düşülmelidir.

Yalnız “npm audit kırmızı” olduğu için üretim riskini abartmamak; fakat çözümü de ertelememek gerekir.

## 12.5 Kapanış kriteri

- `npm audit --omit=dev` sonucu anlamlı ölçüde temizlenmiş,
- kabul edilen kalan bulgu varsa gerekçesi bu belgeye yazılmış,
- güncel core suite yeşil,
- native sqlite smoke başarılı

olmalıdır.

## 12.6 Tur A — Express/non-major remediation uygulama ve doğrulama kaydı — 8 Ağustos 2026

**Durum:** 🟩 Tur A tamamlandı; P2-2 ana maddesi henüz tamamlanmadı.

**Commit:** `1c5c8893accc0d4b4022c250400fbc5e7e6bd9e9` — `chore: harden non-major dependencies`

Bu turda major framework/database geçişi yapılmadan, npm'in güvenli non-major çözümleyebildiği bağımlılıklar güncellendi.

### Uygulanan sürüm değişiklikleri

- `express`: `4.21.2` → `4.22.2`
- `body-parser`: `1.20.3` → `1.20.6`
- `qs`: `6.13.0` → `6.15.3`
- `path-to-regexp`: `0.1.12` → `0.1.13`
- `raw-body`: `2.5.2` → `2.5.3`
- `brace-expansion`: `1.1.12` → `1.1.18`
- `minimatch`: `3.1.2` → `3.1.5`
- `ip-address`: `10.1.0` → `10.4.0`
- `side-channel`: `1.1.0` → `1.1.1`
- `side-channel-list`: `1.0.0` → `1.0.1`

`sqlite3` bu turda bilinçli olarak `5.1.7` üzerinde bırakıldı. `Express 5`, `sqlite3 6` ve `Multer 2` aynı değişiklik setine karıştırılmadı.

### Dependency baseline regresyon testi

Yeni test:

`tests/dependency-security-baseline.test.js`

Bu test:

- root `package.json` ile lock root Express aralığının aynı kalmasını,
- gerçek lock sürümünün `express@4.22.2` olmasını,
- Express parser/routing alt zincirinin düzeltilmiş sürümlerde kalmasını,
- non-major transitive güvenlik sürümlerinin lock içinde sabitlenmesini,
- `sqlite3 6.x` major geçişinin bu dalgaya yanlışlıkla karıştırılmamasını

doğrular.

Hedef test sonucu:

- **5 / 5 pass**.

### Temiz kurulum doğrulaması

`npm ci` ile `node_modules` lock dosyasından sıfırdan yeniden kuruldu. Bu adım önemliydi; ilk kontrolde `package.json/package-lock` güncel olmasına rağmen çalışma `node_modules` ağacında eski `express@4.21.2` kalmıştı. Temiz kurulumdan sonra runtime sürümleri yeniden doğrulandı:

- Express 4.22.2
- body-parser 1.20.6
- qs 6.15.3
- path-to-regexp 0.1.13
- raw-body 2.5.3
- sqlite3 5.1.7

### Audit sonucu

Tomografi başlangıcındaki üretim audit'i:

- **14 total**
- 1 critical
- 9 high
- 2 moderate
- 2 low

Tur A sonrası `npm audit --omit=dev`:

- **7 total**
- 1 critical
- 4 high
- 0 moderate
- 2 low

Express/body-parser/qs/path-to-regexp zinciri artık audit bulgularında yer almıyor.

Kalan **7 bulgunun tamamı** npm tarafından `sqlite3@5.1.7 → sqlite3@6.0.1` semver-major çözümüne bağlanıyor. Kalan zincir:

`sqlite3 → node-gyp → make-fetch-happen/cacache/tar/http-proxy-agent/@tootallnate/once`

Özellikle `tar` alt zinciri critical advisory taşıdığı için P2-2 kapatılmayacaktır; sqlite3 major geçişi ayrı test turuyla ele alınacaktır.

### Multer notu

Temiz kurulum sırasında npm ayrıca `multer@1.4.5-lts.2` için 1.x serisinin deprecated olduğunu ve 2.x'e yükseltilmesini önerdi. `npm outdated` güncel major hedefini `2.2.0` olarak gösterdi.

Bu paket mevcut 7 audit kaydının içinde görünmese de upload yüzeyinde kullanıldığı için **Multer 2 major uyumluluk turu ayrıca yapılmalıdır**. sqlite3 major ile aynı commit'e karıştırılmayacaktır.

### Tam regresyon sonucu

Güncellenmiş gerçek `node_modules` ağacı ile:

`npm run test:core`

sonucu:

- **1339 / 1339 pass**
- **0 fail**

Test çıktısındaki bilinen izole test DB startup/teardown log gürültüsü devam etmektedir; yeni dependency dalgasına ait assertion failure oluşmamıştır.

### Gerçek HTTP smoke testi

Asıl `classroom.db` değiştirilmeden `/tmp` DB kopyası ve geçici admin parolası ile gerçek Express 4.22.2 server çalıştırıldı.

Doğrulananlar:

- `/` → 200
- `/admin-login.html` → 200
- `/api/students` → 200
- `/api/slides/active` → 200
- `/api/stats` → 200
- `/api/schedule/normalized` → 200
- yanlış admin parolası → 401
- doğru admin parolası → 200 + session cookie
- `/api/admin/session` → authenticated true + 64 karakter CSRF token
- `/api/admin/slides` → 200
- CSRF korumalı temp `POST /api/settings` → 200
- temp DB readback → yazılan değer gerçekten persisted
- server logunda yeni runtime `ERROR`, `TypeError`, `ReferenceError` veya unhandled hata görülmedi

Temp server ve temp DB test sonunda kaldırıldı.

### Kalan işler

P2-2 halen **🟨 devam ediyor**:

1. `sqlite3@6.0.1` major compatibility/migration turu.
2. Multer 2.x upload compatibility turu.
3. Bu major değişikliklerden sonra yeniden audit + full core + gerçek upload/database smoke.

Tur A'nın başarılı olması P2-2'nin tamamlandığı anlamına gelmez.

## 12.7 Tur A ek doğrulama ayrıntıları — 8 Ağustos 2026

Bu bölüm 12.6'daki Tur A sonucunu tamamlayan ek dry-run, lockfile ve bağımsız fresh-copy kanıtlarını korur; ayrı bir ikinci Tur A değildir.

### Başlangıç audit'i

`npm audit --omit=dev` yeniden çalıştırıldı:

- total: **14**,
- critical: **1**,
- high: **9**,
- moderate: **2**,
- low: **2**.

Direct runtime tarafında:

- `express@4.21.2`,
- `sqlite3@5.1.7`.

### Güncel 4.x Express yolu

Paket metadata ve resmi Express release hattı kontrol edildi. 5.x major'a geçmeden kullanılabilecek güncel 4.x sürümün `4.22.2` olduğu doğrulandı.

İlk `npm install express@4.22.2 --dry-run --ignore-scripts` gerçek çalışma ağacında hiçbir dosya değiştirmeden çalıştırıldı.

Dry-run öngörüsü:

- `express 4.21.2 → 4.22.2`,
- `body-parser 1.20.3 → 1.20.6`,
- `qs 6.13.0 → 6.15.3`,
- `raw-body 2.5.2 → 2.5.3`,
- ilgili küçük yardımcı paket yükseltmeleri.

Dry-run sonrası source Git ağacı temiz kaldı.

### İzole lock üretimi

Asıl checkout'ta package manager ile dosya değiştirilmedi. Repo `/tmp` altında izole kopyalandı ve yalnız temp kopyada:

1. Express 4.22.2 lock güncellemesi,
2. force kullanmadan `npm audit fix --package-lock-only --omit=dev`,
3. audit yeniden değerlendirmesi

yapıldı.

Express-only ilk tur audit sonucu:

- **14 → 11**.

Force'suz semver-uyumlu transitif güvenlik turu sonrası:

- **14 → 7**.

Temizlenen ana zincirler:

- `express`,
- `body-parser`,
- `qs`,
- `path-to-regexp`,
- `brace-expansion`,
- `minimatch`,
- `ip-address`.

Yeni lock sürümleri arasında:

- Express `4.22.2`,
- body-parser `1.20.6`,
- qs `6.15.3`,
- path-to-regexp `0.1.13`,
- raw-body `2.5.3`,
- brace-expansion `1.1.18`,
- minimatch `3.1.5`,
- ip-address `10.4.0`,
- side-channel `1.1.1`,
- side-channel-list `1.0.1`.

### Kalan 7 audit bulgusu

Güvenli dalga sonrası kalanlar:

- `@tootallnate/once`,
- `cacache`,
- `http-proxy-agent`,
- `make-fetch-happen`,
- `node-gyp`,
- `sqlite3`,
- `tar`.

Audit bu yedi bulgunun tamamı için aynı remediation yolunu veriyor:

`sqlite3 5.1.7 → 6.0.1` **major**.

Bu nedenle Tur A commit'ine sqlite3 major karıştırılmadı.

### İlk temiz npm ci kabul turu

İzole temp tree'de node_modules tamamen silinip lockfile'dan sıfırdan `npm ci` yapıldı.

Kurulu kritik sürümler doğrulandı ve hedef Express/auth middleware smoke testleri çalıştırıldı.

Ardından tam core:

- **1334 / 1334 pass**,
- **0 fail**.

Clean-install audit:

- total **7**,
- critical **1**,
- high **4**,
- moderate **0**,
- low **2**.

### Gerçek HTTP smoke — Express 4.22.2

Aynı temiz temp `npm ci` kurulumu gerçek Node server olarak ayrı port/temp DB ile çalıştırıldı.

Doğrulamalar:

- runtime Express version → `4.22.2`,
- admin login page → **200**,
- public slides → **200**,
- local SheetJS asset → **200**,
- yanlış login → **401**,
- doğru login → **200**,
- session cookie ile `/api/admin/session` → **200** + `{ authenticated: true }`.

Temp server kapatılıp DB/cookie/log dosyaları temizlendi.

### Gerçek repoya taşıma ve lock doğrulaması

Temp'te test edilen package/lock farkı gerçek repoya yalnız kontrollü file edit ile uygulandı.

İlk equality kapısı manuel taşıma sırasında `side-channel-list` bloğunda eksik bir JSON virgülü yakaladı. Bu nedenle değişiklik kabul edilmedi; `npm audit` da geçersiz lockfile nedeniyle çalışmadı.

Virgül düzeltildikten sonra:

- `package-lock.json` temp test lockfile'ı ile **byte-for-byte exact match**,
- `package.json` temp package dosyası ile exact dependency match,
- package-lock JSON parse → pass,
- `git diff --check` → temiz,
- source lock audit → **7** kalan bulgu.

### Kalıcı regression guard

Yeni test:

`tests/dependency-security-baseline.test.js`

Bu test:

- Express 4.22.2 baseline'ını,
- parser/routing transitif güvenli sürümleri,
- non-major audit fix sürümlerini,
- sqlite3 major'ın bu dalgaya karışmadığını

kilitler.

Test `test:core` içine dahil edildi.

### İkinci bağımsız fresh-copy kabul turu

Önceki temp kuruluma güvenilmedi. **Güncel gerçek çalışma ağacından** yeni `/tmp` kopya oluşturuldu ve sıfırdan:

- `npm ci`,
- dependency baseline testi,
- auth/rate-limit/JSON/CORS/session hedef paketi,
- tam `test:core`,
- `npm audit --omit=dev`

çalıştırıldı.

Sonuç:

- Express runtime → `4.22.2`,
- sqlite3 → `5.1.7`,
- tam core → **1339 / 1339 pass**,
- **0 fail**,
- audit → **7** kalan bulgu.

Tur A bu kanıtlarla tamamlanmıştır.

### Tur A sonunda P2-2 neden henüz 🟩 değildi?

`sqlite3@6.0.1` remediation yolu major değişiklikti ve resmi node-sqlite3 projesi deprecated/unmaintained durumundaydı. Native binding, migration ve transaction yüzeyleri ayrı değerlendirilmeden bu yükseltme güvenli kabul edilmedi.

Bu nedenle sıradaki iş **Tur B — sqlite3 6.0.1 izole compatibility + native install + migration/transaction/full-core + gerçek DB kopyası smoke** olarak ayrıldı.

## 12.8 Pre-commit kalite kapısında yakalanan slideshow family regresyonu

Tur A dependency değişikliği commit edilmeden önce tam `test:core` tekrar koşulduğunda dependency alanıyla doğrudan ilişkili olmayan bir slideshow testi kırmızı verdi. Bu kırılma "flaky test" denilerek geçilmedi.

Kök neden:

- random transition modu önce yakın geçmişte kullanılan efektleri havuzdan çıkarıyordu,
- daralmış havuz bazı seçimlerde yalnız önceki transition ile aynı motion family'den efekt bırakabiliyordu,
- `avoidConsecutiveTransitionFamily()` alternatif family göremediğinde aynı family tekrarına izin veriyordu.

Deterministic regression `Math.random = () => 0` ile yeniden üretildi:

- 8. seçimde `slide-up → slide-down`,
- iki efekt de `directional` family,
- test güvenilir biçimde kırmızı.

Düzeltme:

- recent-effect avoidance bir tercih olarak tutuldu,
- fakat bu filtre yalnız önceki motion family'yi bırakırsa seçim tam profesyonel havuz üzerinden tekrar yapılıyor,
- adjacent motion-family tekrarına karşı family kuralı öncelikli hale geldi.

Doğrulama:

- hedef transition paketi → **23 / 23 pass**,
- aynı hedef paket art arda **25 / 25** kez geçti,
- temiz `npm ci` worktree full core → **1340 / 1340 pass**,
- ana checkout full core → **1340 / 1340 pass**.

Bu düzeltme dependency commit'ine karıştırılmadı; ayrı commit/push yapıldı:

- Commit: `6a5e0a9386ef6854645d9fe5a0e5c3edbc77ddfe`
- Mesaj: `fix: prevent repeated slideshow motion families`

Bu kayıt, "tam suite kırmızıyken düzeltmeyi kabul etmeme" kuralının gerçek bir ürün hatası yakaladığını belgeler.

## 12.9 Tur B — sqlite3 6.0.1 major güvenlik geçişi — 8 Ağustos 2026

**Durum:** 🟩 sqlite3 Tur B tamamlandı; P2-2 ana maddesi Multer 2.x turu nedeniyle henüz kapanmadı.

### Neden ayrı tur yapıldı?

Tur A sonunda kalan yedi `npm audit` bulgusunun tamamı `sqlite3@5.1.7 → node-gyp/tar` zincirine bağlıydı ve npm'in önerdiği çözüm `sqlite3@6.0.1` major yükseltmesiydi. Native SQLite binding ve transaction davranışı projenin veri bütünlüğü açısından kritik olduğu için bu yükseltme doğrudan ana checkout'ta yapılmadı.

### İzole `/tmp` compatibility turu

Ana repodan bağımsız `/tmp/classroom-sqlite6-candidate` kopyasında önce `sqlite3@6.0.1` kuruldu.

Doğrulanan runtime:

- Node: `22.23.1`
- sqlite3 package: `6.0.1`
- SQLite native library: `3.52.0`
- node-gyp: `12.4.0`
- tar: `7.5.22`

İlk in-memory native smoke:

- database open → başarılı,
- table create → başarılı,
- insert → başarılı,
- readback → başarılı.

İlk transaction smoke denemesinde önemli bir şüphe oluştu: `serialize()` callback'i içindeki bir `db.get()` callback'inden sonra ikinci transaction statement'ları yeniden queue edildiğinde sqlite3 6.0.1 üzerinde `ROLLBACK` sonrası count `2` görüldü; aynı zayıf test şekli sqlite3 5.1.7 üzerinde count `1` veriyordu. Bu sonuç **uyumluluk kanıtı olarak kabul edilmedi** ve Tur B durduruldu.

İnceleme sonucunda ikinci transaction çağrılarının outer `serialize()` callback'i döndükten sonra async `db.get()` callback'i içinden queue edildiği, dolayısıyla testin production transaction modelimizi birebir temsil etmediği görüldü. Production kodundaki gibi her adımı bir önceki callback/Promise tamamlandıktan sonra zincirleyen smoke tekrarlandı:

- COMMIT sonrası count → `1`,
- ikinci transaction INSERT + ROLLBACK sonrası count → `1`,
- DB close → başarılı.

Bu nedenle ilk kırmızı "sqlite3 6 kesin bozuk" diye geçiştirilmedi; test modelinin kendisi düzeltilip gerçek Classroom transaction testleriyle ayrıca doğrulandı.

### İzole transaction regresyon turu

Schedule, attendance, role, slide delete/reorder ve atomik slide-settings alanlarından oluşan transaction ağırlıklı paket çalıştırıldı:

- **457 / 457 pass**
- **0 fail**

Bu paket gerçek SQLite rollback/isolation testlerini de içeriyordu.

### İlk full-core sonucunun teşhisi

İzole sqlite6 kopyasında ilk `test:core`:

- 1340 toplam test,
- 1337 pass,
- 3 fail

verdi.

Üç kırmızının sqlite6 işlev hatası olmadığı ayrı olarak teşhis edildi. Kırılan tek dosya, Tur A için bilinçli olarak yazılmış eski `dependency-security-baseline` guard'ıydı:

- `sqlite3` hâlâ 5.x olmalı beklentisi,
- eski 5.x build-chain transitive paketlerinin lock'ta bulunması beklentisi,
- bunların parent suite sonucu.

Bu eski guard hariç tüm işlevsel core testleri yeniden çalıştırıldı:

- **1335 / 1335 pass**
- **0 fail**

Dolayısıyla migration'ın gerçek uygulama davranışında regresyon üretmediği doğrulandı.

### İzole audit sonucu

sqlite3 6.0.1 graph'ı ile:

`npm audit --omit=dev`

sonucu:

- critical: 0
- high: 0
- moderate: 0
- low: 0
- **total: 0**

Eski sqlite3 5.x build zincirindeki `make-fetch-happen`, `cacache`, `http-proxy-agent` ve `@tootallnate/once` artık aktif lock graph'ında yoktur.

### Gerçek DB kopyası üzerinde migration smoke

Asıl `backend/classroom.db` değiştirilmedi. Dosya `/tmp` içine kopyalanarak sqlite6 server ile açıldı.

Orijinal `backend/classroom.db` dosya SHA-256 değeri:

`7b54675cd70deefeadb5160dfc8eca59b1c10c0383861af1fecf24a8ae8e1a0f`

Başlangıç tablo sayımları:

- students: 8
- roles: 10
- attendance: 8
- schedule: 0
- slides: 7
- settings: 3
- slide_settings: 4
- error_logs: 50

Server açılışı, migration ve HTTP smoke sonrası:

- orijinal proje DB SHA-256 değeri test öncesi/sonrası **aynı kaldı**,
- temp kopyada tablo sayımları **8,10,8,0,7,3,4,50 olarak aynı kaldı**,
- public read endpointleri 200,
- admin login/session başarılı,
- CSRF token 64 karakter,
- atomik `PUT /api/slide-settings` 200,
- server runtime error görülmedi.

İlk smoke çalışmasında aynı-değer ayar write sonrası shell string kontrolü `settings_equal=no` üretmişti. Bu sonuç kabul edilmedi. Test ayrı yeniden çalıştırıldı ve gerçek before/after JSON değerleri yazdırıldı:

- before ve after değerleri birebir aynı,
- semantic comparison → `true`,
- SQLite `typeof(value)` → tüm ilgili ayarlarda `text`.

Böylece ilk ölçümün uygulama veri değişimi değil test karşılaştırma artefaktı olduğu doğrulandı.

### Ana checkout'a kontrollü aktarım

Doğrulanmış sqlite6 lock graph'ı ana checkout'a aktarıldı. Lock aktarımı yalnız JSON parse ile değil canonical JSON SHA-256 ile temp kabul lock'una karşılaştırıldı.

Her iki canonical lock hash'i:

`aa249952d7d6f541b29300c720beec4054f11ad7e9b128a43551229c30776381`

Hash birebir eşleşmeden `npm ci` çalıştırılmadı.

Ana checkout'ta temiz `npm ci` sonrası gerçek runtime:

- Express 4.22.2
- sqlite3 6.0.1
- node-gyp 12.4.0
- tar 7.5.22
- Multer 1.4.5-lts.2

ve `npm audit --omit=dev` tekrar **0 vulnerability** verdi.

### Kalıcı regresyon guard'ları

`tests/dependency-security-baseline.test.js` sqlite6 son durumuna güncellendi. Artık:

- Express güvenli baseline'ını,
- sqlite3 exact `6.0.1` pin'ini,
- node-gyp 12.4.0 / tar 7.5.22 toolchain'ini,
- eski vulnerable sqlite3 5.x build-chain paketlerinin lock'a geri dönmemesini

test ediyor.

Ayrıca yeni:

`tests/sqlite-native-smoke.test.js`

eklendi ve `test:core` içine bağlandı. Bu test:

- sqlite3 package `6.0.1`,
- native SQLite `3.52.0`,
- gerçek file-backed DB üzerinde BEGIN/COMMIT,
- gerçek BEGIN/ROLLBACK

semantiğini kalıcı olarak doğrular.

Native hedef test:

- **3 / 3 pass**

Dependency baseline:

- **6 / 6 pass**

Transaction paketi:

- **457 / 457 pass**

### Ana checkout tam regresyonu

Gerçek sqlite3 6.0.1 `node_modules` ağacı ile son:

`npm run test:core`

sonucu:

- **1344 / 1344 pass**
- **0 fail**

### Ana checkout gerçek DB smoke

İzole temp turundan sonra test ana checkout'un kendi `node_modules` ağacıyla tekrarlandı.

Doğrulananlar:

- sqlite3 package 6.0.1,
- SQLite library 3.52.0,
- kiosk/public endpointleri 200,
- admin login 200,
- session authenticated true,
- CSRF 64 karakter,
- atomik slide-settings değiştirilmiş-değer write 200,
- write sonrası `15000/random/1800` readback başarılı,
- ilgisiz `default_announcement_duration` korundu,
- ikinci atomik write ile eski `10000/auto/1000` değerleri geri yüklendi,
- `PRAGMA quick_check = ok`,
- orijinal DB SHA-256 değişmedi,
- temp kopya tablo satır sayıları değişmedi,
- server runtime error oluşmadı.

Gerçek proje DB'si değiştirilmedi; yalnız `/tmp` kopya kullanıldı.

### Commit ve GitHub kaydı

- Commit: `eeb302618d0e8787470dbeaf6c585669f5ee07ea`
- Mesaj: `chore: upgrade sqlite3 security baseline`
- Dal: `main`
- Push: başarılı
- Push sonrası `HEAD == origin/main` doğrulandı.

### P2-2 neden hâlâ 🟨?

`npm audit` artık **0** olmasına rağmen temiz kurulum şu uyarıyı veriyor:

- `multer@1.4.5-lts.2` 1.x serisi deprecated,
- npm package metadata 2.x'e yükseltmeyi öneriyor,
- güncel major hedef `multer@2.2.0`.

Multer öğrenci fotoğrafı, Excel importu ve slayt medya upload yüzeylerinde bulunduğu için 2.x major geçişi ayrı izole upload compatibility turu olmadan kabul edilmeyecektir.

**Sıradaki iş: Tur C — Multer 2.2.0 upload compatibility + gerçek multipart smoke + full core.**

P2-2 bu nedenle 🟨 açık kalır.

## 12.10 Tur C — Multer 2.2.0 upload runtime major geçişi — 8 Ağustos 2026

**Durum:** 🟩 Tur C tamamlandı; P2-2 ana dependency-security maddesi bu turla kapanmıştır.

### Neden ayrı compatibility turu yapıldı?

`sqlite3` geçişinden sonra `npm audit --omit=dev` sıfır bulguya ulaşmış olsa da temiz `npm ci` kurulumu `multer@1.4.5-lts.2` için açık bir deprecation/security uyarısı veriyordu ve paket metadata'sı 2.x serisine geçilmesini öneriyordu.

Multer projenin doğrudan dosya kabul sınırında bulunduğu için sürüm numarası tek başına yeterli kanıt sayılmadı. Etkilenen gerçek route yüzeyleri:

1. `POST /api/students` — öğrenci fotoğrafı,
2. `POST /api/students/import` — XLSX öğrenci importu,
3. `PUT /api/students/:id/photo` — öğrenci fotoğraf replacement,
4. `POST /api/slides` — slayt medya upload,
5. `PUT /api/slides/:id` — slayt medya replacement.

### İzole `/tmp` Multer 2 adayı

Ana checkout değiştirilmeden `/tmp/classroom-multer2-audit` kopyasında:

- `multer@2.2.0` exact kuruldu,
- Node 22 üzerinde gerçek runtime yüklendi,
- `npm audit --omit=dev` → **0 vulnerability**,
- upload ağırlıklı mevcut regresyon paketi → **170 / 170 pass**,
- temp full `npm run test:core` → **1344 / 1344 pass**, **0 fail**.

Bu aşamada henüz migration kabul edilmedi; gerçek multipart parser davranışı ayrıca sınandı.

### İlk gerçek slayt upload testinde yakalanan test girdisi hatası

İlk gerçek slayt upload smoke'unda `.webp` dosyası kullanıldı ve Multer 2 route'u HTTP 500 döndürdü. Bu sonuç migration failure diye kabul edilmedi; server log ve mevcut `fileFilter` kodu incelendi.

Kök neden:

- slayt `fileFilter` uzantı regex'i `jpeg|jpg|png|gif|mp4|webm|mov`,
- `.webp` slayt uzantısı mevcut ürün sözleşmesinde listede yok,
- koşul hem uygun uzantı hem uygun MIME istediği için WebP bilinçli/mevcut biçimde reddediliyordu.

Bu nedenle test girdisi geçerli `.png` ile tekrarlandı ve gerçek slayt create başarılı oldu. WebP sonucu Multer 2 regresyonu olarak sınıflandırılmadı.

### Gerçek multipart ürün akışları — izole Multer 2 server

Gerçek `curl multipart/form-data`, admin session cookie ve gerçek CSRF token ile:

#### Öğrenci fotoğraf create

- gerçek WebP fotoğraf upload,
- HTTP **200**,
- DB'de `/uploads/<dosya>` web yolu,
- fiziksel dosya temp `backend/uploads` altında gerçekten oluştu.

#### Öğrenci fotoğraf update

- ikinci gerçek WebP upload,
- HTTP **200**,
- yeni dosya oluştu,
- eski managed fotoğraf fiziksel olarak silindi.

#### Gerçek Excel import

- repo içindeki `docs/ornek_ogrenci_listesi.xlsx` multipart olarak gönderildi,
- HTTP **200**,
- **4 öğrenci** insert edildi,
- XLSX için oluşturulan geçici upload dosyası işlem bitince silindi,
- upload klasörü dosya sayısı import öncesi/sonrası değişmedi.

#### Slayt create

- gerçek PNG multipart upload,
- HTTP **200**,
- DB `media_path` üretildi,
- fiziksel dosya `backend/uploads/slides` altında doğrulandı.

#### Slayt media replacement

Fresh-copy final kabul turunda slayta ikinci PNG yüklendi:

- HTTP **200**,
- yeni media path DB'de görüldü,
- yeni fiziksel dosya oluştu,
- önceki slayt medya dosyası silindi.

### Boyut ve rejection davranışları

#### 6 MB öğrenci fotoğrafı

Multer route limiti 10 MB, uygulama iş kuralı 5 MB'dir.

Gerçek 6 MB JPEG:

- Multer parser'dan geçti,
- uygulama 5 MB kontrolü → HTTP **400**,
- mesaj: `Resim dosyası çok büyük. Maksimum 5MB olmalıdır.`,
- upload edilen fiziksel dosya temizlendi,
- orphan oluşmadı.

#### Geçersiz slayt MIME/fileFilter

Gerçek `text/plain` dosyası:

- HTTP **500** generic JSON,
- `{ "error": "Sunucu hatası oluştu" }`,
- slayt upload klasöründe yeni/orphan dosya oluşmadı.

#### 11 MB öğrenci fotoğrafı

Gerçek 11 MB JPEG:

- Multer middleware 10 MB limiti → `MulterError: LIMIT_FILE_SIZE`,
- mevcut global error handler → HTTP **500** generic JSON,
- partial/orphan dosya kalmadı.

### Multer 1 kontrol karşılaştırması

500 davranışlarının 2.x regresyonu olup olmadığı ayrı bir `/tmp/classroom-multer1-control` sunucusunda, aynı isteklerle kontrol edildi.

Multer 1.4.5-lts.2 de:

- invalid slayt fileFilter → aynı HTTP 500 generic JSON,
- >10 MB fotoğraf → aynı HTTP 500 generic JSON,
- iki senaryoda da orphan dosya yok

sonucunu verdi.

Dolayısıyla bu HTTP 500 error-mapping davranışı **Multer 2 tarafından oluşturulmuş bir regresyon değildir**. Mevcut backend error UX borcudur ve ileride ayrı iyileştirme olarak ele alınmalıdır; Tur C migration kabulünü bozmaz.

### Ana checkout'a lock aktarımı

Multer 2 lock farkı satır diff'iyle değil yapısal JSON olarak incelendi:

- 4 mevcut package kaydı değişti,
- Multer 1.x'e özgü 9 artık kullanılmayan kayıt kaldırıldı,
- `concat-stream` 2.0.0,
- `readable-stream` 3.6.2,
- `multer` 2.2.0.

Doğrulanmış temp lock ana checkout'a taşındıktan sonra canonical JSON SHA-256 karşılaştırması yapıldı.

Her iki lock hash'i:

`3cd8ca26b754e14e583825a472233762b458e1b4bd0cb2fa6c406b87e7eabdb4`

Hash birebir eşleşmeden `npm ci` çalıştırılmadı.

### Ana checkout temiz kurulumu

`npm ci` sonrası gerçek runtime tree:

- Express 4.22.2,
- Multer **2.2.0**,
- busboy 1.6.0,
- concat-stream 2.0.0,
- readable-stream 3.6.2,
- sqlite3 6.0.1.

`npm audit --omit=dev`:

- info: 0,
- low: 0,
- moderate: 0,
- high: 0,
- critical: 0,
- **total: 0**.

Multer 1.x deprecation uyarısı temiz `npm ci` çıktısından kalktı.

### Kalıcı dependency guard

`tests/dependency-security-baseline.test.js` genişletildi.

Artık ayrıca:

- `package.json` Multer exact `2.2.0`,
- lock root Multer exact `2.2.0`,
- locked Multer `2.2.0`,
- concat-stream `2.0.0`,
- readable-stream `3.6.2`,
- Multer 1.x bagajı olan `mkdirp`, `object-assign`, `xtend`, `process-nextick-args`, `core-util-is`, `isarray` lock'a geri dönmemeli

sözleşmelerini korur.

Güncel dependency baseline:

- **8 / 8 pass**.

### Kalıcı gerçek multipart runtime smoke

Yeni test:

`tests/multer-runtime-smoke.test.js`

Bu test gerçek ephemeral Express HTTP server + gerçek `FormData/Blob` multipart üzerinden:

1. runtime Multer version = 2.2.0,
2. gerçek PNG multipart upload → alanlar parse edilir ve fiziksel dosya oluşur,
3. `fileFilter` rejection → error + orphan yok,
4. file-size limit → `LIMIT_FILE_SIZE` + partial/orphan yok

kontrollerini yapar.

Test `test:core` içine kalıcı olarak eklendi.

Hedef runtime smoke:

- **5 / 5 pass**.

### Ana checkout upload-heavy regresyon paketi

Multer 2 gerçek `node_modules` ağacı üzerinde:

- student photo create/update,
- Excel import error/redaction,
- slide create/cache,
- slide media path,
- slide update,
- admin upload middleware auth/order,
- rate-limit

alanlarını içeren paket:

- **170 / 170 pass**
- **0 fail**.

### Ana checkout tam regresyonu

Commit öncesi iki tam core turu çalıştırıldı. Son fresh kapı:

`npm run test:core`

- **1351 / 1351 pass**
- **0 fail**.

Testlerdeki bilinen izole DB startup/teardown log gürültüsü dışında assertion failure yoktur.

### Fresh-copy final multipart kabulü

Ana çalışma ağacındaki değişikliklerden **yeni bir `/tmp` proje kopyası** oluşturuldu. Bu kopyada yeniden `npm ci` yapıldı:

- Multer 2.2.0,
- audit total 0.

Gerçek HTTP + gerçek multipart ile yeniden doğrulandı:

- admin login 200 + 64 karakter CSRF,
- öğrenci fotoğraf create 200,
- öğrenci fotoğraf update 200 + eski file cleanup,
- gerçek XLSX import 200 + 4 kayıt + temp Excel cleanup,
- slayt create PNG 200,
- slayt media replacement PNG 200 + eski file cleanup,
- 6 MB uygulama limiti 400 + orphan yok,
- invalid slide filter 500 generic + orphan yok + Multer 1 kontrolüyle aynı,
- 11 MB Multer limiti 500 generic + orphan yok + Multer 1 kontrolüyle aynı,
- slayt delete 200,
- öğrenci delete 200,
- kapanışta root upload dosyaları: **0**,
- kapanışta slide upload dosyaları: **0**.

Asıl `backend/classroom.db` ve gerçek proje upload dosyaları bu kabul turunda değiştirilmedi.

### Commit ve GitHub kaydı

- Commit: `174760a90b3f15a8bf39f1598bcf021fc00dd3c1`
- Mesaj: `chore: upgrade multer upload runtime`
- Dal: `main`
- Push: başarılı
- Push sonrası `HEAD == origin/main` doğrulandı.

### P2-2 kapanış kararı

Başlangıçta üretim dependency taraması **14 vulnerability** veriyordu. Üç kontrollü tur sonunda:

- Tur A: Express/non-major dependency remediation,
- Tur B: sqlite3 6.0.1 native/database migration,
- Tur C: Multer 2.2.0 upload runtime migration

ayrı ayrı test edilip kabul edildi.

Güncel sonuç:

- `npm audit --omit=dev` → **0 vulnerability**,
- deprecated Multer 1.x kaldırıldı,
- Express 4.22.2,
- sqlite3 6.0.1 / SQLite 3.52.0,
- Multer 2.2.0,
- full core **1351 / 1351**.

**P2-2 🟩 Tamamlandı.**

### Yeni gözlem — migration dışı upload error UX borcu

Tur C gerçek multipart testleri şu mevcut davranışı ayrıca görünür hale getirdi:

- slayt `fileFilter` rejection,
- Multer `LIMIT_FILE_SIZE`

gibi parser/middleware hataları global Express error handler'a düşüp HTTP 500 generic JSON olarak dönüyor.

Multer 1 kontrolünde de birebir aynı olduğu için bu bir Multer 2 regresyonu değildir. Ancak semantik olarak kullanıcı input/rejection türündeki bu hataların gelecekte kontrollü **4xx** response ve öğretmene açıklayıcı mesajla eşlenmesi daha doğrudur.

Bu gözlem kaybolmamalı; backend error UX/hardening sırasında ayrı düzeltme maddesi olarak ele alınacaktır.

---

# 13. P2-3 — GitHub Actions kırmızı push koşusunu temizle

**Öncelik:** P2 CI güvenilirliği  
**Kod riski:** Düşük  
**Durum:** 🟩 Tamamlandı — güncel `main` push Core Tests matrisi Node 22 ve Node 24 üzerinde yeşil

## 13.1 Tarihsel sorun

Eski `6865630` SHA'sında:

- manual Node 22 → success,
- manual Node 24 → success,
- fakat bir push run kırmızı görünmüştü.

O kırmızı run test assertion failure değildi. GitHub Actions annotation'ı hosted runner job'unun acquire edilemediğini gösteriyordu. Yani o tarihsel kırmızı durum kod/test regresyonu değil runner provisioning altyapı olayıydı.

## 13.2 Güncel doğrulama — 8 Ağustos 2026

Dependency-security Tur C sonrası iki ardışık güncel `main` push'u GitHub Actions üzerinde kontrol edildi.

### Multer 2 kod commit'i

SHA:

`174760a90b3f15a8bf39f1598bcf021fc00dd3c1`

Core Tests push run sonucu:

- overall → **success**,
- Node 22 → **success**,
- Node 24 → **success**.

### En güncel belge/main commit'i

SHA:

`97203eda9d4954973920125f8e5ded998ee0073e`

GitHub Actions run ID:

`31267211753`

Run, beklenerek senkron biçimde tamamlandı ve `--exit-status` ile success doğrulandı.

Node 22 job:

- checkout → success,
- setup-node 22 → success,
- `npm ci` → success,
- `npm run test:core` → success,
- job conclusion → **success**.

Node 24 job:

- checkout → success,
- setup-node 24 → success,
- `npm ci` → success,
- `npm run test:core` → success,
- job conclusion → **success**.

Overall run conclusion:

**success**

Böylece güncel lockfile içindeki Express 4.22.2 + sqlite3 6.0.1 + Multer 2.2.0 bağımlılık ağacının yalnız yerel Node 22 ortamında değil, GitHub hosted runner üzerinde hem Node 22 hem Node 24 ile temiz `npm ci` sonrası tüm core suite'i geçtiği doğrulanmıştır.

## 13.3 Kapanış kararı

Eski runner-acquisition failure artık güncel `main` sağlık durumunu temsil etmiyor. Daha yeni birden fazla push run yeşildir ve `main` son doğrulanmış SHA'sında visible Core Tests matrisi yeşildir.

**P2-3 🟩 Tamamlandı.**

Bu kapanış kaydının kendisi push edildiğinde oluşacak yeni docs-only Core Tests run'ı da ayrıca beklenip kontrol edilecektir; bunun sonucu yeni bir doküman commit'i üretmeden oturum kanıtı olarak doğrulanacaktır.

---

# 14. P2-4 — Dinamik resize sonrası titlebar GSAP kaymasını düzelt

**Öncelik:** P2 kiosk dayanıklılığı  
**Sabit kiosk etkisi:** Düşük  
**Responsive/dev/hotplug etkisi:** Orta  
**Durum:** 🟩 Tamamlandı — GSAP entrance sonrası layout transform sahipliği CSS'e geri verildi ve canlı resize/fullscreen matrisi doğrulandı

## 14.1 Düzeltme öncesi güncel HEAD üzerinde yeniden üretim

Geçmiş tomografi bulgusu tek başına kabul edilmedi. P2-4 başlangıcında güncel `main` kodu temp DB ve gerçek Chromium ile yeniden çalıştırıldı.

Fresh 3840×2160 yüklemede sekiz titlebar doğru görünüyordu. Ancak entrance animasyonu bittikten sonra ilk beş titlebar üzerinde GSAP inline transform bırakıyordu:

- sol kolon başlıkları yaklaşık `translate(-518.398px, 0px)`,
- merkez kolon başlıkları yaklaşık `translate(-912.438px, 0px)`.

Bu değerler o anki `%50` merkezlemenin piksel karşılığıydı.

Aynı sayfa reload edilmeden 3840×2160 → 1920×1080 küçültüldüğünde:

- ilk üç titlebar kart merkezinden **−259 px** kaydı,
- sonraki iki merkez titlebar yaklaşık **−456 px** kaydı,
- bu beş elementin tamamı kendi kart sınırı açısından overflow durumuna geçti,
- sağ sütundaki üç titlebar yüzde tabanlı transform'u koruduğu için düzgün kaldı.

Body scroll yine viewport sınırındaydı; yani problem grid değil, titlebar transform sahipliğiydi.

## 14.2 Kök neden

Titlebar layout'u CSS tarafından:

- `left: 50%`,
- `transform: translateX(-50%)`

ile merkezleniyor.

Full-motion entrance timeline aynı element üzerinde `y` ve `scale` animasyonu yaptığı için GSAP bazı titlebar'ların mevcut yüzde transformunu computed piksel transform olarak inline style'a materialize ediyordu.

Animasyon tamamlandığında bu inline transform temizlenmediği için viewport değişiminde:

- kart genişliği değişiyor,
- CSS `50%` doğal olarak yeni genişliğe uyarlanmak istiyor,
- fakat inline piksel transform CSS transformunu override ederek eski genişliğin yarısını kullanmaya devam ediyordu.

### Kök neden deneysel doğrulaması

Bozuk 1920×1080 durumda production kod değiştirilmeden DevTools içinden yalnız:

```js
gsap.set('.card-titlebar', {
  clearProps: 'transform,translate,rotate,scale'
})
```

uygulandı.

Sonuç:

- sekiz titlebar'ın tamamı anında kart merkezine döndü,
- inline motion style boşaldı,
- overflow 0 oldu,
- CSS computed transform yeni kart genişliğine göre yeniden hesaplandı.

Bu deney Seçenek A'nın doğrudan kök nedene dokunduğunu doğruladı.

## 14.3 TDD kırmızı testi

Üretim koduna dokunmadan önce yeni test yazıldı:

`tests/kiosk-titlebar-resize.test.js`

Test harness gerçek `kiosk-motion.js` dosyasını VM içinde sahte GSAP/document ile çalıştırır ve şu sözleşmeleri korur:

1. full-motion entrance timeline tamamlandığında titlebar motion transformları temizlenmeli,
2. mevcut titlebar `y/scale` entrance animasyonu korunmalı,
3. reduced-motion branch mevcut `clearProps: all` davranışını korumalı.

İlk kırmızı koşu:

- test toplamı: 4,
- pass: 2,
- fail: 2,
- failure: entrance timeline config üzerinde `onComplete` yoktu.

Bu kırmızı sonuç tam olarak canlı tarayıcıda görülen eksik cleanup davranışını yakaladı.

## 14.4 Uygulanan minimal düzeltme

Dosya:

`public/js/kiosk-motion.js`

Full-motion entrance timeline'a yalnız bir `onComplete` callback eklendi:

```js
onComplete: () => {
    gsap.set('.card-titlebar', {
        clearProps: 'transform,translate,rotate,scale'
    });
}
```

Böylece:

- entrance animasyonu aynen çalışmaya devam eder,
- animasyon sırasında GSAP transform'u yönetebilir,
- timeline tamamlanınca layout ile ilgili inline transform/individual transform property'leri temizlenir,
- `left:50% + translateX(-50%)` yeniden tek source of truth olur.

Titlebar wrapper mimarisi değiştirilmedi; Seçenek B'ye ihtiyaç kalmadı.

## 14.5 Otomatik test sonucu

Hedef regression testi düzeltme sonrası:

- **4 / 4 pass**.

Komşu kiosk paketi:

- Magic Park,
- icon system,
- kiosk runtime optimization,
- interval lifecycle,
- titlebar resize regression

birlikte:

- **20 / 20 pass**.

Yeni script:

`npm run test:kiosk-titlebar-resize`

ve test dosyası kalıcı `test:core` kapısına eklendi.

Son local tam core:

- **1355 / 1355 pass**,
- **0 fail**.

## 14.6 Gerçek Chromium kabul matrisi

Asıl `classroom.db` değiştirilmedi. DB `/tmp` içine kopyalanarak gerçek server + Chromium DevTools ile test edildi.

### Fresh 3840×2160

Entrance tamamlandıktan sonra:

- titlebar inline style sayısı: **0**,
- overflow: **0 / 8**,
- document scroll: **3840×2160**,
- computed yüzde merkezleme CSS tarafından doğru uygulandı.

### 3840×2160 → 1920×1080 canlı resize

Reload yapılmadan:

- overflow: **0 / 8**,
- sekiz titlebar kart merkeziyle hizalı,
- inline titlebar motion style: boş,
- document scroll: **1920×1080**.

Bu, düzeltme öncesinde ilk beş titlebar'ın −259/−456 px kaydığı doğrudan regresyon senaryosudur.

### 1920×1080 → 3840×2160 canlı resize

Aynı sayfada geri büyütme:

- overflow: **0 / 8**,
- body scroll yok.

Ayrıca ayrı bir **fresh 1920×1080 load → 3840×2160** zinciri de çalıştırıldı:

- fresh 1920 overflow 0,
- inline style 0,
- 3840'e canlı resize sonrası overflow yine 0.

### Fresh 2560×1440 → 1366×768

- fresh 2560 overflow: 0,
- inline titlebar style: 0,
- 1366×768 canlı resize sonrası overflow: **0 / 8**,
- sekiz titlebar için left/right kart sınırı sapması 0,
- document scroll: **1366×768**.

### Reduced-motion

Sayfa navigasyon öncesi `matchMedia('(prefers-reduced-motion: reduce)')` koşulu gerçek motion bootstrap'tan önce emüle edildi.

Sonuç:

- reduced-motion branch aktif,
- titlebar inline motion style sayısı 0,
- overflow 0,
- scroll viewport ile birebir.

Otomatik VM testi reduced-motion cleanup sözleşmesini ayrıca korur.

### Gerçek DOM Fullscreen API enter/exit

1920×1080 sayfada `document.documentElement.requestFullscreen()` gerçekten başarılı oldu.

Fullscreen enter:

- `document.fullscreenElement` aktif,
- overflow 0,
- body scroll yok.

`document.exitFullscreen()` sonrası:

- fullscreen state kapandı,
- overflow yine 0,
- layout aynı kaldı.

### Console

Normal-motion fresh 1920→3840 kabul zinciri sonunda Chromium console:

- error: 0,
- warn: 0.

## 14.7 Commit ve GitHub CI

Kod/test commit'i:

- SHA: `7f6d79e8179cec12630d9e6de7055c213dd3c90e`
- Mesaj: `fix: preserve kiosk titlebar centering on resize`
- Push: başarılı
- Push sonrası `HEAD == origin/main` doğrulandı.

GitHub Actions Core Tests run:

- Run ID: `31267691850`
- overall: **success**
- Node 22: `npm ci` + `npm run test:core` → **success**
- Node 24: `npm ci` + `npm run test:core` → **success**

## 14.8 Kapanış kararı

Düzeltme yalnız source-level testle değil, geçmişte bozulduğu ölçülen gerçek viewport geçişlerinin tamamıyla doğrulandı. GSAP artık entrance bittikten sonra CSS layout transformunu override etmiyor.

**P2-4 🟩 Tamamlandı.**

---

# 15. P2-5 — Atatürk fallback slayt modelini sistem sahipliğine geçir

**Öncelik:** P2  
**Risk:** Orta  
**Durum:** 🟩 Tamamlandı — yedi Atatürk fallback slaytı canonical system-owned startup safety seti haline getirildi

## 15.1 Düzeltme öncesi doğrulanan sorun

Fallback seti kiosk'un kalıcı güvenli içerik katmanı olarak tasarlanmıştı; fakat önceki model gerçekte system-owned değildi.

Düzeltme öncesinde:

- fallback satırları normal `slides` kayıtları gibi admin listesine geliyordu,
- doğrudan API ile update edilebiliyordu,
- `is_active = 0` yapılabiliyordu,
- reorder edilebiliyordu,
- delete edilebiliyordu,
- DB seed'i `fallback_ataturk_slides_seeded_v1` marker'ı nedeniyle yalnız ilk kurulumda çalışıyordu,
- marker kaldığı halde bir fallback silinirse restart onu geri getirmiyordu,
- fallback satırının canonical alanları doğrudan değiştirilirse restart bu bozulmayı onarmıyordu.

Bu durum “teacher content yoksa her zaman güvenli Atatürk setine düş” ürün sözleşmesiyle çelişiyordu.

## 15.2 Kesin ürün kararı

Fallback slaytlarının rolü şu şekilde sabitlendi:

> Atatürk fallback slaytları öğretmenin yönettiği içerik değildir; kiosk'un **system-owned güvenlik ağıdır**.

Buna göre yeni sözleşme:

- her startup'ta canonical reconciliation,
- tam **7** bilinen `fallback_key`,
- eksik kayıt otomatik geri gelir,
- bozulmuş/deactivate edilmiş sistem kaydı canonical aktif değerlere döner,
- duplicate oluşmaz,
- admin management listesinde görünmez,
- admin API ile update edilemez,
- delete edilemez,
- reorder edilemez,
- active teacher slide varsa kiosk yalnız teacher content gösterir,
- aktif teacher slide kalmazsa kiosk otomatik yedi system fallback'e döner.

## 15.3 TDD kırmızı aşaması

Üretim koduna dokunmadan önce iki yeni gerçek SQLite/HTTP testi yazıldı.

### `tests/slides-fallback-reconciliation.test.js`

Gerçek temp SQLite DB ile:

1. ilk startup'ta yedi canonical fallback,
2. `ataturk-science` satırını fiziksel olarak silme,
3. `ataturk-education` satırını title/media/text/duration/transition/order/active/fallback alanlarıyla bozma,
4. DB'yi kapatıp aynı DB path ile gerçek module restart,
5. eksik slide restore,
6. bozulmuş slide canonical repair,
7. üçüncü restart'ta duplicate oluşmaması

sözleşmelerini test eder.

### `tests/slides-fallback-system-owned.test.js`

Gerçek temp DB + Express server + gerçek admin login/session/CSRF ile:

- admin management listesinde teacher slide var ama fallback yok,
- fallback update → 403,
- fallback reorder → 403,
- fallback delete → 403,
- teacher-owned slide normal update/deactivate/delete akışını koruyor,
- doğrudan multipart-style fallback update denemesinde oluşmuş geçici upload dosyası 403 dönmeden önce siliniyor.

İlk kırmızı koşu:

- toplam kontrol: **11**,
- pass: **2**,
- fail: **9**.

Kırılmalar tam olarak beklenen eski davranışlardı:

- restart eksik fallback'i restore etmiyordu,
- bozulmuş fallback canonical hale gelmiyordu,
- admin fallback'leri listeliyordu,
- update/reorder/delete 200 dönüyordu.

Teacher-owned normal CRUD başlangıçtan beri yeşil kaldı.

## 15.4 Uygulanan database reconciliation

Dosya:

`backend/database.js`

Eski marker-gated `INSERT OR IGNORE ... WHERE NOT EXISTS(settings marker)` modeli kaldırıldı.

Yerine her startup'ta yedi canonical kayıt için:

```sql
INSERT INTO slides (..., is_active, expires_at, priority,
                    is_poster, is_fallback, fallback_key)
VALUES (..., 1, NULL, 5, 0, 1, ?)
ON CONFLICT(fallback_key) DO UPDATE SET
    ...canonical fields...,
    is_active = 1,
    expires_at = NULL,
    priority = 5,
    is_poster = 0,
    is_fallback = 1
```

modeli getirildi.

Böylece startup reconciliation artık:

- olmayan fallback'i insert eder,
- aynı `fallback_key` varsa duplicate oluşturmaz,
- title/content/media/text/duration/transition/order gibi canonical alanları geri yükler,
- `is_active` değerini tekrar 1 yapar,
- `expires_at` değerini temizler,
- `is_fallback` değerini tekrar 1 yapar.

Eski `fallback_ataturk_slides_seeded_v1` setting'i backward compatibility/tarihsel metadata amacıyla bırakıldı ancak artık reconciliation'ı **gate etmez**.

## 15.5 Canonical system set

Startup her zaman şu yedi key'i korur:

1. `ataturk-education`
2. `ataturk-children`
3. `ataturk-sovereignty`
4. `ataturk-youth`
5. `ataturk-science`
6. `ataturk-love`
7. `ataturk-future`

Canonical ortak davranış:

- content type: `rule`,
- media type: `image`,
- süre: 12000 ms,
- transition: `fade`,
- transition duration: 1000 ms,
- transition mode: `auto`,
- active: 1,
- expires_at: NULL,
- priority: 5,
- poster: 0,
- fallback: 1,
- display order: 1..7.

Her key kendi canonical başlık, Atatürk WebP görseli ve metnine geri reconcile edilir.

## 15.6 Admin management sınırı

`GET /api/admin/slides` artık yalnız teacher-owned satırları döndürür:

```sql
WHERE COALESCE(is_fallback, 0) = 0
```

Sonuç:

- öğretmen admin panelinde yalnız kendi içeriklerini yönetir,
- system fallback satırları normal slide card'ı olarak görünmez,
- accidental UI mutation yüzeyi ortadan kalkar.

Public kiosk read sözleşmesine dokunulmadı.

## 15.7 Backend system-owned mutasyon korumaları

### Update

`PUT /api/slides/:id` lookup artık `is_fallback` de okur.

Fallback için:

- HTTP **403**,
- `{ "error": "Sistem slaytları düzenlenemez" }`,
- DB update yapılmaz,
- request ile fiziksel upload gelmişse geçici dosya silinir.

### Delete

Isolated transaction lookup artık `is_fallback` okur.

Fallback için:

- transaction rollback,
- HTTP **403**,
- `{ "error": "Sistem slaytları silinemez" }`,
- kayıt DB'de kalır,
- media cleanup çalışmaz.

### Reorder

Mevcut `BEGIN IMMEDIATE` transaction içinde update statement hazırlanmasından önce bütün requested slide ID'leri için ownership precheck yapılır.

Fallback ID bulunursa:

- rollback,
- connection close,
- HTTP **403**,
- `{ "error": "Sistem slaytları yeniden sıralanamaz" }`.

Ownership precheck DB hatası ise generic 500 + rollback sözleşmesi korunur.

Teacher-owned reorder'ın mevcut transaction/cache davranışı değiştirilmedi.

## 15.8 Eski regresyon testlerinin semantik güncellemesi

Yeni ownership lookup/precheck nedeniyle mevcut test doubles güncellendi; eski success/rollback beklentileri gevşetilmedi.

Güncellenen ana testler:

- `slides-delete-id.test.js`,
- `slides-update-id.test.js`,
- `slides-update-cache.test.js`,
- `slides-reorder-route.test.js`,
- `slides-reorder-cache.test.js`.

Bu testler artık `is_fallback` lookup alanını ve reorder ownership precheck'ini modellerken eski:

- transaction order,
- rollback,
- commit,
- cache preservation/invalidation,
- gerçek SQLite atomicity

assertion'larını korur.

Eski `slides-fallback-seed.test.js` içindeki tarihsel “fallback editable” DB assertion'ı kaldırıldı. Test adı da system-owned politika ile uyumlu hale getirildi. Doğrudan DB corruption'ın startup'ta onarılması artık daha güçlü gerçek restart testi tarafından kapsanıyor.

## 15.9 Otomatik regresyon sonuçları

Yeni P2-5 target testleri düzeltme sonrası tamamen yeşil oldu.

Yeni upload-cleanup alt testiyle beraber system-owned/reconciliation hedefleri de geçti.

Geniş slayt komşu paketi:

- fallback seed,
- reconciliation,
- system-owned mutation,
- admin slide list/management,
- update ID/cache,
- delete ID/redaction/transaction/cache,
- reorder route/cache,
- real SQLite reorder atomicity,
- active read redaction,
- create cache

birlikte:

- **173 / 173 pass**,
- **0 fail**.

İki yeni test kalıcı `test:core` kapısına eklendi.

Son local:

`npm run test:core`

- **1367 / 1367 pass**,
- **0 fail**.

Ayrıca:

- `git diff --check` temiz,
- ilgili JS dosyaları `node --check` temiz,
- `npm audit --omit=dev` → **0 vulnerability**.

## 15.10 Gerçek `classroom.db` kopyası ile bozulma/restart kabul testi

Asıl `backend/classroom.db` değiştirilmedi; `/tmp` kopyası kullanıldı.

Test başlamadan kopya üzerinde bilinçli olarak:

- `ataturk-science` silindi,
- `ataturk-education` title/media/text/duration/transition/order alanları bozuldu,
- `is_active = 0`,
- `is_fallback = 0`

yapıldı.

Ayrıca gerçek active teacher content davranışını sınamak için ayrı teacher-owned slide eklendi.

Bozulma sonrası:

- fallback_key bulunan satır: 6,
- `is_fallback = 1` satır: 5.

### Gerçek server startup sonrası

Aynı bozulmuş DB kopyası yeni kodla açıldığında:

- fallback_key sayısı: **7**,
- aktif fallback sayısı: **7**,
- silinen `ataturk-science`: tekrar mevcut,
- bozulmuş `ataturk-education`: tamamen canonical,
- title/media/duration/transition/order/active/fallback değerleri restore edildi.

Active teacher slide bulunduğunda:

- `/api/slides/active` count: **1**,
- dönen içerik teacher slide,
- fallback count: **0**.

## 15.11 Gerçek HTTP ownership kabul testi

Aynı temp server'da gerçek admin login/session/CSRF kullanıldı.

Admin management listesi:

- teacher slide present: true,
- fallback count: **0**.

System fallback update:

- HTTP **403**,
- before/after DB aynı.

System fallback reorder:

- HTTP **403**,
- canonical display order aynı.

System fallback delete:

- HTTP **403**,
- row count aynı.

Teacher slide `is_active = 0` yapıldığında:

- update HTTP 200,
- `/api/slides/active` count: **7**,
- fallback count: **7**.

Yani teacher content kaybolduğu anda kiosk güvenlik ağı gerçekten otomatik devraldı.

## 15.12 İkinci restart / idempotency kabulü

Aynı temp DB bir kez daha server restart'tan geçirildi.

Sonuç:

- fallback_key rows: **7**,
- unique fallback_key rows: **7**,
- duplicate key group: **0**,
- active fallback rows: **7**,
- inactive teacher satırı DB'de korunuyor,
- active endpoint yine 7 fallback döndürüyor,
- server runtime error logu yok.

Bu test startup reconciliation'ın yalnız ilk onarımda değil tekrarlı startup'ta da idempotent olduğunu doğruladı.

## 15.13 Commit ve GitHub CI

Kod/test commit'i:

- SHA: `f314dca0c921e1e30dcad71dd8574577b6dc4cbc`
- Mesaj: `fix: make fallback slides system owned`
- Push: başarılı
- Push sonrası `HEAD == origin/main`.

GitHub Actions Core Tests:

- Run ID: `31268609230`
- event: push
- overall: **success**

Node 22:

- checkout success,
- setup-node success,
- `npm ci` success,
- `npm run test:core` success,
- job conclusion **success**.

Node 24:

- checkout success,
- setup-node success,
- `npm ci` success,
- `npm run test:core` success,
- job conclusion **success**.

## 15.14 Kapanış kararı

Fallback modeli artık “ilk kez seed edilen normal editable slide satırları” değildir.

Bugünkü sözleşme:

- canonical,
- restart self-healing,
- duplicate-safe,
- system-owned,
- admin listesinden ayrı,
- API mutation'a kapalı,
- teacher content yokken otomatik aktif güvenlik ağıdır.

**P2-5 🟩 Tamamlandı.**

---

# 16. P2-6 — Fiziksel kiosk kabul turu

**Öncelik:** P2 ürün kalite kapısı  
**Kod değişikliği:** Önce hayır  
**Durum:** 🟨 Browser/otomatik ön-kabul tamamlandı — gerçek 55" 4K TV fiziksel kabulü bekliyor

Browser emülasyonu fiziksel 55" TV'nin yerini tutmaz. Bu nedenle aşağıdaki otomatik/browser kanıtlar başarılı olsa da P2-6, gerçek donanım görülmeden 🟩 kapatılmayacaktır.

## 16.1 Ana hedef

3840×2160 gerçek TV / gerçek Chromium kiosk.

## 16.2 Test içerikleri

### Layout

- tüm sekiz bölge
- clipping yok
- başlık taşması yok
- fontlar kesilmiyor
- uzun öğrenci adı
- 4 nöbetçi
- 2 yardımcı
- çoklu yıldız

### Slideshow

- image
- portrait
- landscape
- GIF
- video
- caption kısa/uzun
- 1 slide
- çok slide
- teacher slide → fallback geçişi

### Ses

- mikrofon var
- mikrofon yok
- izin reddi
- yeniden dene
- sessiz sınıf
- yüksek ses

### Ders zamanı

Time simulator ile:

- ders öncesi
- ders
- teneffüs
- öğle
- okul sonrası
- Cuma çıkış
- Cumartesi
- Pazar

### Dayanıklılık

- internet yok
- backend restart
- browser refresh
- fullscreen/kiosk yeniden açılış

## 16.3 Browser/otomatik ön-kabul kaydı — 8 Ağustos 2026

Asıl `backend/classroom.db` değiştirilmedi. DB `/tmp` içine kopyalanarak gerçek Express server + Chromium üzerinde kiosk açıldı.

### Çözünürlük matrisi

Aynı güncel HEAD ile şu viewport'lar gerçek browser layout ölçümüyle kontrol edildi:

- 3840×2160,
- 2560×1440,
- 1920×1080,
- 1366×768.

Her çözünürlükte:

- bento stage viewport'a tam oturdu,
- sekiz ana kartın hiçbiri stage dışına çıkmadı,
- kart scroll overflow sayısı 0,
- titlebar overflow sayısı 0,
- document scroll width/height viewport ile aynı kaldı.

Bu sonuçlar P2-4'teki canlı resize/fullscreen regresyon turundan bağımsız fresh kabul kontrolüdür.

### Uzun öğrenci adı / rol yoğunluğu

Temp DB'deki rol fixture'ında:

- 1 başkan,
- 2 yardımcı,
- 4 nöbetçi,
- 3 yıldız

aynı anda render edildi.

Nöbetçi isimlerinden biri **29 karakter** uzunluğundaydı ve `duty-name-long` sınıfını kullandı.

1366×768 en dar hedef viewport'ta:

- dört nöbetçi isminin tamamında scroll overflow 0,
- uzun isim iki satıra güvenli biçimde yerleşti,
- başkan/yardımcı isimlerinde overflow 0,
- yıldız isimlerinde overflow 0.

### Fallback slideshow runtime

Gerçek kiosk DOM'unda:

- toplam slide: 7,
- aktif slide: 1,
- yedi slide'ın tamamı Atatürk fallback image setiydi,
- görünür slide tekil kaldı,
- caption gerçek DOM'da render edildi.

P2-5'te teacher slide → fallback davranışı ayrıca gerçek HTTP/DB ile doğrulanmıştır.

### Backend restart dayanıklılığı

Kiosk browser sayfası açıkken temp backend fiziksel olarak durduruldu.

Backend kapalıyken:

- mevcut render DOM'da kaldı,
- roller kaybolmadı,
- mevcut slideshow DOM'u korunmaya devam etti.

Aynı DB ile backend yeniden başlatıldıktan ve polling intervali beklendikten sonra:

- rol DOM öğeleri tekrar güncel durumda kaldı,
- slideshow 7 slide ile çalışmaya devam etti,
- titlebar overflow 0,
- document scroll hedef viewport ile aynı.

Yani kısa backend restart'ı kiosk'u kalıcı boş/bozuk state'e sokmadı.

### Browser refresh

Backend restart sonrasında gerçek browser reload yapıldı.

1366×768 fresh render:

- roller yeniden yüklendi,
- 7 fallback slide yeniden kuruldu,
- titlebar overflow 0,
- document scroll 1366×768.

### Daha önce aynı HEAD ailesinde doğrulanan dayanıklılık

P2-4 gerçek browser kabulünde ayrıca:

- 3840↔1920 canlı resize,
- 2560→1366 canlı resize,
- reduced-motion,
- gerçek DOM Fullscreen API enter/exit

sırasında titlebar overflow 0 ve body scroll yok sonucu alınmıştır.

### Otomatik kalite zemini

P2-5 son kod commit'inde:

- local core: **1367 / 1367 pass**,
- GitHub Node 22: success,
- GitHub Node 24: success,
- npm audit: 0 vulnerability.

## 16.4 Fiziksel donanımda hâlâ yapılması gerekenler

Aşağıdaki maddeler browser emülasyonu veya mevcut araçlarla dürüstçe tamamlanamaz:

1. gerçek **55" 3840×2160 TV** üzerinde izleme mesafesinden font okunabilirliği,
2. TV overscan / HDMI scaling / cihaz pixel mapping,
3. gerçek sınıf ışığında kontrast ve 3D ikon okunabilirliği,
4. gerçek kiosk Chromium boot/fullscreen davranışı,
5. gerçek sınıf mikrofonuyla sessiz/dikkat/gürültü kalibrasyonu,
6. mikrofon izin reddi ve fiziksel cihaz değişimi,
7. gerçek GIF/video/portrait/landscape medya karma setiyle uzun süreli görsel kabul,
8. gerçek ağ kesintisi ve cihaz reboot sonrası otomatik kiosk geri dönüşü.

Bu nedenle fiziksel TV kabulü bir **donanım kalite kapısı** olarak açık kalır.

## 16.5 Kabul kriteri

Fiziksel ekranda öğretmenin günlük kullanımını bozacak görsel veya işlevsel kusur kalmamalıdır.

**P2-6 şu anda 🟨:** otomatik/browser ön-kabul başarılı; fiziksel 55" TV kabulü kullanıcı/donanım erişimi gerektiriyor. Bu blok repo içindeki diğer bakım işlerinin ilerlemesini engellemez.

---

# 17. P3-1 — Stale bakım scriptlerini temizle

**Öncelik:** P3  
**Durum:** 🟩 Tamamlandı ve doğrulandı

## 17.1 `scripts/test_system.js`

Bugün yanlış beklentiler taşıyor:

- `/api/word` artık yok,
- `/admin/` auth'suz 200 beklemek artık yanlış.

Bu script ya:

- güncel auth-aware smoke test haline getirilmeli,
- ya da core testler tarafından tamamen karşılanıyorsa kaldırılmalıdır.

### Tercih

Kullanışlı bir **gerçek server smoke test** haline getirmek daha değerlidir.

Yeni smoke test:

- `/` 200
- `/api/stats` 200
- `/api/slides/active` 200
- `/admin/` auth yokken login redirect/401 contract
- login
- authenticated admin page
- CSRF session header

Gerçek DB yerine temp DB kullanmalıdır.

## 17.2 `scripts/verify-code.js`

Tamamen eski Gemini/AI mimarisini arıyor:

- `gemini-ai.js`
- Gemini dependency
- `.env` Gemini key
- kaldırılmış rules AI endpointleri

Bu script bugünkü ürünle ilişkili değildir.

### Karar

**Kaldırılmalı.**

Yerine yeni bir “code health” script yazmaya gerek yok; node test suite zaten daha güvenilir.

---

# 18. P3-2 — Güncel dokümantasyonu tek gerçekliğe getir

**Öncelik:** P3  
**Durum:** ⬜ Bekliyor

Tomografi bugünkü doğru gerçekliği çıkardı; eski üst seviye belgeler hâlâ yeni oturumları yanıltabilir.

## 18.1 README

Düzeltilecek başlıklar:

- Node 18+ → package engines ile uyumlu Node 22–24
- artık olmayan hava durumu
- artık olmayan günün kelimesi
- artık olmayan 10 equalizer tema yönetimi
- eski admin settings tab
- güncel admin auth
- Magic Park kiosk
- güncel test komutu

## 18.2 `AI_PROJECT_CONTEXT.md`

6 Ağustos öncesi schedule diagnostics/draft/review admin prototiplerini aktif özellik gibi anlatan bölümler temizlenmeli.

Belge ya tamamen güncellenmeli ya da en üste açık:

`STALE — See Classroom Projesi/01 - Güncel Belgeler/...`

uyarısı konmalıdır.

### Tercih

Yeni oturumların otomatik okuma olasılığı yüksek olduğu için tamamen güncellemek daha doğru.

## 18.3 `docs/PROJE_OZETI.md`

Tarihsel olarak çok büyük ve eski.

İki seçenek:

- güncellemek,
- `docs/archive/` benzeri tarihsel konuma almak.

### Tercih

Güncel mimariyi tekrar 1800+ satır kopyalamak yerine arşiv etiketi + bu tomografiye referans daha sürdürülebilir.

## 18.4 Eski DOCX belgeleri

Silinmeyecek.

Tarihsel geliştirme kaydı olarak kalacak.

Yeni dokümantasyon ise yalnız `.md` olacaktır.

---

# 19. P3-3 — Legacy frontend settings/display-mode katmanını kaldır

**Öncelik:** P3  
**Durum:** 🟩 Tamamlandı ve doğrulandı

`settings-loader.js` hâlâ:

- displayMode
- colorTheme
- fontSize
- autoRefreshInterval

gibi eski settings key'lerini bilir.

Admin bunları artık yönetmiyor.

## 19.1 Karar

Sade admin ve kiosk mimarisi korunarak **legacy frontend settings katmanı kaldırılacaktır**.

Bu karar yalnız frontend dead-code kapsamındadır. Aşağıdaki yaşayan backend sözleşmeleri korunacaktır:

- `GET /api/settings`
- korumalı `POST /api/settings`
- SQLite `settings` tablosu
- `APIService.ENDPOINTS.SETTINGS` uyumluluğu
- `start.sh` içindeki `--kiosk --app=http://localhost:3000` fullscreen sorumluluğu

DB key migration/cleanup bu işin kapsamına alınmamıştır.

## 19.2 Uygulanan temizlik

- `public/index.html` artık `settings-loader.js` veya `display-mode-manager.js` import etmiyor.
- `public/js/settings-loader.js` fiziksel olarak kaldırıldı.
- `public/js/display-mode-manager.js` fiziksel olarak kaldırıldı.
- Admin `fetchSettings()` ve startup çağrısı kaldırıldı.
- Dead `window.saveSetting()` kaldırıldı.
- `tests/legacy-settings-cleanup.test.js` fiziksel dosya yokluğunu ve korunan backend/kiosk sınırlarını regression testiyle kilitliyor.
- `test:legacy-settings-cleanup` scripti eklendi ve test `test:core` kalite kapısına bağlandı.

## 19.3 TDD ve regresyon kanıtı — 8 Ağustos 2026

İlk RED koşusu:

- `node --test tests/legacy-settings-cleanup.test.js`
- beklenen nedenle kırmızı: iki legacy JS dosyası hâlâ fiziksel olarak mevcuttu.
- aynı koşuda backend `/api/settings` ve `start.sh` koruma kontrolleri yeşildi.

Frontend dosyaları fiziksel olarak kaldırıldıktan sonra:

- `npm run test:legacy-settings-cleanup` → **5/5 pass**.
- komşu settings/admin/kiosk grubu → **69/69 pass**.

Tam core ilk koşuda P3-3 dışındaki daha önce commit edilmiş P3-2 dokümantasyon kontratı uyumsuzluklarını görünür hale getirdi. `a4be245` README'yi bilinçli olarak local-first modele taşımışken eski internet requirement testi zorunlu internet beklemeye devam ediyordu; ayrıca yeni dokümantasyon testi Markdown kalın sürüm yazımını (`Express **4.22.2**` gibi) reddediyordu. Güncel mimari geri çevrilmeden test kontratları source-of-truth ile hizalandı:

- `tests/documentation-current-state.test.js` Markdown sürüm biçimini doğru kabul ediyor.
- `tests/internet-requirement-copy.test.js` local-first + local SheetJS modelini doğruluyor.
- izole dokümantasyon testleri → **15/15 pass**.

Browser smoke sırasında admin sayfasının otomatik `/favicon.ico` isteği tek console 404 olarak yakalandı. Kiosk'taki mevcut yerel `assets/favicon.png` admin tarafından da kullanılacak şekilde TDD ile düzeltildi:

- favicon regression RED → **3 pass / 1 fail**.
- düzeltme sonrası `tests/kiosk-runtime-optimization.test.js` → **4/4 pass**.

Son yerel kalite kapıları:

- `npm run test:core` → **1381/1381 pass, 0 fail**.
- `npm run test:system-smoke` → **SYSTEM_SMOKE_PASS**; temp DB üzerinde `/api/settings` write/readback ayrıca PASS.
- `npm audit --omit=dev` → **0 vulnerability**.
- `git diff --check` → temiz.
- değişen JS test/admin dosyalarında `node --check` → temiz.

## 19.4 Temp-DB gerçek browser kabulü

Playwright, gerçek Express uygulaması ve ayrı temp SQLite DB ile doğrulandı:

- kiosk `3840×2160` → document/viewport tam eşleşti, yatay/dikey overflow **0**.
- kiosk `1366×768` → document/viewport tam eşleşti, yatay/dikey overflow **0**.
- kiosk başlangıcında `/api/settings` request → **0**.
- aynı kiosk sayfasında **12 saniye** beklendikten sonra `/api/settings` request → **0**.
- `window.settingsLoader` → yok.
- `window.displayModeManager` → yok.
- kiosk console error/warning → **0**.
- authenticated admin başlangıcında `/api/settings` request → **0**.
- `window.saveSetting` → `undefined`.
- legacy `messageInput` → yok.
- admin console error/warning → **0**.
- admin HTTP 4xx/5xx resource failure → **0**.

P2-6 gerçek **55\" 4K TV fiziksel kabul testi** bu browser kabulünden bağımsız olarak açık kalite kapısı olmaya devam eder.

## 19.5 Commit / CI kapanış kanıtı

- P3-3 milestone commit: `ae4753cf4ae02a074ad50cc06b07ab6022bd540b` — `refactor: remove legacy frontend settings layer`.
- Commit `origin/main` üzerine push edildi.
- GitHub Actions `Core Tests` run: `31273344970`.
- exact milestone SHA üzerinde **Node 22** → `npm run test:core` PASS.
- exact milestone SHA üzerinde **Node 24** → `npm run test:core` PASS.

Bu kanıtlarla P3-3 kapanmıştır. P2-6 fiziksel 55\" 4K TV kabulü ayrı açık kalite kapısı olarak kalır.

---

# 20. P3-4 — Kullanılmayan backend config/utils kopyalarını temizle

**Öncelik:** P3  
**Durum:** ⬜ Bekliyor

Tomografi taramasında:

- `backend/config.js`
- `backend/utils.js`

mevcut backend tarafından import edilmiyor görünmektedir.

Ancak doğrudan silinmemelidir.

## Yapılacak

1. `require/import` repo çapında tara.
2. testlerin indirect require kullanıp kullanmadığını kontrol et.
3. scripts kullanımını kontrol et.
4. gerçekten orphan ise sil.
5. `public/js/config.js` ve `public/js/utils.js` ile yanlışlıkla shared dependency sanılmadığını doğrula.
6. core suite.

## Sonuç — 8 Ağustos 2026

Repo çapı require/import, test ve script taraması ilk varsayımı kısmen düzeltti:

- `backend/config.js` için runtime, test veya script import/referansı bulunmadı.
- Dosya, güncel `public/js/config.js` ile aynı tarihsel kökten gelen fakat eski `http://localhost:3000/api` değerini taşıyan kullanılmayan backend kopyasıydı.
- `backend/config.js` fiziksel olarak kaldırıldı.
- `backend/utils.js` **orphan değildir**. `backend/server.js`, `normalizePath` fonksiyonunu `require('./utils')` ile aktif olarak kullanmaktadır.
- `tests/slides-get-id.test.js` de `backend/utils.js` içindeki `normalizePath` davranışını doğrudan kullanmaktadır.
- Bu nedenle `backend/utils.js` bilinçli olarak korundu; sırf dosya adı frontend kopyasına benzediği için silinmedi.
- `public/js/config.js` ve `public/js/utils.js` kiosk/admin tarafından script olarak yüklenmeye devam etmektedir ve bu işte değiştirilmemiştir.
- Yeni `tests/backend-orphan-cleanup.test.js` regression testi bu ayrımı kalıcı kontrat haline getirdi ve `test:core` içine bağlandı.

### TDD kanıtı

- RED: `backend/config.js` fiziksel olarak mevcut olduğu için yeni focused test `1 fail / 2 pass` verdi.
- GREEN: yalnız `backend/config.js` kaldırıldıktan sonra focused test `3/3 pass` verdi.

### Doğrulama kanıtları

- `npm run test:backend-orphan-cleanup` → `3/3 pass`
- `npm run test:core` → `1384/1384 pass`
- `npm run test:system-smoke` → `SYSTEM_SMOKE_PASS`
- `npm audit --omit=dev` → `0 vulnerabilities`
- `git diff --check` → temiz
- syntax kontrolleri → temiz
- Kod/test milestone commit: `4c6d0aa268b252ee51600fe586d92b38ecadceca`
- GitHub Actions run: `31273885001`
- Node 22 → PASS
- Node 24 → PASS

Bu kanıtlarla P3-4 kapanmıştır. P2-6 fiziksel 55\" 4K TV kabulü ayrı açık kalite kapısı olarak kalır.

---

# 21. P3-5 — Büyük refactor işleri yalnız stabilizasyondan sonra

**Öncelik:** P3 / son  
**Durum:** 🟩 Refactor yol haritası tamamlandı; gerçek extraction işleri ayrı gelecekteki dalgalar olarak uygulanacak

### 21.0 8 Ağustos 2026 planlama sonucu

P3-5 kapsamında büyük dosyalar **hemen refactor edilmedi**. Önce gerçek HEAD envanteri çıkarıldı ve güvenli uygulama sırası ayrı yaşayan Markdown yol haritasına bağlandı:

`Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — P3-5 Büyük Refactor Yol Haritası — 8 Ağustos 2026.md`

Doğrulanan güncel büyüklükler:

- `backend/server.js`: 3064 satır
- `public/admin/admin.js`: 1804 satır
- `public/css/style.css`: 4740 satır
- `public/css/kiosk-magic-park.css`: 1433 satır
- `public/admin/style.css`: 389 satır
- admin HTML: yaklaşık 195 statik inline style attribute
- admin JS template'leri: yaklaşık 103 inline style fragment

Kesin mimari karar:

1. Backend önce `registerXRoutes(app, deps)` modeliyle domain bazında küçük extraction'lara ayrılacak; büyük-bang `express.Router()` dönüşümü yapılmayacak.
2. Admin JS klasik script/domain modüllerine ayrılacak; mevcut inline handler global'leri geçici adaptörlerle korunacak.
3. Admin inline CSS temizliği görsel redesign olmadan ayrı dalga olacak.
4. Kiosk CSS dead-style/agresif temizlik **P2-6 gerçek 55\" 4K fiziksel kabulü tamamlanmadan uygulanmayacak**.
5. Backend extraction sırası düşük riskten yükseğe: settings/system → schedule → students → roles → attendance → logs → slides; auth/session ayrı güvenlik turu olarak en son değerlendirilecek.
6. Slides route ve admin slides modülü kendi alanlarında en son taşınacak; cache, fallback, transaction ve media path sözleşmeleri aynı committe yeniden tasarlanmayacak.

P3-5'in yaşayan durum tablosundaki işi “refactor planı”dır. Bu plan artık tamamlanmıştır; gerçek kod extraction dalgaları yeni bağımsız işler olarak açılacaktır.

### 21.0.1 9 Ağustos 2026 — P3-5A1 settings/system route extraction

İlk gerçek backend refactor dalgası tamamlandı ve planlanan `registerXRoutes(app, deps)` kalıbı üretim kodunda doğrulandı.

Uygulanan sınır:

- `backend/routes/settings-routes.js`: `GET/POST /api/settings`
- `backend/routes/system-routes.js`: `GET /api/network-info`, `GET /api/stats`
- `backend/server.js`: eski göreli kayıt noktalarında `registerSettingsRoutes(...)` ve `registerSystemRoutes(...)`

Korunan kritik sözleşmeler:

- backend `/api/settings` ve SQLite `settings` altyapısı kaldırılmadı,
- settings write middleware sırası auth → CSRF → write rate-limit olarak kaldı,
- stats İstanbul tarihi `getIstanbulDateKey()` ile devam ediyor,
- schedule ve attendance route kayıt sıraları değiştirilmedi,
- yeni framework/router migration eklenmedi.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- odak route/security grubu 94/94,
- tam core **1385/1385**,
- system smoke PASS,
- audit 0,
- syntax ve diff check temiz,
- Playwright + Chrome DevTools ile settings/stats/network-info HTTP 200,
- browser console error/warn/issue 0,
- exact milestone commit `8c2bf70f8b1f8dd0e1dc2ac87ee931c23b34e791`,
- GitHub Actions run `31280357663`: Node 22 ve Node 24 PASS.

`backend/server.js` 3064 → 2944 satıra indi. Sıradaki extraction dalgası **P3-5A2 — schedule** olacaktır. P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### 21.0.2 9 Ağustos 2026 — P3-5A2 schedule route extraction

İkinci backend refactor dalgası tamamlandı. Schedule route'ları ve migration-readiness guard'ı tek domain kayıt modülüne taşındı; schedule service/repository/schema katmanları ve HTTP davranışı değiştirilmedi.

Uygulanan sınır:

- `backend/routes/schedule-routes.js`: readiness guard + normalized GET/PUT + legacy GET/POST,
- `backend/server.js`: eski göreli konumda `registerScheduleRoutes(app, deps)`,
- `tests/backend-route-extraction.test.js`: A2 fiziksel extraction ve çift-kayıt önleme sözleşmesi.

Korunan kritik sözleşmeler:

- `app.use('/api/schedule', requireScheduleStorageReady)` tüm schedule route'larından önce,
- migration failure → HTTP 503 + `SCHEDULE_STORAGE_UNAVAILABLE`,
- normalized GET/PUT response ve validation sözleşmeleri,
- isolated SQLite replacement transaction akışı,
- legacy GET/POST uyumluluğu,
- schedule write middleware sırası auth → CSRF → write rate-limit,
- `schedule-service.js`, `schedule-repository.js`, `schedule-schema.js` davranışı.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- extraction 2/2,
- schedule odak grubu **127/127**,
- tam core **1386/1386**,
- system smoke PASS,
- audit 0,
- syntax ve diff check temiz,
- Playwright kiosk normalized schedule GET 200,
- Chrome DevTools admin session/CSRF 64 + normalized PUT 200 + normalized GET 200 + legacy GET 200,
- temiz kiosk reload console error/warn/issue 0,
- exact milestone commit `17838a510758309d4a50b30c846b4dbe7990a9df`,
- GitHub Actions run `31280821858`: Node 22 ve Node 24 PASS.

`backend/server.js` 2944 → 2725 satıra indi. Sıradaki extraction dalgası **P3-5A3 — students** olacaktır. P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### 21.0.3 9 Ağustos 2026 — P3-5A3 students route extraction

Üçüncü backend refactor dalgası tamamlandı. Student listeleme/create/import/delete/photo-update yüzeyi tek domain kayıt modülüne taşındı; upload, dosya cleanup ve HTTP davranışları yeniden tasarlanmadı.

Uygulanan sınır:

- `backend/routes/student-routes.js`: student GET/create/Excel import/delete/photo update route'ları,
- `backend/server.js`: eski göreli konumda `registerStudentRoutes(app, deps)`,
- student validation + `safeDeleteFile` + managed-photo cleanup helper'ları student domaini içinde,
- `tests/backend-route-extraction.test.js`: A3 fiziksel extraction ve çift-kayıt önleme sözleşmesi,
- `tests/cors-policy.test.js`: literal `server.js` konumu yerine gerçek student registration modülünü izleyen source-contract.

Korunan kritik sözleşmeler:

- auth → CSRF → write rate-limit → Multer sırası,
- JPEG/JPG/PNG/GIF/WEBP ve 5 MB fotoğraf sınırı,
- yalnız `/uploads/<safe-filename>` web-path persistence,
- default görsellerin ve traversal/nested/uploads-dışı yolların silinmemesi,
- managed eski fotoğraf cleanup'ının yalnız başarılı DB işleminden sonra yapılması,
- Excel temp-file cleanup, E-okul parsing ve gender normalization,
- student ID strict positive safe-integer doğrulaması,
- database/parser ayrıntılarının HTTP hata response'una sızmaması.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- extraction **3/3**,
- student/auth/rate-limit odak grubu **141/141**,
- CORS source-contract düzeltmesi sonrası **6/6**,
- tam core **1387/1387**,
- system smoke PASS,
- audit 0,
- syntax ve diff check temiz,
- Playwright public `GET /api/students` 200 + fresh DB `[]`,
- Chrome DevTools admin login 200 + CSRF 64 + student create 200 + listede görünme + delete 200 + final liste `[]`,
- temiz kiosk reload console error/warn/issue 0,
- exact milestone commit `894e9504d4436abc871877c9bc845e8cc15981a5`,
- GitHub Actions run `31281322228`: Node 22 ve Node 24 PASS.

`backend/server.js` 2725 → 2210 satıra indi. Sıradaki extraction dalgası **P3-5A4 — roles** olacaktır. P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### 21.0.4 9 Ağustos 2026 — P3-5A4 roles route extraction

Dördüncü backend refactor dalgası tamamlandı. Role listeleme/create/delete yüzeyi tek domain kayıt modülüne taşındı; president transaction, bounded role SQL ve HTTP davranışları yeniden tasarlanmadı.

Uygulanan sınır:

- `backend/routes/role-routes.js`: role GET/create/delete route'ları,
- `backend/server.js`: eski göreli konumda `registerRoleRoutes(app, deps)`,
- `tests/backend-route-extraction.test.js`: A4 fiziksel extraction ve çift-kayıt önleme sözleşmesi,
- president ve bounded unknown-classification source-contract testleri gerçek yeni üretim modülünü izleyecek şekilde güncellendi,
- daha önce mevcut olup core listesinde olmayan `tests/role-bounded-duplicate-error-redaction.test.js` `test:core` kapısına eklendi.

Korunan kritik sözleşmeler:

- auth → CSRF → write rate-limit sırası,
- president replacement için isolated connection + `BEGIN IMMEDIATE → DELETE → INSERT → COMMIT` ve rollback hata yolları,
- VP max 2 / duty max 4 bounded tek-statement insert,
- bounded zero-change classification: limit → duplicate → student → unknown-state,
- star duplicate-prevention ve duplicate response,
- role/student strict positive safe-integer ID doğrulaması,
- database ayrıntılarının HTTP hata response'una sızmaması.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- extraction **4/4**,
- role odak paketi **238/238**,
- tam core **1404/1404**,
- system smoke PASS,
- audit 0,
- syntax, package JSON parse ve diff check temiz,
- Playwright public `GET /api/roles` 200 + fresh DB `[]`,
- Chrome DevTools temiz kiosk reload console error/warn/issue 0 ve `/api/roles` dahil kiosk API çağrıları 200/304,
- izole temp DB HTTP smoke: admin login 200 + authenticated session + CSRF 64,
- president create/replacement 200/200 ve replacement sonrası tek doğru president,
- VP create/create/limit **200/200/400**,
- star create/duplicate **200/400**,
- dört role delete **200**, final role listesi `[]`, dört temp öğrenci cleanup **200**,
- exact milestone commit `ec16dcc9e2c0990d6215a674c4b7b3f49a2445a0`,
- GitHub Actions run `31281933728`: Node 24 PASS (27 sn), Node 22 PASS (31 sn).

`backend/server.js` 2210 → 1853 satıra indi; `backend/routes/role-routes.js` 380 satır. Bilinen fresh-DB `error_logs` cleanup-order logu değiştirilmedi. Sıradaki extraction dalgası **P3-5A5 — attendance** olacaktır. P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### 21.0.5 9 Ağustos 2026 — P3-5A5 attendance route extraction

Beşinci backend refactor dalgası tamamlandı. Attendance today/date read, bulk replacement ve single-record update yüzeyi tek domain kayıt modülüne taşındı; Istanbul tarih hesabı, validation ve transaction davranışları yeniden tasarlanmadı.

Uygulanan sınır:

- `backend/routes/attendance-routes.js`: attendance today/date GET + bulk POST + single PUT route'ları,
- `backend/server.js`: eski göreli konumda `registerAttendanceRoutes(app, deps)`,
- `tests/backend-route-extraction.test.js`: A5 fiziksel extraction ve çift-kayıt önleme sözleşmesi,
- `tests/backend-date-utils.test.js`: literal `server.js` konumu yerine gerçek attendance registration/modülünü izleyen source-contract.

Korunan kritik sözleşmeler:

- `/api/attendance/today` için `Europe/Istanbul` gün anahtarı,
- auth → CSRF → write rate-limit sırası,
- bulk replacement için isolated connection + `BEGIN IMMEDIATE → DELETE → INSERT... → COMMIT`,
- begin/delete/insert/commit failure rollback ve connection-close yolları,
- empty-list atomik temizleme davranışı,
- strict gerçek takvim tarihi validation'ı ve leap-year hesabı,
- strict positive safe-integer ID ve duplicate normalized student ID reddi,
- yalnız `present` / `absent` status sözleşmesi,
- read/update hata ayrıntılarının HTTP response'a sızmaması.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- extraction **5/5**,
- attendance/date/auth/rate-limit/CORS odak grubu **193/193**,
- gerçek SQLite rollback/replacement/empty-list/isolation senaryoları PASS,
- tam core **1405/1405**,
- system smoke PASS,
- audit 0,
- syntax ve diff check temiz,
- Playwright public `GET /api/attendance/today` 200 + fresh DB `[]`,
- izole temp DB HTTP smoke: admin login/session 200 + CSRF 64, iki öğrenci create 200/200, bulk attendance 200, today/date GET 200, single update 200, ikinci bulk replacement 200, empty cleanup 200,
- Chrome DevTools temiz kiosk reload console error/warn/issue 0 ve normal kiosk XHR/fetch trafiği 200/304,
- exact milestone commit `84ad2ee1986d55a05182c542365b216e2bb469d8`,
- GitHub Actions run `31282429187`: ilk koşuda Node 24 runner transient biçimde takıldığı için kontrollü rerun; aynı exact SHA rerun'ında Node 22 PASS (25 sn), Node 24 PASS (24 sn).

`backend/server.js` 1853 → 1617 satıra indi; `backend/routes/attendance-routes.js` 262 satır. Bilinen fresh-DB `error_logs` cleanup-order logu değiştirilmedi. Sıradaki extraction dalgası **P3-5A6 — logs** olacaktır. P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### 21.0.6 9 Ağustos 2026 — P3-5A6 logs route extraction

Altıncı backend refactor dalgası tamamlandı. Log create/read/cleanup API yüzeyi tek domain kayıt modülüne taşındı; log validation, JSON parsing, error redaction ve startup cleanup davranışı yeniden tasarlanmadı.

Uygulanan sınır:

- `backend/routes/log-routes.js`: `POST /api/logs`, `GET /api/logs`, `DELETE /api/logs/cleanup`,
- `backend/server.js`: eski göreli noktada `registerLogRoutes(app, deps)`,
- `tests/backend-route-extraction.test.js`: A6 fiziksel extraction, çift-kayıt önleme ve startup cleanup'ın `server.js` içinde kalması sözleşmesi.

Korunan kritik sözleşmeler:

- log create ve cleanup için auth → CSRF → write rate-limit sırası,
- log read için yalnız auth; CSRF/write rate-limit eklenmemesi,
- create required-field validation ve optional JSON/null parametre davranışı,
- DB başarısından önce filesystem append yapılmaması,
- filesystem hatasının DB başarısını tersine çevirmemesi,
- read `limit` canonical `1..1000`, varsayılan 100,
- `level → component → since → limit` filtre parametre sırası,
- malformed/primitive JSON alanlarını bozmadan döndüren safe parse davranışı,
- cleanup `days` strict positive safe-integer validation ve varsayılan 30 gün,
- create/read/cleanup DB hata ayrıntılarının HTTP response'a sızmaması,
- `cleanupOldLogs()`, günlük timer ve startup çağrısının `server.js` içinde aynen kalması.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- extraction **6/6**,
- logs/admin auth/rate-limit odak grubu **75/75**,
- tam core **1406/1406**,
- system smoke PASS,
- audit 0,
- syntax ve diff check temiz,
- izole temp DB HTTP smoke: unauth logs GET 401, login/session 200, CSRF 64, invalid limit/days 400, create/read 200, JSON parse doğru, cleanup 200 ve final filtre boş,
- Playwright `/admin` korumalı erişimi login yüzeyine yönlendirdi; bu oturumdaki Playwright `browser_evaluate` tool-side `about:blank` problemi nedeniyle API browser kanıtı Chrome DevTools ile tamamlandı,
- Chrome DevTools isolated context: admin login/session 200, log create/filter GET 200, CSRF 64, console error/warn/issue 0 ve ilgili network istekleri 200/304,
- exact milestone commit `1394fa033b1a470331c2025e50f4b2ab748790b0`,
- GitHub Actions run `31313198706`: Node 24 PASS (~23 sn), Node 22 PASS (~34 sn).

`backend/server.js` 1617 → 1460 satıra indi; `backend/routes/log-routes.js` 182 satır. Bilinen fresh-DB `error_logs` cleanup-order bug'ı kasıtlı olarak düzeltilmedi ve ayrı bugfix olarak kalıyor. Sıradaki extraction dalgası **P3-5A7 — slides** olacaktır. P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı biçimde açık kalır.

### 21.0.7 9 Ağustos 2026 — P3-5A7 slides route extraction

Backend domain extraction serisinin son ve en riskli dalgası tamamlandı. Slide HTTP yüzeyi, active cache state'i, slide-settings route'ları ve media-path yardımcıları `server.js` dışına taşındı; fallback reconciliation/veri modeli yeniden tasarlanmadı.

Uygulanan sınır:

- `backend/routes/slide-routes.js`: active/list/admin list/single GET, create, reorder, update, delete ve GET/POST/PUT slide-settings route'ları,
- `backend/slide-media-paths.js`: canonical public URL, public-path normalization ve managed media deletion path çözümleme,
- `backend/server.js`: eski göreli noktada `registerSlideRoutes(app, deps)`,
- `tests/backend-route-extraction.test.js`: A7 fiziksel extraction + route-order + media-helper sınırı,
- `tests/slides-update-id.test.js` ve `tests/backend-orphan-cleanup.test.js`: taşınmış source-contract'ların yeni gerçek modül konumunu izlemesi.

Korunan kritik sözleşmeler:

- `/api/slides/active` parameterized `/:id` route'undan önce,
- `/api/slides/reorder` parameterized PUT `/:id` route'undan önce,
- write route'larında auth → CSRF → write rate-limit sırası,
- public active list / authenticated admin management list ayrımı,
- permanent fallback setin yalnız aktif öğretmen slaytı olmadığında görünmesi,
- system-owned fallback update/delete/reorder koruması,
- başarılı create/update/reorder/delete sonrası cache invalidation; failure/no-op yollarında mevcut cache'in korunması,
- reorder ve delete transaction/rollback davranışı,
- başarılı DB/transaction sonucu olmadan eski media'nın silinmemesi,
- canonical `/uploads/slides/<filename>` ve güvenli managed-path cleanup,
- atomik slide-settings PUT,
- raw DB hata ayrıntılarının HTTP response'a sızmaması,
- slideshow transition-lock davranışının değişmemesi.

Kanıtlar:

- TDD extraction testi RED → GREEN,
- extraction **7/7**,
- extraction öncesi ve sonrası slide/settings/admin güvenlik odak grubu **354/354**,
- tam core **1407/1407**,
- system smoke PASS,
- audit 0,
- syntax ve diff check temiz,
- izole temp DB HTTP smoke: 7 fallback → iki multipart create sonrası 2 active → reorder → bir slide inactive sonrası 1 active → son aktif öğretmen slide delete sonrası yeniden 7 fallback; admin list final 0,
- slide-settings GET + atomik PUT 200; admin login/session 200; CSRF 64,
- oluşturulan iki multipart upload delete sonrasında diskte kalmadı,
- Playwright kiosk navigasyonu PASS; console sorgusundaki tool-side `about:blank` davranışı nedeniyle browser API/console kanıtı Chrome DevTools ile tamamlandı,
- Chrome DevTools isolated context: active/admin/settings istekleri 200/304, console error/warn/issue 0,
- exact milestone commit `facb944a6363f0bb464d1a4457fd90217674169a`,
- GitHub Actions run `31314361667`: Node 24 PASS (27 sn), Node 22 PASS (31 sn).

`backend/server.js` 1460 → **416 satıra** indi; yeni `backend/routes/slide-routes.js` 994 satır ve `backend/slide-media-paths.js` 66 satır. Böylece P3-5 backend domain extraction **A1–A7 tamamlandı**. A8 admin auth/session ancak ayrı güvenlik regresyon turuyla değerlendirilecektir; sıradaki aktif refactor fazı **P3-5B — admin JavaScript modülerleştirme**dir. Bilinen fresh-DB `error_logs` cleanup-order bug'ı ve P2-6 gerçek 55\" 4K fiziksel kabul kapısı ayrı olarak açık kalır.

### 21.0.8 9 Ağustos 2026 — P3-5B1 admin students module extraction

Admin JavaScript modülerleştirmesinin ilk dalgası tamamlandı. Öğrenci domaini klasik script mimarisi korunarak `public/admin/admin.js` dışına ayrıldı; role/yoklama/slayt sorumlulukları B1'e karıştırılmadı.

Uygulanan sınır:

- `public/admin/js/students.js`: student render/stats/filter, create/delete, photo modal/upload/preview, Excel preview/import,
- `public/admin/admin.js`: `fetchStudents()` shell bridge olarak kaldı; aynı öğrenci listesi `AdminStudents.renderStudents(students)` ve mevcut `updateRoleSelects(students)` üzerinden iki domaine dağıtılıyor,
- `public/admin/index.html`: `js/students.js`, `admin.js`ten önce yükleniyor,
- `tests/admin-student-module.test.js`: B1 fiziksel extraction, script sırası, namespace/adaptör ve monolitten çıkış sözleşmesi,
- mevcut VM test harness'leri yeni gerçek script zincirini izleyecek şekilde güncellendi; DOM/Excel güvenlik assertion'ları korunuyor.

Korunan kritik sözleşmeler:

- `window.filterStudents`, `window.deleteStudent`, `window.showPhotoUploadModal`, `window.closePhotoUploadModal`, `window.clearExcelFile`, `window.clearPhotoFile` global adaptörleri,
- öğrenci adlarının `Utils.escapeHtml` ile güvenli render edilmesi,
- search + gender filtre davranışı,
- toplam/erkek/kız sayaçları,
- student create/delete sonrası refresh,
- student delete sonrası roles refresh,
- photo MIME/5 MB validation ve upload feedback,
- Excel dosya adı/hücre/error içeriklerinde DOM safety,
- Excel import success/failure feedback,
- mevcut notification davranışı,
- classic script düzeni; ES module/framework eklenmemesi.

Kanıtlar:

- TDD structural test RED → GREEN,
- extraction öncesi student odak baseline **32/32**,
- B1 structural **1/1**,
- geniş admin-source odak grubu **77/77**,
- tam core **1408/1408**,
- system smoke PASS,
- audit 0,
- `admin.js` + `students.js` syntax ve diff check temiz,
- izole temp DB gerçek admin smoke: login 200; student script/admin script 200; create 200 ve sayaç 0→1; filtre doğru; photo modal doğru ID/ad; delete 200 ve sayaç 1→0,
- Chrome DevTools network: `/admin/js/students.js` 200, `/admin/admin.js` 200, student GET/POST/DELETE başarılı; console error/warn 0,
- 1366×768 ve 1920×1080 admin viewport'larında horizontal overflow 0,
- Playwright admin auth redirect PASS; sonraki evaluate çağrısındaki bilinen tool-side `about:blank` davranışı nedeniyle ayrıntılı UI/API doğrulaması Chrome DevTools ile tamamlandı,
- exact milestone commit `aeba60092fc6ba51036e7df58defe8351bdaf12c`,
- GitHub Actions run `31315184119`: Node 24 PASS (28 sn), Node 22 PASS (29 sn).

`public/admin/admin.js` **1804 → 1176 satıra** indi; yeni `public/admin/js/students.js` **609 satır**. Bilinen fresh-DB `error_logs` cleanup-order bug'ı değiştirilmedi; P2-6 fiziksel 55\" 4K kabul kapısı açık kalır. Sıradaki admin JS dalgası **P3-5B2 — Roles** olacaktır.

### 21.0.9 9 Ağustos 2026 — P3-5B2 admin roles module extraction

Admin role domaini `admin.js` dışına ayrıldı; B2 yalnız frontend ownership sınırını değiştirdi, backend role limit/transaction davranışlarına dokunmadı.

Uygulanan sınır:

- `public/admin/js/roles.js`: role-select population, assign, render, remove ve role-section remove event delegation,
- `public/admin/admin.js`: `fetchStudents()` → `AdminRoles.updateRoleSelects(students)`, `fetchRoles()` → `AdminRoles.renderRoles(roles)` shell köprüleri ve `AdminRoles.init({ refreshRoles: fetchRoles })`,
- `public/admin/index.html`: `js/roles.js`, `js/students.js` sonrasında ve `admin.js` öncesinde,
- `tests/admin-role-module.test.js`: B2 fiziksel extraction, script sırası, namespace/global adaptör ve shell ownership sözleşmesi,
- mevcut VM DOM-safety/error-log/Excel harness'leri gerçek `students.js → roles.js → admin.js` script zincirini izleyecek şekilde güncellendi.

Korunan kritik sözleşmeler:

- `window.assignRole` ve `window.removeRole` inline/global API'leri,
- student fetch sonucunun role select'lere güvenli `Utils.escapeHtml` ile aktarılması,
- president/vice-president/duty/star seçme ve render davranışı,
- assign başarı/hata feedback'i ve role refresh,
- remove confirm + success/error fallback + role refresh,
- `.remove-role-btn` event delegation,
- mevcut backend role bounded limitleri ve HTTP response metinlerinin frontend'de görünmesi,
- classic script düzeni; ES module/framework eklenmemesi.

Kanıtlar:

- TDD structural test RED → GREEN,
- B2 structural **1/1**,
- geniş admin-source odak grubu **76/76**,
- tam core **1409/1409**,
- system smoke PASS,
- audit 0,
- `admin.js` + `students.js` + `roles.js` syntax, package parse ve diff check temiz,
- izole temp DB gerçek admin UI: dört öğrenci create; president 200; iki vice-president 200; üçüncü vice-president beklenen 400 + `En fazla 2 başkan yardımcısı olabilir`; star 200; remove-role confirm/event delegation sonrası DELETE 200,
- Chrome DevTools: `/admin/js/roles.js` 200; role GET/POST/DELETE network akışı doğru; beklenen limit 400 sonrası temiz reload'da console error/warn 0; yalnız önceden var olan label/autocomplete issue kayıtları,
- 1366×768 ve 1920×1080 viewport horizontal overflow 0,
- Playwright `/admin/` auth redirect PASS,
- exact milestone commit `1e04860d296a3f5bcda2a3f0497fc4c8f46c83a6`,
- GitHub Actions run `31315902265`: Node 22 PASS (27 sn), Node 24 PASS (31 sn).

`public/admin/admin.js` **1176 → 1052 satıra** indi; yeni `public/admin/js/roles.js` **137 satır**. Bilinen fresh-DB `error_logs` cleanup-order bug'ı değiştirilmedi; P2-6 fiziksel 55\" 4K kabul kapısı açık kalır. Sıradaki admin JS dalgası **P3-5B3 — Attendance** olacaktır.

Bu işler gerçek teknik borçtur fakat ilk yapılmamalıdır.

## 21.1 `backend/server.js` — A1–A7 sonrası 416 satır

Domain route extraction tamamlandı:

- settings/system
- schedule
- students
- roles
- attendance
- logs
- slides

Admin auth/session composition root içinde kalır. Bu sınır sırf dosya daha da küçülsün diye taşınmayacak; A8 ancak ayrı security regression turuyla değerlendirilecektir.

## 21.2 `public/admin/admin.js` — B2 sonrası 1052 satır

B1 ile students domaini `public/admin/js/students.js`, B2 ile roles domaini `public/admin/js/roles.js` içine ayrıldı. `fetchStudents()` ve `fetchRoles()` shell bridge olarak `admin.js` içinde kalır ve domain modüllerine veri fan-out'u yapar.

Kalan alan modülleri:

- attendance
- slides
- system/logs

olarak ayrılabilir. Sıradaki aktif dalga **B3 Attendance**'dır.

## 21.3 Admin inline CSS

Slayt listesi başta olmak üzere JS template'lerinde çok fazla inline style var.

Bunlar CSS class'larına taşınmalıdır.

## 21.4 Kiosk CSS

- `style.css` yaklaşık 4740 satır
- Magic Park override yaklaşık 1433 satır

Uzun vadede eski artık kullanılmayan stiller tespit edilip CSS küçültülmelidir.

### Uyarı

Bu iş görsel regresyona çok açıktır.

Fiziksel 4K kabul turundan **önce** büyük CSS temizliği yapılmamalıdır.

---

# 22. Özellikle şimdilik dokunulmaması gereken alanlar

Aşağıdakiler şu anda sorun üretmiyor ve testlerle korunuyor. Başka düzeltmeler sırasında gereksiz yere refactor edilmemelidir:

- bulk attendance transaction
- president replacement transaction
- VP/duty bounded role SQL
- student managed-photo cleanup
- slide reorder transaction
- slide cache invalidation sırası
- slide media canonical path çözümü
- slideshow transition lock
- slideshow generation invalidation
- face-focus queue/cache/downsample
- normalized schedule fallback sözleşmesi
- Istanbul backend date util
- CSRF HMAC modeli
- session cookie flags
- login/write rate limitleri
- same-origin browser modeli
- Magic Park 16:9 temel geometri
- local GSAP/confetti/font kiosk assets

Prensip:

> Bir düzeltme için dokunmak gerekmeyen çalışan güvenlik/veri bütünlüğü koduna dokunulmayacak.

---

# 23. Yeni test dosyaları için önerilen yapı

Mevcut test sistemi çok parçalıdır. Yeni düzeltmeler de aynı davranış odaklı yapıda olmalıdır.

Önerilen yeni dosyalar:

- `tests/slides-active-management.test.js`
- `tests/admin-feedback.test.js`
- `tests/admin-date-utils.test.js`
- `tests/slide-settings-submit.test.js`
- `tests/slides-delete-error-redaction.test.js`

Mevcut dosya genişletilebiliyorsa gereksiz yeni dosya açılmamalıdır.

Örneğin:

- `admin-auth-config.test.js` mevcut dosyada güncellenmeli.
- `slides-update-cache.test.js` active toggle cache senaryosu için genişletilebilir.
- `slides-read-error-redaction.test.js` yeni admin management GET endpoint'i için genişletilebilir.

---

# 24. Her faz sonrası zorunlu doğrulama

## P1 sonunda

- hedef testler
- `npm run test:core`
- admin browser CRUD smoke
- temp DB ile slide active/passive smoke
- attendance today timezone smoke

## P2 güvenlik sonunda

- auth testleri
- CSRF
- rate-limit
- CORS
- error redaction
- npm audit
- Node 22/24 CI

## Kiosk fazı sonunda

- 3840×2160 browser
- 1366×768 browser
- live resize
- reduced motion
- physical 55" 4K

## P3 cleanup sonunda

- `npm run test:core`
- `git diff --check`
- stale string taraması
- README/context link doğrulaması

---

# 25. Commit stratejisi

Düzeltmeler tek dev committe yapılmamalıdır.

Önerilen commit sınırları:

1. `fix: restore slide active state management`
2. `fix: show admin operation feedback`
3. `fix: use Istanbul date in attendance admin`
4. `fix: validate slide settings responses`
5. `security: require configured admin password`
6. `security: redact slide delete database errors`
7. `chore: vendor SheetJS locally`
8. `chore: update vulnerable dependencies`
9. `fix: make kiosk titlebar motion resize-safe`
10. `refactor: protect system fallback slides`
11. `chore: remove stale maintenance scripts`
12. `docs: refresh Classroom project documentation`

Her commit kendi test kanıtıyla kapanmalıdır.

---

# 26. Başarı ölçütü

Bu düzeltme turunun sonunda aşağıdaki tablo hedeflenmektedir:

| Alan | Bugün | Hedef |
|---|---|---|
| Slayt aktif/pasif | Kırık | Tam yönetilebilir |
| Pasif slaytı geri açma | Mümkün değil | Mümkün |
| Admin işlem feedback | Görünmez | Erişilebilir toast |
| Admin “Bugün” | UTC riski | Europe/Istanbul |
| Slide settings HTTP error | Yanlış success olabilir | Fail doğru gösterilir |
| Admin password fallback | Sabit digest fallback | Fail-closed |
| Slide delete error | Bazı raw DB mesajları | Tam redacted |
| Admin SheetJS | CDN 0.20.1 | Local / tek sürüm |
| npm audit | 14 bulgu | Kontrollü minimum |
| CI görünümü | Son push kırmızı | Son main run yeşil |
| Resize titlebar | Live resize'da kayabilir | Stable |
| Fallback slide sistemi | Seed marker / editable | Net system-owned model |
| Eski scriptler | Yanıltıcı | Güncel veya kaldırılmış |
| Ana dokümantasyon | Çelişkili | Tek güncel gerçeklik |
| Core tests | 1270 pass | Tüm yeni testlerle pass |

---

# 27. İlk uygulanacak iş — kesin karar

İlk kod değişikliği **Slayt Aktif/Pasif yönetimi** olacaktır.

Bunun nedeni:

1. Gerçek browser/API davranışında kırık olduğu doğrulandı.
2. Admin arayüzü kullanıcıya çalışıyormuş gibi bir buton gösteriyor.
3. Fix küçük görünse de backend read contract'ı ile bağlantılı olduğu için doğru mimari karar gerekiyor.
4. Sonraki admin feedback çalışması bu özelliğin sonucunu görünür hale getirecek.
5. Güvenlik/refactor işlerine geçmeden önce günlük öğretmen işlevi doğru olmalıdır.

### İlk işte uygulanacak kesin sıra

1. Slide management için yeni regression test yaz.
2. Admin-only tüm slaytları listeleyen endpoint ekle.
3. `PUT /api/slides/:id` içine strict `is_active` desteği ekle.
4. Cache invalidation contract'ını test et.
5. Admin `fetchSlides()` yönetim endpoint'ine geçir.
6. Pasif slayt görsel state'ini ekle.
7. Toggle button gerçek server/temp DB ile doğrula.
8. Slide test grubu.
9. `npm run test:core`.
10. Bu belgedeki P1-1 durumunu güncelle.

**Bu tamamlanmadan ikinci büyük konuya geçilmeyecek.**

---

# 28. Sonraki üç iş — kesin sıra

P1-1 tamamlandıktan sonra:

## İkinci

**Admin görünür feedback sistemi**

Çünkü bütün admin CRUD akışları bundan yararlanacaktır.

## Üçüncü

**Admin İstanbul “Bugün” tarihi**

Küçük ama gerçek veri doğruluğu sorunudur.

## Dördüncü

**Slide settings HTTP error kontrolü**

Feedback sistemi görünür hale geldikten sonra yanlış success üretilmesini engellemek gerekir.

Bunlardan sonra güvenlik fazına geçilecektir.

---

# 29. Güvenlik fazındaki kesin sıra

1. Gerçek deployment için `CLASSROOM_ADMIN_PASSWORD` sağlama yolunu doğrula.
2. Password fallback'i kaldır / fail-closed.
3. Login/session/auth testlerini tam çalıştır.
4. Slide delete raw error redaction.
5. SheetJS local vendor.
6. `npm audit` paket yükseltmeleri.

Burada özellikle password fallback ilk sırada olsa da **deployment secret yolu doğrulanmadan kod değişikliği yapılmayacaktır**; aksi halde admin erişimi kazara tamamen kapanabilir.

---

# 30. Bu planın dışında kalan işler

Şu aşamada aşağıdakiler yeni düzeltme serisine dahil değildir:

- yeni özellik ekleme
- yeni kiosk tema tasarlama
- hava durumu özelliğini geri getirme
- günün kelimesini geri getirme
- eski geniş admin settings panelini geri getirme
- ders programı diagnostics/draft editor prototipini geri getirme
- generative AI/Gemini özelliği ekleme
- framework'e geçiş
- React/Vue yeniden yazımı
- veritabanını başka teknolojiye taşıma

Önce mevcut ürün sağlamlaştırılacaktır.

---

# 31. Yaşayan durum tablosu

Bu tablo geliştirme sırasında güncellenecektir.

| Sıra | İş | Öncelik | Durum |
|---:|---|---|---|
| 0 | Başlangıç baseline / test disiplini | Zorunlu | ⬜ |
| 1 | Slayt Aktif/Pasif yönetimi | P1 | 🟩 |
| 2 | Admin görünür feedback | P1 | 🟩 |
| 3 | Admin İstanbul “Bugün” tarihi | P1 | 🟩 |
| 4 | Slide settings HTTP hata kontrolü | P1 | 🟩 |
| 5 | Admin password fail-closed | P1 | 🟩 |
| 6 | Slide delete error redaction | P1 | 🟩 |
| 7 | Slide settings atomik tek-endpoint refactor | P2 | 🟩 |
| 8 | SheetJS local + tek sürüm | P2 | 🟩 |
| 9 | npm dependency security turu | P2 | 🟩 |
| 10 | GitHub CI son main run yeşil | P2 | 🟩 |
| 11 | GSAP resize güvenilirliği | P2 | 🟩 |
| 12 | Fallback slide sistem sahipliği | P2 | 🟩 |
| 13 | Fiziksel 4K kabul | P2 | 🟨 |
| 14 | Stale bakım scriptleri | P3 | ⬜ |
| 15 | README/context/docs güncelleme | P3 | ⬜ |
| 16 | Legacy settings katmanı | P3 | 🟩 |
| 17 | Orphan backend config/utils | P3 | 🟩 |
| 18 | Büyük server/admin/CSS refactor planı | P3 | 🟩 |
| 19 | P3-5A1 settings/system route extraction | P3 | 🟩 |
| 20 | P3-5A2 schedule route extraction | P3 | 🟩 |
| 21 | P3-5A3 students route extraction | P3 | 🟩 |
| 22 | P3-5A4 roles route extraction | P3 | 🟩 |
| 23 | P3-5A5 attendance route extraction | P3 | 🟩 |
| 24 | P3-5A6 logs route extraction | P3 | 🟩 |
| 25 | P3-5A7 slides route extraction | P3 | 🟩 |
| 26 | P3-5B1 admin students module extraction | P3 | 🟩 |
| 27 | P3-5B2 admin roles module extraction | P3 | 🟩 |
| 28 | P3-5B3 admin attendance module extraction | P3 | ⬜ |

Durum simgeleri:

- ⬜ Bekliyor
- 🟨 Çalışılıyor
- 🟩 Tamamlandı ve doğrulandı
- 🟥 Bloke / yeniden karar gerekli

---

# 32. Son karar

Classroom projesinin şu anki ihtiyacı yeni özellik üretmek değil, **mevcut güçlü tabanın üzerindeki az sayıdaki gerçek kusuru doğru sırada kapatmaktır**.

Düzeltme sırasının temel mantığı:

> Önce öğretmenin gördüğü kırık davranışlar → sonra admin güvenlik sınırı → sonra bağımlılık/CI → sonra kiosk dayanıklılığı → en son refactor ve eski belge/kod temizliği.

Bu sıra bilinçlidir. Özellikle `server.js`, büyük CSS veya settings katmanında erken refactor yapılmayacaktır; çünkü davranış açıkları kapanmadan yapılan yapısal değişiklikler test kapsamı iyi olsa bile gereksiz regresyon alanı açar.

**İlk uygulama konusu:** Slayt Aktif/Pasif yönetimini uçtan uca doğru hale getirmek.
