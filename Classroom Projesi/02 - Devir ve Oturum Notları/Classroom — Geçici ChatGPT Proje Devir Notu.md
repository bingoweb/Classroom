# ChatGPT Proje Devir Notu — Geçici

> **Amaç:** Bu dosya, ChatGPT oturumları arasında proje bağlamını geçici olarak taşımak için oluşturulmuştur.
>
> **Depo:** `bingoweb/Classroom`
>
> **Çalışılan dal:** `ilk-surum-gelistirme`
>
> **İnceleme başlangıç HEAD'i:** `f2712b94ddba08a2be34e8cb7e9e0e95142b4ea0`
>
> **Yeni oturum talimatı:** Önce bu dosyayı ve güncel dal HEAD'ini GitHub üzerinden yeniden oku. Buradaki bulguları körü körüne kabul etme; ilgili kaynak dosyalardan yeniden doğrula. Kullanıcı onayı olmadan yeni özellik ekleme. İlk hedef aşağıdaki P0 sorunlarının güvenli ve testli biçimde giderilmesidir.
>
> **Geçicilik:** Çalışma tamamlandığında veya kullanıcı istediğinde bu dosya ayrı bir commit ile silinmelidir.

---

## 1. Proje özeti

Classroom, sınıf içinde büyük ekranda çalışacak bir **dijital sınıf panosu** ve buna bağlı **yönetim panelidir**.

### Teknoloji

- Backend: Node.js + Express
- Veritabanı: SQLite
- Frontend: Vanilla HTML, CSS ve JavaScript
- Dosya yükleme: Multer
- Excel: XLSX / SheetJS
- Test: Node.js yerleşik `node:test`
- Ana pano: `/`
- Yönetim paneli: `/admin/`
- Kimlik doğrulama/yetkilendirme: Yok

### Temel kullanıcı yüzeyleri

1. Ana sınıf panosu
2. Yönetim paneli

### Genel değerlendirme

- Ders programı normalleştirme, doğrulama ve fallback sistemi projenin en olgun ve en yoğun test edilen alanıdır.
- Öğrenci, rol, yoklama, slayt ve ayar özellikleri mevcuttur.
- Bazı yönetim kontrolleri frontend'de görünse de backend sözleşmesi eksiktir.
- Raspberry Pi ve başka cihazlardan erişim için kritik `localhost` ve medya yolu sorunları vardır.

---

## 2. Doğrulanmış mevcut özellikler

### 2.1 Ana pano

- Dijital saat ve Türkçe tarih
- Hafta sonuna kalan gün sayacı
- Ders/teneffüs geri sayımı
- Ders başlamadan önce, ders sırasında, teneffüste, okul sonrasında ve hafta sonu ekranları
- Veritabanı programı geçersizse sabit programa güvenli geri dönüş
- Toplam, kız, erkek, var ve yok öğrenci istatistikleri
- Gelmeyen öğrenciler kayan listesi
- Sınıf başkanı
- En fazla iki başkan yardımcısı
- En fazla dört nöbetçi
- Haftanın yıldızları mini slayt gösterisi
- Öğrenci fotoğraflarında sezgisel yüz odaklama ve `localStorage` önbelleği
- Mikrofon tabanlı gürültü ölçer
- 128 çubuklu ekolayzer ve çoklu tema
- Görsel/GIF/video slayt gösterisi
- Slayta özel süre, video bitince ilerleme ve geçişler
- Çok sayıda CSS/JS slayt geçiş efekti
- Cuma okul sonrası konfeti
- `?gelistirme=1` ile geliştirici zaman simülatörü
- Normal/tam ekran/kiosk görüntü modu

### 2.2 Yönetim paneli

Görünen sekmeler:

- Öğrenciler
- Görevler
- Yoklama
- Slayt Yönetimi
- Ayarlar
- Ders Programı

Mevcut işlemler:

- Tekli öğrenci ekleme
- Öğrenci listeleme, arama ve cinsiyete göre filtreleme
- Öğrenci fotoğrafı değiştirme
- Öğrenci silme
- Excel ile toplu öğrenci aktarımı ve önizleme
- Başkan, başkan yardımcısı, nöbetçi ve yıldız atama
- Rol kaldırma
- Tarih bazlı yoklama yükleme ve toplu kaydetme
- Slayt ekleme, düzenleme, silme ve sürükle-bırak sıralama
- Slayt aktif/pasif düğmesi mevcut; ancak backend desteği eksik
- Tema, ekran modu, yazı boyutu, otomatik yenileme, saat formatı, gürültü ayarları ve slayt ayarları
- Yönetim panelinde canlı mikrofon/ekolayzer önizlemesi
- Mobil bağlantı adresi gösterimi
- Ders programı tanılama ekranı
- Yerel ders programı taslak düzenleyicisi
- Kaynak program ile taslak karşılaştırması

### 2.3 Ders programı

İki ayrı API yolu birlikte yaşamaktadır:

- Eski yol: `GET/POST /api/schedule`
- Yeni ve doğrulamalı yol: `GET/PUT /api/schedule/normalized`

Yeni yol:

- Gün anahtarını doğrular
- Dönem tipini ve saatleri doğrular
- Çakışmaları ve geçersiz programı raporlar
- Transaction ile toplu program değiştirebilir
- Ana pano tarafından güvenli sınıflandırma ve fallback ile kullanılır

Admin taslak düzenleyicisi yalnızca yereldir. **Sunucuya kaydetmez.**

---

## 3. Veritabanı tabloları

### `students`

- `id`
- `name`
- `photo`
- `gender`

### `roles`

- `id`
- `student_id`
- `role_type`
- Öğrenci silinince `ON DELETE CASCADE`
- `(student_id, role_type)` benzersizlik kısıtı yok

### `settings`

Anahtar-değer tablosu. Varsayılanlar arasında `message` ve `city` bulunur; aktif kullanıcı arayüzü tüketicileri doğrulanmamıştır.

### `attendance`

- `student_id`
- `date`
- `status`
- `UNIQUE(student_id, date)`

### `slides`

Başlıca alanlar:

- başlık ve içerik türü
- medya türü/yolu
- metin
- gösterim süresi
- video otomatik ilerleme
- geçiş türü/süresi/modu
- sıralama
- aktiflik
- bitiş tarihi
- öncelik
- afiş işareti

`priority` alanı vardır; aktif slayt sorgusunda kullanılmaz.

### `slide_settings`

- varsayılan süre
- varsayılan geçiş modu
- varsayılan geçiş süresi
- duyuru süresi

### `error_logs`

Frontend/backend hata ayrıntıları, bağlam, stack, user-agent ve URL.

### `schedule`

- gün
- sıra
- ders/dönem adı
- dönem türü
- başlangıç/bitiş
- aktiflik

---

## 4. API özeti

### Öğrenciler

- `GET /api/students`
- `POST /api/students`
- `DELETE /api/students/:id`
- `PUT /api/students/:id/photo`
- `POST /api/students/import`

### Roller

- `GET /api/roles`
- `POST /api/roles`
- `DELETE /api/roles/:id`

### Ayarlar

- `GET /api/settings`
- `POST /api/settings`
- `GET /api/slide-settings`
- `POST /api/slide-settings`

### Ders programı

- `GET /api/schedule`
- `POST /api/schedule`
- `GET /api/schedule/normalized`
- `PUT /api/schedule/normalized`

### Yoklama ve istatistik

- `GET /api/stats`
- `GET /api/attendance/today`
- `GET /api/attendance/:date`
- `POST /api/attendance`
- `PUT /api/attendance/:id`

### Slaytlar

- `GET /api/slides/active`
- `GET /api/slides` — adı yanıltıcı; yalnızca aktif slaytları döndürür
- `GET /api/slides/:id`
- `POST /api/slides`
- `PUT /api/slides/:id`
- `DELETE /api/slides/:id`
- `PUT /api/slides/reorder`

### Sistem ve log

- `GET /api/network-info`
- `POST /api/logs`
- `GET /api/logs`
- `DELETE /api/logs/cleanup`

---

## 5. Kritik ve yüksek öncelikli bulgular

## P0-01 — Disk yolu ile web URL'si karıştırılıyor

Multer dosyayı gerçek disk yoluna kaydeder. Kod `req.file.path` değerini veritabanına yazmaktadır. `normalizePath()` yalnızca `\` karakterlerini `/` yapar; gerçek dosya yolunu `/uploads/...` web adresine dönüştürmez.

Olası kayıt:

```text
/home/user/Classroom/backend/uploads/123-photo.png
```

Tarayıcının ihtiyaç duyduğu kayıt:

```text
/uploads/123-photo.png
```

### Etkilenenler

- Öğrenci eklerken fotoğraf
- Öğrenci fotoğrafı değiştirme
- Slayt ekleme/düzenleme
- Ana panoda öğrenci fotoğrafları
- Slayt gösterimi
- Eski medya silme

### Öneri

- Veritabanında yalnızca taşınabilir web yolu tutulmalı: `/uploads/...`
- Disk yazma/silme için ayrı güvenli yol çözümleyici kullanılmalı
- `path.resolve` ile upload dizini dışına çıkış engellenmeli
- Eski mutlak kayıtlar için idempotent geçiş/normalleştirme hazırlanmalı
- Öğrenci ve slayt dosya yolları için test eklenmeli

## P0-02 — Sabit `localhost` uzak cihaz erişimini bozuyor

`public/js/config.js` içinde:

```javascript
API_URL: 'http://localhost:3000/api'
```

Başka cihazda `localhost`, Raspberry Pi yerine o cihazı gösterir. `settings-loader.js` aynı origin kullanırken diğer modüller sabit CONFIG kullanır.

### Öneri

```javascript
API_URL: `${window.location.origin}/api`
```

veya yalnızca göreli `/api` kullanılmalı. Node test ortamı için güvenli export/fallback korunmalı.

`Mobil Bağlan` düğmesi `/api/network-info` endpoint'ini kullanmalı ya da mevcut origin üzerinden doğru adres üretmelidir.

## P0-03 — Toplu yoklama transaction kullanmıyor

`POST /api/attendance` önce seçilen tarihin tüm kayıtlarını siler, sonra yenilerini tek tek ekler. Bir ekleme başarısız olursa eski kayıtlar gitmiş, yeni kayıtların bir bölümü kalmış olabilir.

### Öneri

- Girdinin tamamını işlem öncesinde doğrula
- Transaction başlat
- Eski kayıtları sil
- Tüm yeni kayıtları ekle
- Başarılıysa commit
- Her hatada rollback
- Transaction bütünlüğü için entegrasyon testi ekle

## P1-01 — Slayt aktif/pasif düğmesi çalışmıyor

Frontend `is_active` gönderir; backend `PUT /api/slides/:id` bu alanı okumaz/güncellemez.

Ayrıca yönetim panelinin `GET /api/slides` çağrısı yalnızca aktif slaytları döndürür. Pasif slayt yönetim listesinden kaybolur ve yeniden aktifleştirilemez.

### Öneri

- Admin için tüm slaytları döndüren açık endpoint/sorgu
- Pano için yalnızca aktif ve süresi dolmamış endpoint
- `is_active` alanı için doğrulanmış backend desteği
- Toggle ve pasif slaydı yeniden aktifleştirme testleri

## P1-02 — Aktif slayt önbelleği geçersizleştirilmiyor

`GET /api/slides/active` beş dakika cache kullanır. Oluşturma, güncelleme, silme veya sıralamadan sonra cache temizlendiği doğrulanmamıştır.

### Öneri

Her slayt mutasyonundan sonra merkezi `invalidateSlidesCache()` çağrılmalı.

## P1-03 — Slayt silme sonrası yeniden sıralama hatalı

Kod slaytı önce siler, sonra silinen `id` üzerinden eski `display_order` değerini bulmaya çalışır. Kayıt artık olmadığı için sıralama düzeltmesi etkisiz kalabilir.

### Öneri

- Silmeden önce sıra değerini al
- Silme ve kalan sıraları güncelleme transaction içinde olsun
- Gerekirse tüm sıraları 1..N şeklinde normalize et

## P1-04 — Slayt sıralama atomik değil

Toplu sıralama tek tek update eder; transaction yoktur. Orta noktada hata olursa kısmi sıra kalabilir.

### Öneri

- Bütün girdiyi önce doğrula
- Kimliklerin varlığını doğrula
- Pozitif ve benzersiz sıra değerleri kullan
- Transaction içinde güncelle
- Hata durumunda rollback

## P1-05 — Genel başarı/hata bildirimleri görünmüyor

`public/js/utils.js` içindeki `showError()` yalnızca log yazar; `showSuccess()` görünür işlem yapmaz. Öğrenci, rol, yoklama ve slayt akışları bu fonksiyonları kullanır.

Ayarlar panelinde ayrı çalışan toast sistemi vardır.

### Öneri

- Ortak, erişilebilir ve güvenli toast sistemi oluştur
- Başarı, hata, uyarı tiplerini destekle
- HTML değil `textContent` kullan
- Ayarlar panelindeki iki ayrı bildirim altyapısını birleştir

## P1-06 — Rol tekrarları engellenmiyor

Aynı öğrenci aynı anda tekrar tekrar nöbetçi veya yıldız yapılabilir. Veritabanında `(student_id, role_type)` benzersizliği yoktur.

### Öneri

- Önce mevcut veride tekrarları tespit/temizle
- Benzersiz indeks veya API seviyesinde açık kontrol ekle
- Yarış koşuluna karşı veritabanı kısıtı tercih et
- Kullanıcıya doğal Türkçe hata döndür

---

## 6. Orta öncelikli sorunlar

### P2-01 — “Bugün” UTC ve İstanbul arasında tutarsız

Admin:

```javascript
new Date().toISOString().split('T')[0]
```

Backend İstanbul tarih yardımcılarını kullanır.

### P2-02 — Slayt varsayılan ayarları başarısız olsa da başarılı görünebilir

Üç ayrı `fetch()` çağrısında `response.ok` kontrol edilmeden başarı mesajı verilir.

### P2-03 — Kaydedilen bazı ayarlar panoda uygulanmıyor

Şüpheli/bağlantısız ayarlar:

- `clockFormat`
- `slideshowAutoPlay`
- `slideshowLoop`
- `slideshowProgress`

### P2-04 — Tekli öğrenci eklemede fotoğraf MIME doğrulaması eksik

Frontend `accept="image/*"` kullanır; backend `POST /api/students` genel upload middleware'i ile dosya türünü doğrulamaz.

### P2-05 — Cinsiyet API seviyesinde zorunlu değil

Frontend zorunlu tutar; backend yalnızca değer gelirse M/F kontrolü yapar. DB alanı `NOT NULL` değildir.

### P2-06 — Bireysel ayar kontrolleri kaydı beklemeden başarı gösteriyor

Bireysel ayar fonksiyonları API sonucunu `await` etmeden toast gösterebilir.

### P2-07 — HTML enjeksiyonu riski

Öğrenci adları ve bazı Excel hücreleri `innerHTML` şablonlarına doğrudan eklenir.

### P2-08 — Öğrenci silinince özel fotoğraf dosyası silinmiyor

DB kaydı, roller ve yoklama cascade ile gider; özel fotoğraf diskte kalabilir.

### P2-09 — Excel aktarımı kısmi ekleme yapabilir

Bir satır başarısız olduğunda diğer satırlar eklenebilir.

### P2-10 — Genel CORS ve kimlik doğrulama yok

Yerel ağa erişen bir istemci yazma endpoint'lerini çağırabilir.

---

## 7. İşlem bazında sözleşme durumu

| İşlem | Durum | Ana sorun |
|---|---|---|
| Öğrenci ekleme | Kısmi | Medya yolu, MIME, bildirim |
| Öğrenci silme | Kısmi | Özel fotoğraf diskte kalıyor |
| Fotoğraf değiştirme | Riskli | Web yolu/disk yolu |
| Excel aktarımı | Riskli | CDN, enjeksiyon, kısmi ekleme |
| Başkan | Çalışıyor | Eski başkanı değiştiriyor |
| Başkan yardımcısı | Çalışıyor | Limit ve tekrar kontrolü var |
| Nöbetçi | Eksik | Tekrar atanabilir |
| Yıldız | Eksik | Tekrar atanabilir |
| Yoklama | Kritik risk | Transaction ve tarih |
| Slayt ekle/düzenle | Riskli | Yol ve cache |
| Slayt sil | Eksik | Sıralama ve dosya temizliği |
| Slayt sırala | Riskli | Transaction yok |
| Aktif/pasif | Çalışmıyor | Backend desteği yok |
| Genel ayarlar | Kısmi | Bazı ayarlar tüketilmiyor |
| Ders programı tanılama | Sağlam | Salt okunur |
| Taslak düzenleyici | Tasarlandığı gibi | Sunucuya kaydetmez |
| Mobil bağlantı | Bozuk/kısmi | Sabit localhost |

---

## 8. Test durumu

Çekirdek test dosyaları:

- `schedule-manager.test.js`
- `dev-time-simulator.test.js`
- `backend-date-utils.test.js`
- `backend-schedule.test.js`
- `dashboard-schedule-loader.test.js`
- `admin-schedule-diagnostics.test.js`
- `admin-schedule-draft-editor.test.js`
- `admin-schedule-review-panel.test.js`

Test kapsamı zayıf alanlar:

- Öğrenci CRUD
- Upload/dosya temizliği
- Roller
- Yoklama transaction'ı
- Excel
- Slayt CRUD/cache/sıralama
- Ayarlar
- Mobil erişim
- Bildirimler
- Güvenlik

Önceki oturumlarda söylenen `480/480` sonucu bu incelemede yeniden çalıştırılmamıştır.

---

## 9. Önerilen çalışma sırası

### Aşama 1 — Temel erişim ve medya yolu sözleşmesi

1. Sabit `localhost` kaldır
2. Tüm frontend API çağrılarını same-origin yap
3. Veritabanında web yolu, dosya sisteminde disk yolu ayrımını kur
4. Güvenli upload yolu dönüştürücüleri oluştur
5. Eski mutlak medya kayıtları için geçiş çözümü hazırla
6. Öğrenci ve slayt medya testleri ekle

### Aşama 2 — Yoklama bütünlüğü

1. İstek gövdesini tamamen doğrula
2. Transaction/rollback uygula
3. İstanbul tarihini frontend/backend için tekleştir
4. Entegrasyon testleri ekle

### Aşama 3 — Slayt yönetimi

1. Admin tüm slaytlar / pano aktif slaytlar ayrımı
2. `is_active` desteği
3. Cache invalidation
4. Atomik sıralama
5. Doğru silme ve sıra normalizasyonu
6. Test kapsamı

### Aşama 4 — Yönetici geri bildirimi

1. Ortak toast sistemi
2. Bütün öğrenci, rol, yoklama ve slayt işlemlerine bağla
3. API sonucunu beklemeden başarı gösterme davranışlarını kaldır

### Aşama 5 — Veri bütünlüğü ve güvenlik

1. Rol benzersizliği
2. Cinsiyet zorunluluğu
3. Upload MIME/uzantı doğrulaması
4. HTML enjeksiyonu önlemleri
5. Yerel ağ yazma güvenliği / kimlik doğrulama yaklaşımı

### Aşama 6 — Ayar temizliği

1. Gerçekten çalışan ayarları doğrula
2. Çalışmayanları bağla veya kaldır
3. Saat formatı ve slayt davranışlarını test et

### Aşama 7 — Eski kod temizliği

- Günün kelimesi kalıntıları
- Hava durumu yardımcıları
- `message` ve `city` kalıntıları
- `priority` gibi kullanılmayan alanlar
- Eski `/api/schedule` yolunun geleceği
- Kullanılmayan `/api/network-info` bağlantısı

---

## 10. Yeni oturumda yapılacak ilk işlem

1. `bingoweb/Classroom` deposunu GitHub üzerinden aç.
2. `ilk-surum-gelistirme` dalının güncel HEAD'ini doğrula.
3. Bu `CHATGPT_PROJECT_HANDOFF.md` dosyasını oku.
4. HEAD bu dosyada yazan inceleme HEAD'inden ilerideyse değişen dosyaları karşılaştır.
5. Özellikle şu dosyaları yeniden oku:
   - `public/js/config.js`
   - `public/js/api-service.js`
   - `public/js/utils.js`
   - `backend/server.js`
   - `backend/utils.js`
   - `backend/database.js`
   - `public/admin/admin.js`
   - `public/admin/settings-handler.js`
   - `public/js/settings-loader.js`
6. İlk düzeltme paketini yalnızca şu kapsamda planla:
   - same-origin API
   - medya web URL'si / disk yolu ayrımı
   - güvenli medya silme
   - eski yol verilerinin uyumluluğu
   - ilgili otomatik testler
7. Kullanıcının açık onayı olmadan kapsamı büyütme.
8. Görünen tüm kullanıcı metinleri doğal Türkçe olmalı.
9. Antigravity veya başka kodlama ajanlarına verilecek promptlar İngilizce olmalı.
10. Değişiklik yapılırsa test, git diff, status ve commit doğrulaması yapılmalı.

---

## 11. Yeni oturumda kullanıcının yazabileceği kısa komut

> `bingoweb/Classroom deposundaki ilk-surum-gelistirme dalında bulunan CHATGPT_PROJECT_HANDOFF.md dosyasını oku, güncel HEAD ile doğrula ve kaldığımız yerden devam et.`

---

## 12. Geçici dosyanın kaldırılması

Aşağıdakiler tamamlandıktan sonra bu dosya silinmelidir:

- Kritik bağlam yeni oturuma taşındıysa
- P0/P1 düzeltmeleri issue, PR veya kalıcı teknik dokümana aktarıldıysa
- Geçici oturum notuna artık ihtiyaç yoksa

Önerilen silme commit mesajı:

```text
docs: remove temporary ChatGPT project handoff
```
