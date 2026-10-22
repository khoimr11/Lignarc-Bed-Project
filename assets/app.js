(function () {
'use strict';
const D = window.D, TH = window.TH || {}, MK = window.MKT;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt$ = (v, d = 0) => v == null || isNaN(v) ? '—' : (v < 0 ? '−' : '') + '$' + (Math.abs(v) >= 1e9 ? (Math.abs(v) / 1e9).toFixed(1) + 'B' : Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e4 ? (Math.abs(v) / 1e3).toFixed(0) + 'K' : Math.abs(v) >= 1e3 ? (Math.abs(v) / 1e3).toFixed(1) + 'K' : Math.abs(v).toFixed(d));
const fmtN = v => v == null ? '—' : Math.round(v).toLocaleString('vi-VN');
const pct = (v, d = 1) => v == null || isNaN(v) ? '—' : (v * 100).toFixed(d) + '%';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const C = { ink: '#2b221c', ink2: '#5c5047', ink3: '#8b7e72', esp: '#3b2e25', acacia: '#b5763f', acacia2: '#d39a5c', olive: '#6f6a4c', sage: '#8ea089', clay: '#b8614a', sky: '#6d8fa8', afw: '#b5763f', bme: '#4f7a6c', good: '#3f7d4f', bad: '#b04c37', grey: '#b9ad9f', sand: '#d9c9b0' };
const PAL = [C.acacia, C.bme, C.clay, C.sky, C.olive, C.acacia2, C.sage, '#9a7a5c', '#c9b18f', '#7d6a8a'];
const grid = 'rgba(59,46,37,.08)';
if (window.Chart) {
  Chart.defaults.color = C.ink2; Chart.defaults.font.family = '"Be Vietnam Pro", system-ui, sans-serif'; Chart.defaults.font.size = 11.5;
  Chart.defaults.borderColor = grid; Chart.defaults.maintainAspectRatio = false;
  Object.assign(Chart.defaults.plugins.legend.labels, { boxWidth: 10, boxHeight: 10, usePointStyle: false });
  Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: 'rgba(59,46,37,.94)', titleColor: '#fff8ef', bodyColor: '#f3ebdf', padding: 10, cornerRadius: 10 });
}
const charts = {};
function mk(id, cfg) { const el = document.getElementById(id); if (!el || !window.Chart) return null; if (charts[id]) charts[id].destroy(); return (charts[id] = new Chart(el, cfg)); }
const moneyAxis = { ticks: { callback: v => fmt$(v) }, grid: { color: grid } };
const noGrid = { grid: { display: false } };

// ---------- images ----------
const AMZ = (id, s = 500) => id ? `https://m.media-amazon.com/images/I/${id}._AC_SL${s}_.jpg` : '';
window.__imgFail = function (el) {
  const id = el.dataset.id, ph = el.dataset.ph || '';
  if (id && TH[id] && !el.dataset.tried) { el.dataset.tried = 1; el.src = 'data:image/jpeg;base64,' + TH[id]; return; }
  const d = document.createElement('div'); d.className = 'ph-img'; d.textContent = (ph || '·').slice(0, 1).toUpperCase(); el.replaceWith(d);
};
const img = (id, alt, s, ph) => `<img src="${AMZ(id, s)}" data-id="${id || ''}" data-ph="${esc(ph || alt)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="__imgFail(this)">`;

// ---------- router ----------
const VIEWS = ['overview', 'market', 'rivals', 'beds', 'proposal', 'build'];
const inited = {};
const tabs = $$('#tabs a'), pill = $('#pill');
function setPill(v) { const a = tabs.find(t => t.dataset.v === v); if (!a) return; tabs.forEach(t => t.classList.toggle('on', t === a)); pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft - 4}px)`; a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
function show(v) {
  if (!VIEWS.includes(v)) v = 'overview';
  $$('.view').forEach(s => { const on = s.dataset.view === v; s.hidden = !on; if (on) { s.classList.remove('view-in'); void s.offsetWidth; s.classList.add('view-in'); } });
  setPill(v);
  if (!inited[v]) { inited[v] = true; try { INIT[v](); } catch (e) { console.error(e); } }
  Object.values(charts).forEach(c => c && c.resize());
  window.scrollTo(0, 0);
}
function route() { show((location.hash || '#overview').slice(1)); }
addEventListener('hashchange', route);
addEventListener('resize', () => setPill((location.hash || '#overview').slice(1)));
document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('.glass'); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });

// sub-tabs helper
function subtabs(sel, paneScope, onShow) {
  const wrap = $(sel); if (!wrap) return;
  const scope = $(paneScope);
  const done = {};
  const go = p => {
    wrap.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    scope.querySelectorAll(':scope > .pane').forEach(x => x.hidden = x.dataset.pane !== p);
    if (!done[p]) { done[p] = true; onShow && onShow(p); }
    Object.values(charts).forEach(c => c && c.resize());
  };
  wrap.addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(b.dataset.p); });
  go(wrap.querySelector('button.on').dataset.p);
}
function seg(sel, attr, cb) { const w = $(sel); if (!w) return; w.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; w.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset[attr]); }); }

// ---------- shared data ----------
const K = D.kpi, tf = D.feat_wood.find(f => f.k.startsWith('Tool')), thor = D.lines.find(l => l.line === 'Thor');
const SW = [['light', '#c99a62'], ['medium', '#8a5c38'], ['caramel', '#be7a40'], ['natural', '#dab88c'], ['walnut', '#684228'], ['choco', '#42291c']];
const PRICE = { geo: { King: 499, Queen: 459 }, diag: { King: 499, Queen: 459 }, none: { King: 429, Queen: 399 } };
const P = MK.P.map(r => ({ asin: r[0], brand: r[1], title: r[2], price: r[3], rev: r[4], rv: r[5], rt: r[6], img: r[7], mat: r[8], size: r[9], color: r[10], f: r[11], typ: r[12] }));
const byAsin = Object.fromEntries(P.map(p => [p.asin, p]));

function viewer(el, opts) {
  if (!window.Bed3D || !window.THREE) return null;
  let v = null;
  try { v = Bed3D.create(el, opts); } catch (e) { console.error(e); return null; }
  if (v) setTimeout(() => el.classList.add('live'), 400);
  return v;
}
const CN = { light: 'Light Brown', medium: 'Medium Brown', caramel: 'Caramel', natural: 'Natural', walnut: 'Walnut', choco: 'Dark Chocolate' };
const cname = k => CN[k] || k;
function swatches(el, cur, cb) {
  el.innerHTML = SW.map(([k, c]) => `<button class="sw ${k === cur ? 'on' : ''}" data-c="${k}" style="background:${c}" title="${cname(k)}" aria-label="Màu ${cname(k)}"></button>`).join('');
  el.addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; el.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset.c); });
}

// =====================================================================
const INIT = {};

INIT.overview = function () {
  const hv = viewer($('#heroViewer'), { mode: 'lifestyle', headboard: 'geo', color: 'medium', autoRotate: true, view: 'hero' });
  seg('#heroHb', 'hb', hb => hv && hv.set('headboard', hb));
  swatches($('#heroSw'), 'medium', c => hv && hv.set('color', c));
  const dec = [
    ['Phân khúc', 'Giường gỗ tự nhiên', `${fmt$(D.wood_total.rev)}/tháng trên Amazon, giá trung vị $${Math.round(D.wood_total.price)}, top 5 brand chỉ ${pct(D.wood_total.cr5, 0)}`],
    ['Thiết kế', 'Joinery · 0 ốc · tool-free', `Tool-free đạt ${fmt$(tf.rpa)}/ASIN, cao nhất trong giường gỗ. AFW Thor ≈ ${fmt$(thor.rev)}/tháng`],
    ['Size', 'King + Queen', `Gỗ: Queen ${fmt$(D.size_wood[0].rpa)}, King ${fmt$(D.size_wood[1].rpa)}/ASIN, gấp 2.7–4× Full/Twin`],
    ['Giá', '$399 – $499', 'Headboard $459/$499 · không đầu $399/$429. Trung vị tool-free $499']
  ];
  $('#decision').innerHTML = dec.map(d => `<div class="glass"><div class="k">${d[0]}</div><div class="v">${d[1]}</div><div class="why">${d[2]}</div></div>`).join('');
  $('#ovKpi').innerHTML = [
    ['$14.2B', 'Bed frame toàn cầu 2025', 'Gỗ 32.4% · Bắc Mỹ 36%'], [fmt$(K.rev), 'Amazon US bed frames / tháng', fmtN(K.asins) + ' ASIN · ' + K.brands + ' brand'],
    [fmtN(D.cluster.sv), 'Lượt tìm/tháng cụm joinery · japanese · thuma', 'YoY +' + pct(D.cluster.sv / D.cluster.prev - 1, 0)], [fmt$(thor.rev), 'AFW Thor (joinery) / tháng', 'Helium 10 · 20 ASIN']
  ].map(s => `<div class="dark pad stat"><div class="v">${s[0]}</div><div class="l">${s[1]}</div><div class="s" style="color:#bba98f">${s[2]}</div></div>`).join('');
  const nav = [['market', 'I · Thị trường', 'Global, Amazon, sản phẩm, từ khoá, brand, xu hướng', null, 'img/render/life_slat.jpg'],
    ['rivals', 'II · AFW & Bme', 'Doanh thu, category, dòng chủ lực', D.lines.find(l => l.line === 'Vivian').pics[0]],
    ['beds', 'III · Giường đối thủ', '22 dòng · gallery · review', thor.pics[0]],
    ['proposal', 'IV · Đề xuất', 'Cấu hình 3D, giá, unit economics', null, 'img/render/st_geo.jpg'],
    ['build', 'V · Bản vẽ & lắp ráp', 'Lắp ráp 3D, bản vẽ, BOM', null, 'img/render/detail.jpg']];
  $('#navcards').innerHTML = nav.map(n => `<a class="navcard glass" href="#${n[0]}">${n[4] ? `<img src="${n[4]}" alt="" loading="lazy">` : img(n[3], n[1], 500)}<div class="t">${n[1]}</div><div class="muted" style="font-size:12.5px">${n[2]}</div></a>`).join('');
  const mq = P.filter(p => p.mat === 'Gỗ tự nhiên' && p.img).slice(0, 26);
  $('#marquee').innerHTML = [...mq, ...mq].map(p => `<a href="https://www.amazon.com/dp/${p.asin}" target="_blank" rel="noopener" title="${esc(p.brand + ' · ' + fmt$(p.rev) + '/tháng')}">${img(p.img, p.brand, 300, p.brand)}</a>`).join('');
};

// =====================================================================
INIT.market = function () { subtabs('#mkTabs', '#v-market', p => MKT[p] && MKT[p]()); };
const MKT = {};
MKT.global = function () {
  $('#glKpi').innerHTML = [['$14.2B', 'Toàn cầu 2025', '→ $18.9B năm 2034'], ['32.4%', 'Giường gỗ', 'nhóm lớn nhất'], ['36%', 'Bắc Mỹ', '≈ $5.1B'], ['38.7%', 'Bán online', 'specialty store 31.4%']]
    .map(s => `<div class="glass pad stat"><div class="v">${s[0]}</div><div class="l">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('');
  $('#amzRun').textContent = fmt$(K.rev * 12);
  const yrs = [], vals = []; for (let y = 2025; y <= 2034; y++) { yrs.push(y); vals.push(+(14.2 * Math.pow(18.9 / 14.2, (y - 2025) / 9)).toFixed(2)); }
  mk('cGlSize', { type: 'line', data: { labels: yrs, datasets: [{ label: 'Quy mô ($B)', data: vals, borderColor: C.acacia, backgroundColor: 'rgba(181,118,63,.15)', fill: true, tension: .3, pointRadius: yrs.map(y => y === 2025 || y === 2034 ? 5 : 2), pointBackgroundColor: C.esp, segment: { borderDash: c => c.p0DataIndex >= 0 ? [5, 4] : undefined } }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '$' + c.raw + 'B' + (c.dataIndex === 0 || c.dataIndex === 9 ? ' (báo cáo)' : ' (nội suy)') } } }, scales: { y: { ticks: { callback: v => '$' + v + 'B' }, grid: { color: grid }, suggestedMin: 12 }, x: noGrid } } });
  const dn = (id, labels, data, cols) => mk(id, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: cols, borderWidth: 2, borderColor: '#f5f1ea' }] }, options: { cutout: '60%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => c.label + ': ' + c.raw + '%' } } } } });
  dn('cGlType', ['Gỗ', 'Kim loại', 'Bọc nệm', 'Adjustable', 'Khác'], [32.4, 24.7, 21.5, 14.8, 6.6], [C.acacia, C.grey, C.sage, C.sky, C.sand]);
  dn('cGlRegion', ['Bắc Mỹ', 'Châu Âu', 'APAC', 'Mỹ Latin', 'MEA'], [36, 28.5, 22, 10, 3.5], [C.acacia, C.bme, C.sky, C.olive, C.sand]);
  mk('cGlChannel', { type: 'bar', data: { labels: ['Online', 'Specialty store', 'Siêu thị', 'Khác'], datasets: [{ data: [38.7, 31.4, 20.8, 9.1], backgroundColor: [C.acacia, C.grey, C.grey, C.sand], borderRadius: 8 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' }, grid: { color: grid } }, x: noGrid } } });
  $('#chAmz').innerHTML = [[fmt$(K.rev), 'Bed frame / tháng'], [fmtN(K.units), 'Đơn / tháng'], ['$' + K.asp.toFixed(0), 'Giá bình quân']].map(s => `<div class="stat"><div class="v">${s[0]}</div><div class="l">${s[1]}</div></div>`).join('');
};
MKT.amazon = function () {
  $('#amzKpi').innerHTML = [[fmt$(K.rev), 'Doanh thu / tháng', '≈ ' + fmtN(K.units) + ' đơn'], [fmtN(K.asins), 'ASIN', K.brands + ' brand'], ['$' + K.asp.toFixed(0), 'Giá bình quân', 'doanh thu / đơn'], [pct(K.cr5), 'Top 5 brand', 'Top 10: ' + pct(K.cr10)]]
    .map(s => `<div class="glass pad stat"><div class="v">${s[0]}</div><div class="l">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('');
  $('#cr5').textContent = pct(K.cr5); $('#cr10').textContent = pct(K.cr10);
  $('#woodShare').textContent = pct(D.wood_total.share) + ' (' + fmt$(D.wood_total.rev) + '/tháng)'; $('#woodCr5').textContent = pct(D.wood_total.cr5, 0);
  const focus = ['AllForWood', 'BME', 'Merax', 'Zinus', 'Nectar'];
  const B = MK.B.slice(0, 60).concat(MK.B.filter(b => focus.includes(b[0]) && MK.B.indexOf(b) >= 60));
  mk('cBrandBubble', { type: 'bubble', data: { datasets: [{ data: B.map(b => ({ x: b[4], y: b[1], r: Math.max(3, Math.min(26, Math.sqrt(b[5]) * 1.1)), b })), backgroundColor: B.map(b => focus.includes(b[0]) ? 'rgba(181,118,63,.85)' : 'rgba(110,98,87,.28)'), borderColor: B.map(b => focus.includes(b[0]) ? C.esp : 'rgba(110,98,87,.4)') }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const b = c.raw.b; return `${b[0]} · ${fmt$(b[1])}/tháng · giá TB $${b[4].toFixed(0)} · ${b[5]} ASIN · ★${b[8]}`; } } } },
      scales: { x: { type: 'logarithmic', min: 40, max: 1200, title: { display: true, text: 'Giá bình quân ($, log)' }, ticks: { callback: v => [50, 100, 200, 400, 800].includes(v) ? '$' + v : '' }, grid: { color: grid } }, y: { type: 'logarithmic', title: { display: true, text: 'Doanh thu / tháng (log)' }, ticks: { callback: v => [1e5, 3e5, 1e6, 3e6].includes(v) ? fmt$(v) : '' }, grid: { color: grid } } } },
    plugins: [{ id: 'lbl', afterDatasetsDraw(ch) { const ctx = ch.ctx; ctx.save(); ctx.font = '600 11px "Be Vietnam Pro"'; ctx.fillStyle = C.esp; ch.getDatasetMeta(0).data.forEach((pt, i) => { const b = B[i]; if (focus.includes(b[0]) || i < 6) ctx.fillText(b[0], pt.x + 8, pt.y - 6); }); ctx.restore(); } }] });
  const T = MK.B.slice(0, 15);
  mk('cBrands', { type: 'bar', data: { labels: T.map(b => b[0]), datasets: [{ data: T.map(b => b[1]), backgroundColor: T.map((b, i) => i < 5 ? C.esp : C.grey), borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const b = T[c.dataIndex]; return `${fmt$(b[1])} · ${pct(b[2])} · giá TB $${b[4].toFixed(0)} · ${b[5]} ASIN · ${b[6]}`; } } } }, scales: { x: moneyAxis, y: noGrid } } });
};
MKT.design = function () {
  const M = D.material.filter(m => m.k !== 'Khác');
  mk('cMat', { type: 'bar', data: { labels: M.map(m => m.k), datasets: [{ data: M.map(m => m.rev), backgroundColor: M.map(m => m.k === 'Gỗ tự nhiên' ? C.acacia : C.grey), borderRadius: 6 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) + ' · ' + M[c.dataIndex].n + ' ASIN' } } }, scales: { y: moneyAxis, x: noGrid } } });
  mk('cMatPrice', { type: 'bar', data: { labels: M.map(m => m.k), datasets: [{ data: M.map(m => m.price), backgroundColor: M.map(m => m.k === 'Gỗ tự nhiên' ? C.acacia : C.sage), borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '$' + v }, grid: { color: grid } }, x: noGrid } } });
  const SZ = ['Queen', 'King', 'Full', 'Twin', 'Cal King', 'Twin XL'], sa = Object.fromEntries(D.size_all.map(s => [s.k, s])), sw = Object.fromEntries(D.size_wood.map(s => [s.k, s]));
  mk('cSize', { type: 'bar', data: { labels: SZ, datasets: [{ label: 'Toàn thị trường', data: SZ.map(s => sa[s] && sa[s].rpa), backgroundColor: C.grey, borderRadius: 6 }, { label: 'Giường gỗ', data: SZ.map(s => sw[s] && sw[s].rpa), backgroundColor: C.acacia, borderRadius: 6 }] }, options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) + '/ASIN' } } }, scales: { y: moneyAxis, x: noGrid } } });
  const BL = D.band_all.map(b => b.k);
  mk('cBand', { type: 'bar', data: { labels: BL, datasets: [{ label: 'Toàn thị trường', data: D.band_all.map(b => +(b.share * 100).toFixed(1)), backgroundColor: C.grey, borderRadius: 6 }, { label: 'Giường gỗ', data: D.band_wood.map(b => +(b.share * 100).toFixed(1)), backgroundColor: C.acacia, borderRadius: 6 }] }, options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + '%' } } }, scales: { y: { ticks: { callback: v => v + '%' }, grid: { color: grid } }, x: noGrid } } });
  const F = D.feat_wood;
  const avg = { id: 'avg', afterDraw(ch) { const x = ch.scales.x.getPixelForValue(D.wood_avg_rpa), { top, bottom } = ch.chartArea, ctx = ch.ctx; ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.ink2; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); ctx.restore(); } };
  mk('cFeat', { type: 'bar', data: { labels: F.map(f => f.k), datasets: [{ data: F.map(f => f.rpa), backgroundColor: F.map((f, i) => i < 3 ? C.acacia : C.grey), borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const f = F[c.dataIndex]; return fmt$(f.rpa) + '/ASIN · ' + f.n + ' ASIN · giá TV $' + Math.round(f.price); } } } }, scales: { x: moneyAxis, y: noGrid } }, plugins: [avg] });
  const CW = D.color_wood.slice(0, 11), swc = { Walnut: '#6b4428', Natural: '#d8b383', 'Light wood': '#e3c9a0', Black: '#2b2522', White: '#f4efe7', Brown: '#8a5a36', Oak: '#b98d5a', Grey: '#8d8c88', Dark: '#4a3022', Espresso: '#3b2418', Honey: '#d49a4f', Caramel: '#c98a4b', Chocolate: '#3a2519' };
  mk('cColor', { type: 'bar', data: { labels: CW.map(c => c.k), datasets: [{ data: CW.map(c => c.rev), backgroundColor: CW.map(c => swc[c.k] || C.grey), borderColor: 'rgba(59,46,37,.25)', borderWidth: 1, borderRadius: 6 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) + ' · ' + CW[c.dataIndex].n + ' ASIN' } } }, scales: { y: moneyAxis, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } } });
  const SP = D.species;
  mk('cSpecies', { type: 'bubble', data: { datasets: SP.map((s, i) => ({ label: s.k, data: [{ x: s.n, y: s.price, r: Math.max(5, Math.sqrt(s.rev) / 55) }], backgroundColor: (s.k === 'Acacia' ? C.acacia : PAL[(i + 1) % PAL.length]) + 'cc' })) },
    options: { plugins: { legend: { position: 'right', labels: { font: { size: 10.5 } } }, tooltip: { callbacks: { label: c => { const s = SP[c.datasetIndex]; return `${s.k}: ${s.n} ASIN · giá TV $${Math.round(s.price)} · ${fmt$(s.rev)}/tháng`; } } } }, scales: { x: { title: { display: true, text: 'Số ASIN' }, grid: { color: grid } }, y: { title: { display: true, text: 'Giá TV ($)' }, grid: { color: grid }, suggestedMin: 150, suggestedMax: 460 } } } });
  const keys = Object.keys(MK.CLS);
  $('#clsGrid').innerHTML = keys.map((k, i) => `<div class="glass pad" style="padding:14px"><h4 style="font-size:13.5px">${esc(k)}</h4><div class="chartbox xs"><canvas id="cls${i}"></canvas></div></div>`).join('');
  keys.forEach((k, i) => { const d = MK.CLS[k]; mk('cls' + i, { type: 'doughnut', data: { labels: d.map(x => x[0]), datasets: [{ data: d.map(x => x[1]), backgroundColor: d.map((x, j) => x[0] === 'Không xác định' ? '#e4ddd2' : PAL[j % PAL.length]), borderWidth: 1, borderColor: '#f5f1ea' }] }, options: { cutout: '58%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.label + ': ' + fmt$(c.raw) } } } } }); });
};
MKT.products = function () {
  const mats = ['Tất cả chất liệu', ...new Set(P.map(p => p.mat))], sizes = ['Tất cả size', 'King', 'Queen', 'Full', 'Twin', 'Cal King', 'Twin XL'];
  const bands = [['Mọi mức giá', 0, 1e9], ['< $125', 0, 125], ['$125–250', 125, 250], ['$250–400', 250, 400], ['$400–600', 400, 600], ['$600+', 600, 1e9]];
  $('#fmat').innerHTML = mats.map(m => `<option>${m}</option>`).join(''); $('#fmat').value = 'Gỗ tự nhiên';
  $('#fsize').innerHTML = sizes.map(m => `<option>${m}</option>`).join('');
  $('#fprice').innerHTML = bands.map((b, i) => `<option value="${i}">${b[0]}</option>`).join('');
  const FE = [['H', 'Có headboard'], ['T', 'Tool-free'], ['J', 'Japanese/joinery'], ['M', 'Mid-century'], ['S', 'Storage'], ['L', 'LED'], ['U', 'USB'], ['N', 'No box spring']];
  const on = new Set();
  $('#ffeat').innerHTML = FE.map(f => `<button data-f="${f[0]}">${f[1]}</button>`).join('');
  $('#ffeat').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; on.has(b.dataset.f) ? on.delete(b.dataset.f) : on.add(b.dataset.f); b.classList.toggle('on'); page = 0; run(); });
  let page = 0; const per = 24;
  function filt() {
    const q = $('#fq').value.trim().toLowerCase(), m = $('#fmat').value, s = $('#fsize').value, b = bands[+$('#fprice').value];
    let X = P.filter(p => (m.startsWith('Tất cả') || p.mat === m) && (s.startsWith('Tất cả') || p.size === s) && p.price >= b[1] && p.price < b[2] && [...on].every(f => p.f.includes(f)) && (!q || (p.title + ' ' + p.brand + ' ' + p.asin).toLowerCase().includes(q)));
    const so = $('#fsort').value; X.sort((a, c) => so === 'price' ? c.price - a.price : so === 'pricea' ? a.price - c.price : so === 'rv' ? c.rv - a.rv : c.rev - a.rev);
    return X;
  }
  function run() {
    const X = filt(), n = X.length, pages = Math.max(1, Math.ceil(n / per)); page = Math.min(page, pages - 1);
    $('#fcount').textContent = `${fmtN(n)} sản phẩm · tổng ${fmt$(X.reduce((s, p) => s + p.rev, 0))}/tháng`;
    $('#pgrid').innerHTML = X.slice(page * per, page * per + per).map(p => `<a class="pcard" href="https://www.amazon.com/dp/${p.asin}" target="_blank" rel="noopener"><div class="im">${img(p.img, p.brand, 400, p.brand)}</div><div class="b">${esc(p.brand)}</div><div class="t">${esc(p.title)}</div><div class="m"><span>$${p.price.toFixed(0)}</span><span>${fmt$(p.rev)}/th</span></div><div class="m faint"><span>★ ${p.rt || '—'} · ${fmtN(p.rv)}</span><span>${p.size}</span></div></a>`).join('') || '<p class="muted">Không có sản phẩm khớp bộ lọc.</p>';
    $('#pager').innerHTML = `<button ${page ? '' : 'disabled'} data-d="-1">←</button><span class="muted" style="font-size:13px">Trang ${page + 1} / ${pages}</span><button ${page < pages - 1 ? '' : 'disabled'} data-d="1">→</button>`;
    const S = X.slice(0, 600);
    mk('cScatter', { type: 'scatter', data: { datasets: [{ data: S.map(p => ({ x: p.price, y: Math.max(1, p.rev), p })), backgroundColor: S.map(p => p.f.includes('T') || p.f.includes('J') ? 'rgba(181,118,63,.85)' : 'rgba(79,122,108,.35)'), pointRadius: 3.5 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const p = c.raw.p; return `${p.brand} · $${p.price.toFixed(0)} · ${fmt$(p.rev)}/th`; } } } }, scales: { x: { title: { display: true, text: 'Giá ($)' }, grid: { color: grid } }, y: { type: 'logarithmic', title: { display: true, text: 'Doanh thu/tháng (log)' }, ticks: { callback: v => [1e3, 1e4, 1e5].includes(v) ? fmt$(v) : '' }, grid: { color: grid } } } } });
    const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
    $('#fsum').innerHTML = [['Giá trung vị', '$' + med(X.map(p => p.price)).toFixed(0)], ['Doanh thu TB / ASIN', fmt$(n ? X.reduce((s, p) => s + p.rev, 0) / n : 0)], ['Rating TB', (X.reduce((s, p) => s + (p.rt || 0), 0) / Math.max(1, X.filter(p => p.rt).length)).toFixed(2) + '★']].map(s => `<div style="display:flex;justify-content:space-between;font-size:13px"><span class="muted">${s[0]}</span><b class="num">${s[1]}</b></div>`).join('') + '<p class="cap">Chấm nâu: sản phẩm tool-free / joinery.</p>';
  }
  $('#pager').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; page += +b.dataset.d; run(); $('#pgrid').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  ['#fq', '#fmat', '#fsize', '#fprice', '#fsort'].forEach(s => $(s).addEventListener('input', () => { page = 0; run(); }));
  run();
};
MKT.keywords = function () {
  $('#clusterSv').textContent = fmtN(D.cluster.sv);
  $('#clusterYoy').textContent = `${D.cluster.n} từ khoá · YoY +${pct(D.cluster.sv / D.cluster.prev - 1)} · cùng kỳ ${fmtN(D.cluster.prev)}`;
  const KW = MK.K.map(k => ({ k: k[0], sv: k[1], prev: k[2], asins: k[3], sales: k[4], ads: k[5], rel: k[6], yoy: k[2] ? k[1] / k[2] - 1 : null }));
  const ris = KW.filter(k => /wood|joinery|japan|thuma|acacia|walnut|solid|platform/.test(k.k) && k.prev >= 1500 && k.sv >= 4000).sort((a, b) => b.yoy - a.yoy).slice(0, 10);
  mk('cRisers', { type: 'bar', data: { labels: ris.map(r => r.k), datasets: [{ data: ris.map(r => +(r.yoy * 100).toFixed(0)), backgroundColor: C.acacia, borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '+' + c.raw + '% · ' + fmtN(ris[c.dataIndex].sv) + ' lượt' } } }, scales: { x: { ticks: { callback: v => '+' + v + '%' }, grid: { color: grid } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } } } });
  let sortK = 'sv', asc = false;
  const draw = () => {
    const q = $('#kq').value.trim().toLowerCase();
    const X = KW.filter(k => !q || k.k.includes(q)).sort((a, b) => (asc ? 1 : -1) * ((a[sortK] ?? -1e9) - (b[sortK] ?? -1e9))).slice(0, 300);
    const mx = Math.max(...X.map(k => k.sv), 1);
    const h = (k, l, r) => `<th class="sort ${r ? 'r' : ''}" data-k="${k}">${l}${sortK === k ? (asc ? ' ↑' : ' ↓') : ''}</th>`;
    $('#tKw').innerHTML = `<thead><tr><th>Từ khoá</th>${h('sv', 'Search/tháng', 1)}<th style="width:18%"></th>${h('yoy', 'YoY', 1)}${h('asins', 'ASIN', 1)}${h('sales', 'Sales KW', 1)}</tr></thead><tbody>` +
      X.map(k => `<tr><td>${esc(k.k)}</td><td class="r num">${fmtN(k.sv)}</td><td><div class="bar-in" style="width:${Math.max(3, k.sv / mx * 100)}%;${/japan|joinery|thuma|japandi|tool|solid wood|acacia/.test(k.k) ? '' : 'background:' + C.grey}"></div></td><td class="r num" style="color:${k.yoy == null || k.yoy >= 0 ? C.good : C.bad}">${k.yoy == null ? 'mới' : k.yoy > 9 ? '×' + (k.yoy + 1).toFixed(0) : (k.yoy > 0 ? '+' : '') + (k.yoy * 100).toFixed(0) + '%'}</td><td class="r num">${k.asins}</td><td class="r num">${fmtN(k.sales)}</td></tr>`).join('') + '</tbody>';
  };
  $('#tKw').addEventListener('click', e => { const th = e.target.closest('th.sort'); if (!th) return; if (sortK === th.dataset.k) asc = !asc; else { sortK = th.dataset.k; asc = false; } draw(); });
  $('#kq').addEventListener('input', draw); draw();
};
MKT.brands = function () {
  const B = MK.B.map((b, i) => ({ rank: i + 1, k: b[0], rev: b[1], share: b[2], chg: b[3], price: b[4], n: b[5], c: b[6], rv: b[7], rt: b[8], units: b[9], ads: b[10] }));
  let sortK = 'rev', asc = false, page = 0; const per = 25;
  const focus = ['AllForWood', 'BME', 'Merax', 'Zinus', 'Nectar', 'Mellow'];
  const draw = () => {
    const q = $('#bq').value.trim().toLowerCase();
    const X = B.filter(b => !q || b.k.toLowerCase().includes(q)).sort((a, b) => (asc ? 1 : -1) * ((typeof a[sortK] === 'string' ? a[sortK].localeCompare(b[sortK]) : a[sortK] - b[sortK])));
    const pages = Math.max(1, Math.ceil(X.length / per)); page = Math.min(page, pages - 1);
    const h = (k, l, r) => `<th class="sort ${r ? 'r' : ''}" data-k="${k}">${l}${sortK === k ? (asc ? ' ↑' : ' ↓') : ''}</th>`;
    $('#tBrands').innerHTML = `<thead><tr>${h('rank', '#', 1)}${h('k', 'Brand')}${h('rev', 'Doanh thu/tháng', 1)}${h('share', 'Thị phần', 1)}${h('chg', 'Δ thị phần', 1)}${h('price', 'Giá TB', 1)}${h('n', 'ASIN', 1)}${h('units', 'Đơn/tháng', 1)}${h('rt', '★', 1)}${h('c', 'Nước')}</tr></thead><tbody>` +
      X.slice(page * per, page * per + per).map(b => `<tr style="${focus.includes(b.k) ? 'background:rgba(181,118,63,.10)' : ''}"><td class="r num faint">${b.rank}</td><td><b>${esc(b.k)}</b></td><td class="r num">${fmt$(b.rev)}</td><td class="r num">${pct(b.share, 2)}</td><td class="r num" style="color:${b.chg >= 0 ? C.good : C.bad}">${(b.chg >= 0 ? '+' : '') + (b.chg * 100).toFixed(2)}pp</td><td class="r num">$${b.price.toFixed(0)}</td><td class="r num">${b.n}</td><td class="r num">${fmtN(b.units)}</td><td class="r num">${b.rt}</td><td>${b.c}</td></tr>`).join('') + '</tbody>';
    $('#bpager').innerHTML = `<button ${page ? '' : 'disabled'} data-d="-1">←</button><span class="muted" style="font-size:13px">Trang ${page + 1} / ${pages}</span><button ${page < pages - 1 ? '' : 'disabled'} data-d="1">→</button>`;
  };
  $('#tBrands').addEventListener('click', e => { const th = e.target.closest('th.sort'); if (!th) return; if (sortK === th.dataset.k) asc = !asc; else { sortK = th.dataset.k; asc = th.dataset.k === 'k' || th.dataset.k === 'rank'; } draw(); });
  $('#bpager').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; page += +b.dataset.d; draw(); });
  $('#bq').addEventListener('input', () => { page = 0; draw(); }); draw();
};
MKT.trend = function () {
  const ST = D.style_trend, col = { Rustic: C.clay, 'Mid-Century Modern': C.sky, Farmhouse: C.sage, Thuma: C.acacia, Minimalist: C.olive, Classic: C.grey };
  mk('cStyle', { type: 'line', data: { labels: ST.months, datasets: Object.entries(ST.series).map(([k, v]) => ({ label: k === 'Thuma' ? 'Thuma-style (joinery)' : k, data: v, borderColor: col[k], backgroundColor: col[k] + '30', fill: k === 'Thuma', tension: .35, pointRadius: 0, borderWidth: k === 'Thuma' ? 3.5 : 1.8 })) },
    options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: moneyAxis, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 9 } } } } });
  const PT = D.price_trend, order = ['$50-100', '$100-150', '$150-200', '$200-250', '$250-300', '$300-350', '$350-400', '$500-600'];
  mk('cPriceTrend', { type: 'line', data: { labels: PT.months, datasets: order.filter(k => PT.series[k]).map((k, i) => ({ label: k, data: PT.series[k], borderColor: PAL[i % PAL.length], backgroundColor: PAL[i % PAL.length] + '55', fill: true, tension: .3, pointRadius: 0, borderWidth: 1 })) },
    options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { font: { size: 10 } } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: { ...moneyAxis, stacked: true }, x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 8 } } } } });
  const AT = D.asin_trend, an = { B0F4JVH6ZQ: ['AFW Thor Queen', C.afw], B0B3MQTGL1: ['Bme Vivian', C.bme], B0DFC9QX92: ['Merax Thuma-style', C.sky], B0GHKFZ447: ['RECCI', C.clay] };
  mk('cAsinTrend', { type: 'line', data: { labels: AT.months, datasets: Object.entries(AT.series).map(([a, v]) => ({ label: an[a][0], data: v.map(x => x || null), borderColor: an[a][1], backgroundColor: an[a][1], tension: .35, pointRadius: 0, borderWidth: 2.2 })) },
    options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: moneyAxis, x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 8 } } } } });
};

// =====================================================================
const BR = D.brand, bc = { AllForWood: C.afw, Bme: C.bme };
INIT.rivals = function () {
  const desc = { AllForWood: 'Ít dòng, dồn lực vào sản phẩm hero. Thor (joinery, tool-free) chiếm ~65% doanh thu. Mạnh ở bedroom và mặt bàn gỗ Hevea.', Bme: 'Danh mục rộng (8 category, 28 dòng), nhiều headboard gỗ Acacia. Doanh thu chia đều, ít hero, nhiều dòng mới còn yếu.' };
  $('#vsCards').innerHTML = ['AllForWood', 'Bme'].map(b => { const x = BR[b]; const hero = D.lines.filter(l => l.brand === b)[0];
    return `<div class="glass pad" style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:16px;align-items:start"><div style="border-radius:16px;overflow:hidden;background:#fff;aspect-ratio:1">${img(hero.pics[0], hero.line, 500)}</div>
    <div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="color:${bc[b]}">${b}</h3><span class="chip">${b === 'Bme' ? 'Yes4All' : 'Hoàng Thông'}</span></div>
    <div class="grid g4" style="margin-top:12px;gap:10px">${[[fmt$(x.rev), 'Doanh thu/tháng'], [fmtN(x.units), 'Đơn/tháng'], [x.n, 'ASIN'], [x.lines, 'Dòng · ' + x.cats + ' cate']].map(s => `<div class="stat"><div class="v" style="font-size:22px">${s[0]}</div><div class="l">${s[1]}</div></div>`).join('')}</div>
    <p class="muted" style="margin-top:10px;font-size:13.5px">${desc[b]}</p></div></div>`; }).join('');
  const ssA = D.ss_brand.AFW, ssB = D.ss_brand.BME;
  $('#shareCards').innerHTML = [['Thị phần bed frame Amazon', `<span style="color:${C.afw}">AFW ${pct(ssA.share, 2)}</span> · <span style="color:${C.bme}">Bme ${pct(ssB.share, 2)}</span>`, `SmartScout · hạng #${ssA.rank} và #${ssB.rank} / 689`],
    ['Thị phần giường gỗ', `<span style="color:${C.afw}">AFW ${pct(155758 / D.wood_total.rev)}</span> · <span style="color:${C.bme}">Bme ${pct(314289 / D.wood_total.rev)}</span>`, 'Trên ' + fmt$(D.wood_total.rev) + '/tháng · Zinus dẫn đầu 10.8%'],
    ['Bedroom trong doanh thu brand', `<span style="color:${C.afw}">AFW ${pct(BR.AllForWood.cat[0].rev / BR.AllForWood.rev, 0)}</span> · <span style="color:${C.bme}">Bme ${pct(BR.Bme.cat[0].rev / BR.Bme.rev, 0)}</span>`, 'Helium 10, 30 ngày']]
    .map(s => `<div class="glass pad stat"><div class="l" style="margin:0 0 8px">${s[0]}</div><div class="v" style="font-size:21px">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('');
  const cats = [...new Set([...BR.AllForWood.cat, ...BR.Bme.cat].map(c => c.k))].filter(k => k !== 'Other' && k !== 'Bath');
  const cr = (b, k) => (BR[b].cat.find(c => c.k === k) || {}).rev || 0;
  cats.sort((a, b) => cr('AllForWood', b) + cr('Bme', b) - cr('AllForWood', a) - cr('Bme', a));
  mk('cCat', { type: 'bar', data: { labels: cats, datasets: ['AllForWood', 'Bme'].map(b => ({ label: b, data: cats.map(k => cr(b, k)), backgroundColor: bc[b], borderRadius: 6 })) }, options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: moneyAxis, x: { grid: { display: false }, ticks: { font: { size: 10.5 }, callback: function (v) { const l = this.getLabelForValue(v); return l.length > 14 ? l.split(/ [\/&] | /).slice(0, 2) : l; } } } } } });
  const bands = BR.AllForWood.band.map(b => b.k);
  mk('cBrandBand', { type: 'bar', data: { labels: bands, datasets: ['AllForWood', 'Bme'].map(b => ({ label: b, data: BR[b].band.map(x => x.n), backgroundColor: bc[b], borderRadius: 6 })) }, options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + ' ASIN · ' + fmt$(BR[c.dataset.label].band[c.dataIndex].rev) } } }, scales: { y: { grid: { color: grid } }, x: noGrid } } });
  const notes = {
    AllForWood: [['good', 'Hero rõ ràng', 'Thor ≈ 65% doanh thu brand; 1 ASIN King Walnut ≈ $58K/tháng.'], ['good', 'Giá trung vị bedroom $429', 'Cao hơn Bme ($296).'], ['bad', 'Ít review ở dòng mới', 'Loki, Nesto, Apollo dưới 25 review.'], ['warn', 'Dòng hero không có headboard', 'Khoảng trống cho Kumi bản có headboard.']],
    Bme: [['good', 'Review dày', 'Vivian 900+ review 4.7★, Caden 560+.'], ['good', 'Acacia + headboard', 'Đúng phân khúc $300–500 mà Lignarc nhắm.'], ['bad', 'Chất lượng không đều', '80 review chê: gãy/nứt, ốc lỏng kêu, màu lệch, CS chậm.'], ['warn', 'Dàn trải', '18 dòng giường, hơn nửa dưới $10K/tháng.']]
  };
  let tl;
  function render(b) {
    const x = BR[b];
    $('#heroTitle').innerHTML = `<span style="color:${bc[b]}">${b}</span> · dòng giường bán chạy`;
    $('#brandHero').innerHTML = D.lines.filter(l => l.brand === b).slice(0, 8).map(l => `<a class="ref" href="https://www.amazon.com/dp/${l.rep}" target="_blank" rel="noopener"><div class="im">${img(l.pics[0], l.line, 300)}</div><div><b>${l.line}</b><span>${fmt$(l.rev)}/tháng · ${l.pmin ? '$' + l.pmin + '–' + l.pmax : '—'}</span><span>${l.sizes.join(' · ')}</span></div></a>`).join('');
    $('#bdTitle').innerHTML = `<span style="color:${bc[b]}">${b}</span> · category & giá`;
    $('#tCat').innerHTML = '<thead><tr><th>Category</th><th class="r">ASIN</th><th class="r">Doanh thu</th><th class="r">Đơn</th><th class="r">Giá</th><th class="r">% brand</th></tr></thead><tbody>' + x.cat.map(c => `<tr><td>${c.k}</td><td class="r num">${c.n}</td><td class="r num">${fmt$(c.rev)}</td><td class="r num">${fmtN(c.units)}</td><td class="r num">${c.pmin != null ? '$' + c.pmin + '–' + c.pmax : '—'}</td><td class="r num">${pct(c.rev / x.rev, 0)}</td></tr>`).join('') + '</tbody>';
    $('#tTop').innerHTML = '<thead><tr><th>ASIN</th><th>Dòng</th><th>Loại</th><th class="r">Giá</th><th class="r">Đơn</th><th class="r">Doanh thu</th></tr></thead><tbody>' + x.top.map(p => `<tr><td class="num"><a href="https://www.amazon.com/dp/${p.asin}" target="_blank" rel="noopener">${p.asin}</a></td><td>${p.line}</td><td class="muted">${p.type}${p.size && p.size !== '-' ? ' · ' + p.size : ''}</td><td class="r num">${p.price ? '$' + p.price.toFixed(0) : '—'}</td><td class="r num">${fmtN(p.units)}</td><td class="r num">${fmt$(p.rev)}</td></tr>`).join('') + '</tbody>';
    tl = x.topline;
    mk('cTopLine', { type: 'bar', data: { labels: tl.map(l => l.k), datasets: [{ data: tl.map(l => l.rev), backgroundColor: tl.map((l, i) => i ? bc[b] + '88' : bc[b]), borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) + ' · ' + tl[c.dataIndex].n + ' ASIN' } } }, scales: { x: moneyAxis, y: noGrid } } });
    $('#bdNotes').innerHTML = notes[b].map(n => `<div><span class="chip ${n[0]}">${n[1]}</span><p class="muted" style="font-size:13px;margin-top:6px">${n[2]}</p></div>`).join('');
  }
  seg('#brandTabs', 'b', render); render('AllForWood');
};

// =====================================================================
INIT.beds = function () {
  const L = D.lines;
  $('#nLines').textContent = L.length; $('#nImgs').textContent = fmtN(L.reduce((s, l) => s + l.ngal, 0)); $('#thorRev').textContent = fmt$(thor.rev);
  const lc = l => l.brand === 'AllForWood' ? C.afw : C.bme;
  let cur = L[0].brand + '|' + L[0].line, f = 'all';
  function cards() {
    $('#lineCards').innerHTML = L.filter(l => f === 'all' || l.brand === f).map(l => { const k = l.brand + '|' + l.line; return `<button class="lc ${k === cur ? 'on' : ''}" data-k="${k}">${img(l.pics[0], l.line, 400)}<div class="n"><span>${l.line}</span><span class="dot" style="background:${lc(l)}"></span></div><div class="m">${fmt$(l.rev)}/th · ${l.pmin ? '$' + l.pmin + '–' + l.pmax : '—'}</div></button>`; }).join('');
  }
  let szc;
  function detail() {
    const l = L.find(x => x.brand + '|' + x.line === cur); const v = s => s && s.trim() ? esc(s) : '<span class="faint">Chưa có dữ liệu chi tiết</span>';
    $('#lineDetail').innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3>${l.line}</h3><span class="chip ${l.brand === 'AllForWood' ? 'afw' : 'bme'}">${l.brand}</span><span class="chip">${l.n} ASIN · ${l.colors} màu</span>${l.rating ? `<span class="chip">★ ${l.rating} · ${fmtN(l.nrat)}</span>` : ''}${l.rep ? `<a class="chip" href="https://www.amazon.com/dp/${l.rep}" target="_blank" rel="noopener">Amazon ↗</a>` : ''}</div>
      <div class="gal" style="margin-top:12px">${l.pics.map(p => img(p, l.line, 600)).join('')}</div>
      <div class="grid g2" style="margin-top:14px;align-items:start"><dl class="kv"><dt>Doanh thu</dt><dd class="num">${fmt$(l.rev)}/tháng · ${fmtN(l.units)} đơn</dd><dt>Giá</dt><dd class="num">${l.pmin ? '$' + l.pmin + ' – $' + l.pmax : '—'}</dd><dt>Size</dt><dd>${l.sizes.join(', ')}</dd><dt>Vật liệu</dt><dd>${esc(l.mat || '—')}</dd><dt>Headboard</dt><dd>${l.hb}</dd><dt>Kích thước</dt><dd class="num" style="font-size:12.5px">${esc(l.dims || '—')}${l.wt ? ' · ' + l.wt + ' lb' : ''}</dd><dt>K/D</dt><dd style="font-size:13px">${v(l.kd)}</dd><dt>Đóng gói</dt><dd style="font-size:13px">${v(l.pack)}</dd></dl>
      <div style="display:grid;gap:10px"><div><b>Selling point</b><p class="muted" style="font-size:13px;margin-top:4px">${v(l.sp)}</p></div><div><b style="color:var(--acacia)">Big selling point</b><p class="muted" style="font-size:13px;margin-top:4px">${v(l.usp)}</p></div><div class="chartbox xs" style="height:140px"><canvas id="cLineSize"></canvas></div></div></div>
      <div class="grid g2" style="margin-top:12px"><div class="pros"><b style="color:var(--good)">Khách khen</b><p style="margin-top:6px">${v(l.good)}</p></div><div class="cons"><b style="color:var(--bad)">Khách chê</b><p style="margin-top:6px">${v(l.bad)}</p></div></div>
      ${l.note ? `<p class="insight" style="margin-top:12px;font-size:13px">${esc(l.note)}</p>` : ''}`;
    mk('cLineSize', { type: 'bar', data: { labels: Object.keys(l.szrev), datasets: [{ data: Object.values(l.szrev), backgroundColor: lc(l), borderRadius: 5 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) } } }, scales: { y: moneyAxis, x: noGrid } } });
  }
  $('#lineCards').addEventListener('click', e => { const b = e.target.closest('.lc'); if (!b) return; cur = b.dataset.k; cards(); detail(); if (innerWidth < 1020) $('#lineDetail').scrollIntoView({ behavior: 'smooth' }); });
  seg('#lineFilter', 'f', x => { f = x; const first = L.find(l => f === 'all' || l.brand === f); cur = first.brand + '|' + first.line; cards(); detail(); });
  cards(); detail();
  subtabs('#bdTabs', '#v-beds', p => {
    if (p === 'charts') {
      mk('cLines', { type: 'bar', data: { labels: L.map(l => l.line), datasets: [{ data: L.map(l => l.rev), backgroundColor: L.map(lc), borderRadius: 5 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => L[c.dataIndex].brand + ' · ' + fmt$(c.raw) } } }, scales: { x: moneyAxis, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
      const LP = L.filter(l => l.pmin);
      mk('cLinePrice', { type: 'bar', data: { labels: LP.map(l => l.line), datasets: [{ data: LP.map(l => [l.pmin, l.pmax === l.pmin ? l.pmax + 4 : l.pmax]), backgroundColor: LP.map(l => lc(l)), borderRadius: 20, borderSkipped: false, barThickness: 9 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '$' + LP[c.dataIndex].pmin + ' – $' + LP[c.dataIndex].pmax } } }, scales: { x: { min: 150, max: 950, ticks: { callback: v => '$' + v }, grid: { color: grid } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
      const sz = ['Twin', 'Full', 'Queen', 'King'];
      mk('cBedSize', { type: 'bar', data: { labels: sz, datasets: ['AllForWood', 'Bme'].map(b => ({ label: b, data: sz.map(s => D.bed_size[b][s]), backgroundColor: bc[b], borderRadius: 6 })) }, options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: moneyAxis, x: noGrid } } });
    }
    if (p === 'reviews') {
      const R = D.reviews, AG = Object.entries(R.agg).sort((a, b) => b[1][0] + b[1][1] - a[1][0] - a[1][1]);
      mk('cAspect', { type: 'bar', data: { labels: AG.map(a => a[0]), datasets: [{ label: 'Tích cực', data: AG.map(a => a[1][0]), backgroundColor: C.good + 'cc', borderRadius: 4 }, { label: 'Tiêu cực', data: AG.map(a => a[1][1]), backgroundColor: C.bad + 'cc', borderRadius: 4 }] }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { afterLabel: c => { const a = AG[c.dataIndex][1]; return 'Tỷ lệ tiêu cực: ' + pct(a[1] / (a[0] + a[1]), 0); } } } }, scales: { x: { stacked: true, grid: { color: grid } }, y: { stacked: true, grid: { display: false } } } } });
      const TT = R.themes.slice().sort((a, b) => ((R.cnt.BME[b] || 0) / R.ncrit.BME + (R.cnt.AFW[b] || 0) / R.ncrit.AFW) - ((R.cnt.BME[a] || 0) / R.ncrit.BME + (R.cnt.AFW[a] || 0) / R.ncrit.AFW));
      mk('cPain', { type: 'bar', data: { labels: TT, datasets: [{ label: `AllForWood (${R.ncrit.AFW} review)`, data: TT.map(t => (R.cnt.AFW[t] || 0) / R.ncrit.AFW * 100), backgroundColor: C.afw, borderRadius: 4 }, { label: `Bme (${R.ncrit.BME} review)`, data: TT.map(t => (R.cnt.BME[t] || 0) / R.ncrit.BME * 100), backgroundColor: C.bme, borderRadius: 4 }] }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw.toFixed(0) + '%' } } }, scales: { x: { ticks: { callback: v => v + '%' }, grid: { color: grid } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } } } });
      const RI = [['Lắp ráp', 'Joinery của Thor được khen "lắp như xếp hình, 20 phút".', 'Thiếu ốc, lỗ lệch, hướng dẫn khó ở dòng headboard nhiều chi tiết.', '0 ốc khung, hướng dẫn hình + QR video 3D, mã chi tiết A–K.'],
        ['Độ chắc / ổn định', 'Gỗ thật nặng, đứng vững.', 'Gãy dầm giữa, chân đỡ nứt, slat cong, lung lay.', 'Dầm giữa 2 chân, nêm tự siết, test tải 1.000 lb.'],
        ['Độ ồn', 'Thor ít kêu nhờ mộng gỗ.', 'Ốc lỏng kêu, velcro slat kêu.', 'Đệm felt ở mọi điểm gỗ chạm gỗ, slat cuộn dây felt.'],
        ['Màu & ngoại hình', 'Vân đẹp, "trông đắt hơn giá".', 'Màu lệch ảnh (21% review chê của Bme).', 'Ảnh render chuẩn màu, thẻ màu trong A+, gửi swatch miễn phí.'],
        ['Kích thước', 'Gầm cao để đồ.', 'Khe hở đầu giường rơi gối, góc khung nhô va chân.', 'Headboard ôm sát nệm, góc bo R10.'],
        ['Dịch vụ', '—', 'CS chậm, khó đổi phụ tùng.', 'Kit phụ tùng, SLA 24h, bảo hành 3 năm khung.']];
      $('#tReviewInsight').innerHTML = '<thead><tr><th>Khía cạnh</th><th>Điểm tốt</th><th>Điểm xấu</th><th>Lignarc cải thiện</th></tr></thead><tbody>' + RI.map(r => `<tr><td><b>${r[0]}</b></td><td style="color:${C.good}">${r[1]}</td><td style="color:${C.bad}">${r[2]}</td><td>${r[3]}</td></tr>`).join('') + '</tbody>';
    }
  });
};

// =====================================================================
// BOM shared by proposal + build
function bom(size, hb) {
  const mw = size === 'Queen' ? 60 : 76, W = mw + 1 + 2.2, L = 81 + 2.2;
  const parts = [
    ['A', 'Chân góc cuối', 2, 14, 2.8, 2.8, 'Acacia', .82, 1],
    ['B', hb ? 'Cột đầu giường' : 'Chân góc đầu', 2, hb ? 48 : 14, 2.8, 2.8, 'Acacia', hb ? .9 : .82, 1],
    ['C', 'Ray đầu / cuối (mộng dương)', 2, W + 2.4, 4.75, 1.1, 'Acacia', 1, 1],
    ['D', 'Ray dọc (mộng xuyên)', 2, L + 2.4, 4.75, 1.1, 'Acacia', 1, 1],
    ['E', 'Thanh đỡ slat', 2, L - 4, 1.2, 1, 'LVL', 1, 2],
    ['F', 'Dầm giữa', 1, L - 1.2, 3, 1.4, 'LVL', 1, 2],
    ['G', 'Chân đỡ giữa', 2, 9, 2.2, 2.2, 'Acacia', .85, 1],
    ['H', 'Slat cuộn (dây felt)', mw > 70 ? 12 : 12, W - 3.4, 2.8, .55, 'LVL', 1, 2],
    ['J', 'Nêm kusabi', 8, 2.6, .9, .55, 'Acacia', 1, 1]];
  if (hb) parts.push(['I', 'Headboard (ốp tiles + lưng ply)', 1, W - 5.2, 28, .8, 'Acacia/Ply', .9, 2], ['I2', 'Nẹp đỉnh headboard', 1, W + .4, 2, 1.1, 'Acacia', 1, 2], ['K', 'Núm vặn tay M8', 2, 1.6, 1.6, .8, 'Thép/nylon', 0, 2]);
  const dens = { Acacia: .65, LVL: .55, 'Acacia/Ply': .6, 'Thép/nylon': 0 };
  return parts.map(p => ({ code: p[0], name: p[1], qty: p[2], l: p[3], w: p[4], t: p[5], mat: p[6], box: p[8], lb: p[0] === 'K' ? .3 : p[2] * p[3] * p[4] * p[5] * p[7] * 0.016387 * dens[p[6]] * 2.2046 }));
}
function cartons(size, hb) {
  const B = bom(size, hb), w = n => B.filter(p => p.box === n).reduce((s, p) => s + p.lb, 0);
  if (!hb) { const t = B.reduce((s, p) => s + p.lb, 0) + 8; return [{ n: 'Thùng duy nhất', items: 'A, B, C, D, E, F, G, H, J', dims: `88 × ${size === 'Queen' ? 12 : 14} × 10 in`, lb: t }]; }
  return [{ n: 'Thùng 1 · Khung', items: 'A, B, C, D, G, J', dims: '90 × 12 × 9 in', lb: w(1) + 6 }, { n: 'Thùng 2 · Headboard & slat', items: 'E, F, H, I, I2, K', dims: `84 × ${size === 'Queen' ? 30 : 31} × 8 in`, lb: w(2) + 7 }];
}

INIT.proposal = function () {
  let st = { hb: 'geo', size: 'King', color: 'medium' };
  const cv = viewer($('#cfgViewer'), { mode: 'studio', headboard: 'geo', color: 'medium', view: 'three' });
  function upd() {
    const price = PRICE[st.hb][st.size], b = bom(st.size, st.hb !== 'none'), lb = b.reduce((s, p) => s + p.lb, 0), ct = cartons(st.size, st.hb !== 'none');
    const W = (st.size === 'Queen' ? 60 : 76) + 1 + 2.2 + 2.4, Lg = 81 + 2.2 + 2.4;
    $('#cfgPrice').textContent = '$' + price; $('#cfgColorName').textContent = cname(st.color);
    $('#cfgBox').textContent = ct.length + ' thùng · ~' + Math.round(ct.reduce((s, c) => s + c.lb, 0)) + ' lb';
    $('#cfgSpec').innerHTML = [['Kích thước', `${W.toFixed(1)}" × ${Lg.toFixed(1)}" × ${st.hb === 'none' ? 14 : 48}"H`], ['Ray / gầm', '14" mặt ray · gầm 9.25"'], ['Nệm', st.size === 'King' ? '76 × 80" · không cần box spring' : '60 × 80" · không cần box spring'], ['Trọng lượng', `~${Math.round(lb)} lb (ước tính)`], ['Lắp ráp', '5 bước · < 10 phút · 0 dụng cụ'], ['Ốc vít khung', '0 · 8 nêm gỗ' + (st.hb === 'none' ? '' : ' · 2 núm vặn tay')], ['Tải trọng', '1.000 lb (mục tiêu)']].map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
  }
  seg('#cfgHb', 'hb', v => { st.hb = v; cv && cv.set('headboard', v); upd(); });
  seg('#cfgSize', 's', v => { st.size = v; cv && cv.set('size', v); upd(); });
  seg('#cfgMode', 'm', v => { cv && cv.set('mode', v); });
  seg('#cfgView', 'cv', v => cv && cv.setView(v));
  swatches($('#cfgSw'), 'medium', c => { st.color = c; cv && cv.set('color', c); upd(); });
  upd();
  $('#variants').innerHTML = [['life_geo.jpg', 'Option 1 · Geometric Panel', 'Tấm ốp ghép hình học, vân Acacia làm điểm nhấn. Hero cho Amazon & Wayfair.', 'King $499 · Queen $459'],
    ['life_diag.jpg', 'Option 2 · Diagonal Texture', 'Rãnh chéo kiểu xương cá trên 8 ô, cùng ngôn ngữ với dòng herringbone đang hot.', 'King $499 · Queen $459'],
    ['life_none.jpg', 'Kumi Low · Không đầu', 'Khung joinery thuần như Thor/Thuma, 1 thùng, phí FBA thấp, dễ chạy giá.', 'King $429 · Queen $399']]
    .map(v => `<div class="glass variant"><img src="img/render/${v[0]}" alt="${v[1]}" loading="lazy"><div class="body"><h3>${v[1]}</h3><p class="muted" style="font-size:13.5px">${v[2]}</p><span class="chip" style="justify-self:start">${v[3]}</span></div></div>`).join('');
  subtabs('#prTabs', '#v-proposal', p => PR[p] && PR[p]());
};
const PR = {};
PR.why = function () {
  const ev = [['Vì sao gỗ, không phải sắt', fmt$(D.wood_total.rev) + '/tháng', 'Sắt chiếm 43% doanh thu nhưng giá trung vị $114, bị Allewie/Zinus/NEW JETO thống trị và chịu thuế thép Section 232. Gỗ có giá trung vị $239, top 5 brand chỉ 31%.'],
    ['Vì sao joinery tool-free', '+' + pct(D.cluster.sv / D.cluster.prev - 1, 0) + ' YoY', `Tool-free đạt ${fmt$(tf.rpa)}/ASIN, cao nhất. Cụm search joinery/japanese/thuma ${fmtN(D.cluster.sv)} lượt/tháng. AFW Thor ≈ ${fmt$(thor.rev)}/tháng.`],
    ['Vì sao Acacia + headboard module', '192 ASIN Acacia', 'Acacia có giá trung vị $403 (chỉ sau Teak). Thor, Merax, Nectar dùng Hevea/Bamboo và không có headboard đẹp. Headboard module: 1 khung, 3 SKU.']];
  $('#evidence').innerHTML = ev.map(e => `<div class="glass pad" style="display:grid;gap:10px;align-content:start"><div class="eyebrow">${e[0]}</div><div class="stat"><div class="v" style="color:var(--acacia)">${e[1]}</div></div><p class="muted" style="font-size:13.5px">${e[2]}</p></div>`).join('');
  const pain = [['Gãy/nứt dầm, chân', '28% Bme · 40% AFW', 'Dầm giữa 2 chân G, mộng Acacia đặc, nêm tự siết'], ['Ốc lỏng, kêu cót két', '18% Bme', '0 ốc ở khung; nêm + đệm felt'], ['Màu lệch ảnh', '21% Bme', 'Render chuẩn màu, ghi rõ vân gỗ tự nhiên, swatch'], ['Slat cong, nệm lún', '14% Bme', 'Slat LVL 0.55", khe ≤ 3.6", dầm giữa'], ['Khe hở / sai kích thước', '10–13%', 'Headboard ôm sát nệm, dung sai ±3 mm'], ['CS / bảo hành', '31% Bme', 'Kit phụ tùng, SLA 24h, bảo hành 3 năm khung']];
  $('#tPain').innerHTML = '<thead><tr><th>Pain point đối thủ</th><th class="r">% review chê</th><th>Giải pháp Kumi</th></tr></thead><tbody>' + pain.map(s => `<tr><td><b>${s[0]}</b></td><td class="r num" style="color:${C.bad}">${s[1]}</td><td class="muted">${s[2]}</td></tr>`).join('') + '</tbody>';
  const J = [['Thuma · The Bed', 'Mộng trượt kiểu Nhật, 2 núm vặn tay', 'Rubberwood tái chế', '< 10 phút · 0 dụng cụ', '$1,095 Q / $1,195 K', 'Chuẩn trải nghiệm, giá rất cao, có bảo hộ kiểu dáng nên cần tránh copy.'],
    ['AFW Thor', 'Japanese joinery, slat LVL dán velcro', 'Hevea solid', '15–20 phút · 0 dụng cụ', '$299–380', 'Bán rất tốt, không headboard. Review chê dầm nứt, slat cong, velcro kêu.'],
    ['Merax (Thuma-style)', 'Chân chỉnh dáng né kiểu dáng Thuma', 'Bamboo', '~30 phút · ít ốc', '$330–378', 'Ranking tốt, vật liệu bị xem là rẻ.'],
    ['Nectar Bamboo', 'Chân nổi, khoá không dụng cụ', 'Bamboo', 'Easy tool-free', '$394 Q / $494 K', '1 ASIN ≈ $158K/tháng.'],
    ['Kusabi (nêm gỗ) · đề xuất', 'Mộng xuyên + nêm khoá', 'Acacia', '5–10 phút · tay không', '—', 'Tự siết khi chịu tải, tháo được khi chuyển nhà. Dùng cho 4 góc Kumi.'],
    ['Cam-lock ẩn + chốt gỗ · dự phòng', 'Chốt định vị, cam ¼ vòng', 'Mọi loại gỗ', '10 phút · 1 lục giác', '—', 'Dự phòng nếu mộng nêm làm FOB tăng quá nhiều.']];
  $('#tJoinery').innerHTML = '<thead><tr><th>Hệ khớp</th><th>Cơ chế</th><th>Vật liệu</th><th>Lắp ráp</th><th>Giá</th><th>Nhận xét</th></tr></thead><tbody>' + J.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="muted">${r[2]}</td><td class="muted">${r[3]}</td><td class="num">${r[4]}</td><td class="muted">${r[5]}</td></tr>`).join('') + '</tbody>';
};
PR.refs = function () {
  const R = [['Thuma · The Bed', 'https://www.thuma.co/products/the-bed', null, 'DTC · $1,095–1,195 · chuẩn joinery tool-free'],
    ['AFW Thor King (Walnut)', 'https://www.amazon.com/dp/B0FNVZTBPG', thor.pics[0], 'Joinery Hevea · $380 · ≈ $58K/tháng'],
    ['Merax Thuma-style King', 'https://www.amazon.com/dp/B0DFC8SZTB', 'B0DFC8SZTB', 'Bamboo · $378 · ≈ $82K/tháng'],
    ['Nectar Bamboo Queen', 'https://www.amazon.com/dp/B0DT4WC3LF', 'B0DT4WC3LF', 'Tool-free · $394 · ≈ $158K/tháng'],
    ['Bme Vivian (Acacia)', 'https://www.amazon.com/dp/B0B3MQTGL1', 'B0B3MQTGL1', 'Acacia + headboard · $362 · ≈ $114K/tháng'],
    ['Bme Georgina', 'https://www.amazon.com/dp/' + D.lines.find(l => l.line === 'Georgina').rep, D.lines.find(l => l.line === 'Georgina').pics[0], 'Acacia headboard cao · $456–669'],
    ['Cozyman Camas (Acacia)', 'https://www.amazon.com/dp/B0FMRMK8FK', 'B0FMRMK8FK', 'Acacia + headboard · $352'],
    ['mopio Ted (Acacia)', 'https://www.amazon.com/dp/B0CJ4S6RNW', 'B0CJ4S6RNW', 'Mid-century Acacia · $297'],
    ['Acacia Emery King', 'https://www.amazon.com/dp/B08B7P68K8', 'B08B7P68K8', 'Acacia headboard · $391'],
    ['Zinus Allen', 'https://www.amazon.com/dp/B095W72PK1', 'B095W72PK1', 'Mid-century wood · $332 · ≈ $102K/tháng'],
    ['ZINUS Vivek', 'https://www.amazon.com/dp/B072DY2MHK', 'B072DY2MHK', 'Wood + headboard · $266 · #1 gỗ'],
    ['LIFEMENT Classic', 'https://www.amazon.com/dp/B0DX4DTKFD', 'B0DX4DTKFD', 'Wood headboard · $248 · ≈ $130K/tháng']];
  $('#refs').innerHTML = R.map(r => { const id = r[2] && byAsin[r[2]] ? byAsin[r[2]].img : r[2]; return `<a class="ref" href="${r[1]}" target="_blank" rel="noopener"><div class="im">${id ? img(id, r[0], 300) : '<div class="ph-img">T</div>'}</div><div><b>${r[0]}</b><span>${r[3]}</span><span style="color:var(--acacia)">Mở ↗</span></div></a>`; }).join('');
};
PR.price = function () {
  const LAD = [['Thuma (DTC)', 1095, 1195], ['Kumi · headboard', 459, 499], ['Kumi Low · không đầu', 399, 429], ['Bme Georgina', 456, 669], ['Bme Vivian', 396, 486], ['Nectar Bamboo', 394, 494], ['AFW Loki', 429, 559], ['AFW Thor', 340, 380], ['Merax Thuma-style', 330, 378]];
  mk('cLadder', { type: 'bar', data: { labels: LAD.map(l => l[0]), datasets: [{ label: 'Queen / giá thấp', data: LAD.map(l => l[1]), backgroundColor: LAD.map(l => l[0].startsWith('Kumi') ? C.acacia2 : C.grey), borderRadius: 5 }, { label: 'King / giá cao', data: LAD.map(l => l[2]), backgroundColor: LAD.map(l => l[0].startsWith('Kumi') ? C.acacia : '#8b7e72'), borderRadius: 5 }] }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.raw } } }, scales: { x: { ticks: { callback: v => '$' + v }, grid: { color: grid } }, y: noGrid } } });
  const PRE = { hb: { pK: 499, pQ: 459, fK: 150, fQ: 135, fba: '110/104' }, none: { pK: 429, pQ: 399, fK: 105, fQ: 95, fba: '62/58' } };
  let ue = 'hb';
  const set = v => { ue = v; Object.entries(PRE[v]).forEach(([k, x]) => { $('#' + k).value = x; }); calc(); };
  function calc() {
    const g = id => parseFloat($('#' + id).value) || 0;
    const [fK, fQ] = ($('#fba').value || '0/0').split('/').map(x => parseFloat(x) || 0);
    const res = [['King', g('pK'), g('fK'), fK], ['Queen', g('pQ'), g('fQ'), fQ || fK]].map(([n, p, fob, fba]) => {
      const net = p * (1 - g('disc') / 100), ref = net * g('ref') / 100, ads = net * g('ads') / 100, ret = net * g('ret') / 100, landed = fob + g('frt') + fob * g('duty') / 100;
      const gp = net - ref - fba - ret - landed, cm = gp - ads, maxFob = (net - ref - fba - ret - g('frt') - net * .25) / (1 + g('duty') / 100);
      return { n, net, ref, fba, ads, ret, landed, gp, cm, gpm: gp / net, cmp: cm / net, maxFob };
    });
    $('#calcRes').innerHTML = res.map(o => `<div class="glass pad"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h4>${o.n}</h4><span style="text-align:right"><span style="font-family:var(--f-display);font-weight:800;font-size:28px;color:${o.gpm >= .25 ? C.good : o.gpm >= .15 ? '#a8781c' : C.bad}">${pct(o.gpm)}</span><br><span class="faint" style="font-size:11px">GPM trước ads</span></span></div>
      <div class="wf"><div><span>Giá sau giảm</span><span>$${o.net.toFixed(0)}</span></div><div><span>Referral</span><span>−$${o.ref.toFixed(0)}</span></div><div><span>FBA</span><span>−$${o.fba.toFixed(0)}</span></div><div><span>Hoàn/hư</span><span>−$${o.ret.toFixed(0)}</span></div><div><span>Landed (FOB+cước+thuế)</span><span>−$${o.landed.toFixed(0)}</span></div><div><b>Gross profit</b><b>$${o.gp.toFixed(0)}</b></div><div><span>Ads</span><span>−$${o.ads.toFixed(0)}</span></div><div style="border:0"><b>Sau ads</b><b style="color:${o.cm > 0 ? C.good : C.bad}">$${o.cm.toFixed(0)} · ${pct(o.cmp)}</b></div></div>
      <p class="cap">FOB tối đa để GPM đạt 25%: <b style="color:var(--acacia)">$${Math.max(0, o.maxFob).toFixed(0)}</b></p></div>`).join('') +
      `<div class="dark pad" style="grid-column:1/-1;display:flex;gap:28px;flex-wrap:wrap"><div class="stat"><div class="v">${fmt$(g('vol') * (res[0].net + res[1].net) / 2)}</div><div class="l">Doanh thu/tháng tại ${fmtN(g('vol'))} đơn</div></div><div class="stat"><div class="v">${fmt$(g('vol') * (res[0].cm + res[1].cm) / 2)}</div><div class="l">Lợi nhuận sau ads/tháng</div></div><div class="stat"><div class="v">${fmt$(g('vol') * (res[0].net + res[1].net) / 2 * 12)}</div><div class="l">Run-rate năm</div></div></div>`;
    $('#calcNote').innerHTML = ue === 'hb' ? `Bản có headboard đi <b>2 thùng (~155 lb)</b>, phí FBA cao, nên với FOB tạm $${g('fK')} GPM King là <b>${pct(res[0].gpm, 0)}</b>. Để đạt 25% cần FOB King ≤ <b>$${Math.max(0, res[0].maxFob).toFixed(0)}</b>, hoặc bán FBM/SFP, hoặc qua Wayfair CastleGate.` : `Bản không đầu đi <b>1 thùng (~98 lb)</b>, phí FBA chỉ khoảng $58–62. Đây là SKU kéo traffic và biên tốt: FOB King ≤ <b>$${Math.max(0, res[0].maxFob).toFixed(0)}</b> là đạt GPM 25%.`;
  }
  seg('#ueVar', 'u', set);
  $$('.calc input').forEach(i => i.addEventListener('input', calc));
  set('hb');
  const SC = [['Thận trọng', 60, '≈ AFW Loki: dòng mới, ít review.'], ['Cơ sở', 180, '≈ Bme Vivian: Acacia + headboard có review tốt, cộng bản không đầu.'], ['Tích cực', 360, '≈ 55% AFW Thor: joinery hero, có cả bản headboard và không đầu.']];
  $('#scen').innerHTML = SC.map((s, i) => `<div class="glass pad" style="${i === 1 ? 'border-color:rgba(181,118,63,.6)' : ''}"><div class="eyebrow">${s[0]}</div><div class="stat" style="margin-top:8px"><div class="v">${fmt$(s[1] * 440)}</div><div class="l">${s[1]} đơn/tháng · giá TB sau giảm ≈ $440</div><div class="s">≈ ${fmt$(s[1] * 440 * 12)}/năm</div></div><p class="muted" style="font-size:13px;margin-top:10px">${s[2]}</p></div>`).join('');
};
PR.plan = function () {
  const RD = [['Q1', 'Mẫu & FOB', 'Khung Kumi + 2 headboard + bản Low; test lắp < 10 phút, tải 1.000 lb, ISTA 3A'], ['Q2', 'Launch Amazon', '6 SKU, Vine + coupon, PPC cụm joinery/japanese/thuma'], ['Q2–Q3', 'Wayfair', 'CastleGate, chung ảnh 3D & packaging'], ['Q3', 'Mở rộng', 'Diagonal + màu Caramel, Natural, Walnut, Dark Chocolate'], ['Q4', 'Bedroom set', 'Nightstand → bench → dresser cùng ngôn ngữ Kumi']];
  $('#tRoad').innerHTML = '<thead><tr><th>Mốc</th><th>Hạng mục</th><th>Nội dung</th></tr></thead><tbody>' + RD.map(r => `<tr><td class="num">${r[0]}</td><td><b>${r[1]}</b></td><td class="muted">${r[2]}</td></tr>`).join('') + '</tbody>';
  const RK = [['FOB Acacia cao → GPM thấp', 'Bảng unit economics, 2–3 nhà máy; slat/dầm LVL; dự phòng cam-lock'], ['Hàng nặng → phí FBA cao', 'Bản Low 1 thùng; bản headboard cân nhắc FBM/SFP hoặc CastleGate'], ['Kiểu dáng giống Thuma', 'Chân và headboard thiết kế riêng, tra design patent trước khi chốt mẫu'], ['Đối thủ ra mẫu tương tự', 'Tốc độ launch, review, A+ 3D và video lắp ráp'], ['Thuế thay đổi', 'Theo dõi HTS 9403.50; gỗ không bọc nệm hiện ngoài Section 232']];
  $('#tRisk').innerHTML = '<tbody>' + RK.map(r => `<tr><td><b>${r[0]}</b></td><td class="muted">${r[1]}</td></tr>`).join('') + '</tbody>';
};

// =====================================================================
INIT.build = function () {
  const STEPS = [
    ['Mở hộp', 'Mọi chi tiết in mã A–K. Bày ra sàn theo hình trên nắp thùng.', 0],
    ['Dựng 4 chân + ray đầu/cuối', 'Cắm mộng dương của ray C vào lỗ mộng trên chân A và cột B. Không dụng cụ.', 2],
    ['Trượt ray dọc, thả nêm', 'Luồn ray D xuyên qua chân, thả 8 nêm kusabi J và ấn tay. Nêm tự siết khi giường chịu tải.', 2],
    ['Đặt dầm giữa + 2 chân đỡ', 'Đặt dầm F vào khấc trên ray C, cắm 2 chân G.', 1],
    ['Trải slat cuộn', 'Mở cuộn slat H (nối dây felt) từ đầu xuống cuối; slat tự khớp vào thanh đỡ E.', 1.5],
    ['Gắn headboard', 'Trượt tấm I vào rãnh 2 cột B, siết 2 núm vặn tay K.', 1.5],
    ['Đặt nệm, xong', 'Không cần box spring. Tổng thời gian dưới 10 phút.', 1]];
  let hb = 'geo', cur = 0, timer = null;
  const av = viewer($('#asmStage'), { mode: 'assembly', headboard: 'geo', color: 'light', view: 'asm' });
  function steps() { return hb === 'none' ? STEPS.map((s, i) => i === 5 ? ['Kiểm tra & cân chỉnh', 'Lắc thử 4 góc; nêm tự siết. Bản không đầu không có headboard.', .5] : s) : STEPS; }
  function render() {
    const S = steps();
    $('#asmSteps').innerHTML = S.map((s, i) => `<button class="${i === cur ? 'on' : i < cur ? 'done' : ''}" data-i="${i}"><span class="n">${i < cur ? '✓' : i}</span><span><b>${s[0]}</b><span class="d">${s[1]}</span></span></button>`).join('');
    $('#asmEyebrow').textContent = `Bước ${cur} / ${S.length - 1}`; $('#asmTitle').textContent = S[cur][0];
    $('#cWedge').textContent = cur >= 2 ? 8 : 0;
    const t = S.slice(0, cur + 1).reduce((s, x) => s + x[2], 0); $('#cTime').textContent = (t % 1 ? t.toFixed(1) : t) + "'";
    $('#asmPrev').disabled = cur === 0; $('#asmNext').disabled = cur === S.length - 1;
  }
  function go(n) { cur = Math.max(0, Math.min(steps().length - 1, n)); av && av.setStep(cur); render(); }
  $('#asmNext').addEventListener('click', () => go(cur + 1));
  $('#asmPrev').addEventListener('click', () => go(cur - 1));
  $('#asmReset').addEventListener('click', () => { stop(); go(0); });
  $('#asmSteps').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stop(); go(+b.dataset.i); } });
  const stop = () => { clearInterval(timer); timer = null; $('#asmPlay').textContent = '▶ Tự chạy'; };
  $('#asmPlay').addEventListener('click', () => { if (timer) return stop(); if (cur >= steps().length - 1) go(0); $('#asmPlay').textContent = '❚❚ Dừng'; timer = setInterval(() => { if (cur >= steps().length - 1) return stop(); go(cur + 1); }, 2300); });
  seg('#asmHb', 'hb', v => { hb = v; if (av) { av.set('headboard', v); } go(cur); });
  if (av) av.setStep(0);
  render();
  subtabs('#buTabs', '#v-build', p => { if (p === 'drawings') DR.init(); if (p === 'bom') BOMV.init(); });
};

// ---------- technical drawings (SVG) ----------
const DR = { size: 'King', hb: true };
DR.init = function () { seg('#drSize', 's', v => { DR.size = v; DR.draw(); }); seg('#drHb', 'hb', v => { DR.hb = v === '1'; DR.draw(); }); DR.draw(); };
DR.draw = function () {
  const mw = DR.size === 'Queen' ? 60 : 76, iw = mw + 1, il = 81, rt = 1.1, W = iw + 2 * rt, L = il + 2 * rt, ov = 1.2, Wo = W + 2 * ov, Lo = L + 2 * ov, top = 14, rh = 4.75, leg = 2.8, H = DR.hb ? 48 : top;
  const mm = v => Math.round(v * 25.4);
  const ST = `<style>.o{fill:none;stroke:#3b2e25;stroke-width:1.4}.f{fill:#e9d5b8;stroke:#3b2e25;stroke-width:1.2}.f2{fill:#d9bd98;stroke:#3b2e25;stroke-width:1.2}.h{fill:none;stroke:#8b7e72;stroke-width:1;stroke-dasharray:5 4}.d{stroke:#b5763f;stroke-width:1;fill:none}.t{font:600 11px "Be Vietnam Pro",sans-serif;fill:#b5763f}.n{font:500 10.5px "Be Vietnam Pro",sans-serif;fill:#5c5047}.ti{font:700 12px "Roboto Slab",serif;fill:#3b2e25}.m{fill:#f4f1ec;stroke:#8b7e72;stroke-width:1;stroke-dasharray:4 3}</style><defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#b5763f"/></marker></defs>`;
  const dimH = (x1, x2, y, label, ext0, s) => `<line class="d" x1="${x1}" y1="${ext0}" x2="${x1}" y2="${y + 4}"/><line class="d" x1="${x2}" y1="${ext0}" x2="${x2}" y2="${y + 4}"/><line class="d" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#ar)" marker-end="url(#ar)"/><text class="t" x="${(x1 + x2) / 2}" y="${y - 5}" text-anchor="middle">${label}</text>`;
  const dimV = (y1, y2, x, label, ext0) => `<line class="d" x1="${ext0}" y1="${y1}" x2="${x + 4}" y2="${y1}"/><line class="d" x1="${ext0}" y1="${y2}" x2="${x + 4}" y2="${y2}"/><line class="d" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" marker-start="url(#ar)" marker-end="url(#ar)"/><text class="t" x="${x - 6}" y="${(y1 + y2) / 2}" text-anchor="end" dominant-baseline="middle">${label}</text>`;
  const lab = (v) => `${(+v.toFixed(2))}" (${mm(v)})`;
  // FRONT
  { const s = 6.4, ox = 90, gy = 380, X = v => ox + v * s, Y = v => gy - v * s; let g = '';
    if (DR.hb) { g += `<rect class="f2" x="${X(leg)}" y="${Y(47)}" width="${(Wo - 2 * ov - 2 * leg) * s}" height="${28 * s}"/>`; const pw = (Wo - 2 * ov - 2 * leg);
      [0.22, .47, .71].forEach((c, i) => { const c2 = [.27, .41, .77][i]; g += `<line class="o" x1="${X(leg + pw * c)}" y1="${Y(19)}" x2="${X(leg + pw * c2)}" y2="${Y(33)}"/>`; const c3 = [.27, .41, .77][i], c4 = [.21, .55, .70][i]; g += `<line class="o" x1="${X(leg + pw * c3)}" y1="${Y(33)}" x2="${X(leg + pw * c4)}" y2="${Y(47)}"/>`; });
      g += `<line class="o" x1="${X(leg)}" y1="${Y(33)}" x2="${X(leg + pw)}" y2="${Y(33)}"/><rect class="f" x="${X(ov - .2)}" y="${Y(48)}" width="${(W + .4) * s}" height="${1.1 * s}"/>`;
      g += `<rect class="f" x="${X(ov)}" y="${Y(48)}" width="${leg * s}" height="${48 * s}"/><rect class="f" x="${X(Wo - ov - leg)}" y="${Y(48)}" width="${leg * s}" height="${48 * s}"/>`; }
    else { g += `<polygon class="f" points="${X(ov)},${Y(top)} ${X(ov + leg)},${Y(top)} ${X(ov + leg * .9)},${Y(0)} ${X(ov + leg * .1)},${Y(0)}"/><polygon class="f" points="${X(Wo - ov - leg)},${Y(top)} ${X(Wo - ov)},${Y(top)} ${X(Wo - ov - leg * .1)},${Y(0)} ${X(Wo - ov - leg * .9)},${Y(0)}"/>`; }
    g += `<rect class="m" x="${X(ov + rt + .5)}" y="${Y(top + 9.4)}" width="${mw * s}" height="${10 * s}"/><text class="n" x="${X(Wo / 2)}" y="${Y(top + 4.4)}" text-anchor="middle">Nệm ${mw}×80" (tham khảo)</text>`;
    g += `<rect class="f" x="${X(0)}" y="${Y(top)}" width="${Wo * s}" height="${rh * s}"/>`;
    g += `<polygon class="f" points="${X(ov)},${Y(top - rh)} ${X(ov + leg)},${Y(top - rh)} ${X(ov + leg * .9)},${Y(0)} ${X(ov + leg * .1)},${Y(0)}"/><polygon class="f" points="${X(Wo - ov - leg)},${Y(top - rh)} ${X(Wo - ov)},${Y(top - rh)} ${X(Wo - ov - leg * .1)},${Y(0)} ${X(Wo - ov - leg * .9)},${Y(0)}"/>`;
    g += `<rect class="h" x="${X(Wo / 2 - 1.1)}" y="${Y(9)}" width="${2.2 * s}" height="${9 * s}"/>`;
    g += `<line class="o" x1="${X(-6)}" y1="${gy}" x2="${X(Wo + 6)}" y2="${gy}" style="stroke-width:.8"/>`;
    g += dimH(X(0), X(Wo), gy + 52, 'Tổng rộng ' + lab(Wo), gy + 4);
    g += dimH(X(ov + rt), X(Wo - ov - rt), gy + 24, 'Lòng ' + lab(iw), Y(top - rh) + 2);
    g += dimV(Y(top), gy, X(-2), lab(top), X(0) - 2) + dimV(Y(top - rh), gy, X(Wo / 2 + 6), 'Gầm ' + lab(top - rh), X(Wo / 2 + 2));
    if (DR.hb) g += dimV(Y(48), gy, X(Wo + 8), lab(48), X(Wo - ov));
    $('#dwFront').innerHTML = `<svg viewBox="0 0 ${Math.max(X(Wo + 16), 640)} ${gy + 70}" role="img" aria-label="Hình chiếu đứng">${ST}<text class="ti" x="16" y="22">MẶT TRƯỚC · ${DR.size.toUpperCase()}</text>${g}</svg>`; }
  // SIDE
  { const s = 6, ox = 70, gy = 380, X = v => ox + v * s, Y = v => gy - v * s; let g = '';
    if (DR.hb) g += `<rect class="f" x="${X(ov)}" y="${Y(48)}" width="${leg * s}" height="${48 * s}"/><rect class="f2" x="${X(ov + leg * .3)}" y="${Y(47)}" width="${1 * s}" height="${28 * s}"/>`;
    g += `<rect class="m" x="${X(ov + rt + .5)}" y="${Y(top + 9.4)}" width="${80 * s}" height="${10 * s}"/>`;
    g += `<rect class="f" x="${X(0)}" y="${Y(top)}" width="${Lo * s}" height="${rh * s}"/>`;
    [[ov], [Lo - ov - leg]].forEach(([x]) => g += `<polygon class="f" points="${X(x)},${Y(top - rh)} ${X(x + leg)},${Y(top - rh)} ${X(x + leg * .9)},${Y(0)} ${X(x + leg * .1)},${Y(0)}"/>`);
    [Lo / 2 - il / 4, Lo / 2 + il / 4].forEach(z => g += `<rect class="h" x="${X(z - 1.1)}" y="${Y(9)}" width="${2.2 * s}" height="${9 * s}"/>`);
    g += `<rect class="h" x="${X(ov + rt)}" y="${Y(top - 2.2)}" width="${(il) * s}" height="${3 * s}"/>`;
    g += `<line class="o" x1="${X(-6)}" y1="${gy}" x2="${X(Lo + 6)}" y2="${gy}" style="stroke-width:.8"/>`;
    g += dimH(X(0), X(Lo), gy + 34, 'Tổng dài ' + lab(Lo), gy + 4) + dimH(X(ov + rt), X(Lo - ov - rt), Y(top + 9.4) - 16, 'Lòng ' + lab(il), Y(top) - 2);
    g += `<text class="n" x="${X(Lo / 2)}" y="${Y(4)}" text-anchor="middle">Dầm giữa F + 2 chân đỡ G (nét đứt)</text>`;
    g += `<circle cx="${X(Lo - ov - leg / 2)}" cy="${Y(top - rh / 2)}" r="22" class="d" style="stroke-dasharray:3 3"/><text class="t" x="${X(Lo - ov - leg / 2) + 26}" y="${Y(top) - 14}">A</text>`;
    $('#dwSide').innerHTML = `<svg viewBox="0 0 ${X(Lo + 12)} ${gy + 60}" role="img" aria-label="Hình chiếu cạnh">${ST}<text class="ti" x="16" y="22">MẶT BÊN · ${DR.size.toUpperCase()}</text>${g}</svg>`; }
  // PLAN
  { const s = 4.6, ox = 120, oy = 60, X = v => ox + v * s, Y = v => oy + v * s; let g = '';
    g += `<rect class="f" x="${X(0)}" y="${Y(ov)}" width="${Wo * s}" height="${rt * s}"/><rect class="f" x="${X(0)}" y="${Y(Lo - ov - rt)}" width="${Wo * s}" height="${rt * s}"/>`;
    g += `<rect class="f" x="${X(ov)}" y="${Y(0)}" width="${rt * s}" height="${Lo * s}"/><rect class="f" x="${X(Wo - ov - rt)}" y="${Y(0)}" width="${rt * s}" height="${Lo * s}"/>`;
    const nS = 12, gap = (il - nS * 2.8) / (nS + 1);
    for (let i = 0; i < nS; i++) { const z = ov + rt + gap + i * (2.8 + gap); g += `<rect class="f2" x="${X(ov + rt + .4)}" y="${Y(z)}" width="${(iw - .8) * s}" height="${2.8 * s}"/>`; }
    g += `<rect class="h" x="${X(Wo / 2 - .7)}" y="${Y(ov + rt)}" width="${1.4 * s}" height="${il * s}"/>`;
    [[ov, ov], [Wo - ov - leg, ov], [ov, Lo - ov - leg], [Wo - ov - leg, Lo - ov - leg]].forEach(([x, z]) => g += `<rect class="o" x="${X(x)}" y="${Y(z)}" width="${leg * s}" height="${leg * s}" style="fill:#c9a57c"/>`);
    g += dimH(X(0), X(Wo), Y(Lo) + 30, 'Tổng rộng ' + lab(Wo), Y(Lo) + 2) + dimV(Y(0), Y(Lo), X(-4), lab(Lo), X(0) - 2);
    g += `<text class="n" x="${X(Wo + 4)}" y="${Y(ov + rt + gap + 1.4)}">H · 12 slat 2.8" × 0.55" (LVL), khe ~${gap.toFixed(1)}"</text><text class="n" x="${X(Wo + 4)}" y="${Y(Lo / 2)}">F · dầm giữa</text><text class="n" x="${X(Wo + 4)}" y="${Y(Lo - ov)}">Chân 2.8" vuông</text><text class="n" x="${X(Wo + 4)}" y="${Y(4)}">ĐẦU GIƯỜNG ↑</text>`;
    $('#dwPlan').innerHTML = `<svg viewBox="0 0 ${X(Wo + 60)} ${Y(Lo) + 60}" role="img" aria-label="Mặt bằng">${ST}<text class="ti" x="16" y="22">MẶT BẰNG · ${DR.size.toUpperCase()}</text>${g}</svg>`; }
  // JOINT (oblique exploded)
  { const S = 16, P = (x, y, z) => [260 + (x + z * .55) * S, 330 - (y + z * .35) * S];
    const box = (x, y, z, w, h, d, cls, lbl) => { const p = [[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z], [x, y, z + d], [x + w, y, z + d], [x + w, y + h, z + d], [x, y + h, z + d]].map(q => P(...q));
      const f = (ids, c) => `<polygon class="${c}" points="${ids.map(i => p[i].join(',')).join(' ')}"/>`;
      return f([0, 1, 2, 3], cls) + f([3, 2, 6, 7], 'f2') + f([1, 5, 6, 2], cls === 'f' ? 'f2' : cls); };
    let g = '';
    g += box(-1.4, 0, -1.4, 2.8, 12, 2.8, 'f');
    g += `<polygon class="o" style="fill:#5a3f2a" points="${[P(-1.4, 7.4, -.55), P(-1.4, 10.8, -.55), P(-1.4, 10.8, .55), P(-1.4, 7.4, .55)].map(q => q.join(',')).join(' ')}"/>`;
    g += box(-14, 7.25, -.55, 9, 4.75, 1.1, 'f') + box(-5, 7.85, -.4, 2.6, 3.6, .8, 'f2');
    g += box(-.55, 7.25, 3.6, 1.1, 4.75, 9, 'f');
    g += box(-.3, 15, -.3, .55, 2.6, .9, 'f');
    g += `<line class="d" x1="${P(0, 14.6, 0)[0]}" y1="${P(0, 14.6, 0)[1]}" x2="${P(0, 12.3, 0)[0]}" y2="${P(0, 12.3, 0)[1]}" marker-end="url(#ar)"/>`;
    g += `<line class="d" x1="${P(-4.6, 9.6, 0)[0]}" y1="${P(-4.6, 9.6, 0)[1]}" x2="${P(-2.2, 9.6, 0)[0]}" y2="${P(-2.2, 9.6, 0)[1]}" marker-end="url(#ar)"/>`;
    g += `<line class="d" x1="${P(0, 9.6, 3.2)[0]}" y1="${P(0, 9.6, 3.2)[1]}" x2="${P(0, 9.6, 1.8)[0]}" y2="${P(0, 9.6, 1.8)[1]}" marker-end="url(#ar)"/>`;
    const call = (x, y, z, tx, ty, t1, t2) => { const q = P(x, y, z); return `<line x1="${q[0]}" y1="${q[1]}" x2="${tx}" y2="${ty}" stroke="#8b7e72" stroke-width=".8"/><circle cx="${q[0]}" cy="${q[1]}" r="2.5" fill="#b5763f"/><text class="ti" x="${tx + 4}" y="${ty - 2}" style="font-size:11px">${t1}</text><text class="n" x="${tx + 4}" y="${ty + 12}">${t2}</text>`; };
    g += call(.1, 16.5, 0, 330, 40, 'J · Nêm kusabi', 'Acacia 2.6×0.9×0.55", ấn tay');
    g += call(-1.4, 9, 0, 40, 60, 'Lỗ mộng xuyên trên chân', '1.1 × 3.6", sâu 2.8"');
    g += call(-9, 7.25, 0, 40, 262, 'C · Ray đầu/cuối', 'Mộng dương 2.6" có rãnh nêm');
    g += call(0, 9, 10, 360, 300, 'D · Ray dọc', 'Mộng xuyên, khoá bằng nêm J');
    g += call(1.4, 2, 1.4, 360, 230, 'A · Chân 2.8" vuông', 'Thu côn 82%, đệm felt đáy');
    g += `<text class="n" x="16" y="388">Không ốc, không keo ở mối lắp. Đệm felt 1 mm ở mặt tiếp xúc để chống cót két.</text>`;
    $('#dwJoint').innerHTML = `<svg viewBox="0 0 640 400" role="img" aria-label="Chi tiết mộng góc">${ST}<text class="ti" x="16" y="22">CHI TIẾT A · GÓC CHÂN (EXPLODED)</text>${g}</svg>`; }
};

const BOMV = { hb: true };
BOMV.init = function () { seg('#bomHb', 'hb', v => { BOMV.hb = v === '1'; BOMV.draw(); }); BOMV.draw(); };
BOMV.draw = function () {
  const B = bom('King', BOMV.hb), tot = B.reduce((s, p) => s + p.lb, 0);
  $('#tBom').innerHTML = '<thead><tr><th>Mã</th><th>Chi tiết</th><th class="r">SL</th><th class="r">Kích thước (in)</th><th>Vật liệu</th><th class="r">Thùng</th><th class="r">lb</th></tr></thead><tbody>' +
    B.map(p => `<tr><td class="mono"><b>${p.code}</b></td><td>${p.name}</td><td class="r num">${p.qty}</td><td class="r num">${p.l.toFixed(1)} × ${p.w} × ${p.t}</td><td class="muted">${p.mat}</td><td class="r num">${BOMV.hb ? p.box : 1}</td><td class="r num">${p.lb.toFixed(1)}</td></tr>`).join('') +
    `<tr><td></td><td><b>Tổng (chưa gồm bao bì)</b></td><td class="r num"><b>${B.reduce((s, p) => s + p.qty, 0)}</b></td><td></td><td></td><td></td><td class="r num"><b>${tot.toFixed(0)}</b></td></tr><tr><td></td><td class="muted">Ốc vít khung</td><td class="r num" style="color:${C.good}"><b>0</b></td><td colspan="4" class="muted">Không keo ở mối lắp, không dụng cụ</td></tr></tbody>`;
  const ct = cartons('King', BOMV.hb);
  $('#cartons').innerHTML = ct.map(c => `<div class="glass pad"><div class="eyebrow">${c.n}</div><div class="stat" style="margin-top:6px"><div class="v">~${Math.round(c.lb)} lb</div><div class="l">${c.dims} · gồm ${c.items}</div></div><p class="cap">FBA Extra-large (dài < 96", nặng < 150 lb). Phí FBA ước tính ${c.lb > 80 ? '$60–70' : '$52–60'}/thùng.</p></div>`).join('') +
    `<div class="dark pad"><div class="stat"><div class="v">${ct.length} thùng · ~${Math.round(ct.reduce((s, c) => s + c.lb, 0))} lb</div><div class="l">${BOMV.hb ? 'Nặng ngang Bme Vivian/Georgina (106–121 lb sản phẩm). Đây là lý do nên có thêm bản Kumi Low 1 thùng.' : 'Một thùng, gần Merax (85 lb) và Thor (64 lb + bao bì). Phí FBA thấp nhất.'}</div></div></div>`;
};

route();
})();
