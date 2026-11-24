# DSI-CDTTS — Cross-Dialect Voice Cloning Demo

An anonymous audio demo page for a paper under review. One page, seven Chinese
dialects, six systems, 42 generated clips plus 7 reference recordings — playable
in any modern browser with no server, no build step and no external requests.

> **For reviewers:** open `index.html` (double-click it) or visit the anonymous
> GitHub Pages link. Both show exactly the same page; the offline copy is
> intended for the supplementary material.

## What the demo shows

The task is cross-dialect voice cloning: given a reference recording of a
speaker in one Chinese dialect and a sentence written in a different dialect,
synthesise that sentence in the target dialect while keeping the speaker's
voice.

Every case on the page contains:

- the **reference recording** (source dialect, used only for timbre),
- the **target text** that was synthesised,
- **six generated clips**, one per system, in a fixed order.

No objective or subjective scores (SIM, CER, SMOS, DMOS) are shown on the page
by design — all numbers live in the paper so that listening is not primed.

## Page features

- **Waveform players** — envelopes are precomputed at build time, so the page
  never decodes audio just to draw; click or drag anywhere on a waveform to
  seek, and only one clip plays at a time.
- **Play all** per case — auditions the six systems back to back.
- **English / 中文 toggle**, light / dark theme, both remembered locally.
- **Keyboard** — `Space` play/pause, `←` `→` seek 5 s, `Esc` stop.
- **Deep links** — `index.html#case-03_sichuan_s19` opens a case directly.
- **Offline-first** — relative URLs, inline SVG, no CDN, no analytics, no fonts
  to fetch. Works from `file://`, including inside a zip.

## Repository layout

```text
index.html              the whole page (static shell)
assets/
  style.css             themes, layout, player styling
  app.js                player, i18n, theme, sequence, keyboard
  data.js               generated: cases, texts, model labels
  peaks.js              generated: waveform envelopes + durations
cases/
  01_yue_s22/ … 07_minnan_s29/
    text.txt            target text
    ref.mp3             reference recording
    01_main.mp3 … 06_voxcpm2_base.mp3   six systems
tools/
  build_peaks.py        ffmpeg + numpy → assets/peaks.js
  build_data.py         manifest.json → assets/data.js
  qa_check.py           link check + headless-Chrome audit
  audit.js              assertions injected only into the QA copy
  init_git_anonymous.sh create the repo with an anonymous commit identity
  package_offline.sh    zip for supplementary material
docs/                   preview screenshots used by this README
```

## Preview locally

```sh
# simplest: no server needed
open index.html

# or serve it (closest to GitHub Pages)
python3 -m http.server 8000
# → http://localhost:8000
```

## Deploy the anonymised GitHub Pages link

This folder is already published at
`https://github.com/OpenDialect/DSI-CDTTS` (Pages: enable once under
**Settings → Pages → Deploy from a branch → `main` / `(root)`**).

See **[DEPLOY.md](DEPLOY.md)** for the full step-by-step checklist, including
how to create a fresh anonymous account. Short version:

1. Create a throw-away GitHub account with a neutral name (never your personal
   one — the account name is public).
2. `./tools/init_git_anonymous.sh` — initialises `main`, sets a repo-local
   anonymous commit identity, makes the first commit.
3. `git remote add origin https://github.com/<anon-account>/<repo>.git`
   (or `git remote set-url origin …` if this folder already has a remote)
4. `git push -u origin main`
5. Repository **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
6. The demo is then at `https://<anon-account>.github.io/<repo>/`.

## Package for supplementary material

```sh
./tools/package_offline.sh
# → DSI-CDTTS-demo-page.zip  (reviewers unzip and double-click index.html)
```

## Rebuilding generated assets

The two generated files are committed so the site stays a pure static bundle;
regenerate them only if the audio or case list changes.

```sh
python3 tools/build_peaks.py                              # needs ffmpeg + numpy
python3 tools/build_data.py path/to/manifest.json         # needs the demo manifest
```

`manifest.json` is intentionally **not** committed: it contains per-clip
objective/subjective scores that this page deliberately does not expose.

## Quality checks

```sh
python3 tools/qa_check.py            # link check + headless Chrome audit (file://)
python3 tools/qa_check.py --serve    # same audit over HTTP, like GitHub Pages
python3 tools/qa_check.py --shots    # refresh docs/preview-*.png
```

The headless audit covers structure (7 cases / 49 players / 49 waveforms),
layout at 1440 / 1024 / 500 px, horizontal overflow, sticky-header anchor
offsets, both languages, both themes, canvas repaint, text contrast, lazy audio
loading, play/pause exclusivity, waveform seeking, the "play all" sequence and
keyboard shortcuts. It needs a local Chrome/Chromium/Edge.

## Anonymity notes

- No author names, affiliations, e-mails, ORCIDs or acknowledgements.
- No speaker names — only dialect and region are shown.
- MP3 tags contain nothing but the ffmpeg encoder string.
- `manifest.json` (scores) is not part of this repository.
- The commit identity is repo-local and fake; pushing from a personal GitHub
  account or leaving a global git identity visible would deanonymise the
  submission. Check `git log --format='%an <%ae>'` before pushing.

## Provenance and licence

Clips were exported from the evaluation set `7dialect_d2d_9ref_v4`; reference
recordings come from the dialect corpus used for evaluation. They are included
here **for anonymous review only** — see [LICENSE](LICENSE). Do not redistribute
the audio.

## 中文速览

这是一个给审稿人看的匿名试听页：7 个汉语方言 × 6 个系统，共 42 段生成音频
+ 7 段参考录音。直接双击 `index.html` 即可离线试听；也可以用匿名 GitHub 账号
按 `DEPLOY.md` 部署成可点击的链接。页面不展示任何客观/主观指标（指标见论文），
不包含作者信息、说话人姓名和外链，MP3 标签仅含编码器字符串。

- 试听：双击 `index.html`，或 `python3 -m http.server 8000`
- 部署：`./tools/init_git_anonymous.sh` → 推送到匿名账号 → Pages 选 `main / root`
- 打包附件：`./tools/package_offline.sh` 生成 zip
- 自检：`python3 tools/qa_check.py`（需要本机 Chrome）

![Desktop preview](docs/preview-desktop.png)
