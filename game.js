/* ═══════════════════════════════════════════════════════════
   백수 위기 탈출: 실업 시티 — 학생용 게임
   (Firebase 열쇠는 shared.js 에서만 고칩니다)
   ═══════════════════════════════════════════════════════════ */
(async () => {
'use strict';
if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {      // 구형 브라우저 대비
  r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
const { TYPES, TK, NONE, tinfo, CAUSES, POLICIES, CHAPTERS, CASES, TRAPS, JOBS, shuffle, pick, rnd, esc, won } = UC;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ───────── 저장소 ───────── */
const QS0 = new URLSearchParams(location.search), SOLO = QS0.get('solo') != null;       // ?solo=1 → 혼자 하기 (진행판 없이, 기록은 이 기기에만)
const store = await UC.makeStore(ok => { $('#conn').textContent = ok ? '' : '⚠️ 연결이 불안정해요 — 새로고침 해 보세요'; }, SOLO);
const DEMO = !UC.hasKey;
if (SOLO) $('#conn').textContent = '🎮 혼자 하기 모드 — 선생님 화면 없이 처음부터 끝까지'; else if (DEMO) $('#conn').textContent = '체험 모드 (Firebase 열쇠 없음)';
const QS = new URLSearchParams(location.search);
const SPEED = DEMO ? Math.max(1, +QS.get('speed') || 1) : 1;      // 체험 모드 점검용
const sleep = ms => new Promise(r => setTimeout(r, ms / SPEED));
UC.handDrawn();          // 화면의 이모지를 전부 손그림으로
const LS = {
  get(k, d) { try { const v = localStorage.getItem((SOLO ? 'unempCitySolo.' : 'unempCity.') + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem((SOLO ? 'unempCitySolo.' : 'unempCity.') + k, JSON.stringify(v)); } catch (e) {} }
};

/* ───────── 상태 ───────── */
let S = {}, me = null, P = null, stateWaiters = [];
const fresh = () => ({ ch: 0, step: 0, money: 300000, rec: {}, job: null, quiz: { ok: 0, n: 0 }, cs: {}, fx: {}, done: false, emp: 0, npc: {}, essay: null });
const sec = s => (S.fast ? s / 2 : s);                          // 빨리 감기
function save(extra = {}) {
  if (!me) return Promise.resolve();
  const doc = JSON.parse(JSON.stringify({ name: me.name, ch: P.ch, step: P.step, money: P.money, rec: P.rec, job: P.job,
    quiz: P.quiz, cs: P.cs, fx: P.fx, done: P.done, emp: P.emp, npc: P.npc, essay: P.essay, seen: Date.now(), ...extra }));          // undefined 값 제거 (Firestore 오류 방지)
  return Promise.resolve(store.setPlayer(me.id, doc)).catch(e => console.warn(e));
}
const nextState = () => new Promise(r => stateWaiters.push(r));

/* ───────── 소리 ───────── */
let AC = null, muted = LS.get('muted', false);
function beep(kind) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    const seq = { ok: [[880, 0, .09], [1320, .08, .14]], bad: [[220, 0, .18], [180, .1, .2]], tap: [[660, 0, .05]], coin: [[1568, 0, .07], [2093, .07, .12]],
      pass: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]], fail: [[392, 0, .25], [311, .25, .25], [233, .5, .5]],
      step: [[150, 0, .035]], vroom: [[90, 0, .3], [130, .12, .3]], news: [[784, 0, .1], [988, .1, .1], [1175, .2, .18]],
      honk: [[415, 0, .26], [523, 0, .26]], phone: [[1318, 0, .08], [1568, .1, .08], [1318, .22, .08], [1568, .32, .08]] }[kind] || [];
    seq.forEach(([f, d, len]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' || kind === 'fail' || kind === 'vroom' ? 'sawtooth' : kind === 'step' ? 'triangle' : 'square'; o.frequency.value = f * (kind === 'step' ? .8 + Math.random() * .5 : 1);
      g.gain.setValueAtTime(kind === 'step' ? .16 : .07, t + d); g.gain.exponentialRampToValueAtTime(.0001, t + d + len);
      o.connect(g).connect(AC.destination); o.start(t + d); o.stop(t + d + len + .02);
    });
  } catch (e) {}
}
$('#mute').textContent = muted ? '🔇' : '🔊';
$('#mute').onclick = () => { muted = !muted; LS.set('muted', muted); $('#mute').textContent = muted ? '🔇' : '🔊'; };
/* 📻 라디오 — 태블릿에서는 기본 꺼짐 (누를 때마다 채널이 바뀜) */
const radioBtn = () => { $('#radio').textContent = UC.Radio.label(); $('#radio').classList.toggle('on', UC.Radio.cur >= 0); };
$('#radio').onclick = () => { LS.set('radio', UC.Radio.next()); radioBtn(); };
if (LS.get('radio', -1) >= 0) addEventListener('pointerdown', () => { UC.Radio.set(LS.get('radio', -1)); radioBtn(); }, { once: true });

/* ───────── 화면 도우미 ───────── */
let toastT = null;
function toast(msg, kind = '') { const t = $('#toast'); t.textContent = msg; t.className = 'on ' + kind; clearTimeout(toastT); toastT = setTimeout(() => t.className = kind, 1900); }
function stage(html) { const s = $('#stage'); s.innerHTML = html; s.classList.add('on'); s.scrollTop = 0; City.pause(true); return s; }
function closeStage() { const s = $('#stage'); s.classList.remove('on'); s.innerHTML = ''; City.pause(false); }
function fly(text, x, y, color = '#7bd66b') {
  const d = document.createElement('div'); d.className = 'fly'; d.textContent = text; d.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
}
function hud() {
  if (!P) return;
  $('#money').textContent = won(P.money);
  const pct = clamp(P.money / 1200000 * 100, 3, 100);
  $('#gauge i').style.width = pct + '%'; $('#gauge').classList.toggle('low', P.money < 200000);
  $('#badges').innerHTML = TK.map(k => `<b class="${P.rec[k]?.clear ? 'on' : ''}" title="${TYPES[k].name}">★</b>`).join('');
  $('#xp i').style.width = TK.filter(k => P.rec[k]?.clear).length * 25 + '%';
}
function addMoney(d, label) {
  P.money = Math.max(0, P.money + d); hud();
  const r = $('#money').getBoundingClientRect();
  fly(`${d >= 0 ? '+' : '−'}${won(Math.abs(d)).slice(1)} ${label || ''}`, Math.max(10, r.left - 40), r.bottom + 4, d >= 0 ? '#7bd66b' : '#ff4d6d');
  beep(d >= 0 ? 'coin' : 'bad');
}
function objective(ch, text) { $('#hudCh').textContent = ch || ''; $('#hudObj').innerHTML = esc(text || '').replace(/\(노란 표시\)/, '<span style="color:#ffd23f">(노란 표시)</span>'); }
async function missionCard(a, b) {
  const m = $('#mtitle'); m.querySelector('.a').textContent = a; m.querySelector('.b').textContent = b;
  m.classList.add('on'); beep('pass'); await sleep(2300); m.classList.remove('on'); await sleep(300);
}
async function banner(big, small, cls = 'y', ms = 2400) {
  const b = $('#banner'); b.querySelector('.big').className = 'big gt ' + cls; b.querySelector('.big').textContent = big;
  b.querySelector('.sm').textContent = small || ''; b.classList.add('on');
  await sleep(ms); b.classList.remove('on');
}
/* 운전할 때 엔진 소리 */
let eng = null;
function engine(on) {
  try { if (on && !muted && !eng) { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 62; o2.type = 'square'; o2.frequency.value = 93; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = .05; o.connect(f); o2.connect(f); f.connect(g); g.connect(AC.destination); o.start(); o2.start(); eng = { o, o2 }; beep('vroom'); }
    else if (!on && eng) { eng.o.stop(); eng.o2.stop(); eng = null; } } catch (e) { eng = null; }
}
/* 📻 라디오 뉴스 속보: 화면 위 자막 + (라디오를 켰으면) 목소리 */
let newsT = null;
function news(text) {
  const n = $('#news'); n.querySelector('span').textContent = text; n.classList.add('on'); beep('news'); UC.Radio.duck(4200 / SPEED);
  clearTimeout(newsT); newsT = setTimeout(() => n.classList.remove('on'), 6500 / SPEED);
  try { if (UC.Radio.cur >= 0 && !muted && window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('실업 FM 뉴스 속보. ' + text); u.lang = 'ko-KR'; u.rate = 1.08; speechSynthesis.speak(u); } } catch (e) {}
}
let talkBusy = false;          // 행인과 대화 중이면 미션 대사는 잠깐 기다림
/* 미션 완료 화면: 제목 + 기록 줄 + 메달 */
async function passed(title, rows, medal) {
  const b = $('#pass'); beep('pass'); UC.Radio.duck(2800 / SPEED);
  b.innerHTML = `<div class="pz"><div class="pt gt y">${title}</div><div class="pl"></div>${rows.map(([k, v], i) => `<div class="pr" style="animation-delay:${.25 + i * .22}s"><span>${k}</span><b>${v}</b></div>`).join('')}<div class="pm" style="animation-delay:${.3 + rows.length * .22}s">${medal || ''}</div></div>`;
  b.classList.add('on'); await sleep(3400); b.classList.remove('on');
}
const medalOf = (v, gold, silver) => v >= gold ? '🥇 GOLD' : v >= silver ? '🥈 SILVER' : '🥉 BRONZE';
async function wasted(small) {            // 화면이 회색으로 — 실직 연출
  document.body.classList.add('gray'); beep('fail'); UC.Radio.duck(3000 / SPEED);
  await banner('실직', small, 'r', 3000);
  document.body.classList.remove('gray');
}

/* 자막 대화: [{who, e, t}] */
async function say(lines, own) {
  while (talkBusy && !own) await sleep(250);
  return new Promise(res => {
    const box = $('#sub'), who = box.querySelector('.who'), txt = box.querySelector('.txt'), face = box.querySelector('.face');
    let i = 0, typing = null, full = '', done = false;
    const show = () => {
      const L = lines[i]; who.textContent = L.who || ''; face.innerHTML = UC.face(L.e) || UC.icon(UC.iconName(L.e || '') || 'talk'); full = L.t; txt.textContent = '';
      const t0 = performance.now(); clearInterval(typing);
      typing = setInterval(() => { const n = Math.floor((performance.now() - t0) * SPEED / 11); txt.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 30);
    };
    const next = () => {
      if (done) return;
      if (typing) { clearInterval(typing); typing = null; txt.textContent = full; return; }
      beep('tap'); i++;
      if (i >= lines.length) { done = true; City.talkCam(false); if (!talkBusy) City.freeze(false); box.classList.remove('on'); box.onclick = null; $('#mapBox').style.visibility = ''; res(); } else show();
    };
    box.classList.add('on'); box.onclick = next; show(); $('#mapBox').style.visibility = 'hidden'; City.talkCam(true); City.freeze(true);
    if (SPEED > 1) { const auto = setInterval(() => { if (done) clearInterval(auto); else next(); }, 60); }
  });
}

/* 선택 문제: 틀리면 되물어 주고, 맞힐 때까지 */
function choose({ tag, title, sub, opts, correct, onWrong, cols = 1 }) {
  return new Promise(res => {
    let first = null, tries = 0;
    const s = stage(`<div class="full dim"><div class="pn stripe" style="display:flex;flex-direction:column;gap:12px;align-items:center">
      ${tag ? `<div class="gt y h2">${tag}</div>` : ''}
      <div class="gt h1">${title}</div>${sub ? `<div class="lead">${sub}</div>` : ''}
      <div class="opts ${cols === 2 ? 'c2' : ''}">${opts.map(o => `<button class="opt" data-k="${o.k}" style="--c:${o.c || 'var(--y)'}"><span class="e">${o.e || ''}</span><span>${o.x}</span></button>`).join('')}</div>
      <div class="ask"></div></div></div>`);
    s.querySelectorAll('.opt').forEach(b => b.onclick = async () => {
      const k = b.dataset.k; tries++; if (first == null) first = k;
      if (k === correct) {
        b.classList.add('yes'); beep('ok'); s.querySelectorAll('.opt').forEach(x => x.style.pointerEvents = 'none');
        s.querySelector('.ask').innerHTML = '✅ 정답!';
        await sleep(900); closeStage(); res({ first, tries, ok1: first === correct });
      } else {
        b.classList.add('no'); beep('bad');
        s.querySelector('.ask').innerHTML = '🤔 ' + esc(onWrong ? onWrong(k) : '다시 생각해 볼까?');
      }
    });
    if (SPEED > 1) setTimeout(() => s.querySelector(`.opt[data-k="${correct}"]`)?.click(), 80);
  });
}

/* ═════════════ 도시 엔진 — 위에서 내려다보는 시점 + 입체 건물(시차) + 조명·날씨 ═════════════ */
const City = (() => {
  const RB = true;   // 블록 장난감풍 (밝은 하늘·돌기 바닥·둥근 머리)
  const use3D = !!window.THREE && QS.get('2d') == null && (QS.get('3d') != null || LS.get('gfx', '') !== '2d') && (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  const cv = $('#city'), cx = (use3D ? document.createElement('canvas') : cv).getContext('2d'), rd = $('#radar'), rx = rd.getContext('2d');
  let camYaw = 0, G3 = null, ema = 16, frames = 0, lowQ = 0;
  const W = 1664, H = 1152;
  const VR = [[320, 448], [768, 896], [1216, 1344]], HR = [[256, 384], [704, 832]];           // 도로
  const BX = [[0, 320], [448, 768], [896, 1216], [1344, 1664]], BY = [[0, 256], [384, 704], [832, 1152]];
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } return `rgb(${r | 0},${g | 0},${b | 0})`; };
  // 건물: 위치·크기, z=높이, c=색, n=간판, roof=지붕 종류, neon=간판 색
  const B = [
    { x: 30, y: 30, w: 120, h: 96, z: .09, c: '#b5533c', n: '근로네 집', roof: 'gable', neon: '#ffd23f' },
    { x: 180, y: 30, w: 110, h: 90, z: .09, c: '#4f6f8f', roof: 'gable' }, { x: 180, y: 146, w: 110, h: 84, z: .09, c: '#77608f', roof: 'gable' },
    { x: 488, y: 26, w: 240, h: 150, z: .34, c: '#34466b', n: 'AI 콜센터', roof: 'tower', neon: '#c58bff' },
    { x: 1374, y: 30, w: 120, h: 130, z: .11, c: '#a8456a', n: '옷 가게', roof: 'shop', neon: '#ff7ab8', shop: 1 }, { x: 1514, y: 30, w: 120, h: 130, z: .11, c: '#3f7a68', n: '서점', roof: 'shop', neon: '#7dffc8', shop: 1 },
    { x: 20, y: 404, w: 96, h: 76, z: .1, c: '#8a2f24', n: '창고', roof: 'barn', neon: '#ffffff' },
    { x: 478, y: 414, w: 160, h: 126, z: .11, c: '#b5651f', n: '근로 식당', roof: 'shop', neon: '#ffb347' }, { x: 658, y: 414, w: 90, h: 126, z: .11, c: '#6a4c7c', n: '카페', roof: 'shop', neon: '#ffd6f5', shop: 1 },
    { x: 478, y: 590, w: 270, h: 86, z: .12, c: '#33707e', n: '마트', roof: 'shop', neon: '#7de3ff', shop: 1 },
    { x: 936, y: 420, w: 240, h: 170, z: .2, c: '#2a5f99', n: '고용 센터', roof: 'civic', neon: '#8fd0ff' },
    { x: 1374, y: 414, w: 110, h: 250, z: .3, c: '#6b7382', roof: 'apt' }, { x: 1524, y: 414, w: 110, h: 250, z: .3, c: '#5f6878', roof: 'apt' },
    { x: 30, y: 872, w: 260, h: 200, z: .16, c: '#555a61', n: '공장', roof: 'factory', neon: '#ffb347' },
    { x: 478, y: 872, w: 260, h: 130, z: .14, c: '#a37a32', n: '학교', roof: 'flat', neon: '#fff3b0' },
    { x: 936, y: 900, w: 240, h: 160, z: .18, c: '#2f7d4f', n: '실업 상담소', roof: 'civic', neon: '#9dffb8' },
    { x: 1374, y: 872, w: 120, h: 110, z: .11, c: '#9c5536', n: '분식', roof: 'shop', neon: '#ffb347', shop: 1 }, { x: 1514, y: 872, w: 120, h: 110, z: .11, c: '#4c6f9c', n: '꽃집', roof: 'shop', neon: '#ff9ecb', shop: 1 },
    { x: 1374, y: 1010, w: 260, h: 100, z: .1, c: '#7c4d78', n: '시장', roof: 'shop', neon: '#ffe27d', shop: 1 }
  ].map((b, i) => { const c = RB ? ['#ff5a5f', '#3fa7ff', '#ffb84d', '#7c5cff', '#ff6fb1', '#2ec4a6', '#e8553a', '#ff8c2b', '#b06bff', '#28b4d8', '#2f8fff', '#9aa7b8', '#8794a6', '#6f7f95', '#ffcc33', '#34c759', '#ff7a45', '#5aa9ff', '#c86bd9'][i] : b.c; return { ...b, c, cl: shade(c, .16), c1: shade(c, -.3), c2: shade(c, -.48) }; });
  const TREES = [[940, 60, 0], [1010, 150, 0], [1110, 70, 0], [1170, 190, 0], [960, 210, 0], [1060, 120, 1], [250, 660, 0], [40, 660, 0], [520, 1060, 1], [700, 1080, 1], [610, 1040, 0], [70, 1110, 0], [240, 1110, 0]];
  BX.forEach(([x0, x1]) => BY.forEach(([y0, y1]) => TREES.push([x0 + 64, y0 + 13, 1], [x1 - 64, y1 - 13, 1])));      // 인도 야자수
  const LAMPS = []; VR.forEach(([x0, x1]) => HR.forEach(([y0, y1]) => LAMPS.push([x0 - 12, y0 - 12], [x1 + 12, y0 - 12], [x0 - 12, y1 + 12], [x1 + 12, y1 + 12])));
  const SPOT = { home: [92, 168], mail: [300, 248], farm: [205, 575], call: [608, 214], rest: [558, 394], center: [1056, 632], counsel: [1056, 866] };
  const CC = ['#ff4d4d', '#ff9f1c', '#2ec4a6', '#3a86ff', '#ffffff', '#8338ec', '#ff6fb1', '#34c759', '#28b4d8'];
  const cars = [];
  HR.forEach(([y0], i) => { for (let k = 0; k < 2; k++) { cars.push({ ax: 'x', lane: y0 + 34, dir: -1, p: 300 + k * 800 + i * 200, v: 95 + k * 25 }); cars.push({ ax: 'x', lane: y0 + 94, dir: 1, p: 100 + k * 900 + i * 300, v: 105 + k * 20 }); } });
  VR.forEach(([x0], i) => { cars.push({ ax: 'y', lane: x0 + 34, dir: 1, p: 200 + i * 300, v: 100 }); cars.push({ ax: 'y', lane: x0 + 94, dir: -1, p: 700 + i * 200, v: 110 }); });
  cars.forEach((c, i) => { c.c = i % 5 === 2 ? '#ffd23f' : rnd(CC); c.taxi = i % 5 === 2; c.len = i % 4 === 1 ? 74 : 62; });
  const SH = ['#e8c39e', '#c68642', '#f1d3b3', '#8d5524'], TS = ['#3a86ff', '#ff006e', '#8338ec', '#fb5607', '#2a9d8f', '#f1faee', '#ffbe0b'];
  const peds = Array.from({ length: 14 }, (_, i) => i < 9
    ? { ax: 'x', p: 100 + Math.random() * 1400, q: [248, 392, 696, 840][i % 4], d: i % 2 ? 1 : -1, sk: rnd(SH), ts: rnd(TS), t: Math.random() * 9 }
    : { ax: 'y', p: 100 + Math.random() * 900, q: [312, 456, 760, 904, 1208][i % 5], d: i % 2 ? 1 : -1, sk: rnd(SH), ts: rnd(TS), t: Math.random() * 9 });

  const pl = { x: SPOT.home[0], y: SPOT.home[1], a: 0, walk: 0, taxi: false, moving: false };
  let target = null, onArrive = null, paused = false, fx = { snow: false, shutter: false, night: false, rain: false }, caption = '';
  const AR = { x0: 6000, y0: 200, x1: 6288, y1: 424, st: [0, 1, 2, 3].map(i => [6048 + i * 64, 238]), tb: [0, 1, 2, 3, 4, 5].map(i => [6060 + (i % 3) * 84, 316 + Math.floor(i / 3) * 66]) };   // 식당 안 (지도 밖)
  AR.obst = [{ x: AR.x0, y: AR.y0, w: 288, h: 20 }, ...AR.tb.map(([x, y]) => ({ x: x - 15, y: y - 12, w: 30, h: 24 }))];
  let talkCam = false, talkOff = null, arena = null, frozen = false, onNear = null, nearId = null; const npcOk = {};
  let joy = null, keys = {}, vw = 0, vh = 0, dpr = 1, scale = 1, camX = 0, camY = 0, ccx = 0, ccy = 0, last = performance.now(), tick = 0;
  const flakes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: .4 + Math.random() }));
  const smoke = Array.from({ length: 8 }, (_, i) => ({ t: i / 8 }));

  /* 바닥 무늬 */
  const pat = (size, base, fn) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size); fn(g, size); return cx.createPattern(c, 'repeat'); };
  const speck = (cols, n) => (g, s) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
  const PAT = {
    road: pat(128, '#4a4f58', speck(['#4f545d', '#464b54'], 120)),
    walk: pat(64, '#c4c8cf', (g, s) => { for (let y = 8; y < s; y += 16) for (let x = 8; x < s; x += 16) { g.fillStyle = 'rgba(0,0,0,.13)'; g.beginPath(); g.arc(x + 1, y + 1, 4.6, 0, 7); g.fill(); g.fillStyle = '#d3d7dd'; g.beginPath(); g.arc(x, y, 4.6, 0, 7); g.fill(); } g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1; g.strokeRect(.5, .5, 32, 32); g.strokeRect(32.5, 32.5, 32, 32); g.strokeRect(32.5, .5, 32, 32); g.strokeRect(.5, 32.5, 32, 32); }),
    grass: pat(64, '#4fc24a', (g, s) => { for (let y = 8; y < s; y += 16) for (let x = 8; x < s; x += 16) { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(x + 1, y + 1, 4.6, 0, 7); g.fill(); g.fillStyle = '#62d45c'; g.beginPath(); g.arc(x, y, 4.6, 0, 7); g.fill(); } }),
    soil: pat(64, '#5d3d20', (g, s) => { speck(['#6b4827', '#4f3319'], 120)(g, s); g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < s; y += 16) g.fillRect(0, y, s, 5); }),
    snow: pat(96, '#e3ecf2', speck(['#f4f8fb', '#d2dfe8'], 300)),
    yard: pat(64, '#b29f77', speck(['#bdaa82', '#a4916a'], 160))
  };
  const ground = {};
  function buildGround(snow) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = PAT.road; g.fillRect(0, 0, W, H);
    // 차선: 노란 겹중앙선 + 흰 가장자리선
    g.lineWidth = 3;
    HR.forEach(([a, b]) => { const m = (a + b) / 2; g.strokeStyle = '#d9a520'; [m - 4, m + 4].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); });
      g.strokeStyle = 'rgba(255,255,255,.55)'; [a + 7, b - 7].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }); });
    VR.forEach(([a, b]) => { const m = (a + b) / 2; g.strokeStyle = '#d9a520'; [m - 4, m + 4].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); });
      g.strokeStyle = 'rgba(255,255,255,.55)'; [a + 7, b - 7].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }); });
    VR.forEach(([x0, x1]) => HR.forEach(([y0, y1]) => {      // 교차로 + 횡단보도 + 정지선
      g.fillStyle = PAT.road; g.fillRect(x0 - 34, y0, x1 - x0 + 68, y1 - y0); g.fillRect(x0, y0 - 34, x1 - x0, y1 - y0 + 68);
      g.fillStyle = '#e6e4da';
      for (let k = 0; k < 7; k++) { g.fillRect(x0 + 7 + k * 17, y0 - 28, 10, 22); g.fillRect(x0 + 7 + k * 17, y1 + 6, 10, 22); g.fillRect(x0 - 28, y0 + 7 + k * 17, 22, 10); g.fillRect(x1 + 6, y0 + 7 + k * 17, 22, 10); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc((x0 + x1) / 2, (y0 + y1) / 2, 11, 0, 7); g.fill(); g.strokeStyle = '#3a3d43'; g.lineWidth = 2; g.stroke();
    }));
    // 블록(인도)
    BX.forEach(([x0, x1], i) => BY.forEach(([y0, y1], j) => {
      g.fillStyle = PAT.walk; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = '#c9c6ba'; g.lineWidth = 4; g.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.strokeRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
      const park = i === 2 && j === 0, farm = i === 0 && j === 1, yard = i === 1 && j === 2, IN = 16;
      if (park || farm || yard) { g.fillStyle = farm ? (snow ? PAT.snow : PAT.soil) : park ? (snow ? PAT.snow : PAT.grass) : PAT.yard; g.fillRect(x0 + IN, y0 + IN, x1 - x0 - IN * 2, y1 - y0 - IN * 2); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.strokeRect(x0 + IN, y0 + IN, x1 - x0 - IN * 2, y1 - y0 - IN * 2); }
      if (farm) {
        if (!use3D) for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const px = x0 + 132 + c * 30, py = y0 + 44 + r * 52; if (px > x1 - 24) continue;
          g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(px + 3, py + 3, 10, 0, 7); g.fill();
          g.fillStyle = snow ? '#fff' : '#2f8f3f'; g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill();
          if (!snow) { g.fillStyle = '#7fcf6a'; g.beginPath(); g.arc(px - 1, py - 1, 6, 0, 7); g.fill(); g.fillStyle = '#c9f0a8'; g.beginPath(); g.arc(px - 2, py - 2, 2.5, 0, 7); g.fill(); } }
        g.strokeStyle = '#3b2a18'; g.lineWidth = 3; g.setLineDash([3, 13]); g.strokeRect(x0 + 20, y0 + 20, x1 - x0 - 40, y1 - y0 - 40); g.setLineDash([]);
      }
      if (park) { g.fillStyle = '#c2b28a'; g.fillRect(x0 + 16, y0 + 118, x1 - x0 - 32, 20);
        const pg = g.createRadialGradient(x0 + 150, y0 + 190, 5, x0 + 160, y0 + 195, 70); pg.addColorStop(0, '#6cc3ff'); pg.addColorStop(1, '#1f6fb5'); g.fillStyle = pg; g.beginPath(); g.ellipse(x0 + 160, y0 + 195, 66, 34, 0, 0, 7); g.fill(); g.strokeStyle = '#0d3a66'; g.lineWidth = 3; g.stroke(); }
      if (yard) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x0 + 160, y0 + 236, 110, 46, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(x0 + 160, y0 + 236, 84, 28, 0, 0, 7); g.stroke(); }
    }));
    return c;
  }

  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); vw = innerWidth; vh = innerHeight; if (use3D) { G3 && G3.size(); return; } cv.width = vw * dpr; cv.height = vh * dpr; scale = Math.max(vh / 620, vw / 1080); }
  addEventListener('resize', resize); resize();
  cv.addEventListener('pointerdown', e => { joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; cv.setPointerCapture?.(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (joy && joy.id === e.pointerId) { joy.dx = e.clientX - joy.ox; joy.dy = e.clientY - joy.oy; } });
  const up = e => { if (joy && joy.id === e.pointerId) joy = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  addEventListener('keydown', e => keys[e.key] = true); addEventListener('keyup', e => keys[e.key] = false);
  const OB = [...TREES.map(([x, y, p]) => [x, y, p ? 7 : 10]), ...UC.NPCS.map(n => [n.x, n.y, 11])];      // 나무·사람은 못 뚫고 지나감
  const inR = (b, x, y, r) => x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r;
  const hit = (x, y, r) => arena ? (x < AR.x0 + r || y < AR.y0 + r || x > AR.x1 - r || y > AR.y1 - r || AR.obst.some(b => inR(b, x, y, r))) : (x < r || y < r || x > W - r || y > H - r || B.some(b => inR(b, x, y, r)) || OB.some(o => (x - o[0]) ** 2 + (y - o[1]) ** 2 < (o[2] + r * .55) ** 2));

  function update(dt) {
    tick += dt;
    let mx = 0, my = 0;
    if (joy) { const m = Math.hypot(joy.dx, joy.dy); if (m > 10) { mx = joy.dx / m; my = joy.dy / m; } }
    if (keys.ArrowLeft || keys.a) mx -= 1; if (keys.ArrowRight || keys.d) mx += 1;
    if (keys.ArrowUp || keys.w) my -= 1; if (keys.ArrowDown || keys.s) my += 1;
    if (frozen) mx = my = 0;
    const rr = pl.drive ? 20 : 13;
    if (pl.taxi && target) {
      const dx = target[0] - pl.x, dy = target[1] - pl.y, m = Math.hypot(dx, dy), st = 900 * dt; pl.a = Math.atan2(dy, dx);
      if (m <= st) { pl.x = target[0]; pl.y = target[1]; pl.taxi = false; } else { pl.x += dx / m * st; pl.y += dy / m * st; }
      if (use3D) { let d = pl.a - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 4); }
    } else if (use3D) {                 // 위=앞으로, 좌우=방향 돌리기 (카메라 기준)
      pl.moving = false;
      if (mx || my) {
        const m = Math.min(1, Math.hypot(mx, my)); camYaw += mx * 1.9 * dt;
        const fw = -my, sd = mx * .5, vx = Math.cos(camYaw) * fw - Math.sin(camYaw) * sd, vy = Math.sin(camYaw) * fw + Math.cos(camYaw) * sd, vm = Math.hypot(vx, vy);
        if (vm > .12) { const sp = (pl.drive ? 340 : 128) * dt * m; pl.a = Math.atan2(vy, vx); pl.walk += dt * 11; pl.moving = true;
          const nx = pl.x + vx / vm * sp, ny = pl.y + vy / vm * sp; if (!hit(nx, pl.y, rr)) pl.x = nx; if (!hit(pl.x, ny, rr)) pl.y = ny; }
      }
    } else if (mx || my) {
      const m = Math.hypot(mx, my), sp = (pl.drive ? 430 : 215) * dt; mx /= m; my /= m; pl.a = Math.atan2(my, mx); pl.walk += dt * 11;
      const nx = pl.x + mx * sp, ny = pl.y + my * sp;
      if (!hit(nx, pl.y, rr)) pl.x = nx; if (!hit(pl.x, ny, rr)) pl.y = ny;
    }
    if (!pl.drive && !pl.taxi) { const ws = Math.floor(pl.walk / Math.PI); if (ws !== pl.ws) { pl.ws = ws; beep('step'); } }        // 저벅저벅
    if (target && !pl.taxi && Math.hypot(target[0] - pl.x, target[1] - pl.y) < 36) { const f = onArrive; target = null; onArrive = null; f && f(); }
    if (onNear) { let id = null; if (!arena && !pl.drive && !pl.taxi) for (const n of UC.NPCS) if (!npcOk[n.id] && Math.hypot(n.x - pl.x, n.y - pl.y) < 52) id = n.id; if (id !== nearId) { nearId = id; onNear(id); } }
    const cpos = c => c.ax === 'x' ? [c.p, c.lane] : [c.lane, c.p], cdir = c => c.ax === 'x' ? [c.dir, 0] : [0, c.dir];
    const sees = (c, x, y, far, wide) => { const [cx0, cy0] = cpos(c), [dx, dy] = cdir(c), ax = (x - cx0) * dx + (y - cy0) * dy, lt = Math.abs((x - cx0) * dy - (y - cy0) * dx); return ax > 0 && ax < far && lt < wide; };
    cars.forEach((c, i) => {
      const len = c.ax === 'x' ? W : H, was = c.stop;
      c.stop = !pl.taxi && sees(c, pl.x, pl.y, 90, 30);                                     // 근로가 앞에 있으면 멈춤
      if (c.stop && !was) beep('honk');
      c.wait = cars.some((o, j) => { if (j === i) return false; const [ox, oy] = cpos(o);          // 앞차·교차로에서 양보
        if (o.ax === c.ax) return o.lane === c.lane && sees(c, ox, oy, 96, 10);
        return sees(c, ox, oy, 100, 40) && (j < i || !sees(o, ...cpos(c), 100, 40)); });
      c.wt = c.wait ? (c.wt || 0) + dt : 0; if (c.wt > 4) { c.go = 1.6; c.wt = 0; } if (c.go > 0) { c.go -= dt; c.wait = false; }      // 서로 기다리다 멈추면 풀어 줌
      if (!c.stop && !c.wait) c.p += c.v * c.dir * dt;
      if (c.p > len + 80) c.p = -80; if (c.p < -80) c.p = len + 80;
      if (!pl.taxi && !pl.drive && !arena) {                                              // 차 옆구리에 닿으면 밀려남
        const [cx0, cy0] = cpos(c), [dx, dy] = cdir(c), ax = (pl.x - cx0) * dx + (pl.y - cy0) * dy, lt = (pl.x - cx0) * -dy + (pl.y - cy0) * dx, hx = c.len / 2 + 11, hy = 28;
        if (Math.abs(ax) < hx && Math.abs(lt) < hy) { const push = (hy - Math.abs(lt)) * Math.sign(lt || 1), nx = pl.x + -dy * push, ny = pl.y + dx * push; if (!hit(nx, ny, 13)) { pl.x = nx; pl.y = ny; } }
      }
    });
    peds.forEach(p => { const qx = p.ax === 'x' ? p.p : p.q, qy = p.ax === 'x' ? p.q : p.p; if (!arena && Math.hypot(qx - pl.x, qy - pl.y) < 30) return;      // 근로 앞에선 멈춰 섬
      p.p += p.d * 30 * dt; p.t += dt * 9; const L = p.ax === 'x' ? W : H; if (p.p > L - 20 || p.p < 20) p.d *= -1; });
    camX = clamp(pl.x - vw / scale / 2, 0, Math.max(0, W - vw / scale)); camY = clamp(pl.y - vh / scale / 2, 0, Math.max(0, H - vh / scale));
    ccx = camX + vw / scale / 2; ccy = camY + vh / scale / 2;
  }

  const PR = (x, y, z) => [x + (x - ccx) * z, y + (y - ccy) * z];
  const font = s => `${s}px "Black Han Sans","Noto Sans KR",sans-serif`;
  function label(t, x, y, size = 15, col = '#fff') { cx.font = font(size); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineWidth = 4; cx.strokeStyle = '#000'; cx.strokeText(t, x, y); cx.fillStyle = col; cx.fillText(t, x, y); }
  let glow = [];          // 밤에 다시 밝힐 것들

  function person(x, y, a, walk, skin, shirt, hat, s = 1) {
    cx.save(); cx.translate(x, y);
    cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(5 * s, 6 * s, 13 * s, 9 * s, 0, 0, 7); cx.fill();
    cx.rotate(a); cx.scale(s, s); const sw = Math.sin(walk) * 6;
    cx.lineWidth = 2; cx.strokeStyle = '#000';
    cx.fillStyle = '#1d2a44'; cx.beginPath(); cx.roundRect(-5 + sw, -10, 11, 7, 3); cx.fill(); cx.stroke(); cx.beginPath(); cx.roundRect(-5 - sw, 3, 11, 7, 3); cx.fill(); cx.stroke();   // 다리
    cx.fillStyle = skin; cx.beginPath(); cx.arc(2 - sw * .8, -15, 3.6, 0, 7); cx.fill(); cx.stroke(); cx.beginPath(); cx.arc(2 + sw * .8, 15, 3.6, 0, 7); cx.fill(); cx.stroke();               // 손
    cx.fillStyle = shirt; cx.beginPath(); cx.roundRect(-8, -16, 15, 32, 7); cx.fill(); cx.stroke();                                                                                           // 몸통
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.fillRect(-8, -16, 5, 32);
    cx.fillStyle = skin; cx.beginPath(); cx.arc(1, 0, 8, 0, 7); cx.fill(); cx.stroke();                                                                                                       // 머리
    if (hat) { cx.fillStyle = hat; cx.beginPath(); cx.arc(0, 0, 8, Math.PI * .5, Math.PI * 1.5); cx.arc(0, 0, 8, -Math.PI / 2, Math.PI / 2); cx.fill(); cx.stroke(); cx.beginPath(); cx.roundRect(5, -6, 8, 12, 3); cx.fill(); cx.stroke(); }
    else { cx.fillStyle = '#2b1d14'; cx.beginPath(); cx.arc(-1, 0, 7, Math.PI * .5, Math.PI * 1.5); cx.fill(); }
    cx.restore();
  }
  function car(c) {
    const x = c.ax === 'x' ? c.p : c.lane, y = c.ax === 'x' ? c.lane : c.p, L = c.len, a = c.ang ?? (c.ax === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
    cx.save(); cx.translate(x, y); cx.rotate(a);
    cx.fillStyle = 'rgba(0,0,0,.42)'; cx.beginPath(); cx.roundRect(-L / 2 + 6, -11, L, 34, 9); cx.fill();
    cx.fillStyle = c.c; cx.strokeStyle = '#000'; cx.lineWidth = 2.5; cx.beginPath(); cx.roundRect(-L / 2, -17, L, 34, 9); cx.fill(); cx.stroke();
    const g = cx.createLinearGradient(0, -17, 0, 17); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); cx.fillStyle = g; cx.beginPath(); cx.roundRect(-L / 2, -17, L, 34, 9); cx.fill();
    cx.fillStyle = '#0f1a2b'; cx.beginPath(); cx.moveTo(L * .16, -13); cx.lineTo(L * .3, -11); cx.lineTo(L * .3, 11); cx.lineTo(L * .16, 13); cx.closePath(); cx.fill();                 // 앞유리
    cx.beginPath(); cx.moveTo(-L * .22, -13); cx.lineTo(-L * .34, -11); cx.lineTo(-L * .34, 11); cx.lineTo(-L * .22, 13); cx.closePath(); cx.fill();                                      // 뒷유리
    cx.fillStyle = 'rgba(160,210,255,.35)'; cx.fillRect(L * .19, -11, 3, 9);
    cx.fillStyle = 'rgba(255,255,255,.14)'; cx.beginPath(); cx.roundRect(-L * .2, -12, L * .34, 24, 4); cx.fill();                                                 // 지붕
    if (c.taxi) { cx.fillStyle = '#111'; for (let k = 0; k < 6; k++) cx.fillRect(-L * .2 + k * 7, k % 2 ? -17 : -14, 4, 3), cx.fillRect(-L * .2 + k * 7, k % 2 ? 11 : 14, 4, 3); cx.fillStyle = '#fff'; cx.strokeStyle = '#000'; cx.lineWidth = 1.5; cx.beginPath(); cx.roundRect(-7, -5, 12, 10, 2); cx.fill(); cx.stroke(); }
    cx.fillStyle = '#fff6c2'; cx.fillRect(L / 2 - 4, -15, 4, 8); cx.fillRect(L / 2 - 4, 7, 4, 8);
    cx.fillStyle = c.stop ? '#ff2a2a' : '#a51616'; cx.fillRect(-L / 2, -15, 3, 8); cx.fillRect(-L / 2, 7, 3, 8);
    cx.restore();
    if (fx.night || fx.rain) glow.push({ k: 'beam', x, y, a, L });
    if (c.stop) label('빵!', x, y - 34, 18, '#ffd23f');
  }
  function wall(ax, ay, bx, by, z, col, floors) {
    const [a2x, a2y] = PR(ax, ay, z), [b2x, b2y] = PR(bx, by, z);
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(bx, by); cx.lineTo(b2x, b2y); cx.lineTo(a2x, a2y); cx.closePath(); cx.fill(); cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.stroke();
    const depth = Math.hypot(a2x - ax, a2y - ay); if (depth < 6) return;
    for (let k = 0; k < floors; k++) { const t = (k + .55) / floors, p = [ax + (a2x - ax) * t, ay + (a2y - ay) * t, bx + (b2x - bx) * t, by + (b2y - by) * t], lw = clamp(depth / floors * .42, 1.5, 6);
      cx.strokeStyle = fx.night ? 'rgba(255,205,110,.85)' : 'rgba(12,22,40,.6)'; cx.lineWidth = lw; cx.setLineDash([7, 9]); cx.beginPath(); cx.moveTo(p[0], p[1]); cx.lineTo(p[2], p[3]); cx.stroke(); cx.setLineDash([]);
      if (fx.night) glow.push({ k: 'win', p, lw }); }
  }
  function building(b) {
    const shut = b.shop && fx.shutter, z = b.z, [rx0, ry0] = PR(b.x, b.y, z), [rx1, ry1] = PR(b.x + b.w, b.y + b.h, z), rw = rx1 - rx0, rh = ry1 - ry0, fl = Math.max(1, Math.round(z * 14));
    const c = shut ? '#5c5e64' : b.c, cl = shut ? '#6c6e75' : b.cl, c1 = shut ? '#3f4146' : b.c1, c2 = shut ? '#2e3034' : b.c2;
    if (ccx < b.x) wall(b.x, b.y, b.x, b.y + b.h, z, c2, fl);
    if (ccx > b.x + b.w) wall(b.x + b.w, b.y, b.x + b.w, b.y + b.h, z, c2, fl);
    if (ccy < b.y) wall(b.x, b.y, b.x + b.w, b.y, z, c1, fl);
    if (ccy > b.y + b.h) {
      wall(b.x, b.y + b.h, b.x + b.w, b.y + b.h, z, c1, fl);
      if (b.roof === 'shop') { const [ax, ay] = PR(b.x, b.y + b.h, z * .45), [bx] = PR(b.x + b.w, b.y + b.h, z * .45);      // 차양
        for (let k = 0; k < 8; k++) { cx.fillStyle = shut ? (k % 2 ? '#55575c' : '#44464b') : (k % 2 ? '#f4f1e8' : b.neon); cx.fillRect(ax + (bx - ax) * k / 8, ay - 2, (bx - ax) / 8 + .5, 9); } cx.strokeStyle = '#000'; cx.lineWidth = 1.5; cx.strokeRect(ax, ay - 2, bx - ax, 9); }
    }
    // 지붕
    cx.fillStyle = cl; cx.fillRect(rx0, ry0, rw, rh);
    if (b.roof === 'gable') { cx.fillStyle = c; cx.fillRect(rx0, ry0 + rh / 2, rw, rh / 2); cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = 1; for (let y = ry0 + 8; y < ry1; y += 9) { cx.beginPath(); cx.moveTo(rx0, y); cx.lineTo(rx1, y); cx.stroke(); } cx.strokeStyle = '#000'; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(rx0, ry0 + rh / 2); cx.lineTo(rx1, ry0 + rh / 2); cx.stroke(); cx.fillStyle = '#6b4a3a'; cx.fillRect(rx1 - 30, ry0 + 12, 12, 12); cx.strokeRect(rx1 - 30, ry0 + 12, 12, 12); }
    else {
      cx.strokeStyle = 'rgba(0,0,0,.32)'; cx.lineWidth = 6; cx.strokeRect(rx0 + 6, ry0 + 6, rw - 12, rh - 12);
      const ac = (x, y) => { cx.fillStyle = '#9aa0a8'; cx.strokeStyle = '#000'; cx.lineWidth = 1.5; cx.fillRect(x, y, 20, 16); cx.strokeRect(x, y, 20, 16); cx.fillStyle = '#5b6068'; cx.beginPath(); cx.arc(x + 10, y + 8, 5, 0, 7); cx.fill(); };
      if (b.roof === 'shop' || b.roof === 'flat') { ac(rx1 - 34, ry0 + 14); if (rw > 180) ac(rx0 + 16, ry0 + 14); }
      if (b.roof === 'tower') { cx.strokeStyle = '#ffd23f'; cx.lineWidth = 4; cx.beginPath(); cx.arc(rx0 + rw * .78, ry0 + rh * .5, 30, 0, 7); cx.stroke(); cx.font = font(34); cx.fillStyle = '#ffd23f'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('H', rx0 + rw * .78, ry0 + rh * .5 + 2);
        const [tx, ty] = PR(b.x + 30, b.y + 30, z + .12); cx.strokeStyle = '#111'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(rx0 + 32, ry0 + 32); cx.lineTo(tx, ty); cx.stroke(); cx.fillStyle = Math.sin(tick * 5) > 0 ? '#ff3b3b' : '#6b1111'; cx.beginPath(); cx.arc(tx, ty, 5, 0, 7); cx.fill(); if (fx.night) glow.push({ k: 'dot', x: tx, y: ty, c: '255,60,60', r: 26 }); }
      if (b.roof === 'civic') { cx.fillStyle = 'rgba(160,215,255,.5)'; cx.strokeStyle = '#000'; cx.lineWidth = 2; for (let k = 0; k < 3; k++) { cx.fillRect(rx0 + rw * (.14 + k * .26), ry0 + rh * .66, rw * .2, rh * .18); cx.strokeRect(rx0 + rw * (.14 + k * .26), ry0 + rh * .66, rw * .2, rh * .18); } }
      if (b.roof === 'apt') { for (let k = 0; k < 2; k++) { cx.fillStyle = '#3d7fb0'; cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.beginPath(); cx.arc(rx0 + rw * .5, ry0 + rh * (.22 + k * .56), 15, 0, 7); cx.fill(); cx.stroke(); } cx.fillStyle = c1; cx.fillRect(rx0 + rw * .3, ry0 + rh * .44, rw * .4, rh * .12); cx.strokeRect(rx0 + rw * .3, ry0 + rh * .44, rw * .4, rh * .12); }
      if (b.roof === 'barn') { cx.strokeStyle = '#f4f1e8'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(rx0 + 10, ry0 + 10); cx.lineTo(rx1 - 10, ry1 - 10); cx.moveTo(rx1 - 10, ry0 + 10); cx.lineTo(rx0 + 10, ry1 - 10); cx.stroke(); }
      if (b.roof === 'factory') { cx.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 5; k++) cx.fillRect(rx0 + 10, ry0 + rh * (.42 + k * .11), rw - 20, rh * .05);
        [[.2, .2], [.42, .2]].forEach(([u, v], i) => { const bx = b.x + b.w * u, by = b.y + b.h * v, [tx, ty] = PR(bx, by, z + .12); cx.fillStyle = '#7b4a3a'; cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.beginPath(); cx.arc(tx, ty, 15, 0, 7); cx.fill(); cx.stroke(); cx.fillStyle = '#1a1a1a'; cx.beginPath(); cx.arc(tx, ty, 8, 0, 7); cx.fill();
          smoke.forEach(s => { const t = (s.t + tick * .12 + i * .3) % 1, [sx, sy] = PR(bx + t * 70, by - t * 90, z + .12 + t * .25); cx.fillStyle = `rgba(210,210,215,${.5 * (1 - t)})`; cx.beginPath(); cx.arc(sx, sy, 9 + t * 26, 0, 7); cx.fill(); }); }); }
    }
    cx.strokeStyle = '#000'; cx.lineWidth = 3; cx.strokeRect(rx0, ry0, rw, rh);
    if (shut) { cx.fillStyle = '#d8d2c0'; cx.strokeStyle = '#000'; cx.lineWidth = 2; const sw = Math.min(rw - 20, 104); cx.fillRect(rx0 + rw / 2 - sw / 2, ry0 + rh / 2 - 15, sw, 30); cx.strokeRect(rx0 + rw / 2 - sw / 2, ry0 + rh / 2 - 15, sw, 30); cx.font = font(17); cx.fillStyle = '#b3121f'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('임대 문의', rx0 + rw / 2, ry0 + rh / 2 + 1); }
    else if (b.n) {             // 네온 간판
      const fs = Math.min(22, (rw - 26) / (b.n.length * .95)); cx.font = font(fs); const tw = cx.measureText(b.n).width + 22, sx = rx0 + rw / 2, sy = ry0 + rh * (b.roof === 'tower' ? .5 : b.roof === 'gable' ? .28 : .42) + (b.roof === 'tower' ? 0 : 0), ox = b.roof === 'tower' ? -rw * .16 : 0;
      cx.fillStyle = 'rgba(8,8,12,.88)'; cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.beginPath(); cx.roundRect(sx + ox - tw / 2, sy - fs * .8, tw, fs * 1.6, 4); cx.fill(); cx.stroke();
      cx.save(); cx.shadowColor = b.neon; cx.shadowBlur = fx.night ? 18 : 7; cx.fillStyle = b.neon; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(b.n, sx + ox, sy + 1); cx.restore();
      if (fx.night) glow.push({ k: 'sign', x: sx + ox, y: sy, w: tw, h: fs * 1.6, c: b.neon });
    }
  }
  function tree(x, y, palm) {
    const [tx, ty] = PR(x, y, .1), sn = fx.snow;
    cx.fillStyle = 'rgba(0,0,0,.32)'; cx.beginPath(); cx.arc(x + 9, y + 9, palm ? 16 : 22, 0, 7); cx.fill();
    cx.strokeStyle = '#4a321d'; cx.lineWidth = palm ? 5 : 7; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(tx, ty); cx.stroke();
    if (palm) { cx.strokeStyle = '#000'; cx.lineWidth = 1.5; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + Math.sin(tick * .8 + x) * .06; cx.fillStyle = sn ? '#dfe9ee' : (k % 2 ? '#2f8f46' : '#3fae57'); cx.beginPath(); cx.ellipse(tx + Math.cos(a) * 15, ty + Math.sin(a) * 15, 17, 5.5, a, 0, 7); cx.fill(); cx.stroke(); } cx.fillStyle = '#5a3d22'; cx.beginPath(); cx.arc(tx, ty, 5, 0, 7); cx.fill(); }
    else { [[0, 0, 23, sn ? '#dce6ec' : '#256b2e'], [-6, -6, 15, sn ? '#f2f7fa' : '#3c9447'], [7, 4, 9, sn ? '#fff' : '#57b25e']].forEach(([dx, dy, r, c], i) => { cx.fillStyle = c; cx.beginPath(); cx.arc(tx + dx, ty + dy, r, 0, 7); cx.fill(); if (!i) { cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.stroke(); } }); }
  }
  function lamp(x, y) {
    const [tx, ty] = PR(x, y, .13); cx.fillStyle = '#111'; cx.beginPath(); cx.arc(x, y, 4, 0, 7); cx.fill();
    cx.strokeStyle = '#15171b'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(tx, ty); cx.stroke();
    cx.fillStyle = fx.night || fx.rain ? '#fff3c4' : '#c9ccd2'; cx.strokeStyle = '#000'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(tx, ty, 5.5, 0, 7); cx.fill(); cx.stroke();
    if (fx.night || fx.rain) glow.push({ k: 'dot', x, y, c: '255,214,140', r: 120 });
  }
  function drawWorld() {
    glow = []; const key = fx.snow ? 1 : 0; cx.drawImage(ground[key] || (ground[key] = buildGround(fx.snow)), 0, 0);
    if (target) { const [tx, ty] = target, pu = 1 + Math.sin(tick * 5) * .12;       // 미션 원(바닥)
      const g = cx.createRadialGradient(tx, ty, 4, tx, ty, 34 * pu); g.addColorStop(0, 'rgba(255,210,63,.55)'); g.addColorStop(1, 'rgba(255,210,63,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(tx, ty, 34 * pu, 0, 7); cx.fill();
      cx.strokeStyle = '#ffd23f'; cx.lineWidth = 5; cx.beginPath(); cx.arc(tx, ty, 24 * pu, 0, 7); cx.stroke(); cx.strokeStyle = '#000'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(tx, ty, 27 * pu, 0, 7); cx.stroke();
      glow.push({ k: 'dot', x: tx, y: ty, c: '255,210,63', r: 80 }); }
    peds.forEach(p => { const x = p.ax === 'x' ? p.p : p.q, y = p.ax === 'x' ? p.q : p.p; person(x, y, p.ax === 'x' ? (p.d > 0 ? 0 : Math.PI) : (p.d > 0 ? Math.PI / 2 : -Math.PI / 2), p.t, p.sk, p.ts, null, .82); });
    cars.forEach(car);
    UC.NPCS.forEach(n => { person(n.x, n.y, Math.PI / 2, 0, '#f1c9a5', n.shirt, null, 1); cx.fillStyle = '#fff'; cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.beginPath(); cx.arc(n.x, n.y - 34, 13, 0, 7); cx.fill(); cx.stroke(); UC.drawIcon(cx, npcOk[n.id] ? 'check' : 'talk', n.x, n.y - 34, 19); });
    if (pl.taxi) car({ ax: 'x', p: pl.x, lane: pl.y, ang: pl.a, c: '#f2c230', taxi: true, len: 62, stop: false });
    else if (pl.drive) car({ ax: 'x', p: pl.x, lane: pl.y, ang: pl.a, c: '#e23b3b', taxi: false, len: 62, stop: false });
    else person(pl.x, pl.y, pl.a, pl.walk, '#f1c9a5', '#d62839', '#ffd23f', 1.12);
    // 높이가 있는 것: 화면 중심에서 먼 것부터
    const tall = [...B.map(b => ({ d: Math.hypot(b.x + b.w / 2 - ccx, b.y + b.h / 2 - ccy), f: () => building(b) })), ...TREES.map(([x, y, p]) => ({ d: Math.hypot(x - ccx, y - ccy), f: () => tree(x, y, p) })), ...LAMPS.map(([x, y]) => ({ d: Math.hypot(x - ccx, y - ccy) + 1, f: () => lamp(x, y) }))];
    tall.sort((a, b) => b.d - a.d).forEach(t => t.f());
    label('배추 농장', 205, 690, 16, fx.snow ? '#bfe3ff' : '#c9f0a8');
    if (target) { const [tx, ty] = target, by = ty - 52 + Math.sin(tick * 6) * 6; cx.fillStyle = '#ffd23f'; cx.strokeStyle = '#000'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(tx, by + 18); cx.lineTo(tx - 14, by - 8); cx.lineTo(tx + 14, by - 8); cx.closePath(); cx.fill(); cx.stroke(); }
    if (!pl.taxi) { label('근로', pl.x, pl.y - 32, 14); cx.fillStyle = '#fff'; cx.strokeStyle = '#000'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(pl.x, pl.y - 20); cx.lineTo(pl.x - 5, pl.y - 26); cx.lineTo(pl.x + 5, pl.y - 26); cx.closePath(); cx.fill(); cx.stroke(); }
  }
  function lights() {         // 밤·비: 어둡게 덮고 불빛만 다시 밝힘
    const dark = fx.night ? .58 : fx.rain ? .34 : 0;
    if (dark) {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = fx.night ? `rgba(6,8,34,${dark})` : `rgba(26,32,48,${dark})`; cx.fillRect(0, 0, vw, vh);
      cx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * dpr * scale, -camY * dpr * scale); cx.globalCompositeOperation = 'lighter';
      glow.forEach(g => {
        if (g.k === 'dot') { const gr = cx.createRadialGradient(g.x, g.y, 2, g.x, g.y, g.r); gr.addColorStop(0, `rgba(${g.c},.24)`); gr.addColorStop(1, `rgba(${g.c},0)`); cx.fillStyle = gr; cx.beginPath(); cx.arc(g.x, g.y, g.r, 0, 7); cx.fill(); }
        else if (g.k === 'beam') { cx.save(); cx.translate(g.x, g.y); cx.rotate(g.a); const gr = cx.createLinearGradient(g.L / 2, 0, g.L / 2 + 150, 0); gr.addColorStop(0, 'rgba(255,240,190,.5)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); cx.fillStyle = gr; cx.beginPath(); cx.moveTo(g.L / 2, -12); cx.lineTo(g.L / 2 + 150, -46); cx.lineTo(g.L / 2 + 150, 46); cx.lineTo(g.L / 2, 12); cx.closePath(); cx.fill(); cx.fillStyle = 'rgba(255,40,40,.45)'; cx.beginPath(); cx.arc(-g.L / 2, -11, 7, 0, 7); cx.arc(-g.L / 2, 11, 7, 0, 7); cx.fill(); cx.restore(); }
        else if (g.k === 'win') { cx.strokeStyle = 'rgba(255,200,110,.22)'; cx.lineWidth = g.lw; cx.setLineDash([7, 9]); cx.beginPath(); cx.moveTo(g.p[0], g.p[1]); cx.lineTo(g.p[2], g.p[3]); cx.stroke(); cx.setLineDash([]); }
        else if (g.k === 'sign') { const gr = cx.createRadialGradient(g.x, g.y, 2, g.x, g.y, g.w * .8); gr.addColorStop(0, g.c + '88'); gr.addColorStop(1, g.c + '00'); cx.fillStyle = gr; cx.fillRect(g.x - g.w, g.y - g.w, g.w * 2, g.w * 2); }
      });
      cx.globalCompositeOperation = 'source-over';
    }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (false) { cx.globalCompositeOperation = 'soft-light'; const g = cx.createLinearGradient(0, 0, vw, vh); g.addColorStop(0, 'rgba(255,170,60,.5)'); g.addColorStop(1, 'rgba(255,60,120,.32)'); cx.fillStyle = g; cx.fillRect(0, 0, vw, vh); cx.globalCompositeOperation = 'source-over'; }   // 노을빛
    if (fx.snow) { cx.fillStyle = 'rgba(170,200,230,.14)'; cx.fillRect(0, 0, vw, vh); cx.fillStyle = '#fff'; flakes.forEach(f => { f.y += .0022 * f.s; f.x += Math.sin(tick + f.s * 9) * .0006; if (f.y > 1) f.y = 0; cx.beginPath(); cx.arc(f.x * vw, f.y * vh, 2.4 * f.s, 0, 7); cx.fill(); }); }
    if (fx.rain) { cx.strokeStyle = 'rgba(190,210,235,.42)'; cx.lineWidth = 1.5; cx.beginPath(); flakes.forEach(f => { f.y += .03 * f.s; f.x -= .006; if (f.y > 1) { f.y = 0; f.x = Math.random() * 1.2; } const x = f.x * vw, y = f.y * vh; cx.moveTo(x, y); cx.lineTo(x - 7, y + 22); }); cx.stroke(); }
    const v = cx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .45, vw / 2, vh / 2, Math.max(vw, vh) * .72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.18)'); cx.fillStyle = v; cx.fillRect(0, 0, vw, vh);   // 비네트
  }
  function drawRadar() {
    const RW = rd.width, RH = rd.height, k = .2; rx.fillStyle = '#17191e'; rx.fillRect(0, 0, RW, RH);
    const rot = use3D ? -camYaw - Math.PI / 2 : 0;
    rx.save(); rx.translate(RW / 2, RH / 2); rx.rotate(rot); rx.translate(-pl.x * k, -pl.y * k);
    rx.fillStyle = '#5d6068'; rx.fillRect(-400, -400, W * k + 800, H * k + 800);
    rx.fillStyle = '#23262c'; BX.forEach(([x0, x1]) => BY.forEach(([y0, y1]) => rx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)));
    rx.fillStyle = '#3a3e46'; B.forEach(b => rx.fillRect(b.x * k, b.y * k, b.w * k, b.h * k));
    rx.fillStyle = '#2c5a2f'; rx.fillRect(912 * k, 16 * k, 288 * k, 224 * k);
    rx.restore();
    if (target) { const ox = (target[0] - pl.x) * k, oy = (target[1] - pl.y) * k; let dx = ox * Math.cos(rot) - oy * Math.sin(rot), dy = ox * Math.sin(rot) + oy * Math.cos(rot); dx = clamp(dx, -RW / 2 + 16, RW / 2 - 16); dy = clamp(dy, -RH / 2 + 16, RH / 2 - 16);
      rx.fillStyle = '#ffd23f'; rx.strokeStyle = '#000'; rx.lineWidth = 3; rx.beginPath(); rx.arc(RW / 2 + dx, RH / 2 + dy, 11 + Math.sin(tick * 5) * 2, 0, 7); rx.fill(); rx.stroke(); }
    rx.save(); rx.translate(RW / 2, RH / 2); rx.rotate(pl.a + rot); rx.fillStyle = '#fff'; rx.strokeStyle = '#000'; rx.lineWidth = 3; rx.beginPath(); rx.moveTo(16, 0); rx.lineTo(-10, -10); rx.lineTo(-4, 0); rx.lineTo(-10, 10); rx.closePath(); rx.fill(); rx.stroke(); rx.restore();
    if (!use3D) { rx.font = font(20); rx.fillStyle = '#fff'; rx.textAlign = 'center'; rx.fillText('N', RW - 20, 26); }
  }
  /* ───────── 3D 도시 (three.js) — 캐릭터 뒤에서 따라가는 시점 ───────── */
  function make3D() {
    const T = THREE, U = 1 / 16, BH = .18;
    const R = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    R.outputEncoding = T.sRGBEncoding; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(58, 1, .3, 700);
    scene.fog = new T.Fog(0xe89a6a, 45, 260);
    const hemi = new T.HemisphereLight(0xffffff, 0x444444, .9), sun = new T.DirectionalLight(0xffffff, 1.1);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0012;
    Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 220 });
    scene.add(hemi, sun, sun.target);
    const cvs = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
    const tex = (c, rep) => { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = T.RepeatWrapping; return t; };
    const lam = o => new T.MeshLambertMaterial(o), bas = o => new T.MeshBasicMaterial(o);
    const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
    const shadowed = m => { m.castShadow = true; m.receiveShadow = true; return m; };

    /* 하늘 */
    const skyC = cvs(4, 256, () => {}), skyT = tex(skyC); scene.background = skyT;
    const sunDisc = new T.Mesh(new T.CircleGeometry(34, 32), bas({ color: 0xffe9a8, fog: false })); scene.add(sunDisc);

    /* 바닥: 도로(평면) + 인도 블록(살짝 올림) */
    const base = new T.Mesh(new T.PlaneGeometry(1400, 1400), lam({ color: 0x4fc24a })); base.rotation.x = -Math.PI / 2; base.position.set(W * U / 2, -.03, H * U / 2); base.receiveShadow = true; scene.add(base);
    const roadT = tex(buildGround(false)); const road = new T.Mesh(new T.PlaneGeometry(W * U, H * U), lam({ map: roadT })); road.rotation.x = -Math.PI / 2; road.position.set(W * U / 2, 0, H * U / 2); road.receiveShadow = true; scene.add(road);
    const curbM = lam({ color: 0xb9b6aa }), blocks = [];
    BX.forEach(([x0, x1]) => BY.forEach(([y0, y1]) => {
      const c = cvs(x1 - x0, y1 - y0, () => {}), t = tex(c), w = (x1 - x0) * U, d = (y1 - y0) * U;
      const side = box(w, BH, d, curbM); side.position.set((x0 + x1) / 2 * U, BH / 2 - .005, (y0 + y1) / 2 * U); side.receiveShadow = true; scene.add(side);
      const top = new T.Mesh(new T.PlaneGeometry(w, d), lam({ map: t })); top.rotation.x = -Math.PI / 2; top.position.set((x0 + x1) / 2 * U, BH, (y0 + y1) / 2 * U); top.receiveShadow = true; scene.add(top);
      blocks.push({ c, t, x0, y0 });
    }));
    let groundSnow = null;
    function paintGround(snow) { if (groundSnow === snow) return; groundSnow = snow; const g = ground[snow ? 1 : 0] || (ground[snow ? 1 : 0] = buildGround(snow)); roadT.image = g; roadT.needsUpdate = true;
      blocks.forEach(b => { b.c.getContext('2d').drawImage(g, -b.x0, -b.y0); b.t.needsUpdate = true; }); }
    const onBlock = (x, y) => BX.some(([a, b]) => x >= a && x <= b) && BY.some(([a, b]) => y >= a && y <= b);

    /* 건물 외벽 무늬 (창문 4×4 타일) + 밤에 켜지는 창 */
    function facade(col) {
      if (RB) { const lit2 = [];
        const map = cvs(256, 256, g => { g.fillStyle = col; g.fillRect(0, 0, 256, 256); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + 12, y = r * 64 + 12; lit2.push([x, y, Math.random() < .5]); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x - 4, y - 4, 48, 44, 6); g.fill(); g.fillStyle = '#8fd3ff'; g.beginPath(); g.roundRect(x, y, 40, 36, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 4, y + 4, 12, 28); } });
        const em = cvs(256, 256, g => { g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); lit2.forEach(([x, y, on]) => { if (on) { g.fillStyle = '#ffd98a'; g.fillRect(x, y, 40, 36); } }); });
        return { map, em }; }
      const lit = [];
      const map = cvs(256, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, shade(col, .1)); gr.addColorStop(1, shade(col, -.12)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 256; y += 64) g.fillRect(0, y + 60, 256, 4);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + 12, y = r * 64 + 12; lit.push([x, y, Math.random() < .55]);
          g.fillStyle = '#16233a'; g.fillRect(x, y, 40, 36); g.fillStyle = 'rgba(150,200,255,.28)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 22, y); g.lineTo(x, y + 26); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeRect(x, y, 40, 36); g.fillStyle = shade(col, .3); g.fillRect(x - 3, y + 36, 46, 4); } });
      const em = cvs(256, 256, g => { g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); lit.forEach(([x, y, on]) => { if (on) { g.fillStyle = Math.random() < .2 ? '#bfe2ff' : '#ffcf7a'; g.fillRect(x + 2, y + 2, 36, 32); } }); });
      return { map, em };
    }
    const wallMat = (f, len, hgt) => { const m = tex(f.map, 1), e = tex(f.em, 1); m.repeat.set(Math.max(.5, len / 9.6), Math.max(.4, hgt / 12.8)); e.repeat.copy(m.repeat); return lam({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 0 }); };
    const signTex = (txt, col) => tex(cvs(512, 128, g => { g.fillStyle = '#0b0b10'; g.fillRect(0, 0, 512, 128); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
      g.font = `${Math.min(84, 430 / (txt.length * .92))}px "Black Han Sans","Noto Sans KR",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 22; g.fillStyle = col; g.fillText(txt, 256, 68); g.fillText(txt, 256, 68); }));
    const rentTex = tex(cvs(512, 128, g => { g.fillStyle = '#e9e2cc'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#000'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 120); g.font = '80px "Black Han Sans","Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b3121f'; g.fillText('임대 문의', 256, 68); }));
    const glassTex = tex(cvs(256, 128, g => { g.fillStyle = '#1b2433'; g.fillRect(0, 0, 256, 128); for (let k = 0; k < 4; k++) { const gr = g.createLinearGradient(k * 64, 0, k * 64 + 64, 128); gr.addColorStop(0, '#6fb6e8'); gr.addColorStop(1, '#274a6e'); g.fillStyle = gr; g.fillRect(k * 64 + 5, 10, 54, 108); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(k * 64 + 5, 10); g.lineTo(k * 64 + 34, 10); g.lineTo(k * 64 + 5, 70); g.fill(); } g.fillStyle = '#ffd98a'; g.fillRect(98, 40, 60, 78); g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeRect(98, 40, 60, 78); }), 1);
    const shutTex = tex(cvs(256, 128, g => { g.fillStyle = '#7b8088'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#5a5f66'; for (let y = 0; y < 128; y += 12) g.fillRect(0, y, 256, 4); g.strokeStyle = '#000'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 128); }), 1);
    const awnTex = c => tex(cvs(128, 16, g => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f4f1e8' : c; g.fillRect(k * 16, 0, 16, 16); } }), 1);
    const smokes = [], roofM = {}, shops = [], nightMats = [], acM = lam({ color: 0x9aa0a8 }), darkM = lam({ color: 0x2a2d33 });
    const HGT = b => b.roof === 'gable' ? 4 : b.roof === 'barn' ? 4.6 : b.roof === 'tower' ? 42 : b.z * 70;
    B.forEach(b => {
      const w = b.w * U, d = b.h * U, h = HGT(b), cxp = (b.x + b.w / 2) * U, czp = (b.y + b.h / 2) * U, f = facade(b.c);
      const mx = wallMat(f, d, h), mz = wallMat(f, w, h), rm = roofM[b.c] || (roofM[b.c] = lam({ color: new T.Color(shade(b.c, -.35)) }));
      const body = shadowed(box(w, h, d, [mx, mx, rm, rm, mz, mz])); body.position.set(cxp, BH + h / 2, czp); scene.add(body); nightMats.push(mx, mz);
      const rec = { b, mats: [mx, mz], signs: [], fronts: [], awn: [] };
      const put = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
      if (b.roof === 'gable' || b.roof === 'barn') { const r = shadowed(new T.Mesh(new T.CylinderGeometry(0, 1, 2.2, 4, 1), lam({ color: new T.Color(shade(b.c, b.roof === 'barn' ? -.5 : -.25)), flatShading: true }))); r.rotation.y = Math.PI / 4; r.scale.set(w * .78, 1, d * .78); put(r, cxp, BH + h + 1.1, czp); }
      else {
        const par = box(w, .5, d, darkM); put(par, cxp, BH + h + .1, czp); par.scale.set(1.01, 1, 1.01);
        const top = box(w - .5, .1, d - .5, rm); put(top, cxp, BH + h + .36, czp);
        const ac = (ox, oz) => put(shadowed(box(1.2, .8, 1, acM)), cxp + ox, BH + h + .8, czp + oz);
        if (b.roof === 'shop' || b.roof === 'flat' || b.roof === 'civic') { ac(w * .28, -d * .25); if (w > 10) ac(-w * .28, d * .2); }
        if (b.roof === 'apt') [-.28, .28].forEach(k => put(shadowed(new T.Mesh(new T.CylinderGeometry(.9, .9, 1.6, 10), lam({ color: 0x3d7fb0 }))), cxp, BH + h + 1.2, czp + d * k));
        if (b.roof === 'tower') { const hp = new T.Mesh(new T.PlaneGeometry(6, 6), bas({ map: tex(cvs(128, 128, g => { g.fillStyle = '#2a2f3a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); g.font = '80px sans-serif'; g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 68); })) })); hp.rotation.x = -Math.PI / 2; put(hp, cxp + w * .2, BH + h + .43, czp);
          put(box(.15, 7, .15, darkM), cxp - w * .35, BH + h + 3.5, czp - d * .3); rec.beacon = put(new T.Mesh(new T.SphereGeometry(.35, 8, 8), bas({ color: 0xff3030 })), cxp - w * .35, BH + h + 7.2, czp - d * .3); B.beacon = rec.beacon; }
        if (b.roof === 'factory') [[-.28, -.25], [-.05, -.25]].forEach(([u, v]) => { put(shadowed(new T.Mesh(new T.CylinderGeometry(.8, 1, 6, 10), lam({ color: 0x7b4a3a }))), cxp + w * u, BH + h + 3, czp + d * v); for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.SphereGeometry(1, 8, 8), bas({ color: 0xd4d4d8, transparent: true, opacity: .4, depthWrite: false })); s.userData = { x: cxp + w * u, y: BH + h + 6, z: czp + d * v, t: k / 4 }; scene.add(s); smokes.push(s); } });
      }
      if (b.n) {       // 네온 간판 4면
        const st = signTex(b.n, b.neon), sw = Math.min(w * .8, d * .8, 9), sh = sw / 4, sy = h > 9 ? 5.6 : BH + h - sh / 2 - .25, sm = bas({ map: st });
        [[0, 0, d / 2 + .08, 0], [0, 0, -d / 2 - .08, Math.PI], [w / 2 + .08, 0, 0, Math.PI / 2], [-w / 2 - .08, 0, 0, -Math.PI / 2]].forEach(([ox, , oz, ry]) => { const s = new T.Mesh(new T.PlaneGeometry(sw, sh), sm); s.rotation.y = ry; put(s, cxp + ox, sy, czp + oz); });
        rec.sm = sm; rec.st = st;
      }
      if (b.roof === 'shop') {      // 1층 유리 진열창 + 차양
        const at = awnTex(b.neon);
        [[d / 2 + .05, 0, w], [-d / 2 - .05, Math.PI, w]].forEach(([oz, ry, len]) => { const gm = lam({ map: glassTex.clone(), emissive: 0xffe2a8, emissiveIntensity: 0 }); gm.map.repeat.set(Math.max(1, Math.round(len / 4)), 1); gm.map.needsUpdate = true; gm.emissiveMap = gm.map;
          const g = new T.Mesh(new T.PlaneGeometry(len - .6, 2.4), gm); g.rotation.y = ry; put(g, cxp, BH + 1.25, czp + oz); rec.fronts.push(gm); nightMats.push(gm);
          const am = lam({ map: at.clone() }); am.map.repeat.set(Math.max(1, Math.round(len / 3)), 1); am.map.needsUpdate = true; const a = shadowed(box(len - .2, .14, 1.3, am)); a.rotation.x = (oz > 0 ? 1 : -1) * .28; put(a, cxp, BH + 2.85, czp + oz + (oz > 0 ? .6 : -.6)); rec.awn.push(am); });
      }
      if (b.shop) shops.push(rec);
    });

    /* 변두리 스카이라인 */
    const fill = [0x4a5568, 0x5b4a68, 0x3f5a6b, 0x6b5a4a].map(c => { const f = facade('#' + c.toString(16).padStart(6, '0')); const m = tex(f.map, 1), e = tex(f.em, 1); m.repeat.set(2, 4); e.repeat.set(2, 4); const mt = lam({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 0 }); nightMats.push(mt); return mt; });
    for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, r = 20 + Math.random() * 110, ex = W * U / 2, ez = H * U / 2; let x = ex + Math.cos(a) * (ex + r), z = ez + Math.sin(a) * (ez + r);
      const w = 8 + Math.random() * 12, h = 10 + Math.random() * 55 * (1 - r / 170), m = box(w, h, 8 + Math.random() * 12, fill[i % 4]); m.position.set(x, h / 2, z); scene.add(m); }

    /* 나무 · 야자수 · 가로등 */
    const trunkM = lam({ color: 0x5a3d22 }), leafM = lam({ color: 0x2f7d38, flatShading: true }), leaf2M = lam({ color: 0x47a352, flatShading: true }), palmM = lam({ color: 0x2f9a4a, flatShading: true, side: T.DoubleSide });
    const gTrunk = new T.CylinderGeometry(.22, .3, 2.4, 6), gLeaf = new T.IcosahedronGeometry(1.7, 0), gPT = new T.CylinderGeometry(.16, .26, 6.4, 6), gFr = new T.ConeGeometry(.5, 3.4, 4);
    TREES.forEach(([x, y, palm]) => { const g = new T.Group(), by = onBlock(x, y) ? BH : 0; g.position.set(x * U, by, y * U);
      if (palm) { const t = shadowed(box(.5, 6.2, .5, trunkM)); t.position.y = 3.1; g.add(t); [[4.6, .35, 1.3, 0], [1.3, .35, 4.6, 0], [3.4, .3, 1.1, .78], [1.1, .3, 3.4, .78]].forEach(([w, h, d, ry], k) => { const f = shadowed(box(w, h, d, palmM)); f.position.y = 6.3 + (k > 1 ? .3 : 0); f.rotation.y = ry; g.add(f); }); const c = box(.9, .7, .9, lam({ color: 0x8a5a2b })); c.position.y = 6; g.add(c); }
      else { const t = shadowed(box(.6, 2.6, .6, trunkM)); t.position.y = 1.3; g.add(t); const l = shadowed(box(3, 2.4, 3, leafM)); l.position.y = 3.7; g.add(l); const l2 = shadowed(box(1.9, 1.4, 1.9, leaf2M)); l2.position.y = 5.5; g.add(l2); }
      scene.add(g); });
    const poleM = lam({ color: 0x1b1d22 }), bulbM = bas({ color: 0xfff1c0 }), gPole = new T.CylinderGeometry(.08, .1, 5.2, 6), gBulb = new T.SphereGeometry(.28, 8, 8);
    const haloT = tex(cvs(64, 64, g => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,225,160,1)'); gr.addColorStop(1, 'rgba(255,225,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
    const haloM = new T.SpriteMaterial({ map: haloT, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    const poolM = bas({ map: haloT, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    LAMPS.forEach(([x, y]) => { const p = new T.Mesh(gPole, poleM); p.position.set(x * U, BH + 2.6, y * U); scene.add(p); const b = new T.Mesh(gBulb, bulbM); b.position.set(x * U, BH + 5.3, y * U); scene.add(b);
      const s = new T.Sprite(haloM); s.scale.setScalar(5); s.position.copy(b.position); scene.add(s); const pl2 = new T.Mesh(new T.PlaneGeometry(13, 13), poolM); pl2.rotation.x = -Math.PI / 2; pl2.position.set(x * U, BH + .03, y * U); scene.add(pl2); });

    /* 배추 */
    let deco = true; const cabM = lam({ color: 0x3fa84c, flatShading: true }), cab = new T.InstancedMesh(new T.IcosahedronGeometry(.5, 0), cabM, 30); { const m4 = new T.Matrix4(); let i = 0; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { m4.makeScale(1, .7, 1); m4.setPosition((132 + c * 30) * U, BH + .3, (384 + 44 + r * 52) * U); cab.setMatrixAt(i++, m4); } } cab.castShadow = true; scene.add(cab);

    /* 사람 */
    const faceT = tex(cvs(128, 104, g => { g.fillStyle = '#1b1b1b'; g.beginPath(); g.ellipse(40, 38, 9, 13, 0, 0, 7); g.ellipse(88, 38, 9, 13, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(43, 33, 3.5, 0, 7); g.arc(91, 33, 3.5, 0, 7); g.fill(); g.strokeStyle = '#1b1b1b'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(64, 58, 26, .25, Math.PI - .25); g.stroke(); }));
    function human(shirt, skin, hat, pants = 0x1d2a44) {
      const g = new T.Group(), sm = lam({ color: shirt }), km = lam({ color: skin }), pm = lam({ color: pants });
      const part = (w, h, d, m, x, y, z, pivotTop) => { const p = new T.Group(); p.position.set(x, y, z); const b = shadowed(box(w, h, d, m)); b.position.y = pivotTop ? -h / 2 : 0; p.add(b); g.add(p); return p; };
      part(.72, .78, .42, sm, 0, 1.26, 0); const head = part(.44, .46, .44, km, 0, 1.9, 0);
      const hair = shadowed(box(.48, .2, .48, lam({ color: hat || 0x2b1d14 }))); hair.position.y = .22; head.add(hair);
      if (RB) { head.children[0].geometry = new T.CylinderGeometry(.31, .31, .5, 20); hair.geometry = new T.CylinderGeometry(.33, .33, .16, 20); hair.position.y = .3;
        const fc = new T.Mesh(new T.PlaneGeometry(.46, .38), bas({ map: faceT, transparent: true })); fc.position.set(0, 0, .315); head.add(fc); g.scale.setScalar(1.12); }
      if (hat) { const br = box(.46, .06, .3, lam({ color: hat })); br.position.set(0, .14, .34); head.add(br); }
      const u = { g, aL: part(.2, .74, .24, sm, -.47, 1.62, 0, 1), aR: part(.2, .74, .24, sm, .47, 1.62, 0, 1), lL: part(.28, .86, .3, pm, -.18, .87, 0, 1), lR: part(.28, .86, .3, pm, .18, .87, 0, 1) };
      [u.aL, u.aR].forEach(a => { const h = box(.18, .16, .2, km); h.position.y = -.8; a.add(h); }); [u.lL, u.lR].forEach(l => { const s = box(.3, .14, .42, lam({ color: 0xf2f2f2 })); s.position.set(0, -.84, .06); l.add(s); });
      scene.add(g); return u;
    }
    const swing = (u, t, amp) => { const s = Math.sin(t) * amp; u.lL.rotation.x = s; u.lR.rotation.x = -s; u.aL.rotation.x = -s * .9; u.aR.rotation.x = s * .9; };
    const hero = human(0xff3b4e, 0xffd9b0, 0xffd23f, 0x2f6fdb);
    { const tag = new T.Sprite(new T.SpriteMaterial({ map: tex(cvs(256, 80, g => { g.font = '56px "Jua","Black Han Sans",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#000'; g.strokeText('근로', 128, 42); g.fillStyle = '#fff'; g.fillText('근로', 128, 42); })), depthWrite: false })); tag.scale.set(1.35, .42, 1); tag.position.y = 2.6; hero.g.add(tag); hero.tag = tag; }
    for (let i = 0; i < 16; i++) { const cg = new T.Group(), m = bas({ color: 0xffffff, fog: false }); for (let k = 0; k < 4; k++) { const b = box(8 + Math.random() * 10, 3 + Math.random() * 3, 6 + Math.random() * 7, m); b.position.set(k * 6 - 9 + Math.random() * 3, Math.random() * 2, Math.random() * 5); cg.add(b); } cg.position.set(-120 + Math.random() * 350, 48 + Math.random() * 26, -150 + Math.random() * 380); scene.add(cg); }
    const pedU = peds.map(p => human(new T.Color(p.ts), new T.Color(p.sk), null, [0x1d2a44, 0x3b3b3b, 0x5a4632][Math.floor(Math.random() * 3)]));

    /* 자동차 */
    const glassM = lam({ color: 0x101a2a }), tireM = lam({ color: 0x111111 }), headM = bas({ color: 0xfff3c0 }), tailM = bas({ color: 0xc81e1e }), gWheel = new T.CylinderGeometry(.36, .36, .26, 10);
    const beamT = tex(cvs(64, 128, g => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,240,190,.9)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(22, 128); g.lineTo(42, 128); g.lineTo(64, 0); g.lineTo(0, 0); g.fill(); }));
    const beamM = bas({ map: beamT, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    function carModel(col, taxi, L) {
      const g = new T.Group(), bm = lam({ color: new T.Color(col) }), len = L * U;
      const body = shadowed(box(len, .8, 2, bm)); body.position.y = .78; g.add(body); const bump = box(len + .24, .26, 2.08, lam({ color: 0x2b2f3a })); bump.position.y = .5; g.add(bump);
      const cabn = shadowed(box(len * .52, .7, 1.78, bm)); cabn.position.set(-len * .05, 1.5, 0); g.add(cabn);
      const wm = lam({ color: 0xa8dcff }); [[len * .26 + .01, 0, .1, 1.5], [-len * .26 - .01 - len * .1, 0, .1, 1.5]].forEach(([x, , w, d]) => { const win = box(w, .46, d, wm); win.position.set(x - len * .05 + (x < 0 ? len * .1 : 0), 1.52, 0); g.add(win); });
      [.9, -.9].forEach(z => { const win = box(len * .4, .44, .04, wm); win.position.set(-len * .05, 1.52, z); g.add(win); });
      [[.3, 1.02], [.3, -1.02], [-.3, 1.02], [-.3, -1.02]].forEach(([u, z]) => { const w = new T.Mesh(gWheel, tireM); w.rotation.x = Math.PI / 2; w.position.set(len * u, .5, z); w.scale.set(1.35, 1, 1.35); g.add(w); const hub = new T.Mesh(gWheel, lam({ color: 0xdfe4ea })); hub.rotation.x = Math.PI / 2; hub.position.set(len * u, .5, z + Math.sign(z) * .06); hub.scale.set(.6, 1, .6); g.add(hub); });
      [.62, -.62].forEach(z => { const h = box(.1, .3, .46, headM); h.position.set(len / 2 + .02, .86, z); g.add(h); const t = box(.1, .26, .46, tailM); t.position.set(-len / 2 - .02, .88, z); g.add(t); });
      if (taxi) { const s = box(.8, .34, .4, bas({ color: 0xffffff })); s.position.set(-len * .05, 2.04, 0); g.add(s); const st = box(len * .9, .16, 2.02, lam({ color: 0x111111 })); st.position.y = .86; g.add(st); }
      const bm2 = new T.Mesh(new T.PlaneGeometry(6, 13), beamM); bm2.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); bm2.position.set(len / 2 + 6.4, .06, 0); g.add(bm2);
      scene.add(g); return g;
    }
    const carU = cars.map(c => carModel(c.c, c.taxi, c.len)), taxiU = carModel('#f2c230', true, 62), myCar = carModel('#e23b3b', false, 62); taxiU.visible = false; myCar.visible = false;

    /* 이모지 말풍선 */
    const emoM = {}, emo = e => emoM[e] || (emoM[e] = new T.SpriteMaterial({ map: tex(cvs(128, 128, g => { g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.stroke(); UC.drawIcon(g, UC.iconName(e) || 'talk', 64, 64, 78); })), depthWrite: false }));
    const bubble = (e, s = 1.3) => { const sp = new T.Sprite(emo(e)); sp.scale.setScalar(s); scene.add(sp); return sp; };
    /* 말 걸 수 있는 사람들 */
    const npcU = UC.NPCS.map(n => { const u = human(new T.Color(n.shirt), 0xf1c9a5, null); u.g.position.set(n.x * U, onBlock(n.x, n.y) ? BH : 0, n.y * U); const b = bubble('💬', 1.2); b.position.set(n.x * U, 3, n.y * U); return { n, u, b }; });
    /* 배추밭 게임용 배추 */
    const cabPool = Array.from({ length: 8 }, () => { const m = shadowed(new T.Mesh(new T.IcosahedronGeometry(.62, 0), lam({ color: 0x3fa84c, flatShading: true }))); m.visible = false; m.scale.y = .72; scene.add(m); return m; });
    /* 식당 안 */
    const ax0 = AR.x0 * U, az0 = AR.y0 * U, aw = (AR.x1 - AR.x0) * U, ad = (AR.y1 - AR.y0) * U;
    { const fl = new T.Mesh(new T.PlaneGeometry(aw, ad), lam({ map: tex(cvs(256, 256, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#9a6a3c' : '#8a5c32'; g.fillRect(0, i * 32, 256, 32); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 32, 256, 2); g.fillRect((i * 70) % 256, i * 32, 2, 32); } }), 1) })); fl.material.map.repeat.set(4, 3); fl.rotation.x = -Math.PI / 2; fl.position.set(ax0 + aw / 2, .02, az0 + ad / 2); fl.receiveShadow = true; scene.add(fl);
      // 벽은 안쪽에서만 보이게(바깥에서 보면 투명) → 카메라가 벽 밖에 있어도 안이 보임
      const wallT = tex(cvs(256, 128, g => { g.fillStyle = '#ead9b6'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#7a3b2a'; g.fillRect(0, 96, 256, 32); g.fillStyle = '#5a2a1c'; g.fillRect(0, 92, 256, 5);
        [[40, 26, '#ffb347'], [150, 20, '#7de3ff']].forEach(([x, y, c]) => { g.fillStyle = '#3a2a1c'; g.fillRect(x - 4, y - 4, 68, 50); g.fillStyle = c; g.fillRect(x, y, 60, 42); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, 60, 14); }); }), 1);
      [[aw, ax0 + aw / 2, az0, 0], [aw, ax0 + aw / 2, az0 + ad, Math.PI], [ad, ax0, az0 + ad / 2, Math.PI / 2], [ad, ax0 + aw, az0 + ad / 2, -Math.PI / 2]].forEach(([w, x, z, ry]) => { const m = lam({ map: wallT.clone() }); m.map.repeat.set(Math.round(w / 6), 1); m.map.needsUpdate = true; const wl = new T.Mesh(new T.PlaneGeometry(w, 5), m); wl.rotation.y = ry; wl.position.set(x, 2.5, z); scene.add(wl); });
      const ct = shadowed(box(aw, 1.1, 1.2, lam({ color: 0x5a3a22 }))); ct.position.set(ax0 + aw / 2, .55, az0 + .65); scene.add(ct); const tp = box(aw, .1, 1.4, lam({ color: 0xd9c9a6 })); tp.position.set(ax0 + aw / 2, 1.15, az0 + .65); scene.add(tp);
      const tm = lam({ color: 0x8b5a2b }), gt = new T.CylinderGeometry(1, 1, .12, 14), gl = new T.CylinderGeometry(.12, .12, .9, 6);
      AR.tb.forEach(([x, y]) => { const t = shadowed(new T.Mesh(gt, tm)); t.position.set(x * U, .95, y * U); scene.add(t); const l = new T.Mesh(gl, darkM); l.position.set(x * U, .45, y * U); scene.add(l); }); }
    const DISH = ['🍜', '🍚', '🥟', '🍲'];
    AR.st.forEach(([x, y], i) => { const b = bubble(DISH[i], 1.5); b.position.set(x * U, 2.3, (y - 26) * U); });
    const guests = AR.tb.map(([x, y], i) => { const u = human([0x3a86ff, 0xff006e, 0x8338ec, 0xfb5607, 0x2a9d8f, 0xffbe0b][i], [0xe8c39e, 0xc68642, 0xf1d3b3][i % 3], null); u.g.position.set(x * U + 1.5, 0, y * U); u.g.rotation.y = -Math.PI / 2; u.g.visible = false; const b = bubble('🍜', 1.25); b.position.set(x * U, 2.6, y * U); b.visible = false; return { u, b }; });
    const carryS = bubble('🍜', .95); carryS.visible = false;

    /* 미션 표시 */
    const mk = new T.Group(); { const c = new T.Mesh(new T.CylinderGeometry(1.7, 1.7, 2.4, 28, 1, true), bas({ color: 0xffd23f, transparent: true, opacity: .38, side: T.DoubleSide, depthWrite: false })); c.position.y = 1.2; mk.add(c);
      const r = new T.Mesh(new T.RingGeometry(1.5, 1.9, 32), bas({ color: 0xffd23f, side: T.DoubleSide, transparent: true, opacity: .9 })); r.rotation.x = -Math.PI / 2; r.position.y = .05; mk.add(r);
      const bm = new T.Mesh(new T.CylinderGeometry(.35, .35, 90, 8, 1, true), bas({ color: 0xffe27d, transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false, fog: false })); bm.position.y = 45; mk.add(bm);
      const ar = new T.Mesh(new T.ConeGeometry(.8, 1.5, 4), bas({ color: 0xffd23f })); ar.rotation.x = Math.PI; ar.position.y = 5; mk.add(ar); mk.userData.ar = ar; } scene.add(mk);

    /* 눈 · 비 */
    const NP = 1400, pp = new Float32Array(NP * 3); for (let i = 0; i < NP * 3; i++) pp[i] = (Math.random() - .5) * (i % 3 === 1 ? 34 : 70);
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3));
    const dotT = tex(cvs(32, 32, g => { g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 13, 0, 7); g.fill(); }));
    const snowP = new T.Points(pg, new T.PointsMaterial({ color: 0xffffff, size: .16, map: dotT, alphaTest: .4, transparent: true, opacity: .95, depthWrite: false })); snowP.frustumCulled = false; scene.add(snowP);
    const NR = 900, rp = new Float32Array(NR * 6), rs = Array.from({ length: NR }, () => [(Math.random() - .5) * 60, Math.random() * 30, (Math.random() - .5) * 60]);
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    const rainP = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xbfd3ea, transparent: true, opacity: .55 })); rainP.frustumCulled = false; scene.add(rainP);

    /* 분위기: 노을 / 밤 / 눈 / 비 */
    function mood() {
      const M = fx.night ? { sky: ['#0b1445', '#1d2f86', '#4a5fc4'], fog: 0x1c2a70, near: 40, far: 230, hemi: [0x8fa0ff, 0x1c2250, .62], sun: [0xaab6ff, .34], em: 1, glow: 1 }
        : fx.rain ? { sky: ['#5c6878', '#8492a3', '#aab6c4'], fog: 0x93a0b0, near: 30, far: 190, hemi: [0xd6e0ee, 0x4a5560, .7], sun: [0xe6eef8, .4], em: .5, glow: .5 }
        : fx.snow ? { sky: ['#8fa0b5', '#c3d0dc', '#eef3f7'], fog: 0xd3dde6, near: 26, far: 170, hemi: [0xffffff, 0x8a94a0, .95], sun: [0xffffff, .55], em: .25, glow: .25 }
        : { sky: ['#1a73f0', '#58b0ff', '#c4e8ff'], fog: 0xc4e8ff, near: 80, far: 340, hemi: [0xffffff, 0x7fae6e, .62], sun: [0xfff3da, .92], em: 0, glow: 0 };
      const g = skyC.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, M.sky[0]); gr.addColorStop(.26, M.sky[1]); gr.addColorStop(.46, M.sky[2]); gr.addColorStop(1, M.sky[2]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyT.needsUpdate = true;
      scene.fog.color.set(M.fog); scene.fog.near = M.near; scene.fog.far = M.far; hemi.color.set(M.hemi[0]); hemi.groundColor.set(M.hemi[1]); hemi.intensity = M.hemi[2]; sun.color.set(M.sun[0]); sun.intensity = M.sun[1];
      nightMats.forEach(m => m.emissiveIntensity = M.em); haloM.opacity = M.glow * .9; poolM.opacity = M.glow * .32; beamM.opacity = M.glow * .5;
      sunDisc.visible = false; snowP.visible = !!fx.snow; rainP.visible = !!fx.rain; base.material.color.set(fx.snow ? 0x7d858f : 0x24262b);
      paintGround(!!fx.snow); cab.visible = deco && !fx.snow; leafM.color.set(fx.snow ? 0xdfe8ee : 0x35c24a); leaf2M.color.set(fx.snow ? 0xffffff : 0x5fe06a); palmM.color.set(fx.snow ? 0xc9d8de : 0x2f9a4a);
      shops.forEach(s => { const sh = !!fx.shutter; s.mats.forEach(m => m.color.set(sh ? 0x6a6a6a : 0xffffff)); s.sm.map = sh ? rentTex : s.st; s.sm.needsUpdate = true; s.fronts.forEach(m => { const rep = m.map.repeat.x; m.map = (sh ? shutTex : glassTex).clone(); m.map.repeat.set(rep, 1); m.map.needsUpdate = true; m.emissiveMap = sh ? null : m.map; m.needsUpdate = true; }); s.awn.forEach(m => m.color.set(sh ? 0x777777 : 0xffffff)); });
    }

    const cp = new T.Vector3(), look = new T.Vector3(); let first = true, py = 0;
    const inside = (x, y) => B.some(b => x > b.x - 6 && x < b.x + b.w + 6 && y > b.y - 6 && y < b.y + b.h + 6);
    function render(dt) {
      const px = pl.x * U, pz = pl.y * U; py += ((onBlock(pl.x, pl.y) ? BH : 0) - py) * Math.min(1, dt * 12);
      hero.g.visible = !pl.taxi && !pl.drive; taxiU.visible = pl.taxi; myCar.visible = !!pl.drive && !pl.taxi;
      if (pl.taxi) { taxiU.position.set(px, 0, pz); taxiU.rotation.y = -pl.a; }
      if (pl.drive) { myCar.position.set(px, 0, pz); myCar.rotation.y = -pl.a; }
      npcU.forEach(o => { o.b.position.y = 3 + Math.sin(tick * 4 + o.n.x) * .15; if (npcOk[o.n.id] && o.b.material !== emo('✅')) o.b.material = emo('✅'); });
      if (carryS.visible) carryS.position.set(px, py + 2.9, pz);
      hero.g.position.set(px, py, pz); hero.g.rotation.y = Math.PI / 2 - pl.a; swing(hero, pl.walk, pl.moving ? .75 : 0); if (!pl.moving) { hero.aL.rotation.x *= .8; hero.lL.rotation.x *= .8; }
      peds.forEach((p, i) => { const u = pedU[i], x = p.ax === 'x' ? p.p : p.q, y = p.ax === 'x' ? p.q : p.p, a = p.ax === 'x' ? (p.d > 0 ? 0 : Math.PI) : (p.d > 0 ? Math.PI / 2 : -Math.PI / 2); u.g.position.set(x * U, onBlock(x, y) ? BH : 0, y * U); u.g.rotation.y = Math.PI / 2 - a; swing(u, p.t * .8, .6); });
      cars.forEach((c, i) => { const x = c.ax === 'x' ? c.p : c.lane, y = c.ax === 'x' ? c.lane : c.p, a = c.ax === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2); carU[i].position.set(x * U, 0, y * U); carU[i].rotation.y = -a; });
      mk.visible = !!target; if (target) { const s = 1 + Math.sin(tick * 5) * .08; mk.position.set(target[0] * U, onBlock(target[0], target[1]) ? BH : 0, target[1] * U); mk.scale.set(s, 1, s); mk.userData.ar.position.y = 5 + Math.sin(tick * 5) * .5; mk.userData.ar.rotation.y = tick * 2; }
      if (B.beacon) B.beacon.visible = Math.sin(tick * 5) > 0;
      smokes.forEach(s => { const t = (s.userData.t + tick * .1) % 1; s.position.set(s.userData.x + t * 5, s.userData.y + t * 9, s.userData.z - t * 2); s.scale.setScalar(.7 + t * 2.4); s.material.opacity = .45 * (1 - t); });
      // 카메라: 뒤에서 따라감 (건물에 가리면 당겨 붙음)
      const fxv = Math.cos(camYaw), fzv = Math.sin(camYaw), tall = vh > vw; let dist = (tall ? 11.5 : 8.6) + (pl.drive ? 4 : 0) - (arena ? 2.2 : 0);
      const full = dist; for (let k = 1; k <= 8; k++) { const d = dist * k / 8; if (inside(pl.x - fxv * d * 16, pl.y - fzv * d * 16)) { dist = Math.max(3.2, d - 1.7); break; } }
      cp.set(px - fxv * dist, py + 2.5 + dist * .3, pz - fzv * dist);
      if (hero.tag) hero.tag.visible = !talkCam;
      if (talkCam && !arena) {
        if (talkOff == null) { talkOff = 0; for (const o of [.35, -.35, 1.1, -1.1, 1.9, -1.9, 2.7, -2.7]) { const a = pl.a + o; if (!hit(pl.x + Math.cos(a) * 80, pl.y + Math.sin(a) * 80, 26) && !hit(pl.x + Math.cos(a) * 44, pl.y + Math.sin(a) * 44, 20)) { talkOff = o; break; } } }
        const a = pl.a + talkOff; cp.set(px + Math.cos(a) * 5, py + 2.2, pz + Math.sin(a) * 5); cam.position.lerp(cp, Math.min(1, dt * 5));
      }
      if (first) { cam.position.copy(cp); first = false; } else if (!(talkCam && !arena)) cam.position.lerp(cp, Math.min(1, dt * 7));
      if (talkCam && !arena) look.set(px, py + 1.75, pz); else look.set(px + fxv * 3, py + 1.5, pz + fzv * 3);
      cam.lookAt(look);
      sun.position.set(px - 36, 30, pz + 14); sun.target.position.set(px, 0, pz); sunDisc.position.set(cam.position.x - 420, 70, cam.position.z + 150); sunDisc.lookAt(cam.position);
      if (fx.snow) { const a = pg.attributes.position.array; for (let i = 0; i < NP; i++) { a[i * 3 + 1] -= dt * (2 + (i % 5) * .5); a[i * 3] += Math.sin(tick + i) * dt * .5; if (a[i * 3 + 1] < -2) a[i * 3 + 1] = 30; } pg.attributes.position.needsUpdate = true; snowP.position.set(cam.position.x, 0, cam.position.z); }
      if (fx.rain) { for (let i = 0; i < NR; i++) { const r = rs[i]; r[1] -= dt * 38; if (r[1] < 0) r[1] = 30; rp.set([r[0], r[1], r[2], r[0] - .15, r[1] + 1.1, r[2]], i * 6); } rg.attributes.position.needsUpdate = true; rainP.position.set(cam.position.x, 0, cam.position.z); }
      R.render(scene, cam);
    }
    function size() { R.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.fov = innerHeight > innerWidth ? 72 : 58; cam.updateProjectionMatrix(); }
    size(); mood();
    return { render, size, mood, reset() { first = true; },
      farmSet(i, it) { const m = cabPool[i]; m.visible = !!it; if (it) { m.position.set(it.x * U, BH + .36, it.y * U); m.material.color.set(it.kind === 'gold' ? 0xffd23f : it.kind === 'bad' ? 0x6b4a2a : 0x3fa84c); } },
      farmDeco(v) { deco = v; cab.visible = v && !fx.snow; },
      restSet(i, order, face) { const g = guests[i]; g.u.g.visible = !!order; g.b.visible = !!order; if (order) g.b.material = emo(order); },
      carry(e) { carryS.visible = !!e; if (e) carryS.material = emo(e); },
      low() { R.shadowMap.enabled = false; sun.castShadow = false; R.setPixelRatio(1); R.setSize(innerWidth, innerHeight, false); scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); } };
  }

  if (use3D) { try { G3 = make3D(); } catch (e) { console.error(e); if (QS.get('3d') == null) { LS.set('gfx', '2d'); location.reload(); } } }
  function frame(now) {
    const raw = now - last, dt = Math.min(.05, raw / 1000) * (SPEED > 1 ? 4 : 1); last = now;
    if (use3D && G3 && !paused && raw < 1000) {          // 기기가 느리면 그림자 끄기 → 그래도 느리면 2D 도시로 전환
      ema += (raw - ema) * .15; frames += raw;       // frames = 측정한 시간(ms)
      if (frames > 3500 && ema > 48 && !lowQ) { lowQ = 1; G3.low(); frames = 0; }
      else if (frames > 4000 && lowQ === 1 && ema > 120 && QS.get('3d') == null) { lowQ = 2; LS.set('gfx', '2d'); location.reload(); return; }
    }
    if (!paused && use3D) {
      update(dt); G3 && G3.render(dt); drawRadar();
      const nv = $('#nav'); if (target) { const d = Math.hypot(target[0] - pl.x, target[1] - pl.y), a = Math.atan2(target[1] - pl.y, target[0] - pl.x) - camYaw; nv.style.display = 'flex'; nv.firstChild.style.transform = `rotate(${a}rad)`; nv.lastChild.textContent = Math.round(d / 16) + 'm'; } else nv.style.display = 'none';
    } else if (!paused) {
      update(dt);
      cx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * dpr * scale, -camY * dpr * scale); drawWorld(); lights();
      if (target) {       // 화면 밖이면 방향 화살표
        const sx = (target[0] - camX) * scale, sy = (target[1] - camY) * scale;
        if (sx < 0 || sy < 0 || sx > vw || sy > vh) { const a = Math.atan2(sy - vh / 2, sx - vw / 2), r = Math.min(vw, vh) / 2 - 70;
          cx.save(); cx.translate(vw / 2 + Math.cos(a) * r, vh / 2 + Math.sin(a) * r); cx.rotate(a); cx.fillStyle = '#ffd23f'; cx.strokeStyle = '#000'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(24, 0); cx.lineTo(-14, -17); cx.lineTo(-14, 17); cx.closePath(); cx.fill(); cx.stroke(); cx.restore(); }
      }
      if (joy && (Math.abs(joy.dx) > 4 || Math.abs(joy.dy) > 4)) { const m = Math.min(46, Math.hypot(joy.dx, joy.dy)), a = Math.atan2(joy.dy, joy.dx);
        cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 4; cx.beginPath(); cx.arc(joy.ox, joy.oy, 46, 0, 7); cx.stroke(); cx.fillStyle = 'rgba(255,210,63,.85)'; cx.beginPath(); cx.arc(joy.ox + Math.cos(a) * m, joy.oy + Math.sin(a) * m, 20, 0, 7); cx.fill(); }
      if (caption) { cx.font = font(28); cx.textAlign = 'center'; cx.lineWidth = 6; cx.strokeStyle = '#000'; cx.strokeText(caption, vw / 2, vh - 150); cx.fillStyle = '#fff'; cx.fillText(caption, vw / 2, vh - 150); }
      drawRadar();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    pause(v) { paused = v; if (v) joy = null; },
    place(key) { [pl.x, pl.y] = SPOT[key]; camYaw = { home: 0, mail: 0, farm: Math.PI, call: -Math.PI / 2, rest: Math.PI / 2, center: -Math.PI / 2, counsel: Math.PI / 2 }[key] ?? camYaw; if (use3D) pl.a = camYaw; G3 && G3.reset(); },
    setFx(o) { Object.assign(fx, o); G3 && G3.mood(); },
    caption(t) { caption = t || ''; const c = $('#cap'); c.textContent = use3D ? caption : ''; c.style.display = use3D && caption ? 'block' : 'none'; },
    /* 미션 지점까지 걸어가기 (오래 걸리면 택시 버튼) */
    walkTo(key) {
      return new Promise(res => {
        target = SPOT[key].slice(); const taxi = $('#taxi');
        const t = setTimeout(() => taxi.classList.add('on'), (S.fast ? 2500 : 9000) / SPEED);
        const drv = $('#drive'), setD = v => { pl.drive = v; engine(v); drv.textContent = v ? '🚶 내리기' : '🚗 운전하기'; };
        taxi.onclick = () => { setD(false); taxi.classList.remove('on'); drv.classList.remove('on'); beep('vroom'); const f = $('#fade'); f.classList.add('on');
          setTimeout(() => { if (target) { pl.x = target[0]; pl.y = target[1]; G3 && G3.reset(); } setTimeout(() => f.classList.remove('on'), 260); }, 430); };
        drv.onclick = () => setD(!pl.drive); setD(false); drv.classList.add('on');
        onArrive = () => { clearTimeout(t); setD(false); taxi.classList.remove('on'); drv.classList.remove('on'); beep('ok'); res(); };
        if (SPEED > 1) pl.taxi = true;
      });
    },
    clearTarget() { target = null; onArrive = null; pl.drive = false; engine(false); $('#taxi').classList.remove('on'); $('#drive').classList.remove('on'); },
    is3D: use3D && !!G3, AR, talkCam(v) { talkCam = v; talkOff = null; },
    pos() { return [pl.x, pl.y]; },
    freeze(v) { frozen = v; if (v) joy = null; },
    onNear(fn) { onNear = fn; }, npcDone(id) { npcOk[id] = 1; nearId = null; },
    arena(on) { arena = on ? AR : null; $('#mapBox').style.display = on ? 'none' : ''; if (on) { pl.x = AR.x0 + 144; pl.y = AR.y1 - 26; camYaw = pl.a = -Math.PI / 2; G3 && G3.reset(); } },
    farmSet(i, it) { G3 && G3.farmSet(i, it); }, farmDeco(v) { G3 && G3.farmDeco(v); }, restSet(i, o) { G3 && G3.restSet(i, o); }, carry(e) { G3 && G3.carry(e); }
  };
})();

/* ═════════════ 미니게임 ═════════════ */
const timerLoop = (durMs, onTick) => new Promise(res => {       // onTick(남은 비율 0~1, 지난 ms)
  const t0 = performance.now(); let stop = false;
  const f = now => { if (stop) return; const el = (now - t0) * SPEED; if (el >= durMs) { onTick(1, durMs); res(); return; } onTick(el / durMs, el); requestAnimationFrame(f); };
  requestAnimationFrame(f); timerLoop.cancel = () => { stop = true; };
});
async function ready(emoji, title, how) {
  stage(`<div class="full dim"><div style="font-size:5rem">${emoji}</div><div class="gt h1">${title}</div><div class="how">${how}</div><div class="gt y" style="font-size:6rem" id="cd">3</div></div>`);
  for (let n = 3; n > 0; n--) { $('#cd').textContent = n; beep('tap'); await sleep(650); }
}
const snowHTML = n => `<div class="snow">${Array.from({ length: n }, () => `<i style="left:${Math.random() * 100}%;animation-duration:${3 + Math.random() * 4}s;animation-delay:-${Math.random() * 5}s;font-size:${10 + Math.random() * 16}px">❄</i>`).join('')}</div>`;

/* 1장 — 배추 뽑기 */
async function gameCabbage2D() {
  await ready('🥬', '배추 뽑기', '올라온 배추를 눌러 뽑아요 · ✨황금 배추 3포기 · 🐛벌레는 누르면 안 돼요');
  const D = sec(60) * 1000; let n = 0;
  const s = stage(`<div class="mg farm"><div class="mgTop"><span class="gt cnt">🥬 <b id="cabN">0</b>포기</span>
    <div class="season"><i></i><span class="s1">🍂 김장철</span><span class="s2">❄️ 겨울</span></div><span class="gt tm" id="tm"></span></div>
    <div class="holes">${'<button class="hole"><span></span></button>'.repeat(12)}</div><div id="snowBox"></div></div>`);
  const holes = [...s.querySelectorAll('.hole')].map(elm => ({ elm, kind: null, until: 0 }));
  holes.forEach(h => h.elm.addEventListener('pointerdown', e => {
    e.preventDefault(); if (!h.kind) return;
    const r = h.elm.getBoundingClientRect();
    if (h.kind === 'worm') { n = Math.max(0, n - 1); beep('bad'); fly('으악 벌레! −1', r.left, r.top, '#ff4d6d'); }
    else { const g = h.kind === 'gold' ? 3 : 1; n += g; beep('ok'); fly('+' + g, r.left + r.width / 2, r.top); }
    h.kind = null; h.elm.classList.add('hit'); setTimeout(() => h.elm.className = 'hole', 220);
    $('#cabN').textContent = n;
  }));
  let lastSpawn = 0, cold = false;
  await timerLoop(D, (p, el) => {
    $('#tm').textContent = Math.ceil((D - el) / 1000); s.querySelector('.season i').style.width = p * 100 + '%';
    if (p > .8 && !cold) { cold = true; s.querySelector('.farm').classList.add('cold'); $('#snowBox').innerHTML = snowHTML(40); }
    holes.forEach(h => { if (h.kind && el > h.until) { h.kind = null; h.elm.className = 'hole'; } });
    const gap = p > .9 ? 1e9 : 380 + 1500 * p * p * p;                // 겨울이 가까울수록 배추가 줄어듦
    if (el - lastSpawn > gap) {
      const free = holes.filter(h => !h.kind && !h.elm.classList.contains('hit'));
      if (free.length) { const h = rnd(free), x = Math.random(); h.kind = x < .1 ? 'worm' : x < .2 ? 'gold' : 'cab';
        h.elm.querySelector('span').textContent = h.kind === 'worm' ? '🐛' : '🥬'; h.elm.className = 'hole up ' + (h.kind === 'gold' ? 'gold' : ''); h.until = el + 1500; }
      lastSpawn = el;
    }
    if (SPEED > 1) holes.forEach(h => { if (h.kind && h.kind !== 'worm') h.elm.dispatchEvent(new Event('pointerdown')); });
  });
  holes.forEach(h => h.elm.className = 'hole');
  await sleep(900); closeStage(); return n;
}


let gameOn = false;          // 3D 미니게임 중엔 행인에게 말 걸기 잠금
/* 1장 — 배추 뽑기 (3D: 밭을 직접 뛰어다님) */
async function gameCabbage3D() {
  await ready('🥬', '배추 뽑기', '밭을 뛰어다니며 배추에 닿으면 뽑혀요 · 🟡 황금 배추 3포기 · 🟤 썩은 배추는 피해요');
  City.place('farm'); City.farmDeco(false); closeStage(); gameOn = true; $('#talk').classList.remove('on');
  const D = sec(60) * 1000, bar = $('#mgbar'), items = Array(8).fill(null); let n = 0, lastSpawn = -1e9, cold = false;
  bar.innerHTML = `<span class="gt cnt">🥬 <b id="cabN">0</b>포기</span><div class="season"><i></i><span class="s1">🍂 김장철</span><span class="s2">❄️ 겨울</span></div><span class="gt tm" id="tm"></span>`; bar.classList.add('on');
  await timerLoop(D, (p, el) => {
    $('#tm').textContent = Math.ceil((D - el) / 1000); bar.querySelector('.season i').style.width = p * 100 + '%';
    if (p > .8 && !cold) { cold = true; City.setFx({ snow: true }); }
    const gap = p > .9 ? 1e9 : 450 + 1900 * p * p * p;                       // 겨울이 가까울수록 배추가 줄어듦
    if (el - lastSpawn > gap) { const i = items.findIndex(x => !x); if (i >= 0 && items.filter(Boolean).length < 6) { const x = Math.random(); items[i] = { x: 134 + Math.random() * 158, y: 424 + Math.random() * 250, kind: x < .12 ? 'bad' : x < .24 ? 'gold' : 'cab', until: el + 7000 }; City.farmSet(i, items[i]); } lastSpawn = el; }
    const [px, py] = City.pos();
    items.forEach((it, i) => { if (!it) return; if (el > it.until) { items[i] = null; City.farmSet(i, null); return; }
      if (Math.hypot(it.x - px, it.y - py) < 27 || (SPEED > 1 && it.kind !== 'bad')) {
        if (it.kind === 'bad') { n = Math.max(0, n - 1); beep('bad'); fly('썩은 배추! −1', innerWidth / 2 - 60, innerHeight / 2 - 40, '#ff4d6d'); }
        else { const g = it.kind === 'gold' ? 3 : 1; n += g; beep('ok'); fly('+' + g, innerWidth / 2, innerHeight / 2 - 60); }
        items[i] = null; City.farmSet(i, null); $('#cabN').textContent = n; } });
  });
  gameOn = false; items.forEach((_, i) => City.farmSet(i, null)); bar.classList.remove('on'); await sleep(700); City.farmDeco(true); return n;
}
const gameCabbage = () => City.is3D ? gameCabbage3D() : gameCabbage2D();

/* 3장 — 동네 식당 (3D: 홀을 뛰어다니며 서빙) */
async function gameRest3D() {
  await ready('🍜', '동네 식당', '주방 앞 음식에 다가가면 들어요 → 같은 음식을 주문한 손님 식탁으로!');
  City.arena(true); closeStage(); gameOn = true; $('#talk').classList.remove('on');
  const DISH = ['🍜', '🍚', '🥟', '🍲'], AR = City.AR, per = [0, 0, 0], RD = sec(60) * 1000 / 3, tb = AR.tb.map(() => ({ order: null, until: 0 })), bar = $('#mgbar');
  const CFG = [{ max: 4, gap: 1700, tv: '📺 점심시간 · 손님 북적북적' }, { max: 2, gap: 5200, tv: '📺 속보: 경기 침체 시작', news: '경기 침체가 시작됐습니다. 사람들이 지갑을 닫고 있습니다.' }, { max: 1, gap: 9000, tv: '📺 속보: 경기 침체 심화', news: '경기 침체가 깊어집니다. 문을 닫는 가게가 늘고 있습니다.' }];
  bar.innerHTML = `<span class="gt cnt">🍽 <b id="svN">0</b>그릇</span><span class="tv" id="tv"></span><div class="sales"><b></b><b></b><b></b></div><span class="gt tm" id="tm"></span>`; bar.classList.add('on');
  let carry = null, total = 0;
  for (let round = 0; round < 3; round++) {
    const C = CFG[round]; $('#tv').textContent = C.tv; $('#tv').className = 'tv ' + (round ? 'alert' : ''); if (C.news) news(C.news);
    let lastSpawn = -C.gap;
    await timerLoop(RD, (p, el) => {
      $('#tm').textContent = Math.ceil((RD - el) / 1000);
      tb.forEach((t, i) => { if (t.order && el > t.until) { t.order = null; City.restSet(i, null); } });
      if (el - lastSpawn > C.gap && tb.filter(t => t.order).length < C.max) { const free = tb.map((t, i) => i).filter(i => !tb[i].order); if (free.length) { const i = rnd(free); tb[i].order = rnd(DISH); tb[i].until = el + 13000; City.restSet(i, tb[i].order); } lastSpawn = el; }
      const [px, py] = City.pos();
      let best = -1, bd = 31; AR.st.forEach(([x, y], i) => { const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && carry !== DISH[best]) { carry = DISH[best]; City.carry(carry); beep('tap'); }
      tb.forEach((t, i) => { const [x, y] = AR.tb[i]; if (t.order && (SPEED > 1 || (carry === t.order && Math.hypot(x - px, y - py) < 42))) {
        t.order = null; City.restSet(i, null); total++; per[round]++; carry = null; City.carry(null); beep('coin'); fly('+1 서빙!', innerWidth / 2 - 40, innerHeight / 2 - 60); $('#svN').textContent = total; } });
    });
    tb.forEach((t, i) => { t.order = null; City.restSet(i, null); });
    const mx = Math.max(6, ...per); bar.querySelectorAll('.sales b').forEach((b, i) => { b.style.height = (i <= round ? Math.max(4, per[i] / mx * 40) : 4) + 'px'; b.textContent = i <= round ? per[i] : ''; });
    await sleep(500);
  }
  $('#tv').textContent = `📉 매출: ${per[0]} → ${per[1]} → ${per[2]}그릇`; await sleep(2000);
  gameOn = false; bar.classList.remove('on'); City.carry(null); City.arena(false); City.place('rest'); return { served: total, per };
}
const gameRest = () => City.is3D ? gameRest3D() : gameRest2D();

/* 2장 — AI 콜센터 */
const CALL_A = { pw: '🔑 비밀번호 재설정 안내', ship: '📦 배송 조회 안내', refund: '💳 환불 접수', fix: '🔧 수리 접수', book: '📅 예약 변경', coupon: '🎁 쿠폰 사용법 안내' };
const CALL_Q = [['pw', '🙍', '비밀번호를 잊어버렸어요!'], ['ship', '🙎', '주문한 운동화가 아직 안 왔어요.'], ['refund', '🧓', '옷이 작아서 돈을 돌려받고 싶어요.'], ['fix', '👨', '이어폰 한쪽이 안 들려요.'],
  ['book', '👩', '토요일 예약을 일요일로 바꾸고 싶어요.'], ['coupon', '🧑', '받은 할인 쿠폰은 어떻게 써요?'], ['ship', '👵', '택배가 지금 어디쯤 있나요?'], ['pw', '👦', '로그인이 안 돼요, 비번이 틀렸대요.'],
  ['refund', '👩‍🦰', '잘못 결제했어요. 취소해 주세요.'], ['fix', '🧔', '충전기가 고장 났어요.'], ['book', '👨‍🦳', '예약 시간을 한 시간 늦추고 싶어요.'], ['coupon', '👧', '쿠폰 번호는 어디에 넣어요?'],
  ['ship', '🧑‍🦱', '배송이 며칠 걸리나요?'], ['fix', '👩‍🦳', '화면이 깨졌는데 고칠 수 있나요?']];
async function gameCall() {
  await ready('🎧', 'AI 콜센터', '손님 문의에 맞는 안내를 빨리 골라요!');
  const D = sec(60) * 1000, DA = D * .42; let ok = 0, tsum = 0, ai = 0, phase = 'A', qT = 0, cur = null, lock = false, deck = [], qid = 0, over = false;
  const s = stage(`<div class="mg call"><div class="mgTop"><span class="gt h2">🎧 실업 시티 고객센터</span><span class="sp"></span><span class="gt tm" id="tm"></span></div>
    <div class="lanes"><div class="lane"><div class="s">🧑 근로</div><div class="n gt g" id="meN">0건</div><div class="s" id="meS">평균 -초</div></div>
      <div class="lane ai" id="aiLane"><div class="s">🤖 AI 상담봇</div><div class="n gt" id="aiN" style="color:#d9b8ff">0건</div><div class="s">1건에 0.1초</div></div></div>
    <div class="qbox"><div class="bubble" id="q"></div><div class="opts" id="as"></div><div class="ask" id="note"></div></div></div>`);
  let elNow = 0;
  const nextQ = () => {
    if (over) return;
    if (!deck.length) deck = shuffle(CALL_Q.slice());
    const [k, e, x] = deck.pop(), id = ++qid; cur = k; qT = elNow; lock = false;
    $('#q').innerHTML = `<span class="e">${UC.face('', id * 7 + 3)}</span><span>"${x}"</span>`;
    const os = shuffle([k, ...pick(Object.keys(CALL_A).filter(a => a !== k), 2)]);
    $('#as').innerHTML = os.map(a => `<button class="opt" data-k="${a}">${CALL_A[a]}</button>`).join('');
    $$('#as .opt').forEach(b => b.addEventListener('pointerdown', ev => { ev.preventDefault(); answer(b); }));
    if (phase === 'B') { setTimeout(() => { if (qid === id && !over) { ai++; const st = document.createElement('div'); st.className = 'stamp'; st.textContent = '🤖 AI가 0.1초 만에 답함!'; $('#q').appendChild(st); beep('tap'); } }, 100);
      setTimeout(() => { if (qid === id && !lock && !over) { $('#note').textContent = '😵 누르기도 전에 AI가 처리해 버렸다…'; nextQ(); } }, 1000 / Math.min(SPEED, 3)); }
  };
  const answer = b => {
    if (lock || over) return; const dt = (elNow - qT) / 1000;
    if (b.dataset.k !== cur) { b.classList.add('no'); beep('bad'); return; }
    lock = true; b.classList.add('yes'); beep('ok');
    if (phase === 'A') { ok++; tsum += dt; $('#meN').textContent = ok + '건'; $('#meS').textContent = `평균 ${(tsum / ok).toFixed(1)}초`; $('#note').textContent = `✅ ${dt.toFixed(1)}초 만에 안내 완료!`; }
    else $('#note').textContent = `근로 ${dt.toFixed(1)}초 vs AI 0.1초 — 이미 AI가 끝냈다…`;
    setTimeout(nextQ, 260);
  };
  nextQ();
  let lastAi = 0;
  await timerLoop(D, (p, el) => {
    elNow = el; $('#tm').textContent = Math.ceil((D - el) / 1000);
    if (phase === 'A' && el > DA) {
      phase = 'B'; $('#aiLane').classList.add('on'); beep('fail'); news('기업들이 AI 상담봇을 잇달아 도입합니다. 1건 처리에 0.1초.');
      $('#note').innerHTML = '📢 <b>AI 상담봇이 들어왔다!</b> 속도 대결 시작'; nextQ();
    }
    if (phase === 'B' && el - lastAi > 240) { ai += 2; lastAi = el; $('#aiN').textContent = ai + '건'; }
    if (SPEED > 1 && phase === 'A' && !lock) { const b = $(`#as .opt[data-k="${cur}"]`); b && answer(b); }
  });
  over = true; cur = null; $('#as').innerHTML = '';
  $('#q').innerHTML = `<span class="e">📊</span><span>근로 <b>${ok}건</b> vs AI 상담봇 <b>${ai}건</b></span>`; $('#note').textContent = '사람이 아무리 빨라도 따라갈 수 없는 속도…';
  await sleep(2400); closeStage(); return { ok, avg: ok ? +(tsum / ok).toFixed(1) : 0, ai };
}

/* 3장 — 동네 식당 서빙 */
async function gameRest2D() {
  await ready('🍜', '동네 식당', '음식을 고르고 → 주문한 손님 식탁을 눌러요');
  const DISH = ['🍜', '🍚', '🥟', '🍲'], FACE = ['🧑', '👩', '👨', '👧', '👦', '🧓', '👵'];
  const RD = sec(60) * 1000 / 3, per = [0, 0, 0];
  const CFG = [{ max: 5, gap: 1100, news: '📺 오늘의 날씨: 맑음 · 손님 북적북적' }, { max: 2, gap: 3600, news: '📺 속보: 경기 침체 시작… 사람들이 지갑을 닫는다' }, { max: 1, gap: 7500, news: '📺 속보: 경기 침체 심화… 문 닫는 가게가 늘어난다' }];
  const s = stage(`<div class="mg rest"><div class="mgTop"><span class="gt cnt">🍽 <b id="svN">0</b>그릇</span><span class="tv" id="tv"></span><span class="sp"></span>
    <div class="sales"><b></b><b></b><b></b></div><span class="gt tm" id="tm"></span></div>
    <div class="tables">${'<button class="tb"><span class="c"></span><span class="o"></span><span class="p"><i></i></span></button>'.repeat(6)}</div>
    <div class="tray">${DISH.map(d => `<button class="dish" data-d="${d}">${d}</button>`).join('')}</div></div>`);
  const tbs = [...s.querySelectorAll('.tb')].map(elm => ({ elm, order: null, until: 0, born: 0 }));
  let sel = null, total = 0, elNow = 0;
  const serve = t => {
    if (!t.order) return;
    if (sel !== t.order) { t.elm.style.animation = 'shake .3s'; setTimeout(() => t.elm.style.animation = '', 300); beep('bad'); return; }
    t.order = null; t.elm.classList.remove('busy'); t.elm.classList.add('ok'); setTimeout(() => t.elm.classList.remove('ok'), 250);
    total++; per[round]++; $('#svN').textContent = total; beep('coin');
    sel = null; $$('.dish').forEach(d => d.classList.remove('sel'));
  };
  $$('.dish').forEach(d => d.addEventListener('pointerdown', e => { e.preventDefault(); sel = d.dataset.d; $$('.dish').forEach(x => x.classList.toggle('sel', x === d)); beep('tap'); }));
  tbs.forEach(t => t.elm.addEventListener('pointerdown', e => { e.preventDefault(); serve(t); }));
  let round = 0;
  for (round = 0; round < 3; round++) {
    const C = CFG[round]; $('#tv').textContent = C.news; $('#tv').className = 'tv ' + (round ? 'alert' : ''); if (round) beep('fail');
    let lastSpawn = -C.gap;
    await timerLoop(RD, (p, el) => {
      elNow = el; $('#tm').textContent = Math.ceil((RD - el) / 1000);
      tbs.forEach(t => { if (t.order) { const r = 1 - (el - t.born) / (t.until - t.born); t.elm.querySelector('.p i').style.width = clamp(r * 100, 0, 100) + '%'; if (el > t.until) { t.order = null; t.elm.classList.remove('busy'); } } });
      if (el - lastSpawn > C.gap && tbs.filter(t => t.order).length < C.max) {
        const free = tbs.filter(t => !t.order);
        if (free.length) { const t = rnd(free); t.order = rnd(DISH); t.born = el; t.until = el + 7000; t.elm.querySelector('.c').textContent = rnd(FACE); t.elm.querySelector('.o').textContent = t.order; t.elm.classList.add('busy'); }
        lastSpawn = el;
      }
      if (SPEED > 1) tbs.forEach(t => { if (t.order) { sel = t.order; serve(t); } });
    });
    tbs.forEach(t => { t.order = null; t.elm.classList.remove('busy'); });
    const mx = Math.max(6, ...per); $$('.sales b').forEach((b, i) => { b.style.height = (i <= round ? Math.max(4, per[i] / mx * 40) : 4) + 'px'; b.textContent = i <= round ? per[i] : ''; });
    await sleep(500);
  }
  $('#tv').textContent = `📉 매출: ${per[0]} → ${per[1]} → ${per[2]}그릇`;
  await sleep(2200); closeStage(); return { served: total, per };
}

/* 4장 — 직업 체험 (누르기 / 타이밍 / 분류) */
const SORT_ITEMS = {
  sorter: { L: ['🟥📦 빨강 딱지 상자', '🟥📦 빨강 스티커 택배', '🟥✉️ 빨강 봉투'], R: ['🟦📦 파랑 딱지 상자', '🟦📦 파랑 스티커 택배', '🟦✉️ 파랑 봉투'] },
  librarian: { L: ['📕 옛날이야기 모음', '📗 모험 소설', '📙 추리 소설', '📘 동화책'], R: ['🔭 우주의 비밀', '🦖 공룡 백과', '🫀 우리 몸 탐험', '🧪 화학 실험 100'] },
  aitrainer: { L: ['AI: "2 + 3 = 5"', 'AI: "한국의 수도는 서울"', 'AI: "일주일은 7일"', 'AI: "물은 100℃에서 끓는다"'], R: ['AI: "2 + 2 = 5"', 'AI: "고래는 물고기다"', 'AI: "해는 서쪽에서 뜬다"', 'AI: "1년은 10달이다"'] }
};
async function gameTrial(key) {
  const J = JOBS[key]; await ready(J.e, J.name + ' 체험', J.how);
  const D = sec(20) * 1000; let n = 0;
  const top = `<div class="mgTop"><span class="gt h2">${J.e} ${J.name}</span><span class="sp"></span><span class="gt cnt g" id="tn">0</span><span class="gt tm" id="tm"></span></div>`;
  const bump = d => { n = Math.max(0, n + d); $('#tn').textContent = n; beep(d > 0 ? 'ok' : 'bad'); };
  let auto = () => {};
  if (J.mech === 'tap') {
    const s = stage(`<div class="mg trial">${top}<div class="grid9">${'<button class="cell"></button>'.repeat(9)}</div></div>`);
    const cells = [...s.querySelectorAll('.cell')]; let lit = -1;
    const light = () => { let k; do k = Math.floor(Math.random() * 9); while (k === lit); if (lit >= 0) { cells[lit].className = 'cell'; cells[lit].textContent = ''; } lit = k; cells[k].className = 'cell lit'; cells[k].textContent = J.target; };
    cells.forEach((c, i) => c.addEventListener('pointerdown', e => { e.preventDefault(); if (i === lit) { bump(1); light(); } }));
    light(); auto = () => cells[lit].dispatchEvent(new Event('pointerdown'));
  } else if (J.mech === 'time') {
    const s = stage(`<div class="mg trial">${top}<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px">
      <div class="meter"><div class="z"></div><div class="nd"></div></div><button class="btn" id="go" style="align-self:center;font-size:2rem">지금!</button></div></div>`);
    let z0 = 40, zw = 24, pos = 0;
    const setZ = () => { zw = Math.max(13, 24 - n); z0 = 5 + Math.random() * (90 - zw); const z = s.querySelector('.z'); z.style.left = z0 + '%'; z.style.width = zw + '%'; };
    setZ(); gameTrial.pos = el => { const t = (el / 950) % 2; pos = (t < 1 ? t : 2 - t) * 100; s.querySelector('.nd').style.left = pos + '%'; };
    $('#go').addEventListener('pointerdown', e => { e.preventDefault(); if (pos >= z0 && pos <= z0 + zw) { bump(1); setZ(); } else { beep('bad'); s.querySelector('.meter').style.animation = 'shake .3s'; setTimeout(() => s.querySelector('.meter').style.animation = '', 300); } });
    auto = () => { if (pos >= z0 && pos <= z0 + zw) $('#go').dispatchEvent(new Event('pointerdown')); };
  } else {
    const IT = SORT_ITEMS[key]; let side = 'L', lock = false;
    stage(`<div class="mg trial">${top}<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">
      <div class="item" id="it"></div><div class="bins"><button class="btn dark" data-s="L">⬅ ${J.L}</button><button class="btn dark" data-s="R">${J.R} ➡</button></div></div></div>`);
    const nextI = () => { side = Math.random() < .5 ? 'L' : 'R'; const it = $('#it'); it.textContent = rnd(IT[side]); it.style.animation = 'none'; void it.offsetWidth; it.style.animation = ''; };
    $$('.bins .btn').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); if (lock) return; if (b.dataset.s === side) { bump(1); nextI(); } else { bump(-1); lock = true; setTimeout(() => lock = false, 350); } }));
    nextI(); auto = () => $(`.bins .btn[data-s="${side}"]`).dispatchEvent(new Event('pointerdown'));
  }
  let lastAuto = 0;
  await timerLoop(D, (p, el) => { $('#tm').textContent = Math.ceil((D - el) / 1000); if (J.mech === 'time') gameTrial.pos(el); if (SPEED > 1 && el - lastAuto > 400) { lastAuto = el; auto(); } });
  const score = clamp(Math.round(n * (J.mech === 'time' ? 8 : J.mech === 'tap' ? 3 : 4) * (S.fast ? 2 : 1)), 0, 100);
  stage(`<div class="full dim"><div style="font-size:4.5rem">${J.e}</div><div class="gt h1">${J.name}</div><div class="gt y" style="font-size:4.5rem">${score}점</div></div>`);
  await sleep(1500); closeStage(); return score;
}

/* 4장 — AI 직업 상담봇 (API 없이 근로의 기록과 답으로 추천) */
async function botChat(R) {
  const cab = R.se?.score ?? 0, call = R.st?.score ?? 0, sv = R.cy?.score ?? 0;
  const s = stage(`<div class="full dim"><div class="phone"><div class="bar">🤖 AI 직업 상담봇 · 잡아봇</div><div class="log" id="log"></div><div class="chips" id="chips"></div></div></div>`);
  const log = $('#log'), add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = 1e6; return d; };
  const bot = async (html, ms = 900) => { const t = add('b typing', '● ● ●'); await sleep(ms); t.className = 'msg b'; t.innerHTML = html; log.scrollTop = 1e6; beep('tap'); };
  const ask = opts => new Promise(res => {
    $('#chips').innerHTML = opts.map(o => `<button class="chip" data-k="${o.k}">${o.x}</button>`).join('');
    $$('#chips .chip').forEach(b => b.onclick = () => { $('#chips').innerHTML = ''; add('u', b.textContent); beep('tap'); res(b.dataset.k); });
    if (SPEED > 1) setTimeout(() => $('#chips .chip')?.click(), 60);
  });
  beep('phone');
  await bot('안녕하세요, 근로 님! 저는 AI 직업 상담봇 <b>잡아봇</b>이에요. 근로 님에게 맞는 일을 같이 찾아봐요 🔍');
  await bot(`지금까지의 일 기록을 분석할게요…<div class="scan" style="margin-top:6px"><i id="scanI"></i></div>`, 600);
  requestAnimationFrame(() => { const i = $('#scanI'); if (i) i.style.width = '100%'; }); await sleep(1500);
  const strong = [[cab / (City.is3D ? 24 : 35), '손이 빠르고 체력이 좋아요 💪'], [call / 9, '문의를 정확하게 안내해요 🎯'], [sv / (City.is3D ? 9 : 14), '여러 일을 한꺼번에 잘 챙겨요 👀']].sort((a, b) => b[0] - a[0])[0][1];
  await bot(`📋 분석 결과<br>🥬 배추 <b>${cab}포기</b> · 🎧 안내 <b>${call}건</b> · 🍜 서빙 <b>${sv}그릇</b><br>→ 근로 님은 <b>${strong}</b>`);
  await bot('두 가지만 물어볼게요. 어떤 일이 더 끌려요?', 700);
  const q1 = await ask([{ k: 'people', x: '🙋 사람을 만나는 일' }, { k: 'solo', x: '🎧 혼자 집중하는 일' }]);
  await bot('좋아요! 그럼 일하는 모습은요?', 700);
  const q2 = await ask([{ k: 'active', x: '🏃 몸을 움직이는 일' }, { k: 'calm', x: '🪑 차분하게 하는 일' }]);
  const jobs = [q1 === 'people' ? 'rider' : 'drone', q1 === 'people' ? 'barista' : 'groomer', q2 === 'active' ? 'sorter' : 'librarian'];
  const why = {
    rider: cab >= 8 ? `배추 ${cab}포기를 뽑은 빠른 손이면 배달도 척척!` : '몸을 움직이며 돌아다니는 일이 잘 맞을 거예요', drone: '혼자 집중해서 멋진 장면을 찍는 일이에요',
    barista: sv >= 4 ? `손님 ${sv}그릇을 챙긴 서빙 경험이 딱 맞아요` : '식당에서 손님을 만나 본 경험을 살릴 수 있어요', groomer: '차분히 집중하는 근로 님에게 어울려요',
    sorter: '몸을 움직이며 정확하게 나누는 일이에요', librarian: call >= 4 ? `문의 ${call}건을 정확히 안내한 꼼꼼함이 강점!` : '차분하고 꼼꼼하게 정리하는 일이에요',
    aitrainer: '직업 훈련에서 배운 새 기술을 바로 쓸 수 있어요'
  };
  if (R.st?.train) jobs.push('aitrainer');
  await bot(`근로 님에게 맞는 직업 <b>${jobs.length}개</b>를 찾았어요!`, 1100);
  for (const j of jobs) { add('b', `<div class="rec">${JOBS[j].e} ${JOBS[j].name}<small>${why[j]}</small></div>`); await sleep(350); }
  if (R.st?.train) await bot('🎓 <b>직업 훈련 수료증</b>이 있네요! 그래서 <b>AI 트레이너</b>도 추천했어요.', 800);
  await bot('하나씩 체험해 보고, 가장 잘 맞는 곳에 취업해요!', 700);
  await ask([{ k: 'go', x: '▶ 체험하러 가기' }]);
  closeStage(); return jobs;
}

/* 실업 상담소 — 사례 분류 */
async function gameCounsel(hint) {
  await ready('🗂️', '실업 상담소', '찾아온 사람의 이야기를 듣고 알맞은 창구로 보내요 · 한 명당 15초');
  const N = S.fast ? 8 : 12, nT = S.fast ? 1 : 2, base = S.fast ? [2, 2, 2, 1] : [3, 3, 2, 2];
  const cnt = shuffle(base.slice());
  const list = shuffle(TK.flatMap((t, i) => pick(CASES[t], cnt[i])).concat(pick(TRAPS, nT)));
  const WIN = [...['fr', 'st', 'cy', 'se'].map(k => ({ k, ...TYPES[k] })), { k: 'none', ...NONE }];
  const s = stage(`<div class="mg csl"><div class="mgTop"><span class="gt h2">🗂️ <span id="ci">1</span> / ${N}</span><div class="tbar" id="tb"><i></i></div><span class="gt cnt g">✔ <span id="cok">0</span></span>
    ${hint ? '<button class="btn" id="hintB" style="font-size:1rem;padding:.3em .8em">💡 힌트 1회</button>' : ''}</div>
    <div class="visitor" id="vis"></div><div class="ask" id="note"></div>
    <div class="wins">${WIN.map(w => `<button class="win" data-k="${w.k}" style="--c:${w.c}"><span class="e">${w.icon}</span>${w.short} 창구</button>`).join('')}</div></div>`);
  let ok = 0; const miss = [], by = {};
  for (let i = 0; i < list.length; i++) {
    const c = list[i]; $('#ci').textContent = i + 1; $('#note').textContent = '';
    $('#vis').className = 'visitor'; $('#vis').innerHTML = `<div class="bubble"><span class="e">${UC.face('', i * 11 + 5)}</span><span>"${c.x}"</span></div>`;
    $$('.win').forEach(w => w.className = 'win');
    let tries = 0, timeout = false, done = null; const fin = new Promise(r => done = r);
    $$('.win').forEach(w => w.onclick = () => {
      if (w.classList.contains('no')) return; tries++;
      if (w.dataset.k === c.t) { w.classList.add('yes'); beep('ok'); timerLoop.cancel(); done(); }
      else {
        w.classList.add('no'); beep('bad'); const T = tinfo(w.dataset.k);
        $('#vis').className = 'visitor'; void $('#vis').offsetWidth; $('#vis').className = 'visitor back';
        $('#note').textContent = w.dataset.k === 'none' ? '↩ 손님이 되돌아왔어요! 이 사람은 일할 마음이 있고, 일자리를 구하는 중이에요.'
          : `↩ 손님이 되돌아왔어요! ${T.short} 창구는 "${T.cause}" 일을 잃은 사람이 가는 곳이에요.`;
      }
    });
    const hb = $('#hintB'); if (hb) hb.onclick = () => { hb.remove(); const wrong = shuffle($$('.win').filter(w => w.dataset.k !== c.t && !w.classList.contains('no'))).slice(0, 3); wrong.forEach(w => w.classList.add('no')); beep('coin'); };
    if (SPEED > 1) setTimeout(() => $(`.win[data-k="${c.t}"]`).click(), 50);
    await Promise.race([fin, timerLoop(15000, p => { $('#tb i').style.width = (1 - p) * 100 + '%'; $('#tb').classList.toggle('low', p > .7); }).then(() => { timeout = true; $('#note').textContent = '⏰ 시간이 지났어요! 이 사람이 "왜" 일이 없는지 다시 읽어 봐요.'; })]);
    await fin;
    const first = tries === 1 && !timeout; if (first) ok++; else miss.push(c.id);
    by[c.t] = by[c.t] || { ok: 0, n: 0 }; by[c.t].n++; if (first) by[c.t].ok++;
    P.cs[c.id] = first ? 1 : 0; $('#cok').textContent = ok;
    $('#note').textContent = `${tinfo(c.t).icon} ${tinfo(c.t).name} — ${tinfo(c.t).why}`;
    await sleep(first ? 1100 : 1900);
  }
  closeStage(); return { ok, n: list.length, miss, by };
}

/* ═════════════ 챕터 진행 ═════════════ */
const lim = a => a.map(v => v * (S.fast ? .5 : 1));       // 빨리 감기면 메달 기준도 절반
const applyFx = () => City.setFx({ snow: !!P.fx.snow, shutter: !!P.fx.shutter, rain: !!P.fx.shutter, night: P.ch === 2 });
async function runSteps(steps) { for (let i = Math.min(P.step, steps.length - 1); i < steps.length; i++) { P.step = i; await save(); await steps[i](); } }

const quizCause = (t, title, wrongs) => choose({
  tag: '🕵️ 원인 찾기', title, opts: CAUSES.map(c => ({ ...c, c: TYPES[c.k]?.c || '#8d99ae' })), correct: t, onWrong: k => wrongs[k] });
const quizName = t => choose({
  tag: '🏷️ 이름 맞히기', title: `"${TYPES[t].cause}" 생기는 실업의 이름은?`, cols: 2,
  opts: TK.map(k => ({ k, e: TYPES[k].icon, x: TYPES[k].name, c: TYPES[k].c })), correct: t,
  onWrong: k => `${TYPES[k].name}은 "${TYPES[k].cause}" 생기는 실업이야. 근로는 왜 일이 없어졌지?` });
const quizPolicy = (t, why) => choose({
  tag: '💊 대책 고르기', title: `${TYPES[t].name}을 줄이려면?`, sub: '나라나 사회가 할 수 있는 일을 골라요',
  opts: POLICIES.map(p => ({ ...p, c: TYPES[p.k].c })), correct: t,
  onWrong: k => `그 대책은 ${TYPES[k].name}에 잘 맞아. ${why}` });

async function quizBlock(t, causeTitle, wrongs) {
  const R = P.rec[t];
  const a = await quizCause(t, causeTitle, wrongs); R.cause1 = a.first; R.causeTries = a.tries;
  const b = await quizName(t); R.name1 = b.first; R.nameTries = b.tries;
  if (a.ok1 && b.ok1) { addMoney(30000, '추리 보너스'); await sleep(500); }
}
async function policyBlock(t, why) { const R = P.rec[t]; const c = await quizPolicy(t, why); R.pol1 = c.first; R.polTries = c.tries; return c.ok1; }
function clearCard(t, extra) {
  P.rec[t].clear = true; hud(); beep('pass');
  const T = TYPES[t], n = TK.filter(k => P.rec[k]?.clear).length;
  return new Promise(res => {
    const s = stage(`<div class="full dim"><div class="pn stripe" style="display:flex;flex-direction:column;gap:10px;align-items:center">
      <div class="gt y h2">실업 도감 ${n} / 4 획득</div><div style="font-size:4.6rem;line-height:1">${T.icon}</div>
      <div class="gt h1" style="color:${T.c}">${T.name}</div>
      <div class="lead">원인 — ${T.cause}<br>${T.vol} 실업 · ${T.dur}</div>
      ${extra ? `<div class="ask">${extra}</div>` : ''}<button class="btn">계속 ▶</button></div></div>`);
    s.querySelector('.btn').onclick = () => { closeStage(); res(); };
    if (SPEED > 1) setTimeout(() => s.querySelector('.btn')?.click(), 80);
  });
}

const CH = {
  /* 오프닝 */
  0: async () => {
    City.place('home');
    await runSteps([async () => {
      objective('오프닝', '');
      await say([
        { who: '강근로', e: '🧑', t: '나는 강근로, 스무 살! 오늘부터 실업 시티에서 내 힘으로 돈을 벌어 독립한다!' },
        { who: '엄마 (전화)', e: '📱', t: '근로야, 통장에 30만 원 넣어 놨다. 생활비 떨어지기 전에 일자리부터 구하렴~' },
        { who: '강근로', e: '🤔', t: '일할 능력 ⭕ 일할 마음 ⭕ … 그런데도 일자리가 없는 상태를 "실업"이라고 한대. 설마 나한테 그런 일이 생기겠어?' }
      ]);
      objective('오프닝', City.is3D ? '화면을 누른 채 위로 끌면 앞으로, 좌우로 끌면 방향이 돌아가요 → 노란 빛기둥까지 가 보자' : '화면을 누른 채 끌면 근로가 움직여요 → 노란 표시까지 가 보자');
      await City.walkTo('mail');
      await say([{ who: '강근로', e: '😎', t: '좋아, 길은 다 익혔어. 첫 일자리를 찾으러 출발!' }]);
    }]);
  },

  /* 1장 배추 농장 → 계절적 */
  1: async () => {
    const t = 'se', R = P.rec[t] = P.rec[t] || {};
    if (P.step > 0) City.place('farm');
    await runSteps([
      async () => { objective('MISSION 1', '배추 농장으로 가자 (노란 표시)'); await missionCard('MISSION 1', '배추 농장'); await City.walkTo('farm'); },
      async () => {
        objective('MISSION 1', '배추를 최대한 많이 뽑자');
        P.emp = 1; save(); news('김장철을 맞아 배추 농가마다 일손이 모자랍니다.');
        await say([{ who: '농장 주인', e: '👩‍🌾', t: '어서 와, 근로! 김장철이라 일손이 모자라. 배추를 많이 뽑을수록 월급에 얹어 줄게!' }]);
        R.score = await gameCabbage(); save(); const pay = 80000 + R.score * 6000;
        await passed('미션 완료', [['뽑은 배추', R.score + '포기'], ['월급', '+' + won(pay)]], medalOf(R.score, ...lim(City.is3D ? [22, 12] : [30, 18]))); addMoney(pay, '월급'); await sleep(700);
      },
      async () => {
        await say([
          { who: '농장 주인', e: '👩‍🌾', t: (R.score ?? 0) >= 8 ? `근로야, ${R.score}포기나 뽑다니 정말 잘했어!` : '근로야, 추운데 끝까지 고생 많았어.' },
          { who: '농장 주인', e: '🥶', t: '그런데… 겨울이 와서 밭이 꽁꽁 얼었네. 이제 뽑을 배추가 없어. 내년 봄에 다시 와 주렴.' },
          { who: '강근로', e: '😨', t: '네?! 저 진짜 열심히 했는데요…!' }
        ]);
        P.fx.snow = true; applyFx(); P.emp = 0; save(); news('올겨울 첫 한파로 전국의 밭이 얼어붙었습니다.'); await wasted('겨울이 와서 배추밭 일이 끝났다'); addMoney(-150000, '생활비'); await sleep(700);
      },
      async () => {
        objective('MISSION 1', '왜 일자리를 잃었는지 생각해 보자');
        await quizBlock(t, '근로는 왜 일자리를 잃었을까?', {
          skill: (R.score ?? 0) >= 8 ? `근로는 배추를 ${R.score}포기나 뽑았어. 더 잘 뽑았다면 겨울에도 일할 수 있었을까?` : '근로가 배추를 두 배로 더 뽑았다면, 겨울에도 계속 일할 수 있었을까?',
          st: '배추 뽑는 기계가 새로 들어온 건 아니었어. 밭에 무슨 일이 생겼지?',
          cy: '김장철엔 일손이 모자랄 만큼 바빴잖아. 배추가 안 팔려서일까?',
          fr: '근로가 스스로 그만둔 걸까? 주인아주머니가 뭐라고 했지?' });
      },
      async () => { await say([{ who: '옆 농장 아저씨', e: '👨‍🌾', t: '허허, 나도 겨울엔 쉬어. 봄에 모내기를 시작하면 다시 바빠지지.' }, { who: '옆 농장 아저씨', e: '👨‍🌾', t: '스키장 강사인 내 조카는 반대야. 겨울엔 바쁘고 여름엔 일이 없대!' }]); },
      async () => {
        const ok = await policyBlock(t, '근로는 "겨울이라서" 일이 없는데, 그걸로 해결될까?');
        if (ok) { addMoney(100000, '지원금'); }
        await clearCard(t, ok ? '🎁 한 번에 맞혔다! 고용 센터가 겨울에도 할 수 있는 일을 바로 이어 줬다 → 콜센터' : '겨울 내내 일을 찾아다닌 끝에 콜센터에 자리가 났다');
      }
    ]);
  },

  /* 2장 AI 콜센터 → 구조적 */
  2: async () => {
    const t = 'st', R = P.rec[t] = P.rec[t] || {};
    if (P.step > 0) City.place('call');
    await runSteps([
      async () => { objective('MISSION 2', 'AI 콜센터로 가자 (노란 표시)'); await missionCard('MISSION 2', 'AI 콜센터'); await City.walkTo('call'); },
      async () => {
        objective('MISSION 2', '손님 문의에 맞는 안내를 빨리 고르자');
        P.emp = 1; save();
        await say([{ who: '팀장', e: '👩‍💼', t: '근로 씨, 환영해요! 손님 문의에 맞는 안내를 골라 주면 돼요. 빠를수록 좋아요!' }]);
        const g = await gameCall(); R.score = g.ok; R.avg = g.avg; R.ai = g.ai; save(); const pay = 80000 + g.ok * 12000;
        await passed('미션 완료', [['정확한 안내', g.ok + '건'], ['평균 속도', g.avg + '초'], ['월급', '+' + won(pay)]], medalOf(g.ok, ...lim([8, 5]))); addMoney(pay, '월급'); await sleep(700);
      },
      async () => {
        await say([
          { who: '팀장', e: '👩‍💼', t: (R.score ?? 0) >= 4 ? `근로 씨, ${R.score}건이나 정확하게 안내했네요. 정말 잘했어요.` : '근로 씨, 첫날인데 고생 많았어요.' },
          { who: '팀장', e: '😔', t: `그런데… AI 상담봇은 같은 시간에 ${R.ai ?? '수백'}건을 처리했어요. 한 건에 0.1초예요.` },
          { who: '팀장', e: '😔', t: '미안해요. 이제 상담은 전부 AI가 해요. 상담원 자리 자체가 없어졌어요.' }
        ]);
        P.emp = 0; save(); await wasted('AI 상담봇이 상담원 일자리를 대신했다'); addMoney(-150000, '생활비'); await sleep(700);
      },
      async () => {
        objective('MISSION 2', '왜 일자리를 잃었는지 생각해 보자');
        await quizBlock(t, '근로는 왜 일자리를 잃었을까?', {
          skill: (R.score ?? 0) >= 4 ? `근로는 ${R.score}건이나 정확히 안내했어. 아무리 빨라져도 0.1초를 이길 수 있을까?` : '근로가 훨씬 더 빨리 안내했다면, 0.1초 만에 답하는 AI를 이길 수 있었을까?',
          se: '계절이 바뀐 건 아니야. 콜센터에 새로 들어온 게 뭐였지?',
          cy: '손님 문의는 여전히 많았어. 일이 줄어든 걸까, 누가 대신 하게 된 걸까?',
          fr: '근로가 스스로 나온 게 아니야. 상담원이라는 일 자체가 어떻게 됐지?' });
      },
      async () => { await say([{ who: '번역가 누나', e: '👩‍💻', t: '나도 그래. AI 번역기가 나오고 나서 번역 일감이 뚝 끊겼어.' }, { who: '번역가 누나', e: '👩‍💻', t: '예전 기술만으로는 다시 일하기 어렵더라. 그래서 요즘 새 기술을 배우고 있어.' }]); },
      async () => {
        const ok = await policyBlock(t, '상담원 일 자체가 사라졌는데, 그걸로 근로가 다시 일할 수 있을까?');
        if (ok) { R.train = true; addMoney(100000, '훈련 수당'); }
        P.fx.snow = false; applyFx();
        await clearCard(t, ok ? '🎓 한 번에 맞혔다! 직업 훈련 수료증 획득 → 4장에서 새 직업 1개가 추가된다' : '새 기술을 배울 기회를 놓쳤다… 그래도 봄이 오고 식당에 자리가 났다');
      }
    ]);
  },

  /* 3장 동네 식당 → 경기적 */
  3: async () => {
    const t = 'cy', R = P.rec[t] = P.rec[t] || {};
    if (P.step > 0) City.place('rest');
    await runSteps([
      async () => { objective('MISSION 3', '근로 식당으로 가자 (노란 표시)'); await missionCard('MISSION 3', '동네 식당'); await City.walkTo('rest'); },
      async () => {
        objective('MISSION 3', '주문받은 음식을 식탁에 가져다주자');
        P.emp = 1; save();
        await say([{ who: '사장님', e: '👨‍🍳', t: '어서 와! 음식을 골라서 주문한 손님께 가져다주면 돼. 점심때는 정신없을 거야!' }]);
        const g = await gameRest(); R.score = g.served; R.per = g.per; save(); const pay = 80000 + g.served * 9000;
        await passed('미션 완료', [['서빙', g.served + '그릇'], ['판별 매출', g.per.join(' → ')], ['월급', '+' + won(pay)]], medalOf(g.served, ...lim(City.is3D ? [8, 5] : [14, 9]))); addMoney(pay, '월급'); await sleep(700);
      },
      async () => {
        await say([
          { who: '사장님', e: '👨‍🍳', t: (R.score ?? 0) >= 4 ? `근로야, ${R.score}그릇이나 나르느라 고생했다.` : '근로야, 오늘 하루 고생했다.' },
          { who: '사장님', e: '😞', t: '그런데 손님이 이렇게 없으니 월급 줄 돈이 없구나… 우리 가게만 그런 게 아니야. 밖을 좀 보렴.' }
        ]);
        P.fx.shutter = true; applyFx(); P.emp = 0; save(); news('경기 침체로 도시 곳곳의 가게가 문을 닫고 있습니다.'); City.place('rest'); City.caption('옆 가게들도 하나둘 셔터를 내렸다…'); beep('fail');
        await sleep(3400); City.caption('');
        await wasted('경기 침체로 도시 전체에 일자리가 줄었다'); addMoney(-150000, '생활비'); await sleep(700);
      },
      async () => {
        objective('MISSION 3', '왜 일자리를 잃었는지 생각해 보자');
        await quizBlock(t, '근로는 왜 일자리를 잃었을까?', {
          skill: (R.score ?? 0) >= 4 ? `근로는 ${R.score}그릇이나 날랐어. 서빙을 더 잘했다면 손님이 늘었을까?` : '근로가 서빙을 훨씬 더 잘했다면, 줄어든 손님이 다시 늘었을까?',
          se: '계절 때문이라면 옷 가게나 서점은 괜찮았을 거야. 다른 가게들은 어땠지?',
          st: '서빙 로봇이 들어온 게 아니야. TV 뉴스에서 뭐라고 했지?',
          fr: '근로가 스스로 그만둔 게 아니야. 사장님이 왜 월급을 못 준다고 했지?' });
      },
      async () => { await say([{ who: '옷 가게 사장님', e: '🧑‍🦱', t: '나도 아르바이트생을 내보냈어. 사람들이 지갑을 닫으니 온 동네 가게가 다 힘들어.' }, { who: '옷 가게 사장님', e: '🧑‍🦱', t: '경기가 살아나서 손님이 돌아와야 다시 사람을 뽑을 수 있을 텐데…' }]); },
      async () => {
        const ok = await policyBlock(t, '도시 전체에 손님(소비)이 줄었는데, 그걸로 가게들이 다시 사람을 뽑을까?');
        if (ok) { P.fx.shutter = false; applyFx(); addMoney(100000, '지원금'); }
        await clearCard(t, ok ? '🏪 한 번에 맞혔다! 경기가 살아나 가게들이 다시 문을 열었다' : '경기가 살아나기까지 꽤 오래 걸렸다…');
      }
    ]);
  },

  /* 4장 고용 센터 → 마찰적 */
  4: async () => {
    const t = 'fr', R = P.rec[t] = P.rec[t] || {};
    if (P.step > 0) City.place('center');
    await runSteps([
      async () => {
        objective('MISSION 4', '고용 센터로 가자 (노란 표시)'); await missionCard('MISSION 4', '고용 센터');
        await say([{ who: '강근로', e: '🧑', t: '세 번이나 일자리를 잃었어… 이번엔 아무 데나 가지 말고, 나한테 맞는 일을 직접 찾아보자!' }]);
        await City.walkTo('center');
      },
      async () => { objective('MISSION 4', 'AI 상담봇과 맞는 직업을 찾자'); news('고용 센터가 구직자에게 일자리 정보를 제공합니다.'); R.jobs = await botChat(P.rec); R.scores = {}; },
      async () => {
        objective('MISSION 4', '직업을 하나씩 체험해 보자');
        R.jobs = R.jobs || ['rider', 'barista', 'sorter']; R.scores = R.scores || {};
        for (const j of R.jobs) { if (R.scores[j] == null) { R.scores[j] = await gameTrial(j); await save(); } }
        const best = R.jobs.slice().sort((a, b) => R.scores[b] - R.scores[a])[0]; P.job = best; const J = JOBS[best];
        await new Promise(res => {
          const s = stage(`<div class="full dim"><div class="pn stripe" style="display:flex;flex-direction:column;gap:10px;align-items:center">
            <div class="gt y h2">체험 결과</div><div class="stats">${R.jobs.map(j => `<span>${JOBS[j].e} ${JOBS[j].name}</span><b>${R.scores[j]}점${j === best ? ' 👑' : ''}</b>`).join('')}</div>
            <div class="lead">기록이 가장 좋은 <b style="color:var(--y)">${J.name}</b>(으)로 취업!</div><button class="btn">출근하기 ▶</button></div></div>`);
          s.querySelector('.btn').onclick = () => { closeStage(); res(); }; if (SPEED > 1) setTimeout(() => s.querySelector('.btn')?.click(), 80);
        });
        P.fx.shutter = false; applyFx(); P.emp = 1; save();
        await passed('취업 성공', [['새 직장', J.e + ' ' + J.name], ['체험 점수', R.scores[best] + '점'], ['첫 월급', '+' + won(500000)]], medalOf(R.scores[best], 80, 55)); addMoney(500000, '첫 월급'); await sleep(700);
      },
      async () => {
        objective('MISSION 4', '일을 찾아다닌 기간을 돌아보자');
        await quizBlock(t, '고용 센터를 다니며 일을 찾던 동안, 근로는 왜 일이 없었을까?', {
          skill: '근로는 체험을 전부 해냈어. 못해서가 아니라, 그동안 뭘 하고 있었지?',
          se: '이번엔 누가 내보낸 게 아니야. 근로가 스스로 뭘 하고 있었지?',
          st: '이번엔 기술 때문에 밀려난 게 아니야. 근로가 스스로 뭘 하고 있었지?',
          cy: '이번엔 가게들이 문을 닫아서가 아니야. 근로가 스스로 뭘 하고 있었지?' });
      },
      async () => { await say([{ who: '이직 준비하는 형', e: '🧑‍💼', t: '나도 월급을 더 주는 회사로 옮기려고 스스로 그만두고 알아보는 중이야.' }, { who: '이직 준비하는 형', e: '🧑‍💼', t: '일자리는 있는데 나한테 맞는 곳을 고르는 데 시간이 걸리는 거지. 금방 구할 거라 걱정은 안 해!' }]); },
      async () => {
        const ok = await policyBlock(t, '근로는 일자리가 없어서가 아니라 "맞는 곳을 찾는 데" 시간이 걸렸어. 그걸로 그 시간이 줄어들까?');
        if (ok) { R.hint = true; addMoney(100000, '지원금'); }
        await clearCard(t, ok ? '💡 한 번에 맞혔다! 상담소에서 쓸 수 있는 힌트 1회 획득' : '실업 4형제를 모두 겪었다. 이제 남을 도울 차례!');
      }
    ]);
  },

  /* 실업 상담소 */
  5: async () => {
    if (P.step > 0) City.place('counsel');
    await runSteps([
      async () => { objective('FINAL MISSION', '실업 상담소로 가자 (노란 표시)'); await missionCard('FINAL MISSION', '실업 상담소'); await City.walkTo('counsel'); },
      async () => {
        objective('FINAL MISSION', '찾아온 사람을 알맞은 창구로 보내자');
        await say([{ who: '상담소장', e: '👩‍⚖️', t: '근로 씨! 실업을 네 가지나 직접 겪어 봤다면서요? 오늘 하루 상담원이 되어 주세요.' }, { who: '상담소장', e: '👩‍⚖️', t: '조심! 일할 마음이 없거나 이미 일하는 사람은 실업자가 아니에요. 그런 분은 "실업자 아님" 창구로!' }]);
        const g = await gameCounsel(!!P.rec.fr?.hint); P.quiz = { ok: g.ok, n: g.n, by: g.by, miss: g.miss }; save();
        const pay = g.ok * 30000; await passed('상담 완료', [['한 번에 보낸 손님', `${g.ok} / ${g.n}명`], ['상담 수당', '+' + won(pay)]], medalOf(g.ok / g.n, .9, .7)); addMoney(pay, '상담 수당'); await sleep(700);
      }
    ]);
  },

  /* 엔딩 */
  6: async () => {
    objective('엔딩', ''); City.clearTarget(); City.onNear(null); $('#talk').classList.remove('on');
    if (!P.done) { await endingTable(); await endingEssay(); P.done = true; await save(); }
    endingStats();
  }
};

/* 엔딩 ① 실업 4형제 비교표 — 게임 기록으로 자동 채움, 틀린 칸만 고치기 */
function endingTable() {
  return new Promise(res => {
    const VOL = [{ k: '자발적', e: '🙋', x: '자발적 — 스스로 그만두고 찾는 중' }, { k: '비자발적', e: '😢', x: '비자발적 — 어쩔 수 없이 잃음' }];
    const cell = {}; let fixes = 0;
    TK.forEach(t => { const R = P.rec[t] || {}; cell[t] = { cause: R.cause1 || null, vol: null, pol: R.pol1 || null }; });
    const right = (t, col) => col === 'vol' ? TYPES[t].vol : t;
    const textOf = (col, v) => col === 'cause' ? CAUSES.find(c => c.k === v)?.x : col === 'pol' ? POLICIES.find(p => p.k === v)?.x : v;
    const allOk = () => TK.every(t => ['cause', 'vol', 'pol'].every(c => cell[t][c] === right(t, c)));
    const draw = () => {
      const td = (t, col) => { const v = cell[t][col];
        if (v === right(t, col)) return `<div class="ok">${textOf(col, v)}</div>`;
        return `<div class="${v ? 'bad' : 'q'}" data-t="${t}" data-c="${col}">${v ? '✖ ' + textOf(col, v) + '<br>👆 눌러서 고치기' : '❓ 눌러서 채우기'}</div>`; };
      const left = TK.reduce((n, t) => n + ['cause', 'vol', 'pol'].filter(c => cell[t][c] !== right(t, c)).length, 0);
      const s = stage(`<div class="full dim"><div class="gt h1">실업 4형제 비교표</div>
        <div class="lead">${left ? `근로의 기록으로 채웠어요. 깜빡이는 칸 <b style="color:var(--y)">${left}개</b>를 눌러 완성해요!` : '✅ 완성! 네 가지 실업을 한눈에 정리했어요'}</div>
        <div class="tbl"><div class="hd">실업</div><div class="hd">왜 생길까 (원인)</div><div class="hd">스스로?</div><div class="hd">얼마나 갈까</div><div class="hd">어떻게 줄일까 (대책)</div>
        ${TK.map(t => `<div class="ty" style="background:${TYPES[t].c}">${TYPES[t].icon}<br>${TYPES[t].short}</div>${td(t, 'cause')}${td(t, 'vol')}<div class="ok">${TYPES[t].dur}</div>${td(t, 'pol')}`).join('')}</div>
        ${left ? '' : '<button class="btn" id="tblGo">내 결과 보기 ▶</button>'}</div>`);
      s.querySelectorAll('[data-t]').forEach(d => d.onclick = () => openPick(d.dataset.t, d.dataset.c));
      const go = $('#tblGo'); if (go) { go.onclick = () => { P.rec.fixes = fixes; closeStage(); res(); }; beep('pass'); if (SPEED > 1) setTimeout(() => go.click(), 80); }
    };
    const openPick = (t, col) => {
      const T = TYPES[t], opts = col === 'cause' ? CAUSES : col === 'pol' ? POLICIES : VOL, pk = $('#pick');
      pk.innerHTML = `<div class="pn stripe" style="display:flex;flex-direction:column;gap:10px;align-items:center">
        <div class="gt h2" style="color:${T.c}">${T.icon} ${T.name}</div><div class="lead">${col === 'cause' ? '왜 생길까?' : col === 'pol' ? '어떻게 줄일까?' : '스스로 그만둔 걸까, 어쩔 수 없이 잃은 걸까?'}</div>
        <div class="opts">${opts.map(o => `<button class="opt" data-k="${o.k}"><span class="e">${o.e}</span><span>${o.x}</span></button>`).join('')}</div><div class="ask"></div></div>`;
      pk.classList.add('on');
      pk.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (b.dataset.k === right(t, col)) { cell[t][col] = b.dataset.k; fixes++; beep('ok'); pk.classList.remove('on'); pk.innerHTML = ''; draw(); }
        else { b.classList.add('no'); beep('bad'); pk.querySelector('.ask').textContent = '🤔 ' + (col === 'vol' ? `${T.short} 실업에서 근로는 스스로 나왔을까, 내보내졌을까?` : `${T.name}은 "${T.cause}" 생겨. 다시 골라 볼까?`); }
      });
    };
    draw();
    if (SPEED > 1) { TK.forEach(t => ['cause', 'vol', 'pol'].forEach(c => cell[t][c] = right(t, c))); draw(); }
  });
}


/* 엔딩 ①-2 한 줄 쓰기: 가장 억울했던 실업 */
function endingEssay() {
  return new Promise(res => {
    let pick = null;
    const s = stage(`<div class="full dim"><div class="pn stripe" style="display:flex;flex-direction:column;gap:12px;align-items:center">
      <div class="gt y h2">✍️ 근로의 한마디</div><div class="gt h1">가장 억울했던 실업은?</div>
      <div class="opts c2">${TK.map(k => `<button class="opt" data-k="${k}" style="--c:${TYPES[k].c}"><span class="e">${TYPES[k].icon}</span><span>${TYPES[k].name}</span></button>`).join('')}</div>
      <div class="lead">왜 그렇게 생각했는지 한 줄로 써 봐요</div>
      <input id="esIn" class="input" style="width:100%" maxlength="80" placeholder="예) 열심히 했는데 계절 때문에 끝나서">
      <button class="btn" id="esGo" disabled>제출 ▶</button></div></div>`);
    const chk = () => $('#esGo').disabled = !(pick && $('#esIn').value.trim().length >= 4);
    s.querySelectorAll('.opt').forEach(b => b.onclick = () => { pick = b.dataset.k; s.querySelectorAll('.opt').forEach(x => x.classList.toggle('yes', x === b)); beep('tap'); chk(); });
    $('#esIn').oninput = chk;
    $('#esGo').onclick = () => { P.essay = { t: pick, x: $('#esIn').value.trim().slice(0, 80) }; beep('ok'); closeStage(); res(); };
    if (SPEED > 1) setTimeout(() => { P.essay = { t: 'se', x: '자동 점검' }; closeStage(); res(); }, 80);
  });
}

/* 길에서 만난 사람에게 말 걸기 — 실업자일까? */
async function talk(id) {
  const n = UC.NPCS.find(x => x.id === id);
  if (!n || talkBusy || gameOn || $('#stage').classList.contains('on') || $('#sub').classList.contains('on')) return;
  talkBusy = true; City.freeze(true); $('#talk').classList.remove('on');
  await say(n.lines.map(t => ({ who: n.who, e: n.e, t })), true);
  const r = await choose({ tag: `${n.e} ${n.who}`, title: '이 사람은 실업자일까?', sub: '실업자 = 일할 능력과 의사가 있는데도 일자리가 없는 사람', cols: 2, correct: n.ans,
    opts: [{ k: 'yes', e: '⭕', x: '실업자다', c: '#ff4d6d' }, { k: 'no', e: '❌', x: '실업자가 아니다', c: '#8d99ae' }],
    onWrong: () => n.ans === 'no' ? '이 사람은 지금 일자리를 구하고 있을까? 일할 마음이 있다고 했나?' : '이 사람은 일할 마음이 있고 일자리를 찾는 중이야. 그런데 아직 자리가…?' });
  await say([{ who: '실업 도감', e: '💡', t: n.why }], true);
  P.npc[id] = r.ok1 ? 1 : 0; City.npcDone(id); addMoney(r.ok1 ? 20000 : 5000, '관찰 보너스'); save();
  City.freeze(false); talkBusy = false;
}

/* 엔딩 ② 내 결과 */
function endingStats() {
  const firsts = TK.reduce((n, t) => { const R = P.rec[t] || {}; return n + (R.cause1 === t) + (R.name1 === t) + (R.pol1 === t); }, 0);
  const q = P.quiz || { ok: 0, n: 0 }, pct = firsts / 12 * 50 + (q.n ? q.ok / q.n * 50 : 0);
  const title = pct >= 85 ? '👑 실업 박사' : pct >= 65 ? '🎖 믿음직한 상담원' : '🌱 쑥쑥 크는 새내기 상담원';
  const J = JOBS[P.job];
  stage(`<div class="full dim"><div class="gt y h2">MISSION ALL CLEAR</div><div class="gt h1">${esc(me.name.split(' ').pop())}의 실업 시티 기록</div>
    <div class="pn stripe" style="width:min(620px,94vw);display:flex;flex-direction:column;gap:12px;align-items:center">
      <div class="gt h1 y">${title}</div>
      <div class="stats"><span>근로의 천직</span><b>${J ? J.e + ' ' + J.name : '-'}</b><span>모은 돈</span><b>${won(P.money)}</b>
        <span>한 번에 맞힌 추리 (원인·이름·대책)</span><b>${firsts} / 12</b><span>상담소 한 번에 보낸 손님</span><b>${q.ok} / ${q.n || 0}</b>
        <span>실업 도감</span><b>${TK.map(k => P.rec[k]?.clear ? TYPES[k].icon : '▫️').join(' ')}</b></div>
    </div>
    <div class="lead" style="max-width:720px">실업은 <b style="color:var(--y)">일할 능력과 마음이 있는데도</b> 일자리가 없는 상태!<br>근로가 일을 못해서가 아니라 계절·기술·경기 때문이었고, 그래서 사회의 대책이 필요해요.</div>
    <div class="wait">${SOLO ? '🎮 혼자 하기 완료! 처음부터 다시 하려면 다른 이름으로 들어와요' : '👀 선생님 화면에서 우리 반 결과를 봐요'}</div></div>`);
  $('#hud').hidden = true; beep('pass');
}

/* ═════════════ 입장 · 진행 ═════════════ */
async function waitOpen(ch) {
  const open = () => SOLO || S.status === 'end' || (S.status === 'run' && (S.open ?? 0) >= ch);
  if (open()) return;
  City.clearTarget();
  objective(ch === 0 ? '입장 완료' : '🔒 잠깐 쉬는 시간', ch === 0 ? '선생님이 시작하면 미션이 열려요 · 화면을 끌어 도시를 구경해요' : `선생님이 다음 미션(${CHAPTERS[ch].name})을 열어 주면 이어져요 · 도시를 구경해요`);
  while (!open()) await nextState();
  toast('🔓 새 미션이 열렸다!', 'good');
}
async function main() {
  $('#hud').hidden = false; hud(); applyFx();
  Object.keys(P.npc || {}).forEach(id => City.npcDone(id));
  City.onNear(id => { const b = $('#talk'), n = UC.NPCS.find(x => x.id === id); b.classList.toggle('on', !!n && !talkBusy && !gameOn); if (n) { b.textContent = `💬 ${n.who}에게 말 걸기`; b.onclick = () => talk(id); } });
  for (;;) {
    await waitOpen(P.ch); applyFx();
    await CH[P.ch]();
    if (P.ch >= 6) break;
    P.ch++; P.step = 0; await save();
  }
}
let joining = false;
async function join(name) {
  name = (name || '').trim().replace(/\s+/g, ' ');
  const id = name.replace(/\s/g, '_').replace(/[\/.#$\[\]]/g, '').slice(0, 40);
  if (!id) { const i = $('#nameIn'); i.classList.remove('err'); void i.offsetWidth; i.classList.add('err'); return; }
  if (joining) return; joining = true; $('#joinBtn').disabled = true;
  let ex = null; try { ex = await store.getPlayer(id); } catch (e) { console.warn(e); }
  me = { id, name }; P = fresh();
  if (ex) ['ch', 'step', 'money', 'rec', 'job', 'quiz', 'cs', 'fx', 'done', 'emp', 'npc', 'essay'].forEach(k => { if (ex[k] != null) P[k] = ex[k]; });
  if (S.status === 'end' && P.ch < 6) { P.ch = 6; P.step = 0; }
  LS.set('name', name); LS.set('reset', S.resetAt || 0);
  await save({ joinedAt: ex?.joinedAt || Date.now() });
  $('#sJoin').classList.remove('on');
  toast(ex && (ex.ch || ex.step) ? '다시 왔네요! 하던 곳부터 이어가요 💪' : `${name.split(' ').pop()}, 실업 시티에 온 걸 환영해요!`, 'good');
  main().catch(e => { console.error(e); toast('문제가 생겼어요 — 새로고침 해 주세요', 'bad'); });
}
$('#joinBtn').onclick = () => { beep('tap'); join($('#nameIn').value); };
$('#nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') join(e.target.value); });
setInterval(() => { if (me) Promise.resolve(store.setPlayer(me.id, { seen: Date.now() })).catch(() => {}); }, 25000);
let lastPos = [0, 0];            // 진행판 지도용: 6초마다, 움직였을 때만 위치 보냄
setInterval(() => { if (!me || SOLO) return; const [x, y] = City.pos(); if (x > 1700 || Math.hypot(x - lastPos[0], y - lastPos[1]) < 60) return; lastPos = [x, y]; Promise.resolve(store.setPlayer(me.id, { pos: [Math.round(x), Math.round(y)], seen: Date.now() })).catch(() => {}); }, 6000);

let first = true, leaving = false;
const onS = s => {
  S = s || {};
  const w = stateWaiters; stateWaiters = []; w.forEach(f => f());
  if (first) {
    first = false; const nm = LS.get('name', ''); $('#nameIn').value = nm;
    if (nm && LS.get('reset', 0) === (S.resetAt || 0)) join(nm); else $('#sJoin').classList.add('on');
    return;
  }
  if (leaving) return;
  if (me && (S.resetAt || 0) !== LS.get('reset', 0)) { leaving = true; LS.set('name', ''); location.reload(); return; }   // 새 반 시작
  if (me && P && S.status === 'end' && P.ch < 6) {                                                                 // 선생님이 엔딩을 엶
    leaving = true; P.ch = 6; P.step = 0; toast('선생님이 엔딩을 열었어요!', 'good');
    save().then(() => setTimeout(() => location.reload(), 1200));
  }
};
if (SOLO) onS({ status: 'run', open: 6, resetAt: 0 }); else store.onState(onS);
})();
