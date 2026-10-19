/**
 * Siri Voice Guidance Service for Apple Maps
 * Uses native browser Web Speech API (SpeechSynthesis)
 */

class SiriVoiceService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isMuted = false;
    this.selectedVoice = null;
    this.lastSpokenText = '';
    this.initVoice();
  }

  initVoice() {
    if (!this.synth) return;
    const updateVoices = () => {
      const voices = this.synth.getVoices();
      // Try to find a high quality English voice (Samantha, Daniel, Karen, or default)
      this.selectedVoice =
        voices.find(v => v.name.includes('Samantha') || v.name.includes('Siri') || v.name.includes('Natural')) ||
        voices.find(v => v.lang.startsWith('en') && v.localService) ||
        voices[0] ||
        null;
    };

    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  speak(text, priority = false) {
    if (!this.synth || this.isMuted || !text) return;
    if (this.lastSpokenText === text && !priority) return;

    if (priority) {
      this.synth.cancel();
    }

    this.lastSpokenText = text;
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.05; // Natural Siri conversational speed
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const siriVoice = new SiriVoiceService();
