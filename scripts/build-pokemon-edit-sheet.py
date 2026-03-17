from __future__ import annotations

from math import ceil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
FRONT_ROOT = ROOT / "assets" / "pokemon-rby-clean" / "red-green"
BACK_ROOT = FRONT_ROOT / "back"
OUTPUT_PATH = ROOT / "assets" / "pokemon-rby-edit-sheet.png"

COLS = 16
CELL_SIZE = 64
GUTTER = 8
SECTION_GAP = 24


def place_sprite(canvas: Image.Image, sprite: Image.Image, col: int, row: int, y_offset: int) -> None:
    block = CELL_SIZE + GUTTER
    x = col * block
    y = y_offset + row * block
    dx = x + (CELL_SIZE - sprite.width) // 2
    dy = y + (CELL_SIZE - sprite.height) // 2
    canvas.alpha_composite(sprite, (dx, dy))


def main() -> None:
    front_paths = sorted(FRONT_ROOT.glob("*.png"), key=lambda path: int(path.stem))
    rows = ceil(len(front_paths) / COLS)
    block = CELL_SIZE + GUTTER
    width = COLS * block - GUTTER
    height = rows * block - GUTTER
    total_height = height * 2 + SECTION_GAP

    canvas = Image.new("RGBA", (width, total_height), (0, 0, 0, 0))

    for index, front_path in enumerate(front_paths):
        col = index % COLS
        row = index // COLS
        front = Image.open(front_path).convert("RGBA")
        back = Image.open(BACK_ROOT / front_path.name).convert("RGBA")
        place_sprite(canvas, front, col, row, 0)
        place_sprite(canvas, back, col, row, height + SECTION_GAP)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT_PATH)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
