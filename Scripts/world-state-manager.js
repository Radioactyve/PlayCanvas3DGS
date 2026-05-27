var WorldStateManager = pc.createScript('worldStateManager');

WorldStateManager.attributes.add('currentUI', { type: 'entity', title: 'Current UI' });
WorldStateManager.attributes.add('currentWorldContent', { type: 'entity', title: 'Current WorldContent' });

WorldStateManager.attributes.add('gaussianSplatRenderer', {
    type: 'entity',
    title: 'Gaussian Splat Renderer'
});

WorldStateManager.attributes.add('colliderGenerator', {
    type: 'entity',
    title: 'Collider Generator'
});

WorldStateManager.attributes.add('playerEntity', {
    type: 'entity',
    title: 'Player Entity'
});

WorldStateManager.attributes.add('loadInitialEnvironment', {
    type: 'boolean',
    default: false,
    title: 'Load Initial Environment'
});

WorldStateManager.attributes.add('initialEnvironmentId', {
    type: 'string',
    default: '',
    title: 'Initial Environment Id'
});

WorldStateManager.attributes.add('environments', {
    type: 'json',
    array: true,
    title: 'Environments',
    schema: [
        { name: 'id', type: 'string', default: '', title: 'Environment Id' },
        { name: 'splatUrl', type: 'string', default: '', title: 'Splat URL' },
        { name: 'colliderUrl', type: 'string', default: '', title: 'Collider GLB URL' },
        { name: 'worldContent', type: 'entity', title: 'World Content Entity' },
        { name: 'spawnPosition', type: 'vec3', default: [0, 0, 0], title: 'Spawn Position' },
        { name: 'spawnRotation', type: 'vec3', default: [0, 0, 0], title: 'Spawn Rotation' }
    ]
});

WorldStateManager.prototype.initialize = function () {
    this.currentEnvironment = null;
};

WorldStateManager.prototype.postInitialize = function () {
    if (!this.loadInitialEnvironment) return;

    var initialId = (this.initialEnvironmentId || '').trim();
    if (initialId) {
        this.loadEnvironment(initialId);
    } else {
        this.loadEnvironmentByIndex(0);
    }
};

WorldStateManager.prototype.getSlot = function (slotName) {
    return this[slotName] || null;
};

WorldStateManager.prototype.setSlot = function (slotName, entity) {
    if (!slotName) return;
    this[slotName] = entity || null;
};

WorldStateManager.prototype.enableSlot = function (slotName) {
    var e = this.getSlot(slotName);
    if (e) e.enabled = true;
};

WorldStateManager.prototype.disableSlot = function (slotName) {
    var e = this.getSlot(slotName);
    if (e) e.enabled = false;
};

WorldStateManager.prototype.getEnvironment = function (environmentId) {
    var id = (environmentId || '').trim();
    if (!id || !this.environments) return null;

    for (var i = 0; i < this.environments.length; i++) {
        var environment = this.environments[i];
        if (!environment) continue;
        if ((environment.id || '').trim() === id) return environment;
    }

    return null;
};

WorldStateManager.prototype.loadEnvironment = function (environmentId) {
    var environment = this.getEnvironment(environmentId);
    if (!environment) {
        console.error('worldStateManager: Environment not found:', environmentId);
        return false;
    }

    return this._applyEnvironment(environment);
};

WorldStateManager.prototype.loadEnvironmentByIndex = function (environmentIndex) {
    var index = environmentIndex || 0;
    var environment = this.environments && this.environments[index];
    if (!environment) {
        console.error('worldStateManager: Environment index not found:', index);
        return false;
    }

    return this._applyEnvironment(environment);
};

WorldStateManager.prototype._applyEnvironment = function (environment) {
    this._setWorldContent(environment.worldContent || null);
    this._loadSplat(environment.splatUrl);
    this._loadCollider(environment.colliderUrl);
    this._teleportPlayer(environment.spawnPosition, environment.spawnRotation);

    this.currentEnvironment = environment;
    this.app.fire('world:environmentChanged', environment);
    return true;
};

WorldStateManager.prototype._setWorldContent = function (worldContent) {
    if (this.currentWorldContent && this.currentWorldContent !== worldContent) {
        this.currentWorldContent.enabled = false;
    }

    this.setSlot('currentWorldContent', worldContent || null);
    if (this.currentWorldContent) this.currentWorldContent.enabled = true;
};

WorldStateManager.prototype._loadSplat = function (splatUrl) {
    var url = (splatUrl || '').trim();
    if (!url) return;

    var script = this.gaussianSplatRenderer && this.gaussianSplatRenderer.script && this.gaussianSplatRenderer.script.streamedGsplat;
    if (!script) {
        console.error('worldStateManager: gaussianSplatRenderer is missing streamedGsplat script.');
        return;
    }

    script.loadMainSplat(url);
};

WorldStateManager.prototype._loadCollider = function (colliderUrl) {
    var script = this.colliderGenerator && this.colliderGenerator.script && this.colliderGenerator.script.streamedGlb;
    if (!script) {
        if ((colliderUrl || '').trim()) {
            console.error('worldStateManager: colliderGenerator is missing streamedGlb script.');
        }
        return;
    }

    var url = (colliderUrl || '').trim();
    if (url) {
        script.loadGlbFromUrl(url);
    } else if (script.clearLoadedGlb) {
        script.clearLoadedGlb();
    }
};

WorldStateManager.prototype._teleportPlayer = function (spawnPosition, spawnRotation) {
    if (!this.playerEntity) return;

    var position = this._toVec3(spawnPosition);
    var rotation = this._toVec3(spawnRotation);

    if (this.playerEntity.rigidbody) {
        this.playerEntity.rigidbody.teleport(position, rotation);
    } else {
        this.playerEntity.setPosition(position);
        this.playerEntity.setEulerAngles(rotation);
    }
};

WorldStateManager.prototype._toVec3 = function (value) {
    if (!value) return new pc.Vec3(0, 0, 0);
    if (value instanceof pc.Vec3) return value.clone();

    if (value.length >= 3) {
        return new pc.Vec3(Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0);
    }

    return new pc.Vec3(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0);
};
