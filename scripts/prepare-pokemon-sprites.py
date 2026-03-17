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


def clear_edge_white(color_image: Image.Image, gray_image: Image.Image) -> Image.Image:
    color_rgba = color_image.convert("RGBA")
    gray_rgba = gray_image.convert("RGBA")
    width, height = color_rgba.size
    color_pixels = color_rgba.load()
    gray_pixels = gray_rgba.load()

    # Combine both variants into one conservative foreground mask.
    # The grayscale companion rescues many highlight pixels that are white in the
    # color sprite, and a light closing step seals tiny contour gaps before the
    # edge flood decides what is true background.
    foreground_seed = [
        [
            (
                color_pixels[x, y][3] > 0
                and not is_background(color_pixels[x, y])
            )
            or (
                gray_pixels[x, y][3] > 0
                and not is_background(gray_pixels[x, y])
            )
            for x in range(width)
        ]
        for y in range(height)
    ]

    dilated = [[False for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            if not foreground_seed[y][x]:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx = x + dx
                    ny = y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        dilated[ny][nx] = True

    foreground_mask = [[False for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            foreground_mask[y][x] = all(
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
            if not foreground_mask[y][x] and not reachable_background[y][x]:
                reachable_background[y][x] = True
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if not foreground_mask[y][x] and not reachable_background[y][x]:
                reachable_background[y][x] = True
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            if foreground_mask[ny][nx] or reachable_background[ny][nx]:
                continue
            reachable_background[ny][nx] = True
            queue.append((nx, ny))

    output = Image.new("RGBA", color_rgba.size, (255, 255, 255, 0))
    output_pixels = output.load()
    for y in range(height):
        for x in range(width):
            pixel = color_pixels[x, y]
            if pixel[3] == 0:
                continue
            if not is_background(pixel) or not reachable_background[y][x]:
                output_pixels[x, y] = pixel

    return output


def process_folder(relative: str) -> None:
    source = SOURCE_ROOT / relative
    gray = SOURCE_ROOT / relative / "gray" if relative else SOURCE_ROOT / "gray"
    target = TARGET_ROOT / relative
    target.mkdir(parents=True, exist_ok=True)
    for sprite in sorted(source.glob("*.png")):
        gray_sprite = gray / sprite.name
        cleaned = clear_edge_white(Image.open(sprite), Image.open(gray_sprite))
        cleaned.save(target / sprite.name)


def main() -> None:
    process_folder("")
    process_folder("back")


if __name__ == "__main__":
    main()
