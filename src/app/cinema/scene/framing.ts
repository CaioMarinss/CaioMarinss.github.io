import { SHAPE_COUNT, type ShapeSetId } from './shape-core';

export type Profile = 'desktop' | 'mobile' | 'ambient';

/** Camera shared by both renderers: vertical FOV in degrees and distance to the origin. */
export const CAMERA_FOV = 42;
export const CAMERA_Z = 7;
export const MOBILE_BREAKPOINT = 860;
export const POINTER_LERP = 0.05;
export const LAYERS_LERP = 0.08;
/** Spin impulse decay per frame (inertia after a flick) and its cap in rad/s. */
export const SPIN_DAMPING = 0.92;
export const SPIN_MAX = 6;
export const SHAPE_SEED = 20251031;
/** Strength of the life opening's orbiting clusters per device profile; the ambient layer is calmer. */
export const ORBIT_STRENGTH = { desktop: 1, mobile: 1, ambient: 0.6 } as const;

/** Per-chapter framing: where the object sits (world units) to make room for the text. */
const FRAME_X: Record<ShapeSetId, Record<Profile, readonly number[]>> = {
  home: {
    desktop: [1.55, 1.25, 1.35, -1.6, 0],
    mobile: [0, 0, 0, 0, 0],
    ambient: [0.78, 0, 0, 0, 0],
  },
  life: {
    desktop: [1.55, 1.35, 1.75, 1.6, 1.35],
    mobile: [0, 0, 0, 0, 0],
    ambient: [0.78, 0, 0, 0, 0],
  },
};
const FRAME_Y: Record<ShapeSetId, Record<Profile, readonly number[]>> = {
  home: {
    desktop: [0.05, 0.25, -0.25, 0, 0.15],
    mobile: [0.9, 0.9, 0.9, 0.7, 0.35],
    ambient: [1.28, 0, 0, 0, 0.1],
  },
  life: {
    desktop: [0.05, 0.1, 0, 0, 0],
    mobile: [0.9, 0.9, 0.9, 0.7, 0.35],
    // ambient kart: low, in the room left below the last chapter's copy
    ambient: [1.28, 0, 0, 0, -0.9],
  },
};
/**
 * Extra pitch toward the camera per chapter (rad), added to the base tilt. The life kart track lies
 * flat, so it leans forward to show its layout from any Y angle; home adds nothing.
 */
const TILT_X: Record<ShapeSetId, readonly number[]> = {
  home: [0, 0, 0, 0, 0],
  life: [0, 0, 0, 0, 0.55],
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface Pose {
  readonly x: number;
  readonly y: number;
  readonly rotX: number;
  readonly rotY: number;
}

/** Object placement for chapter progress `p` (smoothstep inside each segment), pointer and spin. */
export function framePose(
  set: ShapeSetId,
  device: Profile,
  p: number,
  time: number,
  mx: number,
  my: number,
  spinAngle: number,
): Pose {
  const ratio = p / (SHAPE_COUNT - 1);
  const k = Math.min(Math.floor(p), SHAPE_COUNT - 2);
  const f = p - k;
  const e = f * f * (3 - 2 * f);
  const tilt = lerp(TILT_X[set][k], TILT_X[set][k + 1], e);
  return {
    x: lerp(FRAME_X[set][device][k], FRAME_X[set][device][k + 1], e),
    y: lerp(FRAME_Y[set][device][k], FRAME_Y[set][device][k + 1], e),
    rotY: time * 0.05 + ratio * Math.PI * 1.6 + mx * 0.35 + spinAngle,
    rotX: 0.18 + my * 0.18 + Math.sin(ratio * Math.PI) * 0.25 + tilt,
  };
}
