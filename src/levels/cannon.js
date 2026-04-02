import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createCannonLevel(ctx) {
  return {
    name: 'cannon',
    spawnPos: { x: -9, y: 1.8, z: 0 },
    groundY: 1,
    spawnRotY: Math.PI - 0.3, // face away from camera, tilted up from ground
    spawnRotX: -Math.PI / 2, // face toward ground
    spawnRotZ: Math.PI / 2 - 0.20, // horizontal, head toward mouth, angled up to match cannon
    cameraStart: { pos: [-6, 4, 8], lookAt: [-8, 2.5, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.3 },
    keepIdleUntilImpact: true,
    cameraFollow: { offX: 2, offY: 3, offZ: 8, minY: 3 },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — bright blue
      ctx.scene.background = new THREE.Color(0x87ceeb);
      ctx.scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);

      // Ground
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40),
        new THREE.MeshStandardMaterial({ color: 0x6b8c5a, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // Grid
      const grid = new THREE.GridHelper(40, 40, 0x999980, 0x999980);
      grid.position.y = 0.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      // === THE CANNON ===
      const cannonMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.7 });
      const cannonGroup = new THREE.Group();

      // Barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4, 16), cannonMat);
      barrel.rotation.z = Math.PI / 2; // point along X
      barrel.position.set(0, 0, 0);
      cannonGroup.add(barrel);

      // Barrel rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 16), cannonMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(2, 0, 0);
      cannonGroup.add(rim);

      // Base/wheels
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1.5), baseMat);
      base.position.set(0, -0.6, 0);
      cannonGroup.add(base);

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
      for (const wz of [-0.9, 0.9]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-0.3, -0.6, wz);
        cannonGroup.add(wheel);
      }

      // Fuse (decorative)
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.5 }));
      fuse.position.set(-1.8, 0.4, 0);
      fuse.rotation.z = 0.5;
      cannonGroup.add(fuse);

      // Angle the cannon upward slightly
      cannonGroup.position.set(-10, 1.8, 0);
      cannonGroup.rotation.z = 0.15; // slight upward angle
      ctx.scene.add(cannonGroup);

      // Cannon physics (static)
      const cannonBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(-10, 1.8, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(2, 0.5, 0.75).setRestitution(0.2).setFriction(0.5), cannonBody);
      p.staticBodies.push(cannonBody);
      p.staticMeshes.push(cannonGroup);

      // === BLOCK WALL (target) ===
      const blockColors = [0xcc4444, 0x44aa44, 0x4466cc, 0xccaa22, 0xcc6633];
      const wallX = 8;
      const rows = 12, cols = 5, layers = 1;
      const bw = 1.0, bh = 0.6, bd = 0.8;

      for (let layer = 0; layer < layers; layer++) {
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const offset = (row % 2 === 0) ? 0 : bw * 0.5;
            const bx = wallX + layer * bd;
            const by = 1 + row * bh + bh / 2;
            const bz = (col - cols / 2) * bw + offset;

            const color = blockColors[(row + col + layer) % blockColors.length];
            const block = new THREE.Mesh(new THREE.BoxGeometry(bd, bh, bw),
              new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
            block.position.set(bx, by, bz);
            block.castShadow = true;
            block.receiveShadow = true;
            ctx.scene.add(block);

            const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
              .setTranslation(bx, by, bz).setLinearDamping(0.2).setAngularDamping(0.2));
            ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(bd / 2, bh / 2, bw / 2)
              .setMass(3).setRestitution(0.2).setFriction(0.6), bb);
            p.dynamicParts.push({ mesh: block, body: bb, initPos: { x: bx, y: by, z: bz } });
          }
        }
      }

      const cannonState = {
        active: false,
        fired: false,
        chargeTime: 0,
      };

      p.animatedObjects.push({
        state: cannonState,
        update(dt) {
          if (!cannonState.active) return;

          if (!cannonState.fired) {
            // Brief charge animation — fuse glow
            cannonState.chargeTime += dt;
            fuse.material.emissiveIntensity = 0.5 + Math.sin(cannonState.chargeTime * 20) * 0.5;

            if (cannonState.chargeTime >= 0.8) {
              cannonState.fired = true;
              fuse.visible = false;

              // Only launch ctx.mfers near the cannon, give others trigger capsules
              const cannonX = -9;
              const launchRadius = 4;
              const remaining = [];
              for (const pm of ctx.placedMfers) {
                const mx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
                const dist = Math.abs(mx - cannonX);
                if (dist < launchRadius) {
                  // Near cannon — launch!
                  const mfer = ctx.createRagdoll(pm.scene);
                  if (mfer) {
                    const launchSpeed = 45;
                    for (const body of Object.values(mfer.ragdollBodies)) {
                      body.setLinvel({ x: launchSpeed + (Math.random() - 0.5) * 4, y: 8 + Math.random() * 4, z: (Math.random() - 0.5) * 4 }, true);
                      body.setAngvel({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 }, true);
                    }
                    mfer.ragdollActive = true;
                    mfer.detachAfter = performance.now() + 500;
                    ctx.captureImpactShot(mfer);
                    ctx.mfers.push(mfer);
                  }
                } else {
                  // Far from cannon — give trigger capsule, wait for impact
                  const cx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
                  const cy = pm.scene.position.y + 1.25;
                  const cz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
                  const tb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
                  const tc = ctx.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.2).setRestitution(0.3).setFriction(0.5)
                    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), tb);
                  pm.triggerBody = tb;
                  pm.triggerHandle = tc.handle;
                  remaining.push(pm);
                }
              }
              ctx.placedMfers = remaining;
            }
          }
        },
      });

      p.cannonState = cannonState;

      p.reset = () => {
        cannonState.active = false;
        cannonState.fired = false;
        cannonState.chargeTime = 0;
        fuse.visible = true;
        fuse.material.emissiveIntensity = 0.5;
      };

      return p;
    },

    onDrop(lp) {
      if (lp.cannonState) {
        lp.cannonState.active = true;
      }
    },
  };
}

