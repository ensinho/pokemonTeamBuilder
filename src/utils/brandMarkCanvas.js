/**
 * The site's mark in a share image (2026-11-15, Enzo: "ajustar o ícone para
 * não ter o fundo redondo assim desalinhado… só o ícone alinhadinho").
 *
 * `logo-mark.webp` and `logo-mascot-256.png` are the app icon itself — a
 * rounded square with transparent corners — so it is drawn whole, as it
 * is, at the size and place the layout gives it. Every share image used to
 * sit it on a translucent disc and clip it to a circle: the disc's edge and
 * the square's corners never lined up, and the mark looked off-centre.
 *
 * Callers align `y` and `size` to the text block beside it (its cap height
 * to its last baseline), so the icon and the words read as one row.
 */
export function drawBrandMark(ctx, img, x, y, size) {
    if (!img) return;
    ctx.drawImage(img, x, y, size, size);
}
