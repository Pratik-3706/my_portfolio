# my_portfolio

My personal site. Three files, no framework, no build step. Open `index.html`
and it runs.

```
index.html   markup and copy
style.css    tokens, layout, the alternate palettes
main.js      the 3D stage, the shell and the easter eggs
```

Light and dark follow the OS; `theme` in the top bar overrides it. The one
outside request is the Archivo font from Google Fonts, and the page falls back
to the system sans without it.

The 3D on the right is a small wireframe renderer written by hand in `main.js`,
no library. Each project has its own exhibit: hover a row or scroll to it, drag
the model to spin it, click it for the next one.

`assets/badapple.bin.gz` is what the BadApple_nn exhibit plays: the video at
48x36, one bit per pixel, each frame XORed with the previous one, gzipped. The
source video is not in the repo.

There is a shell behind the backtick key. Start with `help`, then `ls -a`.
