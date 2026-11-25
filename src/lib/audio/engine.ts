/**
 * Revenant sound engine. Every sound is synthesized with the Web Audio API,
 * so there are no audio files and no licensing questions.
 *
 * Browsers only allow audio after a user gesture, so nothing plays until
 * `light()` is called from the "Light the Candle" click.
 */

type Listener = () => void;

const MUTE_KEY = "revenant:muted";
const MASTER_LEVEL = 0.8;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private lit = false;
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== "undefined") {
      this.muted = window.localStorage.getItem(MUTE_KEY) === "1";
    }
  }

  get isMuted() {
    return this.muted;
  }

  get isLit() {
    return this.lit;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Starts the ambience. Must be called from a user gesture. */
  async light() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.startDrone();
      this.startWind();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.lit = true;
    this.applyLevel(3);
    this.emit();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    this.applyLevel(0.4);
    this.emit();
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  /** A match strike followed by a soft "whoomp" of flame. */
  playIgnite() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;

    const strike = ctx.createBufferSource();
    strike.buffer = this.noiseBuffer(0.35);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2400;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    strike.connect(hp).connect(sg).connect(master);
    strike.start(now);

    const flame = ctx.createBufferSource();
    flame.buffer = this.noiseBuffer(1.6);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(200, now + 0.15);
    lp.frequency.exponentialRampToValueAtTime(1400, now + 0.5);
    lp.frequency.exponentialRampToValueAtTime(300, now + 1.5);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(0.0001, now + 0.15);
    fg.gain.exponentialRampToValueAtTime(0.6, now + 0.45);
    fg.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    flame.connect(lp).connect(fg).connect(master);
    flame.start(now + 0.15);
  }

  private applyLevel(seconds: number) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const target = this.muted || !this.lit ? 0 : MASTER_LEVEL;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(target, now + seconds);
  }

  /** Low, slowly beating organ-like drone. */
  private startDrone() {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    filter.connect(gain).connect(this.master!);

    for (const freq of [55, 55.35, 82.4]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
    }

    // The filter breathes very slowly.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
  }

  /** Wind through dead branches: filtered noise with a wandering band. */
  private startWind() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 420;
    band.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(band).connect(gain).connect(this.master!);
    src.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(band.frequency);
    lfo.start();

    const gust = ctx.createOscillator();
    gust.frequency.value = 0.031;
    const gustGain = ctx.createGain();
    gustGain.gain.value = 0.03;
    gust.connect(gustGain).connect(gain.gain);
    gust.start();
  }

  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Pinkish noise sounds softer and more natural than white noise.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }
}

let instance: SoundEngine | null = null;

/** One engine per page session, so sound continues across client navigation. */
export function getSoundEngine() {
  if (!instance) instance = new SoundEngine();
  return instance;
}
