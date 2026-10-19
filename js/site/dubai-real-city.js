/** Real Dubai geography from OpenStreetMap, built with the same white architectural
 *  material as before: shaded blocks, lit windows, roof slabs, real arteries and the coast. */
import * as geo from './dubai-geo.js';
import { buildReferenceLandmarks } from './dubai-landmarks.js?v=20261019-no-rays';

export async function buildDubaiCity(context) {
  const { THREE, world, g, m, mat, mesh, footprint, road, ribbon, box, instance, cylinder, palm, tree } = context;
  const toLocal = (lat, lon) => { const e = (lon - 55.23) * 111320 * Math.cos(25.18 * Math.PI / 180), n = (lat - 25.18) * 110750; return [(e - n) / Math.SQRT2 / geo.unitMetres, -(e + n) / Math.SQRT2 / geo.unitMetres]; };
  const random = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return value - Math.floor(value); };
  const HEIGHT_SCALE = 3.5 / geo.unitMetres; // 1 scene unit = 250 m; towers exaggerated ×3.5 like before
  const core = { minX: -13, maxX: 22, minZ: -50, maxZ: 64 };
  // The first view frames the Downtown–Jumeirah stretch; the tray reaches the rest.
  const frameBox = { minX: -12, maxX: 16, minZ: -30, maxZ: 40 };
  const detail = { minX: -18, maxX: 36, minZ: -72, maxZ: 84 };
  const fitPoints = [];
  let buildingCount = 0;

  // ---- Land test over the coastline rings (even-odd, bbox prefiltered).
  const ringBounds = geo.land.map(ring => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of ring) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    return { minX, maxX, minZ, maxZ };
  });
  // Index polygon edges by height: a horizontal ray only touches edges in its row.
  // This preserves the exact coastline test without scanning thousands of vertices.
  const ringEdgeRows=new WeakMap();
  function pointInRing(x,z,ring) {
    let rows=ringEdgeRows.get(ring);
    if(!rows){
      rows=new Map();ringEdgeRows.set(ring,rows);
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const [xi,zi]=ring[i],[xj,zj]=ring[j];
        if(zi===zj)continue;
        const edge=[xi,zi,xj,zj];
        for(let row=Math.floor(Math.min(zi,zj));row<=Math.floor(Math.max(zi,zj));row++){
          if(!rows.has(row))rows.set(row,[]);
          rows.get(row).push(edge);
        }
      }
    }
    let inside=false;
    for(const [xi,zi,xj,zj]of rows.get(Math.floor(z))||[])
      if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
    return inside;
  }
  function isLand(x, z) {
    let count = 0;
    for (let i = 0; i < geo.land.length; i++) {
      const b = ringBounds[i];
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (pointInRing(x, z, geo.land[i])) count++;
    }
    return count % 2 === 1;
  }

  // ---- Ground: an endless sea plane, the real land rings on top (the mainland pushed
  // outward past the data boundary), then the creek and inland water. No plate edge exists.
  const ground = mesh(g(new THREE.PlaneGeometry(1600, 1600)), mat.water, 0, -.06, 0, false);
  ground.rotation.x = -Math.PI / 2; ground.renderOrder = -4;
  for (const ring of [...geo.land, ...(geo.landExtension || [])]) if (ring.length > 2) mesh(footprint(ring, .02, 0), mat.land, 0, -.02, 0, false).renderOrder = -2;
  for (const ring of geo.sea) if (ring.length > 3) mesh(footprint(ring, .02, 0), mat.water, 0, -.032, 0, false).renderOrder = -3;
  for (const ring of geo.water) mesh(footprint(ring, .02, 0), mat.water, 0, -.016, 0, false).renderOrder = -1;
  // A fine pale shoreline, skipping the polygon-closure segments along the data boundary.
  const onBoundary = ([x, z]) => Math.abs(x + z) > 112 || Math.abs(x - z) > 130;
  const coastPositions = [];
  for (const ring of geo.land) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if (onBoundary(a) && onBoundary(b)) continue;
    coastPositions.push(a[0], .012, a[1], b[0], .012, b[1]);
  }
  const coastGeometry = g(new THREE.BufferGeometry()); coastGeometry.setAttribute('position', new THREE.Float32BufferAttribute(coastPositions, 3));
  const coast = m(new THREE.LineBasicMaterial({ color: '#e9e9ef', transparent: true, opacity: .8 }));
  world.add(new THREE.LineSegments(coastGeometry, coast));

  // ---- Roads: real arteries as the same white-edged ribbons, medians on the motorways.
  const roadPolylines = geo.roads.map(entry => { const points = []; for (let i = 1; i < entry.length; i += 2) points.push([entry[i], entry[i + 1]]); return { cls: entry[0], points }; });
  const toCurve = (points, y, outAndBack = false) => {
    const path = new THREE.CurvePath();
    const list = outAndBack ? [...points, ...[...points].reverse().slice(1)] : points;
    for (let i = 1; i < list.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(list[i - 1][0], y, list[i - 1][1]), new THREE.Vector3(list[i][0], y, list[i][1])));
    return path;
  };
  const inDetail = ([x, z]) => x >= detail.minX && x <= detail.maxX && z >= detail.minZ && z <= detail.maxZ;
  const polylineLength = points => { let length = 0; for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); return length; };
  const roadHalf = cls => cls === 0 ? .445 : cls === 1 ? .335 : .12; // surface + white edge, in scene units
  roadPolylines.forEach((entry, index) => {
    if (entry.points.length < 2) return;
    const lift = entry.cls === 0 ? .062 : entry.cls === 1 ? .052 : .042;
    const length = polylineLength(entry.points), path = toCurve(entry.points, lift + (index % 9) * .0009);
    const resolution = Math.max(8, Math.min(180, Math.ceil(length * 2.4)));
    if (entry.cls === 2) { ribbon(path, .24, mat.localRoad, 0, resolution); return; }
    road(path, entry.cls === 0 ? .62 : .4, resolution);
    if (entry.cls === 0) ribbon(path, .07, mat.median, .012, resolution);
  });
  // Every road segment, bucketed into a coarse grid, so footprints can be tested against the real road edges.
  const segmentGrid = new Map(), SEG_CELL = 2;
  const bucket = (x, z) => `${Math.floor(x / SEG_CELL)}:${Math.floor(z / SEG_CELL)}`;
  for (const entry of roadPolylines) for (let i = 1; i < entry.points.length; i++) {
    const [x0, z0] = entry.points[i - 1], [x1, z1] = entry.points[i], seg = { x0, z0, x1, z1, half: roadHalf(entry.cls), entry };
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / SEG_CELL) + 1, seen = new Set();
    for (let s = 0; s <= steps; s++) {
      const x = x0 + (x1 - x0) * s / steps, z = z0 + (z1 - z0) * s / steps;
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
        const key = `${Math.floor(x / SEG_CELL) + ox}:${Math.floor(z / SEG_CELL) + oz}`;
        if (seen.has(key)) continue; seen.add(key);
        (segmentGrid.get(key) || segmentGrid.set(key, []).get(key)).push(seg);
      }
    }
  }
  function squaredDistanceToSegment(x, z, s) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0, len2 = dx * dx + dz * dz;
    const t = len2 ? Math.max(0, Math.min(1, ((x - s.x0) * dx + (z - s.z0) * dz) / len2)) : 0;
    const ex=x-(s.x0+dx*t),ez=z-(s.z0+dz*t);return ex*ex+ez*ez;
  }
  function clearOfRoads(x, z, radius, ignore = null) {
    for (const s of segmentGrid.get(bucket(x, z)) || []) if (s.entry !== ignore && squaredDistanceToSegment(x, z, s) < (s.half + radius + .06)**2) return false;
    return true;
  }
  // A box footprint is clear when no road edge comes within a kerb of any of 25 points across it
  // (samples sit closer together than the narrowest road, so no road can slip between them).
  function footprintClear(x, z, w, d, kerb = .05) {
    const segments = new Set();
    for (const [cx, cz] of [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2]]) for (const s of segmentGrid.get(bucket(cx, cz)) || []) segments.add(s);
    for (const s of segments) {
      const margin=s.half+kerb;
      if(Math.max(s.x0,s.x1)+margin<x-w/2||Math.min(s.x0,s.x1)-margin>x+w/2||
         Math.max(s.z0,s.z1)+margin<z-d/2||Math.min(s.z0,s.z1)-margin>z+d/2)continue;
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const px = x - w / 2 + w * i / 4, pz = z - d / 2 + d * j / 4;
      if (squaredDistanceToSegment(px, pz, s) < (s.half + kerb)**2) return false;
      }
    }
    return true;
  }
  // Nearest point off the road for a real building whose averaged position fell onto one.
  function nudgeOffRoads(x, z, radius) {
    if (clearOfRoads(x, z, radius)) return [x, z];
    for (let r = .15; r <= 1.2; r += .15) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
      if (clearOfRoads(nx, nz, radius) && isLand(nx, nz)) return [nx, nz];
    }
    return null;
  }
  // A footprint stands only where all four corners and the centre are land.
  const onLand = (x, z, w, d) => isLand(x, z) && isLand(x - w / 2, z - d / 2) && isLand(x + w / 2, z - d / 2) && isLand(x - w / 2, z + d / 2) && isLand(x + w / 2, z + d / 2);
  // Palms line the motorways through the city, as they lined the coast road before.
  for (const entry of roadPolylines) {
    if (entry.cls !== 0 || !entry.points.every(inDetail)) continue;
    const path = toCurve(entry.points, 0), count = Math.floor(path.getLength() / 5);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, p = path.getPointAt(t), d = path.getTangentAt(t), side = i % 2 ? 1 : -1;
      const x = p.x - d.z * .62 * side, z = p.z + d.x * .62 * side;
      if (isLand(x, z) && clearOfRoads(x, z, .08, entry)) palm(x, z, .34 + (i % 3) * .04);
    }
  }
  // Cells the arteries pass through stay clear of buildings.
  const roadCells = new Set();
  const cellKey = (x, z) => `${Math.round(x * 2)}:${Math.round(z * 2)}`;
  for (const entry of roadPolylines) {
    if (entry.cls > 1) continue;
    for (let i = 1; i < entry.points.length; i++) {
      const [x0, z0] = entry.points[i - 1], [x1, z1] = entry.points[i], steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .4) || 1;
      for (let s = 0; s <= steps; s++) roadCells.add(cellKey(x0 + (x1 - x0) * s / steps, z0 + (z1 - z0) * s / steps));
    }
  }

  // ---- The same building vocabulary as the earlier city.
  const builtGrid = new Map();
  const registerFootprint = (x, z, w, d) => {
    const rect = [x - w / 2 - .02, z - d / 2 - .02, x + w / 2 + .02, z + d / 2 + .02];
    for (let gx = Math.floor(rect[0]); gx <= Math.floor(rect[2]); gx++) for (let gz = Math.floor(rect[1]); gz <= Math.floor(rect[3]); gz++) (builtGrid.get(`${gx}:${gz}`) || builtGrid.set(`${gx}:${gz}`, []).get(`${gx}:${gz}`)).push(rect);
  };
  const insideBuilding = (x, z) => (builtGrid.get(`${Math.floor(x)}:${Math.floor(z)}`) || []).some(r => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
  const footprintBox = (x, z, w, d, h) => { fitPoints.push(new THREE.Vector3(x - w / 2, .08, z - d / 2), new THREE.Vector3(x + w / 2, h + .25, z + d / 2)); registerFootprint(x, z, w + .12, d + .12); buildingCount++; };
  function litWindows(x, z, w, d, h, seed, tall, rounded=false) {
    const floors = Math.max(1, Math.min(15, Math.floor(h / (tall ? .55 : .48))));
    if(rounded){
      for(let floor=0;floor<floors;floor++)for(let face=0;face<8;face++){
        const key=seed+floor*43+face*71;if(random(key)<.22)continue;
        const angle=(face+.5)*Math.PI/4,rx=w*.57*Math.cos(Math.PI/8)+.008,rz=d*.57*Math.cos(Math.PI/8)+.008;
        const y=.2+(floor+.5)*h/floors,yaw=Math.atan2(Math.sin(angle)/w,Math.cos(angle)/d);
        box(random(key+7)>.75?mat.coolLight:mat.warmLight,x+Math.sin(angle)*rx,y,z+Math.cos(angle)*rz,Math.min(w,d)*.16,Math.min(.13,h/floors*.32),.008,yaw,false);
      }
      return;
    }
    for (let floor = 0; floor < floors; floor++) for (let col = 0; col < 3; col++) {
      const key = seed + floor * 43 + col * 71;
      const y = .34 + (floor + .4) * (h - .12) / floors;
      const dx = (col - 1) * w * .27, dz = (col - 1) * d * .27;
      for (const side of [-1, 1]) {
        const material = random(key + side * 7) > .72 ? mat.coolLight : mat.warmLight;
        if (random(key + side * 29) > .3) box(material, x + dx, y, z + side * (d / 2 + .032), w * .11, .13, .012, 0, false);
        if (random(key + side * 47 + 4) > .34) box(material, x + side * (w / 2 + .032), y, z + dz, .012, .13, d * .11, 0, false);
      }
    }
  }
  const roundedTowers = [];
  // Permanently keep nearby rectangular blocks below the round Marina roofs.
  // Match the same deterministic round-tower selection used by the builder.
  const marinaRoundSites=geo.towers.filter(([x,z])=>Math.hypot(x-6.5,z-57.56)<12 && Math.floor(random(Math.round(x*91+z*17)+4)*5)===0);
  const nearMarinaRooftop=(x,z)=>marinaRoundSites.some(([rx,rz])=>Math.hypot(x-rx,z-rz)<3.2);
  let featuredRoofPlaced=false;
  function tower(x, z, w, d, h, seed, featured=false) {
    const variant = featured ? 0 : Math.floor(random(seed + 4) * 5);
    // Keep the immediate neighbours below the featured Marina rooftop.
    // Rebuild the whole tower at this height, including its windows and crown.
    if (variant !== 0 && nearMarinaRooftop(x,z)) h = Math.min(h, .3);
    box(mat.foundation, x, .115, z, w + .34, .15, d + .34);
    if (variant === 0) {
      roundedTowers.push({ x, z, y: h + .295, radius: Math.min(w, d) * .55, featured });
      instance(cylinder, mat.glassLight, [x, .2 + h / 2, z], [w * .57, h, d * .57]);
      const floors = Math.min(14, Math.floor(h / .51));
      for (let i = 0; i <= floors; i++) instance(cylinder, mat.ivory, [x, .2 + i * h / floors, z], [w * .58, .038, d * .58]);
      instance(cylinder, mat.porcelain, [x, h + .24, z], [w * .55, .11, d * .55]);
    } else {
      box(variant === 2 ? mat.ivory : mat.glassLight, x, .2 + h / 2, z, w, h, d);
      const floors = Math.min(13, Math.max(3, Math.floor(h / .58)));
      for (let i = 0; i <= floors; i++) box(mat.ivory, x, .2 + i * h / floors, z, w + .035, .043, d + .035);
      const columns = variant === 1 ? 3 : 2;
      for (let col = 0; col < columns; col++) {
        const dx = (col - (columns - 1) / 2) * w * .65 / (columns - 1);
        const dz = (col - (columns - 1) / 2) * d * .65 / (columns - 1);
        for (const side of [-1, 1]) {
          box(mat.porcelain, x + dx, .2 + h / 2, z + side * (d / 2 + .015), .045, h, .04);
          box(mat.porcelain, x + side * (w / 2 + .015), .2 + h / 2, z + dz, .04, h, .045);
        }
      }
      if (variant === 2 || variant === 3) {
        box(mat.ivory, x + w * .08, h + .47, z, w * .78, .55, d * .76);
        box(mat.glassLight, x + w * .08, h + .78, z, w * .58, .1, d * .55);
      } else box(mat.porcelain, x, h + .24, z, w + .04, .1, d + .04);
    }
    if (variant === 4) { box(mat.ivory, x - w * .19, h + .66, z, .2, .9, .2); box(mat.glassLight, x - w * .19, h + 1.2, z, .035, .3, .035); }
    litWindows(x, z, w, d, h, seed, true,variant===0);
    footprintBox(x, z, w, d, h + 1.35);
  }
  function lowRise(x, z, w, d, h, seed, historic = false) {
    // Replace one existing block inside the dense Marina neighbourhood.
    if(!featuredRoofPlaced && Math.abs(x-14)<.8 && Math.abs(z-54)<.8){
      featuredRoofPlaced=true;tower(x,z,w,d,2.59,seed,true);return;
    }
    if(nearMarinaRooftop(x,z)) h=Math.min(h,.4);
    const material = historic ? mat.chalk : mat.ivory;
    box(mat.foundation, x, .11, z, w + .22, .13, d + .22);
    box(material, x, .18 + h / 2, z, w, h, d);
    box(mat.porcelain, x, h + .22, z, w + .1, .08, d + .1);
    const floors = Math.max(1, Math.floor(h / .5));
    for (let i = 0; i < floors; i++) {
      const y = .42 + i * .5;
      box(mat.window, x, y, z + d / 2 + .009, w * .8, .17, .016);
      box(mat.window, x + w / 2 + .009, y, z, .016, .17, d * .77);
    }
    const variant = Math.floor(random(seed + 41) * 4);
    if (historic && variant < 2) {
      box(mat.chalk, x - w * .18, h + .56, z - d * .18, .42, .7, .43);
      box(mat.porcelain, x - w * .18, h + .94, z - d * .18, .47, .08, .48);
      box(mat.window, x - w * .18, h + .62, z - d * .18 + .22, .27, .23, .012);
    } else if (variant === 0) {
      box(mat.porcelain, x + w * .2, h + .57, z - d * .15, w * .49, .61, d * .51);
      box(mat.window, x + w * .2, h + .61, z + d * .11, w * .35, .22, .018);
    } else if (variant === 1) {
      box(mat.glassLight, x - w * .12, h + .3, z - d * .13, w * .4, .12, d * .3);
    }
    litWindows(x, z, w, d, h, seed, false);
    footprintBox(x, z, w, d, h + 1.0);
  }
  function simpleBlock(x, z, w, d, h) {
    registerFootprint(x, z, w, d);
    box(mat.ivory, x, .1 + h / 2, z, w, h, d);
    box(mat.porcelain, x, h + .14, z, w + .08, .08, d + .08);
    litWindows(x,z,w,d,h,Math.round(x*91+z*17),false);
    buildingCount++;
  }

  // ---- Landmarks at their real coordinates, then real tower clusters, then the block fabric.
  const place = name => geo.places[name];
  const landmarkModel = buildReferenceLandmarks(context, { burj: place('burjKhalifa'), sail: place('burjAlArab'), sailYaw: .1, wheel: place('ainDubai'), palm: false });
  const landmarkSites = [[...place('burjKhalifa'), 3.4], [...place('burjAlArab'), 2.6], [...place('ainDubai'), 5]];
  const nearLandmark = (x, z) => landmarkSites.some(([lx, lz, r]) => Math.hypot(x - lx, z - lz) < r);
  const towerRecords = [], towerSkips = { landmark: 0, water: 0, road: 0, spacing: 0 };
  for (const [tx, tz, metres, count] of geo.towers) {
    if (nearLandmark(tx, tz)) { towerSkips.landmark++; continue; }
    if (!isLand(tx, tz)) { towerSkips.water++; continue; }
    const seed = Math.round(tx * 91 + tz * 17);
    const h = Math.max(1.4, metres * HEIGHT_SCALE);
    let w = Math.min(1.0, .62 + count * .07) * (.9 + random(seed) * .2), d = w * (.85 + random(seed + 2) * .3);
    let spot = null;
    for (let r = 0; r <= 1.2 && !spot; r += .15) for (let a = 0; a < Math.PI * 2; a += r ? Math.PI / 8 : 7) {
      const nx = tx + Math.cos(a) * r, nz = tz + Math.sin(a) * r;
      if (footprintClear(nx, nz, w + .18, d + .18, .03) && isLand(nx, nz)) { spot = [nx, nz]; break; }
    }
    if (!spot) { towerSkips.road++; continue; }
    // Neighbouring real towers sit closer than one footprint: slim this one until it stands clear of them.
    const overlaps = (x, z, ww, dd) => towerRecords.some(t => Math.abs(t.x - x) < (t.w + ww) / 2 + .06 && Math.abs(t.z - z) < (t.d + dd) / 2 + .06);
    let k = 1;
    while (k > .45 && overlaps(spot[0], spot[1], w * k, d * k)) k -= .1;
    if (k <= .45) { towerSkips.spacing++; continue; }
    w *= k; d *= k;
    const [x, z] = spot;
    if(Math.hypot(x-6.601801948466053,z-53.52819805153395)<.05)continue;
    tower(x, z, w, d, h, seed);
    towerRecords.push({ x, z, h, w, d });
  }
  const urbanType = new Map();
  geo.urbanRows.forEach((row, gz) => {
    let gx = 0;
    for (const match of row.matchAll(/(\d+)([.rcix])/g)) {
      const count = Number(match[1]), type = '.rcix'.indexOf(match[2]);
      if (type) for (let i = 0; i < count; i++) urbanType.set(`${gx + i}:${gz}`, type);
      gx += count;
    }
  });
  const oldDubai = place('oldDubai');
  // The Palm Jumeirah: its land rings, found once by their centroid near the real island.
  const palmCentreReal = toLocal(25.1160, 55.1330);
  const palmRings = geo.land.map((ring, i) => ({ ring, i, c: ring.reduce(([sx, sz], [x, z]) => [sx + x / ring.length, sz + z / ring.length], [0, 0]) }))
    .filter(r => Math.hypot(r.c[0] - palmCentreReal[0], r.c[1] - palmCentreReal[1]) < 12 && r.ring.length >= 8);
  const onPalm = (x, z) => Math.hypot(x - palmCentreReal[0], z - palmCentreReal[1]) < 13 && palmRings.some(({ ring, i }) => { const b = ringBounds[i]; return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && pointInRing(x, z, ring); });
  let sliceStart=performance.now();
  for (const [key, type] of urbanType) {
    if(performance.now()-sliceStart>16){await new Promise(resolve=>setTimeout(resolve,0));sliceStart=performance.now();}
    const [gx, gz] = key.split(':').map(Number);
    const seed = gx * 131 + gz * 17, r = random(seed);
    let x = gx + geo.gridOrigin + .5 + (random(seed + 1) - .5) * .18, z = gz + geo.gridOrigin + .5 + (random(seed + 2) - .5) * .18;
    if (roadCells.has(cellKey(x, z)) || nearLandmark(x, z) || onPalm(x, z)) continue;
    if (towerRecords.some(tower => Math.hypot(tower.x - x, tower.z - z) < .85)) continue;
    let w = .6 + random(seed + 8) * .24, d = .6 + random(seed + 13) * .24;
    const scale = type === 3 ? 1.25 : 1;
    // Keep the block, shrinking or sliding it inside its cell until it clears every road and stands on land.
    let fit = null;
    search: for (const k of [1, .78, .58]) for (const [ox, oz] of [[0, 0], [.18, 0], [-.18, 0], [0, .18], [0, -.18], [.18, .18], [-.18, -.18], [.18, -.18], [-.18, .18]]) {
      const fw = w * k * scale + .22, fd = d * k * scale + .22;
      if (footprintClear(x + ox, z + oz, fw, fd) && onLand(x + ox, z + oz, fw, fd)) { fit = [x + ox, z + oz, k]; break search; }
    }
    if (!fit) continue;
    x = fit[0]; z = fit[1]; w *= fit[2]; d *= fit[2];
    if (!inDetail([x, z])) { if (r < .55) simpleBlock(x, z, w, d, .3 + random(seed + 6) * .5); continue; }
    if (type === 4 && r < .35) continue;
    if (r < .06) { tree(x, z, .5, gx); if (clearOfRoads(x + .3, z - .25, .1)) palm(x + .3, z - .25, .36); continue; }
    const historic = Math.hypot(x - oldDubai[0], z - oldDubai[1]) < 5;
    if (type === 2 && r > .72) tower(x, z, w * .9, d * .9, 1.8 + random(seed + 31) * 1.8, seed);
    else if (type === 3) lowRise(x, z, w * 1.25, d * 1.25, .3 + random(seed + 6) * .3, seed);
    else lowRise(x, z, w, d, historic ? .6 + random(seed + 6) * .8 : type === 2 ? .9 + random(seed + 6) * 1.3 : .7 + random(seed + 6) * 1.0, seed, historic);
    if ((gx * 7 + gz) % 12 === 0 && clearOfRoads(x + w * .7, z + d * .7, .1) && isLand(x + w * .7, z + d * .7)) palm(x + w * .7, z + d * .7, .32 + random(seed + 22) * .12);
  }

  // ---- Atlantis, The Palm at the crescent's apex: two stepped wings joined by the arched centre, facing the trunk.
  {
    const [ax, az] = toLocal(25.1304, 55.1172);
    const yaw = Math.atan2(palmCentreReal[0] - ax, palmCentreReal[1] - az) + Math.PI / 2;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const at = (u, v) => [ax + u * cos + v * sin, az - u * sin + v * cos];
    const part = (u, v, w, h, d, material = mat.ivory) => { const [x, z] = at(u, v); box(material, x, .2 + h / 2, z, w, h, d, yaw); return [x, z]; };
    box(mat.foundation, ax, .115, az, 2.2, .15, .9, yaw);
    for (const side of [-1, 1]) {
      part(side * .62, 0, .62, 1.05, .42);
      part(side * .45, 0, .26, 1.32, .44);
      part(side * .82, 0, .26, .8, .4);
      const [rx, rz] = at(side * .45, 0); box(mat.porcelain, rx, 1.6, rz, .22, .14, .22, yaw);
    }
    part(0, 0, .5, .32, .4);
    part(0, 0, .5, .18, .42, mat.porcelain);
    const [cx, cz] = at(0, 0); box(mat.ivory, cx, 1.42, cz, .62, .34, .46, yaw); box(mat.porcelain, cx, 1.66, cz, .4, .16, .3, yaw);
    litWindows(ax, az, 1.6, .42, 1.1, 777, true);
    footprintBox(ax, az, 2.2, .9, 1.9);
  }

  // ---- Small white villas trace the Palm's fronds and crescent, as before.
  const palmCentre = place('palm');
  for (const ring of geo.land) {
    const centroid = ring.reduce(([sx, sz], [x, z]) => [sx + x / ring.length, sz + z / ring.length], [0, 0]);
    if (Math.hypot(centroid[0] - palmCentreReal[0], centroid[1] - palmCentreReal[1]) > 12 || ring.length < 8) continue;
    let carry = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length], length = Math.hypot(x1 - x0, z1 - z0);
      if (!length) continue;
      const dx = (x1 - x0) / length, dz = (z1 - z0) / length;
      let nx = -dz, nz = dx;
      if ((centroid[0] - x0) * nx + (centroid[1] - z0) * nz < 0) { nx = -nx; nz = -nz; }
      for (let t = carry; t < length; t += .55) {
        const x = x0 + dx * t + nx * .09, z = z0 + dz * t + nz * .09;
        if (!isLand(x, z) || !clearOfRoads(x, z, .1)) continue;
        const yaw = Math.atan2(dx, dz), h = .12 + random(i * 3 + t) * .08;
        box(mat.porcelain, x, .05 + h / 2, z, .11, h, .13, yaw);
        box(mat.ivory, x, .06 + h, z, .13, .02, .15, yaw);
      }
      carry = ((carry - length) % .55 + .55) % .55;
    }
  }

  // ---- Traffic and lamp routes from the real arteries.
  const inCore = ([x, z]) => x >= core.minX && x <= core.maxX && z >= core.minZ && z <= core.maxZ;
  const arteries = roadPolylines.filter(entry => entry.cls <= 1 && entry.points.length > 2 && entry.points.filter(inCore).length > entry.points.length * .6)
    .map(entry => ({ ...entry, length: polylineLength(entry.points), source: entry })).sort((a, b) => b.length - a.length);
  const trafficEntries = arteries.filter(entry => entry.length >= 7).slice(0, 26);
  const trafficLines = roadPolylines.filter(entry=>entry.points.length>=2).map(entry=>{
    const length=polylineLength(entry.points);
    const roof=roundedTowers.find(t=>t.featured);
    const nearRooftop=roof&&entry.points.some(([x,z])=>Math.hypot(x-roof.x,z-roof.z)<12);
    return {points:entry.points,cls:entry.cls,half:roadHalf(entry.cls),entry,
      nearRooftop:Boolean(nearRooftop),carQuota:entry.cls<2?Math.min(100,Math.max(5,Math.ceil(length*2/4))):Math.min(16,Math.max(3,Math.ceil(length*2/4))),
      signalEligible:trafficEntries.some(artery=>artery.source===entry)};
  });
  const trafficPaths = trafficLines.map(entry => Object.assign(toCurve(entry.points, .08, false), { halfWidth: entry.cls === 0 ? .27 : entry.cls === 1 ? .17 : .085 }));
  // Pavements: the white kerb strip of the city arteries, where pedestrians walk.
  const sidewalks = arteries.slice(0, 120).map(entry => ({ curve: toCurve(entry.points, .06, false), offset: roadHalf(entry.cls) - .035, entry: entry.source }));
  // Beach walks: the real coastline beside JBR / the Marina and Jumeirah, nudged a little inland.
  function shoreline(lat, lon, radius) {
    const [cx, cz] = toLocal(lat, lon), walks = [];
    for (const ring of geo.land) {
      let run = [];
      for (const [x, z] of ring) {
        if (Math.hypot(x - cx, z - cz) < radius) run.push([x, z]);
        else { if (run.length > 3) walks.push(run); run = []; }
      }
      if (run.length > 3) walks.push(run);
    }
    return walks;
  }
  const beachWalks = [...shoreline(25.0790, 55.1335, 3.2), ...shoreline(25.2050, 55.2400, 3)];
  const lampRoutes = roadPolylines.filter(entry=>entry.points.length>1).map(entry => Object.assign(toCurve(entry.points, .06, false), { kerb: roadHalf(entry.cls) + .1 }));

  // ---- Districts, camera views and framing.
  const districtSpecs = [
    ['Downtown', 'downtown', .62, .61, 3.6],
    ['Dubai Marina', 'marina', .63, .63, 3.7],
    ['Old Dubai', 'oldDubai', .55, .74, 3.9],
    ['Jumeirah', 'jumeirah', .46, .67, 3.7],
    ['Palm Jumeirah', 'palm', .5, .86, 3.1],
  ];
  const districts = districtSpecs.map(([name, key]) => { const [x, z] = key === 'palm' ? palmCentreReal : place(key); return { name, position: [x, 1.1, z], focus: [x, 1.4, z] }; });
  const views = {
    // The first view opens close on Downtown and the Burj Khalifa, like the district view.
    overview: { yaw: .62, pitch: .66, zoom: 3.12, focus: [districts[0].focus[0], 4.2, districts[0].focus[2]] },
    destinations: districtSpecs.map(([, key, yaw, pitch, zoom], i) => ({ yaw, pitch, zoom, focus: districts[i].focus })),
  };
  const frame = [];
  for (const x of [frameBox.minX, frameBox.maxX]) for (const z of [frameBox.minZ, frameBox.maxZ]) for (const y of [0, 8]) frame.push(new THREE.Vector3(x, y, z));
  frame.push(new THREE.Vector3(place('burjKhalifa')[0], 16, place('burjKhalifa')[1]));

  function setTheme(day) { coast.color.set(day ? '#e9e9ef' : '#3b4f86'); }
  // The city rises out of the flat map during the first seconds.
  function setIntro(value) { const t = Math.max(0, Math.min(1, Number(value) || 0)); world.scale.y = Math.max(.02, 1 - Math.pow(1 - t, 3)); }

  return {
    roundedTowers, buildingCount, trafficPaths, trafficLines, lampRoutes, sidewalks, beachWalks, fitPoints, districts, views, isLand, clearOfRoads, insideBuilding,
    burjPlaza: [...place('burjKhalifa'), 2.32, 2.02], setTheme, setIntro,
    tags: [
      { key: 'burj', name: 'Burj Khalifa', sub: '828 m · the tallest building in the world', at: place('burjKhalifa'), h: 20.2, r: 1.1 },
      { key: 'sail', name: 'Burj Al Arab', sub: 'The sail-shaped hotel on its own island', at: place('burjAlArab'), h: 8.7, r: 1.4 },
      { key: 'wheel', name: 'Ain Dubai', sub: 'The giant observation wheel on Bluewaters', at: place('ainDubai'), h: 8.1, r: 2.6 },
      { key: 'atlantis', name: 'Atlantis, The Palm', sub: 'The resort at the tip of Palm Jumeirah', at: toLocal(25.1304, 55.1172), h: 1.9, r: 1.2 },
    ],
    landmarks: { fitPoints: frame, landmarkCount: 3, pinPoints: landmarkModel.pinPoints, update: time => landmarkModel.update(time) },
    outline: geo.land[0],
    landBounds: { minX: -122, maxX: 122, minZ: -122, maxZ: 122, width: 244, depth: 244 },
    fabricBounds: { ...core },
    stats: { towerCells: geo.towers.length, towersBuilt: towerRecords.length, towerSkips, urbanCells: urbanType.size, roads: geo.roads.length, landRings: geo.land.length, dataSource: 'OpenStreetMap' },
  };
}
