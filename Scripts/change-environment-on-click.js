var ChangeEnvironmentOnClick = pc.createScript('changeEnvironmentOnClick');

ChangeEnvironmentOnClick.attributes.add('managerEntity', {
    type: 'entity',
    title: 'Manager Entity'
});

ChangeEnvironmentOnClick.attributes.add('environmentId', {
    type: 'string',
    default: '',
    title: 'Environment Id'
});

ChangeEnvironmentOnClick.attributes.add('environmentIndex', {
    type: 'number',
    default: -1,
    title: 'Environment Index'
});

ChangeEnvironmentOnClick.prototype.initialize = function () {
    if (!this.entity.element) {
        console.warn('changeEnvironmentOnClick: Entity needs an Element component.');
        return;
    }

    this.entity.element.on('click', this.onClick, this);
    this.entity.element.on('touchstart', this.onClick, this);
};

ChangeEnvironmentOnClick.prototype.onClick = function () {
    var managerScript = this.managerEntity && this.managerEntity.script && this.managerEntity.script.worldStateManager;
    if (!managerScript) {
        console.error('changeEnvironmentOnClick: managerEntity missing worldStateManager script.');
        return;
    }

    var id = (this.environmentId || '').trim();
    if (id) {
        managerScript.loadEnvironment(id);
        return;
    }

    if (this.environmentIndex >= 0) {
        managerScript.loadEnvironmentByIndex(this.environmentIndex);
        return;
    }

    console.error('changeEnvironmentOnClick: Environment Id is empty and Environment Index is not set.');
};

ChangeEnvironmentOnClick.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onClick, this);
    this.entity.element.off('touchstart', this.onClick, this);
};
