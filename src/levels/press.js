import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createPressLevel(ctx) {
  return {
    name: 'press',
    spawnPos: { x: 0, y: 1.6, z: 0 },
    groundY: 1.6,
    cameraStart: { pos: [0, 5, 8], lookAt: [0, 2.5, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.5 },
    keepIdleUntilImpact: true,

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — industrial gray
      ctx.scene.background = new THREE.Color(0x8899aa);
      ctx.scene.fog = new THREE.FogExp2(0x8899aa, 0.015);

      // Ground — concrete floor
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30),
        new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 15).setRestitution(0.2).setFriction(0.8), gb);
      p.staticBodies.push(gb);

      // Floor tiles — industrial checker plate
      const tileMat1 = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7, metalness: 0.3 });
      const tileMat2 = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.7, metalness: 0.3 });
      for (let tx = -6; tx <= 6; tx += 1.5) {
        for (let tz = -4; tz <= 4; tz += 1.5) {
          const tile = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 1.4),
            (Math.floor(tx) + Math.floor(tz)) % 2 === 0 ? tileMat1 : tileMat2);
          tile.position.set(tx, 1.01, tz);
          tile.receiveShadow = true;
          ctx.scene.add(tile);
          p.staticMeshes.push(tile);
        }
      }

      // === PRESS MACHINE FRAME ===
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.5 });
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.7 });
      const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 });

      // Base platform (the anvil)
      const baseW = 6, baseD = 5, baseH = 0.6;
      addBox(ctx, p, { x: 0, y: 1 + baseH / 2, z: 0 }, { x: baseW, y: baseH, z: baseD }, 0x999999,
        { roughness: 0.3, friction: 0.8, restitution: 0.1 });

      // Side columns
      for (const xSide of [-3.3, 3.3]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), frameMat);
        col.position.set(xSide, 5, -2);
        col.castShadow = true;
        ctx.scene.add(col);
        p.staticMeshes.push(col);
        const cb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(xSide, 5, -2));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 4, 0.3).setRestitution(0.3).setFriction(0.5), cb);
        p.staticBodies.push(cb);

        const col2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), frameMat);
        col2.position.set(xSide, 5, 2);
        col2.castShadow = true;
        ctx.scene.add(col2);
        p.staticMeshes.push(col2);
        const cb2 = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(xSide, 5, 2));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 4, 0.3).setRestitution(0.3).setFriction(0.5), cb2);
        p.staticBodies.push(cb2);
      }

      // Top crossbeam
      addBox(ctx, p, { x: 0, y: 9, z: 0 }, { x: 7.2, y: 0.8, z: 5 }, 0xcc2222,
        { roughness: 0.4, noPhysics: true });

      // Hydraulic cylinder (visual, on top)
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2, 16),
        darkSteelMat);
      cylinder.position.set(0, 8, 0);
      cylinder.castShadow = true;
      ctx.scene.add(cylinder);
      p.staticMeshes.push(cylinder);

      // === THE PRESS PLATE (moves down) ===
      const plateW = 5.5, plateH = 0.5, plateD = 4.5;
      const plateStartY = 7;

      const plateGroup = new THREE.Group();
      // Main plate
      const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, plateH, plateD), steelMat);
      plate.castShadow = true;
      plateGroup.add(plate);
      // Piston rod
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3, 12), darkSteelMat);
      piston.position.set(0, 1.7, 0);
      plateGroup.add(piston);
      // Ridges on the press plate
      for (let rz = -1.5; rz <= 1.5; rz += 1) {
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(plateW - 0.4, 0.1, 0.15), darkSteelMat);
        ridge.position.set(0, -plateH / 2 - 0.05, rz);
        plateGroup.add(ridge);
      }

      plateGroup.position.set(0, plateStartY, 0);
      ctx.scene.add(plateGroup);

      // Plate physics — kinematic, moves down slowly
      const plateBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, plateStartY, 0));
      ctx.world.createCollider(
        RAPIER.ColliderDesc.cuboid(plateW / 2, plateH / 2, plateD / 2)
          .setRestitution(0.05).setFriction(0.9)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), plateBody);

      const pressState = {
        active: false,
        currentY: plateStartY,
        startY: plateStartY,
        minY: 1 + baseH + plateH / 2 + 0.3, // just above the base
        speed: 0.8, // units per second — slow and crushing
        phase: 'waiting', // waiting, pressing, holding, releasing
        holdTimer: 0,
        body: plateBody,
        group: plateGroup,
      };

      p.animatedObjects.push({
        group: plateGroup, body: plateBody, state: pressState,
        update(dt) {
          if (!pressState.active) return;

          if (pressState.phase === 'pressing') {
            pressState.currentY -= pressState.speed * dt;
            if (pressState.currentY <= pressState.minY) {
              pressState.currentY = pressState.minY;
              pressState.phase = 'holding';
              pressState.holdTimer = 2;
              // Crush! Force all accessories off at once
              for (const mfer of ctx.mfers) { ctx.detachAccessories(mfer); mfer.canDetach = false; }
            }
          } else if (pressState.phase === 'holding') {
            pressState.holdTimer -= dt;
            // Slight grinding pressure oscillation
            pressState.currentY = pressState.minY + Math.sin(pressState.holdTimer * 8) * 0.03;
            if (pressState.holdTimer <= 0) {
              pressState.phase = 'releasing';
            }
          } else if (pressState.phase === 'releasing') {
            pressState.currentY += pressState.speed * 2 * dt; // release faster
            if (pressState.currentY >= pressState.startY) {
              pressState.currentY = pressState.startY;
              pressState.phase = 'waiting';
            }
          }

          plateBody.setNextKinematicTranslation({ x: 0, y: pressState.currentY, z: 0 });
          plateGroup.position.set(0, pressState.currentY, 0);

          // Convert idle ctx.mfers when plate gets close
          if (pressState.phase === 'pressing' && pressState.currentY < 4) {
            const remaining = [];
            for (const pm of ctx.placedMfers) {
              const mfer = ctx.createRagdoll(pm.scene);
              if (mfer) {
                mfer.ragdollActive = true;
                ctx.captureImpactShot(mfer);
                ctx.mfers.push(mfer);
              }
            }
            ctx.placedMfers = [];
          }
        },
      });

      p.pressState = pressState;

      // === WARNING ELEMENTS ===
      // Caution stripes on the frame
      const cautionMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });
      for (const xSide of [-3.3, 3.3]) {
        for (let sy = 2; sy < 8; sy += 1.5) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.62), cautionMat);
          stripe.position.set(xSide, sy, -2);
          ctx.scene.add(stripe);
          p.staticMeshes.push(stripe);
        }
      }

      // Warning sign
      const signMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.08), signMat);
      sign.position.set(5, 3, 0);
      sign.rotation.y = -0.3;
      ctx.scene.add(sign);
      p.staticMeshes.push(sign);
      const dangerSign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.6 }));
      dangerSign.position.set(5, 3, 0.05);
      dangerSign.rotation.y = -0.3;
      ctx.scene.add(dangerSign);
      p.staticMeshes.push(dangerSign);

      // === SCATTERED ITEMS ===
      // Small metal debris
      for (let i = 0; i < 4; i++) {
        const s = 0.2 + Math.random() * 0.2;
        addDynamicBox(ctx, p, {
          x: -5 + Math.random() * 3,
          y: 1 + s / 2,
          z: -2 + Math.random() * 4
        }, s, 0x888888);
      }

      // Control panel (decorative)
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.4 }));
      panel.position.set(-5, 1.75, -1);
      panel.castShadow = true;
      ctx.scene.add(panel);
      p.staticMeshes.push(panel);
      // Button on panel
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0x00cc00, emissive: 0x00cc00, emissiveIntensity: 0.5 }));
      button.position.set(-5, 2.3, -0.7);
      button.rotation.x = Math.PI / 2;
      ctx.scene.add(button);
      p.staticMeshes.push(button);

      // Grid
      const grid = new THREE.GridHelper(20, 20, 0x666655, 0x666655);
      grid.position.y = 1.01;
      ctx.scene.add(grid);
      p.helpers.push(grid);

      p.reset = () => {
        pressState.active = false;
        pressState.currentY = pressState.startY;
        pressState.phase = 'waiting';
        pressState.holdTimer = 0;
        plateBody.setTranslation({ x: 0, y: pressState.startY, z: 0 }, true);
        plateGroup.position.set(0, pressState.startY, 0);
      };

      return p;
    },

    onDrop(lp) {
      if (lp.pressState) {
        lp.pressState.active = true;
        lp.pressState.phase = 'pressing';
      }
    },
  };
}

