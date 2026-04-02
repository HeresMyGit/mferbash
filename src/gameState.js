// Shared game context — passed to level build() functions
// Levels import THREE/RAPIER directly, and receive ctx for scene/world/settings access

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// Level helpers
export function addBox(ctx, p, pos, size, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.7, ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}) });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  mesh.castShadow = !opts.noShadow;
  mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  p.staticMeshes.push(mesh);
  if (!opts.noPhysics) {
    const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
    if (opts.rotZ) desc.setRotation({ x: 0, y: 0, z: Math.sin(opts.rotZ / 2), w: Math.cos(opts.rotZ / 2) });
    const body = ctx.world.createRigidBody(desc);
    ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setRestitution(opts.restitution ?? 0.3).setFriction(opts.friction ?? 0.5), body);
    p.staticBodies.push(body);
  }
  return mesh;
}

export function addDynamicBox(ctx, p, pos, size, color, mass = 1.5) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  const bb = ctx.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinearDamping(0.3).setAngularDamping(0.3));
  ctx.world.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setMass(mass).setRestitution(0.4).setFriction(0.5), bb);
  p.dynamicParts.push({ mesh, body: bb, initPos: { x: pos.x, y: pos.y, z: pos.z } });
}

export function newParts() {
  return { staticBodies: [], staticMeshes: [], dynamicParts: [], helpers: [], animatedObjects: [] };
}
