# GitHub Showcase Redesign — Tasarım Spesifikasyonu

**Tarih:** 13 Ağustos 2026  
**Kapsam:** GitHub repository ana README vitrini  
**Hedef dosya:** `README.md`  
**Görsel kaynak:** Çalışan Classroom / Magic Park ekranı

## 1. Amaç

README, yalnızca kurulum ve teknik bilgi veren uzun bir doküman gibi değil, projeyi ilk kez gören birine birkaç saniye içinde ürünün kalitesini ve kapsamını anlatan **premium bir ürün vitrini** gibi davranmalıdır.

İlk ekranın vermesi gereken mesaj:

> Classroom, gerçek sınıfta 4K ekranda kullanılmak üzere geliştirilen; çocuk dostu Magic Park kiosku, gerçek zamanlı sınıf araçları ve güvenli öğretmen panelini tek local-first uygulamada birleştiren ciddi bir üründür.

## 2. Tasarım yönü

Seçilen yön: **premium product showcase + teknik derinlik dengesi**.

- Magic Park'ın renkli ve çocuk dostu karakteri korunur.
- README'nin kendi düzeni daha temiz, kontrollü ve profesyonel tutulur.
- Görsel yoğunluk üst bölümde yüksektir; teknik ayrıntı sayfanın altına doğru kademeli artar.
- Yapay mockup veya generatif ürün görseli kullanılmaz.
- Hero ve spotlight görselleri gerçek çalışan Classroom ekranlarından hazırlanır.
- Görsel efektler README içeriğinin kendisini gölgelememeli; proje görüntüsü ana yıldız olmalıdır.

## 3. Üst bölüm / hero

README'nin ilk viewport'u yeniden tasarlanacaktır.

### 3.1 Hero banner

Tek ve güçlü bir geniş banner kullanılacaktır.

Banner:

- gerçek Magic Park ekranından üretilir,
- 16:9 veya GitHub README'de geniş görünmeye uygun panoramik orana kırpılır,
- önemli kutuların tamamı veya çoğu görünür kalır,
- metin okunurluğunu bozmayacak şekilde kontrollü şekilde işlenir,
- öğrenci adı gibi gerçek kişisel veriler içermez,
- gereksiz browser chrome içermez.

Önerilen dosya:

`docs/images/github-showcase-hero.webp`

### 3.2 Başlık ve kısa ürün cümlesi

Hero ile birlikte şu hiyerarşi kullanılacaktır:

1. `Classroom — 2/D Sihirli Pano`
2. tek satırlık güçlü açıklama,
3. kısa ikinci satır: Magic Park + Admin + local-first + 4K hedefi,
4. minimal ve anlamlı badge grubu.

Badge'ler yalnız gerçek ve güncel teknik bilgiyi taşımalıdır:

- Core Tests,
- Node 22 / 24,
- Vanilla JavaScript,
- SQLite,
- Local-first.

Badge sayısı gereksiz yere artırılmayacaktır.

## 4. İçerik mimarisi

README aşağıdaki sıraya göre yeniden düzenlenecektir:

### 4.1 Hero

Ürün kimliği, kısa değer önerisi, badge'ler ve ana görsel.

### 4.2 "Neden Classroom?"

En fazla 6 kısa özellik spotu:

- gerçek 4K sınıf kiosku,
- Magic Park kutu sistemi,
- gerçek zamanlı Ders Akışı,
- otomatik mikrofon / Noise Meter,
- sınıf rolleri ve içerik yönetimi,
- güvenli local-first öğretmen paneli.

Bu bölüm uzun paragraf yerine okunabilir kısa bloklar halinde sunulur.

### 4.3 Magic Park spotlight

Üç güçlü görsel alan:

1. **Günün Zamanı + Ses Konsolu**
2. **Sınıf Başkanı**
3. **Ders Akışı / merkez Class TV sahnesi**

Spotlight görselleri mümkün olduğunca geniş ve detay okunabilir biçimde yerleştirilir.

### 4.4 "Canlı sınıf araçları"

Sekiz ana kiosk bölgesi daha kompakt bir tabloda veya iki sütunlu bölümde açıklanır.

Burada teknik implementasyon ayrıntısından çok öğrenciye görünen ürün davranışı anlatılır.

### 4.5 Magic Park kutu mimarisi

`public/themes/magic-park/boxes/` paket yaklaşımı görsel olarak anlatılır.

Tercih:

- sade bir repo içi mimari diyagram,
- kutu → CSS / JSON / JS / assets sahipliği,
- generic CSS'e box-specific sunum sızmaması.

Önerilen dosya:

`docs/images/github-showcase-architecture.webp`

Diyagram dekoratif değil, anlaşılır olmalıdır.

### 4.6 Öğretmen paneli

Admin tarafı kısa ve ürün odaklı anlatılır:

- Öğrenciler,
- Görevler,
- Yoklama,
- Slaytlar.

Güvenlik özellikleri ayrı kısa blokta özetlenir.

### 4.7 Teknik altyapı

Teknoloji tablosu korunur ancak gereksiz açıklamalar sıkıştırılır.

Önemli teknik özellikler:

- Node.js + Express,
- SQLite,
- Vanilla JavaScript,
- GSAP,
- Three.js + LiquidFun,
- Web Audio,
- yerel SheetJS,
- local-first çalışma modeli.

### 4.8 Kurulum

Hızlı kurulum bölümü kısa ve doğrudan kalır.

README'yi ziyaret eden kişinin çalıştırma yolu üç adımda anlaşılmalıdır:

1. `npm ci`
2. admin secret environment değişkeni
3. `npm start`

### 4.9 Test / güvenlik / belgeler

Alt bölümde:

- `npm run test:core`,
- GitHub Actions Node 22/24,
- güvenlik modeli,
- source-of-truth belge zinciri,
- detaylı teknik rapor linkleri

yer alır.

## 5. Görsel varlık stratejisi

README görselleri repo içinde yalnız şu amaçla tutulacaktır: GitHub vitrini.

Önerilen yeni/yenilenen varlıklar:

```text
docs/images/
├── github-showcase-hero.webp
├── github-showcase-top-controls.webp
├── github-showcase-president.webp
├── github-showcase-class-tv.webp
└── github-showcase-architecture.webp
```

Eski README screenshot'ları yeni kompozisyona hizmet etmiyorsa kaldırılabilir veya yeni isimlere taşınabilir.

### Görsel kalite kuralları

- WebP tercih edilir.
- Hero mümkün olduğunca 1600–2000 px genişlikte tutulur.
- Gereksiz dosya boyutu oluşturulmaz.
- Küçük detay ekran görüntüleri yalnız gerçekten yakından incelenmesi gereken alanlarda kullanılır.
- Gerçek öğrenci adı veya başka kişisel veri public screenshot'a girmez.
- Görseller README'de tekrar tekrar kullanılmaz.

## 6. GitHub uyumluluğu

README GitHub'ın standart Markdown/HTML render davranışını hedefler.

- Karmaşık CSS veya script beklenmez.
- HTML tablo yalnız görsel yan yana yerleşim gerçekten fayda sağlıyorsa kullanılır.
- Görseller repo-relative path ile çağrılır.
- Başlık hiyerarşisi erişilebilir kalır.
- Badge ve harici img kaynakları minimumda tutulur.
- İlk render'ın ağırlaşmaması için toplam görsel boyutu kontrollü tutulur.

## 7. Gizlilik

Public GitHub vitrini hiçbir gerçek öğrenci adını göstermemelidir.

Canlı veritabanı üzerinde screenshot amacıyla kalıcı değişiklik yapılmayacaktır. Gerekirse browser-only anonimleştirme kullanılır ve ardından sayfa reload edilerek gerçek runtime state geri yüklenir.

## 8. Source-of-truth ve mevcut dokümantasyon sözleşmesi

Yeni README mevcut proje sözleşmesini korumalıdır:

- değişen teknik gerçeklikte **Git HEAD source of truth**,
- yaşayan iş kuyruğu: `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md`,
- kapsamlı mimari kayıt: `CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md`.

Admin Excel runtime'ının paket içinden yerel servis edildiği ve **dış CDN'e bağımlı olmadığı** ifadesi korunacaktır.

## 9. Doğrulama

Uygulama bittikten sonra en az:

```bash
npm run test:documentation-current-state
node --test tests/internet-requirement-copy.test.js
npm run test:core
git diff --check
```

çalıştırılacaktır.

Ek olarak GitHub repo ana sayfası Chrome DevTools ile doğrudan açılıp:

- hero render,
- screenshot bağlantıları,
- badge'ler,
- heading sırası,
- tablo/görsel hizaları

kontrol edilecektir.

## 10. Başarı kriterleri

Yeni README başarılı sayılırsa:

1. GitHub repo ana sayfasının ilk ekranında ürün kimliği ve kalite algısı hemen anlaşılır.
2. Magic Park görseli ilk bakışta baskın ve etkileyicidir.
3. Teknik bilgi kaybolmadan daha aşağıda ve daha düzenli biçimde bulunur.
4. Ürün özellikleri uzun metin taramadan anlaşılır.
5. Gerçek screenshot'lar profesyonel ve anonimleştirilmiştir.
6. README mevcut documentation tests ve core suite'i bozmadan geçer.
7. GitHub üzerinde görseller hatasız render edilir.

## 11. Kapsam dışı

Bu görevde:

- Classroom UI yeniden tasarlanmaz,
- kiosk runtime davranışı değiştirilmez,
- admin davranışı değiştirilmez,
- tema sistemi refactor edilmez,
- yeni ürün özelliği eklenmez.

Yalnız GitHub vitrini ve onu destekleyen README görsel varlıkları geliştirilir.
