var DisableEntityOnClick = pc.createScript('disableEntityOnClick');

DisableEntityOnClick.attributes.add('targetEntity', {
    type: 'entity',
    title: 'Target Entity'
});

DisableEntityOnClick.prototype.initialize = function () {
    if (!this.entity.element) return;
    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

DisableEntityOnClick.prototype.onClick = function () {
    if (!this.targetEntity) {
        console.error('disableEntityOnClick: No targetEntity set.');
        return;
    }
    this.targetEntity.enabled = false;
};

DisableEntityOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};