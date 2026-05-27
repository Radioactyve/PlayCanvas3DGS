import { Script, StandardMaterial, BLEND_NONE } from 'playcanvas';
import { Css3Plane } from './css3-renderer.mjs';

export class IframePlane extends Script {
    static scriptName = 'iframePlane';

    /** @attribute */
    iframeUrl = '';

    /** @attribute */
    pixelsPerUnit = 640;

    /** @attribute */
    flipFacing = true;

    /** @attribute */
    enableVrPointerBridge = true;

    initialize() {
        let element = null;
        this._iframeContainer = null;
        this._iframeElement = null;

        if (this.iframeUrl) {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.inset = '0';
            container.style.overflow = 'hidden';
            container.style.pointerEvents = 'auto';
            container.style.transformStyle = 'preserve-3d';
            container.style.backfaceVisibility = 'hidden';
            container.style.webkitBackfaceVisibility = 'hidden';

            const iframe = document.createElement('iframe');
            iframe.src = this.iframeUrl;
            iframe.style.position = 'absolute';
            iframe.style.left = '0';
            iframe.style.top = '0';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = '0';
            iframe.style.display = 'block';
            iframe.style.pointerEvents = 'auto';
            iframe.style.transform = 'translateZ(0)';
            iframe.style.backfaceVisibility = 'hidden';
            iframe.style.webkitBackfaceVisibility = 'hidden';

            container.appendChild(iframe);
            element = container;
            this._iframeContainer = container;
            this._iframeElement = iframe;
        }

        this._css3Plane = new Css3Plane(element, this.entity, this.pixelsPerUnit);
        this._css3Plane.flipFacing = !!this.flipFacing;

        const material = new StandardMaterial();
        material.depthWrite = true;
        material.redWrite = false;
        material.greenWrite = false;
        material.blueWrite = false;
        material.alphaWrite = false;
        material.blendType = BLEND_NONE;
        material.opacity = 0;
        material.update();

        if (this.entity.render) this.entity.render.material = material;

        this.on('enable', () => this._css3Plane && this._css3Plane.enable());
        this.on('disable', () => this._css3Plane && this._css3Plane.disable());
    }

    _toLocalPoint(worldPoint) {
        const inv = this.entity.getWorldTransform().clone().invert();
        return inv.transformPoint(worldPoint);
    }

    _worldPointToPixel(worldPoint) {
        if (!this._css3Plane || !this._css3Plane.dom) return null;

        const local = this._toLocalPoint(worldPoint);
        const scale = this.entity.getWorldTransform().getScale();
        const widthWorld = Math.abs(scale.x);
        const heightWorld = Math.abs(scale.z);
        if (widthWorld <= 1e-6 || heightWorld <= 1e-6) return null;

        const u = (local.x / widthWorld) + 0.5;
        const v = 0.5 - (local.z / heightWorld);

        if (u < 0 || u > 1 || v < 0 || v > 1) return null;

        const dom = this._css3Plane.dom;
        return {
            x: u * dom.clientWidth,
            y: v * dom.clientHeight
        };
    }

    dispatchVrPointer(type, worldPoint) {
        if (!this.enableVrPointerBridge || !this._iframeElement || !worldPoint) return false;

        const localPixel = this._worldPointToPixel(worldPoint);
        if (!localPixel) return false;

        const rect = this._iframeElement.getBoundingClientRect();
        const clientX = rect.left + localPixel.x;
        const clientY = rect.top + localPixel.y;

        const eventMap = {
            move: 'mousemove',
            down: 'mousedown',
            up: 'mouseup',
            click: 'click'
        };

        const eventType = eventMap[type];
        if (!eventType) return false;

        this._iframeElement.dispatchEvent(new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            clientX: clientX,
            clientY: clientY,
            button: 0
        }));

        return true;
    }
}
