/* --- Admin Controls --- */
const btnReveal = document.getElementById('btn-reveal');
const btnNext = document.getElementById('btn-next');
const btnReset = document.getElementById('btn-reset');

/* --- Button Handlers --- */
btnReveal.addEventListener('click', () => {
  socket.emit('admin:reveal');
});

btnNext.addEventListener('click', () => {
  socket.emit('admin:next-round');
});

btnReset.addEventListener('click', () => {
  if (confirm('Reset the entire quiz? All votes will be cleared.')) {
    socket.emit('admin:reset');
  }
});

/* --- Sync Button States --- */
function updateAdminButtons() {
  // Reveal: disabled once revealed
  btnReveal.disabled = revealed;

  // Next: enabled after reveal, but hidden on final round
  btnNext.disabled = !revealed;
  if (currentRound >= totalRounds && revealed) {
    btnNext.style.display = 'none';
  } else {
    btnNext.style.display = '';
  }
}

// Use the callback hook from client.js
window.onQuizStateChange = updateAdminButtons;

// Initial state
updateAdminButtons();
