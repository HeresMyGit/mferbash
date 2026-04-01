import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';

const MODEL_URL = 'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb';

// Tunable settings (updated by UI sliders)
const DEFAULTS = { gravity: 15, launchSpeed: 2, spin: 6, bounce: 0.3, damping: 2, dropHeight: 7 };
const settings = { ...DEFAULTS };

// Trait-to-mesh mapping (from avatar-maker TRAIT_MESH_MAPPING)
const TRAIT_MESH_MAPPING = {
  type: {
    plain:    ['type_plain', 'body', 'heres_my_signature'],
    charcoal: ['type_charcoal', 'body', 'heres_my_signature'],
    zombie:   ['type_zombie', 'body', 'heres_my_signature'],
    ape:      ['type_ape', 'body', 'heres_my_signature'],
    alien:    ['type_alien', 'body', 'heres_my_signature'],
    metal:    ['type_metal', 'body_metal', 'heres_my_signature'],
    based:    ['type_based_mfer', 'body_mfercoin', 'heres_my_signature'],
  },
  eyes: {
    regular:       ['eyes_normal'],
    vr:            ['eyes_normal', 'eyes_vr', 'eyes_vr_lense'],
    shades:        ['eyes_normal', 'eyes_glasses', 'eyes_glasses_shades'],
    purple_shades: ['eyes_normal', 'eyes_glasses', 'eyes_glasses_purple'],
    nerd:          ['eyes_normal', 'eyes_glasses', 'eyes_glasses_nerd'],
    trippy:        ['eyes_normal', 'eyes_glasses', 'eyes_glasses_shades_s34n'],
    matrix:        ['eyes_normal', 'eyes_glasses', 'eyes_glasses_shades_matrix'],
    '3d':          ['eyes_normal', 'eyes_glases_3d', 'eyes_glasses_3d_lenses', 'eyes_glases_3d_rim'],
    eye_mask:      ['eyes_normal', 'eyes_eye_mask'],
    eyepatch:      ['eyes_normal', 'eyes_eye_patch'],
    metal:         ['eyes_metal'],
    mfercoin:      ['eyes_mfercoin'],
    red:           ['eyes_red'],
    alien:         ['eyes_alien'],
    zombie:        ['eyes_zombie'],
  },
  mouth: {
    smile: ['mouth_smile'],
    flat:  ['mouth_flat'],
  },
  headphones: {
    white:        ['headphones_white'],
    red:          ['headphones_red'],
    green:        ['headphones_green'],
    pink:         ['headphones_pink'],
    gold:         ['headphones_gold'],
    blue:         ['headphones_blue'],
    black:        ['headphones_black'],
    lined:        ['headphones_lined'],
    black_square: ['headphones_square_black'],
    blue_square:  ['headphones_square_blue'],
    gold_square:  ['headphones_square_gold'],
  },
  hat_over_headphones: {
    cowboy:       ['hat_cowboy_hat'],
    top:          ['hat_tophat', 'hat_tophat_red'],
    pilot:        ['hat_pilot_cap', 'hat_pilot_cap_rims', 'hat_pilot_cap_glasses'],
    hoodie_gray:  ['shirt_hoodie_up_dark_gray', 'shirt_hoodie_dark_gray'],
    hoodie_pink:  ['shirt_hoodie_up_pink', 'shirt_hoodie_pink'],
    hoodie_red:   ['shirt_hoodie_up_red', 'shirt_hoodie_red'],
    hoodie_blue:  ['shirt_hoodie_up_blue', 'shirt_hoodie_blue'],
    hoodie_white: ['shirt_hoodie_up_white', 'shirt_hoodie_white'],
    hoodie_green: ['shirt_hoodie_up_green', 'shirt_hoodie_green'],
    larva_mfer:   ['larmf-lowpoly', 'larmf-lowpoly_1', 'larmf-lowpoly_2', 'larmf-lowpoly_3', 'larmf-lowpoly_4', 'larmf-lowpoly_5', 'larmf-lowpoly_6'],
  },
  hat_under_headphones: {
    bandana_dark_gray:    ['hat_bandana_dark_gray'],
    bandana_red:          ['hat_bandana_red'],
    bandana_blue:         ['hat_bandana_blue'],
    knit_kc:              ['hat_knit_kc'],
    knit_las_vegas:       ['hat_knit_las_vegas'],
    knit_new_york:        ['hat_knit_new_york'],
    knit_san_fran:        ['hat_knit_san_fran'],
    knit_miami:           ['hat_knit_miami'],
    knit_chicago:         ['hat_knit_chicago'],
    knit_atlanta:         ['hat_knit_atlanta'],
    knit_cleveland:       ['hat_knit_cleveland'],
    knit_dallas:          ['hat_knit_dallas'],
    knit_baltimore:       ['hat_knit_baltimore'],
    knit_buffalo:         ['hat_knit_buffalo'],
    knit_pittsburgh:      ['hat_knit_pittsburgh'],
    cap_monochrome:       ['cap_monochrome'],
    cap_based_blue:       ['cap_based_blue'],
    cap_purple:           ['cap_purple'],
    beanie_monochrome:    ['hat_beanie_monochrome'],
    beanie:               ['hat_beanie'],
    headband_blue_green:  ['headband_blue_green'],
    headband_green_white: ['headband_green_white'],
    headband_blue_red:    ['headband_blue_red'],
    headband_pink_white:  ['headband_pink_white'],
    headband_blue_white:  ['headband_blue_white'],
  },
  short_hair: {
    mohawk_purple: ['hair_short_mohawk_purple'],
    mohawk_red:    ['hair_short_mohawk_red'],
    mohawk_pink:   ['hair_short_mohawk_pink'],
    mohawk_black:  ['hair_short_mohawk_black'],
    mohawk_yellow: ['hair_short_mohawk_yellow'],
    mohawk_green:  ['hair_short_mohawk_green'],
    mohawk_blue:   ['hair_short_mohawk_blue'],
    messy_black:   ['hair_short_messy_black'],
    messy_yellow:  ['hair_short_messy_yellow'],
    messy_red:     ['hair_short_messy_red'],
    messy_purple:  ['hair_short_messy_purple'],
    messy_black_ape:   ['hair_short_messy_black_ape'],
    messy_yellow_ape:  ['hair_short_messy_yellow_ape'],
    messy_red_ape:     ['hair_short_messy_red_ape'],
    messy_purple_ape:  ['hair_short_messy_purple_ape'],
  },
  long_hair: {
    long_yellow: ['hair_long_light'],
    long_black:  ['hair_long_dark'],
    long_curly:  ['hair_long_curly'],
  },
  shirt: {
    collared_pink:      ['shirt_collared_pink'],
    collared_green:     ['shirt_collared_green'],
    collared_yellow:    ['shirt_collared_yellow'],
    collared_white:     ['shirt_collared_white'],
    collared_turquoise: ['shirt_collared_turquoise'],
    collared_blue:      ['shirt_collared_blue'],
    hoodie_down_red:    ['shirt_hoodie_down_red', 'shirt_hoodie_red'],
    hoodie_down_pink:   ['shirt_hoodie_down_pink', 'shirt_hoodie_pink'],
    hoodie_down_white:  ['shirt_hoodie_down_white', 'shirt_hoodie_white'],
    hoodie_down_green:  ['shirt_hoodie_down_green', 'shirt_hoodie_green'],
    hoodie_down_gray:   ['shirt_hoodie_down_dark_gray', 'shirt_hoodie_dark_gray'],
    hoodie_down_blue:   ['shirt_hoodie_down_blue', 'shirt_hoodie_blue'],
  },
  watch: {
    sub_blue:          ['watch_sub_blue', 'watch_sub_strap_white'],
    sub_lantern_green: ['watch_sub_lantern_green', 'watch_sub_strap_white'],
    sub_cola:          ['watch_sub_cola_blue_red', 'watch_sub_strap_white'],
    sub_turquoise:     ['watch_sub_turquoise', 'watch_sub_strap_white'],
    sub_bat:           ['watch_sub_bat_blue_black', 'watch_sub_strap_white'],
    sub_black:         ['watch_sub_black', 'watch_sub_strap_white'],
    sub_rose:          ['watch_sub_rose', 'watch_sub_strap_white'],
    sub_red:           ['watch_sub_red', 'watch_sub_strap_gray'],
    oyster_silver:     ['watch_oyster_silver', 'watch_sub_strap_white'],
    oyster_gold:       ['watch_oyster_gold', 'watch_sub_strap_gold'],
    argo_white:        ['watch_argo_white'],
    argo_black:        ['watch_argo_black'],
    timex:             ['watch_timex'],
  },
  chain: {
    silver:  ['chain_silver'],
    gold:    ['chain_gold'],
    onchain: ['chain_onchain'],
  },
  beard: {
    full: ['beard'],
    flat: ['beard_flat'],
  },
  smoke: {
    pipe:       ['smoke_pipe'],
    pipe_brown: ['smoke_pipe_brown'],
    cig_white:  ['smoke_cig_white', 'smoke'],
    cig_black:  ['smoke_cig_black', 'smoke'],
  },
  shoes_and_gloves: {
    green:     ['accessories_christmas_green'],
    graveyard: ['accessories_christmas_graveyard'],
    red:       ['accessories_christmas_red'],
    tree:      ['accessories_christmas_tree'],
    teal:      ['accessories_christmas_teal'],
    turquoise: ['accessories_christmas_turquoise'],
    purple:    ['accessories_christmas_purple'],
    space:     ['accessories_christmas_space'],
    orange:    ['accessories_christmas_orange'],
    blue:      ['accessories_christmas_blue'],
    yellow:    ['accessories_christmas_yellow'],
  },
};

// Eye base mesh per body type (replaces 'eyes_normal' in eye accessory meshes)
const TYPE_EYE_BASE = {
  metal: 'eyes_metal', based: 'eyes_mfercoin', zombie: 'eyes_zombie', alien: 'eyes_alien',
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getRandomType() {
  const r = Math.random() * 100;
  if (r < 30) return 'plain';
  if (r < 60) return 'charcoal';
  if (r < 74) return 'zombie';
  if (r < 86) return 'ape';
  if (r < 96) return 'alien';
  if (r < 98) return 'based';
  return 'metal';
}

function generateRandomTraits() {
  const t = {};

  // Required traits
  t.type = getRandomType();
  t.eyes = pick(['regular', 'vr', 'shades', 'purple_shades', 'nerd', 'trippy', 'matrix', '3d', 'eye_mask', 'eyepatch']);
  t.mouth = pick(['flat', 'smile']);
  t.headphones = pick(Object.keys(TRAIT_MESH_MAPPING.headphones));

  // Optional traits (80% chance, 95% for shoes_and_gloves)
  const optional = ['hat_over_headphones', 'hat_under_headphones', 'short_hair', 'long_hair', 'shirt', 'watch', 'chain', 'beard', 'smoke', 'shoes_and_gloves'];
  for (const cat of optional) {
    const chance = cat === 'shoes_and_gloves' ? 0.95 : 0.8;
    if (Math.random() < chance) {
      let opts = Object.keys(TRAIT_MESH_MAPPING[cat]);
      if (cat === 'short_hair') opts = opts.filter(o => !o.includes('_ape'));
      t[cat] = pick(opts);
    }
  }

  // --- Compatibility rules (same order as avatar-maker) ---

  // Rule 1: hat_over + hat_under conflict
  if (t.hat_over_headphones && t.hat_under_headphones) {
    const isHoodieUp = t.hat_over_headphones.startsWith('hoodie_');
    const isBeanie = t.hat_under_headphones.startsWith('beanie');
    if (isHoodieUp && isBeanie) {
      delete t.hat_under_headphones;
    } else {
      Math.random() < 0.5 ? delete t.hat_over_headphones : delete t.hat_under_headphones;
    }
  }

  // Rule 2: can't have both short and long hair
  if (t.short_hair && t.long_hair) {
    Math.random() < 0.5 ? delete t.short_hair : delete t.long_hair;
  }

  // Rule 3: ape type = no long hair
  if (t.type === 'ape') delete t.long_hair;

  // Rule 4: shirt/hoodie_up vs chain
  const hasHoodieUp = t.hat_over_headphones && t.hat_over_headphones.startsWith('hoodie_');
  if ((t.shirt || hasHoodieUp) && t.chain) {
    if (Math.random() < 0.5) {
      delete t.chain;
    } else {
      if (hasHoodieUp) delete t.hat_over_headphones;
      if (t.shirt) delete t.shirt;
    }
  }

  // Rule 5: shirt vs hoodie_up
  if (t.shirt && hasHoodieUp) {
    Math.random() < 0.5 ? delete t.shirt : delete t.hat_over_headphones;
  }

  // Rule 5a/5b: headwear vs mohawk/messy hair
  const hasHeadwear = t.hat_over_headphones || t.hat_under_headphones;
  const isMohawkOrMessy = t.short_hair && (t.short_hair.startsWith('mohawk_') || t.short_hair.startsWith('messy_'));
  if (hasHeadwear && isMohawkOrMessy) {
    const headwearIsHoodie = t.hat_over_headphones && t.hat_over_headphones.startsWith('hoodie_');
    if (!headwearIsHoodie) {
      if (Math.random() < 0.5) {
        delete t.short_hair;
      } else {
        delete t.hat_over_headphones;
        delete t.hat_under_headphones;
      }
    }
  }

  // Rule 6: top headwear (cowboy/pilot/top) removes all hair
  const topHats = ['cowboy', 'pilot', 'top'];
  if (t.hat_over_headphones && topHats.includes(t.hat_over_headphones)) {
    delete t.short_hair;
    delete t.long_hair;
  }

  // Rule 7: hoodie_up removes all hair
  if (t.hat_over_headphones && t.hat_over_headphones.startsWith('hoodie_')) {
    delete t.short_hair;
    delete t.long_hair;
  }

  // Rule 8/9: zombie type eyes
  if (t.type === 'zombie' && (t.eyes === 'regular' || t.eyes === 'red')) t.eyes = 'zombie';
  if (t.type !== 'zombie' && t.eyes === 'zombie') t.eyes = 'regular';

  // Rule 10: alien type eyes
  if (t.type === 'alien' && t.eyes === 'regular') t.eyes = 'alien';

  // Rule 11: ape messy hair conversion
  if (t.type === 'ape' && t.short_hair && t.short_hair.startsWith('messy_') && !t.short_hair.endsWith('_ape')) {
    t.short_hair = t.short_hair + '_ape';
  }
  if (t.type !== 'ape' && t.short_hair && t.short_hair.endsWith('_ape')) {
    t.short_hair = t.short_hair.replace('_ape', '');
  }

  // Rule 12: based type eyes
  if (t.type === 'based' && ['alien', 'zombie', 'red'].includes(t.eyes)) t.eyes = 'mfercoin';

  // Rule 13: metal type eyes
  if (t.type === 'metal' && ['alien', 'zombie', 'red'].includes(t.eyes)) t.eyes = 'metal';

  // Rule 14: long curly hair + square headphones conflict
  const squareHP = ['black_square', 'blue_square', 'gold_square'];
  if (t.long_hair === 'long_curly' && squareHP.includes(t.headphones)) delete t.long_hair;

  // Rule 15: pilot + square headphones conflict
  if (t.hat_over_headphones === 'pilot' && squareHP.includes(t.headphones)) delete t.hat_over_headphones;

  return t;
}

function traitsToMeshes(traits) {
  const meshes = new Set();

  // Type meshes
  for (const m of (TRAIT_MESH_MAPPING.type[traits.type] || [])) meshes.add(m);

  // Eye meshes with type-specific base replacement
  const eyeMeshes = TRAIT_MESH_MAPPING.eyes[traits.eyes] || ['eyes_normal'];
  const eyeBase = TYPE_EYE_BASE[traits.type] || 'eyes_normal';
  for (const m of eyeMeshes) meshes.add(m === 'eyes_normal' ? eyeBase : m);

  // Mouth meshes with type suffix
  const mouthBase = traits.mouth === 'smile' ? 'mouth_smile' : 'mouth_flat';
  if (traits.type === 'metal') meshes.add(mouthBase + '_metal');
  else if (traits.type === 'based') meshes.add(mouthBase + '_mfercoin');
  else meshes.add(mouthBase);

  // All other trait categories
  const otherCats = ['headphones', 'hat_over_headphones', 'hat_under_headphones', 'short_hair', 'long_hair', 'shirt', 'watch', 'chain', 'beard', 'smoke', 'shoes_and_gloves'];
  for (const cat of otherCats) {
    if (traits[cat] && TRAIT_MESH_MAPPING[cat][traits[cat]]) {
      for (const m of TRAIT_MESH_MAPPING[cat][traits[cat]]) meshes.add(m);
    }
  }

  return meshes;
}

function applyRandomAppearance(targetScene) {
  const traits = generateRandomTraits();
  const meshes = traitsToMeshes(traits);
  console.log('Random mfer:', traits.type, '| traits:', Object.keys(traits).length);
  targetScene.traverse((child) => {
    if (child.isMesh) child.visible = meshes.has(child.name);
  });
}

// Map accessory mesh names to which ragdoll segment drives their velocity when detached
function getDetachSegment(name) {
  if (name.startsWith('headphones'))  return 'head';
  if (name.startsWith('eyes_glasses') || name.startsWith('eyes_vr') || name.startsWith('eyes_eye') ||
      name.startsWith('eyes_glases_3d') || name.startsWith('eyes_glasses_3d')) return 'head';
  if (name.startsWith('hat_') || name.startsWith('cap_') || name.startsWith('headband_')) return 'head';
  if (name.startsWith('smoke'))       return 'head';
  if (name.startsWith('watch_'))      return 'leftForeArm';
  if (name.startsWith('chain_'))      return 'spine';
  if (name.startsWith('beard'))       return 'head';
  if (name.startsWith('hair_'))       return 'head';
  if (name.startsWith('shirt_hoodie_up')) return 'head';
  if (name.startsWith('larmf'))       return 'head'; // larva mfer hat
  return null; // body, type, eyes (actual eyeballs), mouth — don't detach
}

function detachAccessories(mfer) {
  const toDetach = [];
  mfer.scene.traverse((child) => {
    if (child.isMesh && child.visible && getDetachSegment(child.name)) {
      toDetach.push(child);
    }
  });

  if (!mfer.detachedPieces) mfer.detachedPieces = [];

  for (const mesh of toDetach) {
    const segName = getDetachSegment(mesh.name);
    mesh.visible = false;

    // Bake the skinned geometry at its current pose
    let bakedGeo;
    if (mesh.isSkinnedMesh && mesh.skeleton) {
      bakedGeo = mesh.geometry.clone();
      const srcPos = mesh.geometry.attributes.position;
      const dstPos = bakedGeo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < srcPos.count; i++) {
        v.fromBufferAttribute(srcPos, i);
        mesh.applyBoneTransform(i, v);
        dstPos.setXYZ(i, v.x, v.y, v.z);
      }
      dstPos.needsUpdate = true;
    } else {
      bakedGeo = mesh.geometry.clone();
    }
    bakedGeo.computeBoundingBox();
    bakedGeo.computeBoundingSphere();

    // Center the geometry at origin so physics rotation works correctly
    const localCenter = new THREE.Vector3();
    bakedGeo.boundingBox.getCenter(localCenter);
    const pos = bakedGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) - localCenter.x, pos.getY(i) - localCenter.y, pos.getZ(i) - localCenter.z);
    }
    pos.needsUpdate = true;
    bakedGeo.computeBoundingSphere();

    // Get world-space center and orientation
    const worldCenter = localCenter.applyMatrix4(mesh.matrixWorld);
    const wPos = new THREE.Vector3(), wQuat = new THREE.Quaternion(), wScale = new THREE.Vector3();
    mesh.matrixWorld.decompose(wPos, wQuat, wScale);

    // Create the detached mesh
    const detached = new THREE.Mesh(bakedGeo, mesh.material);
    detached.position.copy(worldCenter);
    detached.quaternion.copy(wQuat);
    detached.scale.copy(wScale);
    detached.castShadow = true;
    detached.frustumCulled = false;
    scene.add(detached);

    // Physics body with a small box collider
    const bboxSize = new THREE.Vector3();
    mesh.geometry.boundingBox || mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getSize(bboxSize);
    bboxSize.multiplyScalar(0.5 * modelScale);
    const hx = Math.max(bboxSize.x, 0.02), hy = Math.max(bboxSize.y, 0.02), hz = Math.max(bboxSize.z, 0.02);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(worldCenter.x, worldCenter.y, worldCenter.z)
      .setRotation({ x: wQuat.x, y: wQuat.y, z: wQuat.z, w: wQuat.w })
      .setLinearDamping(0.2)
      .setAngularDamping(0.3);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hy, hz).setMass(0.3).setRestitution(0.5).setFriction(0.4),
      body
    );

    // Inherit velocity from the associated body part + random pop
    const segBody = mfer.ragdollBodies[segName];
    if (segBody) {
      const sv = segBody.linvel();
      const sa = segBody.angvel();
      body.setLinvel({
        x: sv.x + (Math.random() - 0.5) * 4,
        y: sv.y + Math.random() * 4 + 2,
        z: sv.z + (Math.random() - 0.5) * 4,
      }, true);
      body.setAngvel({
        x: sa.x + (Math.random() - 0.5) * 10,
        y: sa.y + (Math.random() - 0.5) * 10,
        z: sa.z + (Math.random() - 0.5) * 10,
      }, true);
    }

    mfer.detachedPieces.push({ mesh: detached, body, geo: bakedGeo });
  }

  if (toDetach.length > 0) console.log(`Detached ${toDetach.length} accessories`);
}

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
let gltfScene, mixer;       // the idle display mfer
let originalGltf = null;     // stored for cloning new mfers
let modelScale = 1;
let modelCenter = new THREE.Vector3();
let modelBottomY = 0;
let lastTime = performance.now();
let originalPos = new THREE.Vector3();
let impactScore = 0;
let maxVelocity = 0;
let settled = false;
let settledTimer = 0;
let showDebug = false;
let eventQueue;

// Level system
let levelParts = null;
let currentLevelIndex = 0;

// Game phases: 'placing' (click to place mfers) → 'playing' (go pressed, physics active)
let gamePhase = 'placing';
let placedMfers = [];        // idle mfers placed during placing phase: { scene, mixer }
let mfers = [];              // active ragdoll mfers

// Raycasting + placement preview
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let ghostPreview = null;

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
  world = new RAPIER.World({ x: 0, y: -settings.gravity, z: 0 });
  eventQueue = new RAPIER.EventQueue(true);

  levelParts = LEVELS[0].build();
  await loadModel();

  ghostPreview = createGhostPreview();

  window.addEventListener('resize', onResize);
  window.addEventListener('click', onClick);
  window.addEventListener('touchstart', (e) => { e.preventDefault(); onClick(e); }, { passive: false });
  window.addEventListener('mousemove', updateGhostPreview);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      showDebug = !showDebug;
      for (const m of mfers) for (const d of m.debugMeshes) d.mesh.visible = showDebug;
    }
  });
  document.getElementById('go-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    onGo();
  });
  document.getElementById('reset-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    reset();
  });

  // Settings panel toggle
  const controlsEl = document.getElementById('controls');
  const toggleBtn = document.getElementById('toggle-controls');
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = controlsEl.style.display !== 'none';
    controlsEl.style.display = open ? 'none' : 'block';
    toggleBtn.textContent = open ? 'settings' : 'x';
  });
  controlsEl.addEventListener('click', (e) => e.stopPropagation());
  controlsEl.addEventListener('touchstart', (e) => e.stopPropagation());

  // Wire up sliders
  const sliders = [
    { id: 'gravity',  key: 'gravity',     apply: (v) => world.gravity = { x: 0, y: -v, z: 0 } },
    { id: 'launch',   key: 'launchSpeed' },
    { id: 'spin',     key: 'spin' },
    { id: 'bounce',   key: 'bounce' },
    { id: 'damping',  key: 'damping' },
    { id: 'height',   key: 'dropHeight',  apply: (v) => {
      if (gltfScene) {
        gltfScene.position.y = v;
        originalPos.copy(gltfScene.position);
      }
    }},
  ];
  for (const sl of sliders) {
    const input = document.getElementById(`sl-${sl.id}`);
    const valEl = document.getElementById(`v-${sl.id}`);
    input.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings[sl.key] = v;
      valEl.textContent = v % 1 === 0 ? v : v.toFixed(1);
      if (sl.apply) sl.apply(v);
    });
  }
  document.getElementById('defaults-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    Object.assign(settings, DEFAULTS);
    if (LEVELS[currentLevelIndex].settingsOverrides) Object.assign(settings, LEVELS[currentLevelIndex].settingsOverrides);
    for (const sl of sliders) {
      const input = document.getElementById(`sl-${sl.id}`);
      const valEl = document.getElementById(`v-${sl.id}`);
      const v = settings[sl.key];
      input.value = v;
      valEl.textContent = v % 1 === 0 ? v : v.toFixed(1);
      if (sl.apply) sl.apply(v);
    }
  });

  // Level selector
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchLevel(parseInt(btn.dataset.level));
    });
  });

  document.getElementById('loading').style.display = 'none';
  document.getElementById('go-btn').style.display = 'block';
  document.getElementById('instructions').textContent = 'click to place mfers, then go!';
  animate();
}

// ======== LEVEL SYSTEM ========

function addBox(p, pos, size, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.7, ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}) });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  mesh.castShadow = !opts.noShadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  p.staticMeshes.push(mesh);
  if (!opts.noPhysics) {
    const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
    if (opts.rotZ) desc.setRotation({ x: 0, y: 0, z: Math.sin(opts.rotZ / 2), w: Math.cos(opts.rotZ / 2) });
    const body = world.createRigidBody(desc);
    world.createCollider(RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setRestitution(opts.restitution ?? 0.3).setFriction(opts.friction ?? 0.5), body);
    p.staticBodies.push(body);
  }
  return mesh;
}

function addDynamicBox(p, pos, size, color, mass = 1.5) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const bb = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinearDamping(0.3).setAngularDamping(0.3));
  world.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setMass(mass).setRestitution(0.4).setFriction(0.5), bb);
  p.dynamicParts.push({ mesh, body: bb });
}

// ---- LEVEL 1: STAIR DISMOUNT ----

function createStairLevel() {
  return {
    name: 'stairs',
    spawnPos: { x: -1, y: 7, z: 0 },
    groundY: 1,
    cameraStart: { pos: [0, 6, 14], lookAt: [0, 4, 0] },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Ground
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.8, metalness: 0.2 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      p.staticMeshes.push(ground);

      const grid = new THREE.GridHelper(50, 50, 0x0f3460, 0x0f3460);
      grid.position.y = 0.01;
      scene.add(grid);
      p.helpers.push(grid);

      const gb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      world.createCollider(RAPIER.ColliderDesc.cuboid(25, 0.5, 25).setRestitution(0.4).setFriction(0.6), gb);
      p.staticBodies.push(gb);

      // Stairs
      const stairCount = 8, stepW = 3, stepH = 0.35, stepD = 0.6;
      for (let i = 0; i < stairCount; i++) {
        addBox(p, { x: -1 + i * stepD * 0.8, y: (stairCount - i) * stepH, z: 0 },
          { x: stepW, y: stepH, z: stepD }, 0x0f3460);
      }

      // Ramp
      addBox(p, { x: 5, y: 0.3, z: 0 }, { x: 3, y: 0.15, z: 2.5 }, 0xe94560,
        { rotZ: -0.25, roughness: 0.5, restitution: 0.6, friction: 0.3 });

      // Dynamic boxes
      for (let i = 0; i < 6; i++) {
        const s = 0.25 + Math.random() * 0.4;
        addDynamicBox(p, { x: 3 + Math.random() * 4, y: s / 2 + (Math.random() > 0.5 ? 0.35 : 0), z: -1.5 + Math.random() * 3 }, s, 0x533483);
      }

      return p;
    },
  };
}

// ---- LEVEL 2: TRUCK HIT ----

function createTruckHitLevel() {
  return {
    name: 'truck hit',
    spawnPos: { x: 0, y: 1, z: 0 },
    groundY: 1,
    cameraStart: { pos: [5, 4, 12], lookAt: [0, 1, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1 },
    keepIdleUntilImpact: true,

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Ground plane
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 40),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // Road surface
      const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 6),
        new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.85 }));
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 1.02, 0);
      road.receiveShadow = true;
      scene.add(road);
      p.staticMeshes.push(road);

      // Lane markings — dashed yellow center line
      for (let x = -28; x < 30; x += 3) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xddcc00, emissive: 0x443300, emissiveIntensity: 0.3 }));
        dash.position.set(x, 1.03, 0);
        scene.add(dash);
        p.staticMeshes.push(dash);
      }

      // Edge lines — solid white
      for (const z of [-2.9, 2.9]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(60, 0.02, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xffffff }));
        edge.position.set(0, 1.03, z);
        scene.add(edge);
        p.staticMeshes.push(edge);
      }

      // Sidewalks
      for (const z of [-4.5, 4.5]) {
        addBox(p, { x: 0, y: 1.1, z }, { x: 60, y: 0.2, z: 2.5 }, 0x555555, { roughness: 0.9, friction: 0.7 });
      }
      // Curbs
      for (const z of [-3.15, 3.15]) {
        addBox(p, { x: 0, y: 1.15, z }, { x: 60, y: 0.3, z: 0.15 }, 0x666666, { friction: 0.6 });
      }

      // Buildings backdrop
      const buildingColors = [0x2a2a3e, 0x1e1e30, 0x252540];
      for (let i = 0; i < 4; i++) {
        const h = 6 + Math.random() * 8;
        const w = 4 + Math.random() * 3;
        addBox(p, { x: -12 + i * 9 + Math.random() * 2, y: h / 2 + 1, z: -7.5 }, { x: w, y: h, z: 3 },
          buildingColors[i % 3], { noPhysics: true, roughness: 0.95 });
      }

      // Windows on buildings (emissive rectangles)
      for (let i = 0; i < 4; i++) {
        const bx = -12 + i * 9 + Math.random() * 2;
        for (let wy = 3; wy < 10; wy += 2) {
          for (let wx = -1.2; wx <= 1.2; wx += 1.2) {
            if (Math.random() > 0.3) {
              const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.05),
                new THREE.MeshStandardMaterial({ color: 0x88aacc, emissive: 0x88aacc, emissiveIntensity: 0.4 + Math.random() * 0.4 }));
              win.position.set(bx + wx, wy, -5.9);
              scene.add(win);
              p.staticMeshes.push(win);
            }
          }
        }
      }

      // Traffic light
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.12), poleMat);
      pole.position.set(4, 3, -3.2);
      pole.castShadow = true;
      scene.add(pole);
      p.staticMeshes.push(pole);

      const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
      lightBox.position.set(4, 5.2, -3.2);
      scene.add(lightBox);
      p.staticMeshes.push(lightBox);

      const lightColors = [0xff0000, 0xffaa00, 0x00ff00];
      const trafficLights = [];
      for (let i = 0; i < 3; i++) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshStandardMaterial({ color: lightColors[i], emissive: i === 2 ? lightColors[i] : 0x000000, emissiveIntensity: 0.8 }));
        bulb.position.set(4, 5.5 - i * 0.3, -3.0);
        scene.add(bulb);
        p.staticMeshes.push(bulb);
        trafficLights.push(bulb);
      }

      // Parked cars (dynamic — will get hit)
      const carColors = [0x3366cc, 0xcc3333];
      for (let i = 0; i < 2; i++) {
        const cx = 6 + i * 5;
        // Car body
        const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.4),
          new THREE.MeshStandardMaterial({ color: carColors[i], roughness: 0.4, metalness: 0.3 }));
        carBody.position.set(cx, 1.5, 1.8);
        carBody.castShadow = true;
        scene.add(carBody);
        const carPhys = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(cx, 1.5, 1.8).setLinearDamping(0.5).setAngularDamping(0.5));
        world.createCollider(RAPIER.ColliderDesc.cuboid(1.25, 0.4, 0.7).setMass(50).setRestitution(0.2).setFriction(0.5), carPhys);
        p.dynamicParts.push({ mesh: carBody, body: carPhys });

        // Car roof
        const carTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.3),
          new THREE.MeshStandardMaterial({ color: carColors[i], roughness: 0.4, metalness: 0.3 }));
        carTop.position.set(0.2, 0.7, 0);
        carBody.add(carTop);
      }

      // === THE TRUCK ===
      const truckGroup = new THREE.Group();
      const truckMat = new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.5, metalness: 0.2 });
      const truckWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });

      // Cargo body
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 2.2), truckWhiteMat);
      cargo.position.set(-0.5, 0.2, 0);
      cargo.castShadow = true;
      truckGroup.add(cargo);

      // Cab
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 2.2), truckMat);
      cab.position.set(2.4, -0.1, 0);
      cab.castShadow = true;
      truckGroup.add(cab);

      // Windshield
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.1, metalness: 0.5 }));
      windshield.position.set(3.33, 0.2, 0);
      truckGroup.add(windshield);

      // Bumper
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 2.4),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
      bumper.position.set(3.4, -0.9, 0);
      truckGroup.add(bumper);

      // Headlights
      for (const z of [-0.6, 0.6]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.35),
          new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 1.5 }));
        hl.position.set(3.35, -0.3, z);
        truckGroup.add(hl);
      }

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const wheels = [];
      for (const [wx, wz] of [[2.2, -1.2], [2.2, 1.2], [-1.5, -1.2], [-1.5, 1.2]]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -1.2, wz);
        truckGroup.add(wheel);
        wheels.push(wheel);
      }

      truckGroup.position.set(-30, 2.5, -1.5);
      scene.add(truckGroup);

      // Truck physics — kinematic, velocity computed by Rapier from position delta
      const truckBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-30, 2.5, -1.5));
      const truckCollider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(3.5, 1.4, 1.1).setMass(8000).setRestitution(0.1).setFriction(0.3)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), truckBody);

      const truckState = {
        active: false, currentX: -30, speed: 22, hitMfer: false, justHit: false,
        body: truckBody, colliderHandle: truckCollider.handle, group: truckGroup, wheels,
        trafficLights,
      };

      p.animatedObjects.push({
        group: truckGroup, body: truckBody, state: truckState,
        update(dt) {
          if (!truckState.active) return;

          // Traffic light: switch to red as truck approaches
          if (truckState.currentX > -10 && !truckState.lightSwitched) {
            truckState.lightSwitched = true;
            trafficLights[2].material.emissive.setHex(0x000000); // green off
            trafficLights[0].material.emissive.setHex(0xff0000); // red on
          }

          if (!truckState.gonePhysics) {
            // Kinematic phase: truck drives unstoppably, plows through everything
            truckState.currentX += truckState.speed * dt;
            truckBody.setNextKinematicTranslation({ x: truckState.currentX, y: 2.5, z: -1.5 });
            const t = truckBody.translation();
            truckGroup.position.set(t.x, t.y, t.z);
            for (const w of wheels) w.rotation.z -= truckState.speed * dt * 3;

            // Convert placed idle mfers to ragdolls as the truck front reaches them
            const truckFrontX = truckState.currentX + 3.5;
            const remaining = [];
            for (const pm of placedMfers) {
              const mferX = pm.scene.position.x;
              if (truckFrontX >= mferX - 0.5) {
                if (pm.mixer) pm.mixer.stopAllAction();
                const mfer = createRagdoll(pm.scene);
                if (mfer) {
                  const tv = truckState.speed;
                  for (const body of Object.values(mfer.ragdollBodies)) {
                    body.setLinvel({ x: tv * 0.8 + Math.random() * 3, y: 4 + Math.random() * 4, z: (Math.random() - 0.5) * 8 }, true);
                    body.setAngvel({ x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 15 }, true);
                  }
                  mfer.ragdollActive = true;
                  detachAccessories(mfer);
                  mfers.push(mfer);
                }
              } else {
                remaining.push(pm);
              }
            }
            placedMfers = remaining;

            // Once truck is well past the action zone, switch to dynamic for spinout
            if (truckState.currentX > 20) {
              truckState.gonePhysics = true;
              truckBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
              truckBody.setLinvel({ x: truckState.speed * 0.5, y: 1, z: (Math.random() - 0.5) * 3 }, true);
              truckBody.setAngvel({ x: 0, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 0.5 }, true);
            }
          } else {
            // Dynamic phase: truck is physics-driven, sync mesh
            const t = truckBody.translation();
            const r = truckBody.rotation();
            truckGroup.position.set(t.x, t.y, t.z);
            truckGroup.quaternion.set(r.x, r.y, r.z, r.w);
          }
        },
      });

      p.truckState = truckState;

      p.reset = () => {
        truckState.active = false;
        truckState.hitMfer = false;
        truckState.justHit = false;
        truckState.gonePhysics = false;
        truckState.lightSwitched = false;
        truckState.currentX = -30;
        truckBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        truckBody.setTranslation({ x: -30, y: 2.5, z: -1.5 }, true);
        truckBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        truckGroup.position.set(-30, 2.5, -1.5);
        truckGroup.quaternion.set(0, 0, 0, 1);
        trafficLights[0].material.emissive.setHex(0x000000);
        trafficLights[2].material.emissive.setHex(0x00ff00);
      };

      return p;
    },

    onDrop(lp) {
      if (lp.truckState) {
        lp.truckState.active = true;
        lp.truckState.currentX = -25;
      }
    },

    onCollision(lp, h1, h2) {
      if (!lp.truckState || lp.truckState.hitMfer) return;
      const th = lp.truckState.colliderHandle;
      if (h1 === th || h2 === th) {
        lp.truckState.hitMfer = true;
        lp.truckState.justHit = true;
        console.log('TRUCK HIT!');
      }
    },
  };
}

const LEVELS = [createStairLevel(), createTruckHitLevel()];

function cleanupLevel() {
  if (!levelParts) return;
  for (const { body } of levelParts.dynamicParts) world.removeRigidBody(body);
  for (const body of levelParts.staticBodies) world.removeRigidBody(body);
  for (const mesh of [...levelParts.staticMeshes, ...levelParts.dynamicParts.map(d => d.mesh)]) {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material && mesh.material.dispose) mesh.material.dispose();
  }
  for (const h of levelParts.helpers) { scene.remove(h); if (h.dispose) h.dispose(); }
  for (const obj of levelParts.animatedObjects) {
    if (obj.body) world.removeRigidBody(obj.body);
    if (obj.group) { scene.remove(obj.group); obj.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material && c.material.dispose) c.material.dispose(); }); }
  }
  levelParts = null;
}

function switchLevel(index) {
  // Clean up placed idle mfers
  for (const pm of placedMfers) { if (pm.mixer) pm.mixer.stopAllAction(); if (pm.triggerBody) world.removeRigidBody(pm.triggerBody); scene.remove(pm.scene); }
  placedMfers = [];
  gamePhase = 'placing';

  // Clean up all mfers
  for (const mfer of mfers) {
    for (const joint of mfer.ragdollJointRefs) world.removeImpulseJoint(joint, true);
    for (const body of Object.values(mfer.ragdollBodies)) world.removeRigidBody(body);
    for (const d of mfer.debugMeshes) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }
    if (mfer.detachedPieces) { for (const piece of mfer.detachedPieces) { world.removeRigidBody(piece.body); scene.remove(piece.mesh); piece.geo.dispose(); } }
    scene.remove(mfer.scene);
  }
  mfers = [];
  if (gltfScene) { scene.remove(gltfScene); gltfScene = null; mixer = null; }

  cleanupLevel();

  currentLevelIndex = index;
  const level = LEVELS[index];
  levelParts = level.build();

  // Apply level settings overrides
  if (level.settingsOverrides) Object.assign(settings, DEFAULTS, level.settingsOverrides);

  // Set spawn position
  const sp = level.spawnPos;
  originalPos.set(sp.x - modelCenter.x * modelScale, sp.y, -modelCenter.z * modelScale);

  // Camera
  const cam = level.cameraStart;
  camera.position.set(...cam.pos);
  camera.lookAt(...cam.lookAt);

  // Spawn idle mfer
  if (originalGltf) {
    const cloned = SkeletonUtils.clone(originalGltf.scene);
    cloned.traverse(c => { if (c.isMesh) { c.visible = false; c.castShadow = true; c.receiveShadow = true; c.frustumCulled = false; } });
    applyRandomAppearance(cloned);
    cloned.scale.setScalar(modelScale);
    cloned.position.copy(originalPos);
    cloned.traverse(c => { if (c.isBone) { c.userData.origPos = c.position.clone(); c.userData.origQuat = c.quaternion.clone(); c.userData.origScale = c.scale.clone(); } });
    scene.add(cloned);
    gltfScene = cloned;
    mixer = new THREE.AnimationMixer(cloned);
    const idle = originalGltf.animations.find(a => a.name.toLowerCase().includes('idle')) || originalGltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
  }

  // Update level selector buttons
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === index);
  });

  settled = false;
  document.getElementById('instructions').textContent = 'click to place mfers, then go!';
  document.getElementById('score').textContent = '';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('go-btn').style.display = 'block';
}

async function loadModel() {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(MODEL_URL, (gltf) => {
      originalGltf = gltf;
      const cloned = SkeletonUtils.clone(gltf.scene);
      gltfScene = cloned;

      // Set up mesh rendering properties
      cloned.traverse((child) => {
        if (child.isMesh) {
          child.visible = false;
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        }
      });

      // Apply random mfer appearance before measuring
      applyRandomAppearance(cloned);

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
        settings.dropHeight,
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

function createRagdoll(targetScene) {
  if (!targetScene) return null;

  const mfer = { scene: targetScene, ragdollBodies: {}, ragdollJointRefs: [], ragdollSegData: {}, ragdollActive: false, debugMeshes: [] };

  // Ensure skeleton world matrices are current
  targetScene.updateMatrixWorld(true);

  // Build bone lookup
  const bones = {};
  targetScene.traverse((child) => {
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
      .setLinearDamping(settings.damping)
      .setAngularDamping(settings.damping + 0.2)
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
      .setRestitution(settings.bounce)
      .setFriction(0.5)
      .setCollisionGroups(ragdollGroup)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);

    mfer.ragdollBodies[seg.name] = body;
    mfer.ragdollSegData[seg.name] = { bone, halfDist, localRotOffset };

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
    mfer.debugMeshes.push({ mesh: debugMesh, segName: seg.name });
  }

  // Create joints between segments
  for (const jDef of RAGDOLL_JOINTS) {
    const bodyA = mfer.ragdollBodies[jDef.segA];
    const bodyB = mfer.ragdollBodies[jDef.segB];
    if (!bodyA || !bodyB) continue;

    const segDataB = mfer.ragdollSegData[jDef.segB];

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
    mfer.ragdollJointRefs.push(joint);
  }

  console.log(`Ragdoll created: ${Object.keys(mfer.ragdollBodies).length} bodies, ${mfer.ragdollJointRefs.length} joints`);
  return mfer;
}

function applyLaunchVelocity(mfer) {
  const vel = { x: settings.launchSpeed * (0.75 + Math.random() * 0.5), y: -2, z: (Math.random() - 0.5) * 2 };
  for (const body of Object.values(mfer.ragdollBodies)) {
    body.setLinvel(vel, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
}

// Reusable temp objects for bone sync
const _tp = new THREE.Vector3(), _tq = new THREE.Quaternion(), _bq = new THREE.Quaternion();
const _off = new THREE.Vector3(), _pi = new THREE.Matrix4(), _dw = new THREE.Matrix4();
const _lm = new THREE.Matrix4(), _lp = new THREE.Vector3(), _lq = new THREE.Quaternion(), _ls = new THREE.Vector3();

function syncRagdollBones(mfer) {
  const sv = new THREE.Vector3(modelScale, modelScale, modelScale);

  for (const segName of SEGMENT_ORDER) {
    const body = mfer.ragdollBodies[segName];
    const seg = mfer.ragdollSegData[segName];
    if (!body || !seg) continue;

    const p = body.translation();
    const r = body.rotation();
    _bq.set(r.x, r.y, r.z, r.w);

    _off.set(0, -seg.halfDist, 0).applyQuaternion(_bq);
    _tp.set(p.x + _off.x, p.y + _off.y, p.z + _off.z);
    _tq.copy(_bq).multiply(seg.localRotOffset);

    _pi.copy(seg.bone.parent.matrixWorld).invert();
    _dw.compose(_tp, _tq, sv);
    _lm.multiplyMatrices(_pi, _dw);
    _lm.decompose(_lp, _lq, _ls);

    seg.bone.position.copy(_lp);
    seg.bone.quaternion.copy(_lq);
    seg.bone.updateMatrixWorld(true);
  }
}

function getClickWorldPos(e) {
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Intersect with horizontal plane at actual ground surface
  const gy = LEVELS[currentLevelIndex].groundY ?? 1;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -gy);
  const hitPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, hitPoint);
  return hitPoint;
}

function createGhostPreview() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.3 });
  // Simple humanoid silhouette: capsule body + sphere head
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.2, 4, 8), mat);
  body.position.y = 1.0;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat);
  head.position.y = 1.9;
  group.add(head);
  group.visible = false;
  scene.add(group);
  return group;
}

function updateGhostPreview(e) {
  if (gamePhase !== 'placing' || !ghostPreview) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const gy = LEVELS[currentLevelIndex].groundY ?? 1;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -gy);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, hit)) {
    ghostPreview.position.set(hit.x, hit.y, hit.z);
    ghostPreview.visible = true;
  }
}

function spawnIdleMfer(worldPos) {
  if (!originalGltf) return null;

  const cloned = SkeletonUtils.clone(originalGltf.scene);
  cloned.traverse((child) => {
    if (child.isMesh) { child.visible = false; child.castShadow = true; child.receiveShadow = true; child.frustumCulled = false; }
  });
  applyRandomAppearance(cloned);
  cloned.scale.setScalar(modelScale);
  cloned.position.set(worldPos.x - modelCenter.x * modelScale, worldPos.y, worldPos.z - modelCenter.z * modelScale);

  cloned.traverse((child) => {
    if (child.isBone) { child.userData.origPos = child.position.clone(); child.userData.origQuat = child.quaternion.clone(); child.userData.origScale = child.scale.clone(); }
  });
  scene.add(cloned);

  let idleMixer = null;
  if (originalGltf.animations && originalGltf.animations.length > 0) {
    idleMixer = new THREE.AnimationMixer(cloned);
    const idle = originalGltf.animations.find(a => a.name.toLowerCase().includes('idle')) || originalGltf.animations[0];
    if (idle) idleMixer.clipAction(idle).play();
  }

  return { scene: cloned, mixer: idleMixer };
}

function activateAllMfers() {
  const curLevel = LEVELS[currentLevelIndex];
  const gy = curLevel.groundY ?? 1;

  // Move initial idle mfer into placedMfers
  if (gltfScene) {
    placedMfers.push({ scene: gltfScene, mixer });
    gltfScene = null;
    mixer = null;
  }

  if (curLevel.keepIdleUntilImpact) {
    // Keep all idle — level handles ragdoll on impact (e.g. truck)
    return;
  }

  // Activate placed mfers
  const staying = [];
  for (const pm of placedMfers) {
    const mferY = pm.scene.position.y;
    if (mferY > gy + 1) {
      // Above ground: convert to ragdoll and let it fall
      if (pm.mixer) pm.mixer.stopAllAction();
      const mfer = createRagdoll(pm.scene);
      if (mfer) {
        applyLaunchVelocity(mfer);
        mfers.push(mfer);
      }
    } else {
      // On ground: keep idle animation, add solid trigger capsule
      // Mfer stays standing until something collides with it
      const cx = pm.scene.position.x + modelCenter.x * modelScale;
      const cz = pm.scene.position.z + modelCenter.z * modelScale;
      const tb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, gy + 1.25, cz));
      const tc = world.createCollider(
        RAPIER.ColliderDesc.capsule(0.8, 0.3).setRestitution(0.3).setFriction(0.5)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), tb);
      pm.triggerBody = tb;
      pm.triggerHandle = tc.handle;
      staying.push(pm);
    }
  }
  placedMfers = staying;

  // Notify level
  if (curLevel.onDrop && levelParts) curLevel.onDrop(levelParts);
}

function onClick(e) {
  if (e.target.closest('#controls, #level-select, #reset-btn, #go-btn, #toggle-controls')) return;

  if (gamePhase === 'placing') {
    // Place an idle mfer at click position
    const worldPos = getClickWorldPos(e);
    if (!worldPos) return;

    // Move the initial idle mfer into placedMfers on first placement click
    if (gltfScene) {
      placedMfers.push({ scene: gltfScene, mixer });
      gltfScene = null;
      mixer = null;
    }

    const pm = spawnIdleMfer(worldPos);
    if (pm) placedMfers.push(pm);

    const count = placedMfers.length;
    document.getElementById('instructions').textContent = `${count} mfer${count > 1 ? 's' : ''} placed — click to add more`;
  } else {
    // Playing phase: spawn and immediately ragdoll at click position
    const worldPos = getClickWorldPos(e);
    if (!worldPos) return;
    const pm = spawnIdleMfer(worldPos);
    if (pm) {
      if (pm.mixer) pm.mixer.stopAllAction();
      const mfer = createRagdoll(pm.scene);
      if (mfer) mfers.push(mfer);
    }
  }
}

function onGo() {
  gamePhase = 'playing';
  if (ghostPreview) ghostPreview.visible = false;
  document.getElementById('go-btn').style.display = 'none';
  document.getElementById('reset-btn').style.display = 'block';
  document.getElementById('instructions').textContent = '';

  settled = false;
  settledTimer = 0;
  impactScore = 0;
  maxVelocity = 0;

  activateAllMfers();

  // Notify level (e.g. starts the truck)
  const level = LEVELS[currentLevelIndex];
  if (level.onDrop && levelParts) level.onDrop(levelParts);
}

function reset() {
  // Clean up all mfers
  for (const mfer of mfers) {
    for (const joint of mfer.ragdollJointRefs) world.removeImpulseJoint(joint, true);
    for (const body of Object.values(mfer.ragdollBodies)) world.removeRigidBody(body);
    for (const d of mfer.debugMeshes) {
      scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mesh.material.dispose();
    }
    if (mfer.detachedPieces) {
      for (const piece of mfer.detachedPieces) {
        world.removeRigidBody(piece.body);
        scene.remove(piece.mesh);
        piece.geo.dispose();
      }
    }
    scene.remove(mfer.scene);
  }
  mfers = [];

  // Clean up placed idle mfers (including trigger bodies)
  for (const pm of placedMfers) {
    if (pm.mixer) pm.mixer.stopAllAction();
    if (pm.triggerBody) world.removeRigidBody(pm.triggerBody);
    scene.remove(pm.scene);
  }
  placedMfers = [];
  gamePhase = 'placing';

  // Create fresh idle mfer
  if (originalGltf) {
    const cloned = SkeletonUtils.clone(originalGltf.scene);
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.visible = false;
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
      }
    });
    applyRandomAppearance(cloned);
    cloned.scale.setScalar(modelScale);
    cloned.position.copy(originalPos);
    cloned.position.y = settings.dropHeight;
    cloned.traverse((child) => {
      if (child.isBone) {
        child.userData.origPos = child.position.clone();
        child.userData.origQuat = child.quaternion.clone();
        child.userData.origScale = child.scale.clone();
      }
    });
    scene.add(cloned);
    gltfScene = cloned;

    mixer = new THREE.AnimationMixer(cloned);
    const idle = originalGltf.animations.find(a => a.name.toLowerCase().includes('idle')) || originalGltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
  }

  // Reset level-specific state (e.g. truck position)
  if (levelParts && levelParts.reset) levelParts.reset();

  settled = false;
  document.getElementById('instructions').textContent = 'click to place mfers, then go!';
  document.getElementById('score').textContent = '';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('go-btn').style.display = 'block';
  const cam = LEVELS[currentLevelIndex].cameraStart;
  camera.position.set(...cam.pos);
  camera.lookAt(...cam.lookAt);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateScore() {
  const latest = mfers[mfers.length - 1];
  if (!latest || !latest.ragdollBodies['hips']) return;

  // Aggregate velocity across latest mfer's bodies
  let totalSpeed = 0;
  let totalSpin = 0;
  let count = 0;
  for (const body of Object.values(latest.ragdollBodies)) {
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

  if (mixer && gltfScene) mixer.update(delta);
  for (const pm of placedMfers) { if (pm.mixer) pm.mixer.update(delta); }

  // Step physics with event queue for collision detection
  world.step(eventQueue);

  // Sync level dynamic parts to physics
  if (levelParts) {
    for (const { mesh, body } of levelParts.dynamicParts) {
      const p = body.translation();
      const r = body.rotation();
      mesh.position.set(p.x, p.y, p.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    // Update animated objects (truck, etc.)
    for (const obj of levelParts.animatedObjects) {
      if (obj.update) obj.update(delta);
    }
  }

  // Process all mfers
  let anyPreImpact = false;
  for (const mfer of mfers) {
    // Pre-impact: keep all bodies in rigid formation
    if (!mfer.ragdollActive) {
      anyPreImpact = true;
      const hipsBody = mfer.ragdollBodies['hips'];
      if (hipsBody) {
        const hv = hipsBody.linvel();
        for (const body of Object.values(mfer.ragdollBodies)) {
          body.setLinvel({ x: hv.x, y: hv.y, z: hv.z }, true);
          body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }

    // Sync ragdoll bones
    syncRagdollBones(mfer);

    // Sync debug wireframes
    for (const d of mfer.debugMeshes) {
      const body = mfer.ragdollBodies[d.segName];
      if (!body) continue;
      const p = body.translation();
      const r = body.rotation();
      d.mesh.position.set(p.x, p.y, p.z);
      d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    // Sync detached accessory pieces
    if (mfer.detachedPieces) {
      for (const piece of mfer.detachedPieces) {
        const p = piece.body.translation();
        const r = piece.body.rotation();
        piece.mesh.position.set(p.x, p.y, p.z);
        piece.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      }
    }
  }

  // Drain collision events — activate ragdolls + convert standing mfers on hit
  const hitStanding = new Set();
  eventQueue.drainCollisionEvents((h1, h2, started) => {
    if (!started) return;
    // Activate falling ragdolls (pre-impact → post-impact)
    for (const mfer of mfers) {
      if (mfer.ragdollActive) continue;
      mfer.ragdollActive = true;
      const hb = mfer.ragdollBodies['hips'];
      if (hb) {
        const s = settings.spin;
        hb.setAngvel({ x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s * 0.5, z: (Math.random() - 0.5) * s }, true);
      }
      detachAccessories(mfer);
    }
    // Check if any standing mfer's trigger capsule got hit
    for (const pm of placedMfers) {
      if (pm.triggerHandle !== undefined && (h1 === pm.triggerHandle || h2 === pm.triggerHandle)) {
        hitStanding.add(pm);
      }
    }
    // Level-specific collision handling
    const level = LEVELS[currentLevelIndex];
    if (level.onCollision && levelParts) level.onCollision(levelParts, h1, h2);
  });
  // Convert hit standing mfers to ragdolls
  for (const pm of hitStanding) {
    world.removeRigidBody(pm.triggerBody);
    if (pm.mixer) pm.mixer.stopAllAction();
    const mfer = createRagdoll(pm.scene);
    if (mfer) {
      mfer.ragdollActive = true;
      mfers.push(mfer);
    }
  }
  if (hitStanding.size > 0) {
    placedMfers = placedMfers.filter(pm => !hitStanding.has(pm));
  }

  if (mfers.length > 0) {
    updateScore();

    // Camera follows latest mfer's hips
    const latest = mfers[mfers.length - 1];
    const hipsBody = latest.ragdollBodies['hips'];
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
