import * as THREE from 'three';

const PALETTES = {
  cyan: { primary: 0x38c8d8, secondary: 0x123d55, accent: 0x9ff6ff },
  amber: { primary: 0xe8a63b, secondary: 0x594016, accent: 0xffe3a1 },
  violet: { primary: 0x8d6de8, secondary: 0x2c2457, accent: 0xdacbff },
  green: { primary: 0x4caf86, secondary: 0x183f34, accent: 0xb8ffe0 }
};
const CONTEXTS = {
  neutral: 0x4f7895,
  support: 0x49b98c,
  distance: 0x7590a8,
  tension: 0xb76a6a
};

export class AvatarScene {
  constructor(container, config, options = {}) {
    this.container = container;
    this.compact = Boolean(options.compact);
    this.config = config;
    this.disposed = false;
    this.fallback = null;
    this.init();
  }

  init() {
    try {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      this.camera.position.set(0, this.compact ? 1.6 : 1.4, this.compact ? 6.8 : 7.6);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.shadowMap.enabled = !this.compact;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.domElement.setAttribute('aria-label', 'Трёхмерный аватар HROS');
      this.container.replaceChildren(this.renderer.domElement);

      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x203040, 2.4));
      const key = new THREE.DirectionalLight(0xffffff, 3.2);
      key.position.set(4, 7, 5);
      key.castShadow = !this.compact;
      this.scene.add(key);
      const rim = new THREE.PointLight(0x69dce7, 4, 12);
      rim.position.set(-4, 3, 3);
      this.scene.add(rim);

      this.root = new THREE.Group();
      this.root.position.y = -1.55;
      this.scene.add(this.root);
      this.buildAvatar();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
      this.resize();
      this.animate = this.animate.bind(this);
      this.frame = requestAnimationFrame(this.animate);
    } catch {
      this.renderFallback();
    }
  }

  material(color, roughness = 0.56, metalness = 0.08) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
  }

  mesh(geometry, material, position, scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = !this.compact;
    mesh.receiveShadow = !this.compact;
    this.root.add(mesh);
    return mesh;
  }

  buildAvatar() {
    while (this.root.children.length) {
      const item = this.root.children.pop();
      item.geometry?.dispose?.();
      if (Array.isArray(item.material)) item.material.forEach((material) => material.dispose?.());
      else item.material?.dispose?.();
    }
    const palette = PALETTES[this.config?.palette] || PALETTES.cyan;
    const primary = this.material(palette.primary, 0.48, 0.12);
    const secondary = this.material(palette.secondary, 0.65, 0.05);
    const accent = this.material(palette.accent, 0.32, 0.18);
    const skin = this.material(0xd6b69a, 0.82, 0.01);
    const baseRole = this.config?.role || 'base';
    const bodyScale = baseRole === 'athlete' ? [1.18, 1, 1.08] : baseRole === 'guardian' ? [1.12, 1.06, 1.12] : [1, 1, 1];

    this.mesh(new THREE.DodecahedronGeometry(0.52, 0), skin, [0, 3.45, 0], [0.94, 1.05, 0.94]);
    this.mesh(new THREE.ConeGeometry(0.62, 1.1, 6), secondary, [0, 4.04, 0], [1, 0.34, 1]);
    this.mesh(new THREE.CylinderGeometry(0.68, 0.88, 1.85, 6), primary, [0, 2.05, 0], bodyScale);
    this.mesh(new THREE.BoxGeometry(0.4, 1.62, 0.44), secondary, [-0.52, 0.55, 0], [1, 1, 1]);
    this.mesh(new THREE.BoxGeometry(0.4, 1.62, 0.44), secondary, [0.52, 0.55, 0], [1, 1, 1]);
    const armLeft = this.mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.7, 6), primary, [-1.04, 2.1, 0], [1, 1, 1]);
    armLeft.rotation.z = 0.2;
    const armRight = this.mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.7, 6), primary, [1.04, 2.1, 0], [1, 1, 1]);
    armRight.rotation.z = -0.2;
    this.mesh(new THREE.TorusGeometry(1.15, 0.055, 6, 48), accent, [0, 2.1, 0], [1, 1, 1]).rotation.x = Math.PI / 2;

    const contextColor = CONTEXTS[this.config?.relationshipContext] || CONTEXTS.neutral;
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.075, 8, 64),
      new THREE.MeshBasicMaterial({ color: contextColor, transparent: true, opacity: 0.72 })
    );
    aura.position.set(0, 1.85, -0.2);
    aura.rotation.x = Math.PI / 2.45;
    this.root.add(aura);
    this.aura = aura;

    const modifiers = new Set(this.config?.modifiers || []);
    if (modifiers.has('ai-orbit')) this.addOrbitalSymbol('AI', palette.accent, 1.85, 2.8, 0.6);
    if (modifiers.has('sport-band')) this.addGem(0xeaf4ff, -1.12, 1.75, 0.5);
    if (modifiers.has('family-emblem')) this.addGem(0xffd6df, 0, 2.38, 0.91);
    if (modifiers.has('architecture-grid')) this.addGrid(palette.accent);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.72, 0.22, 8),
      this.material(palette.secondary, 0.76, 0.08)
    );
    ground.position.set(0, -0.38, 0);
    ground.receiveShadow = !this.compact;
    this.root.add(ground);
  }

  addGem(color, x, y, z) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), this.material(color, 0.2, 0.3));
    gem.position.set(x, y, z);
    this.root.add(gem);
  }

  addOrbitalSymbol(label, color, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), this.material(color, 0.18, 0.35));
    group.add(orb);
    group.userData.label = label;
    this.root.add(group);
    this.orbital = group;
  }

  addGrid(color) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
    for (let index = -2; index <= 2; index += 1) {
      const horizontal = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.78, index * 0.22, 0), new THREE.Vector3(0.78, index * 0.22, 0)]);
      const vertical = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(index * 0.31, -0.44, 0), new THREE.Vector3(index * 0.31, 0.44, 0)]);
      group.add(new THREE.Line(horizontal, material), new THREE.Line(vertical, material));
    }
    group.position.set(0, 2.02, 0.91);
    this.root.add(group);
  }

  update(config) {
    this.config = config;
    if (this.root) this.buildAvatar();
    else this.renderFallback();
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(180, this.container.clientWidth || 320);
    const height = Math.max(220, this.container.clientHeight || (this.compact ? 240 : 420));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate(time) {
    if (this.disposed || !this.renderer) return;
    const reduced = document.body.classList.contains('command-reduced-motion');
    if (!reduced) {
      this.root.rotation.y = Math.sin(time * 0.00045) * 0.22;
      if (this.aura) this.aura.rotation.z = time * 0.00018;
      if (this.orbital) {
        this.orbital.position.x = Math.cos(time * 0.001) * 1.85;
        this.orbital.position.z = Math.sin(time * 0.001) * 1.18;
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  }

  renderFallback() {
    this.container.innerHTML = '<div class="avatar-webgl-fallback" role="img" aria-label="Схематичный аватар HROS"><span></span><i></i><b></b></div>';
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.scene?.traverse((item) => {
      item.geometry?.dispose?.();
      if (Array.isArray(item.material)) item.material.forEach((material) => material.dispose?.());
      else item.material?.dispose?.();
    });
    this.renderer?.dispose?.();
    this.container?.replaceChildren();
  }
}
