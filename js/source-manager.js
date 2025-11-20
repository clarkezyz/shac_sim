/**
 * Source Manager for SHAC Simulator
 * Manages the UI for audio sources (tracks)
 */

class SourceManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.sourceListEl = document.getElementById('source-list');
        this.trackCountEl = document.getElementById('track-count');
    }

    /**
     * Update the source list UI
     */
    updateSourceList() {
        const sources = this.audioEngine.getSources();

        if (sources.length === 0) {
            this.sourceListEl.innerHTML = '<p style="color: var(--text-dim); text-align: center;">No tracks loaded</p>';
            this.updateTrackCount(0);
            return;
        }

        this.sourceListEl.innerHTML = sources.map(source => this.renderSource(source)).join('');

        // Add event listeners for lock buttons
        this.sourceListEl.querySelectorAll('.source-lock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sourceId = parseInt(e.target.dataset.sourceId);
                this.audioEngine.toggleSourceLock(sourceId);
                this.updateSourceList(); // Re-render to update UI
            });
        });

        // Add event listeners for remove buttons
        this.sourceListEl.querySelectorAll('.source-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sourceId = parseInt(e.target.dataset.sourceId);
                this.removeSource(sourceId);
            });
        });

        // Add event listeners for position update buttons
        this.sourceListEl.querySelectorAll('.position-update-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sourceId = parseInt(e.target.dataset.sourceId);
                this.updateSourcePosition(sourceId);
            });
        });

        this.updateTrackCount(sources.length);
    }

    /**
     * Render a single source item
     */
    renderSource(source) {
        const lockIcon = source.locked ? '🔒' : '🔓';
        const lockTitle = source.locked ? 'Unlock (allow editing)' : 'Lock (fix in world space)';
        const lockedClass = source.locked ? 'locked' : '';

        return `
            <div class="source-item ${lockedClass}" data-source-id="${source.id}">
                <div class="source-header">
                    <div class="source-name">${this.escapeHtml(source.name)}</div>
                    <div class="source-actions">
                        <button class="source-lock" data-source-id="${source.id}" title="${lockTitle}">${lockIcon}</button>
                        <button class="source-remove" data-source-id="${source.id}" title="Remove track">×</button>
                    </div>
                </div>
                <div class="source-position">
                    <label>📍 Position:</label>
                    <div class="coord-inputs">
                        <div class="coord-group">
                            <label>X:</label>
                            <input type="text"
                                   class="coord-input"
                                   data-source-id="${source.id}"
                                   data-axis="x"
                                   value="${source.position.x.toFixed(1)}"
                                   ${source.locked ? 'disabled' : ''}>
                        </div>
                        <div class="coord-group">
                            <label>Y:</label>
                            <input type="text"
                                   class="coord-input"
                                   data-source-id="${source.id}"
                                   data-axis="y"
                                   value="${source.position.y.toFixed(1)}"
                                   ${source.locked ? 'disabled' : ''}>
                        </div>
                        <div class="coord-group">
                            <label>Z:</label>
                            <input type="text"
                                   class="coord-input"
                                   data-source-id="${source.id}"
                                   data-axis="z"
                                   value="${source.position.z.toFixed(1)}"
                                   ${source.locked ? 'disabled' : ''}>
                        </div>
                        <button class="position-update-btn"
                                data-source-id="${source.id}"
                                ${source.locked ? 'disabled' : ''}
                                title="Update position">
                            Update
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update a source position from input fields
     */
    updateSourcePosition(sourceId) {
        const source = this.audioEngine.getSource(sourceId);
        if (!source) return;

        // Get all three coordinate inputs for this source
        const inputs = this.sourceListEl.querySelectorAll(`.coord-input[data-source-id="${sourceId}"]`);

        const newPosition = {};
        let hasInvalidInput = false;

        inputs.forEach(input => {
            const axis = input.dataset.axis;
            const value = parseFloat(input.value);

            if (isNaN(value)) {
                hasInvalidInput = true;
                return;
            }

            newPosition[axis] = value;
        });

        // Don't update if any inputs are invalid
        if (hasInvalidInput) {
            alert('Please enter valid numbers for all coordinates');
            return;
        }

        // Update in audio engine
        this.audioEngine.setSourcePosition(sourceId, newPosition);

        console.log(`Updated source ${sourceId} position to (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);

        // Optional: Give visual feedback
        const button = this.sourceListEl.querySelector(`.position-update-btn[data-source-id="${sourceId}"]`);
        if (button) {
            const originalText = button.textContent;
            button.textContent = '✓';
            setTimeout(() => {
                button.textContent = originalText;
            }, 500);
        }
    }

    /**
     * Remove a source
     */
    removeSource(sourceId) {
        this.audioEngine.removeSource(sourceId);
        this.updateSourceList();
    }

    /**
     * Update track count display
     */
    updateTrackCount(count) {
        if (this.trackCountEl) {
            this.trackCountEl.textContent = `${count} ${count === 1 ? 'track' : 'tracks'} loaded`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
