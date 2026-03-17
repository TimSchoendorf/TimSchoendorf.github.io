from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "assets" / "pokemon-rby" / "red-green"
TARGET_ROOT = ROOT / "assets" / "pokemon-rby-clean" / "red-green"


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and r >= 248 and g >= 248 and b >= 248


def touches_sprite_detail(
    component_size: int,
    dark_adjacent_pixels: int,
) -> bool:
    ratio = dark_adjacent_pixels / component_size
    return (
        ratio >= 0.62
        or (ratio >= 0.48 and component_size <= 120)
        or (ratio >= 0.78 and component_size <= 420)
    )


def edge_white_components(image: Image.Image) -> list[dict[str, object]]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen: set[tuple[int, int]] = set()
    components: list[dict[str, object]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or not is_background(pixels[x, y]):
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen.add((x, y))
            cells: list[tuple[int, int]] = []
            touches_edge = False
            dark_adjacent_pixels = 0

            while queue:
                cx, cy = queue.popleft()
                cells.append((cx, cy))
                if cx == 0 or cy == 0 or cx == width - 1 or cy == height - 1:
                    touches_edge = True

                has_dark_neighbor = False
                for nx, ny in (
                    (cx + 1, cy),
                    (cx - 1, cy),
                    (cx, cy + 1),
                    (cx, cy - 1),
                    (cx + 1, cy + 1),
                    (cx + 1, cy - 1),
                    (cx - 1, cy + 1),
                    (cx - 1, cy - 1),
                ):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if is_background(pixels[nx, ny]):
                        if (nx, ny) not in seen:
                            seen.add((nx, ny))
                            queue.append((nx, ny))
                    elif pixels[nx, ny][3] > 0:
                        has_dark_neighbor = True

                if has_dark_neighbor:
                    dark_adjacent_pixels += 1

            if touches_edge:
                components.append(
                    {
                        "cells": cells,
                        "size": len(cells),
                        "dark_adjacent_pixels": dark_adjacent_pixels,
                    }
                )

    return components


def clear_edge_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    components = edge_white_components(rgba)

    if not components:
        return rgba

    largest_background = max(components, key=lambda component: int(component["size"]))

    for component in components:
        preserve_component = (
            component is not largest_background
            and touches_sprite_detail(
                int(component["size"]),
                int(component["dark_adjacent_pixels"]),
            )
        )
        if preserve_component:
            continue
        for x, y in component["cells"]:
            pixels[x, y] = (255, 255, 255, 0)

    return rgba


def process_folder(relative: str) -> None:
    source = SOURCE_ROOT / relative
    target = TARGET_ROOT / relative
    target.mkdir(parents=True, exist_ok=True)
    for sprite in sorted(source.glob("*.png")):
      cleaned = clear_edge_white(Image.open(sprite))
      cleaned.save(target / sprite.name)


def main() -> None:
    process_folder("")
    process_folder("back")


if __name__ == "__main__":
    main()
