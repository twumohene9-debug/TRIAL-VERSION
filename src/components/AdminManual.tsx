import React, { useRef, useState, useEffect } from 'react';
import { 
  BookOpen, 
  Download, 
  Printer, 
  ShieldCheck, 
  Users, 
  FileText, 
  Activity, 
  Globe, 
  Palette, 
  Search, 
  HelpCircle, 
  ExternalLink, 
  ChevronRight, 
  ChevronDown, 
  Lock, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  WifiOff, 
  Sparkles, 
  BarChart3, 
  Layers, 
  Smartphone, 
  Laptop, 
  ArrowRight, 
  Copy, 
  Clock, 
  Award,
  RefreshCw,
  FolderSync,
  Edit3,
  Check,
  Building,
  User,
  BadgeCheck,
  Calendar
} from 'lucide-react';
import { BrandLogo, EducationEmblemSvg } from './BrandLogo';
import { AdminProfile, SystemSettings } from '../types';

interface AdminManualProps {
  onNavigateTab?: (tab: any) => void;
  adminProfile?: AdminProfile;
  systemSettings?: SystemSettings;
  onSaveAdminProfile?: (profile: AdminProfile) => Promise<void>;
  onUpdateSystemSettings?: (settings: Partial<SystemSettings>) => Promise<void> | void;
}

export const AdminManual: React.FC<AdminManualProps> = ({ 
  onNavigateTab,
  adminProfile,
  systemSettings,
  onSaveAdminProfile,
  onUpdateSystemSettings,
}) => {
  const manualContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>('architecture');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Custom Sign-Off & Customization State (Persistent in localStorage and synced with AdminProfile)
  const defaultSignerName = adminProfile?.name || 'Mr. Bismark Twum, MPhil';
  const defaultTitle = adminProfile?.title || 'Lead System Architect & Academic Director';
  const defaultInstitution = systemSettings?.schoolName || adminProfile?.institution || 'The Joy Of The Lord Assessment Network';
  const defaultDepartment = adminProfile?.department || 'Department of Mathematics & Computing Sciences';
  const defaultMotto = adminProfile?.motto || 'The joy of the Lord is my strength';
  const defaultQualification = adminProfile?.qualification || 'Master of Philosophy (MPhil)';

  const [signerName, setSignerName] = useState<string>(() => {
    return localStorage.getItem('manual_signer_name') || defaultSignerName;
  });
  const [signerTitle, setSignerTitle] = useState<string>(() => {
    return localStorage.getItem('manual_signer_title') || defaultTitle;
  });
  const [institutionName, setInstitutionName] = useState<string>(() => {
    return localStorage.getItem('manual_institution_name') || defaultInstitution;
  });
  const [departmentName, setDepartmentName] = useState<string>(() => {
    return localStorage.getItem('manual_department_name') || defaultDepartment;
  });
  const [mottoText, setMottoText] = useState<string>(() => {
    return localStorage.getItem('manual_motto_text') || defaultMotto;
  });
  const [docRefCode, setDocRefCode] = useState<string>(() => {
    return localStorage.getItem('manual_doc_ref') || 'JOTL-OPS-2026-V3.8';
  });
  const [approvalDate, setApprovalDate] = useState<string>(() => {
    return localStorage.getItem('manual_approval_date') || new Date().toISOString().split('T')[0];
  });
  const [documentNotes, setDocumentNotes] = useState<string>(() => {
    return localStorage.getItem('manual_doc_notes') || 'Certified for operational deployment, faculty accreditation, and high-stakes examination delivery.';
  });

  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync state if adminProfile or systemSettings update externally
  useEffect(() => {
    if (adminProfile?.name && !localStorage.getItem('manual_signer_name')) {
      setSignerName(adminProfile.name);
    }
    if (adminProfile?.title && !localStorage.getItem('manual_signer_title')) {
      setSignerTitle(adminProfile.title);
    }
    if (systemSettings?.schoolName && !localStorage.getItem('manual_institution_name')) {
      setInstitutionName(systemSettings.schoolName);
    }
  }, [adminProfile, systemSettings]);

  const handleSaveCustomizations = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('manual_signer_name', signerName);
      localStorage.setItem('manual_signer_title', signerTitle);
      localStorage.setItem('manual_institution_name', institutionName);
      localStorage.setItem('manual_department_name', departmentName);
      localStorage.setItem('manual_motto_text', mottoText);
      localStorage.setItem('manual_doc_ref', docRefCode);
      localStorage.setItem('manual_approval_date', approvalDate);
      localStorage.setItem('manual_doc_notes', documentNotes);

      // Save to Admin Profile in database if available
      if (onSaveAdminProfile && adminProfile) {
        await onSaveAdminProfile({
          ...adminProfile,
          name: signerName,
          title: signerTitle,
          institution: institutionName,
          department: departmentName,
          motto: mottoText,
        });
      }

      if (onUpdateSystemSettings && systemSettings) {
        await onUpdateSystemSettings({
          ...systemSettings,
          schoolName: institutionName,
        });
      }

      setSaveSuccessMsg('Sign-off customizations saved & applied to the manual!');
      setIsCustomizing(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('Error saving customizations:', err);
    }
  };

  const handleResetDefaults = () => {
    setSignerName(defaultSignerName);
    setSignerTitle(defaultTitle);
    setInstitutionName(defaultInstitution);
    setDepartmentName(defaultDepartment);
    setMottoText(defaultMotto);
    setDocRefCode('JOTL-OPS-2026-V3.8');
    setApprovalDate(new Date().toISOString().split('T')[0]);
    setDocumentNotes('Certified for operational deployment, faculty accreditation, and high-stakes examination delivery.');

    localStorage.removeItem('manual_signer_name');
    localStorage.removeItem('manual_signer_title');
    localStorage.removeItem('manual_institution_name');
    localStorage.removeItem('manual_department_name');
    localStorage.removeItem('manual_motto_text');
    localStorage.removeItem('manual_doc_ref');
    localStorage.removeItem('manual_approval_date');
    localStorage.removeItem('manual_doc_notes');

    setSaveSuccessMsg('Reset to system profile defaults.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Print & PDF Download Handler using isolated iframe with CSS @page print color styling
  const handleDownloadPdf = () => {
    if (typeof window === 'undefined') return;
    setIsExporting(true);

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024);

    if (isMobile) {
      window.print();
      setIsExporting(false);
      return;
    }

    if (manualContainerRef.current) {
      try {
        const existingFrame = document.getElementById('print-manual-iframe');
        if (existingFrame && existingFrame.parentNode) {
          existingFrame.parentNode.removeChild(existingFrame);
        }

        const printIframe = document.createElement('iframe');
        printIframe.id = 'print-manual-iframe';
        printIframe.setAttribute('title', 'Platform Operations Manual');
        printIframe.style.position = 'fixed';
        printIframe.style.left = '-9999px';
        printIframe.style.top = '0';
        printIframe.style.width = '1000px';
        printIframe.style.height = '1400px';
        printIframe.style.border = '0';
        document.body.appendChild(printIframe);

        const frameDoc = printIframe.contentWindow?.document;
        if (frameDoc) {
          frameDoc.open();
          const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map((node) => node.outerHTML)
            .join('\n');

          frameDoc.write(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <title>${institutionName.replace(/[^a-zA-Z0-9]/g, '_')}_Operations_Manual_${approvalDate}</title>
                ${stylesheets}
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 10mm 10mm 10mm 10mm;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box;
                  }
                  html, body {
                    background-color: #ffffff !important;
                    color: #0f172a !important;
                    margin: 0 !important;
                    padding: 8px !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .print-break-inside-avoid {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                  .print-page-break {
                    page-break-before: always !important;
                    break-before: page !important;
                  }
                  .running-header {
                    font-size: 8pt;
                    color: #64748b;
                    border-bottom: 1px solid #cbd5e1;
                    padding-bottom: 4px;
                    margin-bottom: 12px;
                    display: flex;
                    justify-content: space-between;
                  }
                  .running-footer {
                    font-size: 8pt;
                    color: #64748b;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 4px;
                    margin-top: 16px;
                    display: flex;
                    justify-content: space-between;
                  }
                </style>
              </head>
              <body>
                <div class="p-4">
                  ${manualContainerRef.current.innerHTML}
                </div>
              </body>
            </html>
          `);
          frameDoc.close();

          setTimeout(() => {
            try {
              printIframe.contentWindow?.focus();
              printIframe.contentWindow?.print();
            } catch (printErr) {
              console.warn('Iframe print failed, falling back to window.print():', printErr);
              window.print();
            } finally {
              setIsExporting(false);
              setTimeout(() => {
                if (printIframe.parentNode) {
                  printIframe.parentNode.removeChild(printIframe);
                }
              }, 4000);
            }
          }, 600);
        }
      } catch (err) {
        console.error('Error generating manual print preview:', err);
        window.print();
        setIsExporting(false);
      }
    }
  };

  const manualSections = [
    { id: 'architecture', title: '1. Platform Architecture & Data Flow', icon: Layers },
    { id: 'admin-console', title: '2. Administrator Control Suite', icon: ShieldCheck },
    { id: 'security-locks', title: '3. Multi-Layer Security & Access Locks', icon: Lock },
    { id: 'teacher-auth', title: '4. Faculty & Teacher Access Management', icon: Users },
    { id: 'importer-ai', title: '5. Smart DOCX Importer & MS Word Extraction Engine', icon: Cpu },
    { id: 'question-pools', title: '6. Master Question Pools & Delivery Modes', icon: BookOpen },
    { id: 'surveillance', title: '7. Live Surveillance & Exam Proctoring', icon: Activity },
    { id: 'offline-pwa', title: '8. Offline Readiness, QR Codes & PWA Engine', icon: WifiOff },
    { id: 'analytics-exports', title: '9. Results, Google Sheets Sync & Excel Export', icon: BarChart3 },
    { id: 'themes-branding', title: '10. Institutional Theming & Domain Isolation', icon: Palette },
    { id: 'official-signoff', title: '11. Official Executive Sign-Off & Verification', icon: BadgeCheck },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER CONTROL BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Official Administrator & Operations Manual</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            System Operations, Architecture & Feature Guide
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-sans">
            Comprehensive technical manual detailing every capability, workflow, security protocol, offline engine, and assessment delivery rule across the platform.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-amber-400 font-semibold">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Always synchronized with latest features
            </span>
            <span className="text-slate-500">•</span>
            <span>Includes colored architectural flow diagrams</span>
            <span className="text-slate-500">•</span>
            <span>Customizable Institutional Sign-Off Pages</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="px-4 py-3 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Customize sign-off credentials, authority signature, institution name, and scripture"
          >
            <Edit3 className="w-4 h-4 text-amber-300" />
            <span>{isCustomizing ? 'Hide Customizer' : 'Customize Sign-Off Pages'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300 active:scale-95"
            title="Download this entire manual as a styled PDF document"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating PDF...' : 'Download Full PDF Manual'}</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="px-4 py-3 bg-white/10 hover:bg-white/15 text-slate-200 text-xs sm:text-sm font-bold rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Direct print view"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* SIGN-OFF CUSTOMIZATION PANEL (Collapsible) */}
      {isCustomizing && (
        <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-white">Manual Sign-Off & Accreditation Customizer</h3>
                <p className="text-xs text-slate-400">
                  Tailor the executive sign-off authority, signatory title, institutional motto, and approval stamps rendered across the manual pages.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCustomizing(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSaveCustomizations} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Executive Signatory Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Mr. Bismark Twum, MPhil"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Official Role / Administrative Title
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="e.g. Lead System Architect & Academic Director"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Institution / School Name
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. The Joy Of The Lord Assessment Network"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Faculty / Academic Department
                </label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="e.g. Department of Mathematics & Computing"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Institutional Scripture / Motto
                </label>
                <input
                  type="text"
                  value={mottoText}
                  onChange={(e) => setMottoText(e.target.value)}
                  placeholder="e.g. The joy of the Lord is my strength"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Document Reference ID
                </label>
                <input
                  type="text"
                  value={docRefCode}
                  onChange={(e) => setDocRefCode(e.target.value)}
                  placeholder="e.g. JOTL-OPS-2026-V3.8"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-amber-300 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Sign-Off Approval Date
                </label>
                <input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-300 font-bold mb-1">
                  Certification Authority Remarks
                </label>
                <input
                  type="text"
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  placeholder="Certified for operational deployment, faculty accreditation, and high-stakes examination delivery."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-slate-400 hover:text-white font-semibold underline cursor-pointer"
              >
                Reset to System Defaults
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="px-4 py-2 font-bold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Apply Customizations</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* QUICK JUMP NAVIGATION & SEARCH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Jump To:
          </span>
          {manualSections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.title.split('.')[0]}</span>
              </a>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search manual topics..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* PRINTABLE MANUAL CONTAINER */}
      <div
        ref={manualContainerRef}
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-12 text-slate-800 leading-relaxed font-sans"
      >
        {/* MANUAL TITLE COVER PAGE HEADER */}
        <div className="border-b-2 border-slate-900 pb-8 space-y-4 print-break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" variant="full" theme="light" />
              <div>
                <span className="text-[11px] font-mono tracking-widest font-extrabold uppercase text-amber-600 block">
                  OFFICIAL TECHNICAL & OPERATIONAL MANUAL
                </span>
                <span className="text-xs text-slate-700 font-bold">{institutionName}</span>
              </div>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-500 font-medium">
              <div>Version 3.8 • Production Edition</div>
              <div>Certified Date: <strong className="text-slate-900">{approvalDate}</strong></div>
              <div>Signatory: <strong className="text-slate-900">{signerName}</strong></div>
              <div className="text-[10px] text-amber-700 font-mono font-bold mt-0.5">Ref: {docRefCode}</div>
            </div>
          </div>

          <div className="pt-4">
            <h1 className="text-3xl sm:text-4xl font-black font-serif text-slate-950 tracking-tight">
              Platform Architecture & Comprehensive Operations Manual
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-4xl">
              This manual is designed exclusively for Platform Administrators, Head Examination Officers, and Academic Technologists at <strong>{institutionName}</strong>. It provides end-to-end guidance on configuring assessments, generating faculty credentials, anti-cheat proctoring, synchronizing cloud databases, serving offline assessments via QR codes, and institutional branding.
            </p>
          </div>

          {/* SIGNATURE BANNER TOP ACCREDITATION */}
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                  Executive Authorization & Certified Operations
                </span>
                <span className="text-slate-600 text-[11px]">
                  Authorized by {signerName} • {signerTitle} • {departmentName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] bg-white px-3 py-1.5 rounded-xl border border-amber-300 text-amber-900 font-bold shrink-0">
              <span>STATUS:</span>
              <span className="text-emerald-700">CERTIFIED VALID</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: ARCHITECTURE & DATA FLOW */}
        <section id="architecture" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">1. Platform Architecture & Data Flow</h2>
              <p className="text-xs text-slate-500">How the multi-layer offline and online synchronization topology operates</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            The platform is engineered with a **Tri-Engine Hybrid Architecture** combining client-side offline execution, Express API server state caching, and Google Cloud Firestore. Assessments run with zero latency in memory, while persisting state across all connected devices in real time.
          </p>

          {/* DIAGRAM 1: DATA FLOW DIAGRAM */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-900/50 print-break-inside-avoid">
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Architectural Diagram 1.1: Tri-Tier Synchronous Data Flow
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              {/* TIER 1 */}
              <div className="bg-slate-800/80 border border-indigo-500/30 p-4 rounded-xl space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center font-bold">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Tier 1: Client Edge (Browser)</div>
                <p className="text-[11px] text-slate-300">
                  React 19 + KaTeX + IndexedDB + LocalStorage. Supports offline examination execution, anti-cheat tab switch trapping, and QR code offline launch.
                </p>
                <div className="text-[10px] font-mono text-emerald-400 bg-slate-900/80 py-1 rounded">Zero-Network Latency</div>
              </div>

              {/* TIER 2 */}
              <div className="bg-slate-800/80 border border-amber-500/30 p-4 rounded-xl space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Tier 2: Express Node.js Gateway</div>
                <p className="text-[11px] text-slate-300">
                  Runs on Port 3000. Provides central `/api/sync` endpoints, Google Sheets Webhook proxying (CORS avoidance), active heartbeat caching, and AI Gemini pipeline.
                </p>
                <div className="text-[10px] font-mono text-amber-400 bg-slate-900/80 py-1 rounded">Local DB Backup (`serverDb.ts`)</div>
              </div>

              {/* TIER 3 */}
              <div className="bg-slate-800/80 border border-emerald-500/30 p-4 rounded-xl space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold">
                  <FolderSync className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-white">Tier 3: Cloud Firestore</div>
                <p className="text-[11px] text-slate-300">
                  Persistent cloud database with automatic snapshot listeners. Syncs quizzes, student submissions, system lockdown rules, and teacher rosters instantly.
                </p>
                <div className="text-[10px] font-mono text-emerald-400 bg-slate-900/80 py-1 rounded">Multi-Device Real-Time Sync</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-center text-xs text-indigo-300 gap-2">
              <span>Client Edge</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Bidirectional Delta Sync (BroadcastChannel & Polling)</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Express Gateway & Cloud Firestore</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: ADMINISTRATOR CONSOLE */}
        <section id="admin-console" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">2. Administrator Control Suite</h2>
              <p className="text-xs text-slate-500">Core operational tabs and executive controls</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>Executive Metric Widgets</span>
              </div>
              <p className="text-xs text-slate-600">
                The top of the dashboard displays 6 live metric tiles: Total Quizzes, Active Quizzes, Completed Tests, Average Class Score, Total Questions Bank, and Overall Pass Rate. These update instantly as students submit assessments.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>All Quizzes Overview</span>
              </div>
              <p className="text-xs text-slate-600">
                Centrally control every assessment across the entire institution. Toggle status between <strong>Active</strong>, <strong>Draft</strong>, and <strong>Archived</strong>. One-click toggles for Progressive Tab Penalties, Single Attempt Limit, and Fullscreen Lockdown.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Teacher Access Codes</span>
              </div>
              <p className="text-xs text-slate-600">
                Provision 4-digit numeric PINs or custom alphanumeric keys for faculty. Revoke access with a single click, regenerate codes, or lock teacher self-registration.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Activity className="w-4 h-4 text-amber-600" />
                <span>Live System Surveillance</span>
              </div>
              <p className="text-xs text-slate-600">
                Real-time active examination monitoring. Tracks connected candidate devices, heartbeat pings, tab switch counts, remaining exam timer seconds, and allows issuing remote proctor warnings.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: MULTI-LAYER SECURITY & ACCESS LOCKS */}
        <section id="security-locks" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">3. Multi-Layer Security & Access Locks</h2>
              <p className="text-xs text-slate-500">Triple-check authentication, master lockdowns, and candidate passcode barriers</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            The platform incorporates multi-tiered security to prevent unauthorized access by students and safeguard exam integrity:
          </p>

          <div className="space-y-3">
            {/* LAYER 1 */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border-l-4 border-amber-400 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase">
                <span>Security Layer 1: Admin Triple-Verification Key</span>
                <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">High Security</span>
              </div>
              <p className="text-xs text-slate-300">
                Accessing the Admin Portal requires three progressive challenges:
                <br /><strong>1. Primary Credentials:</strong> Registered administrative email and master security code (<code className="text-amber-300 font-mono">2026</code> or customized passcode).
                <br /><strong>2. Rhythmic 3-Tap Key:</strong> Three clicks/taps within a 2.0-second time window.
                <br /><strong>3. Sacred Institutional Passphrase:</strong> Verification against the institutional scripture/motto (<code className="text-amber-300 font-mono">{mottoText}</code>).
              </p>
            </div>

            {/* LAYER 2 */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border-l-4 border-rose-400 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase">
                <span>Security Layer 2: Master & URL-Specific Lockdowns</span>
                <span className="font-mono text-[10px] bg-rose-500/20 px-2 py-0.5 rounded">Executive Override</span>
              </div>
              <p className="text-xs text-slate-300">
                Administrators can toggle an emergency **Master Portal Lockdown** or lock individual portals (Student, Teacher, or Admin). When locked, candidates cannot start or submit tests, and custom broadcast notices are displayed.
              </p>
            </div>

            {/* LAYER 3 */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border-l-4 border-indigo-400 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase">
                <span>Security Layer 3: Student Passcode Barrier</span>
                <span className="font-mono text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded">Exam Desk Access</span>
              </div>
              <p className="text-xs text-slate-300">
                The student examination desk is protected by default by the entry passcode <code className="text-indigo-300 font-mono">bisjoy25</code>, ensuring candidates cannot enter the test environment until authorized by their exam proctor.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: FACULTY & TEACHER ACCESS */}
        <section id="teacher-auth" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">4. Faculty & Teacher Access Management</h2>
              <p className="text-xs text-slate-500">Access codes, self-registration control, and teacher workspaces</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 p-4 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Code Generation & Distribution</span>
              </h3>
              <p className="text-xs text-slate-600">
                Generate randomized 4-digit PINs (e.g., <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">4829</code>) or alphanumeric codes for faculty members. Teachers use their email address and assigned PIN to log into the Teacher Console without requiring cumbersome passwords.
              </p>
            </div>

            <div className="border border-slate-200 p-4 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Teacher Self-Registration Lock</span>
              </h3>
              <p className="text-xs text-slate-600">
                By default, the Administrator can toggle the <strong>Teacher Self-Registration Lock</strong>. When enabled, new teachers cannot register themselves from the login modal; only admin-provisioned access codes are accepted.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: SMART MS WORD DOCX IMPORTER & AI EXTRACTION */}
        <section id="importer-ai" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">5. Smart DOCX Importer & MS Word Extraction Engine</h2>
              <p className="text-xs text-slate-500">OMATH formula typesetting, option parsing, and paper instruction stripping</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            The platform features a proprietary high-fidelity Microsoft Word (.docx, .doc) parsing engine designed specifically for high-level mathematics, science, and prose papers:
          </p>

          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 font-mono text-xs border border-purple-500/30">
            <div className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Parsing Pipeline Capabilities
            </div>
            <ul className="space-y-2 text-slate-300 list-disc list-inside">
              <li><strong>Native Word OMATH / MathML Conversion:</strong> Direct XML traversal parses Word equation objects into high-fidelity KaTeX LaTeX formulas (<code className="text-purple-300">\\dfrac</code>, <code className="text-purple-300">\\sqrt</code>, exponents, subscripts, matrices, vectors, and piece-wise cases).</li>
              <li><strong>Smart Option Splitting:</strong> Accurately isolates options whether they appear on separate lines, all on one single line, in 2x2 grids, or inline with the question stem.</li>
              <li><strong>Paper Instruction Discard:</strong> Excludes general exam rules, index boxes, and school headers, isolating only the valid assessment items.</li>
              <li><strong>Gemini AI Model Fallback:</strong> Calls Gemini (<code className="text-purple-300">gemini-3.7-flash</code> / <code className="text-purple-300">gemini-flash-latest</code>) for messy scans or non-standard document structures.</li>
            </ul>
          </div>
        </section>

        {/* SECTION 6: QUESTION POOLS & ASSESSMENT DELIVERY */}
        <section id="question-pools" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">6. Master Question Pools & Delivery Modes</h2>
              <p className="text-xs text-slate-500">Massive question banks (500+ items), balanced section draws, and anti-leak measures</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-sm text-slate-900">Randomized Subset Draw</div>
              <p className="text-xs text-slate-600">
                Upload a master bank of 200–500 questions. Teachers can configure the test to draw a randomized 40 or 50 items for each candidate, ensuring no two students receive the identical test paper.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-sm text-slate-900">Balanced Section Quota</div>
              <p className="text-xs text-slate-600">
                Configurable draw strategies: <em>Uniform Random</em> or <em>Balanced Across Sections</em> (e.g. 10 questions from Algebra, 10 from Geometry, 10 from Calculus, 10 from Statistics).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-sm text-slate-900">Question & Option Shuffling</div>
              <p className="text-xs text-slate-600">
                Every candidate receives options in a different shuffled order (e.g. Candidate 1 sees the correct answer at C, while Candidate 2 sees it at A). Prevents visual glance cheating in computer labs.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 7: LIVE SURVEILLANCE & PROCTORING */}
        <section id="surveillance" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">7. Live Surveillance & Exam Proctoring</h2>
              <p className="text-xs text-slate-500">Live heartbeat telemetry, tab switch detection, and instant proctor warnings</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 text-white border border-rose-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" /> Anti-Cheat & Surveillance Engine
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded">Active Proctoring</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-lg font-bold text-amber-400 font-mono">1. Tab Switch Trapping</div>
                <div className="text-[11px] text-slate-400 mt-1">Logs when candidates leave exam tab. Toggles progressive mark deduction or immediate test locking.</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-lg font-bold text-emerald-400 font-mono">2. Fullscreen Lockdown</div>
                <div className="text-[11px] text-slate-400 mt-1">Locks candidate browser into fullscreen; exits are recorded as formal integrity violation events.</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-lg font-bold text-indigo-400 font-mono">3. Remote Warning Push</div>
                <div className="text-[11px] text-slate-400 mt-1">Push instant on-screen proctor warning messages to a specific candidate or broadcast to the entire room.</div>
              </div>
            </div>

            {/* DIAGRAM 7.1: SURVEILLANCE & PROCTORING SEQUENCE */}
            <div className="p-4 bg-slate-950 rounded-xl border border-rose-800/40 space-y-3">
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-400" /> Diagram 7.1: Live Incident & Auto-Penalty State Machine
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-center flex-1 w-full">
                  <span className="font-bold text-slate-200 block">Candidate Focus Change</span>
                  <span className="text-[10px] text-slate-400">`visibilitychange` or `blur`</span>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-400 hidden md:block shrink-0" />
                <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-center flex-1 w-full">
                  <span className="font-bold text-amber-300 block">1st–2nd Violation</span>
                  <span className="text-[10px] text-amber-400">Amber banner warning + Heartbeat logged</span>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-400 hidden md:block shrink-0" />
                <div className="bg-rose-950/60 border border-rose-500/50 p-3 rounded-lg text-center flex-1 w-full">
                  <span className="font-bold text-rose-300 block">3rd Violation (Threshold)</span>
                  <span className="text-[10px] text-rose-400">Mark deduction or Exam Forced Lockout</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: OFFLINE READINESS & QR CODES */}
        <section id="offline-pwa" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">8. Offline Readiness, QR Codes & PWA Engine</h2>
              <p className="text-xs text-slate-500">True zero-internet examination delivery via Service Workers and LZ-Compressed QR codes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 p-4 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-600" />
                <span>High-Density Compressed QR Codes</span>
              </h3>
              <p className="text-xs text-slate-600">
                Every quiz can be encoded into a standalone QR code. If questions fit within density constraints, the complete test payload is compressed using <code className="font-mono text-cyan-700">lz-string</code> directly into the URL parameter (<code className="font-mono">?qdata=...</code>). Candidates scan the QR code and take the entire test offline without any server round-trips!
              </p>
            </div>

            <div className="border border-slate-200 p-4 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-600" />
                <span>PWA Local Storage Caching</span>
              </h3>
              <p className="text-xs text-slate-600">
                Service Worker caches all KaTeX fonts, CSS stylesheets, and client JavaScript. Completed assessments submitted during network blackouts are safely queued in client storage and synchronized automatically upon reconnect.
              </p>
            </div>
          </div>

          {/* DIAGRAM 8.1: OFFLINE QR DELIVERY FLOW */}
          <div className="p-4 bg-gradient-to-r from-slate-950 to-cyan-950 rounded-2xl border border-cyan-800/40 text-white space-y-3">
            <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-cyan-400" /> Diagram 8.1: Offline Test Paper Distribution Architecture
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-xl">
                <span className="text-cyan-400 font-bold block mb-1">Step 1: Encode</span>
                <span className="text-[10px] text-slate-300">Teacher compresses paper questions into LZ-string payload</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-xl">
                <span className="text-cyan-400 font-bold block mb-1">Step 2: Project / Print</span>
                <span className="text-[10px] text-slate-300">Display QR code on projector or printed desk card</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-xl">
                <span className="text-cyan-400 font-bold block mb-1">Step 3: Scan Offline</span>
                <span className="text-[10px] text-slate-300">Candidate phone camera decodes paper directly into memory</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-xl">
                <span className="text-cyan-400 font-bold block mb-1">Step 4: Auto-Queue</span>
                <span className="text-[10px] text-slate-300">Results saved in IndexedDB & pushed on reconnection</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: RESULTS, GOOGLE SHEETS & EXCEL */}
        <section id="analytics-exports" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">9. Results, Google Sheets Sync & Excel Export</h2>
              <p className="text-xs text-slate-500">Enterprise grade gradebook export, CORS-safe webhook forwarding, and deduplication</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Instant Excel (.xlsx) Export</span>
              </div>
              <p className="text-xs text-slate-600">
                From the <strong>Student Results & Progress</strong> tab, the Administrator can click <strong>Export to Excel</strong> to generate formatted spreadsheets containing Candidate Name, Index Number, Class Stream, Raw Score, Percentage, Final Grade (Distinction, Credit, Pass), Time Spent, and Tab Switches recorded.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Google Sheets Live Webhook Sync</span>
              </div>
              <p className="text-xs text-slate-600">
                Configure a Google Apps Script Webhook URL. Submissions are pushed through the backend proxy (<code className="font-mono text-emerald-700">/api/sync/google-sheets</code>) to eliminate browser CORS restrictions and populate Google Sheets columns in real time.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 10: THEMES & ISOLATED DOMAIN LINKS */}
        <section id="themes-branding" className="space-y-6 scroll-mt-20 print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">10. Institutional Theming & Domain Isolation</h2>
              <p className="text-xs text-slate-500">5 synchronized color palettes, isolated URLs, and founder accreditation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 p-4 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>5 Institutional Theme Palettes</span>
              </h3>
              <p className="text-xs text-slate-600">
                Administrators can switch the entire platform theme with one click:
                <br />1. <strong>Royal Gold & Deep Navy</strong> (Official SDA SHS flagship colors)
                <br />2. <strong>Forest Emerald & Gold</strong>
                <br />3. <strong>Academic Sapphire & Cobalt</strong>
                <br />4. <strong>Classic Crimson & Slate</strong>
                <br />5. <strong>Modern Amethyst & Violet</strong>
              </p>
            </div>

            <div className="border border-slate-200 p-4 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Isolated Domain Links</span>
              </h3>
              <p className="text-xs text-slate-600">
                Provide separate dedicated URLs to teachers and students (e.g. <code className="font-mono text-indigo-700">?portal=student</code> or <code className="font-mono text-indigo-700">?portal=teacher</code>). In isolated mode, the top portal switcher and admin link are concealed to eliminate candidate distraction.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 11: OFFICIAL EXECUTIVE SIGN-OFF & CERTIFICATION */}
        <section id="official-signoff" className="space-y-6 scroll-mt-20 print-page-break print-break-inside-avoid">
          <div className="flex items-center gap-3 border-b-2 border-amber-500/80 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-950">11. Official Executive Sign-Off & Verification</h2>
              <p className="text-xs text-slate-500">Formal accreditation, institutional seal, and operational sign-off endorsement</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            This document confirms that <strong>{institutionName}</strong> has provisioned and certified this assessment platform for academic operations, candidate grading, surveillance monitoring, and examination integrity. All testing parameters and algorithms adhere to the institutional standards set by the governing administration.
          </p>

          {/* FORMAL SIGN-OFF CERTIFICATE CARD */}
          <div className="bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
            {/* Watermark Emblem in Background */}
            <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none w-64 h-64">
              <EducationEmblemSvg size={256} className="text-amber-900" />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-200 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-amber-800 block">
                  GOVERNING ACCREDITATION & COMPLIANCE SEAL
                </span>
                <h3 className="text-lg font-bold font-serif text-slate-950">{institutionName}</h3>
                <p className="text-xs text-slate-600 font-medium">{departmentName}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs inline-block">
                  CERTIFIED AUTHENTIC
                </span>
                <div className="text-[11px] font-mono text-slate-500 mt-1">Ref ID: {docRefCode}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>Authorized Executive Signatory</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Name:</span>
                  <span className="text-sm font-bold text-slate-900">{signerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Administrative Role:</span>
                  <span className="text-xs font-semibold text-slate-800">{signerTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Qualification:</span>
                  <span className="text-xs font-medium text-slate-700">{defaultQualification}</span>
                </div>
              </div>

              <div className="space-y-3 bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Operational Governance & Stamps</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Authorization Date:</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{approvalDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Governing Institutional Motto:</span>
                  <span className="text-xs italic font-serif text-amber-900 font-bold">"{mottoText}"</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Compliance Status:</span>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Full Operational Compliance Granted
                  </span>
                </div>
              </div>
            </div>

            {/* AUTHORIZATION REMARKS */}
            <div className="bg-amber-100/60 p-4 rounded-2xl border border-amber-300 text-xs space-y-1">
              <span className="font-bold text-amber-950 block">Accreditation Remarks & Notes:</span>
              <p className="text-amber-900 leading-relaxed italic">{documentNotes}</p>
            </div>

            {/* PHYSICAL SIGNATURE STAMP BLOCK */}
            <div className="pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="font-serif italic text-2xl text-slate-900 font-black tracking-wider select-none transform -rotate-1">
                  {signerName}
                </div>
                <div className="w-48 h-0.5 bg-slate-900 mx-auto sm:mx-0"></div>
                <div className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  Official Digital Signature & Seal
                </div>
              </div>

              <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-amber-400 text-center space-y-1 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center mx-auto">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-mono font-black text-amber-900 uppercase">
                  ACCREDITATION VERIFIED
                </div>
                <div className="text-[9px] text-slate-500">{docRefCode}</div>
              </div>
            </div>
          </div>
        </section>

        {/* DOCUMENT SIGN OFF & ACCREDITATION FOOTER */}
        <div className="border-t-2 border-slate-900 pt-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 print-break-inside-avoid">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-slate-800">{institutionName}</p>
            <p>Designed, Engineered & Certified by {signerName}</p>
            <p className="italic text-slate-400">"{mottoText}"</p>
          </div>
          <div className="text-center sm:text-right font-mono text-[11px] text-slate-400">
            <div>CONFIDENTIAL • FOR AUTHORIZED ADMINISTRATIVE USE ONLY</div>
            <div>Document Ref: {docRefCode} • Approved {approvalDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
