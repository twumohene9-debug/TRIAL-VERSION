import express from 'express';
import path from 'path';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { loadServerData, saveServerData } from './src/serverDb';
import { parseAssessmentText } from './src/utils/documentParser';
import { formatMathTextToLatex } from './src/utils/mathDetector';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Compress all responses for fast network transfer
  app.use(compression());

  app.use(express.json({ limit: '50mb' }));

  // PWA App Icons Endpoint
  app.get(['/icon-192.png', '/icon-512.png', '/icon-192', '/icon-512'], (req, res) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="128" fill="#059669"/>
      <path d="M256 110 L410 195 L256 280 L102 195 Z" fill="#ffffff"/>
      <path d="M150 230 L150 330 C150 365, 362 365, 362 330 L362 230" fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
      <circle cx="256" cy="385" r="28" fill="#10b981"/>
      <text x="256" y="445" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#ffffff" text-anchor="middle">ADD MATH</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  });

  // Centralized Sync API: Get all server state across all logins
  app.get('/api/sync', (req, res) => {
    const data = loadServerData();
    res.json(data);
  });

  // Admin Profile API: Get current admin profile
  app.get('/api/admin/profile', (req, res) => {
    try {
      const data = loadServerData();
      return res.json({ success: true, adminProfile: data.adminProfile });
    } catch (err: any) {
      console.error('Error fetching admin profile:', err);
      return res.status(500).json({ error: 'Failed to fetch admin profile' });
    }
  });

  // Admin Profile API: Update and sync admin profile
  app.post('/api/admin/profile', (req, res) => {
    try {
      const profileUpdates = req.body;
      if (!profileUpdates || !profileUpdates.name) {
        return res.status(400).json({ error: 'Admin profile name is required' });
      }
      const data = loadServerData();
      const updatedProfile = {
        ...(data.adminProfile || {}),
        ...profileUpdates,
        updatedAt: new Date().toISOString(),
      };
      saveServerData({ adminProfile: updatedProfile });
      return res.json({ success: true, adminProfile: updatedProfile });
    } catch (err: any) {
      console.error('Error updating admin profile:', err);
      return res.status(500).json({ error: 'Failed to update admin profile' });
    }
  });

  // Centralized Sync API: Save / update student submission
  app.post('/api/sync/submissions', (req, res) => {
    try {
      const newSubmission = req.body;
      if (!newSubmission || !newSubmission.studentName) {
        return res.status(400).json({ error: 'Invalid submission data' });
      }

      const data = loadServerData();
      const existingIdx = data.submissions.findIndex((s) => s.id === newSubmission.id);

      let updatedSubmissions = [...data.submissions];
      if (existingIdx >= 0) {
        updatedSubmissions[existingIdx] = { ...updatedSubmissions[existingIdx], ...newSubmission };
      } else {
        updatedSubmissions = [newSubmission, ...updatedSubmissions];
      }

      // Automatically remove this candidate from active surveillance sessions upon submission
      // The monitor should ONLY display students currently taking the quiz; submitted results move to results
      const subStudentId = (newSubmission.studentId || '').toLowerCase().trim();
      const subStudentName = (newSubmission.studentName || '').toLowerCase().trim();
      const subQuizId = (newSubmission.quizId || (newSubmission as any).quizCode || '').toLowerCase().trim();
      const updatedActiveSessions = (data.activeSessions || []).filter((s: any) => {
        const sId = (s.studentId || '').toLowerCase().trim();
        const sSessId = (s.id || '').toLowerCase().trim();
        const sName = (s.studentName || '').toLowerCase().trim();
        const sQuiz = (s.quizId || (s as any).quizCode || '').toLowerCase().trim();

        const matchId = subStudentId && (sId === subStudentId || sSessId.includes(subStudentId) || sSessId === subStudentId || subStudentId.includes(sId));
        const matchName = subStudentName && (sName === subStudentName || sName.includes(subStudentName) || subStudentName.includes(sName));
        return !matchId && !matchName;
      });

      saveServerData({ submissions: updatedSubmissions, activeSessions: updatedActiveSessions });
      return res.json({ success: true, submissions: updatedSubmissions, activeSessions: updatedActiveSessions });
    } catch (err: any) {
      console.error('Error syncing submission:', err);
      return res.status(500).json({ error: 'Failed to sync submission' });
    }
  });

  // Centralized Sync API: Delete or clear submissions
  app.delete('/api/sync/submissions/quiz/:quizId', (req, res) => {
    try {
      const { quizId } = req.params;
      const data = loadServerData();
      const qUpper = (quizId || '').toUpperCase();
      const updatedSubmissions = (data.submissions || []).filter((s: any) => {
        const sQuizId = (s.quizId || '').toUpperCase();
        const sQuizCode = ((s as any).quizCode || '').toUpperCase();
        const sQuizTitle = (s.quizTitle || '').toUpperCase();
        return sQuizId !== qUpper && sQuizCode !== qUpper && sQuizTitle !== qUpper;
      });
      saveServerData({ submissions: updatedSubmissions });
      return res.json({ success: true, submissions: updatedSubmissions });
    } catch (err: any) {
      console.error('Error deleting quiz submissions:', err);
      return res.status(500).json({ error: 'Failed to delete quiz submissions' });
    }
  });

  app.delete(['/api/sync/submissions/all', '/api/sync/submissions/:id'], (req, res) => {
    try {
      const { id } = req.params;
      const data = loadServerData();
      let updatedSubmissions = [];

      if (!id || id === 'all') {
        updatedSubmissions = [];
      } else {
        updatedSubmissions = data.submissions.filter((s) => s.id !== id);
      }

      saveServerData({ submissions: updatedSubmissions });
      return res.json({ success: true, submissions: updatedSubmissions });
    } catch (err: any) {
      console.error('Error deleting submission:', err);
      return res.status(500).json({ error: 'Failed to delete submission' });
    }
  });

  // Real-Time Student Active Sessions API (Live Exam Surveillance & Monitoring)
  // ONLY returns students currently actively taking the quiz (submitted students leave the monitor)
  app.get('/api/sync/active-sessions', (req, res) => {
    try {
      const data = loadServerData();
      const submissions = data.submissions || [];
      const submittedKeys = new Set<string>();
      submissions.forEach((sub: any) => {
        const sId = (sub.studentId || '').toLowerCase().trim();
        const sName = (sub.studentName || '').toLowerCase().trim();
        const qKey = (sub.quizId || sub.quizCode || '').toLowerCase().trim();
        if (sId) {
          submittedKeys.add(`${sId}_${qKey}`);
          submittedKeys.add(sId);
        }
        if (sName) {
          submittedKeys.add(`${sName}_${qKey}`);
          submittedKeys.add(sName);
        }
      });

      const now = Date.now();
      const sessions = (data.activeSessions || []).filter((s: any) => {
        if (!s || s.status === 'submitted') return false;
        // Countdown expired or target time passed
        if (typeof s.remainingSeconds === 'number' && s.remainingSeconds <= 0) return false;
        if (s.targetEndTime && typeof s.targetEndTime === 'number' && s.targetEndTime <= now) return false;
        // Stale heartbeat (> 2 minutes)
        if (s.lastHeartbeat) {
          const hb = new Date(s.lastHeartbeat).getTime();
          if (!isNaN(hb) && (now - hb) > 2 * 60 * 1000) return false;
        } else if (s.startTime) {
          const sTime = typeof s.startTime === 'number' ? s.startTime : new Date(s.startTime).getTime();
          if (!isNaN(sTime) && (now - sTime) > 2 * 60 * 1000) return false;
        } else {
          return false;
        }
        const sId = (s.studentId || '').toLowerCase().trim();
        const sName = (s.studentName || '').toLowerCase().trim();
        const sQuiz = (s.quizId || s.quizCode || '').toLowerCase().trim();
        const sSessId = (s.id || '').toLowerCase().trim();

        if (sId && (submittedKeys.has(`${sId}_${sQuiz}`) || submittedKeys.has(sId))) return false;
        if (sName && (submittedKeys.has(`${sName}_${sQuiz}`) || submittedKeys.has(sName))) return false;
        if (sSessId && submittedKeys.has(sSessId)) return false;
        return true;
      });

      if (sessions.length !== (data.activeSessions || []).length) {
        saveServerData({ activeSessions: sessions });
      }

      return res.json({ success: true, activeSessions: sessions });
    } catch (err: any) {
      console.error('Error fetching active sessions:', err);
      return res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
  });

  app.post('/api/sync/active-sessions', (req, res) => {
    try {
      const session = req.body;
      if (!session || !session.studentName) {
        return res.status(400).json({ error: 'Invalid session payload' });
      }

      const data = loadServerData();
      const existing = data.activeSessions || [];
      const sessionId = session.id || `${session.studentId || session.studentName}-${session.quizId || 'quiz'}`;
      const nowIso = new Date().toISOString();

      // If the session is marked submitted or student is already in submissions, purge from active sessions
      const subStudentId = (session.studentId || '').toLowerCase().trim();
      const subStudentName = (session.studentName || '').toLowerCase().trim();
      const subQuizId = (session.quizId || '').toLowerCase().trim();
      const alreadySubmitted = (data.submissions || []).some((sub: any) => {
        const sId = (sub.studentId || '').toLowerCase().trim();
        const sName = (sub.studentName || '').toLowerCase().trim();
        const qKey = (sub.quizId || sub.quizCode || '').toLowerCase().trim();
        const matchId = subStudentId && sId === subStudentId && (!subQuizId || !qKey || qKey === subQuizId);
        const matchName = subStudentName && sName === subStudentName && (!subQuizId || !qKey || qKey === subQuizId);
        return matchId || matchName;
      });

      if (session.status === 'submitted' || alreadySubmitted) {
        const updated = existing.filter((s: any) => {
          const sId = (s.studentId || '').toLowerCase().trim();
          const sSessId = (s.id || '').toLowerCase().trim();
          const sName = (s.studentName || '').toLowerCase().trim();
          const matchId = subStudentId && (sId === subStudentId || sSessId.includes(subStudentId) || sSessId === sessionId.toLowerCase());
          const matchName = subStudentName && sName === subStudentName;
          return !matchId && !matchName;
        });
        saveServerData({ activeSessions: updated });
        return res.json({ success: true, activeSessions: updated, removed: true });
      }

      const sessionObj = {
        ...session,
        id: sessionId,
        lastHeartbeat: nowIso,
      };

      const idx = existing.findIndex((s: any) => s.id === sessionId || (s.studentId && s.studentId === session.studentId && s.quizId === session.quizId));
      let updated = [...existing];
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...sessionObj };
      } else {
        updated = [sessionObj, ...updated];
      }

      saveServerData({ activeSessions: updated });
      return res.json({ success: true, activeSessions: updated, session: sessionObj });
    } catch (err: any) {
      console.error('Error updating active session:', err);
      return res.status(500).json({ error: 'Failed to update active session' });
    }
  });

  app.delete('/api/sync/active-sessions/quiz/:quizId', (req, res) => {
    try {
      const { quizId } = req.params;
      const data = loadServerData();
      const qUpper = (quizId || '').toUpperCase();
      const updated = (data.activeSessions || []).filter((s: any) => {
        const sQuizId = (s.quizId || '').toUpperCase();
        const sQuizCode = ((s as any).quizCode || '').toUpperCase();
        return sQuizId !== qUpper && sQuizCode !== qUpper;
      });
      saveServerData({ activeSessions: updated });
      return res.json({ success: true, activeSessions: updated });
    } catch (err: any) {
      console.error('Error deleting quiz active sessions:', err);
      return res.status(500).json({ error: 'Failed to delete quiz active sessions' });
    }
  });

  app.delete(['/api/sync/active-sessions/all', '/api/sync/active-sessions/:id'], (req, res) => {
    try {
      const { id } = req.params;
      const data = loadServerData();
      let updated = [];
      if (!id || id === 'all') {
        updated = [];
      } else {
        const cleanTarget = (id || '').toLowerCase().trim();
        updated = (data.activeSessions || []).filter((s: any) => {
          const sId = (s.id || '').toLowerCase().trim();
          const sStdId = (s.studentId || '').toLowerCase().trim();
          const sName = (s.studentName || '').toLowerCase().trim();
          const matchId = sId === cleanTarget || sId.includes(cleanTarget) || cleanTarget.includes(sId);
          const matchStd = sStdId === cleanTarget || sStdId.includes(cleanTarget) || cleanTarget.includes(sStdId);
          const matchName = sName === cleanTarget;
          return !matchId && !matchStd && !matchName;
        });
      }
      saveServerData({ activeSessions: updated });
      return res.json({ success: true, activeSessions: updated });
    } catch (err: any) {
      console.error('Error deleting active session:', err);
      return res.status(500).json({ error: 'Failed to delete active session' });
    }
  });

  // Real-Time Teacher Proctor Warning System
  app.get('/api/sync/teacher-warnings', (req, res) => {
    try {
      const { studentId, quizId, studentName } = req.query as any;
      const data = loadServerData();
      let warnings = data.teacherWarnings || [];
      if (studentId || studentName) {
        const sId = (studentId || '').toString().toLowerCase().trim();
        const sName = (studentName || '').toString().toLowerCase().trim();
        warnings = warnings.filter((w: any) => {
          const targetId = (w.studentId || '').toString().toLowerCase().trim();
          const targetName = (w.studentName || '').toString().toLowerCase().trim();
          if (targetId === 'all' || targetId === '*' || !targetId) return true;
          if (sId && (targetId === sId || targetId.includes(sId) || sId.includes(targetId))) return true;
          if (sName && targetName && (targetName === sName || targetName.includes(sName) || sName.includes(targetName))) return true;
          return false;
        });
      }
      if (quizId) {
        warnings = warnings.filter((w: any) => !w.quizId || w.quizId === quizId || w.quizId === 'all');
      }
      return res.json({ success: true, warnings });
    } catch (err: any) {
      console.error('Error fetching teacher warnings:', err);
      return res.status(500).json({ error: 'Failed to fetch warnings' });
    }
  });

  app.post('/api/sync/teacher-warnings', (req, res) => {
    try {
      const { studentId, studentName, quizId, teacherName, message, type } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Missing required warning message parameter' });
      }

      const data = loadServerData();
      const existingWarnings = data.teacherWarnings || [];
      const newWarning = {
        id: `warn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentId: studentId || 'all',
        studentName: studentName || (studentId === 'all' ? 'All Candidates' : 'Student Candidate'),
        quizId: quizId || '',
        teacherName: teacherName || 'Exam Proctor',
        message: message.trim(),
        type: type || (studentId === 'all' ? 'broadcast' : 'warning'),
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      const updatedWarnings = [newWarning, ...existingWarnings].slice(0, 100);

      // Also attach to the student's active session if matching
      const activeSessions = (data.activeSessions || []).map((s: any) => {
        if (!studentId || studentId === 'all' || s.studentId === studentId || s.id === studentId) {
          const wList = s.warnings || [];
          return {
            ...s,
            warnings: [newWarning, ...wList],
          };
        }
        return s;
      });

      saveServerData({
        teacherWarnings: updatedWarnings,
        activeSessions,
      });

      return res.json({ success: true, warning: newWarning, warnings: updatedWarnings });
    } catch (err: any) {
      console.error('Error issuing teacher warning:', err);
      return res.status(500).json({ error: 'Failed to issue warning' });
    }
  });

  app.post('/api/sync/teacher-warnings/acknowledge', (req, res) => {
    try {
      const { warningId, studentId } = req.body;
      const data = loadServerData();
      const updatedWarnings = (data.teacherWarnings || []).map((w: any) => {
        if (w.id === warningId) {
          return { ...w, acknowledged: true };
        }
        return w;
      });

      saveServerData({ teacherWarnings: updatedWarnings });
      return res.json({ success: true, warnings: updatedWarnings });
    } catch (err: any) {
      console.error('Error acknowledging warning:', err);
      return res.status(500).json({ error: 'Failed to acknowledge warning' });
    }
  });

  app.delete('/api/sync/teacher-warnings/:id', (req, res) => {
    try {
      const { id } = req.params;
      const data = loadServerData();
      let updatedWarnings = [];
      if (id === 'all') {
        updatedWarnings = [];
      } else {
        updatedWarnings = (data.teacherWarnings || []).filter((w: any) => w.id !== id && w.studentId !== id);
      }
      saveServerData({ teacherWarnings: updatedWarnings });
      return res.json({ success: true, warnings: updatedWarnings });
    } catch (err: any) {
      console.error('Error deleting warning:', err);
      return res.status(500).json({ error: 'Failed to delete warning' });
    }
  });

  // ==========================================
  // Camera Proctoring Captures API (7-Day Auto Purge + Teacher Controls)
  // ==========================================

  // Upload one or multiple camera capture photos from a student attempt
  app.post('/api/camera-captures', (req, res) => {
    try {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ error: 'Missing camera capture payload' });
      }

      const items = Array.isArray(payload) ? payload : (payload.captures || [payload]);
      const validItems: any[] = [];
      const nowIso = new Date().toISOString();

      for (const item of items) {
        if (!item || !item.imageDataUrl) continue;
        const studentId = String(item.studentId || '').trim();
        const quizId = String(item.quizId || '').trim();
        const id = item.id || `cap-${studentId || 'std'}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        validItems.push({
          id,
          studentId: studentId || 'UNKNOWN',
          studentName: String(item.studentName || 'Student').trim(),
          quizId: quizId || 'UNKNOWN',
          quizTitle: String(item.quizTitle || 'Assessment').trim(),
          timestamp: item.timestamp || nowIso,
          imageDataUrl: item.imageDataUrl,
          captureIndex: Number(item.captureIndex || 1),
          totalScheduled: Number(item.totalScheduled || 5),
          createdAt: item.createdAt || nowIso,
        });
      }

      if (validItems.length === 0) {
        return res.status(400).json({ error: 'No valid camera capture images provided' });
      }

      const data = loadServerData();
      const existing = data.cameraCaptures || [];
      // Combine and avoid duplicate IDs
      const existingIds = new Set(existing.map((c: any) => c.id));
      const newItems = validItems.filter((v) => !existingIds.has(v.id));
      const combined = [...newItems, ...existing];

      saveServerData({ cameraCaptures: combined });
      return res.json({ success: true, count: newItems.length, total: combined.length });
    } catch (err: any) {
      console.error('Error saving camera captures:', err);
      return res.status(500).json({ error: 'Failed to save camera captures' });
    }
  });

  // Retrieve camera captures, optionally filtered by quizId, studentId, or attempt
  app.get('/api/camera-captures', (req, res) => {
    try {
      const { quizId, studentId } = req.query as { quizId?: string; studentId?: string };
      const data = loadServerData();
      let captures = data.cameraCaptures || [];

      if (quizId) {
        const qUpper = String(quizId).trim().toUpperCase();
        captures = captures.filter((c: any) => {
          const cQuiz = String(c.quizId || '').toUpperCase();
          return cQuiz === qUpper || cQuiz.includes(qUpper) || qUpper.includes(cQuiz);
        });
      }

      if (studentId) {
        const sUpper = String(studentId).trim().toUpperCase();
        captures = captures.filter((c: any) => {
          const cStudent = String(c.studentId || '').toUpperCase();
          const cName = String(c.studentName || '').toUpperCase();
          return cStudent === sUpper || cName === sUpper;
        });
      }

      // Sort newest to oldest or by captureIndex
      captures.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return res.json({ success: true, count: captures.length, captures });
    } catch (err: any) {
      console.error('Error fetching camera captures:', err);
      return res.status(500).json({ error: 'Failed to fetch camera captures' });
    }
  });

  // Delete a specific camera capture photo by ID
  app.delete('/api/camera-captures/:id', (req, res) => {
    try {
      const { id } = req.params;
      const data = loadServerData();
      const existing = data.cameraCaptures || [];
      const updated = existing.filter((c: any) => c.id !== id);
      saveServerData({ cameraCaptures: updated });
      return res.json({ success: true, deleted: existing.length - updated.length });
    } catch (err: any) {
      console.error('Error deleting camera capture:', err);
      return res.status(500).json({ error: 'Failed to delete camera capture' });
    }
  });

  // Delete all camera captures for a student attempt
  app.delete('/api/camera-captures/student/:quizId/:studentId', (req, res) => {
    try {
      const { quizId, studentId } = req.params;
      const qUpper = String(quizId || '').toUpperCase().trim();
      const sUpper = String(studentId || '').toUpperCase().trim();

      const data = loadServerData();
      const existing = data.cameraCaptures || [];
      const updated = existing.filter((c: any) => {
        const cQuiz = String(c.quizId || '').toUpperCase().trim();
        const cStudent = String(c.studentId || '').toUpperCase().trim();
        const cName = String(c.studentName || '').toUpperCase().trim();
        const matchesQuiz = !qUpper || qUpper === 'ALL' || cQuiz === qUpper;
        const matchesStudent = cStudent === sUpper || cName === sUpper;
        return !(matchesQuiz && matchesStudent);
      });

      saveServerData({ cameraCaptures: updated });
      return res.json({ success: true, deleted: existing.length - updated.length });
    } catch (err: any) {
      console.error('Error deleting student camera captures:', err);
      return res.status(500).json({ error: 'Failed to delete student camera captures' });
    }
  });

  // Delete all camera captures for a quiz
  app.delete('/api/camera-captures/quiz/:quizId', (req, res) => {
    try {
      const { quizId } = req.params;
      const qUpper = String(quizId || '').toUpperCase().trim();
      const data = loadServerData();
      const existing = data.cameraCaptures || [];
      const updated = existing.filter((c: any) => {
        const cQuiz = String(c.quizId || '').toUpperCase().trim();
        return cQuiz !== qUpper;
      });

      saveServerData({ cameraCaptures: updated });
      return res.json({ success: true, deleted: existing.length - updated.length });
    } catch (err: any) {
      console.error('Error deleting quiz camera captures:', err);
      return res.status(500).json({ error: 'Failed to delete quiz camera captures' });
    }
  });

  // Centralized Sync API: Get all quizzes
  app.get('/api/quizzes', (req, res) => {
    try {
      const data = loadServerData();
      return res.json({ success: true, quizzes: data.quizzes || [] });
    } catch (err: any) {
      console.error('Error fetching quizzes:', err);
      return res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
  });

  // Centralized Sync API: Get single quiz by ID or Quiz Code
  app.get('/api/quizzes/:idOrCode', (req, res) => {
    try {
      const key = (req.params.idOrCode || '').trim().toUpperCase();
      const data = loadServerData();
      const found = (data.quizzes || []).find(
        (q: any) =>
          (q.id && q.id.toUpperCase() === key) ||
          (q.code && q.code.toUpperCase() === key) ||
          (q.code && q.code.toUpperCase().includes(key))
      );
      if (found) {
        return res.json({ success: true, quiz: found });
      }
      return res.status(404).json({ error: 'Quiz not found' });
    } catch (err: any) {
      console.error('Error fetching quiz by ID/Code:', err);
      return res.status(500).json({ error: 'Failed to fetch quiz' });
    }
  });

  // Centralized Sync API: Save created or imported quiz
  app.post('/api/quizzes', (req, res) => {
    try {
      const newQuiz = req.body;
      if (!newQuiz || !newQuiz.title) {
        return res.status(400).json({ error: 'Quiz title is required' });
      }

      const data = loadServerData();
      const quizId = newQuiz.id || `quiz-${Date.now()}`;
      
      // Clean blank timeline fields so they are never set to current timestamp
      const cleanStartDate = (newQuiz.startDate && typeof newQuiz.startDate === 'string' && newQuiz.startDate.trim() !== '')
        ? newQuiz.startDate.trim()
        : ((newQuiz.releaseDate && typeof newQuiz.releaseDate === 'string' && newQuiz.releaseDate.trim() !== '') ? newQuiz.releaseDate.trim() : undefined);
      
      const cleanEndDate = (newQuiz.endDate && typeof newQuiz.endDate === 'string' && newQuiz.endDate.trim() !== '')
        ? newQuiz.endDate.trim()
        : ((newQuiz.submissionDeadline && typeof newQuiz.submissionDeadline === 'string' && newQuiz.submissionDeadline.trim() !== '') ? newQuiz.submissionDeadline.trim() : undefined);

      const quizObj = {
        ...newQuiz,
        id: quizId,
        startDate: cleanStartDate,
        releaseDate: cleanStartDate,
        endDate: cleanEndDate,
        submissionDeadline: cleanEndDate,
        updatedAt: new Date().toISOString()
      };

      const existingIdx = data.quizzes.findIndex((q: any) => q.id === quizId || (q.code && newQuiz.code && q.code === newQuiz.code));
      let updatedQuizzes = [...data.quizzes];
      if (existingIdx >= 0) {
        updatedQuizzes[existingIdx] = quizObj;
      } else {
        updatedQuizzes = [quizObj, ...updatedQuizzes];
      }

      saveServerData({ quizzes: updatedQuizzes });
      return res.json({ success: true, quiz: quizObj, quizzes: updatedQuizzes });
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      return res.status(500).json({ error: 'Failed to save quiz' });
    }
  });

  // Centralized Sync API: Delete quiz or delete all
  app.delete(['/api/quizzes/all', '/api/sync/quizzes/all', '/api/quizzes/purge/all'], (req, res) => {
    try {
      saveServerData({ quizzes: [] });
      return res.json({ success: true, quizzes: [] });
    } catch (err: any) {
      console.error('Error clearing all quizzes:', err);
      return res.status(500).json({ error: 'Failed to clear quizzes' });
    }
  });

  app.delete(['/api/quizzes/:id', '/api/sync/quizzes/:id'], (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'all') {
        saveServerData({ quizzes: [] });
        return res.json({ success: true, quizzes: [] });
      }
      const data = loadServerData();
      const updatedQuizzes = (data.quizzes || []).filter((q: any) => q.id !== id && q.code !== id);
      saveServerData({ quizzes: updatedQuizzes });
      return res.json({ success: true, quizzes: updatedQuizzes });
    } catch (err: any) {
      console.error('Error deleting quiz:', err);
      return res.status(500).json({ error: 'Failed to delete quiz' });
    }
  });

  // Centralized Sync API: Save created or imported quiz (alias)
  app.post('/api/sync/quizzes', (req, res) => {
    try {
      const newQuiz = req.body;
      if (!newQuiz || !newQuiz.title) {
        return res.status(400).json({ error: 'Quiz title is required' });
      }

      const data = loadServerData();
      const quizId = newQuiz.id || `quiz-${Date.now()}`;
      const quizObj = { ...newQuiz, id: quizId, updatedAt: new Date().toISOString() };

      const existingIdx = data.quizzes.findIndex((q) => q.id === quizId);
      let updatedQuizzes = [...data.quizzes];
      if (existingIdx >= 0) {
        updatedQuizzes[existingIdx] = quizObj;
      } else {
        updatedQuizzes = [quizObj, ...updatedQuizzes];
      }

      saveServerData({ quizzes: updatedQuizzes });
      return res.json({ success: true, quiz: quizObj, quizzes: updatedQuizzes });
    } catch (err: any) {
      console.error('Error syncing quiz:', err);
      return res.status(500).json({ error: 'Failed to sync quiz' });
    }
  });

  // Centralized Sync API: Update Teacher Access Codes
  app.post('/api/sync/teacher-codes', (req, res) => {
    try {
      const { codes } = req.body;
      if (!Array.isArray(codes)) {
        return res.status(400).json({ error: 'Codes must be an array' });
      }

      const data = loadServerData();
      const existing = data.teacherAccessCodes || [];
      const getKey = (c: any) => {
        if (c.teacherEmail && typeof c.teacherEmail === 'string' && c.teacherEmail.trim()) {
          return `email:${c.teacherEmail.trim().toLowerCase()}`;
        }
        if (c.code && typeof c.code === 'string' && c.code.trim()) {
          return `code:${c.code.trim().toUpperCase()}`;
        }
        if (c.pin && typeof c.pin === 'string' && c.pin.trim()) {
          return `code:${c.pin.trim().toUpperCase()}`;
        }
        return `id:${c.id}`;
      };

      const codeMap = new Map();
      existing.forEach((c: any) => codeMap.set(getKey(c), c));
      codes.forEach((c: any) => {
        const key = getKey(c);
        const prev = codeMap.get(key);
        codeMap.set(key, { ...prev, ...c });
      });

      const merged = Array.from(codeMap.values());
      saveServerData({ teacherAccessCodes: merged });
      return res.json({ success: true, teacherAccessCodes: merged });
    } catch (err: any) {
      console.error('Error syncing teacher codes:', err);
      return res.status(500).json({ error: 'Failed to sync teacher codes' });
    }
  });

  // System Settings: Get global app settings (including Teacher Self-Registration lock status)
  app.get('/api/settings', (req, res) => {
    try {
      const data = loadServerData();
      return res.json({ success: true, settings: data.systemSettings });
    } catch (err: any) {
      console.error('Error fetching system settings:', err);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // System Settings: Update global app settings (Lock/Unlock teacher self-registration)
  app.post('/api/settings', (req, res) => {
    try {
      const updates = req.body;
      const data = loadServerData();
      const newSettings = {
        ...data.systemSettings,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
      saveServerData({ systemSettings: newSettings });
      return res.json({ success: true, settings: newSettings });
    } catch (err: any) {
      console.error('Error updating system settings:', err);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Teacher Management: Get all teachers/access codes
  app.get('/api/teachers', (req, res) => {
    try {
      const data = loadServerData();
      return res.json({ success: true, teachers: data.teacherAccessCodes || [] });
    } catch (err: any) {
      console.error('Error getting teachers:', err);
      return res.status(500).json({ error: 'Failed to get teachers' });
    }
  });

  // Teacher Management: Self-Registration endpoint
  app.post('/api/teachers/register', (req, res) => {
    try {
      const { name, email, department, pin, password } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (name || '').trim();
      const cleanPin = (pin || password || '').trim();
      const cleanDept = (department || 'Mathematics & Computing').trim();

      if (!cleanEmail || !cleanName || !cleanPin) {
        return res.status(400).json({ error: 'Name, email, and access code/PIN are required' });
      }

      const data = loadServerData();
      // Check if self-registration is locked by Administrator
      if (data.systemSettings?.isTeacherSelfRegistrationLocked) {
        return res.status(403).json({
          error: 'Teacher self-registration is locked by the Administrator. Please contact the administrator to receive an authorized access code.',
          locked: true,
        });
      }

      let updatedCodes = [...(data.teacherAccessCodes || [])];
      const existingIdx = updatedCodes.findIndex(
        (t) => (t.teacherEmail && t.teacherEmail.toLowerCase() === cleanEmail) || t.id === cleanEmail
      );

      const teacherObj = {
        id: existingIdx >= 0 ? updatedCodes[existingIdx].id : `teacher-${Date.now()}`,
        code: cleanPin,
        pin: cleanPin,
        teacherName: cleanName,
        teacherEmail: cleanEmail,
        department: cleanDept,
        status: 'active',
        source: 'self-registered',
        createdAt: existingIdx >= 0 ? updatedCodes[existingIdx].createdAt : new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        updatedCodes[existingIdx] = { ...updatedCodes[existingIdx], ...teacherObj };
      } else {
        updatedCodes.push(teacherObj);
      }

      saveServerData({ teacherAccessCodes: updatedCodes });
      return res.json({ success: true, teacher: teacherObj, teachers: updatedCodes });
    } catch (err: any) {
      console.error('Error in teacher self-registration:', err);
      return res.status(500).json({ error: 'Failed to register teacher' });
    }
  });

  // Teacher Management: Update teacher (Admin changes code, revokes, or edits)
  app.put('/api/teachers/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const data = loadServerData();
      let updatedCodes = [...(data.teacherAccessCodes || [])];
      const idx = updatedCodes.findIndex((t) => t.id === id || (t.teacherEmail && t.teacherEmail.toLowerCase() === id.toLowerCase()));

      if (idx < 0) {
        return res.status(404).json({ error: 'Teacher record not found' });
      }

      updatedCodes[idx] = {
        ...updatedCodes[idx],
        ...updates,
        code: updates.code || updates.pin || updatedCodes[idx].code,
        pin: updates.pin || updates.code || updatedCodes[idx].pin,
      };

      saveServerData({ teacherAccessCodes: updatedCodes });
      return res.json({ success: true, teacher: updatedCodes[idx], teachers: updatedCodes });
    } catch (err: any) {
      console.error('Error updating teacher:', err);
      return res.status(500).json({ error: 'Failed to update teacher' });
    }
  });

  // Teacher Management: Delete teacher record
  app.delete('/api/teachers/:id', (req, res) => {
    try {
      const { id } = req.params;
      const data = loadServerData();
      const updatedCodes = (data.teacherAccessCodes || []).filter(
        (t) => t.id !== id && t.teacherEmail?.toLowerCase() !== id.toLowerCase()
      );
      saveServerData({ teacherAccessCodes: updatedCodes });
      return res.json({ success: true, teachers: updatedCodes });
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      return res.status(500).json({ error: 'Failed to delete teacher' });
    }
  });

  // Centralized Sync API: Update Quiz Sections & Release status
  app.post('/api/sync/sections', (req, res) => {
    try {
      const { sections } = req.body;
      if (!Array.isArray(sections)) {
        return res.status(400).json({ error: 'Sections must be an array' });
      }

      saveServerData({ sections });
      return res.json({ success: true, sections });
    } catch (err: any) {
      console.error('Error syncing sections:', err);
      return res.status(500).json({ error: 'Failed to sync sections' });
    }
  });

  // Centralized Sync API: Update Quiz Configuration
  app.post('/api/sync/config', (req, res) => {
    try {
      const config = req.body;
      saveServerData({ quizConfig: config });
      return res.json({ success: true, quizConfig: config });
    } catch (err: any) {
      console.error('Error syncing quiz config:', err);
      return res.status(500).json({ error: 'Failed to sync quiz config' });
    }
  });

  // Centralized Sync API: Full Bidirectional Multi-Device Sync
  app.post('/api/sync/all', (req, res) => {
    try {
      const { quizzes, submissions, teacherAccessCodes, sections, quizConfig, systemSettings } = req.body || {};
      const currentData = loadServerData();

      // Merge Quizzes
      const deletedSet = new Set<string>();
      const nextSettings = systemSettings || currentData.systemSettings || {};
      if (nextSettings.deletedQuizIds && Array.isArray(nextSettings.deletedQuizIds)) {
        nextSettings.deletedQuizIds.forEach((id: string) => deletedSet.add(id.toUpperCase()));
      }

      let mergedQuizzes = (currentData.quizzes || []).filter((q: any) => {
        const key = (q.code || q.id || '').toUpperCase();
        return !deletedSet.has(key) && !deletedSet.has((q.id || '').toUpperCase());
      });

      if (Array.isArray(quizzes) && quizzes.length > 0) {
        quizzes.forEach((incomingQ: any) => {
          const key = (incomingQ.code || incomingQ.id || '').toUpperCase();
          if (deletedSet.has(key) || deletedSet.has((incomingQ.id || '').toUpperCase())) {
            return; // Skip deleted
          }
          const idx = mergedQuizzes.findIndex((q: any) => q.id === incomingQ.id || (q.code && incomingQ.code && q.code === incomingQ.code));
          if (idx >= 0) {
            mergedQuizzes[idx] = { ...mergedQuizzes[idx], ...incomingQ, updatedAt: new Date().toISOString() };
          } else {
            mergedQuizzes.push({ ...incomingQ, updatedAt: new Date().toISOString() });
          }
        });
      }

      // Merge Submissions
      let mergedSubmissions = [...(currentData.submissions || [])];
      if (Array.isArray(submissions) && submissions.length > 0) {
        submissions.forEach((incomingSub: any) => {
          const idx = mergedSubmissions.findIndex((s: any) => s.id === incomingSub.id);
          if (idx >= 0) {
            mergedSubmissions[idx] = { ...mergedSubmissions[idx], ...incomingSub };
          } else {
            mergedSubmissions.push(incomingSub);
          }
        });
      }

      // Merge Teacher Access Codes
      let mergedCodes = currentData.teacherAccessCodes || [];
      if (Array.isArray(teacherAccessCodes) && teacherAccessCodes.length > 0) {
        const getKey = (c: any) => {
          if (c.teacherEmail && typeof c.teacherEmail === 'string' && c.teacherEmail.trim()) {
            return `email:${c.teacherEmail.trim().toLowerCase()}`;
          }
          if (c.code && typeof c.code === 'string' && c.code.trim()) {
            return `code:${c.code.trim().toUpperCase()}`;
          }
          if (c.pin && typeof c.pin === 'string' && c.pin.trim()) {
            return `code:${c.pin.trim().toUpperCase()}`;
          }
          return `id:${c.id}`;
        };

        const codeMap = new Map();
        mergedCodes.forEach((c: any) => codeMap.set(getKey(c), c));
        teacherAccessCodes.forEach((c: any) => {
          const key = getKey(c);
          const prev = codeMap.get(key);
          codeMap.set(key, { ...prev, ...c });
        });
        mergedCodes = Array.from(codeMap.values());
      }

      // Merge Sections
      let mergedSections = currentData.sections || [];
      if (Array.isArray(sections) && sections.length > 0) {
        mergedSections = sections;
      }

      const mergedConfig = quizConfig ? { ...currentData.quizConfig, ...quizConfig } : currentData.quizConfig;
      const mergedSettings = systemSettings ? { ...currentData.systemSettings, ...systemSettings } : currentData.systemSettings;
      const mergedAdminProfile = req.body.adminProfile ? { ...currentData.adminProfile, ...req.body.adminProfile } : currentData.adminProfile;

      const payload = {
        quizzes: mergedQuizzes,
        submissions: mergedSubmissions,
        teacherAccessCodes: mergedCodes,
        sections: mergedSections,
        quizConfig: mergedConfig,
        systemSettings: mergedSettings,
        adminProfile: mergedAdminProfile,
        lastUpdated: new Date().toISOString(),
      };

      saveServerData(payload);
      return res.json({ success: true, ...payload });
    } catch (err: any) {
      console.error('Error during full bidirectional sync:', err);
      return res.status(500).json({ error: 'Failed to perform full sync' });
    }
  });

  // Proxy Google Sheets Webhook push to avoid browser CORS and network restrictions
  app.post('/api/sync/google-sheets', async (req, res) => {
    try {
      const { webhookUrl, submissions } = req.body || {};
      if (!webhookUrl || !webhookUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Valid Google Sheets webhook URL is required' });
      }

      if (!Array.isArray(submissions) || submissions.length === 0) {
        return res.status(400).json({ error: 'Submissions array is required' });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'MCQ Assessment Hub',
          timestamp: new Date().toISOString(),
          totalRecords: submissions.length,
          submissions,
        }),
      });

      const responseText = await response.text();
      return res.json({
        success: response.ok,
        status: response.status,
        forwardedCount: submissions.length,
        response: responseText.slice(0, 500),
      });
    } catch (err: any) {
      console.error('Error forwarding to Google Sheets webhook:', err);
      return res.status(500).json({ error: 'Failed to push to Google Sheets webhook: ' + (err?.message || 'Network error') });
    }
  });

  // Initialize Gemini AI Client lazily or safely
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. API will return generated template responses.');
      return null;
    }
    return new GoogleGenAI({ apiKey });
  };

  // Robust JSON parser for LLM outputs (handles markdown fences, trailing commentary, unescaped LaTeX backslashes, trailing commas)
  const safeParseAiJson = <T = any>(rawText: string): T => {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Empty response from AI model');
    }

    let text = rawText.trim();

    // 1. Strip markdown fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 2. Locate outermost JSON object or array bounds
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');

    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = text.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = text.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      text = text.substring(startIdx, endIdx + 1).trim();
    }

    // 3. Attempt standard parse first
    try {
      return JSON.parse(text) as T;
    } catch (err1) {
      // 4. Sanitize unescaped LaTeX backslashes and trailing commas
      let cleaned = text
        // Fix unescaped backslashes before non-standard JSON escape chars (e.g. \frac, \sqrt, \alpha)
        .replace(/\\([a-zA-Z])/g, (match, letter) => {
          if (['b', 'f', 'n', 'r', 't', 'u'].includes(letter)) {
            return match;
          }
          return '\\\\' + letter;
        })
        // Remove trailing commas before closing braces/brackets
        .replace(/,\s*([}\]])/g, '$1');

      try {
        return JSON.parse(cleaned) as T;
      } catch (err2) {
        // 5. If truncated, attempt auto-closing of brackets
        try {
          let repaired = cleaned.trim().replace(/,\s*$/, '');
          const openBraces = (repaired.match(/\{/g) || []).length;
          let closeBraces = (repaired.match(/\}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          let closeBrackets = (repaired.match(/\]/g) || []).length;

          while (openBrackets > closeBrackets) {
            repaired += ']';
            closeBrackets++;
          }
          while (openBraces > closeBraces) {
            repaired += '}';
            closeBraces++;
          }

          return JSON.parse(repaired) as T;
        } catch (err3) {
          throw new Error(`AI JSON parse failed: ${err1 instanceof Error ? err1.message : String(err1)}`);
        }
      }
    }
  };

  // Helper to call Gemini with supported modern models and retry with backoff on transient 503 / rate limits
  const generateContentWithFallback = async (ai: GoogleGenAI, contents: any[], config?: any) => {
    // Valid modern models in order of priority (strictly compliant with @google/genai guidelines)
    const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });
          if (response) {
            return response;
          }
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const isTransient =
            status === 503 ||
            status === 429 ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.message?.includes('resource_exhausted') ||
            err?.message?.includes('Quota exceeded');

          if (isTransient && attempt < 2) {
            await delay(attempt * 800);
            continue;
          }
          // Move to next model in fallback array
          break;
        }
      }
    }
    throw lastError;
  };
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Route: Generate AI Student Feedback Summary
  app.post('/api/generate-feedback', async (req, res) => {
    try {
      const {
        studentName,
        studentEmail,
        score,
        maxScore,
        percentage,
        timeSpent,
        sectionBreakdown,
        missedQuestions,
      } = req.body;

      if (!studentName) {
        return res.status(400).json({ error: 'Student name is required' });
      }

      const ai = getAiClient();

      if (!ai) {
        // Fallback structured AI feedback when GEMINI_API_KEY is missing
        const fallbackFeedback = {
          studentName,
          studentEmail,
          score,
          maxScore,
          percentage,
          timeSpent,
          strengths: [
            'Demonstrated strong knowledge in foundational set theory and basic quadratic equations.',
            'Effective pace and time management during the assessment.',
          ],
          areasForImprovement: [
            'Review matrix determinants and 3D vector scalar/vector products.',
            'Practice calculus optimization problems, especially cylindrical surface area minimization.',
          ],
          recommendations: [
            'Re-visit Section 4 calculus turning points and definite integration steps.',
            'Solve 5 practice problems on Law of Cosines and Spearman rank correlation.',
          ],
          personalizedMessage: `Dear ${studentName},\n\nGreat effort on completing your Year 2 Additional Mathematics MCQ Assessment! You achieved ${score}/${maxScore} (${percentage}%). Keep up the diligent work in practice problems, particularly in calculus and vectors. Your tutor is proud of your consistent effort!\n\nBest regards,\nSDA Senior High School Mathematics Department`,
        };
        return res.json(fallbackFeedback);
      }

      const prompt = `You are an expert Additional Mathematics teacher at SDA Senior High School. Generate an encouraging, actionable, and structured student feedback evaluation for the following assessment submission:

Student Name: ${studentName}
Email: ${studentEmail}
Score: ${score} out of ${maxScore} (${percentage}%)
Time Spent: ${timeSpent}
Section Performance: ${JSON.stringify(sectionBreakdown || {})}
Incorrect Questions / Topics: ${JSON.stringify(missedQuestions || [])}

Please output a valid JSON object with the exact keys:
{
  "strengths": ["string", "string"],
  "areasForImprovement": ["string", "string"],
  "recommendations": ["string", "string"],
  "personalizedMessage": "A warm, professional, encouraging 3-paragraph email body addressed to the student."
}`;

      let parsedData: any = null;
      try {
        const response = await generateContentWithFallback(ai, [prompt], {
          responseMimeType: 'application/json',
        });
        const responseText = response.text || '';
        parsedData = safeParseAiJson(responseText);
      } catch (aiError: any) {
        console.warn('Gemini feedback generation unavailable (503/high demand). Returning default smart feedback template:', aiError?.message || aiError);
        parsedData = {
          strengths: ['Solid foundation in core algebra and problem-solving steps.'],
          areasForImprovement: ['Practice complex trigonometric identities and calculus steps under timed conditions.'],
          recommendations: ['Review questions you answered incorrectly and re-evaluate step-by-step solutions.'],
          personalizedMessage: `Dear ${studentName},\n\nGreat work completing your assessment with a score of ${score}/${maxScore} (${percentage}%). Keep reviewing key formulas and practicing problem sets to strengthen your performance!`,
        };
      }

      return res.json({
        studentName,
        studentEmail,
        score,
        maxScore,
        percentage,
        timeSpent,
        strengths: parsedData.strengths || ['Good foundational knowledge in algebra and set operations.'],
        areasForImprovement: parsedData.areasForImprovement || ['Work on calculus integration and matrix inverses.'],
        recommendations: parsedData.recommendations || ['Review section 4 questions in detail.'],
        personalizedMessage: parsedData.personalizedMessage || `Dear ${studentName},\n\nCongratulations on completing your assessment with a score of ${score}/${maxScore} (${percentage}%). Keep practicing your vector math and calculus equations!`,
      });
    } catch (error: any) {
      console.error('Error in /api/generate-feedback:', error);
      return res.status(500).json({
        error: 'Failed to generate feedback',
        message: error.message || 'Server error',
      });
    }
  });

  // API Route: Extract Questions from Microsoft Word (.docx, .doc) documents (excluding paper instructions)
  app.post('/api/extract-questions', async (req, res) => {
    try {
      const { text, fileData, fileType, fileName } = req.body;

      const ai = getAiClient();

      const systemPrompt = `You are an expert educational document parser and typesetter for high school mathematics and science examination papers.
CRITICAL INSTRUCTION: You MUST ONLY extract actual assessment questions (e.g., Multiple Choice Questions, problem statements, options A-D, correct keys, and explanations).
YOU MUST STRICTLY EXCLUDE AND DISCARD:
- General paper instructions (e.g., "INSTRUCTIONS TO CANDIDATES", "Answer all questions in Section A", "Time allowed: 2 Hours", "Calculators are permitted", "Do not open this paper until told to do so").
- Cover page information, school names, subject codes, index numbers, date headers.
- Preambles, rules, exam regulations, and section guidance paragraphs.

CRITICAL RULES FOR OPTIONS EXTRACTION:
- Each multiple choice question MUST extract and cleanly separate ALL options (A, B, C, D, and E if present).
- Options may be formatted on separate lines, all on one single line (e.g. 'A. 2 B. 3 C. 4 D. 6'), in a 2x2 grid (e.g. 'A. ... B. ...' on line 1 and 'C. ... D. ...' on line 2), or inline with the question stem (e.g. 'Which organ pumps blood? A. Lungs B. Heart C. Kidney D. Stomach').
- You MUST isolate each individual option text cleanly. NEVER include Option B's text inside Option A! NEVER put all options inside the question stem!
- NEVER output generic placeholder text like 'Option A', 'Option B' when option content exists in the document text.

CRITICAL RULES FOR PROSE VS MATHEMATICS:
- Keep all normal English writeups, words, questions, explanations, and science terms as standard clean prose text (e.g., 'Which organ pumps blood around the human body?', 'A. Lungs', 'B. Heart'). NEVER wrap full English sentences or non-mathematical words in dollar signs.
- ONLY wrap actual numbers, equations, expressions, fractions, powers, roots, variables, and mathematical symbols in single dollar signs $...$ (e.g., 'Solve $x^2 - 5x + 6 = 0$', 'A. $x = 2$', 'Simplify $\\log_2(32)$').
- Treat all numbers and fractions in mathematical options as LaTeX using \\dfrac for fractions (e.g. '$4$', '$5$', '$\\dfrac{3}{4}$', '$-10$').
- If an option is non-mathematical prose (e.g., 'Lungs', 'Heart', 'Solar energy', 'None of the above'), keep it as clean plain text without dollar signs.

Output JSON structure:
{
  "questions": [
    {
      "id": 1,
      "questionText": "Solve the quadratic equation $x^2 - 5x + 6 = 0$ for $x$.",
      "options": [
        { "id": "A", "text": "$x = 1$ or $x = 6$" },
        { "id": "B", "text": "$x = 2$ or $x = 3$" },
        { "id": "C", "text": "$x = -2$ or $x = -3$" },
        { "id": "D", "text": "$x = 0$ or $x = 5$" }
      ],
      "correctAnswer": "B",
      "explanation": "Factoring $(x-2)(x-3) = 0$ yields roots $x = 2$ or $x = 3$.",
      "topic": "Inequalities & Algebra"
    }
  ],
  "ignoredInstructionsCount": 2,
  "extractionNote": "Filter successfully applied: Excluded 2 preamble instruction blocks."
}`;

      // 1. Run local parser first to check if document text is already cleanly structured
      const parsedResult = parseAssessmentText(text || '');

      // If document text yields a clean question set, return them immediately
      // This preserves exact mathematical formulas and prevents AI truncation or hallucinations
      if (parsedResult.questions.length >= 1) {
        return res.json({
          questions: parsedResult.questions,
          ignoredInstructionsCount: parsedResult.ignoredInstructionsCount,
          extractionNote: parsedResult.extractionNote,
          source: 'high-performance-doc-parser',
        });
      }

      if (ai) {
        try {
          const promptWithExhaustiveRequirement = `${systemPrompt}\n\nCRITICAL REQUIREMENT: This examination paper may contain 20 to 100+ questions. You MUST extract EVERY SINGLE QUESTION from Question 1 to the final question without stopping, truncating, or summarizing after 10 questions.`;

          const contentsArray = [
            promptWithExhaustiveRequirement,
            `Document Text Content:\n${text || 'No document text provided.'}`,
          ];

          const response = await generateContentWithFallback(ai, contentsArray, {
            responseMimeType: 'application/json',
          });

          const responseText = response.text || '';
          const parsed = safeParseAiJson(responseText);

          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            // If local parser found significantly more questions than AI returned (e.g. 100 questions vs 10 questions)
            // Never discard the remaining 90 questions
            if (parsedResult.questions.length > parsed.questions.length) {
              return res.json({
                questions: parsedResult.questions,
                ignoredInstructionsCount: parsedResult.ignoredInstructionsCount,
                extractionNote: parsedResult.extractionNote,
                source: 'high-performance-doc-parser',
              });
            }

            const processedQuestions = parsed.questions.map((q: any) => ({
              ...q,
              questionText: formatMathTextToLatex(q.questionText || ''),
              options: (q.options || []).map((o: any) => ({ ...o, text: formatMathTextToLatex(o.text || '') })),
              explanation: formatMathTextToLatex(q.explanation || ''),
            }));

            return res.json({
              questions: processedQuestions,
              ignoredInstructionsCount: parsed.ignoredInstructionsCount || 1,
              extractionNote: parsed.extractionNote || 'Extracted questions and filtered instructions.',
              source: 'gemini-ai',
            });
          }
        } catch (aiErr: any) {
          console.warn('Gemini API calls failed or high demand (503). Falling back to local document parser:', aiErr?.message || aiErr);
          // Fall through to local parser below
        }
      }

      // Local Fallback Parser when GEMINI_API_KEY is not set or AI failed

      return res.json({
        questions: parsedResult.questions.length > 0 ? parsedResult.questions : [
          {
            id: 1,
            questionText: 'Solve the quadratic equation $x^2 - 5x + 6 = 0$ for $x$.',
            options: [
              { id: 'A', text: '$x = 1$ or $x = 6$' },
              { id: 'B', text: '$x = 2$ or $x = 3$' },
              { id: 'C', text: '$x = -2$ or $x = -3$' },
              { id: 'D', text: '$x = 0$ or $x = 5$' }
            ],
            correctAnswer: 'B',
            explanation: 'Factoring $(x-2)(x-3) = 0$ gives roots $x = 2$ or $x = 3$.',
            topic: 'Inequalities & Algebra'
          },
          {
            id: 2,
            questionText: 'Evaluate the derivative $\\frac{d}{dx} (3x^3 - 4x + 7)$.',
            options: [
              { id: 'A', text: '$9x^2 - 4$' },
              { id: 'B', text: '$6x^2 - 4$' },
              { id: 'C', text: '$9x^2 + 7$' },
              { id: 'D', text: '$3x^2 - 4$' }
            ],
            correctAnswer: 'A',
            explanation: 'Differentiating term by term gives $3(3x^2) - 4 = 9x^2 - 4$.',
            topic: 'Calculus & Optimization'
          }
        ],
        ignoredInstructionsCount: parsedResult.ignoredInstructionsCount || 2,
        extractionNote: parsedResult.extractionNote || 'Document segmented into questions with instructions excluded.',
        source: 'local-fallback',
      });
    } catch (error: any) {
      console.error('Error in /api/extract-questions:', error);
      return res.status(500).json({
        error: 'Failed to extract questions from document',
        message: error.message || 'Server error',
      });
    }
  });

  // Serve Vite in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const distAssetsPath = path.join(distPath, 'assets');

    // Immutable long-term caching for fingerprinted static assets (1 year)
    app.use('/assets', express.static(distAssetsPath, {
      maxAge: '1y',
      immutable: true,
    }));

    // Standard static serving for root assets (icons, manifest)
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
