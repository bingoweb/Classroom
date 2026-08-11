# Magic Park — Clock Box

`Günün Zamanı` kutusu Magic Park'ın kutu-kutu yeniden tasarım modelinin ilk bağımsız paketidir.

## Bağlayıcı görsel yön

- Clock bir **öğretim yüzeyi**dir; tarih ve saat dekorun önündedir.
- Görsel dil Magic Park'ın çocuksu, rengarenk **storybook** dünyasıyla uyumludur; kurumsal veya karanlık HUD estetiği kullanılmaz.
- Bilgi hiyerarşisi: `saat > tarih > gün > hava > hafta sonu > dekor`.
- Okuma sırası üstten alta: **tarih → gün adı → saat → yardımcı bilgiler**.
- Gün adı mutlaka tarihin altında ve belirgin, yüksek kontrastlı bir yüzeyde görünür.
- Clock'ta **arka plan resmi, WebGL, Three.js sahnesi veya Blender modeli kullanılmaz**.
- Arka plan yalnız CSS ile üretilen canlı fakat sakin renk geçişlerinden oluşur.
- Hava yalnız sıcaklık + sade durum ikonu gösterir; veri yoksa weather kartı gizlenir ve hafta sonu kartı ortalanır.
- `#clock`, `#date`, `#day-name`, `#weekend-counter` mevcut runtime veri hook'ları olarak korunur.

## Yerleşim

- Tüm ana bilgi tek optik merkez eksenindedir.
- Saat en büyük ve en yüksek kontrastlı öğedir.
- Tarih ikinci ana bilgi olarak üstte büyük bir kapsül içinde yer alır.
- Gün adı tarihin altında ayrı, sıcak renkli bir kapsüldedir.
- Alt yardımcı sıra iki eşit karttan oluşur: hava ve hafta sonu.
- Kullanılabilir safe-zone boş bırakılmaz; ancak arka plan detayı ana bilgiyle yarışmaz.

## Palette

Dış Clock çerçevesinden ImageMagick ile örneklenen gerçek palette kullanılır:

`#0D97DD #0278CD #055BA4 #18488A #56BAE2 #FCD920 #F7A006 #C44818 #F6FAFC #D4E6EF`

Bu renkler dış shell ile birebir görsel bağ kurmak için Clock CSS tokenlarına sabitlenmiştir.

## Tipografi

Clock'a özel Baloo 2 webfontları kullanılır:

- `/fonts/baloo2-600.woff2`
- `/fonts/baloo2-800.woff2`

Lisans: `/fonts/Baloo2-OFL.txt`

## 3D politikası

Proje genelinde Blender/Three.js kullanılmaya devam eder; ancak her kutu için ayrıca karar verilir. Clock özelinde okunabilirlik 3D'den daha değerlidir ve bu kutu bilinçli olarak **2D/gradient** kalır.
