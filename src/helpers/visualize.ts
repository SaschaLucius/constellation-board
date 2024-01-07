import {
  ArrowHelper,
  BoxHelper,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
} from "three";

export function box(scene: Scene, geometry: BufferGeometry) {
  const object = new Mesh(geometry, new MeshBasicMaterial({ color: 0xff0000 }));
  const box = new BoxHelper(object, 0xffff00);
  scene.add(box);
}

export function arrow(
  scene: Scene,
  origin: Vector3,
  direction: Vector3,
  length: number = 3
) {
  direction.normalize();

  const hex = 0xffff00;

  const arrowHelper = new ArrowHelper(direction, origin, length, hex);
  scene.add(arrowHelper);
}

export function point(scene: Scene, position: Vector3) {
  const geometry = new BufferGeometry().setFromPoints([position]);
  const material = new PointsMaterial({ color: 0xff0000, size: 0.1 });
  const point = new Points(geometry, material);
  scene.add(point);
}
