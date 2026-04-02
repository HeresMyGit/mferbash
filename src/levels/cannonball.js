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

