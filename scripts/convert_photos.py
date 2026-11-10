"""Конвертация фото для галереи: HEIC/JPG/PNG -> квадратный WebP без метаданных.

Использование:
    положить оригиналы в photos-src/
    python scripts/convert_photos.py [--size 1000] [--quality 80] [--src DIR] [--out DIR]

Что делает:
  - правильно поворачивает (EXIF Orientation)
  - обрезает по центру в квадрат и уменьшает до size x size
  - сохраняет как img/1.webp, img/2.webp ... в порядке даты съёмки
  - НЕ сохраняет метаданные (GPS, модель телефона и т.п. стираются)
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

ROOT = Path(__file__).resolve().parent.parent
EXTS = {'.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp'}
EXIF_IFD = 0x8769
DATETIME_ORIGINAL = 0x9003
DATETIME = 0x0132


def taken_at(path: Path):
    """Дата съёмки из EXIF или None."""
    try:
        with Image.open(path) as img:
            exif = img.getexif()
            raw = exif.get_ifd(EXIF_IFD).get(DATETIME_ORIGINAL) or exif.get(DATETIME)
            if raw:
                return datetime.strptime(str(raw).strip('\x00 '), '%Y:%m:%d %H:%M:%S')
    except Exception:
        pass
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--size', type=int, default=1000)
    ap.add_argument('--quality', type=int, default=80)
    ap.add_argument('--src', type=Path, default=ROOT / 'photos-src')
    ap.add_argument('--out', type=Path, default=ROOT / 'img')
    args = ap.parse_args()

    args.src.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)

    files = [p for p in args.src.iterdir() if p.is_file() and p.suffix.lower() in EXTS]
    if not files:
        print(f'В {args.src} нет фото. Положи туда .heic/.jpg/.png и запусти снова.')
        return 1

    # сначала фото с датой (по хронологии), потом без даты (по имени)
    dated = [(taken_at(p), p) for p in files]
    dated.sort(key=lambda t: (t[0] is None, t[0] or datetime.min, t[1].name.lower()))

    print(f'{"#":>3}  {"исходник":<32} {"дата съёмки":<17} {"результат":<12} {"КБ":>6}')
    for i, (dt, src) in enumerate(dated, 1):
        dst = args.out / f'{i}.webp'
        try:
            with Image.open(src) as img:
                img = ImageOps.exif_transpose(img)
                img = img.convert('RGB')
                img = ImageOps.fit(img, (args.size, args.size), method=Image.LANCZOS, centering=(0.5, 0.5))
                img.save(dst, 'WEBP', quality=args.quality, method=6)  # без exif= и icc_profile=
        except Exception as e:
            print(f'{i:>3}  {src.name:<32} ОШИБКА: {e}')
            continue
        kb = dst.stat().st_size / 1024
        when = dt.strftime('%d.%m.%Y %H:%M') if dt else '—'
        print(f'{i:>3}  {src.name[:32]:<32} {when:<17} {dst.name:<12} {kb:>6.0f}')

    print(f'\nГотово: {len(dated)} фото -> {args.out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
