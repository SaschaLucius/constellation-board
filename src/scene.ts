import GUI from "lil-gui";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Clock,
  GridHelper,
  TextureLoader,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
  BackSide,
  MeshPhongMaterial,
  CylinderGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import Stats from "three/examples/jsm/libs/stats.module";
import { resizeRendererToDisplaySize } from "./helpers/responsiveness";
import "./style.css";
import { TransformControls } from "./helpers/TransformControls";
import { PointerLockControls } from "./helpers/PointerLockControls";
import { t } from "./locales/locales";

let debug = false;
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
let sphere: Mesh;

let playerCount = 0;
const players: {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  transform: TransformControls;
  label: CSS2DObject;
  gui: GUI;
}[] = [];
const meshes: Mesh[] = [];

let transformControlsEnabled = true;

let axesHelper: AxesHelper;
let gridHelper: GridHelper;

let clock: Clock;
let stats: Stats;

let gui: GUI;
let guiPlayersFolder: any;

const myHelpers = {
  playerType: "cube",
  togglePlayerNames: function () {
    activeCamera.layers.toggle(1);
  },

  toggleTransform: function () {
    if (transformControlsEnabled) {
      players
        .map((player) => player.transform)
        .forEach((transform) => {
          transform.enabled = false;
          transform.visible = false;
        });
      transformControlsEnabled = false;
    } else {
      players
        .map((player) => player.transform)
        .forEach((transform) => {
          transform.enabled = true;
          transform.visible = true;
        });
      transformControlsEnabled = true;
    }
  },

  addPlayer: function () {
    const playerNumber = playerCount++;
    // Label
    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = t("position", { count: playerNumber });
    labelDiv.style.backgroundColor = "transparent";
    const playerName = new CSS2DObject(labelDiv);
    playerName.position.set(0, 0, 0);
    playerName.center.set(0, 1);
    playerName.layers.set(1);

    // Geometry

    let geometry;
    switch (myHelpers.playerType) {
      case "cube":
        geometry = new BoxGeometry(1, 1, 1);
        break;
      case "cylinder":
        geometry = new CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      default:
        geometry = new BoxGeometry(1, 1, 1);
        break;
    }

    const cubeMaterial = new MeshStandardMaterial({
      color: "#f69f1f",
    });
    const mesh = new Mesh(geometry, cubeMaterial);

    mesh.castShadow = true;
    mesh.position.y = 1 / 2;
    mesh.add(playerName);

    // Limit
    mesh.userData.limit = {
      min: new Vector3(
        -(planeGeometry.parameters.width / 2),
        mesh.scale.y / 2,
        -(planeGeometry.parameters.height / 2)
      ),
      max: new Vector3(
        planeGeometry.parameters.width / 2,
        mesh.scale.y / 2,
        planeGeometry.parameters.height / 2
      ),
    };
    mesh.userData.update = function () {
      mesh.position.clamp(mesh.userData.limit.min, mesh.userData.limit.max);
      mesh.scale.clampScalar(0.5, 3);
    };

    // Transformation
    const transformControl = new TransformControls(
      globalCamera,
      labelRenderer.domElement,
      mesh
    );
    transformControl.addEventListener("dragging-changed", function (event) {
      cameraControls.enabled = !event.value;
    });
    transformControl.mode = "translate"; // rotate, scale, translate
    transformControl.enabled = transformControlsEnabled;
    transformControl.visible = transformControlsEnabled;
    scene.add(mesh);
    scene.add(transformControl);

    // GUI
    const playerSubFolder = guiPlayersFolder.addFolder(
      "Position " + playerNumber
    );
    playerSubFolder.add(labelDiv, "textContent").name("name");
    playerSubFolder.addColor(mesh.material, "color");
    const help = {
      remove: function () {
        mesh.remove(playerName);
        scene.remove(mesh);
        scene.remove(transformControl);
        playerSubFolder.destroy();
      },
    };
    playerSubFolder.add(help, "remove").name("remove");

    players.push({
      mesh: mesh,
      transform: transformControl,
      label: playerName,
      gui: playerSubFolder,
    });
    meshes.push(mesh);
  },

  topCamera: function () {
    activeCamera = globalCamera;
    globalCamera.position.set(0, 11, 0);
    cameraControls.target = new Vector3();
    cameraControls.update();
  },
};

function onDblClick(event: any) {
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
    if (transformControlsEnabled) {
      players
        .map((player) => player.transform)
        .forEach((transform) => {
          transform.enabled = false;
          transform.visible = false;
        });
    }

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

function handleInstructions() {
  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");
  instructions.style.display = "";
  blocker.style.display = "block";

  const handleMouseDown = function () {
    if (instructions.style.display !== "none") {
      instructions.style.display = "none";
      blocker.style.display = "none";
      cameraControls.enabled = true;
      window.removeEventListener("click", handleMouseDown, false);
    }
  };
  window.addEventListener("click", handleMouseDown);
}

function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!;

    handleInstructions();

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
    const planeTexture = new TextureLoader().load("/wood/BaseColor.png");
    const normalTexture = new TextureLoader().load("/wood/Normal.png");

    const planeMaterial = new MeshPhongMaterial({
      map: planeTexture,
      normalMap: normalTexture,
      side: BackSide,
    });
    planeMaterial.normalScale.set(2, 2);
    plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(Math.PI / 2);
    plane.receiveShadow = true;
    plane.scale.set(10, 10, 0);
    scene.add(plane);

    const texture = new TextureLoader().load("/Stenbocki_maja.jpg");
    const material = new MeshBasicMaterial({
      map: texture,
      side: BackSide,
    });
    sphere = new Mesh(new SphereGeometry(60, 20, 20), material);
    sphere.position.y = 10;
    sphere.visible = false;

    scene.add(sphere);
  }

  // ===== 🎥 CAMERAS =====
  {
    playerCamera = new PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      200
    );
    playerCamera.position.y = 0.75;
    playerCamera.layers.enableAll();

    globalCamera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200
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
    cameraControls.maxPolarAngle = Math.PI / 2;
    cameraControls.minDistance = 0;
    cameraControls.maxDistance = 120;
    cameraControls.enabled = false;
    cameraControls.update();

    pointerControls = new PointerLockControls(
      playerCamera,
      labelRenderer.domElement
    );
    pointerControls.maxPolarAngleX = (Math.PI / 4) * 3;
    pointerControls.minPolarAngleX = Math.PI / 4;
    pointerControls.maxAngleY = Math.PI / 3;
    pointerControls.pointerSpeed = 0.5;

    scene.add(pointerControls.getObject());

    window.addEventListener("dblclick", onDblClick, false);

    window.addEventListener("keydown", onDocumentKeyDown, false);
    function onDocumentKeyDown(event: any) {
      var keyCode = event.which;
      if (keyCode == 27) {
        // ESC
        if (activeCamera === globalCamera) {
          cameraControls.enabled = false;
          handleInstructions();
        } else {
          activeCamera = globalCamera;
          cameraControls.enabled = true;

          if (transformControlsEnabled) {
            players
              .map((player) => player.transform)
              .forEach((transform) => {
                transform.enabled = true;
                transform.visible = true;
              });
          }
        }
      }
      if (keyCode == 191) {
        // ?
        debug = !debug;
      }
    }
  }

  // ===== 🪄 HELPERS =====
  {
    if (debug) {
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
  }

  // ===== 📈 STATS & CLOCK =====
  {
    clock = new Clock();
    if (debug) {
      stats = new Stats();
      document.body.appendChild(stats.dom);
    }
  }

  // ==== 🐞 DEBUG GUI ====
  {
    gui = new GUI({ title: "Menu", width: 300 });

    guiPlayersFolder = gui.addFolder("Positions");
    guiPlayersFolder.add(myHelpers, "togglePlayerNames").name("Toggle Names");
    guiPlayersFolder
      .add(myHelpers, "playerType", ["cube", "cylinder"])
      .name("Player Type");
    guiPlayersFolder.add(myHelpers, "addPlayer").name("Add Position");

    const cameraFolder = gui.addFolder("Camera");

    cameraFolder.add(cameraControls, "autoRotate").name("Rotate");
    cameraFolder.add(myHelpers, "topCamera").name("Top Down");

    const environmentFolder = gui.addFolder("Environment");
    environmentFolder.add(plane.scale, "x").name("Board Width");
    environmentFolder.add(plane.scale, "y").name("Board Height");
    environmentFolder.add(sphere, "visible").name("Room");

    const controlsFolder = gui.addFolder("Controls");
    controlsFolder
      .add(myHelpers, "toggleTransform")
      .name("Toggle Transformation");

    if (debug) {
      const lightsFolder = gui.addFolder("Lights");
      lightsFolder.add(pointLight, "visible").name("point light");
      lightsFolder.add(ambientLight, "visible").name("ambient light");

      const helpersFolder = gui.addFolder("Helpers");
      helpersFolder.add(gridHelper, "visible").name("grid");
      helpersFolder.add(axesHelper, "visible").name("axes");
      helpersFolder.add(pointLightHelper, "visible").name("pointLight");
    }
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

    if (debug) {
      stats.update();
    }

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
