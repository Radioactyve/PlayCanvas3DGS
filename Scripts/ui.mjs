import { Asset, Script, platform } from 'playcanvas';

class UI extends Script {
    static scriptName = 'ui';

    /**
     * @attribute
     * @type {Asset}
     * @resource css
     */
    cssAsset;

    /**
     * @attribute
     * @type {Asset}
     * @resource html
     */
    htmlAsset;

    /**
     * @attribute
     */
    totalSplats = 34904729;

    /** @type {HTMLDivElement} */
    ui = document.createElement('div');

    /** @type {Map<string, HTMLButtonElement>} */
    _buttons = new Map();

    _currentPreset = platform.mobile ? 'low' : 'medium';

    initialize() {
        this._injectStyles();
        this._injectHTML();
        this._cacheElements();
        this._attachEventListeners();
        this._updateButtonStates();

        // Listen for preset changes from other scripts
        this.app.on('ui:setPreset', this._onPresetChanged, this);
        this.app.on('ui:updateStats', this._onUpdateStats, this);

        this.once('destroy', () => {
            this.onDestroy();
        });
    }

    _injectStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = this.cssAsset.resource;
        document.head.appendChild(styleEl);
    }

    _injectHTML() {
        this.ui.innerHTML = this.htmlAsset.resource;
        document.body.appendChild(this.ui);

        // Apply mobile/desktop class
        const statsContainer = document.getElementById('gsplat-footer');
        if (statsContainer) {
            statsContainer.classList.add(platform.mobile ? 'mobile' : 'desktop');
        }
    }

    _cacheElements() {
        // Cache button references for better performance
        const buttonIds = ['ultra', 'high', 'medium', 'low'];
        for (const id of buttonIds) {
            const btn = document.getElementById(`btn-${id}`);
            if (btn) {
                this._buttons.set(id, btn);
            }
        }

        this._splatCountEl = document.getElementById('splat-count');
    }

    _attachEventListeners() {
        const preventCapture = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };

        const createButtonHandler = (eventName) => (e) => {
            preventCapture(e);
            this.app.fire(eventName);
        };

        // Attach listeners to quality buttons
        this._buttons.forEach((btn, quality) => {
            const handler = createButtonHandler(`preset:${quality}`);
            btn.addEventListener('click', handler);
            btn.addEventListener('mousedown', preventCapture);
            btn.addEventListener('mouseup', preventCapture);
        });

        // Attach colorize button listener
        const colorizeBtn = document.getElementById('btn-colorize');
        if (colorizeBtn) {
            const handler = createButtonHandler('colorize:toggle');
            colorizeBtn.addEventListener('click', handler);
            colorizeBtn.addEventListener('mousedown', preventCapture);
            colorizeBtn.addEventListener('mouseup', preventCapture);
        }
    }

    _onPresetChanged(presetName) {
        this._currentPreset = presetName;
        this._updateButtonStates();
    }

    _onUpdateStats(rendered) {
        if (this._splatCountEl) {
            this._splatCountEl.textContent = 
                `Splats: ${this._formatSplatCount(rendered)} of ${this._formatSplatCount(this.totalSplats)}`;
        }
    }

    _formatSplatCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(2) + 'M';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(2) + 'K';
        }
        return count.toString();
    }

    _updateButtonStates() {
        this._buttons.forEach((btn, quality) => {
            btn.classList.toggle('active', quality === this._currentPreset);
        });
    }

    onDestroy() {
        // Clean up event listeners
        this.app.off('ui:setPreset', this._onPresetChanged, this);
        this.app.off('ui:updateStats', this._onUpdateStats, this);

        // Clear cached references
        this._buttons.clear();
        this._splatCountEl = null;

        // Remove UI
        this.ui?.remove();
    }
}

export { UI };
