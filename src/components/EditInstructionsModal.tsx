import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Save, 
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { QuizConfig } from '../types';
import { DEFAULT_QUIZ_INSTRUCTIONS, getQuizInstructionBullets } from '../utils/instructionsUtils';

interface EditInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizConfig | null;
  onSaveInstructions: (quizId: string, updatedBullets: string[]) => void;
}

export const EditInstructionsModal: React.FC<EditInstructionsModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onSaveInstructions,
}) => {
  const [bullets, setBullets] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (quiz) {
      setBullets(getQuizInstructionBullets(quiz));
      setSaveSuccess(false);
    }
  }, [quiz, isOpen]);

  if (!isOpen || !quiz) return null;

  const handleUpdateBullet = (index: number, value: string) => {
    const updated = [...bullets];
    updated[index] = value;
    setBullets(updated);
  };

  const handleAddBullet = () => {
    if (bullets.length < 8) {
      setBullets([...bullets, 'New examination guideline for candidate review.']);
    }
  };

  const handleRemoveBullet = (index: number) => {
    if (bullets.length > 2) {
      setBullets(bullets.filter((_, i) => i !== index));
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const copy = [...bullets];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      setBullets(copy);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < bullets.length - 1) {
      const copy = [...bullets];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      setBullets(copy);
    }
  };

  const handleResetDefaults = () => {
    setBullets([...DEFAULT_QUIZ_INSTRUCTIONS]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBullets = bullets.map((b) => b.trim()).filter((b) => b.length > 0);
    if (cleanBullets.length < 2) {
      alert('Please provide at least 2 instruction bullet points.');
      return;
    }
    if (quiz.id) {
      onSaveInstructions(quiz.id, cleanBullets);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                General Instructions Manager
              </span>
              <h2 className="text-lg font-bold font-serif text-white mt-1">
                Edit Quiz Instructions (4–5 Bullets)
              </h2>
              <p className="text-xs text-slate-300">
                {quiz.title || quiz.code || 'Assessment Paper'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-900 leading-relaxed">
              <p className="font-bold">Student Guidance & Syncing:</p>
              <p className="text-indigo-800 text-[11px] mt-0.5">
                These bullet points appear prominently to students before starting the examination and inside the examination interface. Keep instructions concise, clear, and action-oriented.
              </p>
            </div>
          </div>

          {/* Bullet Points List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Instruction Points ({bullets.length} Bullets)
              </label>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Restore system default guidelines"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Standard 5 Bullets</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 transition-all focus-within:border-indigo-400 focus-within:bg-white"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </div>

                  <textarea
                    rows={2}
                    value={bullet}
                    onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                    required
                    placeholder={`Guideline #${idx + 1}...`}
                    className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-slate-800 border-none resize-none focus:outline-none p-1 leading-relaxed"
                  />

                  {/* Action Reorder & Delete */}
                  <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === bullets.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(idx)}
                      disabled={bullets.length <= 2}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer self-center"
                      title="Delete Guideline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {bullets.length < 8 && (
              <button
                type="button"
                onClick={handleAddBullet}
                className="w-full py-2.5 border border-dashed border-slate-300 hover:border-indigo-500 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Additional Instruction Bullet</span>
              </button>
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saveSuccess}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Instructions Saved & Synced!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Sync Instructions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
