# Classroom Tema Paketleri

Bu klasör Classroom kiosk ana ekranının tema eklenti sistemidir. Tema görseli dinamik/işlevsel DOM içeriğinin yerini almaz; sekiz işlevsel kart ve dinamik içerikler HTML/DOM olarak kalır. Tema artwork'ü kart başlıklarını kendi üzerinde taşıyorsa görünür başlık katmanı tema bazında bastırılabilir; ancak başlık metni erişilebilirlik ve ortak tema sözleşmesi için DOM'da korunmalıdır. Magic Park 2.1 `AnaTema.png` bu istisnanın ilk örneğidir.

## Dosya yapısı

Her tema kendi klasöründe üç sorumluluğu birlikte taşır:

```text
themes/<theme-id>/
├── theme.json      # kimlik, ad, sürüm, CSS ve asset metadata'sı
├── theme.css       # temanın tek CSS giriş noktası
└── assets/         # yalnız bu temaya ait görseller
```

Merkezi `registry.json` yalnız tema keşif listesidir. `theme.schema.json` manifest sözleşmesinin JSON Schema tanımıdır.

## Yeni tema ekleme

1. `public/themes/<yeni-id>/` klasörü oluştur.
2. `theme.json` dosyasını `theme.schema.json` sözleşmesine göre doldur.
3. Tema-özel CSS'i `theme.css` içine yaz; başka temanın CSS'ini kopyalama.
4. Tema assetlerini kendi `assets/` klasöründe tut.
5. `registry.json` içine yalnız `id + manifest` kaydı ekle.
6. Ana `public/index.html` içine tema butonu veya tema ID'si ekleme; seçici manifestlerden otomatik oluşur.
7. Önce `npm run test:kiosk-theme-system` çalıştır.
8. Ardından Playwright + Chrome DevTools ile 3840×2160, 2560×1440 ve 1920×1080 kabulünü tamamla.

## Layout sözleşmesi

Magic Park'ın mevcut kolon/satır oranları yeni temalar için zorunlu değildir. Her tema kendi `theme.css` dosyasında şu geometry tokenlarını tanımlayabilir:

- `--theme-left-col`
- `--theme-center-col`
- `--theme-right-col`
- `--theme-left-rows`
- `--theme-center-rows`
- `--theme-right-rows`

Tema ayrıca card/content inset ve title offset tokenları ekleyebilir. Amaç artwork safe-zone'ları ile gerçek DOM kartlarını birlikte hizalamaktır; içerik kırpılması veya işlev kaybı pahasına görsele uydurmak yasaktır.

## Magic Park compatibility bridge

Mevcut `public/css/kiosk-magic-park.css`, doğrulanmış MP2 davranış ve görsel düzeltmelerini taşıdığı için bu dalgada fiziksel olarak taşınmaz. Tema paketleri bu dosyayı entrypoint'lerinden import eder. İleride ortak theme-base çıkarılırsa manifest/registry sözleşmesi değişmeden yalnız CSS import katmanı değiştirilebilir.
