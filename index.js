class NeuroGame {
    constructor() {
        this.grid = document.getElementById('game-grid');
        this.startBtn = document.getElementById('start-btn');
        this.multiBtn = document.getElementById('multi-btn');
        this.levelVal = document.getElementById('level-val');
        this.bestVal = document.getElementById('best-val');
        this.message = document.getElementById('message');
        this.multiIndicator = document.getElementById('multiplayer-indicator');

        // Audio Context for Iconic Sounds
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.sequence = [];
        this.playerSequence = [];
        this.level = 1;
        this.gridSize = 3; // Reset to 3x3 for an easier start
        this.baseSpeed = 700;
        this.batchSize = 6; // Start with 6 numbers as requested
        this.bestScore = localStorage.getItem('neuro_best') || 0;
        this.isMultiplayer = false;
        this.currentPlayer = 1;
        this.isPlaying = false;
        this.canInput = false;

        this.bestVal.textContent = this.bestScore;
        this.initGrid();
        this.setupEventListeners();
    }

    initGrid() {
        this.grid.innerHTML = '';
        this.grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        const totalCells = this.gridSize * this.gridSize;
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.innerText = i + 1;
            // Adjust font size for larger grids
            if (this.gridSize > 3) cell.style.fontSize = this.gridSize > 4 ? '1rem' : '1.2rem';
            this.grid.appendChild(cell);
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.multiBtn.addEventListener('click', () => this.toggleMultiplayer());

        this.grid.addEventListener('click', (e) => {
            if (!this.canInput) return;
            const cell = e.target.closest('.cell');
            if (cell) {
                const index = parseInt(cell.dataset.index);
                this.handleInput(index);
            }
        });
    }

    toggleMultiplayer() {
        if (this.isPlaying) return;
        this.isMultiplayer = !this.isMultiplayer;
        this.multiBtn.textContent = this.isMultiplayer ? "SINGLE PLAYER MODE" : "PASS & PLAY MODE";
        this.multiIndicator.style.display = this.isMultiplayer ? "block" : "none";
        this.updateMessage(this.isMultiplayer ? "Multiplayer Active" : "Single Player Active");
    }

    updateMessage(text, color = '') {
        this.message.textContent = text;
        this.message.style.color = color || 'var(--accent-glow)';
    }

    async startGame() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.level = 1;
        this.currentPlayer = 1;
        this.sequence = [];
        this.startBtn.style.display = 'none';
        this.multiBtn.style.display = 'none';
        await this.nextRound();
    }

    async nextRound() {
        this.canInput = false;
        this.playerSequence = [];
        this.levelVal.textContent = this.level;

        // Smoother Grid Expansion
        if (this.level > 10) {
            this.gridSize = 5;
            this.initGrid();
        } else if (this.level > 4) {
            this.gridSize = 4;
            this.initGrid();
        }

        this.updateMessage(`LEVEL ${this.level}: MEMORIZE ${this.batchSize}`, "var(--accent-glow)");

        this.sequence = [];
        const totalCells = this.gridSize * this.gridSize;
        for (let i = 0; i < this.batchSize; i++) {
            this.sequence.push(Math.floor(Math.random() * totalCells));
        }

        // Speed scales with batch size
        this.currentSpeed = Math.max(180, 600 - (this.batchSize * 15));

        await this.showSequence();

        this.updateMessage("REPLICATE SEQUENCE", "var(--primary-glow)");
        this.canInput = true;
    }

    updateDifficulty() {
        // Expand grid at milestones
        let newGridSize = 3;
        if (this.level > 10) newGridSize = 5;
        else if (this.level > 5) newGridSize = 4;

        if (newGridSize !== this.gridSize) {
            this.gridSize = newGridSize;
            this.initGrid();
        }

        // Increase speed (minimum 200ms)
        this.currentSpeed = Math.max(200, this.baseSpeed - (this.level * 40));
    }

    async showSequence() {
        const cells = Array.from(this.grid.children);
        const displayTime = this.currentSpeed * 0.7;

        for (const index of this.sequence) {
            await this.sleep(this.currentSpeed * 0.4);
            this.playNote(200 + (index * 40), 0.08);
            cells[index].classList.add('sequence-item', 'active');
            await this.sleep(displayTime);
            cells[index].classList.remove('sequence-item', 'active');
        }
    }

    playNote(freq, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    handleInput(index) {
        const cells = Array.from(this.grid.children);
        cells[index].classList.add('active');
        this.playNote(300 + (index * 40), 0.05);
        setTimeout(() => cells[index].classList.remove('active'), 200);

        this.playerSequence.push(index);

        // Check if correct
        if (this.playerSequence[this.playerSequence.length - 1] !== this.sequence[this.playerSequence.length - 1]) {
            this.playNote(100, 0.5); // Error sound
            this.gameOver();
            return;
        }

        // Check if finished sequence
        if (this.playerSequence.length === this.sequence.length) {
            this.canInput = false;
            this.playNote(800, 0.1);
            setTimeout(() => this.playNote(1200, 0.1), 100);
            this.updateMessage("NEURAL SYNCED", "var(--correct)");

            setTimeout(async () => {
                if (this.isMultiplayer) {
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                }
                this.level++;
                this.batchSize += 1; // Increment by 1 each level (6, 7, 8, 9...)
                await this.nextRound();
            }, 1000);
        }
    }

    gameOver() {
        this.canInput = false;
        this.isPlaying = false;

        const finalIQ = this.calculateIQ(this.level);

        if (this.isMultiplayer) {
            this.updateMessage(`PLAYER ${this.currentPlayer} FAILED!`, "var(--wrong)");
        } else {
            this.updateMessage("NEURAL COLLAPSE", "var(--wrong)");
        }

        if (this.level > this.bestScore && !this.isMultiplayer) {
            this.bestScore = this.level;
            localStorage.setItem('neuro_best', this.bestScore);
            this.bestVal.textContent = this.bestScore;
        }

        setTimeout(() => {
            alert(`Game Over! Level: ${this.level}\nEstimated Neural IQ: ${finalIQ}`);
            this.startBtn.style.display = 'block';
            this.multiBtn.style.display = 'block';
            this.startBtn.textContent = "RE-INITIALIZE";
            this.level = 1;
            this.gridSize = 3;
            this.batchSize = 6;
            this.initGrid();
            this.levelVal.textContent = "1";
        }, 500);
    }

    calculateIQ(level) {
        // Just a fun flavor calculation
        return 80 + (level * 8);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game on load
window.addEventListener('load', () => {
    new NeuroGame();
});
