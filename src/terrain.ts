export type TerrainGeometry={tw:number;th:number};
export type ScreenProjector=(x:number,y:number)=>readonly[number,number];

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

export function drawContinuousTerrain(ctx:CanvasRenderingContext2D,g:TerrainGeometry,screen:ScreenProjector,tick:number,showGrid:boolean){
 const top=screen(-.55,-.55),right=screen(20.55,-.55),bottom=screen(20.55,14.55),left=screen(-.55,14.55);
 const land=ctx.createLinearGradient(top[0],top[1],bottom[0],bottom[1]);land.addColorStop(0,'#56745b');land.addColorStop(.46,'#355f4e');land.addColorStop(1,'#264b42');
 // A single continuous landmass, including a softly lit visible cliff edge.
 ctx.fillStyle='#142f32';ctx.beginPath();ctx.moveTo(left[0],left[1]);ctx.lineTo(bottom[0],bottom[1]);ctx.lineTo(bottom[0],bottom[1]+g.th*1.35);ctx.lineTo(left[0],left[1]+g.th*1.35);ctx.closePath();ctx.fill();
 ctx.fillStyle=land;ctx.beginPath();ctx.moveTo(top[0],top[1]);ctx.lineTo(right[0],right[1]);ctx.lineTo(bottom[0],bottom[1]);ctx.lineTo(left[0],left[1]);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#72917a66';ctx.lineWidth=1.5;ctx.stroke();

 // Broad painterly grass and soil patches break the repeated tile rhythm.
 const patches:[[number,number],number,number,string][]=[[[5.2,3.5],2.5,1.15,'#6e80554d'],[[7.4,10.2],3.2,1.25,'#77734a47'],[[12.5,7.1],2.7,1.2,'#2e695955'],[[3.2,8.4],2.15,.9,'#78926238']];
 for(const[[x,y],rx,ry,color]of patches){const[pX,pY]=screen(x,y);ellipse(ctx,pX,pY,g.tw*rx*.5,g.th*ry,color)}

 // The construction grid is a tool overlay, not the terrain texture.
 ctx.save();ctx.globalAlpha=showGrid?.22:.035;ctx.strokeStyle='#c5e3ca';ctx.lineWidth=showGrid?1:.6;
 for(let x=0;x<=20;x++){const a=screen(x,0),b=screen(x,14);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
 for(let y=0;y<=14;y++){const a=screen(0,y),b=screen(20,y);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}ctx.restore();

 // One continuous river: deep bank shadow, earth bank, water body, current and foam.
 const riverWorld:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[[19,-1],[15.4,1.1],[14.2,3.2],[15.6,5.7],[14.1,8.5],[14.7,14.8]];
 const river=riverWorld.map(([x,y])=>screen(x,y));
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 pathThrough(ctx,river);ctx.strokeStyle='#173b3d99';ctx.lineWidth=g.tw*2.3;ctx.stroke();
 pathThrough(ctx,river);ctx.strokeStyle='#a7895e';ctx.lineWidth=g.tw*2.05;ctx.stroke();
 const water=ctx.createLinearGradient(river[0][0],river[0][1]-g.th,river[0][0],river[0][1]+g.th);water.addColorStop(0,'#2d8792');water.addColorStop(.5,'#17677d');water.addColorStop(1,'#0c445d');
 pathThrough(ctx,river);ctx.strokeStyle=water;ctx.lineWidth=g.tw*1.72;ctx.stroke();
 for(let lane=-1;lane<=1;lane++){
  const shifted=river.map(([x,y],i)=>[x+Math.sin(tick*.045+i*1.7+lane)*g.tw*.08,y+lane*g.th*.36]as const);
  pathThrough(ctx,shifted);ctx.strokeStyle=lane===0?'#99e2da88':'#d4f4df42';ctx.lineWidth=Math.max(1.2,g.tw*.025);ctx.setLineDash([g.tw*.45,g.tw*.34]);ctx.lineDashOffset=-tick*(1.1+lane*.12);ctx.stroke();
 }
 ctx.setLineDash([]);
 // Bank reeds and stone clusters use curved forms rather than square sprites.
 for(let i=0;i<river.length-1;i++)for(const side of[-1,1]){const[x,y]=river[i+1];const ox=side*g.tw*(.82+(i%2)*.08),oy=side*g.th*.55;ctx.strokeStyle=side>0?'#9fb55f':'#718c54';ctx.lineWidth=1.4;for(let r=0;r<4;r++){ctx.beginPath();ctx.moveTo(x+ox+r*3,y+oy);ctx.quadraticCurveTo(x+ox+r*3-2,y+oy-g.th*.35,x+ox+r*3+1,y+oy-g.th*.6);ctx.stroke()}}
 ctx.restore();

 // Layered mountain clusters sit on the far edge and span several cells.
 const mountain=(wx:number,wy:number,scale:number,back=false)=>{const[x,y]=screen(wx,wy),w=g.tw*1.35*scale,h=g.th*5.1*scale;
  ellipse(ctx,x,y+g.th*.15,w*.9,g.th*.75*scale,back?'#263f3a':'#315346');
  const rock=ctx.createLinearGradient(x-w,y-h,x+w,y);rock.addColorStop(0,back?'#66756d':'#7f806b');rock.addColorStop(.48,back?'#455f58':'#58685a');rock.addColorStop(1,'#293f3d');
  ctx.fillStyle=rock;ctx.beginPath();ctx.moveTo(x-w,y);ctx.quadraticCurveTo(x-w*.48,y-h*.38,x-w*.12,y-h);ctx.quadraticCurveTo(x+w*.28,y-h*.58,x+w,y);ctx.closePath();ctx.fill();
  ctx.fillStyle=back?'#8a958766':'#b7b29688';ctx.beginPath();ctx.moveTo(x-w*.13,y-h);ctx.quadraticCurveTo(x-w*.02,y-h*.66,x+w*.28,y-h*.42);ctx.lineTo(x+w*.62,y-g.th*.16);ctx.quadraticCurveTo(x+w*.18,y-h*.28,x-w*.13,y-h);ctx.fill();
  ctx.strokeStyle='#d5caa05c';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-w*.13,y-h);ctx.quadraticCurveTo(x-w*.42,y-h*.52,x-w*.62,y-g.th*.15);ctx.stroke();
  for(let n=0;n<5;n++){const tx=x-w*.7+n*w*.34,ty=y-g.th*(.05+(n%2)*.18);ellipse(ctx,tx,ty,g.tw*.16*scale,g.th*.3*scale,n%2?'#315a42':'#3d6948');ellipse(ctx,tx-g.tw*.07,ty-g.th*.2,g.tw*.13*scale,g.th*.25*scale,'#5f8656')}
 };
 mountain(2.2,1.1,.9,true);mountain(4.1,1.2,.68,true);mountain(8.1,.55,.52,true);

 // Deterministic mid-scale vegetation and rocks give the landscape scale.
 const trees:[[number,number],number][]=[[[1.3,5.8],1],[[3.2,6.2],.8],[[10.8,2.4],.8],[[16.6,5.8],1],[[17.4,7.2],.75],[[2.4,12.6],.75],[[11.8,12.4],.85]];
 for(const[[wx,wy],scale]of trees){const[x,y]=screen(wx,wy);ctx.fillStyle='#263a34';ctx.fillRect(x-g.tw*.025,y-g.th*.48,g.tw*.05,g.th*.5);ellipse(ctx,x,y-g.th*.58,g.tw*.24*scale,g.th*.55*scale,'#315e45');ellipse(ctx,x-g.tw*.13,y-g.th*.72,g.tw*.2*scale,g.th*.4*scale,'#4f7d52');ellipse(ctx,x+g.tw*.13,y-g.th*.66,g.tw*.18*scale,g.th*.37*scale,'#70915a')}
 const rocks:[[number,number],number][]=[[[5.1,12.3],.6],[[14.4,4.4],.8],[[9.8,5.5],.5],[[18,12.2],.65]];
 for(const[[wx,wy],scale]of rocks){const[x,y]=screen(wx,wy);ctx.fillStyle='#829082';ctx.beginPath();ctx.moveTo(x-g.tw*.18*scale,y);ctx.quadraticCurveTo(x-g.tw*.1*scale,y-g.th*.5*scale,x,y-g.th*.55*scale);ctx.quadraticCurveTo(x+g.tw*.2*scale,y-g.th*.32*scale,x+g.tw*.22*scale,y);ctx.closePath();ctx.fill();ctx.strokeStyle='#c0b99666';ctx.stroke()}
}
