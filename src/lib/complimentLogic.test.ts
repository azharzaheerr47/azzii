import test from 'node:test';
import assert from 'node:assert/strict';
import { selectNextCompliment } from './complimentLogic';

test('selectNextCompliment returns null when jar has no active compliments', () => {
  const result = selectNextCompliment([{ id: 'c1', isDeleted: true }], []);
  assert.equal(result.selected, null);
  assert.equal(result.remainingInCycleAfterDraw, 0);
});

test('selectNextCompliment cycles through all compliments without repeats before resetting', () => {
  const compliments = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const draws: { complimentId: string; cycleNumber: number }[] = [];

  const seenRound1 = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const res = selectNextCompliment(compliments, draws, () => 0);
    assert.ok(res.selected);
    assert.equal(res.cycleReset, false);
    assert.equal(res.nextCycleNumber, 1);
    assert.equal(res.remainingInCycleAfterDraw, 2 - i);
    seenRound1.add(res.selected.id);
    draws.push({ complimentId: res.selected.id, cycleNumber: res.nextCycleNumber });
  }
  assert.deepEqual(Array.from(seenRound1).sort(), ['c1', 'c2', 'c3']);

  // 4th draw resets to cycle 2 and avoids repeating the immediate last drawn ID ('c3')
  const round2First = selectNextCompliment(compliments, draws, () => 0.99, 'c3');
  assert.ok(round2First.selected);
  assert.equal(round2First.cycleReset, true);
  assert.equal(round2First.nextCycleNumber, 2);
  assert.notEqual(round2First.selected.id, 'c3');
  assert.equal(round2First.remainingInCycleAfterDraw, 2);
});

test('selectNextCompliment still works when only 1 compliment is in the jar', () => {
  const compliments = [{ id: 'only-one' }];
  const first = selectNextCompliment(compliments, [], () => 0);
  assert.equal(first.selected?.id, 'only-one');
  assert.equal(first.cycleReset, false);

  const second = selectNextCompliment(
    compliments,
    [{ complimentId: 'only-one', cycleNumber: 1 }],
    () => 0,
    'only-one',
  );
  assert.equal(second.selected?.id, 'only-one');
  assert.equal(second.cycleReset, true);
  assert.equal(second.nextCycleNumber, 2);
});
