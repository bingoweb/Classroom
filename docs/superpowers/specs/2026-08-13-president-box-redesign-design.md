# Magic Park Sınıf Başkanı Kutusu — Yeniden Tasarım Spesifikasyonu

## Amaç

Magic Park temasındaki mevcut `Sınıf Başkanı` kutusunun canlı iç alanını, dış artwork ile aynı tasarım ailesine ait hissedecek şekilde baştan tasarlamak. Kutunun kendi üst başlığı mevcut tema artwork'ünde zaten bulunduğu için canlı içerikte ikinci bir başlık oluşturulmayacak.

## İçerik Sınırı

Canlı Başkan alanında yalnızca iki içerik öğesi bulunacak:

1. Sınıf başkanının fotoğrafı.
2. Sınıf başkanının adı.

Taç, rozet, açıklama, durum metni, “liderlik köşesi”, yardımcı metin, ekstra etiket veya ikinci başlık gösterilmeyecek. Başkan yardımcıları bu kutuya geri getirilmeyecek; mevcut Class TV sahipliği korunacak.

## Görsel Yön

Tasarım dış kutunun ahşap, pembe ve oyuncakmsı Magic Park dilini tekrar etmeyecek kadar sade; fakat onunla aynı ailede görünecek kadar uyumlu olacak.

- Koyu lacivert, siyah, koyu mor ve ağır karanlık zeminler kullanılmayacak.
- Ana zemin açık krem / sıcak fildişi / çok açık şeftali aralığında olacak.
- Dış kutudaki pembe-şeftali malzeme dilinden ince kenar veya vurgu alınabilir.
- Az miktarda mint/turkuaz ve sıcak sarı yalnız vurgu olarak kullanılabilir.
- İç alan bağımsız bir poster veya ikinci bir çerçeveli pano gibi görünmeyecek.
- Dekorasyon fotoğrafla yarışmayacak; başkan fotoğrafı açıkça odak noktası olacak.
- Gölge ve derinlik yalnız okunabilirlik ve hafif oyuncak/plastik hacim hissi için kullanılacak; ağır gölge yok.

## Kompozisyon

### Fotoğraf

- Fotoğraf canlı alanın yaklaşık üst `%68–72` bölümünü kullanacak.
- Fotoğraf mümkün olduğunca büyük ve yüz odaklı gösterilecek.
- Çerçeve düz bir daire olmayacak.
- Dış kutunun yumuşak, oyuncakmsı geometrisini çağrıştıran sade ve hafif organik bir form kullanılacak.
- Fotoğrafın mevcut `faceFocus` davranışı korunacak.
- Gerçek öğrenci fotoğrafı yoksa mevcut cinsiyet bazlı fallback davranışı korunacak; fallback görsel dış kutuyla çelişen bir yüzey göstermemeli.

### İsim plakası

- Fotoğrafın hemen altında tek isim plakası olacak.
- Açık krem veya çok açık sıcak renkte olacak.
- İnce pembe/şeftali kontur kullanılabilir.
- Çok hafif 3D yükseltilmiş oyuncak/plastik malzeme hissi verecek.
- Yazı sıcak kahve / mercan-kahve ailesinde yüksek kontrastlı olacak; siyah veya çok koyu lacivert olmayacak.
- Uzun isimler güvenli şekilde en fazla iki satıra sarılacak.
- Okunabilirlik için kontrollü font smoothing, hafif text-stroke ve katmanlı ama yumuşak gölge kullanılacak.

## Boş Durum

Başkan seçilmemişken canlı alanın içine taç, mesaj veya ayrı bir boş-durum kartı çizilmeyecek. Başkan verisi gelmediğinde kutunun iç yüzeyi sakin ve boş kalacak; yalnız dış artwork'ün mevcut `Sınıf Başkanı` başlığı görünmeye devam edecek.

## Mimari Sahiplik

Başkan kutusu mevcut box-local mimariyi koruyacak:

- `public/themes/magic-park/boxes/president/president.css`: Başkan kutusunun tüm sunum/geometri sahipliği.
- `public/themes/magic-park/boxes/president/president.json`: Başkan kutusu manifesti ve görsel dil tanımı.
- `public/themes/magic-park/boxes/president/assets/`: yalnız bu kutuya ait gerekli raster assetler.
- `public/js/script.js`: mevcut rol verisi ve render lifecycle sahibi olmaya devam eder; gereksiz yeni runtime katmanı eklenmez.

Başkana özel selector veya görsel kural `magic-components.css` ya da generic `kiosk-magic-park.css` içine geri taşınmayacak.

## Teknik ve Görsel Kabul Kriterleri

- İçeride yalnız fotoğraf + isim bulunur.
- İkinci `Sınıf Başkanı` başlığı yoktur.
- Koyu renkli ana yüzey yoktur.
- Fotoğraf alanı kompozisyonun ana odağıdır ve kutuyu etkin kullanır.
- İsim uzun olduğunda taşma/kırpılma olmaz.
- 1920×1080 ve 3840×2160 ölçekte kutu dış artwork ile hizalı ve dengeli görünür.
- Başkan seçilmediğinde ekstra mesaj/ikon görünmez.
- `prefers-reduced-motion` davranışı korunur; gereksiz animasyon eklenmez.
- Başkan yardımcıları kutuya geri dönmez.
- `president.css` + `president.json` box-local sahipliği regression testleriyle korunur.
- Magic Park ve core testleri regresyonsuz geçer.
- Browser console ve ilgili asset network isteklerinde kritik hata oluşmaz.

## Kapsam Dışı

- Dış `sontema` artwork'ünü yeniden çizmek.
- `Sınıf Başkanı` dış başlığını değiştirmek.
- Başkan yardımcılarını bu kutuya taşımak.
- Yeni bir genel rol sistemi tasarlamak.
- Diğer Magic Park kutularının görsel tasarımını değiştirmek.

## 13 Ağustos 2026 — Uygulama ve Kabul Sonucu

Onaylanan sade/açık tasarım uygulandı ve Başkan kutusu `public/themes/magic-park/boxes/president/` altında bağımsız paket olarak tamamlandı.

### Gerçekleşen tasarım

- Canlı alanda yalnız başkan fotoğrafı ve adı render edilir.
- İkinci başlık, taç, slogan, durum mesajı ve Başkan yardımcısı markup'ı yoktur.
- Koyu lacivert/mor madalyon tasarımı tamamen kaldırıldı; iç yüzey açık krem, şeftali ve çok hafif pembe/mint/sarı vurgu ailesine geçirildi.
- `assets/president-stage.webp` GIMP MCP ile açık Magic Park malzeme diline yeniden boyandı.
- Fotoğraf çerçevesi dairesel madalyon yerine organik squircle formuna, isim ise açık krem-şeftali oyuncak/plastik plakaya dönüştürüldü.

### Optik hizalama bulgusu

Canlı kabul sırasında Başkan kartının CSS bounding-box merkezi ile baked foreground içindeki gerçek transparan açıklığın merkezi aynı olmadığı ölçüldü. 4K kaynak maskesinde Başkan açıklığının alfa ağırlık merkezi yaklaşık `x=3367–3370`, eski kart merkez referansı ise yaklaşık `x=3407` idi. Bu fark 1080p'de gözle görünür sağa kayma üretiyordu.

Bu nedenle `president.css` içeriği:

- yatayda gerçek açıklığa doğru sola optik offset uygular,
- dikeyde fotoğraf+isim grubunu aşağı alarak üst/alt nefes payını dengeler,
- runtime'ın `.president-main` üzerine yazdığı transition `transform` değerinin bu hizalamayı ezmesini `transform: ... !important` ile önler.

Son canlı doğrulamada fotoğraf ve isim aynı optik eksende kalmış, başlığa yaslanma ve sağa kaçma giderilmiştir.

### Öğrenci fotoğrafı / fallback bulgusu

Proje kökü ve import artefaktları tarandığında mevcut 30 gerçek öğrenciye ait yüklenmiş bireysel fotoğraf bulunmadı. `backend/uploads/` altındaki sekiz JPG'nin hashleri eski `dev-fixtures` test öğrencileriyle birebir eşleşmektedir; bu görseller gerçek öğrencilere yanlış atanmadı.

Mevcut gerçek öğrenci importu fotoğraf alanlarını `assets/default_boy.png` / `assets/default_girl.png` ile dolduruyor. Bu eski default assetlerde dama deseni görselin içine gömülü olduğundan Başkan renderı yalnız bu default yollar için temiz Magic Park 3D kız/erkek avatarına geçer. Gerçek `/uploads/...` fotoğraf yolu geldiğinde gerçek fotoğraf kullanılmaya devam eder.

### Doğrulama

- Başkan/Magic Park + DOM safety hedef paketi: `38/38 PASS`.
- `npm run test:core`: `1552/1552 PASS`.
- Browser kabulü: 1920×1080 ve 4K görünümde gerçek veritabanı Başkan rolüyle kontrol edildi.
- `git diff --check`: temiz.
