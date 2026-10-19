import {createRooftopDuo} from './rooftop-duo.js';

// Shared metre-scale terrace template, instanced into the main city.
export function createRooftopScene({THREE,g,m}) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#172238');scene.fog=new THREE.Fog('#243148',65,240);
  const camera=new THREE.PerspectiveCamera(48,1,.1,350);
  scene.add(new THREE.HemisphereLight('#a9caff','#574838',2));
  const moon=new THREE.DirectionalLight('#bed7ff',2.2);moon.position.set(-20,40,15);scene.add(moon);
  const mat=(color,extra={})=>m(new THREE.MeshStandardMaterial({color,roughness:.75,...extra}));
  const stone=mat('#827f79'),metal=mat('#303944',{metalness:.7,roughness:.3}),wood=mat('#745341');
  const glow=mat('#ffe5ae',{emissive:'#ffc373',emissiveIntensity:3});
  const roofGroup=new THREE.Group();scene.add(roofGroup);let content=roofGroup;
  const boxGeo=g(new THREE.BoxGeometry(1,1,1));
  function box(w,h,d,x,y,z,material,parent=content){const mesh=new THREE.Mesh(boxGeo,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  const sphereGeometries=new Map();
  function sphere(r,x,y,z,material,parent=content){if(!sphereGeometries.has(r))sphereGeometries.set(r,g(new THREE.SphereGeometry(r,12,8)));const mesh=new THREE.Mesh(sphereGeometries.get(r),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  function cylinder(radius,height,y,material){const mesh=new THREE.Mesh(g(new THREE.CylinderGeometry(radius,radius,height,64)),material);mesh.position.y=y;content.add(mesh);return mesh;}
  cylinder(8,.45,-.25,stone);cylinder(7.85,64,-32.5,mat('#444b57')).name='tower-shell';
  cylinder(8.15,.18,-.55,metal);
  const seam=mat('#696b68');
  for(let x=-6;x<=6;x+=2){const length=2*Math.sqrt(64-x*x);box(.018,.006,length,x,.001,0,seam);box(length,.006,.018,0,.001,x,seam);}
  // Circular handrails follow the same round tower in the map.
  for(const y of [1.1,.52]){const rail=new THREE.Mesh(g(new THREE.TorusGeometry(7.85,.025,8,96)),metal);rail.rotation.x=Math.PI/2;rail.position.y=y;roofGroup.add(rail);}
  for(let i=0;i<48;i++){const angle=i*Math.PI/24;box(.045,1.1,.045,Math.sin(angle)*7.85,.55,Math.cos(angle)*7.85,metal);}
  for(const x of [-5.5,5.5])for(const z of [-4,4]){box(.15,.8,.15,x,.4,z,metal);sphere(.12,x,.94,z,glow);const light=new THREE.PointLight('#ffcc8c',13,7,2);light.position.set(x,1.5,z);scene.add(light);}
  for(const x of [-5,5]){box(2,.12,.65,x,.48,4,wood);box(2,.55,.1,x,.82,4.3,wood);for(const dx of [-.8,.8])box(.09,.48,.5,x+dx,.24,4,metal);}
  // Festoon bulbs and a thin cable above the back of the terrace.
  for(let i=0;i<=24;i++){const x=-5+i*10/24,y=3.25-.65*Math.sin(i/24*Math.PI);sphere(.038,x,y,-5.6,glow);if(i<24)box(.42,.018,.018,x+.21,y,-5.6,metal);}
  for(const x of [-5,5])box(.055,3.3,.055,x,1.65,-5.6,metal);
  const duo=createRooftopDuo({THREE,g,m});duo.root.scale.setScalar(.85);duo.root.position.set(0,.02,-6.5);roofGroup.add(duo.root);duo.root.name='rooftop-characters';duo.root.rotation.y=Math.PI+.28;
  const key=new THREE.PointLight('#ffe8c4',35,13,2);key.position.set(1,4,4);scene.add(key);
  content=scene;
  // City below: towers use floor-sized windows and broad streets, not map-scale blocks.
  // Soft contact shadows keep feet and furniture grounded.
  const shadowMat=m(new THREE.MeshBasicMaterial({color:'#101722',transparent:true,opacity:.18,depthWrite:false}));
  for(const [x,z,sx,sz] of [[0,-6.5,1.05,.5]]){const shadow=new THREE.Mesh(g(new THREE.CircleGeometry(1,32)),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.scale.set(sx,sz,1);shadow.position.set(x,.012,z);roofGroup.add(shadow);}
  return {roofGroup,dispose(){duo.dispose();}};
}
