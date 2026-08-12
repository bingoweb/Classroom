import os
from pathlib import Path

import gi

gi.require_version('Gimp', '3.0')
gi.require_version('Gegl', '0.4')
from gi.repository import Gegl, Gimp, Gio


ROOT = Path(os.environ['CLASSROOM_ROOT']).resolve()
SOURCE = ROOT / 'public/assets/panel.png'
DESTINATION = ROOT / 'public/themes/magic-park/boxes/noise-meter/assets/noise-console-panel.webp'

# ImageMagick/OpenCV measurement of the user-supplied source.  These bounds
# intentionally keep every non-background chassis pixel while removing the
# surrounding white canvas.
CROP_X = 26
CROP_Y = 42
CROP_W = 1721
CROP_H = 800


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f'Noise panel source not found: {SOURCE}')

    image = Gimp.file_load(Gimp.RunMode.NONINTERACTIVE, Gio.File.new_for_path(str(SOURCE)))
    layers = image.get_layers()
    if not layers:
        raise RuntimeError('Noise panel source loaded without a drawable layer')

    layer = layers[0]
    if not layer.has_alpha():
        layer.add_alpha()

    # Only the white canvas connected to the top-left corner is cleared. This
    # avoids punching holes in legitimate light highlights inside the device.
    Gimp.context_set_sample_merged(False)
    Gimp.context_set_sample_transparent(False)
    Gimp.context_set_sample_threshold(0.055)
    image.select_contiguous_color(Gimp.ChannelOps.REPLACE, layer, 0.0, 0.0)
    if not layer.edit_clear():
        raise RuntimeError('GIMP could not clear the connected white background')
    Gimp.Selection.none(image)

    image.crop(CROP_W, CROP_H, CROP_X, CROP_Y)
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)

    if not Gimp.file_save(
        Gimp.RunMode.NONINTERACTIVE,
        image,
        Gio.File.new_for_path(str(DESTINATION)),
        None,
    ):
        raise RuntimeError(f'GIMP could not export WebP: {DESTINATION}')

    print(f'Noise panel exported with GIMP: {DESTINATION}')
    print(f'Geometry: {CROP_W}x{CROP_H}; source crop +{CROP_X}+{CROP_Y}')


main()
