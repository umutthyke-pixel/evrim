window.ME = window.ME || {};

ME.Audio = class Audio {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.ctx = new AudioContext();
        }
        this.enabled = true;
    }
    
    // First interaction unlocks AudioContext
    unlock() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    playTone(freq, type, duration, vol=0.1) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }
    
    playSpawn() {
        this.playTone(400, 'sine', 0.1, 0.1);
    }
    
    playMerge(level) {
        const freq = 200 + (level * 50);
        this.playTone(freq, 'triangle', 0.15, 0.15);
        setTimeout(() => this.playTone(freq * 1.5, 'sine', 0.2, 0.1), 50);
    }
    
    playCoin() {
        this.playTone(1200, 'sine', 0.1, 0.05);
        setTimeout(() => this.playTone(1600, 'sine', 0.15, 0.05), 40);
    }
    
    playError() {
        this.playTone(150, 'sawtooth', 0.2, 0.1);
    }
};
