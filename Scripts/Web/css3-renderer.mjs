import { Application, Entity, Mat4, Vec2, PROJECTION_PERSPECTIVE, PROJECTION_ORTHOGRAPHIC } from 'playcanvas';

const epsilon = (value) => (Math.abs(value) < 1e-10 ? 0 : value);

function getCameraCSSMatrix(matrix) {
    const e = matrix.data;
    return `matrix3d(${epsilon(e[0])},${epsilon(-e[1])},${epsilon(e[2])},${epsilon(e[3])},${epsilon(e[4])},${epsilon(-e[5])},${epsilon(e[6])},${epsilon(e[7])},${epsilon(e[8])},${epsilon(-e[9])},${epsilon(e[10])},${epsilon(e[11])},${epsilon(e[12])},${epsilon(-e[13])},${epsilon(e[14])},${epsilon(e[15])})`;
}

function getObjectCSSMatrix(matrix, scaleX, scaleY) {
    const e = matrix.data;
    const matrix3d = `matrix3d(${epsilon(e[0] / scaleX)},${epsilon(e[1] / scaleX)},${epsilon(e[2] / scaleX)},${epsilon(e[3] / scaleX)},${epsilon(e[8] / scaleY)},${epsilon(e[9] / scaleY)},${epsilon(e[10] / scaleY)},${epsilon(e[11] / scaleY)},${epsilon(e[4])},${epsilon(e[5])},${epsilon(e[6])},${epsilon(e[7])},${epsilon(e[12])},${epsilon(e[13])},${epsilon(e[14])},${epsilon(e[15])})`;
    return `translate(-50%,-50%)${matrix3d}`;
}

export class Css3Renderer {
    constructor() {
        const app = Application.getApplication();
        if (!app) throw new Error('Css3Renderer: app not ready');
        if (app.css3Renderer) return app.css3Renderer;

        this.app = app;
        this._cameras = [];
        this._cameraElements = [];
        this._css3Targets = [];
        this._cameraInvertMat = new Mat4();
        this._cameraHalfSize = new Vec2();

        const stage = document.createElement('div');
        stage.style.overflow = 'hidden';
        stage.style.pointerEvents = 'auto';
        this._stageElement = stage;

        const canvas = document.getElementById('application-canvas');
        if (canvas) {
            canvas.style.pointerEvents = 'none';
            document.body.insertBefore(stage, canvas);
        } else {
            document.body.appendChild(stage);
        }

        this._defaultCameraElement = this.addCamera(app.root.findComponent('camera'));

        const onResize = () => {
            this._width = window.innerWidth;
            this._height = window.innerHeight;
            this._widthHalf = this._width / 2;
            this._heightHalf = this._height / 2;
            stage.style.width = `${this._width}px`;
            stage.style.height = `${this._height}px`;
            for (const el of this._cameraElements) {
                el.style.width = `${this._width}px`;
                el.style.height = `${this._height}px`;
            }
        };
        onResize();
        window.addEventListener('resize', onResize, false);

        app.css3Renderer = this;
    }

    addCamera(camera) {
        if (!camera) return this._defaultCameraElement;
        const idx = this._cameras.indexOf(camera);
        if (idx !== -1) return this._cameraElements[idx];

        const el = document.createElement('div');
        el.style.transformStyle = 'preserve-3d';
        el.style.pointerEvents = 'none';
        this._stageElement.appendChild(el);

        this._cameras.push(camera);
        this._cameraElements.push(el);
        return el;
    }

    addTarget(t) { if (!this._css3Targets.includes(t)) this._css3Targets.push(t); }
    removeTarget(t) { this._css3Targets = this._css3Targets.filter((x) => x !== t); }

    render() {
        if (this._isRendering) return;
        this._isRendering = true;
        this.app.on('update', this._renderElements, this);
    }

    _renderElements() {
        for (let i = 0; i < this._cameras.length; i++) {
            const camera = this._cameras[i];
            const cameraElement = this._cameraElements[i];
            const fov = camera.projectionMatrix.data[5] * this._heightHalf;

            if (camera.projection === PROJECTION_PERSPECTIVE) {
                this._stageElement.style.perspective = `${fov}px`;
            } else {
                this._stageElement.style.perspective = '';
            }

            let tx = 0, ty = 0;
            if (camera.projection === PROJECTION_ORTHOGRAPHIC) {
                Mat4._getPerspectiveHalfSize(this._cameraHalfSize, camera.fov, camera.aspectRatio, camera.nearClip, camera.horizontalFov);
                tx = 0; ty = 0;
            }

            this._cameraInvertMat.copy(camera.entity.getWorldTransform()).invert();
            const camCss = camera.projection === PROJECTION_ORTHOGRAPHIC
                ? `scale(${fov})translate(${epsilon(tx)}px,${epsilon(ty)}px)${getCameraCSSMatrix(this._cameraInvertMat)}`
                : `translateZ(${fov}px)${getCameraCSSMatrix(this._cameraInvertMat)}`;

            const style = `${camCss}translate(${this._widthHalf}px,${this._heightHalf}px)`;
            cameraElement.style.transform = style;
        }

        for (const t of this._css3Targets) t.updateTransform();
    }
}

export class Css3Plane {
    constructor(dom, entity, pixelsPerWorldUnit = 1920, camera = null) {
        const app = Application.getApplication();
        if (!app.css3Renderer) app.css3Renderer = new Css3Renderer();
        this._renderer = app.css3Renderer;

        this.dom = dom || document.createElement('div');
        this.dom.style.position = 'absolute';
        this.dom.style.pointerEvents = 'auto';

        this.entity = entity || new Entity();
        if (!entity) app.root.addChild(this.entity);

        this.cameraElement = this._renderer.addCamera(camera);
        this.cameraElement.appendChild(this.dom);

        this._maxWidth = 1920;
        this._maxHeight = 1080;
        this.pixelsPerWorldUnit = new Vec2(pixelsPerWorldUnit, pixelsPerWorldUnit);

        this._renderer.addTarget(this);
        this._renderer.render();
    }

    updateTransform() {
        const wt = this.entity.getWorldTransform();
        const s = wt.getScale();
        const width = Math.min(s.x * this.pixelsPerWorldUnit.x, this._maxWidth);
        const height = Math.min(s.z * this.pixelsPerWorldUnit.y, this._maxHeight);
        const style = getObjectCSSMatrix(wt, width, height);

        this.dom.style.width = `${Math.round(width)}px`;
        this.dom.style.height = `${Math.round(height)}px`;
        this.dom.style.transform = style;
    }

    enable() { this.cameraElement.appendChild(this.dom); this._renderer.addTarget(this); }
    disable() { if (this.dom.parentNode) this.cameraElement.removeChild(this.dom); this._renderer.removeTarget(this); }
}