# 2/D Sınıf Panosu - Kapsamlı Proje Dokümantasyonu

## İçindekiler

1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Proje Yapısı ve Dosya Organizasyonu](#proje-yapısı-ve-dosya-organizasyonu)
3. [Veritabanı Şeması](#veritabanı-şeması)
4. [Backend API Dokümantasyonu](#backend-api-dokümantasyonu)
5. [Frontend Yapısı](#frontend-yapısı)
6. [Özellikler ve Fonksiyonellik](#özellikler-ve-fonksiyonellik)
7. [Konfigürasyon ve Ayarlar](#konfigürasyon-ve-ayarlar)
8. [Utility Fonksiyonları](#utility-fonksiyonları)
9. [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
10. [Geliştirme Notları](#geliştirme-notları)
11. [Gelecek Geliştirmeler](#gelecek-geliştirmeler)

---

## Proje Genel Bakış

### Proje Bilgileri

- **Proje Adı**: 2/D Sınıf Panosu (Classroom Panel v2)
- **Versiyon**: 5.0 (Optimized & Debugged)
- **Açıklama**: 55 inç 4K ekran için optimize edilmiş, mobil yönetim paneli ile birlikte kapsamlı dijital sınıf panosu sistemi
- **Hedef Kullanıcı**: İlkokul sınıfları (özellikle 2/D sınıfı)
- **Platform**: Web tabanlı (Node.js + Express backend, Vanilla JavaScript frontend)

### Proje Amacı

Bu proje, sınıf içi dijital panonun modern ve interaktif bir versiyonudur. Öğrencilerin rolleri, ders programı, hava durumu, günün mesajı ve daha fazlasını görüntüleyen bir sistemdir. Ayrıca öğretmenler için web tabanlı bir yönetim paneli içerir.

### Teknoloji Stack

**Backend:**
- Node.js (JavaScript runtime)
- Express.js (Web framework)
- SQLite3 (Veritabanı)
- Multer (Dosya yükleme)
- XLSX (Excel dosyası işleme)
- dotenv (Ortam değişkenleri)

**Frontend:**
- HTML5
- CSS3 (Glassmorphism 2.0 tasarım)
- Vanilla JavaScript (Framework kullanılmadan)
- SVG Icons

**Diğer:**
- OpenMeteo API (Hava durumu)
- QRCode.js (QR kod oluşturma)

---

## Proje Yapısı ve Dosya Organizasyonu

### Dizin Yapısı

```
sonpanel/
├── admin/                          # Yönetim paneli dosyaları
│   ├── index.html                  # Admin panel HTML
│   ├── admin.js                    # Admin panel JavaScript mantığı
│   └── style.css                   # Admin panel stilleri
│
├── uploads/                         # Yüklenen dosyalar
│   ├── default_boy.png             # Varsayılan erkek avatar
│   ├── default_girl.png            # Varsayılan kız avatar
│   ├── rules/                      # Sınıf kuralları görselleri
│   │   ├── arrive_on_time.png
│   │   ├── be_kind.png
│   │   ├── clean_class.png
│   │   ├── do_homework.png
│   │   ├── listen_carefully.png
│   │   ├── listen_to_each_other.png
│   │   ├── no_running.png
│   │   ├── raise_hand.png
│   │   ├── sit_properly.png
│   │   └── take_care_things.png
│   └── slides/                     # Slayt gösterimi medya dosyaları
│
├── logs/                            # Log dosyaları
│   └── slideshow-errors.log        # Hata logları
│
├── index.html                       # Ana panel (TV ekranı) HTML
├── style.css                        # Ana panel CSS stilleri
├── script.js                        # Ana panel JavaScript mantığı
├── server.js                        # Express sunucu ve API endpoint'leri
├── database.js                      # SQLite veritabanı yapılandırması
├── config.js                        # Ortak konfigürasyon ayarları
├── utils.js                         # Ortak utility fonksiyonları
├── logger.js                        # Gelişmiş loglama sistemi
├── face-focus.js                    # Yüz odaklama algoritması
├── schedule-manager.js              # Ders programı yönetim modülü
├── transitions.js                   # Slayt geçiş animasyonları
├── confetti.js                      # Konfeti animasyonu
├── package.json                     # Proje bağımlılıkları
├── package-lock.json                # Bağımlılık kilitleme dosyası
├── classroom.db                     # SQLite veritabanı dosyası
├── seed_data.js                     # Öğrenci verisi ekleme scripti
├── seed_schedule.js                 # Ders programı ekleme scripti
├── background.png                   # Arka plan görseli
├── bg-premium.png                   # Premium arka plan görseli
├── boy_avatar.png                   # Erkek avatar görseli
├── girl_avatar.png                  # Kız avatar görseli
├── tribute.png                      # Atatürk saygı görseli
├── rules-icon.png                   # Kurallar ikonu
├── icons.svg                        # SVG ikon seti
└── README.md                        # Temel proje dokümantasyonu
```

### Dosya Sorumlulukları

#### Backend Dosyaları

**server.js** (1581 satır)
- Express sunucu yapılandırması
- Tüm API endpoint'lerinin tanımları (32 endpoint)
- Dosya yükleme işlemleri (Multer)
- Excel import işlemleri
- Hata yönetimi ve loglama
- Static dosya servisi

**database.js** (162 satır)
- SQLite veritabanı bağlantısı
- Veritabanı şeması oluşturma
- Foreign key yönetimi
- Index oluşturma
- Varsayılan ayarlar ekleme

**config.js** (40 satır)
- Ortak konfigürasyon sabitleri
- API URL'leri
- Avatar yolları
- Zamanlama ayarları
- Hem Node.js hem browser için export

**logger.js** (233 satır)
- Gelişmiş loglama sistemi
- Log seviyeleri (ERROR, WARN, INFO, DEBUG)
- Component bazlı loglama
- Console ve server loglama
- In-memory buffer

#### Frontend Dosyaları

**index.html** (167 satır)
- Ana panel HTML yapısı
- Bento grid layout
- SVG icon definitions
- Sahne container'ları (Dashboard, Rules, Tribute)

**script.js** (1119 satır)
- Ana panel JavaScript mantığı
- Veri çekme ve render etme
- Sahne rotasyonu sistemi
- Slayt gösterimi yönetimi
- Saat ve tarih güncellemeleri
- Hava durumu entegrasyonu
- Face focus entegrasyonu

**style.css** (1281 satır)
- Glassmorphism 2.0 tasarım sistemi
- Bento grid layout stilleri
- Responsive tasarım
- 4K ekran optimizasyonları
- Animasyonlar ve geçişler
- Star animasyonları

**admin/index.html** (372 satır)
- Admin panel HTML yapısı
- Tab-based navigation
- Form yapıları
- QR kod gösterimi

**admin/admin.js** (1516 satır)
- Admin panel JavaScript mantığı
- CRUD işlemleri
- Form validasyonları
- Rol atama mantığı
- Excel import işlemleri
- Slayt yönetimi

**admin/style.css**
- Admin panel stilleri
- Form stilleri
- Tab navigation stilleri

#### Utility Dosyaları

**utils.js** (173 satır)
- Path normalizasyonu
- Avatar path yönetimi
- Zaman formatlama
- Hata yönetimi
- Hava durumu bilgisi

**face-focus.js** (358 satır)
- Yüz odaklama algoritması
- Canvas tabanlı yüz algılama
- Heuristik pozisyonlama
- Cache yönetimi

**schedule-manager.js** (245 satır)
- Ders programı yönetimi
- Hafta içi/hafta sonu tespiti
- Countdown hesaplamaları
- Progress bar yönetimi

**transitions.js**
- Slayt geçiş animasyonları
- Smart transition seçimi
- Fade, slide, zoom efektleri

**confetti.js**
- Konfeti animasyonu
- Partikül sistemi

### Dosya Bağımlılıkları

```
server.js
  ├── database.js
  ├── config.js
  ├── logger.js
  ├── utils.js
  └── multer, xlsx, express, cors, dotenv

script.js
  ├── config.js (window.CONFIG)
  ├── utils.js (window.Utils)
  ├── logger.js (window.Logger)
  ├── schedule-manager.js (window.ScheduleManager)
  ├── face-focus.js (window.FaceFocusEngine)
  └── transitions.js (window.applyTransition)

admin/admin.js
  ├── config.js (window.CONFIG)
  └── utils.js (window.Utils)

index.html
  ├── style.css
  ├── script.js
  ├── schedule-manager.js
  └── icons.svg

admin/index.html
  ├── style.css
  └── admin.js
```

---

## Veritabanı Şeması

### Veritabanı: `classroom.db` (SQLite3)

### Tablolar

#### 1. `students` Tablosu

Öğrenci bilgilerini saklar.

```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo TEXT,
    gender TEXT CHECK(gender IN ('M', 'F'))
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `name`: Öğrenci adı (zorunlu)
- `photo`: Fotoğraf dosya yolu (opsiyonel)
- `gender`: Cinsiyet ('M' veya 'F', CHECK constraint ile)

**İlişkiler:**
- `roles` tablosu ile one-to-many (bir öğrencinin birden fazla rolü olabilir)
- `attendance` tablosu ile one-to-many (bir öğrencinin birden fazla yoklama kaydı olabilir)

#### 2. `roles` Tablosu

Öğrenci rolleri (Başkan, Yardımcı, Nöbetçi, Yıldız).

```sql
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    role_type TEXT NOT NULL CHECK(role_type IN ('president', 'vice_president', 'star', 'duty')),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `student_id`: Öğrenci ID (foreign key, zorunlu)
- `role_type`: Rol tipi ('president', 'vice_president', 'star', 'duty')

**Kısıtlamalar:**
- `president`: Sadece 1 öğrenci (yeni atama eskiyi siler)
- `vice_president`: Maksimum 2 öğrenci
- `duty`: Maksimum 4 öğrenci
- `star`: Sınırsız

**İlişkiler:**
- `students` tablosu ile many-to-one (CASCADE DELETE)

**Index:**
- `idx_roles_student_id` (student_id)
- `idx_roles_type` (role_type)

#### 3. `settings` Tablosu

Genel ayarlar (key-value çiftleri).

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
```

**Varsayılan Ayarlar:**
- `message`: "Harika bir gün olsun!"
- `city`: "Istanbul"

#### 4. `daily_word` Tablosu

Günün kelimesi özelliği.

```sql
CREATE TABLE daily_word (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english_word TEXT NOT NULL,
    turkish_word TEXT NOT NULL,
    image_path TEXT,
    date TEXT NOT NULL
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `english_word`: İngilizce kelime (zorunlu)
- `turkish_word`: Türkçe çeviri (zorunlu)
- `image_path`: Görsel dosya yolu (opsiyonel)
- `date`: Tarih (zorunlu)

#### 5. `schedule` Tablosu

Haftalık ders programı.

```sql
CREATE TABLE schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    course TEXT NOT NULL,
    UNIQUE(day, period)
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `day`: Gün adı (Pazartesi, Salı, Çarşamba, Perşembe, Cuma)
- `period`: Ders dönemi (1-5)
- `course`: Ders adı (zorunlu)

**Kısıtlamalar:**
- `UNIQUE(day, period)`: Aynı gün ve ders için tek kayıt

**Index:**
- `idx_schedule_day_period` (day, period)

#### 6. `attendance` Tablosu

Günlük yoklama kayıtları.

```sql
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `student_id`: Öğrenci ID (foreign key, zorunlu)
- `date`: Tarih (YYYY-MM-DD formatında, zorunlu)
- `status`: Durum ('present' veya 'absent', zorunlu)

**Kısıtlamalar:**
- `UNIQUE(student_id, date)`: Bir öğrenci için günde tek kayıt

**İlişkiler:**
- `students` tablosu ile many-to-one (CASCADE DELETE)

**Index:**
- `idx_attendance_student_id` (student_id)
- `idx_attendance_date` (date)

#### 7. `slides` Tablosu

Slayt gösterimi içerik yönetimi.

```sql
CREATE TABLE slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content_type TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_path TEXT NOT NULL,
    text_content TEXT,
    display_duration INTEGER,
    video_auto_advance BOOLEAN,
    transition_type TEXT,
    transition_duration INTEGER,
    transition_mode TEXT,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    expires_at TEXT,
    priority INTEGER DEFAULT 5,
    is_poster BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `title`: Slayt başlığı (opsiyonel)
- `content_type`: İçerik tipi (image, video, gif, rule, announcement, news, celebration, poster)
- `media_type`: Medya tipi (image, video, gif)
- `media_path`: Medya dosya yolu (zorunlu)
- `text_content`: Metin içeriği (opsiyonel)
- `display_duration`: Gösterim süresi (milisaniye, opsiyonel)
- `video_auto_advance`: Video bitince otomatik geçiş (boolean)
- `transition_type`: Geçiş tipi (fade, slide, zoom, vb.)
- `transition_duration`: Geçiş süresi (milisaniye)
- `transition_mode`: Geçiş modu (auto, manual)
- `display_order`: Gösterim sırası (zorunlu)
- `is_active`: Aktif mi? (boolean, varsayılan: 1)
- `expires_at`: Son kullanma tarihi (datetime, opsiyonel)
- `priority`: Öncelik (1-10, varsayılan: 5)
- `is_poster`: Poster mi? (boolean, varsayılan: 0)
- `created_at`: Oluşturulma tarihi (timestamp)

**Index:**
- `idx_slides_order` (display_order)
- `idx_slides_active` (is_active)

#### 8. `slide_settings` Tablosu

Slayt gösterimi genel ayarları.

```sql
CREATE TABLE slide_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
```

**Varsayılan Ayarlar:**
- `default_duration`: "10000" (10 saniye)
- `default_transition_mode`: "auto"
- `default_transition_duration`: "1000" (1 saniye)
- `default_announcement_duration`: "7" (7 gün)

#### 9. `error_logs` Tablosu

Hata logları ve debugging bilgileri.

```sql
CREATE TABLE error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('ERROR', 'WARN', 'INFO', 'DEBUG')),
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    error_details TEXT,
    context TEXT,
    stack_trace TEXT,
    user_agent TEXT,
    url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**Alanlar:**
- `id`: Otomatik artan birincil anahtar
- `timestamp`: Log zamanı (ISO format)
- `level`: Log seviyesi (ERROR, WARN, INFO, DEBUG)
- `component`: Bileşen adı (SLIDESHOW, ADMIN, API, vb.)
- `message`: Log mesajı (zorunlu)
- `error_details`: Hata detayları (JSON string)
- `context`: Ek bağlam bilgisi (JSON string)
- `stack_trace`: Stack trace (opsiyonel)
- `user_agent`: Tarayıcı bilgisi (opsiyonel)
- `url`: İstek URL'i (opsiyonel)
- `created_at`: Oluşturulma tarihi (timestamp)

**Index:**
- `idx_error_logs_timestamp` (timestamp)
- `idx_error_logs_component` (component)
- `idx_error_logs_level` (level)

### Foreign Key İlişkileri

1. **roles.student_id** → **students.id** (ON DELETE CASCADE)
2. **attendance.student_id** → **students.id** (ON DELETE CASCADE)

### Veritabanı Özellikleri

- **Foreign Keys**: Her bağlantıda `PRAGMA foreign_keys = ON` ile aktif edilir
- **CASCADE DELETE**: Öğrenci silindiğinde ilgili roller ve yoklama kayıtları otomatik silinir
- **Index'ler**: Performans için kritik alanlarda index'ler tanımlı
- **CHECK Constraints**: Veri bütünlüğü için CHECK constraint'ler kullanılıyor

---

## Backend API Dokümantasyonu

### Base URL

```
http://localhost:3000/api
```

### API Endpoint'leri (32 adet)

#### 1. Öğrenci Yönetimi

##### GET /api/students

Tüm öğrencileri listeler.

**Request:**
```
GET /api/students
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Ahmet Yılmaz",
    "photo": "uploads/1764172351719-uuzy3n.jpg",
    "gender": "M"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/students

Yeni öğrenci ekler.

**Request:**
```
POST /api/students
Content-Type: multipart/form-data

name: "Ahmet Yılmaz"
gender: "M"
photo: [file] (opsiyonel)
```

**Validasyon:**
- `name`: Zorunlu, boş olamaz, maksimum 100 karakter
- `gender`: Zorunlu, 'M' veya 'F' olmalı
- `photo`: Opsiyonel, maksimum 10MB, JPG/PNG/GIF/WEBP

**Response:**
```json
{
  "id": 1,
  "name": "Ahmet Yılmaz",
  "photo": "uploads/1764172351719-uuzy3n.jpg",
  "gender": "M"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `500 Internal Server Error`: Sunucu hatası

**Hata Örnekleri:**
```json
{
  "error": "Öğrenci adı gereklidir"
}
```

---

##### POST /api/students/import

Excel dosyasından öğrenci içe aktarır.

**Request:**
```
POST /api/students/import
Content-Type: multipart/form-data

excel: [file]
```

**Excel Formatı:**
- E-okul formatı desteklenir
- Sütunlar: Öğrenci No, Adı, Soyadı, Cinsiyeti
- Cinsiyet: E (Erkek) veya K (Kız)

**Response:**
```json
{
  "message": "25 öğrenci başarıyla eklendi",
  "inserted": 25,
  "failed": 0,
  "students": [...],
  "errors": [] // Varsa hata mesajları
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Dosya hatası veya geçersiz format
- `500 Internal Server Error`: Sunucu hatası

---

##### DELETE /api/students/:id

Öğrenci siler.

**Request:**
```
DELETE /api/students/1
```

**Response:**
```json
{
  "message": "Öğrenci silindi",
  "changes": 1
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Geçersiz ID
- `404 Not Found`: Öğrenci bulunamadı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- CASCADE DELETE: İlgili roller ve yoklama kayıtları otomatik silinir

---

##### PUT /api/students/:id/photo

Öğrenci fotoğrafını günceller.

**Request:**
```
PUT /api/students/1/photo
Content-Type: multipart/form-data

photo: [file]
```

**Validasyon:**
- `photo`: Zorunlu, maksimum 5MB, JPG/PNG/GIF/WEBP

**Response:**
```json
{
  "message": "Resim başarıyla güncellendi",
  "photo": "uploads/1764172351719-uuzy3n.jpg"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Geçersiz dosya veya ID
- `404 Not Found`: Öğrenci bulunamadı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Eski fotoğraf dosyası otomatik silinir (default fotoğraflar hariç)

---

#### 2. Rol Yönetimi

##### GET /api/roles

Tüm rolleri öğrenci bilgileriyle birlikte listeler.

**Request:**
```
GET /api/roles
```

**Response:**
```json
[
  {
    "role_id": 1,
    "role_type": "president",
    "id": 5,
    "name": "Ahmet Yılmaz",
    "photo": "uploads/...",
    "gender": "M"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/roles

Rol atar.

**Request:**
```
POST /api/roles
Content-Type: application/json

{
  "student_id": 5,
  "role_type": "president"
}
```

**Validasyon:**
- `student_id`: Zorunlu, geçerli bir sayı olmalı
- `role_type`: Zorunlu, 'president', 'vice_president', 'duty' veya 'star' olmalı

**Kısıtlamalar:**
- `president`: Sadece 1 öğrenci (yeni atama eskiyi siler)
- `vice_president`: Maksimum 2 öğrenci
- `duty`: Maksimum 4 öğrenci
- `star`: Sınırsız

**Response:**
```json
{
  "id": 1,
  "message": "Rol başarıyla atandı"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası veya limit aşımı
- `500 Internal Server Error`: Sunucu hatası

**Hata Örnekleri:**
```json
{
  "error": "En fazla 4 nöbetçi atanabilir"
}
```

---

##### DELETE /api/roles/:id

Rol kaldırır.

**Request:**
```
DELETE /api/roles/1
```

**Response:**
```json
{
  "message": "Role removed",
  "changes": 1
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `404 Not Found`: Rol bulunamadı
- `500 Internal Server Error`: Sunucu hatası

---

#### 3. Ayarlar

##### GET /api/settings

Tüm ayarları key-value objesi olarak döner.

**Request:**
```
GET /api/settings
```

**Response:**
```json
{
  "message": "Harika bir gün olsun!",
  "city": "Istanbul"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/settings

Ayar günceller veya ekler.

**Request:**
```
POST /api/settings
Content-Type: application/json

{
  "key": "message",
  "value": "Yeni mesaj"
}
```

**Validasyon:**
- `key`: Zorunlu, boş olamaz
- `value`: Zorunlu, null olamaz

**Response:**
```json
{
  "message": "Ayarlar güncellendi"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `500 Internal Server Error`: Sunucu hatası

---

#### 4. Günün Kelimesi

##### GET /api/word

Günün kelimesini getirir.

**Request:**
```
GET /api/word
```

**Response:**
```json
{
  "id": 1,
  "english_word": "Apple",
  "turkish_word": "Elma",
  "image_path": "uploads/word-image.jpg",
  "date": "2025-01-15"
}
```

**Varsayılan:**
Eğer kayıt yoksa:
```json
{
  "english_word": "Apple",
  "turkish_word": "Elma",
  "image_path": null
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/word

Günün kelimesini günceller.

**Request:**
```
POST /api/word
Content-Type: multipart/form-data

english_word: "Apple"
turkish_word: "Elma"
image: [file] (opsiyonel)
```

**Validasyon:**
- `english_word`: Zorunlu
- `turkish_word`: Zorunlu
- `image`: Opsiyonel, maksimum 10MB

**Response:**
```json
{
  "id": 1,
  "english_word": "Apple",
  "turkish_word": "Elma",
  "image_path": "uploads/word-image.jpg",
  "date": "2025-01-15"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Eski kayıtlar silinir, yeni kayıt eklenir

---

#### 5. Ders Programı

##### GET /api/schedule

Ders programını getirir.

**Request:**
```
GET /api/schedule
```

**Response:**
```json
[
  {
    "id": 1,
    "day": "Pazartesi",
    "period": 1,
    "course": "Matematik"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/schedule

Ders programı öğesini günceller veya ekler.

**Request:**
```
POST /api/schedule
Content-Type: application/json

{
  "day": "Pazartesi",
  "period": 1,
  "course": "Matematik"
}
```

**Validasyon:**
- `day`: Zorunlu
- `period`: Zorunlu, 1-5 arası
- `course`: Zorunlu

**Response:**
```json
{
  "message": "Updated"
}
```
veya
```json
{
  "id": 1
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Aynı gün ve ders için mevcut kayıt güncellenir, yoksa yeni eklenir (UNIQUE constraint)

---

#### 6. Ağ Bilgisi

##### GET /api/network-info

Yerel IP adresini döner.

**Request:**
```
GET /api/network-info
```

**Response:**
```json
{
  "ip": "192.168.1.100",
  "port": 3000
}
```

**Status Codes:**
- `200 OK`: Başarılı

**Notlar:**
- İlk bulunan IPv4 adresini döner
- Internal (127.0.0.1) adresler hariç tutulur

---

#### 7. İstatistikler

##### GET /api/stats

Sınıf istatistiklerini döner.

**Request:**
```
GET /api/stats
```

**Response:**
```json
{
  "total": 30,
  "girls": 15,
  "boys": 15,
  "todayPresent": 28,
  "todayAbsent": 2
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- `todayPresent` ve `todayAbsent` bugünün tarihine göre hesaplanır

---

#### 8. Yoklama Yönetimi

##### GET /api/attendance/today

Bugünün yoklama kayıtlarını getirir.

**Request:**
```
GET /api/attendance/today
```

**Response:**
```json
[
  {
    "id": 1,
    "student_id": 5,
    "date": "2025-01-15",
    "status": "present",
    "name": "Ahmet Yılmaz",
    "gender": "M"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### GET /api/attendance/:date

Belirli bir tarihin yoklama kayıtlarını getirir.

**Request:**
```
GET /api/attendance/2025-01-15
```

**Response:**
```json
[
  {
    "id": 1,
    "student_id": 5,
    "date": "2025-01-15",
    "status": "present",
    "name": "Ahmet Yılmaz",
    "gender": "M"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/attendance

Toplu yoklama kaydı oluşturur.

**Request:**
```
POST /api/attendance
Content-Type: application/json

{
  "date": "2025-01-15",
  "attendanceList": [
    {
      "student_id": 5,
      "status": "present"
    },
    {
      "student_id": 6,
      "status": "absent"
    }
  ]
}
```

**Validasyon:**
- `date`: Zorunlu, YYYY-MM-DD formatında
- `attendanceList`: Zorunlu, array olmalı
- Her öğe: `student_id` (zorunlu), `status` (zorunlu, 'present' veya 'absent')

**Response:**
```json
{
  "message": "Yoklama başarıyla kaydedildi",
  "count": 2
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Mevcut tarih kayıtları silinir, yeni kayıtlar eklenir

---

##### PUT /api/attendance/:id

Tek bir yoklama kaydını günceller.

**Request:**
```
PUT /api/attendance/1
Content-Type: application/json

{
  "status": "absent"
}
```

**Validasyon:**
- `status`: Zorunlu, 'present' veya 'absent' olmalı

**Response:**
```json
{
  "message": "Yoklama güncellendi",
  "changes": 1
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `404 Not Found`: Kayıt bulunamadı
- `500 Internal Server Error`: Sunucu hatası

---

#### 9. Slayt Yönetimi

##### GET /api/slides/active

Aktif slaytları getirir (cache'lenmiş, AI optimize).

**Request:**
```
GET /api/slides/active
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Hoş Geldiniz",
    "content_type": "image",
    "media_type": "image",
    "media_path": "/uploads/slides/1763928336480-2yns0h.png",
    "text_content": null,
    "display_duration": 10000,
    "video_auto_advance": 0,
    "transition_type": "fade",
    "transition_duration": 1000,
    "transition_mode": "auto",
    "display_order": 1,
    "is_active": 1,
    "expires_at": null,
    "priority": 5,
    "is_poster": 0,
    "created_at": "2025-01-15T10:00:00.000Z"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Cache süresi: 5 dakika
- Sadece aktif ve süresi dolmamış slaytlar döner
- `display_order`'a göre sıralanır
- Path'ler normalize edilir

---

##### GET /api/slides

Tüm aktif slaytları getirir.

**Request:**
```
GET /api/slides
```

**Response:**
```json
[
  {
    "id": 1,
    ...
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- `/api/slides/active` ile aynı, ancak cache yok

---

##### GET /api/slides/:id

Tek bir slaytı getirir.

**Request:**
```
GET /api/slides/1
```

**Response:**
```json
{
  "id": 1,
  "title": "Hoş Geldiniz",
  ...
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Geçersiz ID
- `404 Not Found`: Slayt bulunamadı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/slides

Yeni slayt oluşturur.

**Request:**
```
POST /api/slides
Content-Type: multipart/form-data

title: "Hoş Geldiniz"
content_type: "image"
media_type: "image"
slide: [file]
text_content: "Merhaba"
display_duration: "10"
video_auto_advance: "false"
transition_type: "fade"
transition_duration: "1"
transition_mode: "auto"
expires_at: "2025-01-22T10:00:00.000Z" (opsiyonel)
```

**Validasyon:**
- `content_type`: Zorunlu
- `slide`: Zorunlu (rule hariç)
- Dosya: Maksimum 100MB, JPG/PNG/GIF/MP4/WEBM/MOV

**Otomatik Algılama:**
- `media_type`: Dosya uzantısına göre otomatik algılanır
- `is_poster`: Dosya adına göre poster algılanır (Atatürk, Bayrak, vb.)
- `expires_at`: Announcement/News/Celebration için otomatik 7 gün eklenir

**Response:**
```json
{
  "id": 1,
  "message": "Slayt başarıyla oluşturuldu"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `500 Internal Server Error`: Sunucu hatası

---

##### PUT /api/slides/:id

Slayt günceller.

**Request:**
```
PUT /api/slides/1
Content-Type: multipart/form-data

title: "Yeni Başlık"
slide: [file] (opsiyonel)
...
```

**Response:**
```json
{
  "message": "Slayt başarıyla güncellendi",
  "changes": 1
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Geçersiz ID veya veri
- `404 Not Found`: Slayt bulunamadı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Yeni dosya yüklenirse eski dosya silinir
- Sadece gönderilen alanlar güncellenir

---

##### DELETE /api/slides/:id

Slayt siler.

**Request:**
```
DELETE /api/slides/1
```

**Response:**
```json
{
  "message": "Slayt başarıyla silindi",
  "changes": 1
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Geçersiz ID
- `404 Not Found`: Slayt bulunamadı
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Medya dosyası otomatik silinir
- Diğer slaytların `display_order` değerleri güncellenir

---

##### PUT /api/slides/reorder

Slayt sıralamasını toplu günceller.

**Request:**
```
PUT /api/slides/reorder
Content-Type: application/json

{
  "slideOrders": [
    {
      "id": 1,
      "display_order": 3
    },
    {
      "id": 2,
      "display_order": 1
    }
  ]
}
```

**Validasyon:**
- `slideOrders`: Zorunlu, array olmalı
- Her öğe: `id` (zorunlu), `display_order` (zorunlu, sayı)

**Response:**
```json
{
  "message": "Sıralama başarıyla güncellendi"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `500 Internal Server Error`: Sunucu hatası

---

#### 10. Slayt Ayarları

##### GET /api/slide-settings

Slayt ayarlarını getirir.

**Request:**
```
GET /api/slide-settings
```

**Response:**
```json
{
  "default_duration": "10000",
  "default_transition_mode": "auto",
  "default_transition_duration": "1000",
  "default_announcement_duration": "7"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### POST /api/slide-settings

Slayt ayarını günceller.

**Request:**
```
POST /api/slide-settings
Content-Type: application/json

{
  "key": "default_duration",
  "value": "15000"
}
```

**Validasyon:**
- `key`: Zorunlu
- `value`: Zorunlu

**Response:**
```json
{
  "message": "Ayar başarıyla güncellendi"
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Validasyon hatası
- `500 Internal Server Error`: Sunucu hatası

---

#### 11. Log Yönetimi

##### POST /api/logs

Client'tan log kaydı alır.

**Request:**
```
POST /api/logs
Content-Type: application/json

{
  "timestamp": "2025-01-15T10:00:00.000Z",
  "level": "ERROR",
  "component": "SLIDESHOW",
  "message": "Video playback failed",
  "errorDetails": {...},
  "context": {...},
  "stackTrace": "...",
  "userAgent": "...",
  "url": "..."
}
```

**Validasyon:**
- `timestamp`: Zorunlu
- `level`: Zorunlu (ERROR, WARN, INFO, DEBUG)
- `component`: Zorunlu
- `message`: Zorunlu

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `400 Bad Request`: Geçersiz log entry
- `500 Internal Server Error`: Sunucu hatası

**Notlar:**
- Veritabanına ve dosyaya yazılır (`logs/slideshow-errors.log`)

---

##### GET /api/logs

Log kayıtlarını getirir.

**Request:**
```
GET /api/logs?level=ERROR&component=SLIDESHOW&since=2025-01-15&limit=100
```

**Query Parameters:**
- `level`: Log seviyesi (opsiyonel)
- `component`: Bileşen adı (opsiyonel)
- `since`: Başlangıç tarihi (opsiyonel)
- `limit`: Maksimum kayıt sayısı (varsayılan: 100)

**Response:**
```json
[
  {
    "id": 1,
    "timestamp": "2025-01-15T10:00:00.000Z",
    "level": "ERROR",
    "component": "SLIDESHOW",
    "message": "Video playback failed",
    "error_details": {...},
    "context": {...},
    "stack_trace": "...",
    "user_agent": "...",
    "url": "...",
    "created_at": "2025-01-15T10:00:00.000Z"
  },
  ...
]
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

##### DELETE /api/logs/cleanup

Eski log kayıtlarını temizler.

**Request:**
```
DELETE /api/logs/cleanup?days=30
```

**Query Parameters:**
- `days`: Kaç günden eski kayıtlar silinecek (varsayılan: 30)

**Response:**
```json
{
  "message": "Log temizleme tamamlandı",
  "deleted": 150
}
```

**Status Codes:**
- `200 OK`: Başarılı
- `500 Internal Server Error`: Sunucu hatası

---

### Hata Yönetimi

Tüm endpoint'ler standart hata formatı kullanır:

```json
{
  "error": "Hata mesajı"
}
```

**Ortak Hata Kodları:**
- `400 Bad Request`: Validasyon hatası veya geçersiz istek
- `404 Not Found`: Kayıt bulunamadı
- `500 Internal Server Error`: Sunucu hatası

### Dosya Yükleme

**Multer Konfigürasyonu:**
- Normal upload: Maksimum 10MB
- Slide upload: Maksimum 100MB
- Desteklenen formatlar: JPG, PNG, GIF, WEBP, MP4, WEBM, MOV

**Dosya Yolu Normalizasyonu:**
- Windows backslash'ler forward slash'e çevrilir
- Web URL'leri için `/` prefix eklenir

---

## Frontend Yapısı

### Ana Panel (index.html)

#### HTML Yapısı

Ana panel, Bento Grid layout kullanır:

```html
<div class="bento-grid">
  <div class="column col-left">
    <!-- Sol kolon: Saat, istatistikler, hava durumu -->
  </div>
  <div class="column col-center">
    <!-- Orta kolon: Mesaj, ders programı, öğrenci rolleri -->
  </div>
  <div class="column col-right">
    <!-- Sağ kolon: Slayt gösterimi -->
  </div>
</div>
```

#### Sahne Yapısı

Ana panel 3 farklı sahne arasında rotasyon yapar:

1. **Dashboard Sahnesi** (15 saniye)
   - Günün mesajı
   - Ders programı
   - Sınıf başkanı ve yardımcıları
   - Nöbetçiler
   - Haftanın yıldızları
   - İstatistikler

2. **Kurallar Sahnesi** (8 saniye)
   - Rastgele bir sınıf kuralı gösterilir
   - Görsel + açıklama

3. **Atatürk Saygı Sahnesi** (8 saniye)
   - Atatürk görseli
   - Anlamlı bir alıntı

#### JavaScript Modülleri (script.js)

**Ana Fonksiyonlar:**

1. **fetchData()**
   - Rolleri API'den çeker
   - Öğrenci verilerini render eder
   - Face focus uygular

2. **initSlideshow()**
   - Slaytları API'den çeker
   - Slayt elementlerini oluşturur
   - Slayt gösterimini başlatır

3. **nextSlide()**
   - Bir sonraki slayta geçer
   - Transition animasyonu uygular
   - Video kontrolü yapar

4. **scheduleNextSlide()**
   - Bir sonraki slayt için zamanlayıcı ayarlar
   - Display duration'a göre hesaplar

5. **updateClock()**
   - Saat ve tarihi günceller
   - Her saniye çalışır

6. **updateWeather()**
   - Hava durumunu API'den çeker
   - Giyim önerisi gösterir

7. **updateScheduleStatus()**
   - Ders programı durumunu günceller
   - Countdown hesaplar
   - Progress bar günceller

**Sahne Rotasyonu:**

```javascript
const sceneDurations = [15000, 8000, 15000, 8000]; // Dashboard, Rules, Dashboard, Tribute
```

**Veri Yenileme:**
- Roller: 30 saniyede bir
- Slaytlar: 30 saniyede bir
- Saat: 1 saniyede bir
- Hava durumu: 30 saniyede bir

#### CSS Yapısı (style.css)

**Tasarım Sistemi:**
- Glassmorphism 2.0: Bulanık arka planlar, gürültü dokuları
- Bento Grid: Organize kart sistemi
- 4K Optimize: 55 inç ekran için optimize edilmiş font ve boyutlar

**Ana Sınıflar:**

1. **Layout:**
   - `.bento-grid`: Ana grid container
   - `.column`: Kolon container'ları
   - `.card`: Kart container'ları

2. **Öğrenci Görüntüleme:**
   - `.president-avatar-large`: Başkan avatarı (200px)
   - `.vice-president-avatar`: Yardımcı avatarı (150px)
   - `.duty-avatar`: Nöbetçi avatarı (140px)
   - `.star-avatar`: Yıldız avatarı (160px)

3. **Animasyonlar:**
   - `.star-animated`: Yıldız animasyonu (bounce, shine, rotate, glow)
   - `.fade-in`, `.fade-out`: Geçiş animasyonları

**4K Medya Sorguları:**

```css
@media (min-width: 3840px) {
  .president-avatar-large { width: 280px; height: 280px; }
  .vice-president-avatar { width: 210px; height: 210px; }
  .duty-avatar { width: 200px; height: 200px; }
  .star-avatar { width: 220px; height: 220px; }
}
```

### Admin Panel (admin/index.html)

#### HTML Yapısı

Admin panel, tab-based navigation kullanır:

```html
<div class="tabs">
  <button class="tab-btn" onclick="showTab('students')">Öğrenciler</button>
  <button class="tab-btn" onclick="showTab('roles')">Görevler</button>
  <button class="tab-btn" onclick="showTab('attendance')">Yoklama</button>
  <button class="tab-btn" onclick="showTab('slides')">Slayt Yönetimi</button>
  <button class="tab-btn" onclick="showTab('settings')">Ayarlar</button>
</div>
```

#### JavaScript Modülleri (admin/admin.js)

**Ana Fonksiyonlar:**

1. **fetchStudents()**
   - Öğrencileri API'den çeker
   - Listeyi render eder
   - Role select'leri günceller

2. **renderStudents(students)**
   - Öğrenci listesini HTML'e dönüştürür
   - Avatar görsellerini gösterir
   - Sil butonları ekler

3. **assignRole(roleType)**
   - Rol atar
   - Validasyon yapar
   - API'ye gönderir

4. **renderRoles(roles)**
   - Rolleri HTML'e dönüştürür
   - Kaldır butonları ekler

5. **importStudentsFromExcel()**
   - Excel dosyasını yükler
   - API'ye gönderir
   - Sonuçları gösterir

6. **showQRCode()**
   - QR kod oluşturur
   - Modal'da gösterir

**Event Delegation:**
- Tüm dinamik butonlar için event delegation kullanılır
- `DOMContentLoaded` içinde listener'lar eklenir

---

## Özellikler ve Fonksiyonellik

### 1. Sahne Rotasyonu Sistemi

Ana panel, 3 farklı sahne arasında otomatik geçiş yapar:

- **Dashboard**: 15 saniye
- **Kurallar**: 8 saniye
- **Dashboard**: 15 saniye (tekrar)
- **Atatürk Saygı**: 8 saniye

**Özellikler:**
- Yumuşak fade geçişleri
- Otomatik döngü
- Süreler `script.js` içinde ayarlanabilir

### 2. Öğrenci Yönetimi

**Özellikler:**
- Öğrenci ekleme (tek tek veya Excel'den)
- Öğrenci silme (CASCADE DELETE)
- Fotoğraf yükleme/güncelleme
- Cinsiyet bazlı varsayılan avatar

**Excel Import:**
- E-okul formatı desteği
- Otomatik sütun algılama
- Hata raporlama

### 3. Rol Atama Sistemi

**Roller:**
- **Başkan**: 1 kişi (yeni atama eskiyi siler)
- **Başkan Yardımcıları**: 2 kişi
- **Nöbetçiler**: 4 kişi
- **Haftanın Yıldızları**: Sınırsız

**Görüntüleme:**
- Başkan: Büyük avatar (200px)
- Yardımcılar: Orta avatar (150px)
- Nöbetçiler: Büyük avatar (140px), 2x2 grid
- Yıldızlar: Büyük avatar (160px), 3 kolonlu grid, animasyonlu

### 4. Ders Programı Yönetimi

**Özellikler:**
- Haftalık 5 günlük program
- Her gün 5 ders dönemi
- Aktif ders vurgulama
- Teneffüs countdown

**Schedule Manager:**
- Hafta içi/hafta sonu tespiti
- Ders başlamadan önce countdown
- Ders saatleri içinde teneffüs countdown
- Okul sonrası goodbye mode

### 5. Slayt Gösterimi

**Özellikler:**
- Resim, video, GIF desteği
- Otomatik geçiş animasyonları
- Video otomatik ilerleme
- Süre bazlı gösterim
- Sıralama yönetimi
- Son kullanma tarihi
- Poster algılama

**Geçiş Tipleri:**
- Fade
- Slide
- Zoom
- Smart transition (içeriğe göre otomatik seçim)

### 6. Hava Durumu Entegrasyonu

**Özellikler:**
- OpenMeteo API entegrasyonu
- Şehir bazlı hava durumu
- Giyim önerisi
- İkon gösterimi

**API:**
```
https://api.open-meteo.com/v1/forecast?latitude=41.0082&longitude=28.9784&current_weather=true
```

### 7. Animasyonlar ve Geçişler

**Yıldız Animasyonları:**
- Bounce (zıplama)
- Shine (parıltı)
- Rotate (döndürme)
- Glow (ışıldama)
- Shimmer (ışık geçişi)

**Slayt Geçişleri:**
- Fade in/out
- Slide left/right
- Zoom in/out
- Smart transition

### 8. Face Focus Engine

**Özellikler:**
- Yüz odaklama algoritması
- Canvas tabanlı yüz algılama
- Heuristik pozisyonlama
- Cache yönetimi
- Queue sistemi

**Kullanım:**
```javascript
faceFocusEngine.focusFace(imgElement, imageSrc, 'large');
```

### 9. Yoklama Sistemi

**Özellikler:**
- Günlük yoklama kaydı
- Toplu yoklama girişi
- Tekil kayıt güncelleme
- Tarih bazlı sorgulama
- İstatistik hesaplama

### 10. Loglama Sistemi

**Özellikler:**
- Component bazlı loglama
- Log seviyeleri (ERROR, WARN, INFO, DEBUG)
- Veritabanı ve dosya loglama
- In-memory buffer
- Log temizleme

---

## Konfigürasyon ve Ayarlar

### config.js

**Ortak Konfigürasyon:**

```javascript
const CONFIG = {
    API_URL: 'http://localhost:3000/api',
    PORT: 3000,
    
    DEFAULT_AVATAR_BOY: 'uploads/default_boy.png',
    DEFAULT_AVATAR_GIRL: 'uploads/default_girl.png',
    
    SLIDE_DURATION: 10000, // 10 saniye
    DATA_REFRESH_INTERVAL: 30000, // 30 saniye
    CLOCK_UPDATE_INTERVAL: 1000, // 1 saniye
    
    SCHOOL_START_TIME: { hour: 9, minute: 0 },
    SCHOOL_END_TIME: { hour: 14, minute: 30 },
    CLASS_DURATION: 40, // dakika
    
    BREAK_DURATIONS: {
        SHORT: 10,
        LONG: 15,
        LUNCH: 40
    },
    
    CONFETTI_PARTICLE_COUNT: 100
};
```

**Export:**
- Node.js: `module.exports = CONFIG`
- Browser: `window.CONFIG = CONFIG`

### Ortam Değişkenleri

`.env` dosyası (opsiyonel):
```
PORT=3000
NODE_ENV=production
```

### Varsayılan Ayarlar

**Veritabanı:**
- `settings.message`: "Harika bir gün olsun!"
- `settings.city`: "Istanbul"
- `slide_settings.default_duration`: "10000"
- `slide_settings.default_transition_mode`: "auto"

---

## Utility Fonksiyonları

### utils.js

**Fonksiyonlar:**

1. **normalizePath(filePath, ensureAbsolute)**
   - Windows backslash'leri forward slash'e çevirir
   - Web URL'leri için `/` prefix ekler

2. **getAvatarPath(student)**
   - Öğrenci fotoğrafı varsa döner
   - Yoksa cinsiyete göre varsayılan avatar döner

3. **formatTime(hours, minutes)**
   - Saati HH:MM formatına çevirir

4. **getTimeDifferenceInMinutes(...)**
   - İki zaman arasındaki farkı dakika olarak hesaplar

5. **showError(message, error)**
   - Hata mesajı gösterir (console)

6. **showSuccess(message)**
   - Başarı mesajı gösterir (alert)

7. **fetchWithErrorHandling(url, options)**
   - Fetch wrapper, hata yönetimi ile

8. **getWeatherInfo(weatherCode, temperature)**
   - Hava durumu koduna göre ikon ve öneri döner

**Export:**
- Node.js: `module.exports = { ... }`
- Browser: `window.Utils = { ... }`

---

## Kurulum ve Çalıştırma

### Sistem Gereksinimleri

- Node.js 14+ (npm ile birlikte)
- SQLite3 (Node.js modülü olarak yüklenir)
- Modern web tarayıcı (Chrome, Firefox, Edge)

### Bağımlılık Kurulumu

```bash
npm install
```

**Yüklenen Paketler:**
- express: ^4.18.2
- sqlite3: ^5.1.6
- multer: ^1.4.5-lts.1
- cors: ^2.8.5
- dotenv: ^16.3.1
- xlsx: ^0.18.5

### Veritabanı Başlatma

Veritabanı otomatik oluşturulur (`database.js` içinde `initDatabase()`).

**Manuel Seed (Opsiyonel):**
```bash
node seed_data.js      # Öğrenci verileri
node seed_schedule.js  # Ders programı
```

### Sunucu Başlatma

```bash
npm start
```

veya

```bash
node server.js
```

**Port:** 3000 (varsayılan)

**Erişim:**
- Ana Panel: http://localhost:3000/index.html
- Admin Panel: http://localhost:3000/admin/index.html

### İlk Kurulum Adımları

1. Projeyi klonlayın veya indirin
2. `npm install` çalıştırın
3. `npm start` ile sunucuyu başlatın
4. Admin panelden öğrenci ekleyin
5. Roller atayın
6. Ders programını düzenleyin
7. Ana paneli TV ekranında açın

### Production Deployment

**Öneriler:**
- PM2 veya benzeri process manager kullanın
- Reverse proxy (nginx) kullanın
- HTTPS sertifikası ekleyin
- Environment variables kullanın
- Log rotation yapılandırın

---

## Geliştirme Notları

### Kod Yapısı ve Pattern'ler

**Backend:**
- RESTful API pattern
- Middleware kullanımı (CORS, JSON parser, static files)
- Error handling ve logging
- Input validation
- File upload handling

**Frontend:**
- Vanilla JavaScript (framework yok)
- Module pattern (window.Utils, window.CONFIG)
- Event delegation
- Async/await kullanımı
- Timeout/interval yönetimi

**Veritabanı:**
- SQLite3 (file-based)
- Foreign key constraints
- Index'ler performans için
- CASCADE DELETE

### Best Practice'ler

1. **Path Normalization:**
   - Tüm path'ler normalize edilir (Windows/Linux uyumluluğu)

2. **Error Handling:**
   - Tüm async işlemler try-catch ile sarılır
   - Logger kullanılır
   - Kullanıcıya anlaşılır mesajlar gösterilir

3. **File Management:**
   - Yüklenen dosyalar otomatik temizlenir (hata durumunda)
   - Eski dosyalar güncelleme sırasında silinir

4. **Caching:**
   - Slaytlar için 5 dakikalık cache
   - Face detection için in-memory cache

5. **Security:**
   - Input validation
   - File type validation
   - File size limits
   - SQL injection koruması (prepared statements)

### Bilinen Sorunlar ve Çözümleri

**1. EADDRINUSE Hatası:**
```
Sorun: Port 3000 zaten kullanılıyor
Çözüm: taskkill /F /IM node.exe (Windows)
       veya lsof -ti:3000 | xargs kill (Linux/Mac)
```

**2. Veriler Görünmüyor:**
```
Sorun: Ana panelde veriler görünmüyor
Çözüm: 
1. Sunucuyu kapat
2. node seed_data.js çalıştır
3. Sunucuyu yeniden başlat
4. Tarayıcıyı yenile (Ctrl+F5)
```

**3. Fotoğraflar Yüklenmiyor:**
```
Sorun: Fotoğraf yükleme hatası
Çözüm:
- Dosya boyutu kontrolü (max 10MB)
- Dosya formatı kontrolü (JPG/PNG/GIF/WEBP)
- uploads/ klasörü yazma izni kontrolü
```

### Performans Optimizasyonları

1. **Slayt Cache:**
   - 5 dakikalık cache ile API çağrıları azaltılır

2. **Face Detection Queue:**
   - Maksimum 3 eşzamanlı işlem
   - Queue sistemi ile performans korunur

3. **Index'ler:**
   - Veritabanı sorguları için index'ler tanımlı

4. **Lazy Loading:**
   - Slaytlar lazy load edilir
   - Görseller on-demand yüklenir

5. **Debouncing:**
   - Veri yenileme işlemleri debounce edilir

### Güvenlik Notları

1. **Input Validation:**
   - Tüm kullanıcı girdileri validate edilir
   - SQL injection koruması (prepared statements)

2. **File Upload:**
   - Dosya tipi kontrolü
   - Dosya boyutu limiti
   - Dosya adı sanitization

3. **CORS:**
   - CORS aktif (geliştirme için)
   - Production'da kısıtlanmalı

4. **Error Messages:**
   - Detaylı hata mesajları sadece loglarda
   - Kullanıcıya genel mesajlar gösterilir

---

## Gelecek Geliştirmeler

### Önerilen Özellikler

1. **Doğum Günü Köşesi:**
   - Bugün doğum günü olan öğrencileri göster
   - Otomatik bildirim

2. **Gelişmiş Geri Sayım:**
   - Ders bazlı geri sayım
   - Özel etkinlik geri sayımı

3. **Kullanıcı Kimlik Doğrulama:**
   - Admin panel için login
   - Role-based access control

4. **Daha Fazla Sahne:**
   - Özel sahneler eklenebilir
   - Kullanıcı tanımlı sahneler

5. **Tema Özelleştirme:**
   - Renk şemaları
   - Font seçenekleri
   - Layout seçenekleri

6. **Bildirim Sistemi:**
   - Push notifications
   - Email bildirimleri

7. **Raporlama:**
   - Yoklama raporları
   - İstatistik grafikleri
   - Export (PDF, Excel)

8. **Çoklu Dil Desteği:**
   - İngilizce/Türkçe
   - Dinamik dil değiştirme

### İyileştirme Alanları

1. **Kod Organizasyonu:**
   - ES6 modules kullanımı
   - TypeScript geçişi
   - Component-based yapı

2. **Test Coverage:**
   - Unit testler
   - Integration testler
   - E2E testler

3. **Documentation:**
   - API dokümantasyonu (Swagger)
   - Code comments
   - User guide

4. **Performance:**
   - Image optimization
   - Lazy loading improvements
   - Database query optimization

5. **Accessibility:**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

### Teknik Borçlar

1. **Vanilla JavaScript:**
   - Framework kullanımı düşünülebilir (React, Vue)
   - State management

2. **SQLite:**
   - Production için PostgreSQL/MySQL geçişi
   - Connection pooling

3. **File Storage:**
   - Cloud storage entegrasyonu (AWS S3, etc.)
   - CDN kullanımı

4. **Error Handling:**
   - Global error handler
   - Error boundary'ler

5. **Code Duplication:**
   - Bazı utility fonksiyonlar tekrarlanıyor
   - Shared component library

---

## Sonuç

Bu dokümantasyon, 2/D Sınıf Panosu projesinin tüm yönlerini kapsamlı olarak açıklamaktadır. Projeyi başka IDE'lerde geliştirmeye devam etmek için gerekli tüm bilgileri içermektedir.

**Önemli Notlar:**
- Tüm dosya yolları normalize edilmelidir
- Foreign key'ler her bağlantıda aktif edilmelidir
- Loglama sistemi production'da yapılandırılmalıdır
- Güvenlik önlemleri production'da artırılmalıdır

**İletişim ve Destek:**
- Proje versiyonu: 5.0
- Son güncelleme: 2025
- Teknoloji: Node.js + Express + SQLite + Vanilla JavaScript

---

*Bu dokümantasyon, projenin mevcut durumunu yansıtmaktadır. Geliştirmeler devam ettikçe güncellenmelidir.*

