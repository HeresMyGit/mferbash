import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createStairLevel(ctx) {
  // Compute dimensions from current settings each time
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

      // Floor tiles around the base
      const tileMat1 = new THREE.MeshStandardMaterial({ color: 0xc4b8a0, roughness: 0.7 });
      const tileMat2 = new THREE.MeshStandardMaterial({ color: 0xd6cbaf, roughness: 0.7 });
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

      // Steps go from left (bottom) to right (top)
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

      // Top landing
      addBox(ctx, p, { x: topX, y: topY, z: 0 }, { x: 5, y: 0.3, z: stepW }, 0xb0a08a, { roughness: 0.5, friction: 0.6 });

      // === RAILINGS ===
      const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.8 });
      for (const zSide of [-stepW / 2 - 0.1, stepW / 2 + 0.1]) {
        // Posts every 3 steps
        for (let i = 0; i <= N; i += 3) {
          const x = i * stepD;
          const y = 1 + (i + 1) * stepH;
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), railMat);
          post.position.set(x, y + 0.45, zSide);
          post.castShadow = true;
          ctx.scene.add(post);
          p.staticMeshes.push(post);
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

      // Barrels at the bottom
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

      // Potted plants on top landing
      for (const pz of [-3.5, 3.5]) {
        const pot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8 }));
        pot.position.set(topX + 1.5, topY + 0.3, pz);
        pot.castShadow = true;
        ctx.scene.add(pot);
        const potBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(topX + 1.5, topY + 0.3, pz).setLinearDamping(0.5).setAngularDamping(0.5));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.25, 0.3, 0.25).setMass(3).setRestitution(0.2).setFriction(0.6), potBody);
        p.dynamicParts.push({ mesh: pot, body: potBody, initPos: { x: topX + 1.5, y: topY + 0.3, z: pz } });
        const plant = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 }));
        plant.position.set(0, 0.5, 0);
        pot.add(plant);
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
