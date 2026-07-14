# 🎓 Sınıf Paneli

Modern, interaktif ve internet bağlantısı ile çalışan bir sınıf yönetim paneli. 55" 4K ekranlar için optimize edilmiştir.

## 📸 Özellikler

- 🎤 **Gerçek Zamanlı Gürültü Ölçer** - Mikrofon ile sınıf gürültüsünü izler ve görselleştirir
- 👑 **Sınıf Başkanı & Yardımcıları** - Başkan ve 2 yardımcı görüntüleme
- 🧹 **Nöbetçi Takibi** - 4 nöbetçi öğrenci takibi
- ⭐ **Haftanın Yıldızları** - Otomatik geçişli yıldız öğrenci slayt gösterisi
- 📊 **Yoklama Sistemi** - Gelen/gelmeyen öğrenci takibi
- 🖼️ **Slayt Gösterisi** - Resim ve video destekli slayt yönetimi
- ⏰ **Ders Programı** - Otomatik ders/teneffüs sayacı
- 🌤️ **Hava Durumu** - Şehir bazlı hava durumu bileşeni
- 🎨 **10 Farklı Ekolayzer Teması** - Neon, Fire, Ocean, Forest, Sunset, Love, Royal, Matrix, Ice, Rainbow

## 🚀 Kurulum

### Gereksinimler
- Aktif internet bağlantısı
- Node.js 18+
- Modern web tarayıcı (Chrome önerilir)

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
- Ana Panel: `http://localhost:3000`
- Yönetim Paneli: `http://localhost:3000/admin`

## 📁 Proje Yapısı

```
Classroom/
├── backend/
│   ├── server.js          # Express API sunucusu
│   ├── database.js         # SQLite veritabanı yapılandırması
│   └── uploads/            # Yüklenen dosyalar
├── public/
│   ├── index.html          # Ana pano
│   ├── admin/              # Yönetim paneli
│   ├── css/                # Stil dosyaları
│   ├── js/                 # JavaScript modülleri
│   └── assets/             # Statik görseller
├── docs/                   # Dokümantasyon
└── scripts/                # Yardımcı scriptler
```

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** SQLite3
- **Frontend:** Vanilla JavaScript, CSS3
- **Ses İşleme:** Web Audio API
- **Görselleştirme:** Canvas, CSS animasyonları

## 🎨 Ekolayzer Temaları

| Tema | Renkler |
|------|---------|
| Neon | 🔴🟠🟡🟢 |
| Fire | 🔴🟠🟡 |
| Ocean | 🔵💙🩵 |
| Forest | 🟢💚🌿 |
| Sunset | 🟣🔴🟠🟡 |
| Love | ❤️💖💕 |
| Royal | 💜👑🟡 |
| Matrix | 💚 |
| Ice | 💙🩵🤍 |
| Rainbow | 🌈 |

## 📱 Yönetim Paneli

Yönetim panelinden yapılabilecekler:
- Öğrenci ekleme/silme (Excel içe aktarma destekli)
- Fotoğraf güncelleme
- Rol atama (Başkan, Yardımcı, Nöbetçi, Yıldız)
- Yoklama alma
- Slayt yönetimi
- Ekolayzer tema seçimi
- Sistem ayarları

## 🔧 Ortam Değişkenleri

`.env` dosyası oluşturun (opsiyonel):
```
PORT=3000
```

## 📄 Lisans

MIT Lisansı

## 👨‍💻 Geliştirici

Bu proje sınıf içi kullanım için geliştirilmiştir.

---

⭐ Bu proje işinize yaradıysa yıldız vermeyi unutmayın!
