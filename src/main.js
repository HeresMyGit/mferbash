import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
// mp4-muxer removed — using MediaRecorder instead
import createStairLevel from './levels/stairs.js';
import createTruckHitLevel from './levels/truckHit.js';
import createWreckingBallLevel from './levels/wreckingBall.js';
import createPachinkoLevel from './levels/pachinko.js';
import createPressLevel from './levels/press.js';
import createCannonLevel from './levels/cannon.js';
import createCannonball2Level from './levels/cannonball.js';
import { playImpact, playPop, playClick, playBoom, playHorn, playHiss, playCrush, playWreckingHit } from './sounds.js';

const MODEL_URL = 'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb';

// Tunable settings (updated by UI sliders)
const DEFAULTS = { gravity: 15, launchSpeed: 2, spin: 6, bounce: 0.3, damping: 2, dropHeight: 7, stairCount: 30, pachinkoDensity: 5, timeScale: 100 };
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

// Map metadata trait values to our TRAIT_MESH_MAPPING keys
const META_TO_TRAIT = {
  // type
  'plain mfer': { cat: 'type', val: 'plain' },
  'charcoal mfer': { cat: 'type', val: 'charcoal' },
  'zombie mfer': { cat: 'type', val: 'zombie' },
  'ape mfer': { cat: 'type', val: 'ape' },
  'alien mfer': { cat: 'type', val: 'alien' },
  'metal mfer': { cat: 'type', val: 'metal' },
  'based $mfer': { cat: 'type', val: 'based' },
  // eyes
  'regular eyes': { cat: 'eyes', val: 'regular' },
  'vr': { cat: 'eyes', val: 'vr' },
  'shades': { cat: 'eyes', val: 'shades' },
  'purple shades': { cat: 'eyes', val: 'purple_shades' },
  'nerd glasses': { cat: 'eyes', val: 'nerd' },
  'trippy': { cat: 'eyes', val: 'trippy' },
  'matrix': { cat: 'eyes', val: 'matrix' },
  '3d glasses': { cat: 'eyes', val: '3d' },
  'eye mask': { cat: 'eyes', val: 'eye_mask' },
  'eyepatch': { cat: 'eyes', val: 'eyepatch' },
  'zombie eyes': { cat: 'eyes', val: 'zombie' },
  'alien eyes': { cat: 'eyes', val: 'alien' },
  'red eyes': { cat: 'eyes', val: 'red' },
  'metal eyes': { cat: 'eyes', val: 'metal' },
  'mfercoin eyes': { cat: 'eyes', val: 'mfercoin' },
  // mouth
  'flat': { cat: 'mouth', val: 'flat' },
  'smile': { cat: 'mouth', val: 'smile' },
  // headphones
  'white headphones': { cat: 'headphones', val: 'white' },
  'red headphones': { cat: 'headphones', val: 'red' },
  'green headphones': { cat: 'headphones', val: 'green' },
  'pink headphones': { cat: 'headphones', val: 'pink' },
  'gold headphones': { cat: 'headphones', val: 'gold' },
  'blue headphones': { cat: 'headphones', val: 'blue' },
  'black headphones': { cat: 'headphones', val: 'black' },
  'lined headphones': { cat: 'headphones', val: 'lined' },
  'black square headphones': { cat: 'headphones', val: 'black_square' },
  'blue square headphones': { cat: 'headphones', val: 'blue_square' },
  'gold square headphones': { cat: 'headphones', val: 'gold_square' },
  // hat over headphones
  'cowboy hat': { cat: 'hat_over_headphones', val: 'cowboy' },
  'top hat': { cat: 'hat_over_headphones', val: 'top' },
  'pilot helmet': { cat: 'hat_over_headphones', val: 'pilot' },
  'hoodie gray': { cat: 'hat_over_headphones', val: 'hoodie_gray' },
  'hoodie pink': { cat: 'hat_over_headphones', val: 'hoodie_pink' },
  'hoodie red': { cat: 'hat_over_headphones', val: 'hoodie_red' },
  'hoodie blue': { cat: 'hat_over_headphones', val: 'hoodie_blue' },
  'hoodie white': { cat: 'hat_over_headphones', val: 'hoodie_white' },
  'hoodie green': { cat: 'hat_over_headphones', val: 'hoodie_green' },
  'larva mfer': { cat: 'hat_over_headphones', val: 'larva_mfer' },
  // hat under headphones
  'bandana dark gray': { cat: 'hat_under_headphones', val: 'bandana_dark_gray' },
  'bandana red': { cat: 'hat_under_headphones', val: 'bandana_red' },
  'bandana blue': { cat: 'hat_under_headphones', val: 'bandana_blue' },
  'knit kc': { cat: 'hat_under_headphones', val: 'knit_kc' },
  'knit las vegas': { cat: 'hat_under_headphones', val: 'knit_las_vegas' },
  'knit new york': { cat: 'hat_under_headphones', val: 'knit_new_york' },
  'knit san fran': { cat: 'hat_under_headphones', val: 'knit_san_fran' },
  'knit miami': { cat: 'hat_under_headphones', val: 'knit_miami' },
  'knit chicago': { cat: 'hat_under_headphones', val: 'knit_chicago' },
  'knit atlanta': { cat: 'hat_under_headphones', val: 'knit_atlanta' },
  'knit cleveland': { cat: 'hat_under_headphones', val: 'knit_cleveland' },
  'knit dallas': { cat: 'hat_under_headphones', val: 'knit_dallas' },
  'knit baltimore': { cat: 'hat_under_headphones', val: 'knit_baltimore' },
  'knit buffalo': { cat: 'hat_under_headphones', val: 'knit_buffalo' },
  'knit pittsburgh': { cat: 'hat_under_headphones', val: 'knit_pittsburgh' },
  'cap monochrome': { cat: 'hat_under_headphones', val: 'cap_monochrome' },
  'cap based blue': { cat: 'hat_under_headphones', val: 'cap_based_blue' },
  'cap purple': { cat: 'hat_under_headphones', val: 'cap_purple' },
  'beanie monochrome': { cat: 'hat_under_headphones', val: 'beanie_monochrome' },
  'beanie': { cat: 'hat_under_headphones', val: 'beanie' },
  'headband blue/green': { cat: 'hat_under_headphones', val: 'headband_blue_green' },
  'headband green/white': { cat: 'hat_under_headphones', val: 'headband_green_white' },
  'headband blue/red': { cat: 'hat_under_headphones', val: 'headband_blue_red' },
  'headband pink/white': { cat: 'hat_under_headphones', val: 'headband_pink_white' },
  'headband blue/white': { cat: 'hat_under_headphones', val: 'headband_blue_white' },
  // short hair
  'mohawk purple': { cat: 'short_hair', val: 'mohawk_purple' },
  'mohawk red': { cat: 'short_hair', val: 'mohawk_red' },
  'mohawk pink': { cat: 'short_hair', val: 'mohawk_pink' },
  'mohawk black': { cat: 'short_hair', val: 'mohawk_black' },
  'mohawk yellow': { cat: 'short_hair', val: 'mohawk_yellow' },
  'mohawk green': { cat: 'short_hair', val: 'mohawk_green' },
  'mohawk blue': { cat: 'short_hair', val: 'mohawk_blue' },
  'messy black': { cat: 'short_hair', val: 'messy_black' },
  'messy yellow': { cat: 'short_hair', val: 'messy_yellow' },
  'messy red': { cat: 'short_hair', val: 'messy_red' },
  'messy purple': { cat: 'short_hair', val: 'messy_purple' },
  // long hair
  'long hair yellow': { cat: 'long_hair', val: 'long_yellow' },
  'long hair black': { cat: 'long_hair', val: 'long_black' },
  'long hair curly': { cat: 'long_hair', val: 'long_curly' },
  // shirt
  'collared shirt pink': { cat: 'shirt', val: 'collared_pink' },
  'collared shirt green': { cat: 'shirt', val: 'collared_green' },
  'collared shirt yellow': { cat: 'shirt', val: 'collared_yellow' },
  'collared shirt white': { cat: 'shirt', val: 'collared_white' },
  'collared shirt turquoise': { cat: 'shirt', val: 'collared_turquoise' },
  'collared shirt blue': { cat: 'shirt', val: 'collared_blue' },
  'hoodie down red': { cat: 'shirt', val: 'hoodie_down_red' },
  'hoodie down pink': { cat: 'shirt', val: 'hoodie_down_pink' },
  'hoodie down white': { cat: 'shirt', val: 'hoodie_down_white' },
  'hoodie down green': { cat: 'shirt', val: 'hoodie_down_green' },
  'hoodie down gray': { cat: 'shirt', val: 'hoodie_down_gray' },
  'hoodie down blue': { cat: 'shirt', val: 'hoodie_down_blue' },
  // watch
  'sub blue': { cat: 'watch', val: 'sub_blue' },
  'sub lantern (green)': { cat: 'watch', val: 'sub_lantern_green' },
  'sub cola (blue/red)': { cat: 'watch', val: 'sub_cola' },
  'sub turquoise': { cat: 'watch', val: 'sub_turquoise' },
  'sub bat (blue/black)': { cat: 'watch', val: 'sub_bat' },
  'sub black': { cat: 'watch', val: 'sub_black' },
  'sub rose': { cat: 'watch', val: 'sub_rose' },
  'sub red': { cat: 'watch', val: 'sub_red' },
  'oyster silver': { cat: 'watch', val: 'oyster_silver' },
  'oyster gold': { cat: 'watch', val: 'oyster_gold' },
  'argo white': { cat: 'watch', val: 'argo_white' },
  'argo black': { cat: 'watch', val: 'argo_black' },
  'timex': { cat: 'watch', val: 'timex' },
  // chain
  'silver chain': { cat: 'chain', val: 'silver' },
  'gold chain': { cat: 'chain', val: 'gold' },
  'onchain': { cat: 'chain', val: 'onchain' },
  // beard
  'full beard': { cat: 'beard', val: 'full' },
  'flat beard': { cat: 'beard', val: 'flat' },
  // smoke
  'pipe': { cat: 'smoke', val: 'pipe' },
  'pipe brown': { cat: 'smoke', val: 'pipe_brown' },
  'cig white': { cat: 'smoke', val: 'cig_white' },
  'cig black': { cat: 'smoke', val: 'cig_black' },
};

const METADATA_URL = 'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/private/metadata/';
let mferIdMode = false; // false = random, true = use specific ID
let mferIdValue = null; // cached traits from metadata
let mferIdLoading = false;

async function fetchMferTraits(id) {
  try {
    mferIdLoading = true;
    const res = await fetch(METADATA_URL + id + '.json');
    const data = await res.json();
    const traits = {};
    for (const attr of data.attributes) {
      const key = attr.value.toLowerCase();
      const mapping = META_TO_TRAIT[key];
      if (mapping) {
        traits[mapping.cat] = mapping.val;
      }
    }
    // Ensure required traits have defaults
    if (!traits.type) traits.type = 'plain';
    if (!traits.eyes) traits.eyes = 'regular';
    if (!traits.mouth) traits.mouth = 'flat';
    if (!traits.headphones) traits.headphones = 'black';
    mferIdValue = traits;
    mferIdLoading = false;
    console.log('Loaded mfer #' + id + ':', traits);
    return traits;
  } catch (e) {
    console.warn('Failed to load mfer #' + id, e);
    mferIdLoading = false;
    return null;
  }
}

function applyAppearance(targetScene, traits) {
  const meshes = traitsToMeshes(traits);
  targetScene.traverse((child) => {
    if (child.isMesh) child.visible = meshes.has(child.name);
  });
}

function applyRandomAppearance(targetScene) {
  if (mferIdMode && mferIdValue) {
    applyAppearance(targetScene, mferIdValue);
    return;
  }
  const traits = generateRandomTraits();
  applyAppearance(targetScene, traits);
}

// Map accessory mesh names to which ragdoll segment drives their velocity when detached.
// Returns null for meshes that should stay on the body (hair, body, eyes, mouth, shirts, beard).
function getDetachSegment(name) {
  // Headphones
  if (name.startsWith('headphones'))  return 'head';
  // Eyewear (glasses, VR, eyepatch, eye mask, 3D glasses) — NOT the eyeballs themselves
  if (name.startsWith('eyes_glasses') || name.startsWith('eyes_vr') || name.startsWith('eyes_eye_') ||
      name.startsWith('eyes_glases_3d') || name.startsWith('eyes_glasses_3d')) return 'head';
  // Hats (all types)
  if (name.startsWith('hat_') || name.startsWith('cap_') || name.startsWith('headband_')) return 'head';
  if (name.startsWith('larmf'))       return 'head'; // larva mfer hat
  // Smoke / pipes
  if (name.startsWith('smoke'))       return 'head';
  // Watch
  if (name.startsWith('watch_'))      return 'leftForeArm';
  // Chain
  if (name.startsWith('chain_'))      return 'spine';
  // Keep on body: hair, beard, body, type, eyes (eyeballs), mouth, shirts, hoodie_up, shoes/gloves
  return null;
}

let impactShotTaken = false;
let pendingImpactMfer = null;
let pendingImpactFrames = 0;
// Video capture — MediaRecorder (Safari = MP4, Chrome = WebM)
let videoRecorder = null;
let videoChunks = [];
let videoUrl = null;
let videoExt = 'mp4';
let videoSettledTimer = 0;
let videoHasAction = false;
let videoRecording = false;

function startVideoRecording() {
  try {
    const stream = renderer.domElement.captureStream(30);
    // Safari supports MP4 natively, Chrome/FF use WebM
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    videoRecorder = new MediaRecorder(stream, { mimeType });
    videoChunks = [];
    videoExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
    videoRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunks.push(e.data);
        console.log('Video chunk:', e.data.size, 'bytes, total chunks:', videoChunks.length);
      }
    };
    videoRecorder.onstop = () => {
      const blob = new Blob(videoChunks, { type: mimeType });
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      videoUrl = URL.createObjectURL(blob);
      document.getElementById('impact-captures').style.display = 'block';
      document.getElementById('impact-full-video').style.display = 'block';
      console.log('Video ready:', videoExt, blob.size, 'bytes');
    };
    videoRecorder.start(100);
    videoRecording = true;
    videoSettledTimer = 0;
    videoHasAction = false;
    console.log('Recording started:', mimeType);
  } catch (e) {
    console.warn('Video recording failed:', e);
  }
}

function stopVideoRecording() {
  if (!videoRecording) return;
  videoRecording = false;
  if (videoRecorder && videoRecorder.state === 'recording') {
    videoRecorder.requestData(); // flush pending data
    videoRecorder.stop();
    console.log('Recording stopped');
  }
  // Don't null out videoRecorder here — onstop callback needs it
}

function checkVideoSettled() {
  if (!videoRecording) return;
  if (mfers.length === 0) return;

  let maxSpeed = 0;
  for (const mfer of mfers) {
    const hips = mfer.ragdollBodies['hips'];
    if (!hips) continue;
    const v = hips.linvel();
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (speed > maxSpeed) maxSpeed = speed;
  }

  // Wait until we've seen actual movement before checking for settlement
  if (maxSpeed > 2) videoHasAction = true;
  if (!videoHasAction) return;

  if (maxSpeed < 0.3) {
    videoSettledTimer += 1 / 60;
    if (videoSettledTimer > 1) {
      console.log('Video: mfers settled, stopping recording');
      stopVideoRecording();
    }
  } else {
    videoSettledTimer = 0;
  }
}

// GIF capture — frames stored raw, encoded only on user request
const GIF_FPS = 30;
const GIF_PRE = 1.5;
const GIF_POST = 3;
const GIF_W = 640, GIF_H = 400;
let gifFrameBuffer = [];
let gifFinalFrames = null;
let gifCapturing = false;
let gifPostFrames = 0;
let lastGifFrameTime = 0;
const gifCanvas = document.createElement('canvas');
gifCanvas.width = GIF_W;
gifCanvas.height = GIF_H;
const gifCtx = gifCanvas.getContext('2d', { willReadFrequently: true });

function captureImpactShot(mfer) {
  if (impactShotTaken) return;
  impactShotTaken = true;
  // Delay capture by a few frames so ragdoll bones have synced
  pendingImpactMfer = mfer;
  pendingImpactFrames = 3;
}

let impactPhotoMfer = null;

function doImpactCapture() {
  // Just store the mfer reference — photo rendered on demand when user clicks save
  impactPhotoMfer = pendingImpactMfer;
  pendingImpactMfer = null;
  document.getElementById('impact-captures').style.display = 'block';
  document.getElementById('impact-video-wrap').style.display = 'none';

  // Snapshot pre-impact frames, start collecting post-impact frames
  gifFinalFrames = [...gifFrameBuffer];
  gifCapturing = true;
  gifPostFrames = Math.round(GIF_POST * GIF_FPS);
}

function detachOneAccessory(mfer) {
  // Find one random visible detachable accessory
  const candidates = [];
  mfer.scene.traverse((child) => {
    if (child.isMesh && child.visible && getDetachSegment(child.name)) {
      candidates.push(child);
    }
  });
  if (candidates.length === 0) return false;

  const mesh = candidates[Math.floor(Math.random() * candidates.length)];
  const segName = getDetachSegment(mesh.name);
  mesh.visible = false;

  if (!mfer.detachedPieces) mfer.detachedPieces = [];

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

  const localCenter = new THREE.Vector3();
  bakedGeo.boundingBox.getCenter(localCenter);
  const pos = bakedGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) - localCenter.x, pos.getY(i) - localCenter.y, pos.getZ(i) - localCenter.z);
  }
  pos.needsUpdate = true;
  bakedGeo.computeBoundingSphere();

  const worldCenter = localCenter.applyMatrix4(mesh.matrixWorld);
  const wPos = new THREE.Vector3(), wQuat = new THREE.Quaternion(), wScale = new THREE.Vector3();
  mesh.matrixWorld.decompose(wPos, wQuat, wScale);

  const detached = new THREE.Mesh(bakedGeo, mesh.material);
  detached.position.copy(worldCenter);
  detached.quaternion.copy(wQuat);
  detached.scale.copy(wScale);
  detached.castShadow = true;
  detached.frustumCulled = false;
  scene.add(detached);

  const bboxSize = new THREE.Vector3();
  mesh.geometry.boundingBox || mesh.geometry.computeBoundingBox();
  mesh.geometry.boundingBox.getSize(bboxSize);
  bboxSize.multiplyScalar(0.5 * modelScale);
  const hx = Math.max(bboxSize.x, 0.02), hy = Math.max(bboxSize.y, 0.02), hz = Math.max(bboxSize.z, 0.02);

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(worldCenter.x, worldCenter.y, worldCenter.z)
    .setRotation({ x: wQuat.x, y: wQuat.y, z: wQuat.z, w: wQuat.w })
    .setLinearDamping(0.2).setAngularDamping(0.3);
  const body = world.createRigidBody(bodyDesc);
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setMass(0.3).setRestitution(0.5).setFriction(0.4), body);

  const segBody = mfer.ragdollBodies[segName];
  if (segBody) {
    const sv = segBody.linvel();
    const sa = segBody.angvel();
    body.setLinvel({
      x: sv.x * 0.4 + (Math.random() - 0.5) * 2,
      y: sv.y * 0.4 + Math.random() * 2 + 1,
      z: sv.z * 0.4 + (Math.random() - 0.5) * 2,
    }, true);
    body.setAngvel({
      x: sa.x * 0.3 + (Math.random() - 0.5) * 4,
      y: sa.y * 0.3 + (Math.random() - 0.5) * 4,
      z: sa.z * 0.3 + (Math.random() - 0.5) * 4,
    }, true);
  }

  mfer.detachedPieces.push({ mesh: detached, body, geo: bakedGeo });
  playPop();
  return true;
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

    // Inherit partial velocity from the body part + small random pop
    const segBody = mfer.ragdollBodies[segName];
    if (segBody) {
      const sv = segBody.linvel();
      const sa = segBody.angvel();
      body.setLinvel({
        x: sv.x * 0.4 + (Math.random() - 0.5) * 2,
        y: sv.y * 0.4 + Math.random() * 2 + 1,
        z: sv.z * 0.4 + (Math.random() - 0.5) * 2,
      }, true);
      body.setAngvel({
        x: sa.x * 0.3 + (Math.random() - 0.5) * 4,
        y: sa.y * 0.3 + (Math.random() - 0.5) * 4,
        z: sa.z * 0.3 + (Math.random() - 0.5) * 4,
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
let physicsAccum = 0;
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
let currentLevel = null;

// Game phases: 'placing' (click to place, shift+drag to set height) → 'playing' (go pressed, physics active)
let gamePhase = 'placing';
let placedMfers = [];        // idle mfers placed during placing phase: { scene, mixer }
let mfers = [];              // active ragdoll mfers
let savedSpawns = [];        // saved { x, y, z, rotY } for reset

// Camera
let orbitControls;
let cameraMode = 'near'; // 'near', 'standard', 'distant', 'free'
const CAM_MODES = ['near', 'standard', 'distant', 'free'];
const CAM_ZOOM = { near: 0.7, standard: 1, distant: 2 };
const keysDown = new Set();

function applyCameraZoom() {
  if (cameraMode === 'free') return;
  const cam = currentLevel.cameraStart;
  const zoom = CAM_ZOOM[cameraMode] || 1;
  const lx = cam.lookAt[0], ly = cam.lookAt[1], lz = cam.lookAt[2];
  camera.position.set(
    lx + (cam.pos[0] - lx) * zoom,
    ly + (cam.pos[1] - ly) * zoom,
    lz + (cam.pos[2] - lz) * zoom
  );
  camera.lookAt(lx, ly, lz);
}

// Raycasting + placement preview
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let ghostPreview = null;
let painting = false;
let lastPaintPos = null;
let lastPaintTime = 0;
let paintedThisClick = false;
const PAINT_MIN_DIST = 0.5;
const PAINT_MIN_TIME = 250; // minimum world-space distance between painted mfers

// === LOADING SCREEN: spinning sartoshi head ===
let loadingRenderer, loadingScene, loadingCamera, loadingHead, loadingAnimId;

function startLoadingScreen() {
  loadingRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  loadingRenderer.setSize(200, 200);
  loadingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  loadingRenderer.domElement.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-70%);z-index:25;';
  document.body.appendChild(loadingRenderer.domElement);

  loadingScene = new THREE.Scene();
  loadingCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
  loadingCamera.position.set(0, 1, 2.5);
  loadingCamera.lookAt(0, 0.8, 0);

  loadingScene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dl = new THREE.DirectionalLight(0xffffff, 1.5);
  dl.position.set(2, 3, 2);
  loadingScene.add(dl);

  const loader = new GLTFLoader();
  loader.load('/sartoshi-head.glb', (gltf) => {
    loadingHead = SkeletonUtils.clone(gltf.scene);
    loadingHead.scale.set(0.6, 0.6, 0.6);
    loadingHead.position.set(0, 0.9, 0);
    loadingHead.rotation.y = -Math.PI / 2;
    loadingScene.add(loadingHead);
  });

  function animateLoading() {
    loadingAnimId = requestAnimationFrame(animateLoading);
    if (loadingHead) loadingHead.rotation.y += 0.02;
    loadingRenderer.render(loadingScene, loadingCamera);
  }
  animateLoading();
}

function stopLoadingScreen() {
  if (loadingAnimId) cancelAnimationFrame(loadingAnimId);
  if (loadingRenderer) {
    document.body.removeChild(loadingRenderer.domElement);
    loadingRenderer.dispose();
    loadingRenderer = null;
  }
  loadingScene = null;
  loadingCamera = null;
  loadingHead = null;
}

async function init() {
  startLoadingScreen();
  await RAPIER.init();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 6, 14); // overridden after level build
  camera.lookAt(0, 4, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.physicallyCorrectLights = true;
  document.body.appendChild(renderer.domElement);

  // Orbit controls (disabled by default — enabled in free camera mode)
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.minDistance = 3;
  orbitControls.maxDistance = 50;
  orbitControls.maxPolarAngle = Math.PI * 0.85;
  orbitControls.target.set(0, 2, 0);
  orbitControls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  orbitControls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
  orbitControls.enabled = false;

  // Lights — dramatic three-point setup
  // Hemisphere: sky/ground bounce, strong enough to lift shadows on dark surfaces
  const hemi = new THREE.HemisphereLight(0x88bbee, 0x556633, 1.5);
  scene.add(hemi);

  // Ambient floor — ensures nothing goes pure black
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // Main sun — strong, warm, dramatic shadows
  const sun = new THREE.DirectionalLight(0xfff0d0, 3.0);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun);

  // Cool fill from opposite side — keeps shadows from going pure black
  const fill = new THREE.DirectionalLight(0x80a8cc, 1.2);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  // Back/rim light — adds edge definition
  const back = new THREE.DirectionalLight(0xffeedd, 0.8);
  back.position.set(-2, 8, -10);
  scene.add(back);

  // Physics
  world = new RAPIER.World({ x: 0, y: -settings.gravity, z: 0 });
  eventQueue = new RAPIER.EventQueue(true);

  currentLevel = getLevel(0);
  levelParts = currentLevel.build();
  updateLevelSliders(0);
  applyCameraZoom();
  await loadModel();

  ghostPreview = createGhostPreview();

  window.addEventListener('resize', onResize);
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.shiftKey) return;
    if (e.target.closest('#hud, #controls, #toggle-controls, #cam-toggle, #cam-hint, #impact-captures')) return;
    painting = true;
    lastPaintPos = null;
  });
  window.addEventListener('mousemove', (e) => {
    updateGhostPreview(e);
    if (painting && !e.shiftKey && gamePhase === 'placing') {
      const worldPos = getClickWorldPos(e);
      if (worldPos) {
        const now = performance.now();
        const far = !lastPaintPos || (lastPaintPos.distanceTo(worldPos) >= PAINT_MIN_DIST && now - lastPaintTime >= PAINT_MIN_TIME);
        if (far) {
          lastPaintPos = worldPos.clone();
          lastPaintTime = performance.now();
          const pm = spawnIdleMfer(worldPos);
          if (pm) {
            placedMfers.push(pm);
            savedSpawns.push({ x: worldPos.x, y: worldPos.y, z: worldPos.z, rotY: 0 });
          }
          const count = placedMfers.length + (gltfScene ? 1 : 0);
          document.getElementById('instructions').textContent = `${count} mfer${count > 1 ? 's' : ''} placed — click to add more`;
          document.getElementById('go-btn').style.display = 'block';
        }
      }
    }
  });
  window.addEventListener('mouseup', () => { painting = false; paintedThisClick = !!lastPaintPos; });
  window.addEventListener('click', onClick);
  // Touch handling: 1 finger = place, 2 fingers = camera
  let touchMode = null; // 'place', 'camera'
  let lastTouchX = 0, lastTouchY = 0;
  let lastPinchDist = 0;

  window.addEventListener('touchstart', (e) => {
    if (e.target !== renderer.domElement) return;
    e.preventDefault();

    if (e.touches.length === 1) {
      touchMode = 'place';
      painting = true;
      lastPaintPos = null;
      onClick(e);
    } else if (e.touches.length >= 2) {
      touchMode = 'camera';
      painting = false;
      const t0 = e.touches[0], t1 = e.touches[1];
      lastTouchX = (t0.clientX + t1.clientX) / 2;
      lastTouchY = (t0.clientY + t1.clientY) / 2;
      lastPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      // Auto-switch to free cam
      if (cameraMode !== 'free') {
        cameraMode = 'free';
        orbitControls.enabled = true;
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        orbitControls.target.set(camera.position.x + fwd.x * 5, camera.position.y + fwd.y * 5, camera.position.z + fwd.z * 5);
        document.getElementById('cam-toggle').textContent = 'cam: free';
        document.getElementById('cam-toggle').classList.add('active');
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (e.target !== renderer.domElement) return;
    e.preventDefault();

    if (touchMode === 'place' && e.touches.length === 1 && gamePhase === 'placing') {
      // Single finger drag — paint mfers
      const worldPos = getClickWorldPos(e);
      if (worldPos) {
        const now = performance.now();
        const far = !lastPaintPos || (lastPaintPos.distanceTo(worldPos) >= PAINT_MIN_DIST && now - lastPaintTime >= PAINT_MIN_TIME);
        if (far) {
          lastPaintPos = worldPos.clone();
          lastPaintTime = now;
          const pm = spawnIdleMfer(worldPos);
          if (pm) {
            placedMfers.push(pm);
            savedSpawns.push({ x: worldPos.x, y: worldPos.y, z: worldPos.z, rotY: 0 });
          }
        }
      }
    } else if (e.touches.length >= 2) {
      touchMode = 'camera';
      const t0 = e.touches[0], t1 = e.touches[1];
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const pinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

      // Two-finger drag = orbit (horizontal = rotate, vertical = tilt)
      const dx = midX - lastTouchX;
      const dy = midY - lastTouchY;
      camera.rotateY(-dx * 0.005);
      camera.rotateX(-dy * 0.005);

      // Pinch = zoom
      if (lastPinchDist > 0) {
        const scale = pinchDist / lastPinchDist;
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        camera.position.addScaledVector(fwd, (scale - 1) * 8);
      }

      // Update orbit target
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      orbitControls.target.set(camera.position.x + fwd.x * 5, camera.position.y + fwd.y * 5, camera.position.z + fwd.z * 5);

      lastTouchX = midX;
      lastTouchY = midY;
      lastPinchDist = pinchDist;
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    painting = false;
    if (e.touches.length < 2) {
      touchMode = null;
      lastPinchDist = 0;
    }
  });
  window.addEventListener('keydown', (e) => {
    keysDown.add(e.key.toLowerCase());
    if (e.key === 'b' || e.key === 'B') {
      showDebug = !showDebug;
      for (const m of mfers) for (const d of m.debugMeshes) d.mesh.visible = showDebug;
    }
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.key.toLowerCase()));
  // Camera mode toggle — cycles: near → standard → distant → free
  const camBtn = document.getElementById('cam-toggle');
  let camHintShown = false;
  camBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = CAM_MODES.indexOf(cameraMode);
    cameraMode = CAM_MODES[(idx + 1) % CAM_MODES.length];
    camBtn.textContent = 'cam: ' + cameraMode;

    if (cameraMode === 'free') {
      orbitControls.enabled = true;
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      orbitControls.target.set(camera.position.x + fwd.x * 5, camera.position.y + fwd.y * 5, camera.position.z + fwd.z * 5);
      camBtn.classList.add('active');
      if (!camHintShown) {
        camHintShown = true;
        const hint = document.getElementById('cam-hint');
        hint.style.display = 'block';
        setTimeout(() => { hint.style.display = 'none'; }, 4000);
      }
    } else {
      orbitControls.enabled = false;
      camBtn.classList.remove('active');
      applyCameraZoom();
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
  document.getElementById('clear-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearAll();
  });
  document.getElementById('impact-photo').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!impactPhotoMfer) return;
    const headBody = impactPhotoMfer.ragdollBodies['head'];
    if (!headBody) return;

    const hp = headBody.translation();
    const savedPos = camera.position.clone();
    const savedQuat = camera.quaternion.clone();

    const faceDir = new THREE.Vector3();
    camera.getWorldDirection(faceDir);
    camera.position.set(hp.x - faceDir.x * 2, hp.y + 0.5, hp.z - faceDir.z * 2);
    camera.lookAt(hp.x, hp.y, hp.z);
    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL('image/png');
    camera.position.copy(savedPos);
    camera.quaternion.copy(savedQuat);

    const link = document.createElement('a');
    link.download = 'mfer-bash-impact.png';
    link.href = dataUrl;
    link.click();
  });
  document.getElementById('impact-video-wrap').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gifFinalFrames || gifFinalFrames.length === 0) return;
    // Show encoding status
    const label = e.currentTarget.querySelector('div');
    const origText = label.textContent;
    label.textContent = 'encoding...';
    // Defer encoding to next frame so UI updates
    setTimeout(() => {
      const encoder = GIFEncoder();
      const delay = Math.round(1000 / GIF_FPS);
      for (const frame of gifFinalFrames) {
        const palette = quantize(frame, 256);
        const indexed = applyPalette(frame, palette);
        encoder.writeFrame(indexed, GIF_W, GIF_H, { palette, delay });
      }
      encoder.finish();
      const blob = new Blob([encoder.bytes()], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'mfer-bash.gif';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      label.textContent = origText;
    }, 50);
  });

  document.getElementById('impact-full-video').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.download = 'mfer-bash-full.' + videoExt;
    link.href = videoUrl;
    link.click();
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
  document.getElementById('hud').addEventListener('click', (e) => e.stopPropagation());
  document.getElementById('hud').addEventListener('touchstart', (e) => e.stopPropagation());

  // Wire up sliders
  const sliders = [
    { id: 'gravity',  key: 'gravity',     apply: (v) => world.gravity = { x: 0, y: -v, z: 0 } },
    { id: 'launch',   key: 'launchSpeed' },
    { id: 'spin',     key: 'spin' },
    { id: 'bounce',   key: 'bounce' },
    { id: 'damping',  key: 'damping' },
    { id: 'timescale', key: 'timeScale', format: v => v + '%' },
    { id: 'stairs',   key: 'stairCount',  apply: () => {
      if (currentLevelIndex === 0) switchLevel(0);
    }},
    { id: 'pachinko', key: 'pachinkoDensity', apply: () => {
      if (currentLevelIndex === 3) switchLevel(3);
    }},
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
      valEl.textContent = sl.format ? sl.format(v) : (v % 1 === 0 ? v : v.toFixed(1));
      if (sl.apply) sl.apply(v);
    });
  }
  document.getElementById('defaults-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    Object.assign(settings, DEFAULTS);
    if (currentLevel.settingsOverrides) Object.assign(settings, currentLevel.settingsOverrides);
    for (const sl of sliders) {
      const input = document.getElementById(`sl-${sl.id}`);
      const valEl = document.getElementById(`v-${sl.id}`);
      const v = settings[sl.key];
      input.value = v;
      valEl.textContent = sl.format ? sl.format(v) : (v % 1 === 0 ? v : v.toFixed(1));
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

  // Mfer ID toggle
  const mferModeBtn = document.getElementById('mfer-mode-btn');
  const mferIdInput = document.getElementById('mfer-id-input');
  mferModeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mferIdMode = !mferIdMode;
    mferModeBtn.textContent = mferIdMode ? 'id #' : 'random';
    mferIdInput.style.display = mferIdMode ? '' : 'none';
    if (!mferIdMode) mferIdValue = null;
  });
  mferIdInput.addEventListener('click', (e) => e.stopPropagation());
  mferIdInput.addEventListener('touchstart', (e) => e.stopPropagation());
  let mferIdTimeout = null;
  mferIdInput.addEventListener('input', (e) => {
    clearTimeout(mferIdTimeout);
    const id = parseInt(e.target.value);
    if (isNaN(id) || id < 0 || id > 10020) return;
    mferIdTimeout = setTimeout(async () => {
      await fetchMferTraits(id);
      // Update the idle mfer if it hasn't been placed yet
      if (mferIdValue && gltfScene) applyAppearance(gltfScene, mferIdValue);
    }, 300);
  });

  stopLoadingScreen();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('go-btn').style.display = 'block';
  document.getElementById('instructions').textContent = 'click to place, shift+drag to set height';
  animate();
}


const LEVEL_FACTORIES = [createTruckHitLevel, createStairLevel, createWreckingBallLevel, createPachinkoLevel, createPressLevel, createCannonLevel, createCannonball2Level];

function getLevelCtx() {
  return {
    scene, world, settings, modelScale, modelCenter,
    get placedMfers() { return placedMfers; },
    set placedMfers(v) { placedMfers = v; },
    get mfers() { return mfers; },
    createRagdoll, captureImpactShot, detachAccessories,
    playImpact, playBoom, playHorn, playHiss, playCrush, playWreckingHit,
  };
}

function getLevel(i) { return LEVEL_FACTORIES[i](getLevelCtx()); }

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

function updateLevelSliders(index) {
  document.querySelectorAll('#controls label[data-level]').forEach(label => {
    label.style.display = parseInt(label.dataset.level) === index ? '' : 'none';
  });
}

function switchLevel(index) {
  // Clean up placed idle mfers
  for (const pm of placedMfers) { if (pm.mixer) pm.mixer.stopAllAction(); if (pm.triggerBody) world.removeRigidBody(pm.triggerBody); scene.remove(pm.scene); }
  placedMfers = [];
  savedSpawns = [];
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
  currentLevel = getLevel(index);
  levelParts = currentLevel.build();

  // Apply level settings overrides
  if (currentLevel.settingsOverrides) Object.assign(settings, DEFAULTS, currentLevel.settingsOverrides);

  // Set spawn position
  const sp = currentLevel.spawnPos;
  originalPos.set(sp.x - modelCenter.x * modelScale, sp.y, sp.z - modelCenter.z * modelScale);

  // Camera
  applyCameraZoom();

  // Spawn idle mfer
  if (originalGltf) {
    const cloned = SkeletonUtils.clone(originalGltf.scene);
    cloned.traverse(c => { if (c.isMesh) { c.visible = false; c.castShadow = true; c.receiveShadow = true; c.frustumCulled = false; } });
    applyRandomAppearance(cloned);
    cloned.scale.setScalar(modelScale);
    cloned.position.copy(originalPos);
    if (currentLevel.spawnRotX) cloned.rotation.x = currentLevel.spawnRotX;
    if (currentLevel.spawnRotY) cloned.rotation.y = currentLevel.spawnRotY;
    if (currentLevel.spawnRotZ) cloned.rotation.z = currentLevel.spawnRotZ;
    cloned.traverse(c => { if (c.isBone) { c.userData.origPos = c.position.clone(); c.userData.origQuat = c.quaternion.clone(); c.userData.origScale = c.scale.clone(); } });
    scene.add(cloned);
    gltfScene = cloned;
    mixer = new THREE.AnimationMixer(cloned);
    const idle = originalGltf.animations.find(a => a.name.toLowerCase().includes('idle')) || originalGltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
  }

  // Update level selector buttons + level-specific sliders
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === index);
  });
  updateLevelSliders(index);

  settled = false;
  document.getElementById('instructions').textContent = 'click to place, shift+drag to set height';
  document.getElementById('score').textContent = '';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('clear-btn').style.display = 'none';
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

      // Position from level's spawn point
      const sp = currentLevel.spawnPos;
      cloned.position.set(
        sp.x - modelCenter.x * modelScale,
        sp.y,
        sp.z - modelCenter.z * modelScale
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
      const cappedPct = progress.total > 0 ? Math.min(69, Math.round((progress.loaded / progress.total) * 69)) : '...';
      document.getElementById('loading').textContent = `loading mfer... ${cappedPct}%`;
    },
    reject);
  });
}

function createRagdoll(targetScene) {
  if (!targetScene) return null;

  const mfer = { scene: targetScene, ragdollBodies: {}, ragdollJointRefs: [], ragdollSegData: {}, ragdollActive: false, debugMeshes: [], skipSync: 2 };

  // Ensure skeleton world matrices are current (animation still active)
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
  const speed = settings.launchSpeed * (4.5 + Math.random() * 3);
  if (speed < 0.1) return; // no launch if speed is ~0
  const vel = {
    x: -speed - 6,
    y: -3,
    z: (Math.random() - 0.5) * 4
  };
  for (const body of Object.values(mfer.ragdollBodies)) {
    body.setLinvel(vel, true);
    body.setAngvel({ x: 0, y: 0, z: -(6 + Math.random() * 6) }, true);
  }
}

// Reusable temp objects for bone sync
const _tp = new THREE.Vector3(), _tq = new THREE.Quaternion(), _bq = new THREE.Quaternion();
const _off = new THREE.Vector3(), _pi = new THREE.Matrix4(), _dw = new THREE.Matrix4();
const _lm = new THREE.Matrix4(), _lp = new THREE.Vector3(), _lq = new THREE.Quaternion(), _ls = new THREE.Vector3();

function syncRagdollBones(mfer) {
  // Skip first frames so the animated pose holds (no T-pose flash)
  if (mfer.skipSync > 0) { mfer.skipSync--; return; }

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

  // Raycast against level geometry for terrain-aware placement
  if (levelParts && levelParts.staticMeshes.length > 0) {
    const hits = raycaster.intersectObjects(levelParts.staticMeshes, false);
    if (hits.length > 0) return hits[0].point.clone();
  }

  // Fallback to ground plane
  const gy = currentLevel?.groundY ?? 1;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -gy);
  const hitPoint = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
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
  // Direction arrow (cone pointing forward)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.6 });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), arrowMat);
  arrow.rotation.x = Math.PI / 2; // point along Z
  arrow.position.set(0, 0.02, 0.5);
  group.add(arrow);
  group.visible = false;
  scene.add(group);
  return group;
}

function getShiftHeight(e) {
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  // Project the ghost's current position to screen to find baseline
  const groundProj = ghostPreview.position.clone();
  const baseY = groundProj.y; // current terrain height
  groundProj.project(camera);
  const groundScreenY = (1 - groundProj.y) / 2 * window.innerHeight;

  // Height = how far mouse is above that baseline (positive = up)
  const delta = groundScreenY - clientY;
  return baseY + Math.max(0, delta * 0.03);
}

function updateGhostPreview(e) {
  if (gamePhase !== 'placing' || !ghostPreview) return;
  // Hide when hovering over UI
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el && el.closest('#hud, #controls, #toggle-controls, #cam-toggle, #impact-captures')) {
    ghostPreview.visible = false;
    return;
  }
  const worldPos = getClickWorldPos(e);
  if (worldPos) {
    const hit = worldPos;
    if (e.shiftKey) {
      // Lock X/Z, height from mouse Y, rotation from mouse X
      hit.y = getShiftHeight(e);
      ghostPreview.position.y = hit.y;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rx = (clientX / window.innerWidth) * 2 - 1; // -1 to 1
      ghostPreview.rotation.y = rx * Math.PI; // full 360 range
    } else {
      ghostPreview.position.set(hit.x, hit.y, hit.z);
      ghostPreview.rotation.y = 0;
    }
    ghostPreview.visible = true;
  }
}

function spawnIdleMfer(worldPos, rot) {
  if (!originalGltf) return null;

  const cloned = SkeletonUtils.clone(originalGltf.scene);
  cloned.traverse((child) => {
    if (child.isMesh) { child.visible = false; child.castShadow = true; child.receiveShadow = true; child.frustumCulled = false; }
  });
  applyRandomAppearance(cloned);
  cloned.scale.setScalar(modelScale);
  cloned.position.set(worldPos.x - modelCenter.x * modelScale, worldPos.y, worldPos.z - modelCenter.z * modelScale);
  if (typeof rot === 'number') {
    cloned.rotation.y = rot;
  } else if (rot) {
    if (rot.x) cloned.rotation.x = rot.x;
    if (rot.y) cloned.rotation.y = rot.y;
    if (rot.z) cloned.rotation.z = rot.z;
  } else if (currentLevel && currentLevel.spawnRotY) {
    // Apply level's default facing if no explicit rotation
    cloned.rotation.y = currentLevel.spawnRotY;
  }

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
  const curLevel = currentLevel;
  const gy = curLevel.groundY ?? 1;

  // Move initial idle mfer into placedMfers
  if (gltfScene) {
    const ix = gltfScene.position.x + modelCenter.x * modelScale;
    const iy = gltfScene.position.y;
    const iz = gltfScene.position.z + modelCenter.z * modelScale;
    if (!savedSpawns.some(s => s.isLauncher)) {
      savedSpawns.unshift({ x: ix, y: iy, z: iz, rotX: gltfScene.rotation.x, rotY: gltfScene.rotation.y, rotZ: gltfScene.rotation.z, isLauncher: true });
    }
    placedMfers.push({ scene: gltfScene, mixer, isLauncher: true });
    gltfScene = null;
    mixer = null;
  }

  if (curLevel.keepIdleUntilImpact) {
    // Keep all idle — level handles ragdoll on impact (e.g. truck)
    return;
  }

  // Find the launcher position for proximity check
  const launcherPm = placedMfers.find(pm => pm.isLauncher);
  let launcherPos = null;
  if (launcherPm) {
    launcherPos = new THREE.Vector3(
      launcherPm.scene.position.x + modelCenter.x * modelScale,
      launcherPm.scene.position.y,
      launcherPm.scene.position.z + modelCenter.z * modelScale
    );
  }
  const LAUNCH_RADIUS = 4; // mfers within this distance of launcher also get launched

  // Activate placed mfers
  const staying = [];
  for (const pm of placedMfers) {
    // Check if this mfer should be launched (is the launcher, or close to it)
    let shouldLaunch = pm.isLauncher;
    if (!shouldLaunch && launcherPos) {
      const mx = pm.scene.position.x + modelCenter.x * modelScale;
      const my = pm.scene.position.y;
      const mz = pm.scene.position.z + modelCenter.z * modelScale;
      const dist = Math.sqrt((mx - launcherPos.x) ** 2 + (my - launcherPos.y) ** 2 + (mz - launcherPos.z) ** 2);
      shouldLaunch = dist < LAUNCH_RADIUS;
    }

    if (shouldLaunch) {
      // Launch this mfer
      const mfer = createRagdoll(pm.scene);
      if (mfer) {
        applyLaunchVelocity(mfer);
        mfer.ragdollActive = true;
        mfer.detachAfter = performance.now() + 400;
        mfers.push(mfer);
      }
    } else {
      // On ground: keep idle animation, add solid trigger capsule
      // Mfer stays standing until something collides with it
      const cx = pm.scene.position.x + modelCenter.x * modelScale;
      const cy = pm.scene.position.y + 1.25; // center of mfer at its actual height
      const cz = pm.scene.position.z + modelCenter.z * modelScale;
      const tb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
      const tc = world.createCollider(
        RAPIER.ColliderDesc.capsule(0.5, 0.2).setRestitution(0.3).setFriction(0.5)
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
  if (e.target.closest('#hud, #controls, #toggle-controls, #cam-toggle, #cam-hint, #impact-captures')) return;
  if (paintedThisClick) { paintedThisClick = false; return; }

  if (gamePhase === 'placing') {
    let worldPos, rotY;
    if (e.shiftKey && ghostPreview) {
      // Use ghost's locked X/Z, height, and rotation
      worldPos = ghostPreview.position.clone();
      worldPos.y = getShiftHeight(e);
      rotY = ghostPreview.rotation.y;
    } else {
      worldPos = getClickWorldPos(e);
      if (!worldPos) return;
    }

    if (gltfScene) {
      // First click: lock in the initial mfer, don't spawn a second one
      const ix = gltfScene.position.x + modelCenter.x * modelScale;
      const iy = gltfScene.position.y;
      const iz = gltfScene.position.z + modelCenter.z * modelScale;
      savedSpawns.push({ x: ix, y: iy, z: iz, rotX: gltfScene.rotation.x, rotY: gltfScene.rotation.y, rotZ: gltfScene.rotation.z, isLauncher: true });
      placedMfers.push({ scene: gltfScene, mixer, isLauncher: true });
      gltfScene = null;
      mixer = null;
    } else {
      // Subsequent clicks: spawn new mfer at click position
      const pm = spawnIdleMfer(worldPos, rotY);
      if (pm) {
        placedMfers.push(pm);
        savedSpawns.push({ x: worldPos.x, y: worldPos.y, z: worldPos.z, rotY: rotY || 0 });
      }
    }

    const count = placedMfers.length;
    document.getElementById('instructions').textContent = `${count} mfer${count > 1 ? 's' : ''} placed — click to add more`;
  } else {
    // Playing phase: spawn and immediately ragdoll at click position
    const worldPos = getClickWorldPos(e);
    if (e.shiftKey && worldPos) worldPos.y = getShiftHeight(e);
    if (!worldPos) return;
    const pm = spawnIdleMfer(worldPos);
    if (pm) {
      const mfer = createRagdoll(pm.scene);
      if (mfer) mfers.push(mfer);
    }
  }
}

function onGo() {
  playClick();
  gamePhase = 'playing';
  if (ghostPreview) ghostPreview.visible = false;
  impactShotTaken = false;
  impactPhotoMfer = null;
  gifFrameBuffer = [];
  gifFinalFrames = null;
  gifCapturing = false;
  // Kill any previous recording
  videoRecording = false;
  if (videoRecorder && videoRecorder.state === 'recording') { try { videoRecorder.stop(); } catch(e) {} }
  videoRecorder = null;
  videoChunks = [];
  if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }
  document.getElementById('impact-captures').style.display = 'none';
  document.getElementById('impact-full-video').style.display = 'none';
  document.getElementById('impact-video-wrap').style.display = 'none';
  // Start fresh recording
  startVideoRecording();
  document.getElementById('go-btn').style.display = 'none';
  document.getElementById('reset-btn').style.display = 'block';
  document.getElementById('clear-btn').style.display = 'block';
  document.getElementById('instructions').textContent = '';

  settled = false;
  settledTimer = 0;
  impactScore = 0;
  maxVelocity = 0;

  activateAllMfers();

  // Notify level (e.g. starts the truck)
  const level = currentLevel;
  if (level.onDrop && levelParts) level.onDrop(levelParts);
}

function cleanupMfers() {
  for (const mfer of mfers) {
    for (const joint of mfer.ragdollJointRefs) world.removeImpulseJoint(joint, true);
    for (const body of Object.values(mfer.ragdollBodies)) world.removeRigidBody(body);
    for (const d of mfer.debugMeshes) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }
    if (mfer.detachedPieces) {
      for (const piece of mfer.detachedPieces) { world.removeRigidBody(piece.body); scene.remove(piece.mesh); piece.geo.dispose(); }
    }
    scene.remove(mfer.scene);
  }
  mfers = [];
  for (const pm of placedMfers) {
    if (pm.mixer) pm.mixer.stopAllAction();
    if (pm.triggerBody) world.removeRigidBody(pm.triggerBody);
    scene.remove(pm.scene);
  }
  placedMfers = [];
}

function reset() {
  cleanupMfers();
  gamePhase = 'placing';
  if (cameraMode === 'free') {
    cameraMode = 'near';
    orbitControls.enabled = false;
    document.getElementById('cam-toggle').textContent = 'cam: near';
    document.getElementById('cam-toggle').classList.remove('active');
  }

  // Re-create all mfers at their saved spawn positions
  for (const sp of savedSpawns) {
    const pm = spawnIdleMfer({ x: sp.x, y: sp.y, z: sp.z }, { x: sp.rotX, y: sp.rotY, z: sp.rotZ });
    if (pm) {
      if (sp.isLauncher) pm.isLauncher = true;
      placedMfers.push(pm);
    }
  }

  // Create the default idle mfer if no saved spawns (first load)
  if (savedSpawns.length === 0 && originalGltf) {
    const cloned = SkeletonUtils.clone(originalGltf.scene);
    cloned.traverse((child) => {
      if (child.isMesh) { child.visible = false; child.castShadow = true; child.receiveShadow = true; child.frustumCulled = false; }
    });
    applyRandomAppearance(cloned);
    cloned.scale.setScalar(modelScale);
    cloned.position.copy(originalPos);
    if (currentLevel.spawnRotX) cloned.rotation.x = currentLevel.spawnRotX;
    if (currentLevel.spawnRotY) cloned.rotation.y = currentLevel.spawnRotY;
    if (currentLevel.spawnRotZ) cloned.rotation.z = currentLevel.spawnRotZ;
    cloned.traverse((child) => {
      if (child.isBone) { child.userData.origPos = child.position.clone(); child.userData.origQuat = child.quaternion.clone(); child.userData.origScale = child.scale.clone(); }
    });
    scene.add(cloned);
    gltfScene = cloned;
    mixer = new THREE.AnimationMixer(cloned);
    const idle = originalGltf.animations.find(a => a.name.toLowerCase().includes('idle')) || originalGltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
  }

  // Reset dynamic parts (bricks, crates, barrels) to initial positions
  if (levelParts) {
    for (const dp of levelParts.dynamicParts) {
      if (dp.initPos) {
        dp.body.setTranslation(dp.initPos, true);
        dp.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        dp.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        dp.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        dp.mesh.position.set(dp.initPos.x, dp.initPos.y, dp.initPos.z);
        dp.mesh.quaternion.set(0, 0, 0, 1);
      }
    }
  }

  // Reset level-specific state (e.g. truck position)
  if (levelParts && levelParts.reset) levelParts.reset();

  // Recalculate spawn position from current level (stair count may have changed)
  const sp = currentLevel.spawnPos;
  originalPos.set(sp.x - modelCenter.x * modelScale, sp.y, sp.z - modelCenter.z * modelScale);

  settled = false;
  document.getElementById('instructions').textContent = 'click to place, shift+drag to set height';
  document.getElementById('score').textContent = '';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('clear-btn').style.display = 'none';
  document.getElementById('go-btn').style.display = 'block';
  applyCameraZoom();
}

function clearAll() {
  cleanupMfers();
  savedSpawns = [];
  gamePhase = 'placing';

  // Remove old idle mfer if any
  if (gltfScene) { scene.remove(gltfScene); gltfScene = null; mixer = null; }

  // Spawn fresh default idle mfer
  if (originalGltf) {
    const cloned = SkeletonUtils.clone(originalGltf.scene);
    cloned.traverse(c => { if (c.isMesh) { c.visible = false; c.castShadow = true; c.receiveShadow = true; c.frustumCulled = false; } });
    applyRandomAppearance(cloned);
    cloned.scale.setScalar(modelScale);
    cloned.position.copy(originalPos);
    if (currentLevel.spawnRotX) cloned.rotation.x = currentLevel.spawnRotX;
    if (currentLevel.spawnRotY) cloned.rotation.y = currentLevel.spawnRotY;
    if (currentLevel.spawnRotZ) cloned.rotation.z = currentLevel.spawnRotZ;
    cloned.traverse(c => { if (c.isBone) { c.userData.origPos = c.position.clone(); c.userData.origQuat = c.quaternion.clone(); c.userData.origScale = c.scale.clone(); } });
    scene.add(cloned);
    gltfScene = cloned;
    mixer = new THREE.AnimationMixer(cloned);
    const idle = originalGltf.animations.find(a => a.name.toLowerCase().includes('idle')) || originalGltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
  }

  // Reset dynamic parts
  if (levelParts) {
    for (const dp of levelParts.dynamicParts) {
      if (dp.initPos) {
        dp.body.setTranslation(dp.initPos, true);
        dp.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        dp.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        dp.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        dp.mesh.position.set(dp.initPos.x, dp.initPos.y, dp.initPos.z);
        dp.mesh.quaternion.set(0, 0, 0, 1);
      }
    }
    if (levelParts.reset) levelParts.reset();
  }

  settled = false;
  document.getElementById('instructions').textContent = 'click to place, shift+drag to set height';
  document.getElementById('score').textContent = '';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('clear-btn').style.display = 'none';
  document.getElementById('go-btn').style.display = 'block';
  applyCameraZoom();
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
  const rawDelta = Math.min((now - lastTime) / 1000, 0.05);
  const delta = rawDelta * (settings.timeScale / 100);
  lastTime = now;

  if (mixer && gltfScene) mixer.update(delta);
  for (const pm of placedMfers) { if (pm.mixer) pm.mixer.update(delta); }

  // Step physics with fixed timestep accumulator (frame-rate independent)
  const PHYSICS_DT = 1 / 60;
  const timeScale = settings.timeScale / 100;
  physicsAccum += rawDelta * timeScale;
  const maxSteps = 4; // cap to prevent spiral of death
  let steps = 0;
  world.timestep = PHYSICS_DT;
  while (physicsAccum >= PHYSICS_DT && steps < maxSteps) {
    world.step(eventQueue);
    physicsAccum -= PHYSICS_DT;
    steps++;
  }
  if (physicsAccum > PHYSICS_DT * 2) physicsAccum = 0; // reset if too far behind

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

    // Gradual accessory detach — velocity-based chance per frame
    if (mfer.canDetach) {
      const hips = mfer.ragdollBodies['hips'];
      if (hips) {
        const v = hips.linvel();
        const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        // Higher speed = higher chance. At speed 10+, ~15% per frame. At speed 2, ~3%.
        const chance = Math.min(0.15, speed * 0.015);
        if (Math.random() < chance) {
          if (!detachOneAccessory(mfer)) mfer.canDetach = false; // no more to detach
        }
      }
    }
  }

  // Drain collision events — activate ragdolls + convert standing mfers on hit
  const hitStanding = new Set();
  eventQueue.drainCollisionEvents((h1, h2, started) => {
    if (!started) return;
    // Activate falling ragdolls (pre-impact → post-impact)
    for (const mfer of mfers) {
      if (mfer.ragdollActive) {
        // Already active — play collision sound based on velocity
        const hb = mfer.ragdollBodies['hips'];
        if (hb && (!mfer.lastImpactSound || performance.now() - mfer.lastImpactSound > 150)) {
          const v = hb.linvel();
          const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
          if (speed > 1) {
            playImpact(speed);
            mfer.lastImpactSound = performance.now();
          }
        }
        continue;
      }
      mfer.ragdollActive = true;
      captureImpactShot(mfer);
      playImpact(12);
      const hb = mfer.ragdollBodies['hips'];
      if (hb) {
        const s = settings.spin;
        hb.setAngvel({ x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s * 0.5, z: (Math.random() - 0.5) * s }, true);
      }
      mfer.canDetach = true;
    }
    // Check if any standing mfer's trigger capsule got hit
    for (const pm of placedMfers) {
      if (pm.triggerHandle !== undefined && (h1 === pm.triggerHandle || h2 === pm.triggerHandle)) {
        hitStanding.add(pm);
      }
    }
    // Deferred accessory detach (launched mfers — detach after timer)
    const now = performance.now();
    for (const mfer of mfers) {
      if (mfer.detachAfter && now >= mfer.detachAfter) {
        mfer.detachAfter = null;
        captureImpactShot(mfer);
        mfer.canDetach = true;
      }
    }
    // Level-specific collision handling
    if (currentLevel.onCollision && levelParts) currentLevel.onCollision(levelParts, h1, h2);
  });

  // Proximity-based standing mfer activation — track what hit them for velocity transfer
  const hitByMap = new Map(); // pm -> hitting mfer's hips velocity
  for (const mfer of mfers) {
    const hipsBody = mfer.ragdollBodies['hips'];
    if (!hipsBody) continue;
    const hp = hipsBody.translation();
    const hv = hipsBody.linvel();
    for (const pm of placedMfers) {
      if (!pm.triggerBody || hitStanding.has(pm)) continue;
      const tp = pm.triggerBody.translation();
      const dist = Math.sqrt((hp.x - tp.x) ** 2 + (hp.y - tp.y) ** 2 + (hp.z - tp.z) ** 2);
      if (dist < 1.0) {
        hitStanding.add(pm);
        hitByMap.set(pm, { x: hv.x, y: hv.y, z: hv.z });
      }
    }
  }

  for (const pm of hitStanding) {
    world.removeRigidBody(pm.triggerBody);
    const mfer = createRagdoll(pm.scene);
    if (mfer) {
      mfer.ragdollActive = true;
      mfer.canDetach = true;
      captureImpactShot(mfer);
      // Transfer velocity from whatever hit this mfer
      playImpact(6);
      const hitVel = hitByMap.get(pm);
      if (hitVel) {
        for (const body of Object.values(mfer.ragdollBodies)) {
          body.setLinvel({
            x: hitVel.x * 0.5 + (Math.random() - 0.5) * 2,
            y: Math.abs(hitVel.y) * 0.3 + 2 + Math.random() * 2,
            z: hitVel.z * 0.5 + (Math.random() - 0.5) * 3,
          }, true);
          body.setAngvel({
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 6,
            z: (Math.random() - 0.5) * 8,
          }, true);
        }
      }
      mfers.push(mfer);
    }
  }
  if (hitStanding.size > 0) {
    placedMfers = placedMfers.filter(pm => !hitStanding.has(pm));
  }

  if (mfers.length > 0) {
    // updateScore(); // disabled for now
    checkVideoSettled();

    if (cameraMode !== 'free') {
      // Camera follows latest mfer's hips with zoom level
      const latest = mfers[mfers.length - 1];
      const hipsBody = latest.ragdollBodies['hips'];
      if (hipsBody) {
        const pos = hipsBody.translation();
        const vel = hipsBody.linvel();
        const camFollow = currentLevel.cameraFollow || { offX: 3, offY: 3.5, offZ: 10, minY: 3 };
        const zoom = CAM_ZOOM[cameraMode] || 1;
        const lookAheadX = vel.x * 0.15;
        const camTargetX = pos.x + camFollow.offX * zoom + lookAheadX;
        const camTargetY = Math.max(pos.y + camFollow.offY * zoom, camFollow.minY);
        const camTargetZ = pos.z + camFollow.offZ * zoom;

        camera.position.x += (camTargetX - camera.position.x) * 0.08;
        camera.position.y += (camTargetY - camera.position.y) * 0.1;
        camera.position.z += (camTargetZ - camera.position.z) * 0.08;
        camera.lookAt(pos.x, pos.y, pos.z);
      }
    }
  }

  // WASD+QE camera movement
  if (keysDown.size > 0) {
    const speed = 8 * rawDelta;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const rotSpeed = 1.5 * rawDelta;
    if (keysDown.has('w') || keysDown.has('arrowup')) { camera.position.addScaledVector(forward, speed); }
    if (keysDown.has('s') || keysDown.has('arrowdown')) { camera.position.addScaledVector(forward, -speed); }
    if (keysDown.has('a') || keysDown.has('arrowleft')) { camera.position.addScaledVector(right, -speed); }
    if (keysDown.has('d') || keysDown.has('arrowright')) { camera.position.addScaledVector(right, speed); }
    if (keysDown.has('z')) { camera.position.y -= speed; }
    if (keysDown.has('x')) { camera.position.y += speed; }
    if (keysDown.has('q')) { camera.rotateY(rotSpeed); }
    if (keysDown.has('e')) { camera.rotateY(-rotSpeed); }

    // Recalculate forward after rotation
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);

    const moveKeys = ['w','a','s','d','q','e','z','x','arrowup','arrowdown','arrowleft','arrowright'];
    if (cameraMode !== 'free' && moveKeys.some(k => keysDown.has(k))) {
      cameraMode = 'free';
      orbitControls.enabled = true;
      document.getElementById('cam-toggle').textContent = 'cam: free';
      document.getElementById('cam-toggle').classList.add('active');
    }
    if (orbitControls.enabled) {
      orbitControls.target.set(camera.position.x + fwd.x * 5, camera.position.y + fwd.y * 5, camera.position.z + fwd.z * 5);
    }
  }

  // Delayed impact photo capture (after bones have synced)
  if (pendingImpactMfer && --pendingImpactFrames <= 0) doImpactCapture();

  if (cameraMode === 'free') orbitControls.update();
  renderer.render(scene, camera);

  // GIF frame capture — just buffer raw frames, encode on demand
  if (gamePhase === 'playing') {
    const gifInterval = 1000 / GIF_FPS;
    if (now - lastGifFrameTime >= gifInterval) {
      lastGifFrameTime = now;
      // Crop center 50% of canvas for a closer view
      const sw = renderer.domElement.width, sh = renderer.domElement.height;
      const cx = sw * 0.25, cy = sh * 0.25, cw = sw * 0.5, ch = sh * 0.5;
      gifCtx.drawImage(renderer.domElement, cx, cy, cw, ch, 0, 0, GIF_W, GIF_H);
      const frameData = new Uint8Array(gifCtx.getImageData(0, 0, GIF_W, GIF_H).data);

      if (gifCapturing) {
        // Post-impact: add to final frames
        gifFinalFrames.push(frameData);
        gifPostFrames--;
        if (gifPostFrames <= 0) {
          gifCapturing = false;
          // Show "save gif" button (encoding happens on click)
          document.getElementById('impact-video-wrap').style.display = 'block';
        }
      } else if (!impactShotTaken) {
        // Pre-impact: rolling buffer
        const maxFrames = Math.round(GIF_PRE * GIF_FPS);
        gifFrameBuffer.push(frameData);
        while (gifFrameBuffer.length > maxFrames) gifFrameBuffer.shift();
      }
    }
  }
}

init().then(() => {
  console.log('mfer bash loaded!');
}).catch(err => {
  console.error('Failed to init:', err);
  document.getElementById('loading').textContent = 'failed to load :(';
});
