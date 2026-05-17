var DisableEntitiesOnClick = pc.createScript('disableEntitiesOnClick');

DisableEntitiesOnClick.attributes.add('targetEntities', {
    type: 'entity',
    array: true,
    title: 'Target Entities'
});

DisableEntitiesOnClick.attributes.add('managerEntity', {
    type: 'entity',
    title: 'Manager Entity'
});

DisableEntitiesOnClick.attributes.add('targetSlotNames', {
    type: 'string',
    array: true,
    title: 'Target Slot Names'
});

DisableEntitiesOnClick.prototype.initialize = function () {
    if (!this.entity.element) return;
    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

DisableEntitiesOnClick.prototype.onClick = function () {
    for (var i = 0; i < this.targetEntities.length; i++) {
        var target = this.targetEntities[i];
        if (target) target.enabled = false;
    }

    var managerScript = this.managerEntity && this.managerEntity.script && this.managerEntity.script.worldStateManager;
    if (!managerScript) return;

    for (var j = 0; j < this.targetSlotNames.length; j++) {
        var slotName = (this.targetSlotNames[j] || '').trim();
        if (!slotName) continue;
        managerScript.disableSlot(slotName);
    }
};

DisableEntitiesOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};