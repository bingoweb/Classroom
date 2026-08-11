# Magic Park — Sınıf Mevcudu Kutusu Son Tasarımı

**Tarih:** 11–12 Ağustos 2026
**Durum:** Uygulandı ve kullanıcı tarafından kabul edildi
**Kapsam:** Yalnız Magic Park `Sınıf Mevcudu` kutusu

Bu belge, geliştirme sırasında verilen son kararları ve canlı üretim tasarımını kaydeder. Tasarım ve geliştirme kayıtları yalnız proje kökü altında tutulur.

## 1. Görünür bilgi sözleşmesi

Kutuda kesintisiz döngüyle yalnız üç sahne görünür:

1. `SINIF MEVCUDU` + toplam öğrenci sayısı
2. `KIZ ÖĞRENCİ` + kız öğrenci sayısı
3. `ERKEK ÖĞRENCİ` + erkek öğrenci sayısı

Günlük yoklama, sınıfta bulunan öğrenci sayısı, gelmeyen öğrenci sayısı ve gelmeyen öğrenci listesi bu kutudan çıkarılmıştır. Bu bilgiler merkez `Class TV` yayınında gösterilir. Class TV'deki tekrar eden `gender` programı rotasyondan çıkarılmış, `attendance` ve `absent` programları korunmuştur.

## 2. Son sanat yönü

- İç yüzey siyah değildir; dış artwork ile uyumlu açık gök mavisi, mint ve sıcak krem geçişi kullanır.
- Dış çerçevede zaten ABC/123 blokları, çiçekler ve oyuncaklar bulunduğu için iç sahneye ikinci bir dekor seti eklenmez.
- Toplam sahnesinde yalnız güçlü enamel etiket ve büyük sayı vardır.
- Kız ve erkek sahnesinde yalnız çocuk görseli, etiket ve sayı vardır.
- Çocuklar soldan görünür; yatay flip uygulanmaz ve çiçeklerin arkasına saklanmaz.
- Çocuk ile metin birbirine yakındır. Etiket ve sayı kullanılabilir alanı dolduracak ölçüde büyük, optik olarak ortalanmış ve okunaklıdır.
- Sayılar sarı/turuncu, pembe/mor ve mavi/turkuaz enamel yüzeylerle sahne türünü ayırır.

Bağlayıcı son üç-sahne görseli:

`docs/superpowers/specs/concepts/2026-08-11-attendance-box-three-state-concept.png`

## 3. Sahne koreografisi

Toplam döngü 18 saniyedir; her sahne 6 saniye görünür.

- Sahne soldan girer ve sağa çıkar.
- Geçiş sırasında boş yüzey oluşmaz.
- Toplam sahnesinde etiket, ardından sayı yerleşir.
- Kız ve erkek sahnesinde sıra kesin olarak `çocuk → etiket → sayı`dır.
- Çocuk soldan doğal bir çıkış hareketiyle görünür.
- Ana okuma süresinde sayı sabit kalır; sürekli titreşim veya dönme kullanılmaz.
- `prefers-reduced-motion` durumunda veri görünür kalır ve derin hareketler kapanır.

## 4. Dış artwork ve katman ilişkisi

Kutunun DOM içeriği, Magic Park'ın ortak foreground artwork katmanının arkasında yer alır. Bu nedenle çocuk, sayı ve etiket kutunun kullanılabilir iç açıklığında konumlandırılır; dış bloklar, raf ve çiçekler foreground olarak önde kalır. İç içerik dış dekoru tekrar etmez.

## 5. Bağımsız kutu paketi

```text
public/themes/magic-park/boxes/attendance/
├── README.md
├── attendance.css
├── attendance.json
├── attendance.js
└── assets/
    ├── attendance-boy.png
    └── attendance-girl.png
```

- `attendance.css`: yalnız bu kutunun görsel sahibi
- `attendance.json`: sahne sırası, süre, hareket yönü, renkler ve asset sözleşmesi
- `attendance.js`: veri modeli, sahne rotasyonu, GSAP geçişleri, Three.js derinlik ve yaşam döngüsü
- `assets/`: kutuya özel yüksek çözünürlüklü RGBA çocuk görselleri

Shared Magic Park CSS dosyalarındaki eski attendance görünüm kuralları kaldırılmıştır. `theme.css`, kutunun kendi CSS giriş noktasını import eder.

## 6. Veri akışı

- `/api/stats` kaynak gerçekliktir.
- `script.js`, kararlı `#total-students`, `#girl-students`, `#boy-students` düğümlerini günceller ve `classroom:stats-updated` olayı yayımlar.
- `attendance.js` verinin sahibi değildir; yalnız sunum katmanını günceller.
- Magic Park dışındaki temaların eski attendance yüzeyi korunur.
- JSON veya WebGL yüklenemezse DOM/CSS fallback aynı üç değeri göstermeye devam eder.

## 7. 3D kullanımı

Three.js kutu içinde yeni oyuncak üretmek için kullanılmaz. Yalnız düşük opaklıklı, dikkat çekmeyen düzlemsel derinlik katmanı sağlar. Sayı, etiket ve çocuklar okunabilir DOM/PNG katmanlarında kalır. Tema değişiminde renderer, RAF, observer ve GPU kaynakları temizlenir.

## 8. Gerçek öğrenci verisi geçişi

12 Ağustos 2026 tarihinde yerel Excel listesindeki 30 öğrenci (21 kız, 9 erkek) doğrulanarak SQLite veritabanına aktarıldı. 8 örnek öğrenci ile onlara bağlı 10 görev ve 8 yoklama kaydı transaction içinde temizlendi.

Gizlilik sözleşmesi:

- `backend/classroom.db` Git tarafından izlenmez.
- `.artifacts/` altındaki veritabanı yedeği ve QA dosyaları Git tarafından izlenmez.
- Gerçek öğrenci adları geliştirme belgesine veya commit mesajına yazılmaz.
- Push yalnız uygulama kodunu, güvenli belgeleri ve üretim assetlerini içerir.

## 9. Kabul kaydı

- Canlı veri: `30 / 21 / 9`
- Görsel kontrol: 3840×2160 ve 1920×1080, üç sahne
- Otomatik testler: kullanıcının 12 Ağustos 2026 tarihli açık talebiyle bu push için atlandı; kullanıcı kendi test kabulünü verdi.
- Kırpma, boş frame, içerik/foreground katman çakışması veya siyah arka plan kullanılmaz.

## 10. Kapsam dışı

- Ders Akışı ve diğer Magic Park kutularının yeniden tasarımı
- merkez Class TV'nin genel görsel yeniden tasarımı
- backend istatistik sözleşmesinin değiştirilmesi
- Garden/Science temalarının yeniden tasarımı
