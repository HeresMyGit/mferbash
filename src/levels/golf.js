import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, newParts } from '../gameState.js';

export default function createGolfLevel(ctx) {
  return {
    name: 'golf',
    spawnPos: { x: -2, y: 0, z: 0 },
    groundY: 0,
    cameraStart: { pos: [-6, 3, 8], lookAt: [5, 0, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.3 },
    keepIdleUntilImpact: true,
    cameraFollow: { offX: 2, offY: 3, offZ: 8, minY: 2 },

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky — bright sunny golf day
      ctx.scene.background = new THREE.Color(0x88ccee);
      ctx.scene.fog = new THREE.FogExp2(0x88ccee, 0.006);

      // === FAIRWAY ===
      const fairwayMat = new THREE.MeshStandardMaterial({ color: 0x3d8c3a, roughness: 0.85 });
      const fairway = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), fairwayMat);
      fairway.rotation.x = -Math.PI / 2;
      fairway.receiveShadow = true;
      ctx.scene.add(fairway); p.staticMeshes.push(fairway);

      // Rougher grass on sides
      const roughMat = new THREE.MeshStandardMaterial({ color: 0x2d6b2a, roughness: 0.95 });
      for (const rz of [-18, 18]) {
        const rough = new THREE.Mesh(new THREE.PlaneGeometry(80, 10), roughMat);
        rough.rotation.x = -Math.PI / 2;
        rough.position.set(0, -0.01, rz);
        rough.receiveShadow = true;
        ctx.scene.add(rough); p.staticMeshes.push(rough);
      }

      // Ground physics
      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 20).setRestitution(0.3).setFriction(0.8), gb);
      p.staticBodies.push(gb);

      // === THE GREEN (putting surface around the hole) ===
      const holeX = 22, holeZ = 0;
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.6 });
      const green = new THREE.Mesh(new THREE.CircleGeometry(5, 24), greenMat);
      green.rotation.x = -Math.PI / 2;
      green.position.set(holeX, 0.005, holeZ);
      green.receiveShadow = true;
      ctx.scene.add(green); p.staticMeshes.push(green);

      // Fringe around green
      const fringeMat = new THREE.MeshStandardMaterial({ color: 0x3a9a3a, roughness: 0.75 });
      const fringe = new THREE.Mesh(new THREE.RingGeometry(5, 6.5, 24), fringeMat);
      fringe.rotation.x = -Math.PI / 2;
      fringe.position.set(holeX, 0.003, holeZ);
      ctx.scene.add(fringe); p.staticMeshes.push(fringe);

      // === THE HOLE ===
      // Dark circle for the hole
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
      const holeVisual = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), holeMat);
      holeVisual.rotation.x = -Math.PI / 2;
      holeVisual.position.set(holeX, 0.007, holeZ);
      ctx.scene.add(holeVisual); p.staticMeshes.push(holeVisual);
      // White rim
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const holeRim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 16), rimMat);
      holeRim.rotation.x = -Math.PI / 2;
      holeRim.position.set(holeX, 0.008, holeZ);
      ctx.scene.add(holeRim); p.staticMeshes.push(holeRim);

      // Hole physics — a pit that catches the mfer
      // Walls around the pit to funnel them in
      const pitDepth = 2;
      const pitRadius = 0.6;
      const pitBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(holeX, -pitDepth / 2, holeZ));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(pitRadius, 0.1, pitRadius)
        .setTranslation(0, -pitDepth / 2, 0).setRestitution(0.1).setFriction(0.9), pitBody);
      p.staticBodies.push(pitBody);

      // Flag / pin
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.2 });
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), pinMat);
      pin.position.set(holeX, 1.5, holeZ);
      pin.castShadow = true;
      ctx.scene.add(pin); p.staticMeshes.push(pin);
      const flagMesh = new THREE.Mesh(new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ color: 0xff2222, roughness: 0.5, side: THREE.DoubleSide }));
      // Triangle flag shape
      const flagVerts = new Float32Array([0, 0, 0, 0.8, 0, 0, 0, -0.4, 0]);
      flagMesh.geometry.setAttribute('position', new THREE.BufferAttribute(flagVerts, 3));
      flagMesh.geometry.computeVertexNormals();
      flagMesh.position.set(holeX, 2.8, holeZ);
      ctx.scene.add(flagMesh); p.staticMeshes.push(flagMesh);

      // === TEE BOX ===
      const teeMat = new THREE.MeshStandardMaterial({ color: 0x55bb55, roughness: 0.5 });
      const teeBox = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 2), teeMat);
      teeBox.position.set(-2, 0.025, 0);
      ctx.scene.add(teeBox); p.staticMeshes.push(teeBox);
      // Tee markers
      const teeMarkerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      for (const tz of [-0.6, 0.6]) {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), teeMarkerMat);
        marker.position.set(-2.5, 0.08, tz);
        ctx.scene.add(marker); p.staticMeshes.push(marker);
      }

      // === GOLF CLUB ===
      const clubGroup = new THREE.Group();
      // Shaft
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6, roughness: 0.2 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 4, 8), shaftMat);
      clubGroup.add(shaft);
      // Grip
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.8, 8), gripMat);
      grip.position.set(0, 1.6, 0);
      clubGroup.add(grip);
      // Club head (driver)
      const headMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.2 });
      const clubHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.15), headMat);
      clubHead.position.set(0.12, -2, 0);
      clubGroup.add(clubHead);
      // Club face (shiny)
      const faceMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.1 });
      const clubFace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.14), faceMat);
      clubFace.position.set(0.24, -2, 0);
      clubGroup.add(clubFace);

      // Position club for backswing start
      const clubPivotX = -3, clubPivotY = 2, clubPivotZ = -1.5;
      clubGroup.position.set(clubPivotX, clubPivotY, clubPivotZ);
      clubGroup.rotation.z = Math.PI / 3; // backswing position
      clubGroup.visible = false;
      ctx.scene.add(clubGroup); p.staticMeshes.push(clubGroup);

      // === COURSE DETAILS ===

      // Trees along the sides
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.7 });
      for (const [tx, tz] of [[5, -8], [12, 9], [18, -10], [28, 8], [30, -7], [-5, 10], [8, 11]]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2.5, 6), trunkMat);
        trunk.position.set(tx, 1.25, tz);
        trunk.castShadow = true;
        ctx.scene.add(trunk); p.staticMeshes.push(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 0.5, 8, 8), leafMat);
        leaves.position.set(tx, 3 + Math.random() * 0.5, tz);
        leaves.castShadow = true;
        ctx.scene.add(leaves); p.staticMeshes.push(leaves);
      }

      // Sand bunker near the green
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.9 });
      const bunker = new THREE.Mesh(new THREE.CircleGeometry(2, 12), sandMat);
      bunker.rotation.x = -Math.PI / 2;
      bunker.position.set(holeX - 4, 0.004, holeZ + 4);
      ctx.scene.add(bunker); p.staticMeshes.push(bunker);

      // Golf cart parked to the side
      const cartMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
      const cartBody2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.2), cartMat);
      cartBody2.position.set(-6, 0.6, -6);
      cartBody2.castShadow = true;
      ctx.scene.add(cartBody2); p.staticMeshes.push(cartBody2);
      const cartRoof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
      cartRoof.position.set(-6, 1.4, -6);
      ctx.scene.add(cartRoof); p.staticMeshes.push(cartRoof);
      // Cart roof supports
      for (const [cx, cz2] of [[-0.6, -0.5], [-0.6, 0.5], [0.5, -0.5], [0.5, 0.5]]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 4), shaftMat);
        post.position.set(-6 + cx, 1.17, -6 + cz2);
        ctx.scene.add(post); p.staticMeshes.push(post);
      }
      // Cart wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
      for (const [wx, wz2] of [[-0.7, -0.65], [-0.7, 0.65], [0.7, -0.65], [0.7, 0.65]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-6 + wx, 0.2, -6 + wz2);
        ctx.scene.add(wheel); p.staticMeshes.push(wheel);
      }

      // Golf bag near tee
      const bagMat = new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.6 });
      const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1, 8), bagMat);
      bag.position.set(-3.5, 0.5, 1.5);
      bag.rotation.z = 0.15;
      bag.castShadow = true;
      ctx.scene.add(bag); p.staticMeshes.push(bag);
      // Club sticks poking out
      for (let ci = 0; ci < 4; ci++) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), shaftMat);
        stick.position.set(-3.5 + (ci - 1.5) * 0.05, 1.1, 1.5);
        stick.rotation.z = 0.15 + (ci - 1.5) * 0.05;
        ctx.scene.add(stick); p.staticMeshes.push(stick);
      }

      // Yardage marker signs
      const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      for (const [sx, label] of [[5, '200'], [10, '150'], [15, '100'], [20, '50']]) {
        const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), shaftMat);
        signPost.position.set(sx, 0.5, -5);
        ctx.scene.add(signPost); p.staticMeshes.push(signPost);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.04), signMat);
        sign.position.set(sx, 1, -5);
        ctx.scene.add(sign); p.staticMeshes.push(sign);
        // Colored dot on sign
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8),
          new THREE.MeshStandardMaterial({ color: sx < 15 ? 0xff4444 : 0x2244cc, side: THREE.DoubleSide }));
        dot.position.set(sx, 1, -4.97);
        ctx.scene.add(dot); p.staticMeshes.push(dot);
      }

      // Sunlight
      const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
      sun.position.set(10, 15, 5);
      sun.castShadow = true;
      ctx.scene.add(sun); p.staticMeshes.push(sun);

      // === DRIVING GOLF CART (runs over mfer after landing) ===
      const drivingCart = new THREE.Group();
      const dcBodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
      const dcBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.4), dcBodyMat);
      dcBody.castShadow = true;
      drivingCart.add(dcBody);
      // Roof
      const dcRoof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
      dcRoof.position.set(0, 0.85, 0);
      drivingCart.add(dcRoof);
      // Roof posts
      for (const [rpx, rpz] of [[-0.7, -0.6], [-0.7, 0.6], [0.6, -0.6], [0.6, 0.6]]) {
        const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), shaftMat);
        rp.position.set(rpx, 0.6, rpz);
        drivingCart.add(rp);
      }
      // Wheels
      const dcWheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
      const dcWheels = [];
      for (const [dwx, dwz] of [[-0.8, -0.75], [-0.8, 0.75], [0.8, -0.75], [0.8, 0.75]]) {
        const dw = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8), dcWheelMat);
        dw.rotation.x = Math.PI / 2;
        dw.position.set(dwx, -0.45, dwz);
        drivingCart.add(dw);
        dcWheels.push(dw);
      }
      // Seat
      const dcSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 1),
        new THREE.MeshStandardMaterial({ color: 0x444444 }));
      dcSeat.position.set(-0.1, 0.15, 0);
      drivingCart.add(dcSeat);
      // Windshield
      const dcWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.4, metalness: 0.3 }));
      dcWindshield.position.set(0.9, 0.5, 0);
      dcWindshield.rotation.z = 0.15;
      drivingCart.add(dcWindshield);

      const cartStartX = -15, cartZ = 0, cartY = 0.55;
      drivingCart.position.set(cartStartX, cartY, cartZ);
      drivingCart.visible = false;
      ctx.scene.add(drivingCart);
      p.staticMeshes.push(drivingCart);

      // Cart physics body
      const cartPhysBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cartStartX, cartY, cartZ));
      ctx.world.createCollider(
        RAPIER.ColliderDesc.cuboid(1.1, 0.5, 0.7).setMass(200).setRestitution(0.3).setFriction(0.5)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
          .setContactForceEventThreshold(800), cartPhysBody);
      p.staticBodies.push(cartPhysBody);

      // === SWING ANIMATION STATE ===
      const cartSpeed = 16;
      const state = {
        active: false,
        phase: 'backswing', // backswing → downswing → follow → done → cart
        swingTime: 0,
        swingSpeed: 5,
        hit: false,
        holeInOne: false,
        cartActive: false,
        cartDelay: 0,
        cartX: cartStartX,
      };

      p.animatedObjects.push({
        state,
        update(dt) {
          if (!state.active) return;
          state.swingTime += dt;

          if (state.phase === 'backswing') {
            // Hold backswing briefly
            clubGroup.visible = true;
            if (state.swingTime >= 0.6) {
              state.phase = 'downswing';
              state.swingTime = 0;
            }
          }

          if (state.phase === 'downswing') {
            // Swing from backswing to impact — fast rotation
            const t = Math.min(state.swingTime / 0.15, 1); // 0.15s swing
            const eased = t * t; // accelerate into it
            clubGroup.rotation.z = Math.PI / 3 - eased * (Math.PI / 3 + Math.PI / 6);
            // Hit at bottom of swing
            if (t >= 1 && !state.hit) {
              state.hit = true;
              state.phase = 'follow';
              state.swingTime = 0;
              if (ctx.playImpact) ctx.playImpact(12);

              // Launch all placed mfers — lower arc toward the hole
              for (const pm of ctx.placedMfers) {
                const mfer = ctx.createRagdoll(pm.scene);
                if (mfer) {
                  const speed = 18 + Math.random() * 4;
                  for (const body of Object.values(mfer.ragdollBodies)) {
                    body.setLinvel({
                      x: speed,
                      y: 8 + Math.random() * 2,
                      z: (Math.random() - 0.5) * 1.5,
                    }, true);
                    body.setAngvel({
                      x: (Math.random() - 0.5) * 15,
                      y: (Math.random() - 0.5) * 8,
                      z: (Math.random() - 0.5) * 15,
                    }, true);
                  }
                  mfer.ragdollActive = true;
                  mfer.canDetach = true;
                  ctx.captureImpactShot(mfer);
                  ctx.mfers.push(mfer);
                  if (ctx.addDamage) ctx.addDamage(speed);
                }
              }
              ctx.placedMfers = [];
            }
          }

          if (state.phase === 'follow') {
            // Follow-through
            const t = Math.min(state.swingTime / 0.3, 1);
            clubGroup.rotation.z = -Math.PI / 6 - t * Math.PI / 4;
            if (t >= 1) {
              state.phase = 'done';
            }
          }

          // Check if any mfer landed in the hole
          if (!state.holeInOne) {
            for (const mfer of ctx.mfers) {
              const hips = mfer.ragdollBodies['hips'];
              if (!hips) continue;
              const hp = hips.translation();
              const dx = hp.x - holeX;
              const dz = hp.z - holeZ;
              const dist = Math.sqrt(dx * dx + dz * dz);
              if (dist < 1.0 && hp.y < 0.5) {
                state.holeInOne = true;
                if (ctx.addDamage) ctx.addDamage(100);
                flagMesh.material.color.set(0xffdd00);
                flagMesh.material.emissive = new THREE.Color(0xffaa00);
                flagMesh.material.emissiveIntensity = 1;
              }
            }
          }

          // After hit, wait a moment then send the golf cart
          if (state.hit && !state.cartActive) {
            state.cartDelay += dt;
            if (state.cartDelay >= 1.5) {
              state.cartActive = true;
              drivingCart.visible = true;
              if (ctx.playHorn) ctx.playHorn();
            }
          }

          // Drive the golf cart across the fairway
          if (state.cartActive) {
            state.cartX += cartSpeed * dt;
            cartPhysBody.setNextKinematicTranslation({ x: state.cartX, y: cartY, z: cartZ });
            drivingCart.position.set(state.cartX, cartY, cartZ);
            // Spin wheels
            for (const w of dcWheels) w.rotation.z -= cartSpeed * dt * 3;

            // Run over any ragdolled mfers in its path
            const cartFrontX = state.cartX + 1.3;
            for (const mfer of ctx.mfers) {
              if (mfer.cartHit) continue;
              const hips = mfer.ragdollBodies['hips'];
              if (!hips) continue;
              const hp = hips.translation();
              const dx = cartFrontX - hp.x;
              const dz = Math.abs(hp.z - cartZ);
              if (dx > 0 && dx < 1.5 && dz < 1.5 && hp.y < 2) {
                mfer.cartHit = true;
                for (const body of Object.values(mfer.ragdollBodies)) {
                  body.setLinvel({
                    x: cartSpeed * 0.6 + (Math.random() - 0.5) * 3,
                    y: 3 + Math.random() * 3,
                    z: (Math.random() - 0.5) * 6,
                  }, true);
                  body.setAngvel({
                    x: (Math.random() - 0.5) * 12,
                    y: (Math.random() - 0.5) * 8,
                    z: (Math.random() - 0.5) * 12,
                  }, true);
                }
                if (ctx.playImpact) ctx.playImpact(8);
                if (ctx.addDamage) ctx.addDamage(cartSpeed);
              }
            }

            // Cart drives off screen
            if (state.cartX > 35) state.cartActive = false;
          }
        },
      });

      p.golfState = state;

      p.reset = () => {
        state.active = false;
        state.phase = 'backswing';
        state.swingTime = 0;
        state.hit = false;
        state.holeInOne = false;
        state.cartActive = false;
        state.cartDelay = 0;
        state.cartX = cartStartX;
        clubGroup.rotation.z = Math.PI / 3;
        clubGroup.visible = false;
        drivingCart.visible = false;
        drivingCart.position.set(cartStartX, cartY, cartZ);
        cartPhysBody.setNextKinematicTranslation({ x: cartStartX, y: cartY, z: cartZ });
        flagMesh.material.color.set(0xff2222);
        flagMesh.material.emissive = new THREE.Color(0x000000);
        flagMesh.material.emissiveIntensity = 0;
      };

      return p;
    },

    onDrop(lp) {
      if (lp.golfState) lp.golfState.active = true;
    },
  };
}
