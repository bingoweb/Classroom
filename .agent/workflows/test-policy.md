---
description: Genel çalışma kuralları ve test politikası
---

# Genel Çalışma Kuralları

## Test Politikası

**ÖNEMLİ:** Browser subagent ile test YAPMA!

- Tüm görsel testler KULLANICI tarafından yapılacak
- Browser subagent kullanarak screenshot alma veya sayfa açma YASAK
- Değişiklikler tamamlandığında kullanıcıya "http://localhost:3000 adresini yenileyerek kontrol edin" de

## Doğrulama Süreci

1. Kod değişikliklerini yap
2. Kullanıcıya bildir: "Değişiklikler tamamlandı. Lütfen tarayıcıyı yenileyin."
3. Kullanıcının geri bildirimini bekle
4. Gerekirse düzeltmeleri yap

## Commit Öncesi

- Kullanıcı onayı OLMADAN commit yapma
- Önce kullanıcıya test ettir, sonra `/git-commit` öner
