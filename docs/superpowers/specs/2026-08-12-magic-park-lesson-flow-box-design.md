# Magic Park — Ders Akışı Kutusu Tasarımı

**Tarih:** 12 Ağustos 2026
**Durum:** Revizyon 9 uygulandı; gerçek boyutlu kabul tamamlandı
**Kapsam:** Yalnız Magic Park `Ders Akışı` kutusu
**Tasarım adı:** Sihirli Su Saati

Bu belge, Magic Park dış artwork'ünün sol alt açıklığında çalışan Ders Akışı kutusunun bağlayıcı tasarım ve mimari sözleşmesidir. Tasarım ve geliştirme kayıtları yalnız proje kökü altında tutulur.

## 0. Revizyon 2 — gerçek sıvı ve optik cam

İlk uygulamanın canlı önizlemesi üç kök sorun gösterdi:

1. Bilgi alanı `--lesson-flow-ink` renginin `%78` opak karışımını kullanıyor ve `backdrop-filter` uygulamıyordu. Sonuç cam değil, suyu kapatan mor bloktu.
2. Sayaç çok renkli enamel gradyan ve ağır gölge kullanıyordu. Su malzemesinden ayrı, plastik bir nesne gibi görünüyordu.
3. Su yüzeyi yalnız üç sinüs dalgasıyla vertex oynatıyor; kabarcıklar yaklaşık bir pikselin altında ve toplam opaklıkları düşüktü. Basınç, viskozite, yüzey gerilimi, çarpışma veya gerçek kaldırma kuvveti yoktu.

Revizyon 2 bağlayıcı kararları:

- Analitik sinüs tabanlı su ana simülasyon olmaktan çıkarılır.
- Su hareketi Google LiquidFun modelinin TypeScript portu `@box2d/particles` ile gerçek parçacık basıncı, viskozite, yerçekimi, çarpışma ve yüzey gerilimi üzerinden hesaplanır.
- Fizik parçacıkları tek tek nokta veya yoğunluk satırı olarak gösterilmez. LiquidFun hacim/akıntı fiziğine 128 örnekli sönümlü sığ-su yüzeyi eşlik eder; Three.js profilin altını tek parça saydam hacim, derinlik tonu, mikro-normal kırılması, menisküs, caustic ve yalnız eğimli tepelerde ince köpük olarak çizer.
- İlerleme yüzdesi hedef sıvı hacmidir. Simülasyon hedef parçacık sayısına kontrollü giriş/çıkış yapar; yüzey gerçek fizik çözümünün sonucudur.
- Gaz kabarcıkları su parçacığından ayrıdır fakat fiziksel su alanını örnekler. Kaldırma kuvveti, sıvı sürüklemesi, yatay akıntı ve yüzeyde patlama döngüsü kullanır; yeterli çap ve parlak kenarla açıkça görünür.
- Mevcut ve sıradaki ders alanlarında opak renk dolgusu yasaktır. Cam yüzey `rgba(..., 0.04–0.12)`, ince beyaz kenar, `backdrop-filter`, iç kırılma parıltısı ve çok hafif gölge kullanır; su kütlesinin en az `%88`i optik olarak görünür kalır.
- Sayaçta mor/altın dolgu gradyanı yasaktır. Suyun dışında koyu erik, suyun içinde kırık beyaz kullanılır; okunaklılık ince karşıt kontur ve sınırlı gölgeyle sağlanır.
- WebGL veya parçacık fiziği yüklenemezse bilgi kaybı olmaz; CSS su yüksekliği fallback olarak kalır fakat normal çalışma yolu fizik motorudur.

## 1. Amaç

Ders Akışı kutusu, sınıftaki bir çocuğun tek bakışta şu iki soruyu cevaplamasını sağlar:

1. Şu anda hangi okul durumundayız?
2. Bir sonraki değişime ne kadar kaldı?

Kutu küçük bir ders programı tablosu değildir. Önceliği büyük süre, kısa durum metni ve geçen süreyi doğrudan anlatan su yüksekliğidir. Okunabilirlik, dış artwork ile görsel bütünlük ve çocuksu hareket aynı anda korunur.

## 2. Tasarım ilkeleri

- İç yüzey siyah veya karanlık olmayacak; mor, lila, turkuaz, mint ve sıcak sarı pastel yüzeyler kullanılacak.
- Dış artwork'te masa lambası, kitaplar, çanta ve geometrik süsler bulunduğu için içeride oyuncak, ABC/123, boncuk veya ikinci bir dekor seti olmayacak.
- Ana odak her zaman ders/teneffüs sıra numarası ve saniyelik büyük geri sayım olacak.
- Metinler kısa, yüksek kontrastlı ve ilkokul seviyesinde tek bakışta okunabilir olacak.
- Sahne değişimleri soldan sağa akacak; sürekli zaman hareketi aşağıdan yukarı dolan suyla anlatılacak.
- Sürekli hareket; shader suyu ve küçük kabarcıklarla sınırlı olacak. Metin ve sayı ana okuma süresinde sabit kalacak.
- Ayrı ilerleme çubuğu, ray, gezgin küre veya hedef işareti kullanılmayacak; suyun seviyesi tek görsel zaman ölçeri olacak.
- Su bir metin bölgesine ulaştığında ilgili yazı otomatik olarak açık enamel renge dönecek; okunaklılık dolumun hiçbir anında kaybolmayacak.
- Her durumda kullanılabilir açıklık optik olarak ortalanmış ve dolu hissedilecek; gereksiz boşluk bırakılmayacak.

## 3. Görünür durum sözleşmesi

### 3.1 Ders başlamadan önce — `before-school`

- Üst mesaj: `DERS BAŞLIYOR`
- Ana değer: derse kalan büyük süre
- Yardımcı bilgi: başlangıç saati, örneğin `09:00'DA`
- Zaman yolu: solda başlangıç noktası, sağda okul zili hedefi
- Büyük dekor görseli kullanılmaz; gerekirse yalnız tek küçük saat simgesi hedef noktasında görünür.

### 3.2 Ders sırasında — `in-class`

- Üst başlık: sıra numarasıyla örneğin `2. DERS`
- Süre etiketi: `TENEFFÜSE KALAN`
- Ana değer: büyük geri sayım
- Bağlam: mevcut ders/dönem adı
- Doğrulanmış veritabanı programı varsa sıradaki ders küçük ikincil bilgi olarak gösterilir.
- Zaman yolu: ders ilerlemesini soldan sağa doldurur.

### 3.3 Teneffüs sırasında — `in-break`

- Üst başlık: sıra numarasıyla örneğin `1. TENEFFÜS`
- Süre etiketi: `DERSE KALAN`
- Ana değer: büyük geri sayım
- Bağlam: mevcut teneffüs adı
- Doğrulanmış program varsa sıradaki ders görünür.
- Zaman yolu mint/turkuaz renge geçer ve soldan sağa ilerler.

### 3.4 Okuldan sonra — `after-school`

- Ana mesaj: `YARIN GÖRÜŞÜRÜZ`
- İkincil mesaj: güne göre mevcut kısa kapanış cümlesi
- Geri sayım gösterilmez; dekoratif bir ilerleme bileşeni eklenmez.
- Sıcak krem/sarı yüzey ve tek küçük anlamsal kapanış simgesi kullanılabilir.

### 3.5 Hafta sonu — `weekend`

- Ana mesaj: mevcut hafta sonu mesajı
- İkincil mesaj: mevcut kısa dinlenme cümlesi
- Geri sayım gösterilmez.
- Lila–gün doğumu yüzeyi kullanılır; sahne sakin kalır.

### 3.6 Program hatası — `error`

- Ana mesaj: `PROGRAM BEKLENİYOR`
- İkincil mesaj: `Ders bilgisi hazırlanıyor`
- `--:--` gibi arıza hissi veren büyük bir değer ana odak yapılmaz.
- 3D su hareketi durur; kutu güvenli, okunaklı bir fallback yüzeyinde kalır.

## 4. Yerleşim

Ders Akışı açıklığı 1920×1080 görünümde yaklaşık `365 × 236 px`; 3840×2160 görünümde bunun iki katıdır. İç kompozisyon bu gerçek hedef boyut üzerinden kurulacaktır.

Yukarıdan aşağıya temel hiyerarşi:

1. Durum başlığı — kullanılabilir yüksekliğin yaklaşık `%18`i
2. Büyük geri sayım veya kapanış mesajı — yaklaşık `%44`
3. Mevcut/sıradaki bağlam — yaklaşık `%20`
4. Mevcut/sıradaki bilgi plakaları — yaklaşık `%26`

Yatay düzen tek odaklıdır. İki eşit büyük kart kullanılmaz; küçük açıklıkta metni küçülten bölünmüş pano yaklaşımından kaçınılır. Dış foreground artwork içerik katmanının önünde kalır; tüm okunabilir içerik güvenli açıklık içinde tutulur.

## 5. Sanat yönü

### 5.1 Renk ailesi

- Ders: açık lila → mor, turkuaz vurgu
- Teneffüs: mint → açık turkuaz, mor metin
- Ders öncesi: gök mavisi → lila, sıcak sarı hedef
- Gün sonu: krem → şeftali → açık lila
- Hata/fallback: nötr açık krem → soluk lila

Rakamlar koyu erik/mor mürekkep üzerinde açık enamel parlaklığıyla gösterilir. Kontrast yalnız gölgeye bırakılmaz; metin ve zemin renkleri doğrudan ayrışır.

### 5.2 Tipografi

- Ana rakam: `Fredoka Classroom`, kalın, tabular numerals
- Başlık ve ders adı: `Fredoka Classroom`
- Yardımcı metin: `Nunito Classroom`
- Ana geri sayım 1080p hedefte yaklaşık `48–64 px` görsel yüksekliğe ulaşır.
- Satırlar en fazla iki satır olur; uzun ders adları kontrollü küçültülür, kırpılmaz.

### 5.3 Dekor sınırı

İç sahneye oyuncak, harf, boncuk, kitap, çanta veya çiçek eklenmez. Çocuksuluk; renk, yuvarlatılmış enamel yüzey, su hareketi ve geçiş koreografisinden gelir. Geri sayım olmayan sahnelerde yalnız bir küçük anlamsal ikon kullanılabilir.

## 6. Hareket ve 3D koreografisi

### 6.1 Normal güncelleme ve gerçek zaman

- Su yüzeyi mevcut durumun ilerlemesini aşağıdan yukarıya gösterir.
- Sayaç her gerçek saniyede `MM:SS`, bir saati aşan sürelerde `H:MM:SS` biçiminde güncellenir.
- Ders ve teneffüs ilerleme yüzdesi saniye hassasiyetindedir; dakika sınırında sıçrama yapmaz.
- Dakika hanesi değiştiğinde rakam kısa bir `yukarı yerleşme + enamel parlaması` yapar; her saniye bütün sahne yeniden animasyona girmez.

### 6.2 Hassas su dolumu

- Kutunun okunabilir açıklığı, durumun kesin ilerleme oranıyla aşağıdan yukarıya dolar.
- Three.js yalnız WebGL taşıyıcısıdır; yüzey hazır efekt yerine özel GLSL `ShaderMaterial` ile üretilir.
- Çok frekanslı dalga, derinlik gradyanı, hareketli ışık kırılmaları ve ince köpük çizgisi gerçekçi su yüzeyini oluşturur.
- 72 adet küçük instanced kabarcık, su yüksekliği içinde farklı hız ve salınımla gazoz gibi yükselir.
- CSS yüzeyi aynı yüzdeyi fallback olarak uygular; WebGL kaybında ilerleme bilgisi kaybolmaz.
- Okuma bölgeleri için eşikler `context 24`, `primary 50`, `kicker 74`, `title 90` yüzdedir. Su eşikten geçtiğinde yalnız ilgili bölgenin kontrast sınıfı değişir.

### 6.3 Durum değişimi

Sıra kesin olarak şöyledir:

1. Eski durum metni hafifçe sola ve geriye çekilir.
2. Derinlik yüzeyi soldan sağa sığ bir 3D geçiş yapar.
3. Yeni başlık görünür.
4. Büyük sayı/mesaj yerleşir.
5. Bağlam bilgisi açılır.
6. Su yeni durum rengiyle kesin ilerleme yüksekliğine yerleşir.

Geçiş `700–950 ms` aralığındadır. Three.js yalnız derinlik yüzeyi ve ışık geçişinin sahibidir; okunabilir metinler DOM katmanında kalır. WebGL kullanılamazsa aynı sıra GSAP/CSS ile uygulanır.

### 6.4 Azaltılmış hareket

`prefers-reduced-motion` durumunda 3D dönüş, parallax ve rakam sıçraması kapanır. Durum doğrudan değişir; CSS su yüzeyi veri değerini hareketsiz olarak göstermeye devam eder.

## 7. Bağımsız kutu paketi

Her kutunun kendi CSS ve JSON dosyasına sahip olması bağlayıcı kuraldır. Ders Akışı paketi şu yapıda olacaktır:

```text
public/themes/magic-park/boxes/lesson-flow/
├── README.md
├── lesson-flow.css
├── lesson-flow.json
└── lesson-flow.js
```

- `lesson-flow.css`: yalnız Ders Akışı kutusunun yerleşim, renk, tipografi, durum ve fallback görünümünün sahibi
- `lesson-flow.json`: durum metinleri, renkler, hareket süreleri, görünür alanlar ve yetenek sözleşmesi
- `lesson-flow.js`: JSON yükleme, Magic Park sahne geliştirmesi, GSAP/Three.js koreografisi ve yaşam döngüsü
- `README.md`: paket sınırı, veri kaynağı, DOM kancaları ve doğrulama notları

`theme.css`, yalnız `lesson-flow.css` giriş noktasını import eder. Eski Ders Akışı görünüm kuralları `kiosk-magic-park.css`, `magic-components.css` ve `magic-states.css` içinden kaldırılır; bu ortak dosyalarda kutuya özel görsel sahiplik kalmaz.

## 8. JSON yapılandırma sözleşmesi

`lesson-flow.json` aşağıdaki konfigürasyon ailelerinin sahibi olacaktır:

- `schemaVersion`, `id`, `version`, `theme`
- `css`, `script`
- `modes`: durum başlığı ve hangi alanların görüneceği
- `palette`: durum bazlı zemin, mürekkep, vurgu ve su renkleri
- `timingMs`: durum geçişi, başlık, ana değer, bağlam ve yol süreleri
- `motion`: `left-to-right` yönü ve reveal sırası
- `capabilities`: Three.js, GSAP, CSS fallback ve reduced-motion
- `water`: shader motoru, aşağıdan yukarı dolum, kabarcık sayısı ve uyarlanabilir kontrast eşikleri
- `layout`: güvenli inset ve dört ana dikey bölüm oranları

Ders başlangıç/bitiş saatleri, ders isimleri veya geri sayım değerleri JSON içine kopyalanmaz. Bunların tek gerçek kaynağı `ScheduleManager` ve doğrulanmış backend programıdır.

## 9. Veri ve entegrasyon mimarisi

- `ScheduleManager.getScheduleStatus(now)` tek zaman/durum hesaplayıcısı olmaya devam eder.
- `ScheduleManager`, gün içindeki konumu saniye cinsinden hesaplar; ders/teneffüs sınırları ve sıra numaraları gerçek zaman üzerinden üretilir.
- `script.js`, mevcut kararlı DOM kancalarını günceller ve `classroom:schedule-status-updated` adlı bir olay yayımlar.
- Olay; `status`, `scheduleSource` ve zaman bilgisini taşır.
- `lesson-flow.js` bu olaya abone olur, yalnız Magic Park sunumunu ve animasyonu yönetir.
- Kutunun JavaScript'i ders saatlerini yeniden hesaplamaz ve ikinci bir program kaynağı oluşturmaz.
- Doğrulanmış harici program varsa mevcut ve sıradaki ders birlikte gösterilebilir.
- Backend programı boş/geçersizse mevcut güvenli fallback program çalışır; arayüz doğrulanmamış ayrıntıyı gerçek ders adı gibi öne çıkarmaz.
- Tema değişiminde observer, timeline, RAF, WebGL renderer ve GPU kaynakları temizlenir.

## 10. Hata ve fallback davranışı

- JSON yüklenemezse kararlı DOM metinleri ve kutuya ait CSS fallback görünür kalır.
- GSAP yüklenemezse CSS durum geçişi kullanılır.
- Three.js yüklenemezse derinlik düzlemi oluşturulmaz; bilgi kaybı olmaz.
- Program API'si geçici olarak hata verirse son geçerli program/fallback korunur.
- Uzun ders adları sarılır; sayı, başlık veya yol foreground artwork altında kaybolmaz.

## 11. Erişilebilirlik

- Mevcut `role="progressbar"` ve `aria-valuenow` sözleşmesi korunur.
- Dekoratif Three.js canvas erişilebilirlik ağacından çıkarılır.
- Durum değişimleri tek bir kontrollü canlı bölge üzerinden duyurulur; her dakika gereksiz tekrar yapılmaz.
- Başlık, büyük değer ve bağlam DOM metni olarak kalır; canvas üzerine metin çizilmez.

## 12. Doğrulama ve kabul ölçütleri

Uygulama şu sahnelerde ayrı ayrı doğrulanacaktır:

1. Ders öncesi
2. Ders sırasında
3. Teneffüs sırasında
4. Okul sonrası
5. Hafta sonu
6. Program hatası/fallback

Her sahne 3840×2160 ve 1920×1080 boyutlarında kontrol edilir.

Kabul ölçütleri:

- Ana süre veya ana mesaj tek bakışta okunur.
- Ayrı ilerleme çubuğu yoktur; su seviyesi aşağıdan yukarı ilerler.
- Su yüzeyi kesin ilerleme yüzdesiyle aşağıdan yukarı dolar; kabarcıklar yalnız dolu alan içinde kalır.
- Sayaç gerçek saniyede değişir ve suyun geçtiği her metin bölgesi okunaklı rengini korur.
- İçerik dış foreground artwork'ün güvenli açıklığında kalır.
- Siyah arka plan, gereksiz dekor veya büyük boş alan yoktur.
- Ders ve teneffüs durumları yalnız renkle değil metinle de ayrılır.
- Uzun ders adları kırpılmaz.
- Durum değişiminde boş frame oluşmaz.
- JSON, WebGL veya animasyon hatasında temel bilgi görünür kalır.
- Magic Park dışındaki temaların mevcut Ders Akışı davranışı değişmez.
- Kutunun görsel sahipliği bağımsız `lesson-flow.css` ve `lesson-flow.json` paketindedir.

## 13. Kapsam dışı

- Ders programı yönetim ekranının yeniden tasarımı
- Yeni ders programı verisi üretmek veya gerçek programı tahmin etmek
- Magic Park dışındaki temaların görsel yeniden tasarımı
- Diğer yedi kutunun aynı çalışma kapsamında değiştirilmesi
- Dış `sontema` artwork geometrisinin değiştirilmesi

## 14. Revizyon 3 — kesintisiz optik su hacmi

Kullanıcı kabulünde LiquidFun parçacıkları fiziksel hareket ve kabarcık akıntısı üretse de yoğunluk dokusunun bütün su gövdesinde eşiklenmesi, dinlenmiş parçacık satırlarını yatay şeritler olarak görünür bıraktı. Bu, fizik hatası değil renderer mimarisi hatasıdır: ayrı parçacık çekirdekleri suyun iç hacmi gibi boyanmıştır.

Yeni çizim sözleşmesi:

- LiquidFun basınç, viskozite, yüzey gerilimi, yerçekimi ve çarpışmanın tek fizik kaynağı olmaya devam eder.
- Her karede parçacıkların en üst zarfından 128 örnekli bir serbest yüzey profili çıkarılır; boş örnekler komşularından doldurulur ve yüzeyi öldürmeyecek iki komşulu yumuşatma uygulanır.
- Shader yalnız bu yüzey profilinin altını tek parça saydam su hacmi olarak çizer. Parçacık merkezleri, yoğunluk halkaları veya yatay sıra deseni nihai renge katılmaz.
- Yüzey normali komşu profil örneklerinden hesaplanır. Fresnel kenarı, ince köpük, yumuşak derinlik rengi ve çok düşük güçlü hücresel caustic yalnız bu sürekli hacmin optik ayrıntılarıdır.
- Su gövdesinde periyodik yatay sinüs bandı, opak süt görünümü veya parçacık örgüsü bulunmaz.
- Fiziksel gaz kabarcıkları mevcut hız alanını örneklemeye ve serbest yüzeyde patlayarak fiziği rahatsız etmeye devam eder.
- Profilin ortalama yüksekliği `ScheduleManager` ilerleme yüzdesine aynı karede kilitlenir; fizik bu ortalama çevresindeki serbest yüzey sapmasını üretir. Böylece sayaç bittiğinde su da tam doludur.
- Hacim büyürken yeni sıvı parçacıkları hesaplanan yüzeyin altında oluşturulur. Yukarıdan düşen parçacık veya damlama görünümü oluşmaz.

## 15. Revizyon 4 — portakal suyu malzemesi

İkinci gerçek ekran kaydında fiziksel dalga hareketi seçilebilse de açık mavi, düşük saçılımlı hacim dış pastel zeminle birleşerek yeterince belirgin bir sıvı kimliği vermedi. Kullanıcı kararıyla görünür sıvı portakal suyuna çevrilmiştir.

- Fizik motoru, yüzey denklemi, zaman senkronu ve kabarcık davranışı değişmez.
- Tüm durumlarda sıvı türü `orange-juice`; renk kaynağı kutuya özel JSON içindeki `liquidPalette` alanıdır.
- Gövde üstte `#FFD86A`, derinde `#E86F0C`; menisküs/köpük `#FFF1B3`, hafif posa `#FFB52E` kullanır.
- Portakal suyu suya göre daha yüksek hacim alfasına sahiptir; buna karşın sayaç ve başlık için uyarlanabilir açık renk/karşıt kontur korunur.
- Posa yalnız küçük, seyrek ve yavaş hareketli hacim kırıntısıdır; yatay bant veya oyuncak/dekor olarak kullanılmaz.

## 16. Revizyon 5 — sık yüzey dalgası ve cam kavanoz hacmi

Üçüncü gerçek ekran kaydında portakal rengi kabul edildi; yüzey hareketinin daha sık, biraz daha yüksek ve daha akıcı olması istendi. Ardından sıvının düz bir arka plan yerine gerçek bir cam kavanoz içinde, önden görünürken aynı zamanda derinliği okunur biçimde sunulmasına karar verildi.

- Sığ-su çözücüsünün yayılma, sönüm ve kenar yansıma değerleri kutuya özel JSON içindeki `surfaceWave` alanına taşınır.
- Beş ayrı fiziksel darbe kaynağına iki yönlü düşük güçlü kapiler basınç alanı eşlik eder; görünür shader ayrıntısı yüzey profilini değiştirmeden çok frekanslı küçük dalgaları canlı tutar.
- Dalga üst sınırı ilerleme ortalamasından bağımsızdır; yüzeyin ortalama seviyesi sayaçla aynı karede eşleşmeye devam eder.
- `assets/glass-jar-interior-v1.webp`, dış artwork referans alınarak üretilen dekorsuz cam iç yüzeyidir. Merkez yüzde 72 oranında boş ve okunaklı tutulur; yazı, oyuncak, sınıf eşyası veya sıvı içermez.
- Three.js sıvı malzemesi kavanoz yatay kesitine göre optik yol uzunluğu, kenar yoğunlaşması, yüzey alt dudağı, parallax kırılması ve kavisli taban merceği hesaplar. Böylece turuncu hacim düz bir renk düzlemi değil, önü ve arkası olan sıvı olarak okunur.
- CSS yalnız cam kenarı, iç yansıma ve hareketli ışık parlamasını tamamlar; üretilmiş arka plakayı veya sıvıyı opak bir panelle kapatmaz.

## 17. Revizyon 6 — kavanoz iç silueti

Dördüncü ekran kaydı, cam görselinin arka plaka olmasına rağmen sıvı shader'ının tam ekran dikdörtgen kabul etmeye devam ettiğini gösterdi. Sonuçta turuncu hacim yan cam kalınlıklarının altında görünüyor ve oval kavanoz tabanına rağmen düz ekran altından doluyordu.

- `glass.interiorMask`, kavanozun iç yan payını, merkez tabanını, yan taban yüksekliğini, taban eğrisini, üst tavanı, omuz daralmasını ve kenar yumuşatmasını kutu JSON'unda tanımlar.
- Shader, sıvı gövde alfasını bu iç siluetle çarpar; cam duvarlarının, omuzların ve kalın tabanın dışında kalan bütün sıvı pikselleri atılır.
- Taban yüksekliği merkezde düşüktür ve iki yana `bottomCurve` kuvvetiyle yükselir. Düşük dolum böylece ortadaki oval taban çanağında görünür; seviye yükselmeden yan duvarlara ulaşmaz.
- Taban merceği de sabit ekran koordinatı yerine aynı eğri tabanı izler.
- Kabarcık doğumu, yan çarpışması, taban çarpışması ve görünürlüğü aynı maske geometrisini kullanır; cam içinde kabarcık oluşamaz.

## 18. Revizyon 7 — gerçek eliptik taban

Beşinci ekran kaydında yan sınırlar kabul edildi; taban ise `x^2.65` kuvvet eğrisi nedeniyle merkezde uzun süre düz kalıyor ve yanlarda ani yükseliyordu. Kavanoz arka plakasındaki iç taban gerçek elips yayına daha yakındır.

- Yan payı, merkez/kenar yüksekliği ve omuz maskesi değişmez.
- Taban yükselişi `1 - sqrt(1 - x²)` elips denklemiyle hesaplanır.
- JavaScript kabarcık tabanı ile GLSL sıvı maskesi aynı denklemi kullanır; iki katman arasında boşluk veya çakışma oluşmaz.
- `bottomCurve: 2`, elipsin yatay karesini kutuya özel JSON sözleşmesinde açıkça sabitler.

## 19. Revizyon 8 — gerçek portakallı gazoz optiği

Görünür malzeme artık posalı portakal suyu değil, berrak ve yüksek karbonasyonlu portakallı gazozdur. Mevcut kavanoz iç maskesi, gerçek eliptik taban, süre-yükseklik senkronu ve okunaklı metin katmanı değişmez.

### 19.1 Optik hacim

- Sıvı türü `orange-soda` olur; posa tamamen kaldırılır.
- Kavanoz arka plakası Three.js içinde ayrı bir arka yüzey dokusu olarak çizilir. Sıvı shader'ı bu dokuyu yüzey normali ve kavanoz optik yolu kadar kaydırarak gerçekten kırılmış arka plan rengi üretir.
- Renk, düz alfa karışımıyla değil derinliğe bağlı üstel geçirgenlikle hesaplanır: kırmızı düşük, yeşil orta, mavi yüksek oranda emilir. İnce bölgeler altın sarısı ve berrak; merkez/kenar optik yolu koyu portakal görünür.
- Sıvı içindeki kırılmış arka plan, saçılan turuncu renk, yüzey Fresnel yansıması, hareketli caustic ve ince krem menisküs tek malzemede birleşir.
- Cam kenarında yüzey gerilimiyle yukarı tırmanan ince menisküs bulunur; köpük başlığı oluşturulmaz.

### 19.2 Karbonasyon

- Mevcut 72 büyük kabarcık fizik alanını örneklemeye ve yüzeyde patlamaya devam eder.
- Ayrıca 168 mikro kabarcık, JSON'da tanımlanan 12 dip/cam nükleasyon noktasından düzenli olmayan zincirler halinde doğar.
- Mikro kabarcıklar yükseldikçe az miktarda büyür; yatay salınımı düşük, yükselişi büyük kabarcıklardan daha yavaştır.
- 36 mikro kabarcık cam duvarlarına geçici olarak tutunur; bekleme süresi sonunda zincire katılır.
- Bütün kabarcık türleri `glass.interiorMask` taban, yan ve tavan sınırlarını ortak kullanır. Camın içinde veya sıvı yüzeyinin üstünde görünmezler.

### 19.3 JSON sahipliği ve hata davranışı

- `lesson-flow.json`, `liquidPalette`, `optics` ve `carbonation` alanlarının tek sahibidir.
- Arka doku yüklenemezse shader mevcut açık cam paletini kullanır; sayaç, sıvı seviyesi ve metin kaybolmaz.
- WebGL kullanılamadığında turuncu CSS dolumu çalışmaya devam eder.

### 19.4 Kabul ölçütleri

- Kavanozun arka ışık çizgileri sıvı içinde gözle görülür biçimde yer değiştirir; sıvı dışında düz kalır.
- İnce sıvı altın sarısı ve şeffaf, derin sıvı doygun portakal olur; opak meyve suyu görünümü oluşmaz.
- En az üç ayrı nükleasyon zinciri aynı anda okunur; rastgele kar tanesi veya posa görünümü oluşmaz.
- Menisküs cam kenarlarında yükselir ve yüzey dalgasıyla kesintisiz birleşir.
- 3840×2160 ve 1920×1080 gerçek kiosk görünümünde ana süre ile başlık okunaklı kalır.

### 19.5 Uygulama ve kabul kaydı

Revizyon 8, `12:42 / 4. Teneffüs / %55` gerçek kiosk durumunda 3840×2160 ve 1920×1080 boyutlarında uygulandı. Kırılmış kavanoz arka planı sıvının berraklığını korurken dipte turuncu yoğunluğu artırır; menisküs yüzeye kesintisiz bağlanır. Büyük ve mikro kabarcıklar kavanoz maskesi içinde kalır. 1920×1080 görünümde kutu `365 × 236 px`, içerik sınırlar içinde, WebGL canvas kutuyla eş ve tarayıcı konsolu hatasızdır.

## 20. Revizyon 9 — Büyülü Cam Amblem yazı sistemi

### 20.1 Değişmez kapsam

Bu revizyon yalnız üst bilgi üçlüsünü kapsar: ders/teneffüs başlığı, kalan süre açıklaması ve ana sayaç. Portakallı gazoz shader'ı, LiquidFun fiziği, yüzey profili, kabarcıklar, kavanoz dokusu, iç maske, dolum yüzdesi ve alttaki `ŞİMDİ / sıradaki` bağlam alanı byte düzeyinde değişmeden kalır. Yeni oyuncak, harf, boncuk, ikon veya resim eklenmez.

### 20.2 Derin tasarım kararı

Üç yön değerlendirildi:

1. **Gazoz etiketi:** Kavanoz bağlamını güçlendirir; ancak büyük bir kâğıt/folyo yüzey sıvıyı örter ve kutuyu içecek ambalajına çevirir.
2. **Işıklı tiyatro tabelası:** Çocuksudur; ancak dış Magic Park çerçevesindeki çok sayıdaki sabit ışık, oyuncak ve tabela ile rekabet ederek açıklığı kalabalıklaştırır.
3. **Büyülü Cam Amblem:** Kavanozun saydam malzemesini tekrar eder, yeni nesne eklemeden üç boyut ve gösteriş üretir, sıvı arkasında görünmeye devam eder.

Bağlayıcı seçim **Büyülü Cam Amblem**dir. Tasarımın gösterişi opak panel alanından değil; biçimli siluet, çok katmanlı kenar, emaye harf yüzü, küçük speküler parlamalar ve kontrollü derinlikten gelir.

### 20.3 Hiyerarşi ve gerçek hedef ölçü

1920×1080 kiosk görünümünde iç açıklık yaklaşık `365 × 236 px`tir. Bu ölçüde:

- Başlık amblemi üst açıklığın yaklaşık yüzde 70-78'ini, 30-34 px yüksekliği geçmeden kullanır.
- `DERSE/TENEFFÜSE KALAN` satırı başlıktan görsel olarak kopmaz; 13-15 px algısal yüksekliğe ve iki yanda kısa cam ışık rayına sahiptir.
- Sayaç 60-68 px algısal yüksekliğiyle tartışmasız birinci odaktır. Harf yüzü ile ekstrüzyon birlikte okunur; gölge rakam boşluklarını kapatmaz.
- Başlık, açıklama ve sayaç merkez ekseninde toplanır. Aralarındaki boşluklar eşit dağıtılmaz: başlık–açıklama yakın, açıklama–sayaç biraz daha geniştir. Böylece ilk ikisi tek anlam grubu, sayaç sonuç olarak okunur.

4K görünüm bu oranların iki kat fiziksel piksel karşılığıdır; ayrı bir kompozisyon oluşturulmaz.

### 20.4 Başlık amblemi

- Eski genel amaçlı oval hap kaldırılır.
- Yeni yüzey, merkezde yumuşak kavisli ve yanlarda kısa kesimli kulaklara sahip ince bir cam arma siluetidir.
- Dolgu en fazla yüzde 10-12 beyaz opaklığa ulaşır; arka kavanoz ve sıvı görünür kalır.
- İki kenar kullanılır: dışta lila-mor emaye, içte ince turkuaz ışık. Üst üçte birde krem speküler yay, altta çok hafif koyu cam kırılması bulunur.
- Başlık harfi kuru alanda derin petrol, ıslak alanda krem emayedir. İnce açık yüz çizgisi ve aşağı-sağa ilerleyen mor/petrol ekstrüzyon, harfi küçük ölçüde dahi üç boyutlu tutar.

### 20.5 Kalan süre açıklaması

- Açıklama bağımsız bir kutuya girmez; amblemin altına ait bir alt başlık olur.
- Metnin iki yanında ortadan dışa doğru saydamlaşan kısa ışık rayları bulunur. Raylar dekor değil, bakışı sayaca taşıyan hiyerarşi aracıdır.
- Harf aralığı mevcut geniş görünümden daraltılır; Nunito 900-950 ağırlık korunur.
- Açıklama sıvı altında kaldığında yalnız renk/ince gölge değiştirir; arkasına opak zemin gelmez.

### 20.6 Ana sayaç

- Fredoka'nın yuvarlak rakamları korunur; yüzey düz renk yerine üstü sıcak krem, ortası beyaz, altı açık şeftali olan emaye gradyandır.
- Gerçek derinlik dört kontrollü katmandan oluşur: ince beyaz yüz kenarı, kısa petrol ara kat, mor ana ekstrüzyon ve yumuşak temas gölgesi. Uzun/kirli gölge kullanılmaz.
- Sayaç değeri saat, dakika ve saniye segmentlerine ayrılabilir; yalnız `:` ayraçları bir saniyelik düşük genlikli ışık nefesi yapar. Rakamlar sürekli ölçeklenmez veya zıplamaz.
- Değer değişiminde DOM bütünü yeniden canlandırılmaz. Segment metni güncellenir; başlık durumu değiştiğinde var olan GSAP yerleşme hareketi bir kez çalışır.
- Sayaç sıvı içindeyken krem yüz + koyu petrol/mor derinlik; kuru alanda petrol yüz + krem kontur kullanır. Mevcut `is-on-fill` eşikleri değişmez.

### 20.7 Hareket dili

- Durum değişiminde amblem soldan en fazla yüzde 6 mesafeden gelir, `rotationY` yaklaşık 7 dereceden sıfıra oturur.
- Işık rayları merkezden dışa 320-420 ms içinde açılır.
- Sayaç 0.94 ölçekten 1'e tek bir yayla oturur; sürekli salınım yapmaz.
- Amblem speküler parlaması 8-10 saniyede bir geçer. Ayraç nefesi bir saniyedir ve opacity aralığı dar tutulur.
- `prefers-reduced-motion` durumunda bütün yeni hareketler kapanır; biçim ve kontrast aynen kalır.

### 20.8 JSON ve dosya sahipliği

- Renk, süre ve hareket genlikleri `lesson-flow.json` içindeki yeni `typography` sözleşmesinin sahibidir.
- `lesson-flow.js`, bu değerleri güvenli CSS custom property'lerine aktarır ve sayaç segmentlerini üretir.
- Bütün görünüm `lesson-flow.css` içinde kalır. Ortak Magic Park CSS dosyalarına yeni Ders Akışı kuralı eklenmez.
- JSON yüklenemezse CSS varsayılanları aynı tasarımı ve okunaklılığı korur.

### 20.9 Başarısızlık riskleri ve önlemler

- **Fazla cam/bulanıklık:** Arka sıvıyı sütlü gösterir. Çözüm: amblem dolgusu düşük, blur dar ve yalnız yazı çevresindedir.
- **Fazla 3D gölge:** Küçük rakam boşluklarını kapatır. Çözüm: dört kısa katman ve tek yumuşak temas gölgesi.
- **Dış artwork ile rekabet:** Yeni ikon veya ışık dizisi eklenmez; yalnız iki kısa ray ve yavaş tek parlama kullanılır.
- **1080p'de küçük kicker:** Minimum algısal yükseklik ve dar harf aralığı gerçek `365 × 236 px` görünümde doğrulanır.
- **Sıvı değişikliği riski:** Test, `water` JSON dalının ve shader optik/kabarcık kodunun bu revizyonda değişmediğini korur.

### 20.10 Kabul ölçütleri

- Birinci bakışta sayaç, ikinci bakışta ders/teneffüs numarası, üçüncü bakışta kalan süre açıklaması okunur.
- Başlık eski düz beyaz hap gibi görünmez; biçimli saydam cam arma ve emaye harf olarak okunur.
- Sayaç düz font/gölge değil, kısa fakat temiz fiziksel derinliği olan emaye rakam görünümündedir.
- Hiçbir yeni yüzey sıvıyı geniş bir opak alanla kapatmaz.
- 3840×2160 ve 1920×1080 kiosk görünümünde taşma, üst üste binme, kırpılma ve okunaklılık kaybı yoktur.
