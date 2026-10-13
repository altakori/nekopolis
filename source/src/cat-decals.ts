export type CatDecalStyle='face'|'paw';

const rounded=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};

export function drawCatDecal(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,style:CatDecalStyle='face',accent='#f2c86f'){
 ctx.save();ctx.translate(x,y);const s=Math.max(8,size),ink='#4c3b35',paper='#fff1cf';ctx.lineCap='round';ctx.lineJoin='round';
 rounded(ctx,-s*.5,-s*.5,s,s,s*.18);ctx.fillStyle='#173d3dcc';ctx.fill();ctx.strokeStyle=paper;ctx.lineWidth=Math.max(1,s*.045);ctx.stroke();
 if(style==='paw'){
  ctx.fillStyle=accent;ctx.strokeStyle=ink;ctx.lineWidth=Math.max(1,s*.035);ctx.beginPath();ctx.ellipse(0,s*.12,s*.21,s*.17,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(const [px,py]of[[-.24,-.12],[-.08,-.24],[.1,-.24],[.26,-.1]] as const){ctx.beginPath();ctx.ellipse(s*px,s*py,s*.09,s*.11,0,0,Math.PI*2);ctx.fill();ctx.stroke()}
 }else{
  ctx.fillStyle=accent;ctx.strokeStyle=ink;ctx.lineWidth=Math.max(1,s*.035);ctx.beginPath();ctx.moveTo(-s*.34,-s*.05);ctx.lineTo(-s*.28,-s*.34);ctx.lineTo(-s*.08,-s*.22);ctx.quadraticCurveTo(0,-s*.31,s*.08,-s*.22);ctx.lineTo(s*.28,-s*.34);ctx.lineTo(s*.34,-s*.05);ctx.quadraticCurveTo(s*.36,s*.29,0,s*.34);ctx.quadraticCurveTo(-s*.36,s*.29,-s*.34,-s*.05);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#253b38';for(const ex of[-.12,.12]){ctx.beginPath();ctx.ellipse(s*ex,-s*.03,s*.035,s*.06,0,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#d77872';ctx.beginPath();ctx.moveTo(-s*.045,s*.07);ctx.lineTo(s*.045,s*.07);ctx.lineTo(0,s*.12);ctx.closePath();ctx.fill();
  ctx.strokeStyle=paper;ctx.lineWidth=Math.max(1,s*.025);for(const side of[-1,1] as const)for(const dy of[-.025,.045]){ctx.beginPath();ctx.moveTo(side*s*.08,s*(.1+dy));ctx.lineTo(side*s*.35,s*(.06+dy));ctx.stroke()}
  ctx.fillStyle='#d76d62';ctx.beginPath();ctx.moveTo(-s*.19,s*.25);ctx.lineTo(0,s*.17);ctx.lineTo(s*.19,s*.25);ctx.lineTo(0,s*.34);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}

export function createCatDecalCanvas(style:CatDecalStyle='face',accent='#f2c86f',size=128){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;drawCatDecal(ctx,size/2,size/2,size*.92,style,accent);return canvas;}
