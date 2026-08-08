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

---

# 10. P1-6 — Slide delete ham DB hata sızıntısını kapat

**Öncelik:** P1 güvenlik / consistency  
**Risk:** Düşük-Orta  
**Durum:** ⬜ Bekliyor

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

---

# 11. P2-1 — SheetJS'i yerelleştir ve sürümü tekleştir

**Öncelik:** P2  
**Kullanıcı etkisi:** Excel import güvenilirliği / offline admin  
**Risk:** Düşük-Orta  
**Durum:** ⬜ Bekliyor

## 11.1 Sorun

Package dependency:

- SheetJS 0.20.3

Admin HTML runtime:

- CDN SheetJS 0.20.1

Dolayısıyla:

1. iki farklı sürüm vardır,
2. admin Excel ekranı internet/CDN'e bağlıdır,
3. backend'de yapılan paket güncellemesi browser'a yansımamıştır,
4. kiosk offline olsa bile admin tamamen offline değildir.

## 11.2 Seçilen çözüm

`node_modules/xlsx` paketinin browser-ready minified dağıtımı build/vendor sürecinde:

`public/vendor/sheetjs/`

altına pinli olarak konacaktır.

Admin:

```html
<script src="../vendor/...">
```

veya doğru absolute local path kullanacaktır.

Harici CDN kaldırılacaktır.

## 11.3 Sürüm kaynağı

Tek source of truth `package.json` / lockfile olmalıdır.

Aynı kütüphanenin HTML içinde elle başka sürümü pinlenmemelidir.

## 11.4 Test

1. admin HTML'de `cdn.sheetjs.com` yok.
2. local vendor dosyası var.
3. XLSX global'i browser'da yükleniyor.
4. Excel preview/import testleri geçiyor.
5. internet kapalı browser smoke testte admin Excel ekranı açılıyor.

---

# 12. P2-2 — npm audit bulgularını kontrollü kapat

**Öncelik:** P2 güvenlik/bakım  
**Risk:** Orta-Yüksek  
**Durum:** ⬜ Bekliyor

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
- 1270+ core suite yeşil,
- native sqlite smoke başarılı

olmalıdır.

---

# 13. P2-3 — GitHub Actions kırmızı push koşusunu temizle

**Öncelik:** P2 CI güvenilirliği  
**Kod riski:** Düşük  
**Durum:** ⬜ Bekliyor

## 13.1 Mevcut durum

Aynı `6865630` SHA'sı için:

- manual Node 22 → success
- manual Node 24 → success

fakat son push run kırmızı.

Annotation test failure değil:

> hosted runner job'u acquire edilemedi.

## 13.2 Yapılacak

Kod değişikliği gerekmeyebilir.

- failed run rerun edilir,
- Node 22/24 yeniden yeşil olursa altyapı olayı kapanır,
- tekrar runner acquire sorunu olursa GitHub Actions availability/queue durumu ayrı incelenir.

## 13.3 Kapanış kriteri

`main` son commit için visible Core Tests check yeşil olmalıdır.

---

# 14. P2-4 — Dinamik resize sonrası titlebar GSAP kaymasını düzelt

**Öncelik:** P2 kiosk dayanıklılığı  
**Sabit kiosk etkisi:** Düşük  
**Responsive/dev/hotplug etkisi:** Orta  
**Durum:** ⬜ Bekliyor

## 14.1 Doğrulanan davranış

Fresh load:

- 3840×2160 → düzgün
- 1366×768 → düzgün

Fakat sayfa bir viewport'ta yüklendikten sonra canlı resize edilirse ilk beş titlebar'ın CSS merkezleme transformu GSAP tarafından piksel inline transform olarak kalabiliyor.

Sonuç titlebar kendi kart merkezinden kayabilir.

## 14.2 Kök neden

Titlebar CSS konumlandırması:

- `left: 50%`
- `transform: translateX(-50%)`

mantığına dayanıyor.

GSAP entrance animasyonu aynı `transform` property üzerinde çalışınca computed yüzde değer piksel transformuna dönüşüyor.

Viewport değişince CSS yüzdesi yeniden hesaplanırken inline piksel transform sabit kalabiliyor.

## 14.3 Seçilen düzeltme yaklaşımı

İlk tercih:

**Layout transform ile animation transform'u aynı elementte paylaşmamak.**

İki seçenek:

### Seçenek A — Minimal ve güvenli

Entrance animasyonu bitince GSAP inline transform property'lerini `clearProps` ile temizler; CSS merkezleme tekrar source of truth olur.

### Seçenek B — Uzun vadede daha temiz

Titlebar'ın sabit layout elementini hiç animate etme; içindeki ayrı bir wrapper/text elementini `y/opacity` ile animate et.

Bu durumda layout transform ve motion transform tamamen ayrılır.

### Tercih

Önce A ile düşük riskli düzeltme denenmeli. Test sonucu sağlam değilse B'ye geçilmeli.

## 14.4 Test matrisi

1. fresh 3840×2160
2. 3840 → 1920 resize
3. 1920 → 3840 resize
4. 2560 → 1366 resize
5. reduced-motion
6. browser fullscreen enter/exit

Her durumda:

- titlebar left/right kart sınırıyla uyumlu,
- body scroll yok,
- DOM overflow yok.

---

# 15. P2-5 — Atatürk fallback slayt modelini sistem sahipliğine geçir

**Öncelik:** P2  
**Risk:** Orta  
**Durum:** ⬜ Bekliyor

## 15.1 Sorun

Fallback seti “kalıcı güvenli içerik” amacı taşıyor.

Fakat bugün:

- normal slide satırı gibi DB'de,
- admin listesine gelebiliyor,
- normal delete/update mekanizmasına girebiliyor,
- seed marker yalnız ilk seed'i çalıştırıyor.

Admin fallback satırını silerse marker kaldığı için restart onu geri getirmeyebilir.

## 15.2 Önce ürün kararı

Fallback slaytlarının rolü net tanımlanmalı:

> Bunlar öğretmen içerikleri değil, kiosk'un sistem güvenlik ağıdır.

Bu kabul edilirse davranış şu olmalıdır:

- sistem-owned,
- read-only veya çok sınırlı yönetilebilir,
- delete edilemez,
- accidental deactivate ile tüm fallback kaybolamaz,
- startup reconciliation ile eksik sistem kayıtları geri gelir.

## 15.3 Önerilen uygulama

### Admin

Fallback slaytları ayrı “Sistem Slaytları” etiketiyle gösterilebilir veya normal yönetim listesinden gizlenebilir.

Sil/Düzenle/Aktif-Pasif butonu normal teacher slide davranışıyla aynı olmamalıdır.

### Backend

`is_fallback = 1` satırlar için delete/update policy açıkça kontrol edilir.

### Database init

Tek seferlik marker yerine idempotent reconciliation:

her `fallback_key` için `INSERT OR IGNORE` veya eşdeğer sistem-owned reconciliation.

## 15.4 Test

1. eksik fallback → startup geri ekler.
2. mevcut fallback duplicate olmaz.
3. teacher slide varsa active endpoint teacher slide seçer.
4. teacher slide yoksa fallback görünür.
5. admin delete fallback policy doğru uygulanır.

---

# 16. P2-6 — Fiziksel kiosk kabul turu

**Öncelik:** P2 ürün kalite kapısı  
**Kod değişikliği:** Önce hayır  
**Durum:** ⬜ Bekliyor

Browser emülasyonu fiziksel 55" TV'nin yerini tutmaz.

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

## 16.3 Kabul kriteri

Fiziksel ekranda öğretmenin günlük kullanımını bozacak görsel veya işlevsel kusur kalmamalıdır.

---

# 17. P3-1 — Stale bakım scriptlerini temizle

**Öncelik:** P3  
**Durum:** ⬜ Bekliyor

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

# 19. P3-3 — Legacy settings/display-mode katmanını değerlendir

**Öncelik:** P3  
**Durum:** ⬜ Bekliyor

`settings-loader.js` hâlâ:

- displayMode
- colorTheme
- fontSize
- autoRefreshInterval

gibi eski settings key'lerini bilir.

Admin bunları artık yönetmiyor.

Bu iki olasılıktan biri seçilmelidir:

### Gerçek ürün özelliği olacaksa

- admin UI geri gelmeli,
- settings key'leri belgelenmeli,
- test edilmeli.

### Ürün özelliği olmayacaksa

- loader'daki dead branch'ler kaldırılmalı,
- `display-mode-manager.js` gerçekten başka yerde kullanılmıyorsa kaldırılmalı,
- DB'deki legacy key'ler migration/cleanup ile değerlendirilmeli.

### Tercih

Bugünkü sade admin vizyonu düşünüldüğünde **kaldırma yönü** daha tutarlıdır.

Ama bu temizlik P1/P2 işler bitmeden yapılmamalıdır.

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

---

# 21. P3-5 — Büyük refactor işleri yalnız stabilizasyondan sonra

**Öncelik:** P3 / son  
**Durum:** ⬜ Bekliyor

Bu işler gerçek teknik borçtur fakat ilk yapılmamalıdır.

## 21.1 `backend/server.js` — ~2800 satır

Uzun vadede alanlara bölünebilir:

- admin auth routes
- students routes/service
- roles routes/service
- attendance routes/service
- schedule routes/service
- slides routes/service
- logs routes/service

Ancak önce mevcut endpoint davranışları testlerle tamamen sabitlenmelidir.

## 21.2 `public/admin/admin.js` — ~1800 satır

Alan modülleri:

- students
- roles
- attendance
- slides
- system/logs

olarak ayrılabilir.

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
| 6 | Slide delete error redaction | P1 | ⬜ |
| 7 | Slide settings atomik tek-endpoint refactor | P2 | ⬜ |
| 8 | SheetJS local + tek sürüm | P2 | ⬜ |
| 9 | npm dependency security turu | P2 | ⬜ |
| 10 | GitHub CI son main run yeşil | P2 | ⬜ |
| 11 | GSAP resize güvenilirliği | P2 | ⬜ |
| 12 | Fallback slide sistem sahipliği | P2 | ⬜ |
| 13 | Fiziksel 4K kabul | P2 | ⬜ |
| 14 | Stale bakım scriptleri | P3 | ⬜ |
| 15 | README/context/docs güncelleme | P3 | ⬜ |
| 16 | Legacy settings katmanı | P3 | ⬜ |
| 17 | Orphan backend config/utils | P3 | ⬜ |
| 18 | Büyük server/admin/CSS refactor planı | P3 | ⬜ |

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
