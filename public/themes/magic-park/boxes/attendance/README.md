# Magic Park — Sınıf Mevcudu Kutusu

Bu klasör, Magic Park'ın `Sınıf Mevcudu` açıklığına ait bağımsız kutu paketidir.

## Görünür bilgi sözleşmesi

Kutuda yalnız şu üç veri, bu sırayla gösterilir:

1. `SINIF MEVCUDU`
2. `KIZ ÖĞRENCİ`
3. `ERKEK ÖĞRENCİ`

Günlük yoklama ve devamsız öğrenciler merkez Class TV'nin sorumluluğundadır.

## Son görsel referans

Bağlayıcı üretim referansı:

`docs/superpowers/specs/concepts/2026-08-11-attendance-box-three-state-concept.png`

Bu görsel, canlı 30/21/9 verisiyle kaydedilen toplam, kız ve erkek sahnelerinin son üretim kompozisyonudur.

İç yüzey açık gök/mint/kremdir. Dış foreground zaten ABC/123 blokları, çiçekler ve oyuncaklar taşıdığı için kutu içine bunların kopyası eklenmez. Toplam sahnesi yalnız etiket+sayı; cinsiyet sahneleri yalnız soldaki çocuk+etiket+sayı kullanır.

## Hareket

Toplam döngü 18 saniyedir. Her sahne 6 saniye sürer; 700 ms giriş, 5200 ms'ye kadar okunabilir bekleme ve 450 ms örtüşmeli geçiş kullanılır.

Akış soldan sağadır. Kız ve erkek sahnelerinde görünme sırası `çocuk → etiket → sayı`dır. Çocuk görselleri flip edilmez ve dış çiçeklerin arkasına yerleştirilmez.

## Sahiplik

- `attendance.css`: görsel yüzey ve responsive kurallar
- `attendance.json`: sahne, süre, palette ve asset sözleşmesi
- `attendance.js`: veri sunumu, GSAP/Three.js ve tema yaşam döngüsü
- `assets/`: yalnız bu kutuya ait üretim assetleri

Yerel veritabanı, öğrenci listesi, QA ekran görüntüleri ve `.artifacts/` içerikleri bu paketin parçası olarak Git'e gönderilmez.
