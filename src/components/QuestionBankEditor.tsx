import React, { useState, useRef } from 'react';
import { Question } from '../types';
import { MathRenderer } from './MathRenderer';
import { 
  HelpCircle, 
  Search, 
  Check, 
  Edit3, 
  BookOpen, 
  Sparkles,
  Key,
  ArrowLeft,
  Trash2,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';

interface QuestionBankEditorProps {
  questions: Question[];
  onUpdateQuestion: (updatedQuestion: Question) => void;
  onDeleteQuestion?: (questionId: number) => void;
}

export const QuestionBankEditor: React.FC<QuestionBankEditorProps> = ({
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<Question | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const topicsList = ['All', ...Array.from(new Set(questions.map((q) => q.topic)))];

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toString() === searchTerm ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || q.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  const handleStartEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditingForm({ ...q });
  };

  const handleSaveEdit = () => {
    if (editingForm) {
      onUpdateQuestion(editingForm);
      setEditingQuestionId(null);
      setEditingForm(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
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
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              40 MCQs Assessment Item Bank & Official Answer Keys
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Year 2 Additional Mathematics assessment bank with standard LaTeX MathML math codes, keys, and formula step-by-step explanations.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
          <Key className="w-4 h-4 text-amber-500" />
          <span>40 Verified Items & Explanations</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or LaTeX math..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Filter Topic:</span>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-800"
          >
            {topicsList.map((t, idx) => (
              <option key={`qbank-topic-${t}-${idx}`} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const isEditing = editingQuestionId === q.id;

          return (
            <div
              key={`qbank-q-${q.id || idx}`}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 transition-all hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    Q{q.id}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {q.topic}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                    Key: Option {q.correctAnswer}
                  </span>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(q)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Key / Explanation
                    </button>
                    {onDeleteQuestion && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete Question Q${q.id}?`)) {
                            onDeleteQuestion(q.id);
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete question from assessment bank"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditing && editingForm ? (
                /* Editing Form View */
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Question Text (LaTeX supported)
                    </label>
                    <textarea
                      rows={2}
                      value={editingForm.questionText}
                      onChange={(e) => setEditingForm({ ...editingForm, questionText: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Correct Answer Key
                    </label>
                    <select
                      value={editingForm.correctAnswer}
                      onChange={(e) =>
                        setEditingForm({ ...editingForm, correctAnswer: e.target.value as 'A' | 'B' | 'C' | 'D' })
                      }
                      className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-indigo-700"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Step-by-Step Solution Explanation
                    </label>
                    <textarea
                      rows={3}
                      value={editingForm.explanation}
                      onChange={(e) => setEditingForm({ ...editingForm, explanation: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>

                  {/* Diagram / Image Attachment Section */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attached Diagram / Picture / Graph</span>
                    </label>
                    
                    {editingForm.imageUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <img
                            src={editingForm.imageUrl}
                            alt="Attached diagram preview"
                            className="max-h-24 max-w-[140px] rounded-lg border border-slate-200 object-contain bg-white shadow-2xs"
                          />
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Diagram Attached
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs text-indigo-700 hover:text-indigo-900 font-medium underline cursor-pointer"
                              >
                                Replace Picture
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setEditingForm({ ...editingForm, imageUrl: undefined })}
                                className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                              >
                                Remove Picture
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Image File (PNG, JPG, SVG)</span>
                        </button>
                        <span className="text-xs text-slate-400">or paste image URL below</span>
                        <input
                          type="text"
                          placeholder="https://... or data:image/..."
                          value={editingForm.imageUrl || ''}
                          onChange={(e) => setEditingForm({ ...editingForm, imageUrl: e.target.value.trim() || undefined })}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target?.result as string;
                            if (dataUrl) {
                              setEditingForm({ ...editingForm, imageUrl: dataUrl });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingQuestionId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                /* Readonly View */
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-900 leading-relaxed">
                    <MathRenderer math={q.questionText} />
                  </div>

                  {/* Attached Diagram Rendering */}
                  {q.imageUrl && (
                    <div className="my-2.5 p-2 bg-slate-50/80 rounded-2xl border border-slate-200 inline-block">
                      <div className="flex items-center justify-between gap-3 mb-1.5 px-1">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-indigo-600" /> Attached Figure / Diagram
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewImage(q.imageUrl || null)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                        >
                          Click to Enlarge
                        </button>
                      </div>
                      <img
                        src={q.imageUrl}
                        alt={`Diagram for Question ${q.id}`}
                        onClick={() => setPreviewImage(q.imageUrl || null)}
                        className="max-h-56 max-w-full sm:max-w-md rounded-xl border border-slate-200 shadow-2xs object-contain bg-white cursor-zoom-in hover:opacity-95"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                    {q.options.map((opt, optIdx) => {
                      const isKey = q.correctAnswer === opt.id;
                      return (
                        <div
                          key={`qbank-opt-${q.id || 'q'}-${opt.id || optIdx}-${optIdx}`}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                            isKey
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isKey ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <MathRenderer math={opt.text} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block mb-0.5">Formula & Step-by-Step Explanation:</span>
                    <MathRenderer math={q.explanation} />
                    {q.officialKeyNote && (
                      <p className="text-[11px] text-amber-700 italic pt-1 border-t border-slate-200 mt-1">
                        Note on Answer Key: {q.officialKeyNote}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox / Zoom Dialog */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col items-center relative shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              title="Close zoom"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-2 w-full flex justify-center items-center overflow-auto max-h-[80vh]">
              <img
                src={previewImage}
                alt="Enlarged Diagram"
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Diagram inspection preview. Click anywhere outside or Esc to close.</p>
          </div>
        </div>
      )}
    </div>
  );
};
