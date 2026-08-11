# Classroom Projesi — Öğrenci Ana Sayfası 4K Görsel ve Teknik İnceleme Envanteri — 10 Ağustos 2026

## Source-of-truth başlangıç durumu

- Çalışma dizini: `/Users/bingoweb/Projeler/Classroom-ilk-surum`
- DevSpace workspace: `ws_48cc29f81d`
- Workspace modu: gerçek checkout / `checkout`
- DevSpace doğrudan çağrı doğrulaması: **PASS** (`exec_command` başarıyla çalıştı)
- Başlangıç `HEAD`: `740f26e5fda0a278ba894d2950f6e19276cc82e6`
- Başlangıç `origin/main`: `740f26e5fda0a278ba894d2950f6e19276cc82e6`
- Branch: `main...origin/main`
- Başlangıçta tracked modified dosya: **yok**
- Başlangıçta görülen untracked öğeler:
  - `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Ayrıntılı Hata İnceleme Envanteri ve Checkpoint — 10 Ağustos 2026.md`
  - `Classroom Projesi/02 - Devir ve Oturum Notları/Classroom Projesi — Yeni Sohbet Devir Belgesi — 8 Ağustos 2026.md`
  - `Classroom Projesi/02 - Devir ve Oturum Notları/Classroom Projesi — Yeni Sohbet Devir Belgesi — 9 Ağustos 2026 — B4 Öncesi.md`
  - `docs/superpowers/`
- 10 Ağustos 2026 ana-sayfa 4K devir belgesi repo içinde başlangıçta yoktu. Önceki oturumdaki `Resource not found: DevSpace.exec_command` kesintisiyle uyumlu olarak, DevSpace erişimi yeniden doğrulandıktan sonra devir içeriği repo içine istenen adla kaydedildi.

## İnceleme kapsamı

- Öğrencilerin göreceği ana sayfa / kiosk ana ekranı.
- Öncelik gerçek `3840×2160` 4K viewport.
- Gerekli karşılaştırmalar: `1920×1080`, `2560×1440`, `3840×2160`.
- Layout, clipping/overflow, tipografi, uzaktan okunabilirlik, görsel hiyerarşi, asset kalitesi, GSAP/CSS animasyonları, runtime console/network sorunları, layout shift, paint/composite/performance, uzun süre kiosk kullanımı, erişilebilirlik, responsive davranış ve tasarım sistemi/kütüphane gereksinimi incelenecek.
- Bu aşamada **fix, refactor, dependency ekleme veya ürün kodu değişikliği yapılmayacak**.
- Önemli runtime/görsel bulgular mümkün olduğunca Playwright MCP + Chrome DevTools MCP ile çift doğrulanacak.

### Görsel kalite önceliği — bağlayıcı karar

- Ana karar ölçütü **kozmetik görünüm, profesyonellik ve 4K görsel kalite** olacaktır.
- Yalnız performans kazanmak amacıyla görsel efekt, detay, asset kalitesi, animasyon zenginliği veya genel görünüm kırpılmayacaktır.
- Performans optimizasyonu gerekiyorsa önce aynı görsel kaliteyi koruyan teknik optimizasyon yolları aranacaktır.
- En iyi görünüm için gerekirse internetten güncel tasarım/animasyon/UI yaklaşımı araştırılabilir; araştırma mümkün olduğunca resmî/primary kaynaklara dayanacaktır.
- Her şeyin tamamen yerel/offline çalışması artık kozmetik kaliteyi sınırlayan zorunlu bir koşul olarak ele alınmayacaktır. Dış bağımlılık/servis önerisi yapılırsa kiosk güvenilirliği ve ağ kesintisi davranışı ayrıca değerlendirilir; ancak sırf yerellik uğruna daha düşük görsel kalite tercih edilmez.

### Premium çocuk dashboard art-direction kuzey yıldızı — bağlayıcı karar

- Bu ekranın hedefi **kurumsal/şirket kiosku değildir**. Öğrenciler için özel hazırlanmış, sınıfa aidiyet duygusu veren, canlı ve çocuksu bir dashboard olmaya devam edecektir.
- Buradaki **premium** kelimesi; soğuk minimalizm, gri kurumsal kartlar, enterprise dashboard estetiği, cam-ofis yüzeyleri veya “profesyonel görünsün diye çocuk karakterini azaltma” anlamına gelmez.
- Hedef karakter: **sıcak + oyunsu + canlı + ödüllendirici + masalsı/keşif duygulu + yüksek üretim kalitesi**. Çocuksuluk kalite eksikliğinden değil, bilinçli sanat yönetiminden gelmelidir.
- Tasarımın istenen üç ana damarı:
  1. **Sınıf panosu sıcaklığı:** öğretmen eli değmişlik, aidiyet, güven ve sevgi.
  2. **Tema parkı / sihirli bahçe canlılığı:** renk, keşif, merak ve küçük sürprizler.
  3. **Koleksiyon kartı / rozet / başarı vitrini premiumluğu:** öğrencilerin kendini değerli ve görünür hissetmesi.
- “Daha premium” çözüm önerisi çocuk karakterini azaltıyorsa veya ekranı banka/şirket/otel kiosku gibi gösteriyorsa **reddedilecektir**.
- Premium çocuk görünümünde ana ölçüt “daha çok efekt” değildir. Hedef **az ama karakterli; canlı ama kontrollü; oyuncu ama düzenli; enerjik ama yorucu olmayan** bir görsel ritimdir.
- Renk yaklaşımı “her şey rengârenk” değil, **bütün renklerin yönetildiği** bir sistem olmalıdır: birkaç ana duygusal renk ailesi, kart bazlı varyasyonlar ve ortak evren hissi.
- Motion yaklaşımı her öğenin “bak bana” demesi değil; **ödül anı, dikkat yönlendirme ve şefkatli canlılık** için hiyerarşik hareket kullanılmasıdır. Bir ana hareket odağı ve yardımcı hareketler olmalıdır.
- Tipografi yalnız okunurluk değil **kişilik** taşımalıdır. Ana başlıklar sıcak/yuvarlak/neşeli; sayılar çok net; yardımcı ve mikro metinler de aynı çocuk tasarım evreninin parçası olmalıdır.
- Sağ sütun (başkan, yardımcılar, nöbetçiler, yıldızlar) yalnız veri kartları değil, **sınıf rolü/başarı/aidiyet vitrini** olarak değerlendirilecektir. Görsel yön; metalik/soğuk kurumsal değil, pastel + parlak vurgu, hafif storybook ve collectible/toy-card hissine yakın olmalıdır.
- Attendance alanı yalnız istatistik paneli değil, **sınıfın birlikte olma/takım hissini** taşımalıdır. Haber şeridi hissi veren mekanik çözümler çocuk deneyimi açısından sorgulanacaktır.
- Noise meter yalnız ölçüm aracı değil, **sınıfın küçük rehber/maskot karakteri** olma potansiyeliyle değerlendirilecektir.
- Slideshow yalnız medya döngüsü değil, **sınıfın hikâye/duygu penceresi** olarak ele alınacaktır: anı, kutlama, ilham, öğretmen mesajı ve güvenli sınıf atmosferi taşımalıdır.
- Kozmetik geliştirme önceliği şu sırada tutulacaktır: (A) shell/art direction, stil ownership, tipografi, motion dili, sağ sütun vitrini; (B) attendance sıcaklığı, noise maskotlaştırma, slideshow hikâye penceresi; (C) glow/shadow/gradient, pill/chip ve spacing rafinasyonu.
- Bundan sonraki kart incelemelerinde her ana kart en az şu beş ölçütle değerlendirilecektir: **çocuksuluk, premiumluk, okunabilirlik, duygusal etki, görsel bütünlük**. Ayrıca her kart için **korunacak / geliştirilecek / azaltılacak / yeniden sanat yönetimi gerektiren** yönler ayrı kaydedilecektir.

## Tamamlanan dosyalar

- [x] `Classroom Projesi/02 - Devir ve Oturum Notları/Classroom Projesi — Yeni Sohbet Devir Belgesi — 10 Ağustos 2026 — Öğrenci Ana Sayfası 4K İncelemesi.md` — repo içine kurtarıldı ve başlangıç kuralları okundu.
- [x] `package.json` — kiosk bağımlılıkları ve test girişleri haritalandı.
- [x] `backend/server.js` statik servis bölümü — `public/` doğrudan Express static root olarak doğrulandı.
- [x] `public/index.html` — gerçek öğrenci kiosk DOM yapısı ve CSS/JS/asset yükleme zinciri haritalandı.
- [x] `start.sh` route referansı — kiosk hedefinin `http://localhost:3000` olduğu doğrulandı.

## Tamamlanan runtime senaryoları

- [x] Kiosk statik/regresyon test baseline: 10 kiosk/asset/runtime odaklı test dosyası birlikte çalıştırıldı; **49/49 PASS**.
  - `kiosk-magic-park`
  - `kiosk-icon-system`
  - `kiosk-titlebar-resize`
  - `kiosk-css-analysis`
  - `kiosk-runtime-optimization`
  - `kiosk-logger-scope`
  - `face-focus-optimization`
  - `noise-meter-state`
  - `noise-state-assets`
  - `interval-manager-lifecycle`
- [x] Gerçek Playwright resize döngüsü: `3840×2160 → 2560×1440 → 1920×1080 → 3840×2160` — reload olmadan.
- [x] Chrome DevTools resize/emulation karşılığı: aynı CSS viewport zinciri DPR 1.25 host ölçeği hesaba katılarak tekrarlandı.
- [x] `prefers-reduced-motion: reduce` Playwright 4K: GSAP entrance/ambient/noise motion suppression doğrulandı.
- [x] Normal-motion slideshow fade transition: 4K'da gerçek iki-slidelı transition state kareleri örneklendi; runtime error/warning yok.
- [x] Slideshow adaptive media-layout: panorama `contain` seçimi hydrate edilerek hem Playwright hem Chrome computed style ile kontrol edildi; **FND-4K-003** bulundu.
- [x] Kısa/orta süre kiosk soak: Chrome'da yaklaşık 50 saniye boyunca 5 sn data polling + 4 sn star rotation + 12 sn main slide rotation + 30 sn slide refresh birlikte çalıştırıldı; DOM/interval/memory stabilitesi örneklendi.
- [x] 4K zaman/state matrisi Playwright: ders öncesi, 1. ders, ilk teneffüs, 2. ders, en uzun teneffüs, son ders, okul çıkışı, hafta sonu — aynı oturumda state değişimleri ve clipping ölçüldü.
- [x] `longest-break / Öğle Teneffüsü` state'i Chrome DevTools 4K ile ikinci kez ölçüldü; **FND-4K-008** doğrulandı.
- [x] Sağ sütun role-name 4K sınırları: gerçek başkan/yardımcı/nöbetçi/yıldız isimleri ve uzun Türkçe isim stress örnekleri overflow/clipping açısından ölçüldü.

## Doğrulanmış bulgular

### FND-4K-001 — Tam ekran Magic Park kabuğu gerçek 4K çözünürlüğün çok altında

- **Önem:** Yüksek — kozmetik / 4K görsel kalite.
- **Dosya/alan:** `public/assets/kiosk-magic-park-shell.webp` + `public/css/kiosk-magic-park.css` `.bento-grid` background.
- **Semptom:** Ana 16:9 sahnenin tüm dekoratif kabuğunu oluşturan raster arka plan gerçek 4K sahnede yaklaşık 2.30× büyütülüyor. Bu nedenle özellikle çizgi kenarları, küçük dekoratif ayrıntılar, yüzey dokuları ve 3D/illustration detaylarında 4K panelin sunabileceği keskinlik elde edilemez; görüntü doğal olarak yumuşar/piksel interpolasyonuna bağımlı hale gelir.
- **Kök neden:** Kaynak WebP yalnız **1672×941**; CSS `background-size: 100% 100%` ile sahnenin tamamına geriliyor.
- **4K etkisi:** 3840×2160 fiziksel render için yatay büyütme ≈ **2.297×**, dikey büyütme ≈ **2.295×**.
- **Playwright kanıtı:** Gerçek `3840×2160`, DPR=1 viewport ölçümünde `.bento-grid` sahnesi tam **3840×2160** render oluyor; doküman scroll/viewport escape yok. Dolayısıyla düşük çözünürlüklü shell sahnenin tamamına gerçekten büyütülüyor.
- **Chrome DevTools kanıtı:** 4K fiziksel emülasyonda host DPR 1.25 nedeniyle CSS viewport `3072×1728`, fiziksel eşleniği `3840×2160`; aynı anda shell doğal boyutu `1672×941`, `background-size: 100% 100%`, fiziksel ölçek yaklaşık `2.297× / 2.295×` ölçüldü.
- **Kullanıcı etkisi:** Ekranın en büyük ve en sürekli görünen tasarım öğesi olduğu için genel “premium/profesyonel” algıyı doğrudan aşağı çeker. Küçük kart içi assetlerin iyi olması bu yumuşak temel kabuğu tamamen telafi edemez.
- **Önerilen çözüm yönü (fix değil):** Aynı sanat dilinde gerçek 4K veya tercihen daha yüksek kaynak (en az 3840×2160; kalite payı için daha yüksek master) üretmek/edinmek; mümkünse vektör/katmanlı üretim veya yüksek çözünürlüklü yeniden üretim düşünmek. Performans için çözünürlüğü düşük tutma yaklaşımı tercih edilmemeli; transfer/encode optimizasyonu kalite korunarak ayrıca yapılmalı.

### FND-4K-002 — Görünür kiosk tipografisinde legacy/system font adaları kaldı

- **Önem:** Orta — kozmetik tutarlılık / cross-platform görünüm.
- **Dosya/alan:** `public/css/style.css` geç `JOYFUL PALETTE REFINEMENT` katmanı + `public/css/kiosk-magic-park.css`; görünür alanlar `#date.date-full`, `.noise-status-copy small` ve devamsız öğrenci durumu açıldığında `.marquee-content`.
- **Semptom:** Magic Park teması ana tasarım dilini yerel `Fredoka Classroom` + `Nunito Classroom` üzerine kurduğu halde tarih satırı hâlâ `Avenir Next / Segoe UI Variable Display / Segoe UI / ...` zincirini; mikrofon durumunun küçük açıklaması `Segoe UI / system-ui / SF Pro Display` zincirini; koşullu devamsız öğrenci marquee metni de `Segoe UI / -apple-system / system-ui / Roboto` zincirini kullanıyor.
- **Kök neden:** `style.css` sonlarındaki `--font-display`/legacy font kuralları bu elemanlarda etkili kalıyor; Magic Park katmanı renk/boyut/ağırlığı override ediyor ancak ilgili elemanlarda `font-family`yi her yerde yeniden sahiplenmiyor.
- **Kullanıcı etkisi:** Aynı kart içinde harf biçimi, metrikler ve ağırlık hissi değişiyor. macOS'ta Avenir, Windows/Linux kiosk'ta Segoe veya başka fallback seçilebileceği için ekranın optik kimliği makineye göre değişebilir. 4K'da bu fark daha görünür hale gelir.
- **Playwright kanıtı:** Gerçek 3840×2160 renderda `#date` computed font-family `"Avenir Next", "Segoe UI Variable Display", ...`; `.noise-status-copy small` `"Segoe UI", -apple-system, ...`. Sentetik devamsızlık state'inde görünür `.marquee-content` computed family `"Segoe UI", -apple-system, "system-ui", Roboto, sans-serif`, font-size `26.88px`. Aynı ekrandaki başlık/clock/rol isimleri Fredoka, yardımcı metinlerin çoğu Nunito.
- **Chrome DevTools kanıtı:** Normal ekran text-node font envanteri tarih ve mikrofon system-font adalarını doğruladı; sentetik devamsızlık state'inde `.marquee-content` da bağımsız olarak aynı Segoe/system zinciri ve `26.88px` computed boyutla doğrulandı.
- **Empty-state ek kanıtı:** `roles=[]` state'inde Başkan/Nöbetçi mesajları Magic Park override sayesinde `Fredoka Classroom` kullanırken, `Haftanın Yıldızları` boş mesajı `.no-stars-text` için hâlâ **`"Segoe UI", sans-serif`** computed family ile render oluyor. Chrome ve Playwright 4K'da aynı sonucu verdi; font-size bu state'te `44px`.
- **Kapsam genişlemesi:** System-font adaları yalnız normal ekran mikro metinlerinde değil, gerçek kullanıcı tarafından görülebilecek **boş-state** yüzeyinde de mevcut. Bu, theme typography ownership'in tüm conditional state'leri kapsamadığını ayrıca doğruluyor.
- **Önerilen çözüm yönü (fix değil):** Tipografi ownership'ini Magic Park katmanında tamamen netleştirip görünür kiosk metinlerini sınırlı, kasıtlı bir font sistemi altında toplamak. Tasarım kararı olarak tarih veya teknik durum metnine gerçekten farklı bir font isteniyorsa bunu sistem fallback'e bırakmak yerine açık ve platformdan bağımsız biçimde seçmek.
- **Magic Park 2.0 çözüm sonucu — RESOLVED (10 Ağustos 2026):** MP2-A devamsız roster `.marquee-content` için `Nunito Classroom`, MP2-B `.noise-status-copy small` için `Nunito Classroom`, MP2-C role empty support copy için `Nunito Classroom`, MP2-D `#date.date-full` için `Nunito Classroom` ownership'i açıkça verildi. Final Chrome 4K computed audit: `#date="Nunito Classroom"`, `.marquee-content="Nunito Classroom", "Trebuchet MS", sans-serif`, `.noise-status-copy small="Nunito Classroom"`, sentetik gerçek role-empty `.role-empty-message="Nunito Classroom"`. Başlangıçta tanımlanan dört görünür system-font adası artık platform fallback'e bırakılmıyor.

### FND-4K-003 — Slayt “contain” algoritması CSS specificity yüzünden görselde çalışmıyor; panoramik slayt ciddi kırpılıyor

- **Önem:** Yüksek — doğrudan kozmetik/kompozisyon kaybı.
- **Dosya/alan:** `public/js/script.js` `getSlideMediaLayoutMode()` / `updateSlideImageLayout()` + `public/css/kiosk-magic-park.css` slideshow object-fit kuralları.
- **Beklenen davranış:** Kaynak görsel ile frame aspect ratio farkı %20 eşiğini aşıyorsa JS `contain` seçiyor; CSS `slide-media--contain` ile tüm kompozisyonu koruyup mevcut blurred backdrop ile boş alanı doldurmayı amaçlıyor.
- **Gerçek davranış:** `ataturk-3.webp` (`3168×1344`, çok geniş panorama) için DOM doğru biçimde `data-media-layout="contain"` ve `slide-media--contain` class'ını oluşturuyor; buna rağmen computed `object-fit` **`cover`** kalıyor.
- **Kök neden:** Magic Park CSS'teki genel `body.magic-park-theme .slideshow-container .slide img { object-fit: cover; }` selector'ü element + ek `.slide` özgüllüğü nedeniyle daha sonra yazılan `.slide-media--contain { object-fit: contain; }` selector'ünden daha yüksek specificity taşıyor. Dolayısıyla “contain” class'ı görsel sonucu kazanamıyor.
- **4K etkisi:** Playwright gerçek 3840×2160 frame ölçümünde slideshow iç frame ≈ `1525×947`; `3168×1344` panorama `cover` ile çizildiğinde kaynak genişliğinin yalnız ≈`2165px` bölümü görünür kalıyor; yaklaşık **%31.7 yatay kompozisyon kırpılıyor**.
- **Playwright kanıtı:** Slide 4 medya hydrate edilip mevcut `updateSlideImageLayout()` çalıştırıldı: `layout=contain`, class=`slide-media slide-media--contain`, natural=`3168×1344`, fakat computed `objectFit=cover`; tahmini horizontal crop ≈`31.7%`.
- **Chrome DevTools kanıtı:** Runtime DOM aynı slaytta `layout=contain` + `slide-media--contain`, natural `3168×1344`, computed `objectFit=cover` durumunu bağımsız olarak doğruladı.
- **No-slides fallback kapsamı:** `/api/slides/active = []` durumunda sistem `assets/tribute.webp` (`1024×1024`) fallback'ini oluşturuyor. Bu kare görselde de DOM doğru biçimde `data-media-layout="contain"` + `slide-media--contain` üretiyor; buna rağmen computed `object-fit` yine **`cover`** kalıyor.
- **Fallback 4K crop kanıtı:** Chrome fiziksel 4K emülasyonda frame ≈`1525.6×947.1px`; Playwright gerçek 4K'da ≈`1518×942.4px`. Kare kaynak `cover` ile genişliğe oturtulduğunda görünür kaynak yüksekliği ciddi biçimde azalıyor ve yaklaşık **%37.9 dikey kompozisyon kırpılıyor**. İki browser aynı oranı doğruladı.
- **Kullanıcı etkisi genişlemesi:** Hata yalnız özel panorama yüklemelerinde değil, sistemin kendi “hiç aktif slayt yok” güvenli fallback'inde de ortaya çıkıyor. Dolayısıyla `contain` specificity düzeltmesi slideshow'un hem normal hem failure/empty state kalite kabulünün temel şartıdır.
- **Kullanıcı etkisi:** Fotoğraf/illüstrasyonun kenarlarındaki kişi, nesne, yazı veya tarihsel kompozisyon kesilebilir. Bu özellikle kullanıcı kendi geniş oranlı görselini yüklediğinde “sistem akıllıca contain seçti” izlenimine rağmen gerçekte içerik kaybı yaratır; premium slideshow görünümünü doğrudan bozar.
- **Önerilen çözüm yönü (fix değil):** CSS ownership/specificity'yi düzeltip `contain` kararının gerçekten computed style'ı kazanmasını sağlamak; blurred backdrop tasarımını korumak. Görüntüyü performans için crop etmeyi çözüm olarak kabul etmemek.

### FND-4K-004 — “Haftanın Yıldızları” için tanımlı 7 geçiş efekti Magic Park temasında fiilen çalışmıyor

- **Önem:** Orta-Yüksek — doğrudan kozmetik/animasyon kalitesi.
- **Dosya/alan:** `public/js/script.js` `initStarSlideshow()` / `nextStarSlide()` + `public/css/style.css` star transition kuralları + `public/css/kiosk-magic-park.css` `.star-slide` display ownership'i.
- **Beklenen davranış:** Yıldız kartı her 4 saniyede bir önceki efekti tekrarlamadan `fade`, `slide-right`, `slide-left`, `scale`, `rotate`, `flip`, `zoom-blur` efektlerinden biriyle geçiş yapıyor.
- **Gerçek davranış:** JS transition class'larını doğru şekilde değiştiriyor; ancak Magic Park katmanı pasif `.star-slide` öğelerini `display:none`, yalnız `.star-slide.active` öğesini `display:grid` yapıyor. Incoming slide transition başlangıç stili hiç paint edilmeden aynı anda görünür/active son haline geçiyor; outgoing slide da `active` kaldırılır kaldırılmaz `display:none` oluyor. Sonuç gerçek CSS transition yerine **ani kart değişimi**.
- **Playwright kanıtı:** 4K normal-motion çalışmasında class mutation'ları gözlendi (`transition-flip`, ardından `active`), fakat 5.2 saniyelik ölçümde **0 adet `transitionrun`, `transitionstart`, `transitionend`, `transitioncancel` olayı** üretildi. Son state doğrudan final transformta. Reduced-motion ölçümünde de transition class atanıyor fakat görünür hareket oluşmuyor.
- **Chrome DevTools kanıtı:** 4K fiziksel emülasyonda iki ardışık star değişimi (`transition-zoom-blur`, sonra `transition-fade`) class seviyesinde gerçekleşti; buna rağmen **transition event listesi tamamen boş** kaldı. Pasif slide `display:none`, aktif slide doğrudan final computed style ile `display:grid`.
- **Kullanıcı etkisi:** Ekranın en dikkat çekici ödül/başarı kartlarından biri tasarımda vaat edilen akıcı, zengin geçişleri göstermiyor; 4 saniyede bir içerik “kesilerek” değişiyor. Bu, genel premium hareket dilini zayıflatıyor ve kodda ciddi animasyon zenginliği varmış gibi görünmesine rağmen görsel çıktıda karşılığını vermiyor.
- **Önerilen çözüm yönü (fix değil):** Star slideshow visibility/animation ownership'ini yeniden kurgulamak; outgoing/incoming iki slide transition süresince composited/görünür kalmalı. Efekt sayısını korumak zorunlu değil; kullanıcı önceliği gereği amaç en kaliteli hareket dili olmalı. Daha az ama daha iyi koreografili efekt seçimi gerekirse tasarım aşamasında değerlendirilebilir; performans gerekçesiyle animasyon kalitesi kırpılmamalı.
- **MP2-C düzeltme sonucu — RESOLVED (10 Ağustos 2026):** Legacy 7-class transition seçimi kaldırıldı; `.star-slide` öğeleri artık `display:grid` altında visibility/opacity ile sahipleniliyor ve outgoing/incoming iki slide kısa GSAP crossfade/scale/y koreografisi boyunca birlikte composited kalıyor. Playwright + Chrome `3840×2160 / 2560×1440 / 1920×1080` doğrulamasında 320ms örneklerinde iki slide aynı anda görünür (`visibleCount=2`); final state tek aktif slide'a temizleniyor.

### FND-4K-005 — Kiosk görsel sistemi birbiri üstüne yığılmış legacy + tema CSS katmanları nedeniyle tek bir stil ownership'ine sahip değil

- **Önem:** Yüksek yapısal risk / Orta doğrudan kozmetik etki.
- **Dosya/alan:** `public/css/style.css` + `public/css/kiosk-mode.css` + `public/css/kiosk-magic-park.css`.
- **Ölçülen yapı:** Kiosk CSS zinciri toplam **6192 satır / 150,530 byte**, **713 rule**, **904 selector**, **3184 declaration** içeriyor. Statik analiz **198 duplicate selector**, **248 same-selector property chain**, **22 duplicate declaration block** raporluyor. `style.css` tek başına 4740 satır; Magic Park bunun üstüne 1433 satırlık ayrı tema katmanı olarak yükleniyor.
- **Neden gerçek ürün bulgusu:** Bu yalnız bakım metrikleri değil; aynı cascade/ownership yapısı bu oturumda üç ayrı görünür probleme doğrudan dönüştü:
  1. legacy `--font-display` zincirinin Magic Park içine sızması (**FND-4K-002**),
  2. `contain` class'ının daha özgül eski/genel `cover` kuralını yenememesi (**FND-4K-003**),
  3. eski star transition sisteminin Magic Park `display:none/grid` visibility modeliyle semantik olarak çakışması (**FND-4K-004**).
- **Kullanıcı etkisi:** Yeni görsel iyileştirmeler ekledikçe “CSS'te doğru görünüp browserda başka sonuç verme” riski yükseliyor. Bu da premium görünümü ince ayarla geliştirmeyi zorlaştırır; bir bölgede yapılan estetik iyileştirme başka bir geç katman tarafından sessizce bozulabilir.
- **Tasarım kütüphanesi açısından anlamı:** Sorun öncelikle “yetersiz UI kütüphanesi” değil, **mevcut stil ownership/cascade mimarisi**. Yeni büyük UI framework'ü eklemek bu katman karmaşasını otomatik çözmez; aksine dördüncü bir stil sistemi ekleyebilir.
- **Önerilen çözüm yönü (fix değil):** Düzeltme aşamasında öğrenci kiosk görünümünün tek ve açık bir tema ownership'i altında konsolide edilmesi; legacy kuralların yalnız gerçekten ortak olanlarla sınırlandırılması; token/typography/media/animation kararlarının tek katmanda sahiplenilmesi. Native cascade-layer/token yaklaşımı veya küçük bileşen sınırları değerlendirilebilir. Yeni framework ancak bundan sonra somut bir boşluk kalırsa düşünülmeli.

### FND-4K-006 — Sekiz ana bilgi kartının görsel başlıkları semantik heading/landmark yapısına sahip değil

- **Önem:** Düşük-Orta — erişilebilirlik/semantik kalite; görsel kaliteyi bozmaz.
- **Dosya/alan:** `public/index.html` ana bento yapısı ve `.card-titlebar` markup'ı.
- **Gerçek davranış:** Sekiz kart başlığının tamamı `div/span` ve `role`/`aria-label` olmadan erişilebilirlik ağacına düz `StaticText` olarak giriyor. Sayfada `main`, `section`, `article`, `header` landmark elementi yok.
- **Playwright kanıtı:** Gerçek 4K DOM'da `main=0`, `section=0`, `article=0`, `header=0`; sekiz `.card-titlebar` öğesi `DIV`, `role=null`. Mevcut after-school state'te görünür gerçek heading yalnız `H2 Yarın Görüşürüz`.
- **Chrome DevTools kanıtı:** Verbose accessibility snapshot sekiz ana bölüm adını generic container altındaki `StaticText` olarak gösterdi; aynı DOM sayımları landmark yokluğunu doğruladı.
- **Kullanıcı etkisi:** Görsel kullanıcı için sorun yok; ekran okuyucu/yardımcı teknoloji kullanan biri “Günün Zamanı / Sınıf Mevcudu / Ders Akışı / ...” bölümleri arasında heading/region navigasyonu yapamıyor. Ekranın bilgi mimarisi görsel olarak belirgin ama semantik olarak düzleşiyor.
- **Önerilen çözüm yönü (fix değil):** Görsel tasarımı değiştirmeden ana içerik için uygun landmark ve her bilgi kartı için gerçek heading veya `section aria-labelledby` ilişkisi kurmak.

### FND-4K-007 — Noise karakterinin `transform` hareketini CSS transition ve GSAP aynı anda sahipleniyor

- **Önem:** Yüksek — motion fidelity / animasyon ownership; ayrıca gereksiz composite/transition churn riski.
- **Dosya/alan:** `public/css/style.css` `#noise-character-img { transition: transform 0.3s ... }` + `public/js/kiosk-motion.js` sürekli GSAP `y/rotation` tween'i + Magic Park'ın aynı öğe üzerindeki transform reset/geometry katmanı.
- **Gerçek runtime:** Normal motion modunda Magic Park GSAP `#noise-character-img` için `duration=2.8`, `repeat=-1`, `yoyo=true`, `y=-0.48vh`, `rotation=1.2` tween'i çalıştırıyor. Aynı anda computed CSS `transition-property: transform`, `transition-duration: 0.3s` olarak kalıyor.
- **Playwright kanıtı:** Aynı öğede eşzamanlı olarak bir GSAP tween'i ve `CSSTransition` nesnesi (`transitionProperty="transform"`, `playState="running"`, `currentTime≈0`) görüldü. Computed transform GSAP yazımlarıyla sürekli değişiyor.
- **Chrome DevTools kanıtı:** Bağımsız 4K runtime ölçümü aynı anda `GSAP repeat=-1` tween + aktif `CSSTransition(transform)` gösterdi; CSS transition currentTime'ın sürekli başlangıca yakın kalması GSAP'in frame-by-frame transform güncellemelerinin transitionı tekrar tekrar yeniden hedeflediğini doğruluyor.
- **Ek risk:** Legacy `.state-high #noise-character-img { animation: shake ... }` keyframe'i de `transform` yazar. Gürültü high state'inde üçüncü bir transform owner devreye girebilir; bu senaryo ayrıca state-level görsel kabulte test edilmelidir.
- **High-state doğrulaması:** Playwright'ta yalnız runtime DOM state'i geçici olarak `state-high` yapıldığında aynı öğede eşzamanlı **CSSAnimation `shake` (0.4s)** + **CSSTransition `transform` (0.3s)** + **GSAP infinite y/rotation tween** üçlüsü aktif kaldı. Yani üçüncü owner yalnız teorik risk değil, state tetiklendiğinde gerçekten devreye giriyor.
- **Kullanıcı etkisi:** Motion eğrisi GSAP'in tasarlanan easing/koreografisini birebir izlemeyebilir; hareket gereksiz yere “lastikli/gecikmeli” hissedebilir ve tarayıcı her GSAP frame'inde CSS transition churn üretebilir. Premium motion dili için deterministik ownership gerekir.
- **Önerilen çözüm yönü (fix değil):** Noise character transform'unu tek motorun sahiplenmesi. Mevcut GSAP zaten güncel ve bu görev için yeterli; ambient float + high-state reaction aynı GSAP timeline/state sisteminde koreografiye alınabilir veya CSS tamamen sahiplenebilir, fakat ikisi aynı property'yi eşzamanlı sürmemeli.

### FND-4K-008 — “Öğle Teneffüsü” period-chip değeri gerçek 4K'da ellipsis/clipping'e düşüyor

- **Önem:** Orta-Yüksek — doğrudan görünür metin/kozmetik kalite.
- **Dosya/alan:** Ders Akışı kartı; `renderPeriodContext()` tarafından üretilen `.period-context-chip .period-context-value` + ilgili kiosk CSS.
- **State:** Projenin kendi `?gelistirme=1` zaman simülatöründeki `longest-break` / `12:40` — `Öğle Teneffüsü`.
- **Playwright kanıtı:** Gerçek 3840×2160 viewport'ta chip dış kutusu ≈`369.8×97.2px`; iç `strong.period-context-value` alanı ≈`321.8px`, fakat metnin scroll genişliği ≈`370px`. `overflow:hidden` nedeniyle içerik kendi kutusunu aşıyor.
- **Chrome DevTools kanıtı:** Fiziksel 4K emülasyonda değer alanı `clientWidth≈323px`, `scrollWidth≈370px`, `white-space:nowrap`, `overflow-x:hidden`, `text-overflow:ellipsis`, `font-size:48px`. Yani browser açıkça metni ellipsis ile kısaltma durumunda.
- **Karşılaştırma:** Aynı state turunda `1. Ders`, `1. Teneffüs`, `2. Ders`, `Son Ders`, ders öncesi, okul çıkışı ve hafta sonu metinleri countdown kartı sınırları içinde kaldı; sorun uzun `Öğle Teneffüsü` label'ında tetikleniyor.
- **Kullanıcı etkisi:** Öğrencilerin doğrudan okuyacağı dönem adı 4K'nın ana bilgi kartında kısalıyor; ekranın geniş olmasına rağmen metnin ellipsis'e düşmesi düşük kaliteli/yanlış ölçeklenmiş UI hissi yaratıyor.
- **Önerilen çözüm yönü (fix değil):** Bilgiyi kısaltmak yerine chip'in gerçek kullanılabilir metin genişliğini artırmak, optik padding/inner sizing'i yeniden dengelemek veya bu tek uzun label için estetik fluid type/wrap stratejisi kullanmak. Kullanıcı önceliğine uygun olarak metni performans/yer kazanmak için küçültüp sıkıştırmak son tercih olmalı.

### FND-4K-009 — Devamsız öğrenci marquee hızı içerik miktarı arttıkça yaklaşık 10× hızlanıyor

- **Önem:** Yüksek — uzaktan okunabilirlik / kozmetik hareket kalitesi.
- **Dosya/alan:** `public/js/script.js` `updateStats()` devamsız listeyi üç kez tekrar ediyor; `public/css/style.css` `.marquee-content { animation: marquee 25s linear infinite; }`, keyframe `0 → -33.333333%`.
- **Kök neden:** Loop mesafesi gerçek içerik genişliğinin üçte biri olduğu halde animation duration her durumda sabit `25s`. Dolayısıyla öğrenci sayısı/isim uzunluğu arttıkça kayma hızı doğrudan yükseliyor.
- **Playwright gerçek 4K ölçümü:** 1 devamsız öğrenci ≈ **11.1 px/sn**; 4 öğrenci ve uzun isim ≈ **51.8 px/sn**; 8 öğrenci ≈ **109.9 px/sn**. Teorik üçte-bir mesafe/25s hesabı sırasıyla ≈10.9 / 51.9 / 110.3 px/sn ile ölçümü doğruluyor.
- **Chrome DevTools kanıtı:** 8 öğrenci senaryosunda aynı `25s` duration ve ≈ **110.1 px/sn** gerçek transform hızı bağımsız doğrulandı; marquee genişliği ≈8270px. Font size her durumda `26.88px`.
- **Kullanıcı etkisi:** Daha çok öğrenci gelmediğinde, yani okunacak bilgi en fazla olduğunda metin en hızlı akıyor. 55" sınıf TV'sinde uzaktan okuma için bu ters orantı özellikle uzun Türkçe ad/soyadlarda ciddi okunabilirlik ve premium motion sorunu yaratır.
- **Önerilen çözüm yönü (fix değil):** Duration'ı içerik genişliğine bağlayarak yaklaşık sabit **px/sn** hedefi kullanmak; mümkünse hareket hızını okunabilirlik testiyle belirlemek. İçeriği azaltmak veya fontu küçültmek yerine süreyi/loop koreografisini kalite için ölçeklemek.

### FND-4K-010 — Reduced-motion devamsızlık state'inde yalnız ilk isim görünür, diğer devamsız isimler görsel olarak erişilemez kalıyor

- **Önem:** Yüksek — erişilebilirlik + bilgi görünürlüğü.
- **Dosya/alan:** `public/css/kiosk-magic-park.css` global `@media (prefers-reduced-motion: reduce)` + devamsız marquee markup/CSS.
- **Kök neden:** Reduced-motion katmanı bütün animasyonları `0.01ms` ve `1` iteration'a düşürüyor, fakat marquee için hareket yerine statik çok-satırlı/özetlenmiş alternatif layout tanımlamıyor. `.marquee-wrapper` yine dar ve `overflow:hidden`, `.marquee-content` yine tek satır `width:max-content`.
- **Playwright kanıtı:** 8 devamsızlı sentetik state + `prefers-reduced-motion: reduce` altında wrapper yalnız ≈`484px` görünür genişlikte; 8271px'lik liste statik başlangıç konumunda kaldı. İlk kopyadaki sekiz öğrenciden **yalnız ilk uzun isim** viewport ile kesişti; diğer 7 isim wrapper dışında ve hareket olmadığı için hiçbir zaman görünmüyor.
- **Standart bağlamı:** W3C WCAG 2.2 SC 2.2.2 otomatik başlayan, beş saniyeden uzun süren scrolling bilgisi için pause/stop/hide mekanizması ister; W3C ayrıca `prefers-reduced-motion` kullanımını hareketi bastırmak için resmî teknik olarak belgeliyor. Mevcut reduced-motion davranışı hareketi bastırsa da içeriğin tamamını statik olarak görünür hale getirmiyor.
- **Kullanıcı etkisi:** Motion azaltma tercih eden bir öğrenci/öğretmen, kimlerin gelmediği bilgisinin yalnız ilk bölümünü görebilir. Bu bir performans tercihi değil, içerik kaybıdır.
- **Önerilen çözüm yönü (fix değil):** Reduced-motion state'inde tüm devamsız isimleri hareket gerektirmeden erişilebilir kılan ayrı bir layout (wrap/grid/rotating-without-motion/çok satırlı statik düzen) tasarlamak. Normal motion için de WCAG pause/stop/hide gereksinimi ayrıca ürün etkileşim modeliyle değerlendirilmelidir.

### FND-4K-011 — Noise meter “Gürültü/high” state'inde karakter yaklaşık 132px sola kayıyor

- **Önem:** Yüksek — doğrudan görünür 4K konumlama/kozmetik hata.
- **Dosya/alan:** `public/js/noise-meter.js` `changeState()` + legacy `.state-high #noise-character-img @keyframes shake` + Magic Park `#noise-character-img` geometry.
- **Kök neden:** `changeState()` hâlâ eski absolute/`left:50%` layout varsayımıyla inline `translateX(-50%) scale(...)` yazıyor. Magic Park temasında aynı karakter artık `position:relative; left:auto; transform:none` taban geometrisine sahip. High-state legacy `shake` keyframe'i de her karede `translateX(-50%) rotate(...)` kullanıyor. Böylece `%50` translate artık merkezleme değil, karakteri kendi genişliğinin yarısı kadar sola sürükleme haline geliyor.
- **Playwright kanıtı:** Gerçek 3840×2160 state turunda quiet/unavailable başlangıcında karakter wrapper merkezinden ≈`-0.5px`; `changeState('high')` sonrasında center offset ≈ **`-132px`** ve computed transform `translateX` eşleniği ≈`-131.5px`. 250ms sonra da yaklaşık aynı konum korunuyor.
- **Chrome DevTools kanıtı:** Fiziksel 4K emülasyonda başlangıç center offset ≈`-0.4px`; high state anında **`-132px`**, 250ms sonra ≈`-129.6px`. Aynı anda `loud.webp` aktif ve `state-high` class'ı mevcut.
- **Low/medium notu:** Low/medium state girişinde aynı inline `translateX(-50%)` yazılıyor ancak GSAP kısa süre sonra transformu yeniden sahiplenerek karakteri merkeze yaklaştırıyor; bu nedenle geçici drift/jitter olabilir. High state'te `shake` keyframe sürekli aynı yanlış translate'i yazdığı için hata kalıcıdır.
- **Kullanıcı etkisi:** Ses seviyesi “Gürültü”ye geçtiğinde kartın ana maskotu oval/ışık merkezinden belirgin biçimde sola fırlar; 4K ekranda görsel dengenin en dikkat çekici öğelerinden biri bozulur. Bu, premium kalite açısından kabul edilemez bir state değişimidir.
- **Önerilen çözüm yönü (fix değil):** Magic Park geometrisinde `translateX(-50%)` bağımlılığını tamamen kaldırmak ve state morph/shake'i merkez korunarak tek motion owner (tercihen mevcut GSAP state timeline) üzerinden koreografiye almak. Bu çözüm FND-4K-007 ile birlikte ele alınmalı.

### FND-4K-012 — Slideshow caption uzunluğu sınırsız; uzun metin fotoğrafı kaplıyor ve sonunda frame dışına taşıyor

- **Önem:** Yüksek — kullanıcı tarafından üretilebilir kozmetik/layout hata.
- **Dosya/alan:** `public/admin/index.html` `#slideTextContent` textarea + `public/admin/js/slides.js` form submit + `backend/routes/slide-routes.js` `text_content` write + `public/js/script.js` `createSlideCaptionElement()` + Magic Park caption CSS.
- **Kök neden:** Admin textarea'da `maxlength` yok; frontend gönderimde ve backend create/update yolunda görünür bir text-length sınırı yok. Kiosk yalnız karakter sayısına göre iki font-density class'ı seçiyor; `>220` karakterde en küçük `compact` sınıfa geçtikten sonra daha uzun metin için yeni bir layout/limit yok.
- **Playwright 4K stress:** 239 karakter caption sorunsuz; 460 karakter ≈`489px` yükseklikle frame'in yaklaşık %53'ünü; 650 karakter ≈`649px` ile **%70.2**'sini; 900 karakter ≈`864px` ile **%93.3**'ünü kaplıyor. 1200 karakter caption ≈`1185px`, 925px slide frame'in **%128.1**'i ve üstten yaklaşık `291px` frame dışına taşıyor.
- **Chrome DevTools kanıtı:** 1200 karakter sentetik ama UI/backend tarafından izin verilebilir caption'da frame ≈`939px`, caption ≈`1202px` (**%128**); caption üst kenarı slide üstünden ≈`294.5px` dışarı taşıdı.
- **Kullanıcı etkisi:** Uzun bir öğretmen duyurusu veya kural metni slaytın görselini neredeyse tamamen örtebilir; daha uzununda metin doğrudan kırpılır. Bu, 4K'nın sunduğu alanın kaliteli kullanılmaması ve yönetici girişinin kiosk kompozisyonunu bozabilmesi anlamına gelir.
- **Önerilen çözüm yönü (fix değil):** Kiosk için tasarım odaklı içerik sınırı belirlemek; admin tarafında karakter/okuma-süresi göstergesi ve kontrollü limit vermek, uzun içeriği birden fazla slayta bölmek veya gerçek text-only slide layout'u kullanmak. Fontu sonsuza dek küçültmek ya da görseli daha çok kaplamak çözüm olarak tercih edilmemeli.

### FND-4K-013 — Başkan/Nöbetçi/Yıldız boş-state'leri 4K storybook sahnelerine göre ciddi biçimde yetersiz sahneleniyor

- **Önem:** Orta-Yüksek — doğrudan görünür premium çocuk deneyimi / gerçek veri state'i.
- **Tetikleme:** `/api/roles` boş döndüğünde Başkan, Nöbetçi ve Yıldız alanları gerçek empty-state markup'ına geçiyor. Bu durum admin henüz rol atamadığında veya hafta yıldızları seçilmediğinde normal ürün akışında görülebilir.
- **Playwright + Chrome 4K çift kanıtı:**
  - Başkan iç sahnesi ≈`710–714×545–549px`; crown ikonu yalnız ≈`107px`, toplam iç alanın yaklaşık **%2.95**'i.
  - Nöbetçi sahnesi ≈`660–665×454–458px`; clipboard ikonu ≈`107px`, alanın yaklaşık **%3.79**'u.
  - Yıldız sahnesi ≈`794–802×476–481px`; star ikonu ≈`131–132px`, alanın yaklaşık **%4.51**'i.
- **Metin ölçeği:** Başkan/Nöbetçi boş mesajı ≈`29.95px` Fredoka; Yıldız boş mesajı ≈`44px` fakat system Segoe fontunda (**FND-4K-002**).
- **Görsel semptom:** Çok zengin treehouse/clubhouse/award shell'lerin ortasında küçük legacy prop + tek satır/kısa mesaj kalıyor. Veri dolu state'lerde “özel sınıf vitrini” gibi görünen sağ sütun, empty state'te **tamamlanmamış placeholder** hissine düşüyor.
- **Kök neden:** Magic Park override `.role-empty-state` container'ı 100% dolduruyor ama icon clamp'ını yaklaşık `2.8cqw` / max `6.7rem` seviyesinde bırakıyor; ayrı sahne kompozisyonu, illustration hierarchy veya role-specific empty art yok. Stars tarafı ise daha eski `.no-stars-*` sistemi üzerinde kalıyor.
- **Önerilen çözüm yönü (fix değil):** Her rol alanı için aynı storybook shell'e ait kasıtlı boş sahne: daha büyük prop/rozet veya sakin mini illustration, sıcak ama kısa mesaj, gerekirse “öğretmen henüz seçmedi” hissini veren bekleme metaforu. Generic loading/placeholder UI'ya dönülmemeli; ek etkileşim şart değil.
- **MP2-C düzeltme sonucu — RESOLVED (10 Ağustos 2026):** Başkan/Nöbetçi/Yıldız empty-state'leri role-specific storybook yüzeylere dönüştürüldü; ikon clamp'i `5.8cqw / 14rem` seviyesine çıkarıldı, title Fredoka + support copy Nunito olarak tek typography sistemine bağlandı. Başkan implicit grid-track daralması ayrıca RED→GREEN ile `grid-template-columns:minmax(0,1fr)` üzerinden kapatıldı. Playwright + Chrome üç çözünürlükte empty yüzeyler parent genişliğini tam dolduruyor, `emptyOverflow=[0,0]` ve tüm icon/title/message rect'leri kendi yüzeylerinin içinde.

### FND-4K-014 — No-slides fallback `tribute.webp` 4K theatre alanında kaynak çözünürlüğünün üstünde render ediliyor

- **Önem:** Orta — koşullu asset keskinliği / premium fallback kalite.
- **Kaynak:** `public/assets/tribute.webp` = **1024×1024**.
- **4K runtime:** Empty-slides fallback theatre frame ≈`1518–1526px` genişliğinde. Mevcut `cover` bug'ı nedeniyle görsel yatayda yaklaşık **1.48× upscale** ediliyor; ardından dikeyde ≈37.9% kırpılıyor (**FND-4K-003**).
- **Kullanıcı etkisi:** Normal Atatürk fallback slide seti 2752–3168px kaynaklardan oluşurken, “slayt yok” güvenli fallback'i daha düşük detaylı bir kaynağa düşüyor. Büyük merkez sahnede bu kalite geçişi fiziksel 4K panelde daha görünür olabilir.
- **Önerilen çözüm yönü (fix değil):** No-slides fallback için aynı küratörlü yüksek çözünürlüklü art setinden bir 4K-uygun master kullanmak; önce `contain` bug'ını düzeltip gerçek render politikasını netleştirmek. Düşük çözünürlüğü performans gerekçesiyle korumak önerilmez.

### FND-4K-015 — Roles API cold-start hatasında sağ sütundaki üç ana rol sahnesi tamamen boş kalıyor

- **Önem:** Yüksek — kiosk resilience + doğrudan görünür premium kalite.
- **Tetikleme:** Sayfa ilk açılışında `/api/roles` başarısız/500 döndüğünde. Yalnız “gerçekte rol atanmamış” empty-state ile aynı durum değildir.
- **Playwright izole kanıt:** Yalnız `/api/roles=500` yapılırken `/api/stats` geçerli veri döndürdü ve slideshow normal çalıştı. Buna rağmen `#president-container`, `#duty-container`, `#stars-container` üçünde de `children=0`, görünür metin **boş** kaldı. Stats aynı anda doğru biçimde `7 / 8 / 1 ÖĞRENCİ YOK` gösterdi; dolayısıyla sorun role-fetch failure'a izole edildi.
- **Chrome çift kanıt:** Roles + stats + slides 500 cold-start state'inde Başkan iç sahnesi ≈`714×549px`, Nöbetçi ≈`665×458px`, Yıldız ≈`802×481px`; üçünde de çocuk sayısı `0` ve hiçbir fallback mesaj/prop yok. 4K screenshot'ta yalnız boş treehouse/blue clubhouse/pink portal shell'leri görünüyor.
- **Karşılaştırma:** `/api/roles=[]` başarılı yanıt verdiğinde aynı üç alan en azından tasarlanmış empty-state mesaj/ikonlarını üretir (**FND-4K-013**). Yani “boş veri” ve “veri alınamadı” yolları görsel olarak farklı; hata yolu tasarımsız kalıyor.
- **Kök neden:** `fetchData()` roles sonucunu `if (!roles || !Array.isArray(roles)) { ... return; }` ile erken sonlandırıyor. Başkan/Nöbetçi/Yıldız empty-state markup'ı yalnız **geçerli array** geldikten sonra ilgili role bulunamadığında üretiliyor; cold-start error/null için ayrı render yolu yok.
- **Slideshow karşı örneği:** `/api/slides/active` 500 olsa bile slideshow kendi fallback'ini kuruyor ve merkez sahne tamamen boş kalmıyor. Role alanlarının da benzer bir “calm designed fallback” davranışı olmalı.
- **Kullanıcı etkisi:** Backend/DB/API kısa süreli sorunla açıldığında ekranın sağ %25.5'lik kanadı üç büyük boş çerçeveye dönüşür. Çocuk dashboard'unda bu, teknik hata mesajından kaçınsa da “bozulmuş/tamamlanmamış ekran” algısı yaratır.
- **Önerilen çözüm yönü (fix değil):** Cold-start role failure için teknik hata metni göstermeden, mevcut storybook dünyasında sakin bir geçici fallback kullanmak; örn. rol bilgileri yüklenemediğinde neutral “sınıf ekibimiz birazdan burada” sahnesi. Daha önce geçerli role DOM'u varsa transient refresh hatasında mevcut içeriği korumak tercih edilmelidir.
- **MP2-C düzeltme sonucu — RESOLVED (10 Ağustos 2026):** Cold-start invalid/error roles yolu artık üç sahneyi boş bırakmak yerine teknik hata dili göstermeyen role-specific calm fallback üretir (`Sınıf ekibimiz birazdan burada`, `Yardımcı ekibimiz birazdan burada`, `Yıldız sahnesi birazdan parlayacak`). Daha önce render edilmiş geçerli role DOM'u varsa transient failure'da korunur. Unit regression + Playwright gerçek `/api/roles=500` cold-start ve Chrome aynı fallback markup/computed-style kabulü tamamlandı.

### FND-4K-016 — Galeride tam 1 aktif slayt varsa kendi kendisiyle transition yapıp görünmez oluyor

- **Önem:** **Kritik/Yüksek** — merkez hero sahnesi tamamen kayboluyor; gerçek ürün state'i.
- **Tetikleme:** `/api/slides/active` geçerli olarak tam **1 slayt** döndürdüğünde. Medyanın bozuk olması gerekmiyor; geçerli `2816×1536` Atatürk görseliyle izole edildi.
- **Playwright izole kanıt:** Tek geçerli image slide, `display_duration=1200ms`, `transition_duration=700ms` ile:
  - ilk ≈600ms: `class="slide active slide--media"`, `display:block`, computed `opacity:1`, görsel doğal `2816×1536`;
  - döngü tamamlandıktan sonra ≈3s: `class="slide slide--media"`, `display:block`, computed **`opacity:0`**. Görsel DOM'da ve `display:block` olsa da parent slide görünmez.
- **Chrome çift kanıt:** Aynı tek-slide fixture'da transition sırasında aynı eleman hem `is-transitioning-out` hem `is-transitioning-in` sınıflarını taşıdı; sonrasında `active` kalktı ve computed **`opacity:0`** kaldı.
- **Kök neden:** `scheduleNextSlide()` yalnız `slidesData.length === 0` kontrolü yapıyor; tek slaytta da timeout planlıyor. `nextSlide()` içinde `nextIndex = (currentSlideIndex + 1) % slidesData.length` ⇒ `(0+1)%1 = 0`; `currentSlideElement` ve `nextSlideElement` **aynı DOM elemanı** oluyor. Kod aynı node'u hem outgoing hem incoming olarak animasyonluyor, sonra `currentSlideElement.classList.remove('active')` ile tek slide'ın görünürlük sınıfını kaldırıyor. Base `.slide { opacity:0 }`, `.slide.active { opacity:1 }` olduğu için merkez sahne kayboluyor.
- **Görsel etkisi:** Ekranın en büyük tek alanı olan slideshow viewport'un ≈`%28.94`ünü kaplıyor (**ART-4K-010**). Bu alanın boş/siyah hale gelmesi tüm premium çocuk dashboard algısını dramatik biçimde bozar.
- **Önerilen çözüm yönü (fix değil):** `slidesData.length === 1` durumunda rotation/transition planlamamak; tek slide'ı sürekli aktif ve görünür tutmak. Video ise kendi autoplay/end davranışı ayrı değerlendirilmelidir. Regression test mutlaka “exactly one image slide remains visible beyond its display_duration” senaryosunu kapsamalı.

### FND-4K-017 — Tek bir image asset 404 olduğunda o slaytın gösterim süresi boyunca merkez theatre tamamen boş/siyah kalabiliyor

- **Önem:** Yüksek — hero content resilience / doğrudan görünür premium kalite.
- **Tek-slide bug'dan ayrıştırma:** Test **iki aktif slayt** ile yapıldı; ilk slaytın image path'i bilinçli 404, ikinci slayt geçerli `ataturk-1.webp`. Dolayısıyla FND-4K-016'nın “tek slide self-transition” kök nedeni bu bulguya karışmıyor.
- **Playwright 4K kanıtı:** İlk bozuk slaytta `activeId=9201`, parent opacity `1`; image `display:none`, `naturalWidth=0`; blurred backdrop `display:none`; `captionCount=0`; görünür metin boş. Theatre frame ≈`1524.7×946.6px`, arka plan yalnız `rgb(29,32,38)`.
- **Chrome çift kanıt:** İlk slayt 60sn display duration ile sabitlendiğinde `class="slide active slide--media"`, opacity `1`; bozuk image `display:none`, backdrop `none`, caption `0`, text boş; frame yine koyu `rgb(29,32,38)` yüzey.
- **Kök neden:** `createSlideElement()` image `onerror` handler'ı hatayı loglayıp `backdrop.style.display='none'` ve `img.style.display='none'` yapıyor; o slide için poster/placeholder/skip/fallback media render etmiyor. Caption yalnız `text_content` varsa vardır; opsiyonel olduğundan boş olabilir.
- **Kullanıcı etkisi:** Admin kaydı mevcut fakat dosya silinmiş/bozulmuş/path kırılmışsa ekranın en büyük görsel alanı o slide'ın tüm `display_duration` süresi boyunca boş siyah panel haline gelebilir. Çocuk dashboard'unda bu “sinematik sakinlik” değil, açık biçimde bozulmuş içerik hissidir.
- **Önerilen çözüm yönü (fix değil):** Image load failure'da aynı Magic Park theatre dili içinde kasıtlı media fallback/skip politikası: mümkünse bozuk slide'ı atlayıp sıradaki sağlam içeriğe geçmek; tek/son içerikse yüksek çözünürlüklü curated fallback scene göstermek. Teknik hata metni öğrenci ekranına taşınmamalı.

### Noise microphone error-state kozmetik checkpoint'i — PASS + rafinasyon

- `NotFoundError`, `NotAllowedError`, `NotReadableError/Abort` ve generic unknown error için tanımlı kısa Türkçe mesajlar kaynakta ayrı state'lere sahip.
- Chrome 4K'da dört metin varyantında status surface ≈`1147×102px`; başlık ≈`40.32px`, subtitle ≈`25.73px`, `Tekrar Dene` ≈`326×65px`; text overflow/clipping **yok**.
- Playwright 4K kabulünde test edilen hata copy'lerinde status overflow **yok**, retry button görünür kalıyor.
- Yeni layout bug doğrulanmadı. Rafinasyon ihtiyacı mevcut bulgulara bağlı: subtitle system-font adası (**FND-4K-002**) ve `quiet.png` ikinci çocuk-yüzü karakterinin ana plush maskotla art-direction çatışması (**ART-4K-007**).
- Bu nedenle hata metinlerini kısaltmak veya butonu küçültmek gerekmiyor; Magic Park 2.0'da yalnız aynı maskot/material evrenine taşınması yeterli.

**CP-029 — Microphone + slide media failure checkpoint'i.** Mikrofon permission/device error copy'leri 4K'da taşmadan PASS; tek image 404 senaryosu iki-slide fixture ile FND-4K-017 olarak doğrulandı. Tek geçerli slide self-transition FND-4K-016 ayrıca çift-browser doğrulandı. Ürün kodu değiştirilmedi. Sıradaki odak: öğrenci avatarı yüklenemezse default fallback'in 4K kalitesi ve role-card empty/photo fallback tutarlılığı.

### Öğrenci fotoğrafı load-fallback checkpoint'i — PASS

- Başkan, yardımcı, dört nöbetçi ve aktif yıldız portreleri runtime'da bilinçli 404'e zorlandı; gerçek inline `onerror` yolu çalıştırıldı.
- **Playwright + Chrome çift kanıt:** Tüm role avatarları cinsiyete göre `assets/default_girl.png` veya `assets/default_boy.png` kaynağına geçti; her iki default asset de doğal **1024×1024**.
- 4K role render boyutları fallback sonrasında da korundu:
  - President ≈`219×219px`
  - Vice ≈`98×98px`
  - Duty ≈`109×109px`
  - Star ≈`361×361px`
- En büyük star renderında bile 1024px kaynak yaklaşık 2.8× sampling payı sunuyor; yeni raster keskinlik problemi doğrulanmadı.
- Circle/rounded-square border, shadow ve role hiyerarşisi bozulmadı; `object-fit:cover` square default source'larla güvenli çalışıyor.
- Görsel değerlendirme: Default avatarlar gerçek öğrenci fotoğrafının aidiyet değerini doğal olarak vermez; fakat parlak/3D çocuk karakter dili Magic Park'ın toy-icon dünyasıyla uyumlu bir **geçici fallback**. Gerçek fotoğraflar mevcutsa onların yerine kullanılmaları önerilmez (**ART-4K-009**).
- **Karar:** Default avatarları değiştirmek şu an Tier A/B görsel öncelik değil. Önce role-card materyali, empty-state ve gerçek fotoğraf frame'leri yükseltilmeli.

**CP-030 — Avatar fallback checkpoint'i.** Gerçek öğrenci görselleri 404 edildiğinde default boy/girl fallback'i 4K'da çözünürlük, frame ve layout açısından PASS. Ürün kodu değiştirilmedi. Sıradaki derinleştirme: genel ekranın contrast/tekstür/ışık dengesi, 4K artwork üretim standardı ve Magic Park 2.0 mockup brief'inin somutlaştırılması.

### Kiosk launcher / browser kalite checkpoint'i

- `start.sh` Chromium/Chrome için yalnız `--kiosk --app=http://localhost:3000` kullanıyor; 4K raster/detail kalitesini zorla düşüren `force-device-scale-factor`, zoom, software-raster/low-end vb. kalite flag'i yok.
- Repo `AI_PROJECT_CONTEXT.md` gerçek Chromium üzerinde 3840↔1920 resize, reduced-motion, fullscreen ve titlebar overflow kabulünün yapıldığını; **gerçek 55" 4K TV kabulünün hâlâ açık** olduğunu açıkça belirtiyor.
- `start.sh` Chromium/Chrome yoksa Firefox'a fallback ediyor; buna karşılık mevcut premium görsel kabul Chromium tabanlı Playwright + Chrome DevTools üzerinde. Bu nedenle production cihazda Chromium/Chrome kurulumu **deployment acceptance** maddesi olarak kesinleştirilmeli; görsel kalite farklı browser engine seçimine tesadüfen bırakılmamalı.
- Firefox desteği ayrıca istenirse ayrı browser kabulü yapılmalı; mevcut çalışma Firefox'ta “aynı görünüyor” varsayımı yapmayacak.
- **Karar:** Launcher tarafında performans uğruna görsel kalite kısıntısı doğrulanmadı; gerçek HDMI scaling/overscan/TV gamma/sınıf ışığı maddeleri fiziksel kapıda kalıyor.

## Magic Park 2.0 — 4K artwork üretim standardı

### ART-4K-016 — Yeni shell yalnız daha büyük bir bitmap değil, production master olarak yeniden kurulmalı

- Mevcut `kiosk-magic-park-shell.webp` dosyası **419 KB**, `1672×941`, klasik WebP **VP8 lossy** encoding. Bu, taslak/orta çözünürlük kullanımında verimli olsa da fullscreen 4K ana sanat katmanı için kalite tavanını belirliyor (**FND-4K-001**).
- Yeni shell için hedef yalnız `3840×2160` export almak olmamalı. **Kaynak/master** mümkünse katmanlı veya vektör destekli; raster master kullanılacaksa tercihen **7680×4320 (8K)** veya benzeri yüksek çözünürlüklü çalışma dosyası olmalı. 4K deployment asset'i bu master'dan downsample edilerek üretilmeli.
- Master dosya repo runtime asset'i olmak zorunda değildir; fakat yeniden export/redesign için kalıcı production source olarak saklanmalıdır.

### 4K shell geometri sözleşmesi — korunacak

- Canvas: **16:9**.
- Ana kolon geometri referansı: **27% / 47.5% / 25.5%**.
- Merkez iç bölüm: center column içinde mevcut `65.1% / 34.9%` alt ayrım ve 39.1/60.9 row mantığı runtime DOM ile çakışmayacak şekilde artwork safe-zone olarak korunmalı.
- Sağ kolon row mantığı mevcut yaklaşık `39.1 / 31.2 / 29.7` oranlarını korumalı; yeni ağaç/clubhouse/portal artwork'ü içerik safe-area'larını daraltmamalı.
- Titlebar tabelalarının **görsel yüzeyi artwork'te**, metni DOM'da kalmalı. Yazı raster shell içine gömülmemeli; böylece metin 4K'da vektör/font keskinliğinde kalır ve lokalizasyon/değişiklik güvenli olur.

### 4K art safe-zone kuralları

- Kritik yüz/ikon/metin alanlarının arkasında yüksek frekanslı yaprak/çiçek/texture kalabalığı azaltılmalı; çevresel dekor kenarlarda yoğunlaşabilir.
- Her kartın iç “content well” alanı artwork'te yeterli sakin ton farkına sahip olmalı; DOM paneli okunabilirlik için gereksiz ekstra beyaz kutular üretmeye zorlanmamalı.
- Dekoratif nesneler content well içine taşmamalı; özellikle long-name / caption / timer maksimum state'leri safe-area referansı olmalı.
- 55" panelde dekor çizgileri aşırı ince olmamalı; 4K'da yalnız birkaç fiziksel piksele düşen mikro stroke/texture yerine okunabilir hacim ve silhouette tercih edilmeli.

### Işık / materyal standardı

- Tüm dış shell aynı “dünya ışığı”na ait görünmeli: sıcak üst/ön ana ışık + yumuşak hacim gölgesi önerilen mevcut yön.
- Wood, painted enamel, foliage, fabric/theatre, toy-plastic ve magical glow farklı materyaller olabilir; **ışık yönü ve gölge yumuşaklığı ortak** olmalı.
- Premiumluk adına photoreal PBR materyal hedeflenmemeli; mevcut stil **yüksek kaliteli stylized 3D/storybook** olarak korunmalı.
- Çok parlak specular yalnız toy-icon / award / küçük magic accent'te; büyük panel gövdelerinde daha mat yüzey kullanmak metin okunurluğunu artırır.

### Renk standardı

- Mevcut yüksek doygunluk korunmalı; çocuk kimliği desatüre edilmemeli (**ART-4K-003**).
- Ana asset export'ları browser/TV tutarlılığı için standart **sRGB** pipeline'da doğrulanmalı; farklı asset paketlerinden gelen renk profilleri nedeniyle bir kartın beklenmedik daha neon/daha soluk görünmesine izin verilmemeli.
- Saturation bütçesi: dış shell canlı; content wells biraz daha sakin; award/star ve functional warning state'leri en yüksek vurgu. Böylece bütün ekran canlı kalırken bilgi katmanı nefes alır.

### Raster/export kalite standardı

- Runtime shell için öncelik **görsel fidelity**. Lossy WebP kullanılacaksa kalite değeri dosya boyutuna göre değil 4K screenshot/pixel-peep kabulüne göre seçilmeli.
- Sharp painted edge + küçük dekor detayında compression ringing/banding görünüyorsa **lossless WebP/PNG veya daha yüksek kalite** tercih edilmeli; birkaç MB daha büyük asset premium kalite uğruna kabul edilebilir.
- Export sonrası mutlaka gerçek `3840×2160` browser render screenshot'ı ile native source yan yana karşılaştırılmalı; yalnız asset viewer'da güzel görünmesi yeterli değil.
- “4K asset” etiketi yalnız pixel dimension değil: keskin outline, temiz alpha, banding olmayan gradient, doğru sharpening ve oversharpen halo içermeyen downsample anlamına gelmeli.

### Layering önerisi — yeni framework gerektirmez

- Mümkün olduğunda tek dev raster içinde her şeyi bake etmek yerine:
  - base environment/shell,
  - birkaç CSS/SVG/PNG decorative foreground accent,
  - DOM content,
  - kontrollü GSAP ambient layer
  ayrımı düşünülebilir.
- Bu yaklaşım hem 4K keskinliği hem motion parallax/seasonal variation için esneklik sağlar; React/Rive zorunlu değildir.
- Rive/SVG ancak gerçekten animasyonlu mascot/prop ihtiyacı olan küçük bölgelerde değerlendirilmeli; tüm dashboard'u yeni runtime'a taşımak önerilmiyor.

### Mockup üretim brief'i — ilk dört kritik yüzey

1. **Sınıf Mevcudu** — garden shell korunacak; generic white card yerine storybook paper + toy badge sistemi.
2. **Noise** — mascot boyutu büyütülecek; meter/equalizer tek reaktif sahneye entegre; ikinci yüz-karakter kaldırılacak/semantik icon'a dönecek.
3. **Başkan + Nöbetçiler** — treehouse/lodge shell korunacak; personel-card değil hanging plaque / helper badge materyali.
4. **Ders Akışı** — active class ve after-school aynı ailede fakat state'e özel mini scene; timer hero korunacak.
- Her mockup tam **3840×2160 kompozisyon içinde** görülmeli; kartı crop edip tek başına değerlendirmek renk/odak yarışını gizler.
- En az iki varyant hazırlanmalı: “daha sıcak storybook” ve “daha parlak toy/collectible”; kullanıcıyla görsel seçim yapıldıktan sonra kodlama yönü kilitlenmeli.

**CP-031 — Kiosk launcher + 4K art production standard checkpoint'i.** Chromium production hedefi ve fiziksel TV kalite kapısı yeniden doğrulandı; Magic Park 2.0 shell geometri/safe-zone/ışık/renk/export/layering standardı yaşayan envantere eklendi. Ürün kodu değiştirilmedi. Sıradaki derinleştirme: current 4K screenshot üzerinde optik denge/kontrast/texture yoğunluğu ve mockup varyantlarının hangi görsel unsurları kesinlikle koruması gerektiği.

## Magic Park 2.0 — görsel karakter koruma sözleşmesi

### ART-4K-017 — Ekranın imzası “sekiz kart” değil, sekiz küçük mekân hissi; korunmalı

- **Günün Zamanı:** gökyüzü + ahşap kemer + güneş/bulut karakterleri.
- **Sınıf Mevcudu:** çiçekli/yeşil sınıf bahçesi.
- **Ders Akışı:** mor okul kulübesi / kitap-lamba-prop sahnesi.
- **Sınıfın Ses Dengesi:** turkuaz müzikli bahçe/laboratuvar hissi.
- **Sınıfımızdan:** kırmızı perdeli tiyatro / hikâye sahnesi.
- **Sınıf Başkanı:** ağaç ev / kupa / liderlik köşesi.
- **Nöbetçiler:** mavi clubhouse / çanta-çan-merdiven yardımcı ekip köşesi.
- **Haftanın Yıldızları:** pembe magical portal / ödül sahnesi.
- Bu mekânsal metaforlar düz `Card` component'lerine indirgenmemeli. Redesign'ın amacı onların **içini daha kaliteli** yapmak, mekân kimliğini silmek değildir.

### Kesin korunacak büyük motifler

- Ahşap/painted-frame tabelalar ve titlebar'ların shell'e entegre olması.
- Güneş, bulut, yıldız, çiçek, yaprak, kitap, lamba, merdiven, çanta gibi **okul + park prop dili**.
- Büyük merkezi tiyatro penceresi.
- Öğrenci fotoğraflarının gerçek içerik olarak kullanılması.
- Yıldızlar kartındaki büyük portre + award glow hiyerarşisi.
- Saatin çok büyük, eğlenceli ve uzaktan okunur olması.
- Kartların birbirinden renk olarak ayrılması fakat tek dünya ışığını paylaşması.
- Fredoka display karakteri ve yumuşak/yuvarlak tipografik kişilik.

### Değiştirilebilir / yükseltilebilir katmanlar

- İç beyaz/pale rounded surfaces, role name plakaları, status/meter panelleri.
- Legacy empty-state prop seti.
- Caption materyali.
- Ambient spark yoğunluğu/koreografisi.
- Role-card frame materyali.
- Noise mascot ölçeği ve iç composition.
- Ders Akışı state-specific illüstrasyonları.
- Shadow/depth token reçeteleri.
- Background shell kaynak çözünürlüğü ve katman yapısı.

### “Premium yaparken yapılmaması gerekenler”

- Dış shell'i kaldırıp beyaz/gri modern grid kurmak.
- Pastel/renk sayısını azaltıp kurumsal lacivert-gri palette geçmek.
- 3D toy ikonları monochrome outline ikonlarla değiştirmek.
- Gerçek öğrenci fotoğraflarını avatarlaştırmak.
- Bütün kartlara aynı radius, aynı shadow ve aynı beyaz body uygulamak.
- Cam-ofis/glassmorphism'i ana materyal yapmak.
- Büyük slideshow'u küçültüp tüm kartları eşitlemek.
- “Temiz” görünüm uğruna çiçek, ağaç, kitap, oyuncak ve award motiflerini topluca silmek.
- Çocuk hissi için ters yönde her boşluğa yeni sticker/sparkle/emoji eklemek; dekor yalnız mekân ve anlamı desteklediği yerde kullanılmalı.

### ART-4K-018 — Mevcut dekor yoğunluğunun ana prensibi doğru: kenarlar zengin, content wells sakin

- Mevcut shell'de çiçek/yaprak/prop yoğunluğu büyük ölçüde kart sınırları, frame kenarları ve kolon geçişlerinde toplanıyor; metin/medya merkezleri görece sakin kalıyor.
- Bu yöntem premium çocuk dashboard için doğru: **çevrede hikâye, merkezde okunabilirlik**.
- Yeni yüksek çözünürlüklü redraw sırasında 8K detay kapasitesi “her boş pikseli küçük nesneyle doldurma” şeklinde kullanılmamalı. 4K master daha çok keskinlik ve materyal derinliği getirmeli; mutlaka daha fazla obje getirmemeli.
- Özellikle Stats/Noise/Duty gibi zaten bilgi yoğun kartlarda yeni shell mikro-dekoru artırmak yerine iç surface karakteri yükseltilmeli.

### ART-4K-019 — Ana merkez/kanat optik dengesi korunmalı

- Slideshow'un koyu/medya ağırlıklı merkezi, çevredeki parlak storybook shell'e karşı güçlü kontrast yaratıyor ve gözün doğal olarak ortaya gitmesini sağlıyor.
- Sol kolon büyük saat ve yüksek sayısal kontrastla ağırlık üretiyor; sağ kolon gerçek öğrenci yüzleri ve award renkleriyle bunu dengeliyor.
- Bu denge yeni mockup'ta bozulmamalı: sağ role kartlarını premiumlaştırırken slideshow ile yarışacak kadar glow/contrast verilmemeli; Stats/Duty gibi operasyonel bilgi kartları ana hero seviyesine çıkarılmamalı.
- Noise card merkez üstte büyük alan kapladığı için maskot büyütülebilir, fakat active equalizer + mascot + title birlikte slideshow'dan daha baskın hale gelmemeli.

### Non-16:9 görsel uzatma yönü — CAND-4K-004 için art-direction çözümü

- 16:9 stage geometrisi **stretch edilmemeli**; bu ana kompozisyonun doğruluğunu bozar.
- Farklı oran/overscan/browser chrome durumunda düz `#159ce1` bant yerine shell'den türetilmiş **ambient sky/soft gradient/blurred environment extension** düşünülebilir.
- Bu outer extension bilgi taşımamalı; yalnız sahnenin dışındaki atmosferi devam ettirmeli. Böylece 16:9 iç dünya korunurken letterbox premium görünür.

### Mockup değerlendirme kontrol listesi

Her öneri tam ekran 4K karşılaştırmada şu sorularla kabul edilmeli:

1. İlk bakışta hâlâ **çocukların Sihirli Pano'su** mu, yoksa tasarım dashboard template'ine mi dönüştü?
2. Slideshow hâlâ ilk büyük odak mı?
3. Saat 3m mesafeden bir bakışta okunuyor mu?
4. Öğrenci yüzleri küçük widget detayına dönüşmeden görünür mü?
5. Her kartın kendi “mekânı” hâlâ anlaşılır mı?
6. İç yüzeyler shell kadar özel mi, yoksa beyaz web card gibi mi?
7. Aynı anda kaç yüksek-dikkat hareket var?
8. Renkler canlı ama metin/face alanları sakin mi?
9. Empty/error state normal state kadar bitmiş mi?
10. Ekran “daha modern” görünmekten çok **daha iyi yapılmış** mı görünüyor?

**CP-032 — Magic Park görsel karakter koruma checkpoint'i.** Sekiz mekân metaforu, korunacak motifler, yasak kurumsallaştırma yönleri, dekor yoğunluğu ve optik denge sözleşmesi yaşayan envantere eklendi. Ürün kodu değiştirilmedi. Sıradaki çalışma: mevcut envanteri risk/öncelik açısından konsolide etmek, premium redesign mockup dalgası için kesin brief'i hazırlamak ve hâlâ test edilmemiş 4K edge-state'leri varsa kapatmak.

### ART-4K-015 — Empty/error state kalite standardı normal state kadar yüksek olmalı

- Premium çocuk dashboard için “veri yok”, “henüz seçilmedi”, “API ulaşılamadı”, “mikrofon yok” ve “slayt yok” durumları ayrı ürün state'leri olarak sanat yönetilmelidir.
- **Henüz seçilmedi:** neşeli/sakin role-specific prop + sıcak mesaj (**FND-4K-013**).
- **API geçici hata:** teknik hata kelimesi yerine tasarlanmış neutral bekleme sahnesi; ekran bozuk görünmemeli (**FND-4K-015**).
- **Slayt yok:** güçlü yüksek çözünürlüklü curated fallback; crop/low-res olmamalı (**FND-4K-003/014**).
- **Mikrofon yok/izin yok:** mevcut Noise state'i işlevsel; ileride maskot merkezli Magic Park 2.0 sahnesine dahil edilmeli.
- Bu state'leri yalnız opacity azaltılmış ikon + küçük metinle geçirmek yerine, her kartın mevcut shell metaforunu kullanan **kasıtlı sakin sahne** yaklaşımı tercih edilmeli.

**CP-028 — Empty/error/cold-start state checkpoint'i.** Roles-empty, roles-API-failure, stats/API failure ve slideshow API failure state'leri 4K Playwright + Chrome ile ayrıştırıldı. FND-4K-003 fallback kapsamı genişletildi; FND-4K-013/014/015 eklendi. Ürün kodu değiştirilmedi. Sıradaki odak: mikrofon permission/error varyantları, slideshow media-load failure ve öğrenci fotoğrafı load-fallback gibi asset/runtime edge-state'lerin kozmetik kabulü.

Mevcut kiosk regresyon testleri 49/49 geçti; bu sonuç browser 4K kabulünün yerine geçmez ve FND-4K-001'i yakalamamaktadır.

## Aday bulgular

### CAND-4K-001 — Kiosk presentation sınıfı hiç aktive edilmiyor; uygulama seviyesinde cursor-hide garantisi yok

- **Önem:** Orta — kiosk kozmetik bütünlük / presentation hygiene.
- **Dosya/alan:** `public/css/kiosk-mode.css`, `public/index.html`, `public/js/*`, `start.sh`.
- **Kod gerçeği:** `kiosk-mode.css` imleci yalnız `body.kiosk-mode { cursor: none; }` ile gizliyor ve seçim davranışını yalnız bu sınıf altında kapatıyor. `public/index.html` body sınıfı `magic-park-theme`; repo aramasında `kiosk-mode` sınıfını runtime'da ekleyen JS bulunmadı. `start.sh` Chromium'u `--kiosk --app=http://localhost:3000` ile açıyor ancak DOM sınıfı eklemiyor.
- **Chrome DevTools runtime kanıtı:** `bodyClass = "magic-park-theme"`, `bodyCursor = auto`, `bodyUserSelect = auto`, `.kiosk-mode` match = false.
- **Playwright destekleyici kanıt:** Önceki gerçek 4K runtime ölçümünde body class yalnız `magic-park-theme` olarak raporlandı.
- **Risk:** Tarayıcı/OS kendi kendine cursor-hide sağlamazsa 55" kiosk ekranında mouse pointer kalabilir; metin seçimi/yanlış interaction görsel bütünlüğü bozabilir. Tarayıcı kiosk modunun platforma göre davranışı değişebileceği için uygulama seviyesinde garanti yok.
- **Neden henüz doğrulanmış ürün hatası değil:** Gerçek `start.sh` + fiziksel display/mouse kabulü bu oturumda henüz yapılmadı; bazı kiosk ortamları cursor davranışını tarayıcı/OS seviyesinde ayrıca değiştirebilir.
- **Önerilen doğrulama:** GUI kiosk launch veya fiziksel TV kabulünde imleci hareketsiz/hareketli durumda gözlemek; app-level sınıf ownership kararını ayrıca incelemek.

### CAND-4K-002 — Sağ sütundaki ikincil öğrenci isimleri 55" uzaktan okuma için küçük/yoğun olabilir

- **Önem:** Orta — kozmetik hiyerarşi / uzaktan okunabilirlik; fiziksel TV kabulü gerekli.
- **4K ölçüm:** Gerçek Playwright 3840×2160 viewport'ta vice-president isimleri ≈ `25.34px`, duty isimleri ≈ `24.58px`; ana president adı ≈ `34.56px`, star adı ≈ `39.55px`, sağ sütun titlebar ≈ `49.15px`.
- **Uzun isim örneği:** `Emir Can Özdemir Yıldırımoğlu` duty alanında yaklaşık `168×94px` kutuya çok satırlı yerleşiyor; clipping oluşmuyor ancak küçük puntolu yoğun bir blok haline geliyor.
- **Dış tasarım referansı:** Güncel Android TV tasarım rehberi TV arayüzünü yaklaşık 3 m / 10 feet izleme koşulunda ele alıyor ve daha büyük, bir bakışta okunabilen tipografiyi önceliklendiriyor. Bu nedenle mevcut küçük rol metinleri otomatik olarak “hata” sayılmasa da fiziksel sınıf mesafesinde özellikle test edilmeli.
- **Önerilen yön (fix değil):** Bilgi miktarını kırpmadan role-card hiyerarşisini yeniden ölçekleme, portre/metin oranını yeniden dengeleme veya uzun isimler için daha estetik bir tipografik düzen düşünmek. Performans uğruna puntolar küçültülmemeli.
- **4K stress sonucu:** Mevcut gerçek uzun nöbetçi adı `Emir Can Özdemir Yıldırımoğlu` ve ayrıca daha uzun Türkçe başkan/yardımcı/yıldız örnekleri Playwright'ta wrap ile kendi container'larına sığdı; `scrollWidth/clientWidth` veya `scrollHeight/clientHeight` kaynaklı gerçek clipping üretilmedi. Bu nedenle adayın niteliği artık daha nettir: problem olursa **clipping değil fiziksel mesafeden optik okunabilirlik/density** olacaktır.
- **MP2-C otomasyon sonucu:** Yardımcı isimleri 4K'da ≈`26.88px`, normal duty isimleri ≈`26.11px` seviyesine çıkarıldı; uzun duty örneği ≈`24.58px` korunurken metin alanı yaklaşık `168px → 185px` genişledi. Üç browser çözünürlüğünde clipping yok. Aday **kapanmadı**; 55" panelde 2.5–3.5m fiziksel göz testi hâlâ gereklidir.

### CAND-4K-003 — Slideshow theatre oranı mevcut standart-yatay slaytların tamamında sürekli %10–12 yatay crop üretiyor

- **Önem:** Orta — kozmetik kompozisyon / art direction; mevcut görseller için görsel kabul gerekli.
- **4K ölçüm:** Slideshow iç frame aspect ratio ≈ **1.611**. Aktif fallback görsellerin altısı ≈`1.792–1.833` oranında; `cover` ile çizildiklerinde hesaplanan toplam yatay kaynak kaybı yaklaşık **%10.1–%12.1**.
- **Çift-browser kanıtı:** Playwright gerçek 3840×2160 ve Chrome 4K fiziksel emülasyon aynı frame oranını ve slide bazlı crop yüzdelerini doğruladı. Panorama slide 4 ise ayrı FND-4K-003 nedeniyle %31.7 crop oluyor.
- **Neden aday:** `cover` için bu %10–12 kırpma mevcut kompozisyonlarda bilinçli ve estetik olarak kabul edilebilir; yalnız geometriden hareketle “hata” denemez. Ancak kiosk'a tipik 16:9 sınıf fotoğrafı/video yüklenecekse frame'in 1.611 oranı sürekli kenar kaybı yaratıyor.
- **Önerilen görsel kabul:** Mevcut yedi Atatürk slaytı ve örnek 16:9 öğrenci fotoğrafı/video ile yüz/nesne/başlık safe-area kontrolü yapmak. Gerekirse theatre penceresinin oranını 16:9'a yaklaştırmak veya kompozisyon-aware `contain/cover` politikasını kalite odaklı yeniden ayarlamak.

### CAND-4K-004 — 16:9 dışı viewportlarda responsive yeniden-kompozisyon yerine düz mavi letterbox bantları oluşuyor

- **Önem:** Orta — responsive/kiosk kozmetik kalite; ana 55" 16:9 hedefte etkisiz.
- **Dosya/alan:** `public/css/kiosk-magic-park.css` body background + `.bento-grid` `width:min(100vw,177.777vh)` / `height:min(100vh,56.25vw)`.
- **Davranış:** Magic Park sahnesi kendi 16:9 oranını kesin koruyor ve ortalanıyor. Viewport 16:9 değilse boş kalan alan responsive dekor/uzatma yerine body'nin düz `#159ce1` rengi olarak görünüyor.
- **Playwright ölçümleri:** `3840×2000` → sağ/sol yaklaşık `142.2px`; `2560×1600` → üst/alt `80px`; `3440×1440` → sağ/sol `440px`; `1920×1200` → üst/alt `60px`; portrait `1080×1920` → üst/alt yaklaşık `656px` bant.
- **Chrome DevTools kanıtı:** Gerçek CSS `3440×1440` viewport emülasyonunda stage `2560×1440`, sol/sağ bantlar `440px`, body background `rgb(21,156,225)` olarak doğrulandı.
- **Neden aday:** Asıl fiziksel hedef 3840×2160 16:9 TV olduğunda bant yok ve sahne tam doluyor. Ancak browser chrome, farklı TV/monitör, overscan-benzeri kullanılabilir alan veya orientation/ratio değişiminde görünüm “tasarlanmış çevre” yerine düz renk boşluğa düşüyor.
- **Önerilen tasarım yönü (fix değil):** Ana 16:9 kompozisyonu bozmadan dış alanı kaliteli bir responsive art-direction katmanıyla doldurmak (ör. shell'den türetilmiş yüksek çözünürlüklü/blurred extension, vektörel ambient dekor, kontrollü crop/overscan). Sahneyi zorla esnetmek yerine letterbox bölgesini tasarımın bilinçli parçası yapmak.

## Görsel kalite değerlendirmeleri

- Ana sahnenin 4K keskinliğini sınırlayan shell raster doğrulandı (**FND-4K-001**).
- Tipografik tasarım dili genel olarak Fredoka (display) + Nunito (supporting text) ekseninde; ancak iki görünür system-font adası tasarım bütünlüğünü bozuyor (**FND-4K-002**).
- Slideshow'un aspect-ratio koruma tasarımı fikir olarak iyi; ancak CSS specificity nedeniyle panoramik görselde fiilen çalışmıyor ve gerçek kompozisyon kaybı yaratıyor (**FND-4K-003**).
- “Haftanın Yıldızları” için tanımlanmış çoklu geçiş sistemi class seviyesinde çalışıyor görünmesine rağmen Magic Park `display` katmanı bütün transitionları görsel olarak iptal ediyor; kartlar ani değişiyor (**FND-4K-004**).
- Kioskun görsel kararları tek bir tema katmanında sahiplenilmiyor; legacy ve Magic Park cascade'i gerçek görünür regressions üretmiş durumda (**FND-4K-005**). Bu nedenle kalite artışının ilk mimari şartı yeni framework değil, stil ownership'ini sadeleştirmek.
- Noise karakterinde CSS transition ile GSAP aynı `transform` property'yi eşzamanlı sürüyor; motion ownership deterministik değil (**FND-4K-007**).
- Noise high/Gürültü state'i legacy `translateX(-50%)` varsayımı nedeniyle karakteri yaklaşık 132px sola taşıyor (**FND-4K-011**); bu motion ownership sorununun doğrudan görünür geometrik sonucu.
- Slideshow caption girişi sınırsız; uzun metin 4K'da görsel alanı hızla kaplıyor ve 1200 karakterde frame dışına taşıyor (**FND-4K-012**).

### Asset kalite özeti

- Tam ekran Magic Park shell: `1672×941` → gerçek 4K için yetersiz (**FND-4K-001**).
- Noise-state görselleri: `2816×1536` WebP; mevcut ~264px kare karakter render'ı için çözünürlük fazlasıyla yeterli. Buradaki problem çözünürlük değil motion/geometry (**FND-4K-007/011**).
- Atatürk fallback slaytları: çoğu `2752/2816×1536`, panorama `3168×1344`; 4K slideshow frame'inde çoğu downscale ediliyor. Keskinlik açısından yeterli; problem smart contain specificity/crop (**FND-4K-003**, **CAND-4K-003**).
- 3D UI ikonları: ana `ui-icons-3d` seti `512×512`; gerçek 4K'da tipik render ~60–105px, dolayısıyla piksel yoğunluğu yeterli.
- Öğrenci gerçek fotoğrafları: `640×640`; mevcut en büyük star/president renderlarında yaklaşık `361px` seviyesine kadar çıkıyor ve DPR=1 gerçek 4K hedefte kaynak payı yeterli. Fiziksel TV browser scale/DPR farklıysa yeniden kabul edilmeli.
- Default avatarlar `1024×1024`; fallback kalite açısından yeterli.
- Eski yardımcı icon seti ~`300–505px`; yalnız kullanıldığı empty/special state'lerde gerçek render boyutuna göre ayrıca kabul edilmeli, fakat ana 4K state'te belirgin çözünürlük problemi görülmedi.

## Kart bazlı premium-çocuksu art-direction incelemesi

> Bu bölümdeki 10 üzerinden puanlar teknik “PASS/FAIL” değildir; yukarıdaki **premium çocuk dashboard kuzey yıldızına** göre art-direction değerlendirmesidir. Öneriler şirket/enterprise kiosk estetiğine değil, Magic Park'ın çocuklara özel sınıf dünyasını daha kaliteli hale getirmeye yöneliktir.

### CARD-01 — Günün Zamanı

- **Genel karar:** **KORU + hafif premium rafinasyon.** Mevcut ekranın çocuk kimliğini en iyi taşıyan kartlardan biri; yeniden tasarlamak yerine sanat kalitesini ve mikro tipografiyi yükseltmek daha doğru.
- **Puanlar:** Çocuksuluk **9/10** · Premiumluk **8/10** · Okunabilirlik **9.5/10** · Duygusal etki **8.5/10** · Görsel bütünlük **8.5/10**.
- **4K runtime kanıtı:** Kart ≈`1036.8×786.2px`; titlebar ≈`59.52px`; gün ≈`55.68px`; tarih ≈`32.26px`; saat ≈`174.72px`; hafta-sonu yardımcı metinleri ≈`28.8px`. Chrome + Playwright aynı 4K tipografi ölçeğini doğruladı.
- **Korunacaklar:** Ahşap/bitkili sahne, güneş-bulut karakterleri, büyük dijital saat, gün → tarih → saat → hafta-sonu ritmi ve sıcak “sınıf panosu” hissi.
- **Geliştirilecekler:** Tam shell master keskinliği (**FND-4K-001**) ve tarih font ownership'i (**FND-4K-002**). Hafta-sonu pill'i işlevsel ve sevimli; ileride daha “hazır web pill'i” değil, aynı Magic Park dünyasında küçük rozet/tabela gibi sanat yönetilebilir.
- **Azaltılacaklar:** Kartın canlılığını azaltacak kurumsal minimalizm **önerilmez**. Saatin büyüklüğü ve dekor yoğunluğu bu kartta avantajdır.
- **Art-direction fırsatı:** Hafta sonu / özel gün / tatil gibi state'lerde aynı kompozisyonu bozmadan çok küçük bağlamsal dekor değişimleri (ör. yıldız, yaprak, mevsimsel mikro öğe) kartı daha “yaşayan sınıf dünyası” yapabilir; zorunlu değildir.

### CARD-02 — Sınıf Mevcudu

- **Genel karar:** **KORU + orta düzey iç-yüzey art-direction.** Dış Magic Park çerçevesi başarılı; içerideki çok sayıda beyaz dikdörtgen kutu ise diğer sahnelere göre daha fazla klasik web/dashboard hissi veriyor.
- **Puanlar:** Çocuksuluk **7.5/10** · Premiumluk **7/10** · Okunabilirlik **9/10** · Duygusal etki **6.5/10** · Görsel bütünlük **7.5/10**.
- **4K runtime kanıtı:** Kart ≈`1036.8×671.8px`; ana mevcut/present sayıları ≈`80.64px`; kız/erkek sayıları ≈`57.6px`; supporting textler ≈`26.1–26.9px`. Veri hiyerarşisi uzaktan okumaya elverişli.
- **Korunacaklar:** Bahçe/çiçek çerçevesi, kız/erkek 3D öğrenci ikonları, büyük sayılar, “Bugün Sınıfta” ile toplam mevcut arasındaki hiyerarşi ve yoklama durumunun ayrı görünmesi.
- **Geliştirilecekler:** İçteki `present / capacity / girl / boy / attendance` bloklarının hepsini birbirine benzeyen beyaz UI kartları olarak değil, **sınıf rozetleri / bahçe tabelaları / oyuncu bilgi levhaları** olarak aynı dünyaya daha güçlü bağlamak. Bilgi miktarı azaltılmamalı; görsel dil yeniden sanat yönetilmeli.
- **Azaltılacaklar:** “Kutunun içinde kutu” hissini artıran generic panel estetiği. Özellikle çok sayıda aynı radius + beyaz yüzey birleşimi ekranın bu bölümünü istemeden klasik dashboard'a yaklaştırıyor.
- **Art-direction fırsatı:** Attendance alanı “istatistik”ten çok **bugün sınıf olarak ne kadar birlikteyiz?** hissine yaklaşabilir. Devamsızlık marquee'sinin mekanik haber-şeridi karakteri (**FND-4K-009/010**) bu nedenle yalnız teknik değil, duygusal tasarım açısından da yeniden düşünülmeli.
- **Not:** Burada çözüm daha sade/kurumsal kartlar değildir; tersine mevcut veri netliğini koruyup yüzeyleri daha özgün, çocuklara özel ve koleksiyon/rozet hissi taşıyan bir görsel sisteme dönüştürmektir.

### CARD-03 — Ders Akışı

- **Genel karar:** **KORU + state-aware orta/yüksek art-direction.** Aktif ders/teneffüs state'i güçlü ve okunaklı; okul çıkışı state'i aynı büyük iç alanı yeterince doldurmadığı için kart bazen “hazır panel + ortada küçük mesaj” seviyesine düşüyor.
- **Puanlar:** Çocuksuluk **8/10** · Premiumluk **7.5/10** · Okunabilirlik **9/10** · Duygusal etki **7/10** · Görsel bütünlük **8/10**. Okul çıkışı tek başına değerlendirildiğinde duygusal/sahnesel puan daha düşüktür.
- **4K çift-browser kanıtı:** Kart ≈`1036.8×702px`; aktif `before-school / countdown / goodbye` içerik sahnesi ≈`705×407px` ve kart alanının ≈`39.4%`ünü kullanıyor. Aktif derste heading ≈`43px`, dönem adı ≈`48px`, kalan süre ≈`90.24px`. Chrome ve Playwright aynı değerleri ölçtü.
- **Korunacaklar:** Mor clubhouse/kitap/okul dekoru, çok büyük kalan-süre sayısı, renkli progress bar, dönem adının ayrı bir rozet/chip olarak vurgulanması ve ders/teneffüs state'lerinin kolay ayırt edilmesi.
- **Geliştirilecekler:** State'e göre iç sahnenin “yaşaması”. Ders öncesi, ders, teneffüs, son ders, okul çıkışı ve hafta sonu aynı beyaz/lila iç paneli yalnız metin değiştirerek paylaşmak yerine küçük bağlamsal illüstrasyon/dekor farklılıklarıyla daha anlamlı olabilir. Bu özellikle `after-school` ve `weekend` state'lerinde premium çocuk hissini yükseltir.
- **Azaltılacaklar:** Okul çıkışı state'inde büyük boş açık renkli alan + küçük merkez görsel kombinasyonu. Boşluk kötü değildir; ancak burada dekoratif shell çok zengin olduğu için içerideki boşluk “sakinlik”ten çok **tamamlanmamış state** hissi verebiliyor.
- **Art-direction fırsatı:** Ders/teneffüs ekranı bir “zamanlayıcı widget” olarak değil, küçük bir **günün macerası / sıradaki durağımız** sahnesi gibi ele alınabilir. Görsel bilgi azaltılmamalı; büyük timer ana odak olarak korunmalı.
- **Bağlı gerçek bug:** `Öğle Teneffüsü` dönem adı 4K'da ellipsis'e düşüyor (**FND-4K-008**); premium yeniden sahneleme bu metni kısaltmadan çözmelidir.

**CP-021 — Premium çocuk art-direction ilk üç kart checkpoint'i.** Günün Zamanı, Sınıf Mevcudu ve Ders Akışı kartları 3840×2160'da Chrome + Playwright ile karşılaştırıldı; tasarım kuzey yıldızı repo belgesine işlendi. Ürün kodu değiştirilmedi. Sıradaki kartlar: Sınıfın Ses Dengesi, Sınıfımızdan, Sınıf Başkanı, Nöbetçiler, Haftanın Yıldızları.

### CARD-04 — Sınıfın Ses Dengesi

- **Genel karar:** **KORU + yüksek etkili iç-sahne yeniden art-direction.** Turkuaz müzik/çiçek shell'i ve sevimli karakter fikri çok güçlü; ancak kartın iç bilgi düzeni maskot fikrinin gerisinde kalıyor ve yer yer “ölçüm paneli” gibi görünüyor.
- **Puanlar:** Çocuksuluk **8.5/10** · Premiumluk **7.5/10** · Okunabilirlik **8.5/10** · Duygusal etki **8/10** · Görsel bütünlük **7.5/10**.
- **4K çift-browser kanıtı:** Kart ≈`1824.9×844.5px`; titlebar ≈`59.52px`; quiet character ≈`264–268px` kare; durum başlığı ≈`40.32px`; yardımcı metin ≈`25.73px`. Playwright ve Chrome aynı ölçekleri doğruladı.
- **Aktif-listening görsel ölçüm:** Runtime sentetik `state-low` kabulünde status + meter + equalizer aktifken `.noise-info` ≈`1147×557px`. `noise-progress` yaklaşık ilk `107px`, equalizer ≈`120px`; equalizer altı ile bilgi alanının sonu arasında yaklaşık **196px** görsel boşluk kalıyor. Bu teknik overflow değildir; **algısal sahne kullanım boşluğu**dur.
- **Korunacaklar:** Turkuaz “müzikli bahçe” çerçevesi, üç durumlu Sessiz/Dikkat/Gürültü mantığı, maskot, renk kodu, durum mesajları ve equalizer'ın oyunlaştırma potansiyeli.
- **Geliştirilecekler:** Maskotu gerçek kart kahramanı yapmak. Şu an 1825px genişlikte ~268px karakter, dış shell'in duygusal gücüne göre küçük kalıyor. Karakter + durum + meter birbirinden bağımsız UI parçaları gibi değil, **tek bir canlı sahne** gibi çalışmalı.
- **Azaltılacaklar:** Generic beyaz/pastel uzun status bar + meter pill + equalizer kutusu yığınının “kontrol paneli” hissi. Bilgi kaybedilmeden bu yüzeyler daha organik, Magic Park evrenine ait şekillere dönüşebilir.
- **Art-direction fırsatı:** Noise meter'ı “mikrofon göstergesi” değil, **sınıfın minik rehber karakteri** haline getirmek. Quiet/attention/loud state'lerinde yalnız renk değil karakter pozu/ifadesi, çevresel küçük ışık/nota/halo tepkisi gibi kontrollü state anlatımı düşünülebilir. Hareket sayısı artırılmamalı; tek odak karakter olmalı.
- **Bağlı gerçek buglar:** Motion ownership çakışması (**FND-4K-007**) ve high/Gürültü state'inde ≈132px sola kayma (**FND-4K-011**) bu kartın premiumluk puanını doğrudan aşağı çekiyor.

### CARD-05 — Sınıfımızdan / Slideshow

- **Genel karar:** **GÜÇLÜ KORU + premium hikâye penceresi rafinasyonu.** Bu alan, Haftanın Yıldızları ile birlikte mevcut ekranın en güçlü duygusal sahnelerinden biri ve merkez kolonun gerçek görsel odağı.
- **Puanlar:** Çocuksuluk **8.5/10** · Premiumluk **9/10** · Okunabilirlik **9/10** · Duygusal etki **9/10** · Görsel bütünlük **8.5/10**.
- **4K çift-browser kanıtı:** Kart ≈`1824.9×1315.4px`; titlebar ≈`69.89px`; aktif medya ≈`1510–1518×935–939px`; aktif caption tipik fallback'te ≈`53.76px`. Merkezdeki en büyük içerik yüzeyi bu kartta ve 4K alanı gerçekten kullanıyor.
- **Korunacaklar:** Sahne/tiyatro perdesi, büyük medya penceresi, merkezi baskınlık, caption'ın fotoğrafla birlikte hareket etmesi, çocuk ekranında “hikâye anlatılıyor” hissi ve güçlü uzaktan okunabilirlik.
- **Geliştirilecekler:** Caption'ın koyu sinematik paneli işlevsel ve okunaklı; ancak ileride daha sıcak **storybook plaque / tiyatro tabelası** hissine yaklaştırılabilir. Kontrast kesinlikle feda edilmemeli.
- **Art-style tutarlılığı adayı:** İncelenen fallback karelerinde foto-gerçekçi ve daha painterly/illüstratif Atatürk görselleri birlikte görüldü. Tek tek kaliteli olsalar da premium çocuk dashboard için slide setinin aynı sanat yönetimi filtresinden geçip geçmemesi ayrıca değerlendirilmeli. Bu otomatik bir “hata” değildir; **koleksiyon tutarlılığı** konusudur.
- **Azaltılacaklar:** Bu alanı klasik carousel/kurumsal medya kartına dönüştürecek sadeleştirme önerilmez. Tiyatro metaforu ekranın kimliğine hizmet ediyor.
- **Art-direction fırsatı:** “Sınıfımızdan” alanını yalnız haber/duyuru değil **anı + kutlama + ilham + öğretmen mesajı + sınıf hikâyesi penceresi** olarak standartlaştırmak. İçerik türüne göre aynı sahne dilinde küçük çerçeve/etiket varyasyonları kullanılabilir.
- **Bağlı gerçek buglar:** `contain` specificity/crop (**FND-4K-003**) ve sınırsız uzun caption (**FND-4K-012**) bu güçlü alanın kompozisyonunu bozabiliyor. CAND-4K-003'teki sürekli %10–12 crop ayrıca art-direction safe-area kabulü gerektiriyor.

### CARD-06 — Sınıf Başkanı

- **Genel karar:** **KORU + orta düzey rol-vitrini art-direction.** Dış treehouse/trophy sahnesi çok başarılı; büyük başkan hiyerarşisi doğru. Alt yardımcı kartları ise dış kabuğa göre daha generic web card hissi veriyor.
- **Puanlar:** Çocuksuluk **8.5/10** · Premiumluk **7.5/10** · Okunabilirlik **8.5/10** · Duygusal etki **8.5/10** · Görsel bütünlük **7.5/10**.
- **4K çift-browser kanıtı:** Kart ≈`978.3×844.5px`; başkan portresi ≈`217–219px`; başkan adı ≈`34.56px`; iki yardımcı portresi ≈`97–98px`; yardımcı isimleri ≈`25.34px`. Başkan ile yardımcı arasında güçlü ve doğru bir görsel hiyerarşi var.
- **Korunacaklar:** Treehouse mimarisi, ağaç/yeşillik, kupa/rol sembolizmi, başkanın büyük dairesel portresi ve yardımcıların ikinci seviyede tutulması.
- **Geliştirilecekler:** Yardımcıların beyaz yuvarlatılmış dikdörtgen kartlarını daha çok **ağaç evine asılmış isim levhası / rozet / ekip üyesi plakası** gibi aynı dünyaya bağlamak. Başkan adı da generic pill yerine daha özel rol tabelası hissine yaklaştırılabilir.
- **Azaltılacaklar:** Enterprise profile-card çağrışımı yapan nötr beyaz kutular. Kişi sayısı ve bilgi azaltılmamalı; yalnız yüzey dili özgünleştirilmeli.
- **Art-direction fırsatı:** Kart “başkan bilgisi” değil **sınıfın kaptan köşesi** gibi hissettirebilir. Crown/trophy metaforu abartılmadan küçük crest/rol rozeti ile desteklenebilir; metalik kurumsal ödül dili yerine sıcak oyun/kitap illüstrasyonu tonu korunmalı.
- **Fiziksel kabul notu:** Yardımcı isimleri ≈25px olduğundan CAND-4K-002 kapsamındaki 2.5–3.5m gerçek TV okunabilirlik testi sürüyor.

### CARD-07 — Nöbetçiler

- **Genel karar:** **DIŞ KABUĞU KORU + içeriği orta/yüksek art-direction.** Mavi/turkuaz clubhouse shell'i çok karakterli; içteki 2×2 beyaz görev kartları ekranın en klasik “dashboard grid” hissine yaklaşan bölgelerinden biri.
- **Puanlar:** Çocuksuluk **7.5/10** · Premiumluk **7/10** · Okunabilirlik **8/10** · Duygusal etki **6.5/10** · Görsel bütünlük **7.5/10**.
- **4K çift-browser kanıtı:** Kart ≈`978.3×673.9px`; dört portre ≈`108–109px`; isimler ≈`24.58px`; her duty-item ≈`324×224px` ve container alanının yaklaşık `%23.8`ini kaplayan dört eşit hücre. Uzun `Emir Can Özdemir Yıldırımoğlu` metni wrap ile sığıyor; gerçek clipping yok.
- **Korunacaklar:** Mavi lodge/çan/çanta/merdiven dekoru, dört öğrenciye eşit görünürlük, yüz fotoğrafları ve günlük görev hissi.
- **Geliştirilecekler:** Dört hücreyi “web uygulamasındaki personel kartları” yerine **günün görev rozetleri / asılı görev etiketleri / keşif ekibi plakaları** gibi görsel olarak özelleştirmek. Eşit 2×2 düzen korunabilir; değişmesi gereken grid değil yüzey karakteridir.
- **Azaltılacaklar:** Tekrarlanan açık mavi/beyaz rect + küçük portre + pill isim kalıbı. Bu tekrar dış shell'in zenginliğini içeride sıradanlaştırıyor.
- **Art-direction fırsatı:** Nöbetçiliği ceza/operasyon değil, çocukça bir **“bugünün yardımcı ekibi”** hissine yaklaştırmak; fakat yeni metin/ikon kalabalığı eklemeden, yüz ve isimleri ana odak tutmak.
- **Fiziksel kabul notu:** Uzun isimler teknik olarak sığıyor; sorun varsa clipping değil ≈24.6px puntoda mesafe okunabilirliği olacak (**CAND-4K-002**).

### CARD-08 — Haftanın Yıldızları

- **Genel karar:** **İMZA KARTI OLARAK KORU + premium ödül ritüeli rafinasyonu.** Mevcut ekranın çocuklara duygusal olarak en güçlü cevap veren kartı; Magic Park hedefinin nasıl görünmesi gerektiğine iyi bir referans.
- **Puanlar:** Çocuksuluk **9.5/10** · Premiumluk **8.5/10** · Okunabilirlik **8.5/10** · Duygusal etki **9.5/10** · Görsel bütünlük **9/10**.
- **4K çift-browser kanıtı:** Kart ≈`978.3×641.5px`; aktif yıldız portresi ≈`357–361px`; isim ≈`39.55px`; portrait alanı diğer sağ-sütun portrelerinden belirgin biçimde daha büyük ve bu nedenle ödül hiyerarşisi ekrandan anında okunuyor.
- **Korunacaklar:** Pembe/coral magical portal, yıldız dekorları, büyük dairesel öğrenci portresi, alttaki geniş isim plakası ve öğrenciye gerçekten “özel seçildim” hissi veren sahneleme.
- **Geliştirilecekler:** İçerik geçişi. Yedi farklı efekt tanımlı olsa da gerçek transition şu an çalışmıyor (**FND-4K-004**). Düzeltme aşamasında amaç “7 efektin hepsini mutlaka göstermek” değil, **1–3 çok iyi koreografili büyülü geçiş** seçmek olabilir.
- **Azaltılacaklar:** Premiumluk adına yıldızları/parlaklığı kaldırmak önerilmez; fakat aynı anda flip + rotate + zoom-blur + sürekli sparkle gibi çok fazla ayrı hareket ailesi çalıştırmak da hedef değil. Ödül kartında hareket **özel an** gibi hissettirmeli.
- **Art-direction fırsatı:** Yeni yıldız değişiminde hafif parıltı/orbit, kontrollü confetti veya kısa “rozet kazanma” hissi; portre yerleştiğinde sahnenin sakinleşmesi. Böylece canlılık korunur ama sürekli göz isteyen bir slot haline gelmez.
- **Sayfa geneli referans rolü:** Çocuk odaklılık + büyük yüz + güçlü renk + özel çerçeve + basit bilgi hiyerarşisi birleşimi başarılı. Diğer rol kartları bu kartı birebir kopyalamamalı ama **özel hazırlanmışlık seviyesini** referans almalı.

### Sekiz kartın art-direction sınıflandırması

- **En güçlü / kimlik referansı:** Haftanın Yıldızları, Sınıfımızdan, Günün Zamanı.
- **Güçlü temel + belirgin iç-sahne fırsatı:** Sınıfın Ses Dengesi, Sınıf Başkanı, Ders Akışı.
- **Dış shell güçlü fakat iç UI daha generic:** Sınıf Mevcudu, Nöbetçiler.
- Sayfa genelinde ana çözüm **dekoru azaltmak değil**, generic beyaz rounded-rectangle/pill kullanımını azaltıp bilgiyi aynı Magic Park evrenine ait daha özel yüzeylerde sunmaktır.
- Premiumluk için çocuk dekorları sökülmeyecek; **düşük çözünürlüklü sanat, legacy font, generic web panel yüzeyi, rastgele/çalışmayan motion ve kompozisyon hataları** temizlenecektir.

**CP-022 — Sekiz ana kartın premium-çocuksu art-direction turu tamamlandı.** Tüm kartlar 3840×2160 Playwright + Chrome runtime ölçümleri ve 4K ekran görüntüleriyle değerlendirildi. Her kart için korunacak/geliştirilecek/azaltılacak/art-direction yönleri kaydedildi. Ürün kodu değiştirilmedi. Sıradaki kozmetik derinleştirme: sayfa genelinde ortak şekil dili, 3D ikon/illüstrasyon tutarlılığı, gölge/gradient/ışık derinliği, titlebar karakteri, generic rounded-rectangle oranı ve renk orkestrasyonu.

## Sayfa geneli ortak görsel dil incelemesi

### ART-4K-001 — Generic rounded-rectangle / pill doygunluğu, güçlü storybook shell'in içinde ayrı bir “web UI katmanı” oluşturuyor

- **Tür:** Art-direction bulgusu; teknik bug değildir.
- **4K runtime ölçümü:** Görünür sekiz kart içinde `IMG` hariç, alanı >2500px² ve radius'u ≥12px olan **32 büyük yuvarlatılmış yüzey** ölçüldü. Bunların **15'i** tam capsule/pill (`border-radius≈999px`) formunda.
- **Yoğunluğun dağılımı:** Sınıf Mevcudu ≈6 büyük yüzey; Ses Dengesi ≈7 non-image büyük yüzey; Başkan ≈5; Nöbetçiler ≈8. Buna karşılık Günün Zamanı yalnız 1 ana pill, Haftanın Yıldızları ise portre hariç esasen 1 büyük isim plakasıyla çalışıyor.
- **Yorum:** Sayı tek başına kalite ölçütü değildir; fakat kart bazlı puanlarla aynı yönde bir korelasyon var. En güçlü “özel hazırlanmış çocuk sahnesi” hissi veren kartlarda bilgi daha az sayıda, daha büyük ve karakterli yüzeyde sunuluyor. Daha generic hissedilen kartlarda kutu→alt kutu→pill zinciri artıyor.
- **Önerilen yön:** Bütün rounded rectangle'ları kaldırmak **yanlış** olur. Weekend badge, star-name ve bazı state rozetlerinde capsule formu anlamlı. Hedef; aynı formu her bilgi satırında varsayılan web-component olarak kullanmak yerine bazı yüzeyleri **ahşap/kağıt/rozet/asılı tabela/oyuncu plaka** gibi Magic Park'a ait şekil diline dönüştürmek.
- **Kurumsallaştırmama kuralı:** Çözüm “daha az radius + daha düz kart + daha çok boşluk” şeklinde enterprise UI sadeleştirmesi değildir. Amaç **daha az generic UI, daha çok özgün çocuk dünyası yüzeyi**dir.

### ART-4K-002 — Titlebar sistemi sayfanın en başarılı ortak tasarım imzalarından biri

- **Tür:** Pozitif art-direction checkpoint / **KORUNACAK**.
- **4K ölçüm:** Sekiz titlebar'ın tamamı `Fredoka Classroom`, `font-weight:670`, çok yakın letter-spacing/line-height ve açık krem/beyaz yazı kullanıyor. Sol/üst ana kartlar ≈`59.52px`, merkez slideshow ≈`69.89px`, sağ kolon ≈`49.15px` ile kolon ölçeğine göre bilinçli boyut farkı var.
- **Renk uyumu:** Text-shadow reçetesi aynı yapısal dili korurken shell rengine göre sky/aqua/coral/sunny/berry tonlarına uyarlanıyor. Titlebar DOM yüzeyi şeffaf; gerçek tabela/ribbon şekli shell artwork'ünde olduğu için metin doğrudan fiziksel sahneye oturuyor.
- **Yorum:** Bu, ekranın “sekiz ayrı widget” değil tek bir Magic Park evreni gibi algılanmasına ciddi katkı sağlıyor. Yeni tasarımda titlebar'ları standart SaaS card-header'a çevirmek kalite kaybı olur.
- **Önerilen yön:** Font ownership hataları temizlenirken titlebar'ın Fredoka karakteri, renk uyarlamalı gölge dili ve shell'e doğrudan oturan yapısı korunmalı. Gerekirse 4K shell yeniden üretiminde bu tabelalar daha keskin/katmanlı yapılmalı; DOM tarafında generic header panel eklenmemeli.

### ART-4K-003 — Renk zonlaması çocuk dashboard hedefiyle uyumlu; “premium” uğruna desatüre edilmemeli

- **Tür:** Pozitif art-direction kararı / **KORUNACAK**.
- **Gözlenen sistem:** Günün Zamanı sky/wood; Mevcut mint/garden; Ders Akışı lilac; Ses Dengesi aqua; Sınıfımızdan coral/theatre; Başkan sunny/green; Nöbetçiler blue/aqua; Yıldızlar berry/pink.
- **Yorum:** Yüksek kromalı dış shell'e rağmen pale iç yüzeyler ve büyük slideshow medyası yeterli görsel dinlenme noktası sağlıyor. Ekranın çocuk kimliğini oluşturan temel unsurlardan biri bu renk zonlamasıdır.
- **Önerilen yön:** Renk sayısını azaltarak gri/bej “premium” palete geçmek önerilmez. Kalite artışı; renklerin **daha iyi master artwork, daha tutarlı ışık/gölge, kontrollü vurgu ve ortak palette harmonizasyonu** ile yönetilmesinden gelmeli.

### ART-4K-004 — Gölge/gradient sistemi zengin fakat fazla sayıda mikro reçete kullanıyor; derinlik seviyeleri standardize edilebilir

- **Tür:** Art-direction / design-token adayı; teknik bug değildir.
- **4K runtime ölçümü:** İncelenen 32 non-image rounded yüzeyde **15 farklı aktif box-shadow reçetesi** ve **7 farklı gradient reçetesi** bulundu.
- **Yorum:** Magic Park gibi storybook/3D bir dünyada gölge ve gradient zenginliği gereklidir; bunları kaldırmak ekranı düzleştirir. Sorun efektin varlığı değil, çok sayıda küçük varyantın ortak ışık fiziğini zayıflatabilmesidir.
- **Önerilen yön:** Düzeltme/tasarım aşamasında üç-dört kasıtlı **derinlik katmanı** tanımlamak: ör. `inset/info surface`, `normal badge/card`, `hero/role`, `award/glow`. Kart renkleri değişebilir fakat ışığın yönü, yumuşaklığı ve yükseklik hissi ortak kalmalı.
- **Teknoloji sonucu:** Bunun için yeni UI framework gerekmez; mevcut CSS custom properties/design tokens + gerekirse cascade layers yeterlidir.

### ART-4K-005 — En doğru premiumlaştırma ekseni: “dekor azaltma” değil, iç yüzeyleri shell kadar özel hale getirme

- Günün Zamanı / Sınıfımızdan / Haftanın Yıldızları dış artwork ile iç içerik arasında güçlü bir karakter devamlılığı kuruyor.
- Sınıf Mevcudu / Nöbetçiler / kısmen Başkan ve Ses Dengesi ise çok başarılı dış storybook shell'in içine daha generic rounded web yüzeyleri yerleştiriyor.
- Bu nedenle redesign'ın ana görsel kazancı yeni dekor eklemekten önce **iç yüzeylerin form, materyal ve rol metaforunu özgünleştirmekten** gelmeli.
- Hedef “daha temiz şirket dashboard'u” değil; **aynı bilgi yoğunluğunu daha az generic komponent hissiyle veren daha iyi çocuk sanat yönetimi**dir.

**CP-023 — Ortak şekil/titlebar/renk/derinlik dili checkpoint'i.** 4K runtime'da rounded-surface/pill yoğunluğu, titlebar computed style'ları, shadow/gradient çeşitliliği ve renk zonlaması ölçüldü. Ürün kodu değiştirilmedi. Sıradaki odak: 3D ikon/illüstrasyon/öğrenci fotoğrafı sanat dili, shell ile iç assetlerin stil uyumu ve ekranın ana görsel odak sırası.

### ART-4K-006 — Ana `ui-icons-3d` ailesi kendi içinde güçlü ve tutarlı; korunmalı

- **Tür:** Pozitif asset/art-direction checkpoint.
- Görsel karşılaştırmada `calendar-weekend`, `student-girl`, `student-boy`, `school-clock`, `microphone`, `quiet`, `sparkles`, `loudspeaker`, schedule/weather ikonları ortak bir dil taşıyor: **parlak oyuncak/plastik 3D, doygun renk, yumuşak yuvarlak form, şeffaf arka plan**.
- Bu dil Magic Park'ın çocuk enerjisine uyuyor; “premium” olmak adına düz outline/monochrome enterprise ikon setine geçmek **önerilmez**.
- 512×512 kaynak boyutları mevcut 4K render boyutlarında yeterli; burada ihtiyaç çözünürlükten çok **kullanım hiyerarşisi ve stil ownership**.
- Öneri: Bu aileyi “küçük UI sembolleri / oyuncak rozet ikonları” olarak resmi tasarım sistemi katmanı kabul etmek ve yeni küçük ikonlar eklenirse aynı sanat reçetesini sürdürmek.

### ART-4K-007 — Noise maskotu ile UI ikonları farklı sanat ailesi; bu ayrım bilinçli hiyerarşiye dönüştürülmeli

- **Tür:** Art-direction bulgusu; asset kalitesi düşük değildir.
- `noise-states/quiet|attention|loud.webp` görselleri; pastel, yumuşak, daha az parlak, geniş atmosferik arka planlı **plush/mascot storybook 3D** dili taşıyor. `ui-icons-3d` ise parlak toy-icon dili.
- Bu fark prensipte avantaj olabilir: **maskot = karakter/sahne**, **UI icon = küçük sembol**. Böyle bir taxonomy ekranı daha zengin yapar.
- Mevcut sorun: Noise card içinde ana tavşan/plush maskotun yanında `ui-icons-3d/quiet.png` gibi başka bir insan/çocuk yüzlü karakter ikonu da durum sembolü olarak kullanılabiliyor. Böylece tek kart aynı anda iki farklı karakter evreni konuşuyor.
- Önerilen yön: Ana maskot varken status icon'larında mümkün olduğunca **sembolik** işaretler (sparkles, microphone, loudspeaker vb.) kullanmak veya status karakterini ana maskot ailesiyle eşlemek. İkinci ayrı yüz/karakter gereksizse kaldırmak daha premium ve odaklı olur.
- Bu öneri “daha az çocuk öğesi” değildir; tam tersine **bir ana karakteri daha güçlü sahiplenmek** anlamına gelir.

### ART-4K-008 — Legacy `crown/clipboard/star-3d` empty-state ikonları ayrı, daha metalik/ornamental bir 3D aile oluşturuyor

- **Tür:** Düşük-Orta öncelikli art-direction aday bulgusu.
- Görsel asset karşılaştırmasında özellikle `icons/crown-3d.png` primary `ui-icons-3d` setine göre daha metalik, mücevherli ve ornamental render dili taşıyor; `clipboard-3d` / `star-3d` aynı legacy setten geliyor.
- Repo kullanımı doğrulaması: crown yalnız başkan empty-state'inde, clipboard nöbetçi empty-state'inde, star no-stars/legacy sparkle bağlamlarında kullanılıyor. Normal dolu role state'lerinin ana görünümünü etkilemiyor.
- Risk: Veri boş olduğunda kart bir anda başka dönemden/başka asset paketinden gelmiş gibi görünebilir. Premium kalite yalnız normal state'te değil empty/error state'lerinde de korunmalıdır.
- Önerilen yön: Normal ekranın ana asset ailesi kesinleştikten sonra empty-state ikonlarını aynı **toy-3D veya storybook prop** standardında yeniden üretmek/uyarlamak. Şimdilik normal-state önceliklerinden sonra ele alınabilir.

### ART-4K-009 — Gerçek öğrenci fotoğrafları tasarım sisteminde “otantik içerik” katmanı olarak korunmalı

- **Tür:** Pozitif art-direction kararı / **KORUNACAK**.
- Başkan, yardımcı, nöbetçi ve yıldız alanlarında gerçek 640×640 öğrenci fotoğrafları kullanılıyor. Bu, dashboard'un çocuklara “bu gerçekten bizim sınıfımız” hissini veren en önemli aidiyet unsurlarından biri.
- Chrome runtime'da FaceFocus sonrası `object-position` değerleri öğrenciye göre yaklaşık `%40–60 x / %20–33 y` aralığında kişiselleşiyor; yüzler sabit center crop'a zorlanmıyor.
- Role göre frame hiyerarşisi anlamlı: başkan ve yıldız dairesel hero portre; vice/duty daha küçük rounded-square. Bu farklılık korunabilir çünkü rol önemini anlatıyor.
- Önerilen yön: Fotoğrafları avatar/AI karakterle değiştirmek **önerilmez**. Premiumlaştırma gerçek fotoğrafın çevresindeki **çerçeve materyali, rozet, glow ve isim plakası** üzerinden yapılmalı.
- Aynı öğrenci farklı rolde göründüğünde fotoğrafın farklı role frame'i alması doğal ve faydalıdır; ortaklaştırılması gereken fotoğraf şekli değil, frame'lerin aynı Magic Park materyal/ışık dünyasına ait olmasıdır.

### Önerilen görsel asset taxonomy

1. **Environment / shell art:** yüksek çözünürlüklü storybook park/clubhouse/wood/garden sahneleri.
2. **Mascot / character art:** yumuşak pastel 3D/plush, ifade ve state anlatımı için.
3. **UI symbol / toy icon:** mevcut parlak `ui-icons-3d` ailesi; küçük sembolik destek.
4. **Authentic classroom content:** gerçek öğrenci fotoğrafları; role göre Magic Park frame'leri.
5. **Slideshow/editorial content:** içerik özgürlüğü olabilir, fakat okulun sistem fallback koleksiyonu mümkün olduğunca küratörlü ve stil açısından tutarlı olmalı.
6. **Empty-state props:** ayrı legacy paket değil, yukarıdaki environment/toy prop ailesinin parçası olmalı.

**CP-024 — Asset sanat dili/taxonomy checkpoint'i.** Primary 3D UI ikonları, noise mascot state'leri, legacy empty-state ikonları ve gerçek öğrenci fotoğrafları görsel olarak karşılaştırıldı; kullanım yerleri DevSpace source ile doğrulandı. Ürün kodu değiştirilmedi. Sıradaki odak: ekranın ana görsel odak sırası, bakış rotası, merkez/sağ/sol ağırlık dengesi ve “çok canlı ama yorucu değil” motion/dekor yoğunluğu.

### ART-4K-010 — Mevcut büyük ölçek kompozisyon / bakış hiyerarşisi güçlü; eşit-kart dashboard'a çevrilmemeli

- **Tür:** Pozitif layout/art-direction checkpoint / **KORUNACAK**.
- **4K viewport alan payları:** Günün Zamanı ≈`%9.83`; Sınıf Mevcudu ≈`%8.40`; Ders Akışı ≈`%8.78`; Ses Dengesi ≈`%18.58`; Sınıfımızdan ≈`%28.94`; Başkan ≈`%9.96`; Nöbetçiler ≈`%7.95`; Yıldızlar ≈`%7.57`.
- **Kolon dengesi:** Sol ≈`%27`; merkez ≈`%47.5`; sağ ≈`%25.5`. Sol ve sağ destek kanatları birbirine yakın ağırlıkta, merkez ise bilinçli biçimde yaklaşık iki kat geniş bir ana sahne.
- **Yorum:** Bu kompozisyon ekranın enterprise “eşit widget grid” görünümüne düşmesini engelleyen en değerli yapısal kararlardan biri. Büyük slideshow doğal ilk odak; saat, yıldız/öğrenci yüzleri ve noise alanı ikinci odaklar olarak çevresinde çalışıyor.
- **Önerilen yön:** Premium redesign sırasında kartları eşit boyuta getirmek, merkez sahneyi küçültmek veya boşluk uğruna tekdüze bir bento grid kurmak **önerilmez**. 27 / 47.5 / 25.5 ana kompozisyon, yeni yüksek kaliteli shell artwork için de başlangıç geometri olarak korunmalı.
- **Çocuk deneyimi açısından anlamı:** Merkez “hikâye”, sol “günün ritmi”, sağ “bizim sınıfımızdaki insanlar/ödüller” olarak okunuyor. Bu bilgi mimarisi yalnız görsel değil, duygusal olarak da doğru.

### ART-4K-011 — Aktif listening state'inde çok sayıda eşzamanlı motion nesnesi var; çözüm animasyonu kırpmak değil, motion hierarchy tanımlamak

- **Tür:** Art-direction / motion choreography bulgusu; performans gerekçeli azaltma önerisi değildir.
- **Chrome 4K aktif listening (`state-low`) ölçümü:** `document.getAnimations()` yaklaşık **74** aktif animation/transition nesnesi raporladı; GSAP global timeline'da ayrıca **13 sonsuz tween** var.
- **Bu sayının yorumu:** Web Animation sayısının büyük kısmı equalizer'ın çok sayıdaki barlarından geliyor ve görsel olarak tek “equalizer hareket grubu” gibi algılanıyor. Buna ek olarak clock colon blink, goodbye/state visual, noise beacon/equalizer, slideshow ambient animation, stars sparkle ve park ambient spark hareketleri bulunuyor.
- **GSAP sonsuz grubu:** 1 noise-character float + 12 park-spark tween'i. Park spark süreleri yaklaşık `1.55–2.55s`, farklı phase/alpha/rotation ile çalışıyor.
- **Risk:** Aynı anda birkaç kart kendi küçük sonsuz hareketini taşıdığında ekran tek tek güzel animasyonlardan oluşsa bile “her köşe sürekli dikkat istiyor” hissine yaklaşabilir. Bu premiumluğu düşüren bir **koreografi sorunu** olabilir; performans sorunu olduğu için değil.
- **Önerilen motion hierarchy:**
  1. **Ambient:** park spark/çok hafif çevresel canlılık — düşük dikkat.
  2. **Functional live:** gerçek noise equalizer gibi o an anlam taşıyan hareket — orta dikkat.
  3. **Event/award:** star değişimi, başarı/confetti, özel duyuru — kısa süreli yüksek dikkat.
  4. **Hero transition:** slideshow değişimi — kontrollü ve sinematik.
  5. O anda yüksek-dikkat event varsa diğer ambient gruplar görsel olarak geri çekilebilir; tamamen kapanmaları şart değildir.
- **Premium çocuk kuralı:** Animasyon sayısını “performans için azaltmak” hedef değil. Ama aynı görsel anda birden çok yüksek-dikkat hareketinin yarışmasını önlemek gerekir. **Canlılık korunacak, dikkat rekabeti azaltılacak.**
- **Fiziksel kabul:** Motion hierarchy kararı gerçek 55" panelde 2.5–3.5m mesafeden birkaç dakikalık gözlemle doğrulanmalı; otomasyon yalnız eşzamanlı motion kaynaklarını sayabilir.

### ART-4K-012 — Görsel odak sırası mevcut haliyle çocuk dashboard amacına uygun

- 4K screenshot kabulünde ilk büyük odak **Sınıfımızdan** sahnesi; bu doğru çünkü ekranın hikâye/duygu alanı.
- İkinci güçlü odaklar büyük **saat**, büyük **öğrenci yüzleri/Yıldızlar** ve üst merkez **Ses Dengesi**. Bunlar çocuk için zaman, aidiyet/ödül ve sınıf davranışı üçlüsünü destekliyor.
- Sınıf Mevcudu/Nöbetçiler gibi daha operasyonel bilgiler daha küçük ve çevresel kalıyor; bu da doğru. Premium redesign bu kartları görsel olarak iyileştirirken ana slideshow ile yarışacak kadar büyütmemeli.
- Sonuç: Problem sayfanın makro hiyerarşisi değil; **bazı iç yüzeylerin sanat kalitesi ve motion ownership'i**. Büyük layout'u yeniden icat etmek gerekmiyor.

**CP-025 — Makro hiyerarşi + motion yoğunluğu checkpoint'i.** 4K viewport alan payları ve aktif-listening eşzamanlı animation kaynakları Chrome runtime'da ölçüldü; mevcut merkez-sahne kompozisyonunun korunması ve motion'ın azaltılmak yerine hiyerarşik koreografiye alınması bağlayıcı art-direction kararı olarak kaydedildi. Ürün kodu değiştirilmedi. Sıradaki odak: premium çocuk redesign için somut tasarım ilkeleri / materyal reçeteleri ve hangi değişikliklerin en yüksek görsel kazancı vereceği önceliklendirmesi.

### ART-4K-013 — İç yüzeylerde transparan beyaz “default web card” malzemesi fazla baskın

- **Tür:** Ölçülebilir art-direction bulgusu; teknik bug değildir.
- **4K runtime ölçümü:** Önceki şekil analizindeki 32 büyük non-image rounded yüzeyin **19'u** doğrudan `rgba(255,255,255,...)` veya çok beyaza yakın transparan zemin kullanıyor. Bu sayıya beyaz ağırlıklı gradient yüzeylerin tamamı dahil değil; algısal beyaz/açık panel oranı gerçekte daha yüksek.
- **Yoğunlaştığı alanlar:** President vice-card/name plakaları, dört duty-item + dört duty-name, noise status/iki pasif scale label, stats capacity/attendance ve goodbye state.
- **Yorum:** Açık zemin okunabilirlik için doğru; sorun “açık” olması değil, çok sayıda farklı bilgi yüzeyinin aynı **transparan beyaz rounded rectangle** malzemesine dönmesi. Dış shell storybook iken iç katman yer yer generic web UI'ya dönüyor.
- **Önerilen yön:** Beyazı silmek yerine açık yüzeyleri birkaç kasıtlı Magic Park materyaline bölmek. Aynı kontrast/okunabilirlik korunarak yüzeylerin “ne olduğu” hissi güçlendirilmeli.

### Premium çocuk materyal sözlüğü — redesign için önerilen yön

> Aşağıdakiler implementasyon kararı değil; sonraki tasarım/fix aşamasında değerlendirilecek **görsel malzeme rolleri**dir. Amaç bütün ekranı texture ile doldurmak değil, generic web card yerine birkaç tekrarlanabilir çocuk-dünyası materyali tanımlamaktır.

1. **Storybook Paper / Cream Placard**
   - Yardımcı metin, küçük bilgi ve sakin okuma alanları.
   - Sıcak ivory/cream; çok hafif kağıt/paint hissi; net koyu metin.
   - Stats ve role-name alanlarında transparan saf beyazın ana alternatifi.

2. **Painted Wood / Hanging Sign**
   - Rol isimleri, başkan/yardımcı/nöbetçi kimliği, bölüm içi özel etiketler.
   - Shell'deki ahşap/clubhouse metaforuyla doğrudan bağ kurar.
   - Her isim alanını ağır ahşap yapmaya gerek yok; yalnız role/hero plakalarında kullanılmalı.

3. **Toy Enamel / Candy Badge**
   - Durum, progress, kısa sayısal badge ve dikkat etiketleri.
   - Mevcut `ui-icons-3d` parlak oyuncak diliyle uyumlu.
   - Capsule formunun en anlamlı kullanım alanı burası; bütün kart gövdelerine yayılmamalı.

4. **Soft Classroom Panel**
   - Büyük veri grupları için pale mint/lilac/sky yüzey.
   - Mat, yumuşak; hafif iç highlight; enterprise glassmorphism değil.
   - Stats/Noise gibi bilgi yoğun alanların temel okunabilir yüzeyi.

5. **Theatre / Story Plaque**
   - Slideshow caption ve özel mesajlar.
   - Koyu kontrast korunabilir; ama material hissi sahne/tiyatro tabelasıyla bağlanmalı.

6. **Award Glow / Magical Frame**
   - Yalnız yıldız, başarı, özel kutlama gibi yüksek değerli state'ler.
   - Gold/pink glow, sparkle ve kısa motion burada anlamlı; normal bilgi kartlarına yayılmamalı.

7. **Mascot Atmosphere**
   - Noise karakteri çevresi gibi karakter odaklı yüzey.
   - Ayrı bir rectangle yerine yumuşak radial ışık, çevresel reaction ve karakterin nefes alacağı sahne alanı.

### ART-4K-014 — Shape/material rolü ile bilgi rolü eşleştirilirse premiumluk artar; her bilgiyi aynı pill'e koymak gerekmez

- **Durum/state** → toy badge/capsule mantıklı.
- **Kişi adı/rol** → hanging sign / paper plaque / award ribbon daha anlamlı.
- **Uzun metin** → geniş sakin paper/theatre surface.
- **Canlı ölçüm** → oyuncak track / equalizer / reactive atmosphere.
- **Ödül** → glow/frame/ribbon.
- Bu eşleştirme aynı anda hem çocuksuluğu hem premiumluğu yükseltir; çünkü form yalnız dekor değil, **anlam taşıyan materyal** haline gelir.

### Görsel kazanç / öncelik matrisi — fix öncesi art-direction sırası

#### Tier A — En büyük ekran-geneli algısal kazanç

1. **Gerçek 4K+/katmanlı shell master** — FND-4K-001.
2. **Generic beyaz iç yüzeyleri kasıtlı Magic Park materyal sistemine geçirmek** — ART-4K-001/013/014.
3. **Typography ownership'i tekleştirmek** — FND-4K-002.
4. **Motion ownership + motion hierarchy** — FND-4K-004/007/011 + ART-4K-011.
5. **Noise meter'ı gerçek maskot sahnesine yükseltmek** — CARD-04.

#### Tier B — Duygusal/rol odaklı büyük kazanç

6. **Başkan/Nöbetçi iç role-card yüzeylerini özgünleştirmek** — CARD-06/07.
7. **Attendance'ı “sınıf birlikteliği” sahnesine yaklaştırmak; marquee'yi yeniden ele almak** — CARD-02 + FND-4K-009/010.
8. **Ders Akışı state'lerini bağlamsal mini-sahnelere dönüştürmek** — CARD-03 + FND-4K-008.
9. **Slideshow caption/safe-area/art-set kürasyonu** — CARD-05 + FND-4K-003/012 + CAND-4K-003.

#### Tier C — Rafinasyon / son kalite katmanı

10. **Shadow/depth token sistemi** — ART-4K-004.
11. **Legacy empty-state prop ikonlarının aynı asset taxonomy'ye alınması** — ART-4K-008.
12. **Non-16:9 outer art extension** — CAND-4K-004.
13. **Fiziksel 55" mesafe tipografi tuning'i** — CAND-4K-002.

- Bu öncelik **performans maliyetine göre değil görsel kazanca göre** sıralanmıştır.
- Her Tier A/B kararı uygulanmadan önce screenshot/mockup karşılaştırması yapılmalı; özellikle shell ve role-card materyal değişimleri kör CSS tweaking ile değil görsel art-direction üzerinden seçilmelidir.

**CP-026 — Materyal sistemi + görsel ROI checkpoint'i.** 32 büyük rounded yüzeyin 19'unda doğrudan beyaz-ağırlıklı transparan zemin ölçüldü; premium çocuk materyal sözlüğü ve görsel kazanç odaklı Tier A/B/C önceliği yaşayan envantere eklendi. Ürün kodu değiştirilmedi. Sıradaki odak: bu ilkelerin her kartta nasıl somutlaşacağına dair düşük riskli / orta riskli / yüksek riskli redesign seçenekleri ve mümkünse görsel mockup karşılaştırma planı.

## Premium çocuk redesign yaklaşım seçenekleri

### Yaklaşım A — “Polish in Place” / mevcut görünümü incelikle parlat

- **Korunan:** Mevcut shell artwork kompozisyonu, bütün kart iç DOM şekilleri, rounded panel/pill oranı, temel motion sistemi.
- **Değişen:** 4K shell yeniden üretimi, font ownership, bug fixleri, shadow/gradient tokenları, renk ayarı, birkaç asset yenilemesi.
- **Avantaj:** En düşük tasarım/regression riski; mevcut öğrencilerin alıştığı görünüm neredeyse tamamen kalır.
- **Eksik taraf:** Sınıf Mevcudu / Nöbetçiler / Noise / Başkan içindeki generic web-card hissinin kökü büyük ölçüde devam eder. Ekran daha keskin ve tutarlı olur ama “özel premium çocuk ürünü” seviyesinde sıçrama sınırlı kalabilir.
- **Tahmini görsel kazanç:** Orta.

### Yaklaşım B — **“Magic Park 2.0” / önerilen yaklaşım**

- **Korunan:** 27 / 47.5 / 25.5 makro layout; sekiz bilgi bölgesi; titlebar sistemi; canlı renk zonlaması; dış park/treehouse/theatre metaforu; gerçek öğrenci fotoğrafları; büyük slideshow; ana bilgi hiyerarşisi.
- **Yükseltilen:** Gerçek 4K+/katmanlı shell artwork, iç materyal sistemi, role-card yüzeyleri, Noise maskot sahnesi, Attendance sunumu, Ders Akışı state sahneleri, typography, motion hierarchy, slideshow caption/art curation.
- **Avantaj:** Ekranın sevilen çocuk karakterini kaybetmeden generic web UI izlerini ciddi biçimde azaltır. En büyük algısal kalite artışı burada bekleniyor.
- **Risk:** İç CSS/DOM yüzeylerinde daha fazla görsel redesign gerektiği için A'dan daha yüksek regression/testing ihtiyacı var; ancak makro layout korunacağı için tam redesign riski yok.
- **Tahmini görsel kazanç:** **Yüksek / en iyi risk-kazanç dengesi.**
- **Bu incelemenin mevcut önerisi:** **B**.

### Yaklaşım C — “Living Magic World” / çok daha dinamik illüstrasyon sistemi

- **Korunabilecek:** Genel bölge mantığı ve içerik türleri.
- **Değişebilecek:** Shell'in statik raster temelden Rive/WebGL/SVG/katmanlı runtime art'a taşınması; ambient çevrenin daha reaktif olması; maskot ve park öğelerinin daha fazla state animasyonu.
- **Avantaj:** En yüksek “wow” potansiyeli; gerçek animasyonlu tema parkı hissi.
- **Risk:** Ekranı dashboard'dan mini oyuna çevirme, hareket rekabetini artırma, network/runtime/asset pipeline karmaşıklığı ve mevcut sıcak sınıf panosu hissini kaybetme riski en yüksek yaklaşım.
- **Teknoloji notu:** Mevcut GSAP zaten güncel ve güçlü; C için bile yeni framework zorunlu değil. Rive ancak gerçekten animasyonlu vektör karakter/shell üretim süreci seçilirse anlamlı.
- **Tahmini görsel kazanç:** Potansiyel olarak çok yüksek, fakat kalite kontrolü zor ve mevcut ihtiyaç için **şimdilik gereksiz riskli**.

### Neden Yaklaşım B öneriliyor?

- Mevcut screenshot'ta **makro kompozisyon doğru**; değiştirilmesi gereken en büyük şey kartların konumu değil, artwork çözünürlüğü ve iç surface dili.
- En sevilen/başarılı kartlar (Yıldızlar, Slideshow, Günün Zamanı) zaten B yaklaşımının nasıl çalışacağını gösteriyor: **büyük karakterli sahne + az sayıda anlamlı içerik yüzeyi + güçlü odak**.
- En zayıf alanların problemi “az teknoloji” değil; generic rounded UI yüzeyi, eski font/style ownership ve parçalı motion.
- Bu nedenle C'nin getireceği teknoloji/animasyon artışı problem çözmekten çok yeni karmaşıklık ekleyebilir; A ise görsel sıçramayı sınırlı bırakır.

## Yaklaşım B — kart bazlı somut art-direction hedefleri

### Günün Zamanı
- Mevcut sahneyi neredeyse aynen koru; gerçek 4K+/layered redraw.
- Weekend pill'i küçük toy-enamel/calendar badge veya park tabelası olarak rafine et.
- Date fontunu ortak typography'ye al; saat hero ölçeğini koru.

### Sınıf Mevcudu
- Beş-altı ayrı beyaz paneli aynı “web grid” diliyle vermek yerine **2 ana + 2 yardımcı + 1 attendance** materyal hiyerarşisi kur.
- `Bugün Sınıfta` gerçek hero; `Sınıf Mevcudu` ikinci büyük badge; Kız/Erkek iki küçük toy/class badges; attendance geniş storybook strip.
- Devamsız isimleri haber-marquee yerine okunabilir paged/token/roster çözümüyle göster; bilgi miktarını azaltma.

### Ders Akışı
- Timer her zaman büyük hero kalsın.
- Ders/teneffüs context badge'i toy enamel / painted sign mantığına al.
- Before-school / after-school / weekend için aynı boş panelin yalnız metin değiştirmesi yerine **küçük state illustration scene** kullan.
- Progress bar oyuncak track/yol hissine yaklaşabilir; okunabilirlik korunmalı.

### Sınıfın Ses Dengesi
- Maskotu daha büyük ve kartın ana karakteri yap.
- UI status icon'larında ikinci karakter yüzünü azalt; sembolik ikon kullan.
- Meter/equalizer'ı karakter sahnesine entegre et; ayrı ayrı üç uzun web panel gibi durmamalı.
- Quiet/attention/loud için aynı karakter merkezini koruyan state choreography; high state merkez kayması kesinlikle olmamalı.

### Sınıfımızdan
- Theatre metaforu ve büyük medya penceresi korunmalı.
- Caption warm theatre/story plaque olarak rafine edilebilir; contrast kaybedilmez.
- Fallback slide koleksiyonu tek sanat yönetimi filtresinden geçirilebilir.
- Safe-area/contain gerçek çalışmalı; kullanıcı içeriği crop ile cezalandırılmamalı.

### Sınıf Başkanı
- Büyük circular president hero korunur.
- Başkan adı `role plaque`; yardımcılar iki mini **treehouse team plaque**.
- Beyaz card-in-card hissi azaltılır; ağaç evinin materyal dünyası içeri taşınır.

### Nöbetçiler
- 2×2 eşit grid korunabilir; dört öğrenciye eşitlik sağlar.
- Her hücre generic card değil **daily helper badge / hanging task tag / explorer plaque** hissi alır.
- Fotoğraf ve isim ana odak kalır; ekstra görev ikon kalabalığı eklenmez.

### Haftanın Yıldızları
- Mevcut card art direction referans kabul edilir.
- Portre + glow + wide name ribbon korunur.
- 7 farklı rastgele efekt yerine 1–3 premium büyülü transition ailesi; ödül anında kısa sparkle/confetti, sonra sakin state.
- Dots daha çocukça küçük yıldız/nokta göstergesi olabilir; ana portrait ile yarışmamalı.

## Mockup / görsel karar kapısı — koddan önce

- Yaklaşım B uygulamasına geçilmeden önce en az şu dört kritik yüzey için **mevcut vs redesign** görsel karşılaştırması hazırlanmalı:
  1. Sınıf Mevcudu iç yüzeyleri.
  2. Noise maskot sahnesi.
  3. Başkan + Nöbetçiler role-card materyali.
  4. Ders Akışı after-school / active-class state'i.
- Bu mockuplar 16:9 4K shell kompozisyonu içinde görülmeli; tek başına kart mockup'ı yeterli değildir çünkü renk yoğunluğu ve odak rekabeti sayfa bütününde değişebilir.
- Tasarım seçiminde kriter “hangisi daha modern?” değil; **hangisi daha özel, daha çocukça, daha premium ve yine 3m uzaktan çok net?** olmalıdır.
- Kullanıcı onayı alınmadan görsel direction'ı büyük ölçüde değiştiren ürün kodu uygulamasına geçilmemeli.

**CP-027 — Redesign yaklaşım seçenekleri checkpoint'i.** A/B/C yaklaşımı çıkarıldı; **Magic Park 2.0 (B)** mevcut kanıtlara göre önerilen yön olarak kaydedildi. Sekiz kart için somut B-art-direction hedefleri ve kod öncesi mockup kapısı tanımlandı. Ürün kodu değiştirilmedi. Sıradaki iş, kullanıcı incelemeyi sürdürmemizi istediği sürece edge-state/empty-state/error-state kozmetik kalitesini aynı premium çocuk kriteriyle incelemek.

### Kozmetik kalite için öncelikli yeniden-ele-alma sırası

1. **Ana shell art direction:** gerçek 4K+/vektörel master; ekranın tamamını etkilediği için en büyük algısal kazanç burada.
2. **Stil ownership:** legacy + Magic Park cascade'ini tek kiosk tasarım sistemi altında toplamak; typography/media/state kurallarının sahibini netleştirmek.
3. **Motion ownership:** GSAP/CSS transform çakışmasını bitirmek; yıldız ve noise state hareketlerini tek, bilinçli koreografi altında toplamak.
4. **Slideshow art direction:** gerçek contain/cover kararını çalıştırmak, theatre oranı/safe-area ve uzun-caption davranışını kalite odaklı yeniden tasarlamak.
5. **Typography:** görünür system-font adalarını kaldırmak; sağ sütun ikincil isimlerini fiziksel TV mesafesine göre optik büyütmek/yeniden dengelemek.
6. **Attendance motion:** marquee'yi sabit okunabilir hızla ve reduced-motion için tam bilgi gösteren statik alternatifle yeniden tasarlamak.
7. **Non-16:9 çevre:** core 16:9 sahneyi korurken düz mavi letterbox yerine bilinçli background extension/art direction.

Bu sırada **performans için görsel zenginlik kırpılmayacaktır**. Mevcut Chrome trace zaten LCP/CLS açısından rahat pay gösteriyor; optimizasyon gerekiyorsa aynı görsel kalite korunarak yapılacaktır.

## 4K ölçüm sonuçları

- Playwright gerçek viewport: `3840×2160`, DPR=1.
- `.bento-grid`: `3840×2160`; belge ve body scroll ölçüleri de `3840×2160`.
- Sekiz ana kartta viewport dışı kaçış: **0**.
- 1920×1080 → 2560×1440 → 3840×2160 karşılaştırmasında temel sahne ve kart oranları 16:9 içinde korunuyor; ana layout seviyesinde horizontal/vertical document scroll oluşmadı.
- Kritik shell raster: `1672×941` → fiziksel 4K'da ≈2.30× upscale (**FND-4K-001**).
- Resize round-trip sonunda 4K sahne tekrar `3840×2160`; sekiz titlebar kendi kolon sınırlarına geri dönüyor ve viewport escape sayısı `0` kalıyor.
- Titlebar computed transformları resize sonrasında yalnız beklenen CSS merkezleme transformuna (`translateX(-50%)` eşleniği matris) dönüyor; GSAP entrance transform kalıntısı gözlenmedi.

## Performans bulguları

- Chrome DevTools navigation trace, localhost/4K emülasyon: LCP ≈ `306 ms`, CLS `0.00`, CPU throttling 1×, network throttling yok. İlk yüklemede görünür layout-shift problemi ölçülmedi.
- Trace `ForcedReflow` insight başlığını sundu ancak MCP ayrıntı çağrısı somut culprit döndürmedi; bu nedenle henüz bulgu olarak sınıflandırılmadı.
- Lighthouse snapshot: Accessibility `1.00`, Best Practices `1.00`; bu skorlar destekleyici baseline'dır, gerçek kiosk kalite kabulünün yerine geçmez.
- Yaklaşık 50 saniyelik Chrome soak ölçümünde DOM node sayısı `620 → 620 → 620`, tracked interval sayısı `4 → 4 → 4`; `performance.memory.usedJSHeapSize` yaklaşık `3.39 MB → 2.90 MB → 3.28 MB` bandında kaldı. Main slide sayısı 7, star slide sayısı 3 olarak sabit kaldı. 30 saniyelik slideshow refresh sonrasında DOM yeniden büyümedi. **Bu kısa/orta soak'ta birikim/leak emaresi yok.**
- Aynı süreçte API yenilemeleri 200 ilk yanıtlarından sonra ağırlıklı `304` ile dönüyor; console/runtime hata üretilmedi. Uzun saatlik fiziksel kiosk soak yine ayrı kabul maddesi olarak kalmalı.

## Erişilebilirlik bulguları

- Chrome Lighthouse snapshot: Accessibility `1.00`; otomatik baseline temiz.
- Manual Playwright + Chrome DOM/a11y incelemesinde sekiz ana kart başlığının semantik heading/region yapısına sahip olmadığı doğrulandı (**FND-4K-006**).
- Noise meter `role="meter"`, `aria-valuenow` ve runtime `aria-valuetext` güncellemeleri tutarlı; Chrome unavailable state'te `aria-valuetext="Ses Ölçer Dinlenmede"` olarak doğrulandı.
- Noise status `role="status" aria-live="polite"` erişilebilirlik ağacında doğru görünür.
- Chrome'da unavailable state'te görünür `Tekrar Dene` butonu focus edilebilir (`tabIndex=0`) ve UA focus outline'ı `auto / ~2.4px` olarak korunuyor.
- Öğrenci portreleri isim metniyle tekrarlandığı için dekoratif `alt="" aria-hidden="true"` kullanıyor; aktif slayt görselleri ise başlıktan anlamlı `alt` alıyor.
- Reduced-motion + devamsız liste senaryosunda animasyon kapandığında yalnız ilk isim görünür kalıyor; diğer isimler overflow içinde kalıyor (**FND-4K-010**). W3C'nin hareket azaltma tekniği hareketi bastırmayı destekler; bastırma sonrasında bilgi kaybı olmaması ayrıca sağlanmalı.

## Tasarım sistemi / kütüphane değerlendirmesi

İlk mimari harita:

- UI framework yok; öğrenci ekranı vanilla HTML/CSS/JS.
- Yerel fontlar: `Fredoka Variable` ve `Nunito Sans Variable` paketlerinden repo içine alınmış WOFF2 dosyaları.
- Animasyon: yerel/pinned `GSAP 3.15.0`.
- Kutlama efekti: yerel/pinned `canvas-confetti 1.9.4`.
- Ana CSS zinciri: `public/css/style.css` → `public/css/kiosk-mode.css` → `public/css/kiosk-magic-park.css`.
- Ana runtime JS zinciri: config/logger → GSAP/confetti → time/utils → kiosk-motion → API/schedule → face/media → transitions → interval/noise → `script.js` → dev-time-simulator.
- Ana görsel yapı sekiz bilgi kartlı bento düzeni ve `magic-park-theme` katmanı.
- CSS statik analiz: 6192 toplam satır, 904 selector, 3184 declaration, 198 duplicate selector, 248 same-selector property chain. Bu karmaşa gerçek görsel buglara dönüşmüş durumda (**FND-4K-005**).
- **GSAP güncellik kontrolü (10 Ağustos 2026):** GreenSock'un doğrulanmış resmî GitHub organizasyonu/repository'si güncel dağıtım örneğinde `gsap@3.15` kullanıyor ve repository activity'de son sürüm `3.15.0` (13 Nisan 2026) olarak görünüyor. Proje zaten `gsap 3.15.0` pinliyor. Dolayısıyla animasyon kalitesi için sürüm yükseltme veya farklı bir animation library'ye geçme gereği yok.
- GreenSock resmî açıklaması GSAP core'un CSS/SVG/canvas/WebGL dahil geniş animasyon yüzeylerini ve `gsap.matchMedia()` ile responsive/accessibility-friendly motion'u desteklediğini belirtiyor. Mevcut FND-4K-004/007 kütüphane yetersizliği değil, **ownership/uygulama biçimi** sorunu.
- **canvas-confetti güncellik kontrolü:** Resmî `catdad/canvas-confetti` repository'si `1.9.4` sürümünü latest (25 Ekim 2025) gösteriyor; proje de `1.9.4` pinliyor. Mevcut `public/js/confetti.js` çağrıları ayrıca `disableForReducedMotion: true` kullanıyor. Replacement gereği doğrulanmadı.
- **Native CSS cascade layers:** W3C CSS Cascade Level 5, `@layer`ı açıkça framework/theme/component/override concerns'lerini specificity/source-order yarışına bırakmadan sıralamak için tanımlıyor. Bu doğrudan FND-4K-005'in problem sınıfıyla örtüşüyor. Mevcut kiosk Chrome runtime'ında `CSSLayerBlockRule` ve `CSSLayerStatementRule` API'leri mevcut; yeni dependency gerektirmeyen güçlü bir yön.
- **Native View Transition API:** Chrome'un resmî dokümanı aynı-doküman View Transition desteğini Chrome 111+'dan itibaren veriyor; mevcut kiosk browser runtime'ında `document.startViewTransition` gerçekten `function`. Star/role gibi state swap'larında değerlendirilebilir, ancak GSAP zaten mevcut ve daha güçlü koreografi sunuyor; bu yüzden zorunlu replacement değil, seçici native enhancement adayı.
- **Rive/WebGL2:** Rive'ın resmî web runtime dokümanı WebGL2 ve Canvas runtime seçenekleri sunuyor, WebGL2'yi başlangıç tercihi olarak öneriyor. Bu ancak yüksek kaliteli **animasyonlu vektör maskot/shell/illustration** yönüne bilinçli geçiş yapılırsa gerçek görsel fayda sağlayabilir. FND-4K-001 yalnızca gerçek 4K/higher master shell üreterek de çözülebilir; sırf modern görünmek için Rive eklemek önerilmez.
- **UI framework sonucu:** React/Vue/Shadcn/Tailwind benzeri büyük bir UI migration'ı mevcut doğrulanmış problemlerin hiçbirinin kök nedenini doğrudan çözmüyor. Şu aşamada önerilmiyor.
- **Ön karar:** En yüksek kalite yolu: (1) gerçek 4K+/vektörel master art, (2) kiosk stil ownership'ini konsolide etme / cascade layers-tokens, (3) transform ve state transitions'ı ağırlıklı olarak mevcut güncel GSAP altında tek motion sistemiyle koreografiye alma, (4) native View Transition'ı yalnız gerçekten daha temiz olduğu state-swap noktalarında değerlendirme. Yeni dependency ancak bundan sonra belirli bir görsel yetenek boşluğu kalırsa eklenmeli.

### Güncel primary-source araştırma referansları

- GreenSock / GSAP resmî repository: `https://github.com/greensock/GSAP`
- canvas-confetti resmî repository: `https://github.com/catdad/canvas-confetti`
- W3C CSS Cascading and Inheritance Level 5 (`@layer`): `https://www.w3.org/TR/css-cascade-5/`
- Chrome for Developers — View Transitions: `https://developer.chrome.com/docs/web-platform/view-transitions/`
- Rive Web runtime dokümantasyonu: `https://rive.app/docs/runtimes/web/`
- Android TV design guidance: `https://developer.android.com/design/ui/tv`
- W3C WCAG 2.2 — Pause, Stop, Hide: `https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide`
- W3C technique C39 — `prefers-reduced-motion`: `https://www.w3.org/WAI/WCAG22/Techniques/css/C39`

## Otomatik/browser ortamında kapatılabilecek riskler

Şu maddeler fiziksel TV beklemeden ürün kodu düzeltme aşamasında otomatik olarak büyük ölçüde kapatılabilir ve Playwright + Chrome ile regression'a bağlanabilir:

- FND-4K-001 shell master çözünürlüğü / browser sharpness karşılaştırması.
- FND-4K-002 typography ownership ve computed font-family.
- FND-4K-003 gerçek contain/cover computed style + crop yüzdesi.
- FND-4K-004 star transition event/kare doğrulaması.
- FND-4K-005 CSS ownership/cascade regression analyzer.
- FND-4K-006 heading/landmark semantiği.
- FND-4K-007 tek transform owner doğrulaması.
- FND-4K-008 uzun `Öğle Teneffüsü` state clipping testi.
- FND-4K-009 marquee sabit px/sn hız testi.
- FND-4K-010 reduced-motion'da tüm devamsız isimlerin görünür/erişilebilir olması.
- FND-4K-011 noise high-state merkezleme testi.
- FND-4K-012 caption karakter/kompozisyon limitleri.
- CAND-4K-003 slideshow safe-area/crop matrisi büyük ölçüde browser screenshot + image analysis ile kapatılabilir.
- CAND-4K-004 non-16:9 background extension davranışı browser viewport matrisiyle kapatılabilir.

## 55" fiziksel 4K TV kabulüne özellikle bırakılacak maddeler

- **Gerçek viewing-distance okunabilirliği:** Özellikle vice/duty isimleri (CAND-4K-002), küçük yardımcı metinler ve marquee için yaklaşık sınıf mesafesinde 2.5–3.5 m göz testi.
- **Shell algısal keskinliği:** FND-4K-001 teknik olarak kanıtlandı; yeni master geldikten sonra gerçek panel sharpening/upscaling etkisi fiziksel olarak karşılaştırılmalı.
- **TV overscan / browser scaling / OS display scaling:** Kenar slot hizaları, titlebar merkezleme ve shell registration gerçek cihazda kontrol edilmeli.
- **Cursor/kiosk chrome:** CAND-4K-001 için `start.sh` ile gerçek kiosk launch, bağlı mouse/trackpad varken pointer'ın görünür kalıp kalmadığı test edilmeli.
- **Renk/gamma/kontrast:** TV'nin picture mode'u, classroom ışığı ve panel parlaklığında pastel yüzeylerin/white text'in gerçek kontrastı kontrol edilmeli.
- **Motion comfort:** GSAP ambient hareket, slideshow transition, marquee ve yıldız geçişleri uzaktan birkaç dakika gözlenmeli; “canlı ama yorucu değil” dengesi fiziksel kabul gerektirir.
- **Mikrofon gerçek state'leri:** Gerçek sınıf sesiyle low/medium/high eşikleri, high-state animasyonu ve karakter değişimi görsel olarak tekrar kabul edilmeli.
- **Video slide:** Gerçek MP4/WebM ile hardware decode, autoplay, first-frame kalitesi, audio policy ve transition akıcılığı test edilmeli; mevcut fixture setinde aktif video yok.
- **Uzun süre kiosk soak:** Browser otomasyonunda kısa/orta soak temiz; gerçek cihazda en az birkaç saat açık kalma, ekran uyku/power-management, GPU/decoder/memory davranışı ayrıca kontrol edilmeli.
- **Ağ bağımlılığı eklenirse:** Kullanıcı artık tamamen local çalışma şartı koymuyor; ileride remote font/art/runtime eklenirse internet kesintisi/fallback görünümü fiziksel kiosk kabulünün parçası olmalı.

## Son kesin checkpoint

**CP-032 — Premium çocuk/Magic Park 2.0 derin art-direction + edge-state aşaması tamamlandı.** İlk CP-020 browser baseline'ına ek olarak sekiz kart tek tek premium-çocuksu kriterlerle puanlandı; ortak shape/material/titlebar/color/depth sistemi, asset taxonomy, motion hierarchy, 27/47.5/25.5 makro hiyerarşi, Magic Park 2.0 A/B/C redesign seçenekleri, 4K production-art standardı ve görsel karakter koruma sözleşmesi çıkarıldı. Empty-role, API cold-start, microphone error, no-slides fallback, image media 404, exactly-one-slide ve avatar 404 edge-state'leri Playwright + Chrome ile derinleştirildi. Mevcut toplam: **17 doğrulanmış FND-4K bulgusu + 4 CAND-4K adayı + 19 ART-4K art-direction kararı/bulgusu**. En son kritik runtime bulguları: role API failure'da sağ sütunun boş kalması (FND-4K-015), exactly-one-slide'ın self-transition sonrası opacity 0 olması (FND-4K-016), image 404 slide'ın siyah theatre bırakması (FND-4K-017). Ürün kodunda **fix/refactor yapılmadı**; yalnız yaşayan inceleme/devir dokümantasyonu güncellendi. Fiziksel 55" 4K TV kapısı açık kalıyor.

## Bir sonraki işlem

Fix'e geçmeden önce **Magic Park 2.0 mockup karar dalgası** hazırlanmalı. İlk dört görsel hedef: (1) Sınıf Mevcudu storybook-paper/toy-badge iç yüzeyi, (2) Noise büyük mascot + entegre meter/equalizer sahnesi, (3) Başkan/Nöbetçiler hanging-plaque/helper-badge materyali, (4) Ders Akışı active-class vs after-school state-aware mini-sahnesi. Mockuplar tek kart crop'u olarak değil tam 3840×2160 ekran içinde karşılaştırılmalı. Kullanıcı görsel direction'ı seçmeden büyük ürün CSS/asset değişikliği yapılmamalı. Paralelde henüz fiziksel kabul gerektirmeyen yeni bir edge-state çıkarsa aynı yaşayan belgeye anında eklenebilir. Fiziksel 55" 4K TV kabulü otomasyonla kapatılamaz ve ayrı donanım kapısı olarak açık kalır.

## MP2-A — görsel foundation + Sınıf Mevcudu

### MP2-A başlangıç checkpoint'i — 10 Ağustos 2026

- Magic Park 2.0 implementation fazı kullanıcı onayıyla başladı; bu dalganın tek ürün hedefi **Sınıf Mevcudu** kartıdır.
- Git source-of-truth yeniden doğrulandı: `HEAD = origin/main = 740f26e5fda0a278ba894d2950f6e19276cc82e6`; tracked modified dosya yok. Önceden var olan untracked çalışma/devir belgeleri ve `docs/superpowers/` korunuyor, körlemesine silinmeyecek/commit edilmeyecek.
- DevSpace checkout workspace: `/Users/bingoweb/Projeler/Classroom-ilk-surum`; ürün server'ı DevSpace üzerinden `http://localhost:3000` adresinde başlatıldı.
- Playwright baseline viewport screenshot'ı gerçek `3840×2160` olarak alındı (`mp2-a-baseline-3840x2160.png`).
- Chrome DevTools'ta macOS `%125` ölçekleme nedeniyle ilk pencere denemesi `3072×1728` CSS px verdi. Emülasyon `4800×2700` fiziksel px olarak kalibre edilerek **gerçek `innerWidth=3840`, `innerHeight=2160` CSS viewport** doğrulandı; bu kalibre state bundan sonraki Chrome 4K kabul ölçümleri için kullanılacak.
- Chrome gerçek 4K baseline screenshot: `.artifacts/mp2-a-baseline-chrome-real-3840x2160.png`.
- 4K makro geometri baseline: sol `1036.8 px = %27.00`, merkez `1824.88 px ≈ %47.52`, sağ `978.31 px ≈ %25.48`; document scroll `3840×2160`, overflow yok.
- Sınıf Mevcudu mevcut 4K kart geometrisi: `.stats-card` `1036.8×671.75`, `.stats-body` `767.25×450.09`; kart içi ana grid `40/34/26` satır oranını koruyor.
- Mevcut yüzey doğrulaması: `present-students-panel` beyaza yakın krem gradient, `class-capacity-panel` `rgba(255,255,255,.68)`, kız/erkek yüzeyleri pastel beyaz-ağırlıklı, `attendance-box` `rgba(255,255,255,.68)`. Bu, CP-026/ART-4K generic web-card tanısıyla birebir örtüşüyor.
- Normal baseline state şu anda yoklama bekliyor; API/font/asset istekleri `200/304`, Chrome console `error/warn/issue` üretmedi.
- MP2-A tasarım kararı: makro kart/kolon geometriyi değiştirmeden aynı DOM bilgi mimarisini **storybook-paper + toy/enamel badge + sıcak garden/classroom material** ailesine taşımak; `Bugün Sınıfta` hero, `Sınıf Mevcudu` secondary badge, kız/erkek iki collectible badge ve `Bugünün Yoklaması` geniş storybook strip olarak kalacak. Devamsız alanı news ticker hissinden çıkarılacak; bilgi kaybı olmadan uzaktan okunur çocuk roster/chip sunumuna dönüştürülecek.

### MP2-A-001 — uzun devamsız roster taşması

- İlk statik chip uygulamasının gerçek `3840×2160` Chrome kabulünde 8 uzun Türkçe isimle sınanmasında `#absent-container` yalnız `52.95 px` yüksek kalırken `.marquee-content` `413.88 px` yüksekliğe büyüdü; 8/8 isim hem absent yüzeyinin hem `.stats-body` sınırının dışına taştı.
- Document seviyesinde scroll oluşmadı çünkü üst kapsayıcılar overflow'u kesti; bu nedenle hata ancak element-level clipping ölçümüyle görünür oldu.
- Bu state **FAIL**: metni küçülterek kapatılmayacak. Magic Park 2.0 hedefiyle uyumlu çözüm, isimleri tekrar eden kayan ticker yerine sabit sayfalar halinde gösteren **paged storybook roster** olacak. Her sayfada az sayıda büyük/okunur isim gösterilecek, sayfa değişimi sakin olacak ve tüm devamsız öğrenciler sırayla erişilebilir kalacak.

**Çözüm checkpoint'i:** paged roster `2 öğrenci / sayfa`, `5500 ms` sayfa süresi ve `1 / N` enamel sayfa rozetiyle uygulandı. Ticker animasyonu kaldırıldı; her öğrenci yalnız kendi sayfasında bir kez render ediliyor ve kapsayıcının `aria-label` değeri tüm devamsız isimleri birlikte taşıyor.

- Chrome DevTools `3840×2160`: 8 uzun isim = `4` sayfa; her sayfa `2` isim. Absent container `767.23×67.78`, görünür list `563.48×54.03`; iki chip de container ve `.stats-body` içinde. Dört sayfanın tamamı tek tek ölçüldü ve 8/8 benzersiz isim erişilebilir bulundu. Document `3840×2160`, overflow yok.
- Chrome DevTools `2560×1440`: absent container `511.50×45.20`, list `375.67×36.05`; iki uzun isim içeride, list scroll/client ölçümleri eşit. Document `2560×1440`, overflow yok.
- Chrome DevTools `1920×1080`: absent container `383.61×33.92`, list `282.73×28.05`; en uzun örnek isim iki satıra sarılsa da chip/container içinde kalıyor, `scrollWidth=clientWidth=283`, `scrollHeight=clientHeight=28`. Document `1920×1080`, overflow yok.
- Chrome uzun-state kanıt ekranları: `.artifacts/mp2-a-long-chrome-3840x2160.png`, `.artifacts/mp2-a-long-chrome-2560x1440.png`, `.artifacts/mp2-a-long-chrome-1920x1080.png`.
- MP2-A-001 browser düzeyinde **RESOLVED**. Playwright çapraz doğrulaması ve tam kiosk regression kapısı aşağıdaki dalga kabulünde ayrıca çalıştırılacak.

### MP2-A-002 — yoklama şeridi sağ dekoratif çivi gölgesi geçersiz CSS uzunluğu

- Final diff/computed-style kontrolünde `.attendance-box::after` için ikinci dekoratif çiviyi üretmek amacıyla yazılan `box-shadow: calc(100% + 19.1cqw) ...` ifadesinin Chrome tarafından kabul edilmediği doğrulandı; computed `boxShadow` değeri `none` oldu.
- Bu işlevsel bir hata değil, ancak MP2-A'nın kozmetik kalite kapsamına girdiği için bırakılmayacak. Yüzde içermeyen geçerli `cqw` offset ile düzeltilecek ve computed-style'da ikinci enamel detayın gerçekten render edildiği yeniden doğrulanacak.

**Çözüm checkpoint'i:** RED regresyon testi eklendi, `box-shadow` offset'i `19.1cqw` olarak düzeltildi ve HTML script girintisi temizlendi. Chrome gerçek `3840×2160` computed-style yeniden doğrulamasında `.attendance-box::after` artık `rgb(210, 161, 93) 733.44px 0px 0px 0px` box-shadow üretiyor; MP2-A-002 **RESOLVED**.

### MP2-A tamamlanma checkpoint'i — 10 Ağustos 2026

**Uygulanan ürün kapsamı**

- Yalnız `Sınıf Mevcudu` iç yüzeyi Magic Park 2.0'a geçirildi; ana kolonlar, sekiz mekân mimarisi ve mevcut kartın dış geometri/shell kaydı değiştirilmedi.
- `Bugün sınıfta` ana sahnesi storybook-paper + bahçe ışığı, `Sınıf mevcudu` sıcak sarı toy/enamel plaka, kız/erkek alanları collectible pembe/aqua badge, `Bugünün yoklaması` parchment/enamel şerit diline geçirildi.
- Generic beyaz web-card hissi; sıcak kağıt grain'i, boyalı/oyuncak kenarlar, kontrollü inset/outset depth ve bahçe renkleriyle azaltıldı. Büyük yeni UI framework veya dependency eklenmedi.
- Devamsız alanı tekrar eden haber ticker'ından çıkarıldı. `2 öğrenci / sayfa`, `5500 ms`, `1 / N` sayfa rozeti kullanan sakin storybook roster'a dönüştü; ticker animasyonu `none`, isimler küçültülerek gizlenmiyor ve kapsayıcı `aria-label` içinde tüm devamsız öğrenciler korunuyor.
- Cache-busting final: `kiosk-magic-park.css?v=12`, `script.js?v=10`.

**Playwright final kabul matrisi**

- Final build yeniden yüklenerek `3840×2160`, `2560×1440`, `1920×1080` çözünürlüklerinin her birinde **normal**, **TAM KADRO / empty**, **8 uzun devamsız / long-content** state'leri tekrar kuruldu.
- Üç çözünürlükte document ölçüsü viewport ile birebir; yatay/dikey document overflow yok.
- Makro oranlar korunuyor: 4K `0.270000 / 0.475229 / 0.254768`, 1440p `0.269996 / 0.475227 / 0.254766`, 1080p `0.269995 / 0.475229 / 0.254771`.
- 4K `.stats-card` final `1036.8×671.75`; normal `.stats-body` yaklaşık `767.16×450.03`. Bu değerler baseline dış kart geometrisini koruyor.
- Empty state üç çözünürlükte `TAM KADRO`, absent surface `display:none`, item count `0`, clipping/overflow yok.
- Long-content state üç çözünürlükte `8 ÖĞRENCİ YOK`; her sayfada `2` öğrenci, toplam `4` sayfa. Dört sayfa tek tek ölçüldü; 8/8 benzersiz isim erişilebilir, her chip absent container ve `.stats-body` içinde, list `scrollWidth==clientWidth` ve `scrollHeight==clientHeight`, animation `none`.
- Final Playwright computed-style ayrıca ikinci enamel çivinin üç çözünürlükte gerçekten render edildiğini doğruladı: 4K `733.44 px`, 1440p `488.96 px`, 1080p `366.72 px` horizontal shadow offset.
- Playwright final koşusunda console `error/warning = 0`, failed request `0`.
- Final Playwright screenshot seti: `mp2-a-normal-playwright-3840x2160-final.png`, `mp2-a-empty-playwright-3840x2160-final.png`, `mp2-a-long-playwright-3840x2160-final.png`; aynı üçlü `2560x1440-final` ve `1920x1080-final` adlarıyla da alındı.

**Chrome DevTools final kabul matrisi**

- Final normal screenshot'lar: `.artifacts/mp2-a-normal-chrome-3840x2160-final.png`, `.artifacts/mp2-a-normal-chrome-2560x1440-final.png`, `.artifacts/mp2-a-normal-chrome-1920x1080-final.png`.
- Final empty screenshot'lar: `.artifacts/mp2-a-empty-chrome-3840x2160.png`, `.artifacts/mp2-a-empty-chrome-2560x1440.png`, `.artifacts/mp2-a-empty-chrome-1920x1080.png`.
- Final long-content screenshot'lar: `.artifacts/mp2-a-long-chrome-3840x2160-final.png`, `.artifacts/mp2-a-long-chrome-2560x1440-final.png`, `.artifacts/mp2-a-long-chrome-1920x1080-final.png`.
- Chrome final normal 4K: viewport/document `3840×2160`, makro oranlar `%27.00 / %47.5229 / %25.4768`, `.stats-card 1036.8×671.75`, `.stats-body 767.23×450.08`, absent hidden, `YOKLAMA BEKLENİYOR`.
- Chrome final long-content: 4K absent `767.23×67.78`, list `563×54`; 1440p absent `511.50×45.20`, list `376×36`; 1080p absent `383.61×33.92`, list `283×28`. Her üçünde list client/scroll ölçümleri eşit ve görünür iki isim container içinde.
- Chrome final console `error/warn/issue = 0`. Network'te document, `kiosk-magic-park.css?v=12`, `script.js?v=10`, fontlar, vendor dosyaları, API ve görsel asset'ler `200`; sonraki cache/refresh istekleri `304`. Başarısız ağ isteği gözlenmedi.

**Final regresyon kapısı**

- `npm run test:kiosk-magic-park` → **15/15 PASS**.
- `npm run test:kiosk-css-analysis` → **7/7 PASS**.
- `npm run test:kiosk-titlebar-resize` → **4/4 PASS**.
- Toplam ilgili kiosk regresyonu: **26/26 PASS, 0 fail**.
- MP2-A sırasında gerçek browser'da bulunan `MP2-A-001` uzun roster taşması ve `MP2-A-002` geçersiz dekoratif shadow uzunluğu RED→GREEN döngüsüyle kapatıldı.

**MP2-A sonucu:** otomasyon/browser kabulü bakımından **COMPLETE**. Fiziksel 55" 4K TV uzaktan okunabilirlik/göz kabulü ayrı donanım kapısı olarak açık kalır. Sonraki Magic Park 2.0 dalgasına geçmeden önce bu checkpoint yeni oturumlarda source-of-truth olarak devralınmalıdır.

## MP2-B — Sınıfın Ses Dengesi / Noise maskot sahnesi

### MP2-B başlangıç checkpoint'i — 10 Ağustos 2026

- MP2-A kapanışı yaşayan envanterden yeniden okundu ve tekrar uygulanmayacak.
- Git source-of-truth yeni oturumda yeniden doğrulandı: `HEAD = origin/main = 740f26e5fda0a278ba894d2950f6e19276cc82e6`.
- Mevcut tracked modified dosyalar: `public/css/kiosk-magic-park.css`, `public/index.html`, `public/js/script.js`, `tests/kiosk-magic-park.test.js`. Bunlar MP2-A'nın henüz commit edilmemiş ürün/test değişiklikleridir ve korunacaktır.
- `.artifacts/`, yaşayan proje belgeleri ve `docs/superpowers/` altındaki mevcut untracked içerikler korunacak; körlemesine silinmeyecek veya temizlenmeyecek.
- Yaşayan planın MP2-A sonrası sıradaki gerçek Magic Park 2.0 dalgası **Sınıfın Ses Dengesi** olarak belirlendi.
- Bu dalganın art-direction hedefi: turkuaz müzik/bahçe dış mekânını ve üç durumlu `Sessiz / Dikkat / Gürültü` anlamını korurken maskotu gerçek kart kahramanı yapmak; status/meter/equalizer parçalarını ayrı generic web panelleri gibi değil tek bir canlı storybook sahnesi gibi bütünleştirmek; ikinci yüz-karakter ikon karmaşasını azaltmak; premiumluk adına kurumsal dashboard/glassmorphism yönüne kaymamak.
- Bu dalga aynı kartın zaten doğrulanmış iki gerçek motion/geometri hatasını da güvenli biçimde kapatmayı hedefler: **FND-4K-007** (CSS transition + GSAP transform ownership çakışması) ve **FND-4K-011** (`Gürültü/high` state'inde yaklaşık 132 px sola kayma).
- Makro `27 / 47.5 / 25.5` kolon hiyerarşisi, sekiz mekân mimarisi, merkez slideshow baskınlığı ve mevcut Noise kart dış shell geometrisi değiştirilmeyecek.
- Acceptance kapısı: gerçek browser baseline; normal/unavailable + low/medium/high + microphone error/retry state'leri; `3840×2160`, `2560×1440`, `1920×1080`; clipping/overflow; tek motion-owner doğrulaması; karakter merkezleme; Playwright screenshot/computed-style; Chrome DevTools screenshot + console/network; ilgili kiosk/noise regression testleri.

### MP2-B ilk GREEN + 4K browser checkpoint'i — 10 Ağustos 2026

- RED regresyon önce eklendi ve `npm run test:kiosk-magic-park` içinde beklenen MP2-B eksikliği nedeniyle fail verdi; ürün kodu bundan sonra değiştirildi. İlk GREEN sonrası Magic Park paketi **16/16 PASS**.
- Noise iç sahnesi dış kart/shell geometrisine dokunmadan yeniden dengelendi: içerik safe-area'sı `18% 7.5% 12.5% 7.5%`, maskot kolonu `%31.5`, maskot görseli wrapper'ın `%94` genişliğine çıkarıldı. 4K'da maskot yaklaşık `459–467 px` kareye ulaştı; önceki baseline yaklaşık `265 px` idi.
- Generic beyaz panel dili; sıcak açık storybook placard + yumuşak mint/aqua classroom panel + oyuncak durum badge'leri + karakter halo/pedestal sahnesiyle değiştirildi. Equalizer artık kendi ayrı beyaz web kartına sahip değil; aynı meter sahnesinin transparan alt katmanı.
- İkincil `quiet.png` yüz-karakter status ikonu medium/error akışından kaldırıldı; sembolik mikrofon ikonu kullanılıyor. Kartın tek karakter kahramanı ana Noise maskotu olarak korunuyor.
- **FND-4K-007 root cause kapatıldı:** `noise-meter.js` artık karaktere inline `translateX(-50%)`/scale transform yazmıyor ve state timer ile transform yönetmiyor; Magic Park CSS karakter için `transition:none; animation:none`; ambient GSAP tween karakterden `.noise-character-wrapper` elemanına taşındı; state reaction ise kısa süreli tek GSAP character tween'i olup tamamlanınca temizleniyor.
- **FND-4K-011 root cause kapatıldı:** Chrome ve Playwright gerçek `3840×2160` sentetik listening state kabulünde low/medium/high son-state maskot merkez sapması yaklaşık `-0.51 px`; eski high-state yaklaşık `132 px` sola kaçma yeniden üretilemedi. Character `transform:none`, `transition:none`, `animation:none`, `characterTweens=0`; wrapper'da yalnız ambient `1` GSAP tween var.
- Chrome 4K unavailable/retry state: document `3840×2160`, karakter tamamen wrapper içinde, button görünür, Nunito secondary copy ownership'i doğrulandı. Chrome low/medium/high state'lerde character/equalizer/content kendi sınırları içinde ve document overflow yok.
- Playwright 4K çapraz doğrulama unavailable + low + medium + high state'lerinde aynı geometri/motion sonucunu verdi; document ve viewport `3840×2160` birebir.
- İlk 4K screenshot kanıtları `.artifacts/mp2-b-*-chrome-3840x2160-first.png` ve `.artifacts/mp2-b-*-playwright-3840x2160-first.png` olarak alındı. Bu henüz MP2-B final kabulü değildir; `2560×1440` ve `1920×1080`, console/network ve tam regresyon kapısı açık kalır.

### MP2-B kapanış checkpoint'i — 10 Ağustos 2026

- **MP2-B — Sınıfın Ses Dengesi / Noise maskot sahnesi COMPLETE.** Dış kart/shell geometrisi ve sekiz mekân mimarisi korunurken Noise iç sahnesi Magic Park 2.0 storybook/oyuncak materyal diline yükseltildi.
- Final cache busting: `kiosk-magic-park.css?v=13`, `kiosk-motion.js?v=5`, `noise-meter.js?v=6`; MP2-A `script.js?v=10` aynen korunuyor.
- Final gerçek browser matrisi Playwright ve Chrome DevTools ile `3840×2160`, `2560×1440`, `1920×1080` çözünürlüklerinde doğrulandı. Her çözünürlükte microphone unavailable/retry + sentetik listening `low / medium / high` state'leri kontrol edildi.
- Tüm bu state'lerde document ölçüsü viewport ile birebir; Noise content, status, meter/equalizer, retry button ve karakter kendi parent sınırları içinde. Document overflow/clipping gözlenmedi.
- Final high-state karakter merkez sapması tüm üç çözünürlükte yaklaşık `-0.51 px`. Karakter computed style `transform:none`, `transition:none`, `animation:none`; `characterTweens=0`; yalnız `.noise-character-wrapper` üzerinde `1` ambient GSAP tween var. Böylece **FND-4K-007** ve **FND-4K-011 RESOLVED** kabul edildi.
- 4K makro oranlar değişmedi: sol `0.269999`, merkez `0.475228`, sağ `0.254769` (yaklaşık `%27 / %47.5 / %25.5`).
- Chrome final console: `error = 0`, `warn = 0`, `issue = 0`. Chrome networkte başarısız request gözlenmedi; final kaynaklar `200/304`. Playwright navigation+listener sağlık kontrolünde console problem `0`, failed request `0`, HTTP `>=400` response `0`.
- Final screenshot kanıtları `.artifacts/mp2-b-{unavailable,low,medium,high}-{chrome,playwright}-{3840x2160,2560x1440,1920x1080}-final.png` seti altında tutuluyor.
- Taze regresyon kapısı: `npm run test:kiosk-magic-park` **16/16 PASS**; `npm run test:kiosk-css-analysis` **7/7 PASS**; `npm run test:kiosk-titlebar-resize` **4/4 PASS**; `node --test tests/noise-meter-state.test.js tests/noise-state-assets.test.js` **14/14 PASS**. Toplam **41/41 PASS**, `git diff --check` temiz.
- Regresyon turunda yalnız eski `noise-meter.js?v=5` cache assertion'ı kırmızı çıktı; ürün davranış hatası olmadığı doğrulanıp test sözleşmesi yeni `v=6` cache sürümüne güncellendi ve tam kapı yeniden yeşile döndü.
- Bir sonraki Magic Park 2.0 uygulama sırası yaşayan plan uyarınca `Sınıf Başkanı / Nöbetçiler / Haftanın Yıldızları` öğrenci rol sahneleridir. Yeni dalga başlamadan önce bu MP2-B checkpoint'i source-of-truth kabul edilmelidir.

## MP2-C — Sınıf Başkanı / Nöbetçiler / Haftanın Yıldızları rol sahneleri

### MP2-C başlangıç checkpoint'i — 10 Ağustos 2026

- MP2-B kapanışı source-of-truth olarak devralındı; Noise alanına tekrar girilmeyecek.
- Sıradaki yaşayan plan adımı **Başkan + Nöbetçiler + Haftanın Yıldızları** sağ-sütun rol sahneleridir.
- Dış shell, sağ kolon oranı ve üç kartın mevcut treehouse / mavi clubhouse / pembe magical portal mekân metaforları korunacak. Amaç içeriği generic personel kartı/white-card sistemi olmaktan çıkarıp çocuklara özel **hanging plaque / helper badge / collectible award** materyal diline taşımaktır.
- Bu dalganın doğrudan ele alacağı doğrulanmış bulgular: **FND-4K-004** (Yıldız geçişlerinin Magic Park visibility modeli yüzünden görünmemesi), **FND-4K-013** (üç rol kartının empty-state sahnelerinin zayıf placeholder görünmesi), **FND-4K-015** (`/api/roles` cold-start failure'da üç rol sahnesinin tamamen boş kalması) ve stars empty-state'teki system-font adasının **FND-4K-002** kapsamı.
- Aday kalite kontrolü: **CAND-4K-002** kapsamında vice-president/duty isimlerinin fiziksel uzaktan okunabilirliği; uzun Türkçe adlar kırpılmadan daha güçlü tipografik hiyerarşiyle ele alınacak. Bilgiyi azaltmak veya fontu sırf sığdırmak için küçültmek tercih edilmeyecek.
- Normal data, long-name stress, roles empty, roles API failure ve star transition state'leri ayrı ürün durumları olarak kabul edilecek.
- Acceptance kapısı yine `3840×2160 / 2560×1440 / 1920×1080`, Playwright + Chrome DevTools, clipping/overflow, normal + empty + API-failure + long-content + star transition, console/network ve ilgili regression testlerini kapsar.

### MP2-C-001 — Yıldız sayacı ilk GREEN yerleşiminde alt sınırı aşıyor

- **Durum:** RESOLVED.
- MP2-C ilk Playwright `3840×2160` normal-state kabulünde `#stars-container` alt kenarı ≈`2115.08px`, `.star-dots` alt kenarı ≈`2117.23px`; sayaç yaklaşık **2.15px** parent sınırını aşıyor.
- Aynı sayaç aktif yıldız isim şeridinin alt bölümüyle de optik olarak çakışıyor (`star-name bottom ≈2111.84px`).
- Kök neden yeni MP2-C CSS'inde `.star-dots { bottom: -0.1cqh; }` ile sayacı sahne altına gereğinden fazla itmek.
- RED regresyon eklendi ve beklenen eski alt yerleşim nedeniyle fail verdi. Sayaç küçültülmeden/gizlenmeden `.star-dots { top: 0.3cqh; bottom: auto; }` ile avatar üstündeki güvenli boşluğa taşındı.
- GREEN sonrası Playwright `3840×2160`: `stars-container top/bottom ≈ 1633.94 / 2115.10`, dots `top/bottom ≈ 1640.41 / 1658.83`; parent içinde ve aktif yıldız isim şeridiyle hesaplanan kesişim **0 px**. İlgili Magic Park paketi yeniden **17/17 PASS**.

### MP2-C / FND-4K-013 empty-state geometri alt bulgusu

- İlk GREEN Playwright `3840×2160` valid-empty ve roles-failure kabulünde Başkan sahnesi parent genişliği ≈`714 px` iken `.role-empty-state--president` implicit auto grid track nedeniyle yalnız ≈`421–479 px` genişliğe oturdu. Duty ve Stars empty-state'leri kendi parent genişliklerini dolduruyor.
- Bu yeni bir bağımsız finding değil; mevcut **FND-4K-013** zayıf/placeholder empty-state bulgusunun Başkan kartındaki somut grid kök nedenidir.
- Çözüm: `#president-container` için açık `grid-template-columns: minmax(0, 1fr)` tanımlanarak normal ve empty/fallback sahnelerin aynı tam-genişlik grid omurgasını paylaşması. RED statik sözleşme eklendikten sonra browserda tekrar ölçülecek.

### MP2-C kapanış checkpoint'i — 10 Ağustos 2026

- **MP2-C — Sınıf Başkanı / Nöbetçiler / Haftanın Yıldızları COMPLETE.** Sağ sütunun treehouse / mavi clubhouse / pembe award-portal dış mekânları korunurken içerideki generic personel kartları storybook role plaque / helper badge / collectible award materyal diline geçirildi.
- Final cache busting: `kiosk-magic-park.css?v=14`, `script.js?v=11`; önceki `kiosk-motion.js?v=5`, `noise-meter.js?v=6` korunuyor.
- Başkan ana alanı sıcak parchment/gold hanging-plaque yüzeyi, metalik oyuncak pin detayları ve daha güçlü rol-name plaque hiyerarşisine geçti. `#president-container` açık `minmax(0,1fr)` sütun sahipliğiyle normal/empty/fallback state'lerde aynı tam-genişlik omurgayı kullanıyor.
- Başkan yardımcıları mint/aqua helper-badge; Nöbetçiler mavi/aqua görev rozeti/plaka yüzeyleri aldı. 4K'da vice isimleri ≈`26.88px`, normal duty isimleri ≈`26.11px`; gerçek uzun `Emir Can Özdemir Yıldırımoğlu` ≈`24.58px` korunurken metin alanı genişletildi ve clipping oluşmadı.
- Yıldızlar legacy 7 transition class sisteminden çıkarıldı. Pasif slide'lar artık `display:grid + visibility/opacity` ile compositing'e hazır tutuluyor; tek GSAP timeline outgoing/incoming iki slide'ı kontrollü crossfade/scale/y hareketiyle değiştiriyor. Playwright ve Chrome üç çözünürlükte 320ms örneklerinde **iki slide aynı anda görünür (`visibleCount=2`)**; transition bitiminde yalnız yeni aktif slide görünür kalıyor. **FND-4K-004 RESOLVED.**
- Valid roles-empty state'leri role-specific büyük prop + Fredoka title + Nunito supporting copy + sıcak materyal yüzeyleriyle yeniden tasarlandı. Üç çözünürlükte empty yüzeyler parent genişliklerini tam dolduruyor, `overflow=[0,0]`, icon/title/message rect'leri yüzey içinde. **FND-4K-013 RESOLVED.**
- `/api/roles` cold-start invalid/error yolu artık üç sahneyi boş bırakmıyor; teknik hata dili göstermeyen calm role fallback'leri üretiyor. Önceden geçerli role DOM'u varsa transient refresh failure'da korunuyor. Unit regression + Playwright gerçek `/api/roles=500` cold-start + Chrome aynı fallback render/computed-style kabulü tamamlandı. **FND-4K-015 RESOLVED.**
- MP2-C sırasında bulunan **MP2-C-001** Yıldız sayacı taşması RED→GREEN kapatıldı: dots alt isim şeridinden avatar üstü güvenli boşluğa taşındı; üç çözünürlükte parent içinde ve name overlap `0px`.
- Browser kabul matrisi Playwright + Chrome DevTools ile `3840×2160 / 2560×1440 / 1920×1080` için tamamlandı: normal gerçek veri + gerçek uzun isim, star transition, valid-empty ve API-failure/fallback sahneleri. Tüm state'lerde document ölçüsü viewport ile birebir; role surface clipping/overflow yok.
- Chrome final normal production state: `error=0`, `warn=0`, `issue=0`; network başarısız request yok, final `kiosk-magic-park.css?v=14` ve `script.js?v=11` dahil kaynaklar `200/304`. Playwright taze normal-state listener doğrulaması: console problem `0`, failed request `0`, HTTP `>=400` response `0`.
- Final screenshot kanıtları `.artifacts/mp2-c-{normal,transition,empty,failure}-{playwright,chrome}-{3840x2160,2560x1440,1920x1080}-final.png` seti altında tutuluyor.
- Taze regression gate: `npm run test:kiosk-magic-park` **17/17 PASS**; `npm run test:kiosk-css-analysis` **7/7 PASS**; `npm run test:kiosk-titlebar-resize` **4/4 PASS**; Noise state/assets **14/14 PASS**; DOM safety + kiosk runtime optimization birlikte **12/12 PASS**. Toplam **54/54 PASS**, `git diff --check` temiz.
- **CAND-4K-002 kapanmadı:** otomasyonda role tipografisi güçlendirildi ve clipping yok; ancak 55" panelde yaklaşık 2.5–3.5m gerçek viewing-distance okunabilirliği fiziksel kabul gerektirir.
- Yaşayan uygulama sırasındaki bir sonraki gerçek Magic Park 2.0 dalgası **Günün Zamanı + Ders Akışı state-aware mini-sahne rafinasyonu**dur. MP2-C tekrar açılmadan bu checkpoint source-of-truth kabul edilmelidir.

## MP2-D — Günün Zamanı + Ders Akışı state-aware mini-sahneleri

### MP2-D başlangıç checkpoint'i — 10 Ağustos 2026

- MP2-C kapanışı source-of-truth olarak devralındı; sağ rol sütunu tekrar açılmayacak.
- Yaşayan planın sıradaki gerçek Magic Park 2.0 adımı **Günün Zamanı + Ders Akışı**dır. Makro sol kolon geometrisi (`36.4% / 31.1% / 32.5%`) ve dış sky/wood + lilac clubhouse mekân metaforları korunacaktır.
- **Günün Zamanı art-direction:** mevcut kart zaten güçlü kimlik referansıdır; büyük saat hero ölçeği, gün → tarih → saat → hafta-sonu ritmi ve güneş/bulut/ahşap shell korunacak. Yalnız tarih/supporting typography ownership'i ortak Fredoka/Nunito sistemine alınacak (**FND-4K-002 kapsamı**) ve weekend pill generic web capsule yerine küçük toy-enamel/calendar park badge hissine rafine edilecek.
- **Ders Akışı art-direction:** büyük timer hero ve progress bilgisi korunacak. Ders/teneffüs context badge'i toy-enamel / painted-sign mantığına geçirilecek; before-school, active lesson/break ve after-school/weekend aynı boş panelin metin değiştiren varyantları gibi değil aynı lilac clubhouse dünyasının state-specific mini-sahneleri gibi çalışacak.
- Bu dalganın doğrudan teknik bug hedefi **FND-4K-008**: `Öğle Teneffüsü` label'ı 4K'da ellipsis/clipping'e düşmeyecek; metin kısaltılmayacak ve çözüm sırf sığdırmak için agresif font küçültme olmayacak.
- State matrisi en az: before-school, active lesson, normal break, longest-break/`Öğle Teneffüsü`, last lesson, after-school/goodbye ve weekend. Normal/long state'lerde timer/context/progress alanlarının clipping/overflow'u ayrı ölçülecek.
- Acceptance yine Playwright + Chrome DevTools ile `3840×2160 / 2560×1440 / 1920×1080`, normal production health, state screenshots/computed-style, console/network ve ilgili kiosk/schedule/countdown regression testlerini kapsar.

### MP2-D gerçek 4K baseline checkpoint'i — 10 Ağustos 2026

- Gerçek `?gelistirme=1` zaman simülatörü kullanılarak Playwright `3840×2160` state matrisi alındı: `before-school`, `first-class`, `first-break`, `longest-break`, `last-class`, `after-school`, `weekend`. Her preset sonrası simülatör state'i yaklaşık 1.25sn bekletildi ve panel screenshot öncesi gizlendi; ürün DOM/state'i gerçek simülatör üzerinden kaldı.
- Tüm state'lerde document `3840×2160`; sol kolon/dış kart geometrisi kaçmıyor. Ders Akışı aktif iç sahnesi baseline olarak yaklaşık `705×407px`.
- **FND-4K-008 yeniden üretildi:** Playwright ve Chrome `longest-break / Öğle Teneffüsü` state'inde single current chip ≈`369.81×97.19px`, value alanı ≈`321.81px`; metin `clientWidth≈322`, `scrollWidth≈370`, `white-space:nowrap`, `overflow-x:hidden`, `text-overflow:ellipsis`, `font-size:48px`. İki browser aynı sonucu verdi.
- **FND-4K-002 tarih adası yeniden doğrulandı:** `#date.date-full` iki browserda `"Avenir Next", "Segoe UI Variable Display", "Segoe UI", ...` computed font-family kullanıyor; Magic Park'ın Fredoka/Nunito sistemine henüz sahip değil.
- Weekend badge baseline iki browserda yaklaşık `417.78×94.13px`, `border-radius:999px`, beyaz/açık-mavi generic capsule gradient. Art-direction hedefi toy-enamel/calendar park badge olarak rafinasyon.
- After-school baseline Chrome: `.goodbye-mode` ≈`705.05×407.17px`, state visual yalnız ≈`91.11×91.11px`; görsel iç sahne alanının yaklaşık **%2.89**'unu kaplıyor. Playwright aynı ~91px görsel ölçeğini verdi. Bu, CARD-03'teki “büyük alan + küçük merkez prop = tamamlanmamış state” tanısını yeniden doğruluyor.
- Baseline kanıtları `.artifacts/mp2-d-baseline-*-playwright-3840x2160.png`, `.artifacts/mp2-d-baseline-longest-break-chrome-3840x2160.png` ve `.artifacts/mp2-d-baseline-after-school-chrome-3840x2160.png` altında tutuluyor.

### MP2-D ilk GREEN + 4K browser checkpoint'i — 10 Ağustos 2026

- RED statik regression önce eklendi ve MP2-D token/material/state ownership'i eksik olduğu için beklenen şekilde fail verdi. İlk GREEN sonrası `npm run test:kiosk-magic-park` **18/18 PASS**.
- `#countdown-card` artık `updateCountdown()` içinde gerçek `status.mode` değerini `data-flow-state` olarak taşıyor. Böylece `before-school / in-class / in-break / after-school / weekend` görsel sahipliği DOM state'inden deterministik biçimde okunuyor.
- Saat kartında `#date.date-full` artık açıkça `Nunito Classroom`; weekend yüzeyi generic `999px` web capsule olmaktan çıkarılıp düzensiz köşeli toy-enamel/calendar park badge materyaline geçirildi. 4K computed border radius yaklaşık `30.7 / 40.3 / 31.5 / 41.5px` ve sıcak enamel gradient doğrulandı.
- Ders Akışı ortak pale paneli storybook-lilac surface'e geçirildi; before-school daha serin dawn, in-class lilac/parchment, in-break mint/sky, after-school peach/twilight, weekend moon/lilac palette kullanıyor. Timer hero ve progress bilgi hiyerarşisi korunuyor.
- Period context single-state sign tam kullanılabilir genişliğe açıldı (`637.6px` 4K). Value artık `overflow:visible`, `text-overflow:clip`, `white-space:normal`, Fredoka ownership kullanıyor; font 4K'da **48px** korunuyor.
- **FND-4K-008 RESOLVED:** Playwright ve Chrome gerçek `3840×2160` `longest-break / Öğle Teneffüsü` state'inde value rect ≈`570.17×49.91px`, `clientWidth≈570`, `scrollWidth≈570`; ellipsis/hidden yok, metin kısaltılmadı ve font küçültülmedi. Önceki baseline `client≈322 / scroll≈370` idi.
- After-school/weekend state visual'i 4K'da baseline ~`91×91px`'den yaklaşık `216.8×153.1px` görünür prop'a büyüdü; sahne alan payı yaklaşık **%2.9 → %11.6**. Title/subtitle/visual kendi `705×407px` state surface'i içinde kalıyor.
- Playwright 4K gerçek simulator matrixinde yedi preset'in tamamında document `3840×2160`; görünür title/chip/timer/progress/visual öğelerinde parent sınırı dışına kaçış gözlenmedi. Chrome 4K longest-break ve after-school çapraz kabulü aynı computed geometry/material sonucunu verdi.
- İlk GREEN kanıtları `.artifacts/mp2-d-*-playwright-3840x2160-first-green.png`, `.artifacts/mp2-d-longest-break-chrome-3840x2160-first-green.png`, `.artifacts/mp2-d-after-school-chrome-3840x2160-first-green.png` altında. `2560×1440` ve `1920×1080`, final console/network ve tam regression kapısı açık kalır.

### MP2-D-001 — active lesson/break sahnesi 1440p/1080p'de dikey sınırı aşıyor

- **Durum:** RESOLVED.
- İlk GREEN Playwright ölçek matrisinde `2560×1440` ve `1920×1080` için `first-class / first-break / longest-break / last-class` state'lerinde period chip ve progress kendi `.countdown-mode` sınırı içinde kalırken heading için `inside=false`, büyük timer için `inside=false` döndü.
- Aynı state'ler `3840×2160`'de tamamen içerideydi; dolayısıyla bu 4K kompozisyon hatası değil, alt çözünürlükte clamp/min-height/gap değerlerinin sahne yüksekliğinden daha yavaş küçülmesine bağlı responsive geometri regresyonudur.
- `Öğle Teneffüsü` metin kırpması geri dönmedi: 1440p'de 32px ve `clientWidth=scrollWidth≈380px`; 1080p'de 24px ve `clientWidth=scrollWidth≈287px`, `white-space:normal`, `overflow:visible`, `text-overflow:clip` korunuyor.
- Fix öncesi exact heading/timer rect ve computed min-height/gap değerleri ölçülecek; çözüm timer hero hiyerarşisini bozmayacak, yalnız alt çözünürlükte sahne içi dikey bütçeyi yeniden dengeleyecek. Bulgu RED regresyonla kapatılacak.
- **İlk fix denemesi:** active `.countdown-mode` vertical padding `0.85→0.65cqh`, gap `0.70→0.42cqh` yapıldı; timer font/min-height değiştirilmedi. 1080p tamamen içeri döndü (`titleTop≈+3.5px`, `timerBottom≈+3.5px`) ancak 1440p'de yalnız ≈`3.2px` simetrik taşma kaldı. Hipotez doğrulandı fakat fix henüz yeterli değil; finding açık kalır.
- **Final RED→GREEN:** active `.countdown-mode` dikey bütçesi `padding:0.6cqh 0.8cqw; gap:0.25cqh` olarak sabitlendi. Timer hero font/min-height değerlerine dokunulmadı. Exact Playwright ölçümü: 4K `titleTop/timerBottom≈+17.89px`, 1440p `≈+0.48px`, 1080p `≈+6.27px`; dört ana öğe de sıfır toleranslı rect kontrolünde parent içinde. Timer fontları `90.24 / 60.16 / 45.12px`, min-height'ler `184.8 / 144 / 92.8px` olarak korunuyor. Magic Park regression yeniden **18/18 PASS**.

### MP2-D kapanış checkpoint'i — 10 Ağustos 2026

- **MP2-D — Günün Zamanı + Ders Akışı state-aware mini-sahneleri COMPLETE.** Sol kolon makro oranları ve iki kartın dış sky/wood + lilac clubhouse shell geometrisi korunarak yalnız iç sahne/material/typography ownership'i rafine edildi.
- Final cache busting: `kiosk-magic-park.css?v=15`, `script.js?v=12`; `kiosk-motion.js?v=5`, `noise-meter.js?v=6` korunuyor.
- Günün Zamanı kartında büyük clock hero hiyerarşisi korunuyor; tarih artık `Nunito Classroom`, weekend rozeti generic `999px` capsule yerine düzensiz köşeli sıcak toy-enamel/calendar park badge. Final 4K computed radius yaklaşık `30.72 / 40.32 / 31.49 / 41.47px`.
- Ders Akışı gerçek `ScheduleManager` status'una bağlı `data-flow-state` ownership'i kullanıyor. `before-school`, `in-class`, `in-break`, `after-school`, `weekend` aynı clubhouse dünyasında farklı dawn/lilac/mint/peach/moon palette ve storybook surface ile ayrışıyor; timer hero ve progress bilgi önceliği korunuyor.
- **FND-4K-008 RESOLVED:** `Öğle Teneffüsü` single-state sign tam kullanılabilir genişliği kullanıyor; `overflow:visible`, `text-overflow:clip`, `white-space:normal`. Playwright + Chrome final matrisinde 4K `48px, client=scroll=570`, 1440p `32px, 380=380`, 1080p `24px, 287=287`; metin kısaltılmadı ve ellipsis yok.
- **MP2-D-001 RESOLVED:** active lesson/break sahnesinin 1440p/1080p dikey taşması timer hero küçültülmeden yalnız vertical budget ile kapatıldı. Final exact Playwright iç payı 4K ≈`17.89px`, 1440p ≈`0.48px`, 1080p ≈`6.27px`; heading/chip/progress/timer sıfır toleranslı rect kontrolünde parent içinde.
- After-school/weekend visual prop 4K baseline ~`91×91px`'den yaklaşık `216.8×153.1px` seviyesine çıktı; state surface kullanım payı yaklaşık `%2.9 → %11.6`. 1440p ve 1080p'de de prop/title/subtitle sahne içinde.
- **FND-4K-002 RESOLVED:** tarih, devamsız roster, Noise supporting copy ve role empty supporting copy final Chrome computed audit'te Nunito Classroom ownership'inde.
- Playwright final simulator matrixi `3840×2160 / 2560×1440 / 1920×1080` için yedi preset'in tamamında (`before-school`, `first-class`, `first-break`, `longest-break`, `last-class`, `after-school`, `weekend`) tamamlandı; her state'te document viewport ile birebir ve görünür title/subtitle/chip/timer/progress/visual parent içinde. Her preset ve çözünürlük için final Playwright screenshot alındı.
- Chrome DevTools final computed matrixi aynı üç çözünürlük ve aynı yedi state için temiz. Kritik before-school / longest-break / after-school / weekend state'lerinde üç çözünürlükte final Chrome screenshotları alındı.
- Normal production 4K sağlık kapısı: Chrome `error=0`, `warn=0`, `issue=0`; networkte başarısız request yok, CSS `v=15` ve script `v=12` dahil kaynaklar `200/304`. Playwright normal production listener kontrolü: console problem `0`, failed request `0`, HTTP `>=400` response `0`.
- Taze regression gate toplam **185/185 PASS**: Magic Park `18/18`, CSS analysis `7/7`, titlebar resize `4/4`, Noise state/assets `14/14`, DOM safety + kiosk runtime `12/12`, ScheduleManager `33/33`, Dev Time Simulator `42/42`, Dashboard Schedule Loader `55/55`. `git diff --check` temiz.
- Bir sonraki Magic Park 2.0 dalgası yaşayan plan uyarınca merkez **Sınıfımızdan / slideshow theatre** alanıdır. MP2-D tekrar açılmadan bu checkpoint source-of-truth kabul edilmelidir.

## MP2-E — Sınıfımızdan / Slideshow Theatre

### MP2-E başlangıç checkpoint'i — 10 Ağustos 2026

- MP2-D kapanışı source-of-truth olarak devralındı; sol kolon tekrar açılmayacak.
- Merkez slideshow ekranın en büyük duygusal/hero yüzeyi olarak korunacak; card/frame geometrisi küçültülmeyecek ve klasik carousel/SaaS media-card yönüne gidilmeyecek. Kırmızı perde/tiyatro metaforu, büyük medya penceresi ve merkez baskınlığı korunacaktır.
- Art-direction hedefi: medya `safe-area / contain-cover` kararı gerçekten çalışmalı; caption koyu sinematik rectangle'dan daha sıcak **theatre/story plaque** materyaline yaklaşmalı fakat fotoğraf üzerindeki kontrast kesinlikle kaybedilmemeli. Hero transition kontrollü/sinematik kalmalı.
- Bu dalganın doğrudan doğrulanmış bug hedefleri: **FND-4K-003** (contain CSS specificity nedeniyle cover kalıyor), **FND-4K-016** (tek aktif slayt kendi kendisiyle transition sonrası görünmez oluyor), **FND-4K-017** (image 404 tüm display duration boyunca siyah/boş theatre bırakıyor), **FND-4K-012** (sınırsız uzun caption frame dışına taşabiliyor).
- Empty/no-slides kalite hedefi **FND-4K-014** ile birlikte ele alınacak: 1024×1024 `tribute.webp` düşük çözünürlüklü tek fallback olarak bırakılmayacak; repo içindeki yüksek çözünürlüklü küratörlü Atatürk artwork seti fallback kaynağı olarak kullanılacak veya aynı kaliteyi sağlayan kasıtlı scene üretilecek. Performans için düşük çözünürlüklü fallback korunmayacak.
- **CAND-4K-003** doğrudan “bug” diye kapatılmayacak: standard-yatay görsellerde yaklaşık `%10–12` cover crop, gerçek kompozisyonların safe-area kabulüyle değerlendirilecek. Aşırı oran farkında `contain`, yakın oranlarda `cover` yaklaşımı korunabilir.
- Acceptance state'leri: normal çoklu image seti, panoramik contain örneği, exactly-one image, no-slides fallback, image 404 + sağlam ikinci slide, çok uzun caption, kısa/normal caption ve transition ortası. Üç çözünürlükte `3840×2160 / 2560×1440 / 1920×1080` Playwright + Chrome computed/screenshot kabulü yapılacak.

### MP2-E gerçek 4K baseline checkpoint'i — 10 Ağustos 2026

- Playwright gerçek `3840×2160` route-fixture baseline'ları prod koda dokunmadan alındı.
- **FND-4K-003 yeniden üretildi:** 3168×1344 panoramik `ataturk-3.webp` için JS `data-media-layout="contain"` ve `slide-media--contain` üretiyor; theatre frame ≈`1524.7×946.6px`, fakat computed `object-fit` hâlâ **`cover`**. Screenshot: `.artifacts/mp2-e-baseline-contain-playwright-3840x2160.png`.
- **FND-4K-016 yeniden üretildi:** exactly-one slide başlangıçta `slide active slide--media`, `display:block`, `opacity:1`. Manuel `nextSlide()` sonrası aynı DOM kendi kendisiyle transition'a giriyor; örnek 1.4sn ölçümünde `active` class kaybolmuş, slide `display:block` fakat transition stilleri sürüyor ve opacity ≈`0.997`. Tek slayt stable no-op değil. Screenshot: `.artifacts/mp2-e-baseline-single-slide-playwright-3840x2160.png`.
- **FND-4K-014 yeniden üretildi:** `/api/slides/active=[]` state'inde fallback `assets/tribute.webp`, natural `1024×1024`; theatre frame ≈`1522.3×945.1px`, image render ≈`1514.3×937.1px`. JS layout `contain` seçmesine rağmen specificity bug nedeniyle computed `object-fit:cover`; kaynak yaklaşık 1514px genişliğe büyüyor. Screenshot: `.artifacts/mp2-e-baseline-empty-playwright-3840x2160.png`.
- **FND-4K-017 yeniden üretildi:** bozuk ilk image + sağlam ikinci slide fixture'ında active broken img `display:none`, natural `0×0`; backdrop `display:none`; `data-media-failed` yok; slide background yalnız `rgb(29,32,38)` ve caption kalıyor. Kullanıcı tüm display duration boyunca siyah/boş theatre görüyor. Screenshot: `.artifacts/mp2-e-baseline-404-playwright-3840x2160.png`.
- **FND-4K-012 yeniden üretildi:** 1200 karakter caption, frame ≈`1523.6×945.9px`; caption ≈`1436.8×1201.4px` (**frame yüksekliğinin %127.0'si**), üst kenar frame dışına ≈`291.3px` taşıyor. En küçük mevcut `slide-caption-text--compact` sınıfında bile font ≈`45.31px`; caption overflow `visible`. Screenshot: `.artifacts/mp2-e-baseline-long-caption-playwright-3840x2160.png`.
- Bu baseline sonrası production fix başlamadan önce slideshow VM regression harness'i genişletilecek. Hedef: yüksek çözünürlüklü curated fallback, gerçek contain specificity ownership, one-slide stable no-op, bozuk media için storybook recovery surface + multi-slide hızlı geçiş, çok uzun caption için ayrı bounded story/text theatre layout.

### MP2-E ilk GREEN + Playwright 4K checkpoint'i — 10 Ağustos 2026

- Slideshow VM harness'i production değişikliğinden önce beş yeni RED ile genişletildi: high-res no-slides fallback, Magic Park contain/cover specificity ownership, exactly-one stable no-op, broken active image recovery surface + 1200ms advance, >420 karakter story-text theatre. İlk RED turunda beş yeni test de beklenen nedenle fail verdi; eski transition/recovery testleri yeşil kaldı.
- Production GREEN sonrası slideshow transition/recovery paketi **26/26 PASS**; Magic Park paketi **18/18 PASS**. Final cache adayı `kiosk-magic-park.css?v=16`, `script.js?v=13` olarak yükleniyor.
- **FND-4K-003 GREEN adayı:** Playwright gerçek `3840×2160` panoramik `ataturk-3.webp` fixture'ında `data-media-layout=contain`, class `slide-media--contain`, computed `object-fit=contain`; natural `3168×1344`, frame ≈`1516.3×941.4px`. Baseline aynı state'te computed `cover` idi.
- **FND-4K-016 GREEN adayı:** exactly-one slide `display_duration=350ms` olmasına rağmen 1.5sn sonra `slide active slide--media`, `display:block`, `opacity:1`; kendi kendisiyle transition başlatılmadı ve active state kaybolmadı.
- **FND-4K-014 GREEN adayı:** no-slides fallback artık `assets/ataturk-slides/ataturk-1.webp`, natural `2816×1536`; 4K theatre frame ≈`1514.8×940.4px`. Fallback artık 1024×1024 tribute görselini büyütmüyor.
- **FND-4K-017 GREEN adayı:** bozuk aktif image state'inde slide `data-media-failed=true`, broken img hidden, `.slide-media-fallback` computed `display:grid`; UI metni `Bu anı kısa bir molada / Sıradaki kareye geçiyoruz`. Sağlam ikinci slide varken 1200ms recovery başlıyor; 2.5sn sonraki örnekte active slide id sağlam ikinci kare (`9304`). Siyah theatre tüm display duration boyunca kalmıyor.
- **FND-4K-012 GREEN adayı:** 1200 karakter slide artık `slide--story-text`; bounded story panel ≈`1296.7×783.7px`, copy ≈`1052.2×612.7px`, full `1200` karakter korunuyor; panel ve copy kendi sınırları içinde, font ≈`32.26px`, line-height ≈`38.06px`, frame dışına taşma yok. Baseline aynı metin frame yüksekliğinin `%127`'sine ulaşıyordu.
- Normal caption surface sıcak theatre/story plaque materyaline geçirildi; medya altındaki sinematik kontrast korunurken steril koyu rectangle hissi azaltıldı.
- 4K ilk GREEN screenshot kanıtları `.artifacts/mp2-e-{contain,single,empty,404-recovery,404-recovered,long-caption,transition}-playwright-3840x2160-first-green.png` altında. Transition 700ms örneği smart `zoom-out` efektinin ilk fazına denk geldi (`outgoing opacity≈0.68`, incoming display:block fakat opacity 0); mevcut transition engine iki-fazlı efektleri bilinçli kullandığı için bu tek örnekten yeni finding açılmadı. Final transition timing ayrıca ölçülecek.
- `2560×1440`, `1920×1080`, Chrome çapraz kabulü, final health ve full regression kapısı henüz açık.

### MP2-E-001 — 1200 karakter story copy 1440p'de panel içinde gizli dikey clipping üretiyor

- **Durum:** RESOLVED.
- Playwright `2560×1440` final-candidate edge turunda story panel ve copy rect'leri theatre/panel sınırları içinde görünse de `.slide-caption-text--story` `scrollHeight≈431px`, `clientHeight≈412px`; `overflow:hidden` nedeniyle yaklaşık **19px** içerik görünmeden kesiliyor.
- Font ≈`21.50px`; 4K aynı 1200 karakter ≈`32.26px` ile sığıyor. Bu nedenle çözüm metni sürekli küçültmek olmayacak.
- Kök neden story plaque'ın `padding:3.8cqh 3.1cqw` ile alt çözünürlükte içerik yüksekliğinden gereğinden fazla dikey bütçe tüketmesi. Panel yüksekliği ve font ölçekleri oransal küçülürken toplam top+bottom padding 1440p'de yaklaşık 109px alan alıyor.
- Çözüm yönü: story plaque vertical padding'i azaltıp aynı font ölçeğini korumak; 4K premium nefes alanı bozulmadan 1440p ve 1080p'de `scrollHeight <= clientHeight` gerçek içerik kabulü sağlanacak. RED statik sözleşme + browser ölçümüyle kapatılacak.
- **RED→GREEN:** story plaque vertical padding `3.8cqh → 3cqh` yapıldı; horizontal `3.1cqw` ve story font scale korunuyor. Slideshow VM paketi yeniden **26/26 PASS**.
- Final Playwright içerik ölçümü: 1440p font `21.504px`, copy `scrollHeight=clientHeight=431px`, hidden vertical `0`; 1080p font `16.128px`, `scrollHeight=clientHeight=323px`, hidden vertical `0`. Her iki çözünürlükte panel ve copy rect'leri theatre/panel sınırları içinde.

## MTS — Çoklu Okul Teması Sistemi

### MTS başlangıç checkpoint'i — 10 Ağustos 2026

- Kullanıcının bu oturumdaki açık kararı, önceki “yalnız Magic Park 2.0” yönünü genişletir: mevcut **Magic Park** korunacak; buna ek olarak **Renkli Okul Bahçesi** ve **Bilim Temalı Okul** gerçek, değiştirilebilir kiosk temaları olacaktır. Bu dalgada yeni görsel üretimi **yasaktır**; Image Generation kullanılmayacaktır.
- Başlangıç Git gerçekliği: `HEAD = origin/main = 740f26e5fda0a278ba894d2950f6e19276cc82e6`. Çalışma ağacı önceki MP2-E geliştirmesinden tracked/untracked değişiklikler içeriyor; bunlar source-of-truth kabul edilip korunacak, reset/clean/revert edilmeyecek.
- ChatGPT Library'de bugün oluşturulmuş final adayları doğrulandı:
  - `image-gen-1(3).png` (`file_0000000093a481f4aada0926247bb8cf`) → **Renkli Okul Bahçesi**: Türkiye ilkokul bahçesi, Türk bayrağı/okul/kitap-kalem/çanta öğeleri, sıcak parchment panolar.
  - `image-gen-2(3).png` (`file_00000000149c8243b70475b3be9d9b36`) → **Bilim Temalı Okul**: Türkiye okul bahçesi, lacivert-altın pano dili, mikroskop/teleskop/küre/deney öğeleri.
- Library assetleri henüz product asset klasörüne alınmadı. TDD asset-path RED'i görülmeden product asset eklenmeyecek. Proje asset aktarımı DevSpace üzerinden yapılacak; başka geliştirme aracıyla checkout mutasyonu yapılmayacak.
- Mevcut persistence incelemesi: eski kiosk `settings-loader/display-mode-manager` katmanı bilinçli olarak kaldırılmış; backend `/api/settings` yazımı admin-session + CSRF korumalı compatibility contract. Kiosk browserında `localStorage` hâlihazırda debug/face-focus cache için kullanılıyor. Bu nedenle **yalnız görsel kiosk tema tercihi için localStorage**, iş mantığına en az dokunan ve mevcut güvenlik modelini bozmayan tercih olarak seçildi.

#### Gerçek 8 DOM kutusunun source-of-truth geometrisi

Playwright ve Chrome DevTools aynı değerleri verdi; document her çözünürlükte viewport ile birebir, document-level overflow yok. Kartlar oransal olarak ölçekleniyor.

| Kart | 3840×2160 `(x,y,w,h)` | 2560×1440 `(x,y,w,h)` | 1920×1080 `(x,y,w,h)` | İçerik/dinamik yoğunluk özeti |
|---|---:|---:|---:|---|
| Günün Zamanı | `0,0,1036.80,786.23` | `0,0,691.19,524.16` | `0,0,518.39,393.11` | tarih + büyük saat + weekend badge; 5 dinamik id |
| Sınıf Mevcudu | `0,786.23,1036.80,671.75` | `0,524.16,691.19,447.83` | `0,393.11,518.39,335.88` | hero attendance + kapasite + kız/erkek + yoklama/devamsız; 9 dinamik id |
| Ders Akışı | `0,1457.98,1036.80,702.00` | `0,971.98,691.19,468.00` | `0,728.98,518.39,351.00` | before-school / lesson-break / after-school-weekend state'leri; 11 dinamik id |
| Sınıfın Ses Dengesi | `1036.80,0,1824.88,844.55` | `691.19,0,1216.58,563.03` | `518.39,0,912.44,422.27` | karakter + status + meter/equalizer + retry; 134 dinamik id / yüksek DOM yoğunluğu |
| Sınıfımızdan | `1036.80,844.55,1824.88,1315.44` | `691.19,563.03,1216.58,876.95` | `518.39,422.27,912.44,657.72` | dinamik slideshow, caption, media/fallback/transition state'leri; ekranın en büyük hero alanı |
| Sınıf Başkanı | `2861.67,0,978.31,844.55` | `1907.77,0,652.20,563.03` | `1430.83,0,489.16,422.27` | başkan/yardımcılar + role empty/failure; fotoğraf ve uzun ad gereksinimi |
| Nöbetçiler | `2861.67,844.55,978.31,673.91` | `1907.77,563.03,652.20,449.27` | `1430.83,422.27,489.16,336.95` | çoklu öğrenci/uzun ad + empty/failure; 9 dinamik id |
| Haftanın Yıldızları | `2861.67,1518.45,978.31,641.52` | `1907.77,1012.30,652.20,427.67` | `1430.83,759.22,489.16,320.75` | yıldız slideshow/transition + empty/failure; fotoğraf/name/dots |

- Mevcut Magic Park baseline geometrisi: sol kolon **%27**, merkez **%47.52**, sağ **%25.48**. Sol dikey `36.4 / 31.1 / 32.5`; merkez `39.1 / 60.9`; sağ `39.1 / 31.2 / 29.7`.
- **Yeni bağlayıcı karar:** Bu oranlar yalnız Magic Park baseline'ıdır; yeni okul temalarında sabit olmak zorunda değildir. Arka plan artwork'ünün gerçek pano/safe-zone geometrisi daha iyi bir kompozisyon gerektiriyorsa tema bazında `grid-template-columns`, row oranları, kart insetleri, başlık konumları ve content safe-area tokenları değiştirilebilir. Değişmeyen sözleşme: sekiz gerçek DOM kartının işlevi, erişilebilirliği ve dinamik içeriği korunur; tema resmi hiçbir kartın yerine geçmez.
- Başlıkların 4K gerçek DOM yüksekliği yaklaşık: sol/merkez normal başlıklar `59.5px`, slideshow `69.9px`, sağ kolon `49.2px`; 1440p ve 1080p'de doğrusal küçülüyor. Başlıklar raster arka planın parçası olmayacak.
- Görsel panolar dekoratif rehberdir; gerçek UI değildir. Tema CSS'i `background-size/background-position`, tema tokenları, card transparency/material, title contrast ve **tema-özel layout geometry** değerleriyle artwork'e kayıt edilebilir. Önce artwork'teki kullanılabilir pano/safe-zone alanları ölçülür, ardından gerçek sekiz DOM kartı bu alanlara kontrollü biçimde yerleştirilir. Mevcut Magic Park geometrisini yeni temaya aynen taşımak zorunlu değildir.
- Playwright'ın ilk ölçüm anında bazı kartlarda child/dekor kaynaklı `scrollWidth > clientWidth` görülebilirken Chrome DevTools aynı 4K state'te kart bazında taşma vermedi ve document ölçüsü iki browserda viewport ile birebir kaldı. Bu nedenle şu anda yeni user-visible overflow finding açılmadı; final tema kabulünde gerçek clipping/document overflow ayrı kontrol edilecek.

### Çoklu tema üretme ve uygulama sözleşmesi — bağlayıcı

1. Classroom için bundan sonra yeni bir tema tasarlanmadan önce gerçek **8 dashboard kutusunun DOM/CSS geometrisi** ölçülür.
2. Görseldeki pano alanları ile gerçek DOM kutuları birlikte tasarlanır. Yeni artwork üretiliyorsa pano alanları DOM ihtiyaçlarına göre tasarlanmalıdır; mevcut artwork kullanılıyorsa DOM geometrisi tema bazında artwork safe-zone'larına uyarlanabilir. Yasak olan, içerik okunabilirliğini/işlevini bozarak UI'yi körlemesine görsele zorlamaktır.
3. Ana kalite hedefi **3840×2160 4K**'dır.
4. Aynı tema ayrıca **2560×1440** ve **1920×1080** ekranlarda doğrulanmalıdır.
5. Görünüm ve kozmetik kalite performans uğruna kırpılmayacaktır.
6. Tema çocuklara yönelik, canlı ve premium olabilir; ancak kurumsal SaaS dashboard görünümüne dönmemelidir.
7. Okul temaları Türkiye'deki ilkokul kültürüne uygun olmalıdır.
8. Türk bayrağı, okul yapısı ve Türkiye'ye özgü görsel öğeler kullanılacaksa doğru, saygılı ve doğal görünmelidir.
9. Tema resmi UI'nin yerini alamaz. Gerçek HTML/DOM içerikleri erişilebilir ve işlevsel kalmalıdır.
10. Metin arka plan görselinin parçası yapılmamalı; başlıklar ve dinamik içerikler gerçek DOM olarak kalmalıdır.
11. Tema içerik okunabilirliğini düşüremez.
12. Tema değişiminde uygulama davranışı, API akışı, slideshow, ses ölçer, roller, devamsızlık, ders akışı vb. fonksiyonlar değişmemelidir.
13. Yeni tema tamamlandı sayılmadan önce **Playwright + Chrome DevTools** ile üç çözünürlükte görsel kabul yapılmalıdır.
14. Yeni tema üretimi gerektiğinde önce mevcut Library/proje assetleri kontrol edilir; uygun görsel zaten varsa gereksiz yere yeni görsel üretilmez.
15. Kullanıcı açıkça yeni görsel istemediği sürece bu geliştirme dalgasında **Image Generation kullanılmayacaktır**.

### MTS uygulama mimarisi kararı

- Seçilen yaklaşım artık **paketlenmiş profesyonel tema dosya sistemi**dir. Her tema `public/themes/<theme-id>/` altında kendi `theme.json`, `theme.css` ve `assets/` dizinine sahip olacaktır. Merkezi `public/themes/registry.json`, temaları keşfeder; ana HTML tema seçeneklerini hard-code etmez.
- Tema manifesti en az `schemaVersion`, `id`, `name`, `version`, `css`, `themeClass`, `backgroundAsset`, `description` ve capability/layout metadata'sı taşır. `public/themes/theme.schema.json` gelecekteki tema geliştiricileri için sözleşmeyi açıklar; `public/themes/README.md` yeni tema ekleme akışını belgeler.
- `public/js/kiosk-theme.js` registry + manifestleri yükleyen, manifest doğrulayan, aktif tema stylesheet'ini değiştiren, `data-theme`/theme class uygulayan ve `localStorage` persistence sağlayan tek tema runtime sahibidir.
- Magic Park'ın mevcut büyük `public/css/kiosk-magic-park.css` dosyası bu dalgada riskli bir fiziksel taşıma/refactor yapılmadan korunur. `public/themes/magic-park/theme.css` bu dosyayı compatibility bridge olarak import eder. Okul temaları da aynı doğrulanmış MP2 davranış temelini import edip kendi theme CSS override'larını daha sonra uygular. Böylece bugfix/işlevsel MP2 kazanımları kaybolmadan profesyonel paket giriş noktası elde edilir; ileride ortak theme-base çıkarımı manifest sözleşmesini değiştirmeden yapılabilir.
- Layout da tema paketinin parçasıdır. `--theme-left-col`, `--theme-center-col`, `--theme-right-col`, tema-row oranları, kart/content insetleri ve title offsetleri gerektiğinde tema başına farklı olabilir. Böylece okul artwork'ünün pano geometrisi gerçekten kullanılabilir; yalnız arka plan resmi değiştiren sahte bir tema sistemi oluşturulmaz.
- Tema seçici registry/manifestlerden dinamik üretilir. Yeni tema eklemek için ana kiosk HTML'ine yeni buton eklemek gerekmez. Collapsed kontrol tek tıkla rastgele tema çevirmeyecek; sakin bir aç/kapat kontrolü üzerinden bilinçli seçim gerektirecek.
- İlk ziyaret için default `magic-park`; bozuk/bilinmeyen kayıt için güvenli fallback de `magic-park` olacaktır. Default/fallback registry JSON'da tanımlanır, JS'de ayrı ayrı hard-code edilmez. Geçerli açık kullanıcı seçimi localStorage üzerinden korunur.
- TDD sırası: supported IDs + default + application + persistence + invalid/corrupt fallback + asset existence + Magic Park compatibility önce RED; ardından minimal registry/persistence/asset/CSS/UI implementation; sonra üç çözünürlük ve iki browser kabulü.

### MTS paket mimarisi ilk GREEN checkpoint'i — 10 Ağustos 2026

- Kullanıcının ek kararıyla tema sistemi basit override dosyasından profesyonel paket mimarisine yükseltildi. Aktif source-of-truth tema ağacı: `public/themes/registry.json`, `theme.schema.json`, `README.md` ve tema başına `theme.json + theme.css + assets/`.
- Registry default: `magic-park`; güvenli invalid/corrupt/resource fallback: `magic-park`. Kiosk tercihi `localStorage` anahtarı `classroom_kiosk_theme` ile browser/kiosk bazında kalıcıdır.
- Tema seçici ana HTML'de tema ID/adlarını hard-code etmez; registry + manifestlerden runtime'da dinamik buton üretir. Yeni tema ekleme sözleşmesi `public/themes/README.md` altında belgelendi.
- Magic Park compatibility bridge: `public/themes/magic-park/theme.css` mevcut doğrulanmış `public/css/kiosk-magic-park.css` dosyasını import eder. School package entrypoint'leri aynı MP2 base'i import edip kendi artwork/layout/material override'larını uygular; böylece mevcut MP2 bugfix davranışı korunur.
- Library assetleri gerçek paketlerine taşındı; yeni görsel üretilmedi:
  - `public/themes/school-garden/assets/background.png`: **1672×941 PNG**, SHA-256 `103b63efb14909b2c7f0e6ccb264c6df40b3e370a0acf45a17738a88f91b33a1`.
  - `public/themes/school-science/assets/background.png`: **1672×941 PNG**, SHA-256 `41b38d460dd9e95be18cc6a8b492eaae8781998b5124418afaeb40e91a047a34`.
- Önemli kalite notu: Library kaynakları 16:9'a çok yakın olmakla birlikte gerçek 4K pixel source değildir (`1672×941`). Kullanıcı bu dalgada özellikle mevcut Library assetlerini kullanmamızı ve yeni görsel üretmememizi istediği için artwork yeniden üretilmedi/upscale ile sahte detay oluşturulmadı. 4K browser kabulünde bu raster kalite sınırı ayrıca izlenecek.
- TDD RED ikinci turu: yeni package/registry/runtime sözleşmesi production dosyaları yokken **14/14 RED** verdi. İlk implementation sonrası `npm run test:kiosk-theme-system` **14/14 PASS**.
- Compatibility regression gate: Magic Park **18/18 PASS**, kiosk CSS analysis **7/7 PASS**, titlebar resize **4/4 PASS**, Noise/Slideshow/DOM safety/kiosk runtime grubu **40/40 PASS**. `git diff --check` temiz.
- School artwork ilk görsel incelemesi, iki görselin de Magic Park'tan farklı gerçek **3 + 2 + 3 pano kompozisyonu** kullandığını doğruladı. School theme CSS'lerinde `.main-content-area { display: contents; }` ile gerçek sol/merkez/sağ DOM sütunları doğrudan üç kolonlu theme grid'e çıkarıldı; kolon/row/padding değerleri tema paketinin kendi tokenlarıdır. Bunlar yalnız ilk tahmindir; gerçek 4K browser kaydıyla şimdi rafine edilecektir.

### MTS gerçek artwork registration + ilk 4K bulguları — 10 Ağustos 2026

- Garden/Science PNG'leri Chrome Canvas pixel analiziyle doğrudan kaynak çözünürlükte ölçüldü. Tema geometry modeli tek `3 kolon + eşit gap` olmaktan çıkarıldı; artwork source-of-truth'a uygun **sol marj + sol pano + gap-1 + merkez pano + gap-2 + sağ pano + sağ marj** yedi-track grid'e geçirildi. Sütun içindeki kartlar da gerçek pano üst/orta/alt track'lerine açık `grid-row` ile kayıt edildi.
- Renkli Okul Bahçesi final-adayı 4K outer card kayıtları Playwright'ta artwork border koordinatlarıyla ölçekli birebir çıktı: Clock `155.5,211.7,896.6×367.2`; Stats `155.5,609.1,896.6×978.5`; Countdown `155.5,1630.8,896.6×395.3`; Noise `1123.2,378.0,1649.3×414.7`; Slideshow `1123.2,853.2,1649.3×1168.6`; President `2885.7,211.7,837.1×367.2`; Duty `2885.7,609.1,837.1×978.5`; Stars `2885.7,1630.8,837.1×395.3`. Document `3840×2160` ve viewport ile birebir.

#### MTS-001 — School board Clock dikey kompozisyonu görünmez clipping üretiyor

- **Durum:** RESOLVED.
- Garden 4K Chrome: `.clock-content-wrapper clientHeight≈245px`, `scrollHeight≈357px`, `overflow:hidden`. Gün+tarih, büyük saat ve weekend badge yaklaşık **112px** görünmez dikey içerik kaybediyor.
- Kök neden Magic Park'taki dikey `date → clock → weekend` kompozisyonunun school artwork'teki geniş fakat kısa üst-sol panoya aynen taşınması.
- RED→GREEN: `public/themes/_shared/school-board-content.css` altında ortak kısa-yatay school-board profili oluşturuldu. Tarih + weekend badge sol kolona, büyük saat iki satırı kaplayan sağ hero kolona alındı; metin/işlev silinmedi.
- Playwright + Chrome DevTools final matrisi `3840×2160 / 2560×1440 / 1920×1080`: Clock wrapper sırasıyla yaklaşık `805×256 / 536×170 / 402×127` ve her ölçekte `scrollWidth=clientWidth`, `scrollHeight=clientHeight`, overflow `[false,false]`. Büyük saat hiyerarşisi korunuyor.

#### MTS-002 — School board after-school Ders Akışı yüzeyi alt içerik kırpıyor

- **Durum:** RESOLVED.
- Garden 4K Chrome visible `.goodbye-mode`: `clientHeight≈222px`, `scrollHeight≈240px`, `overflow:hidden`; yaklaşık **18px** içerik gizleniyor.
- Kök neden Magic Park'ın dikey prop → title → subtitle ritminin 395px yüksekliğindeki alt-sol board içinde eski inset/gap bütçesini kullanması.
- RED→GREEN: görünür goodbye/weekend state'i okul panolarında yatay `visual | title/subtitle` grid kompozisyonuna alındı; state surface inset'i short-wide board oranına açıldı. Magic Park'tan gelen panel dışına taşan dekoratif pseudo-elipsler okul profillerinde kaldırıldı; gerçek artwork zaten dekoratif çevreyi sağlıyor.
- Final Playwright + Chrome matrisi: goodbye surface `scrollHeight=clientHeight` ve yatay/dikey overflow yok; 4K yaklaşık `763×265`, 1440p `508×176`, 1080p `382×133`. Visual/title/subtitle rect'leri parent içinde.

#### MTS-003 — School board Haftanın Yıldızları avatar/name sahnesi dikey taşma üretiyor

- **Durum:** RESOLVED.
- Garden 4K Chrome: `#stars-container clientHeight≈295px`, active `.star-slide scrollHeight≈328px`; `.star-avatar≈361×361px` olup container üst/alt sınırını aşıyor. Name plaque ≈`616×93px` ile aynı dikey eksende avatarla çakışma riski taşıyor.
- Kök neden Magic Park'ın dikey collectible-award kompozisyonunun short-wide bottom board oranına uyarlanmaması.
- RED→GREEN: school-board yıldız sahnesi `42% / 58%` yatay grid'e geçirildi; avatar sol, name plaque sağ, dots sağ üst safe-zone'a alındı. Avatar yüksekliği container bütçesine bağlı `min(82%, 6.4cqw)` + `max-height:100%`; 4K name fontu ≈`39.55px` korunuyor.
- Final Playwright + Chrome matrisi: active star slide `718×295 / 478×196 / 358×147`, her ölçekte `scroll=client` ve overflow `[false,false]`; avatar/name kendi yüzeylerinde overflow yok. 4K avatar yaklaşık `242×242`, name plaque yaklaşık `383×93` ve birbirleriyle çakışmıyor.
- Bu üç finding için ortak RED sözleşmesi tema paketi testine eklendi; `npm run test:kiosk-theme-system` artık **15/15 PASS**.

#### MTS-004 — School board before-school state dikey bütçeyi aşıyor

- **Durum:** RESOLVED.
- Garden Playwright gerçek `?gelistirme=1` 4K `before-school`: surface yaklaşık `766×270px`, `clientHeight≈265`, `scrollHeight≈294`, overflow-y true. `.clock-visual` üstten surface dışına çıkıyor; büyük `#before-school-countdown` alt sınırı aşıyor. Heading/subtitle içeride.
- Kök neden school-board shared profile yalnız outer state inset'ini açtı; before-school içeriği hâlâ Magic Park'ın dikey `visual → heading → subtitle → timer` flex ritminde.
- RED→GREEN: visible before-school state iki kolonlu school-board grid'e geçirildi; clock visual solda üç satırı kaplıyor, heading/subtitle/timer sağ kolonda. Timer metni korunuyor.
- Final Playwright + Chrome DevTools: iki okul teması × `3840×2160 / 2560×1440 / 1920×1080` için before-school doğru state sahibi, surface overflow yok, visual/heading/subtitle/timer parent içinde ve document viewport ile birebir.

#### MTS-005 — School board active lesson/break timer sahnesi üst/alt clipping üretiyor

- **Durum:** RESOLVED.
- Garden Playwright 4K `first-class / first-break / longest-break / last-class`: active `.countdown-mode` yaklaşık `769×271px`, `clientHeight≈265`, `scrollHeight≈331`, overflow-y true. Heading yaklaşık 50px surface üstüne, büyük timer yaklaşık 50px surface altına çıkıyor; period-context ve progress yüzey içinde.
- `Öğle Teneffüsü` metni mevcut MP2-D düzeltmesi sayesinde kesilmiyor; yeni sorun o metin değil, tüm active-state dikey kompozisyonunun short-wide school board oranına uymaması.
- RED→GREEN: active lesson/break surface `58% / 42%` yatay grid'e alındı; heading + period-context + progress sol bilgi kolonu, büyük timer sağ hero kolonu oldu. Timer `min-height` school-board profile içinde `0` ile gerçek grid yüksekliğine bağlandı; font hiyerarşisi/gerçek timer DOM'u korunuyor.
- Playwright + Chrome final stres matrisi iki okul teması ve üç çözünürlükte temiz. `Öğle Teneffüsü` label'ı Garden'da yaklaşık `321 / 214 / 162px`, Science'da `319 / 212 / 160px`; her ölçekte `clientWidth=scrollWidth`, `overflow:visible`, `text-overflow:clip`, `white-space:normal`.

#### MTS-006 — School shared active-grid override gizli countdown-mode'u after-school/weekend'de zorla görünür yapıyor

- **Durum:** RESOLVED.
- MTS-005 ilk GREEN adayı sonrası gerçek Playwright simulator matrisinde `after-school` ve `weekend` için `#countdown-card[data-flow-state]` doğru state'e geçmesine rağmen visible-surface seçimi `.countdown-mode` kaldı.
- Kök neden shared CSS'teki `.countdown-mode { display:grid !important; }` kuralının runtime'ın inline `style="display:none"` gizlemesini ezmesi. Bu, tema CSS'inin uygulama state davranışını değiştirmemesi kuralının doğrudan ihlalidir.
- RED→GREEN: grid override yalnız `.countdown-mode:not([style*="display: none"])` selector'ına daraltıldı. Statik regresyon plain hidden countdown-mode üzerinde `display:grid !important` kullanımını yasaklıyor.
- Gerçek simulator doğrulaması: before-school `[grid, none, none]`, in-class/in-break `[none, grid, none]`, after-school/weekend `[none, none, grid]` state ownership'i. Playwright + Chrome DevTools üç çözünürlükte aynı sonucu verdi; tema CSS'i uygulama state davranışını artık değiştirmiyor.
- Theme-system paketi bu ikinci state dalgası sonunda yeniden **15/15 PASS**, `git diff --check` temiz.

#### MTS-007 — School top-right Başkan sahnesinde avatarlar container tarafından gerçek clipping'e uğruyor

- **Durum:** RESOLVED.
- Garden 4K exact Playwright production-data ölçümü: `#president-container≈607×237px`, `overflow:hidden`. `.president-main≈607×129px` fakat `scrollHeight≈175px`; ana avatar `y≈247–473px`, container `y≈296–532px`, yani avatarın yaklaşık **48px üst bölümü** container dışında ve kırpılıyor. Vice avatarları `bottom≈537px`, container bottom `≈532px`; alt uçta yaklaşık **5px** kırpma var.
- İsimlerde clipping yok; 4K president name ≈`36.1px`, vice names ≈`26.88px`. Dolayısıyla çözüm font küçültme olmayacak.
- Kök neden Magic Park'ın daha yüksek treehouse kartı için tasarlanmış iki katlı president-main + vice row kompozisyonunun school artwork'teki kısa-yatay üst-sağ board'a aynen taşınması.
- RED→GREEN: school-board shared profile içinde `#president-container` tek-row `45% / 55%` ekip grid'ine geçirildi. Başkan solda avatar + name plaque; iki yardımcı sağda iki yatay satır. Ana/yardımcı avatarları container yüksekliğine bağlandı. Başkan-only ve vice-only edge durumları `:has()` ile tüm board'u kullanabiliyor; Başkan empty-state tüm iki kolonu span ediyor.
- Playwright long-name fixture iki tema × üç çözünürlükte temiz: parent overflow yok, avatar/name rect'leri container içinde, `Emir Can Özdemir Yıldırımoğlu` gibi uzun nöbetçi adları kesilmiyor. 4K font hiyerarşisi korunuyor: Başkan ≈`36.10px`, yardımcılarda ≈`26.88px`, normal nöbetçi ≈`26.11px`, long-duty ≈`24.58px`, Yıldız ≈`39.55px`.
- Chrome DevTools aynı long-name fixture'da `3840×2160 / 2560×1440 / 1920×1080` için Garden + Science Başkan/Nöbetçi/Yıldız parent overflow `0`, clipped child `0`, document viewport ile birebir. **MTS-007 RESOLVED.**

#### MTS-008 — School short-wide Başkan / Yıldız empty-state sahneleri dikey taşma ve clipping üretiyor

- **Durum:** RESOLVED.
- Gerçek Playwright `/api/roles=[]` matrisi iki okul teması × `3840×2160 / 2560×1440 / 1920×1080` için çalıştırıldı.
- **Başkan empty-state:** short-wide üst-sağ board içinde dikey Magic Park empty kompozisyonu sığmıyor. Garden 4K'da icon yaklaşık `222.7×222.7px`; state `overflow-y:true`, icon ve supporting message state sınırının dışına çıkıyor. Garden 1440p/1080p'de aynı oranlı taşma sürüyor. Science'ta children çoğunlukla rect olarak state içinde kalsa da state `scrollHeight > clientHeight`; dolayısıyla gizli dikey overflow sözleşmesi temiz değil.
- **Yıldız empty-state:** iki temada üç çözünürlükte state `overflow-y:true`; büyük icon ve supporting message short-wide alt-sağ board sınırını aşıyor.
- **Nöbetçi empty-state:** parent/state geometrisi gerçek rect kontrolünde board içinde ve state overflow yok; bu nedenle şu anda Nöbetçi için ayrı layout refactor yapılmayacak. Bazı text node'larda 1px civarı line-box `scrollHeight/clientHeight` farkı görüldü; gerçek parent clipping doğrulanmadığı için bağımsız finding açılmadı.
- Kök neden Başkan/Yıldız empty-state'lerinin MP2-C'deki dikey `icon → title → message` kompozisyonunu koruması; school artwork'ün üst/alt panoları daha kısa ve yatay.
- RED→GREEN: yalnız `.role-empty-state--president` ve `.role-empty-state--stars` ortak yatay empty profile alındı: `34% / 66%`, icon sol iki row'u span ediyor; title/message sağ üst/alt row. Icon `height:min(78%, 9cqh)`, `max-height:100%`; title/message font ölçekleri korunuyor. Duty empty-state mevcut dikey profile bırakıldı.
- Playwright `/api/roles=[]` final matrisi iki tema × üç çözünürlük: Başkan/Nöbetçi/Yıldız parent overflow `0`, state overflow `0`, state parent içinde, icon/title/message rect'lerinin tamamı state içinde. Örnek Garden 4K Başkan icon ≈`189×189px`; Yıldız icon ≈`194×194px`; supporting copy görünür.
- Chrome DevTools aynı empty fixture ve üç çözünürlükte Garden + Science için altı role-state kombinasyonunun tamamında overflow/clipping `0`; document viewport ile birebir. **MTS-008 RESOLVED.**
- Theme-system regression paketi bu rol dalgası sonunda **15/15 PASS**, `git diff --check` temiz.

#### MTS-009 — Slideshow story-text kesintisiz uzun token'da yatay hidden overflow üretiyor

- **Durum:** RESOLVED.
- School slideshow kabulünde gerçek 1200 karakterlik kesintisiz stress token (`"Ö" × 1200`) hem Garden hem Science'ta `slide--story-text` bounded panel içinde kalırken `.slide-caption-text--story` için `scrollWidth > clientWidth` üretildi. Aynı davranış `3840×2160 / 2560×1440 / 1920×1080` ölçeklerinde yeniden üretildi.
- Dikey MP2-E-001 düzeltmesi sağlam: caption panel ve copy yüksekliği board içinde, dikey overflow yok. Yeni bulgu yalnız **uzun kırılmaz kelime/URL/token** yatay kırma sözleşmesinin eksik olmasıdır.
- Kök neden mevcut story copy CSS'inin normal boşluklardan satır kırabilmesi fakat `overflow-wrap:anywhere` / güvenli uzun-token kırma kuralına sahip olmaması; parent `overflow:hidden` olduğu için fazla bölüm görünmeden kesilebilir.
- İlk RED→GREEN yatay kırma sözleşmesini ekledi: `.slide-caption-text--story { overflow-wrap:anywhere; word-break:break-word; }`. Browser kabulü bu kez 1200 tek-token metnin tamamen wrap edilince dikey bütçeyi aştığını gösterdi; finding aynı root-cause ailesinde açık tutuldu.
- İkinci RED→GREEN: `createSlideElement()` story üretiminde **yalnız longest unbroken token >80 karakter** ise `slide-caption-text--story-token-dense` sınıfı ekliyor. Normal uzun paragrafın mevcut premium story fontu değişmiyor. Dense profile `font-size:clamp(0.64rem,0.56cqw,1.35rem); line-height:1.1` kullanıyor; metnin tamamı korunuyor.
- Slideshow regression paketi finalde yeniden **26/26 PASS**, `git diff --check` temiz.
- Playwright iki tema × üç çözünürlük dense-token final: panel overflow `0`, copy x/y overflow `0`, text length `1200`. Garden 4K `client≈931×496`, `scroll≈931×497` (1px rounding toleransı, boolean overflow false), font ≈`21.50px`; 1440p ≈`14.34px`; 1080p ≈`10.75px`. Science aynı font ölçeklerinde overflow `0`.
- Chrome DevTools aynı iki tema × üç çözünürlükte dense-token copy/panel overflow `0`, document viewport ile birebir. **MTS-009 RESOLVED.**

#### MTS-010 — School short-wide Noise board karakter/equalizer clipping üretiyor

- **Durum:** RESOLVED.
- Playwright gerçek `window.noiseMeter.setMicrophoneState()` + `changeState()` API'siyle `idle / requesting / unavailable / low / medium / high` matrisi iki okul teması × `3840×2160 / 2560×1440 / 1920×1080` çalıştırıldı.
- Garden 4K top-center board'da Noise card yaklaşık `1649×415px`. `#noise-character-img` yaklaşık `416×416px` ile inner character wrapper'ın üst/alt sınırını aşıyor; listening state'lerde `.equalizer-container` yaklaşık `853×120px` olarak board altına taşıyor. Garden 1440p/1080p'de de karakter ve listening equalizer rect'leri card dışında kalıyor.
- Science board biraz daha yüksek olsa da listening `low/medium/high` state'lerinde `.equalizer-container` card alt sınırını aşıyor; aynı problem alt iki çözünürlükte oranlı sürüyor.
- Kök neden MP2-B Noise kompozisyonunun daha yüksek Magic Park top-center alanına göre tasarlanmış olması: karakter genişliğe bağlı kare ölçek kullanıyor ve status → meter → equalizer dikey stack short-wide school board yüksekliğini aşıyor.
- RED→GREEN: school-board ortak Noise profili eklendi. Character wrapper gerçek available height'i dolduruyor; `#noise-character-img` `width:100%; height:100%; object-fit:contain` ile board yüksekliğine bağlı. Sağ bilgi alanında status üstte, listening state'lerde `noise-progress 58% + equalizer 42%` aynı alt satırı yatay paylaşıyor. Equalizer `height:100%; min-height:0`; non-listening state'lerde progress tekrar tam genişliği kullanıyor.
- Theme-system statik sözleşmesi character height ownership, horizontal meter/equalizer grid ve non-listening full-row davranışını kilitliyor; paket yeniden **15/15 PASS**.
- Playwright iki tema × üç çözünürlük × `idle/requesting/unavailable/low/medium/high`: karakter, content, status, meter, progress, equalizer ve retry button gerçek rect'leri card içinde. Equalizer'ın bazı `scrollWidth` değerleri animasyon/padding rounding nedeniyle birkaç piksel büyük görünse de exact bar audit'te 64 görünür `.eq-column`'un tamamı equalizer rect'i içinde; kullanıcı-visible clipping yok. Garden 4K high örneği: eq surface ≈`414×166px`, 64 barın clipped sayısı `0`.
- Chrome DevTools 4K'da iki tema × altı state exact rect kabulü **allGood=true**; 1440p/1080p'de `unavailable + high` stres state'leri de iki temada temiz, document viewport ile birebir. **MTS-010 RESOLVED.**

#### MTS-011 — Tema seçici toggle iç ikonuna tıklanınca panel anında yeniden kapanıyor

- **Durum:** RESOLVED.
- Gerçek Playwright kullanıcı etkileşiminde `#theme-switcher-toggle` tıklamasından sonra `school-science` choice görünür hale gelmedi; locator butonu DOM'da bulmasına rağmen panel tekrar `hidden` kaldığı için 30sn görünürlük timeout'u oluştu.
- Kök neden `kiosk-theme.js` document outside-click handler'ının yalnız `toggle === event.target` kontrolü yapması. Toggle'ın ortasındaki gerçek click target çoğu kez child `.theme-switcher__icon` span olduğu için aynı click bubbling aşamasında “outside” kabul edilip panel tekrar kapatılıyor.
- Minimal güvenli çözüm: outside-click guard `toggle.contains(event.target) || panel.contains(event.target)` olmalı. Böylece toggle'ın kendisi veya herhangi bir child'ı paneli yanlışlıkla kapatmaz; gerçek dış tıklama davranışı korunur.
- Aynı acceptance turunda selector konumu da ölçüldü: Garden/Science 4K collapsed toggle hiçbir `.card` rect'iyle kesişmiyor. Magic Park'ta küçük bottom-right toggle yalnız `.star-card` dış sınırı/transition surface köşesiyle kesişiyor; `.star-avatar`, `.star-name`, `.star-dots` ile kesişim `0px²`. Dolayısıyla kontrol gerçek yıldız içeriğini örtmüyor; konum için ayrı finding açılmadı.
- RED→GREEN: `kiosk-theme.js` outside-click guard `toggle.contains(event.target) || panel.contains(event.target)` olarak düzeltildi. Tema paketi regression artık **16/16 PASS**.
- Playwright gerçek kullanıcı akışı: manifestlerden `Magic Park / Renkli Okul Bahçesi / Bilim Temalı Okul` üç choice dinamik oluşuyor; missing storage → Garden selected; icon üzerinden toggle click sonrası `aria-expanded=true`, panel visible; Science seçimi `data-theme`, active stylesheet, `aria-pressed` ve `localStorage=school-science` değerlerini güncelliyor; reload Science'ı koruyor; `corrupt-theme-id` güvenli Magic Park package'a düşüyor.
- Chrome DevTools aynı akışı icon child click'iyle çapraz doğruladı: panel açık kalıyor, Science seçimi/persistence doğru, reload sonrası Science korunuyor, corrupt stored ID Magic Park'a fallback ediyor.
- Playwright collapsed control safe-zone matrisi `3840×2160 / 2560×1440 / 1920×1080`: Garden ve Science'ta key content overlap `0`; toggle viewport içinde ve document boyutu değişmiyor. Magic Park'ta yalnız `#stars-container` dış rect köşesiyle küçük geometrik kesişim var; gerçek `.star-avatar/.star-name/.star-dots` overlap `0`. **MTS-011 RESOLVED.**

#### MTS-012 — Science production yüklemesinde Garden background preload kullanılmadığı için Chrome warn üretiyor

- **Durum:** RESOLVED.
- Taze Chrome DevTools `3840×2160` Science production health: error/issue yok, fakat console `warn` sayısı 1: `themes/school-garden/assets/background.png was preloaded ... but not used within a few seconds`.
- Kök neden `public/index.html` içinde Garden background assetinin tema sistemi dışında global `<link rel="preload">` ile hard-code edilmesi. Garden aktifken preload kullanılıyor; Science/Magic Park'ta gereksiz network/preload warning oluşuyor.
- Bu aynı zamanda profesyonel paket sözleşmesindeki “ana HTML tema asset/ID ayrıntılarını hard-code etmez” ilkesine aykırı.
- Minimal çözüm: Garden-specific preload ana HTML'den kaldırılacak. Background kendi `themes/school-garden/theme.css` paketi üzerinden yüklenecek. Tema runtime/registry davranışı değişmeyecek.
- RED→GREEN: theme-system testi `public/index.html` içinde `themes/school-{garden,science}/assets/background.png` hard-code/preload kullanımını yasaklıyor. İlk RED yalnız Garden preload satırında fail verdi; satır kaldırıldı ve paket yeniden **16/16 PASS**.
- Taze Science `3840×2160` Chrome production: console `error=0`, `warn=0`, `issue=0`; network listesindeki tüm kaynak/API/theme istekleri `200/304`, 4xx/5xx yok. Science background artık yalnız aktif `themes/school-science/theme.css` üzerinden yükleniyor; kullanılmayan Garden request'i yok.
- Garden 4K Chrome production da `error=0`, `warn=0`, `issue=0`, network yalnız `200/304`. Playwright'ın taze health harness'i iki okul teması × `3840×2160 / 2560×1440 / 1920×1080` için `console problem=0`, `pageerror=0`, `requestfailed=0`, `HTTP>=400=0`, 8 kart + 3 registry choice ve document=viewport doğruladı. **MTS-012 RESOLVED.**

### MTS kapanış checkpoint'i — 10 Ağustos 2026

- **MTS — Çoklu Okul Teması Sistemi COMPLETE.** Mevcut Magic Park korunurken iki gerçek okul teması production kullanılabilir durumda eklendi:
  - `magic-park` — compatibility/fallback tema.
  - `school-garden` — **Renkli Okul Bahçesi**, seçilebilir okul teması.
  - `school-science` — **Bilim Temalı Okul**.
- Tema persistence anahtarı `classroom_kiosk_theme`. Storage yoksa registry `defaultThemeId=magic-park`; bozuk/bilinmeyen kayıt registry `fallbackThemeId=magic-park` ile güvenli render edilir. Geçerli açık kullanıcı seçimi reload sonrasında korunur. Backend `/api/settings` bu görsel tercih için genişletilmedi; uygulama/API business logic'i tema seçimine bağlanmadı.
- Profesyonel paket dosya sistemi tamamlandı:
  - `public/themes/registry.json`
  - `public/themes/theme.schema.json`
  - `public/themes/README.md`
  - `public/themes/_shared/school-board-content.css`
  - `public/themes/magic-park/{theme.json,theme.css}`
  - `public/themes/school-garden/{theme.json,theme.css,assets/background.png}`
  - `public/themes/school-science/{theme.json,theme.css,assets/background.png}`
- `public/js/kiosk-theme.js` registry/manifest validation, manifest loading, active stylesheet swap, `data-theme` + package-class ownership, persistence, dynamic selector üretimi ve safe fallback'in tek runtime sahibidir. `public/css/kiosk-theme-system.css` yalnız selector chrome'unu taşır; tema artwork/material/layout sahipliği tema paketlerinin içindedir.
- Ana `public/index.html` tema butonlarını, okul tema ID'lerini veya okul background assetlerini hard-code etmez. Selector choice'ları manifestlerden dinamik oluşur. Yeni tema ekleme akışı `public/themes/README.md` altında belgeli; `theme.schema.json` manifest sözleşmesini makine-okunur biçimde kilitler.
- Magic Park MP2 davranışları broad refactor ile taşınmadı: `public/themes/magic-park/theme.css` doğrulanmış `public/css/kiosk-magic-park.css` dosyasını compatibility bridge olarak import eder. School paketleri aynı doğrulanmış base'i import edip yalnız kendi geometry/material/artwork katmanlarını uygular.
- Library assetleri yeni üretilmeden kullanıldı:
  - Garden `1672×941`, SHA-256 `103b63efb14909b2c7f0e6ccb264c6df40b3e370a0acf45a17738a88f91b33a1`.
  - Science `1672×941`, SHA-256 `41b38d460dd9e95be18cc6a8b492eaae8781998b5124418afaeb40e91a047a34`.
  - Kaynakların native 4K olmaması bilinçli açık kalite sınırıdır: kullanıcı bu dalgada mevcut Library assetlerini kullanmayı ve Image Generation yapmamayı istediği için yeni 4K artwork üretilmedi/sahte detay upscale edilmedi. UI/DOM kabulü gerçek 4K viewport'ta yapıldı.
- Tema geometry Magic Park oranlarına kilitlenmedi. Garden ve Science artwork safe-zone'ları kaynak pixel analiziyle ölçülerek `margin + left board + gap + center board + gap + right board + margin` 7-track gridleri ve theme-owned row trackleri oluşturuldu. Gerçek sekiz DOM kartı artwork panolarına tema bazında yerleştiriliyor; background UI'nin kendisi değildir.
- School short-wide ortak içerik profili Clock, Before School, Active Lesson/Break, Goodbye/Weekend, President team, President/Stars empty, Stars transition ve Noise kompozisyonlarını yatay board oranına uyarlar. Dynamic DOM, role/slideshow/noise/schedule işlevleri korunur.
- Bu MTS dalgasında doğrulanıp RED→GREEN kapatılan bulgular: **MTS-001 .. MTS-012**. Bunlar Clock, Goodbye, Stars, before-school, active timer, hidden-state specificity, President clipping, role empty-state, dense story token, Noise, selector outside-click ve unused preload warning konularını kapsar; kapanışta açık MTS finding yoktur.
- **Ders Akışı kabulü:** gerçek `?gelistirme=1` presetleri `before-school / first-class / first-break / longest-break / last-class / after-school / weekend`. Playwright + Chrome, iki tema ve hedef çözünürlüklerde doğru state ownership'i, parent-safe rect'leri ve document=viewport doğruladı. `Öğle Teneffüsü` ellipsis'e dönmedi.
- **Role kabulü:** uzun Türkçe ad fixture'ı, 1 başkan + 2 yardımcı + 4 nöbetçi + yıldız; ayrıca `/api/roles=[]` empty-state ve multi-star `1→2→1` transition kabulü. Garden + Science, 4K/1440p/1080p Playwright + Chrome'da gerçek visible rect clipping yok.
- **Slideshow kabulü:** normal medya, curated high-res no-slides fallback (`2816×1536` Atatürk artwork), 1200 karakter normal/dense story, broken-media recovery ve transition state'leri. Dense unbroken token için gerçek 1200 karakter korunuyor ve iki tema/üç çözünürlükte overflow yok. Slideshow unit/regression final **26/26 PASS**.
- **Noise kabulü:** gerçek `window.noiseMeter` API'siyle `idle/requesting/unavailable/low/medium/high`; short-wide profile sonrası karakter/status/meter/equalizer/retry rect'leri board içinde. Exact EQ audit'te 64 görünür sütunun clipped sayısı `0`.
- **Sınıf Mevcudu/devamsızlık kabulü:** `36 total / 30 present / 6 absent` ve altı uzun Türkçe ad fixture'ı; iki öğrencilik `1/3 → 2/3 → 3/3` roster sayfalaması çalışıyor. Uzun adların gerçek rect'leri stats board içinde, metin tam, `6 ÖĞRENCİ YOK` ve `30` doğru.
- **Tema seçici kabulü:** 3 choice manifestlerden dinamik; ilk/boş preference açılışı Magic Park default; açık seçim `data-theme + stylesheet + aria-pressed + localStorage` günceller; reload tercihi korur; corrupt ID Magic Park'a fallback. Garden/Science collapsed kontrol üç çözünürlükte işlevsel content overlap `0`.

### MTS default tema kararı — 10 Ağustos 2026 23:48

- Kullanıcı kararıyla ilk/temiz açılış teması yeniden **orijinal `magic-park`** olarak ayarlandı.
- `public/themes/registry.json` artık `defaultThemeId=magic-park`, `fallbackThemeId=magic-park` kullanır.
- Bu değişiklik mevcut tema paketlerini veya tema seçiciyi kaldırmaz; `school-garden` ve `school-science` seçilebilir kalır.
- Geçerli bir `classroom_kiosk_theme` tercihi bulunan kiosk/browser bu seçimi korur; yalnız preference bulunmayan ilk/temiz açılış Magic Park ile başlar.
- **Production health:** Playwright taze production harness iki tema × `3840×2160 / 2560×1440 / 1920×1080`: console error/warn `0`, pageerror `0`, failed request `0`, HTTP `>=400` `0`, 8 kart + 3 theme choice, document=viewport. Chrome DevTools Garden/Science 4K: console error/warn/issue `0`, network tüm kaynak/API/theme istekleri `200/304`, failed/4xx/5xx yok. Chrome alt çözünürlük kabulü state/layout matrislerinde ayrıca tamamlandı.
- **Final screenshot kanıtları:** `.artifacts/mts-school-garden-playwright-3840x2160-final.png` ve `.artifacts/mts-school-science-playwright-3840x2160-final.png` gerçek **3840×2160** PNG. Chrome API 4K emülasyonu dosyayı downscale ettiği için `.artifacts/mts-school-{garden,science}-chrome-preview-1600x900-final.png` olarak doğru adla yalnız preview kanıtı tutuldu.
  - Garden 4K Playwright SHA-256 `d0066c3ecb4064866e3653fc2be0d7cf1cfe94f63f49f54d8aa331110bcc4307`.
  - Science 4K Playwright SHA-256 `6ae6146cf2941885e48c79a7f08bc1834b05c8fc451d595c6fe886c3e8a2e662`.
- Final hedefli regression kapısı: tema/Magic/CSS/title/Noise-Slideshow-DOM/schedule/simulator/dashboard toplamı ilk kapanış turunda **215/215 PASS**, `git diff --check` temiz. Ardından tema testi `test:core` zincirine de eklendi.
- **Final authoritative test gate:** `npm run test:kiosk-theme-system` **17/17 PASS**; `npm run test:core` artık tema regresyonunu içeriyor ve **1529/1529 PASS**; fail/cancelled/skipped/todo `0`; `git diff --check` temiz.
- Final Git source-of-truth: `HEAD = origin/main = 740f26e5fda0a278ba894d2950f6e19276cc82e6`. Çalışma ağacı önceki MP2-E + bu MTS dalgasının bilinçli uncommitted değişikliklerini taşımaya devam ediyor; dirty tree reset/clean/revert edilmedi ve bu oturumda otomatik commit yapılmadı.
- Bundan sonraki yeni tema geliştirmelerinde source-of-truth: bu **MTS kapanış checkpoint'i + public/themes/README.md + theme.schema.json + registry.json**. Yeni tema önce gerçek artwork safe-zone + sekiz DOM içerik ihtiyacı birlikte ölçülerek tasarlanmalı; ana HTML'e tema-specific button/asset eklenmemelidir.

### Magic Park 2.1 — AnaTema yüksek çözünürlüklü shell geçişi — 11 Ağustos 2026

- Kullanıcının `public/assets/` altına eklediği gerçek dosya adı **`AnaTema.png`**. PNG kaynak **2730×1536**, **8,409,469 byte**, SHA-256 `f9a2934f291072218cb3f62d5490a75bae4f80de2769661b3ba608c56f41f428`. Önceki `kiosk-magic-park-shell.webp` runtime shell'i olmaktan çıkarıldı.
- Magic Park aktif shell zinciri artık tamamen `AnaTema.png` kullanır: `public/index.html` default preload, `public/css/kiosk-magic-park.css` `.bento-grid` background, `public/themes/magic-park/theme.json` `backgroundAsset` + `previewAsset`. Manifest sürümü **2.1.0**.
- Yeni artwork sekiz kutu başlığını raster artwork üzerinde zaten içerdiği için Magic Park'taki DOM `.card-titlebar` katmanı görsel olarak kaldırıldı. DOM node/metinleri silinmedi: `body.magic-park-theme.theme-magic-park .card-titlebar { opacity:0; pointer-events:none; ... }` yalnız Magic Park paketinde geçerlidir. Böylece semantic/shared DOM contract korunurken duplicate başlık çizilmez.
- **Cross-theme guard:** Playwright'ta Garden ve Science için aynı sekiz `.card-titlebar` computed opacity değeri `1`; Magic Park için sekizinin de `0`. Dolayısıyla compatibility amaçlı ortak `magic-park-theme` class'ı okul temalarının başlıklarını yanlışlıkla gizlemiyor.
- **Playwright kabulü:** Magic Park temiz/default açılış `3840×2160`, `2560×1440`, `1920×1080` üçünde de `backgroundImage=.../assets/AnaTema.png`; document tam viewport; 8/8 DOM titlebar opacity `0`; console error/warn `0`, failed request `0`. 4K screenshot Playwright kabul oturumunda ayrıca alındı; proje `.artifacts/` altında kalıcı dosya olarak kaydedildiği iddia edilmez.
- **Chrome DevTools 4K kabulü:** temiz isolated context `3840×2160`; `theme=magic-park`, computed background `AnaTema.png`, natural image size `2730×1536`, 8/8 titlebar opacity `0`, document=`3840×2160`. Console `error/warn/issue=0`. Network'te `AnaTema.png=200`; eski `kiosk-magic-park-shell.webp` request'i yok; görülen kaynak/API istekleri `200/304`.
- TDD: önce yeni shell/preload/title ownership beklentileri yazıldı ve eski runtime referansları nedeniyle RED doğrulandı; minimal ürün değişikliği sonrası `npm run test:kiosk-magic-park` **18/18 PASS**, `npm run test:kiosk-theme-system` **17/17 PASS**, `git diff --check` temiz.

### Magic Park — `sontema` foreground genel görsel bakım / alpha-mask cleanup checkpoint'i — 11 Ağustos 2026

- Güncel source-of-truth `public/assets/sontema.png` (**3840×2160**); baked foreground `public/assets/sontema-foreground.png`; builder `scripts/build-sontema-foreground.js`; ana regression `tests/kiosk-magic-park.test.js`.
- Sekiz opening genel bakımda yeniden incelendi; opening geometrileri değişmedi.
- **Kök neden 1 — global growth:** opening-growth ilk halkası ve sonraki yaklaşık 2–4 px bandında güçlü kromatik artwork'i geçiş yolu sayabiliyordu. Böylece mask gerçek background'dan çıkıp painted frame/dekor anti-alias kenarlarına tünelliyordu.
- **Kök neden 2 — lokal cleanup:** bazı koyu/siyah negative-space heuristikleri gerçek artwork edge piksellerini background sanıyordu. Noise sağında yanlış silinen **10** kahverengi/kırmızı piksel ve Class TV üst negative-space regression'ında yalnız sol bölgede ölçülen **494** koyu sıcak artwork pikseli bunun doğrudan kanıtıdır.
- **Global chromatic growth guard:** ilk growth halkası ve sonraki 2–4 px bandı güçlü kromatik artwork üzerinden ilerlemeyecek hale getirildi.
- **Noise lokal cleanup guard:** black-island cleanup sağ dekorun 10 doğrulanmış renkli pikselini artık silmiyor.
- **Class TV dark-warm edge repair:** üst negative-space cleanup gerçek koyu sıcak/kromatik anti-alias edge coverage'ını koruyor.
- Önceki Attendance white-halo + kalem/kitap/bardak/fener cleanup'ları, Class TV perde/fold/lamba-negatif-boşluk düzeltmeleri ve Noise sağ dekor koruması aynı regression setinde korunmaya devam ediyor.
- Başlangıç foreground'u geçici yeniden üretilip finalle karşılaştırıldı: **31.244 alpha piksel değişti, RGB değişimi 0**. Dağılım `0→255=15.479`, `0→partial=2.676`, `partial→255=13.089`.
- Final foreground SHA-256: `61fa4e4dd366bdbce9a3994186e6be130de085df12318fc3d557c90383100f41`.
- **RED → GREEN:** 4 px chromatic growth-band RED sayımları `clock=214`, `attendance=608`, `lesson-flow=322`, `noise=135`, `class-tv=43`, `president=334`, `duty=62`, `stars=800`. Global fix sonrası yedi panel temizlendi; Noise'taki son 10 piksel lokal cleanup'a kadar izlenip giderildi. Class TV 494-pixel lokal RED de edge repair sonrası GREEN oldu.
- Önceki oturum final gate'i: `node --test tests/kiosk-magic-park.test.js` **30/30 PASS**, `npm run test:kiosk-magic-park` **33/33 PASS**, `npm run test:kiosk-theme-system` **20/20 PASS**; builder syntax temiz ve deterministik; iki PNG `pngcheck` OK; `git diff --check` temiz.
- Önceki Playwright final kabulü `3840×2160 / 2560×1440 / 1920×1080`: stage viewport'a tam oturdu, scroll overflow yok, console error/warn `0`, HTTP `>=400` runtime request `0`, foreground doğru layer'da.
- Önceki Chrome DevTools final kabulü: `sontema-foreground.png` HTTP `200`, natural size `3840×2160`, `z-index:20`, `pointer-events:none`, `opacity:1`, console error/warn `0`.
- Diagnostik before/after crop ve üç çözünürlük screenshot'ları `.artifacts/visual-maintenance/` altında tutuluyor.
- **Fresh kapanış — 11 Ağustos 2026:** `node --test tests/kiosk-magic-park.test.js` **30/30 PASS**; `npm run test:kiosk-magic-park` **33/33 PASS**; `npm run test:kiosk-theme-system` **20/20 PASS**; builder syntax temiz; rebuild öncesi/sonrası foreground SHA aynı `61fa4e4d...f41`; source/foreground `pngcheck` OK; `git diff --check` temiz.
- **Fresh Playwright:** `3840×2160 / 2560×1440 / 1920×1080` üçünde viewport=document=stage, overflow `0`; theme `magic-park`; foreground doğal boyut `3840×2160`, `z-index:20`, `pointer-events:none`, `opacity:1`; console error/warn `0`, failed request `0`, HTTP `>=400` `0`.
- **Fresh Chrome DevTools 4K:** isolated context `3840×2160`; document/stage tam viewport, overflow `0`; `sontema-foreground.png` HTTP `200`, natural size `3840×2160`; `z-index:20`, `pointer-events:none`, `opacity:1`; console error/warn/issue `0`; görülen runtime/network istekleri `200/304`.
- Fresh regression + runtime acceptance yeni doğrulanmış görsel artefakt üretmedi. Attendance/Class TV/Noise önceki lokal korumaları GREEN kalmaya devam ediyor; `.artifacts/visual-maintenance/` içindeki panel before/after crop'ları piksel-seviyesi teşhis kaydıdır.
