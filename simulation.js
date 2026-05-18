const canvas = document.getElementById('canvas');
const SCALE = 3;
const W = Math.floor(canvas.parentElement.offsetWidth / SCALE) || 200;
const H = Math.floor(400 / SCALE);
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const EMPTY = 0, SAND = 1, WATER = 2, STONE = 3, FIRE = 4, SMOKE = 5;

const MATERIALS = [
  { id: SAND,  name: 'Sand',  swatch: '#C8A96E' },
  { id: WATER, name: 'Water', swatch: '#3B8BD4' },
  { id: STONE, name: 'Stone', swatch: '#888780' },
  { id: FIRE,  name: 'Fire',  swatch: '#E8593C' },
];

let grid = new Uint8Array(W * H);
let colorGrid = new Uint32Array(W * H);
let currentMat = SAND;

function idx(x,y) { return y * W + x; }
function inBounds(x,y) { return x>=0&&x<W&&y>=0&&y<H; }
function get(x,y) { return inBounds(x,y) ? grid[idx(x,y)] : STONE; }
function set(x,y,m,col) { if(!inBounds(x,y)) return; grid[idx(x,y)]=m; colorGrid[idx(x,y)]=col||0; }

function matColor(m) {
  const v = 1 + (Math.random()*0.15 - 0.075);
  if(m===SAND) return hsl(38, 55, Math.floor(58*v));
  if(m===WATER) return hsl(210, 65, Math.floor(52*v));
  if(m===STONE) return hsl(40, 4, Math.floor(55*v));
  if(m===FIRE) { const h = 10 + Math.random()*25; return hsl(h, 90, 50 + Math.random()*15); }
  if(m===SMOKE) return hsl(0, 0, Math.floor(60+Math.random()*20));
  return 0;
}
function hsl(h,s,l) {
  const a=s*Math.min(l,100-l)/100, f=n=>{ const k=(n+h/30)%12; return l-a*Math.max(Math.min(k-3,9-k,1),-1); };
  const r=Math.round(f(0)*2.55),g=Math.round(f(8)*2.55),b=Math.round(f(4)*2.55);
  return 0xFF000000|(b<<16)|(g<<8)|r;
}

function stepSand(x,y) {
  if(get(x,y+1)===EMPTY) { set(x,y+1,SAND,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  const dir = Math.random()<0.5?-1:1;
  if(get(x,y+1)===WATER) { const wc=colorGrid[idx(x,y+1)]; set(x,y+1,SAND,colorGrid[idx(x,y)]); set(x,y,WATER,wc); return; }
  if(get(x+dir,y+1)===EMPTY||get(x+dir,y+1)===WATER) { set(x+dir,y+1,SAND,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  if(get(x-dir,y+1)===EMPTY||get(x-dir,y+1)===WATER) { set(x-dir,y+1,SAND,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
}
function stepWater(x,y) {
  if(get(x,y+1)===EMPTY) { set(x,y+1,WATER,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  const dir = Math.random()<0.5?-1:1;
  if(get(x+dir,y+1)===EMPTY) { set(x+dir,y+1,WATER,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  if(get(x-dir,y+1)===EMPTY) { set(x-dir,y+1,WATER,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  if(get(x+dir,y)===EMPTY) { set(x+dir,y,WATER,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  if(get(x-dir,y)===EMPTY) { set(x-dir,y,WATER,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
}
function stepFire(x,y) {
  colorGrid[idx(x,y)] = matColor(FIRE);
  if(Math.random()<0.015) { set(x,y,EMPTY,0); return; }
  if(Math.random()<0.05 && get(x,y-1)===EMPTY) { set(x,y-1,SMOKE,matColor(SMOKE)); }
  const dx=Math.floor(Math.random()*3)-1, dy=Math.floor(Math.random()*3)-1;
  const nx=x+dx,ny=y+dy;
  if(inBounds(nx,ny)&&get(nx,ny)===WATER) set(nx,ny,EMPTY,0);
}
function stepSmoke(x,y) {
  if(Math.random()<0.02) { set(x,y,EMPTY,0); return; }
  const dir=Math.random()<0.5?-1:1;
  if(get(x,y-1)===EMPTY) { set(x,y-1,SMOKE,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  if(get(x+dir,y-1)===EMPTY) { set(x+dir,y-1,SMOKE,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
  if(get(x+dir,y)===EMPTY) { set(x+dir,y,SMOKE,colorGrid[idx(x,y)]); set(x,y,EMPTY,0); return; }
}

let updated = new Uint8Array(W * H);
function step() {
  updated.fill(0);
  for(let y=H-1;y>=0;y--) {
    const ltr = Math.random()<0.5;
    for(let xi=0;xi<W;xi++) {
      const x = ltr ? xi : W-1-xi;
      const i=idx(x,y);
      if(updated[i]) continue;
      const m=grid[i];
      if(m===SAND) { stepSand(x,y); updated[i]=1; }
      else if(m===WATER) { stepWater(x,y); updated[i]=1; }
      else if(m===FIRE) { stepFire(x,y); updated[i]=1; }
      else if(m===SMOKE) { stepSmoke(x,y); updated[i]=1; }
    }
  }
}

const imgData = ctx.createImageData(W, H);
const buf = new Uint32Array(imgData.data.buffer);
const BG = hsl(0,0,97);

function render() {
  let count=0;
  for(let i=0;i<W*H;i++) {
    buf[i] = grid[i]===EMPTY ? BG : colorGrid[i];
    if(grid[i]!==EMPTY) count++;
  }
  ctx.putImageData(imgData,0,0);
  document.getElementById('particleCount').textContent = count + ' particles';
}

function clearGrid() { grid.fill(0); colorGrid.fill(0); }
document.getElementById('clearBtn').addEventListener('click', clearGrid);

let painting = false;
function paint(cx,cy) {
  const r = parseInt(document.getElementById('brushSize').value);
  for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) {
    if(dx*dx+dy*dy>r*r) continue;
    const px=cx+dx,py=cy+dy;
    if(!inBounds(px,py)) continue;
    if(currentMat===STONE || grid[idx(px,py)]===EMPTY || currentMat===FIRE) {
      set(px,py,currentMat,matColor(currentMat));
    }
  }
}
function evtXY(e) {
  const rect=canvas.getBoundingClientRect();
  const scaleX=W/rect.width, scaleY=H/rect.height;
  return [Math.floor((e.clientX-rect.left)*scaleX), Math.floor((e.clientY-rect.top)*scaleY)];
}
canvas.addEventListener('mousedown',e=>{painting=true;const[x,y]=evtXY(e);paint(x,y);});
canvas.addEventListener('mousemove',e=>{ if(!painting) return; const[x,y]=evtXY(e); paint(x,y); });
canvas.addEventListener('mouseup',()=>painting=false);
canvas.addEventListener('mouseleave',()=>painting=false);

document.getElementById('brushSize').oninput=e=>{
  document.getElementById('brushVal').textContent=e.target.value;
};

// Material buttons
document.querySelectorAll('.mat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMat = parseInt(btn.dataset.mat);
  });
});

function loop() { step(); render(); requestAnimationFrame(loop); }
loop();