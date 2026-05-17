var { math, Vec2, Vec3, Mat4 } = pc;

const LOOK_MAX_ANGLE = 90;

const tmpVa = new Vec2();
const tmpV1 = new Vec3();
const tmpV2 = new Vec3();
const tmpM1 = new Mat4();

class CharacterController {
    /**
     * @type {Entity}
     * @private
     */
    _camera;

    /**
     * @type {RigidBodyComponent}
     * @private
     */
    _rigidbody;

    /**
     * @type {boolean}
     * @private
     */
    _jumping = false;

    /**
     * @type {AppBase}
     */
    app;

    /**
     * @type {Entity}
     */
    entity;

    /**
     * @type {Vec2}
     */
    look = new Vec2(0, 132.5);

    /**
     * @type {Record<string, boolean | number>}
     */
    controls = {
        forward: 0,
        backward: 0,
        left: 0,
        right: 0,
        jump: false,
        sprint: false
    };

    /**
     * @type {number}
     */
    lookSens = 0.08;

    /**
     * @type {number}
     */
    speedGround = 50;

    /**
     * @type {number}
     */
    speedAir = 5;

    /**
     * @type {number}
     */
    sprintMult = 1.5;

    /**
     * @type {number}
     */
    velocityDampingGround = 0.99;

    /**
     * @type {number}
     */
    velocityDampingAir = 0.99925;

    /**
     * @type {number}
     */
    jumpForce = 600;

    /**
     * @param {AppBase} app - The application.
     * @param {Entity} camera - The camera entity.
     * @param {Entity} entity - The controller entity.
     */
    constructor(app, camera, entity) {
        this.app = app;
        this.entity = entity;

        if (!camera) {
            throw new Error('No camera entity found');
        }
        this._camera = camera;
        if (!entity.rigidbody) {
            throw new Error('No rigidbody component found');
        }
        this._rigidbody = entity.rigidbody;
        
        this.app.on('cc:look', (movX, movY) => {
            this.look.x = math.clamp(this.look.x - movY * this.lookSens, -LOOK_MAX_ANGLE, LOOK_MAX_ANGLE);
            this.look.y -= movX * this.lookSens;
        })
        this.app.on('cc:move:forward', (val) => {
            this.controls.forward = val;
        });
        this.app.on('cc:move:backward', (val) => {
            this.controls.backward = val;
        });
        this.app.on('cc:move:left', (val) => {
            this.controls.left = val;
        });
        this.app.on('cc:move:right', (val) => {
            this.controls.right = val;
        });
        this.app.on('cc:jump', (state) => {
            this.controls.jump = state;
        });
        this.app.on('cc:sprint', (state) => {
            this.controls.sprint = state;
        })
    }

    /**
     * @private
     */
    _checkIfGrounded() {
        const start = this.entity.getPosition();
        const end = tmpV1.copy(start).add(Vec3.DOWN);
        end.y -= 0.1;
        this._grounded = !!this._rigidbody.system.raycastFirst(start, end);
    }

    /**
     * @private
     */
    _jump() {
        if (this.controls.jump && !this._jumping && this._grounded) {
            this._jumping = true;
            setTimeout(() => this._jumping = false, 50);

            this._rigidbody.applyImpulse(0, this.jumpForce, 0);
        }
    }

    /**
     * @private
     */
    _look() {
        this._camera.setLocalEulerAngles(this.look.x, this.look.y, 0);
    }

    /**
     * @param {number} dt - The delta time.
     */
    // _move(dt) {
    //     tmpM1.setFromAxisAngle(Vec3.UP, this.look.y);
    //     const dir = tmpV1.set(0, 0, 0);
    //     if (this.controls.forward) {
    //         dir.add(tmpV2.set(0, 0, -this.controls.forward));
    //     }
    //     if (this.controls.backward) {
    //         dir.add(tmpV2.set(0, 0, this.controls.backward));
    //     } 
    //     if (this.controls.left) {
    //         dir.add(tmpV2.set(-this.controls.left, 0, 0));
    //     }
    //     if (this.controls.right) {
    //         dir.add(tmpV2.set(this.controls.right, 0, 0));
    //     }
    //     tmpM1.transformVector(dir, dir);

    //     let speed = this._grounded ? this.speedGround : this.speedAir;
    //     if (this.controls.sprint) {
    //         speed *= this.sprintMult;
    //     }

    //     const accel = dir.mulScalar(speed * dt);
    //     const velocity = this._rigidbody.linearVelocity.add(accel);

    //     const damping = this._grounded ? this.velocityDampingGround : this.velocityDampingAir;
    //     const mult = Math.pow(damping, dt * 1e3);
    //     velocity.x *= mult;
    //     velocity.z *= mult;

    //     this._rigidbody.linearVelocity = velocity;
    // }


_move(dt) {
    // Get the camera's actual forward direction
    const forward = this._camera.forward;
    const right = this._camera.right;
    
    const dir = tmpV1.set(0, 0, 0);
    if (this.controls.forward) {
        dir.add(tmpV2.copy(forward).mulScalar(this.controls.forward)); // Remove the negative
    }
    if (this.controls.backward) {
        dir.add(tmpV2.copy(forward).mulScalar(-this.controls.backward)); // Add negative here
    } 
    if (this.controls.left) {
        dir.add(tmpV2.copy(right).mulScalar(-this.controls.left));
    }
    if (this.controls.right) {
        dir.add(tmpV2.copy(right).mulScalar(this.controls.right));
    }
    
    // Zero out Y component to keep movement horizontal
    dir.y = 0;
    dir.normalize();

    let speed = this._grounded ? this.speedGround : this.speedAir;
    if (this.controls.sprint) {
        speed *= this.sprintMult;
    }

    const accel = dir.mulScalar(speed * dt);
    const velocity = this._rigidbody.linearVelocity.add(accel);

    const damping = this._grounded ? this.velocityDampingGround : this.velocityDampingAir;
    const mult = Math.pow(damping, dt * 1e3);
    velocity.x *= mult;
    velocity.z *= mult;

    this._rigidbody.linearVelocity = velocity;
}



    /**
     * @param {number} dt - The delta time.
     */
    update(dt) {
        this._checkIfGrounded();
        this._jump();
        this._look();
        this._move(dt);
    }

    destroy() {
        
    }
}

// SCRIPTS

const CCScript = pc.createScript('character-controller');

CCScript.attributes.add('camera', { type: 'entity' });
CCScript.attributes.add('lookSens', { type: 'number', default: 0.08 });
CCScript.attributes.add('speedGround', { type: 'number', default: 50 });
CCScript.attributes.add('speedAir', { type: 'number', default: 5 });
CCScript.attributes.add('sprintMult', { type: 'number', default: 1.5 });
CCScript.attributes.add('velocityDampingGround', { type: 'number', default: 0.99 });
CCScript.attributes.add('velocityDampingAir', { type: 'number', default: 0.99925 });
CCScript.attributes.add('jumpForce', { type: 'number', default: 600 });

CCScript.prototype.initialize = function () {
    this.controller = new CharacterController(this.app, this.camera, this.entity);
    this.controller.lookSens = this.lookSens;
    this.controller.speedGround = this.speedGround;
    this.controller.speedAir = this.speedAir;
    this.controller.sprintMult = this.sprintMult;
    this.controller.velocityDampingGround = this.velocityDampingGround;
    this.controller.velocityDampingAir = this.velocityDampingAir;
    this.controller.jumpForce = this.jumpForce;

    this.on('destroy', () => controller.destroy());
};

CCScript.prototype.update = function (dt) {
    this.controller.update(dt);
};