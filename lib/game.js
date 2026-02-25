'use strict';

const Papa = require('papaparse');

const REQUIRED_FIELDS = ['Number', 'Question', 'Option A Text', 'Option A Source', 'Option B Text', 'Option B Source'];

function parseCSV(csvContent) {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const rounds = [];
  for (const row of parsed.data) {
    const missing = REQUIRED_FIELDS.filter((f) => !row[f]);
    if (missing.length > 0) continue;
    rounds.push({
      number: parseInt(row['Number'], 10),
      question: row['Question'],
      optionA: { text: row['Option A Text'], source: row['Option A Source'] },
      optionB: { text: row['Option B Text'], source: row['Option B Source'] },
    });
  }
  return rounds;
}

function makeInitialState() {
  return {
    currentRound: 1,
    revealed: false,
    votes: { a: 0, b: 0 },
    voterChoices: { 1: {} },
    finished: false,
  };
}

function getRoundData(rounds, roundNum) {
  const r = rounds[roundNum - 1];
  if (!r) return null;
  return {
    number: r.number,
    question: r.question,
    optionA: r.optionA.text,
    optionB: r.optionB.text,
  };
}

function getRevealData(rounds, state, roundNum) {
  const r = rounds[roundNum - 1];
  if (!r) return null;
  return {
    sourceA: r.optionA.source,
    sourceB: r.optionB.source,
    votes: { ...state.votes },
  };
}

function getTotalVoters(state) {
  const roundChoices = state.voterChoices[state.currentRound] || {};
  return Object.keys(roundChoices).length;
}

function processVote(state, clientId, choice) {
  if (!clientId || !['a', 'b'].includes(choice)) return null;
  if (state.revealed) return null;

  const round = state.currentRound;
  if (!state.voterChoices[round]) state.voterChoices[round] = {};

  const prevChoice = state.voterChoices[round][clientId];
  if (prevChoice === choice) return null; // same vote, no-op

  if (prevChoice) {
    state.votes[prevChoice] = Math.max(0, state.votes[prevChoice] - 1);
  }

  state.voterChoices[round][clientId] = choice;
  state.votes[choice]++;

  return {
    updated: true,
    votes: { ...state.votes },
    totalVoters: getTotalVoters(state),
  };
}

function processReveal(state, rounds) {
  if (state.revealed) return null;

  state.revealed = true;
  const reveal = getRevealData(rounds, state, state.currentRound);
  const finished = state.currentRound === rounds.length;
  if (finished) state.finished = true;

  return { ...reveal, finished };
}

function processNextRound(state, rounds) {
  if (!state.revealed) return null;
  if (state.currentRound >= rounds.length) return null;

  state.currentRound++;
  state.revealed = false;
  state.votes = { a: 0, b: 0 };
  if (!state.voterChoices[state.currentRound]) {
    state.voterChoices[state.currentRound] = {};
  }

  return {
    round: getRoundData(rounds, state.currentRound),
    votes: { a: 0, b: 0 },
    totalVoters: 0,
    totalRounds: rounds.length,
  };
}

function processReset(state, rounds) {
  Object.assign(state, makeInitialState());

  return {
    round: getRoundData(rounds, 1),
    votes: { a: 0, b: 0 },
    totalVoters: 0,
    totalRounds: rounds.length,
  };
}

module.exports = {
  parseCSV,
  makeInitialState,
  getRoundData,
  getRevealData,
  getTotalVoters,
  processVote,
  processReveal,
  processNextRound,
  processReset,
};
