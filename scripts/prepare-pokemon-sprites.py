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
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
      queue.append((x, 0))
      queue.append((x, height - 1))
    for y in range(height):
      queue.append((0, y))
      queue.append((width - 1, y))

    while queue:
      x, y = queue.popleft()
      if (x, y) in seen or x < 0 or y < 0 or x >= width or y >= height:
        continue
      seen.add((x, y))
      if not is_background(pixels[x, y]):
        continue
      pixels[x, y] = (255, 255, 255, 0)
      queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

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
