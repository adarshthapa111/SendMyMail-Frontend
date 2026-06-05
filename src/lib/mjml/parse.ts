import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';

/**
 * MJML import parser — feature-mjml-import.
 *
 * Converts MJML XML markup into the `IMjmlNode` tree shape that our editor
 * uses natively. Because our internal tree IS MJML in object form, this is
 * a mechanical XML walk — no structural inference like an HTML→MJML
 * converter would need.
 *
 * Lossless for any MJML using standard or non-standard tags. Tags outside
 * our `blockRegistry` (e.g. mj-carousel, mj-accordion) land in the tree
 * unchanged and render as "unknown block" placeholders in the canvas; they
 * still compile correctly at send time via the backend's /getHtml.
 */

export class MjmlParseError extends Error {
  /** Line number from the browser's parsererror message, when available. */
  line?: number;
  constructor(message: string, line?: number) {
    super(message);
    this.name = 'MjmlParseError';
    this.line = line;
  }
}

/**
 * Common HTML named entities that aren't valid in strict XML. Real-world
 * MJML (mjml.io, EmailLove, Stripo exports) uses these freely because
 * MJML's own parser is HTML-permissive. We map them to numeric entities
 * so strict XML accepts them. The most common offender is `&nbsp;`.
 */
const HTML_NAMED_ENTITIES: Record<string, string> = {
  nbsp:   '&#160;',
  copy:   '&#169;',
  reg:    '&#174;',
  trade:  '&#8482;',
  mdash:  '&#8212;',
  ndash:  '&#8211;',
  hellip: '&#8230;',
  lsquo:  '&#8216;',
  rsquo:  '&#8217;',
  ldquo:  '&#8220;',
  rdquo:  '&#8221;',
  laquo:  '&#171;',
  raquo:  '&#187;',
  bull:   '&#8226;',
  middot: '&#183;',
  deg:    '&#176;',
  plusmn: '&#177;',
  times:  '&#215;',
  divide: '&#247;',
  iexcl:  '&#161;',
  iquest: '&#191;',
};

/**
 * Make real-world MJML safe for the browser's strict-XML DOMParser.
 *
 * Two normalizations:
 * 1. **Bare `&`** (not part of any entity) → `&amp;`. Fixes the very common
 *    case of unescaped `&` in URL query strings, e.g. Google Fonts
 *    `href="...&display=swap"` in `<mj-font>`.
 * 2. **Named HTML entities** (`&nbsp;`, `&copy;`, etc.) → numeric form.
 *    Strict XML rejects HTML-only named entities; the numeric equivalents
 *    are universal.
 *
 * Already-valid XML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`,
 * `&#NNN;`, `&#xHH;`) pass through unchanged.
 */
function normalizeEntities(input: string): string {
  return input.replace(/&([a-zA-Z][a-zA-Z0-9]*;?|#\d+;?|#x[0-9a-fA-F]+;?)/g, (match) => {
    // Already a valid XML entity — keep verbatim
    if (match === '&amp;' || match === '&lt;' || match === '&gt;' || match === '&quot;' || match === '&apos;') return match;
    if (/^&#\d+;$/.test(match) || /^&#x[0-9a-fA-F]+;$/.test(match)) return match;

    // Named HTML entity with a trailing `;` → swap to numeric
    const named = /^&([a-zA-Z][a-zA-Z0-9]*);$/.exec(match);
    if (named && HTML_NAMED_ENTITIES[named[1]]) return HTML_NAMED_ENTITIES[named[1]];

    // Anything else (bare `&` followed by letters/digits, or an
    // unknown named entity, or missing `;`) → escape the leading `&`
    // so XML parses. The rest of the original text stays literal.
    return '&amp;' + match.slice(1);
  });
}

/**
 * Parse MJML XML markup into an `IMjmlNode` tree.
 *
 * @throws {MjmlParseError} when the input is empty, not valid XML, doesn't
 * have an <mjml> root, or doesn't have an <mj-body> descendant.
 */
export function parseMjml(input: string): IMjmlNode {
  const trimmed = input.trim();
  if (!trimmed) throw new MjmlParseError('MJML is empty.');

  // Some exports include an XML prologue or DOCTYPE. Strip them — DOMParser
  // in 'application/xml' mode accepts the rest, and DOCTYPEs are pointless
  // for MJML anyway (it's not a DTD-validated dialect).
  let cleaned = trimmed
    .replace(/^<\?xml[^?]*\?>\s*/i, '')
    .replace(/^<!DOCTYPE[^>]*>\s*/i, '');

  // Normalize HTML entities + bare ampersands so strict-XML DOMParser
  // accepts the common real-world MJML patterns (Google Fonts URLs
  // with `&display=swap`, `&nbsp;` in copy, etc.).
  cleaned = normalizeEntities(cleaned);

  const doc = new DOMParser().parseFromString(cleaned, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    const msg = err.textContent ?? 'Could not parse as XML.';
    const lineMatch = msg.match(/line\s+(\d+)/i);
    throw new MjmlParseError(
      'Not valid XML. Check your tags are closed properly and quotes are paired.',
      lineMatch ? Number(lineMatch[1]) : undefined,
    );
  }

  const root = doc.documentElement;
  if (!root) throw new MjmlParseError('No root element found.');
  if (root.tagName.toLowerCase() !== 'mjml') {
    throw new MjmlParseError(
      `Top-level element must be <mjml>, got <${root.tagName}>.`,
    );
  }
  if (!doc.querySelector('mj-body')) {
    throw new MjmlParseError('<mj-body> is required.');
  }

  return walk(root);
}

/* MJML tags whose body is treated as a `content` string (HTML / text)
   rather than as nested IMjmlNode children. These tags can contain
   arbitrary inline HTML (`<strong>`, `<a>`, merge tags) which we preserve
   verbatim in `content` — same shape the block factories in src/blocks/*
   produce.

   Mirrors the editor's tree shape: children-bearing tags (mj-section,
   mj-column, mj-body, ...) have `children`; text-bearing tags
   (mj-text, mj-button, mj-raw, mj-style, mj-preview, mj-title) have
   `content`. */
const TEXT_BEARING_TAGS = new Set([
  'mj-text', 'mj-button', 'mj-raw', 'mj-style',
  'mj-preview', 'mj-title',
]);

/** Recursively convert an Element into an IMjmlNode. */
function walk(el: Element): IMjmlNode {
  const tagName = el.tagName.toLowerCase();
  const node: IMjmlNode = {
    tagName,
    _id: uuid(),
  };

  // Attributes
  if (el.attributes.length > 0) {
    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) {
      attrs[a.name] = a.value;
    }
    node.attributes = attrs;
  }

  // Text-bearing tag → capture innerHTML as content (preserves inline
  // HTML like <strong>, <a>, plus merge tags like {{first_name|fallback}}).
  // Don't walk DOM children as IMjmlNode children — they belong inside
  // the content string.
  if (TEXT_BEARING_TAGS.has(tagName)) {
    const inner = el.innerHTML.trim();
    if (inner) node.content = inner;
    return node;
  }

  // Container tag → walk element children. (Mutually exclusive with
  // `content` in our tree shape.)
  const elementChildren = Array.from(el.children);
  if (elementChildren.length > 0) {
    node.children = elementChildren.map(walk);
  } else {
    // Empty container or unknown leaf — capture any text content as a
    // fallback (rare; protects against odd MJML).
    const inner = el.innerHTML.trim();
    if (inner) node.content = inner;
  }

  return node;
}

/* ─── Summary helper for the import dialog's "Looks valid" affordance ─── */

export interface TreeStats {
  blocks: number;          // total non-wrapper nodes
  sections: number;
  columns: number;
  unsupported: string[];   // distinct tag names outside our visual registry
}

/* Wrappers we don't count as "blocks" in the user-visible stat —
   they're MJML structural plumbing, not editable elements. */
const WRAPPERS = new Set(['mjml', 'mj-body', 'mj-head']);

/**
 * Walk the parsed tree to produce a summary used by the import dialog
 * (block count + a "heads up: unsupported tags" list).
 *
 * @param registryTagNames the set of tag names that have a registered
 * block factory (i.e. tags we render natively in the canvas).
 */
export function summarizeTree(tree: IMjmlNode, registryTagNames: Set<string>): TreeStats {
  let blocks = 0, sections = 0, columns = 0;
  const unsupported = new Set<string>();

  function visit(n: IMjmlNode) {
    if (!WRAPPERS.has(n.tagName)) {
      blocks += 1;
      if (n.tagName === 'mj-section') sections += 1;
      if (n.tagName === 'mj-column')  columns += 1;
      // Tags only count as "unsupported" if they're content-level (not
      // mj-head children like mj-style / mj-attributes / mj-fonts which
      // we preserve but don't visually edit).
      if (n.tagName.startsWith('mj-') && !registryTagNames.has(n.tagName) && !isHeadChild(n.tagName)) {
        unsupported.add(n.tagName);
      }
    }
    n.children?.forEach(visit);
  }
  visit(tree);
  return { blocks, sections, columns, unsupported: Array.from(unsupported).sort() };
}

/* mj-head children — preserved in the tree, not visually editable, not
   flagged as "unsupported" in the user-facing affordance. */
const HEAD_CHILDREN = new Set([
  'mj-attributes', 'mj-breakpoint', 'mj-font', 'mj-html-attributes',
  'mj-preview', 'mj-raw', 'mj-style', 'mj-title',
]);
function isHeadChild(tagName: string): boolean {
  return HEAD_CHILDREN.has(tagName);
}
