# GitHub Showcase Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classroom GitHub README'sini gerçek ürün görüntülerini merkez alan, ilk ekranda güçlü kalite algısı veren ve teknik ayrıntıyı aşağı doğru kademeli açan premium bir ürün landing page'ine dönüştürmek.

**Architecture:** README yalnız GitHub'ın standart Markdown/HTML yeteneklerini kullanacak. Görsel vitrin `docs/images/` altındaki anonimleştirilmiş WebP assetleriyle sağlanacak; ürün/runtime koduna dokunulmayacak. Mevcut documentation source-of-truth ve local-first metin sözleşmeleri korunacak.

**Tech Stack:** GitHub Markdown/HTML, gerçek Classroom browser screenshot'ları, GIMP MCP, ImageMagick geliştirme CLI'sı, DevSpace, Chrome DevTools MCP, Node test suite.

## Global Constraints

- Yalnız GitHub vitrini ve README görsel assetleri değiştirilecek; Classroom UI/runtime davranışı değişmeyecek.
- Hero ve spotlight'lar gerçek çalışan Classroom ekranından üretilecek; yapay ürün mockup'ı kullanılmayacak.
- Public görsellerde gerçek öğrenci adı bulunmayacak.
- Görsel üretim GIMP MCP ile doğrulanacak; projeye alınan binary assetler yalnız DevSpace source-of-truth akışıyla yerleştirilecek.
- README karmaşık CSS/JavaScript beklemeyecek; GitHub Markdown/HTML render'ı hedeflenecek.
- Değişen teknik gerçeklikte `Git HEAD` source of truth olmaya devam edecek.
- Yaşayan iş kuyruğu `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md` olarak korunacak.
- Admin Excel runtime'ının yerel servis edildiği ve `dış CDN'e bağımlı değildir` ifadesi korunacak.
- Mevcut unrelated dirty checkout dosyaları stage/commit edilmeyecek.

---

### Task 1: Premium GitHub showcase görselleri

**Files:**
- Create: `docs/images/github-showcase-hero.webp`
- Create: `docs/images/github-showcase-top-controls.webp`
- Create: `docs/images/github-showcase-president.webp`
- Create: `docs/images/github-showcase-class-tv.webp`
- Create: `docs/images/github-showcase-architecture.webp`
- Remove after migration: `docs/images/magic-park-overview.webp`
- Remove after migration: `docs/images/magic-park-top-panels.webp`
- Remove after migration: `docs/images/magic-park-president.webp`

**Interfaces:**
- Consumes: çalışan `http://localhost:3000/` Magic Park görünümü ve mevcut anonimleştirilmiş README screenshot'ları.
- Produces: README'nin hero ve spotlight bölümlerinin kullanacağı beş optimize WebP asseti.

- [ ] **Step 1: Browser state'i 1920×1080 ve anonim örnek başkan ile hazırla**

Chrome DevTools'ta gerçek sayfayı aç; yalnız screenshot anında DOM'daki başkan adını `ÖRNEK ÖĞRENCİ` yap. Veritabanına yazma. Ana görünümü `/tmp/classroom-showcase-source.webp` olarak kaydet.

- [ ] **Step 2: Hero kompozisyonunu üret**

GIMP MCP ile gerçek screenshot'ı aç. 1920×900 civarı açık krem/çok açık sıcak nötr bir canvas üzerinde:

1. tam Magic Park görünümünü ana büyük panel olarak,
2. sağ/alt tarafta Ses Konsolu ve Başkan detayından iki küçük gerçek crop'u,
3. ince beyaz/soft shadow ayrımlarını

kullan. Banner içinde ek slogan/metin yazma; README başlığı metin hiyerarşisini taşıyacak. Export: `/tmp/github-showcase-hero.webp`, quality 88–92.

- [ ] **Step 3: Spotlight crop'larını üret**

Gerçek source screenshot'tan şu net crop'ları çıkar:

```text
github-showcase-top-controls.webp  -> Günün Zamanı + Sınıfın Ses Dengesi
github-showcase-president.webp     -> Sınıf Başkanı kutusu, ÖRNEK ÖĞRENCİ
github-showcase-class-tv.webp      -> merkez Sınıfımızdan / Class TV + Ders Akışı bağlamı
```

Her asset 900–1600 px genişlikte, gereksiz boşluk olmadan, WebP quality 86–92 olacaktır.

- [ ] **Step 4: Mimari diyagramı üret**

GIMP'te 1600×760 açık nötr canvas oluştur. Diyagram içeriği:

```text
Magic Park Theme
      │
      ├── attendance/  → CSS + JSON + JS + assets
      ├── lesson-flow/ → CSS + JSON + JS + physics + assets
      ├── noise-meter/ → CSS + JSON + assets + shared runtime owner
      └── president/   → CSS + JSON + assets + shared runtime owner

Shared foundation: theme.css / magic-layout.css / magic-components.css
Rule: box-specific presentation stays inside its package
```

Renkler Magic Park'tan alınmalı ancak diyagram okunaklı, sakin ve teknik görünmelidir. Export: `/tmp/github-showcase-architecture.webp`.

- [ ] **Step 5: Görselleri projeye DevSpace üzerinden al ve doğrula**

DevSpace içinde binaryleri `docs/images/` altına kopyala; ImageMagick ile dimension/format/size doğrula. Toplam yeni showcase görsel bütçesi yaklaşık 1.5 MB altında hedeflenecek.

- [ ] **Step 6: GIMP snapshot kalite kontrolü**

Hero ve architecture assetlerini GIMP MCP ile açıp `get_state_snapshot` ile son kez incele. Gerçek öğrenci adı, browser chrome, kesik başlık veya düşük kontrast bulunmamalı.

---

### Task 2: README'yi premium landing page akışına yeniden kur

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1'de üretilen beş `github-showcase-*.webp` asseti.
- Produces: GitHub repo ana sayfasının yeni ürün vitrini.

- [ ] **Step 1: Hero bölümünü yeniden kur**

README başlangıcı şu sırayı kullanacak:

```markdown
# Classroom — 2/D Sihirli Pano

<p align="center">
  <strong>Gerçek sınıf için tasarlanmış 4K Magic Park kiosku ve güvenli öğretmen yönetim sistemi.</strong><br>
  Canlı ders akışı · ses dengesi · sınıf rolleri · medya yayını · local-first çalışma modeli
</p>

<p align="center">...</p> <!-- 5 badge -->

<p align="center">
  <img src="docs/images/github-showcase-hero.webp" ...>
</p>
```

Hero'dan hemen sonra iki kısa paragraf ve privacy notu bulunacak; uzun teknik açıklama ilk viewport'a girmeyecek.

- [ ] **Step 2: `Neden Classroom?` bölümünü altı feature card ile kur**

GitHub uyumlu iki sütunlu `<table>` kullan. Kart başlıkları:

```text
🖥️ Gerçek 4K sınıf kiosku
🎡 Paketlenmiş Magic Park kutuları
⏱️ Gerçek zamanlı Ders Akışı
🎚️ Otomatik Ses Dengesi
🧑‍🏫 Sınıf rolleri ve yayın
🔐 Güvenli local-first yönetim
```

Her kart 1–2 kısa cümle olacak; teknik implementasyon detayına girmeyecek.

- [ ] **Step 3: `Magic Park spotlight` bölümünü görsellerle kur**

Üç spotlight alt başlığı:

```text
### Günün Zamanı + Sihirli Ses Konsolu
### Sınıf Başkanı
### Class TV + Ders Akışı
```

İlk ve üçüncü görsel geniş, Başkan görseli daha dar/yan yana düzen kullanılabilir. Her bölümün altında en fazla 3 kısa ürün odaklı madde bulunacak.

- [ ] **Step 4: Sekiz canlı sınıf aracını kompaktlaştır**

İki sütunlu tabloyu koru fakat açıklamaları 8–18 kelime civarında tut. Başkan satırı yalnız fotoğraf + isim davranışını söyleyecek; yardımcıların Class TV'ye ait olduğu belirtilecek.

- [ ] **Step 5: Kutu mimarisini görsel + kısa teknik sözleşme olarak sun**

`github-showcase-architecture.webp` geniş görsel olarak gösterilecek. Altında yalnız şu teknik fikirler kalacak:

```text
- her geliştirilen kutu kendi CSS/JSON sahipliğine sahiptir,
- gerekliyse JS/assets de aynı pakette yaşar,
- ortak CSS foundation sağlar, box-specific presentation taşımaz,
- foreground alpha açıklığı ile canlı DOM ayrı katmanlardır.
```

- [ ] **Step 6: Admin, teknoloji ve kurulum bölümlerini sıkıştır**

Admin'i dört kısa görev kartıyla anlat. Teknoloji tablosunu koru. Kurulumu üç adımda ver:

```bash
npm ci
export CLASSROOM_ADMIN_PASSWORD='guclu-bir-parola'
npm start
```

Local SheetJS için tam cümle korunacak: `Admin Excel çalışma zamanı SheetJS paketinden yerel olarak servis edilir; dış CDN'e bağımlı değildir.`

- [ ] **Step 7: Test/güvenlik/belgeler kapanışını kur**

`test:core`, GitHub Actions Node 22/24, CSRF/session/rate-limit güvenlik özeti ve source-of-truth zinciri sayfanın altında kalacak. `Git HEAD`, `Önceliklendirilmiş Düzeltme Planı` ve tomografi dosya adı birebir bulunacak.

---

### Task 3: README sözleşme ve görsel regresyon doğrulaması

**Files:**
- Test: `tests/documentation-current-state.test.js`
- Test: `tests/internet-requirement-copy.test.js`
- Verify: `README.md`
- Verify: `docs/images/github-showcase-*.webp`

**Interfaces:**
- Consumes: tamamlanmış README ve görsel set.
- Produces: mevcut repo sözleşmelerini bozmayan doğrulanmış GitHub vitrini.

- [ ] **Step 1: Yerel link/image referanslarını doğrula**

README içindeki `docs/...`, `AI_PROJECT_CONTEXT.md` ve tomografi referanslarının tamamı mevcut olmalı. `magic-park-overview.webp`, `magic-park-top-panels.webp`, `magic-park-president.webp` eski referansları kalmamalı.

- [ ] **Step 2: Documentation ve local-first testlerini çalıştır**

```bash
npm run test:documentation-current-state
node --test tests/internet-requirement-copy.test.js
```

Expected: PASS.

- [ ] **Step 3: Tüm core suite'i çalıştır**

```bash
npm run test:core
```

Expected: 0 fail.

- [ ] **Step 4: Diff kalite kontrolü**

```bash
git diff --check
git status --short
```

Stage'e yalnız README, yeni showcase assetleri, bu plan ve gerekiyorsa eski README görsellerinin silinmesi girmeli. Önceden dirty olan toolchain/noise experiment dosyaları dışarıda kalmalı.

---

### Task 4: GitHub render kabulü ve teslim

**Files:**
- Git: `README.md`, `docs/images/github-showcase-*.webp`, plan/spec belgeleri

**Interfaces:**
- Consumes: Task 3'te test edilmiş README.
- Produces: `main` üzerinde GitHub'da canlı render edilen premium showcase.

- [ ] **Step 1: README showcase değişikliklerini commit et**

```bash
git commit -m "docs(readme): build premium Classroom showcase"
```

- [ ] **Step 2: `main` dalını origin'e push et**

Push sonrası `HEAD` ve `origin/main` hashleri eşit olmalı.

- [ ] **Step 3: GitHub repo ana sayfasını Chrome DevTools ile yenile**

Şunları doğrudan doğrula:

- hero image HTTP/render başarılı,
- feature table dengeli,
- üç spotlight görseli yüklenmiş,
- architecture görseli okunabilir,
- badge'ler tek satır/uygun wrap,
- heading sırası doğru,
- public görünümde gerçek öğrenci adı yok.

- [ ] **Step 4: GitHub Actions durumunu kontrol et**

Commit status hemen sonuçlanmadıysa bunu yalnız `pending` olarak raporla; yerel test sonucunu CI sonucuymuş gibi sunma.

## Self-Review

- Spec coverage: hero, altı feature spotlight, üç Magic Park spotlight, sekiz araç, box architecture, admin, teknoloji, kurulum, test/güvenlik/belgeler ve gizlilik ayrı tasklarda kapsanıyor.
- Placeholder scan: `TBD`, `TODO`, `implement later` veya belirsiz implementasyon adımı yok.
- Source-of-truth compatibility: README'de `Git HEAD`, yaşayan plan, tomografi ve local SheetJS sözleşmeleri özellikle korunuyor.
- Scope: uygulama/runtime dosyalarına değişiklik planlanmıyor.
