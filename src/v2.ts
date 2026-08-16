import './v2.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b9d5cf');
scene.fog=new THREE.Fog('#b9d5cf',35,82);
const camera=new THREE.PerspectiveCamera(42,1,.1,160);camera.position.set(29,25,35);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=14;controls.maxDistance=68;controls.maxPolarAngle=Math.PI*.47;controls.target.set(0,1,0);
scene.add(new THREE.HemisphereLight('#eafff6','#33463f',2.1));
const sun=new THREE.DirectionalLight('#fff2d3',3.2);sun.position.set(-18,34,22);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;scene.add(sun);
const mat=(color:string,rough=.72,metal=.05)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const groundMat=mat('#567c69',.98),roadMat=mat('#45545a',.94),waterMat=new THREE.MeshPhysicalMaterial({color:'#4fadc3',roughness:.18,metalness:.05,transmission:.08,transparent:true,opacity:.88});
const ground=new THREE.Mesh(new THREE.BoxGeometry(48,1,34),groundMat);ground.position.y=-.6;ground.receiveShadow=true;scene.add(ground);
const river=new THREE.Mesh(new THREE.BoxGeometry(5,.22,34),waterMat);river.position.set(15,.03,0);river.receiveShadow=true;scene.add(river);
const road=new THREE.Mesh(new THREE.BoxGeometry(39,.16,2.6),roadMat);road.position.set(-3,.04,8);road.receiveShadow=true;scene.add(road);
for(let x=-21;x<15;x+=3.2){const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.4,.02,.09),mat('#d5c58f'));stripe.position.set(x,.14,8);scene.add(stripe)}
const box=(parent:THREE.Object3D,size:[number,number,number],pos:[number,number,number],color:string,rough=.72)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color,rough));m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m};
const cyl=(parent:THREE.Object3D,r:number,h:number,pos:[number,number,number],color:string)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),mat(color,.55,.15));m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m};
const windowBand=(parent:THREE.Object3D,y:number,z:number,width:number)=>box(parent,[width,.5,.08],[0,y,z],'#75aeba',.24);
const groupAt=(x:number,z:number)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);return g};

// Mountains and the only quarryable deposit.
for(const [x,z,s] of [[-18,-11,1.3],[-13,-12,.9],[-7,-13,1.15],[1,-12,.8]] as const){const m=new THREE.Mesh(new THREE.ConeGeometry(4.7*s,7*s,6),mat('#6b7665',1));m.position.set(x,3.2*s,z);m.rotation.y=.35;m.castShadow=m.receiveShadow=true;scene.add(m);const cap=new THREE.Mesh(new THREE.ConeGeometry(2*s,2.3*s,6),mat('#d4d9cb',.95));cap.position.set(x,6.9*s,z);cap.rotation.y=.35;scene.add(cap)}
const quarry=groupAt(-14,-8);box(quarry,[8,.7,5],[0,.35,0],'#6c6252');for(const [x,z,s] of [[-2,-1,1.2],[0,0,1.6],[2,1,1]] as const){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),mat('#b8a577',.95));rock.position.set(x,.8,z);rock.castShadow=true;quarry.add(rock)}box(quarry,[.55,3,.55],[-2.8,1.7,1.5],'#e2b64c');const boom=box(quarry,[5,.28,.3],[-.7,3.05,1.5],'#f0c75d');boom.rotation.z=-.08;box(quarry,[1.2,.7,1.4],[2.4,.55,1.2],'#d79b3e');

// Modern water-resource recovery language: low green volumes, filters, planted roof.
const purifier=groupAt(10,-6);box(purifier,[9,1.4,5],[0,.7,0],'#75a998');box(purifier,[5.2,2.6,3],[0,2.1,0],'#d7e3d7');for(const x of[-3.1,3.1])cyl(purifier,1.25,1.55,[x,1.05,0],'#8bc3c5');for(let x=-2;x<=2;x+=.65)box(purifier,[.08,1.55,.16],[x,2.15,1.58],'#648a7e');box(purifier,[5,.15,2.8],[0,3.48,0],'#799f79');

// Cat-litter works: saw-tooth roof, translucent filter hall and recovery silo.
const litter=groupAt(-2,-2);box(litter,[10,3.4,6],[0,1.7,0],'#76988e');for(const x of[-3,-1,1,3]){const roof=new THREE.Mesh(new THREE.ConeGeometry(2.1,1.5,4),mat(x===1?'#dfe9dd':'#b8ccc1'));roof.position.set(x,4.05,0);roof.rotation.set(0,Math.PI/4,0);roof.scale.z=.78;roof.castShadow=true;litter.add(roof)}windowBand(litter,2.15,3.04,7.6);cyl(litter,1.1,5,[4.25,2.5,-1.4],'#d8d3bb');box(litter,[2.1,.35,1.3],[4.25,5.1,-1.4],'#f0e5ca');
for(const [a,b] of [[quarry,litter],[litter,purifier]] as const){const pa=new THREE.Vector3();const pb=new THREE.Vector3();a.getWorldPosition(pa);b.getWorldPosition(pb);const dir=pb.clone().sub(pa),len=dir.length(),pipe=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,len,12),mat('#d7ba69',.4,.5));pipe.position.copy(pa.clone().add(pb).multiplyScalar(.5)).y=.45;pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());scene.add(pipe)}

const homes=new THREE.Group();homes.position.set(-8,0,9);scene.add(homes);
function buildHome(level:number){homes.clear();if(level===1){box(homes,[6,2.8,5],[0,1.4,0],'#d7c8b5');const roof=new THREE.Mesh(new THREE.ConeGeometry(4.4,2.2,4),mat('#4f6e67'));roof.position.set(0,3.9,0);roof.rotation.y=Math.PI/4;roof.scale.z=.78;roof.castShadow=true;homes.add(roof);box(homes,[1.1,2,.18],[0,1,2.58],'#9b7254');for(const x of[-1.7,1.7])box(homes,[1.2,1,.15],[x,1.75,2.59],'#8bc1c2',.22)}else if(level===2){box(homes,[7,7,5],[0,3.5,0],'#aeb4ae');for(const y of[1.5,3.6,5.7]){windowBand(homes,y,2.54,5.7);box(homes,[5.7,.18,1.1],[0,y-.52,2.9],'#718d84')}box(homes,[3,.3,2.2],[1.3,7.15,0],'#8cab92')}else{box(homes,[6,14,5],[0,7,0],'#939fa2');for(let y=1.5;y<13;y+=2){windowBand(homes,y,2.54,4.7);box(homes,[4.8,.16,1.05],[0,y-.55,2.9],'#68847e')}box(homes,[3.4,.4,2.6],[-.7,14.2,0],'#87aa9a');for(const x of[-.8,.8]){const solar=box(homes,[1.3,.08,2.1],[x,14.5,0],'#315f69',.2);solar.rotation.x=-.18}}}
buildHome(1);
for(const x of[-17,-9,-1,7])for(const z of[3,14]){const tree=groupAt(x,z);cyl(tree,.18,1.4,[0,.7,0],'#705a43');const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,1),mat('#4f8664'));crown.position.y=1.9;crown.castShadow=true;tree.add(crown)}

const focusTargets={quarry:new THREE.Vector3(-14,1,-8),litter:new THREE.Vector3(-2,1.8,-2),home:new THREE.Vector3(-8,2.4,9)};
document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button=>button.onclick=()=>{const key=button.dataset.focus as keyof typeof focusTargets;controls.target.copy(focusTargets[key])});
document.querySelectorAll<HTMLButtonElement>('[data-home]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-home]').forEach(b=>b.classList.remove('active'));button.classList.add('active');buildHome(Number(button.dataset.home));controls.target.copy(focusTargets.home)});
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();function animate(){const t=clock.getElapsedTime();controls.update();waterMat.opacity=.84+Math.sin(t*1.3)*.04;renderer.render(scene,camera);requestAnimationFrame(animate)}animate();
