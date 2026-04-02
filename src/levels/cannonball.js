import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createCannonball2Level(ctx) {
  return {
    name: 'cannonball',
    spawnPos: { x: 6, y: 0, z: 0 },
    groundY: 0,
    cameraStart: { pos: [6, 3, 8], lookAt: [6, 2, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.5 },
    keepIdleUntilImpact: true,
    cameraFollow: { offX: 2, offY: 3, offZ: 8, minY: 3 },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky
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

      const grid = new THREE.GridHelper(40, 40, 0x999980, 0x999980);
      grid.position.y = 0.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      // === RANGE DETAILS ===

      // Bullseye on the ground where mfer stands
      const bullseyeColors = [0xff2222, 0xffffff, 0xff2222, 0xffffff, 0xff2222];
      for (let r = 0; r < 5; r++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry((4 - r) * 0.5 + 0.3, (4 - r) * 0.5 + 0.8, 24),
          new THREE.MeshStandardMaterial({ color: bullseyeColors[r], roughness: 0.7, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(6, 0.006 + r * 0.001, 0);
        ctx.scene.add(ring);
        p.staticMeshes.push(ring);
      }

      // Range distance markers on ground
      const markerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      for (let mx = -4; mx <= 4; mx += 2) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.5), markerMat);
        marker.position.set(mx, 0.005, 3.5);
        ctx.scene.add(marker);
        p.staticMeshes.push(marker);
        const marker2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.5), markerMat);
        marker2.position.set(mx, 0.005, -3.5);
        ctx.scene.add(marker2);
        p.staticMeshes.push(marker2);
      }

      // Sandbag backstop wall behind mfer
      const sandMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.9 });
      for (let row = 0; row < 3; row++) {
        for (let col = -2; col <= 2; col++) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), sandMat);
          bag.position.set(10, 0.18 + row * 0.35, col * 0.95 + (row % 2 === 0 ? 0 : 0.45));
          ctx.scene.add(bag);
          p.staticMeshes.push(bag);
        }
      }
      // Sandbag physics (solid wall)
      const sandBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(10, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.55, 2.5).setRestitution(0.1).setFriction(0.8), sandBody);
      p.staticBodies.push(sandBody);

      // Spectator benches
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 });
      const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.3 });
      for (const bz of [6, 8]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.5), benchMat);
        seat.position.set(0, 0.5, bz);
        seat.castShadow = true;
        ctx.scene.add(seat);
        p.staticMeshes.push(seat);
        for (const lx of [-1.2, 1.2]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), benchMetalMat);
          leg.position.set(lx, 0.25, bz);
          ctx.scene.add(leg);
          p.staticMeshes.push(leg);
        }
      }

      // Score target board behind mfer (dynamic — gets knocked)
      const targetBoard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 3),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.6 }));
      targetBoard.position.set(11, 1.5, 0);
      targetBoard.castShadow = true;
      ctx.scene.add(targetBoard);
      const tbBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(11, 1.5, 0).setLinearDamping(0.3).setAngularDamping(0.3));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.075, 1.5, 1.5)
        .setMass(10).setRestitution(0.2).setFriction(0.5), tbBody);
      p.dynamicParts.push({ mesh: targetBoard, body: tbBody, initPos: { x: 11, y: 1.5, z: 0 } });
      // Concentric target rings (parented to board so they move together)
      const ringColors = [0xff0000, 0xffffff, 0xff0000, 0xffffff];
      for (let r = 0; r < 4; r++) {
        const targetRing = new THREE.Mesh(new THREE.RingGeometry((3 - r) * 0.3 + 0.2, (3 - r) * 0.3 + 0.5, 16),
          new THREE.MeshStandardMaterial({ color: ringColors[r], roughness: 0.5, side: THREE.DoubleSide }));
        targetRing.position.set(-0.09, 0, 0);
        targetRing.rotation.y = Math.PI / 2;
        targetBoard.add(targetRing);
      }

      // Range flags
      const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
      for (const [fx, fz] of [[-4, 5], [12, 5], [-4, -5], [12, -5]]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3, 0.06), flagPoleMat);
        pole.position.set(fx, 1.5, fz);
        pole.castShadow = true;
        ctx.scene.add(pole);
        p.staticMeshes.push(pole);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.8),
          new THREE.MeshStandardMaterial({ color: [0xff4444, 0x44ff44, 0x4444ff, 0xffaa00][Math.floor(Math.random() * 4)], roughness: 0.7 }));
        flag.position.set(fx, 2.8, fz + 0.4);
        ctx.scene.add(flag);
        p.staticMeshes.push(flag);
      }

      // Cannon area details — powder keg, cannonball rack, torch, scorch marks
      const kegMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7 });
      const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 10), kegMat);
      keg.position.set(-9.5, 0.35, -2);
      keg.castShadow = true;
      ctx.scene.add(keg);
      p.staticMeshes.push(keg);
      for (const ky of [-0.2, 0, 0.2]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.04, 10),
          new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 }));
        band.position.set(-9.5, 0.35 + ky, -2);
        ctx.scene.add(band);
        p.staticMeshes.push(band);
      }

      // Cannonball rack
      const cballMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 });
      const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
      rackBase.position.set(-9.5, 0.05, 2);
      ctx.scene.add(rackBase);
      p.staticMeshes.push(rackBase);
      for (const [bx, bz] of [[0, -0.2], [0, 0.2], [0.3, 0], [-0.3, 0]]) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), cballMat);
        ball.position.set(-9.5 + bx, 0.3, 2 + bz);
        ctx.scene.add(ball);
        p.staticMeshes.push(ball);
      }

      // Torch
      const torchPole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
      torchPole.position.set(-10, 1, 2.5);
      torchPole.castShadow = true;
      ctx.scene.add(torchPole);
      p.staticMeshes.push(torchPole);
      const torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2 }));
      torchFlame.position.set(-10, 2.1, 2.5);
      ctx.scene.add(torchFlame);
      p.staticMeshes.push(torchFlame);
      const torchLight = new THREE.PointLight(0xff6600, 0.8, 6);
      torchLight.position.set(-10, 2.1, 2.5);
      ctx.scene.add(torchLight);
      p.staticMeshes.push(torchLight);

      // Scorch marks
      const scorchMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.95 });
      for (let i = 0; i < 3; i++) {
        const scorch = new THREE.Mesh(new THREE.PlaneGeometry(0.6 + Math.random() * 0.8, 0.5 + Math.random() * 0.6), scorchMat);
        scorch.rotation.x = -Math.PI / 2;
        scorch.rotation.z = Math.random() * Math.PI;
        scorch.position.set(-10 + Math.random() * 1.5, 0.005, -0.5 + Math.random());
        ctx.scene.add(scorch);
        p.staticMeshes.push(scorch);
      }

      // === CANNON (facing +X toward the mfer) ===
      const cannonMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.7 });
      const cannonGroup = new THREE.Group();

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 4.5, 16), cannonMat);
      barrel.rotation.z = Math.PI / 2;
      cannonGroup.add(barrel);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.25, 16), cannonMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(2.2, 0, 0);
      cannonGroup.add(rim);

      const baseMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 1.8), baseMat);
      base.position.set(0, -0.7, 0);
      cannonGroup.add(base);

      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
      for (const wz of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 12), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-0.3, -0.7, wz);
        cannonGroup.add(wheel);
      }

      // Fuse
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.5 }));
      fuse.position.set(-2, 0.5, 0);
      fuse.rotation.z = 0.5;
      cannonGroup.add(fuse);

      cannonGroup.position.set(-8, 1.8, 0);
      cannonGroup.rotation.z = 0.08; // slight upward angle
      ctx.scene.add(cannonGroup);
      p.staticMeshes.push(cannonGroup);

      const cannonBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(-8, 1.8, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(2.2, 0.6, 0.9).setRestitution(0.2).setFriction(0.5), cannonBody);
      p.staticBodies.push(cannonBody);

      // === CANNONBALL ===
      const ballRadius = 0.8;
      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 }));
      ballMesh.position.set(-6, 1.8, 0);
      ballMesh.visible = false;
      ballMesh.castShadow = true;
      ctx.scene.add(ballMesh);

      const state = {
        active: false,
        fired: false,
        chargeTime: 0,
        ballMesh,
        ballBody: null,
      };

      p.animatedObjects.push({
        state,
        update(dt) {
          if (!state.active) return;

          if (!state.fired) {
            state.chargeTime += dt;
            fuse.material.emissiveIntensity = 0.5 + Math.sin(state.chargeTime * 20) * 0.5;

            if (state.chargeTime >= 0.8) {
              state.fired = true;
              fuse.visible = false;
              if (ctx.playBoom) ctx.playBoom();

              // Give all placed ctx.mfers trigger capsules — they stay idle until the ball hits them
              for (const pm of ctx.placedMfers) {
                const cx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
                const cy = pm.scene.position.y + 1.25;
                const cz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
                const tb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
                const tc = ctx.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.2).setRestitution(0.3).setFriction(0.5)
                  .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), tb);
                pm.triggerBody = tb;
                pm.triggerHandle = tc.handle;
              }

              // Fire the cannonball — kinematic so it plows through everything
              ballMesh.visible = true;
              state.ballX = -6;
              state.ballY = 2;
              state.ballSpeed = 40;
              const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
                .setTranslation(-6, 2, 0));
              ctx.world.createCollider(RAPIER.ColliderDesc.ball(ballRadius)
                .setMass(500).setRestitution(0.1).setFriction(0.3)
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), bb);
              state.ballBody = bb;

              // Smoke puff
              const smokeMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.7, roughness: 1 });
              state.smokePuffs = [];
              for (let s = 0; s < 8; s++) {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 6, 6), smokeMat.clone());
                puff.position.set(-6 + Math.random() * 1.5, 1.8 + (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1.5);
                ctx.scene.add(puff);
                p.staticMeshes.push(puff);
                state.smokePuffs.push({ mesh: puff, vel: { x: -1 - Math.random() * 2, y: 0.5 + Math.random(), z: (Math.random() - 0.5) * 2 }, life: 1.5 + Math.random() });
              }
            }
          }

          // Drive the cannonball forward (kinematic until past all targets)
          if (state.fired && state.ballBody) {
            if (state.ballX < 20) {
              state.ballX += state.ballSpeed * dt;
              state.ballY += 0.5 * dt; // slight arc
              state.ballBody.setNextKinematicTranslation({ x: state.ballX, y: state.ballY, z: 0 });
              ballMesh.position.set(state.ballX, state.ballY, 0);

              // Hit placed ctx.mfers by position
              const ballFront = state.ballX + ballRadius;
              const remaining = [];
              for (const pm of ctx.placedMfers) {
                const mx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
                const mz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
                const zDist = Math.abs(mz);
                if (ballFront >= mx - 0.5 && zDist < ballRadius + 0.8) {
                  if (pm.triggerBody) ctx.world.removeRigidBody(pm.triggerBody);
                  const mfer = ctx.createRagdoll(pm.scene);
                  if (mfer) {
                    for (const body of Object.values(mfer.ragdollBodies)) {
                      body.setLinvel({ x: state.ballSpeed * 0.6 + (Math.random() - 0.5) * 3, y: 5 + Math.random() * 5, z: (Math.random() - 0.5) * 8 }, true);
                      body.setAngvel({ x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 12 }, true);
                    }
                    mfer.ragdollActive = true;
                    mfer.canDetach = true;
                    ctx.captureImpactShot(mfer);
                    ctx.mfers.push(mfer);
                  }
                } else {
                  remaining.push(pm);
                }
              }
              ctx.placedMfers = remaining;
            } else {
              // Past all targets — switch to dynamic
              state.ballBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
              state.ballBody.setLinvel({ x: state.ballSpeed * 0.3, y: 1, z: 0 }, true);
              p.dynamicParts.push({ mesh: ballMesh, body: state.ballBody });
              state.ballBody = null; // stop driving
            }
          }

          // Animate smoke puffs
          if (state.smokePuffs) {
            for (const puff of state.smokePuffs) {
              puff.life -= dt;
              if (puff.life <= 0) {
                puff.mesh.visible = false;
              } else {
                puff.mesh.position.x += puff.vel.x * dt;
                puff.mesh.position.y += puff.vel.y * dt;
                puff.mesh.position.z += puff.vel.z * dt;
                puff.mesh.scale.addScalar(dt * 1.5);
                puff.mesh.material.opacity = Math.max(0, puff.life * 0.5);
              }
            }
          }
        },
      });

      p.cannonState = state;

      p.reset = () => {
        state.active = false;
        state.fired = false;
        state.chargeTime = 0;
        fuse.visible = true;
        fuse.material.emissiveIntensity = 0.5;
        ballMesh.visible = false;
        if (state.smokePuffs) {
          for (const puff of state.smokePuffs) puff.mesh.visible = false;
          state.smokePuffs = null;
        }
        if (state.ballBody) {
          ctx.world.removeRigidBody(state.ballBody);
          state.ballBody = null;
          p.dynamicParts = p.dynamicParts.filter(dp => dp.mesh !== ballMesh);
        }
      };

      return p;
    },

    onDrop(lp) {
      if (lp.cannonState) lp.cannonState.active = true;
    },
  };
}

