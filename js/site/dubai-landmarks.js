/** White architectural landmarks for the live, illustrative Dubai map. */
export function buildReferenceLandmarks({ THREE, world, g, m, standard, mat, mesh, footprint, curve, road, ribbon, box, instance, cylinder, sphere, palm, tree, lightNight }, positions = {}) {
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

  // ---- Night lighting. Every light below follows the city's shared night signal (0 by day,
  // 1 by night): shaders scale by it and collapse their vertices by day, so the day theme is unchanged.
  const night=lightNight||{value:0};
  const ledUniforms={uTime:{value:0}};
  const nightOnly=[];
  const glow=(hex,strength=1)=>new THREE.Color(hex).multiplyScalar(strength);
  const hidden='uLightNight<.001?vec4(0.0,0.0,2.0,1.0):';
  // The Burj Khalifa's LED facade at night: a dim blue base with light that moves over the
  // whole tower. A band climbs from the podium to the spire, a second sinks more slowly,
  // a soft beam circles the tower and fine ripples run up the floors, all in slowly
  // changing blue, violet and ice tones.
  function burjFacade(material,strength,centre) {
    const uniforms={uFacadeStrength:{value:strength},uFacadeCentre:{value:new THREE.Vector2(...centre)},uLightNight:night,uTime:ledUniforms.uTime};
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec3 vFacadePos;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 facadeWorld=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          facadeWorld=instanceMatrix*facadeWorld;
        #endif
        vFacadePos=(modelMatrix*facadeWorld).xyz;`);
      shader.fragmentShader=`uniform float uFacadeStrength; uniform vec2 uFacadeCentre; uniform float uLightNight; uniform float uTime; varying vec3 vFacadePos;
        vec3 facadeColor(float t){t=fract(t)*3.0;vec3 a=vec3(.12,.28,1.0),b=vec3(.36,.17,1.0),c=vec3(.5,.68,1.0);return t<1.0?mix(a,b,t):t<2.0?mix(b,c,t-1.0):mix(c,a,t-2.0);}
`+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        {
          float h=clamp((vFacadePos.y-.3)/19.5,0.0,1.0);
          float rising=exp(-pow((h-fract(uTime*.055))/.05,2.0));
          float sinking=exp(-pow((h-fract(.5-uTime*.035))/.08,2.0))*.55;
          float around=atan(vFacadePos.x-uFacadeCentre.x,vFacadePos.z-uFacadeCentre.y);
          float circling=pow(.5+.5*cos(around-uTime*.3),12.0)*(.55+.45*sin(h*48.0-uTime*1.4));
          float level=.1+rising+sinking+circling*.5;
          totalEmissiveRadiance+=facadeColor(uTime*.018+h*.35)*level*uFacadeStrength*uLightNight;
        }`);
    };
    material.customProgramCacheKey=()=>'drigo-burj-facade-v1';
    return material;
  }
  // A standard material that gains an emissive wash at night, graded by world height.
  function nightEmissive(material,low,high=low,range=[0,1]) {
    const uniforms={uNightLow:{value:low},uNightHigh:{value:high},uNightRange:{value:new THREE.Vector2(...range)},uLightNight:night};
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying float vNightY;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 nightWorld=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          nightWorld=instanceMatrix*nightWorld;
        #endif
        vNightY=(modelMatrix*nightWorld).y;`);
      shader.fragmentShader='uniform vec3 uNightLow; uniform vec3 uNightHigh; uniform vec2 uNightRange; uniform float uLightNight; varying float vNightY;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance+=mix(uNightLow,uNightHigh,smoothstep(uNightRange.x,uNightRange.y,vNightY))*uLightNight;`);
    };
    material.customProgramCacheKey=()=>'drigo-landmark-night-emissive-v1';
    return material;
  }
  // Additive, untonemapped light that exists only at night.
  function nightShader(uniforms,vertexShader,fragmentShader,extra={}) {
    return m(new THREE.ShaderMaterial({
      uniforms:{uLightNight:night,uTime:ledUniforms.uTime,...uniforms},vertexShader,
      fragmentShader:fragmentShader.replace(/}\s*$/,'\n#include <colorspace_fragment>\n}'),
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,...extra,
    }));
  }
  function nightMesh(geometry,material,parent=world) {
    const node=new THREE.Mesh(geometry,material);node.castShadow=false;node.receiveShadow=false;
    parent.add(node);nightOnly.push(node);return node;
  }
  // A soft round glow that always faces the camera; its size is the mesh scale.
  const glowQuad=g(new THREE.PlaneGeometry(1,1));
  function glowSprite(position,size,color,opacity,parent=world) {
    const node=nightMesh(glowQuad,nightShader({uColor:{value:glow(color)},uOpacity:{value:opacity}},
      `uniform float uLightNight; varying vec2 vUv;
      void main(){vUv=uv; vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); mv.xy+=position.xy*length(modelMatrix[0].xyz); gl_Position=${hidden}projectionMatrix*mv;}`,
      `uniform vec3 uColor; uniform float uOpacity; uniform float uLightNight; varying vec2 vUv;
      void main(){float r=length(vUv-.5)*2.0; float a=pow(max(0.0,1.0-r),2.4); gl_FragColor=vec4(uColor*a*uOpacity*uLightNight,1.0);}`),parent);
    node.position.copy(position);node.scale.setScalar(size);node.frustumCulled=false;
    return node;
  }
  // A light pool lying on the water, standing in for reflections.
  function waterGlow(x,z,radius,color,opacity) {
    const node=nightMesh(g(new THREE.CircleGeometry(1,40)),nightShader({uColor:{value:glow(color)},uOpacity:{value:opacity}},
      `uniform float uLightNight; varying vec2 vUv; void main(){vUv=uv; gl_Position=${hidden}projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      `uniform vec3 uColor; uniform float uOpacity; uniform float uLightNight; varying vec2 vUv;
      void main(){float r=length(vUv-.5)*2.0; gl_FragColor=vec4(uColor*pow(max(0.0,1.0-r),1.8)*uOpacity*uLightNight,1.0);}`));
    node.rotation.x=-Math.PI/2;node.position.set(x,.004,z);node.scale.setScalar(radius);node.renderOrder=1;
    return node;
  }
  // Ain Dubai's light pulses: each leaves the hub, runs out along the spokes and flashes the rim;
  // every new ring takes the next colour (blue, violet, ice white).
  const pulseGlsl=`
    vec3 drigoPulseColor(float ring){float t=fract(ring*.3334)*3.0;vec3 a=vec3(.2,.38,1.0),b=vec3(.52,.26,1.0),c=vec3(.72,.86,1.0);return t<1.0?mix(a,b,t):t<2.0?mix(b,c,t-1.0):mix(c,a,t-2.0);}
    float drigoPulse(float along,float time,out float ring){float u=along*1.8-time*.42;ring=floor(u);float f=fract(u);return pow(f,5.0)*(1.0-smoothstep(.965,1.0,f));}`;
  // LED strips on a torus: a slow colour chase around the ring, optional dotted lamps, a soft tube
  // profile and an optional flash when a wheel pulse reaches the rim.
  function ledRing(radius,tube,{colorA,colorB,opacity=1,chase=4,speed=.6,dots=0,soft=0,flash=0,radial=6,tubular=160}) {
    return nightMesh(g(new THREE.TorusGeometry(radius,tube,radial,tubular)),nightShader(
      {uColorA:{value:glow(colorA)},uColorB:{value:glow(colorB)},uOpacity:{value:opacity},uChase:{value:chase},uSpeed:{value:speed},uDots:{value:dots},uSoft:{value:soft},uFlash:{value:flash}},
      `uniform float uLightNight; varying vec3 vLocal; varying vec3 vViewNormal; varying vec3 vViewPosition;
      void main(){vLocal=position; vViewNormal=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vViewPosition=mv.xyz; gl_Position=${hidden}projectionMatrix*mv;}`,
      `uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity; uniform float uChase; uniform float uSpeed; uniform float uDots; uniform float uSoft; uniform float uFlash; uniform float uTime; uniform float uLightNight;
      varying vec3 vLocal; varying vec3 vViewNormal; varying vec3 vViewPosition;
      ${pulseGlsl}
      void main(){
        float angle=atan(vLocal.y,vLocal.x);
        float chase=.5+.5*sin(angle*uChase-uTime*uSpeed);
        vec3 color=mix(uColorA,uColorB,smoothstep(.3,.7,chase));
        float lamps=uDots>0.0?.25+.75*smoothstep(.55,.92,.5+.5*cos(angle*uDots)):1.0;
        vec3 eye=isOrthographic?vec3(0.0,0.0,1.0):normalize(-vViewPosition);
        float facing=abs(dot(normalize(vViewNormal),eye));
        float profile=mix(1.0,facing*facing,uSoft);
        float ring,arrive=drigoPulse(1.0,uTime,ring);
        gl_FragColor=vec4((color*lamps*uOpacity+drigoPulseColor(ring)*arrive*uFlash)*profile*uLightNight,1.0);
      }`));
  }

  // BURJ KHALIFA — buttressed Y plan, spiralling setbacks and a slender steel crown.
  const [bx,bz]=positions.burj||[8,4];
  ellipse(bx,bz,2.45,2.15,paving,.03);
  const baseYaw=.22;
  const burjGlass=burjFacade(standard('#abbaca',{roughness:.38,metalness:.3,emissive:'#526a84',emissiveIntensity:.28}),.32,[bx,bz]);
  // At night the glass and the frame lines carry the moving LED facade show.
  const burjFrame=burjFacade(standard('#e3e9ed',{roughness:.4,metalness:.3,emissive:'#9bb0c4',emissiveIntensity:.18}),.75,[bx,bz]);
  const coreGeometry=g(new THREE.CylinderGeometry(1,1,1,12));
  // Each wing ends in a rounded nose; its long straight sides meet the central hub.
  function wingOutline(length,breadth) {
    const points=[[breadth,.08],[breadth,length-breadth]];
    for(let j=1;j<=16;j++) { const a=j/16*Math.PI;points.push([Math.cos(a)*breadth,length-breadth+Math.sin(a)*breadth]); }
    points.push([-breadth,.08]);return points;
  }
  for(let level=0;level<22;level++) {
    const y=.3+level*.66,h=.661;
    const coreRadius=Math.max(.15,.53-level*.017);
    instance(coreGeometry,burjGlass,[bx,y+h/2,bz],[coreRadius,h,coreRadius],[0,baseYaw,0]);
    for(let wing=0;wing<3;wing++) {
      const setback=Math.floor((level+wing)/3);
      const length=2.22-setback*.255;
      if(length<.36 || level>=[22,21,20][wing])continue;
      const breadth=Math.max(.13,.43-setback*.037);
      const angle=baseYaw+wing*Math.PI*2/3;
      const outline=wingOutline(length,breadth);
      const wall=mesh(footprint(outline,h,0),burjGlass,bx,y,bz);wall.rotation.y=angle;
      // Five fine floor lines per tier replace the old thick white rings.
      for(let floor=0;floor<5;floor++) {
        const band=mesh(footprint(outline.map(([x,z])=>[x*1.025,z*1.003]),.012,0),burjFrame,bx,y+floor*h/5,bz,false);band.rotation.y=angle;
      }
      const nextLength=2.22-Math.floor((level+1+wing)/3)*.255;
      if(nextLength<length || level===[21,20,19][wing]) {
        const terrace=mesh(footprint(outline,.025,0),silver,bx,y+h,bz);terrace.rotation.y=angle;
      }
      // Slender vertical mullions along both flat facades and the rounded end.
      const tx=(x,z)=>[bx+Math.cos(angle)*x+Math.sin(angle)*z,bz-Math.sin(angle)*x+Math.cos(angle)*z];
      for(const side of [-1,1]) {
        for(let z=.28;z<length-breadth;z+=.17) {
          const [xw,zw]=tx(side*(breadth+.004),z);
          instance(cylinder,burjFrame,[xw,y+h/2,zw],[.006,h,.006]);
          const lit=Math.abs(Math.sin(level*37.2+wing*17.1+z*91+side)*43758.5)%1;
          if(lit>.58) {
            const [wx,wz]=tx(side*(breadth+.006),z+.05);
            box(lit>.9?mat.coolLight:mat.warmLight,wx,y+.22,wz,.008,.065,.085,angle,false);
          }
        }
      }
      for(let rib=0;rib<=8;rib++) {
        const a=rib/8*Math.PI;
        const [xw,zw]=tx(Math.cos(a)*(breadth+.004),length-breadth+Math.sin(a)*(breadth+.004));
        instance(cylinder,burjFrame,[xw,y+h/2,zw],[.007,h,.007]);
      }
    }
  }
  // Asymmetric upper setbacks narrow into the exposed central steel pinnacle.
  for(let tier=0;tier<6;tier++) {
    const y=14.82+tier*.39,r=.24-tier*.032;
    instance(coreGeometry,burjGlass,[bx,y+.195,bz],[r,.39,r],[0,baseYaw,0]);
    instance(coreGeometry,burjFrame,[bx,y+.39,bz],[r+.008,.016,r+.008],[0,baseYaw,0]);
    for(let rib=0;rib<6;rib++) {
      const a=baseYaw+rib*Math.PI/3;
      instance(cylinder,burjFrame,[bx+Math.sin(a)*r,y+.195,bz+Math.cos(a)*r],[.006,.39,.006]);
    }
  }
  const spireSteel=nightEmissive(standard('#bcc4cd',{roughness:.34,metalness:.44}),glow('#4f68d8',.25),glow('#b9c8ff',.45),[17.2,20]);
  mesh(g(new THREE.CylinderGeometry(.025,.085,1.62,16)),spireSteel,bx,17.97,bz);
  mesh(g(new THREE.CylinderGeometry(.005,.027,1.46,12)),burjFrame,bx,19.51,bz);
  for(let i=0;i<3;i++) {
    const a=baseYaw+i*Math.PI*2/3;
    const podium=mesh(footprint(wingOutline(2.2,.58),.18,0),pearl,bx,.05,bz);podium.rotation.y=a;
    const roof=mesh(footprint(wingOutline(2.2,.59),.022,0),white,bx,.23,bz);roof.rotation.y=a;
  }
  // Pools around the tower: a reflecting pool in the podium gap facing Burj Lake (the only gap
  // the plaza's drive loop leaves clear, kept inside 80% of the plaza ellipse) and three slim
  // pools on the free ground beyond 108% of it, clear of every road. The pedestrian loop at
  // 86-102% stays dry. Teal water by day; at night each is lit blue from its edges with a slow
  // caustic shimmer, and low fountain jets dance in the main pool every half minute.
  {
    const poolWater=standard('#7cc6cc',{roughness:.14,metalness:.08});
    poolWater.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{uLightNight:night,uTime:ledUniforms.uTime});
      shader.vertexShader='attribute float aEdge; varying float vPoolEdge; varying vec2 vPoolXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vPoolEdge=aEdge; vPoolXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
      shader.fragmentShader='uniform float uLightNight; uniform float uTime; varying float vPoolEdge; varying vec2 vPoolXZ;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        {
          vec2 q=vPoolXZ*7.0;
          float shimmer=.5+.25*sin(q.x+uTime*.9+sin(q.y*.8+uTime*.5)*1.6)+.25*sin(q.y*1.3-uTime*.7);
          vec3 lit=mix(vec3(.015,.09,.42),vec3(.16,.48,1.0),pow(vPoolEdge,2.5));
          totalEmissiveRadiance+=lit*(.6+.5*shimmer)*uLightNight;
        }`);
    };
    poolWater.customProgramCacheKey=()=>'drigo-burj-pool-v1';
    // A stone coping and a water surface in rings from the edge inwards (aEdge: 1 at the edge, 0 at the centre).
    function pool(outline,glowRadius,glowOpacity) {
      // Wind every outline the same way so the water faces up.
      if(outline.reduce((sum,[x,z],i)=>{const[nx,nz]=outline[(i+1)%outline.length];return sum+x*nz-nx*z;},0)<0)outline=[...outline].reverse();
      const centre=outline.reduce(([x,z],[px,pz])=>[x+px/outline.length,z+pz/outline.length],[0,0]);
      const toWorld=points=>points.map(([x,z])=>[bx+x,bz+z]);
      mesh(footprint(toWorld(outline),.06,0),pearl,0,-.004,0,false);
      const water=outline.map(([x,z])=>{const dx=x-centre[0],dz=z-centre[1],l=Math.hypot(dx,dz)||1,d=Math.min(.045,l*.25);return[x-dx/l*d,z-dz/l*d];});
      const rings=[1,.82,.5,0],positions=[],edges=[],indices=[],n=water.length;
      for(const t of rings)for(const[x,z]of water){positions.push(bx+centre[0]+(x-centre[0])*t,.06,bz+centre[1]+(z-centre[1])*t);edges.push(t);}
      for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,c,b,b,c,d);}
      const geometry=g(new THREE.BufferGeometry());
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('aEdge',new THREE.Float32BufferAttribute(edges,1));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      mesh(geometry,poolWater,0,0,0,false);
      waterGlow(bx+centre[0],bz+centre[1],glowRadius,'#2f5cff',glowOpacity).position.y=.064;
      return centre;
    }
    const gap=baseYaw+Math.PI/3,apexDistance=.7/Math.sin(Math.PI/3);
    const apex=[Math.sin(gap)*apexDistance,Math.cos(gap)*apexDistance];
    const inPlaza=(x,z)=>Math.hypot(x/2.32,z/2.02)<=.8;
    const sideEnd=a=>{let t=0;while(inPlaza(apex[0]+Math.sin(a)*(t+.01),apex[1]+Math.cos(a)*(t+.01)))t+=.01;return[apex[0]+Math.sin(a)*t,apex[1]+Math.cos(a)*t];};
    const endA=sideEnd(gap-Math.PI/3),endB=sideEnd(gap+Math.PI/3);
    const arcAngle=([x,z])=>Math.atan2(z/2.02,x/2.32);
    // The outer edge follows the short arc between the two wing-side edges.
    let a0=arcAngle(endA),a1=arcAngle(endB);if(a1-a0>Math.PI)a1-=Math.PI*2;else if(a0-a1>Math.PI)a1+=Math.PI*2;
    let outline=[apex,endA];
    for(let i=1;i<16;i++){const t=a0+(a1-a0)*i/16;outline.push([.8*2.32*Math.cos(t),.8*2.02*Math.sin(t)]);}
    outline.push(endB);
    // Two Chaikin passes round the corners into a designed basin.
    for(let pass=0;pass<2;pass++)outline=outline.flatMap((p,i)=>{const q=outline[(i+1)%outline.length];return[[p[0]*.75+q[0]*.25,p[1]*.75+q[1]*.25],[p[0]*.25+q[0]*.75,p[1]*.25+q[1]*.75]];});
    const centre=pool(outline,1.7,.28);
    // The outer pools: ellipses fitted to the road-free ground (centre, radii and turn, relative to the tower).
    for(const[cx,cz,rx,rz,turn]of[[2,-1.55,.4,.16,.785],[-.35,3,.6,.24,.262],[-1.65,2.4,.35,.14,1.309]]) {
      pool(Array.from({length:36},(_,i)=>{const u=i/36*Math.PI*2,x=Math.cos(u)*rx,z=Math.sin(u)*rz;return[cx+x*Math.cos(turn)-z*Math.sin(turn),cz+x*Math.sin(turn)+z*Math.cos(turn)];}),Math.max(rx,rz)*1.8,.22);
    }
    // Fountain jets along the pool's axis, one instanced draw.
    const jets=[];
    for(let i=0;i<7;i++){const t=.18+i*.11,x=apex[0]+(centre[0]-apex[0])*t*2.1,z=apex[1]+(centre[1]-apex[1])*t*2.1;if(inPlaza(x,z))jets.push(bx+x,bz+z,i,.75+(i%3)*.12);}
    const jetGeometry=g(new THREE.InstancedBufferGeometry()),cone=new THREE.CylinderGeometry(.006,.026,1,6,1,true);cone.translate(0,.5,0);
    jetGeometry.index=cone.index;jetGeometry.setAttribute('position',cone.getAttribute('position'));
    jetGeometry.setAttribute('aJet',new THREE.InstancedBufferAttribute(new Float32Array(jets),4));
    jetGeometry.instanceCount=jets.length/4;
    const jetMesh=new THREE.Mesh(jetGeometry,m(new THREE.ShaderMaterial({
      uniforms:{uTime:ledUniforms.uTime,uLightNight:night,uDay:{value:glow('#f2fbff')},uNight:{value:glow('#8fb8ff',1.3)}},
      vertexShader:`attribute vec4 aJet; uniform float uTime; varying float vHeight;
        void main(){
          float cycle=fract(uTime/26.0);
          float on=smoothstep(0.0,.04,cycle)*(1.0-smoothstep(.3,.36,cycle));
          float h=on*aJet.w*(.32+.2*sin(uTime*2.2+aJet.z*.9));
          vHeight=position.y;
          vec3 p=vec3(aJet.x,.06,aJet.y)+vec3(position.x,position.y*h,position.z);
          gl_Position=h<.005?vec4(0.0,0.0,2.0,1.0):projectionMatrix*modelViewMatrix*vec4(p,1.0);
        }`,
      fragmentShader:`uniform vec3 uDay; uniform vec3 uNight; uniform float uLightNight; varying float vHeight;
        void main(){gl_FragColor=vec4(mix(uDay,uNight,uLightNight),.62*(1.0-vHeight*.65));
        #include <colorspace_fragment>
        }`,
      transparent:true,depthWrite:false,toneMapped:false,fog:false,side:THREE.DoubleSide,
    })));
    jetMesh.frustumCulled=false;world.add(jetMesh);
  }
  addBounds(bx,bz,5,5,20.25);

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
  // The exoskeleton, mast and helipad share a white of their own that is floodlit cool white at night.
  const sailWhite=nightEmissive(standard('#f8f8f6',{roughness:.62,metalness:.035}),glow('#6a72dc',.2),glow('#dbe3ff',.4),[ground+.4,ground+7.8]);
  const shell=mesh(shellGeometry,sailWhite,sx,ground,sz);shell.rotation.y=syaw;
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
  const rim=mesh(g(new THREE.TubeGeometry(outerEdge,48,.045,7,false)),sailWhite,sx,ground,sz);rim.rotation.y=syaw;
  sailBox(sailWhite,-.59,4.06,.46,.09,7.55,.09);
  // Two exposed diagonal struts carry the curving outer shell.
  for(const pair of[[[-.53,1.2,.47],[1.07,3.22,.47]],[[-.55,5.85,.47],[1.09,3.22,.47]]]) {
    const a=sailPoint(...pair[0]),b=sailPoint(...pair[1]);rod(null,a.toArray(),b.toArray(),.028,sailWhite);
  }
  const mastPoint=sailPoint(-.81,4.34,-.04);
  instance(cylinder,sailWhite,mastPoint.toArray(),[.035,8.55,.035]);
  const pad=sailPoint(-1.29,6.36,.06);
  instance(towerCylinder,sailWhite,pad.toArray(),[.44,.075,.44]);
  instance(towerCylinder,pearl,[pad.x,pad.y+.041,pad.z],[.37,.009,.37]);
  sailBox(sailWhite,-.91,6.28,.03,.61,.13,.17);
  const padRing=mesh(g(new THREE.TorusGeometry(.335,.012,5,36)),sailWhite,pad.x,pad.y+.05,pad.z,false);padRing.rotation.x=-Math.PI/2;
  for(const [dx,dz] of[[-1.8,-.7],[-1.1,1.15],[1.3,-.8]])palm(sx+dx,sz+dz,.5);
  // Night: the glass membrane glows with a slow colour wash (cool white, blue, violet) that
  // climbs the sail, the helipad edge is ringed with lamps and a few rooms are lit.
  const membrane=nightShader({uOpacity:{value:.95}},
    `uniform float uLightNight; varying vec2 vLocal; void main(){vLocal=position.xy; gl_Position=${hidden}projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    `uniform float uOpacity; uniform float uTime; uniform float uLightNight; varying vec2 vLocal;
    vec3 wash(float t){
      vec3 white=vec3(.78,.84,1.0),blue=vec3(.13,.3,1.0),violet=vec3(.46,.17,1.0);
      t=fract(t)*3.0;
      return t<1.0?mix(white,blue,smoothstep(0.0,1.0,t)):t<2.0?mix(blue,violet,smoothstep(1.0,2.0,t)):mix(violet,white,smoothstep(2.0,3.0,t));
    }
    void main(){
      float h=clamp((vLocal.y-.67)/6.54,0.0,1.0);
      vec3 color=wash(uTime*.022+h*.38);
      float sweep=exp(-pow((h-fract(uTime*.045))*5.0,2.0));
      float lift=mix(1.0,.62,h)+.3*sweep;
      float floors=.84+.16*smoothstep(.15,.45,abs(fract(vLocal.y*2.8)-.5));
      gl_FragColor=vec4(color*lift*floors*uOpacity*uLightNight,1.0);
    }`,{side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  for(const face of[-1,1]) {
    const wash=nightMesh(glassGeometry,membrane);wash.position.copy(sailPoint(0,0,face*.396));
    wash.rotation.y=syaw+(face<0?Math.PI:0);
    if(face<0)wash.scale.x=-1;
  }
  const padLamps=ledRing(.445,.022,{colorA:'#dfe9ff',colorB:'#9fd8ff',opacity:1.15,chase:2,speed:.4,dots:16,radial:5,tubular:96});
  padLamps.position.set(pad.x,pad.y+.03,pad.z);padLamps.rotation.x=-Math.PI/2;
  // Lit rooms: rows of windows follow the curved outer wing, more on the straight back.
  const roomWindow=g(new THREE.PlaneGeometry(1,1)),roomEdge=new THREE.CubicBezierCurve(new THREE.Vector2(.79,.28),new THREE.Vector2(2.05,3.87),new THREE.Vector2(.44,7.15),new THREE.Vector2(-.61,7.84));
  const roomBasis=new THREE.Matrix4(),roomTurn=new THREE.Matrix4().makeRotationY(syaw),roomEuler=new THREE.Euler(),across=new THREE.Vector3(0,0,-1);
  for(let row=0;row<23;row++)for(const depth of[-.21,-.07,.07,.21]) {
    const lit=Math.abs(Math.sin(row*41.3+depth*97.1)*43758.5)%1;
    if(lit<.5)continue;
    const u=.04+row*.04,point=roomEdge.getPointAt(u),tangent=roomEdge.getTangentAt(u);
    const up=new THREE.Vector3(tangent.x,tangent.y,0),outward=new THREE.Vector3(tangent.y,-tangent.x,0);
    roomEuler.setFromRotationMatrix(roomBasis.makeBasis(across,up,outward).premultiply(roomTurn));
    const p=sailPoint(point.x+outward.x*.048,point.y+outward.y*.048,depth);
    instance(roomWindow,lit>.92?mat.coolLight:mat.warmLight,p.toArray(),[.075,.085,1],[roomEuler.x,roomEuler.y,roomEuler.z],false);
  }
  for(let row=0;row<20;row++)for(const depth of[-.22,-.07,.07,.22]) {
    const y=.7+row*.34,lit=Math.abs(Math.sin(row*23.9+depth*71.3)*43758.5)%1;
    if(lit<.55||y>7.5)continue;
    const p=sailPoint(-.735+y*.009,y,depth);
    box(lit>.93?mat.coolLight:mat.warmLight,p.x,p.y,p.z,.008,.075,.085,syaw,false);
  }
  for(const along of[-1.12,-.98,-.84]) {const p=sailPoint(along,6.28,.124);box(mat.warmLight,p.x,p.y,p.z,.07,.06,.008,syaw,false);}
  glowSprite(sailPoint(.25,4.3,0),8.5,'#5b5cff',.2);
  glowSprite(sailPoint(-.3,1.2,0),3.6,'#9c8cff',.22);
  waterGlow(sx,sz,4.4,'#5a4dff',.34);
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
  // Legs and rims get their own white so the legs can be floodlit at night.
  const wheelWhite=nightEmissive(standard('#f8f8f6',{roughness:.62,metalness:.035}),glow('#5d6cb8',.22),glow('#c9d5ff',.5),[ground,ground+hubHeight]);
  for(const z of[-.48,.48])for(const side of[-1,1]) {
    rod(wheelBase,[side*1.74,.12,z*2.1],[0,hubHeight,z],.058,wheelWhite);
    const foot=mesh(g(new THREE.BoxGeometry(.63,.14,.53)),pearl,side*1.74,.08,z*2.1);wheelBase.add(foot);
  }
  rod(wheelBase,[0,hubHeight,-.72],[0,hubHeight,.72],.075,silver);
  const rotor=new THREE.Group();rotor.position.y=hubHeight;wheelBase.add(rotor);
  const rimGeometry=g(new THREE.TorusGeometry(radius,.033,6,112));
  for(const z of[-.13,.13]) {const rim=mesh(rimGeometry,wheelWhite,0,0,z);rotor.add(rim);}
  const hub=mesh(g(new THREE.CylinderGeometry(.14,.14,.43,14)),pearl);hub.rotation.x=Math.PI/2;rotor.add(hub);
  const podGeometry=g(new THREE.CapsuleGeometry(.082,.13,3,7));
  const podCapGeometry=g(new THREE.BoxGeometry(.17,.035,.19));
  const spokeGeometry=g(new THREE.CylinderGeometry(1,1,1,6));
  const spokes=new THREE.InstancedMesh(spokeGeometry,silver,56);
  const ties=new THREE.InstancedMesh(spokeGeometry,pearl,28);
  rotor.add(spokes,ties);
  // Capsules keep the daytime glass and glow warm from inside at night.
  const capsuleGlass=nightEmissive(standard('#aab7c5',{roughness:.26,metalness:.42}),glow('#ff9c3d',1.9));
  const capsules=new THREE.InstancedMesh(podGeometry,capsuleGlass,28);
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
  // Night: LED strips on both rims with a slow blue/white chase, a soft halo, and colour
  // pulses running from the hub out along every spoke to the rim. All of it turns with the rotor.
  for(const z of[-.13,.13]) {
    const strip=ledRing(radius,.05,{colorA:'#2c55ff',colorB:'#d9e4ff',opacity:.55,chase:6,speed:.5,flash:.75,radial:6,tubular:168});
    strip.position.z=z;rotor.add(strip);
  }
  const halo=ledRing(radius,.22,{colorA:'#2c4cff',colorB:'#93abff',opacity:.12,chase:6,speed:.5,soft:1,flash:.3,radial:8,tubular:120});
  rotor.add(halo);
  {
    // Every spoke is a camera-facing light ribbon (never thinner than three pixels) that the
    // pulses run along from the hub to the rim.
    const geometry=g(new THREE.InstancedBufferGeometry()),spokeData=[];
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.5,1,0,.5,1,0],3));
    geometry.setIndex([0,1,2,2,1,3]);
    for(let i=0;i<28;i++)for(const z of[-.134,.134])spokeData.push(i/28*Math.PI*2,z);
    geometry.setAttribute('aSpoke',new THREE.InstancedBufferAttribute(new Float32Array(spokeData),2));
    geometry.instanceCount=spokeData.length/2;
    const viewport={value:900},drawingBuffer=new THREE.Vector2();
    const spokeLights=nightMesh(geometry,nightShader({uBase:{value:glow('#6f8fff')},uViewport:viewport,uHub:{value:.16},uRim:{value:radius-.03}},
      `attribute vec2 aSpoke; uniform float uLightNight; uniform float uViewport; uniform float uHub; uniform float uRim; varying float vAlong; varying float vAcross;
      void main(){
        vec3 direction=vec3(cos(aSpoke.x),sin(aSpoke.x),0.0);
        vec4 view=modelViewMatrix*vec4(direction*mix(uHub,uRim,position.y)+vec3(0.0,0.0,aSpoke.y),1.0);
        vec3 viewDirection=normalize(mat3(modelViewMatrix)*direction);
        vec3 eye=isOrthographic?vec3(0.0,0.0,1.0):normalize(-view.xyz);
        vec3 side=cross(viewDirection,eye);float sideLength=length(side);side=sideLength>1e-4?side/sideLength:vec3(1.0,0.0,0.0);
        // Use the actual clip-space w, including the blended rooftop projection.
        // A perspective-only depth formula inflated ribbons during the zoom.
        vec4 clip=projectionMatrix*view;
        float pixel=2.0*abs(clip.w)/max(abs(projectionMatrix[1][1])*uViewport,.0001);
        view.xyz+=side*position.x*max(.03,pixel*3.0);
        vAlong=position.y;vAcross=position.x*2.0;
        gl_Position=${hidden}projectionMatrix*view;
      }`,
      `uniform vec3 uBase; uniform float uTime; uniform float uLightNight; varying float vAlong; varying float vAcross;
      ${pulseGlsl}
      void main(){
        float ring,pulse=drigoPulse(vAlong,uTime,ring);
        vec3 color=uBase*.2+drigoPulseColor(ring)*pulse*2.1;
        gl_FragColor=vec4(color*exp(-vAcross*vAcross*2.5)*uLightNight,1.0);
      }`),rotor);
    spokeLights.frustumCulled=false;
    spokeLights.onBeforeRender=renderer=>{viewport.value=renderer.getDrawingBufferSize(drawingBuffer).y||900;};
  }
  glowSprite(new THREE.Vector3(0,0,0),1.6,'#a8bcff',.7,rotor);
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
  waterGlow(wx,wz,7.2,'#3f55ff',.16);
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
      const lit=night.value>.001;
      for(const node of nightOnly)node.visible=lit;
    }
  };
}
