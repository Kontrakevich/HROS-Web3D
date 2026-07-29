import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLORS = {
  self: 0x8fe9ff,
  family: 0xc895ff,
  legacy: 0xffcc85,
  work: 0x79a9ff,
  project: 0x6fffc0,
  friend: 0x76f2b4,
  other: 0xb4c4d8
};

export class HrosScene {
  constructor(mount, labels, onSelect) {
    this.mount = mount;
    this.labels = labels;
    this.onSelect = onSelect;
    this.nodes = [];
    this.lines = [];
    this.snapshot = null;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050914, 0.035);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    this.camera.position.set(0, 2, 15);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.22;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;

    this.scene.add(new THREE.AmbientLight(0x8397ff, 1.35));
    const key = new THREE.PointLight(0x7ae7ff, 72, 28); key.position.set(2, 4, 7); this.scene.add(key);
    const fill = new THREE.PointLight(0xb283ff, 52, 24); fill.position.set(-6, -3, 2); this.scene.add(fill);
    this.addStars();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.pick(event));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  addStars() {
    const positions = [];
    for (let i = 0; i < 900; i += 1) {
      const radius = 12 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x8799cf, size: 0.04, transparent: true, opacity: 0.58 }));
    this.scene.add(this.stars);
  }

  setData(snapshot) {
    this.snapshot = snapshot;
    this.clearDataObjects();
    const personMap = new Map(snapshot.people.map((person, index) => [person.id, { ...person, position: person.position || this.autoPosition(index) }]));

    snapshot.relationships.forEach((relationship) => {
      const source = personMap.get(relationship.sourceId);
      const target = personMap.get(relationship.targetId);
      if (!source || !target) return;
      const a = new THREE.Vector3(...source.position);
      const b = new THREE.Vector3(...target.position);
      const middle = a.clone().lerp(b, 0.5);
      middle.z += 0.8 + Math.min(relationship.strength || 50, 100) / 160;
      const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.018 + (relationship.strength || 50) / 5000, 6, false),
        new THREE.MeshBasicMaterial({ color: 0x78cfff, transparent: true, opacity: 0.18 + (relationship.strength || 50) / 350 })
      );
      this.scene.add(line);
      this.lines.push(line);
    });

    personMap.forEach((person, id) => {
      const group = new THREE.Group();
      group.position.set(...person.position);
      const isSelf = Boolean(person.isSelf);
      const size = isSelf ? 1.05 : 0.52 + Number(person.strength || 70) / 300;
      const color = COLORS[person.type] || COLORS.other;
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 2),
        new THREE.MeshPhysicalMaterial({
          color, emissive: color, emissiveIntensity: isSelf ? 1.7 : 0.62,
          roughness: 0.24, metalness: 0.18, transparent: true, opacity: 0.92, clearcoat: 1
        })
      );
      core.userData.id = id;
      group.add(core);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(size * 1.35, 0.018, 8, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.52 })
      );
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);
      this.scene.add(group);
      this.nodes.push({ person, group, core });
    });

    this.labels.innerHTML = [...personMap.values()].map((person) => (
      `<button type="button" data-scene-id="${person.id}"><b>${this.escape(person.name)}</b><span>${this.escape(person.role)}</span></button>`
    )).join('');
    this.labels.querySelectorAll('[data-scene-id]').forEach((button) => {
      button.addEventListener('click', () => this.onSelect(button.dataset.sceneId));
    });
    this.resize();
  }

  clearDataObjects() {
    [...this.nodes.map((item) => item.group), ...this.lines].forEach((object) => {
      this.scene.remove(object);
      object.traverse?.((child) => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
        else child.material?.dispose?.();
      });
    });
    this.nodes = [];
    this.lines = [];
    this.labels.innerHTML = '';
  }

  select(id) {
    const item = this.nodes.find((node) => node.person.id === id);
    if (!item) return;
    this.labels.querySelectorAll('[data-scene-id]').forEach((button) => button.classList.toggle('selected', button.dataset.sceneId === id));
    const position = item.group.position;
    this.controls.target.copy(position);
    this.camera.position.set(position.x, position.y + 1.1, position.z + 7);
    this.controls.autoRotate = false;
  }

  resetCamera() {
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 2, 15);
    this.controls.autoRotate = true;
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.nodes.map((item) => item.core))[0];
    if (hit) this.onSelect(hit.object.userData.id);
  }

  resize() {
    const rect = this.mount.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height, false);
  }

  animate(time = 0) {
    if (this.destroyed) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.stars.rotation.y += 0.00008;
    this.nodes.forEach(({ group }, index) => {
      group.rotation.y += index === 0 ? 0.002 : 0.005;
      group.scale.setScalar(1 + Math.sin(time * 0.0018 + index) * 0.035);
    });
    this.nodes.forEach(({ person, group }) => {
      const label = this.labels.querySelector(`[data-scene-id="${person.id}"]`);
      if (!label) return;
      const vector = group.position.clone().project(this.camera);
      label.style.left = `${(vector.x * 0.5 + 0.5) * this.mount.clientWidth}px`;
      label.style.top = `${(-vector.y * 0.5 + 0.5) * this.mount.clientHeight}px`;
      label.style.opacity = vector.z < 1 ? '1' : '0';
    });
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.clearDataObjects();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.destroyed = true;
  }

  autoPosition(index) {
    if (index === 0) return [0, 0, 0];
    const angle = index * 2.399963229728653;
    const radius = 4 + (index % 3) * 0.6;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, ((index % 4) - 1.5) * 0.35];
  }

  escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }
}
