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

    initialize() {
        let element = null;
        if (this.iframeUrl) {
            element = document.createElement('iframe');
            element.src = this.iframeUrl;
            element.style.border = '0';
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
}
