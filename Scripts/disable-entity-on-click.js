var DisableEntitiesOnClick = pc.createScript('disableEntitiesOnClick');

DisableEntitiesOnClick.attributes.add('targetEntities', {
    type: 'entity',
    array: true,
    title: 'Target Entities'
});

DisableEntitiesOnClick.attributes.add('useManagerSlot', {
    type: 'boolean',
    default: false,
    title: 'Use Manager Slot'
});

DisableEntitiesOnClick.attributes.add('managerEntity', {
    type: 'entity',
    title: 'Manager Entity'
});

DisableEntitiesOnClick.attributes.add('slotName', {
    type: 'string',
    default: 'currentUI',
    title: 'Slot Name'
});

type: 'boolean',
DisableEntitiesOnClick.attributes.add('disableEntityFromSlot', {
    default: false,
    title: 'Disable Entity In Slot'
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

    if (!this.useManagerSlot) return;

    var managerScript = this.managerEntity && this.managerEntity.script && this.managerEntity.script.worldStateManager;
    if (!managerScript) {
        console.error('disableEntitiesOnClick: managerEntity missing worldStateManager script.');
        return;
    }

    if (this.disableEntityFromSlot) {
        managerScript.disableSlot(this.slotName);
    }
};

DisableEntitiesOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};
