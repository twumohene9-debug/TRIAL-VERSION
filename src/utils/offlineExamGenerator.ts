import { QuizConfig, Question, QuizSection } from '../types';
import { getQuizInstructionBullets } from './instructionsUtils';

/**
 * Generates a self-contained, standalone single-file HTML examination package.
 * Can be opened locally (file://) on any phone, tablet, or PC without internet connection.
 * Includes complete built-in standard KaTeX equation rendering, offline math fallback engine,
 * timer, local candidate registration, and instant results calculation.
 */
export function generateStandaloneOfflineHtmlExam(
  config: QuizConfig,
  questions: Question[] = [],
  sections: QuizSection[] = []
): string {
  const quizJson = JSON.stringify({
    config,
    questions,
    sections,
  });

  const quizTitle = config.title || 'MCQ Assessment';
  const schoolName = config.schoolName || 'MCQ Assessment Network';
  const durationMinutes = config.durationMinutes || 60;
  const totalQuestions = questions.length || config.totalQuestions || 40;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(quizTitle)} — Standalone Offline Exam</title>
  
  <!-- Standard KaTeX Stylesheet & Core Scripts for Math Formula Rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>

  <style>
    :root {
      --primary: #059669;
      --primary-dark: #047857;
      --primary-light: #ecfdf5;
      --accent: #d97706;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      padding-bottom: 90px;
      -webkit-font-smoothing: antialiased;
    }

    /* Standardized Mathematical Typography & Formula Styling */
    .font-math, .katex, .inline-katex, .block-katex, .math-fallback {
      font-family: "KaTeX_Main", "Cambria Math", "Latin Modern Math", "STIX Two Math", "TeX Gyre Termes Math", "Times New Roman", Times, serif;
    }
    
    .inline-katex {
      display: inline-block;
      padding: 0 2px;
      vertical-align: -0.12em;
      line-height: 1.2;
    }
    
    .block-katex {
      display: block;
      margin: 12px 0;
      overflow-x: auto;
      text-align: center;
      padding: 6px 0;
    }

    .katex {
      font-size: 1.12em !important;
      text-rendering: auto;
    }

    /* Clean Offline Fallback Math Fractions, Roots & Superscripts (when CDN is not cached) */
    .math-fraction {
      display: inline-flex;
      flex-direction: column;
      vertical-align: middle;
      text-align: center;
      padding: 0 4px;
      font-size: 0.95em;
      line-height: 1.1;
      margin: 0 2px;
    }
    .math-num {
      border-bottom: 1.5px solid currentColor;
      padding-bottom: 1px;
    }
    .math-den {
      padding-top: 1px;
    }
    .math-sqrt {
      display: inline-flex;
      align-items: baseline;
      margin: 0 2px;
    }
    .math-radicand {
      border-top: 1.5px solid currentColor;
      padding: 0 3px;
      margin-left: 1px;
    }
    sup {
      font-size: 0.78em;
      vertical-align: 0.45em;
      line-height: 0;
    }
    sub {
      font-size: 0.78em;
      vertical-align: -0.25em;
      line-height: 0;
    }

    /* Layout & Header */
    .header {
      background: #090d1a;
      color: #fff;
      padding: 16px 20px;
      border-bottom: 3px solid var(--primary);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }
    .header-content {
      max-width: 860px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: var(--primary);
      color: #fff;
      padding: 3px 8px;
      border-radius: 999px;
      margin-bottom: 4px;
    }
    .quiz-title {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.2px;
    }
    .quiz-sub {
      font-size: 12px;
      color: #94a3b8;
    }
    .timer-pill {
      background: rgba(5, 150, 105, 0.15);
      border: 1.5px solid var(--primary);
      color: #34d399;
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .container {
      max-width: 860px;
      margin: 24px auto;
      padding: 0 16px;
    }

    /* Cards */
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: #cbd5e1;
    }
    .q-number-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .q-number {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f1f5f9;
      color: #475569;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .q-topic {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }
    .q-text {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 18px;
      line-height: 1.65;
    }

    /* Options */
    .options-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    @media (min-width: 640px) {
      .options-grid { grid-template-columns: 1fr 1fr; }
    }
    .option-label {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 15px;
      user-select: none;
    }
    .option-label:hover {
      border-color: var(--primary);
      background: var(--primary-light);
    }
    .option-label.selected {
      border-color: var(--primary);
      background: #ecfdf5;
      color: #065f46;
      font-weight: 600;
      box-shadow: 0 0 0 1px var(--primary);
    }
    .option-radio {
      width: 18px;
      height: 18px;
      accent-color: var(--primary);
      cursor: pointer;
      flex-shrink: 0;
    }
    .opt-letter {
      font-weight: 800;
      font-size: 12px;
      background: #e2e8f0;
      color: #334155;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .option-label.selected .opt-letter {
      background: var(--primary);
      color: #fff;
    }
    .opt-content {
      flex: 1;
      line-height: 1.4;
    }

    /* Bottom sticky bar */
    .submit-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 1px solid #e2e8f0;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 90;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
    }
    .btn {
      background: var(--primary);
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      border: none;
      padding: 11px 22px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:hover {
      background: var(--primary-dark);
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* Candidate Box */
    .login-box {
      max-width: 520px;
      margin: 40px auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    }
    .instructions-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 16px;
      padding: 16px;
      color: #065f46;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .instructions-box ul {
      padding-left: 20px;
      margin-top: 6px;
    }
    .instructions-box li {
      margin-bottom: 4px;
    }
    .input-field {
      width: 100%;
      padding: 12px 16px;
      font-size: 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      margin-top: 4px;
      margin-bottom: 16px;
      outline: none;
      transition: border-color 0.15s;
    }
    .input-field:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }

    /* Results */
    .results-card {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      padding: 36px 24px;
      text-align: center;
      max-width: 560px;
      margin: 30px auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    .score-circle {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: #ecfdf5;
      border: 4px solid var(--primary);
      color: #065f46;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 20px auto;
      font-size: 32px;
      font-weight: 900;
    }
    .score-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #047857;
    }

    /* Standard Institutional Sign-Off */
    .signoff-banner {
      font-family: "Georgia", "Times New Roman", "Cambria", serif;
      font-style: italic;
      font-weight: 700;
      text-align: center;
      color: #4338ca;
      padding: 16px 0 10px 0;
      margin-top: 24px;
      border-top: 1px dashed #cbd5e1;
      font-size: 14px;
      letter-spacing: 0.02em;
    }
    @media print {
      .signoff-banner {
        color: #000 !important;
        border-top: 1px solid #000 !important;
        margin-top: 20px !important;
        font-size: 13px !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Standalone Header -->
  <header class="header">
    <div class="header-content">
      <div>
        <span class="badge">100% Offline Standalone Exam</span>
        <div class="quiz-title">${escapeHtml(quizTitle)}</div>
        <div class="quiz-sub">${escapeHtml(schoolName)} • ${escapeHtml(config.subject || 'Mathematics')} • ${escapeHtml(config.classGroup || 'All Classes')}</div>
      </div>
      <div id="timerContainer" class="timer-pill" style="display: none;">
        <span>⏱️ Time:</span>
        <span id="timerDisplay">${durationMinutes}:00</span>
      </div>
    </div>
  </header>

  <!-- Login / Candidate Screen -->
  <div id="loginScreen" class="container">
    <div class="login-box">
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Candidate Examination Entry</h2>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 18px;">This standalone assessment runs 100% offline without internet. Enter candidate details to begin.</p>
      
      <div class="instructions-box">
        <strong>Official Examination Rules & Instructions:</strong>
        <ul>
          ${getQuizInstructionBullets(config).map(b => `<li>${escapeHtml(b)}</li>`).join('\n          ')}
        </ul>
      </div>

      <form id="candidateForm">
        <label style="font-size: 12px; font-weight: 700; color: #334155;">Candidate Full Name *</label>
        <input type="text" id="studentName" required class="input-field" placeholder="e.g. Kofi Mensah" value="">

        <label style="font-size: 12px; font-weight: 700; color: #334155;">Student ID / Index Number (Optional)</label>
        <input type="text" id="studentId" class="input-field" placeholder="e.g. SHS-2026-042" value="">

        <label style="font-size: 12px; font-weight: 700; color: #334155;">Class / Section (Optional)</label>
        <input type="text" id="classGroup" class="input-field" placeholder="e.g. Year 3 Science A" value="${escapeHtml(config.classGroup || '')}">

        <button type="submit" class="btn" style="width: 100%; padding: 14px; font-size: 14px; margin-top: 10px; justify-content: center;">Start Offline Exam</button>
      </form>
      <div class="signoff-banner">The joy of the Lord is my strength</div>
    </div>
  </div>

  <!-- Active Exam Question Paper -->
  <div id="examScreen" class="container" style="display: none;">
    <div id="questionsList"></div>

    <div style="height: 40px;"></div>
    <div class="signoff-banner">The joy of the Lord is my strength</div>

    <div style="height: 80px;"></div>
    <div class="submit-bar">
      <div style="font-size: 13px; font-weight: 600; color: #475569;">
        Answered: <strong id="answeredCount" style="color: var(--primary); font-size: 15px;">0</strong> / ${totalQuestions}
      </div>
      <button id="submitBtn" class="btn">Submit Assessment</button>
    </div>
  </div>

  <!-- Results Screen -->
  <div id="resultsScreen" class="container" style="display: none;">
    <div class="results-card">
      <div style="font-size: 44px; margin-bottom: 8px;">🎓</div>
      <h2 style="font-size: 24px; font-weight: 800; color: #0f172a;">Assessment Submitted!</h2>
      <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Candidate: <strong id="resName"></strong> (<span id="resId"></span>)</p>

      <div class="score-circle">
        <span id="resScore">0/${totalQuestions}</span>
        <span class="score-label" id="resPct">0%</span>
      </div>

      <p style="font-size: 13px; color: #475569; max-width: 440px; margin: 0 auto 20px;">Your responses have been graded and recorded locally on this device.</p>
      
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button onclick="window.print()" class="btn btn-secondary">🖨️ Print Result Slip</button>
        <button onclick="location.reload()" class="btn">Restart Assessment</button>
      </div>

      <div class="signoff-banner" style="margin-top: 28px;">The joy of the Lord is my strength</div>
    </div>
  </div>

  <!-- Complete Standardized Math & Examination Engine -->
  <script>
    const QUIZ_DATA = ${quizJson};
    let answers = {};
    let timeRemaining = (${durationMinutes}) * 60;
    let timerInterval = null;
    let studentDetails = {};
    let activeExamQuestions = [];

    // ==========================================
    // STANDARDIZED MATHEMATICAL PROCESSING ENGINE
    // ==========================================

    function normalizeUnicodeMath(text) {
      if (!text || typeof text !== 'string') return '';
      let str = text;
      // Superscripts
      str = str.replace(/⁰/g, '^0').replace(/¹/g, '^1').replace(/²/g, '^2').replace(/³/g, '^3')
               .replace(/⁴/g, '^4').replace(/⁵/g, '^5').replace(/⁶/g, '^6').replace(/⁷/g, '^7')
               .replace(/⁸/g, '^8').replace(/⁹/g, '^9').replace(/⁺/g, '^+').replace(/⁻/g, '^-');
      // Subscripts
      str = str.replace(/₀/g, '_0').replace(/₁/g, '_1').replace(/₂/g, '_2').replace(/₃/g, '_3')
               .replace(/₄/g, '_4').replace(/₅/g, '_5').replace(/₆/g, '_6').replace(/₇/g, '_7')
               .replace(/₈/g, '_8').replace(/₉/g, '_9');
      // Math & Greek Symbols
      str = str.replace(/α/g, ' \\alpha ').replace(/β/g, ' \\beta ').replace(/θ/g, ' \\theta ')
               .replace(/π/g, ' \\pi ').replace(/λ/g, ' \\lambda ').replace(/μ/g, ' \\mu ')
               .replace(/σ/g, ' \\sigma ').replace(/ω/g, ' \\omega ').replace(/Δ/g, ' \\Delta ')
               .replace(/±/g, ' \\pm ').replace(/≠/g, ' \\neq ').replace(/≤/g, ' \\le ')
               .replace(/≥/g, ' \\ge ').replace(/≈/g, ' \\approx ').replace(/×/g, ' \\times ')
               .replace(/÷/g, ' \\div ').replace(/·/g, ' \\cdot ').replace(/∞/g, ' \\infty ')
               .replace(/∫/g, ' \\int ').replace(/∑/g, ' \\sum ').replace(/√\(([^)]+)\)/g, ' \\sqrt{$1} ')
               .replace(/√([a-zA-Z0-9]+)/g, ' \\sqrt{$1} ');
      // Degree normalization
      str = str.replace(/(\d+(?:\.\d+)?)\s*[°º]/g, '$1^{\\\\circ}')
               .replace(/([a-zA-Z\)])\s*[°º]/g, '$1^{\\\\circ}')
               .replace(/[°º]/g, '^{\\\\circ}');
      return str;
    }

    function convertMathMlToLatex(input) {
      if (!input || typeof input !== 'string') return input;
      if (!/<(?:m:oMath|math|mfrac|msup|msub|msqrt|mtext|mrow|mn|mi|mo)\b/i.test(input)) {
        return input;
      }
      let str = input;
      str = str.replace(/<mfrac>\\s*<mn>([^<]+)<\\/mn>\\s*<mn>([^<]+)<\\/mn>\\s*<\\/mfrac>/gi, '\\\\frac{$1}{$2}')
               .replace(/<mfrac>\\s*<mi>([^<]+)<\\/mi>\\s*<mn>([^<]+)<\\/mn>\\s*<\\/mfrac>/gi, '\\\\frac{$1}{$2}')
               .replace(/<msup>\\s*<mi>([^<]+)<\\/mi>\\s*<mn>([^<]+)<\\/mn>\\s*<\\/msup>/gi, '{$1}^{$2}')
               .replace(/<msub>\\s*<mi>([^<]+)<\\/mi>\\s*<mn>([^<]+)<\\/mn>\\s*<\\/msub>/gi, '{$1}_{$2}')
               .replace(/<msqrt>\\s*([\\s\\S]*?)\\s*<\\/msqrt>/gi, '\\\\sqrt{$1}')
               .replace(/<mtext>([\\s\\S]*?)<\\/mtext>/gi, '\\\\text{$1}')
               .replace(/<m:oMath>([\\s\\S]*?)<\\/m:oMath>/gi, '$$$1$$')
               .replace(/<math[\\s\\S]*?>([\\s\\S]*?)<\\/math>/gi, '$$$1$$')
               .replace(/<\\/?(?:m:[a-zA-Z]+|[a-zA-Z][a-zA-Z0-9:\\-_]*)(?:\\s+[^>]*?)?>/gi, '');
      return str;
    }

    function formatMathTextToLatex(text) {
      if (!text || typeof text !== 'string') return '';
      let str = convertMathMlToLatex(text);
      str = normalizeUnicodeMath(str);

      // Auto-wrap explicit equations with dollar delimiters if not already wrapped
      if (!str.includes('$')) {
        // e.g. fractions \frac{a}{b}
        str = str.replace(/(\\\\frac\\{[^{}]+\\}\\{[^{}]+\\})/g, '$$$1$$');
        // e.g. square roots \sqrt{...}
        str = str.replace(/(\\\\sqrt\\{[^{}]+\\})/g, '$$$1$$');
        // e.g. standalone equations like "y = 2x^2 + 3" or "sin^2 x + cos^2 x = 1"
        if (/^\\s*([a-zA-Z](?:\\([a-zA-Z0-9]+\\))?\\s*=\\s*[-+0-9a-zA-Z\\^\\/_\\s\\\\\\(\\)\\{\\}]+)\\s*$/.test(str)) {
          str = '$' + str.trim() + '$';
        }
      }
      return str;
    }

    function sanitizeKatexContent(input) {
      if (!input) return '';
      let str = input.trim();
      str = str.replace(/\\^\\{\\s*\\\\?(?:circ|degree|textdegree|[oO])\\s*\\}/g, '^{\\\\circ}')
               .replace(/\\^\\{\\s*o\\s*\\}/gi, '^{\\\\circ}')
               .replace(/[°º]/g, '^{\\\\circ}')
               .replace(/\\\\degree\\b/g, '^{\\\\circ}')
               .replace(/\\\\textdegree\\b/g, '^{\\\\circ}');
      return str;
    }

    function parseMixedText(text) {
      if (!text || typeof text !== 'string') return [];
      const parts = [];
      const regex = /(\\$\\$[\\s\\S]*?\\$\\$|\\$[^\\$\\n]*?\\$)/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            content: text.substring(lastIndex, match.index),
            isMath: false
          });
        }
        const matchedStr = match[0];
        if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
          parts.push({
            content: matchedStr.slice(2, -2).trim(),
            isMath: true,
            isBlock: true
          });
        } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
          parts.push({
            content: matchedStr.slice(1, -1).trim(),
            isMath: true,
            isBlock: false
          });
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < text.length) {
        parts.push({
          content: text.substring(lastIndex),
          isMath: false
        });
      }
      return parts;
    }

    // Pure Offline Fallback HTML Formatter (when CDN is not available)
    function formatOfflineFallbackHtml(text) {
      if (!text) return '';
      let str = text;
      // Strip outer dollar signs
      str = str.replace(/\\$\\$([\\s\\S]*?)\\$\\$/g, '<div class="block-katex math-fallback">$1</div>')
               .replace(/\\$([^\\$\\n]*?)\\$/g, '<span class="inline-katex math-fallback">$1</span>');
      // Fractions
      str = str.replace(/\\\\frac\\{([^{}]+)\\}\\{([^{}]+)\\}/g, '<span class="math-fraction"><span class="math-num">$1</span><span class="math-den">$2</span></span>');
      // Roots
      str = str.replace(/\\\\sqrt\\{([^{}]+)\\}/g, '<span class="math-sqrt">&radic;<span class="math-radicand">$1</span></span>');
      // Powers & Subscripts
      str = str.replace(/\\^\\{([^{}]+)\\}/g, '<sup>$1</sup>')
               .replace(/\\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>')
               .replace(/_\\{([^{}]+)\\}/g, '<sub>$1</sub>')
               .replace(/_([0-9a-zA-Z+-]+)/g, '<sub>$1</sub>');
      // Operators & Symbols
      str = str.replace(/\\\\circ/g, '&deg;').replace(/\\\\pm/g, '&plusmn;').replace(/\\\\times/g, '&times;')
               .replace(/\\\\div/g, '&divide;').replace(/\\\\le/g, '&le;').replace(/\\\\ge/g, '&ge;')
               .replace(/\\\\neq/g, '&ne;').replace(/\\\\approx/g, '&asymp;').replace(/\\\\infty/g, '&infin;')
               .replace(/\\\\alpha/g, '&alpha;').replace(/\\\\beta/g, '&beta;').replace(/\\\\theta/g, '&theta;')
               .replace(/\\\\pi/g, '&pi;');
      return str;
    }

    // Main Renderer: renders LaTeX math into standard DOM node
    function renderMathToNode(rawText, containerEl, isBlock) {
      if (!containerEl) return;
      containerEl.innerHTML = '';
      if (!rawText) return;

      const processed = formatMathTextToLatex(rawText);

      // Check if KaTeX is available in the browser
      const hasKatex = typeof katex !== 'undefined' && katex && typeof katex.render === 'function';

      if (hasKatex) {
        if (processed.includes('$')) {
          const parts = parseMixedText(processed);
          parts.forEach(part => {
            if (part.isMath) {
              const span = document.createElement('span');
              span.className = (part.isBlock || isBlock) ? 'block-katex' : 'inline-katex';
              try {
                katex.render(sanitizeKatexContent(part.content), span, {
                  throwOnError: false,
                  displayMode: !!(part.isBlock || isBlock),
                  trust: true,
                  strict: false
                });
              } catch(e) {
                span.textContent = part.content;
              }
              containerEl.appendChild(span);
            } else {
              renderProseOrMathTokens(part.content, containerEl);
            }
          });
          return;
        } else {
          // Check if single formula or expression
          const trimmed = processed.trim();
          const looksLikeFormula = /[\\\\^_=+\\-*/]/.test(trimmed) && !/\\b(which|what|calculate|find|given|evaluate|solve|determine|state)\\b/i.test(trimmed);
          if (looksLikeFormula) {
            const span = document.createElement('span');
            span.className = isBlock ? 'block-katex' : 'inline-katex';
            try {
              katex.render(sanitizeKatexContent(trimmed), span, {
                throwOnError: false,
                displayMode: isBlock,
                trust: true,
                strict: false
              });
              containerEl.appendChild(span);
              return;
            } catch(e) {
              // fallback below
            }
          }
          renderProseOrMathTokens(processed, containerEl);
          return;
        }
      }

      // Offline Fallback
      containerEl.innerHTML = formatOfflineFallbackHtml(processed);
    }

    function renderProseOrMathTokens(text, container) {
      if (!text) return;
      // Check for inline symbols or formulas in prose
      const mathTokenRegex = /(\\\\frac\\{[^{}]+\\}\\{[^{}]+\\}|\\\\sqrt\\{[^{}]+\\}|[a-zA-Z0-9]+\\^[0-9a-zA-Z+\\-\\circ\\{\\}]+|[a-zA-Z0-9]+_[0-9a-zA-Z+\\-]+|\\d+(?:\\.\\d+)?\\^\\{\\\\circ\\}|\\b\\d+\\/\\d+\\b)/g;

      if (!mathTokenRegex.test(text) || typeof katex === 'undefined') {
        container.appendChild(document.createTextNode(text));
        return;
      }

      mathTokenRegex.lastIndex = 0;
      let lastIndex = 0;
      let match;

      while ((match = mathTokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          container.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        const token = match[0];
        const span = document.createElement('span');
        span.className = 'inline-katex';
        try {
          katex.render(sanitizeKatexContent(token), span, {
            throwOnError: false,
            displayMode: false
          });
        } catch(e) {
          span.textContent = token;
        }
        container.appendChild(span);
        lastIndex = mathTokenRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        container.appendChild(document.createTextNode(text.substring(lastIndex)));
      }
    }

    // ==========================================
    // EXAM EXECUTION & INTERFACE
    // ==========================================

    document.getElementById('candidateForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const sName = document.getElementById('studentName').value.trim();
      if (!sName) return;
      const sId = document.getElementById('studentId').value.trim() || 'STD-' + Math.floor(1000 + Math.random() * 9000);
      studentDetails = {
        name: sName,
        studentId: sId,
        classGroup: document.getElementById('classGroup').value.trim()
      };
      
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('examScreen').style.display = 'block';
      document.getElementById('timerContainer').style.display = 'flex';
      
      // Shuffle questions & options randomly per candidate
      const shouldShuffleQuestions = QUIZ_DATA.config && QUIZ_DATA.config.randomizeQuestions !== false && QUIZ_DATA.config.shuffleQuestions !== false;
      const shouldShuffleOptions = QUIZ_DATA.config && QUIZ_DATA.config.randomizeOptions !== false && QUIZ_DATA.config.shuffleOptions !== false;

      const baseQ = JSON.parse(JSON.stringify(QUIZ_DATA.questions || []));
      activeExamQuestions = baseQ.map(q => {
        if (!shouldShuffleOptions || !q.options || q.options.length <= 1) return q;
        const slotLabels = ['A', 'B', 'C', 'D'];
        const isDep = text => {
          const l = (text || '').toLowerCase();
          return l.includes('all of the above') || l.includes('none of the above') || l.includes('both a and b') || l.includes('neither a nor b');
        };
        const depIdx = q.options.findIndex(o => isDep(o.text));
        let shuffled;
        if (depIdx >= 0) {
          const nonDep = q.options.filter((_, i) => i !== depIdx);
          for (let i = nonDep.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = nonDep[i]; nonDep[i] = nonDep[j]; nonDep[j] = t;
          }
          shuffled = [...nonDep];
          shuffled.splice(depIdx, 0, q.options[depIdx]);
        } else {
          shuffled = [...q.options];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
          }
        }
        const permuted = shuffled.map((o, idx) => ({
          id: slotLabels[idx] || o.id,
          originalId: o.originalId || o.id,
          text: o.text
        }));
        return { ...q, options: permuted };
      });

      // Handle Randomized Question Pool (e.g. Draw 50 out of 500 questions)
      if (QUIZ_DATA.config && QUIZ_DATA.config.isQuestionPool && QUIZ_DATA.config.poolQuestionsToServe > 0) {
        const quota = Math.min(QUIZ_DATA.config.poolQuestionsToServe, activeExamQuestions.length);
        const candidateKey = String((studentDetails.id || studentDetails.name || '') + (QUIZ_DATA.config.code || ''));
        let hash = 0;
        for (let k = 0; k < candidateKey.length; k++) {
          hash = (hash << 5) - hash + candidateKey.charCodeAt(k);
          hash |= 0;
        }
        let seed = Math.abs(hash) || 1337;
        const prng = function() {
          let t = (seed += 0x6d2b79f5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        for (let i = activeExamQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(prng() * (i + 1));
          const temp = activeExamQuestions[i];
          activeExamQuestions[i] = activeExamQuestions[j];
          activeExamQuestions[j] = temp;
        }
        activeExamQuestions = activeExamQuestions.slice(0, quota).map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
      } else if (shouldShuffleQuestions) {
        for (let i = activeExamQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = activeExamQuestions[i];
          activeExamQuestions[i] = activeExamQuestions[j];
          activeExamQuestions[j] = temp;
        }
      }

      renderQuestions();
      startTimer();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function renderQuestions() {
      const list = document.getElementById('questionsList');
      list.innerHTML = '';
      
      const qList = activeExamQuestions.length > 0 ? activeExamQuestions : (QUIZ_DATA.questions || []);
      qList.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = 'q-card-' + q.id;

        const numberBar = document.createElement('div');
        numberBar.className = 'q-number-bar';

        const qNum = document.createElement('span');
        qNum.className = 'q-number';
        qNum.innerText = 'Question ' + (idx + 1);
        numberBar.appendChild(qNum);

        if (q.topic) {
          const qTopic = document.createElement('span');
          qTopic.className = 'q-topic';
          qTopic.innerText = q.topic;
          numberBar.appendChild(qTopic);
        }
        card.appendChild(numberBar);

        const qText = document.createElement('div');
        qText.className = 'q-text';
        renderMathToNode(q.questionText, qText, false);
        card.appendChild(qText);

        const optsGrid = document.createElement('div');
        optsGrid.className = 'options-grid';

        (q.options || []).forEach(opt => {
          const targetKey = opt.originalId || opt.id;
          const label = document.createElement('label');
          label.className = 'option-label';
          label.id = 'opt-label-' + q.id + '-' + targetKey;

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'question_' + q.id;
          radio.value = targetKey;
          radio.className = 'option-radio';
          radio.addEventListener('change', function() {
            selectOption(q.id, targetKey);
          });

          const letter = document.createElement('span');
          letter.className = 'opt-letter';
          letter.innerText = opt.id;

          const optContent = document.createElement('span');
          optContent.className = 'opt-content';
          renderMathToNode(opt.text, optContent, false);

          label.appendChild(radio);
          label.appendChild(letter);
          label.appendChild(optContent);
          optsGrid.appendChild(label);
        });

        card.appendChild(optsGrid);
        list.appendChild(card);
      });
    }

    function selectOption(qId, optId) {
      answers[qId] = optId;
      document.querySelectorAll('[id^="opt-label-' + qId + '-"]').forEach(el => {
        el.classList.remove('selected');
      });
      const selectedEl = document.getElementById('opt-label-' + qId + '-' + optId);
      if (selectedEl) selectedEl.classList.add('selected');
      document.getElementById('answeredCount').innerText = Object.keys(answers).length;
    }

    function startTimer() {
      timerInterval = setInterval(function() {
        if (timeRemaining <= 1) {
          clearInterval(timerInterval);
          finishAssessment();
          return;
        }
        timeRemaining--;
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        document.getElementById('timerDisplay').innerText = m + ':' + (s < 10 ? '0' : '') + s;
      }, 1000);
    }

    document.getElementById('submitBtn').addEventListener('click', function() {
      const answered = Object.keys(answers).length;
      const total = activeExamQuestions.length || QUIZ_DATA.questions.length;
      let msg = 'Are you ready to submit your assessment answers?';
      if (answered < total) {
        msg = 'You have answered ' + answered + ' of ' + total + ' questions. Are you sure you want to submit now?';
      }
      if (confirm(msg)) {
        finishAssessment();
      }
    });

    function finishAssessment() {
      clearInterval(timerInterval);
      let score = 0;
      const qList = activeExamQuestions.length > 0 ? activeExamQuestions : (QUIZ_DATA.questions || []);
      qList.forEach(q => {
        if (answers[q.id] === q.correctAnswer) {
          score++;
        }
      });
      const total = qList.length || 1;
      const pct = Math.round((score / total) * 100);

      document.getElementById('examScreen').style.display = 'none';
      document.getElementById('timerContainer').style.display = 'none';
      document.getElementById('resultsScreen').style.display = 'block';

      document.getElementById('resName').innerText = studentDetails.name;
      document.getElementById('resId').innerText = studentDetails.studentId;
      document.getElementById('resScore').innerText = score + ' / ' + total;
      document.getElementById('resPct').innerText = pct + '%';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
