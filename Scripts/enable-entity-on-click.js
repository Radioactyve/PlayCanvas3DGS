var EnableEntitiesOnClick = pc.createScript('enableEntitiesOnClick');

EnableEntitiesOnClick.attributes.add('targetEntities', {
    type: 'entity',
    array: true,
    title: 'Target Entities'
});

EnableEntitiesOnClick.prototype.initialize = function () {
    if (!this.entity.element) return;
    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

EnableEntitiesOnClick.prototype.onClick = function () {
    for (var i = 0; i < this.targetEntities.length; i++) {
        var target = this.targetEntities[i];
        if (target) target.enabled = true;
    }
};

EnableEntitiesOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};