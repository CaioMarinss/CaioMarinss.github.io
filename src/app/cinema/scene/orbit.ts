/**
 * Rodrigues rotation of `p` around the unit `axis` by `angle` radians. The CPU twin of `orbitRot` in
 * the particle vertex shader (jsdom cannot run GLSL, so the maths is tested here). There is no
 * normalisation, so a zero axis with angle 0 returns `p` unchanged.
 */
export function orbitRotate(
  p: readonly [number, number, number],
  axis: readonly [number, number, number],
  angle: number,
): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [px, py, pz] = p;
  const [kx, ky, kz] = axis;
  const cx = ky * pz - kz * py;
  const cy = kz * px - kx * pz;
  const cz = kx * py - ky * px;
  const d = (kx * px + ky * py + kz * pz) * (1 - c);
  return [px * c + cx * s + kx * d, py * c + cy * s + ky * d, pz * c + cz * s + kz * d];
}
