# 🎓 Sınıf Paneli (Classroom Dashboard)

Modern, interaktif ve offline çalışabilen bir sınıf yönetim paneli. 55" 4K ekranlar için optimize edilmiştir.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20Mac-lightgrey)

## 📸 Özellikler

- 🎤 **Gerçek Zamanlı Gürültü Ölçer** - Mikrofon ile sınıf gürültüsünü izler, 128 bantlı spektrum analizi
- 👑 **Sınıf Başkanı & Yardımcıları** - Başkan (büyük) ve 2 yardımcı (küçük) görüntüleme
- 🧹 **Nöbetçi Takibi** - 4 nöbetçi öğrenci takibi
- ⭐ **Haftanın Yıldızları** - Otomatik geçişli yıldız öğrenci slideshow (7 farklı geçiş efekti)
- 📊 **Yoklama Sistemi** - Gelen/gelmeyen öğrenci takibi, marquee görünümü
- 🖼️ **Slayt Gösterisi** - Resim, GIF ve video destekli slayt yönetimi
- ⏰ **Ders Programı** - Otomatik ders/teneffüs sayacı (40 dk ders, değişken molalar)
- 🌤️ **Hava Durumu** - Şehir bazlı hava durumu widget'ı (Open-Meteo API)
- 🎨 **10 Farklı Ekolayzer Teması** - Neon, Fire, Ocean, Forest, Sunset, Love, Royal, Matrix, Ice, Rainbow
- 📱 **Responsive Tasarım** - 4K ekranlar için optimize edilmiş glassmorphism tasarım

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- Modern web tarayıcı (Chrome önerilir)
- Mikrofon (gürültü ölçer için)

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/bingoweb/Classroom.git
cd Classroom
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Sunucuyu başlatın:**
```bash
npm start
```

4. **Tarayıcıda açın:**
- 📺 **Ana Panel:** `http://localhost:3000`
- ⚙️ **Admin Paneli:** `http://localhost:3000/admin`

## 📁 Proje Yapısı

```
Classroom/
├── backend/
│   ├── server.js           # Express API sunucusu (32+ endpoint)
│   ├── database.js         # SQLite veritabanı yapılandırması
│   ├── logger.js           # Hata loglama sistemi
│   └── uploads/            # Yüklenen dosyalar (fotoğraf, slide, vb.)
├── public/
│   ├── index.html          # Ana dashboard
│   ├── admin/              # Admin paneli (index.html, admin.js, style.css)
│   ├── css/                # Stil dosyaları (style.css, kiosk-mode.css)
│   ├── js/                 # JavaScript modülleri (14 dosya)
│   └── assets/             # Statik görseller, ikonlar, avatarlar
├── docs/                   # Dokümantasyon
├── scripts/                # Yardımcı scriptler (veritabanı, test)
└── .agent/                 # AI asistan workflow'ları
```

## 🛠️ Teknolojiler

| Kategori | Teknoloji |
|----------|-----------|
| **Backend** | Node.js, Express.js |
| **Veritabanı** | SQLite3 |
| **Frontend** | Vanilla JavaScript, CSS3 |
| **Ses İşleme** | Web Audio API (FFT Analizi) |
| **Görsel** | CSS Animations, Glassmorphism |
| **API** | Open-Meteo (hava durumu) |

## 🎨 Ekolayzer Temaları

| Tema | Renkler | Açıklama |
|------|---------|----------|
| Neon | 🔴🟠🟡🟢 | Canlı neon renkler |
| Fire | 🔴🟠🟡 | Ateş efekti |
| Ocean | 🔵💙🩵 | Okyanus mavisi tonları |
| Forest | 🟢💚🌿 | Orman yeşili |
| Sunset | 🟣🔴🟠🟡 | Gün batımı |
| Love | ❤️💖💕 | Aşk teması |
| Royal | 💜👑🟡 | Kraliyet moru ve altın |
| Matrix | 💚 | Matrix yeşili |
| Ice | 💙🩵🤍 | Buz mavisi |
| Rainbow | 🌈 | Gökkuşağı renkleri |

## 📱 Admin Paneli Özellikleri

### Öğrenci Yönetimi
- ➕ Öğrenci ekleme (tek tek veya Excel import)
- 📷 Fotoğraf yükleme/güncelleme
- 🗑️ Öğrenci silme
- 📋 E-okul Excel formatı desteği

### Rol Atama
- 👑 Sınıf Başkanı (1 kişi)
- 🤝 Başkan Yardımcıları (maksimum 2 kişi)
- 🧹 Nöbetçiler (maksimum 4 kişi)
- ⭐ Haftanın Yıldızları (sınırsız)

### Slayt Yönetimi
- 🖼️ Resim/GIF/Video yükleme
- ⏱️ Süre ve geçiş ayarları
- 🔄 Sürükle-bırak sıralama
- 📝 Metin ekleme

### Sistem Ayarları
- 🎨 Ekolayzer tema seçimi (canlı önizleme)
- 🔊 Gürültü hassasiyet ayarları
- 🏙️ Hava durumu şehir ayarı
- 📊 Yoklama yönetimi

## ⚙️ API Endpoints

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/students` | GET, POST, DELETE | Öğrenci CRUD |
| `/api/roles` | GET, POST, DELETE | Rol yönetimi |
| `/api/settings` | GET, POST | Sistem ayarları |
| `/api/slides` | GET, POST, PUT, DELETE | Slayt yönetimi |
| `/api/attendance` | GET, POST | Yoklama |
| `/api/stats` | GET | Sınıf istatistikleri |

## 🔧 Ortam Değişkenleri

`.env` dosyası oluşturun (opsiyonel):
```env
PORT=3000
```

## 📄 Lisans

MIT License - Özgürce kullanabilir, değiştirebilir ve dağıtabilirsiniz.

## 👨‍💻 Geliştirici

**Taylan Soylu**  
Bu proje ilkokul sınıfları için interaktif bir dijital pano olarak geliştirilmiştir.

---

⭐ Bu proje işinize yaradıysa yıldız vermeyi unutmayın!
