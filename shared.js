/* ═══════════════════════════════════════════════════════════
   백수 위기 탈출: 실업 시티 — 공통 파일 (학생용·진행판이 같이 씀)
   ① Firebase 열쇠와 ② 진행판 암호는 이 파일에서만 고치면 됩니다.
   ═══════════════════════════════════════════════════════════ */
window.UC = (function () {
  'use strict';

  /* ───────── ① Firebase 열쇠 ─────────
     비워 두면 '체험 모드' — 같은 브라우저의 다른 탭끼리만 연결됩니다. */
  const FIREBASE_CONFIG = {apiKey:"AIzaSyApUKeVhJ0EnOm_wu1vcT-14yeax7iQR7I", authDomain:"court-ae96f.firebaseapp.com",projectId:"court-ae96f", storageBucket:"court-ae96f.firebasestorage.app",messagingSenderId:"397308728790", appId:"1:397308728790:web:d6d10fac3865e547d24077"};
  /* ───────── ② 진행판 암호 ───────── */
  const TEACHER_CODE = "1234";

  /* ───────── 실업 4유형 ───────── */
  const TYPES = {
    se: { name: '계절적 실업', short: '계절적', icon: '⛄', c: '#ffb81c', cause: '계절이 바뀌어서', vol: '비자발적', dur: '계절이 돌아올 때까지 (해마다 반복)', why: '계절에 따라 일이 생겼다 없어졌다 해요' },
    st: { name: '구조적 실업', short: '구조적', icon: '🤖', c: '#b06bff', cause: '기술·산업이 바뀌어서', vol: '비자발적', dur: '길게 감 (새 기술을 배워야 함)', why: '기술 발전·산업 구조 변화로 그 일자리 자체가 사라졌어요' },
    cy: { name: '경기적 실업', short: '경기적', icon: '📉', c: '#ff4d6d', cause: '경기가 나빠져서', vol: '비자발적', dur: '경기가 살아날 때까지', why: '경기가 나빠져 여러 곳에서 일자리가 한꺼번에 줄었어요' },
    fr: { name: '마찰적 실업', short: '마찰적', icon: '🔍', c: '#37b6ff', cause: '더 맞는 일을 찾는 중이라서', vol: '자발적', dur: '잠깐 (일시적)', why: '더 나은 일자리를 찾느라 잠시 쉬는 중이에요' }
  };
  const TK = ['se', 'st', 'cy', 'fr'];               // 게임에 나오는 순서
  const NONE = { name: '실업자 아님', short: '실업자 아님', icon: '🙅', c: '#8d99ae', why: '일할 생각이 없거나, 이미 일하는 중이면 실업자가 아니에요' };
  const tinfo = t => TYPES[t] || NONE;

  /* ───────── 원인 보기 (원인 먼저 고르기) ───────── */
  const CAUSES = [
    { k: 'skill', e: '😓', x: '근로가 일을 못해서' },
    { k: 'se', e: '❄️', x: '계절이 바뀌어서' },
    { k: 'st', e: '⚙️', x: '기술·산업이 바뀌어서' },
    { k: 'cy', e: '📉', x: '경기가 나빠져서' },
    { k: 'fr', e: '🧭', x: '더 맞는 일을 찾는 중이라서' }
  ];

  /* ───────── 대책 카드 ───────── */
  const POLICIES = [
    { k: 'se', e: '🍓', x: '일이 없는 계절(비수기)에 할 수 있는 일자리 이어 주기' },
    { k: 'st', e: '🧑‍🏫', x: '새 기술을 배우는 직업 훈련 해 주기' },
    { k: 'cy', e: '🏛️', x: '정부가 돈을 풀어 경기를 살리고 공공 일자리 만들기' },
    { k: 'fr', e: '🗂️', x: '일자리 정보를 빨리 알려 주고 취업 박람회 열기' }
  ];

  /* ───────── 챕터 ───────── */
  const CHAPTERS = [
    { n: 0, name: '오프닝', place: '근로네 집', min: 1, at: '0:00' },
    { n: 1, name: '1장 배추 농장', place: '배추 농장', t: 'se', min: 4, at: '1:00' },
    { n: 2, name: '2장 AI 콜센터', place: '콜센터', t: 'st', min: 4, at: '5:00' },
    { n: 3, name: '3장 동네 식당', place: '근로 식당', t: 'cy', min: 4, at: '9:00' },
    { n: 4, name: '4장 고용 센터', place: '고용 센터', t: 'fr', min: 5, at: '13:00' },
    { n: 5, name: '실업 상담소', place: '실업 상담소', min: 5, at: '18:00' },
    { n: 6, name: '엔딩', place: '', min: 2, at: '23:00' }
  ];

  /* ───────── 상담소 사례 37개 + 함정 5개 (여기만 고치면 됨) ───────── */
  const CASE_RAW = {
    fr: [['💰', '월급을 더 주는 회사로 옮기려고 그만두고 알아보는 중이에요'],
         ['🏠', '부산으로 이사 와서 새 직장을 구하고 있어요'],
         ['🎓', '대학을 졸업하고 나한테 맞는 회사를 고르는 중이에요'],
         ['💼', '회사 분위기가 안 맞아 스스로 나와서 다른 곳을 찾아요'],
         ['📝', '합격한 곳이 있지만 더 좋은 조건을 찾아 면접을 보고 있어요'],
         ['🧭', '적성에 맞는 일을 찾으려고 여러 회사에 지원하고 있어요'],
         ['🚌', '출퇴근이 너무 멀어서 그만두고 집 근처 일을 찾아요'],
         ['🍰', '카페를 그만두고 더 배울 게 많은 빵집 일을 찾는 중이에요'],
         ['🎨', '더 큰 디자인 회사에 가고 싶어서 그만두고 지원서를 쓰고 있어요']],
    st: [['🛒', '무인 계산대가 생기면서 마트 계산원 일자리가 사라졌어요'],
         ['📱', '모바일 뱅킹이 늘어 은행 지점이 문을 닫아 일자리를 잃었어요'],
         ['⛏️', '석탄을 덜 쓰게 되면서 탄광이 문을 닫아 일을 잃었어요'],
         ['🎞️', '디지털카메라가 나와 필름 공장에서 일자리를 잃었어요'],
         ['🚗', '전기차가 늘어 엔진 부품 공장 기술자 자리가 없어졌어요'],
         ['🌐', 'AI 번역기가 좋아져 번역 일감이 사라졌어요'],
         ['🎫', '키오스크 주문이 늘어 주문받는 직원 자리가 없어졌어요'],
         ['🧵', '옷 공장이 해외로 옮겨 가서 봉제 기술자 일을 잃었어요'],
         ['🖼️', 'AI가 그림을 그려 주면서 삽화 그리는 일감이 끊겼어요'],
         ['🚐', '자율 주행 셔틀이 다니면서 셔틀버스 기사 자리가 없어졌어요']],
    cy: [['🏢', '나라 경제가 어려워져 회사가 직원을 줄였어요'],
         ['🏭', '불황으로 물건이 안 팔려 공장이 직원을 내보냈어요'],
         ['🍜', '사람들이 돈을 안 써서 식당 손님이 줄어 일을 그만두게 됐어요'],
         ['🏗️', '경기가 나빠 건물을 안 지어서 건설 일이 끊겼어요'],
         ['🚢', '세계 경제 위기로 수출이 줄어 무역 회사에서 해고됐어요'],
         ['🛍️', '불경기로 손님이 끊긴 옷 가게에서 내보내졌어요'],
         ['🏦', '금융 위기가 와서 여러 회사가 한꺼번에 직원을 줄였어요'],
         ['🧾', '경기가 나빠 회사들이 채용을 멈춰서 일자리를 못 구해요'],
         ['🏨', '불황으로 여행객이 줄어 호텔이 직원을 줄였어요']],
    se: [['⛷️', '여름이 되자 스키장 강사 일이 없어졌어요'],
         ['🏖️', '겨울이 되자 해수욕장 안전요원 일을 쉬게 됐어요'],
         ['🍊', '귤 수확철이 끝나 귤 따는 일이 끝났어요'],
         ['🌾', '농사일이 없는 겨울(농한기)이라 일거리가 없어요'],
         ['🍦', '날이 추워져 아이스크림 가게 일자리가 줄었어요'],
         ['🌸', '벚꽃 축제가 끝나 축제 안내 요원 일이 끝났어요'],
         ['🎄', '크리스마스가 지나 트리 판매 일이 끝났어요'],
         ['🧊', '봄이 와서 얼음낚시 축제장 일자리가 사라졌어요'],
         ['🏊', '여름이 끝나 야외 수영장 안전요원 일이 끝났어요']]
  };
  const TRAP_RAW = [
    ['🧑‍🎓', '학교에 다니며 공부만 하는 중학생이에요'],
    ['👴', '은퇴하고 일할 생각 없이 쉬고 있어요'],
    ['🛌', '일할 생각이 전혀 없어서 그냥 쉬고 있어요'],
    ['👩‍💻', '회사에 잘 다니고 있고, 주말엔 수영을 배워요'],
    ['📚', '대학에 다니며 공부에만 집중하고 있어요']
  ];
  const CASES = {};
  TK.forEach(t => { CASES[t] = CASE_RAW[t].map(([e, x], i) => ({ id: t + i, t, e, x })); });
  const TRAPS = TRAP_RAW.map(([e, x], i) => ({ id: 'n' + i, t: 'none', e, x }));
  const ALLCASES = TK.flatMap(t => CASES[t]).concat(TRAPS);
  const caseById = id => ALLCASES.find(c => c.id === id);

  /* ───────── 길에서 만나는 사람들 (실업자일까?) ───────── */
  const NPCS = [
    { id: 'stu', x: 608, y: 850, e: '🧑‍🎓', who: '중학생', shirt: '#3a86ff', ans: 'no', lines: ['나? 중학교 2학년! 지금은 학교 다니면서 공부하는 중이야.', '일은 어른 되면 할 거야. 지금은 일자리를 구하고 있지 않아.'], why: '학생은 지금 일자리를 구하고 있지 않아요. 일할 의사가 없으면 실업자가 아니에요.' },
    { id: 'old', x: 1000, y: 128, e: '👴', who: '공원 할아버지', shirt: '#8d99ae', ans: 'no', lines: ['허허, 나는 30년 일하고 작년에 은퇴했다네.', '이제 일할 생각은 없고, 공원 산책이 제일 좋아.'], why: '은퇴해서 일할 생각이 없으면 실업자가 아니에요.' },
    { id: 'lazy', x: 212, y: 248, e: '🛌', who: '쉬는 청년', shirt: '#6c757d', ans: 'no', lines: ['일? 음… 딱히 할 생각 없어. 그냥 쉬는 중이야.', '일자리를 알아본 적도 없고, 알아볼 생각도 없어.'], why: '일할 능력이 있어도 일할 의사가 없으면 실업자가 아니에요.' },
    { id: 'work', x: 1500, y: 398, e: '👩‍💻', who: '퇴근하는 회사원', shirt: '#2a9d8f', ans: 'no', lines: ['방금 퇴근했어요! 회사는 5년째 잘 다니고 있어요.', '주말엔 수영을 배우러 다녀요.'], why: '이미 일하고 있는 사람은 취업자예요. 실업자가 아니에요.' },
    { id: 'seek', x: 940, y: 652, e: '🙋', who: '면접 보러 가는 누나', shirt: '#e76f51', ans: 'yes', lines: ['지난달에 회사를 그만뒀어. 나한테 더 맞는 곳을 찾고 싶어서.', '오늘도 면접이 두 군데야. 일하고 싶은데 아직 자리를 못 구했어!'], why: '일할 능력도 의사도 있는데 아직 일자리가 없으니 실업자예요. (스스로 찾는 중 → 마찰적 실업)' }
  ];
  /* ───────── 진행판 지도용 건물 목록 ───────── */
  const MAP = { W: 1664, H: 1152, bx: [[0, 320], [448, 768], [896, 1216], [1344, 1664]], by: [[0, 256], [384, 704], [832, 1152]],
    b: [[30, 30, 120, 96, '집'], [488, 26, 240, 150, 'AI 콜센터'], [20, 404, 290, 280, '배추 농장'], [478, 414, 160, 126, '식당'], [936, 420, 240, 170, '고용 센터'], [936, 900, 240, 160, '실업 상담소'], [912, 16, 288, 224, '공원'], [478, 872, 260, 130, '학교'], [30, 872, 260, 200, '공장'], [1374, 414, 260, 250, '아파트'], [1374, 30, 260, 130, '상점가'], [478, 590, 270, 86, '마트'], [1374, 872, 260, 238, '시장']] };

  /* ───────── 4장 직업 ───────── */
  const JOBS = {
    rider:     { name: '배달 라이더', e: '🛵', mech: 'tap', target: '🏠', how: '불이 켜진 집을 빨리 눌러 배달해요' },
    drone:     { name: '드론 촬영 기사', e: '🚁', mech: 'tap', target: '📸', how: '찍을 장소가 뜨면 빨리 눌러 촬영해요' },
    barista:   { name: '바리스타', e: '☕', mech: 'time', how: '바늘이 초록 칸에 왔을 때 딱 멈춰요' },
    groomer:   { name: '반려동물 미용사', e: '🐶', mech: 'time', how: '바늘이 초록 칸에 왔을 때 딱 잘라요' },
    sorter:    { name: '택배 분류원', e: '📦', mech: 'sort', L: '🔴 빨강 지역', R: '🔵 파랑 지역', how: '상자 색을 보고 알맞은 쪽으로 보내요' },
    librarian: { name: '도서관 사서', e: '📚', mech: 'sort', L: '📖 이야기책', R: '🔬 과학책', how: '책을 알맞은 서가로 보내요' },
    aitrainer: { name: 'AI 트레이너', e: '🧠', mech: 'sort', L: '⭕ 맞는 답', R: '❌ 틀린 답', how: 'AI가 낸 답이 맞는지 틀리는지 가려 줘요' }
  };

  /* ───────── 저장소 (Firebase / 체험 모드) ───────── */
  function makeLocalStore(K = 'unempCity:') {
    const subs = { state: [], players: [] };
    const read = k => { try { return JSON.parse(localStorage.getItem(K + k) || 'null'); } catch (e) { return null; } };
    const fire = k => { const v = read(k) || {}; (subs[k] || []).forEach(f => f(v)); };
    const write = (k, v) => { localStorage.setItem(K + k, JSON.stringify(v)); fire(k); };
    addEventListener('storage', e => { if (e.key === K + 'state') fire('state'); if (e.key === K + 'players') fire('players'); });
    return {
      mode: 'local',
      onState(cb) { subs.state.push(cb); cb(read('state') || {}); },
      async setState(p) { write('state', { ...(read('state') || {}), ...p }); },
      onPlayers(cb) { subs.players.push(cb); cb(read('players') || {}); },
      async getPlayer(id) { return (read('players') || {})[id] || null; },
      async setPlayer(id, p) { const a = read('players') || {}; a[id] = { ...(a[id] || {}), ...p }; write('players', a); },
      async delPlayer(id) { const a = read('players') || {}; delete a[id]; write('players', a); },
      async clearPlayers() { write('players', {}); }
    };
  }
  async function makeFirebaseStore(cfg, onConn) {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const m = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const db = m.getFirestore(initializeApp(cfg));
    const stRef = m.doc(db, 'ucState', 'live'), col = m.collection(db, 'ucPlayers');
    const bad = e => { console.warn(e); onConn && onConn(false); };
    return {
      mode: 'firebase',
      onState(cb) { m.onSnapshot(stRef, s => { onConn && onConn(true); cb(s.exists() ? s.data() : {}); }, bad); },
      setState(p) { return m.setDoc(stRef, p, { merge: true }).catch(bad); },
      onPlayers(cb) { m.onSnapshot(col, q => { const o = {}; q.forEach(d => o[d.id] = d.data()); cb(o); }, bad); },
      async getPlayer(id) { const s = await m.getDoc(m.doc(col, id)); return s.exists() ? s.data() : null; },
      setPlayer(id, p) { return m.setDoc(m.doc(col, id), p, { merge: true }); },
      delPlayer(id) { return m.deleteDoc(m.doc(col, id)); },
      async clearPlayers() { const q = await m.getDocs(col); await Promise.all(q.docs.map(d => m.deleteDoc(d.ref))); }
    };
  }
  async function makeStore(onConn, solo) {
    if (solo) return makeLocalStore('unempCitySolo:');          // 혼자 하기: 이 기기에만 저장
    if (!FIREBASE_CONFIG.apiKey) return makeLocalStore();
    try { return await makeFirebaseStore(FIREBASE_CONFIG, onConn); }
    catch (e) { console.error(e); onConn && onConn(false); return makeLocalStore(); }
  }


  /* ───────── 📻 라디오 (직접 합성한 배경 음악 — 음원 파일 없음) ───────── */
  const Radio = (() => {
    let ac = null, out = null, timer = null, step = 0, nextT = 0, cur = -1, nb = null, vol = .5;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const ST = [
      { name: '실업 FM · 힙합', kind: 'hip', bpm: 92, sw: .16, kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], roots: [38, 34, 36, 33], third: [3, 4, 4, 3] },
      { name: '네온 FM · 신스웨이브', kind: 'synth', bpm: 112, sw: 0, kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], roots: [45, 41, 36, 43], third: [3, 4, 4, 4] },
      { name: '새벽 FM · 로파이', kind: 'lofi', bpm: 76, sw: .2, kick: [0, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], roots: [38, 43, 36, 45], chord: [[0, 3, 7, 10], [0, 4, 7, 10], [0, 4, 7, 11], [0, 3, 7, 10]] }
    ];
    function init() {
      if (ac) return;
      ac = new (window.AudioContext || window.webkitAudioContext)();
      out = ac.createGain(); out.gain.value = vol; const c = ac.createDynamicsCompressor(); out.connect(c); c.connect(ac.destination);
      nb = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function env(node, t, v, len) { const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + len); node.connect(g); g.connect(out); }
    function kick(t) { const o = ac.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); env(o, t, .9, .22); o.start(t); o.stop(t + .25); }
    function noise(t, v, len, type, f) { const s = ac.createBufferSource(); s.buffer = nb; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; s.connect(fl); env(fl, t, v, len); s.start(t); s.stop(t + len + .02); }
    function tone(t, m, len, type, v, cut) { const o = ac.createOscillator(); o.type = type; o.frequency.value = hz(m); let n = o; if (cut) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); n = fl; } env(n, t, v, len); o.start(t); o.stop(t + len + .02); }
    function play(S, s, t) {
      const bar = Math.floor(s / 16) % 4, i = s % 16, r = S.roots[bar], lo = S.kind === 'lofi';
      if (S.kick.includes(i)) kick(t);
      if (S.snare.includes(i)) noise(t, lo ? .16 : .3, .14, 'bandpass', 1800);
      if (S.hat.includes(i)) noise(t, lo ? .04 : .08, i === 14 ? .12 : .04, 'highpass', 7000);
      if (S.kind === 'hip') {
        const b = { 0: 0, 3: 0, 7: 12, 10: 7, 14: 0 }[i]; if (b != null) tone(t, r + b, .24, 'sawtooth', .3, 420);
        if (bar % 2 === 0) { const l = { 0: 74, 3: 72, 6: 69, 8: 72, 11: 69, 14: 65 }[i]; if (l) tone(t, l, .16, 'square', .07, 2400); }
        else if (i === 4 || i === 11) [0, S.third[bar], 7].forEach(k => tone(t, r + 24 + k, .18, 'sawtooth', .05, 1800));
      } else if (S.kind === 'synth') {
        if (i % 2 === 0) tone(t, r + (i % 4 === 2 ? 12 : 0), .2, 'sawtooth', .24, 520);
        const th = S.third[bar], seq = [0, 7, 12, th, 7, 12, th, 7]; tone(t, r + 24 + seq[i % 8], .12, 'square', .05, 2200);
        if (i === 0) [0, th, 7].forEach(k => tone(t, r + 24 + k, 2, 'triangle', .06));
      } else {
        const ch = S.chord[bar];
        if (i === 0 || i === 10) ch.forEach(k => tone(t, r + 24 + k, 1.5, 'triangle', .07, 1300));
        if (i === 0 || i === 8) tone(t, r, .5, 'sine', .38);
        const mel = { 4: ch[2], 6: ch[3], 12: ch[1], 14: ch[2] }[i]; if (mel != null && bar % 2 === 0) tone(t, r + 36 + mel, .3, 'triangle', .06);
      }
    }
    function tick() { const S = ST[cur], d = 60 / S.bpm / 4; while (nextT < ac.currentTime + .3) { play(S, step, nextT + (step % 2 ? S.sw * d : 0)); nextT += d; step = (step + 1) % 64; } }
    function set(i) {
      clearInterval(timer); timer = null; cur = i >= 0 && i < ST.length ? i : -1; if (cur < 0) return;
      try { init(); ac.resume(); step = 0; nextT = ac.currentTime + .08; timer = setInterval(tick, 40); } catch (e) { cur = -1; }
    }
    return {
      set, next() { set(cur + 1 >= ST.length ? -1 : cur + 1); return cur; },
      get cur() { return cur; }, label() { return cur < 0 ? '📻 라디오 꺼짐' : '📻 ' + ST[cur].name; },
      volume(v) { vol = v; if (out) out.gain.value = v; },
      duck(ms) { if (!out || cur < 0) return; const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(vol, t); out.gain.linearRampToValueAtTime(.03, t + .3); out.gain.setValueAtTime(.03, t + ms / 1000); out.gain.linearRampToValueAtTime(vol, t + ms / 1000 + .8); }
    };
  })();


  /* ───────── ✎ 손그림 아이콘 (이모지 대신) ─────────
     48×48 칸에 [선 모양, 채움색, 선색] 으로 그린 그림. 화면의 이모지는 자동으로 이 그림으로 바뀝니다. */
  const C = 'M24 6a18 18 0 1 0 .1 0z';
  const ICON = {
    snow: [['M24 5a8 8 0 1 0 .1 0z', '#fff'], ['M24 20a12 12 0 1 0 .1 0z', '#fff'], ['M21 12v1M27 12v1'], ['M24 15l6 2-6 1z', '#ff8c2b'], ['M24 27v1M24 33v1']],
    robot: [['M11 16h26v20H11z', '#cfd8e3'], ['M24 16V9'], ['M24 4a2.5 2.5 0 1 0 .1 0z', '#ff4d6d'], ['M17 21a3 3 0 1 0 .1 0zM31 21a3 3 0 1 0 .1 0z', '#37b6ff'], ['M18 31h12'], ['M7 22v8M41 22v8']],
    chartdown: [['M8 7v33h34'], ['M12 13l9 9 6-5 12 14', null, '#e23b3b'], ['M39 31v-8M39 31h-8', null, '#e23b3b']],
    chartup: [['M8 7v33h34'], ['M12 34l9-9 6 5 12-17', null, '#22a95a'], ['M39 13v8M39 13h-8', null, '#22a95a']],
    mag: [['M20 6a13 13 0 1 0 .1 0z', '#bfe6ff'], ['M30 30l12 12']],
    x: [['M11 11l26 26M37 11L11 37', null, '#e23b3b']],
    check: [['M8 25l11 11 21-24', null, '#22a95a']],
    o: [['M24 7a17 17 0 1 0 .1 0z', null, '#e23b3b']],
    sad: [[C, '#ffd9b0'], ['M17 20v1M31 20v1'], ['M16 34q8-8 16 0'], ['M38 8q4 6 0 9q-4-3 0-9z', '#7cc4ff']],
    gear: [['M24 13a11 11 0 1 0 .1 0z', '#cfd8e3'], ['M24 4v8M24 36v8M4 24h8M36 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6'], ['M24 20a4 4 0 1 0 .1 0z', '#fff']],
    compass: [[C, '#fff'], ['M32 16l-4.500 11.500L16 32l4.500-11.500z', '#ff4d6d']],
    calendar: [['M7 11h34v30H7z', '#fff'], ['M7 11h34v9H7z', '#ff6b6b'], ['M16 6v9M32 6v9'], ['M14 28h4M22 28h4M30 28h4M14 35h4M22 35h4']],
    book: [['M5 12q10-5 19 0v27q-9-5-19 0z', '#ffd98a'], ['M43 12q-10-5-19 0v27q9-5 19 0z', '#ffe9b8'], ['M10 19q5-2 9 0M10 26q5-2 9 0M29 19q5-2 9 0M29 26q5-2 9 0']],
    bank: [['M5 18L24 6l19 12z', '#e7edf5'], ['M8 38h32v5H8z', '#e7edf5'], ['M13 20v17M21 20v17M27 20v17M35 20v17']],
    folder: [['M5 13h14l4 5h20v23H5z', '#ffd23f'], ['M5 23h38']],
    cabbage: [['M24 7q15 2 15 17q0 17-15 17T9 24Q9 9 24 7z', '#7ed957'], ['M24 12v25M24 21q-7-3-9-9M24 26q7-3 10-10M24 32q-6 0-10-5', null, '#2f8f3f']],
    worm: [['M6 30q4-11 11-5t10-2t9-7q5 0 5 5q-4 11-11 7t-10 4t-9 5q-5 0-5-7z', '#c7e36b'], ['M36 19v1']],
    noodle: [['M6 22h36q0 17-18 19Q6 39 6 22z', '#fff'], ['M11 22q3-9 7 0M19 22q3-10 7 0M27 22q3-9 7 0', null, '#e8a53a'], ['M30 5l9 15M36 4l7 15', null, '#8a5a2b'], ['M7 28h34', null, '#e23b3b']],
    rice: [['M7 24h34q0 15-17 17Q7 39 7 24z', '#5aa9ff'], ['M10 24q1-14 14-14t14 14z', '#fff'], ['M18 18v1M25 15v1M30 20v1']],
    dumpling: [['M4 33q2-21 20-21t20 21q-20 8-40 0z', '#fff3d6'], ['M12 20q3 5 3 10M20 15q2 7 1 14M28 15q-1 7 0 14M36 20q-3 5-3 10']],
    stew: [['M8 22h32v6q0 13-16 13T8 28z', '#555d6b'], ['M3 22h42'], ['M16 15q-4-4 0-9M24 15q-4-4 0-9M32 15q-4-4 0-9', null, '#9aa7b8'], ['M13 22q11-8 22 0z', '#ff7a45']],
    plate: [['M25 9a15 15 0 1 0 .1 0z', '#fff'], ['M25 17a7 7 0 1 0 .1 0z'], ['M5 6v8q2 4 4 0V6M7 6v36']],
    headset: [['M9 28v-4Q9 9 24 9t15 15v4'], ['M5 26h8v12H5zM35 26h8v12h-8z', '#ff4d6d'], ['M39 38q0 6-11 6']],
    phone: [['M13 4h22v40H13z', '#2b2f3a'], ['M17 9h14v26H17z', '#8fd3ff'], ['M22 40h4', null, '#fff']],
    tv: [['M5 12h38v25H5z', '#2b2f3a'], ['M10 17h28v15H10z', '#8fd3ff'], ['M16 43h16M24 37v6'], ['M16 5l8 7 8-7']],
    radio: [['M5 18h38v25H5z', '#ff8c2b'], ['M9 16L35 5'], ['M16 24a6.500 6.500 0 1 0 .1 0z', '#fff'], ['M29 26h9M29 33h9']],
    speaker: [['M5 19h8l11-9v28l-11-9H5z', '#fff'], ['M31 18q5 6 0 12M36 12q10 12 0 24']],
    mute: [['M5 19h8l11-9v28l-11-9H5z', '#fff'], ['M31 18l11 12M42 18L31 30', null, '#e23b3b']],
    key: [['M15 12a9.500 9.500 0 1 0 .1 0z', '#ffd23f'], ['M22 28l20 13M35 37l4-6M29 33l3-5']],
    box: [['M5 16l19-9 19 9v20l-19 9-19-9z', '#d9a066'], ['M5 16l19 9 19-9M24 25v20']],
    card: [['M4 11h40v26H4z', '#5aa9ff'], ['M4 19h40'], ['M9 30h11', null, '#fff']],
    gift: [['M7 20h34v23H7z', '#ff6fb1'], ['M4 13h40v7H4z', '#ff9fd0'], ['M24 13v30', null, '#fff'], ['M24 13q-11-11-13-3t13 3q11-11 13-3t-13 3']],
    bike: [['M10 31a6 6 0 1 0 .1 0zM37 31a6 6 0 1 0 .1 0z', '#555'], ['M12 37h13l6-20h7M31 17h-7M16 30h12'], ['M11 21h11v7H11z', '#ff4d6d']],
    drone: [['M16 20h16v11H16z', '#cfd8e3'], ['M16 22L6 16M32 22l10-6M2 14h10M36 14h10'], ['M24 31v6M19 38h10'], ['M24 23a2.500 2.500 0 1 0 .1 0z', '#37b6ff']],
    coffee: [['M9 18h26v14q0 9-13 9T9 32z', '#fff'], ['M35 21q9 0 9 6t-9 7'], ['M17 13q-4-4 0-9M26 13q-4-4 0-9', null, '#9aa7b8'], ['M11 23h22', null, '#8a5a2b']],
    dog: [['M12 15q12-8 24 0v15q0 11-12 11T12 30z', '#e8b98a'], ['M12 15q-9 2-7 15q7 0 7-8zM36 15q9 2 7 15q-7 0-7-8z', '#b9824f'], ['M19 23v1M29 23v1'], ['M20 32q4 4 8 0M24 28v4']],
    car: [['M3 27q2-3 9-4l5-10h16l6 10q6 1 6 5v8H3z', '#ff4d4d'], ['M18 16h7v7H14zM27 16h5l4 7h-9z', '#bfe6ff'], ['M12 32a4.500 4.500 0 1 0 .1 0zM35 32a4.500 4.500 0 1 0 .1 0z', '#444']],
    taxi: [['M19 6h10v6H19z', '#fff'], ['M3 27q2-3 9-4l5-10h16l6 10q6 1 6 5v8H3z', '#ffd23f'], ['M18 16h7v7H14zM27 16h5l4 7h-9z', '#bfe6ff'], ['M12 32a4.500 4.500 0 1 0 .1 0zM35 32a4.500 4.500 0 1 0 .1 0z', '#444']],
    walk: [['M27 3a4.500 4.500 0 1 0 .1 0z', '#ffd9b0'], ['M26 14l-3 13 6 7 1 10M23 27l-7 15M25 17l-9 5-1 7M27 18l7 6']],
    talk: [['M5 8h38v23H22l-9 10V31H5z', '#fff'], ['M15 19v1M24 19v1M33 19v1']],
    bulb: [['M24 4q14 0 14 14q0 7-7 12v5H17v-5q-7-5-7-12Q10 4 24 4z', '#ffe27d'], ['M18 40h12M20 44h8']],
    gold: [['M16 3l8 15 8-15', null, '#5aa9ff'], ['M24 17a13 13 0 1 0 .1 0z', '#ffd23f'], ['M24 24v12M21 27l3-3']],
    silver: [['M16 3l8 15 8-15', null, '#5aa9ff'], ['M24 17a13 13 0 1 0 .1 0z', '#d5dbe3'], ['M20 27q4-5 7 0q0 3-7 9h8']],
    bronze: [['M16 3l8 15 8-15', null, '#5aa9ff'], ['M24 17a13 13 0 1 0 .1 0z', '#e0935a'], ['M20 25h8l-4 5q5 0 4 4t-8 1']],
    clock: [['M24 7a17 17 0 1 0 .1 0z', '#fff'], ['M24 13v11l8 5']],
    lock: [['M9 22h30v21H9z', '#ffd23f'], ['M16 22v-7q0-9 8-9t8 9v7'], ['M24 30v6']],
    unlock: [['M9 22h30v21H9z', '#7ed957'], ['M16 22v-7q0-9 8-9t8 6'], ['M24 30v6']],
    pencil: [['M7 41l3-11L32 8l8 8-22 22z', '#ffd23f'], ['M7 41l3-11 8 8z', '#ffd9b0'], ['M28 12l8 8']],
    eye: [['M3 24q21-23 42 0q-21 23-42 0z', '#fff'], ['M24 17a7 7 0 1 0 .1 0z', '#5aa9ff'], ['M24 22a2 2 0 1 0 .1 0z', '#222']],
    pill: [['M9 27l14-14q7-6 13 0t0 13L22 40q-7 6-13 0t0-13z', '#fff'], ['M23 13q7-6 13 0t0 13l-7 7-13-13z', '#ff6b6b']],
    tag: [['M5 7h17l21 21-15 15L5 22z', '#ffb84d'], ['M14 12a3 3 0 1 0 .1 0z', '#fff']],
    play: [['M13 7l26 17-26 17z', '#ffd23f']],
    left: [['M31 7L11 24l20 17']], right: [['M17 7l20 17-20 17']],
    back: [['M18 9L7 20l11 11M7 20h21q13 0 13 10t-13 11']],
    money: [['M17 5h14l-4 8q14 6 14 18q0 12-17 12T7 31q0-12 14-18z', '#ffd23f'], ['M24 20v15M28 23q-4-3-7 0t3 5t3 4t-7 0']],
    house: [['M9 22v19h30V22L24 9z', '#ffe9b8'], ['M4 25L24 7l20 18'], ['M20 41V30h8v11']],
    flag: [['M10 5v40'], ['M10 7h28l-7 9 7 9H10z', '#ff4d6d']],
    pad: [['M9 15h30q7 0 7 11t-6 12q-4 0-8-7H16q-4 7-8 7q-6-1-6-12t7-11z', '#7c5cff'], ['M14 21v9M9.500 25.500h9', null, '#fff'], ['M32 23v1M37 28v1', null, '#fff']],
    map: [['M5 12l13-5 12 5 13-5v29l-13 5-12-5-13 5z', '#bfe6ff'], ['M18 7v29M30 12v29']],
    people: [['M15 9a6 6 0 1 0 .1 0zM33 9a6 6 0 1 0 .1 0z', '#ffd9b0'], ['M4 42q0-16 11-16t11 16zM22 42q0-16 11-16t11 16z', '#5aa9ff']],
    broom: [['M36 4L21 26'], ['M11 23l14 9-9 13q-9-2-11-11z', '#ffd23f']],
    down: [['M24 4v24M13 19l11 11 11-11'], ['M7 34v9h34v-9']],
    star: [['M24 4l6 13 14 2-10 10 2 15-12-7-12 7 2-15L4 19l14-2z', '#ffd23f']],
    crown: [['M7 38L4 13l11 10 9-16 9 16 11-10-3 25z', '#ffd23f']],
    sprout: [['M24 44V22', null, '#2f8f3f'], ['M24 27Q11 27 9 14q13 0 15 13zM24 22q11 0 13-13q-13 0-13 13z', '#7ed957']],
    target: [[C, '#fff'], ['M24 13a11 11 0 1 0 .1 0z', '#ff6b6b'], ['M24 20a4 4 0 1 0 .1 0z', '#fff']],
    warn: [['M24 5l21 37H3z', '#ffd23f'], ['M24 18v13M24 36v1']],
    q: [['M15 16q0-9 9-9t9 9q0 6-9 10v5', null, '#7c5cff'], ['M24 39v1', null, '#7c5cff']],
    person: [['M24 5a10 10 0 1 0 .1 0z', '#ffd9b0'], ['M6 45q0-18 18-18t18 18z', '#5aa9ff'], ['M20 14v1M28 14v1'], ['M20 19q4 3 8 0']],
    dotR: [['M24 9a15 15 0 1 0 .1 0z', '#e23b3b']], dotB: [['M24 9a15 15 0 1 0 .1 0z', '#2f6fdb']], dotY: [['M24 9a15 15 0 1 0 .1 0z', '#ffd23f']], dotN: [['M24 9a15 15 0 1 0 .1 0z', '#8a5a2b']], dotG: [['M24 9a15 15 0 1 0 .1 0z', '#34c759']]
  };
  /* 이모지 → 그림 이름 */
  const EMO = {};
  const em = (name, list) => list.split(' ').forEach(e => EMO[e] = name);
  em('snow', '⛄ ❄️ ❄'); em('robot', '🤖 🧠'); em('chartdown', '📉'); em('chartup', '📈 📊'); em('mag', '🔍 🕵️ 🕵'); em('x', '🙅 ❌ ✖️ ✖'); em('check', '✅ ✔️ ✔'); em('o', '⭕');
  em('sad', '😓 😵 😔 😞 😨 🥶'); em('gear', '⚙️ ⚙ 🔧 🎛️ 🎛'); em('compass', '🧭'); em('calendar', '📅 🍓'); em('book', '📚 🎓 🧑‍🏫 🏫 📖'); em('bank', '🏛️ 🏛 🏦 🏢'); em('folder', '🗂️ 🗂 📋 📝 🧾');
  em('cabbage', '🥬'); em('worm', '🐛'); em('noodle', '🍜'); em('rice', '🍚'); em('dumpling', '🥟'); em('stew', '🍲'); em('plate', '🍽️ 🍽'); em('headset', '🎧'); em('phone', '📱'); em('tv', '📺'); em('radio', '📻');
  em('speaker', '🔊 📢'); em('mute', '🔇'); em('key', '🔑'); em('box', '📦'); em('card', '💳'); em('gift', '🎁'); em('bike', '🛵'); em('drone', '🚁 📸'); em('coffee', '☕'); em('dog', '🐶'); em('car', '🚗'); em('taxi', '🚕');
  em('walk', '🚶'); em('talk', '💬'); em('bulb', '💡 🤔 🧪'); em('gold', '🥇'); em('silver', '🥈'); em('bronze', '🥉'); em('clock', '⏰ ⏱️ ⏱ ⏳'); em('lock', '🔒'); em('unlock', '🔓'); em('pencil', '✍️ ✍'); em('eye', '👀'); em('pill', '💊');
  em('tag', '🏷️ 🏷'); em('play', '▶️ ▶ ⏭️ ⏭ ⏩'); em('left', '⬅️ ⬅'); em('right', '➡️ ➡'); em('back', '↩️ ↩'); em('money', '💰 💸'); em('house', '🏠 🏪'); em('flag', '🏁'); em('pad', '🎮'); em('map', '🗺️ 🗺');
  em('people', '👥 🧑‍🔧'); em('broom', '🧹'); em('down', '📥'); em('star', '✨ ⭐ 🎉 💪 🎯 🎖️ 🎖'); em('crown', '👑 🏆'); em('sprout', '🌱'); em('warn', '⚠️ ⚠'); em('q', '❓');
  em('person', '🙍 🙎 🧓 👨 👩 🧑 👵 👦 👧 🧔 👴 🙋 🛌'); em('dotR', '🟥 🔴'); em('dotB', '🟦 🔵'); em('dotY', '🟡'); em('dotN', '🟤'); em('dotG', '🟢');
  const iconName = e => EMO[e] || EMO[e.replace(/️/g, '')] || EMO[[...e][0]] || null;
  const paths = (name) => (ICON[name] || []).map(([d, f, s]) => `<path d="${d}" fill="${f || 'none'}" stroke="${s || '#1b1b1b'}"/>`).join('');
  const back = (name) => (ICON[name] || []).map(([d, f]) => `<path d="${d}" fill="${f ? '#fff' : 'none'}"/>`).join('');
  const icon = (name, cls = '') => ICON[name] ? `<svg class="ic ${cls}" viewBox="-4 -4 56 56" aria-hidden="true"><g filter="url(#wob)" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="9">${back(name)}</g><g stroke-width="2.9">${paths(name)}</g></g></svg>` : '';
  /* 캔버스(3D 말풍선 등)에 그리기 */
  function drawIcon(g, name, x, y, size) {
    g.save(); g.translate(x - size / 2, y - size / 2); g.scale(size / 48, size / 48); g.lineWidth = 2.9; g.lineCap = g.lineJoin = 'round';
    (ICON[name] || []).forEach(([d, f, s]) => { const p = new Path2D(d); if (f) { g.fillStyle = f; g.fill(p); } g.strokeStyle = s || '#1b1b1b'; g.stroke(p); }); g.restore();
  }

  /* ───────── ✎ 손그림 얼굴 (대사 창 · 손님) ───────── */
  const FACES = {
    '🧑': { hat: 'cap', shirt: '#ff3b4e' }, '🤔': { hat: 'cap', shirt: '#ff3b4e', mood: 'think' }, '😎': { hat: 'cap', shirt: '#ff3b4e', mood: 'cool' }, '😨': { hat: 'cap', shirt: '#ff3b4e', mood: 'shock' },
    '👩‍🌾': { style: 'long', hat: 'straw', shirt: '#34a853' }, '🥶': { style: 'long', hat: 'straw', shirt: '#34a853', mood: 'cold' }, '👨‍🌾': { hat: 'straw', shirt: '#3f7fd9', hair: '#777', beard: 1 },
    '👩‍💼': { style: 'bun', hat: 'headset', shirt: '#2f3f6b' }, '😔': { style: 'bun', hat: 'headset', shirt: '#2f3f6b', mood: 'sad' }, '👩‍💻': { style: 'long', glasses: 1, shirt: '#8a5cd9', hair: '#6b3a1c' },
    '👨‍🍳': { hat: 'chef', shirt: '#fff' }, '😞': { hat: 'chef', shirt: '#fff', mood: 'sad' }, '🧑‍🦱': { style: 'curly', shirt: '#ff8fc4', mood: 'sad' }, '🧑‍💼': { shirt: '#eef2f7', tie: 1 },
    '👩‍⚖️': { style: 'bun', glasses: 1, shirt: '#2a7d4f' }, '🧑‍🎓': { hat: 'grad', shirt: '#3a86ff' }, '👴': { style: 'old', hair: '#bbb', shirt: '#8d99ae', beard: 1 }, '🛌': { style: 'messy', shirt: '#6c757d', mood: 'flat' }, '🙋': { style: 'long', shirt: '#e76f51', hair: '#2b1d14' }
  };
  function face(key, seed) {
    let f = FACES[key];
    if (!f) { if (seed == null) return ''; const r = n => (Math.abs(Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1);       // 무작위 손님
      f = { style: ['short', 'long', 'curly', 'bun', 'messy', 'old'][Math.floor(r(1) * 6)], hair: ['#2b1d14', '#6b3a1c', '#111', '#a8632a', '#999'][Math.floor(r(2) * 5)], shirt: ['#3a86ff', '#ff006e', '#8338ec', '#fb5607', '#2a9d8f', '#ffbe0b'][Math.floor(r(3) * 6)], skin: ['#ffd9b0', '#f1c9a5', '#e2ac84'][Math.floor(r(4) * 3)], glasses: r(5) < .25 }; }
    const skin = f.mood === 'cold' ? '#cfe3f5' : f.skin || '#ffd9b0', hair = f.hair || '#3a2a1c', P = (d, fill, st) => `<path d="${d}" fill="${fill || 'none'}" stroke="${st || '#1b1b1b'}"/>`;
    let s = P('M8 66q2-18 24-18t24 18z', f.shirt || '#5aa9ff') + (f.tie ? P('M32 48l-4 4 4 12 4-12z', '#e23b3b') : '') + P('M32 11q17 0 17 18q0 18-17 18T15 29q0-18 17-18z', skin);
    const st = f.style || 'short';
    if (st === 'long') s += P('M14 30q-4 12 1 22l5-20zM50 30q4 12-1 22l-5-20z', hair);
    if (st === 'old') s += P('M15 30q-4-7 1-12l3 7zM49 30q4-7-1-12l-3 7z', hair);
    else if (st === 'curly') s += P('M13 28q-3-8 4-11q0-8 8-7q4-6 10-2q7-3 9 3q7 1 5 9q3 4 0 8q-7-11-18-11T13 28z', hair);
    else if (st === 'messy') s += P('M15 28q-3-10 5-14l-2-6 7 4 3-7 4 6 6-5 0 7 7-2-3 7q6 4 5 10q-7-9-16-9t-16 9z', hair);
    else s += P('M15 28Q13 10 32 10t17 18q-6-9-17-9t-17 9z', hair);
    if (st === 'bun') s += P('M32 1a5.500 5.500 0 1 0 .1 0z', hair);
    if (f.hat === 'cap') s += P('M14 25Q14 9 32 9t18 16z', '#ffd23f') + P('M14 25q-9 1-11 6q13 1 22-3z', '#f0b90b');
    if (f.hat === 'straw') s += P('M17 21Q17 8 32 8t15 13z', '#f0d27a') + P('M2 23q30-11 60 0q-30 9-60 0z', '#f5dd92');
    if (f.hat === 'chef') s += P('M18 21v-8q-7-6 2-10q4-6 12-2q8-4 12 2q9 4 2 10v8z', '#fff');
    if (f.hat === 'grad') s += P('M8 14l24-9 24 9-24 9z', '#2b2f3a') + P('M50 16v10', null, '#ffd23f');
    if (f.hat === 'headset') s += P('M13 31Q13 8 32 8t19 23') + P('M9 27h7v11H9zM48 27h7v11h-7z', '#ff4d6d') + P('M50 38q0 7-10 7');
    const m = f.mood || 'smile';
    s += m === 'cool' ? P('M19 25h11v7H19zM34 25h11v7H34zM30 27h4', '#222') : P('M25 28v3M39 28v3');
    if (f.glasses) s += P('M19 24h11v10H19zM34 24h11v10H34zM30 28h4');
    if (m === 'sad' || m === 'cold') s += P('M20 23l7 2M44 23l-7 2');
    if (m === 'think') s += P('M21 22h7M37 20l7 2');
    s += m === 'sad' ? P('M25 41q7-6 14 0') : m === 'shock' ? P('M32 36a4 5 0 1 0 .1 0z', '#5b2a2a') : m === 'flat' || m === 'think' ? P('M26 39h12') : m === 'cold' ? P('M24 39l3-2 3 2 3-2 3 2 3-2') : m === 'cool' ? P('M25 38q9 5 14-2') : P('M24 37q8 7 16 0');
    if (f.beard) s += P('M24 35q8-5 16 0', null, hair);
    if (m === 'shock' || m === 'sad') s += P('M51 12q4 6 0 9q-4-3 0-9z', '#7cc4ff');
    return `<svg class="ic face" viewBox="-3 -3 70 72" aria-hidden="true"><g filter="url(#wob)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="8">${s.replace(/fill="[^"]*"/g, 'fill="#fff"').replace(/stroke="[^"]*"/g, 'stroke="#fff"')}</g><g stroke-width="2.6">${s}</g></g></svg>`;
  }

  /* ───────── 화면에 나오는 이모지를 전부 손그림으로 바꾸기 (자동) ───────── */
  const RX = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu;
  function swap(node) {
    if (node.nodeType === 3) {
      const t = node.nodeValue; RX.lastIndex = 0; if (!t || !RX.test(t)) return; const par = node.parentNode; if (!par || par.closest('svg,script,style,textarea')) return;
      RX.lastIndex = 0; const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = RX.exec(t))) { if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index))); const n = iconName(m[0]); if (n) { const tpl = document.createElement('template'); tpl.innerHTML = icon(n); frag.appendChild(tpl.content); } last = m.index + m[0].length; }
      if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last))); par.replaceChild(frag, node);
    } else if (node.nodeType === 1 && !/^(svg|SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(node.nodeName)) [...node.childNodes].forEach(swap);
  }
  function handDrawn() {
    const d = document.createElement('div'); d.innerHTML = '<svg width="0" height="0" style="position:absolute"><filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></svg>'; document.body.appendChild(d.firstChild);
    swap(document.body);
    new MutationObserver(ms => ms.forEach(m => { if (m.type === 'characterData') swap(m.target); else m.addedNodes.forEach(swap); })).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* ───────── 도우미 ───────── */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => shuffle(a.slice()).slice(0, n);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const won = n => '₩' + Math.round(n).toLocaleString('ko-KR');

  return { TEACHER_CODE, TYPES, TK, NONE, tinfo, CAUSES, POLICIES, CHAPTERS, CASES, TRAPS, ALLCASES, caseById, JOBS,
           makeStore, shuffle, pick, rnd, esc, won, Radio, NPCS, MAP, hasKey: !!FIREBASE_CONFIG.apiKey, ICON, icon, iconName, drawIcon, face, FACES, handDrawn };
})();
