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
  const hv = viewer($('#heroViewer'), { mode: 'lifestyle', headboard: 'cane', color: 'medium', autoRotate: true, view: 'hero' });
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
  // ---- collection share
  const COL = window.COLL || [];
  const collPie = (b, id) => { const X = COL.filter(c => c.b === b && c.rev > 0).sort((a, c) => c.rev - a.rev); const top = X.slice(0, 9), other = X.slice(9).reduce((s, c) => s + c.rev, 0); const tot = X.reduce((s, c) => s + c.rev, 0);
    const lab = top.map(c => c.line + (c.cat !== 'Bedroom' ? ' · ' + c.cat.split(' ')[0] : '')).concat(other ? ['Khác'] : []), dat = top.map(c => c.rev).concat(other ? [other] : []);
    mk(id, { type: 'doughnut', data: { labels: lab, datasets: [{ data: dat, backgroundColor: dat.map((_, i) => PAL[i % PAL.length]), borderWidth: 2, borderColor: '#f5f1ea' }] }, options: { cutout: '55%', plugins: { legend: { position: 'right', labels: { font: { size: 10.5 } } }, tooltip: { callbacks: { label: c => c.label + ': ' + fmt$(c.raw) + ' · ' + pct(c.raw / tot) } } } } }); };
  collPie('AllForWood', 'cCollAFW'); collPie('Bme', 'cCollBME');
  const cats2 = ['Bedroom', 'Kitchen / DIY tabletop', 'Living & Dining storage', 'Living room', 'Dining'];
  const lines2 = [...new Set(COL.filter(c => cats2.includes(c.cat) && c.rev > 3000).map(c => c.b.slice(0, 3) + ' ' + c.line))];
  mk('cCollCat', { type: 'bar', data: { labels: cats2.map(c => c.split(' ')[0]), datasets: lines2.map((l, i) => ({ label: l, data: cats2.map(cat => { const tot = COL.filter(c => c.cat === cat).reduce((s, c) => s + c.rev, 0); const v = COL.filter(c => c.cat === cat && (c.b.slice(0, 3) + ' ' + c.line) === l).reduce((s, c) => s + c.rev, 0); return tot ? +(v / tot * 100).toFixed(1) : 0; }), backgroundColor: (l.startsWith('All') ? ['#b5763f', '#d39a5c', '#e7c49a', '#8b5a36', '#c9a57c'] : ['#4f7a6c', '#8ea089', '#6d8fa8', '#6f6a4c', '#a9bfb3', '#3d5f55', '#c3cfbf'])[i % 5] })) },
    options: { indexAxis: 'y', plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + '%' } } }, scales: { x: { stacked: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: grid } }, y: { stacked: true, grid: { display: false } } } } });
  // ---- trend (needs window.TREND from Helium 10 Xray)
  const TR = window.TREND;
  if (!TR) { $('#trendBlock').insertAdjacentHTML('beforebegin', '<div class="glass pad pending" style="margin-bottom:12px"><b>Đang chờ dữ liệu Helium 10 Xray</b><p class="muted" style="font-size:13px;margin-top:4px">Trendline theo category và collection sẽ hiện ở đây sau khi cào xong sales theo ngày của từng ASIN.</p></div>'); }
  else {
    $('#trendSrc').textContent = TR.src;
    let tb = 'AllForWood', tm = 'abs';
    const agg = (b, keyFn) => { const S = {}; Object.entries(TR.asin).forEach(([a, arr]) => { const m = AMAP[a]; if (!m || m[0] !== b) return; const k = keyFn(m); S[k] = S[k] || TR.months.map(() => 0); arr.forEach((v, i) => S[k][i] += v || 0); }); return S; };
    const drawT = () => {
      const C1 = agg(tb, m => m[1]); const ks = Object.keys(C1).sort((a, c) => C1[c].reduce((s, v) => s + v, 0) - C1[a].reduce((s, v) => s + v, 0)).slice(0, 6);
      mk('cCatTrend', { type: 'line', data: { labels: TR.months, datasets: ks.map((k, i) => ({ label: k, data: C1[k], borderColor: PAL[i], backgroundColor: PAL[i] + '33', fill: false, tension: .3, pointRadius: 0, borderWidth: 2 })) }, options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: moneyAxis, x: { grid: { display: false }, ticks: { maxTicksLimit: 10, maxRotation: 0 } } } } });
      const C2 = agg(tb, m => m[1] === 'Bedroom' ? m[2] : m[2] + ' · ' + m[1].split(' ')[0]); const k2 = Object.keys(C2).sort((a, c) => C2[c].reduce((s, v) => s + v, 0) - C2[a].reduce((s, v) => s + v, 0)).slice(0, 8);
      const tot = TR.months.map((_, i) => k2.reduce((s, k) => s + C2[k][i], 0));
      mk('cCollTrend', { type: 'line', data: { labels: TR.months, datasets: k2.map((k, i) => ({ label: k, data: tm === 'abs' ? C2[k] : C2[k].map((v, j) => tot[j] ? +(v / tot[j] * 100).toFixed(1) : 0), borderColor: PAL[i % PAL.length], backgroundColor: PAL[i % PAL.length] + (tm === 'share' ? 'cc' : '33'), fill: tm === 'share', tension: .3, pointRadius: 0, borderWidth: tm === 'share' ? 1 : 2 })) },
        options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (tm === 'abs' ? fmt$(c.raw) : c.raw + '%') } } }, scales: { y: tm === 'abs' ? moneyAxis : { stacked: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: grid } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10, maxRotation: 0 } } } } });
    };
    seg('#tcBrand', 'b', v => { tb = v; drawT(); }); seg('#tcMode', 'm', v => { tm = v; drawT(); }); drawT();
  }
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
      ${(() => { const rv = (window.RVC || []).find(r => r.b === l.brand && r.l === l.line && r.t === 'Bed frame'); return `<div class="grid g2" style="margin-top:12px"><div class="pros"><b style="color:var(--good)">Khách khen${rv ? ' · ' + rv.n + ' review' : ''}</b><p style="margin-top:6px">${rv ? rv.g : v(l.good)}</p></div><div class="cons"><b style="color:var(--bad)">Khách chê</b><p style="margin-top:6px">${rv ? rv.bd : v(l.bad)}</p></div></div>${rv && rv.im !== '—' ? `<p class="insight" style="margin-top:10px;font-size:13px"><b>Lignarc làm tốt hơn:</b> ${rv.im}</p>` : ''}`; })()}
      ${l.note ? `<p class="insight" style="margin-top:12px;font-size:13px">${esc(l.note)}</p>` : ''}`;
    mk('cLineSize', { type: 'bar', data: { labels: Object.keys(l.szrev), datasets: [{ data: Object.values(l.szrev), backgroundColor: lc(l), borderRadius: 5 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) } } }, scales: { y: moneyAxis, x: noGrid } } });
  }
  $('#lineCards').addEventListener('click', e => { const b = e.target.closest('.lc'); if (!b) return; cur = b.dataset.k; cards(); detail(); if (innerWidth < 1020) $('#lineDetail').scrollIntoView({ behavior: 'smooth' }); });
  seg('#lineFilter', 'f', x => { f = x; const first = L.find(l => f === 'all' || l.brand === f); cur = first.brand + '|' + first.line; cards(); detail(); });
  cards(); detail();
  subtabs('#bdTabs', '#v-beds', p => {
    if (p === 'book') BOOK.init();
    if (p === 'charts') {
      mk('cLines', { type: 'bar', data: { labels: L.map(l => l.line), datasets: [{ data: L.map(l => l.rev), backgroundColor: L.map(lc), borderRadius: 5 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => L[c.dataIndex].brand + ' · ' + fmt$(c.raw) } } }, scales: { x: moneyAxis, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
      const LP = L.filter(l => l.pmin);
      mk('cLinePrice', { type: 'bar', data: { labels: LP.map(l => l.line), datasets: [{ data: LP.map(l => [l.pmin, l.pmax === l.pmin ? l.pmax + 4 : l.pmax]), backgroundColor: LP.map(l => lc(l)), borderRadius: 20, borderSkipped: false, barThickness: 9 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '$' + LP[c.dataIndex].pmin + ' – $' + LP[c.dataIndex].pmax } } }, scales: { x: { min: 150, max: 950, ticks: { callback: v => '$' + v }, grid: { color: grid } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
      const sz = ['Twin', 'Full', 'Queen', 'King'];
      mk('cBedSize', { type: 'bar', data: { labels: sz, datasets: ['AllForWood', 'Bme'].map(b => ({ label: b, data: sz.map(s => D.bed_size[b][s]), backgroundColor: bc[b], borderRadius: 6 })) }, options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt$(c.raw) } } }, scales: { y: moneyAxis, x: noGrid } } });
    }
    if (p === 'reviews') {
      const RC = (window.RVC || []), RB = window.RVB || {};
      const bed = RC.filter(r => r.t === 'Bed frame').sort((x, y) => y.n - x.n);
      $('#revMeta').innerHTML = `Phân tích <b>${fmtN(RC.reduce((s, r) => s + r.n, 0))}</b> review không trùng của ${RC.length} collection (trong đó <b>${fmtN(bed.reduce((s, r) => s + r.n, 0))}</b> review giường), cào từ Amazon 10/2026: mới nhất, lọc 1–3★ và review hữu ích nhất. Mẫu có chủ đích lấy nhiều review chê, nên tỷ lệ chê ở đây cao hơn rating thật.`;
      const TH = Object.keys((RB.Bme || {}).pain || {}).filter(t => ((RB.Bme.pain[t] || 0) + ((RB.AllForWood || {}).pain || {})[t]) > 0).sort((x, y) => (RB.Bme.pain[y] / RB.Bme.nc + (RB.AllForWood.pain[y] || 0) / RB.AllForWood.nc) - (RB.Bme.pain[x] / RB.Bme.nc + (RB.AllForWood.pain[x] || 0) / RB.AllForWood.nc));
      mk('cPain', { type: 'bar', data: { labels: TH, datasets: ['AllForWood', 'Bme'].map(b => ({ label: `${b} (${RB[b].nc} review chê)`, data: TH.map(t => +((RB[b].pain[t] || 0) / RB[b].nc * 100).toFixed(1)), backgroundColor: bc[b], borderRadius: 4 })) }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + '%' } } }, scales: { x: { ticks: { callback: v => v + '%' }, grid: { color: grid } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } } } });
      const GT = ['Chắc chắn', 'Gỗ thật / chất lượng', 'Đẹp / sang', 'Dễ lắp', 'Đáng tiền', 'Êm, không kêu'];
      mk('cAspect', { type: 'bar', data: { labels: bed.slice(0, 10).map(r => r.l), datasets: GT.map((g, i) => ({ label: g, data: bed.slice(0, 10).map(r => r.good[g] || 0), backgroundColor: PAL[i], borderRadius: 3 })) }, options: { indexAxis: 'y', plugins: { legend: { labels: { font: { size: 10 } } } }, scales: { x: { stacked: true, grid: { color: grid } }, y: { stacked: true, grid: { display: false } } } } });
      const PT = ['Gãy/nứt kết cấu', 'Lung lay / kêu cót két', 'Màu lệch ảnh', 'Trầy/hư khi nhận', 'Sai kích thước / khe hở', 'Góc nhô va chân', 'CS / bảo hành'];
      mk('cPainColl', { type: 'bar', data: { labels: bed.slice(0, 10).map(r => r.l), datasets: PT.map((g, i) => ({ label: g, data: bed.slice(0, 10).map(r => r.pain[g] || 0), backgroundColor: ['#b04c37', '#d39a5c', '#c9a57c', '#8b7e72', '#6d8fa8', '#6f6a4c', '#3b2e25'][i], borderRadius: 3 })) }, options: { indexAxis: 'y', plugins: { legend: { labels: { font: { size: 10 } } } }, scales: { x: { stacked: true, grid: { color: grid } }, y: { stacked: true, grid: { display: false } } } } });
      const rows = RC.slice().sort((x, y) => (x.t === 'Bed frame' ? 0 : 1) - (y.t === 'Bed frame' ? 0 : 1) || y.n - x.n);
      $('#tReviewInsight').innerHTML = '<thead><tr><th>Collection</th><th class="r">Review</th><th>Điểm tốt</th><th>Điểm xấu</th><th>Lignarc cần làm tốt hơn</th></tr></thead><tbody>' + rows.map(r => `<tr><td><b>${r.l}</b><br><span class="chip ${r.b === 'Bme' ? 'bme' : 'afw'}">${r.b}</span> <span class="faint" style="font-size:11.5px">${r.t}</span></td><td class="r num">${r.n}<br><span class="faint" style="font-size:11px">${r.nc} chê</span></td><td style="color:${C.good};font-size:13px">${r.g}</td><td style="color:${C.bad};font-size:13px">${r.bd}</td><td style="font-size:13px">${r.im}</td></tr>`).join('') + '</tbody>';
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
  if (hb) parts.push(['I', 'Headboard module (4 tấm trượt rãnh)', 4, (W - 5.2) / 2, 14, .75, 'Acacia/Ply', .9, 2], ['I2', 'Nẹp đỉnh headboard', 1, W + .4, 2, 1.1, 'Acacia', 1, 2], ['K', 'Núm vặn tay M8', 2, 1.6, 1.6, .8, 'Thép/nylon', 0, 2]);
  const dens = { Acacia: .65, LVL: .55, 'Acacia/Ply': .6, 'Thép/nylon': 0 };
  return parts.map(p => ({ code: p[0], name: p[1], qty: p[2], l: p[3], w: p[4], t: p[5], mat: p[6], box: p[8], lb: p[0] === 'K' ? .3 : p[2] * p[3] * p[4] * p[5] * p[7] * 0.016387 * dens[p[6]] * 2.2046 }));
}
function cartons(size, hb) {
  const k = size + '|' + (hb ? 'hb' : 'none'), pk = PACK[k];
  return [{ n: 'Thùng duy nhất (FBA)', items: hb ? 'A, B, C, D, E, F, G, H, I (4 module), I2, J, K' : 'A, B, C, D, E, F, G, H, J', dims: pk.box.join(' × ') + ' in', lb: pk.lb }];
}

// =====================================================================
// Kumi variants, packaging (1 box) and economics engine (shared by Specs/FOB Target + Unit economics)
const HB = [
  ['geo', 'Geometric Panel', 'Tấm ốp Acacia ghép hình học (4 module)', 'std'],
  ['diag', 'Diagonal Texture', 'Rãnh chéo xương cá trên 8 ô', 'std'],
  ['panel', 'Classic Panel', 'Tấm liền bo góc, rãnh ngang (kiểu Thuma)', 'std'],
  ['fabric', 'Wood + Fabric', 'Khung gỗ + 2 gối foam bọc linen tháo được', 'prem'],
  ['cane', 'Rattan mắt cáo', 'Khung gỗ + mây đan mắt cáo 3 ô', 'prem'],
  ['arch', 'Arch Cane', 'Vòm gỗ uốn + mây mắt cáo, chân trụ tròn', 'prem'],
  ['spindle', 'Spindle', 'Thanh tròn tiện, mid-century', 'std'],
  ['papercord', 'Paper Cord', 'Dây giấy đan dọc, nẹp ngang', 'prem'],
  ['rope', 'Rope Weave', 'Dây thừng/bản vải đan bản to', 'prem'],
  ['none', 'Kumi Low · không đầu', 'Khung joinery thuần, 1 thùng gọn nhất', 'low']];
const HBN = Object.fromEntries(HB.map(h => [h[0], h[1]]));
const PRICE2 = { std: { King: 499, Queen: 459 }, prem: { King: 549, Queen: 509 }, low: { King: 429, Queen: 399 } };
const priceOf = (hb, size) => (hb === 'panel' ? { King: 479, Queen: 439 } : PRICE2[(HB.find(h => h[0] === hb) || [])[3] || 'std'])[size];
// one-box packaging per variant (inches / lb), all ≤ 96" longest side and ≤ 150 lb
const PACK = {
  'King|hb': { box: [88, 16, 9], lb: 133 }, 'Queen|hb': { box: [88, 15, 8], lb: 118 },
  'King|none': { box: [88, 12, 8], lb: 92 }, 'Queen|none': { box: [88, 11, 7], lb: 82 }
};
const CONT = 68; // usable m3 in a 40'HC (of 76.4 m3)
const cbm = b => b[0] * b[1] * b[2] * 1.6387e-5;
function fbaFee(lb, box) { // US FBA, extra-large tier (longest side > 59"), non-peak 2026; billable = max(actual, dim/139)
  const w = Math.ceil(Math.max(lb, box[0] * box[1] * box[2] / 139));
  const f = w <= 50 ? 26.33 + .38 * Math.max(0, w - 1) : w <= 70 ? 37.32 + .75 * Math.max(0, w - 51) : w <= 150 ? 51.32 + .75 * Math.max(0, w - 71) : 194.95 + .19 * Math.max(0, w - 151);
  return { fee: f, bill: w };
}
const ECON = {
  g: { freight: 8500, duty: 25, coupon: 5, ads: 10, ret: 3, fuel: 3.5, stor: .56, months: 2, wfCost: 50, dda: 2.5, coop: 0, wfShip: 0 },
  rows: {
    'King|hb': { fob: 150, price: 499, wf: 749, load: null }, 'Queen|hb': { fob: 135, price: 459, wf: 689, load: null },
    'King|none': { fob: 105, price: 429, wf: 649, load: null }, 'Queen|none': { fob: 95, price: 399, wf: 599, load: null }
  }
};
Object.keys(ECON.rows).forEach(k => { ECON.rows[k].load = Math.floor(CONT / cbm(PACK[k].box)); ECON.rows[k].box = PACK[k].box.slice(); ECON.rows[k].lb = PACK[k].lb; });
const econListeners = [];
const econChanged = () => econListeners.forEach(f => f());
function calcRow(k) {
  const g = ECON.g, r = ECON.rows[k];
  const freight = g.freight / Math.max(1, r.load), duty = r.fob * g.duty / 100, cogs = r.fob + duty + freight;
  // Amazon
  const net = r.price * (1 - g.coupon / 100);
  const ref = Math.min(net, 200) * .15 + Math.max(0, net - 200) * .10;
  const fb = fbaFee(r.lb, r.box), fuel = fb.fee * g.fuel / 100, cuft = r.box[0] * r.box[1] * r.box[2] / 1728, stor = cuft * g.stor * g.months, ret = net * g.ret / 100;
  const amzFees = ref + fb.fee + fuel + stor + ret, gp = net - amzFees - cogs, ads = net * g.ads / 100;
  const amz = { net, ref, fba: fb.fee, bill: fb.bill, fuel, stor, ret, cuft, ads, gp, gpm: gp / net, cm: gp - ads, cmp: (gp - ads) / net, maxFob: (net - amzFees - freight - net * .25) / (1 + g.duty / 100) };
  // Wayfair: cost (revenue to Lignarc) = wfCost% of Wayfair retail; DDA = % of cost
  const cost = r.wf * g.wfCost / 100, dda = cost * g.dda / 100, coop = cost * g.coop / 100, ship = g.wfShip;
  const wgp = cost - dda - coop - ship - cogs;
  const wf = { cost, dda, coop, ship, gp: wgp, gpm: wgp / cost, maxFob: (cost - dda - coop - ship - freight - cost * .25) / (1 + g.duty / 100) };
  return { k, r, freight, duty, cogs, amz, wf, cbm: cbm(r.box) };
}

function rebuildPrice() { }
INIT.proposal = function () {
  let st = { hb: 'cane', size: 'King', color: 'medium', legs: 'cross', drawers: false };
  const cv = viewer($('#cfgViewer'), { mode: 'studio', headboard: st.hb, color: st.color, legs: st.legs, view: 'three' });
  $('#cfgHb').innerHTML = HB.map(h => `<button data-hb="${h[0]}" class="${h[0] === st.hb ? 'on' : ''}">${h[1].replace('Kumi Low · ', '')}</button>`).join('');
  function upd() {
    const k = st.size + '|' + (st.hb === 'none' ? 'none' : 'hb'), pk = PACK[k];
    const price = priceOf(st.hb, st.size) + (st.drawers ? 149 : 0);
    const W = (st.size === 'Queen' ? 60 : 76) + 1 + 2.2, Lg = 81 + 2.2;
    $('#cfgPrice').textContent = '$' + price; $('#cfgColorName').textContent = cname(st.color);
    $('#cfgBox').textContent = `1 thùng · ${pk.box.join('×')}" · ~${pk.lb} lb`;
    const H = (HB.find(h => h[0] === st.hb) || [])[2];
    $('#cfgSpec').innerHTML = [['Phiên bản', HBN[st.hb] + ' · ' + H], ['Chân', { cross: 'Chữ thập vuông, mộng xuyên + nêm âm', round: 'Trụ tròn Ø2.9", chốt tròn xuyên', floating: 'Chân lùi 5" dưới ray, cảm giác "nổi"' }[st.legs]], ['Kích thước', `${W.toFixed(1)}" × ${Lg.toFixed(1)}" × ${st.hb === 'none' ? 14 : st.hb === 'arch' ? 51 : 48}"H`], ['Ray / gầm', '14" mặt ray · gầm 9.25"' + (st.drawers ? ' · vừa 2 hộc kéo 7.5"' : '')], ['Lắp ráp', '5 bước · < 10 phút · 0 dụng cụ · 0 ốc khung'], ['Đóng gói', `1 thùng ${pk.box.join(' × ')}" · ${cbm(pk.box).toFixed(3)} m³ · ~${pk.lb} lb`], ['Tải trọng', '1.000 lb (mục tiêu)']].map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
  }
  seg('#cfgHb', 'hb', v => { st.hb = v; cv && cv.set('headboard', v); upd(); });
  seg('#cfgLeg', 'l', v => { st.legs = v; cv && cv.set('legs', v); upd(); });
  seg('#cfgSize', 's', v => { st.size = v; cv && cv.set('size', v); upd(); });
  seg('#cfgDr', 'd', v => { st.drawers = v === '1'; cv && cv.set('drawers', st.drawers); upd(); });
  seg('#cfgMode', 'm', v => cv && cv.set('mode', v));
  seg('#cfgView', 'cv', v => cv && cv.setView(v));
  swatches($('#cfgSw'), st.color, c => { st.color = c; cv && cv.set('color', c); upd(); });
  upd();
  PR.select = (hb, legs) => { st.hb = hb; st.legs = legs || st.legs; $$('#cfgHb button').forEach(b => b.classList.toggle('on', b.dataset.hb === hb)); $$('#cfgLeg button').forEach(b => b.classList.toggle('on', b.dataset.l === st.legs)); if (cv) { cv.set('legs', st.legs); cv.set('headboard', hb); } upd(); $('#prTabs [data-p=config]').click(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  subtabs('#prTabs', '#v-proposal', p => PR[p] && PR[p]());
};
const PR = {};
PR.ideas = function () {
  const I = [
    ['geo', 'cross', 'o_geo', 'Tấm Acacia ghép 8 mảnh hình học; 4 module trượt vào rãnh cột.', ['Acacia', 'Hero'], 'std'],
    ['diag', 'cross', 'o_diag', 'Rãnh chéo CNC xương cá, cùng ngôn ngữ dòng herringbone đang hot.', ['Acacia', 'CNC'], 'std'],
    ['panel', 'cross', 'o_panel', 'Tấm liền bo góc, rãnh ngang; giá dễ chốt, sản xuất đơn giản nhất.', ['Tối giản', 'Thuma-like'], 'std'],
    ['fabric', 'cross', 'o_fabric', '2 gối foam bọc linen gài vào khung bằng thanh trượt; thay vải được.', ['Fabric', 'Êm'], 'prem'],
    ['cane', 'cross', 'o_cane', 'Mây mắt cáo căng trên khung, 3 ô; nhẹ, thoáng, đúng trend Japandi.', ['Rattan', 'Đề xuất mẫu'], 'prem'],
    ['arch', 'round', 'o_arch', 'Vòm gỗ uốn + mây mắt cáo, chân trụ tròn; dòng statement cho Wayfair.', ['Rattan', 'Trụ tròn'], 'prem'],
    ['spindle', 'round', 'o_spindle', 'Thanh tròn tiện cắm mộng vào 2 thanh ngang; mid-century.', ['Mid-century'], 'std'],
    ['papercord', 'cross', 'o_papercord', 'Dây giấy đan dọc quanh 2 thanh ngang; texture ấm, nhẹ.', ['Paper cord'], 'prem'],
    ['rope', 'round', 'o_rope', 'Bản dây thừng đan to bản vắt qua thanh tròn; boho cao cấp.', ['Rope'], 'prem'],
    ['none', 'cross', 'o_none_cross', 'Kumi Low chân chữ thập: SKU kéo traffic, 1 thùng 92 lb.', ['Không đầu', '1 thùng'], 'low'],
    ['none', 'round', 'o_none_round', 'Kumi Low chân trụ tròn: mềm mại hơn, hợp phòng Scandinavian.', ['Không đầu', 'Trụ tròn'], 'low'],
    ['none', 'floating', 'o_none_float', 'Kumi Float: chân lùi vào trong + 2 hộc kéo gầm có bánh xe.', ['Không đầu', 'Storage'], 'low']];
  $('#ideas').innerHTML = I.map((x, i) => `<button class="idea" data-i="${i}"><img src="img/render/${x[2]}.jpg" alt="${HBN[x[0]]}" loading="lazy"><div class="b"><h4>${x[0] === 'none' ? ({ cross: 'Kumi Low · chữ thập', round: 'Kumi Low · trụ tròn', floating: 'Kumi Float + hộc kéo' })[x[1]] : HBN[x[0]]}</h4><p>${x[3]}</p><div class="tags">${x[4].map(t => `<span class="chip">${t}</span>`).join('')}<span class="chip good">King $${x[0] === 'none' ? 429 : priceOf(x[0], 'King')}</span></div></div></button>`).join('');
  $('#ideas').addEventListener('click', e => { const b = e.target.closest('.idea'); if (!b) return; const x = I[+b.dataset.i]; PR.select(x[0], x[1]); });
};
PR.why = function () {
  const ev = [['Vì sao gỗ, không phải sắt', fmt$(D.wood_total.rev) + '/tháng', 'Sắt chiếm 43% doanh thu nhưng giá trung vị $114, bị Allewie/Zinus/NEW JETO thống trị và chịu thuế thép Section 232. Gỗ có giá trung vị $239, top 5 brand chỉ 31%.'],
    ['Vì sao joinery tool-free', '+' + pct(D.cluster.sv / D.cluster.prev - 1, 0) + ' YoY', `Tool-free đạt ${fmt$(tf.rpa)}/ASIN, cao nhất. Cụm search joinery/japanese/thuma ${fmtN(D.cluster.sv)} lượt/tháng. AFW Thor ≈ ${fmt$(thor.rev)}/tháng.`],
    ['Vì sao headboard module', '1 khung · 10 đầu', 'Thor, Merax, Nectar dùng Hevea/Bamboo và không có headboard đẹp. Headboard module trượt vào cột: thêm SKU mà không thêm khuôn khung, vẫn đi 1 thùng.']];
  $('#evidence').innerHTML = ev.map(e => `<div class="glass pad" style="display:grid;gap:10px;align-content:start"><div class="eyebrow">${e[0]}</div><div class="stat"><div class="v" style="color:var(--acacia)">${e[1]}</div></div><p class="muted" style="font-size:13.5px">${e[2]}</p></div>`).join('');
  const RB = window.RVB, sh = t => RB ? `${pct((RB.Bme.pain[t] || 0) / RB.Bme.nc, 0)} Bme · ${pct((RB.AllForWood.pain[t] || 0) / RB.AllForWood.nc, 0)} AFW` : '';
  const SOL = { 'Gãy/nứt kết cấu': 'Mộng Acacia đặc + nêm; dầm giữa 2 chân, không treo vào headboard; không dán keo ở mối chịu lực', 'Lung lay / kêu cót két': '0 ốc ở khung; nêm tự siết khi chịu tải; đệm felt mọi điểm gỗ chạm gỗ', 'Màu lệch ảnh': 'Màu theo lô ΔE ≤ 2, render/ảnh chuẩn màu, swatch miễn phí', 'Trầy/hư khi nhận': 'Mút góc + vách ngăn trong 1 thùng, test rơi ISTA 3A', 'Sai kích thước / khe hở': 'Dưỡng kiểm lòng khung trước khi đóng thùng, dung sai ±3 mm', 'Góc nhô va chân': 'Mộng âm trong chân, góc bo R10, chân đỡ nằm trong lòng khung', 'CS / bảo hành': 'Kit phụ tùng gửi trong 48h, SLA 24h, bảo hành 3 năm khung', 'Thiếu / sai phụ kiện': 'Chỉ 3 loại linh kiện rời (nêm, núm, chân đỡ), checklist đóng gói', 'Nêm/mộng/keo yếu': 'Nêm côn 1:12 dung sai ±0.3 mm, test lắp tay 20 bộ' };
  const pain = RB ? Object.keys(SOL).map(t => [t, sh(t), SOL[t]]) : [['Gãy/nứt dầm, chân', '28% Bme · 40% AFW', 'Dầm giữa 2 chân G, mộng Acacia đặc, nêm tự siết'], ['Ốc lỏng, kêu cót két', '18% Bme', '0 ốc ở khung; nêm + đệm felt'], ['Màu lệch ảnh', '21% Bme', 'Render chuẩn màu, swatch'], ['Slat cong, nệm lún', '14% Bme', 'Slat LVL, khe ≤ 3"'], ['CS / bảo hành', '31% Bme', 'Kit phụ tùng, SLA 24h']];
  $('#tPain').innerHTML = '<thead><tr><th>Pain point đối thủ</th><th class="r">% review chê</th><th>Giải pháp Kumi</th></tr></thead><tbody>' + pain.map(s => `<tr><td><b>${s[0]}</b></td><td class="r num" style="color:${C.bad}">${s[1]}</td><td class="muted">${s[2]}</td></tr>`).join('') + '</tbody>';
  const J = [['Thuma · The Bed', 'Mộng trượt kiểu Nhật, 2 núm vặn tay', 'Rubberwood tái chế', '< 10 phút · 0 dụng cụ', '$1,095 Q / $1,195 K', 'Chuẩn trải nghiệm, giá rất cao, có bảo hộ kiểu dáng nên tránh copy.'],
    ['AFW Thor', 'Japanese joinery + nêm, slat LVL dán velcro', 'Hevea solid', '15–20 phút · 0 dụng cụ', '$299–380', 'Review: nêm khó đóng, phải chà/búa; dầm giữa nứt, velcro kêu.'],
    ['Merax (Thuma-style)', 'Chân chỉnh dáng', 'Bamboo', '~30 phút · ít ốc', '$330–378', 'Ranking tốt, vật liệu bị xem là rẻ.'],
    ['Nectar Bamboo', 'Chân nổi, khoá không dụng cụ', 'Bamboo', 'Easy tool-free', '$394 Q / $494 K', '1 ASIN ≈ $158K/tháng.'],
    ['Kumi · mộng xuyên + nêm âm', 'Nêm vát côn 1:12, đầu nêm âm trong chân', 'Acacia', '5–10 phút · tay không', '—', 'Sửa lỗi của Thor: nêm côn + dung sai ±0.3 mm nên ấn tay vào được, không lồi khỏi chân.'],
    ['Kumi · chân trụ tròn', 'Chốt tròn Ø1.1" xuyên chân + nêm', 'Acacia', '5–10 phút', '—', 'Mềm mại, hợp Scandinavian/Japandi; tiện CNC đồng loạt.'],
    ['Cam-lock ẩn · dự phòng', 'Chốt định vị + cam ¼ vòng', 'Mọi loại gỗ', '10 phút · 1 lục giác', '—', 'Dùng nếu mộng nêm làm FOB tăng quá nhiều.']];
  $('#tJoinery').innerHTML = '<thead><tr><th>Hệ khớp</th><th>Cơ chế</th><th>Vật liệu</th><th>Lắp ráp</th><th>Giá</th><th>Nhận xét</th></tr></thead><tbody>' + J.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="muted">${r[2]}</td><td class="muted">${r[3]}</td><td class="num">${r[4]}</td><td class="muted">${r[5]}</td></tr>`).join('') + '</tbody>';
};
PR.refs = function () {
  const R = [['Thuma · Classic Bed', 'https://www.thuma.co/products/the-bed', null, 'DTC · $1,095–1,195 · headboard + cushion'],
    ['AFW Thor King (Walnut)', 'https://www.amazon.com/dp/B0FNVZTBPG', thor.pics[0], 'Joinery Hevea · $380 · ≈ $58K/tháng'],
    ['Merax Thuma-style King', 'https://www.amazon.com/dp/B0DFC8SZTB', 'B0DFC8SZTB', 'Bamboo · $378 · ≈ $82K/tháng'],
    ['Nectar Bamboo Queen', 'https://www.amazon.com/dp/B0DT4WC3LF', 'B0DT4WC3LF', 'Tool-free · $394 · ≈ $158K/tháng'],
    ['Bme Vivian (Acacia)', 'https://www.amazon.com/dp/B0B3MQTGL1', 'B0B3MQTGL1', 'Acacia + headboard · $362 · ≈ $114K/tháng'],
    ['Bme Selina (paper cord)', 'https://www.amazon.com/dp/' + D.lines.find(l => l.line === 'Selina').rep, D.lines.find(l => l.line === 'Selina').pics[0], 'Paper cord headboard · $473–626'],
    ['Bme Georgina', 'https://www.amazon.com/dp/' + D.lines.find(l => l.line === 'Georgina').rep, D.lines.find(l => l.line === 'Georgina').pics[0], 'Acacia headboard cao · $456–669'],
    ['Cozyman Camas (Acacia)', 'https://www.amazon.com/dp/B0FMRMK8FK', 'B0FMRMK8FK', 'Acacia + headboard · $352'],
    ['mopio Ted (Acacia)', 'https://www.amazon.com/dp/B0CJ4S6RNW', 'B0CJ4S6RNW', 'Mid-century Acacia · $297'],
    ['Acacia Emery King', 'https://www.amazon.com/dp/B08B7P68K8', 'B08B7P68K8', 'Acacia headboard · $391'],
    ['Zinus Allen', 'https://www.amazon.com/dp/B095W72PK1', 'B095W72PK1', 'Mid-century wood · $332 · ≈ $102K/tháng'],
    ['LIFEMENT Classic', 'https://www.amazon.com/dp/B0DX4DTKFD', 'B0DX4DTKFD', 'Wood headboard · $248 · ≈ $130K/tháng']];
  $('#refs').innerHTML = R.map(r => { const id = r[2] && byAsin[r[2]] ? byAsin[r[2]].img : r[2]; return `<a class="ref" href="${r[1]}" target="_blank" rel="noopener"><div class="im">${id ? img(id, r[0], 300) : '<div class="ph-img">T</div>'}</div><div><b>${r[0]}</b><span>${r[3]}</span><span style="color:var(--acacia)">Mở ↗</span></div></a>`; }).join('');
};
const ROWS = [['King|hb', 'King · có headboard'], ['Queen|hb', 'Queen · có headboard'], ['King|none', 'King · không đầu'], ['Queen|none', 'Queen · không đầu']];
const money = v => (v < 0 ? '−$' : '$') + Math.abs(v).toFixed(2);
const inp = (path, v, step) => `<input type="number" step="${step || 1}" value="${v}" data-path="${path}">`;
function bindInputs(root) {
  root.addEventListener('input', e => { const t = e.target; if (!t.dataset.path) return; const [a, b, c] = t.dataset.path.split('.'); const val = parseFloat(t.value); if (isNaN(val)) return;
    if (a === 'g') ECON.g[b] = val; else if (c === 'box0' || c === 'box1' || c === 'box2') ECON.rows[b].box[+c.slice(3)] = val; else ECON.rows[b][c] = val;
    econChanged(t); });
}
PR.specs = function () {
  const must = [['Kích thước', 'King: nệm 76×80"; Queen: nệm 60×80". Dung sai lòng khung +1" để vừa mọi nệm US.'], ['Chiều cao', 'Mặt ray 14", gầm ≥ 9" (vừa hộc kéo, robot hút bụi)'], ['Vật liệu', 'Acacia solid (chân, ray, headboard); LVL/plywood CARB P2 / TSCA Title VI cho slat, dầm'], ['Kết cấu', 'Joinery: mộng xuyên + nêm, 0 ốc ở khung; dầm giữa có 2 chân đỡ'],
    ['Slat', 'Khe ≤ 3" (yêu cầu bảo hành của đa số hãng nệm), dây felt chống kêu'], ['Tải trọng', '≥ 1.000 lb tĩnh (Thor ghi 800 lb)'], ['Lắp ráp', '≤ 10 phút, 0 dụng cụ, ≤ 4 linh kiện rời'], ['Đóng gói', '1 thùng duy nhất, cạnh dài ≤ 96", ≤ 150 lb, test ISTA 3A'],
    ['Hoàn thiện', 'Sơn gốc nước low-VOC, màu đồng đều giữa lô (≤ ΔE 2)'], ['Tuân thủ', 'Nhãn xuất xứ, FSC/legal timber, Prop 65 nếu cần, tem mã chi tiết A–K']];
  const nice = [['Hộc kéo gầm Acacia có bánh xe', 'Bán kèm +$149/2 hộc, tăng AOV'], ['Headboard module đổi kiểu', 'Mua thêm headboard sau, giữ khách'], ['Chân 2 chiều cao (12/14")', 'Hợp nệm dày/mỏng'], ['Đệm felt + nút chống trượt nệm', 'Giảm review "nệm trượt"'],
    ['Gói swatch màu miễn phí', 'Giảm hoàn hàng do lệch màu'], ['QR video lắp ráp 3D', 'Giảm CS, tăng review "dễ lắp"'], ['Bảo hành 3 năm khung', 'Đối thủ 1 năm'], ['Đồng bộ nightstand / bench', 'Bán chéo trong collection']];
  $('#tMust').innerHTML = '<tbody>' + must.map(r => `<tr><td><b>${r[0]}</b></td><td class="muted">${r[1]}</td></tr>`).join('') + '</tbody>';
  $('#tNice').innerHTML = '<tbody>' + nice.map(r => `<tr><td><b>${r[0]}</b></td><td class="muted">${r[1]}</td></tr>`).join('') + '</tbody>';
  const dimsRow = k => { const r = ECON.rows[k], [s, v] = k.split('|'); const W = (s === 'Queen' ? 60 : 76) + 1 + 2.2; return [s, v === 'hb' ? 'Có headboard' : 'Không đầu', `${W.toFixed(1)} × 83.2 × ${v === 'hb' ? 48 : 14}"`, r.box.join(' × ') + '"', cbm(r.box).toFixed(3), r.lb + ' lb', fbaFee(r.lb, r.box).bill + ' lb', r.load]; };
  const drawDims = () => { $('#tDims').innerHTML = '<thead><tr><th>Size</th><th>Phiên bản</th><th>Kích thước SP (W×L×H)</th><th>Thùng (in)</th><th class="r">CBM</th><th class="r">Nặng thùng</th><th class="r">Billable FBA</th><th class="r">Pcs / 40\'HC</th></tr></thead><tbody>' + ROWS.map(([k]) => `<tr>${dimsRow(k).map((c, i) => `<td class="${i > 3 ? 'r num' : ''}">${c}</td>`).join('')}</tr>`).join('') + '</tbody>'; };
  function draw() {
    drawDims();
    $('#tFobT').innerHTML = `<thead><tr><th>Phiên bản</th><th class="r">FOB target ($)</th><th class="r">Thuế ${ECON.g.duty}%</th><th class="r">Cước/pc</th><th class="r">COGS</th><th class="r">Giá Amazon</th><th class="r">GPM Amazon</th><th class="r">FOB max (Amz 25%)</th><th class="r">Giá Wayfair</th><th class="r">GPM Wayfair</th><th class="r">FOB max (WF 30%)</th></tr></thead><tbody>` +
      ROWS.map(([k, n]) => { const c = calcRow(k), r = c.r; const wfMax = (c.wf.cost - c.wf.dda - c.wf.coop - c.wf.ship - c.freight - c.wf.cost * .30) / (1 + ECON.g.duty / 100);
        const col = v => v >= .25 ? C.good : v >= .15 ? '#a8781c' : C.bad;
        return `<tr><td><b>${n}</b></td><td class="in">${inp('r.' + k + '.fob', r.fob)}</td><td class="calc">${money(c.duty)}</td><td class="calc">${money(c.freight)}</td><td class="calc"><b>${money(c.cogs)}</b></td><td class="in">${inp('r.' + k + '.price', r.price)}</td><td class="calc"><span class="gpm" style="color:${col(c.amz.gpm)}">${pct(c.amz.gpm)}</span></td><td class="calc">${money(Math.max(0, c.amz.maxFob))}</td><td class="in">${inp('r.' + k + '.wf', r.wf)}</td><td class="calc"><span class="gpm" style="color:${col(c.wf.gpm)}">${pct(c.wf.gpm)}</span></td><td class="calc">${money(Math.max(0, wfMax))}</td></tr>`; }).join('') + '</tbody>';
    $('#fobNote').textContent = `COGS = FOB + thuế ${ECON.g.duty}% FOB + cước tàu ($${ECON.g.freight}/cont ÷ số pcs/cont). GPM Amazon tính sau referral, FBA (gồm phụ phí nhiên liệu), lưu kho, hoàn hàng; trước quảng cáo. GPM Wayfair = (Cost − DDA − COGS)/Cost, Cost = ${ECON.g.wfCost}% giá Wayfair. Sửa ô vàng để xem lại.`;
  }
  bindInputs($('#tFobT')); econListeners.push(() => { const a = document.activeElement; const p = a && a.dataset && a.dataset.path; draw(); if (p) { const el = document.querySelector(`#tFobT [data-path="${p}"]`); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } } });
  draw();
};
PR.price = function () {
  const LAD = [['Thuma (DTC)', 1095, 1195], ['Kumi premium (mây/vải/dây)', 509, 549], ['Kumi · headboard', 459, 499], ['Kumi Low · không đầu', 399, 429], ['Bme Georgina', 456, 669], ['Bme Vivian', 396, 486], ['Nectar Bamboo', 394, 494], ['AFW Loki', 429, 559], ['AFW Thor', 340, 380], ['Merax Thuma-style', 330, 378]];
  mk('cLadder', { type: 'bar', data: { labels: LAD.map(l => l[0]), datasets: [{ label: 'Queen / giá thấp', data: LAD.map(l => l[1]), backgroundColor: LAD.map(l => l[0].startsWith('Kumi') ? C.acacia2 : C.grey), borderRadius: 5 }, { label: 'King / giá cao', data: LAD.map(l => l[2]), backgroundColor: LAD.map(l => l[0].startsWith('Kumi') ? C.acacia : '#8b7e72'), borderRadius: 5 }] }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.raw } } }, scales: { x: { ticks: { callback: v => '$' + v }, grid: { color: grid } }, y: noGrid } } });
  $('#priceNotes').innerHTML = [['Standard (Geometric, Diagonal, Spindle): King $499 · Queen $459', 'Ngang Bme Vivian/Georgina, bằng ~40% Thuma.'], ['Premium (Mây, Vải, Paper cord, Rope, Arch): King $549 · Queen $509', 'Vật liệu thủ công cao hơn, hợp Wayfair.'], ['Kumi Low: King $429 · Queen $399', 'Cao hơn Thor/Merax ~$50 nhờ Acacia; 1 thùng gọn nhất.'], ['Hộc kéo gầm: +$149 / 2 hộc', 'Bán kèm, tăng AOV.']].map(n => `<p class="insight"><b>${n[0]}</b>. ${n[1]}</p>`).join('');
  let v = 'hb', pf = 'amz';
  const G = [['freight', 'Cước tàu / cont 40\'HC ($)', 50], ['duty', 'Thuế nhập khẩu (% FOB)', .5], ['coupon', 'Coupon TB (%)', .5], ['ads', 'Quảng cáo TACoS (%)', .5], ['ret', 'Hoàn / hư (% giá)', .5], ['fuel', 'Phụ phí nhiên liệu FBA (%)', .5], ['stor', 'Lưu kho ($/cu ft/tháng)', .01], ['months', 'Số tháng tồn kho TB', .5], ['wfCost', 'Wayfair cost (% giá WF)', 1], ['dda', 'Wayfair DDA (% cost)', .1], ['coop', 'Wayfair co-op (% cost)', .5], ['wfShip', 'Wayfair ship/CastleGate ($)', 1]];
  function drawG() { $('#ueGlobal').innerHTML = G.filter(x => pf === 'amz' ? !['wfCost', 'dda', 'coop', 'wfShip'].includes(x[0]) : ['freight', 'duty', 'wfCost', 'dda', 'coop', 'wfShip'].includes(x[0])).map(x => `<label>${x[1]}<input type="number" step="${x[2]}" value="${ECON.g[x[0]]}" data-path="g.${x[0]}"></label>`).join(''); }
  const FEES_A = [['ref', 'Referral (15% ≤$200, 10% phần trên)', '#b5763f'], ['fba', 'FBA fulfillment (Extra-large)', '#8b5a36'], ['fuel', 'Phụ phí nhiên liệu', '#c9a57c'], ['stor', 'Lưu kho', '#8ea089'], ['ret', 'Hoàn/hư', '#b8614a'], ['cogs', 'COGS (FOB+thuế+cước)', '#3b2e25'], ['gp', 'Lợi nhuận gộp', '#3f7d4f']];
  function draw() {
    const keys = ROWS.filter(r => r[0].endsWith('|' + v));
    const C2 = keys.map(([k, n]) => [n, calcRow(k)]);
    const cell = (val, base) => `<td class="calc">${money(val)}<small>${pct(val / base)}</small></td>`;
    if (pf === 'amz') {
      $('#tUE').innerHTML = `<thead><tr><th rowspan="2">Size</th><th class="grp" colspan="4">Logistics (sửa được)</th><th class="grp" colspan="4">Giá vốn</th><th class="grp" colspan="7">Amazon FBA · $ và % giá sau coupon</th><th class="grp" colspan="4">Kết quả</th></tr>
        <tr><th>Thùng D×R×C (in)</th><th class="r">Nặng (lb)</th><th class="r">Pcs/40'HC</th><th class="r">CBM</th><th class="r">FOB</th><th class="r">Thuế</th><th class="r">Phí vận chuyển</th><th class="r">COGS</th><th class="r">Giá bán</th><th class="r">Sau coupon</th><th class="r">Referral</th><th class="r">FBA</th><th class="r">Nhiên liệu</th><th class="r">Lưu kho</th><th class="r">Hoàn/hư</th><th class="r">Lợi nhuận gộp</th><th class="r">GPM</th><th class="r">Ads</th><th class="r">Sau ads</th></tr></thead><tbody>` +
        C2.map(([n, c]) => { const a = c.amz, k = c.k, r = c.r; return `<tr><td><b>${n.split(' · ')[0]}</b></td><td class="in" style="min-width:170px"><div style="display:flex;gap:4px">${inp('r.' + k + '.box0', r.box[0])}${inp('r.' + k + '.box1', r.box[1])}${inp('r.' + k + '.box2', r.box[2])}</div></td><td class="in">${inp('r.' + k + '.lb', r.lb)}</td><td class="in">${inp('r.' + k + '.load', r.load)}</td><td class="calc">${c.cbm.toFixed(3)}</td>
          <td class="in">${inp('r.' + k + '.fob', r.fob)}</td>${cell(c.duty, a.net)}${cell(c.freight, a.net)}<td class="calc"><b>${money(c.cogs)}</b><small>${pct(c.cogs / a.net)}</small></td><td class="in">${inp('r.' + k + '.price', r.price)}</td><td class="calc">${money(a.net)}</td>${cell(a.ref, a.net)}<td class="calc">${money(a.fba)}<small>${pct(a.fba / a.net)} · ${a.bill} lb</small></td>${cell(a.fuel, a.net)}${cell(a.stor, a.net)}${cell(a.ret, a.net)}
          <td class="calc"><b>${money(a.gp)}</b></td><td class="calc"><span class="gpm" style="color:${a.gpm >= .25 ? C.good : a.gpm >= .15 ? '#a8781c' : C.bad}">${pct(a.gpm)}</span></td>${cell(a.ads, a.net)}<td class="calc" style="color:${a.cm > 0 ? C.good : C.bad}"><b>${money(a.cm)}</b><small>${pct(a.cmp)}</small></td></tr>`; }).join('') + '</tbody>';
      $('#ueBars').innerHTML = C2.map(([n, c]) => { const a = c.amz, parts = { ref: a.ref, fba: a.fba, fuel: a.fuel, stor: a.stor, ret: a.ret, cogs: c.cogs, gp: Math.max(0, a.gp) };
        return `<div class="glass pad"><h4>${n} · cơ cấu giá $${a.net.toFixed(0)}</h4><div class="stackbar">${FEES_A.map(f => `<span style="width:${Math.max(0, parts[f[0]] / a.net * 100)}%;background:${f[2]}" title="${f[1]}">${parts[f[0]] / a.net > .06 ? pct(parts[f[0]] / a.net, 0) : ''}</span>`).join('')}</div><div class="legend">${FEES_A.map(f => `<span><i style="background:${f[2]}"></i>${f[1]} ${pct(parts[f[0]] / a.net)}</span>`).join('')}</div><p class="cap">FOB tối đa để GPM Amazon đạt 25%: <b style="color:var(--acacia)">${money(Math.max(0, a.maxFob))}</b></p></div>`; }).join('');
      $('#ueNotes').innerHTML = [`<b>Referral</b>: nội thất 15% phần giá đến $200 và 10% phần trên $200 (không phải 15% toàn bộ).`, `<b>FBA</b>: thùng có cạnh > 59" là tier Extra-large; phí tính trên cân nặng tính phí = max(cân thật, D×R×C/139). 70–150 lb: $51.32 + $0.75/lb trên 71 lb; trên 150 lb nhảy lên $194.95. Vì vậy mọi phiên bản phải gọn trong 1 thùng ≤ 150 lb.`, `<b>Phụ phí nhiên liệu & logistics</b> 3.5% trên phí FBA (từ 17/04/2026). <b>Lưu kho</b> oversize $0.56/cu ft/tháng (T1–9), $1.40 (T10–12). Inbound placement không áp cho Extra-large.`, `<b>Hoàn hàng</b>: phí returns processing chỉ tính khi tỷ lệ hoàn vượt ngưỡng ngành; ở đây đặt 3% giá như dự phòng.`].map(t => `<p class="insight" style="font-size:13px">${t}</p>`).join('');
    } else {
      $('#tUE').innerHTML = `<thead><tr><th rowspan="2">Size</th><th class="grp" colspan="3">Logistics</th><th class="grp" colspan="4">Giá vốn</th><th class="grp" colspan="5">Wayfair · $ và % trên Cost</th><th class="grp" colspan="2">Kết quả</th></tr>
        <tr><th class="r">Pcs/40'HC</th><th class="r">CBM</th><th class="r">Thùng</th><th class="r">FOB</th><th class="r">Thuế</th><th class="r">Phí vận chuyển</th><th class="r">COGS</th><th class="r">Giá Wayfair</th><th class="r">Cost (${ECON.g.wfCost}%)</th><th class="r">DDA ${ECON.g.dda}%</th><th class="r">Co-op</th><th class="r">Ship</th><th class="r">Lợi nhuận gộp</th><th class="r">GPM</th></tr></thead><tbody>` +
        C2.map(([n, c]) => { const w = c.wf, k = c.k, r = c.r; return `<tr><td><b>${n.split(' · ')[0]}</b></td><td class="in">${inp('r.' + k + '.load', r.load)}</td><td class="calc">${c.cbm.toFixed(3)}</td><td class="calc">${r.box.join('×')}</td><td class="in">${inp('r.' + k + '.fob', r.fob)}</td>${cell(c.duty, w.cost)}${cell(c.freight, w.cost)}<td class="calc"><b>${money(c.cogs)}</b><small>${pct(c.cogs / w.cost)}</small></td><td class="in">${inp('r.' + k + '.wf', r.wf)}</td><td class="calc"><b>${money(w.cost)}</b></td>${cell(w.dda, w.cost)}${cell(w.coop, w.cost)}${cell(w.ship, w.cost)}<td class="calc"><b>${money(w.gp)}</b></td><td class="calc"><span class="gpm" style="color:${w.gpm >= .3 ? C.good : w.gpm >= .2 ? '#a8781c' : C.bad}">${pct(w.gpm)}</span></td></tr>`; }).join('') + '</tbody>';
      const FW = [['dda', 'DDA', '#b5763f'], ['coop', 'Co-op', '#c9a57c'], ['ship', 'Ship', '#8ea089'], ['cogs', 'COGS', '#3b2e25'], ['gp', 'Lợi nhuận gộp', '#3f7d4f']];
      $('#ueBars').innerHTML = C2.map(([n, c]) => { const w = c.wf, parts = { dda: w.dda, coop: w.coop, ship: w.ship, cogs: c.cogs, gp: Math.max(0, w.gp) };
        return `<div class="glass pad"><h4>${n} · Cost $${w.cost.toFixed(0)} (giá WF $${c.r.wf})</h4><div class="stackbar">${FW.map(f => `<span style="width:${Math.max(0, parts[f[0]] / w.cost * 100)}%;background:${f[2]}">${parts[f[0]] / w.cost > .06 ? pct(parts[f[0]] / w.cost, 0) : ''}</span>`).join('')}</div><div class="legend">${FW.map(f => `<span><i style="background:${f[2]}"></i>${f[1]} ${pct(parts[f[0]] / w.cost)}</span>`).join('')}</div><p class="cap">FOB tối đa để GPM Wayfair đạt 30%: <b style="color:var(--acacia)">${money(Math.max(0, (w.cost - w.dda - w.coop - w.ship - c.freight - w.cost * .3) / (1 + ECON.g.duty / 100)))}</b></p></div>`; }).join('');
      $('#ueNotes').innerHTML = [`<b>Cost</b> (doanh thu Lignarc nhận) = ${ECON.g.wfCost}% giá bán Wayfair. <b>DDA</b> = ${ECON.g.dda}% trên cost.`, `<b>Co-op</b> và <b>ship</b> để 0 theo mặc định (sửa được ở trên); file Wayfair hiện tại của Lignarc đang ghi co-op 10% cost.`, `Giá Wayfair để mặc định ~1.5× giá Amazon vì Wayfair tính trên cost; chỉnh theo giá Wayfair thực tế.`].map(t => `<p class="insight" style="font-size:13px">${t}</p>`).join('');
    }
  }
  drawG(); draw();
  const refocus = () => { const a = document.activeElement, p = a && a.dataset && a.dataset.path; drawG(); draw(); if (p) { const el = document.querySelector(`#v-proposal .glass.calc [data-path="${p}"]`); if (el) { el.focus(); const t = el.value; el.value = ''; el.value = t; } } };
  bindInputs($('#v-proposal .glass.calc')); econListeners.push(refocus);
  seg('#ueVar', 'u', x => { v = x; draw(); }); seg('#uePf', 'p', x => { pf = x; drawG(); draw(); });
  const SC = [['Thận trọng', 60, '≈ AFW Loki: dòng mới, ít review.'], ['Cơ sở', 180, '≈ Bme Vivian: Acacia + headboard, review tốt, cộng bản Low.'], ['Tích cực', 360, '≈ 55% AFW Thor: joinery hero, nhiều đầu giường.']];
  $('#scen').innerHTML = SC.map((s, i) => `<div class="glass pad" style="${i === 1 ? 'border-color:rgba(181,118,63,.6)' : ''}"><div class="eyebrow">${s[0]}</div><div class="stat" style="margin-top:8px"><div class="v">${fmt$(s[1] * 450)}</div><div class="l">${s[1]} đơn/tháng · giá TB sau giảm ≈ $450</div><div class="s">≈ ${fmt$(s[1] * 450 * 12)}/năm</div></div><p class="muted" style="font-size:13px;margin-top:10px">${s[2]}</p></div>`).join('');
};
PR.collection = function () {
  const cv = viewer($('#colViewer'), { mode: 'collection', headboard: 'cane', color: 'medium', legs: 'cross', view: 'room' });
  const F = [['nightstand', 'Nightstand'], ['bench', 'Bench'], ['dresser', 'Dresser'], ['wardrobe', 'Wardrobe'], ['drawers', 'Hộc kéo']];
  $('#colFocus').innerHTML = F.map(f => `<button data-f="${f[0]}">${f[1]}</button>`).join('') + '<button data-f="all">Toàn phòng</button>';
  $('#colFocus').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !cv) return; b.dataset.f === 'all' ? cv.setView('room') : cv.focus(b.dataset.f); });
  $('#colPlay').addEventListener('click', () => { if (!cv) return; cv.setView('room'); cv.playCollection(700); });
  if (cv) setTimeout(() => cv.playCollection(650), 900);
  const T = [['Q1 2027', 'Kumi Bed', 'o_cane', 'Khung joinery + 10 đầu giường, King/Queen. Hero kéo traffic.', '$399–549', 'Đang đề xuất'],
    ['Q2 2027', 'Kumi Nightstand', 'p_nightstand', '2 ngăn (1 mặt mây), chân chữ thập, ráp mộng; bán lẻ và set 2.', '$179 · set $329', 'Bme ≈ $52K/tháng'],
    ['Q2 2027', 'Hộc kéo gầm giường', 'p_drawers', 'Acacia đặc, 4 bánh xe, vừa gầm 9.25"; bán kèm giường.', '$149 / 2 hộc', 'Upsell AOV'],
    ['Q3 2027', 'Kumi Bench / Ottoman', 'p_bench', 'Ghế cuối giường khung gỗ + đệm linen tháo được.', '$229', 'Hoàn thiện bộ'],
    ['Q4 2027', 'Kumi Dresser', 'p_dresser', '6 ngăn, mặt mây ở hàng trên, chân chữ thập.', '$599', 'Bme sideboard ≈ $92K/tháng'],
    ['Q1 2028', 'Kumi Wardrobe', 'p_wardrobe', 'Tủ 2 cánh mây mắt cáo, lắp mộng + chốt cam ẩn.', '$799', 'Wayfair ưu tiên']];
  $('#timeline').innerHTML = T.map(t => `<div class="tl glass pad" style="padding:12px"><span class="q">${t[0]}</span><img src="img/render/${t[2]}.jpg" alt="${t[1]}" loading="lazy"><h4>${t[1]}</h4><p>${t[3]}</p><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip good">${t[4]}</span><span class="chip">${t[5]}</span></div></div>`).join('');
};
PR.plan = function () {
  const RD = [['Q4/2026', 'Mẫu & FOB', 'Khung Kumi + 3 đầu giường + Low; test lắp < 10 phút, tải 1.000 lb, ISTA 3A, 1 thùng'], ['Q1/2027', 'Launch Amazon', 'King/Queen, 2 màu; Vine + coupon; PPC cụm joinery/japanese/thuma'], ['Q2/2027', 'Wayfair + Nightstand + Hộc kéo', 'CastleGate; bán chéo trong collection'], ['Q3/2027', 'Mở rộng màu & đầu giường', 'Thêm 4 màu, 3 headboard premium; Bench'], ['Q4/2027–Q1/2028', 'Dresser, Wardrobe', 'Hoàn thiện phòng ngủ Kumi']];
  $('#tRoad').innerHTML = '<thead><tr><th>Mốc</th><th>Hạng mục</th><th>Nội dung</th></tr></thead><tbody>' + RD.map(r => `<tr><td class="num">${r[0]}</td><td><b>${r[1]}</b></td><td class="muted">${r[2]}</td></tr>`).join('') + '</tbody>';
  const RK = [['FOB Acacia cao → GPM thấp', 'Bảng FOB Target; slat/dầm LVL; dự phòng cam-lock'], ['Hàng nặng → phí FBA cao', 'Headboard 4 module, 1 thùng ≤ 133 lb; bản Low 92 lb'], ['Nêm khó đóng (lỗi của Thor)', 'Nêm côn 1:12, dung sai ±0.3 mm, test lắp tay 20 bộ'], ['Kiểu dáng giống Thuma', 'Chân/headboard riêng, tra design patent'], ['Thuế thay đổi', 'Mô hình để thuế 25% (thận trọng); theo dõi HTS 9403.50']];
  $('#tRisk').innerHTML = '<tbody>' + RK.map(r => `<tr><td><b>${r[0]}</b></td><td class="muted">${r[1]}</td></tr>`).join('') + '</tbody>';
};

// =====================================================================
INIT.build = function () {
  const STEPS = [
    ['Mở hộp', 'Mọi chi tiết in mã A–K. Bày ra sàn theo hình trên nắp thùng.', 0],
    ['Dựng 4 chân + ray đầu/cuối', 'Cắm mộng dương của ray C vào lỗ mộng trên chân A và cột B. Không dụng cụ.', 2],
    ['Trượt ray dọc, thả nêm', 'Luồn mộng ray D vào chân, thả nêm kusabi J (côn 1:12) từ đỉnh chân và ấn tay. Nêm nằm âm trong chân, tự siết khi giường chịu tải.', 2],
    ['Đặt dầm giữa + 2 chân đỡ', 'Đặt dầm F vào khấc trên ray C, cắm 2 chân G.', 1],
    ['Trải slat cuộn', 'Mở cuộn slat H (nối dây felt) từ đầu xuống cuối; slat tự khớp vào thanh đỡ E.', 1.5],
    ['Gắn headboard module', 'Trượt 4 module headboard I vào rãnh 2 cột B, đặt nẹp đỉnh, siết 2 núm vặn tay K.', 1.5],
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
  seg('#asmLeg', 'l', v => { if (av) { av.set('legs', v); av.setStep(cur); } });
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
    `<div class="dark pad"><div class="stat"><div class="v">${ct.length} thùng · ~${Math.round(ct.reduce((s, c) => s + c.lb, 0))} lb</div><div class="l">${BOMV.hb ? 'Headboard chia 4 module nên vẫn đi 1 thùng, cân tính phí = cân thật (vì thể tích/139 nhỏ hơn). Dưới mốc 150 lb của FBA Extra-large.' : 'Một thùng gọn nhất, gần Merax (85 lb). Phí FBA thấp nhất.'}</div></div></div>`;
};

/* ---------- Book BSP ---------- */
const BOOK = (() => {
  const R = n => `<img src="img/render/${n}.jpg" alt="${n}" loading="lazy">`;
  const KUMI = { b: 'Lignarc', l: 'Kumi (đề xuất)', own: true, cover: 'l_cane',
    usp: 'Giường gỗ Acacia thật, lắp hoàn toàn bằng mộng nêm kiểu Nhật: 0 con vít, 5 bước dưới 10 phút, cả giường gói gọn trong 1 thùng FBA.',
    items: [
      ['o_cane', 'Gỗ Acacia chọn lọc', 'SOLID ACACIA, KHÔNG VENEER', 'Toàn bộ khung, chân, headboard là Acacia đặc sấy 8–10%. Vân gỗ thật, cạnh bo R3 an toàn, đúng thứ khách Bme chê là "MDF dán".'],
      ['d_cross', 'Mộng chữ thập, 0 vít', 'JOINERY / KUSABI WEDGE', 'Thanh rail lồng vào chân bằng mộng xuyên, cố định bằng nêm gỗ côn 1:12. Càng nằm càng khít, không lỏng vít theo thời gian.'],
      ['d_round', 'Chân trụ tròn', 'ROUND POST OPTION', 'Phiên bản chân tròn côn nhẹ, vẫn mộng chốt gỗ. Mềm mại hơn cho phòng Japandi/organic.'],
      ['l_none', 'Chịu tải 1.000 lb', 'CENTER BEAM + 2 LEGS', 'Dầm giữa có 2 chân đỡ, 12 thanh slat cuộn bọc nỉ. Không kêu cót két: pain point số 1 trong review đối thủ.'],
      ['l_fabric', 'Headboard mô-đun', '10 STYLES, 4 MODULES', 'Cane, vải bọc foam, papercord, dây thừng đan, arch, spindle... tất cả chia 4 mô-đun trượt vào rãnh trụ. Đổi kiểu đầu giường không cần đổi giường.'],
      ['l_arch', 'Arch & Cane', 'PREMIUM LOOK, MASS PRICE', 'Kiểu arch và cane đang trend Pinterest/TikTok, giá cạnh tranh $549 King, cao hơn dòng chuẩn $50 nhưng biên tốt hơn.'],
      ['o_none_float', 'Bản không đầu', 'LOW / FLOATING / HEADLESS', '3 phiên bản không headboard: chân chữ thập, trụ tròn, floating. Giá vào $399–$429 để cạnh tranh Thor.'],
      ['p_drawers', 'Ngăn kéo gầm giường', 'UNDER-BED STORAGE +$149', 'Hộc kéo gỗ đặc có bánh xe, trượt vừa gầm cao 14". Bán kèm hoặc lẻ, tăng AOV.'],
      ['o_geo', '5 bước, dưới 10 phút', 'TOOL-FREE ASSEMBLY', 'Đánh số từng chi tiết, hướng dẫn 3D bằng QR. Không cần dụng cụ, 1 người lắp được.'],
      ['o_panel', '1 thùng FBA', 'ONE BOX, ≤ 150 LB', 'Mọi size, có hay không đầu đều đóng 1 thùng. Giảm phí FBA, không lạc kiện, giao một lần.'],
      ['c_room', 'Mở rộng thành bộ', 'BED → FULL BEDROOM', 'Nightstand, dresser, bench, wardrobe cùng ngôn ngữ mộng và màu. Khách mua giường quay lại mua cả phòng.'],
      ['l_cane', 'Hoàn thiện gốc nước', 'WATER-BASED, LOW VOC', 'Sơn gốc nước an toàn cho phòng ngủ trẻ em, 5 màu từ Natural đến Dark Chocolate. Bảo hành 3 năm.']
    ] };
  let books = [], cur = 0, pg = 0;
  const pagesOf = bk => { const it = bk.items, out = [['cover']]; for (let i = 0; i < it.length; i += 3) out.push(it.slice(i, i + 3).map((x, j) => [i + j, x])); if (out.length % 2) out.push(['end']); return out; };
  const pic = (bk, i) => bk.own ? R(bk.items[i][0]) : (bk.imgs && bk.imgs.length ? img(bk.imgs[(i + 1) % bk.imgs.length], bk.l, 600) : '<div class="ph-img"></div>');
  function page(bk, p, n, tot) {
    let h;
    if (p[0] === 'cover') h = `<div class="bcover" style="display:grid;gap:20px">${bk.own ? R(bk.cover) : (bk.imgs && bk.imgs[0] ? img(bk.imgs[0], bk.l, 900) : '')}<div><div class="mono faint" style="letter-spacing:.2em;font-size:11px">${esc(bk.b).toUpperCase()}</div><h3>${esc(bk.l)}</h3></div><div class="bsp"><div class="k">Big Selling Point</div><p>${esc(bk.usp || '—')}</p></div></div>`;
    else if (p[0] === 'end') h = `<div style="display:grid;place-items:center;min-height:520px;text-align:center"><div><div class="mono faint" style="letter-spacing:.2em;font-size:11px">${esc(bk.b).toUpperCase()}</div><h3 style="font-family:'Cormorant Garamond',serif;font-size:34px;margin-top:6px">${esc(bk.l)}</h3><p class="faint" style="margin-top:8px;font-size:12px">${bk.items.length} selling points</p></div></div>`;
    else h = p.map(([i, x]) => { const own = bk.own; const t = own ? x[1] : x.t, k = own ? x[2] : (x.k || ''), b = own ? x[3] : x.b; return `<div class="bitem">${pic(bk, i)}<div><div class="q"><span>Q${i + 1}</span>${esc(t)}</div>${k ? `<div class="k">${esc(k)}</div>` : '<div style="height:10px"></div>'}<p>${esc(b)}</p>${!own && x.tag ? `<span class="tag ${x.tag[0]}">${esc(x.tag[1])}</span>` : ''}</div></div>`; }).join('');
    return `<div class="bpage">${h}<div class="foot"><span>${esc(bk.b).toUpperCase()} · ${esc(bk.l).toUpperCase()}</span><span>${n + 1} / ${tot}</span></div></div>`;
  }
  function draw(dir) {
    const bk = books[cur], P = pagesOf(bk), el = $('#book');
    el.innerHTML = page(bk, P[pg], pg, P.length) + page(bk, P[pg + 1], pg + 1, P.length);
    el.classList.remove('flip-n', 'flip-p'); void el.offsetWidth; if (dir) el.classList.add(dir > 0 ? 'flip-n' : 'flip-p');
    $('#bkPg').textContent = `Trang ${pg + 1}–${pg + 2} / ${P.length}`;
    $('#bkPrev').disabled = pg === 0; $('#bkNext').disabled = pg + 2 >= P.length;
  }
  let done = false;
  return { init() {
    if (done) return; done = true;
    const B = window.BOOKS || {};
    books = [KUMI, ...Object.values(B).filter(x => x.items && x.items.length)];
    $('#bookSel').innerHTML = books.map((b, i) => `<button data-i="${i}" class="${i ? '' : 'on'}">${b.own ? '★ ' : ''}${esc(b.l)}<span class="faint" style="font-size:10px;margin-left:4px">${b.own ? '' : b.b === 'AllForWood' ? 'AFW' : 'Bme'}</span></button>`).join('');
    seg('#bookSel', 'i', i => { cur = +i; pg = 0; draw(1); });
    $('#bkNext').onclick = () => { const P = pagesOf(books[cur]); if (pg + 2 < P.length) { pg += 2; draw(1); } };
    $('#bkPrev').onclick = () => { if (pg) { pg -= 2; draw(-1); } };
    document.addEventListener('keydown', e => { if (!$('#book').offsetParent) return; if (e.key === 'ArrowRight') $('#bkNext').click(); if (e.key === 'ArrowLeft') $('#bkPrev').click(); });
    draw();
  } };
})();
route();
})();

