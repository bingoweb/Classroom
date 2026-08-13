# Sınıf Başkanı Kutusu — Geliştirme Raporu

Tarih: **13 Ağustos 2026**

## Kapsam

Magic Park `Sınıf Başkanı` kutusunun önceki koyu madalyon tasarımı kaldırılarak dış ahşap/pembe tema artwork'üyle uyumlu, açık renkli ve sade bir iç yüzey geliştirildi.

Nihai içerik sınırı:

- başkan fotoğrafı,
- başkan adı.

İkinci `Sınıf Başkanı` başlığı, taç, slogan, boş-durum mesajı, ikon ve Başkan yardımcıları bu kutuda bulunmaz.

## Mimari

Başkan kutusu box-local sahiplik kuralına geçirildi:

- `public/themes/magic-park/boxes/president/president.css`
- `public/themes/magic-park/boxes/president/president.json`
- `public/themes/magic-park/boxes/president/assets/president-stage.webp`
- `public/themes/magic-park/boxes/president/README.md`

`public/themes/magic-park/theme.css` bu paketin CSS entrypoint'ini import eder. Başkan sunumuna ait eski selectorlar `public/themes/magic-park/magic-components.css` ve generic `public/css/kiosk-magic-park.css` içinden çıkarıldı. Runtime veri sahibi `public/js/script.js` olarak kaldı.

## Görsel tasarım

- Koyu lacivert/mor yüzeyler kaldırıldı.
- GIMP MCP ile `president-stage.webp` açık krem/şeftali/pembe Magic Park diline yeniden boyandı.
- Fotoğraf, daire yerine yumuşak organik bir squircle çerçevede büyük odak öğesi olarak konumlandı.
- İsim plakası açık krem-şeftali, hafif hacimli ve sıcak kahve metinli hale getirildi.
- Başkan seçilmediğinde iç alan sessiz ve boş kalır.

## Optik hizalama düzeltmesi

İlk canlı kabulde fotoğraf ve isim grubunun sağa ve yukarı kaydığı görüldü. Sorun yalnız padding değildi:

1. `sontema-foreground.png` içindeki gerçek transparan Başkan açıklığının merkezi, Başkan kartının CSS bounding-box merkezinden farklıdır.
2. Runtime transition sistemi `.president-main` üzerine inline `translate + scale(0.975)` transformu yazıyordu ve box-local hizalamayı eziyordu.

4K alfa-mask ölçümünde Başkan açıklığının yatay ağırlık merkezi yaklaşık `x=3367–3370` bulundu; önceki kart merkez referansı yaklaşık `x=3407` idi. Dikey alfa merkezi de içerik grubunun ilk konumundan daha aşağıdaydı.

Son çözümde:

- içerik grubu gerçek artwork açıklığına göre sola kaydırıldı,
- grup kontrollü şekilde aşağı indirildi,
- fotoğraf genişliği ve isim plakası genişliği kenarlardan profesyonel nefes payı bırakacak şekilde küçültüldü,
- Başkan paketinin transformu `!important` ile runtime transition transformuna karşı source-of-truth yapıldı.

Sonuçta fotoğraf ve isim aynı optik eksende kaldı; başlığa yaslanma, sağa kayma ve dengesiz üst/alt boşluk giderildi.

## Öğrenci fotoğrafı araştırması

Proje kökü, `.artifacts/student-import-*`, `backend/uploads/` ve eski veritabanı yedeği tarandı.

`backend/uploads/` altındaki sekiz 640×640 JPG'nin hashleri eski dev fixture görselleriyle birebir eşleşti. Eski yedek veritabanı bunların şu test öğrencilerine ait olduğunu doğruladı: Defne Yılmaz, Ege Arslan, Zeynep Kaya, Mert Demir, Selin Aksoy, Elif Şahin, Arda Çelik ve Emir Can Özdemir Yıldırımoğlu. Bu görseller mevcut 30 gerçek öğrenciye atanmadı.

Gerçek öğrenci import scripti 30 öğrencinin `photo` alanını cinsiyete göre `assets/default_boy.png` / `assets/default_girl.png` yapmaktadır. Bu iki eski assette dama deseni bitmap içine gömülüdür. Başkan kutusu bu nedenle yalnız default fotoğraf yollarında temiz Magic Park 3D `student-boy.png` / `student-girl.png` fallback'ini kullanır; gerçek `/uploads/...` öğrenci fotoğrafı yüklenirse gerçek fotoğraf korunur.

## Gerçek veri kabulü

Canlı kabul için gerçek SQLite veritabanında rastgele bir öğrenci Başkan rolüne atandı ve **MAHİR GÖK (id 17)** üzerinden görünüm doğrulandı. Bu yerel veri durumu kaynak kod commit'inin parçası değildir; amaç gerçek role API/render akışıyla kabul testi yapmaktır.

## Test ve kabul

- `node --test tests/kiosk-magic-park.test.js tests/student-name-dom-safety.test.js` → **38/38 PASS**.
- `npm run test:core` → **1552/1552 PASS**.
- Chrome DevTools ile 1920×1080 ve 4K ölçeklerde canlı Başkan kutusu kontrol edildi.
- `git diff --check` temiz doğrulandı.

## Kalıcı kurallar

- Başkan kutusuna özel tüm görsel sunum `boxes/president/` altında kalır.
- Kutu içine ikinci başlık veya ek açıklama eklenmez.
- Gerçek öğrenci fotoğrafı varsa fallback ile değiştirilmez.
- Hizalama generic kart merkezine göre değil gerçek foreground açıklığına göre korunur.
- Ortak transition veya shared CSS Başkan kutusunun box-local geometrisini ezmemelidir.
