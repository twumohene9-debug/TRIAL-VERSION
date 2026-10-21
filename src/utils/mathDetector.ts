/**
 * Advanced Utility for detecting, parsing, and converting MS Word OMATH XML,
 * MathML, Unicode math symbols, and plain text equations into LaTeX for KaTeX rendering.
 *
 * Guarantees:
 * 1. Normal English prose, instructions, options, and writeups remain clean, natural typography.
 * 2. Mathematical equations, formulas, fractions, powers, roots, variables, and symbols are converted to LaTeX in $...$.
 * 3. Prevents English words, options, and question sentences from rendering in italicized math typography.
 */

/**
 * Helper to get namespace-agnostic local tag name in lowercase
 */
function getLocalName(elem: Element | null | undefined): string {
  if (!elem) return '';
  return (elem.localName || (elem.nodeName || '').split(':').pop() || '').toLowerCase();
}

/**
 * Helper to get attribute value checking both namespaced and non-namespaced names
 */
function getAttr(elem: Element | null | undefined, attrNames: string[]): string {
  if (!elem) return '';
  for (const name of attrNames) {
    if (elem.hasAttribute(name)) return elem.getAttribute(name) || '';
    // Check with namespace prefix variants
    const stripped = name.split(':').pop() || '';
    for (let i = 0; i < elem.attributes.length; i++) {
      const attr = elem.attributes[i];
      const attrLocal = (attr.localName || attr.name.split(':').pop() || '').toLowerCase();
      if (attrLocal === stripped.toLowerCase()) {
        return attr.value || '';
      }
    }
  }
  return '';
}

/**
 * Finds all direct child elements matching any of the given tag names (namespace-agnostic)
 */
function findAllDirectChildren(node: Element | null | undefined, tagNames: string[]): Element[] {
  if (!node || !node.childNodes) return [];
  const lowerTags = tagNames.map((t) => t.toLowerCase().replace(/^[a-z0-9]+:/, ''));
  const matches: Element[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as Element;
    if (child && child.nodeType === 1) {
      const name = getLocalName(child);
      if (lowerTags.includes(name)) {
        matches.push(child);
      }
    }
  }
  return matches;
}

/**
 * Finds the first direct child element matching any of the given tag names (namespace-agnostic)
 */
function findDirectChild(node: Element | null | undefined, tagNames: string[]): Element | null {
  if (!node || !node.childNodes) return null;
  const lowerTags = tagNames.map((t) => t.toLowerCase().replace(/^[a-z0-9]+:/, ''));
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as Element;
    if (child && child.nodeType === 1) {
      const name = getLocalName(child);
      if (lowerTags.includes(name)) {
        return child;
      }
    }
  }
  return null;
}

/**
 * Safe descendant element query supporting standard browser DOM, XMLDOM, and custom DOM implementations
 */
function safeQuerySelectorAll(node: Element | null | undefined, tagNames: string[]): Element[] {
  if (!node) return [];
  const results: Element[] = [];
  const cleanTags = tagNames.map((t) => t.toLowerCase().replace(/^[a-z0-9]+:/, ''));

  if (typeof (node as any).querySelectorAll === 'function') {
    try {
      const selector = tagNames.map(t => t.replace(':', '\\:')).join(', ') + ', ' + tagNames.join(', ');
      const found = (node as any).querySelectorAll(selector);
      if (found && found.length > 0) return Array.from(found);
    } catch (e) {}
  }

  // XMLDOM or fallback recursive walk
  function walk(curr: Element) {
    if (!curr || !curr.childNodes) return;
    for (let i = 0; i < curr.childNodes.length; i++) {
      const child = curr.childNodes[i] as Element;
      if (child && child.nodeType === 1) {
        const local = getLocalName(child);
        if (cleanTags.includes(local) && !results.includes(child)) {
          results.push(child);
        }
        walk(child);
      }
    }
  }
  walk(node);
  return results;
}

function safeQuerySelector(node: Element | null | undefined, tagNames: string[]): Element | null {
  if (!node) return null;
  const all = safeQuerySelectorAll(node, tagNames);
  return all.length > 0 ? all[0] : null;
}

/**
 * Comprehensive Symbol lookup table for Microsoft Word Symbol & Wingdings font codes
 */
const WORD_SYMBOL_MAP: Record<string, string> = {
  // Degrees
  'b0': '°', 'ba': '°', '00b0': '°', 'f0b0': '°', '00ba': '°',
  // Basic Operators
  'b1': ' ± ', '00b1': ' ± ', 'f0b1': ' ± ',
  'd7': ' × ', '00d7': ' × ', 'f0b4': ' × ', 'f0d7': ' × ',
  'f7': ' ÷ ', '00f7': ' ÷ ', 'f0b8': ' ÷ ', 'f0f7': ' ÷ ',
  '2217': ' ∗ ', 'f02a': ' ∗ ', '002a': ' ∗ ',
  '2218': ' ∘ ', 'f0b0_circ': ' ∘ ',
  '2022': ' • ', 'f0b7': ' • ',
  // Binary & Circled Operations
  '2295': ' ⊕ ', 'f0c5': ' ⊕ ', 'f02b': ' ⊕ ',
  '2297': ' ⊗ ', 'f0c4': ' ⊗ ',
  '2299': ' ⊙ ',
  '2296': ' ⊖ ',
  // Relations
  '2264': ' ≤ ', 'f0a3': ' ≤ ',
  '2265': ' ≥ ', 'f0b3': ' ≥ ',
  '2260': ' ≠ ', 'f0b9': ' ≠ ',
  '2248': ' ≈ ', 'f0bb': ' ≈ ',
  '2261': ' ≡ ', 'f0ba_equiv': ' ≡ ',
  '221d': ' ∝ ', 'f0a1': ' ∝ ',
  // Sets & Logic
  '2208': ' ∈ ', 'f0ce': ' ∈ ',
  '2209': ' ∉ ', 'f0cf': ' ∉ ',
  '2282': ' ⊂ ', 'f0cc': ' ⊂ ',
  '2286': ' ⊆ ', 'f0cd': ' ⊆ ',
  '2284': ' ⊄ ',
  '222a': ' ∪ ', 'f0c8': ' ∪ ',
  '2229': ' ∩ ', 'f0c7': ' ∩ ',
  '2205': ' ∅ ', 'f0c6': ' ∅ ',
  '2200': ' ∀ ', 'f022': ' ∀ ',
  '2203': ' ∃ ', 'f024': ' ∃ ',
  // Calculus, Vectors, Angles
  '221a': ' √ ', 'f0d6': ' √ ',
  '222b': ' ∫ ', 'f0d1': ' ∫ ',
  '2211': ' ∑ ', 'f0e5': ' ∑ ',
  '220f': ' ∏ ', 'f0d5': ' ∏ ',
  '221e': ' ∞ ', 'f0a5': ' ∞ ',
  '2202': ' ∂ ', 'f0b6': ' ∂ ',
  '2207': ' ∇ ', 'f0d1_nabla': ' ∇ ',
  '2220': ' ∠ ', 'f0d0': ' ∠ ',
  '22a5': ' ⊥ ', 'f05e': ' ⊥ ',
  '2225': ' ∥ ',
  // Arrows
  '2192': ' → ', 'f0ae': ' → ',
  '2190': ' ← ', 'f0ac': ' ← ',
  '2194': ' ↔ ', 'f0ab': ' ↔ ',
  '21d2': ' ⇒ ', 'f0de': ' ⇒ ',
  '21d4': ' ⇔ ', 'f0db': ' ⇔ ',
  '2191': ' ↑ ',
  '2193': ' ↓ ',
  // Greek Letters (Lowercase)
  '03b1': ' α ', 'f061': ' α ',
  '03b2': ' β ', 'f062': ' β ',
  '03b3': ' γ ', 'f067': ' γ ',
  '03b4': ' δ ', 'f064': ' δ ',
  '03b5': ' ε ', 'f065': ' ε ',
  '03b6': ' ζ ', 'f07a': ' ζ ',
  '03b7': ' η ', 'f068': ' η ',
  '03b8': ' θ ', 'f071': ' θ ',
  '03b9': ' ι ', 'f069': ' ι ',
  '03ba': ' κ ', 'f06b': ' κ ',
  '03bb': ' λ ', 'f06c': ' λ ',
  '03bc': ' μ ', 'f06d': ' μ ',
  '03bd': ' ν ', 'f06e': ' ν ',
  '03be': ' ξ ', 'f078': ' ξ ',
  '03c0': ' π ', 'f070': ' π ', 'f050': ' π ',
  '03c1': ' ρ ', 'f072': ' ρ ',
  '03c3': ' σ ', 'f073': ' σ ',
  '03c4': ' τ ', 'f074': ' τ ',
  '03c6': ' φ ', 'f066': ' φ ',
  '03c8': ' ψ ', 'f079': ' ψ ',
  '03c9': ' ω ', 'f077': ' ω ',
  // Greek Letters (Uppercase)
  '0393': ' Γ ', 'f047': ' Γ ',
  '0394': ' Δ ', 'f044': ' Δ ',
  '0398': ' Θ ', 'f051': ' Θ ',
  '039b': ' Λ ', 'f04c': ' Λ ',
  '039e': ' Ξ ', 'f058': ' Ξ ',
  '03a0': ' Π ',
  '03a3': ' Σ ', 'f053': ' Σ ',
  '03a6': ' Φ ', 'f046': ' Φ ',
  '03a8': ' Ψ ', 'f059': ' Ψ ',
  '03a9': ' Ω ', 'f057': ' Ω ',
};

function resolveWordSymbolChar(charCode: string): string {
  if (!charCode) return '';
  const clean = charCode.toLowerCase().trim();
  if (WORD_SYMBOL_MAP[clean]) return WORD_SYMBOL_MAP[clean];

  // Try suffix
  for (const [key, val] of Object.entries(WORD_SYMBOL_MAP)) {
    if (clean.endsWith(key) || key.endsWith(clean)) {
      return val;
    }
  }

  // Unicode hex fallback
  try {
    const cp = parseInt(clean, 16);
    if (!isNaN(cp) && cp > 31 && cp < 0xf000) {
      return String.fromCharCode(cp);
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Splits a text paragraph that contains inline options (e.g. "What is (x+2)^3 ? A. ... B. ... C. ... D. ...")
 * into distinct lines: the question stem on line 1, followed by each option on its own line.
 */
export function separateInlineOptions(text: string): string[] {
  if (!text || !text.trim()) return [];

  const trimmed = text.trim();

  // 1:1 length-preserving masking of math blocks ($...$ and $$...$$) and function calls (P(...), n(...), f(...))
  // Characters inside math are converted to spaces so indices remain strictly 1:1 with trimmed
  const maskedChars = trimmed.split('');
  let inDoubleMath = false;
  let inSingleMath = false;

  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '$') {
      if (trimmed[i + 1] === '$' && !inSingleMath) {
        maskedChars[i] = ' ';
        maskedChars[i + 1] = ' ';
        inDoubleMath = !inDoubleMath;
        i++;
        continue;
      } else if (!inDoubleMath) {
        maskedChars[i] = ' ';
        inSingleMath = !inSingleMath;
        continue;
      }
    }
    if (inDoubleMath || inSingleMath) {
      maskedChars[i] = ' ';
    }
  }

  // Also mask probability, set function calls, coordinates, and matrix tokens e.g. P(A), n(A), f(A), (A, B)
  const maskedString = maskedChars.join('').replace(
    /\b(?:P|Pr|n|f|g|h|sin|cos|tan|log|ln|det|dim|ker|vec)\s*\([^)]+\)/gi,
    (m) => ' '.repeat(m.length)
  );

  // Look for option markers:
  // Delimiters: A., B., C., D., E. or Option A, Option B
  // Strictly uppercase [A-E] to prevent false matches with words ending in 'e.', 'a.', etc.
  // Parenthesized: (A), (B), (C), (D), (E) or [A], [B] ONLY when not followed by math relations (=, <, >, \le, \ge, \in, \cup, \cap, +, -)
  const optRegex = /(?:^|(?<=[\s\t\n\r|([,;:~]))(?:\*|\[x\]|\(correct\)\s*)?(?:(?:Option\s+)?(?:\(([A-E])\)|\[([A-E])\])(?!\s*(?:=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-))|(?:Option\s+)?([A-E])[\.\:\-]|(?<!\()([A-E])\)(?!\s*(?:=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-)))(?=\s|$|[^a-zA-Z0-9])/g;
  const matches: { index: number; length: number; letter: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = optRegex.exec(maskedString)) !== null) {
    const letter = (m[1] || m[2] || m[3] || m[4]).toUpperCase();
    matches.push({
      index: m.index,
      length: m[0].length,
      letter,
    });
  }

  // Need at least 2 option markers (e.g. A and B) to qualify as an inline option set
  if (matches.length < 2) {
    return [trimmed];
  }

  // Search for the longest / optimal sequence of A -> B -> C -> D -> E
  let bestSeq: { index: number; length: number; letter: string }[] = [];

  for (let aIdx = 0; aIdx < matches.length; aIdx++) {
    if (matches[aIdx].letter !== 'A') continue;

    const seq: { index: number; length: number; letter: string }[] = [matches[aIdx]];
    let nextExpected = 'B';

    for (let j = aIdx + 1; j < matches.length; j++) {
      if (matches[j].letter === nextExpected) {
        seq.push(matches[j]);
        if (nextExpected === 'B') nextExpected = 'C';
        else if (nextExpected === 'C') nextExpected = 'D';
        else if (nextExpected === 'D') nextExpected = 'E';
        else if (nextExpected === 'E') break;
      }
    }

    if (seq.length > bestSeq.length) {
      bestSeq = seq;
    } else if (seq.length === bestSeq.length && seq.length >= 2) {
      // If equal length, prefer the sequence appearing closer to the end of the question block
      bestSeq = seq;
    }
  }

  if (bestSeq.length < 2) {
    return [trimmed];
  }

  const result: string[] = [];
  const stem = trimmed.substring(0, bestSeq[0].index).trim();
  if (stem) {
    result.push(stem);
  }

  for (let i = 0; i < bestSeq.length; i++) {
    const cur = bestSeq[i];
    const nextStart = i + 1 < bestSeq.length ? bestSeq[i + 1].index : trimmed.length;
    let optContent = trimmed.substring(cur.index, nextStart).trim();

    // If this is the last option in the sequence, check if an attached subsequent question starts inside it
    if (i === bestSeq.length - 1) {
      const nextQMatch = optContent.match(
        /\s+(?=(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*[1-9]\d{0,3}[\.\:\)\s\-]?|\(?[1-9]\d{0,3}\)?\s*[\)\:\-\—\–\t/]|\[[1-9]\d{0,3}\]|\b[1-9]\d{0,3}\s*\.(?!\d)|\b[1-9]\d{0,3}\s+(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If|Given|Consider|Express|Identify|State|Show)\b))/i
      );
      if (nextQMatch && nextQMatch.index !== undefined && nextQMatch.index > 0) {
        const trueOpt = optContent.substring(0, nextQMatch.index).trim();
        const trailingQuestionText = optContent.substring(nextQMatch.index).trim();
        if (trueOpt) result.push(trueOpt);
        if (trailingQuestionText) {
          const subParts = separateInlineOptions(trailingQuestionText);
          subParts.forEach((p) => result.push(p));
        }
        continue;
      }
    }

    if (optContent) {
      result.push(optContent);
    }
  }

  return result.length > 0 ? result : [trimmed];
}

/**
 * Checks if a string line is an examination header, letterhead, instruction, regulation, or administrative field.
 * Used during Word document extraction to avoid prefixing question numbers to instructions or treating instructions as questions.
 */
export function isInstructionOrPreambleText(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;

  // If the line is an option (e.g. A. ... or (B) ...), it is NOT an instruction
  if (/^[A-E][\.\)\:\-\s]/i.test(trimmed) || /^\([A-E]\)/i.test(trimmed) || /^\[[A-E]\]/i.test(trimmed)) {
    return false;
  }

  // Strip leading numbers or bullets to inspect the actual semantic content
  const cleaned = trimmed
    .replace(/^(?:(?:SECTION|PART)\s*[^:\n]+[:\-\s]*)?(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*\d+[\.\:\)\-\s\t]*/i, '')
    .replace(/^\(?\d+\)?\s*[\.\)\:\-\—\–\t/]\s*/i, '')
    .replace(/^[\-•*]\s*/, '')
    .trim();

  const lower = cleaned.toLowerCase();
  if (!lower) return false;

  // Strict check: if line is an explicit mathematical problem statement, it is a question
  if (
    /[=<>≤≥≠≈±√∫∑⊕⊗⊙⊖]|\b(?:solve\s+for|evaluate\s+the|calculate\s+the|simplify\s+the|find\s+the\s+value|differentiate|integrate|factorize|expand\s+and\s+simplify|which\s+of\s+the\s+following|what\s+is\s+the\s+value)\b/i.test(
      lower
    ) &&
    !/(?:answer|attempt|instructions?|directions?|regulations?|each\s+question)\b/i.test(lower)
  ) {
    return false;
  }

  // Specific regex checks for examination metadata and candidate instructions
  if (
    /^(?:instructions?|directions?|regulations?|general\s+instructions?|notes?|notice|important|paper\s*[1-3]|section\s*[a-z0-9]+|part\s*[a-z0-9]+)\b[:\-\s]*/i.test(
      cleaned
    )
  ) {
    return true;
  }

  if (
    /^(?:time\s+allowed|duration|total\s+marks?|maximum\s+marks?|full\s+marks?|class|grade|subject|date|school|academic\s+year|term|semester)\b[:\-\s]*/i.test(
      cleaned
    )
  ) {
    return true;
  }

  if (
    /^(?:candidate\s+name|candidate\s+number|name\s+of\s+candidate|index\s+number|centre\s+number|center\s+number|signature|date\s+of\s+exam)\b[:\-\s]*/i.test(
      cleaned
    )
  ) {
    return true;
  }

  if (
    /(?:answer|attempt)\s+(?:all|the|any\s+\d+|both)\s+(?:questions?|items?|problems?)/i.test(
      lower
    )
  ) {
    return true;
  }

  if (
    /(?:four|4)\s+options?\s+(?:are\s+given|lettered\s+a\s+to\s+[de]|labeled\s+a\s+to\s+[de])/i.test(
      lower
    ) ||
    /options?\s+lettered\s+a\s+(?:to|through)\s+[de]/i.test(lower)
  ) {
    return true;
  }

  if (
    /each\s+question\s+(?:carries|is\s+followed\s+by|has)/i.test(lower) ||
    /(?:all|each)\s+questions?\s+carry\s+equal\s+marks/i.test(lower) ||
    /carries\s+equal\s+marks/i.test(lower) ||
    /\bequal\s+marks\b/i.test(lower)
  ) {
    return true;
  }

  if (
    /(?:use|using)\s+(?:2b|hb)?\s*pencil/i.test(lower) ||
    /shade\s+(?:the\s+box|the\s+circle|the\s+oval|your\s+answer)/i.test(lower) ||
    /erase\s+(?:the\s+old\s+mark|completely)/i.test(lower)
  ) {
    return true;
  }

  if (
    /do\s+not\s+(?:open|turn|start|write)/i.test(lower) ||
    /calculators?\s+(?:are\s+not|should\s+not|may\s+not|are\s+permitted|cannot)/i.test(lower) ||
    /electronic\s+calculators/i.test(lower) ||
    /(?:mathematical\s+tables?|four[- ]figure\s+tables?|4[- ]figure\s+tables?|logarithm\s+tables?|statistical\s+tables?)/i.test(lower) ||
    /(?:may\s+be\s+used\s+in\s+any\s+question|tables?\s+may\s+be\s+used|tables?\s+are\s+provided)/i.test(lower) ||
    /(?:all\s+mathematical\s+expressions|standardi[sz]ed\s+latex|katex\s+notation|latex\s+notation|expressions\s+are\s+in)/i.test(lower) ||
    /^(?:year\s+\d+|grade\s+\d+|form\s+\d+|class\s+\d+|shs\s+\d+|jhs\s+\d+)?\s*(?:additional\s+mathematics|elective\s+mathematics|core\s+mathematics|general\s+mathematics|further\s+mathematics|pure\s+mathematics|applied\s+mathematics)\b/i.test(lower) ||
    /(?:additional\s+mathematics|elective\s+mathematics|core\s+mathematics|further\s+mathematics)\s*$/i.test(lower) ||
    /(?:formula\s+sheets?|formulae\s+sheets?|list\s+of\s+formulae|mathematical\s+formulae?)/i.test(lower) ||
    /(?:all\s+working\s+must\s+be\s+shown|credit\s+will\s+be\s+given|rough\s+work\s+(?:must|may)|spaces?\s+provided)/i.test(lower)
  ) {
    return true;
  }

  if (
    /read\s+(?:the\s+following|carefully|all\s+instructions)/i.test(lower) ||
    /this\s+paper\s+(?:consists\s+of|contains)\s+\d+\s+questions/i.test(lower) ||
    /there\s+are\s+\d+\s+questions/i.test(lower) ||
    /give\s+only\s+one\s+answer\s+to\s+each\s+question/i.test(lower) ||
    /choose\s+the\s+correct\s+(?:option|answer)/i.test(lower) ||
    /find\s+the\s+correct\s+option\s+for\s+each\s+question/i.test(lower) ||
    /diagram\s+not\s+drawn\s+to\s+scale/i.test(lower) ||
    /all\s+diagrams\s+are\s+not\s+drawn\s+to\s+scale/i.test(lower) ||
    /not\s+drawn\s+to\s+scale/i.test(lower) ||
    /(?:end\s+of\s+(?:paper|questions?|test|section|examination)|good\s+luck|turn\s+over|\[turn\s+over\])\b/i.test(
      lower
    )
  ) {
    return true;
  }

  // Institutional bodies & examination boards
  if (
    /^(?:ministry\s+of\s+education|department\s+of\s+education|west\s+african\s+examinations\s+council|waec|wassce|national\s+examinations?\s+council|cambridge|edexcel|examination\s+board|high\s+school|senior\s+high\s+school|college|academy)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Parses Word .docx document.xml content to convert <m:oMath> equation elements into LaTeX strings wrapped in $...$.
 * Leaves regular Word text runs (<w:r>) as standard readable text.
 */
export function convertWordXmlToLatex(xmlString: string): string {
  if (!xmlString || typeof xmlString !== 'string') return '';

  try {
    let parser: any;
    if (typeof DOMParser !== 'undefined') {
      parser = new DOMParser();
    } else {
      try {
        // Fallback for Node.js / SSR / Vitest environment
        const { DOMParser: XmlDomParser } = require('@xmldom/xmldom');
        parser = new XmlDomParser();
      } catch (e) {
        return fallbackRegexWordXml(xmlString);
      }
    }
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Find the body element if present, or search top-level elements
    const bodyElem = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.getElementsByTagName('body')[0] || xmlDoc.documentElement;
    const resultParagraphs: string[] = [];
    let listLevel0Counter = 0;
    let listLevel1Counter = 0;
    let lastListNumId = '';
    let globalQuestionCounter = 0;

    // Collect all top-level elements: paragraphs <w:p> and tables <w:tbl>
    // Traverse container elements such as <w:sdt>, <w:sdtContent>, <w:txbxContent>
    function traverseBlocks(container: Element) {
      if (!container || !container.childNodes) return;

      Array.from(container.childNodes).forEach((node) => {
        if (node.nodeType !== 1) return;
        const elem = node as Element;
        const local = getLocalName(elem);

        // Ignore tracked deletions
        if (local === 'del' || local === 'commentrange' || local === 'movefrom') {
          return;
        }

        if (local === 'p') {
          let pText = processParagraphChildren(elem);
          if (pText && pText.trim()) {
            pText = pText.trim();

            // Unify mixed fractions: e.g. "7 $\dfrac{5}{8}$" or "7 $\frac{5}{8}$" -> "$7\,\dfrac{5}{8}$"
            // This prevents the integer from getting severed from the fraction or triggering a false question boundary
            // Strictly avoids firing when preceded by parentheses or followed by power/operators
            pText = pText.replace(/(?<![\(\^])(\b[1-9]\d{0,3})\s+\$(\\(?:d?frac)\{[^{}]+\}\{[^{}]+\})\$(?!\s*[\)\^\+\-\*\/=])/g, '$$$1\\,$2$');

            const isInstruction = isInstructionOrPreambleText(pText);

            // Check for Word List Numbering <w:numPr>
            let listPrefix = '';
            const numPr = findDirectChild(findDirectChild(elem, ['ppr', 'w:ppr']), ['numpr', 'w:numpr']) || safeQuerySelector(elem, ['w:numPr', 'numPr']);
            
            // Only apply list numbering if the paragraph is NOT an instruction / regulation header
            if (numPr && !isInstruction) {
              const ilvlElem = safeQuerySelector(numPr, ['w:ilvl', 'ilvl']);
              const numIdElem = safeQuerySelector(numPr, ['w:numId', 'numId']);
              const ilvl = ilvlElem ? (getAttr(ilvlElem, ['w:val', 'val']) || '0') : '0';
              const numId = numIdElem ? (getAttr(numIdElem, ['w:val', 'val']) || '') : '';

              if (numId !== lastListNumId) {
                lastListNumId = numId;
                listLevel1Counter = 0;
              }

              if (ilvl === '0') {
                listLevel0Counter++;
                globalQuestionCounter++;
                listLevel1Counter = 0;
                const currentQ = Math.max(listLevel0Counter, globalQuestionCounter);
                listPrefix = `${currentQ}. `;
              } else if (ilvl === '1' || parseInt(ilvl, 10) >= 1) {
                const optLetters = ['A', 'B', 'C', 'D', 'E'];
                const letter = optLetters[listLevel1Counter % optLetters.length] || 'A';
                listLevel1Counter++;
                listPrefix = `${letter}. `;
              }
            }

            // Only prepend listPrefix if text does not already start with a number or option marker
            if (listPrefix && !isInstruction && !/^(?:\d+[\.\)\:\-]|[A-E][\.\)\:\-]|\([A-E0-9]+\)|\[[A-E0-9]+\]|SECTION|INSTRUCTION|PART|QUESTION)/i.test(pText)) {
              pText = `${listPrefix}${pText}`;
            }

            // Separate inline options (e.g. "Question stem? A. opt1 B. opt2 C. opt3 D. opt4") into discrete lines
            const separatedLines = separateInlineOptions(pText);
            separatedLines.forEach((line) => {
              if (line && line.trim()) {
                resultParagraphs.push(line.trim());
              }
            });
          }
        } else if (local === 'tbl') {
          // Process Word Table: check if table is an option grid, question layout table, or a standard data table
          const rows = Array.from(elem.getElementsByTagName('w:tr')).length > 0
            ? Array.from(elem.getElementsByTagName('w:tr'))
            : Array.from(elem.getElementsByTagName('tr'));

          if (rows.length > 0) {
            const tableRows: string[][] = [];
            let isOptionGrid = false;

            rows.forEach((row) => {
              const cells = Array.from(row.getElementsByTagName('w:tc')).length > 0
                ? Array.from(row.getElementsByTagName('w:tc'))
                : Array.from(row.getElementsByTagName('tc'));

              const cellTexts: string[] = [];
              cells.forEach((cell) => {
                const cellPs = Array.from(cell.getElementsByTagName('w:p')).length > 0
                  ? Array.from(cell.getElementsByTagName('w:p'))
                  : Array.from(cell.getElementsByTagName('p'));

                const cellContent = cellPs.map((cp) => processParagraphChildren(cp).trim()).filter(Boolean).join(' ');
                if (/^(?:Option\s+[A-E]|[\(\[][A-E][\)\]]|[A-E][\.\)\:\-])(?:\s+|$)/i.test(cellContent.trim())) {
                  isOptionGrid = true;
                }
                cellTexts.push(cellContent);
              });
              if (cellTexts.length > 0) {
                tableRows.push(cellTexts);
              }
            });

            // Check if table contains questions, option markers, or answer keys (Document Layout Table)
            let hasQuestionMarkers = false;
            let hasOptionMarkers = false;

            tableRows.forEach((r) => {
              r.forEach((c) => {
                const trimmed = c.trim();
                if (!trimmed) return;
                if (
                  /^(?:(?:SECTION|PART|TOPIC)\s*[^:\n]+[:\-\s]*)?(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*)?[1-9]\d{0,3}[\.\:\)\s\-]/i.test(trimmed) ||
                  /^(?:Answer|Key|Ans|Correct)\s*[:\-=]/i.test(trimmed)
                ) {
                  hasQuestionMarkers = true;
                }
                if (/^(?:Option\s+[A-E]|[\(\[][A-E][\)\]]|[A-E][\.\)\:\-])(?:\s+|$)/i.test(trimmed)) {
                  hasOptionMarkers = true;
                }
              });
            });

            const isQuestionOrOptionLayoutTable = hasQuestionMarkers || hasOptionMarkers || isOptionGrid;

            if (isQuestionOrOptionLayoutTable) {
              // Layout table: Extract rows cleanly without markdown table syntax
              tableRows.forEach((row) => {
                const validCells = row.map((c) => c.trim()).filter(Boolean);
                if (validCells.length === 0) return;

                // Check if row is a question stem split across cells (e.g. ["148. Find the arithmetic mean of", "5", "and", "15."])
                const startsWithQ = /^(?:(?:SECTION|PART|TOPIC)\s*[^:\n]+[:\-\s]*)?(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*)?[1-9]\d{0,3}[\.\:\)\s\-]/i.test(validCells[0]);
                const hasOptionsInRow = validCells.some((c) => /^(?:Option\s+[A-E]|[\(\[][A-E][\)\]]|[A-E][\.\)\:\-])(?:\s+|$)/i.test(c));

                if (startsWithQ && !hasOptionsInRow) {
                  // Join all non-empty cells into a cohesive question statement
                  resultParagraphs.push(validCells.join(' '));
                  return;
                }

                // Check if cells alternate: [Marker, Content, Marker, Content] e.g. ["A.", "8", "B.", "9"] or ["A.", "8"]
                const processedLines: string[] = [];
                let i = 0;
                while (i < validCells.length) {
                  const cell = validCells[i];
                  const isMarkerOnly = /^(?:Option\s+)?(?:\([A-E]\)|\[[A-E]\]|[A-E][\.\)\:\-]|\b[A-E]\b)$/i.test(cell);
                  if (isMarkerOnly && i + 1 < validCells.length) {
                    const nextCell = validCells[i + 1];
                    const cleanMarker = cell.replace(/[\.\)\:\-]?$/, '.');
                    processedLines.push(`${cleanMarker} ${nextCell}`);
                    i += 2;
                  } else {
                    processedLines.push(cell);
                    i++;
                  }
                }

                processedLines.forEach((line) => {
                  if (line && line.trim()) {
                    const separated = separateInlineOptions(line.trim());
                    separated.forEach((s) => {
                      if (s && s.trim()) resultParagraphs.push(s.trim());
                    });
                  }
                });
              });
            } else if (tableRows.length > 0) {
              // Format standard data table (e.g. binary Cayley table) as clean markdown table
              const maxCols = Math.max(...tableRows.map((r) => r.length));
              tableRows.forEach((row, rIdx) => {
                const cleanRow = [...row];
                while (cleanRow.length < maxCols) cleanRow.push(' ');
                resultParagraphs.push(`| ${cleanRow.map((c) => (c || ' ').replace(/\|/g, '\\|')).join(' | ')} |`);
                if (rIdx === 0) {
                  resultParagraphs.push(`| ${cleanRow.map(() => '---').join(' | ')} |`);
                }
              });
            }
          }
        } else if (local === 'sdt' || local === 'sdtcontent' || local === 'txbxcontent') {
          // Content control or text box: recursively traverse child blocks
          traverseBlocks(elem);
        } else if (elem.childNodes && elem.childNodes.length > 0) {
          // Search for nested textboxes or drawings
          const hasInnerP = safeQuerySelector(elem, ['w:p', 'p']);
          if (hasInnerP) {
            traverseBlocks(elem);
          }
        }
      });
    }

    if (bodyElem) {
      traverseBlocks(bodyElem);
    }

    if (resultParagraphs.length === 0) {
      // Select all paragraphs <w:p> as fallback
      const wpElements = Array.from(xmlDoc.getElementsByTagName('w:p')) as Element[];
      const paragraphs: Element[] = wpElements.length > 0
        ? wpElements
        : (Array.from(xmlDoc.getElementsByTagName('p')) as Element[]);

      if (paragraphs.length === 0) {
        return fallbackRegexWordXml(xmlString);
      }

      paragraphs.forEach((p: Element) => {
        const paragraphText = processParagraphChildren(p);
        if (paragraphText && paragraphText.trim()) {
          resultParagraphs.push(paragraphText.trim());
        }
      });
    }

    return resultParagraphs.join('\n');
  } catch (err) {
    console.warn('DOMParser failed on Word XML, falling back to regex matcher:', err);
    return fallbackRegexWordXml(xmlString);
  }
}

/**
 * Converts Unicode math symbols from Word OMATH <m:t> runs into standard LaTeX commands for KaTeX
 */
function cleanOmathText(txt: string): string {
  if (!txt) return '';
  return txt
    .replace(/\u2212/g, '-')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/±/g, '\\pm ')
    .replace(/∓/g, '\\mp ')
    .replace(/[·•∙⋅]/g, '\\cdot ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\neq ')
    .replace(/≈/g, '\\approx ')
    .replace(/≡/g, '\\equiv ')
    .replace(/∝/g, '\\propto ')
    .replace(/∼/g, '\\sim ')
    .replace(/[∧⋀]/g, '\\wedge ')
    .replace(/[∨⋁]/g, '\\vee ')
    .replace(/¬/g, '\\neg ')
    .replace(/≪/g, '\\ll ')
    .replace(/≫/g, '\\gg ')
    .replace(/∈/g, '\\in ')
    .replace(/∉/g, '\\notin ')
    .replace(/⊂/g, '\\subset ')
    .replace(/⊆/g, '\\subseteq ')
    .replace(/⊄/g, '\\not\\subset ')
    .replace(/∪/g, '\\cup ')
    .replace(/∩/g, '\\cap ')
    .replace(/∅/g, '\\emptyset ')
    .replace(/∀/g, '\\forall ')
    .replace(/∃/g, '\\exists ')
    .replace(/→/g, '\\to ')
    .replace(/←/g, '\\leftarrow ')
    .replace(/↔/g, '\\leftrightarrow ')
    .replace(/⇒/g, '\\implies ')
    .replace(/⇔/g, '\\iff ')
    .replace(/↦/g, '\\mapsto ')
    .replace(/∞/g, '\\infty ')
    .replace(/∂/g, '\\partial ')
    .replace(/∇/g, '\\nabla ')
    .replace(/∠/g, '\\angle ')
    .replace(/△/g, '\\triangle ')
    .replace(/⊥/g, '\\perp ')
    .replace(/∥/g, '\\parallel ')
    .replace(/⊕/g, '\\oplus ')
    .replace(/⊗/g, '\\otimes ')
    .replace(/⊙/g, '\\odot ')
    .replace(/⊖/g, '\\ominus ')
    .replace(/[∗\*]/g, ' * ')
    .replace(/∘/g, ' \\circ ')
    .replace(/[°º]/g, '^{\\circ}')
    .replace(/′/g, "'")
    .replace(/″/g, "''")
    .replace(/‴/g, "'''")
    .replace(/√/g, '\\sqrt')
    .replace(/∫/g, '\\int ')
    .replace(/∬/g, '\\iint ')
    .replace(/∭/g, '\\iiint ')
    .replace(/∮/g, '\\oint ')
    .replace(/∑/g, '\\sum ')
    .replace(/∏/g, '\\prod ')
    .replace(/ℝ/g, '\\mathbb{R}')
    .replace(/ℂ/g, '\\mathbb{C}')
    .replace(/ℤ/g, '\\mathbb{Z}')
    .replace(/ℕ/g, '\\mathbb{N}')
    .replace(/ℚ/g, '\\mathbb{Q}')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/ε/g, '\\epsilon ')
    .replace(/ζ/g, '\\zeta ')
    .replace(/η/g, '\\eta ')
    .replace(/θ/g, '\\theta ')
    .replace(/ι/g, '\\iota ')
    .replace(/κ/g, '\\kappa ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/ν/g, '\\nu ')
    .replace(/ξ/g, '\\xi ')
    .replace(/π/g, '\\pi ')
    .replace(/ρ/g, '\\rho ')
    .replace(/σ/g, '\\sigma ')
    .replace(/τ/g, '\\tau ')
    .replace(/υ/g, '\\upsilon ')
    .replace(/φ/g, '\\phi ')
    .replace(/χ/g, '\\chi ')
    .replace(/ψ/g, '\\psi ')
    .replace(/ω/g, '\\omega ')
    .replace(/Γ/g, '\\Gamma ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/Θ/g, '\\Theta ')
    .replace(/Λ/g, '\\Lambda ')
    .replace(/Ξ/g, '\\Xi ')
    .replace(/Π/g, '\\Pi ')
    .replace(/Σ/g, '\\Sigma ')
    .replace(/Υ/g, '\\Upsilon ')
    .replace(/Φ/g, '\\Phi ')
    .replace(/Ψ/g, '\\Psi ')
    .replace(/Ω/g, '\\Omega ');
}

/**
 * Cleans MathType / Word shape description or alt text into LaTeX math
 */
function cleanMathTypeOrAltText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let str = input.trim();

  // Strip MathType / Equation prefixes
  if (str.startsWith('Equation:') || str.startsWith('Equation :')) {
    str = str.replace(/^Equation\s*:\s*/i, '').trim();
  }
  if (str.startsWith('MathType:') || str.startsWith('MathType :')) {
    str = str.replace(/^MathType\s*:\s*/i, '').trim();
  }

  // Check if MathType header is present e.g. "MathType@MTEF@5@5@..."
  if (str.includes('MathType@MTEF@')) {
    const parts = str.split('MathType@MTEF@');
    const candidate = parts[0].trim() || parts.slice(1).join('').replace(/^[0-9@+\-_=A-Za-z]+/, '').trim();
    if (candidate) str = candidate;
  }

  if (!str) return '';

  // Check if string contains math characters
  if (
    /(\^|_|\\|[=<>+*\/]|√|±|≤|≥|≠|sin|cos|tan|log|lim|frac|sqrt|\b[a-zA-Z]\s*=\s*)/i.test(str)
  ) {
    const formatted = formatMathTextToLatex(str);
    return formatted.startsWith('$') ? ` ${formatted} ` : ` $${formatted}$ `;
  }

  return ` ${str} `;
}

/**
 * Extracts equations, alt text, or text boxes from Word drawing / pict / object elements
 */
function extractEquationOrAltFromDrawing(elem: Element): string {
  if (!elem) return '';

  // 0. If this is an AlternateContent element, prioritize mc:Choice over mc:Fallback
  const choice = safeQuerySelector(elem, ['mc:Choice', 'Choice']);
  if (choice) {
    const choiceText = extractEquationOrAltFromDrawing(choice);
    if (choiceText && choiceText.trim()) return choiceText;
  }

  // 1. Direct OMATH element inside drawing/shape/alternatecontent
  const omath = safeQuerySelector(elem, ['m:oMath', 'oMath', 'm:oMathPara', 'oMathPara']);
  if (omath) {
    const eq = parseOmathNode(omath).trim();
    if (eq) return ` $${eq}$ `;
  }

  // 2. Check for text boxes or nested paragraphs
  const txbxP = safeQuerySelectorAll(elem, ['w:p', 'p']);
  if (txbxP.length > 0) {
    let pContent = '';
    txbxP.forEach((tp) => {
      const nested = processParagraphChildren(tp).trim();
      if (nested) pContent += (pContent ? '\n' : '') + nested;
    });
    if (pContent) return pContent;
  }

  // 3. Inspect attributes for MathType equations or alternative descriptions
  const candidateAttrs = [
    ...safeQuerySelectorAll(elem, ['wp:docPr', 'docPr']),
    ...safeQuerySelectorAll(elem, ['v:shape', 'shape']),
    ...safeQuerySelectorAll(elem, ['v:imagedata', 'imagedata']),
    elem,
  ];

  for (const cand of candidateAttrs) {
    const descr = getAttr(cand as Element, ['descr', 'alt', 'title', 'o:title']);
    if (descr) {
      const clean = cleanMathTypeOrAltText(descr);
      if (clean) return clean;
    }
  }

  // 4. Check for embedded image relationship ID (a:blip or v:imagedata)
  const blip = safeQuerySelector(elem, ['a:blip', 'blip']);
  if (blip) {
    const rEmbed = getAttr(blip, ['r:embed', 'embed', 'r:link', 'link']);
    if (rEmbed) {
      return `\n[IMAGE:${rEmbed}]\n`;
    }
  }
  const imgData = safeQuerySelector(elem, ['v:imagedata', 'imagedata']);
  if (imgData) {
    const rId = getAttr(imgData, ['r:id', 'id', 'o:relid', 'relid']);
    if (rId) {
      return `\n[IMAGE:${rId}]\n`;
    }
  }

  return '';
}

/**
 * Converts Microsoft Word Equation Field codes (e.g. "EQ \f(a,b)", "EQ \r(3,x)", "EQ \s\up2(x)") into LaTeX.
 */
export function parseWordEqFieldCode(instr: string): string {
  if (!instr || typeof instr !== 'string') return '';
  let clean = instr.trim().replace(/^EQ\s+/i, '').trim();
  if (!clean) return '';

  // Fractions: \f(num,den)
  clean = clean.replace(/\\f\s*\(([^,]+),\s*([^)]+)\)/gi, (_, num, den) => {
    return `\\dfrac{${parseWordEqFieldCode(num).trim()}}{${parseWordEqFieldCode(den).trim()}}`;
  });

  // Radicals: \r(deg,rad) or \r(rad)
  clean = clean.replace(/\\r\s*\((?:([^,]+),\s*)?([^)]+)\)/gi, (_, deg, rad) => {
    const cleanRad = parseWordEqFieldCode(rad).trim();
    if (deg && deg.trim()) {
      return `\\sqrt[${deg.trim()}]{${cleanRad}}`;
    }
    return `\\sqrt{${cleanRad}}`;
  });

  // Integrals: \i(sub,sup,body) or \i\su(sub,sup,body) or \i\in(sub,sup,body)
  clean = clean.replace(/\\i(?:\\[a-z0-9]+)?\s*\(([^,]*),([^,]*),([^)]*)\)/gi, (_, sub, sup, body) => {
    const subStr = sub && sub.trim() ? `_{${parseWordEqFieldCode(sub).trim()}}` : '';
    const supStr = sup && sup.trim() ? `^{${parseWordEqFieldCode(sup).trim()}}` : '';
    return `\\int${subStr}${supStr} ${parseWordEqFieldCode(body).trim()}`;
  });

  // Superscripts & Subscripts: \s\up(n) or \s\do(n) or \s\up(n)\do(k)
  clean = clean.replace(/\\s\\up\s*([0-9a-zA-Z]+|\([^)]+\))\s*\\do\s*([0-9a-zA-Z]+|\([^)]+\))\s*\(([^)]*)\)/gi, (_, up, dn, body) => {
    const cleanUp = up.replace(/^\(|\)$/g, '');
    const cleanDn = dn.replace(/^\(|\)$/g, '');
    return `{${body}}_{${cleanDn}}^{${cleanUp}}`;
  });
  clean = clean.replace(/\\s\\up\s*([0-9a-zA-Z]+|\([^)]+\))\s*\(([^)]*)\)/gi, (_, up, body) => {
    const cleanUp = up.replace(/^\(|\)$/g, '');
    return `{${body}}^{${cleanUp}}`;
  });
  clean = clean.replace(/\\s\\do\s*([0-9a-zA-Z]+|\([^)]+\))\s*\(([^)]*)\)/gi, (_, dn, body) => {
    const cleanDn = dn.replace(/^\(|\)$/g, '');
    return `{${body}}_{${cleanDn}}`;
  });

  // Brackets & delimiters: \b\bc\[(...) or \b(...)
  clean = clean.replace(/\\b\\bc\\?\[\s*\(([^)]+)\)/gi, '\\left[ $1 \\right]');
  clean = clean.replace(/\\b\\bc\\?\{\s*\(([^)]+)\)/gi, '\\left\\{ $1 \\right\\}');
  clean = clean.replace(/\\b\\bc\\?\|\s*\(([^)]+)\)/gi, '\\left| $1 \\right|');
  clean = clean.replace(/\\b\s*\(([^)]+)\)/gi, '\\left( $1 \\right)');

  // Overstrike / accents: \o(x,^) or \o(x,-)
  clean = clean.replace(/\\o\s*\(([^,]+),\s*\^\)/gi, '\\hat{$1}');
  clean = clean.replace(/\\o\s*\(([^,]+),\s*[-—]\)/gi, '\\bar{$1}');
  clean = clean.replace(/\\o\s*\(([^,]+),\s*→\)/gi, '\\vec{$1}');

  // Boxes: \x(...)
  clean = clean.replace(/\\x\s*\(([^)]+)\)/gi, '\\boxed{$1}');

  return clean.trim();
}

/**
 * Recursively extracts formatted text and LaTeX math from a Word paragraph or node.
 */
function processParagraphChildren(node: Element): string {
  if (!node) return '';
  let text = '';

  // Helper buffer for consecutive superscript / subscript runs
  let currentScriptType: 'none' | 'super' | 'sub' = 'none';
  let scriptBuffer = '';

  const flushScriptBuffer = () => {
    if (scriptBuffer) {
      const cleanBuf = scriptBuffer.trim();
      if (cleanBuf) {
        if (currentScriptType === 'super') {
          text += `^{${cleanBuf}}`;
        } else if (currentScriptType === 'sub') {
          text += `_{${cleanBuf}}`;
        }
      }
      scriptBuffer = '';
      currentScriptType = 'none';
    }
  };

  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 3) {
      // Plain text node
      flushScriptBuffer();
      text += child.nodeValue || '';
      return;
    }

    if (child.nodeType === 1) {
      const elem = child as Element;
      const local = getLocalName(elem);

      if (
        local === 'omath' ||
        local === 'omathpara'
      ) {
        flushScriptBuffer();
        // Process Word OMATH equation node
        const latexEq = parseOmathNode(elem);
        if (latexEq && latexEq.trim()) {
          const cleanEq = latexEq.trim();
          text += ` $${cleanEq}$ `;
        }
      } else if (local === 'fldsimple') {
        flushScriptBuffer();
        const instr = getAttr(elem, ['w:instr', 'instr']);
        if (instr && /^EQ\b/i.test(instr.trim())) {
          const latex = parseWordEqFieldCode(instr);
          if (latex) {
            text += ` $${latex}$ `;
          }
        } else {
          text += processParagraphChildren(elem);
        }
      } else if (local === 'instrtext') {
        flushScriptBuffer();
        const instr = elem.textContent || '';
        if (instr && /^EQ\b/i.test(instr.trim())) {
          const latex = parseWordEqFieldCode(instr);
          if (latex) {
            text += ` $${latex}$ `;
          }
        }
      } else if (local === 'r') {
        // Run element: check for formatting (superscript/subscript/symbols/bold vector)
        const rPr = findDirectChild(elem, ['rpr', 'w:rpr']);
        const vertAlignElem = rPr ? findDirectChild(rPr, ['vertalign', 'w:vertalign']) : null;
        const vertVal = vertAlignElem ? getAttr(vertAlignElem, ['w:val', 'val']).toLowerCase() : '';
        const isSuperscript = vertVal === 'superscript';
        const isSubscript = vertVal === 'subscript';

        const bElem = rPr ? findDirectChild(rPr, ['b', 'w:b', 'bcs', 'w:bcs']) : null;
        const bVal = bElem ? getAttr(bElem, ['w:val', 'val']).toLowerCase() : '';
        const isBold = !!bElem && bVal !== '0' && bVal !== 'false' && bVal !== 'none';

        const iElem = rPr ? findDirectChild(rPr, ['i', 'w:i', 'ics', 'w:ics']) : null;
        const iVal = iElem ? getAttr(iElem, ['w:val', 'val']).toLowerCase() : '';
        const isItalic = !!iElem && iVal !== '0' && iVal !== 'false' && iVal !== 'none';

        const uElem = rPr ? findDirectChild(rPr, ['u', 'w:u']) : null;
        const uVal = uElem ? getAttr(uElem, ['w:val', 'val']).toLowerCase() : '';
        const isUnderline = !!uElem && uVal !== 'none' && uVal !== '0' && uVal !== 'false';

        const strikeElem = rPr ? findDirectChild(rPr, ['strike', 'w:strike', 'dstrike', 'w:dstrike']) : null;
        const strikeVal = strikeElem ? getAttr(strikeElem, ['w:val', 'val']).toLowerCase() : '';
        const isStrike = !!strikeElem && strikeVal !== '0' && strikeVal !== 'false' && strikeVal !== 'none';

        // Check for instrText inside run (Word Equation field codes)
        const instrElems = safeQuerySelectorAll(elem, ['w:instrText', 'instrText']);
        if (instrElems.length > 0) {
          let fieldInstr = '';
          instrElems.forEach((ie) => {
            fieldInstr += ie.textContent || '';
          });
          if (fieldInstr && /^EQ\b/i.test(fieldInstr.trim())) {
            flushScriptBuffer();
            const latex = parseWordEqFieldCode(fieldInstr);
            if (latex) {
              text += ` $${latex}$ `;
            }
          }
        }

        // Process run child nodes in DOM order to preserve text, tabs, line breaks, and symbols correctly
        let runText = '';
        const rChildren = Array.from(elem.childNodes);
        if (rChildren.length > 0) {
          for (let ci = 0; ci < rChildren.length; ci++) {
            const cNode = rChildren[ci];
            if (cNode.nodeType === 3) {
              runText += cNode.nodeValue || '';
            } else if (cNode.nodeType === 1) {
              const cElem = cNode as Element;
              const cLocal = getLocalName(cElem);
              if (cLocal === 't') {
                runText += cElem.textContent || '';
              } else if (cLocal === 'tab') {
                runText += '\t';
              } else if (cLocal === 'br' || cLocal === 'cr') {
                runText += '\n';
              } else if (cLocal === 'sym') {
                const charCode = (getAttr(cElem, ['w:char', 'char']) || '').toLowerCase();
                const mapped = resolveWordSymbolChar(charCode);
                if (mapped) runText += mapped;
              }
            }
          }
        } else {
          const textNodes = safeQuerySelectorAll(elem, ['w:t', 't']);
          textNodes.forEach((t) => {
            runText += t.textContent || '';
          });
          const symNodes = safeQuerySelectorAll(elem, ['w:sym', 'sym']);
          symNodes.forEach((sym) => {
            const charCode = (getAttr(sym, ['w:char', 'char']) || '').toLowerCase();
            const mapped = resolveWordSymbolChar(charCode);
            if (mapped) runText += mapped;
          });
        }

        // If run is a single letter and bold in a math/vector context (e.g. bold i, j, k, u, v, w, a, b, F)
        if (isBold && /^[a-zA-Z]$/.test(runText.trim())) {
          runText = `\\mathbf{${runText.trim()}}`;
        } else if (runText.trim() && !isSuperscript && !isSubscript) {
          const trimmed = runText.trim();
          // Avoid wrapping option markers (e.g. "A." or "B.") or question numbers (e.g. "1." or "Q1:") in markdown
          const isMarkerOrQ = /^(?:(?:Question|Q\.?|Problem|Item|No\.?)\s*)?[1-9]\d{0,3}[\.\:\)]?$|^(?:Option\s+)?[A-E][\.\)\:\-]?$/i.test(trimmed);
          if (!isMarkerOrQ) {
            const leading = runText.match(/^\s*/)?.[0] || '';
            const trailing = runText.match(/\s*$/)?.[0] || '';
            let formatted = trimmed;
            if (isUnderline) formatted = `<u>${formatted}</u>`;
            if (isStrike) formatted = `~~${formatted}~~`;
            if (isBold && !formatted.startsWith('**') && !/^\\[a-zA-Z]+/.test(formatted)) {
              formatted = `**${formatted}**`;
            }
            if (isItalic && !formatted.startsWith('*') && !/^\\[a-zA-Z]+/.test(formatted) && !/^[a-zA-Z]$/.test(formatted)) {
              formatted = `*${formatted}*`;
            }
            runText = `${leading}${formatted}${trailing}`;
          }
        }

        if (runText) {
          // If run starts with option marker e.g. "A." or "B." or "(A)"
          // Strictly avoid splitting function calls like P(A), n(A), f(A), coordinates (A, B), or math relations (A) = ...
          // Also NEVER split when the previous run ended with letters (part of an uncompleted word like "tru" + "e.")
          const isWordContinuation = /[a-zA-Z]$/.test(text);
          const isParenthesizedMathOrFunc =
            /(?:[a-zA-Z0-9_\$\\)]|P|Pr|n|f|g|sin|cos|tan)\s*$/i.test(text) ||
            /^\([A-E]\)\s*(=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-)/i.test(runText.trim());

          if (
            !isWordContinuation &&
            !isParenthesizedMathOrFunc &&
            (/^(?:Option\s+)?[A-E][\.\:\-]/i.test(runText.trim()) ||
              /^\([A-E]\)|^[A-E]\)/i.test(runText.trim()))
          ) {
            flushScriptBuffer();
            if (text.length > 0 && !text.endsWith('\n')) {
              text += '\n';
            }
          }

          if (isSuperscript) {
            if (currentScriptType === 'super') {
              scriptBuffer += runText;
            } else {
              flushScriptBuffer();
              currentScriptType = 'super';
              scriptBuffer = runText;
            }
          } else if (isSubscript) {
            if (currentScriptType === 'sub') {
              scriptBuffer += runText;
            } else {
              flushScriptBuffer();
              currentScriptType = 'sub';
              scriptBuffer = runText;
            }
          } else {
            flushScriptBuffer();
            text += runText;
          }
        } else if (elem.childNodes && elem.childNodes.length > 0) {
          // Nested elements inside run (like drawing, object, or alternateContent)
          const nestedOmath = safeQuerySelector(elem, ['m:oMath', 'oMath', 'm:oMathPara', 'oMathPara']);
          if (nestedOmath) {
            flushScriptBuffer();
            const latexEq = parseOmathNode(nestedOmath);
            if (latexEq && latexEq.trim()) {
              if (isSuperscript) {
                text += `^{${latexEq.trim().replace(/\\dfrac/g, '\\frac')}}`;
              } else if (isSubscript) {
                text += `_{${latexEq.trim().replace(/\\dfrac/g, '\\frac')}}`;
              } else {
                text += ` $${latexEq.trim()}$ `;
              }
            }
          } else {
            flushScriptBuffer();
            const eqOrAlt = extractEquationOrAltFromDrawing(elem);
            if (eqOrAlt) {
              text += eqOrAlt;
            } else {
              text += processParagraphChildren(elem);
            }
          }
        }
      } else if (local === 'sym') {
        flushScriptBuffer();
        const charCode = (getAttr(elem, ['w:char', 'char']) || '').toLowerCase();
        const mapped = resolveWordSymbolChar(charCode);
        if (mapped) {
          text += mapped;
        }
      } else if (local === 't') {
        flushScriptBuffer();
        text += elem.textContent || '';
      } else if (local === 'tab') {
        flushScriptBuffer();
        text += '   ';
      } else if (local === 'br' || local === 'cr') {
        flushScriptBuffer();
        text += '\n';
      } else if (local === 'drawing' || local === 'pict' || local === 'object' || local === 'alternatecontent') {
        // Text boxes, MathType equations, or shapes with embedded text or equations
        flushScriptBuffer();
        const extracted = extractEquationOrAltFromDrawing(elem);
        if (extracted) {
          text += extracted;
        }
      } else if (elem.childNodes && elem.childNodes.length > 0) {
        flushScriptBuffer();
        text += processParagraphChildren(elem);
      }
    }
  });

  flushScriptBuffer();
  // Merge adjacent identical markdown tags e.g. **Hello** **World** -> **Hello World**
  const cleanText = text
    .replace(/\*\*\s+\*\*/g, ' ')
    .replace(/\*\s+\*/g, ' ')
    .replace(/<\/u>\s+<u>/g, ' ')
    .replace(/~~\s+~~/g, ' ');
  return cleanText;
}

/**
 * Recursively converts a Word OMATH DOM node (<m:oMath>, <m:f>, <m:sSup>, etc.) to a LaTeX string.
 * Preserves text formatting inside formulas with \text{...}.
 */
function parseOmathNode(node: Element, depth = 0, visited = new Set<Element>()): string {
  if (!node || depth > 16 || visited.has(node)) return '';
  visited.add(node);

  if (node.nodeType === 3) return node.nodeValue || '';

  const tag = getLocalName(node);

  switch (tag) {
    case 'omathpara':
    case 'omath': {
      let result = '';
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          result += parseOmathNode(node.childNodes[i] as Element, depth + 1, visited);
        }
      }
      return result;
    }

    case 'f': {
      // Fraction: <m:num> over <m:den> or column vector if noBar
      const fPr = findDirectChild(node, ['fpr', 'm:fpr']);
      let isNoBar = false;
      let isSkewed = false;
      if (fPr) {
        const typeElem = findDirectChild(fPr, ['type', 'm:type']);
        const typeVal = typeElem ? getAttr(typeElem, ['m:val', 'val']).toLowerCase() : '';
        if (typeVal === 'nobar') isNoBar = true;
        else if (typeVal === 'skw') isSkewed = true;
      }

      const numElem = findDirectChild(node, ['num', 'm:num']);
      const denElem = findDirectChild(node, ['den', 'm:den']);
      const numStr = numElem ? parseOmathNode(numElem, depth + 1, visited).trim() : '';
      const denStr = denElem ? parseOmathNode(denElem, depth + 1, visited).trim() : '';

      if (isNoBar) {
        // Stacked numbers without fraction bar represents a column vector or matrix column
        return `\\begin{pmatrix} ${numStr.replace(/\\dfrac/g, '\\frac')} \\\\ ${denStr.replace(/\\dfrac/g, '\\frac')} \\end{pmatrix}`;
      }

      if (isSkewed) {
        return `{${numStr}}/{${denStr}}`;
      }

      return `\\dfrac{${numStr}}{${denStr}}`;
    }

    case 'ssup': {
      // Superscript: <m:e> base, <m:sup> exp
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const supElem = findDirectChild(node, ['sup', 'm:sup']);
      const baseStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      let supStr = supElem ? parseOmathNode(supElem, depth + 1, visited).trim() : '';

      // Normalize degree in exponent (e.g. 90^o -> 90^{\circ})
      if (supStr === 'o' || supStr === 'O' || supStr === '°' || supStr === '\\circ') {
        supStr = '\\circ';
      }

      // For fractional indexes, kindly use slash (/) instead of the normal fraction bar
      supStr = supStr.replace(/\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
      supStr = supStr.replace(/\\dfrac/g, '\\frac');

      // Normalize primes in superscripts e.g. {A}^{'} -> A'
      if (supStr === "'" || supStr === "\\prime" || supStr === "^{\\prime}") {
        return `{${baseStr}}'`;
      }

      return `{${baseStr}}^{${supStr}}`;
    }

    case 'ssub': {
      // Subscript: <m:e> base, <m:sub> sub
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const subElem = findDirectChild(node, ['sub', 'm:sub']);
      const baseStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      let subStr = subElem ? parseOmathNode(subElem, depth + 1, visited).trim() : '';
      subStr = subStr.replace(/\\dfrac/g, '\\frac');
      return `{${baseStr}}_{${subStr}}`;
    }

    case 'ssubsup': {
      // Subscript & Superscript
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const subElem = findDirectChild(node, ['sub', 'm:sub']);
      const supElem = findDirectChild(node, ['sup', 'm:sup']);
      const baseStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      let subStr = subElem ? parseOmathNode(subElem, depth + 1, visited).trim() : '';
      let supStr = supElem ? parseOmathNode(supElem, depth + 1, visited).trim() : '';

      subStr = subStr.replace(/\\dfrac/g, '\\frac');
      // For fractional indexes, kindly use slash (/) instead of the normal fraction bar
      supStr = supStr.replace(/\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
      supStr = supStr.replace(/\\dfrac/g, '\\frac');

      if (supStr === 'o' || supStr === 'O' || supStr === '°' || supStr === '\\circ') {
        supStr = '\\circ';
      }

      if (supStr === "'" || supStr === "\\prime") {
        return `{${baseStr}}_{${subStr}}'`;
      }

      return `{${baseStr}}_{${subStr}}^{${supStr}}`;
    }

    case 'spre': {
      // Pre-sub-superscript e.g. {}^n C_r or {}^{14}_6 C
      const subElem = findDirectChild(node, ['sub', 'm:sub']);
      const supElem = findDirectChild(node, ['sup', 'm:sup']);
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const subStr = subElem ? parseOmathNode(subElem, depth + 1, visited).trim() : '';
      const supStr = supElem ? parseOmathNode(supElem, depth + 1, visited).trim() : '';
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';

      let prefix = '';
      if (subStr && supStr) prefix = `{}_{${subStr}}^{${supStr}}`;
      else if (subStr) prefix = `{}_{${subStr}}`;
      else if (supStr) prefix = `{}^{${supStr}}`;
      return `${prefix}{${eStr}}`;
    }

    case 'rad': {
      // Radical / Square root: <m:e> body, optional <m:deg> degree
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const degElem = findDirectChild(node, ['deg', 'm:deg']);
      const bodyStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      const degStr = degElem ? parseOmathNode(degElem, depth + 1, visited).trim() : '';
      return degStr ? `\\sqrt[${degStr}]{${bodyStr}}` : `\\sqrt{${bodyStr}}`;
    }

    case 'd': {
      // Delimiter / Parentheses / Brackets / Absolute Value / Binomial
      const dPr = findDirectChild(node, ['dpr', 'm:dpr']);
      let begChr = '(';
      let endChr = ')';
      let sepChr = ', ';
      if (dPr) {
        const begElem = findDirectChild(dPr, ['begchr', 'm:begchr']);
        const endElem = findDirectChild(dPr, ['endchr', 'm:endchr']);
        const sepElem = findDirectChild(dPr, ['sepchr', 'm:sepchr']);
        if (begElem) begChr = getAttr(begElem, ['w:val', 'm:val', 'val']);
        if (endElem) endChr = getAttr(endElem, ['w:val', 'm:val', 'val']);
        if (sepElem) {
          const val = getAttr(sepElem, ['w:val', 'm:val', 'val']);
          sepChr = val !== '' ? val : '';
        }
      }

      // CRITICAL: Extract child <m:e> elements (e.g. coordinates (x, y), intervals [a, b], sets {1, 2, 3}, column vectors)
      let eElems = findAllDirectChildren(node, ['e', 'm:e']);
      if (eElems.length === 0) {
        eElems = safeQuerySelectorAll(node, ['m:e', 'e']);
      }

      // Check for nested matrix or stacked fraction (column vector / binomial coefficient)
      if (eElems.length === 1) {
        const matrixChild = findDirectChild(eElems[0], ['m', 'm:m']) || safeQuerySelector(eElems[0], ['m:m', 'm']);
        if (matrixChild) {
          const mStr = parseOmathNode(matrixChild, depth + 1, visited);
          if (begChr === '[' && endChr === ']') {
            return mStr.replace(/^\\begin\{pmatrix\}/, '\\begin{bmatrix}').replace(/\\end\{pmatrix\}$/, '\\end{bmatrix}');
          }
          if (begChr === '|' && endChr === '|') {
            return mStr.replace(/^\\begin\{pmatrix\}/, '\\begin{vmatrix}').replace(/\\end\{pmatrix\}$/, '\\end{vmatrix}');
          }
          return mStr;
        }

        const fracChild = findDirectChild(eElems[0], ['f', 'm:f']) || safeQuerySelector(eElems[0], ['m:f', 'f']);
        if (fracChild) {
          const fPr = findDirectChild(fracChild, ['fpr', 'm:fpr']);
          const typeElem = fPr ? findDirectChild(fPr, ['type', 'm:type']) : null;
          const typeVal = typeElem ? getAttr(typeElem, ['m:val', 'val']).toLowerCase() : '';
          const numElem = findDirectChild(fracChild, ['num', 'm:num']);
          const denElem = findDirectChild(fracChild, ['den', 'm:den']);
          const numStr = numElem ? parseOmathNode(numElem, depth + 1, visited).trim() : '';
          const denStr = denElem ? parseOmathNode(denElem, depth + 1, visited).trim() : '';
          const cleanNum = numStr.replace(/\\dfrac/g, '\\frac');
          const cleanDen = denStr.replace(/\\dfrac/g, '\\frac');

          // Check if fraction inside parentheses represents a 2D column vector or binomial coefficient:
          // Strictly requires typeVal === 'nobar' (Word OMML stacked element without fraction bar)
          if (typeVal === 'nobar') {
            if (begChr === '(' && endChr === ')') {
              const isNegative = cleanNum.includes('-') || cleanDen.includes('-');
              // Binomial coefficients contain non-negative numbers, letters, or expressions (e.g. \binom{5}{2}, \binom{n}{r}, \binom{n+1}{r})
              if (!isNegative && /^[a-zA-Z0-9\s+\-]+$/.test(cleanNum) && /^[a-zA-Z0-9\s+\-]+$/.test(cleanDen)) {
                return `\\binom{${cleanNum}}{${cleanDen}}`;
              }
              return `\\begin{pmatrix} ${cleanNum} \\\\ ${cleanDen} \\end{pmatrix}`;
            }
            if (begChr === '[' && endChr === ']') {
              return `\\begin{bmatrix} ${cleanNum} \\\\ ${cleanDen} \\end{bmatrix}`;
            }
            if (begChr === '|' && endChr === '|') {
              return `\\begin{vmatrix} ${cleanNum} \\\\ ${cleanDen} \\end{vmatrix}`;
            }
            return `\\begin{matrix} ${cleanNum} \\\\ ${cleanDen} \\end{matrix}`;
          }

          // Standard fraction or compound fraction inside delimiters: e.g. (\frac{\frac{a}{b}}{\frac{c}{d}})
          if (begChr === '(' && endChr === ')') {
            return `\\left(\\dfrac{${cleanNum}}{${cleanDen}}\\right)`;
          }
          if (begChr === '[' && endChr === ']') {
            return `\\left[\\dfrac{${cleanNum}}{${cleanDen}}\\right]`;
          }
          return `\\dfrac{${cleanNum}}{${cleanDen}}`;
        }
      }

      const innerParts = eElems.map((e) => parseOmathNode(e, depth + 1, visited).trim().replace(/\\dfrac/g, '\\frac')).filter(Boolean);

      // Check for multi-element column vector or matrix in Word where separator is empty
      if (innerParts.length >= 2 && (!sepChr || sepChr.trim() === '')) {
        if (begChr === '(' && endChr === ')') {
          return `\\begin{pmatrix} ${innerParts.join(' \\\\ ')} \\end{pmatrix}`;
        }
        if (begChr === '[' && endChr === ']') {
          return `\\begin{bmatrix} ${innerParts.join(' \\\\ ')} \\end{bmatrix}`;
        }
        if (begChr === '|' && endChr === '|') {
          return `\\begin{vmatrix} ${innerParts.join(' \\\\ ')} \\end{vmatrix}`;
        }
        if (begChr === '{' && (!endChr || endChr.trim() === '')) {
          return `\\begin{cases} ${innerParts.join(' \\\\ ')} \\end{cases}`;
        }
        if (!begChr && !endChr) {
          return `\\begin{matrix} ${innerParts.join(' \\\\ ')} \\end{matrix}`;
        }
      }

      // If eElems yielded nothing but node has direct text, preserve the text
      if (innerParts.length === 0) {
        const rawNodeText = cleanOmathText(node.textContent || '').trim();
        if (rawNodeText) {
          return `\\left( ${rawNodeText} \\right)`;
        }
      }

      const separator = sepChr.trim() === ',' ? ', ' : ` ${sepChr.trim()} `;
      const innerContent = innerParts.join(separator);

      // If already a complete matrix environment, adjust delimiters or avoid redundant wrapping
      if (innerContent.startsWith('\\begin{pmatrix}')) {
        if (begChr === '(' && endChr === ')') return innerContent;
        if (begChr === '[' && endChr === ']') {
          return innerContent.replace(/^\\begin\{pmatrix\}/, '\\begin{bmatrix}').replace(/\\end\{pmatrix\}$/, '\\end{bmatrix}');
        }
        if (begChr === '|' && endChr === '|') {
          return innerContent.replace(/^\\begin\{pmatrix\}/, '\\begin{vmatrix}').replace(/\\end\{pmatrix\}$/, '\\end{vmatrix}');
        }
        if (begChr === '{' && (!endChr || endChr === '}')) {
          return innerContent.replace(/^\\begin\{pmatrix\}/, '\\begin{Bmatrix}').replace(/\\end\{pmatrix\}$/, '\\end{Bmatrix}');
        }
      }
      if (innerContent.startsWith('\\begin{bmatrix}') && begChr === '[' && endChr === ']') return innerContent;
      if (innerContent.startsWith('\\begin{vmatrix}') && begChr === '|' && endChr === '|') return innerContent;
      if (innerContent.startsWith('\\begin{cases}') && begChr === '{') return innerContent;

      // Select LaTeX delimiter commands
      let openTag = '\\left(';
      let closeTag = '\\right)';

      if (begChr === '[') openTag = '\\left[';
      else if (begChr === '{') openTag = '\\left\\{';
      else if (begChr === '|') openTag = '\\left|';
      else if (begChr === '‖' || begChr === '||') openTag = '\\left\\|';
      else if (begChr === '⟨' || begChr === '<') openTag = '\\left\\langle ';
      else if (begChr === '⌊') openTag = '\\left\\lfloor ';
      else if (begChr === '⌈') openTag = '\\left\\lceil ';
      else if (!begChr) openTag = '\\left.';

      if (endChr === ']') closeTag = '\\right]';
      else if (endChr === '}') closeTag = '\\right\\}';
      else if (endChr === '|') closeTag = '\\right|';
      else if (endChr === '‖' || endChr === '||') closeTag = '\\right\\|';
      else if (endChr === '⟩' || endChr === '>') closeTag = '\\right\\rangle ';
      else if (endChr === '⌋') closeTag = '\\right\\rfloor ';
      else if (endChr === '⌉') closeTag = '\\right\\rceil ';
      else if (!endChr) closeTag = '\\right.';

      return `${openTag}${innerContent}${closeTag}`;
    }

    case 'nary': {
      // N-ary operator: integral, sum, limit, product, union, intersection
      const naryPr = findDirectChild(node, ['narypr', 'm:narypr']);
      const chrElem = naryPr ? findDirectChild(naryPr, ['chr', 'm:chr']) : findDirectChild(node, ['chr', 'm:chr']);
      const chrVal = chrElem ? getAttr(chrElem, ['m:val', 'val']) : '';

      let op = '\\int';
      if (chrVal === '∑' || chrVal === 'sum') op = '\\sum';
      else if (chrVal === '∏' || chrVal === 'prod') op = '\\prod';
      else if (chrVal === '⋃' || chrVal === 'cup') op = '\\bigcup';
      else if (chrVal === '⋂' || chrVal === 'cap') op = '\\bigcap';
      else if (chrVal === '∬') op = '\\iint';
      else if (chrVal === '∭') op = '\\iiint';
      else if (chrVal === '∮') op = '\\oint';

      const subElem = findDirectChild(node, ['sub', 'm:sub']);
      const supElem = findDirectChild(node, ['sup', 'm:sup']);
      const eElem = findDirectChild(node, ['e', 'm:e']);

      const subStr = subElem ? parseOmathNode(subElem, depth + 1, visited).trim() : '';
      const supStr = supElem ? parseOmathNode(supElem, depth + 1, visited).trim() : '';
      const bodyStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';

      let limits = '';
      if (subStr) limits += `_{${subStr}}`;
      if (supStr) limits += `^{${supStr}}`;

      return `${op}${limits} ${bodyStr}`;
    }

    case 'm': {
      // Matrix: <m:mr> rows, each containing direct <m:e> cells
      const rows = findAllDirectChildren(node, ['mr', 'm:mr']);
      const rowStrs = rows.map((r) => {
        const cells = findAllDirectChildren(r, ['e', 'm:e']);
        return cells.map((c) => parseOmathNode(c, depth + 1, visited).trim().replace(/\\dfrac/g, '\\frac')).join(' & ');
      });
      return `\\begin{pmatrix} ${rowStrs.join(' \\\\ ')} \\end{pmatrix}`;
    }

    case 'eqarr': {
      // Equation array
      const rows = findAllDirectChildren(node, ['e', 'm:e']);
      const rowStrs = rows.map((r) => parseOmathNode(r, depth + 1, visited).trim());
      return `\\begin{aligned} ${rowStrs.join(' \\\\ ')} \\end{aligned}`;
    }

    case 'func': {
      // Function: e.g. sin, cos, log, ln, lim, det
      const fnameElem = findDirectChild(node, ['fname', 'fName', 'm:fName']);
      const eElem = findDirectChild(node, ['e', 'm:e']);
      let fnameStr = fnameElem ? parseOmathNode(fnameElem, depth + 1, visited).trim() : '';
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';

      const standardFuncs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lim', 'det', 'exp', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'max', 'min'];
      const cleanName = fnameStr.replace(/^\\/, '');
      if (standardFuncs.includes(cleanName.toLowerCase())) {
        fnameStr = `\\${cleanName.toLowerCase()}`;
      } else if (!fnameStr.startsWith('\\') && /^[a-zA-Z]+$/.test(fnameStr)) {
        fnameStr = `\\operatorname{${fnameStr}}`;
      }

      if (eStr.startsWith('(') && eStr.endsWith(')')) {
        return `${fnameStr} ${eStr}`;
      }
      if (eStr.startsWith('\\left(') && eStr.endsWith('\\right)')) {
        return `${fnameStr} ${eStr}`;
      }
      return `${fnameStr}\\left(${eStr}\\right)`;
    }

    case 'limlow': {
      // Limit with lower condition e.g. \lim_{x \to 0}
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const limElem = findDirectChild(node, ['lim', 'm:lim']);
      let eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      let limStr = limElem ? parseOmathNode(limElem, depth + 1, visited).trim() : '';

      // Clean condition arrow (-> to \to)
      limStr = limStr.replace(/->|→/g, ' \\to ');

      if (eStr.toLowerCase() === 'lim' || !eStr) {
        return `\\lim_{${limStr}}`;
      }
      return `\\lim_{${limStr}} ${eStr}`;
    }

    case 'limupp': {
      // Limit with upper condition
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const limElem = findDirectChild(node, ['lim', 'm:lim']);
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      const limStr = limElem ? parseOmathNode(limElem, depth + 1, visited).trim() : '';
      return `${eStr}^{${limStr}}`;
    }

    case 'groupchr': {
      // Group character: vector arrows over expression, overbraces, underbraces
      const groupChrPr = findDirectChild(node, ['groupchrpr', 'm:groupchrpr']);
      const chrElem = groupChrPr ? findDirectChild(groupChrPr, ['chr', 'm:chr']) : null;
      const posElem = groupChrPr ? findDirectChild(groupChrPr, ['pos', 'm:pos']) : null;
      const chrVal = chrElem ? getAttr(chrElem, ['m:val', 'val']) : '→';
      const posVal = posElem ? getAttr(posElem, ['m:val', 'val']).toLowerCase() : 'top';
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const inner = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';

      if (chrVal === '→' || chrVal === '⃗') {
        return `\\overrightarrow{${inner}}`;
      }
      if (chrVal === '⏞' || (chrVal === '‾' && posVal === 'top')) {
        return `\\overbrace{${inner}}`;
      }
      if (chrVal === '⏟' || (chrVal === '_' && posVal === 'bot')) {
        return `\\underbrace{${inner}}`;
      }
      if (posVal === 'bot') {
        return `\\underline{${inner}}`;
      }
      return `\\overline{${inner}}`;
    }

    case 'bar': {
      // Bar over or under expression (vector, mean, conjugate)
      const barPr = findDirectChild(node, ['barpr', 'm:barpr']);
      const posElem = barPr ? findDirectChild(barPr, ['pos', 'm:pos']) : null;
      const posVal = posElem ? getAttr(posElem, ['m:val', 'val']).toLowerCase() : 'top';
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      return posVal === 'bot' ? `\\underline{${eStr}}` : `\\overline{${eStr}}`;
    }

    case 'acc': {
      // Accent (hat for unit vectors, arrow for vectors, dot for derivatives, bar for mean)
      const accPr = findDirectChild(node, ['accpr', 'm:accpr']);
      const chrElem = accPr ? findDirectChild(accPr, ['chr', 'm:chr']) : findDirectChild(node, ['chr', 'm:chr']);
      const chrVal = chrElem ? getAttr(chrElem, ['m:val', 'val']) : '';
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';

      if (chrVal === '^' || chrVal === '̂' || chrVal === 'ˆ') return `\\hat{${eStr}}`;
      if (chrVal === '→' || chrVal === '⃗') return `\\vec{${eStr}}`;
      if (chrVal === '.' || chrVal === '̇') return `\\dot{${eStr}}`;
      if (chrVal === '..' || chrVal === '̈') return `\\ddot{${eStr}}`;
      if (chrVal === '~' || chrVal === '̃') return `\\tilde{${eStr}}`;
      if (chrVal === '¯' || chrVal === '‾' || chrVal === '-' || chrVal === '—') return `\\bar{${eStr}}`;
      return `\\vec{${eStr}}`;
    }

    case 'box': {
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      return eStr;
    }

    case 'borderbox': {
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      return `\\boxed{${eStr}}`;
    }

    case 'phant': {
      const eElem = findDirectChild(node, ['e', 'm:e']);
      const eStr = eElem ? parseOmathNode(eElem, depth + 1, visited).trim() : '';
      return `\\phantom{${eStr}}`;
    }

    case 'r': {
      // Run inside OMATH: check if it is normal prose text (<m:nor/>), bold vector (<m:sty m:val="b"/>), or script
      const rPr = findDirectChild(node, ['rpr', 'm:rpr']);
      const isNormalText = !!findDirectChild(rPr, ['nor', 'm:nor']) || !!safeQuerySelector(node, ['m:nor', 'nor']);
      const styElem = rPr ? findDirectChild(rPr, ['sty', 'm:sty']) : null;
      const styVal = styElem ? getAttr(styElem, ['m:val', 'val']).toLowerCase() : '';
      const scrElem = rPr ? findDirectChild(rPr, ['scr', 'm:scr']) : null;
      const scrVal = scrElem ? getAttr(scrElem, ['m:val', 'val']).toLowerCase() : '';

      let runStr = '';
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          runStr += parseOmathNode(node.childNodes[i] as Element, depth + 1, visited);
        }
      }
      if (isNormalText && runStr.trim()) {
        return `\\text{${runStr}}`;
      }
      if (styVal === 'b' || styVal === 'bi') {
        return `\\mathbf{${runStr}}`;
      }
      if (scrVal === 'script') {
        return `\\mathcal{${runStr}}`;
      }
      return runStr;
    }

    case 't': {
      const txt = node.textContent || '';
      return cleanOmathText(txt);
    }

    default: {
      let result = '';
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          result += parseOmathNode(node.childNodes[i] as Element, depth + 1, visited);
        }
      }
      return result;
    }
  }
}

/**
 * Fallback regex XML parser if DOMParser fails
 */
function fallbackRegexWordXml(xml: string): string {
  let str = xml;

  str = str.replace(/<m:oMath[\s\S]*?>([\s\S]*?)<\/m:oMath>/gi, (_, content) => {
    let clean = content
      .replace(/<m:f>[\s\S]*?<m:num>([\s\S]*?)<\/m:num>[\s\S]*?<m:den>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/gi, '\\dfrac{$1}{$2}')
      .replace(/<m:sSup>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/gi, '{$1}^{$2}')
      .replace(/<m:sSub>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/gi, '{$1}_{$2}')
      .replace(/<m:rad>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/gi, '\\sqrt{$1}')
      .replace(/<\/?(?:m:[a-zA-Z]+|[a-zA-Z][a-zA-Z0-9:\-_]*)(?:\s+[^>]*?)?>/gi, '');
    return ` $${clean.trim()}$ `;
  });

  str = str.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi, '$1');
  str = str.replace(/<\/?(?:m:[a-zA-Z]+|[a-zA-Z][a-zA-Z0-9:\-_]*)(?:\s+[^>]*?)?>/gi, ' ');

  return str.replace(/\s+/g, ' ');
}

// Common English words that indicate prose context and should NEVER be turned into raw math variables
export const COMMON_PROSE_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'and', 'or', 'not', 'if', 'then', 'else', 'when', 'where', 'which', 'who',
  'what', 'why', 'how', 'that', 'this', 'these', 'those', 'with', 'without',
  'of', 'in', 'on', 'at', 'by', 'for', 'from', 'to', 'into', 'onto',
  'find', 'solve', 'calculate', 'evaluate', 'simplify', 'determine', 'prove',
  'show', 'given', 'suppose', 'let', 'assume', 'express', 'write', 'state',
  'following', 'question', 'problem', 'value', 'values', 'root', 'roots',
  'equation', 'equations', 'expression', 'function', 'matrix', 'vector',
  'triangle', 'angle', 'circle', 'line', 'point', 'points', 'set', 'term',
  'terms', 'series', 'sequence', 'sum', 'product', 'difference', 'ratio',
  'maximum', 'minimum', 'rate', 'area', 'volume', 'perimeter', 'length',
  'correct', 'incorrect', 'true', 'false', 'none', 'all', 'both', 'either',
  'neither', 'respect', 'terms', 'degrees', 'radians', 'units', 'cm', 'meters',
  'seconds', 'hours', 'minutes', 'marks', 'option', 'choose', 'select', 'each',
  'such', 'that', 'only', 'statement', 'statements', 'undefined', 'constant',
  'increase', 'increases', 'decrease', 'decreases', 'linearly', 'exponentially',
  'parallel', 'perpendicular', 'intersect', 'gradient', 'slope', 'intercept',
  'positive', 'negative', 'zero', 'real', 'imaginary', 'complex', 'independent',
  'dependent', 'sample', 'probability', 'statistics', 'discrete', 'continuous',
  'differentiate', 'integrate', 'differentiating', 'integrating', 'expansion',
  'its', 'it', 'position', 'particle', 'moves', 'move', 'moving', 'moved',
  'velocity', 'speed', 'acceleration', 'displacement', 'distance', 'height',
  'time', 'mass', 'weight', 'force', 'energy', 'work', 'power', 'momentum',
  'pass', 'passed', 'passing', 'fail', 'failed', 'failing', 'math', 'maths',
  'mathematics', 'english', 'science', 'physics', 'chemistry', 'biology',
  'subject', 'subjects', 'student', 'students', 'pupil', 'pupils', 'class',
  'boy', 'boys', 'girl', 'girls', 'candidate', 'candidates', 'person', 'people',
  'score', 'scores', 'grade', 'grades', 'total', 'average', 'mean', 'median',
  'mode', 'variance', 'deviation', 'event', 'events', 'outcome', 'outcomes',
  'dice', 'die', 'coin', 'coins', 'card', 'cards', 'bag', 'box', 'urn',
  'ball', 'balls', 'red', 'blue', 'green', 'white', 'black', 'yellow',
  'least', 'most', 'more', 'less', 'than', 'between', 'among', 'together',
  'odd', 'even', 'prime', 'composite', 'first', 'second', 'third', 'initial',
  'final', 'uniform', 'rest', 'starts', 'comes', 'reaches', 'body', 'car',
  'has', 'had', 'have', 'having', 'do', 'does', 'did', 'done', 'doing',
  'can', 'could', 'may', 'might', 'will', 'would', 'shall', 'should', 'must',
  'any', 'some', 'many', 'much', 'few', 'several', 'other', 'another',
  'who', 'whom', 'whose', 'which', 'what', 'where', 'when', 'why', 'how',
  'above', 'below', 'under', 'over', 'between', 'through', 'during', 'before', 'after',
  'out', 'into', 'upon', 'within', 'without', 'against', 'among', 'throughout',
  'use', 'used', 'using', 'user', 'make', 'made', 'making', 'take', 'took', 'taken',
  'give', 'given', 'giving', 'gave', 'get', 'got', 'getting', 'put', 'set',
  'see', 'saw', 'seen', 'know', 'knew', 'known', 'think', 'thought', 'feel',
  'part', 'parts', 'type', 'types', 'kind', 'kinds', 'form', 'forms', 'order',
  'way', 'ways', 'case', 'cases', 'fact', 'facts', 'point', 'points', 'place',
  'step', 'steps', 'method', 'methods', 'process', 'group', 'groups', 'item', 'items',
  'section', 'sections', 'name', 'names', 'apple', 'apples', 'dollar', 'dollars',
  'cent', 'cents', 'status', 'level', 'levels', 'page', 'pages', 'room', 'rooms'
]);

export const MATH_KEYWORDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch', 'log', 'ln', 'exp',
  'lim', 'det', 'sqrt', 'cbrt', 'frac', 'dfrac', 'sum', 'prod', 'int', 'iint', 'iiint', 'oint',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota',
  'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon',
  'phi', 'chi', 'psi', 'omega', 'gamma', 'delta', 'theta', 'lambda', 'xi', 'pi',
  'sigma', 'upsilon', 'phi', 'psi', 'omega', 'deg', 'circ', 'degree', 'textdegree',
  'times', 'div', 'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'equiv', 'quad', 'qquad',
  'dx', 'dy', 'dt', 'dz', 'du', 'dv', 'dr', 'dtheta', 'cm', 'mm', 'km', 'kg', 'rad',
  'infty', 'partial', 'nabla', 'cdot', 'cdots', 'ddots', 'vdots', 'to', 'rightarrow',
  'leftarrow', 'leftrightarrow', 'implies', 'iff', 'forall', 'exists', 'in', 'notin',
  'subset', 'subseteq', 'cup', 'cap', 'vert', 'parallel', 'perp', 'angle', 'triangle',
  'vec', 'hat', 'bar', 'overline', 'underline', 'tilde', 'mathbf', 'mathit', 'mathrm',
  'text', 'left', 'right', 'begin', 'end', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix',
  'cases', 'aligned', 'displaystyle', 'limits', 'nolimits', 'binom', 'bmod', 'pmod',
  'gcd', 'lcm', 'max', 'min', 'inf', 'sup', 'prime', 'bullet', 'star', 'oplus', 'otimes',
  'land', 'lor', 'wedge', 'vee', 'neg', 'sim', 'models', 'setminus', 'emptyset'
]);

/**
 * Checks if a string is solely a mathematical expression/formula (no continuous prose sentences).
 */
export function isPureMathString(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return false;

  // Reject multi-paragraph strings, markdown tables, and placeholder blocks
  if (trimmed.includes('\n\n') || trimmed.includes('__MD_TABLE_BLOCK_') || trimmed.includes('|')) {
    // Only allow single-line absolute values or matrix/cases environments
    if (!/^(?:\|[^|\n]+\||\\begin\{(?:vmatrix|pmatrix|bmatrix|matrix)\}[\s\S]*?\\end\{(?:vmatrix|pmatrix|bmatrix|matrix)\})$/.test(trimmed)) {
      return false;
    }
  }

  // Reject strings containing English questions or problem prompts
  if (
    trimmed.includes('?') ||
    /(?:^|\b)(?:what|which|find|calculate|evaluate|simplify|determine|solve|show\s+that|prove|given|suppose|assume|consider|express|identify|state|how\s+many|where|when|if\b|then\b|true|false|the\s+table|distribution|scores?|marks?|frequency|table)\b/i.test(
      trimmed
    )
  ) {
    return false;
  }

  // Never consider text containing option markers as a single pure math expression
  if (/(?:^|\s|\d)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(trimmed)) {
    return false;
  }

  // If already delimited by $...$ or $$...$$
  if ((trimmed.startsWith('$') && trimmed.endsWith('$')) || (trimmed.startsWith('$$') && trimmed.endsWith('$$'))) {
    // CRITICAL: check if there are internal $ delimiters indicating multiple math blocks e.g. "$x < 1$ or $x > 4$" or "$x < 1$ \text{ or } $x > 4$"
    const dollarCount = (trimmed.match(/\$/g) || []).length;
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && dollarCount === 4) {
      return true;
    }
    if (trimmed.startsWith('$') && !trimmed.startsWith('$$') && trimmed.endsWith('$') && !trimmed.endsWith('$$')) {
      if (dollarCount === 2) {
        // Verify inner content isn't a long English sentence accidentally wrapped in $...$
        const inner = trimmed.slice(1, -1).trim();
        const words = inner.match(/[a-zA-Z]{3,}/g) || [];
        const proseWords = words.filter((w) => COMMON_PROSE_WORDS.has(w.toLowerCase()) && !MATH_KEYWORDS.has(w.toLowerCase()));
        if (proseWords.length >= 3) {
          return false;
        }
        return true;
      }
      return false; // Multi-block or fragmented delimiters
    }
    return false;
  }

  // Reject common non-math slash abbreviations e.g. "N/A", "w/o", "and/or", "yes/no", "pass/fail", "true/false", "either A/B", "A/B"
  if (/^(?:n\/a|w\/o|a\/c|yes\/no|no\/yes|pass\/fail|fail\/pass|true\/false|false\/true|and\/or|either\/or|[a-zA-Z]\/[a-zA-Z])$/i.test(trimmed)) {
    return false;
  }

  // Reject 4-digit academic years or date strings e.g. "2023/2024", "15/03/2026"
  if (/^\d{4}\/\d{4}$/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    return false;
  }

  // Pure standalone numbers or single/double digit fractions e.g. "4", "-15", "3.1415", "1/2", "+100" (NOT 4-digit academic years like 2023/2024)
  if (/^[+\-]?(?:\d{1,3}(?:\/\d{1,3})|\d+(?:\.\d+)?)$/.test(trimmed)) {
    return true;
  }

  // Pure compound fraction or complete LaTeX fraction (nested or parenthesized)
  if (/^(?:\\left\(|\()?\s*\\?(?:d?frac)\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*(?:\\right\)|\))?$/.test(trimmed)) {
    return true;
  }

  // Pure fraction division e.g. "(3/4)/(5/6)", "(1/2) / (3/4)", "1/2 \div 3/4"
  if (/^(?:\([0-9\/\s+\-]+\)|[0-9\/\+\-]+)\s*(?:\/|÷|\\div)\s*(?:\([0-9\/\s+\-]+\)|[0-9\/\+\-]+)$/.test(trimmed)) {
    return true;
  }

  // Pure number or variable raised to fractional exponent e.g. "27^{1/3}", "(27)^{1/3}", "8^{-1/3}"
  if (/^[+\-]?(?:\([a-zA-Z0-9\+\-\s\/\\]+\)|[a-zA-Z0-9]+)\s*\^\s*\{(?:[+\-]?(?:\\(?:d?frac)\{[^{}]+\}\{[^{}]+\}|[0-9a-zA-Z+\-\\circ\s/]+))\}$/.test(trimmed) ||
      /^[+\-]?(?:\([a-zA-Z0-9\+\-\s\/\\]+\)|[a-zA-Z0-9]+)\s*\^\s*\(?[+\-]?[0-9a-zA-Z]+\/[0-9a-zA-Z]+\)?$/.test(trimmed)) {
    return true;
  }

  // Pure degree angles e.g. "90°", "180°", "270°", "360°", "45º", "90 deg", "90 degrees", "90^{\circ}", "90^o"
  if (/^[+\-]?\d+(?:\.\d+)?\s*(?:[°º]|deg|degrees|\^\{?\\circ\}?|\^[oO])$/i.test(trimmed)) {
    return true;
  }

  // Pure quantities with valid physical units and exponents e.g. "16 cm^2", "30 cm²", "60 m^3", "10 m/s", "-3m/s", "15 km/h", "5 rad"
  // DO NOT match ordinary English words like "5 apples", "10 students", "3 hours", "60 minutes", "40 questions"
  if (/^[+\-]?\d+(?:\.\d+)?\s*(?:(?:cm|mm|m|km|g|kg|mg|s|ms|rad|hz|khz|mhz|n|j|w|v|a|pa|kpa|bar|deg|°|º)(?:\^\{?[0-9+\-]+\}?|[²³¹⁰⁴⁵⁶⁷⁸⁹])?|m\/s(?:\^2)?|km\/h|cm\/s|rad\/s|\\text\{\s*(?:cm|mm|m|km|kg|g|s|m\/s|km\/h|rad)\s*\}\^\{?[0-9+\-]+\}?)$/i.test(trimmed)) {
    return true;
  }

  // Standalone math symbol or operator e.g. "⊕", "⊗", "⊙", "⊖", "∘", "•", "√", "±", "π", "∩", "∪", "∼"
  if (/^[⊕⊗⊙⊖∗∘•★☆∠∞∂∇√πθαβλμ°∩∪⊂⊆⊄∅∀∃→←↔⇒⇔∼∧∨¬′″]$/.test(trimmed)) {
    return true;
  }

  // Pure coordinate pairs or intervals e.g. "(2, 3)", "(-1, 5)", "[0, 2\pi]", "(-\infty, \infty)"
  if (/^[\(\[][+\-]?[\w\\^_{}.\s]+,\s*[+\-]?[\w\\^_{}.\s]+[\)\]]$/.test(trimmed)) {
    return true;
  }

  // Pure vector or matrix representation (including 2x2 fractional matrices, brackets, and matrix equations)
  if (/^\[(?:\[.*?\]|[\d\s,\.\+\-\/]+)+\]$/.test(trimmed) || /^(?:[a-zA-Z](?:_[a-zA-Z0-9]+)?\s*=\s*)?(?:[+\-]?(?:\\?(?:d?frac)\{[^{}]+\}\{[^{}]+\}|\d+(?:\/\d+)?)\s*)?\\begin\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix)\}[\s\S]*?\\end\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix)\}$/.test(trimmed)) {
    return true;
  }

  // Starts with explicit LaTeX command e.g. "\frac", "\int", "\sqrt", "\sum", "\lim", "\begin", "\vec", "\log", "\oplus", "\otimes"
  if (/^\\(?:frac|dfrac|sqrt|int|iint|iiint|oint|sum|prod|lim|det|binom|alpha|beta|gamma|delta|theta|lambda|pi|sigma|omega|begin|vec|partial|nabla|log|ln|sin|cos|tan|oplus|otimes|odot|ominus|circ|cdot|times|div|pm|mp|ast|star|cap|cup|wedge|vee|neg|sim)\b/.test(trimmed)) {
    // Check if there is extensive prose
    const words = trimmed.match(/[a-zA-Z]{3,}/g) || [];
    const nonMathWords = words.filter((w) => !MATH_KEYWORDS.has(w.toLowerCase()));
    if (nonMathWords.filter((w) => COMMON_PROSE_WORDS.has(w.toLowerCase())).length < 3) {
      return true;
    }
  }

  // Mathematical equations with formulas e.g. "f(x) = \int_{0}^{\infty} \frac{x^3}{e^x - 1} dx = \frac{\pi^4}{15}", "y = 3x^2 - 5x + 2", "8^{2q} = 16^3", "ab = a + b + 2"
  if (/^(?:[a-zA-Z]\([a-zA-Z0-9,\s]+\)|[a-zA-Z0-9\\^_{}()|\s+*\-./]+)\s*(?:=|<|>|<=|>=|\\le\b|\\ge\b|\\neq\b|\\approx\b|\\equiv\b|\\in\b|\\to\b|\\land\b|\\lor\b|\\implies\b|\\iff\b)\s*[\s\S]+$/.test(trimmed)) {
    // If LHS is a multi-letter common English label e.g. "Grade = A", "Total = 100", "Section = 1", "Score = 80", reject
    const lhsMatch = trimmed.match(/^([^=<>≤≥≠≈]+)\s*(?:=|<|>|<=|>=|\\le\b|\\ge\b|\\neq\b|\\approx\b|\\equiv\b|\\in\b|\\to\b)/);
    if (lhsMatch) {
      const lhs = lhsMatch[1].trim();
      if (/^[a-zA-Z]{2,}$/.test(lhs) && COMMON_PROSE_WORDS.has(lhs.toLowerCase())) {
        return false;
      }
    }
    // Check for prose sentences
    const words = trimmed.match(/[a-zA-Z]{2,}/g) || [];
    const proseMatches = words.filter((w) => {
      const lw = w.toLowerCase();
      return COMMON_PROSE_WORDS.has(lw) && !MATH_KEYWORDS.has(lw);
    });
    if (proseMatches.length > 0) {
      // If it contains prose words, it must have clear mathematical symbols like ^, _, \ or function notation f(x)
      if (!/[\^_\\]|[a-zA-Z]\([a-zA-Z0-9,\s]+\)/.test(trimmed)) {
        return false;
      }
    }
    if (proseMatches.length <= 1) {
      return true;
    }
  }

  // Check general mathematical algebraic tokens
  if (/^[a-zA-Z0-9\s+\-*\/^_()[\]{}=<>,.:;±≠≤≥≈√πθαβλμ°\\'|~⊕⊗⊙⊖∗∘•★☆∠∞∂∇∩∪⊂⊆⊄∅∀∃→←↔⇒⇔∼∧∨¬′″]+$/.test(trimmed)) {
    // Standalone letter pairs with slash e.g. "A/B", "X/Y" without any other math are not pure math
    if (/^[a-zA-Z]\/[a-zA-Z]$/.test(trimmed)) {
      return false;
    }

    const words = trimmed.match(/[a-zA-Z]{2,}/g) || [];
    const proseWords = words.filter((w) => {
      const lw = w.toLowerCase();
      return !MATH_KEYWORDS.has(lw);
    });

    if (proseWords.length === 0) return true;
    if (proseWords.length === 1 && /^[a-zA-Z]$/.test(proseWords[0])) return true;
    if (proseWords.some((w) => COMMON_PROSE_WORDS.has(w.toLowerCase()))) return false;
    if (proseWords.some((w) => w.length >= 4)) return false;

    if (/[=<>≤≥≠≈±√\\^_⊕⊗⊙⊖∗∘•★☆∠∞∂∇∩∪⊂⊆⊄∅∀∃→←↔⇒⇔∼∧∨¬′″']|\b(?:frac|dfrac|sqrt|sin|cos|tan|log|ln|det|lim|oplus|otimes|odot|ominus|cap|cup|wedge|vee|neg|sim|subset|subseteq|setminus)\b/.test(trimmed)) {
      return true;
    }
    if (/\d[a-zA-Z]|[a-zA-Z]\d|[a-zA-Z]\^[a-zA-Z0-9]|[a-zA-Z]_[a-zA-Z0-9]/.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Replaces Unicode math symbols and superscripts with standard LaTeX equivalents.
 */
export function normalizeUnicodeMath(text: string): string {
  if (!text) return '';

  return text
    // Unicode superscript fraction slashes and digits: e.g. 27¹/³, 27¹/², 9¹/², 8⁻¹/³, 16³/⁴
    .replace(/([0-9a-zA-Z\)])\s*([⁺⁻]?)[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+\s*[\/⁄∕]\s*[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g, (m, base) => {
      const supDigits: Record<string, string> = { '⁰':'0', '¹':'1', '²':'2', '³':'3', '⁴':'4', '⁵':'5', '⁶':'6', '⁷':'7', '⁸':'8', '⁹':'9', 'ⁿ':'n', '⁺':'+', '⁻':'-' };
      let exp = m.slice(base.length).trim().split('').map((c: string) => supDigits[c] || c).join('');
      return `${base}^{${exp}}`;
    })
    // Parenthesized general exponent with caret: e.g. 27^(1/3) -> 27^{1/3}, (16/81)^(-3/4) -> (16/81)^{-3/4}
    .replace(/([0-9a-zA-Z\)])\s*\^\s*\(([+\-]?[0-9a-zA-Z\.\/]+)\)/g, '$1^{$2}')
    // Caret with vulgar fractions: 27^½ -> 27^{1/2}, 27^⅓ -> 27^{1/3}
    .replace(/([0-9a-zA-Z\)])\s*\^\s*([+\-]?)½/g, '$1^{$2 1/2}')
    .replace(/([0-9a-zA-Z\)])\s*\^\s*([+\-]?)⅓/g, '$1^{$2 1/3}')
    .replace(/([0-9a-zA-Z\)])\s*\^\s*([+\-]?)⅔/g, '$1^{$2 2/3}')
    .replace(/([0-9a-zA-Z\)])\s*\^\s*([+\-]?)¼/g, '$1^{$2 1/4}')
    .replace(/([0-9a-zA-Z\)])\s*\^\s*([+\-]?)¾/g, '$1^{$2 3/4}')
    // Superscripts
    .replace(/([a-zA-Z0-9\)])⁰/g, '$1^0')
    .replace(/([a-zA-Z0-9\)])¹/g, '$1^1')
    .replace(/([a-zA-Z0-9\)])²/g, '$1^2')
    .replace(/([a-zA-Z0-9\)])³/g, '$1^3')
    .replace(/([a-zA-Z0-9\)])⁴/g, '$1^4')
    .replace(/([a-zA-Z0-9\)])⁵/g, '$1^5')
    .replace(/([a-zA-Z0-9\)])⁶/g, '$1^6')
    .replace(/([a-zA-Z0-9\)])⁷/g, '$1^7')
    .replace(/([a-zA-Z0-9\)])⁸/g, '$1^8')
    .replace(/([a-zA-Z0-9\)])⁹/g, '$1^9')
    .replace(/([a-zA-Z0-9\)])ⁿ/g, '$1^n')
    .replace(/([a-zA-Z0-9\)])⁺/g, '$1^+')
    .replace(/([a-zA-Z0-9\)])⁻/g, '$1^-')
    // Subscripts
    .replace(/([a-zA-Z0-9\)])₀/g, '$1_0')
    .replace(/([a-zA-Z0-9\)])₁/g, '$1_1')
    .replace(/([a-zA-Z0-9\)])₂/g, '$1_2')
    .replace(/([a-zA-Z0-9\)])₃/g, '$1_3')
    .replace(/([a-zA-Z0-9\)])₄/g, '$1_4')
    .replace(/([a-zA-Z0-9\)])₅/g, '$1_5')
    .replace(/([a-zA-Z0-9\)])₆/g, '$1_6')
    .replace(/([a-zA-Z0-9\)])₇/g, '$1_7')
    .replace(/([a-zA-Z0-9\)])₈/g, '$1_8')
    .replace(/([a-zA-Z0-9\)])₉/g, '$1_9')
    .replace(/([a-zA-Z0-9\)])ₙ/g, '$1_n')
    .replace(/([a-zA-Z0-9\)])ᵣ/g, '$1_r')
    // Greek Letters & Constants
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/ε/g, '\\epsilon ')
    .replace(/θ/g, '\\theta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/[π𝝅𝞹𝝿𝞹𝛑Π]/g, '\\pi ')
    .replace(/(?<=\d|\+|\-|\*|\/|\(|\s|^)pi(?=\s|\+|\-|\*|\/|\)|$)/g, '\\pi ')
    .replace(/σ/g, '\\sigma ')
    .replace(/ω/g, '\\omega ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/Σ/g, '\\Sigma ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/Φ/g, '\\Phi ')
    .replace(/Ψ/g, '\\Psi ')
    // Operators & Relations
    .replace(/±/g, '\\pm ')
    .replace(/∓/g, '\\mp ')
    .replace(/≠/g, '\\neq ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≈/g, '\\approx ')
    .replace(/≡/g, '\\equiv ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/∈/g, '\\in ')
    .replace(/∉/g, '\\notin ')
    .replace(/⊂/g, '\\subset ')
    .replace(/⊆/g, '\\subseteq ')
    .replace(/∪/g, '\\cup ')
    .replace(/∗/g, ' * ')
    .replace(/(?<=\d)\s*\*\s*(?=\d)|(?<=\b[a-zA-Z])\s*\*\s*(?=[a-zA-Z]\b)/g, ' * ')
    .replace(/∘/g, ' \\circ ')
    .replace(/[•●]/g, ' \\bullet ')
    .replace(/[★☆]/g, ' \\star ')
    .replace(/[△▲]/g, ' \\Delta ')
    .replace(/⊕/g, ' \\oplus ')
    .replace(/⊗/g, ' \\otimes ')
    .replace(/⊙/g, ' \\odot ')
    .replace(/⊥/g, ' \\perp ')
    .replace(/∥/g, ' \\parallel ')
    .replace(/[↕⇕]/g, ' \\updownarrow ')
    .replace(/[↔⇔]/g, ' \\Leftrightarrow ')
    .replace(/[←⇐]/g, ' \\leftarrow ')
    .replace(/[→⇒]/g, ' \\rightarrow ')
    .replace(/↑/g, ' \\uparrow ')
    .replace(/↓/g, ' \\downarrow ')
    .replace(/∇/g, ' \\nabla ')
    .replace(/∂/g, ' \\partial ')
    .replace(/∝/g, ' \\propto ')
    .replace(/[∧⋀]/g, ' \\wedge ')
    .replace(/[∨⋁]/g, ' \\vee ')
    .replace(/¬/g, ' \\neg ')
    .replace(/[∼~]/g, ' \\sim ')
    .replace(/′/g, "'")
    .replace(/″/g, "''")
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}')
    .replace(/∫/g, '\\int ')
    .replace(/∑/g, '\\sum ')
    .replace(/∏/g, '\\prod ')
    .replace(/∞/g, '\\infty ')
    .replace(/∠/g, '\\angle ');
}

/**
 * Converts degree representations (e.g. 30°, 45º, 30 deg, 45 degrees, 30^o, 30^{\ o }, 30^{ \circ }) to LaTeX degrees.
 */
export function normalizeDegrees(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\(?:textdegree|degree)\b/gi, '^{\\circ}')
    .replace(/\\ang\{([^}]+)\}/gi, '$1^{\\circ}')
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:deg|degrees)\b/gi, '$1^{\\circ}')
    .replace(/\^\{\s*\\?(?:circ|degree|textdegree|[oO])\s*\}/g, '^{\\circ}')
    .replace(/\^\{\s*o\s*\}/gi, '^{\\circ}')
    .replace(/\^[oO]\b/g, '^{\\circ}')
    .replace(/(\d+(?:\.\d+)?)\s*[°º]/g, '$1^{\\circ}')
    .replace(/([a-zA-Z\)])\s*[°º]/g, '$1^{\\circ}')
    .replace(/[°º]/g, '^{\\circ}')
    .replace(/\^\{\s*\\circ\s*\}/g, '^{\\circ}');
}

/**
 * Transforms inline fractions, calculus notations, logs, and matrices in plain text.
 */
export function transformMathPatterns(text: string): string {
  if (!text) return '';
  return text
    // For fractional indexes kindly use slash(/) to represent the fraction instead of the normal fraction bar:
    .replace(/\^\{\s*([+\-]?)?\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}\s*\}/g, '^{$1$2/$3}')
    .replace(/\^\{\s*\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}\s*\}/g, '^{$1/$2}')
    // Exponent fractions e.g. ^1/3, ^{1/3}, ^{-1/2}, ^-1/2, ^(1/3), ^{(1/2)}, ^{-(1/2)} -> ^{1/3}
    .replace(/\^\{\s*\(?\s*([+\-]?)(\d+)\/(\d+)\s*\)?\s*\}/g, '^{$1$2/$3}')
    .replace(/\^([+\-]?)(\d+)\/(\d+)(?=[\s\)\]\},;\.]|$)/g, '^{$1$2/$3}')
    .replace(/([0-9a-zA-Z\)])\s*\^\s*\(?\s*([+\-]?)(\d+)\/(\d+)\s*\)?/g, '$1^{$2$3/$4}')
    // Parenthesized fraction base with power: e.g. (16/81)^{-3/4}, (1/8)^{-1/3}, (3/4)^2, (1/2)^(-2)
    .replace(/\(\s*([+\-]?\d+)\/(\d+)\s*\)\s*\^\s*\{?\(?([+\-]?[0-9a-zA-Z\/\\]+)\)?\}?/g, (_m, num, den, pwr) => {
      const cleanPwr = pwr.replace(/\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
      return `\\left(\\frac{${num}}{${den}}\\right)^{${cleanPwr}}`;
    })
    // Parenthesized base with fractional exponent: e.g. (27)^{1/3}, (81)^(3/4), (27)^1/3, (1/8)^{-1/3}, (x + 1)^{1/2}
    .replace(/(\([a-zA-Z0-9\+\-\s\/\\]+?\))\s*\^\s*\{?\s*\(?\s*([+\-]?)(\d+)\/(\d+)\s*\)?\s*\}?/g, '$1^{$2$3/$4}')
    // Parenthesized general exponent with caret: e.g. 27^(1/3) -> 27^{1/3}, (16/81)^(-3/4) -> (16/81)^{-3/4}
    .replace(/([0-9a-zA-Z\)])\s*\^\s*\(([+\-]?[0-9a-zA-Z\.\/]+)\)/g, '$1^{$2}')
    // Numbers raised to fractional index without explicit caret: e.g. "(27 1/3)^2" or "(9 1/2)"
    .replace(/\(\s*([1-9]\d*)\s+([+\-]?)(\d+)\/(\d+)\s*\)/g, '($1^{$2$3/$4})')
    .replace(/\(\s*([1-9]\d*)\s*\\(?:d?frac)\{([^}]+)\}\{([^}]+)\}\s*\)/g, '($1^{$2/$3})')
    // Plain text fraction divided by fraction e.g. "(3/4) / (5/6)", "(1/2)/(3/4)" -> compound fraction
    .replace(/(?:\(\s*([+\-]?\d+)\/(\d+)\s*\)|([+\-]?\d+)\/(\d+))\s*(?:\/)\s*(?:\(\s*([+\-]?\d+)\/(\d+)\s*\)|([+\-]?\d+)\/(\d+))/g,
      (_m, n1, d1, n2, d2, n3, d3, n4, d4) => {
        const num1 = n1 || n2;
        const den1 = d1 || d2;
        const num2 = n3 || n4;
        const den2 = d3 || d4;
        return `\\dfrac{\\frac{${num1}}{${den1}}}{\\frac{${num2}}{${den2}}}`;
      }
    )
    // Plain text fraction divided by fraction with division symbol e.g. "(3/4) ÷ (5/6)", "1/2 \div 3/4"
    .replace(/(?:\(\s*([+\-]?\d+)\/(\d+)\s*\)|([+\-]?\d+)\/(\d+))\s*(?:÷|\\div)\s*(?:\(\s*([+\-]?\d+)\/(\d+)\s*\)|([+\-]?\d+)\/(\d+))/g,
      (_m, n1, d1, n2, d2, n3, d3, n4, d4) => {
        const num1 = n1 || n2;
        const den1 = d1 || d2;
        const num2 = n3 || n4;
        const den2 = d3 || d4;
        return `\\dfrac{${num1}}{${den1}} \\div \\dfrac{${num2}}{${den2}}`;
      }
    )
    // LaTeX fractions divided by slash e.g. "(\frac{1}{2})/(\frac{3}{4})", "\dfrac{3}{5} / \dfrac{4}{5}"
    .replace(/(?:\(\s*\\(?:d?frac)\{([^}]+)\}\{([^}]+)\}\s*\)|\\(?:d?frac)\{([^}]+)\}\{([^}]+)\})\s*(?:\/)\s*(?:\(\s*\\(?:d?frac)\{([^}]+)\}\{([^}]+)\}\s*\)|\\(?:d?frac)\{([^}]+)\}\{([^}]+)\})/g,
      (_m, n1, d1, n2, d2, n3, d3, n4, d4) => {
        const num1 = n1 || n2;
        const den1 = d1 || d2;
        const num2 = n3 || n4;
        const den2 = d3 || d4;
        return `\\dfrac{\\frac{${num1}}{${den1}}}{\\frac{${num2}}{${den2}}}`;
      }
    )
    // Numerical fractions like 1/2, 3/4, -1/2, inside matrices or text
    .replace(/(^|[\s\(\[\{=\+\-\*&]|\\\\)([+\-]?\d+)\/(\d+)(?=[\s\)\]\},;&]|$|\\\\)/g, (match, prefix, num, den, offset, fullStr) => {
      const before = fullStr.substring(0, offset);
      // For fractional indexes, use slash (/) instead of the normal fraction bar:
      if (/\^\{?[+\-]?$/.test(before)) {
        return `${prefix}${num}/${den}`;
      }
      if (/_\{?[+\-]?$/.test(before)) {
        return `${prefix}\\frac{${num}}{${den}}`;
      }
      // Reject 4-digit academic years like 2023/2024 or dates
      const numVal = Math.abs(parseInt(num, 10));
      const denVal = Math.abs(parseInt(den, 10));
      if (numVal > 999 || denVal > 999) {
        return match;
      }
      // Check if preceded by prose context like "academic year", "date", "scored", "marks", "test", "quiz", "page"
      if (/(?:academic|year|session|date|dated|scored?|marks?|test|quiz|page|step)\s*$/i.test(before)) {
        return match;
      }
      const lastBegin = before.lastIndexOf('\\begin{');
      const lastEnd = before.lastIndexOf('\\end{');
      const isInsideMatrix = lastBegin !== -1 && (lastEnd === -1 || lastBegin > lastEnd);
      if (isInsideMatrix) {
        if (num.startsWith('-')) {
          return `${prefix}-\\frac{${num.slice(1)}}{${den}}`;
        }
        return `${prefix}\\frac{${num}}{${den}}`;
      }
      if (num.startsWith('-')) {
        return `${prefix}-\\dfrac{${num.slice(1)}}{${den}}`;
      }
      return `${prefix}\\dfrac{${num}}{${den}}`;
    })
    // Algebraic derivatives & fractions
    .replace(/\bd\/dx\s*\(([^)]+)\)/gi, '\\dfrac{d}{dx}\\left($1\\right)')
    .replace(/\bdy\/dx\b/gi, '\\dfrac{dy}{dx}')
    .replace(/\bd\^2y\/dx\^2\b/gi, '\\dfrac{d^2y}{dx^2}')
    // Logarithms
    .replace(/\blog_([0-9a-zA-Z]+)\(([^)]+)\)/gi, '\\log_{$1}\\left($2\\right)')
    .replace(/\blog_([0-9a-zA-Z]+)\b/gi, '\\log_{$1}')
    .replace(/\bln\(([^)]+)\)/gi, '\\ln\\left($1\\right)')
    // Limits
    .replace(/\blim_\{?([a-zA-Z0-9]+)\s*(?:->|\\to)\s*([a-zA-Z0-9]+)\}?/gi, '\\lim_{$1 \\to $2}')
    // Determinants & Binomials
    .replace(/\bdet\(([A-Za-z0-9]+)\)/gi, '\\det\\left($1\\right)')
    .replace(/\bbinom\(([a-zA-Z0-9]+),\s*([a-zA-Z0-9]+)\)/gi, '\\binom{$1}{$2}');
}

/**
 * Ensures English words inside a LaTeX math delimiter ($...$) are properly formatted
 * with \text{...} or split into separate math expressions so KaTeX does not render words in italic multiplication typography.
 */
export function normalizeMathBlockContent(mathContent: string): string {
  if (!mathContent || !mathContent.trim()) return '';

  let str = mathContent.trim();
  // Strip any accidental internal dollar signs
  str = str.replace(/\$/g, ' ');

  str = normalizeUnicodeMath(str);
  str = normalizeDegrees(str);
  str = transformMathPatterns(str);

  // Escape unescaped % signs so KaTeX does not treat them as LaTeX comments
  str = str.replace(/(?<!\\)%/g, '\\%');

  // Escape unescaped & outside of matrix or aligned environments
  if (!/\\begin\{(?:pmatrix|bmatrix|vmatrix|matrix|cases|aligned)\}/.test(str)) {
    str = str.replace(/(?<!\\)&/g, '\\&');
  }

  // Escape unescaped # signs
  str = str.replace(/(?<!\\)#/g, '\\#');

  // 1. Format Probability / Set / Frequency notation: P(pass Mathematics), Pr(pass English), P(pass both), P(A and B), n(Mathematics)
  // Ensures words inside P(...) or Pr(...) or n(...) are wrapped in \text{...} so KaTeX does not concatenate letters into italics
  str = str.replace(/\b(P|Pr|n)\s*\(([^)]+)\)/g, (match, func, inner) => {
    const trimmedInner = inner.trim();
    if (trimmedInner.includes('\\text{')) return `${func}(${trimmedInner})`;

    let formattedInner = trimmedInner
      .replace(/\b(and|or|not)\b/gi, '\\text{ $1 }')
      .replace(/\b([a-zA-Z]{2,}(?:\s+[a-zA-Z]{2,})*)\b/g, (wMatch) => {
        if (MATH_KEYWORDS.has(wMatch.toLowerCase()) || wMatch.startsWith('\\')) return wMatch;
        return `\\text{${wMatch}}`;
      });
    return `${func}(${formattedInner})`;
  });

  // 2. Physical units with or without exponents: e.g. "m/s", "-3m/s", "10 m/s^2", "20 km/h", "16 cm^2"
  str = str.replace(/([+\-]?\d+(?:\.\d+)?)\s*(m\/s\^?2?|km\/h|cm\/s|rad\/s|m\/s|cm|mm|km|kg|ms|deg|rad)\b(?!\^)/gi, '$1\\text{ $2}');
  str = str.replace(/\b(cm|m|mm|km|kg|g|s|h|rad|deg)\^(\{?[0-9+\-]+\}?)/g, '\\text{ $1}^$2');

  // 3. Mathematical relation conversions: "x in R" -> "x \in R"
  str = str.replace(/(?<=\s|^)(?<!\\)in(?=\s|$)/g, '\\in ');

  // 4. If English connecting words appear inside the math block, wrap them with \text{...}
  // CRITICAL: (?<!\\) prevents converting LaTeX commands like \in, \sin, \cos into text
  str = str.replace(
    /(^|\s)(?<!\\)\b(or|and|if|where|for|when|with|such that|given that|let|from|to|is|between|at|on|of|then|as|by)\b(\s|$)(?![^}]*\})/gi,
    '$1\\text{ $2 }$3'
  );

  // 5. Repair any corrupted \tox or \toletter into \text{ to } $1
  str = str.replace(/\\to([a-zA-Z])/g, '\\text{ to } $1');

  return str;
}

/**
 * Auto-repairs strings that have unbalanced or missing single `$` math delimiters
 * (e.g. "x<1$ \text{ or } $x>4", "$90^{\circ }", "16\text{ cm}^2$").
 */
export function repairUnbalancedMathDelimiters(input: string): string {
  if (!input || typeof input !== 'string') return input;

  let str = input.trim();

  // Auto-repair broken mixed options like: "x<1$ \text{ or } $x>4", "x<1$ or $x>3", "x < 1$ \text{or} $x > 4"
  str = str.replace(
    /^([a-zA-Z0-9\s<>=+\-*/^_()|\\]+?)\$\s*(\\text\{[^}]*\}|\b(?:or|and|to|from|where|when|if)\b)\s*\$([a-zA-Z0-9\s<>=+\-*/^_()|\\]+)$/gi,
    (match, left, middle, right) => {
      const cleanLeft = left.trim();
      const cleanRight = right.trim();
      const cleanMid = middle.replace(/\\text\{\s*([^{}]+?)\s*\}/, '$1').trim();
      return `$${cleanLeft} \\text{ ${cleanMid} } ${cleanRight}$`;
    }
  );

  // Auto-repair corrupted option delimiter periods inside set/probability expressions:
  // e.g. "P(A \cap B. ?" -> "P(A \cap B) ?", "n(A \cap B. = 2" -> "n(A \cap B) = 2", "n(A \cup B. ?" -> "n(A \cup B) ?"
  str = str.replace(
    /\b(P|Pr|n)\s*\(\s*([a-zA-Z0-9\s\\_^{}]*(?:\\cap|\\cup|∩|∪)[a-zA-Z0-9\s\\_^{}]*?)\.(?=\s*[?=:,\)\$]|\s+what|\s+find|\s+where|\s+is|\s*$)/gi,
    '$1($2)'
  );
  str = str.replace(
    /(\(\s*[a-zA-Z0-9\s\\_^{}]*(?:\\cap|\\cup|∩|∪)[a-zA-Z0-9\s\\_^{}]*)\.(?=\s*[?=:,\)\$]|\s+what|\s+find|\s+where|\s+is|\s*$)/gi,
    '$1)'
  );
  str = str.replace(
    /\b(P|Pr|n)\s*\(([^)\n]+?)\.(?=\s*[?=:,\)\$]|\s+what|\s+find|\s+where|\s+is|\s*$)/gi,
    '$1($2)'
  );

  // If string starts with a single $ but has no other $
  if (str.startsWith('$') && !str.startsWith('$$') && (str.match(/\$/g) || []).length === 1) {
    return `${str}$`;
  }

  // If string ends with a single $ but has no other $
  if (str.endsWith('$') && !str.endsWith('$$') && (str.match(/\$/g) || []).length === 1) {
    return `$${str}`;
  }

  // If string contains LaTeX commands (like \circ, \frac, \sqrt) or ^ exponents without any $ at all
  if (
    !str.includes('$') &&
    (/(\^\{?\\circ\}?|\\(?:circ|frac|sqrt|alpha|beta|gamma|delta|theta|lambda|pi|pm|times|div|vec|hat|bar|binom)|[a-zA-Z0-9]+\^\{?[0-9+\-]+\}?)/.test(
      str
    ))
  ) {
    if (isPureMathString(str)) {
      return `$${str.trim()}$`;
    }
  }

  return str;
}

/**
 * Helper to safely apply regex replacements ONLY outside existing $...$ and $$...$$ math blocks.
 */
function replaceOutsideMath(text: string, regex: RegExp, replacer: (...args: any[]) => string): string {
  if (!text.includes('$')) {
    return text.replace(regex, replacer);
  }
  return text.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)|([^$]+)/g, (m, mathBlock, proseBlock) => {
    if (mathBlock) return mathBlock;
    if (proseBlock) return proseBlock.replace(regex, replacer);
    return m;
  });
}

/**
 * Formats inner expressions of probability P(...) or cardinality n(...) calls,
 * normalizing set operations (\cap, \cup) and wrapping prose words in \text{...}.
 */
function formatSetOrProbInner(inner: string): string {
  let formatted = inner.trim();
  formatted = formatted
    .replace(/∩/g, ' \\cap ')
    .replace(/∪/g, ' \\cup ')
    .replace(/\\cap\b/g, ' \\cap ')
    .replace(/\\cup\b/g, ' \\cup ')
    .replace(/\s+/g, ' ')
    .trim();

  // Conditional probability P(A|B) -> P(A \mid B)
  if (formatted.includes('|') && !formatted.includes('\\mid')) {
    formatted = formatted.replace(/\|/g, ' \\mid ');
  }

  // If prose words exist e.g. 'pass Mathematics'
  if (!formatted.includes('\\text{') && /[a-zA-Z]{3,}/.test(formatted)) {
    formatted = formatted.replace(/\b([a-zA-Z]{3,}(?:\s+[a-zA-Z]{3,})*)\b/g, (m) => {
      const lower = m.toLowerCase();
      if (['cap', 'cup', 'mid', 'subset', 'subseteq', 'and', 'or', 'not'].includes(lower) || m.startsWith('\\')) {
        return m;
      }
      return `\\text{${m}}`;
    });
  }
  return formatted;
}

/**
 * Parses a non-math plain text segment and wraps ONLY the embedded mathematical tokens,
 * equations, numbers, and variables into $...$, preserving standard English prose in standard typography.
 */
export function processProseSegment(segment: string): string {
  if (!segment || !segment.trim()) return segment;

  const trimmed = segment.trim();

  // If the entire segment is pure mathematics (e.g. "90°", "180°", "16 cm^2", "x^2 - 5x + 6 = 0", "3/4", "5", "-2", "\sqrt{7}", "-3m/s")
  if (isPureMathString(trimmed)) {
    let math = normalizeUnicodeMath(trimmed);
    math = normalizeDegrees(math);
    math = transformMathPatterns(math);
    math = normalizeMathBlockContent(math);
    return `$${math.trim()}$`;
  }

  let str = normalizeUnicodeMath(segment);
  str = normalizeDegrees(str);
  str = transformMathPatterns(str);

  // 0a. Matrix equations and standalone matrices: e.g. "M = \begin{pmatrix} ... \end{pmatrix}", "\begin{pmatrix} 1/2 & 3/4 \\ ... \end{pmatrix}", "A = \begin{pmatrix} ... \end{pmatrix}"
  // CRITICAL: Protect the entire matrix environment atomically so later polynomial/equation matchers never slice into it
  str = replaceOutsideMath(
    str,
    /(?:((?:[a-zA-Z0-9\s\\_^{}()\+\-\*\/=]+?\s*=\s*)?|(?:[+\-]?(?:\\?(?:d?frac)\{[^{}]+\}\{[^{}]+\}|\d+(?:\/\d+)?)\s*))(\\begin\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix)\}[\s\S]*?\\end\{(?:pmatrix|bmatrix|vmatrix|Bmatrix|matrix|smallmatrix)\}))/g,
    (match, eqPrefix, matrixBody) => {
      let cleanMatrix = matrixBody
        .replace(/([+\-]?\d+)\/(\d+)/g, (_m: string, num: string, den: string) => {
          if (num.startsWith('-')) return `-\\frac{${num.slice(1)}}{${den}}`;
          return `\\frac{${num}}{${den}}`;
        })
        .replace(/\\dfrac/g, '\\frac');
      let pfx = (eqPrefix || '').trim();
      let leadingWord = '';
      const leadMatch = pfx.match(/^(?:if|when|let|given(?:\s+that)?|where|suppose|since|for|as|that|show that|from|to|is|find\s+[a-zA-Z0-9]\s+if)\s+/i);
      if (leadMatch) {
        leadingWord = leadMatch[0];
        pfx = pfx.slice(leadMatch[0].length).trim();
      }
      return leadingWord + (pfx ? ` $${pfx} ${cleanMatrix}$ ` : ` $${cleanMatrix}$ `);
    }
  );

  // 0b. Expressions with fractional indices, powers of parenthesized expressions, and compound exponential operations
  // e.g. "(27^{1/3})^2 ÷ (9^{1/2})", "(16/81)^{-3/4}", "(x^{1/2} y^{1/3})^6", "8^{-1/3} ÷ 16^{3/4}", "27^{1/3}", "(27^{1/3})^2", "(1/8)^{-1/3}"
  const expPower = `(?:\\s*\\^\\s*(?:\\{(?:[^{}]|\\{[^{}]*\\})*\\}|\\([^\\)]+\\)|[0-9a-zA-Z+\\-]+))`;
  const expTerm = `(?:(?:\\\\left)?\\((?:[^\\(\\)\\n]|\\([^\\(\\)\\n]*\\))+(?:\\\\right)?\\)${expPower}?|[0-9a-zA-Z]+${expPower})`;
  const expOp = `(?:\\s*(?:÷|\\\\div|\\\\times|\\*|\\/|\\+|\\-|\\=|\\\\pm)\\s*)`;
  const compoundExpRegex = new RegExp(`(?:^|(?<=[\\s\\[]))(${expTerm}(?:${expOp}${expTerm})*)(?=(?:[\\s,;!?.\\]\\}]|$))`, 'g');

  str = replaceOutsideMath(
    str,
    compoundExpRegex,
    (match, expr) => {
      // Must contain an exponent or fraction or division symbol to avoid matching plain words
      if (!expr.includes('^') && !expr.includes('÷') && !expr.includes('\\div') && !expr.includes('/') && !expr.includes('*')) {
        return match;
      }
      // Do not match set theory operations or set complements (handled by dedicated set rules 1c)
      if (expr.includes('\\cap') || expr.includes('\\cup') || expr.includes('\\setminus') || expr.includes('\\subset') || expr.includes("^{'}") || expr.includes("^{\\'}") || expr.includes('\\prime')) {
        return match;
      }
      let cleanExpr = expr.trim()
        .replace(/÷/g, '\\div')
        .replace(/\*/g, '\\times');
      return match.replace(expr, `$${cleanExpr}$`);
    }
  );

  // 0c. Compound fractions and complete LaTeX fractions (nested or standalone, with or without parentheses)
  // e.g. "\frac{\frac{1}{2}}{\frac{3}{4}}", "(\frac{\frac{3}{5}}{\frac{4}{5}})", "\dfrac{\frac{a}{b}}{\frac{c}{d}}"
  str = replaceOutsideMath(
    str,
    /(?:\\left\(\s*|(?<=\s|^|\())\\?(?:d?frac)\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})(?:\s*\\right\)|(?=\s|[,;!?.)\]}]|$))/g,
    (match) => {
      let clean = match.trim();
      if (clean.startsWith('(') && clean.endsWith(')')) {
        clean = `\\left(${clean.slice(1, -1).trim()}\\right)`;
      }
      return ` $${clean}$ `;
    }
  );

  // 1a. Explicit Probability / Set equation matcher: e.g. "P(A) = 0.3", "P(B) = 0.4", "P(pass Mathematics) = 0.7", "n(A) = 5", "n(A \cap B) = 2"
  str = replaceOutsideMath(
    str,
    /\b(P|Pr|n)\s*\(([^)]+)\)\s*(=|<|>|<=|>=|\\le|\\ge|\\neq|\\approx)\s*([+\-]?[0-9a-zA-Z\.\/\%]+(?:\s*[\+\-\*\/]\s*[0-9a-zA-Z\.\/\%]+)*)/gi,
    (match, func, inner, op, val) => {
      return `$${func}(${formatSetOrProbInner(inner)}) ${op} ${val.trim()}$`;
    }
  );

  // 1b. Standalone Probability / Set: e.g. "P(A \cap B)", "P(A \cup B)", "n(A \cup B)", "n(A \cap B)", "P(A|B)", "P(A')", "n(A')", "P(A)", "n(B)"
  str = replaceOutsideMath(
    str,
    /\b(P|Pr|n)\s*\(([^)]+)\)(?=(?:[\s,;!?.)\]}]|$))/gi,
    (match, func, inner) => {
      return `$${func}(${formatSetOrProbInner(inner)})$`;
    }
  );

  // 1c. Set operations with \cap, \cup, \subset, \subseteq, \setminus: e.g. "A \cap B", "A \cup B", "(A \cup B)' \cap C'", "({A}^{'} \cap B) \cap {C}^{'}"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))([a-zA-Z0-9'\{\}\(\)\^\\_\s]*?\\(?:cap|cup|setminus|subset|subseteq)\s*[a-zA-Z0-9'\{\}\(\)\^\\_\s]+(?:\s*\\(?:cap|cup|setminus)\s*[a-zA-Z0-9'\{\}\(\)\^\\_\s]+)*)(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, expr) => {
      let clean = expr.trim();
      clean = clean.replace(/\{([a-zA-Z0-9]+)\}\^\{'\}/g, "$1'");
      clean = clean.replace(/\^\{'\}/g, "'");
      clean = clean.replace(/\{([a-zA-Z0-9]+)\}'/g, "$1'");
      return `$${clean}$`;
    }
  );

  // 1c2. Standalone complements with brackets e.g. "({A}^{'} \cap B)'", "(A \cup B)'"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\([a-zA-Z0-9'\{\}\(\)\^\\_\s]*?\\(?:cap|cup|setminus)[a-zA-Z0-9'\{\}\(\)\^\\_\s]*?\)\s*(?:'|\^\{'\}|\^\{?\\prime\}?)+)(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, expr) => {
      let clean = expr.trim();
      clean = clean.replace(/\{([a-zA-Z0-9]+)\}\^\{'\}/g, "$1'");
      clean = clean.replace(/\^\{'\}/g, "'");
      return `$${clean}$`;
    }
  );

  // 1c3. Logic operators: \wedge, \vee, \neg, \sim, \implies, \iff e.g. "P \wedge Q", "P \vee Q", "\sim P", "P \implies Q", "P \iff Q", "\sim (P \wedge Q)"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))([a-zA-Z0-9\(\)\s\\~]*?\\(?:wedge|vee|implies|iff|neg|sim)\s*[a-zA-Z0-9\(\)\s\\~]+(?:\s*\\(?:wedge|vee|implies|iff)\s*[a-zA-Z0-9\(\)\s\\~]+)*)(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, expr) => `$${expr.trim()}$`
  );
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\\(?:sim|neg)\s*[A-Za-z0-9\(\)]+)(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, expr) => `$${expr.trim()}$`
  );

  // 1d. Cardinality / Set absolute value: e.g. "|A \cap B| = 10", "|A \cup B|", "|M \cap S| = 30"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\|[^|\n]+\|(?:\s*(=|<|>|<=|>=|\\le|\\ge|\\neq)\s*[+\-]?[0-9a-zA-Z\.\/]+)?)(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, expr) => {
      return `$${expr.trim()}$`;
    }
  );

  // 1e. Mathematical set definitions e.g. "M = {0, 2, 6, 8}", "S = {1, 2, 3, 4}", "A = {x, y, z}"
  str = replaceOutsideMath(
    str,
    /\b([a-zA-Z])\s*=\s*\{([^}\n]+)\}/g,
    (match, varName, elems) => {
      return `$${varName} = \\{${elems.trim()}\\}$`;
    }
  );

  // 1f. Standalone set in prose e.g. "set {0, 2, 6, 8}", "elements in {1, 2, 3}"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(?:(set|elements\s+in|values\s+in)\s+)\{([^}\n]+)\}(?=(?:[\s,;!?.)\]}]|$))/gi,
    (match, prefix, elems) => {
      return `${prefix} $\\{${elems.trim()}\\}$`;
    }
  );

  // 1g. Binary operation equations e.g. "a \oplus b = a + b + 2", "6 \oplus 8 = 22", "x * y = x + y"
  const binOperand = '(?:[0-9]+(?:\\.[0-9]+)?|[a-zA-Z](?![a-zA-Z]))';
  const binOpPattern = '(\\\\(?:oplus|otimes|odot|ominus|circledast|ast|star)|[⊕⊗⊙⊖∗∘★☆])';

  str = replaceOutsideMath(
    str,
    new RegExp(
      `(?:^|(?<=[\\s\\(\\[]))(${binOperand})\\s*${binOpPattern}\\s*(${binOperand})\\s*(=|<|>|<=|>=|\\\\le|\\\\ge|\\\\neq)\\s*([a-zA-Z0-9\\(\\)\\{\\}\\^\\_\\+\\-\\*\\/\\\\|~]+(?:\\s*[\\+\\-\\*\\/]\\s*[a-zA-Z0-9\\(\\)\\{\\}\\^\\_\\+\\-\\*\\/\\\\|~]+)*)(?=(?:[\\),;!?:\.]|\\s+(?:find|where|for|when|and|or|then|if|which|given|is)|$))`,
      'gi'
    ),
    (match, left, op, right, rel, rhs) => {
      let latexOp = op;
      if (op === '⊕' || op === '\\oplus') latexOp = '\\oplus';
      else if (op === '⊗' || op === '\\otimes') latexOp = '\\otimes';
      else if (op === '⊙' || op === '\\odot') latexOp = '\\odot';
      else if (op === '⊖' || op === '\\ominus') latexOp = '\\ominus';
      else if (op === '∗' || op === '*') latexOp = '*';
      else if (op === '∘' || op === '\\circ') latexOp = '\\circ';
      return `$${left} ${latexOp} ${right} ${rel} ${rhs.trim()}$`;
    }
  );

  // 1h. Standalone binary operation expressions e.g. "6 ⊕ 8", "6 \oplus 8", "a \oplus b", "x \otimes y", "m \odot n"
  str = replaceOutsideMath(
    str,
    new RegExp(
      `(?:^|(?<=[\\s\\(\\[]))(${binOperand})\\s*${binOpPattern}\\s*(${binOperand})(?=(?:[\\s,;!?.)\\]}]|$))`,
      'g'
    ),
    (match, left, op, right) => {
      let latexOp = op;
      if (op === '⊕' || op === '\\oplus') latexOp = '\\oplus';
      else if (op === '⊗' || op === '\\otimes') latexOp = '\\otimes';
      else if (op === '⊙' || op === '\\odot') latexOp = '\\odot';
      else if (op === '⊖' || op === '\\ominus') latexOp = '\\ominus';
      else if (op === '∗' || op === '*') latexOp = '*';
      else if (op === '∘' || op === '\\circ') latexOp = '\\circ';
      return `$${left} ${latexOp} ${right}$`;
    }
  );

  // 1i. Standalone operator symbols in prose e.g. "The operation ⊕ is defined", "The operator \oplus"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\\(?:oplus|otimes|odot|ominus|circledast)|[⊕⊗⊙⊖])(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, op) => {
      let latexOp = op;
      if (op === '⊕' || op === '\\oplus') latexOp = '\\oplus';
      else if (op === '⊗' || op === '\\otimes') latexOp = '\\otimes';
      else if (op === '⊙' || op === '\\odot') latexOp = '\\odot';
      else if (op === '⊖' || op === '\\ominus') latexOp = '\\ominus';
      return `$${latexOp}$`;
    }
  );

  // 1j. Standalone unwrapped LaTeX commands in prose e.g. "\alpha", "\beta", "\theta", "\pi"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|infty|partial|nabla|sum|prod|int|sqrt|frac|pm|mp|times|div|leq|geq|neq|approx|equiv|sim|propto|perp|parallel|angle|triangle|deg|circ)\b(?:\{[^}]*\})*(?:\{[^}]*\})*)(?=(?:[\s,;!?.)\]}]|$))/g,
    (match, cmd) => `$${cmd.trim()}$`
  );

  // 2. Unified Equation & Relation Matcher (e.g. "s(t) = t^3 - 6t^2 + 9t", "y = 3x^2", "x = 0", "t = 2", "\sqrt{5x^2 - 36} = x - 2", "x^2 - 5x + 6 = 0", "2x + 3 = 7")
  // CRITICAL: Strictly stops before sentence periods (". Its", ". What"), colons (":"), question marks ("?"), option markers, and connecting English words ("is", "at", "where", "find", "and", "or")
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[\{]))([a-zA-Z0-9\(\)\{\}\^\_\+\-\*\/\\|~]+(?:\s*[\+\-\*\/]\s*[a-zA-Z0-9\(\)\{\}\^\_\+\-\*\/\\|~]+)*)\s*(=|<|>|<=|>=|\\le(?![a-zA-Z])|\\ge(?![a-zA-Z])|\\neq(?![a-zA-Z])|\\approx(?![a-zA-Z])|\\equiv(?![a-zA-Z]))\s*([a-zA-Z0-9\(\)\{\}\^\_\+\-\*\/\\|~]+(?:\s*[\+\-\*\/]\s*[a-zA-Z0-9\(\)\{\}\^\_\+\-\*\/\\|~]+)*)(?=(?:[\),;!?:\.]|\s+(?:find|where|for|when|and|or|then|if|which|given|with|such|from|to|is|between|at|in|$|\(?[A-E][\.\)\:\-]|\[[A-E]\]|Option\s+[A-E])|$))/gi,
    (match, leftSide, relation, rightSide) => {
      let trimmedLeft = leftSide.trim();
      let trimmedRight = rightSide.trim();

      // Ensure neither left nor right side includes option markers e.g. "A." or "B."
      if (/(?:^|\s)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(trimmedRight) ||
          /(?:^|\s)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(trimmedLeft)) {
        return match;
      }

      // If starts with common English starter word (e.g. "If", "When", "Let", "Given", "Suppose"), peel it off
      const leadingWordMatch = trimmedLeft.match(/^(if|when|let|given|where|suppose|since|for|as|that|show that|from|to|is)\s+/i);
      let prefix = '';
      if (leadingWordMatch) {
        prefix = leadingWordMatch[0];
        trimmedLeft = trimmedLeft.slice(prefix.length).trim();
      }

      // If trailing ends with English words, peel them
      const trailingWordMatch = trimmedRight.match(/\s+(and|or|then|if|when|where|for|find|given|with|from|to|is)$/i);
      let suffix = '';
      if (trailingWordMatch) {
        suffix = trailingWordMatch[0];
        trimmedRight = trimmedRight.slice(0, -suffix.length).trim();
      }

      // Check if left or right contains multi-word prose
      const wordsLeft = trimmedLeft.match(/[a-zA-Z]{3,}/g) || [];
      const wordsRight = trimmedRight.match(/[a-zA-Z]{3,}/g) || [];
      const hasProse = [...wordsLeft, ...wordsRight].some((w: string) => COMMON_PROSE_WORDS.has(w.toLowerCase()));
      if (hasProse) return match;
      if (trimmedLeft.includes('$') || trimmedRight.includes('$')) return match;

      return `${prefix}$${trimmedLeft} ${relation} ${trimmedRight}$${suffix}`;
    }
  );

  // 2b. Factored or parenthesized algebraic expressions: e.g. "(x + 2)^3", "(x + 2)(x - 3)", "(2x - 1)^2", "(x - 4)(2x + 5)"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\([a-zA-Z0-9\s\+\-\*\/\^\_]+\)(?:\([a-zA-Z0-9\s\+\-\*\/\^\_]+\)|\^\{?[a-zA-Z0-9+\-]+\}?)+)(?=(?:[\),;!?:\.]|\s|$))/gi,
    (match, factored) => {
      if (factored.includes('$')) return match;
      return ` $${factored.trim()}$ `;
    }
  );

  // 2c. Multi-term Algebraic Expressions & Polynomials without equals sign
  // e.g. "2x^2 - 5x + 3", "x^3 - 4x^2 + x - 6", "3a^2 - 2ab + b^2", "4x^2 - 9y^2", "ax^2 + bx + c", "2x - 5", "8^{2/3} + 4^{1/2}"
  // Strictly requires mathematical variables, exponents, or coefficients to prevent matching English words/hyphenated words
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))((?:[+\-]?\s*(?:\d+(?:\.\d+)?[a-zA-Z]?|[a-zA-Z]|\\(?:d?frac|sqrt|sin|cos|tan|log|ln)\b[^\s,;!?)]*))(?:\^\{(?:[+\-]?(?:\\(?:d?frac)\{[^{}]+\}\{[^{}]+\}|[a-zA-Z0-9+\-\\circ\s/]+))\}|\^\{?[a-zA-Z0-9+\-\\circ\s]+\}?|_\{?[a-zA-Z0-9+\-]+\}?)*(?:\s*[\+\-\*\/]\s*(?:\d+(?:\.\d+)?[a-zA-Z]?|[a-zA-Z]|\\(?:d?frac|sqrt|sin|cos|tan|log|ln)\b[^\s,;!?)]*)(?:\^\{(?:[+\-]?(?:\\(?:d?frac)\{[^{}]+\}\{[^{}]+\}|[a-zA-Z0-9+\-\\circ\s/]+))\}|\^\{?[a-zA-Z0-9+\-\\circ\s]+\}?|_\{?[a-zA-Z0-9+\-]+\}?)*)+)(?=(?:[\),;!?:\.]|\s+(?:is|at|where|find|for|when|and|or|then|if|which|given|with|such|from|to|$|\(?[A-E][\.\)\:\-]|\[[A-E]\]|Option\s+[A-E])|$))/gi,
    (match, expr) => {
      const trimmedExpr = expr.trim();
      if (trimmedExpr.includes('$')) return match;
      // Do not swallow option markers or slash abbreviations
      if (/(?:^|\s)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(trimmedExpr)) return match;
      if (/^(?:n\/a|w\/o|a\/b|x\/y|p\/q|m\/f|yes\/no|true\/false)$/i.test(trimmedExpr)) return match;
      // Extract all words of 2 or more letters
      const words = trimmedExpr.match(/[a-zA-Z]{2,}/g) || [];
      const hasProse = words.some((w: string) => COMMON_PROSE_WORDS.has(w.toLowerCase()) && !MATH_KEYWORDS.has(w.toLowerCase()));
      if (hasProse) return match;
      // Reject if it contains any non-math English word >= 3 chars (e.g. "student - class")
      const nonMathWords = words.filter((w: string) => !MATH_KEYWORDS.has(w.toLowerCase()));
      if (nonMathWords.some((w: string) => w.length >= 3)) return match;
      // Must contain at least one explicit mathematical signal: exponent (^), subscript (_), LaTeX command (\), coefficient+variable (e.g. 2x, 5y), or single variables around operators
      const hasMathSignal = /[\^\_\\]|\d[a-zA-Z]|[a-zA-Z]\d|\b[xyzabckmnpqrstuvw]\s*[\+\-\*\/]|[\+\-\*\/]\s*[xyzabckmnpqrstuvw]\b/i.test(trimmedExpr);
      if (!hasMathSignal) return match;
      return ` $${trimmedExpr}$ `;
    }
  );

  // 3. Physical quantities and units e.g. "-3m/s", "1m/s", "10 m/s^2", "15 km/h", "20 cm/s", "45 rad/s"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))([+\-]?\d+(?:\.\d+)?)\s*(m\/s\^?2?|km\/h|cm\/s|rad\/s|m\/s)\b(?=(?:[\s,;!?.)\]]|$))/gi,
    (match, num, unit) => {
      if (match.includes('$')) return match;
      return `$${num}\\text{ ${unit}}$`;
    }
  );

  // 4. Radicals & LaTeX commands e.g. \sqrt{...}, \frac{...}{...}, \lim_{...}, \det(...)
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\\(?:sqrt|frac|dfrac|alpha|beta|gamma|delta|theta|lambda|pi|sigma|omega|Delta|Sigma|Omega|pm|mp|int|sum|prod|log|ln|sin|cos|tan|det|lim|circ|binom|cap|cup|subset|subseteq|setminus|emptyset|mid|times|cdot)\b(?:\\left\([^)]*\\right\)|\([a-zA-Z0-9\s,]+\)|[^\s,;!?)]*))(?=(?:[\s,;!?)]|$))/g,
    (match, cmd) => {
      if (cmd.includes('$')) return match;
      return ` $${cmd.trim()}$ `;
    }
  );

  // 5. Standalone fractions e.g. 1/2, 3/4 (reject 4-digit academic years like 2023/2024, dates, or scores like 15/20)
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(?<!\b(?:year|session|academic|date|dated|page|score|scored|marks?|test|quiz|out\s+of)\s+)(\d{1,3}\/\d{1,3})(?!(?:\/\d+|\b\/\b))(?=(?:[\s,;!?)]|$))/gi,
    (match, frac) => {
      if (frac.includes('$')) return match;
      const [numStr, denStr] = frac.split('/');
      const num = parseInt(numStr, 10);
      const den = parseInt(denStr, 10);
      if (num > 999 || den > 999 || den === 0) return match;
      return ` $\\dfrac{${num}}{${den}}$ `;
    }
  );

  // 6. Units with exponents e.g. "16 cm^2", "30 cm²", "60 m^3"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\d+(?:\.\d+)?\s*(?:cm|m|mm|km|kg|g|s|h|rad|deg)\^\{?[0-9+\-]+\}?)(?=(?:[\s,;!?)]|$))/gi,
    (match, val) => {
      if (val.includes('$')) return match;
      const formatted = val.replace(/\b(cm|m|mm|km|kg|g|s|h|rad|deg)\^(\{?[0-9+\-]+\}?)/gi, '\\text{$1}^$2');
      return ` $${formatted.trim()}$ `;
    }
  );

  // 7. Exponents / Powers / Subscripts on monomial variables/numbers e.g. "x^2", "8^{2q}", "T_{r+1}", "(2x + 3)^5", "3x^3", "27^{1/3}"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\[]))((?:\([a-zA-Z0-9\+\-\s\/\\]+?\)|[a-zA-Z0-9]+)(?:\^\{(?:[+\-]?(?:\\(?:d?frac)\{[^{}]+\}\{[^{}]+\}|[a-zA-Z0-9+\-\\circ\s/]+))\}|\^\{?[a-zA-Z0-9+\-\\circ\s]+\}?|_\{?[a-zA-Z0-9+\-]+\}?)[a-zA-Z0-9]*)(?=(?:[\s,;!?)]|$))/g,
    (match, term) => {
      if (term.includes('$')) return match;
      if (/(?:^|\s)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(term)) return match;
      // Do not convert ordinary prose words that don't have caret or underscore
      if (!/[\^\_]/.test(term)) return match;
      // Reject snake_case words like user_id, student_id, quiz_code where base is >= 2 letters
      if (term.includes('_')) {
        const basePart = term.split('_')[0].replace(/[()]/g, '');
        if (basePart.length >= 2 && !/^(?:log|ln|lim)$/i.test(basePart)) {
          return match;
        }
      }
      // For fractional indexes kindly use slash(/) to represent the fraction instead of the normal fraction bar:
      let cleanTerm = term.replace(/\^\{\s*([+\-]?)?\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}\s*\}/g, '^{$1$2/$3}');
      return ` $${cleanTerm.trim()}$ `;
    }
  );

  // 8. Degree terms e.g. "90^{\circ}", "180^{\circ}"
  str = replaceOutsideMath(
    str,
    /(?:^|(?<=[\s\(\[]))(\d+(?:\.\d+)?\s*\^\{\s*\\?circ\s*\})(?=(?:[\s,;!?)]|$))/g,
    (match, dVal) => {
      if (dVal.includes('$')) return match;
      return ` $${dVal.trim()}$ `;
    }
  );

  // 9. Isolated mathematical variable indicators e.g. "for x", "find q", "values of x", "let x", "at x"
  // Must be a recognized single-letter mathematical variable, never the indefinite article 'a' or English pronouns/prepositions
  str = replaceOutsideMath(
    str,
    /\b(for|find|variable|solve for|in terms of|root|roots|value of|values of|let|at)\s+([b-zB-Z])\b(?!\s*[\$])/g,
    (match, p1, p2) => `${p1} $${p2}$`
  );

  // Clean up any double delimiters or awkward space before punctuation
  str = str
    .replace(/\${2,}/g, '$')
    .replace(/\$\s*\$/g, '')
    .replace(/\$\s*([^$]+?)\s*\$/g, '$$$1$$')
    .replace(/\$\s*,\s*/g, '$, ')
    .replace(/\$\s*\.\s*/g, '$. ')
    .replace(/\$\s*\?\s*/g, '$? ')
    .replace(/\$\s*:\s*/g, '$: ')
    .replace(/\$\s*;\s*/g, '$; ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  return str;
}

/**
 * Formats table cells cleanly while preserving table layout and delimiters
 */
export function formatMarkdownTable(tableBlock: string): string {
  if (!tableBlock) return '';
  const lines = tableBlock.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const formattedLines: string[] = [];

  for (const line of lines) {
    if (!line.startsWith('|')) {
      formattedLines.push(line);
      continue;
    }
    const inner = line.replace(/^\|\s*|\s*\|$/g, '');
    const cells = inner.split('|').map((c) => c.trim());

    // Check if separator line e.g. |---|---|
    if (cells.every((c) => /^[\-:\s]+$/.test(c))) {
      formattedLines.push(`| ${cells.map(() => '---').join(' | ')} |`);
      continue;
    }

    const formattedCells = cells.map((cell) => {
      if (!cell) return ' ';
      let norm = normalizeUnicodeMath(cell).trim();
      // Circled and special binary operators
      if (norm === '⊕' || norm === '\\oplus') return '$\\oplus$';
      if (norm === '⊗' || norm === '\\otimes') return '$\\otimes$';
      if (norm === '⊙' || norm === '\\odot') return '$\\odot$';
      if (norm === '⊖' || norm === '\\ominus') return '$\\ominus$';
      if (norm === '∗' || norm === '*') return '$*$';
      if (norm === '∘' || norm === '\\circ') return '$\\circ$';
      if (norm === '×' || norm === '\\times') return '$\\times$';
      if (norm === '÷' || norm === '\\div') return '$\\div$';
      if (norm === '±' || norm === '\\pm') return '$\\pm$';
      if (norm === '√' || norm === '\\sqrt') return '$\\sqrt{}$';

      // If already wrapped in $...$
      if (norm.startsWith('$') && norm.endsWith('$')) {
        return norm;
      }

      // If pure math formula with variables or exponents (e.g. x^2, \frac{a}{b}, 2x + 1)
      if (isPureMathString(norm) && !/^\d+$/.test(norm) && !/^[a-zA-Z]$/.test(norm)) {
        return `$${norm}$`;
      }

      return norm;
    });

    formattedLines.push(`| ${formattedCells.join(' | ')} |`);
  }

  return formattedLines.join('\n');
}

/**
 * Master formatting engine to detect and convert plain text math equations & symbols into LaTeX wrapped in $...$.
 *
 * Guarantees:
 * - Normal English words are kept in natural typography outside math delimiters.
 * - Equations, symbols, numbers, and formulas are cleanly wrapped in $...$ for KaTeX.
 * - Markdown tables are preserved intact without pipes turning into math delimiters.
 * - Options and question statements retain readable font rendering.
 */
export function formatMathTextToLatex(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // 1. Detect and protect Markdown tables from being mangled by regex or pipe conversion
  const tableBlocks: string[] = [];
  const tableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|(?:\s*:?-+:?\s*\|)+\r?\n(?:\|[^\n]+\|\r?\n?)*)/g;

  let maskedText = text.replace(tableRegex, (_, tableContent) => {
    const formattedTable = formatMarkdownTable(tableContent);
    tableBlocks.push(formattedTable);
    return `\n\n__MD_TABLE_BLOCK_${tableBlocks.length - 1}__\n\n`;
  });

  // First auto-repair unbalanced or missing single delimiters
  const repaired = repairUnbalancedMathDelimiters(maskedText);

  // Split text by existing $...$ and $$...$$ blocks
  const segments: { content: string; isMath: boolean }[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?!\$)(?:[^\$\n]|\n(?!\s*\n))+?\$)/g;
  let match: RegExpExecArray | null;
  let lastIdx = 0;

  while ((match = mathRegex.exec(repaired)) !== null) {
    if (match.index > lastIdx) {
      segments.push({
        content: repaired.substring(lastIdx, match.index),
        isMath: false,
      });
    }

    segments.push({
      content: match[0],
      isMath: true,
    });

    lastIdx = mathRegex.lastIndex;
  }

  if (lastIdx < repaired.length) {
    segments.push({
      content: repaired.substring(lastIdx),
      isMath: false,
    });
  }

  // If no math delimiters were found at all
  let result = '';
  if (segments.length === 0) {
    result = processProseSegment(repaired);
  } else {
    // Process non-math prose segments while preserving and cleaning existing math blocks
    const processedSegments = segments.map((seg) => {
      if (seg.isMath) {
        const isBlock = seg.content.startsWith('$$');
        const inner = isBlock ? seg.content.slice(2, -2) : seg.content.slice(1, -1);
        const cleanedInner = normalizeMathBlockContent(inner);
        return isBlock ? `$$${cleanedInner}$$` : `$${cleanedInner}$`;
      } else {
        return processProseSegment(seg.content);
      }
    });

    result = processedSegments.join('');
  }

  // Restore preserved Markdown tables
  tableBlocks.forEach((tbl, idx) => {
    result = result.replace(`__MD_TABLE_BLOCK_${idx}__`, `\n\n${tbl}\n\n`);
  });

  // Clean up any empty math tags or redundant spaces safely while preserving $$ display blocks and newlines
  result = result
    .replace(/\$\s*\$/g, '')
    .replace(/\${3,}/g, '$$')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

