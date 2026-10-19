"""Cut product photos out of the official CHAJOY menu board.

One-time asset pipeline (not used at runtime). Needs Python 3 with
opencv-python-headless and numpy:

    python scripts/menu-images/extract_menu_images.py

Reads data/source/menu-crops.json and data/source/official-menu-2026.jpg,
writes public/images/products/*.webp plus a provenance manifest at
data/source/menu-images.manifest.json.

The menu board is 2048 px wide, so each product is only ~50-160 px in the
source. Output is upscaled for display and clearly recorded as low
resolution; replace with CHAJOY's original photography when available
(Admin > Products > Images).
"""

import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CFG = os.path.join(ROOT, "data", "source", "menu-crops.json")
SRC = os.path.join(ROOT, "data", "source", "official-menu-2026.jpg")
OUT = os.path.join(ROOT, "public", "images", "products")
MANIFEST = os.path.join(ROOT, "data", "source", "menu-images.manifest.json")

TARGET_H = 480  # output height in px


def background_alpha(img):
    """Alpha mask: flood-fill the light background from the crop border."""
    h, w = img.shape[:2]
    blurred = cv2.GaussianBlur(img, (3, 3), 0)
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8)
    lo = up = (14, 14, 14)
    seeds = []
    for x in range(0, w, max(1, w // 12)):
        seeds += [(x, 0), (x, h - 1)]
    for y in range(0, h, max(1, h // 12)):
        seeds += [(0, y), (w - 1, y)]
    for sx, sy in seeds:
        b, g, r = (int(c) for c in blurred[sy, sx])
        # only seed from light, low-saturation background pixels
        if min(b, g, r) > 175 and max(b, g, r) - min(b, g, r) < 60 and mask[sy + 1, sx + 1] == 0:
            cv2.floodFill(blurred, mask, (sx, sy), 0, lo, up, flags)
    bg = mask[1:-1, 1:-1]
    fg = cv2.bitwise_not(bg)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    return fg


def edge_feather(h, w, frac=0.06):
    ys = np.minimum(np.arange(h), np.arange(h)[::-1]) / max(1.0, h * frac)
    xs = np.minimum(np.arange(w), np.arange(w)[::-1]) / max(1.0, w * frac)
    return np.clip(np.minimum.outer(ys, xs), 0, 1)


def process(crop, scale_to=TARGET_H):
    """Upscale and fade the crop edges to white.

    The storefront shows these with `mix-blend-mode: multiply` on a tinted
    card, so white reads as the card colour. Cutting the background out
    instead removed white ice cream and milk along with it.
    """
    h, w = crop.shape[:2]
    s = scale_to / h
    up = cv2.resize(crop, (round(w * s), scale_to), interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(up, (0, 0), 1.2)
    up = cv2.addWeighted(up, 1.45, blur, -0.45, 0)  # gentle unsharp mask
    f = edge_feather(up.shape[0], up.shape[1], 0.09)[:, :, None]
    white = np.full_like(up, 255)
    return (up * f + white * (1 - f)).astype(np.uint8)


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Missing {SRC}. Download the official menu (see menu-crops.json 'source').")
    cfg = json.load(open(CFG, encoding="utf-8"))
    menu = cv2.imread(SRC)
    os.makedirs(OUT, exist_ok=True)
    manifest = []
    for c in cfg["crops"]:
        x, y, w, h = c["box"]
        work = menu.copy()
        for ex, ey, ew, eh in c.get("erase", []):
            m = np.zeros(work.shape[:2], np.uint8)
            region = work[ey:ey + eh, ex:ex + ew]
            # only inpaint the printed text pixels (red price or grey type)
            hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
            red = ((hsv[:, :, 0] < 10) | (hsv[:, :, 0] > 170)) & (hsv[:, :, 1] > 90)
            grey = (hsv[:, :, 1] < 70) & (hsv[:, :, 2] < 200)
            m[ey:ey + eh, ex:ex + ew] = ((red | grey) * 255).astype(np.uint8)
            m = cv2.dilate(m, np.ones((3, 3), np.uint8))
            work = cv2.inpaint(work, m, 3, cv2.INPAINT_TELEA)
        crop = work[y:y + h, x:x + w]
        outputs = [(c["out"], crop)]
        split = c.get("flavourSplitX")
        if split:
            outputs.append((c["out"] + "--original", work[y:y + h, x:split]))
            outputs.append((c["out"] + "--matcha", work[y:y + h, split:x + w]))
        for name, img in outputs:
            path = os.path.join(OUT, name + ".webp")
            cv2.imwrite(path, process(img), [cv2.IMWRITE_WEBP_QUALITY, 88])
            manifest.append({
                "file": f"/images/products/{name}.webp",
                "sourceBox": c["box"] if name == c["out"] else None,
                "sourcePixels": f"{img.shape[1]}x{img.shape[0]}",
                "lowResolution": True,
            })
            print("wrote", path, img.shape[1], "x", img.shape[0])
    json.dump({"source": cfg["source"], "images": manifest}, open(MANIFEST, "w", encoding="utf-8"), indent=2)


if __name__ == "__main__":
    main()
