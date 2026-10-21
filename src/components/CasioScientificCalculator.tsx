import React, { useState } from 'react';
import { X, RotateCcw, Minus, Move } from 'lucide-react';

interface CasioScientificCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CasioScientificCalculator: React.FC<CasioScientificCalculatorProps> = ({ isOpen, onClose }) => {
  const [expression, setExpression] = useState<string>('');
  const [displayResult, setDisplayResult] = useState<string>('0');
  const [historyAns, setHistoryAns] = useState<string>('0');
  const [isShift, setIsShift] = useState<boolean>(false);
  const [isAlpha, setIsAlpha] = useState<boolean>(false);
  const [isHyp, setIsHyp] = useState<boolean>(false);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');
  const [isFractionView, setIsFractionView] = useState<boolean>(false);
  const [fractionResult, setFractionResult] = useState<{ num: number; den: number } | null>(null);

  if (!isOpen) return null;

  // Convert decimal to simple fraction
  const decimalToFraction = (val: number): { num: number; den: number } | null => {
    if (isNaN(val) || !isFinite(val) || Math.abs(val) > 1e6) return null;
    if (Number.isInteger(val)) return { num: val, den: 1 };
    const tolerance = 1.0e-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = val;
    do {
      const a = Math.floor(b);
      let aux = h1;
      h1 = a * h1 + h2;
      h2 = aux;
      aux = k1;
      k1 = a * k1 + k2;
      k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(val - h1 / k1) > val * tolerance && k1 < 10000);

    return { num: h1, den: k1 };
  };

  const handleClearAll = () => {
    setExpression('');
    setDisplayResult('0');
    setIsShift(false);
    setIsAlpha(false);
    setIsHyp(false);
    setIsFractionView(false);
    setFractionResult(null);
  };

  const handleDelete = () => {
    setExpression((prev) => {
      if (!prev) return '';
      // Delete multi-character tokens like sin(, cos(, tan(, etc.
      const tokens = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√( ', '∛( ', '10^('];
      for (const t of tokens) {
        if (prev.endsWith(t)) {
          return prev.slice(0, -t.length);
        }
      }
      return prev.slice(0, -1);
    });
  };

  const insertToken = (token: string) => {
    setExpression((prev) => prev + token);
    setIsShift(false);
    setIsAlpha(false);
    setIsHyp(false);
  };

  const evaluateExpression = () => {
    if (!expression.trim()) return;
    try {
      let expr = expression;

      // Replace constants
      expr = expr.replace(/π/g, `(${Math.PI})`);
      expr = expr.replace(/\be\b/g, `(${Math.E})`);
      expr = expr.replace(/Ans/g, `(${historyAns})`);

      // Replace operations
      expr = expr.replace(/×/g, '*');
      expr = expr.replace(/÷/g, '/');
      expr = expr.replace(/−/g, '-');

      // Powers: x² -> **2, x³ -> **3, ^ -> **
      expr = expr.replace(/²/g, '**2');
      expr = expr.replace(/³/g, '**3');
      expr = expr.replace(/\^/g, '**');

      // Square roots and cube roots
      expr = expr.replace(/∛\(([^)]+)\)/g, 'Math.cbrt($1)');
      expr = expr.replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)');
      expr = expr.replace(/√([0-9.]+)/g, 'Math.sqrt($1)');

      // Factorial: n!
      expr = expr.replace(/(\d+)!/g, (_, n) => {
        let num = parseInt(n, 10);
        if (num < 0 || num > 170) return 'NaN';
        let f = 1;
        for (let i = 2; i <= num; i++) f *= i;
        return `(${f})`;
      });

      // Hyperbolics
      expr = expr.replace(/sinh\(([^)]+)\)/g, 'Math.sinh($1)');
      expr = expr.replace(/cosh\(([^)]+)\)/g, 'Math.cosh($1)');
      expr = expr.replace(/tanh\(([^)]+)\)/g, 'Math.tanh($1)');

      // Inverse Trigonometrics
      if (angleMode === 'DEG') {
        expr = expr.replace(/sin⁻¹\(([^)]+)\)/g, '(Math.asin($1) * (180 / Math.PI))');
        expr = expr.replace(/cos⁻¹\(([^)]+)\)/g, '(Math.acos($1) * (180 / Math.PI))');
        expr = expr.replace(/tan⁻¹\(([^)]+)\)/g, '(Math.atan($1) * (180 / Math.PI))');
      } else {
        expr = expr.replace(/sin⁻¹\(([^)]+)\)/g, 'Math.asin($1)');
        expr = expr.replace(/cos⁻¹\(([^)]+)\)/g, 'Math.acos($1)');
        expr = expr.replace(/tan⁻¹\(([^)]+)\)/g, 'Math.atan($1)');
      }

      // Standard Trigonometrics
      if (angleMode === 'DEG') {
        expr = expr.replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * (Math.PI / 180))');
        expr = expr.replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * (Math.PI / 180))');
        expr = expr.replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * (Math.PI / 180))');
      } else {
        expr = expr.replace(/sin\(([^)]+)\)/g, 'Math.sin($1)');
        expr = expr.replace(/cos\(([^)]+)\)/g, 'Math.cos($1)');
        expr = expr.replace(/tan\(([^)]+)\)/g, 'Math.tan($1)');
      }

      // Logarithms
      expr = expr.replace(/log\(([^)]+)\)/g, 'Math.log10($1)');
      expr = expr.replace(/ln\(([^)]+)\)/g, 'Math.log($1)');

      // Scientific Exp: 10^(x)
      expr = expr.replace(/10\^\(([^)]+)\)/g, '(10**($1))');

      // Combinatorics: nPr and nCr
      expr = expr.replace(/(\d+)P(\d+)/g, (_, n, r) => {
        const numN = parseInt(n, 10);
        const numR = parseInt(r, 10);
        if (numR > numN || numR < 0) return '0';
        let res = 1;
        for (let i = 0; i < numR; i++) res *= (numN - i);
        return `(${res})`;
      });

      expr = expr.replace(/(\d+)C(\d+)/g, (_, n, r) => {
        const numN = parseInt(n, 10);
        const numR = parseInt(r, 10);
        if (numR > numN || numR < 0) return '0';
        let res = 1;
        for (let i = 1; i <= numR; i++) {
          res = (res * (numN - i + 1)) / i;
        }
        return `(${res})`;
      });

      // Sanitize check: allow only mathematical characters
      const sanitized = expr.replace(/[^0-9+\-*/().,MathsincotaqbrlePIE*]/g, '');
      const rawRes = Function(`'use strict'; return (${sanitized})`)();

      if (typeof rawRes !== 'number' || isNaN(rawRes)) {
        setDisplayResult('Math ERROR');
        return;
      }

      if (!isFinite(rawRes)) {
        setDisplayResult(rawRes > 0 ? 'Infinity' : '-Infinity');
        return;
      }

      // Format clean precision
      const rounded = Math.abs(rawRes) < 1e-12 ? 0 : Number(rawRes.toFixed(10));
      const resStr = String(rounded);
      setDisplayResult(resStr);
      setHistoryAns(resStr);

      const frac = decimalToFraction(rounded);
      setFractionResult(frac && frac.den > 1 ? frac : null);
      setIsFractionView(false);
    } catch (e) {
      setDisplayResult('Syntax ERROR');
    }
  };

  const toggleFractionDecimal = () => {
    if (fractionResult && fractionResult.den > 1) {
      setIsFractionView((prev) => !prev);
    }
  };

  return (
    <div
      className="casio-calculator-modal fixed bottom-4 right-2 sm:right-6 z-50 w-[320px] sm:w-[350px] bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 text-slate-900 rounded-3xl shadow-2xl border-2 border-slate-400 p-3 select-none animate-in zoom-in-95 duration-150 font-sans"
      style={{ maxHeight: '92vh', overflowY: 'auto' }}
    >
      {/* Top Casio Brand Casing */}
      <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-extrabold font-serif tracking-wider text-sm sm:text-base text-blue-900">
            CASIO
          </span>
          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300">
            fx-991ES PLUS
          </span>
        </div>

        {/* Solar Cell Accent & Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-0.5 bg-amber-950 px-2 py-0.5 rounded border border-amber-900 shadow-inner">
            <div className="w-2.5 h-2 bg-amber-800/80 rounded-[1px]" />
            <div className="w-2.5 h-2 bg-amber-800/80 rounded-[1px]" />
            <div className="w-2.5 h-2 bg-amber-800/80 rounded-[1px]" />
            <span className="text-[8px] text-amber-200 font-mono ml-1 font-bold">SOLAR</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-300 transition-colors cursor-pointer"
            title="Close Scientific Calculator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-header text: NATURAL-V.P.A.M. */}
      <div className="flex justify-between items-center px-1 text-[9px] font-bold text-blue-800 tracking-wider pt-0.5">
        <span>NATURAL-V.P.A.M.</span>
        <span>TWO WAY POWER</span>
      </div>

      {/* LCD Dot Matrix Authentic Casio Display */}
      <div className="my-2 bg-[#9fae9a] border-2 border-[#768471] rounded-xl p-2.5 shadow-inner text-slate-950 font-mono flex flex-col justify-between min-h-[76px]">
        {/* Annunciators Line */}
        <div className="flex items-center justify-between text-[9px] font-bold tracking-widest text-slate-800/80 select-none pb-1 border-b border-[#768471]/30">
          <div className="flex items-center gap-2">
            <span className={isShift ? 'bg-slate-900 text-[#9fae9a] px-1 rounded' : 'opacity-25'}>S</span>
            <span className={isAlpha ? 'bg-slate-900 text-[#9fae9a] px-1 rounded' : 'opacity-25'}>A</span>
            <span className="bg-slate-900 text-[#9fae9a] px-1 rounded">{angleMode}</span>
            <span className={isHyp ? 'bg-slate-900 text-[#9fae9a] px-1 rounded' : 'opacity-25'}>hyp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] opacity-70">Math ▲▼</span>
          </div>
        </div>

        {/* Expression Input Line */}
        <div className="text-left text-xs sm:text-sm font-semibold tracking-wide overflow-x-auto whitespace-nowrap scrollbar-none py-1 min-h-[22px]">
          {expression || <span className="opacity-40">0</span>}
        </div>

        {/* Formatted Calculation Result Line */}
        <div className="text-right text-base sm:text-xl font-black tracking-tight pt-0.5">
          {isFractionView && fractionResult ? (
            <div className="inline-flex items-center gap-1">
              <span className="text-sm font-bold">
                {fractionResult.num}/{fractionResult.den}
              </span>
              <span className="text-[10px] opacity-60">({displayResult})</span>
            </div>
          ) : (
            <span>{displayResult}</span>
          )}
        </div>
      </div>

      {/* Function Keys Header (Shift, Alpha, Replay, Mode, On) */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {/* SHIFT */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-amber-700">SHIFT</span>
          <button
            type="button"
            onClick={() => setIsShift(!isShift)}
            className={`w-full py-1.5 rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer border ${
              isShift ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300' : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
            }`}
          >
            SHIFT
          </button>
        </div>

        {/* ALPHA */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-rose-700">ALPHA</span>
          <button
            type="button"
            onClick={() => setIsAlpha(!isAlpha)}
            className={`w-full py-1.5 rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer border ${
              isAlpha ? 'bg-rose-400 text-white border-rose-500 ring-2 ring-rose-300' : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
            }`}
          >
            ALPHA
          </button>
        </div>

        {/* REPLAY / DEG-RAD TOGGLE */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-slate-500">REPLAY</span>
          <button
            type="button"
            onClick={() => setAngleMode((prev) => (prev === 'DEG' ? 'RAD' : 'DEG'))}
            className="w-full py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer border border-slate-800"
            title="Toggle Degrees / Radians Mode"
          >
            {angleMode}
          </button>
        </div>

        {/* MODE */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-slate-600">SETUP</span>
          <button
            type="button"
            onClick={() => setAngleMode((prev) => (prev === 'DEG' ? 'RAD' : 'DEG'))}
            className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold shadow-xs cursor-pointer border border-slate-300"
          >
            MODE
          </button>
        </div>

        {/* ON / RESET */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-slate-600">ON</span>
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg text-xs font-black shadow-xs cursor-pointer border border-slate-400"
          >
            ON
          </button>
        </div>
      </div>

      {/* Scientific Function Keypad Grid */}
      <div className="space-y-1.5 mb-2.5">
        {/* Row 1: Fractions, Square Root, Square, Power, Log, Ln */}
        <div className="grid grid-cols-6 gap-1">
          {/* Fraction / S<=>D */}
          <button
            type="button"
            onClick={() => insertToken('/')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title="Fraction a/b"
          >
            a/b
          </button>

          {/* Square Root / Cube Root */}
          <button
            type="button"
            onClick={() => insertToken(isShift ? '∛(' : '√(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isShift ? 'Cube Root' : 'Square Root'}
          >
            {isShift ? '∛' : '√'}
          </button>

          {/* x² / x³ */}
          <button
            type="button"
            onClick={() => insertToken(isShift ? '³' : '²')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isShift ? 'x³' : 'x²'}
          >
            {isShift ? 'x³' : 'x²'}
          </button>

          {/* x^■ */}
          <button
            type="button"
            onClick={() => insertToken('^(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title="Power x^y"
          >
            x^■
          </button>

          {/* log / 10^x */}
          <button
            type="button"
            onClick={() => insertToken(isShift ? '10^(' : 'log(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isShift ? '10^x' : 'log (base 10)'}
          >
            {isShift ? '10^x' : 'log'}
          </button>

          {/* ln / e^x */}
          <button
            type="button"
            onClick={() => insertToken(isShift ? 'e^(' : 'ln(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isShift ? 'e^x' : 'ln (natural log)'}
          >
            {isShift ? 'e^x' : 'ln'}
          </button>
        </div>

        {/* Row 2: (-), hyp, sin, cos, tan, x! */}
        <div className="grid grid-cols-6 gap-1">
          {/* (-) Negation */}
          <button
            type="button"
            onClick={() => insertToken('(-)')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title="Negative sign"
          >
            (-)
          </button>

          {/* hyp */}
          <button
            type="button"
            onClick={() => setIsHyp(!isHyp)}
            className={`py-1 px-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
              isHyp ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title="Hyperbolic functions"
          >
            hyp
          </button>

          {/* sin / sin⁻¹ / sinh */}
          <button
            type="button"
            onClick={() => insertToken(isHyp ? 'sinh(' : isShift ? 'sin⁻¹(' : 'sin(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isHyp ? 'sinh' : isShift ? 'sin⁻¹' : 'sin'}
          >
            {isHyp ? 'sinh' : isShift ? 'sin⁻¹' : 'sin'}
          </button>

          {/* cos / cos⁻¹ / cosh */}
          <button
            type="button"
            onClick={() => insertToken(isHyp ? 'cosh(' : isShift ? 'cos⁻¹(' : 'cos(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isHyp ? 'cosh' : isShift ? 'cos⁻¹' : 'cos'}
          >
            {isHyp ? 'cosh' : isShift ? 'cos⁻¹' : 'cos'}
          </button>

          {/* tan / tan⁻¹ / tanh */}
          <button
            type="button"
            onClick={() => insertToken(isHyp ? 'tanh(' : isShift ? 'tan⁻¹(' : 'tan(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isHyp ? 'tanh' : isShift ? 'tan⁻¹' : 'tan'}
          >
            {isHyp ? 'tanh' : isShift ? 'tan⁻¹' : 'tan'}
          </button>

          {/* Factorial x! */}
          <button
            type="button"
            onClick={() => insertToken('!')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title="Factorial (n!)"
          >
            x!
          </button>
        </div>

        {/* Row 3: nPr, nCr, (, ), S<=>D, M+ */}
        <div className="grid grid-cols-6 gap-1">
          {/* nPr */}
          <button
            type="button"
            onClick={() => insertToken('P')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title="Permutations nPr"
          >
            nPr
          </button>

          {/* nCr */}
          <button
            type="button"
            onClick={() => insertToken('C')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title="Combinations nCr"
          >
            nCr
          </button>

          {/* ( */}
          <button
            type="button"
            onClick={() => insertToken('(')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
          >
            (
          </button>

          {/* ) */}
          <button
            type="button"
            onClick={() => insertToken(')')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
          >
            )
          </button>

          {/* S<=>D */}
          <button
            type="button"
            onClick={toggleFractionDecimal}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-md text-[10px] font-bold cursor-pointer"
            title="Standard to Decimal Fraction Conversion"
          >
            {'S<=>D'}
          </button>

          {/* π / e */}
          <button
            type="button"
            onClick={() => insertToken(isShift ? 'e' : 'π')}
            className="py-1 px-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
            title={isShift ? 'e (Euler constant)' : 'π (Pi)'}
          >
            {isShift ? 'e' : 'π'}
          </button>
        </div>
      </div>

      {/* Main Numeric Keypad (7 8 9 DEL AC, 4 5 6 × ÷, 1 2 3 + -, 0 . ×10^x Ans =) */}
      <div className="space-y-1.5 pt-1 border-t border-slate-300">
        {/* Keypad Row 1: 7, 8, 9, DEL, AC */}
        <div className="grid grid-cols-5 gap-1.5">
          {['7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => insertToken(digit)}
              className="py-2 sm:py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-base font-extrabold shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            className="py-2 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-sm cursor-pointer active:scale-95 transition-all"
            title="Delete character"
          >
            DEL
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="py-2 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-sm cursor-pointer active:scale-95 transition-all"
            title="All Clear"
          >
            AC
          </button>
        </div>

        {/* Keypad Row 2: 4, 5, 6, ×, ÷ */}
        <div className="grid grid-cols-5 gap-1.5">
          {['4', '5', '6'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => insertToken(digit)}
              className="py-2 sm:py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-base font-extrabold shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => insertToken('×')}
            className="py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-base font-black shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
          >
            ×
          </button>
          <button
            type="button"
            onClick={() => insertToken('÷')}
            className="py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-base font-black shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
          >
            ÷
          </button>
        </div>

        {/* Keypad Row 3: 1, 2, 3, +, − */}
        <div className="grid grid-cols-5 gap-1.5">
          {['1', '2', '3'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => insertToken(digit)}
              className="py-2 sm:py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-base font-extrabold shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => insertToken('+')}
            className="py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-base font-black shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => insertToken('−')}
            className="py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-base font-black shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
          >
            −
          </button>
        </div>

        {/* Keypad Row 4: 0, ., ×10^x, Ans, = */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={() => insertToken('0')}
            className="py-2 sm:py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-base font-extrabold shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => insertToken('.')}
            className="py-2 sm:py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-base font-extrabold shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
          >
            .
          </button>
          <button
            type="button"
            onClick={() => insertToken('*10^(')}
            className="py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-[11px] font-bold shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
            title="Scientific Notation ×10^x"
          >
            ×10ˣ
          </button>
          <button
            type="button"
            onClick={() => insertToken('Ans')}
            className="py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-xs font-black shadow-sm border border-slate-300 cursor-pointer active:scale-95 transition-all"
            title="Recall Last Answer"
          >
            Ans
          </button>
          <button
            type="button"
            onClick={evaluateExpression}
            className="py-2 sm:py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-lg font-black shadow-md cursor-pointer active:scale-95 transition-all"
            title="Calculate (=)"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
