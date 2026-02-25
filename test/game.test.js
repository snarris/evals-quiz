'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCSV,
  makeInitialState,
  getRoundData,
  getRevealData,
  getTotalVoters,
  processVote,
  processReveal,
  processNextRound,
  processReset,
} = require('../lib/game');

// --- Helpers ---

const SAMPLE_CSV = `Number,Question,Option A Text,Option A Source,Option B Text,Option B Source
1,Which is better?,Answer A1,Source A1,Answer B1,Source B1
2,Pick one,Answer A2,Source A2,Answer B2,Source B2
3,Last question,Answer A3,Source A3,Answer B3,Source B3`;

function sampleRounds() {
  return parseCSV(SAMPLE_CSV);
}

// --- Tests ---

describe('Game state', () => {
  it('makeInitialState returns correct shape', () => {
    const s = makeInitialState();
    assert.equal(s.currentRound, 1);
    assert.equal(s.revealed, false);
    assert.deepEqual(s.votes, { a: 0, b: 0 });
    assert.deepEqual(s.voterChoices, { 1: {} });
    assert.equal(s.finished, false);
  });

  it('parseCSV returns rounds from valid CSV', () => {
    const rounds = sampleRounds();
    assert.equal(rounds.length, 3);
    assert.equal(rounds[0].question, 'Which is better?');
    assert.equal(rounds[0].optionA.text, 'Answer A1');
    assert.equal(rounds[0].optionB.source, 'Source B1');
  });

  it('parseCSV skips rows with missing fields', () => {
    const csv = `Number,Question,Option A Text,Option A Source,Option B Text,Option B Source
1,Q1,A1,SA1,B1,SB1
2,Q2,,,B2,SB2`;
    const rounds = parseCSV(csv);
    assert.equal(rounds.length, 1);
  });

  it('parseCSV returns empty array for empty CSV', () => {
    const rounds = parseCSV('');
    assert.equal(rounds.length, 0);
  });

  it('getRoundData returns data for valid round', () => {
    const rounds = sampleRounds();
    const data = getRoundData(rounds, 1);
    assert.equal(data.number, 1);
    assert.equal(data.question, 'Which is better?');
    assert.equal(data.optionA, 'Answer A1');
    assert.equal(data.optionB, 'Answer B1');
  });

  it('getRoundData returns null for out of bounds', () => {
    const rounds = sampleRounds();
    assert.equal(getRoundData(rounds, 0), null);
    assert.equal(getRoundData(rounds, 99), null);
  });

  it('getRevealData returns sources and vote copy', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    state.votes = { a: 3, b: 5 };
    const data = getRevealData(rounds, state, 1);
    assert.equal(data.sourceA, 'Source A1');
    assert.equal(data.sourceB, 'Source B1');
    assert.deepEqual(data.votes, { a: 3, b: 5 });
    // Ensure it's a copy
    data.votes.a = 999;
    assert.equal(state.votes.a, 3);
  });

  it('getTotalVoters counts unique voters', () => {
    const state = makeInitialState();
    state.voterChoices[1] = { c1: 'a', c2: 'b', c3: 'a' };
    assert.equal(getTotalVoters(state), 3);
  });
});

describe('Vote processing', () => {
  it('records a valid vote', () => {
    const state = makeInitialState();
    const result = processVote(state, 'c1', 'a');
    assert.ok(result);
    assert.equal(result.votes.a, 1);
    assert.equal(result.votes.b, 0);
    assert.equal(result.totalVoters, 1);
  });

  it('rejects invalid choice', () => {
    const state = makeInitialState();
    assert.equal(processVote(state, 'c1', 'x'), null);
  });

  it('rejects missing clientId', () => {
    const state = makeInitialState();
    assert.equal(processVote(state, null, 'a'), null);
    assert.equal(processVote(state, '', 'a'), null);
  });

  it('rejects vote after reveal', () => {
    const state = makeInitialState();
    state.revealed = true;
    assert.equal(processVote(state, 'c1', 'a'), null);
  });

  it('same vote is a no-op', () => {
    const state = makeInitialState();
    processVote(state, 'c1', 'a');
    const result = processVote(state, 'c1', 'a');
    assert.equal(result, null);
    assert.equal(state.votes.a, 1);
  });

  it('vote change decrements old and increments new', () => {
    const state = makeInitialState();
    processVote(state, 'c1', 'a');
    assert.equal(state.votes.a, 1);
    assert.equal(state.votes.b, 0);

    const result = processVote(state, 'c1', 'b');
    assert.ok(result);
    assert.equal(result.votes.a, 0);
    assert.equal(result.votes.b, 1);
    assert.equal(result.totalVoters, 1);
  });
});

describe('Admin actions', () => {
  it('processReveal sets revealed and returns sources', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    state.votes = { a: 2, b: 3 };
    const result = processReveal(state, rounds);
    assert.ok(result);
    assert.equal(state.revealed, true);
    assert.equal(result.sourceA, 'Source A1');
    assert.equal(result.sourceB, 'Source B1');
    assert.equal(result.finished, false);
  });

  it('processReveal is idempotent (double reveal returns null)', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    processReveal(state, rounds);
    assert.equal(processReveal(state, rounds), null);
  });

  it('processReveal on final round sets finished flag', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    state.currentRound = 3; // last round
    const result = processReveal(state, rounds);
    assert.equal(result.finished, true);
    assert.equal(state.finished, true);
  });

  it('processNextRound advances round and resets votes', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    state.revealed = true;
    state.votes = { a: 5, b: 3 };

    const result = processNextRound(state, rounds);
    assert.ok(result);
    assert.equal(state.currentRound, 2);
    assert.equal(state.revealed, false);
    assert.deepEqual(state.votes, { a: 0, b: 0 });
    assert.equal(result.round.number, 2);
    assert.deepEqual(result.votes, { a: 0, b: 0 });
    assert.equal(result.totalRounds, 3);
  });

  it('processNextRound blocked before reveal', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    assert.equal(processNextRound(state, rounds), null);
  });

  it('processNextRound blocked on final round', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    state.currentRound = 3;
    state.revealed = true;
    assert.equal(processNextRound(state, rounds), null);
  });

  it('processReset returns to initial state', () => {
    const rounds = sampleRounds();
    const state = makeInitialState();
    state.currentRound = 3;
    state.revealed = true;
    state.votes = { a: 10, b: 5 };
    state.finished = true;

    const result = processReset(state, rounds);
    assert.equal(state.currentRound, 1);
    assert.equal(state.revealed, false);
    assert.deepEqual(state.votes, { a: 0, b: 0 });
    assert.equal(state.finished, false);
    assert.equal(result.round.number, 1);
    assert.deepEqual(result.votes, { a: 0, b: 0 });
    assert.equal(result.totalRounds, 3);
  });
});
