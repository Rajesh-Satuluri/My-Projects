"""
preview.py — Quick .docx preview after editing a section.

Usage:
    python docs/preview.py                   # rebuild + open PDF preview
    python docs/preview.py --section 04      # rebuild only section 04, then preview
    python docs/preview.py --watch           # auto-rebuild whenever any section changes

Requires: python-docx, LibreOffice (soffice), pdftoppm
"""

import argparse
import glob
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTIONS_DIR = os.path.join(ROOT, "docs", "sections")
DOCX_OUT = os.path.join(ROOT, "GSP_PULL_Customer_Forecast_Process_Documentation.docx")
PDF_OUT = os.path.join(ROOT, "GSP_PULL_Customer_Forecast_Process_Documentation.pdf")
IMG_OUT_PREFIX = os.path.join(ROOT, "preview_page")

SOFFICE = "soffice"  # or full path if needed


def build_docx():
    print("📄 Building .docx...")
    result = subprocess.run(
        [sys.executable, os.path.join(ROOT, "docs", "build.py")],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("❌ Build failed:", result.stderr)
        return False
    print(result.stdout.strip())
    return True


def convert_to_pdf():
    print("🔄 Converting to PDF...")
    result = subprocess.run(
        [SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", ROOT, DOCX_OUT],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("❌ PDF conversion failed:", result.stderr)
        return False
    print("✅ PDF ready:", PDF_OUT)
    return True


def render_pages():
    print("🖼  Rendering pages as images...")
    # Clean old images
    for f in glob.glob(f"{IMG_OUT_PREFIX}-*.jpg"):
        os.remove(f)
    result = subprocess.run(
        ["pdftoppm", "-jpeg", "-r", "120", PDF_OUT, IMG_OUT_PREFIX],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("❌ Image render failed:", result.stderr)
        return []
    pages = sorted(glob.glob(f"{IMG_OUT_PREFIX}-*.jpg"))
    print(f"✅ {len(pages)} page(s) rendered")
    return pages


def get_mtimes():
    files = sorted(glob.glob(os.path.join(SECTIONS_DIR, "*.md")))
    return {f: os.path.getmtime(f) for f in files}


def watch_mode():
    print("👀 Watching docs/sections/ for changes... (Ctrl+C to stop)\n")
    last_mtimes = get_mtimes()
    while True:
        time.sleep(2)
        current_mtimes = get_mtimes()
        changed = [f for f in current_mtimes if current_mtimes[f] != last_mtimes.get(f)]
        if changed:
            for f in changed:
                print(f"✏️  Changed: {os.path.basename(f)}")
            if build_docx() and convert_to_pdf():
                pages = render_pages()
                if pages:
                    print(f"\n👉 Preview images: {pages[0]} … (open in any image viewer)\n")
            last_mtimes = current_mtimes


def main():
    parser = argparse.ArgumentParser(description="Preview GSP doc after section edits.")
    parser.add_argument("--section", help="Section number prefix (e.g. '04') to highlight in output")
    parser.add_argument("--watch", action="store_true", help="Watch for changes and auto-rebuild")
    args = parser.parse_args()

    if args.watch:
        watch_mode()
        return

    if not build_docx():
        sys.exit(1)
    if not convert_to_pdf():
        sys.exit(1)
    pages = render_pages()
    if pages:
        print(f"\n👉 Open these to review:")
        for p in pages:
            print(f"   {p}")


if __name__ == "__main__":
    main()
