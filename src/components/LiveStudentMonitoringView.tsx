import React, { useState, useEffect, useRef } from 'react';
import { QuizConfig, StudentSubmission, ActiveStudentSession, ProctorWarning } from '../types';
import { subscribeToActiveSessions, subscribeToSubmissions, saveTeacherWarningToFirestore, clearAllActiveSessionsFromFirestore, deleteActiveSessionFromFirestore } from '../services/firebaseSync';
import { getOfflineSubmissions } from '../utils/submissionUtils';
import { 
  Activity, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert,
  Search,
  Zap,
  Radio,
  Check,
  ArrowLeft,
  Eye,
  Mail,
  FileWarning,
  Flame,
  Filter,
  BarChart2,
  X,
  Calendar,
  Layers,
  GraduationCap,
  Megaphone,
  Send,
  Bell,
  Trash2,
  RotateCcw
} from 'lucide-react';

interface LiveStudentMonitoringViewProps {
  quizzes: QuizConfig[];
  submissions: StudentSubmission[];
  initialQuizId?: string;
  onBackToOverview?: () => void;
  onNavigateToResults?: (quizId?: string) => void;
  onOpenEmailFeedback?: (submission: StudentSubmission) => void;
  onDeleteSubmission?: (id: string) => void;
  onClearAllSubmissions?: (quizId?: string) => void;
  onSyncWithServer?: () => Promise<void> | void;
}

export const LiveStudentMonitoringView: React.FC<LiveStudentMonitoringViewProps> = ({
  quizzes,
  submissions,
  initialQuizId,
  onBackToOverview,
  onNavigateToResults,
  onOpenEmailFeedback,
  onDeleteSubmission,
  onClearAllSubmissions,
  onSyncWithServer,
}) => {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId || 'all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'flagged'>('all');

  // Live active student sessions fetched from server
  const [liveSessions, setLiveSessions] = useState<ActiveStudentSession[]>([]);
  const [serverSubmissions, setServerSubmissions] = useState<StudentSubmission[]>([]);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Proctor Warning Modal state
  const [warningTargetStudent, setWarningTargetStudent] = useState<{
    studentName: string;
    studentId: string;
    quizId?: string;
    tabSwitchesCount: number;
  } | null>(null);
  const [customWarningText, setCustomWarningText] = useState<string>('');
  const [isSendingWarning, setIsSendingWarning] = useState<boolean>(false);
  const [warningSuccessMessage, setWarningSuccessMessage] = useState<string | null>(null);

  // Live Generic Broadcast to All Students Modal state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [broadcastMessageText, setBroadcastMessageText] = useState<string>('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);

  // Clear Monitoring Log Modal state
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [clearScope, setClearScope] = useState<'active_only' | 'all_records'>('all_records');
  const [clearTargetQuizOnly, setClearTargetQuizOnly] = useState<boolean>(false);
  const [isClearingLiveData, setIsClearingLiveData] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Single Student Delete Confirmation Modal state
  const [studentToDelete, setStudentToDelete] = useState<{
    id: string;
    studentName: string;
    studentId: string;
    classGroup?: string;
    quizTitle?: string;
    quizId?: string;
    isLive: boolean;
    status: string;
    tabSwitchesCount?: number;
  } | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState<boolean>(false);

  // Modal for inspecting detailed integrity logs of a student
  const [selectedIntegrityStudent, setSelectedIntegrityStudent] = useState<{
    studentName: string;
    studentId: string;
    classGroup?: string;
    tabSwitchesCount: number;
    windowExitsCount?: number;
    status: string;
    lastHeartbeat?: string;
    remainingSeconds?: number;
    quizTitle?: string;
  } | null>(null);

  // Sync if initialQuizId changes
  useEffect(() => {
    if (initialQuizId) {
      setSelectedQuizId(initialQuizId);
    }
  }, [initialQuizId]);

  // Tick current time every second for smooth ticking countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Comprehensive Candidate Submission Keys
  // Merges submissions prop + server submissions + offline submissions so any completed candidate is immediately recognized
  const submittedCandidateKeys = React.useMemo(() => {
    const set = new Set<string>();
    const allSubs: StudentSubmission[] = [...(submissions || []), ...serverSubmissions];

    try {
      const offline = getOfflineSubmissions();
      if (Array.isArray(offline)) allSubs.push(...offline);
      const rawLocal = localStorage.getItem('joy_offline_submissions');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) allSubs.push(...parsed);
      }
      const rawActive = localStorage.getItem('mcq_exam_active_session');
      if (rawActive) {
        const parsedActive = JSON.parse(rawActive);
        if (parsedActive && parsedActive.status === 'submitted') {
          allSubs.push(parsedActive);
        }
      }
    } catch (e) {}

    allSubs.forEach((sub) => {
      if (!sub) return;
      const qKey = (sub.quizId || (sub as any).quizCode || '').toLowerCase().trim();
      const sId = (sub.studentId || '').toLowerCase().trim();
      const sName = (sub.studentName || '').toLowerCase().trim();
      const sEmail = (sub.studentEmail || '').toLowerCase().trim();

      if (sId) {
        set.add(`${sId}_${qKey}`);
        set.add(sId);
      }
      if (sName) {
        set.add(`${sName}_${qKey}`);
        set.add(sName);
      }
      if (sEmail) {
        set.add(`${sEmail}_${qKey}`);
        set.add(sEmail);
      }
      if (sub.id) {
        set.add(sub.id.toLowerCase().trim());
      }
    });

    return set;
  }, [submissions, serverSubmissions]);

  // Helper to validate whether a session is truly live and actively taking the exam
  const isSessionCurrentlyActive = (s: ActiveStudentSession, now: number): boolean => {
    if (!s || (!s.studentId && !s.studentName)) return false;
    if (s.status === 'submitted') return false;

    // Time expired
    if (typeof s.remainingSeconds === 'number' && s.remainingSeconds <= 0) return false;
    if (s.targetEndTime && typeof s.targetEndTime === 'number' && s.targetEndTime <= now) return false;

    // Stale heartbeat: if candidate hasn't sent a heartbeat ping in > 2 minutes, they closed, disconnected, or finished
    if (s.lastHeartbeat) {
      const hbTime = new Date(s.lastHeartbeat).getTime();
      if (!isNaN(hbTime) && (now - hbTime) > 2 * 60 * 1000) return false;
    } else if (s.startTime) {
      const sTime = typeof s.startTime === 'number' ? s.startTime : new Date(s.startTime).getTime();
      // If candidate has been started for more than 2 minutes without any heartbeat, prune as disconnected/finished
      if (!isNaN(sTime) && (now - sTime) > 2 * 60 * 1000) return false;
    } else {
      // Neither heartbeat nor valid start timestamp: cannot be considered active
      return false;
    }

    // Exclude if already submitted
    const sId = (s.studentId || '').toLowerCase().trim();
    const sName = (s.studentName || '').toLowerCase().trim();
    const sEmail = (s.studentEmail || '').toLowerCase().trim();
    const sQuiz = (s.quizId || (s as any).quizCode || '').toLowerCase().trim();
    const sessId = (s.id || '').toLowerCase().trim();

    if (sessId && submittedCandidateKeys.has(sessId)) return false;
    if (sId && (submittedCandidateKeys.has(`${sId}_${sQuiz}`) || submittedCandidateKeys.has(sId))) return false;
    if (sName && (submittedCandidateKeys.has(`${sName}_${sQuiz}`) || submittedCandidateKeys.has(sName))) return false;
    if (sEmail && (submittedCandidateKeys.has(`${sEmail}_${sQuiz}`) || submittedCandidateKeys.has(sEmail))) return false;

    // Flexible cross-key search
    for (const key of submittedCandidateKeys) {
      if (!key) continue;
      if (sId && (key === sId || key.startsWith(`${sId}_`))) return false;
      if (sName && (key === sName || key.startsWith(`${sName}_`))) return false;
      if (sessId && key === sessId) return false;
    }

    return true;
  };

  // Fetch active sessions from server and synchronize with server submissions
  const fetchActiveSessions = async () => {
    try {
      const [sessRes, subRes] = await Promise.allSettled([
        fetch('/api/sync/active-sessions'),
        fetch('/api/sync/submissions'),
      ]);

      if (subRes.status === 'fulfilled' && subRes.value.ok) {
        const subData = await subRes.value.json();
        if (Array.isArray(subData.submissions)) {
          setServerSubmissions(subData.submissions);
        }
      }

      if (sessRes.status === 'fulfilled' && sessRes.value.ok) {
        const data = await sessRes.value.json();
        if (Array.isArray(data.activeSessions)) {
          const now = Date.now();
          const validSessions = data.activeSessions.filter((s: ActiveStudentSession) => isSessionCurrentlyActive(s, now));
          setLiveSessions(validSessions);
          setLastRefreshedAt(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn('Error fetching active sessions:', err);
    }
  };

  // Real-time Firestore active sessions listener, Submissions listener & BroadcastChannel listener
  useEffect(() => {
    // 1. Initial server fetch
    fetchActiveSessions();

    // 2. Real-time Firestore Live Active Sessions Listener
    const unsubscribeFirestore = subscribeToActiveSessions((cloudActiveSessions) => {
      if (Array.isArray(cloudActiveSessions)) {
        const now = Date.now();
        const validSessions = cloudActiveSessions.filter((s) => isSessionCurrentlyActive(s, now));
        setLiveSessions(validSessions);
        setLastRefreshedAt(new Date().toLocaleTimeString());
      }
    });

    // 3. Real-time Firestore Submissions Listener - immediately marks submitted students as completed
    const unsubscribeSubmissions = subscribeToSubmissions((cloudSubs) => {
      if (Array.isArray(cloudSubs) && cloudSubs.length > 0) {
        setServerSubmissions((prev) => {
          const map = new Map<string, StudentSubmission>();
          prev.forEach((s) => map.set(s.id, s));
          cloudSubs.forEach((s) => map.set(s.id, s));
          return Array.from(map.values());
        });
      }
    });

    // 4. Instant BroadcastChannel Listener for same-origin tabs
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('mcq_exam_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'ACTIVE_SESSION_UPDATE' || event.data?.type === 'ACTIVE_SESSION_START') {
            const sess = event.data.session;
            if (sess && (sess.studentId || sess.studentName) && sess.status !== 'submitted') {
              const sId = (sess.studentId || '').toLowerCase().trim();
              const sName = (sess.studentName || '').toLowerCase().trim();
              const sQuiz = (sess.quizId || (sess as any).quizCode || '').toLowerCase().trim();
              if ((sId && (submittedCandidateKeys.has(`${sId}_${sQuiz}`) || submittedCandidateKeys.has(sId))) ||
                  (sName && (submittedCandidateKeys.has(`${sName}_${sQuiz}`) || submittedCandidateKeys.has(sName)))) {
                return;
              }
              setLiveSessions((prev) => {
                const k = sess.id || `${sess.studentId || sess.studentName}-${sess.quizId || 'quiz'}`;
                const map = new Map(prev.map((s) => [s.id || `${s.studentId || s.studentName}-${s.quizId || 'quiz'}`, s]));
                map.set(k, sess);
                return Array.from(map.values());
              });
              setLastRefreshedAt(new Date().toLocaleTimeString());
            }
          } else if (event.data?.type === 'ACTIVE_SESSION_COMPLETED' || event.data?.type === 'STUDENT_SESSION_REMOVED') {
            const { studentId, studentName, quizId, id } = event.data;
            if (studentId || id || studentName) {
              setLiveSessions((prev) =>
                prev.filter((s) => {
                  const sId = (s.studentId || '').toLowerCase().trim();
                  const sSessId = (s.id || '').toLowerCase().trim();
                  const sName = (s.studentName || '').toLowerCase().trim();

                  const tId = (studentId || '').toLowerCase().trim();
                  const tSessId = (id || '').toLowerCase().trim();
                  const tName = (studentName || '').toLowerCase().trim();

                  const matchStd = tId && (sId === tId || sSessId.includes(tId) || sSessId === tId || sId.includes(tId));
                  const matchId = tSessId && (sSessId === tSessId || sId === tSessId);
                  const matchName = tName && (sName === tName || sName.includes(tName) || tName.includes(sName));

                  // When candidate submits, remove from live monitor immediately
                  return !(matchStd || matchId || matchName);
                })
              );
              setLastRefreshedAt(new Date().toLocaleTimeString());
            }
          } else if (event.data?.type === 'ACTIVE_SESSIONS_CLEARED') {
            setLiveSessions([]);
            setLastRefreshedAt(new Date().toLocaleTimeString());
          }
        };
      } catch (e) {}
    }

    return () => {
      unsubscribeFirestore();
      unsubscribeSubmissions();
      if (channel) channel.close();
    };
  }, [submittedCandidateKeys]);

  // Purge any candidate who already submitted from local liveSessions whenever submissions list updates
  useEffect(() => {
    if (!submissions || submissions.length === 0) return;
    setLiveSessions((prev) => {
      const filtered = prev.filter((sess) => {
        if (!sess || sess.status === 'submitted') return false;
        const sId = (sess.studentId || '').toLowerCase().trim();
        const sName = (sess.studentName || '').toLowerCase().trim();
        const sQuiz = (sess.quizId || (sess as any).quizCode || '').toLowerCase().trim();
        if (sId && (submittedCandidateKeys.has(`${sId}_${sQuiz}`) || submittedCandidateKeys.has(sId))) return false;
        if (sName && (submittedCandidateKeys.has(`${sName}_${sQuiz}`) || submittedCandidateKeys.has(sName))) return false;
        return true;
      });
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [submissions, submittedCandidateKeys]);

  // Auto-refresh loop
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      await fetchActiveSessions();
      if (onSyncWithServer) {
        try {
          await onSyncWithServer();
        } catch (e) {}
      }
      setLastRefreshedAt(new Date().toLocaleTimeString());
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, onSyncWithServer]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchActiveSessions();
    if (onSyncWithServer) {
      try {
        await onSyncWithServer();
      } catch (e) {}
    }
    setLastRefreshedAt(new Date().toLocaleTimeString());
    setIsRefreshing(false);
  };

  // Clear Monitoring Log (Active streams only OR All records including submissions)
  const handleConfirmClearMonitoringLog = async () => {
    setIsClearingLiveData(true);
    try {
      const activeFilterQuizId = (clearTargetQuizOnly && selectedQuizId !== 'all') ? selectedQuizId : null;

      if (activeFilterQuizId) {
        // 1. Remove active sessions for this quiz
        const qUpper = activeFilterQuizId.toUpperCase();
        const sessionsToClear = liveSessions.filter((s) => {
          const sQuizId = (s.quizId || '').toUpperCase();
          const sQuizCode = ((s as any).quizCode || '').toUpperCase();
          return sQuizId === qUpper || sQuizCode === qUpper;
        });
        for (const sess of sessionsToClear) {
          if (sess.id) await deleteActiveSessionFromFirestore(sess.id, sess.studentName, sess.quizId);
          await fetch(`/api/sync/active-sessions/${encodeURIComponent(sess.id || sess.studentId || '')}`, { method: 'DELETE' }).catch(() => {});
        }
        await fetch(`/api/sync/active-sessions/quiz/${encodeURIComponent(activeFilterQuizId)}`, { method: 'DELETE' }).catch(() => {});
        setLiveSessions((prev) => prev.filter((s) => {
          const sQuizId = (s.quizId || '').toUpperCase();
          const sQuizCode = ((s as any).quizCode || '').toUpperCase();
          return sQuizId !== qUpper && sQuizCode !== qUpper;
        }));

        // 2. If clearScope === 'all_records', remove submissions for this quiz
        if (clearScope === 'all_records') {
          if (onClearAllSubmissions) {
            onClearAllSubmissions(activeFilterQuizId);
          } else {
            const submissionsToClear = submissions.filter((sub) => {
              const subQ = (sub.quizId || (sub as any).quizCode || '').toUpperCase();
              return subQ === qUpper;
            });
            for (const sub of submissionsToClear) {
              if (onDeleteSubmission) onDeleteSubmission(sub.id);
              await fetch(`/api/sync/submissions/${encodeURIComponent(sub.id)}`, { method: 'DELETE' }).catch(() => {});
            }
            await fetch(`/api/sync/submissions/quiz/${encodeURIComponent(activeFilterQuizId)}`, { method: 'DELETE' }).catch(() => {});
          }
        }
      } else {
        // Clear across all quizzes
        // 1. Clear in Firestore
        await clearAllActiveSessionsFromFirestore();

        // 2. Clear on Server API
        await fetch('/api/sync/active-sessions/all', {
          method: 'DELETE',
        }).catch((err) => console.warn('Server clear active sessions error:', err));

        // 3. Clear local state
        setLiveSessions([]);

        // 4. Remove active local storage session
        try {
          localStorage.removeItem('mcq_exam_active_session');
          localStorage.removeItem('joy_submitted_locks');
        } catch (e) {}

        // 5. If clearScope === 'all_records', clear all submissions
        if (clearScope === 'all_records') {
          if (onClearAllSubmissions) {
            onClearAllSubmissions();
          }
          await fetch('/api/sync/submissions/all', { method: 'DELETE' }).catch(() => {});
        }
      }

      // Broadcast to all active tabs
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('mcq_exam_channel');
          channel.postMessage({ type: 'ACTIVE_SESSIONS_CLEARED' });
          channel.close();
        } catch (e) {}
      }

      // Trigger server sync if provided
      if (onSyncWithServer) {
        try {
          await onSyncWithServer();
        } catch (e) {}
      }

      setActionFeedback({
        message: clearScope === 'all_records'
          ? 'All student monitoring and submission logs have been cleared successfully.'
          : 'Live surveillance monitoring streams have been reset and cleared.',
        type: 'success',
      });
      setTimeout(() => setActionFeedback(null), 4000);
      setShowClearConfirmModal(false);
      await fetchActiveSessions();
    } catch (err) {
      console.error('Failed to clear monitoring data:', err);
      setActionFeedback({
        message: 'Failed to clear monitoring log. Please try again.',
        type: 'error',
      });
    } finally {
      setIsClearingLiveData(false);
    }
  };

  // Delete Individual Student from Monitoring Log
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    const { id, studentName, studentId, isLive } = studentToDelete;

    try {
      if (isLive) {
        // 1. Delete active session from Firestore
        await deleteActiveSessionFromFirestore(id, studentName, studentToDelete.quizId);
        if (studentId && studentId !== id) {
          await deleteActiveSessionFromFirestore(studentId, studentName, studentToDelete.quizId);
        }

        // 2. Delete active session from Server API
        await fetch(`/api/sync/active-sessions/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }).catch((e) => console.warn(e));
        if (studentId) {
          await fetch(`/api/sync/active-sessions/${encodeURIComponent(studentId)}`, {
            method: 'DELETE',
          }).catch(() => {});
        }
        if (studentName) {
          await fetch(`/api/sync/active-sessions/${encodeURIComponent(studentName)}`, {
            method: 'DELETE',
          }).catch(() => {});
        }

        // 3. Remove from local liveSessions
        setLiveSessions((prev) => prev.filter((s) => s.id !== id && s.studentId !== id && s.studentId !== studentId && s.studentName !== studentName));
      }

      // Also remove any submission matching this id
      if (onDeleteSubmission) {
        onDeleteSubmission(id);
      }
      await fetch(`/api/sync/submissions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {});

      // Clear any pending warnings for this student
      if (studentId) {
        await fetch(`/api/sync/teacher-warnings/${encodeURIComponent(studentId)}`, {
          method: 'DELETE',
        }).catch(() => {});
      }

      // Trigger sync
      if (onSyncWithServer) {
        try {
          await onSyncWithServer();
        } catch (e) {}
      }

      // Broadcast update
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('mcq_exam_channel');
          channel.postMessage({
            type: 'STUDENT_SESSION_REMOVED',
            studentId,
            id,
          });
          channel.close();
        } catch (e) {}
      }

      setActionFeedback({
        message: `Candidate "${studentName}" was successfully removed from the monitoring log.`,
        type: 'success',
      });
      setTimeout(() => setActionFeedback(null), 4000);
      setStudentToDelete(null);
      await fetchActiveSessions();
    } catch (err) {
      console.error('Failed to delete student from monitoring log:', err);
      setActionFeedback({
        message: `Failed to remove ${studentName}. Please try again.`,
        type: 'error',
      });
    } finally {
      setIsDeletingStudent(false);
    }
  };

  // Direct Teacher Proctor Warning Dispatcher
  const handleSendProctorWarning = async (
    targetStudent: { studentName: string; studentId: string; quizId?: string },
    messageText: string
  ) => {
    if (!messageText.trim()) return;
    setIsSendingWarning(true);
    try {
      const cleanStudentId = (targetStudent.studentId || 'std').trim();
      const payload: ProctorWarning = {
        id: `warn_${cleanStudentId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`,
        studentId: cleanStudentId,
        studentName: targetStudent.studentName,
        quizId: targetStudent.quizId || (selectedQuizId !== 'all' ? selectedQuizId : ''),
        teacherName: 'Exam Proctor / Invigilator',
        message: messageText.trim(),
        type: 'warning',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      // 1. Save to Firestore for multi-device live warning delivery
      saveTeacherWarningToFirestore(payload).catch((err) => console.warn('Warning Firestore error:', err));

      // 2. Post to Server API
      fetch('/api/sync/teacher-warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Warning server error:', err));

      // 3. Broadcast via BroadcastChannel across browser tabs
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('mcq_exam_channel');
          channel.postMessage({
            type: 'TEACHER_PROCTOR_WARNING',
            warning: payload,
          });
          channel.close();
        } catch (e) {}
      }

      // 4. Store in local storage for instantaneous single-origin sync
      try {
        const raw = localStorage.getItem('teacher_student_warnings');
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem('teacher_student_warnings', JSON.stringify([payload, ...list].slice(0, 50)));
      } catch (e) {}

      setWarningSuccessMessage(`Proctor warning live delivered to ${targetStudent.studentName}!`);
      setTimeout(() => {
        setWarningSuccessMessage(null);
      }, 4000);

      setWarningTargetStudent(null);
      setCustomWarningText('');
      await fetchActiveSessions();
    } catch (err) {
      console.error('Error sending proctor warning:', err);
    } finally {
      setIsSendingWarning(false);
    }
  };

  // Generic Broadcast Dispatcher to All Active Students
  const handleSendBroadcast = async (messageText: string) => {
    if (!messageText.trim()) return;
    setIsSendingBroadcast(true);
    try {
      const payload: ProctorWarning = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        studentId: 'all',
        studentName: 'All Candidates',
        quizId: selectedQuizId !== 'all' ? selectedQuizId : '',
        teacherName: 'Exam Proctor / Invigilator',
        message: messageText.trim(),
        type: 'broadcast',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      // 1. Save to Firestore for multi-device real-time sync
      saveTeacherWarningToFirestore(payload).catch((err) => console.warn('Broadcast Firestore error:', err));

      // 2. Post to Server API
      fetch('/api/sync/teacher-warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Broadcast server error:', err));

      // 3. BroadcastChannel across browser tabs
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('mcq_exam_channel');
          channel.postMessage({
            type: 'TEACHER_PROCTOR_WARNING',
            warning: payload,
          });
          channel.close();
        } catch (e) {}
      }

      // 4. LocalStorage
      try {
        const raw = localStorage.getItem('teacher_student_warnings');
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem('teacher_student_warnings', JSON.stringify([payload, ...list].slice(0, 50)));
      } catch (e) {}

      setWarningSuccessMessage('Live broadcast announcement transmitted to all student screens!');
      setTimeout(() => {
        setWarningSuccessMessage(null);
      }, 4000);

      setIsBroadcastModalOpen(false);
      setBroadcastMessageText('');
      await fetchActiveSessions();
    } catch (err) {
      console.error('Error sending broadcast:', err);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Find currently selected quiz metadata
  const currentQuiz = quizzes.find((q) => q.id === selectedQuizId || q.code === selectedQuizId);

  // Dynamically compile available quizzes from teacher quizzes + live active sessions + submissions
  const availableQuizzes = React.useMemo(() => {
    const map = new Map<string, QuizConfig>();
    
    // Add existing passed quizzes
    quizzes.forEach((q) => {
      if (q && (q.id || q.code)) {
        map.set(q.id || q.code, q);
      }
    });

    // Add any active session quizzes if not present
    liveSessions.forEach((s) => {
      const qKey = s.quizId || s.quizCode;
      if (qKey && !map.has(qKey)) {
        map.set(qKey, {
          id: s.quizId || qKey,
          code: s.quizCode || qKey,
          title: s.quizTitle || 'Live Assessment',
          subject: (s as any).subject || 'Mathematics',
          durationMinutes: s.durationMinutes || 60,
          totalQuestions: s.totalQuestions || 40,
          status: 'released',
          classGroup: s.classGroup || '',
        } as unknown as QuizConfig);
      }
    });

    if (map.size === 0) {
      return [
        {
          id: 'default',
          code: 'CORE-MATH-01',
          title: 'Core Mathematics Live Examination',
          subject: 'Mathematics',
          durationMinutes: 60,
          totalQuestions: 40,
          classGroup: 'Year 2 Science',
        } as unknown as QuizConfig
      ];
    }

    return Array.from(map.values());
  }, [quizzes, liveSessions]);

  // Merge Live Active Sessions + Final Submissions
  // We identify unique students by studentId or id
  interface MergedStudentRecord {
    id: string;
    studentName: string;
    studentEmail?: string;
    studentId: string;
    school?: string;
    classGroup?: string;
    quizId: string;
    quizTitle: string;
    quizCode?: string;
    status: 'in_progress' | 'submitted' | 'expired';
    startTime?: string | number;
    targetEndTime?: number;
    durationMinutes: number;
    remainingSeconds: number;
    tabSwitchesCount: number;
    windowExitsCount: number;
    questionsAnsweredCount: number;
    totalQuestions: number;
    score?: number;
    maxScore?: number;
    percentage?: number;
    submittedAt?: string;
    lastHeartbeat?: string;
    rawSubmission?: StudentSubmission;
  }

  // Count submissions matching current quiz filter for informational stats & quick navigation to Results
  const matchingSubmissionsCount = React.useMemo(() => {
    if (selectedQuizId === 'all') return submissions.length;
    return submissions.filter((sub) => {
      const matchDirect = sub.quizId === selectedQuizId || sub.quizTitle === selectedQuizId || (sub as any).quizCode === selectedQuizId;
      const matchViaQuiz = currentQuiz && (
        sub.quizId === currentQuiz.id ||
        sub.quizId === currentQuiz.code ||
        sub.quizTitle === currentQuiz.title ||
        (sub as any).quizCode === currentQuiz.code
      );
      return matchDirect || matchViaQuiz;
    }).length;
  }, [submissions, selectedQuizId, currentQuiz]);

  // 2. The monitor should ONLY display students currently taking the quiz.
  // Once the student clicks submit, their results move to results and leave the monitoring dashboard.
  const mergedRecords: MergedStudentRecord[] = [];

  liveSessions.forEach((sess) => {
    if (!sess || (!sess.studentId && !sess.studentName)) return;

    // Must satisfy current active validity
    if (!isSessionCurrentlyActive(sess, nowTimestamp)) return;

    // Check quiz matching
    if (selectedQuizId !== 'all') {
      const matchDirect = (sess.quizId && sess.quizId === selectedQuizId) || 
                          (sess.quizTitle && sess.quizTitle.toLowerCase().trim() === selectedQuizId.toLowerCase().trim()) || 
                          (sess.quizCode && sess.quizCode.toLowerCase().trim() === selectedQuizId.toLowerCase().trim());
      const matchViaQuiz = currentQuiz && (
        (sess.quizId && (sess.quizId === currentQuiz.id || sess.quizId === currentQuiz.code)) ||
        (sess.quizCode && (sess.quizCode === currentQuiz.code || sess.quizCode === currentQuiz.id)) ||
        (sess.quizTitle && currentQuiz.title && sess.quizTitle.toLowerCase().trim() === currentQuiz.title.toLowerCase().trim())
      );
      if (!matchDirect && !matchViaQuiz) return;
    }

    // Exclude if already marked as submitted in session
    if (sess.status === 'submitted') return;

    // Exclude if candidate already exists in submissions (submitted and moved to results dashboard)
    const sId = (sess.studentId || '').toLowerCase().trim();
    const sName = (sess.studentName || '').toLowerCase().trim();
    const sEmail = (sess.studentEmail || '').toLowerCase().trim();
    const sQuiz = (sess.quizId || (sess as any).quizCode || '').toLowerCase().trim();
    const sessId = (sess.id || '').toLowerCase().trim();
    if (
      (sessId && submittedCandidateKeys.has(sessId)) ||
      (sId && (submittedCandidateKeys.has(`${sId}_${sQuiz}`) || submittedCandidateKeys.has(sId))) ||
      (sName && (submittedCandidateKeys.has(`${sName}_${sQuiz}`) || submittedCandidateKeys.has(sName))) ||
      (sEmail && (submittedCandidateKeys.has(`${sEmail}_${sQuiz}`) || submittedCandidateKeys.has(sEmail)))
    ) {
      return;
    }

    // Calculate real-time countdown
    let remaining = typeof sess.remainingSeconds === 'number' ? sess.remainingSeconds : 3600;
    if (sess.targetEndTime && typeof sess.targetEndTime === 'number') {
      remaining = Math.max(0, Math.floor((sess.targetEndTime - nowTimestamp) / 1000));
    }

    // Must be actively in progress and have countdown time remaining
    if (sess.status !== 'in_progress' || remaining <= 0) return;

    // If targetEndTime has passed, student has completed or expired
    if (sess.targetEndTime && typeof sess.targetEndTime === 'number' && sess.targetEndTime <= nowTimestamp) return;

    // Stale session filter: if candidate hasn't sent a heartbeat ping in > 2 minutes, they closed, disconnected, or finished
    if (sess.lastHeartbeat) {
      const hbTime = new Date(sess.lastHeartbeat).getTime();
      if (!isNaN(hbTime) && (nowTimestamp - hbTime) > 2 * 60 * 1000) return;
    } else if (sess.startTime) {
      const sTime = typeof sess.startTime === 'number' ? sess.startTime : new Date(sess.startTime).getTime();
      if (!isNaN(sTime) && (nowTimestamp - sTime) > 2 * 60 * 1000) return;
    } else {
      return;
    }

    const existingIndex = mergedRecords.findIndex((r) => {
      const rId = (r.studentId || '').toLowerCase().trim();
      const rName = (r.studentName || '').toLowerCase().trim();
      return (rId && sId && rId === sId) || (rName && sName && rName === sName);
    });

    if (existingIndex >= 0) {
      const existing = mergedRecords[existingIndex];
      mergedRecords[existingIndex] = {
        ...existing,
        id: sess.id || existing.id,
        studentName: sess.studentName || existing.studentName,
        studentEmail: sess.studentEmail || existing.studentEmail,
        studentId: sess.studentId || existing.studentId,
        school: sess.school || existing.school,
        classGroup: sess.classGroup || existing.classGroup || 'Candidate',
        quizId: sess.quizId || existing.quizId,
        quizTitle: sess.quizTitle || existing.quizTitle,
        quizCode: sess.quizCode || existing.quizCode,
        status: 'in_progress',
        startTime: sess.startTime || existing.startTime,
        targetEndTime: sess.targetEndTime || existing.targetEndTime,
        durationMinutes: sess.durationMinutes || existing.durationMinutes || 60,
        remainingSeconds: remaining,
        tabSwitchesCount: Math.max(sess.tabSwitchesCount || 0, existing.tabSwitchesCount || 0),
        windowExitsCount: Math.max(sess.windowExitsCount || 0, existing.windowExitsCount || 0),
        questionsAnsweredCount: typeof sess.questionsAnsweredCount === 'number' ? sess.questionsAnsweredCount : existing.questionsAnsweredCount,
        totalQuestions: sess.totalQuestions || existing.totalQuestions || 40,
        lastHeartbeat: sess.lastHeartbeat || existing.lastHeartbeat,
      };
      return;
    }

    mergedRecords.push({
      id: sess.id || `sess_${sess.studentId || 'std'}`,
      studentName: sess.studentName || 'Student Candidate',
      studentEmail: sess.studentEmail,
      studentId: sess.studentId || 'STD',
      school: sess.school,
      classGroup: sess.classGroup || 'Candidate',
      quizId: sess.quizId || selectedQuizId,
      quizTitle: sess.quizTitle || currentQuiz?.title || 'MCQ Assessment',
      quizCode: sess.quizCode || currentQuiz?.code,
      status: 'in_progress',
      startTime: sess.startTime,
      targetEndTime: sess.targetEndTime,
      durationMinutes: sess.durationMinutes || currentQuiz?.durationMinutes || 60,
      remainingSeconds: remaining,
      tabSwitchesCount: sess.tabSwitchesCount || 0,
      windowExitsCount: sess.windowExitsCount || 0,
      questionsAnsweredCount: sess.questionsAnsweredCount || 0,
      totalQuestions: sess.totalQuestions || currentQuiz?.totalQuestions || 40,
      score: sess.score,
      maxScore: sess.maxScore,
      percentage: sess.percentage,
      lastHeartbeat: sess.lastHeartbeat,
    });
  });

  // Sort: Active candidates with flagged tab toggles at top, followed by lowest remaining countdown
  mergedRecords.sort((a, b) => {
    if ((b.tabSwitchesCount || 0) !== (a.tabSwitchesCount || 0)) {
      return (b.tabSwitchesCount || 0) - (a.tabSwitchesCount || 0);
    }
    return (a.remainingSeconds || 0) - (b.remainingSeconds || 0);
  });

  // Filter by search query & status
  const filteredRecords = mergedRecords.filter((rec) => {
    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = rec.studentName.toLowerCase().includes(q);
      const matchId = rec.studentId.toLowerCase().includes(q);
      const matchClass = (rec.classGroup || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchClass) return false;
    }

    // Status filter
    if (statusFilter === 'live') {
      return rec.status === 'in_progress';
    }
    if (statusFilter === 'flagged') {
      return rec.tabSwitchesCount > 0 || rec.windowExitsCount > 0;
    }

    return true;
  });

  // Metrics
  const currentlyActive = mergedRecords.length;
  const completedCount = matchingSubmissionsCount;
  const totalStarted = currentlyActive + completedCount;
  const flaggedCandidatesCount = mergedRecords.filter((r) => r.tabSwitchesCount > 0 || r.windowExitsCount > 0).length;
  const totalIntegrityWarnings = mergedRecords.reduce((acc, curr) => acc + curr.tabSwitchesCount, 0);

  // Format seconds to mm:ss or hh:mm:ss
  const formatCountdown = (totalSecs: number) => {
    if (totalSecs <= 0) return '00:00';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Navigation Bar */}
      {onBackToOverview && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs">
          <button
            onClick={onBackToOverview}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Teacher Assessments</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Surveillance Stream Active •</span>
            <span className="text-emerald-700 font-black">Online</span>
          </div>
        </div>
      )}

      {/* 1. HEADER BANNER */}
      <div className="bg-[#0B132B] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 tracking-wider uppercase">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>Real-Time Assessment Surveillance & Live Countdown</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
              Live Student Monitoring
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Track live students taking your setup quiz in real time, observe remaining timer countdowns, and monitor flagged tab toggles attached to teacher reports.
            </p>
          </div>

          {/* Controls: Broadcast to All + Clear Live Data + Auto-Refresh Toggle + Manual Refresh */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsBroadcastModalOpen(true);
                setBroadcastMessageText('');
              }}
              title="Broadcast Generic Announcement to All Active Students"
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>Broadcast to All</span>
            </button>

            <button
              onClick={() => setShowClearConfirmModal(true)}
              title="Clear or reset live students and monitoring logs"
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-rose-500/50 bg-gradient-to-r from-rose-500/20 to-red-600/20 hover:from-rose-500/30 hover:to-red-600/30 text-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear Monitoring Log</span>
              {mergedRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/40 text-rose-100 border border-rose-400/30">
                  {mergedRecords.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                autoRefresh
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => {}}
                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 border-slate-600 cursor-pointer"
              />
              <span>Live Auto-Sync (3s)</span>
            </button>

            <button
              onClick={handleManualRefresh}
              title="Manual Sync Refresh"
              className="p-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-90"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SELECT TEACHER ASSESSMENT & QUIZ DETAILS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label className="text-xs font-bold text-slate-800 whitespace-nowrap flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Select Teacher Assessment:</span>
          </label>
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="w-full sm:w-auto flex-1 max-w-xl p-2.5 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900 bg-slate-50 focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-inner"
          >
            <option value="all">⚡ ALL ASSESSMENTS (Combined Teacher Live Stream)</option>
            {availableQuizzes.map((q, idx) => (
              <option key={`live-opt-${q.id || q.code || idx}`} value={q.id || q.code}>
                {q.code ? `[${q.code}]` : `[QUIZ-${idx + 1}]`} {q.title || q.subject || 'MCQ Assessment'} ({q.classGroup || 'Class'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono font-bold shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span>Duration: <strong className="text-slate-900">{currentQuiz?.durationMinutes || 60} min</strong></span>
          <span className="text-slate-300">|</span>
          <span>Questions: <strong className="text-slate-900">{currentQuiz?.totalQuestions || 40}</strong></span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1">
            Status: <span className="text-emerald-700 font-extrabold uppercase bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">ACTIVE</span>
          </span>
        </div>
      </div>

      {/* 3. FOUR METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Started / Connected */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Started</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-serif font-black text-slate-900">{totalStarted}</div>
          <div className="text-xs text-slate-400 font-medium">Students enrolled / taking</div>
        </div>

        {/* Currently Active (Live Exam Takers) */}
        <div className="bg-white rounded-3xl p-5 border-2 border-emerald-500/40 bg-emerald-50/20 shadow-xs space-y-1 hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">Currently Active</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="text-3xl font-serif font-black text-emerald-600 flex items-center gap-2">
            <span>{currentlyActive}</span>
            <span className="text-xs font-sans font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
              Live Taking Now
            </span>
          </div>
          <div className="text-xs text-emerald-700/80 font-medium">In-progress countdowns</div>
        </div>

        {/* Completed & Submitted */}
        {/* Completed & Submitted (Safely stored in Results Dashboard) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">Completed & Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-serif font-black text-indigo-700">{completedCount}</div>
            <div className="text-xs text-slate-400 font-medium">Results stored in Results Dashboard</div>
          </div>
          {onNavigateToResults && completedCount > 0 && (
            <button
              onClick={() => onNavigateToResults(selectedQuizId !== 'all' ? selectedQuizId : undefined)}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer self-start"
            >
              <span>View Results Dashboard</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>

        {/* Total Flagged Tab Switches */}
        <div className="bg-white rounded-3xl p-5 border-2 border-amber-500/40 bg-amber-50/20 shadow-xs space-y-1 hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold">Total Flagged Tab Toggles</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-serif font-black text-amber-600 flex items-center gap-2">
            <span>{totalIntegrityWarnings}</span>
            {totalIntegrityWarnings > 0 && (
              <span className="text-xs font-sans font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full border border-rose-300">
                Attached to Report
              </span>
            )}
          </div>
          <div className="text-xs text-amber-700/80 font-medium">Tab-switches logged</div>
        </div>
      </div>

      {/* 4. SEARCH & STATUS FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search active student name, ID, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Filter Pills: Only active live takers */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Active Takers ({mergedRecords.length})
          </button>
          <button
            onClick={() => setStatusFilter('live')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Taking Now ({currentlyActive})</span>
          </button>
          <button
            onClick={() => setStatusFilter('flagged')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'flagged'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Flagged ({flaggedCandidatesCount})</span>
          </button>

          {completedCount > 0 && onNavigateToResults && (
            <button
              onClick={() => onNavigateToResults(selectedQuizId !== 'all' ? selectedQuizId : undefined)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 ml-2"
              title="View all submitted candidate results"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{completedCount} Submitted &rarr; Results</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. LIVE TAKERS & SUBMISSIONS SURVEILLANCE TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>Live Student Monitoring Feed ({filteredRecords.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Real-time stream active (Updated: {lastRefreshedAt})</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">STUDENT NAME</th>
                <th className="py-3.5 px-4">ID / CLASS</th>
                <th className="py-3.5 px-4">EXAM STATUS</th>
                <th className="py-3.5 px-4">REMAINING COUNTDOWN</th>
                <th className="py-3.5 px-4">PROGRESS / SCORE</th>
                <th className="py-3.5 px-4">FLAGGED TAB TOGGLES</th>
                <th className="py-3.5 px-4">INTEGRITY AUDIT</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r, idx) => {
                const isLive = r.status === 'in_progress';
                const isSubmitted = r.status === 'submitted';
                const tabCount = r.tabSwitchesCount || 0;

                // Color based on countdown
                const remainingSecs = r.remainingSeconds;
                let countdownColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                if (remainingSecs <= 180) {
                  countdownColor = 'text-rose-700 bg-rose-50 border-rose-300 animate-pulse';
                } else if (remainingSecs <= 600) {
                  countdownColor = 'text-amber-800 bg-amber-50 border-amber-300';
                }

                return (
                  <tr key={`mon-row-${r.id || idx}`} className={`transition-colors ${isLive ? 'bg-emerald-50/25 hover:bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                    {/* Student Name */}
                    <td className="py-4 px-4 font-bold text-slate-900 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isLive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {r.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{r.studentName}</div>
                          {r.studentEmail && (
                            <div className="text-[10px] text-slate-400 font-normal">{r.studentEmail}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ID / Class */}
                    <td className="py-4 px-4 font-mono font-medium text-slate-600">
                      <div className="font-bold text-slate-800">{r.studentId}</div>
                      <div className="text-[10px] text-slate-400">{r.classGroup || 'Candidate'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {isLive ? (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>LIVE TAKING EXAM</span>
                        </span>
                      ) : isSubmitted ? (
                        <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                          <span>SUBMITTED</span>
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          EXPIRED
                        </span>
                      )}
                    </td>

                    {/* Remaining Countdown */}
                    <td className="py-4 px-4 font-mono">
                      {isLive ? (
                        <div className={`px-2.5 py-1 rounded-lg border font-bold text-xs inline-flex items-center gap-1.5 ${countdownColor}`}>
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatCountdown(remainingSecs)} left</span>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs font-sans">
                          {r.submittedAt ? `Finished (${r.durationMinutes}m)` : 'Completed'}
                        </div>
                      )}
                    </td>

                    {/* Progress / Score */}
                    <td className="py-4 px-4">
                      {isLive ? (
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 text-xs">
                            {r.questionsAnsweredCount} / {r.totalQuestions} Answered
                          </div>
                          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((r.questionsAnsweredCount / (r.totalQuestions || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {r.score !== undefined ? `${r.score} / ${r.maxScore}` : '—'}
                          {r.percentage !== undefined && (
                            <span className="text-slate-500 font-sans ml-1">({r.percentage}%)</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Flagged Tab Toggles */}
                    <td className="py-4 px-4">
                      {tabCount === 0 ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          0 Clean
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-950 border-2 border-rose-400 px-2.5 py-1 rounded-lg font-black text-[11px] inline-flex items-center gap-1.5 shadow-xs animate-shake">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{tabCount} Flagged {tabCount === 1 ? 'Switch' : 'Switches'}</span>
                        </span>
                      )}
                    </td>

                    {/* Integrity Audit */}
                    <td className="py-4 px-4 text-[11px]">
                      {tabCount > 0 ? (
                        <button
                          onClick={() => setSelectedIntegrityStudent({
                            studentName: r.studentName,
                            studentId: r.studentId,
                            classGroup: r.classGroup,
                            tabSwitchesCount: r.tabSwitchesCount,
                            windowExitsCount: r.windowExitsCount,
                            status: r.status,
                            lastHeartbeat: r.lastHeartbeat,
                            remainingSeconds: r.remainingSeconds,
                            quizTitle: r.quizTitle,
                          })}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                        >
                          <FileWarning className="w-3 h-3 text-rose-600" />
                          <span>View Report Record</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">Clean session</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Live Warn Student Action */}
                        <button
                          onClick={() => {
                            setWarningTargetStudent({
                              studentName: r.studentName,
                              studentId: r.studentId,
                              quizId: r.quizId,
                              tabSwitchesCount: r.tabSwitchesCount || 0,
                            });
                          }}
                          title="Transmit Live Proctor Warning to Student"
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                            tabCount > 0
                              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-xs animate-pulse'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Warn</span>
                        </button>

                        {r.rawSubmission && onOpenEmailFeedback && (
                          <button
                            onClick={() => onOpenEmailFeedback(r.rawSubmission!)}
                            title="Send Feedback Email"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedIntegrityStudent({
                            studentName: r.studentName,
                            studentId: r.studentId,
                            classGroup: r.classGroup,
                            tabSwitchesCount: r.tabSwitchesCount,
                            windowExitsCount: r.windowExitsCount,
                            status: r.status,
                            lastHeartbeat: r.lastHeartbeat,
                            remainingSeconds: r.remainingSeconds,
                            quizTitle: r.quizTitle,
                          })}
                          title="Inspect Student Live State"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete single student record from monitoring log */}
                        <button
                          onClick={() => {
                            setStudentToDelete({
                              id: r.id,
                              studentName: r.studentName,
                              studentId: r.studentId,
                              classGroup: r.classGroup,
                              quizTitle: r.quizTitle,
                              quizId: r.quizId,
                              isLive,
                              status: r.status,
                              tabSwitchesCount: r.tabSwitchesCount,
                            });
                          }}
                          title={`Delete ${r.studentName} from monitoring log`}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden xl:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    <div className="max-w-md mx-auto space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No active students currently taking this quiz</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        This surveillance feed only monitors candidates actively in progress. Once students submit, their records automatically move to the Results Dashboard.
                      </p>
                      {completedCount > 0 && onNavigateToResults && (
                        <div className="pt-2">
                          <button
                            onClick={() => onNavigateToResults(selectedQuizId !== 'all' ? selectedQuizId : undefined)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>View {completedCount} Submitted Result{completedCount !== 1 ? 's' : ''} in Results & Analytics</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. INTEGRITY AUDIT MODAL (Detailed Flagged Report to Teacher) */}
      {selectedIntegrityStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Student Academic Integrity Record</h3>
                  <p className="text-[11px] text-slate-400">Attached to Teacher Final Evaluation</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIntegrityStudent(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Candidate Info Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Candidate Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedIntegrityStudent.studentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Student ID / Class:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedIntegrityStudent.studentId} ({selectedIntegrityStudent.classGroup || 'General'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Assessment Title:</span>
                  <span className="font-bold text-indigo-700">{selectedIntegrityStudent.quizTitle || 'Assessment'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className={`font-bold uppercase px-2 py-0.5 rounded-full text-[10px] ${
                    selectedIntegrityStudent.status === 'in_progress' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {selectedIntegrityStudent.status === 'in_progress' ? '🟢 Live in-progress' : '✅ Submitted'}
                  </span>
                </div>
              </div>

              {/* Flagged Summary Alert */}
              <div className={`p-4 rounded-2xl border ${
                selectedIntegrityStudent.tabSwitchesCount > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              } space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {selectedIntegrityStudent.tabSwitchesCount > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{selectedIntegrityStudent.tabSwitchesCount} Flagged Tab Switches Logged</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>0 Flagged Incidents (Clean Session)</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {selectedIntegrityStudent.tabSwitchesCount > 0
                    ? 'The student navigated away from the exam tab during active test-taking. This count is permanently attached to the student’s final performance report to the teacher.'
                    : 'The student remained focused within the exam environment throughout their assessment session.'}
                </p>
              </div>

              {/* Attached Report Guidance */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1 font-medium">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <FileWarning className="w-3.5 h-3.5 text-amber-700" />
                  <span>Teacher Action Protocol:</span>
                </div>
                <p>
                  This integrity metric is synchronized to your gradebook and exported with Google Sheets / Excel report syncs.
                </p>
              </div>
            </div>

            {/* Footer with Warn, Delete, and Close Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const student = selectedIntegrityStudent;
                    setSelectedIntegrityStudent(null);
                    setWarningTargetStudent({
                      studentName: student.studentName,
                      studentId: student.studentId,
                      tabSwitchesCount: student.tabSwitchesCount,
                    });
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Issue Direct Warning</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const student = selectedIntegrityStudent;
                    setSelectedIntegrityStudent(null);
                    setStudentToDelete({
                      id: student.studentId,
                      studentName: student.studentName,
                      studentId: student.studentId,
                      classGroup: student.classGroup,
                      quizTitle: student.quizTitle,
                      isLive: student.status === 'in_progress',
                      status: student.status,
                      tabSwitchesCount: student.tabSwitchesCount,
                    });
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete from Log</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIntegrityStudent(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TEACHER TO STUDENT DIRECT PROCTOR WARNING MODAL */}
      {warningTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-rose-500 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-900 via-red-800 to-rose-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-amber-300 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-rose-200">
                    Live Proctor Intervention
                  </div>
                  <h3 className="text-base font-bold text-white font-serif">
                    Transmit Warning to Student
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setWarningTargetStudent(null);
                  setCustomWarningText('');
                }}
                className="p-1.5 text-rose-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Target Candidate Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{warningTargetStudent.studentName}</div>
                  <div className="font-mono text-[11px] text-slate-500">ID: {warningTargetStudent.studentId}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    warningTargetStudent.tabSwitchesCount > 0
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {warningTargetStudent.tabSwitchesCount} {warningTargetStudent.tabSwitchesCount === 1 ? 'Tab Switch' : 'Tab Switches'}
                  </span>
                </div>
              </div>

              {/* Quick Warning Templates */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Choose Warning Template (1-Click):</span>
                </label>
                <div className="space-y-1.5">
                  {[
                    '⚠️ Proctor Warning: Stop switching tabs immediately. Your activity is being monitored live.',
                    '⚠️ Strict Notice: Further window switches will deduct time or automatically submit your exam.',
                    '⚠️ Final Warning: Cease navigating away from the assessment or your session will be terminated now.',
                  ].map((tpl, i) => (
                    <button
                      key={`tpl-${i}`}
                      type="button"
                      onClick={() => setCustomWarningText(tpl)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/50 text-slate-700 text-[11px] font-medium transition-all cursor-pointer leading-snug"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Warning Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Custom Warning Message:
                </label>
                <textarea
                  rows={3}
                  value={customWarningText}
                  onChange={(e) => setCustomWarningText(e.target.value)}
                  placeholder="Type a direct instruction or warning message to appear instantly on the student's screen..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 leading-relaxed font-medium">
                ⚡ <strong>Instant Delivery:</strong> This warning immediately interrupts the student's exam screen with a prominent compliance requirement modal.
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setWarningTargetStudent(null);
                  setCustomWarningText('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customWarningText.trim() || isSendingWarning}
                onClick={() => handleSendProctorWarning(warningTargetStudent, customWarningText)}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {isSendingWarning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Warning...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Live Warning</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Generic Broadcast to All Students Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                    <span>Live Broadcast Announcement</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                      All Students
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Transmits an instant generic pop-up message to every active candidate
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Quick Broadcast Presets */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Choose Announcement Preset (1-Click):</span>
                </label>
                <div className="space-y-1.5">
                  {[
                    '📢 General Notice: 15 minutes remaining before automatic submission. Please review your answers.',
                    '📢 General Notice: 5 minutes remaining! Ensure all flagged questions are reviewed.',
                    '📢 Invigilator Directive: Maintain complete silence and keep your device screen active. Tab switching is recorded.',
                    '📢 Clarification Notice: Question clarifications have been noted. Please continue your assessment as directed.',
                  ].map((tpl, i) => (
                    <button
                      key={`bcast-tpl-${i}`}
                      type="button"
                      onClick={() => setBroadcastMessageText(tpl)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/50 text-slate-700 text-[11px] font-medium transition-all cursor-pointer leading-snug"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Broadcast Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Custom Broadcast Message to All Candidates:
                </label>
                <textarea
                  rows={3}
                  value={broadcastMessageText}
                  onChange={(e) => setBroadcastMessageText(e.target.value)}
                  placeholder="Type an announcement or instruction to display on all candidates' exam screens..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 leading-relaxed font-medium">
                📢 <strong>Universal Broadcast:</strong> This announcement will appear on the screens of all students taking the current assessment across all devices in real-time.
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsBroadcastModalOpen(false);
                  setBroadcastMessageText('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!broadcastMessageText.trim() || isSendingBroadcast}
                onClick={() => handleSendBroadcast(broadcastMessageText)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {isSendingBroadcast ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting to Class...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Transmit Broadcast Announcement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Student Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-rose-400 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-white">Delete Student from Log</h3>
                  <p className="text-[11px] text-rose-200">Remove candidate surveillance & records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-rose-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              {/* Candidate Info Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{studentToDelete.studentName}</div>
                    <div className="text-[11px] font-mono text-slate-500">ID: {studentToDelete.studentId}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    studentToDelete.status === 'in_progress' || studentToDelete.isLive
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {studentToDelete.status === 'in_progress' || studentToDelete.isLive ? 'Live In-Progress' : 'Submitted'}
                  </span>
                </div>

                {studentToDelete.quizTitle && (
                  <div className="text-[11px] text-slate-600 font-medium">
                    Assessment: <strong className="text-slate-900">{studentToDelete.quizTitle}</strong>
                  </div>
                )}

                {typeof studentToDelete.tabSwitchesCount === 'number' && (
                  <div className="text-[11px] text-slate-600">
                    Flagged tab switches: <strong className={studentToDelete.tabSwitchesCount > 0 ? 'text-rose-600' : 'text-emerald-700'}>{studentToDelete.tabSwitchesCount} incidents</strong>
                  </div>
                )}
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-950">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Permanent Removal Notice:</span>
                </div>
                <p className="text-[11px] text-rose-900 leading-relaxed font-medium">
                  This action will permanently delete this student's active live monitoring feed, submission log, and queued warnings from both the cloud database and sync server.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={handleConfirmDeleteStudent}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {isDeletingStudent ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing Student...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Delete Student</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Students / Monitoring Log Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-rose-400 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-white">Clear Student Monitoring Log</h3>
                  <p className="text-[11px] text-rose-200">Reset surveillance streams & candidate records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              {/* Clear Scope Radio Options */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>Select What to Clear:</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setClearScope('active_only')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      clearScope === 'active_only'
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearScope === 'active_only'}
                      onChange={() => setClearScope('active_only')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Clear Active Live Streams Only</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Disconnects stale candidate streams and resets real-time surveillance feeds. Submitted exam results remain preserved.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClearScope('all_records')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      clearScope === 'all_records'
                        ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearScope === 'all_records'}
                      onChange={() => setClearScope('all_records')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Clear All Monitoring & Submitted Records</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Purges both active live streams and completed student submission logs from the monitoring table and cloud database.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Filter Scope Toggle (if specific quiz selected) */}
              {selectedQuizId !== 'all' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearTargetQuizOnly}
                      onChange={(e) => setClearTargetQuizOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Clear only for selected quiz: <strong className="text-slate-900">{currentQuiz?.title || 'Selected Quiz'}</strong>
                    </span>
                  </label>
                </div>
              )}

              {/* Summary Stats Badge */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-950">
                <div className="font-bold flex items-center gap-1.5 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Action Summary:</span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] font-medium text-rose-900">
                  <div>• Active live streams to reset: <strong>{liveSessions.length} students</strong></div>
                  {clearScope === 'all_records' && (
                    <div>• Submission records to purge: <strong>{submissions.length} students</strong></div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingLiveData}
                onClick={handleConfirmClearMonitoringLog}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {isClearingLiveData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Records...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{clearScope === 'all_records' ? 'Confirm & Clear All Records' : 'Confirm & Reset Streams'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {actionFeedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-900 border-2 border-emerald-400'
              : 'bg-rose-900 border-2 border-rose-400'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/30 text-rose-300'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div className="text-xs font-bold">{actionFeedback.message}</div>
        </div>
      )}

      {/* Floating Proctor Warning Success Toast */}
      {warningSuccessMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white border-2 border-emerald-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold">{warningSuccessMessage}</div>
        </div>
      )}
    </div>
  );
};
