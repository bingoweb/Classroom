#!/bin/bash

# Scriptin bulunduğu dizine git (önemli)
cd "$(dirname "$0")"

# Node.js sunucusunu arka planda başlat
echo "Sınıf Paneli Başlatılıyor..."
node backend/server.js &
SERVER_PID=$!

# Sunucunun başlaması için kısa bir süre bekle
sleep 3

# Tarayıcıyı Kiosk modunda aç (Chromium)
if command -v chromium-browser &> /dev/null; then
    chromium-browser --kiosk --app=http://localhost:3000
elif command -v google-chrome &> /dev/null; then
    google-chrome --kiosk --app=http://localhost:3000
elif command -v firefox &> /dev/null; then
    firefox --kiosk http://localhost:3000
else
    echo "Linux üzerinde uygun tarayıcı bulunamadı (Chromium/Chrome/Firefox)."
    xdg-open http://localhost:3000
fi

# Tarayıcı kapanınca sunucuyu da kapat
kill $SERVER_PID
