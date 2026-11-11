#!/usr/bin/env python3
"""
Generates transparent, anti-aliased web & PWA icon assets from the high-resolution source.
Cuts the outer black background using a supersampled cubic Bézier continuous-curvature squircle mask
and color de-matting to ensure smooth, clean edges with zero black fringe on any background.

Usage:
  python3 scripts/build-app-icons.py [optional_source_path]
"""

import sys
import os
import io
import base64
from PIL import Image, ImageDraw

def build_icons(src_path=None):
    if src_path is None:
        src_path = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "appicon-source.jpg")
    
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source file not found: {src_path}")

    print(f"Loading source image: {src_path}")
    jpg = Image.open(src_path).convert("RGB")
    w, h = jpg.size

    # Supersampled mask (4x) for sub-pixel anti-aliasing
    scale = 4
    sw, sh = w * scale, h * scale
    mask_hi = Image.new("L", (sw, sh), 0)
    draw = ImageDraw.Draw(mask_hi)
    c_len = 234 * scale
    k = c_len * 0.485

    def get_corner_bezier(P0, P1, P2, P3, steps=120):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            x = (1-t)**3 * P0[0] + 3*(1-t)**2*t * P1[0] + 3*(1-t)*t**2 * P2[0] + t**3 * P3[0]
            y = (1-t)**3 * P0[1] + 3*(1-t)**2*t * P1[1] + 3*(1-t)*t**2 * P2[1] + t**3 * P3[1]
            pts.append((x, y))
        return pts

    tl_pts = get_corner_bezier((0, c_len), (0, c_len - k), (c_len - k, 0), (c_len, 0))
    tr_pts = get_corner_bezier((sw - c_len, 0), (sw - c_len + k, 0), (sw, c_len - k), (sw, c_len))
    br_pts = get_corner_bezier((sw, sh - c_len), (sw, sh - c_len + k), (sw - c_len + k, sh), (sw - c_len, sh))
    bl_pts = get_corner_bezier((c_len, sh), (c_len - k, sh), (0, sh - c_len + k), (0, sh - c_len))

    poly = tl_pts + tr_pts + br_pts + bl_pts
    draw.polygon(poly, fill=255)
    mask = mask_hi.resize((w, h), Image.Resampling.LANCZOS)

    master = jpg.copy().convert("RGBA")
    master.putalpha(mask)
    pixels = master.load()

    # Color de-matting: semi-transparent boundary pixels inherit pure color from nearest opaque neighbor
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if 0 < a < 255:
                best_rgb = None
                min_dist = 999
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            nr, ng, nb, na = pixels[nx, ny]
                            if na == 255:
                                dist = dx*dx + dy*dy
                                if dist < min_dist:
                                    min_dist = dist
                                    best_rgb = (nr, ng, nb)
                if best_rgb:
                    pixels[x, y] = (best_rgb[0], best_rgb[1], best_rgb[2], a)

    pub_dir = os.path.join(os.path.dirname(__file__), "..", "public")

    # 1. LogoCuteGengarRounded.png (1024x1024 master)
    im1024 = master.resize((1024, 1024), Image.Resampling.LANCZOS)
    im1024.save(os.path.join(pub_dir, "LogoCuteGengarRounded.png"), "PNG", optimize=True)

    # 2. android-chrome-512x512.png
    im512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    im512.save(os.path.join(pub_dir, "android-chrome-512x512.png"), "PNG", optimize=True)

    # 3. android-chrome-192x192.png
    im192 = master.resize((192, 192), Image.Resampling.LANCZOS)
    im192.save(os.path.join(pub_dir, "android-chrome-192x192.png"), "PNG", optimize=True)

    # 4. apple-touch-icon.png (180x180)
    im180 = master.resize((180, 180), Image.Resampling.LANCZOS)
    im180.save(os.path.join(pub_dir, "apple-touch-icon.png"), "PNG", optimize=True)

    # 5. favicon-32x32.png
    im32 = master.resize((32, 32), Image.Resampling.LANCZOS)
    im32.save(os.path.join(pub_dir, "favicon-32x32.png"), "PNG", optimize=True)

    # 6. favicon-16x16.png
    im16 = master.resize((16, 16), Image.Resampling.LANCZOS)
    im16.save(os.path.join(pub_dir, "favicon-16x16.png"), "PNG", optimize=True)

    # 7. favicon.ico (multi-resolution ICO 16, 32, 48)
    im48 = master.resize((48, 48), Image.Resampling.LANCZOS)
    im48.save(os.path.join(pub_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    # 8. logo-mark.webp (256x256)
    im256 = master.resize((256, 256), Image.Resampling.LANCZOS)
    im256.save(os.path.join(pub_dir, "logo-mark.webp"), "WEBP", quality=90)

    # 9. logo-mark-128.webp (128x128)
    im128 = master.resize((128, 128), Image.Resampling.LANCZOS)
    im128.save(os.path.join(pub_dir, "logo-mark-128.webp"), "WEBP", quality=90)

    # 10. favicon.svg
    buf = io.BytesIO()
    im256.save(buf, format="PNG", optimize=True)
    b64_png = base64.b64encode(buf.getvalue()).decode("utf-8")
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
  <image width="256" height="256" href="data:image/png;base64,{b64_png}"/>
</svg>
"""
    with open(os.path.join(pub_dir, "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)

    print("All icons generated successfully!")

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    build_icons(src)
