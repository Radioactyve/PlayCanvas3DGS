var SetManagerSlotOnClick = pc.createScript('setManagerSlotOnClick');

SetManagerSlotOnClick.attributes.add('managerEntity', {
    type: 'entity',
    title: 'Manager Entity'
});

SetManagerSlotOnClick.attributes.add('slotName', {
    type: 'string',
    default: 'currentUI',
    title: 'Slot Name'
});

SetManagerSlotOnClick.attributes.add('entityToSet', {
    type: 'entity',
    title: 'Entity To Set'
});

SetManagerSlotOnClick.prototype.initialize = function () {
    if (!this.entity.element) return;
    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

SetManagerSlotOnClick.prototype.onClick = function () {
    var managerScript = this.managerEntity && this.managerEntity.script && this.managerEntity.script.worldStateManager;
    if (!managerScript) {
        console.error('setManagerSlotOnClick: managerEntity missing worldStateManager script.');
        return;
    }

    managerScript.setSlot(this.slotName, this.entityToSet || null);
};

SetManagerSlotOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};
