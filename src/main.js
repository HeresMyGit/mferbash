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

// Ragdoll segment definitions: each maps a bone pair to a physics body
const RAGDOLL_SEGMENTS = [
  { name: 'hips',          bone: 'mixamorigHips',          child: 'mixamorigSpine',         radius: 0.12, mass: 3.0 },
  { name: 'spine',         bone: 'mixamorigSpine',         child: 'mixamorigNeck',          radius: 0.11, mass: 3.0 },
  { name: 'head',          bone: 'mixamorigNeck',          child: 'mixamorigHead',          radius: 0.16, mass: 1.5, shape: 'ball' },
  { name: 'leftUpperArm',  bone: 'mixamorigLeftArm',       child: 'mixamorigLeftForeArm',   radius: 0.05, mass: 1.0 },
  { name: 'leftForeArm',   bone: 'mixamorigLeftForeArm',   child: 'mixamorigLeftHand',      radius: 0.04, mass: 0.8 },
  { name: 'rightUpperArm', bone: 'mixamorigRightArm',      child: 'mixamorigRightForeArm',  radius: 0.05, mass: 1.0 },
  { name: 'rightForeArm',  bone: 'mixamorigRightForeArm',  child: 'mixamorigRightHand',     radius: 0.04, mass: 0.8 },
  { name: 'leftUpperLeg',  bone: 'mixamorigLeftUpLeg',     child: 'mixamorigLeftLeg',       radius: 0.07, mass: 2.0 },
  { name: 'leftLowerLeg',  bone: 'mixamorigLeftLeg',       child: 'mixamorigLeftFoot',      radius: 0.05, mass: 1.5 },
  { name: 'rightUpperLeg', bone: 'mixamorigRightUpLeg',    child: 'mixamorigRightLeg',      radius: 0.07, mass: 2.0 },
  { name: 'rightLowerLeg', bone: 'mixamorigRightLeg',      child: 'mixamorigRightFoot',     radius: 0.05, mass: 1.5 },
];

// Joints connecting ragdoll segments (order: parents before children)
const RAGDOLL_JOINTS = [
  { segA: 'hips',          segB: 'spine' },
  { segA: 'spine',         segB: 'head' },
  { segA: 'spine',         segB: 'leftUpperArm' },
  { segA: 'spine',         segB: 'rightUpperArm' },
  { segA: 'leftUpperArm',  segB: 'leftForeArm' },
  { segA: 'rightUpperArm', segB: 'rightForeArm' },
  { segA: 'hips',          segB: 'leftUpperLeg' },
  { segA: 'hips',          segB: 'rightUpperLeg' },
  { segA: 'leftUpperLeg',  segB: 'leftLowerLeg' },
  { segA: 'rightUpperLeg', segB: 'rightLowerLeg' },
];

// Segment processing order (parents before children for bone sync)
const SEGMENT_ORDER = [
  'hips', 'spine', 'head',
  'leftUpperArm', 'leftForeArm',
  'rightUpperArm', 'rightForeArm',
  'leftUpperLeg', 'leftLowerLeg',
  'rightUpperLeg', 'rightLowerLeg',
];

let scene, camera, renderer;
let world;
let gltfScene, mixer;
let obstacleParts = []; // { body, mesh }
let dropped = false;
let modelScale = 1;
let modelCenter = new THREE.Vector3();
let modelBottomY = 0;
let lastTime = performance.now();
let originalPos = new THREE.Vector3();
let impactScore = 0;
let maxVelocity = 0;
let settled = false;
let settledTimer = 0;

// Ragdoll state
let ragdollBodies = {};       // { segName: RigidBody }
let ragdollJointRefs = [];    // ImpulseJoint references
let ragdollSegData = {};      // { segName: { bone, halfDist, localRotOffset } }
let debugMeshes = [];         // wireframe physics helpers
let showDebug = false;

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
  world = new RAPIER.World({ x: 0, y: -15, z: 0 });

  createGround();
  await loadModel();

  window.addEventListener('resize', onResize);
  window.addEventListener('click', onDrop);
  window.addEventListener('touchstart', onDrop);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      showDebug = !showDebug;
      for (const d of debugMeshes) d.mesh.visible = showDebug;
    }
  });
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

  // Stairs
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

  // Dynamic boxes to crash into
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
          child.frustumCulled = false;
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

function createRagdoll() {
  if (!gltfScene) return;

  // Ensure skeleton world matrices are current
  gltfScene.updateMatrixWorld(true);

  // Build bone lookup
  const bones = {};
  gltfScene.traverse((child) => {
    if (child.isBone) bones[child.name] = child;
  });

  // Ragdoll self-collision prevention: member of group 0, filter = everything except group 0
  const ragdollGroup = (0x0001 << 16) | 0xFFFE;

  // Create physics bodies for each segment
  for (const seg of RAGDOLL_SEGMENTS) {
    const bone = bones[seg.bone];
    const childBone = bones[seg.child];
    if (!bone || !childBone) {
      console.warn(`Missing bone for segment ${seg.name}: ${seg.bone} or ${seg.child}`);
      continue;
    }

    // Get world positions of bone endpoints
    const bonePos = new THREE.Vector3();
    const childPos = new THREE.Vector3();
    bone.getWorldPosition(bonePos);
    childBone.getWorldPosition(childPos);

    // Segment center and half-distance
    const center = bonePos.clone().lerp(childPos, 0.5);
    const halfDist = bonePos.distanceTo(childPos) / 2;

    // Orient capsule Y axis along bone-to-child direction
    const dir = childPos.clone().sub(bonePos).normalize();
    const bodyQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    // Compute rotation offset: maps physics body rotation back to bone rotation
    // boneWorldQuat = bodyQuat_new * localRotOffset
    // localRotOffset = inverse(bodyQuat_init) * boneWorldQuat_init
    const boneWorldQuat = new THREE.Quaternion();
    bone.getWorldQuaternion(boneWorldQuat);
    const bodyQuatInv = bodyQuat.clone().invert();
    const localRotOffset = bodyQuatInv.clone().multiply(boneWorldQuat);

    // Create rigid body at segment center
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: bodyQuat.x, y: bodyQuat.y, z: bodyQuat.z, w: bodyQuat.w })
      .setLinearDamping(0.3)
      .setAngularDamping(0.5)
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);

    // Create collider
    let colliderDesc;
    if (seg.shape === 'ball') {
      colliderDesc = RAPIER.ColliderDesc.ball(seg.radius);
    } else {
      const capsuleHalfH = Math.max(halfDist - seg.radius, 0.02);
      colliderDesc = RAPIER.ColliderDesc.capsule(capsuleHalfH, seg.radius);
    }
    colliderDesc
      .setMass(seg.mass)
      .setRestitution(0.3)
      .setFriction(0.5)
      .setCollisionGroups(ragdollGroup);
    world.createCollider(colliderDesc, body);

    ragdollBodies[seg.name] = body;
    ragdollSegData[seg.name] = { bone, halfDist, localRotOffset };

    // Debug wireframe visualization
    let debugGeom;
    if (seg.shape === 'ball') {
      debugGeom = new THREE.SphereGeometry(seg.radius, 8, 8);
    } else {
      const capsuleHalfH = Math.max(halfDist - seg.radius, 0.02);
      debugGeom = new THREE.CapsuleGeometry(seg.radius, capsuleHalfH * 2, 4, 8);
    }
    const debugMesh = new THREE.Mesh(debugGeom, new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));
    debugMesh.visible = showDebug;
    scene.add(debugMesh);
    debugMeshes.push({ mesh: debugMesh, segName: seg.name });
  }

  // Create joints between segments
  for (const jDef of RAGDOLL_JOINTS) {
    const bodyA = ragdollBodies[jDef.segA];
    const bodyB = ragdollBodies[jDef.segB];
    if (!bodyA || !bodyB) continue;

    const segDataB = ragdollSegData[jDef.segB];

    // The shared connection point is segB's bone position
    const sharedPos = new THREE.Vector3();
    segDataB.bone.getWorldPosition(sharedPos);

    // Compute anchor in body A's local frame
    const posA = bodyA.translation();
    const rotA = bodyA.rotation();
    const quatA = new THREE.Quaternion(rotA.x, rotA.y, rotA.z, rotA.w);
    const quatAInv = quatA.clone().invert();
    const anchorA = new THREE.Vector3(sharedPos.x - posA.x, sharedPos.y - posA.y, sharedPos.z - posA.z)
      .applyQuaternion(quatAInv);

    // Compute anchor in body B's local frame
    const posB = bodyB.translation();
    const rotB = bodyB.rotation();
    const quatB = new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w);
    const quatBInv = quatB.clone().invert();
    const anchorB = new THREE.Vector3(sharedPos.x - posB.x, sharedPos.y - posB.y, sharedPos.z - posB.z)
      .applyQuaternion(quatBInv);

    const jointData = RAPIER.JointData.spherical(
      { x: anchorA.x, y: anchorA.y, z: anchorA.z },
      { x: anchorB.x, y: anchorB.y, z: anchorB.z }
    );
    const joint = world.createImpulseJoint(jointData, bodyA, bodyB, true);
    ragdollJointRefs.push(joint);
  }

  // Initial impulse on hips
  const hipsBody = ragdollBodies['hips'];
  if (hipsBody) {
    hipsBody.setAngvel({ x: (Math.random() - 0.5) * 3, y: 0, z: (Math.random() - 0.5) * 2 }, true);
    hipsBody.setLinvel({ x: 1.5 + Math.random(), y: -2, z: (Math.random() - 0.5) * 2 }, true);
  }

  console.log(`Ragdoll created: ${Object.keys(ragdollBodies).length} bodies, ${ragdollJointRefs.length} joints`);
}

function syncRagdollBones() {
  if (!gltfScene || Object.keys(ragdollBodies).length === 0) return;

  // Reusable temp objects
  const targetPos = new THREE.Vector3();
  const targetQuat = new THREE.Quaternion();
  const bodyQuatThree = new THREE.Quaternion();
  const offset = new THREE.Vector3();
  const parentInv = new THREE.Matrix4();
  const desiredWorld = new THREE.Matrix4();
  const localMat = new THREE.Matrix4();
  const lp = new THREE.Vector3();
  const lq = new THREE.Quaternion();
  const ls = new THREE.Vector3();
  const scaleVec = new THREE.Vector3(modelScale, modelScale, modelScale);

  for (const segName of SEGMENT_ORDER) {
    const body = ragdollBodies[segName];
    const seg = ragdollSegData[segName];
    if (!body || !seg) continue;

    const p = body.translation();
    const r = body.rotation();
    bodyQuatThree.set(r.x, r.y, r.z, r.w);

    // Bone position = body center + offset to bone end (in body local, bone is at -halfDist along Y)
    offset.set(0, -seg.halfDist, 0).applyQuaternion(bodyQuatThree);
    targetPos.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);

    // Bone rotation = bodyQuat * localRotOffset
    targetQuat.copy(bodyQuatThree).multiply(seg.localRotOffset);

    // Compute local transform from desired world transform
    // Use scale=modelScale so decomposed bone scale comes out as ~1
    parentInv.copy(seg.bone.parent.matrixWorld).invert();
    desiredWorld.compose(targetPos, targetQuat, scaleVec);
    localMat.multiplyMatrices(parentInv, desiredWorld);
    localMat.decompose(lp, lq, ls);

    seg.bone.position.copy(lp);
    seg.bone.quaternion.copy(lq);
    // Don't touch bone.scale - decomposed scale should be ~1

    // Update this bone and descendants so child segments have correct parent matrixWorld
    seg.bone.updateMatrixWorld(true);
  }
}

function onDrop(e) {
  if (dropped) return;
  if (e.target.id === 'reset-btn') return;
  dropped = true;
  settled = false;
  settledTimer = 0;
  impactScore = 0;
  maxVelocity = 0;

  if (mixer) mixer.stopAllAction();
  createRagdoll();

  document.getElementById('instructions').textContent = '';
  document.getElementById('reset-btn').style.display = 'block';
}

function reset() {
  // Clean up ragdoll bodies
  for (const joint of ragdollJointRefs) {
    world.removeImpulseJoint(joint, true);
  }
  for (const body of Object.values(ragdollBodies)) {
    world.removeRigidBody(body);
  }
  ragdollBodies = {};
  ragdollJointRefs = [];
  ragdollSegData = {};

  // Clean up debug meshes
  for (const d of debugMeshes) {
    scene.remove(d.mesh);
    d.mesh.geometry.dispose();
    d.mesh.material.dispose();
  }
  debugMeshes = [];

  // Restore model
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
  const hipsBody = ragdollBodies['hips'];
  if (!hipsBody) return;

  // Aggregate velocity across all bodies for richer scoring
  let totalSpeed = 0;
  let totalSpin = 0;
  let count = 0;
  for (const body of Object.values(ragdollBodies)) {
    const v = body.linvel();
    const a = body.angvel();
    totalSpeed += Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    totalSpin += Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    count++;
  }
  const avgSpeed = totalSpeed / count;
  const avgSpin = totalSpin / count;
  maxVelocity = Math.max(maxVelocity, avgSpeed);
  impactScore = Math.round(maxVelocity * 100 + avgSpin * 50);

  // Check if settled
  if (avgSpeed < 0.15 && avgSpin < 0.15) {
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

  // Step physics
  world.step();

  // Sync obstacle meshes to physics
  for (const { mesh, body } of obstacleParts) {
    const p = body.translation();
    const r = body.rotation();
    mesh.position.set(p.x, p.y, p.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }

  if (dropped && Object.keys(ragdollBodies).length > 0) {
    // Sync ragdoll bones to physics bodies
    syncRagdollBones();

    // Sync debug wireframes
    for (const d of debugMeshes) {
      const body = ragdollBodies[d.segName];
      if (!body) continue;
      const p = body.translation();
      const r = body.rotation();
      d.mesh.position.set(p.x, p.y, p.z);
      d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    updateScore();

    // Camera follows hips
    const hipsBody = ragdollBodies['hips'];
    if (hipsBody) {
      const pos = hipsBody.translation();
      const vel = hipsBody.linvel();
      const lookAheadX = vel.x * 0.15;
      const camTargetX = pos.x + 3 + lookAheadX;
      const camTargetY = Math.max(pos.y + 3.5, 3);
      const camTargetZ = pos.z + 10;

      camera.position.x += (camTargetX - camera.position.x) * 0.08;
      camera.position.y += (camTargetY - camera.position.y) * 0.1;
      camera.position.z += (camTargetZ - camera.position.z) * 0.08;
      camera.lookAt(pos.x, pos.y, pos.z);
    }
  }

  renderer.render(scene, camera);
}

init().then(() => {
  console.log('mfer bash loaded!');
}).catch(err => {
  console.error('Failed to init:', err);
  document.getElementById('loading').textContent = 'failed to load :(';
});
