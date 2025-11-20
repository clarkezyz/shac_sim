/**
 * SHAC Simulator - Main Application
 * Orchestrates all components
 */

class SHACSimulator {
    constructor() {
        // Core components
        this.audioEngine = null;
        this.movement = null;
        this.visualization = null;
        this.fileLoader = null;
        this.sourceManager = null;

        // State
        this.isPlaying = false;

        // UI elements
        this.loadingScreen = document.getElementById('loading');
        this.experienceScreen = document.getElementById('experience');
        this.addSourceBtn = document.getElementById('add-source-btn');
        this.fileInput = document.getElementById('file-input');
        this.controls = document.getElementById('controls');
        this.playAllBtn = document.getElementById('play-all');
        this.pauseAllBtn = document.getElementById('pause-all');
        this.resetPositionBtn = document.getElementById('reset-position');
        this.viewToggleBtn = document.getElementById('view-toggle-btn');
        this.viewModeLabel = document.getElementById('view-mode-label');
        this.modeToggleBtn = document.getElementById('mode-toggle');

        this.init();
    }

    async init() {
        try {
            console.log('Initializing SHAC Simulator...');

            // Initialize audio engine
            this.audioEngine = new SpatialAudioEngine();

            // Wait for user interaction to initialize audio
            this.loadingScreen.addEventListener('click', async () => {
                await this.audioEngine.init();
                this.loadingScreen.classList.remove('active');
                this.experienceScreen.classList.add('active');
                this.startApp();
            });

            console.log('SHAC Simulator ready. Click to start.');

        } catch (error) {
            console.error('Failed to initialize SHAC Simulator:', error);
            this.loadingScreen.querySelector('.status').textContent = 'Error initializing. Please refresh.';
        }
    }

    startApp() {
        console.log('Starting SHAC Simulator...');

        // Initialize movement controller
        this.movement = new MovementController(this.audioEngine);

        // Initialize visualization
        const canvas = document.getElementById('visualizer');
        this.visualization = new Visualization(canvas, this.audioEngine);

        // Initialize source manager
        this.sourceManager = new SourceManager(this.audioEngine);

        // Initialize file loader
        this.fileLoader = new FileLoader(
            this.audioEngine,
            (loadedSources) => this.onFilesLoaded(loadedSources)
        );

        // Setup UI event listeners
        this.setupUIListeners();

        // Start render loop
        this.startRenderLoop();

        console.log('✓ SHAC Simulator started');
    }

    setupUIListeners() {
        // Add Source button - triggers file browser
        this.addSourceBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Play all button
        this.playAllBtn.addEventListener('click', () => {
            this.audioEngine.playAll();
            this.isPlaying = true;
            this.playAllBtn.style.display = 'none';
            this.pauseAllBtn.style.display = 'inline-flex';
        });

        // Pause all button
        this.pauseAllBtn.addEventListener('click', () => {
            this.audioEngine.pauseAll();
            this.isPlaying = false;
            this.playAllBtn.style.display = 'inline-flex';
            this.pauseAllBtn.style.display = 'none';
        });

        // Reset position button
        this.resetPositionBtn.addEventListener('click', () => {
            this.movement.resetPosition();
            console.log('Position reset');
        });

        // View mode toggle button
        this.viewToggleBtn.addEventListener('click', () => {
            const newMode = this.visualization.toggleViewMode();
            if (newMode === 'topdown') {
                this.viewModeLabel.textContent = '📍 Top-Down';
            } else {
                this.viewModeLabel.textContent = '👁️ First-Person';
            }
            console.log(`Switched to ${newMode} view`);
        });

        // Mode toggle button (authoring vs composition)
        this.modeToggleBtn.addEventListener('click', () => {
            const isComposition = this.visualization.toggleCompositionMode();
            if (isComposition) {
                // Composition mode - walk through soundscape
                this.modeToggleBtn.querySelector('span').textContent = '🎵 Composition Mode';
                console.log('Composition mode - walk through your spatial soundscape');
            } else {
                // Authoring mode - sonar station
                this.modeToggleBtn.querySelector('span').textContent = '🎨 Authoring Mode';
                console.log('Authoring mode - position and arrange sources');
            }
        });
    }

    onFilesLoaded(loadedSources) {
        console.log(`Loaded ${loadedSources.length} audio sources`);

        // Update source list
        this.sourceManager.updateSourceList();

        // Auto-play the sources if this is the first load
        if (!this.isPlaying && this.audioEngine.getSources().length > 0) {
            setTimeout(() => {
                this.audioEngine.playAll();
                this.isPlaying = true;
                this.playAllBtn.style.display = 'none';
                this.pauseAllBtn.style.display = 'inline-flex';
            }, 500);
        }
    }

    startRenderLoop() {
        const render = () => {
            // Get current state
            const playerPos = this.movement.getPosition();
            const playerFacing = this.movement.getFacing();
            const sources = this.audioEngine.getSources();

            // Render visualization
            this.visualization.render(playerPos, sources, playerFacing);

            // Continue loop
            requestAnimationFrame(render);
        };

        render();
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.shacSimulator = new SHACSimulator();
});
