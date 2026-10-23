import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePrerequisiteAddition, validateAllPrerequisites } from './dag.ts';

test('validatePrerequisiteAddition prevents self-dependency', () => {
  const result = validatePrerequisiteAddition({}, 'topic-1', 'topic-1');
  assert.equal(result.valid, false);
  assert.equal(result.error, 'A topic cannot be a prerequisite of itself.');
});

test('validatePrerequisiteAddition allows valid acyclic dependency', () => {
  const graph = {
    'topic-1': [],
    'topic-2': ['topic-1'],
    'topic-3': ['topic-2'],
  };
  // topic-4 depends on topic-3
  const result = validatePrerequisiteAddition(graph, 'topic-4', 'topic-3');
  assert.equal(result.valid, true);
});

test('validatePrerequisiteAddition detects direct circular dependency (A->B and B->A)', () => {
  const graph = {
    'topic-2': ['topic-1'], // topic-2 depends on topic-1
  };
  // Now topic-1 tries to depend on topic-2
  const result = validatePrerequisiteAddition(graph, 'topic-1', 'topic-2', {
    'topic-1': 'Variables',
    'topic-2': 'Control Flow',
  });
  assert.equal(result.valid, false);
  assert.match(result.error || '', /circular prerequisite path/i);
});

test('validatePrerequisiteAddition detects transitive circular dependency (A->B->C and C->A)', () => {
  const graph = {
    'topic-2': ['topic-1'], // topic-2 depends on topic-1
    'topic-3': ['topic-2'], // topic-3 depends on topic-2
  };
  // topic-1 tries to depend on topic-3: creates topic-1 -> topic-3 -> topic-2 -> topic-1 cycle
  const result = validatePrerequisiteAddition(graph, 'topic-1', 'topic-3');
  assert.equal(result.valid, false);
  assert.match(result.error || '', /circular prerequisite path/i);
});

test('validateAllPrerequisites detects cycles in multi-selection', () => {
  const existingGraph = {
    'topic-b': ['topic-a'],
    'topic-c': ['topic-b'],
  };
  // If topic-a proposes to depend on topic-c, it forms a cycle
  const result = validateAllPrerequisites(existingGraph, 'topic-a', ['topic-c']);
  assert.equal(result.valid, false);

  // If topic-a depends on an independent topic-x, it is valid
  const validResult = validateAllPrerequisites(existingGraph, 'topic-a', ['topic-x']);
  assert.equal(validResult.valid, true);
});
