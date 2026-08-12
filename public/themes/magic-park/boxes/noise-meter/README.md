# Magic Park — Sınıfın Ses Dengesi / Sihirli Ses Konsolu

Bu paket yalnız **Magic Park görsel sunumunu** sahiplenir. Gerçek ses ölçümü ve mikrofon yaşam döngüsü burada tekrar edilmez.

## Kesin geometri sözleşmesi

Kutu geometrisi tahmini değildir:

- 3840×2160 kiosk: **1420×638 px**
- 1920×1080 kiosk: **710×319 px**
- Aktif kullanıcı panel kaynağı: `public/assets/panel.png`, **1774×887 px**, alpha kanalı yok
- GIMP ile temizlenmiş runtime faceplate: **1721×800 px**, crop `+26+42`

`noise-console-panel.webp` merkezden çok hafif overscan ile ve oran korunarak `100.55% auto` yerleştirilir; yatay/dikey stretching yapılmaz. Bu küçük pay, panel çerçevesini tema açıklığının sol/sağ kenarlarının yalnız birkaç piksel arkasına taşır. Knob, ekran ve buton geometrisi deforme edilmez.

GIMP 3.2.4 batch işlemi yalnız dış beyaz zemine bağlı alanı alpha yapar ve robust içerik sınırına crop eder. Orijinal `public/assets/panel.png` korunur. `panel2.png`, önceki `noise-console-gimp.webp` ve `.build/noise-console-gimp.xcf` rollback/alternatif deneme amacıyla dosyada tutulabilir ancak runtime'da render edilmez.

## Görsel dil

Kutu bir **çocuk elektronik konsolu / mini oto teyibi ön yüzü** gibi davranır:

- kullanıcı tarafından sağlanan panel görseli cihaz gövdesinin tek faceplate kaynağıdır,
- görselde tespit edilen merkez ekran yaklaşık `x=266..1452, y=129..490` alanıdır,
- iki büyük knob yaklaşık `%9.99 / %90.41` yatay merkezlerinde korunur; DOM bu alanlara bindirilmez,
- merkez ekran içinde gerçek 128 bant analyser, durum metni ve gerçek ses seviye rayı çalışır,
- alt fiziksel kontrol bölgesinde yalnız `Sessiz / Dikkat / Gürültü` semantik göstergeleri yer alır; manuel retry katmanı yoktur,
- mikrofon yokken doğal demo ekolayzer ve alt ilerleme çubuğu birlikte çalışır; demo çubuğu yalnız görseldir ve sahte ARIA/gerçek ses seviyesi üretmez,
- tarayıcı yeni bir ses aygıtı bildirdiğinde ölçüm otomatik olarak yeniden başlatılır ve gerçek analyser verisi hem ekolayzeri hem ilerleme çubuğunu devralır,
- ekolayzer düşük enerjili frekansları da görünür tutan sürekli yüzdelik tepki ve attack/release yumuşatması kullanır,
- durum değişimleri cihazın tamamını ucuz bir renk filtresiyle boyamaz; yalnız metin, analyser, meter ve pilot ışıkları tepki verir.

Mascot veya gereksiz harf/boncuk/dekor eklenmez; karakteri cihazın kendisi taşır.

## Runtime sahipliği

- Web Audio, `getUserMedia`, otomatik kalibrasyon, RMS loudness, skor yumuşatma, eşikler, histerezis, 128 bant verisi, `devicechange` tabanlı otomatik mikrofon yeniden bağlanması ve `classroom:noise-state`: `public/js/noise-meter.js`.
- Bu paket ikinci `AudioContext`, mikrofon pipeline'ı, timer, RAF, canvas veya WebGL yaşam döngüsü kurmaz.
- Eski ortak `eqPulse` dekoratif nabzı Magic Park kutusunda kapalıdır; dinleme sırasında bant hareketini yalnız gerçek analyser verisi belirler.

## panel.png işleme

Tek komut:

```bash
./scripts/process-magic-noise-panel-gimp.sh
```

Pipeline:

1. `public/assets/panel.png` GIMP 3.2.4 ile açılır.
2. Sol-üst beyaz canvas ile contiguous olan dış zemin kontrollü threshold ile alpha yapılır; cihazın içindeki açık renk detaylar seçilmez.
3. Görsel `1721×800 +26+42` gerçek içerik sınırına crop edilir.
4. `assets/noise-console-panel.webp` alpha korumalı WebP olarak dışa aktarılır.
5. Runtime yalnız yeni WebP faceplate'i kullanır; eski GIMP paneli rollback için saklanabilir.
