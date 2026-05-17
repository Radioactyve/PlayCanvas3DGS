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

    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

ChangeGsplatOnClick.prototype.onClick = function () {
    var url = (this.splatUrl || '').trim();
    if (!url) {
        console.error('changeGsplatOnClick: New Splat URL is empty.');
        return;
    }

    if (!this.targetEntity || !this.targetEntity.script || !this.targetEntity.script.streamedGsplat) {
        console.error('changeGsplatOnClick: targetEntity is missing streamedGsplat script instance.');
        return;
    }

    this.targetEntity.script.streamedGsplat.loadMainSplat(url);
};

ChangeGsplatOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};
