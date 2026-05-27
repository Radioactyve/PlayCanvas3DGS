var StreamedGlb = pc.createScript('streamedGlb');

StreamedGlb.attributes.add('glbUrl', {
    type: 'string',
    default: '',
    title: 'GLB URL'
});

StreamedGlb.attributes.add('autoLoadOnInitialize', {
    type: 'boolean',
    default: true,
    title: 'Auto Load On Initialize'
});

StreamedGlb.attributes.add('clearPreviousOnReload', {
    type: 'boolean',
    default: true,
    title: 'Clear Previous On Reload'
});

StreamedGlb.attributes.add('useAsCollisionMesh', {
    type: 'boolean',
    default: true,
    title: 'Use As Collision Mesh'
});

StreamedGlb.attributes.add('showVisualModel', {
    type: 'boolean',
    default: false,
    title: 'Show Visual Model'
});

StreamedGlb.prototype.initialize = function () {
    this._containerAsset = null;
    this._containerInstance = null;

    if (this.autoLoadOnInitialize) {
        this.loadGlbFromUrl(this.glbUrl);
    }
};

StreamedGlb.prototype.loadGlbFromUrl = function (url) {
    var trimmedUrl = (url || '').trim();

    if (!trimmedUrl) {
        console.warn('[streamedGlb] No GLB URL provided.');
        return;
    }

    this.glbUrl = trimmedUrl;

    if (this.clearPreviousOnReload) {
        this._clearCurrentModel();
    }

    var assetName = 'streamedGlb_' + this.entity.getGuid();
    var asset = new pc.Asset(assetName, 'container', { url: this.glbUrl });

    this.app.assets.add(asset);
    this.app.assets.load(asset);

    this._containerAsset = asset;

    asset.ready(function (loadedAsset) {
        if (!loadedAsset.resource) {
            console.error('[streamedGlb] Container loaded but resource is missing:', this.glbUrl);
            return;
        }

        if (this.showVisualModel) {
            this._containerInstance = loadedAsset.resource.instantiateRenderEntity({
                castShadows: true
            });

            this._containerInstance.name = this.entity.name + '_GLB';
            this.entity.addChild(this._containerInstance);
        }

        if (this.useAsCollisionMesh) {
            this._applyCollisionFromContainer(loadedAsset);
        }
    }.bind(this));

    asset.once('error', function (err) {
        console.error('[streamedGlb] Failed to load GLB from URL:', this.glbUrl, err);
    }.bind(this));
};

StreamedGlb.prototype._clearCurrentModel = function () {
    if (this._containerInstance && this._containerInstance.parent) {
        this._containerInstance.destroy();
    }
    this._containerInstance = null;

    if (this._containerAsset) {
        this._containerAsset.unload();
        this.app.assets.remove(this._containerAsset);
        this._containerAsset = null;
    }
};

StreamedGlb.prototype._applyCollisionFromContainer = function (containerAsset) {
    var resource = containerAsset && containerAsset.resource;
    if (!resource) {
        console.warn('[streamedGlb] Cannot apply collision: container resource missing.');
        return;
    }

    var renderAsset = null;
    var modelAsset = null;

    if (resource.renders && resource.renders.length > 0) {
        renderAsset = resource.renders[0];
    }

    if (resource.model) {
        modelAsset = resource.model;
    }

    if (!this.entity.collision) {
        this.entity.addComponent('collision', {
            type: 'mesh'
        });
    } else {
        this.entity.collision.type = 'mesh';
    }

    if (renderAsset && this.entity.collision.renderAsset !== undefined) {
        this.entity.collision.renderAsset = renderAsset;
        return;
    }

    if (modelAsset && this.entity.collision.asset !== undefined) {
        this.entity.collision.asset = modelAsset;
        return;
    }

    console.warn('[streamedGlb] No compatible mesh asset found for collision (render/model).');
};

StreamedGlb.prototype.onDestroy = function () {
    this._clearCurrentModel();
};
