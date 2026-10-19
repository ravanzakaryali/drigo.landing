// Mordecai & Rigby for the Marina rooftop: procedural, cel-shaded and built to the
// official model sheets. Same API as before: createRooftopDuo({THREE,g,m}) returns
// {root, update(time, reduced), joints, dispose()}. Character units are about metres
// (Mordecai is 2.1 tall); the caller scales the root to the terrace.
//
// Lighting: materials take the scene's own lights (night moon, purple rim, sky fill),
// so the pair sits in the city instead of glowing. The moon shadow is drawn by a
// small, self-contained silhouette pass onto a shadow-only terrace disc, because the
// city's key-light shadow map is far too coarse at rooftop scale and adding a second
// shadow light would cost every city material an extra shadow lookup.
export function createRooftopDuo({ THREE, g, m }) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const VA = a => new THREE.Vector3(a[0], a[1], a[2]);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const capS = (t, a) => t >= a ? 1 : Math.max(0.04, Math.sqrt(Math.max(0, 1 - (1 - t / a) ** 2)));
  const capE = (t, a) => capS(1 - t, a);
  const keys = (t, k) => {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return lerp(k[i - 1][1], k[i][1], u * u * (3 - 2 * u)); }
    return k[k.length - 1][1];
  };
  const curveOf = pts => new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? VA(p) : p), false, 'centripetal');

  // Colours sampled by eye from the official model sheets.
  const PAL = {
    mBlue: 0x4d94db, mBlueDark: 0x2e64a8, mPale: 0xdcebf8, mWhite: 0xf4f8fc, mBeak: 0x56565a, mBeakLow: 0x424246,
    mMouth: 0x3a1f2b, mTongue: 0xd86a80, mBlack: 0x1c1c20, mLeg: 0x4b4e58, mLegLine: 0x82868f,
    rBrown: 0x8c7055, rDark: 0x3e3c28, rLight: 0xbab2a5, rMouth: 0x5a2433, rTongue: 0xe07a8c, rNose: 0x151515, rTooth: 0xffffff,
    eye: 0xffffff, pupil: 0x111111,
  };
  const SHADOW_LAYER = 7;

  // Three hard cel bands; the scene's lights decide how bright each band is.
  const ramp = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;

  // Cel material with flat-colour markings mixed from a spatial function of the
  // object position p or sweep attribute r = (t along the sweep, radial direction).
  function toonMat(base, regions = []) {
    const mat = m(new THREE.MeshToonMaterial({ color: base, gradientMap: ramp }));
    const uni = regions.map((r, i) => ({ name: `uReg${i}`, value: new THREE.Color(r.color) }));
    mat.onBeforeCompile = s => {
      uni.forEach(u => { s.uniforms[u.name] = { value: u.value }; });
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aR;\nvarying vec3 vP;\nvarying vec4 vR;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position; vR = aR;');
      let body = 'vec3 rc = diffuse; vec3 p = vP; vec4 r = vR; float m_, w_;\n';
      regions.forEach((rg, i) => { body += `m_ = (${rg.expr}); w_ = max(fwidth(m_) * 0.75, 1e-5); rc = mix(rc, uReg${i}, smoothstep(-w_, w_, m_));\n`; });
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vP;\nvarying vec4 vR;\n' + uni.map(u => `uniform vec3 ${u.name};`).join('\n'))
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', body + 'vec4 diffuseColor = vec4( rc, opacity );');
    };
    mat.customProgramCacheKey = () => 'duo-toon|' + regions.map(r => r.expr).join('|');
    return mat;
  }

  function solid(mesh) { mesh.castShadow = false; mesh.layers.enable(SHADOW_LAYER); return mesh; }

  // Welded lat-long sphere, deformed then re-normalled (no UV seam crease).
  function blob(rx, ry, rz, deform, W = 30, H = 20) {
    const pos = [0, 1, 0], idx = [];
    for (let j = 1; j < H; j++) { const th = j / H * Math.PI; for (let i = 0; i < W; i++) { const ph = i / W * Math.PI * 2; pos.push(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)); } }
    pos.push(0, -1, 0);
    const S = pos.length / 3 - 1, ring = (j, i) => 1 + (j - 1) * W + ((i % W) + W) % W;
    for (let i = 0; i < W; i++) idx.push(0, ring(1, i), ring(1, i + 1));
    for (let j = 1; j < H - 1; j++) for (let i = 0; i < W; i++) { const a = ring(j, i), b = ring(j, i + 1), c = ring(j + 1, i), d = ring(j + 1, i + 1); idx.push(a, c, b, b, c, d); }
    for (let i = 0; i < W; i++) idx.push(S, ring(H - 1, i + 1), ring(H - 1, i));
    const d = V(), o = V();
    for (let k = 0; k < pos.length; k += 3) {
      d.set(pos[k], pos[k + 1], pos[k + 2]); o.set(d.x * rx, d.y * ry, d.z * rz);
      if (deform) deform(o, d);
      pos[k] = o.x; pos[k + 1] = o.y; pos[k + 2] = o.z;
    }
    const geo = g(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  function blobMesh(geo, mat) { return solid(new THREE.Mesh(geo, mat)); }

  // Swept tube with an elliptical, asymmetric cross-section and closed caps.
  class Sweep {
    constructor(segs = 30, radial = 12) {
      this.segs = segs; this.radial = radial;
      const R = radial, rings = segs + 1, n = rings * R + 2;
      const geo = g(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aR', new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
      const idx = [];
      for (let i = 0; i < segs; i++) for (let j = 0; j < R; j++) {
        const a = i * R + j, b = i * R + (j + 1) % R, c = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R;
        idx.push(a, b, c, b, d, c);
      }
      const s0 = rings * R, s1 = s0 + 1, last = segs * R;
      for (let j = 0; j < R; j++) { idx.push(s0, (j + 1) % R, j); idx.push(s1, last + j, last + (j + 1) % R); }
      geo.setIndex(idx);
      this.geometry = geo;
      this.P = V(); this.T = V(); this.N = V(); this.S = V(); this.D = V();
    }
    update(curve, profile, hint) {
      const { segs, radial: R, geometry: geo, P, T, N, S, D } = this;
      const pos = geo.attributes.position.array, ar = geo.attributes.aR.array;
      curve.updateArcLengths();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        curve.getPointAt(t, P); curve.getTangentAt(t, T).normalize();
        if (i === 0) { if (hint) N.copy(hint); else N.set(0, Math.abs(T.y) < 0.9 ? 1 : 0, Math.abs(T.y) < 0.9 ? 0 : 1); }
        N.addScaledVector(T, -N.dot(T));
        if (N.lengthSq() < 1e-10) N.set(1, 0, 0).addScaledVector(T, -T.x);
        N.normalize(); S.crossVectors(N, T).normalize();
        const pr = profile(t);
        for (let j = 0; j < R; j++) {
          const th = j / R * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), nr = s >= 0 ? pr.up : pr.dn, k = i * R + j;
          pos[k * 3] = P.x + S.x * c * pr.w + N.x * s * nr;
          pos[k * 3 + 1] = P.y + S.y * c * pr.w + N.y * s * nr;
          pos[k * 3 + 2] = P.z + S.z * c * pr.w + N.z * s * nr;
          D.set(0, 0, 0).addScaledVector(S, c).addScaledVector(N, s).normalize();
          ar[k * 4] = t; ar[k * 4 + 1] = D.x; ar[k * 4 + 2] = D.y; ar[k * 4 + 3] = D.z;
        }
        if (i === 0 || i === segs) {
          const k = (segs + 1) * R + (i === 0 ? 0 : 1), sg = i === 0 ? -1 : 1;
          pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z;
          ar[k * 4] = t; ar[k * 4 + 1] = T.x * sg; ar[k * 4 + 2] = T.y * sg; ar[k * 4 + 3] = T.z * sg;
        }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aR.needsUpdate = true;
      geo.computeVertexNormals(); geo.attributes.normal.needsUpdate = true;
      geo.computeBoundingSphere();
      return this;
    }
  }
  function sweepMesh(curve, profile, hint, mat, segs = 30, radial = 12) {
    const sw = new Sweep(segs, radial).update(curve, profile, hint);
    return solid(new THREE.Mesh(sw.geometry, mat));
  }

  // Two-bone limb: analytic IK in character space, re-swept each frame like a rubber hose.
  class Limb {
    constructor(root, anchor, o) {
      Object.assign(this, { root, anchor, ...o });
      this.sweep = new Sweep(o.segs || 24, o.radial || 10);
      this.mesh = solid(new THREE.Mesh(this.sweep.geometry, o.mat));
      this.mesh.frustumCulled = false; root.add(this.mesh);
      this.curve = curveOf([V(), V(0, -0.1, 0), V(0, -0.2, 0), V(0, -0.3, 0), V(0, -0.4, 0)]);
      this.a = V(); this.b = V(); this.c = V();
      this.end = new THREE.Object3D(); root.add(this.end);
    }
    solve(target, pole) {
      const { a, b, c, l1, l2 } = this;
      this.anchor.getWorldPosition(a); this.root.worldToLocal(a);
      const d = target.clone().sub(a); let len = d.length(); const dir = d.divideScalar(len || 1);
      len = clamp(len, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.998);
      c.copy(a).addScaledVector(dir, len);
      const x = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
      const pd = pole.clone().addScaledVector(dir, -pole.dot(dir));
      if (pd.lengthSq() < 1e-8) pd.set(0, 0, 1);
      b.copy(a).addScaledVector(dir, x).addScaledVector(pd.normalize(), h);
      this.end.position.copy(c);
    }
    rebuild() {
      const { a, b, c } = this, p = this.curve.points;
      p[0].copy(a).addScaledVector(a.clone().sub(b).normalize(), this.extStart);
      p[1].copy(a); p[2].copy(b); p[3].copy(c);
      p[4].copy(c).addScaledVector(c.clone().sub(b).normalize(), this.extEnd);
      this.sweep.update(this.curve, this.profile, null);
    }
  }

  // Palm blob + swept fingers; curl and spread re-pose them live.
  class Hand {
    constructor(o) {
      Object.assign(this, o);
      this.group = new THREE.Group();
      this.palmMesh = blobMesh(blob(...o.palm, null, 18, 12), o.mat);
      this.palmMesh.position.set(0, -o.palm[1] * 0.75, 0); this.group.add(this.palmMesh);
      this.fingers = o.fingersSpec.map(() => {
        const sw = new Sweep(14, 7);
        const mesh = solid(new THREE.Mesh(sw.geometry, o.fingerMat || o.mat));
        mesh.userData.sweep = sw; this.group.add(mesh); return mesh;
      });
      this.state = { curl: -1, spread: -1 };
      this.setPose(0.3, 0.5);
    }
    setPose(curl, spread) {
      if (Math.abs(curl - this.state.curl) < 2e-3 && Math.abs(spread - this.state.spread) < 2e-3) return;
      this.state = { curl, spread };
      const baseY = -this.palm[1] * 1.45, pointy = this.feather ? clamp(1 - curl / 1.2, 0, 1) : 0;
      this.fingers.forEach((mesh, i) => {
        const f = this.fingersSpec[i], sp = THREE.MathUtils.degToRad(f.spread) * spread;
        const dir = V(Math.sin(sp), -Math.cos(sp), 0), axis = V(0, 0, 1).cross(dir).normalize();
        const pts = [V(f.x, baseY + this.palm[1] * 0.55, 0)];
        let p = V(f.x, baseY, 0); pts.push(p.clone());
        f.len.forEach((L, k) => { dir.applyAxisAngle(axis, curl * (k === 0 ? 0.8 : 1.15)); p = p.clone().addScaledVector(dir, L); pts.push(p); });
        mesh.userData.sweep.update(curveOf(pts), t => {
          const k = capE(t, pointy > 0.5 ? 0.06 : 0.14) * (1 - pointy * 0.8 * Math.pow(t, 1.4));
          return { w: f.w * k, up: f.w * 0.72 * k, dn: f.w * 0.72 * k };
        }, V(0, 0, 1));
      });
    }
  }

  // ==========================================================================
  // Mordecai: blue jay. Faces +Z, his own left is +X.
  // ==========================================================================
  function createMordecai() {
    const root = new THREE.Group(); root.name = 'Mordecai';
    const rig = { root, limbs: {}, hands: {}, joints: {} };
    const pelvis = new THREE.Object3D(); pelvis.position.set(0, 1.05, 0); root.add(pelvis);

    // Boxy torso that runs straight into the head; pale chest blaze.
    const torso = sweepMesh(curveOf([[0, -0.11, 0], [0, 0.08, 0], [0, 0.28, -0.005], [0, 0.44, 0.005], [0, 0.6, 0.03]]), t => {
      const w = keys(t, [[0, 0], [0.025, 0.065], [0.07, 0.115], [0.16, 0.142], [0.45, 0.145], [0.68, 0.133], [0.82, 0.112], [0.92, 0.092], [1, 0.084]]);
      return { w, up: w * 0.9, dn: w * 0.84 };
    }, V(0, 0, 1), toonMat(PAL.mBlue, [
      { color: PAL.mPale, expr: 'min(r.w - mix(0.28, 0.05, smoothstep(0.72, 1.0, r.x)), r.x - (0.1 + 0.14 * (1.0 - r.w)))' },
    ]), 40, 18);
    pelvis.add(torso);

    // Tail fan: three feathers with white tips and dark bars.
    const tail = new THREE.Group(); tail.position.set(0, -0.02, -0.1); pelvis.add(tail);
    const tailMat = toonMat(PAL.mBlue, [
      { color: PAL.mWhite, expr: 'r.x - 0.78' },
      { color: PAL.mBlack, expr: 'max(0.03 - abs(r.x - 0.52), 0.03 - abs(r.x - 0.7))' },
    ]);
    [-1, 0, 1].forEach(k => {
      tail.add(sweepMesh(curveOf([[k * 0.02, 0.02, 0.02], [k * 0.05, -0.04, -0.12], [k * 0.08, 0.0, -0.26]]),
        t => { const s = capE(t, 0.18) * capS(t, 0.1); return { w: 0.04 * s, up: 0.012 * s, dn: 0.012 * s }; }, V(0, 1, 0), tailMat, 18, 10));
    });

    const neck = new THREE.Object3D(); neck.position.set(0, 0.5, 0.02); pelvis.add(neck);
    const head = new THREE.Group(); head.position.set(0, 0.19, 0.03); neck.add(head);
    // Pale cheek and throat; black crescent behind the cheek, as on the model sheet.
    const skull = blobMesh(blob(0.17, 0.168, 0.205, (o, d) => {
      if (d.y > 0) o.y *= 1 + 0.1 * Math.max(0, -d.z);
      if (d.z > 0) o.z *= 1 - 0.1 * d.z * d.z;
    }, 36, 24), toonMat(PAL.mBlue, [
      { color: PAL.mPale, expr: 'min((0.22 * p.z + 0.03) - p.y, p.z + 0.03)' },
      { color: PAL.mBlack, expr: 'min(0.03 - abs(p.z + 0.06 - 0.3 * p.y), 0.075 - p.y)' },
    ]));
    head.add(skull);

    // Pointed two-part beak; the lower mandible hinges open for the "Ooooh".
    const spine = [[0, -0.02, 0.07], [0, -0.03, 0.26], [0, -0.045, 0.45], [0, -0.065, 0.66]];
    const taper = t => capE(t, 0.035) * (1 - 0.86 * Math.pow(t, 1.15));
    head.add(sweepMesh(curveOf(spine), t => { const s = taper(t); return { w: 0.058 * s, up: 0.058 * s, dn: 0.014 * s }; }, V(0, 1, 0), toonMat(PAL.mBeak), 34, 14));
    const hinge = V(0, spine[0][1] - 0.014, 0.11);
    const jaw = new THREE.Group(); jaw.position.copy(hinge); head.add(jaw);
    jaw.add(sweepMesh(curveOf(spine.map(([x, y, z], i) => [x, y - 0.026 - hinge.y, (i === 3 ? z - 0.05 : z) - hinge.z])),
      t => { const s = taper(t); return { w: 0.053 * s, up: 0.014 * s, dn: 0.038 * s }; }, V(0, 1, 0), toonMat(PAL.mBeakLow), 30, 12));
    const mouth = blobMesh(blob(0.045, 0.04, 0.09, null, 16, 10), toonMat(PAL.mMouth));
    mouth.position.set(0, spine[0][1] - 0.02, 0.2); head.add(mouth);
    const tongue = blobMesh(blob(0.028, 0.012, 0.06, null, 12, 8), toonMat(PAL.mTongue));
    tongue.position.set(0, 0.0, 0.11); jaw.add(tongue);
    rig.setMouth = k => { jaw.rotation.x = 0.62 * k; mouth.scale.set(1, 1 + 2.2 * k, 1); mouth.position.y = spine[0][1] - 0.02 - 0.03 * k; };

    // Small eyes perched on the beak root.
    const eyes = new THREE.Group(); head.add(eyes); rig.eyes = [];
    const eyeMat = toonMat(PAL.eye), pupilMat = m(new THREE.MeshBasicMaterial({ color: PAL.pupil }));
    [-1, 1].forEach(side => {
      const r = [0.054, 0.058, 0.05], e = blobMesh(blob(...r, null, 18, 12), eyeMat);
      e.position.set(side * 0.056, 0.105, 0.14);
      const gaze = V(side * 0.1, 0.12, 1).normalize();
      const pu = new THREE.Mesh(blob(0.014, 0.016, 0.008, null, 10, 8), pupilMat);
      pu.position.copy(gaze).multiply(VA(r)).multiplyScalar(0.97); pu.quaternion.setFromUnitVectors(V(0, 0, 1), gaze);
      e.add(pu); eyes.add(e); rig.eyes.push(e);
    });

    // Tall flame-shaped crest with a smaller second point behind it.
    [
      { pts: [[0, 0.08, 0.02], [0, 0.2, -0.04], [0, 0.31, -0.1], [0, 0.42, -0.17]], w: 0.036, d: 0.12 },
      { pts: [[0, 0.04, -0.1], [0, 0.13, -0.17], [0, 0.2, -0.24], [0, 0.25, -0.33]], w: 0.032, d: 0.085 },
    ].forEach(cd => head.add(sweepMesh(curveOf(cd.pts), t => {
      const s = Math.max(0.03, Math.pow(1 - t, 0.9)) * capS(t, 0.06);
      return { w: cd.w * s, up: cd.d * s, dn: cd.d * s };
    }, V(0, 0.7, 0.7), toonMat(PAL.mBlue), 24, 12)));

    // Arms with white wrist bands; feather hands with dark blue lines.
    const armMat = toonMat(PAL.mBlue, [{ color: PAL.mWhite, expr: 'max(0.02 - abs(r.x - 0.835), 0.02 - abs(r.x - 0.75))' }]);
    const fingerMat = toonMat(PAL.mBlue, [{ color: PAL.mBlueDark, expr: 'max(0.04 - abs(r.x - 0.4), 0.04 - abs(r.x - 0.66))' }]);
    [['R', -1], ['L', 1]].forEach(([s, side]) => {
      const anchor = new THREE.Object3D(); anchor.position.set(side * 0.1, 0.42, -0.01); pelvis.add(anchor);
      const limb = new Limb(root, anchor, {
        l1: 0.27, l2: 0.26, mat: armMat, extStart: 0.06, extEnd: 0.05,
        profile: t => { const r = 0.046 * capS(t, 0.05) * capE(t, 0.05) * (1 - 0.1 * t); return { w: r, up: r, dn: r }; },
      });
      const hand = new Hand({
        palm: [0.06, 0.066, 0.04], mat: toonMat(PAL.mBlue), fingerMat, feather: true,
        fingersSpec: [-1.5, -0.5, 0.5, 1.5].map(u => ({ x: u * 0.026 * side, len: [0.072, 0.072, 0.066 - Math.abs(u) * 0.012], w: 0.021, spread: u * 15 * side })),
      });
      limb.end.add(hand.group);
      rig.limbs['arm' + s] = limb; rig.hands['hand' + s] = hand;
    });

    // Stick legs with scale lines; long three-toed feet.
    const legMat = toonMat(PAL.mLeg, [{ color: PAL.mLegLine, expr: 'min(0.07 - abs(fract(r.x * 12.0) - 0.5), r.w + 0.1)' }]);
    const toeMat = toonMat(PAL.mLeg);
    [['R', -1], ['L', 1]].forEach(([s, side]) => {
      const anchor = new THREE.Object3D(); anchor.position.set(side * 0.065, -0.03, 0); pelvis.add(anchor);
      const limb = new Limb(root, anchor, {
        l1: 0.53, l2: 0.52, mat: legMat, extStart: 0.12, extEnd: 0.012, segs: 26, radial: 8,
        profile: t => { const r = 0.021 * capE(t, 0.02); return { w: r, up: r, dn: r }; },
      });
      const foot = new THREE.Group();
      [[-0.38, 0.15], [0, 0.17], [0.38, 0.15], [Math.PI, 0.07]].forEach(([ang, len]) => {
        const dx = Math.sin(ang), dz = Math.cos(ang);
        foot.add(sweepMesh(curveOf([[0, 0.004, 0], [dx * len * 0.45, -0.024, dz * len * 0.45], [dx * len, -0.031, dz * len]]),
          t => { const r = 0.0135 * (1 - 0.45 * t) * capE(t, 0.2) * capS(t, 0.15); return { w: r, up: r, dn: r }; }, null, toeMat, 12, 7));
      });
      foot.add(blobMesh(blob(0.024, 0.022, 0.026, null, 12, 8), toeMat));
      limb.end.add(foot);
      rig.limbs['leg' + s] = limb; rig.joints['foot' + s] = foot;
    });
    Object.assign(rig.joints, { pelvis, neck, head, tail });
    return rig;
  }

  // ==========================================================================
  // Rigby: raccoon. Faces +Z, his own left is +X.
  // ==========================================================================
  function createRigby() {
    const root = new THREE.Group(); root.name = 'Rigby';
    const rig = { root, limbs: {}, hands: {}, joints: {} };
    const pelvis = new THREE.Object3D(); pelvis.position.set(0, 0.27, 0); root.add(pelvis);

    // Tall, narrow torso with a big pale belly.
    const torso = sweepMesh(curveOf([[0, -0.09, 0], [0, 0.06, 0], [0, 0.22, 0.005], [0, 0.36, 0.012], [0, 0.49, 0.025]]), t => {
      const w = keys(t, [[0, 0], [0.03, 0.075], [0.09, 0.118], [0.25, 0.14], [0.55, 0.138], [0.78, 0.124], [0.92, 0.11], [1, 0.105]]);
      return { w, up: w * 0.92, dn: w * 0.86 };
    }, V(0, 0, 1), toonMat(PAL.rBrown, [
      { color: PAL.rLight, expr: 'min(r.w - mix(0.12, 0.45, smoothstep(0.7, 0.98, r.x)), r.x - (0.06 + 0.1 * (1.0 - r.w)))' },
    ]), 40, 18);
    pelvis.add(torso);

    // Tall ringed tail rising behind him to head height.
    const tail = new THREE.Group(); tail.position.set(0, -0.02, -0.09); pelvis.add(tail);
    tail.add(sweepMesh(curveOf([[0, 0, 0.03], [0, -0.03, -0.1], [0, 0.05, -0.22], [0, 0.25, -0.28], [0, 0.48, -0.27], [0, 0.66, -0.2]]),
      t => { const r = keys(t, [[0, 0.04], [0.12, 0.06], [0.4, 0.078], [0.8, 0.075], [1, 0.064]]) * capE(t, 0.1) * capS(t, 0.03); return { w: r, up: r, dn: r }; },
      V(0, 1, 0), toonMat(PAL.rBrown, [{ color: PAL.rDark, expr: 'min(sin(r.x * 33.0 - 0.4) - 0.25, r.x - 0.12)' }]), 44, 12));

    const neck = new THREE.Object3D(); neck.position.set(0, 0.46, 0.02); pelvis.add(neck);
    const head = new THREE.Group(); head.position.set(0, 0.14, 0.02); neck.add(head);
    head.add(blobMesh(blob(0.17, 0.142, 0.15, (o, d) => {
      if (d.y < 0) o.x *= 1 + 0.1 * (-d.y);
      if (d.y > 0) o.y *= 1 - 0.08 * d.y * d.y;
    }, 36, 24), toonMat(PAL.rBrown, [{ color: PAL.rDark, expr: 'min(0.035 - abs(p.y - 0.05), p.z + 0.07)' }])));

    // Long, slender snout with a small black nose.
    head.add(sweepMesh(curveOf([[0, -0.03, 0.05], [0, -0.042, 0.19], [0, -0.06, 0.31]]), t => {
      const k = capE(t, 0.14);
      return { w: lerp(0.07, 0.022, t) * k, up: lerp(0.055, 0.02, t) * k, dn: lerp(0.045, 0.02, t) * k };
    }, V(0, 1, 0), toonMat(PAL.rBrown), 28, 12));
    const nose = blobMesh(blob(0.027, 0.022, 0.024, null, 12, 8), toonMat(PAL.rNose));
    nose.position.set(0, -0.058, 0.318); head.add(nose);

    // Grin: dark mouth with tongue and buck tooth; scales open into an "O".
    const mouth = blobMesh(blob(0.05, 0.04, 0.03, null, 16, 10), toonMat(PAL.rMouth));
    mouth.position.set(0, -0.098, 0.1); mouth.rotation.x = -0.35; head.add(mouth);
    const tongue = blobMesh(blob(0.03, 0.014, 0.018, null, 12, 8), toonMat(PAL.rTongue));
    tongue.position.set(0, -0.024, 0.014); mouth.add(tongue);
    const tooth = blobMesh(blob(0.011, 0.014, 0.006, null, 10, 8), toonMat(PAL.rTooth));
    tooth.position.set(0.012, 0.03, 0.024); mouth.add(tooth);
    rig.setMouth = k => { mouth.scale.set(0.75 + 0.45 * k, 0.32 + 0.95 * k, 1); };

    // Saucer eyes inside dark olive goggle rims.
    const eyes = new THREE.Group(); head.add(eyes); rig.eyes = [];
    const eyeMat = toonMat(PAL.eye), rimMat = toonMat(PAL.rDark), pupilMat = m(new THREE.MeshBasicMaterial({ color: PAL.pupil }));
    [-1, 1].forEach(side => {
      const r = [0.06, 0.064, 0.05], at = V(side * 0.062, 0.05, 0.105);
      const rim = blobMesh(blob(0.077, 0.081, 0.05, null, 18, 12), rimMat); rim.position.copy(at).add(V(0, 0, -0.014)); eyes.add(rim);
      const e = blobMesh(blob(...r, null, 18, 12), eyeMat); e.position.copy(at);
      const gaze = V(-side * 0.05, 0.08, 1).normalize();
      const pu = new THREE.Mesh(blob(0.013, 0.015, 0.007, null, 10, 8), pupilMat);
      pu.position.copy(gaze).multiply(VA(r)).multiplyScalar(0.97); pu.quaternion.setFromUnitVectors(V(0, 0, 1), gaze);
      e.add(pu); eyes.add(e); rig.eyes.push(e);
    });

    // Rounded ears and messy hair tufts.
    const earMat = toonMat(PAL.rBrown, [{ color: PAL.rDark, expr: 'min(r.w - 0.3, 0.8 - r.x)' }]), furMat = toonMat(PAL.rBrown);
    [-1, 1].forEach(side => head.add(sweepMesh(curveOf([[side * 0.1, 0.09, -0.045], [side * 0.125, 0.13, -0.05], [side * 0.14, 0.165, -0.055]]), t => {
      const k = capE(t, 0.55) * capS(t, 0.05);
      return { w: 0.056 * (1 - 0.2 * t) * k, up: 0.02 * k, dn: 0.016 * k };
    }, V(0, 0, 1), earMat, 16, 12)));
    [[-0.07, 0.1, 0.0, -0.4, 0.05], [-0.035, 0.12, 0.02, -0.15, 0.065], [0, 0.125, 0.0, 0.05, 0.075], [0.035, 0.12, 0.02, 0.2, 0.06], [0.07, 0.1, -0.01, 0.4, 0.05]].forEach(([x, y, z, lean, h]) => {
      head.add(sweepMesh(curveOf([[x, y - 0.02, z], [x + lean * 0.03, y + h * 0.5, z - 0.02], [x + lean * 0.06, y + h, z - 0.05]]),
        t => { const k = Math.max(0.05, 1 - t) * capS(t, 0.1); return { w: 0.018 * k, up: 0.024 * k, dn: 0.024 * k }; }, V(0, 0, 1), furMat, 12, 8));
    });

    // Thin arms and small hands.
    const armMat = toonMat(PAL.rBrown);
    [['R', -1], ['L', 1]].forEach(([s, side]) => {
      const anchor = new THREE.Object3D(); anchor.position.set(side * 0.095, 0.4, 0); pelvis.add(anchor);
      const limb = new Limb(root, anchor, {
        l1: 0.24, l2: 0.23, mat: armMat, extStart: 0.05, extEnd: 0.03,
        profile: t => { const r = 0.025 * capS(t, 0.05) * capE(t, 0.05); return { w: r, up: r, dn: r }; },
      });
      const hand = new Hand({
        palm: [0.03, 0.034, 0.018], mat: armMat, feather: false,
        fingersSpec: [-1.5, -0.5, 0.5, 1.5].map(u => ({ x: u * 0.013 * side, len: [0.02, 0.018, 0.015], w: 0.009, spread: u * 12 * side })),
      });
      limb.end.add(hand.group);
      rig.limbs['arm' + s] = limb; rig.hands['hand' + s] = hand;
    });

    // Short legs; feet with long splayed toes.
    const legMat = toonMat(PAL.rBrown);
    [['R', -1], ['L', 1]].forEach(([s, side]) => {
      const anchor = new THREE.Object3D(); anchor.position.set(side * 0.065, -0.03, 0); pelvis.add(anchor);
      const limb = new Limb(root, anchor, {
        l1: 0.12, l2: 0.115, mat: legMat, extStart: 0.08, extEnd: 0.01, segs: 18, radial: 10,
        profile: t => { const r = 0.03 * (1 - 0.2 * t) * capE(t, 0.05); return { w: r, up: r, dn: r }; },
      });
      const foot = new THREE.Group();
      foot.add(blobMesh(blob(0.034, 0.02, 0.042, null, 14, 10), legMat));
      [-0.5, -0.17, 0.17, 0.5].forEach(a => {
        const dx = Math.sin(a + side * 0.12), dz = Math.cos(a + side * 0.12);
        foot.add(sweepMesh(curveOf([[dx * 0.015, -0.005, dz * 0.015], [dx * 0.045, -0.016, dz * 0.045], [dx * 0.075, -0.02, dz * 0.075]]),
          t => { const r = 0.0095 * capE(t, 0.25) * capS(t, 0.2); return { w: r, up: r * 0.8, dn: r * 0.8 }; }, null, legMat, 10, 6));
      });
      limb.end.add(foot);
      rig.limbs['leg' + s] = limb; rig.joints['foot' + s] = foot;
    });
    Object.assign(rig.joints, { pelvis, neck, head, tail });
    return rig;
  }

  // ==========================================================================
  // The "Ooooh!": wind-up crouch, arms flung up with heads back and mouths open,
  // then a hopping shimmy before settling back into the next wind-up.
  // ==========================================================================
  const z3 = [0, 0, 0];
  const arm = (t, pole, extra = {}) => ({ t, pole, roll: 0, bend: 0, curl: 0.3, spread: 0.8, hdir: z3, ...extra });
  const leg = (t, pole, yaw) => ({ t, pole, yaw, pitch: 0 });
  const OOOH = {
    period: 4.8,
    mordecai: {
      scale: 1,
      crouch: {
        pelvis: { y: 0.94, rot: [0.38, 0, 0] }, neck: [0.12, 0, 0], head: [0.18, 0, 0], tail: [0.35, 0, 0], mouth: 0.35, blink: 0,
        armR: arm([-0.36, 1.08, 0.16], [-0.6, 0.5, -0.7], { roll: 0.3, curl: 0.35, spread: 0.9 }),
        armL: arm([0.36, 1.08, 0.16], [0.6, 0.5, -0.7], { roll: -0.3, curl: 0.35, spread: 0.9 }),
        legR: leg([-0.2, 0.035, 0.06], [-0.6, 0, 1], -0.25), legL: leg([0.2, 0.035, 0.06], [0.6, 0, 1], 0.25),
      },
      up: {
        pelvis: { y: 1.04, rot: [-0.14, 0, 0] }, neck: [-0.28, 0, 0], head: [-0.5, 0, 0], tail: [0.1, 0, 0], mouth: 1, blink: 0,
        armR: arm([-0.28, 1.97, 0.0], [-1, 0, -0.3], { curl: 0.1, spread: 1.3 }),
        armL: arm([0.28, 1.97, 0.0], [1, 0, -0.3], { curl: 0.1, spread: 1.3 }),
        legR: leg([-0.19, 0.035, 0.02], [-0.5, 0, 1], -0.2), legL: leg([0.19, 0.035, 0.02], [0.5, 0, 1], 0.2),
      },
    },
    rigby: {
      scale: 0.5,
      crouch: {
        pelvis: { y: 0.235, rot: [0.35, 0, 0] }, neck: [0.08, 0, 0], head: [0.2, 0, 0], tail: [0.2, 0, 0], mouth: 0.75, blink: 0,
        armR: arm([-0.25, 0.47, 0.16], [-0.6, 0.4, -0.7], { roll: 0.3, curl: 0.4 }),
        armL: arm([0.25, 0.47, 0.16], [0.6, 0.4, -0.7], { roll: -0.3, curl: 0.4 }),
        legR: leg([-0.1, 0.035, 0.04], [-0.5, 0, 1], -0.2), legL: leg([0.1, 0.035, 0.04], [0.5, 0, 1], 0.2),
      },
      up: {
        pelvis: { y: 0.27, rot: [-0.12, 0, 0] }, neck: [-0.2, 0, 0], head: [-0.38, 0, 0], tail: [0.05, 0, 0], mouth: 1, blink: 0,
        armR: arm([-0.21, 1.17, 0.02], [-1, 0, -0.2], { curl: 0.15, spread: 1.1 }),
        armL: arm([0.21, 1.17, 0.02], [1, 0, -0.2], { curl: 0.15, spread: 1.1 }),
        legR: leg([-0.09, 0.035, 0.0], [-0.3, 0, 1], -0.15), legL: leg([0.09, 0.035, 0.0], [0.3, 0, 1], 0.15),
      },
    },
  };
  function blendPose(a, b, k) {
    if (typeof a === 'number') return lerp(a, b, k);
    if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], k));
    const o = {}; for (const key in a) o[key] = blendPose(a[key], b[key], k); return o;
  }
  function ooohPose(def, t, reduced) {
    if (reduced) return blendPose(def.up, def.up, 1);
    const u = ((t % OOOH.period) + OOOH.period) % OOOH.period;
    const k = u < 0.8 ? 0 : u < 1.25 ? smooth(0.8, 1.25, u) : u < 4.0 ? 1 : 1 - smooth(4.0, 4.8, u);
    const p = blendPose(def.crouch, def.up, k), sc = def.scale;
    p.pelvis.y -= 0.03 * sc * (u < 0.8 ? smooth(0, 0.8, u) : 0);
    const hold = smooth(1.25, 1.55, u) * (1 - smooth(3.7, 4.0, u));
    const b = (u - 1.25) * 2.5 * Math.PI, s = Math.sin(b), c = Math.cos(b);
    p.pelvis.y += hold * 0.05 * sc * Math.abs(s);
    p.pelvis.rot[2] += hold * 0.12 * s;
    p.pelvis.rot[1] += hold * 0.3 * Math.sin(b * 0.5);
    for (const a of ['armR', 'armL']) { p[a].t[0] += hold * 0.1 * sc * s; p[a].t[1] += hold * 0.05 * sc * c; }
    p.legR.t[1] += hold * 0.1 * sc * Math.max(0, s);
    p.legL.t[1] += hold * 0.1 * sc * Math.max(0, -s);
    p.head[2] += hold * 0.18 * s;
    p.tail[1] += hold * 0.4 * s;
    p.mouth = clamp(p.mouth + hold * 0.06 * Math.sin(b * 2), 0, 1);
    return p;
  }
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qC = new THREE.Quaternion();
  function applyPose(rig, pose) {
    const j = rig.joints;
    j.pelvis.position.y = pose.pelvis.y; j.pelvis.rotation.set(...pose.pelvis.rot);
    j.neck.rotation.set(...pose.neck); j.head.rotation.set(...pose.head); j.tail.rotation.set(...pose.tail);
    rig.setMouth(pose.mouth);
    rig.root.updateMatrixWorld(true);
    for (const s of ['R', 'L']) {
      const a = rig.limbs['arm' + s], ap = pose['arm' + s];
      a.solve(VA(ap.t), VA(ap.pole)); a.rebuild();
      const f = a.c.clone().sub(a.b).normalize(), hd = VA(ap.hdir);
      if (hd.lengthSq() > 1e-6) f.addScaledVector(hd, 3).normalize();
      qA.setFromUnitVectors(V(0, -1, 0), f); qB.setFromAxisAngle(f, ap.roll); qC.setFromAxisAngle(V(1, 0, 0), ap.bend);
      rig.hands['hand' + s].group.quaternion.copy(qB).multiply(qA).multiply(qC);
      rig.hands['hand' + s].setPose(ap.curl, ap.spread);
      const l = rig.limbs['leg' + s], lp = pose['leg' + s];
      l.solve(VA(lp.t), VA(lp.pole)); l.rebuild();
      j['foot' + s].rotation.set(lp.pitch, lp.yaw, 0, 'YXZ');
    }
    rig.eyes.forEach(e => { e.scale.y = Math.max(0.08, 1 - pose.blink); });
  }

  // ==========================================================================
  // Assemble: side by side, facing the city past the railing (the caller's root
  // faces outward), each turned slightly in toward the other.
  // ==========================================================================
  const root = new THREE.Group(); root.name = 'Mordecai and Rigby';
  const mordecai = createMordecai(), rigby = createRigby();
  mordecai.root.position.set(-0.52, 0, 0); mordecai.root.rotation.y = 0.25;
  rigby.root.position.set(0.54, 0, 0.06); rigby.root.rotation.y = -0.25;
  root.add(mordecai.root, rigby.root);

  // Moon shadow: silhouettes rendered from the scene key light's direction into a
  // small target, then projected onto a shadow-only disc that matches the terrace.
  // Terrace centre/radius in duo space mirror the caller's placement (duo at terrace
  // z = -6.5, rotated PI+0.28, scaled 0.85 relative to the terrace).
  const shadowTarget = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: true });
  const lightCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10); lightCam.layers.set(SHADOW_LAYER);
  const silhouette = m(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }));
  const catcherMat = m(new THREE.ShaderMaterial({
    uniforms: { uMap: { value: shadowTarget.texture }, uMatrix: { value: new THREE.Matrix4() }, uColor: { value: new THREE.Color(0x05081a) }, uOpacity: { value: 0.5 }, uTexel: { value: 1 / 512 } },
    vertexShader: 'uniform mat4 uMatrix; varying vec4 vL; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vL = uMatrix * wp; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity; uniform float uTexel; varying vec4 vL;
      void main(){ vec2 uv = vL.xy / vL.w * 0.5 + 0.5;
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
        float s = 0.0; for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) s += texture2D(uMap, uv + vec2(float(i), float(j)) * uTexel * 1.4).r;
        s /= 25.0; if (s < 0.004) discard; gl_FragColor = vec4(uColor, s * uOpacity); }`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const terrace = (() => { const k = 6.5 / 0.85, a = -(Math.PI + 0.28); return { x: k * Math.sin(a), z: k * Math.cos(a), r: 7.8 / 0.85 }; })();
  const catcher = new THREE.Mesh(g(new THREE.CircleGeometry(terrace.r, 64)), catcherMat);
  catcher.rotation.x = -Math.PI / 2; catcher.position.set(terrace.x, 0.006, terrace.z); catcher.renderOrder = 2;
  root.add(catcher);
  const moonDir = V(-43, 57, 31).normalize(), tmpA = V(), tmpB = V(), worldScale = V(), clearColor = new THREE.Color();
  let drawing = false, key = null, keyScene = null;
  catcher.onBeforeRender = (renderer, scene, camera) => {
    if (drawing) return;
    root.getWorldScale(worldScale); const s = worldScale.x;
    root.getWorldPosition(tmpA);
    if (camera.position.distanceTo(tmpA) > 160 * s) return; // map view: keep the last frame, skip the pass
    drawing = true;
    if (keyScene !== scene) { keyScene = scene; key = null; scene.traverse(o => { if (!key && o.isDirectionalLight && o.castShadow) key = o; }); }
    if (key) { key.getWorldPosition(tmpB); key.target.getWorldPosition(moonDir); moonDir.subVectors(tmpB, moonDir).normalize(); }
    tmpA.y += 1.0 * s;
    lightCam.position.copy(tmpA).addScaledVector(moonDir, 6 * s); lightCam.lookAt(tmpA);
    const half = 3.4 * s;
    Object.assign(lightCam, { left: -half, right: half, top: half, bottom: -half, near: 0.5 * s, far: 14 * s });
    lightCam.updateProjectionMatrix(); lightCam.updateMatrixWorld();
    catcherMat.uniforms.uMatrix.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse);
    const prev = { target: renderer.getRenderTarget(), override: scene.overrideMaterial, bg: scene.background, fog: scene.fog, alpha: renderer.getClearAlpha(), shadow: renderer.shadowMap.autoUpdate, xr: renderer.xr.enabled };
    renderer.getClearColor(clearColor);
    scene.overrideMaterial = silhouette; scene.background = null; scene.fog = null;
    renderer.shadowMap.autoUpdate = false; renderer.xr.enabled = false;
    renderer.setRenderTarget(shadowTarget); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, lightCam);
    scene.overrideMaterial = prev.override; scene.background = prev.bg; scene.fog = prev.fog;
    renderer.shadowMap.autoUpdate = prev.shadow; renderer.xr.enabled = prev.xr;
    renderer.setClearColor(clearColor, prev.alpha); renderer.setRenderTarget(prev.target);
    if (camera.viewport !== undefined) renderer.state.viewport(camera.viewport);
    drawing = false;
  };

  // "Oooooooh!" speech bubble: pops in as the arms go up, the o's stretch through
  // the hold, and it pops out at the next wind-up. A sprite, so it always faces the
  // camera; its anchor is the tail tip, just above their heads.
  const BW = 1024, BH = 400, bubbleW = 2.4, bubbleH = bubbleW * BH / BW;
  const bubbleCanvas = document.createElement('canvas'); bubbleCanvas.width = BW; bubbleCanvas.height = BH;
  const bubbleCtx = bubbleCanvas.getContext('2d');
  const bubbleTex = new THREE.CanvasTexture(bubbleCanvas); bubbleTex.colorSpace = THREE.SRGBColorSpace;
  const bubble = new THREE.Sprite(m(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, toneMapped: false, fog: false })));
  bubble.center.set(0.5, 0); bubble.position.set(0, 2.32, 0.1); bubble.renderOrder = 3; bubble.raycast = () => {};
  root.add(bubble);
  let bubbleText = '';
  document.fonts?.load('800 120px Unbounded').then(() => { bubbleText = ''; }, () => {});
  function drawBubble(text) {
    if (text === bubbleText) return;
    bubbleText = text;
    const c = bubbleCtx, tail = 74, x0 = 36, x1 = BW - 36, y0 = 26, y1 = BH - tail - 12, r = (y1 - y0) / 2;
    c.clearRect(0, 0, BW, BH);
    c.beginPath();
    c.moveTo(x0 + r, y0); c.lineTo(x1 - r, y0); c.arc(x1 - r, y0 + r, r, -Math.PI / 2, Math.PI / 2);
    c.lineTo(BW / 2 + 70, y1); c.lineTo(BW / 2 - 18, BH - 8); c.lineTo(BW / 2 - 36, y1);
    c.lineTo(x0 + r, y1); c.arc(x0 + r, y0 + r, r, Math.PI / 2, Math.PI * 1.5); c.closePath();
    c.shadowColor = 'rgba(8, 6, 32, 0.35)'; c.shadowBlur = 22; c.shadowOffsetY = 8;
    c.fillStyle = '#ffffff'; c.fill();
    c.shadowColor = 'transparent';
    let size = 132;
    c.font = `800 ${size}px Unbounded, "Arial Black", sans-serif`;
    const room = x1 - x0 - r;
    const width = c.measureText(text).width;
    if (width > room) { size = Math.floor(size * room / width); c.font = `800 ${size}px Unbounded, "Arial Black", sans-serif`; }
    c.fillStyle = '#171329'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, BW / 2, (y0 + y1) / 2 + size * 0.06);
    bubbleTex.needsUpdate = true;
  }
  function updateBubble(time, reduced) {
    if (reduced) { drawBubble('Oooooooh!'); bubble.visible = true; bubble.scale.set(bubbleW, bubbleH, 1); return; }
    const u = ((time % OOOH.period) + OOOH.period) % OOOH.period;
    const on = smooth(0.95, 1.2, u) * (1 - smooth(3.85, 4.1, u));
    bubble.visible = on > 0.01;
    if (!bubble.visible) return;
    drawBubble('O' + 'o'.repeat(1 + Math.round(clamp((u - 1.0) / 2.4, 0, 1) * 5)) + 'h!');
    const pop = on < 1 ? on * (1 + 0.25 * Math.sin(on * Math.PI)) : 1 + 0.03 * Math.sin(time * 9);
    bubble.scale.set(bubbleW * pop, bubbleH * pop, 1);
  }

  const rigs = [[mordecai, OOOH.mordecai, 0], [rigby, OOOH.rigby, 0.08]];
  function update(time, reduced = false) {
    for (const [rig, def, offset] of rigs) {
      const pose = ooohPose(def, time + offset, reduced);
      pose.blink = reduced ? 0 : (((time + offset * 20) % 3.9) < 0.14 ? Math.sin(((time + offset * 20) % 3.9) / 0.14 * Math.PI) : 0);
      applyPose(rig, pose);
    }
    updateBubble(time, reduced);
  }
  update(0);
  const joints = [mordecai.joints.pelvis, rigby.joints.pelvis, mordecai.joints.head, rigby.joints.head, mordecai.joints.tail, rigby.joints.tail];
  return { root, update, joints, dispose() { ramp.dispose(); shadowTarget.dispose(); bubbleTex.dispose(); } };
}
