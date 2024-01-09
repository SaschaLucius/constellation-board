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
  CapsuleGeometry,
  ConeGeometry,
  Vector2,
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
import { t } from "./locales/locales";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import sphereMaterial from "/Stenbocki_maja.jpg?url";
import planeMaterials from "/wood/BaseColor.png?url";
import planeNormals from "/wood/Normal.png?url";
const loader = new GLTFLoader();

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const debug = urlParams.has("debug");
const performance = urlParams.has("performance");

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
let globalControls: OrbitControls;
let playerCamera: PerspectiveCamera;
let playerControls: OrbitControls;
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
    if (performance) {
      render();
    }
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
    if (performance) {
      render();
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
    let mesh;
    switch (myHelpers.playerType) {
      case "box":
        geometry = new BoxGeometry(1, 1, 1);
        break;
      case "capsule":
        geometry = new CapsuleGeometry(0.5, 0.5, 4, 8);
        break;
      case "cylinder":
        geometry = new CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case "cone":
        geometry = new ConeGeometry(0.5, 1, 32);
        break;
      case "sphere":
        geometry = new SphereGeometry(0.5, 32, 32);
        break;
      case "pentagon":
        geometry = new CylinderGeometry(0.5, 0.5, 1, 5);
        break;
      case "gltf":
        loader.load(
          "models/Boar.glb",
          function (gltf) {
            mesh = gltf.scene; // fallback

            gltf.scene.traverse(function (child) {
              if (child instanceof Mesh) {
                mesh.castShadow = true;
                child.updateMatrixWorld(true);
                mesh = child;
              }
            });

            addPlayerData(mesh, playerNumber, labelDiv, playerName);
          },
          undefined,
          function (error) {
            console.error(error);
          }
        );
        break;
      default:
        geometry = new BoxGeometry(1, 1, 1);
        break;
    }

    if (myHelpers.playerType !== "gltf") {
      const cubeMaterial = new MeshStandardMaterial({
        color: "#f69f1f",
      });
      geometry.translate(0, 0.5, 0);
      mesh = new Mesh(geometry, cubeMaterial);

      mesh.castShadow = true;

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
      addPlayerData(mesh, playerNumber, labelDiv, playerName);
    }
  },

  topCamera: function () {
    activeCamera = globalCamera;
    globalCamera.position.set(0, 11, 0);
    globalControls.target = new Vector3();
    globalControls.update();
  },
};

function addPlayerData(
  mesh: any,
  playerNumber: number,
  labelDiv: HTMLDivElement,
  playerName: CSS2DObject
) {
  const transformControl = new TransformControls(
    globalCamera,
    labelRenderer.domElement,
    mesh
  );
  //transformControl.setSize(0.5);
  transformControl.addEventListener("dragging-changed", function (event) {
    globalControls.enabled = !event.value;
  });
  transformControl.mode = "translate"; // rotate, scale, translate
  transformControl.enabled = transformControlsEnabled;
  transformControl.visible = transformControlsEnabled;
  if (performance) {
    transformControl.addEventListener("change", () => render());
  }

  mesh.userData.limit = {
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
  mesh.userData.update = function () {
    mesh.position.clamp(mesh.userData.limit.min, mesh.userData.limit.max);
    mesh.scale.clampScalar(0.001, 3);
  };

  scene.add(mesh);
  scene.add(transformControl);

  // GUI
  const playerSubFolder = guiPlayersFolder.addFolder(
    "Position " + playerNumber
  );
  playerSubFolder.add(labelDiv, "textContent").name("name");
  if (myHelpers.playerType !== "gltf") {
    playerSubFolder.addColor(mesh.material, "color");
  }

  const help = {
    remove: function () {
      playerSubFolder.destroy();
      mesh.remove(playerName);
      scene.remove(transformControl);
      scene.remove(mesh);

      let index = players.findIndex((player) => player.mesh.id === mesh.id);

      players.splice(index, 1);
      meshes.splice(index, 1);
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

  if (performance) {
    render();
  }
}

function onDblClick(event: any) {
  let x = (event.clientX / window.innerWidth) * 2 - 1;
  let y = -(event.clientY / window.innerHeight) * 2 + 1;
  let direction = new Vector3(x, y, -1);
  direction.unproject(globalCamera);

  let ray = new Raycaster(
    globalCamera.position,
    direction.sub(globalCamera.position).normalize()
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

    const intersectPosition = intersects[0].object.position.clone();
    const intersectRotation = intersects[0].object.rotation.clone();
    const lookingDirectionVector = new Vector3(0, 0, -1)
      .applyEuler(intersectRotation)
      .multiplyScalar(0.1);
    const cameraPosition = new Vector3(
      intersectPosition.x,
      1 * intersects[0].object.scale.y,
      intersectPosition.z
    );
    const cameraTarget = cameraPosition.clone().add(lookingDirectionVector);

    playerCamera.position.copy(cameraPosition);
    playerCamera.rotation.copy(intersectRotation);

    playerControls.target.copy(cameraTarget);

    globalControls.enabled = false;
    playerControls.enabled = true;
    activeCamera = playerCamera;
    playerControls.update();
  }
}

function handleInstructions() {
  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");
  instructions.style.display = "";
  blocker.style.display = "block";

  const handleMouseDown = function () {
    if (instructions.style.display !== "none") {
      instructions.style.display = "none";
      blocker.style.display = "none";
      globalControls.enabled = true;
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
    ambientLight = new AmbientLight("white", 1);
    scene.add(ambientLight);

    if (!performance) {
      pointLight = new PointLight("white", 80, 100);
      pointLight.position.set(0, 5, 0);
      pointLight.castShadow = true;
      pointLight.shadow.radius = 4;
      pointLight.shadow.camera.near = 0.5;
      pointLight.shadow.camera.far = 4000;
      pointLight.shadow.mapSize.width = 2048;
      pointLight.shadow.mapSize.height = 2048;
      scene.add(pointLight);
    }
  }

  // ===== 📦 OBJECTS =====
  {
    planeGeometry = new PlaneGeometry(1, 1);
    let planeMaterial;

    if (!performance) {
      const planeTexture = new TextureLoader().load(planeMaterials);
      const normalTexture = new TextureLoader().load(planeNormals);

      planeMaterial = new MeshStandardMaterial({
        map: planeTexture,
        normalMap: normalTexture,
        side: DoubleSide,
      });
      planeMaterial.normalScale.set(2, 2);
    } else {
      planeMaterial = new MeshPhongMaterial({
        color: "burlywood",
        side: DoubleSide,
      });
    }

    plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(Math.PI / 2);
    plane.receiveShadow = true;
    plane.scale.set(10, 10, 0);
    scene.add(plane);

    const texture = new TextureLoader().load(sphereMaterial);
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
    globalControls = new OrbitControls(globalCamera, labelRenderer.domElement);
    globalControls.target = new Vector3();
    globalControls.autoRotate = false;
    globalControls.maxPolarAngle = Math.PI / 2.05;
    globalControls.minDistance = 0;
    globalControls.maxDistance = 120;
    globalControls.enabled = false;
    globalControls.update();
    if (performance) {
      globalControls.addEventListener("change", () => render());
    } else {
      globalControls.enableDamping = true;
    }

    playerControls = new OrbitControls(playerCamera, labelRenderer.domElement);
    playerControls.enableZoom = false;
    playerControls.target = new Vector3();
    playerControls.enabled = false;
    playerControls.maxPolarAngle = Math.PI / 1.1; // don't overstretch head
    playerControls.minPolarAngle = 0.8; // don't look at feet
    playerControls.maxAzimuthAngle = Math.PI / 1.8; // max look over shoulder left
    playerControls.minAzimuthAngle = -Math.PI / 1.8; // max look over shoulder right
    playerControls.panSpeed = 0.3;
    playerControls.update();
    if (performance) {
      playerControls.addEventListener("change", () => render());
    } else {
      playerControls.enableDamping = true;
    }

    window.addEventListener("dblclick", onDblClick, false);

    window.addEventListener("keydown", onDocumentKeyDown, false);
    function onDocumentKeyDown(event: any) {
      var keyCode = event.which;
      if (keyCode == 27) {
        // ESC
        escFunction();
      }
    }
  }

  // ===== 🪄 HELPERS =====
  {
    if (debug) {
      axesHelper = new AxesHelper(4);
      axesHelper.visible = false;
      scene.add(axesHelper);

      if (!performance) {
        pointLightHelper = new PointLightHelper(
          pointLight,
          undefined,
          "orange",
        );
        pointLightHelper.visible = false;
        scene.add(pointLightHelper);
      }

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
    gui = new GUI({
      title: "Menu",
      width: Math.min(300, canvas.clientWidth / 2),
      closeFolders: true,
    });
    gui.add(myHelpers, "addPlayer").name("Add Position");

    guiPlayersFolder = gui.addFolder("Positions");
    guiPlayersFolder
      .add(myHelpers, "playerType", [
        "box",
        "capsule",
        "cylinder",
        "cone",
        "sphere",
        "pentagon",
        "gltf",
      ])
      .name("Def. Pos. Shape");

    guiPlayersFolder.add(myHelpers, "togglePlayerNames").name("Toggle Names");
    guiPlayersFolder
      .add(myHelpers, "toggleTransform")
      .name("Toggle Transformation");

    const cameraFolder = gui.addFolder("Camera");

    if (!performance) {
      cameraFolder.add(globalControls, "autoRotate").name("Rotate");
    }
    cameraFolder.add(myHelpers, "topCamera").name("Top Down");

    const environmentFolder = gui.addFolder("Environment");
    environmentFolder.add(plane.scale, "x").name("Board Width");
    environmentFolder.add(plane.scale, "y").name("Board Height");
    if (!performance) {
      environmentFolder.add(sphere, "visible").name("Room");
    }

    environmentFolder.onFinishChange((event) => {
      if (event.object === plane.scale) {
        players.forEach((player) => {
          player.mesh.userData.limit = {
            min: new Vector3(-(plane.scale.x / 2), 0, -(plane.scale.y / 2)),
            max: new Vector3(plane.scale.x / 2, 0, plane.scale.y / 2),
          };
          player.mesh.userData.update();
        });
        if (performance) {
          render();
        }
      }
    });

    if (debug) {
      const lightsFolder = gui.addFolder("Lights");
      lightsFolder.add(ambientLight, "visible").name("ambient light");
      if (!performance) {
        lightsFolder.add(pointLight, "visible").name("point light");
      }

      const helpersFolder = gui.addFolder("Helpers");
      helpersFolder.add(gridHelper, "visible").name("grid");
      helpersFolder.add(axesHelper, "visible").name("axes");
      if (!performance) {
        helpersFolder.add(pointLightHelper, "visible").name("pointLight");
      }
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
    gui.add({ resetGui }, "resetGui").name("RESET GUI");
    gui.close();
  }

  // right click menu
  {
    var mouse = new Vector2();
    var raycaster = new Raycaster();
    var intersect;
    var rect = renderer.domElement.getBoundingClientRect();

    var menu = document.getElementById("menu");

    function onDocumentMouseMove(event) {
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    window.addEventListener("mousemove", onDocumentMouseMove, false);

    function onMouseDown(event) {
      var rightclick;
      if (!event) var event: any = window.event;
      if (event.which) rightclick = event.which == 3;
      else if (event.button) rightclick = event.button == 2;
      if (!rightclick) return;

      raycaster.setFromCamera(mouse, activeCamera);

      var intersects = raycaster.intersectObjects(meshes);

      if (intersects.length) {
        intersect = intersects[0].object;
        menu.style.left = event.clientX - rect.left + "px";
        menu.style.top = event.clientY - rect.top + "px";
        menu.style.display = "";
        event.preventDefault();
      } else {
        intersect = undefined;
      }
    }
    window.addEventListener("mousedown", onMouseDown, false);

    function addClickListenerById(id, listener) {
      var element = document.getElementById(id);
      if (element) {
        element.addEventListener("click", (e) => {
          listener(e);
          menu.style.display = "none";
        });
      }
    }

    addClickListenerById("menuChangeColor", () => {
      intersect.material.color.setHex(Math.random() * 0x777777 + 0x777777);
    });

    addClickListenerById("menuDelete", () => {
      let index = players.findIndex(
        (player) => player.mesh.id === intersect.id
      );

      let currentPlayer = players[index];

      currentPlayer.gui.destroy();
      currentPlayer.mesh.remove(currentPlayer.label);
      scene.remove(currentPlayer.transform);
      scene.remove(currentPlayer.mesh);

      players.splice(index, 1);
      meshes.splice(index, 1);
    });

    var menu = document.getElementById("quit");
    if (menu) {
      menu.addEventListener("click", () => escFunction());
    }
  }
}

function escFunction() {
  if (activeCamera === globalCamera) {
    globalControls.enabled = false;
    playerControls.enabled = false;
    handleInstructions();
  } else {
    activeCamera = globalCamera;
    playerControls.enabled = false;
    globalControls.enabled = true;

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

function animate() {
  requestAnimationFrame(animate);

  delta += clock.getDelta();

  if (delta > interval) {
    // The draw or time dependent code are here

    players.forEach((player) => {
      player.mesh.userData.update();
    });

    // dapting the camera to the scene
    globalControls.update();
    playerControls.update();

    delta = delta % interval;

    render();
  }
}

function render() {
  if (debug) {
    stats.update();
  }
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    activeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
    activeCamera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }
  labelRenderer.render(scene, activeCamera);
  renderer.render(scene, activeCamera);
}

init();
if (!performance) {
  animate();
} else {
  render();
}
