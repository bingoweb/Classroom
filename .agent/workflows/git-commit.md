---
description: Kod değişikliklerini GitHub'a commit ve push etme
---

# Git Commit ve Push Workflow

Her önemli değişiklik sonrası bu adımları uygula:

// turbo-all

1. Değişiklikleri stage'e ekle:
```powershell
git add .
```

2. Commit yap (açıklayıcı mesaj ile):
```powershell
git commit -m "Değişiklik açıklaması"
```

3. GitHub'a push et:
```powershell
git push
```

## Notlar:
- Her dosya düzenlemesi sonrası değil, mantıksal bir iş birimi tamamlandığında commit yap
- Commit mesajları Türkçe olabilir
- Push komutu otomatik olarak `origin main` branch'ine gönderir
