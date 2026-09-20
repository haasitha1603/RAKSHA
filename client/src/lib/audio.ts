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
        gain.gain.linearRampToValueAtTime(0, (this.ctx?.currentTime || 0) + 0.05);
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
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    };

    playTrill();
    this.loopInterval = window.setInterval(playTrill, 2800);
  }

  /**
   * Digital Melody: Marimba-like pentatonic arpeggio looped
   */
  public playDigitalMelody(): void {
    this.stopAll();
    const ctx = this.getContext();

    // Notes: C5 (523), E5 (659), G5 (784), B5 (988), C6 (1046)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];

    const playCycle = () => {
      const start = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const noteStart = start + idx * 0.12;
        const noteEnd = noteStart + 0.22;

        gain.gain.setValueAtTime(0.3, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteEnd);
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200]);
      }
    };

    playCycle();
    this.loopInterval = window.setInterval(playCycle, 2400);
  }

  /**
   * Ultra-High Volume Emergency SOS Alarm / Siren:
   * Dual oscillating piercing waveform (sawtooth + square) with high dynamic range (gain 0.95),
   * frequency sweeping between 650Hz and 1850Hz with an aggressive pulsing siren profile.
   */
  public playSiren(): void {
    this.stopAll();
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Master output gain node for emergency maximum volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, now);
    masterGain.connect(ctx.destination);

    // Primary piercing sawtooth oscillator
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(750, now);

    // Secondary harmonic square oscillator for maximum auditory punch and deterrent
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1100, now);

    // High frequency sweep LFO 1: 1.6 Hz sweeping 550Hz depth
    const lfo1 = ctx.createOscillator();
    const lfoGain1 = ctx.createGain();
    lfo1.type = 'sine';
    lfo1.frequency.value = 1.6;
    lfoGain1.gain.value = 550;

    // Secondary rapid warble LFO 2: adds distinct police / emergency air-horn urgency
    const lfo2 = ctx.createOscillator();
    const lfoGain2 = ctx.createGain();
    lfo2.type = 'triangle';
    lfo2.frequency.value = 4.0;
    lfoGain2.gain.value = 180;

    // Connect LFOs to oscillator pitch
    lfo1.connect(lfoGain1);
    lfoGain1.connect(osc1.frequency);
    lfoGain1.connect(osc2.frequency);

    lfo2.connect(lfoGain2);
    lfoGain2.connect(osc1.frequency);

    // Volume envelopes
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.65, now);
    osc1.connect(gain1);
    gain1.connect(masterGain);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.40, now);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    // Start all nodes
    osc1.start(now);
    osc2.start(now);
    lfo1.start(now);
    lfo2.start(now);

    this.activeNodes.push({ osc: osc1, gain: gain1 });
    this.activeNodes.push({ osc: osc2, gain: gain2 });
    this.activeNodes.push({ osc: lfo1, gain: lfoGain1 });
    this.activeNodes.push({ osc: lfo2, gain: lfoGain2 });

    // Vigorous emergency vibration cadence
    if ('vibrate' in navigator) {
      navigator.vibrate([1000, 150, 1000, 150, 1000, 150]);
      this.loopInterval = window.setInterval(() => {
        if ('vibrate' in navigator) {
          navigator.vibrate([1000, 150, 1000, 150, 1000, 150]);
        }
      }, 3600);
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
