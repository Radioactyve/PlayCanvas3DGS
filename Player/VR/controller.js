var Controller = pc.createScript('controller');

Controller.prototype.initialize = function() {
    this.vecA = new pc.Vec3();
    this.vecB = new pc.Vec3();
    this.matA = new pc.Mat4();
    this.quat = new pc.Quat();
    this.color = new pc.Color(1, 1, 1);

    this.modelEntity = this.entity.findByName('model');
    this.hoverEntity = null;

    this.targetPointerSize = 2;
    this.targetTeleportable = false;
    this.pointer = this.entity.findByName('pointer');

    if (this.pointer && this.pointer.element && this.pointer.element.material) {
        var pointerElement = this.pointer.element;
        var pointerMaterial = pointerElement.material.clone();
        pointerElement.material = pointerMaterial;
        pointerMaterial.depthTest = false;
        pointerElement.material = pointerMaterial;

        var tempColor = pointerElement.color.clone();
        pointerElement.color = new pc.Color(tempColor.r, tempColor.g + 0.01, tempColor.b);
        pointerElement.color = tempColor;

        var tempOpacity = pointerElement.opacity;
        pointerElement.opacity = 0;
        pointerElement.opacity = tempOpacity;

        pointerMaterial.update();

        this._pointerElement = pointerElement;
        this._pointerMaterial = pointerMaterial;
    }

    this.hoverPoint = new pc.Vec3();
    this.pointerDistance = 3;

    this.on('destroy', function() {
        if (this._pointerElement) this._pointerElement.material = null;
        if (this._pointerMaterial) this._pointerMaterial.destroy();
    }, this);
};

Controller.prototype.setInputSource = function(inputSource) {
    this.inputSource = inputSource;
    this.inputSource.elementInput = true;
    this.inputSource.once('remove', this.onRemove, this);

    this.on('hover', this.onHover, this);
    this.on('blur', this.onBlur, this);

    this.inputSource.on('select', this.onSelect, this);
};

Controller.prototype.onRemove = function() {
    if (this.inputSource) {
        this.inputSource.off('select', this.onSelect, this);
    }

    this.entity.destroy();
};

Controller.prototype.onSelect = function() {
    this.app.fire('object:pick', this);

    if (this.hoverEntity) {
        if (this.targetTeleportable) {
            this.app.fire('controller:teleport', this.hoverPoint);
        } else if (this.hoverEntity.tags.has('interactive') && this.hoverEntity.render) {
            var mesh = this.hoverEntity.render.meshInstances[0];
            if (!mesh.pickedColor) mesh.pickedColor = new pc.Color();

            mesh.pickedColor.set(Math.random(), Math.random(), Math.random());
            mesh.setParameter('material_diffuse', [mesh.pickedColor.r, mesh.pickedColor.g, mesh.pickedColor.b]);
        }
    }
};

Controller.prototype.onHover = function(entity, point) {
    this.hoverEntity = entity;
    this.hoverPoint.copy(point);
    this.targetPointerSize = 16;
    this.targetTeleportable = this.hoverEntity.tags.has('teleportable');
};

Controller.prototype.onBlur = function() {
    this.hoverEntity = null;
    this.targetPointerSize = 4;
    this.targetTeleportable = false;
};

Controller.prototype.update = function(dt) {
    if (!this.inputSource) return;

    this.app.fire('object:pick', this);

    if (this.inputSource.grip) {
        if (this.modelEntity) this.modelEntity.enabled = true;
        this.entity.setPosition(this.inputSource.getPosition());
        this.entity.setRotation(this.inputSource.getRotation());

        this.vecA.copy(this.inputSource.getOrigin());
        this.vecB.copy(this.inputSource.getDirection());
        this.vecB.scale(1000).add(this.vecA);
        this.color.set(this.inputSource.selecting ? 0 : 1, 1, this.inputSource.selecting ? 0 : 1);
        this.app.drawLine(this.vecA, this.vecB, this.color);
    } else if (this.modelEntity) {
        this.modelEntity.enabled = false;
    }

    if (this.hoverEntity) {
        var dist = this.vecA.copy(this.hoverPoint).sub(this.inputSource.getOrigin()).length();
        this.pointerDistance += (dist - this.pointerDistance) * 0.3;
    }

    if (this.pointer) {
        this.vecA.copy(this.inputSource.getDirection()).scale(this.pointerDistance).add(this.inputSource.getOrigin());
        this.pointer.setPosition(this.vecA);
    }

    var pointerSize = this.targetPointerSize * (this.targetTeleportable ? 8 : 1);
    if (this.pointer && this.pointer.element && this.pointer.element.width !== pointerSize) {
        this.pointer.element.width += (pointerSize - this.pointer.element.width) * 0.3;

        if (Math.abs(this.pointer.element.width - pointerSize) <= 1) {
            this.pointer.element.width = pointerSize;
        }

        this.pointer.element.height = this.pointer.element.width;
    }

    if (this.pointer && this.targetTeleportable) {
        this.pointer.setEulerAngles(-90, 0, 0);
    } else if (this.pointer && this.app.xr.camera) {
        this.pointer.lookAt(this.app.xr.camera.getPosition(), pc.Vec3.DOWN);
        this.pointer.rotateLocal(0, 180, 0);
    }

    var gamepad = this.inputSource.gamepad;
    if (gamepad) {
        if (this.inputSource.handedness === pc.XRHAND_LEFT && (gamepad.axes[3] || gamepad.axes[2])) {
            this.app.fire('controller:move', gamepad.axes[2], gamepad.axes[3], dt);
        } else if (this.inputSource.handedness === pc.XRHAND_RIGHT && gamepad.axes[2]) {
            this.app.fire('controller:rotate', -gamepad.axes[2], dt);
        }
    }
};
