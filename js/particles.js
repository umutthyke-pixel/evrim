window.ME = window.ME || {};

ME.Particles = class Particles {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '9999';
        document.body.appendChild(this.container);
    }
    
    spawn(x, y, color, emoji, amount=10) {
        for(let i = 0; i < amount; i++) {
            const p = document.createElement('div');
            p.innerText = emoji || '✨';
            p.style.position = 'absolute';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.fontSize = (10 + Math.random() * 20) + 'px';
            if(color) p.style.color = color;
            p.style.textShadow = '0 0 5px rgba(255,255,255,0.5)';
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 3 + Math.random() * 6;
            const vx = Math.cos(angle) * velocity;
            let vy = Math.sin(angle) * velocity;
            
            this.container.appendChild(p);
            
            let time = 0;
            const duration = 40 + Math.random() * 20;
            
            const animate = () => {
                time++;
                vy += 0.3; // Gravity effect
                const currentX = parseFloat(p.style.left) + vx;
                const currentY = parseFloat(p.style.top) + vy;
                
                p.style.left = currentX + 'px';
                p.style.top = currentY + 'px';
                p.style.opacity = 1 - (time / duration);
                p.style.transform = `rotate(${time * 10}deg)`;
                
                if (time < duration) {
                    requestAnimationFrame(animate);
                } else {
                    p.remove();
                }
            };
            requestAnimationFrame(animate);
        }
    }
};
