import React, { useState } from 'react';
import { StudentSubmission } from '../types';
import { pushSubmissionsToGoogleSheets } from '../services/firebaseSync';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  Table, 
  Zap, 
  ArrowLeft,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface GoogleSheetsExportModalProps {
  submissions: StudentSubmission[];
  googleSheetsWebhookUrl?: string;
  onUpdateWebhookUrl?: (url: string) => void;
}

export const GoogleSheetsExportModal: React.FC<GoogleSheetsExportModalProps> = ({
  submissions,
  googleSheetsWebhookUrl = '',
  onUpdateWebhookUrl,
}) => {
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(googleSheetsWebhookUrl);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [isPushingWebhook, setIsPushingWebhook] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generate CSV Content
  const generateCSV = () => {
    const headers = [
      'Student Name',
      'Student Email',
      'Student ID',
      'School',
      'Class Group',
      'Total Score',
      'Max Score',
      'Percentage (%)',
      'Time Spent (Mins)',
      'Section 1 Score',
      'Section 2 Score',
      'Section 3 Score',
      'Section 4 Score',
      'Submitted At',
    ];

    const rows = submissions.map((s) => [
      `"${s.studentName}"`,
      `"${s.studentEmail}"`,
      `"${s.studentId}"`,
      `"${s.school}"`,
      `"${s.classGroup}"`,
      s.totalScore,
      s.maxScore || 40,
      s.percentage,
      Math.round(s.timeSpentSeconds / 60),
      s.sectionScores[1]?.score || 0,
      s.sectionScores[2]?.score || 0,
      s.sectionScores[3]?.score || 0,
      s.sectionScores[4]?.score || 0,
      `"${new Date(s.submittedAt).toLocaleString()}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(',')), '', '"The joy of the Lord is my strength"'].join('\n');
  };

  // Generate TSV for direct copy-pasting to Google Sheets
  const generateTSV = () => {
    const headers = [
      'Student Name',
      'Student Email',
      'Student ID',
      'Class',
      'Score',
      'Max Score',
      'Percentage',
      'Time Spent (mins)',
      'Section 1',
      'Section 2',
      'Section 3',
      'Section 4',
      'Timestamp',
    ];

    const rows = submissions.map((s) => [
      s.studentName,
      s.studentEmail,
      s.studentId,
      s.classGroup,
      `${s.totalScore}/${s.maxScore || 40}`,
      s.maxScore || 40,
      `${s.percentage}%`,
      Math.round(s.timeSpentSeconds / 60),
      `${s.sectionScores[1]?.score || 0}/${s.sectionScores[1]?.max || 10}`,
      `${s.sectionScores[2]?.score || 0}/${s.sectionScores[2]?.max || 10}`,
      `${s.sectionScores[3]?.score || 0}/${s.sectionScores[3]?.max || 10}`,
      `${s.sectionScores[4]?.score || 0}/${s.sectionScores[4]?.max || 10}`,
      new Date(s.submittedAt).toLocaleString(),
    ]);

    return [headers.join('\t'), ...rows.map((r) => r.join('\t')), '', 'The joy of the Lord is my strength'].join('\n');
  };

  // Handle Download CSV File
  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SDA_AddMaths_Year2_Assessment_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy TSV to Clipboard for Google Sheets Paste
  const handleCopyTSV = () => {
    const tsvContent = generateTSV();
    navigator.clipboard.writeText(tsvContent);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handleSaveWebhook = () => {
    if (onUpdateWebhookUrl) {
      onUpdateWebhookUrl(webhookUrl);
    }
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 3000);
  };

  // Push all submissions to Google Sheets Webhook now
  const handlePushAllToWebhook = async () => {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      alert('Please enter a valid Google Apps Script Webhook URL first.');
      return;
    }
    if (submissions.length === 0) {
      alert('No student submissions to push yet.');
      return;
    }

    setIsPushingWebhook(true);
    setPushResult(null);
    try {
      const result = await pushSubmissionsToGoogleSheets(webhookUrl, submissions);
      setPushResult(result);
    } catch (err: any) {
      setPushResult({ success: false, message: err?.message || 'Failed to sync to Google Sheets' });
    } finally {
      setIsPushingWebhook(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-300 mr-1"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              Export Results to Google Sheets & CSV
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Export all student test scores, section breakdowns, and submission timestamps directly into Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyTSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-300"
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copiedSuccess ? 'Copied for Google Sheets!' : 'Copy to Clipboard (Google Sheets)'}</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV File</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Live Webhook Sync Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Automatic Real-Time Google Sheets Sync (Google Apps Script Webhook)
            </h3>
          </div>
          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span>Open Google Sheets</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Paste your Google Apps Script WebHook URL to automatically push every student assessment submission directly into your designated Google Sheet in real-time.
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="flex-1 min-w-[280px] bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleSaveWebhook}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {webhookSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Globe className="w-3.5 h-3.5" />}
            <span>{webhookSaved ? 'Webhook Saved!' : 'Save Webhook Endpoint'}</span>
          </button>
          <button
            onClick={handlePushAllToWebhook}
            disabled={isPushingWebhook}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isPushingWebhook ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isPushingWebhook ? 'Syncing...' : `Push ${submissions.length} Records to Sheets Now`}</span>
          </button>
        </div>

        {pushResult && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            pushResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {pushResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pushResult.message}</span>
          </div>
        )}
      </div>

      {/* Live Data Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-600" /> Export Preview Data ({submissions.length} Records)
          </h3>
          <span className="text-xs text-slate-500">Formatted for Google Sheets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Student Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Student ID</th>
                <th className="p-3">Score</th>
                <th className="p-3">Percentage</th>
                <th className="p-3">Sec 1</th>
                <th className="p-3">Sec 2</th>
                <th className="p-3">Sec 3</th>
                <th className="p-3">Sec 4</th>
                <th className="p-3">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {submissions.map((sub, idx) => (
                <tr key={`sheets-sub-${sub.id || idx}`} className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">{sub.studentName}</td>
                  <td className="p-3 text-slate-600">{sub.studentEmail}</td>
                  <td className="p-3 text-slate-600">{sub.studentId}</td>
                  <td className="p-3 font-extrabold text-indigo-900">{sub.totalScore} / {sub.maxScore || 40}</td>
                  <td className="p-3 font-bold text-emerald-600">{sub.percentage}%</td>
                  <td className="p-3">{sub.sectionScores[1]?.score || 0}/{sub.sectionScores[1]?.max || 10}</td>
                  <td className="p-3">{sub.sectionScores[2]?.score || 0}/{sub.sectionScores[2]?.max || 10}</td>
                  <td className="p-3">{sub.sectionScores[3]?.score || 0}/{sub.sectionScores[3]?.max || 10}</td>
                  <td className="p-3">{sub.sectionScores[4]?.score || 0}/{sub.sectionScores[4]?.max || 10}</td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
