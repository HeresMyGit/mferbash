# mfer bash

Ragdoll physics game ("Stair Dismount" / "Turbo Dismount" style) using 3D mfer avatar models.

## Tech stack

- **Vite** dev server (`npm run dev` on port 5173)
- **Three.js** for 3D rendering
- **Rapier** (WASM, `@dimforge/rapier3d-compat`) for physics
- Mfer GLB model from: `https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb`
- Models originate from the [avatar-maker](https://github.com/HeresMyGit/avatar-maker) project at `/Users/joshclarke/dev/avatar-maker`

## How the mfer model works

The GLB is a **single composite model** containing ALL possible body parts/accessories as named meshes. You toggle visibility to create different looks. This is the same system avatar-maker uses.

### Default visible meshes

```
type_plain, body, heres_my_signature, eyes_normal, mouth_flat, headphones_black, smoke_cig_white, smoke
```

### Mesh naming convention

Meshes are named by category + variant: `type_plain`, `eyes_normal`, `headphones_black`, `shirt_collared_pink`, `hat_cowboy_hat`, `hair_short_mohawk_purple`, `chain_gold`, `watch_sub_blue`, `beard`, `smoke_cig_white`, etc. Full mapping is in avatar-maker's `src/components/CharacterPreview.jsx` in the `TRAIT_MESH_MAPPING` object (line ~350).

### Skeleton

Model uses **Mixamo rigging**. Key bone names:

- **Core:** `mixamorigHips`, `mixamorigSpine`, `mixamorigSpine1`, `mixamorigSpine2`, `mixamorigNeck`, `mixamorigHead`
- **Arms:** `mixamorigLeftShoulder`, `mixamorigLeftArm`, `mixamorigLeftForeArm`, `mixamorigLeftHand` (same for Right)
- **Legs:** `mixamorigLeftUpLeg`, `mixamorigLeftLeg`, `mixamorigLeftFoot`, `mixamorigLeftToeBase` (same for Right)
- **Fingers:** `mixamorigLeftHandIndex1-4` (same for Right)

Has idle animation built in. Uses `SkeletonUtils.clone()` for proper skeleton cloning.

## Current state

Working prototype with:
- Dark grid scene with stairs, ramp, and scattered dynamic boxes
- Mfer model loads and renders with correct appearance + idle animation
- Click/tap drops the mfer with physics (single rigid body: capsule + head sphere)
- Random spin + slight push toward stairs on each drop
- Live score counter based on velocity and spin
- Settles after 1.5s and shows final score
- Reset button to try again
- Camera follows the falling mfer

## What needs work

1. **Camera tracking** - mfer can tumble out of view. Camera follow offset needs tuning so the action stays centered
2. **Physics body offset** - the visual model offset from the physics capsule (`pos.y - 1.2 * modelScale`) may need adjustment
3. **True ragdoll physics** - currently a single rigid body tumbling. Real ragdoll = separate physics body per bone connected by joints, each bone driven individually. Bone names and joint structure are defined in main.js (`RAGDOLL_SEGMENTS` / `RAGDOLL_JOINTS` constants - currently unused)
4. **More scenarios** - truck impact, cannon launch, building fall, etc.
5. **Collision-based scoring** - detect actual impacts for damage scoring instead of just velocity
6. **Trait customization UI** - let players pick their mfer look before dropping (mesh visibility mapping ready to use)
7. **Sound effects** - impact sounds, crowd reactions

## Files

- `index.html` - HTML shell with UI overlay (title, score, reset button)
- `src/main.js` - All game logic (scene, physics, model loading, game loop)
- `package.json` - Dependencies (three, rapier, vite)
- `.claude/launch.json` - Dev server config for preview
