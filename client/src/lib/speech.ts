/**
 * Speech Synthesis (Fake Call Conversation) and Speech Recognition (Voice SOS)
 */

export interface ScriptLine {
  line: string;
  pauseSeconds: number;
}

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
    onComplete: () => void
  ): Promise<void> {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      onComplete();
      return;
    }

    this.cancelled = false;
    this.isSpeaking = true;
    window.speechSynthesis.cancel();

    // Prefer an Indian English or British voice for natural sound
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang === 'en-IN') ||
      voices.find((v) => v.lang === 'hi-IN') ||
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    for (let i = 0; i < lines.length; i++) {
      if (this.cancelled) break;

      const item = lines[i];
      onLineStart(i, item.line);

      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(item.line);
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      });

      if (this.cancelled) break;

      // Natural pause between turns
      const pauseMs = (item.pauseSeconds || 3) * 1000;
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
  speakScript: (lines: ScriptLine[], onTurn?: (turnIdx: number) => void, onDone?: () => void) => {
    return fakeCallSpeaker.speakScript(lines, (idx, _text) => onTurn?.(idx), () => onDone?.());
  },
  stop: () => fakeCallSpeaker.cancel(),
};

