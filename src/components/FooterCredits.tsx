import React from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  ChevronRight
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface FooterCreditsProps {
  onOpenAbout: (tab?: 'about' | 'contact' | 'report' | 'privacy') => void;
  className?: string;
}

export const FooterCredits: React.FC<FooterCreditsProps> = ({ onOpenAbout, className = '' }) => {
  const currentYear = new Date().getFullYear();
  const platformVersion = 'v2.5.0';

  return (
    <footer 
      id="app-global-footer"
      className={`w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-slate-950 border-t-2 border-amber-600 shadow-md transition-all print:hidden mt-auto ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left: Brand Identity & Sacred Devotional Motto with dynamic year */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-center sm:text-left">
          <div className="shrink-0 p-0.5 bg-slate-950 rounded-lg shadow-xs border border-amber-500/50">
            <BrandLogo size="sm" variant="icon-only" />
          </div>
          
          <div className="flex items-center gap-1.5 font-serif font-black text-slate-950 text-xs sm:text-[13px] tracking-tight">
            <Sparkles className="w-3.5 h-3.5 text-amber-800 shrink-0 animate-pulse" />
            <span className="select-all">&copy; {currentYear} - The joy of the Lord is my strength. All rights reserved.</span>
          </div>

          <span className="hidden md:inline text-amber-800 font-bold">•</span>

          <div className="flex items-center gap-1.5 text-slate-900 text-[11px] sm:text-xs">
            <span>Designed by <strong className="text-slate-950 font-bold">Bismark Twum, MPhil</strong></span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-950 text-amber-300 font-bold">
              {platformVersion}
            </span>
          </div>
        </div>

        {/* Right: Single Compressed One-Click Button for About, Feedback, Report & Privacy */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="footer-btn-info-support"
            onClick={() => onOpenAbout('about')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 hover:text-white border border-slate-900 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
            title="About, Contact, Feedback, Report a Problem & Privacy (One-Click)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>About &amp; Support</span>
            <ChevronRight className="w-3 h-3 text-amber-400/80" />
          </button>
        </div>

      </div>
    </footer>
  );
};
