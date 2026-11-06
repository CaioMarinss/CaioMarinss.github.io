import { describe, expect, it } from 'vitest';
import { framePose } from './framing';

describe('framePose', () => {
  it('places the opening shape on the right with the base tilt', () => {
    const pose = framePose('home', 'desktop', 0, 0, 0, 0, 0);
    expect(pose.x).toBeCloseTo(1.55);
    expect(pose.y).toBeCloseTo(0.05);
    expect(pose.rotY).toBeCloseTo(0);
    expect(pose.rotX).toBeCloseTo(0.18);
  });

  it('eases between chapter framings', () => {
    expect(framePose('home', 'desktop', 3, 0, 0, 0, 0).x).toBeCloseTo(-1.6);
    expect(framePose('home', 'desktop', 3.5, 0, 0, 0, 0).x).toBeCloseTo(-0.8);
    expect(framePose('home', 'mobile', 2, 0, 0, 0, 0).x).toBe(0);
  });

  it('turns with time, pointer and spin', () => {
    const base = framePose('home', 'desktop', 1, 0, 0, 0, 0).rotY;
    expect(framePose('home', 'desktop', 1, 10, 0.5, 0, 1).rotY).toBeCloseTo(base + 0.5 + 0.175 + 1);
  });
});
