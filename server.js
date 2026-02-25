const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
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
} = require('./lib/game');

// --- Config ---
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'evals-quiz-admin-2026';

// --- CSV Loading ---
const csvPath = path.join(__dirname, 'quiz_data.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const rounds = parseCSV(csvContent);

if (rounds.length === 0) {
  console.error('No valid rounds found in CSV. Exiting.');
  process.exit(1);
}
console.log(`Loaded ${rounds.length} rounds from CSV`);

// --- Express Setup ---
const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  // Inject admin secret into the page so it stays in sync with the env var
  const html = fs.readFileSync(path.join(__dirname, 'public', 'admin.html'), 'utf-8');
  const injected = html.replace(
    '</head>',
    `  <meta name="admin-secret" content="${ADMIN_SECRET}">\n</head>`
  );
  res.type('html').send(injected);
});

// --- Game State ---
let state = makeInitialState();

// --- Socket.io ---
const io = new Server(server);

function isAdmin(socket) {
  return socket.handshake.query.adminSecret === ADMIN_SECRET;
}

io.on('connection', (socket) => {
  const clientId = socket.handshake.query.clientId;

  // Send full sync state
  const syncData = {
    round: getRoundData(rounds, state.currentRound),
    votes: { ...state.votes },
    totalVoters: getTotalVoters(state),
    revealed: state.revealed,
    finished: state.finished,
    totalRounds: rounds.length,
  };

  // Include sources if already revealed
  if (state.revealed) {
    const reveal = getRevealData(rounds, state, state.currentRound);
    syncData.sourceA = reveal.sourceA;
    syncData.sourceB = reveal.sourceB;
  }

  // Include client's prior vote for this round
  if (clientId) {
    const roundChoices = state.voterChoices[state.currentRound] || {};
    if (roundChoices[clientId]) {
      syncData.myVote = roundChoices[clientId];
    }
  }

  socket.emit('sync-state', syncData);

  // --- Vote ---
  socket.on('vote', (data) => {
    if (!data) return;
    const result = processVote(state, data.clientId, data.choice);
    if (!result) return;

    io.emit('vote-update', {
      votes: result.votes,
      totalVoters: result.totalVoters,
    });
  });

  // --- Admin: Reveal ---
  socket.on('admin:reveal', () => {
    if (!isAdmin(socket)) return;

    const result = processReveal(state, rounds);
    if (!result) return;

    io.emit('reveal', {
      sourceA: result.sourceA,
      sourceB: result.sourceB,
      votes: result.votes,
    });

    if (result.finished) {
      io.emit('quiz-finished', {});
    }
  });

  // --- Admin: Next Round ---
  socket.on('admin:next-round', () => {
    if (!isAdmin(socket)) return;

    const result = processNextRound(state, rounds);
    if (!result) return;

    io.emit('next-round', result);
  });

  // --- Admin: Reset ---
  socket.on('admin:reset', () => {
    if (!isAdmin(socket)) return;

    const result = processReset(state, rounds);
    io.emit('quiz-reset', result);
  });
});

// --- Start ---
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Participant view: http://localhost:${PORT}`);
    console.log(`Admin view: http://localhost:${PORT}/admin`);
  });
}

// Export for testing
module.exports = { app, server, io, getState: () => state, resetState: () => { state = makeInitialState(); } };
