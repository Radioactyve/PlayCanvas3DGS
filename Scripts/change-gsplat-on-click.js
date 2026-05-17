var ChangeGsplatOnClick = pc.createScript('changeGsplatOnClick');

ChangeGsplatOnClick.attributes.add('targetEntity', {
    type: 'entity',
    title: 'Target Entity (has streamedGsplat)'
});

ChangeGsplatOnClick.attributes.add('splatUrl', {
    type: 'string',
    default: '',
    title: 'New Splat URL'
});

ChangeGsplatOnClick.prototype.initialize = function () {
    if (!this.entity.element) {
        console.warn('changeGsplatOnClick: Entity needs an Element component.');
        return;
    }

    this._loading = false;

    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

ChangeGsplatOnClick.prototype.onClick = function () {
    if (this._loading) return;

    var url = (this.splatUrl || '').trim();
    if (!url) {
        console.error('changeGsplatOnClick: New Splat URL is empty.');
        return;
    }

    if (!this.targetEntity || !this.targetEntity.script || !this.targetEntity.script.streamedGsplat) {
        console.error('changeGsplatOnClick: targetEntity is missing streamedGsplat script instance.');
        return;
    }

    var streamed = this.targetEntity.script.streamedGsplat;

    // Preferred path when the runtime has the updated method.
    if (typeof streamed.loadMainSplat === 'function') {
        streamed.loadMainSplat(url);
        return;
    }

    // Fallback path for older streamedGsplat runtime instances.
    this._loading = true;

    try {
        if (this.targetEntity.gsplat) {
            this.targetEntity.removeComponent('gsplat');
        }

        var asset = new pc.Asset('RuntimeGsplat_' + Date.now(), 'gsplat', { url: url });
        this.app.assets.add(asset);
        this.app.assets.load(asset);

        asset.ready(function (a) {
            this.targetEntity.addComponent('gsplat', {
                unified: true,
                asset: a
            });
            this._loading = false;
        }.bind(this));
    } catch (e) {
        console.error('changeGsplatOnClick: Fallback load failed.', e);
        this._loading = false;
    }
};

ChangeGsplatOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};
