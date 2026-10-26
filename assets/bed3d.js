/* Lignarc Joinery Bed – procedural 3D (three.js r147, global THREE)
   Units: inches in model space, scaled to metres on the root group. */
(function () {
  const IN = 0.0254;
  const COLORS = {
    light:   { name: 'Light Brown',    base: [201, 154, 98],  dark: [150, 102, 58] },
    medium:  { name: 'Medium Brown',   base: [140, 92, 56],   dark: [92, 56, 30] },
    caramel: { name: 'Caramel',        base: [190, 122, 64],  dark: [132, 78, 36] },
    natural: { name: 'Natural',        base: [218, 184, 140], dark: [176, 136, 92] },
    walnut:  { name: 'Walnut',         base: [104, 66, 40],   dark: [62, 38, 22] },
    choco:   { name: 'Dark Chocolate', base: [66, 44, 32],    dark: [38, 24, 16] }
  };
  const SIZES = { King: { mw: 76, ml: 80 }, Queen: { mw: 60, ml: 80 } };

  // ---------- deterministic noise ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;

  // ---------- wood textures (acacia lamellas) ----------
  const texCache = {};
  function woodCanvas(colorKey, seed, opts = {}) {
    const key = colorKey + '|' + seed + '|' + (opts.kind || 'lam');
    if (texCache[key]) return texCache[key];
    const c = COLORS[colorKey];
    const W = 1024, H = 256;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const r = rng(seed * 7919 + 13);
    // lamellas run along the length (x axis of texture); stacked across height
    let y = 0;
    while (y < H) {
      const h = opts.kind === 'plain' ? H : (28 + r() * 46);
      const t = r();
      const tone = opts.kind === 'plain' ? 0.5 : (t < .18 ? .15 : t > .85 ? .9 : .35 + r() * .4);
      const R = mix(c.dark[0], c.base[0] * 1.08, tone), G = mix(c.dark[1], c.base[1] * 1.08, tone), B = mix(c.dark[2], c.base[2] * 1.08, tone);
      g.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`; g.fillRect(0, y, W, h + 1);
      // grain lines
      const lines = 10 + (r() * 14 | 0);
      for (let i = 0; i < lines; i++) {
        const yy = y + r() * h, amp = 1 + r() * 4, freq = 0.004 + r() * 0.01, ph = r() * 6.28;
        g.strokeStyle = `rgba(${c.dark[0] * .7 | 0},${c.dark[1] * .7 | 0},${c.dark[2] * .7 | 0},${0.10 + r() * 0.22})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        for (let x = 0; x <= W; x += 16) { const yv = yy + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * .3; x ? g.lineTo(x, yv) : g.moveTo(x, yv); }
        g.stroke();
      }
      // finger joints (acacia butcher-block look)
      if (opts.kind !== 'plain' && r() < .5) {
        const fx = r() * W;
        g.strokeStyle = 'rgba(40,24,12,.25)'; g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k < 6; k++) { g.lineTo(fx + (k % 2 ? 10 : 0), y + k * h / 5); }
        g.stroke();
      }
      // lamella seam
      g.fillStyle = 'rgba(30,18,10,.18)'; g.fillRect(0, y + h - 1, W, 1);
      y += h;
    }
    // pores / knots
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(30,18,10,${r() * .12})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1); }
    for (let i = 0; i < 2; i++) {
      const kx = r() * W, ky = r() * H, kr = 4 + r() * 6;
      const grd = g.createRadialGradient(kx, ky, 0, kx, ky, kr * 2);
      grd.addColorStop(0, 'rgba(40,22,10,.55)'); grd.addColorStop(1, 'rgba(40,22,10,0)');
      g.fillStyle = grd; g.beginPath(); g.ellipse(kx, ky, kr * 3, kr, 0, 0, 6.28); g.fill();
    }
    texCache[key] = cv;
    return cv;
  }
  function woodMat(colorKey, seed, lenIn, crossIn, opts = {}) {
    const tex = new THREE.CanvasTexture(woodCanvas(colorKey, seed, opts));
    tex.encoding = THREE.sRGBEncoding; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
    tex.repeat.set(Math.max(.4, lenIn / 48), Math.max(.15, crossIn / 18));
    if (opts.rotate) { tex.center.set(.5, .5); tex.rotation = Math.PI / 2; }
    return new THREE.MeshStandardMaterial({ map: tex, roughness: .62, metalness: 0, envMapIntensity: .55 });
  }

  // diagonal-groove panel texture (option 2)
  function diagCanvas(colorKey, flip) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    g.drawImage(woodCanvas(colorKey, 77, {}), 0, 0, 1024, 256, 0, 0, 512 * 2, 512);
    g.save(); g.translate(256, 256); g.rotate((flip ? -1 : 1) * Math.PI / 4); g.translate(-512, -512);
    for (let i = 0; i < 1024; i += 54) {
      g.fillStyle = 'rgba(25,14,6,.6)'; g.fillRect(i, 0, 5, 1024);
      g.fillStyle = 'rgba(255,235,200,.18)'; g.fillRect(i + 5, 0, 3, 1024);
    }
    g.restore();
    return cv;
  }

  // ---------- fabrics / room textures ----------
  function canvasTex(w, h, draw, repeat) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    return t;
  }
  function linen(color, dots) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h); const r = rng(5);
      for (let i = 0; i < h; i += 2) { g.fillStyle = `rgba(0,0,0,${.02 + r() * .03})`; g.fillRect(0, i, w, 1); }
      for (let i = 0; i < w; i += 2) { g.fillStyle = `rgba(255,255,255,${.02 + r() * .03})`; g.fillRect(i, 0, 1, h); }
      if (dots) for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${r() * .05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    }, [3, 3]);
  }

  function rbox(w, h, d, r, seg) {
    const G = THREE.RoundedBoxGeometry ? new THREE.RoundedBoxGeometry(w, h, d, seg || 4, Math.min(r, w / 2 - .01, h / 2 - .01, d / 2 - .01)) : new THREE.BoxGeometry(w, h, d);
    return G;
  }
  // ---------- weave / cane / cord textures ----------
  function caneTex(bg, strand) {
    // rattan "mắt cáo" (octagon cane weave). Transparent holes via alpha.
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); g.clearRect(0, 0, 256, 256);
    g.strokeStyle = strand; g.lineCap = 'round';
    const s = 32;
    for (let k = -256; k < 512; k += s) {
      g.lineWidth = 5; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke();
      g.beginPath(); g.moveTo(k + 256, 0); g.lineTo(k, 256); g.stroke();
      g.lineWidth = 4.5; g.beginPath(); g.moveTo(k + s / 2, 0); g.lineTo(k + s / 2, 256); g.stroke();
      g.beginPath(); g.moveTo(0, k + s / 2); g.lineTo(256, k + s / 2); g.stroke();
    }
    g.globalCompositeOperation = 'source-atop';
    const r = rng(8); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,60,30,${r() * .25})`; g.fillRect(r() * 256, r() * 256, 2, 1); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  function caneMat(w, h) {
    const t = caneTex(null, '#d9bb88'); t.repeat.set(w / 7, h / 7);
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: .8 });
  }
  function cordMat(color) { return new THREE.MeshStandardMaterial({ color, roughness: .95 }); }

  // ---------- leg helpers ----------
  function legMesh(kind, h, size, mat) {
    let g;
    if (kind === 'round') { g = new THREE.CylinderGeometry(size * .5, size * .41, h, 28, 1); }
    else { g = rbox(size, h, size, .18, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - .16 * (h / 2 - y) / h; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); }
    return new THREE.Mesh(g, mat);
  }

  // ---------- bed builder v2 ----------
  // opts: size, color, headboard: none|geo|diag|panel|fabric|cane|arch|spindle|papercord|rope, legs: cross|round|floating, drawers: bool
  function buildBed(opt) {
    const S = SIZES[opt.size || 'King'], col = opt.color || 'medium', hb = opt.headboard || 'geo', legK = opt.legs || 'cross';
    const iw = S.mw + 1, il = S.ml + 1, rt = 1.1, rh = 4.75, top = 14, leg = legK === 'round' ? 2.9 : 2.75;
    const floating = legK === 'floating';
    const ow = iw + 2 * rt, ol = il + 2 * rt;
    const root = new THREE.Group(); const parts = [];
    let seed = 1; const W = (len, cross, o) => woodMat(col, seed++, len, cross, o);
    const reg = (m, step, from, name, extra) => { m.castShadow = true; m.receiveShadow = true; m.userData = Object.assign({ step, home: m.position.clone(), from: from || new THREE.Vector3(), name }, extra || {}); root.add(m); parts.push(m); return m; };
    const add = (geo, mat, x, y, z, step, from, name, extra) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return reg(m, step, from, name, extra); };
    const hasHB = hb !== 'none';
    const zH = -ol / 2, zF = ol / 2, xL = -ow / 2, xR = ow / 2;
    const darker = new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${COLORS[col].dark.map(v => v * .62 | 0).join(',')})`).convertSRGBToLinear(), roughness: .7 });
    const endGrain = new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${COLORS[col].base.map(v => Math.min(255, v * 1.12) | 0).join(',')})`).convertSRGBToLinear(), roughness: .8 });

    // ---- legs
    const inset = floating ? 5 : 0;
    const legPos = [[xL + leg / 2 + inset, zF - leg / 2 - inset], [xR - leg / 2 - inset, zF - leg / 2 - inset], [xL + leg / 2 + inset, zH + leg / 2 + inset], [xR - leg / 2 - inset, zH + leg / 2 + inset]];
    const postH = hb === 'arch' ? 30 : 48;
    legPos.forEach(([x, z], i) => {
      const head = i >= 2, post = head && hasHB;
      const h = post ? postH : (floating ? top - rh : top);
      const m = legMesh(legK === 'round' ? 'round' : 'square', h, leg, W(h, leg, { rotate: true }));
      m.position.set(post ? (x > 0 ? xR - leg / 2 : xL + leg / 2) : x, h / 2, post ? zH + leg / 2 : z);
      reg(m, 1, new THREE.Vector3(x > 0 ? 12 : -12, 12, z > 0 ? 12 : -12), post ? 'Cột đầu giường' : 'Chân góc');
      if (post && legK === 'round') { const cap = new THREE.Mesh(new THREE.SphereGeometry(leg * .5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.material); cap.position.y = h / 2; m.add(cap); }
      // visible joinery on the leg face: flush through-tenon end + wedge slit (no protrusion)
      if (!floating && !post) {
        const fx = x > 0 ? 1 : -1, fz = z > 0 ? 1 : -1;
        if (legK === 'round') {
          const peg = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .2, 20), endGrain); peg.rotation.z = Math.PI / 2; peg.position.set(fx * (leg * .47), top - rh / 2 - h / 2, 0); m.add(peg);
          const peg2 = peg.clone(); peg2.rotation.set(Math.PI / 2, 0, 0); peg2.position.set(0, top - rh / 2 - h / 2, fz * (leg * .47)); m.add(peg2);
        } else {
          const tn = new THREE.Mesh(new THREE.BoxGeometry(.06, rh * .62, rt * .9), endGrain); tn.position.set(fx * (leg / 2 * .98), top - rh / 2 - h / 2, 0); m.add(tn);
          const wd = new THREE.Mesh(new THREE.BoxGeometry(.07, rh * .62, .12), darker); wd.position.set(fx * (leg / 2 * .99), top - rh / 2 - h / 2, 0); m.add(wd);
          const tn2 = new THREE.Mesh(new THREE.BoxGeometry(rt * .9, rh * .62, .06), endGrain); tn2.position.set(0, top - rh / 2 - h / 2, fz * (leg / 2 * .98)); m.add(tn2);
        }
      }
    });
    // ---- rails (flush between legs; floating = continuous rails with rounded corners over set-back legs)
    const endLen = floating ? ow : ow - 2 * leg + .4, sideLen = floating ? ol - 2 * rt : ol - 2 * leg + .4;
    const ry = top - rh / 2;
    add(rbox(endLen, rh, rt, .25, 2), W(endLen, rh), 0, ry, zF - rt / 2, 1, new THREE.Vector3(0, 14, 16), 'Ray cuối');
    if (!hasHB || floating) add(rbox(endLen, rh, rt, .25, 2), W(endLen, rh), 0, ry, zH + rt / 2, 1, new THREE.Vector3(0, 14, -16), 'Ray đầu');
    else add(rbox(ow - 2 * leg + .4, rh, rt, .25, 2), W(ow, rh), 0, ry, zH + leg / 2, 1, new THREE.Vector3(0, 14, -16), 'Ray đầu');
    const sideZ0 = 0;
    add(rbox(rt, rh, sideLen, .25, 2), W(sideLen, rh), xL + rt / 2, ry, sideZ0, 2, new THREE.Vector3(-22, 8, 0), 'Ray dọc trái');
    add(rbox(rt, rh, sideLen, .25, 2), W(sideLen, rh), xR - rt / 2, ry, sideZ0, 2, new THREE.Vector3(22, 8, 0), 'Ray dọc phải');
    // kusabi wedges: drop into the top of each corner leg (end up flush, hidden)
    if (!floating) legPos.forEach(([x, z], i) => { const h = i >= 2 && hasHB; if (h) return; add(new THREE.BoxGeometry(.5, 2.2, .9), darker, x, top - 1.1, z, 2, new THREE.Vector3(0, 10, 0), 'Nêm gỗ'); });
    // cleats
    [xL + rt + .5, xR - rt - .5].forEach((x, i) => add(new THREE.BoxGeometry(1, 1.2, il - 3), W(il, 1.2), x, top - 2.1, 0, 3, new THREE.Vector3(i ? 22 : -22, 8, 0), 'Thanh đỡ slat'));
    // center beam + support legs
    add(new THREE.BoxGeometry(1.4, 2.8, il - 1.5), W(il, 3), 0, top - 2.9, 0, 3, new THREE.Vector3(0, 16, 0), 'Dầm giữa');
    [-il / 4, il / 4].forEach(z => { const m = legMesh(legK === 'round' ? 'round' : 'square', top - 4.3, 2.2, W(10, 2.2, { rotate: true })); m.position.set(0, (top - 4.3) / 2, z); reg(m, 3, new THREE.Vector3(0, 16, 0), 'Chân đỡ giữa'); });
    // slats (roll-up with felt strap)
    const nS = 12, gap = (il - nS * 2.75) / (nS + 1);
    for (let i = 0; i < nS; i++) { const z = zH + rt + gap + 1.375 + i * (2.75 + gap); add(new THREE.BoxGeometry(iw - 1.2, .5, 2.75), W(iw, 2.75), 0, top - 1.2, z, 4, new THREE.Vector3(0, 8 + i * .7, 0), 'Slat', { delay: i * .05 }); }
    // under-bed storage drawers on wheels
    if (opt.drawers) {
      const dw = Math.min(30, iw / 2 - 4), dd = 26, dh = 6.5;
      [-1, 1].forEach((s, i) => {
        const g = new THREE.Group();
        const m = W(dw, dh);
        const mk = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); };
        mk(dw, .5, dd, 0, 1.25, 0); mk(dw, dh, .6, 0, 1 + dh / 2, dd / 2); mk(dw, dh, .6, 0, 1 + dh / 2, -dd / 2); mk(.6, dh, dd, -dw / 2, 1 + dh / 2, 0); mk(.6, dh, dd, dw / 2, 1 + dh / 2, 0);
        const cut = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, .7), darker); cut.position.set(0, 1 + dh - .7, dd / 2 + .01); g.add(cut);
        [[-dw / 2 + 2, -dd / 2 + 2], [dw / 2 - 2, -dd / 2 + 2], [-dw / 2 + 2, dd / 2 - 2], [dw / 2 - 2, dd / 2 - 2]].forEach(([x, z]) => { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .4, 12), new THREE.MeshStandardMaterial({ color: 0x2a2420 })); wh.rotation.z = Math.PI / 2; wh.position.set(x, .5, z); g.add(wh); });
        g.rotation.y = -Math.PI / 2 * s; g.position.set(s * (ow / 2 - dd / 2 + (i ? 9 : 4)), 0, i ? 8 : -20);
        g.userData = { step: 6, home: g.position.clone(), from: new THREE.Vector3(s * 30, 0, 0), name: 'Hộc kéo gầm giường' };
        root.add(g); parts.push(g);
      });
    }
    // ---- headboard (modular: 4 tiles / inserts slide down into grooved posts → fits the 1-box pack)
    if (hasHB) {
      const pw = hb === 'arch' ? ow - .4 : ow - 2 * leg + .3, ph = hb === 'arch' ? 34 : 28, py = hb === 'arch' ? 33.5 : 33, pz = zH + leg / 2;
      const panel = new THREE.Group(); panel.position.set(0, py, pz);
      const meshes = [];
      const P = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; panel.add(m); meshes.push(m); return m; };
      const frame = (thk) => { // top + bottom rail of the headboard frame
        P(new THREE.Mesh(rbox(pw, 2.2, thk, .3, 2), W(pw, 2)), 0, ph / 2 - 1.1, 0);
        P(new THREE.Mesh(rbox(pw, 2.2, thk, .3, 2), W(pw, 2)), 0, -ph / 2 + 1.1, 0);
      };
      if (hb === 'geo') {
        P(new THREE.Mesh(new THREE.BoxGeometry(pw, ph, .5), darker), 0, 0, -.45);
        const rowsCuts = [[[0, 0], [.22, .27], [.47, .41], [.71, .77], [1, 1]], [[0, 0], [.27, .21], [.41, .55], [.77, .70], [1, 1]]], gp = .3;
        rowsCuts.forEach((cuts, ri) => { const yb = -ph / 2 + ri * ph / 2, yt = yb + ph / 2;
          for (let ci = 0; ci < cuts.length - 1; ci++) {
            const xb0 = -pw / 2 + cuts[ci][0] * pw + (ci ? gp : 0), xt0 = -pw / 2 + cuts[ci][1] * pw + (ci ? gp : 0), xb1 = -pw / 2 + cuts[ci + 1][0] * pw - (ci < 3 ? gp : 0), xt1 = -pw / 2 + cuts[ci + 1][1] * pw - (ci < 3 ? gp : 0);
            const y0 = yb + (ri ? gp : 0), y1 = yt - (ri ? 0 : gp);
            const sh = new THREE.Shape(); sh.moveTo(xb0, y0); sh.lineTo(xb1, y0); sh.lineTo(xt1, y1); sh.lineTo(xt0, y1); sh.closePath();
            const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .55, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 1 }), woodMat(col, 200 + ci * 3 + ri, 10, 10, { rotate: (ci + ri) % 2 === 0 }));
            m.material.map.repeat.set(.05, .05); P(m, 0, 0, -.25);
          } });
      } else if (hb === 'diag') {
        const nx = 4, ny = 2, tw = pw / nx, th = ph / ny;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const tex = new THREE.CanvasTexture(diagCanvas(col, i % 2)); tex.encoding = THREE.sRGBEncoding; const bump = new THREE.CanvasTexture(diagCanvas(col, i % 2));
          P(new THREE.Mesh(new THREE.BoxGeometry(tw - .3, th - .3, .6), [W(tw, 1), W(tw, 1), W(tw, 1), W(tw, 1), new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: .9, roughness: .6, envMapIntensity: .5 }), W(tw, 1)]), -pw / 2 + tw * (i + .5), -ph / 2 + th * (j + .5), 0);
        }
      } else if (hb === 'panel') {
        P(new THREE.Mesh(rbox(pw, ph, 1, .5, 3), W(pw, ph)), 0, 0, 0);
        P(new THREE.Mesh(new THREE.BoxGeometry(pw - 1, .18, .1), darker), 0, -1, .52);
      } else if (hb === 'fabric') {
        P(new THREE.Mesh(rbox(pw, ph, .8, .3, 2), W(pw, ph)), 0, 0, -.2);
        const fab = new THREE.MeshStandardMaterial({ map: linen('#d8cfc0', true), roughness: 1 });
        [-1, 1].forEach(s => P(new THREE.Mesh(rbox(pw / 2 - 1.6, ph - 5, 3, 1.4, 4), fab), s * (pw / 4 - .2), 0, 1.4));
      } else if (hb === 'cane' || hb === 'arch') {
        if (hb === 'cane') {
          frame(1.2);
          const mids = [-pw / 6, pw / 6];
          mids.forEach(x => P(new THREE.Mesh(new THREE.BoxGeometry(1.4, ph - 4, 1.1), W(ph, 1.4, { rotate: true })), x, 0, 0));
          P(new THREE.Mesh(new THREE.PlaneGeometry(pw - 1, ph - 4), caneMat(pw, ph)), 0, 0, 0);
        } else {
          const r = pw / 2, k = 0.3; // flattened arch
          const outer = new THREE.Shape(); outer.moveTo(-pw / 2, -ph / 2); outer.lineTo(-pw / 2, ph / 2 - r * k); outer.absellipse(0, ph / 2 - r * k, r, r * k, Math.PI, 0, true); outer.lineTo(pw / 2, -ph / 2); outer.lineTo(-pw / 2, -ph / 2);
          const inner = new THREE.Path(); const ri = r - 2, h0 = ph / 2 - r * k; inner.moveTo(-pw / 2 + 2, -ph / 2 + 2); inner.lineTo(-pw / 2 + 2, h0); inner.absellipse(0, h0, ri, ri * k * (r / ri) - 2, Math.PI, 0, true); inner.lineTo(pw / 2 - 2, -ph / 2 + 2); inner.lineTo(-pw / 2 + 2, -ph / 2 + 2);
          outer.holes.push(inner);
          P(new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 1.2, bevelEnabled: true, bevelThickness: .15, bevelSize: .15, bevelSegments: 2, curveSegments: 48 }), W(pw, ph)), 0, 0, -.6);
          const fill = new THREE.Shape(inner.getPoints(64));
          P(new THREE.Mesh(new THREE.ShapeGeometry(fill, 64), caneMat(pw, ph + r * k)), 0, 0, 0);
          const cm = panel.children[panel.children.length - 1].material; cm.map.repeat.set(1 / 7, 1 / 7);
        }
      } else if (hb === 'spindle') {
        P(new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, pw, 20), W(pw, 2, { rotate: true })), 0, ph / 2 - .9, 0).rotation.z = Math.PI / 2;
        P(new THREE.Mesh(rbox(pw, 1.6, 1.2, .3, 2), W(pw, 2)), 0, -ph / 2 + .8, 0);
        const n = Math.round(pw / 4.6);
        for (let i = 0; i < n; i++) P(new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, ph - 2.4, 14), W(ph, 1, { rotate: true })), -pw / 2 + (i + .5) * pw / n, 0, 0);
      } else if (hb === 'papercord') {
        frame(1.2);
        const cm = cordMat(0xcaa874), n = Math.round(pw / .36);
        const g = new THREE.CylinderGeometry(.16, .16, ph - 4.2, 6);
        const im = new THREE.InstancedMesh(g, cm, n); const o = new THREE.Object3D();
        for (let i = 0; i < n; i++) { o.position.set(-pw / 2 + .4 + i * (pw - .8) / (n - 1), 0, (i % 2 ? .12 : -.12)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
        im.castShadow = true; P(im, 0, 0, 0);
        P(new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, pw, 12), cordMat(0xb99560)), 0, 0, .3).rotation.z = Math.PI / 2;
      } else if (hb === 'rope') {
        P(new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, pw, 20), W(pw, 2, { rotate: true })), 0, ph / 2 - .9, 0).rotation.z = Math.PI / 2;
        const n = 9, bw = pw / n - .5, rm = cordMat(0xd6bc8e);
        for (let i = 0; i < n; i++) {
          const band = new THREE.Mesh(rbox(bw, ph - 3, .7, .3, 2), new THREE.MeshStandardMaterial({ map: canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#c49a62'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { c.fillStyle = 'rgba(90,60,30,.45)'; c.fillRect(0, y, w, 1.5); } for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(255,240,210,.2)'; c.fillRect(x, 0, 2, h); } }, [1, 3]), roughness: 1 }));
          band.rotation.x = (i % 2 ? .05 : -.05); P(band, -pw / 2 + (i + .5) * pw / n, -1.2, (i % 2 ? .35 : -.15));
        }
        P(new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, pw + 1, 12), rm), 0, -3, .7).rotation.z = Math.PI / 2;
      }
      if (['geo', 'diag', 'panel', 'fabric'].includes(hb)) P(new THREE.Mesh(rbox(pw + 2 * leg - .2, 1.2, 2.1, .3, 2), W(pw, 2)), 0, ph / 2 + .6, 0);
      // split modular inserts: each child gets its own drop-in delay in the assembly
      panel.userData = { step: 5, home: panel.position.clone(), from: new THREE.Vector3(0, 14, -10), name: 'Headboard (module)' };
      root.add(panel); parts.push(panel);
      (hb === 'arch' ? [] : [-pw / 2 - leg / 2, pw / 2 + leg / 2]).forEach(x => { const k = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, .7, 24), new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: .45, metalness: .2 })); k.rotation.x = Math.PI / 2; k.position.set(x, py, pz - leg / 2 - .35); reg(k, 5, new THREE.Vector3(0, 0, -6), 'Núm vặn tay', { spin: true }); });
    }
    root.scale.setScalar(IN);
    return { root, parts, dims: { ow, ol, top, hasHB, il, iw } };
  }

  // ---------- Kumi collection pieces (same joinery language) ----------
  function piece(kind, col, legK) {
    const g = new THREE.Group(); let seed = 500 + kind.length * 7; const W = (l, c, o) => woodMat(col, seed++, l, c, o);
    const darker = new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${COLORS[col].dark.map(v => v * .6 | 0).join(',')})`).convertSRGBToLinear(), roughness: .7 });
    const M = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const legs = (w, d, h, inset, s) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const m = legMesh(legK === 'round' ? 'round' : 'square', h, s || 2, W(h, 2, { rotate: true })); m.position.set(a * (w / 2 - inset), h / 2, b * (d / 2 - inset)); m.castShadow = true; g.add(m); });
    const caseBox = (w, d, h, y0) => { M(rbox(w, 1, d, .3, 2), W(w, d), 0, y0 + h - .5, 0); M(new THREE.BoxGeometry(w, .8, d), W(w, d), 0, y0 + .4, 0); M(new THREE.BoxGeometry(.8, h - 1.3, d), W(h, d, { rotate: true }), -w / 2 + .4, y0 + h / 2, 0); M(new THREE.BoxGeometry(.8, h - 1.3, d), W(h, d, { rotate: true }), w / 2 - .4, y0 + h / 2, 0); M(new THREE.BoxGeometry(w - 1.6, h - 1.3, .4), darker, 0, y0 + h / 2, -d / 2 + .2); };
    const drawer = (w, h, x, y, z, cane) => { if (cane) { M(new THREE.BoxGeometry(w, h, .5), W(w, h), x, y, z); const c = M(new THREE.PlaneGeometry(w - 2.4, h - 2.4), caneMat(w, h), x, y, z + .27); } else M(rbox(w, h, .7, .15, 2), W(w, h), x, y, z); M(new THREE.BoxGeometry(Math.min(6, w * .4), .6, .3), darker, x, y + h / 2 - 1.2, z + .4); };
    if (kind === 'nightstand') { const w = 22, d = 16, h = 15, y0 = 10; legs(w, d, y0 + 1, 1.2); caseBox(w, d, h, y0); drawer(w - 2, 6.2, 0, y0 + 10.3, d / 2 - .1, true); drawer(w - 2, 6.2, 0, y0 + 3.6, d / 2 - .1, false); g.userData.dim = '22 × 16 × 25"'; }
    if (kind === 'dresser') { const w = 60, d = 18, h = 24, y0 = 9; legs(w, d, y0 + 1, 1.5, 2.3); caseBox(w, d, h, y0); [0, 1, 2].forEach(r => [-1, 1].forEach(c => drawer(w / 2 - 1.6, 6.8, c * (w / 4 - .2), y0 + 4.4 + r * 7.4, d / 2 - .1, r === 2))); g.userData.dim = '60 × 18 × 33"'; }
    if (kind === 'bench') { const w = 54, d = 17, h = 18; legs(w, d, h - 3, 1.5, 2.2); M(rbox(w, 1.3, d, .3, 2), W(w, d), 0, h - 3.2, 0); M(rbox(w - 2, 3.4, d - 2, 1.4, 4), new THREE.MeshStandardMaterial({ map: linen('#d8cfc0', true), roughness: 1 }), 0, h - .9, 0); M(new THREE.BoxGeometry(w - 4, 1, 1), W(w, 1), 0, 5, 0); g.userData.dim = '54 × 17 × 18"'; }
    if (kind === 'wardrobe') { const w = 40, d = 22, h = 66, y0 = 8; legs(w, d, y0 + 1, 1.5, 2.4); caseBox(w, d, h, y0); [-1, 1].forEach(s => { M(new THREE.BoxGeometry(w / 2 - 1.2, h - 2.4, .8), W(h, w / 2, { rotate: true }), s * (w / 4 - .1), y0 + h / 2, d / 2); M(new THREE.PlaneGeometry(w / 2 - 6, h - 12), caneMat(w / 2, h), s * (w / 4 - .1), y0 + h / 2 + 1, d / 2 + .42); M(new THREE.BoxGeometry(.5, 8, .6), darker, s * 1.6, y0 + h / 2, d / 2 + .7); }); g.userData.dim = '40 × 22 × 74"'; }
    if (kind === 'drawers') { const w = 30, d = 26, dh = 6.5; const mk = (W1, H, D, x, y, z) => M(new THREE.BoxGeometry(W1, H, D), W(w, dh), x, y, z); mk(w, .5, d, 0, 1.25, 0); mk(w, dh, .6, 0, 1 + dh / 2, d / 2); mk(w, dh, .6, 0, 1 + dh / 2, -d / 2); mk(.6, dh, d, -w / 2, 1 + dh / 2, 0); mk(.6, dh, d, w / 2, 1 + dh / 2, 0); M(new THREE.BoxGeometry(8, 1.6, .7), darker, 0, 1 + dh - .7, d / 2 + .01); g.userData.dim = '30 × 26 × 7.5"'; }
    // ---- Living room (same leg / joinery language, cane accents)
    const fab = c => new THREE.MeshStandardMaterial({ map: linen(c || '#d8cfc0', true), roughness: 1 });
    const caneDoor = (w, h, x, y, z) => { M(new THREE.BoxGeometry(w, h, .7), W(h, w, { rotate: true }), x, y, z); M(new THREE.PlaneGeometry(w - 3, h - 3), caneMat(w, h), x, y, z + .37); };
    if (kind === 'tvstand') { const w = 64, d = 16, h = 16, y0 = 7; legs(w, d, y0 + 1, 1.5, 2.2); caseBox(w, d, h, y0); caneDoor(w / 3 - .6, h - 1.6, -w / 3, y0 + h / 2, d / 2 - .2); caneDoor(w / 3 - .6, h - 1.6, w / 3, y0 + h / 2, d / 2 - .2); M(new THREE.BoxGeometry(.8, h - 1.3, d - 1), W(h, d), -w / 6 + .3, y0 + h / 2, 0); M(new THREE.BoxGeometry(.8, h - 1.3, d - 1), W(h, d), w / 6 - .3, y0 + h / 2, 0); M(new THREE.BoxGeometry(w / 3 - 2, .7, d - 1.4), W(w, d), 0, y0 + h / 2, 0); g.userData.dim = '64 × 16 × 23"'; }
    if (kind === 'coffee') { const w = 46, d = 26, h = 16; legs(w, d, h - 1.2, 2, 2.2); M(rbox(w, 1.4, d, .5, 3), W(w, d), 0, h - .7, 0); M(new THREE.BoxGeometry(w - 4, .8, d - 4), W(w, d), 0, 4.5, 0); M(new THREE.PlaneGeometry(w - 8, d - 8), caneMat(w, d), 0, 4.95, 0).rotation.x = -Math.PI / 2; g.userData.dim = '46 × 26 × 16"'; }
    if (kind === 'sidetable') { const r = 10, h = 22; const top = M(new THREE.CylinderGeometry(r, r, 1.2, 40), W(20, 20), 0, h - .6, 0); M(new THREE.CylinderGeometry(r - 1.5, r - 1.5, .7, 36), W(20, 20), 0, 8, 0); [0, 1, 2].forEach(i => { const a = i * 2.094 + .5; const m = legMesh(legK === 'round' ? 'round' : 'square', h - 1.2, 1.8, W(h, 2, { rotate: true })); m.position.set(Math.cos(a) * (r - 2.2), (h - 1.2) / 2, Math.sin(a) * (r - 2.2)); m.castShadow = true; g.add(m); }); g.userData.dim = 'Ø20 × 22"'; }
    if (kind === 'sideboard') { const w = 58, d = 17, h = 24, y0 = 8; legs(w, d, y0 + 1, 1.5, 2.3); caseBox(w, d, h, y0); [-1, 0, 1].forEach(i => caneDoor(w / 3 - 1, h - 1.8, i * w / 3, y0 + h / 2, d / 2 - .2)); [-1, 1].forEach(i => M(new THREE.BoxGeometry(.6, 6, .6), darker, i * (w / 6 - 1), y0 + h / 2, d / 2 + .5)); g.userData.dim = '58 × 17 × 32"'; }
    if (kind === 'bookshelf') { const w = 32, d = 13, h = 64; [[-1], [1]].forEach(([s]) => { const m = legMesh(legK === 'round' ? 'round' : 'square', h, 2, W(h, 2, { rotate: true })); m.position.set(s * (w / 2 - 1), h / 2, d / 2 - 1); m.castShadow = true; g.add(m); const m2 = m.clone(); m2.position.z = -d / 2 + 1; g.add(m2); }); [3, 18, 33, 48, 62.5].forEach(y => M(rbox(w - .4, 1, d - .6, .2, 2), W(w, d), 0, y, 0)); const bc = [0x9b7b5b, 0x3f4a3c, 0xd8cbb5, 0x6f6a4c, 0xb8614a]; for (let i = 0; i < 9; i++) { const b = M(new THREE.BoxGeometry(1.4, 9 + (i % 3), 7.5), new THREE.MeshStandardMaterial({ color: bc[i % 5], roughness: .8 }), -w / 2 + 4 + i * 1.6, 18.5 + (9 + (i % 3)) / 2, 0); } M(new THREE.SphereGeometry(3, 20, 14), new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: .4 }), 7, 36.5, 0); for (let i = 0; i < 4; i++) M(new THREE.BoxGeometry(9 - i, 1, 7), new THREE.MeshStandardMaterial({ color: bc[(i + 2) % 5], roughness: .8 }), -5, 49 + i, 0); g.userData.dim = '32 × 13 × 64"'; }
    if (kind === 'chair') { const w = 28, d = 30, sh = 15; [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => { const hh = b < 0 ? 30 : 22; const m = legMesh(legK === 'round' ? 'round' : 'square', hh, 2, W(hh, 2, { rotate: true })); m.position.set(a * (w / 2 - 1), hh / 2, b * (d / 2 - 1)); m.rotation.x = b < 0 ? -.12 : 0; m.castShadow = true; g.add(m); }); [-1, 1].forEach(a => M(rbox(2.2, 1.4, d + 1, .4, 2), W(d, 2), a * (w / 2 - 1), 22.5, 0)); M(new THREE.BoxGeometry(w - 2, 1, d - 2), W(w, d), 0, sh - 2, 0); M(rbox(w - 4, 4, d - 4, 1.6, 4), fab('#e6ddcf'), 0, sh + .5, 1); const bk = M(rbox(w - 4, 15, 4, 1.8, 4), fab('#e6ddcf'), 0, sh + 9, -d / 2 + 4); bk.rotation.x = -.2; M(new THREE.BoxGeometry(w - 2, 1.2, 1.2), W(w, 1), 0, 28, -d / 2 + 1.2); g.userData.dim = '28 × 30 × 30"'; }
    if (kind === 'console') { const w = 48, d = 14, h = 30; legs(w, d, h - 1.2, 1.2, 2); M(rbox(w, 1.3, d, .4, 2), W(w, d), 0, h - .6, 0); M(new THREE.BoxGeometry(w - 2, 4.5, d - 1.5), W(w, 4), 0, h - 4, 0); [-1, 1].forEach(s => M(new THREE.PlaneGeometry(w / 2 - 4, 3), caneMat(w / 2, 3), s * (w / 4 - .5), h - 4, d / 2 - .7)); M(new THREE.BoxGeometry(w - 3, .8, d - 2), W(w, d), 0, 6, 0); g.userData.dim = '48 × 14 × 30"'; }
    if (kind === 'sofa') { // neutral prop, not a Lignarc SKU
      const w = 84, d = 36, cm = fab('#cfc5b6'); M(rbox(w, 9, d, 2, 3), cm, 0, 8.5, 0); [-1, 1].forEach(s => M(rbox(7, 14, d, 2.6, 3), cm, s * (w / 2 - 3.5), 11, 0)); M(rbox(w - 10, 16, 8, 3, 4), cm, 0, 19, -d / 2 + 4); [-1, 1].forEach(s => M(rbox(w / 2 - 6, 5, d - 9, 2.2, 4), cm, s * (w / 4 - 2), 15, 3)); [[-1], [1]].forEach(([s]) => M(rbox(16, 14, 4, 3, 4), fab(s < 0 ? '#6f6a4c' : '#b9774a'), s * (w / 2 - 17), 23, -d / 2 + 9).rotation.x = -.25); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => M(new THREE.CylinderGeometry(.9, .7, 4, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a1e }), a * (w / 2 - 3), 2, b * (d / 2 - 3)));
    }
    g.scale.setScalar(IN);
    return g;
  }

  function buildBedding(dims, palette) {
    const g = new THREE.Group(); const p = palette || {};
    const mW = dims.iw - 1, mL = dims.il - 1, mH = 10, y0 = dims.top - .6;
    const white = new THREE.MeshStandardMaterial({ map: linen(p.sheet || '#f1ede6', true), roughness: .95 });
    const mattress = new THREE.Mesh(rbox(mW, mH, mL, 2.2, 3), white); mattress.position.set(0, y0 + mH / 2, 0); mattress.castShadow = mattress.receiveShadow = true; g.add(mattress);
    const duvetMat = new THREE.MeshStandardMaterial({ map: linen(p.duvet || '#e9e2d6', true), roughness: .95 });
    const duv = new THREE.Mesh(rbox(mW + 3, 2.6, mL * .66, 1.2, 3), duvetMat); duv.position.set(0, y0 + mH + 1.1, mL / 2 - mL * .33 + 1.2); duv.castShadow = duv.receiveShadow = true; g.add(duv);
    [-1, 1].forEach(s => { const d = new THREE.Mesh(rbox(1.2, mH - 1, mL * .66, .5, 2), duvetMat); d.position.set(s * (mW / 2 + 1.3), y0 + mH / 2 + .9, duv.position.z); d.castShadow = true; g.add(d); });
    const fold = new THREE.Mesh(rbox(mW + 3, 3.4, 9, 1.6, 3), duvetMat); fold.position.set(0, y0 + mH + 2, duv.position.z - mL * .33 + 3); fold.castShadow = true; g.add(fold);
    const throwMat = new THREE.MeshStandardMaterial({ map: linen(p.throw || '#6f6a4c', true), roughness: 1 });
    const th = new THREE.Mesh(rbox(mW + 6, 1.6, 16, .8, 2), throwMat); th.position.set(0, y0 + mH + 2.7, mL / 2 - 12); th.rotation.y = .04; th.castShadow = true; g.add(th);
    const thd = new THREE.Mesh(rbox(1, 9, 16, .4, 2), throwMat); thd.position.set(mW / 2 + 3.2, y0 + mH - 1.6, mL / 2 - 12); thd.castShadow = true; g.add(thd);
    const pil = new THREE.MeshStandardMaterial({ map: linen(p.pillow || '#f6f3ee'), roughness: .95 });
    const acc = new THREE.MeshStandardMaterial({ map: linen(p.accent || '#8a6a4a', true), roughness: .95 });
    const pw = Math.min(26, mW / 2 - 3);
    [-1, 1].forEach(s => {
      const a = new THREE.Mesh(rbox(pw, 17, 5.5, 2.6, 4), pil); a.position.set(s * (pw / 2 + 1.2), y0 + mH + 8, -mL / 2 + 5.5); a.rotation.x = -.32; a.castShadow = true; g.add(a);
      const b = new THREE.Mesh(rbox(pw * .82, 14, 5, 2.3, 4), pil); b.position.set(s * (pw / 2 + 1.2), y0 + mH + 6.6, -mL / 2 + 10); b.rotation.x = -.28; b.castShadow = true; g.add(b);
    });
    const ac = new THREE.Mesh(rbox(18, 11, 4.4, 2, 4), acc); ac.position.set(-2, y0 + mH + 5.6, -mL / 2 + 14.5); ac.rotation.set(-.25, .12, 0); ac.castShadow = true; g.add(ac);
    g.scale.setScalar(IN);
    g.userData = { step: 6, home: new THREE.Vector3(), from: new THREE.Vector3(0, 24 * IN, 0), name: 'Nệm & chăn ga' };
    return g;
  }

  function buildRoom(dims, col, theme, ro) {
    ro = ro || {};
    const g = new THREE.Group();
    const wallZ = -dims.ol / 2 - (dims.hasHB ? 4 : 10);
    // floor planks
    const floorTex = canvasTex(1024, 1024, (c, w, h) => {
      const r = rng(9); const ph = 64;
      for (let y = 0; y < h; y += ph) { let x = -r() * 400; while (x < w) { const len = 260 + r() * 340, t = r(); c.fillStyle = `rgb(${200 + t * 22 | 0},${170 + t * 20 | 0},${132 + t * 18 | 0})`; c.fillRect(x, y, len, ph); c.fillStyle = 'rgba(80,50,25,.25)'; c.fillRect(x, y, 2, ph); x += len; }
        c.fillStyle = 'rgba(80,50,25,.28)'; c.fillRect(0, y, w, 2);
        for (let k = 0; k < 18; k++) { c.strokeStyle = `rgba(120,80,45,${.05 + r() * .08})`; c.beginPath(); const yy = y + r() * ph; c.moveTo(0, yy); for (let x2 = 0; x2 < w; x2 += 32) c.lineTo(x2, yy + Math.sin(x2 * .01 + k) * 2); c.stroke(); } }
    }, [3, 3]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .7, envMapIntensity: .4 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    // wall with soft limewash
    const wallTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = theme.wall; c.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '120,100,80'},${r() * .05})`; c.beginPath(); c.arc(r() * w, r() * h, 2 + r() * 14, 0, 6.28); c.fill(); } }, [2, 1]);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(320, 130), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .95 }));
    wall.position.set(0, 65, wallZ); wall.receiveShadow = true; g.add(wall);
    // vertical wall panel slats behind bed (accent)
    const accentW = dims.ow + 50;
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(accentW / 26 - .6, 96, .8), new THREE.MeshStandardMaterial({ color: theme.panel, roughness: .9 })); m.position.set(-accentW / 2 + (i + .5) * accentW / 26, 48, wallZ + .5); m.receiveShadow = true; m.castShadow = true; g.add(m); }
    // side wall (left) with window glow
    const side = new THREE.Mesh(new THREE.PlaneGeometry(240, 130), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .95 }));
    side.rotation.y = Math.PI / 2; side.position.set(-dims.ow / 2 - 70, 65, wallZ + 120); side.receiveShadow = true; g.add(side);
    // rug
    const rugTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = theme.rug; c.fillRect(0, 0, w, h); const r = rng(11); for (let i = 0; i < 6000; i++) { c.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '90,70,50'},${r() * .08})`; c.fillRect(r() * w, r() * h, 2, 2); } c.strokeStyle = 'rgba(110,85,60,.35)'; c.lineWidth = 6; c.strokeRect(22, 22, w - 44, h - 44); c.lineWidth = 2; c.strokeRect(40, 40, w - 80, h - 80); }, [1, 1]);
    const rug = new THREE.Mesh(new THREE.BoxGeometry(dims.ow + 46, .4, dims.ol + 30), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }));
    rug.position.set(0, .2, 18); rug.receiveShadow = true; g.add(rug);
    if (ro.wide) { const rw = new THREE.Mesh(new THREE.PlaneGeometry(240, 130), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .95 })); rw.rotation.y = -Math.PI / 2; rw.position.set(dims.ow / 2 + 74, 65, wallZ + 120); rw.receiveShadow = true; g.add(rw); side.position.x = -dims.ow / 2 - 74; }
    if (!ro.bare) {
    // nightstands
    [-1, 1].forEach((s, i) => {
      const ns = new THREE.Group(); const nx = s * (dims.ow / 2 + 16);
      const body = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 16), woodMat(col, 300 + i, 22, 14)); body.position.y = 17; body.castShadow = body.receiveShadow = true; ns.add(body);
      const dr = new THREE.Mesh(new THREE.BoxGeometry(20.6, .25, .2), new THREE.MeshStandardMaterial({ color: 0x2a1b10 })); dr.position.set(0, 17, 8.05); ns.add(dr);
      [[-9.5, -6.5], [9.5, -6.5], [-9.5, 6.5], [9.5, 6.5]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.8, .6, 10, 8), woodMat(col, 310, 10, 1, { rotate: true })); l.position.set(x, 5, z); l.castShadow = true; ns.add(l); });
      ns.position.set(nx, 0, wallZ + 12); g.add(ns);
      // lamp
      const base = new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 16), new THREE.MeshStandardMaterial({ color: theme.ceramic, roughness: .35, envMapIntensity: .8 })); base.scale.y = 1.2; base.position.set(nx + s * 2, 28, wallZ + 10); base.castShadow = true; g.add(base);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 6, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a40, metalness: .6, roughness: .3 })); stem.position.set(nx + s * 2, 34, wallZ + 10); g.add(stem);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6.5, 8, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xf7ecd8, emissive: 0xffd9a0, emissiveIntensity: .55, side: THREE.DoubleSide, roughness: 1 })); shade.position.set(nx + s * 2, 39, wallZ + 10); g.add(shade);
      const pl = new THREE.PointLight(0xffc98a, .6, 3, 2); pl.position.set(nx + s * 2, 38, wallZ + 10); pl.userData.lamp = true; g.add(pl);
      // book stack on one
      if (s > 0) for (let b = 0; b < 3; b++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(8 - b, 1.1, 6 - b * .4), new THREE.MeshStandardMaterial({ color: [0x9b7b5b, 0x3f4a3c, 0xd8cbb5][b], roughness: .8 })); bk.position.set(nx - 4, 24.6 + b * 1.1, wallZ + 13); bk.rotation.y = b * .2; bk.castShadow = true; g.add(bk); }
    });
    // plant (right corner)
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(7, 5.5, 14, 28), new THREE.MeshStandardMaterial({ color: theme.pot, roughness: .8 })); pot.position.set(dims.ow / 2 + 40, 7, wallZ + 14); pot.castShadow = true; g.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f5228, roughness: .7, side: THREE.DoubleSide });
    const r = rng(21);
    for (let i = 0; i < 46; i++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 6), leafMat); lf.scale.set(1, .18, 2.2);
      const a = r() * 6.28, h = 18 + r() * 44, rad = 2 + r() * 9;
      lf.position.set(dims.ow / 2 + 40 + Math.cos(a) * rad, h, wallZ + 14 + Math.sin(a) * rad); lf.rotation.set(r() * .8, a, r() * .8 - .4); lf.castShadow = true; g.add(lf);
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, 50, 6), new THREE.MeshStandardMaterial({ color: 0x5a4632 })); trunk.position.set(dims.ow / 2 + 40, 36, wallZ + 14); g.add(trunk);
    }
    // wall art (two framed abstracts)
    [[-16, 0], [16, 1]].forEach(([x, k]) => {
      const art = canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#efe8dc'; c.fillRect(0, 0, w, h); const cc = k ? ['#b9774a', '#6f6a4c', '#d9c3a0'] : ['#3f4a3c', '#c9a27a', '#8a5a36']; c.fillStyle = cc[0]; c.beginPath(); c.arc(w * .45, h * .42, 70, 0, 6.28); c.fill(); c.fillStyle = cc[1]; c.fillRect(w * .2, h * .62, w * .6, 60); c.fillStyle = cc[2]; c.beginPath(); c.arc(w * .7, h * .3, 34, 0, 6.28); c.fill(); });
      const f = new THREE.Mesh(new THREE.BoxGeometry(18, 22, 1.2), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? new THREE.MeshStandardMaterial({ map: art, roughness: .9 }) : new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: .5 })));
      f.position.set(x, dims.hasHB ? 66 : 50, wallZ + 1.6); f.castShadow = true; g.add(f);
    });
    g.scale.setScalar(IN);
    return g;
  }

  // ---------- Unboxing: 1-box FBA pack, numbered parts ----------
  function drawLogo(c, x, y, h, color) { // Lignarc wordmark (L-arc + IGNARC), h = cap height px
    const k = h / 34; c.save(); c.translate(x, y - 40 * k); c.scale(k, k); c.strokeStyle = color; c.fillStyle = color; c.lineCap = 'round';
    c.lineWidth = 3.4; c.stroke(new Path2D('M13 5c-1.6 9-1.8 20 .4 29 1.6 5.6 7 7.4 14.6 5.6')); c.lineWidth = 2.1; c.stroke(new Path2D('M3.5 47.5c6-8.6 18-9.4 25.5-1'));
    c.translate(31, 0); c.scale(.8, 1); c.font = '600 40px "Cormorant Garamond", Georgia, serif'; c.textBaseline = 'alphabetic'; try { c.letterSpacing = '2px'; } catch (e) {} c.fillText('IGNARC', 0, 39.5); c.restore();
  }
  function kraft(w, h, print) {
    return canvasTex(w, h, (c, W2, H2) => {
      c.fillStyle = '#c9a274'; c.fillRect(0, 0, W2, H2); const r = rng(77);
      for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() < .5 ? '255,240,215' : '110,75,40'},${r() * .07})`; c.fillRect(r() * W2, r() * H2, 1 + r() * 3, 1); }
      for (let y = 0; y < H2; y += 6) { c.fillStyle = 'rgba(120,85,50,.035)'; c.fillRect(0, y, W2, 2); }
      if (print) print(c, W2, H2);
    });
  }
  function boxPrint(kind) {
    const ink = '#2c2016';
    if (kind === 'top') return kraft(1760, 320, (c, W2, H2) => {
      drawLogo(c, 90, 200, 120, ink);
      c.fillStyle = ink; c.font = '500 30px "Space Mono", monospace'; c.fillText('KUMI · JOINERY BED · KING · SOLID ACACIA', 92, 262);
      c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(1180, 60, 520, 200);
      c.font = '700 34px "Space Mono", monospace'; c.fillText('1 / 1 BOX', 1210, 115); c.font = '400 26px "Space Mono", monospace';
      ['88 × 16 × 9 in · 133 lb', 'Tool-free · 0 screws · <10 min', 'Parts 1–10 + hardware A–C'].forEach((t, i) => c.fillText(t, 1210, 160 + i * 36));
      // this-side-up arrows
      c.lineWidth = 6; [880, 950].forEach(x => { c.beginPath(); c.moveTo(x, 250); c.lineTo(x, 90); c.moveTo(x - 24, 120); c.lineTo(x, 90); c.lineTo(x + 24, 120); c.stroke(); }); c.fillRect(850, 262, 130, 6);
    });
    if (kind === 'side') return kraft(1760, 180, (c) => { drawLogo(c, 70, 128, 78, ink); c.fillStyle = ink; c.font = '500 26px "Space Mono", monospace'; c.fillText('lignarc.com  ·  Made with solid Acacia', 1080, 108); c.strokeStyle = ink; c.lineWidth = 4; c.strokeRect(860, 40, 150, 100); c.beginPath(); c.moveTo(885, 60); c.lineTo(985, 60); c.lineTo(960, 120); c.lineTo(910, 120); c.closePath(); c.stroke(); });
    if (kind === 'sidelow') return kraft(1760, 180, (c) => { drawLogo(c, 70, 165, 46, ink); c.fillStyle = ink; c.font = '500 20px "Space Mono", monospace'; c.fillText('KUMI · KING · 1 / 1', 1380, 160); });
    if (kind === 'end') return kraft(320, 180, (c) => { drawLogo(c, 40, 118, 64, ink); });
    return kraft(256, 256);
  }
  function buildUnbox(opt) {
    const col = opt.color || 'medium'; let seed = 900; const W = (l, c, o) => woodMat(col, seed++, l, c, o);
    const g = new THREE.Group(); const parts = [];
    const BX = 88, BZ = 16, BY = 9, t = .25;
    const kTop = boxPrint('top'), kSide = boxPrint('side'), kLow = boxPrint('sidelow'), kEnd = boxPrint('end'), kIn = kraft(256, 256);
    const M = tx => new THREE.MeshStandardMaterial({ map: tx, roughness: .95 });
    // tray (open top). Faces of BoxGeometry: +x,-x,+y,-y,+z,-z
    const tray = new THREE.Group();
    const wall = (w, h, d, x, y, z, mats) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; tray.add(m); };
    const plain = M(kIn);
    wall(BX, t, BZ, 0, t / 2, 0, plain);
    wall(BX, BY - .3, t, 0, (BY - .3) / 2, BZ / 2 - t / 2, [plain, plain, plain, plain, M(kLow), plain]);
    wall(BX, BY - .3, t, 0, (BY - .3) / 2, -BZ / 2 + t / 2, [plain, plain, plain, plain, plain, M(kLow)]);
    wall(t, BY - .3, BZ, BX / 2 - t / 2, (BY - .3) / 2, 0, [plain, plain, plain, plain, plain, plain]);
    wall(t, BY - .3, BZ, -BX / 2 + t / 2, (BY - .3) / 2, 0, [plain, plain, plain, plain, plain, plain]);
    tray.position.z = -52; g.add(tray);
    // telescoping lid (top + 4in skirt)
    const lid = new THREE.Group(); const sk = 4.2, o = .3;
    const lw = (w, h, d, x, y, z, mats) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; lid.add(m); };
    lw(BX + o, t, BZ + o, 0, sk - t / 2, 0, [plain, plain, M(kTop), plain, plain, plain]);
    lw(BX + o, sk, t, 0, sk / 2, (BZ + o) / 2, [plain, plain, plain, plain, M(kSide), plain]);
    lw(BX + o, sk, t, 0, sk / 2, -(BZ + o) / 2, [plain, plain, plain, plain, plain, M(kSide)]);
    lw(t, sk, BZ + o, (BX + o) / 2, sk / 2, 0, [M(kEnd), plain, plain, plain, plain, plain]);
    lw(t, sk, BZ + o, -(BX + o) / 2, sk / 2, 0, [plain, M(kEnd), plain, plain, plain, plain]);
    lid.position.set(0, BY - sk + .05, -52); lid.userData.home = lid.position.clone(); g.add(lid);
    // tape strip across the lid
    [-38, 38].forEach(x => { const tape = new THREE.Mesh(new THREE.BoxGeometry(2.6, sk + .06, BZ + o + .08), new THREE.MeshStandardMaterial({ color: 0xd9c49c, roughness: .3, transparent: true, opacity: .8 })); tape.position.set(x, sk / 2 + .02, 0); lid.add(tape); });
    // ---- parts: [num, code, name, size(x,y,z), packed center(x,y,z), floor center(x,z), floorRotX, kind]
    const y0 = t; // interior floor
    const L = [];
    const P = (num, name, sz, pk, fl, kind, extra) => L.push(Object.assign({ num, name, sz, pk, fl, kind }, extra || {}));
    // layer 1: 4 headboard modules (37 × 14 × 1), 2 stacks of 2
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => P(1, 'Module headboard', [37, 1, 14], [-19.6 + i * 39.2, y0 + .5 + j * 1, 0], [72, -27 + k * 17.5], 'cane', { idx: k }));
    // layer 2: 12 slats (75.8 × .5 × 2.75): 5 across × 3 high (last row 2)
    for (let k = 0; k < 12; k++) { const r = Math.floor(k / 5), c = k % 5; P(2, 'Slat cuộn (nỉ)', [75.8, .5, 2.75], [-4, y0 + 2 + .25 + r * .5, -5.6 + c * 2.8], [-4, 26], 'slat', { stack: k }); }
    // layer 3 (h 4.75): rails on edge + posts + legs + beam + cleats + cap
    const ly = y0 + 3.5 + 4.75 / 2;
    P(3, 'Ray dọc', [78.1, 4.75, 1.1], [-3, ly, -7.1], [-4, -30], 'rail', { flat: true }); P(3, 'Ray dọc', [78.1, 4.75, 1.1], [-3, ly, -5.95], [-4, -22], 'rail', { flat: true });
    P(4, 'Ray đầu / cuối', [74.1, 4.75, 1.1], [-5, ly, -4.8], [-6, -14], 'rail', { flat: true }); P(4, 'Ray đầu / cuối', [74.1, 4.75, 1.1], [-5, ly, -3.65], [-6, -6], 'rail', { flat: true });
    P(5, 'Cột đầu giường', [48, 2.75, 2.75], [-19.5, y0 + 3.5 + 1.375, -1.6], [-18, 38], 'leg'); P(5, 'Cột đầu giường', [48, 2.75, 2.75], [-19.5, y0 + 3.5 + 1.375, 1.25], [-18, 44], 'leg');
    P(6, 'Chân góc', [14, 2.75, 2.75], [12.6, y0 + 3.5 + 1.375, -1.6], [20, 38], 'leg'); P(6, 'Chân góc', [14, 2.75, 2.75], [12.6, y0 + 3.5 + 1.375, 1.25], [20, 44], 'leg');
    P(7, 'Chân đỡ giữa', [9.7, 2.2, 2.2], [25.4, y0 + 3.5 + 1.1, -1.6], [36, 38], 'leg'); P(7, 'Chân đỡ giữa', [9.7, 2.2, 2.2], [25.4, y0 + 3.5 + 1.1, 1.25], [36, 44], 'leg');
    P(8, 'Dầm giữa', [79.5, 2.8, 1.4], [-3, y0 + 3.5 + 1.4, 3.4], [-4, 2], 'beam');
    P(9, 'Thanh đỡ slat', [78, 1.2, 1], [-3, y0 + 3.5 + .6, 4.7], [-4, 9], 'cleat'); P(9, 'Thanh đỡ slat', [78, 1.2, 1], [-3, y0 + 3.5 + 1.8, 4.7], [-4, 14], 'cleat');
    P(10, 'Nẹp đỉnh headboard', [78, 2.2, 1.2], [-3, y0 + 3.5 + 1.1, 6.6], [-4, 19.5], 'cleat');
    P(0, 'Túi phụ kiện A–C', [6, 3, 5], [37.5, y0 + 3.5 + 1.5, 0], [52, 41], 'bag');
    L.forEach((p, i) => {
      let m;
      const [sx, sy, sz] = p.sz;
      if (p.kind === 'cane') { const cm = caneMat(sx, sz); cm.map.repeat.set(sx / 6, sz / 6); const wm = W(sx, sz); m = new THREE.Group(); const back = new THREE.Mesh(new THREE.BoxGeometry(sx - 2, .25, sz - 2), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: .9 })); back.position.y = -sy / 2 + .15; m.add(back);
        const frm = (w, d, x, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, sy + .02, d), wm); b.position.set(x, 0, z); m.add(b); }; frm(sx, 1.6, 0, -sz / 2 + .8); frm(sx, 1.6, 0, sz / 2 - .8); frm(1.6, sz, -sx / 2 + .8, 0); frm(1.6, sz, sx / 2 - .8, 0);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(sx - 3, sz - 3), cm); pl.rotation.x = -Math.PI / 2; pl.position.y = sy / 2 - .1; m.add(pl); }
      else if (p.kind === 'bag') { m = new THREE.Mesh(rbox(sx, sy, sz, .8, 3), new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: .6, transparent: true, opacity: .92 })); const inner = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 2.4), new THREE.MeshStandardMaterial({ color: 0x3b2a1e })); m.add(inner); }
      else if (p.kind === 'leg') { m = new THREE.Mesh(rbox(sx, sy, sz, .3, 2), W(sx, sy)); }
      else { m = new THREE.Mesh(rbox(sx, sy, sz, .2, 2), W(sx, Math.max(sy, sz))); }
      m.traverse(o2 => { if (o2.isMesh) { o2.castShadow = true; o2.receiveShadow = true; } });
      // floor pose: rails lie flat (rotate about x so the 4.75 face is down)
      const fq = new THREE.Quaternion(); let fh = sy;
      if (p.flat) { fq.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); fh = sz; }
      const fy = p.kind === 'slat' ? .25 + p.stack * .52 : fh / 2;
      p.packP = new THREE.Vector3(p.pk[0], p.pk[1], p.pk[2] - 52); p.packQ = new THREE.Quaternion();
      p.layP = new THREE.Vector3(p.fl[0], fy, p.fl[1]); p.layQ = fq;
      m.position.copy(p.packP); m.userData.part = p; p.m = m; g.add(m); parts.push(p);
    });
    g.scale.setScalar(IN);
    return { group: g, tray, lid, parts, BX, BZ, BY };
  }

  // ---------- viewer ----------
  const THEMES = {
    lifestyle: { bg: 0xe9e2d6, wall: '#e8dfd2', panel: 0xdcd1c1, rug: '#d9cfbf', ceramic: 0xe9e1d3, pot: 0xcdbfa9 },
    studio: { bg: 0xf3efe8 }
  };

  function create(container, o = {}) {
    if (!window.THREE) { container.innerHTML = '<p style="padding:20px">Không tải được thư viện 3D.</p>'; return null; }
    const opts = Object.assign({ mode: 'lifestyle', headboard: 'geo', color: 'medium', size: 'King', autoRotate: false, controls: true, preserve: false }, o);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!opts.preserve, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block'; renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    if (THREE.RoomEnvironment) scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), .04).texture;
    const camera = new THREE.PerspectiveCamera(32, 1, .05, 60);
    const hemi = new THREE.HemisphereLight(0xfff4e6, 0x9c8468, .32); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffdcb0, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -3; sun.shadow.camera.right = 3; sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3; sun.shadow.camera.far = 12; sun.shadow.bias = -0.0004; sun.shadow.radius = 6;
    scene.add(sun); scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0xdfe8ff, .25); fill.position.set(2.5, 2, 3); scene.add(fill);
    let controls = null;
    if (opts.controls && THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 1.6; controls.maxDistance = 7.5; controls.maxPolarAngle = Math.PI * .49; controls.enablePan = false;
      controls.autoRotate = opts.autoRotate; controls.autoRotateSpeed = .6;
      controls.addEventListener('change', () => wake());
    }
    let bed, bedding, room, ghost = [], items = [], ub = null, labels = [], tw = [], overlay = null;
    let step = 99, anim = [];
    function build() {
      [bed && bed.root, bedding, room, ...items].forEach(x => x && scene.remove(x)); items = [];
      bed = buildBed(opts);
      bedding = buildBedding(bed.dims);
      if (!['piece', 'living', 'unbox'].includes(opts.mode)) { scene.add(bed.root); scene.add(bedding); }
      if (ub) { scene.remove(ub.group); ub = null; } labels.forEach(l => l.el.remove()); labels = [];
      if (opts.mode === 'lifestyle') { room = buildRoom(bed.dims, opts.color, THEMES.lifestyle); scene.add(room); scene.background = new THREE.Color(THEMES.lifestyle.bg); }
      else if (opts.mode === 'piece') {
        room = new THREE.Group(); const sh = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .22 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; room.add(sh); scene.add(room); scene.background = new THREE.Color(THEMES.studio.bg);
        const it = piece(opts.kind || 'nightstand', opts.color, opts.legs); scene.add(it); items.push(it);
        const bb = new THREE.Box3().setFromObject(it), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()); const r = Math.max(sz.x, sz.y, sz.z);
        VIEWS.piece = [[c.x + r * 1.25, c.y + r * .75, c.z + r * 1.7], [c.x, c.y * .9, c.z]]; camSet = false; opts.view = 'piece';
      }
      else if (opts.mode === 'living') {
        const d = { ow: 76, ol: 84, hasHB: true }; const wallZ = -46;
        room = new THREE.Group(); room.add(buildRoom(d, opts.color, THEMES.lifestyle, { bare: true, wide: true })); scene.add(room); scene.background = new THREE.Color(THEMES.lifestyle.bg);
        const sofa = piece('sofa', opts.color, opts.legs); sofa.position.set(0, 0, 62 * IN); sofa.rotation.y = Math.PI; room.add(sofa);
        const tv = new THREE.Mesh(new THREE.BoxGeometry(50 * IN, 28.5 * IN, 1.2 * IN), [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshStandardMaterial({ color: i === 4 ? 0x15171a : 0x222222, roughness: i === 4 ? .15 : .5, metalness: .2 }))); tv.position.set(0, 36.6 * IN, (wallZ + 6) * IN); tv.castShadow = true; room.add(tv);
        const P = [['tvstand', 0, wallZ + 9, 0, 'Kumi TV stand'], ['coffee', 0, 24, 0, 'Kumi coffee table'], ['chair', -50, 16, Math.PI / 2 - .5, 'Kumi accent chair'], ['sidetable', 54, 60, 0, 'Kumi side table'],
          ['sideboard', -(d.ow / 2 + 74) + 9, 2, Math.PI / 2, 'Kumi sideboard'], ['bookshelf', d.ow / 2 + 74 - 7, -18, -Math.PI / 2, 'Kumi bookshelf'], ['console', d.ow / 2 + 74 - 8, 34, -Math.PI / 2, 'Kumi console']];
        P.forEach(([k, x, z, r, name]) => { const it = piece(k, opts.color, opts.legs); it.position.set(x * IN, 0, z * IN); it.rotation.y = r; it.userData.name = name; it.userData.home = it.position.clone(); it.userData.kind = k; it.userData.base = it.scale.x; scene.add(it); items.push(it); if (opts.hideItems) it.visible = false; });
        VIEWS.living = [[1.6, 2.6, 5.4], [-.1, .35, -.1]]; opts.view = opts.view || 'living';
      }
      else if (opts.mode === 'unbox') {
        room = new THREE.Group(); const sh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: .2 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; room.add(sh); scene.add(room); scene.background = new THREE.Color(0xeee9e1);
        ub = buildUnbox(opts); scene.add(ub.group);
        if (!overlay) { overlay = document.createElement('div'); overlay.className = 'ub-ov'; container.style.position = container.style.position || 'relative'; container.appendChild(overlay); }
        const seen = {}; ub.parts.forEach(p => { (seen[p.num] = seen[p.num] || []).push(p); });
        labels = Object.entries(seen).map(([num, ps]) => { const c = ps.reduce((a, p) => a.add(p.layP), new THREE.Vector3()).multiplyScalar(1 / ps.length); c.y += 3; const el = document.createElement('div'); el.className = 'ub-l'; el.innerHTML = `<b>${+num ? num : 'A–C'}</b><span>${ps[0].name}${ps.length > 1 ? ' ×' + ps.length : ''}</span>`; overlay.appendChild(el); return { el, pos: c.multiplyScalar(IN), ps, show: false }; });
        VIEWS.boxclose = [[1.9, 1.35, .35], [.05, .08, -1.32]]; VIEWS.layout = [[.65, 5.1, 2.6], [.6, 0, -.5]]; opts.view = opts.view || 'boxclose';
        ub.parts.forEach(p => { p.m.position.copy(p.packP); p.m.quaternion.copy(p.packQ); }); ub.lid.position.copy(ub.lid.userData.home); ub.lid.quaternion.identity();
      }
      else if (opts.mode === 'collection') {
        room = buildRoom(bed.dims, opts.color, THEMES.lifestyle, { bare: true, wide: true }); scene.add(room); scene.background = new THREE.Color(THEMES.lifestyle.bg);
        const d = bed.dims, wallZ = -d.ol / 2 - (d.hasHB ? 4 : 10);
        const P = [['nightstand', -(d.ow / 2 + 15), wallZ + 9, 0, 'Nightstand'], ['nightstand', d.ow / 2 + 15, wallZ + 9, 0, 'Nightstand'], ['bench', 0, d.ol / 2 + 15, 0, 'Bench / Ottoman'],
          ['dresser', -(d.ow / 2 + 63), 6, Math.PI / 2, 'Dresser'], ['wardrobe', d.ow / 2 + 61, -14, -Math.PI / 2, 'Wardrobe'], ['drawers', d.ow / 2 - 4, 10, -Math.PI / 2, 'Hộc kéo gầm giường']];
        P.forEach(([k, x, z, r, name], i) => { const it = piece(k, opts.color, opts.legs); it.position.set(x * IN, 0, z * IN); it.rotation.y = r; it.userData.name = name; it.userData.home = it.position.clone(); it.userData.kind = k; it.userData.base = it.scale.x;
          if (k === 'nightstand') { const lamp = new THREE.Group(); const base = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 16), new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: .35 })); base.scale.y = 1.2; base.position.y = 29; base.castShadow = true; lamp.add(base); const sh = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 6.2, 7.5, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xf7ecd8, emissive: 0xffd9a0, emissiveIntensity: .55, side: THREE.DoubleSide })); sh.position.y = 37; lamp.add(sh); const pl = new THREE.PointLight(0xffc98a, .5, 3, 2); pl.position.y = 36; lamp.add(pl); lamp.scale.setScalar(1); it.add(lamp); }
          scene.add(it); items.push(it); if (opts.hideItems) it.visible = false; });
        bedding.visible = true;
      }
      else {
        room = new THREE.Group();
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .22 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; room.add(sh);
        scene.add(room); scene.background = new THREE.Color(THEMES.studio.bg);
      }
      scene.traverse(o => { if (o.isMesh) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && m.envMapIntensity === 1) m.envMapIntensity = .28; }); } });
      if (opts.mode === 'assembly') { bedding.visible = false; }
      const d = bed.dims;
      sun.position.set(-2.4, 3.6, 2.6); sun.target.position.set(0, .2, 0);
      if (!camSet) { setView(opts.view || (opts.mode === 'lifestyle' ? 'hero' : 'three')); }
      if (opts.mode === 'assembly') setStep(step === 99 ? 0 : step, true);
      wake();
    }
    let camSet = false;
    const VIEWS = {
      hero: [[2.75, 1.45, 3.9], [0, .45, -.2]],
      three: [[2.6, 1.7, 3.0], [0, .3, 0]],
      front: [[0, .9, 4.4], [0, .45, 0]],
      side: [[4.2, .9, 0], [0, .4, 0]],
      top: [[0, 5, .01], [0, 0, 0]],
      detail: [[1.55, .6, 1.85], [.9, .22, 1.0]],
      asm: [[3.3, 2.5, 4.4], [0, .3, 0]],
      room: [[0.2, 2.35, 6.4], [0, .55, -.4]],
      roomL: [[2.6, 1.9, 4.6], [-.6, .5, -.5]]
    };
    function setView(v) {
      const p = VIEWS[v] || VIEWS.three; camSet = true;
      tweenCam(new THREE.Vector3(...p[0]), new THREE.Vector3(...p[1]), camSet && anim.length >= 0 ? .9 : 0);
    }
    let camTween = null;
    function tweenCam(pos, tgt, dur) {
      const tg = controls ? controls.target : new THREE.Vector3();
      if (!dur) { camera.position.copy(pos); tg.copy(tgt); camera.lookAt(tgt); camTween = null; wake(); return; }
      camTween = { p0: camera.position.clone(), t0: tg.clone(), p1: pos, t1: tgt, start: performance.now(), dur: dur * 1000 };
      wake();
    }
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function setStep(n, instant) {
      step = n;
      const all = bed.parts.concat([bedding]);
      all.forEach(m => {
        const u = m.userData; const done = u.step <= n;
        const target = done ? u.home.clone() : u.home.clone().add(u.from);
        if (m === bedding) { m.visible = n >= 6; }
        if (instant) { m.position.copy(target); setGlow(m, false); return; }
        anim.push({ m, p0: m.position.clone(), p1: target, start: performance.now() + (u.step === n ? (u.delay || 0) * 1000 : 0), dur: u.step === n ? 1100 : 600, glow: u.step === n && done, spin: u.spin && u.step === n });
      });
      wake();
    }
    function setGlow(m, on) {
      m.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach(mt => { if (mt && mt.emissive) { mt.emissive.setHex(on ? 0xff9a3c : 0x000000); mt.emissiveIntensity = on ? .35 : 0; } }); } });
    }
    function resize() {
      const w = container.clientWidth || 800, h = container.clientHeight || 500;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); wake();
    }
    let running = false, visible = true, lastInteract = 0, pops = [];
    function wake() { lastInteract = performance.now(); if (!running && visible) { running = true; requestAnimationFrame(loop); } }
    function loop(t) {
      if (!visible) { running = false; return; }
      let busy = false;
      if (camTween) {
        const k = clamp((t - camTween.start) / camTween.dur, 0, 1), e = ease(k);
        camera.position.lerpVectors(camTween.p0, camTween.p1, e);
        const tg = controls ? controls.target : new THREE.Vector3(); tg.lerpVectors(camTween.t0, camTween.t1, e); if (!controls) camera.lookAt(tg);
        if (k >= 1) camTween = null; busy = true;
      }
      if (pops.length) { pops = pops.filter(a => { const k = clamp((t - a.start) / a.dur, 0, 1); if (k <= 0) return true; a.m.visible = true; const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); a.m.position.set(a.home.x, a.home.y + (1 - Math.min(1, e)) * 1.6, a.home.z); a.m.scale.setScalar(a.base * (.35 + .65 * Math.min(1.08, e))); if (k >= 1) { a.m.scale.setScalar(a.base); a.m.position.copy(a.home); } return k < 1; }); busy = true; }
      if (anim.length) {
        anim = anim.filter(a => {
          const k = clamp((t - a.start) / a.dur, 0, 1), e = ease(k);
          a.m.position.lerpVectors(a.p0, a.p1, e);
          if (a.spin) a.m.rotation.y = e * Math.PI * 4;
          setGlow(a.m, a.glow && k > 0 && k < 1);
          if (k >= 1) { setGlow(a.m, false); if (a.glow) flash(a.m); }
          return k < 1;
        });
        busy = true;
      }
      if (tw.length) { tw = tw.filter(a => { const k = clamp((t - a.start) / a.dur, 0, 1); if (k <= 0) return true; const e = ease(k); a.m.position.lerpVectors(a.p0, a.p1, e); if (a.arc) a.m.position.y += Math.sin(Math.PI * e) * a.arc; if (a.q1) a.m.quaternion.copy(a.q0).slerp(a.q1, e); if (k >= 1 && a.done) a.done(); return k < 1; }); busy = true; }
      if (controls) { controls.update(); if (controls.autoRotate) busy = true; }
      renderer.render(scene, camera);
      if (labels.length) { const w = container.clientWidth, h = container.clientHeight; labels.forEach(l => { if (!l.show) { l.el.style.opacity = 0; return; } const v = l.pos.clone().project(camera); l.el.style.opacity = 1; l.el.style.transform = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%)`; }); }
      if (busy || t - lastInteract < 1500) requestAnimationFrame(loop); else running = false;
    }
    function flash(m) { setGlow(m, true); setTimeout(() => { setGlow(m, false); wake(); }, 380); }
    const ro = new ResizeObserver(resize); ro.observe(container);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(container);
    build(); resize();
    return {
      set(k, v) { opts[k] = v; build(); },
      setView, setStep: n => setStep(n), get step() { return step; },
      setAutoRotate(v) { if (controls) { controls.autoRotate = v; wake(); } },
      renderNow() { renderer.render(scene, camera); },
      playCollection(gap) { const t0 = performance.now() + 200; items.forEach((it, i) => { it.visible = false; it.scale.setScalar(it.userData.base * .01); pops.push({ m: it, base: it.userData.base, home: it.userData.home.clone(), start: t0 + i * (gap || 650), dur: 900 }); }); wake(); },
      resetCollection() { items.forEach(it => { it.visible = false; }); wake(); },
      showAll() { items.forEach(it => { it.visible = true; it.scale.setScalar(it.userData.base); it.position.copy(it.userData.home); }); wake(); },
      focus(name) { const it = items.find(x => x.userData.kind === name); if (!it) return; const p = it.userData.home; tweenCam(new THREE.Vector3(p.x * .55 + (p.x >= 0 ? .2 : -.2), 1.4, p.z + 2.6), new THREE.Vector3(p.x, .45, p.z), .9); },
      unbox() { if (!ub) return; const t0 = performance.now() + 100; labels.forEach(l => l.show = false);
        const lid = ub.lid, lh = lid.userData.home; tw.push({ m: lid, p0: lh.clone(), p1: lh.clone().add(new THREE.Vector3(0, 26, 0)), start: t0, dur: 700 });
        tw.push({ m: lid, p0: lh.clone().add(new THREE.Vector3(0, 26, 0)), p1: new THREE.Vector3(0, .2, -80), q0: new THREE.Quaternion(), q1: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), start: t0 + 700, dur: 900 });
        // lid ends upside down: shift so it rests on the floor
        tw[tw.length - 1].p1.y = 4.4;
        setTimeout(() => setView('layout'), 1300);
        const order = ub.parts.slice().sort((a, b) => b.packP.y - a.packP.y || a.num - b.num);
        order.forEach((p, i) => { const st = t0 + 1700 + i * 110; tw.push({ m: p.m, p0: p.packP.clone(), p1: p.layP.clone(), q0: p.packQ.clone(), q1: p.layQ.clone(), start: st, dur: 1000, arc: 26 + (i % 3) * 6, done: () => { const l = labels.find(L => L.ps.includes(p)); if (l) l.show = true; } }); });
        wake(); return 1700 + order.length * 110 + 1000; },
      resetUnbox() { if (!ub) return; tw = []; labels.forEach(l => l.show = false); ub.parts.forEach(p => { p.m.position.copy(p.packP); p.m.quaternion.copy(p.packQ); }); ub.lid.position.copy(ub.lid.userData.home); ub.lid.quaternion.identity(); setView('boxclose'); wake(); },
      showLaid() { if (!ub) return; tw = []; ub.parts.forEach(p => { p.m.position.copy(p.layP); p.m.quaternion.copy(p.layQ); }); ub.lid.position.set(0, 4.4, -80); ub.lid.quaternion.setFromEuler(new THREE.Euler(Math.PI, 0, 0)); labels.forEach(l => l.show = true); wake(); },
      get items() { return items.map(i => i.userData.name); },
      canvas: renderer.domElement, colors: COLORS
    };
  }

  window.Bed3D = { create, COLORS };
})();
