<div align="center">

# Harf Oyunu

### Çöz · Türet · Söyle

Karışık harfleri çözün veya on harften yeni kelimeler türetin. Türkçe odaklı, tek ya da aynı cihazda çok oyunculu oynanabilen iki oyun bir arada.

## [🎮 HEMEN OYNA](https://kavalmesut.github.io/harf_oyunu/)

![HTML5](https://img.shields.io/badge/HTML5-CAAB6C?style=flat-square&logo=html5&logoColor=1E2F23)
![CSS3](https://img.shields.io/badge/CSS3-617F97?style=flat-square&logo=css3&logoColor=F5F1DB)
![JavaScript](https://img.shields.io/badge/JavaScript-46734F?style=flat-square&logo=javascript&logoColor=F5F1DB)
![Framework](https://img.shields.io/badge/framework-yok-CAAB6C?style=flat-square)

<img src="assets/harf-oyunu.png" alt="Harf Oyunu ekranı" width="900" />

</div>

## Oyun modları

| Mod | Nasıl oynanır? | Hedef |
| --- | --- | --- |
| **Çöz** | Karışık verilen harfleri doğru sıraya getirin. | 12 sorunun ilk ikisi 4 harflidir; kalanları seviyeye göre çözün. |
| **Türet** | Dört sesli ve altı sessiz harften oluşan 10 harfi kullanın. | 100 saniye içinde mümkün olduğunca çok 4+ harfli Türkçe kelime bulun. |

**Türet** modunda en uzun kelimeler çift puan getirir. Tur sonunda tüm olası kelimeler; bulunanlar yeşil, kaçırılanlar kırmızı olacak şekilde gösterilir.

## Öne çıkanlar

- Tek ekranda iki farklı Türkçe kelime oyunu
- Türkçe karakterler için doğru normalizasyon: `ç`, `ğ`, `ı`, `İ`, `ö`, `ş`, `ü`
- Sürekli sesli oyun: mod seçimi ve kelime tahminleri eller serbest yapılabilir
- **Çöz** için beş zorluk seviyesi: Her oyun iki 4 harfli soruyla başlar; Çocuk (500 kelime, 4–8 harf) ile Usta (10.000 kelime, 4–10 harf) arasında seçim
- Sesli veya görünür **Pas geç** seçeneği; oyun sırasında “pas geç” komutu kullanılabilir
- İsteğe bağlı Türkçe oyun anonsları; mikrofon, anons sırasında kendi sesini dinlemez
- Aynı cihazda 2–6 kişiyle çok oyunculu: Çöz'de zil tuşuyla yarış, Türet'te eşit sıralı turlar
- **Çöz** modunda beş saniyede bir açılan sıralı harf ipucu animasyonu
- **Türet** modunda çözülebilir kelimeler sunan dengeli 10 harflik raflar
- Tekrar kelimelerde ayrı uyarı sesi ve görsel vurgulama
- Ses seviyesi, ses kapatma ve yerel ses efektleri
- Masaüstü ve mobil ekranlar için uyumlu arayüz
- Harici framework veya paket gerektirmez

## Hızlı başlangıç

### Linux — tek tıkla

Proje klasöründeki **`Harf_Oyunu.desktop`** dosyasını çalıştırın. İlk seferde dosya yöneticiniz güvenme ya da çalıştırılabilir yapma izni isteyebilir; onaylayın. Başlatıcı yerel sunucuyu açar ve oyunu varsayılan tarayıcıda başlatır.

> Python 3 ve `xdg-open` gereklidir. Çoğu Linux dağıtımında hazır gelir.

### Windows — tek tıkla

Proje klasöründeki **`Harf_Oyunu_Baslat.bat`** dosyasına çift tıklayın.

> Python veya Python Launcher kurulu olmalıdır.

### Terminalden çalıştırma

```bash
python3 -m http.server 8000
```

Ardından tarayıcıdan `http://localhost:8000` adresini açın.

> `index.html` dosyasını doğrudan açmayın. Kelime listelerinin yüklenebilmesi için uygulama bir HTTP sunucusu üzerinden çalışmalıdır.

## Sesle oyna

1. Ana ekrandaki **Sesli seçim** düğmesine basın ve tarayıcının mikrofon iznini verin.
2. **“Çöz”** veya **“Türet”** diyerek oyun modunu seçin.
3. Oyun sırasında kelimeyi söyleyin. Kesinleşen tahmin otomatik olarak denenir ve mikrofon sıradaki tahmin için yeniden dinlemeye geçer.

Çöz modunu seçtikten sonra **“birinci seviye”** ile **“beşinci seviye”** arasında sesle seçim yapabilirsiniz. Oyun sırasında **“pas geç”** demek o soruyu puansız atlar.

Web Speech API desteği tarayıcıya göre değişir. Klavye ile oyun her zaman kullanılabilir; sesli tanıma bazı tarayıcılarda internet bağlantısı gerektirebilir. Anonslar yalnızca cihazda Türkçe bir konuşma sesi bulunduğunda çalışır; böylece varsayılan İngilizce sesin Türkçe metni yanlış telaffuz etmesi engellenir.

## Puanlama

### Çöz

| Kelime uzunluğu | Başlangıç puanı | Soru sayısı |
| ---: | ---: | ---: |
| 5 harf | 50 | 2 |
| 6 harf | 60 | 2 |
| 7 harf | 70 | 2 |
| 8 harf | 80 | 2 |
| 9 harf | 90 | 2 |
| 10 harf | 100 | 2 |
| **Toplam** | **900** | **12** |

Her ipucu, o sorunun puanını 10 azaltır.

### Türet

- Her geçerli kelime: `harf sayısı × 10` puan
- En uzun kelime: `harf sayısı × 10 × 2` puan
- Aynı kelime yalnızca bir kez puan getirir.

## Proje yapısı

```text
harf_oyunu/
├── index.html                    # Uygulama arayüzü
├── style.css                     # Tasarım, düzen ve animasyonlar
├── script.js                     # Oyun, ses ve sesli tahmin mantığı
├── scripts/build_frequency_dictionaries.py # Çöz sözlüklerini yeniden üretir
├── assets/
│   ├── harf-oyunu.png            # Ekran görüntüsü
│   ├── cheering.wav              # En uzun kelime bonus sesi
│   ├── correct.mp3
│   ├── hint.mp3
│   ├── start.mp3
│   ├── wrong.mp3
│   └── dictionaries/
│       ├── turkce_kelime_listesi.txt # Türet modunun ana sözlüğü
│       └── turkce_kelime_listesi_sik_kullanilan_{500…10000}.txt # Çöz seviyeleri
├── Harf_Oyunu.desktop            # Linux başlatıcısı
├── Harf_Oyunu_Baslat.bat         # Windows başlatıcısı
└── README.md
```

## Geliştirme

JavaScript yapısını kontrol etmek için:

```bash
node --check script.js
```

Oyun davranışını değiştirirken özellikle Türkçe karakter karşılaştırmasını, sesli modun ardışık dinlemesini, ipucu zamanlayıcılarını ve Türet modundaki harf sayısı doğrulamasını test edin.

## Sözlükler

Çöz listeleri kümülatiftir: birinci seviye ikinci seviyenin alt kümesidir. Sıralama, [wordfreq](https://github.com/rspeer/wordfreq) Türkçe frekans verisini ve önceki proje sıralamasını temel alır; adaylar ana sözlükte bulunmalıdır. Yer/kişi adları, sesle kolay karışan örnekler ve çocuk seviyesi için uygun olmayan bazı biçimler çıkarılır. Sözlükleri tam frekans verisiyle yeniden üretmek için `uv run --python 3.13 --with wordfreq python scripts/build_frequency_dictionaries.py` komutunu kullanın; araç yoksa betik altyazılardan türetilmiş [Türkçe 10K listesine](https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Turkish_WordList_10K) geri döner.

Türet modu seviye sözlüklerini kullanmaz: `assets/dictionaries/turkce_kelime_listesi.txt` içindeki tüm geçerli 4–10 harfli kelimelerle çalışır.

## Yerel çok oyunculu mod

Bu mod aynı cihazda oynayan **2–6 oyuncu** için çalışır. Başlangıç ekranında önce **Tek oyunculu** veya **Çok oyunculu** seçilir; çok oyunculuda oyuncu adları, oyun modu ve **1–4 el** sayısı belirlenir.

- **Çöz: iki kişilik hızlı bas–cevapla.** Herkes aynı soruyu görür. Birinci oyuncu `Boşluk`, ikinci oyuncu sayısal tuş takımındaki `Enter` ile zil çalar; ilk basan 3 saniyelik geri sayımda cevap hakkını alır. Doğru cevapta soru puanını kazanır; yanlış, pas veya süre sonunda kelimenin tam puanı kadar puan kaybeder ve soru diğer oyuncuya açılır.
- **Türet: eşit sıralı tur.** 100 saniyelik serbest süre çok oyunculuda kullanılmaz. Her elde tüm oyuncular döngüyle kişi başı **10 tur** oynar. Her tur 5 saniyedir; el sayısı seçilirse, ilk harf setindeki tüm turlar tamamlandıktan sonra yeni bir harf seti açılır.
- Türet turunda doğru, yanlış veya süresinde sessizlik doğrudan sonraki oyuncuya geçirir. Aynı kelime bir elde yalnızca bir oyuncu tarafından puanlanır; geçerli kelime puanı hemen o oyuncunun hanesine eklenir.
- Her elin sonunda ve oyun sonunda oyuncu bazlı puan tablosu, tur/oyuncu ilerlemesi ve kazanan gösterilir.
- Mikrofonun desteklenmediği veya tanımanın başarısız olduğu cihazlar için görünür bir “Pas geç” düğmesi ve yazılı tahmin yolu korunmalıdır. Bu, özellikle Android tablet ve iOS tarayıcıları için gereklidir.
- Gelecek genişletme: büyük ekran/televizyon ana ekran olur; oyuncular telefonlarından bir oda koduyla bağlanır. Telefon, hem kendi zil düğmesi hem de mikrofon olur. Bu sürüm için cihazlar arasında ilk basanı güvenilir belirleyecek WebSocket/Firebase gibi gerçek zamanlı bir sunucu gerekir; yalnızca tarayıcı tarafıyla adil eşzamanlı yarış sağlanamaz.

Çöz'de zili alan oyuncunun cevap için 5 saniyesi vardır; yanlış, pas veya süre sonunda 10 puan kaybeder ve o soruda tekrar zile basamaz. Türet'te her oyuncunun 5 saniyesi vardır; doğru, yanlış, pas veya süre sonunda sıra ilerler. Aynı Türet kelimesi bir elde yalnızca bir kez puanlanır. Aktif oyuncu ve oyun sonu kazananı anons edilir.

---

<div align="center">

**Harf Oyunu** · Harflerle düşün, kelimelerle oyna.

</div>
