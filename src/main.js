import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';

const MODEL_URL = 'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb';
const DROP_HEIGHT = 7;

// Default mfer trait meshes to show
const DEFAULT_MESHES = new Set([
  'type_plain', 'body', 'heres_my_signature',
  'eyes_normal',
  'mouth_flat',
  'headphones_black',
  'smoke_cig_white', 'smoke',
]);

let scene, camera, renderer;
let world;
let gltfScene, mixer;
let mferBody; // single rigid body for the mfer
let obstacleParts = []; // { body, mesh }
let dropped = false;
let modelScale = 1;
let modelCenter = new THREE.Vector3();
let modelBottomY = 0; // bounding box min Y in original (unscaled) space
let lastTime = performance.now();
let originalPos = new THREE.Vector3();
let impactScore = 0;
let maxVelocity = 0;
let bounceCount = 0;
let settled = false;
let settledTimer = 0;

async function init() {
  await RAPIER.init();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.025);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 6, 14);
  camera.lookAt(0, 4, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(5, 12, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 40;
  dir.shadow.camera.left = -15;
  dir.shadow.camera.right = 15;
  dir.shadow.camera.top = 15;
  dir.shadow.camera.bottom = -5;
  scene.add(dir);

  const rim = new THREE.DirectionalLight(0xe94560, 0.4);
  rim.position.set(-3, 5, -3);
  scene.add(rim);

  // Physics
  world = new RAPIER.World({ x: 0, y: -15, z: 0 }); // slightly stronger gravity for fun

  createGround();
  await loadModel();

  window.addEventListener('resize', onResize);
  window.addEventListener('click', onDrop);
  window.addEventListener('touchstart', onDrop);
  document.getElementById('reset-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    reset();
  });

  document.getElementById('loading').style.display = 'none';
  animate();
}

function createGround() {
  // Main ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.8, metalness: 0.2 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(50, 50, 0x0f3460, 0x0f3460);
  grid.position.y = 0.01;
  scene.add(grid);

  const gb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(25, 0.5, 25).setRestitution(0.4).setFriction(0.6), gb);

  // Stairs!
  const stairMat = new THREE.MeshStandardMaterial({ color: 0x0f3460, roughness: 0.7 });
  const stairCount = 8;
  const stepW = 3, stepH = 0.35, stepD = 0.6;
  for (let i = 0; i < stairCount; i++) {
    const x = -1 + i * stepD * 0.8;
    const y = (stairCount - i) * stepH;
    const stair = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stairMat);
    stair.position.set(x, y, 0);
    stair.castShadow = true;
    stair.receiveShadow = true;
    scene.add(stair);

    const sb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(stepW / 2, stepH / 2, stepD / 2).setRestitution(0.3).setFriction(0.5), sb);
  }

  // Ramp at bottom of stairs
  const rampAngle = 0.25;
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.15, 2.5),
    new THREE.MeshStandardMaterial({ color: 0xe94560, roughness: 0.5 })
  );
  ramp.position.set(5, 0.3, 0);
  ramp.rotation.z = -rampAngle;
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  scene.add(ramp);

  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(5, 0.3, 0)
      .setRotation({ x: 0, y: 0, z: Math.sin(-rampAngle / 2), w: Math.cos(-rampAngle / 2) })
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.5, 0.075, 1.25).setRestitution(0.6).setFriction(0.3), rb);

  // Some dynamic boxes to crash into
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x533483, roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const s = 0.25 + Math.random() * 0.4;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), boxMat);
    const x = 3 + Math.random() * 4;
    const z = -1.5 + Math.random() * 3;
    const y = s / 2 + (Math.random() > 0.5 ? 0.35 : 0);
    box.position.set(x, y, z);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);

    const bb = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinearDamping(0.3).setAngularDamping(0.3)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(s / 2, s / 2, s / 2).setMass(1.5).setRestitution(0.4).setFriction(0.5), bb
    );
    obstacleParts.push({ mesh: box, body: bb });
  }
}

async function loadModel() {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(MODEL_URL, (gltf) => {
      const cloned = SkeletonUtils.clone(gltf.scene);
      gltfScene = cloned;

      // Apply default mfer mesh visibility
      cloned.traverse((child) => {
        if (child.isMesh) {
          child.visible = DEFAULT_MESHES.has(child.name);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Update matrices before measuring
      cloned.updateMatrixWorld(true);

      // Measure visible meshes
      const box3 = new THREE.Box3();
      cloned.traverse((child) => {
        if (child.isMesh && child.visible) {
          const meshBox = new THREE.Box3().setFromObject(child);
          box3.union(meshBox);
        }
      });

      const size = box3.getSize(new THREE.Vector3());
      modelCenter = box3.getCenter(new THREE.Vector3());
      modelBottomY = box3.min.y;
      console.log('Model size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));
      console.log('Model bottom Y:', modelBottomY.toFixed(3), 'center Y:', modelCenter.y.toFixed(3));

      // Scale to ~2.5 units tall
      const targetHeight = 2.5;
      modelScale = size.y > 0.01 ? targetHeight / size.y : 1;
      cloned.scale.setScalar(modelScale);
      console.log('Scale:', modelScale.toFixed(2));

      // Position at top of stairs, suspended
      const stairTopX = -1;
      cloned.position.set(
        stairTopX - modelCenter.x * modelScale,
        DROP_HEIGHT,
        -modelCenter.z * modelScale
      );
      originalPos.copy(cloned.position);

      scene.add(cloned);

      // Play idle animation
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(cloned);
        const idle = gltf.animations.find(a => a.name.toLowerCase().includes('idle')) || gltf.animations[0];
        mixer.clipAction(idle).play();
        console.log('Animation:', idle.name);
      }

      // Save bone transforms for reset
      cloned.traverse((child) => {
        if (child.isBone) {
          child.userData.origPos = child.position.clone();
          child.userData.origQuat = child.quaternion.clone();
          child.userData.origScale = child.scale.clone();
        }
      });

      resolve();
    },
    (progress) => {
      const pct = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : '...';
      document.getElementById('loading').textContent = `loading mfer... ${pct}%`;
    },
    reject);
  });
}

function createMferBody() {
  if (!gltfScene) return;

  // Capsule sized to match the 2.5-unit-tall model
  const targetHeight = 2.5;
  const capsuleRadius = 0.3;
  const capsuleHalfH = targetHeight / 2 - capsuleRadius; // total capsule = targetHeight
  const pos = gltfScene.position;

  // Offset from model origin to capsule center:
  // capsule center should be (halfH + radius) above the model's feet
  // feet are at (modelBottomY * modelScale) above the model origin
  const centerOffset = modelBottomY * modelScale + capsuleHalfH + capsuleRadius;

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(pos.x, pos.y + centerOffset, pos.z)
    .setLinearDamping(0.1)
    .setAngularDamping(0.3)
    .setCcdEnabled(true);
  mferBody = world.createRigidBody(bodyDesc);

  // Main body capsule
  const capsule = RAPIER.ColliderDesc.capsule(capsuleHalfH, capsuleRadius)
    .setMass(5)
    .setRestitution(0.35)
    .setFriction(0.4)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  world.createCollider(capsule, mferBody);

  // Head sphere (pokes out from top of capsule)
  const headRadius = 0.2;
  const head = RAPIER.ColliderDesc.ball(headRadius)
    .setMass(1.5)
    .setRestitution(0.5)
    .setFriction(0.3)
    .setTranslation(0, capsuleHalfH + headRadius, 0);
  world.createCollider(head, mferBody);

  // Give a slight random spin for variety
  const spinX = (Math.random() - 0.5) * 3;
  const spinZ = (Math.random() - 0.5) * 2;
  mferBody.setAngvel({ x: spinX, y: 0, z: spinZ }, true);

  // Slight push toward the stairs
  mferBody.setLinvel({ x: 1.5 + Math.random(), y: -2, z: (Math.random() - 0.5) * 2 }, true);
}

function onDrop(e) {
  if (dropped) return;
  if (e.target.id === 'reset-btn') return;
  dropped = true;
  settled = false;
  settledTimer = 0;
  impactScore = 0;
  maxVelocity = 0;
  bounceCount = 0;

  if (mixer) mixer.stopAllAction();
  createMferBody();

  document.getElementById('instructions').textContent = '';
  document.getElementById('reset-btn').style.display = 'block';
}

function reset() {
  // Clean up
  if (mferBody) {
    world.removeRigidBody(mferBody);
    mferBody = null;
  }

  if (gltfScene) {
    gltfScene.position.copy(originalPos);
    gltfScene.rotation.set(0, 0, 0);
    gltfScene.scale.setScalar(modelScale);

    gltfScene.traverse((child) => {
      if (child.isBone && child.userData.origPos) {
        child.position.copy(child.userData.origPos);
        child.quaternion.copy(child.userData.origQuat);
        child.scale.copy(child.userData.origScale);
      }
    });
  }

  if (mixer) {
    for (const action of mixer._actions) action.reset().play();
  }

  dropped = false;
  settled = false;
  document.getElementById('instructions').textContent = 'click to drop';
  document.getElementById('score').textContent = '';
  document.getElementById('reset-btn').style.display = 'none';
  camera.position.set(0, 6, 14);
  camera.lookAt(0, 4, 0);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateScore() {
  if (!mferBody) return;

  const vel = mferBody.linvel();
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
  maxVelocity = Math.max(maxVelocity, speed);

  // Score based on max velocity + angular chaos
  const angvel = mferBody.angvel();
  const spin = Math.sqrt(angvel.x * angvel.x + angvel.y * angvel.y + angvel.z * angvel.z);
  impactScore = Math.round(maxVelocity * 100 + spin * 50);

  // Check if settled
  if (speed < 0.1 && spin < 0.1) {
    settledTimer += 1 / 60;
    if (settledTimer > 1.5 && !settled) {
      settled = true;
      document.getElementById('instructions').textContent = `final score: ${impactScore}`;
    }
  } else {
    settledTimer = 0;
  }

  if (!settled) {
    document.getElementById('score').textContent = `${impactScore}`;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (mixer && !dropped) mixer.update(delta);

  // Always step physics
  world.step();

  // Sync obstacles
  for (const { mesh, body } of obstacleParts) {
    const p = body.translation();
    const r = body.rotation();
    mesh.position.set(p.x, p.y, p.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }

  if (dropped && mferBody && gltfScene) {
    const pos = mferBody.translation();
    const rot = mferBody.rotation();

    // Sync model to physics body (reverse the centerOffset used when creating the body)
    const syncOffset = modelBottomY * modelScale + 1.25; // capsuleHalfH(0.95) + capsuleRadius(0.3)
    gltfScene.position.set(
      pos.x,
      pos.y - syncOffset,
      pos.z
    );
    gltfScene.quaternion.set(rot.x, rot.y, rot.z, rot.w);

    updateScore();

    // Camera follow with smooth tracking
    const vel = mferBody.linvel();
    const lookAheadX = vel.x * 0.15; // lead the camera in the direction of travel
    const camTargetX = pos.x + 3 + lookAheadX;
    const camTargetY = Math.max(pos.y + 3.5, 3);
    const camTargetZ = pos.z + 10; // track Z so sideways motion stays visible

    camera.position.x += (camTargetX - camera.position.x) * 0.08;
    camera.position.y += (camTargetY - camera.position.y) * 0.1;
    camera.position.z += (camTargetZ - camera.position.z) * 0.08;
    camera.lookAt(pos.x, pos.y, pos.z);
  }

  renderer.render(scene, camera);
}

init().then(() => {
  console.log('mfer bash loaded!');
}).catch(err => {
  console.error('Failed to init:', err);
  document.getElementById('loading').textContent = 'failed to load :(';
});
