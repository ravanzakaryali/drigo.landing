/** White architectural landmarks for the live, illustrative Dubai map. */
export function buildReferenceLandmarks({ THREE, world, g, m, standard, mat, mesh, footprint, curve, road, ribbon, box, instance, cylinder, sphere, palm, tree }, positions = {}) {
  const fitPoints = [];
  const white = standard('#f8f8f6', { roughness: .62, metalness: .035 });
  const pearl = standard('#e8ebed', { roughness: .48, metalness: .14 });
  const silver = standard('#bcc4cd', { roughness: .34, metalness: .44 });
  const glazing = standard('#aab7c5', { roughness: .26, metalness: .42 });
  const paving = standard('#e3e5e7', { roughness: .92 });
  const roadLine = standard('#c8cdd4', { roughness: .9 });
  const ground = .12;
  const addBounds = (x,z,w,d,h) => {
    for (const sx of [-1,1]) for (const sz of [-1,1]) {
      fitPoints.push(new THREE.Vector3(x+sx*w/2,0,z+sz*d/2));
      fitPoints.push(new THREE.Vector3(x+sx*w/2,h,z+sz*d/2));
    }
  };
  function island(points,top=ground,depth=.15,material=white) {
    // Exact, un-beveled tops keep roads above land and separate from the sea.
    mesh(footprint(points,depth,0),material,0,top-depth,0);
    points.forEach(([x,z])=>fitPoints.push(new THREE.Vector3(x,top,z)));
  }
  function ellipse(x,z,rx,rz,material=white,top=ground) {
    const points=Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return[x+Math.cos(a)*rx,z+Math.sin(a)*rz];});
    island(points,top,.15,material);
  }
  function landStrip(path,width,top=ground) {
    const left=[],right=[];
    for(let i=0;i<=52;i++) {
      const p=path.getPointAt(i/52),t=path.getTangentAt(i/52);
      left.push([p.x-t.z*width/2,p.z+t.x*width/2]);
      right.push([p.x+t.z*width/2,p.z-t.x*width/2]);
    }
    island([...left,...right.reverse()],top,.15);
  }
  function rod(parent,a,b,radius,material=silver) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const node=mesh(g(new THREE.CylinderGeometry(radius,radius,delta.length(),6)),material);
    node.position.copy(start.add(end).multiplyScalar(.5));
    node.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    if(parent)parent.add(node);
    return node;
  }
  const towerCylinder=g(new THREE.CylinderGeometry(1,1,1,20));

  // BURJ KHALIFA — three rounded wings step back independently into a needle.
  const [bx,bz]=positions.burj||[8,4];
  ellipse(bx,bz,2.45,2.15,paving,.03);
  instance(towerCylinder,white,[bx,.2,bz],[1.28,.2,1.28]);
  const baseYaw=.22;
  for(let level=0;level<17;level++) {
    const t=level/17,y=.3+level*.945,h=.946;
    const coreRadius=.85*Math.pow(1-t,1.12)+.09;
    instance(towerCylinder,glazing,[bx,y+h/2,bz],[coreRadius,h,coreRadius]);
    instance(towerCylinder,pearl,[bx,y+.045,bz],[coreRadius+.028,.053,coreRadius+.028]);
    instance(towerCylinder,pearl,[bx,y+.485,bz],[coreRadius+.024,.036,coreRadius+.024]);
    for(let wing=0;wing<3;wing++) {
      if(level>=[16,14,12][wing])continue;
      const angle=baseYaw+wing*Math.PI*2/3;
      const length=(1.68-wing*.09)*Math.pow(1-t,.85);
      const breadth=.43*Math.pow(1-t,.8)+.055;
      const offset=coreRadius*.5+length*.34;
      const x=bx+Math.sin(angle)*offset,z=bz+Math.cos(angle)*offset;
      instance(towerCylinder,glazing,[x,y+h/2,z],[breadth,h,length*.62],[0,angle,0]);
      for(const rise of[.05,.5,.93])instance(towerCylinder,pearl,[x,y+rise,z],[breadth+.027,.035,length*.62+.025],[0,angle,0]);
      // Fine white vertical ribs give the glazing a silver architectural grain.
      for(const side of[-1,1]) {
        const rx=x+Math.cos(angle)*side*breadth*.91;
        const rz=z-Math.sin(angle)*side*breadth*.91;
        instance(cylinder,white,[rx,y+h/2,rz],[.018,h,.018]);
      }
      const tipX=x+Math.sin(angle)*length*.61,tipZ=z+Math.cos(angle)*length*.61;
      instance(cylinder,white,[tipX,y+h/2,tipZ],[.025,h,.025]);
      for(const side of[-1,1]) for(const rise of[.28,.68]) {
        const seed=Math.abs(Math.sin(level*31.7+wing*7.1+side*3.3+rise*11.0)*43758.5453%1);
        if(seed<.3)continue;
        const fx=x+Math.cos(angle)*side*(breadth+.006),fz=z-Math.sin(angle)*side*(breadth+.006);
        box(seed>.85?mat.coolLight:mat.warmLight,fx,y+rise,fz,.012,.13,length*.42,angle,false);
      }
    }
    // Lit windows: a ring of small panes round the core and a column on every wing face.
    if(level<16) for(let k=0;k<12;k++) {
      const a=k*Math.PI/6+.13,r=coreRadius+.004,lit=Math.sin(level*12.9898+k*78.233)*43758.5453%1;
      if(Math.abs(lit)<.35)continue;
      box(Math.abs(lit)>.82?mat.coolLight:mat.warmLight,bx+Math.sin(a)*r,y+.28,bz+Math.cos(a)*r,.11,.12,.012,a,false);
    }
    for(let rib=0;rib<6;rib++) {
      const a=rib*Math.PI/3;
      instance(cylinder,pearl,[bx+Math.sin(a)*coreRadius,y+h/2,bz+Math.cos(a)*coreRadius],[.018,h,.018]);
    }
  }
  const spire=g(new THREE.CylinderGeometry(.022,.19,2.72,16));
  mesh(spire,pearl,bx,17.72,bz);
  const needle=g(new THREE.CylinderGeometry(.006,.024,1.22,10));
  mesh(needle,white,bx,19.61,bz);
  // Low, curved podium petals preserve the Y plan all the way down to the plaza.
  for(let i=0;i<3;i++) {
    const a=baseYaw+i*Math.PI*2/3;
    instance(towerCylinder,white,[bx+Math.sin(a)*1.53,.28,bz+Math.cos(a)*1.53],[.68,.3,1.23],[0,a,0]);
    instance(towerCylinder,pearl,[bx+Math.sin(a)*1.53,.46,bz+Math.cos(a)*1.53],[.69,.035,1.24],[0,a,0]);
  }
  // The LED facade: a soft band of light that climbs the tower, as in the Burj Khalifa's evening shows,
  // and a red aviation beacon blinking at the tip of the spire.
  const ledUniforms={uTime:{value:0}};
  const ledMaterial=m(new THREE.ShaderMaterial({uniforms:ledUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,
    vertexShader:'varying float vY; void main(){vY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform float uTime; varying float vY; void main(){float h=vY/17.0; float wave=fract(uTime*.07); float band=exp(-pow((h-wave)*7.0,2.0)); float base=.06+.05*sin(h*40.0-uTime*1.4); vec3 c=mix(vec3(.55,.42,1.0),vec3(1.0,.85,.6),.5+.5*sin(uTime*.2)); float a=(band*.55+base*.35)*smoothstep(1.0,.82,h); gl_FragColor=vec4(c*a,a);}'}));
  const ledShell=new THREE.Mesh(g(new THREE.CylinderGeometry(.24,1.02,17,24,24,true)),ledMaterial);
  ledShell.geometry.translate(0,8.5,0);ledShell.position.set(bx,.3,bz);world.add(ledShell);
  const beaconMaterial=m(new THREE.MeshBasicMaterial({color:'#ff3a4c',toneMapped:false,transparent:true}));
  const spireBeacon=new THREE.Mesh(g(new THREE.SphereGeometry(.07,10,8)),beaconMaterial);spireBeacon.position.set(bx,20.25,bz);world.add(spireBeacon);
  addBounds(bx,bz,6.2,6.2,20.24);

  // BURJ AL ARAB — a curved sail, exposed ribs, mast and a separate helipad.
  const [sx,sz]=positions.sail||[-17,-4],syaw=positions.sailYaw??.46;
  ellipse(sx,sz,2.3,1.67,white);
  const sailPoint=(x,y,z)=>new THREE.Vector3(sx+Math.cos(syaw)*x+Math.sin(syaw)*z,y+ground,sz-Math.sin(syaw)*x+Math.cos(syaw)*z);
  const sailBox=(material,x,y,z,w,h,d)=>{const p=sailPoint(x,y,z);box(material,p.x,p.y,p.z,w,h,d,syaw);};
  const bridge=curve([[sx+5.3,sz],[sx+3,sz-.1],[sx+1.7,sz-.05]],false,.145);
  landStrip(bridge,.83);ribbon(bridge,.42,roadLine,0,50);
  const outline=new THREE.Shape();
  outline.moveTo(-.68,.28);outline.lineTo(-.61,7.84);
  outline.bezierCurveTo(.44,7.15,2.05,3.87,.79,.28);outline.closePath();
  const shellGeometry=g(new THREE.ExtrudeGeometry(outline,{depth:.7,bevelEnabled:true,bevelSize:.035,bevelThickness:.027,bevelSegments:2,curveSegments:32}));
  shellGeometry.translate(0,0,-.35);
  const shell=mesh(shellGeometry,white,sx,ground,sz);shell.rotation.y=syaw;
  const glazingShape=new THREE.Shape();
  glazingShape.moveTo(-.41,.67);glazingShape.lineTo(-.36,7.21);
  glazingShape.bezierCurveTo(.4,6.65,1.68,3.47,.59,.67);glazingShape.closePath();
  const glassGeometry=g(new THREE.ShapeGeometry(glazingShape,32));
  for(const face of[-1,1]) {
    const panel=mesh(glassGeometry,glazing);panel.position.copy(sailPoint(0,0,face*.387));
    panel.rotation.y=syaw+(face<0?Math.PI:0);
    if(face<0)panel.scale.x=-1;
  }
  const glassEdge=new THREE.CubicBezierCurve3(new THREE.Vector3(-.36,7.21,.406),new THREE.Vector3(.4,6.65,.406),new THREE.Vector3(1.68,3.47,.406),new THREE.Vector3(.59,.67,.406));
  for(let i=1;i<30;i++) {
    const p=glassEdge.getPoint(i/30),w=p.x+.39;
    if(w>0)sailBox(pearl,-.39+w/2,p.y,.411,w,.026,.03);
  }
  const outerEdge=new THREE.CubicBezierCurve3(new THREE.Vector3(-.61,7.84,.43),new THREE.Vector3(.44,7.15,.43),new THREE.Vector3(2.05,3.87,.43),new THREE.Vector3(.79,.28,.43));
  const rim=mesh(g(new THREE.TubeGeometry(outerEdge,48,.045,7,false)),white,sx,ground,sz);rim.rotation.y=syaw;
  sailBox(white,-.59,4.06,.46,.09,7.55,.09);
  // Two exposed diagonal struts carry the curving outer shell.
  for(const pair of[[[-.53,1.2,.47],[1.07,3.22,.47]],[[-.55,5.85,.47],[1.09,3.22,.47]]]) {
    const a=sailPoint(...pair[0]),b=sailPoint(...pair[1]);rod(null,a.toArray(),b.toArray(),.028,white);
  }
  const mastPoint=sailPoint(-.81,4.34,-.04);
  instance(cylinder,white,mastPoint.toArray(),[.035,8.55,.035]);
  const pad=sailPoint(-1.29,6.36,.06);
  instance(towerCylinder,white,pad.toArray(),[.44,.075,.44]);
  instance(towerCylinder,pearl,[pad.x,pad.y+.041,pad.z],[.37,.009,.37]);
  sailBox(white,-.91,6.28,.03,.61,.13,.17);
  const padRing=mesh(g(new THREE.TorusGeometry(.335,.012,5,36)),white,pad.x,pad.y+.05,pad.z,false);padRing.rotation.x=-Math.PI/2;
  for(const [dx,dz] of[[-1.8,-.7],[-1.1,1.15],[1.3,-.8]])palm(sx+dx,sz+dz,.5);
  addBounds(sx,sz,5.3,4,8.75);

  // PALM JUMEIRAH — individual thin landforms emerge directly from the sea.
  // The mainland causeway lies to the east; all fourteen fronds sweep westward.
  const pz=positions.palmZ??25;
  if(positions.palm!==false){
  const trunk=curve([[-10,pz],[-17,pz],[-24,pz],[-31,pz],[-36,pz]],false,.143);
  landStrip(trunk,1.47);
  ribbon(trunk,.57,roadLine,0,150);
  for(const offset of[-.39,.39])ribbon(trunk,.027,pearl,.004,150,offset);
  const frondLengths=[4.5,7.5,9.5,10.7,10,8,5.3];
  for(let row=0;row<7;row++)for(const side of[-1,1]) {
    const x=-19-row*2.3,len=frondLengths[row];
    const frond=curve([[x,pz],[x-.36,pz+side*len*.36],[x+.9,pz+side*len*.79],[x+2.7,pz+side*len]],false,.145);
    landStrip(frond,.58);
    ribbon(frond,.14,roadLine,0,70);
    // Sparse villas leave the frond silhouette legible at the overview scale.
    if(row%2===0) {
      const p=frond.getPointAt(.42),t=frond.getTangentAt(.42),yaw=Math.atan2(t.x,t.z);
      const vx=p.x-t.z*.12,vz=p.z+t.x*.12;
      box(white,vx,.43,vz,.35,.58,.43,yaw);
      box(pearl,vx,.755,vz,.4,.065,.49,yaw);
      box(silver,vx,.48,vz+.218,.19,.17,.016,yaw);
      addBounds(vx,vz,.7,.7,.9);
    }
  }
  const crescentPoints=[];
  for(let i=0;i<=76;i++) {
    const a=.21*Math.PI+i/76*1.58*Math.PI;
    crescentPoints.push([-28.6+13.3*Math.cos(a),pz+13.3*Math.sin(a)]);
  }
  const crescent=curve(crescentPoints,false,.145);
  landStrip(crescent,.8);
  ribbon(crescent,.31,roadLine,0,150);
  for(let i=0;i<17;i++) {
    const t=(i+.6)/18,p=crescent.getPointAt(t),v=crescent.getTangentAt(t);
    if(i%3===1) {
      const yaw=Math.atan2(v.x,v.z);
      box(white,p.x,.47,p.z,.42,.66,.51,yaw);
      box(pearl,p.x,.83,p.z,.48,.07,.57,yaw);
      addBounds(p.x,p.z,.85,.85,1);
    } else palm(p.x-v.z*.26,p.z+v.x*.26,.4);
  }
  // A compact gateway and a handful of white residences gather at the trunk.
  for(let i=0;i<5;i++)for(const side of[-1,1]) {
    const x=-12.1-i*1.13,z=pz+side*.69,h=.5+(i%3)*.23;
    box(white,x,ground+h/2,z,.62,h,.58);
    box(pearl,x,ground+h+.055,z,.69,.08,.65);
    if(i%2===0)box(silver,x,ground+h*.53,z+side*.298,.39,h*.56,.018);
    addBounds(x,z,.8,.8,h+.25);
  }
  addBounds(-27,25,31,29,1.6);
  }

  // AIN DUBAI — a fine double rim, tension spokes and upright moving capsules.
  const [wx,wz]=positions.wheel||[-20,-26];
  ellipse(wx,wz,4.65,2.45,white);
  ellipse(wx,wz,3.5,1.77,paving,.135);
  const wheelCauseway=curve([[wx+5.92,wz],[wx+4.9,wz-.2],[wx+3.9,wz-.1]],false,.147);
  landStrip(wheelCauseway,.86);ribbon(wheelCauseway,.4,roadLine,0,45);
  const wheelBase=new THREE.Group();world.add(wheelBase);wheelBase.position.set(wx,ground,wz);wheelBase.rotation.y=.44;
  const hubHeight=4.25,radius=3.5;
  for(const z of[-.48,.48])for(const side of[-1,1]) {
    rod(wheelBase,[side*1.74,.12,z*2.1],[0,hubHeight,z],.058,white);
    const foot=mesh(g(new THREE.BoxGeometry(.63,.14,.53)),pearl,side*1.74,.08,z*2.1);wheelBase.add(foot);
  }
  rod(wheelBase,[0,hubHeight,-.72],[0,hubHeight,.72],.075,silver);
  const rotor=new THREE.Group();rotor.position.y=hubHeight;wheelBase.add(rotor);
  const rimGeometry=g(new THREE.TorusGeometry(radius,.033,6,112));
  for(const z of[-.13,.13]) {const rim=mesh(rimGeometry,white,0,0,z);rotor.add(rim);}
  const hub=mesh(g(new THREE.CylinderGeometry(.14,.14,.43,14)),pearl);hub.rotation.x=Math.PI/2;rotor.add(hub);
  const podGeometry=g(new THREE.CapsuleGeometry(.082,.13,3,7));
  const podCapGeometry=g(new THREE.BoxGeometry(.17,.035,.19));
  const spokeGeometry=g(new THREE.CylinderGeometry(1,1,1,6));
  const spokes=new THREE.InstancedMesh(spokeGeometry,silver,56);
  const ties=new THREE.InstancedMesh(spokeGeometry,pearl,28);
  rotor.add(spokes,ties);
  const capsules=new THREE.InstancedMesh(podGeometry,glazing,28);
  const caps=new THREE.InstancedMesh(podCapGeometry,white,56);
  capsules.frustumCulled=false;caps.frustumCulled=false;
  wheelBase.add(capsules,caps);
  const transform=new THREE.Object3D();
  const up=new THREE.Vector3(0,1,0);
  for(let i=0;i<28;i++) {
    const a=i/28*Math.PI*2,x=Math.cos(a)*radius,y=Math.sin(a)*radius;
    for(let side=0;side<2;side++) {
      transform.position.set(x/2,y/2,side===0?-.12:.12);
      transform.quaternion.setFromUnitVectors(up,new THREE.Vector3(x,y,0).normalize());
      transform.scale.set(.0085,radius,.0085);transform.updateMatrix();
      spokes.setMatrixAt(i*2+side,transform.matrix);
    }
    transform.position.set(x,y,0);
    transform.quaternion.setFromUnitVectors(up,new THREE.Vector3(0,0,1));
    transform.scale.set(.014,.3,.014);transform.updateMatrix();
    ties.setMatrixAt(i,transform.matrix);
  }
  spokes.computeBoundingSphere();ties.computeBoundingSphere();
  function positionCapsules(angle) {
    transform.quaternion.identity();
    for(let i=0;i<28;i++) {
      const a=i/28*Math.PI*2+angle,x=Math.cos(a)*radius,y=hubHeight+Math.sin(a)*radius;
      transform.position.set(x,y-.13,0);transform.scale.set(1,1,1.2);transform.updateMatrix();
      capsules.setMatrixAt(i,transform.matrix);
      for(let cap=0;cap<2;cap++) {
        transform.position.set(x,y+(cap===0?-.26:0),0);transform.scale.set(1,1,1);transform.updateMatrix();
        caps.setMatrixAt(i*2+cap,transform.matrix);
      }
    }
    capsules.instanceMatrix.needsUpdate=true;caps.instanceMatrix.needsUpdate=true;
  }
  positionCapsules(0);
  for(const [dx,dz] of[[-3.8,-.9],[-2.3,-1.9],[1.4,-1.8],[3.65,-.8],[-2.7,1.7]])palm(wx+dx,wz+dz,.49);
  for(const [dx,dz] of[[-3.4,1.1],[3.15,.9]]) {const x=wx+dx,z=wz+dz;
    box(white,x,.42,z,.75,.6,.63);
    box(pearl,x,.76,z,.84,.07,.72);
  }
  addBounds(wx,wz,9.6,5.2,8.15);

  const pinPoints={
    downtown:new THREE.Vector3(bx,5.5,bz),
    sail:new THREE.Vector3(sx,2.4,sz),
    palm:new THREE.Vector3(-23,.8,pz),
    wheel:new THREE.Vector3(wx,4.1,wz)
  };
  return {
    fitPoints,
    landmarkCount:4,
    pinPoints,
    update(timeSeconds=0) {
      // The caller owns pausing, visibility and reduced-motion policy.
      const angle=(Number.isFinite(timeSeconds)?timeSeconds:0)*.012;
      rotor.rotation.z=angle;
      positionCapsules(angle);
      const t=Number.isFinite(timeSeconds)?timeSeconds:0;
      ledUniforms.uTime.value=t;
      beaconMaterial.opacity=(t%1.6)<.18?1:.12;
    }
  };
}
