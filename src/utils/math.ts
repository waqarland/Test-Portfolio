/**
 * Pure calculation utilities for head-tracking and cursor easing.
 * Decoupled from DOM for unit testing.
 */

/**
 * Maps pointer clientX relative to frame bounds into a video playback timestamp.
 * Active tracking zone is 14% to 86% across the 1440-width frame.
 */
export function mapPointerToClipTime(
  clientX: number,
  frameLeft: number,
  frameWidth: number,
  clipDuration: number
): number {
  if (frameWidth <= 0 || clipDuration <= 0) {
    return 0;
  }
  const relX = (clientX - frameLeft) / frameWidth;
  const normalized = (relX - 0.14) / (0.86 - 0.14);
  const clamped = Math.max(0, Math.min(1, normalized));
  return clamped * clipDuration;
}

/**
 * Computes an idle gaze drift when pointer hasn't moved for more than 3.5s.
 * Drifts gently side-to-side in a sine wave (±32% around middle).
 */
export function calculateIdleTargetTime(
  idleTimeMs: number,
  clipDuration: number,
  idleThresholdMs = 3500
): number {
  if (clipDuration <= 0) return 0;
  const mid = clipDuration * 0.5;
  if (idleTimeMs <= idleThresholdMs) {
    return mid;
  }
  const elapsedSec = (idleTimeMs - idleThresholdMs) / 1000;
  const sine = Math.sin(elapsedSec * ((Math.PI * 2) / 5.5));
  const amp = clipDuration * 0.32;
  return mid + sine * amp;
}

/**
 * Eases a scalar value toward target with a lerp factor.
 */
export function easeValue(current: number, target: number, factor = 0.14): number {
  return current + (target - current) * factor;
}
