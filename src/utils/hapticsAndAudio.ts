/**
 * Utilitaires de retour sensoriel : Haptic feedback & synthèse audio discrète
 * Permet d'ancrer physiquement la sensation de contrôle financier.
 */

class SoundEffectsManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Cliquetis organique et discret de cauris s'entrechoquant (sans fichier externe)
   */
  public playCaurisClink(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Oscillateur 1 : teinte résonnante aiguë (coquille de porcelaine)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(2150, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.12);

      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);

      // Oscillateur 2 : deuxième cauris frappé légèrement décalé (25ms)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(2850, now + 0.025);
      osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.15);

      gain2.gain.setValueAtTime(0.08, now + 0.025);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.025);
      osc2.stop(now + 0.15);
    } catch {
      // AudioContext inaccessible ou bloqué par le navigateur
    }
  }

  /**
   * Carillon chaleureux de célébration lors d'un palier ou objectif atteint
   */
  public playCelebrationChime(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // Accord majeur Do, Mi, Sol, Do
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {
      // Ignorer si audio bloqué
    }
  }
}

export const soundEffects = new SoundEffectsManager();

/**
 * Vibration haptique discrète pour le mobile
 */
export function triggerHapticFeedback(pattern: number | number[] = 20): void {
  try {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Non supporté ou non autorisé
  }
}
