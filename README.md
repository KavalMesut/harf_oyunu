# Kelimeyi Bul

Saf HTML, CSS ve JavaScript ile hazırlanmış, 12 soruluk Türkçe kelime bulma oyunu. Oyun kelimeleri `turkce_kelime_listesi.txt` dosyasından yükler; harici bir framework, font, ikon, ses veya internet bağlantısı kullanmaz.

## Çalıştırma

Tarayıcıların güvenlik kuralları nedeniyle `index.html` dosyasını `file://` adresiyle doğrudan açmak kelime listesinin `fetch()` ile okunmasını engelleyebilir. Projeyi yerel bir HTTP sunucusu üzerinden açın.

### Tek tıkla açma (Windows)

`Oyunu_Baslat.bat` dosyasına çift tıklayın. Dosya yerel sunucuyu arka planda otomatik başlatır ve oyunu varsayılan tarayıcınızda açar. Sunucu zaten çalışıyorsa ikinci bir sunucu başlatmadan mevcut olanı kullanır.

### VS Code Live Server

1. Proje klasörünü VS Code ile açın.
2. **Live Server** eklentisini kurun.
3. `index.html` dosyasına sağ tıklayıp **Open with Live Server** seçeneğini kullanın.

### Python

Proje klasöründe şu komutu çalıştırın:

```bash
python -m http.server 8000
```

Ardından tarayıcıdan şu adresi açın:

```txt
http://localhost:8000
```

## Kelime listesi biçimi

`turkce_kelime_listesi.txt` UTF-8 kodlamalı olmalı ve her satırda tek bir Türkçe kelime bulunmalıdır:

```txt
bağıl
kavram
devinim
paradoks
görelilik
simülasyon
```

Oyun boş satırları ve tekrarları temizler; yalnızca Türkçe harflerden oluşan 5–10 harfli kelimeleri kabul eder. Her uzunluk için en az iki geçerli kelime gerekir.
