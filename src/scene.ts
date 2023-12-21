import GUI from "lil-gui";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Clock,
  GridHelper,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import * as animations from "./helpers/animations";
import { toggleFullScreen } from "./helpers/fullscreen";
import { resizeRendererToDisplaySize } from "./helpers/responsiveness";
import "./style.css";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

const CANVAS_ID = "scene";

let delta = 1 / 30;
let interval = 1 / 30;

let canvas: HTMLElement;
let renderer: WebGLRenderer;
let scene: Scene;
let loadingManager: LoadingManager;
let ambientLight: AmbientLight;
let pointLight: PointLight;
let cubes: Mesh[] = [];
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
let dragControls: DragControls;
let transformControls: TransformControls[] = [];
let axesHelper: AxesHelper;
let pointLightHelper: PointLightHelper;
let clock: Clock;
let stats: Stats;
let gui: GUI;
let gridHelper: GridHelper;
let planeGeometry: PlaneGeometry;
let qubesFolder: any;

const animation = { enabled: false, play: true };

let isTransforming = true;

const myHelpers = {
  myBoolean: true,
  toggleTransform: function () {
    if (isTransforming) {
      transformControls.forEach((t) => {
        t.enabled = false;
        t.visible = false;
      });
      isTransforming = false;
    } else {
      transformControls.forEach((t) => {
        t.enabled = true;
        t.visible = true;
      });
      isTransforming = true;
    }
  },

  addQube: function () {
    const sideLength = 1;
    const cubeGeometry = new BoxGeometry(sideLength, sideLength, sideLength);
    const cubeMaterial = new MeshStandardMaterial({
      color: "#f69f1f",
      metalness: 0.5,
      roughness: 0.7,
    });
    const cube = new Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    cube.position.y = 0.5;

    cube.userData.limit = {
      min: new Vector3(
        -(planeGeometry.parameters.width / 2),
        cube.position.y,
        -(planeGeometry.parameters.width / 2)
      ),
      max: new Vector3(
        planeGeometry.parameters.width / 2,
        cube.position.y,
        planeGeometry.parameters.width / 2
      ),
    };
    cube.userData.update = function () {
      cube.position.clamp(cube.userData.limit.min, cube.userData.limit.max);
    };
    cubes.push(cube);
    scene.add(cube);

    const transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.enabled = true;
    transformControl.showY = false;
    transformControl.addEventListener("dragging-changed", function (event) {
      cameraControls.enabled = !event.value;
    });

    transformControl.attach(cube);
    transformControls.push(transformControl);
    scene.add(transformControl);

    const cubeSubFolder = qubesFolder.addFolder("Cube " + cube.id);

    /*cubeSubFolder
      .add(cube.position, "x")
      .min(-5)
      .max(5)
      .step(0.5)
      .name("pos x");
    cubeSubFolder
      .add(cube.position, "y")
      .min(-5)
      .max(5)
      .step(0.5)
      .name("pos y");
    cubeSubFolder
      .add(cube.position, "z")
      .min(-5)
      .max(5)
      .step(0.5)
      .name("pos z");*/

    /*cubeSubFolder.add(cube.material, "wireframe");*/
    cubeSubFolder.addColor(cube.material, "color");
    /*cubeSubFolder.add(cube.material, "metalness", 0, 1, 0.1);
    cubeSubFolder.add(cube.material, "roughness", 0, 1, 0.1);*/

    /*cubeSubFolder
      .add(cube.rotation, "x", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
      .name("rotate x");*/
    cubeSubFolder
      .add(cube.rotation, "y", 0, Math.PI * 2, 0.01)
      .name("rotate y");
    /*cubeSubFolder
      .add(cube.rotation, "z", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
      .name("rotate z");

    cubeSubFolder.add(animation, "enabled").name("animated");*/
  },
  myNumber: 1,
};

init();
animate();

function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!;
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    scene = new Scene();
  }

  // ===== 👨🏻‍💼 LOADING MANAGER =====
  {
    loadingManager = new LoadingManager();

    loadingManager.onStart = () => {
      console.log("loading started");
    };
    loadingManager.onProgress = (url, loaded, total) => {
      console.log("loading in progress:");
      console.log(`${url} -> ${loaded} / ${total}`);
    };
    loadingManager.onLoad = () => {
      console.log("loaded!");
    };
    loadingManager.onError = () => {
      console.log("❌ error while loading");
    };
  }

  // ===== 💡 LIGHTS =====
  {
    ambientLight = new AmbientLight("white", 0.4);
    pointLight = new PointLight("#ffdca8", 1.2, 100);
    pointLight.position.set(-2, 3, 3);
    pointLight.castShadow = true;
    pointLight.shadow.radius = 4;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 4000;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    scene.add(ambientLight);
    scene.add(pointLight);
  }

  // ===== 📦 OBJECTS =====
  {
    planeGeometry = new PlaneGeometry(10, 10);
    const planeMaterial = new MeshLambertMaterial({
      color: "gray",
      emissive: "teal",
      emissiveIntensity: 0.2,
      side: 2,
      transparent: true,
      opacity: 0.4,
    });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(Math.PI / 2);
    plane.receiveShadow = true;
    scene.add(plane);
  }

  // ===== 🎥 CAMERA =====
  {
    camera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.set(2, 2, 5);
  }

  // ===== 🕹️ CONTROLS =====
  {
    cameraControls = new OrbitControls(camera, canvas);
    cameraControls.target = new Vector3();
    cameraControls.enableDamping = true;
    cameraControls.autoRotate = false;
    cameraControls.update();

    dragControls = new DragControls(cubes, camera, renderer.domElement);
    dragControls.addEventListener("hoveron", (event) => {
      event.object.material.emissive.set("orange");
    });
    dragControls.addEventListener("hoveroff", (event) => {
      event.object.material.emissive.set("black");
    });
    dragControls.addEventListener("dragstart", (event) => {
      cameraControls.enabled = false;
      animation.play = false;
      event.object.material.emissive.set("black");
      event.object.material.opacity = 0.7;
      event.object.material.needsUpdate = true;
    });
    dragControls.addEventListener("dragend", (event) => {
      cameraControls.enabled = true;
      animation.play = true;
      event.object.material.emissive.set("black");
      event.object.material.opacity = 1;
      event.object.material.needsUpdate = true;
    });
    dragControls.enabled = false;

    // Full screen
    window.addEventListener("dblclick", (event) => {
      if (event.target === canvas) {
        toggleFullScreen(canvas);
      }
    });
  }

  // ===== 🪄 HELPERS =====
  {
    axesHelper = new AxesHelper(4);
    axesHelper.visible = false;
    scene.add(axesHelper);

    pointLightHelper = new PointLightHelper(pointLight, undefined, "orange");
    pointLightHelper.visible = false;
    scene.add(pointLightHelper);

    gridHelper = new GridHelper(20, 20, "teal", "darkgray");
    gridHelper.position.y = -0.01;
    gridHelper.visible = true;
    scene.add(gridHelper);
  }

  // ===== 📈 STATS & CLOCK =====
  {
    clock = new Clock();
    stats = new Stats();
    document.body.appendChild(stats.dom);
  }

  // ==== 🐞 DEBUG GUI ====
  {
    gui = new GUI({ title: "Settings", width: 300 });

    qubesFolder = gui.addFolder("Qubes");
    qubesFolder.add(myHelpers, "addQube").name("add qube"); // Button

    const controlsFolder = gui.addFolder("Controls");
    controlsFolder.add(dragControls, "enabled").name("drag controls");
    controlsFolder.add(myHelpers, "toggleTransform").name("toggle transform");

    const lightsFolder = gui.addFolder("Lights");
    lightsFolder.add(pointLight, "visible").name("point light");
    lightsFolder.add(ambientLight, "visible").name("ambient light");

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(gridHelper, "visible").name("grid");
    helpersFolder.add(axesHelper, "visible").name("axes");
    helpersFolder.add(pointLightHelper, "visible").name("pointLight");

    const cameraFolder = gui.addFolder("Camera");
    cameraFolder.add(cameraControls, "autoRotate");

    // persist GUI state in local storage on changes
    gui.onFinishChange(() => {
      const guiState = gui.save();
      localStorage.setItem("guiState", JSON.stringify(guiState));
    });

    // load GUI state if available in local storage
    const guiState = localStorage.getItem("guiState");
    if (guiState) gui.load(JSON.parse(guiState));

    // reset GUI state button
    const resetGui = () => {
      localStorage.removeItem("guiState");
      gui.reset();
    };
    gui.add({ resetGui }, "resetGui").name("RESET");

    gui.close();
  }
}

function animate() {
  requestAnimationFrame(animate);

  delta += clock.getDelta();

  if (delta > interval) {
    // The draw or time dependent code are here

    stats.update();

    cubes.forEach((o) => {
      o.userData.update();
    });

    /*if (animation.enabled && animation.play) {
      animations.rotate(cube, clock, Math.PI / 3);
      animations.bounce(cube, clock, 1, 0.5, 0.5);
    }*/

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cameraControls.update();

    renderer.render(scene, camera);

    delta = delta % interval;
  }
}
