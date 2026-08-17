import type{Cell,BuildingKind,WarningKind}from'./simulation';
import{footprint}from'./simulation';

export type RenderQuality='high'|'balanced'|'low';
export type WarningBadge={kind:WarningKind;symbol:string;color:string};
const WARNING_BADGES:Record<WarningKind,Omit<WarningBadge,'kind'>>={power:{symbol:'⚡!',color:'#d9a900'},water:{symbol:'💧!',color:'#278bc1'},labor:{symbol:'🐈!',color:'#b86542'},road:{symbol:'🛣!',color:'#756554'},input:{symbol:'📦!',color:'#8f596c'}};
export const facilityWarningBadges=(warnings:WarningKind[]):WarningBadge[]=>warnings.map(kind=>({kind,...WARNING_BADGES[kind]}));

export const targetFrameMs=(quality:RenderQuality,interactive=false)=>interactive?16:quality==='low'?36:33;

export const canvasDpr=(cssWidth:number,deviceDpr:number)=>Math.min(Math.max(1,deviceDpr||1),cssWidth<=720?1.5:2);

export function nextRenderQuality(current:RenderQuality,fps:number,mobile:boolean):RenderQuality{
 if(current==='high'&&fps<28)return'balanced';
 if(current==='balanced'&&mobile&&fps<29.5)return'low';
 if(current==='balanced'&&!mobile&&fps<27)return'low';
 if(current==='low'&&!mobile&&fps>30.5)return'balanced';
 if(current==='balanced'&&!mobile&&fps>30.5)return'high';
 return current;
}

export function renderBudget(quality:RenderQuality,population:number){
 const caps={high:{cats:16,carts:4,utilityPulses:3},balanced:{cats:10,carts:3,utilityPulses:2},low:{cats:3,carts:1,utilityPulses:1}} as const;
 const budget=caps[quality];
 return{...budget,cats:Math.min(Math.max(0,Math.floor(population)),budget.cats)};
}

export type RoadTopologyKind='isolated'|'dead-end'|'straight'|'corner'|'t-junction'|'cross';
export type RoadTopology={mask:number;degree:number;kind:RoadTopologyKind;north:boolean;east:boolean;south:boolean;west:boolean};

/** Cardinal road mask: N=1, E=2, S=4, W=8. Pure and shared by both renderers. */
export function cardinalRoadTopology(cell:number,roads:ReadonlySet<number>,width:number,height:number,externalWest=false):RoadTopology{
 const x=cell%width,y=Math.floor(cell/width),north=y>0&&roads.has(cell-width),east=x+1<width&&roads.has(cell+1),south=y+1<height&&roads.has(cell+width),west=x>0&&roads.has(cell-1)||(externalWest&&x===0);
 const mask=(north?1:0)|(east?2:0)|(south?4:0)|(west?8:0),degree=Number(north)+Number(east)+Number(south)+Number(west);
 const kind:RoadTopologyKind=degree===0?'isolated':degree===1?'dead-end':degree===2?((north&&south)||(east&&west)?'straight':'corner'):degree===3?'t-junction':'cross';
 return{mask,degree,kind,north,east,south,west};
}

export function roadFacingDoor(road:number,edgeCell:number,width:number){
 const roadX=road%width,roadY=Math.floor(road/width),cellX=edgeCell%width,cellY=Math.floor(edgeCell/width);
 return{x:(roadX+cellX)/2,y:(roadY+cellY)/2};
}

export type SharedDriveway={anchor:number;kind:BuildingKind;road:number;roadCell:number;roadCenter:{x:number;y:number};edgeCell:number;door:{x:number;y:number};doorGrid:{x:number;y:number}};

/**
 * Selects one short, cardinal driveway for each facility.  The door is on the
 * actual footprint perimeter (not at the footprint centre), so this is safe to
 * share between the canvas and Three renderer.  Ties are resolved by road cell
 * then edge cell, making save/replay renders deterministic.
 */
export function sharedDriveways(grid:ReadonlyArray<Cell>,width:number,height:number):SharedDriveway[]{
 const roads=new Set<number>();
 for(let i=0;i<grid.length;i++)if(grid[i]?.kind==='road')roads.add(i);
 const result:SharedDriveway[]=[];
 for(let anchor=0;anchor<grid.length;anchor++){
  const cell=grid[anchor];
  if(!cell||cell.anchor!==anchor||cell.kind==='road'||cell.kind==='wire'||cell.kind==='pipe')continue;
  const size=footprint(cell.kind),baseX=anchor%width,baseY=Math.floor(anchor/width),cells=Array.from({length:size*size},(_,n)=>baseX+n%size+(baseY+Math.floor(n/size))*width),center={x:baseX+(size-1)/2,y:baseY+(size-1)/2};
  const candidates:{road:number;edgeCell:number;door:{x:number;y:number}}[]=[];
  for(const edgeCell of cells){
   const ex=edgeCell%width,ey=Math.floor(edgeCell/width);
   for(const road of[ex>0?edgeCell-1:-1,ex+1<width?edgeCell+1:-1,ey>0?edgeCell-width:-1,ey+1<height?edgeCell+width:-1]){
    if(road<0||!roads.has(road))continue;
    const rx=road%width,ry=Math.floor(road/width);
    const door={x:rx<ex?ex-.5:rx>ex?ex+.5:ex,y:ry<ey?ey-.5:ry>ey?ey+.5:ey};
    candidates.push({road,edgeCell,door});
   }
  }
  if(!candidates.length)continue;
  candidates.sort((a,b)=>{
   const distance=(candidate:{road:number})=>Math.abs(candidate.road%width-center.x)+Math.abs(Math.floor(candidate.road/width)-center.y);
   return distance(a)-distance(b)||a.road-b.road||a.edgeCell-b.edgeCell;
  });
  const chosen=candidates[0],roadCenter={x:chosen.road%width,y:Math.floor(chosen.road/width)};
  result.push({anchor,kind:cell.kind,road:chosen.road,roadCell:chosen.road,roadCenter,edgeCell:chosen.edgeCell,door:chosen.door,doorGrid:{x:chosen.edgeCell%width,y:Math.floor(chosen.edgeCell/width)}});
 }
 return result;
}

export function routeWithDwell(raw:number,dwell:number){
 const cycle=2+dwell*2,phase=((raw%cycle)+cycle)%cycle;
 if(phase<dwell)return{progress:0,moving:false};
 if(phase<dwell+1)return{progress:phase-dwell,moving:true};
 if(phase<dwell*2+1)return{progress:1,moving:false};
 return{progress:1-(phase-dwell*2-1),moving:true};
}
