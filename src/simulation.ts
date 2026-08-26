export type ResourceKey='coins'|'power'|'water'|'fish'|'catnip'|'feed'|'mineral'|'litter'|'population'|'capacity'|'labor'|'happiness';
export type BuildingKind='road'|'wire'|'pipe'|'fishery'|'field'|'farm'|'plant'|'intake'|'purifier'|'quarry'|'litter'|'feed'|'teahouse'|'dorm'|'hall'|'plaza';
export type WorkPolicy='balanced'|'food';
export type Cell={kind:BuildingKind;age:number;anchor:number;level:number}|null;
export type UtilitySegment={a:number;b:number};
export type UtilityLayers={wire:UtilitySegment[];pipe:UtilitySegment[]};
export type DistrictId='q1'|'q2'|'q3'|'q4';
export type WarningKind='power'|'water'|'labor'|'road'|'input';
export type Diagnostics={powered:boolean;watered:boolean;roaded:boolean;staffed:boolean;online:boolean;input:string;output:string;rate:number;bottleneck:string;warnings:WarningKind[];laborRequired?:number;laborAssigned?:number};
export type State={grid:Cell[];utilities:UtilityLayers;unlockedDistricts:DistrictId[];resources:Record<ResourceKey,number>;rates:Partial<Record<ResourceKey,number>>;diagnostics:Record<number,Diagnostics>;laborUsed:number;tick:number;paused:boolean;speed:number;objective:number;stage:number;stableCycles:number;workPolicy:WorkPolicy;day:number;deliveries:number;lastDispatchTick:number;log:string[]};
export type Mission={stage:number;kicker:string;title:string;brief:string;story:string;reward:string;checks:{label:string;done:boolean}[]};
export type FirstContractGuideStep='wire-starter'|'observe-water'|'complete';
export type TutorialStepId='inspect-starter'|'connect-plant-wire'|'confirm-electricity'|'confirm-clean-water'|'place-fishery'|'connect-fishery'|'catch-fish'|'place-feed'|'connect-feed'|'produce-feed'|'place-quarry'|'connect-quarry'|'mine-ore'|'place-litter'|'connect-litter'|'produce-litter'|'place-dorm'|'place-hall'|'housing-growth'|'plant-catnip'|'run-teahouse'|'build-plaza'|'happiness'|'courier'|'complete';
export const TUTORIAL_STEPS:TutorialStepId[]=['inspect-starter','connect-plant-wire','confirm-electricity','confirm-clean-water','place-hall','place-dorm','housing-growth','place-fishery','connect-fishery','catch-fish','place-feed','connect-feed','produce-feed','place-quarry','connect-quarry','mine-ore','place-litter','connect-litter','produce-litter','plant-catnip','run-teahouse','build-plaza','happiness','courier','complete'];
export type FirstContractGuide={step:FirstContractGuideStep;title:string;instruction:string;requiredTool?:BuildingKind;start:number;end:number;suggestedPurifierAnchor:number;suggestedPurifierCells:number[];powerConnected:boolean;rawWaterConnected:boolean;cleanWaterProduced:boolean};
export const W=32,H=24,EXTERNAL_ROAD=11*W;
export const DISTRICTS:Record<DistrictId,{id:DistrictId;cost:number;minX:number;maxX:number;minY:number;maxY:number;name:string}>= {
 q1:{id:'q1',name:'첫 동네',cost:0,minX:0,maxX:15,minY:0,maxY:11},
 q2:{id:'q2',name:'초원 숲 동네',cost:550,minX:16,maxX:31,minY:0,maxY:11},
 q3:{id:'q3',name:'호수 습지 동네',cost:850,minX:0,maxX:15,minY:12,maxY:23},
 q4:{id:'q4',name:'바다 해안 동네',cost:1200,minX:16,maxX:31,minY:12,maxY:23},
};
const DISTRICT_IDS:DistrictId[]=['q1','q2','q3','q4'];
export function districtForCell(i:number):DistrictId|undefined { const x=i%W,y=Math.floor(i/W); return DISTRICT_IDS.find(id=>{const d=DISTRICTS[id];return x>=d.minX&&x<=d.maxX&&y>=d.minY&&y<=d.maxY}); }
const districtNeighbors:Record<DistrictId,DistrictId[]>={q1:['q2'],q2:['q1','q3'],q3:['q2','q4'],q4:['q3']};
export function isDistrictUnlocked(s:State,id:DistrictId){return s.unlockedDistricts.includes(id);}
export function districtUnlockIssue(s:State,id:DistrictId){if(!DISTRICT_IDS.includes(id))return'존재하지 않는 동네입니다.';if(isDistrictUnlocked(s,id))return'이미 열린 동네입니다.';if(s.deliveries<1)return id==='q2'?'기반 튜토리얼을 모두 끝내면 자동으로 열려요.':'튜토리얼을 모두 끝낸 뒤 냥코인으로 열 수 있어요.';const previous=DISTRICT_IDS[DISTRICT_IDS.indexOf(id)-1];if(!previous||!isDistrictUnlocked(s,previous))return'앞 동네부터 차례로 열어 주세요.';const cost=DISTRICTS[id].cost;if(s.resources.coins<cost)return`동네를 열려면 코인 ${cost}개가 필요해요.`;return'';}
export function unlockDistrict(s:State,id:DistrictId){if(districtUnlockIssue(s,id))return;const n=structuredClone(s);n.unlockedDistricts=[...n.unlockedDistricts,id];n.resources.coins-=DISTRICTS[id].cost;n.log=[`${DISTRICTS[id].name} 열기 · ${DISTRICTS[id].cost}₩`,...n.log].slice(0,8);return n;}
export const BUILDING_KINDS:BuildingKind[]=['road','wire','pipe','fishery','field','farm','plant','intake','purifier','quarry','litter','feed','teahouse','dorm','hall','plaza'];

const RESOURCE_KEYS:ResourceKey[]=['coins','power','water','fish','catnip','feed','mineral','litter','population','capacity','labor','happiness'];
export const COST:Record<BuildingKind,Partial<Record<ResourceKey,number>>>={road:{coins:3},wire:{coins:2},pipe:{coins:2},fishery:{coins:60},field:{coins:16},farm:{coins:28},plant:{coins:90},intake:{coins:55},purifier:{coins:70},quarry:{coins:85},litter:{coins:105},feed:{coins:95},teahouse:{coins:100},dorm:{coins:75},hall:{coins:140},plaza:{coins:120}};
export const LABEL:Record<BuildingKind,string>={road:'냥이 길',wire:'반짝 전선',pipe:'맑은 물관',fishery:'강변 낚시터',field:'캣닢 밭',farm:'냥이 농장',plant:'반짝 발전소',intake:'맑은물 펌프장',purifier:'맑은물 펌프장(옛 저장)',quarry:'모래 원석 채굴장',litter:'화장실 모래 공장',feed:'냥이 사료 공장',teahouse:'냥이 찻집',dorm:'냥이 숙소',hall:'냥이 회관',plaza:'캣타워 광장'};
export const DESC:Record<BuildingKind,string>={road:'바깥 도시와 작업·물류 시설을 잇는 이동망',wire:'시설 아래로도 연결되는 직선 송전망',pipe:'시설 아래로도 연결되는 직선 맑은 물관',fishery:'동쪽 강변에서 전력 1·노동 2로 물고기 4 생산',field:'물 1·노동 1로 캣닢 3 생산',farm:'전력 1·물 2·노동 2로 캣닢 2 생산',plant:'24 전력 용량을 송전망에 공급',intake:'강변에서 전력 2로 맑은 물 18 생산',purifier:'이전 저장의 구형 물 처리 시설을 맑은물 펌프장으로 변환',quarry:'북쪽 산지에서 노동 2로 모래 원석 3 채굴',litter:'원석 3을 공정수로 세척·건조해 위생 모래 3 생산',feed:'물고기 3·노동 3을 사료 3으로 가공',teahouse:'캣닢 2·노동 1로 행복과 생활 수익을 생산',dorm:'LV.1 주택 → LV.2 빌라 → LV.3 아파트 · 실제 고양이 +2/+4/+7',hall:'도시 행정과 행복을 강화하는 메인 회관',plaza:'전력·물·도로·노동 1이 연결되면 행복도 상승'};
export const footprint=(k:BuildingKind)=>['fishery','plant','intake','purifier','quarry','litter','feed','teahouse','dorm','hall','plaza'].includes(k)?2:1;
export const dormResidents=(level:number)=>level>=3?7:level===2?4:2;
export const idx=(x:number,y:number)=>y*W+x;
export function neighbors(i:number){const x=i%W,y=Math.floor(i/W);return[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&a<W&&b>=0&&b<H).map(([a,b])=>idx(a,b));}
export function dragLine(a:number,b:number):number[]{const ax=a%W,ay=Math.floor(a/W),bx=b%W,by=Math.floor(b/W),n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));if(!n)return[a];return Array.from({length:n+1},(_,i)=>idx(Math.round(ax+(bx-ax)*i/n),Math.round(ay+(by-ay)*i/n))).filter((v,i,x)=>i===0||v!==x[i-1]);}
/** A road drag follows a gap-free 4-connected staircase, unlike utility vectors. */
export function roadDragLine(a:number,b:number):number[]{const ax=a%W,ay=Math.floor(a/W),bx=b%W,by=Math.floor(b/W),dx=Math.abs(bx-ax),dy=Math.abs(by-ay),sx=Math.sign(bx-ax),sy=Math.sign(by-ay),path=[a];let x=ax,y=ay,err=dx-dy;while(x!==bx||y!==by){const twice=2*err;if(twice>-dy&&x!==bx){err-=dy;x+=sx;}else if(y!==by){err+=dx;y+=sy;}path.push(idx(x,y));}return path;}
const normalizedPath=(k:BuildingKind,path:number[])=>k==='road'&&path.length>1?roadDragLine(path[0],path[path.length-1]):path;
export function lineBuildCost(k:BuildingKind,path:number[]){const normalized=normalizedPath(k,path),rate=COST[k].coins||0;if(normalized.length<2)return rate;if(k==='road')return (normalized.length-1)*rate;const a=normalized[0],b=normalized[normalized.length-1],ax=a%W,ay=Math.floor(a/W),bx=b%W,by=Math.floor(b/W);return Math.floor(Math.hypot(bx-ax,by-ay)*rate);}
const edgeKey=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function effectiveLineBuildCost(s:State,k:BuildingKind,path:number[]){const normalized=normalizedPath(k,path),full=lineBuildCost(k,normalized);if(k==='road'||normalized.length<2)return full;const existing=new Set<string>();for(const segment of s.utilities[k==='wire'?'wire':'pipe']){const cells=dragLine(segment.a,segment.b);for(let i=1;i<cells.length;i++)existing.add(edgeKey(cells[i-1],cells[i]))}let fresh=0;for(let i=1;i<normalized.length;i++)if(!existing.has(edgeKey(normalized[i-1],normalized[i])))fresh++;return fresh?Math.max(COST[k].coins||1,Math.ceil(full*fresh/(normalized.length-1))):0;}
export function footprintCells(i:number,size:number){const x=i%W,y=Math.floor(i/W);if(x<0||y<0||x+size>W||y+size>H)return[];return Array.from({length:size},(_,dy)=>Array.from({length:size},(_,dx)=>idx(x+dx,y+dy))).flat();}
export function footprintCenter(i:number,size:number){return{x:i%W+(size-1)/2,y:Math.floor(i/W)+(size-1)/2};}

export const RIVER_PATH:readonly(readonly[number,number])[]=[[12.5,-1.4],[11.5,.2],[10.5,1.8],[9,3.5],[8.8,5.8],[9.6,8.4],[10.5,10.8],[11.4,11.4]];
export function riverCenterX(y:number){for(let n=1;n<RIVER_PATH.length;n++){const[ax,ay]=RIVER_PATH[n-1],[bx,by]=RIVER_PATH[n];if(y<=by){const t=Math.max(0,Math.min(1,(y-ay)/(by-ay)));return ax+(bx-ax)*t}}return RIVER_PATH[RIVER_PATH.length-1][0]}
export function isRiverCell(i:number){const x=i%W,y=Math.floor(i/W);return Math.abs(x-riverCenterX(y))<=1.05}
export function isEastRiverbankSite(i:number){const x=i%W,y=Math.floor(i/W);return y<=11&&Math.abs((x+1)-riverCenterX(y+1))<=2.15;}
export const isRiverIntakeSite=isEastRiverbankSite;
export function isMountainQuarrySite(i:number){const x=i%W,y=Math.floor(i/W);return y<=2&&[2,4,9,14].some(mx=>Math.abs(x+1-mx)<=2);}
export function unlockedKinds(stage:number):BuildingKind[]{const base:BuildingKind[]=['road','wire','pipe','plant','intake','dorm','hall','fishery','feed','quarry','litter'];if(stage>=3)base.push('field','farm','teahouse');if(stage>=4)base.push('plaza');return base;}
export function buildIssue(s:State,k:BuildingKind,i:number):string{const size=footprint(k),cells=footprintCells(i,size);if(!unlockedKinds(s.stage).includes(k))return`계약 ${k==='field'||k==='farm'?2:k==='plaza'?4:3}단계에서 해금됩니다.`;if(cells.length!==size*size)return'지도 경계 안쪽에 배치하세요.';if(cells.some(v=>!districtForCell(v)||!isDistrictUnlocked(s,districtForCell(v)!)))return'먼저 해당 지구를 해금하세요.';if(cells.some(v=>s.grid[v]))return'다른 시설이나 선로가 차지한 자리입니다.';if((k==='intake'||k==='fishery')&&!isEastRiverbankSite(i))return k==='fishery'?'낚시터는 동쪽 강변 가까이에 배치해야 합니다.':'맑은물 펌프장은 동쪽 강변 가까이에 배치해야 합니다.';if(k==='quarry'&&!isMountainQuarrySite(i))return'채석장은 북쪽 산기슭의 표시된 광맥에 배치해야 합니다.';const missing=Object.entries(COST[k]).find(([r,v])=>s.resources[r as ResourceKey]<v!);if(missing)return`코인이 ${missing[1]} 필요합니다.`;return'';}
export function canBuild(s:State,k:BuildingKind,i:number){return!buildIssue(s,k,i);}
const touchesKinds=(grid:Cell[],i:number,kinds:BuildingKind[])=>Boolean(grid[i]&&kinds.includes(grid[i]!.kind)||neighbors(i).some(n=>grid[n]&&kinds.includes(grid[n]!.kind)));
/** Segments always join at endpoints; power lines may additionally join at shared path cells. */
export function utilityConnected(grid:Cell[],segments:UtilitySegment[],sources:BuildingKind[],joinCrossings=false){
 const paths=segments.map(s=>dragLine(s.a,s.b)),graph=segments.map(()=>new Set<number>()),owners=new Map<number,number[]>(),own=(cell:number,segment:number)=>owners.set(cell,[...(owners.get(cell)||[]),segment]);
 segments.forEach((s,i)=>{if(joinCrossings)for(const cell of paths[i])own(cell,i);else{own(s.a,i);if(s.b!==s.a)own(s.b,i)}});
 for(const sharing of owners.values())for(let a=0;a<sharing.length;a++)for(let b=a+1;b<sharing.length;b++){graph[sharing[a]].add(sharing[b]);graph[sharing[b]].add(sharing[a])}
 const active=new Set<number>(),queue:number[]=[];segments.forEach((s,i)=>{if(touchesKinds(grid,s.a,sources)||touchesKinds(grid,s.b,sources)||paths[i].some(v=>Boolean(grid[v]&&sources.includes(grid[v]!.kind)))){active.add(i);queue.push(i)}});
 while(queue.length)for(const next of graph[queue.shift()!])if(!active.has(next)){active.add(next);queue.push(next)}
 const served=new Set<number>(),nodes=new Set<number>();for(const i of active){const s=segments[i];nodes.add(s.a);nodes.add(s.b);for(const v of paths[i])served.add(v)}for(const i of nodes){served.add(i);for(const n of neighbors(i))if(grid[n])served.add(n)}return served;
}
export function utilityNetworkCells(grid:Cell[],segments:UtilitySegment[],sources:BuildingKind[]){
 const paths=segments.map(s=>dragLine(s.a,s.b)),graph=segments.map(()=>new Set<number>()),owners=new Map<number,number[]>();
 paths.forEach((path,i)=>path.forEach(cell=>owners.set(cell,[...(owners.get(cell)||[]),i])));for(const sharing of owners.values())for(let a=0;a<sharing.length;a++)for(let b=a+1;b<sharing.length;b++){graph[sharing[a]].add(sharing[b]);graph[sharing[b]].add(sharing[a])}
 const active=new Set<number>(),queue:number[]=[];paths.forEach((path,i)=>{if(path.some(cell=>touchesKinds(grid,cell,sources))){active.add(i);queue.push(i)}});while(queue.length)for(const next of graph[queue.shift()!])if(!active.has(next)){active.add(next);queue.push(next)}
 const cells=new Set<number>();for(const i of active)for(const cell of paths[i])cells.add(cell);return cells;
}
export function roadConnected(grid:Cell[]){const served=new Set<number>(),q:number[]=[];if(grid[EXTERNAL_ROAD]?.kind!=='road')return served;served.add(EXTERNAL_ROAD);q.push(EXTERNAL_ROAD);while(q.length){const i=q.shift()!;for(const n of neighbors(i))if(!served.has(n)&&grid[n]?.kind==='road'){served.add(n);q.push(n)}}for(const i of[...served])for(const n of neighbors(i))if(grid[n]?.kind!=='road')served.add(n);return served;}
export const UTILITY_SERVICE_RADIUS=1;
export function utilityServiceCells(net:Set<number>,radius=UTILITY_SERVICE_RADIUS){
 const served=new Set(net);if(radius<=0)return served;
 for(const cell of net){const x=cell%W,y=Math.floor(cell/W);for(let distance=1;distance<=radius;distance++)for(const [dx,dy] of [[-distance,0],[distance,0],[0,-distance],[0,distance]]){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<W&&ny>=0&&ny<H)served.add(idx(nx,ny));}}
 return served;
}
export function facilityServiceAreaCells(anchor:number,kind:BuildingKind){const area=new Set(footprintCells(anchor,footprint(kind)));for(const cell of [...area])for(const n of neighbors(cell))area.add(n);return [...area];}
export function facilityServed(net:Set<number>,anchor:number,kind:BuildingKind){return facilityServiceAreaCells(anchor,kind).some(i=>net.has(i));}
export function facilityLineLinked(net:Set<number>,anchor:number,kind:BuildingKind){return facilityServed(net,anchor,kind);}
export function build(s:State,k:BuildingKind,i:number){const issue=buildIssue(s,k,i);if(issue)return;const n=structuredClone(s);for(const v of footprintCells(i,footprint(k)))n.grid[v]={kind:k,age:0,anchor:i,level:1};for(const[r,v]of Object.entries(COST[k]))n.resources[r as ResourceKey]-=v!;if(k==='hall')n.resources.capacity=cityCapacity(n.grid,n.stage);n.log=[`${LABEL[k]} 건설 완료.`,...n.log].slice(0,8);return n;}
export function linearBuildIssue(s:State,k:BuildingKind,path:number[]){const normalized=normalizedPath(k,path);if(!['road','wire','pipe'].includes(k)||!normalized.length)return'선형 시설 경로가 필요합니다.';if(k!=='road'&&(normalized.length<2||normalized[0]===normalized[normalized.length-1]))return'시작점에서 다른 칸까지 드래그하세요.';if(!unlockedKinds(s.stage).includes(k))return'아직 해금되지 않은 시설입니다.';if(normalized.some(i=>i<0||i>=W*H))return'지도 경계 안쪽으로 시공하세요.';if(normalized.some(i=>!districtForCell(i)||!isDistrictUnlocked(s,districtForCell(i)!)))return'먼저 해당 지구를 해금하세요.';if(k==='road'&&normalized.some(i=>s.grid[i]&&s.grid[i]!.kind!=='road'))return'도로는 다른 시설을 관통할 수 없습니다.';const cost=effectiveLineBuildCost(s,k,normalized);if(k!=='road'&&!cost)return`같은 ${LABEL[k]} 경로가 이미 설치되어 있습니다.`;if(s.resources.coins<cost)return`건설 자금이 ${cost}₩ 필요합니다.`;return'';}
export function buildLinear(s:State,k:BuildingKind,path:number[]){const normalized=normalizedPath(k,path);if(linearBuildIssue(s,k,normalized))return;const n=structuredClone(s),cost=effectiveLineBuildCost(s,k,normalized);if(k==='road'){for(const i of[...new Set(normalized)])if(!n.grid[i])n.grid[i]={kind:k,age:0,anchor:i,level:1}}else{const layer=k==='wire'?n.utilities.wire:n.utilities.pipe;layer.push({a:normalized[0],b:normalized[normalized.length-1]})}n.resources.coins-=cost;n.log=[`${LABEL[k]} 직선 시공 · 신규 구간 ${cost}₩`,...n.log].slice(0,8);return n;}
export function utilitySegmentsAt(s:State,k:'wire'|'pipe',cell:number){return s.utilities[k].map((segment,index)=>({segment,index})).filter(({segment})=>dragLine(segment.a,segment.b).includes(cell));}
export function bulldozeUtility(s:State,k:'wire'|'pipe',cell:number){const matches=utilitySegmentsAt(s,k,cell);if(!matches.length)return;const n=structuredClone(s),target=matches[matches.length-1],path=dragLine(target.segment.a,target.segment.b);n.utilities[k].splice(target.index,1);const refund=Math.floor(effectiveLineBuildCost(n,k,path)*.35);n.resources.coins+=refund;n.log=[`${LABEL[k]} 선분 철거 · 고유 구간 ${refund}₩ 회수`,...n.log].slice(0,8);return n;}
export const availableLabor=(s:State)=>Math.max(0,Math.floor(s.resources.labor)-Math.floor(s.laborUsed||0));
export const HALL_UPGRADES={2:{coins:105,labor:1,capacity:2},3:{coins:175,labor:1,capacity:2}} as const;
export const DORM_UPGRADES={2:{coins:57,labor:1,residents:2},3:{coins:94,labor:1,residents:3}} as const;
export const isUpgradeableBuilding=(kind:BuildingKind)=>!['road','wire','pipe'].includes(kind);
export function buildingUpgradeRequirement(kind:BuildingKind,nextLevel:2|3){return{coins:Math.ceil((COST[kind].coins||0)*(nextLevel===2?.75:1.25)),labor:1};}
export function buildingUpgradeIssue(s:State,anchor:number){const c=s.grid[anchor];if(!c||c.anchor!==anchor||!isUpgradeableBuilding(c.kind))return'업그레이드 가능한 시설을 선택하세요.';if(c.level>=3)return'최고 레벨입니다.';const d=s.diagnostics[anchor];if(needPower(c.kind)&&!d?.powered)return`${LABEL[c.kind]}에 전력망을 연결하세요.`;if(needWater(c.kind)&&!d?.watered)return`${LABEL[c.kind]}에 맑은 물관을 연결하세요.`;if(needRoad(c.kind)&&!d?.roaded)return`${LABEL[c.kind]}를 바깥 도시 도로에 연결하세요.`;const req=buildingUpgradeRequirement(c.kind,(c.level+1)as 2|3);if(availableLabor(s)<req.labor)return'가용 노동력 1 필요';if(s.resources.coins<req.coins)return`건설 자금 ${req.coins}₩ 필요`;return'';}
export function upgradeBuilding(s:State,anchor:number){if(buildingUpgradeIssue(s,anchor))return;const n=structuredClone(s),c=n.grid[anchor]!,next=(c.level+1)as 2|3,req=buildingUpgradeRequirement(c.kind,next);for(const i of footprintCells(anchor,footprint(c.kind)))if(n.grid[i]?.anchor===anchor)n.grid[i]!.level=next;n.resources.coins-=req.coins;if(c.kind==='hall')n.resources.capacity=cityCapacity(n.grid,n.stage);n.log=[`${LABEL[c.kind]} LV.${next} 업그레이드 · 작업 고양이 1명 즉시 복귀`,...n.log].slice(0,8);return n;}
export const hallUpgradeIssue=(s:State,a:number)=>buildingUpgradeIssue(s,a);
export const upgradeHall=(s:State,a:number)=>upgradeBuilding(s,a);
export const dormUpgradeIssue=(s:State,a:number)=>buildingUpgradeIssue(s,a);
export const upgradeDorm=(s:State,a:number)=>upgradeBuilding(s,a);
export function bulldoze(s:State,i:number){if(i===EXTERNAL_ROAD||!s.grid[i])return s;const n=structuredClone(s),anchor=s.grid[i]!.anchor,k=s.grid[i]!.kind;for(let v=0;v<n.grid.length;v++)if(n.grid[v]?.anchor===anchor)n.grid[v]=null;n.resources.coins+=Math.floor((COST[k].coins||0)*.35);if(k==='hall'){n.resources.capacity=cityCapacity(n.grid,n.stage);n.resources.population=Math.min(n.resources.population,n.resources.capacity);n.resources.labor=Math.min(n.resources.labor,n.resources.population);n.laborUsed=Math.min(n.laborUsed,n.resources.labor)}n.log=[`${LABEL[k]} 철거: 자재 일부를 회수했습니다.`,...n.log].slice(0,8);return n;}
function place(s:State,k:BuildingKind,i:number){for(const v of footprintCells(i,footprint(k)))s.grid[v]={kind:k,age:0,anchor:i,level:1};}
export const initialState=():State=>{const s:State={grid:Array(W*H).fill(null),utilities:{wire:[],pipe:[]},unlockedDistricts:['q1'],resources:{coins:900,power:0,water:0,fish:0,catnip:3,feed:2,mineral:0,litter:2,population:4,capacity:4,labor:4,happiness:58},rates:{},diagnostics:{},laborUsed:0,tick:0,paused:false,speed:1,objective:0,stage:1,stableCycles:0,workPolicy:'balanced',day:1,deliveries:0,lastDispatchTick:-12,log:['감독 먀오: 폭우 뒤 멈춘 강변 기반선을 다시 깨워 주세요.','계약 01 · 발전소에서 맑은물 펌프장으로 전선을 이으세요.']};place(s,'plant',idx(5,4));place(s,'intake',idx(10,3));place(s,'road',EXTERNAL_ROAD);place(s,'road',EXTERNAL_ROAD+1);return s;};
const validSegments=(value:unknown):UtilitySegment[]=>Array.isArray(value)?value.flatMap(v=>{if(!v||typeof v!=='object')return[];const s=v as Record<string,unknown>;return Number.isInteger(s.a)&&Number.isInteger(s.b)&&(s.a as number)>=0&&(s.a as number)<W*H&&(s.b as number)>=0&&(s.b as number)<W*H?[{a:s.a as number,b:s.b as number}]:[]}):[];
const legacySegments=(points:number[])=>{const set=new Set(points),segments:UtilitySegment[]=[];for(const i of points){let linked=false;for(const n of[i+1,i+W])if(set.has(n)&&(n%W>i%W||n===i+W)){segments.push({a:i,b:n});linked=true}if(!linked&&!neighbors(i).some(n=>set.has(n)))segments.push({a:i,b:i})}return segments;};
export function cityCapacity(grid:Cell[],stage=1){const chapter=Math.max(1,Math.min(4,stage))*4,halls=grid.reduce((sum,c,i)=>sum+(c?.kind==='hall'&&c.anchor===i?4+(Math.max(1,Math.min(3,c.level))-1)*2:0),0);return chapter+halls;}
const levelFactor=(level=1)=>level>=3?2:level===2?1.5:1;
export function migrateState(raw:unknown):State{
 const base=initialState();if(!raw||typeof raw!=='object')return base;const saved=raw as Record<string,unknown>;
 if(!Array.isArray(saved.grid)||![20*14,24*18,W*H].includes(saved.grid.length))return base;const savedGrid=saved.grid;
 const sourceW=savedGrid.length===20*14?20:savedGrid.length===24*18?24:W,mapIndex=(value:unknown)=>{if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>=savedGrid.length)return null;const x=value%sourceW,y=Math.floor(value/sourceW);return x<W&&y<H?idx(x,y):null};
 const legacy:{wire:number[];pipe:number[]}={wire:[],pipe:[]},grid:Cell[]=Array(W*H).fill(null),occupiedDistricts=new Set<DistrictId>();
 savedGrid.forEach((value,oldI)=>{const i=mapIndex(oldI);if(i===null||!value||typeof value!=='object')return;const c=value as Record<string,unknown>,savedKind=c.kind as BuildingKind;if(!BUILDING_KINDS.includes(savedKind))return;const age=typeof c.age==='number'&&Number.isFinite(c.age)?Math.max(0,Math.floor(c.age)):0,anchor=mapIndex(c.anchor)??i,kind=savedKind==='purifier'?'intake':savedKind;if(savedKind==='purifier'&&i!==anchor)return;if(kind==='wire'||kind==='pipe'){legacy[kind].push(i);return}const level=typeof c.level==='number'&&Number.isFinite(c.level)?Math.max(1,Math.min(3,Math.floor(c.level))):1;grid[i]={kind,age,anchor,level};const district=districtForCell(i);if(district)occupiedDistricts.add(district);});
 grid[EXTERNAL_ROAD]={kind:'road',age:0,anchor:EXTERNAL_ROAD,level:1};
 const rawUtilities=saved.utilities&&typeof saved.utilities==='object'?saved.utilities as Record<string,unknown>:{},readSegments=(value:unknown):UtilitySegment[]=>Array.isArray(value)?value.flatMap(v=>{if(!v||typeof v!=='object')return[];const segment=v as Record<string,unknown>,a=mapIndex(segment.a),b=mapIndex(segment.b);if(a!==null&&b!==null){const da=districtForCell(a),db=districtForCell(b);if(da)occupiedDistricts.add(da);if(db)occupiedDistricts.add(db);return[{a,b}]}return[]}):[],utilities:UtilityLayers={wire:[...readSegments(rawUtilities.wire),...legacySegments(legacy.wire)],pipe:[...readSegments(rawUtilities.pipe),...legacySegments(legacy.pipe)]};
 const savedResources=saved.resources&&typeof saved.resources==='object'?saved.resources as Record<string,unknown>:{},resources={...base.resources};for(const key of RESOURCE_KEYS){const value=savedResources[key];if(typeof value==='number'&&Number.isFinite(value))resources[key]=key==='happiness'?Math.max(0,Math.min(100,value)):Math.max(0,value)}resources.capacity=cityCapacity(grid,typeof saved.stage==='number'?saved.stage:1);resources.population=Math.min(resources.population,resources.capacity);resources.labor=Math.floor(resources.population);
 const savedRates=saved.rates&&typeof saved.rates==='object'?saved.rates as Record<string,unknown>:{},rates={...base.rates};for(const key of RESOURCE_KEYS){const value=savedRates[key];if(typeof value==='number'&&Number.isFinite(value))rates[key]=Math.max(-1_000_000,Math.min(1_000_000,value))}
 const number=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,Math.floor(value))):fallback,log=Array.isArray(saved.log)?saved.log.filter((v):v is string=>typeof v==='string').slice(0,8):base.log,policy:WorkPolicy=saved.workPolicy==='food'||saved.workPolicy==='balanced'?saved.workPolicy:base.workPolicy;
 for(const cell of [...legacy.wire,...legacy.pipe]){const district=districtForCell(cell);if(district)occupiedDistricts.add(district);}
 const legacyMap:Record<string,DistrictId>={nw:'q1',north:'q2',ne:'q2',sw:'q3',south:'q3',se:'q4'};
 const savedDistricts=Array.isArray(saved.unlockedDistricts)?saved.unlockedDistricts.flatMap(v=>typeof v==='string'?[legacyMap[v]??(DISTRICT_IDS.includes(v as DistrictId)?v as DistrictId:undefined)]:[]).filter((v):v is DistrictId=>Boolean(v)):null;
 const occupied=[...occupiedDistricts]; const maxLegacy=Math.max(-1,...(savedDistricts??[]).map(v=>DISTRICT_IDS.indexOf(v)),...(occupied.map(v=>DISTRICT_IDS.indexOf(v))));
 const unlockedDistricts=DISTRICT_IDS.slice(0,Math.max(1,maxLegacy+1));
 return{...base,grid,utilities,unlockedDistricts,resources,rates,laborUsed:number(saved.laborUsed,0,0,Math.floor(resources.labor)),tick:number(saved.tick,base.tick,0,Number.MAX_SAFE_INTEGER),day:number(saved.day,base.day,1,Number.MAX_SAFE_INTEGER),speed:number(saved.speed,base.speed,1,3),objective:number(saved.objective,base.objective,0,4),stage:number(saved.stage,Math.max(1,number(saved.objective,0,0,4)),1,4),stableCycles:number(saved.stableCycles,0,0,3),deliveries:number(saved.deliveries,0,0,Number.MAX_SAFE_INTEGER),lastDispatchTick:number(saved.lastDispatchTick,-12,-12,Number.MAX_SAFE_INTEGER),workPolicy:policy,paused:typeof saved.paused==='boolean'?saved.paused:base.paused,log};
}
const anchorEntries=(s:State)=>s.grid.map((c,i)=>[c,i]as const).filter(([c,i])=>c&&c.anchor===i)as[NonNullable<Cell>,number][];
const needPower=(k:BuildingKind)=>!['road','wire','pipe','plant','field','quarry'].includes(k);
const needWater=(k:BuildingKind)=>['field','farm','litter','feed','teahouse','dorm','hall','plaza'].includes(k);
const needRoad=(k:BuildingKind)=>!['wire','pipe','plant','intake','purifier'].includes(k);
/** Stable placement hints: utility distance first, grid index as tie-breaker. */
export function suggestedBuildingAnchors(s:State,k:BuildingKind,limit=3){
 const size=footprint(k),network=utilityServiceCells(new Set([
  ...(needPower(k)?utilityNetworkCells(s.grid,s.utilities.wire,['plant']):[]),
  ...(needWater(k)?utilityNetworkCells(s.grid,s.utilities.pipe,['intake']):[]),
 ]));
 const candidates:number[]=[];
 for(let anchor=0;anchor<s.grid.length;anchor++){
  const cells=footprintCells(anchor,size);
  if(cells.length!==size*size||cells.some(i=>s.grid[i]))continue;
  if(cells.some(i=>!districtForCell(i)||!isDistrictUnlocked(s,districtForCell(i)!)))continue;
  if(!unlockedKinds(s.stage).includes(k))continue;
  if((k==='intake'||k==='fishery')&&!isEastRiverbankSite(anchor))continue;
  if(k==='quarry'&&!isMountainQuarrySite(anchor))continue;
  candidates.push(anchor);
 }
 const distance=(anchor:number)=>{if(!network.size)return 0;return Math.min(...footprintCells(anchor,size).map(cell=>{const x=cell%W,y=Math.floor(cell/W);return Math.min(...[...network].map(n=>Math.abs(x-n%W)+Math.abs(y-Math.floor(n/W))))}));};
 return candidates.sort((a,b)=>distance(a)-distance(b)||a-b).slice(0,Math.max(0,Math.floor(limit)));
}
export function suggestedBuildingAnchor(s:State,k:BuildingKind){return suggestedBuildingAnchors(s,k,1)[0];}
const workers:Partial<Record<BuildingKind,number>>={fishery:2,field:1,farm:2,intake:0,purifier:1,quarry:2,litter:2,feed:3,teahouse:1,hall:1,plaza:1};
const powerUse:Partial<Record<BuildingKind,number>>={fishery:1,litter:3,feed:4,teahouse:1,dorm:2,hall:3,plaza:2,farm:1};
const workOrder:Record<WorkPolicy,BuildingKind[]>={balanced:['fishery','field','farm','quarry','litter','feed','teahouse','dorm','hall','plaza'],food:['fishery','feed','field','farm','litter','quarry','teahouse','dorm','hall','plaza']};
const hasKind=(s:State,k:BuildingKind)=>anchorEntries(s).some(([c])=>c.kind===k);
const onlineKind=(s:State,k:BuildingKind)=>anchorEntries(s).some(([c,i])=>c.kind===k&&s.diagnostics[i]?.online);
export const COURIER_ORDER={feed:3,litter:1,reward:90,cooldown:12} as const;
export function firstContractGuide(s:State):FirstContractGuide{
 const plant=anchorEntries(s).find(([c])=>c.kind==='plant')?.[1]??idx(5,4),intake=anchorEntries(s).find(([c])=>c.kind==='intake')?.[1]??idx(10,3);
 const powerNet=utilityConnected(s.grid,s.utilities.wire,['plant'],true),pipeNet=utilityConnected(s.grid,s.utilities.pipe,['intake'],true),intakePowered=facilityServed(powerNet,intake,'intake');
 const cleanWaterProduced=(s.rates.water||0)>0||Boolean(s.diagnostics[intake]?.online&&s.diagnostics[intake]?.rate>0);
 const step:FirstContractGuideStep=s.stage>1?'complete':!intakePowered?'wire-starter':'observe-water';
 const details:Record<FirstContractGuideStep,{title:string;instruction:string;requiredTool?:BuildingKind}>={
  'wire-starter':{title:'발전소에 전선 잇기',instruction:'전선으로 반짝 발전소와 맑은물 펌프장을 연결하세요.',requiredTool:'wire'},
  'observe-water':{title:'맑은 물 확인하기',instruction:'맑은물 펌프장은 전력만 연결하면 맑은 물을 바로 만들어요. 한 교대를 진행해 확인하세요.'},
  'complete':{title:'첫 기반선 완료',instruction:'맑은 물이 준비됐어요. 다음 생활망을 시작하세요.'},
 };
 return{step,...details[step],start:intake,end:intake,suggestedPurifierAnchor:intake,suggestedPurifierCells:footprintCells(intake,2),powerConnected:intakePowered,rawWaterConnected:intakePowered,cleanWaterProduced};
}
export function getTutorialStep(s:State):TutorialStepId{
 const has=(k:BuildingKind)=>hasKind(s,k), online=(k:BuildingKind)=>onlineKind(s,k), guide=firstContractGuide(s);
 if(s.stage===1&&!guide.powerConnected)return has('plant')?'connect-plant-wire':'inspect-starter';
 if(s.stage===1&&!guide.cleanWaterProduced)return'confirm-clean-water';
 if(!has('hall'))return'place-hall'; if(!has('dorm'))return'place-dorm'; if(s.resources.population<6)return'housing-growth';
 if(!has('fishery'))return'place-fishery'; if(!online('fishery'))return'connect-fishery'; if(s.resources.fish<1&&(s.rates.fish||0)<=0)return'catch-fish';
 if(!has('feed'))return'place-feed'; if(!online('feed'))return'connect-feed'; if((s.rates.feed||0)<=0)return'produce-feed';
 if(!has('quarry'))return'place-quarry'; if(!online('quarry'))return'connect-quarry'; if(s.resources.mineral<1&&(s.rates.mineral||0)<=0)return'mine-ore';
 if(!has('litter'))return'place-litter'; if(!online('litter'))return'connect-litter'; if((s.rates.litter||0)<=0)return'produce-litter';
 if(s.stage===1)return'produce-litter';
 if(s.stage===2)return'plant-catnip'; if(!has('farm')&&!has('field'))return'plant-catnip'; if((s.rates.catnip||0)<=0)return'plant-catnip';
 if(s.stage===3)return'run-teahouse'; if(!has('teahouse'))return'run-teahouse'; if(!has('plaza'))return'build-plaza'; if(s.resources.happiness<72)return'happiness'; if(s.deliveries<1)return'courier'; return'complete';
}
export function tutorialRecommendedTools(s:State):BuildingKind[]{const step=getTutorialStep(s),helpers:BuildingKind[]=['road','wire','pipe'];const primary:Partial<Record<TutorialStepId,BuildingKind[]>>={
 'inspect-starter':[], 'connect-plant-wire':['wire'], 'confirm-electricity':['wire'], 'confirm-clean-water':[], 'place-fishery':['fishery'],'connect-fishery':['road','wire'],'catch-fish':['fishery'],'place-feed':['feed'],'connect-feed':['road','wire','pipe'],'produce-feed':['feed'],'place-quarry':['quarry'],'connect-quarry':['road'],'mine-ore':['quarry'],'place-litter':['litter'],'connect-litter':['road','wire','pipe'],'produce-litter':['litter'],'place-dorm':['dorm'],'place-hall':['hall'],'housing-growth':['dorm','hall'],'plant-catnip':['field','farm'],'run-teahouse':['teahouse'],'build-plaza':['plaza'],'happiness':['teahouse','plaza'],'courier':[],'complete':[]};return [...new Set([...(primary[step]||[]),...helpers])];}
export function tutorialCompletion(s:State){const step=getTutorialStep(s);const unlocked:Partial<Record<TutorialStepId,{name:string;help:string}[]>>={'confirm-electricity':[{name:'맑은물 펌프장',help:'전력으로 맑은 물을 만들어요.'}],'produce-feed':[{name:'사료 공장',help:'생선을 냥이 사료로 바꿔요.'}],'produce-litter':[{name:'모래 공장',help:'모래 원석으로 화장실 모래를 만들어요.'}],'plant-catnip':[{name:'초원 숲 동네',help:'기반 튜토리얼 완료 보상으로 새 동네가 무료로 열렸어요!'}],'run-teahouse':[{name:'냥이 찻집',help:'캣닢으로 행복을 올려요.'}],};return{step,unlocked:unlocked[step]||[]};}
export function courierIssue(s:State){if(s.stage<4)return'계약 4단계에서 배송이 열립니다.';const remaining=COURIER_ORDER.cooldown-(s.tick-s.lastDispatchTick);if(remaining>0)return`다음 배송 준비 · ${remaining} tick`;if(s.resources.feed<COURIER_ORDER.feed)return`사료 ${COURIER_ORDER.feed} 필요`;if(s.resources.litter<COURIER_ORDER.litter)return`화장실 모래 ${COURIER_ORDER.litter} 필요`;return'';}
export function fulfillCourier(s:State){if(courierIssue(s))return;const n=structuredClone(s);n.resources.feed-=COURIER_ORDER.feed;n.resources.litter-=COURIER_ORDER.litter;n.resources.coins+=COURIER_ORDER.reward;n.deliveries++;n.lastDispatchTick=n.tick;n.log=[`황혼 배송 ${n.deliveries}회 완료 · ${COURIER_ORDER.reward}₩ 수령`,...n.log].slice(0,8);return n;}
export function getMission(s:State):Mission{
 const has=(k:BuildingKind)=>hasKind(s,k);
 if(s.stage===1){const checks=[{label:'전기·맑은 물 생활망 연결',done:(s.rates.water||0)>0},{label:'회관·숙소와 현재 6마리',done:has('hall')&&has('dorm')&&s.resources.population>=6},{label:'물고기와 사료 준비',done:has('fishery')&&((s.rates.feed||0)>0||s.resources.feed>=2)},{label:'원석과 화장실 모래 준비',done:has('quarry')&&((s.rates.litter||0)>0||s.resources.litter>=2)},{label:'다음 동네를 열 냥코인 모으기',done:s.resources.coins>=DISTRICTS.q2.cost}];return{stage:1,kicker:'CHAPTER 01 · 첫 생활망',title:'기반과 보금자리부터 만들어요',brief:'전기와 맑은 물을 연결한 뒤 회관·숙소로 6마리를 만들고 사료와 화장실 모래를 준비하세요.',story:'먀오 감독이 말해요. “일손을 먼저 늘려야 사료 공장도 힘차게 돌아가!”',reward:'완료 보상 · 다음 동네 해금',checks};}
 if(s.stage===2){const checks=[{label:'초원 숲 동네(q2) 열기',done:isDistrictUnlocked(s,'q2')}];return{stage:2,kicker:'CHAPTER 02 · 첫 확장',title:'냥이 마을을 넓혀요',brief:'모은 냥코인으로 q2를 열어 새 생산 공간을 마련하세요.',story:'보금자리가 든든해졌어요. 이제 다음 땅을 살펴볼 차례예요.',reward:'완료 보상 · 캣닢과 찻집 생산 해금',checks};}
 if(s.stage===3){const checks=[{label:'캣닢 밭·농장 시작',done:has('field')||has('farm')},{label:'찻집 가동',done:has('teahouse')&&onlineKind(s,'teahouse')},{label:'행복도 72 이상',done:s.resources.happiness>=72}];return{stage:3,kicker:'CHAPTER 03 · 캣닢과 행복',title:'캣닢으로 행복을 키워요',brief:'캣닢을 키우고 찻집에서 냥이들과 쉬어 가세요.',story:'배가 부르면 이제 마음도 즐거워야 해요.',reward:'완료 보상 · 광장과 배송 해금',checks};}
 const checks=[{label:'캣타워 광장 짓기',done:has('plaza')},{label:'사료·모래를 꾸준히 준비',done:s.resources.feed>=COURIER_ORDER.feed&&s.resources.litter>=COURIER_ORDER.litter},{label:'황혼 배송 보내기',done:s.deliveries>=1},{label:`자립 상태 유지 ${s.stableCycles}/3`,done:s.stableCycles>=3}];return{stage:4,kicker:'CHAPTER 04 · 광장과 배송',title:'냥토피아를 완성해요',brief:'광장을 만들고 사료와 모래를 꾸준히 준비해 배송을 보내세요.',story:'함께 살고 함께 쉬는 마을이 되었어요.',reward:s.stableCycles>=3?'지구 완성 · 자립 운영 달성':'완료 보상 · 자립 운영',checks};
}
export function step(s:State){if(s.paused)return s;const n=structuredClone(s);n.tick++;n.day=1+Math.floor(n.tick/24);if(n.tick%3!==0){n.grid.forEach(c=>{if(c)c.age++});return n;}
 const facilities=anchorEntries(n),powerNet=utilityConnected(n.grid,n.utilities.wire,['plant'],true),intakePipe=utilityConnected(n.grid,n.utilities.pipe,['intake'],true),cleanPipe=intakePipe,roads=roadConnected(n.grid),cyclePopulation=n.resources.population;n.resources.capacity=cityCapacity(n.grid,n.stage);if(n.resources.population>n.resources.capacity)n.resources.population=Math.max(n.resources.capacity,n.resources.population-1);n.resources.labor=Math.max(0,Math.floor(n.resources.population));n.laborUsed=0;
 const served=(net:Set<number>,i:number,k:BuildingKind)=>facilityServed(net,i,k);
 const powerCapacity=facilities.filter(([c,i])=>c.kind==='plant'&&facilityLineLinked(powerNet,i,c.kind)).reduce((sum,[c])=>sum+24*levelFactor(c.level),0);let powerLeft=powerCapacity,workersLeft=Math.max(0,Math.floor(n.resources.labor));
 const diagnostics:Record<number,Diagnostics>={},warningList=(...values:(WarningKind|false)[])=>values.filter((v):v is WarningKind=>Boolean(v)),record=(i:number,d:Diagnostics)=>{for(let v=0;v<n.grid.length;v++)if(n.grid[v]?.anchor===i)diagnostics[v]=d};
 let rawWater=0,cleanCapacity=0;
 for(const[c,i]of facilities.filter(([x])=>x.kind==='intake')){const powered=served(powerNet,i,c.kind),amount=18*levelFactor(c.level),bottleneck=!powered?'전력망 미연결':powerLeft<2?'전력 용량 부족':'';const online=!bottleneck;if(online){powerLeft-=2;cleanCapacity+=amount}record(i,{powered,watered:true,roaded:true,staffed:true,online,input:'전력 2',output:online?`맑은 물 +${amount}`:'—',rate:online?amount:0,bottleneck:bottleneck||'정상 가동',warnings:warningList(Boolean(bottleneck)&&'power')})}
 let waterLeft=cleanCapacity;const rates:Partial<Record<ResourceKey,number>>={coins:0,power:powerCapacity,water:cleanCapacity,fish:0,catnip:0,feed:0,mineral:0,litter:0,population:0,capacity:0,labor:0};
 const order:BuildingKind[]=[...workOrder[n.workPolicy],'plant','road','wire','pipe'],cycle=Math.floor(n.tick/3);
 for(const kind of order){const matches=facilities.filter(([x])=>x.kind===kind),offset=matches.length?cycle%matches.length:0,ranked=[...matches.slice(offset),...matches.slice(0,offset)];for(const[c,i]of ranked){const pNeed=powerUse[kind]||0,wNeed=needWater(kind)?(kind==='farm'||kind==='feed'||kind==='litter'?2:1):0,lNeed=workers[kind]||0;const plantLinked=kind!=='plant'||facilityLineLinked(powerNet,i,kind);const powered=kind==='plant'?plantLinked:!needPower(kind)||served(powerNet,i,kind);const watered=!needWater(kind)||served(cleanPipe,i,kind);const roaded=!needRoad(kind)||served(roads,i,kind);let inputIssue='';if(kind==='litter'&&n.resources.mineral<3)inputIssue='모래 원석 부족';if(kind==='feed'&&n.resources.fish<3)inputIssue='물고기 원료 부족';if(kind==='teahouse'&&n.resources.catnip<2)inputIssue='캣닢 원료 부족';const staffed=lNeed===0||workersLeft>=lNeed,warnings=warningList((!powered||powerLeft<pNeed)&&'power',(!watered||waterLeft<wNeed)&&'water',!roaded&&'road',!staffed&&'labor',Boolean(inputIssue)&&'input');const bottleneck=!powered?(kind==='plant'?'송전선 미연결':'전력망 미연결'):!watered?'맑은 물관 미연결':!roaded?'도로 접근 없음':powerLeft<pNeed?'전력 용량 부족':waterLeft<wNeed?'맑은 물 용량 부족':inputIssue||(!staffed?`노동력 부족 · ${lNeed}명 필요`:'');const online=!bottleneck;let input='—',output='—',rate=0;if(online){powerLeft-=pNeed;waterLeft-=wNeed;workersLeft-=lNeed;const factor=levelFactor(c.level),gain=(base:number)=>base*factor;if(kind==='field'){const amount=gain(3);n.resources.catnip+=amount;rates.catnip=(rates.catnip||0)+amount;input='물 1 · 노동 1';output=`캣닢 +${amount}`;rate=amount;}if(kind==='farm'){const catnip=gain(2);n.resources.catnip+=catnip;rates.catnip=(rates.catnip||0)+catnip;input='전력 1 · 물 2 · 노동 2';output=`캣닢 +${catnip}`;rate=catnip;}if(kind==='quarry'){const amount=gain(3);n.resources.mineral+=amount;rates.mineral=(rates.mineral||0)+amount;input='산지 광맥 · 노동 2';output=`모래 원석 +${amount}`;rate=amount;}if(kind==='litter'){const litter=gain(3);n.resources.mineral-=3;n.resources.litter+=litter;rates.mineral=(rates.mineral||0)-3;rates.litter=(rates.litter||0)+litter;input='원석 3 · 전력 3 · 물 2 · 노동 2';output=`위생 모래 +${litter}`;rate=litter;}if(kind==='fishery'){const amount=gain(4);n.resources.fish+=amount;rates.fish=(rates.fish||0)+amount;input='전력 1 · 노동 2';output=`물고기 +${amount}`;rate=amount;}if(kind==='feed'){const feed=gain(3);n.resources.fish-=3;n.resources.feed+=feed;rates.feed=(rates.feed||0)+feed;input='물고기 3 · 전력 4 · 물 2';output=`사료 +${feed}`;rate=feed;}if(kind==='teahouse'){const coins=gain(3),happy=gain(6);n.resources.catnip-=2;n.resources.coins+=coins;rates.catnip=(rates.catnip||0)-2;rates.coins=(rates.coins||0)+coins;input='캣닢 2 · 전력 1 · 물 1';output=`행복 +${happy} · ${coins}₩`;rate=happy;}if(kind==='plaza'){const happy=gain(9);input='전력 1 · 물 1 · 외부도로';output=`공공 행복 +${happy}`;rate=happy;}if(kind==='dorm'){input='전력 2 · 물 1 · 외부도로';output=`이주 정원 +${dormResidents(c.level)}`;rate=dormResidents(c.level);}if(kind==='hall'){const happy=gain(4),maxCats=4+(c.level-1)*2;input='전력 3 · 물 1 · 노동 1';output=`MAX +${maxCats} · 행정 행복 +${happy}`;rate=happy;}}
  const d={powered,watered,roaded,staffed,online,input,output,rate,bottleneck:bottleneck||'정상 가동',warnings,laborRequired:lNeed,laborAssigned:online?lNeed:0};for(let v=0;v<n.grid.length;v++)if(n.grid[v]?.anchor===i)diagnostics[v]=d;
 }}
 const foodDemand=Math.max(1,Math.ceil(n.resources.population/4)),foodAvailable=n.resources.feed>=foodDemand;if(foodAvailable)n.resources.feed-=foodDemand;const litterDemand=n.stage>=3?Math.max(1,Math.ceil(n.resources.population/6)):0,litterAvailable=n.stage<3||n.resources.litter>=litterDemand;if(n.stage>=3&&litterAvailable)n.resources.litter-=litterDemand;
 const onlineDorms=facilities.filter(([c,i])=>c.kind==='dorm'&&diagnostics[i]?.online),dorms=onlineDorms.length,residentSlots=onlineDorms.reduce((sum,[c])=>sum+dormResidents(c.level),0),plazaHappiness=facilities.filter(([c,i])=>c.kind==='plaza'&&diagnostics[i]?.online).reduce((sum,[c])=>sum+9*levelFactor(c.level),0),targetPop=dorms>0?Math.min(n.resources.capacity,4+residentSlots):4,allocatedLabor=Math.max(0,Math.floor(n.resources.labor)-workersLeft);if(targetPop>n.resources.population)n.resources.population=Math.min(targetPop,n.resources.population+1);else if(targetPop<n.resources.population){const nextPopulation=Math.max(targetPop,n.resources.population-1);if(allocatedLabor<=nextPopulation)n.resources.population=nextPopulation}rates.population=n.resources.population-cyclePopulation;n.resources.labor=Math.max(0,Math.floor(n.resources.population));n.laborUsed=allocatedLabor;rates.labor=-n.laborUsed;
 const teaHappiness=facilities.filter(([c,i])=>c.kind==='teahouse'&&diagnostics[i]?.online).reduce((sum,[c])=>sum+6*levelFactor(c.level),0),hallHappiness=facilities.filter(([c,i])=>c.kind==='hall'&&diagnostics[i]?.online).reduce((sum,[c])=>sum+4*levelFactor(c.level),0),productionKinds=['field','farm','quarry','litter','fishery','feed','teahouse'],onlineProduction=facilities.filter(([c,i])=>productionKinds.includes(c.kind)&&diagnostics[i]?.online).length,productionTotal=facilities.filter(([c])=>productionKinds.includes(c.kind)).length,supplyRatio=productionTotal?onlineProduction/productionTotal:0;n.resources.happiness=Math.round(Math.max(0,Math.min(100,42+plazaHappiness+teaHappiness+hallHappiness+dorms*3+supplyRatio*18+(foodAvailable?8:-12)+(litterAvailable?6:-10)-(powerCapacity?0:8)-(cleanCapacity?0:8))));const income=Math.floor(n.resources.population*.5+Math.max(0,n.resources.feed-4)*.5);n.resources.coins+=income;rates.coins=(rates.coins||0)+income;n.resources.power=powerLeft;n.resources.water=waterLeft;n.rates=rates;n.diagnostics=diagnostics;
 const previousStage=n.stage;if(previousStage===1&&powerCapacity>0&&cleanCapacity>0&&hasKind(n,'hall')&&dorms>0&&n.resources.population>=6&&onlineKind(n,'fishery')&&(rates.feed||0)>0&&(rates.litter||0)>0){n.stage=2;if(!n.unlockedDistricts.includes('q2'))n.unlockedDistricts.push('q2');n.log=['축하해요! 기본생활 튜토리얼을 마쳐 초원 숲 동네가 무료로 열렸어요.',...n.log].slice(0,8)}else if(previousStage===2&&n.unlockedDistricts.includes('q2')&&hasKind(n,'hall')&&dorms>0&&n.resources.population>=6)n.stage=3;else if(previousStage===3&&hasKind(n,'teahouse')&&onlineKind(n,'teahouse')&&hasKind(n,'plaza'))n.stage=4;if(n.stage===4){const selfSufficient=n.resources.population>=10&&n.resources.happiness>=72&&n.resources.feed>=2&&n.resources.litter>=2;n.stableCycles=selfSufficient?Math.min(3,n.stableCycles+1):0;}if(n.stage>previousStage){n.resources.capacity=cityCapacity(n.grid,n.stage);n.log=[`계약 ${String(previousStage).padStart(2,'0')} 완료 · 새 시설이 해금되었습니다.`,...n.log].slice(0,8)};const mission=getMission(n);n.objective=mission.checks.filter(c=>c.done).length;if(n.stage===4&&n.stableCycles===3&&!n.log[0]?.includes('완성'))n.log=['지구 완성: 생산과 생활이 균형을 이뤘습니다!',...n.log].slice(0,8);return n;
}

export type CitizenTipKind='power'|'water'|'food'|'litter'|'happiness'|'healthy';
export type CitizenTip={kind:CitizenTipKind;icon:string;color:string;message:string;action:string};
const CITIZEN_TIPS:Record<CitizenTipKind,Omit<CitizenTip,'kind'>>={
 power:{icon:'⚡',color:'#d99b32',message:'정전이 자주 발생해 ㅠㅠ',action:'전선을 잇거나 발전량을 늘려 줘!'},
 water:{icon:'💧',color:'#3b9bc5',message:'물이 잘 안 나와 ㅠㅠ',action:'펌프장과 물관을 이어 줘!'},
 food:{icon:'🐟',color:'#d97855',message:'사료가 모자라 배고파 ㅠㅠ',action:'낚시터와 사료 공장을 살펴봐 줘!'},
 litter:{icon:'🧺',color:'#799b82',message:'화장실 모래가 부족해 ㅠㅠ',action:'원석을 캐서 모래 공장을 돌려 줘!'},
 happiness:{icon:'🌳',color:'#69a65f',message:'공원이 있으면 좋겠다냥',action:'캣타워 광장이나 찻집이 행복을 올려 줘!'},
 healthy:{icon:'🐾',color:'#c58a45',message:'우리 마을 정말 살기 좋다냥!',action:'전기와 물도 잘 나오고 모두 행복해!'},
};
/** Stable priority order shared by canvas and Three renderers. */
export function deriveCitizenTips(s:State):CitizenTip[]{
 const diagnostics=Object.values(s.diagnostics),hasWarning=(kind:WarningKind)=>diagnostics.some(d=>d.warnings.includes(kind)),tips:CitizenTipKind[]=[];
 if((s.rates.power||0)<=0||hasWarning('power'))tips.push('power');
 if((s.rates.water||0)<=0||hasWarning('water'))tips.push('water');
 if(s.resources.feed<Math.max(1,Math.ceil(s.resources.population/4)))tips.push('food');
 if(s.stage>=3&&s.resources.litter<Math.max(1,Math.ceil(s.resources.population/6)))tips.push('litter');
 if(s.resources.happiness<72)tips.push('happiness');
 if(!tips.length)tips.push('healthy');
 return tips.map(kind=>({kind,...CITIZEN_TIPS[kind]}));
}

/** Re-evaluate connection and bottleneck diagnostics without advancing or consuming the saved game. */
export function refreshDiagnostics(s:State){const source=structuredClone(s),probe=structuredClone(s);probe.paused=false;probe.tick=Math.floor(probe.tick/3)*3+2;const evaluated=step(probe);source.diagnostics=evaluated.diagnostics;return source;}
