#!/usr/bin/env python3
"""Static + headless-browser QA for the demo page.

Checks:
  1. every asset / audio referenced by index.html and assets/data.js exists
  2. the page renders in headless Chrome at desktop, tablet and phone widths
  3. injected tools/audit.js verifies layout, i18n, theme, playback, keyboard
     and reports contrast ratios

Usage:
    python3 tools/qa_check.py                 # all checks
    python3 tools/qa_check.py --shots         # also write preview screenshots
"""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import re
import shutil
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIT_COPY = ROOT / "_audit.html"
SHOT_DIR = ROOT / "docs"
CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome",
    "chromium",
    "chrome",
]


def find_chrome() -> str | None:
    for candidate in CHROME_CANDIDATES:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
        if Path(candidate).is_file():
            return candidate
    return None


def link_check() -> list[str]:
    problems: list[str] = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    refs = re.findall(r'(?:href|src)="([^"#:]+)"', html)
    for ref in refs:
        if ref.startswith("assets/") and not (ROOT / ref).is_file():
            problems.append(f"index.html references missing file: {ref}")

    data = (ROOT / "assets" / "data.js").read_text(encoding="utf-8")
    audio = sorted(set(re.findall(r'"(cases/[^"]+\.mp3)"', data)))
    if len(audio) != 49:
        problems.append(f"data.js lists {len(audio)} audio files, expected 49")
    for rel in audio:
        if not (ROOT / rel).is_file():
            problems.append(f"missing audio: {rel}")

    peaks = (ROOT / "assets" / "peaks.js").read_text(encoding="utf-8")
    peak_keys = set(re.findall(r'"(cases/[^"]+\.mp3)"', peaks))
    missing_peaks = sorted(set(audio) - peak_keys)
    if missing_peaks:
        problems.append(f"peaks.js missing {len(missing_peaks)} clips: {missing_peaks[:3]}")

    for case_dir in sorted((ROOT / "cases").iterdir()):
        if not case_dir.is_dir():
            continue
        names = {p.name for p in case_dir.glob("*.mp3")}
        expected = {
            "ref.mp3", "01_main.mp3", "02_m2d.mp3", "03_cv3_1ref_10k.mp3",
            "04_cosyvoice3.mp3", "05_fireredtts3.mp3", "06_voxcpm2_base.mp3",
        }
        if names != expected:
            problems.append(f"{case_dir.name}: unexpected audio set {sorted(names)}")
        if not (case_dir / "text.txt").is_file():
            problems.append(f"{case_dir.name}: missing text.txt")
    return problems


def build_audit_copy() -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    inject = '<script src="tools/audit.js"></script>\n</body>'
    assert "</body>" in html
    AUDIT_COPY.write_text(html.replace("</body>", inject), encoding="utf-8")


def run_chrome(chrome: str, width: int, height: int, budget: int, url: str) -> str:
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        "--autoplay-policy=no-user-gesture-required",
        "--mute-audio",
        f"--window-size={width},{height}",
        f"--virtual-time-budget={budget}",
        "--dump-dom",
        url,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(f"chrome exited {proc.returncode}: {proc.stderr[-800:]}")
    dom = proc.stdout
    match = re.search(r"AUDIT_JSON_START(.*?)AUDIT_JSON_END", dom, re.S)
    if not match:
        raise RuntimeError("audit report not found in rendered DOM")
    return match.group(1)


def screenshot(chrome: str, out: Path, width: int, height: int, url: str) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            chrome,
            "--headless=new", "--disable-gpu", "--hide-scrollbars",
            f"--window-size={width},{height}",
            "--virtual-time-budget=6000",
            f"--screenshot={out}",
            url,
        ],
        capture_output=True,
        check=True,
        timeout=180,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shots", action="store_true", help="also write screenshots")
    parser.add_argument("--serve", action="store_true", help="audit over HTTP instead of file://")
    args = parser.parse_args()

    failures = 0
    print("== link check ==")
    problems = link_check()
    for p in problems:
        print("  FAIL", p)
    if not problems:
        print("  ok: all 49 clips, texts and page assets resolve")
    failures += len(problems)

    chrome = find_chrome()
    if not chrome:
        print("  WARN: no Chrome/Chromium found, skipping browser audit")
        AUDIT_COPY.unlink(missing_ok=True)
        return 1 if failures else 0

    build_audit_copy()
    server = None
    if args.serve:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        url = "http://127.0.0.1:8765/_audit.html"
        print("\n(serving repo over HTTP on 127.0.0.1:8765)")
    else:
        url = AUDIT_COPY.as_uri()
    try:
        for width, height, label in [(1440, 900, "desktop 1440"), (1024, 768, "tablet 1024"), (390, 844, "phone 390")]:
            print(f"\n== browser audit @ {label} ==")
            try:
                raw = run_chrome(chrome, width, height, 20000, url)
            except Exception as exc:  # noqa: BLE001 - report and continue
                print("  FAIL", exc)
                failures += 1
                continue
            report = json.loads(raw)
            vp = report["viewport"]
            print(
                f"  viewport {vp['w']}x{vp['h']} dpr={vp['dpr']} "
                f"lang={vp['lang']} theme={vp['theme']} pageHeight={vp['pageHeight']}"
            )
            for test in report["tests"]:
                mark = "ok  " if test["pass"] else "FAIL"
                if not test["pass"]:
                    failures += 1
                print(f"  {mark} {test['name']:<44s} {json.dumps(test['detail'], ensure_ascii=False)[:150]}")
            for err in report["errors"]:
                print("  ERROR", err)
                failures += 1
            low = [c for c in report.get("contrast", []) if c["ratio"] < 4.5]
            print("  contrast below 4.5:", json.dumps(low, ensure_ascii=False))
            if report.get("audioLoaded"):
                print("  audio elements:", json.dumps(report["audioLoaded"], ensure_ascii=False))
        print("\n== deep link check ==")
        try:
            raw = run_chrome(chrome, 1280, 900, 20000, url + "#case-05_shaanxi_s30")
            catch = json.loads(raw).get("hashCheck") or {}
            scrolled = catch.get("found") and catch.get("scrollY", 0) > 100
            print(
                f"  {'ok  ' if scrolled else 'FAIL'} deep link scrolls to case   "
                f"{json.dumps(catch, ensure_ascii=False)}"
            )
            if not scrolled:
                failures += 1
        except Exception as exc:  # noqa: BLE001
            print("  FAIL", exc)
            failures += 1

        if args.shots:
            print("\n== screenshots ==")
            base = f"{(ROOT / 'index.html').as_uri()}"
            screenshot(chrome, SHOT_DIR / "preview-desktop.png", 1440, 1400, base)
            screenshot(chrome, SHOT_DIR / "preview-mobile.png", 390, 1200, base)
            print("  wrote docs/preview-desktop.png, docs/preview-mobile.png")
    finally:
        AUDIT_COPY.unlink(missing_ok=True)
        if server:
            server.shutdown()

    print(f"\n{failures} failing check(s)" if failures else "\nall checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
