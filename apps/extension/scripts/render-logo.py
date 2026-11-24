#!/usr/bin/env python3
"""Rasterize the OpenLink extension logo: orange rounded tile, two paper-white slashes.

Geometry mirrors src/images/logo.svg (96x96 viewBox):
  rect 96x96 rx=24 fill #F2541B
  group scale(0.763158) translate(9.842)
  path M28 78 L48 22 and M52 78 L72 22, stroke 12, round caps, fill #FAFAF7.
Renders each size directly with supersampled coverage antialiasing and writes PNG (RGBA).
"""
import struct, zlib, math, os

VIEW = 96.0
RX = 24.0
ORANGE = (242, 84, 27)
PAPER = (250, 250, 247)

def gx(x):
    return x * 0.763158 + 9.842

SLASH = [(gx(28), 78 * 0.763158 + 9.842, gx(48), 22 * 0.763158 + 9.842),
         (gx(52), 78 * 0.763158 + 9.842, gx(72), 22 * 0.763158 + 9.842)]
# Stroke width 12 pre-transform -> radius after transform.
CAP_R = 12 * 0.763158 / 2.0

def rounded_rect_cover(px, py):
    # Signed distance to a rounded rectangle covering [0,VIEW]^2 with radius RX.
    qx = abs(px - VIEW / 2) - (VIEW / 2 - RX)
    qy = abs(py - VIEW / 2) - (VIEW / 2 - RX)
    d = math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - RX
    return 1.0 if d < -0.5 else (0.0 if d > 0.5 else 0.5 - d)

def capsule_cover(px, py, ax, ay, bx, by, r):
    # Distance from point to segment, minus cap radius.
    abx, aby = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)))
    d = math.hypot(px - (ax + t * abx), py - (ay + t * aby)) - r
    return 1.0 if d < -0.5 else (0.0 if d > 0.5 else 0.5 - d)

def render(size):
    ss = 8  # supersample grid per axis
    step = ss * ss
    px_size = VIEW / size
    rows = []
    for iy in range(size):
        row = bytearray()
        for ix in range(size):
            bg = 0.0
            fg = 0.0
            for sy in range(ss):
                y = (iy + (sy + 0.5) / ss) * px_size
                for sx in range(ss):
                    x = (ix + (sx + 0.5) / ss) * px_size
                    r, g, b, a = *ORANGE, rounded_rect_cover(x, y)
                    if a > 0:
                        sashes = 0.0
                        for ax, ay, bx, by in SLASH:
                            sashes = max(sashes, capsule_cover(x, y, ax, ay, bx, by, CAP_R))
                        fg += a * sashes
                        bg += a
            if bg > 0:
                cov = fg / step
                bgc = bg / step
                # Paper over orange over transparent.
                alpha_bg = bgc
                r = ORANGE[0] * (1 - alpha_bg) + (PAPER[0] * cov + ORANGE[0] * (1 - cov)) * alpha_bg
                g = ORANGE[1] * (1 - alpha_bg) + (PAPER[1] * cov + ORANGE[1] * (1 - cov)) * alpha_bg
                b = ORANGE[2] * (1 - alpha_bg) + (PAPER[2] * cov + ORANGE[2] * (1 - cov)) * alpha_bg
                row += bytes((round(r), round(g), round(b), round(bgc * 255)))
            else:
                row += b"\x00\x00\x00\x00"
        rows.append(bytes(row))
    return rows

def write_png(path, size, rows):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    raw = b"".join(b"\x00" + r for r in rows)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))

if __name__ == "__main__":
    out = sysdir = os.path.dirname(os.path.abspath(__file__))
    for size in (16, 32, 48, 128):
        rows = render(size)
        write_png(os.path.join(sysdir, f"icon-{size}.png"), size, rows)
        print(f"wrote icon-{size}.png")
