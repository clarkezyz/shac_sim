/**
 * Movement Controller for SHAC Simulator
 * Optimized for fast, responsive repositioning (not VisionQuest's slow exploration)
 *
 * Key Features:
 * 1. Rotation-Aware Movement: WASD moves in direction you're LOOKING
 * 2. Fast Speed: 5x faster than VisionQuest for quick source positioning
 * 3. No Elevation Scaling: Removed VisionQuest's cos^6 drag for responsiveness
 * 4. Movement Bubble: Clamps position to 50 units from origin
 * 5. View-Relative Controls: W = forward (where you look), not world +Z
 *
 * Handles:
 * - WASD keyboard movement (rotation-aware, FAST)
 * - Mouse look (click and drag)
 * - Gamepad support (left stick = move, right stick = look)
 * - Player position and orientation tracking
 */

class MovementController {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;

        // Player position and facing
        this.player = { x: 0, y: 0, z: 0 };
        this.playerFacing = 0; // Direction player is facing in degrees (0 = north)
        this.playerPitch = 0; // Vertical look angle in degrees (-90 to 90)

        // Movement settings (optimized for simulator - much faster than VisionQuest)
        this.moveSpeed = 0.5; // Units per frame (5x faster than VisionQuest)
        this.fastMoveSpeed = 1.5; // Sprint speed (5x faster)
        this.movementRadius = 50.0; // Larger movement bubble for simulator

        // Input state
        this.keys = {};
        this.gamepadIndex = null;
        this.gamepadButtonPressed = false;

        // Mouse look state
        this.mouseLook = {
            isLocked: false,
            sensitivity: 0.2 // degrees per pixel
        };

        this.setupEventListeners();
        this.startGamepadLoop();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Pointer Lock for FPS-style mouse look
        const canvas = document.getElementById('visualizer');
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Pointer lock change events
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('pointerlockerror', () => console.error('Pointer lock error'));

        // Mouse movement when pointer is locked
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Gamepad support
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIndex = e.gamepad.index;
            console.log('Gamepad connected:', e.gamepad.id);
        });

        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadIndex = null;
            console.log('Gamepad disconnected');
        });
    }

    handleKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;

        const shift = e.shiftKey;
        const speed = shift ? this.fastMoveSpeed : this.moveSpeed;

        // Movement is now view-relative:
        // dx = strafe (left/right)
        // dy = elevation (up/down)
        // dz = forward/backward
        switch(e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.movePlayer(0, 0, speed); // Forward
                break;
            case 's':
            case 'arrowdown':
                this.movePlayer(0, 0, -speed); // Backward
                break;
            case 'a':
            case 'arrowleft':
                this.movePlayer(-speed, 0, 0); // Strafe left
                break;
            case 'd':
            case 'arrowright':
                this.movePlayer(speed, 0, 0); // Strafe right
                break;
            case 'q':
                this.movePlayer(0, speed, 0); // Up (world Y)
                break;
            case 'e':
                this.movePlayer(0, -speed, 0); // Down (world Y)
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    handleCanvasClick(e) {
        // Don't interfere with UI clicks
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        if (e.target.closest('.controls')) return; // Don't lock on UI panels

        // Don't lock if cursor is 'grab' (hovering over a source for dragging)
        const canvas = document.getElementById('visualizer');
        if (canvas.style.cursor === 'grab') return;

        // Request pointer lock for FPS-style mouse look
        canvas.requestPointerLock();
    }

    handlePointerLockChange() {
        const canvas = document.getElementById('visualizer');
        if (document.pointerLockElement === canvas) {
            this.mouseLook.isLocked = true;
            console.log('Mouse look enabled - move mouse to rotate, ESC to exit');
        } else {
            this.mouseLook.isLocked = false;
            console.log('Mouse look disabled');
        }
    }

    handleMouseMove(e) {
        // Only handle mouse movement when pointer is locked
        if (!this.mouseLook.isLocked) return;

        // Use movementX/Y for pointer lock (these are deltas)
        const deltaX = e.movementX;
        const deltaY = e.movementY;

        // Update horizontal rotation (yaw) - this rotates your BODY
        this.playerFacing += deltaX * this.mouseLook.sensitivity;

        // Normalize to 0-360 range (full 360° rotation)
        if (this.playerFacing < 0) this.playerFacing += 360;
        if (this.playerFacing >= 360) this.playerFacing -= 360;

        // Update vertical rotation (pitch)
        this.playerPitch -= deltaY * this.mouseLook.sensitivity;

        // Clamp pitch to prevent over-rotation
        this.playerPitch = Math.max(-90, Math.min(90, this.playerPitch));

        // Update audio listener orientation for spatial audio
        this.audioEngine.updateListenerOrientation(this.playerFacing, this.playerPitch);
    }

    updateGamepad() {
        if (this.gamepadIndex !== null) {
            const gamepad = navigator.getGamepads()[this.gamepadIndex];
            if (gamepad) {
                const deadzone = 0.15;

                // Left stick for movement (rotation-aware)
                const lx = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
                const ly = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;

                if (lx || ly) {
                    // Strafe (left/right), forward/backward (view-relative)
                    const strafe = lx * 0.2; // Clean number like VQ
                    const forward = -ly * 0.2; // Inverted Y axis
                    this.movePlayer(strafe, 0, forward);
                }

                // Right stick for look controls
                const rx = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
                const ry = Math.abs(gamepad.axes[3]) > deadzone ? gamepad.axes[3] : 0;

                if (rx || ry) {
                    // Horizontal rotation (azimuth)
                    this.playerFacing += rx * 3.0;
                    // Vertical rotation (elevation)
                    this.playerPitch -= ry * 3.0;

                    // Clamp elevation to prevent gimbal lock
                    this.playerPitch = Math.max(-89, Math.min(89, this.playerPitch));

                    // Update audio orientation
                    this.audioEngine.updateListenerOrientation(this.playerFacing, this.playerPitch);
                }

                // Bumpers for vertical movement
                if (gamepad.buttons.length > 5) {
                    if (gamepad.buttons[5].pressed) { // Right bumper - up
                        this.movePlayer(0, 0.02, 0);
                    }
                    if (gamepad.buttons[4].pressed) { // Left bumper - down
                        this.movePlayer(0, -0.02, 0);
                    }
                }
            }
        }
    }

    startGamepadLoop() {
        const loop = () => {
            this.updateGamepad();
            requestAnimationFrame(loop);
        };
        loop();
    }

    movePlayer(dx, dy, dz) {
        // Simplified rotation-aware movement (much faster than VisionQuest)

        // Convert view-relative movement to world coordinates
        const azimuthRad = this.playerFacing * (Math.PI / 180);

        // For simulator: NO elevation scaling - keep movement responsive
        // VisionQuest uses cos^6 which is way too sluggish for repositioning sources

        // Forward/backward in view direction (no scaling)
        let worldDx = dz * Math.sin(azimuthRad);
        let worldDz = dz * Math.cos(azimuthRad);

        // Left/right perpendicular to view direction (no scaling)
        worldDx += dx * Math.cos(azimuthRad);
        worldDz -= dx * Math.sin(azimuthRad);

        // Up/down is always world Y
        const worldDy = dy;

        // Apply movement
        this.player.x += worldDx;
        this.player.y += worldDy;
        this.player.z += worldDz;

        // Movement bubble: clamp to radius to prevent getting lost
        const distanceFromOrigin = Math.sqrt(
            this.player.x * this.player.x +
            this.player.y * this.player.y +
            this.player.z * this.player.z
        );

        if (distanceFromOrigin > this.movementRadius) {
            // Push back to edge of bubble
            const scale = this.movementRadius / distanceFromOrigin;
            this.player.x *= scale;
            this.player.y *= scale;
            this.player.z *= scale;
        }

        // Update audio listener position
        this.audioEngine.updateListenerPosition(this.player);
    }

    resetPosition() {
        this.player = { x: 0, y: 0, z: 0 };
        this.playerFacing = 0;
        this.playerPitch = 0;
        this.audioEngine.updateListenerPosition(this.player);
        this.audioEngine.updateListenerOrientation(this.playerFacing, this.playerPitch);
    }

    getPosition() {
        return { ...this.player };
    }

    getFacing() {
        return this.playerFacing;
    }

    getPitch() {
        return this.playerPitch;
    }
}
