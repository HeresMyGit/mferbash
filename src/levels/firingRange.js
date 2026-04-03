import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, newParts } from '../gameState.js';

export default function createFiringRangeLevel(ctx) {
  // 5 lanes, each with a target at a different distance
  const lanes = [
    { z: -4, targetX: 6 },
    { z: -2, targetX: 10 },
    { z:  0, targetX: 14 },
    { z:  2, targetX: 8 },
    { z:  4, targetX: 12 },
  ];

  return {
    name: 'firing range',
    spawnPos: { x: 10, y: 0, z: 0 },
    groundY: 0,
    spawnRotY: -Math.PI / 2, // mfers face the camera
    cameraStart: { pos: [-8, 2.5, 0], lookAt: [10, 1, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.5 },
    keepIdleUntilImpact: true,
    cameraFollow: { offX: -6, offY: 3, offZ: 0, minY: 2 },

    // Auto-place one mfer at each target
    autoSpawn: lanes.map(l => ({ x: l.targetX, y: 0, z: l.z })),

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — overcast
      ctx.scene.background = new THREE.Color(0x8899aa);
      ctx.scene.fog = new THREE.FogExp2(0x8899aa, 0.008);

      // Ground
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 40),
        new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 0.95 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // Concrete range pad
      const rangePad = new THREE.Mesh(new THREE.PlaneGeometry(35, 14),
        new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.85 }));
      rangePad.rotation.x = -Math.PI / 2;
      rangePad.position.set(5, 0.005, 0);
      rangePad.receiveShadow = true;
      ctx.scene.add(rangePad);
      p.staticMeshes.push(rangePad);

      // Grid
      const grid = new THREE.GridHelper(50, 50, 0x777766, 0x777766);
      grid.position.y = 0.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      // === SHOOTING BENCH (wide, spans all 5 lanes) ===
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
      const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 12), benchMat);
      tableTop.position.set(-6, 1, 0);
      tableTop.castShadow = true;
      ctx.scene.add(tableTop);
      p.staticMeshes.push(tableTop);
      for (const lz of [-5.5, -2.5, 0, 2.5, 5.5]) {
        for (const lx of [-0.5, 0.5]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), benchMetalMat);
          leg.position.set(-6 + lx, 0.5, lz);
          ctx.scene.add(leg);
          p.staticMeshes.push(leg);
        }
      }

      // === RIFLES (one per lane) ===
      const rifleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 });
      const rifleStockMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7 });
      const rifleGroups = [];

      for (let i = 0; i < lanes.length; i++) {
        const rz = lanes[i].z;
        const rifleGroup = new THREE.Group();

        // Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.4, 8), rifleMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.7, 0, 0);
        rifleGroup.add(barrel);

        // Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), rifleMat);
        rifleGroup.add(receiver);

        // Handguard
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.07), rifleMat);
        handguard.position.set(0.35, -0.02, 0);
        rifleGroup.add(handguard);

        // Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.06), rifleStockMat);
        stock.position.set(-0.4, 0.01, 0);
        rifleGroup.add(stock);

        // Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.06), rifleMat);
        mag.position.set(0.05, -0.14, 0);
        rifleGroup.add(mag);

        // Scope
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), rifleMat);
        scope.position.set(0.1, 0.085, 0);
        scope.rotation.z = Math.PI / 2;
        rifleGroup.add(scope);

        // Muzzle flash (hidden)
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 3, transparent: true, opacity: 0.9 }));
        flash.position.set(1.4, 0, 0);
        flash.visible = false;
        rifleGroup.add(flash);

        const muzzleLight = new THREE.PointLight(0xffaa00, 0, 4);
        muzzleLight.position.set(1.4, 0, 0);
        rifleGroup.add(muzzleLight);

        rifleGroup.position.set(-6, 1.15, rz);
        ctx.scene.add(rifleGroup);
        p.staticMeshes.push(rifleGroup);
        rifleGroups.push({ group: rifleGroup, flash, light: muzzleLight });
      }

      // === LANE DIVIDERS ===
      const dividerMat = new THREE.MeshStandardMaterial({ color: 0x666660, roughness: 0.7 });
      for (let d = -5; d <= 5; d += 2) {
        // Low concrete divider wall between lanes
        const wall = new THREE.Mesh(new THREE.BoxGeometry(25, 0.6, 0.08), dividerMat);
        wall.position.set(5, 0.3, d);
        wall.castShadow = true;
        ctx.scene.add(wall);
        p.staticMeshes.push(wall);
      }

      // === TARGETS (one per lane at its distance, with physics) ===
      const targetMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.6, side: THREE.DoubleSide });
      for (const lane of lanes) {
        // Target stand
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.3 }));
        stand.position.set(lane.targetX + 1.2, 1, lane.z);
        ctx.scene.add(stand);
        p.staticMeshes.push(stand);
        // Target board
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 1.2), targetMat);
        board.position.set(lane.targetX + 1.2, 1.4, lane.z);
        ctx.scene.add(board);
        p.staticMeshes.push(board);
        // Target physics — fixed solid wall
        const tb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
          .setTranslation(lane.targetX + 1.2, 1.4, lane.z));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.075, 0.9, 0.6)
          .setRestitution(0.2).setFriction(0.8), tb);
        p.staticBodies.push(tb);
        // Stand physics
        const sb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
          .setTranslation(lane.targetX + 1.2, 1, lane.z));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.03, 1, 0.03)
          .setRestitution(0.1).setFriction(0.8), sb);
        p.staticBodies.push(sb);
        // Bullseye rings
        const ringColors = [0xff2222, 0xffffff, 0xff2222, 0xffffff, 0xff0000];
        for (let r = 0; r < 5; r++) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry((4 - r) * 0.08 + 0.02, (4 - r) * 0.08 + 0.1, 12),
            new THREE.MeshStandardMaterial({ color: ringColors[r], roughness: 0.5, side: THREE.DoubleSide }));
          ring.position.set(lane.targetX + 1.11, 1.4, lane.z);
          ring.rotation.y = Math.PI / 2;
          ctx.scene.add(ring);
          p.staticMeshes.push(ring);
        }
      }

      // === SANDBAG BACKSTOP (full width) ===
      const sandMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.9 });
      for (let row = 0; row < 4; row++) {
        for (let col = -6; col <= 6; col++) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), sandMat);
          bag.position.set(22, 0.18 + row * 0.35, col * 0.95 + (row % 2 === 0 ? 0 : 0.45));
          bag.castShadow = true;
          ctx.scene.add(bag);
          p.staticMeshes.push(bag);
        }
      }
      const sandBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(22, 0.7, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.7, 6).setRestitution(0.1).setFriction(0.8), sandBody);
      p.staticBodies.push(sandBody);

      // === RANGE DETAILS ===

      // Distance markers on ground
      const markerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      for (let mx = 0; mx <= 20; mx += 2) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 12), markerMat);
        marker.position.set(mx, 0.006, 0);
        ctx.scene.add(marker);
        p.staticMeshes.push(marker);
      }

      // Ammo crates near bench
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.8 });
      const stripMat = new THREE.MeshStandardMaterial({ color: 0x666655, metalness: 0.5 });
      for (const [cx, cz] of [[-8, -3], [-8.5, -1], [-7.5, 2], [-8, 4]]) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), crateMat);
        crate.position.set(cx, 0.25, cz);
        crate.rotation.y = Math.random() * 0.4 - 0.2;
        crate.castShadow = true;
        ctx.scene.add(crate);
        p.staticMeshes.push(crate);
        for (const sy of [-0.2, 0.2]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 0.52), stripMat);
          strip.position.set(cx, 0.25 + sy, cz);
          ctx.scene.add(strip);
          p.staticMeshes.push(strip);
        }
      }

      // Shell casings scattered behind bench
      const shellMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
      for (let i = 0; i < 30; i++) {
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5), shellMat);
        shell.position.set(-5.5 + Math.random() * 2, 0.025, -5 + Math.random() * 10);
        shell.rotation.x = Math.PI / 2;
        shell.rotation.z = Math.random() * Math.PI;
        ctx.scene.add(shell);
        p.staticMeshes.push(shell);
      }

      // Overhead range lights
      for (let lx = -2; lx <= 20; lx += 6) {
        const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 8),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 }));
        fixture.position.set(lx, 5, 0);
        ctx.scene.add(fixture);
        p.staticMeshes.push(fixture);
        const light = new THREE.PointLight(0xffeedd, 0.5, 18);
        light.position.set(lx, 4.9, 0);
        ctx.scene.add(light);
        p.staticMeshes.push(light);
      }

      // Range sign behind shooter
      const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.3 }));
      signPost.position.set(-10, 1.25, -5);
      signPost.castShadow = true;
      ctx.scene.add(signPost);
      p.staticMeshes.push(signPost);
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 }));
      signBoard.position.set(-10, 2.2, -5);
      ctx.scene.add(signBoard);
      p.staticMeshes.push(signBoard);

      // === BULLET SYSTEM ===
      const bulletGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const bulletMat2 = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xff8800, emissiveIntensity: 1.5 });
      const trailGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 3);
      const trailMat = new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff6600, emissiveIntensity: 1, transparent: true, opacity: 0.5 });

      const state = {
        active: false,
        time: 0,
        soundCooldown: 0,
        rifles: lanes.map((lane, i) => ({
          z: lane.z,
          targetX: lane.targetX,
          nextFire: 0.3 + i * 0.12,
          rounds: 0,
          maxRounds: 12 + Math.floor(Math.random() * 6),
          flashTimer: 0,
          rifleIdx: i,
        })),
        bullets: [],
      };

      p.animatedObjects.push({
        state,
        update(dt) {
          if (!state.active) return;
          state.time += dt;
          state.soundCooldown -= dt;

          // Fire bullets
          for (const rifle of state.rifles) {
            if (rifle.rounds >= rifle.maxRounds) continue;
            if (state.time < rifle.nextFire) continue;

            rifle.rounds++;
            rifle.nextFire = state.time + 0.06 + Math.random() * 0.06;

            // Muzzle flash
            const rg = rifleGroups[rifle.rifleIdx];
            rg.flash.visible = true;
            rg.light.intensity = 2;
            rg.flash.scale.setScalar(0.8 + Math.random() * 0.6);
            rifle.flashTimer = 0.03;

            // Sound (throttled)
            if (state.soundCooldown <= 0 && ctx.playGunshot) {
              ctx.playGunshot();
              state.soundCooldown = 0.08;
            }

            // Bullet — fires toward target in this lane
            const startX = -4.6;
            const startY = 1.15;
            const spreadY = (Math.random() - 0.5) * 0.2;
            const spreadZ = (Math.random() - 0.5) * 0.2;

            const bMesh = new THREE.Mesh(bulletGeo, bulletMat2);
            bMesh.position.set(startX, startY + spreadY, rifle.z + spreadZ);
            ctx.scene.add(bMesh);

            const trail = new THREE.Mesh(trailGeo, trailMat.clone());
            trail.rotation.z = Math.PI / 2;
            trail.position.copy(bMesh.position);
            ctx.scene.add(trail);

            state.bullets.push({
              mesh: bMesh,
              trail,
              speed: 55 + Math.random() * 10,
              dirY: spreadY * 0.3,
              dirZ: spreadZ * 0.3,
              hit: false,
            });
          }

          // Update muzzle flashes
          for (const rifle of state.rifles) {
            if (rifle.flashTimer > 0) {
              rifle.flashTimer -= dt;
              if (rifle.flashTimer <= 0) {
                const rg = rifleGroups[rifle.rifleIdx];
                rg.flash.visible = false;
                rg.light.intensity = 0;
              }
            }
          }

          // Move bullets + hit detection
          const remaining = [];
          for (const b of state.bullets) {
            if (b.hit) {
              b.mesh.visible = false;
              b.trail.visible = false;
              continue;
            }

            b.mesh.position.x += b.speed * dt;
            b.mesh.position.y += b.dirY * dt;
            b.mesh.position.z += b.dirZ * dt;
            b.trail.position.copy(b.mesh.position);
            b.trail.position.x -= 0.3;

            if (b.mesh.position.x > 25) {
              ctx.scene.remove(b.mesh);
              ctx.scene.remove(b.trail);
              continue;
            }

            // Check mfer hits
            const bx = b.mesh.position.x;
            const by = b.mesh.position.y;
            const bz = b.mesh.position.z;
            const hitRemaining = [];
            let didHit = false;
            for (const pm of ctx.placedMfers) {
              const mx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
              const my = pm.scene.position.y + 1.0;
              const mz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
              const dx = bx - mx, dy = by - my, dz = bz - mz;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist < 0.8 && bx >= mx - 0.5) {
                if (pm.triggerBody) ctx.world.removeRigidBody(pm.triggerBody);
                const mfer = ctx.createRagdoll(pm.scene);
                if (mfer) {
                  for (const body of Object.values(mfer.ragdollBodies)) {
                    body.setLinvel({
                      x: b.speed * 0.12 + (Math.random() - 0.5) * 3,
                      y: 2 + Math.random() * 4,
                      z: (Math.random() - 0.5) * 6,
                    }, true);
                    body.setAngvel({
                      x: (Math.random() - 0.5) * 15,
                      y: (Math.random() - 0.5) * 10,
                      z: (Math.random() - 0.5) * 15,
                    }, true);
                  }
                  mfer.ragdollActive = true;
                  mfer.canDetach = true;
                  ctx.captureImpactShot(mfer);
                  ctx.mfers.push(mfer);
                  if (ctx.playImpact) ctx.playImpact(8);
                }
                b.hit = true;
                didHit = true;
              } else {
                hitRemaining.push(pm);
              }
            }
            if (didHit) ctx.placedMfers = hitRemaining;
            if (!b.hit) remaining.push(b);
          }
          state.bullets = remaining;
        },
      });

      p.rangeState = state;

      p.reset = () => {
        state.active = false;
        state.time = 0;
        state.soundCooldown = 0;
        for (const rifle of state.rifles) {
          rifle.rounds = 0;
          rifle.nextFire = 0.3 + rifle.rifleIdx * 0.12;
          rifle.flashTimer = 0;
          const rg = rifleGroups[rifle.rifleIdx];
          rg.flash.visible = false;
          rg.light.intensity = 0;
        }
        for (const b of state.bullets) {
          ctx.scene.remove(b.mesh);
          ctx.scene.remove(b.trail);
        }
        state.bullets = [];
      };

      return p;
    },

    onDrop(lp) {
      if (!lp.rangeState) return;
      lp.rangeState.active = true;
      // Give all placed mfers trigger capsules
      for (const pm of ctx.placedMfers) {
        if (pm.triggerBody) continue;
        const cx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
        const cy = pm.scene.position.y + 1.25;
        const cz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
        const tb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
        ctx.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.2).setRestitution(0.3).setFriction(0.5)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), tb);
        pm.triggerBody = tb;
      }
    },
  };
}
