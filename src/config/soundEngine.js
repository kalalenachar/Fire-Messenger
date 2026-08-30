// Agni Messenger Web Audio Sound Effects Synthesizer
// Provides crystal-clear audio feedback with zero external MP3 assets.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isEnabled = true;
    try {
      const saved = localStorage.getItem("fire_sound_effects_enabled");
      if (saved !== null) {
        this.isEnabled = saved === "true";
      }
    } catch (e) {}
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleSound(enabled) {
    this.isEnabled = typeof enabled === "boolean" ? enabled : !this.isEnabled;
    try {
      localStorage.setItem("fire_sound_effects_enabled", String(this.isEnabled));
    } catch (e) {}
    return this.isEnabled;
  }

  // Sent message pop sound (crisp, subtle rising pop)
  playMessageSent() {
    if (!this.isEnabled) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Incoming message chime (pleasant two-tone chime)
  playMessageReceived() {
    if (!this.isEnabled) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;

      const now = this.ctx.currentTime;

      // Note 1 (E5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2 (B5)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.14, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    } catch (e) {}
  }

  // Tactile reaction blip
  playReactionSound() {
    if (!this.isEnabled) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  // Notification alert
  playNotificationChime() {
    if (!this.isEnabled) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;

      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.06);
        gain.gain.setValueAtTime(0.09, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.22);
      });
    } catch (e) {}
  }

  // Call Ringtone Loop
  startCallRingtone() {
    if (!this.isEnabled || this.ringtoneInterval) return;
    this.playNotificationChime();
    this.ringtoneInterval = setInterval(() => {
      this.playNotificationChime();
    }, 2800);
  }

  playCallRingtone() {
    this.startCallRingtone();
  }

  stopCallRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Call Connected Chime
  playCallConnected() {
    if (!this.isEnabled) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // Call Ended Tone
  playCallEnded() {
    if (!this.isEnabled) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {}
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
