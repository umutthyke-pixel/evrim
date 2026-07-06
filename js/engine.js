window.ME = window.ME || {};

ME.Engine = class Engine {
    constructor() {
        this.gold = 50;
        this.score = 0;
        this.spawnPrice = ME.Config.baseSpawnPrice;
        this.spawnCount = 0;
        
        this.freeSpawnTimer = 0;
        this.freeSpawnInterval = 5; 
        
        this.maxUnlockedLevel = 1;
        this.prestigeLevel = 0;
        this.stats = { totalMerges: 0, totalSpawns: 0, chestsOpened: 0 };
        this.offlineEarnings = 0; 
        
        // Phase 2 features
        this.hasAutoMerge = false;
        this.theme = 'default';
        this.autoMergeTimer = 0;
        
        // 2D Board state
        this.board = [];
        for (let y = 0; y < ME.Config.rows; y++) {
            this.board[y] = [];
            for (let x = 0; x < ME.Config.cols; x++) {
                this.board[y][x] = 0;
            }
        }
        
        this.onStateChange = null; 
        this.onMergeEvent = null; // for particles/audio
        this.loadGame();
    }
    
    saveGame() {
        const data = {
            gold: this.gold,
            score: this.score,
            spawnPrice: this.spawnPrice,
            spawnCount: this.spawnCount,
            board: this.board,
            maxUnlockedLevel: this.maxUnlockedLevel,
            prestigeLevel: this.prestigeLevel,
            stats: this.stats,
            hasAutoMerge: this.hasAutoMerge,
            theme: this.theme,
            lastSaved: Date.now()
        };
        localStorage.setItem('merge_evo_save', JSON.stringify(data));
    }
    
    loadGame() {
        const saved = localStorage.getItem('merge_evo_save');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.gold = data.gold || 50;
                this.score = data.score || 0;
                this.spawnPrice = data.spawnPrice || ME.Config.baseSpawnPrice;
                this.spawnCount = data.spawnCount || 0;
                if (data.board && data.board.length === ME.Config.rows) {
                    this.board = data.board;
                }
                this.maxUnlockedLevel = data.maxUnlockedLevel || 1;
                this.prestigeLevel = data.prestigeLevel || 0;
                this.stats = data.stats || { totalMerges: 0, totalSpawns: 0, chestsOpened: 0 };
                this.hasAutoMerge = data.hasAutoMerge || false;
                this.theme = data.theme || 'default';
                
                if (data.lastSaved) {
                    this.calculateOfflineEarnings(data.lastSaved);
                }
            } catch (e) {
                console.error("Save file corrupted, starting fresh.");
            }
        }
        
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                if (this.board[y][x] > this.maxUnlockedLevel) {
                    this.maxUnlockedLevel = this.board[y][x];
                }
            }
        }
    }
    
    calculateOfflineEarnings(lastSavedTime) {
        const now = Date.now();
        const secondsPassed = Math.floor((now - lastSavedTime) / 1000);
        if (secondsPassed < 60) return; 
        
        let offlineRate = 0;
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                let lvl = this.board[y][x];
                if (lvl > 0) {
                    offlineRate += lvl;
                }
            }
        }
        
        if (offlineRate > 0) {
            const prestigeBonus = 1 + (this.prestigeLevel * 0.5);
            const cappedSeconds = Math.min(secondsPassed, 86400); 
            const cappedEarned = Math.floor(cappedSeconds * offlineRate * prestigeBonus);
            
            this.gold += cappedEarned;
            this.offlineEarnings = cappedEarned;
        }
    }

    clearOfflineEarnings() {
        this.offlineEarnings = 0;
    }
    
    prestige() {
        this.prestigeLevel++;
        this.gold = 50;
        this.score = 0;
        this.spawnPrice = ME.Config.baseSpawnPrice;
        this.spawnCount = 0;
        this.maxUnlockedLevel = 1;
        // Keep auto-merge and theme across prestige
        
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                this.board[y][x] = 0;
            }
        }
        this.saveGame();
        if (this.onStateChange) this.onStateChange();
    }
    
    merge(fromX, fromY, toX, toY) {
        if (fromX === toX && fromY === toY) return { success: false };
        let fromLvl = this.board[fromY][fromX];
        let toLvl = this.board[toY][toX];
        if (fromLvl === 0) return { success: false };
        
        if (toLvl === 0) {
            this.board[toY][toX] = fromLvl;
            this.board[fromY][fromX] = 0;
            this.saveGame();
            return { success: true, newLevel: fromLvl, isMerge: false };
        }
        
        if (fromLvl === toLvl) {
            const maxLevel = ME.EvolutionChain.length - 1;
            if (fromLvl >= maxLevel) return { success: false, maxLevel: true }; 
            
            const nextLvl = fromLvl + 1;
            this.board[toY][toX] = nextLvl;
            this.board[fromY][fromX] = 0;
            
            if (nextLvl > this.maxUnlockedLevel) {
                this.maxUnlockedLevel = nextLvl;
            }
            this.stats.totalMerges++;
            
            let earned = ME.EvolutionChain[nextLvl].value;
            earned = Math.floor(earned * (1 + (this.prestigeLevel * 0.5)));
            
            this.score += earned;
            this.gold += earned;
            
            this.saveGame();
            if (this.onStateChange) this.onStateChange();
            if (this.onMergeEvent) this.onMergeEvent(toX, toY, nextLvl, earned);
            return { success: true, newLevel: nextLvl, isMerge: true, score: earned };
        }
        return { success: false, reason: 'different_levels' };
    }
    
    sell(x, y) {
        let lvl = this.board[y][x];
        if (lvl === 0) return false;
        
        let value = ME.EvolutionChain[lvl].value;
        value = Math.floor(value * (1 + (this.prestigeLevel * 0.5)));
        
        this.gold += value;
        this.board[y][x] = 0;
        
        this.saveGame();
        if (this.onStateChange) this.onStateChange();
        return value;
    }
    
    canSpawn() {
        if (this.gold < this.spawnPrice) return false;
        let hasSpace = false;
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                if (this.board[y][x] === 0) { hasSpace = true; break; }
            }
            if (hasSpace) break;
        }
        return hasSpace;
    }
    
    spawn() {
        if (!this.canSpawn()) return null;
        
        this.gold -= this.spawnPrice;
        this.spawnCount++;
        this.stats.totalSpawns++;
        
        this.spawnPrice = Math.floor(ME.Config.baseSpawnPrice * Math.pow(ME.Config.spawnPriceMultiplier, this.spawnCount));
        
        let empties = [];
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                if (this.board[y][x] === 0) empties.push({x, y});
            }
        }
        
        const cell = empties[Math.floor(Math.random() * empties.length)];
        const lvl = Math.random() < 0.1 ? 2 : 1;
        this.board[cell.y][cell.x] = lvl;
        
        this.saveGame();
        if (this.onStateChange) this.onStateChange();
        return { x: cell.x, y: cell.y, level: lvl };
    }
    
    update(dt) {
        // Spawner
        this.freeSpawnTimer += dt;
        if (this.freeSpawnTimer >= this.freeSpawnInterval) {
            this.freeSpawnTimer = 0;
            this.spawnFree();
            this.saveGame();
        }
        
        // Auto-Merge Logic (runs every 1.5 seconds if enabled)
        if (this.hasAutoMerge) {
            this.autoMergeTimer += dt;
            if (this.autoMergeTimer >= 1.5) {
                this.autoMergeTimer = 0;
                this.runAutoMerge();
            }
        }
    }
    
    runAutoMerge() {
        // Find any two matching levels and merge them
        let found = false;
        let sources = [];
        
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                let lvl = this.board[y][x];
                if (lvl > 0 && lvl < (ME.EvolutionChain.length - 1)) {
                    sources.push({x, y, lvl});
                }
            }
        }
        
        if (sources.length < 2) return;
        
        for (let i = 0; i < sources.length; i++) {
            for (let j = i+1; j < sources.length; j++) {
                if (sources[i].lvl === sources[j].lvl) {
                    // Match found!
                    this.merge(sources[i].x, sources[i].y, sources[j].x, sources[j].y);
                    return; // Do one merge per tick
                }
            }
        }
    }
    
    spawnFree() {
        let empties = [];
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                if (this.board[y][x] === 0) empties.push({x, y});
            }
        }
        if (empties.length === 0) return null;
        
        const cell = empties[Math.floor(Math.random() * empties.length)];
        this.board[cell.y][cell.x] = 1; 
        
        this.saveGame();
        if (this.onStateChange) this.onStateChange();
        return { x: cell.x, y: cell.y, level: 1 };
    }
    
    buyItem(level, price) {
        if (this.gold < price) return false;
        
        let empties = [];
        for (let y = 0; y < ME.Config.rows; y++) {
            for (let x = 0; x < ME.Config.cols; x++) {
                if (this.board[y][x] === 0) empties.push({x, y});
            }
        }
        if (empties.length === 0) return false;
        
        this.gold -= price;
        const cell = empties[Math.floor(Math.random() * empties.length)];
        this.board[cell.y][cell.x] = level;
        
        if (level > this.maxUnlockedLevel) this.maxUnlockedLevel = level;
        
        this.saveGame();
        if (this.onStateChange) this.onStateChange();
        return { x: cell.x, y: cell.y, level: level };
    }
    
    addGold(amount) {
        this.gold += amount;
        this.saveGame();
        if (this.onStateChange) this.onStateChange();
    }
};
