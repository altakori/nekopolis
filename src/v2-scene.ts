import * as THREE from 'three';
import {cardinalRoadTopology,sharedDriveways,sidewalkSlabs} from './rendering';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createCatDecalCanvas,type CatDecalStyle} from './cat-decals';
import {W,H,EXTERNAL_ROAD,RIVER_PATH,DISTRICTS,dragLine,footprint,footprintCenter,footprintCells,facilityServiceAreaCells,isRiverCell,districtForCell,firstContractGuide,utilityNetworkCells,utilitySegmentsAt,type BuildingKind,type State} from './simulation';

const COLORS:Record<BuildingKind,string>={road:'#8f846f',wire:'#f4c84f',pipe:'#66c9ef',field:'#82b85f',farm:'#c69759',plant:'#df735e',intake:'#4ba7c3',purifier:'#69bdbb',quarry:'#a29175',litter:'#78a99b',feed:'#df805f',fishery:'#4d9caa',teahouse:'#d77f59',dorm:'#859dc7',hall:'#dab353',plaza:'#ebbd4d'};
const POWER_KINDS=new Set<BuildingKind>(['plant','intake','purifier','farm','litter','feed','fishery','teahouse','dorm','hall','plaza']);
const WATER_KINDS=new Set<BuildingKind>(['intake','purifier','field','farm','litter','feed','teahouse','dorm','hall','plaza']);
const mat=(color:string,rough=.72,metal=.04)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const box=(parent:THREE.Object3D,size:[number,number,number],pos:[number,number,number],color:string,rough=.72)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color,rough));mesh.position.set(...pos);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh};
const cyl=(parent:THREE.Object3D,r:number,h:number,pos:[number,number,number],color:string,segments=16)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat(color,.56,.12));mesh.position.set(...pos);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh};
const cone=(parent:THREE.Object3D,r:number,h:number,pos:[number,number,number],color:string,segments=6)=>{const mesh=new THREE.Mesh(new THREE.ConeGeometry(r,h,segments),mat(color,.88));mesh.position.set(...pos);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh};
const world=(cell:number)=>new THREE.Vector3(cell%W-(W-1)/2,0,Math.floor(cell/W)-(H-1)/2);
function roadVisual(parent:THREE.Object3D,topology:ReturnType<typeof cardinalRoadTopology>,bridge:boolean){
 const foundation='#26332f',asphalt='#50534d',edge='#918166',mark='#d9bc78';
 // Build a flat union of one centre pad and only the connected arms. Keeping every
 // piece at the same height removes the raised circular "plug" formerly visible at junctions.
 box(parent,[.72,.12,.72],[0,.06,0],foundation,.9);box(parent,[.64,.075,.64],[0,.1575,0],asphalt,.82);
 // Pedestrian slabs sit flush beside the asphalt and continue through joins.
 for(const slab of sidewalkSlabs(topology))box(parent,[slab.width,.045,slab.depth],[slab.x,.13,slab.z],'#d8c9a5',.92);
 const arm=(axis:'x'|'z',sign:number)=>{const horizontal=axis==='x',center=sign*.4;box(parent,horizontal?[.48,.12,.72]:[.72,.12,.48],[horizontal?center:0,.06,horizontal?0:center],foundation,.9);box(parent,horizontal?[.5,.075,.64]:[.64,.075,.5],[horizontal?center:0,.1575,horizontal?0:center],asphalt,.82)};
 if(topology.north)arm('z',-1);if(topology.east)arm('x',1);if(topology.south)arm('z',1);if(topology.west)arm('x',-1);
 // Lane marks stop before a corner or junction instead of drawing a bright cross through it.
 const markArm=(axis:'x'|'z',sign:number)=>{const horizontal=axis==='x';box(parent,horizontal?[.22,.018,.032]:[.032,.018,.22],[horizontal?sign*.38:0,.205,horizontal?0:sign*.38],mark,.48)};
 if(topology.kind==='straight'||topology.kind==='dead-end'){
  if(topology.north)markArm('z',-1);if(topology.east)markArm('x',1);if(topology.south)markArm('z',1);if(topology.west)markArm('x',-1);
 }
 // Curbs occupy closed tile boundaries only; every connected side remains flush.
 if(!topology.north)box(parent,[.96,.065,.045],[0,.205,-.47],edge,.62);
 if(!topology.east)box(parent,[.045,.065,.96],[.47,.205,0],edge,.62);
 if(!topology.south)box(parent,[.96,.065,.045],[0,.205,.47],edge,.62);
 if(!topology.west)box(parent,[.045,.065,.96],[-.47,.205,0],edge,.62);
 if(bridge){
  box(parent,[.94,.08,.94],[0,.225,0],'#8d7558',.8);
  const rail=(horizontal:boolean,sign:number)=>{box(parent,horizontal?[.9,.045,.035]:[.035,.045,.9],horizontal?[0,.48,sign*.46]:[sign*.46,.48,0],'#8d694d',.78);for(const along of[-.32,.32])box(parent,[.035,.28,.035],[horizontal?along:sign*.46,.34,horizontal?sign*.46:along],'#76533f',.82)};
  if(!topology.north)rail(true,-1);if(!topology.south)rail(true,1);if(!topology.west)rail(false,-1);if(!topology.east)rail(false,1);
  box(parent,[.22,.2,.58],[0,-.02,0],'#675747',.9);
 }
}

const centerWorld=(anchor:number,kind:BuildingKind)=>{const c=footprintCenter(anchor,footprint(kind));return new THREE.Vector3(c.x-(W-1)/2,0,c.y-(H-1)/2)};
const dispose=(root:THREE.Object3D)=>root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(!o.userData.sharedDecal){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose())}}});

function pipeBetween(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,color:string,r=.06,y=.2){const start=a.clone();start.y=y;const end=b.clone();end.y=y;const direction=end.clone().sub(start),length=direction.length();if(length<.001){const node=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.12,10),mat(color,.35,.45));node.position.copy(start);node.castShadow=true;parent.add(node);return node}const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,10),mat(color,.35,.45));mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.castShadow=true;parent.add(mesh);return mesh}
function sharedDriveway(parent:THREE.Object3D,d:{roadCenter:{x:number;y:number};door:{x:number;y:number}}){
 const a=world(d.roadCenter.y*W+d.roadCenter.x),b=new THREE.Vector3(d.door.x-(W-1)/2,0,d.door.y-(H-1)/2),dx=b.x-a.x,dz=b.z-a.z,length=Math.abs(dx)+Math.abs(dz);if(length<.05)return;
 const horizontal=Math.abs(dx)>=Math.abs(dz),mid=new THREE.Vector3((a.x+b.x)/2,.19,(a.z+b.z)/2),deck=box(parent,horizontal?[length+.12,.06,.42]:[.42,.06,length+.12],[mid.x,mid.y,mid.z],'#9a8060',.9);
 const curb='#6d6858',side=.24;for(const sign of[-1,1] as const){const edge=horizontal?new THREE.Vector3(mid.x,.235,mid.z+sign*side):new THREE.Vector3(mid.x+sign*side,.235,mid.z);box(parent,horizontal?[length+.08,.05,.045]:[.045,.05,length+.08],[edge.x,edge.y,edge.z],curb,.82)}
 deck.userData.driveway=true;
}
function windowBand(parent:THREE.Object3D,w:number,y:number,z:number){box(parent,[w,.24,.04],[0,y,z],'#79b9c4',.2)}
function roof(parent:THREE.Object3D,w:number,d:number,y:number,color:string){const r=cone(parent,Math.max(w,d)*.72,1.05,[0,y,0],color,4);r.rotation.y=Math.PI/4;r.scale.z=d/w;return r}
function gableRoof(parent:THREE.Object3D,w:number,d:number,y:number,color:string){for(const side of[-1,1] as const){const slab=box(parent,[w*.58,.1,d],[side*w*.235,y,0],color,.86);slab.rotation.z=side<0?.36:-.36}}
const decalMaterials=new Map<string,THREE.MeshBasicMaterial>();
function decal(parent:THREE.Object3D,pos:[number,number,number],size:number,style:CatDecalStyle,accent:string){const key=`${style}:${accent}`;let material=decalMaterials.get(key);if(!material){const texture=new THREE.CanvasTexture(createCatDecalCanvas(style,accent));texture.colorSpace=THREE.SRGBColorSpace;material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.04,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});decalMaterials.set(key,material)}const sign=new THREE.Mesh(new THREE.PlaneGeometry(size,size),material);sign.position.set(...pos);sign.renderOrder=5;sign.userData.sharedDecal=true;parent.add(sign);return sign}
function ears(parent:THREE.Object3D,y:number,color:string){decal(parent,[0,y,.58],.52,'face',color)}
function paw(parent:THREE.Object3D,pos:[number,number,number],color='#f5d27c'){decal(parent,pos,.34,'paw',color)}
function riverRibbon(){
 const controls=RIVER_PATH.map(([x,z])=>new THREE.Vector3(x-(W-1)/2,0,z-(H-1)/2)),curve=new THREE.CatmullRomCurve3(controls,false,'catmullrom',.34),points=Array.from({length:65},(_,i)=>curve.getPoint(i/64));
 const geometry=(width:number,y:number)=>{const positions:number[]=[],uvs:number[]=[];let distance=0;for(let i=0;i<points.length;i++){const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],t=next.clone().sub(prev).normalize(),n=new THREE.Vector3(-t.z,0,t.x);if(i>0)distance+=p.distanceTo(points[i-1]);for(const side of[-1,1] as const){const q=p.clone().addScaledVector(n,width*side);positions.push(q.x,y,q.z);uvs.push(side>0?1:0,distance/2.8)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));const indices:number[]=[];for(let i=0;i<points.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}geo.setIndex(indices);geo.computeVertexNormals();return geo};
 const group=new THREE.Group(),outerBank=new THREE.Mesh(geometry(1.18,.008),mat('#526d5e',.98)),gravel=new THREE.Mesh(geometry(1.01,.018),mat('#887d68',.94));outerBank.receiveShadow=gravel.receiveShadow=true;group.add(outerBank,gravel);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float uTime;void main(){float edgeDist=min(vUv.x,1.0-vUv.x);float depth=smoothstep(0.0,.42,edgeDist);float longWave=sin(vUv.y*31.0-uTime*2.1+sin(vUv.x*7.0)*.55);float fineWave=sin(vUv.y*67.0-uTime*3.4+vUv.x*12.0);float glint=smoothstep(.78,1.0,longWave*.62+fineWave*.22)*.065;float edge=1.0-smoothstep(.025,.15,edgeDist);float foam=edge*smoothstep(.45,1.0,sin(vUv.y*38.0-uTime*2.35+vUv.x*9.0))*.13;vec3 shallow=vec3(.20,.52,.51);vec3 deep=vec3(.045,.29,.36);vec3 water=mix(shallow,deep,depth)+vec3(glint+foam);gl_FragColor=vec4(water,.78+depth*.14);}' });
 const water=new THREE.Mesh(geometry(.82,.055),material);water.name='river-flow-ribbon';water.renderOrder=2;water.receiveShadow=false;group.add(water);
 const stoneGeo=new THREE.DodecahedronGeometry(.1,0),stoneMat=mat('#7a806f',.95);for(let i=4;i<61;i+=7){const p=points[i],t=points[i+1].clone().sub(points[i-1]).normalize(),n=new THREE.Vector3(-t.z,0,t.x),side=i%2?1:-1,stone=new THREE.Mesh(stoneGeo,stoneMat);stone.position.copy(p).addScaledVector(n,side*(.95+(i%3)*.06));stone.position.y=.08;stone.scale.setScalar(.75+(i%4)*.14);stone.rotation.y=i*.73;stone.castShadow=stone.receiveShadow=true;group.add(stone)}return {mesh:group,material};
}

function terrainNoise(x:number,z:number){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n)}
function addTerrain(scene:THREE.Scene,propsByCell:Map<number,THREE.Object3D[]>){
 const terrain=new THREE.Group();terrain.name='district-terrain';
 const track=(cell:number,object:THREE.Object3D)=>{const props=propsByCell.get(cell);if(props)props.push(object);else propsByCell.set(cell,[object]);return object};
 // One flat, continuous surface carries the biome treatment. Cells remain a
 // simulation concern: they only index props and picking, never ground meshes.
 const surfaceGeometry=new THREE.PlaneGeometry(W,H,W,H),surfaceColors:number[]=[];
 const meadow=new THREE.Color('#71966d'),brightMeadow=new THREE.Color('#91b978'),forest=new THREE.Color('#557b61'),rock=new THREE.Color('#888778'),wetland=new THREE.Color('#789887');
 for(let z=0;z<=H;z++)for(let x=0;x<=W;x++){
  const gx=x-W/2,gz=z-H/2,n=terrainNoise(x*.73,z*.61),wet=gx>W*.17||isRiverCell(Math.min(H-1,Math.max(0,z-1))*W+Math.min(W-1,Math.max(0,x-1))),high=gz<-H*.25&&gx<W*.12,woods=gz>H*.08&&gx<-W*.08;
  const color=wet?wetland:high?rock:woods?forest:n>.55?brightMeadow:meadow;surfaceColors.push(color.r,color.g,color.b);
 }
 surfaceGeometry.setAttribute('color',new THREE.Float32BufferAttribute(surfaceColors,3));
 const surface=new THREE.Mesh(surfaceGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0}));surface.rotation.x=-Math.PI/2;surface.receiveShadow=true;surface.name='continuous-biome-ground';terrain.add(surface);
 for(let z=0;z<H;z++)for(let x=0;x<W;x++){
  const wx=x-(W-1)/2,wz=z-(H-1)/2,n=terrainNoise(x,z),wet=x>W*.67||isRiverCell(z*W+x),high=z<H*.25&&x<W*.62,woods=z>H*.36&&x<W*.42;
  if(wet&&n>.34){for(let r=0;r<2;r++){const reed=track(z*W+x,cyl(terrain,.018,.36,[wx-.22+r*.22,.18,wz+.12],'#789d68',5));reed.rotation.z=(n-.5)*.35}}
  else if(woods&&n>.18){for(let t=0;t<2;t++){const tx=wx+(t-.5)*.34,tz=wz+(terrainNoise(x+t,z+4)-.5)*.34;track(z*W+x,cyl(terrain,.045,.42,[tx,.21,tz],'#604b3c',7));track(z*W+x,cone(terrain,.23,.55,[tx,.62,tz],'#3f7055',7));track(z*W+x,cone(terrain,.16,.38,[tx,.9,tz],'#568461',7))}}
  else if(high&&n>.28){const stone=track(z*W+x,cone(terrain,.18+n*.12,.28+n*.25,[wx+(n-.5)*.3,.14,wz+(n-.5)*.25],'#928d7d',6));stone.rotation.z=(n-.5)*.5}
  else if(n>.78){const tuft=track(z*W+x,cone(terrain,.08,.22,[wx-.25+n*.38,.11,wz+.24-n*.35],'#6ea360',5));tuft.rotation.z=(n-.5)*.45}
 }
 scene.add(terrain);return terrain;
}
function walkerTexture(style:CatDecalStyle,accent:string){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,128,160);
 ctx.fillStyle='rgba(15,35,36,.22)';ctx.beginPath();ctx.ellipse(64,145,34,9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#69483c';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(51,117);ctx.quadraticCurveTo(18,101,29,76);ctx.stroke();
 ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(61,88,31,39,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(78,47,25,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(59,32);ctx.lineTo(64,8);ctx.lineTo(78,30);ctx.moveTo(83,28);ctx.lineTo(103,10);ctx.lineTo(103,39);ctx.fill();ctx.fillStyle='#17282b';ctx.beginPath();ctx.arc(87,45,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dc8980';ctx.beginPath();ctx.arc(101,53,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f5e6cf';ctx.lineWidth=2;for(const dy of[-3,3]){ctx.beginPath();ctx.moveTo(99,54);ctx.lineTo(119,50+dy);ctx.stroke()}
 if(style==='face'){ctx.fillStyle='#f3c567';ctx.beginPath();ctx.arc(63,76,10,0,Math.PI*2);ctx.fill()}if(style==='paw'){ctx.fillStyle='#f4d28b';ctx.beginPath();ctx.arc(40,103,9,0,Math.PI*2);ctx.fill()}return canvas;
}

function facilityModel(kind:BuildingKind,level:number){
 const g=new THREE.Group(),c=COLORS[kind];g.userData.kind=kind;
 const body=(size:[number,number,number],y=.5)=>box(g,size,[0,y,0],c);
 if(kind==='fishery'){
  box(g,[1.85,.1,1.72],[0,.05,0],'#72543b');for(const x of[-.72,-.24,.24,.72])cyl(g,.05,.46,[x,.28,.7],'#654936',10);
  if(level===1){box(g,[.82,.65,.72],[-.2,.43,-.2],'#a56d47');roof(g,1,.9,1,'#5d493e');paw(g,[.48,.35,.58]);}
  if(level>=2){box(g,[1.35,.18,.62],[0,.34,-.2],'#bf824e');for(const x of[-.58,-.2,.18,.56])box(g,[.25,.2,.22],[x,.48,.45],'#ce985b');for(const x of[-.55,.1,.7]){const n=new THREE.Mesh(new THREE.TorusGeometry(.2,.025,6,12,Math.PI*1.6),mat('#d9c9a2'));n.position.set(x,.72,.58);n.rotation.x=Math.PI/2;g.add(n)}}
  if(level===3){box(g,[.82,.78,.8],[-.2,.5,-.25],'#b87549');roof(g,1,.92,1.15,'#56463d');box(g,[.1,.9,.1],[.62,.52,.48],'#70513d');cyl(g,.18,.05,[.62,1,.48],'#f0d78e',12);for(const x of[-.45,.45]){cyl(g,.06,1,[x,.55,.66],'#604535',10);cyl(g,.14,.04,[x,1.08,.66],'#d3b77d',12)}box(g,[.46,.05,.38],[.38,1.15,.45],'#d9c9a2');}
 } else if(kind==='field'){
  box(g,[1.7,.12,1.7],[0,.06,0],'#76583d');const rows=level===1?2:level===2?3:4;for(let r=0;r<rows;r++){const z=-.62+r*.4;box(g,[1.38,.08,.16],[0,.18,z],'#8d6842');for(let x=-.52;x<=.52;x+=.26)cone(g,.06,.3,[x,.34,z],'#83b85b',7)}
  if(level>=2){box(g,[.48,.5,.4],[-.55,.42,.5],'#9a6a42');roof(g,.6,.52,.72,'#6a513e');for(const x of[-.7,-.2,.3,.8])pipeBetween(g,new THREE.Vector3(x,0,-.72),new THREE.Vector3(x,0,.72),'#69c9aa',.025,.42)}
  if(level===3){for(const x of[-.62,0,.62])box(g,[.44,.12,1.35],[x,.3,.05],'#9f7449');for(const x of[-.72,.72])cyl(g,.07,.7,[x,.64,.55],'#77553b',10);box(g,[.42,.12,.12],[0,1.02,.55],'#d4a15c');for(const x of[-.65,.65])box(g,[.28,.25,.25],[x,.32,.62],'#c89253')}
 } else if(kind==='farm'){
  box(g,[1.65,.12,1.6],[0,.06,0],'#806044');if(level===1){box(g,[1.05,.8,.82],[0,.48,0],c);roof(g,1.2,1,1.02,'#765044');}
  if(level>=2){box(g,[1.18,1,.9],[-.18,.56,0],c);roof(g,1.35,1.08,1.2,'#765044');cyl(g,.25,1.25,[.62,.7,-.2],'#d7a86b');roof(g,.55,.55,1.45,'#8d6548');box(g,[.52,.08,.58],[.45,.3,.62],'#886143');}
  if(level===3){box(g,[1.18,1.05,.9],[-.3,.58,0],c);box(g,[.42,.75,.9],[.58,.43,0],c);roof(g,1.65,1.1,1.3,'#765044');cyl(g,.24,1.5,[.63,.8,-.3],'#d7a86b');box(g,[.52,.5,.65],[-.05,.38,.65],'#9bcbaf');for(const x of[-.3,.3])cyl(g,.035,.55,[x,1.1,.66],'#d6c19b',8);ears(g,1.36,'#765044');}
 } else if(kind==='plant'){
  body([1.7,.85,1.45],.48);if(level===1){cyl(g,.22,1.55,[-.42,1.05,.1],'#c96759');cyl(g,.16,1.9,[.38,1.22,-.1],'#dca269');}
  if(level>=2){for(const x of[-.55,.0,.55])cyl(g,.18,1.65,[x,.98,.1],'#c96759');for(const x of[-.55,.55])pipeBetween(g,new THREE.Vector3(x,0,.55),new THREE.Vector3(x,0,-.55),'#f5c56b',.06,.92);cyl(g,.28,.1,[0,1.8,.1],'#f5c56b',12)}
  if(level===3){box(g,[.62,.8,.5],[0,1.1,-.45],'#b95e56');ears(g,1.65,'#b95e56');cyl(g,.18,2,[.55,1.25,.15],'#dba16b');box(g,[.12,.12,.55],[.55,2.3,.15],'#f5ca75');}
 } else if(kind==='intake'){
  body([1.7,.48,1.5],.25);if(level===1){cyl(g,.3,.7,[-.4,.78,0],'#91d9df');box(g,[.65,.5,.55],[.35,.55,0],'#79c2ce');}
  if(level>=2){for(const x of[-.48,.48])cyl(g,.3,.9,[x,.82,0],'#91d9df');for(const z of[-.42,.42])pipeBetween(g,new THREE.Vector3(-.75,0,z),new THREE.Vector3(.75,0,z),'#dff8ff',.06,.78);box(g,[.72,.42,.08],[0,.67,.78],'#dff8ff');for(let x=-.25;x<=.25;x+=.25)box(g,[.025,.35,.025],[x,.67,.78],'#4d8290')}
  if(level===3){box(g,[.92,.8,.72],[0,.62,-.2],c);roof(g,1.05,.85,1.08,'#4d7780');cyl(g,.2,1.25,[-.55,.8,.42],'#91d9df');cyl(g,.2,1.25,[.55,.8,.42],'#91d9df');box(g,[.08,1.2,.08],[.68,.85,-.45],'#72533d');box(g,[.75,.06,.06],[.3,1.38,-.45],'#72533d');}
 } else if(kind==='purifier'){
  body([1.75,.42,1.55],.22);const tanks=level===1?2:level===2?3:4;for(let i=0;i<tanks;i++){const x=(i-(tanks-1)/2)*.4;cyl(g,.25,.75,[x,.75,0],'#8fced0');cyl(g,.08,.12,[x,1.17,0],'#d9f0d0')}if(level>=2){for(let i=-1;i<=1;i++)pipeBetween(g,new THREE.Vector3(i*.42,0,-.48),new THREE.Vector3(i*.42,0,.48),'#d5e4d6',.045,.92);box(g,[.3,.8,.14],[0,.78,.8],'#d5e4d6');}if(level===3){box(g,[.45,1.1,.45],[0,1.25,-.38],'#76aeb0');for(const x of[-.58,.58]){box(g,[.38,.12,.75],[x,.32,.42],'#d5e4d6');paw(g,[x,.5,.84],'#8bbdca')}cyl(g,.12,.5,[0,2,-.38],'#d5e4d6')}
 } else if(kind==='quarry'){
  box(g,[1.8,.15,1.65],[0,.075,0],'#665a4b');const piles=level===1?3:level===2?5:7;for(let i=0;i<piles;i++){const x=-.65+(i%4)*.42,z=-.25+Math.floor(i/4)*.5;cone(g,.22,.38,[x,.28,z],'#b7a27b',5)}if(level>=2){for(const z of[-.45,0,.45])box(g,[1.3,.12,.18],[.05,.42,z],'#a89370');box(g,[.18,.8,.18],[-.7,.68,.55],'#e0b548');box(g,[1.15,.08,.1],[-.1,1.05,.55],'#edc45d');}if(level===3){for(const y of[.65,1.05])box(g,[1.2,.12,.28],[.1,y,-.1],'#9d8968');box(g,[.12,1.45,.12],[.68,.78,.5],'#e0b548');box(g,[.9,.08,.08],[.2,1.42,.5],'#edc45d');box(g,[.3,.28,.05],[-.62,.72,.82],'#f0ce66');paw(g,[-.62,.74,.85],'#4b3f36')}
 } else if(kind==='litter'){
  body([1.65,.75,1.4],.42);if(level===1){box(g,[1.15,.18,1],[0,.88,0],'#4f756d');cyl(g,.25,.55,[-.45,1.1,0],'#d8d3b4');}
  if(level>=2){for(const x of[-.55,0,.55])box(g,[.38,.5,.55],[x,.98,0],'#d5b46f');box(g,[1.18,.09,.14],[0,1.25,.42],'#637a70');}
  if(level===3){for(const x of[-.5,0,.5])cyl(g,.22,.9,[x,.95,-.25],'#d9e0c9');box(g,[1.05,.08,.24],[0,1.4,.28],'#8aa9a0');box(g,[1.12,.07,.08],[0,1.54,.28],'#d5b46f');}
 } else if(kind==='feed'){
  body([1.6,.9,1.4],.5);if(level===1){roof(g,1.75,1.5,1.2,'#775047');cyl(g,.27,1.35,[.5,.9,-.3],'#e5b877');}
  if(level>=2){roof(g,1.7,1.45,1.15,'#775047');for(const x of[-.58,.58])cyl(g,.24,1.35,[x,.9,-.2],'#e5b877');box(g,[.8,.22,.3],[0,1.15,.35],'#b86b53');}
  if(level===3){box(g,[.65,1.2,.55],[0,1.05,0],c);for(const x of[-.7,.7])cyl(g,.25,1.5,[x,.9,-.2],'#e5b877');box(g,[1.5,.12,.14],[0,1.8,.35],'#d6a05f');ears(g,2,'#775047');box(g,[.25,.06,.06],[0,1.86,.5],'#d9c38c')}
 } else if(kind==='hall'){
  if(level===1){body([1.65,.82,1.45],.41);roof(g,1.84,1.62,1.08,'#705045');box(g,[.62,.38,.06],[0,.38,.74],'#8b6547');box(g,[.32,.3,.04],[0,.65,.77],'#8ec2c2')}
  if(level===2){body([1.48,1.55,1.3],.78);roof(g,1.7,1.5,1.72,'#705045');for(const x of[-.38,.38])cyl(g,.06,1.1,[x,.65,.78],'#765445',8);cyl(g,.16,.04,[0,1.83,.02],'#f6d57b',12);box(g,[.75,.06,.08],[0,1.9,.75],'#f6d57b')}
  if(level===3){body([1.08,1.9,.98],.95);for(const x of[-.7,.7]){const wing=new THREE.Group();wing.position.x=x;box(wing,[.5,1.12,1.24],[0,.56,0],'#c2944f');gableRoof(wing,.62,1.32,1.25,'#705045');box(wing,[.26,.32,.04],[0,.48,.64],'#8ec2c2');g.add(wing)}box(g,[.42,.82,.42],[0,2.24,0],'#c2944f');{const towerRoof=cone(g,.34,.4,[0,2.86,0],'#705045',4);towerRoof.rotation.y=Math.PI/4;towerRoof.scale.z=.92}decal(g,[0,2.36,.23],.3,'face','#f2d27c');box(g,[.08,.62,.04],[0,1.58,.53],'#cf5b58');paw(g,[0,.64,.52],'#f6d57b')}
 } else if(kind==='plaza'){
  box(g,[1.65,.18,1.55],[0,.09,0],'#e7c777');if(level===1){cyl(g,.18,1.5,[0,.85,0],c);cone(g,.46,.75,[0,1.65,0],'#f0bd4d',6);paw(g,[0,.2,.6])}
  if(level>=2){cyl(g,.28,.45,[0,.3,0],'#d2a960');cone(g,.35,.55,[0,.8,0],c,6);for(const x of[-.62,.62])box(g,[.45,.18,.25],[x,.25,.2],'#9b7951');for(const x of[-.65,.65]){cyl(g,.05,.75,[x,.55,-.55],'#72533d',8);cyl(g,.12,.05,[x,.95,-.55],'#f6d57b',10)}}
  if(level===3){cyl(g,.3,1.8,[0,1,0],c);cone(g,.48,.75,[0,2.25,0],'#f0bd4d',6);for(const x of[-.7,.7])box(g,[.5,.2,.3],[x,.28,.25],'#9b7951');box(g,[1.35,.08,.5],[0,1.35,.18],'#d5ae63');ears(g,2.7,'#f0bd4d')}
 }
 g.userData.pickable=true;return g;
}
export class V2Scene{
 readonly renderer:THREE.WebGLRenderer;readonly scene=new THREE.Scene();readonly camera=new THREE.PerspectiveCamera(43,1,.1,150);readonly controls:OrbitControls;readonly groundHit:THREE.Mesh;
 private city=new THREE.Group();private preview=new THREE.Group();private guide=new THREE.Group();private serviceHalo=new THREE.Group();private walkers=new THREE.Group();private walkerData:{sprite:THREE.Sprite;route:THREE.Vector3[];progress:number;speed:number;pause:number}[]=[];private pickables:THREE.Object3D[]=[];private selectedRing?:THREE.Mesh;private terrainPropsByCell=new Map<number,THREE.Object3D[]>();private unlockedCount=0;private raycaster=new THREE.Raycaster();private pointer=new THREE.Vector2();private river=riverRibbon();private timer=new THREE.Timer();private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;private mobile=innerWidth<720;private lastRender=0;
 constructor(readonly canvas:HTMLCanvasElement){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:!this.mobile,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.25:1.6));this.renderer.shadowMap.enabled=!this.mobile;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.06;
  this.scene.background=new THREE.Color('#b9d5cf');this.scene.fog=null;this.camera.position.set(18,22,23);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.target.set(0,0,-.5);this.controls.minDistance=12;this.controls.maxDistance=48;this.controls.maxPolarAngle=Math.PI*.47;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.mouseButtons.RIGHT=null as unknown as THREE.MOUSE;this.controls.mouseButtons.MIDDLE=THREE.MOUSE.DOLLY;this.controls.touches.ONE=THREE.TOUCH.PAN;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;this.controls.minPolarAngle=.08;this.controls.maxPolarAngle=Math.PI*.82;
  this.scene.add(new THREE.HemisphereLight('#eefff8','#344b42',2.1));const sun=new THREE.DirectionalLight('#fff1d5',3);sun.position.set(-13,26,16);sun.castShadow=!this.mobile;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;this.scene.add(sun);

  this.groundHit=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));this.groundHit.rotation.x=-Math.PI/2;this.groundHit.position.y=.03;this.scene.add(this.groundHit);
  // The tile grid is an editor aid, not part of the finished landscape. Preview
  // and selection rings still provide discrete placement feedback when needed.
  this.scene.add(this.river.mesh);addTerrain(this.scene,this.terrainPropsByCell);this.walkers.name='illustrated-cat-walkers';this.scene.add(this.walkers);
  for(const mx of[2,4,9,16]){const p=world(mx),mount=cone(this.scene,2.3,4.1,[p.x,1.65,p.z-2.6],'#6a7565',6);mount.rotation.y=.3;cone(this.scene,.85,1.25,[p.x,4.2,p.z-2.6],'#d6dacd',6)}
    // Quarry scenery is decorative only; no per-cell outline is rendered.

  this.scene.add(this.city,this.preview,this.guide,this.serviceHalo);this.resize();addEventListener('resize',()=>this.resize());this.animate();
 }
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
 cellFromPointer(clientX:number,clientY:number){const rect=this.canvas.getBoundingClientRect();this.pointer.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const modelHit=this.raycaster.intersectObjects(this.pickables,true)[0];if(modelHit){let node:THREE.Object3D|null=modelHit.object;while(node&&typeof node.userData.cell!=='number')node=node.parent;if(typeof node?.userData.cell==='number')return node.userData.cell}const hit=this.raycaster.intersectObject(this.groundHit)[0];if(!hit)return null;const x=Math.floor(hit.point.x+W/2),y=Math.floor(hit.point.z+H/2);return x>=0&&x<W&&y>=0&&y<H?y*W+x:null}
 screenForCell(cell:number){const p=world(cell).project(this.camera),rect=this.canvas.getBoundingClientRect();return{x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2}}
 sync(s:State,selected:number|null){
  this.syncUnlockedView(s);
  // Keep decorative terrain independent from the simulation grid. Only roads
  // and building footprints claim land; utility lines remain visually buried.
  const cleared=new Set<number>();for(let i=0;i<s.grid.length;i++){const cell=s.grid[i];if(cell&&cell.kind!=='wire'&&cell.kind!=='pipe')cleared.add(i)}
  for(const [cell,props] of this.terrainPropsByCell){const d=districtForCell(cell),open=Boolean(d&&s.unlockedDistricts.includes(d));for(const prop of props)prop.visible=open&&!cleared.has(cell);}
  dispose(this.city);this.scene.remove(this.city);this.city=new THREE.Group();this.pickables=[];this.scene.add(this.city);
  const roadCells=s.grid.map((c,i)=>c?.kind==='road'?i:-1).filter(i=>i>=0),roadSet=new Set(roadCells);for(const i of roadCells){const p=world(i),topology=cardinalRoadTopology(i,roadSet,W,H,i===EXTERNAL_ROAD),road=new THREE.Group();road.position.set(p.x,0,p.z);road.userData={cell:i,pickable:true};roadVisual(road,topology,isRiverCell(i));this.city.add(road)}
  for(const driveway of sharedDriveways(s.grid,W,H))sharedDriveway(this.city,driveway);
  for(const kind of['wire','pipe'] as const){const segments=s.utilities[kind],activeCells=utilityNetworkCells(s.grid,segments,kind==='wire'?['plant']:['intake']),owners=new Map<number,number>();for(const segment of segments)for(const cell of dragLine(segment.a,segment.b))owners.set(cell,(owners.get(cell)||0)+1);for(const segment of segments){const path=dragLine(segment.a,segment.b),active=path.some(cell=>activeCells.has(cell)),color=active?COLORS[kind]:kind==='wire'?'#776f46':'#416775',a=world(segment.a),b=world(segment.b);pipeBetween(this.city,a,b,color,kind==='wire'?.058:.09,kind==='wire'?.42:.18);for(const endpoint of[segment.a,segment.b]){const p=world(endpoint);if(kind==='wire'){cyl(this.city,.09,.72,[p.x,.36,p.z],color,10);box(this.city,[.28,.05,.12],[p.x,.69,p.z],color)}else{cyl(this.city,.12,.18,[p.x,.11,p.z],color,12);const valve=new THREE.Mesh(new THREE.TorusGeometry(.13,.025,7,14),mat(color,.4,.25));valve.rotation.x=Math.PI/2;valve.position.set(p.x,.25,p.z);this.city.add(valve)}}}for(const[cell,count]of owners)if(count>1){const p=world(cell),color=activeCells.has(cell)?COLORS[kind]:'#62716f';if(kind==='wire'){cyl(this.city,.115,.78,[p.x,.39,p.z],color,12);const halo=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,8,18),mat(color,.35,.2));halo.rotation.x=Math.PI/2;halo.position.set(p.x,.79,p.z);this.city.add(halo)}else{cyl(this.city,.15,.22,[p.x,.12,p.z],color,12);const valve=new THREE.Mesh(new THREE.TorusGeometry(.18,.03,8,18),mat(color,.35,.25));valve.rotation.x=Math.PI/2;valve.position.set(p.x,.26,p.z);this.city.add(valve)}}}
  for(let i=0;i<s.grid.length;i++){const cell=s.grid[i];if(!cell||cell.anchor!==i||cell.kind==='road')continue;const p=centerWorld(i,cell.kind),size=footprint(cell.kind),g=facilityModel(cell.kind,cell.level);const soil=box(g,[size*.9,.035,size*.9],[0,.055,0],cell.kind==='field'?'#8b704b':'#75634d',1);soil.userData.foundation=true;g.position.copy(p);g.userData={cell:i,kind:cell.kind,pickable:true};g.traverse(o=>o.userData.cell=i);this.pickables.push(g);const diag=s.diagnostics[i];if(diag?.online){const ring=new THREE.Mesh(new THREE.RingGeometry(.72,.84,28),new THREE.MeshBasicMaterial({color:COLORS[cell.kind],side:THREE.DoubleSide,transparent:true,opacity:.65}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring)}else if(diag){const beacon=cone(g,.14,.34,[.68,2.2,.62],'#ee756b',5);beacon.userData.warning=true}this.city.add(g)}
  if(selected!==null){const cell=s.grid[selected];if(cell){const anchor=cell.anchor,p=centerWorld(anchor,cell.kind),size=footprint(cell.kind);this.selectedRing=new THREE.Mesh(new THREE.RingGeometry(size*.66,size*.76,4),new THREE.MeshBasicMaterial({color:'#ffe49a',side:THREE.DoubleSide}));this.selectedRing.rotation.set(-Math.PI/2,0,Math.PI/4);this.selectedRing.position.set(p.x,.07,p.z);this.city.add(this.selectedRing)}else{const kind=utilitySegmentsAt(s,'wire',selected).length?'wire':utilitySegmentsAt(s,'pipe',selected).length?'pipe':null;if(kind){const p=world(selected),color=kind==='wire'?'#ffe169':'#82ddff';this.selectedRing=new THREE.Mesh(new THREE.RingGeometry(.22,.36,4),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.95}));this.selectedRing.rotation.set(-Math.PI/2,0,Math.PI/4);this.selectedRing.position.set(p.x,kind==='wire'?.78:.06,p.z);this.city.add(this.selectedRing)}}}
  this.syncGuide(s);this.syncLockedDistricts(s);this.syncWalkers(s);this.syncServiceHalo(s,selected);
 }
 private syncUnlockedView(s:State){if(this.unlockedCount===s.unlockedDistricts.length)return;this.unlockedCount=s.unlockedDistricts.length;const open=s.unlockedDistricts.map(id=>DISTRICTS[id]);if(!open.length)return;const centers=open.map(d=>new THREE.Vector3((d.minX+d.maxX)/2-(W-1)/2,0,(d.minY+d.maxY)/2-(H-1)/2)),target=centers.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/centers.length),area=Math.max(16,Math.sqrt(open.length*16*12)),distance=Math.min(43,18+area*.78),direction=new THREE.Vector3(.72,.9,.82).normalize();this.controls.target.copy(target);this.camera.position.copy(target).addScaledVector(direction,distance);this.controls.maxDistance=Math.max(34,distance*1.35);this.controls.update()}
 private syncWalkers(s:State){
  const roads=s.grid.map((c,i)=>c?.kind==='road'?i:-1).filter(i=>i>=0);const route=roads.map(i=>world(i));
  for(const [i,c] of s.grid.entries())if(c&&c.anchor===i&&['hall','plaza','fishery'].includes(c.kind))route.push(centerWorld(i,c.kind));
  if(route.length<2)return;const count=innerWidth<720?3:8;const coats=['#d49b61','#8b6a58','#c9c7b5','#6c8790','#c87864','#e4bf72','#719b79','#b783a0'];
  while(this.walkerData.length<count){const n=this.walkerData.length,texture=new THREE.CanvasTexture(walkerTexture(n%2?'paw':'face',coats[n%coats.length]));texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true}));sprite.scale.set(.9,1.18,1);sprite.renderOrder=6;this.walkers.add(sprite);this.walkerData.push({sprite,route:[],progress:n/count,speed:.035+n*.004,pause:0})}
  for(let n=0;n<this.walkerData.length;n++){const w=this.walkerData[n];w.sprite.visible=n<count;w.route=route;if(w.progress>=route.length-1)w.progress=(n*.73)%Math.max(1,route.length-1);}
 }
 private updateWalkers(dt:number){if(this.reduced)return;const frameDelta=Number.isFinite(dt)?Math.min(Math.max(dt,0),.1):0;for(const w of this.walkerData){if(!w.sprite.visible||w.route.length<2)continue;if(w.pause>0){w.pause-=frameDelta;continue}w.progress+=frameDelta*w.speed*1.6;if(!Number.isFinite(w.progress)||w.progress<0||w.progress>=w.route.length-1){w.progress=0;w.pause=1.1}const a=w.route[Math.floor(w.progress)],b=w.route[Math.min(w.route.length-1,Math.floor(w.progress)+1)];if(!a||!b)continue;const t=w.progress%1;w.sprite.position.lerpVectors(a,b,t);w.sprite.position.y=1.1+Math.sin(w.progress*3)*.035;w.sprite.scale.x=b.x<a.x?-.9:.9}}
 private syncLockedDistricts(s:State){const locked=new THREE.Group();locked.name='locked-district-markers';const district=(x0:number,z0:number,x1:number,z1:number)=>{const cx=(x0+x1-W)/2,cz=(z0+z1-H)/2,w=x1-x0,h=z1-z0;const veil=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:'#b9d5cf',transparent:false,depthWrite:false}));veil.rotation.x=-Math.PI/2;veil.position.set(cx,.04,cz);locked.add(veil);const edgeX=x0===16?x0:x1-1,edgeZ=z0===12?z0:z1-1;const marker=cone(locked,.22,.45,[edgeX-W/2,.22,edgeZ-H/2],'#f1c27d',6);marker.userData.frontier=true;};for(const [id,d] of Object.entries({q1:[0,0,16,12],q2:[16,0,32,12],q3:[0,12,16,24],q4:[16,12,32,24]})){if(!s.unlockedDistricts.includes(id as State['unlockedDistricts'][number]))district(...(d as [number,number,number,number]));}this.city.add(locked)}
 private syncGuide(s:State){dispose(this.guide);this.scene.remove(this.guide);this.guide=new THREE.Group();this.scene.add(this.guide);if(s.stage!==1)return;const guide=firstContractGuide(s);if(guide.step==='complete')return;const color=guide.requiredTool==='wire'?'#f4c84f':guide.requiredTool==='pipe'?'#66c9ef':'#f2b66c',ringAt=(cell:number,size=.43)=>{const p=world(cell),ring=new THREE.Mesh(new THREE.RingGeometry(size,size+.11,24),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.11,p.z);this.guide.add(ring);cone(this.guide,.13,.36,[p.x,.55,p.z],color,5)};if(guide.step==='wire-starter'){ringAt(guide.start);ringAt(guide.end);pipeBetween(this.guide,world(guide.start),world(guide.end),color,.035,.16)}}
 private syncServiceHalo(s:State,selected:number|null){dispose(this.serviceHalo);this.scene.remove(this.serviceHalo);this.serviceHalo=new THREE.Group();this.serviceHalo.name='facility-service-halo';this.scene.add(this.serviceHalo);if(selected===null)return;const cell=s.grid[selected],anchor=cell?.anchor??selected;if(!cell)return;const cells=facilityServiceAreaCells(anchor,cell.kind);for(const i of cells){const p=world(i),tile=new THREE.Mesh(new THREE.PlaneGeometry(.82,.82),new THREE.MeshBasicMaterial({color:'#8fe1bd',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));tile.rotation.x=-Math.PI/2;tile.position.set(p.x,.035,p.z);this.serviceHalo.add(tile)}const center=centerWorld(anchor,cell.kind),ring=new THREE.Mesh(new THREE.RingGeometry(Math.max(.7,footprint(cell.kind)*.62),Math.max(.76,footprint(cell.kind)*.68),32),new THREE.MeshBasicMaterial({color:'#9af4c9',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(center.x,.06,center.z);this.serviceHalo.add(ring)}
 showPreview(s:State,tool:BuildingKind,start:number|null,end:number|null,valid:boolean){dispose(this.preview);this.scene.remove(this.preview);this.preview=new THREE.Group();this.scene.add(this.preview);if(end===null)return;const color=valid?'#a8ffe0':'#ff786f',material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false});if((tool==='wire'||tool==='pipe')&&start!==null){const a=world(start),b=world(end);pipeBetween(this.preview,a,b,color,tool==='wire'?.075:.105,tool==='wire'?.48:.24);for(const cell of[start,end]){const p=world(cell),ring=new THREE.Mesh(new THREE.RingGeometry(.2,.31,20),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.05,p.z);this.preview.add(ring)}const existing=new Set(s.utilities[tool].flatMap(segment=>dragLine(segment.a,segment.b)));for(const cell of dragLine(start,end))if(existing.has(cell)){const p=world(cell);cyl(this.preview,.1,.16,[p.x,.16,p.z],color,12)}}else if(tool==='road'&&start!==null){for(const cell of dragLine(start,end)){const p=world(cell),m=new THREE.Mesh(new THREE.BoxGeometry(.86,.06,.86),material);m.position.set(p.x,.12,p.z);this.preview.add(m)}}else{const size=footprint(tool),ghost=facilityModel(tool,1);ghost.traverse(o=>{if(o instanceof THREE.Mesh){const gm=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();if(Array.isArray(gm))gm.forEach(m=>{m.transparent=true;m.opacity=valid?.42:.22;m.depthWrite=false});else{gm.transparent=true;gm.opacity=valid?.42:.22;gm.depthWrite=false}o.material=gm}});ghost.position.copy(centerWorld(end,tool));ghost.userData.ghost=true;this.preview.add(ghost);const footprintSet=new Set(footprintCells(end,size));for(const cell of facilityServiceAreaCells(end,tool))if(!footprintSet.has(cell)){const p=world(cell),halo=new THREE.Mesh(new THREE.PlaneGeometry(.82,.82),new THREE.MeshBasicMaterial({color:valid?'#8fe1bd':'#ff786f',transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.set(p.x,.035,p.z);this.preview.add(halo)}for(const cell of footprintSet){const p=world(cell),m=new THREE.Mesh(new THREE.BoxGeometry(.9,.035,.9),material);m.position.set(p.x,.08,p.z);this.preview.add(m)}}}
 focus(cell:number){const p=world(cell);this.controls.target.set(p.x,0,p.z)}
 rotate(delta:number){const offset=this.camera.position.clone().sub(this.controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),delta);this.camera.position.copy(this.controls.target.clone().add(offset))}
 zoom(factor:number){const offset=this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);if(offset.length()>=this.controls.minDistance&&offset.length()<=this.controls.maxDistance)this.camera.position.copy(this.controls.target.clone().add(offset))}
 resetCamera(){this.camera.position.set(18,22,23);this.controls.target.set(0,0,-.5)}
 private animate=(timestamp=performance.now())=>{requestAnimationFrame(this.animate);if(document.hidden)return;if(this.mobile&&timestamp-this.lastRender<33)return;this.lastRender=timestamp;this.controls.update();this.timer.update(timestamp);const dt=this.timer.getDelta();if(!this.reduced)this.river.material.uniforms.uTime.value=this.timer.getElapsed();this.updateWalkers(dt);this.renderer.render(this.scene,this.camera)};
}

export {COLORS,POWER_KINDS,WATER_KINDS};
