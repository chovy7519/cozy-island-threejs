import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { contactShadow, matte } from './world.js';

function part(geometry, material, position, scale) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  if (scale) item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function capsuleBetween(radius, length, color, position, rotation = [0, 0, 0]) {
  const item = part(new THREE.CapsuleGeometry(radius, length, 4, 8), matte(color), position);
  item.rotation.set(...rotation);
  return item;
}

export function createGirlPuppet() {
  const group = new THREE.Group();
  group.name = 'girl-procedural-fallback';
  const skin = 0xf2c4a7;
  const hair = 0x2c1a16;
  const dress = 0x536c35;
  const boots = 0xb69378;

  group.add(capsuleBetween(0.115, 0.52, skin, [-0.21, 0.57, 0], [0, 0, 0.04]));
  group.add(capsuleBetween(0.115, 0.52, skin, [0.21, 0.57, 0], [0, 0, -0.04]));
  group.add(part(new THREE.SphereGeometry(0.18, 8, 6), matte(boots), [-0.22, 0.19, 0.09], [1, 0.7, 1.45]));
  group.add(part(new THREE.SphereGeometry(0.18, 8, 6), matte(boots), [0.22, 0.19, 0.09], [1, 0.7, 1.45]));

  const body = part(new THREE.CylinderGeometry(0.34, 0.53, 1.0, 8), matte(dress), [0, 1.25, 0]);
  group.add(body);
  group.add(capsuleBetween(0.105, 0.5, dress, [-0.44, 1.36, 0], [0, 0, -0.38]));
  group.add(capsuleBetween(0.105, 0.5, dress, [0.44, 1.36, 0], [0, 0, 0.38]));
  group.add(part(new THREE.SphereGeometry(0.13, 8, 6), matte(skin), [-0.57, 1.08, 0]));
  group.add(part(new THREE.SphereGeometry(0.13, 8, 6), matte(skin), [0.57, 1.08, 0]));

  group.add(part(new THREE.SphereGeometry(0.64, 12, 9), matte(hair), [0, 2.12, -0.12], [1.02, 1.08, 0.95]));
  group.add(part(new THREE.SphereGeometry(0.5, 12, 9), matte(skin), [0, 2.08, 0.23], [0.94, 0.95, 0.75]));
  const fringe = part(new THREE.SphereGeometry(0.53, 10, 7), matte(hair), [0, 2.4, 0.16], [1, 0.46, 0.82]);
  group.add(fringe);
  for (const x of [-0.16, 0.16]) {
    group.add(part(new THREE.SphereGeometry(0.028, 6, 4), matte(0x332820), [x, 2.11, 0.61], [0.8, 1.35, 0.55]));
  }
  group.add(part(new THREE.SphereGeometry(0.022, 6, 4), matte(0xc98479), [0, 1.94, 0.61], [1.4, 0.45, 0.5]));
  return group;
}

export function createCatPuppet() {
  const group = new THREE.Group();
  group.name = 'cat-procedural-fallback';
  const fur = 0x282733;
  const eyes = 0xb6a7cb;
  group.add(part(new THREE.SphereGeometry(0.43, 10, 7), matte(fur), [0, 0.52, 0], [0.92, 1.25, 0.86]));
  group.add(part(new THREE.SphereGeometry(0.42, 10, 7), matte(fur), [0, 1.03, 0.08], [1.05, 0.9, 0.9]));
  for (const side of [-1, 1]) {
    const ear = part(new THREE.ConeGeometry(0.17, 0.35, 4), matte(fur), [side * 0.25, 1.39, 0.04]);
    ear.rotation.z = side * -0.12;
    group.add(ear);
    group.add(part(new THREE.SphereGeometry(0.09, 8, 6), matte(eyes), [side * 0.16, 1.08, 0.4], [1, 1.25, 0.35]));
    group.add(part(new THREE.SphereGeometry(0.035, 6, 4), matte(0x29242c), [side * 0.16, 1.08, 0.44], [0.7, 1.4, 0.4]));
    group.add(part(new THREE.SphereGeometry(0.13, 7, 5), matte(fur), [side * 0.23, 0.16, 0.18], [1.15, 0.55, 1.4]));
  }
  group.add(part(new THREE.SphereGeometry(0.035, 6, 4), matte(0xd28f96), [0, 0.94, 0.45], [1.15, 0.75, 0.5]));
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.42, -0.25),
    new THREE.Vector3(0.45, 0.55, -0.4),
    new THREE.Vector3(0.58, 0.98, -0.34),
    new THREE.Vector3(0.43, 1.18, -0.28),
  ]);
  group.add(part(new THREE.TubeGeometry(tailCurve, 16, 0.075, 6, false), matte(fur), [0, 0, 0]));
  return group;
}

function normalizeModel(source, targetHeight) {
  const model = source.scene || source;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const list = Array.isArray(child.material) ? child.material : [child.material];
    list.forEach((material) => {
      if (!material) return;
      material.roughness = 1;
      material.metalness = 0;
      material.envMapIntensity = 0;
      material.needsUpdate = true;
    });
  });
  const wrapper = new THREE.Group();
  wrapper.add(model);
  return wrapper;
}

export function createCharacters(scene) {
  const girl = new THREE.Group();
  const cat = new THREE.Group();
  girl.name = 'cozy-girl';
  cat.name = 'cozy-cat';
  girl.position.set(0.15, 0, 1.1);
  girl.rotation.y = -0.95;
  cat.position.set(2.15, 0, 0.85);
  cat.rotation.y = -0.82;
  girl.add(createGirlPuppet());
  cat.add(createCatPuppet());
  scene.add(girl, cat);
  scene.add(contactShadow(0.35, 1.25, 0.85, 0.56, 0.62));
  scene.add(contactShadow(2.3, 1.0, 0.68, 0.45, 0.55));

  const loader = new GLTFLoader();
  const load = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
  const girlJob = load('./models/cozy-girl.glb').then((gltf) => {
    girl.clear();
    girl.add(normalizeModel(gltf, 2.85));
  });
  const catJob = load('./models/cozy-cat.glb').then((gltf) => {
    cat.clear();
    cat.add(normalizeModel(gltf, 1.35));
  });
  const ready = Promise.allSettled([girlJob, catJob]);

  return {
    girl,
    cat,
    ready,
    sample(t, duration) {
      const phase = (t / duration) * Math.PI * 2;
      girl.position.y = (1 - Math.cos(phase)) * 0.018;
      girl.rotation.z = Math.sin(phase) * 0.008;
      cat.scale.y = 1 + (1 - Math.cos(phase * 2)) * 0.008;
      cat.rotation.z = Math.sin(phase) * 0.012;
    },
  };
}
