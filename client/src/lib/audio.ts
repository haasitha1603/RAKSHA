/**
 * Synthesized Web Audio Engine for ringtones, sirens, and cues without audio files
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private loopInterval: number | null = null;
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  public stopAll(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    for (const { osc, gain } of this.activeNodes) {
      try {
        gain.gain.linearRampToValueAtTime(0, this.ctx?.currentTime || 0 + 0.05);
        osc.stop((this.ctx?.currentTime || 0) + 0.05);
      } catch {}
    }
    this.activeNodes = [];
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  /**
   * Classic Bell: 880Hz / 660Hz sine trills (80ms on/off x 6), 1.6s pause, looped
   */
  public playClassicBell(): void {
    this.stopAll();
    const ctx = this.getContext();

    const playTrill = () => {
      const start = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i % 2 === 0 ? 880 : 660;

        const onTime = start + i * 0.08;
        const offTime = onTime + 0.07;

        gain.gain.setValueAtTime(0, onTime);
        gain.gain.linearRampToValueAtTime(0.35, onTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, offTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(onTime);
        osc.stop(offTime);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([600, 300, 600, 300]);
      }
    };

    playTrill();
    this.loopInterval = window.setInterval(playTrill, 2100);
  }

  /**
   * Digital Melody: C5(523)-E5(659)-G5(783)-C6(1046)-G5(783)-E5(659) triangle wave, 1.2s gap
   */
  public playDigitalMelody(): void {
    this.stopAll();
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25];

    const playCycle = () => {
      const start = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const onTime = start + idx * 0.18;
        const offTime = onTime + 0.17;

        gain.gain.setValueAtTime(0, onTime);
        gain.gain.linearRampToValueAtTime(0.3, onTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, offTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(onTime);
        osc.stop(offTime);
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200]);
      }
    };

    playCycle();
    this.loopInterval = window.setInterval(playCycle, 2400);
  }

  /**
   * Loud SOS Siren: Continuous sweeping oscillator (700Hz to 1200Hz)
   */
  public playSiren(): void {
    this.stopAll();
    const ctx = this.getContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.value = 0.5;

    // Siren frequency LFO sweep
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(700, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 1.8; // 1.8 Hz sweep cycle
    lfoGain.gain.value = 350;

    lfo.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);

    this.activeNodes.push({ osc, gain });

    if ('vibrate' in navigator) {
      navigator.vibrate([800, 200, 800, 200, 800, 200]);
    }
  }

  public playConnectedTone(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  public playCallEndedTone(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 400;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }
  public startRingtone(type: 'classic' | 'digital' | 'vibrate'): () => void {
    if (type === 'digital') {
      this.playDigitalMelody();
    } else if (type === 'classic') {
      this.playClassicBell();
    } else {
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 300, 500, 300, 800]);
      }
    }
    return () => this.stopAll();
  }

  public startSiren(): () => void {
    this.playSiren();
    return () => this.stopAll();
  }

  public playTouchTone(key: string): void {
    const ctx = this.getContext();
    const dtmfFrequencies: Record<string, [number, number]> = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477],
    };

    const freqs = dtmfFrequencies[key] || [800, 1200];
    const now = ctx.currentTime;

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    });
  }
}

export const audioSynthesizer = new AudioSynthesizer();

