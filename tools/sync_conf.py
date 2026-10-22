#!/usr/bin/env python3
"""Copy the conference-timeline block into both page files.

  python3 tools/sync_conf.py          # write src/conf.html into index.html and src/template.html
  python3 tools/sync_conf.py --check  # only check that both pages hold exactly src/conf.html

The block lives between <!--CONF-START--> and <!--CONF-END--> (markers included in
src/conf.html). index.html is normally built from src/template.html by a bundler that
only exists on the author's laptop, so every change to the block must land in both
files; this script keeps them byte-identical.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "conf.html")
PAGES = [os.path.join(ROOT, "index.html"), os.path.join(ROOT, "src", "template.html")]
START, END = "<!--CONF-START-->", "<!--CONF-END-->"


def block_of(text, where):
    if text.count(START) != 1 or text.count(END) != 1:
        sys.exit(f"{where}: expected exactly one {START} and one {END}")
    a = text.index(START)
    b = text.index(END) + len(END)
    if b < a:
        sys.exit(f"{where}: {END} comes before {START}")
    return a, b


def main():
    check = "--check" in sys.argv[1:]
    with open(SRC, encoding="utf-8") as f:
        src = f.read().rstrip("\n")
    a, b = block_of(src, "src/conf.html")
    if a != 0 or b != len(src):
        sys.exit("src/conf.html must start with the start marker and end with the end marker")
    bad = []
    for page in PAGES:
        with open(page, encoding="utf-8") as f:
            text = f.read()
        a, b = block_of(text, os.path.relpath(page, ROOT))
        if text[a:b] == src:
            continue
        if check:
            bad.append(os.path.relpath(page, ROOT))
        else:
            with open(page, "w", encoding="utf-8") as f:
                f.write(text[:a] + src + text[b:])
            print("updated", os.path.relpath(page, ROOT))
    if bad:
        sys.exit("out of sync with src/conf.html: " + ", ".join(bad) + " (run python3 tools/sync_conf.py)")
    if check:
        print("conf block in sync (index.html, src/template.html)")


if __name__ == "__main__":
    main()
