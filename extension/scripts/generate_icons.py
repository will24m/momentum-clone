#!/usr/bin/env python3
"""Generate PNG icons for the Chrome extension without external dependencies."""

from __future__ import annotations

import math
import pathlib
import struct
import zlib


ROOT = pathlib.Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "public" / "icons"
SIZES = [16, 32, 48, 128]


def clamp(value: float) -> int:
    return max(0, min(255, int(round(value))))


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(clamp(a[index] * (1 - t) + b[index] * t) for index in range(3))


def empty_canvas(size: int) -> list[list[tuple[int, int, int, int]]]:
    return [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]


def write_png(path: pathlib.Path, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    height = len(pixels)
    width = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for red, green, blue, alpha in row:
            raw.extend([red, green, blue, alpha])

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack("!I", len(data))
            + tag
            + data
            + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(
        b"IHDR",
        struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0),
    )
    png += chunk(b"IDAT", zlib.compress(bytes(raw), level=9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def rounded_rect_mask(x: float, y: float, width: float, height: float, radius: float, px: float, py: float) -> float:
    nx = abs(px - (x + width / 2)) - width / 2 + radius
    ny = abs(py - (y + height / 2)) - height / 2 + radius
    outside = math.hypot(max(nx, 0), max(ny, 0))
    inside = min(max(nx, ny), 0)
    distance = outside + inside - radius
    return max(0.0, min(1.0, 0.5 - distance))


def paint_icon(size: int) -> list[list[tuple[int, int, int, int]]]:
    canvas = empty_canvas(size)
    warm_top = (243, 162, 95)
    warm_bottom = (201, 106, 71)
    shell = (255, 248, 238)
    shell_soft = (255, 235, 216)

    rect_x = size * 0.08
    rect_y = size * 0.08
    rect_w = size * 0.84
    rect_h = size * 0.84
    radius = size * 0.22

    for y in range(size):
        for x in range(size):
            px = x + 0.5
            py = y + 0.5

            shadow = rounded_rect_mask(rect_x, rect_y + size * 0.035, rect_w, rect_h, radius, px, py)
            if shadow > 0:
                alpha = clamp(72 * shadow)
                canvas[y][x] = (35, 22, 16, alpha)

    for y in range(size):
        for x in range(size):
            px = x + 0.5
            py = y + 0.5
            mask = rounded_rect_mask(rect_x, rect_y, rect_w, rect_h, radius, px, py)
            if mask <= 0:
                continue

            gradient_t = (py - rect_y) / rect_h
            red, green, blue = mix(warm_top, warm_bottom, gradient_t)

            glow_x = size * 0.26
            glow_y = size * 0.22
            glow_distance = math.hypot(px - glow_x, py - glow_y)
            glow = max(0.0, 1 - glow_distance / (size * 0.42))
            red = clamp(red + glow * 30)
            green = clamp(green + glow * 20)
            blue = clamp(blue + glow * 12)

            alpha = clamp(mask * 255)
            canvas[y][x] = (red, green, blue, alpha)

    line_thickness = max(1.4, size * 0.055)
    dot_radius = max(1.6, size * 0.058)
    left = size * 0.28
    right = size * 0.74
    rows = [size * 0.34, size * 0.5, size * 0.66]

    for y in range(size):
        for x in range(size):
            px = x + 0.5
            py = y + 0.5
            current = canvas[y][x]
            if current[3] == 0:
                continue

            overlay_alpha = 0.0
            overlay_color = shell

            for row in rows:
                line_distance = abs(py - row)
                if left <= px <= right and line_distance <= line_thickness:
                    overlay_alpha = max(overlay_alpha, 1.0)

                dot_distance = math.hypot(px - (left - size * 0.09), py - row)
                if dot_distance <= dot_radius:
                    overlay_alpha = max(overlay_alpha, 1.0)
                    overlay_color = shell_soft

            if overlay_alpha > 0:
                base_alpha = current[3] / 255
                alpha = overlay_alpha
                mixed = mix(current[:3], overlay_color, alpha)
                canvas[y][x] = (*mixed, clamp((base_alpha + alpha * (1 - base_alpha)) * 255))

    highlight_center = (size * 0.72, size * 0.28)
    for y in range(size):
        for x in range(size):
            px = x + 0.5
            py = y + 0.5
            current = canvas[y][x]
            if current[3] == 0:
                continue

            distance = math.hypot(px - highlight_center[0], py - highlight_center[1])
            alpha = max(0.0, 0.26 - distance / (size * 6.5))
            if alpha <= 0:
                continue

            mixed = mix(current[:3], (255, 255, 255), alpha)
            canvas[y][x] = (*mixed, current[3])

    return canvas


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        pixels = paint_icon(size)
        write_png(ICON_DIR / f"icon-{size}.png", pixels)


if __name__ == "__main__":
    main()
