var Controllers = pc.createScript('controllers');

Controllers.attributes.add('controllerTemplate', {
    type: 'entity',
    title: 'Controller Template'
});

Controllers.attributes.add('cameraParent', {
    type: 'entity',
    title: 'Camera Parent'
});

Controllers.prototype.initialize = function() {
    this._controllersBySource = [];
    this._onInputSourceAdd = this._onInputSourceAdd.bind(this);

    // when controller is added
    this.app.xr.input.on('add', this._onInputSourceAdd, this);

    this.on('destroy', function () {
        if (this.app.xr && this.app.xr.input) {
            this.app.xr.input.off('add', this._onInputSourceAdd, this);
        }
    }, this);
};

Controllers.prototype._onInputSourceAdd = function (inputSource) {
    if (!this.controllerTemplate) {
        console.warn('[controllers] Missing controllerTemplate.');
        return;
    }

    // clone controller entity template
    var entity = this.controllerTemplate.clone();
    if (!entity.script || !entity.script.controller) {
        console.warn('[controllers] Cloned template is missing controller script.');
        if (entity.destroy) entity.destroy();
        return;
    }

    // set input source
    entity.script.controller.setInputSource(inputSource);
    // reparent to camera parent entity
    entity.reparent(this.cameraParent || this.app.root);
    entity.enabled = true;

    this._controllersBySource.push({
        inputSource: inputSource,
        entity: entity
    });

    inputSource.once('remove', function () {
        this._onInputSourceRemoved(inputSource);
    }, this);
};

Controllers.prototype._onInputSourceRemoved = function(inputSource) {
    for (var i = this._controllersBySource.length - 1; i >= 0; i--) {
        var pair = this._controllersBySource[i];
        if (pair.inputSource !== inputSource) continue;

        if (pair.entity && pair.entity.destroy) {
            pair.entity.destroy();
        }
        this._controllersBySource.splice(i, 1);
    }
};
