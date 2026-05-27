var Vr = pc.createScript('vr');

Vr.attributes.add('buttonVr', {
    type: 'entity',
    title: 'VR Button'
});

Vr.attributes.add('cameraEntity', {
    type: 'entity',
    title: 'Camera Entity'
});

Vr.attributes.add('controllerTemplate', {
    type: 'entity',
    title: 'Controller Template'
});

Vr.attributes.add('controllersParentEntity', {
    type: 'entity',
    title: 'Controllers Parent (Optional)'
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

Vr.attributes.add('useLocalFloorSpace', {
    type: 'boolean',
    default: true,
    title: 'Use Local Floor Space'
});

Vr.attributes.add('enableVrControllers', {
    type: 'boolean',
    default: true,
    title: 'Enable VR Controllers'
});

Vr.attributes.add('enableControllerLocomotion', {
    type: 'boolean',
    default: true,
    title: 'Enable Controller Locomotion'
});

Vr.attributes.add('controllerMoveSpeed', {
    type: 'number',
    default: 1.5,
    title: 'Controller Move Speed'
});

Vr.attributes.add('controllerMoveDeadZone', {
    type: 'number',
    default: 0.2,
    min: 0,
    max: 0.9,
    title: 'Move Stick Dead Zone'
});

Vr.attributes.add('controllerTurnAngle', {
    type: 'number',
    default: 45,
    title: 'Controller Snap Turn Angle'
});

Vr.attributes.add('controllerTurnDeadZone', {
    type: 'number',
    default: 0.6,
    min: 0,
    max: 0.9,
    title: 'Turn Stick Dead Zone'
});

Vr.attributes.add('moveRelativeToHead', {
    type: 'boolean',
    default: true,
    title: 'Move Relative To Head'
});

Vr.attributes.add('locomotionEntity', {
    type: 'entity',
    title: 'Locomotion Entity (camera-controller)'
});

Vr.prototype.initialize = function () {
    this._onButtonPress = this.toggleSession.bind(this);
    this._onStart = this.onStart.bind(this);
    this._onEnd = this.onEnd.bind(this);
    this._onAvailabilityChange = this._refreshUi.bind(this);
    this._inVrSession = !!(this.app.xr && this.app.xr.active);
    this._createdControllersManager = false;

    this.cameraEntity = this.cameraEntity || this._findFirstCameraEntity();
    this._setupControllers();
    this._turnLatch = false;
    this._tmpMoveA = new pc.Vec3();
    this._tmpMoveB = new pc.Vec3();
    this._tmpMoveC = new pc.Vec3();
    this._bindButton();
    this._bindXrEvents();
    this._setMode(false);
    this._refreshUi();

    this.on('destroy', this._unbind, this);
};

Vr.prototype._bindButton = function () {
    if (!this.buttonVr) return;

    if (this.buttonVr.button) {
        this.buttonVr.button.on('click', this._onButtonPress, this);
    } else if (this.buttonVr.element) {
        this.buttonVr.element.on('click', this._onButtonPress, this);
        this.buttonVr.element.on('touchstart', this._onButtonPress, this);
    }
};

Vr.prototype._bindXrEvents = function () {
    if (!this.app.xr) return;

    this.app.xr.on('available:' + pc.XRTYPE_VR, this._onAvailabilityChange, this);
    this.app.xr.on('start', this._onStart, this);
    this.app.xr.on('end', this._onEnd, this);
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
    }

    if (this._createdControllersManager && this.controllersManagerEntity && this.controllersManagerEntity.destroy) {
        this.controllersManagerEntity.destroy();
        this.controllersManagerEntity = null;
        this._createdControllersManager = false;
    }
};

Vr.prototype.toggleSession = function () {
    if (this.app.xr && this.app.xr.active) {
        this.app.xr.end();
        return;
    }
    this.startSession();
};

Vr.prototype.startSession = function () {
    if (!this.app.xr || !this.app.xr.supported) {
        console.warn('[vr] WebXR is not supported.');
        return;
    }

    if (this.app.xr.active) {
        return;
    }

    if (!this.app.xr.isAvailable(pc.XRTYPE_VR)) {
        console.warn('[vr] VR is not available.');
        return;
    }

    if (!this.cameraEntity || !this.cameraEntity.camera) {
        console.warn('[vr] cameraEntity must have a Camera component.');
        return;
    }

    var spaceType = this.useLocalFloorSpace ? pc.XRSPACE_LOCALFLOOR : pc.XRSPACE_LOCAL;
    this._startXr(spaceType, {
        optionalFeatures: ['local-floor', 'bounded-floor'],
        callback: function (err) {
            if (err && spaceType !== pc.XRSPACE_LOCAL) {
                this._startXr(pc.XRSPACE_LOCAL, { callback: this._onStartError.bind(this) });
            } else if (err) {
                this._onStartError(err);
            }
        }.bind(this)
    });
};

Vr.prototype._startXr = function (spaceType, options) {
    if (this.cameraEntity && this.cameraEntity.camera && this.cameraEntity.camera.startXr) {
        this.cameraEntity.camera.startXr(pc.XRTYPE_VR, spaceType, options);
    } else if (this.app.xr) {
        this.app.xr.start(this.cameraEntity.camera, pc.XRTYPE_VR, spaceType, options);
    }
};

Vr.prototype._onStartError = function (err) {
    if (err) {
        console.error('[vr] Failed to start VR session:', err);
    }
};

Vr.prototype.onStart = function () {
    this._inVrSession = true;
    this._setMode(true);
    this._applyVrControllersMode(true);
    if (this.app && this.app.fire) this.app.fire('vr:mode', true);
    this._setupControllersRuntime(true);
    this._refreshUi();
};

Vr.prototype.onEnd = function () {
    this._inVrSession = false;
    this._setMode(false);
    this._applyVrControllersMode(false);
    if (this.app && this.app.fire) this.app.fire('vr:mode', false);
    this._setupControllersRuntime(false);
    this._refreshUi();
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
        e.enabled = enabledState;
    }
};

Vr.prototype._refreshUi = function () {
    if (!this.buttonVr) return;
    var supported = !!(this.app.xr && this.app.xr.supported);
    var available = supported && this.app.xr.isAvailable(pc.XRTYPE_VR);
    var active = supported && this._inVrSession;

    if (this.buttonVr.button) {
        this.buttonVr.button.active = supported && available;
    }
    if (this.buttonVr.element) {
        this.buttonVr.element.opacity = (supported && available) ? 1 : 0.4;
    }
};

Vr.prototype._findFirstCameraEntity = function () {
    var cameras = this.app.root.findComponents('camera');
    return cameras && cameras.length ? cameras[0].entity : null;
};

Vr.prototype._setupControllers = function () {
    if (!this.enableVrControllers || !this.controllerTemplate) return;

    if (!this.controllersManagerEntity) {
        this.controllersManagerEntity = new pc.Entity('XR_ControllersRuntime');
        this.app.root.addChild(this.controllersManagerEntity);
        this.controllersManagerEntity.addComponent('script');
        this._createdControllersManager = true;
    } else if (!this.controllersManagerEntity.script) {
        this.controllersManagerEntity.addComponent('script');
    }

    if (this.controllersManagerEntity.script && !this.controllersManagerEntity.script.controllers) {
        this.controllersManagerEntity.script.create('controllers', {
            attributes: {
                controllerTemplate: this.controllerTemplate,
                cameraParent: this.controllersParentEntity || this.cameraEntity && this.cameraEntity.parent || this.app.root
            }
        });
    }

    this.controllersManagerEntity.enabled = true;
};

Vr.prototype._applyVrControllersMode = function (inVr) {
    if (this.controllersManagerEntity) {
        this.controllersManagerEntity.enabled = !!(this.enableVrControllers && inVr);
    }

    if (this.locomotionEntity && this.locomotionEntity.script) {
        var cc = this.locomotionEntity.script['camera-controller'] || this.locomotionEntity.script.cameraController;
        if (cc) cc.enabled = !!inVr;
    }
};

// Controller locomotion: read inputSources each frame and apply movement/turning
Vr.prototype.update = function (dt) {
    if (!this._inVrSession || !this.enableControllerLocomotion) return;
    if (!this.app.xr || !this.app.xr.input) return;

    var inputSources = this.app.xr.input.inputSources || [];
    var moveAxes = null;
    var turnAxes = null;

    for (var i = 0; i < inputSources.length; i++) {
        var inputSource = inputSources[i];
        if (!inputSource || !inputSource.gamepad) continue;

        var axes = this._readBestAxes(inputSource.gamepad);
        if (!axes) continue;

        if (inputSource.handedness === pc.XRHAND_LEFT || inputSource.handedness === 'left') {
            moveAxes = axes;
        } else if (inputSource.handedness === pc.XRHAND_RIGHT || inputSource.handedness === 'right') {
            turnAxes = axes;
        } else {
            // Fallback: use vertical motion as move and horizontal as turn.
            if (!moveAxes && Math.abs(axes.y) > this.controllerMoveDeadZone) moveAxes = axes;
            if (!turnAxes && Math.abs(axes.x) > this.controllerTurnDeadZone) turnAxes = axes;
        }
    }

    if (moveAxes) this._applyControllerMove(moveAxes, dt);
    if (turnAxes) this._applyControllerTurn(turnAxes); else this._turnLatch = false;
};

Vr.prototype._readBestAxes = function (gamepad) {
    if (!gamepad.axes || gamepad.axes.length < 2) return null;

    var best = { x: 0, y: 0, magnitude: 0 };
    var pairs = [ [2,3], [0,1] ];

    for (var i = 0; i < pairs.length; i++) {
        var ix = pairs[i][0];
        var iy = pairs[i][1];
        if (gamepad.axes.length <= iy) continue;

        var x = gamepad.axes[ix] || 0;
        var y = gamepad.axes[iy] || 0;
        var magnitude = Math.sqrt(x * x + y * y);
        if (magnitude > best.magnitude) {
            best.x = x; best.y = y; best.magnitude = magnitude;
        }
    }

    return best.magnitude > 0 ? best : null;
};

Vr.prototype._getRigRoot = function () {
    return this.xrRigRootEntity || (this.cameraEntity && this.cameraEntity.parent) || null;
};

Vr.prototype._applyControllerMove = function (axes, dt) {
    var x = Math.abs(axes.x) >= this.controllerMoveDeadZone ? axes.x : 0;
    var y = Math.abs(axes.y) >= this.controllerMoveDeadZone ? axes.y : 0;
    if (x === 0 && y === 0) return;

    var rigRoot = this._getRigRoot();
    if (!rigRoot || !this.cameraEntity) return;

    var forward = this._tmpMoveA.copy(this.cameraEntity.forward);
    forward.y = 0;
    if (forward.lengthSq() > 1e-8) forward.normalize(); else forward.set(0,0,-1);

    var right = this._tmpMoveB.set(forward.z, 0, -forward.x);
    var move = this._tmpMoveC.set(0,0,0);
    move.add(forward.mulScalar(-y));
    move.add(right.mulScalar(x));

    if (move.lengthSq() <= 1e-8) return;
    move.normalize().mulScalar(this.controllerMoveSpeed * dt);

    var targetPosition = rigRoot.getPosition().clone().add(move);
    if (rigRoot.rigidbody) {
        rigRoot.rigidbody.teleport(targetPosition, rigRoot.getRotation());
    } else {
        rigRoot.setPosition(targetPosition);
    }
};

Vr.prototype._applyControllerTurn = function (axes) {
    var x = axes.x || 0;
    if (Math.abs(x) < this.controllerTurnDeadZone) { this._turnLatch = false; return; }
    if (this._turnLatch) return;
    this._turnLatch = true;

    var rigRoot = this._getRigRoot();
    if (!rigRoot || !this.cameraEntity) return;

    var yaw = x > 0 ? -this.controllerTurnAngle : this.controllerTurnAngle;
    var cameraLocal = this.cameraEntity.getLocalPosition().clone();

    rigRoot.translateLocal(cameraLocal);
    rigRoot.rotateLocal(0, yaw, 0);
    rigRoot.translateLocal(cameraLocal.scale(-1));

    if (rigRoot.rigidbody) rigRoot.rigidbody.teleport(rigRoot.getPosition(), rigRoot.getRotation());
};

Vr.prototype._setupControllersRuntime = function (inVr) {
    if (!this.enableVrControllers) return;

    if (!this.controllerTemplate) {
        if (this.controllersManagerEntity) this.controllersManagerEntity.enabled = false;
        return;
    }

    if (this.controllersManagerEntity) {
        this.controllersManagerEntity.enabled = !!(this.enableVrControllers && inVr);
    }

    if (this.locomotionEntity && this.locomotionEntity.script) {
        var cc = this.locomotionEntity.script['camera-controller'] || this.locomotionEntity.script.cameraController;
        if (cc) cc.enabled = !!(inVr && !this.enableControllerLocomotion);
    }
};
