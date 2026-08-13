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
