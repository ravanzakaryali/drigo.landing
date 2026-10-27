import * as THREE from './vendor/three.module.min.js';
import { buildTrafficJourneys } from './traffic-network.js';
import { createRooftopScene } from './rooftop-scene.js?v=20261019-no-plants';
import { createRooftopDuo } from './rooftop-duo.js';
import { createCityPeople } from './city-people.js';
import { buildDubaiCity } from './dubai-real-city.js?v=20261019-culling';

/** A live night city on real Dubai geography (OpenStreetMap), lit like a digital twin. */
export async function initCity(host, options = {}) {
  if (!host) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); }
  catch(error) { console.warn('The Drigo map could not start WebGL.',error); return null; }
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#0b1225',118,205);
  const camera = new THREE.OrthographicCamera(-43,43,25,-25,.1,320);
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedQuery.matches;
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 350ms ease;';
  host.appendChild(renderer.domElement);
  const geometries=new Set(), materials=new Set();
  const g=geometry=>(geometries.add(geometry),geometry);
  const m=material=>(materials.add(material),material);
  const standard=(color,extra={})=>m(new THREE.MeshStandardMaterial({color,roughness:.7,...extra}));
  const basic=(color,extra={})=>m(new THREE.MeshBasicMaterial({color,...extra}));
  const mat={
    land:standard('#fafafa'), ivory:standard('#f5f5f3'), porcelain:standard('#ffffff'),
    stone:standard('#d7d9df'),concrete:standard('#e0e1e7'),graphite:standard('#aeb4c0'),dark:standard('#858b99'),
    glass:standard('#b6bdc8',{roughness:.3,metalness:.27}),glassLight:standard('#d7dce3',{roughness:.35,metalness:.2}),
    window:standard('#aeb5c1',{roughness:.38,metalness:.14}),windowDark:standard('#aab2bf'),
    road:standard('#aeb0bc'),localRoad:standard('#c7c9d2'),pavement:standard('#f7f7fa'),foundation:standard('#d4d6de'),
    median:standard('#c4cebd'),chalk:standard('#f1eee6'),greenery:standard('#4f8a45'),greeneryLight:standard('#6aa35a'),
    trunk:standard('#c5c1b8'),water:basic('#d5cefa',{toneMapped:false,fog:false}),
    violet:standard('#74707d'),whiteGlow:basic('#fff4df',{toneMapped:false}),carRed:basic('#ff4d5b',{toneMapped:false}),tyre:standard('#555967',{roughness:.9}),
    warmLight:basic('#ffe2af',{toneMapped:false,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
    coolLight:basic('#d6e6f7',{toneMapped:false,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
    lampLight:basic('#ffd9a4',{toneMapped:false,transparent:true,opacity:0,depthWrite:false}),
    beacon:basic('#ff3b4e',{toneMapped:false,transparent:true,opacity:0,depthWrite:false}),
  };
  // One shared scene clock drives independent, slow apartment-light schedules.
  // Shader time stops together with traffic when paused, hidden or motion reduced.
  const windowTime={value:0},windowTimings=[];
  for(const material of [mat.warmLight,mat.coolLight]) {
    material.onBeforeCompile=shader=>{
      shader.uniforms.uWindowTime=windowTime;
      shader.vertexShader='attribute vec4 aWindowTiming; uniform float uWindowTime; varying float vWindowFade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float windowPhase=mod(uWindowTime+aWindowTiming.x,aWindowTiming.y);
        vWindowFade=smoothstep(0.0,aWindowTiming.w,windowPhase)*(1.0-smoothstep(aWindowTiming.z-aWindowTiming.w,aWindowTiming.z,windowPhase));`);
      shader.fragmentShader='varying float vWindowFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a *= vWindowFade;');
    };
    material.customProgramCacheKey=()=> 'drigo-independent-window-lights-v1';
  }
  // Street lamps breathe and car lamps brake on their own schedules, driven by the
  // same clock as the windows. aLightTiming = offset, period, depth, mode
  // (0 lamp: slow dimming with a rare short dip; 1 brake: taillights brighten;
  // 2 headlight: a gentle breathe only; 3 beacon: a short aviation blink;
  // 4 glint: a brief sparkle on the water).
  const lightNight={value:1},lightTimings={lamps:[],headlights:[],taillights:[],beacons:[],glints:[]};
  const lightLevelGlsl=`attribute vec4 aLightTiming; uniform float uWindowTime; uniform float uLightNight; varying float vLightLevel;
    float drigoLightLevel(){
      if(aLightTiming.w>4.5)return aLightTiming.z;
      if(aLightTiming.y<=0.0)return 1.0;
      float phase=mod(uWindowTime+aLightTiming.x,aLightTiming.y)/aLightTiming.y;
      float level;
      if(aLightTiming.w>3.5){
        float s=sin(phase*3.1415927);level=mix(1.0-aLightTiming.z,1.0,pow(s*s,6.0));
      } else if(aLightTiming.w>2.5){
        level=mix(1.0-aLightTiming.z,1.0,smoothstep(0.0,.03,phase)*(1.0-smoothstep(.1,.16,phase)));
      } else if(aLightTiming.w<0.5||aLightTiming.w>1.5){
        float breathe=.5+.5*sin(phase*6.2831853);
        float dip=aLightTiming.w<0.5?smoothstep(.9,.93,phase)*(1.0-smoothstep(.95,.98,phase)):0.0;
        level=(1.0-aLightTiming.z*breathe)*(1.0-.75*dip);
      } else {
        float brake=smoothstep(.62,.66,phase)*(1.0-smoothstep(.8,.86,phase));
        level=mix(1.0-aLightTiming.z,1.0,brake);
      }
      return mix(1.0,level,uLightNight);
    }
`;
  function lightTiming(group,index,period,depth,mode) {
    const seed=index*2.39996323+group.length*.0001+(mode?11.3:5.1)+period[0];
    const rand=n=>{const v=Math.sin(seed*78.23+n*37.71)*43758.5453;return v-Math.floor(v);};
    const timing=[rand(1)*period[1],period[0]+rand(2)*(period[1]-period[0]),depth[0]+rand(3)*(depth[1]-depth[0]),mode];
    group.push(timing);return timing;
  }
  function timedGeometry(geometry,timings) {
    const clone=g(geometry.clone()),values=new Float32Array(timings.length*4);
    timings.forEach((timing,i)=>values.set(timing,i*4));
    clone.setAttribute('aLightTiming',new THREE.InstancedBufferAttribute(values,4));return clone;
  }
  function timeBasicLight(material,key) {
    material.onBeforeCompile=shader=>{
      shader.uniforms.uWindowTime=windowTime;shader.uniforms.uLightNight=lightNight;
      shader.vertexShader=lightLevelGlsl+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vLightLevel=drigoLightLevel();');
      shader.fragmentShader='varying float vLightLevel;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= vLightLevel; diffuseColor.a *= mix(1.0,vLightLevel,step(.5,float('+(material.transparent?1:0)+')));');
    };
    material.customProgramCacheKey=()=>key;
  }
  timeBasicLight(mat.lampLight,'drigo-timed-lamp-v1');timeBasicLight(mat.beacon,'drigo-timed-beacon-v1');timeBasicLight(mat.carRed,'drigo-timed-taillight-v1');
  function softGlow(color,opacity) {
    return m(new THREE.ShaderMaterial({
      uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:opacity},uWindowTime:windowTime,uLightNight:lightNight},
      vertexShader:lightLevelGlsl+'varying vec2 vGlowUv; void main(){vGlowUv=uv; vLightLevel=drigoLightLevel(); gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 uColor; uniform float uOpacity; varying vec2 vGlowUv; varying float vLightLevel; void main(){float radius=length((vGlowUv-.5)*2.0); float alpha=pow(max(0.0,1.0-radius),2.2)*uOpacity*vLightLevel; gl_FragColor=vec4(uColor,alpha); #include <colorspace_fragment> }'.replace('#include <colorspace_fragment>','\n#include <colorspace_fragment>\n'),
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,
    }));
  }
  const roadGlow=softGlow('#f7be73',0),headlightGlow=softGlow('#fff0cb',0),taillightGlow=softGlow('#ff4755',0);
  const beaconGlow=softGlow('#ff3348',0),waterGlint=softGlow('#cdbfff',0);
  const unitWindow=g(new THREE.PlaneGeometry(1,1));
  const unitBox=g(new THREE.BoxGeometry(1,1,1)),cylinder=g(new THREE.CylinderGeometry(1,1,1,8)),sphere=g(new THREE.IcosahedronGeometry(1,0));
  const dummy=new THREE.Object3D(),world=new THREE.Group();scene.add(world);
  const ambient=new THREE.HemisphereLight(0xffffff,0x9b96af,1.15);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xfffdf8,3.2);key.position.set(-38,57,31);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-82,right:82,top:77,bottom:-77,near:.5,far:180});
  key.shadow.bias=-.00012;key.shadow.normalBias=.018;key.shadow.radius=3;key.target.position.set(5,0,0);scene.add(key,key.target);
  const rim=new THREE.DirectionalLight(0xd1d4ef,.38);rim.position.set(20,35,-45);scene.add(rim);
  const front=new THREE.DirectionalLight(0xffffff,.18);front.position.set(35,15,40);scene.add(front);
  const batches=new Map(),towerTops=[];
  function instance(geometry,material,position,scale=[1,1,1],rotation=[0,0,0],shadow=true) {
    const id=`${geometry.uuid}:${material.uuid}:${shadow}`;
    if(!batches.has(id))batches.set(id,{geometry,material,matrices:[],shadow});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();
    batches.get(id).matrices.push(dummy.matrix.clone());
  }
  const box=(material,x,y,z,w,h,d,rotation=0,shadow=true)=> {
    if(material===mat.warmLight||material===mat.coolLight) {
      const side=w<d;
      return instance(unitWindow,material,[x,y,z],[side?d:w,h,1],[0,rotation+(side?Math.PI/2:0),0],false);
    }
    if(h>=4.2&&shadow)towerTops.push([x,y+h/2,z]);
    return instance(unitBox,material,[x,y,z],[w,h,d],[0,rotation,0],shadow);
  };
  function mesh(geometry,material,x=0,y=0,z=0,shadow=true) {
    const node=new THREE.Mesh(geometry,material);node.position.set(x,y,z);node.castShadow=shadow;node.receiveShadow=true;world.add(node);return node;
  }
  function footprint(points,depth,bevel=0) {
    const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const geometry=g(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:4}));
    geometry.rotateX(-Math.PI/2);return geometry;
  }
  const curve=(points,closed=true,height=.12)=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],height,p[1])),closed,'catmullrom',.2);
  function ribbon(path,width,material,yOffset=0,resolution=90,xOffset=0) {
    const vertices=[],normals=[],indices=[];
    for(let i=0;i<=resolution;i++) {
      const p=path.getPointAt(i/resolution),t=path.getTangentAt(i/resolution);
      for(const sign of[-1,1]){const o=sign*width/2+xOffset;vertices.push(p.x-t.z*o,p.y+yOffset,p.z+t.x*o);normals.push(0,1,0);}
      if(i<resolution){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geometry=g(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
    return mesh(geometry,material,0,0,0,false);
  }
  function road(path,width,dashes=40) {
    ribbon(path,width+.27,mat.porcelain,-.012,Math.max(32,Math.min(180,dashes)));
    ribbon(path,width,mat.road,0,Math.max(32,Math.min(180,dashes)));
    for(let i=0;i<dashes;i++) {const p=path.getPointAt(i/dashes),t=path.getTangentAt(i/dashes);box(mat.porcelain,p.x,p.y+.009,p.z,.021,.008,.23,Math.atan2(t.x,t.z),false);}
  }
  // Vegetation is disabled across streets and landmarks.
  const tree=()=>{}, palm=()=>{};
  const context={THREE,world,g,m,standard,mat,mesh,footprint,curve,road,ribbon,box,instance,cylinder,sphere,palm,tree,windowTime,lightNight};
  const fabric=await buildDubaiCity(context);
  const landmarkModel=fabric.landmarks;
  const districtList=fabric.districts;
  const pinWorld=districtList.map(d=>new THREE.Vector3(...d.position));
  const rings=[];
  const totalBuildingCount=fabric.buildingCount+landmarkModel.landmarkCount;
  const newBuildingCount=fabric.buildingCount;
  const landBounds=fabric.landBounds;
  const trafficRoutes=[...fabric.trafficPaths];
  // Feathered warm light pools follow the city roads, not only the coast.
  const lightPool=g(new THREE.CircleGeometry(1,20));lightPool.rotateX(-Math.PI/2);
  const roadLightSites=new Set();
  const lightingRoutes=fabric.lampRoutes;
  for(let routeIndex=0;routeIndex<lightingRoutes.length;routeIndex++) {
    const route=lightingRoutes[routeIndex],count=Math.max(2,Math.ceil(route.getLength()/1.6));
    for(let i=0;i<count;i++) {
      const p=route.getPointAt((i+.35)/count),t=route.getTangentAt((i+.35)/count);
      const side=(i+routeIndex)%2?1:-1,offset=route.kerb||.45;
      const x=p.x-t.z*offset*side,z=p.z+t.x*offset*side;
      const site=Math.round(x*1.1)+':'+Math.round(z*1.1);
      if(roadLightSites.has(site)||!fabric.isLand(x,z)||(fabric.clearOfRoads&&!fabric.clearOfRoads(x,z,.02)))continue;
      roadLightSites.add(site);
      lightTimings.lamps.push([0,0,0,0]);
      instance(cylinder,mat.graphite,[x,.27,z],[.011,.5,.011]);
      instance(sphere,mat.lampLight,[x,.53,z],[.052,.032,.052],[0,0,0],false);
      instance(lightPool,roadGlow,[x+t.z*.18*side,p.y+.025,z-t.x*.18*side],[.7,1,.95],[0,Math.atan2(t.x,t.z),0],false);
    }
  }
  // Long-exposure traffic streams: warm headlight streaks flow one way and red
  // tail streaks the other, merged into one ribbon that runs on the scene clock.
  const trailPositions=[],trailUvs=[],trailIndices=[];
  for(const [routeIndex,route] of trafficRoutes.entries()) {
    const length=route.getLength(),steps=Math.max(40,Math.ceil(length*2.2)),base=trailPositions.length/3;
    for(let i=0;i<=steps;i++) {
      const p=route.getPointAt(i/steps),t=route.getTangentAt(i/steps);
      const half=route.halfWidth||.2;
      for(const o of[-half,half]){trailPositions.push(p.x-t.z*o,p.y+.01,p.z+t.x*o);trailUvs.push(i/steps*length+routeIndex*1.713,o<0?0:1);}
      if(i<steps){const a=base+i*2;trailIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
  }
  const trailGeometry=g(new THREE.BufferGeometry());
  trailGeometry.setAttribute('position',new THREE.Float32BufferAttribute(trailPositions,3));
  trailGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(trailUvs,2));trailGeometry.setIndex(trailIndices);
  const trailMaterial=m(new THREE.ShaderMaterial({
    uniforms:{uWindowTime:windowTime,uOpacity:{value:0}},
    vertexShader:'varying vec2 vTrailUv; void main(){vTrailUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float uWindowTime; uniform float uOpacity; varying vec2 vTrailUv;
      void main(){
        float lane=step(.5,vTrailUv.y), across=abs(fract(vTrailUv.y*2.0)-.5)*2.0;
        float dir=lane>.5?-1.0:1.0, speed=lane>.5?1.7:2.3;
        float flow=fract(vTrailUv.x*.13+dir*uWindowTime*speed*.13+lane*.37);
        float streak=pow(smoothstep(.0,.55,flow)*(1.0-smoothstep(.55,.62,flow)),1.6);
        float band=1.0-smoothstep(.25,1.0,across);
        vec3 color=mix(vec3(1.0,.86,.62),vec3(1.0,.24,.3),lane);
        gl_FragColor=vec4(color,(.12+.88*streak)*band*uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,
  }));
  const trails=new THREE.Mesh(trailGeometry,trailMaterial);trails.renderOrder=2;trails.visible=false;world.add(trails);
  // Red aviation beacons blink on the tallest roofs; each keeps its own rhythm.
  const beaconSites=new Map();
  for(const[x,top,z]of towerTops.sort((a,b)=>b[1]-a[1])) {
    const site=Math.round(x/1.6)+':'+Math.round(z/1.6);
    if(beaconSites.has(site)||beaconSites.size>=84||top<5.2)continue;
    beaconSites.set(site,true);
    lightTiming(lightTimings.beacons,beaconSites.size,[1.9,3.4],[.9,.94],3);
    instance(sphere,mat.beacon,[x,top+.07,z],[.07,.07,.07],[0,0,0],false);
    instance(lightPool,beaconGlow,[x,top+.02,z],[.62,1,.62],[0,0,0],false);
  }
  // Moonlit glints sparkle across the Gulf; the real coastline keeps them off the land.
  for(let i=0,tries=0;i<0&&tries<1500;tries++) {
    const r=n=>{const v=Math.sin(tries*12.9898+n*78.233)*43758.5453;return v-Math.floor(v);};
    const x=-80+r(1)*78,z=-108+r(2)*216;
    if(fabric.isLand(x,z))continue;
    lightTiming(lightTimings.glints,i,[2.6,7.5],[.96,1],4);
    instance(lightPool,waterGlint,[x,.012,z],[.16+r(3)*.2,1,.5+r(4)*.7],[0,.4,0],false);
    i++;
  }
  for(const batch of batches.values()) {
    let geometry=batch.geometry;
    if(batch.material===mat.warmLight||batch.material===mat.coolLight) {
      geometry=g(batch.geometry.clone());
      const values=new Float32Array(batch.matrices.length*4);
      for(let i=0;i<batch.matrices.length;i++) {
        const index=windowTimings.length,seed=index*1.61803398875+3.7;
        const rand=n=>{const v=Math.sin(seed*91.17+n*43.73)*43758.5453;return v-Math.floor(v);};
        const period=180+rand(1)*420,onDuration=period*(.62+rand(2)*.25),fade=4+rand(3)*6;
        const timing=[rand(4)*period,period,onDuration,fade];
        windowTimings.push(timing);values.set(timing,i*4);
      }
      geometry.setAttribute('aWindowTiming',new THREE.InstancedBufferAttribute(values,4));
    }
    if(batch.material===mat.lampLight||batch.material===roadGlow)geometry=timedGeometry(batch.geometry,lightTimings.lamps);
    if(batch.material===mat.beacon||batch.material===beaconGlow)geometry=timedGeometry(batch.geometry,lightTimings.beacons);
    if(batch.material===waterGlint)geometry=timedGeometry(batch.geometry,lightTimings.glints);
    const node=new THREE.InstancedMesh(geometry,batch.material,batch.matrices.length);
    batch.matrices.forEach((matrix,i)=>node.setMatrixAt(i,matrix));node.castShadow=batch.shadow;node.receiveShadow=true;node.computeBoundingSphere();world.add(node);
  }
  // Static architectural fragments share draw calls by material; the live wheel
  // remains a separate group so its actual geometry continues to rotate.
  const groups=new Map();
  for(const node of [...world.children]) {
    if(!node.isMesh||node.isInstancedMesh||Array.isArray(node.material)||node.material.transparent)continue;
    const id=`${node.material.uuid}:${node.castShadow}:${node.receiveShadow}`;if(!groups.has(id))groups.set(id,[]);node.updateMatrix();groups.get(id).push(node);
  }
  const vp=new THREE.Vector3(),vn=new THREE.Vector3(),nm=new THREE.Matrix3();
  for(const nodes of groups.values()) {
    if(nodes.length<2)continue;const count=nodes.reduce((n,node)=>n+(node.geometry.index?.count||node.geometry.attributes.position.count),0);
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3);let cursor=0;
    for(const node of nodes){const geo=node.geometry;if(!geo.attributes.normal)geo.computeVertexNormals();const pos=geo.attributes.position,nor=geo.attributes.normal,index=geo.index,num=index?.count||pos.count,mirrored=node.matrix.determinant()<0;nm.getNormalMatrix(node.matrix);
      for(let i=0;i<num;i++){const order=mirrored?i-i%3+(i%3===1?2:i%3===2?1:0):i;const source=index?index.getX(order):order;vp.fromBufferAttribute(pos,source).applyMatrix4(node.matrix);vn.fromBufferAttribute(nor,source).applyMatrix3(nm).normalize();vp.toArray(positions,cursor);vn.toArray(normals,cursor);cursor+=3;}world.remove(node);}
    const geo=g(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.computeBoundingSphere();const node=new THREE.Mesh(geo,nodes[0].material);node.castShadow=nodes[0].castShadow;node.receiveShadow=nodes[0].receiveShadow;world.add(node);
  }
  // Vehicles share geometry and are independently animated along real curves.
  const carCount = fabric.trafficLines.reduce((sum,line)=>sum+line.carQuota,0);
  function roundedCarBody(width, length, depth, radius) {
    const s = new THREE.Shape(), x = -width / 2, z = -length / 2;
    s.moveTo(x + radius, z);
    s.lineTo(x + width - radius, z); s.quadraticCurveTo(x + width, z, x + width, z + radius);
    s.lineTo(x + width, z + length - radius); s.quadraticCurveTo(x + width, z + length, x + width - radius, z + length);
    s.lineTo(x + radius, z + length); s.quadraticCurveTo(x, z + length, x, z + length - radius);
    s.lineTo(x, z + radius); s.quadraticCurveTo(x, z, x + radius, z);
    const geometry = g(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.024, bevelSegments: 2, steps: 1, curveSegments: 3 }));
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
  // Luxury sports cars: a low wedge body drawn as a side profile and extruded across the width,
  // a teardrop glass canopy set back, big wheels, LED light strips and a small rear wing.
  function profileBody(points, width, bevel) {
    const shape = new THREE.Shape(); points.forEach(([z, y], i) => i ? shape.lineTo(z, y) : shape.moveTo(z, y)); shape.closePath();
    const geometry = g(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 2, steps: 1 }));
    geometry.translate(0, 0, -width / 2); geometry.rotateY(-Math.PI / 2); return geometry;
  }
  // Six luxury models, each its own side profile, glass canopy and stance (per-unit dims before car.scale).
  //   z runs nose (+) to tail (-); y is height. trim = grille colour (null = none).
  const MODELS = [
    { key: 'lambo', share: .2, body: [[.47, .045], [.48, .085], [.36, .105], [.12, .128], [-.3, .132], [-.43, .128], [-.47, .118], [-.47, .045], [-.34, .03], [.36, .03]], width: .42,
      cabin: [[.12, .128], [.0, .19], [-.1, .2], [-.2, .19], [-.33, .135], [-.33, .128]], cabinW: .3, roof: [.222, -.1, .27, .15], wing: [.19, -.43, .42, .07],
      wheel: .088, axle: .29, track: .21, head: [.112, .485, .13, .016], tail: [.13, -.49, .19, .02], trim: null,
      paints: ['#f2c200', '#4fae2b', '#ff6a00', '#f4f4f2', '#141519', '#c0172b'] },
    { key: 'gwagon', share: .2, body: [[.44, .06], [.45, .2], [.36, .21], [-.42, .21], [-.45, .2], [-.45, .06], [-.32, .04], [.32, .04]], width: .42,
      cabin: [[.3, .21], [.27, .33], [-.41, .33], [-.43, .21]], cabinW: .41, roof: [.335, -.07, .42, .74], wing: null,
      wheel: .1, axle: .3, track: .21, head: [.17, .455, .07, .05], tail: [.19, -.455, .05, .08], trim: '#0d0e12',
      paints: ['#141519', '#141519', '#f4f4f2', '#5a5f6b', '#4a5240', '#9aa1ad'] },
    { key: 'bmw', share: .18, body: [[.47, .05], [.48, .1], [.32, .125], [-.4, .13], [-.47, .12], [-.47, .05], [-.34, .035], [.34, .035]], width: .41,
      cabin: [[.2, .13], [.06, .22], [-.16, .225], [-.31, .135]], cabinW: .35, roof: [.228, -.05, .3, .2], wing: null,
      wheel: .082, axle: .3, track: .2, head: [.11, .485, .12, .02], tail: [.125, -.49, .12, .022], trim: '#0d0e12',
      paints: ['#141519', '#f4f4f2', '#1f4fd1', '#5a5f6b', '#9aa1ad', '#3b6fd8'] },
    { key: 'rolls', share: .12, body: [[.51, .06], [.52, .15], [.42, .17], [-.44, .17], [-.51, .16], [-.51, .06], [-.37, .04], [.37, .04]], width: .43,
      cabin: [[.18, .17], [.05, .26], [-.25, .265], [-.39, .175]], cabinW: .37, roof: [.27, -.1, .35, .27], wing: null,
      wheel: .095, axle: .33, track: .21, head: [.14, .51, .1, .025], tail: [.15, -.515, .08, .04], trim: '#d9dce3',
      paints: ['#141519', '#f4f4f2', '#5b1f2b', '#2a3550', '#e8e3d6'] },
    { key: 'porsche', share: .15, body: [[.45, .05], [.47, .09], [.3, .115], [-.38, .13], [-.46, .11], [-.46, .05], [-.32, .03], [.32, .03]], width: .4,
      cabin: [[.14, .13], [.0, .205], [-.12, .21], [-.38, .13]], cabinW: .31, roof: [.214, -.06, .26, .1], wing: [.152, -.44, .36, .05],
      wheel: .085, axle: .28, track: .2, head: [.105, .465, .1, .03], tail: [.128, -.465, .34, .016], trim: null,
      paints: ['#c9ccd2', '#f4f4f2', '#c0172b', '#d9d4c7', '#141519', '#3a7bd5'] },
    { key: 'rangerover', share: .15, body: [[.46, .06], [.47, .17], [.36, .19], [-.42, .19], [-.47, .18], [-.47, .06], [-.33, .04], [.33, .04]], width: .42,
      cabin: [[.24, .19], [.13, .3], [-.41, .3], [-.45, .19]], cabinW: .4, roof: [.305, -.1, .39, .56], wing: null,
      wheel: .1, axle: .31, track: .21, head: [.16, .475, .12, .018], tail: [.17, -.475, .14, .02], trim: '#0d0e12',
      paints: ['#141519', '#f4f4f2', '#5a5f6b', '#2a3550', '#9aa1ad'] },
  ];
  const silverCar = standard('#ffffff', { metalness: 0.55, roughness: 0.32 });
  const trimMaterial = standard('#ffffff', { metalness: 0.6, roughness: 0.3 });
  // Assign a model to every car up front, so each model gets an instanced body and canopy of the right size.
  const carModels = [];
  for (let i = 0; i < carCount; i++) { let r = Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453 % 1), k = 0; while (k < MODELS.length - 1 && r > MODELS[k].share) { r -= MODELS[k].share; k++; } carModels.push(k); }
  MODELS.forEach((model, k) => {
    model.count = carModels.filter(index => index === k).length;
    model.bodyMesh = new THREE.InstancedMesh(profileBody(model.body, model.width, .012), silverCar, Math.max(1, model.count));
    model.bodyMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, model.count) * 3), 3);
    model.cabinMesh = new THREE.InstancedMesh(profileBody(model.cabin, model.cabinW, .008), mat.glass, Math.max(1, model.count));
    model.bodyMesh.count = model.cabinMesh.count = model.count;
  });
  const wheelGeometry = g(new THREE.CylinderGeometry(0.088, 0.088, 0.062, 14));
  wheelGeometry.rotateZ(Math.PI / 2);
  const drigoLogoTexture = new THREE.TextureLoader().load("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTgiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA5OCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzUwN18xNTY2KSI+CjxwYXRoIGQ9Ik0xNi40ODY2IDEyLjc1ODhWMEgyMS40MzgyVjIwLjcyNTZIMTYuNDI1N0MxNi40NDc0IDIwLjYyODggMTYuNDU2MSAyMC41MzE5IDE2LjQ1NjEgMjAuNDM1MUMxNi40NTYxIDIwLjM3NjEgMTYuNDY0OCAyMC4zMDg4IDE2LjQ4NjYgMjAuMjMzQzE2LjQ4NjYgMjAuMTk1MSAxNi40ODY2IDIwLjE2NTYgMTYuNDg2NiAyMC4xNDQ1QzE2LjQ4NjYgMjAuMDY4NyAxNi40ODY2IDIwLjAwMTQgMTYuNDg2NiAxOS45NDI0QzE2LjQ4NjYgMTkuODY2NiAxNi40ODY2IDE5Ljc5OTIgMTYuNDg2NiAxOS43NDAzQzE2LjQ4NjYgMTkuNzAyNCAxNi40ODY2IDE5LjY2NDUgMTYuNDg2NiAxOS42MjY2QzE2LjQ2NDggMTkuNTY3NiAxNi40NTYxIDE5LjUwMDMgMTYuNDU2MSAxOS40MjQ1QzE2LjQ1NjEgMTkuMzI3NiAxNi40NDc0IDE5LjIzMDggMTYuNDI1NyAxOS4xMzM5QzE2LjIyNTUgMTcuODgzMyAxNS42ODE2IDE2LjgzNDggMTQuNzg1MyAxNS45ODg1QzEzLjY0OTYgMTQuODg5NCAxMi4yODc3IDE0LjM0MiAxMC42OTk1IDE0LjM0MkM5LjI0NjI1IDE0LjM0MiA3Ljk4ODc2IDE0Ljc5MjYgNi45MjcwNyAxNS42OTc5QzUuODYxMDMgMTYuNjAzMiA1LjIyMTQxIDE3Ljc0ODYgNS4wMDM4NSAxOS4xMzM5QzQuOTI1NTMgMTkuNjcyOSA0LjkyNTUzIDIwLjIwMzUgNS4wMDM4NSAyMC43MjE0QzUuMjIxNDEgMjIuMTA2OCA1Ljg2NTM4IDIzLjI1MjEgNi45MjcwNyAyNC4xNTc0QzcuOTkzMTEgMjUuMDYyOCA5LjI1MDYgMjUuNTEzMyAxMC42OTk1IDI1LjUxMzNDMTAuNzM4NyAyNS41MTMzIDEwLjc3NzkgMjUuNTEzMyAxMC44MTcgMjUuNTEzM0MxMC44NTYyIDI1LjUxMzMgMTAuODg2NiAyNS41MTMzIDEwLjkwODQgMjUuNTEzM0MxMC45NDc2IDI1LjUxMzMgMTAuOTg2NyAyNS41MTMzIDExLjAyNTkgMjUuNTEzM0MxMS4wNjUgMjUuNTEzMyAxMS4wOTU1IDI1LjUxMzMgMTEuMTE3MiAyNS41MTMzQzExLjEzOSAyNS41MTMzIDExLjE1NjQgMjUuNTEzMyAxMS4xNzgyIDI1LjUxMzNDMTEuMTk5OSAyNS40OTIzIDExLjIxNzMgMjUuNDgzOCAxMS4yMzkxIDI1LjQ4MzhDMTEuMzc4MyAyNS40ODM4IDExLjUwODkgMjUuNDc1NCAxMS42MjYzIDI1LjQ1NDRDMTEuNjY1NSAyNS40MzMzIDExLjcwNDcgMjUuNDI0OSAxMS43NDM4IDI1LjQyNDlDMTEuNzY1NiAyNS40MjQ5IDExLjc5MTcgMjUuNDI0OSAxMS44MzUyIDI1LjQyNDlDMTEuODM1MiAyNS40MDM4IDExLjg0MzkgMjUuMzk1NCAxMS44NjU3IDI1LjM5NTRDMTEuODg3NCAyNS4zOTU0IDExLjkwNDggMjUuMzk1NCAxMS45MjY2IDI1LjM5NTRDMTEuOTY1NyAyNS4zNzQ0IDEyLjAwNDkgMjUuMzY1OSAxMi4wNDQxIDI1LjM2NTlDMTIuMTA1IDI1LjM0NDkgMTIuMTYxNSAyNS4zMjggMTIuMjIyNCAyNS4zMDdDMTIuMjYxNiAyNS4zMDcgMTIuMzAwOCAyNS4yOTg2IDEyLjMzOTkgMjUuMjc3NUMxMi44NTc3IDI1LjE0MjggMTMuMzUzOCAyNC45MzIyIDEzLjgzMjQgMjQuNjQxN0MxNC42Mjg2IDI0LjE2MTYgMTUuNDgxNSAyMy45MjE2IDE2LjM5OTYgMjMuOTIxNkgxNi41NzhDMTcuOTMxMiAyMy45MjE2IDE5LjA3OTkgMjQuMzgwNiAyMC4wMjQxIDI1LjI5NDRDMjAuOTY4MyAyNi4yMDgxIDIxLjQ0MjYgMjcuMzExMyAyMS40NDI2IDI4LjU5OThWMzAuMzAxSDE2LjQ5MDlWMjcuMDk2NkMxNi4zMTI2IDI3LjM4NzEgMTYuMTEyNCAyNy42NTY2IDE1Ljg5NDggMjcuOTA1MUMxNS44MzM5IDI3Ljk2NCAxNS43Nzc0IDI4LjAxODggMTUuNzE2NCAyOC4wNzc3QzE1LjY3NzMgMjguMTM2NyAxNS42MjUxIDI4LjE5MTQgMTUuNTY4NSAyOC4yNTAzQzE1LjU0NjcgMjguMjcxNCAxNS41MjkzIDI4LjI4ODIgMTUuNTA3NiAyOC4zMDkzQzE0LjgzMzIgMjguOTYyIDE0LjA3MTcgMjkuNDU4OSAxMy4yMjc2IDI5Ljc5NTdDMTIuMzgzNCAzMC4xMzI2IDExLjU0MzcgMzAuMzAxIDEwLjcwODIgMzAuMzAxQzcuODg0MzMgMzAuMzAxIDUuNDY5NDMgMjkuMzkxNSAzLjQ1OTE4IDI3LjU3MjRDMS40NDg5NCAyNS43NTMzIDAuMzA4OTMzIDIzLjQ2NjkgMC4wMzA0NTgyIDIwLjcxNzJDMC4wMzA0NTgyIDIwLjY1ODMgMC4wMzA0NTgyIDIwLjYwMzUgMC4wMzA0NTgyIDIwLjU0NDZDMC4wMDg3MDIzNSAyMC40Njg4IDAgMjAuNDAxNCAwIDIwLjM0MjRDMCAyMC4zMjE0IDAgMjAuMzA0NSAwIDIwLjI4MzVDMCAyMC4yNDU2IDAgMjAuMjA3NyAwIDIwLjE2OThDMCAyMC4xMzE5IDAgMjAuMTAyNCAwIDIwLjA4MTRDMCAyMC4wNjAzIDAgMjAuMDUxOSAwIDIwLjA1MTlDMCAxOS44NzkyIDAgMTkuNzA2NiAwIDE5LjUzNEMwIDE5LjQ1ODIgMC4wMDg3MDIzNSAxOS4zOTA4IDAuMDMwNDU4MiAxOS4zMzE4QzAuMDMwNDU4MiAxOS4yNTYxIDAuMDMwNDU4MiAxOS4xODg3IDAuMDMwNDU4MiAxOS4xMjk3QzAuMzA4OTMzIDE2LjM5NjkgMS40NTMyOSAxNC4xMTQ2IDMuNDU5MTggMTIuMjg3MkM1LjQ2OTQzIDEwLjQ1OTcgNy44ODQzMyA5LjU0NTkxIDEwLjcwODIgOS41NDU5MUMxMS41NDM3IDkuNTQ1OTEgMTIuMzgzNCA5LjcxODU2IDEzLjIyNzYgMTAuMDYzOEMxNC4wNzE3IDEwLjQwOTEgMTQuODMzMiAxMC45MDE4IDE1LjUwNzYgMTEuNTM3NkMxNS41MjkzIDExLjU1ODcgMTUuNTQ2NyAxMS41ODM5IDE1LjU2ODUgMTEuNjI2MUMxNS42Mjk0IDExLjY4NSAxNS42NzczIDExLjczMTMgMTUuNzE2NCAxMS43NjkyQzE1Ljc3NzQgMTEuODI4MiAxNS44MzM5IDExLjg4MjkgMTUuODk0OCAxMS45NDE5QzE2LjExMjQgMTIuMTkwMyAxNi4zMTI2IDEyLjQ1OTggMTYuNDkwOSAxMi43NTAzTDE2LjQ4NjYgMTIuNzU4OFpNMjkuMzc0OCAxMy4xMDQxQzMwLjM4ODYgMTIuMDA1IDMxLjYxMTMgMTEuMTQxOCAzMy4wNDI4IDEwLjUwNkMzNC40NzQ0IDkuODcwMTUgMzUuOTk3MyA5LjU1NDM0IDM3LjYwNzIgOS41NTQzNEMzOS4zNTY0IDkuNTU0MzQgNDAuNzcwNSA5Ljg0NDg4IDQxLjg0MDkgMTAuNDIxOEwzOS4yNDc2IDE0Ljc4QzM4LjgyOTkgMTQuNDg5NCAzOC4yODE2IDE0LjM0NjIgMzcuNjA3MiAxNC4zNDYySDM3LjU0NjNDMzUuMjQwMiAxNC40MDUyIDMzLjI5OTUgMTUuMTkyNiAzMS43Mjg4IDE2LjcxMjdDMzAuMTU4IDE4LjIzMjggMjkuMzcwNCAyMC4wODE0IDI5LjM3MDQgMjIuMjU0MVYzMC4zMDk0SDI0LjQxODhWOS41NTQzNEgyOS4zNzA0VjEzLjEwNDFIMjkuMzc0OFpNNDQuNDk5NSAzMC4zMDk0VjkuNTU0MzRINDkuNDUxMVYzMC4zMDk0SDQ0LjQ5OTVaTTQ2Ljk3NTMgMEM0Ny44ODkgMCA0OC42NzY2IDAuMzExNiA0OS4zMzM2IDAuOTM5MDExQzQ5Ljk5MDYgMS41NjY0MiA1MC4zMTcgMi4zMjg1OCA1MC4zMTcgMy4yMzM5QzUwLjMxNyA0LjExODE4IDQ5Ljk5MDYgNC44ODAzMyA0OS4zMzM2IDUuNTE2MTdDNDguNjc2NiA2LjE1MiA0Ny44OTM0IDYuNDY3ODEgNDYuOTc1MyA2LjQ2NzgxQzQ2LjA2MTUgNi40Njc4MSA0NS4yNzQgNi4xNTIgNDQuNjE2OSA1LjUxNjE3QzQzLjk1OTkgNC44ODAzMyA0My42MzM2IDQuMTIyMzkgNDMuNjMzNiAzLjIzMzlDNDMuNjMzNiAyLjMyODU4IDQzLjk1OTkgMS41NjY0MiA0NC42MTY5IDAuOTM5MDExQzQ1LjI3NCAwLjMxMTYgNDYuMDU3MiAwIDQ2Ljk3NTMgMFpNNjkuMTk2NyAxMi43MjkzVjkuNTU0MzRINzQuMTQ4NFYxMS4yNTU1Qzc0LjE0ODQgMTIuNTQ0IDczLjY3NDEgMTMuNjQ3MiA3Mi43Mjk5IDE0LjU2MUM3MS43ODU3IDE1LjQ3NDcgNzAuNjQ1NyAxNS45MzM3IDY5LjMxNDIgMTUuOTMzN0M2OC40NTcgMTUuOTcxNiA2Ny43MDQzIDE1LjgxMTYgNjcuMDQ3MiAxNS40NTc5QzY2LjM5MDIgMTUuMSA2NS42OTQgMTQuNzg4NCA2NC45NTg3IDE0LjUxODlDNjMuNzI3MyAxNC4yMTE1IDYyLjUyMiAxNC4yNzg5IDYxLjM0NzIgMTQuNzIxQzYwLjE3MjQgMTUuMTYzMSA1OS4yNDk5IDE1Ljg5NTggNTguNTcxMiAxNi45MTQ4QzU4LjExNDMgMTcuNTg4NiA1Ny44MjcxIDE4LjMyMTIgNTcuNzA1MyAxOS4xMDg3QzU3LjUyNjkgMjAuMzU5MyA1Ny43NTMxIDIxLjUzNDEgNTguMzkyOCAyMi42Mjg5QzU5LjExMDcgMjMuODU4NSA2MC4wOTg0IDI0LjY5MjIgNjEuMzYwMyAyNS4xMjU5QzYyLjYyMjEgMjUuNTU5NiA2My44OTcgMjUuNTkzMyA2NS4xNzYyIDI1LjIyN0M2Ni40NTk4IDI0Ljg2MDYgNjcuNDk5OCAyNC4wOTAxIDY4LjI5MTcgMjIuOTE5NUM2OS4wNDg4IDIxLjc0NDYgNjkuMzI3MyAyMC40NzcyIDY5LjEyNzEgMTkuMTA4N0g3NC4xMzk3VjI5LjUwMUM3NC4xMzk3IDI5Ljc3MDQgNzQuMTMxIDMwLjAzMTUgNzQuMTA5MiAzMC4yOEM3My43MTMyIDMzLjc0NTUgNzIuMDcyOCAzNi4zOTgzIDY5LjE4OCAzOC4yNDY4QzY3LjQ3OCAzOS4zMjQ4IDY1LjU1OTEgMzkuODYzOCA2My40MzE0IDM5Ljg2MzhDNjAuNzQ2NyAzOS44NjM4IDU4LjQxODkgMzkuMDM0MiA1Ni40NTIxIDM3LjM3OTRDNTQuNDg1NCAzNS43MjQ1IDUzLjI4MDEgMzMuNjI3NiA1Mi44NDA3IDMxLjA4ODRINTcuODgzN0M1OC4yNjIyIDMyLjI2MzMgNTguOTU0MSAzMy4yMTkxIDU5Ljk1NDggMzMuOTYwMkM2MC45NTk5IDM0LjcwMTMgNjIuMTE3NCAzNS4wNzE5IDYzLjQzMTQgMzUuMDcxOUM2NS4wMjM5IDM1LjA3MTkgNjYuMzgxNSAzNC41Mjg3IDY3LjUwNDEgMzMuNDQyM0M2OC42MjY3IDMyLjM1NTkgNjkuMTg4IDMxLjA0MjEgNjkuMTg4IDI5LjUwMVYyNy4xMDVDNjkuMDA5NiAyNy4zOTU2IDY4LjgwOTUgMjcuNjY1IDY4LjU5MTkgMjcuOTEzNUM2Ny44MTc0IDI4Ljc4MDkgNjYuODczMiAyOS40MjUyIDY1Ljc1OTMgMjkuODQ2MkM2NS42MjAxIDI5LjkwNTIgNjUuNDg5NSAyOS45NTE1IDY1LjM3MiAyOS45ODk0QzY1LjMzMjkgMjkuOTg5NCA2NS4zMDI0IDI5Ljk5NzggNjUuMjgwNyAzMC4wMTg5QzY1LjI0MTUgMzAuMDE4OSA2NS4yMTEgMzAuMDI3MyA2NS4xODkzIDMwLjA0ODRDNjUuMTUwMSAzMC4wNDg0IDY1LjExOTcgMzAuMDU2OCA2NS4wOTc5IDMwLjA3NzhDNjUuMDU4OCAzMC4wNzc4IDY1LjAxOTYgMzAuMDc3OCA2NC45ODA0IDMwLjA3NzhDNjQuOTU4NyAzMC4wOTg5IDY0LjkzMjYgMzAuMTA3MyA2NC44ODkxIDMwLjEwNzNDNjQuODQ5OSAzMC4xMjg0IDY0LjgxMDcgMzAuMTM2OCA2NC43NzE2IDMwLjEzNjhDNjQuNzQ5OCAzMC4xMzY4IDY0LjczMjQgMzAuMTQ1MiA2NC43MTA3IDMwLjE2NjNDNjQuNjQ5NyAzMC4xNjYzIDY0LjU5MzIgMzAuMTc0NyA2NC41MzIzIDMwLjE5NTdDNjQuNDMyMiAzMC4yMTY4IDY0LjMzMjEgMzAuMjI1MiA2NC4yMzIgMzAuMjI1MkM2NC4yMTAzIDMwLjI0NjMgNjQuMTkyOSAzMC4yNTQ3IDY0LjE3MTEgMzAuMjU0N0M2NC4xNDk0IDMwLjI1NDcgNjQuMTMyIDMwLjI1NDcgNjQuMTEwMiAzMC4yNTQ3QzY0LjA4ODQgMzAuMjU0NyA2NC4wNjIzIDMwLjI1NDcgNjQuMDE4OCAzMC4yNTQ3QzYzLjk1NzkgMzAuMjc1NyA2My45MSAzMC4yODQyIDYzLjg3MDkgMzAuMjg0MkM2My44NDkxIDMwLjI4NDIgNjMuODIzIDMwLjI4NDIgNjMuNzc5NSAzMC4yODQyQzYzLjY2MiAzMC4yODQyIDYzLjU0MDIgMzAuMjg0MiA2My40MjI3IDMwLjI4NDJDNjMuMzIyNiAzMC4yODQyIDYzLjIzNTYgMzAuMjg0MiA2My4xNTI5IDMwLjI4NDJDNjMuMTEzOCAzMC4yODQyIDYzLjA2MTYgMzAuMjg0MiA2My4wMDUgMzAuMjg0MkM2Mi45NjU4IDMwLjI4NDIgNjIuOTM1NCAzMC4yODQyIDYyLjkxMzYgMzAuMjg0MkM2Mi44NzQ1IDMwLjI4NDIgNjIuODM1MyAzMC4yODQyIDYyLjc5NjEgMzAuMjg0MkM2Mi43NTcgMzAuMjg0MiA2Mi43MTc4IDMwLjI4NDIgNjIuNjc4NyAzMC4yODQyQzYyLjUwMDMgMzAuMjYzMSA2Mi4zMDg4IDMwLjI0NjMgNjIuMTEzIDMwLjIyNTJDNjIuMDczOSAzMC4yMjUyIDYyLjAzNDcgMzAuMjE2OCA2MS45OTU1IDMwLjE5NTdDNjEuODU2MyAzMC4xNzQ3IDYxLjcyNTggMzAuMTU3OCA2MS42MDgzIDMwLjEzNjhDNjEuNTMgMzAuMTM2OCA2MS40NjAzIDMwLjEyODQgNjEuMzk5NCAzMC4xMDczQzYxLjMyMTEgMzAuMDg2MyA2MS4yNTE1IDMwLjA3NzggNjEuMTkwNiAzMC4wNzc4QzYxLjA1MTMgMzAuMDM5OSA2MC45MjA4IDMwLjAxMDUgNjAuODAzMyAyOS45ODk0QzYwLjc4MTUgMjkuOTY4NCA2MC43NTU0IDI5Ljk1OTkgNjAuNzExOSAyOS45NTk5QzYwLjQ1NTIgMjkuODg0MSA2MC4xOTQxIDI5LjgwNDEgNTkuOTM3NCAyOS43MjgzQzU3LjYzMTMgMjguOTQwOSA1NS44MTI1IDI3LjU2NCA1NC40NzY3IDI1LjYwMTdDNTMuMTQ1MiAyMy42Mzk1IDUyLjU1NzggMjEuNDc1MSA1Mi43MTg4IDE5LjEwODdDNTIuOTk3MyAxNi4zNzU5IDU0LjE0NiAxNC4xMDIgNTYuMTY1IDEyLjI4MjlDNTguMTgzOSAxMC40NjM5IDYwLjYwMzEgOS41NTQzNCA2My40MjcxIDkuNTU0MzRDNjQuNDggOS41NTQzNCA2NS41MzMgOS44MjgwNCA2Ni41OTA0IDEwLjM3NTRDNjcuNjQzMyAxMC45MjI4IDY4LjUwOTIgMTEuNzA2MSA2OS4xODM3IDEyLjcyOTNINjkuMTk2N1pNODcuMjQ1NCA5LjU1NDM0Qzg5LjIzMzkgOS41NTQzNCA5MS4wMzk2IDEwLjAyMTcgOTIuNjU4MyAxMC45NTIzQzk0LjI3NjkgMTEuODg3MSA5NS41NzM1IDEzLjEzNzcgOTYuNTM1MSAxNC43MDQyQzk3LjUwMTEgMTYuMjcwNiA5Ny45Nzk3IDE4LjAxODEgOTcuOTc5NyAxOS45NDI0Qzk3Ljk3OTcgMjEuODQ1NyA5Ny40OTY4IDIzLjU4NDggOTYuNTM1MSAyNS4xNTEyQzk1LjU2OTIgMjYuNzE3NiA5NC4yNzY5IDI3Ljk3MjQgOTIuNjU4MyAyOC45MDNDOTEuMDM5NiAyOS44Mzc4IDg5LjIzMzkgMzAuMzAxIDg3LjI0NTQgMzAuMzAxQzg1LjI3ODcgMzAuMzAxIDgzLjQ4MTYgMjkuODMzNiA4MS44NjMgMjguOTAzQzgwLjI0NDQgMjcuOTY4MiA3OC45NDc3IDI2LjcxNzYgNzcuOTg2MSAyNS4xNTEyQzc3LjAyMDEgMjMuNTg0OCA3Ni41NDE1IDIxLjg0NTcgNzYuNTQxNSAxOS45NDI0Qzc2LjU0MTUgMTguMDE4MSA3Ny4wMjQ1IDE2LjI3MDYgNzcuOTg2MSAxNC43MDQyQzc4Ljk1MjEgMTMuMTM3NyA4MC4yNDQ0IDExLjg4MjkgODEuODYzIDEwLjk1MjNDODMuNDgxNiAxMC4wMTc1IDg1LjI3ODcgOS41NTQzNCA4Ny4yNDU0IDkuNTU0MzRaTTg3LjI0NTQgMjUuNTE3NUM4OC44Mzc5IDI1LjUxNzUgOTAuMTk5OCAyNC45NzQzIDkxLjMzMTEgMjMuODg3OUM5Mi40NjY4IDIyLjgwMTYgOTMuMDMyNSAyMS40ODc4IDkzLjAzMjUgMTkuOTQ2NkM5My4wMzI1IDE4LjQwNTUgOTIuNDY2OCAxNy4wODc1IDkxLjMzMTEgMTUuOTkyN0M5MC4xOTU1IDE0Ljg5MzYgODguODMzNiAxNC4zNDYyIDg3LjI0NTQgMTQuMzQ2MkM4NS42NTI5IDE0LjM0NjIgODQuMjk1MyAxNC44OTM2IDgzLjE3MjcgMTUuOTkyN0M4Mi4wNTAxIDE3LjA5MTcgODEuNDg4OCAxOC40MDk3IDgxLjQ4ODggMTkuOTQ2NkM4MS40ODg4IDIxLjQ4NzggODIuMDUwMSAyMi44MDE2IDgzLjE3MjcgMjMuODg3OUM4NC4yOTUzIDI0Ljk3NDMgODUuNjUyOSAyNS41MTc1IDg3LjI0NTQgMjUuNTE3NVoiIGZpbGw9IiNmZmZmZmYiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF81MDdfMTU2NiI+CjxyZWN0IHdpZHRoPSI5OCIgaGVpZ2h0PSI0MCIgZmlsbD0id2hpdGUiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K");
  drigoLogoTexture.colorSpace = THREE.SRGBColorSpace;
  const drigoLogoMaterial = new THREE.MeshBasicMaterial({ map: drigoLogoTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  materials.add(drigoLogoMaterial);
  const drigoLogoGeometry = g(new THREE.PlaneGeometry(1, 1));
  drigoLogoGeometry.rotateX(-Math.PI / 2);
  const drigoRoofLogos = new THREE.InstancedMesh(drigoLogoGeometry, drigoLogoMaterial, carCount);
  const carRoof = new THREE.InstancedMesh(unitBox, silverCar, carCount);
  const carWing = new THREE.InstancedMesh(unitBox, silverCar, carCount);
  const carTrim = new THREE.InstancedMesh(unitBox, trimMaterial, carCount * 2);
  carRoof.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(carCount * 3), 3);
  carWing.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(carCount * 3), 3);
  carTrim.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(carCount * 2 * 3), 3);
  const carWheels = new THREE.InstancedMesh(wheelGeometry, mat.tyre, carCount * 4);
  const headlights = new THREE.InstancedMesh(unitBox, mat.whiteGlow, carCount * 2);
  for(let i=0;i<carCount;i++){lightTiming(lightTimings.headlights,i,[5,14],[.08,.2],2);lightTiming(lightTimings.taillights,i,[7,19],[.38,.5],1);}
  const pairTimings=timings=>timings.flatMap(timing=>[timing,timing]);
  const taillights = new THREE.InstancedMesh(timedGeometry(unitBox,pairTimings(lightTimings.taillights)), mat.carRed, carCount * 2);
  const headlightPools=new THREE.InstancedMesh(timedGeometry(lightPool,lightTimings.headlights),headlightGlow,carCount);
  const taillightPools=new THREE.InstancedMesh(timedGeometry(lightPool,lightTimings.taillights),taillightGlow,carCount);
  const solidCarMeshes = [...MODELS.flatMap(model => [model.bodyMesh, model.cabinMesh]), carRoof, carWheels, carWing, carTrim];
  const carMeshes = [...solidCarMeshes, drigoRoofLogos, headlights, taillights, headlightPools, taillightPools];
  carMeshes.forEach(node => { node.castShadow = solidCarMeshes.includes(node); node.frustumCulled = false; node.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(node); });
  // Local traffic covers every road; branded cars use connected city-wide journeys.
  const seededRandom = n => { const v = Math.sin(n * 91.7 + 12.3) * 43758.5453; return v - Math.floor(v); };
  const loops = [];
  const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
  function makeTrafficLoop(line) {
    const centre = new THREE.CurvePath();
    const vertices=line.points.map(p=>new THREE.Vector3(p[0],.08,p[1]));
    // Short rounded corners stay inside the road surface, instead of snapping headings.
    let cursor=vertices[0];
    for(let i=1;i<vertices.length-1;i++){
      const previous=vertices[i-1],corner=vertices[i],next=vertices[i+1];
      const radius=Math.min(.07,previous.distanceTo(corner)*.25,corner.distanceTo(next)*.25);
      const enter=corner.clone().lerp(previous,radius/Math.max(.00001,corner.distanceTo(previous)));
      const leave=corner.clone().lerp(next,radius/Math.max(.00001,corner.distanceTo(next)));
      centre.add(new THREE.LineCurve3(cursor,enter));centre.add(new THREE.QuadraticBezierCurve3(enter,corner,leave));cursor=leave;
    }
    centre.add(new THREE.LineCurve3(cursor,vertices[vertices.length-1]));
    const centreLength = centre.getLength(), steps = Math.max(20, Math.ceil(centreLength / .045));
    const lane = line.closed ? .05 : line.cls === 0 ? .17 : line.cls===1 ? .11 : .058;
    const c = [], t = [];
    for (let i = 0; i <= steps; i++) { c.push(centre.getPointAt(i / steps)); t.push(centre.getTangentAt(i / steps)); }
    const pts = [];
    const side = (p, d, o) => new THREE.Vector3(p.x - d.z * o, p.y, p.z + d.x * o);
    for (let i = 0; i <= steps; i++) pts.push(side(c[i], t[i], lane));
    if(!line.closed){
    // U-turn at the far end: a half circle round the centre line.
    const addTurn=(p,d)=>{for(let k=1;k<20;k++){
      const angle=k/20*Math.PI;
      pts.push(new THREE.Vector3(p.x-d.z*lane*Math.cos(angle)+d.x*lane*Math.sin(angle),.08,p.z+d.x*lane*Math.cos(angle)+d.z*lane*Math.sin(angle)));
    }};
    addTurn(c[steps],t[steps]);
    for (let i = steps; i >= 0; i--) pts.push(side(c[i], t[i].clone().negate(), lane));
    addTurn(c[0],t[0].clone().negate());
    }else pts.pop(); // The circuit closes on its first sample, without a duplicate point.
    const n = pts.length, cum = new Float32Array(n + 1), head = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; cum[i + 1] = cum[i] + a.distanceTo(b); head[i] = Math.atan2(b.x - a.x, b.z - a.z); }
    const length = cum[n];
    // How sharply the road bends over the next stretch: drives the slow-down into turns.
    const bend = new Float32Array(n);
    // Compute the same look-ahead maximum in linear time. Unwrap headings once
    // and maintain min/max queues instead of recalculating each overlapping window.
    const angles=new Float64Array(n*2+1),distances=new Float64Array(n*2+1);
    angles[0]=head[0];
    for(let k=1;k<=n*2;k++){
      angles[k]=angles[k-1]+wrapAngle(head[k%n]-head[(k-1)%n]);
      distances[k]=distances[k-1]+cum[(k-1)%n+1]-cum[(k-1)%n];
    }
    const low=[],high=[];let lo=0,hi=0,end=0;
    for(let i=0;i<n;i++){
      while(end<i+n && distances[end]-distances[i]<.9){
        const k=++end;
        while(low.length>lo&&angles[low[low.length-1]]>=angles[k])low.pop();
        while(high.length>hi&&angles[high[high.length-1]]<=angles[k])high.pop();
        low.push(k);high.push(k);
      }
      while(low[lo]<=i)lo++;
      while(high[hi]<=i)hi++;
      bend[i]=Math.max(Math.abs(angles[low[lo]]-angles[i]),Math.abs(angles[high[hi]]-angles[i]));
      // Very tight U-turns can wrap past pi; retain the original wrapped metric.
      if(bend[i]>Math.PI){let turn=0;for(let k=i+1;k<=end;k++)turn=Math.max(turn,Math.abs(wrapAngle(head[k%n]-head[i])));bend[i]=turn;}
    }
    return { line, pts, cum, head, bend, length, n, stops: [] };
  }
  let routeSliceStart=performance.now();
  for(const line of fabric.trafficLines){
    if(line.points.length>1)loops.push(makeTrafficLoop(line));
    if(performance.now()-routeSliceStart>16){await new Promise(resolve=>setTimeout(resolve,0));routeSliceStart=performance.now();}
  }
  const indexAt = (loop, s) => { let lo = 0, hi = loop.n - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (loop.cum[mid] <= s) lo = mid; else hi = mid - 1; } return lo; };

  // ---- Traffic lights where two surface arteries cross (motorways cross on bridges, so they get none).
  const signals = [];
  {
    const segs = loops.map(loop => loop.line).map(line => line.points);
    const cross = (p1, p2, p3, p4) => {
      const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]); if (Math.abs(d) < 1e-9) return null;
      const u = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d, v = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
      return u > 0 && u < 1 && v > 0 && v < 1 ? [p1[0] + u * (p2[0] - p1[0]), p1[1] + u * (p2[1] - p1[1]), Math.atan2(p2[0] - p1[0], p2[1] - p1[1]), Math.atan2(p4[0] - p3[0], p4[1] - p3[1])] : null;
    };
    for (let a = 0; a < loops.length; a++) for (let b = a + 1; b < loops.length; b++) {
      if (!loops[a].line.signalEligible || !loops[b].line.signalEligible || loops[a].line.cls === 0 || loops[b].line.cls === 0) continue;
      const A = segs[a], B = segs[b];
      for (let i = 1; i < A.length; i++) for (let j = 1; j < B.length; j++) {
        const hit = cross(A[i - 1], A[i], B[j - 1], B[j]);
        if (!hit) continue;
        const angle = Math.abs(wrapAngle(hit[2] - hit[3]));
        if (angle < .5 || angle > Math.PI - .5) continue;
        if (signals.some(sig => Math.hypot(sig.x - hit[0], sig.z - hit[1]) < 1.6) || signals.length >= 70) continue;
        signals.push({ x: hit[0], z: hit[1], a, b, ha: hit[2], hb: hit[3], phase: seededRandom(signals.length * 5.7) * 16 });
      }
    }
  }
  const SIGNAL_PERIOD = 16;
  // State for road a ('a') or road b ('b') of a signal at a given time: 0 green, 1 amber, 2 red.
  const signalState = (sig, which, time) => {
    const p = ((time + sig.phase) % SIGNAL_PERIOD + SIGNAL_PERIOD) % SIGNAL_PERIOD;
    const q = which === 'a' ? p : (p + 8) % SIGNAL_PERIOD;
    return q < 6.2 ? 0 : q < 7.6 ? 1 : 2;
  };
  // Stop lines: every pass of a loop through a signal gets a stop position just before the junction.
  signals.forEach((sig, si) => {
    for (const [loopIndex, which, otherHalf] of [[sig.a, 'a', loops[sig.b].line.half], [sig.b, 'b', loops[sig.a].line.half]]) {
      const loop = loops[loopIndex];
      for (let i = 0; i < loop.n; i++) {
        const p = loop.pts[i], d = Math.hypot(p.x - sig.x, p.z - sig.z);
        const prev = loop.pts[(i - 1 + loop.n) % loop.n], next = loop.pts[(i + 1) % loop.n];
        if (d < .45 && d <= Math.hypot(prev.x - sig.x, prev.z - sig.z) && d < Math.hypot(next.x - sig.x, next.z - sig.z)) {
          const at = loop.cum[i] - (otherHalf + .22);
          loop.stops.push({ s: (at + loop.length) % loop.length, sig, which });
          const k = indexAt(loop, (at + loop.length) % loop.length), q = loop.pts[k];
          box(mat.porcelain, q.x, .083, q.z, .2, .006, .035, loop.head[k], false);
        }
      }
    }
  });

  // Signal poles at the corners, one per crossing road, each showing that road's light.
  const signalHeads = [];
  signals.forEach(sig => {
    for (const [which, heading, loopIndex, otherIndex] of [['a', sig.ha, sig.a, sig.b], ['b', sig.hb, sig.b, sig.a]]) {
      const ha = loops[loopIndex].line.half, hb = loops[otherIndex].line.half;
      const dx = Math.sin(heading), dz = Math.cos(heading);
      const x = sig.x - dx * (hb + .2) - dz * (ha + .14), z = sig.z - dz * (hb + .2) + dx * (ha + .14);
      if (!fabric.isLand(x, z) || (fabric.insideBuilding && fabric.insideBuilding(x, z))) continue;
      instance(cylinder, mat.graphite, [x, .34, z], [.016, .62, .016]);
      const armX = x + dz * .2, armZ = z - dx * .2;
      box(mat.graphite, (x + armX) / 2, .64, (z + armZ) / 2, .03, .025, .22, heading + Math.PI / 2, false);
      box(mat.dark, armX, .58, armZ, .05, .15, .05, heading, false);
      signalHeads.push({ x: armX, z: armZ, sig, which });
    }
  });
  const signalColors = ['#3dff8b', '#ffc23d', '#ff3b4e'];
  const signalLamps = signalColors.map(color => new THREE.InstancedMesh(sphere, basic(color, { toneMapped: false }), Math.max(1, signalHeads.length)));
  const signalGlows = signalColors.map(color => new THREE.InstancedMesh(lightPool, softGlow(color, .5), Math.max(1, signalHeads.length)));
  [...signalLamps, ...signalGlows].forEach(node => { node.count = signalHeads.length; node.frustumCulled = false; node.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(node); });
  const lampMatrix = new THREE.Matrix4(), lampPos = new THREE.Vector3(), lampScale = new THREE.Vector3(), noTurn = new THREE.Quaternion();
  function updateSignals(time) {
    signalHeads.forEach((h, i) => {
      const state = signalState(h.sig, h.which, time);
      for (let k = 0; k < 3; k++) {
        const on = k === state;
        lampPos.set(h.x, .64 - k * .045, h.z); lampMatrix.compose(lampPos, noTurn, lampScale.setScalar(on ? .03 : .0001)); signalLamps[k].setMatrixAt(i, lampMatrix);
        lampPos.set(h.x, .09, h.z); lampMatrix.compose(lampPos, noTurn, lampScale.set(on ? .46 : .0001, 1, on ? .46 : .0001)); signalGlows[k].setMatrixAt(i, lampMatrix);
      }
    });
    [...signalLamps, ...signalGlows].forEach(node => node.instanceMatrix.needsUpdate = true);
  }

  // Cars are shared out by loop length so the long arteries carry the traffic.
  const totalLoopLength = loops.reduce((sum, loop) => sum + loop.length, 0) || 1;
  const cars = [];
  loops.forEach((loop, li) => {
    const count = Math.min(loop.line.carQuota,Math.max(1,Math.floor(loop.length/.8)));
    for (let i = 0; i < count && cars.length < carCount; i++) cars.push({ loop, s: (i + seededRandom(li * 13 + i) * .5) / count * loop.length, v: 1.2, vmax: 1.9 + seededRandom(i * 3 + li) * .7, brake: 0, scale: .42 });
  });

  const spacious=loops.filter(loop=>loop.length>30);let overflow=0;
  while(cars.length<carCount&&spacious.length){const loop=spacious[overflow%spacious.length];cars.push({loop,s:seededRandom(overflow*19+7)*loop.length,v:0,vmax:1,brake:0,scale:.22});overflow++;}
  const journeys=buildTrafficJourneys(fabric.trafficLines).map(makeTrafficLoop);
  // Keep the local traffic on every street; branded cars travel connected city circuits.
  for(const loop of loops){const local=cars.filter(car=>car.loop===loop);const phase=seededRandom(loops.indexOf(loop)+51);local.forEach((car,i)=>{car.s=((i+.3)/local.length+phase)%1*loop.length;});}
  const homeCounts=new Map();
  const journeyLoads=new Map();
  // Read the published price cards, keeping pins and the pricing section in sync.
  const fleetPrices=new Map(Array.from(document.querySelectorAll('.plan')).map(plan=>[
    plan.querySelector('.plan-name')?.textContent.trim(),plan.querySelector('.plan-desc')?.textContent.trim()
  ]));
  // Every published model drives in the city; the fixed list only covers rows that never loaded.
  const fleetNames=[...fleetPrices.keys()].filter(Boolean);
  if(!fleetNames.length)fleetNames.push("Geely Emgrand", "Geely GX3 Pro", "Geely Coolray", "GAC GS3 Emzoom");
  const modelSlot = MODELS.map(() => 0);
  cars.forEach((car, i) => {
    const k = carModels[i % carModels.length], model = MODELS[k];
    car.model = model; car.slot = modelSlot[k]++;
    car.trafficId=i;car.homeLoop=car.loop;
    const homeIndex=homeCounts.get(car.loop)||0;homeCounts.set(car.loop,homeIndex+1);
    car.isDrigo = homeIndex>0 && i % 5 === 0;
    if(car.isDrigo&&journeys.length){
      const start=car.loop.pts[indexAt(car.loop,car.s)];let best=null,bestIndex=0,bestScore=Infinity;
      for(const route of journeys){
        const load=journeyLoads.get(route)||0;
        for(let k=0;k<route.n;k+=12){const d=start.distanceToSquared(route.pts[k]),score=d*.08+Math.pow(load/Math.max(1,route.length)*100,2);
          if(score<bestScore){bestScore=score;best=route;bestIndex=k;}}
      }
      car.loop=best;car.s=best.cum[bestIndex];journeyLoads.set(best,(journeyLoads.get(best)||0)+1);
    }
    car.distanceTravelled=0;
    car.drigoName = fleetNames[Math.floor(i / 4) % fleetNames.length];
    car.scale=.22;
    car.vmax=.72+seededRandom(i)*.32;
    car.v=0;

    const paint = new THREE.Color(car.isDrigo ? "#f5f1ff" : model.paints[Math.floor(seededRandom(i * 4.7 + 1) * model.paints.length)]);
    car.paint=paint.clone();car.trimColor=new THREE.Color(model.trim||'#000000');
    model.bodyMesh.setColorAt(car.slot, paint); carRoof.setColorAt(i, car.isDrigo ? new THREE.Color("#713dff") : paint); carWing.setColorAt(i, paint);
    const trim = new THREE.Color(model.trim || '#000000'); carTrim.setColorAt(i * 2, trim); carTrim.setColorAt(i * 2 + 1, trim);
  });
  for(const route of journeys){
    const fleet=cars.filter(car=>car.loop===route).sort((a,b)=>a.s-b.s);
    const phase=seededRandom(journeys.indexOf(route)*17.31+2);
    fleet.forEach((car,i)=>{car.s=((i/fleet.length+phase)%1)*route.length;});
    // Signals apply to city journeys as well as local traffic.
    for(const sig of signals)for(let k=0;k<route.n;k++){
      const p=route.pts[k];if(Math.hypot(p.x-sig.x,p.z-sig.z)>.2)continue;
      const heading=route.head[k],a=Math.abs(Math.sin(heading-sig.ha)),b=Math.abs(Math.sin(heading-sig.hb));
      const stopS=(route.cum[k]-.35+route.length)%route.length;
      if(!route.stops.some(stop=>stop.sig===sig&&Math.min(Math.abs(stop.s-stopS),route.length-Math.abs(stop.s-stopS))<1.5))route.stops.push({s:stopS,sig,which:a<b?'a':'b'});k+=5;
    }
  }
  // Small, depth-tested Drigo markers travel with nearby cars, never through buildings.
  const rooftopCarBadges=[];
  const badgeTextures=[];
  const roofSite=fabric.roundedTowers.find(roof=>roof.featured);
  if(roofSite){
    const candidates=cars.filter(car=>car.isDrigo&&car.loop.line.nearRooftop).map(car=>{
      const point=car.loop.pts[indexAt(car.loop,car.s)];
      return {car,distance:Math.hypot(point.x-roofSite.x,point.z-roofSite.z)};
    }).sort((a,b)=>a.distance-b.distance).filter((_,index)=>index%8===0);
    const labels=new Map();
    for(const {car} of candidates){
      if(!labels.has(car.drigoName)){
        const canvas=document.createElement('canvas');canvas.width=384;canvas.height=208;
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
        const material=m(new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false,toneMapped:false}));
        labels.set(car.drigoName,{canvas,texture,material,name:car.drigoName,price:fleetPrices.get(car.drigoName)||''});badgeTextures.push(texture);
      }
      const badge=new THREE.Sprite(labels.get(car.drigoName).material);badge.scale.set(.72,.39,1);badge.visible=false;world.add(badge);rooftopCarBadges.push({car,badge});
    }
    function paintBadges(){
      for(const {canvas,texture,name,price} of labels.values()){
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,384,208);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(2,2,380,188,24);ctx.fill();
        ctx.beginPath();ctx.moveTo(180,188);ctx.lineTo(192,207);ctx.lineTo(204,188);ctx.fill();
        ctx.fillStyle='#5424ff';ctx.beginPath();ctx.roundRect(24,18,142,53,15);ctx.fill();
        if(drigoLogoTexture.image?.complete)ctx.drawImage(drigoLogoTexture.image,42,22,106,43);
        else {ctx.fillStyle='#fff';ctx.font='bold 40px sans-serif';ctx.textAlign='left';ctx.fillText('drigo',42,58);}
        ctx.fillStyle='#6c687d';ctx.textAlign='left';ctx.font='500 25px sans-serif';ctx.fillText(name,24,111,336);ctx.fillStyle='#171120';ctx.font='700 28px sans-serif';ctx.fillText(price,24,155,336);texture.needsUpdate=true;
      }
    }
    paintBadges();drigoLogoTexture.image?.addEventListener('load',paintBadges,{once:true});
  }
  let trafficClock = null;
  function stepTraffic(time) {
    const dt = trafficClock === null ? 0 : Math.min(.1, Math.max(0, time - trafficClock)); trafficClock = time;
    if (!dt) return;
    // Shared lane occupancy prevents different journeys from driving through each other.
    const occupancy=new Map();
    for(const car of cars){
      const loop=car.loop,k=indexAt(loop,car.s),p=loop.pts[k],q=loop.pts[(k+1)%loop.n],f=(car.s-loop.cum[k])/Math.max(.00001,loop.cum[k+1]-loop.cum[k]);
      car.trafficX=p.x+(q.x-p.x)*f;car.trafficZ=p.z+(q.z-p.z)*f;car.trafficHeading=loop.head[k];
      const key=Math.floor(car.trafficX/2)+','+Math.floor(car.trafficZ/2);
      if(!occupancy.has(key))occupancy.set(key,[]);occupancy.get(key).push(car);
    }
    const byLoop = new Map();
    for (const car of cars) (byLoop.get(car.loop) || byLoop.set(car.loop, []).get(car.loop)).push(car);
    for (const [loop, list] of byLoop) {
      list.sort((a, b) => a.s - b.s);
      list.forEach((car, k) => {
        let leader = null;
        for (let n = 1; n < list.length; n++) { const other = list[(k + n) % list.length]; if (!other.hold || other.pull < .6) { leader = other; break; } }
        const gap = leader ? ((leader.s - car.s) % loop.length + loop.length) % loop.length : Infinity;
        const i = indexAt(loop, car.s);
        // Slow into bends and U-turns, keep a safe distance, stop at red and amber lights.
        let target = car.vmax / (1 + loop.bend[i] * 2.4);
        // Vehicle-sized clearance plus time headway; anticipate a slower leader.
        const clearance=car.scale*1.35,headway=.2+car.v*1.4;
        target=Math.min(target,car.vmax*Math.max(0,(gap-clearance)/headway));
        if(leader&&gap<headway+clearance)target=Math.min(target,Math.max(0,leader.v+(gap-clearance)*.45));
        const dx=Math.sin(car.trafficHeading),dz=Math.cos(car.trafficHeading),cx=Math.floor(car.trafficX/2),cz=Math.floor(car.trafficZ/2);
        for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const other of occupancy.get(x+','+z)||[]){
          if(other===car||other.loop===loop||Math.cos(other.trafficHeading-car.trafficHeading)<.8)continue;
          const ox=other.trafficX-car.trafficX,oz=other.trafficZ-car.trafficZ,ahead=ox*dx+oz*dz,lateral=Math.abs(ox*dz-oz*dx);
          if(ahead>.01&&ahead<2&&lateral<.065)target=Math.min(target,car.vmax*Math.max(0,(ahead-clearance)/headway));
        }
        for (const stop of loop.stops) {
          const d = ((stop.s - car.s) % loop.length + loop.length) % loop.length;
          if (d > 3.2) continue;
          const state = signalState(stop.sig, stop.which, time);
          if (state === 2 || (state === 1 && d > .9)) target = Math.min(target, car.vmax * Math.max(0, (d - .04) / 2.6));
        }
        car.pull = Math.max(0, Math.min(1, (car.pull || 0) + (car.hold && car.v < .4 ? dt * 1.5 : car.hold ? 0 : -dt)));
        // A held car pulls over to the kerb; a car whose Drigo card is open just stops in its lane.
        if (car.hold || car.paused) target = 0;
        const accel = target > car.v ? .35 : .9;
        car.v += Math.max(-accel * dt, Math.min(accel * dt, target - car.v));
        car.brake = car.v > target + .05 || target < .2 ? 1 : Math.max(0, car.brake - dt * 2);
        car.distanceTravelled+=car.v*dt;
        car.s = (car.s + car.v * dt) % loop.length;
      });
    }
  }
  const carMatrix = new THREE.Matrix4(), localMatrix = new THREE.Matrix4(), resultMatrix = new THREE.Matrix4();
  const carPosition = new THREE.Vector3(), carTangent = new THREE.Vector3(), carQuaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), identityScale = new THREE.Vector3(1, 1, 1);
  const localQuaternion = new THREE.Quaternion();
  const localPosition = new THREE.Vector3(), localScale = new THREE.Vector3();
  function carPart(node, index, x, y, z, sx = 1, sy = 1, sz = 1) {
    localPosition.set(x, y, z); localScale.set(sx, sy, sz);
    localMatrix.compose(localPosition, localQuaternion, localScale);
    resultMatrix.multiplyMatrices(carMatrix, localMatrix);
    node.setMatrixAt(index, resultMatrix);
  }
  const steeringFront=new THREE.Vector3(),steeringBack=new THREE.Vector3();
  function sampleLane(loop,distance,target){
    const s=(distance%loop.length+loop.length)%loop.length,k=indexAt(loop,s);
    return target.lerpVectors(loop.pts[k],loop.pts[(k+1)%loop.n],(s-loop.cum[k])/Math.max(.000001,loop.cum[k+1]-loop.cum[k]));
  }
  const renderProbe=new THREE.Vector3(),drigoPaint=new THREE.Color("#713dff");
  function updateCars(time) {
    stepTraffic(time); updateSignals(time);
    MODELS.forEach(model=>model.renderCount=0);
    let visibleCars=0;
    const viewCamera=rooftopActive&&terrace?rooftopCamera:camera;
    viewCamera.updateMatrixWorld();
    cars.forEach((car) => {
      const loop = car.loop, k = indexAt(loop, car.s), k2 = (k + 1) % loop.n, f = (car.s - loop.cum[k]) / Math.max(1e-6, loop.cum[k + 1] - loop.cum[k]);
      carPosition.lerpVectors(loop.pts[k], loop.pts[k2], f); carPosition.y += 0.02;
      if (car.pull) { const hh = loop.head[k]; carPosition.x -= Math.cos(hh) * car.pull * .2; carPosition.z += Math.sin(hh) * car.pull * .2; }
      renderProbe.copy(carPosition).project(viewCamera);
      // A padded frustum prevents popping at screen edges during camera motion.
      if(Math.abs(renderProbe.x)>1.3||Math.abs(renderProbe.y)>1.3||renderProbe.z< -1||renderProbe.z>1)return;
      const i=visibleCars++;
      car.slot=car.model.renderCount++;
      car.model.bodyMesh.setColorAt(car.slot,car.paint);
      carRoof.setColorAt(i,car.isDrigo?drigoPaint:car.paint);
      carWing.setColorAt(i,car.paint);
      carTrim.setColorAt(i*2,car.trimColor);carTrim.setColorAt(i*2+1,car.trimColor);
      // Aim along the actual wheelbase, continuously across sample boundaries.
      // Unlike heading interpolation this cannot snap half-way through a segment.
      sampleLane(loop,car.s+car.scale*.32,steeringFront);
      sampleLane(loop,car.s-car.scale*.32,steeringBack);
      const heading=Math.atan2(steeringFront.x-steeringBack.x,steeringFront.z-steeringBack.z);
      carQuaternion.setFromAxisAngle(up,heading);
      carMatrix.compose(carPosition, carQuaternion, identityScale.setScalar(car.scale));
      const M = car.model, hidden = .0001;
      // Brake lamps respond to actual slowing/stopping, never an unrelated timer.
      const rearLevel=.45+car.brake*.55;
      for(const index of [i*2,i*2+1]){const timing=taillights.geometry.attributes.aLightTiming;timing.setZ(index,rearLevel);timing.setW(index,5);}
      taillightPools.geometry.attributes.aLightTiming.setZ(i,rearLevel);
      taillightPools.geometry.attributes.aLightTiming.setW(i,5);
      carPart(M.bodyMesh, car.slot, 0, 0.02, 0);
      carPart(M.cabinMesh, car.slot, 0, 0.02, 0);
      carPart(carRoof, i, 0, M.roof[0], M.roof[1], M.roof[2], 0.012, M.roof[3]);
      const logoWidth = Math.min(M.roof[2] * .9, M.roof[3] * 2.45 * .9);
      carPart(drigoRoofLogos, i, 0, M.roof[0] + .009, M.roof[1], car.isDrigo ? logoWidth : hidden, 1, car.isDrigo ? logoWidth / 2.45 : hidden);
      if (M.wing) carPart(carWing, i, 0, M.wing[0], M.wing[1], M.wing[2], 0.014, M.wing[3]); else carPart(carWing, i, 0, 0, 0, hidden, hidden, hidden);
      const ws = M.wheel / .088;
      for (let j = 0; j < 4; j++) carPart(carWheels, i * 4 + j, j % 2 ? M.track : -M.track, M.wheel, j < 2 ? -M.axle : M.axle, ws, ws, ws);
      for (let j = 0; j < 2; j++) {
        const sx = j ? 1 : -1;
        carPart(headlights, i * 2 + j, sx * (M.width / 2 - M.head[2] / 2 - .02), M.head[0]+.015, M.head[1]+.012, M.head[2]*1.25, Math.max(.035,M.head[3]), 0.035);
        carPart(taillights, i * 2 + j, sx * (M.width / 2 - M.tail[2] / 2 - .02), M.tail[0]+.015, M.tail[1]-.012, M.tail[2]*1.25, Math.max(.035,M.tail[3]), 0.035);
        // Grilles: twin kidneys on the BMW, a wide black grille on the G-Wagon and Range Rover, a tall chrome one on the Rolls.
        if (!M.trim) carPart(carTrim, i * 2 + j, 0, 0, 0, hidden, hidden, hidden);
        else if (M.key === 'bmw') carPart(carTrim, i * 2 + j, sx * .035, .095, M.body[1][0] + .005, .05, .04, .02);
        else if (M.key === 'rolls') carPart(carTrim, i * 2 + j, sx * .03, .115, M.body[1][0] + .005, .06, .07, .02);
        else carPart(carTrim, i * 2 + j, sx * .06, M.head[0], M.head[1] + .003, .12, .05, .02);
      }
      carPart(headlightPools,i,0,.008,1.0,.65,1,1.3);
      carPart(taillightPools,i,0,.004,-.62-car.brake*.12,.28+car.brake*.16,1,.37+car.brake*.3);
    });
    MODELS.forEach(model=>{
      model.bodyMesh.count=model.cabinMesh.count=model.renderCount;
      model.bodyMesh.instanceColor.needsUpdate=true;
    });
    for(const node of [carRoof,carWing,drigoRoofLogos,headlightPools,taillightPools])node.count=visibleCars;
    for(const node of [carTrim,headlights,taillights])node.count=visibleCars*2;
    carWheels.count=visibleCars*4;
    for(const node of [carRoof,carWing,carTrim])node.instanceColor.needsUpdate=true;
    taillights.geometry.attributes.aLightTiming.needsUpdate=true;
    taillightPools.geometry.attributes.aLightTiming.needsUpdate=true;
    carMeshes.forEach(node => { node.instanceMatrix.needsUpdate = true; });
  }


  // ---- People: proportioned pedestrians in everyday and local dress who walk, jog, sit on
  // benches, chat and stroll with their kids; busiest round the Marina rooftop (city-people.js).
  const crowd=createCityPeople({THREE,world,g,m,fabric,signals,loops,lightNight});
  const peopleCount=crowd.count;
  function updatePeople(time){crowd.update(time);}

  // ---- Boats: yachts and abras loop through open water, each trailing a pale wake.
  const boatLoops=[];
  {
    const water=(x,z)=>!fabric.isLand(x,z)&&!fabric.isLand(x+.5,z)&&!fabric.isLand(x-.5,z)&&!fabric.isLand(x,z+.5)&&!fabric.isLand(x,z-.5);
    for(let tries=0;tries<1400&&boatLoops.length<22;tries++){
      const r=n=>seededRandom(tries*7.31+n*3.17);
      const cx=-24+r(1)*30,cz=-46+r(2)*96,rx=1.6+r(3)*3.4,rz=.6+r(4)*1.4,yaw=r(5)*Math.PI;
      let ok=true;for(let k=0;k<16&&ok;k++){const a=k/16*Math.PI*2,lx=Math.cos(a)*rx,lz=Math.sin(a)*rz;ok=water(cx+lx*Math.cos(yaw)-lz*Math.sin(yaw),cz+lx*Math.sin(yaw)+lz*Math.cos(yaw));}
      if(!ok)continue;
      // keep boats near the coast, where the city is, not lost far out at sea
      let nearCoast=false;for(let k=0;k<12&&!nearCoast;k++){const a=k/12*Math.PI*2;nearCoast=fabric.isLand(cx+Math.cos(a)*(rx+4),cz+Math.sin(a)*(rx+4));}
      if(!nearCoast)continue;
      boatLoops.push({cx,cz,rx,rz,yaw,speed:(.05+r(6)*.05)*(r(7)>.5?1:-1),phase:r(8)*6.28,size:1.5+r(9)*.9});
    }
  }
  const boatCount=boatLoops.length;
  const hullGeometry=g(new THREE.SphereGeometry(1,12,6));
  const boatHull=new THREE.InstancedMesh(hullGeometry,standard('#ffffff',{roughness:.35,metalness:.1}),Math.max(1,boatCount));
  const boatCabin=new THREE.InstancedMesh(unitBox,mat.glassLight,Math.max(1,boatCount));
  const boatLight=new THREE.InstancedMesh(sphere,mat.whiteGlow,Math.max(1,boatCount));
  const boatWake=new THREE.InstancedMesh(lightPool,waterGlint,Math.max(1,boatCount));
  [boatHull,boatCabin,boatLight,boatWake].forEach((node,index)=>{node.count=boatCount;node.castShadow=index<2;node.frustumCulled=false;node.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.add(node);});
  const boatMatrix=new THREE.Matrix4(),boatLocal=new THREE.Matrix4(),boatOut=new THREE.Matrix4(),boatPos=new THREE.Vector3(),boatQuat=new THREE.Quaternion(),boatScale=new THREE.Vector3(),localPos=new THREE.Vector3(),localScl=new THREE.Vector3(),noRot=new THREE.Quaternion();
  const boatPart=(node,i,x,y,z,sx,sy,sz)=>{localPos.set(x,y,z);localScl.set(sx,sy,sz);boatLocal.compose(localPos,noRot,localScl);boatOut.multiplyMatrices(boatMatrix,boatLocal);node.setMatrixAt(i,boatOut);};
  function updateBoats(time){
    boatLoops.forEach((b,i)=>{
      const a=b.phase+time*b.speed,lx=Math.cos(a)*b.rx,lz=Math.sin(a)*b.rz,tx=-Math.sin(a)*b.rx*Math.sign(b.speed),tz=Math.cos(a)*b.rz*Math.sign(b.speed);
      const x=b.cx+lx*Math.cos(b.yaw)-lz*Math.sin(b.yaw),z=b.cz+lx*Math.sin(b.yaw)+lz*Math.cos(b.yaw);
      const dx=tx*Math.cos(b.yaw)-tz*Math.sin(b.yaw),dz=tx*Math.sin(b.yaw)+tz*Math.cos(b.yaw);
      boatQuat.setFromAxisAngle(up,Math.atan2(dx,dz));boatPos.set(x,0,z);boatMatrix.compose(boatPos,boatQuat,boatScale.setScalar(b.size));
      boatPart(boatHull,i,0,.02,0,.13,.05,.42);
      boatPart(boatCabin,i,0,.07,-.04,.12,.06,.18);
      boatPart(boatLight,i,0,.13,-.04,.022,.022,.022);
      boatPart(boatWake,i,0,-.008,-.62,.16,1,.62);
    });
    [boatHull,boatCabin,boatLight,boatWake].forEach(node=>node.instanceMatrix.needsUpdate=true);
  }




  function updatePulses(time) { landmarkModel.update(time);windowTime.value=time;updatePeople(time);updateBoats(time); }
  function timedLightLevel([offset,period,depth,mode]) {
    const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    const phase=((windowTime.value+offset)%period)/period;let level;
    if(mode===4){const s=Math.sin(phase*Math.PI);level=1-depth+depth*Math.pow(s*s,6);}
    else if(mode===3)level=1-depth+depth*smooth(0,.03,phase)*(1-smooth(.1,.16,phase));
    else if(mode===1)level=1-depth+depth*smooth(.62,.66,phase)*(1-smooth(.8,.86,phase));
    else level=(1-depth*(.5+.5*Math.sin(phase*Math.PI*2)))*(1-(mode===0?.75*smooth(.9,.93,phase)*(1-smooth(.95,.98,phase)):0));
    return 1+(level-1)*lightNight.value;
  }
  function timedLightStats() {
    const summary=list=>{const levels=list.map(timedLightLevel);return {count:levels.length,min:Number(Math.min(...levels).toFixed(4)),max:Number(Math.max(...levels).toFixed(4)),
      checksum:Number(levels.reduce((n,v,i)=>n+v*(i%31+1),0).toFixed(4)),sample:levels.slice(0,8).map(v=>Number(v.toFixed(4)))};};
    return {lampLevels:summary(lightTimings.lamps),headlightLevels:summary(lightTimings.headlights),taillightLevels:summary(lightTimings.taillights),beaconLevels:summary(lightTimings.beacons),glintLevels:summary(lightTimings.glints),
      brakingCars:lightTimings.taillights.filter(t=>timedLightLevel(t)>1-t[2]*.5).length};
  }
  function getLightingStats() {
    const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
    let on=0,off=0,fading=0,checksum=0;
    const sample=[];
    for(let i=0;i<windowTimings.length;i++) {
      const[offset,period,duration,fade]=windowTimings[i],phase=(windowTime.value+offset)%period;
      const brightness=smooth(phase/fade)*(1-smooth((phase-(duration-fade))/fade));
      if(brightness>.98)on++;else if(brightness<.02)off++;else fading++;
      checksum+=brightness*(i%31+1);
      if(i<16)sample.push(Number(brightness.toFixed(4)));
    }
    return {roadLights:roadLightSites.size,roadLightPools:roadLightSites.size,litRoadRoutes:lightingRoutes.length,
      carHeadlights:carCount*2,carTaillights:carCount*2,headlightPools:carCount,taillightPools:carCount,
      windowCount:windowTimings.length,onWindows:on,offWindows:off,fadingWindows:fading,
      windowAnimationTime:Number(windowTime.value.toFixed(4)),windowBrightnessChecksum:Number(checksum.toFixed(4)),windowBrightnessSample:sample,
      ...timedLightStats(),
      windowsAnimated:theme==='night'&&!paused&&!reducedMotion&&inView&&!document.hidden,windowCycleSeconds:[18,57],windowFadeSeconds:[1.6,3.8]};
  }

  let disposed = false, paused = false, inView = true, raf = 0, lastTime = 0, elapsed = 0;
  let width = 1, height = 1, mobile = false, destination = 0, progress = 0, ready = false, initialized = false;
  let lastBufferWidth=0,lastBufferHeight=0,lastPixelRatio=0;
  let safeTop=330,safeBottom=135,safeLeft=0,landmarkProjectedBounds=null;
  const dayMaterialState=new Map([...materials].map(material=>[material,{color:material.color?.clone(),emissive:material.emissive?.clone(),emissiveIntensity:material.emissiveIntensity}]));
  let theme = 'night', focused = false, dragging = null, lastViewSignature = '';
  // Zoom-out stops at the overview and the tilt floor keeps the far edge inside the fog.
  const limits = { minZoom: 3.0, maxZoom: 5.2, minPitch: 0.5, maxPitch: 0.98 };
  const originalHostStyle = { cursor: host.style.cursor, touchAction: host.style.touchAction, userSelect: host.style.userSelect };
  host.style.cursor = 'grab';
  host.style.touchAction = 'pan-y pinch-zoom';
  host.style.userSelect = 'none';
  const overview = fabric.views.overview;
  const destinations = fabric.views.destinations;
  let rooftopActive = false, rooftopSaved = null;
  const cameraState = { distance: 100, yaw: overview.yaw, pitch: overview.pitch, zoom: overview.zoom, targetX: overview.focus[0], targetY: overview.focus[1], targetZ: overview.focus[2], framing: 0 };
  const targetState = { ...cameraState };
  const projected = new THREE.Vector3(), cameraTarget = new THREE.Vector3();
  // Page-driven camera offsets: a scroll orbit and a small lean toward the pointer, eased on top of the user's view.
  const drift = { orbit: 0, leanX: 0, leanY: 0 }, driftTarget = { orbit: 0, leanX: 0, leanY: 0 };
  const viewFocus = new THREE.Vector3(...overview.focus);
  function getView() {
    return {
      yaw: cameraState.yaw, pitch: cameraState.pitch, zoom: cameraState.zoom,
      targetYaw: targetState.yaw, targetZoom: targetState.zoom, theme, focused,
      destination, paused, reducedMotion, dragging: Boolean(dragging?.active),
      minZoom: limits.minZoom, maxZoom: limits.maxZoom,
      focus: [targetState.targetX, targetState.targetY, targetState.targetZ],
      safeTop,safeBottom,safeLeft,landmarkProjectedBounds:landmarkProjectedBounds?{...landmarkProjectedBounds}:null,
    };
  }
  function notifyView() {
    if (!options.onViewChange) return;
    const state = getView();
    const signature = [state.yaw.toFixed(3), state.pitch.toFixed(3), state.zoom.toFixed(3), theme, focused, destination, paused, reducedMotion, state.dragging].join('|');
    if (signature !== lastViewSignature) {
      lastViewSignature = signature;
      options.onViewChange(state);
    }
  }
  function composeTarget() {
    targetState.targetX=viewFocus.x;
    targetState.targetY=viewFocus.y;
    targetState.targetZ=viewFocus.z;
  }
  function usePreset(preset) {
    targetState.yaw = preset.yaw;
    targetState.pitch = preset.pitch;
    targetState.zoom = preset.zoom;
    // Every view, including the first, centres on its focus point inside the usable band.
    targetState.framing=0;
    viewFocus.set(...preset.focus);
    composeTarget();
  }
  function updateCamera(delta, immediate = false) {
    const ease = immediate || reducedMotion ? 1 : 1 - Math.exp(-delta * 5.0);
    for (const key of Object.keys(cameraState)) cameraState[key] += (targetState[key] - cameraState[key]) * ease;
    const driftEase = immediate || reducedMotion ? 1 : 1 - Math.exp(-delta * 3.2);
    for (const key of Object.keys(drift)) drift[key] += (driftTarget[key] - drift[key]) * driftEase;
    const yaw = cameraState.yaw + (rooftopActive ? 0 : drift.orbit * 0.62 + drift.leanX * 0.05);
    const pitch = THREE.MathUtils.clamp(cameraState.pitch + (rooftopActive ? 0 : drift.orbit * 0.16 + drift.leanY * 0.025), limits.minPitch, limits.maxPitch + 0.12);
    cameraTarget.set(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
    camera.position.set(cameraTarget.x + Math.sin(yaw) * cameraState.distance, cameraTarget.y + Math.tan(pitch) * cameraState.distance, cameraTarget.z + Math.cos(yaw) * cameraState.distance);
    camera.lookAt(cameraTarget);
    const aspect = width / height;
    camera.updateMatrixWorld();
    const cameraRight=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const cameraUp=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;
    for(const point of landmarkModel.fitPoints) {
      const relative=projected.copy(point).sub(cameraTarget);
      const x=relative.dot(cameraRight),y=relative.dot(cameraUp);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.max(top,y);bottom=Math.min(bottom,y);
    }
    const usableHeight=Math.max(180,height-safeTop-safeBottom);
    // The frame follows the builder's frame box; the floor only guards against degenerate fits.
    const referenceWidth=Math.max(mobile?40:52,(right-left)/.88,(top-bottom)*aspect*height/usableHeight/.91);
    const span=referenceWidth/aspect;
    const mix=cameraState.framing;
    // A left safe band (hero copy) pushes the focus into the free right part of the frame.
    const centerX=(left+right)/2*mix-(rooftopActive ? 0 : safeLeft/2)/width*(referenceWidth/cameraState.zoom);
    const safeOffset=rooftopActive ? 0 : (safeTop-safeBottom)/2/height*span/cameraState.zoom;
    const centerY=(top+bottom)/2*mix+safeOffset;
    camera.left = centerX-referenceWidth/2; camera.right = centerX+referenceWidth/2;
    camera.top = centerY+span/2; camera.bottom = centerY-span/2;
    camera.zoom = cameraState.zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    for(const point of landmarkModel.fitPoints) {
      projected.copy(point).project(camera);
      const x=(projected.x+1)/2,y=(1-projected.y)/2;
      bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);
    }
    landmarkProjectedBounds=bounds;
    if (options.onPins) options.onPins(pinWorld.map(p => {
      projected.copy(p).project(camera);
      const x=(projected.x+1)/2,y=(1-projected.y)/2;
      // A pin's head rises about 30px above its anchor, so it hides a little before the protected band.
      return { x,y,visible:projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&y*height>safeTop+26&&y*height<height-safeBottom+12 };
    }));
    notifyView();
  }
  function resize() {
    width = Math.max(host.clientWidth, 1); height = Math.max(host.clientHeight, 1);
    mobile = width < 760;
    const style=getComputedStyle(host);
    const topValue=parseFloat(style.getPropertyValue('--map-safe-top'));
    const bottomValue=parseFloat(style.getPropertyValue('--map-safe-bottom'));
    const leftValue=parseFloat(style.getPropertyValue('--map-safe-left'));
    safeLeft=THREE.MathUtils.clamp(Number.isFinite(leftValue)?leftValue:0,0,width*.7);
    safeTop=THREE.MathUtils.clamp(Number.isFinite(topValue)?topValue:mobile?310:330,0,height*.55);
    safeBottom=THREE.MathUtils.clamp(Number.isFinite(bottomValue)?bottomValue:mobile?190:135,0,height*.35);
    const pixelRatio=Math.min(window.devicePixelRatio || 1,mobile?1.25:1.5);
    // Do not clear/reallocate the WebGL drawing buffer for unchanged observer sizes.
    if(width!==lastBufferWidth||height!==lastBufferHeight||pixelRatio!==lastPixelRatio){
      renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height,false);
      lastBufferWidth=width;lastBufferHeight=height;lastPixelRatio=pixelRatio;
    }
    composeTarget(); updateCamera(0, true);
    renderOnce();
  }
  let terrace=null, roofEntry=null;
  const rooftopCamera=new THREE.PerspectiveCamera(48,1,.04,360);
  const roofOrtho=new THREE.OrthographicCamera(-1,1,1,-1,.04,360);
  function renderCityView(){
    if(!rooftopActive||!terrace){renderer.render(scene,camera);return;}
    const scale=activeRoof.radius/8;
    const endFocus=new THREE.Vector3(activeRoof.x,activeRoof.y+.008+1.1*scale,activeRoof.z-6.5*scale);
    let focus=endFocus,yaw=cameraState.yaw,pitch=cameraState.pitch;
    let distance=(mobile?15:10.7)*scale/cameraState.zoom;
    let blend=1,viewHeight=2*distance/Math.cos(pitch)*Math.tan(THREE.MathUtils.degToRad(24));
    if(roofEntry){
      const p=THREE.MathUtils.clamp((performance.now()-roofEntry.start)/3000,0,1),ease=p*p*(3-2*p);
      focus=roofEntry.focus.clone().lerp(endFocus,ease);
      yaw=roofEntry.yaw;pitch=roofEntry.pitch+(.3-roofEntry.pitch)*ease;
      viewHeight=Math.exp(Math.log(roofEntry.height)*(1-ease)+Math.log(viewHeight)*ease);
      distance=Math.exp(Math.log(roofEntry.distance)*(1-ease)+Math.log(distance)*ease);
      blend=ease;if(p===1)roofEntry=null;
    }
    const eyeDistance=distance/Math.cos(pitch);
    // Preserve depth precision for the closely stacked land, water and road surfaces.
    // A millimetre-scale near plane caused those layers to fight at street distance.
    rooftopCamera.near=Math.max(.04,eyeDistance-220);rooftopCamera.far=eyeDistance+260;
    rooftopCamera.fov=THREE.MathUtils.radToDeg(2*Math.atan(viewHeight/(2*eyeDistance)));rooftopCamera.aspect=width/height;
    rooftopCamera.position.set(focus.x+Math.sin(yaw)*distance,focus.y+Math.tan(pitch)*distance,focus.z+Math.cos(yaw)*distance);
    rooftopCamera.lookAt(focus);rooftopCamera.updateProjectionMatrix();
    if(blend<1){
      // Morph projection at the existing camera position; never jump thousands of units
      // away with a tiny lens (which broke depth precision and put the city in fog).
      roofOrtho.left=-viewHeight*width/height/2;roofOrtho.right=-roofOrtho.left;
      roofOrtho.top=viewHeight/2;roofOrtho.bottom=-roofOrtho.top;
      roofOrtho.near=rooftopCamera.near;roofOrtho.far=rooftopCamera.far;roofOrtho.updateProjectionMatrix();
      const ortho=roofOrtho.projectionMatrix.elements,projection=rooftopCamera.projectionMatrix.elements;
      for(let i=0;i<16;i++)projection[i]=ortho[i]*(1-blend)+projection[i]/eyeDistance*blend;
      rooftopCamera.projectionMatrixInverse.copy(rooftopCamera.projectionMatrix).invert();
    }
    rooftopCamera.updateMatrixWorld();
    for(const {car,badge} of rooftopCarBadges){
      const k=indexAt(car.loop,car.s),next=(k+1)%car.loop.n,f=(car.s-car.loop.cum[k])/Math.max(.0001,car.loop.cum[k+1]-car.loop.cum[k]);
      badge.position.lerpVectors(car.loop.pts[k],car.loop.pts[next],f);badge.position.y=.43;projected.copy(badge.position).project(rooftopCamera);
      badge.visible=!roofEntry&&badge.position.distanceTo(rooftopCamera.position)<24&&Math.abs(projected.x)<1.05&&Math.abs(projected.y)<.95&&projected.z>-1&&projected.z<1;
    }
    renderer.render(scene,rooftopCamera);
  }
  function renderOnce() {
    if (disposed || !initialized) return;
    fabric.setIntro(1);
    updateCars(elapsed); updatePulses(elapsed);
    renderCityView();

  }
  function frame(timestamp) {
    raf = 0;
    if (!shouldRun()) return;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
    lastTime = timestamp;
    if (!reducedMotion) elapsed += delta;
    updateInteraction(delta);
    updateCamera(delta);
    if (!reducedMotion) {
      // Buildings are fully visible from the first frame.
      updateCars(elapsed); updatePulses(elapsed);
      rings.forEach((ring, i) => { const scale = focused && i === destination ? 1 + Math.sin(elapsed * 1.6) * 0.075 : 1; ring.scale.setScalar(scale); });
    }
    renderCityView();
    if (!reducedMotion) raf = requestAnimationFrame(frame);
  }
  const shouldRun = () => initialized && ready && !disposed && !paused && inView && !document.hidden;
  function wake() {
    if (shouldRun() && !raf) { lastTime = 0; raf = requestAnimationFrame(frame); }
    else if (!shouldRun() && raf) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
  }
  function refreshView(immediate = false) {
    if (immediate || reducedMotion || paused || !inView || document.hidden) {
      updateCamera(0, true);
      renderOnce();
    }
    wake();
  }
  function interacted(type) { options.onInteract?.({ type }); }
  function rotateBy(radians) {
    const amount = Number(radians);
    if (!Number.isFinite(amount)) return;
    targetState.yaw += THREE.MathUtils.clamp(amount, -Math.PI, Math.PI);
    composeTarget(); interacted('rotate'); refreshView();
  }
  function zoomBy(delta) {
    if(rooftopActive){const amount=Number(delta);if(!Number.isFinite(amount))return;targetState.zoom=THREE.MathUtils.clamp(targetState.zoom*(1+amount*.3),.7,1.6);refreshView();return;}
    const amount = Number(delta);
    if (!Number.isFinite(amount)) return;
    targetState.zoom = THREE.MathUtils.clamp(targetState.zoom + amount, limits.minZoom, limits.maxZoom);
    composeTarget(); interacted('zoom'); refreshView();
  }
  function resetView() {
    closeRooftop();
    stopFollow(); release();
    focused = false;
    usePreset(overview);
    rings.forEach(ring => { ring.material.opacity = 0.4; ring.scale.setScalar(1); });
    interacted('reset'); refreshView();
  }
  function setTheme(value, signalInteraction = true) {
    theme = value === 'night' ? 'night' : 'day';
    const day=theme==='day';
    for(const[material,saved]of dayMaterialState) {
      if(saved.color)material.color.copy(saved.color);
      if(saved.emissive)material.emissive.copy(saved.emissive);
      if(saved.emissiveIntensity!==undefined)material.emissiveIntensity=saved.emissiveIntensity;
      if(!day&&material.isMeshStandardMaterial) {
        const luminance=saved.color.r*.2126+saved.color.g*.7152+saved.color.b*.0722;
        material.color.set(luminance>.65?'#aab7cf':luminance>.35?'#71829f':'#3b4b68');
        if(material.metalness>.3){material.color.set('#3f577c');material.emissive.set('#304567');material.emissiveIntensity=.12;}
      }
    }
    if(!day) {
      const nightColors={land:'#162035',ivory:'#aebbd1',porcelain:'#bfcae0',stone:'#64738e',concrete:'#687a97',graphite:'#51637f',dark:'#233651',glass:'#182940',glassLight:'#38516f',window:'#172942',windowDark:'#112038',road:'#0b1221',localRoad:'#24324a',pavement:'#303e56',foundation:'#27344b',median:'#213b3a',chalk:'#9c9bad',greenery:'#1f4a2e',greeneryLight:'#2d5c38',trunk:'#4b4855',tyre:'#101726'};
      for(const[name,color]of Object.entries(nightColors))mat[name].color.set(color);
      mat.window.emissive.set('#657793');mat.window.emissiveIntensity=.08;
      silverCar.color.set('#ffffff');silverCar.emissive.set('#1a2340');silverCar.emissiveIntensity=.25;trimMaterial.color.set('#ffffff');
      mat.violet.color.set('#bc575c');mat.violet.emissive.set('#db515a');mat.violet.emissiveIntensity=.8;
    }
    mat.warmLight.opacity=day?0:.94;mat.coolLight.opacity=day?0:.84;mat.lampLight.opacity=day?0:.96;mat.beacon.opacity=day?0:1;
    lightNight.value=day?0:1;roadGlow.uniforms.uOpacity.value=day?0:.9;
    beaconGlow.uniforms.uOpacity.value=day?0:.55;trailMaterial.uniforms.uOpacity.value=0;waterGlint.uniforms.uOpacity.value=day?0:.42;
    headlightGlow.uniforms.uOpacity.value=day?0:.85;signalGlows.forEach(node=>node.material.uniforms.uOpacity.value=day?0:.5);
    taillightGlow.uniforms.uOpacity.value=day?0:.7;
    mat.whiteGlow.color.set(day?'#f0eadf':'#fff4df');mat.carRed.color.set(day?'#aa3745':'#ff4d5b');
    ambient.color.set(day?'#ffffff':'#8194cc');ambient.groundColor.set(day?'#9b96af':'#081224');ambient.intensity=day?1.15:.6;
    key.color.set(day?'#fffdf8':'#bdcfff');key.intensity=day?3.2:1.9;
    rim.color.set(day?'#d1d4ef':'#9388ec');rim.intensity=day?.38:1.3;
    front.color.set(day?'#ffffff':'#9ab6f2');front.intensity=day?.18:.17;
    renderer.toneMappingExposure=day?.94:1.22;
    mat.water.color.set(day?'#d5cefa':'#0c1226');
    scene.fog.color.set(day?'#dfe3f2':'#0b1225');scene.fog.near=118;scene.fog.far=205;
    renderer.setClearColor(day?'#dfe3f2':'#0b1225',1);
    fabric.setTheme(day);
    if(signalInteraction)interacted('theme');notifyView();renderOnce();wake();return theme;
  }
  function onPointerDown(event) {
    if (disposed || dragging || !event.isPrimary || event.button !== 0) return;
    if (event.target.closest?.('button, a, input, select, textarea, [data-map-control]')) return;
    dragging = { id: event.pointerId, type: event.pointerType, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false };
    if (event.pointerType !== 'touch') {
      event.preventDefault();
      host.setPointerCapture?.(event.pointerId);
    }
  }
  function onPointerMove(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    const totalX = event.clientX - dragging.startX, totalY = event.clientY - dragging.startY;
    if (!dragging.active) {
      if (Math.hypot(totalX, totalY) < 6) return;
      // A vertical touch gesture belongs to the document. Do not capture it or
      // consume it; touch-action:pan-y also permits the browser to cancel it.
      if (dragging.type === 'touch' && Math.abs(totalX) < Math.abs(totalY) * 1.15) return;
      dragging.active = true;
      host.setPointerCapture?.(event.pointerId);
      host.style.cursor = 'grabbing';
      interacted('drag');
    }
    if (event.cancelable) event.preventDefault();
    const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
    targetState.yaw -= dx * (dragging.type === 'touch' ? 0.009 : 0.006);
    if (dragging.type !== 'touch') targetState.pitch = THREE.MathUtils.clamp(targetState.pitch + dy * 0.0035, rooftopActive ? .12 : limits.minPitch, rooftopActive ? .75 : limits.maxPitch);
    dragging.x = event.clientX; dragging.y = event.clientY;
    composeTarget(); refreshView(true);
  }
  function onPointerEnd(event) {
    if (!dragging || (event && event.pointerId !== dragging.id)) return;
    const id = dragging.id;
    const tap = event && event.type === 'pointerup' && !dragging.active && Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) < 8;
    dragging = null;
    if (tap) { const box = host.getBoundingClientRect(); handleTap(event.clientX - box.left, event.clientY - box.top); refreshView(); }
    if (host.hasPointerCapture?.(id)) host.releasePointerCapture(id);
    host.style.cursor = 'grab';
    notifyView();
  }
  function onPreference(event) { reducedMotion = event.matches; updateCamera(0, true); renderOnce(); wake(); }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersectionObserver = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; wake(); }, { rootMargin: '120px' });
  intersectionObserver.observe(host);
  // ==== Interaction: tap the map to find the closest car, tap a car to ride along, tap a landmark for its
  // story (the Burj answers with fireworks), tap a traffic light to switch it. Cars and landmarks light up on hover.
  const tagLayer = document.createElement('div'); tagLayer.className = 'city-tags'; tagLayer.setAttribute('aria-hidden', 'true'); host.appendChild(tagLayer);
  const hint = document.createElement('div'); hint.className = 'city-hint';
  hint.innerHTML = '<b>Tap the map</b> to find the closest car · <b>tap a car</b> to ride along · <b>tap the Burj</b>';
  const makeTag = cls => { const el = document.createElement('div'); el.className = 'city-tag ' + cls; el.hidden = true; tagLayer.appendChild(el); return el; };
  const carTag = makeTag('is-car'), landmarkTag = makeTag('is-landmark'), toast = makeTag('is-toast');
  const projectTo = (v, out) => { projected.copy(v).project(camera); out.x = (projected.x + 1) / 2 * width; out.y = (1 - projected.y) / 2 * height; out.visible = projected.z > -1 && projected.z < 1; return out; };
  const screen = { x: 0, y: 0, visible: false }, probe = new THREE.Vector3();
  const carWorld = (car, out) => {
    const loop = car.loop, k = indexAt(loop, car.s), k2 = (k + 1) % loop.n, f = (car.s - loop.cum[k]) / Math.max(1e-6, loop.cum[k + 1] - loop.cum[k]);
    out.lerpVectors(loop.pts[k], loop.pts[k2], f); const h = loop.head[k];
    const pull = car.pull || 0; out.x -= Math.cos(h) * pull * .2; out.z += Math.sin(h) * pull * .2; out.y = .12; return out;
  };
  // Mark a visible share of the illustrative Drigo fleet, following real traffic paths: never fewer
  // than 10 cars (app.js asks for 1.5 times what the app shows), with one price card per published model.
  const drigoCars = cars.filter(car => car.isDrigo);
  const fleetPins = fleetNames.slice(0, 6).map(name => {
    const el = makeTag('is-drigo');
    el.innerHTML = "<img src=\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTgiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA5OCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzUwN18xNTY2KSI+CjxwYXRoIGQ9Ik0xNi40ODY2IDEyLjc1ODhWMEgyMS40MzgyVjIwLjcyNTZIMTYuNDI1N0MxNi40NDc0IDIwLjYyODggMTYuNDU2MSAyMC41MzE5IDE2LjQ1NjEgMjAuNDM1MUMxNi40NTYxIDIwLjM3NjEgMTYuNDY0OCAyMC4zMDg4IDE2LjQ4NjYgMjAuMjMzQzE2LjQ4NjYgMjAuMTk1MSAxNi40ODY2IDIwLjE2NTYgMTYuNDg2NiAyMC4xNDQ1QzE2LjQ4NjYgMjAuMDY4NyAxNi40ODY2IDIwLjAwMTQgMTYuNDg2NiAxOS45NDI0QzE2LjQ4NjYgMTkuODY2NiAxNi40ODY2IDE5Ljc5OTIgMTYuNDg2NiAxOS43NDAzQzE2LjQ4NjYgMTkuNzAyNCAxNi40ODY2IDE5LjY2NDUgMTYuNDg2NiAxOS42MjY2QzE2LjQ2NDggMTkuNTY3NiAxNi40NTYxIDE5LjUwMDMgMTYuNDU2MSAxOS40MjQ1QzE2LjQ1NjEgMTkuMzI3NiAxNi40NDc0IDE5LjIzMDggMTYuNDI1NyAxOS4xMzM5QzE2LjIyNTUgMTcuODgzMyAxNS42ODE2IDE2LjgzNDggMTQuNzg1MyAxNS45ODg1QzEzLjY0OTYgMTQuODg5NCAxMi4yODc3IDE0LjM0MiAxMC42OTk1IDE0LjM0MkM5LjI0NjI1IDE0LjM0MiA3Ljk4ODc2IDE0Ljc5MjYgNi45MjcwNyAxNS42OTc5QzUuODYxMDMgMTYuNjAzMiA1LjIyMTQxIDE3Ljc0ODYgNS4wMDM4NSAxOS4xMzM5QzQuOTI1NTMgMTkuNjcyOSA0LjkyNTUzIDIwLjIwMzUgNS4wMDM4NSAyMC43MjE0QzUuMjIxNDEgMjIuMTA2OCA1Ljg2NTM4IDIzLjI1MjEgNi45MjcwNyAyNC4xNTc0QzcuOTkzMTEgMjUuMDYyOCA5LjI1MDYgMjUuNTEzMyAxMC42OTk1IDI1LjUxMzNDMTAuNzM4NyAyNS41MTMzIDEwLjc3NzkgMjUuNTEzMyAxMC44MTcgMjUuNTEzM0MxMC44NTYyIDI1LjUxMzMgMTAuODg2NiAyNS41MTMzIDEwLjkwODQgMjUuNTEzM0MxMC45NDc2IDI1LjUxMzMgMTAuOTg2NyAyNS41MTMzIDExLjAyNTkgMjUuNTEzM0MxMS4wNjUgMjUuNTEzMyAxMS4wOTU1IDI1LjUxMzMgMTEuMTE3MiAyNS41MTMzQzExLjEzOSAyNS41MTMzIDExLjE1NjQgMjUuNTEzMyAxMS4xNzgyIDI1LjUxMzNDMTEuMTk5OSAyNS40OTIzIDExLjIxNzMgMjUuNDgzOCAxMS4yMzkxIDI1LjQ4MzhDMTEuMzc4MyAyNS40ODM4IDExLjUwODkgMjUuNDc1NCAxMS42MjYzIDI1LjQ1NDRDMTEuNjY1NSAyNS40MzMzIDExLjcwNDcgMjUuNDI0OSAxMS43NDM4IDI1LjQyNDlDMTEuNzY1NiAyNS40MjQ5IDExLjc5MTcgMjUuNDI0OSAxMS44MzUyIDI1LjQyNDlDMTEuODM1MiAyNS40MDM4IDExLjg0MzkgMjUuMzk1NCAxMS44NjU3IDI1LjM5NTRDMTEuODg3NCAyNS4zOTU0IDExLjkwNDggMjUuMzk1NCAxMS45MjY2IDI1LjM5NTRDMTEuOTY1NyAyNS4zNzQ0IDEyLjAwNDkgMjUuMzY1OSAxMi4wNDQxIDI1LjM2NTlDMTIuMTA1IDI1LjM0NDkgMTIuMTYxNSAyNS4zMjggMTIuMjIyNCAyNS4zMDdDMTIuMjYxNiAyNS4zMDcgMTIuMzAwOCAyNS4yOTg2IDEyLjMzOTkgMjUuMjc3NUMxMi44NTc3IDI1LjE0MjggMTMuMzUzOCAyNC45MzIyIDEzLjgzMjQgMjQuNjQxN0MxNC42Mjg2IDI0LjE2MTYgMTUuNDgxNSAyMy45MjE2IDE2LjM5OTYgMjMuOTIxNkgxNi41NzhDMTcuOTMxMiAyMy45MjE2IDE5LjA3OTkgMjQuMzgwNiAyMC4wMjQxIDI1LjI5NDRDMjAuOTY4MyAyNi4yMDgxIDIxLjQ0MjYgMjcuMzExMyAyMS40NDI2IDI4LjU5OThWMzAuMzAxSDE2LjQ5MDlWMjcuMDk2NkMxNi4zMTI2IDI3LjM4NzEgMTYuMTEyNCAyNy42NTY2IDE1Ljg5NDggMjcuOTA1MUMxNS44MzM5IDI3Ljk2NCAxNS43Nzc0IDI4LjAxODggMTUuNzE2NCAyOC4wNzc3QzE1LjY3NzMgMjguMTM2NyAxNS42MjUxIDI4LjE5MTQgMTUuNTY4NSAyOC4yNTAzQzE1LjU0NjcgMjguMjcxNCAxNS41MjkzIDI4LjI4ODIgMTUuNTA3NiAyOC4zMDkzQzE0LjgzMzIgMjguOTYyIDE0LjA3MTcgMjkuNDU4OSAxMy4yMjc2IDI5Ljc5NTdDMTIuMzgzNCAzMC4xMzI2IDExLjU0MzcgMzAuMzAxIDEwLjcwODIgMzAuMzAxQzcuODg0MzMgMzAuMzAxIDUuNDY5NDMgMjkuMzkxNSAzLjQ1OTE4IDI3LjU3MjRDMS40NDg5NCAyNS43NTMzIDAuMzA4OTMzIDIzLjQ2NjkgMC4wMzA0NTgyIDIwLjcxNzJDMC4wMzA0NTgyIDIwLjY1ODMgMC4wMzA0NTgyIDIwLjYwMzUgMC4wMzA0NTgyIDIwLjU0NDZDMC4wMDg3MDIzNSAyMC40Njg4IDAgMjAuNDAxNCAwIDIwLjM0MjRDMCAyMC4zMjE0IDAgMjAuMzA0NSAwIDIwLjI4MzVDMCAyMC4yNDU2IDAgMjAuMjA3NyAwIDIwLjE2OThDMCAyMC4xMzE5IDAgMjAuMTAyNCAwIDIwLjA4MTRDMCAyMC4wNjAzIDAgMjAuMDUxOSAwIDIwLjA1MTlDMCAxOS44NzkyIDAgMTkuNzA2NiAwIDE5LjUzNEMwIDE5LjQ1ODIgMC4wMDg3MDIzNSAxOS4zOTA4IDAuMDMwNDU4MiAxOS4zMzE4QzAuMDMwNDU4MiAxOS4yNTYxIDAuMDMwNDU4MiAxOS4xODg3IDAuMDMwNDU4MiAxOS4xMjk3QzAuMzA4OTMzIDE2LjM5NjkgMS40NTMyOSAxNC4xMTQ2IDMuNDU5MTggMTIuMjg3MkM1LjQ2OTQzIDEwLjQ1OTcgNy44ODQzMyA5LjU0NTkxIDEwLjcwODIgOS41NDU5MUMxMS41NDM3IDkuNTQ1OTEgMTIuMzgzNCA5LjcxODU2IDEzLjIyNzYgMTAuMDYzOEMxNC4wNzE3IDEwLjQwOTEgMTQuODMzMiAxMC45MDE4IDE1LjUwNzYgMTEuNTM3NkMxNS41MjkzIDExLjU1ODcgMTUuNTQ2NyAxMS41ODM5IDE1LjU2ODUgMTEuNjI2MUMxNS42Mjk0IDExLjY4NSAxNS42NzczIDExLjczMTMgMTUuNzE2NCAxMS43NjkyQzE1Ljc3NzQgMTEuODI4MiAxNS44MzM5IDExLjg4MjkgMTUuODk0OCAxMS45NDE5QzE2LjExMjQgMTIuMTkwMyAxNi4zMTI2IDEyLjQ1OTggMTYuNDkwOSAxMi43NTAzTDE2LjQ4NjYgMTIuNzU4OFpNMjkuMzc0OCAxMy4xMDQxQzMwLjM4ODYgMTIuMDA1IDMxLjYxMTMgMTEuMTQxOCAzMy4wNDI4IDEwLjUwNkMzNC40NzQ0IDkuODcwMTUgMzUuOTk3MyA5LjU1NDM0IDM3LjYwNzIgOS41NTQzNEMzOS4zNTY0IDkuNTU0MzQgNDAuNzcwNSA5Ljg0NDg4IDQxLjg0MDkgMTAuNDIxOEwzOS4yNDc2IDE0Ljc4QzM4LjgyOTkgMTQuNDg5NCAzOC4yODE2IDE0LjM0NjIgMzcuNjA3MiAxNC4zNDYySDM3LjU0NjNDMzUuMjQwMiAxNC40MDUyIDMzLjI5OTUgMTUuMTkyNiAzMS43Mjg4IDE2LjcxMjdDMzAuMTU4IDE4LjIzMjggMjkuMzcwNCAyMC4wODE0IDI5LjM3MDQgMjIuMjU0MVYzMC4zMDk0SDI0LjQxODhWOS41NTQzNEgyOS4zNzA0VjEzLjEwNDFIMjkuMzc0OFpNNDQuNDk5NSAzMC4zMDk0VjkuNTU0MzRINDkuNDUxMVYzMC4zMDk0SDQ0LjQ5OTVaTTQ2Ljk3NTMgMEM0Ny44ODkgMCA0OC42NzY2IDAuMzExNiA0OS4zMzM2IDAuOTM5MDExQzQ5Ljk5MDYgMS41NjY0MiA1MC4zMTcgMi4zMjg1OCA1MC4zMTcgMy4yMzM5QzUwLjMxNyA0LjExODE4IDQ5Ljk5MDYgNC44ODAzMyA0OS4zMzM2IDUuNTE2MTdDNDguNjc2NiA2LjE1MiA0Ny44OTM0IDYuNDY3ODEgNDYuOTc1MyA2LjQ2NzgxQzQ2LjA2MTUgNi40Njc4MSA0NS4yNzQgNi4xNTIgNDQuNjE2OSA1LjUxNjE3QzQzLjk1OTkgNC44ODAzMyA0My42MzM2IDQuMTIyMzkgNDMuNjMzNiAzLjIzMzlDNDMuNjMzNiAyLjMyODU4IDQzLjk1OTkgMS41NjY0MiA0NC42MTY5IDAuOTM5MDExQzQ1LjI3NCAwLjMxMTYgNDYuMDU3MiAwIDQ2Ljk3NTMgMFpNNjkuMTk2NyAxMi43MjkzVjkuNTU0MzRINzQuMTQ4NFYxMS4yNTU1Qzc0LjE0ODQgMTIuNTQ0IDczLjY3NDEgMTMuNjQ3MiA3Mi43Mjk5IDE0LjU2MUM3MS43ODU3IDE1LjQ3NDcgNzAuNjQ1NyAxNS45MzM3IDY5LjMxNDIgMTUuOTMzN0M2OC40NTcgMTUuOTcxNiA2Ny43MDQzIDE1LjgxMTYgNjcuMDQ3MiAxNS40NTc5QzY2LjM5MDIgMTUuMSA2NS42OTQgMTQuNzg4NCA2NC45NTg3IDE0LjUxODlDNjMuNzI3MyAxNC4yMTE1IDYyLjUyMiAxNC4yNzg5IDYxLjM0NzIgMTQuNzIxQzYwLjE3MjQgMTUuMTYzMSA1OS4yNDk5IDE1Ljg5NTggNTguNTcxMiAxNi45MTQ4QzU4LjExNDMgMTcuNTg4NiA1Ny44MjcxIDE4LjMyMTIgNTcuNzA1MyAxOS4xMDg3QzU3LjUyNjkgMjAuMzU5MyA1Ny43NTMxIDIxLjUzNDEgNTguMzkyOCAyMi42Mjg5QzU5LjExMDcgMjMuODU4NSA2MC4wOTg0IDI0LjY5MjIgNjEuMzYwMyAyNS4xMjU5QzYyLjYyMjEgMjUuNTU5NiA2My44OTcgMjUuNTkzMyA2NS4xNzYyIDI1LjIyN0M2Ni40NTk4IDI0Ljg2MDYgNjcuNDk5OCAyNC4wOTAxIDY4LjI5MTcgMjIuOTE5NUM2OS4wNDg4IDIxLjc0NDYgNjkuMzI3MyAyMC40NzcyIDY5LjEyNzEgMTkuMTA4N0g3NC4xMzk3VjI5LjUwMUM3NC4xMzk3IDI5Ljc3MDQgNzQuMTMxIDMwLjAzMTUgNzQuMTA5MiAzMC4yOEM3My43MTMyIDMzLjc0NTUgNzIuMDcyOCAzNi4zOTgzIDY5LjE4OCAzOC4yNDY4QzY3LjQ3OCAzOS4zMjQ4IDY1LjU1OTEgMzkuODYzOCA2My40MzE0IDM5Ljg2MzhDNjAuNzQ2NyAzOS44NjM4IDU4LjQxODkgMzkuMDM0MiA1Ni40NTIxIDM3LjM3OTRDNTQuNDg1NCAzNS43MjQ1IDUzLjI4MDEgMzMuNjI3NiA1Mi44NDA3IDMxLjA4ODRINTcuODgzN0M1OC4yNjIyIDMyLjI2MzMgNTguOTU0MSAzMy4yMTkxIDU5Ljk1NDggMzMuOTYwMkM2MC45NTk5IDM0LjcwMTMgNjIuMTE3NCAzNS4wNzE5IDYzLjQzMTQgMzUuMDcxOUM2NS4wMjM5IDM1LjA3MTkgNjYuMzgxNSAzNC41Mjg3IDY3LjUwNDEgMzMuNDQyM0M2OC42MjY3IDMyLjM1NTkgNjkuMTg4IDMxLjA0MjEgNjkuMTg4IDI5LjUwMVYyNy4xMDVDNjkuMDA5NiAyNy4zOTU2IDY4LjgwOTUgMjcuNjY1IDY4LjU5MTkgMjcuOTEzNUM2Ny44MTc0IDI4Ljc4MDkgNjYuODczMiAyOS40MjUyIDY1Ljc1OTMgMjkuODQ2MkM2NS42MjAxIDI5LjkwNTIgNjUuNDg5NSAyOS45NTE1IDY1LjM3MiAyOS45ODk0QzY1LjMzMjkgMjkuOTg5NCA2NS4zMDI0IDI5Ljk5NzggNjUuMjgwNyAzMC4wMTg5QzY1LjI0MTUgMzAuMDE4OSA2NS4yMTEgMzAuMDI3MyA2NS4xODkzIDMwLjA0ODRDNjUuMTUwMSAzMC4wNDg0IDY1LjExOTcgMzAuMDU2OCA2NS4wOTc5IDMwLjA3NzhDNjUuMDU4OCAzMC4wNzc4IDY1LjAxOTYgMzAuMDc3OCA2NC45ODA0IDMwLjA3NzhDNjQuOTU4NyAzMC4wOTg5IDY0LjkzMjYgMzAuMTA3MyA2NC44ODkxIDMwLjEwNzNDNjQuODQ5OSAzMC4xMjg0IDY0LjgxMDcgMzAuMTM2OCA2NC43NzE2IDMwLjEzNjhDNjQuNzQ5OCAzMC4xMzY4IDY0LjczMjQgMzAuMTQ1MiA2NC43MTA3IDMwLjE2NjNDNjQuNjQ5NyAzMC4xNjYzIDY0LjU5MzIgMzAuMTc0NyA2NC41MzIzIDMwLjE5NTdDNjQuNDMyMiAzMC4yMTY4IDY0LjMzMjEgMzAuMjI1MiA2NC4yMzIgMzAuMjI1MkM2NC4yMTAzIDMwLjI0NjMgNjQuMTkyOSAzMC4yNTQ3IDY0LjE3MTEgMzAuMjU0N0M2NC4xNDk0IDMwLjI1NDcgNjQuMTMyIDMwLjI1NDcgNjQuMTEwMiAzMC4yNTQ3QzY0LjA4ODQgMzAuMjU0NyA2NC4wNjIzIDMwLjI1NDcgNjQuMDE4OCAzMC4yNTQ3QzYzLjk1NzkgMzAuMjc1NyA2My45MSAzMC4yODQyIDYzLjg3MDkgMzAuMjg0MkM2My44NDkxIDMwLjI4NDIgNjMuODIzIDMwLjI4NDIgNjMuNzc5NSAzMC4yODQyQzYzLjY2MiAzMC4yODQyIDYzLjU0MDIgMzAuMjg0MiA2My40MjI3IDMwLjI4NDJDNjMuMzIyNiAzMC4yODQyIDYzLjIzNTYgMzAuMjg0MiA2My4xNTI5IDMwLjI4NDJDNjMuMTEzOCAzMC4yODQyIDYzLjA2MTYgMzAuMjg0MiA2My4wMDUgMzAuMjg0MkM2Mi45NjU4IDMwLjI4NDIgNjIuOTM1NCAzMC4yODQyIDYyLjkxMzYgMzAuMjg0MkM2Mi44NzQ1IDMwLjI4NDIgNjIuODM1MyAzMC4yODQyIDYyLjc5NjEgMzAuMjg0MkM2Mi43NTcgMzAuMjg0MiA2Mi43MTc4IDMwLjI4NDIgNjIuNjc4NyAzMC4yODQyQzYyLjUwMDMgMzAuMjYzMSA2Mi4zMDg4IDMwLjI0NjMgNjIuMTEzIDMwLjIyNTJDNjIuMDczOSAzMC4yMjUyIDYyLjAzNDcgMzAuMjE2OCA2MS45OTU1IDMwLjE5NTdDNjEuODU2MyAzMC4xNzQ3IDYxLjcyNTggMzAuMTU3OCA2MS42MDgzIDMwLjEzNjhDNjEuNTMgMzAuMTM2OCA2MS40NjAzIDMwLjEyODQgNjEuMzk5NCAzMC4xMDczQzYxLjMyMTEgMzAuMDg2MyA2MS4yNTE1IDMwLjA3NzggNjEuMTkwNiAzMC4wNzc4QzYxLjA1MTMgMzAuMDM5OSA2MC45MjA4IDMwLjAxMDUgNjAuODAzMyAyOS45ODk0QzYwLjc4MTUgMjkuOTY4NCA2MC43NTU0IDI5Ljk1OTkgNjAuNzExOSAyOS45NTk5QzYwLjQ1NTIgMjkuODg0MSA2MC4xOTQxIDI5LjgwNDEgNTkuOTM3NCAyOS43MjgzQzU3LjYzMTMgMjguOTQwOSA1NS44MTI1IDI3LjU2NCA1NC40NzY3IDI1LjYwMTdDNTMuMTQ1MiAyMy42Mzk1IDUyLjU1NzggMjEuNDc1MSA1Mi43MTg4IDE5LjEwODdDNTIuOTk3MyAxNi4zNzU5IDU0LjE0NiAxNC4xMDIgNTYuMTY1IDEyLjI4MjlDNTguMTgzOSAxMC40NjM5IDYwLjYwMzEgOS41NTQzNCA2My40MjcxIDkuNTU0MzRDNjQuNDggOS41NTQzNCA2NS41MzMgOS44MjgwNCA2Ni41OTA0IDEwLjM3NTRDNjcuNjQzMyAxMC45MjI4IDY4LjUwOTIgMTEuNzA2MSA2OS4xODM3IDEyLjcyOTNINjkuMTk2N1pNODcuMjQ1NCA5LjU1NDM0Qzg5LjIzMzkgOS41NTQzNCA5MS4wMzk2IDEwLjAyMTcgOTIuNjU4MyAxMC45NTIzQzk0LjI3NjkgMTEuODg3MSA5NS41NzM1IDEzLjEzNzcgOTYuNTM1MSAxNC43MDQyQzk3LjUwMTEgMTYuMjcwNiA5Ny45Nzk3IDE4LjAxODEgOTcuOTc5NyAxOS45NDI0Qzk3Ljk3OTcgMjEuODQ1NyA5Ny40OTY4IDIzLjU4NDggOTYuNTM1MSAyNS4xNTEyQzk1LjU2OTIgMjYuNzE3NiA5NC4yNzY5IDI3Ljk3MjQgOTIuNjU4MyAyOC45MDNDOTEuMDM5NiAyOS44Mzc4IDg5LjIzMzkgMzAuMzAxIDg3LjI0NTQgMzAuMzAxQzg1LjI3ODcgMzAuMzAxIDgzLjQ4MTYgMjkuODMzNiA4MS44NjMgMjguOTAzQzgwLjI0NDQgMjcuOTY4MiA3OC45NDc3IDI2LjcxNzYgNzcuOTg2MSAyNS4xNTEyQzc3LjAyMDEgMjMuNTg0OCA3Ni41NDE1IDIxLjg0NTcgNzYuNTQxNSAxOS45NDI0Qzc2LjU0MTUgMTguMDE4MSA3Ny4wMjQ1IDE2LjI3MDYgNzcuOTg2MSAxNC43MDQyQzc4Ljk1MjEgMTMuMTM3NyA4MC4yNDQ0IDExLjg4MjkgODEuODYzIDEwLjk1MjNDODMuNDgxNiAxMC4wMTc1IDg1LjI3ODcgOS41NTQzNCA4Ny4yNDU0IDkuNTU0MzRaTTg3LjI0NTQgMjUuNTE3NUM4OC44Mzc5IDI1LjUxNzUgOTAuMTk5OCAyNC45NzQzIDkxLjMzMTEgMjMuODg3OUM5Mi40NjY4IDIyLjgwMTYgOTMuMDMyNSAyMS40ODc4IDkzLjAzMjUgMTkuOTQ2NkM5My4wMzI1IDE4LjQwNTUgOTIuNDY2OCAxNy4wODc1IDkxLjMzMTEgMTUuOTkyN0M5MC4xOTU1IDE0Ljg5MzYgODguODMzNiAxNC4zNDYyIDg3LjI0NTQgMTQuMzQ2MkM4NS42NTI5IDE0LjM0NjIgODQuMjk1MyAxNC44OTM2IDgzLjE3MjcgMTUuOTkyN0M4Mi4wNTAxIDE3LjA5MTcgODEuNDg4OCAxOC40MDk3IDgxLjQ4ODggMTkuOTQ2NkM4MS40ODg4IDIxLjQ4NzggODIuMDUwMSAyMi44MDE2IDgzLjE3MjcgMjMuODg3OUM4NC4yOTUzIDI0Ljk3NDMgODUuNjUyOSAyNS41MTc1IDg3LjI0NTQgMjUuNTE3NVoiIGZpbGw9IiNmZmZmZmYiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF81MDdfMTU2NiI+CjxyZWN0IHdpZHRoPSI5OCIgaGVpZ2h0PSI0MCIgZmlsbD0id2hpdGUiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K\" alt=\"Drigo\"><small></small>";
    const copy = el.querySelector('small'); copy.textContent = name;
    const price = document.createElement('span'); price.className = 'car-pin-price'; price.textContent = fleetPrices.get(name) || ''; copy.appendChild(price);
    // Shown but faded: a phone stylesheet that hides the cards then reads as zero width.
    el.hidden = false; el.classList.add('is-off');
    return { el, car: null, name };
  });
  // Hovering a marker (or tapping it on a phone) opens that car's card: model, year and body, and
  // today's price. A click keeps a hovered card open; a second click closes it.
  const fleetInfo = new Map(Array.from(document.querySelectorAll('.plan')).map(plan => [
    plan.querySelector('.plan-name')?.textContent.trim(), plan.querySelector('.plan-n')?.textContent.split(' · ').slice(1).join(' · ')
  ]));
  const pickedPin = { el: makeTag('is-drigo is-picked'), car: null, hover: false };
  pickedPin.el.innerHTML = fleetPins[0].el.querySelector('img').outerHTML + '<small></small>';
  // The car stops while its card is open, so the card stays under the pointer.
  function openPicked(car, hover = false) {
    if (pickedPin.car) pickedPin.car.paused = false;
    pickedPin.car = car; pickedPin.hover = hover; car.paused = true; car.v = 0;
    const copy = pickedPin.el.querySelector('small'); copy.textContent = car.drigoName;
    [['car-pin-meta', fleetInfo.get(car.drigoName)], ['car-pin-price', fleetPrices.get(car.drigoName)]].forEach(([cls, text]) => {
      if (!text) return; const line = document.createElement('span'); line.className = cls; line.textContent = text; copy.appendChild(line);
    });
    pickedPin.el.hidden = false; status(`${car.drigoName}. ${fleetPrices.get(car.drigoName) || ''}`.trim()); refreshView();
  }
  function closePicked() { if (pickedPin.car) pickedPin.car.paused = false; pickedPin.car = null; pickedPin.el.hidden = true; }
  const fleetChips = Array.from({ length: Math.max(10, Math.round(Number(options.fleetSize) || 0)) }, (_, k) => {
    const el = makeTag('is-drigo-chip');
    el.innerHTML = fleetPins[0].el.querySelector('img').outerHTML;
    // A map control, so a tap opens the card instead of starting a drag.
    el.dataset.mapControl = '';
    const chip = { el, car: null, name: fleetNames[k % fleetNames.length] };
    el.addEventListener('click', event => { event.stopPropagation(); if (!chip.car) return; if (pickedPin.car === chip.car && !pickedPin.hover) closePicked(); else openPicked(chip.car); });
    el.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && chip.car && (!pickedPin.car || pickedPin.hover)) openPicked(chip.car, true); });
    return chip;
  });
  // The camera keeps drifting, so a still mouse can slip off a marker: a hovered card closes only
  // once the mouse moves well away from its marker, or leaves the map.
  host.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !pickedPin.hover || !pickedPin.car) return;
    const chip = fleetChips.find(c => c.car === pickedPin.car);
    const r = chip?.el.getBoundingClientRect();
    if (!r || Math.hypot(event.clientX - (r.left + r.width / 2), event.clientY - (r.top + r.height / 2)) > 64) closePicked();
  });
  host.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && pickedPin.hover) closePicked(); });
  let fleetPickAt = -1, fleetBlocked = [], fleetCovered = [];
  const tags = fabric.tags || [];
  function pick(px, py) {
    if (!rooftopActive) {
      ndc.set(px / width * 2 - 1, -(py / height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const roofHit = raycaster.intersectObjects(roofTargets, false)[0];
      if (roofHit) return {kind:'rooftop', roof:roofHit.object.userData.roof};
    }
    // Traffic lights first (small targets), then cars, then landmarks.
    let best = null, bestD = 16;
    signalHeads.forEach(h => { projectTo(probe.set(h.x, .6, h.z), screen); const d = Math.hypot(screen.x - px, screen.y - py); if (screen.visible && d < bestD) { bestD = d; best = { kind: 'signal', sig: h.sig }; } });
    if (best) return best;
    bestD = 22;
    cars.forEach(car => { projectTo(carWorld(car, probe), screen); const d = Math.hypot(screen.x - px, screen.y - py); if (screen.visible && d < bestD) { bestD = d; best = { kind: 'car', car }; } });
    if (best) return best;
    for (const tag of tags) {
      const base = projectTo(probe.set(tag.at[0], 0, tag.at[1]), { ...screen }), top = projectTo(probe.set(tag.at[0], tag.h * world.scale.y, tag.at[1]), { ...screen });
      const edge = projectTo(probe.set(tag.at[0] + tag.r, 0, tag.at[1]), { ...screen }), radius = Math.max(18, Math.hypot(edge.x - base.x, edge.y - base.y));
      const dx = top.x - base.x, dy = top.y - base.y, len2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - base.x) * dx + (py - base.y) * dy) / len2));
      if (Math.hypot(px - (base.x + dx * t), py - (base.y + dy * t)) < radius) return { kind: 'landmark', tag };
    }
    return null;
  }
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), groundHit = new THREE.Vector3();
  function groundAt(px, py) { ndc.set(px / width * 2 - 1, -(py / height) * 2 + 1); raycaster.setFromCamera(ndc, camera); return raycaster.ray.intersectPlane(groundPlane, groundHit) ? groundHit.clone() : null; }

  // A hidden rooftop scene on the round Marina towers.
  const marina = destinations[1].focus;
  const marinaRoofs = fabric.roundedTowers.filter(t=>Math.hypot(t.x-marina[0],t.z-marina[2])<11);
  const characterRoof=fabric.roundedTowers.find(t=>t.featured)||marinaRoofs.reduce((best,t)=>!best||Math.hypot(t.x-6.6,t.z-53.5)<Math.hypot(best.x-6.6,best.z-53.5)?t:best,null);
  const roofTargets = (characterRoof?[characterRoof]:[]).map(roof=>{
    const target=new THREE.Mesh(g(new THREE.CylinderGeometry(roof.radius,roof.radius,roof.y,16)),m(new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})));
    target.position.set(roof.x,roof.y/2,roof.z);target.userData.roof=roof;world.add(target);return target;
  });
  // Street trees and pocket parks (city-greenery.js). Built after the day-material snapshot
  // so the night theme leaves their greens alone.
  const greenery={count:0};
  const rooftopDuo = createRooftopDuo({THREE,g,m});
  world.add(rooftopDuo.root);
  let activeRoof=characterRoof;
  if(activeRoof){
    terrace=createRooftopScene({THREE,g,m});
    const scale=activeRoof.radius/8,miniature=terrace.roofGroup.clone(true);
    for(const child of [...miniature.children])if(child.name==='rooftop-characters'||child.name==='tower-shell')miniature.remove(child);
    miniature.scale.setScalar(scale);miniature.position.set(activeRoof.x,activeRoof.y+.008,activeRoof.z);world.add(miniature);
    // Share the terrace design across every round roof using instancing.
    const otherRoofs=fabric.roundedTowers.filter(roof=>roof!==activeRoof);
    const template=miniature.clone(true);template.position.set(0,0,0);template.scale.setScalar(1);template.updateMatrixWorld(true);
    const groups=new Map();
    template.traverse(node=>{
      if(!node.isMesh||node.material.transparent)return;
      const key=node.geometry.uuid+':'+node.material.uuid;
      if(!groups.has(key))groups.set(key,{geometry:node.geometry,material:node.material,parts:[]});
      groups.get(key).parts.push(node.matrixWorld.clone());
    });
    const placement=new THREE.Matrix4(),combined=new THREE.Matrix4();
    for(const group of groups.values()){
      const batch=new THREE.InstancedMesh(group.geometry,group.material,group.parts.length*otherRoofs.length);let index=0;
      for(const roof of otherRoofs){const k=roof.radius/8;placement.makeScale(k,k,k);placement.setPosition(roof.x,roof.y+.008,roof.z);
        for(const part of group.parts){combined.multiplyMatrices(placement,part);batch.setMatrixAt(index++,combined);}
      }
      batch.instanceMatrix.needsUpdate=true;world.add(batch);
    }

    rooftopDuo.root.scale.setScalar(.85*scale);rooftopDuo.root.rotation.y=Math.PI+.28;
    rooftopDuo.root.position.set(activeRoof.x,activeRoof.y+.008,activeRoof.z-6.5*scale);
  }
  const rooftopLight=new THREE.PointLight('#fff1da',.35,2,1.4);rooftopLight.visible=false;world.add(rooftopLight);
  const heroElement=host.closest('.hero');
  const roofBack=document.createElement('button');roofBack.type='button';roofBack.className='rooftop-back';roofBack.textContent='← Back to Marina';roofBack.hidden=true;heroElement.appendChild(roofBack);
  const roofCaption=document.createElement('div');roofCaption.className='rooftop-caption';roofCaption.hidden=true;roofCaption.innerHTML='<strong>Ooooooo!</strong><span>Mordecai &amp; Rigby · Drag to look around</span>';heroElement.appendChild(roofCaption);
  const roofAccess=document.createElement('button');roofAccess.type='button';roofAccess.className='rooftop-access';roofAccess.textContent='Visit the Marina rooftop';roofAccess.hidden=true;heroElement.appendChild(roofAccess);
  function openRooftop(roof=activeRoof){
    if(!roof||roof!==characterRoof||rooftopActive)return;
    stopFollow();release();rooftopSaved={...targetState};activeRoof=roof;rooftopActive=true;
    const startFocus=cameraTarget.clone();
    const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    startFocus.addScaledVector(right,(camera.left+camera.right)/2).addScaledVector(up,(camera.top+camera.bottom)/2);
    const startPitch=Math.atan2(camera.position.y-cameraTarget.y,Math.hypot(camera.position.x-cameraTarget.x,camera.position.z-cameraTarget.z));
    roofEntry=reducedMotion?null:{start:performance.now(),focus:startFocus,height:(camera.top-camera.bottom)/camera.zoom,yaw:Math.atan2(camera.position.x-cameraTarget.x,camera.position.z-cameraTarget.z),pitch:startPitch,distance:Math.hypot(camera.position.x-cameraTarget.x,camera.position.z-cameraTarget.z)};
    if(roofEntry)targetState.yaw=roofEntry.yaw;
    targetState.pitch=.3;targetState.zoom=1;Object.assign(cameraState,targetState);
    heroElement.classList.add('is-rooftop');roofBack.hidden=false;roofCaption.hidden=false;roofAccess.hidden=true;
    status('Mordecai and Rigby on the Marina rooftop. Press Escape or Back to Marina to leave.');roofBack.focus({preventScroll:true});refreshView();
  }
  function closeRooftop(){
    if(!rooftopActive)return;
    roofEntry=null;
    rooftopCarBadges.forEach(({badge})=>badge.visible=false);
    rooftopActive=false;rooftopLight.visible=false;Object.assign(targetState,rooftopSaved);Object.assign(cameraState,rooftopSaved);viewFocus.set(targetState.targetX,targetState.targetY,targetState.targetZ);
    heroElement.classList.remove('is-rooftop');roofBack.hidden=true;roofCaption.hidden=true;roofAccess.hidden=destination!==1;
    status('Returned to Marina.');host.focus({preventScroll:true});refreshView();
  }
  roofBack.addEventListener('click',closeRooftop);roofAccess.addEventListener('click',()=>openRooftop());
  const roofKey=event=>{if(event.key==='Escape')closeRooftop();};document.addEventListener('keydown',roofKey);

  // Pin, walking route and the selected car's ring.
  const pinMaterial = m(new THREE.MeshStandardMaterial({ color: '#4d21ff', emissive: '#4d21ff', emissiveIntensity: .6, roughness: .4 }));
  const pin = new THREE.Group();
  const pinHead = new THREE.Mesh(g(new THREE.SphereGeometry(.16, 18, 14)), pinMaterial); pinHead.position.y = .62;
  const pinStem = new THREE.Mesh(g(new THREE.ConeGeometry(.12, .48, 18)), pinMaterial); pinStem.rotation.x = Math.PI; pinStem.position.y = .36;
  const pinDot = new THREE.Mesh(g(new THREE.SphereGeometry(.06, 12, 10)), basic('#ffffff', { toneMapped: false })); pinDot.position.set(0, .62, .14);
  pin.add(pinHead, pinStem, pinDot); pin.visible = false; world.add(pin);
  const ringMaterial = basic('#9f8cff', { toneMapped: false, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide });
  const carRing = new THREE.Mesh(g(new THREE.RingGeometry(.26, .32, 40)), ringMaterial); carRing.rotation.x = -Math.PI / 2; carRing.visible = false; world.add(carRing);
  const hoverRing = new THREE.Mesh(g(new THREE.RingGeometry(.24, .28, 40)), basic('#ffffff', { toneMapped: false, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }));
  hoverRing.rotation.x = -Math.PI / 2; hoverRing.visible = false; world.add(hoverRing);
  const ROUTE_DOTS = 60;
  const routeDots = new THREE.InstancedMesh(g(new THREE.CircleGeometry(.075, 12)), basic('#d8ccff', { toneMapped: false, transparent: true, opacity: .95, depthWrite: false }), ROUTE_DOTS);
  routeDots.count = 0; routeDots.frustumCulled = false; world.add(routeDots);
  const dotMatrix = new THREE.Matrix4(), dotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), dotPos = new THREE.Vector3(), dotScale = new THREE.Vector3(1, 1, 1);

  // Fireworks over the Burj Khalifa.
  const SPARKS = 1400, sparkPos = new Float32Array(SPARKS * 3), sparkVel = new Float32Array(SPARKS * 3), sparkCol = new Float32Array(SPARKS * 3), sparkLife = new Float32Array(SPARKS), sparkAge = new Float32Array(SPARKS).fill(99);
  const sparkGeometry = g(new THREE.BufferGeometry());
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3).setUsage(THREE.DynamicDrawUsage));
  const sparkCanvas = document.createElement('canvas'); sparkCanvas.width = sparkCanvas.height = 64;
  { const ctx = sparkCanvas.getContext('2d'), grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.25, 'rgba(255,255,255,.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64); }
  const sparkTexture = new THREE.CanvasTexture(sparkCanvas);
  const sparkMaterial = m(new THREE.PointsMaterial({ map: sparkTexture, size: 9, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial); sparks.frustumCulled = false; world.add(sparks);
  let sparkCursor = 0; const shells = [];
  const sparkPalette = ['#c9b8ff', '#ffd27a', '#ffffff', '#ff8fb3', '#7fd6ff', '#9dffb0'].map(color => new THREE.Color(color));
  function burst(x, y, z, colour) {
    for (let i = 0; i < 180; i++) {
      const k = sparkCursor = (sparkCursor + 1) % SPARKS, u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), speed = 1.6 + Math.random() * .9;
      sparkPos.set([x, y, z], k * 3); sparkVel.set([Math.cos(a) * s * speed, u * speed + .3, Math.sin(a) * s * speed], k * 3);
      const c = Math.random() < .25 ? sparkPalette[2] : colour; sparkCol.set([c.r, c.g, c.b], k * 3); sparkLife[k] = 1.5 + Math.random() * .8; sparkAge[k] = 0;
    }
  }
  function fireworks(tag) { if (reducedMotion) return; for (let i = 0; i < 7; i++) shells.push({ at: i * .45 + Math.random() * .2, x: tag.at[0] + (Math.random() - .5) * 2.6, y: tag.h * (.42 + Math.random() * .34), z: tag.at[1] + (Math.random() - .5) * 2.6, colour: sparkPalette[i % sparkPalette.length] }); }

  let following = null, selectedCar = null, tapPoint = null, landmarkShown = null, toastUntil = 0, hovered = null, clock = 0;
  const status = text => options.onStatus?.(text);
  function release() { if (selectedCar) selectedCar.hold = false; selectedCar = null; pin.visible = false; carRing.visible = false; routeDots.count = 0; carTag.hidden = true; tapPoint = null; }
  function stopFollow() { following = null; if (!selectedCar) { carRing.visible = false; carTag.hidden = true; } }
  function showToast(text, seconds = 2.2) { toast.textContent = text; toast.hidden = false; toastUntil = clock + seconds; }
  function dismissHint() { hint.classList.add('is-gone'); }
  function handleTap(px, py) {
    if(rooftopActive)return;
    dismissHint(); closePicked();
    const hit = pick(px, py);
    if(hit?.kind==='rooftop'){openRooftop(hit.roof);return;}
    landmarkShown = null; landmarkTag.hidden = true;
    if (hit?.kind === 'signal') { hit.sig.phase += SIGNAL_PERIOD / 2; showToast('Lights switched'); status('Traffic light switched.'); return; }
    if (hit?.kind === 'car') {
      release(); following = hit.car; carRing.visible = true;
      targetState.zoom = Math.max(targetState.zoom, 4.3); focused = true;
      carTag.innerHTML = '<b>Riding along</b><small>Demo drive · tap map to stop</small>'; carTag.hidden = false;
      status('Following a car through the city. Tap the map to stop.'); refreshView(); return;
    }
    if (hit?.kind === 'landmark') {
      stopFollow(); landmarkShown = hit.tag;
      landmarkTag.innerHTML = `<b>${hit.tag.name}</b><small>${hit.tag.sub}</small>`; landmarkTag.hidden = false;
      if (hit.tag.key === 'burj') fireworks(hit.tag);
      status(`${hit.tag.name}. ${hit.tag.sub}.`); return;
    }
    stopFollow(); release();
    const ground = groundAt(px, py);
    if (!ground || !fabric.isLand(ground.x, ground.z)) { status('Tap on land to find the closest car.'); return; }
    // Closest car to the tapped spot: it pulls over to the kerb and a walking route leads to it.
    let best = null, bestD = Infinity;
    cars.forEach(car => { const d = carWorld(car, probe).distanceTo(ground); if (d < bestD) { bestD = d; best = car; } });
    if (!best) return;
    tapPoint = ground; pin.position.set(ground.x, 0, ground.z); pin.visible = true; pin.userData.drop = 0;
    selectedCar = best; best.hold = true; carRing.visible = true;
    const minutes = Math.max(1, Math.round(bestD * 250 / 80));
    carTag.innerHTML = `<b>Closest car · ${minutes} min walk</b><small>Illustration · see real cars in the app</small>`; carTag.hidden = false;
    status(`Closest car is about ${minutes} minutes' walk away. This map is an illustration; the app shows real cars.`);
  }
  function updateInteraction(delta) {
    clock += delta;
    rooftopDuo.update(clock, reducedMotion);
    // Follow cam: the view glides after the car.
    if (following) { carWorld(following, probe); viewFocus.set(probe.x, 1.2, probe.z); composeTarget(); }
    const pulse = 1 + Math.sin(clock * 4) * .08;
    const ringCar = following || selectedCar;
    if (ringCar) { carWorld(ringCar, probe); carRing.position.set(probe.x, .1, probe.z); carRing.scale.setScalar(pulse); }
    if (hovered && hovered !== ringCar) { carWorld(hovered, probe); hoverRing.position.set(probe.x, .1, probe.z); hoverRing.visible = true; } else hoverRing.visible = false;
    if (pin.visible) { pin.userData.drop = Math.min(1, (pin.userData.drop || 0) + delta * 3); const t = pin.userData.drop; pin.position.y = (1 - t) * (1 - t) * 2.4; pin.rotation.y += delta * 1.2; }
    // Route dots stream from the pin to the car.
    if (selectedCar && tapPoint) {
      const end = carWorld(selectedCar, probe).clone(), dist = tapPoint.distanceTo(end), count = Math.min(ROUTE_DOTS, Math.max(4, Math.floor(dist / .18)));
      for (let i = 0; i < count; i++) { const t = ((i + (clock * 1.6) % 1) / count); dotPos.lerpVectors(tapPoint, end, t); dotPos.y = .1; dotMatrix.compose(dotPos, dotQuat, dotScale.setScalar(.7 + .3 * Math.sin(t * Math.PI))); routeDots.setMatrixAt(i, dotMatrix); }
      routeDots.count = count; routeDots.instanceMatrix.needsUpdate = true;
    }
    // Fireworks.
    for (let i = shells.length - 1; i >= 0; i--) { shells[i].at -= delta; if (shells[i].at <= 0) { burst(shells[i].x, shells[i].y, shells[i].z, shells[i].colour); shells.splice(i, 1); } }
    let live = false;
    for (let k = 0; k < SPARKS; k++) {
      if (sparkAge[k] >= sparkLife[k]) { if (sparkAge[k] < 90) { sparkPos[k * 3 + 1] = -50; sparkAge[k] = 99; } continue; }
      live = true; sparkAge[k] += delta; sparkVel[k * 3 + 1] -= 1.1 * delta;
      const drag = Math.pow(.35, delta); sparkVel[k * 3] *= drag; sparkVel[k * 3 + 1] *= drag; sparkVel[k * 3 + 2] *= drag;
      sparkPos[k * 3] += sparkVel[k * 3] * delta; sparkPos[k * 3 + 1] += sparkVel[k * 3 + 1] * delta; sparkPos[k * 3 + 2] += sparkVel[k * 3 + 2] * delta;
      const fade = Math.max(0, 1 - sparkAge[k] / sparkLife[k]); sparkCol[k * 3] *= .985 + fade * .015; sparkCol[k * 3 + 1] *= .98 + fade * .02; sparkCol[k * 3 + 2] *= .985 + fade * .015;
    }
    if (live || shells.length) { sparkGeometry.attributes.position.needsUpdate = true; sparkGeometry.attributes.color.needsUpdate = true; }
    // Labels follow their subject on screen.
    const place = (el, v, lift, clamp = false) => { projectTo(v, screen); let y = screen.y - lift; if (clamp) y = Math.max(150, Math.min(height - 90, y)); el.style.transform = `translate(${screen.x}px, ${y}px)`; el.classList.toggle('is-off', !screen.visible || screen.x < 0 || screen.x > width || (!clamp && (screen.y < 0 || screen.y > height))); };
    // Keep the whole marked fleet in view: a car that drives off screen or under the hero copy hands
    // its marker to another Drigo car in view, preferring the marker's own model so each model shows.
    const fleetAt=car=>projectTo(carWorld(car,probe),{x:0,y:0,visible:false});
    const inView=p=>p.visible&&p.x>24&&p.x<width-24&&p.y>110&&p.y<height-80&&!fleetBlocked.some(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom);
    const points=new Map();
    // A released marker fades out where it was and rests briefly before it fades in on another car.
    const releaseChip=chip=>{chip.car=null;chip.coveredAt=null;chip.releasedAt=clock;};
    for(const chip of fleetChips){if(!chip.car)continue;const p=fleetAt(chip.car);if(inView(p))points.set(chip,p);else releaseChip(chip);}
    if(points.size<fleetChips.length&&clock>=fleetPickAt&&drigoCars.length){
      fleetPickAt=clock;
      const box=host.getBoundingClientRect();
      fleetBlocked=[...(heroElement?.querySelectorAll('.hero-heading, .district-nav')||[])].map(el=>el.getBoundingClientRect()).filter(r=>r.width)
        .map(r=>({left:r.left-box.left-16,right:r.right-box.left+16,top:r.top-box.top-16,bottom:r.bottom-box.top+16}));
      const taken=new Set(fleetChips.map(chip=>chip.car).filter(Boolean));
      const covered=p=>fleetCovered.some(r=>p.x>r.left-24&&p.x<r.right+24&&p.y>r.top&&p.y<r.bottom+34);
      const pool=drigoCars.filter(car=>!taken.has(car)).map(car=>({car,p:fleetAt(car)})).filter(({p})=>inView(p)&&!covered(p));
      for(const chip of fleetChips){
        if(chip.car||clock-(chip.releasedAt??-9)<.3)continue;
        let best=null,bestScore=-Infinity;
        for(const c of pool){
          if(taken.has(c.car))continue;
          let near=400;for(const q of points.values())near=Math.min(near,Math.hypot(c.p.x-q.x,c.p.y-q.y));
          let inside=Math.min(c.p.x-24,width-24-c.p.x,c.p.y-110,height-80-c.p.y);
          for(const r of fleetBlocked)inside=Math.min(inside,Math.hypot(Math.max(r.left-c.p.x,0,c.p.x-r.right),Math.max(r.top-c.p.y,0,c.p.y-r.bottom)));
          const score=Math.min(near,240)+Math.min(inside,160)+(c.car.drigoName===chip.name?400:0);
          if(score>bestScore){best=c;bestScore=score;}
        }
        if(!best){fleetPickAt=clock+.25;break;}
        chip.car=best.car;chip.shownAt=clock;taken.add(best.car);points.set(chip,best.p);
      }
    }
    // Reserve each card's real screen rectangle; lift converging pins with a leader. Kept calm: a card
    // or marker stays with its car while it can and fades out for a moment rather than jump to another.
    const pinRects=[],carded=new Set();let openRect=null;
    // The opened card sits above its car's marker, so the pointer stays on the marker.
    if(pickedPin.car){
      const p=fleetAt(pickedPin.car),w=pickedPin.el.offsetWidth,h=pickedPin.el.offsetHeight,lift=18+(fleetChips[0].el.offsetHeight||22);
      if(!p.visible||p.x<0||p.x>width||p.y<0||p.y>height||(pickedPin.hover&&!fleetChips.some(chip=>chip.car===pickedPin.car)))closePicked();
      else{
        // Kept inside the map near its edges, and hung below the car under the header or the hero copy.
        // When neither fits, it slides sideways off the copy (its pointer still aims at the car).
        const clampX=x=>Math.min(Math.max(x,w/2+8),width-w/2-8),fits=(x,y)=>y-h>=100&&y<=height-8&&!fleetBlocked.some(r=>x-w/2<r.right&&x+w/2>r.left&&y-h<r.bottom&&y>r.top);
        const xs=[p.x,...fleetBlocked.flatMap(r=>[r.right+w/2+8,r.left-w/2-8])].map(clampX).filter(x=>Math.abs(x-p.x)<=w*.9).sort((a,b)=>Math.abs(a-p.x)-Math.abs(b-p.x));
        let place=null;
        for(const x of xs){for(const [y,below] of [[p.y-lift,false],[p.y+14+h,true]])if(fits(x,y)){place={x,y,below};break;}if(place)break;}
        const {x,y,below}=place||{x:clampX(p.x),y:p.y-lift,below:false};
        pickedPin.el.classList.toggle('is-below',below);
        pickedPin.el.style.setProperty('--arrow-x',`${Math.max(-w/2+14,Math.min(w/2-14,p.x-x))}px`);
        openRect={left:x-w/2-8,right:x+w/2+8,top:y-h-8,bottom:y+8};pickedPin.el.style.transform=`translate(${x}px,${y}px)`;
      }
    }
    for(const marker of fleetPins){
      // While a car's card is open the price cards step aside; they return on the same cars.
      if(pickedPin.car){marker.el.classList.add('is-off');continue;}
      const w=marker.el.offsetWidth,h=marker.el.offsetHeight;
      const fit=([chip,p])=>{
        for(const lift of [...new Set([chip.car===marker.car&&marker.lift||20,20,20+h+16,20+(h+16)*2,20+(h+16)*3])]){
          const box={left:p.x-w/2-8,right:p.x+w/2+8,top:p.y-lift-h-8,bottom:p.y-lift+8};
          if(box.left<8||box.right>width-8||box.top<100||box.bottom>height-70)continue;
          if([...pinRects,...fleetBlocked].some(r=>box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top))continue;
          return {car:chip.car,p,box,lift};
        }
        return null;
      };
      let layout=null;
      if(w){
        const current=marker.car&&[...points].find(([chip])=>chip.car===marker.car);
        if(current)layout=fit(current);
        if(layout)marker.lostAt=null;
        else{
          // A card that does not fit waits on its car (faded) for a moment; one whose car left fades
          // out first. Only then does it move to another car of its model, and fade in there.
          marker.lostAt??=clock;
          if(clock-marker.lostAt>=(current?1.5:.3)){
            for(const entry of points)if(entry[0].car.drigoName===marker.name&&entry[0].car!==marker.car&&(layout=fit(entry)))break;
            if(layout){marker.lostAt=null;marker.shownAt=clock;}
          }
        }
      }
      marker.el.classList.toggle('is-off',!layout||clock-(marker.shownAt??-9)<.05);
      if(!layout)continue;
      pinRects.push(layout.box);carded.add(layout.car);marker.car=layout.car;marker.lift=layout.lift;
      marker.el.dataset.carId=String(cars.indexOf(marker.car));
      marker.el.style.setProperty('--pin-leader',`${Math.max(0,layout.lift-20)}px`);marker.el.style.transform=`translate(${layout.p.x}px,${layout.p.y-layout.lift}px)`;
    }
    // A card marks its own car. A marker under a price card fades and, if the card has not passed by
    // after a few seconds, moves to another car; under the open card it only fades until it closes.
    fleetCovered=openRect?[...pinRects,openRect]:pinRects;
    for(const chip of fleetChips){
      const p=points.get(chip),box=p&&{left:p.x-24,right:p.x+24,top:p.y-34,bottom:p.y};
      const hit=r=>box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top;
      const underCard=!!p&&!carded.has(chip.car)&&chip.car!==pickedPin.car&&pinRects.some(hit);
      const underOpen=!!p&&!!openRect&&chip.car!==pickedPin.car&&hit(openRect);
      if(underCard){if(clock-(chip.coveredAt??=clock)>4)releaseChip(chip);}else chip.coveredAt=null;
      if(!chip.car){chip.el.classList.add('is-off');chip.el.classList.remove('is-open');chip.el.hidden=clock-(chip.releasedAt??-9)>.3;continue;}
      chip.el.hidden=false;
      chip.el.classList.toggle('is-off',carded.has(chip.car)||underCard||underOpen||clock-(chip.shownAt??-9)<.05);chip.el.classList.toggle('is-open',chip.car===pickedPin.car);
      chip.el.style.transform=`translate(${p.x}px,${p.y-8}px)`;
    }
    if (!carTag.hidden && ringCar) place(carTag, carWorld(ringCar, probe), 34);
    if (!landmarkTag.hidden && landmarkShown) place(landmarkTag, probe.set(landmarkShown.at[0], landmarkShown.h * world.scale.y, landmarkShown.at[1]), 18, true);
    if (!toast.hidden) { toast.style.transform = `translate(${width / 2}px, ${Math.min(height * .22, 180)}px)`; if (clock > toastUntil) toast.hidden = true; }
  }
  function onHover(event) {
    if (dragging || event.pointerType === 'touch') return;
    const box = host.getBoundingClientRect(), hit = pick(event.clientX - box.left, event.clientY - box.top);
    hovered = hit?.kind === 'car' ? hit.car : null;
    if (hit) host.dataset.hot = ''; else delete host.dataset.hot;
    host.style.cursor = hit ? 'pointer' : 'grab';
  }
  host.addEventListener('pointermove', onHover);
  host.addEventListener('pointerleave', () => { hovered = null; delete host.dataset.hot; });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closePicked(); if (event.key === 'Escape' && (following || selectedCar)) { stopFollow(); release(); } });

  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove, { passive: false });
  host.addEventListener('pointerup', onPointerEnd);
  host.addEventListener('pointercancel', onPointerEnd);
  host.addEventListener('lostpointercapture', onPointerEnd);
  document.addEventListener('visibilitychange', wake);
  reducedQuery.addEventListener?.('change', onPreference);
  // Apply the complete theme and camera before exposing the first frame.
  resize();
  setTheme(options.theme === 'day' ? 'day' : 'night', false);
  // Prepare shaders and upload geometry while the canvas is still hidden.
  // Reveal only after a complete themed frame has reached the compositor.
  fabric.setIntro(1);
  updateCars(elapsed); updatePulses(elapsed);
  async function prepareFirstFrame() {
    // Compile only what the opening camera actually renders, rather than every
    // district and rooftop material in the entire city before the first paint.
    if(disposed)return;
    initialized=true;
    resize();
    requestAnimationFrame(()=>{
      if(disposed)return;
      renderOnce();
      requestAnimationFrame(()=>{
        if(disposed)return;
        ready=true;
        renderer.domElement.style.opacity='1';
        options.onReady?.({renderer});
        wake();
      });
    });
  }
  prepareFirstFrame();
  // Explicit paint on startup and page restoration, independent of scroll observers.
  const repaint=()=>{if(disposed)return;resize();wake();};
  const firstPaint=requestAnimationFrame(repaint);
  window.addEventListener('pageshow',repaint);
  wake();

  return {
    setDestination(index) {
      closeRooftop();
      roofAccess.hidden=Number(index)!==1;
      stopFollow();
      fleetPins.forEach(marker=>{marker.car=null;marker.el.classList.add('is-off');});
      fleetChips.forEach(chip=>{chip.car=null;chip.el.hidden=true;});fleetPickAt=-1;closePicked();
      destination = THREE.MathUtils.clamp(Math.round(Number(index) || 0), 0, destinations.length - 1);
      focused = true;
      rings.forEach((ring, i) => { ring.material.color.set(i === destination ? '#c5b5ff' : '#75648e'); ring.material.opacity = i === destination ? 0.95 : 0.4; });
      usePreset(destinations[destination]);
      interacted('destination'); refreshView();
    },
    rotateBy, zoomBy, resetView, setTheme,
    // Retained for existing integrations. Scrolling never moves an explorable
    // map away from the user's chosen view.
    setOrbit(t) { driftTarget.orbit = THREE.MathUtils.clamp(Number(t) || 0, 0, 1); refreshView(); },
    setLean(x, y) { driftTarget.leanX = THREE.MathUtils.clamp(Number(x) || 0, -1, 1); driftTarget.leanY = THREE.MathUtils.clamp(Number(y) || 0, -1, 1); wake(); },
    setProgress(t) { progress = THREE.MathUtils.clamp(Number(t) || 0, 0, 1); },
    setPaused(value) { paused = Boolean(value); notifyView(); wake(); },
    openRooftop, closeRooftop,
    getRooftopState() {return {active:rooftopActive,roof:activeRoof,clearSightlines:rooftopDuo.root.userData.clearSightlines,joints:rooftopDuo.joints.map(j=>[j.rotation.x,j.rotation.y,j.rotation.z])};},
    getRooftops() { return fabric.roundedTowers.map(t=>({...t, screen:projectTo(new THREE.Vector3(t.x,t.y,t.z),{})})); },
    getTrafficState(all=false) {return cars.filter(car=>all||car.isDrigo).map(car=>({distance:car.distanceTravelled,speed:car.v,routeLength:car.loop.length,roads:car.loop.line.roads?.length||1,position:carWorld(car,new THREE.Vector3()).toArray()}));},
    getStats() { return { plants:greenery.count, ready, people: peopleCount, boats: boatCount, ...renderer.info.render, ...getView(), cars: carCount, progress, districtCount: districtList.length, districtNames: districtList.map(district => district.name), buildingCount: totalBuildingCount, newBuildingCount, landBounds: { ...landBounds }, trafficPathCount: trafficRoutes.length, roadsWithCars:new Set(cars.map(c=>c.homeLoop)).size, roadCount:loops.length, cityJourneyCount:journeys.length, cityJourneyRoads:new Set(journeys.flatMap(route=>route.line.roads)).size, rooftopDrigoCars:cars.filter(c=>c.isDrigo&&c.loop.line.nearRooftop).length, landmarkCount: landmarkModel.landmarkCount, geo: fabric.stats, fabricBounds: { ...fabric.fabricBounds },lighting:getLightingStats() }; },
    resize,
    dispose() {
      if (disposed) return;
      onPointerEnd();
      disposed = true;
      cancelAnimationFrame(raf);cancelAnimationFrame(firstPaint);
      window.removeEventListener('pageshow',repaint);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      host.removeEventListener('pointerdown', onPointerDown); host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerEnd); host.removeEventListener('pointercancel', onPointerEnd);
      host.removeEventListener('lostpointercapture', onPointerEnd);
      document.removeEventListener('visibilitychange', wake);
      reducedQuery.removeEventListener?.('change', onPreference);
      Object.assign(host.style, originalHostStyle);
      rooftopDuo.dispose();terrace?.dispose();badgeTextures.forEach(texture=>texture.dispose());
      roofBack.remove();roofCaption.remove();roofAccess.remove();document.removeEventListener('keydown',roofKey);
      drigoLogoTexture.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
