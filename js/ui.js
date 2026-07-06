window.ME = window.ME || {};

ME.UI = class UI {
    constructor(engine) {
        this.engine = engine;
        this.engine.onStateChange = this.updateUI.bind(this);
        
        // Add Audio and Particles
        this.audio = new ME.Audio();
        this.particles = new ME.Particles();
        
        // Auto-merge event listener for visual feedback
        this.engine.onMergeEvent = (x, y, level, goldEarned) => {
            const cellTarget = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (cellTarget) {
                const char = ME.EvolutionChain[level];
                this.playMergeEffect(cellTarget, char.color, char.emoji, level);
            }
            this.renderBoard(); // board requires re-render to show new cells
        };
        
        this.boardEl = document.getElementById('board');
        this.goldVal = document.getElementById('gold-val');
        this.scoreVal = document.getElementById('score-val');
        this.spawnPriceEl = document.getElementById('spawn-price');
        this.timerFill = document.getElementById('timer-bar-fill');
        
        this.initBoard();
        this.bindEvents();
        
        this.isDragging = false;
        this.dragItem = null;
        this.dragSource = null;
        this.dragOffset = {x:0, y:0};
        
        // Modals
        this.shopModal = document.getElementById('shop-modal');
        this.pokedexModal = document.getElementById('pokedex-modal');
        this.questsModal = document.getElementById('quests-modal');
        this.prestigeModal = document.getElementById('prestige-modal');
        this.offlineModal = document.getElementById('offline-modal');
        
        this.completedQuests = JSON.parse(localStorage.getItem('merge_evo_quests') || '[]');
        
        // Unlock audio on first touch
        document.body.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
        
        this.updateUI();
        this.checkOfflineEarnings();
        this.startChestEventLoop();
        this.startGoldRainEvent();
        
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    initBoard() {
        this.boardEl.style.gridTemplateColumns = `repeat(${ME.Config.cols}, minmax(0, 1fr))`;
        this.boardEl.style.gridTemplateRows = `repeat(${ME.Config.rows}, minmax(0, 1fr))`;
        this.renderBoard();
    }
    
    bindEvents() {
        document.getElementById('btn-spawn').addEventListener('click', () => {
            const res = this.engine.spawn();
            if (res) {
                this.audio.playSpawn();
                this.renderBoard();
            } else {
                this.audio.playError();
            }
        });
        
        // Modals Open
        document.getElementById('btn-shop-open').addEventListener('click', () => {
            this.audio.playSpawn();
            this.shopModal.classList.remove('hidden');
        });
        document.getElementById('btn-pokedex-open').addEventListener('click', () => {
            this.audio.playSpawn();
            this.renderPokedex();
            this.pokedexModal.classList.remove('hidden');
        });
        document.getElementById('btn-quests-open').addEventListener('click', () => {
            this.audio.playSpawn();
            this.renderQuests();
            this.questsModal.classList.remove('hidden');
        });
        document.getElementById('btn-prestige-open').addEventListener('click', () => {
            this.audio.playSpawn();
            this.prestigeModal.classList.remove('hidden');
        });
        
        // Modals Close
        document.getElementById('btn-shop-close').addEventListener('click', () => this.shopModal.classList.add('hidden'));
        document.getElementById('btn-pokedex-close').addEventListener('click', () => this.pokedexModal.classList.add('hidden'));
        document.getElementById('btn-quests-close').addEventListener('click', () => this.questsModal.classList.add('hidden'));
        document.getElementById('btn-prestige-cancel').addEventListener('click', () => this.prestigeModal.classList.add('hidden'));
        
        // Prestige Confirm
        document.getElementById('btn-prestige-confirm').addEventListener('click', () => {
            this.engine.prestige();
            this.prestigeModal.classList.add('hidden');
            this.showToast('🌌 Evren Sıfırlandı! Bonuslarınız Aktif.');
            this.audio.playCoin();
            this.renderBoard();
        });
        
        // Shop - Upgrades
        document.getElementById('btn-buy-automerge').addEventListener('click', () => {
            if (this.engine.hasAutoMerge) {
                this.showToast("Bunu zaten aldın!"); return;
            }
            if (this.engine.gold >= 5000) {
                this.engine.gold -= 5000;
                this.engine.hasAutoMerge = true;
                this.engine.saveGame();
                this.showToast("🤖 Oto-Bot Başarıyla Kuruldu!");
                this.audio.playCoin();
                this.updateUI();
            } else {
                this.showToast("Yetersiz Altın!");
                this.audio.playError();
            }
        });
        
        document.getElementById('btn-buy-theme').addEventListener('click', () => {
            if (this.engine.theme === 'space') {
                this.showToast("Zaten Uzay Temasındasın!"); return;
            }
            if (this.engine.gold >= 10000) {
                this.engine.gold -= 10000;
                this.engine.theme = 'space';
                this.engine.saveGame();
                this.showToast("🌌 Uzay Teması Aktif Edildi!");
                this.audio.playCoin();
                this.updateUI();
            } else {
                this.showToast("Yetersiz Altın!");
                this.audio.playError();
            }
        });

        // Shop Items
        document.querySelectorAll('.shop-btn[data-level]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lvl = parseInt(btn.dataset.level);
                const price = parseInt(btn.dataset.price);
                const res = this.engine.buyItem(lvl, price);
                if (res) {
                    this.showToast(`Dükkandan Lv${lvl} satın alındı!`);
                    this.audio.playSpawn();
                    this.renderBoard();
                } else {
                    this.showToast("Yetersiz altın veya alan yok!");
                    this.audio.playError();
                }
            });
        });

        // Drag events
        document.addEventListener('pointerdown', this.onPointerDown.bind(this), { passive: false });
        document.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: false });
        document.addEventListener('pointerup', this.onPointerUp.bind(this));
        
        document.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    checkOfflineEarnings() {
        if (this.engine.offlineEarnings > 0) {
            document.getElementById('offline-gold').innerText = this.engine.offlineEarnings;
            this.offlineModal.classList.remove('hidden');
            this.audio.playCoin();
            
            document.getElementById('btn-offline-collect').onclick = () => {
                this.engine.clearOfflineEarnings();
                this.offlineModal.classList.add('hidden');
                this.updateUI();
            };
        }
    }
    
    startChestEventLoop() {
        setInterval(() => {
            if (Math.random() < 0.3) { 
                this.spawnChest();
            }
        }, 45000);
    }
    
    spawnChest() {
        const chest = document.createElement('div');
        chest.className = 'chest-box';
        chest.style.left = Math.floor(Math.random() * 80) + 'vw';
        
        chest.addEventListener('click', () => {
            this.engine.stats.chestsOpened++;
            this.engine.saveGame();
            this.audio.playCoin();
            
            if (Math.random() < 0.5) {
                let reward = this.engine.maxUnlockedLevel * 100 * (1 + (this.engine.prestigeLevel * 0.5));
                this.engine.addGold(reward);
                this.showToast(`🎁 Sandıktan ${reward} 🪙 çıktı!`);
                const rect = chest.getBoundingClientRect();
                this.particles.spawn(rect.left, rect.top, '#f1c40f', '🪙', 10);
            } else {
                let freeSpawnLvl = Math.max(1, this.engine.maxUnlockedLevel - 2);
                let res = this.engine.buyItem(freeSpawnLvl, 0);
                if (res) {
                    this.showToast(`🎁 Sandıktan Seviye ${freeSpawnLvl} canlı çıktı!`);
                    this.renderBoard();
                } else {
                    this.engine.addGold(200);
                    this.showToast(`🎁 Sandıktan 200 🪙 çıktı! (Yer yoktu)`);
                }
            }
            chest.remove();
        });
        
        document.body.appendChild(chest);
        setTimeout(() => { if (chest.parentNode) chest.remove(); }, 8000);
    }
    
    startGoldRainEvent() {
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance every 90 seconds
                this.triggerGoldRain();
            }
        }, 90000);
    }
    
    triggerGoldRain() {
        this.showToast("⛈️ DİKKAT: ALTIN YAĞMURU BAŞLADI!");
        this.audio.playSpawn();
        let count = 0;
        const interval = setInterval(() => {
            this.spawnRainCoin();
            count++;
            if(count > 15) clearInterval(interval);
        }, 600);
    }
    
    spawnRainCoin() {
        const coin = document.createElement('div');
        coin.innerText = '🪙';
        coin.style.position = 'fixed';
        coin.style.left = Math.floor(Math.random() * 90) + 'vw';
        coin.style.top = '-50px';
        coin.style.fontSize = '40px';
        coin.style.cursor = 'pointer';
        coin.style.zIndex = '10000';
        coin.style.transition = 'top 3s linear';
        document.body.appendChild(coin);
        
        setTimeout(() => {
            coin.style.top = '110vh';
        }, 50);
        
        coin.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // prevent triggering other things
            this.audio.playCoin();
            const reward = 30 * this.engine.maxUnlockedLevel;
            this.engine.addGold(reward);
            
            const rect = coin.getBoundingClientRect();
            this.particles.spawn(rect.left, rect.top, '#f1c40f', '✨', 3);
            coin.remove();
        });
        
        setTimeout(() => { if (coin.parentNode) coin.remove(); }, 3050);
    }
    
    renderPokedex() {
        const container = document.getElementById('pokedex-items');
        container.innerHTML = '';
        
        for (let i = 1; i < ME.EvolutionChain.length; i++) {
            const char = ME.EvolutionChain[i];
            const isUnlocked = i <= this.engine.maxUnlockedLevel;
            
            const div = document.createElement('div');
            div.className = `pokedex-item ${isUnlocked ? '' : 'locked'}`;
            
            div.innerHTML = `
                <div class="emoji" style="font-size:30px;">${isUnlocked ? char.emoji : '❓'}</div>
                <div class="name" style="font-size:12px; margin-top:5px; font-weight:bold;">${isUnlocked ? char.name : 'Bilinmiyor'}</div>
                ${isUnlocked ? `<div style="font-size:10px; color:#f1c40f;">🪙 ${char.value}</div>` : ''}
            `;
            container.appendChild(div);
        }
    }
    
    renderQuests() {
        const container = document.getElementById('quests-items');
        container.innerHTML = '';
        
        ME.Quests.forEach(quest => {
            let progress = 0;
            if (quest.type === 'merge') progress = this.engine.stats.totalMerges;
            if (quest.type === 'spawn') progress = this.engine.stats.totalSpawns;
            if (quest.type === 'chest') progress = this.engine.stats.chestsOpened;
            
            const isCompleted = this.completedQuests.includes(quest.id);
            const isReady = progress >= quest.target && !isCompleted;
            const displayProgress = Math.min(progress, quest.target);
            
            const div = document.createElement('div');
            div.className = `quest-item ${isCompleted ? 'completed' : ''}`;
            
            let btnHtml = '';
            if (isCompleted) {
                btnHtml = `<button class="quest-btn" disabled>Alındı</button>`;
            } else if (isReady) {
                btnHtml = `<button class="quest-btn" id="claim-quest-${quest.id}">🎁 Al</button>`;
            } else {
                btnHtml = `<div style="font-size:12px; color:#ccc;">${displayProgress} / ${quest.target}</div>`;
            }
            
            div.innerHTML = `
                <div>
                    <div style="font-weight:bold; font-size:14px;">${quest.title}</div>
                    <div style="font-size:11px; color:#bbb;">${quest.desc}</div>
                    <div style="font-size:12px; color:#f1c40f; margin-top:3px;">Ödül: 🪙 ${quest.reward}</div>
                </div>
                <div>${btnHtml}</div>
            `;
            container.appendChild(div);
            
            if (isReady) {
                setTimeout(() => {
                    const btn = document.getElementById(`claim-quest-${quest.id}`);
                    if (btn) {
                        btn.onclick = () => {
                            this.audio.playCoin();
                            this.completedQuests.push(quest.id);
                            localStorage.setItem('merge_evo_quests', JSON.stringify(this.completedQuests));
                            this.engine.addGold(quest.reward);
                            this.showToast(`🎉 ${quest.reward} 🪙 Kazandın!`);
                            
                            const rect = btn.getBoundingClientRect();
                            this.particles.spawn(rect.left, rect.top, '#2ecc71', '🎊', 10);
                            
                            this.renderQuests(); 
                        };
                    }
                }, 0);
            }
        });
    }

    onPointerDown(e) {
        const target = e.target.closest('.item');
        if (!target) return;
        
        e.preventDefault(); 
        
        this.isDragging = true;
        this.dragSource = {
            x: parseInt(target.parentElement.dataset.x),
            y: parseInt(target.parentElement.dataset.y)
        };
        
        const rect = target.getBoundingClientRect();
        this.dragItem = target.cloneNode(true);
        this.dragItem.classList.add('is-dragging');
        
        this.dragItem.style.width = `${rect.width}px`;
        this.dragItem.style.height = `${rect.height}px`;
        
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.dragItem.style.left = `${e.clientX - this.dragOffset.x}px`;
        this.dragItem.style.top = `${e.clientY - this.dragOffset.y}px`;
        
        document.body.appendChild(this.dragItem);
        target.classList.add('ghost');
        
        document.getElementById('sell-zone').classList.add('active');
        
        const lvl = this.engine.board[this.dragSource.y][this.dragSource.x];
        let val = ME.EvolutionChain[lvl].value;
        val = Math.floor(val * (1 + (this.engine.prestigeLevel * 0.5)));
        document.getElementById('sell-price').innerText = `Değer: 🪙 ${val}`;
        document.getElementById('sell-price').classList.remove('hidden');
    }
    
    onPointerMove(e) {
        if (!this.isDragging || !this.dragItem) return;
        e.preventDefault(); 
        
        this.dragItem.style.left = `${e.clientX - this.dragOffset.x}px`;
        this.dragItem.style.top = `${e.clientY - this.dragOffset.y}px`;
        
        const sellZone = document.getElementById('sell-zone');
        const szRect = sellZone.getBoundingClientRect();
        if (e.clientX >= szRect.left && e.clientX <= szRect.right &&
            e.clientY >= szRect.top && e.clientY <= szRect.bottom) {
            sellZone.style.background = 'rgba(231, 76, 60, 0.4)';
        } else {
            sellZone.style.background = 'rgba(0,0,0,0.4)';
        }
    }
    
    onPointerUp(e) {
        if (!this.isDragging || !this.dragItem) return;
        
        this.isDragging = false;
        document.body.removeChild(this.dragItem);
        this.dragItem = null;
        
        const sellZone = document.getElementById('sell-zone');
        sellZone.classList.remove('active');
        sellZone.style.background = 'rgba(0,0,0,0.4)';
        document.getElementById('sell-price').classList.add('hidden');
        
        const szRect = sellZone.getBoundingClientRect();
        if (e.clientX >= szRect.left && e.clientX <= szRect.right &&
            e.clientY >= szRect.top && e.clientY <= szRect.bottom) {
            const val = this.engine.sell(this.dragSource.x, this.dragSource.y);
            if (val) {
                this.audio.playCoin();
                this.showToast(`Satıldı! +${val} 🪙`);
                this.particles.spawn(e.clientX, e.clientY, '#f1c40f', '🪙', 5);
            }
            this.renderBoard();
            return;
        }
        
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const cellTarget = dropTarget ? dropTarget.closest('.cell') : null;
        
        if (cellTarget) {
            const toX = parseInt(cellTarget.dataset.x);
            const toY = parseInt(cellTarget.dataset.y);
            
            const res = this.engine.merge(this.dragSource.x, this.dragSource.y, toX, toY);
            if (res.isMerge) {
                const char = ME.EvolutionChain[res.newLevel];
                this.showToast(`Birleşme! ${char.emoji} ${char.name} (+${res.score} 🪙)`);
                this.playMergeEffect(cellTarget, char.color, char.emoji, res.newLevel);
            } else if (res.maxLevel) {
                this.showToast("Bu hücre zaten son seviyede!");
                this.audio.playError();
            } else if (!res.success && res.reason === 'different_levels') {
                this.audio.playError();
            }
        } else {
            this.audio.playError();
        }
        
        this.renderBoard();
    }
    
    playMergeEffect(cellEl, color, emoji, level) {
        const eff = document.createElement('div');
        eff.className = 'merge-effect';
        cellEl.appendChild(eff);
        setTimeout(() => { if (eff.parentNode) eff.remove(); }, 500);
        
        const rect = cellEl.getBoundingClientRect();
        this.particles.spawn(rect.left + rect.width/2, rect.top + rect.height/2, color, emoji, 12);
        this.audio.playMerge(level);
    }
    
    updateUI() {
        this.goldVal.innerText = this.engine.gold;
        this.scoreVal.innerText = this.engine.score;
        this.spawnPriceEl.innerText = this.engine.spawnPrice;
        
        const btnSpawn = document.getElementById('btn-spawn');
        if (this.engine.gold < this.engine.spawnPrice) {
            btnSpawn.classList.add('disabled');
        } else {
            btnSpawn.classList.remove('disabled');
        }
        
        const prestigeBtn = document.getElementById('btn-prestige-open');
        if (this.engine.maxUnlockedLevel >= 12) {
            prestigeBtn.classList.remove('hidden');
        } else {
            prestigeBtn.classList.add('hidden');
        }
        
        const autoMergeBtn = document.getElementById('btn-buy-automerge');
        if (this.engine.hasAutoMerge) {
            autoMergeBtn.style.opacity = '0.5';
            autoMergeBtn.querySelector('.price').innerText = 'SATIN ALINDI';
        }
        
        const themeBtn = document.getElementById('btn-buy-theme');
        if (this.engine.theme === 'space') {
            themeBtn.style.opacity = '0.5';
            themeBtn.querySelector('.price').innerText = 'AKTİF';
            
            // Apply space theme
            document.body.style.background = 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)';
            this.boardEl.style.background = 'rgba(0, 0, 0, 0.8)';
            this.boardEl.style.boxShadow = '0 0 30px rgba(100, 100, 255, 0.2)';
        } else {
            document.body.style.background = 'var(--bg-grad)';
            this.boardEl.style.background = 'rgba(0, 0, 0, 0.6)';
            this.boardEl.style.boxShadow = 'none';
        }
    }
    
    renderBoard() {
        this.boardEl.innerHTML = '';
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                const lvl = this.engine.board[y][x];
                if (lvl > 0) {
                    const char = ME.EvolutionChain[lvl];
                    const item = document.createElement('div');
                    item.className = 'item';
                    item.style.backgroundColor = char.color;
                    item.innerHTML = `<span class="emoji">${char.emoji}</span>`;
                    
                    if (lvl >= 10) item.style.boxShadow = `0 0 15px ${char.color}`;
                    cell.appendChild(item);
                }
                
                this.boardEl.appendChild(cell);
            }
        }
    }
    
    showToast(msg) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = msg;
        container.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('show'));
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }, 2000);
    }
    
    gameLoop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        this.engine.update(dt);
        
        const progress = this.engine.freeSpawnTimer / this.engine.freeSpawnInterval;
        this.timerFill.style.width = `${progress * 100}%`;
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }
};

window.onload = () => {
    const engine = new ME.Engine();
    const ui = new ME.UI(engine);
};
