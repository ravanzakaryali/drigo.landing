// Connect the rendered street centre lines into a routable network.
export function buildTrafficJourneys(lines, count=36) {
  const segments=[];
  lines.forEach((line,road)=>{for(let i=1;i<line.points.length;i++){
    const a=line.points[i-1],b=line.points[i];if(Math.hypot(b[0]-a[0],b[1]-a[1])>.001)segments.push({a,b,road,cls:line.cls,cuts:[0,1]});
  }});
  const cells=new Map(),pairs=new Set();
  segments.forEach((s,i)=>{
    for(let x=Math.floor(Math.min(s.a[0],s.b[0])/5);x<=Math.floor(Math.max(s.a[0],s.b[0])/5);x++)
    for(let z=Math.floor(Math.min(s.a[1],s.b[1])/5);z<=Math.floor(Math.max(s.a[1],s.b[1])/5);z++){
      const key=x+','+z,old=cells.get(key)||[];
      for(const j of old){const pair=j+':'+i;if(pairs.has(pair))continue;pairs.add(pair);const q=segments[j];if(q.road===s.road)continue;
        const ax=s.b[0]-s.a[0],az=s.b[1]-s.a[1],bx=q.b[0]-q.a[0],bz=q.b[1]-q.a[1],d=ax*bz-az*bx;if(Math.abs(d)<1e-8)continue;
        const dx=q.a[0]-s.a[0],dz=q.a[1]-s.a[1],t=(dx*bz-dz*bx)/d,u=(dx*az-dz*ax)/d;
        if(t<0||t>1||u<0||u>1)continue;
        // Motorway crossings are not junctions unless a road actually ends there.
        if((s.cls===0||q.cls===0)&&t>.001&&t<.999&&u>.001&&u<.999)continue;
        s.cuts.push(t);q.cuts.push(u);
      }
      old.push(i);cells.set(key,old);
    }
  });
  const nodes=[],lookup=new Map();
  const node=(x,z)=>{const key=x.toFixed(3)+','+z.toFixed(3);if(!lookup.has(key)){lookup.set(key,nodes.length);nodes.push({point:[x,z],edges:[]});}return lookup.get(key);};
  for(const s of segments){s.cuts.sort((a,b)=>a-b);let previous=-1;for(const t of s.cuts){const id=node(s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t);
    if(previous>=0&&id!==previous){const a=nodes[previous].point,b=nodes[id].point,d=Math.hypot(a[0]-b[0],a[1]-b[1]);nodes[previous].edges.push({to:id,d,road:s.road});nodes[id].edges.push({to:previous,d,road:s.road});}previous=id;
  }}
  function shortest(start,goal,penalty=new Set()){
    const dist=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),via=new Int32Array(nodes.length).fill(-1),heap=[];
    const push=(id,d)=>{let i=heap.length;heap.push([id,d]);while(i){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[id,d];};
    const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][1]<heap[j][1])j++;if(heap[j][1]>=last[1])break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
    dist[start]=0;push(start,0);
    while(heap.length){const [id,d]=pop();if(d!==dist[id])continue;if(id===goal)break;for(const e of nodes[id].edges){const next=d+e.d*(penalty.has(e.road)?2.8:1);if(next<dist[e.to]){dist[e.to]=next;prev[e.to]=id;via[e.to]=e.road;push(e.to,next);}}}
    if(!Number.isFinite(dist[goal]))return null;const path=[];for(let id=goal;id!==start;id=prev[id])path.push({id,road:via[id]});path.push({id:start,road:-1});return path.reverse();
  }
  const components=[],seen=new Set();for(let i=0;i<nodes.length;i++){if(seen.has(i))continue;const component=[i];seen.add(i);for(let k=0;k<component.length;k++)for(const e of nodes[component[k]].edges)if(!seen.has(e.to)){seen.add(e.to);component.push(e.to);}if(component.length>15)components.push(component);}
  components.sort((a,b)=>b.length-a.length);
  const routes=[];
  for(let i=0;i<count*3&&routes.length<count;i++){
    const component=components[0];if(!component)break;
    const start=component[Math.floor(((i*.61803398875)%1)*component.length)],p=nodes[start].point;
    const candidates=component.filter(id=>{const q=nodes[id].point,d=Math.hypot(q[0]-p[0],q[1]-p[1]);return d>22&&d<65&&nodes[id].edges.length>2;});
    if(!candidates.length)continue;
    const goal=candidates[(i*137)%candidates.length],out=shortest(start,goal);if(!out)continue;
    const back=shortest(goal,start,new Set(out.map(v=>v.road)));if(!back)continue;
    const path=out.concat(back.slice(1)),points=path.map(v=>nodes[v.id].point),roads=[...new Set(path.map(v=>v.road).filter(v=>v>=0))];
    if(roads.length<3)continue;
    routes.push({points,roads,closed:true,cls:1,half:.17,carQuota:0,nearRooftop:roads.some(r=>lines[r].nearRooftop),signalEligible:false});
  }
  return routes;
}
