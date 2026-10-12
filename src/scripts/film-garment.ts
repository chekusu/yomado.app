// The film's 3D: a dress on a dress form, drawn with three.js into Blender's viewport and into
// Marvelous Designer's 3D window. One offscreen WebGL renderer draws each view and copies it into
// that window's 2D canvas, so both are ordinary pixels in the page the film is shot from.
//
// The dress is a parametric surface. Blender shows it as a coarse, flat-shaded base mesh until
// the Subdivision Surface modifier is added (level 1), then at level 3 once Codex types 3; the
// levels are sampled from the same surface at finer and finer grids. Solid shading turns into
// rendered shading (fabric, lights, contact shadow) when Codex picks the rendered view.
import * as THREE from 'three';
import type { BlenderPose } from '../lib/film';

const TAU = Math.PI * 2;
const smoothstep = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** Profile of the dress from hem (v = 0) to neckline (v = 1): height and radius, in metres. */
const PROFILE: [number, number, number][] = [
  // v, y, r
  [0.0, 0.38, 0.47],
  [0.18, 0.56, 0.4],
  [0.36, 0.76, 0.31],
  [0.52, 0.93, 0.215],
  [0.62, 1.04, 0.158],
  [0.74, 1.17, 0.172],
  [0.86, 1.29, 0.19],
  [1.0, 1.42, 0.166],
];

function profile(v: number): { y: number; r: number } {
  // Catmull–Rom through the profile points.
  let i = 0;
  while (i < PROFILE.length - 2 && v > PROFILE[i + 1][0]) i++;
  const p0 = PROFILE[Math.max(0, i - 1)];
  const p1 = PROFILE[i];
  const p2 = PROFILE[i + 1];
  const p3 = PROFILE[Math.min(PROFILE.length - 1, i + 2)];
  const u = (v - p1[0]) / (p2[0] - p1[0]);
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return { y: cr(p0[1], p1[1], p2[1], p3[1]), r: cr(p0[2], p1[2], p2[2], p3[2]) };
}

/** The smooth dress surface: folds on the skirt, an oval bodice, a gently uneven hem. */
function surface(theta: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  const { y, r } = profile(v);
  const skirt = 1 - smoothstep(0.3, 0.6, v);
  const fold = skirt * 0.085 * (0.62 * Math.sin(9 * theta + 0.7 * Math.sin(2 * theta)) + 0.38 * Math.sin(5 * theta + 1.3));
  const depth = 0.8 + 0.2 * skirt;
  const rr = r * (1 + fold);
  const hem = (1 - smoothstep(0, 0.16, v)) * 0.03 * Math.sin(2 * theta + 0.5);
  return out.set(rr * Math.cos(theta), y + hem, rr * Math.sin(theta) * depth);
}

const FINE = { u: 112, v: 64 };
const LEVEL0 = { u: 12, v: 7 };
const LEVEL1 = { u: 24, v: 14 };

/** Samples of the surface on a coarse grid, read back bilinearly: a mesh at that resolution. */
function sampler(grid: { u: number; v: number }) {
  const pts: THREE.Vector3[] = [];
  for (let j = 0; j < grid.v; j++) for (let i = 0; i < grid.u; i++) pts.push(surface((i / grid.u) * TAU, j / (grid.v - 1), new THREE.Vector3()));
  return (theta: number, v: number, out: THREE.Vector3) => {
    const fu = (theta / TAU) * grid.u;
    const fv = v * (grid.v - 1);
    const i0 = Math.floor(fu) % grid.u;
    const i1 = (i0 + 1) % grid.u;
    const j0 = Math.min(grid.v - 2, Math.floor(fv));
    const a = fu - Math.floor(fu);
    const b = fv - j0;
    const p00 = pts[j0 * grid.u + i0];
    const p10 = pts[j0 * grid.u + i1];
    const p01 = pts[(j0 + 1) * grid.u + i0];
    const p11 = pts[(j0 + 1) * grid.u + i1];
    return out.set(
      (p00.x * (1 - a) + p10.x * a) * (1 - b) + (p01.x * (1 - a) + p11.x * a) * b,
      (p00.y * (1 - a) + p10.y * a) * (1 - b) + (p01.y * (1 - a) + p11.y * a) * b,
      (p00.z * (1 - a) + p10.z * a) * (1 - b) + (p01.z * (1 - a) + p11.z * a) * b,
    );
  };
}

function lerpColor(a: THREE.Color, b: THREE.Color, u: number) {
  return a.clone().lerp(b, u);
}

export class Garment {
  readonly blenderCanvas: HTMLCanvasElement;
  readonly mdCanvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  private readonly geometry: THREE.BufferGeometry;
  private readonly levels: Float32Array[];
  private readonly dress: THREE.Mesh;
  private readonly hull: THREE.Mesh;
  private readonly flat: THREE.MeshStandardMaterial;
  private readonly smooth: THREE.MeshPhysicalMaterial;
  private readonly formMaterial: THREE.MeshStandardMaterial;
  private readonly shadow: THREE.ShadowMaterial;
  private readonly hemi: THREE.HemisphereLight;
  private readonly key: THREE.DirectionalLight;
  private readonly rim: THREE.DirectionalLight;
  private readonly grid: THREE.Group;
  private lastLevel = -1;

  constructor(blenderCanvas: HTMLCanvasElement, mdCanvas: HTMLCanvasElement) {
    this.blenderCanvas = blenderCanvas;
    this.mdCanvas = mdCanvas;
    const canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(1700, 1000, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // The dress: one fine grid whose vertices are placed from the level being shown.
    const count = FINE.u * FINE.v;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const index: number[] = [];
    for (let j = 0; j < FINE.v - 1; j++) {
      for (let i = 0; i < FINE.u; i++) {
        const a = j * FINE.u + i;
        const b = j * FINE.u + ((i + 1) % FINE.u);
        const c = (j + 1) * FINE.u + i;
        const d = (j + 1) * FINE.u + ((i + 1) % FINE.u);
        index.push(a, c, b, b, c, d);
      }
    }
    this.geometry.setIndex(index);
    const tmp = new THREE.Vector3();
    const build = (sample: (th: number, v: number, o: THREE.Vector3) => THREE.Vector3) => {
      const arr = new Float32Array(count * 3);
      for (let j = 0; j < FINE.v; j++)
        for (let i = 0; i < FINE.u; i++) {
          sample((i / FINE.u) * TAU, j / (FINE.v - 1), tmp);
          arr.set([tmp.x, tmp.y, tmp.z], (j * FINE.u + i) * 3);
        }
      return arr;
    };
    this.levels = [build(sampler(LEVEL0)), build(sampler(LEVEL1)), build(surface)];

    this.flat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.82, metalness: 0, flatShading: true, side: THREE.DoubleSide });
    this.smooth = new THREE.MeshPhysicalMaterial({ color: 0xbdbdbd, roughness: 0.82, metalness: 0, sheen: 0, sheenColor: new THREE.Color(0x9fb0ff), sheenRoughness: 0.45, side: THREE.DoubleSide });
    this.dress = new THREE.Mesh(this.geometry, this.flat);
    this.dress.castShadow = true;
    this.dress.receiveShadow = true;
    this.scene.add(this.dress);

    // Blender's selection outline: the back faces, pushed out along their normals, in orange.
    const outline = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(0xffa22e) }, width: { value: 0.0075 } },
      vertexShader: 'uniform float width; void main() { vec3 p = position + normal * width; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
      side: THREE.BackSide,
    });
    this.hull = new THREE.Mesh(this.geometry, outline);
    this.scene.add(this.hull);

    // The dress form: neck and shoulders above the dress, a pole and a base below it.
    this.formMaterial = new THREE.MeshStandardMaterial({ color: 0xa9a9a9, roughness: 0.85 });
    const form = new THREE.Group();
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.2, 48, 24, 0, TAU, 0, Math.PI / 2), this.formMaterial);
    shoulders.scale.set(1.0, 0.42, 0.66);
    shoulders.position.y = 1.4;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.2, 32), this.formMaterial);
    neck.position.y = 1.52;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.025, 32), this.formMaterial);
    cap.position.y = 1.63;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 16), this.formMaterial);
    pole.position.y = 0.22;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.035, 48), this.formMaterial);
    base.position.y = 0.018;
    for (const part of [shoulders, neck, cap, pole, base]) {
      part.castShadow = true;
      part.receiveShadow = true;
      form.add(part);
    }
    this.scene.add(form);

    // Floor: Blender's grid, and a contact shadow in rendered view.
    this.shadow = new THREE.ShadowMaterial({ opacity: 0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.shadow);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.grid = new THREE.Group();
    const lines = new THREE.GridHelper(12, 48, 0x4a4a4a, 0x4a4a4a);
    (lines.material as THREE.Material).transparent = true;
    (lines.material as THREE.Material).opacity = 0.55;
    this.grid.add(lines);
    const axis = (color: number, a: THREE.Vector3, b: THREE.Vector3) => {
      const g = new THREE.BufferGeometry().setFromPoints([a, b]);
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    };
    this.grid.add(axis(0x9c3b48, new THREE.Vector3(-6, 0.001, 0), new THREE.Vector3(6, 0.001, 0)));
    this.grid.add(axis(0x6c8a26, new THREE.Vector3(0, 0.001, -6), new THREE.Vector3(0, 0.001, 6)));
    this.scene.add(this.grid);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 2.4);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.6);
    this.key.position.set(-2.2, 4.2, 3.0);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -1.5;
    this.key.shadow.camera.right = 1.5;
    this.key.shadow.camera.top = 2.2;
    this.key.shadow.camera.bottom = -0.5;
    this.key.shadow.radius = 6;
    this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight(0x9fb4ff, 0);
    this.rim.position.set(2.5, 2.6, -3.2);
    this.scene.add(this.rim);
  }

  /** Put the dress's vertices at a subdivision level between 0 and 3. */
  private setLevel(level: number) {
    if (Math.abs(level - this.lastLevel) < 1e-4) return;
    this.lastLevel = level;
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const out = pos.array as Float32Array;
    const [l0, l1, l3] = this.levels;
    if (level <= 1) for (let i = 0; i < out.length; i++) out[i] = l0[i] + (l1[i] - l0[i]) * level;
    else {
      const u = (level - 1) / 2;
      for (let i = 0; i < out.length; i++) out[i] = l1[i] + (l3[i] - l1[i]) * u;
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  private look(azimuth: number, elevation: number, distance: number, aspect: number, target = new THREE.Vector3(0, 0.9, 0)) {
    const a = (azimuth * Math.PI) / 180;
    const e = (elevation * Math.PI) / 180;
    this.camera.aspect = aspect;
    this.camera.position.set(target.x + distance * Math.cos(e) * Math.sin(a), target.y + distance * Math.sin(e), target.z + distance * Math.cos(e) * Math.cos(a));
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  /** Render one view at w × h pixels and copy it into a 2D canvas. */
  private draw(into: HTMLCanvasElement, w: number, h: number) {
    if (into.width !== w || into.height !== h) {
      into.width = w;
      into.height = h;
    }
    const H = this.renderer.domElement.height;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(true);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    const ctx = into.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.renderer.domElement, 0, H - h, w, h, 0, 0, w, h);
  }

  /** Both views at time t. `quality` scales Blender's view with the camera's zoom. */
  render(b: BlenderPose, t: number, quality: number) {
    void t;
    this.setLevel(b.level);
    const rendered = b.rendered;

    // Blender: solid grey, flat until subdivided; rendered silk, light and shadow after.
    this.dress.material = b.level < 0.5 ? this.flat : this.smooth;
    const grey = new THREE.Color(0xbdbdbd);
    const silk = new THREE.Color(0x2a3f96);
    this.flat.color.copy(grey);
    this.smooth.color.copy(lerpColor(grey, silk, rendered));
    this.smooth.roughness = 0.82 - 0.3 * rendered;
    this.smooth.sheen = rendered;
    this.formMaterial.color.copy(lerpColor(new THREE.Color(0xa9a9a9), new THREE.Color(0xd9ccb3), rendered));
    this.hemi.intensity = 2.4 - 1.5 * rendered;
    this.key.intensity = 1.6 + 2.0 * rendered;
    this.key.color.copy(lerpColor(new THREE.Color(0xffffff), new THREE.Color(0xfff0da), rendered));
    this.rim.intensity = 2.2 * rendered;
    this.shadow.opacity = 0.32 * rendered;
    this.renderer.shadowMap.enabled = rendered > 0.01;
    this.hull.visible = b.selected > 0.5;
    this.grid.visible = true;
    const bw = Math.round(1128 * quality);
    const bh = Math.round(656 * quality);
    this.look(b.azimuth, b.elevation, 3.55, 1128 / 656);
    this.draw(this.blenderCanvas, bw, bh);

    // Marvelous Designer: its own front view, fabric shown as the simulated garment.
    this.dress.material = this.smooth;
    this.setLevel(3);
    this.smooth.color.set(0xe9dfcb);
    this.smooth.roughness = 0.7;
    this.smooth.sheen = 0.6;
    this.formMaterial.color.set(0x9a9ca3);
    this.hemi.intensity = 1.8;
    this.key.intensity = 2.2;
    this.key.color.set(0xffffff);
    this.rim.intensity = 0.8;
    this.shadow.opacity = 0;
    this.renderer.shadowMap.enabled = false;
    this.hull.visible = false;
    this.grid.visible = false;
    this.look(16, 4, 3.25, 560 / 664, new THREE.Vector3(0, 0.95, 0));
    this.draw(this.mdCanvas, 560, 664);
    // Back to Blender's level for the next frame.
    this.setLevel(b.level);
  }
}
