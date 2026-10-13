#!/usr/bin/env python3
"""把 Phaser、遊戲程式與角色圖片全部內嵌，輸出單一 html 檔（第 103 頁要回傳的檔案）。"""
import base64
import pathlib

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf-8')

img = base64.b64encode((root / 'assets/explorer.png').read_bytes()).decode()
html = html.replace("'assets/explorer.png'", f"'data:image/png;base64,{img}'")


def inline(src):
    code = (root / src).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return f'<script>\n{code}\n</script>'


for src in ('vendor/phaser.min.js', 'js/main.js'):
    tag = f'<script src="{src}"></script>'
    assert tag in html, tag
    html = html.replace(tag, inline(src))

out = root / 'dist' / 'math_adventure_phaser.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'已輸出 {out}（{out.stat().st_size / 1024:.0f} KB）')
