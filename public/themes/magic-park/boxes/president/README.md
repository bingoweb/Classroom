# Magic Park — Sınıf Başkanı

Bu paket `#president-container` canlı açıklığının tek görsel sahibidir.

- Panel yalnız sınıf başkanının fotoğrafını ve adını gösterir; ikinci başlık, ikon, slogan veya durum mesajı üretmez.
- Başkan yardımcıları Class TV'de kalır.
- Dış ahşap/pembe çerçeve, baykuş ve kupa ana Magic Park foreground artwork'üne aittir.
- `assets/president-stage.webp` dış kutunun açık, sıcak ve çocuksu malzeme dilini iç yüzeye taşır; koyu lacivert/mor yüzey kullanılmaz.
- Fotoğraf büyük, yüz odaklı ve organik köşeli bir oyuncak/çerçeve formunda sunulur.
- İsim açık krem-şeftali plakada, uzun adlarda güvenli sarma ve yüksek okunabilirlikle gösterilir.
- Başkan seçili değilse canlı iç alan boş kalır; ek açıklama veya placeholder gösterilmez.
- Yatay/dikey hizalama kartın kaba bounding-box merkezine göre değil, `sontema-foreground.png` içindeki gerçek transparan Başkan açıklığının optik merkezine göre yapılır. Bu nedenle box-local CSS, ortak/runtime transformların hizalamayı bozmasını `!important` ile nötralize eder.
- Veritabanındaki fotoğraf `assets/default_boy.png` / `assets/default_girl.png` ise bu iki eski fallback assetinde gömülü dama deseni bulunduğundan Başkan kutusu temiz Magic Park 3D öğrenci avatarına geçer; gerçek `/uploads/...` öğrenci fotoğrafları varsa aynen korunur.
- Kabul doğrulaması 1920×1080 ve 4K ölçeklerde gerçek rol verisiyle yapılır; fotoğraf ve isim aynı optik eksende, üst/alt nefes payları dengeli kalmalıdır.

Bu paket sunum katmanıdır; backend rol sözleşmesini değiştirmez.
