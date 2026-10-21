/**
 * Web Audio API synthesizer for Examination Countdown Beeps and Warning Alerts.
 * Generates clear, non-intrusive synthesized audio beeps for 10-second exam countdowns,
 * 1-minute final warnings, and auto-submission completion chimes.
 */

let sharedAudioCtx: AudioContext | null = null;
let isMutedState = false;

/**
 * Initializes or resumes the AudioContext on user interaction.
 */
export function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn('Web Audio Context initialization warning:', err);
    return null;
  }
}

/**
 * Returns whether audio countdown beeps are currently muted.
 */
export function getIsCountdownMuted(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mcq_exam_audio_muted');
    if (saved !== null) {
      isMutedState = saved === 'true';
    }
  }
  return isMutedState;
}

/**
 * Sets audio mute state.
 */
export function setIsCountdownMuted(muted: boolean) {
  isMutedState = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mcq_exam_audio_muted', muted ? 'true' : 'false');
  }
}

/**
 * Plays an audible countdown beep for the final 10 seconds before auto-submission.
 * - Remaining 10 to 4 seconds: Crisp standard ping (880 Hz - A5)
 * - Remaining 3 to 1 seconds: Urgent double/high-pitch beep (1046.5 Hz - C6 / 1318.5 Hz - E6)
 * - 0 seconds: Melodic three-tone auto-submission confirmation chime
 */
export function playCountdownBeep(remainingSeconds: number, overrideMuted?: boolean) {
  const isMuted = overrideMuted !== undefined ? overrideMuted : getIsCountdownMuted();
  if (isMuted) return;

  const ctx = initAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (remainingSeconds === 0) {
      // Auto-Submission Final Triad Chime (C5 -> G5 -> C6)
      const notes = [523.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = now + idx * 0.12;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } else if (remainingSeconds <= 3) {
      // Urgent high-pitch double beep for final 3 seconds
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1174.66, now); // D6
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.start(now);
      osc1.stop(now + 0.14);

      // Second micro-pulse 70ms later
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.07); // E6
      gain2.gain.setValueAtTime(0.3, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      osc2.start(now + 0.07);
      osc2.stop(now + 0.22);
    } else {
      // Standard countdown pulse (10, 9, 8, 7, 6, 5, 4 seconds)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.start(now);
      osc.stop(now + 0.16);
    }
  } catch (err) {
    console.warn('Error playing countdown beep:', err);
  }
}

/**
 * Plays a subtle warning sound when entering the final minute (< 60 seconds).
 */
export function playOneMinuteWarningSound(overrideMuted?: boolean) {
  const isMuted = overrideMuted !== undefined ? overrideMuted : getIsCountdownMuted();
  if (isMuted) return;

  const ctx = initAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [659.25, 587.33, 659.25]; // E5, D5, E5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = now + idx * 0.14;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (err) {
    console.warn('Error playing 1-minute warning sound:', err);
  }
}

/**
 * Plays a discrete two-tone forfeit warning sound when a question is auto-skipped or time expires.
 */
export function playForfeitWarningSound(overrideMuted?: boolean) {
  const isMuted = overrideMuted !== undefined ? overrideMuted : getIsCountdownMuted();
  if (isMuted) return;

  const ctx = initAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.debug('Forfeit warning sound omitted:', err);
  }
}

