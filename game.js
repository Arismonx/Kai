(() => {
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'chickenFarm.v1';
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,a=0,b=100) => Math.max(a,Math.min(b,v));

/* ---------- state ---------- */
const PICK_SEC = [14,8,4];
const MAX_FLOCK = 5, GROW_SEC = 300, HATCH_SEC = 90, HATCH_EGGS = 3;
const defaults = () => ({
  coins: 20, grain: 8, eggs: 0, goldEggs: 0,
  hunger: 80, happy: 80, clean: 100,
  xp: 0, level: 1,
  eggTimer: 0,
  up: { feeder:0, coop:0, toy:0, soap:0, dog:0, picker:0 },
  hats: ['none'], hat: 'none',
  feederTimer: 0,
  flock: [{id:1, name:'ไก่กลม', color:'gold', born:0}],
  nextId: 2,
  colors: ['gold'],
  incub: null,
  gear: {}, pulls: 0, pity: 0,
  playerId: '', nick: '', lbHint: false,
  lastSeen: Date.now(),
  totalEggs: 0, totalPets: 0, enemiesBeaten: 0
});
let S = load();
function load(){
  try{
    const o = JSON.parse(localStorage.getItem(SAVE_KEY));
    if(o) return Object.assign(defaults(), o, {up:Object.assign(defaults().up, o.up)});
  }catch(e){}
  return defaults();
}
let resetting=false;
function save(){
  if(resetting) return;
  S.lastSeen = Date.now();
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){}
}

/* ---------- data ---------- */
const TITLES = ['ลูกไก่จอมกลม','ไก่กลมตัวน้อย','ไก่กลมจอมกิน','ไก่ฟาร์มสุดฮอต','ไก่กลมระดับเทพ','ราชาไก่กลม','ไก่กลมจักรวาล'];
/* growth stages by level. sz = share of the max on-screen size (kept under the farm-size cap) */
const STAGES = [
  {lv:1,  n:'ไก่จิ๋ว',               sz:.32},
  {lv:3,  n:'ไก่เล็ก',               sz:.4},
  {lv:6,  n:'ไก่ปกติ',               sz:.5},
  {lv:10, n:'ไก่ยักษ์',              sz:.62},
  {lv:15, n:'ไก่ใหญ่เท่าภูเขา',      sz:.72},
  {lv:20, n:'ไก่ใหญ่เท่าโลก',        sz:.82, sky:'earth',  glow:'#7cf', ic:'🌍'},
  {lv:30, n:'ไก่ใหญ่เท่าระบบสุริยะ', sz:.89, sky:'solar',  glow:'#fc6', ic:'☀️🪐🌍'},
  {lv:40, n:'ไก่ใหญ่เท่ากาแล็กซี',   sz:.95, sky:'galaxy', glow:'#d9f', ic:'🌌'},
  {lv:50, n:'ไก่ใหญ่เท่าจักรวาล',    sz:1,   sky:'cosmos', glow:'#fff', ic:'🌌✨🌠'},
];
const stageOf = lv => STAGES.reduce((r,s,i)=>lv>=s.lv?i:r,0);
function levelFrac(lv){
  const i=stageOf(lv), a=STAGES[i], b=STAGES[i+1];
  return b ? a.sz + (b.sz-a.sz)*(lv-a.lv)/(b.lv-a.lv) : a.sz;
}
const xpNeed = lv => 40 + lv*35;
const HATS = [
  {id:'none', ic:'🚫', name:'ไม่ใส่หมวก', price:0},
  {id:'🎩', ic:'🎩', name:'หมวกทรงสูง', price:60},
  {id:'👑', ic:'👑', name:'มงกุฎ', price:200},
  {id:'🎀', ic:'🎀', name:'โบว์', price:40},
  {id:'🧢', ic:'🧢', name:'หมวกแก๊ป', price:50},
  {id:'🌸', ic:'🌸', name:'ดอกไม้', price:30},
  {id:'🎓', ic:'🎓', name:'หมวกบัณฑิต', price:120},
];
/* gacha costumes: worn per chicken, every worn piece adds its bonus (duplicates level it up to Lv.3: +50% each) */
const SLOTS = {hat:'หมวก', face:'หน้า', neck:'คอ', back:'หลัง'};
const RARITY = {c:{n:'ธรรมดา',col:'#8a8a8a'}, r:{n:'หายาก',col:'#3b82f6'}, e:{n:'หายากมาก',col:'#a855f7'}, l:{n:'ตำนาน',col:'#f59e0b'}};
const STAT = {egg:'ไข่ออกเร็ว', coin:'เหรียญจากขายไข่/ศัตรู', xp:'XP', gold:'โอกาสไข่ทอง', hunger:'หิวช้าลง', happy:'สุขลดช้าลง', clean:'สกปรกช้าลง', guard:'โอกาสแตะไล่ศัตรูแรง x2'};
const STAT_CAP = {egg:1, coin:1, xp:1, gold:.2, hunger:.5, happy:.5, clean:.5, guard:.6};
const PULL1 = 100, PULL10 = 900, PITY = 30;
const GEAR = [
  {id:'🪖',slot:'hat', n:'หมวกเหล็ก',      r:'c', fx:{guard:.05}},
  {id:'👒',slot:'hat', n:'หมวกฟาง',        r:'c', fx:{xp:.04}},
  {id:'⛑️',slot:'hat', n:'หมวกนิรภัย',     r:'c', fx:{clean:.05}},
  {id:'🤠',slot:'hat', n:'หมวกคาวบอย',     r:'r', fx:{coin:.07}},
  {id:'🎅',slot:'hat', n:'หมวกซานต้า',     r:'r', fx:{egg:.07}},
  {id:'🦄',slot:'hat', n:'หมวกยูนิคอร์น',  r:'e', fx:{egg:.08,gold:.02}},
  {id:'🌟',slot:'hat', n:'มงกุฎดาว',       r:'l', fx:{egg:.15,xp:.1}},
  {id:'👓',slot:'face',n:'แว่นตา',         r:'c', fx:{xp:.04}},
  {id:'🕶️',slot:'face',n:'แว่นดำ',         r:'c', fx:{coin:.04}},
  {id:'🥽',slot:'face',n:'แว่นดำน้ำ',      r:'c', fx:{clean:.05}},
  {id:'🎭',slot:'face',n:'หน้ากากละคร',    r:'r', fx:{gold:.015,egg:.04}},
  {id:'🔍',slot:'face',n:'แว่นขยาย',       r:'r', fx:{xp:.07}},
  {id:'🧿',slot:'face',n:'ตาทิพย์',        r:'e', fx:{gold:.04,coin:.08}},
  {id:'🔮',slot:'face',n:'ลูกแก้ววิเศษ',   r:'l', fx:{gold:.08,coin:.12}},
  {id:'🧣',slot:'neck',n:'ผ้าพันคอ',       r:'c', fx:{happy:.04}},
  {id:'🔔',slot:'neck',n:'กระดิ่ง',        r:'c', fx:{guard:.05}},
  {id:'📿',slot:'neck',n:'สร้อยลูกปัด',    r:'r', fx:{coin:.07}},
  {id:'🏅',slot:'neck',n:'เหรียญรางวัล',   r:'r', fx:{xp:.07}},
  {id:'💎',slot:'neck',n:'เพชร',           r:'e', fx:{gold:.04,egg:.06}},
  {id:'🏆',slot:'neck',n:'ถ้วยทอง',        r:'l', fx:{egg:.12,coin:.12}},
  {id:'🎒',slot:'back',n:'กระเป๋าเป้',     r:'c', fx:{hunger:.05}},
  {id:'🧸',slot:'back',n:'ตุ๊กตาหมี',      r:'c', fx:{happy:.04}},
  {id:'🦋',slot:'back',n:'ปีกผีเสื้อ',     r:'r', fx:{happy:.07}},
  {id:'🛡️',slot:'back',n:'โล่',            r:'r', fx:{guard:.1}},
  {id:'🚀',slot:'back',n:'จรวด',           r:'e', fx:{egg:.1}},
  {id:'🌈',slot:'back',n:'สายรุ้ง',        r:'e', fx:{happy:.08,hunger:.06}},
  {id:'🔥',slot:'back',n:'ออร่าไฟ',        r:'l', fx:{egg:.1,xp:.1,guard:.15}},
];
const GMAP = Object.fromEntries(GEAR.map(g=>[g.id,g]));
const gearLv = id => Math.min(3, S.gear[id]||0);
const gearMul = id => 1 + .5*(gearLv(id)-1);
const gearDesc = g => Object.entries(g.fx).map(([k,v])=>`${STAT[k]} +${Math.round(v*gearMul(g.id)*100)}%`).join(' · ');
const UPS = {
  feeder:{ic:'🤖',name:'เครื่องให้อาหารอัตโนมัติ',desc:l=>`ให้อาหารเองทุก ${Math.max(20,90-(l+1)*15)} วิ (ใช้เมล็ด)`,max:4,cost:l=>80*(l+1)**2},
  coop:  {ic:'🪹',name:'รังไข่สุดนุ่ม',desc:l=>`ไข่ออกเร็วขึ้น ${l*15}% → ${(l+1)*15}%`,max:5,cost:l=>60*(l+1)**2},
  toy:   {ic:'🧸',name:'ของเล่นไก่',desc:l=>`ความสุขลดช้าลง ${l*20}% → ${(l+1)*20}%`,max:4,cost:l=>50*(l+1)**2},
  soap:  {ic:'🧼',name:'สบู่หอม',desc:l=>`อาบน้ำแล้วสุขเพิ่ม +${10+l*8} → +${18+l*8}`,max:4,cost:l=>40*(l+1)**2},
  picker:{ic:'🧺',name:'ตะกร้าเก็บของอัตโนมัติ',desc:l=>`เก็บไข่และเก็บอึให้เองทุก ${l?PICK_SEC[l-1]:'--'} วิ → ${PICK_SEC[l]} วิ`,max:3,cost:l=>[400,1500,4000][l]},
  dog:   {ic:'🐕',name:'สุนัขเฝ้าฟาร์ม',desc:l=>`วิ่งไล่กัดศัตรูเอง คูลดาวน์ ${l?(7-l*1.5):'--'} วิ → ${7-(l+1)*1.5} วิ`,max:3,cost:l=>100*(l+1)**2},
};
/* colour: hue = target hue (deg) or null; sm = saturation mult; lm/la = lightness mult/add; css = fallback filter */
const COLORS = {
  gold:  {name:'ทอง',  hex:'#d89a4a', price:0},
  white: {name:'ขาว',  hex:'#f4efe6', price:40,  sm:.08, lm:.7,  la:.45,  css:'grayscale(1) brightness(1.7)'},
  black: {name:'ดำ',   hex:'#3a3430', price:40,  sm:.15, lm:.55, la:-.08, css:'grayscale(1) brightness(.45)'},
  pink:  {name:'ชมพู', hex:'#ef8fb4', price:80,  hue:335, sm:.9, lm:1.15, la:.08, css:'hue-rotate(290deg)'},
  blue:  {name:'ฟ้า',  hex:'#5aa6e8', price:80,  hue:205, sm:1,  lm:1, la:0,  css:'hue-rotate(175deg)'},
  green: {name:'เขียว',hex:'#6bc46b', price:100, hue:110, sm:1,  lm:1, la:0,  css:'hue-rotate(80deg)'},
  purple:{name:'ม่วง', hex:'#a478e0', price:100, hue:275, sm:1,  lm:1, la:0,  css:'hue-rotate(245deg)'},
};
const ENEMIES = {
  fox:  {ic:'🦊', name:'หมาจิ้งจอก', hp:3, speed:60,  coin:12},
  snake:{ic:'🐍', name:'งู',         hp:2, speed:42,  coin:8},
  crow: {ic:'🦅', name:'เหยี่ยว',    hp:1, speed:120, coin:5},
};
const SAYS = {
  idle:['ก๊อก ก๊อก~','อยากกินข้าว...','วันนี้อากาศดีจัง','ฉันกลมใช่มั้ย?','ไข่กำลังมานะ','ลูบหัวหน่อยสิ','ก๊าก!'],
  hungry:['หิวแล้วนะ! 🌾','ท้องร้องแล้ว...','ขอข้าวหน่อยย~'],
  dirty:['ตัวเหม็นแล้ว 🫧','อยากอาบน้ำ...'],
  sad:['เหงาจัง...','เล่นด้วยหน่อยสิ'],
  pet:['จั๊กจี้!','ชอบๆ 💖','อีกๆ!','ก๊อกก~','เก่งมาก!'],
  full:['อิ่มแล้วจ้า','ไม่ไหวแล้ว!'],
  scared:['ช่วยด้วย!!','กรี๊ด!','ไปให้พ้น!'],
};

/* ---------- ui refs / helpers ---------- */
const farm=$('farm'), bubble=$('bubble');
const fmtT = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),1700); }
function say(list, c){
  c = c || pick(chickens); if(!c) return;
  bubble.textContent = `${c.data.name}: ${pick(SAYS[list])}`;
  bubble.classList.add('show'); clearTimeout(say.t); say.t=setTimeout(()=>bubble.classList.remove('show'),2200);
}
function fx(text, x, y, color){
  const d=document.createElement('div'); d.className='fx'; d.textContent=text;
  d.style.left=x+'px'; d.style.top=y+'px'; d.style.fontSize='22px'; if(color) d.style.color=color;
  farm.appendChild(d); setTimeout(()=>d.remove(),1000);
}
function buzz(ms=15){ try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){} }
let ac=null;
function beep(freq=600,dur=.08,type='sine',vol=.06){
  try{
    ac = ac || new (window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(ac.destination);
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime+dur);
    o.start(); o.stop(ac.currentTime+dur);
  }catch(e){}
}

/* ---------- chicken recolour (canvas, with CSS-filter fallback) ---------- */
const baseImg = new Image(); let baseReady=false, canvasOK=true;
const variants = {};
baseImg.onload = () => { baseReady=true; chickens.forEach(refreshLook); };
baseImg.src = 'assets/chicken.png';
function rgb2hsl(r,g,b){
  r/=255;g/=255;b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2; let h=0,s=0;
  if(mx!==mn){ const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
    h = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; }
  return [h,s,l];
}
function hsl2rgb(h,s,l){
  h/=360; if(!s){ const v=l*255; return [v,v,v]; }
  const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q;
  const f=t=>{ t=(t+1)%1; return 255*(t<1/6?p+(q-p)*6*t : t<.5?q : t<2/3?p+(q-p)*(2/3-t)*6 : p); };
  return [f(h+1/3),f(h),f(h-1/3)];
}
function makeVariant(key){
  const C=COLORS[key]; if(key==='gold'||!baseReady||!canvasOK) return null;
  if(variants[key]) return variants[key];
  try{
    const w=baseImg.naturalWidth, h=baseImg.naturalHeight;
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    const cx=cv.getContext('2d'); cx.drawImage(baseImg,0,0);
    const im=cx.getImageData(0,0,w,h), d=im.data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w + x)*4; if(d[i+3]<8) continue;
      // keep the face/hair untouched (soft ellipse mask)
      const dx=(x/w-.16)/.19, dy=(y/h-.30)/.22, dist=Math.sqrt(dx*dx+dy*dy);
      const keep = dist<=1 ? 1 : dist>=1.25 ? 0 : 1-(dist-1)/.25;
      if(keep>=1) continue;
      let [H,Sa,L]=rgb2hsl(d[i],d[i+1],d[i+2]);
      if(C.hue!=null) H=C.hue + (H-30)*.25;
      Sa=clamp(Sa*C.sm,0,1); L=clamp(L*C.lm+C.la,0,1);
      const [r,g,b]=hsl2rgb((H+360)%360,Sa,L);
      d[i]  = r*(1-keep)+d[i]*keep;  d[i+1]=g*(1-keep)+d[i+1]*keep;  d[i+2]=b*(1-keep)+d[i+2]*keep;
    }
    cx.putImageData(im,0,0);
    return variants[key]=cv.toDataURL('image/png');
  }catch(e){ canvasOK=false; return null; }
}

/* ---------- chicken objects ---------- */
const chickens = [];
function ageProg(d){ return d.born ? clamp((Date.now()-d.born)/1000/GROW_SEC,0,1) : 1; }
function isAdult(d){ return ageProg(d)>=1; }
function build(d){
  ['face','neck','back'].forEach(k=>{ if(d[k]===undefined) d[k]='none'; });
  if(d.hat===undefined) d.hat = d.id===1 ? (S.hat||'none') : 'none'; // migrate old global hat to the main chicken
  const el=document.createElement('div'); el.className='ck';
  el.innerHTML='<div class="sh"></div><div class="acc back"></div><img alt="ไก่" draggable="false"><div class="hat"></div><div class="acc face"></div><div class="acc neck"></div><div class="tag"></div>';
  farm.appendChild(el);
  const c={data:d, el, img:el.querySelector('img'), hat:el.querySelector('.hat'), acc:{face:el.querySelector('.acc.face'), neck:el.querySelector('.acc.neck'), back:el.querySelector('.acc.back')}, tag:el.querySelector('.tag'), sh:el.querySelector('.sh'),
           x:rnd(-120,120), y:rnd(-5,15), tx:0, ty:0, by:0, w:170, look:null, dragging:false};
  c.tx=c.x; c.ty=c.y; c.by=c.y;
  c.img.addEventListener('pointerdown', e=>{ e.preventDefault(); startDrag(c,e); });
  c.tag.addEventListener('pointerdown', e=>{ e.preventDefault(); e.stopPropagation(); openModal(c); });
  chickens.push(c); refreshLook(c); updateSize(c);
  return c;
}
/* drag a chicken to move it off the eggs; a short tap still pets it */
function clampPos(c){
  const w=farm.clientWidth, h=farm.clientHeight, mx=Math.max(0,(w-c.w)/2-4);
  c.x=clamp(c.x,-mx,mx); c.y=clamp(c.y,-h*.08,h*.3);
}
function startDrag(c,e){
  const sx=e.clientX, sy=e.clientY, ox=c.x, oy=c.y; let moved=false;
  const mv=ev=>{
    const dx=ev.clientX-sx, dy=ev.clientY-sy;
    if(!moved && Math.hypot(dx,dy)<8) return;
    moved=true; c.dragging=true;
    c.x=ox+dx; c.y=oy+dy; clampPos(c); c.tx=c.x; c.ty=c.y; c.by=c.y;
  };
  const up=ev=>{
    removeEventListener('pointermove',mv); removeEventListener('pointerup',up); removeEventListener('pointercancel',up);
    c.dragging=false;
    if(moved){ c.by=c.y; c.hold=performance.now()+4000; anim(c,'bounce'); }
    else if(ev.type==='pointerup') pet(c,ev);
  };
  addEventListener('pointermove',mv); addEventListener('pointerup',up); addEventListener('pointercancel',up);
}
function refreshLook(c){
  const key=c.data.color, C=COLORS[key]||COLORS.gold;
  const url=makeVariant(key);
  const sig=key+(url?'v':'f');
  if(c.look===sig) return; c.look=sig;
  const src = url || 'assets/chicken.png';
  if(!c.img.getAttribute('src')) c.img.src = src;
  else { // decode first so the chicken never blinks out while the new image loads
    const t=new Image(); t.src=src;
    (t.decode?t.decode():Promise.resolve()).catch(()=>{}).then(()=>{ if(c.look===sig) c.img.src=src; });
  }
  c.img.style.filter = '';
  c.img.dataset.css = (!url && key!=='gold' && C.css) ? C.css : '';
  applyFilter(c);
}
function applyFilter(c){
  const gl=STAGES[stageOf(S.level)].glow;
  const base='drop-shadow(0 12px 6px rgba(0,0,0,.22))'+(gl?` drop-shadow(0 0 14px ${gl})`:'');
  const sad=(S.hunger<20||S.happy<20)?' saturate(.55) brightness(.92)':'';
  c.img.style.filter = (c.img.dataset.css? c.img.dataset.css+' ':'') + base + sad;
}
const gearKey = d => [d.hat,d.face,d.neck,d.back].join();
function updateSize(c){
  const p=ageProg(c.data), main = c.data.id===1;
  const f = main ? 1 : (.5 + .3*p);
  if(!farm.clientHeight || !farm.clientWidth) return; // layout not ready: keep old size instead of collapsing to 0
  const cap = Math.min(farm.clientHeight*.4, farm.clientWidth*.5);
  const w = Math.round(Math.min(cap*levelFrac(S.level)*(1-.07*(chickens.length-1))*f, cap));
  if(w===c.w && c.sized===gearKey(c.data)+c.data.name+isAdult(c.data)){ applyFilter(c); return; }
  c.sized=gearKey(c.data)+c.data.name+isAdult(c.data); c.w=w; clampPos(c);
  c.img.style.width=c.w+'px'; c.sh.style.width=(c.w*.82)+'px';
  c.sh.style.transform=`translate(-50%,${c.w*.58}px)`;
  c.hat.style.fontSize=(c.w*.235)+'px';
  setHat(c);
  ['hat','face','neck','back'].forEach(k=>{ const el=k==='hat'?c.hat:c.acc[k]; el.textContent = c.data[k]==='none'?'':c.data[k]; });
  c.tag.style.top=(c.w*.38+8)+'px';
  c.tag.textContent=c.data.name; c.tag.classList.toggle('chickTag', !isAdult(c.data));
  applyFilter(c);
}
/* the artwork faces left; flip it (and the hat) when the chicken walks right */
/* accessory layout: x,y = offset of the item centre from the chicken anchor, in units of the chicken width; s = font size (same units); r = tilt in degrees.
   Stored unflipped (chicken facing left); d.pl[slot] holds the player's overrides from the dressing room. */
const DEF = {hat:{x:-.34,y:-.5,s:.22,r:-14}, face:{x:-.34,y:-.26,s:.2,r:0}, neck:{x:-.33,y:-.1,s:.2,r:0}, back:{x:.42,y:-.28,s:.3,r:0}};
const layoutOf = (d,sl) => Object.assign({}, DEF[sl], (d.pl&&d.pl[sl])||{});
function placeAcc(el,l,w,flip){
  const s=flip?-1:1;
  el.style.fontSize=l.s*w+'px';
  el.style.transform=`translate(calc(-50% + ${l.x*s*w}px),calc(-50% + ${l.y*w}px)) rotate(${l.r*s}deg)`;
}
function setHat(c){
  ['hat','face','neck','back'].forEach(sl=>placeAcc(sl==='hat'?c.hat:c.acc[sl], layoutOf(c.data,sl), c.w, c.flip));
}
function face(c,right){
  if(!!c.flip===right) return;
  c.flip=right; c.img.style.scale = right?'-1 1':'1 1'; setHat(c);
}
function center(c){
  const r=c.img.getBoundingClientRect(), f=farm.getBoundingClientRect();
  return {x:r.left-f.left+r.width/2, y:r.top-f.top+r.height/2, w:r.width, h:r.height};
}
function anim(c,cls){ c.img.classList.remove('bounce','eat'); void c.img.offsetWidth; c.img.classList.add(cls); }
function bonus(k){
  let t=0;
  chickens.forEach(c=>['hat','face','neck','back'].forEach(sl=>{ const g=GMAP[c.data[sl]]; if(g && g.fx[k] && S.gear[g.id]) t+=g.fx[k]*gearMul(g.id); }));
  return Math.min(STAT_CAP[k], t);
}
const sellValue = () => Math.round((S.eggs*5+S.goldEggs*60)*(1+bonus('coin')));
function adults(){ return chickens.filter(c=>isAdult(c.data)); }

/* ---------- rendering ---------- */
function render(){
  $('coins').textContent = Math.floor(S.coins);
  $('flockCnt').textContent = `${chickens.length}/${MAX_FLOCK} ตัว`;
  $('eggs').textContent = S.eggs + (S.goldEggs? ' +'+S.goldEggs+'✨':'');
  const stg=STAGES[stageOf(S.level)];
  $('lvlname').textContent = `Lv.${S.level} ${stg.n}`;
  if(stg.sky){ farm.dataset.sky=stg.sky; document.documentElement.dataset.sky=stg.sky; } else { delete farm.dataset.sky; delete document.documentElement.dataset.sky; }
  $('cosmos').textContent = stg.ic||'';
  $('xpbar').style.width = (S.xp/xpNeed(S.level)*100)+'%';
  setBar('sHunger',S.hunger); setBar('sHappy',S.happy); setBar('sClean',S.clean);
  $('grainCnt').textContent = `${S.grain} (ใช้ ${feedCost()})`;
  $('sellInfo').textContent = `${sellValue()} 🪙`;
  if(!S.up.dog) $('dog').style.display='none';
  chickens.forEach(updateSize);
  const inc=$('incub');
  if(S.incub){ inc.style.display='block'; inc.textContent=`🥚 ฟักอยู่ ${fmtT(Math.max(0,(S.incub.end-Date.now())/1000))}`; }
  else inc.style.display='none';
}
function setBar(id,v){
  const el=$(id); el.style.width=v+'%';
  el.style.background = v>55?'#5cb85c':v>25?'#f0ad4e':'#e5533d';
}

/* ---------- decor ---------- */
(function decor(){
  const sky=$('sky');
  for(let i=0;i<4;i++){
    const c=document.createElement('div'); c.className='cloud'; c.textContent='☁️';
    c.style.top=rnd(2,30)+'%'; c.style.animationDuration=rnd(40,80)+'s'; c.style.animationDelay='-'+rnd(0,60)+'s';
    sky.appendChild(c);
  }
  $('fence').textContent = '🌾🪵🪵🪵🌾🪵🪵🪵🌾🪵🪵🪵🌾🪵🪵🪵🌾🪵🪵🪵🌾🪵🪵🪵';
  const flowers = ['🌼','🌷','🍄','🌻'];
  for(let i=0;i<9;i++){
    const f=document.createElement('div'); f.textContent=flowers[i%4];
    f.style.cssText=`position:absolute;font-size:${rnd(16,24)}px;left:${rnd(2,94)}%;top:${rnd(70,96)}%;opacity:.9;pointer-events:none`;
    sky.appendChild(f);
  }
})();

/* ---------- wandering + frame loop ---------- */
function wander(c){
  if(c.dragging || performance.now()<(c.hold||0)) return;
  const w=farm.clientWidth, h=farm.clientHeight, mx=Math.max(0,(w-c.w)/2-4);
  c.tx = rnd(-mx, mx);
  c.ty = clamp(c.by + rnd(-h*.03, h*.03), -h*.08, h*.3);
}
setInterval(()=>chickens.forEach(c=>{ if(Math.random()<.6) wander(c); }), 3200);

const enemies = [];
let lastFrame=performance.now();
function frame(t){
  requestAnimationFrame(frame);
  const dt=Math.min(.1,(t-lastFrame)/1000); lastFrame=t;
  const k=1-Math.exp(-1.2*dt);
  chickens.forEach(c=>{
    if(!c.dragging){ c.x += (c.tx-c.x)*k; c.y += (c.ty-c.y)*k; }
    const moving = Math.abs(c.tx-c.x)>6;
    if(moving && !c.dragging) face(c, c.tx>c.x);
    const bob = Math.sin(t/260 + c.data.id)*(moving?4:1.5);
    c.el.style.transform = `translate(${c.x}px,${c.y+bob}px)`;
    c.el.style.zIndex = 10 + clamp(Math.round(c.y/10),-5,25);
  });
  try{ updateEnemies(dt); updateDog(dt); }catch(err){ console.error(err); }
}
requestAnimationFrame(frame);

/* ---------- gameplay ---------- */
function addXp(n){
  S.xp += n*(1+bonus('xp'));
  const st0=stageOf(S.level);
  while(S.xp >= xpNeed(S.level)){
    S.xp -= xpNeed(S.level); S.level++;
    const c=center(chickens[0]); fx('⬆️ เลเวลอัพ!', c.x, c.y-c.h*.4, '#d9531e');
    S.coins += 10 + S.level; toast(`เลเวล ${S.level}! ได้โบนัส ${10+S.level} 🪙`);
    beep(880,.2,'triangle',.08); setTimeout(()=>beep(1180,.25,'triangle',.08),120);
  }
  if(stageOf(S.level)!==st0){ toast(`🎉 ไก่โตขึ้นเป็น "${STAGES[stageOf(S.level)].n}"!`); chickens.forEach(updateSize); }
}
const feedCost = () => Math.ceil(chickens.length/2);

function dropGrain(c0){
  const c=center(c0);
  for(let i=0;i<7;i++){
    const g=document.createElement('div'); g.className='grain'; g.textContent='🌾';
    g.style.left=(c.x+rnd(-70,70))+'px'; g.style.top=(c.y-c.h*.9)+'px';
    g.style.transition=`top ${.5+i*.05}s ease-in, opacity .4s ${.5+i*.05}s`;
    farm.appendChild(g);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ g.style.top=(c.y+c.h*.28)+'px'; g.style.opacity=0; }));
    setTimeout(()=>g.remove(),1400);
  }
}

function feed(auto=false){
  if(S.hunger>=98){ say('full'); if(!auto) toast('ไก่อิ่มแล้ว'); return false; }
  const cost=feedCost();
  if(S.grain<cost){ if(!auto) toast(`เมล็ดข้าวไม่พอ (ต้องใช้ ${cost}) ไปซื้อที่ร้านค้า`); return false; }
  S.grain-=cost; S.hunger=clamp(S.hunger+28); S.happy=clamp(S.happy+3);
  addXp(4); beep(420,.06,'square',.04); setTimeout(()=>beep(520,.06,'square',.04),140);
  chickens.forEach(c=>{ dropGrain(c); anim(c,'eat'); });
  const c=center(chickens[0]); fx('+อิ่ม', c.x, c.y-c.h*.5,'#3a8a3a');
  render(); return true;
}

function pet(c,ev){
  S.totalPets++; S.happy=clamp(S.happy+2.5);
  anim(c,'bounce'); buzz(10); beep(rnd(500,800),.07,'sine',.05);
  const f=farm.getBoundingClientRect(), x=ev.clientX-f.left, y=ev.clientY-f.top;
  fx(Math.random()<.5?'💖':'✨', x, y-10);
  if(S.happy>60 && S.hunger>30 && Math.random()<.12){ S.coins+=1; fx('+1🪙', x, y-40,'#b8860b'); }
  if(Math.random()<.12) say('pet',c);
  addXp(.5); render();
}

function wash(){
  if(S.clean>=95){ toast('ตัวสะอาดอยู่แล้ว'); return; }
  S.clean=100; S.happy=clamp(S.happy+10+S.up.soap*8); addXp(5);
  chickens.forEach(k=>{ const c=center(k); for(let i=0;i<5;i++) setTimeout(()=>fx('🫧', c.x+rnd(-50,50), c.y+rnd(-40,40)), i*70); anim(k,'bounce'); });
  beep(900,.1,'sine',.05); render();
}

/* eggs / poop on the ground */
function spawnItem(kind, emoji, at){
  const w=farm.clientWidth, h=farm.clientHeight;
  const el=document.createElement('div');
  el.className='item '+kind; el.textContent=emoji;
  el.style.left = (at?at.x:rnd(w*.12, w*.88))+'px';
  el.style.top  = (at?at.y:rnd(h*.66, h*.92))+'px';
  el.dataset.kind=kind;
  el.addEventListener('pointerdown', e=>{ e.preventDefault(); collect(el); });
  farm.appendChild(el);
  return el;
}
function collect(el){
  const k=el.dataset.kind, x=parseFloat(el.style.left), y=parseFloat(el.style.top);
  if(k==='egg'){ S.eggs++; S.totalEggs++; fx('+🥚',x,y,'#8a6d3b'); addXp(3); beep(700,.06,'triangle',.06); }
  else if(k==='gold'){ S.goldEggs++; S.totalEggs++; fx('+✨ไข่ทอง!',x,y,'#c28a00'); addXp(15); beep(1000,.12,'triangle',.07); setTimeout(()=>beep(1400,.2,'triangle',.07),90); }
  else if(k==='poop'){ S.clean=clamp(S.clean+8); S.coins+=1; fx('+1🪙',x,y,'#b8860b'); beep(300,.05,'square',.04); }
  buzz(12); el.remove(); render(); save();
}
const itemCount = k => farm.querySelectorAll('.item.'+k).length;

function sell(){
  if(!S.eggs && !S.goldEggs){ toast('ยังไม่มีไข่ให้ขาย'); return; }
  const gain=sellValue();
  S.coins+=gain; S.eggs=0; S.goldEggs=0;
  toast(`ขายไข่ได้ ${gain} 🪙`); beep(1000,.08,'square',.05); setTimeout(()=>beep(1300,.1,'square',.05),80);
  render(); save();
}

function layEgg(){
  const gold = Math.random() < .06 + S.level*.003 + bonus('gold');
  const k = pick(adults()), c=center(k);
  const el = spawnItem(gold?'gold':'egg', gold?'🥇':'🥚', {x:c.x+rnd(-40,40), y:c.y+c.h*.35});
  if(!gold) el.classList.add('egg');
  fx(gold?'ไข่ทอง!!':'ออกไข่!', c.x, c.y-c.h*.4, gold?'#c28a00':'#8a6d3b');
  say('idle',k); buzz(25); beep(gold?900:600,.12,'triangle',.07);
}

/* ---------- incubator / hatching ---------- */
function startIncubate(gold){
  if(S.incub) return toast('ตู้ฟักกำลังทำงานอยู่');
  if(chickens.length>=MAX_FLOCK) return toast(`ฟาร์มเต็มแล้ว (สูงสุด ${MAX_FLOCK} ตัว)`);
  if(gold){ if(S.goldEggs<1) return; S.goldEggs--; }
  else { if(S.eggs<HATCH_EGGS) return; S.eggs-=HATCH_EGGS; }
  S.incub={end:Date.now()+HATCH_SEC*1000, gold:!!gold};
  toast('เริ่มฟักไข่แล้ว! รอสักครู่...'); beep(600,.1,'triangle',.06);
}
function checkHatch(){
  if(!S.incub || Date.now()<S.incub.end) return;
  const gold=S.incub.gold; S.incub=null;
  const key = gold ? pick(['pink','blue','green','purple'])
                   : (()=>{ const r=Math.random(); return r<.4?'gold':r<.7?'white':'black'; })();
  if(!S.colors.includes(key)) S.colors.push(key);
  const d={id:S.nextId++, name:'ลูกไก่ '+(chickens.length), color:key, hat:'none', born:Date.now()};
  S.flock.push(d); const c=build(d); c.x=c.tx=0; c.y=c.ty=10;
  const p=center(c); fx('🐣 ฟักแล้ว!', p.x, p.y-p.h*.5,'#d9531e');
  toast(`ลูกไก่สี${COLORS[key].name}ฟักออกมาแล้ว! แตะชื่อเพื่อตั้งชื่อ`); beep(1000,.12,'triangle',.07);
  setTimeout(()=>beep(1300,.15,'triangle',.07),120); buzz(40);
  render(); save();
}

/* ---------- enemies ---------- */
const spawnAt = performance.now() + 60000; // grace period after opening the game
function spawnEnemy(typeKey){
  const T=ENEMIES[typeKey], w=farm.clientWidth, h=farm.clientHeight;
  const fromLeft=Math.random()<.5;
  const el=document.createElement('div'); el.className='enemy'; el.textContent=T.ic;
  const hpEl=document.createElement('div'); hpEl.className='hp'; el.appendChild(hpEl);
  const e={type:typeKey, T, el, hpEl, hp:T.hp, x:fromLeft?-30:w+30, y:rnd(h*.62,h*.9), dir:fromLeft?1:-1, state:'attack', target:null, dog:0};
  el.style.fontSize='46px';
  if(!fromLeft) el.style.scale='-1 1'; // face the farm
  el.addEventListener('pointerdown', ev=>{ ev.preventDefault(); hitEnemy(e,false); if(Math.random()<bonus('guard')) hitEnemy(e,false); });
  farm.appendChild(el); enemies.push(e); showHp(e);
  const W=$('warn'); W.textContent=`${T.ic} ${T.name}มาแล้ว! แตะไล่เร็ว!`; W.classList.remove('show'); void W.offsetWidth; W.classList.add('show');
  beep(200,.25,'sawtooth',.06); buzz([60,40,60]);
  say('scared');
}
function showHp(e){ e.hpEl.textContent='❤️'.repeat(e.hp); }
function hitEnemy(e, byDog){
  if(e.state==='dead') return;
  e.hp--; showHp(e);
  e.el.classList.remove('hit'); void e.el.offsetWidth; e.el.classList.add('hit');
  fx(byDog?'🐕 งับ!':'💥', e.x, e.y-30, '#b3261e'); beep(250,.06,'square',.06); buzz(15);
  if(e.hp<=0){
    e.state='dead'; S.enemiesBeaten++;
    const gain=Math.round((e.T.coin + Math.floor(S.level/2))*(1+bonus('coin'))); S.coins+=gain; addXp(8);
    fx(`+${gain}🪙`, e.x, e.y-50, '#b8860b'); toast(`ไล่${e.T.name}ไปได้แล้ว +${gain} 🪙`);
    e.el.style.transition='transform .5s, opacity .5s'; e.el.style.opacity=0;
    setTimeout(()=>{ e.el.remove(); },500); render(); save();
  } else if(!byDog){
    e.state='attack'; // tapping slows its approach briefly
    e.stun=.35;
  }
}
function strike(e){
  const k=e.target; e.state='flee'; e.dir = e.x < farm.clientWidth/2 ? -1 : 1;
  e.el.style.scale = e.dir>0 ? '-1 1' : '1 1';
  S.happy=clamp(S.happy-18); anim(k,'bounce'); buzz(80); say('scared',k);
  const c=center(k);
  if(e.type==='crow'){ const loss=Math.min(S.grain,2); if(loss){ S.grain-=loss; fx(`-${loss}🌾`,c.x,c.y-c.h*.4,'#b3261e'); } else { S.coins=Math.max(0,S.coins-4); fx('-4🪙',c.x,c.y-c.h*.4,'#b3261e'); } }
  else {
    const gnd=farm.querySelector('.item.egg,.item.gold');
    if(gnd){ gnd.remove(); fx('ไข่โดนขโมย!',c.x,c.y-c.h*.4,'#b3261e'); }
    else if(S.eggs>0){ S.eggs--; fx('-1🥚',c.x,c.y-c.h*.4,'#b3261e'); }
    else { const loss=Math.min(Math.floor(S.coins),e.type==='fox'?10:6); S.coins-=loss; fx(`-${loss}🪙`,c.x,c.y-c.h*.4,'#b3261e'); }
  }
  beep(150,.3,'sawtooth',.07); render();
}
function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(e.state==='dead'){ if(!e.el.isConnected) enemies.splice(i,1); continue; }
    if(e.stun>0){ e.stun-=dt; }
    else if(e.state==='attack'){
      if(!e.target || !chickens.includes(e.target)) e.target = pick(chickens);
      const c=center(e.target), tx=c.x, ty=c.y+c.h*.2;
      const dx=tx-e.x, dy=ty-e.y, d=Math.hypot(dx,dy);
      if(d<50) strike(e);
      else { const sp=e.T.speed*dt; e.x+=dx/d*sp; e.y+=dy/d*sp; e.el.style.scale = dx<0?'-1 1':'1 1'; }
    } else { // flee
      e.x += e.dir*(e.T.speed*1.8)*dt;
      if(e.x<-60 || e.x>farm.clientWidth+60){ e.el.remove(); enemies.splice(i,1); continue; }
    }
    e.el.style.left=e.x+'px'; e.el.style.top=e.y+'px';
  }
}
/* guard dog: runs after the nearest attacker, bites on arrival, otherwise rests by the fence */
const dog={x:-999,y:0,cd:0,flip:false};
function updateDog(dt){
  const el=$('dog'), w=farm.clientWidth, h=farm.clientHeight;
  if(!S.up.dog || !w || !h) return;
  if(dog.x===-999){ dog.x=36; dog.y=h-30; }
  dog.cd=Math.max(0,dog.cd-dt);
  let tgt=null, best=1e9;
  for(const e of enemies){ if(e.state!=='attack') continue; const d=Math.hypot(e.x-dog.x,e.y-dog.y); if(d<best){ best=d; tgt=e; } }
  let tx=36, ty=h-30, run=false;
  if(tgt){ tx=tgt.x; ty=tgt.y; run=true; }
  const dx=tx-dog.x, dy=ty-dog.y, d=Math.hypot(dx,dy);
  if(run && d<44){
    if(dog.cd<=0){ hitEnemy(tgt,true); dog.cd=7-S.up.dog*1.5; }
  } else if(d>4){
    const sp=Math.min(d,(run?190:90)*dt);
    dog.x+=dx/d*sp; dog.y+=dy/d*sp;
  }
  if(Math.abs(dx)>6){ dog.flip = dx>0; el.style.scale = dog.flip?'-1 1':'1 1'; }
  const hop = (run&&d>=44) ? Math.abs(Math.sin(performance.now()/90))*-8 : 0;
  el.style.translate=`${dog.x-20}px ${dog.y-20+hop}px`;
  el.style.display='block';
}
function maybeSpawnEnemy(dt){
  if(performance.now()<spawnAt) return;
  const maxE = 1 + (S.level>=8?1:0);
  if(enemies.filter(e=>e.state!=='dead').length>=maxE) return;
  if(Math.random() < dt*Math.min(.03,.008+S.level*.0015)){
    const r=Math.random();
    spawnEnemy(S.level<3 ? 'snake' : r<.45?'fox':r<.75?'snake':'crow');
  }
}

/* ---------- main tick (1s) ---------- */
let lastTick=Date.now(), pickTimer=0;
function tick(dt){
  const toyMul = 1 - S.up.toy*.2;
  S.hunger = clamp(S.hunger - dt*0.45*(1+.08*(chickens.length-1))*(1-bonus('hunger')));
  S.happy  = clamp(S.happy  - dt*0.30*toyMul*(1-bonus('happy')) - (S.hunger<25?dt*.25:0) - (S.clean<25?dt*.2:0));
  S.clean  = clamp(S.clean  - dt*0.22*(1-bonus('clean')));

  const ad=adults();
  if(S.hunger>35 && S.happy>35 && ad.length){
    const speed = (1 + S.up.coop*.15 + (S.happy>75?.2:0)) * (1 + .6*(ad.length-1)) * (1 + bonus('egg'));
    S.eggTimer += dt*speed;
    if(S.eggTimer >= 35){ S.eggTimer=0; if(itemCount('egg')+itemCount('gold')<8) layEgg(); }
  }
  if(Math.random() < dt*0.035 && itemCount('poop')<4) spawnItem('poop','💩');

  if(S.up.feeder>0){
    S.feederTimer += dt;
    if(S.feederTimer >= Math.max(20,90-S.up.feeder*15) && S.hunger<60){ if(feed(true)) S.feederTimer=0; }
  }
  if(S.up.picker>0){
    pickTimer += dt;
    if(pickTimer >= PICK_SEC[S.up.picker-1]){
      const it = farm.querySelector('.item.gold, .item.egg, .item.poop');
      if(it){ pickTimer=0; collect(it); } else pickTimer = PICK_SEC[S.up.picker-1]; // wait for the next item
    }
  }
  checkHatch();
  maybeSpawnEnemy(dt);

  if(Math.random()<dt*.09){
    if(S.hunger<30) say('hungry');
    else if(S.clean<30) say('dirty');
    else if(S.happy<30) say('sad');
    else say('idle');
  }
  render();
}
setInterval(()=>{
  const now=Date.now(), dt=Math.min(5,(now-lastTick)/1000); lastTick=now;
  tick(dt);
},1000);
setInterval(save, 5000);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); else lastTick=Date.now(); });
addEventListener('pagehide', save);

/* ---------- offline progress ---------- */
(function offline(){
  const away = Math.min(8*3600, (Date.now()-S.lastSeen)/1000);
  if(away < 60) return;
  const mins = away/60;
  S.hunger = clamp(S.hunger - mins*0.25, 10, 100);
  S.happy  = clamp(S.happy  - mins*0.15, 10, 100);
  S.clean  = clamp(S.clean  - mins*0.12, 10, 100);
  const eggs = Math.min(10, Math.floor(away/180));
  if(eggs>0){ S.eggs += eggs; S.totalEggs += eggs; setTimeout(()=>toast(`ระหว่างที่ไม่อยู่ ไก่ออกไข่ ${eggs} ฟอง 🥚`),600); }
})();

/* ---------- shop ---------- */
function openShop(){ $('shop').classList.add('open'); renderShop(); }
function closeShop(){ $('shop').classList.remove('open'); }
$('shop').addEventListener('pointerdown', e=>{ if(e.target===$('shop')) closeShop(); });

function renderShop(){
  let h = `<h2>🛒 ร้านค้า <span style="font-size:15px">🪙 ${Math.floor(S.coins)}</span><button class="x" id="xShop">✕</button></h2>`;
  h += `<h3>อาหาร</h3>`;
  [[10,12],[30,32],[100,100]].forEach(([n,p])=>{
    h += row('🌾',`เมล็ดข้าว x${n}`,`ตอนนี้มี ${S.grain}`, `${p} 🪙`, S.coins<p, `buy:grain:${n}:${p}`);
  });
  h += `<h3>ตู้ฟักไข่ 🐣 (${chickens.length}/${MAX_FLOCK} ตัว)</h3>`;
  if(S.incub) h += row('🥚','กำลังฟัก...',`เหลือ ${fmtT(Math.max(0,(S.incub.end-Date.now())/1000))}`,'รอ',true,'');
  else {
    const full = chickens.length>=MAX_FLOCK;
    h += row('🥚',`ฟักลูกไก่ (ไข่ ${HATCH_EGGS} ฟอง)`,`มีไข่ ${S.eggs} · ลูกไก่โตใน ${GROW_SEC/60} นาที สีสุ่ม`, full?'เต็ม':'ฟัก', full||S.eggs<HATCH_EGGS, 'incub:n');
    h += row('🥇','ฟักด้วยไข่ทอง (1 ฟอง)',`มี ${S.goldEggs} · ได้สีหายาก ชมพู/ฟ้า/เขียว/ม่วง`, full?'เต็ม':'ฟัก', full||S.goldEggs<1, 'incub:g');
  }
  h += `<h3>อัปเกรด</h3>`;
  Object.entries(UPS).forEach(([k,u])=>{
    const l=S.up[k];
    if(l>=u.max) h += row(u.ic,`${u.name} (MAX)`,'อัปสุดแล้ว','เต็ม',true,'');
    else { const c=u.cost(l); h += row(u.ic,`${u.name} Lv.${l}`,u.desc(l),`${c} 🪙`,S.coins<c,`up:${k}`); }
  });
  h += `<h3>กาชา</h3>`;
  h += row('🎰','กาชาเครื่องแต่งกาย','หมวก/แว่น/ของคล้องคอ/ของติดหลัง มีพลังพิเศษ','เปิด',false,'gacha');
  h += `<h3>หมวก (แต่งสวย)</h3>`;
  HATS.forEach(hat=>{
    const owned=S.hats.includes(hat.id);
    if(owned) h += row(hat.ic,hat.name,'ของคุณ · ใส่ได้ที่ปุ่ม 🐔 ฝูงไก่','มีแล้ว',true,'');
    else h += row(hat.ic,hat.name,'เปลี่ยนลุคไก่',`${hat.price} 🪙`,S.coins<hat.price,`hat:${hat.id}:${hat.price}`);
  });
  h += `<h3>ตั้งค่า</h3>`;
  h += row('📤','สำรองข้อมูล','คัดลอกรหัสเซฟเก็บไว้ ย้ายเครื่องได้','คัดลอก',false,'export');
  h += row('📥','กู้ข้อมูล','วางรหัสเซฟที่สำรองไว้ (ทับเซฟตอนนี้)','วางรหัส',false,'import');
  h += row('🔄','เริ่มเกมใหม่','ลบไก่ เหรียญ และความคืบหน้าทั้งหมด','เริ่มใหม่',false,'reset');
  const st=$('sheet').scrollTop;
  $('sheet').innerHTML = h; $('sheet').scrollTop=st;
}
function row(ic,name,desc,btn,dis,act,cls=''){
  return `<div class="row"><div class="ic">${ic}</div><div class="tx"><b>${name}</b>${desc}</div>${act?`<button class="${cls}" data-act="${act}" ${dis?'disabled':''}>${btn}</button>`:`<button disabled>${btn}</button>`}</div>`;
}
$('sheet').addEventListener('click', e=>{
  if(e.target.id==='xShop') return closeShop();
  const b=e.target.closest('button[data-act]'); if(!b||b.disabled) return;
  const [type,a,c,d]=b.dataset.act.split(':');
  if(type==='buy'){ const n=+c,p=+d; if(S.coins>=p){ S.coins-=p; S.grain+=n; beep(800,.07,'square',.05);} }
  else if(type==='up'){ const u=UPS[a], cost=u.cost(S.up[a]); if(S.coins>=cost && S.up[a]<u.max){ S.coins-=cost; S.up[a]++; toast('อัปเกรดแล้ว!'); beep(900,.15,'triangle',.07);} }
  else if(type==='hat'){ const p=+c; if(S.coins>=p){ S.coins-=p; S.hats.push(a); toast('ซื้อหมวกแล้ว! ไปใส่ที่ปุ่ม 🐔 ฝูงไก่'); beep(900,.15,'triangle',.07);} }
  else if(type==='incub'){ startIncubate(a==='g'); }
  else if(type==='export'){ exportSave(); }
  else if(type==='gacha'){ openGacha(); }
  else if(type==='import'){ if(importSave()) return; }
  else if(type==='reset'){
    if(confirm('เริ่มเกมใหม่? ข้อมูลทั้งหมดจะถูกลบและกู้คืนไม่ได้')){
      resetting=true;
      try{ localStorage.removeItem(SAVE_KEY); }catch(err){}
      location.reload(); return;
    }
  }
  render(); renderShop(); save();
});
/* save backup: S as base64 text with a "KAI1:" prefix so it can be pasted back later */
const encodeSave = () => 'KAI1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
function exportSave(){
  save();
  const code=encodeSave();
  const done=()=>toast('คัดลอกรหัสเซฟแล้ว เก็บไว้ที่ปลอดภัยนะ');
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, ()=>prompt('คัดลอกรหัสเซฟนี้เก็บไว้:',code));
  else prompt('คัดลอกรหัสเซฟนี้เก็บไว้:',code);
}
function importSave(){
  const t=(prompt('วางรหัสเซฟที่นี่')||'').trim(); if(!t) return false;
  let o;
  try{
    if(!t.startsWith('KAI1:')) throw 0;
    o=JSON.parse(decodeURIComponent(escape(atob(t.slice(5)))));
    if(!o || typeof o!=='object' || !Array.isArray(o.flock) || !o.flock.length || typeof o.coins!=='number') throw 0;
  }catch(e){ toast('รหัสเซฟไม่ถูกต้อง'); return false; }
  if(!confirm('กู้ข้อมูลนี้? เซฟปัจจุบันจะถูกทับและกู้คืนไม่ได้')) return false;
  resetting=true;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(o)); }catch(e){ resetting=false; toast('บันทึกไม่ได้'); return false; }
  location.reload(); return true;
}
setInterval(()=>{ if($('shop').classList.contains('open') && S.incub) renderShop(); },1000);

/* ---------- flock list: see every chicken + dress them ---------- */
function openFlock(){ $('flock').classList.add('open'); renderFlock(); }
function closeFlock(){ $('flock').classList.remove('open'); }
$('flock').addEventListener('pointerdown', e=>{ if(e.target===$('flock')) closeFlock(); });
$('bFlock').onclick = openFlock;
const slotOptions = sl => { const ids = sl==='hat' ? S.hats.slice() : ['none']; GEAR.forEach(g=>{ if(g.slot===sl && S.gear[g.id]) ids.push(g.id); }); return ids; };
function renderFlock(){
  const stg=STAGES[stageOf(S.level)], nx=STAGES[stageOf(S.level)+1];
  let h=`<h2>🐔 ฝูงไก่ของฉัน (${chickens.length}/${MAX_FLOCK}) <button class="x" id="xF">✕</button></h2>`;
  h+=`<div style="font-size:12px;font-weight:700;margin-bottom:6px">ระดับ: ${stg.n}${nx?` · ถึง "${nx.n}" ที่ Lv.${nx.lv}`:' · สูงสุดแล้ว!'}</div>`;
  const bs=Object.keys(STAT).filter(k=>bonus(k)>0).map(k=>`${STAT[k]} +${Math.round(bonus(k)*100)}%`);
  h+=`<div class="bonus">💪 พลังรวมจากเครื่องแต่งกาย: ${bs.length?bs.join(' · '):'ยังไม่มี'}</div>`;
  h+=`<button class="big" style="margin:0 0 8px" id="goGacha">🎰 กาชาเครื่องแต่งกาย</button>`;
  chickens.forEach(c=>{
    const d=c.data, p=ageProg(d), C=COLORS[d.color]||COLORS.gold;
    const st = isAdult(d) ? 'โตเต็มวัย' : `ลูกไก่ โตแล้ว ${Math.floor(p*100)}%`;
    h+=`<div class="fr"><div class="top"><div class="th"><img src="${c.img.src}" alt=""><span>${d.hat==='none'?'':d.hat}</span></div>
      <div class="tx"><b>${d.name}</b>สี${C.name} · ${st}</div>
      <button class="hb" data-dress="${d.id}" title="จัดตำแหน่งเครื่องแต่งกาย">🎨</button>
      <button class="hb" data-edit="${d.id}" title="ชื่อ/สี">✏️</button></div>`;
    Object.entries(SLOTS).forEach(([sl,lab])=>{
      h+=`<div class="lab">${lab}</div><div class="hats">${slotOptions(sl).map(id=>{
        const g=GMAP[id], ht=HATS.find(x=>x.id===id), nm=g?`${g.n} (${gearDesc(g)})`:(ht?ht.name:'');
        return `<button class="hb ${d[sl]===id?'on':''}" data-wear="${d.id}:${sl}:${id}" title="${nm}" ${g?`style="border-color:${RARITY[g.r].col}"`:''}>${id==='none'?'🚫':id}</button>`; }).join('')}</div>`;
    });
    const worn=['hat','face','neck','back'].map(sl=>GMAP[d[sl]]).filter(Boolean);
    if(worn.length) h+=`<div class="ab">${worn.map(g=>`${g.id} ${gearDesc(g)}`).join('<br>')}</div>`;
    h+=`</div>`;
  });
  h+=`<div style="font-size:12px;opacity:.7">ซื้อหมวกแต่งสวยที่ร้านค้า · ลากไก่ในฟาร์มเพื่อย้ายตำแหน่ง · เครื่องแต่งกายซ้ำ = เลเวลของชิ้นนั้นเพิ่ม (สูงสุด Lv.3)</div>`;
  const st=$('fsheet').scrollTop; $('fsheet').innerHTML=h; $('fsheet').scrollTop=st;
}
$('fsheet').addEventListener('click', e=>{
  if(e.target.id==='xF') return closeFlock();
  if(e.target.id==='goGacha') return openGacha();
  const w=e.target.closest('[data-wear]');
  if(w){
    const [id,sl,item]=w.dataset.wear.split(':'), c=chickens.find(k=>k.data.id==id); if(!c) return;
    c.data[sl]=item; updateSize(c); anim(c,'bounce'); beep(800,.08,'triangle',.05); save(); renderFlock(); return;
  }
  const dr=e.target.closest('[data-dress]');
  if(dr){ const c=chickens.find(k=>k.data.id==dr.dataset.dress); if(c) openDress(c); return; }
  const ed=e.target.closest('[data-edit]');
  if(ed){ const c=chickens.find(k=>k.data.id==ed.dataset.edit); if(c){ closeFlock(); openModal(c); } }
});
setInterval(()=>{ if($('flock').classList.contains('open')) renderFlock(); },3000);

/* ---------- dressing room: drag each worn item to wherever you like ---------- */
let dressC=null, dressSl='hat';
function openDress(c){
  dressC=c; dressSl=['hat','face','neck','back'].find(sl=>c.data[sl]!=='none')||'hat';
  $('dress').classList.add('open'); renderDress();
}
function closeDress(){ $('dress').classList.remove('open'); dressC=null; save(); if($('flock').classList.contains('open')) renderFlock(); }
$('dress').addEventListener('pointerdown', e=>{ if(e.target===$('dress')) closeDress(); });
function setPl(sl,patch){
  const d=dressC.data; d.pl=d.pl||{}; d.pl[sl]=Object.assign(layoutOf(d,sl),patch); setHat(dressC);
}
function renderDress(){
  const c=dressC, d=c.data, W=Math.max(200,Math.min(300,$('dsheet').clientWidth-28)), U=W*.72, ax=W/2, ay=U*.62+W*.08;
  const worn=['hat','face','neck','back'].filter(sl=>d[sl]!=='none');
  let h=`<h2>🎨 จัดตำแหน่ง · ${d.name} <button class="x" id="xD">✕</button></h2>`;
  h+=`<div id="dstage" style="width:${W}px;height:${W*1.05}px">`;
  const acc=sl=>d[sl]==='none'?'':`<div class="da ${sl===dressSl?'sel':''}" data-sl="${sl}" style="left:${ax}px;top:${ay}px">${d[sl]}</div>`;
  h+=acc('back')+`<img src="${c.img.src}" alt="" style="left:${ax}px;top:${ay}px;width:${U}px;translate:-50% -62%">`+acc('hat')+acc('face')+acc('neck')+`</div>`;
  if(!worn.length) h+=`<div style="text-align:center;font-size:13px;margin:8px 0">ยังไม่ได้ใส่อะไร ไปเลือกที่หน้าฝูงไก่ก่อน</div>`;
  else {
    h+=`<div class="dctl">${worn.map(sl=>`<button class="hb ${sl===dressSl?'on':''}" data-sel="${sl}" title="${SLOTS[sl]}">${d[sl]}</button>`).join('')}</div>`;
    h+=`<div class="dctl"><button class="hb" data-ctl="s-">➖ เล็ก</button><button class="hb" data-ctl="s+">➕ ใหญ่</button><button class="hb" data-ctl="r-">↺</button><button class="hb" data-ctl="r+">↻</button><button class="hb" data-ctl="reset">รีเซ็ตชิ้นนี้</button></div>`;
    h+=`<div style="font-size:12px;opacity:.7;text-align:center">แตะเลือกชิ้น แล้วลากไปวางตรงไหนก็ได้ · ไก่ที่เดินอยู่ในฟาร์มจะใช้ตำแหน่งนี้ด้วย</div>`;
  }
  h+=`<button class="big" id="xD2">เสร็จ</button>`;
  $('dsheet').innerHTML=h;
  $('dstage').querySelectorAll('.da').forEach(el=>placeAcc(el, layoutOf(d,el.dataset.sl), U, false));
}
$('dsheet').addEventListener('pointerdown', e=>{
  const el=e.target.closest('.da'); if(!el||!dressC) return;
  e.preventDefault();
  const sl=el.dataset.sl; if(dressSl!==sl){ dressSl=sl; document.querySelectorAll('#dstage .da').forEach(x=>x.classList.toggle('sel',x===el)); document.querySelectorAll('#dsheet [data-sel]').forEach(x=>x.classList.toggle('on',x.dataset.sel===sl)); }
  const U=parseFloat($('dstage').querySelector('img').style.width), l0=layoutOf(dressC.data,sl), sx=e.clientX, sy=e.clientY;
  const mv=ev=>{
    const x=clamp(l0.x+(ev.clientX-sx)/U,-1,1), y=clamp(l0.y+(ev.clientY-sy)/U,-1,.6);
    setPl(sl,{x,y}); placeAcc(el, layoutOf(dressC.data,sl), U, false);
  };
  const up=()=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); removeEventListener('pointercancel',up); save(); };
  addEventListener('pointermove',mv); addEventListener('pointerup',up); addEventListener('pointercancel',up);
});
$('dsheet').addEventListener('click', e=>{
  if(e.target.id==='xD'||e.target.id==='xD2') return closeDress();
  const sel=e.target.closest('[data-sel]');
  if(sel){ dressSl=sel.dataset.sel; return renderDress(); }
  const b=e.target.closest('[data-ctl]'); if(!b||!dressC) return;
  const l=layoutOf(dressC.data,dressSl), k=b.dataset.ctl;
  if(k==='s-') setPl(dressSl,{s:clamp(l.s*.9,.08,.7)});
  else if(k==='s+') setPl(dressSl,{s:clamp(l.s*1.1,.08,.7)});
  else if(k==='r-') setPl(dressSl,{r:l.r-10});
  else if(k==='r+') setPl(dressSl,{r:l.r+10});
  else if(k==='reset'){ if(dressC.data.pl) delete dressC.data.pl[dressSl]; setHat(dressC); }
  save(); renderDress();
});

/* ---------- online leaderboard (Supabase; anon key is public by design, writes only go through the submit_score RPC) ---------- */
const SB_URL = 'https://hgfqnwpttuqvdcoignvb.supabase.co';
const SB_KEY = 'sb_publishable_9_GQVCo2TQrVmJTBKKOIXg_RYSFuT4X';
if(!S.playerId) S.playerId = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); }));
async function sb(path, opt={}){
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),8000);
  try{
    return await fetch(SB_URL+'/rest/v1/'+path, Object.assign({signal:ctl.signal}, opt, {headers:Object.assign({apikey:SB_KEY,'Content-Type':'application/json'}, opt.headers)}));
  } finally { clearTimeout(t); }
}
let lastSent='';
async function submitScore(force, unload){
  if(!S.nick) return false;
  const body=JSON.stringify({p_id:S.playerId, p_name:S.nick, p_level:S.level, p_eggs:Math.floor(S.totalEggs)});
  if(!force && body===lastSent) return true;
  try{
    const r=await sb('rpc/submit_score',{method:'POST', body, keepalive:!!unload});
    if(r.ok){ lastSent=body; return true; }
  }catch(e){}
  return false; // offline or server hiccup: just try again next time
}
setInterval(()=>submitScore(false), 120000);
addEventListener('pagehide', ()=>submitScore(false,true));
function openLb(){ $('lb').classList.add('open'); renderLb(null); loadLb(); }
function closeLb(){ $('lb').classList.remove('open'); }
$('lb').addEventListener('pointerdown', e=>{ if(e.target===$('lb')) closeLb(); });
$('bLb').onclick = openLb;
async function loadLb(){
  let data=null, rank=null;
  try{
    if(S.nick) await submitScore(true);
    const r=await sb('leaderboard?select=player_id,name,level,total_eggs&order=level.desc,total_eggs.desc&limit=20');
    if(r.ok) data=await r.json();
    if(data && S.nick && !data.some(x=>x.player_id===S.playerId)){
      const q=await sb(`leaderboard?select=player_id&or=(level.gt.${S.level},and(level.eq.${S.level},total_eggs.gt.${Math.floor(S.totalEggs)}))`,{headers:{Prefer:'count=exact',Range:'0-0','Range-Unit':'items'}});
      const m=/\/(\d+)$/.exec(q.headers.get('content-range')||''); if(m) rank=+m[1]+1;
    }
  }catch(e){}
  if($('lb').classList.contains('open')) renderLb(data||false, rank);
}
const esc = t => String(t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderLb(data, rank){
  let h=`<h2>🏆 ตารางอันดับ <button class="x" id="xL">✕</button></h2>`;
  h+=S.nick
    ? `<div class="bonus">คุณคือ <b>${esc(S.nick)}</b> · Lv.${S.level} · ไข่รวม ${Math.floor(S.totalEggs)}${rank?` · อันดับ ${rank}`:''}</div>`
    : `<div class="bonus">ตั้งชื่อเล่นเพื่อเข้าตารางอันดับ (ไม่เกิน 12 ตัวอักษร ทุกคนเห็นชื่อนี้)</div>`;
  h+=`<input type="text" id="nickIn" maxlength="12" placeholder="ชื่อเล่นในตาราง" value="${esc(S.nick)}"><button class="big" id="saveNick">${S.nick?'เปลี่ยนชื่อ':'เข้าร่วมตาราง'}</button>`;
  h+=`<h3>Top 20 · จัดอันดับตามเลเวล แล้วตามจำนวนไข่รวม</h3>`;
  if(data===null) h+=`<div style="text-align:center;padding:14px;font-size:13px">กำลังโหลด...</div>`;
  else if(data===false) h+=`<div style="text-align:center;padding:14px;font-size:13px">โหลดตารางไม่ได้ (ออฟไลน์หรือเซิร์ฟเวอร์ไม่ตอบ) ลองใหม่ภายหลัง · เกมยังเล่นต่อได้ปกติ</div>`;
  else if(!data.length) h+=`<div style="text-align:center;padding:14px;font-size:13px">ยังไม่มีใครในตาราง เป็นคนแรกเลย!</div>`;
  else data.forEach((x,i)=>{
    const me=x.player_id===S.playerId, medal=['🥇','🥈','🥉'][i]||`${i+1}.`;
    h+=`<div class="cr" style="${me?'background:#fff3d6;border-radius:10px;padding-left:6px':''}"><div class="ic" style="font-size:${i<3?24:15}px;font-weight:800">${medal}</div>
      <div class="tx"><b>${esc(x.name)}${me?' (คุณ)':''}</b><br>Lv.${x.level} · ${STAGES[stageOf(x.level)].n} · ไข่ ${x.total_eggs}</div></div>`;
  });
  const st=$('lsheet').scrollTop; const had=document.activeElement&&document.activeElement.id==='nickIn', v=had?document.activeElement.value:null;
  $('lsheet').innerHTML=h; $('lsheet').scrollTop=st;
  if(had){ const n=$('nickIn'); n.value=v; n.focus(); }
}
$('lsheet').addEventListener('click', async e=>{
  if(e.target.id==='xL') return closeLb();
  if(e.target.id==='saveNick'){
    const nm=$('nickIn').value.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,12);
    if(!nm) return toast('ใส่ชื่อเล่นก่อนนะ');
    S.nick=nm; save(); e.target.disabled=true;
    const ok=await submitScore(true);
    toast(ok?'เข้าตารางอันดับแล้ว!':'ส่งคะแนนไม่สำเร็จ จะลองใหม่อัตโนมัติ');
    loadLb();
  }
});
if(!S.nick && !S.lbHint) setTimeout(()=>{ S.lbHint=true; save(); toast('แตะ 🏆 ด้านบนเพื่อเข้าตารางอันดับออนไลน์'); }, 25000);

/* ---------- gacha ---------- */
let lastPulls=[];
function openGacha(){ $('gacha').classList.add('open'); renderGacha(); }
function closeGacha(){ $('gacha').classList.remove('open'); lastPulls=[]; if($('flock').classList.contains('open')) renderFlock(); }
$('gacha').addEventListener('pointerdown', e=>{ if(e.target===$('gacha')) closeGacha(); });
function rollGear(){
  S.pity++;
  let r;
  if(S.pity>=PITY) r = Math.random()<.2 ? 'l' : 'e';
  else { const x=Math.random()*100; r = x<2?'l':x<12?'e':x<40?'r':'c'; }
  if(r==='e'||r==='l') S.pity=0;
  const g=pick(GEAR.filter(k=>k.r===r)), had=S.gear[g.id]||0;
  S.gear[g.id]=had+1; S.pulls++;
  return {g, isNew:!had, lv:Math.min(3,had+1), maxed:had>=3};
}
function doPull(n){
  const cost = n===10 ? PULL10 : PULL1;
  if(S.coins<cost) return toast('เหรียญไม่พอ');
  S.coins-=cost; lastPulls=[];
  for(let i=0;i<n;i++) lastPulls.push(rollGear());
  const top=lastPulls.reduce((m,x)=>'cresl'.indexOf(x.g.r)>'cresl'.indexOf(m)?x.g.r:m,'c');
  beep(600,.1,'triangle',.06); setTimeout(()=>beep(top==='l'?1500:top==='e'?1200:900,.2,'triangle',.07),150);
  if(top==='e'||top==='l') buzz(40);
  chickens.forEach(updateSize); render(); save(); renderGacha();
}
function renderGacha(){
  let h=`<h2>🎰 กาชาเครื่องแต่งกาย <span style="font-size:15px">🪙 ${Math.floor(S.coins)}</span><button class="x" id="xG">✕</button></h2>`;
  if(lastPulls.length){
    h+=`<div class="gg">${lastPulls.map((x,i)=>`<div class="gc" style="border-color:${RARITY[x.g.r].col};animation-delay:${i*60}ms"><i>${x.g.id}</i><span style="color:${RARITY[x.g.r].col}">${x.g.n}</span><br>${x.isNew?'✨ใหม่!':x.maxed?'Lv.3 (MAX)':'Lv.'+x.lv+' ⬆'}</div>`).join('')}</div>`;
  }
  h+=`<button class="big" data-pull="1" ${S.coins<PULL1?'disabled':''}>สุ่ม 1 ครั้ง · ${PULL1} 🪙</button>`;
  h+=`<button class="big" data-pull="10" ${S.coins<PULL10?'disabled':''}>สุ่ม 10 ครั้ง · ${PULL10} 🪙</button>`;
  h+=`<div style="font-size:12px;opacity:.75;margin-top:6px">โอกาส: ธรรมดา 60% · หายาก 28% · หายากมาก 10% · ตำนาน 2% · การันตีหายากมากขึ้นไปใน ${Math.max(1,PITY-S.pity)} ครั้ง</div>`;
  h+=`<h3>คลังเครื่องแต่งกาย (${GEAR.filter(g=>S.gear[g.id]).length}/${GEAR.length})</h3>`;
  Object.entries(SLOTS).forEach(([sl,lab])=>{
    h+=`<div class="lab" style="font-size:12px;font-weight:800;margin-top:8px">${lab}</div>`;
    GEAR.filter(g=>g.slot===sl).forEach(g=>{
      const own=S.gear[g.id], R=RARITY[g.r];
      h+= own ? `<div class="cr"><div class="ic">${g.id}</div><div class="tx"><b style="color:${R.col}">${g.n}</b> · ${R.n} · Lv.${gearLv(g.id)}<br>${gearDesc(g)}</div></div>`
              : `<div class="cr" style="opacity:.5"><div class="ic">❔</div><div class="tx"><b style="color:${R.col}">???</b> · ${R.n}</div></div>`;
    });
  });
  h+=`<button class="big" id="xG2" style="background:#999;border-bottom-color:#777">ปิด</button>`;
  const st=$('gsheet').scrollTop; $('gsheet').innerHTML=h; $('gsheet').scrollTop=st;
}
$('gsheet').addEventListener('click', e=>{
  if(e.target.id==='xG'||e.target.id==='xG2') return closeGacha();
  const b=e.target.closest('[data-pull]'); if(b&&!b.disabled) doPull(+b.dataset.pull);
});

/* ---------- rename / recolour modal ---------- */
let editing=null, draftColor=null, draftName='';
function openModal(c){ editing=c; draftColor=c.data.color; draftName=c.data.name; $('modal').classList.add('open'); renderModal(); }
function closeModal(){ $('modal').classList.remove('open'); editing=null; }
$('modal').addEventListener('pointerdown', e=>{ if(e.target===$('modal')) closeModal(); });
function renderModal(){
  const d=editing.data;
  let h=`<h2>${isAdult(d)?'🐔':'🐥'} ข้อมูลไก่ <button class="x" id="xM">✕</button></h2>`;
  h+=`<input type="text" id="nameIn" maxlength="12" placeholder="ตั้งชื่อไก่" value="">`;
  h+=`<h3>สีขน <span style="font-weight:600">(🪙 ${Math.floor(S.coins)})</span></h3><div class="swatches">`;
  Object.entries(COLORS).forEach(([k,C])=>{
    const owned=S.colors.includes(k);
    h+=`<button class="sw ${draftColor===k?'sel':''} ${owned?'':'lock'}" data-col="${k}"><i style="background:${C.hex}"></i>${C.name}<br>${owned?'✔':'🔒 '+C.price+'🪙'}</button>`;
  });
  h+=`</div><button class="big" id="saveM">บันทึก</button>`;
  $('msheet').innerHTML=h;
  $('nameIn').value = draftName;
  $('nameIn').oninput = e=>{ draftName=e.target.value; };
}
$('msheet').addEventListener('click', e=>{
  if(e.target.id==='xM') return closeModal();
  const sw=e.target.closest('.sw');
  if(sw){
    const k=sw.dataset.col, C=COLORS[k];
    if(!S.colors.includes(k)){
      if(S.coins<C.price) return toast('เหรียญไม่พอ');
      S.coins-=C.price; S.colors.push(k); toast(`ปลดล็อกสี${C.name}แล้ว`); beep(900,.12,'triangle',.07);
    }
    draftColor=k; render(); renderModal(); return;
  }
  if(e.target.id==='saveM'){
    const nm=draftName.trim().slice(0,12);
    if(nm) editing.data.name=nm;
    editing.data.color=draftColor; refreshLook(editing); updateSize(editing);
    closeModal(); save(); render(); toast('บันทึกแล้ว');
  }
});

/* ---------- buttons ---------- */
$('bFeed').onclick = ()=>feed();
$('bWash').onclick = wash;
$('bSell').onclick = sell;
$('bShop').onclick = openShop;

/* ---------- init ---------- */
S.flock.forEach(build);
chickens.forEach(wander);
render(); say('idle');
setTimeout(()=>{ if(Math.random()<.5) spawnItem('poop','💩'); }, 4000);
if(!S.totalPets) setTimeout(()=>toast('แตะชื่อไก่เพื่อเปลี่ยนชื่อ/สี'), 1800);
})();
