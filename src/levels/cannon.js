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

      // === SCENE DETAILS ===

      // Cannonball rack — pyramid of balls next to cannon
      const ballMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 });
      const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
      rackBase.position.set(-11.5, 0.05, 2);
      ctx.scene.add(rackBase);
      p.staticMeshes.push(rackBase);
      // Bottom row
      for (const [bx, bz] of [[0, -0.2], [0, 0.2], [0.35, 0], [-0.35, 0]]) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), ballMat);
        ball.position.set(-11.5 + bx, 0.28, 2 + bz);
        ball.castShadow = true;
        ctx.scene.add(ball);
        p.staticMeshes.push(ball);
      }
      // Top ball
      const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), ballMat);
      topBall.position.set(-11.5, 0.55, 2);
      topBall.castShadow = true;
      ctx.scene.add(topBall);
      p.staticMeshes.push(topBall);

      // Powder keg
      const kegMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7 });
      const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 10), kegMat);
      keg.position.set(-12, 0.35, -1.5);
      keg.castShadow = true;
      ctx.scene.add(keg);
      p.staticMeshes.push(keg);
      // Keg bands
      for (const ky of [-0.2, 0, 0.2]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.04, 10),
          new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 }));
        band.position.set(-12, 0.35 + ky, -1.5);
        ctx.scene.add(band);
        p.staticMeshes.push(band);
      }

      // Torch on a post (lights the fuse area)
      const torchPole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
      torchPole.position.set(-12.5, 1, 0);
      torchPole.castShadow = true;
      ctx.scene.add(torchPole);
      p.staticMeshes.push(torchPole);
      const torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2 }));
      torchFlame.position.set(-12.5, 2.1, 0);
      ctx.scene.add(torchFlame);
      p.staticMeshes.push(torchFlame);
      const torchLight = new THREE.PointLight(0xff6600, 0.8, 6);
      torchLight.position.set(-12.5, 2.1, 0);
      ctx.scene.add(torchLight);
      p.staticMeshes.push(torchLight);

      // Wooden ammo crate with lid open
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.7 });
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.8), crateMat);
      crate.position.set(-11, 0.3, -2.5);
      crate.castShadow = true;
      ctx.scene.add(crate);
      p.staticMeshes.push(crate);
      // Open lid
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.8), crateMat);
      lid.position.set(-11, 0.65, -2.1);
      lid.rotation.x = -0.6;
      ctx.scene.add(lid);
      p.staticMeshes.push(lid);

      // Rope coils on ground
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 });
      for (const [rx, rz] of [[-9, 3], [-7, -3]]) {
        const rope = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 12), ropeMat);
        rope.rotation.x = -Math.PI / 2;
        rope.position.set(rx, 0.06, rz);
        ctx.scene.add(rope);
        p.staticMeshes.push(rope);
      }

      // Ground scorch marks behind cannon
      const scorchMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const scorch = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + Math.random() * 1, 0.6 + Math.random() * 0.8), scorchMat);
        scorch.rotation.x = -Math.PI / 2;
        scorch.rotation.z = Math.random() * Math.PI;
        scorch.position.set(-12 + Math.random() * 2, 0.005, -1 + Math.random() * 2);
        ctx.scene.add(scorch);
        p.staticMeshes.push(scorch);
      }

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

      // Target flag on top of wall
      const flagPole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
      flagPole.position.set(wallX, rows * bh + 2.5, 0);
      flagPole.castShadow = true;
      ctx.scene.add(flagPole);
      p.staticMeshes.push(flagPole);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.7 }));
      flag.position.set(wallX, rows * bh + 3.2, 0.6);
      ctx.scene.add(flag);
      p.staticMeshes.push(flag);

      // Sandbag barrier near the wall
      const sandMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), sandMat);
        bag.position.set(wallX + 1.5, 0.15 + i * 0.3, -2 + i * 0.3);
        bag.rotation.y = 0.2 * i;
        ctx.scene.add(bag);
        p.staticMeshes.push(bag);
      }
      // Second stack
      for (let i = 0; i < 2; i++) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), sandMat);
        bag.position.set(wallX + 1.5, 0.15 + i * 0.3, 2 - i * 0.3);
        bag.rotation.y = -0.15 * i;
        ctx.scene.add(bag);
        p.staticMeshes.push(bag);
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
              if (ctx.playBoom) ctx.playBoom();

              // Smoke puff at cannon mouth
              const smokePuffs = [];
              const smokeMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.7, roughness: 1 });
              for (let s = 0; s < 8; s++) {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 6, 6), smokeMat.clone());
                puff.position.set(-8 + Math.random() * 1.5, 1.8 + (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1.5);
                puff.castShadow = false;
                ctx.scene.add(puff);
                p.staticMeshes.push(puff);
                smokePuffs.push({ mesh: puff, vel: { x: -1 - Math.random() * 2, y: 0.5 + Math.random(), z: (Math.random() - 0.5) * 2 }, life: 1.5 + Math.random() });
              }
              cannonState.smokePuffs = smokePuffs;

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

          // Animate smoke puffs
          if (cannonState.smokePuffs) {
            for (const puff of cannonState.smokePuffs) {
              puff.life -= dt;
              if (puff.life <= 0) {
                puff.mesh.visible = false;
              } else {
                puff.mesh.position.x += puff.vel.x * dt;
                puff.mesh.position.y += puff.vel.y * dt;
                puff.mesh.position.z += puff.vel.z * dt;
                puff.mesh.scale.addScalar(dt * 1.5); // expand
                puff.mesh.material.opacity = Math.max(0, puff.life * 0.5);
              }
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
        if (cannonState.smokePuffs) {
          for (const puff of cannonState.smokePuffs) puff.mesh.visible = false;
          cannonState.smokePuffs = null;
        }
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

