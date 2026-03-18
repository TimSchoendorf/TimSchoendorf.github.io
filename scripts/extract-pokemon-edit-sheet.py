from __future__ import annotations

from math import ceil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SHEET_PATH = ROOT / "assets" / "pokemon-rby-edit-sheet.png"
FRONT_ROOT = ROOT / "assets" / "pokemon-rby-clean" / "red-green"
BACK_ROOT = FRONT_ROOT / "back"

COLS = 16
CELL_SIZE = 64
GUTTER = 8
SECTION_GAP = 24


def crop_visible(cell: Image.Image) -> Image.Image:
    bbox = cell.getbbox()
    if bbox is None:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    return cell.crop(bbox)


def pad_to_canvas(sprite: Image.Image, canvas_size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    offset_x = max((canvas_size[0] - sprite.width) // 2, 0)
    offset_y = max(canvas_size[1] - sprite.height, 0)
    canvas.alpha_composite(sprite, (offset_x, offset_y))
    return canvas


def cell_box(col: int, row: int, y_offset: int) -> tuple[int, int, int, int]:
    block = CELL_SIZE + GUTTER
    x = col * block
    y = y_offset + row * block
    return (x, y, x + CELL_SIZE, y + CELL_SIZE)


def main() -> None:
    sheet = Image.open(SHEET_PATH).convert("RGBA")
    front_paths = sorted(FRONT_ROOT.glob("*.png"), key=lambda path: int(path.stem))
    rows = ceil(len(front_paths) / COLS)
    block = CELL_SIZE + GUTTER
    height = rows * block - GUTTER

    front_sprites: list[Image.Image] = []
    back_sprites: list[Image.Image] = []

    for index, _front_path in enumerate(front_paths):
        col = index % COLS
        row = index // COLS
        front_cell = sheet.crop(cell_box(col, row, 0))
        back_cell = sheet.crop(cell_box(col, row, height + SECTION_GAP))
        front_sprites.append(crop_visible(front_cell))
        back_sprites.append(crop_visible(back_cell))

    front_canvas = (
        max(sprite.width for sprite in front_sprites),
        max(sprite.height for sprite in front_sprites),
    )
    back_canvas = (
        max(sprite.width for sprite in back_sprites),
        max(sprite.height for sprite in back_sprites),
    )

    for front_path, front_sprite, back_sprite in zip(front_paths, front_sprites, back_sprites):
        pad_to_canvas(front_sprite, front_canvas).save(front_path)
        pad_to_canvas(back_sprite, back_canvas).save(BACK_ROOT / front_path.name)

    print(FRONT_ROOT)
    print(BACK_ROOT)


if __name__ == "__main__":
    main()
