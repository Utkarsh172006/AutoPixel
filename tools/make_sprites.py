"""Generates pixel-art SVG sprites into static/img (run: python3 tools/make_sprites.py)."""
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'static', 'img')
PAL = dict(c='#d9c8ff', p='#ff9be6', b='#6b6bff', y='#fff35c', o='#ffb02e', w='#ffffff', k='#2a0a3a',
           h='#6b3a1e', s='#f2b48c', m='#e0407a', g='#39ff88', G='#1faa5a', r='#ff2bd6', d='#8f6bff', e='#ffd0f0')
SPRITES = {
 'cloud': ["......cccc......","....ccccccpp....","..ccccccccccpp..",".cccccccccccccp.",".bbbbbbbbbbbbbb."],
 'star': ["...y...","...y...","yyyyyyy",".yyyyy.","..yyy..",".yy.yy.",".y...y."],
 'coin': ["..oooo..",".oyyyyo.","oyyoyyyo","oyyoyyyo","oyyoyyyo","oyyyyyyo",".oyyyyo.","..oooo.."],
 'cat': ["..w.w...........",
         "..wwww..........",
         ".wwkwkw.........",
         ".wwwpww.......w.",
         "..wwww.......ww.",
         "..wwwwwwwwww.w..",
         ".wwwwwwwwwwwww..",
         ".wwwwwwwwwwww...",
         ".wwdwwwwwwdw....",
         ".ww.ww..ww.ww..."],
 'hero': ["...rr....hhhh..",
          "..rrrr.hhhhhh.",
          "..hhhhhhhhhhhh",
          ".hhhhhhhhhhhhh",
          ".hhsssssssshhh",
          ".hhskssskssshh",
          ".hhsssssssshhh",
          ".hhsssmmsssshh",
          "..hhsssssssshh",
          "..hhhwwwwwwhhh",
          ".hhswwwwwwwwsh",
          ".hhswwwwwwwwsh",
          "..hsGGGGGGGGs.",
          "...GGgGGgGGGG.",
          "...GGGGGGGGGG.",
          "...GGGGGGGGGG.",
          "....ss....ss..",
          "....ss....ss..",
          "...wwww..wwww.",
          "...wwww..wwww."],
 'lamp': ["..bbbbbb","..bddddb","..bbbbbb","...b....","...b....","...b....","...b....","...b....","...b....","...b....","...b....","...b....","...b....","..bbb...",".bbbbb.."],
}
def svg(rows):
    w = max(map(len, rows)); h = len(rows); rects = []
    for y, row in enumerate(rows):
        row = row.ljust(w, '.')
        x = 0
        while x < w:
            ch = row[x]
            if ch == '.': x += 1; continue
            x2 = x
            while x2 < w and row[x2] == ch: x2 += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{PAL[ch]}"/>'); x = x2
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" shape-rendering="crispEdges">{"".join(rects)}</svg>', w, h
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, rows in SPRITES.items():
        text, w, h = svg(rows); open(os.path.join(OUT, name + '.svg'), 'w').write(text); print(name, w, h)
