import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateProfile, scoreJob, shouldAutoApply } from '../lib/agent-core.mjs';

test('extracts a truthful candidate profile from CV text', () => {
  const p = buildCandidateProfile('Jane Doe\njane@example.com\nSkills: React, TypeScript\nhttps://portfolio.example');
  assert.equal(p.full_name, 'Jane Doe');
  assert.deepEqual(p.skills, ['React', 'TypeScript']);
  assert.equal(p.email, 'jane@example.com');
  assert.deepEqual(p.portfolio, ['https://portfolio.example']);
  assert.match(p.raw_cv_text, /Jane Doe/);
});

test('scores a job from actual candidate skills and preferences', () => {
  const p = { skills: ['React', 'TypeScript'], preferences: { roles: ['Frontend'], remote: true } };
  assert.equal(scoreJob(p, { title: 'Senior Frontend Engineer', description: 'React TypeScript', location: 'Remote' }), 100);
});

test('never auto-applies unless auto mode and threshold are satisfied', () => {
  assert.equal(shouldAutoApply(90, { mode: 'review', threshold: 80 }), false);
  assert.equal(shouldAutoApply(79, { mode: 'auto', threshold: 80 }), false);
  assert.equal(shouldAutoApply(80, { mode: 'auto', threshold: 80 }), true);
});
