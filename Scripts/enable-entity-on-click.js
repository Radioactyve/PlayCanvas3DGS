var EnableEntityOnClick = pc.createScript('enableEntityOnClick');

EnableEntityOnClick.attributes.add('targetEntity', {
    type: 'entity',
    title: 'Target Entity'
});

EnableEntityOnClick.prototype.initialize = function () {
    if (!this.entity.element) return;
    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

EnableEntityOnClick.prototype.onClick = function () {
    if (!this.targetEntity) {
        console.error('enableEntityOnClick: No targetEntity set.');
        return;
    }
    this.targetEntity.enabled = true;
};

EnableEntityOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};