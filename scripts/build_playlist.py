"""Сборка плейлиста для плеера из mp3 в папке music/.

Использование:
    положить .mp3 в music/
    python scripts/build_playlist.py

Читает ID3v2-теги (название TIT2, исполнитель TPE1, обложка APIC),
сохраняет обложки в music/covers/*.webp (300x300) и пишет music/playlist.js.
Порядок треков — по имени файла (можно назвать 01 ..., 02 ...).
Если тегов нет — название берётся из имени файла ("Исполнитель - Название.mp3").
"""
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / 'music'
COVERS = MUSIC / 'covers'


def synchsafe(b: bytes) -> int:
    return (b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3]


def decode_text(enc: int, data: bytes) -> str:
    codec = {0: 'latin-1', 1: 'utf-16', 2: 'utf-16-be', 3: 'utf-8'}.get(enc, 'latin-1')
    text = data.decode(codec, errors='replace')
    return text.split('\x00')[0].strip()


def split_terminated(enc: int, data: bytes):
    """Отрезает строку, завершённую нулём (1 или 2 байта в зависимости от кодировки)."""
    if enc in (1, 2):
        i = 0
        while i + 1 < len(data):
            if data[i] == 0 and data[i + 1] == 0:
                return data[:i], data[i + 2:]
            i += 2
        return data, b''
    i = data.find(b'\x00')
    return (data, b'') if i < 0 else (data[:i], data[i + 1:])


def read_id3(path: Path) -> dict:
    tags = {}
    with open(path, 'rb') as f:
        head = f.read(10)
        if len(head) < 10 or head[:3] != b'ID3':
            return tags
        major, flags = head[3], head[5]
        if major not in (3, 4):
            return tags
        body = f.read(synchsafe(head[6:10]))
    pos = 0
    if flags & 0x40:  # расширенный заголовок
        ext = synchsafe(body[:4]) if major == 4 else struct.unpack('>I', body[:4])[0] + 4
        pos = ext
    while pos + 10 <= len(body):
        fid = body[pos:pos + 4]
        if fid == b'\x00\x00\x00\x00':
            break
        raw = body[pos + 4:pos + 8]
        size = synchsafe(raw) if major == 4 else struct.unpack('>I', raw)[0]
        data = body[pos + 10:pos + 10 + size]
        pos += 10 + size
        if not data:
            continue
        name = fid.decode('latin-1', errors='replace')
        if name in ('TIT2', 'TPE1'):
            tags[name] = decode_text(data[0], data[1:])
        elif name == 'APIC' and 'APIC' not in tags:
            enc = data[0]
            _mime, rest = split_terminated(0, data[1:])
            rest = rest[1:]  # тип картинки
            _desc, img = split_terminated(enc, rest)
            tags['APIC'] = img
    return tags


def main():
    MUSIC.mkdir(exist_ok=True)
    COVERS.mkdir(exist_ok=True)
    files = sorted(MUSIC.glob('*.mp3'), key=lambda p: p.name.lower())
    playlist = []
    for mp3 in files:
        tags = read_id3(mp3)
        title, artist = tags.get('TIT2'), tags.get('TPE1')
        if not title:
            stem = mp3.stem
            if ' - ' in stem:
                artist, title = [s.strip() for s in stem.split(' - ', 1)]
            else:
                title = stem
        cover = None
        if tags.get('APIC'):
            try:
                img = Image.open(io.BytesIO(tags['APIC'])).convert('RGB')
                img = img.resize((300, 300), Image.LANCZOS) if img.size != (300, 300) else img
                out = COVERS / f'{mp3.stem}.webp'
                img.save(out, 'WEBP', quality=80)
                cover = f'music/covers/{out.name}'
            except Exception as e:
                print(f'  ! обложка {mp3.name}: {e}')
        playlist.append({'src': f'music/{mp3.name}', 'title': title, 'artist': artist or '', 'cover': cover})
        print(f'  {mp3.name}: {artist or "—"} — {title} {"[обложка]" if cover else "[без обложки]"}')

    js = ('// Сгенерировано scripts/build_playlist.py — не править вручную\n'
          'window.PLAYLIST = ' + json.dumps(playlist, ensure_ascii=False, indent=2) + ';\n')
    (MUSIC / 'playlist.js').write_text(js, encoding='utf-8')
    print(f'\nГотово: {len(playlist)} трек(ов) -> music/playlist.js')
    return 0


if __name__ == '__main__':
    sys.exit(main())
