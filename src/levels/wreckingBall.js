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

      // Sky — overcast construction
      ctx.scene.background = new THREE.Color(0xa8c8e8);
      ctx.scene.fog = new THREE.FogExp2(0xa8c8e8, 0.01);

      // Ground — dirt/gravel
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40),
        new THREE.MeshStandardMaterial({ color: 0x9e8c6c, roughness: 0.95 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.5, 20).setRestitution(0.3).setFriction(0.8), gb);
      p.staticBodies.push(gb);

      // Dirt patches for texture
      const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 0.98 });
      for (let i = 0; i < 12; i++) {
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(1 + Math.random() * 3, 1 + Math.random() * 3), dirtMat);
        patch.rotation.x = -Math.PI / 2;
        patch.rotation.z = Math.random() * Math.PI;
        patch.position.set(-8 + Math.random() * 16, 0.005, -6 + Math.random() * 12);
        ctx.scene.add(patch);
        p.staticMeshes.push(patch);
      }

      // === CAUTION TAPE BARRIERS with work lights ===
      const cautionMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6 });
      const poleMatOrange = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
      const barrierPositions = [
        [-8, 0, -6], [-8, 0, -2], [-8, 0, 2], [-8, 0, 6],
        [8, 0, -6], [8, 0, -2], [8, 0, 2], [8, 0, 6],
        [-4, 0, -8], [0, 0, -8], [4, 0, -8],
      ];
      for (const [bx, , bz] of barrierPositions) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), poleMatOrange);
        pole.position.set(bx, 0.75, bz);
        pole.castShadow = true;
        ctx.scene.add(pole);
        p.staticMeshes.push(pole);
        const pb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(bx, 0.75, bz));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.06, 0.75, 0.06).setRestitution(0.3).setFriction(0.4), pb);
        p.staticBodies.push(pb);
      }
      // Tape strips
      for (const xSide of [-8, 8]) {
        for (const ty of [1.0, 1.4]) {
          const tape = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 12), cautionMat);
          tape.position.set(xSide, ty, 0);
          ctx.scene.add(tape);
          p.staticMeshes.push(tape);
        }
      }
      const backTape = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.04), cautionMat);
      backTape.position.set(0, 1.0, -8);
      ctx.scene.add(backTape);
      p.staticMeshes.push(backTape);

      // Work lights on corner poles
      const workLightMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffdd66, emissiveIntensity: 0.8 });
      for (const [lx, lz] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), workLightMat);
        bulb.position.set(lx, 1.6, lz);
        ctx.scene.add(bulb);
        p.staticMeshes.push(bulb);
        const light = new THREE.PointLight(0xffdd66, 0.3, 8);
        light.position.set(lx, 1.6, lz);
        ctx.scene.add(light);
        p.staticMeshes.push(light);
      }

      // === BRICK WALL — stable stacking ===
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xcc8855, roughness: 0.8 });
      const concreteMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.7 });
      const w = 1.1, h = 0.5, d = 0.7;
      const wallZ = -3;

      for (let row = 0; row < 6; row++) {
        for (let col = -2; col <= 2; col++) {
          const offset = (row % 2 === 0) ? 0 : w * 0.5;
          const bx = col * (w + 0.1) + offset;
          const by = row * h + h / 2 + 0.01; // tiny gap above ground
          const brick = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
            row % 2 === 0 ? brickMat : concreteMat);
          brick.position.set(bx, by, wallZ);
          brick.castShadow = true;
          brick.receiveShadow = true;
          ctx.scene.add(brick);
          const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(bx, by, wallZ)
            .setLinearDamping(0.8)
            .setAngularDamping(0.8));
          ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2 - 0.02, h / 2 - 0.02, d / 2 - 0.02)
            .setMass(20).setRestitution(0.05).setFriction(0.9), bb);
          p.dynamicParts.push({ mesh: brick, body: bb, initPos: { x: bx, y: by, z: wallZ } });
        }
      }

      // Rebar sticking out of wall top
      const rebarMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.4, metalness: 0.6 });
      for (let i = 0; i < 4; i++) {
        const rebar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1 + Math.random() * 0.5, 0.04), rebarMat);
        rebar.position.set(-1.5 + i * 1, 3.2 + Math.random() * 0.3, wallZ);
        rebar.rotation.z = (Math.random() - 0.5) * 0.2;
        ctx.scene.add(rebar);
        p.staticMeshes.push(rebar);
      }

      // Side wall stubs
      for (const wz of [-4.5, -1.5]) {
        for (let row = 0; row < 3; row++) {
          const sw = 0.5, sh = 0.5, sd = 0.5;
          const by = row * sh + sh / 2 + 0.01;
          const brick = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), concreteMat);
          brick.position.set(3.5, by, wz);
          brick.castShadow = true;
          ctx.scene.add(brick);
          const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(3.5, by, wz).setLinearDamping(0.8).setAngularDamping(0.8));
          ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(sw / 2 - 0.02, sh / 2 - 0.02, sd / 2 - 0.02)
            .setMass(15).setRestitution(0.05).setFriction(0.9), bb);
          p.dynamicParts.push({ mesh: brick, body: bb, initPos: { x: 3.5, y: by, z: wz } });
        }
      }

      // === SAFETY CONES (dynamic) ===
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 8), coneMat);
        const cx = -5 + Math.random() * 10, cz = -1 + Math.random() * 6;
        cone.position.set(cx, 0.25, cz);
        cone.castShadow = true;
        ctx.scene.add(cone);
        const cb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(cx, 0.25, cz).setLinearDamping(0.5).setAngularDamping(0.5));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 0.25, 0.15)
          .setMass(1).setRestitution(0.4).setFriction(0.5), cb);
        p.dynamicParts.push({ mesh: cone, body: cb, initPos: { x: cx, y: 0.25, z: cz } });
      }

      // === WHEELBARROW (dynamic) ===
      const wbMat = new THREE.MeshStandardMaterial({ color: 0x558855, roughness: 0.6, metalness: 0.2 });
      const wheelbarrow = new THREE.Group();
      const wbTray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), wbMat);
      wbTray.position.y = 0.15;
      wheelbarrow.add(wbTray);
      const wbWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
      wbWheel.rotation.x = Math.PI / 2;
      wbWheel.position.set(0.5, -0.05, 0);
      wheelbarrow.add(wbWheel);
      wheelbarrow.position.set(5, 0.2, 1);
      wheelbarrow.rotation.y = 0.5;
      ctx.scene.add(wheelbarrow);
      const wbPhys = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(5, 0.2, 1).setLinearDamping(0.5).setAngularDamping(0.5));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.2, 0.25)
        .setMass(5).setRestitution(0.3).setFriction(0.5), wbPhys);
      p.dynamicParts.push({ mesh: wheelbarrow, body: wbPhys, initPos: { x: 5, y: 0.2, z: 1 } });

      // === PORTA-POTTY ===
      const ppMat = new THREE.MeshStandardMaterial({ color: 0x2266aa, roughness: 0.6 });
      const portaPotty = new THREE.Group();
      const ppBody = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 1), ppMat);
      ppBody.position.y = 1.1;
      portaPotty.add(ppBody);
      const ppRoof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.1), ppMat);
      ppRoof.position.y = 2.25;
      portaPotty.add(ppRoof);
      const ppDoor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1a4488 }));
      ppDoor.position.set(0.52, 0.9, 0);
      portaPotty.add(ppDoor);
      const ppVent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x333333 }));
      ppVent.position.set(0, 1.8, 0.52);
      portaPotty.add(ppVent);
      portaPotty.position.set(7, 0, 4);
      ctx.scene.add(portaPotty);
      p.staticMeshes.push(portaPotty);
      const ppPhys = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(7, 1.1, 4));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 1.1, 0.5), ppPhys);
      p.staticBodies.push(ppPhys);

      // === CONSTRUCTION DUMPSTER ===
      const dumpMat = new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.7, metalness: 0.2 });
      const dumpster = new THREE.Group();
      const dumpBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 1.2), dumpMat);
      dumpBody.position.y = 0.5;
      dumpster.add(dumpBody);
      // Debris inside
      for (let i = 0; i < 5; i++) {
        const debr = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.3, 0.1 + Math.random() * 0.2, 0.2 + Math.random() * 0.3),
          new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 }));
        debr.position.set((Math.random() - 0.5) * 1.5, 1 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6);
        debr.rotation.set(Math.random(), Math.random(), Math.random());
        dumpster.add(debr);
      }
      dumpster.position.set(-6, 0, 3);
      ctx.scene.add(dumpster);
      p.staticMeshes.push(dumpster);

      // === TOOL RACK ===
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.7 });
      // Frame
      const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), rackMat);
      rackFrame.position.set(6, 0.75, -5);
      ctx.scene.add(rackFrame);
      p.staticMeshes.push(rackFrame);
      // Crossbar
      const rackBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), rackMat);
      rackBar.position.set(6, 1.4, -5);
      ctx.scene.add(rackBar);
      p.staticMeshes.push(rackBar);
      // Tools leaning
      const toolMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const tool = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), toolMat);
        tool.position.set(5.5 + i * 0.4, 0.65, -5);
        tool.rotation.z = -0.15 + i * 0.05;
        ctx.scene.add(tool);
        p.staticMeshes.push(tool);
      }

      // === CRANE ===
      const craneMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.3 });

      // Crane base
      addBox(ctx, p, { x: -12, y: 0.5, z: -3 }, { x: 2, y: 1, z: 2 }, 0x555555, { roughness: 0.6 });
      // Cable spool on crane base
      const spoolMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
      const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12), spoolMat);
      spool.rotation.x = Math.PI / 2;
      spool.position.set(-12, 1.3, -3);
      ctx.scene.add(spool);
      p.staticMeshes.push(spool);

      // Crane tower
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 16, 0.6), craneMat);
      tower.position.set(-12, 9, -3);
      tower.castShadow = true;
      ctx.scene.add(tower);
      p.staticMeshes.push(tower);

      // Crane arm
      const boom = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 0.4), craneMat);
      boom.position.set(-3, 16.5, -3);
      boom.castShadow = true;
      ctx.scene.add(boom);
      p.staticMeshes.push(boom);

      // === THE WRECKING BALL ===
      const ballRadius = 1.2;
      const chainLength = 14;
      const pivotX = 0, pivotY = 16.5, pivotZ = -2;

      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 }));
      ballMesh.castShadow = true;
      ctx.scene.add(ballMesh);
      p.staticMeshes.push(ballMesh);

      const chainLinks = [];
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.7 });
      for (let i = 0; i < 8; i++) {
        const link = new THREE.Mesh(new THREE.BoxGeometry(0.08, chainLength / 8, 0.08), chainMat);
        ctx.scene.add(link);
        p.staticMeshes.push(link);
        chainLinks.push(link);
      }

      const ballBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pivotX, pivotY - chainLength, pivotZ));
      ctx.world.createCollider(
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
        for (let i = 0; i < chainLinks.length; i++) {
          const t = (i + 0.5) / chainLinks.length;
          const lx = ballState.pivotX + Math.sin(ballState.angle) * ballState.chainLength * t;
          const ly = ballState.pivotY - Math.cos(ballState.angle) * ballState.chainLength * t;
          chainLinks[i].position.set(lx, ly, ballState.pivotZ);
          chainLinks[i].rotation.z = ballState.angle;
        }
      }

      updateBallPosition();

      p.animatedObjects.push({
        mesh: ballMesh, body: ballBody, state: ballState,
        update(dt) {
          if (!ballState.active) return;

          if (!ballState.released) {
            const g = ctx.settings.gravity;
            const L = ballState.chainLength;
            ballState.angleVel += -(g / L) * Math.sin(ballState.angle) * dt;
            ballState.angleVel *= 0.999;
            ballState.angle += ballState.angleVel * dt;

            updateBallPosition();

            const bx = ballState.pivotX + Math.sin(ballState.angle) * L;
            const by = ballState.pivotY - Math.cos(ballState.angle) * L;
            const remaining = [];
            for (const pm of ctx.placedMfers) {
              const mx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
              const my = 1.25;
              const mz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
              const dist = Math.sqrt((bx - mx) ** 2 + (by - my) ** 2 + (ballState.pivotZ - mz) ** 2);
              if (dist < ballRadius + 0.5) {
                const mfer = ctx.createRagdoll(pm.scene);
                if (mfer) {
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
                  if (ctx.playWreckingHit) ctx.playWreckingHit();
                  mfer.canDetach = true;
                  ctx.mfers.push(mfer);
                }
              } else {
                remaining.push(pm);
              }
            }
            ctx.placedMfers = remaining;

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
            const t = ballBody.translation();
            const r = ballBody.rotation();
            ballMesh.position.set(t.x, t.y, t.z);
            for (const link of chainLinks) link.visible = false;
          }
        },
      });

      p.ballState = ballState;

      // Scattered debris
      for (let i = 0; i < 5; i++) {
        const s = 0.3 + Math.random() * 0.3;
        addDynamicBox(ctx, p, {
          x: -3 + Math.random() * 6,
          y: s / 2,
          z: -1 + Math.random() * 4
        }, s, 0xaa7744);
      }

      // Grid
      const grid = new THREE.GridHelper(30, 30, 0x887766, 0x887766);
      grid.position.y = 0.005;
      ctx.scene.add(grid);
      p.helpers.push(grid);

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
      if (lp.ballState) lp.ballState.active = true;
    },

    onCollision(lp, h1, h2) {},
  };
}
