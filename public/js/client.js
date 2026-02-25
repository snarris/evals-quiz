/* --- Client ID (persists across refresh/reconnect, scoped per tab) --- */
let clientId;
try {
  clientId = sessionStorage.getItem('evals-quiz-clientId');
  if (!clientId) {
    clientId = 'client-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('evals-quiz-clientId', clientId);
  }
} catch {
  // sessionStorage unavailable (privacy mode, etc.) — use in-memory ID
  clientId = 'client-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* --- Socket Connection --- */
const isAdmin = document.body.classList.contains('admin-body');
const socketQuery = { clientId };
if (isAdmin) {
  // Read admin secret injected by server into the page
  const secretMeta = document.querySelector('meta[name="admin-secret"]');
  if (secretMeta) {
    socketQuery.adminSecret = secretMeta.content;
  }
}
const socket = io({ query: socketQuery });

/* --- DOM Elements --- */
const roundBadge = document.getElementById('round-badge');
const voterCount = document.getElementById('voter-count');
const questionEl = document.getElementById('question');
const cardA = document.getElementById('card-a');
const cardB = document.getElementById('card-b');
const contentA = document.getElementById('content-a');
const contentB = document.getElementById('content-b');
const sourceA = document.getElementById('source-a');
const sourceB = document.getElementById('source-b');
const voteBarContainer = document.getElementById('vote-bar-container');
const voteBarA = document.getElementById('vote-bar-a');
const voteBarB = document.getElementById('vote-bar-b');
const voteLabelA = document.getElementById('vote-label-a');
const voteLabelB = document.getElementById('vote-label-b');
const cardCountA = document.getElementById('card-count-a');
const cardCountB = document.getElementById('card-count-b');
const waitingMessage = document.getElementById('waiting-message');
const gameArea = document.getElementById('game-area');
const endScreen = document.getElementById('end-screen');

/* --- State --- */
let myVote = null;
let revealed = false;
let finished = false;
let currentRound = 1;
let totalRounds = 7;

/* --- Text Formatting --- */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linkify(text) {
  return text.replace(
    /(https?:\/\/[^\s<)]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );
}

function formatText(raw) {
  if (!raw) return '';

  const escaped = escapeHtml(raw);
  const lines = escaped.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bullet list item
    if (/^[*\-]\s+/.test(trimmed)) {
      if (!inUl) { html += '<ul>'; inUl = true; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += '<li>' + linkify(trimmed.replace(/^[*\-]\s+/, '')) + '</li>';
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOl) { html += '<ol>'; inOl = true; }
      if (inUl) { html += '</ul>'; inUl = false; }
      html += '<li>' + linkify(trimmed.replace(/^\d+\.\s+/, '')) + '</li>';
      continue;
    }

    // Close open lists
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }

    // Empty line = paragraph break
    if (trimmed === '') {
      continue;
    }

    // Regular paragraph
    html += '<p>' + linkify(trimmed) + '</p>';
  }

  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';

  return html;
}

/* --- Rendering --- */
function renderRound(roundData) {
  if (!roundData || !roundData.round) return;

  currentRound = roundData.round.number;
  totalRounds = roundData.totalRounds || totalRounds;

  roundBadge.textContent = `Round ${currentRound} of ${totalRounds}`;
  questionEl.textContent = roundData.round.question;
  contentA.innerHTML = formatText(roundData.round.optionA);
  contentB.innerHTML = formatText(roundData.round.optionB);

  // Reset state
  myVote = null;
  revealed = false;
  finished = false;

  // Reset card styles
  cardA.classList.remove('selected', 'disabled');
  cardB.classList.remove('selected', 'disabled');

  // Reset sources
  sourceA.classList.remove('visible', 'human', 'ai');
  sourceB.classList.remove('visible', 'human', 'ai');
  sourceA.textContent = '';
  sourceB.textContent = '';

  // Reset vote bar
  voteBarContainer.classList.remove('visible');

  // Update vote counts
  updateVotes(roundData.votes, roundData.totalVoters);

  // Show game, hide end
  gameArea.classList.remove('hidden');
  endScreen.classList.remove('visible');

  // Update waiting message
  waitingMessage.textContent = 'Select the response you think is better';

  // Fade in
  gameArea.classList.add('fade-in');
  setTimeout(() => gameArea.classList.remove('fade-in'), 300);
}

function updateVotes(votes, totalVoters) {
  if (totalVoters !== undefined) {
    voterCount.textContent = totalVoters;
  }

  if (!votes) return;

  // Always update per-card live vote counts
  const newA = votes.a === 1 ? '1 vote' : `${votes.a} votes`;
  const newB = votes.b === 1 ? '1 vote' : `${votes.b} votes`;
  if (cardCountA.textContent !== newA) {
    cardCountA.textContent = newA;
    cardCountA.classList.add('bump');
    setTimeout(() => cardCountA.classList.remove('bump'), 150);
  }
  if (cardCountB.textContent !== newB) {
    cardCountB.textContent = newB;
    cardCountB.classList.add('bump');
    setTimeout(() => cardCountB.classList.remove('bump'), 150);
  }

  // Update vote bar if visible (post-reveal)
  if (voteBarContainer.classList.contains('visible')) {
    const total = votes.a + votes.b;
    const pctA = total > 0 ? Math.round((votes.a / total) * 100) : 0;
    const pctB = total > 0 ? 100 - pctA : 0;

    voteBarA.style.width = pctA + '%';
    voteBarB.style.width = pctB + '%';
    voteBarA.textContent = total > 0 ? pctA + '%' : '';
    voteBarB.textContent = total > 0 ? pctB + '%' : '';

    voteLabelA.textContent = `Response A: ${votes.a}`;
    voteLabelB.textContent = `Response B: ${votes.b}`;
  }
}

function showSources(sourceAText, sourceBText, votes) {
  revealed = true;

  // Disable cards
  cardA.classList.add('disabled');
  cardB.classList.add('disabled');

  // Show source badges
  function applyBadge(el, source) {
    const isHuman = source.toLowerCase().includes('humans');
    el.textContent = source;
    el.classList.add('visible', isHuman ? 'human' : 'ai');
  }
  applyBadge(sourceA, sourceAText);
  applyBadge(sourceB, sourceBText);

  // Show vote bar
  voteBarContainer.classList.add('visible');
  updateVotes(votes, undefined);

  // Update waiting message
  waitingMessage.textContent = 'Waiting for admin to continue...';
}

function showEndScreen() {
  finished = true;
  // Keep game area visible so round 7 reveal (sources + vote bar) stays on screen
  endScreen.classList.add('visible');
  waitingMessage.innerHTML = '<strong>Quiz Complete!</strong> Thanks for participating.';
}

/* --- Voting --- */
function selectCard(choice) {
  if (revealed) return;

  myVote = choice;
  cardA.classList.toggle('selected', choice === 'a');
  cardB.classList.toggle('selected', choice === 'b');

  socket.emit('vote', { choice, clientId });
}

cardA.addEventListener('click', () => selectCard('a'));
cardB.addEventListener('click', () => selectCard('b'));

/* --- Hook for admin.js to react to state changes --- */
window.onQuizStateChange = null;

/* --- Socket Events --- */
socket.on('sync-state', (data) => {
  renderRound(data);

  // Restore prior vote
  if (data.myVote) {
    myVote = data.myVote;
    cardA.classList.toggle('selected', data.myVote === 'a');
    cardB.classList.toggle('selected', data.myVote === 'b');
  }

  // Restore revealed state
  if (data.revealed && data.sourceA && data.sourceB) {
    showSources(data.sourceA, data.sourceB, data.votes);
  }

  // Restore finished state
  if (data.finished) {
    if (data.revealed && data.sourceA) {
      showSources(data.sourceA, data.sourceB, data.votes);
    }
    showEndScreen();
  }

  window.onQuizStateChange?.();
});

socket.on('vote-update', (data) => {
  updateVotes(data.votes, data.totalVoters);
});

/* --- Confetti --- */
function fireConfetti() {
  if (typeof confetti !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

socket.on('reveal', (data) => {
  showSources(data.sourceA, data.sourceB, data.votes);
  fireConfetti();
  window.onQuizStateChange?.();
});

socket.on('next-round', (data) => {
  renderRound(data);
  window.onQuizStateChange?.();
});

socket.on('quiz-reset', (data) => {
  renderRound(data);
  window.onQuizStateChange?.();
});

socket.on('quiz-finished', () => {
  showEndScreen();
  window.onQuizStateChange?.();
});
