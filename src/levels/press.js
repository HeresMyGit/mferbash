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

      // Sky — industrial
      ctx.scene.background = new THREE.Color(0x7a8a9a);
      ctx.scene.fog = new THREE.FogExp2(0x7a8a9a, 0.015);

      // Ground — concrete
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30),
        new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 15).setRestitution(0.2).setFriction(0.8), gb);
      p.staticBodies.push(gb);

      // Steel grating floor
      const gratingMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.6, metalness: 0.5 });
      for (let tx = -6; tx <= 6; tx += 1.2) {
        for (let tz = -4; tz <= 4; tz += 1.2) {
          const grate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 1.1), gratingMat);
          grate.position.set(tx, 1.01, tz);
          grate.receiveShadow = true;
          ctx.scene.add(grate);
          p.staticMeshes.push(grate);
          // Grate lines
          for (let g = -0.4; g <= 0.4; g += 0.2) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.035, 0.02),
              new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.6 }));
            line.position.set(tx, 1.02, tz + g);
            ctx.scene.add(line);
            p.staticMeshes.push(line);
          }
        }
      }

      // Oil stains on ground
      const oilMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.4 });
      for (let i = 0; i < 6; i++) {
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + Math.random() * 1, 0.4 + Math.random() * 0.8), oilMat);
        stain.rotation.x = -Math.PI / 2;
        stain.rotation.z = Math.random() * Math.PI;
        stain.position.set(-4 + Math.random() * 8, 1.015, -3 + Math.random() * 6);
        ctx.scene.add(stain);
        p.staticMeshes.push(stain);
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
        for (const zSide of [-2, 2]) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), frameMat);
          col.position.set(xSide, 5, zSide);
          col.castShadow = true;
          ctx.scene.add(col);
          p.staticMeshes.push(col);
          const cb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(xSide, 5, zSide));
          ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 4, 0.3).setRestitution(0.3).setFriction(0.5), cb);
          p.staticBodies.push(cb);

          // Black/yellow warning stripes on columns
          for (let sy = 1.5; sy < 9; sy += 0.6) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.15, 0.62),
              sy % 1.2 < 0.6
                ? new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 })
                : new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
            stripe.position.set(xSide, sy, zSide);
            ctx.scene.add(stripe);
            p.staticMeshes.push(stripe);
          }

          // Hydraulic fluid lines (red tubes)
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7, 6),
            new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.5, metalness: 0.3 }));
          tube.position.set(xSide + 0.25, 5, zSide + 0.25);
          ctx.scene.add(tube);
          p.staticMeshes.push(tube);
          // Black hydraulic line
          const tube2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 7, 6),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
          tube2.position.set(xSide - 0.2, 5, zSide + 0.2);
          ctx.scene.add(tube2);
          p.staticMeshes.push(tube2);
        }
      }

      // Top crossbeam
      addBox(ctx, p, { x: 0, y: 9, z: 0 }, { x: 7.2, y: 0.8, z: 5 }, 0xcc2222,
        { roughness: 0.4, noPhysics: true });

      // Hydraulic cylinder
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2, 16), darkSteelMat);
      cylinder.position.set(0, 8, 0);
      cylinder.castShadow = true;
      ctx.scene.add(cylinder);
      p.staticMeshes.push(cylinder);

      // Cable conduits along base
      const conduitMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.4 });
      for (const cz of [-2.8, 2.8]) {
        const conduit = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 0.15), conduitMat);
        conduit.position.set(0, 1.1, cz);
        ctx.scene.add(conduit);
        p.staticMeshes.push(conduit);
      }

      // === THE PRESS PLATE ===
      const plateW = 5.5, plateH = 0.5, plateD = 4.5;
      const plateStartY = 7;

      const plateGroup = new THREE.Group();
      // Main plate with warning stripes
      const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, plateH, plateD), steelMat);
      plate.castShadow = true;
      plateGroup.add(plate);
      // Warning stripes on plate bottom
      for (let sx = -2; sx <= 2; sx += 1) {
        const warnStripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, plateD - 0.4),
          new THREE.MeshStandardMaterial({ color: sx % 2 === 0 ? 0xffcc00 : 0x222222, roughness: 0.5 }));
        warnStripe.position.set(sx, -plateH / 2 - 0.01, 0);
        plateGroup.add(warnStripe);
      }
      // Piston rod
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3, 12), darkSteelMat);
      piston.position.set(0, 1.7, 0);
      plateGroup.add(piston);
      // Ridges
      for (let rz = -1.5; rz <= 1.5; rz += 1) {
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(plateW - 0.4, 0.1, 0.15), darkSteelMat);
        ridge.position.set(0, -plateH / 2 - 0.05, rz);
        plateGroup.add(ridge);
      }

      plateGroup.position.set(0, plateStartY, 0);
      ctx.scene.add(plateGroup);

      // Plate physics
      const plateBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, plateStartY, 0));
      ctx.world.createCollider(
        RAPIER.ColliderDesc.cuboid(plateW / 2, plateH / 2, plateD / 2)
          .setRestitution(0.05).setFriction(0.9)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), plateBody);

      const pressState = {
        active: false, currentY: plateStartY, startY: plateStartY,
        minY: 1 + baseH + plateH / 2 + 0.3,
        speed: 0.8, phase: 'waiting', holdTimer: 0,
        body: plateBody, group: plateGroup,
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
              for (const mfer of ctx.mfers) { ctx.detachAccessories(mfer); mfer.canDetach = false; }
              if (ctx.playCrush) ctx.playCrush();
            }
          } else if (pressState.phase === 'holding') {
            pressState.holdTimer -= dt;
            pressState.currentY = pressState.minY + Math.sin(pressState.holdTimer * 8) * 0.03;
            if (pressState.holdTimer <= 0) pressState.phase = 'releasing';
          } else if (pressState.phase === 'releasing') {
            pressState.currentY += pressState.speed * 2 * dt;
            if (pressState.currentY >= pressState.startY) {
              pressState.currentY = pressState.startY;
              pressState.phase = 'waiting';
            }
          }

          plateBody.setNextKinematicTranslation({ x: 0, y: pressState.currentY, z: 0 });
          plateGroup.position.set(0, pressState.currentY, 0);

          if (pressState.phase === 'pressing' && pressState.currentY < 4) {
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

      // === CONTROL PANEL (detailed) ===
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.4 });
      const panel = new THREE.Group();
      // Panel body
      const panelBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.5), panelMat);
      panel.add(panelBody);
      // Panel face plate
      const facePlate = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.3 }));
      facePlate.position.set(0, 0.1, 0.27);
      panel.add(facePlate);
      // Green start button
      const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0x00cc00, emissive: 0x00cc00, emissiveIntensity: 0.5 }));
      startBtn.position.set(-0.25, 0.3, 0.32);
      startBtn.rotation.x = Math.PI / 2;
      panel.add(startBtn);
      // Emergency stop — big red mushroom button
      const estop = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xdd0000, emissive: 0xdd0000, emissiveIntensity: 0.3 }));
      estop.position.set(0.25, 0.3, 0.32);
      estop.rotation.x = Math.PI / 2;
      panel.add(estop);
      // Pressure gauge
      const gaugeFace = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 }));
      gaugeFace.position.set(0, -0.2, 0.32);
      gaugeFace.rotation.x = Math.PI / 2;
      panel.add(gaugeFace);
      // Gauge rim
      const gaugeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 }));
      gaugeRim.position.set(0, -0.2, 0.31);
      gaugeRim.rotation.x = Math.PI / 2;
      panel.add(gaugeRim);
      // Gauge needle
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xff0000 }));
      needle.position.set(0, -0.15, 0.35);
      needle.rotation.z = -0.5;
      panel.add(needle);
      // Status lights on panel
      for (let i = 0; i < 3; i++) {
        const statusLight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
          new THREE.MeshStandardMaterial({ color: [0xff0000, 0xffaa00, 0x00ff00][i],
            emissive: [0xff0000, 0xffaa00, 0x00ff00][i], emissiveIntensity: 0.3 }));
        statusLight.position.set(-0.3 + i * 0.3, 0.6, 0.32);
        panel.add(statusLight);
      }

      panel.position.set(-5, 1.9, -1);
      panel.castShadow = true;
      ctx.scene.add(panel);
      p.staticMeshes.push(panel);

      // Panel pedestal
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), panelMat);
      pedestal.position.set(-5, 1.5, -1);
      ctx.scene.add(pedestal);
      p.staticMeshes.push(pedestal);

      // === WARNING SIGN (on back wall) ===
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 }));
      sign.position.set(0, 4, -6);
      ctx.scene.add(sign);
      p.staticMeshes.push(sign);
      const dangerSign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.6 }));
      dangerSign.position.set(0, 4, -5.97);
      ctx.scene.add(dangerSign);
      p.staticMeshes.push(dangerSign);

      // === OVERHEAD WORK LIGHTS ===
      const workGlowMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 1.0 });
      for (const [lx, lz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), workGlowMat);
        bulb.position.set(lx, 8.5, lz);
        ctx.scene.add(bulb);
        p.staticMeshes.push(bulb);
        const light = new THREE.PointLight(0xffeeaa, 0.5, 10);
        light.position.set(lx, 8.4, lz);
        ctx.scene.add(light);
        p.staticMeshes.push(light);
      }

      // === INDUSTRIAL CEILING BEAMS ===
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.4 });
      for (const bz of [-5, 0, 5]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 0.4), beamMat);
        beam.position.set(0, 11, bz);
        ctx.scene.add(beam);
        p.staticMeshes.push(beam);
      }
      // Cross beams
      for (const bx of [-6, 0, 6]) {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 12), beamMat);
        cBeam.position.set(bx, 10.8, 0);
        ctx.scene.add(cBeam);
        p.staticMeshes.push(cBeam);
      }

      // === SCATTERED ITEMS ===
      for (let i = 0; i < 4; i++) {
        const s = 0.2 + Math.random() * 0.2;
        addDynamicBox(ctx, p, {
          x: -5 + Math.random() * 3,
          y: 1 + s / 2,
          z: -2 + Math.random() * 4
        }, s, 0x888888);
      }

      // Sparks/debris near base
      const sparkMat = new THREE.MeshStandardMaterial({ color: 0xaa8855, roughness: 0.8 });
      for (let i = 0; i < 10; i++) {
        const spark = new THREE.Mesh(new THREE.BoxGeometry(0.05 + Math.random() * 0.1, 0.02, 0.05 + Math.random() * 0.1), sparkMat);
        spark.position.set(-3 + Math.random() * 6, 1.02, -2.5 + Math.random() * 5);
        spark.rotation.y = Math.random() * Math.PI;
        ctx.scene.add(spark);
        p.staticMeshes.push(spark);
      }

      // Lights mounted on bottom of press plate, shining down
      for (const [lx, lz] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 1 }));
        bulb.position.set(lx, -plateH / 2 - 0.1, lz);
        plateGroup.add(bulb);
        const spot = new THREE.SpotLight(0xffeedd, 15, 12, Math.PI / 3, 0.3);
        spot.position.set(lx, -plateH / 2 - 0.1, lz);
        const target = new THREE.Object3D();
        target.position.set(0, -plateH / 2 - 5, 0);
        plateGroup.add(target);
        spot.target = target;
        plateGroup.add(spot);
      }

      // Grid
      const grid = new THREE.GridHelper(20, 20, 0x555544, 0x555544);
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
        if (ctx.playHiss) ctx.playHiss();
      }
    },
  };
}
