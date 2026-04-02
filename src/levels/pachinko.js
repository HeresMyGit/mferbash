import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createPachinkoLevel(ctx) {
  const density = ctx.settings.pachinkoDensity;
  const boardW = 16;
  const boardH = 30 + density * 4;
  const boardAngle = 0.12; // slight tilt toward camera

  return {
    name: 'pachinko',
    spawnPos: { x: 0, y: boardH + 2, z: 0 },
    groundY: 1,
    settingsOverrides: { damping: 0.3, bounce: 0.6, launchSpeed: 0 },
    spawnRotY: Math.PI, // face toward camera
    cameraStart: { pos: [0, boardH + 2, -(boardH * 0.3 + 8)], lookAt: [0, boardH - 1, 0] },
    cameraFollow: { offX: 0, offY: 4, offZ: -(boardH * 0.4 + 8), minY: 5 },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — arcade/neon vibe
      ctx.scene.background = new THREE.Color(0x1a0a2e);
      ctx.scene.fog = new THREE.FogExp2(0x1a0a2e, 0.008);

      // Ground
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
        new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // === BACKBOARD (behind, positive Z) ===
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(boardW + 2, boardH + 2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x2a1a3e, roughness: 0.8 }));
      backboard.position.set(0, boardH / 2 + 1, 1);
      ctx.scene.add(backboard);
      p.staticMeshes.push(backboard);

      // Back physics wall (positive Z)
      const backBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, boardH / 2 + 1, 0.8));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(boardW / 2 + 1, boardH / 2 + 1, 0.15)
        .setRestitution(0.5).setFriction(0.3), backBody);
      p.staticBodies.push(backBody);

      // Front glass (invisible, negative Z — between camera and pegs)
      const frontBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, boardH / 2 + 1, -0.8));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(boardW / 2 + 1, boardH / 2 + 1, 0.15)
        .setRestitution(0.5).setFriction(0.2), frontBody);
      p.staticBodies.push(frontBody);

      // Side walls
      for (const xSide of [-boardW / 2 - 0.3, boardW / 2 + 0.3]) {
        const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, boardH + 2, 2),
          new THREE.MeshStandardMaterial({ color: 0x4a2a6e, roughness: 0.5, metalness: 0.3 }));
        wallMesh.position.set(xSide, boardH / 2 + 1, 0);
        ctx.scene.add(wallMesh);
        p.staticMeshes.push(wallMesh);

        const wb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
          .setTranslation(xSide, boardH / 2 + 1, 0));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, boardH / 2 + 1, 1)
          .setRestitution(0.6).setFriction(0.3), wb);
        p.staticBodies.push(wb);
      }

      // === PEGS ===
      const pegColors = [0xff4466, 0x44aaff, 0xffaa22, 0x44ff88, 0xff66cc, 0xaabb44];
      const pegRadius = 0.2;
      const rowSpacing = 2.8 - density * 0.15;
      const colSpacing = 2.2 - density * 0.1;
      const numRows = Math.floor(boardH / rowSpacing);

      for (let row = 0; row < numRows; row++) {
        const y = boardH - row * rowSpacing;
        const offset = (row % 2 === 0) ? 0 : colSpacing / 2;
        const numCols = Math.floor(boardW / colSpacing);

        for (let col = 0; col < numCols; col++) {
          const x = -boardW / 2 + colSpacing + col * colSpacing + offset;
          if (Math.abs(x) > boardW / 2 - 0.5) continue;

          const color = pegColors[(row + col) % pegColors.length];
          const peg = new THREE.Mesh(
            new THREE.CylinderGeometry(pegRadius, pegRadius, 1.2, 8),
            new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4, emissive: color, emissiveIntensity: 0.15 }));
          peg.rotation.x = Math.PI / 2;
          peg.position.set(x, y, 0);
          peg.castShadow = true;
          ctx.scene.add(peg);
          p.staticMeshes.push(peg);

          const pb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0));
          ctx.world.createCollider(RAPIER.ColliderDesc.cylinder(0.6, pegRadius)
            .setRestitution(0.7).setFriction(0.2), pb);
          p.staticBodies.push(pb);
        }
      }

      // === SPINNING OBSTACLES ===
      const spinners = [];
      const spinnerMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.3, metalness: 0.5, emissive: 0xff3300, emissiveIntensity: 0.2 });

      // Place spinners at intervals down the board
      const spinnerCount = Math.max(2, Math.floor(density / 2) + 1);
      for (let i = 0; i < spinnerCount; i++) {
        const sy = boardH * 0.8 - i * (boardH * 0.6 / spinnerCount);
        const sx = (i % 2 === 0 ? -1 : 1) * (boardW * 0.15);
        const armLen = 2 + density * 0.2;
        const spinDir = i % 2 === 0 ? 1 : -1;

        const spinGroup = new THREE.Group();
        // Center hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 8), spinnerMat);
        hub.rotation.x = Math.PI / 2;
        spinGroup.add(hub);
        // Arms (cross shape)
        for (let a = 0; a < 4; a++) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.2, 0.2), spinnerMat);
          arm.rotation.z = a * Math.PI / 2;
          arm.position.set(
            Math.cos(a * Math.PI / 2) * armLen / 2,
            Math.sin(a * Math.PI / 2) * armLen / 2,
            0
          );
          spinGroup.add(arm);
          // Paddle at end
          const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), spinnerMat);
          paddle.position.set(
            Math.cos(a * Math.PI / 2) * armLen,
            Math.sin(a * Math.PI / 2) * armLen,
            0
          );
          spinGroup.add(paddle);
        }
        spinGroup.position.set(sx, sy, 0);
        ctx.scene.add(spinGroup);

        // Spinner physics — kinematic rotating body
        const spinBody = ctx.world.createRigidBody(
          RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(sx, sy, 0));
        // Colliders for the 4 paddles
        for (let a = 0; a < 4; a++) {
          const px = Math.cos(a * Math.PI / 2) * armLen;
          const py = Math.sin(a * Math.PI / 2) * armLen;
          ctx.world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.15, 0.4, 0.15)
              .setTranslation(px, py, 0)
              .setRestitution(0.8).setFriction(0.2), spinBody);
        }
        // Hub collider
        ctx.world.createCollider(
          RAPIER.ColliderDesc.cylinder(0.5, 0.3).setRestitution(0.5).setFriction(0.2), spinBody);

        spinBody.setAngvel({ x: 0, y: 0, z: spinDir * (1.5 + density * 0.3) }, true);

        spinners.push({ group: spinGroup, body: spinBody, speed: spinDir * (1.5 + density * 0.3) });

        p.animatedObjects.push({
          group: spinGroup, body: spinBody, state: {},
          update(dt) {
            // Sync visual to physics
            const r = spinBody.rotation();
            spinGroup.quaternion.set(r.x, r.y, r.z, r.w);
          },
        });
      }

      // === DEFLECTOR RAMPS ===
      const rampMat = new THREE.MeshStandardMaterial({ color: 0x22ccaa, roughness: 0.4, metalness: 0.3, emissive: 0x116655, emissiveIntensity: 0.2 });
      const rampPositions = [];
      for (let i = 0; i < density; i++) {
        const ry = boardH * 0.7 - i * (boardH * 0.55 / density);
        const rx = (i % 2 === 0 ? 1 : -1) * (boardW * 0.3);
        const rAngle = (i % 2 === 0 ? -1 : 1) * 0.4;
        rampPositions.push({ x: rx, y: ry, angle: rAngle });
      }
      for (const rp of rampPositions) {
        addBox(ctx, p, { x: rp.x, y: rp.y, z: 0 }, { x: 3, y: 0.15, z: 1.2 }, 0x22ccaa,
          { rotZ: rp.angle, restitution: 0.7, friction: 0.2 });
      }

      // === BUMPERS (bouncy circles) ===
      const bumperMat = new THREE.MeshStandardMaterial({ color: 0xff2255, roughness: 0.2, metalness: 0.6, emissive: 0xff0033, emissiveIntensity: 0.3 });
      for (let i = 0; i < 3 + density; i++) {
        const bx = (Math.random() - 0.5) * boardW * 0.6;
        const by = 3 + Math.random() * (boardH * 0.4);
        const br = 0.5 + Math.random() * 0.3;
        const bumper = new THREE.Mesh(new THREE.CylinderGeometry(br, br, 1, 12), bumperMat);
        bumper.rotation.x = Math.PI / 2;
        bumper.position.set(bx, by, 0);
        bumper.castShadow = true;
        ctx.scene.add(bumper);
        p.staticMeshes.push(bumper);

        const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(bx, by, 0));
        ctx.world.createCollider(RAPIER.ColliderDesc.cylinder(0.5, br)
          .setRestitution(1.2).setFriction(0.1), bb); // super bouncy!
        p.staticBodies.push(bb);
      }

      // === SCORE BUCKETS at bottom ===
      const bucketColors = [0xff4444, 0xffaa00, 0x44ff44, 0xffaa00, 0xff4444];
      const bucketW = boardW / bucketColors.length;
      for (let i = 0; i < bucketColors.length; i++) {
        const bx = -boardW / 2 + bucketW * i + bucketW / 2;
        // Bucket floor
        const bucket = new THREE.Mesh(new THREE.BoxGeometry(bucketW - 0.3, 0.2, 1.5),
          new THREE.MeshStandardMaterial({ color: bucketColors[i], roughness: 0.5, emissive: bucketColors[i], emissiveIntensity: 0.2 }));
        bucket.position.set(bx, 1.5, 0);
        ctx.scene.add(bucket);
        p.staticMeshes.push(bucket);
        // Divider wall
        if (i < bucketColors.length - 1) {
          const divX = -boardW / 2 + bucketW * (i + 1);
          addBox(ctx, p, { x: divX, y: 2.5, z: 0 }, { x: 0.15, y: 2, z: 1.5 }, 0x888888,
            { restitution: 0.5, friction: 0.3 });
        }
      }

      // Bucket labels
      const labelTexts = ['1x', '3x', '5x', '3x', '1x'];
      // (Text would require font loading — skip for now, colors convey it)

      // === NEON FRAME ===
      const neonMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.5 });
      // Top
      const neonTop = new THREE.Mesh(new THREE.BoxGeometry(boardW + 3, 0.15, 0.15), neonMat);
      neonTop.position.set(0, boardH + 2, -0.5);
      ctx.scene.add(neonTop);
      p.staticMeshes.push(neonTop);
      // Bottom
      const neonBot = new THREE.Mesh(new THREE.BoxGeometry(boardW + 3, 0.15, 0.15), neonMat);
      neonBot.position.set(0, 1, -0.5);
      ctx.scene.add(neonBot);
      p.staticMeshes.push(neonBot);
      // Sides
      for (const nx of [-(boardW / 2 + 1.3), boardW / 2 + 1.3]) {
        const neonSide = new THREE.Mesh(new THREE.BoxGeometry(0.15, boardH + 2, 0.15), neonMat);
        neonSide.position.set(nx, boardH / 2 + 1, -0.5);
        ctx.scene.add(neonSide);
        p.staticMeshes.push(neonSide);
      }

      // Grid on ground
      const grid = new THREE.GridHelper(30, 30, 0x332244, 0x332244);
      grid.position.y = 1.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      p.reset = () => {
        // Reset spinner velocities
        for (const sp of spinners) {
          sp.body.setAngvel({ x: 0, y: 0, z: sp.speed }, true);
        }
      };

      return p;
    },
  };
}

