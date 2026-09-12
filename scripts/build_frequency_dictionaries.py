"""Çöz modu için kümülatif, ses-güvenli sözlükleri üretir.

Sıralama, wordfreq'in Türkçe frekans verisinden gelir; adaylar ana sözlükte
bulunmak zorundadır. wordfreq yoksa Wiktionary'nin altyazılardan türetilmiş
10K listesi ve eski proje sıralaması güvenli geri dönüş olarak kullanılır.
"""

from pathlib import Path
from urllib.request import Request, urlopen
import re

ROOT = Path(__file__).resolve().parents[1]
DICTIONARIES = ROOT / "assets" / "dictionaries"
SOURCE = DICTIONARIES / "turkce_kelime_listesi.txt"
LEGACY = DICTIONARIES / "turkce_kelime_listesi_sik_kulanilan_5000.txt"
FREQUENCY_URL = "https://en.wiktionary.org/w/index.php?title=Wiktionary:Frequency_lists/Turkish_WordList_10K&action=raw"
TARGETS = (500, 1000, 2000, 5000, 10000)
WORD = re.compile(r"^[A-ZÇĞİÖŞÜ]+$")

# Yer ve kişi adları; Çöz modu için sesle kolay karışan özel adlar dışarıda.
BLOCKED = {
    "ABANA", "ADANA", "ANKARA", "ANTALYA", "AYDIN", "BALIKESİR", "BEŞİKTAŞ",
    "BURSA", "ÇANAKKALE", "DİYARBAKIR", "ESKİŞEHİR", "GAZİANTEP", "İSTANBUL",
    "İZMİR", "KAYSERİ", "KONYA", "MERSİN", "SAKARYA", "SAMSUN", "TRABZON",
    "HAKAN", "KEMAL", "MURAT", "RECEP", "SELİM", "SELÇUK", "YAVUZ", "CEMAL",
    "FATİH", "YILMAZ",
    # Çocuk seviyesinin de kullandığı kümülatif havuz için açıkça yetişkin
    # veya şiddet içeren yüksek frekanslı biçimler.
    "APTAL", "APTALCA", "BOMBA", "CİNAYET", "DOMUZ", "İĞRENÇ", "KAHROLASI",
    "KATİL", "LANET", "NEFRET", "OROSPU", "ÖLDÜRMEK", "ÖLMEK", "ÖLMÜŞ",
    "SALAK", "SALDIRI", "SARHOŞ", "SEKSİ", "SİLAH", "SAVAŞ", "ŞARAP",
    "ŞEYTAN", "TEHDİT", "UYUŞTURUCU", "YALAN",
}


def normalize(value: str) -> str:
    # Python'un standart upper'ı Türkçe i için yeterli değildir.
    return value.strip().replace("i", "İ").replace("ı", "I").upper()


def usable(value: str, base: set[str]) -> bool:
    return value in base and value not in BLOCKED and bool(WORD.fullmatch(value)) and 5 <= len(value) <= 10


def ordered_frequency_words() -> list[str]:
    try:
        from wordfreq import get_frequency_dict

        frequencies = get_frequency_dict("tr")
        return [normalize(word) for word, _ in sorted(frequencies.items(), key=lambda item: item[1], reverse=True)]
    except ImportError:
        pass

    request = Request(FREQUENCY_URL, headers={"User-Agent": "Harf-Oyunu dictionary builder/1.0"})
    raw = urlopen(request, timeout=30).read().decode("utf-8")
    return [normalize(match.group(1)) for match in re.finditer(r"\[\[([^#\]|]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]", raw)]


def main() -> None:
    base = {normalize(line) for line in SOURCE.read_text(encoding="utf-8").splitlines()}
    legacy = [normalize(line) for line in LEGACY.read_text(encoding="utf-8").splitlines()]
    ranked = ordered_frequency_words() + legacy
    selected: list[str] = []
    seen: set[str] = set()
    for word in ranked:
        if word not in seen and usable(word, base):
            selected.append(word)
            seen.add(word)

    # En geniş seviye için yeterli sayıda günlük sözlük adayı yoksa yalnızca
    # geçerli ana sözlük kelimeleriyle tamamla. İlk dört seviye frekans sırası
    # dışına taşmaz.
    for word in sorted(base, key=lambda item: (len(item), item)):
        if len(selected) >= max(TARGETS):
            break
        if word not in seen and usable(word, base):
            selected.append(word)
            seen.add(word)

    for target in TARGETS:
        words = selected[:target]
        if len(words) != target:
            raise RuntimeError(f"{target} kelime üretilemedi; yalnızca {len(words)} aday var.")
        DICTIONARIES.mkdir(parents=True, exist_ok=True)
        output = DICTIONARIES / f"turkce_kelime_listesi_sik_kullanilan_{target}.txt"
        output.write_text("\n".join(words) + "\n", encoding="utf-8")
        print(f"{output.name}: {len(words)} kelime")


if __name__ == "__main__":
    main()
