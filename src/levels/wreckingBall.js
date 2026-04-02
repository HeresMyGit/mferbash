import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createWreckingBallLevel(ctx) {
  return {
    name: 'wrecking ball',
    spawnPos: { x: 0, y: 0, z: -1.5 },
    groundY: 0,
    cameraStart: { pos: [0, 5, 8], lookAt: [0, 2, -1.5] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 0 },
    keepIdleUntilImpact: true,

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky
      ctx.scene.background = new THREE.Color(0xa8c8e8);
      ctx.scene.fog = new THREE.FogExp2(0xa8c8e8, 0.01);

      // Ground — dirt/gravel construction site
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40),
        new THREE.MeshStandardMaterial({ color: 0x9e8c6c, roughness: 0.95 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.5, 20).setRestitution(0.3).setFriction(0.8), gb);
      p.staticBodies.push(gb);

      // === CAUTION TAPE BARRIERS ===
      const cautionMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6 });
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
      // Barrier poles with yellow tape
      const barrierPositions = [
        [-8, 0, -6], [-8, 0, -2], [-8, 0, 2], [-8, 0, 6],
        [8, 0, -6], [8, 0, -2], [8, 0, 2], [8, 0, 6],
        [-4, 0, -8], [0, 0, -8], [4, 0, -8],
      ];
      for (const [bx, , bz] of barrierPositions) {
        // Orange pole
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), poleMat);
        pole.position.set(bx, 1.75, bz);
        pole.castShadow = true;
        ctx.scene.add(pole);
        p.staticMeshes.push(pole);
        const pb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(bx, 1.75, bz));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.06, 0.75, 0.06).setRestitution(0.3).setFriction(0.4), pb);
        p.staticBodies.push(pb);
      }
      // Tape strips connecting poles (side barriers)
      for (const xSide of [-8, 8]) {
        const tape = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 12), cautionMat);
        tape.position.set(xSide, 2.0, 0);
        ctx.scene.add(tape);
        p.staticMeshes.push(tape);
        const tape2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 12), cautionMat);
        tape2.position.set(xSide, 1.6, 0);
        ctx.scene.add(tape2);
        p.staticMeshes.push(tape2);
      }
      // Back barrier tape
      const backTape = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.04), cautionMat);
      backTape.position.set(0, 2.0, -8);
      ctx.scene.add(backTape);
      p.staticMeshes.push(backTape);

      // === BUILDING STRUCTURE (to be demolished) ===
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xcc8855, roughness: 0.8 });
      const concreteMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.7 });

      // Stack of dynamic bricks/blocks — the wall the mfer stands near
      for (let row = 0; row < 5; row++) {
        for (let col = -2; col <= 2; col++) {
          const w = 1.2, h = 0.6, d = 0.8;
          const bx = col * (w + 0.05) + (row % 2 === 0 ? 0 : 0.6);
          const by = 1 + row * h + h / 2;
          const bz = -3;
          const brick = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
            row % 2 === 0 ? brickMat : concreteMat);
          brick.position.set(bx, by, bz);
          brick.castShadow = true;
          brick.receiveShadow = true;
          ctx.scene.add(brick);
          const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(bx, by, bz).setLinearDamping(0.3).setAngularDamping(0.3));
          ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
            .setMass(8).setRestitution(0.15).setFriction(0.7), bb);
          p.dynamicParts.push({ mesh: brick, body: bb, initPos: { x: bx, y: by, z: bz } });
        }
      }

      // Extra wall segments on sides
      for (const wz of [-4.5, -1.5]) {
        for (let row = 0; row < 3; row++) {
          const w = 0.6, h = 0.6, d = 0.6;
          const by = 1 + row * h + h / 2;
          const brick = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), concreteMat);
          brick.position.set(3.5, by, wz);
          brick.castShadow = true;
          ctx.scene.add(brick);
          const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(3.5, by, wz).setLinearDamping(0.3).setAngularDamping(0.3));
          ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
            .setMass(6).setRestitution(0.15).setFriction(0.7), bb);
          p.dynamicParts.push({ mesh: brick, body: bb, initPos: { x: 3.5, y: by, z: wz } });
        }
      }

      // Scattered debris/crates
      for (let i = 0; i < 5; i++) {
        const s = 0.3 + Math.random() * 0.3;
        addDynamicBox(ctx, p, {
          x: -3 + Math.random() * 6,
          y: 1 + s / 2,
          z: -1 + Math.random() * 4
        }, s, 0xaa7744);
      }

      // === CRANE ===
      const craneMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.3 });
      const craneBaseMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.4 });

      // Crane base
      addBox(ctx, p, { x: -12, y: 1.5, z: -3 }, { x: 2, y: 1, z: 2 }, 0x555555, { roughness: 0.6 });

      // Crane tower
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 16, 0.6), craneMat);
      tower.position.set(-12, 10, -3);
      tower.castShadow = true;
      ctx.scene.add(tower);
      p.staticMeshes.push(tower);

      // Crane arm (horizontal boom)
      const boom = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 0.4), craneMat);
      boom.position.set(-3, 17.5, -3);
      boom.castShadow = true;
      ctx.scene.add(boom);
      p.staticMeshes.push(boom);

      // === THE WRECKING BALL ===
      const ballRadius = 1.2;
      const chainLength = 14;
      const pivotX = 0, pivotY = 17.5, pivotZ = -2;
      const swingAngle = { value: -Math.PI / 3 }; // start pulled back

      // Ball mesh
      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 }));
      ballMesh.castShadow = true;
      ctx.scene.add(ballMesh);
      p.staticMeshes.push(ballMesh);

      // Chain segments (visual only)
      const chainLinks = [];
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.7 });
      for (let i = 0; i < 8; i++) {
        const link = new THREE.Mesh(new THREE.BoxGeometry(0.08, chainLength / 8, 0.08), chainMat);
        ctx.scene.add(link);
        p.staticMeshes.push(link);
        chainLinks.push(link);
      }

      // Wrecking ball physics — kinematic during swing, dynamic after impact
      const ballBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pivotX, pivotY - chainLength, pivotZ));
      const ballCollider = ctx.world.createCollider(
        RAPIER.ColliderDesc.ball(ballRadius).setMass(2000).setRestitution(0.1).setFriction(0.3)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), ballBody);

      const ballState = {
        active: false, released: false, angle: -Math.PI / 3, angleVel: 0,
        body: ballBody, mesh: ballMesh, chainLinks,
        pivotX, pivotY, pivotZ, chainLength, ballRadius,
      };

      function updateBallPosition() {
        const bx = ballState.pivotX + Math.sin(ballState.angle) * ballState.chainLength;
        const by = ballState.pivotY - Math.cos(ballState.angle) * ballState.chainLength;
        ballBody.setNextKinematicTranslation({ x: bx, y: by, z: ballState.pivotZ });
        ballMesh.position.set(bx, by, ballState.pivotZ);

        // Update chain links
        for (let i = 0; i < chainLinks.length; i++) {
          const t = (i + 0.5) / chainLinks.length;
          const lx = ballState.pivotX + Math.sin(ballState.angle) * ballState.chainLength * t;
          const ly = ballState.pivotY - Math.cos(ballState.angle) * ballState.chainLength * t;
          chainLinks[i].position.set(lx, ly, ballState.pivotZ);
          chainLinks[i].rotation.z = ballState.angle;
        }
      }

      updateBallPosition(); // set initial position

      p.animatedObjects.push({
        mesh: ballMesh, body: ballBody, state: ballState,
        update(dt) {
          if (!ballState.active) return;

          if (!ballState.released) {
            // Pendulum physics: angular acceleration = -(g/L) * sin(angle)
            const g = ctx.settings.gravity;
            const L = ballState.chainLength;
            ballState.angleVel += -(g / L) * Math.sin(ballState.angle) * dt;
            ballState.angleVel *= 0.999; // tiny damping
            ballState.angle += ballState.angleVel * dt;

            updateBallPosition();

            // Convert placed ctx.mfers to ragdolls when ball reaches them
            const bx = ballState.pivotX + Math.sin(ballState.angle) * L;
            const by = ballState.pivotY - Math.cos(ballState.angle) * L;
            const remaining = [];
            for (const pm of ctx.placedMfers) {
              const mx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
              const my = 1 + 1.25; // mfer center height
              const mz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
              const dist = Math.sqrt((bx - mx) ** 2 + (by - my) ** 2 + (ballState.pivotZ - mz) ** 2);
              if (dist < ballRadius + 0.5) {
                const mfer = ctx.createRagdoll(pm.scene);
                if (mfer) {
                  // Impulse from ball direction
                  const speed = Math.abs(ballState.angleVel) * L;
                  const dirX = Math.cos(ballState.angle);
                  const dirY = Math.sin(ballState.angle);
                  for (const body of Object.values(mfer.ragdollBodies)) {
                    body.setLinvel({
                      x: dirX * speed * 1.5 + (Math.random() - 0.5) * 3,
                      y: Math.abs(dirY * speed) + 3 + Math.random() * 3,
                      z: (Math.random() - 0.5) * 6,
                    }, true);
                    body.setAngvel({
                      x: (Math.random() - 0.5) * 10,
                      y: (Math.random() - 0.5) * 10,
                      z: (Math.random() - 0.5) * 10,
                    }, true);
                  }
                  mfer.ragdollActive = true;
                  ctx.captureImpactShot(mfer);
                  mfer.canDetach = true;
                  ctx.mfers.push(mfer);
                }
              } else {
                remaining.push(pm);
              }
            }
            ctx.placedMfers = remaining;

            // Release ball to dynamic after it swings past center + a bit
            if (ballState.angle > Math.PI / 6 && ballState.angleVel > 0) {
              ballState.released = true;
              const speed = Math.abs(ballState.angleVel) * L;
              ballBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
              ballBody.setLinvel({
                x: Math.cos(ballState.angle) * speed,
                y: Math.sin(ballState.angle) * speed,
                z: 0
              }, true);
            }
          } else {
            // Dynamic — sync mesh from physics
            const t = ballBody.translation();
            const r = ballBody.rotation();
            ballMesh.position.set(t.x, t.y, t.z);
            // Hide chain when released
            for (const link of chainLinks) link.visible = false;
          }
        },
      });

      p.ballState = ballState;

      p.reset = () => {
        ballState.active = false;
        ballState.released = false;
        ballState.angle = -Math.PI / 3;
        ballState.angleVel = 0;
        ballBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        for (const link of chainLinks) link.visible = true;
        updateBallPosition();
      };

      return p;
    },

    onDrop(lp) {
      if (lp.ballState) {
        lp.ballState.active = true;
      }
    },

    onCollision(lp, h1, h2) {
      // Ball handles hits via position check in update
    },
  };
}

