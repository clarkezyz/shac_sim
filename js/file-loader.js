/**
 * File Loader for SHAC Simulator
 * Handles audio file upload via drag-and-drop or file input
 */

class FileLoader {
    constructor(audioEngine, onFilesLoaded) {
        this.audioEngine = audioEngine;
        this.onFilesLoaded = onFilesLoaded; // Callback when files are loaded

        this.fileInput = document.getElementById('file-input');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            // Reset input so same file can be selected again
            e.target.value = '';
        });

        // Global drag and drop for audio files
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files).filter(file =>
                file.type.startsWith('audio/')
            );
            if (files.length > 0) {
                this.handleFiles(files);
            }
        });
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;

        console.log(`Loading ${files.length} audio file(s)...`);

        const loadedSources = [];

        for (const file of files) {
            try {
                console.log(`Loading: ${file.name}`);

                // Decode audio file
                const audioBuffer = await this.audioEngine.loadAudioFile(file);

                // Default position: in front of listener, spread out if multiple files
                const position = this.getDefaultPosition(loadedSources.length);

                // Create source at default position
                const sourceId = this.audioEngine.createSource(
                    audioBuffer,
                    file.name,
                    position
                );

                loadedSources.push({
                    id: sourceId,
                    name: file.name,
                    duration: audioBuffer.duration
                });

                console.log(`✓ Loaded: ${file.name} at (${position.x}, ${position.y}, ${position.z})`);

            } catch (error) {
                console.error(`Failed to load ${file.name}:`, error);
                alert(`Failed to load ${file.name}`);
            }
        }

        // Callback with loaded sources
        if (loadedSources.length > 0 && this.onFilesLoaded) {
            this.onFilesLoaded(loadedSources);
        }
    }

    /**
     * Get default position for new source
     * Spreads sources in a circle around the listener
     */
    getDefaultPosition(index) {
        const radius = 10; // Distance from center
        const angle = (index / 8) * 2 * Math.PI; // Spread around circle

        return {
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius
        };
    }
}
