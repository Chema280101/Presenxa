import type { MutableRefObject } from "react";

export type KioskSoundType = "CELEBRATION" | "SUCCESS" | "WARNING" | "ERROR";

interface TonePreset {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  endFreqDelay: number;
  gain: number;
  duration: number;
}

const TONE_PRESETS: Record<Exclude<KioskSoundType, "CELEBRATION">, TonePreset> = {
  SUCCESS: {
    type: "sine",
    startFreq: 587.33,
    endFreq: 880,
    endFreqDelay: 0.12,
    gain: 0.3,
    duration: 0.6,
  },
  WARNING: {
    type: "triangle",
    startFreq: 440,
    endFreq: 370,
    endFreqDelay: 0.15,
    gain: 0.3,
    duration: 0.5,
  },
  ERROR: {
    type: "sawtooth",
    startFreq: 164.81,
    endFreq: 130.81,
    endFreqDelay: 0.18,
    gain: 0.4,
    duration: 0.6,
  },
};

function getOrCreateAudioContext(
  audioCtxRef: MutableRefObject<AudioContext | null>
): AudioContext {
  if (!audioCtxRef.current) {
    const AudioCtx =
      globalThis.AudioContext ||
      (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtxRef.current = new AudioCtx();
  }
  const ctx = audioCtxRef.current;
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

function playCelebrationFanfare(ctx: AudioContext): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    const startTime = ctx.currentTime + index * 0.1;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
}

/**
 * Plays synthesized kiosk audio feedback using Web Audio API.
 */
export function playKioskSound(
  audioCtxRef: MutableRefObject<AudioContext | null>,
  soundEnabled: boolean,
  type: KioskSoundType
): void {
  if (!soundEnabled) return;
  try {
    const ctx = getOrCreateAudioContext(audioCtxRef);

    if (type === "CELEBRATION") {
      playCelebrationFanfare(ctx);
      return;
    }

    const preset = TONE_PRESETS[type];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = preset.type;
    osc.frequency.setValueAtTime(preset.startFreq, ctx.currentTime);
    osc.frequency.setValueAtTime(preset.endFreq, ctx.currentTime + preset.endFreqDelay);
    gain.gain.setValueAtTime(preset.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + preset.duration);
    osc.start();
    osc.stop(ctx.currentTime + preset.duration);
  } catch (e) {
    console.warn("Audio playback not allowed yet:", e);
  }
}

/**
 * Speaks a short Spanish greeting via the Web Speech API when sound is enabled.
 */
export function speakKioskGreeting(soundEnabled: boolean, text: string): void {
  if (!soundEnabled || typeof globalThis === "undefined" || !("speechSynthesis" in globalThis)) {
    return;
  }
  try {
    globalThis.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    utterance.pitch = 1;
    globalThis.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
  }
}
