var CameraController = pc.createScript('camera-controller');

CameraController.attributes.add('height', {
    type: 'number',
    default: 1.6,
    placeholder: 'm',
    title: 'Height from Floor'
});

CameraController.attributes.add('movementSpeed', {
    type: 'number',
    default: 1.5,
    placeholder: 'm/s',
    title: 'Movement Speed'
});

CameraController.attributes.add('rotateSpeed', {
    type: 'number',
    default: 45,
    placeholder: '°',
    title: 'Rotation Speed'
});

CameraController.attributes.add('rotateThreshold', {
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
    title: 'Rotation thumbstick threshold'
});

CameraController.attributes.add('rotateResetThreshold', {
    type: 'number',
    default: 0.25,
    min: 0,
    max: 1,
    title: 'Rotation thumbstick reset threshold'
});

CameraController.attributes.add('camera', {
    type: 'entity',
    title: 'Camera Entity'
});

CameraController.prototype.initialize = function() {
    this.vec2A = new pc.Vec2();
    this.vec2B = new pc.Vec2();
    this.vec3A = new pc.Vec3();
    this.vec3B = new pc.Vec3();

    this.lastRotate = 0;
    this.lastRotateValue = 0;

    this.app.on('controller:teleport', this.onTeleport, this);
    this.app.on('controller:move', this.onMove, this);
    this.app.on('controller:rotate', this.onRotate, this);

    this.on('destroy', function() {
        this.app.off('controller:teleport', this.onTeleport, this);
        this.app.off('controller:move', this.onMove, this);
        this.app.off('controller:rotate', this.onRotate, this);
    }, this);
};

CameraController.prototype._getActiveCamera = function() {
    return (this.app.xr && this.app.xr.camera) ? this.app.xr.camera : this.camera;
};

CameraController.prototype.onTeleport = function(position) {
    if (this.app.xr && this.app.xr.type === pc.XRTYPE_AR)
        return;

    this.vec3A.copy(this.camera.getLocalPosition()).scale(-1);
    this.entity.setPosition(position);
    this.entity.translate(0, this.height, 0);
    this.entity.translateLocal(this.vec3A);
};

CameraController.prototype.onMove = function(x, y, dt) {
    if (!x && !y) return;

    var activeCamera = this._getActiveCamera();
    if (!activeCamera) return;

    var forward = activeCamera.forward.clone();
    forward.y = 0;
    if (forward.lengthSq() < 1e-8) return;
    forward.normalize();

    var right = activeCamera.right.clone();
    right.y = 0;
    if (right.lengthSq() < 1e-8) return;
    right.normalize();

    forward.scale(-y * this.movementSpeed * dt);
    right.scale(x * this.movementSpeed * dt);
    forward.add(right);

    this.entity.translate(forward, pc.SPACE_WORLD);
};

CameraController.prototype.onRotate = function(yaw, dt) {
    var now = Date.now();

    if ((now - this.lastRotate) < 200)
        return;

    if (this.lastRotateValue !== 0) {
        if (this.lastRotateValue > 0) {
            if (yaw < this.rotateResetThreshold) {
                this.lastRotateValue = 0;
            } else {
                return;
            }
        } else {
            if (yaw > -this.rotateResetThreshold) {
                this.lastRotateValue = 0;
            } else {
                return;
            }
        }
    }

    if (Math.abs(yaw) > this.rotateThreshold) {
        this.lastRotateValue = Math.sign(yaw);
        this.lastRotate = now;

        this.vec3A.copy(this.camera.getLocalPosition());
        this.entity.translateLocal(this.vec3A);
        this.entity.rotateLocal(0, Math.sign(yaw) * this.rotateSpeed, 0);
        this.entity.translateLocal(this.vec3A.scale(-1));
    }
};
