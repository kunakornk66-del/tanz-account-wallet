/**
 * Cute & Subtle Web Audio API Sound Synthesizer for Kuma Wallet
 * Pure synthesizer - No external MP3/WAV assets required.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // Load sound preference from localStorage (defaults to true)
    const stored = localStorage.getItem('kuma_sound_enabled');
    this.isEnabled = stored === null ? true : stored === 'true';
  }

  // Ensure AudioContext is initialized on user interaction
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public getSoundEnabled(): boolean {
    return this.isEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('kuma_sound_enabled', enabled ? 'true' : 'false');
  }

  public toggleSound(): boolean {
    const next = !this.isEnabled;
    this.setSoundEnabled(next);
    if (next) {
      this.playHappy();
    }
    return next;
  }

  /**
   * 1. 🌟 Celebrate / Savings Success / Big Milestone Sound
   * Ascending sweet celesta / music-box arpeggio (C5 -> E5 -> G5 -> C6 -> E6)
   */
  public playCelebrate() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      const now = ctx.currentTime;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Warm sine-triangle blend
        osc.type = index === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        // Soft envelope
        gain.gain.setValueAtTime(0.001, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.36);
      });
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  /**
   * 2. 💖 Happy / Income Added / Savings Deposit / Mascot Hug
   * Cheerful 2-tone chime (G5 -> C6)
   */
  public playHappy() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [783.99, 1046.50]; // G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  /**
   * 3. 🕶️ Proud / Good Habit Fanfare
   * Cozy 3-step harmony (E5 -> G#5 -> B5 -> E6)
   */
  public playProud() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 830.61, 987.77, 1318.51];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.33);
      });
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  /**
   * 4. 🚨 Shocked / High-Expense Warning / Over-Budget Alert
   * Subtle, gentle cautionary cartoon "boop-boop" tone.
   * Playful, cute and soft with a low-pass filter (never harsh or piercing).
   */
  public playWarning() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // First boop (G4 -> F4 slide)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter1 = ctx.createBiquadFilter();

      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(900, now);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(392, now); // G4
      osc1.frequency.exponentialRampToValueAtTime(330, now + 0.14); // E4

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.13, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.17);

      // Second gentle boop (D4 -> C4 slide)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();

      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(800, now + 0.18);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(293.66, now + 0.18); // D4
      osc2.frequency.exponentialRampToValueAtTime(246.94, now + 0.34); // B3

      gain2.gain.setValueAtTime(0.001, now + 0.18);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.20);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.18);
      osc2.stop(now + 0.37);
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  /**
   * 5. 🐾 Mascot Petting / Tap Sound
   * Soft cute squeak pop (450Hz -> 880Hz)
   */
  public playTap() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }
}

export const soundFx = new SoundEffectsManager();
