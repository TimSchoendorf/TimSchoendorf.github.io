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


def clear_edge_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    solid = [
        [pixels[x, y][3] > 0 and not is_background(pixels[x, y]) for x in range(width)]
        for y in range(height)
    ]

    dilated = [[False for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            if not solid[y][x]:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx = x + dx
                    ny = y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        dilated[ny][nx] = True

    closed = [[False for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            closed[y][x] = all(
                0 <= x + dx < width
                and 0 <= y + dy < height
                and dilated[y + dy][x + dx]
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
            )

    reachable_background = [[False for _ in range(width)] for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        for y in (0, height - 1):
            if not closed[y][x] and not reachable_background[y][x]:
                reachable_background[y][x] = True
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if not closed[y][x] and not reachable_background[y][x]:
                reachable_background[y][x] = True
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            if closed[ny][nx] or reachable_background[ny][nx]:
                continue
            reachable_background[ny][nx] = True
            queue.append((nx, ny))

    for y in range(height):
        for x in range(width):
            if is_background(pixels[x, y]) and reachable_background[y][x]:
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
