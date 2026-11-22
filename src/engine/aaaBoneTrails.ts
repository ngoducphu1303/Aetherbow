import * as THREE from 'three';

export interface BoneTrailRibbon {
  readonly anchor: THREE.Object3D;
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.MeshBasicMaterial;
  readonly maxPoints: number;
  readonly pointsX: Float32Array;
  readonly pointsY: Float32Array;
  readonly pointsZ: Float32Array;
  readonly widths: Float32Array;
  initialized: boolean;
  activeEnergy: number;
}

export interface BoneTrailController {
  readonly ribbons: BoneTrailRibbon[];
  readonly group: THREE.Group;
  readonly baseWidth: number;
}

const _worldPos = new THREE.Vector3();
const _prevPos = new THREE.Vector3();
const _velDir = new THREE.Vector3();
const _sideVec = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _altAxis = new THREE.Vector3(1, 0, 0);

/**
 * Creates lightweight, zero-GC pooled 3D slash/wing/spear ribbon trails attached to real bone anchors.
 * Uses AdditiveBlending + vertex colors with ZERO PointLights so Intel HD 4000 (Dell E5430) stays fast.
 */
export function createBoneTrailController(
  anchors: readonly THREE.Object3D[],
  options: {
    colorHex: number;
    accentHex: number;
    width: number;
    liteMode: boolean;
  }
): BoneTrailController {
  const group = new THREE.Group();
  group.name = 'BoneTrailGroup';

  // Lite mode keeps crisp trails with fewer segments (10 tris/ribbon vs 18 tris/ribbon on High)
  const maxPoints = options.liteMode ? 6 : 10;
  const colorCore = new THREE.Color(options.accentHex);
  const colorTail = new THREE.Color(options.colorHex);

  const ribbons: BoneTrailRibbon[] = [];

  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    const vertCount = maxPoints * 2;
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const indices: number[] = [];

    for (let i = 0; i < maxPoints; i++) {
      const t = i / Math.max(1, maxPoints - 1);
      const fade = Math.pow(1 - t, 1.55);
      const r = THREE.MathUtils.lerp(colorCore.r, colorTail.r, t) * fade;
      const g = THREE.MathUtils.lerp(colorCore.g, colorTail.g, t) * fade;
      const b = THREE.MathUtils.lerp(colorCore.b, colorTail.b, t) * fade;
      const cIdx = i * 6;
      colors[cIdx] = r;
      colors[cIdx + 1] = g;
      colors[cIdx + 2] = b;
      colors[cIdx + 3] = r;
      colors[cIdx + 4] = g;
      colors[cIdx + 5] = b;
    }

    for (let i = 0; i < maxPoints - 1; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i1, i2, i2, i1, i3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.renderOrder = 14;
    group.add(mesh);

    ribbons.push({
      anchor,
      mesh,
      geometry,
      material,
      maxPoints,
      pointsX: new Float32Array(maxPoints),
      pointsY: new Float32Array(maxPoints),
      pointsZ: new Float32Array(maxPoints),
      widths: new Float32Array(maxPoints),
      initialized: false,
      activeEnergy: 0,
    });
  }

  return {
    ribbons,
    group,
    baseWidth: options.width,
  };
}

/**
 * Updates all bone-attached ribbons in world space with zero heap allocations.
 * Ignites boldly during active strikes, dashes, and telegraphs, and fades cleanly while idle.
 */
export function updateBoneTrailController(
  controller: BoneTrailController,
  intensity: number,
  dt: number
): void {
  const safeDt = Math.max(0.001, Math.min(0.05, dt));
  const clampedIntensity = Math.max(0, Math.min(1.2, intensity));

  for (let rIdx = 0; rIdx < controller.ribbons.length; rIdx++) {
    const r = controller.ribbons[rIdx];
    r.anchor.getWorldPosition(_worldPos);

    if (!r.initialized) {
      for (let i = 0; i < r.maxPoints; i++) {
        r.pointsX[i] = _worldPos.x;
        r.pointsY[i] = _worldPos.y;
        r.pointsZ[i] = _worldPos.z;
        r.widths[i] = 0;
      }
      r.initialized = true;
    }

    // Check bone tip movement speed to avoid ugly spikes on teleport/blink
    const jumpDist = Math.hypot(
      _worldPos.x - r.pointsX[0],
      _worldPos.y - r.pointsY[0],
      _worldPos.z - r.pointsZ[0]
    );
    if (jumpDist > 3.2) {
      for (let i = 0; i < r.maxPoints; i++) {
        r.pointsX[i] = _worldPos.x;
        r.pointsY[i] = _worldPos.y;
        r.pointsZ[i] = _worldPos.z;
        r.widths[i] = 0;
      }
      r.activeEnergy = 0;
      r.mesh.visible = false;
      continue;
    }

    const tipVelFactor = Math.min(1, jumpDist / Math.max(0.03, safeDt * 5.0));
    const targetEnergy = Math.max(clampedIntensity, clampedIntensity * 0.4 + tipVelFactor * 0.65 * clampedIntensity);
    r.activeEnergy = THREE.MathUtils.damp(r.activeEnergy, targetEnergy, clampedIntensity > r.activeEnergy ? 20 : 8, safeDt);

    // Shift ring history backward
    for (let i = r.maxPoints - 1; i > 0; i--) {
      r.pointsX[i] = r.pointsX[i - 1];
      r.pointsY[i] = r.pointsY[i - 1];
      r.pointsZ[i] = r.pointsZ[i - 1];
      r.widths[i] = r.widths[i - 1] * 0.88;
    }
    r.pointsX[0] = _worldPos.x;
    r.pointsY[0] = _worldPos.y;
    r.pointsZ[0] = _worldPos.z;
    r.widths[0] = controller.baseWidth * Math.min(1.25, r.activeEnergy);

    if (r.activeEnergy < 0.035) {
      r.mesh.visible = false;
      continue;
    }

    r.mesh.visible = true;
    r.material.opacity = Math.min(0.92, r.activeEnergy * 0.82);

    const posAttr = r.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < r.maxPoints; i++) {
      const px = r.pointsX[i];
      const py = r.pointsY[i];
      const pz = r.pointsZ[i];

      const nextIdx = i < r.maxPoints - 1 ? i + 1 : i;
      const prevIdx = i > 0 ? i - 1 : i;
      _prevPos.set(r.pointsX[prevIdx], r.pointsY[prevIdx], r.pointsZ[prevIdx]);
      _velDir.set(
        r.pointsX[nextIdx] - _prevPos.x,
        r.pointsY[nextIdx] - _prevPos.y,
        r.pointsZ[nextIdx] - _prevPos.z
      );

      if (_velDir.lengthSq() < 1e-6) {
        _sideVec.set(0, 1, 0);
      } else {
        _velDir.normalize();
        _sideVec.crossVectors(_velDir, _upAxis);
        if (_sideVec.lengthSq() < 0.01) {
          _sideVec.crossVectors(_velDir, _altAxis);
        }
        _sideVec.normalize();
      }

      const taper = 1 - i / Math.max(1, r.maxPoints - 1);
      const halfW = r.widths[i] * taper * 0.5;
      const vBase = i * 6;
      arr[vBase] = px + _sideVec.x * halfW;
      arr[vBase + 1] = py + _sideVec.y * halfW;
      arr[vBase + 2] = pz + _sideVec.z * halfW;
      arr[vBase + 3] = px - _sideVec.x * halfW;
      arr[vBase + 4] = py - _sideVec.y * halfW;
      arr[vBase + 5] = pz - _sideVec.z * halfW;
    }

    posAttr.needsUpdate = true;
  }
}

export function disposeBoneTrailController(controller: BoneTrailController): void {
  for (let i = 0; i < controller.ribbons.length; i++) {
    const r = controller.ribbons[i];
    r.geometry.dispose();
    r.material.dispose();
  }
  if (controller.group.parent) {
    controller.group.parent.remove(controller.group);
  }
}
