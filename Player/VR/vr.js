var Vr = pc.createScript('vr');

Vr.attributes.add('buttonVr', {
    type: 'entity',
    title: 'VR Button'
});

Vr.attributes.add('cameraEntity', {
    type: 'entity',
    title: 'Camera Entity'
});

Vr.attributes.add('textSupported', {
    type: 'entity',
    title: 'Supported Text'
});

Vr.attributes.add('elementUnsupported', {
    type: 'entity',
    title: 'Unsupported Message'
});

Vr.attributes.add('elementHttpsRequired', {
    type: 'entity',
    title: 'HTTPS Required Message'
});

Vr.attributes.add('labelElement', {
    type: 'entity',
    title: 'Button Label Element'
});

Vr.attributes.add('labelEnterText', {
    type: 'string',
    default: 'Enter VR',
    title: 'Enter Label'
});

Vr.attributes.add('labelExitText', {
    type: 'string',
    default: 'Exit VR',
    title: 'Exit Label'
});

Vr.attributes.add('useLocalFloorSpace', {
    type: 'boolean',
    default: true,
    title: 'Use Local Floor Space'
});

Vr.attributes.add('normalModeEntities', {
    type: 'entity',
    array: true,
    title: 'Normal Mode Entities'
});

Vr.attributes.add('vrModeEntities', {
    type: 'entity',
    array: true,
    title: 'VR Mode Entities'
});

Vr.attributes.add('restoreCameraTransformOnExit', {
    type: 'boolean',
    default: true,
    title: 'Restore Camera On Exit'
});

Vr.attributes.add('reacquirePointerLockOnExit', {
    type: 'boolean',
    default: true,
    title: 'Reacquire Pointer Lock'
});

Vr.attributes.add('xrRigRootEntity', {
    type: 'entity',
    title: 'XR Rig Root (Optional)'
});

Vr.prototype.initialize = function () {
    this._onButtonPress = this.toggleSession.bind(this);
    this._onAvailabilityChange = this.onAvailabilityChange.bind(this);
    this._onStart = this.onStart.bind(this);
    this._onEnd = this.onEnd.bind(this);
    this._onInputSourceAdd = this.onInputSourceAdd.bind(this);
    this._onReacquireInteraction = this._onReacquireInteraction.bind(this);
    this._toggleLocked = false;

    this.cameraEntity = this.cameraEntity || this._findFirstCameraEntity();
    this._bindButton();
    this._bindXrEvents();
    this._setMode(false);
    this._refreshUi();

    this.on('destroy', this._unbind, this);
};

Vr.prototype._bindButton = function () {
    if (!this.buttonVr) {
        console.warn('[vr] Assign buttonVr to start VR from UI.');
        return;
    }

    if (this.buttonVr.button) {
        this.buttonVr.button.on('click', this._onButtonPress, this);
    } else if (this.buttonVr.element) {
        // Fallback only when there is no Button component
        this.buttonVr.element.on('click', this._onButtonPress, this);
        this.buttonVr.element.on('touchstart', this._onButtonPress, this);
    }
};

Vr.prototype._bindXrEvents = function () {
    if (!this.app.xr) {
        console.warn('[vr] app.xr is not available.');
        return;
    }

    this.app.xr.on('available:' + pc.XRTYPE_VR, this._onAvailabilityChange, this);
    this.app.xr.on('start', this._onStart, this);
    this.app.xr.on('end', this._onEnd, this);

    if (this.app.xr.input) {
        this.app.xr.input.on('add', this._onInputSourceAdd, this);
    }
};

Vr.prototype._unbind = function () {
    if (this.buttonVr && this.buttonVr.button) {
        this.buttonVr.button.off('click', this._onButtonPress, this);
    } else if (this.buttonVr && this.buttonVr.element) {
        this.buttonVr.element.off('click', this._onButtonPress, this);
        this.buttonVr.element.off('touchstart', this._onButtonPress, this);
    }

    if (this.app.xr) {
        this.app.xr.off('available:' + pc.XRTYPE_VR, this._onAvailabilityChange, this);
        this.app.xr.off('start', this._onStart, this);
        this.app.xr.off('end', this._onEnd, this);

        if (this.app.xr.input) {
            this.app.xr.input.off('add', this._onInputSourceAdd, this);
        }
    }

    window.removeEventListener('mousedown', this._onReacquireInteraction, true);
    window.removeEventListener('touchstart', this._onReacquireInteraction, true);
};

Vr.prototype.toggleSession = function () {
    if (this._toggleLocked) return;
    this._toggleLocked = true;
    setTimeout(function () {
        this._toggleLocked = false;
    }.bind(this), 250);

    if (this.app.xr && this.app.xr.active) {
        this.app.xr.end();
        return;
    }

    this.startSession();
};

Vr.prototype.startSession = function () {
    if (!this.app.xr || !this.app.xr.supported) {
        console.warn('[vr] WebXR is not supported in this browser.');
        this._refreshUi();
        return;
    }

    if (!this.cameraEntity || !this.cameraEntity.camera) {
        console.error('[vr] cameraEntity is missing a Camera component.');
        return;
    }

    if (!this.app.xr.isAvailable(pc.XRTYPE_VR)) {
        console.warn('[vr] VR session is not available on this device/browser.');
        this._refreshUi();
        return;
    }

    var spaceType = this.useLocalFloorSpace ? pc.XRSPACE_LOCALFLOOR : pc.XRSPACE_LOCAL;
    this._cacheNonXrCameraTransform();
    this._cachePreXrWorldPose();
    var options = {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
        callback: function (err) {
            if (err && spaceType !== pc.XRSPACE_LOCAL) {
                console.warn('[vr] local-floor failed, retrying with local space.', err);
                this._startXr(pc.XRSPACE_LOCAL, {
                    callback: this._onStartError.bind(this)
                });
            } else if (err) {
                this._onStartError(err);
            }
        }.bind(this)
    };

    this._startXr(spaceType, options);
};

Vr.prototype._startXr = function (spaceType, options) {
    var camera = this.cameraEntity.camera;

    if (camera.startXr) {
        camera.startXr(pc.XRTYPE_VR, spaceType, options);
    } else {
        this.app.xr.start(camera, pc.XRTYPE_VR, spaceType, options);
    }
};

Vr.prototype._onStartError = function (err) {
    if (err) {
        console.error('[vr] Failed to start VR session:', err);
    }
    this._refreshUi();
};

Vr.prototype.onInputSourceAdd = function (inputSource) {
    // PlayCanvas can route XR controller rays to Element/Button components.
    inputSource.elementInput = true;
};

Vr.prototype.onAvailabilityChange = function () {
    this._refreshUi();
};

Vr.prototype.onStart = function () {
    this._compensateXrStartOffset();
    this._setMode(true);
    this._refreshUi();
    this.app.fire('vr:mode', true);
};

Vr.prototype.onEnd = function () {
    this._restoreNonXrCameraTransform();
    this._resetCharacterInputState();
    this._setupPointerLockRecovery();
    this._setMode(false);
    this._refreshUi();
    this.app.fire('vr:mode', false);
};

Vr.prototype._setMode = function (inVr) {
    this._setEntitiesEnabled(this.normalModeEntities, !inVr);
    this._setEntitiesEnabled(this.vrModeEntities, inVr);
};

Vr.prototype._setEntitiesEnabled = function (entities, enabledState) {
    if (!entities) return;

    for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (!e) continue;
        if (this._isSelfOrAncestor(e, this.entity)) continue;
        if (this.buttonVr && this._isSelfOrAncestor(e, this.buttonVr)) continue;
        e.enabled = enabledState;
    }
};

Vr.prototype._isSelfOrAncestor = function (candidate, target) {
    if (!candidate || !target) return false;
    var n = target;
    while (n) {
        if (n === candidate) return true;
        n = n.parent || null;
    }
    return false;
};

Vr.prototype._refreshUi = function () {
    var supported = !!(this.app.xr && this.app.xr.supported);
    var available = supported && this.app.xr.isAvailable(pc.XRTYPE_VR);
    var active = supported && this.app.xr.active;
    var secure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    if (this.buttonVr) {
        this.buttonVr.enabled = supported && secure;

        if (this.buttonVr.element) {
            this.buttonVr.element.opacity = available || active ? 1 : 0.35;
        }

        if (this.buttonVr.children && this.buttonVr.children.length && this.buttonVr.children[0].element) {
            this.buttonVr.children[0].element.opacity = available || active ? 1 : 0.45;
        }
    }

    if (this.textSupported) {
        this.textSupported.enabled = supported && secure;
    }

    if (this.elementUnsupported) {
        this.elementUnsupported.enabled = secure && !supported;
    }

    if (this.elementHttpsRequired) {
        this.elementHttpsRequired.enabled = !secure;
    }

    this._updateButtonLabel(active);
};

Vr.prototype._updateButtonLabel = function (active) {
    var labelEntity = this.labelElement;
    if (!labelEntity && this.buttonVr && this.buttonVr.children && this.buttonVr.children.length) {
        labelEntity = this.buttonVr.children[0];
    }

    if (labelEntity && labelEntity.element) {
        labelEntity.element.text = active ? this.labelExitText : this.labelEnterText;
    }
};

Vr.prototype._findFirstCameraEntity = function () {
    var cameras = this.app.root.findComponents('camera');
    return cameras && cameras.length ? cameras[0].entity : null;
};

Vr.prototype._cacheNonXrCameraTransform = function () {
    if (!this.cameraEntity) return;
    this._cachedCameraLocalPosition = this.cameraEntity.getLocalPosition().clone();
    this._cachedCameraLocalRotation = this.cameraEntity.getLocalRotation().clone();
};

Vr.prototype._cachePreXrWorldPose = function () {
    if (!this.cameraEntity) return;
    this._preXrCameraWorldPos = this.cameraEntity.getPosition().clone();
};

Vr.prototype._compensateXrStartOffset = function () {
    if (!this.cameraEntity || !this._preXrCameraWorldPos) return;

    var rigRoot = this.xrRigRootEntity || this.cameraEntity.parent;
    if (!rigRoot) return;

    var currentWorldPos = this.cameraEntity.getPosition();
    var delta = this._preXrCameraWorldPos.clone().sub(currentWorldPos);
    if (delta.lengthSq() < 1e-8) return;

    if (rigRoot.rigidbody) {
        var p = rigRoot.getPosition().clone().add(delta);
        var r = rigRoot.getRotation().clone();
        rigRoot.rigidbody.teleport(p, r);
    } else {
        rigRoot.translate(delta);
    }
};

Vr.prototype._restoreNonXrCameraTransform = function () {
    if (!this.restoreCameraTransformOnExit) return;
    if (!this.cameraEntity) return;
    if (!this._cachedCameraLocalPosition || !this._cachedCameraLocalRotation) return;

    this.cameraEntity.setLocalPosition(this._cachedCameraLocalPosition);
    this.cameraEntity.setLocalRotation(this._cachedCameraLocalRotation);
};

Vr.prototype._resetCharacterInputState = function () {
    // Prevent stale movement/strafe values from remaining latched after XR session end.
    this.app.fire('cc:move:forward', 0);
    this.app.fire('cc:move:backward', 0);
    this.app.fire('cc:move:left', 0);
    this.app.fire('cc:move:right', 0);
    this.app.fire('cc:jump', false);
    this.app.fire('cc:sprint', false);
};

Vr.prototype._setupPointerLockRecovery = function () {
    if (!this.reacquirePointerLockOnExit) return;
    if (!this.app.graphicsDevice || !this.app.graphicsDevice.canvas) return;

    var canvas = this.app.graphicsDevice.canvas;

    // Try immediate reacquire (works when exit was via button/touch gesture).
    this._tryRequestPointerLock(canvas);

    // If that fails (common when session ended via ESC/system gesture), reacquire on next interaction.
    if (document.pointerLockElement !== canvas) {
        window.addEventListener('mousedown', this._onReacquireInteraction, true);
        window.addEventListener('touchstart', this._onReacquireInteraction, true);
    }
};

Vr.prototype._onReacquireInteraction = function () {
    if (!this.app.graphicsDevice || !this.app.graphicsDevice.canvas) return;
    var canvas = this.app.graphicsDevice.canvas;
    this._tryRequestPointerLock(canvas);

    if (document.pointerLockElement === canvas) {
        window.removeEventListener('mousedown', this._onReacquireInteraction, true);
        window.removeEventListener('touchstart', this._onReacquireInteraction, true);
    }
};

Vr.prototype._tryRequestPointerLock = function (canvas) {
    if (!canvas || document.pointerLockElement === canvas) return;
    if (!canvas.requestPointerLock) return;

    try {
        canvas.requestPointerLock();
    } catch (err) {
        // No-op: browser can reject if not in a valid user gesture.
    }
};
