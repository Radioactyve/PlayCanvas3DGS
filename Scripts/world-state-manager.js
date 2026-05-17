var WorldStateManager = pc.createScript('worldStateManager');

WorldStateManager.attributes.add('currentUI', { type: 'entity', title: 'Current UI' });
WorldStateManager.attributes.add('currentWorldContent', { type: 'entity', title: 'Current WorldContent' });

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
