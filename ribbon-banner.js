/* RibbonBanner 3D - pita emas berlipat sebagai frame teks (Three.js r128, UMD) */
(function () {
  'use strict';
  if (!window.THREE) { console.warn('RibbonBanner: three.js belum dimuat'); return; }
  var THREE = window.THREE;

  var DEFAULTS = {
    text: 'Happy Wedding Anniversary',
    font: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
    fontStyle: 'italic 700',
    textColor: '#08183a',
    googleFont: true,   // muat Cormorant Garamond dari Google Fonts
    sparkles: true,     // kilau emas di sekitar pita
    width: 6, height: 0.95, tail: 2.1, drop: 0.38, notch: 0.5,
    bow: 0.35,      // lengkung band ke depan
    wave: 0.26,     // kekuatan kibaran
    start: 'view',      // 'view' = terurai saat terlihat di layar, 'load' = langsung, 'manual' = panggil .unfurl()
    duration: 3.8,      // detik
    aspect: 3.8     // rasio lebar:tinggi kontainer bila tinggi belum diatur
  };

  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ---------- tekstur emas satin (+ teks) ---------- */
  function spacedWidth(g, text, size, track) {
    if ('letterSpacing' in g) { g.letterSpacing = (size * track) + 'px'; var w = g.measureText(text).width - size * track; return w; }
    var w2 = 0; for (var i = 0; i < text.length; i++) w2 += g.measureText(text[i]).width + size * track;
    return w2 - size * track;
  }
  function spacedFill(g, text, x, y, size, track) {
    if ('letterSpacing' in g) { g.letterSpacing = (size * track) + 'px'; g.fillText(text, x, y); g.letterSpacing = '0px'; return; }
    for (var i = 0; i < text.length; i++) { g.fillText(text[i], x, y); x += g.measureText(text[i]).width + size * track; }
  }
  function diamond(g, x, y, r) {
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill();
  }

  function paintSatin(c, o, withText) {
    var W = c.width, H = c.height, g = c.getContext('2d'), i;
    g.clearRect(0, 0, W, H);
    var v = g.createLinearGradient(0, 0, 0, H);
    [[0, '#74510b'], [0.05, '#c9972f'], [0.14, '#f1d37e'], [0.3, '#fff4c9'], [0.46, '#f3d88a'],
     [0.62, '#d7a63f'], [0.8, '#b8841f'], [0.93, '#e9c668'], [1, '#6a4808']].forEach(function (st) { v.addColorStop(st[0], st[1]); });
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    var h = g.createLinearGradient(0, 0, W, 0);
    h.addColorStop(0, 'rgba(0,0,0,.3)'); h.addColorStop(0.1, 'rgba(0,0,0,0)');
    h.addColorStop(0.5, 'rgba(255,255,255,.1)');
    h.addColorStop(0.9, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,.3)');
    g.fillStyle = h; g.fillRect(0, 0, W, H);
    // kilau satin diagonal
    var d = g.createLinearGradient(0, 0, W * 0.5, H * 3);
    [0.15, 0.3, 0.55, 0.8].forEach(function (p, k) {
      d.addColorStop(Math.max(0, p - 0.05), 'rgba(255,255,255,0)');
      d.addColorStop(p, 'rgba(255,255,255,' + (k % 2 ? 0.1 : 0.16) + ')');
      d.addColorStop(Math.min(1, p + 0.05), 'rgba(255,255,255,0)');
    });
    g.fillStyle = d; g.fillRect(0, 0, W, H);
    // anyaman halus
    g.lineWidth = 1; g.strokeStyle = '#5a3a05';
    g.globalAlpha = 0.06; for (i = 0; i < W; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); }
    g.globalAlpha = 0.035; for (i = 0; i < H; i += 4) { g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
    g.globalAlpha = 1;
    // piping tepi atas & bawah
    var pe = H * 0.06;
    var pt = g.createLinearGradient(0, 0, 0, pe); pt.addColorStop(0, 'rgba(70,45,5,.75)'); pt.addColorStop(1, 'rgba(70,45,5,0)');
    g.fillStyle = pt; g.fillRect(0, 0, W, pe);
    var pb = g.createLinearGradient(0, H, 0, H - pe); pb.addColorStop(0, 'rgba(70,45,5,.75)'); pb.addColorStop(1, 'rgba(70,45,5,0)');
    g.fillStyle = pb; g.fillRect(0, H - pe, W, pe);
    // jahitan putus-putus
    var m = H * 0.15;
    g.lineWidth = 3;
    [[m, 'rgba(92,60,6,.8)', 0], [m + 3.5, 'rgba(255,245,196,.65)', 0],
     [H - m, 'rgba(92,60,6,.8)', 0], [H - m + 3.5, 'rgba(255,245,196,.5)', 0]].forEach(function (l) {
      g.setLineDash([16, 11]); g.strokeStyle = l[1]; g.beginPath(); g.moveTo(0, l[0]); g.lineTo(W, l[0]); g.stroke();
    });
    g.setLineDash([]);
  }

  function paintText(c, o) {
    var W = c.width, H = c.height, g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    var text = o.text, track = 0.035, size = H * 0.6, maxW = W * 0.72, w;
    for (;;) {
      g.font = o.fontStyle + ' ' + size + 'px ' + o.font;
      w = spacedWidth(g, text, size, track);
      if (w <= maxW || size < 24) break;
      size -= 3;
    }
    g.textBaseline = 'middle'; g.textAlign = 'left';
    var cx = (W - w) / 2, cy = H / 2 + H * 0.012, e = size * 0.006;
    g.fillStyle = 'rgba(255,248,214,.8)'; spacedFill(g, text, cx, cy + size * 0.03, size, track);
    g.fillStyle = o.textColor;
    [[-e, 0], [e, 0], [0, -e], [0, e], [0, 0]].forEach(function (d) { spacedFill(g, text, cx + d[0], cy + d[1], size, track); });
    var gap = size * 0.45, len = W * 0.065, r = size * 0.11;
    g.strokeStyle = o.textColor; g.fillStyle = o.textColor; g.lineWidth = size * 0.018;
    [-1, 1].forEach(function (sd) {
      var x0 = sd < 0 ? cx - gap : cx + w + gap;
      g.beginPath(); g.moveTo(x0, cy); g.lineTo(x0 + sd * len, cy); g.stroke();
      diamond(g, x0 + sd * (len + r * 1.6), cy, r);
    });
  }

  function ensureFont(o) {
    if (!o.googleFont || !document.fonts) return Promise.resolve();
    var fam = (o.font.split(',')[0] || '').replace(/["']/g, '').trim();
    if (!document.getElementById('rb-font')) {
      var l = document.createElement('link'); l.id = 'rb-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + fam.replace(/ /g, '+') + ':ital,wght@1,600;1,700&display=swap';
      document.head.appendChild(l);
    }
    return document.fonts.load(o.fontStyle + ' 48px "' + fam + '"').catch(function () {});
  }

  function weaveBump() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    var g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 1024, 256);
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.12)';
    for (var x = 0; x < 1024; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.06)';
    for (var y = 0; y < 256; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
    return new THREE.CanvasTexture(c);
  }

  function sparkSprite() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 22);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,226,150,.8)'); r.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 60); g.moveTo(4, 32); g.lineTo(60, 32); g.stroke();
    return new THREE.CanvasTexture(c);
  }

  function makeTexture(o, withText, maxAniso) {
    var c = document.createElement('canvas');
    c.width = 2400; c.height = Math.round(2400 * o.height / o.width);
    paintSatin(c, o, withText);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = maxAniso;
    t.userData = { canvas: c };
    return t;
  }

  /* ---------- environment kecil agar emas punya pantulan ---------- */
  function makeEnv(renderer) {
    try {
      var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
      var g = c.getContext('2d');
      var bg = g.createLinearGradient(0, 0, 0, 512);
      bg.addColorStop(0, '#16294d'); bg.addColorStop(0.42, '#f6e3b4');
      bg.addColorStop(0.58, '#caa05a'); bg.addColorStop(1, '#1a1208');
      g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
      [[200, 150, 120, 60], [560, 120, 160, 50], [860, 170, 110, 70], [400, 330, 200, 40]].forEach(function (b) {
        var R = Math.max(b[2], b[3]), r = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], R);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.translate(b[0], b[1]); g.scale(b[2] / R, b[3] / R); g.translate(-b[0], -b[1]);
        g.fillStyle = r; g.beginPath(); g.arc(b[0], b[1], R, 0, 7); g.fill(); g.restore();
      });
      var t = new THREE.CanvasTexture(c);
      t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
      var pm = new THREE.PMREMGenerator(renderer);
      var env = pm.fromEquirectangular(t).texture;
      t.dispose(); pm.dispose();
      return env;
    } catch (e) { return null; }
  }

  /* ---------- geometri grid yang dideformasi tiap frame ---------- */
  function Grid(nx, ny, xyFn, zoff, shadeFn) {
    var n = (nx + 1) * (ny + 1), base = new Float32Array(n * 2), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), k = 0, i, j;
    for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) {
      var p = xyFn(i / nx, j / ny);
      base[k * 2] = p[0]; base[k * 2 + 1] = p[1]; uv[k * 2] = i / nx; uv[k * 2 + 1] = j / ny;
      var sh = shadeFn ? shadeFn(i / nx, j / ny) : 1; col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = sh; k++;
    }
    var idx = [];
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    var z = new Float32Array(n).fill(zoff);
    return build(n, base, uv, idx, z, col);
  }
  function Tri(pts) { // pts: [[x,y,zoff] x3]
    var base = new Float32Array(6), z = new Float32Array(3), col = new Float32Array(9);
    pts.forEach(function (p, i) { base[i * 2] = p[0]; base[i * 2 + 1] = p[1]; z[i] = p[2]; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = p[3]; });
    return build(3, base, new Float32Array([0, 0, 1, 0, 0, 1]), [0, 1, 2], z, col);
  }
  function build(n, base, uv, idx, z, col) {
    var geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    return { geo: geo, base: base, pos: pos, n: n, z: z, yc: 0, bl: 0, kind: 'band' };
  }

  function RibbonBanner(el, opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    if (!o.text) o.text = DEFAULTS.text;
    var hw = o.width / 2, H = o.height, T = o.tail, D = o.drop, N = o.notch;
    var mobile = Math.min(innerWidth, innerHeight) < 600;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s ease';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (!el.clientHeight) el.style.aspectRatio = String(o.aspect);
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', o.text);
    el.appendChild(canvas);

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !mobile }); }
    catch (e) { console.warn('RibbonBanner: WebGL tidak tersedia', e); canvas.remove(); return { unfurl: function () {}, furl: function () {}, replay: function () {} }; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var aniso = renderer.capabilities.getMaxAnisotropy();

    var scene = new THREE.Scene();
    var env = makeEnv(renderer);
    if (env) scene.environment = env;
    var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a10, 0.3));
    var key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(2, 4, 6); scene.add(key);
    var rim = new THREE.DirectionalLight(0x7aa2ff, 0.35); rim.position.set(-5, 1, 3); scene.add(rim);
    var sheen = new THREE.PointLight(0xfff2cf, 0.6, 22); scene.add(sheen);

    var bandTex = makeTexture(o, false, aniso), tailTex = bandTex;
    var tc = document.createElement('canvas'); tc.width = 4096; tc.height = Math.round(4096 * o.height / o.width);
    paintText(tc, o);
    var textTex = new THREE.CanvasTexture(tc); textTex.encoding = THREE.sRGBEncoding; textTex.anisotropy = aniso;
    var bump = weaveBump();
    function mat(map, color, vc) {
      return new THREE.MeshPhysicalMaterial({
        map: map, color: color, metalness: 0.55, roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.3,
        bumpMap: bump, bumpScale: 0.12, vertexColors: !!vc, side: THREE.DoubleSide, envMapIntensity: 0.8
      });
    }
    var mBand = mat(bandTex, 0xffffff, false);
    var mTail = mat(tailTex, 0xe6c880, true);
    var mFold = new THREE.MeshStandardMaterial({ color: 0xc79a3a, metalness: 0.5, roughness: 0.5, vertexColors: true, side: THREE.DoubleSide });

    var mText = new THREE.MeshStandardMaterial({
      map: textTex, color: 0x7a7a7a, transparent: true, depthWrite: false, metalness: 0, roughness: 0.7, envMapIntensity: 0.15,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
    var segX = mobile ? 40 : 64;
    var band = Grid(segX, 4, function (u, v) { return [-hw + u * o.width, -H / 2 + v * H]; }, 0);
    function tailFn(sign) {
      return function (u, v) {
        var xe = hw + T - N * (1 - Math.abs(2 * v - 1)), xi = hw - 0.5;
        return [sign * (xe + (xi - xe) * u), -H / 2 + v * H - D];
      };
    }
    function tailShade(u) { return 1 - 0.55 * smooth(0.4, 1, u); }
    var tailL = Grid(32, 4, tailFn(-1), -0.22, function (u) { return tailShade(u); });
    var tailR = Grid(32, 4, tailFn(1), -0.22, function (u) { return tailShade(u); });
    var fw = 0.95;
    var foldL = Tri([[-hw, -H / 2, -0.03, 0.3], [-hw + fw, -H / 2, -0.03, 0.55], [-hw, -H / 2 - D, -0.2, 0.9]]);
    var foldR = Tri([[hw, -H / 2, -0.03, 0.3], [hw - fw, -H / 2, -0.03, 0.55], [hw, -H / 2 - D, -0.2, 0.9]]);
    var textG = Grid(segX, 4, function (u, v) { return [-hw + u * o.width, -H / 2 + v * H]; }, 0.006);
    textG.bl = 0.06;
    band.bl = 0.06; tailL.bl = tailR.bl = 0.05; tailL.yc = tailR.yc = -D;
    tailL.kind = tailR.kind = 'tail'; foldL.kind = foldR.kind = 'fold';

    var group = new THREE.Group(), pieces = [[band, mBand, 1], [tailL, mTail, 1.2], [tailR, mTail, 1.2],
      [foldL, mFold, 1.1], [foldR, mFold, 1.1], [textG, mText, 1]];
    pieces.forEach(function (p) {
      var m = new THREE.Mesh(p[0].geo, p[1]); m.frustumCulled = false; if (p[1] === mText) m.renderOrder = 2; group.add(m);
    });
    group.position.y = (H / 2 + D) / 2 - H / 2 + 0.02;
    scene.add(group);

    var sparks = [], sp = sparkSprite();
    if (o.sparkles) {
      for (var gi = 0; gi < 3; gi++) {
        var pa = new Float32Array(14 * 3);
        for (var pi = 0; pi < 14; pi++) {
          var far = Math.random() < 0.8, sx = (far ? hw * 0.6 + Math.random() * (T + hw * 0.5) : Math.random() * hw) * (Math.random() < 0.5 ? -1 : 1);
          pa[pi * 3] = sx; pa[pi * 3 + 1] = (Math.random() - 0.5) * 2.2; pa[pi * 3 + 2] = -0.3 + Math.random() * 0.9;
        }
        var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
        var sm = new THREE.PointsMaterial({ map: sp, size: 0.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe3a0 });
        var pts = new THREE.Points(sg, sm); pts.frustumCulled = false; group.add(pts);
        sparks.push({ m: sm, ph: gi * 2.1 });
      }
    }


    // debu emas yang jatuh dari gulungan saat pita terurai
    var TN = 90, tPos = new Float32Array(TN * 3), tCol = new Float32Array(TN * 3), tVel = new Float32Array(TN * 3), tLife = new Float32Array(TN);
    var tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    var tPts = new THREE.Points(tGeo, new THREE.PointsMaterial({ map: sp, size: 0.34, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    tPts.frustumCulled = false; group.add(tPts);
    function emit(x) {
      for (var i = 0; i < TN; i++) if (tLife[i] <= 0) {
        tLife[i] = 0.6 + Math.random() * 0.6;
        tPos[i * 3] = x + (Math.random() - 0.5) * 0.35; tPos[i * 3 + 1] = (Math.random() - 0.5) * H; tPos[i * 3 + 2] = 0.2 + Math.random() * 0.7;
        tVel[i * 3] = (Math.random() - 0.5) * 0.5; tVel[i * 3 + 1] = 0.1 + Math.random() * 0.5; tVel[i * 3 + 2] = (Math.random() - 0.3) * 0.3;
        return;
      }
    }
    function updateTrail(dt) {
      for (var i = 0; i < TN; i++) {
        if (tLife[i] > 0) {
          tLife[i] -= dt; var l = Math.max(0, tLife[i]);
          tVel[i * 3 + 1] -= 0.9 * dt;
          for (var c = 0; c < 3; c++) tPos[i * 3 + c] += tVel[i * 3 + c] * dt;
          tCol[i * 3] = l; tCol[i * 3 + 1] = l * 0.85; tCol[i * 3 + 2] = l * 0.5;
        } else { tCol[i * 3] = tCol[i * 3 + 1] = tCol[i * 3 + 2] = 0; }
      }
      tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;
    }

    function envelope(x) { return 0.12 + 0.88 * Math.pow(smooth(hw * 0.55, hw + T, Math.abs(x)), 1.4); }

    var Rmax = hw + T, R0 = 0.46, SM = 6, K = R0 / SM;     // geometri gulungan spiral

    function deform(t, amp, reach) {
      var fT = smooth(hw - 0.4, hw + 0.6, reach), fF = smooth(hw - 0.2, hw + 0.8, reach);
      for (var q = 0; q < pieces.length; q++) {
        var p = pieces[q][0], mul = pieces[q][2], kind = p.kind;
        for (var i = 0; i < p.n; i++) {
          var x0 = p.base[i * 2], y0 = p.base[i * 2 + 1], yc = p.yc;
          if (kind === 'fold') { var ax = p.base[0], ay = p.base[1]; x0 = ax + (x0 - ax) * fF; y0 = ay + (y0 - ay) * fF; }
          if (kind === 'tail') { y0 += D * (1 - fT); yc = -D * fT; }
          var sg = x0 < 0 ? -1 : 1, a = Math.abs(x0), xe = sg * Math.min(a, reach), s = a - reach, sv = envelope(xe);
          var w = amp * sv * (Math.sin(1.15 * xe - 1.4 * t) + 0.35 * Math.sin(2.3 * xe + 0.9 * t));
          var zo = kind === 'tail' ? p.z[i] * (0.15 + 0.85 * fT) : p.z[i];
          var r = Math.min(1, (y0 - yc) / (H / 2));
          var xf = x0, yf = y0 + 0.4 * amp * sv * Math.sin(1.7 * xe - 1.1 * t + 1) * mul;
          var zf = o.bow * (1 - xe * xe / (hw * hw)) + zo + w * mul + p.bl * (1 - r * r);
          if (s > 0) {                                   // bagian yang masih tergulung
            var sc = Math.min(s, SM * 0.985), ex = 1 - sc / SM, th = -Math.log(ex) / K;
            var nr = ex * Math.cos(th) - 1, ni = ex * Math.sin(th), dn = K * K + 1;
            xf = sg * (reach + R0 * (ni - K * nr) / dn);
            zf += R0 * (-nr - K * ni) / dn;
          }
          p.pos[i * 3] = xf; p.pos[i * 3 + 1] = yf; p.pos[i * 3 + 2] = zf;
        }
        p.geo.attributes.position.needsUpdate = true;
        p.geo.computeVertexNormals();
      }
    }

    function resize() {
      var w = el.clientWidth || 300, h = el.clientHeight || w / o.aspect;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      var th = Math.tan(camera.fov * Math.PI / 360);
      var zw = ((o.width + 2 * T + 0.2) / 2) / (th * camera.aspect);
      var zh = ((H + D + 1.1) / 2) / th;
      camera.position.set(0, 0, Math.max(zw, zh));
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el); else addEventListener('resize', resize);
    resize();

    var mx = 0, my = 0, rx = 0, ry = 0, gust = 0, tg = 0, lastY = window.scrollY, visible = true;
    addEventListener('pointermove', function (e) {
      mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; tg = Math.min(1, tg + 0.12);
    });
    addEventListener('scroll', function () {
      tg = Math.min(1, tg + Math.abs(window.scrollY - lastY) * 0.004); lastY = window.scrollY;
    }, { passive: true });
    var st = { p: reduce ? 1 : 0, dir: 0 }, started = false, sw = 1, burst = 0, acc = 0;
    function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function unfurl() { st.dir = 1; }
    function furl() { st.dir = -1; }
    function replay() { st.p = 0; st.dir = 1; sw = 1; }
    function autoStart() { if (started || reduce) return; started = true; if (o.start !== 'manual') setTimeout(unfurl, 450); }
    if (window.IntersectionObserver && o.start === 'view') {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && e[0].intersectionRatio >= 0.35) autoStart();
      }, { threshold: [0, 0.35, 0.6] }).observe(el);
    } else {
      if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(el);
      autoStart();
    }

    function repaint() { paintText(tc, o); textTex.needsUpdate = true; }
    ensureFont(o).then(repaint);

    var clock = new THREE.Clock(), time = 0, shown = false;
    (function loop() {
      requestAnimationFrame(loop);
      var dt = Math.min(clock.getDelta(), 0.05);
      if (!visible) return;
      time += dt * (reduce ? 0.3 : 1);
      gust += (tg - gust) * 0.05; tg *= 0.97;

      if (st.dir) {
        st.p = Math.min(1, Math.max(0, st.p + st.dir * dt / o.duration));
        if (st.p >= 1 && st.dir > 0) { st.dir = 0; sw = 0; burst = 1; }
        else if (st.p <= 0 && st.dir < 0) st.dir = 0;
      }
      var e = ease(st.p), reach = Rmax * e;
      if (st.dir && st.p > 0.02 && st.p < 0.98) {
        acc += dt * 70;
        while (acc > 1) { acc -= 1; emit(reach + 0.1); emit(-reach - 0.1); }
      }
      updateTrail(dt);

      deform(time, o.wave * (1 + gust * 0.9) * (0.15 + 0.85 * smooth(0.6, 1, st.p)), reach);
      group.scale.setScalar(0.92 + 0.08 * e);
      rx += ((-0.06 + my * 0.14) * (reduce ? 0.3 : 1) - rx) * 0.05;
      ry += (mx * 0.3 * (reduce ? 0.3 : 1) - ry) * 0.05;
      group.rotation.set(rx + (1 - e) * 0.18, ry + Math.sin(time * 0.5) * 0.03 + (1 - e) * 0.3, Math.sin(time * 0.4) * 0.012);

      if (sw < 1) { sw = Math.min(1, sw + dt / 1.4); sheen.position.set(-8 + 16 * sw, 1.2, 2.6); sheen.intensity = 1.8; }
      else { sheen.position.set(Math.sin(time * 0.45) * 6, 1.2, 2.6); sheen.intensity = 0.6; }
      burst *= 0.96;
      var vis = smooth(0.85, 1, st.p);
      for (var si = 0; si < sparks.length; si++) {
        sparks[si].m.opacity = Math.max(vis * (0.15 + 0.85 * Math.max(0, Math.sin(time * 1.3 + sparks[si].ph))), burst);
        sparks[si].m.size = 0.5 * (1 + burst * 0.8);
      }
      renderer.render(scene, camera);
      if (!shown) { shown = true; canvas.style.opacity = '1'; }
    })();

    return {
      unfurl: unfurl, furl: furl, replay: replay,
      toggle: function () { (st.p > 0.5 && st.dir >= 0) ? furl() : unfurl(); }
    };
  }

  window.RibbonBanner = RibbonBanner;
  function auto() {
    window.ribbonBanners = window.ribbonBanners || [];
    document.querySelectorAll('[data-ribbon-banner]').forEach(function (el) {
      var op = {};
      if (el.getAttribute('data-text')) op.text = el.getAttribute('data-text');
      if (el.getAttribute('data-start')) op.start = el.getAttribute('data-start');
      var c = RibbonBanner(el, op);
      window.ribbonBanners.push(c); el._ribbon = c;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
