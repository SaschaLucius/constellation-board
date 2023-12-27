import GUI from "lil-gui";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Clock,
  GridHelper,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  Raycaster,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import Stats from "three/examples/jsm/libs/stats.module";
import * as animations from "./helpers/animations";
import { toggleFullScreen } from "./helpers/fullscreen";
import { resizeRendererToDisplaySize } from "./helpers/responsiveness";
import "./style.css";
import { TransformControls } from "./helpers/TransformControls";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

const CANVAS_ID = "scene";

let delta = 1 / 30;
const interval = 1 / 30;

let canvas: HTMLElement;

let renderer: WebGLRenderer;
let labelRenderer: CSS2DRenderer;

let scene: Scene;

let loadingManager: LoadingManager;

let ambientLight: AmbientLight;
let pointLight: PointLight;
let pointLightHelper: PointLightHelper;

let globalCamera: PerspectiveCamera;
let cameraControls: OrbitControls;
let playerCamera: PerspectiveCamera;
let pointerControls: PointerLockControls;
let activeCamera: PerspectiveCamera;

let planeGeometry: PlaneGeometry;
let plane: Mesh;

let playerCount = 0;
const players: {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  transform: TransformControls;
  label: CSS2DObject;
  gui: GUI;
}[] = [];
const meshes: Mesh[] = [];

let transformControlsEnabled = true;
let dragControls: DragControls;

let axesHelper: AxesHelper;
let gridHelper: GridHelper;

let clock: Clock;
let stats: Stats;

let gui: GUI;
let guiPlayersFolder: any;

const animation = { enabled: false, play: true };

const myHelpers = {
  togglePlayerNames: function () {
    activeCamera.layers.toggle(1);
  },
  toggleTransform: function () {
    if (transformControlsEnabled) {
      players
        .map((a) => a.transform)
        .forEach((t) => {
          t.enabled = false;
          t.visible = false;
        });
      transformControlsEnabled = false;
    } else {
      players
        .map((a) => a.transform)
        .forEach((t) => {
          t.enabled = true;
          t.visible = true;
        });
      transformControlsEnabled = true;
    }
  },

  addPlayer: function () {
    const playerNumber = playerCount++;
    // Label
    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = "Player " + playerNumber;
    labelDiv.style.backgroundColor = "transparent";
    const playerName = new CSS2DObject(labelDiv);
    playerName.position.set(0, 0, 0);
    playerName.center.set(0, 1);
    playerName.layers.set(1);

    // Geometry
    const sideLength = 1;
    const cubeGeometry = new BoxGeometry(sideLength, sideLength, sideLength);
    const cubeMaterial = new MeshStandardMaterial({
      color: "#f69f1f",
    });
    const cube = new Mesh(cubeGeometry, cubeMaterial);

    cube.castShadow = true;
    cube.position.y = 0.5;
    cube.add(playerName);

    // Limit
    cube.userData.limit = {
      min: new Vector3(
        -(planeGeometry.parameters.width / 2),
        cube.scale.y / 2,
        -(planeGeometry.parameters.height / 2)
      ),
      max: new Vector3(
        planeGeometry.parameters.width / 2,
        cube.scale.y / 2,
        planeGeometry.parameters.height / 2
      ),
    };
    cube.userData.update = function () {
      cube.position.clamp(cube.userData.limit.min, cube.userData.limit.max);
    };

    // Transformation
    const transformControl = new TransformControls(
      globalCamera,
      labelRenderer.domElement,
      cube
    );
    transformControl.addEventListener("dragging-changed", function (event) {
      cameraControls.enabled = !event.value;
    });
    transformControl.mode = "translate"; // rotate, scale, translate

    scene.add(cube);
    scene.add(transformControl);

    // GUI
    const playerSubFolder = guiPlayersFolder.addFolder(
      "Player " + playerNumber
    );
    playerSubFolder.addColor(cube.material, "color");
    playerSubFolder
      .add(cube.rotation, "y", 0, Math.PI * 2, 0.01)
      .name("rotation");
    playerSubFolder.add(cube.scale, "y", 0, 2, 0.01).name("height");
    playerSubFolder.add(labelDiv, "textContent").name("name");

    players.push({
      mesh: cube,
      transform: transformControl,
      label: playerName,
      gui: playerSubFolder,
    });
    meshes.push(cube);
  },

  topCamera: function () {
    activeCamera = globalCamera;
    globalCamera.position.set(0, 11, 0);
    cameraControls.target = new Vector3();
    cameraControls.update();
  },
};

function ondblclick(event: any) {
  let x = (event.clientX / window.innerWidth) * 2 - 1;
  let y = -(event.clientY / window.innerHeight) * 2 + 1;
  let dir = new Vector3(x, y, -1);
  dir.unproject(globalCamera);

  let ray = new Raycaster(
    globalCamera.position,
    dir.sub(globalCamera.position).normalize()
  );
  var intersects = ray.intersectObjects(players.map((p) => p.mesh));
  if (intersects.length > 0) {
    const position = intersects[0].object.position;
    playerCamera.position.set(position.x, position.y, position.z);
    const rotation = intersects[0].object.rotation;
    playerCamera.rotation.set(rotation.x, rotation.y, rotation.z);
    activeCamera = playerCamera;
    cameraControls.enabled = false;
    pointerControls.lock();
  }
}

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
    document.body.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    document.body.appendChild(labelRenderer.domElement);

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
    planeGeometry = new PlaneGeometry(1, 1);
    const planeMaterial = new MeshLambertMaterial({
      color: "gray",
      emissive: "teal",
      emissiveIntensity: 0.2,
      side: 2,
    });
    plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(Math.PI / 2);
    plane.receiveShadow = true;
    plane.scale.set(10, 10, 0);
    scene.add(plane);
  }

  // ===== 🎥 CAMERAS =====
  {
    playerCamera = new PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    playerCamera.position.y = 0.75;
    playerCamera.layers.enableAll();

    globalCamera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    globalCamera.position.set(2, 2, 5);
    globalCamera.layers.enableAll();
    activeCamera = globalCamera;
  }

  // ===== 🕹️ CONTROLS =====
  {
    cameraControls = new OrbitControls(globalCamera, labelRenderer.domElement);
    cameraControls.target = new Vector3();
    cameraControls.enableDamping = true;
    cameraControls.autoRotate = false;
    cameraControls.update();

    pointerControls = new PointerLockControls(
      playerCamera,
      labelRenderer.domElement
    );
    pointerControls.addEventListener("lock", function () {
      console.log("lock");
    });

    pointerControls.addEventListener("unlock", function () {
      console.log("unlock");
    });
    scene.add(pointerControls.getObject());

    /*dragControls = new DragControls(
      meshes,
      globalCamera,
      labelRenderer.domElement
    );
    //dragControls.transformGroup = true;
    //dragControls.recursive = false;
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
    dragControls.enabled = false;*/

    window.addEventListener("dblclick", ondblclick, false);

    window.addEventListener("keydown", onDocumentKeyDown, false);
    function onDocumentKeyDown(event: any) {
      var keyCode = event.which;
      if (keyCode == 27) {
        activeCamera = globalCamera;
        cameraControls.enabled = true;
      }
    }
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
    gui = new GUI({ title: "Menue", width: 300 });

    guiPlayersFolder = gui.addFolder("Positions");
    guiPlayersFolder.add(myHelpers, "togglePlayerNames").name("Toggle Names");
    guiPlayersFolder.add(myHelpers, "addPlayer").name("Add Position");

    const cameraFolder = gui.addFolder("Camera");

    cameraFolder.add(cameraControls, "autoRotate").name("Rotate");
    cameraFolder.add(myHelpers, "topCamera").name("Top Down");

    const planeFolder = gui.addFolder("Plane");
    planeFolder.add(plane.scale, "x").name("Width");
    planeFolder.add(plane.scale, "y").name("Height");

    const controlsFolder = gui.addFolder("Controls");
    //controlsFolder.add(dragControls, "enabled").name("Drag");
    controlsFolder
      .add(myHelpers, "toggleTransform")
      .name("Toggle Transformation");

    const lightsFolder = gui.addFolder("Lights");
    lightsFolder.add(pointLight, "visible").name("point light");
    lightsFolder.add(ambientLight, "visible").name("ambient light");

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(gridHelper, "visible").name("grid");
    helpersFolder.add(axesHelper, "visible").name("axes");
    helpersFolder.add(pointLightHelper, "visible").name("pointLight");

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

    players.forEach((player) => {
      player.mesh.userData.limit = {
        min: new Vector3(
          -(plane.scale.x / 2),
          player.mesh.scale.y / 2,
          -(plane.scale.y / 2)
        ),
        max: new Vector3(
          plane.scale.x / 2,
          player.mesh.scale.y / 2,
          plane.scale.y / 2
        ),
      };
      player.mesh.userData.update();
    });

    /*if (animation.enabled && animation.play) {
      animations.rotate(cube, clock, Math.PI / 3);
      animations.bounce(cube, clock, 1, 0.5, 0.5);
    }*/

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      activeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      activeCamera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    cameraControls.update();

    labelRenderer.render(scene, activeCamera);
    renderer.render(scene, activeCamera);

    delta = delta % interval;
  }
}
