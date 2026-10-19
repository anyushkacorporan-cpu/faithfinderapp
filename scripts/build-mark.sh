#!/bin/sh
#
# Builds every file of the Four Circle mark from one description of it.
#
#   sh scripts/build-mark.sh
#
# The mark is a Latin cross with the proportions of the one in the wordmark:
# twice as tall as it is wide, the bar a third of the way down, round ends.
# It is described once here, in a 100-unit square, and every size is drawn
# from that rather than resized from a picture of it, so nothing is ever
# resampled and the small ones stay as crisp as the large.
#
# The glow is two blurred copies of the same shape behind the sharp one.
# Drawn, not photographed, and not traced from anybody's stock artwork.
#
# ImageMagick has no SVG rasteriser here, so the PNGs are drawn with its own
# primitives and the SVG is written beside them by hand. If the geometry
# below changes, change the SVG too: they are two statements of one shape and
# nothing checks that they agree.

set -e
cd "$(dirname "$0")/.."

GOLD='#D5B03A'       # the gold of the wordmark, which beats the app's paler
                     # #C9A96E on a white ground, where that one goes faint
HALO_WIDE='#EAC150'
HALO_TIGHT='#F3D474'

# draw SIZE COLOUR BACKGROUND|none OUT
draw () {
  s=$1
  u () { echo "$1 * $s / 100" | bc -l | cut -d. -f1; }
  if [ "$3" = none ]; then canvas="xc:none"; else canvas="xc:$3"; fi
  convert -size "${s}x${s}" $canvas -fill "$2" \
    -draw "roundrectangle $(u 46.7),$(u 18) $(u 53.3),$(u 78) $(u 3.3),$(u 3.3)" \
    -draw "roundrectangle $(u 35),$(u 35.1) $(u 65),$(u 41.7) $(u 3.3),$(u 3.3)" \
    "$4"
}

# glowing SIZE BACKGROUND|none OUT
#
# Proportional blurs: a halo fixed in pixels would swallow a 32px favicon and
# vanish on a 1024px icon.
glowing () {
  s=$1
  tmp=$(mktemp -d)
  draw "$s" "$GOLD" none "$tmp/sharp.png"
  convert "$tmp/sharp.png" -alpha extract "$tmp/mask.png"

  wide=$(echo "$s * 4.4 / 100" | bc -l | cut -d. -f1)
  tight=$(echo "$s * 1.4 / 100" | bc -l | cut -d. -f1)

  convert "$tmp/mask.png" -blur "0x$wide" "$tmp/mw.png"
  convert -size "${s}x${s}" xc:"$HALO_WIDE" "$tmp/mw.png" -alpha off \
    -compose copy_opacity -composite "$tmp/gw.png"
  convert "$tmp/mask.png" -blur "0x$tight" "$tmp/mt.png"
  convert -size "${s}x${s}" xc:"$HALO_TIGHT" "$tmp/mt.png" -alpha off \
    -compose copy_opacity -composite "$tmp/gt.png"

  if [ "$2" = none ]; then base="xc:none"; else base="xc:$2"; fi
  # The wide halo twice: one pass of it is almost invisible against white.
  convert -size "${s}x${s}" $base \
    "$tmp/gw.png" -composite "$tmp/gw.png" -composite \
    "$tmp/gt.png" -composite "$tmp/sharp.png" -composite "$3"
  rm -rf "$tmp"
}

mkdir -p assets/brand docs

# The app. A flat ground and no alpha channel: App Store Connect refuses an
# icon that carries one, and iOS rounds the corners itself.
glowing 1024 '#FFFFFF' assets/images/icon.png
convert assets/images/icon.png -alpha off assets/images/icon.png

# The splash plugin paints white behind this in light and black in dark, so it
# keeps its transparency and the halo has to sit on either.
glowing 1024 none assets/images/splash-icon.png

# The site.
glowing 512 '#FFFFFF' docs/favicon-512.png
glowing 180 '#FFFFFF' docs/apple-touch-icon.png
glowing 32  '#FFFFFF' docs/favicon-32.png

# The mark on its own, and on a public url for the welcome email's header.
glowing 512 none assets/brand/mark-512.png
cp assets/brand/mark-512.png docs/mark-512.png

# One colour, for the places colour cannot go: a glow is not reproducible in
# flat black and pretending otherwise gives a grey smudge.
draw 512 '#000000' none assets/brand/mark-black-512.png
draw 512 '#FFFFFF' none assets/brand/mark-white-512.png

echo "mark built:"
identify -format '  %f  %wx%h  alpha:%A  %b\n' \
  assets/images/icon.png assets/images/splash-icon.png \
  assets/brand/mark-512.png assets/brand/mark-black-512.png \
  assets/brand/mark-white-512.png \
  docs/favicon-512.png docs/apple-touch-icon.png docs/favicon-32.png
