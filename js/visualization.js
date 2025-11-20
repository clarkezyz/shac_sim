/**
 * Visualization for SHAC Simulator
 * Displays player position and audio sources in 3D space
 * Adapted from SHAC Golf visualization.js + VisionQuest FOV culling
 *
 * Features:
 * - 180° FOV culling (only shows sources in front hemisphere)
 * - Top-down 2D projection
 * - Pulsing source indicators
 * - Distance labels
 * - Compass with direction indicator
 */

class Visualization {
    constructor(canvas, audioEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioEngine = audioEngine;
        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.scale = 20; // Pixels per unit
        this.viewMode = 'topdown'; // 'topdown' or 'firstperson'
        this.compositionMode = true; // true = composition (walk through soundscape), false = authoring (sonar mode)

        // Drag state
        this.isDragging = false;
        this.draggedSource = null;
        this.dragOffset = { x: 0, y: 0 };

        // Current render state (for hit detection)
        this.playerPos = { x: 0, y: 0, z: 0 };
        this.sources = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupDragHandlers();
    }

    /**
     * Setup mouse drag handlers for moving sources
     */
    setupDragHandlers() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    }

    onMouseDown(e) {
        // Skip if pointer is locked (FPS mouse look mode)
        if (document.pointerLockElement === this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if clicked on a source
        for (const source of this.sources) {
            // Skip locked sources - can't drag them
            if (source.locked) continue;

            // Calculate screen position based on current mode
            let screenX, screenY;
            if (this.compositionMode) {
                // Composition mode: sources at absolute positions
                screenX = this.centerX + source.position.x * this.scale;
                screenY = this.centerY - source.position.z * this.scale;
            } else {
                // Authoring mode: sources relative to player
                screenX = this.centerX + (source.position.x - this.playerPos.x) * this.scale;
                screenY = this.centerY - (source.position.z - this.playerPos.z) * this.scale;
            }

            const dx = mouseX - screenX;
            const dy = mouseY - screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if click is within source circle (with some padding)
            if (distance < 30) {
                this.isDragging = true;
                this.draggedSource = source;
                this.dragOffset = { x: dx, y: dy };
                this.canvas.style.cursor = 'grabbing';
                break;
            }
        }
    }

    onMouseMove(e) {
        // Skip if pointer is locked (FPS mouse look mode)
        if (document.pointerLockElement === this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.isDragging && this.draggedSource) {
            // Calculate new world position based on mode
            let worldX, worldZ;
            if (this.compositionMode) {
                // Composition mode: absolute world positions
                worldX = ((mouseX - this.dragOffset.x) - this.centerX) / this.scale;
                worldZ = -((mouseY - this.dragOffset.y) - this.centerY) / this.scale;
            } else {
                // Authoring mode: relative to player
                worldX = ((mouseX - this.dragOffset.x) - this.centerX) / this.scale + this.playerPos.x;
                worldZ = -((mouseY - this.dragOffset.y) - this.centerY) / this.scale + this.playerPos.z;
            }

            // Update source position in audio engine
            this.audioEngine.setSourcePosition(this.draggedSource.id, {
                x: worldX,
                y: this.draggedSource.position.y,
                z: worldZ
            });
        } else {
            // Update cursor based on hover
            let hovering = false;
            for (const source of this.sources) {
                if (source.locked) continue; // Skip locked sources

                // Calculate screen position based on current mode
                let screenX, screenY;
                if (this.compositionMode) {
                    screenX = this.centerX + source.position.x * this.scale;
                    screenY = this.centerY - source.position.z * this.scale;
                } else {
                    screenX = this.centerX + (source.position.x - this.playerPos.x) * this.scale;
                    screenY = this.centerY - (source.position.z - this.playerPos.z) * this.scale;
                }

                const dx = mouseX - screenX;
                const dy = mouseY - screenY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30) {
                    hovering = true;
                    break;
                }
            }
            this.canvas.style.cursor = hovering ? 'grab' : 'default';
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.draggedSource = null;
        this.canvas.style.cursor = 'default';
    }

    /**
     * Toggle between top-down and first-person view
     */
    toggleViewMode() {
        this.viewMode = this.viewMode === 'topdown' ? 'firstperson' : 'topdown';
        return this.viewMode;
    }

    /**
     * Set view mode explicitly
     */
    setViewMode(mode) {
        this.viewMode = mode;
    }

    /**
     * Toggle between authoring and composition mode
     */
    toggleCompositionMode() {
        this.compositionMode = !this.compositionMode;
        return this.compositionMode;
    }

    /**
     * Get current mode
     */
    isCompositionMode() {
        return this.compositionMode;
    }

    resize() {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    /**
     * Main render function
     */
    render(player, sources, playerFacing) {
        // Store state for hit detection
        this.playerPos = player;
        this.sources = sources;

        // Clear with dark background (like online player)
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid
        this.drawGrid();

        // Draw angle lines from listener to sources
        this.drawAngleLines(sources, player);

        // Draw sources (with FOV culling)
        sources.forEach(source => {
            this.drawSource(source, player, playerFacing);
        });

        // Draw player (position depends on lock state)
        this.drawPlayer(player, playerFacing);

        // Draw compass
        this.drawCompass(playerFacing);
    }

    /**
     * Draw angle lines from listener to each source
     */
    drawAngleLines(sources, player) {
        sources.forEach(source => {
            const screenX = this.centerX + (source.position.x - player.x) * this.scale;
            const screenY = this.centerY - (source.position.z - player.z) * this.scale;

            // Draw line from center to source
            this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(screenX, screenY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = this.centerX % (this.scale * 5); x < this.width; x += this.scale * 5) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = this.centerY % (this.scale * 5); y < this.height; y += this.scale * 5) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Center axes (brighter)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;

        // X axis
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);
        this.ctx.lineTo(this.width, this.centerY);
        this.ctx.stroke();

        // Z axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 0);
        this.ctx.lineTo(this.centerX, this.height);
        this.ctx.stroke();
    }

    /**
     * Draw a source (audio track)
     */
    drawSource(source, playerPos, playerFacing) {
        // Calculate screen position based on GLOBAL mode (not per-source lock)
        let screenX, screenY, relativeX, relativeZ;

        if (this.compositionMode) {
            // COMPOSITION MODE: Sources fixed in world space, player walks through
            // Show source at its absolute world position
            screenX = this.centerX + source.position.x * this.scale;
            screenY = this.centerY - source.position.z * this.scale;

            // Calculate distance from player's actual position in world
            relativeX = source.position.x - playerPos.x;
            relativeZ = source.position.z - playerPos.z;
        } else {
            // AUTHORING MODE: Player at center (sonar), sources orbit you
            relativeX = source.position.x - playerPos.x;
            relativeZ = source.position.z - playerPos.z;

            screenX = this.centerX + relativeX * this.scale;
            screenY = this.centerY - relativeZ * this.scale;
        }

        // Calculate distance
        const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
        if (distance < 0.001) return; // Skip sources at listener position

        // FOV culling - only in first-person mode and when NOT locked
        if (this.viewMode === 'firstperson' && !this.positionsLocked) {
            // Calculate azimuth (angle from forward direction)
            let azimuth = Math.atan2(relativeX, relativeZ) * (180 / Math.PI);

            // Apply player rotation to get view-relative angle
            azimuth -= playerFacing;

            // Normalize to -180 to 180 range
            while (azimuth > 180) azimuth -= 360;
            while (azimuth < -180) azimuth += 360;

            // FOV culling: Only show sources in front hemisphere (±90°)
            if (Math.abs(azimuth) > 90) {
                return; // Source is behind viewer
            }
        }

        // Don't draw if off screen
        if (screenX < -50 || screenX > this.width + 50 || screenY < -50 || screenY > this.height + 50) {
            return;
        }

        // Calculate radius based on distance
        // Closer = bigger, farther = smaller
        // Base size: 25px at distance 0, 8px at distance 20+
        const baseRadius = 25;
        const minRadius = 8;
        const maxDistance = 20;
        const distanceFactor = Math.max(0, 1 - (distance / maxDistance));
        const radius = minRadius + (baseRadius - minRadius) * distanceFactor;

        // Check if this source is being dragged
        const isBeingDragged = this.isDragging && this.draggedSource && this.draggedSource.id === source.id;

        // Pulsing animation (faster when dragging, slower when locked)
        const pulseSpeed = isBeingDragged ? 300 : (source.locked ? 2000 : 1000);
        const pulsePhase = (Date.now() / pulseSpeed) % 1;
        const pulseAmount = isBeingDragged ? 0.3 : (source.locked ? 0.05 : 0.15);
        const pulse = 1 + Math.sin(pulsePhase * Math.PI * 2) * pulseAmount;

        // Color logic: dragging > locked > unlocked
        const colorIntensity = Math.max(0.3, distanceFactor);
        let mainColor, glowColor0, glowColor1;

        if (isBeingDragged) {
            // Orange when dragging
            mainColor = '#ffaa00';
            glowColor0 = 'rgba(255, 170, 0, 0.6)';
            glowColor1 = 'rgba(255, 170, 0, 0.2)';
        } else if (source.locked) {
            // Blue/cyan when locked (fixed in world space)
            const blue = Math.round(colorIntensity * 200);
            const cyan = Math.round(colorIntensity * 255);
            mainColor = `rgb(0, ${blue}, ${cyan})`;
            glowColor0 = `rgba(0, ${blue}, ${cyan}, ${0.4 * colorIntensity})`;
            glowColor1 = `rgba(0, ${blue}, ${cyan}, ${0.1 * colorIntensity})`;
        } else {
            // Green when unlocked (editable)
            const green = Math.round(colorIntensity * 255);
            const blue = Math.round(colorIntensity * 136);
            mainColor = `rgb(0, ${green}, ${blue})`;
            glowColor0 = `rgba(0, ${green}, ${blue}, ${0.3 * colorIntensity})`;
            glowColor1 = `rgba(0, ${green}, ${blue}, ${0.1 * colorIntensity})`;
        }

        // Glow
        const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * pulse * 2);
        gradient.addColorStop(0, glowColor0);
        gradient.addColorStop(0.5, glowColor1);
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius * pulse * 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Main circle
        this.ctx.fillStyle = mainColor;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius * pulse, 0, Math.PI * 2);
        this.ctx.fill();

        // Outline when dragging
        if (isBeingDragged) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Inner circle
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius * pulse * 0.6, 0, Math.PI * 2);
        this.ctx.fill();

        // Label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.truncateName(source.name), screenX, screenY + radius * pulse + 20);

        // Distance indicator (reuse distance from earlier calculation)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`${distance.toFixed(1)}m`, screenX, screenY + radius * pulse + 35);
    }

    /**
     * Draw player
     * Authoring mode: Always at center (sonar station)
     * Composition mode: Moves through world space
     */
    drawPlayer(playerPos, facing) {
        const time = Date.now() / 1000;

        // Calculate player screen position based on global mode
        let playerX, playerY;
        if (this.compositionMode) {
            // COMPOSITION MODE: Player moves through world space
            playerX = this.centerX + playerPos.x * this.scale;
            playerY = this.centerY - playerPos.z * this.scale;
        } else {
            // AUTHORING MODE: Player always at center (sonar station)
            playerX = this.centerX;
            playerY = this.centerY;
        }

        // Body circle - darker pink with border (online player style)
        const radius = 12;

        // Outer border
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, radius + 1, 0, Math.PI * 2);
        this.ctx.stroke();

        // Main body - darker pink (#c85a8e from online player)
        this.ctx.fillStyle = '#c85a8e';
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Sound wave direction indicator (instead of arrow)
        // Convert from game coords (0=north) to canvas coords (0=east)
        const dirAngle = (facing - 90) * Math.PI / 180;

        // Draw 3 concentric sound wave arcs showing listening direction
        for (let i = 0; i < 3; i++) {
            const waveRadius = 18 + (i * 6);
            const arcLength = Math.PI / 3; // 60 degree arc
            const startAngle = dirAngle - arcLength / 2;
            const endAngle = dirAngle + arcLength / 2;

            this.ctx.strokeStyle = `rgba(200, 90, 142, ${0.6 - i * 0.15})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(playerX, playerY, waveRadius, startAngle, endAngle);
            this.ctx.stroke();
        }

        // Small directional indicator line for clarity
        const dirLength = 20;
        const dirX = playerX + Math.cos(dirAngle) * dirLength;
        const dirY = playerY + Math.sin(dirAngle) * dirLength;

        this.ctx.strokeStyle = 'rgba(200, 90, 142, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(playerX, playerY);
        this.ctx.lineTo(dirX, dirY);
        this.ctx.stroke();

        // Player label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('YOU', playerX, playerY + 50);
    }

    /**
     * Draw compass showing direction
     */
    drawCompass(facing) {
        const x = 60;
        const y = 60;
        const radius = 40;

        // Compass circle background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Compass ring
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // North indicator
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('N', x, y - radius + 15);

        // Direction needle
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate((facing - 90) * Math.PI / 180);

        this.ctx.fillStyle = '#00ff88';
        this.ctx.beginPath();
        this.ctx.moveTo(radius - 10, 0);
        this.ctx.lineTo(-10, 5);
        this.ctx.lineTo(-10, -5);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();

        // Facing angle text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`${Math.round(facing)}°`, x, y + radius + 10);
    }

    /**
     * Truncate long file names
     */
    truncateName(name, maxLength = 20) {
        if (name.length <= maxLength) return name;

        // Remove extension
        const nameWithoutExt = name.replace(/\.[^/.]+$/, '');

        if (nameWithoutExt.length <= maxLength - 3) {
            return nameWithoutExt;
        }

        return nameWithoutExt.substring(0, maxLength - 3) + '...';
    }
}
