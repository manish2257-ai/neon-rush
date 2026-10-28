// Neon Rush 3D - Procedural Web Audio Synthesizer & Sound FX Engine
class SoundManager {
    constructor() {
        this.ctx = null;
        this.soundEnabled = true;
        this.vibrationEnabled = true;
        this.musicPlaying = false;
        this.tempo = 128; // BPM
        this.nextNoteTime = 0;
        this.step = 0;
        this.musicInterval = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // Load settings from localStorage
        try {
            const soundPref = localStorage.getItem('neonrush_sound');
            if (soundPref !== null) this.soundEnabled = (soundPref === 'true');
            const vibPref = localStorage.getItem('neonrush_vibe');
            if (vibPref !== null) this.vibrationEnabled = (vibPref === 'true');
        } catch (e) {
            console.warn('Storage unavailable', e);
        }
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
                this.musicGain.connect(this.masterGain);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        try {
            localStorage.setItem('neonrush_sound', enabled);
        } catch (e) {}
        if (!enabled) {
            this.stopMusic();
        } else if (!this.musicPlaying) {
            this.startMusic();
        }
    }

    setVibrationEnabled(enabled) {
        this.vibrationEnabled = enabled;
        try {
            localStorage.setItem('neonrush_vibe', enabled);
        } catch (e) {}
    }

    vibrate(pattern) {
        if (!this.vibrationEnabled) return;
        try {
            if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                window.AndroidBridge.vibrate(Array.isArray(pattern) ? pattern[0] : pattern);
            } else if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch (e) {}
    }

    playClick() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playLaneSwitch() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(540, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
        this.vibrate(15);
    }

    playJump() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
        this.vibrate(25);
    }

    playSlide() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
        this.vibrate(30);
    }

    playCoin() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
        osc2.frequency.setValueAtTime(1975.53, now + 0.07); // B6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc2.start(now + 0.07);
        osc.stop(now + 0.2);
        osc2.stop(now + 0.2);
        this.vibrate(18);
    }

    playPowerup() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + (idx * 0.06);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.15);
        });
        this.vibrate([40, 30, 60]);
    }

    playCrash() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Sub bass thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        oscGain.gain.setValueAtTime(0.6, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);

        // Noise burst
        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        noiseFilter.frequency.linearRampToValueAtTime(100, now + 0.35);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);

        this.vibrate([100, 50, 150]);
    }

    playMissionComplete() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        notes.forEach((freq, idx) => {
            const t = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.25);
        });
        this.vibrate([40, 40, 80, 50, 120]);
    }

    playRewardClaim() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Sparkle coin waterfall
        for (let i = 0; i < 6; i++) {
            const t = now + i * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + i * 200, t);
            osc.frequency.exponentialRampToValueAtTime(1400 + i * 200, t + 0.1);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.12);
        }
        this.vibrate([30, 20, 40, 20, 60]);
    }

    playPurchase() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const freqs = [440, 554.37, 659.25, 880, 1108.73]; // A major fan-out
        freqs.forEach((f, i) => {
            const t = now + i * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.18);
        });
        this.vibrate([40, 30, 80]);
    }

    playEquip() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
        this.vibrate(20);
    }

    playError() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.1].forEach(delay => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now + delay);
            gain.gain.setValueAtTime(0.3, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.08);
        });
        this.vibrate([60, 40, 60]);
    }

    playSpeedTierUp() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Rising power-chord arpeggio
        [0, 0.07, 0.14, 0.21].forEach((delay, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const f = 330 * Math.pow(1.26, idx); // Rising notes
            osc.frequency.setValueAtTime(f, now + delay);
            osc.frequency.exponentialRampToValueAtTime(f * 1.4, now + delay + 0.12);
            gain.gain.setValueAtTime(0.24, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.12);
        });
        this.vibrate([40, 30, 80]);
    }

    setGameSpeed(currentSpeed, baseSpeed) {
        if (!this.ctx) return;
        // Dynamically scale synthwave tempo from 128 BPM up to 158 BPM
        const ratio = Math.max(0, Math.min(1.0, (currentSpeed - baseSpeed) / 44));
        this.tempo = 128 + ratio * 30;
    }

    // Dynamic Synthwave background pulse
    startMusic() {
        if (!this.soundEnabled || this.musicPlaying) return;
        this.init();
        if (!this.ctx) return;
        this.musicPlaying = true;
        this.step = 0;
        this.scheduleMusicStep();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
    }

    scheduleMusicStep() {
        if (!this.musicPlaying || !this.ctx) return;

        const secondsPerBeat = 60.0 / this.tempo;
        const stepDuration = secondsPerBeat / 4; // 16th note

        // Bassline sequence in A minor (A1, A1, C2, E2, D2, A1...)
        const bassFreqs = [
            110, 110, 110, 110,
            130.81, 130.81, 110, 110,
            146.83, 146.83, 130.81, 110,
            98.0, 98.0, 110, 123.47
        ];

        const freq = bassFreqs[this.step % bassFreqs.length];
        const now = this.ctx.currentTime;

        // Synth Bass Pluck
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq / 2, now); // Deep octave

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + stepDuration * 0.9);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration * 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + stepDuration * 0.9);

        // Hi-hat / Neon shimmer on every 2nd step
        if (this.step % 2 === 1) {
            const hBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
            const hData = hBuffer.getChannelData(0);
            for (let i = 0; i < hData.length; i++) {
                hData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.005));
            }
            const hat = this.ctx.createBufferSource();
            hat.buffer = hBuffer;
            const hFilter = this.ctx.createBiquadFilter();
            hFilter.type = 'highpass';
            hFilter.frequency.value = 6500;
            const hGain = this.ctx.createGain();
            hGain.gain.setValueAtTime(0.06, now);
            hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            hat.connect(hFilter);
            hFilter.connect(hGain);
            hGain.connect(this.musicGain);
            hat.start(now);
        }

        this.step++;
        this.musicInterval = setTimeout(() => {
            this.scheduleMusicStep();
        }, stepDuration * 1000);
    }
}

window.soundManager = new SoundManager();
