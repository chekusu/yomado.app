/**
 * SVG path of the night-window silhouette from the app icon: a rounded top-left corner,
 * small lower corners and a crescent of radius `r` bitten out of the top-right corner,
 * centred 0.646r in from the right edge and 0.67r down from the top.
 */
export function nightWindow(
  x: number,
  y: number,
  w: number,
  h: number,
  { tl, br, r }: { tl: number; br: number; r: number },
): string {
  const cx = x + w - 0.646 * r;
  const cy = y + 0.67 * r;
  const ax = cx - Math.sqrt(r * r - (cy - y) ** 2);
  const by = cy + Math.sqrt(r * r - (x + w - cx) ** 2);
  const n = (v: number) => +v.toFixed(2);
  return (
    `M${x} ${y + tl}A${tl} ${tl} 0 0 1 ${x + tl} ${y}H${n(ax)}` +
    `A${r} ${r} 0 1 0 ${x + w} ${n(by)}V${y + h - br}` +
    `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}H${x + br}` +
    `A${br} ${br} 0 0 1 ${x} ${y + h - br}Z`
  );
}
