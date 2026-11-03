// Rendert kleine Vorschaubilder der Flugzeuge und Fahrzeuge
import * as THREE from 'three';
import { aircraft, vehicle } from './models.js';
const cache = new Map();
let r = null, scene, cam;
function setup() {
  r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(240, 150); r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe8f0, 0x3a3a30, 1.4));
  const d = new THREE.DirectionalLight(0xfff0dc, 2.4); d.position.set(3, 5, 2); scene.add(d);
  cam = new THREE.PerspectiveCamera(28, 240 / 150, 0.1, 100);
}
export function thumb(kind, shape, paint) {
  const key = kind + shape + paint;
  if (cache.has(key)) return cache.get(key);
  if (!r) setup();
  const obj = kind === 'veh' ? vehicle(shape) : aircraft(shape, paint);
  const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
  obj.position.sub(c); scene.add(obj);
  const R = Math.max(size.x, size.z, size.y * 1.5);
  cam.position.set(R * 1.05, R * 0.95, R * 1.25); cam.lookAt(0, -R * 0.04, 0);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  scene.remove(obj);
  cache.set(key, url);
  return url;
}
