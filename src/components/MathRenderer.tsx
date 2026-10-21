import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import {
  formatMathTextToLatex,
  normalizeMathBlockContent,
  repairUnbalancedMathDelimiters,
  normalizeDegrees,
  normalizeUnicodeMath,
  isPureMathString,
} from '../utils/mathDetector';

interface MathRendererProps {
  math?: string;
  text?: string;
  content?: string;
  block?: boolean;
  inline?: boolean;
  className?: string;
}

/**
 * Converts MathML markup string to clean LaTeX format for KaTeX rendering
 */
function convertMathMlToLatex(input: string): string {
  if (!input || typeof input !== 'string') return input;
  // Only process if actual XML / MathML markup tags are present
  if (!/<(?:m:oMath|math|mfrac|msup|msub|msqrt|mtext|mrow|mn|mi|mo|w:t)\b/i.test(input)) {
    return input;
  }

  let str = input;

  // Replace common MathML tags with LaTeX equivalents
  str = str
    .replace(/<mfrac>\s*<mn>([^<]+)<\/mn>\s*<mn>([^<]+)<\/mn>\s*<\/mfrac>/gi, '\\dfrac{$1}{$2}')
    .replace(/<mfrac>\s*<mi>([^<]+)<\/mi>\s*<mn>([^<]+)<\/mn>\s*<\/mfrac>/gi, '\\dfrac{$1}{$2}')
    .replace(/<mfrac>\s*<mrow>([^<]+)<\/mrow>\s*<mrow>([^<]+)<\/mrow>\s*<\/mfrac>/gi, '\\dfrac{$1}{$2}')
    .replace(/<mfrac>([\s\S]*?)<\/mfrac>/gi, (_, body) => {
      const parts = body.split(/<\/m[rnoib]>\s*<m[rnoib]>/i);
      return parts.length >= 2 ? `\\dfrac{${parts[0]}}{${parts[1]}}` : body;
    })
    .replace(/<msup>\s*<mi>([^<]+)<\/mi>\s*<mn>([^<]+)<\/mn>\s*<\/msup>/gi, '{$1}^{$2}')
    .replace(/<msup>\s*<mi>([^<]+)<\/mi>\s*<mi>([^<]+)<\/mi>\s*<\/msup>/gi, '{$1}^{$2}')
    .replace(/<msub>\s*<mi>([^<]+)<\/mi>\s*<mn>([^<]+)<\/mn>\s*<\/msub>/gi, '{$1}_{$2}')
    .replace(/<msqrt>\s*([\s\S]*?)\s*<\/msqrt>/gi, '\\sqrt{$1}')
    .replace(/<mtext>([\s\S]*?)<\/mtext>/gi, '\\text{$1}')
    .replace(/<m:oMath>([\s\S]*?)<\/m:oMath>/gi, '$$$1$$')
    .replace(/<math[\s\S]*?>([\s\S]*?)<\/math>/gi, '$$$1$$')
    // Only strip valid XML tags (starting with letter or /), never stripping mathematical inequality expressions like '< 1 or x >'
    .replace(/<\/?(?:m:[a-zA-Z]+|[a-zA-Z][a-zA-Z0-9:\-_]*)(?:\s+[^>]*?)?>/gi, '');

  return str;
}

// Common KaTeX configuration and macros for mathematical assessments
const KATEX_OPTIONS = {
  throwOnError: false,
  maxExpand: 100,
  maxSize: 500,
  trust: true,
  strict: false,
  macros: {
    '\\degree': '^{\\circ}',
    '\\textdegree': '^{\\circ}',
    '\\deg': '^{\\circ}',
    '\\ang': '^{\\circ}',
    '\\bold': '\\mathbf',
    '\\vector': '\\vec',
  },
};

function sanitizeKatexContent(input: string): string {
  if (!input) return '';
  let str = input
    .replace(/\^\{\s*\\?(?:circ|degree|textdegree|[oO])\s*\}/g, '^{\\circ}')
    .replace(/\^\{\s*o\s*\}/gi, '^{\\circ}')
    .replace(/\^[oO]\b/g, '^{\\circ}')
    .replace(/(\d+(?:\.\d+)?)\s*[°º]/g, '$1^{\\circ}')
    .replace(/([a-zA-Z\)])\s*[°º]/g, '$1^{\\circ}')
    .replace(/[°º]/g, '^{\\circ}')
    .replace(/[π𝝅𝞹𝝿𝞹𝛑Π]/g, '\\pi ')
    .replace(/\\degree\b/g, '^{\\circ}')
    .replace(/\\textdegree\b/g, '^{\\circ}')
    // Normalize Word prime superscripts e.g. {A}^{'} -> A' or (A \cup B)^{'} -> (A \cup B)'
    .replace(/\{([a-zA-Z0-9]+)\}\^\{'\}/g, "$1'")
    .replace(/\^\{'\}/g, "'")
    .replace(/\^\{\s*\\prime\s*\}/g, "'")
    // For fractional indexes kindly use slash(/) to represent the fraction instead of the normal fraction bar:
    .replace(/\^\{\s*([+\-]?)?\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}\s*\}/g, '^{$1$2/$3}')
    .replace(/\^\{\s*\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}\s*\}/g, '^{$1/$2}')
    .replace(/\^([+\-]?)?\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}/g, '^{$1$2/$3}')
    // Transform standalone \frac to \dfrac for display clarity, but NEVER inside superscripts, subscripts, matrices, or nested fractions
    .replace(/\\frac(?=\{)/g, (match, offset, fullStr) => {
      const before = fullStr.substring(0, offset);
      // Check if inside superscript or subscript
      const openSup = (before.match(/\^\{/g) || []).length;
      const openSub = (before.match(/_\{/g) || []).length;
      const closeBraces = (before.match(/\}/g) || []).length;
      if (openSup + openSub > closeBraces) return '\\frac';
      const openMatrix = (before.match(/\\begin\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix)\}/g) || []).length;
      const closeMatrix = (before.match(/\\end\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix)\}/g) || []).length;
      if (openMatrix > closeMatrix) return '\\frac';
      // Keep inner fractions in compound fractions as \frac for elegant hierarchy
      if (/\\(?:d?frac)\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*$/.test(before)) return '\\frac';
      return '\\dfrac';
    });

  return normalizeMathBlockContent(str);
}

// In-Memory KaTeX HTML string cache for O(1) instantaneous rendering
const MAX_KATEX_CACHE_SIZE = 2500;
const katexHtmlCache = new Map<string, string>();

/**
 * Retrieves pre-rendered KaTeX HTML from memory cache or generates and caches it.
 * Bypasses redundant AST token parsing and DOM tree allocations for repeated equations.
 */
export function getCachedKatexHtml(content: string, displayMode: boolean): string {
  const cacheKey = `${displayMode ? 'B:' : 'I:'}${content}`;
  const existing = katexHtmlCache.get(cacheKey);
  if (existing !== undefined) {
    return existing;
  }

  let html: string;
  try {
    html = katex.renderToString(content, {
      ...KATEX_OPTIONS,
      displayMode,
    });
  } catch {
    html = `<span class="katex-error">${content}</span>`;
  }

  if (katexHtmlCache.size >= MAX_KATEX_CACHE_SIZE) {
    // Evict oldest entries
    const iter = katexHtmlCache.keys();
    for (let i = 0; i < 250; i++) {
      const nextKey = iter.next().value;
      if (nextKey) katexHtmlCache.delete(nextKey);
      else break;
    }
  }

  katexHtmlCache.set(cacheKey, html);
  return html;
}

/**
 * Creates a configured DOM span element populated directly from the KaTeX HTML cache
 */
function createCachedKatexSpan(cleanContent: string, isBlock: boolean, customClass?: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = customClass || (isBlock
    ? 'block-katex my-1.5 overflow-x-auto overflow-y-hidden block font-math'
    : 'inline-katex px-0.5 align-baseline font-math overflow-y-hidden');
  span.innerHTML = getCachedKatexHtml(cleanContent, isBlock);
  return span;
}

const MathRendererBase: React.FC<MathRendererProps> = ({
  math,
  text,
  content,
  block = false,
  inline,
  className = '',
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const rawInput = math ?? text ?? content ?? '';
  const isDisplayBlock = inline !== undefined ? !inline : block;

  useEffect(() => {
    if (!containerRef.current) return;

    if (!rawInput || typeof rawInput !== 'string') {
      containerRef.current.innerHTML = '';
      return;
    }

    let processed = convertMathMlToLatex(rawInput);
    processed = formatMathTextToLatex(processed);

    // If any $...$ block inadvertently wraps option markers (e.g. "$A. x^2 + 1 B. 2x$"), unwrap them so KaTeX is not corrupted
    // NEVER unwrap valid LaTeX equations, functions (like P(A), n(A), f(A)), or vectors/matrices!
    processed = processed.replace(/\$([^\$]+)\$/g, (m, inner) => {
      if (/\\[a-zA-Z]+|\b(?:P|Pr|n|f|g|det)\s*\(|\\begin\{/.test(inner)) {
        return m;
      }
      if (/^[ \t]*(?:Option\s+)?[A-E]\.\s+.*[ \t]+(?:Option\s+)?[B-E]\.\s+/i.test(inner)) {
        return inner;
      }
      return m;
    });

    try {
      containerRef.current.innerHTML = '';

      // Check if content contains one or more Markdown tables
      const tableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|(?:\s*:?-+:?\s*\|)+\r?\n(?:\|[^\n]+\|\r?\n?)*)/g;
      const tables: { start: number; end: number; content: string }[] = [];
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tableRegex.exec(processed)) !== null) {
        tables.push({
          start: tMatch.index,
          end: tMatch.index + tMatch[0].length,
          content: tMatch[1].trim(),
        });
      }

      if (tables.length > 0) {
        let curIdx = 0;
        for (const tbl of tables) {
          if (tbl.start > curIdx) {
            const proseBefore = processed.substring(curIdx, tbl.start).trim();
            if (proseBefore) {
              const div = document.createElement('div');
              div.className = 'mb-2';
              renderStandardMathOrProse(div, proseBefore, isDisplayBlock);
              containerRef.current.appendChild(div);
            }
          }
          const tableElem = parseAndRenderMarkdownTable(tbl.content);
          containerRef.current.appendChild(tableElem);
          curIdx = tbl.end;
        }
        if (curIdx < processed.length) {
          const proseAfter = processed.substring(curIdx).trim();
          if (proseAfter) {
            const div = document.createElement('div');
            div.className = 'mt-2';
            renderStandardMathOrProse(div, proseAfter, isDisplayBlock);
            containerRef.current.appendChild(div);
          }
        }
        return;
      }

      renderStandardMathOrProse(containerRef.current, processed, isDisplayBlock);
    } catch {
      if (containerRef.current) {
        containerRef.current.textContent = rawInput;
      }
    }
  }, [rawInput, isDisplayBlock]);

  return <span ref={containerRef} className={`inline-element leading-relaxed whitespace-pre-line ${className}`} />;
};

export const MathRenderer = React.memo(MathRendererBase);

/**
 * Standard math and prose rendering preserving original KaTeX rules
 */
function renderStandardMathOrProse(container: HTMLElement, processed: string, isDisplayBlock: boolean) {
  const hasOptionMarker = /(?:^|\s|\d)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(processed);

  // If the input is completely pure math (formula, equation, single expression)
  if (
    !hasOptionMarker &&
    (isPureMathString(processed) ||
      (processed.startsWith('$') && processed.endsWith('$') && (processed.match(/\$/g) || []).length === 2))
  ) {
    const cleanContent = sanitizeKatexContent(
      processed.startsWith('$') && processed.endsWith('$') ? processed.slice(1, -1) : processed
    );
    try {
      const mathSpan = createCachedKatexSpan(cleanContent, isDisplayBlock);
      container.appendChild(mathSpan);
      return;
    } catch {
      // fallback to standard parsing
    }
  }

  // Check if text has inline math delimiters `$ ... $` or `$$ ... $$`
  const hasInlineDelimiters = processed.includes('$');

  if (hasInlineDelimiters) {
    // Parse mixed text and math string
    const parts = parseMixedText(processed);

    parts.forEach((part) => {
      if (part.isMath) {
        const isBlock = part.isBlock || isDisplayBlock;
        const cleanContent = sanitizeKatexContent(part.content);
        try {
          const mathSpan = createCachedKatexSpan(cleanContent, isBlock);
          container.appendChild(mathSpan);
        } catch {
          const fallbackSpan = document.createElement('span');
          fallbackSpan.textContent = part.content;
          container.appendChild(fallbackSpan);
        }
      } else {
        // Render non-math text segment cleanly, auto-rendering any embedded degree or formula tokens
        appendProseOrInlineMath(part.content, container);
      }
    });
  } else {
    const trimmed = processed.trim();
    const isPure = isPureMathString(trimmed);

    if (isPure) {
      const cleanContent = sanitizeKatexContent(processed);
      try {
        const mathSpan = createCachedKatexSpan(cleanContent, isDisplayBlock);
        container.appendChild(mathSpan);
      } catch {
        container.textContent = processed;
      }
    } else {
      // Mixed sentence or prose without delimiters - safely parse any embedded math
      appendProseOrInlineMath(processed, container);
    }
  }
}

/**
 * Parses a markdown table into a clean, accessible HTML <table> with KaTeX math rendering in cells
 */
function parseAndRenderMarkdownTable(tableText: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'my-3 overflow-x-auto w-full rounded-2xl border border-slate-300/80 shadow-2xs bg-white';

  const table = document.createElement('table');
  table.className = 'min-w-full divide-y divide-slate-200 text-xs sm:text-sm text-slate-800 text-center border-collapse';

  const rawLines = tableText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (rawLines.length === 0) return wrapper;

  const rows = rawLines.map((line) =>
    line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim())
  );

  const thead = document.createElement('thead');
  thead.className = 'bg-slate-100/90 font-bold text-slate-900 border-b border-slate-200';
  const headerTr = document.createElement('tr');

  const headers = rows[0] || [];
  headers.forEach((h) => {
    const th = document.createElement('th');
    th.className = 'px-3 py-2 sm:px-4 sm:py-2.5 border-r border-slate-200 last:border-r-0 font-bold tracking-wide text-xs text-slate-800';
    renderTableCellMath(h, th);
    headerTr.appendChild(th);
  });
  thead.appendChild(headerTr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-slate-200 bg-white';

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip separator row like |---|---|
    if (row.every((c) => /^[\-:\s]+$/.test(c))) {
      continue;
    }
    const tr = document.createElement('tr');
    tr.className = r % 2 === 0 ? 'bg-slate-50/60 hover:bg-indigo-50/30 transition-colors' : 'bg-white hover:bg-indigo-50/30 transition-colors';
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.className = 'px-3 py-2 sm:px-4 sm:py-2.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap font-medium';
      renderTableCellMath(cell, td);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

/**
 * Helper to render math or text inside a table cell
 */
function renderTableCellMath(content: string, cell: HTMLElement) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const normalized = normalizeUnicodeMath(trimmed).trim();
  const isPure = isPureMathString(normalized) || (normalized.startsWith('$') && normalized.endsWith('$'));
  if (isPure) {
    const clean = sanitizeKatexContent(normalized.startsWith('$') && normalized.endsWith('$') ? normalized.slice(1, -1) : normalized);
    const span = document.createElement('span');
    span.className = 'inline-katex font-math';
    try {
      katex.render(clean, span, { ...KATEX_OPTIONS, displayMode: false });
      cell.appendChild(span);
      return;
    } catch {}
  }

  if (normalized.includes('$')) {
    const parts = parseMixedText(normalized);
    parts.forEach((p) => {
      if (p.isMath) {
        try {
          const span = createCachedKatexSpan(sanitizeKatexContent(p.content), false, 'inline-katex font-math');
          cell.appendChild(span);
        } catch {
          const span = document.createElement('span');
          span.textContent = p.content;
          cell.appendChild(span);
        }
      } else {
        appendProseOrInlineMath(p.content, cell);
      }
    });
  } else {
    appendProseOrInlineMath(normalized, cell);
  }
}

/**
 * Renders formatted prose including bold (**bold**), italic (*italic*), underline (<u>text</u>),
 * strikethrough (~~text~~), inline images ([DIAGRAM_IMAGE:...]), and line breaks (\n).
 */
function appendFormattedProseText(proseText: string, container: HTMLElement) {
  if (!proseText) return;

  const tokenRegex = /(\[DIAGRAM_IMAGE:[^\]]+\]|\[IMAGE:[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*|<u>[^<]+<\/u>|~~[^~]+~~|\n)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(proseText)) !== null) {
    if (match.index > lastIdx) {
      container.appendChild(document.createTextNode(proseText.substring(lastIdx, match.index)));
    }

    const token = match[0];
    if (token.startsWith('[DIAGRAM_IMAGE:') || token.startsWith('[IMAGE:')) {
      const src = token.slice(token.indexOf(':') + 1, -1).trim();
      if (src && (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'))) {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'my-3 flex justify-center w-full';
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Question diagram';
        img.className = 'max-h-64 max-w-full rounded-2xl border border-slate-200 object-contain shadow-xs bg-white cursor-zoom-in';
        imgWrap.appendChild(img);
        container.appendChild(imgWrap);
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.className = 'font-bold text-slate-950';
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const em = document.createElement('em');
      em.className = 'italic font-medium';
      em.textContent = token.slice(1, -1);
      container.appendChild(em);
    } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
      const u = document.createElement('u');
      u.className = 'underline decoration-slate-400 underline-offset-2';
      u.textContent = token.slice(3, -4);
      container.appendChild(u);
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      const del = document.createElement('del');
      del.className = 'line-through text-slate-500';
      del.textContent = token.slice(2, -2);
      container.appendChild(del);
    } else if (token === '\n') {
      container.appendChild(document.createElement('br'));
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < proseText.length) {
    container.appendChild(document.createTextNode(proseText.substring(lastIdx)));
  }
}

/**
 * Safely parses any residual inline math tokens inside a prose segment
 * (such as degree notations 150^{\circ}, roots, fractions, variables) so they render with KaTeX instead of raw text.
 */
function appendProseOrInlineMath(text: string, container: HTMLElement | null) {
  if (!container || !text) return;

  const normalized = normalizeDegrees(normalizeUnicodeMath(text));
  const inlineMathPattern = /(\\begin\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix|cases|aligned)\}[\s\S]*?\\end\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix|cases|aligned)\}|\\(?:d?frac|binom)\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})|\\sqrt(?:\[[^\]]*\])?\s*\{[^{}]*\}|\\(?:int|sum|prod)(?:_\{[^{}]*\})?(?:\^\{[^{}]*\})?|\d+(?:\.\d+)?\s*\^\{\s*\\?circ\s*\}|[a-zA-Z\)]\s*\^\{\s*\\?circ\s*\}|\\(?:circ|degree|textdegree)\b|\b\d+(?:\.\d+)?\s*(?:deg|degrees)\b|\\(?:sin|cos|tan|cot|sec|csc|log|ln|exp|lim|det|pi|alpha|beta|theta|gamma|delta|lambda|sigma|omega|pm|mp|le|ge|neq|approx|infty|vec|to|rightarrow|leftarrow|leftrightarrow|forall|exists|in|notin|cap|cup|subset|subseteq|setminus|emptyset|mid|times|cdot|oplus|otimes|odot|ominus|wedge|vee|neg|sim|implies|iff)\b(?:\{[^{}]*\}|\s+[a-zA-Z0-9]+)?|(?:[a-zA-Z0-9]+|\([a-zA-Z0-9\+\-\s\/\^\{\}\\]+\))\s*\^\s*\{(?:[+\-]?(?:\\(?:d?frac)\{[^{}]+\}\{[^{}]+\}|[0-9a-zA-Z+\-\\circ\s/]+))\}|\([a-zA-Z0-9\+\-\s\/\^\{\}\\]+\)\s*\^\s*[0-9a-zA-Z+\-]+|[a-zA-Z0-9\(\)]+\^\{[0-9a-zA-Z+\-\\circ\s/]+\}|(?:\\?(?:log|ln|lim)_[0-9a-zA-Z+\-]+|(?<=\b[a-zA-Z])_[0-9a-zA-Z]+)|(?<!\b(?:year|session|academic|date|score|page|step)\s+)(?<!\d\/)\b\d{1,3}\/\d{1,3}\b(?!\/\d)|(?:\{?[a-zA-Z0-9]+\}?\^\{'\}|\([a-zA-Z0-9\s\\_^{}]*?\\(?:cap|cup|setminus)[a-zA-Z0-9\s\\_^{}]*?\)'?))/g;

  if (!inlineMathPattern.test(normalized)) {
    appendFormattedProseText(text, container);
    return;
  }

  inlineMathPattern.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineMathPattern.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      appendFormattedProseText(normalized.substring(lastIndex, match.index), container);
    }

    const mathToken = match[0];

    // Reject 4-digit academic years (e.g. 2023/2024), dates, or snake_case words (e.g. student_id)
    if (/^\d{4}\/\d{4}$/.test(mathToken) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(mathToken) || /^[a-zA-Z]{2,}_[a-zA-Z0-9]+$/.test(mathToken)) {
      appendFormattedProseText(mathToken, container);
      lastIndex = inlineMathPattern.lastIndex;
      continue;
    }

    const cleanContent = sanitizeKatexContent(mathToken);

    try {
      const mathSpan = createCachedKatexSpan(cleanContent, false);
      container.appendChild(mathSpan);
    } catch {
      const fallbackSpan = document.createElement('span');
      fallbackSpan.textContent = mathToken;
      container.appendChild(fallbackSpan);
    }

    lastIndex = inlineMathPattern.lastIndex;
  }

  if (lastIndex < normalized.length) {
    appendFormattedProseText(normalized.substring(lastIndex), container);
  }
}

interface ParsedPart {
  content: string;
  isMath: boolean;
  isBlock?: boolean;
}

function parseMixedText(text: string): ParsedPart[] {
  if (!text || typeof text !== 'string') return [];
  const repairedText = repairUnbalancedMathDelimiters(text);
  const parts: ParsedPart[] = [];

  // Regex to match $$ block $$ or $ inline $
  const regex = /(\$\$[\s\S]*?\$\$|\$(?!\$)(?:[^\$\n]|\n(?!\s*\n))+?\$)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let safetyLoop = 0;
  const maxLoops = 500;

  while ((match = regex.exec(repairedText)) !== null && safetyLoop++ < maxLoops) {
    const matchIndex = match.index;

    // Add plain text before math
    if (matchIndex > lastIndex) {
      const prose = repairedText.substring(lastIndex, matchIndex).replace(/\\text\{\s*([^{}]+?)\s*\}/g, ' $1 ');
      parts.push({
        content: prose,
        isMath: false,
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$') && matchedStr.length >= 4) {
      parts.push({
        content: matchedStr.slice(2, -2).trim(),
        isMath: true,
        isBlock: true,
      });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$') && matchedStr.length >= 2) {
      parts.push({
        content: matchedStr.slice(1, -1).trim(),
        isMath: true,
        isBlock: false,
      });
    }

    lastIndex = regex.lastIndex;

    if (match[0].length === 0 || match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  if (lastIndex < repairedText.length) {
    const prose = repairedText.substring(lastIndex).replace(/\\text\{\s*([^{}]+?)\s*\}/g, ' $1 ');
    parts.push({
      content: prose,
      isMath: false,
    });
  }

  return parts;
}

