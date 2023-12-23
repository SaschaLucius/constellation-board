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
let players: Object3D[] = [];
let globalCamera: PerspectiveCamera;
let activeCamera: PerspectiveCamera;
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
let plane: Mesh;
let qubesFolder: any;

const animation = { enabled: false, play: true };

let isTransforming = true;

const myHelpers = {
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
    var playerGroup = new Group();

    const sideLength = 1;
    const cubeGeometry = new BoxGeometry(sideLength, sideLength, sideLength);
    const cubeMaterial = new MeshStandardMaterial({
      color: "#f69f1f",
      metalness: 0.5,
      roughness: 0.7,
    });
    const cube = new Mesh(cubeGeometry, cubeMaterial);
    playerGroup.name = "Group " + cube.id;
    cube.castShadow = true;
    cube.position.y = 0.5;

    let newCamera = new PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    newCamera.position.y = 0.75;

    playerGroup.add(newCamera);
    playerGroup.add(cube);

    playerGroup.userData.limit = {
      min: new Vector3(
        -(planeGeometry.parameters.width / 2),
        0,
        -(planeGeometry.parameters.height / 2)
      ),
      max: new Vector3(
        planeGeometry.parameters.width / 2,
        0,
        planeGeometry.parameters.height / 2
      ),
    };
    playerGroup.userData.update = function () {
      playerGroup.position.clamp(
        playerGroup.userData.limit.min,
        playerGroup.userData.limit.max
      );
    };
    players.push(playerGroup);
    scene.add(playerGroup);

    const transformControl = new TransformControls(
      globalCamera,
      renderer.domElement
    );
    transformControl.showY = false;
    transformControl.addEventListener("dragging-changed", function (event) {
      cameraControls.enabled = !event.value;
    });

    transformControl.attach(playerGroup);
    transformControl.enabled = isTransforming;
    transformControl.visible = isTransforming;
    transformControls.push(transformControl);
    scene.add(transformControl);

    const playerSubFolder = qubesFolder.addFolder("Player " + cube.id);

    /*playerSubFolder
      .add(cube.position, "x")
      .min(-5)
      .max(5)
      .step(0.5)
      .name("pos x");
    playerSubFolder
      .add(cube.position, "y")
      .min(-5)
      .max(5)
      .step(0.5)
      .name("pos y");
    playerSubFolder
      .add(cube.position, "z")
      .min(-5)
      .max(5)
      .step(0.5)
      .name("pos z");*/

    /*playerSubFolder.add(cube.material, "wireframe");*/
    playerSubFolder.addColor(cube.material, "color");
    /*playerSubFolder.add(cube.material, "metalness", 0, 1, 0.1);
    playerSubFolder.add(cube.material, "roughness", 0, 1, 0.1);*/

    /*playerSubFolder
      .add(cube.rotation, "x", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
      .name("rotate x");*/
    playerSubFolder
      .add(playerGroup.rotation, "y", 0, Math.PI * 2, 0.01)
      .name("rotation");
    playerSubFolder.add(playerGroup.scale, "y", 0, 2, 0.01).name("height");
    /*playerSubFolder
      .add(cube.rotation, "z", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
      .name("rotate z");

    playerSubFolder.add(animation, "enabled").name("animated");*/
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
  var intersects = ray.intersectObjects(players);
  if (intersects.length > 0) {
    const group = intersects[0].object.parent as Group;
    const objectCamera = group.children[0] as PerspectiveCamera;
    activeCamera = objectCamera;
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

  // ===== 🎥 CAMERA =====
  {
    globalCamera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    globalCamera.position.set(2, 2, 5);
    activeCamera = globalCamera;
  }

  // ===== 🕹️ CONTROLS =====
  {
    cameraControls = new OrbitControls(globalCamera, canvas);
    cameraControls.target = new Vector3();
    cameraControls.enableDamping = true;
    cameraControls.autoRotate = false;
    cameraControls.update();

    dragControls = new DragControls(players, globalCamera, renderer.domElement);
    dragControls.transformGroup = true;
    dragControls.addEventListener("hoveron", (event) => {
      console.log(event.object);
      const mesh = event.object;
      mesh.material.emissive.set("orange");
    });
    dragControls.addEventListener("hoveroff", (event) => {
      const mesh = event.object;
      mesh.material.emissive.set("black");
    });
    dragControls.addEventListener("dragstart", (event) => {
      cameraControls.enabled = false;
      animation.play = false;
      const mesh = event.object.children[1];
      mesh.material.emissive.set("black");
      mesh.material.opacity = 0.7;
      mesh.material.needsUpdate = true;
    });
    dragControls.addEventListener("dragend", (event) => {
      cameraControls.enabled = true;
      animation.play = true;
      const mesh = event.object.children[1];
      mesh.material.emissive.set("black");
      mesh.material.opacity = 1;
      mesh.material.needsUpdate = true;
    });
    dragControls.enabled = false;

    // Full screen
    /*window.addEventListener("dblclick", (event) => {
      if (event.target === canvas) {
        toggleFullScreen(canvas);
      }
    });*/

    window.addEventListener("dblclick", ondblclick, false);

    window.addEventListener("keydown", onDocumentKeyDown, false);
    function onDocumentKeyDown(event: any) {
      var keyCode = event.which;
      if (keyCode == 27) {
        activeCamera = globalCamera;
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
    gui = new GUI({ title: "Settings", width: 300 });

    qubesFolder = gui.addFolder("Qubes");
    qubesFolder.add(myHelpers, "addQube").name("add qube"); // Button

    const planeFolder = gui.addFolder("Plane");
    planeFolder.add(plane.scale, "x").name("width");
    planeFolder.add(plane.scale, "y").name("height");

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
    cameraFolder.add(myHelpers, "topCamera").name("top down camera");

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
      player.userData.limit = {
        min: new Vector3(-(plane.scale.x / 2), 0, -(plane.scale.y / 2)),
        max: new Vector3(plane.scale.x / 2, 0, plane.scale.y / 2),
      };
      player.userData.update();
    });

    /*if (animation.enabled && animation.play) {
      animations.rotate(cube, clock, Math.PI / 3);
      animations.bounce(cube, clock, 1, 0.5, 0.5);
    }*/

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      activeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      activeCamera.updateProjectionMatrix();
    }

    cameraControls.update();

    renderer.render(scene, activeCamera);

    delta = delta % interval;
  }
}
