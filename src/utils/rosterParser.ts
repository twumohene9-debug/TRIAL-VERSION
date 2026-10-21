import * as XLSX from 'xlsx';
import { QuizConfig, RosterStudent, StudentSubmission } from '../types';

export interface RosterParseResult {
  success: boolean;
  students: RosterStudent[];
  totalParsed: number;
  validCount: number;
  duplicateCount: number;
  warnings: string[];
  errors: string[];
  detectedColumns: {
    nameCol?: string;
    idCol?: string;
    emailCol?: string;
    classCol?: string;
  };
}

export interface RosterValidationResult {
  authorized: boolean;
  matchedStudent?: RosterStudent;
  reason?: 'authorized' | 'not_found' | 'attempt_blocked' | 'missing_credentials';
  message: string;
}

const ID_HEADER_ALIASES = [
  'id',
  'studentid',
  'student_id',
  'student id',
  'student no',
  'student_no',
  'studentno',
  'student number',
  'student_number',
  'id no',
  'id_no',
  'idno',
  'id number',
  'id_number',
  'roll',
  'rollno',
  'roll_no',
  'roll no',
  'roll number',
  'index',
  'indexno',
  'index_no',
  'index no',
  'index number',
  'indexnumber',
  'matric',
  'matricno',
  'matric_no',
  'matric no',
  'matriculation',
  'regno',
  'reg_no',
  'reg no',
  'reg number',
  'registration no',
  'registration number',
  'admission_no',
  'admissionno',
  'admission no',
  'admission number',
  'adm_no',
  'adm no',
  'candidate_id',
  'candidate id',
  'candidateid',
  'candidate identifier',
  'reference no',
  'ref no',
  'seat no',
  'seat_no',
  'pin',
  'code'
];

const NAME_HEADER_ALIASES = [
  'name',
  'fullname',
  'full_name',
  'full name',
  'student_name',
  'studentname',
  'student name',
  'candidate_name',
  'candidate name',
  'candidatename',
  'candidate',
  'candidates',
  'names',
  'student',
  'students',
  'learner',
  'learners',
  'pupil',
  'pupils',
  'user',
  'username',
  'account'
];

const FIRST_NAME_ALIASES = ['first_name', 'firstname', 'first name', 'given_name', 'given name', 'fname', 'first'];
const LAST_NAME_ALIASES = ['last_name', 'lastname', 'last name', 'surname', 'family_name', 'family name', 'lname', 'last'];

const EMAIL_HEADER_ALIASES = [
  'email',
  'studentemail',
  'student_email',
  'student email',
  'mail',
  'emailaddress',
  'email_address',
  'email address',
  'e-mail',
  'e_mail',
  'e-mail address',
  'contact email',
  'electronic mail',
  'gmail'
];

const CLASS_HEADER_ALIASES = [
  'class',
  'classgroup',
  'class_group',
  'class group',
  'stream',
  'form',
  'grade',
  'section',
  'department',
  'batch',
  'division',
  'course',
  'level',
  'group',
  'cohort',
  'track',
  'arm'
];

function normalizeHeader(h: unknown): string {
  if (h === null || h === undefined) return '';
  return String(h).trim().toLowerCase().replace(/[\t\r\n]+/g, ' ');
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV File into structured RosterStudent[]
 * Inspects all sheets to select the worksheet with actual student data.
 */
export async function parseStudentRosterFile(file: File): Promise<RosterParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            students: [],
            totalParsed: 0,
            validCount: 0,
            duplicateCount: 0,
            warnings: [],
            errors: ['The uploaded workbook contains no readable sheets.'],
            detectedColumns: {},
          });
          return;
        }

        // Intelligently find the worksheet that contains student data
        let selectedWorksheet = workbook.Sheets[workbook.SheetNames[0]];
        let maxRowCount = 0;

        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          if (!ws) continue;
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
          if (rows && rows.length > maxRowCount) {
            maxRowCount = rows.length;
            selectedWorksheet = ws;
          }
        }

        const rawRows = XLSX.utils.sheet_to_json(selectedWorksheet, { header: 1, defval: '' }) as any[][];
        const result = parseRosterRows(rawRows);
        resolve(result);
      } catch (err: any) {
        console.error('Roster parse error:', err);
        resolve({
          success: false,
          students: [],
          totalParsed: 0,
          validCount: 0,
          duplicateCount: 0,
          warnings: [],
          errors: [`Failed to read file: ${err?.message || 'Invalid or corrupted file.'}`],
          detectedColumns: {},
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        students: [],
        totalParsed: 0,
        validCount: 0,
        duplicateCount: 0,
        warnings: [],
        errors: ['File reading error occurred.'],
        detectedColumns: {},
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Core matrix parser: detects headers, extracts columns, validates duplicates
 */
export function parseRosterRows(rawRows: any[][]): RosterParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!rawRows || rawRows.length < 2) {
    return {
      success: false,
      students: [],
      totalParsed: 0,
      validCount: 0,
      duplicateCount: 0,
      warnings,
      errors: ['The uploaded file is empty or does not contain a header row followed by student records.'],
      detectedColumns: {},
    };
  }

  // 1. Locate the header row (sometimes teachers put titles on row 1 or 2)
  let headerRowIndex = -1;
  let idColIdx = -1;
  let nameColIdx = -1;
  let firstNameColIdx = -1;
  let lastNameColIdx = -1;
  let emailColIdx = -1;
  let classColIdx = -1;

  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeader(row[c]);
      if (!cell) continue;

      if (idColIdx === -1 && ID_HEADER_ALIASES.some((a) => cell === a || cell.replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))) {
        idColIdx = c;
      }
      if (nameColIdx === -1 && NAME_HEADER_ALIASES.some((a) => cell === a || cell.replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))) {
        nameColIdx = c;
      }
      if (firstNameColIdx === -1 && FIRST_NAME_ALIASES.some((a) => cell === a || cell.replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))) {
        firstNameColIdx = c;
      }
      if (lastNameColIdx === -1 && LAST_NAME_ALIASES.some((a) => cell === a || cell.replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))) {
        lastNameColIdx = c;
      }
      if (emailColIdx === -1 && EMAIL_HEADER_ALIASES.some((a) => cell === a || cell.replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))) {
        emailColIdx = c;
      }
      if (classColIdx === -1 && CLASS_HEADER_ALIASES.some((a) => cell === a || cell.replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))) {
        classColIdx = c;
      }
    }

    // Found both an ID and a Name column, or at least two matching columns
    if ((idColIdx !== -1 || emailColIdx !== -1) && (nameColIdx !== -1 || firstNameColIdx !== -1)) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback: If not found by strict matching, check row 0
  if (headerRowIndex === -1 && rawRows.length > 0) {
    headerRowIndex = 0;
    const headerRow = rawRows[0] || [];
    headerRow.forEach((cell, idx) => {
      const text = normalizeHeader(cell);
      if (idColIdx === -1 && (text.includes('id') || text.includes('roll') || text.includes('index') || text.includes('matric'))) idColIdx = idx;
      if (nameColIdx === -1 && (text.includes('name') && !text.includes('first') && !text.includes('last'))) nameColIdx = idx;
      if (firstNameColIdx === -1 && text.includes('first')) firstNameColIdx = idx;
      if (lastNameColIdx === -1 && (text.includes('last') || text.includes('surname'))) lastNameColIdx = idx;
      if (emailColIdx === -1 && text.includes('mail')) emailColIdx = idx;
      if (classColIdx === -1 && (text.includes('class') || text.includes('stream') || text.includes('grade') || text.includes('section'))) classColIdx = idx;
    });
  }

  // If still no ID or Name column detected, assign fallback default column positions: Col 0 = ID, Col 1 = Name, Col 2 = Email, Col 3 = Class
  if (idColIdx === -1 && nameColIdx === -1 && firstNameColIdx === -1) {
    warnings.push('Header row could not be definitively matched. Assuming Column 1: Student ID, Column 2: Full Name, Column 3: Email, Column 4: Class.');
    idColIdx = 0;
    nameColIdx = 1;
    emailColIdx = 2;
    classColIdx = 3;
    headerRowIndex = 0;
  } else if (idColIdx === -1 && emailColIdx !== -1) {
    warnings.push('No dedicated Student ID column detected; candidate emails will be used as candidate identity keys.');
  }

  const detectedColumns = {
    idCol: idColIdx !== -1 ? String(rawRows[headerRowIndex]?.[idColIdx] || 'Col ' + (idColIdx + 1)) : undefined,
    nameCol: nameColIdx !== -1 
      ? String(rawRows[headerRowIndex]?.[nameColIdx] || 'Col ' + (nameColIdx + 1)) 
      : (firstNameColIdx !== -1 ? 'First & Last Name' : undefined),
    emailCol: emailColIdx !== -1 ? String(rawRows[headerRowIndex]?.[emailColIdx] || 'Col ' + (emailColIdx + 1)) : undefined,
    classCol: classColIdx !== -1 ? String(rawRows[headerRowIndex]?.[classColIdx] || 'Col ' + (classColIdx + 1)) : undefined,
  };

  const students: RosterStudent[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  let duplicateCount = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    // Check if entire row is empty
    const hasContent = row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasContent) continue;

    let studentId = idColIdx !== -1 ? String(row[idColIdx] ?? '').trim() : '';
    let name = nameColIdx !== -1 ? String(row[nameColIdx] ?? '').trim() : '';
    const email = emailColIdx !== -1 ? String(row[emailColIdx] ?? '').trim() : '';
    const classGroup = classColIdx !== -1 ? String(row[classColIdx] ?? '').trim() : '';

    // If first & last name were separate
    if (!name && (firstNameColIdx !== -1 || lastNameColIdx !== -1)) {
      const first = firstNameColIdx !== -1 ? String(row[firstNameColIdx] ?? '').trim() : '';
      const last = lastNameColIdx !== -1 ? String(row[lastNameColIdx] ?? '').trim() : '';
      name = `${first} ${last}`.trim();
    }

    // If ID was missing but email is present, synthesize ID from email
    if (!studentId && email) {
      studentId = email.split('@')[0].toUpperCase();
    }

    if (!name && !studentId && !email) {
      continue;
    }

    // Validate minimum requirement
    if (!name) {
      warnings.push(`Row ${r + 1}: Missing student name. Generated placeholder based on ID (${studentId || 'Candidate'}).`);
      name = studentId ? `Candidate ${studentId}` : `Student Row ${r + 1}`;
    }

    if (!studentId && !email) {
      warnings.push(`Row ${r + 1} (${name}): Skipped because both Student ID and Email are blank.`);
      continue;
    }

    // Normalize keys for duplicate checking
    const normId = studentId.toUpperCase();
    const normEmail = email.toLowerCase();

    if ((normId && seenIds.has(normId)) || (normEmail && seenEmails.has(normEmail))) {
      duplicateCount++;
      warnings.push(`Row ${r + 1}: Duplicate entry detected for "${name}" (${studentId || email}). Skipped duplicate.`);
      continue;
    }

    if (normId) seenIds.add(normId);
    if (normEmail) seenEmails.add(normEmail);

    students.push({
      id: `ros-${Date.now().toString(36)}-${r}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      studentId: studentId || (email ? email.split('@')[0].toUpperCase() : `ID-${r}`),
      email: email || undefined,
      classGroup: classGroup || undefined,
      addedAt: new Date().toISOString(),
      status: 'not_started',
      attemptAllowed: true,
    });
  }

  if (students.length === 0) {
    errors.push('No valid student records could be extracted from the uploaded document.');
  }

  return {
    success: students.length > 0 && errors.length === 0,
    students,
    totalParsed: rawRows.length - (headerRowIndex + 1),
    validCount: students.length,
    duplicateCount,
    warnings,
    errors,
    detectedColumns,
  };
}

/**
 * Downloads a pre-formatted Excel template for teachers to fill out
 * Structured with Candidate Name, Student ID, and Email.
 * Also includes an Upload Guidelines sheet explaining that custom templates are fully supported.
 */
export function generateRosterTemplateExcel(quizTitle?: string): void {
  const sampleData = [
    {
      'Candidate Name': 'Kofi Mensah',
      'Student ID': 'SDA-2026-001',
      'Email': 'kofi.mensah@sdashs.edu.gh',
      'Class / Stream (Optional)': 'SHS 2 Science A',
      'Notes (Optional)': 'Registered Student',
    },
    {
      'Candidate Name': 'Abena Osei Poku',
      'Student ID': 'SDA-2026-002',
      'Email': 'abena.osei@sdashs.edu.gh',
      'Class / Stream (Optional)': 'SHS 2 Science A',
      'Notes (Optional)': 'Registered Student',
    },
    {
      'Candidate Name': 'Kwame Asare',
      'Student ID': 'SDA-2026-003',
      'Email': 'kwame.asare@sdashs.edu.gh',
      'Class / Stream (Optional)': 'SHS 2 Science B',
      'Notes (Optional)': 'Registered Student',
    },
    {
      'Candidate Name': 'Akosua Frimpomaa',
      'Student ID': 'SDA-2026-004',
      'Email': 'akosua.frimpomaa@sdashs.edu.gh',
      'Class / Stream (Optional)': 'SHS 2 General Arts',
      'Notes (Optional)': 'Registered Student',
    },
    {
      'Candidate Name': 'Emmanuel Boateng',
      'Student ID': 'SDA-2026-005',
      'Email': 'emmanuel.boateng@sdashs.edu.gh',
      'Class / Stream (Optional)': 'SHS 2 Business',
      'Notes (Optional)': 'Registered Student',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set clean column widths
  worksheet['!cols'] = [
    { wch: 28 }, // Candidate Name
    { wch: 22 }, // Student ID
    { wch: 32 }, // Email
    { wch: 24 }, // Class / Stream
    { wch: 24 }, // Notes
  ];

  const guidelinesData = [
    { 'Roster Upload Guidelines': '1. You can fill and upload this template directly.' },
    { 'Roster Upload Guidelines': '2. You are NOT restricted to this template: you can upload ANY existing school spreadsheet.' },
    { 'Roster Upload Guidelines': '3. Column order does not matter (e.g. Email first, or Student ID first, or Name first).' },
    { 'Roster Upload Guidelines': '4. Headers are auto-detected (e.g. "Roll No", "Index Number", "Matric No", "Full Name", "Student Email").' },
    { 'Roster Upload Guidelines': '5. Extra columns like Gender, Phone, or House are safely ignored without errors.' },
    { 'Roster Upload Guidelines': '6. Supports Excel (.xlsx, .xls) and CSV (.csv) formats.' },
  ];
  const guidelinesSheet = XLSX.utils.json_to_sheet(guidelinesData);
  guidelinesSheet['!cols'] = [{ wch: 90 }];

  XLSX.utils.sheet_add_aoa(worksheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });
  XLSX.utils.sheet_add_aoa(guidelinesSheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Roster');
  XLSX.utils.book_append_sheet(workbook, guidelinesSheet, 'Upload Guidelines');

  const cleanTitle = quizTitle ? `_${quizTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
  XLSX.writeFile(workbook, `STUDENT_ROSTER_TEMPLATE${cleanTitle}_${Date.now()}.xlsx`);
}

/**
 * Generates and downloads a CSV template
 */
export function generateRosterTemplateCsv(): void {
  const csvContent = [
    'Candidate Name,Student ID,Email,Class / Stream',
    'Kofi Mensah,SDA-2026-001,kofi.mensah@sdashs.edu.gh,SHS 2 Science A',
    'Abena Osei Poku,SDA-2026-002,abena.osei@sdashs.edu.gh,SHS 2 Science A',
    'Kwame Asare,SDA-2026-003,kwame.asare@sdashs.edu.gh,SHS 2 Science B',
    'Akosua Frimpomaa,SDA-2026-004,akosua.frimpomaa@sdashs.edu.gh,SHS 2 General Arts',
    'Emmanuel Boateng,SDA-2026-005,emmanuel.boateng@sdashs.edu.gh,SHS 2 Business',
    '',
    '"The joy of the Lord is my strength"'
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `STUDENT_ROSTER_TEMPLATE_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports the complete list of students who have access to a specific quiz into an Excel (.xlsx) file.
 * If candidates have submitted, their test scores, status, and completion times are included.
 * If the quiz is Open Access and has no registered roster yet, downloads the Excel candidate template with a helpful notification.
 */
export function downloadQuizStudentListExcel(
  quiz: QuizConfig,
  submissions: StudentSubmission[] = []
): { success: boolean; count: number; filename: string; message?: string } {
  const currentQuizId = (quiz.id || quiz.code || '').trim().toLowerCase();
  const quizTitle = quiz.title || quiz.code || 'Assessment';
  const cleanTitle = quizTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  const roster = quiz.studentRoster || [];
  let exportRows: any[] = [];

  if (roster.length > 0) {
    exportRows = roster.map((student, idx) => {
      // Find submission if candidate has taken it
      const sub = submissions.find((s) => {
        const subQuizId = (s.quizId || s.quizCode || '').trim().toLowerCase();
        if (currentQuizId && subQuizId && subQuizId !== currentQuizId) return false;

        const normSubId = (s.studentId || '').trim().toUpperCase();
        const normStudentId = (student.studentId || '').trim().toUpperCase();
        if (normSubId && normStudentId && normSubId === normStudentId) return true;

        const normSubEmail = (s.studentEmail || '').trim().toLowerCase();
        const normStudentEmail = (student.email || '').trim().toLowerCase();
        if (normSubEmail && normStudentEmail && normSubEmail === normStudentEmail) return true;

        const normSubName = (s.studentName || '').trim().toLowerCase();
        const normStudentName = (student.name || '').trim().toLowerCase();
        return normSubName && normStudentName && normSubName === normStudentName;
      });

      return {
        'No.': idx + 1,
        'Candidate Name': student.name,
        'Student ID': student.studentId,
        'Email Address': student.email || 'N/A',
        'Class / Stream': student.classGroup || quiz.classGroup || 'General',
        'Access Permission': student.attemptAllowed !== false ? 'Authorized' : 'Attempt Locked by Teacher',
        'Exam Progress': sub ? 'Completed' : 'Not Started / Pending',
        'Score': sub ? `${sub.totalScore} / ${sub.maxScore}` : '-',
        'Percentage (%)': sub ? `${sub.percentage.toFixed(1)}%` : '-',
        'Submitted At': sub ? (sub.submittedAtLocal || sub.submittedAt) : 'N/A',
      };
    });
  } else {
    // If no explicit roster, check submissions for students who took this quiz under open access
    const quizSubmissions = submissions.filter((s) => {
      const subQuizId = (s.quizId || s.quizCode || '').trim().toLowerCase();
      return !currentQuizId || !subQuizId || subQuizId === currentQuizId;
    });

    if (quizSubmissions.length > 0) {
      const seen = new Set<string>();
      quizSubmissions.forEach((sub) => {
        const key = (sub.studentId || sub.studentEmail || sub.studentName || '').trim().toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        exportRows.push({
          'No.': exportRows.length + 1,
          'Candidate Name': sub.studentName || 'Anonymous Candidate',
          'Student ID': sub.studentId || 'N/A',
          'Email Address': sub.studentEmail || 'N/A',
          'Class / Stream': sub.classGroup || quiz.classGroup || 'General',
          'Access Permission': 'Open Access (Completed)',
          'Exam Progress': 'Completed',
          'Score': `${sub.totalScore} / ${sub.maxScore}`,
          'Percentage (%)': `${sub.percentage.toFixed(1)}%`,
          'Submitted At': sub.submittedAtLocal || sub.submittedAt || new Date().toLocaleString(),
        });
      });
    }
  }

  if (exportRows.length === 0) {
    // Trigger download of the official candidate template so the teacher can fill it
    generateRosterTemplateExcel(quizTitle);
    return {
      success: true,
      count: 0,
      filename: `STUDENT_ROSTER_TEMPLATE_${cleanTitle}.xlsx`,
      message: `"${quizTitle}" currently has Open Access with no candidate roster attached. An Excel template (Name, Student ID, Email) has been downloaded for you to fill and upload.`,
    };
  }

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 28 }, // Candidate Name
    { wch: 22 }, // Student ID
    { wch: 32 }, // Email Address
    { wch: 18 }, // Class / Stream
    { wch: 24 }, // Access Permission
    { wch: 22 }, // Exam Progress
    { wch: 14 }, // Score
    { wch: 16 }, // Percentage (%)
    { wch: 24 }, // Submitted At
  ];

  XLSX.utils.sheet_add_aoa(worksheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students With Access');

  const filename = `STUDENTS_ACCESS_LIST_${cleanTitle}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return {
    success: true,
    count: exportRows.length,
    filename,
  };
}

/**
 * Validates a student candidate attempting to enter an assessment against the quiz roster
 */
export function validateCandidateAgainstRoster(
  roster: RosterStudent[] | undefined,
  inputName: string,
  inputId: string,
  inputEmail: string,
  validationField: 'id_only' | 'email_only' | 'id_or_email' | 'both' = 'id_or_email'
): RosterValidationResult {
  // If roster is undefined or empty, access is unrestricted
  if (!roster || roster.length === 0) {
    return {
      authorized: true,
      reason: 'authorized',
      message: 'Assessment roster is open to all candidates.',
    };
  }

  const cleanId = (inputId || '').trim().toUpperCase();
  const cleanEmail = (inputEmail || '').trim().toLowerCase();
  const cleanName = (inputName || '').trim().toLowerCase();

  if (!cleanId && !cleanEmail && !cleanName) {
    return {
      authorized: false,
      reason: 'missing_credentials',
      message: 'Please provide your Student ID or Registered Email to verify your candidate identity.',
    };
  }

  let matched: RosterStudent | undefined;

  if (validationField === 'id_only') {
    if (!cleanId) {
      return {
        authorized: false,
        reason: 'missing_credentials',
        message: 'This assessment requires entering your authorized Student ID / Roll No.',
      };
    }
    matched = roster.find((s) => s.studentId && s.studentId.trim().toUpperCase() === cleanId);
  } else if (validationField === 'email_only') {
    if (!cleanEmail) {
      return {
        authorized: false,
        reason: 'missing_credentials',
        message: 'This assessment requires entering your authorized student email address.',
      };
    }
    matched = roster.find((s) => s.email && s.email.trim().toLowerCase() === cleanEmail);
  } else if (validationField === 'both') {
    if (!cleanId || !cleanEmail) {
      return {
        authorized: false,
        reason: 'missing_credentials',
        message: 'This assessment requires both your authorized Student ID and Email address.',
      };
    }
    matched = roster.find(
      (s) =>
        s.studentId &&
        s.studentId.trim().toUpperCase() === cleanId &&
        s.email &&
        s.email.trim().toLowerCase() === cleanEmail
    );
  } else {
    // Default: id_or_email
    matched = roster.find((s) => {
      const matchId = cleanId && s.studentId && s.studentId.trim().toUpperCase() === cleanId;
      const matchEmail = cleanEmail && s.email && s.email.trim().toLowerCase() === cleanEmail;
      return matchId || matchEmail;
    });

    // Secondary fallback: if neither matched directly but exact full name matches
    if (!matched && cleanName && cleanName.length >= 4) {
      const nameMatches = roster.filter((s) => s.name && s.name.trim().toLowerCase() === cleanName);
      if (nameMatches.length === 1) {
        matched = nameMatches[0];
      }
    }
  }

  if (!matched) {
    return {
      authorized: false,
      reason: 'not_found',
      message: `Access Restricted: Candidate identifier "${inputId || inputEmail || inputName}" was not found on the official exam roster. Please verify your Student ID/Email or contact your faculty proctor.`,
    };
  }

  // Check if candidate attempt is explicitly blocked or revoked
  if (matched.attemptAllowed === false) {
    return {
      authorized: false,
      matchedStudent: matched,
      reason: 'attempt_blocked',
      message: `Access Locked: The proctor has locked the examination desk for candidate ${matched.name} (${matched.studentId}). Request an unlock from your instructor to proceed.`,
    };
  }

  return {
    authorized: true,
    matchedStudent: matched,
    reason: 'authorized',
    message: `Candidate verified: ${matched.name} (${matched.studentId})`,
  };
}

/**
 * Exports roster reconciled with live student scores & submission status
 */
export function exportRosterWithSubmissionsExcel(
  roster: RosterStudent[],
  submissions: StudentSubmission[],
  quizTitle: string
): void {
  const exportRows = roster.map((student, idx) => {
    // Match submission by studentId, email, or exact name
    const sub = submissions.find((s) => {
      const normSubId = (s.studentId || '').trim().toUpperCase();
      const normStudentId = (student.studentId || '').trim().toUpperCase();
      if (normSubId && normStudentId && normSubId === normStudentId) return true;

      const normSubEmail = (s.studentEmail || '').trim().toLowerCase();
      const normStudentEmail = (student.email || '').trim().toLowerCase();
      if (normSubEmail && normStudentEmail && normSubEmail === normStudentEmail) return true;

      const normSubName = (s.studentName || '').trim().toLowerCase();
      const normStudentName = (student.name || '').trim().toLowerCase();
      return normSubName && normStudentName && normSubName === normStudentName;
    });

    return {
      'No.': idx + 1,
      'Student ID / Roll No': student.studentId,
      'Candidate Full Name': student.name,
      'Email Address': student.email || 'N/A',
      'Class / Stream': student.classGroup || 'General',
      'Exam Status': sub ? 'Submitted' : 'Absent / Not Started',
      'Score': sub ? sub.totalScore : '-',
      'Max Score': sub ? sub.maxScore : '-',
      'Percentage (%)': sub ? `${sub.percentage.toFixed(1)}%` : '-',
      'Tab Switches': sub ? sub.tabSwitchesCount ?? 0 : '-',
      'Submitted At': sub ? (sub.submittedAtLocal || sub.submittedAt) : 'N/A',
      'Attempt Allowed': student.attemptAllowed !== false ? 'Yes' : 'Locked',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 26 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
  ];

  XLSX.utils.sheet_add_aoa(worksheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster Reconciliation');

  const cleanTitle = (quizTitle || 'EXAM').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `ROSTER_REPORT_${cleanTitle}_${Date.now()}.xlsx`);
}
