import * as THREE from 'three';

export const PALETTE = {
  grass: 0xb8ca78,
  grassLight: 0xb9cc7d,
  grassDark: 0x668c58,
  leaf: 0x4b8048,
  leafLight: 0x5f8e51,
  leafDark: 0x2f6746,
  bark: 0x79554c,
  barkDark: 0x60453f,
  woodCut: 0xd4a383,
  rock: 0x9298a7,
  rockLight: 0xaeb2bc,
  path: 0xc79862,
  water: 0x92cec4,
  cream: 0xfff8dd,
  orange: 0xe8833c,
};

const materials = new Map();
export function matte(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: 0.96,
      metalness: 0,
      flatShading: true,
      ...options,
    }));
  }
  return materials.get(key);
}

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = cast;
  item.receiveShadow = receive;
  return item;
}

let shadowTexture;
function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(44, 62, 39, 0.55)');
  gradient.addColorStop(0.55, 'rgba(44, 62, 39, 0.24)');
  gradient.addColorStop(1, 'rgba(44, 62, 39, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

export function contactShadow(x, z, sx, sz = sx, opacity = 0.55) {
  const material = new THREE.MeshBasicMaterial({
    map: getShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sx * 2, sz * 2), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, 0.035, z);
  shadow.renderOrder = 1;
  return shadow;
}

function ribbonGeometry(pointAt, widthAt, segments = 64) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = pointAt(t);
    const before = pointAt(Math.max(0, t - 0.002));
    const after = pointAt(Math.min(1, t + 0.002));
    const tangent = after.sub(before).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const half = widthAt(t) * 0.5;
    const left = p.clone().addScaledVector(side, half);
    const right = p.clone().addScaledVector(side, -half);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTree(rand, scale = 1, variant = 0) {
  const group = new THREE.Group();
  const trunkHeight = (3.2 + rand() * 1.1) * scale;
  const trunk = mesh(
    new THREE.CylinderGeometry(0.34 * scale, 0.52 * scale, trunkHeight, 6),
    matte(variant % 2 ? PALETTE.barkDark : PALETTE.bark),
  );
  trunk.position.y = trunkHeight / 2;
  trunk.rotation.z = (rand() - 0.5) * 0.12;
  group.add(trunk);

  const crown = new THREE.Group();
  crown.position.y = trunkHeight * 0.88;
  const tones = [PALETTE.leaf, PALETTE.leafLight, PALETTE.leafDark];
  const lobes = 3 + (variant % 2);
  for (let i = 0; i < lobes; i += 1) {
    const angle = (i / lobes) * Math.PI * 2 + variant * 0.7;
    const radius = (i === 0 ? 0 : 0.72) * scale;
    const blob = mesh(
      new THREE.IcosahedronGeometry((1.6 + rand() * 0.35) * scale, 1),
      matte(tones[(variant + i) % tones.length]),
    );
    blob.position.set(Math.cos(angle) * radius, (i === 0 ? 0.8 : 0.25) * scale, Math.sin(angle) * radius);
    blob.scale.set(1.15, 0.9 + rand() * 0.18, 1.05);
    blob.rotation.set(rand(), rand(), rand());
    crown.add(blob);
  }
  group.add(crown);
  group.userData.crown = crown;
  group.userData.swayOffset = rand() * Math.PI * 2;
  return group;
}

function createBush(rand, scale = 1, dark = false) {
  const group = new THREE.Group();
  const count = 3;
  for (let i = 0; i < count; i += 1) {
    const blob = mesh(
      new THREE.IcosahedronGeometry((0.65 + rand() * 0.25) * scale, 1),
      matte(dark ? PALETTE.leafDark : PALETTE.grassDark),
      { cast: false },
    );
    blob.position.set((i - 1) * 0.65 * scale, (0.48 + rand() * 0.2) * scale, (rand() - 0.5) * 0.35);
    blob.scale.y = 0.78;
    group.add(blob);
  }
  return group;
}

function createRock(rand, scale = 1, light = false) {
  const rock = mesh(
    new THREE.DodecahedronGeometry(scale, 0),
    matte(light ? PALETTE.rockLight : PALETTE.rock),
  );
  rock.scale.set(1.15, 0.82 + rand() * 0.2, 0.95);
  rock.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.2);
  rock.position.y = scale * 0.72;
  return rock;
}

function createLog(length = 2.2, radius = 0.34) {
  const group = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(radius, radius * 1.07, length, 8), matte(PALETTE.bark));
  trunk.rotation.z = Math.PI / 2;
  trunk.position.y = radius;
  group.add(trunk);
  for (const side of [-1, 1]) {
    const cut = mesh(new THREE.CircleGeometry(radius * 0.91, 16), matte(PALETTE.woodCut), { cast: false });
    cut.position.set(side * (length / 2 + 0.006), radius, 0);
    cut.rotation.y = side * Math.PI / 2;
    group.add(cut);
    const ring = mesh(new THREE.TorusGeometry(radius * 0.47, 0.025, 4, 16), matte(PALETTE.bark), { cast: false });
    ring.position.copy(cut.position).add(new THREE.Vector3(side * 0.008, 0, 0));
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }
  return group;
}

function createStump() {
  const group = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.54, 0.66, 0.82, 9), matte(PALETTE.bark));
  trunk.position.y = 0.41;
  group.add(trunk);
  const top = mesh(new THREE.CircleGeometry(0.52, 20), matte(PALETTE.woodCut), { cast: false });
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.826;
  group.add(top);
  for (const radius of [0.17, 0.33]) {
    const ring = mesh(new THREE.TorusGeometry(radius, 0.018, 4, 20), matte(PALETTE.bark), { cast: false });
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.838;
    group.add(ring);
  }
  return group;
}

function createBridge() {
  const group = new THREE.Group();
  const plankGeometry = new THREE.BoxGeometry(2.55, 0.18, 0.43);
  for (let i = 0; i < 9; i += 1) {
    const plank = mesh(plankGeometry, matte(i % 3 === 0 ? 0x8b684c : 0x987352));
    plank.position.set(0, 0.48 + Math.sin((i / 8) * Math.PI) * 0.16, (i - 4) * 0.42);
    plank.rotation.y = (i % 2 ? 1 : -1) * 0.012;
    group.add(plank);
  }
  for (const x of [-1.02, 1.02]) {
    const support = mesh(new THREE.CylinderGeometry(0.14, 0.17, 4.2, 7), matte(PALETTE.barkDark));
    support.rotation.x = Math.PI / 2;
    support.position.set(x, 0.29, 0);
    group.add(support);
  }
  return group;
}

function createFish(color = 0xe77d68) {
  const group = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.24, 8, 6), matte(color), { cast: false });
  body.scale.set(1.35, 0.75, 0.55);
  group.add(body);
  const tail = mesh(new THREE.ConeGeometry(0.19, 0.32, 3), matte(color), { cast: false });
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.38;
  group.add(tail);
  const eye = mesh(new THREE.SphereGeometry(0.028, 6, 4), matte(0x34392f), { cast: false });
  eye.position.set(0.21, 0.07, 0.12);
  group.add(eye);
  return group;
}

function addInstancedFlowers(root, rand) {
  const count = 34;
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.025, 0.35, 5), matte(0x4e793f), count);
  const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.105, 6, 4), matte(0xfff7df), count * 5);
  const centers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 4), matte(0xe9b84e), count);
  const dummy = new THREE.Object3D();
  const flowerPositions = [];
  let attempts = 0;
  while (flowerPositions.length < count && attempts < 800) {
    attempts += 1;
    const angle = rand() * Math.PI * 2;
    const radius = 3.3 + rand() * 7.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(z + 4.7) < 1.8 || (z > 4.2 && Math.abs(x) < 6.5)) continue;
    flowerPositions.push([x, z, 0.75 + rand() * 0.6]);
  }
  flowerPositions.forEach(([x, z, scale], i) => {
    dummy.position.set(x, 0.18 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stem.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 0.39 * scale, z);
    dummy.updateMatrix();
    centers.setMatrixAt(i, dummy.matrix);
    for (let p = 0; p < 5; p += 1) {
      const a = (p / 5) * Math.PI * 2;
      dummy.position.set(x + Math.cos(a) * 0.13 * scale, 0.39 * scale, z + Math.sin(a) * 0.13 * scale);
      dummy.scale.set(1.15 * scale, 0.42 * scale, 0.85 * scale);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      petals.setMatrixAt(i * 5 + p, dummy.matrix);
    }
  });
  for (const item of [stem, petals, centers]) {
    item.castShadow = false;
    item.receiveShadow = true;
    root.add(item);
  }
}

function addGrassAndPebbles(root, rand) {
  const count = 95;
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.5, 3), matte(0x668b55), count);
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.15, 0), matte(0x859275), 42);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 3 + rand() * 9;
    dummy.position.set(Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius);
    dummy.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI, (rand() - 0.5) * 0.5);
    const s = 0.55 + rand() * 0.8;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < 42; i += 1) {
    const cluster = i < 21 ? new THREE.Vector2(5.4, 4.2) : new THREE.Vector2(-5.7, 5.5);
    dummy.position.set(cluster.x + (rand() - 0.5) * 2.4, 0.08, cluster.y + (rand() - 0.5) * 2.0);
    dummy.rotation.set(rand(), rand(), rand());
    const s = 0.5 + rand() * 1.15;
    dummy.scale.set(s, 0.55 * s, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  tufts.castShadow = false;
  pebbles.castShadow = false;
  root.add(tufts, pebbles);
}

function addCarrots(root) {
  for (let i = 0; i < 4; i += 1) {
    const carrot = new THREE.Group();
    const rootMesh = mesh(new THREE.ConeGeometry(0.13, 0.4, 7), matte(PALETTE.orange), { cast: false });
    rootMesh.rotation.x = Math.PI;
    rootMesh.position.y = 0.17;
    carrot.add(rootMesh);
    for (let l = 0; l < 3; l += 1) {
      const leaf = mesh(new THREE.ConeGeometry(0.07, 0.35, 4), matte(PALETTE.leafDark), { cast: false });
      leaf.position.set((l - 1) * 0.07, 0.48, 0);
      leaf.rotation.z = (l - 1) * -0.35;
      carrot.add(leaf);
    }
    carrot.position.set(-6.8 + (i % 2) * 0.65, 0, 1.8 + Math.floor(i / 2) * 0.65);
    root.add(carrot);
  }
}

export function createWorld(scene, rand) {
  const root = new THREE.Group();
  root.name = 'procedural-cozy-clearing';
  scene.add(root);

  const ground = mesh(new THREE.PlaneGeometry(240, 240), matte(PALETTE.grass), { cast: false });
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.035;
  root.add(ground);

  const clearing = mesh(new THREE.CircleGeometry(13.8, 72), matte(PALETTE.grassLight), { cast: false });
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.y = -0.018;
  clearing.scale.set(1.12, 1, 0.93);
  root.add(clearing);

  const pathGeometry = ribbonGeometry(
    (t) => new THREE.Vector3(-15 + t * 30, 0.012, 7.2 + Math.sin(t * Math.PI * 1.35) * 1.55),
    (t) => 2.0 + Math.sin(t * Math.PI) * 0.9,
    72,
  );
  const path = mesh(pathGeometry, matte(PALETTE.path), { cast: false });
  root.add(path);

  const waterGeometry = ribbonGeometry(
    (t) => new THREE.Vector3(-18 + t * 36, 0.018, -4.7 + Math.sin(t * Math.PI * 2) * 0.55),
    (t) => 2.45 + Math.sin(t * Math.PI * 3) * 0.25,
    80,
  );
  const waterMaterial = matte(PALETTE.water, { flatShading: false, roughness: 0.72 });
  const water = mesh(waterGeometry, waterMaterial, { cast: false });
  root.add(water);

  const bridge = createBridge();
  bridge.position.set(-4.2, 0, -4.7);
  bridge.rotation.y = -0.04;
  root.add(bridge, contactShadow(-4.2, -4.7, 2.0, 2.5, 0.35));

  const trees = [];
  const treeAngles = [-2.9, -2.35, -1.78, -1.18, -0.55, 0.1, 2.75];
  treeAngles.forEach((angle, i) => {
    const radius = 10.4 + (i % 3) * 0.8;
    const scale = 0.9 + (i % 4) * 0.11;
    const tree = createTree(rand, scale, i);
    tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    tree.rotation.y = rand() * Math.PI;
    root.add(tree, contactShadow(tree.position.x + 0.4, tree.position.z + 0.25, 2.2 * scale, 1.35 * scale, 0.45));
    trees.push(tree);
  });

  const heroTree = createTree(rand, 1.48, 7);
  heroTree.position.set(-9.6, 0, 5.3);
  root.add(heroTree, contactShadow(-9.1, 5.8, 3.8, 2.3, 0.52));
  trees.push(heroTree);

  for (let i = 0; i < 13; i += 1) {
    const angle = (i / 13) * Math.PI * 2 + 0.25;
    if (Math.abs(angle - Math.PI / 2) < 0.4) continue;
    const radius = 8.7 + (i % 3) * 1.05;
    const bush = createBush(rand, 0.7 + rand() * 0.55, i % 4 === 0);
    bush.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    root.add(bush);
  }

  const rockClusters = [
    { center: new THREE.Vector2(5.6, -0.3), count: 4, size: 1.05 },
    { center: new THREE.Vector2(-7.6, -3.0), count: 3, size: 0.8 },
    { center: new THREE.Vector2(7.5, -7.1), count: 3, size: 1.2 },
  ];
  rockClusters.forEach(({ center, count, size }, clusterIndex) => {
    for (let i = 0; i < count; i += 1) {
      const s = size * (0.65 + rand() * 0.65);
      const rock = createRock(rand, s, (i + clusterIndex) % 2 === 0);
      rock.position.x = center.x + (rand() - 0.5) * 2.1;
      rock.position.z = center.y + (rand() - 0.5) * 1.5;
      root.add(rock, contactShadow(rock.position.x + 0.15, rock.position.z + 0.12, s * 1.25, s * 0.85, 0.42));
    }
  });

  const logA = createLog(2.4, 0.36);
  logA.position.set(-2.8, 0, 2.5);
  logA.rotation.y = -0.38;
  const logB = createLog(1.95, 0.32);
  logB.position.set(-3.15, 0.37, 3.15);
  logB.rotation.y = -0.18;
  root.add(logA, logB, contactShadow(-2.9, 2.8, 1.75, 1.05, 0.4));

  const stump = createStump();
  stump.position.set(-2.6, 0, 0.25);
  root.add(stump, contactShadow(-2.45, 0.4, 0.8, 0.65, 0.45));

  const fishA = createFish(0xe97c68);
  fishA.position.set(2.2, 0.2, -4.55);
  fishA.rotation.y = -0.25;
  const fishB = createFish(0x72a8c0);
  fishB.position.set(-8.1, 0.13, -4.85);
  fishB.rotation.y = Math.PI;
  fishB.scale.setScalar(0.8);
  root.add(fishA, fishB);

  addInstancedFlowers(root, rand);
  addGrassAndPebbles(root, rand);
  addCarrots(root);

  const butterfly = new THREE.Group();
  const wingGeometry = new THREE.SphereGeometry(0.12, 6, 4);
  const wingMaterial = matte(0xffefd0, { flatShading: false });
  for (const side of [-1, 1]) {
    const wing = mesh(wingGeometry, wingMaterial, { cast: false });
    wing.scale.set(1.25, 0.18, 0.8);
    wing.position.x = side * 0.13;
    butterfly.add(wing);
  }
  root.add(butterfly);

  return {
    root,
    trees,
    water,
    fish: [fishA, fishB],
    butterfly,
    sample(t, duration) {
      const phase = (t / duration) * Math.PI * 2;
      trees.forEach((tree, i) => {
        const crown = tree.userData.crown;
        crown.rotation.z = Math.sin(phase + tree.userData.swayOffset) * 0.018;
        crown.rotation.x = Math.cos(phase + i * 0.37) * 0.012;
      });
      water.position.y = Math.sin(phase * 2) * 0.012;
      fishA.position.y = 0.16 + Math.max(0, Math.sin(phase * 2 - 0.5)) * 0.7;
      fishA.rotation.z = Math.sin(phase * 2 - 0.5) * 0.45;
      fishB.position.x = -8.1 + Math.sin(phase) * 0.45;
      butterfly.position.set(Math.cos(phase) * 2.8, 1.5 + Math.sin(phase * 2) * 0.25, 1.2 + Math.sin(phase) * 1.8);
      butterfly.rotation.y = -phase;
      butterfly.children[0].rotation.z = Math.sin(phase * 12) * 0.7;
      butterfly.children[1].rotation.z = -Math.sin(phase * 12) * 0.7;
    },
  };
}
