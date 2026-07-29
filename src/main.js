import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const people = [
  { id: 'me', name: 'Михаил', role: 'Я', type: 'self', strength: 100, pos: [0, 0, 0] },
  { id: 'snezha', name: 'Снежа', role: 'Жена', type: 'family', strength: 96, pos: [4.6, 1.5, 0.3] },
  { id: 'daughter', name: 'Дочь', role: 'Дочь', type: 'family', strength: 94, pos: [-4.4, 1.4, -0.2] },
  { id: 'boris', name: 'Борис Александрович', role: 'Дедушка', type: 'legacy', strength: 90, pos: [-3.5, -2.7, 0.2] },
  { id: 'marins', name: 'Marins Group', role: 'Работа', type: 'work', strength: 82, pos: [0.2, 4.6, -0.8] },
  { id: 'hros', name: 'HROS', role: 'Проект', type: 'project', strength: 86, pos: [0, -4.5, 0.8] }
];

const relations = {
  me: 'Центральный узел личной вселенной.',
  snezha: 'Любовь, близость и совместная жизнь.',
  daughter: 'Отцовство, забота и передача опыта.',
  boris: 'Преемственность, память и род.',
  marins: 'Созидание, лидерство и профессия.',
  hros: 'Исследование отношений, система и наследие.'
};

const colors = { self: 0x8fe9ff, family: 0xc895ff, legacy: 0xffcc85, work: 0x79a9ff, project: 0x6fffc0 };
const app = document.querySelector('#app');

app.innerHTML = `
  <main class="shell">
    <header class="topbar glass">
      <div class="brand"><span></span><div><b>HROS</b><small>Human Relationship Operating System</small></div></div>
      <nav><button class="active">Вселенная</button><button>Аватар</button><button>Моменты</button></nav>
      <button id="reset" class="primary">Вернуть камеру</button>
    </header>
    <section class="workspace">
      <aside class="panel glass">
        <span class="eyebrow">АВАТАР</span><h1>Михаил</h1><p>Живой аватар личности</p>
        <div class="card"><span>РАБОЧЕЕ ЯДРО</span><p>Создавать совместные моменты и проживать настоящую жизнь вместе.</p></div>
        <h2>Характеристики</h2>
        ${['Совместность','Близость','Создание моментов','Память','Передача опыта'].map((x,i)=>`<div class="trait"><span>${x}</span><i style="--v:${98-i*3}%"></i><b>${98-i*3}</b></div>`).join('')}
      </aside>
      <section class="stage"><div id="three"></div><div id="labels"></div><div class="hud">Живая карта отношений</div></section>
      <aside class="panel glass">
        <span class="eyebrow">ВЫБРАННЫЙ УЗЕЛ</span><h2 id="selectedName">Михаил</h2><p id="selectedRole">Я</p>
        <div class="card"><span>СВЯЗЬ</span><p id="selectedText">${relations.me}</p></div>
        <h2>Граф</h2><div id="list"></div>
      </aside>
    </section>
    <section class="timeline glass"><span class="eyebrow">ЛЕНТА МОМЕНТОВ</span><div class="moments"><article><b>01</b><span>Детство</span><h3>Семейная преемственность</h3></article><article><b>02</b><span>Настоящее</span><h3>Жизнь со Снежей</h3></article><article><b>03</b><span>2026</span><h3>Создание HROS</h3></article></div></section>
  </main>`;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050914, 0.035);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 2, 15);
const mount = document.querySelector('#three');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;
controls.minDistance = 5;
controls.maxDistance = 28;
scene.add(new THREE.AmbientLight(0x8397ff, 1.4));
const key = new THREE.PointLight(0x7ae7ff, 75, 25); key.position.set(2, 4, 7); scene.add(key);
const fill = new THREE.PointLight(0xb283ff, 55, 22); fill.position.set(-6, -3, 2); scene.add(fill);

const starPositions = [];
for (let i = 0; i < 900; i++) {
  const r = 12 + Math.random() * 30;
  const t = Math.random() * Math.PI * 2;
  const u = Math.acos(2 * Math.random() - 1);
  starPositions.push(r*Math.sin(u)*Math.cos(t), r*Math.sin(u)*Math.sin(t), r*Math.cos(u));
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x8799cf, size: 0.04, transparent: true, opacity: 0.58 }));
scene.add(stars);

const meshes = [];
people.slice(1).forEach((p) => {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(p.pos[0]/2, p.pos[1]/2 + 0.4, 1), new THREE.Vector3(...p.pos));
  const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.025, 6, false), new THREE.MeshBasicMaterial({ color: 0x78cfff, transparent: true, opacity: 0.35 }));
  scene.add(line);
});

people.forEach((p, index) => {
  const group = new THREE.Group();
  group.position.set(...p.pos);
  const size = index === 0 ? 1.05 : 0.5 + p.strength / 300;
  const color = colors[p.type];
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 2), new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: index === 0 ? 1.7 : 0.65, roughness: 0.25, metalness: 0.18, transparent: true, opacity: 0.9, clearcoat: 1 }));
  core.userData.id = p.id;
  group.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 1.35, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }));
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);
  scene.add(group);
  meshes.push({ p, group, core });
});

const labels = document.querySelector('#labels');
labels.innerHTML = people.map(p => `<button data-id="${p.id}"><b>${p.name}</b><span>${p.role}</span></button>`).join('');
const list = document.querySelector('#list');
list.innerHTML = people.map(p => `<button data-id="${p.id}"><span class="dot ${p.type}"></span><span><b>${p.name}</b><small>${p.role}</small></span><em>${p.strength}</em></button>`).join('');

function select(id) {
  const p = people.find(x => x.id === id);
  document.querySelector('#selectedName').textContent = p.name;
  document.querySelector('#selectedRole').textContent = p.role;
  document.querySelector('#selectedText').textContent = relations[id];
  document.querySelectorAll('[data-id]').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
  controls.target.set(...p.pos);
  camera.position.set(p.pos[0], p.pos[1] + 1.2, p.pos[2] + 7);
  controls.autoRotate = false;
}

document.querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => select(el.dataset.id)));
document.querySelector('#reset').addEventListener('click', () => { controls.target.set(0,0,0); camera.position.set(0,2,15); controls.autoRotate = true; });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(meshes.map(x => x.core))[0];
  if (hit) select(hit.object.userData.id);
});

function resize() {
  const r = mount.getBoundingClientRect();
  if (!r.width || !r.height) return;
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  renderer.setSize(r.width, r.height, false);
}
window.addEventListener('resize', resize);
resize();

function animate(t = 0) {
  requestAnimationFrame(animate);
  controls.update();
  stars.rotation.y += 0.00008;
  meshes.forEach(({ group }, i) => { group.rotation.y += i === 0 ? 0.002 : 0.005; group.scale.setScalar(1 + Math.sin(t * 0.0018 + i) * 0.035); });
  people.forEach((p) => {
    const el = labels.querySelector(`[data-id="${p.id}"]`);
    const v = new THREE.Vector3(...p.pos).project(camera);
    el.style.transform = `translate(${(v.x * 0.5 + 0.5) * mount.clientWidth}px, ${(-v.y * 0.5 + 0.5) * mount.clientHeight}px)`;
    el.style.opacity = v.z < 1 ? '1' : '0';
  });
  renderer.render(scene, camera);
}
animate();