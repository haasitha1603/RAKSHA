/**
 * Speech Synthesis (Fake Call Conversation) and Speech Recognition (Voice SOS)
 */

export interface ScriptLine {
  line: string;
  pauseSeconds: number;
}

export const LANGUAGE_VOICE_MAP: Record<string, { code: string; fallbackTags: string[] }> = {
  'en-IN': { code: 'en-IN', fallbackTags: ['en-IN', 'en-GB', 'en-US'] },
  'hi-IN': { code: 'hi-IN', fallbackTags: ['hi-IN', 'hi', 'en-IN'] },
  'hinglish': { code: 'en-IN', fallbackTags: ['en-IN', 'hi-IN', 'en-GB'] },
  'pa-IN': { code: 'pa-IN', fallbackTags: ['pa-IN', 'pa', 'hi-IN', 'en-IN'] },
  'ta-IN': { code: 'ta-IN', fallbackTags: ['ta-IN', 'ta', 'en-IN'] },
  'te-IN': { code: 'te-IN', fallbackTags: ['te-IN', 'te', 'en-IN'] },
  'bn-IN': { code: 'bn-IN', fallbackTags: ['bn-IN', 'bn', 'hi-IN', 'en-IN'] },
  'mr-IN': { code: 'mr-IN', fallbackTags: ['mr-IN', 'mr', 'hi-IN', 'en-IN'] },
};

export class FakeCallSpeaker {
  private isSpeaking = false;
  private cancelled = false;

  public cancel(): void {
    this.cancelled = true;
    this.isSpeaking = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public async speakScript(
    lines: ScriptLine[],
    onLineStart: (lineIdx: number, text: string) => void,
    onComplete: () => void,
    language: string = 'en-IN'
  ): Promise<void> {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      onComplete();
      return;
    }

    this.cancelled = false;
    this.isSpeaking = true;
    window.speechSynthesis.cancel();

    // Select voice matching requested language with fallbacks
    const voices = window.speechSynthesis.getVoices();
    const langConfig = LANGUAGE_VOICE_MAP[language] || {
      code: language,
      fallbackTags: [language, 'en-IN', 'en-GB', 'en-US'],
    };

    let preferredVoice: SpeechSynthesisVoice | undefined;
    for (const tag of langConfig.fallbackTags) {
      const match = voices.find(
        (v) =>
          v.lang.toLowerCase() === tag.toLowerCase() ||
          v.lang.toLowerCase().replace('_', '-').startsWith(tag.toLowerCase())
      );
      if (match) {
        preferredVoice = match;
        break;
      }
    }
    if (!preferredVoice && voices.length > 0) {
      preferredVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
    }

    for (let i = 0; i < lines.length; i++) {
      if (this.cancelled) break;

      const item = lines[i];
      onLineStart(i, item.line);

      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(item.line);
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.lang = langConfig.code;
        // Human-tuned cadence: rate 0.92 for calm, natural cadence; pitch 1.02 for warm timbre
        utterance.rate = 0.92;
        utterance.pitch = 1.02;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      });

      if (this.cancelled) break;

      // Natural conversational pause between turns (allows user to respond)
      const pauseMs = (item.pauseSeconds || 3.5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }

    this.isSpeaking = false;
    if (!this.cancelled) {
      onComplete();
    }
  }
}

export class VoiceSosListener {
  private recognition: any = null;
  private isListening = false;
  private onTriggerCallback: (() => void) | null = null;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          if (transcript.includes('help help') || transcript.includes('help me')) {
            console.log('Voice SOS Triggered via keyword:', transcript);
            this.onTriggerCallback?.();
            break;
          }
        }
      };

      this.recognition.onerror = (e: any) => {
        console.warn('Voice recognition error:', e.error);
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {}
        }
      };
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public start(onTrigger: () => void): void {
    if (!this.recognition) return;
    this.onTriggerCallback = onTrigger;
    this.isListening = true;
    try {
      this.recognition.start();
    } catch {}
  }

  public stop(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }
}

export const fakeCallSpeaker = new FakeCallSpeaker();
export const voiceSosListener = new VoiceSosListener();

export const speechEngine = {
  speakScript: (
    lines: ScriptLine[],
    onTurn?: (turnIdx: number) => void,
    onDone?: () => void,
    language: string = 'en-IN'
  ) => {
    return fakeCallSpeaker.speakScript(lines, (idx, _text) => onTurn?.(idx), () => onDone?.(), language);
  },
  stop: () => fakeCallSpeaker.cancel(),
};

