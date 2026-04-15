import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const TUNING = {
  arenaHalfX: 20,
  arenaHalfZ: 15,
  floorThickness: 0.35,
  groundY: 0,
  playerPos: new THREE.Vector3(-17, 0.25, 12.2),
  playerFacing: new THREE.Vector3(2, 0, -2),
  playerHurtY: 1.05,
  playerHurtRadius: 0.95,
  playerTouchDistance: 1.1,
  platformHalfExtents: new THREE.Vector3(1.15, 0.2, 1.15),
  muzzleOffset: new THREE.Vector3(0.05, 1.2, 0),
  bulletSpeed: 36,
  bulletLifetime: 1.45,
  bulletRadius: 0.16,
  bulletMax: 64,
  enemyRadius: 0.8,
  enemyMax: 44,
  enemyBaseSpeed: 2.5,
  enemySpeedRamp: 0.05,
  enemySpawnStart: 1.8,
  enemySpawnMin: 0.55,
  enemySpawnAccel: 0.03,
  maxRagdolls: 28,
  ragdollLifetime: 7.5,
};
const CAMERA_PRESETS = {
  current: { pos: [18, 17, 20], lookAt: [1.8, 0.9, -1.6] },
  diablo: { pos: [14.5, 20.5, 14], lookAt: [0, 0.8, 0] },
  topdown: { pos: [0, 33, 0.001], lookAt: [0, 0, 0] },
  shoulder: { pos: [-20.71, 4.53, 15.58], lookAt: [-8.41, -2.06, 4.2] },
  sideline: { pos: [24, 9.2, 0], lookAt: [-2, 1.2, 0] },
};
const PLAYER_IDLE_CLIP_PREFERENCES = [
  'Idle_With_Aimed_Pistol',
  'Standing_Idle',
  'General_Conversation',
];
const ENEMY_MOVESETS = [
  {
    id: 'walk',
    weight: 0.36,
    moveClip: 'Walking_Forward_InPlace',
    moveClipTimeScale: 1,
    speedMultiplier: 0.88,
    pauseChance: 0.2,
    pauseCheckMin: 1.8,
    pauseCheckMax: 3.6,
    pauseDurationMin: 0.9,
    pauseDurationMax: 2.2,
    pauseClips: [
      'Standing_Idle_Looking_Around',
      'Being_Terrified_While_Standing',
      'Boxing_Taunt',
    ],
  },
  {
    id: 'happy_walk',
    weight: 0.2,
    moveClip: 'Happy_Walking_Forward_InPlace',
    moveClipTimeScale: 1.2,
    speedMultiplier: 0.98,
    pauseChance: 0.18,
    pauseCheckMin: 2,
    pauseCheckMax: 3.8,
    pauseDurationMin: 0.8,
    pauseDurationMax: 1.8,
    pauseClips: [
      'Male_Cheering_With_Two_Fists_Pump',
      'Boxing_Taunt',
      'Standing_Idle_Looking_Around',
    ],
  },
  {
    id: 'run',
    weight: 0.24,
    moveClip: 'Slow_Run_Forward_InPlace',
    moveClipTimeScale: 1.08,
    speedMultiplier: 1.38,
    pauseChance: 0.12,
    pauseCheckMin: 1.4,
    pauseCheckMax: 2.7,
    pauseDurationMin: 0.6,
    pauseDurationMax: 1.25,
    pauseClips: [
      'Boxing_Taunt',
      'Standing_Idle_Looking_Around',
    ],
  },
  {
    id: 'zombie_walk',
    weight: 0.15,
    moveClip: 'Zombie_Walking_InPlace',
    moveClipTimeScale: 0.92,
    speedMultiplier: 0.74,
    pauseChance: 0.32,
    pauseCheckMin: 1.7,
    pauseCheckMax: 3.3,
    pauseDurationMin: 1.1,
    pauseDurationMax: 2.5,
    pauseClips: [
      'Zombie_Standing_Idle',
      'Zombie_Looking_Around',
      'Zombie_Scratching_Idle',
      'Zombie_Twitching_Idle',
    ],
  },
  {
    id: 'zombie_run',
    weight: 0.05,
    moveClip: 'Zombie_Run',
    moveClipTimeScale: 1,
    speedMultiplier: 1.06,
    pauseChance: 0.16,
    pauseCheckMin: 1.5,
    pauseCheckMax: 2.8,
    pauseDurationMin: 0.8,
    pauseDurationMax: 1.6,
    pauseClips: [
      'Zombie_Screaming',
      'Zombie_Looking_Around',
      'Zombie_Standing_Idle',
    ],
  },
];
const ENEMY_PAUSE_MIN_DISTANCE = 5.2;
const ENEMY_MIXER_TIME_SCALE = 0.65;
const MIXAMO_FILES = Array.from(
  new Set([
    ...PLAYER_IDLE_CLIP_PREFERENCES,
    ...ENEMY_MOVESETS.map((set) => set.moveClip),
    ...ENEMY_MOVESETS.flatMap((set) => set.pauseClips),
  ])
);
const MIXAMO_CLIP_PATHS = [
  '/animations',
  '/mixamo-sample',
];
const HORDE_SCENE_LOOK = {
  background: 0x656a72,
  fogColor: 0x273040,
  fogDensity: 0.022,
  inheritedLightScale: 0.22,
  toneExposure: 0.92,
};
const ENEMY_PAUSE_CHANCE_SCALE = 0.25;
const ENEMY_PAUSE_COOLDOWN_SCALE = 1.6;
const CAMERA_CONTROLS = {
  moveSpeed: 13,
  verticalSpeed: 9,
  yawSpeed: 1.7,
  pitchSpeed: 1.25,
  lookDistance: 18,
};
const KILLS_PER_WEAPON_SWITCH = 25;
const ROTATING_WEAPON_IDS = ['machine_gun', 'shotgun', 'tri_shot', 'grenade_lob', 'sniper_rifle'];
const HORDE_WEAPONS = {
  sidearm: {
    id: 'sidearm',
    label: 'pistol',
    mode: 'single',
    allowHold: false,
    fireInterval: 0.18,
    speed: TUNING.bulletSpeed,
    lifetime: TUNING.bulletLifetime,
    radius: TUNING.bulletRadius,
    spread: 0,
  },
  machine_gun: {
    id: 'machine_gun',
    label: 'machine gun',
    mode: 'single',
    allowHold: true,
    fireInterval: 0.07,
    speed: 46,
    lifetime: 1.15,
    radius: 0.12,
    spread: 0.006,
  },
  shotgun: {
    id: 'shotgun',
    label: 'shotgun',
    mode: 'shotgun',
    allowHold: false,
    fireInterval: 0.72,
    pellets: 8,
    spread: 0.22,
    speed: 29,
    lifetime: 0.72,
    radius: 0.11,
  },
  tri_shot: {
    id: 'tri_shot',
    label: 'tri-shot',
    mode: 'tri',
    allowHold: false,
    fireInterval: 0.14,
    spread: 0.13,
    speed: 39,
    lifetime: 1.02,
    radius: 0.13,
  },
  grenade_lob: {
    id: 'grenade_lob',
    label: 'grenade lob',
    mode: 'grenade',
    allowHold: false,
    fireInterval: 1.08,
    horizontalSpeed: 14,
    flightTimeMin: 0.34,
    flightTimeMax: 1.18,
    gravity: 18,
    lifetime: 1.75,
    radius: 0.22,
    explosionRadius: 4.2,
    explosionStrength: 19,
  },
  sniper_rifle: {
    id: 'sniper_rifle',
    label: 'sniper rifle',
    mode: 'single',
    allowHold: false,
    fireInterval: 0,
    speed: 125,
    lifetime: 1.1,
    radius: 0.1,
    spread: 0,
    pierce: true,
  },
};

function makeBulletMesh({
  radius = TUNING.bulletRadius,
  color = 0xfff1c1,
  emissive = 0xff8f4c,
  emissiveIntensity = 1.35,
  roughness = 0.3,
  metalness = 0.05,
} = {}) {
  const geo = new THREE.SphereGeometry(radius, 10, 10);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function makeGrenadeMesh(radius = HORDE_WEAPONS.grenade_lob.radius) {
  return makeBulletMesh({
    radius,
    color: 0x7d9a5b,
    emissive: 0x233019,
    emissiveIntensity: 0.7,
    roughness: 0.9,
    metalness: 0.02,
  });
}

function createSartoshiSkyDome() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#72767f');
  skyGrad.addColorStop(0.58, '#6a6e77');
  skyGrad.addColorStop(1, '#5f646d');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 280; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.72;
    const size = THREE.MathUtils.randFloat(1.2, 4.8);
    const twinkle = Math.random() * 0.35 + 0.65;
    const color = Math.random() < 0.18 ? '#ffd65a' : '#ffc643';
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = color;
    if (Math.random() < 0.38) {
      ctx.fillRect(x - size * 0.5, y - 0.5, size, 1.2);
      ctx.fillRect(x - 0.5, y - size * 0.5, 1.2, size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const moonX = width * 0.82;
  const moonY = height * 0.205;
  const outerR = 66;
  const innerR = 52;
  const carveR = 50;

  ctx.fillStyle = '#111113';
  ctx.beginPath();
  ctx.arc(moonX, moonY, outerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffc63d';
  ctx.beginPath();
  ctx.arc(moonX, moonY, innerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6a6e77';
  ctx.beginPath();
  ctx.arc(moonX + 22, moonY, carveR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0d0d0f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(moonX, moonY, outerR - 2, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(82, 64, 42),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  dome.frustumCulled = false;
  dome.renderOrder = -100;
  dome.position.set(0, TUNING.groundY + 20, 0);
  return dome;
}

function makeFloorMesh() {
  const group = new THREE.Group();
  const terrainColor = 0x222c30;
  const deadWoodColor = 0x3b322f;
  const fenceColor = 0x47505f;
  const mossColor = 0x223026;

  const terrainGeo = new THREE.PlaneGeometry(
    TUNING.arenaHalfX * 2 + 24,
    TUNING.arenaHalfZ * 2 + 24,
    84,
    64
  );
  const terrainPos = terrainGeo.attributes.position;
  for (let i = 0; i < terrainPos.count; i++) {
    const x = terrainPos.getX(i);
    const z = terrainPos.getY(i);
    const swell =
      Math.sin(x * 0.17) * 0.16 +
      Math.cos(z * 0.21) * 0.13 +
      Math.sin((x + z) * 0.11) * 0.11 +
      (Math.random() - 0.5) * 0.04;
    terrainPos.setZ(i, swell);
  }
  terrainGeo.computeVertexNormals();

  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      color: terrainColor,
      roughness: 0.98,
      metalness: 0.02,
    })
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = TUNING.groundY - 0.04;
  terrain.receiveShadow = true;
  group.add(terrain);

  const graveyardGlow = new THREE.Mesh(
    new THREE.RingGeometry(7.6, 19, 56),
    new THREE.MeshBasicMaterial({
      color: 0x2b3a52,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  graveyardGlow.rotation.x = -Math.PI / 2;
  graveyardGlow.position.y = TUNING.groundY + 0.02;
  group.add(graveyardGlow);

  const skyDome = createSartoshiSkyDome();
  group.userData.skyDome = skyDome;
  group.add(skyDome);

  const arenaReadRing = new THREE.Mesh(
    new THREE.RingGeometry(11.2, 16.2, 72),
    new THREE.MeshBasicMaterial({
      color: 0x7f95bf,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  arenaReadRing.rotation.x = -Math.PI / 2;
  arenaReadRing.position.y = TUNING.groundY + 0.016;
  group.add(arenaReadRing);

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.38, 2.5),
    new THREE.MeshStandardMaterial({
      color: 0x555e6f,
      roughness: 0.9,
      metalness: 0.08,
    })
  );
  plinth.position.set(TUNING.playerPos.x, TUNING.groundY + 0.19, TUNING.playerPos.z);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const plinthTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.14, 1.8),
    new THREE.MeshStandardMaterial({
      color: 0x6a7384,
      roughness: 0.85,
      metalness: 0.1,
    })
  );
  plinthTop.position.set(TUNING.playerPos.x, TUNING.groundY + 0.45, TUNING.playerPos.z);
  plinthTop.castShadow = true;
  plinthTop.receiveShadow = true;
  group.add(plinthTop);

  const drawArchedStonePath = (ctx, cx, baseY, width, height) => {
    const half = width * 0.5;
    const radius = half;
    const arcBaseY = baseY - height + radius;
    ctx.beginPath();
    ctx.moveTo(cx - half, baseY);
    ctx.lineTo(cx - half, arcBaseY);
    ctx.quadraticCurveTo(cx - half, arcBaseY - radius, cx, arcBaseY - radius);
    ctx.quadraticCurveTo(cx + half, arcBaseY - radius, cx + half, arcBaseY);
    ctx.lineTo(cx + half, baseY);
    ctx.closePath();
  };

  const makeGraveCardMaterial = (variant) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width * 0.5;
    const baseY = 340;

    if (variant === 'cross') {
      ctx.fillStyle = '#12161f';
      ctx.fillRect(cx - 38, baseY - 235, 76, 250);
      ctx.fillRect(cx - 116, baseY - 168, 232, 72);

      ctx.fillStyle = '#858d99';
      ctx.fillRect(cx - 27, baseY - 222, 54, 218);
      ctx.fillRect(cx - 88, baseY - 155, 176, 46);
    } else {
      const outerWidth = variant === 'short' ? 168 : 134;
      const outerHeight = variant === 'short' ? 240 : 286;
      drawArchedStonePath(ctx, cx, baseY, outerWidth, outerHeight);
      ctx.fillStyle = '#12161f';
      ctx.fill();

      const innerWidth = outerWidth * 0.74;
      const innerHeight = outerHeight * 0.78;
      drawArchedStonePath(ctx, cx, baseY - 11, innerWidth, innerHeight);
      ctx.fillStyle = '#868e9a';
      ctx.fill();

      if (Math.random() < 0.6) {
        ctx.fillStyle = '#aeb5c2';
        const dotA = variant === 'short' ? 16 : 18;
        const dotB = variant === 'short' ? 13 : 15;
        ctx.beginPath();
        ctx.ellipse(cx - 18, baseY - (variant === 'short' ? 112 : 142), dotA, dotA * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 14, baseY - (variant === 'short' ? 158 : 188), dotB, dotB * 0.66, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#0e131a';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 6, 102, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      fog: true,
      depthWrite: true,
    });
  };

  const graveTallGeo = new THREE.PlaneGeometry(0.96, 1.44);
  const graveShortGeo = new THREE.PlaneGeometry(1.05, 1.2);
  const graveCrossGeo = new THREE.PlaneGeometry(1.02, 1.38);
  const graveTallMat = makeGraveCardMaterial('tall');
  const graveShortMat = makeGraveCardMaterial('short');
  const graveCrossMat = makeGraveCardMaterial('cross');
  const graveGroundPatchGeo = new THREE.CircleGeometry(0.34, 16);
  const graveGroundPatchMat = new THREE.MeshBasicMaterial({
    color: 0x10151d,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const clearRadiusPlayer = 6.1;
  const clearRadiusCenter = 6.2;
  const graveCount = 96;
  for (let i = 0; i < graveCount; i++) {
    const x = THREE.MathUtils.randFloatSpread(TUNING.arenaHalfX * 2 + 12);
    const z = THREE.MathUtils.randFloatSpread(TUNING.arenaHalfZ * 2 + 12);
    const distPlayer = Math.hypot(x - TUNING.playerPos.x, z - TUNING.playerPos.z);
    const distCenter = Math.hypot(x, z);
    if (distPlayer < clearRadiusPlayer || distCenter < clearRadiusCenter) continue;

    const grave = new THREE.Group();
    let graveGeo = graveTallGeo;
    let graveMat = graveTallMat;
    let graveHeight = 1.44;
    const variantRoll = Math.random();
    if (variantRoll < 0.33) {
      graveGeo = graveShortGeo;
      graveMat = graveShortMat;
      graveHeight = 1.2;
    } else if (variantRoll > 0.9) {
      graveGeo = graveCrossGeo;
      graveMat = graveCrossMat;
      graveHeight = 1.38;
    }

    const stone = new THREE.Mesh(graveGeo, graveMat);
    stone.castShadow = false;
    stone.receiveShadow = false;
    stone.position.y = graveHeight * 0.5 - THREE.MathUtils.randFloat(0.08, 0.2);
    stone.position.z = 0.02;
    stone.rotation.z = THREE.MathUtils.randFloat(-0.075, 0.075);
    grave.add(stone);

    const groundPatch = new THREE.Mesh(graveGroundPatchGeo, graveGroundPatchMat);
    groundPatch.rotation.x = -Math.PI / 2;
    groundPatch.position.y = 0.015;
    const patchScale = THREE.MathUtils.randFloat(0.84, 1.26);
    groundPatch.scale.set(patchScale * 1.15, patchScale, patchScale);
    grave.add(groundPatch);

    grave.position.set(x, TUNING.groundY, z);
    const faceCenterYaw = Math.atan2(-x, -z);
    grave.rotation.y = faceCenterYaw + THREE.MathUtils.randFloat(-0.95, 0.95);
    const scale = THREE.MathUtils.randFloat(0.86, 1.18);
    grave.scale.set(scale, scale * THREE.MathUtils.randFloat(0.92, 1.06), scale);
    group.add(grave);
  }

  const trunkMat = new THREE.MeshStandardMaterial({
    color: deadWoodColor,
    roughness: 0.96,
    metalness: 0.03,
  });
  const branchMat = new THREE.MeshStandardMaterial({
    color: 0x2b2725,
    roughness: 0.97,
    metalness: 0.01,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.2, 2.9, 7);
  const branchGeo = new THREE.CylinderGeometry(0.03, 0.06, 1.15, 5);
  const branchGeoLong = new THREE.CylinderGeometry(0.025, 0.05, 1.45, 5);
  const treeCount = 16;
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + THREE.MathUtils.randFloat(-0.12, 0.12);
    const radiusX = TUNING.arenaHalfX + THREE.MathUtils.randFloat(5.7, 9.4);
    const radiusZ = TUNING.arenaHalfZ + THREE.MathUtils.randFloat(5.2, 8.2);
    const x = Math.cos(angle) * radiusX;
    const z = Math.sin(angle) * radiusZ;
    if (Math.hypot(x - TUNING.playerPos.x, z - TUNING.playerPos.z) < 8.4) continue;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const branchA = new THREE.Mesh(Math.random() < 0.5 ? branchGeo : branchGeoLong, branchMat);
    branchA.position.y = 0.86;
    branchA.rotation.z = THREE.MathUtils.randFloat(0.7, 1.25);
    branchA.rotation.x = THREE.MathUtils.randFloat(-0.22, 0.22);
    branchA.castShadow = true;
    tree.add(branchA);

    const branchB = new THREE.Mesh(Math.random() < 0.5 ? branchGeo : branchGeoLong, branchMat);
    branchB.position.y = 0.52;
    branchB.rotation.z = THREE.MathUtils.randFloat(-1.25, -0.7);
    branchB.rotation.x = THREE.MathUtils.randFloat(-0.24, 0.24);
    branchB.castShadow = true;
    tree.add(branchB);

    if (Math.random() < 0.58) {
      const branchC = new THREE.Mesh(branchGeo, branchMat);
      branchC.position.y = 1.18;
      branchC.rotation.y = THREE.MathUtils.randFloat(0, Math.PI * 2);
      branchC.rotation.z = THREE.MathUtils.randFloat(-1.05, 1.05);
      branchC.castShadow = true;
      tree.add(branchC);
    }

    const treeScale = THREE.MathUtils.randFloat(0.9, 1.5);
    tree.scale.set(treeScale, treeScale * THREE.MathUtils.randFloat(0.9, 1.1), treeScale);
    tree.position.set(x, TUNING.groundY + 1.38, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.rotation.z = THREE.MathUtils.randFloat(-0.08, 0.08);
    group.add(tree);
  }

  const fencePostGeo = new THREE.BoxGeometry(0.08, 1.15, 0.08);
  const fenceRailGeo = new THREE.BoxGeometry(1.4, 0.07, 0.05);
  const fenceMat = new THREE.MeshStandardMaterial({
    color: fenceColor,
    roughness: 0.84,
    metalness: 0.48,
  });
  const postSpacing = 1.35;
  const fenceInsetX = TUNING.arenaHalfX + 1.6;
  const fenceInsetZ = TUNING.arenaHalfZ + 1.6;
  const buildFenceRow = (fixedValue, start, end, isXAxisRow) => {
    const span = end - start;
    const postCount = Math.max(2, Math.floor(span / postSpacing));
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount;
      const run = start + span * t;
      const post = new THREE.Mesh(fencePostGeo, fenceMat);
      post.position.set(
        isXAxisRow ? run : fixedValue,
        TUNING.groundY + 0.56,
        isXAxisRow ? fixedValue : run
      );
      post.castShadow = true;
      post.receiveShadow = true;
      group.add(post);

      if (i === postCount) continue;
      const nextRun = start + span * ((i + 1) / postCount);
      const segmentLen = Math.abs(nextRun - run);
      if (segmentLen < 0.2) continue;

      const railTop = new THREE.Mesh(fenceRailGeo, fenceMat);
      const railMid = new THREE.Mesh(fenceRailGeo, fenceMat);
      railTop.scale.x = segmentLen / 1.4;
      railMid.scale.x = segmentLen / 1.4;
      railTop.position.set(
        isXAxisRow ? run + (nextRun - run) * 0.5 : fixedValue,
        TUNING.groundY + 0.74,
        isXAxisRow ? fixedValue : run + (nextRun - run) * 0.5
      );
      railMid.position.set(railTop.position.x, TUNING.groundY + 0.43, railTop.position.z);
      if (!isXAxisRow) {
        railTop.rotation.y = Math.PI / 2;
        railMid.rotation.y = Math.PI / 2;
      }
      railTop.castShadow = true;
      railMid.castShadow = true;
      group.add(railTop, railMid);
    }
  };
  buildFenceRow(-fenceInsetZ, -fenceInsetX, fenceInsetX, true);
  buildFenceRow(fenceInsetZ, -fenceInsetX, fenceInsetX, true);
  buildFenceRow(-fenceInsetX, -fenceInsetZ, fenceInsetZ, false);
  buildFenceRow(fenceInsetX, -fenceInsetZ, fenceInsetZ, false);

  const mistMat = new THREE.MeshBasicMaterial({
    color: 0x6f83b6,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mistGeo = new THREE.CircleGeometry(1, 28);
  for (let i = 0; i < 6; i++) {
    const mist = new THREE.Mesh(mistGeo, mistMat);
    const radius = THREE.MathUtils.randFloat(5.8, 16.4);
    const angle = Math.random() * Math.PI * 2;
    mist.position.set(
      Math.cos(angle) * radius,
      TUNING.groundY + THREE.MathUtils.randFloat(0.04, 0.09),
      Math.sin(angle) * radius
    );
    const size = THREE.MathUtils.randFloat(3.2, 7.3);
    mist.scale.set(size, size, size);
    mist.rotation.x = -Math.PI / 2;
    mist.rotation.z = Math.random() * Math.PI * 2;
    group.add(mist);
  }

  const mossRing = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 3.2, 30),
    new THREE.MeshStandardMaterial({
      color: mossColor,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.58,
    })
  );
  mossRing.rotation.x = -Math.PI / 2;
  mossRing.position.set(TUNING.playerPos.x, TUNING.groundY + 0.01, TUNING.playerPos.z);
  group.add(mossRing);

  return group;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomSpawnPoint() {
  // Spawn only from the two sides opposite the player's corner:
  // opposite X wall and opposite Z wall.
  const oppositeX = TUNING.playerPos.x <= 0 ? TUNING.arenaHalfX + 1.5 : -TUNING.arenaHalfX - 1.5;
  const oppositeZ = TUNING.playerPos.z >= 0 ? -TUNING.arenaHalfZ - 1.5 : TUNING.arenaHalfZ + 1.5;

  if (Math.random() < 0.5) {
    return new THREE.Vector3(oppositeX, TUNING.playerPos.y, THREE.MathUtils.randFloatSpread(TUNING.arenaHalfZ * 2));
  }
  return new THREE.Vector3(THREE.MathUtils.randFloatSpread(TUNING.arenaHalfX * 2), TUNING.playerPos.y, oppositeZ);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function nextEnemyPauseCooldown(moveSet) {
  if (!moveSet) return 2;
  return randomRange(moveSet.pauseCheckMin, moveSet.pauseCheckMax) * ENEMY_PAUSE_COOLDOWN_SCALE;
}

function pickWeighted(items, weightKey = 'weight') {
  const total = items.reduce((sum, item) => sum + Math.max(0, item[weightKey] ?? 0), 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item[weightKey] ?? 0);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function weaponById(id) {
  return HORDE_WEAPONS[id] || HORDE_WEAPONS.sidearm;
}

function rotateDirection(direction, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new THREE.Vector3(
    direction.x * cos - direction.z * sin,
    0,
    direction.x * sin + direction.z * cos
  ).normalize();
}

function distanceSqPointToSegment(point, segStart, segEnd) {
  const seg = segEnd.clone().sub(segStart);
  const segLenSq = seg.lengthSq();
  if (segLenSq <= 0.000001) return point.distanceToSquared(segStart);

  const t = clamp(point.clone().sub(segStart).dot(seg) / segLenSq, 0, 1);
  const closest = segStart.clone().addScaledVector(seg, t);
  return point.distanceToSquared(closest);
}

function pickNextRotatingWeapon(currentWeaponId) {
  const pool = ROTATING_WEAPON_IDS.filter((id) => id !== currentWeaponId);
  const eligible = pool.length ? pool : ROTATING_WEAPON_IDS;
  return pick(eligible);
}

function applyHordeEyeOverride(targetScene) {
  if (!targetScene) return;

  const normalEyeMeshes = [];
  const redEyeMeshes = [];
  targetScene.traverse((child) => {
    if (!child.isMesh) return;
    if (child.name === 'eyes_normal') normalEyeMeshes.push(child);
    if (child.name === 'eyes_red') redEyeMeshes.push(child);
  });

  if (!normalEyeMeshes.some((mesh) => mesh.visible)) return;
  for (const mesh of normalEyeMeshes) mesh.visible = false;
  for (const mesh of redEyeMeshes) mesh.visible = true;
}

export default function createHordeMode(ctx) {
  const {
    RAPIER,
    scene,
    camera,
    renderer,
    world,
    eventQueue,
    spawnIdleMfer,
    createRagdoll,
    detachAccessories,
    destroyRagdoll,
    syncRagdollBones,
    playImpact,
    playPop,
    playGunshot,
  } = ctx;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TUNING.groundY);

  const enemies = [];
  const projectiles = [];
  const explosionFx = [];
  const ragdolls = [];
  const enemyColliderHandles = new Set();

  let player = null;
  let floorVisual = null;
  let floorBody = null;
  let platformBody = null;
  let playerHurtBody = null;
  let playerHurtHandle = null;
  let hordeLightRig = null;
  const sceneLookState = {
    background: null,
    fog: null,
    toneExposure: 1,
    adjustedLights: [],
  };

  let active = false;
  let isGameOver = false;
  let gameOverExplosionDone = false;
  let isSettingsOpen = false;
  let hordeCameraDebugMode = true;
  let kills = 0;
  let elapsed = 0;
  let spawnTimer = 0;
  let physicsAccum = 0;
  let fireCooldown = 0;
  let pointerDown = false;
  let pointerClientX = 0;
  let pointerClientY = 0;
  let currentWeaponId = 'sidearm';
  let nextWeaponSwitchAt = KILLS_PER_WEAPON_SWITCH;
  let weaponDebugMode = false;
  let selectedCameraPreset = 'shoulder';

  const hordeHudEl = document.getElementById('horde-hud');
  const cameraDebugEl = document.getElementById('horde-camera-debug');
  const cameraReadoutEl = document.getElementById('horde-camera-readout');
  const settingsBtnEl = document.getElementById('horde-settings-btn');
  const settingsPanelEl = document.getElementById('horde-settings-panel');
  const debugToggleEl = document.getElementById('horde-debug-toggle');
  const weaponDebugToggleEl = document.getElementById('horde-weapon-debug-toggle');
  const weaponDebugPanelEl = document.getElementById('horde-weapon-debug-panel');
  const weaponDebugButtons = Array.from(document.querySelectorAll('[data-horde-weapon]'));
  const cameraPresetButtons = Array.from(document.querySelectorAll('[data-horde-cam]'));
  const scoreEl = document.getElementById('horde-score');
  const timeEl = document.getElementById('horde-time');
  const gameOverEl = document.getElementById('horde-gameover');
  const finalEl = document.getElementById('horde-final');
  const retryBtn = document.getElementById('horde-retry-btn');
  const cameraKeysDown = new Set();
  const mixamoClips = new Map();
  let mixamoLoadPromise = null;
  let mixamoLoaded = false;

  function makeInPlaceClip(srcClip) {
    const clip = srcClip.clone();
    for (const track of clip.tracks) {
      if (!/mixamorigHips\.position/i.test(track.name)) continue;
      if (!track.values || track.values.length < 3) continue;
      const baseX = track.values[0];
      const baseZ = track.values[2];
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = baseX;
        track.values[i + 2] = baseZ;
      }
    }
    ensureClipStartsAtZero(clip);
    return clip;
  }

  function ensureClipStartsAtZero(clip) {
    const EPS = 0.0001;
    for (const track of clip.tracks) {
      if (!track?.times?.length || !track?.values?.length) continue;
      if (track.times[0] <= EPS) continue;

      const valueSize = track.values.length / track.times.length;
      if (!Number.isFinite(valueSize) || valueSize <= 0) continue;

      const TimesCtor = track.times.constructor;
      const ValuesCtor = track.values.constructor;

      const newTimes = new TimesCtor(track.times.length + 1);
      newTimes[0] = 0;
      newTimes.set(track.times, 1);

      const newValues = new ValuesCtor(track.values.length + valueSize);
      for (let i = 0; i < valueSize; i++) {
        newValues[i] = track.values[i];
      }
      newValues.set(track.values, valueSize);

      track.times = newTimes;
      track.values = newValues;
    }

    clip.resetDuration();
  }

  async function loadMixamoClipWithFallback(loader, clipName) {
    let lastErr = null;
    for (const basePath of MIXAMO_CLIP_PATHS) {
      try {
        const fbx = await loader.loadAsync(`${basePath}/${clipName}.fbx`);
        const srcClip = fbx.animations?.[0];
        if (!srcClip) return null;
        const clip = makeInPlaceClip(srcClip);
        clip.name = clipName;
        return clip;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) {
      console.warn(`[horde] failed to load animation ${clipName}`, lastErr);
    }
    return null;
  }

  async function loadMixamoClips() {
    if (mixamoLoadPromise) return mixamoLoadPromise;

    const loader = new FBXLoader();
    mixamoLoadPromise = Promise.all(MIXAMO_FILES.map(async (name) => {
      const clip = await loadMixamoClipWithFallback(loader, name);
      if (clip) mixamoClips.set(name, clip);
    })).then(() => {
      mixamoLoaded = mixamoClips.size > 0;
    });

    return mixamoLoadPromise;
  }

  function playMixamoClip(actor, clipName, {
    loop = THREE.LoopRepeat,
    repetitions = Infinity,
    clampWhenFinished = false,
    timeScale = 1,
    fadeDuration = 0.2,
    forceRestart = false,
  } = {}) {
    if (!actor?.mixer) return;
    const clip = mixamoClips.get(clipName);
    if (!clip) return;
    const isFirstMixamoBind = !actor.currentAction;

    if (!forceRestart && actor.currentClipName === clipName && actor.currentAction) {
      actor.currentAction.setLoop(loop, repetitions);
      actor.currentAction.clampWhenFinished = clampWhenFinished;
      actor.currentAction.timeScale = timeScale;
      return;
    }

    // The base GLB idle action is already playing on new spawns.
    // Clear it once before we start tracked mixamo transitions.
    if (isFirstMixamoBind) {
      actor.mixer.stopAllAction();
    }

    const nextAction = actor.mixer.clipAction(clip);
    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setLoop(loop, repetitions);
    nextAction.clampWhenFinished = clampWhenFinished;
    nextAction.reset();
    const startOffset = Math.min(0.02, Math.max(0, clip.duration - 0.001));
    if (startOffset > 0) nextAction.time = startOffset;
    nextAction.play();

    const prevAction = actor.currentAction;
    if (prevAction && prevAction !== nextAction) {
      if (fadeDuration > 0) {
        nextAction.crossFadeFrom(prevAction, fadeDuration, false);
      } else {
        prevAction.stop();
      }
    }

    actor.currentAction = nextAction;
    actor.currentClipName = clipName;
    actor.mixer.update(0);
  }

  function playEnemyMoveClip(enemy) {
    if (!enemy?.moveSet) return;
    playMixamoClip(enemy, enemy.moveSet.moveClip, {
      loop: THREE.LoopRepeat,
      repetitions: Infinity,
      clampWhenFinished: false,
      timeScale: enemy.moveSet.moveClipTimeScale,
      fadeDuration: 0.2,
    });
  }

  function resolvePlayableMoveSet(preferred = null) {
    if (!mixamoLoaded) return preferred || pickWeighted(ENEMY_MOVESETS);
    if (preferred && mixamoClips.has(preferred.moveClip)) return preferred;

    const available = ENEMY_MOVESETS.filter((set) => mixamoClips.has(set.moveClip));
    if (!available.length) return preferred || pickWeighted(ENEMY_MOVESETS);
    return pickWeighted(available);
  }

  function pickPauseClipForMoveSet(moveSet) {
    if (!moveSet?.pauseClips?.length) return null;
    if (!mixamoLoaded) return pick(moveSet.pauseClips);

    const available = moveSet.pauseClips.filter((clipName) => mixamoClips.has(clipName));
    if (!available.length) return null;
    return pick(available);
  }

  function playEnemyPauseClip(enemy) {
    if (!enemy?.pauseClipName) return;
    const clip = mixamoClips.get(enemy.pauseClipName);
    if (!clip) return;
    playMixamoClip(enemy, enemy.pauseClipName, {
      loop: THREE.LoopOnce,
      repetitions: 1,
      clampWhenFinished: true,
      timeScale: enemy.pauseClipTimeScale || 1,
      fadeDuration: 0.14,
    });
    if (clip.duration > 0.0001) {
      const duration = clip.duration / (enemy.pauseClipTimeScale || 1);
      enemy.pauseTimer = Math.max(enemy.pauseTimer, duration + 0.05);
    }
  }

  function resolvePlayerIdleClip() {
    if (!mixamoLoaded) return player?.desiredClipName || PLAYER_IDLE_CLIP_PREFERENCES[0];
    for (const clipName of PLAYER_IDLE_CLIP_PREFERENCES) {
      if (mixamoClips.has(clipName)) return clipName;
    }
    return player?.desiredClipName || PLAYER_IDLE_CLIP_PREFERENCES[PLAYER_IDLE_CLIP_PREFERENCES.length - 1];
  }

  function playPlayerIdleClip(fadeDuration = 0.18) {
    if (!player) return;
    const idleClip = resolvePlayerIdleClip();
    player.desiredClipName = idleClip;
    if (!mixamoLoaded) return;
    playMixamoClip(player, idleClip, {
      loop: THREE.LoopRepeat,
      repetitions: Infinity,
      clampWhenFinished: false,
      timeScale: 1,
      fadeDuration,
    });
  }

  function applyLoadedAnimationsToActiveActors() {
    if (!active || !mixamoLoaded) return;

    if (player) {
      playPlayerIdleClip(0.08);
    }
    for (const enemy of enemies) {
      const nextMoveSet = resolvePlayableMoveSet(enemy.moveSet);
      if (nextMoveSet !== enemy.moveSet) {
        enemy.moveSet = nextMoveSet;
        enemy.speed = enemy.baseSpeed * nextMoveSet.speedMultiplier;
        enemy.pauseCooldown = nextEnemyPauseCooldown(nextMoveSet);
      }
      if (enemy.state === 'pausing' && enemy.pauseClipName) {
        playEnemyPauseClip(enemy);
      } else {
        playEnemyMoveClip(enemy);
      }
    }
  }

  function removeProjectile(index) {
    const projectile = projectiles[index];
    if (!projectile) return;
    scene.remove(projectile.mesh);
    projectile.mesh.geometry.dispose();
    projectile.mesh.material.dispose();
    projectiles.splice(index, 1);
  }

  function cleanupProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) removeProjectile(i);
  }

  function removeExplosionFx(index) {
    const fx = explosionFx[index];
    if (!fx) return;
    scene.remove(fx.group);
    disposeObjectTree(fx.group);
    explosionFx.splice(index, 1);
  }

  function cleanupExplosionFx() {
    for (let i = explosionFx.length - 1; i >= 0; i--) removeExplosionFx(i);
  }

  function spawnExplosionFx(origin, radius = 4) {
    const group = new THREE.Group();

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.3, radius * 0.26), 18, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffc67a,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    flash.position.set(origin.x, TUNING.groundY + 0.36, origin.z);
    group.add(flash);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.2, radius * 0.24), Math.max(0.35, radius * 0.48), 36),
      new THREE.MeshBasicMaterial({
        color: 0xff8a42,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(origin.x, TUNING.groundY + 0.06, origin.z);
    group.add(ring);

    scene.add(group);
    explosionFx.push({
      group,
      flash,
      ring,
      ttl: 0.28,
      duration: 0.28,
    });
  }

  function removeEnemy(enemy, index, { stopMixer = true } = {}) {
    enemyColliderHandles.delete(enemy.colliderHandle);
    if (enemy.body) world.removeRigidBody(enemy.body);
    if (stopMixer && enemy.mixer) enemy.mixer.stopAllAction();
    enemies.splice(index, 1);
  }

  function cleanupEnemies(removeScene = true) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemyColliderHandles.delete(enemy.colliderHandle);
      if (enemy.body) world.removeRigidBody(enemy.body);
      if (enemy.mixer) enemy.mixer.stopAllAction();
      if (removeScene) scene.remove(enemy.scene);
      enemies.splice(i, 1);
    }
  }

  function cleanupRagdolls() {
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      destroyRagdoll(ragdolls[i].mfer);
      ragdolls.pop();
    }
  }

  function syncRagdollVisuals(mfer) {
    syncRagdollBones(mfer);

    for (const d of mfer.debugMeshes) {
      const body = mfer.ragdollBodies[d.segName];
      if (!body) continue;
      const p = body.translation();
      const r = body.rotation();
      d.mesh.position.set(p.x, p.y, p.z);
      d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    if (!mfer.detachedPieces) return;
    for (const piece of mfer.detachedPieces) {
      const p = piece.body.translation();
      const r = piece.body.rotation();
      piece.mesh.position.set(p.x, p.y, p.z);
      piece.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  function updateRagdolls(delta) {
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      const entry = ragdolls[i];
      entry.ttl -= delta;
      syncRagdollVisuals(entry.mfer);
      if (entry.ttl <= 0) {
        destroyRagdoll(entry.mfer);
        ragdolls.splice(i, 1);
      }
    }

    while (ragdolls.length > TUNING.maxRagdolls) {
      const oldest = ragdolls.shift();
      destroyRagdoll(oldest.mfer);
    }
  }

  function updateExplosionFx(delta) {
    for (let i = explosionFx.length - 1; i >= 0; i--) {
      const fx = explosionFx[i];
      fx.ttl -= delta;
      const age = 1 - clamp(fx.ttl / fx.duration, 0, 1);

      const flashScale = 1 + age * 2.1;
      fx.flash.scale.setScalar(flashScale);
      fx.flash.material.opacity = (1 - age) * 0.62;

      const ringScale = 1 + age * 1.8;
      fx.ring.scale.setScalar(ringScale);
      fx.ring.material.opacity = (1 - age) * 0.82;

      if (fx.ttl <= 0) removeExplosionFx(i);
    }
  }

  function setHud() {
    if (!scoreEl || !timeEl) return;
    const weapon = weaponById(currentWeaponId);
    scoreEl.textContent = `kills: ${kills}`;
    timeEl.textContent = `time: ${elapsed.toFixed(1)}s · ${weapon.label}`;
  }

  function syncWeaponDebugUi() {
    if (weaponDebugToggleEl && weaponDebugToggleEl.checked !== weaponDebugMode) {
      weaponDebugToggleEl.checked = weaponDebugMode;
    }
    if (weaponDebugPanelEl) {
      weaponDebugPanelEl.classList.toggle('is-open', weaponDebugMode);
    }
    for (const btn of weaponDebugButtons) {
      btn.classList.toggle('is-active', btn.dataset.hordeWeapon === currentWeaponId);
    }
  }

  function setWeapon(weaponId, { playFx = true } = {}) {
    const nextWeapon = weaponById(weaponId);
    if (nextWeapon.id === currentWeaponId) {
      syncWeaponDebugUi();
      return;
    }
    currentWeaponId = nextWeapon.id;
    fireCooldown = 0;
    pointerDown = false;
    syncWeaponDebugUi();
    setHud();
    if (playFx) {
      playImpact(9.5);
      playPop();
    }
  }

  function setWeaponDebugMode(enabled) {
    weaponDebugMode = !!enabled;
    if (!weaponDebugMode) {
      if (kills < KILLS_PER_WEAPON_SWITCH) {
        setWeapon('sidearm', { playFx: false });
      } else if (currentWeaponId === 'sidearm') {
        setWeapon(pickNextRotatingWeapon('sidearm'), { playFx: false });
      }
      nextWeaponSwitchAt = (Math.floor(kills / KILLS_PER_WEAPON_SWITCH) + 1) * KILLS_PER_WEAPON_SWITCH;
      maybeRotateWeaponByKills();
    }
    syncWeaponDebugUi();
    setHud();
  }

  function maybeRotateWeaponByKills() {
    if (weaponDebugMode) return;
    let switched = false;
    while (kills >= nextWeaponSwitchAt) {
      setWeapon(pickNextRotatingWeapon(currentWeaponId), { playFx: false });
      nextWeaponSwitchAt += KILLS_PER_WEAPON_SWITCH;
      switched = true;
    }
    if (switched) {
      fireCooldown = 0;
      pointerDown = false;
      playImpact(11);
      playPop();
    }
  }

  function setGameOverUi(visible) {
    if (gameOverEl) gameOverEl.classList.toggle('is-visible', visible);
    if (visible && finalEl) {
      finalEl.textContent = `${kills} kills in ${elapsed.toFixed(1)}s`;
    }
  }

  function syncCameraPresetUi() {
    for (const btn of cameraPresetButtons) {
      btn.classList.toggle('is-active', btn.dataset.hordeCam === selectedCameraPreset);
    }
  }

  function applyCameraPreset(presetName) {
    const preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.current;
    selectedCameraPreset = CAMERA_PRESETS[presetName] ? presetName : 'current';
    camera.position.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    camera.lookAt(preset.lookAt[0], preset.lookAt[1], preset.lookAt[2]);
    syncCameraPresetUi();
    updateCameraReadout();
  }

  function setSettingsOpen(open) {
    isSettingsOpen = open;
    if (!settingsPanelEl) return;
    settingsPanelEl.classList.toggle('is-open', open);
  }

  function setDebugMode(enabled) {
    hordeCameraDebugMode = !!enabled;
    if (debugToggleEl && debugToggleEl.checked !== hordeCameraDebugMode) {
      debugToggleEl.checked = hordeCameraDebugMode;
    }
    if (cameraDebugEl) cameraDebugEl.style.display = active && hordeCameraDebugMode ? 'block' : 'none';
    if (!hordeCameraDebugMode) {
      cameraKeysDown.clear();
    } else {
      updateCameraReadout();
    }
  }

  function resetCamera() {
    applyCameraPreset(selectedCameraPreset);
  }

  function fmt(v) {
    return Number(v).toFixed(2);
  }

  function updateCameraReadout() {
    if (!cameraReadoutEl || !hordeCameraDebugMode) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const lookAt = camera.position.clone().addScaledVector(dir, CAMERA_CONTROLS.lookDistance);
    cameraReadoutEl.textContent = `pos: [${fmt(camera.position.x)}, ${fmt(camera.position.y)}, ${fmt(camera.position.z)}]\nlookAt: [${fmt(lookAt.x)}, ${fmt(lookAt.y)}, ${fmt(lookAt.z)}]`;
  }

  function onCameraKeyDown(e) {
    if (!active || !hordeCameraDebugMode) return;
    const key = e.key.toLowerCase();
    if (!['w', 'a', 's', 'd', 'q', 'e', 'z', 'x', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) return;
    cameraKeysDown.add(key);
    e.preventDefault();
  }

  function onCameraKeyUp(e) {
    if (!hordeCameraDebugMode) return;
    const key = e.key.toLowerCase();
    cameraKeysDown.delete(key);
  }

  function applyCameraKeyboard(dt) {
    if (!hordeCameraDebugMode) return;
    if (!cameraKeysDown.size) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.000001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const moveStep = CAMERA_CONTROLS.moveSpeed * dt;
    const upStep = CAMERA_CONTROLS.verticalSpeed * dt;
    const yawStep = CAMERA_CONTROLS.yawSpeed * dt;
    const pitchStep = CAMERA_CONTROLS.pitchSpeed * dt;

    if (cameraKeysDown.has('w')) camera.position.addScaledVector(forward, moveStep);
    if (cameraKeysDown.has('s')) camera.position.addScaledVector(forward, -moveStep);
    if (cameraKeysDown.has('a')) camera.position.addScaledVector(right, -moveStep);
    if (cameraKeysDown.has('d')) camera.position.addScaledVector(right, moveStep);
    if (cameraKeysDown.has('z')) camera.position.y -= upStep;
    if (cameraKeysDown.has('x')) camera.position.y += upStep;
    if (cameraKeysDown.has('q')) camera.rotateY(yawStep);
    if (cameraKeysDown.has('e')) camera.rotateY(-yawStep);
    if (cameraKeysDown.has('arrowleft')) camera.rotateY(yawStep);
    if (cameraKeysDown.has('arrowright')) camera.rotateY(-yawStep);
    if (cameraKeysDown.has('arrowup')) camera.rotateX(-pitchStep);
    if (cameraKeysDown.has('arrowdown')) camera.rotateX(pitchStep);

    updateCameraReadout();
  }

  function applyHordeSceneLighting() {
    sceneLookState.background = scene.background;
    sceneLookState.fog = scene.fog;
    sceneLookState.toneExposure = renderer.toneMappingExposure;
    sceneLookState.adjustedLights = [];

    scene.traverse((obj) => {
      if (!obj.isLight) return;
      sceneLookState.adjustedLights.push({ light: obj, intensity: obj.intensity });
      obj.intensity *= HORDE_SCENE_LOOK.inheritedLightScale;
    });

    scene.background = new THREE.Color(HORDE_SCENE_LOOK.background);
    scene.fog = new THREE.FogExp2(HORDE_SCENE_LOOK.fogColor, HORDE_SCENE_LOOK.fogDensity);
    renderer.toneMappingExposure = HORDE_SCENE_LOOK.toneExposure;

    hordeLightRig = new THREE.Group();

    const ambient = new THREE.AmbientLight(0x3c4f76, 0.64);
    hordeLightRig.add(ambient);

    const hemi = new THREE.HemisphereLight(0x6c87bf, 0x0d111b, 0.9);
    hordeLightRig.add(hemi);

    const moonKey = new THREE.DirectionalLight(0xc8d6ff, 2.75);
    moonKey.position.set(-14, 22, -10);
    moonKey.castShadow = true;
    moonKey.shadow.mapSize.set(2048, 2048);
    moonKey.shadow.camera.near = 0.5;
    moonKey.shadow.camera.far = 62;
    moonKey.shadow.camera.left = -28;
    moonKey.shadow.camera.right = 28;
    moonKey.shadow.camera.top = 28;
    moonKey.shadow.camera.bottom = -14;
    moonKey.shadow.bias = -0.00045;
    moonKey.shadow.normalBias = 0.02;
    moonKey.target.position.set(0, 0.4, 0);
    hordeLightRig.add(moonKey);
    hordeLightRig.add(moonKey.target);

    const rim = new THREE.DirectionalLight(0x9db5ea, 1.14);
    rim.position.set(12, 6.5, 13);
    hordeLightRig.add(rim);

    const altarGlow = new THREE.PointLight(0x97acd9, 1.08, 30, 2);
    altarGlow.position.set(TUNING.playerPos.x + 1.6, TUNING.groundY + 1.75, TUNING.playerPos.z - 0.4);
    hordeLightRig.add(altarGlow);

    scene.add(hordeLightRig);
  }

  function restoreSceneLighting() {
    if (hordeLightRig) {
      scene.remove(hordeLightRig);
      hordeLightRig = null;
    }

    for (const entry of sceneLookState.adjustedLights) {
      if (!entry?.light) continue;
      entry.light.intensity = entry.intensity;
    }
    sceneLookState.adjustedLights = [];

    scene.background = sceneLookState.background;
    scene.fog = sceneLookState.fog;
    renderer.toneMappingExposure = sceneLookState.toneExposure;
  }

  function disposeObjectTree(root) {
    if (!root) return;
    const geometries = new Set();
    const materials = new Set();
    root.traverse((child) => {
      if (child.geometry) geometries.add(child.geometry);
      if (!child.material) return;
      if (Array.isArray(child.material)) {
        for (const mat of child.material) materials.add(mat);
      } else {
        materials.add(child.material);
      }
    });
    for (const geo of geometries) geo.dispose();
    for (const mat of materials) mat.dispose();
  }

  function setupArena() {
    applyHordeSceneLighting();
    floorVisual = makeFloorMesh();
    scene.add(floorVisual);

    floorBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, TUNING.groundY - TUNING.floorThickness, 0)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(TUNING.arenaHalfX, TUNING.floorThickness, TUNING.arenaHalfZ).setFriction(1),
      floorBody
    );

    platformBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(TUNING.playerPos.x, TUNING.groundY + TUNING.platformHalfExtents.y, TUNING.playerPos.z)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        TUNING.platformHalfExtents.x,
        TUNING.platformHalfExtents.y,
        TUNING.platformHalfExtents.z
      ).setFriction(1.1),
      platformBody
    );

    playerHurtBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(TUNING.playerPos.x, TUNING.playerHurtY, TUNING.playerPos.z)
    );
    const playerHurtCollider = world.createCollider(
      RAPIER.ColliderDesc.ball(TUNING.playerHurtRadius)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      playerHurtBody
    );
    playerHurtHandle = playerHurtCollider.handle;
  }

  function cleanupArena() {
    if (floorVisual) {
      disposeObjectTree(floorVisual);
      scene.remove(floorVisual);
      floorVisual = null;
    }

    if (playerHurtBody) {
      world.removeRigidBody(playerHurtBody);
      playerHurtBody = null;
      playerHurtHandle = null;
    }
    if (platformBody) {
      world.removeRigidBody(platformBody);
      platformBody = null;
    }
    if (floorBody) {
      world.removeRigidBody(floorBody);
      floorBody = null;
    }

    restoreSceneLighting();
  }

  function spawnPlayer() {
    player = spawnIdleMfer({
      x: TUNING.playerPos.x,
      y: TUNING.playerPos.y,
      z: TUNING.playerPos.z,
    }, {
      y: Math.atan2(TUNING.playerFacing.x, TUNING.playerFacing.z),
    });
    if (!player) return;
    applyHordeEyeOverride(player.scene);
    player.desiredClipName = resolvePlayerIdleClip();
    if (mixamoLoaded) playPlayerIdleClip(0);
  }

  function cleanupPlayer() {
    if (!player) return;
    if (player.mixer) player.mixer.stopAllAction();
    scene.remove(player.scene);
    player = null;
  }

  function spawnEnemy() {
    if (enemies.length >= TUNING.enemyMax) return;

    const spawnPos = randomSpawnPoint();
    const enemyPm = spawnIdleMfer(spawnPos);
    if (!enemyPm) return;
    applyHordeEyeOverride(enemyPm.scene);

    const moveSet = resolvePlayableMoveSet();
    const baseSpeed = TUNING.enemyBaseSpeed + elapsed * TUNING.enemySpeedRamp + Math.random() * 0.7;
    const speed = baseSpeed * moveSet.speedMultiplier;
    enemyPm.scene.rotation.y = Math.atan2(TUNING.playerPos.x - spawnPos.x, TUNING.playerPos.z - spawnPos.z);
    enemyPm.desiredClipName = moveSet.moveClip;
    if (mixamoLoaded) {
      playMixamoClip(enemyPm, moveSet.moveClip, {
        loop: THREE.LoopRepeat,
        repetitions: Infinity,
        clampWhenFinished: false,
        timeScale: moveSet.moveClipTimeScale,
      });
    }

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawnPos.x, TUNING.playerHurtY, spawnPos.z)
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.ball(TUNING.enemyRadius)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );

    enemies.push({
      scene: enemyPm.scene,
      mixer: enemyPm.mixer,
      desiredClipName: moveSet.moveClip,
      moveSet,
      state: 'moving',
      pauseTimer: 0,
      pauseCooldown: nextEnemyPauseCooldown(moveSet),
      pauseClipName: null,
      pauseClipTimeScale: 1,
      body,
      colliderHandle: collider.handle,
      pos: spawnPos,
      baseSpeed,
      speed,
    });
    enemyColliderHandles.add(collider.handle);
  }

  function killEnemy(enemy, index, shotDir, { silent = false } = {}) {
    // Keep the current animated bone pose intact when converting to ragdoll.
    // Stopping the mixer before createRagdoll can snap briefly toward bind pose.
    removeEnemy(enemy, index, { stopMixer: false });
    enemy.scene.updateMatrixWorld(true);

    const mfer = createRagdoll(enemy.scene);
    if (mfer) {
      mfer.ragdollActive = true;
      mfer.canDetach = false;

      const push = new THREE.Vector3(shotDir.x, 0.15, shotDir.z).normalize();
      for (const body of Object.values(mfer.ragdollBodies)) {
        body.setLinvel({
          x: push.x * 11 + (Math.random() - 0.5) * 1.4,
          y: 3 + Math.random() * 2,
          z: push.z * 11 + (Math.random() - 0.5) * 1.4,
        }, true);
        body.setAngvel({
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 6,
          z: (Math.random() - 0.5) * 8,
        }, true);
      }

      detachAccessories(mfer);
      ragdolls.push({ mfer, ttl: TUNING.ragdollLifetime });
    } else {
      scene.remove(enemy.scene);
    }

    kills += 1;
    maybeRotateWeaponByKills();
    if (!silent) {
      playImpact(10);
      playPop();
    }
  }

  function blastRagdoll(mfer, origin, strength = 16) {
    if (!mfer?.ragdollBodies) return;
    for (const body of Object.values(mfer.ragdollBodies)) {
      const p = body.translation();
      const dir = new THREE.Vector3(p.x - origin.x, 0.2 + Math.random() * 0.5, p.z - origin.z);
      if (dir.lengthSq() < 0.001) {
        dir.set(Math.random() - 0.5, 0.7, Math.random() - 0.5);
      }
      dir.normalize();
      body.setLinvel({
        x: dir.x * strength + (Math.random() - 0.5) * 3.5,
        y: 4.5 + Math.random() * 4.5,
        z: dir.z * strength + (Math.random() - 0.5) * 3.5,
      }, true);
      body.setAngvel({
        x: (Math.random() - 0.5) * 12,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 12,
      }, true);
    }
  }

  function explodeEveryoneOnGameOver() {
    const origin = new THREE.Vector3(TUNING.playerPos.x, TUNING.playerHurtY, TUNING.playerPos.z);

    // Convert player to ragdoll and blast outward.
    if (player?.scene) {
      player.scene.updateMatrixWorld(true);
      const playerRagdoll = createRagdoll(player.scene);
      if (playerRagdoll) {
        playerRagdoll.ragdollActive = true;
        playerRagdoll.canDetach = false;
        detachAccessories(playerRagdoll);
        blastRagdoll(playerRagdoll, origin, 18);
        ragdolls.push({ mfer: playerRagdoll, ttl: TUNING.ragdollLifetime });
      }
      cleanupPlayer();
    }

    // Convert all active enemies to ragdolls and blast outward.
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      removeEnemy(enemy, i, { stopMixer: false });
      enemy.scene.updateMatrixWorld(true);
      const enemyRagdoll = createRagdoll(enemy.scene);
      if (!enemyRagdoll) {
        scene.remove(enemy.scene);
        continue;
      }
      enemyRagdoll.ragdollActive = true;
      enemyRagdoll.canDetach = false;
      detachAccessories(enemyRagdoll);
      blastRagdoll(enemyRagdoll, origin, 15);
      ragdolls.push({ mfer: enemyRagdoll, ttl: TUNING.ragdollLifetime });
    }

    playImpact(14);
    playPop();
  }

  function spawnProjectile({
    pos,
    velocity,
    ttl,
    radius,
    pierce = false,
    gravity = 0,
    type = 'bullet',
    explosionRadius = 0,
    explosionStrength = 0,
  }) {
    if (projectiles.length >= TUNING.bulletMax) removeProjectile(0);

    const mesh = type === 'grenade'
      ? makeGrenadeMesh(radius)
      : makeBulletMesh({ radius });
    mesh.position.copy(pos);
    scene.add(mesh);

    projectiles.push({
      type,
      mesh,
      pos: pos.clone(),
      vel: velocity.clone(),
      ttl,
      radius,
      pierce,
      gravity,
      explosionRadius,
      explosionStrength,
    });
  }

  function explodeAt(origin, radius = 4, strength = 18) {
    const radiusSq = radius * radius;
    let hits = 0;
    spawnExplosionFx(origin, radius);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const dx = enemy.pos.x - origin.x;
      const dz = enemy.pos.z - origin.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > radiusSq) continue;

      const shotDir = new THREE.Vector3(dx, 0.2, dz);
      if (shotDir.lengthSq() < 0.0001) {
        shotDir.set(Math.random() - 0.5, 0.3, Math.random() - 0.5);
      }
      shotDir.normalize();

      killEnemy(enemy, i, shotDir, { silent: true });
      hits += 1;
    }

    for (const ragdoll of ragdolls) {
      const hipsBody = ragdoll.mfer?.ragdollBodies?.Hips;
      if (!hipsBody) continue;
      const p = hipsBody.translation();
      const dx = p.x - origin.x;
      const dz = p.z - origin.z;
      if ((dx * dx + dz * dz) > radiusSq * 1.4) continue;
      blastRagdoll(ragdoll.mfer, origin, strength * 0.9);
    }

    playImpact(Math.min(18, 12 + hits * 0.4));
    playPop();
  }

  function detonateProjectile(projectile, index) {
    explodeAt(projectile.pos, projectile.explosionRadius || 4, projectile.explosionStrength || 18);
    removeProjectile(index);
  }

  function getAimData(clientX, clientY) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hitPoint = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return null;

    const muzzle = TUNING.playerPos.clone().add(TUNING.muzzleOffset);
    const direction = hitPoint.clone().sub(muzzle);
    direction.y = 0;
    if (direction.lengthSq() < 0.0001) return null;
    direction.normalize();

    return { muzzle, direction, hitPoint };
  }

  function shootAt(clientX, clientY, { isAuto = false } = {}) {
    if (!active || isGameOver || !player) return false;

    const weapon = weaponById(currentWeaponId);
    if (isAuto && !weapon.allowHold) return false;
    if (fireCooldown > 0) return false;

    const aim = getAimData(clientX, clientY);
    if (!aim) return false;

    const { muzzle, direction, hitPoint } = aim;
    if (player.scene) {
      player.scene.rotation.y = Math.atan2(direction.x, direction.z);
    }

    if (weapon.mode === 'single') {
      const shotDir = weapon.spread
        ? rotateDirection(direction, THREE.MathUtils.randFloatSpread(weapon.spread))
        : direction.clone();
      spawnProjectile({
        pos: muzzle,
        velocity: shotDir.multiplyScalar(weapon.speed),
        ttl: weapon.lifetime,
        radius: weapon.radius,
        pierce: !!weapon.pierce,
      });
      playGunshot();
    } else if (weapon.mode === 'shotgun') {
      for (let i = 0; i < weapon.pellets; i++) {
        const spreadYaw = THREE.MathUtils.randFloatSpread(weapon.spread);
        const shotDir = rotateDirection(direction, spreadYaw);
        const speed = weapon.speed * THREE.MathUtils.randFloat(0.84, 1.16);
        spawnProjectile({
          pos: muzzle,
          velocity: shotDir.multiplyScalar(speed),
          ttl: weapon.lifetime * THREE.MathUtils.randFloat(0.82, 1.08),
          radius: weapon.radius,
        });
      }
      playGunshot();
    } else if (weapon.mode === 'tri') {
      const angles = [-weapon.spread, 0, weapon.spread];
      for (const angle of angles) {
        const shotDir = rotateDirection(direction, angle);
        spawnProjectile({
          pos: muzzle,
          velocity: shotDir.multiplyScalar(weapon.speed),
          ttl: weapon.lifetime,
          radius: weapon.radius,
        });
      }
      playGunshot();
    } else if (weapon.mode === 'grenade') {
      const launchPos = muzzle.clone().add(new THREE.Vector3(0, 0.05, 0));
      const targetPos = hitPoint.clone();
      targetPos.y = TUNING.groundY + weapon.radius * 0.6;
      const deltaToTarget = targetPos.clone().sub(launchPos);
      const horizontalDistance = Math.hypot(deltaToTarget.x, deltaToTarget.z);
      const flightTime = clamp(
        horizontalDistance / weapon.horizontalSpeed,
        weapon.flightTimeMin,
        weapon.flightTimeMax
      );
      const launchVelocity = new THREE.Vector3(
        deltaToTarget.x / flightTime,
        (deltaToTarget.y + 0.5 * weapon.gravity * flightTime * flightTime) / flightTime,
        deltaToTarget.z / flightTime
      );
      spawnProjectile({
        pos: launchPos,
        velocity: launchVelocity,
        ttl: Math.min(weapon.lifetime, flightTime + 0.12),
        radius: weapon.radius,
        gravity: weapon.gravity,
        type: 'grenade',
        explosionRadius: weapon.explosionRadius,
        explosionStrength: weapon.explosionStrength,
      });
      playImpact(9);
    }

    fireCooldown = weapon.fireInterval;
    return true;
  }

  function updateWeaponFiring(delta) {
    fireCooldown = Math.max(0, fireCooldown - delta);
    const weapon = weaponById(currentWeaponId);
    if (!pointerDown || !weapon.allowHold || isGameOver) return;
    while (fireCooldown <= 0) {
      if (!shootAt(pointerClientX, pointerClientY, { isAuto: true })) break;
    }
  }

  function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      const prevPos = projectile.pos.clone();
      projectile.ttl -= delta;
      if (projectile.gravity > 0) {
        projectile.vel.y -= projectile.gravity * delta;
      }
      projectile.pos.addScaledVector(projectile.vel, delta);
      projectile.mesh.position.copy(projectile.pos);

      const oob =
        projectile.pos.x < -TUNING.arenaHalfX - 3 || projectile.pos.x > TUNING.arenaHalfX + 3 ||
        projectile.pos.z < -TUNING.arenaHalfZ - 3 || projectile.pos.z > TUNING.arenaHalfZ + 3 ||
        projectile.pos.y < TUNING.groundY - 1.4 || projectile.pos.y > TUNING.groundY + 22;

      if (oob) {
        removeProjectile(i);
        continue;
      }

      if (projectile.type === 'grenade' && projectile.pos.y <= TUNING.groundY + projectile.radius * 0.7) {
        detonateProjectile(projectile, i);
        continue;
      }

      // Regular bullets should travel until they hit something or leave the arena.
      // Keep TTL only for grenade safety detonation behavior.
      if (projectile.type === 'grenade' && projectile.ttl <= 0) {
        detonateProjectile(projectile, i);
        continue;
      }

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const hitRadius = TUNING.enemyRadius + projectile.radius;
        const enemyPoint = new THREE.Vector3(enemy.pos.x, TUNING.playerHurtY, enemy.pos.z);
        const distSq = distanceSqPointToSegment(enemyPoint, prevPos, projectile.pos);
        if (distSq > hitRadius * hitRadius) continue;

        if (projectile.type === 'grenade') {
          detonateProjectile(projectile, i);
          break;
        } else {
          const shotDir = projectile.vel.lengthSq() > 0.0001
            ? projectile.vel.clone().setY(0).normalize()
            : new THREE.Vector3(0, 0, -1);
          killEnemy(enemy, j, shotDir);
          if (!projectile.pierce) {
            removeProjectile(i);
            break;
          }
        }
      }
    }
  }

  function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.mixer) enemy.mixer.update(delta * ENEMY_MIXER_TIME_SCALE);

      const dx = TUNING.playerPos.x - enemy.pos.x;
      const dz = TUNING.playerPos.z - enemy.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.0001) continue;

      enemy.scene.rotation.y = Math.atan2(dx, dz);

      if (enemy.state === 'pausing') {
        enemy.pauseTimer -= delta;
        enemy.body.setNextKinematicTranslation({ x: enemy.pos.x, y: TUNING.playerHurtY, z: enemy.pos.z });

        if (enemy.pauseTimer <= 0) {
          enemy.state = 'moving';
          enemy.pauseClipName = null;
          enemy.pauseCooldown = nextEnemyPauseCooldown(enemy.moveSet);
          if (mixamoLoaded) playEnemyMoveClip(enemy);
        }
      } else {
        enemy.pauseCooldown -= delta;
        if (
          enemy.pauseCooldown <= 0 &&
          dist > ENEMY_PAUSE_MIN_DISTANCE &&
          Math.random() < enemy.moveSet.pauseChance * ENEMY_PAUSE_CHANCE_SCALE
        ) {
          const pauseClipName = pickPauseClipForMoveSet(enemy.moveSet);
          if (!pauseClipName) {
            enemy.pauseCooldown = nextEnemyPauseCooldown(enemy.moveSet);
          } else {
            enemy.state = 'pausing';
            enemy.pauseTimer = randomRange(enemy.moveSet.pauseDurationMin, enemy.moveSet.pauseDurationMax);
            enemy.pauseClipName = pauseClipName;
            enemy.pauseClipTimeScale = randomRange(0.92, 1.08);
            enemy.pauseCooldown = nextEnemyPauseCooldown(enemy.moveSet);
            if (mixamoLoaded) playEnemyPauseClip(enemy);
            enemy.body.setNextKinematicTranslation({ x: enemy.pos.x, y: TUNING.playerHurtY, z: enemy.pos.z });
            continue;
          }
        }

        const step = Math.min(dist, enemy.speed * delta);
        const nx = enemy.pos.x + (dx / dist) * step;
        const nz = enemy.pos.z + (dz / dist) * step;
        const moveX = nx - enemy.pos.x;
        const moveZ = nz - enemy.pos.z;

        enemy.pos.x = nx;
        enemy.pos.z = nz;
        enemy.scene.position.x += moveX;
        enemy.scene.position.z += moveZ;
        enemy.body.setNextKinematicTranslation({ x: nx, y: TUNING.playerHurtY, z: nz });
      }

      const playerDx = TUNING.playerPos.x - enemy.pos.x;
      const playerDz = TUNING.playerPos.z - enemy.pos.z;
      if (Math.hypot(playerDx, playerDz) <= TUNING.playerTouchDistance) {
        isGameOver = true;
      }
    }
  }

  function updateSpawning(delta) {
    if (isGameOver) return;

    const interval = clamp(
      TUNING.enemySpawnStart - elapsed * TUNING.enemySpawnAccel,
      TUNING.enemySpawnMin,
      TUNING.enemySpawnStart
    );

    spawnTimer -= delta;
    while (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer += interval;

      // Small pressure bump as time survives increases.
      if (elapsed > 28 && Math.random() < 0.24 && enemies.length < TUNING.enemyMax) {
        spawnEnemy();
      }
    }
  }

  function drainCollisions() {
    eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started || isGameOver || !playerHurtHandle) return;
      if (h1 === playerHurtHandle && enemyColliderHandles.has(h2)) isGameOver = true;
      if (h2 === playerHurtHandle && enemyColliderHandles.has(h1)) isGameOver = true;
    });

    // Keep queue clear from ragdoll force events in this mode.
    eventQueue.drainContactForceEvents(() => {});
  }

  function handleGameOver() {
    if (!gameOverExplosionDone) {
      explodeEveryoneOnGameOver();
      gameOverExplosionDone = true;
    }
    pointerDown = false;
    cleanupProjectiles();
    setGameOverUi(true);
  }

  function resetRun() {
    cleanupEnemies(true);
    cleanupProjectiles();
    cleanupExplosionFx();
    cleanupRagdolls();
    const debugWeapon = currentWeaponId;

    isGameOver = false;
    gameOverExplosionDone = false;
    kills = 0;
    elapsed = 0;
    spawnTimer = 0.85;
    physicsAccum = 0;
    fireCooldown = 0;
    pointerDown = false;
    currentWeaponId = weaponDebugMode ? debugWeapon : 'sidearm';
    nextWeaponSwitchAt = KILLS_PER_WEAPON_SWITCH;

    setGameOverUi(false);
    syncWeaponDebugUi();
    setHud();
  }

  function onPointerDown(e) {
    if (!active) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    pointerDown = true;
    pointerClientX = e.clientX;
    pointerClientY = e.clientY;
    if (e.pointerId != null) {
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore capture errors (for example if pointer left before capture).
      }
    }
    shootAt(pointerClientX, pointerClientY);
  }

  function onPointerMove(e) {
    if (!active) return;
    pointerClientX = e.clientX;
    pointerClientY = e.clientY;
  }

  function onPointerUp(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerDown = false;
    if (e.pointerId != null) {
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch (err) {
        // No-op.
      }
    }
  }

  function onRetry(e) {
    e.stopPropagation();
    resetRun();
  }

  function onContextMenu(e) {
    if (!active) return;
    e.preventDefault();
  }

  function onCameraPresetClick(e) {
    if (!active || !hordeCameraDebugMode) return;
    e.preventDefault();
    e.stopPropagation();
    applyCameraPreset(e.currentTarget.dataset.hordeCam);
  }

  function onSettingsButtonClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    setSettingsOpen(!isSettingsOpen);
  }

  function onDebugToggleChange(e) {
    if (!active) return;
    setDebugMode(e.currentTarget.checked);
  }

  function onWeaponDebugToggleChange(e) {
    if (!active) return;
    setWeaponDebugMode(e.currentTarget.checked);
  }

  function onWeaponDebugButtonClick(e) {
    if (!active || !weaponDebugMode) return;
    e.preventDefault();
    e.stopPropagation();
    const weaponId = e.currentTarget.dataset.hordeWeapon;
    setWeapon(weaponId);
  }

  function onWindowPointerDown(e) {
    if (!active || !isSettingsOpen) return;
    if (settingsPanelEl?.contains(e.target) || settingsBtnEl?.contains(e.target)) return;
    setSettingsOpen(false);
  }

  function enter() {
    if (active) return;
    active = true;

    if (hordeHudEl) hordeHudEl.style.display = '';
    if (settingsBtnEl) settingsBtnEl.style.display = '';
    if (settingsPanelEl) settingsPanelEl.style.display = '';
    setSettingsOpen(false);
    setDebugMode(hordeCameraDebugMode);
    resetCamera();
    setupArena();
    spawnPlayer();
    resetRun();
    loadMixamoClips()
      .then(() => applyLoadedAnimationsToActiveActors())
      .catch((err) => console.warn('[horde] animation preload failed', err));

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onCameraKeyDown);
    window.addEventListener('keyup', onCameraKeyUp);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointerdown', onWindowPointerDown);
    if (settingsBtnEl) settingsBtnEl.addEventListener('click', onSettingsButtonClick);
    if (debugToggleEl) {
      debugToggleEl.checked = hordeCameraDebugMode;
      debugToggleEl.addEventListener('change', onDebugToggleChange);
    }
    if (weaponDebugToggleEl) {
      weaponDebugToggleEl.checked = weaponDebugMode;
      weaponDebugToggleEl.addEventListener('change', onWeaponDebugToggleChange);
    }
    for (const btn of cameraPresetButtons) btn.addEventListener('click', onCameraPresetClick);
    for (const btn of weaponDebugButtons) btn.addEventListener('click', onWeaponDebugButtonClick);
    syncWeaponDebugUi();
    if (retryBtn) retryBtn.addEventListener('click', onRetry);
    if (hordeCameraDebugMode) updateCameraReadout();
  }

  function exit() {
    if (!active) return;
    active = false;
    pointerDown = false;

    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onCameraKeyDown);
    window.removeEventListener('keyup', onCameraKeyUp);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('pointerdown', onWindowPointerDown);
    if (settingsBtnEl) settingsBtnEl.removeEventListener('click', onSettingsButtonClick);
    if (debugToggleEl) debugToggleEl.removeEventListener('change', onDebugToggleChange);
    if (weaponDebugToggleEl) weaponDebugToggleEl.removeEventListener('change', onWeaponDebugToggleChange);
    for (const btn of cameraPresetButtons) btn.removeEventListener('click', onCameraPresetClick);
    for (const btn of weaponDebugButtons) btn.removeEventListener('click', onWeaponDebugButtonClick);
    if (retryBtn) retryBtn.removeEventListener('click', onRetry);
    cameraKeysDown.clear();

    cleanupProjectiles();
    cleanupExplosionFx();
    cleanupEnemies(true);
    cleanupRagdolls();
    cleanupPlayer();
    cleanupArena();

    if (hordeHudEl) hordeHudEl.style.display = 'none';
    if (settingsBtnEl) settingsBtnEl.style.display = 'none';
    if (settingsPanelEl) settingsPanelEl.style.display = 'none';
    setSettingsOpen(false);
    if (cameraDebugEl) cameraDebugEl.style.display = 'none';
    setGameOverUi(false);
  }

  function update(rawDelta) {
    if (!active) return;

    const dt = Math.min(rawDelta, 0.05);
    elapsed += isGameOver ? 0 : dt;
    applyCameraKeyboard(dt);

    updateSpawning(dt);
    updateEnemies(dt);
    updateWeaponFiring(dt);
    updateProjectiles(dt);
    updateExplosionFx(dt);

    const physicsDt = 1 / 60;
    physicsAccum += dt;
    let steps = 0;
    world.timestep = physicsDt;
    while (physicsAccum >= physicsDt && steps < 4) {
      world.step(eventQueue);
      physicsAccum -= physicsDt;
      steps += 1;
    }
    if (physicsAccum > physicsDt * 2) physicsAccum = 0;

    updateRagdolls(dt);
    drainCollisions();

    if (player?.mixer) player.mixer.update(dt * 0.8);

    if (isGameOver) {
      handleGameOver();
    }

    setHud();
  }

  return {
    enter,
    exit,
    update,
    isActive: () => active,
  };
}
