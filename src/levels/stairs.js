import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createStairLevel(ctx) {
  const N = ctx.settings.stairCount;
  const stepH = 0.28, stepD = 0.5;
  const totalH = N * stepH;
  const totalD = N * stepD;
  const topY = 1 + totalH + stepH;
  const topX = totalD + 2;

  return {
    name: 'stairs',
    spawnPos: { x: topX - 1, y: topY, z: 0 },
    groundY: 1,
    settingsOverrides: { damping: 0.3 },
    cameraStart: { pos: [topX - 2, topY + 3, 8], lookAt: [topX - 1, topY, 0] },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky
      ctx.scene.background = new THREE.Color(0x87ceeb);
      ctx.scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

      // === GROUND ===
      const groundSize = Math.max(60, totalD + 20);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, 40),
        new THREE.MeshStandardMaterial({ color: 0x6b8c5a, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(groundSize / 2, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // Marble-style floor tiles
      const tileMat1 = new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.4, metalness: 0.1 });
      const tileMat2 = new THREE.MeshStandardMaterial({ color: 0xe0d5c0, roughness: 0.4, metalness: 0.1 });
      for (let tx = -8; tx <= totalD + 10; tx += 2) {
        for (let tz = -8; tz <= 8; tz += 2) {
          const tile = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 1.9),
            (tx + tz) % 4 === 0 ? tileMat1 : tileMat2);
          tile.position.set(tx, 1.01, tz);
          tile.receiveShadow = true;
          ctx.scene.add(tile);
          p.staticMeshes.push(tile);
        }
      }

      // === STAIRCASE ===
      const stairMat = new THREE.MeshStandardMaterial({ color: 0xb0a08a, roughness: 0.5, metalness: 0.05 });
      const stepW = 10;

      for (let i = 0; i < N; i++) {
        const x = i * stepD;
        const y = 1 + (i + 1) * stepH;
        const stair = new THREE.Mesh(new THREE.BoxGeometry(stepD, stepH, stepW), stairMat);
        stair.position.set(x, y, 0);
        stair.castShadow = true;
        stair.receiveShadow = true;
        ctx.scene.add(stair);
        p.staticMeshes.push(stair);
        const sb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(stepD / 2, stepH / 2, stepW / 2).setRestitution(0.2).setFriction(0.6), sb);
        p.staticBodies.push(sb);
      }

      // === RED CARPET RUNNER ===
      const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.9 });
      for (let i = 0; i < N; i++) {
        const x = i * stepD;
        const y = 1 + (i + 1) * stepH + stepH / 2 + 0.005;
        const carpet = new THREE.Mesh(new THREE.BoxGeometry(stepD + 0.01, 0.01, 3), carpetMat);
        carpet.position.set(x, y, 0);
        carpet.receiveShadow = true;
        ctx.scene.add(carpet);
        p.staticMeshes.push(carpet);
      }
      // Carpet on landing
      const landingCarpet = new THREE.Mesh(new THREE.BoxGeometry(5, 0.01, 3), carpetMat);
      landingCarpet.position.set(topX, topY + 0.155, 0);
      ctx.scene.add(landingCarpet);
      p.staticMeshes.push(landingCarpet);
      // Carpet at bottom
      const bottomCarpet = new THREE.Mesh(new THREE.BoxGeometry(4, 0.01, 3), carpetMat);
      bottomCarpet.position.set(-2, 1.03, 0);
      ctx.scene.add(bottomCarpet);
      p.staticMeshes.push(bottomCarpet);

      // Top landing
      addBox(ctx, p, { x: topX, y: topY, z: 0 }, { x: 5, y: 0.3, z: stepW }, 0xb0a08a, { roughness: 0.5, friction: 0.6 });

      // === RAILINGS WITH GOLD BALLS ===
      const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.8 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.2, metalness: 0.9 });
      for (const zSide of [-stepW / 2 - 0.1, stepW / 2 + 0.1]) {
        // Posts every 2 steps (denser)
        for (let i = 0; i <= N; i += 2) {
          const x = i * stepD;
          const y = 1 + (i + 1) * stepH;
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), railMat);
          post.position.set(x, y + 0.45, zSide);
          post.castShadow = true;
          ctx.scene.add(post);
          p.staticMeshes.push(post);
          // Gold ball on top
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), goldMat);
          ball.position.set(x, y + 0.93, zSide);
          ctx.scene.add(ball);
          p.staticMeshes.push(ball);
        }
        // Angled rail
        const railStartX = 0, railEndX = N * stepD;
        const railStartY = 1 + stepH + 0.9, railEndY = topY + 0.9;
        const railLen = Math.sqrt((railEndX - railStartX) ** 2 + (railEndY - railStartY) ** 2);
        const railAngle = Math.atan2(railEndY - railStartY, railEndX - railStartX);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.06, 0.06), railMat);
        rail.position.set((railStartX + railEndX) / 2, (railStartY + railEndY) / 2, zSide);
        rail.rotation.z = railAngle;
        ctx.scene.add(rail);
        p.staticMeshes.push(rail);
        // Landing rail
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.06, 0.06), railMat);
        topRail.position.set(topX, topY + 0.9, zSide);
        ctx.scene.add(topRail);
        p.staticMeshes.push(topRail);
      }

      // === GRAND ENTRANCE ARCH at top ===
      const archMat = new THREE.MeshStandardMaterial({ color: 0xa09080, roughness: 0.4, metalness: 0.1 });
      // Pillars
      for (const az of [-3, 3]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), archMat);
        pillar.position.set(topX + 2.2, topY + 2, az);
        pillar.castShadow = true;
        ctx.scene.add(pillar);
        p.staticMeshes.push(pillar);
        // Pillar cap
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), archMat);
        cap.position.set(topX + 2.2, topY + 4.1, az);
        ctx.scene.add(cap);
        p.staticMeshes.push(cap);
        // Pillar base
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.8), archMat);
        base.position.set(topX + 2.2, topY + 0.07, az);
        ctx.scene.add(base);
        p.staticMeshes.push(base);
      }
      // Crossbeam
      const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 7), archMat);
      crossbeam.position.set(topX + 2.2, topY + 4.35, 0);
      ctx.scene.add(crossbeam);
      p.staticMeshes.push(crossbeam);

      // === LAMP POSTS ===
      const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.7 });
      const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xffeecc, emissive: 0xffddaa, emissiveIntensity: 0.8 });
      for (const [lx, lz] of [[-3, -5.5], [-3, 5.5], [totalD + 4, -5.5], [totalD + 4, 5.5]]) {
        // Pole
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.1), lampPoleMat);
        pole.position.set(lx, 2.5, lz);
        pole.castShadow = true;
        ctx.scene.add(pole);
        p.staticMeshes.push(pole);
        // Lamp housing
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), lampPoleMat);
        housing.position.set(lx, 4.2, lz);
        ctx.scene.add(housing);
        p.staticMeshes.push(housing);
        // Glowing bulb
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), lampGlowMat);
        bulb.position.set(lx, 3.95, lz);
        ctx.scene.add(bulb);
        p.staticMeshes.push(bulb);
        // Point light for actual illumination
        const light = new THREE.PointLight(0xffddaa, 0.5, 8);
        light.position.set(lx, 3.9, lz);
        ctx.scene.add(light);
        p.staticMeshes.push(light);
      }

      // === RAMP at bottom ===
      addBox(ctx, p, { x: -5, y: 1.2, z: 0 }, { x: 4, y: 0.15, z: 4 }, 0xe94560,
        { rotZ: 0.2, roughness: 0.5, restitution: 0.6, friction: 0.3 });

      // === DYNAMIC OBJECTS at bottom ===
      for (let i = 0; i < 6; i++) {
        const s = 0.3 + Math.random() * 0.4;
        addDynamicBox(ctx, p, {
          x: -4 + Math.random() * 6 - 3,
          y: 1 + s / 2,
          z: -3 + Math.random() * 6
        }, s, 0xcc6644);
      }

      // Barrels
      for (let i = 0; i < 4; i++) {
        const s = 0.4;
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(s, s * 2, s),
          new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.7 }));
        const bx = -6 + Math.random() * 4, bz = -2 + Math.random() * 4;
        barrel.position.set(bx, 1 + s, bz);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        ctx.scene.add(barrel);
        const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(bx, 1 + s, bz).setLinearDamping(0.4).setAngularDamping(0.4));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(s / 2, s, s / 2).setMass(2).setRestitution(0.3).setFriction(0.5), bb);
        p.dynamicParts.push({ mesh: barrel, body: bb, initPos: { x: bx, y: 1 + s, z: bz } });
      }

      // === ORNATE URNS on top landing (replace basic pots) ===
      const urnMat = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.5, metalness: 0.2 });
      for (const pz of [-3.5, 3.5]) {
        // Urn body
        const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.7, 12), urnMat);
        urn.position.set(topX + 1.5, topY + 0.35, pz);
        urn.castShadow = true;
        ctx.scene.add(urn);
        // Urn rim
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.1, 12), urnMat);
        rim.position.set(0, 0.4, 0);
        urn.add(rim);
        // Urn base
        const urnBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), urnMat);
        urnBase.position.set(0, -0.35, 0);
        urn.add(urnBase);
        // Plant
        const plant = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 }));
        plant.position.set(0, 0.55, 0);
        urn.add(plant);
        // Physics
        const potBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(topX + 1.5, topY + 0.35, pz).setLinearDamping(0.5).setAngularDamping(0.5));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.25, 0.35, 0.25).setMass(3).setRestitution(0.2).setFriction(0.6), potBody);
        p.dynamicParts.push({ mesh: urn, body: potBody, initPos: { x: topX + 1.5, y: topY + 0.35, z: pz } });
      }

      // === BACKGROUND TREES (behind the stairs only, negative Z) ===
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.8 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.9 });
      for (let i = 0; i < 8; i++) {
        const tx = -10 + Math.random() * (totalD + 25);
        const tz = -(10 + Math.random() * 6); // always behind the stairs
        const treeH = 3 + Math.random() * 3;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, treeH, 6), trunkMat);
        trunk.position.set(tx, 1 + treeH / 2, tz);
        trunk.castShadow = true;
        ctx.scene.add(trunk);
        p.staticMeshes.push(trunk);
        const canopySize = 1 + Math.random() * 1.5;
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(canopySize, 8, 8), leafMat);
        canopy.position.set(tx, 1 + treeH + canopySize * 0.5, tz);
        canopy.castShadow = true;
        ctx.scene.add(canopy);
        p.staticMeshes.push(canopy);
      }

      // === SCATTERED DEBRIS at bottom for atmosphere ===
      const debrisMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.8 });
      for (let i = 0; i < 8; i++) {
        const ds = 0.05 + Math.random() * 0.15;
        const debris = new THREE.Mesh(new THREE.BoxGeometry(ds, ds * 0.5, ds * 0.8), debrisMat);
        debris.position.set(-5 + Math.random() * 8, 1.01 + ds * 0.25, -4 + Math.random() * 8);
        debris.rotation.y = Math.random() * Math.PI;
        ctx.scene.add(debris);
        p.staticMeshes.push(debris);
      }

      // Grid
      const grid = new THREE.GridHelper(Math.max(40, totalD + 10), 40, 0x999980, 0x999980);
      grid.position.y = 1.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      return p;
    },
  };
}
