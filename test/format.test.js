'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, linkify, formatText } = require('../lib/format');

describe('escapeHtml', () => {
  it('escapes < > & " \'', () => {
    assert.equal(escapeHtml('<div class="x">&\'test\'</div>'),
      '&lt;div class=&quot;x&quot;&gt;&amp;&#39;test&#39;&lt;/div&gt;');
  });

  it('preserves normal text', () => {
    assert.equal(escapeHtml('Hello world'), 'Hello world');
  });

  it('handles empty string', () => {
    assert.equal(escapeHtml(''), '');
  });

  it('handles null/undefined', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });
});

describe('linkify', () => {
  it('wraps http URLs in anchor tags', () => {
    assert.equal(
      linkify('visit http://example.com today'),
      'visit <a href="http://example.com" target="_blank" rel="noopener">http://example.com</a> today'
    );
  });

  it('wraps https URLs', () => {
    assert.equal(
      linkify('see https://example.com/path'),
      'see <a href="https://example.com/path" target="_blank" rel="noopener">https://example.com/path</a>'
    );
  });

  it('preserves non-URL text', () => {
    assert.equal(linkify('no links here'), 'no links here');
  });

  it('handles multiple URLs', () => {
    const input = 'a http://one.com b https://two.com c';
    const result = linkify(input);
    assert.ok(result.includes('href="http://one.com"'));
    assert.ok(result.includes('href="https://two.com"'));
  });
});

describe('formatText', () => {
  it('returns empty string for null/empty', () => {
    assert.equal(formatText(null), '');
    assert.equal(formatText(''), '');
    assert.equal(formatText(undefined), '');
  });

  it('wraps plain text in <p> tags', () => {
    assert.equal(formatText('Hello world'), '<p>Hello world</p>');
  });

  it('splits paragraphs on double newlines', () => {
    const result = formatText('First paragraph\n\nSecond paragraph');
    assert.equal(result, '<p>First paragraph</p><p>Second paragraph</p>');
  });

  it('converts * items to <ul>', () => {
    const result = formatText('* item one\n* item two');
    assert.ok(result.includes('<ul>'));
    assert.ok(result.includes('<li>item one</li>'));
    assert.ok(result.includes('<li>item two</li>'));
    assert.ok(result.includes('</ul>'));
  });

  it('converts - items to <ul>', () => {
    const result = formatText('- item one\n- item two');
    assert.ok(result.includes('<ul>'));
    assert.ok(result.includes('<li>item one</li>'));
    assert.ok(result.includes('</ul>'));
  });

  it('converts numbered items to <ol>', () => {
    const result = formatText('1. first\n2. second');
    assert.ok(result.includes('<ol>'));
    assert.ok(result.includes('<li>first</li>'));
    assert.ok(result.includes('<li>second</li>'));
    assert.ok(result.includes('</ol>'));
  });

  it('closes list before switching types', () => {
    const result = formatText('* bullet\n1. numbered');
    assert.ok(result.includes('</ul>'));
    assert.ok(result.includes('<ol>'));
  });

  it('escapes HTML in content', () => {
    const result = formatText('<script>alert("xss")</script>');
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('&lt;script&gt;'));
  });

  it('linkifies URLs within text', () => {
    const result = formatText('Visit https://example.com for info');
    assert.ok(result.includes('href="https://example.com"'));
  });
});
