'use strict';

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

module.exports = { escapeHtml, linkify, formatText };
