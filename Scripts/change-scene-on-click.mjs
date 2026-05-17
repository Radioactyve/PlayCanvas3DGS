import { Script } from 'playcanvas';

/**
 * Changes the scene when the entity's button is clicked.
 */
export class ChangeSceneOnClick extends Script {
    /**
     * The name of the scene to load.
     * 
     * @attribute
     * @title Scene Name
     * @type {string}
     */
    sceneName = '';

    // initialize code called once per entity
    initialize() {
        this.entity.button.once('click', () => {
            this.app.scenes.changeScene(this.sceneName);
        });
    }

    // swap method called for script hot-reloading
    // inherit your script state here
    // swap(old) { }
}