import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createPachinkoLevel(ctx) {
  const density = ctx.settings.pachinkoDensity;
  const boardW = 16;
  const boardH = 30 + density * 4;

  return {
    name: 'pachinko',
    spawnPos: { x: 0, y: boardH + 2, z: 0 },
    groundY: 1,
    settingsOverrides: { damping: 0.3, bounce: 0.6, launchSpeed: 0 },
    spawnRotY: Math.PI,
    cameraStart: { pos: [0, boardH + 2, -(boardH * 0.3 + 8)], lookAt: [0, boardH - 1, 0] },
    cameraFollow: { offX: 0, offY: 4, offZ: -(boardH * 0.4 + 8), minY: 5 },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — dark arcade
      ctx.scene.background = new THREE.Color(0x0a0618);
      ctx.scene.fog = new THREE.FogExp2(0x0a0618, 0.006);

      // Ground
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // === MACHINE CABINET ===
      // Wood grain sides
      const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7, metalness: 0.1 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.1, metalness: 0.9 });

      for (const xSide of [-boardW / 2 - 0.5, boardW / 2 + 0.5]) {
        // Wood panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, boardH + 2, 2.5), cabinetMat);
        panel.position.set(xSide, boardH / 2 + 1, 0);
        ctx.scene.add(panel);
        p.staticMeshes.push(panel);
        // Chrome trim strip
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.08, boardH + 2, 0.08), chromeMat);
        trim.position.set(xSide - Math.sign(xSide) * 0.22, boardH / 2 + 1, -1);
        ctx.scene.add(trim);
        p.staticMeshes.push(trim);
      }

      // Backboard
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(boardW + 2, boardH + 2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.8 }));
      backboard.position.set(0, boardH / 2 + 1, 1);
      ctx.scene.add(backboard);
      p.staticMeshes.push(backboard);

      // Physics walls
      const backBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, boardH / 2 + 1, 0.8));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(boardW / 2 + 1, boardH / 2 + 1, 0.15)
        .setRestitution(0.5).setFriction(0.3), backBody);
      p.staticBodies.push(backBody);

      const frontBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, boardH / 2 + 1, -0.8));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(boardW / 2 + 1, boardH / 2 + 1, 0.15)
        .setRestitution(0.5).setFriction(0.2), frontBody);
      p.staticBodies.push(frontBody);

      for (const xSide of [-boardW / 2 - 0.3, boardW / 2 + 0.3]) {
        const wb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
          .setTranslation(xSide, boardH / 2 + 1, 0));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, boardH / 2 + 1, 1)
          .setRestitution(0.6).setFriction(0.3), wb);
        p.staticBodies.push(wb);
      }

      // === DROP FUNNEL at top ===
      const funnelMat = new THREE.MeshStandardMaterial({ color: 0xddaa00, roughness: 0.3, metalness: 0.6, emissive: 0x886600, emissiveIntensity: 0.2 });
      // Left funnel wall
      addBox(ctx, p, { x: -2, y: boardH + 1, z: 0 }, { x: 3, y: 0.15, z: 1.2 }, 0xddaa00,
        { rotZ: -0.3, restitution: 0.5, friction: 0.3 });
      // Right funnel wall
      addBox(ctx, p, { x: 2, y: boardH + 1, z: 0 }, { x: 3, y: 0.15, z: 1.2 }, 0xddaa00,
        { rotZ: 0.3, restitution: 0.5, friction: 0.3 });

      // === GLOWING "PACHINKO" 3D TEXT ===
      const bannerLight = new THREE.PointLight(0xff44ff, 1, 12);
      bannerLight.position.set(0, boardH + 3, -2);
      ctx.scene.add(bannerLight);
      p.staticMeshes.push(bannerLight);

      // Load font and create 3D text async
      const ttfLoader = new TTFLoader();
      ttfLoader.load('/fonts/SartoshiScript-Regular.otf', (fontData) => {
        const font = new Font(fontData);
        const textGeo = new TextGeometry('pachinko', {
          font,
          size: 2,
          depth: 0.2,
          curveSegments: 8,
        });
        textGeo.computeBoundingBox();
        const textW = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
        const textMat = new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xff44ff, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.5 });
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(textW / 2, boardH + 2.5, -0.7);
        textMesh.rotation.y = Math.PI; // face the camera (negative Z)
        ctx.scene.add(textMesh);
        p.staticMeshes.push(textMesh);
      });

      // === PEGS with glow ===
      const pegColors = [0xff4466, 0x44aaff, 0xffaa22, 0x44ff88, 0xff66cc, 0xaabb44];
      const pegRadius = 0.2;
      const rowSpacing = 2.8 - density * 0.15;
      const colSpacing = 2.2 - density * 0.1;
      const numRows = Math.floor(boardH / rowSpacing);
      const allPegs = [];

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
          allPegs.push(peg);

          const pb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0));
          ctx.world.createCollider(RAPIER.ColliderDesc.cylinder(0.6, pegRadius)
            .setRestitution(0.7).setFriction(0.2), pb);
          p.staticBodies.push(pb);
        }
      }

      // === SPINNING OBSTACLES ===
      const spinners = [];
      const spinnerMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.3, metalness: 0.5, emissive: 0xff3300, emissiveIntensity: 0.3 });

      const spinnerCount = Math.max(2, Math.floor(density / 2) + 1);
      for (let i = 0; i < spinnerCount; i++) {
        const sy = boardH * 0.8 - i * (boardH * 0.6 / spinnerCount);
        const sx = (i % 2 === 0 ? -1 : 1) * (boardW * 0.15);
        const armLen = 2 + density * 0.2;
        const spinDir = i % 2 === 0 ? 1 : -1;

        const spinGroup = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 8), spinnerMat);
        hub.rotation.x = Math.PI / 2;
        spinGroup.add(hub);
        for (let a = 0; a < 4; a++) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.2, 0.2), spinnerMat);
          arm.rotation.z = a * Math.PI / 2;
          arm.position.set(Math.cos(a * Math.PI / 2) * armLen / 2, Math.sin(a * Math.PI / 2) * armLen / 2, 0);
          spinGroup.add(arm);
          const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), spinnerMat);
          paddle.position.set(Math.cos(a * Math.PI / 2) * armLen, Math.sin(a * Math.PI / 2) * armLen, 0);
          spinGroup.add(paddle);
        }
        spinGroup.position.set(sx, sy, 0);
        ctx.scene.add(spinGroup);

        const spinBody = ctx.world.createRigidBody(
          RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(sx, sy, 0));
        for (let a = 0; a < 4; a++) {
          ctx.world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.15, 0.4, 0.15)
              .setTranslation(Math.cos(a * Math.PI / 2) * armLen, Math.sin(a * Math.PI / 2) * armLen, 0)
              .setRestitution(0.8).setFriction(0.2), spinBody);
        }
        ctx.world.createCollider(
          RAPIER.ColliderDesc.cylinder(0.5, 0.3).setRestitution(0.5).setFriction(0.2), spinBody);

        spinBody.setAngvel({ x: 0, y: 0, z: spinDir * (1.5 + density * 0.3) }, true);
        spinners.push({ group: spinGroup, body: spinBody, speed: spinDir * (1.5 + density * 0.3) });

        p.animatedObjects.push({
          group: spinGroup, body: spinBody, state: {},
          update(dt) {
            const r = spinBody.rotation();
            spinGroup.quaternion.set(r.x, r.y, r.z, r.w);
          },
        });
      }

      // === DEFLECTOR RAMPS ===
      for (let i = 0; i < density; i++) {
        const ry = boardH * 0.7 - i * (boardH * 0.55 / density);
        const rx = (i % 2 === 0 ? 1 : -1) * (boardW * 0.3);
        const rAngle = (i % 2 === 0 ? -1 : 1) * 0.4;
        addBox(ctx, p, { x: rx, y: ry, z: 0 }, { x: 3, y: 0.15, z: 1.2 }, 0x22ccaa,
          { rotZ: rAngle, restitution: 0.7, friction: 0.2 });
      }

      // === TRIANGLE DEFLECTORS (mixed in) ===
      const triMat = new THREE.MeshStandardMaterial({ color: 0xcc44ff, roughness: 0.3, metalness: 0.4, emissive: 0x8822cc, emissiveIntensity: 0.2 });
      for (let i = 0; i < Math.floor(density / 2) + 1; i++) {
        const tx = (i % 2 === 0 ? -1 : 1) * (boardW * 0.2 + i);
        const ty = boardH * 0.5 - i * 3;
        const tri = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 3), triMat);
        tri.rotation.x = Math.PI / 2;
        tri.position.set(tx, ty, 0);
        ctx.scene.add(tri);
        p.staticMeshes.push(tri);
        const tb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(tx, ty, 0));
        ctx.world.createCollider(RAPIER.ColliderDesc.cylinder(0.5, 0.8)
          .setRestitution(0.9).setFriction(0.1), tb);
        p.staticBodies.push(tb);
      }

      // === BUMPERS ===
      const bumperMat = new THREE.MeshStandardMaterial({ color: 0xff2255, roughness: 0.2, metalness: 0.6, emissive: 0xff0033, emissiveIntensity: 0.4 });
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
          .setRestitution(1.2).setFriction(0.1), bb);
        p.staticBodies.push(bb);
      }

      // === SCORE BUCKETS with prize orbs ===
      const bucketColors = [0xff4444, 0xffaa00, 0x44ff44, 0xffaa00, 0xff4444];
      const bucketLabels = ['1x', '3x', '5x', '3x', '1x'];
      const bucketW = boardW / bucketColors.length;
      for (let i = 0; i < bucketColors.length; i++) {
        const bx = -boardW / 2 + bucketW * i + bucketW / 2;
        const bucket = new THREE.Mesh(new THREE.BoxGeometry(bucketW - 0.3, 0.2, 1.5),
          new THREE.MeshStandardMaterial({ color: bucketColors[i], roughness: 0.5, emissive: bucketColors[i], emissiveIntensity: 0.3 }));
        bucket.position.set(bx, 1.5, 0);
        ctx.scene.add(bucket);
        p.staticMeshes.push(bucket);
        // Prize orb
        const orbMat = new THREE.MeshStandardMaterial({
          color: bucketColors[i], emissive: bucketColors[i],
          emissiveIntensity: i === 2 ? 0.8 : 0.3, roughness: 0.1, metalness: 0.5 });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), orbMat);
        orb.position.set(bx, 2, 0);
        ctx.scene.add(orb);
        p.staticMeshes.push(orb);
        // Divider wall
        if (i < bucketColors.length - 1) {
          const divX = -boardW / 2 + bucketW * (i + 1);
          addBox(ctx, p, { x: divX, y: 2.5, z: 0 }, { x: 0.15, y: 2, z: 1.5 }, 0x888888,
            { restitution: 0.5, friction: 0.3 });
        }
      }

      // === COIN SLOT at bottom ===
      const coinSlotMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
      const coinPanel = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.3), coinSlotMat);
      coinPanel.position.set(0, 0.5, -1.2);
      ctx.scene.add(coinPanel);
      p.staticMeshes.push(coinPanel);
      const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
      coinSlot.position.set(0, 0.8, -1.05);
      ctx.scene.add(coinSlot);
      p.staticMeshes.push(coinSlot);
      // Coin
      const coinMat = new THREE.MeshStandardMaterial({ color: 0xddaa00, metalness: 0.8, roughness: 0.2 });
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), coinMat);
      coin.rotation.z = Math.PI / 2;
      coin.position.set(0.4, 0.8, -1.02);
      ctx.scene.add(coin);
      p.staticMeshes.push(coin);

      // === NEON FRAME ===
      const neonMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 });
      for (const [px, py, sx, sy] of [
        [0, boardH + 2, boardW + 3, 0.15],
        [0, 1, boardW + 3, 0.15],
      ]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.15), neonMat);
        bar.position.set(px, py, -0.5);
        ctx.scene.add(bar);
        p.staticMeshes.push(bar);
      }
      for (const nx of [-(boardW / 2 + 1.3), boardW / 2 + 1.3]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.15, boardH + 2, 0.15), neonMat);
        side.position.set(nx, boardH / 2 + 1, -0.5);
        ctx.scene.add(side);
        p.staticMeshes.push(side);
      }

      // === FLASHING SIDE LIGHTS ===
      const sideLights = [];
      const flashColors = [0xff0044, 0x00ff88, 0xffaa00, 0x4488ff];
      for (const xSide of [-(boardW / 2 + 1.5), boardW / 2 + 1.5]) {
        for (let ly = 2; ly < boardH + 2; ly += 2) {
          const fc = flashColors[Math.floor(ly / 2) % flashColors.length];
          const flashBulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshStandardMaterial({ color: fc, emissive: fc, emissiveIntensity: 1.0, transparent: true }));
          flashBulb.position.set(xSide, ly, -1.2);
          ctx.scene.add(flashBulb);
          p.staticMeshes.push(flashBulb);
          sideLights.push({ mesh: flashBulb, baseColor: fc, offset: ly * 0.5 });
        }
      }

      // Animate flashing lights — dramatic chase pattern
      p.animatedObjects.push({
        state: {},
        update(dt) {
          const t = performance.now() * 0.005;
          for (let i = 0; i < sideLights.length; i++) {
            const sl = sideLights[i];
            // Chase pattern: each light blinks in sequence
            const phase = (t + i * 0.4) % (Math.PI * 2);
            const on = phase < Math.PI * 0.6;
            sl.mesh.material.emissiveIntensity = on ? 1.2 : 0.05;
            sl.mesh.material.opacity = on ? 1 : 0.3;
          }
        },
      });

      // Grid
      const grid = new THREE.GridHelper(30, 30, 0x221133, 0x221133);
      grid.position.y = 1.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      p.reset = () => {
        for (const sp of spinners) {
          sp.body.setAngvel({ x: 0, y: 0, z: sp.speed }, true);
        }
      };

      return p;
    },
  };
}
