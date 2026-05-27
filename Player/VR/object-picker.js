var ObjectPicker = pc.createScript('objectPicker');

ObjectPicker.prototype.initialize = function() {
    this.entities = this.app.root.findByTag('pickable');
    
    this.ray = new pc.Ray();
    this.rayFrom = new pc.Vec3();
    this.rayTo = new pc.Vec3();
    this.vec3A = new pc.Vec3();
    this.vec3B = new pc.Vec3();
    
    this.app.on('object:pick', this.pick, this);
};

ObjectPicker.prototype._isCandidate = function (entity) {
    var node = entity;
    while (node) {
        if (node.tags && (node.tags.has('pickable') || node.tags.has('interactive') || node.tags.has('teleportable'))) {
            return true;
        }
        if (node.button || node.element) {
            return true;
        }
        if (node.script && node.script.iframePlane) {
            return true;
        }
        node = node.parent || null;
    }
    return false;
};

ObjectPicker.prototype.pick = function(controller) {
    var hovered = null;
    var distance = Infinity;
    
    this.ray.set(controller.inputSource.getOrigin(), controller.inputSource.getDirection());
    this.rayFrom.copy(this.ray.origin);
    this.rayTo.copy(this.ray.direction).scale(1000).add(this.rayFrom);

    // First, try physics raycast for precise hit point and broader compatibility.
    if (this.app.systems && this.app.systems.rigidbody) {
        var hit = this.app.systems.rigidbody.raycastFirst(this.rayFrom, this.rayTo);
        if (hit && hit.entity && this._isCandidate(hit.entity)) {
            hovered = hit.entity;
            this.vec3B.copy(hit.point || this.rayFrom);
        }
    }

    // Fallback to AABB checks over pickable-tagged render entities.
    if (!hovered) {
        // refresh list in case pickable entities were dynamically added/removed
        this.entities = this.app.root.findByTag('pickable');

        // iterate through each interactible entities
        for (var e = 0; e < this.entities.length; e++) {
            if (!this.entities[e].render)
                continue;

            // get mesh
            var mesh = this.entities[e].render.meshInstances[0];

            // check if it intersects with controllers ray
            if (mesh.aabb.intersectsRay(this.ray, this.vec3A)) {
                // check distance between ray origin and intersecting point
                var dist = this.vec3A.distance(this.ray.origin);
                if (dist < distance) {
                    // if closer than previous candidate, remember it
                    distance = dist;
                    hovered = this.entities[e];
                    this.vec3B.copy(this.vec3A);
                }
            }
        }
    }

    if (hovered) {
        controller.fire('hover', hovered, this.vec3B);
    } else if (controller.hoverEntity) {
        controller.fire('blur');
    }
};
