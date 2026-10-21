import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Award,
  BookOpen,
  Mail,
  Building,
  Heart,
  ShieldCheck,
  Lock,
  Key,
  Fingerprint,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  Layers,
  Sliders
} from 'lucide-react';
import { AdminProfile, AdminSecuritySettings, SystemSettings } from '../types';
import { DEFAULT_ADMIN_SECURITY_SETTINGS, DEFAULT_ADMIN_PROFILE } from '../utils/adminSecurityDefaults';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminProfile?: AdminProfile;
  onSaveProfile: (updatedProfile: AdminProfile) => Promise<void>;
  systemSettings?: SystemSettings;
  onUpdateSystemSettings?: (settings: Partial<SystemSettings>) => Promise<void> | void;
}

export { DEFAULT_ADMIN_PROFILE };

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  isOpen,
  onClose,
  adminProfile,
  onSaveProfile,
  systemSettings,
  onUpdateSystemSettings,
}) => {
  if (!isOpen) return null;

  const [activeModalTab, setActiveModalTab] = useState<'profile' | 'security'>('profile');

  // Profile Form State
  const [formData, setFormData] = useState<AdminProfile>({
    ...DEFAULT_ADMIN_PROFILE,
    ...adminProfile,
    roles: Array.isArray(adminProfile?.roles) && adminProfile.roles.length > 0
      ? adminProfile.roles
      : DEFAULT_ADMIN_PROFILE.roles,
  });

  const [rolesInput, setRolesInput] = useState<string>(
    (formData.roles || []).join(', ')
  );
  const [photoMode, setPhotoMode] = useState<'upload' | 'url' | 'default'>('upload');
  const [urlInput, setUrlInput] = useState<string>(formData.photoUrl || '');
  const [previewPhoto, setPreviewPhoto] = useState<string>(
    formData.customPhotoBase64 || formData.photoUrl || '/admin_profile.jpg'
  );

  // Security Form State
  const currentSecurity: AdminSecuritySettings = {
    ...DEFAULT_ADMIN_SECURITY_SETTINGS,
    ...(systemSettings?.adminSecurity || {}),
  };

  const [securityMode, setSecurityMode] = useState<AdminSecuritySettings['securityMode']>(
    currentSecurity.securityMode || 'all_3'
  );
  const [enabledLayers, setEnabledLayers] = useState({
    layer1: currentSecurity.enabledLayers?.layer1 ?? true,
    layer2: currentSecurity.enabledLayers?.layer2 ?? true,
    layer3: currentSecurity.enabledLayers?.layer3 ?? true,
  });

  // Layer 1
  const [secAdminEmail, setSecAdminEmail] = useState(currentSecurity.adminEmail || 'twumbismark90@gmail.com');
  const [secAdminPassword, setSecAdminPassword] = useState(currentSecurity.adminPassword || '2026');
  const [showPassword, setShowPassword] = useState(false);

  // Layer 2
  const [keyTapCountRequired, setKeyTapCountRequired] = useState(currentSecurity.keyTapCountRequired || 3);
  const [keyTapTimeWindowMs, setKeyTapTimeWindowMs] = useState(currentSecurity.keyTapTimeWindowMs || 2000);

  // Layer 3
  const [passphrase, setPassphrase] = useState(currentSecurity.passphrase || 'thejoyoftheLordis mystrength');
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Shared state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file upload (compress and convert to base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image is too large. Please choose an image under 8MB.');
      return;
    }

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
            setPreviewPhoto(compressedBase64);
            setFormData((prev) => ({
              ...prev,
              customPhotoBase64: compressedBase64,
              photoUrl: compressedBase64,
            }));
          }
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPreviewPhoto(urlInput.trim());
    setFormData((prev) => ({
      ...prev,
      photoUrl: urlInput.trim(),
      customPhotoBase64: undefined,
    }));
  };

  const handleResetToDefault = () => {
    setPreviewPhoto('/admin_profile.jpg');
    setUrlInput('/admin_profile.jpg');
    setFormData((prev) => ({
      ...prev,
      photoUrl: '/admin_profile.jpg',
      customPhotoBase64: undefined,
    }));
  };

  const handleResetSecurityToDefaults = () => {
    setSecurityMode('all_3');
    setEnabledLayers({ layer1: true, layer2: true, layer3: true });
    setSecAdminEmail(DEFAULT_ADMIN_SECURITY_SETTINGS.adminEmail);
    setSecAdminPassword(DEFAULT_ADMIN_SECURITY_SETTINGS.adminPassword);
    setKeyTapCountRequired(DEFAULT_ADMIN_SECURITY_SETTINGS.keyTapCountRequired);
    setKeyTapTimeWindowMs(DEFAULT_ADMIN_SECURITY_SETTINGS.keyTapTimeWindowMs);
    setPassphrase(DEFAULT_ADMIN_SECURITY_SETTINGS.passphrase);
    setErrorMessage('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Admin name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const parsedRoles = rolesInput
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const finalProfile: AdminProfile = {
        ...formData,
        roles: parsedRoles.length > 0 ? parsedRoles : DEFAULT_ADMIN_PROFILE.roles,
        photoUrl: previewPhoto,
        customPhotoBase64: formData.customPhotoBase64 || (previewPhoto.startsWith('data:') ? previewPhoto : undefined),
        updatedAt: new Date().toISOString(),
      };

      await onSaveProfile(finalProfile);

      // Also persist Security Policy if onUpdateSystemSettings is available
      if (onUpdateSystemSettings) {
        const updatedSecurity: AdminSecuritySettings = {
          adminEmail: secAdminEmail.trim(),
          adminPassword: secAdminPassword.trim(),
          keyTapCountRequired: Number(keyTapCountRequired) || 3,
          keyTapTimeWindowMs: Number(keyTapTimeWindowMs) || 2000,
          passphrase: passphrase.trim(),
          securityMode,
          enabledLayers,
        };

        await onUpdateSystemSettings({
          adminSecurity: updatedSecurity,
          adminContactEmail: secAdminEmail.trim() || systemSettings?.adminContactEmail,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving admin profile/security:', err);
      setErrorMessage(err?.message || 'Failed to save settings. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="admin-profile-modal-overlay" className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col my-auto text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {activeModalTab === 'profile' ? <Camera className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Administrator Profile & Security
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cloud Synced
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage your public academic credentials and multi-layer security locks
              </p>
            </div>
          </div>
          <button
            id="close-admin-profile-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 pt-4 pb-0 bg-slate-900/90 flex gap-2 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveModalTab('profile')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeModalTab === 'profile'
                ? 'bg-slate-800 text-amber-300 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Academic Profile & Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab('security')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeModalTab === 'security'
                ? 'bg-slate-800 text-amber-300 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & Access Locks</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>Settings successfully saved and synced across all devices!</span>
            </div>
          )}

          {/* ================= TAB 1: ACADEMIC PROFILE & PHOTO ================= */}
          {activeModalTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Photo Section */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 sm:p-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                  1. Administrator Profile Photo
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Photo Preview */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-950 shadow-lg relative">
                      <img
                        src={previewPhoto}
                        alt={formData.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/admin_profile.jpg';
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-md border-2 border-slate-900">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Photo Controls */}
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                      <button
                        type="button"
                        onClick={() => setPhotoMode('upload')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                          photoMode === 'upload'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Upload from Device
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoMode('url')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                          photoMode === 'url'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Image Web URL
                      </button>
                    </div>

                    {photoMode === 'upload' && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          id="upload-admin-photo-trigger-btn"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2.5 px-4 bg-slate-700/70 hover:bg-slate-700 border border-slate-600 border-dashed rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-emerald-400" />
                          Click to choose photo from your Computer / Phone
                        </button>
                        <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                          Supports JPG, PNG, WebP (auto-optimized and compressed)
                        </p>
                      </div>
                    )}

                    {photoMode === 'url' && (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyUrl}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset to Default Official Portrait
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  2. Academic & Administrative Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Full Name & Titles
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Bismark Twum, MPhil"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Highest Degree / Qualifications
                    </label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="e.g. Master of Philosophy (MPhil)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Primary Position / System Role
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Lead System Architect & Academic Director"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. twumbismark90@gmail.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Roles & Specializations (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={rolesInput}
                    onChange={(e) => setRolesInput(e.target.value)}
                    placeholder="e.g. Lead Educational Technologist, Curriculum Architect, Senior Mathematics Specialist"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Academic Bio & Summary
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief professional profile and academic direction summary..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Guiding Scripture / Platform Motto
                    </label>
                    <input
                      type="text"
                      value={formData.scriptureVerse || ''}
                      onChange={(e) => setFormData({ ...formData, scriptureVerse: e.target.value })}
                      placeholder="e.g. Excellence in Digital Mathematics & Objective Evaluation"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Department / Institution
                    </label>
                    <input
                      type="text"
                      value={formData.institution || ''}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      placeholder="e.g. MCQ Assessment Network"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: SECURITY & MULTI-LOCK SETTINGS ================= */}
          {activeModalTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Security Mode Selector: 3 Layers, 2 Layers, or 1 Layer */}
              <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Required Security Verification Policy
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSecurityToDefaults}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All to Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: All 3 Layers */}
                  <div
                    onClick={() => setSecurityMode('all_3')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      securityMode === 'all_3'
                        ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black">All 3 Layers</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                        3 of 3
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Requires Identity + Key + Passphrase to enter.
                    </p>
                  </div>

                  {/* Option 2: Any 2 Layers */}
                  <div
                    onClick={() => setSecurityMode('any_2')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      securityMode === 'any_2'
                        ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black">Any 2 Layers</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                        2 of 3
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Complete any 2 security locks to unlock access.
                    </p>
                  </div>

                  {/* Option 3: Any 1 Layer */}
                  <div
                    onClick={() => setSecurityMode('any_1')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      securityMode === 'any_1'
                        ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black">Any 1 Layer</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                        1 of 3
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Complete any single lock to unlock access.
                    </p>
                  </div>
                </div>
              </div>

              {/* Layer 1 Settings & Reset */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Layer 1: Identity & Password Credentials
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSecAdminEmail('twumbismark90@gmail.com');
                      setSecAdminPassword('2026');
                    }}
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Layer 1</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Master Administrator Email
                    </label>
                    <input
                      type="email"
                      value={secAdminEmail}
                      onChange={(e) => setSecAdminEmail(e.target.value)}
                      placeholder="e.g. twumbismark90@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Master Security Password / PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={secAdminPassword}
                        onChange={(e) => setSecAdminPassword(e.target.value)}
                        placeholder="Security code"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-xs text-white focus:border-amber-400 tracking-wider"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 2 Settings & Reset */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Layer 2: Golden Access Key Rhythm
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setKeyTapCountRequired(3);
                      setKeyTapTimeWindowMs(2000);
                    }}
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to 3 Taps in 2.0s</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Required Tap Count
                    </label>
                    <select
                      value={keyTapCountRequired}
                      onChange={(e) => setKeyTapCountRequired(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400"
                    >
                      <option value={2}>2 Taps</option>
                      <option value={3}>3 Taps (Recommended Default)</option>
                      <option value={4}>4 Taps</option>
                      <option value={5}>5 Taps</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Time Window (Milliseconds)
                    </label>
                    <select
                      value={keyTapTimeWindowMs}
                      onChange={(e) => setKeyTapTimeWindowMs(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400"
                    >
                      <option value={1500}>1.5 Seconds (Fast)</option>
                      <option value={2000}>2.0 Seconds (Default Standard)</option>
                      <option value={3000}>3.0 Seconds (Relaxed)</option>
                      <option value={4000}>4.0 Seconds (Extended)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Layer 3 Settings & Reset */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Layer 3: Security Passphrase
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPassphrase('thejoyoftheLordis mystrength')}
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Passphrase</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Custom Secret Passphrase
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter custom passphrase"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-xs text-white focus:border-amber-400 font-mono tracking-wide"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Updates instantly sync to Firestore database & Express Server
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="save-admin-profile-btn"
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-900/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Syncing Cloud...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save & Apply Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
