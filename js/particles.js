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
        // PERFORMANS GÜNCELLEMESİ: Aşırı kasıntıyı önlemek için maksimum 3 parçacık.
        amount = Math.min(amount, 3);
        
        for(let i = 0; i < amount; i++) {
            const p = document.createElement('div');
            p.innerText = emoji || '✨';
            p.style.position = 'absolute';
            p.style.left = (x - 10) + 'px';
            p.style.top = (y - 10) + 'px';
            p.style.fontSize = (15 + Math.random() * 10) + 'px';
            if(color) p.style.color = color;
            p.style.textShadow = '0 0 5px rgba(255,255,255,0.5)';
            
            // GPU Accelerated (CSS Transition) approach instead of JS requestAnimationFrame
            const angle = Math.random() * Math.PI * 2;
            const velocity = 30 + Math.random() * 50; // Random distance
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity - 20; // Jump up slightly
            const rotate = -90 + Math.random() * 180;
            
            p.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease-out';
            p.style.transform = `translate(0px, 0px) scale(0.5) rotate(0deg)`;
            p.style.opacity = '1';
            
            this.container.appendChild(p);
            
            // Trigger reflow to start transition
            void p.offsetWidth;
            
            // Set final state for animation
            p.style.transform = `translate(${vx}px, ${vy}px) scale(1.2) rotate(${rotate}deg)`;
            p.style.opacity = '0';
            
            // Clean up DOM after animation completes
            setTimeout(() => {
                if (p.parentNode) p.remove();
            }, 600);
        }
    }
};
