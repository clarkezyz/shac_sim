/**
 * Spatial Audio Engine for SHAC Simulator
 * Adapted from SHAC Golf audio-engine.js
 *
 * Key changes from golf version:
 * - Multi-source support (play multiple tracks simultaneously)
 * - Looping playback (continuous play)
 * - Synchronized start/stop
 * - Per-source volume control
 */

class SpatialAudioEngine {
    constructor() {
        this.audioContext = null;
        this.listener = { x: 0, y: 0, z: 0 };
        this.sources = new Map(); // sourceId -> source object
        this.isPlaying = false;
        this.initialized = false;
        this.nextSourceId = 1;
    }

    async init() {
        if (this.initialized) return true;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume context on user interaction if needed
            if (this.audioContext.state === 'suspended') {
                document.addEventListener('click', async () => {
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                        console.log('AudioContext resumed after user interaction');
                    }
                }, { once: true });

                document.addEventListener('keydown', async () => {
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                        console.log('AudioContext resumed after user interaction');
                    }
                }, { once: true });
            }

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Load audio file and return AudioBuffer
     */
    async loadAudioFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    /**
     * Create a new spatial audio source
     * Returns sourceId for managing this source
     */
    createSource(audioBuffer, name, position = { x: 0, y: 0, z: 0 }) {
        const sourceId = this.nextSourceId++;

        const source = {
            id: sourceId,
            name: name,
            buffer: audioBuffer,
            position: { ...position },
            volume: 1.0,
            locked: false, // Individual lock state
            // Audio nodes (created when playing)
            node: null,
            panner: null,
            gainNode: null,
            // State
            isPlaying: false
        };

        this.sources.set(sourceId, source);
        return sourceId;
    }

    /**
     * Remove a source
     */
    removeSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) return;

        this.stopSource(sourceId);
        this.sources.delete(sourceId);
    }

    /**
     * Start playing a specific source (with looping)
     */
    startSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source || !this.audioContext) return;

        // Stop if already playing
        if (source.node) {
            try {
                source.node.stop();
            } catch (e) {
                // Already stopped
            }
        }

        // Create new audio nodes
        const bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = source.buffer;
        bufferSource.loop = true; // Enable looping for continuous playback

        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = source.volume;

        // Create panner for 3D positioning
        const panner = this.audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 100;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;

        // Set position
        this.updateSourcePosition(panner, source.position);

        // Connect nodes: source -> gain -> panner -> destination
        bufferSource.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(this.audioContext.destination);

        // Store references
        source.node = bufferSource;
        source.gainNode = gainNode;
        source.panner = panner;
        source.isPlaying = true;

        // Start playback
        bufferSource.start(0);

        // Handle end of playback (shouldn't happen with loop=true, but just in case)
        bufferSource.onended = () => {
            source.isPlaying = false;
            source.node = null;
            source.gainNode = null;
            source.panner = null;
        };
    }

    /**
     * Stop playing a specific source
     */
    stopSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source || !source.node) return;

        try {
            source.node.stop();
        } catch (e) {
            // Already stopped
        }

        source.node = null;
        source.gainNode = null;
        source.panner = null;
        source.isPlaying = false;
    }

    /**
     * Play all sources in sync
     */
    playAll() {
        if (!this.audioContext) return;

        // Start all sources at the same time
        this.sources.forEach((source, sourceId) => {
            this.startSource(sourceId);
        });

        this.isPlaying = true;
    }

    /**
     * Pause all sources
     */
    pauseAll() {
        this.sources.forEach((source, sourceId) => {
            this.stopSource(sourceId);
        });

        this.isPlaying = false;
    }

    /**
     * Update source volume (0.0 to 1.0)
     */
    setSourceVolume(sourceId, volume) {
        const source = this.sources.get(sourceId);
        if (!source) return;

        source.volume = Math.max(0, Math.min(1, volume));

        // Update gain node if currently playing
        if (source.gainNode) {
            source.gainNode.gain.value = source.volume;
        }
    }

    /**
     * Update source position
     */
    setSourcePosition(sourceId, position) {
        const source = this.sources.get(sourceId);
        if (!source) return;

        source.position = { ...position };

        // Update panner if currently playing
        if (source.panner) {
            this.updateSourcePosition(source.panner, source.position);
        }
    }

    /**
     * Update listener position
     */
    updateListenerPosition(position) {
        this.listener = { ...position };

        // Update all active source panners
        this.sources.forEach(source => {
            if (source.panner) {
                this.updateSourcePosition(source.panner, source.position);
            }
        });
    }

    /**
     * Update listener orientation (from mouse look)
     */
    updateListenerOrientation(yaw = 0, pitch = 0) {
        if (!this.audioContext || !this.audioContext.listener) return;

        // Convert yaw (horizontal rotation, degrees) and pitch (vertical rotation, degrees) to radians
        const yawRad = yaw * (Math.PI / 180);
        const pitchRad = pitch * (Math.PI / 180);

        // Calculate forward vector based on yaw and pitch
        // In Web Audio: +X is right, +Y is up, +Z is backwards (towards listener)
        // We want 0° yaw = looking forward (-Z direction in Web Audio)
        const forwardX = Math.sin(yawRad) * Math.cos(pitchRad);
        const forwardY = Math.sin(pitchRad);
        const forwardZ = -Math.cos(yawRad) * Math.cos(pitchRad);

        // Up vector (slightly affected by pitch, but generally pointing up)
        const upX = 0;
        const upY = 1;
        const upZ = 0;

        // Use modern API if available
        if (this.audioContext.listener.forwardX) {
            this.audioContext.listener.forwardX.value = forwardX;
            this.audioContext.listener.forwardY.value = forwardY;
            this.audioContext.listener.forwardZ.value = forwardZ;
            this.audioContext.listener.upX.value = upX;
            this.audioContext.listener.upY.value = upY;
            this.audioContext.listener.upZ.value = upZ;
        } else if (this.audioContext.listener.setOrientation) {
            // Fallback to deprecated API
            this.audioContext.listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
        }
    }

    /**
     * Update panner position relative to listener
     */
    updateSourcePosition(panner, sourcePosition) {
        // Calculate relative position from listener
        const relativeX = sourcePosition.x - this.listener.x;
        const relativeY = sourcePosition.y - this.listener.y;
        const relativeZ = sourcePosition.z - this.listener.z;

        if (panner.positionX) {
            // Use new API if available
            panner.positionX.value = relativeX;
            panner.positionY.value = relativeY;
            panner.positionZ.value = relativeZ;
        } else {
            // Fallback to old API
            panner.setPosition(relativeX, relativeY, relativeZ);
        }
    }

    /**
     * Get distance between two positions
     */
    getDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Get distance from listener to a source
     */
    getDistanceToSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) return Infinity;
        return this.getDistance(this.listener, source.position);
    }

    /**
     * Get angle to source in degrees (0-360)
     */
    getAngleToSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) return 0;

        const dx = source.position.x - this.listener.x;
        const dz = source.position.z - this.listener.z;

        let angle = Math.atan2(dx, dz) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        return angle;
    }

    /**
     * Get all sources (for UI display)
     */
    getSources() {
        return Array.from(this.sources.values());
    }

    /**
     * Get source by ID
     */
    getSource(sourceId) {
        return this.sources.get(sourceId);
    }

    /**
     * Toggle source lock state
     */
    toggleSourceLock(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) return false;

        source.locked = !source.locked;
        return source.locked;
    }

    /**
     * Set source lock state
     */
    setSourceLocked(sourceId, locked) {
        const source = this.sources.get(sourceId);
        if (!source) return;

        source.locked = locked;
    }
}
