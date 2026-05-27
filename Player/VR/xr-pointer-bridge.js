var XrPointerBridge = pc.createScript('xrPointerBridge');

XrPointerBridge.attributes.add('fireButtonEvents', {
    type: 'boolean',
    default: true,
    title: 'Fire Button Events'
});

XrPointerBridge.attributes.add('fireElementEvents', {
    type: 'boolean',
    default: true,
    title: 'Fire Element Events'
});

XrPointerBridge.attributes.add('preferButtonOverElement', {
    type: 'boolean',
    default: false,
    title: 'Prefer Button Over Element'
});

XrPointerBridge.prototype.initialize = function () {
    this._hoverByController = {};

    this.app.on('xr:pointer:hover', this.onPointerHover, this);
    this.app.on('xr:pointer:blur', this.onPointerBlur, this);
    this.app.on('xr:pointer:selectstart', this.onPointerSelectStart, this);
    this.app.on('xr:pointer:select', this.onPointerSelect, this);
    this.app.on('xr:pointer:selectend', this.onPointerSelectEnd, this);
    this.app.on('vr:mode', this.onVrModeChanged, this);

    this.on('destroy', function () {
        this.app.off('xr:pointer:hover', this.onPointerHover, this);
        this.app.off('xr:pointer:blur', this.onPointerBlur, this);
        this.app.off('xr:pointer:selectstart', this.onPointerSelectStart, this);
        this.app.off('xr:pointer:select', this.onPointerSelect, this);
        this.app.off('xr:pointer:selectend', this.onPointerSelectEnd, this);
        this.app.off('vr:mode', this.onVrModeChanged, this);
    }, this);
};

XrPointerBridge.prototype._getControllerId = function (controller) {
    if (!controller || !controller.entity) return 'unknown';
    return controller.entity.getGuid ? controller.entity.getGuid() : controller.entity.name;
};

XrPointerBridge.prototype._findInteractiveEntity = function (entity) {
    var node = entity;
    while (node) {
        if (node.button || node.element || (node.script && node.script.iframePlane)) {
            return node;
        }
        node = node.parent || null;
    }
    return null;
};

XrPointerBridge.prototype._fireUiEvent = function (target, name, evt) {
    if (!target) return;

    var fired = false;

    if (this.fireButtonEvents && target.button && target.button.active) {
        if (!this.preferButtonOverElement || !fired) {
            target.button.fire(name, evt);
            fired = true;
        }
    }

    if (this.fireElementEvents && target.element) {
        if (!this.preferButtonOverElement || !fired) {
            target.element.fire(name, evt);
        }
    }
};

XrPointerBridge.prototype._shouldUseManualUiEvents = function (controller) {
    var inputSource = controller && controller.inputSource;
    if (!inputSource) return true;

    // Let native XR -> ElementInput pipeline handle UI when available.
    return !inputSource.elementEntity;
};

XrPointerBridge.prototype._bridgeIframe = function (target, eventType, worldPoint) {
    if (!target || !target.script || !target.script.iframePlane) return false;

    return target.script.iframePlane.dispatchVrPointer(eventType, worldPoint);
};

XrPointerBridge.prototype.onPointerHover = function (controller, entity, point) {
    var id = this._getControllerId(controller);
    var nextTarget = this._findInteractiveEntity(entity);
    var prevTarget = this._hoverByController[id] || null;

    if (prevTarget && prevTarget !== nextTarget && this._shouldUseManualUiEvents(controller)) {
        this._fireUiEvent(prevTarget, 'mouseleave', { inputSource: controller.inputSource });
    }

    if (nextTarget && prevTarget !== nextTarget && this._shouldUseManualUiEvents(controller)) {
        this._fireUiEvent(nextTarget, 'mouseenter', { inputSource: controller.inputSource });
    }

    if (nextTarget) {
        this._bridgeIframe(nextTarget, 'move', point);
    }

    this._hoverByController[id] = nextTarget;
};

XrPointerBridge.prototype.onPointerBlur = function (controller) {
    var id = this._getControllerId(controller);
    var prevTarget = this._hoverByController[id] || null;

    if (prevTarget) {
        if (this._shouldUseManualUiEvents(controller)) {
        this._fireUiEvent(prevTarget, 'mouseleave', { inputSource: controller.inputSource });
        }
        this._hoverByController[id] = null;
    }
};

XrPointerBridge.prototype.onPointerSelectStart = function (controller, entity, point) {
    var target = this._findInteractiveEntity(entity) || this._hoverByController[this._getControllerId(controller)];
    if (!target) return;

    if (this._shouldUseManualUiEvents(controller)) {
        this._fireUiEvent(target, 'mousedown', { inputSource: controller.inputSource });
    }
    this._bridgeIframe(target, 'down', point);
};

XrPointerBridge.prototype.onPointerSelect = function (controller, entity, point) {
    var target = this._findInteractiveEntity(entity) || this._hoverByController[this._getControllerId(controller)];
    if (!target) return;

    if (this._shouldUseManualUiEvents(controller)) {
        this._fireUiEvent(target, 'click', { inputSource: controller.inputSource });
    }
    this._bridgeIframe(target, 'click', point);
};

XrPointerBridge.prototype.onPointerSelectEnd = function (controller, entity, point) {
    var target = this._findInteractiveEntity(entity) || this._hoverByController[this._getControllerId(controller)];
    if (!target) return;

    if (this._shouldUseManualUiEvents(controller)) {
        this._fireUiEvent(target, 'mouseup', { inputSource: controller.inputSource });
    }
    this._bridgeIframe(target, 'up', point);
};

XrPointerBridge.prototype.onVrModeChanged = function (inVr) {
    if (!inVr) {
        this._hoverByController = {};
    }
};
