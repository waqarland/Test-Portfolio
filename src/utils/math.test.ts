import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPointerToClipTime, calculateIdleTargetTime, easeValue } from './math.ts';

test('mapPointerToClipTime clamps left boundary <= 14% to 0s', () => {
  const duration = 5.04;
  const frameWidth = 1440;
  const frameLeft = 0;

  // At or below 14% (14% of 1440 = 201.6)
  assert.equal(mapPointerToClipTime(201.6, frameLeft, frameWidth, duration), 0);
  assert.equal(mapPointerToClipTime(50, frameLeft, frameWidth, duration), 0);
  assert.equal(mapPointerToClipTime(-100, frameLeft, frameWidth, duration), 0);
});

test('mapPointerToClipTime clamps right boundary >= 86% to max duration', () => {
  const duration = 5.04;
  const frameWidth = 1440;
  const frameLeft = 0;

  // At or above 86% (86% of 1440 = 1238.4)
  assert.equal(mapPointerToClipTime(1238.4, frameLeft, frameWidth, duration), duration);
  assert.equal(mapPointerToClipTime(1400, frameLeft, frameWidth, duration), duration);
});

test('mapPointerToClipTime maps center (50%) to midpoint duration', () => {
  const duration = 5.04;
  const frameWidth = 1440;
  const frameLeft = 0;

  const result = mapPointerToClipTime(720, frameLeft, frameWidth, duration);
  // (0.50 - 0.14) / 0.72 = 0.36 / 0.72 = 0.5
  assert.ok(Math.abs(result - duration * 0.5) < 1e-6);
});

test('calculateIdleTargetTime stays in center when idle under threshold', () => {
  const duration = 5.04;
  assert.equal(calculateIdleTargetTime(1000, duration, 3500), duration * 0.5);
  assert.equal(calculateIdleTargetTime(3500, duration, 3500), duration * 0.5);
});

test('calculateIdleTargetTime oscillates within ±32% amplitude after threshold', () => {
  const duration = 5.04;
  const mid = duration * 0.5;
  const amp = duration * 0.32;

  // Quarter cycle after threshold: 3500 + 1375ms (5.5s / 4)
  const quarterCycle = calculateIdleTargetTime(3500 + 1375, duration, 3500);
  assert.ok(Math.abs(quarterCycle - (mid + amp)) < 0.05);

  // Three-quarter cycle: 3500 + 4125ms
  const threeQuarter = calculateIdleTargetTime(3500 + 4125, duration, 3500);
  assert.ok(Math.abs(threeQuarter - (mid - amp)) < 0.05);
});

test('easeValue interpolates with factor correctly', () => {
  const eased = easeValue(0, 10, 0.14);
  assert.ok(Math.abs(eased - 1.4) < 1e-9);
});
