# Story footage credits

The home page story and the About hero are scrubbed by scroll through real café footage from
[Mixkit](https://mixkit.co) (under the [Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree))
and [Pexels](https://www.pexels.com) (under the [Pexels License](https://www.pexels.com/license/)), both free
for commercial use with no attribution required. Some clips were warmed and deepened to match the TWO RR palette.

Each clip was cut (from the 4K master where Mixkit offers one) into numbered AVIF frames in
`frames/<chapter>/`, in three sizes; each visitor downloads only the one their screen needs:

- `w1920/` 1920×1080, large or high-density landscape screens
- `w1280/` 1280×720, smaller landscape screens
- `t1920/` 1080×1920 portrait crop around the subject, for phones (`grind`, `tamp` and `pour` are 608×1080: their sources are 1080p)

| Chapter | Clip | Used |
| --- | --- | --- |
| beans | Pexels 3756153, "Scooping from a bag of coffee beans" — https://www.pexels.com/video/3756153/ | 0.1–2.6 s, 40 frames (4K; graded darker and warmer) |
| grind | Pexels 39242895, "Grind and brew coffee beans in a barista setup" — https://www.pexels.com/video/39242895/ | 14.5–31.5 s, 40 frames (1080p; warm grade) |
| tamp | Pexels 39242894, "Barista preparing fresh espresso shot" — https://www.pexels.com/video/39242894/ | 0.2–9.5 s, 40 frames (1080p; warm grade) |
| pull | Mixkit "Coffee maker serving an espresso" — https://mixkit.co/free-stock-video/coffee-maker-serving-an-espresso-3571/ | 0.3–12.2 s, 40 frames (4K) |
| pour | Mixkit "Latte art" — https://mixkit.co/free-stock-video/latte-art-810/ | 4.0–31.5 s, 40 frames (1080p) |
| cup | Mixkit "Demonstration video of a steaming cup of coffee" — https://mixkit.co/free-stock-video/demonstration-video-of-a-steaming-cup-of-coffee-43935/ | 0.2–10.2 s, 40 frames (4K) |
| about | Mixkit "Close up view, serving a sparkling cappuccino" — https://mixkit.co/free-stock-video/close-up-view-serving-a-sparkling-cappuccino-41858/ | 0.2–13.5 s, 32 frames (4K) |

## Using your own footage

Film the real TWO RR in 4K if you can (a phone on a slow, steady move works well), then cut each
clip into frames. For example, 40 frames of a clip from 0 s to 10 s (`fps` = frames ÷ seconds):

```sh
# 1. extract lossless frames
ffmpeg -ss 0 -to 10 -i clip.mp4 -vf "fps=4,scale=1920:1080:flags=lanczos" -frames:v 40 w/%02d.png
ffmpeg -ss 0 -to 10 -i clip.mp4 -vf "fps=4,crop=ih*9/16:ih,scale='min(1080,iw)':-2:flags=lanczos" -frames:v 40 t/%02d.png
```

```js
// 2. encode to AVIF with the project's sharp (run with `node encode.mjs` from the project root)
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
const out = "public/story/frames/welcome";
for (const d of ["w1920", "w1280", "t1920"]) mkdirSync(`${out}/${d}`, { recursive: true });
for (const f of readdirSync("w")) {
  const id = f.replace(".png", ".avif");
  await sharp(`w/${f}`).avif({ quality: 54 }).toFile(`${out}/w1920/${id}`);
  await sharp(`w/${f}`).resize(1280, 720).avif({ quality: 56 }).toFile(`${out}/w1280/${id}`);
  await sharp(`t/${f}`).avif({ quality: 54 }).toFile(`${out}/t1920/${id}`);
}
```

Keep the frame count in `src/components/cafe-story/story.ts` in step.
