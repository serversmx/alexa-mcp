// Offline checks for src/routines.js (no Amazon session needed). Run: npm test
import assert from 'node:assert/strict';
import { findRoutineToDelete, describeRoutine } from '../src/routines.js';

const routines = [
  {
    automationId: 'amzn1.alexa.automation.aaa',
    name: 'Light Bedtime Routine',
    status: 'ENABLED',
    triggers: [{ type: 'CustomUtterance', payload: { utterance: 'light bedtime' } }],
  },
  { automationId: 'amzn1.alexa.automation.bbb', name: 'Every Day, at 3:40 AM', status: 'ENABLED', triggers: [] },
];

// 1. Matching id + name returns the routine.
assert.equal(
  findRoutineToDelete(routines, 'amzn1.alexa.automation.aaa', 'Light Bedtime Routine'),
  routines[0]
);

// 2. Unknown id is refused.
assert.throws(
  () => findRoutineToDelete(routines, 'amzn1.alexa.automation.zzz', 'Light Bedtime Routine'),
  /No routine with automationId/
);

// 3. Right id but wrong name is refused, and the message names the real routine.
assert.throws(
  () => findRoutineToDelete(routines, 'amzn1.alexa.automation.bbb', 'Light Bedtime Routine'),
  /is named "Every Day, at 3:40 AM"/
);

// 4. Name match is exact (no case-folding or trimming).
assert.throws(() => findRoutineToDelete(routines, 'amzn1.alexa.automation.aaa', 'light bedtime routine'));
assert.throws(() => findRoutineToDelete(routines, 'amzn1.alexa.automation.aaa', 'Light Bedtime Routine '));

// 5. A non-array response from Amazon is refused.
assert.throws(() => findRoutineToDelete(undefined, 'x', 'y'), /Unexpected routine list/);
assert.throws(() => findRoutineToDelete({}, 'x', 'y'), /Unexpected routine list/);

// 6. describeRoutine summarises, with and without triggers.
assert.deepEqual(describeRoutine(routines[0]), {
  automationId: 'amzn1.alexa.automation.aaa',
  name: 'Light Bedtime Routine',
  status: 'ENABLED',
  trigger: 'CustomUtterance',
});
assert.equal(describeRoutine(routines[1]).trigger, null);

console.log('routines.test.mjs: all checks passed');
