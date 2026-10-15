// Same window cases as tests/test_schedule_vectors.py (Blueprint and Managed Auto).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scheduleAt} from '../../ecobee-dual-fuel-card.js';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/schedule_windows.json', import.meta.url)));
for (const c of fixture.cases) test(`card window: ${c.name}`, () => {
  const at = scheduleAt({status: 'ok', start: c.start, end: c.end, days: c.days}, fixture.time_zone, new Date(c.utc));
  assert.equal(at.policy, c.expected);
});
