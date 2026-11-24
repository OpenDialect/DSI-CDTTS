#!/usr/bin/env python3
"""Generate the static demo page (index.html) from the demo manifest.

The page is intentionally plain: white background, native <audio> players, no
JavaScript bundle, no theme or language switch. Regenerating is the only build
step:

    python3 tools/build_site.py /path/to/demo_7dialects_6models/manifest.json
"""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "index.html"

DIALECTS = {
    "粤语": "Cantonese",
    "吴语": "Wu",
    "四川话": "Sichuanese",
    "东北话": "Dongbei",
    "陕西话": "Shaanxi",
    "河南话": "Henan",
    "闽南话": "Minnan",
    "闽南语": "Minnan",
}

MODELS = [
    ("main", "Ours"),
    ("m2d", "M2D-only"),
    ("cv3", "D2D + cloned refs"),
    ("cosy", "CosyVoice3"),
    ("firered", "FireRedTTS3"),
    ("vox", "VoxCPM2 base"),
]

REGIONS = {
    "上海上海上海": "上海",
    "河南信阳市固始县": "河南固始",
    "广东湛江廉江": "广东廉江",
    "四川凉山彝族自治州西昌市": "四川西昌",
    "陕西西安市户县": "陕西户县",
    "香港": "香港",
}

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Cross-dialect voice cloning audio demo: 7 Chinese dialects × 6 systems.">
<title>DSI-CDTTS · Cross-Dialect Voice Cloning Demo</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cg stroke='%23111' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M8 16h1.5'/%3E%3Cpath d='M13 11v10'/%3E%3Cpath d='M18 8v16'/%3E%3Cpath d='M23 13v6'/%3E%3C/g%3E%3C/svg%3E">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header>
  <h1>DSI-CDTTS · Cross-Dialect Voice Cloning Demo</h1>
  <p class="sub">7 Chinese dialects × 6 systems · reference voice + target text → target-dialect speech</p>
  <nav aria-label="Dialects">
__NAV__
  </nav>
</header>

<main>
__CASES__
</main>

<footer>
  <p>Anonymous submission · For review only</p>
</footer>

<script>
(function () {
  var players = [].slice.call(document.querySelectorAll("audio"));
  players.forEach(function (player) {
    player.addEventListener("play", function () {
      players.forEach(function (other) {
        if (other !== player) other.pause();
      });
    });
  });
})();
</script>
</body>
</html>
"""

CASE = """  <section id="{case_id}">
    <h2>{dialect} <span class="meta">{source} → {target} · sample {sample}</span></h2>
    <p class="text" lang="zh">{text}</p>
    <div class="audio-row">
      <span class="label">Reference · {source}</span>
      <audio controls preload="none" src="{ref}"></audio>
    </div>
{rows}
  </section>
"""

ROW = """    <div class="audio-row{ours}">
      <span class="label">{label}</span>
      <audio controls preload="none" src="{src}"></audio>
    </div>"""


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    manifest_path = Path(sys.argv[1]).expanduser().resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    nav = []
    cases = []
    missing = []
    for case in manifest["cases"]:
        case_id = case["ref_audio"].split("/")[1]
        target = case["target_language"]
        source = case["source_language"]
        region = REGIONS.get(case["ref_region"], case["ref_region"])
        nav.append(f'    <a href="#{case_id}">{html.escape(DIALECTS.get(target, target))}</a>')

        rows = []
        for key, label in MODELS:
            entry = case["models"][key]
            rel = entry["audio"]
            if not (ROOT / rel).is_file():
                missing.append(rel)
            rows.append(
                ROW.format(ours=" ours" if key == "main" else "", label=html.escape(label), src=rel)
            )
        if not (ROOT / case["ref_audio"]).is_file():
            missing.append(case["ref_audio"])
        cases.append(
            CASE.format(
                case_id=case_id,
                dialect=html.escape(DIALECTS.get(target, target)),
                source=html.escape(DIALECTS.get(source, source)),
                target=html.escape(DIALECTS.get(target, target)),
                sample=html.escape(case["sample"]),
                text=html.escape(case["text"].strip()),
                ref=case["ref_audio"],
                rows="\n".join(rows),
            )
        )

    page = PAGE.replace("__NAV__", "\n".join(nav)).replace("__CASES__", "\n".join(cases))
    OUT.write_text(page, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KiB, {len(cases)} cases, {len(cases) * 7} audio players)")
    if missing:
        print("ERROR: referenced audio is missing:", file=sys.stderr)
        for rel in sorted(set(missing)):
            print("  ", rel, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
