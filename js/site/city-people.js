// Pedestrians for the Dubai map: proportioned figures in everyday and local dress who
// walk, jog, sit on benches, chat, wait at crossings and stroll hand in hand with their
// kids. The streets round the featured Marina rooftop get a denser crowd so it reads
// from up there. Each body part is one instanced mesh, posed every frame from a small
// procedural gait; heights are real (1 m = M world units, matching the map's scale).
export function createCityPeople({ THREE, world, g, m, fabric, signals = [], loops = [], lightNight = { value: 0 } }) {
  const M = 0.046, GROUND = 0.04, TAU = Math.PI * 2;
  let seed = 0x2f6b9d1;
  const R = () => { seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = list => list[Math.floor(R() * list.length)];
  const between = (a, b) => a + (b - a) * R();
  const free = (x, z) => fabric.isLand(x, z) && !(fabric.insideBuilding && fabric.insideBuilding(x, z));
  const clear = (x, z, r = 0, ignore = null) => !fabric.clearOfRoads || fabric.clearOfRoads(x, z, r, ignore);

  // ---- Looks ---------------------------------------------------------------
  const SKIN = ['#f1d3b8', '#e6c19c', '#d4a57e', '#b9845c', '#946240', '#6e4530'];
  const HAIR = ['#16110e', '#2a1f18', '#3d2a1d', '#5e4029', '#8a6238', '#c9a46c', '#8f8f8f'];
  const TOPS = ['#f4f3ef', '#1e2028', '#2f4e8c', '#b8423f', '#d7a840', '#4f8f6a', '#e9e2d3', '#6d4bc4', '#e98aa0', '#3a7ca5', '#7d7f88', '#c96f3b', '#9fc5e8'];
  const BOTTOMS = ['#2b3140', '#1c1d22', '#3c4f74', '#cbbfa7', '#58606e', '#7a6a55', '#e8e4da'];
  const SUIT = ['#22252e', '#2f3542', '#3b3f4a', '#4a4f5c'];
  const DRESS = ['#c94f6d', '#f2c14e', '#5b8bd1', '#2f2f35', '#e7dccb', '#7bb39a', '#b06ab3', '#ef8354'];
  const SCARF = ['#1b1b1f', '#d9c7b0', '#2d3a5a', '#b88a8a', '#efe9e1', '#6b5b73'];
  const SPORT = ['#ff5a5f', '#2ec4b6', '#ffbe0b', '#3a86ff', '#f72585', '#8ac926', '#f7f7f7', '#151515'];
  const KIDS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#1a9fff', '#ff9f1c', '#a06cd5', '#7bd389', '#f9f9f9'];
  const SHOES = ['#f2f2f2', '#1a1a1a', '#5a4632', '#c8c8c8', '#2c3e50'];

  function adultLook(sport = false) {
    const female = R() < 0.5, L = { female, kid: false, skin: pick(SKIN), hair: pick(HAIR), shoes: pick(SHOES), sleeves: 'short', legs: 'long', robe: null, head: null, backpack: null, width: between(0.92, 1.12) };
    L.height = female ? between(1.56, 1.74) : between(1.68, 1.9);
    L.hairStyle = female ? pick(['long', 'long', 'pony', 'bun', 'short']) : pick(['short', 'short', 'short', 'none']);
    if (sport) {
      Object.assign(L, { top: pick(SPORT), bottom: R() < 0.5 ? '#1c1d22' : pick(SPORT), sleeves: R() < 0.4 ? 'none' : 'short', legs: female && R() < 0.6 ? 'long' : 'shorts', shoes: pick(['#f2f2f2', '#ff5a5f', '#3a86ff', '#151515']) });
      if (female) L.hairStyle = 'pony';
      if (R() < 0.3) L.head = { kind: 'cap', color: pick(SPORT) };
      return L;
    }
    const r = R();
    if (!female) {
      if (r < 0.22) { // kandura and ghutra
        Object.assign(L, { top: '#f7f6f2', bottom: '#f7f6f2', sleeves: 'long', robe: { color: '#f7f6f2', len: 0.93 }, shoes: '#6b4a32', hairStyle: 'none' });
        L.head = { kind: 'ghutra', color: R() < 0.8 ? '#ffffff' : '#c8423e' };
      } else if (r < 0.37) Object.assign(L, { top: pick(SUIT), bottom: '', sleeves: 'long', shoes: '#141414' });
      else if (r < 0.55) Object.assign(L, { top: pick(['#f4f3ef', '#9fc5e8', '#e9e2d3', '#cfd8e3']), bottom: pick(['#2b3140', '#3c4f74', '#58606e']), sleeves: 'long' });
      else if (r < 0.72) { Object.assign(L, { top: pick(TOPS), bottom: pick(['#cbbfa7', '#3c4f74', '#e8e4da', '#58606e']), legs: 'shorts' }); if (R() < 0.45) L.head = { kind: 'cap', color: pick(TOPS) }; if (R() < 0.4) L.backpack = pick(['#2b3140', '#7a6a55', '#b8423f', '#1c1d22']); }
      else Object.assign(L, { top: pick(TOPS), bottom: pick(BOTTOMS) });
    } else {
      if (r < 0.2) { // abaya and shayla
        Object.assign(L, { top: '#121216', bottom: '#121216', sleeves: 'long', robe: { color: '#121216', len: 0.93 }, hairStyle: 'none' });
        L.head = { kind: 'cover', color: '#121216' };
      } else if (r < 0.32) { // hijab with a long top and trousers
        Object.assign(L, { top: pick(['#e9e2d3', '#6d4bc4', '#2f4e8c', '#c96f3b', '#7bb39a']), bottom: pick(BOTTOMS), sleeves: 'long', hairStyle: 'none' });
        L.head = { kind: 'cover', color: pick(SCARF) };
      } else if (r < 0.52) { const c = pick(DRESS); Object.assign(L, { top: c, bottom: c, legs: 'skirt', robe: { color: c, len: between(0.45, 0.62) } }); }
      else if (r < 0.66) { const c = pick(DRESS); Object.assign(L, { top: pick(TOPS), bottom: c, legs: 'skirt', robe: { color: c, len: between(0.42, 0.55) } }); }
      else Object.assign(L, { top: pick(TOPS), bottom: pick(BOTTOMS), sleeves: R() < 0.5 ? 'short' : 'long' });
    }
    if (L.top && !L.bottom) L.bottom = L.top;
    if (L.legs === 'long' && L.bottom === '') L.bottom = L.top;
    return L;
  }
  function kidLook() {
    const female = R() < 0.5, c = pick(KIDS);
    const L = { female, kid: true, skin: pick(SKIN), hair: pick(HAIR.slice(0, 6)), shoes: pick(['#f2f2f2', '#ff5a5f', '#3a86ff', '#ffbe0b']), sleeves: 'short', robe: null, head: null, backpack: null, width: between(0.95, 1.08) };
    L.height = between(1.0, 1.35);
    L.hairStyle = female ? pick(['pony', 'long', 'bun']) : 'short';
    if (female && R() < 0.55) Object.assign(L, { top: c, bottom: c, legs: 'skirt', robe: { color: c, len: 0.42 } });
    else Object.assign(L, { top: c, bottom: pick(['#3c4f74', '#cbbfa7', '#2b3140', pick(KIDS)]), legs: R() < 0.6 ? 'shorts' : 'long' });
    if (R() < 0.25) L.head = { kind: 'cap', color: pick(KIDS) };
    return L;
  }

  // ---- Population ------------------------------------------------------------
  const people = [], benches = [];
  const taken = new Set(), cell = 0.07;
  const key = (x, z) => `${Math.floor(x / cell)}:${Math.floor(z / cell)}`;
  const isTaken = (x, z) => taken.has(key(x, z));
  const take = (x, z) => taken.add(key(x, z));
  const add = (look, motion) => { const p = { look, ...motion, phase: motion.phase ?? R() * TAU }; people.push(p); take(p.x, p.z); return p; };
  const lineOk = (x, z, dx, dz, span, ignore) => [-1, -0.5, 0, 0.5, 1].every(k => { const px = x + dx * span * k, pz = z + dz * span * k; return free(px, pz) && clear(px, pz, 0.01, ignore); });

  // Kerb walkers along the city arteries (the same strips the old figures used).
  (fabric.sidewalks || []).forEach((walk, route) => {
    const length = walk.curve.getLength(), count = Math.min(40, Math.floor(length / 0.6));
    for (let i = 0; i < count; i++) {
      const t = Math.min(0.999, (i + 0.5 + R() * 0.4) / count), p = walk.curve.getPointAt(t), d = walk.curve.getTangentAt(t);
      const span = between(0.4, 0.9), first = (i + route) % 2 ? 1 : -1;
      for (const side of [first, -first]) {
        const x = p.x - d.z * walk.offset * side, z = p.z + d.x * walk.offset * side;
        if (!isTaken(x, z) && lineOk(x, z, d.x, d.z, span, walk.entry)) {
          const jog = R() < 0.12;
          add(jog ? adultLook(true) : adultLook(), { kind: jog ? 'jog' : 'walk', x, z, dx: d.x, dz: d.z, span, speed: jog ? between(2.5, 3.3) : between(1.1, 1.5) });
          break;
        }
      }
    }
  });
  // The Burj Khalifa plaza: a slow loop between the podium and the plaza edge.
  if (fabric.burjPlaza) {
    const [bx, bz, rx, rz] = fabric.burjPlaza;
    for (let i = 0; i < 80; i++) {
      const r = 0.86 + R() * 0.16, dir = i % 3 ? 1 : -1;
      add(i % 9 === 4 ? kidLook() : adultLook(), { kind: 'ring', x: bx, z: bz, rx: rx * r, rz: rz * r, dir, speed: between(0.9, 1.35), phase: i / 80 * TAU + R() * 0.1 });
    }
  }
  // Beach walks follow the shoreline a step inland; a share of them are runners.
  (fabric.beachWalks || []).forEach(walk => {
    const pts = walk.map(([x, z]) => new THREE.Vector3(x, GROUND, z)); if (pts.length < 2) return;
    const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), length = path.getLength(), count = Math.min(50, Math.floor(length / 0.45));
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count, p = path.getPointAt(u), d = path.getTangentAt(u);
      for (const s of [0.18, -0.18]) {
        const x = p.x - d.z * s, z = p.z + d.x * s;
        if (free(x, z) && !isTaken(x, z)) {
          const jog = R() < 0.3;
          add(jog ? adultLook(true) : (R() < 0.15 ? kidLook() : adultLook()), { kind: jog ? 'jog' : 'walk', x, z, dx: d.x, dz: d.z, span: jog ? between(1, 1.8) : between(0.5, 1.1), speed: jog ? between(2.4, 3.2) : between(1, 1.4) });
          break;
        }
      }
    }
  });
  // People waiting at the traffic-light corners.
  signals.forEach(sig => {
    for (let k = 0; k < 4; k++) {
      const a = sig.ha + Math.PI / 4 + k * Math.PI / 2, r = Math.max(loops[sig.a]?.line.half || 0.2, loops[sig.b]?.line.half || 0.2) + 0.2;
      for (let n = 0; n < 2; n++) {
        const x = sig.x + Math.sin(a) * (r + n * 0.09), z = sig.z + Math.cos(a) * (r + n * 0.09) + n * 0.07;
        if (free(x, z) && clear(x, z, -0.02) && R() > 0.35) add(adultLook(), { kind: 'idle', x, z, heading: a + Math.PI + between(-0.3, 0.3), gesture: R() < 0.2 });
      }
    }
  });

  // The Marina blocks below the featured rooftop: both kerbs and the open ground round the
  // tower base get a fuller street life, so it reads from up on the terrace.
  // populate() drops one small scene at (x, z): a walker, a jogger, a family, a bench or a
  // chat. (dx, dz) is the walking direction; (nx, nz) points away from the road or path.
  function populate(x, z, dx, dz, nx, nz, odds) {
    const roll = R();
    if (roll < odds[0]) {
      const span = between(0.25, 0.6);
      if (!lineOk(x, z, dx, dz, span)) return 0;
      add(R() < 0.1 ? kidLook() : adultLook(), { kind: 'walk', x, z, dx, dz, span, speed: between(1.05, 1.5) });
      return 1;
    }
    if (roll < odds[1]) {
      const span = between(0.9, 1.6);
      if (!lineOk(x, z, dx, dz, span)) return 0;
      add(adultLook(true), { kind: 'jog', x, z, dx, dz, span, speed: between(2.5, 3.4) });
      return 1;
    }
    if (roll < odds[2]) {
      // A parent (sometimes two) with one or two kids, holding hands, at kid pace.
      const span = between(0.35, 0.7);
      if (!lineOk(x, z, dx, dz, span)) return 0;
      const phase = R() * TAU, speed = between(0.85, 1.1);
      const lead = add(adultLook(), { kind: 'walk', x, z, dx, dz, span, speed, phase, holdsKid: true });
      const kids = R() < 0.4 ? 2 : 1;
      for (let k = 0; k < kids; k++) {
        const lat = k === 0 ? -0.027 : 0.027;
        add(kidLook(), { kind: 'walk', x: x + nx * lat, z: z + nz * lat, dx, dz, span, speed, phase, holds: lead, ox: nx * lat, oz: nz * lat });
      }
      let placed = 1 + kids;
      if (R() < 0.35) { const lat = 0.03 * (kids === 2 ? 2 : 1); add(adultLook(), { kind: 'walk', x: x + nx * lat, z: z + nz * lat, dx, dz, span, speed, phase }); placed++; }
      return placed;
    }
    if (roll < odds[3]) {
      // A bench facing back toward the road or path, with nobody, one or two people on it.
      const heading = Math.atan2(-nx, -nz), ex = -nz * 0.04, ez = nx * 0.04;
      if (!free(x + ex, z + ez) || !free(x - ex, z - ez) || isTaken(x + ex, z + ez) || isTaken(x - ex, z - ez)) return 0;
      benches.push({ x, z, heading }); take(x + ex, z + ez); take(x - ex, z - ez);
      const sitters = R() < 0.2 ? 0 : R() < 0.55 ? 1 : 2;
      const slots = sitters === 2 ? [-0.42, 0.42] : sitters === 1 ? [between(-0.4, 0.4)] : [];
      const c = Math.cos(heading), sn = Math.sin(heading);
      for (const slot of slots) add(R() < 0.1 ? kidLook() : adultLook(), { kind: 'sit', x: x + (c * slot + sn * -0.1) * M, z: z + (-sn * slot + c * -0.1) * M, heading, gesture: R() < 0.3 });
      return slots.length;
    }
    if (roll < odds[4]) {
      // Two people stopped for a chat.
      const h = Math.atan2(dx, dz);
      add(adultLook(), { kind: 'idle', x: x + dx * 0.025, z: z + dz * 0.025, heading: h + Math.PI + between(-0.4, 0.4), gesture: true });
      add(adultLook(), { kind: 'idle', x: x - dx * 0.025, z: z - dz * 0.025, heading: h + between(-0.4, 0.4), gesture: R() < 0.5 });
      return 2;
    }
    return 0;
  }
  const roof = (fabric.roundedTowers || []).find(t => t.featured);
  if (roof && fabric.trafficLines) {
    let budget = 380;
    for (const line of fabric.trafficLines.filter(l => l.nearRooftop)) {
      const pts = line.points;
      for (let s = 0; s < pts.length - 1 && budget > 0; s++) {
        const [ax, az] = pts[s], [bx, bz] = pts[s + 1], segLen = Math.hypot(bx - ax, bz - az);
        if (segLen < 1e-4) continue;
        const dx = (bx - ax) / segLen, dz = (bz - az) / segLen;
        for (let d = 0.08; d < segLen && budget > 0; d += 0.16) {
          const px = ax + dx * d, pz = az + dz * d;
          if (Math.hypot(px - roof.x, pz - roof.z) > 10.5) continue;
          for (const side of [-1, 1]) {
            const off = line.half + 0.06 + R() * 0.05, x = px - dz * off * side, z = pz + dx * off * side;
            if (isTaken(x, z) || !free(x, z) || !clear(x, z, 0.02)) continue;
            budget -= populate(x, z, dx, dz, -dz * side, dx * side, [0.4, 0.48, 0.56, 0.63, 0.69]);
          }
        }
      }
    }
    // Plazas and promenades round the tower base, with walkers heading every which way.
    budget += 260;
    for (let tries = 0; tries < 3000 && budget > 0; tries++) {
      const a = R() * TAU, r = 0.5 + Math.sqrt(R()) * 7.5, x = roof.x + Math.sin(a) * r, z = roof.z + Math.cos(a) * r;
      if (isTaken(x, z) || !free(x, z) || !clear(x, z, 0.05)) continue;
      const h = R() * TAU, dx = Math.sin(h), dz = Math.cos(h);
      budget -= populate(x, z, dx, dz, dz, -dx, [0.42, 0.5, 0.6, 0.7, 0.8]);
    }
  }
  const P = Math.max(1, people.length);

  // ---- Geometry (metres; each part's pivot is its joint) --------------------
  const lathe = (profile, seg, zScale = 1) => { const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); geo.scale(1, 1, zScale); geo.computeVertexNormals(); return geo; };
  const limb = (r0, r1, len) => { const geo = new THREE.CylinderGeometry(r0, r1, len, 6, 1, true); geo.translate(0, -len / 2, 0); return geo; };
  const ball = (rx, ry, rz, cx = 0, cy = 0, cz = 0, ws = 8, hs = 6) => { const geo = new THREE.SphereGeometry(1, ws, hs); geo.scale(rx, ry, rz); geo.translate(cx, cy, cz); return geo; };
  const cap = (rx, ry, rz, cx, cy, cz, theta) => { const geo = new THREE.SphereGeometry(1, 8, 4, 0, TAU, 0, theta); geo.scale(rx, ry, rz); geo.translate(cx, cy, cz); return geo; };
  function merge(list) {
    const pos = [], nor = [];
    for (const src of list) { const geo = src.index ? src.toNonIndexed() : src; pos.push(...geo.attributes.position.array); nor.push(...geo.attributes.normal.array); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return out;
  }
  const geo = {
    torso: lathe([[0, 0], [0.145, 0], [0.15, 0.1], [0.158, 0.22], [0.178, 0.35], [0.19, 0.43], [0.165, 0.5], [0.09, 0.545], [0, 0.55]], 7, 0.6),
    pelvis: lathe([[0, 0.02], [0.152, 0.02], [0.166, -0.07], [0.152, -0.15], [0.1, -0.205], [0, -0.21]], 7, 0.68),
    neck: limb(0.048, 0.052, 0.13).translate(0, 0.13, 0),
    head: ball(0.088, 0.112, 0.1, 0, 0, 0.004, 8, 6),
    uArm: limb(0.047, 0.04, 0.3),
    fArm: limb(0.039, 0.032, 0.26),
    hand: ball(0.035, 0.055, 0.022, 0, -0.045, 0, 5, 3),
    thigh: limb(0.078, 0.058, 0.45),
    shin: limb(0.055, 0.04, 0.44),
    foot: ball(0.048, 0.036, 0.125, 0, -0.04, 0.045, 6, 3),
    robe: lathe([[0, 0.02], [0.168, 0.02], [0.2, -0.3], [0.245, -0.7], [0.28, -1.0], [0, -1.0]], 8, 0.78),
    hairShort: cap(0.097, 0.12, 0.108, 0, 0.012, -0.008, Math.PI * 0.56),
    hairLong: merge([cap(0.098, 0.122, 0.11, 0, 0.012, -0.008, Math.PI * 0.58), ball(0.095, 0.17, 0.055, 0, -0.085, -0.065, 8, 5)]),
    hairBun: merge([cap(0.097, 0.12, 0.108, 0, 0.012, -0.008, Math.PI * 0.56), ball(0.048, 0.045, 0.045, 0, 0.07, -0.095, 6, 4)]),
    hairPony: merge([cap(0.097, 0.12, 0.108, 0, 0.012, -0.008, Math.PI * 0.56), ball(0.035, 0.11, 0.035, 0, -0.04, -0.115, 6, 4)]),
    cover: merge([ball(0.108, 0.13, 0.112, 0, 0.012, -0.016, 10, 7), lathe([[0.08, -0.07], [0.15, -0.17], [0.215, -0.24], [0, -0.25]], 10, 0.75)]),
    ghutra: merge([ball(0.104, 0.126, 0.11, 0, 0.012, -0.014, 10, 7), ball(0.13, 0.17, 0.04, 0, -0.17, -0.095, 8, 5)]),
    cap: merge([cap(0.1, 0.1, 0.105, 0, 0.03, -0.004, Math.PI * 0.5), new THREE.CylinderGeometry(0.075, 0.075, 0.012, 8).scale(1, 1, 1.15).translate(0, 0.035, 0.09)]),
    backpack: new THREE.BoxGeometry(0.27, 0.36, 0.13),
    benchWood: merge([new THREE.BoxGeometry(1.6, 0.055, 0.42).translate(0, 0.44, 0), new THREE.BoxGeometry(1.6, 0.34, 0.045).rotateX(-0.18).translate(0, 0.7, -0.22)]),
    benchMetal: merge([new THREE.BoxGeometry(0.06, 0.44, 0.4).translate(-0.68, 0.22, 0), new THREE.BoxGeometry(0.06, 0.44, 0.4).translate(0.68, 0.22, 0)]),
    shadow: new THREE.CircleGeometry(0.32, 12).rotateX(-Math.PI / 2),
  };
  Object.values(geo).forEach(g);

  // ---- Instanced parts ---------------------------------------------------------
  // At night the moon alone leaves dark clothes invisible from a rooftop, so each material
  // adds a little of its own colour back as emission, scaled by the site's night switch.
  const nightLift = mat => {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uLightNight = lightNight;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLightNight;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.28 * uLightNight;');
    };
    mat.customProgramCacheKey = () => 'people-night-lift';
    return mat;
  };
  const cloth = m(nightLift(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0 })));
  const skinMat = m(nightLift(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0 })));
  const hairMat = m(nightLift(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0 })));
  const color = new THREE.Color();
  function partMesh(geometry, material, members) {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, members.length));
    mesh.count = members.length; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, members.length) * 3), 3);
    world.add(mesh);
    return mesh;
  }
  const everyone = people.map((_, i) => i);
  const parts = {};
  const base = (name, geometry, material, colorOf) => {
    const mesh = partMesh(geometry, material, everyone);
    people.forEach((p, i) => mesh.setColorAt(i, color.set(colorOf(p.look))));
    parts[name] = { mesh, members: everyone };
  };
  const skin = L => L.skin, top = L => L.top, bottom = L => L.bottom;
  const sleeveUpper = L => L.sleeves === 'none' ? L.skin : L.top;
  const sleeveLower = L => L.sleeves === 'long' ? L.top : L.skin;
  const thighColor = L => L.robe && L.robe.len > 0.8 ? L.robe.color : L.legs === 'skirt' ? L.skin : L.bottom;
  const shinColor = L => L.robe && L.robe.len > 0.8 ? L.robe.color : L.legs === 'long' ? L.bottom : L.skin;
  base('torso', geo.torso, cloth, top); base('pelvis', geo.pelvis, cloth, L => L.robe ? L.robe.color : L.bottom);
  base('neck', geo.neck, skinMat, skin); base('head', geo.head, skinMat, skin);
  base('uArmL', geo.uArm, cloth, sleeveUpper); base('uArmR', geo.uArm, cloth, sleeveUpper);
  base('fArmL', geo.fArm, cloth, sleeveLower); base('fArmR', geo.fArm, cloth, sleeveLower);
  base('handL', geo.hand, skinMat, skin); base('handR', geo.hand, skinMat, skin);
  base('thighL', geo.thigh, cloth, thighColor); base('thighR', geo.thigh, cloth, thighColor);
  base('shinL', geo.shin, cloth, shinColor); base('shinR', geo.shin, cloth, shinColor);
  base('footL', geo.foot, cloth, L => L.shoes); base('footR', geo.foot, cloth, L => L.shoes);
  const optional = (name, geometry, material, test, colorOf) => {
    const members = []; people.forEach((p, i) => { if (test(p.look)) members.push(i); });
    if (!members.length) return;
    const mesh = partMesh(geometry, material, members);
    members.forEach((pi, k) => mesh.setColorAt(k, color.set(colorOf(people[pi].look))));
    parts[name] = { mesh, members };
  };
  optional('hairShort', geo.hairShort, hairMat, L => L.hairStyle === 'short' && !L.head, L => L.hair);
  optional('hairCapped', geo.hairShort, hairMat, L => L.head && L.head.kind === 'cap' && L.hairStyle !== 'none', L => L.hair);
  optional('hairLong', geo.hairLong, hairMat, L => L.hairStyle === 'long' && !(L.head && L.head.kind !== 'cap'), L => L.hair);
  optional('hairBun', geo.hairBun, hairMat, L => L.hairStyle === 'bun' && !L.head, L => L.hair);
  optional('hairPony', geo.hairPony, hairMat, L => L.hairStyle === 'pony' && !(L.head && L.head.kind !== 'cap'), L => L.hair);
  optional('cover', geo.cover, cloth, L => L.head && L.head.kind === 'cover', L => L.head.color);
  optional('ghutra', geo.ghutra, cloth, L => L.head && L.head.kind === 'ghutra', L => L.head.color);
  optional('cap', geo.cap, cloth, L => L.head && L.head.kind === 'cap', L => L.head.color);
  optional('robe', geo.robe, cloth, L => !!L.robe, L => L.robe.color);
  optional('backpack', geo.backpack, cloth, L => !!L.backpack, L => L.backpack);
  // Contact shadows keep every figure on the pavement.
  const shadowMat = m(new THREE.MeshBasicMaterial({ color: '#05070f', transparent: true, opacity: 0.32, depthWrite: false }));
  const shadows = new THREE.InstancedMesh(geo.shadow, shadowMat, P); shadows.count = people.length; shadows.frustumCulled = false; shadows.renderOrder = 1;
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(shadows);
  // Benches are static.
  const woodMat = m(new THREE.MeshStandardMaterial({ color: '#8b5e3c', roughness: 0.8 })), metalMat = m(new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.5, metalness: 0.5 }));
  const benchWood = new THREE.InstancedMesh(geo.benchWood, woodMat, Math.max(1, benches.length)), benchMetal = new THREE.InstancedMesh(geo.benchMetal, metalMat, Math.max(1, benches.length));
  benchWood.count = benchMetal.count = benches.length;
  const bm = new THREE.Matrix4(), bq = new THREE.Quaternion(), bs = new THREE.Vector3(M, M, M), bp = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
  benches.forEach((b, i) => { bq.setFromAxisAngle(yAxis, b.heading); bp.set(b.x, GROUND, b.z); bm.compose(bp, bq, bs); benchWood.setMatrixAt(i, bm); benchMetal.setMatrixAt(i, bm); });
  world.add(benchWood, benchMetal);

  // ---- Posing ----------------------------------------------------------------
  // Writes one part: world = T(person) * Ry(heading) * S(scale) * T(joint) * Rz(b) * Rx(a) * S(part).
  let hc = 1, hs = 0, ps = 1, px = 0, py = 0, pz = 0;
  function put(name, i, jx, jy, jz, a, b, sx = 1, sy = 1, sz = 1) {
    const part = parts[name]; if (!part) return;
    const k = part.members === everyone ? i : part.index.get(i); if (k === undefined) return;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const m00 = hc * cb, m01 = -hc * sb * ca + hs * sa, m02 = hc * sb * sa + hs * ca;
    const m10 = sb, m11 = cb * ca, m12 = -cb * sa;
    const m20 = -hs * cb, m21 = hs * sb * ca + hc * sa, m22 = -hs * sb * sa + hc * ca;
    const e = part.mesh.instanceMatrix.array, o = k * 16, x = ps * sx, y = ps * sy, z = ps * sz;
    e[o] = m00 * x; e[o + 1] = m10 * x; e[o + 2] = m20 * x; e[o + 3] = 0;
    e[o + 4] = m01 * y; e[o + 5] = m11 * y; e[o + 6] = m21 * y; e[o + 7] = 0;
    e[o + 8] = m02 * z; e[o + 9] = m12 * z; e[o + 10] = m22 * z; e[o + 11] = 0;
    e[o + 12] = px + ps * (hc * jx + hs * jz); e[o + 13] = py + ps * jy; e[o + 14] = pz + ps * (-hs * jx + hc * jz); e[o + 15] = 1;
  }
  for (const part of Object.values(parts)) if (part.members !== everyone) { part.index = new Map(); part.members.forEach((pi, k) => part.index.set(pi, k)); }

  const pose = { tL: 0, kL: 0, tR: 0, kR: 0, aL: 0, eL: 0, aR: 0, eR: 0, bL: 0.07, bR: -0.07, lean: 0.03, bounce: 0, sit: false, robeSway: 0 };
  function gait(p, t, kind, cycle) {
    const s = Math.sin(cycle), c = Math.cos(cycle), robe = p.look.robe && p.look.robe.len > 0.8;
    Object.assign(pose, { bL: 0.07, bR: -0.07, sit: false, bounce: 0, robeSway: 0 });
    if (kind === 'run') {
      const A = 0.78;
      Object.assign(pose, { tL: -A * s - 0.1, tR: A * s - 0.1, kL: 0.35 + 1.25 * Math.max(0, c), kR: 0.35 + 1.25 * Math.max(0, -c), aL: 0.7 * s, aR: -0.7 * s, eL: 1.45, eR: 1.45, lean: 0.2, bounce: 0.05 * Math.abs(s) });
    } else if (kind === 'walk') {
      const A = robe ? 0.2 : p.look.kid ? 0.46 : 0.4;
      Object.assign(pose, { tL: -A * s, tR: A * s, kL: 0.08 + 0.6 * Math.max(0, c), kR: 0.08 + 0.6 * Math.max(0, -c), aL: 0.34 * s, aR: -0.34 * s, eL: 0.22, eR: 0.22, lean: 0.035, robeSway: 0.05 * s });
    } else if (kind === 'sit') {
      Object.assign(pose, { tL: -1.5, tR: -1.45, kL: 1.5, kR: 1.42, aL: -0.32, aR: -0.3, eL: 0.85, eR: 0.9, lean: -0.08, sit: true });
      if (p.gesture) { pose.aR = -0.55; pose.eR = 1.3 + 0.25 * Math.sin(t * 2.3 + p.phase); }
    } else {
      const sway = Math.sin(t * 0.7 + p.phase);
      Object.assign(pose, { tL: 0.02 * sway, tR: -0.02 * sway, kL: 0.04 + 0.04 * Math.max(0, sway), kR: 0.04 + 0.04 * Math.max(0, -sway), aL: 0.04, aR: 0.04, eL: 0.18, eR: 0.18, lean: 0.02 });
      if (p.gesture) { pose.aR = -0.35 + 0.12 * Math.sin(t * 1.7 + p.phase); pose.eR = 1.15 + 0.3 * Math.sin(t * 2.6 + p.phase); }
    }
  }
  function writePerson(p, i, t) {
    const L = p.look;
    let x = p.x, z = p.z, heading = p.heading || 0, kind = 'stand', cycle = 0;
    if (p.kind === 'walk' || p.kind === 'jog') {
      const v = p.speed * M, period = 4 * p.span / v, f = ((t / period + p.phase / TAU) % 1 + 1) % 1, dir = f < 0.5 ? 1 : -1;
      const u = f < 0.5 ? -1 + 4 * f : 3 - 4 * f;
      x += p.dx * p.span * u; z += p.dz * p.span * u;
      heading = Math.atan2(p.dx * dir, p.dz * dir);
      kind = p.kind === 'jog' ? 'run' : 'walk';
      const stride = (kind === 'run' ? 2.3 : 1.45) * L.height / 1.75;
      cycle = t * p.speed / stride * TAU + p.phase * 3;
    } else if (p.kind === 'ring') {
      const a = p.phase + t * p.speed * M / ((p.rx + p.rz) / 2) * p.dir;
      x = p.x + Math.sin(a) * p.rx; z = p.z + Math.cos(a) * p.rz;
      heading = a + (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      kind = 'walk'; cycle = t * p.speed / (1.45 * L.height / 1.75) * TAU + p.phase * 3;
    } else if (p.kind === 'sit') kind = 'sit';
    gait(p, t, kind, cycle);
    // Hand in hand: a kid reaches up to the parent walking beside them.
    if (p.holds) {
      // Parent offset · the kid's own left (+X turned by the heading) picks the hand.
      const parentOnLeft = -p.ox * Math.cos(heading) + p.oz * Math.sin(heading) > 0;
      if (parentOnLeft) { pose.aL = -0.15; pose.eL = 0.05; pose.bL = 0.55; } else { pose.aR = -0.15; pose.eR = 0.05; pose.bR = -0.55; }
    } else if (p.holdsKid) { pose.aR = -0.08; pose.eR = 0.05; pose.bR = -0.22; pose.aL = -0.08; pose.eL = 0.05; pose.bL = 0.22; }

    const kidHead = L.kid ? 1.22 : 1;
    hc = Math.cos(heading); hs = Math.sin(heading); ps = M * L.height / 1.75; px = x; pz = z;
    const T = 0.45, S = 0.44, ANK = 0.075;
    const extL = T * Math.cos(pose.tL) + S * Math.cos(pose.tL + pose.kL) + ANK, extR = T * Math.cos(pose.tR) + S * Math.cos(pose.tR + pose.kR) + ANK;
    const hipY = pose.sit ? 0.53 * 1.75 / L.height : Math.max(extL, extR) + pose.bounce;
    py = GROUND;
    const w = L.width, fem = L.female, hipX = 0.095 * w;
    // Legs.
    for (const [side, t0, k0, thigh, shin, foot] of [[1, pose.tL, pose.kL, 'thighL', 'shinL', 'footL'], [-1, pose.tR, pose.kR, 'thighR', 'shinR', 'footR']]) {
      const hx = side * hipX, kx = hx, ky = hipY - T * Math.cos(t0), kz = -T * Math.sin(t0);
      const ay = ky - S * Math.cos(t0 + k0), az = kz - S * Math.sin(t0 + k0);
      put(thigh, i, hx, hipY, 0, t0, 0, w, 1, w); put(shin, i, kx, ky, kz, t0 + k0, 0); put(foot, i, kx, ay, az, 0, 0);
    }
    // Hips, torso, head.
    const waistY = hipY + 0.06, lean = pose.lean, cl = Math.cos(lean), sl = Math.sin(lean);
    put('pelvis', i, 0, waistY, 0, 0, 0, w * (fem ? 1.06 : 1), 1, w * (fem ? 1.05 : 1));
    put('robe', i, 0, waistY, 0, pose.robeSway, 0, w, L.robe ? L.robe.len : 1, w);
    put('torso', i, 0, waistY, 0, lean, 0, w * (fem ? 0.9 : 1), 1, w * (fem ? 0.97 : 1));
    put('backpack', i, 0, waistY + 0.3 * cl, -0.14 * cl + 0.3 * sl, lean, 0);
    const nx = 0, ny = waistY + 0.5 * cl, nz = 0.5 * sl;
    put('neck', i, nx, ny, nz, lean, 0);
    const hy = waistY + 0.66 * cl, hz = 0.66 * sl + 0.01;
    for (const name of ['head', 'hairShort', 'hairCapped', 'hairLong', 'hairBun', 'hairPony', 'cover', 'ghutra', 'cap']) {
      put(name, i, 0, hy, hz, lean * 0.5, 0, kidHead, kidHead, kidHead);
    }
    // Arms (the shoulders ride on the leaning torso).
    const shY = waistY + 0.44 * cl, shZ = 0.44 * sl, shX = 0.19 * w * (fem ? 0.92 : 1);
    for (const [side, a0, e0, b0, ua, fa, hd] of [[1, pose.aL, pose.eL, pose.bL, 'uArmL', 'fArmL', 'handL'], [-1, pose.aR, pose.eR, pose.bR, 'uArmR', 'fArmR', 'handR']]) {
      const sx = side * shX, ca = Math.cos(a0), sa = Math.sin(a0), cb = Math.cos(b0), sb = Math.sin(b0);
      const ex = sx + 0.3 * sb * ca, ey = shY - 0.3 * cb * ca, ez = shZ - 0.3 * sa;
      const a1 = a0 - e0, c1 = Math.cos(a1), s1 = Math.sin(a1);
      const wx = ex + 0.26 * sb * c1, wy = ey - 0.26 * cb * c1, wz = ez - 0.26 * s1;
      put(ua, i, sx, shY, shZ, a0, b0); put(fa, i, ex, ey, ez, a1, b0); put(hd, i, wx, wy, wz, a1, b0);
    }
    // Contact shadow.
    const e = shadows.instanceMatrix.array, o = i * 16, r = ps * (pose.sit ? 1.3 : 1);
    e[o] = r; e[o + 1] = 0; e[o + 2] = 0; e[o + 3] = 0; e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0;
    e[o + 8] = 0; e[o + 9] = 0; e[o + 10] = r; e[o + 11] = 0; e[o + 12] = x; e[o + 13] = GROUND + 0.002; e[o + 14] = z; e[o + 15] = 1;
  }
  function update(time = 0) {
    const t = Number.isFinite(time) ? time : 0;
    for (let i = 0; i < people.length; i++) writePerson(people[i], i, t);
    for (const part of Object.values(parts)) part.mesh.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { count: people.length, benches: benches.length, update };
}
