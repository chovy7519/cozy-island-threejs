import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld, PALETTE } from './world.js';
import { createCharacters } from './characters.js';

const SEED = 20261116;
const DURATION = 12;
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const loading = document.getElementById('loading');
const loadingDetail = document.getElementById('loading-detail');
const pauseButton = document.getElementById('pause-button');
const rotateButton = document.getElementById('rotate-button');
const recipe = document.getElementById('recipe');
const recipeButton = document.getElementById('recipe-button');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
} catch (error) {
  loading.classList.add('is-error');
  loadingDetail.textContent = '当前浏览器无法启动 WebGL。请开启硬件加速后重试。';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.id = 'scene-canvas';
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', '可交互的治愈小岛三维场景。拖动旋转，滚轮缩放，按 R 重置视角。');
document.getElementById('scene-host').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const daySky = new THREE.Color(0xe8eccb);
scene.background = daySky.clone();
scene.fog = new THREE.Fog(daySky.clone(), 34, 82);

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 240);
const HOME_POSITION = new THREE.Vector3(18, 24, 26);
const HOME_TARGET = new THREE.Vector3(0, 1.15, 0);
camera.position.copy(HOME_POSITION);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minZoom = 0.7;
controls.maxZoom = 2.5;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.32;
controls.autoRotateSpeed = 0.42;
controls.update();

const hemisphere = new THREE.HemisphereLight(0xf4f6df, 0x718259, 1.7);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xfff4e2, 2.45);
sun.position.set(-12, 20, 11);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -17;
sun.shadow.camera.right = 17;
sun.shadow.camera.top = 17;
sun.shadow.camera.bottom = -17;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.00015;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdce9ef, 0.52);
fill.position.set(12, 9, -10);
scene.add(fill);

const world = createWorld(scene, rand);
const characters = createCharacters(scene);

function updateFrustum() {
  const aspect = innerWidth / innerHeight;
  const viewHeight = innerWidth < 700 ? 25.5 : aspect > 1.8 ? 19.2 : 21.5;
  camera.left = (-viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}
updateFrustum();

function sample(t) {
  world.sample(t, DURATION);
  characters.sample(t, DURATION);
}

let paused = reducedMotion;
let simT = 0;
let accumulator = 0;
const STEP = 1 / 60;
const clock = new THREE.Clock();
let frameCount = 0;
let fpsTime = 0;
let fps = 60;

function updatePauseUI() {
  pauseButton.textContent = paused ? '继续动画' : '暂停动画';
  pauseButton.setAttribute('aria-pressed', String(paused));
}
updatePauseUI();

function draw() {
  controls.update();
  renderer.render(scene, camera);
  window.__METRICS__ = {
    fps: Math.round(fps),
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    pixelRatio: renderer.getPixelRatio(),
  };
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!paused) {
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      simT = (simT + STEP) % DURATION;
    }
    sample(simT);
  }
  frameCount += 1;
  fpsTime += dt;
  if (fpsTime >= 0.75) {
    fps = frameCount / fpsTime;
    frameCount = 0;
    fpsTime = 0;
  }
  draw();
});

function resetView() {
  camera.position.copy(HOME_POSITION);
  camera.zoom = 1;
  controls.target.copy(HOME_TARGET);
  camera.updateProjectionMatrix();
  controls.autoRotate = false;
  rotateButton.setAttribute('aria-pressed', 'false');
  rotateButton.textContent = '自动环绕';
  controls.update();
  draw();
}

function setRecipe(open, moveFocus = true) {
  recipe.classList.toggle('is-open', open);
  recipe.setAttribute('aria-hidden', String(!open));
  recipeButton.setAttribute('aria-expanded', String(open));
  if (open && moveFocus) recipe.querySelector('button').focus({ preventScroll: true });
}
setRecipe(innerWidth >= 1280, false);

recipeButton.addEventListener('click', () => setRecipe(!recipe.classList.contains('is-open')));
document.getElementById('recipe-close').addEventListener('click', () => {
  setRecipe(false);
  recipeButton.focus();
});
document.getElementById('reset-button').addEventListener('click', resetView);
pauseButton.addEventListener('click', () => {
  paused = !paused;
  accumulator = 0;
  clock.getDelta();
  updatePauseUI();
});
rotateButton.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.setAttribute('aria-pressed', String(controls.autoRotate));
  rotateButton.textContent = controls.autoRotate ? '停止环绕' : '自动环绕';
});

function applyMood(mood) {
  const sunset = mood === 'sunset';
  const sky = new THREE.Color(sunset ? 0xead6b8 : 0xe8eccb);
  scene.background.copy(sky);
  scene.fog.color.copy(sky);
  sun.color.set(sunset ? 0xffbd7c : 0xfff4e2);
  sun.intensity = sunset ? 2.25 : 2.45;
  sun.position.set(sunset ? -18 : -12, sunset ? 12 : 20, 11);
  hemisphere.color.set(sunset ? 0xffe2c1 : 0xf4f6df);
  hemisphere.groundColor.set(sunset ? 0x7d6c59 : 0x718259);
  hemisphere.intensity = sunset ? 1.5 : 1.7;
  fill.color.set(sunset ? 0xd5c8e5 : 0xdce9ef);
  renderer.toneMappingExposure = sunset ? 0.98 : 1.0;
  document.body.dataset.mood = mood;
  document.querySelectorAll('[data-mood-button]').forEach((button) => {
    const active = button.dataset.moodButton === mood;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  draw();
}
document.querySelectorAll('[data-mood-button]').forEach((button) => {
  button.addEventListener('click', () => applyMood(button.dataset.moodButton));
});

document.getElementById('save-button').addEventListener('click', () => {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cozy-island-${document.body.dataset.mood || 'day'}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});

addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && recipe.classList.contains('is-open')) {
    setRecipe(false);
    recipeButton.focus();
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key.toLowerCase() === 'r') resetView();
  if (event.code === 'Space' && event.target === renderer.domElement) {
    event.preventDefault();
    paused = !paused;
    updatePauseUI();
  }
});

addEventListener('resize', () => {
  updateFrustum();
  renderer.setSize(innerWidth, innerHeight);
  if (paused) draw();
});

window.__seek = (time) => {
  const value = Number(time);
  paused = true;
  accumulator = 0;
  simT = Number.isFinite(value) && value > 0 ? value : 0;
  controls.autoRotate = false;
  rotateButton.setAttribute('aria-pressed', 'false');
  rotateButton.textContent = '自动环绕';
  sample(simT);
  updatePauseUI();
  draw();
};
window.__play = () => {
  paused = false;
  accumulator = 0;
  clock.getDelta();
  updatePauseUI();
};
window.__resetView = resetView;

sample(0);
draw();
window.__SCENE_READY__ = true;
window.__MODELS_READY__ = false;
const timeParam = new URLSearchParams(location.search).get('t');
if (timeParam !== null) window.__seek(timeParam);

Promise.race([
  characters.ready,
  new Promise((resolve) => setTimeout(resolve, 6000)),
]).then(() => {
  sample(simT);
  draw();
  loading.classList.add('is-hidden');
  loadingDetail.textContent = '场景已就绪';
  window.__MODELS_READY__ = true;
});
