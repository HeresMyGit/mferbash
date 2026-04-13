import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, newParts } from '../gameState.js';

export default function createPoolLevel(ctx) {
  // Pool dimensions
  const poolW = 12, poolD = 8, poolDepth = 3.5;
  const wallThick = 0.4;
  const floorY = -poolDepth;
  const rimY = 0;
  const FLOAT_OFFSETS = {
    head: 0.12,
    spine: 0.34,
    hips: 0.52,
    leftUpperArm: 0.28,
    leftForeArm: 0.34,
    rightUpperArm: 0.28,
    rightForeArm: 0.34,
    leftUpperLeg: 0.72,
    leftLowerLeg: 0.98,
    rightUpperLeg: 0.72,
    rightLowerLeg: 0.98,
  };

  return {
    name: 'pool',
    spawnPos: { x: 0, y: floorY + 0.2, z: 0 },
    groundY: floorY + 0.2,
    cameraStart: { pos: [-8, 5, 8], lookAt: [0, -1.5, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.5 },
    keepIdleUntilImpact: true,
    cameraFollow: { offX: -3, offY: 4, offZ: 6, minY: 1 },

    autoSpawn: [
      { x: -3, y: floorY + 0.2, z: -1.5 },
      { x: 0, y: floorY + 0.2, z: 0 },
      { x: 3, y: floorY + 0.2, z: 1.5 },
      { x: -1.5, y: floorY + 0.2, z: 2 },
      { x: 2, y: floorY + 0.2, z: -2 },
      { x: -3.5, y: floorY + 0.2, z: 1 },
    ],

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — sunny day
      ctx.scene.background = new THREE.Color(0x66bbee);
      ctx.scene.fog = new THREE.FogExp2(0x66bbee, 0.008);

      // === DECK / GROUND ===
      const deckMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 });
      // 4 deck strips around pool
      const deckW = 8;
      // North deck
      const dn = new THREE.Mesh(new THREE.BoxGeometry(poolW + deckW * 2, 0.2, deckW), deckMat);
      dn.position.set(0, -0.1, -(poolD / 2 + deckW / 2));
      dn.receiveShadow = true;
      ctx.scene.add(dn); p.staticMeshes.push(dn);
      // South deck
      const ds = new THREE.Mesh(new THREE.BoxGeometry(poolW + deckW * 2, 0.2, deckW), deckMat);
      ds.position.set(0, -0.1, poolD / 2 + deckW / 2);
      ds.receiveShadow = true;
      ctx.scene.add(ds); p.staticMeshes.push(ds);
      // East deck
      const de = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.2, poolD), deckMat);
      de.position.set(poolW / 2 + deckW / 2, -0.1, 0);
      de.receiveShadow = true;
      ctx.scene.add(de); p.staticMeshes.push(de);
      // West deck
      const dw = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.2, poolD), deckMat);
      dw.position.set(-(poolW / 2 + deckW / 2), -0.1, 0);
      dw.receiveShadow = true;
      ctx.scene.add(dw); p.staticMeshes.push(dw);
      // Deck physics
      for (const [x, z, hw, hd] of [
        [0, -(poolD / 2 + deckW / 2), (poolW + deckW * 2) / 2, deckW / 2],
        [0, poolD / 2 + deckW / 2, (poolW + deckW * 2) / 2, deckW / 2],
        [poolW / 2 + deckW / 2, 0, deckW / 2, poolD / 2],
        [-(poolW / 2 + deckW / 2), 0, deckW / 2, poolD / 2],
      ]) {
        const b = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, -0.1, z));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(hw, 0.1, hd).setRestitution(0.3).setFriction(0.7), b);
        p.staticBodies.push(b);
      }

      // Grass strips beyond deck (4 strips around pool, NOT covering it)
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.95 });
      const grassDist = poolW / 2 + deckW + 15;
      for (const [gx, gz, gw, gd] of [
        [0, -(poolD / 2 + deckW + 15), 60, 30],  // north
        [0, poolD / 2 + deckW + 15, 60, 30],      // south
        [-(poolW / 2 + deckW + 15), 0, 30, poolD + deckW * 2], // west
        [poolW / 2 + deckW + 15, 0, 30, poolD + deckW * 2],    // east
      ]) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), grassMat);
        g.rotation.x = -Math.PI / 2;
        g.position.set(gx, -0.12, gz);
        g.receiveShadow = true;
        ctx.scene.add(g); p.staticMeshes.push(g);
      }

      // === POOL STRUCTURE ===
      const tileMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.3, metalness: 0.1 });
      const floorMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 0.4 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.5 });

      // Pool floor
      const floor = new THREE.Mesh(new THREE.BoxGeometry(poolW, 0.15, poolD), floorMat);
      floor.position.set(0, floorY, 0);
      floor.receiveShadow = true;
      ctx.scene.add(floor); p.staticMeshes.push(floor);
      const floorBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorY - 0.1, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(poolW / 2, 0.1, poolD / 2).setRestitution(0.2).setFriction(0.6), floorBody);
      p.staticBodies.push(floorBody);

      // Lane lines on pool floor
      const laneMat = new THREE.MeshStandardMaterial({ color: 0x2266aa, roughness: 0.3 });
      for (let lz = -3; lz <= 3; lz += 2) {
        const lane = new THREE.Mesh(new THREE.BoxGeometry(poolW - 1, 0.02, 0.1), laneMat);
        lane.position.set(0, floorY + 0.08, lz);
        ctx.scene.add(lane); p.staticMeshes.push(lane);
      }

      // Pool walls (4 sides, inside faces)
      const walls = [
        { pos: [0, floorY + poolDepth / 2, -(poolD / 2 + wallThick / 2)], size: [poolW / 2 + wallThick, poolDepth / 2, wallThick / 2] },
        { pos: [0, floorY + poolDepth / 2, poolD / 2 + wallThick / 2], size: [poolW / 2 + wallThick, poolDepth / 2, wallThick / 2] },
        { pos: [-(poolW / 2 + wallThick / 2), floorY + poolDepth / 2, 0], size: [wallThick / 2, poolDepth / 2, poolD / 2] },
        { pos: [poolW / 2 + wallThick / 2, floorY + poolDepth / 2, 0], size: [wallThick / 2, poolDepth / 2, poolD / 2] },
      ];
      for (const w of walls) {
        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(w.size[0] * 2, w.size[1] * 2, w.size[2] * 2), tileMat);
        wallMesh.position.set(...w.pos);
        wallMesh.castShadow = true;
        ctx.scene.add(wallMesh); p.staticMeshes.push(wallMesh);
        const wb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...w.pos));
        ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(...w.size).setRestitution(0.3).setFriction(0.5), wb);
        p.staticBodies.push(wb);
      }

      // Pool rim/coping
      const rimW = 0.3;
      for (const [rx, rz, rw, rd] of [
        [0, -(poolD / 2 + wallThick + rimW / 2), poolW / 2 + wallThick + rimW, rimW / 2],
        [0, poolD / 2 + wallThick + rimW / 2, poolW / 2 + wallThick + rimW, rimW / 2],
        [-(poolW / 2 + wallThick + rimW / 2), 0, rimW / 2, poolD / 2 + wallThick],
        [poolW / 2 + wallThick + rimW / 2, 0, rimW / 2, poolD / 2 + wallThick],
      ]) {
        const rim = new THREE.Mesh(new THREE.BoxGeometry(rw * 2, 0.15, rd * 2), rimMat);
        rim.position.set(rx, 0.07, rz);
        ctx.scene.add(rim); p.staticMeshes.push(rim);
      }

      // Tile grid lines on walls
      const gridMat = new THREE.MeshStandardMaterial({ color: 0x77bbcc, roughness: 0.3 });
      // Horizontal lines on long walls
      for (const wz of [-(poolD / 2 + 0.01), poolD / 2 + 0.01]) {
        for (let gy = floorY + 0.5; gy < rimY; gy += 0.5) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(poolW, 0.02, 0.02), gridMat);
          line.position.set(0, gy, wz);
          ctx.scene.add(line); p.staticMeshes.push(line);
        }
      }

      // === POOL DETAILS ===

      // Ladder (right wall)
      const ladderMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.2 });
      const ladderX = poolW / 2 + wallThick;
      for (const rz of [-0.3, 0.3]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, poolDepth + 0.8, 6), ladderMat);
        rail.position.set(ladderX, floorY + poolDepth / 2 - 0.1, rz);
        ctx.scene.add(rail); p.staticMeshes.push(rail);
      }
      for (let ry = floorY + 0.6; ry < rimY; ry += 0.5) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), ladderMat);
        rung.rotation.x = Math.PI / 2;
        rung.position.set(ladderX, ry, 0);
        ctx.scene.add(rung); p.staticMeshes.push(rung);
      }

      // Diving board (left side)
      const boardMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
      const boardSupport = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4 }));
      boardSupport.position.set(-(poolW / 2 + wallThick + 0.5), 0.4, 0);
      boardSupport.castShadow = true;
      ctx.scene.add(boardSupport); p.staticMeshes.push(boardSupport);
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.5), boardMat);
      board.position.set(-(poolW / 2 + wallThick - 0.7), 0.8, 0);
      board.castShadow = true;
      ctx.scene.add(board); p.staticMeshes.push(board);

      // Deck chairs
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x2266aa, roughness: 0.6 });
      const chairFrameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
      for (const [cx, cz, cr] of [[8, -2, 0.3], [8, 2, -0.2], [-8, 3, 0.1]]) {
        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.8), chairFrameMat);
        frame.position.set(cx, 0.35, cz);
        frame.rotation.y = cr;
        frame.castShadow = true;
        ctx.scene.add(frame); p.staticMeshes.push(frame);
        // Legs
        for (const [lx2, lz2] of [[-0.8, -0.3], [-0.8, 0.3], [0.8, -0.3], [0.8, 0.3]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), chairFrameMat);
          const cos = Math.cos(cr), sin = Math.sin(cr);
          leg.position.set(cx + lx2 * cos - lz2 * sin, 0.17, cz + lx2 * sin + lz2 * cos);
          ctx.scene.add(leg); p.staticMeshes.push(leg);
        }
        // Fabric
        const fabric = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.7), chairMat);
        fabric.position.set(cx, 0.39, cz);
        fabric.rotation.y = cr;
        ctx.scene.add(fabric); p.staticMeshes.push(fabric);
      }

      // Umbrella
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6), poleMat);
      pole.position.set(8, 1.25, 0);
      pole.castShadow = true;
      ctx.scene.add(pole); p.staticMeshes.push(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xee4444, roughness: 0.6, side: THREE.DoubleSide }));
      canopy.position.set(8, 2.6, 0);
      canopy.castShadow = true;
      ctx.scene.add(canopy); p.staticMeshes.push(canopy);

      // === WATER INLET PIPE (comes over the rim, pours into pool) ===
      const pipeX = -3, pipeZ = -(poolD / 2 + wallThick);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.25 });
      // Vertical section outside pool
      const pipeVert = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2, 8), pipeMat);
      pipeVert.position.set(pipeX, 1, pipeZ - 0.5);
      pipeVert.castShadow = true;
      ctx.scene.add(pipeVert); p.staticMeshes.push(pipeVert);
      // Horizontal section over the rim
      const pipeHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8), pipeMat);
      pipeHoriz.rotation.x = Math.PI / 2;
      pipeHoriz.position.set(pipeX, 2, pipeZ + 0.2);
      pipeHoriz.castShadow = true;
      ctx.scene.add(pipeHoriz); p.staticMeshes.push(pipeHoriz);
      // Elbow joint
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), pipeMat);
      elbow.position.set(pipeX, 2, pipeZ - 0.5);
      ctx.scene.add(elbow); p.staticMeshes.push(elbow);
      // Spout — angled downward into pool
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.6, 8), pipeMat);
      spout.position.set(pipeX, 1.75, pipeZ + 0.95);
      spout.rotation.x = 0.4;
      spout.castShadow = true;
      ctx.scene.add(spout); p.staticMeshes.push(spout);
      // Valve wheel
      const valveMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
      const valve = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 12), valveMat);
      valve.position.set(pipeX, 1.2, pipeZ - 0.5);
      valve.rotation.y = Math.PI / 2;
      ctx.scene.add(valve); p.staticMeshes.push(valve);

      // Water stream (hidden until active, stretches from spout to water surface)
      const streamSpoutY = 1.5;
      const streamX = pipeX, streamZ = pipeZ + 1.1;
      const streamMat = new THREE.MeshStandardMaterial({
        color: 0x2299ee, transparent: true, opacity: 0.7, roughness: 0.05,
      });
      const streamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1, 6), streamMat);
      streamMesh.visible = false;
      ctx.scene.add(streamMesh);
      p.staticMeshes.push(streamMesh);

      // Splash particles at impact point
      const splashMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1,
      });
      const splashParticles = [];
      for (let i = 0; i < 8; i++) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4), splashMat.clone());
        sp.visible = false;
        ctx.scene.add(sp);
        p.staticMeshes.push(sp);
        splashParticles.push({ mesh: sp, vx: 0, vy: 0, vz: 0, life: 0 });
      }

      // Sunlight
      const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
      sunLight.position.set(5, 10, 3);
      sunLight.castShadow = true;
      ctx.scene.add(sunLight); p.staticMeshes.push(sunLight);

      // === WATER ===
      const waterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(poolW - 0.1, poolD - 0.1),
        new THREE.MeshStandardMaterial({
          color: 0x1188dd,
          transparent: true,
          opacity: 0.7,
          roughness: 0.05,
          metalness: 0.1,
          side: THREE.DoubleSide,
        })
      );
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.set(0, floorY - 0.5, 0); // start hidden below floor
      waterMesh.visible = false;
      ctx.scene.add(waterMesh);
      p.staticMeshes.push(waterMesh);

      // Water fill state
      const state = {
        active: false,
        waterLevel: floorY - 0.5,
        maxLevel: rimY - 0.2,
        riseSpeed: 0.4,
        time: 0,
        waterSoundPlayed: false,
      };

      function floatOffsetForSegment(segName) {
        return FLOAT_OFFSETS[segName] ?? 0.4;
      }

      function nudgeMferClearOfFloor(mfer) {
        const bodies = Object.values(mfer.ragdollBodies);
        if (bodies.length === 0) return;

        let minY = Infinity;
        for (const body of bodies) {
          minY = Math.min(minY, body.translation().y);
        }

        // Spawned ragdolls can overlap the pool floor enough for Rapier to eject them upward.
        const targetMinY = floorY + 0.95;
        const lift = Math.max(0, targetMinY - minY);
        if (lift <= 0) return;

        for (const body of bodies) {
          const pos = body.translation();
          body.setTranslation({ x: pos.x, y: pos.y + lift, z: pos.z }, true);
        }
      }

      p.animatedObjects.push({
        state,
        update(dt) {
          if (!state.active) return;
          state.time += dt;

          // Rise water
          const filling = state.waterLevel < state.maxLevel;
          if (filling) {
            state.waterLevel += state.riseSpeed * dt;
            if (state.waterLevel > state.maxLevel) state.waterLevel = state.maxLevel;
          }
          waterMesh.position.y = state.waterLevel;
          if (!waterMesh.visible && state.waterLevel > floorY) waterMesh.visible = true;

          // Animate water stream from pipe
          if (filling) {
            streamMesh.visible = true;
            const streamLen = streamSpoutY - state.waterLevel;
            if (streamLen > 0.1) {
              streamMesh.geometry.dispose();
              streamMesh.geometry = new THREE.CylinderGeometry(0.05, 0.08 + streamLen * 0.01, streamLen, 6);
              streamMesh.position.set(streamX, streamSpoutY - streamLen / 2, streamZ);
            }
            // Splash particles where stream hits water
            for (const sp of splashParticles) {
              sp.life -= dt;
              if (sp.life <= 0) {
                // Respawn
                sp.mesh.visible = true;
                sp.mesh.position.set(
                  streamX + (Math.random() - 0.5) * 0.4,
                  state.waterLevel + 0.05,
                  streamZ + (Math.random() - 0.5) * 0.4
                );
                sp.vx = (Math.random() - 0.5) * 1.5;
                sp.vy = 0.5 + Math.random() * 1;
                sp.vz = (Math.random() - 0.5) * 1.5;
                sp.life = 0.3 + Math.random() * 0.4;
                sp.mesh.material.opacity = 0.7;
                sp.mesh.scale.setScalar(0.8 + Math.random() * 0.5);
              } else {
                sp.mesh.position.x += sp.vx * dt;
                sp.mesh.position.y += sp.vy * dt;
                sp.vy -= 4 * dt; // gravity on droplets
                sp.mesh.position.z += sp.vz * dt;
                sp.mesh.material.opacity = Math.max(0, sp.life * 1.5);
              }
            }
          } else {
            streamMesh.visible = false;
            for (const sp of splashParticles) sp.mesh.visible = false;
          }

          // Gentle wave animation
          const geo = waterMesh.geometry;
          const posAttr = geo.attributes.position;
          for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getY(i);
            posAttr.setZ(i, Math.sin(state.time * 2 + x * 0.5) * 0.04 + Math.cos(state.time * 1.5 + z * 0.7) * 0.03);
          }
          posAttr.needsUpdate = true;

          // Water sound
          if (!state.waterSoundPlayed && ctx.playHiss) {
            ctx.playHiss();
            state.waterSoundPlayed = true;
          }

          // Convert idle mfers when water reaches waist level
          const remaining = [];
          for (const pm of ctx.placedMfers) {
            const my = pm.scene.position.y + 1.0; // waist height
            if (state.waterLevel >= my) {
              if (pm.triggerBody) ctx.world.removeRigidBody(pm.triggerBody);
              const mfer = ctx.createRagdoll(pm.scene);
              if (mfer) {
                mfer.ragdollActive = true;
                mfer.canDetach = true;
                mfer.drownTime = 0;
                nudgeMferClearOfFloor(mfer);
                // Zero all velocities — prevent floor overlap launch
                for (const body of Object.values(mfer.ragdollBodies)) {
                  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                }
                ctx.captureImpactShot(mfer);
                ctx.mfers.push(mfer);
                if (ctx.addDamage) ctx.addDamage(5);
              }
            } else {
              remaining.push(pm);
            }
          }
          ctx.placedMfers = remaining;

          // Drowning physics on active mfers
          for (const mfer of ctx.mfers) {
            mfer.drownTime = (mfer.drownTime || 0) + dt;
            let anySubmerged = false;
            const settling = mfer.drownTime < 1.2;

            for (const [segName, body] of Object.entries(mfer.ragdollBodies)) {
              const bpos = body.translation();
              const vel = body.linvel();
              const depth = state.waterLevel - bpos.y;

              if (depth < -0.55) continue;
              anySubmerged = true;

              const mass = body.mass();
              const targetY = state.waterLevel - floatOffsetForSegment(segName);
              const surfaceError = targetY - bpos.y;
              const surfaceInfluence = THREE.MathUtils.clamp((depth + 0.55) / 0.8, 0, 1);
              const maxLift = settling ? ctx.settings.gravity * 0.45 : ctx.settings.gravity * 0.7;
              const maxSink = ctx.settings.gravity * 1.2;
              const buoyancyAccel = THREE.MathUtils.clamp(
                (surfaceError * 12 - vel.y * 6) * surfaceInfluence,
                -maxSink,
                maxLift
              );
              body.addForce({ x: 0, y: mass * buoyancyAccel, z: 0 }, true);

              // Heavy damping keeps submerged bodies from turning into rockets.
              const lateralDamp = settling ? 0.7 : 0.88;
              const verticalDamp = settling ? 0.45 : 0.72;
              const angDamp = settling ? 0.6 : 0.85;
              body.setLinvel({
                x: vel.x * lateralDamp,
                y: THREE.MathUtils.clamp(vel.y * verticalDamp, -3, 0.65),
                z: vel.z * lateralDamp,
              }, true);
              const ang = body.angvel();
              body.setAngvel({
                x: ang.x * angDamp,
                y: ang.y * angDamp,
                z: ang.z * angDamp,
              }, true);

              // A small lateral drift keeps the float state from looking rigid.
              if (!settling && Math.random() < 0.025) {
                body.applyImpulse({
                  x: (Math.random() - 0.5) * 0.03,
                  y: 0,
                  z: (Math.random() - 0.5) * 0.03,
                }, true);
              }

              const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
              if (speed > 1 && ctx.addDamage) ctx.addDamage(speed * 0.1);
            }

            // Detach accessories while drowning — pieces float off
            if (anySubmerged && mfer.drownTime > 1.5 && !mfer.accessoriesDetached) {
              mfer.accessoriesDetached = true;
              ctx.detachAccessories(mfer);
            }
          }
        },
      });

      p.poolState = state;

      p.reset = () => {
        state.active = false;
        state.waterLevel = floorY - 0.5;
        state.time = 0;
        state.waterSoundPlayed = false;
        waterMesh.position.y = floorY - 0.5;
        waterMesh.visible = false;
        streamMesh.visible = false;
        for (const sp of splashParticles) sp.mesh.visible = false;
      };

      return p;
    },

    onDrop(lp) {
      if (!lp.poolState) return;
      lp.poolState.active = true;
      // Give all placed mfers trigger capsules
      for (const pm of ctx.placedMfers) {
        if (pm.triggerBody) continue;
        const cx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
        const cy = pm.scene.position.y + 1.25;
        const cz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
        const tb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
        ctx.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.2).setRestitution(0.3).setFriction(0.5)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), tb);
        pm.triggerBody = tb;
      }
    },
  };
}
