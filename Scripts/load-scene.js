var LoadScene = pc.createScript('loadScene');

LoadScene.attributes.add('sceneName', {
    type: 'string',
    default: '',
    title: 'Scene Name'
});

LoadScene.prototype.initialize = function () {
    if (!this.entity.element) {
        console.warn('loadScene: Entity needs an Element component.');
        return;
    }

    this._loading = false;

    this.entity.element.on('click', this.onPress, this);
    this.entity.element.on('touchstart', this.onPress, this);
};

LoadScene.prototype.onPress = function () {
    if (this._loading) return;now 

    var name = (this.sceneName || '').trim();
    if (!name) {
        console.error('loadScene: Scene Name is empty on entity:', this.entity.name);
        return;
    }

    var scene = this.app.scenes.find(name);
    if (!scene) {
        console.error('loadScene: Scene not found in Scene Registry:', name);
        return;
    }

    this._loading = true;

    // Load by URL from Scene Registry entry.
    this.app.scenes.loadScene(scene.url, function (err) {
        this._loading = false;

        if (err) {
            console.error('loadScene: Failed to load scene:', name, err);
            return;
        }
    }.bind(this));
};

LoadScene.prototype.onDestroy = function () {
    if (!this.entity.element) return;
    this.entity.element.off('click', this.onPress, this);
    this.entity.element.off('touchstart', this.onPress, this);
};
