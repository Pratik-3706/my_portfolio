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

`assets/badapple.bin.gz` is Bad Apple at 96x72, one bit per pixel, each frame
XORed with the previous one, gzipped. The BadApple_nn exhibit and one of the
easter eggs play from it. The source video is not in the repo.

`assets/header.svg` and `assets/footer.svg` are animated scenes that only load
in one of the hidden themes.

There is a shell behind the backtick key. Start with `help`, then `ls -a`.
