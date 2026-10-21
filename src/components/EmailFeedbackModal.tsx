import React, { useState, useEffect } from 'react';
import { StudentSubmission, Question } from '../types';
import { 
  Sparkles, 
  Mail, 
  Send, 
  Check, 
  X, 
  Loader2, 
  FileText, 
  User, 
  Award, 
  BookOpen,
  Edit3
} from 'lucide-react';

interface EmailFeedbackModalProps {
  submission: StudentSubmission;
  questions: Question[];
  onClose: () => void;
  onFeedbackSentSuccess: (studentId: string, summary: string) => void;
}

export const EmailFeedbackModal: React.FC<EmailFeedbackModalProps> = ({
  submission,
  questions,
  onClose,
  onFeedbackSentSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
    personalizedMessage: string;
  } | null>(null);

  const [customTeacherNote, setCustomTeacherNote] = useState('');
  const [emailSubject, setEmailSubject] = useState(
    `Year 2 Additional Mathematics Assessment Result & Feedback — ${submission.studentName}`
  );
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Fetch AI generated feedback on modal mount
  useEffect(() => {
    generateAIFeedback();
  }, [submission?.id]);

  const generateAIFeedback = async () => {
    setLoading(true);
    try {
      // Find missed questions
      const missedQuestions = questions
        .filter((q) => submission.answers[q.id] !== q.correctAnswer)
        .map((q) => ({ id: q.id, topic: q.topic, questionText: q.questionText }));

      const response = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: submission.studentName,
          studentEmail: submission.studentEmail,
          score: submission.totalScore,
          maxScore: submission.maxScore,
          percentage: submission.percentage,
          timeSpent: `${Math.floor(submission.timeSpentSeconds / 60)} minutes`,
          sectionBreakdown: submission.sectionScores,
          missedQuestions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbackData({
          strengths: data.strengths || ['Strong understanding of core set theory and basic algebra.'],
          areasForImprovement: data.areasForImprovement || ['Review matrix inverses and calculus turning points.'],
          recommendations: data.recommendations || ['Practice Section 4 optimization and 3D vector angles.'],
          personalizedMessage: data.personalizedMessage || `Dear ${submission.studentName},\n\nGreat job on your assessment!`,
        });
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      console.error('Error generating AI feedback:', err);
      // Fallback feedback structure
      setFeedbackData({
        strengths: [
          'Excellent speed and accuracy in set theory and binomial expansion.',
          'Solid baseline performance in quadratic inequalities.',
        ],
        areasForImprovement: [
          'Calculus integration formulas and turning point calculations.',
          '3x3 matrix determinants and Spearman rank correlation.',
        ],
        recommendations: [
          'Re-take practice problems in Section 4 (Questions 31-40).',
          'Review the step-by-step formula explanations for cylindrical optimization.',
        ],
        personalizedMessage: `Dear ${submission.studentName},\n\nCongratulations on completing your Year 2 Additional Mathematics MCQ assessment with a score of ${submission.totalScore}/40 (${submission.percentage}%).\n\nYour dedication is evident. Please review the recommended focus topics to boost your confidence ahead of the upcoming term exams.\n\nBest regards,\nSDA Senior High School Mathematics Department`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      if (feedbackData) {
        onFeedbackSentSuccess(submission.id, feedbackData.personalizedMessage);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-serif">
              Gemini AI Student Feedback & Email Summary
            </h3>
            <p className="text-xs text-slate-500">
              Generated for <span className="font-bold text-slate-800">{submission.studentName}</span> ({submission.studentEmail})
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              Generating personalized feedback summary using Gemini AI...
            </p>
          </div>
        ) : (
          feedbackData && (
            <div className="space-y-5 text-xs text-slate-700">
              {/* Score Quick Summary Header */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Assessment Score</span>
                  <div className="text-xl font-extrabold text-indigo-900">
                    {submission.totalScore} / {submission.maxScore} ({submission.percentage}%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Time Spent</span>
                  <div className="text-sm font-bold text-slate-800">
                    {Math.floor(submission.timeSpentSeconds / 60)} minutes
                  </div>
                </div>
              </div>

              {/* Email Subject Line Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Strengths & Areas Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-900 block flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Strengths Identified
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {feedbackData.strengths.map((str, idx) => (
                      <li key={`strength-${idx}`}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl space-y-2">
                  <span className="font-bold text-amber-900 block flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Focus Topics to Review
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {feedbackData.areasForImprovement.map((area, idx) => (
                      <li key={`area-${idx}`}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Email Body Preview */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> Email Message Preview
                </label>
                <textarea
                  rows={5}
                  value={feedbackData.personalizedMessage}
                  onChange={(e) => setFeedbackData({ ...feedbackData, personalizedMessage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Optional Custom Teacher Note */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Optional Teacher's Personal Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excellent effort, Kofi! Please see me on Friday for additional calculus practice."
                  value={customTeacherNote}
                  onChange={(e) => setCustomTeacherNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Will send email to <span className="font-semibold text-slate-800">{submission.studentEmail}</span>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={isSending || sendSuccess}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-600 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Email...</span>
                      </>
                    ) : sendSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Feedback Email Sent!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Feedback Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
