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

  // ---------- bed builder ----------
  function buildBed(opt) {
    const S = SIZES[opt.size || 'King'], col = opt.color || 'medium', hb = opt.headboard || 'geo';
    const iw = S.mw + 1, il = S.ml + 1, rt = 1.1, rh = 4.75, top = 14, leg = 2.8;
    const ow = iw + 2 * rt, ol = il + 2 * rt;
    const root = new THREE.Group();
    const parts = []; // {mesh, step, from:Vector3 offset, rot?}
    const add = (geo, mat, x, y, z, step, from, name) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      m.userData = { step, home: m.position.clone(), from: from || new THREE.Vector3(), name };
      root.add(m); parts.push(m); return m;
    };
    let seed = 1;
    const W = (len, cross, o) => woodMat(col, seed++, len, cross, o);
    const hasHB = hb !== 'none';
    const zH = -ol / 2, zF = ol / 2, xL = -ow / 2, xR = ow / 2;

    // legs (tapered) – head legs become posts when headboard present
    const legGeo = (h, t0, t1) => { const g = new THREE.CylinderGeometry(t1 * Math.SQRT1_2, t0 * Math.SQRT1_2, h, 4, 1); g.rotateY(Math.PI / 4); return g; };
    const legPos = [[xL + leg / 2 - .3, zF - leg / 2 + .3], [xR - leg / 2 + .3, zF - leg / 2 + .3], [xL + leg / 2 - .3, zH + leg / 2 - .3], [xR - leg / 2 + .3, zH + leg / 2 - .3]];
    legPos.forEach(([x, z], i) => {
      const head = i >= 2, post = head && hasHB, h = post ? 48 : top;
      const m = add(legGeo(h, leg * .78, leg), W(h, leg, { rotate: true }), x, h / 2, z, 1, new THREE.Vector3(x > 0 ? 12 : -12, 12, z > 0 ? 12 : -12), post ? 'Cột đầu giường' : 'Chân góc');
      m.rotation.y = 0;
    });
    // end rails (head & foot) – with protruding "cross" ends past the legs
    const endLen = ow + 2.4;
    add(new THREE.BoxGeometry(endLen, rh, rt), W(endLen, rh), 0, top - rh / 2, zF - rt / 2 - .9, 1, new THREE.Vector3(0, 14, 16), 'Ray cuối');
    add(new THREE.BoxGeometry(endLen, rh, rt), W(endLen, rh), 0, top - rh / 2, zH + rt / 2 + .9, 1, new THREE.Vector3(0, 14, -16), 'Ray đầu');
    // side rails – slide into the legs (step 2)
    const sideLen = ol + 2.4;
    add(new THREE.BoxGeometry(rt, rh, sideLen), W(sideLen, rh, { rotate: false }), xL + rt / 2 + .9, top - rh / 2, 0, 2, new THREE.Vector3(-22, 8, 0), 'Ray dọc trái');
    add(new THREE.BoxGeometry(rt, rh, sideLen), W(sideLen, rh), xR - rt / 2 - .9, top - rh / 2, 0, 2, new THREE.Vector3(22, 8, 0), 'Ray dọc phải');
    // wedges (kusabi) – 8, drop in from above
    const wedgeMat = woodMat(col === 'choco' || col === 'walnut' ? 'natural' : 'walnut', 99, 3, 1, { kind: 'plain' });
    legPos.forEach(([x, z]) => {
      [[x + (x > 0 ? 1.9 : -1.9), z], [x, z + (z > 0 ? 1.9 : -1.9)]].forEach(([wx, wz]) => {
        const g = new THREE.BoxGeometry(.55, 2.6, .9);
        add(g, wedgeMat, wx, top - 1.3, wz, 2, new THREE.Vector3(0, 10, 0), 'Nêm gỗ');
      });
    });
    // inner cleats
    [xL + rt + .9 + .5, xR - rt - .9 - .5].forEach((x, i) => add(new THREE.BoxGeometry(1, 1.4, il - 2), W(il, 1.4), x, top - 2.2, 0, 2, new THREE.Vector3(i ? 22 : -22, 8, 0), 'Thanh đỡ slat'));
    // center beam + support legs (step 3)
    add(new THREE.BoxGeometry(1.4, 3, il - 1.2), W(il, 3), 0, top - 2.2 - 1.5 + .7, 0, 3, new THREE.Vector3(0, 16, 0), 'Dầm giữa');
    [-il / 4, il / 4].forEach(z => add(legGeo(top - 4.2, 2.2, 2.6), W(10, 2.6, { rotate: true }), 0, (top - 4.2) / 2, z, 3, new THREE.Vector3(0, 16, 0), 'Chân đỡ giữa'));
    // slats (step 4)
    const nS = 12, gap = (il - nS * 2.8) / (nS + 1);
    for (let i = 0; i < nS; i++) {
      const z = zH + rt + .9 + gap + 1.4 + i * (2.8 + gap);
      const m = add(new THREE.BoxGeometry(iw - 1.2, .55, 2.8), W(iw, 2.8), 0, top - .85, z, 4, new THREE.Vector3(0, 8 + i * .7, 0), 'Slat');
      m.userData.delay = i * 0.05;
    }
    // headboard (step 5)
    if (hasHB) {
      const pw = ow - 2 * leg + .4, ph = 28, py = 33, pz = zH + leg / 2 - .3;
      const panel = new THREE.Group(); panel.position.set(0, py, pz);
      const backing = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, .7), new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${COLORS[col].dark.map(v => v * .55 | 0).join(',')})`).convertSRGBToLinear(), roughness: .8 }));
      backing.position.z = -.5; backing.castShadow = backing.receiveShadow = true; panel.add(backing);
      if (hb === 'geo') {
        // geometric tiles: slanted cuts shared between neighbours so every groove is even
        const rowsCuts = [[[0, 0], [.22, .27], [.47, .41], [.71, .77], [1, 1]], [[0, 0], [.27, .21], [.41, .55], [.77, .70], [1, 1]]];
        const gap = .32;
        rowsCuts.forEach((cuts, ri) => {
          const yb = -ph / 2 + ri * ph / 2, yt = yb + ph / 2;
          for (let ci = 0; ci < cuts.length - 1; ci++) {
            const xb0 = -pw / 2 + cuts[ci][0] * pw + (ci ? gap : 0), xt0 = -pw / 2 + cuts[ci][1] * pw + (ci ? gap : 0);
            const xb1 = -pw / 2 + cuts[ci + 1][0] * pw - (ci < cuts.length - 2 ? gap : 0), xt1 = -pw / 2 + cuts[ci + 1][1] * pw - (ci < cuts.length - 2 ? gap : 0);
            const y0 = yb + (ri ? gap : 0), y1 = yt - (ri ? 0 : gap);
            const sh = new THREE.Shape(); sh.moveTo(xb0, y0); sh.lineTo(xb1, y0); sh.lineTo(xt1, y1); sh.lineTo(xt0, y1); sh.closePath();
            const g = new THREE.ExtrudeGeometry(sh, { depth: .55, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1 });
            const m = new THREE.Mesh(g, woodMat(col, 200 + ci * 3 + ri, 10, 10, { rotate: (ci + ri) % 2 === 0 }));
            m.material.map.repeat.set(.05, .05);
            m.position.z = -.25; m.castShadow = m.receiveShadow = true; panel.add(m);
          }
        });
      } else if (hb === 'diag') {
        const nx = 4, ny = 2, tw = pw / nx, th = ph / ny;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const tex = new THREE.CanvasTexture(diagCanvas(col, i % 2)); tex.encoding = THREE.sRGBEncoding;
          const bump = new THREE.CanvasTexture(diagCanvas(col, i % 2));
          const m = new THREE.Mesh(new THREE.BoxGeometry(tw - .35, th - .35, .6), [W(tw, 1), W(tw, 1), W(tw, 1), W(tw, 1), new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: .9, roughness: .6, envMapIntensity: .5 }), W(tw, 1)]);
          m.position.set(-pw / 2 + tw * (i + .5), -ph / 2 + th * (j + .5), 0); m.castShadow = m.receiveShadow = true; panel.add(m);
        }
      } else if (hb === 'slat') {
        const n = 11, sw = pw / n;
        for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(sw - .7, ph, 1), W(ph, sw, { rotate: true })); m.position.set(-pw / 2 + sw * (i + .5), 0, 0); m.castShadow = m.receiveShadow = true; panel.add(m); }
      }
      // top cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(pw + 2 * leg, 1.4, 2.2), W(pw, 2)); cap.position.set(0, ph / 2 + .7, 0); cap.castShadow = true; panel.add(cap);
      panel.userData = { step: 5, home: panel.position.clone(), from: new THREE.Vector3(0, 14, -10), name: 'Headboard' };
      root.add(panel); parts.push(panel);
      // hand knobs
      [-pw / 2 - leg / 2, pw / 2 + leg / 2].forEach(x => {
        const k = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .8, 24), new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: .45, metalness: .2 }));
        k.rotation.x = Math.PI / 2; k.position.set(x, 40, pz - leg / 2 - .5); k.castShadow = true;
        k.userData = { step: 5, home: k.position.clone(), from: new THREE.Vector3(0, 0, -6), name: 'Núm vặn tay', spin: true };
        root.add(k); parts.push(k);
      });
    }
    root.scale.setScalar(IN);
    return { root, parts, dims: { ow, ol, top, hasHB, il, iw } };
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

  function buildRoom(dims, col, theme) {
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
    // wall art (two framed abstracts)
    [[-16, 0], [16, 1]].forEach(([x, k]) => {
      const art = canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#efe8dc'; c.fillRect(0, 0, w, h); const cc = k ? ['#b9774a', '#6f6a4c', '#d9c3a0'] : ['#3f4a3c', '#c9a27a', '#8a5a36']; c.fillStyle = cc[0]; c.beginPath(); c.arc(w * .45, h * .42, 70, 0, 6.28); c.fill(); c.fillStyle = cc[1]; c.fillRect(w * .2, h * .62, w * .6, 60); c.fillStyle = cc[2]; c.beginPath(); c.arc(w * .7, h * .3, 34, 0, 6.28); c.fill(); });
      const f = new THREE.Mesh(new THREE.BoxGeometry(18, 22, 1.2), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? new THREE.MeshStandardMaterial({ map: art, roughness: .9 }) : new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: .5 })));
      f.position.set(x, dims.hasHB ? 66 : 50, wallZ + 1.6); f.castShadow = true; g.add(f);
    });
    g.scale.setScalar(IN);
    return g;
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
    let bed, bedding, room, ghost = [];
    let step = 99, anim = [];
    function build() {
      [bed && bed.root, bedding, room].forEach(x => x && scene.remove(x));
      bed = buildBed(opts);
      scene.add(bed.root);
      bedding = buildBedding(bed.dims); scene.add(bedding);
      if (opts.mode === 'lifestyle') { room = buildRoom(bed.dims, opts.color, THEMES.lifestyle); scene.add(room); scene.background = new THREE.Color(THEMES.lifestyle.bg); }
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
      asm: [[3.3, 2.5, 4.4], [0, .3, 0]]
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
    let running = false, visible = true, lastInteract = 0;
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
      if (controls) { controls.update(); if (controls.autoRotate) busy = true; }
      renderer.render(scene, camera);
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
      canvas: renderer.domElement, colors: COLORS
    };
  }

  window.Bed3D = { create, COLORS };
})();
