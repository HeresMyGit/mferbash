import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, addDynamicBox, newParts } from '../gameState.js';

export default function createTruckHitLevel(ctx) {
  return {
    name: 'truck hit',
    spawnPos: { x: 0, y: 1, z: 0 },
    groundY: 1,
    cameraStart: { pos: [2, 3, 8], lookAt: [0, 1.5, 0] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1 },
    keepIdleUntilImpact: true,

    build() {
      const p = { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };

      // Sky
      ctx.scene.background = new THREE.Color(0x87ceeb);
      ctx.scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

      // Ground plane
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 40),
        new THREE.MeshStandardMaterial({ color: 0x6b8c5a, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      p.staticMeshes.push(ground);

      const gb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 20).setRestitution(0.3).setFriction(0.7), gb);
      p.staticBodies.push(gb);

      // Road surface
      const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 6),
        new THREE.MeshStandardMaterial({ color: 0x444448, roughness: 0.85 }));
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 1.02, 0);
      road.receiveShadow = true;
      ctx.scene.add(road);
      p.staticMeshes.push(road);

      // Lane markings — dashed yellow center line
      for (let x = -28; x < 30; x += 3) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xddcc00, emissive: 0x443300, emissiveIntensity: 0.3 }));
        dash.position.set(x, 1.03, 0);
        ctx.scene.add(dash);
        p.staticMeshes.push(dash);
      }

      // Edge lines — solid white
      for (const z of [-2.9, 2.9]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(60, 0.02, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xffffff }));
        edge.position.set(0, 1.03, z);
        ctx.scene.add(edge);
        p.staticMeshes.push(edge);
      }

      // Sidewalks
      for (const z of [-4.5, 4.5]) {
        addBox(ctx, p, { x: 0, y: 1.1, z }, { x: 60, y: 0.2, z: 2.5 }, 0xaaa498, { roughness: 0.8, friction: 0.7 });
      }
      // Curbs
      for (const z of [-3.15, 3.15]) {
        addBox(ctx, p, { x: 0, y: 1.15, z }, { x: 60, y: 0.3, z: 0.15 }, 0xbbae9e, { friction: 0.6 });
      }

      // Buildings backdrop
      const buildingColors = [0xc8beb0, 0xb5a898, 0xd4cabb];
      for (let i = 0; i < 4; i++) {
        const h = 6 + Math.random() * 8;
        const w = 4 + Math.random() * 3;
        addBox(ctx, p, { x: -12 + i * 9 + Math.random() * 2, y: h / 2 + 1, z: -7.5 }, { x: w, y: h, z: 3 },
          buildingColors[i % 3], { noPhysics: true, roughness: 0.95 });
      }

      // Windows on buildings (emissive rectangles)
      for (let i = 0; i < 4; i++) {
        const bx = -12 + i * 9 + Math.random() * 2;
        for (let wy = 3; wy < 10; wy += 2) {
          for (let wx = -1.2; wx <= 1.2; wx += 1.2) {
            if (Math.random() > 0.3) {
              const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.05),
                new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.1, metalness: 0.3 }));
              win.position.set(bx + wx, wy, -5.9);
              ctx.scene.add(win);
              p.staticMeshes.push(win);
            }
          }
        }
      }

      // Traffic light
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.12), poleMat);
      pole.position.set(4, 3, -3.2);
      pole.castShadow = true;
      ctx.scene.add(pole);
      p.staticMeshes.push(pole);

      const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
      lightBox.position.set(4, 5.2, -3.2);
      ctx.scene.add(lightBox);
      p.staticMeshes.push(lightBox);

      const lightColors = [0xff0000, 0xffaa00, 0x00ff00];
      const trafficLights = [];
      for (let i = 0; i < 3; i++) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshStandardMaterial({ color: lightColors[i], emissive: i === 2 ? lightColors[i] : 0x000000, emissiveIntensity: 0.8 }));
        bulb.position.set(4, 5.5 - i * 0.3, -3.0);
        ctx.scene.add(bulb);
        p.staticMeshes.push(bulb);
        trafficLights.push(bulb);
      }

      // Trailing cars — drive in behind the truck, slower, spread apart
      // Truck is at z=-1.5 (far lane, goes +X). Near lane z=1.5 goes -X.
      const carDefs = [
        { color: 0x3366cc, startX: -45, z: -1.5, speed: 14, dir: 1 },   // far lane, same as truck
        { color: 0xcc3333, startX: 40,  z: 1.5,  speed: 14, dir: -1 },  // near lane, opposite
        { color: 0x44aa44, startX: 55,  z: 1.5,  speed: 14, dir: -1 },  // near lane, opposite (same speed, won't catch up)
      ];
      const cars = [];
      for (const cd of carDefs) {
        const carGroup = new THREE.Group();
        const carMesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.4),
          new THREE.MeshStandardMaterial({ color: cd.color, roughness: 0.4, metalness: 0.3 }));
        carMesh.castShadow = true;
        carGroup.add(carMesh);
        const carTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.3),
          new THREE.MeshStandardMaterial({ color: cd.color, roughness: 0.4, metalness: 0.3 }));
        carTop.position.set(0.2, 0.7, 0);
        carGroup.add(carTop);
        // Wheels
        const cwMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        for (const [wx, wz] of [[0.8, -0.75], [0.8, 0.75], [-0.8, -0.75], [-0.8, 0.75]]) {
          const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 8), cwMat);
          cw.rotation.x = Math.PI / 2;
          cw.position.set(wx, -0.4, wz);
          carGroup.add(cw);
        }
        carGroup.position.set(cd.startX, 1.5, cd.z);
        if (cd.dir < 0) carGroup.rotation.y = Math.PI; // face opposite direction
        ctx.scene.add(carGroup);

        const carBody = ctx.world.createRigidBody(
          RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cd.startX, 1.5, cd.z));
        const carCollider = ctx.world.createCollider(
          RAPIER.ColliderDesc.cuboid(1.25, 0.5, 0.7).setMass(80).setRestitution(0.2).setFriction(0.5)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), carBody);

        const carState = { active: false, currentX: cd.startX, speed: cd.speed, hitSomething: false, body: carBody, group: carGroup };
        cars.push(carState);

        p.animatedObjects.push({
          group: carGroup, body: carBody, state: carState,
          update(dt) {
            if (!carState.active) return;
            if (!carState.hitSomething) {
              carState.currentX += carState.speed * cd.dir * dt;
              carBody.setNextKinematicTranslation({ x: carState.currentX, y: 1.5, z: cd.z });
              const t = carBody.translation();
              carGroup.position.set(t.x, t.y, t.z);
              // Hit placed ctx.mfers in the car's path
              const carFrontX = carState.currentX + cd.dir * 1.5;
              const carHalfW = 1.0;
              const still = [];
              for (const pm of ctx.placedMfers) {
                const mx = pm.scene.position.x + ctx.modelCenter.x * ctx.modelScale;
                const mz = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
                const zDist = Math.abs(mz - cd.z);
                const xHit = cd.dir > 0 ? (carFrontX >= mx - 0.5) : (carFrontX <= mx + 0.5);
                if (xHit && zDist < carHalfW + 0.5) {
                  const mfer = ctx.createRagdoll(pm.scene);
                  if (mfer) {
                    for (const body of Object.values(mfer.ragdollBodies)) {
                      body.setLinvel({ x: cd.dir * carState.speed * 0.6 + (Math.random() - 0.5) * 2, y: 3 + Math.random() * 3, z: (Math.random() - 0.5) * 5 }, true);
                      body.setAngvel({ x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 10 }, true);
                    }
                    mfer.ragdollActive = true;
                    mfer.canDetach = true;
                    ctx.mfers.push(mfer);
                  }
                } else {
                  still.push(pm);
                }
              }
              ctx.placedMfers = still;

              // Stop driving after passing through
              if ((cd.dir > 0 && carState.currentX > 25) || (cd.dir < 0 && carState.currentX < -25)) {
                carState.hitSomething = true;
                carBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
                carBody.setLinvel({ x: carState.speed * cd.dir * 0.4, y: 0, z: 0 }, true);
              }
            } else {
              const t = carBody.translation();
              const r = carBody.rotation();
              carGroup.position.set(t.x, t.y, t.z);
              carGroup.quaternion.set(r.x, r.y, r.z, r.w);
            }
          },
        });
      }

      // === THE TRUCK ===
      const truckGroup = new THREE.Group();
      const truckMat = new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.5, metalness: 0.2 });
      const truckWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });

      // Cargo body
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 2.2), truckWhiteMat);
      cargo.position.set(-0.5, 0.2, 0);
      cargo.castShadow = true;
      truckGroup.add(cargo);

      // Cab
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 2.2), truckMat);
      cab.position.set(2.4, -0.1, 0);
      cab.castShadow = true;
      truckGroup.add(cab);

      // Windshield
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.1, metalness: 0.5 }));
      windshield.position.set(3.33, 0.2, 0);
      truckGroup.add(windshield);

      // Bumper
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 2.4),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
      bumper.position.set(3.4, -0.9, 0);
      truckGroup.add(bumper);

      // Headlights
      for (const z of [-0.6, 0.6]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.35),
          new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 1.5 }));
        hl.position.set(3.35, -0.3, z);
        truckGroup.add(hl);
      }

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const wheels = [];
      for (const [wx, wz] of [[2.2, -1.2], [2.2, 1.2], [-1.5, -1.2], [-1.5, 1.2]]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -1.2, wz);
        truckGroup.add(wheel);
        wheels.push(wheel);
      }

      truckGroup.position.set(-30, 2.5, -1.5);
      ctx.scene.add(truckGroup);

      // Truck physics — kinematic, velocity computed by Rapier from position delta
      const truckBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-30, 2.5, -1.5));
      const truckCollider = ctx.world.createCollider(
        RAPIER.ColliderDesc.cuboid(3.5, 1.4, 1.1).setMass(8000).setRestitution(0.1).setFriction(0.3)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), truckBody);

      const truckState = {
        active: false, currentX: -30, speed: 22, hitMfer: false, justHit: false,
        body: truckBody, colliderHandle: truckCollider.handle, group: truckGroup, wheels,
        trafficLights,
      };

      p.animatedObjects.push({
        group: truckGroup, body: truckBody, state: truckState,
        update(dt) {
          if (!truckState.active) return;

          // Traffic light: switch to red as truck approaches
          if (truckState.currentX > -10 && !truckState.lightSwitched) {
            truckState.lightSwitched = true;
            trafficLights[2].material.emissive.setHex(0x000000); // green off
            trafficLights[0].material.emissive.setHex(0xff0000); // red on
          }

          if (!truckState.gonePhysics) {
            // Kinematic phase: truck drives unstoppably, plows through everything
            truckState.currentX += truckState.speed * dt;
            truckBody.setNextKinematicTranslation({ x: truckState.currentX, y: 2.5, z: -1.5 });
            const t = truckBody.translation();
            truckGroup.position.set(t.x, t.y, t.z);
            for (const w of wheels) w.rotation.z -= truckState.speed * dt * 3;

            // Convert placed idle ctx.mfers to ragdolls as the truck front reaches them
            const truckFrontX = truckState.currentX + 3.5;
            const truckZ = -1.5;
            const truckHalfW = 1.3; // truck Z half-width for hit check
            const remaining = [];
            for (const pm of ctx.placedMfers) {
              const mferX = pm.scene.position.x;
              const mferZ = pm.scene.position.z + ctx.modelCenter.z * ctx.modelScale;
              const zDist = Math.abs(mferZ - truckZ);
              if (truckFrontX >= mferX - 0.5 && zDist < truckHalfW + 0.5) {
                const mfer = ctx.createRagdoll(pm.scene);
                if (mfer) {
                  const tv = truckState.speed;
                  for (const body of Object.values(mfer.ragdollBodies)) {
                    body.setLinvel({ x: tv * 0.8 + Math.random() * 3, y: 4 + Math.random() * 4, z: (Math.random() - 0.5) * 8 }, true);
                    body.setAngvel({ x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 15 }, true);
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

            // Once truck is well past the action zone, switch to dynamic for spinout
            if (truckState.currentX > 20) {
              truckState.gonePhysics = true;
              truckBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
              truckBody.setLinvel({ x: truckState.speed * 0.5, y: 1, z: (Math.random() - 0.5) * 3 }, true);
              truckBody.setAngvel({ x: 0, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 0.5 }, true);
            }
          } else {
            // Dynamic phase: truck is physics-driven, sync mesh
            const t = truckBody.translation();
            const r = truckBody.rotation();
            truckGroup.position.set(t.x, t.y, t.z);
            truckGroup.quaternion.set(r.x, r.y, r.z, r.w);
          }
        },
      });

      p.truckState = truckState;
      p.cars = cars;

      p.reset = () => {
        truckState.active = false;
        truckState.hitMfer = false;
        truckState.justHit = false;
        truckState.gonePhysics = false;
        truckState.lightSwitched = false;
        truckState.currentX = -30;
        truckBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        truckBody.setTranslation({ x: -30, y: 2.5, z: -1.5 }, true);
        truckBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        truckGroup.position.set(-30, 2.5, -1.5);
        truckGroup.quaternion.set(0, 0, 0, 1);
        trafficLights[0].material.emissive.setHex(0x000000);
        trafficLights[2].material.emissive.setHex(0x00ff00);
        // Reset cars
        for (let i = 0; i < cars.length; i++) {
          const car = cars[i];
          const cd = carDefs[i];
          car.active = false;
          car.hitSomething = false;
          car.currentX = cd.startX;
          car.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
          car.body.setTranslation({ x: cd.startX, y: 1.5, z: cd.z }, true);
          car.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
          car.group.position.set(cd.startX, 1.5, cd.z);
          car.group.rotation.set(0, cd.dir < 0 ? Math.PI : 0, 0);
        }
      };

      return p;
    },

    onDrop(lp) {
      if (lp.truckState) {
        lp.truckState.active = true;
        lp.truckState.currentX = -25;
      }
      if (lp.cars) {
        for (const car of lp.cars) car.active = true;
      }
    },

    onCollision(lp, h1, h2) {
      if (!lp.truckState || lp.truckState.hitMfer) return;
      const th = lp.truckState.colliderHandle;
      if (h1 === th || h2 === th) {
        lp.truckState.hitMfer = true;
        lp.truckState.justHit = true;
        console.log('TRUCK HIT!');
      }
    },
  };
}

