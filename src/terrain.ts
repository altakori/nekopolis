import{W,H,RIVER_PATH}from'./simulation';

export type TerrainGeometry={tw:number;th:number};
export type ScreenProjector=(x:number,y:number)=>readonly[number,number];
export const terrainGridBounds=(columns:number,rows:number)=>({minX:-.5,maxX:columns-.5,minY:-.5,maxY:rows-.5});

const pathThrough=(ctx:CanvasRenderingContext2D,points:readonly(readonly[number,number])[])=>{
 if(points.length<2)return;
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length-1;i++){
  const current=points[i],next=points[i+1];
  ctx.quadraticCurveTo(current[0],current[1],(current[0]+next[0])/2,(current[1]+next[1])/2);
 }
 const last=points[points.length-1];ctx.lineTo(last[0],last[1]);
};

const ellipse=(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string)=>{
 ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
};

const riverPoints=(screen:ScreenProjector)=>RIVER_PATH.map(([x,y])=>screen(x,y));
const clipToLand=(ctx:CanvasRenderingContext2D,screen:ScreenProjector)=>{
 const{minX,maxX,minY,maxY}=terrainGridBounds(W,H),top=screen(minX,minY),right=screen(maxX,minY),bottom=screen(maxX,maxY),left=screen(minX,maxY);
 ctx.beginPath();ctx.moveTo(top[0],top[1]);ctx.lineTo(right[0],right[1]);ctx.lineTo(bottom[0],bottom[1]);ctx.lineTo(left[0],left[1]);ctx.closePath();ctx.clip();
};

export function drawTerrainBase(ctx:CanvasRenderingContext2D,g:TerrainGeometry,screen:ScreenProjector,showGrid:boolean){
 const columns=W,rows=H,{minX,maxX,minY,maxY}=terrainGridBounds(columns,rows),top=screen(minX,minY),right=screen(maxX,minY),bottom=screen(maxX,maxY),left=screen(minX,maxY);
 const land=ctx.createLinearGradient(top[0],top[1],bottom[0],bottom[1]);land.addColorStop(0,'#9fc77c');land.addColorStop(.46,'#78ad68');land.addColorStop(1,'#568f60');
 ctx.fillStyle='#47775b';ctx.beginPath();ctx.moveTo(left[0],left[1]);ctx.lineTo(bottom[0],bottom[1]);ctx.lineTo(bottom[0],bottom[1]+g.th*1.35);ctx.lineTo(left[0],left[1]+g.th*1.35);ctx.closePath();ctx.fill();
 ctx.fillStyle=land;ctx.beginPath();ctx.moveTo(top[0],top[1]);ctx.lineTo(right[0],right[1]);ctx.lineTo(bottom[0],bottom[1]);ctx.lineTo(left[0],left[1]);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#eaf6c899';ctx.lineWidth=1.5;ctx.stroke();

 const patches:[[number,number],number,number,string][]=[[[5.2,3.5],2.5,1.15,'#e8d58642'],[[7.4,12.2],3.2,1.25,'#f2c8a13d'],[[15.5,8.1],2.7,1.2,'#74b98444'],[[3.2,9.4],2.15,.9,'#d8e98355'],[[13.2,14.4],3.4,1.1,'#f4df9b38']];
 for(const[[x,y],rx,ry,color]of patches){const[pX,pY]=screen(x,y);ellipse(ctx,pX,pY,g.tw*rx*.5,g.th*ry,color)}

 ctx.save();ctx.globalAlpha=showGrid?.32:.055;ctx.strokeStyle=showGrid?'#ece3b5':'#d8e6b5';ctx.lineWidth=showGrid?1.1:.65;
 for(let x=0;x<=columns;x++){const worldX=minX+x,a=screen(worldX,minY),b=screen(worldX,maxY);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
 for(let y=0;y<=rows;y++){const worldY=minY+y,a=screen(minX,worldY),b=screen(maxX,worldY);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}ctx.restore();

 const river=riverPoints(screen);
 ctx.save();clipToLand(ctx,screen);ctx.lineCap='round';ctx.lineJoin='round';
 // Layered carved banks: the darker outer cut, pale gravel shelf, then water.
 pathThrough(ctx,river);ctx.strokeStyle='#416b5d';ctx.lineWidth=g.tw*1.82;ctx.stroke();
 pathThrough(ctx,river);ctx.strokeStyle='#d8d59b';ctx.lineWidth=g.tw*1.56;ctx.stroke();
 pathThrough(ctx,river);ctx.strokeStyle='#86b77c';ctx.lineWidth=g.tw*1.36;ctx.stroke();
 const water=ctx.createLinearGradient(0,river[0][1],0,river[river.length-1][1]);water.addColorStop(0,'#8be0e6');water.addColorStop(.45,'#4fc0d5');water.addColorStop(1,'#268fb9');
 pathThrough(ctx,river);ctx.strokeStyle=water;ctx.lineWidth=g.tw*1.16;ctx.stroke();
 // Reeds, rocks, and small foam tongues make each bend feel carved into the land.
 for(let i=1;i<river.length-1;i++){
  const prev=river[i-1],next=river[i+1],[x,y]=river[i],dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  for(const side of[-1,1] as const){const offset=g.tw*(.68+(i%3)*.045)*side,bx=x+nx*offset,by=y+ny*offset;ctx.strokeStyle=side>0?'#6e905d':'#a1a96b';ctx.lineWidth=Math.max(1,g.tw*.018);for(let r=0;r<2+(i%3);r++){const sway=(r-1)*g.tw*.12;ctx.beginPath();ctx.moveTo(bx+sway,by);ctx.quadraticCurveTo(bx+sway+nx*side*g.tw*.08,by-g.th*.28,bx+sway-nx*side*g.tw*.03,by-g.th*.52);ctx.stroke()}if(i%2===0)ellipse(ctx,bx+nx*g.tw*.1,by+ny*g.tw*.1,g.tw*(.06+(i%3)*.015),g.th*.13,'#788675');}
  if(i%2===1){const fx=x+nx*g.tw*.45,fy=y+ny*g.tw*.45;ctx.strokeStyle='#eff7d6aa';ctx.lineWidth=Math.max(1.2,g.tw*.022);ctx.beginPath();ctx.moveTo(fx-(dx/len)*g.tw*.18,fy-(dy/len)*g.tw*.18);ctx.quadraticCurveTo(fx+nx*g.tw*.08,fy+ny*g.tw*.08,fx+(dx/len)*g.tw*.2,fy+(dy/len)*g.tw*.2);ctx.stroke()}
 }
 ctx.restore();

 const mountain=(wx:number,wy:number,scale:number,back=false)=>{const[x,y]=screen(wx,wy),w=g.tw*1.35*scale,h=g.th*5.1*scale;
  ellipse(ctx,x,y+g.th*.15,w*.9,g.th*.75*scale,back?'#7cad71':'#69a468');
  const rock=ctx.createLinearGradient(x-w,y-h,x+w,y);rock.addColorStop(0,back?'#b8c7aa':'#c9bd9d');rock.addColorStop(.48,back?'#89a58c':'#9ca783');rock.addColorStop(1,'#66806c');
  ctx.fillStyle=rock;ctx.beginPath();ctx.moveTo(x-w,y);ctx.quadraticCurveTo(x-w*.48,y-h*.38,x-w*.12,y-h);ctx.quadraticCurveTo(x+w*.28,y-h*.58,x+w,y);ctx.closePath();ctx.fill();
  ctx.fillStyle=back?'#8a958766':'#b7b29688';ctx.beginPath();ctx.moveTo(x-w*.13,y-h);ctx.quadraticCurveTo(x-w*.02,y-h*.66,x+w*.28,y-h*.42);ctx.lineTo(x+w*.62,y-g.th*.16);ctx.quadraticCurveTo(x+w*.18,y-h*.28,x-w*.13,y-h);ctx.fill();
  ctx.strokeStyle='#d5caa05c';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-w*.13,y-h);ctx.quadraticCurveTo(x-w*.42,y-h*.52,x-w*.62,y-g.th*.15);ctx.stroke();
  for(let n=0;n<5;n++){const tx=x-w*.7+n*w*.34,ty=y-g.th*(.05+(n%2)*.18);ellipse(ctx,tx,ty,g.tw*.16*scale,g.th*.3*scale,n%2?'#315a42':'#3d6948');ellipse(ctx,tx-g.tw*.07,ty-g.th*.2,g.tw*.13*scale,g.th*.25*scale,'#5f8656')}
 };
 mountain(2.2,1.1,.9,true);mountain(4.1,1.2,.68,true);mountain(9.1,.55,.52,true);mountain(15.8,.4,.45,true);

 const trees:[[number,number],number][]=[[[1.3,5.8],1],[[3.2,6.2],.8],[[11.8,2.4],.8],[[18.1,6.2],1],[[18.4,10.2],.75],[[2.4,15.6],.75],[[13.8,15.4],.85],[[7.2,16.1],.7]];
 for(const[[wx,wy],scale]of trees){const[x,y]=screen(wx,wy);ctx.fillStyle='#263a34';ctx.fillRect(x-g.tw*.025,y-g.th*.48,g.tw*.05,g.th*.5);ellipse(ctx,x,y-g.th*.58,g.tw*.24*scale,g.th*.55*scale,'#315e45');ellipse(ctx,x-g.tw*.13,y-g.th*.72,g.tw*.2*scale,g.th*.4*scale,'#4f7d52');ellipse(ctx,x+g.tw*.13,y-g.th*.66,g.tw*.18*scale,g.th*.37*scale,'#70915a')}
 const rocks:[[number,number],number][]=[[[5.1,15.3],.6],[[18.4,4.4],.8],[[12.8,5.5],.5],[[20,14.2],.65]];
 for(const[[wx,wy],scale]of rocks){const[x,y]=screen(wx,wy);ctx.fillStyle='#829082';ctx.beginPath();ctx.moveTo(x-g.tw*.18*scale,y);ctx.quadraticCurveTo(x-g.tw*.1*scale,y-g.th*.5*scale,x,y-g.th*.55*scale);ctx.quadraticCurveTo(x+g.tw*.2*scale,y-g.th*.32*scale,x+g.tw*.22*scale,y);ctx.closePath();ctx.fill();ctx.strokeStyle='#c0b99666';ctx.stroke()}
 const flowers:[[number,number],string][]=[[[4.4,7.2],'#fff3a8'],[[6.1,6.7],'#f49ab1'],[[8.8,13.4],'#bfa7ef'],[[12.2,10.8],'#fff0a1'],[[16.5,13.2],'#f58fa8'],[[3.4,14.3],'#a9d7f4'],[[15.1,4.8],'#ffd68a']];
 for(const[[wx,wy],color]of flowers){const[x,y]=screen(wx,wy);for(let n=0;n<3;n++){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+(n-1)*g.tw*.07,y-g.th*(.16+(n%2)*.08),Math.max(1.4,g.tw*.025),0,Math.PI*2);ctx.fill()}ctx.strokeStyle='#5b9a55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-g.th*.18);ctx.stroke()}
 const fence:[[number,number],[number,number]][]=[[[1.2,12.6],[5.8,12.6]],[[9.4,16.2],[14.6,16.2]]];for(const[a,b]of fence){const p=screen(...a),q=screen(...b);ctx.strokeStyle='#f4e0ad';ctx.lineWidth=Math.max(2,g.tw*.035);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();for(let n=0;n<=5;n++){const x=p[0]+(q[0]-p[0])*n/5,y=p[1]+(q[1]-p[1])*n/5;ctx.beginPath();ctx.moveTo(x,y+g.th*.08);ctx.lineTo(x,y-g.th*.32);ctx.stroke()}}
}

export function drawTerrainMotion(ctx:CanvasRenderingContext2D,g:TerrainGeometry,screen:ScreenProjector,tick:number){
 const river=riverPoints(screen);ctx.save();clipToLand(ctx,screen);
 // Twelve fixed stream markers keep the animation cheap while following every bend.
 for(let n=0;n<12;n++){
  const raw=(n*.37+tick*.012)%1,along=raw*(river.length-1),segment=Math.min(river.length-2,Math.floor(along)),u=along-segment,a=river[segment],b=river[segment+1],x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  const span=g.tw*(.16+(n%3)*.035),wave=Math.sin(tick*.025+n*.8)*g.th*.06,off=((n%3)-1)*g.th*.18+wave;
  ctx.strokeStyle=n%4===0?'#eef8e5bf':'#bce9df9c';ctx.lineWidth=Math.max(1,g.tw*.018);ctx.beginPath();ctx.moveTo(x-tx*span+nx*off,y-ty*span+ny*off);ctx.quadraticCurveTo(x+nx*(off+g.th*.1),y+ny*(off+g.th*.1),x+tx*span+nx*off,y+ty*span+ny*off);ctx.stroke();
 }
 // A pair of short counter-curves at bends reads as a gentle eddy, not noise.
 for(let i=1;i<river.length-1;i+=3){const a=river[i-1],b=river[i],c=river[i+1],dx=c[0]-a[0],dy=c[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;ctx.strokeStyle='#d5f0dc72';ctx.lineWidth=Math.max(1,g.tw*.014);for(const side of[-1,1] as const){const x=b[0]+nx*side*g.tw*.28,y=b[1]+ny*side*g.tw*.28;ctx.beginPath();ctx.arc(x,y,g.tw*(.12+(i%2)*.025),Math.atan2(dy,dx)+side*.6,Math.atan2(dy,dx)+side*2.15);ctx.stroke()}}
 ctx.restore();
}

export function drawContinuousTerrain(ctx:CanvasRenderingContext2D,g:TerrainGeometry,screen:ScreenProjector,tick:number,showGrid:boolean){
 drawTerrainBase(ctx,g,screen,showGrid);drawTerrainMotion(ctx,g,screen,tick);
}
