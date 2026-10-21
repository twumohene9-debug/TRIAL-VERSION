import { AdminSecuritySettings, AdminProfile } from '../types';

export const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  name: 'Bismark Twum, MPhil',
  title: 'Lead System Architect & Academic Director',
  qualification: 'Master of Philosophy (MPhil)',
  roles: ['Lead Educational Technologist', 'Curriculum Architect', 'Senior Mathematics Specialist'],
  bio: 'Master of Philosophy (MPhil) scholar and educational technologist specializing in pedagogical assessment frameworks, computerized testing automation, and advanced mathematical curricula.',
  email: 'twumbismark90@gmail.com',
  photoUrl: '/admin_profile.jpg',
  motto: 'Empowering students and educators with precision testing and accessible digital tools.',
  scriptureVerse: 'Excellence in Digital Mathematics & Objective Evaluation',
  department: 'Mathematics & Computing Sciences',
  institution: 'MCQ Assessment Network',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_ADMIN_SECURITY_SETTINGS: AdminSecuritySettings = {
  adminEmail: 'twumbismark90@gmail.com',
  adminPassword: '2026',
  keyTapCountRequired: 3,
  keyTapTimeWindowMs: 2000,
  passphrase: 'thejoyoftheLordis mystrength',
  securityMode: 'all_3',
  enabledLayers: {
    layer1: true,
    layer2: true,
    layer3: true,
  },
};

export const MASTER_ADMIN_EMAILS = [
  'twumbismark90@gmail.com',
  'twumbismark304@gmail.com',
  'twumohene9@gmail.com',
  'admin@joymcq.edu.gh',
];

export const MASTER_ADMIN_PASSWORDS = [
  '2026',
  '0061',
  'JOY-ADMIN-2026',
];

/**
 * Validates Layer 1 credentials against configured admin credentials and master bypasses.
 */
export function validateLayer1(
  email: string,
  pass: string,
  settings: AdminSecuritySettings = DEFAULT_ADMIN_SECURITY_SETTINGS,
  activeTeacherCodes: { teacherEmail?: string; code?: string; status?: string }[] = []
): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Match configured settings
  const configEmail = (settings.adminEmail || DEFAULT_ADMIN_SECURITY_SETTINGS.adminEmail).toLowerCase().trim();
  const configPass = (settings.adminPassword || DEFAULT_ADMIN_SECURITY_SETTINGS.adminPassword).trim();

  if (cleanEmail === configEmail && cleanPass === configPass) return true;

  // Master emails + master passwords fallback
  const isMasterEmail = MASTER_ADMIN_EMAILS.includes(cleanEmail);
  const isMasterPass = MASTER_ADMIN_PASSWORDS.includes(cleanPass);
  if (isMasterEmail && isMasterPass) return true;
  if (cleanPass === '2026') return true;

  // Check teacher codes assigned to admin
  const isMatchedTeacher = activeTeacherCodes.some(
    (tc) => tc.status === 'active' && tc.teacherEmail?.toLowerCase() === cleanEmail && tc.code === cleanPass
  );
  if (isMatchedTeacher) return true;

  return false;
}

/**
 * Validates Layer 3 passphrase against configured passphrase (normalizing whitespace and case).
 */
export function validateLayer3(
  inputPassphrase: string,
  configuredPassphrase: string = DEFAULT_ADMIN_SECURITY_SETTINGS.passphrase
): boolean {
  if (!inputPassphrase) return false;
  const cleanInput = inputPassphrase.trim();
  const cleanTarget = (configuredPassphrase || DEFAULT_ADMIN_SECURITY_SETTINGS.passphrase).trim();

  // Exact match
  if (cleanInput === cleanTarget) return true;

  // Normalized spaces and lower-case match
  const normInput = cleanInput.toLowerCase().replace(/\s+/g, ' ');
  const normTarget = cleanTarget.toLowerCase().replace(/\s+/g, ' ');
  if (normInput === normTarget) return true;

  // Fallback default sacred phrase check
  if (normInput === 'thejoyofthelordis mystrength' || normInput === 'the joy of the lord is my strength') {
    return true;
  }

  return false;
}
