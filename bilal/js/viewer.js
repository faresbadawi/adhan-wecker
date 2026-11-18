// 3D-Modell von Bilal mit dem echten Uhren-Code (WebAssembly) auf dem Display.
import * as THREE from 'three';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 480, H = 320;

export function start(stage, i18n) {
  const loading = document.getElementById('simLoading');
  const hint = document.getElementById('simHint');

  // ---------- Szene
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setClearColor(0, 0);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  stage.prepend(r.domElement);
  const sc = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  sc.environmentIntensity = 0.55;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.9));
  const key = new THREE.DirectionalLight(0xfff3df, 2.4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  sc.add(key, fill);
  const rim = new THREE.DirectionalLight(0xffd9a0, 1.6); sc.add(rim);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 500);
  cam.up.set(0, 0, 1);
  const oc = new OrbitControls(cam, r.domElement);
  oc.enableDamping = true;
  oc.enableZoom = false;   // Mausrad scrollt die Seite
  oc.enablePan = false;
  oc.autoRotate = true;
  oc.autoRotateSpeed = 0.6;
  oc.minPolarAngle = 0.35;
  oc.maxPolarAngle = 1.55;

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    r.setSize(width, height, false);
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- Display 480 x 320
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  const img = cx.createImageData(W, H);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const black = () => { cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H); tex.needsUpdate = true; };
  black();
  // sichtbare Fläche des 3,5"-Displays (73,44 x 48,96 mm), auf der schrägen Displayplatte
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.344, 4.896), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const N = new THREE.Vector3(0, 0.894427, 0.447214), UP = new THREE.Vector3(0, -0.447214, 0.894427), RT = new THREE.Vector3(-1, 0, 0);
  screen.matrixAutoUpdate = false;

  // ---------- Modell (Farben aus der 3MF: Gold metallisch, Displayplatte als schwarzes Glas)
  let model = null, first = true;
  function load(file) {
    new ThreeMFLoader().load(file, g => {
      g.traverse(o => {
        if (!o.isMesh) return;
        const ca = o.geometry.getAttribute('color');
        const c = (o.material.vertexColors && ca) ? new THREE.Color(ca.getX(0), ca.getY(0), ca.getZ(0)) : o.material.color.clone();
        const gold = c.r > 0.9 && c.g > 0.3 && c.g < 0.7 && c.b < 0.1;
        const dark = !gold && c.r < 0.05;
        o.material = new THREE.MeshPhysicalMaterial({ flatShading: true, color: gold ? 0xd9a53a : dark ? 0x020202 : c, metalness: gold ? 0.85 : 0, roughness: gold ? 0.26 : dark ? 0.5 : 0.5, clearcoat: gold ? 0 : dark ? 0.35 : 0.3, clearcoatRoughness: 0.3, envMapIntensity: dark ? 0.22 : 1, specularIntensity: dark ? 0.35 : 1 });
      });
      let disp = null;
      g.traverse(o => { if (/54/.test(o.name)) disp = o; });
      if (disp) disp.traverse(o => { if (o.isMesh) o.material = new THREE.MeshPhysicalMaterial({ flatShading: true, color: 0x030303, roughness: 0.08, metalness: 0.1, clearcoat: 1 }); });
      if (model) sc.remove(model);
      model = g;
      sc.add(g);
      const dc = new THREE.Box3().setFromObject(disp || g).getCenter(new THREE.Vector3());
      screen.matrix.makeBasis(RT, UP, N);
      screen.matrix.setPosition(dc.addScaledVector(N, 0.058));
      if (!screen.parent) sc.add(screen);
      const mc = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
      key.position.set(mc.x + 12, mc.y + 18, mc.z + 30); key.target.position.copy(mc); sc.add(key.target);
      fill.position.set(mc.x - 20, mc.y - 10, mc.z + 10); rim.position.set(mc.x - 6, mc.y - 30, mc.z + 14);
      if (first) {
        // hochkant (Handy) weiter weg, damit das ganze Gerät ins Bild passt
        const az = 0.5, el = 0.32, d = 38 * Math.max(1, 1.2 / cam.aspect);
        cam.position.set(mc.x + d * Math.cos(el) * Math.sin(az), mc.y + d * Math.cos(el) * Math.cos(az), mc.z + d * Math.sin(el));
        first = false;
      } else cam.position.add(mc.clone().sub(oc.target));
      oc.target.copy(mc);
      oc.update();
      loading.remove();
    });
  }
  load('assets/bilal-weiss.3mf');
  stage.querySelectorAll('.finish button').forEach(b => b.onclick = () => {
    stage.querySelectorAll('.finish button').forEach(x => x.classList.toggle('sel', x === b));
    load(b.dataset.f);
  });

  // ---------- Ein/Aus: jedes Einschalten startet Bilal neu (mit Startbildschirm)
  let sim = null, on = false, boot = 0, bootedAt = 0;
  let place = null, weather = null; // vom Besucher gewählter Ort und dessen Wetter, gilt auch nach Neustart
  const power = document.getElementById('power'), label = document.getElementById('powerLabel');
  const applyPlace = () => {
    if (!sim) return;
    if (place) sim.ccall('sim_set_location', null, ['number', 'number', 'number', 'string'], [place.lat, place.lng, place.off, place.name]);
    if (weather) sim.ccall('sim_set_weather', null, Array(15).fill('number'), weather);
  };
  async function powerOn() {
    const id = ++boot;
    const M = await window.BilalSim({ locateFile: f => 'sim/out/' + f });
    if (id !== boot) return;
    M.ccall('sim_init', null, ['string'], [i18n.lang()]);
    sim = M;
    bootedAt = performance.now();
    applyPlace();
  }
  function setPower(v) {
    on = v;
    power.classList.toggle('on', on);
    power.setAttribute('aria-pressed', on);
    label.dataset.t = on ? 'sim.off' : 'sim.on';
    label.textContent = i18n.t(label.dataset.t);
    if (on) { powerOn(); oc.autoRotate = false; }
    else { stopAzan(); boot++; sim = null; black(); }
  }
  power.onclick = () => setPower(!on);
  // Sprache gilt wie auf der Uhr nach einem Neustart
  i18n.onLang(() => { if (on) { stopAzan(); boot++; sim = null; black(); powerOn(); } });

  // ---------- Azan: Anzeige der Uhr und Ton (dieselben Stimmen wie in der Bilal-App)
  const VOICES = 'https://faresbadawi.github.io/adhan-wecker/azans/';
  const audio = new Audio();
  audio.preload = 'none';
  let azanOn = false;
  const azanBtn = document.getElementById('azanBtn'), voiceSel = document.getElementById('voice');
  const showAzanBtn = () => {
    azanBtn.classList.toggle('on', azanOn);
    const s = azanBtn.querySelector('span');
    s.dataset.t = azanOn ? 'sim.stop' : 'sim.azan';
    s.textContent = i18n.t(s.dataset.t);
  };
  function stopAzan() {
    if (!azanOn) return;
    azanOn = false;
    audio.pause();
    if (sim) sim.ccall('sim_azan', 'number', ['number', 'string'], [0, '']);
    showAzanBtn();
  }
  async function startAzan() {
    azanOn = true;
    showAzanBtn();
    if (!on) setPower(true);
    // warten, bis Bilal hochgefahren ist und der Startbildschirm vorbei ist
    while (azanOn && (!sim || performance.now() - bootedAt < 4200)) await new Promise(r => setTimeout(r, 150));
    if (!azanOn) return;
    const opt = voiceSel.selectedOptions[0];
    const next = sim.ccall('sim_azan', 'number', ['number', 'string'], [1, opt.textContent]);
    audio.src = VOICES + voiceSel.value + (next === 0 ? '_fajr' : '') + '.mp3'; // 0 = Fajr
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
  audio.onended = stopAzan;
  azanBtn.onclick = () => (azanOn ? stopAzan() : startAzan());
  voiceSel.onchange = () => { if (azanOn) { stopAzan(); startAzan(); } };

  // ---------- Ort des Besuchers: Gebetszeiten, Uhrzeit und Wetter wie bei einer echten Uhr dort
  const SKY = c => c === 0 ? 0 : c <= 2 ? 1 : c === 3 ? 2 : c <= 48 ? 3 : c <= 57 ? 4 : c <= 67 ? 5 : c <= 77 ? 6 : c <= 82 ? 5 : c <= 86 ? 6 : 7;
  async function setPlace(lat, lng, name) {
    const q = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3';
    const f = await fetch(q).then(r => r.json());
    const c = f.current, d = f.daily, R = Math.round;
    place = { lat, lng, off: f.utc_offset_seconds | 0, name: name.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 40) };
    weather = [c.temperature_2m, c.apparent_temperature, R(c.relative_humidity_2m), c.wind_speed_10m, SKY(c.weather_code),
      d.precipitation_probability_max?.[0] ?? -1,
      SKY(d.weather_code[0]), R(d.temperature_2m_max[0]), R(d.temperature_2m_min[0]),
      SKY(d.weather_code[1]), R(d.temperature_2m_max[1]), R(d.temperature_2m_min[1]),
      SKY(d.weather_code[2]), R(d.temperature_2m_max[2]), R(d.temperature_2m_min[2])];
    if (!on) setPower(true); else applyPlace();
  }

  // ---------- Berührung auf dem 3D-Display
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let touching = false;
  const hit = e => {
    const b = r.domElement.getBoundingClientRect();
    ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const h = ray.intersectObject(screen)[0];
    return h ? [Math.round(h.uv.x * (W - 1)), Math.round((1 - h.uv.y) * (H - 1))] : null;
  };
  r.domElement.addEventListener('pointerdown', e => {
    hint.style.opacity = 0;
    oc.autoRotate = false;
    const p = screen.parent && sim && hit(e);
    if (!p) return;
    touching = true;
    oc.enabled = false;
    sim._sim_touch(p[0], p[1], 1);
  }, true);
  addEventListener('pointermove', e => { if (touching && sim) { const p = hit(e); if (p) sim._sim_touch(p[0], p[1], 1); } });
  addEventListener('pointerup', e => {
    if (!touching) return;
    touching = false;
    oc.enabled = true;
    if (sim) { const p = hit(e) || [0, 0]; sim._sim_touch(p[0], p[1], 0); }
  });

  // Stadtsuche: Liste in der Sprache der Seite, auf der Uhr der lateinische Name (Schrift der Uhr)
  const input = document.getElementById('cityInput'), list = document.getElementById('cityList');
  const locBtn = document.getElementById('locBtn'), status = document.getElementById('cityStatus');
  const GEO = 'https://geocoding-api.open-meteo.com/v1/';
  const say = k => { status.dataset.t = k; status.textContent = k ? i18n.t(k) : ''; };
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { list.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`${GEO}search?name=${encodeURIComponent(q)}&count=6&language=${i18n.lang()}&format=json`).then(r => r.json());
        list.innerHTML = '';
        for (const c of r.results || []) {
          const li = document.createElement('li');
          li.textContent = [c.name, c.admin1, c.country].filter(Boolean).join(i18n.lang() === 'ar' ? '، ' : ', ');
          li.onclick = async () => {
            list.innerHTML = '';
            input.value = c.name;
            say('sim.loadingCity');
            try {
              const en = await fetch(`${GEO}get?id=${c.id}&language=en`).then(r => r.json()).catch(() => null);
              await setPlace(c.latitude, c.longitude, (en && en.name) || c.name);
              say('');
            } catch { say('sim.cityErr'); }
          };
          list.appendChild(li);
        }
      } catch { say('sim.cityErr'); }
    }, 300);
  });
  addEventListener('click', e => { if (!e.target.closest('.city')) list.innerHTML = ''; });
  locBtn.onclick = () => {
    if (!navigator.geolocation) return say('sim.cityErr');
    say('sim.loadingCity');
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      let name = 'My location';
      try {
        const g = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`).then(r => r.json());
        name = g.city || g.locality || name;
      } catch {}
      input.value = name;
      try { await setPlace(lat, lng, name); say(''); } catch { say('sim.cityErr'); }
    }, () => say('sim.locDenied'), { timeout: 10000 });
  };

  // ---------- Schleife (nur zeichnen, solange der Abschnitt sichtbar ist)
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
  (function loop() {
    requestAnimationFrame(loop);
    if (sim) {
      sim._sim_tick();
      if (sim._sim_dirty()) {
        const f = sim._sim_frame();
        img.data.set(sim.HEAPU8.subarray(f, f + W * H * 4));
        cx.putImageData(img, 0, 0);
        tex.needsUpdate = true;
      }
    }
    if (!visible) return;
    oc.update();
    r.render(sc, cam);
  })();
}
