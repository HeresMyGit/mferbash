// Procedural sound effects using Web Audio API
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Noise buffer (reused)
let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const ctx = getCtx();
  const len = ctx.sampleRate * 0.5;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// Impact — meaty punch sound
export function playImpact(velocity = 5) {
  const ctx = getCtx();
  const vol = Math.min(1, velocity / 6);
  if (vol < 0.05) return;

  // Deep bass thump
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80 + velocity * 3, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.2);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);

  // Meaty slap noise
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000 + velocity * 100, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
  filter.Q.value = 1;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  noise.connect(filter).connect(nGain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.15);
}

// Accessory pop — small snap/thwack
export function playPop() {
  const ctx = getCtx();
  // Short noise burst
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500 + Math.random() * 1000;
  filter.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.06);
}

// Cannon boom — big explosion
export function playBoom() {
  const ctx = getCtx();

  // Heavy sub bass hit
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + 0.4);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.7, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);

  // Explosion noise
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
  filter.Q.value = 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.7);

  // Sharp crack transient
  const crack = ctx.createBufferSource();
  crack.buffer = getNoiseBuffer();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 4000;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.4, ctx.currentTime);
  crackGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  crack.connect(hpf).connect(crackGain).connect(ctx.destination);
  crack.start();
  crack.stop(ctx.currentTime + 0.08);
}

// Truck horn
export function playHorn() {
  const ctx = getCtx();
  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = 220;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = 277;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.4);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain).connect(ctx.destination);
  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.5);
  osc2.stop(ctx.currentTime + 0.5);
}

// Press hydraulic hiss
export function playHiss() {
  const ctx = getCtx();
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime + 1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 1.5);
}

// Press crush — heavy thud + crunch
export function playCrush() {
  const ctx = getCtx();
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.5);

  // Crackle overlay
  const crackle = ctx.createBufferSource();
  crackle.buffer = getNoiseBuffer();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 2000;
  const cGain = ctx.createGain();
  cGain.gain.setValueAtTime(0.12, ctx.currentTime);
  cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  crackle.connect(hpf).connect(cGain).connect(ctx.destination);
  crackle.start();
  crackle.stop(ctx.currentTime + 0.25);
}

// Wrecking ball hit — massive impact
export function playWreckingHit() {
  const ctx = getCtx();
  // Sub bass thump
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(12, ctx.currentTime + 0.5);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.7);

  // Heavy smack
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.5, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  noise.connect(filter).connect(nGain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.3);

  // Debris crumble
  const debris = ctx.createBufferSource();
  debris.buffer = getNoiseBuffer();
  const debrisFilter = ctx.createBiquadFilter();
  debrisFilter.type = 'bandpass';
  debrisFilter.frequency.value = 600;
  debrisFilter.Q.value = 1;
  const dGain = ctx.createGain();
  dGain.gain.setValueAtTime(0.001, ctx.currentTime);
  dGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
  dGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  debris.connect(debrisFilter).connect(dGain).connect(ctx.destination);
  debris.start();
  debris.stop(ctx.currentTime + 0.9);
}

// Gunshot — sharp crack + punch
export function playGunshot() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const pitch = 0.9 + Math.random() * 0.2;

  // Sharp transient crack — loud and snappy
  const crack = ctx.createBufferSource();
  crack.buffer = getNoiseBuffer();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 2500 * pitch;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.7, t);
  crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  crack.connect(hpf).connect(crackGain).connect(ctx.destination);
  crack.start(t);
  crack.stop(t + 0.06);

  // Mid punch body
  const body = ctx.createBufferSource();
  body.buffer = getNoiseBuffer();
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 600 * pitch;
  bpf.Q.value = 1.5;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.6, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  body.connect(bpf).connect(bodyGain).connect(ctx.destination);
  body.start(t);
  body.stop(t + 0.12);

  // Low thump — chest punch
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80 * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 0.15);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

// UI click — deep, satisfying thunk
export function playClick() {
  const ctx = getCtx();
  // Low knock
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
  // Subtle noise layer
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.1, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  noise.connect(filter).connect(nGain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.08);
}
