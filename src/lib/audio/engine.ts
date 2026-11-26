/**
 * Revenant sound engine. Every sound is synthesized with the Web Audio API,
 * so there are no audio files and no licensing questions.
 *
 * Browsers only allow audio after a user gesture. `unlock()` must be called
 * from inside one (AudioControls wires it to the first click/tap/key anywhere).
 *
 * Signal flow:
 *
 *   ambience ─┐
 *   sfx ──────┼─► master (mute) ─► limiter ─► speakers
 *   reverb ───┘        ▲
 *   (sends) ───────────┘  every voice also feeds a dark outdoor reverb
 */

type Listener = () => void;

// v2: the old toggle showed "muted" before sound had started, so people who
// clicked it to turn sound ON actually saved "muted". Start everyone fresh.
const MUTE_KEY = "revenant:muted:v2";
const MASTER_LEVEL = 0.9;
const AMBIENCE_LEVEL = 0.85;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private sfx: GainNode | null = null;
  private reverb: GainNode | null = null;
  private noise: { white: AudioBuffer; pink: AudioBuffer; brown: AudioBuffer } | null = null;
  private muted = false;
  private started = false;
  private timers = new Set<number>();
  private listeners = new Set<Listener>();
  private lastHover = 0;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.muted = window.localStorage.getItem(MUTE_KEY) === "1";
      } catch {
        /* storage blocked: default to sound on */
      }
    }
  }

  get isMuted() {
    return this.muted;
  }

  /** True once the audio context is running (i.e. after the first gesture). */
  get isStarted() {
    return this.started;
  }

  get isAudible() {
    return this.started && !this.muted;
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

  /**
   * Creates and resumes the audio context and starts the ambience.
   * Synchronous on purpose: Safari only honours resume() inside the gesture.
   */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.buildGraph(ctx);
      ctx.addEventListener("statechange", () => {
        const running = ctx.state === "running";
        if (running && !this.started) {
          this.started = true;
          this.startAmbience();
        }
        this.emit();
      });
      document.addEventListener("visibilitychange", () => {
        // Don't keep a storm running in a background tab.
        if (document.hidden) void ctx.suspend();
        else if (this.started) void ctx.resume();
      });
    }
    if (this.ctx.state !== "running") void this.ctx.resume();
    if (this.ctx.state === "running" && !this.started) {
      this.started = true;
      this.startAmbience();
      this.emit();
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.12);
    }
    this.emit();
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  /* ------------------------------------------------------------------ */
  /*  Graph                                                              */
  /* ------------------------------------------------------------------ */

  private buildGraph(ctx: AudioContext) {
    // A gentle limiter so a close thunderclap never clips.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
    this.master.connect(limiter);

    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0;
    this.ambience.connect(this.master);

    // SFX are at full level immediately: the old engine faded the master in
    // from silence, which is why the match strike was never heard.
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.master);

    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulseResponse(ctx, 3.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb = ctx.createGain();
    this.reverb.connect(convolver).connect(wet).connect(this.master);

    this.noise = {
      white: this.noiseBuffer(ctx, "white", 6),
      pink: this.noiseBuffer(ctx, "pink", 6),
      brown: this.noiseBuffer(ctx, "brown", 8),
    };
  }

  /** Dark, diffuse decay: an open graveyard rather than a church. */
  private impulseResponse(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        // Darker as it decays: high frequencies die first outdoors.
        const smooth = 0.5 - 0.4 * k;
        lp += smooth * (Math.random() * 2 - 1 - lp);
        const predelay = i < ctx.sampleRate * 0.02 ? 0 : 1;
        data[i] = lp * Math.pow(1 - k, 3.2) * predelay;
      }
    }
    return ir;
  }

  private noiseBuffer(ctx: AudioContext, color: "white" | "pink" | "brown", seconds: number) {
    const fade = Math.floor(ctx.sampleRate * 0.25);
    const total = Math.floor(ctx.sampleRate * seconds) + fade;
    const raw = new Float32Array(total);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < total; i++) {
      const w = Math.random() * 2 - 1;
      if (color === "white") raw[i] = w;
      else if (color === "pink") {
        // Paul Kellet's economy pink filter.
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        raw[i] = b0 + b1 + b2 + w * 0.1848;
      } else {
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last;
      }
    }
    // Crossfade the tail into the head so the buffer loops without a click.
    const len = total - fade;
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      raw[i] = raw[i]! * k + raw[len + i]! * (1 - k);
    }
    // Normalize so every colour has the same peak level.
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(raw[i]!));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const scale = 0.95 / (peak || 1);
    for (let i = 0; i < len; i++) data[i] = raw[i]! * scale;
    return buffer;
  }

  private source(buffer: AudioBuffer, loop = false) {
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    return src;
  }

  /** Start a one-shot noise source at a random point in the buffer. */
  private startNoise(src: AudioBufferSourceNode, at: number, duration: number) {
    const max = Math.max(0, src.buffer!.duration - duration - 0.05);
    src.start(at, Math.random() * max);
    src.stop(at + duration + 0.05);
  }

  private later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  /* ------------------------------------------------------------------ */
  /*  Ambience                                                           */
  /* ------------------------------------------------------------------ */

  private startAmbience() {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    this.ambience!.gain.setValueAtTime(0, now);
    this.ambience!.gain.linearRampToValueAtTime(AMBIENCE_LEVEL, now + 4);
    this.startWind();
    this.startUndertone();
    this.scheduleCreak();
  }

  /** Two wind layers driven by one gust: a low roar and a thin, eerie howl. */
  private startWind() {
    const ctx = this.ctx!;
    const noise = this.noise!;

    // Roar: brown noise, lowpassed.
    const roar = this.source(noise.brown, true);
    const roarLp = ctx.createBiquadFilter();
    roarLp.type = "lowpass";
    roarLp.frequency.value = 420;
    roarLp.Q.value = 0.4;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.18;
    const roarPan = ctx.createStereoPanner();
    roar.connect(roarLp).connect(roarGain).connect(roarPan).connect(this.ambience!);
    roarGain.connect(this.reverb!);
    roar.start();

    // Howl: pink noise through two narrow, slightly detuned resonances.
    const howl = this.source(noise.pink, true);
    const howlGain = ctx.createGain();
    howlGain.gain.value = 0.02;
    const howlPan = ctx.createStereoPanner();
    const bands = [1, 1.47].map((ratio) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 14;
      bp.frequency.value = 520 * ratio;
      howl.connect(bp).connect(howlGain);
      return { bp, ratio };
    });
    howlGain.connect(howlPan).connect(this.ambience!);
    howlGain.connect(this.reverb!);
    howl.start(0, 1.3);

    const gust = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const g = Math.pow(Math.random(), 0.8); // 0 calm .. 1 strong
      const tc = rand(0.9, 2.4);
      roarGain.gain.setTargetAtTime(0.1 + 0.32 * g, t, tc);
      roarLp.frequency.setTargetAtTime(260 + 520 * g, t, tc);
      roarPan.pan.setTargetAtTime(rand(-0.5, 0.5), t, 3);
      howlGain.gain.setTargetAtTime(0.004 + 0.075 * g * g, t, tc * 1.2);
      const pitch = 360 + 480 * g + rand(-40, 40);
      bands.forEach(({ bp, ratio }) => bp.frequency.setTargetAtTime(pitch * ratio, t, tc * 1.5));
      howlPan.pan.setTargetAtTime(rand(-0.7, 0.7), t, 4);
      this.later(rand(2500, 7000), gust);
    };
    gust();
  }

  /** A very low, slow-beating undertone, felt more than heard. */
  private startUndertone() {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 160;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    lp.connect(gain).connect(this.ambience!);
    for (const [freq, type] of [
      [41.2, "sine"],
      [41.45, "sine"],
      [61.8, "triangle"],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(lp);
      osc.start();
    }
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.04;
    const depth = ctx.createGain();
    depth.gain.value = 0.02;
    swell.connect(depth).connect(gain.gain);
    swell.start();
  }

  /** The dead tree on the left creaks now and then (stick-slip friction). */
  private scheduleCreak() {
    this.later(rand(9000, 22000), () => {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.05;
      const dur = rand(0.9, 1.8);
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(rand(28, 40), t);
      osc.frequency.linearRampToValueAtTime(rand(12, 20), t + dur * 0.6);
      osc.frequency.linearRampToValueAtTime(rand(22, 34), t + dur);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = rand(700, 1100);
      bp.Q.value = 5;
      const bp2 = ctx.createBiquadFilter();
      bp2.type = "bandpass";
      bp2.frequency.value = bp.frequency.value * 2.3;
      bp2.Q.value = 7;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.15);
      gain.gain.setValueAtTime(0.05, t + dur - 0.3);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      const pan = ctx.createStereoPanner();
      pan.pan.value = -0.65;
      osc.connect(bp).connect(gain);
      osc.connect(bp2).connect(gain);
      gain.connect(pan).connect(this.ambience!);
      gain.connect(this.reverb!);
      osc.start(t);
      osc.stop(t + dur + 0.1);
      this.scheduleCreak();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Thunder                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Thunder for a lightning strike.
   * @param distance 0 = right overhead (sharp crack), 1 = far away (soft roll)
   * @param delay seconds after the flash (sound is slower than light)
   */
  thunder(distance: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const noise = this.noise!;
    const d = Math.min(1, Math.max(0, distance));
    const near = 1 - d;
    const t0 = ctx.currentTime + Math.max(0, delay);
    const dur = 4 + d * 3 + rand(0, 2.5);
    const level = 0.35 + 0.65 * near;

    const bus = ctx.createGain();
    bus.gain.value = level;
    bus.connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = 0.35 + 0.5 * d; // distant thunder is mostly reflections
    bus.connect(send).connect(this.reverb!);

    // 1. The crack: only close strikes have one.
    if (near > 0.45) {
      const crack = this.source(noise.white);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3500 + 5000 * near;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      const peak = 0.9 * near * near;
      let t = t0;
      // A tearing series of sub-cracks rather than one click.
      for (let i = 0; i < 6; i++) {
        const a = peak * (i === 0 ? 1 : rand(0.25, 0.8));
        g.gain.setTargetAtTime(a, t, 0.002);
        g.gain.setTargetAtTime(a * 0.08, t + 0.012, rand(0.02, 0.05));
        t += rand(0.025, 0.07);
      }
      g.gain.setTargetAtTime(0, t, 0.08);
      const pan = ctx.createStereoPanner();
      pan.pan.value = rand(-0.4, 0.4);
      crack.connect(hp).connect(lp).connect(g).connect(pan).connect(bus);
      this.startNoise(crack, t0, 0.8);

      // The felt "boom" in the chest.
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(58, t0);
      sub.frequency.exponentialRampToValueAtTime(28, t0 + 0.9);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0, t0);
      sg.gain.linearRampToValueAtTime(0.55 * near, t0 + 0.03);
      sg.gain.setTargetAtTime(0, t0 + 0.08, 0.35);
      sub.connect(sg).connect(bus);
      sub.start(t0);
      sub.stop(t0 + 2.5);
    }

    // 2. The roll: two decorrelated layers, panned apart, each with its own
    //    random sequence of swells (echoes off hills and cloud base).
    for (const side of [-1, 1]) {
      const rumble = this.source(noise.brown);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(180 + 900 * near, t0);
      lp.frequency.exponentialRampToValueAtTime(70 + 60 * near, t0 + dur);
      const body = ctx.createBiquadFilter();
      body.type = "peaking";
      body.frequency.value = 55;
      body.gain.value = 7;
      const shaper = ctx.createWaveShaper();
      shaper.curve = softClip(1.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);

      const rolls = Math.round(rand(4, 8));
      const times = Array.from({ length: rolls }, () => t0 + Math.pow(Math.random(), 1.6) * dur * 0.75).sort(
        (a, b) => a - b,
      );
      times.unshift(t0 + (near > 0.45 ? 0.04 : rand(0.05, 0.4)));
      times.forEach((t, i) => {
        const fall = Math.pow(1 - (t - t0) / dur, 0.8);
        const a = (i === 0 ? 1 : rand(0.4, 1)) * fall * 0.9;
        g.gain.setTargetAtTime(a, t, i === 0 ? 0.03 + 0.15 * d : rand(0.08, 0.3));
        g.gain.setTargetAtTime(a * rand(0.25, 0.5), t + rand(0.15, 0.4), rand(0.3, 0.7));
      });
      g.gain.setTargetAtTime(0, t0 + dur * 0.82, dur * 0.12);

      const pan = ctx.createStereoPanner();
      pan.pan.value = side * rand(0.2, 0.55);
      rumble.connect(lp).connect(body).connect(shaper).connect(g).connect(pan).connect(bus);
      this.startNoise(rumble, t0, dur + 0.5);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Earthquake                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * The ground heaving: a deep sub rumble, a mid "grind" you can hear on
   * laptop speakers, gravel crumbling and the odd rock thud.
   * The loudness follows `quakeEnvelope`, the same curve the screen shake uses.
   */
  quake(intensity: number, duration: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.started || duration <= 0.2) return;
    const noise = this.noise!;
    const t0 = ctx.currentTime + Math.max(0, delay);
    const level = Math.min(1, Math.max(0, intensity));

    const steps = 96;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const k = i / (steps - 1);
      curve[i] = quakeEnvelope(k) * level * rand(0.7, 1);
    }
    curve[steps - 1] = 0;

    const bus = ctx.createGain();
    bus.gain.setValueCurveAtTime(curve, t0, duration);
    bus.connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = 0.3;
    bus.connect(send).connect(this.reverb!);

    // Sub rumble.
    const sub = this.source(noise.brown);
    const subLp = ctx.createBiquadFilter();
    subLp.type = "lowpass";
    subLp.frequency.value = 95;
    const subBody = ctx.createBiquadFilter();
    subBody.type = "peaking";
    subBody.frequency.value = 38;
    subBody.gain.value = 9;
    const subGain = ctx.createGain();
    subGain.gain.value = 1.1;
    sub.connect(subLp).connect(subBody).connect(subGain).connect(bus);
    this.startNoise(sub, t0, duration);

    // Grinding earth, audible on small speakers.
    const grind = this.source(noise.brown);
    const grindBp = ctx.createBiquadFilter();
    grindBp.type = "bandpass";
    grindBp.frequency.value = 170;
    grindBp.Q.value = 0.8;
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip(2.5);
    const grindGain = ctx.createGain();
    grindGain.gain.value = 0.55;
    const wobble = ctx.createOscillator();
    wobble.frequency.value = rand(5, 9);
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = 0.25;
    wobble.connect(wobbleDepth).connect(grindGain.gain);
    wobble.start(t0);
    wobble.stop(t0 + duration);
    grind.connect(grindBp).connect(shaper).connect(grindGain).connect(bus);
    this.startNoise(grind, t0, duration);

    // Gravel and soil crumbling.
    const gravel = this.source(this.crackleBuffer(ctx, duration));
    const gravelBp = ctx.createBiquadFilter();
    gravelBp.type = "bandpass";
    gravelBp.frequency.value = 1400;
    gravelBp.Q.value = 0.6;
    const gravelGain = ctx.createGain();
    gravelGain.gain.value = 0.22;
    gravel.connect(gravelBp).connect(gravelGain).connect(bus);
    gravel.start(t0);

    // Rocks knocking together underground.
    const thuds = Math.round(duration * 1.6);
    for (let i = 0; i < thuds; i++) {
      const t = t0 + rand(0.1, 0.85) * duration;
      const src = this.source(noise.brown);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = rand(180, 320);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(rand(0.4, 0.9), t + 0.01);
      g.gain.setTargetAtTime(0, t + 0.02, rand(0.05, 0.12));
      const pan = ctx.createStereoPanner();
      pan.pan.value = rand(-0.6, 0.6);
      src.connect(lp).connect(g).connect(pan).connect(bus);
      this.startNoise(src, t, 0.6);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  The candle                                                         */
  /* ------------------------------------------------------------------ */

  /** A soft breath of air when the cursor reaches the candle. */
  playHover() {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const now = ctx.currentTime;
    if (now - this.lastHover < 0.6) return;
    this.lastHover = now;
    const src = this.source(this.noise!.pink);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(500, now);
    bp.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.12);
    g.gain.linearRampToValueAtTime(0, now + 0.45);
    src.connect(bp).connect(g).connect(this.sfx!);
    this.startNoise(src, now, 0.5);
  }

  /**
   * Strike a match, the flare catches the wick, the flame settles and
   * crackles, then the light swells and carries you into the graveyard.
   */
  playLightCandle() {
    const ctx = this.ctx;
    if (!ctx) return;
    const noise = this.noise!;
    const now = ctx.currentTime + 0.01;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = 0.25;
    out.connect(send).connect(this.reverb!);

    // 1. Scratch: rough friction of match head on striker (0 - 0.16s).
    {
      const src = this.source(noise.white);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3200;
      bp.Q.value = 0.8;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 900;
      const g = ctx.createGain();
      const steps = 40;
      const curve = new Float32Array(steps);
      for (let i = 0; i < steps; i++) {
        const k = i / (steps - 1);
        const env = Math.sin(Math.PI * Math.min(1, k * 1.1));
        curve[i] = env * rand(0.15, 0.6); // jagged grain of the striker
      }
      curve[steps - 1] = 0;
      g.gain.setValueCurveAtTime(curve, now, 0.16);
      src.connect(bp).connect(hp).connect(g).connect(out);
      this.startNoise(src, now, 0.2);
    }

    // 2. Flare: the head ignites with a bright hiss (0.12 - 1.2s).
    {
      const t = now + 0.12;
      const src = this.source(noise.pink);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(700, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.09);
      bp.frequency.exponentialRampToValueAtTime(900, t + 0.9);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.55, t + 0.05);
      g.gain.setTargetAtTime(0.12, t + 0.1, 0.18);
      g.gain.setTargetAtTime(0, t + 0.8, 0.2);
      src.connect(bp).connect(g).connect(out);
      this.startNoise(src, t, 1.3);
    }

    // 3. Whoomp: the wick catches (0.2s).
    {
      const t = now + 0.2;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.4, t + 0.03);
      og.gain.setTargetAtTime(0, t + 0.06, 0.12);
      osc.connect(og).connect(out);
      osc.start(t);
      osc.stop(t + 1);

      const air = this.source(noise.brown);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(250, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.12);
      lp.frequency.exponentialRampToValueAtTime(300, t + 0.6);
      const ag = ctx.createGain();
      ag.gain.setValueAtTime(0, t);
      ag.gain.linearRampToValueAtTime(0.5, t + 0.08);
      ag.gain.setTargetAtTime(0, t + 0.15, 0.2);
      air.connect(lp).connect(ag).connect(out);
      this.startNoise(air, t, 1);
    }

    // 4. Burning: a soft flutter with sparse crackles (0.3 - 3s).
    {
      const t = now + 0.3;
      const dur = 2.7;
      const src = this.source(noise.brown);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.3);
      g.gain.setValueAtTime(0.14, t + dur - 0.6);
      g.gain.linearRampToValueAtTime(0, t + dur);
      const flutter = ctx.createOscillator();
      flutter.frequency.value = 7.3;
      const fd = ctx.createGain();
      fd.gain.value = 0.04;
      flutter.connect(fd).connect(g.gain);
      flutter.start(t);
      flutter.stop(t + dur);
      src.connect(lp).connect(g).connect(out);
      this.startNoise(src, t, dur);

      const crackle = this.source(this.crackleBuffer(ctx, dur));
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800;
      const cg = ctx.createGain();
      cg.gain.value = 0.5;
      crackle.connect(hp).connect(cg).connect(out);
      crackle.start(t);
    }

    // 5. Swell: the light floods and pulls you through (1.1 - 3s).
    {
      const t = now + 1.1;
      const src = this.source(noise.pink);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(180, t);
      lp.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 1.55);
      g.gain.linearRampToValueAtTime(0, t + 1.75);
      src.connect(lp).connect(g).connect(out);
      g.connect(this.reverb!);
      this.startNoise(src, t, 1.8);

      // A low toll as the gate closes behind you.
      const boom = ctx.createOscillator();
      boom.frequency.setValueAtTime(65, t + 1.62);
      boom.frequency.exponentialRampToValueAtTime(36, t + 3);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0, t + 1.62);
      bg.gain.linearRampToValueAtTime(0.5, t + 1.66);
      bg.gain.setTargetAtTime(0, t + 1.75, 0.5);
      boom.connect(bg).connect(out);
      bg.connect(this.reverb!);
      boom.start(t + 1.62);
      boom.stop(t + 4.5);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Ghosts                                                             */
  /* ------------------------------------------------------------------ */

  /** A bus panned in space with a generous reverb send (ghosts sound far off). */
  private voiceBus(pan: number, level: number, wet = 0.6) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = level;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = wet;
    p.connect(send).connect(this.reverb!);
    return g;
  }

  /**
   * A ghost's voice. Calm ghosts whisper (breath shaped into syllables by two
   * moving formants); angrier ones moan underneath.
   * @param pan -1 (left) to 1 (right)
   * @param anger 0 (whisper) to 1 (banshee)
   * @param level overall loudness, 0..1
   */
  ghostVoice(pan = 0, anger = 0, level = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const t0 = ctx.currentTime + 0.02;
    const bus = this.voiceBus(pan, 0.9 * level, 0.7);

    // Whisper: 3-6 breathy syllables.
    const dur = rand(0.9, 1.6);
    const src = this.source(this.noise!.pink);
    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.Q.value = 4;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.Q.value = 6;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 350;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    const syllables = Math.round(rand(3, 6));
    for (let i = 0; i < syllables; i++) {
      const t = t0 + (i / syllables) * dur;
      f1.frequency.setTargetAtTime(rand(450, 800), t, 0.04);
      f2.frequency.setTargetAtTime(rand(1300, 2600), t, 0.04);
      g.gain.setTargetAtTime(rand(0.35, 0.7), t, 0.03);
      g.gain.setTargetAtTime(0.04, t + (dur / syllables) * 0.6, 0.05);
    }
    g.gain.setTargetAtTime(0, t0 + dur, 0.1);
    src.connect(hp);
    hp.connect(f1).connect(g);
    hp.connect(f2).connect(g);
    g.connect(bus);
    this.startNoise(src, t0, dur + 0.6);

    // Moan: a sliding, wavering tone through an "ooh" formant.
    if (anger > 0.35) {
      const mt = t0 + rand(0, 0.3);
      const mdur = 1.4 + anger * 1.2;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      const base = rand(170, 240) + anger * 60;
      osc.frequency.setValueAtTime(base * 1.15, mt);
      osc.frequency.exponentialRampToValueAtTime(base * 0.78, mt + mdur);
      const vib = ctx.createOscillator();
      vib.frequency.value = rand(4.5, 6.5);
      const vibDepth = ctx.createGain();
      vibDepth.gain.value = base * 0.03;
      vib.connect(vibDepth).connect(osc.frequency);
      const ooh = ctx.createBiquadFilter();
      ooh.type = "bandpass";
      ooh.frequency.value = 520;
      ooh.Q.value = 2.5;
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(0, mt);
      mg.gain.linearRampToValueAtTime(0.32 * anger, mt + 0.45);
      mg.gain.setTargetAtTime(0, mt + mdur * 0.6, mdur * 0.2);
      osc.connect(ooh).connect(mg).connect(bus);
      osc.start(mt);
      vib.start(mt);
      osc.stop(mt + mdur + 1);
      vib.stop(mt + mdur + 1);
    }
  }

  /** An angry ghost lunges at you: a rising, tearing shriek. */
  ghostShriek(pan = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const t0 = ctx.currentTime + 0.01;
    const bus = this.voiceBus(pan, 0.75, 0.55);

    // Two detuned, distorted voices sliding up then collapsing.
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip(3);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 320;
    const fA = ctx.createBiquadFilter();
    fA.type = "peaking";
    fA.frequency.value = 1050;
    fA.Q.value = 3;
    fA.gain.value = 10;
    const fB = ctx.createBiquadFilter();
    fB.type = "peaking";
    fB.frequency.value = 2700;
    fB.Q.value = 4;
    fB.gain.value = 8;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t0);
    vg.gain.linearRampToValueAtTime(0.32, t0 + 0.05);
    vg.gain.setTargetAtTime(0.22, t0 + 0.12, 0.15);
    vg.gain.setTargetAtTime(0, t0 + 0.55, 0.14);
    shaper.connect(hp).connect(fA).connect(fB).connect(vg).connect(bus);
    for (const ratio of [1, 1.06]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(480 * ratio, t0);
      osc.frequency.exponentialRampToValueAtTime(1250 * ratio, t0 + 0.13);
      osc.frequency.setValueAtTime(1250 * ratio, t0 + 0.32);
      osc.frequency.exponentialRampToValueAtTime(360 * ratio, t0 + 0.95);
      const vib = ctx.createOscillator();
      vib.frequency.value = 11;
      const depth = ctx.createGain();
      depth.gain.value = 45 * ratio;
      vib.connect(depth).connect(osc.frequency);
      osc.connect(shaper);
      osc.start(t0);
      vib.start(t0);
      osc.stop(t0 + 1.3);
      vib.stop(t0 + 1.3);
    }

    // Rush of breath.
    const breath = this.source(this.noise!.white);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1500, t0);
    bp.frequency.exponentialRampToValueAtTime(3500, t0 + 0.2);
    bp.Q.value = 0.9;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(0.28, t0 + 0.03);
    bg.gain.setTargetAtTime(0, t0 + 0.12, 0.18);
    breath.connect(bp).connect(bg).connect(bus);
    this.startNoise(breath, t0, 1);

    // A thud, as if it slammed into the glass.
    const thud = ctx.createOscillator();
    thud.frequency.setValueAtTime(110, t0);
    thud.frequency.exponentialRampToValueAtTime(40, t0 + 0.25);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0, t0);
    tg.gain.linearRampToValueAtTime(0.5, t0 + 0.01);
    tg.gain.setTargetAtTime(0, t0 + 0.03, 0.09);
    thud.connect(tg).connect(this.sfx!);
    thud.start(t0);
    thud.stop(t0 + 0.6);
  }

  /* ------------------------------------------------------------------ */
  /*  Coming back to life                                                */
  /* ------------------------------------------------------------------ */

  /** A bell-like tone made of inharmonic partials. */
  /* ------------------------------------------------------------------ */
  /*  Tombs opening and closing                                          */
  /* ------------------------------------------------------------------ */

  /** A bus for one tomb sound: panned, into the sfx and the reverb. */
  private tombBus(pan: number, level: number, wet = 0.45) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = level;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p).connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = wet;
    p.connect(send).connect(this.reverb!);
    return out;
  }

  /** Stick-slip friction: an envelope that catches and lurches, never smooth. */
  private frictionCurve(steps: number, attack = 0.08, release = 0.2) {
    const curve = new Float32Array(steps);
    let v = 0.6;
    for (let i = 0; i < steps; i++) {
      const k = i / (steps - 1);
      v += (Math.random() - 0.5) * 0.5;
      v = Math.min(1, Math.max(0.25, v));
      const env = Math.min(1, k / attack) * Math.min(1, (1 - k) / release);
      curve[i] = v * env;
    }
    return curve;
  }

  /**
   * Heavy stone dragged over stone: a low grind with gravel crumbling in it,
   * and a dull knock when it comes to rest.
   * @param weight 0..1, how massive the stone is (deeper and slower)
   */
  stoneGrind(duration: number, pan = 0, weight = 0.7) {
    const ctx = this.ctx;
    if (!ctx || !this.started || duration <= 0.1) return;
    const noise = this.noise!;
    const t0 = ctx.currentTime + 0.02;
    const out = this.tombBus(pan, 0.95);

    const grind = this.source(noise.brown);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260 - weight * 120, t0);
    bp.frequency.linearRampToValueAtTime(200 - weight * 90, t0 + duration);
    const rough = ctx.createWaveShaper();
    rough.curve = softClip(2.4);
    const g = ctx.createGain();
    g.gain.setValueCurveAtTime(this.frictionCurve(48), t0, duration);
    const level = ctx.createGain();
    level.gain.value = 0.9;
    grind.connect(bp).connect(rough).connect(g).connect(level).connect(out);
    this.startNoise(grind, t0, duration + 0.1);

    // Grit squealing between the faces.
    const grit = this.source(noise.white);
    const gh = ctx.createBiquadFilter();
    gh.type = "bandpass";
    gh.frequency.value = 1600;
    gh.Q.value = 0.9;
    const gg = ctx.createGain();
    gg.gain.setValueCurveAtTime(this.frictionCurve(64, 0.05, 0.3).map((v) => v * v * 0.09), t0, duration);
    grit.connect(gh).connect(gg).connect(out);
    this.startNoise(grit, t0, duration + 0.1);

    // Gravel and dust falling.
    const gravel = this.source(this.crackleBuffer(ctx, duration + 0.6));
    const gb = ctx.createBiquadFilter();
    gb.type = "bandpass";
    gb.frequency.value = 2600;
    gb.Q.value = 0.6;
    const gv = ctx.createGain();
    gv.gain.value = 0.3;
    gravel.connect(gb).connect(gv).connect(out);
    gravel.start(t0 + 0.1);

    this.stoneKnock(t0 + duration - 0.05, out, 0.5 + weight * 0.4);
  }

  /** A heavy stone settling into place. */
  private stoneKnock(at: number, out: AudioNode, level: number) {
    const ctx = this.ctx!;
    const thud = this.source(this.noise!.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.012);
    g.gain.setTargetAtTime(0, at + 0.03, 0.12);
    thud.connect(lp).connect(g).connect(out);
    this.startNoise(thud, at, 0.9);
    const body = ctx.createOscillator();
    body.frequency.setValueAtTime(72, at);
    body.frequency.exponentialRampToValueAtTime(38, at + 0.4);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, at);
    bg.gain.linearRampToValueAtTime(level * 0.6, at + 0.01);
    bg.gain.setTargetAtTime(0, at + 0.03, 0.14);
    body.connect(bg).connect(out);
    body.start(at);
    body.stop(at + 1);
  }

  /**
   * Old bronze crypt doors: the latch gives with a clank, then rusted hinges
   * groan as the leaves swing.
   */
  doorCreak(duration = 1.8, pan = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const t0 = ctx.currentTime + 0.02;
    const out = this.tombBus(pan, 0.85, 0.6);

    // The latch.
    this.bell(310, t0, 0.07, out, 0.6);
    this.bell(523, t0 + 0.012, 0.05, out, 0.4);
    this.stoneKnock(t0, out, 0.25);

    // Two hinges, slightly apart in pitch and time: a sawtooth whose pitch
    // wanders and catches, through a resonant "door" filter.
    for (const [base, delay, side] of [
      [118, 0.18, -0.25],
      [143, 0.32, 0.25],
    ] as const) {
      const at = t0 + delay;
      const len = duration - delay * 0.5;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const steps = 40;
      const pitch = new Float32Array(steps);
      let f: number = base;
      for (let i = 0; i < steps; i++) {
        f += (Math.random() - 0.45) * 26;
        f = Math.min(base * 2.4, Math.max(base * 0.7, f));
        pitch[i] = f;
      }
      osc.frequency.setValueCurveAtTime(pitch, at, len);
      const res = ctx.createBiquadFilter();
      res.type = "bandpass";
      res.frequency.value = 900 + base * 3;
      res.Q.value = 3.5;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 180;
      const g = ctx.createGain();
      g.gain.setValueCurveAtTime(this.frictionCurve(36, 0.12, 0.3).map((v) => v * v * 0.16), at, len);
      const p = ctx.createStereoPanner();
      p.pan.value = side;
      osc.connect(res).connect(hp).connect(g).connect(p).connect(out);
      osc.start(at);
      osc.stop(at + len + 0.1);
    }

    // Air moving out of the dark inside.
    const draught = this.source(this.noise!.pink);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(400, t0 + 0.4);
    lp.frequency.exponentialRampToValueAtTime(1400, t0 + duration);
    const dg = ctx.createGain();
    dg.gain.setValueAtTime(0, t0 + 0.4);
    dg.gain.linearRampToValueAtTime(0.1, t0 + duration * 0.8);
    dg.gain.setTargetAtTime(0, t0 + duration, 0.5);
    draught.connect(lp).connect(dg).connect(out);
    this.startNoise(draught, t0 + 0.4, duration + 1.5);
  }

  /** The tomb shutting again: a short drag and a heavy, final knock. */
  tombSeal(kind: "stone" | "door", pan = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    if (kind === "stone") {
      this.stoneGrind(0.7, pan, 0.8);
      return;
    }
    const t0 = ctx.currentTime + 0.35;
    const out = this.tombBus(pan, 0.9, 0.6);
    this.stoneKnock(t0, out, 0.8);
    this.bell(262, t0 + 0.01, 0.05, out, 0.9);
  }

  private bell(freq: number, at: number, level: number, out: AudioNode, decay = 2.2) {
    const ctx = this.ctx!;
    for (const [ratio, amp] of [
      [1, 1],
      [2.756, 0.4],
      [5.404, 0.18],
      [0.5, 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(level * amp, at + 0.008);
      g.gain.setTargetAtTime(0, at + 0.01, (decay / ratio) * 0.35 + 0.05);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(at + decay + 0.5);
    }
  }

  /**
   * A quest was fixed: the ghost exhales, leaves rustle, and a chime rings,
   * higher the more alive the project is.
   * @param life 0..1 after this fix
   */
  playLifeReturn(life: number) {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const t0 = ctx.currentTime + 0.02;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    out.connect(send).connect(this.reverb!);

    // Relief: a long breath that falls away.
    const sigh = this.source(this.noise!.pink);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1400, t0);
    bp.frequency.exponentialRampToValueAtTime(450, t0 + 1.2);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t0);
    sg.gain.linearRampToValueAtTime(0.16, t0 + 0.25);
    sg.gain.setTargetAtTime(0, t0 + 0.5, 0.35);
    sigh.connect(bp).connect(sg).connect(out);
    this.startNoise(sigh, t0, 2);

    // Leaves and grass pushing up.
    const rustle = this.source(this.crackleBuffer(ctx, 1.4));
    const rh = ctx.createBiquadFilter();
    rh.type = "bandpass";
    rh.frequency.value = 4200;
    rh.Q.value = 0.7;
    const rg = ctx.createGain();
    rg.gain.value = 0.18;
    rustle.connect(rh).connect(rg).connect(out);
    rustle.start(t0 + 0.15);

    // A rising pair of chimes on a D major pentatonic.
    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];
    const step = Math.min(scale.length - 2, Math.floor(life * (scale.length - 2)));
    this.bell(scale[step]!, t0 + 0.2, 0.16, out);
    this.bell(scale[step + 1]!, t0 + 0.38, 0.13, out);
  }

  /**
   * Resurrection: the stone cracks, light rushes out, an organ chord swells
   * with a choir underneath, and bells climb into the morning.
   */
  playResurrection() {
    const ctx = this.ctx;
    if (!ctx || !this.started) return;
    const noise = this.noise!;
    const t0 = ctx.currentTime + 0.03;
    const out = ctx.createGain();
    out.gain.value = 0.85;
    out.connect(this.sfx!);
    const send = ctx.createGain();
    send.gain.value = 0.55;
    out.connect(send).connect(this.reverb!);

    // 1. The tombstone cracks.
    const crack = this.source(this.crackleBuffer(ctx, 0.7));
    const ch = ctx.createBiquadFilter();
    ch.type = "bandpass";
    ch.frequency.value = 1800;
    const cg = ctx.createGain();
    cg.gain.value = 0.7;
    crack.connect(ch).connect(cg).connect(out);
    crack.start(t0);
    const boom = this.source(noise.brown);
    const blp = ctx.createBiquadFilter();
    blp.type = "lowpass";
    blp.frequency.value = 220;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(0.7, t0 + 0.02);
    bg.gain.setTargetAtTime(0, t0 + 0.05, 0.25);
    boom.connect(blp).connect(bg).connect(out);
    this.startNoise(boom, t0, 1.5);

    // 2. Light pours out: a rising rush.
    const rush = this.source(noise.pink);
    const rlp = ctx.createBiquadFilter();
    rlp.type = "lowpass";
    rlp.frequency.setValueAtTime(300, t0 + 0.2);
    rlp.frequency.exponentialRampToValueAtTime(7000, t0 + 1.6);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0 + 0.2);
    rg.gain.exponentialRampToValueAtTime(0.22, t0 + 1.4);
    rg.gain.setTargetAtTime(0, t0 + 1.6, 0.5);
    rush.connect(rlp).connect(rg).connect(out);
    this.startNoise(rush, t0 + 0.2, 3.5);

    // 3. Organ chord (D major), drawbar-style harmonics with a slow swell.
    const organ = ctx.createGain();
    organ.gain.setValueAtTime(0, t0 + 0.6);
    organ.gain.linearRampToValueAtTime(0.11, t0 + 1.8);
    organ.gain.setValueAtTime(0.11, t0 + 4.2);
    organ.gain.linearRampToValueAtTime(0, t0 + 7);
    const trem = ctx.createOscillator();
    trem.frequency.value = 5.8;
    const tremDepth = ctx.createGain();
    tremDepth.gain.value = 0.012;
    trem.connect(tremDepth).connect(organ.gain);
    trem.start(t0 + 0.6);
    trem.stop(t0 + 7.2);
    const organLp = ctx.createBiquadFilter();
    organLp.type = "lowpass";
    organLp.frequency.value = 3200;
    organ.connect(organLp).connect(out);
    for (const note of [146.83, 220, 293.66, 369.99, 440]) {
      for (const [h, amp] of [
        [1, 1],
        [2, 0.55],
        [3, 0.32],
        [4, 0.25],
        [6, 0.12],
        [8, 0.08],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.frequency.value = note * h * (1 + rand(-0.0015, 0.0015));
        const g = ctx.createGain();
        g.gain.value = amp;
        osc.connect(g).connect(organ);
        osc.start(t0 + 0.6);
        osc.stop(t0 + 7.2);
      }
    }

    // 4. Choir "aah" underneath: detuned saws through vowel formants.
    const choir = ctx.createGain();
    choir.gain.setValueAtTime(0, t0 + 0.9);
    choir.gain.linearRampToValueAtTime(0.05, t0 + 2.4);
    choir.gain.setValueAtTime(0.05, t0 + 4.2);
    choir.gain.linearRampToValueAtTime(0, t0 + 6.8);
    for (const [f, q, gain] of [
      [800, 6, 1],
      [1150, 7, 0.6],
      [2900, 9, 0.25],
    ] as const) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      choir.connect(bp).connect(g).connect(out);
    }
    const choirIn = ctx.createGain();
    choirIn.connect(choir);
    for (const note of [293.66, 369.99, 440]) {
      for (const cents of [-7, 6]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = note * Math.pow(2, cents / 1200);
        const vib = ctx.createOscillator();
        vib.frequency.value = rand(4.8, 5.6);
        const vd = ctx.createGain();
        vd.gain.value = note * 0.006;
        vib.connect(vd).connect(osc.frequency);
        osc.connect(choirIn);
        osc.start(t0 + 0.9);
        vib.start(t0 + 0.9);
        osc.stop(t0 + 7);
        vib.stop(t0 + 7);
      }
    }

    // 5. Bells climb into the morning.
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => this.bell(f, t0 + 1.2 + i * 0.22, 0.12, out, 3));
  }

  /** Sparse, decaying clicks: wax and wick popping. */
  private crackleBuffer(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let i = Math.floor(ctx.sampleRate * 0.05);
    while (i < len) {
      const k = i / len;
      const amp = rand(0.2, 1) * (1 - k * 0.7);
      const width = Math.floor(rand(30, 160));
      for (let j = 0; j < width && i + j < len; j++) {
        data[i + j] = (Math.random() * 2 - 1) * amp * Math.exp(-j / (width / 5));
      }
      // More pops right after ignition, fewer as the flame settles.
      i += Math.floor(ctx.sampleRate * rand(0.03, 0.18) * (1 + k * 2.5));
    }
    return buffer;
  }
}

/**
 * Earthquake strength over its life (k = 0..1): builds slowly, holds with
 * surges, then settles. Shared by the sound and the screen shake.
 */
export function quakeEnvelope(k: number) {
  if (k <= 0 || k >= 1) return 0;
  if (k < 0.35) return Math.pow(k / 0.35, 1.5);
  if (k < 0.7) return 0.85 + 0.15 * Math.sin((k - 0.35) * 40);
  return Math.pow(1 - (k - 0.7) / 0.3, 2);
}

function softClip(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

let instance: SoundEngine | null = null;

/** One engine per page session, so sound continues across client navigation. */
export function getSoundEngine() {
  if (!instance) instance = new SoundEngine();
  return instance;
}
