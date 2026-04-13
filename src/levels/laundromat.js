import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addBox, newParts } from '../gameState.js';

const LAUNDRY_ITEM_NAMES = [
  'shirt_collared_pink',
  'shirt_collared_green',
  'shirt_collared_blue',
  'shirt_collared_white',
  'shirt_collared_yellow',
  'shirt_collared_turquoise',
  'shirt_hoodie_red',
  'shirt_hoodie_green',
  'shirt_hoodie_blue',
  'shirt_hoodie_white',
  'shirt_hoodie_dark_gray',
  'shirt_hoodie_pink',
  'shirt_hoodie_down_red',
  'shirt_hoodie_down_pink',
  'shirt_hoodie_down_white',
  'shirt_hoodie_down_green',
  'shirt_hoodie_down_dark_gray',
  'shirt_hoodie_down_blue',
  'shirt_hoodie_up_red',
  'shirt_hoodie_up_blue',
  'shirt_hoodie_up_white',
  'shirt_hoodie_up_green',
  'shirt_hoodie_up_pink',
  'shirt_hoodie_up_dark_gray',
  'hat_cowboy_hat',
  'hat_beanie',
  'hat_beanie_monochrome',
  'hat_bandana_red',
  'hat_bandana_blue',
  'cap_monochrome',
  'cap_based_blue',
  'cap_purple',
  'headphones_black',
  'headphones_blue',
  'headphones_gold',
  'headphones_pink',
  'headphones_square_black',
  'headphones_square_blue',
  'accessories_christmas_blue',
  'accessories_christmas_green',
  'accessories_christmas_graveyard',
  'accessories_christmas_orange',
  'accessories_christmas_red',
  'accessories_christmas_teal',
  'accessories_christmas_purple',
  'accessories_christmas_tree',
  'accessories_christmas_turquoise',
  'accessories_christmas_yellow',
];

function quatZ(angle) {
  return { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) };
}

function createFallbackLaundryMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.14, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x6bb8ff, roughness: 0.92 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function getLaundryTargetSize(meshName) {
  if (meshName.startsWith('shirt_')) return THREE.MathUtils.randFloat(0.6, 0.9);
  if (meshName.startsWith('accessories_')) return THREE.MathUtils.randFloat(0.4, 0.62);
  return THREE.MathUtils.randFloat(0.28, 0.46);
}

export default function createLaundromatLevel(ctx) {
  const roomW = 46;
  const roomD = 36;
  const ceilingY = 9;
  const roomHalfW = roomW / 2;
  const roomHalfD = roomD / 2;
  const drumCenter = new THREE.Vector3(0, 3.25, 0.2);
  const drumRadius = 2.1;
  const drumDepth = 3.2;
  const drumFrontZ = drumCenter.z + drumDepth / 2 + 0.1;
  const spawnY = drumCenter.y - drumRadius + 0.45;

  return {
    name: 'laundromat',
    spawnPos: { x: 0, y: spawnY, z: 0 },
    groundY: 0,
    defaultCamFollow: false,
    cameraZooms: { near: 1 / 3, standard: 2 / 3, distant: 1 },
    cameraStart: { pos: [11, 5.9, 19.5], lookAt: [0, 3.1, 0.2] },
    settingsOverrides: { launchSpeed: 0, dropHeight: 1, damping: 0.45, bounce: 0.35 },
    keepIdleUntilImpact: true,
    cameraFollow: { offX: 4.8, offY: 2.6, offZ: 9.5, minY: 2.2 },
    autoSpawn: [
      { x: -0.75, y: spawnY, z: -0.65 },
      { x: 0.15, y: spawnY - 0.05, z: 0.15 },
      { x: 0.85, y: spawnY + 0.03, z: 0.72 },
      { x: -0.2, y: spawnY + 0.07, z: 0.9 },
    ],

    build() {
      const p = newParts();

      ctx.scene.background = new THREE.Color(0xe5edf4);
      ctx.scene.fog = new THREE.FogExp2(0xe5edf4, 0.02);

      const tileA = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.95 });
      const tileB = new THREE.MeshStandardMaterial({ color: 0xcfd8de, roughness: 0.95 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x8ca0af, roughness: 0.6, metalness: 0.25 });
      const machineMat = new THREE.MeshStandardMaterial({ color: 0xced8df, roughness: 0.62, metalness: 0.18 });
      const darkMachineMat = new THREE.MeshStandardMaterial({ color: 0x607788, roughness: 0.46, metalness: 0.24 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x9fd7ff,
        transparent: true,
        opacity: 0.26,
        roughness: 0.08,
        metalness: 0.15,
      });

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), tileA);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      ctx.scene.add(floor);
      p.staticMeshes.push(floor);

      const floorBody = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
      ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(roomHalfW, 0.5, roomHalfD).setRestitution(0.25).setFriction(0.9), floorBody);
      p.staticBodies.push(floorBody);

      for (let x = -roomHalfW + 1.5; x <= roomHalfW - 1.5; x += 3) {
        for (let z = -roomHalfD + 1.5; z <= roomHalfD - 1.5; z += 3) {
          const tile = new THREE.Mesh(new THREE.PlaneGeometry(2.92, 2.92), ((Math.round((x + z) / 3) & 1) === 0) ? tileA : tileB);
          tile.rotation.x = -Math.PI / 2;
          tile.position.set(x, 0.002, z);
          ctx.scene.add(tile);
          p.staticMeshes.push(tile);
        }
      }

      addBox(ctx, p, { x: 0, y: ceilingY / 2, z: -roomHalfD }, { x: roomHalfW, y: ceilingY / 2, z: 0.25 }, 0xc2ccd5, { roughness: 0.92 });
      addBox(ctx, p, { x: -roomHalfW, y: ceilingY / 2, z: -8 }, { x: 0.25, y: ceilingY / 2, z: 10 }, 0xb9c7d2, { roughness: 0.92 });
      addBox(ctx, p, { x: roomHalfW, y: ceilingY / 2, z: -8 }, { x: 0.25, y: ceilingY / 2, z: 10 }, 0xb9c7d2, { roughness: 0.92 });

      for (const lx of [-8, 0, 8]) {
        const lightHousing = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 0.14, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xf8fbff, emissive: 0xe6f5ff, emissiveIntensity: 0.5 })
        );
        lightHousing.position.set(lx, ceilingY - 0.35, -2);
        ctx.scene.add(lightHousing);
        p.staticMeshes.push(lightHousing);

        const light = new THREE.PointLight(0xf6fbff, 0.9, 20, 2);
        light.position.set(lx, ceilingY - 0.55, -2);
        ctx.scene.add(light);
        p.staticMeshes.push(light);
      }

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 1.2, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x2f4252, emissive: 0x6fd8ff, emissiveIntensity: 0.3, roughness: 0.42 })
      );
      sign.position.set(0, 7.1, -roomHalfD + 0.35);
      ctx.scene.add(sign);
      p.staticMeshes.push(sign);

      const addLaundryMachine = (x, z) => {
        const shell = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.2, 2.1), machineMat);
        shell.position.set(x, 1.6, z);
        shell.castShadow = true;
        shell.receiveShadow = true;
        ctx.scene.add(shell);
        p.staticMeshes.push(shell);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.2), darkMachineMat);
        panel.position.set(x, 2.85, z + 1.03);
        ctx.scene.add(panel);
        p.staticMeshes.push(panel);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.08, 12, 28),
          new THREE.MeshStandardMaterial({ color: 0xf2f6fb, roughness: 0.3, metalness: 0.35 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 1.55, z + 1.01);
        ctx.scene.add(ring);
        p.staticMeshes.push(ring);

        const window = new THREE.Mesh(new THREE.CircleGeometry(0.54, 24), glassMat);
        window.position.set(x, 1.55, z + 1.0);
        ctx.scene.add(window);
        p.staticMeshes.push(window);

        addBox(ctx, p, { x, y: 1.6, z }, { x: 1.15, y: 1.6, z: 1.05 }, 0xbccad4, { roughness: 0.72 });
      };

      for (let i = 0; i < 6; i++) {
        addLaundryMachine(-12.5 + i * 5, -roomHalfD + 1.55);
      }
      for (const [mx, mz] of [[-18.2, -6], [-18.2, -1], [18.2, -6], [18.2, -1]]) {
        addLaundryMachine(mx, mz);
      }

      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.16, 2.2), new THREE.MeshStandardMaterial({ color: 0xe4edf4, roughness: 0.7 }));
      tableTop.position.set(15.2, 1.45, -1.8);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      ctx.scene.add(tableTop);
      p.staticMeshes.push(tableTop);
      for (const [lx, lz] of [[-2.4, -0.9], [-2.4, 0.9], [2.4, -0.9], [2.4, 0.9]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), trimMat);
        leg.position.set(15.2 + lx, 0.7, -1.8 + lz);
        ctx.scene.add(leg);
        p.staticMeshes.push(leg);
      }

      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.9, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xffca54, roughness: 0.72 })
      );
      basket.position.set(-15.4, 0.65, -1.2);
      basket.castShadow = true;
      basket.receiveShadow = true;
      ctx.scene.add(basket);
      p.staticMeshes.push(basket);
      for (const [wx, wz] of [[-0.8, -0.5], [-0.8, 0.5], [0.8, -0.5], [0.8, 0.5]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), darkMachineMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-15.4 + wx, 0.12, -1.2 + wz);
        ctx.scene.add(wheel);
        p.staticMeshes.push(wheel);
      }

      const detergentColors = [0xff6b6b, 0x4ecdc4, 0xffc857, 0x6c8cff, 0xff8c42];
      for (let i = 0; i < 5; i++) {
        const bottle = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.9, 0.4),
          new THREE.MeshStandardMaterial({ color: detergentColors[i], roughness: 0.55 })
        );
        bottle.position.set(13.7 + i * 0.7, 2.05, -1.2);
        ctx.scene.add(bottle);
        p.staticMeshes.push(bottle);
      }

      const dryerGroup = new THREE.Group();
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x95a8b7, roughness: 0.54, metalness: 0.18 });
      const drumMat = new THREE.MeshStandardMaterial({ color: 0x5e7283, roughness: 0.34, metalness: 0.42 });
      const paddleMat = new THREE.MeshStandardMaterial({ color: 0xd0dde5, roughness: 0.44, metalness: 0.25 });
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xf0f5f9, roughness: 0.18, metalness: 0.38 });

      const housingParts = [
        { pos: [drumCenter.x, drumCenter.y + 2.55, drumCenter.z - 0.15], size: [3.4, 0.45, 2.45] },
        { pos: [drumCenter.x, drumCenter.y - 2.55, drumCenter.z - 0.15], size: [3.4, 0.45, 2.45] },
        { pos: [drumCenter.x - 2.95, drumCenter.y, drumCenter.z - 0.15], size: [0.45, 2.65, 2.45] },
        { pos: [drumCenter.x + 2.95, drumCenter.y, drumCenter.z - 0.15], size: [0.45, 2.65, 2.45] },
        { pos: [drumCenter.x, drumCenter.y, drumCenter.z - drumDepth / 2 - 0.55], size: [3.4, 2.65, 0.35] },
      ];
      for (const part of housingParts) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.size[0] * 2, part.size[1] * 2, part.size[2] * 2), housingMat);
        mesh.position.set(...part.pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        dryerGroup.add(mesh);
      }

      const controlPanel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.45), darkMachineMat);
      controlPanel.position.set(drumCenter.x + 1.2, drumCenter.y + 3.15, drumCenter.z + 0.35);
      dryerGroup.add(controlPanel);
      for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
          new THREE.MeshStandardMaterial({ color: i === 0 ? 0x4ecdc4 : 0xffb34d, emissive: i === 0 ? 0x4ecdc4 : 0xff8f3f, emissiveIntensity: 0.3 })
        );
        button.rotation.z = Math.PI / 2;
        button.position.set(drumCenter.x + 0.6 + i * 0.28, drumCenter.y + 3.18, drumCenter.z + 0.6);
        dryerGroup.add(button);
      }

      const openingRing = new THREE.Mesh(new THREE.TorusGeometry(drumRadius + 0.2, 0.14, 16, 36), ringMat);
      openingRing.rotation.x = Math.PI / 2;
      openingRing.position.set(drumCenter.x, drumCenter.y, drumFrontZ - 0.18);
      dryerGroup.add(openingRing);

      const drumVisual = new THREE.Group();
      drumVisual.position.copy(drumCenter);
      const drumShell = new THREE.Mesh(
        new THREE.CylinderGeometry(drumRadius, drumRadius, drumDepth, 36, 1, true),
        drumMat
      );
      drumShell.rotation.x = Math.PI / 2;
      drumShell.castShadow = true;
      drumShell.receiveShadow = true;
      drumVisual.add(drumShell);

      const drumBack = new THREE.Mesh(new THREE.CircleGeometry(drumRadius - 0.1, 32), ringMat);
      drumBack.position.set(0, 0, -drumDepth / 2 + 0.05);
      drumVisual.add(drumBack);

      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, drumDepth - 0.38), paddleMat);
        paddle.position.set(Math.cos(angle) * (drumRadius - 0.55), Math.sin(angle) * (drumRadius - 0.55), 0);
        paddle.rotation.z = angle;
        paddle.castShadow = true;
        paddle.receiveShadow = true;
        drumVisual.add(paddle);
      }
      dryerGroup.add(drumVisual);

      const doorPivot = new THREE.Group();
      doorPivot.position.set(drumCenter.x - drumRadius - 0.18, drumCenter.y, drumFrontZ);
      const doorRing = new THREE.Mesh(new THREE.TorusGeometry(drumRadius + 0.04, 0.11, 16, 36), ringMat);
      doorRing.rotation.y = Math.PI / 2;
      doorRing.position.x = drumRadius + 0.18;
      doorPivot.add(doorRing);

      const doorGlass = new THREE.Mesh(new THREE.CircleGeometry(drumRadius - 0.18, 32), glassMat);
      doorGlass.rotation.y = Math.PI / 2;
      doorGlass.position.x = drumRadius + 0.18;
      doorPivot.add(doorGlass);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), darkMachineMat);
      handle.position.set(drumRadius * 1.95, 0, 0);
      doorPivot.add(handle);
      dryerGroup.add(doorPivot);

      ctx.scene.add(dryerGroup);

      const drumBody = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(drumCenter.x, drumCenter.y, drumCenter.z)
      );
      const shellSegments = 14;
      const shellRadius = drumRadius - 0.12;
      const shellLength = (Math.PI * drumRadius * 2) / shellSegments * 0.72;
      for (let i = 0; i < shellSegments; i++) {
        const angle = (i / shellSegments) * Math.PI * 2;
        ctx.world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.12, shellLength / 2, drumDepth / 2 - 0.18)
            .setTranslation(shellRadius * Math.cos(angle), shellRadius * Math.sin(angle), 0)
            .setRotation(quatZ(angle))
            .setRestitution(0.25)
            .setFriction(0.95),
          drumBody
        );
      }
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        ctx.world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.52, 0.11, drumDepth / 2 - 0.24)
            .setTranslation((drumRadius - 0.55) * Math.cos(angle), (drumRadius - 0.55) * Math.sin(angle), 0)
            .setRotation(quatZ(angle))
            .setRestitution(0.22)
            .setFriction(0.9),
          drumBody
        );
      }

      const state = {
        active: false,
        time: 0,
        angle: 0,
        spinSpeed: 0,
        doorOpen: false,
        doorAngle: 0,
        frontDoorBody: null,
      };

      const createFrontDoorBody = () => {
        const body = ctx.world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(drumCenter.x, drumCenter.y, drumFrontZ + 0.02)
        );
        ctx.world.createCollider(
          RAPIER.ColliderDesc.cuboid(drumRadius - 0.12, drumRadius - 0.12, 0.14).setRestitution(0.2).setFriction(0.8),
          body
        );
        state.frontDoorBody = body;
      };
      createFrontDoorBody();

      const addLaundryProp = (meshName, pos) => {
        let mesh = ctx.createModelPropMesh ? ctx.createModelPropMesh(meshName) : null;
        if (!mesh) mesh = createFallbackLaundryMesh();

        const rawBounds = new THREE.Box3().setFromObject(mesh);
        const rawSize = rawBounds.getSize(new THREE.Vector3());
        const rawMax = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
        const scale = getLaundryTargetSize(meshName) / rawMax;
        mesh.scale.setScalar(scale);
        mesh.position.copy(pos);
        mesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        ctx.scene.add(mesh);

        const bounds = new THREE.Box3().setFromObject(mesh);
        const size = bounds.getSize(new THREE.Vector3());
        const rot = mesh.quaternion;
        const body = ctx.world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(pos.x, pos.y, pos.z)
            .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w })
            .setLinearDamping(0.18)
            .setAngularDamping(0.22)
            .setCcdEnabled(true)
        );
        ctx.world.createCollider(
          RAPIER.ColliderDesc.cuboid(
            Math.max(size.x * 0.35, 0.06),
            Math.max(size.y * 0.35, 0.06),
            Math.max(size.z * 0.35, 0.06)
          )
            .setMass(0.35)
            .setRestitution(0.35)
            .setFriction(0.8),
          body
        );

        p.dynamicParts.push({
          mesh,
          body,
          initPos: { x: pos.x, y: pos.y, z: pos.z },
          initRot: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
          kind: 'laundry',
        });
      };

      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (drumRadius - 0.7);
        const z = THREE.MathUtils.randFloatSpread(drumDepth - 1.1);
        addLaundryProp(
          LAUNDRY_ITEM_NAMES[Math.floor(Math.random() * LAUNDRY_ITEM_NAMES.length)],
          new THREE.Vector3(
            drumCenter.x + Math.cos(angle) * radius,
            drumCenter.y + Math.sin(angle) * radius + 0.25,
            drumCenter.z + z * 0.45
          )
        );
      }

      const floorLaundrySpawns = [
        new THREE.Vector3(-15.7, 0.8, -0.8),
        new THREE.Vector3(-14.9, 0.8, -1.7),
        new THREE.Vector3(13.9, 0.8, -0.9),
        new THREE.Vector3(15.7, 0.8, -2.1),
      ];
      for (const pos of floorLaundrySpawns) {
        addLaundryProp(
          LAUNDRY_ITEM_NAMES[Math.floor(Math.random() * LAUNDRY_ITEM_NAMES.length)],
          pos
        );
      }

      const axis = new THREE.Vector3(0, 0, 1);
      const tumbleForce = (body, dt, ejecting) => {
        const pos = body.translation();
        const dx = pos.x - drumCenter.x;
        const dy = pos.y - drumCenter.y;
        const dz = pos.z - drumCenter.z;
        const radial = Math.sqrt(dx * dx + dy * dy);
        if (radial > drumRadius + 0.45 || Math.abs(dz) > drumDepth / 2 + 0.6) return;

        const inv = radial > 0.001 ? 1 / radial : 0;
        const tangentialX = -dy * inv;
        const tangentialY = dx * inv;
        const swirl = Math.min(state.spinSpeed, 5.8);
        body.applyImpulse({
          x: tangentialX * swirl * dt * 0.32,
          y: (tangentialY + 0.8) * swirl * dt * 0.3,
          z: ejecting ? 0.08 + Math.max(dz, 0) * 0.03 : 0,
        }, true);

        if (ejecting && dz > -0.2) {
          body.applyImpulse({
            x: dx * 0.01,
            y: 0.05,
            z: 0.18 + Math.max(state.spinSpeed, 1.2) * 0.02,
          }, true);
        }
      };

      p.animatedObjects.push({
        group: dryerGroup,
        body: drumBody,
        state,
        update(dt) {
          if (state.active) state.time += dt;
          const targetSpin = state.active ? (state.doorOpen ? 2.2 : 5.4) : 0;
          const accel = state.active ? 1.4 : 2.5;
          state.spinSpeed += (targetSpin - state.spinSpeed) * Math.min(accel * dt, 1);
          state.angle += state.spinSpeed * dt;

          const drumQuat = new THREE.Quaternion().setFromAxisAngle(axis, state.angle);
          drumBody.setNextKinematicTranslation({ x: drumCenter.x, y: drumCenter.y, z: drumCenter.z });
          drumBody.setNextKinematicRotation({ x: drumQuat.x, y: drumQuat.y, z: drumQuat.z, w: drumQuat.w });
          drumVisual.rotation.z = state.angle;

          if (state.active && state.time > 5 && !state.doorOpen) {
            state.doorOpen = true;
            if (state.frontDoorBody) {
              ctx.world.removeRigidBody(state.frontDoorBody);
              state.frontDoorBody = null;
            }
            if (ctx.playBoom) ctx.playBoom();
          }

          const targetDoor = state.doorOpen ? -1.4 : 0;
          state.doorAngle += (targetDoor - state.doorAngle) * Math.min(dt * 4.5, 1);
          doorPivot.rotation.y = state.doorAngle;

          const ejecting = state.doorOpen && state.spinSpeed > 1.1;
          if (state.active) {
            for (const dp of p.dynamicParts) tumbleForce(dp.body, dt, ejecting);
            for (const mfer of ctx.mfers) {
              for (const body of Object.values(mfer.ragdollBodies)) tumbleForce(body, dt, ejecting);
            }
          }
        },
        cleanup() {
          if (state.frontDoorBody) {
            ctx.world.removeRigidBody(state.frontDoorBody);
            state.frontDoorBody = null;
          }
        },
      });

      p.reset = () => {
        state.active = false;
        state.time = 0;
        state.angle = 0;
        state.spinSpeed = 0;
        state.doorOpen = false;
        state.doorAngle = 0;
        drumVisual.rotation.z = 0;
        doorPivot.rotation.y = 0;
        drumBody.setNextKinematicTranslation({ x: drumCenter.x, y: drumCenter.y, z: drumCenter.z });
        drumBody.setNextKinematicRotation({ x: 0, y: 0, z: 0, w: 1 });
        if (!state.frontDoorBody) createFrontDoorBody();
      };

      return p;
    },

    onDrop(lp) {
      if (!lp?.animatedObjects?.[0] || lp.animatedObjects[0].state.active) return;

      lp.animatedObjects[0].state.active = true;
      lp.animatedObjects[0].state.time = 0;
      if (ctx.playHiss) ctx.playHiss();

      const activeMfers = [];
      for (const pm of ctx.placedMfers) {
        if (pm.triggerBody) ctx.world.removeRigidBody(pm.triggerBody);
        const mfer = ctx.createRagdoll(pm.scene);
        if (!mfer) continue;

        mfer.ragdollActive = true;
        mfer.canDetach = true;
        for (const body of Object.values(mfer.ragdollBodies)) {
          body.setLinvel({
            x: THREE.MathUtils.randFloatSpread(0.35),
            y: 0.45 + Math.random() * 0.25,
            z: THREE.MathUtils.randFloatSpread(0.12),
          }, true);
          body.setAngvel({
            x: THREE.MathUtils.randFloatSpread(0.4),
            y: THREE.MathUtils.randFloatSpread(0.4),
            z: THREE.MathUtils.randFloatSpread(0.25),
          }, true);
        }
        activeMfers.push(mfer);
      }

      ctx.mfers.push(...activeMfers);
      ctx.placedMfers = [];
    },
  };
}
