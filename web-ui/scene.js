/* inserted into core.js (inside the IIFE) by build.py at the SCENE marker.
   Two renderings of the same scene:  fine  = layered, lit illustration (gradients, soft shadows, pleated fabric, light beam)
                                      pixel = 64x40 pixel art with dithered sky.
   Palette = CSS variables  --sc-*  (fine)  /  --px-*  (pixel), every one has a default, themes may override. */
var uid = 0;
function LG(id, dir, stops, extra) {
  return '<linearGradient id="' + id + '" ' + (dir === 'h' ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"') + (extra || '') + '>' +
    stops.map(function (s) { return '<stop offset="' + s[0] + '" style="stop-color:' + s[1] + ';stop-opacity:' + (s[2] == null ? 1 : s[2]) + '"/>'; }).join('') + '</linearGradient>';
}
function sv(n, d) { return 'var(--sc-' + n + ',' + d + ')'; }

function sceneFine(slice) {
  var u = 's' + (++uid), id = function (n) { return u + n; }, url = function (n) { return 'url(#' + u + n + ')'; };
  var pleats = function (x, w, cls) { return '<rect x="' + x + '" y="34" width="' + w + '" height="226" fill="' + url('d') + '"/>'; };
  var rings = function (x0, x1) { var o = ''; for (var x = x0; x <= x1; x += 13) o += '<rect x="' + x + '" y="29" width="3" height="10" rx="1.5" fill="' + sv('metal', '#8b7b63') + '"/>'; return o; };
  var panel = function (x, w, side) {
    return '<g class="dg ' + side + '">' +
      '<rect x="' + (x + (side === 'l' ? -8 : 8)) + '" y="42" width="' + w + '" height="224" fill="#000" opacity=".28" filter="' + url('b6') + '"/>' +
      '<rect x="' + x + '" y="34" width="' + w + '" height="226" fill="' + sv('drape', '#d9c3a6') + '"/>' +
      pleats(x, w) +
      '<rect x="' + x + '" y="34" width="' + w + '" height="226" fill="' + url('sh') + '"/>' +
      '<rect class="cglow" x="' + x + '" y="34" width="' + w + '" height="226" fill="#ffe7ac"/>' +
      '<rect x="' + x + '" y="34" width="' + w + '" height="11" fill="#000" opacity=".16"/>' +
      '<path d="M' + x + ' 256q' + (w / 8) + ' 6 ' + (w / 4) + ' 0t' + (w / 4) + ' 0t' + (w / 4) + ' 0t' + (w / 4) + ' 0v5H' + x + 'z" fill="#000" opacity=".22"/>' +
      rings(x + 3, x + w - 6) + '</g>';
  };
  var stars = '';
  [[128,60],[142,84],[156,66],[170,98],[186,58],[200,76],[214,64],[228,92],[244,60],[258,80],[270,104],[134,112],[162,126],[248,132],[190,116],[220,108]].forEach(function (p, i) {
    stars += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 3 ? .9 : 1.4) + '" fill="#fff" style="animation:tw ' + (2 + i % 4) + 's ' + (i * .37).toFixed(2) + 's ease-in-out infinite alternate"/>';
  });
  var clouds = '';
  [[170, 92, 32, 8], [246, 78, 28, 7], [200, 114, 36, 8], [150, 132, 30, 7], [256, 122, 30, 8]].forEach(function (c, i) {
    clouds += '<g style="opacity:var(--c' + (i + 1) + ',0)"><ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="' + c[2] + '" ry="' + c[3] + '" fill="var(--sc-cloud,#fff)" filter="' + url('b2') + '"/>' +
      '<ellipse cx="' + (c[0] + c[2] * .35) + '" cy="' + (c[1] - c[3] * .6) + '" rx="' + (c[2] * .55) + '" ry="' + (c[3] * .9) + '" fill="var(--sc-cloud,#fff)" filter="' + url('b2') + '"/></g>';
  });
  return '<svg class="scene fine\" viewBox="0 0 400 300" preserveAspectRatio="' + (slice ? 'xMidYMid slice' : 'xMidYMid meet') + '" role="img" aria-label="窗簾示意圖">' +
    '<defs>' +
    LG(id('w'), 'v', [[0, sv('wall1', '#f1ebe3')], [1, sv('wall2', '#ddd4c8')]]) +
    LG(id('sk'), 'v', [[0, sv('sky1', '#8fbbea')], [1, sv('sky2', '#e4f1fb')]]) +
    '<radialGradient id="' + id('sn') + '"><stop offset="0" style="stop-color:' + sv('sun', '#fff3c4') + ';stop-opacity:.95"/><stop offset="1" style="stop-color:' + sv('sun', '#fff3c4') + ';stop-opacity:0"/></radialGradient>' +
    LG(id('fr'), 'v', [[0, sv('frame1', '#fdfcf9')], [1, sv('frame2', '#d4cdc2')]]) +
    LG(id('d'), 'h', [[0, sv('drape-lo', '#b79d7a')], [.2, sv('drape-hi', '#ecdabf')], [.52, sv('drape', '#d9c3a6')], [.8, sv('drape-hi', '#ecdabf')], [1, sv('drape-lo', '#b79d7a')]], ' gradientUnits="userSpaceOnUse" x1="0" x2="32" spreadMethod="repeat"') +
    LG(id('sh'), 'v', [[0, '#000', .22], [.2, '#000', 0], [.8, '#fff', 0], [1, '#fff', .1]]) +
    LG(id('fl'), 'v', [[0, sv('floor1', '#c8a57a')], [1, sv('floor2', '#9c7a52')]]) +
    LG(id('bm'), 'v', [[0, sv('beam', '#fff3cf'), .95], [1, sv('beam', '#fff3cf'), 0]]) +
    LG(id('mt'), 'v', [[0, '#f2e7cf'], [.45, sv('metal', '#a39070')], [1, '#5c503e']]) +
    LG(id('br'), 'h', [[0, '#6e5524'], [.35, '#e7c97a'], [.6, '#c19a45'], [1, '#5a4419']]) +
    '<radialGradient id="' + id('vg') + '" cx=".5" cy=".45" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient>' +
    '<pattern id="' + id('rp') + '" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M5 2l-1.5 7M18 14l-1.5 7M26 5l-1.5 7M11 22l-1.5 7" stroke="var(--sc-rain,#d6e6f6)" stroke-width="1" stroke-linecap="round" opacity=".75"/></pattern>' +
    '<pattern id="' + id('sp') + '" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="8" cy="6" r="1.4" fill="#fff"/><circle cx="26" cy="14" r="1.1" fill="#fff"/><circle cx="16" cy="28" r="1.6" fill="#fff"/><circle cx="34" cy="34" r="1.2" fill="#fff"/><circle cx="4" cy="22" r="1" fill="#fff"/></pattern>' +
    '<radialGradient id="' + id('bl') + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe8" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></radialGradient>' +
    '<filter id="' + id('b2') + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>' +
    '<filter id="' + id('b6') + '" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>' +
    '<clipPath id="' + id('gl') + '"><rect x="120" y="52" width="160" height="164"/></clipPath></defs>' +
    '<rect width="400" height="300" fill="' + url('w') + '"/>' +
    /* floor + skirting */
    '<rect y="262" width="400" height="38" fill="' + url('fl') + '"/>' +
    '<path d="M0 274H400M0 287H400" stroke="#000" stroke-opacity=".12" stroke-width="1"/><path d="M60 262v12M190 274v13M300 262v12M120 287v13M330 274v13" stroke="#000" stroke-opacity=".1"/>' +
    '<rect y="254" width="400" height="9" fill="' + sv('frame2', '#d4cdc2') + '"/><rect y="254" width="400" height="1.6" fill="#fff" opacity=".5"/><rect y="263" width="400" height="3" fill="#000" opacity=".18"/>' +
    /* window */
    '<rect x="103" y="35" width="194" height="198" rx="3" fill="#000" opacity=".22" filter="' + url('b2') + '"/>' +
    '<rect x="106" y="38" width="188" height="192" rx="2.5" fill="' + url('fr') + '"/>' +
    '<rect x="120" y="52" width="160" height="164" fill="' + url('sk') + '"/>' +
    '<g clip-path="' + url('gl') + '">' +
    '<g class="stars">' + stars + '</g>' +
    '<g class="body"><circle class="halo" r="78" fill="' + url('sn') + '"/><circle r="13" fill="' + sv('sun', '#fff3c4') + '"/></g>' + clouds +
    '<path d="M120 188q26-26 52-14t46-4 62-8V216H120z" fill="' + sv('hill1', '#b4d2c4') + '" opacity=".8"/>' +
    '<path d="M120 200q34-22 70-8t58-6 32 4V216H120z" fill="' + sv('hill2', '#8bb9a3') + '"/>' +
    '<path d="M120 210q40-14 84-4t76-4V216H120z" fill="' + sv('hill3', '#5d9177') + '"/>' +
    '<rect class="fogr" x="120" y="52" width="160" height="164" fill="#dde3e8"/>' +
    '<rect class="rain" x="120" y="22" width="160" height="224" fill="' + url('rp') + '"/>' +
    '<rect class="snow" x="120" y="22" width="160" height="224" fill="' + url('sp') + '"/>' +
    '<rect class="flash" x="120" y="52" width="160" height="164" fill="#fff"/>' +
    '<path d="M120 52h72L120 150z" fill="#fff" opacity=".1"/><path d="M214 52h18L140 216h-18z" fill="#fff" opacity=".06"/></g>' +
    '<rect x="120" y="52" width="160" height="164" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2"/>' +
    '<rect x="197" y="52" width="6" height="164" fill="' + url('fr') + '"/><rect x="203" y="52" width="1.4" height="164" fill="#000" opacity=".16"/>' +
    '<rect x="120" y="128" width="160" height="6" fill="' + url('fr') + '"/><rect x="120" y="134" width="160" height="1.4" fill="#000" opacity=".16"/>' +
    '<rect x="96" y="229" width="208" height="10" rx="2" fill="' + url('fr') + '"/><rect x="96" y="238" width="208" height="1.6" fill="#000" opacity=".2"/>' +
    '<rect x="100" y="240" width="200" height="8" fill="#000" opacity=".16" filter="' + url('b2') + '"/>' +
    /* sunlight on the floor */
    '<polygon class="beam" points="128,239 272,239 352,300 70,300" fill="' + url('bm') + '"/>' +
    '<polygon class="beam" points="196,239 204,239 232,300 188,300" fill="#fff" opacity=".12"/>' +
    /* plant */
    '<ellipse cx="52" cy="262" rx="20" ry="4" fill="#000" opacity=".22" filter="' + url('b2') + '"/>' +
    '<path d="M38 236h28l-4 26H42z" fill="' + sv('pot', '#c0643f') + '"/><rect x="36" y="232" width="32" height="6" rx="1.5" fill="#fff" opacity=".18"/><path d="M38 236h28l-.6 4H38.6z" fill="#000" opacity=".15"/>' +
    '<g fill="' + sv('leaf', '#5f8f5a') + '"><path d="M52 234q-24-26-20-48 20 14 20 48z"/><path d="M52 234q2-34 24-52 6 26-24 52z" opacity=".85"/><path d="M52 234q-10-22-2-52 12 22 2 52z" opacity=".95"/></g>' +
    '<path d="M52 234q-8-24 0-50" stroke="#000" stroke-opacity=".2" fill="none"/>' +
    /* curtain rod, curtains */
    '<rect x="78" y="22" width="244" height="3" rx="1.5" fill="#000" opacity=".2" transform="translate(0 7)" filter="' + url('b2') + '"/>' +
    panel(88, 112, 'l') + panel(200, 112, 'r') +
    '<rect x="80" y="23" width="240" height="7" rx="3.5" fill="' + url('mt') + '"/><circle cx="78" cy="26.5" r="6.5" fill="' + url('mt') + '"/><circle cx="322" cy="26.5" r="6.5" fill="' + url('mt') + '"/>' +
    /* cords: ONE cord of constant length per curtain -> left chain: edge, left pulley, top run, right pulley, down; right cord: edge, down */
    '<circle cx="72" cy="23.5" r="5.5" fill="' + url('mt') + '"/><circle cx="72" cy="23.5" r="1.7" fill="#3b342a"/>' +
    '<circle cx="330" cy="23.5" r="5.5" fill="' + url('mt') + '"/><circle cx="330" cy="23.5" r="1.7" fill="#3b342a"/>' +
    '<path d="M72 29A5.5 5.5 0 0 1 72 18H330A5.5 5.5 0 0 1 335.5 23.5" fill="none" stroke="' + sv('cord', '#3b342a') + '" stroke-width="1.4"/>' +
    '<rect class="cordhL" x="72" y="28.3" width="128" height="1.4" fill="' + sv('cord', '#3b342a') + '"/>' +
    '<rect class="cordhR" x="200" y="28.3" width="138" height="1.4" fill="' + sv('cord', '#3b342a') + '"/>' +
    '<rect class="cordv2" x="334.8" y="23.5" width="1.4" height="124.5" fill="' + sv('cord', '#3b342a') + '"/>' +
    '<rect class="cordv" x="337.3" y="29" width="1.4" height="119" fill="' + sv('cord', '#3b342a') + '"/>' +
    '<g class="sc-pull"><ellipse cx="336" cy="190" rx="12" ry="3.5" fill="#000" opacity=".18" filter="' + url('b2') + '" transform="translate(5 -2)"/><rect x="327" y="150" width="18" height="34" rx="3.5" fill="' + url('br') + '"/>' +
    '<rect x="329.5" y="153" width="3" height="28" rx="1.5" fill="#fff" opacity=".45"/><rect x="327" y="150" width="18" height="4" rx="2" fill="#fff" opacity=".25"/><circle cx="336" cy="148.5" r="2.4" fill="none" stroke="#5a4419" stroke-width="1.2"/></g>' +
    '<rect class="bloom" x="20" y="0" width="360" height="290" fill="' + url('bl') + '"/>' +
    '<rect class="dim" width="400" height="300" fill="#070b1a"/>' +
    '<rect class="tint" width="400" height="300" fill="' + sv('tint', '#ffcf7a') + '"/>' +
    '<rect width="400" height="300" fill="' + url('vg') + '"/></svg>';
}

function scenePixel() {
  var out = [], P = function (n, d) { return 'var(--px-' + n + ',' + d + ')'; };
  var R = function (x, y, w, h, c, cls) { out.push('<rect' + (cls ? ' class="' + cls + '"' : '') + ' x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>'); };
  var wall = P('wall', '#3a382f'), frame = P('frame', '#7a8872'), light = P('light', '#e9e3d2');
  R(0, 0, 64, 40, wall);
  for (var x = 0; x < 64; x += 8) R(x, 0, 1, 31, 'rgba(0,0,0,.14)');                        // wallpaper stripes
  /* window glass: banded dawn sky, checker-dithered between bands */
  var bands = [P('sky1', '#8fb8cf'), P('sky2', '#a9cdd6'), P('sky3', '#c8dfd5'), P('sky4', '#e6e3bd'), P('sky5', '#f3d9a0')];
  for (var y = 7; y < 28; y++) {
    var t = (y - 7) / 21 * 4, i = Math.floor(t), f = t - i;
    R(18, y, 24, 1, bands[i]);
    if (i < 4 && f > .55) for (var xx = 18 + (y % 2); xx < 42; xx += 2) R(xx, y, 1, 1, bands[i + 1]);
  }
  out.push('<g class="px-stars">');
  [[19,8],[22,11],[26,8],[31,9],[36,8],[40,12],[24,15],[34,13],[38,16],[28,12]].forEach(function (p) { R(p[0], p[1], 1, 1, '#fff'); });
  out.push('</g><g class="px-body">');
  for (var a = -4; a <= 4; a++) for (var b = -4; b <= 4; b++) {                              // sun / moon + halo (moved by --bx --by)
    var d = a * a + b * b; if (d <= 9) R(35 + a, 20 + b, 1, 1, P('sun', '#f6d36f'));
    else if (d <= 20 && (a + b) % 2 === 0) R(35 + a, 20 + b, 1, 1, P('halo', '#f3e3a8'));
  }
  out.push('</g>');
  var hill = function (base, amp, ph, c) { for (var x = 18; x < 42; x++) { var h = Math.round(base + amp * Math.sin((x + ph) / 3.1)); R(x, 28 - h, 1, h, c); } };
  hill(4, 1.6, 2, P('hill1', '#86a68f')); hill(2, 1.1, 9, P('hill2', '#5e8a73'));
  for (var tx = 20; tx < 41; tx += 5) { R(tx, 22, 1, 3, P('pine', '#3f6b57')); R(tx - 1, 24, 3, 2, P('pine', '#3f6b57')); }
  var cc = P('cloud', '#fff'), cloud = function (cls, x, y, w) { out.push('<g class="' + cls + '">'); R(x, y, w, 1, cc); R(x + 1, y - 1, w - 2, 1, cc); R(x + 2, y - 2, Math.max(1, w - 5), 1, cc); out.push('</g>'); };
  cloud('px-c1', 18, 14, 6); cloud('px-c2', 31, 10, 7); cloud('px-c3', 24, 21, 8);
  out.push('<defs><clipPath id="pxgl"><rect x="18" y="7" width="24" height="21"/></clipPath></defs>');
  R(18, 7, 24, 21, '#dfe4e8', 'px-fogr');
  out.push('<g clip-path="url(#pxgl)"><g class="px-rain">');
  for (var j = 0; j < 9; j++) for (var i = 0; i < 5; i++) R(19 + i * 5 + (j % 2) * 2, -1 + j * 4, 1, 2, P('rain', '#cfe0f2'));
  out.push('</g><g class="px-snow">');
  for (var j2 = 0; j2 < 5; j2++) for (var i2 = 0; i2 < 4; i2++) R(19 + i2 * 6 + (j2 % 2) * 3, -1 + j2 * 8, 1, 1, '#fff');
  out.push('</g></g>');
  R(18, 7, 24, 21, '#fff', 'px-flash');
  /* frame, mullions, sill */
  R(16, 5, 28, 2, frame); R(16, 28, 28, 2, frame); R(16, 5, 2, 25, frame); R(42, 5, 2, 25, frame); R(29, 7, 2, 21, frame); R(18, 17, 24, 2, frame);
  R(14, 30, 32, 2, light); R(14, 32, 32, 1, 'rgba(0,0,0,.35)');
  /* floor + sunlight patch */
  for (var fy = 33; fy < 40; fy++) { R(0, fy, 64, 1, fy % 2 ? P('floor1', '#7a5a3c') : P('floor2', '#6b4d33')); for (var fx = (fy * 7) % 11; fx < 64; fx += 11) R(fx, fy, 1, 1, 'rgba(0,0,0,.3)'); }
  for (var ly = 33; ly < 40; ly++) for (var lx = 20 - (ly - 33); lx < 41 + (ly - 33); lx++) if ((lx + ly) % 2 === 0) R(lx, ly, 1, 1, 'rgba(255,238,170,.55)', 'px-beam');
  /* curtains: pleat columns */
  var cu = P('drape', '#d4745a'), hi = P('drape-hi', '#e48c70'), lo = P('drape-lo', '#a9553f');
  var pan = function (x0, w, cls) {
    out.push('<g' + (cls ? ' class="' + cls + '"' : '') + '>'); R(x0, 5, w, 27, cu);
    for (var c = 0; c < w; c++) { var m = c % 4; if (m === 1) R(x0 + c, 5, 1, 27, hi); if (m === 3) R(x0 + c, 5, 1, 27, lo); }
    R(x0, 5, w, 2, lo); R(x0, 30, w, 2, lo); for (var r = 0; r < w; r += 3) R(x0 + r, 4, 1, 2, light);
    out.push('</g>');
  };
  pan(16, 14, 'px-l'); pan(30, 14, 'px-r');
  R(11, 3, 38, 1, light); R(11, 4, 38, 1, 'rgba(0,0,0,.35)'); R(10, 2, 2, 3, light); R(48, 2, 2, 3, light);
  /* cords: constant total length -> left chain over two pulleys, right cord; drawn over the curtain heading */
  var cord = light;
  R(9, 1, 44, 1, cord); R(9, 1, 1, 4, cord); R(52, 1, 1, 15, cord, 'px-v2');
  R(8, 2, 3, 3, P('metal', '#a39070')); R(51, 1, 3, 3, P('metal', '#a39070'));
  R(10, 5, 20, 1, cord, 'px-cl'); R(30, 5, 22, 1, cord, 'px-cr'); R(53, 5, 1, 11, cord, 'px-v1');
  out.push('<g class="px-pull">'); R(51, 16, 4, 5, P('weight', '#c0582e')); R(51, 16, 4, 1, '#e6906a'); R(54, 17, 1, 4, '#8a3d1c'); out.push('</g>');
  /* plant */
  R(5, 30, 5, 3, P('pot', '#c0582e')); R(4, 29, 7, 1, '#e6906a'); R(7, 22, 1, 7, P('leaf', '#6f9a5c'));
  R(5, 24, 2, 1, P('leaf', '#6f9a5c')); R(4, 23, 1, 1, P('leaf', '#6f9a5c')); R(8, 21, 3, 1, P('leaf', '#6f9a5c')); R(10, 22, 1, 2, P('leaf', '#6f9a5c')); R(6, 26, 2, 1, P('leaf', '#8fb87a'));
  R(0, 0, 64, 40, '#0b1020', 'px-dim');
  return '<svg class="scene pixel" viewBox="0 0 64 40" shape-rendering="crispEdges" role="img" aria-label="像素風窗簾示意圖">' + out.join('') + '</svg>';
}

/* shared scene CSS: everything is a function of ONE progress number --k (0 = closed, 1 = fully open); the driver below animates it,
   so curtains, weight and cords always move together and the total cord length never changes. */
(function () {
  var st = document.createElement('style');
  var o = 'transform-box:fill-box;';
  st.textContent =
    // Also hide the injected selector from mock servers already running old code.
    '#__mock{display:none!important}' +
    '.scene{display:block;width:100%;height:100%;--k:0;--kp:0}.scene-wrap{line-height:0;display:grid;place-items:center}.scene.pixel:not([preserveAspectRatio*="slice"]){height:auto;border-radius:inherit;overflow:hidden}' +
    '.scene .dg.l{' + o + 'transform-origin:0 50%;transform:scaleX(calc(1 - .78*var(--k)))}' +
    '.scene .dg.r{' + o + 'transform-origin:100% 50%;transform:scaleX(calc(1 - .78*var(--k)))}' +
    '.scene .cordhL{' + o + 'transform-origin:0 50%;transform:scaleX(calc(1 - .6825*var(--k)))}' +
    '.scene .cordhR{' + o + 'transform-origin:100% 50%;transform:scaleX(calc(1 - .633*var(--k)))}' +
    '.scene .cordv{' + o + 'transform-origin:50% 0;transform:scaleY(calc(1 + .7341*var(--k)))}' +
    '.scene .cordv2{' + o + 'transform-origin:50% 0;transform:scaleY(calc(1 + .7017*var(--k)))}' +
    '.scene .sc-pull{transform:translateY(calc(87.36px*var(--k)))}' +
    '.scene .beam{opacity:calc(.06 + .84*var(--k)*var(--L,1))}.scene .tint{mix-blend-mode:soft-light;opacity:calc(.55*var(--k)*var(--L,1))}' +
    '.scene .dim{opacity:calc(.7*(1 - var(--k)*var(--L,1)))}.scene .bloom{mix-blend-mode:screen;opacity:calc(.65*var(--k)*var(--L,1))}.scene .cglow{mix-blend-mode:screen;opacity:calc(.3*var(--L,1))}' +
    '.scene .body{transform:translate(calc(var(--sx,236)*1px),calc(var(--sy,150)*1px))}.scene .halo{transform-box:fill-box;transform-origin:center;transform:scale(var(--hs,1))}' +
    '.scene .stars{opacity:var(--stars,0)}.scene .fogr{opacity:var(--fog,0)}.scene .rain,.scene .snow,.scene .flash{display:none}' +
    '.scene[data-wx="rain"] .rain,.scene[data-wx="storm"] .rain{display:block;animation:rainf .5s linear infinite}.scene[data-wx="snow"] .snow{display:block;animation:snowf 4s linear infinite}' +
    '.scene[data-wx="storm"] .flash{display:block;opacity:0;animation:flashf 7s infinite}' +
    '@keyframes rainf{to{transform:translateY(30px)}}@keyframes snowf{to{transform:translateY(40px)}}@keyframes tw{from{opacity:.35}to{opacity:1}}' +
    '@keyframes flashf{0%,88%{opacity:0}89%{opacity:.7}91%{opacity:.05}93%{opacity:.5}96%,100%{opacity:0}}' +
    '[data-phase="running"] .scene .sc-pull{animation:scb .7s infinite alternate}@keyframes scb{to{opacity:.55}}' +
    '.scene.pixel .px-l{' + o + 'transform-origin:0 50%;transform:scaleX(calc(1 - .75*var(--kp)))}' +
    '.scene.pixel .px-r{' + o + 'transform-origin:100% 50%;transform:scaleX(calc(1 - .75*var(--kp)))}' +
    '.scene.pixel .px-cl{' + o + 'transform-origin:0 50%;transform:scaleX(calc(1 - .525*var(--kp)))}' +
    '.scene.pixel .px-cr{' + o + 'transform-origin:100% 50%;transform:scaleX(calc(1 - .4773*var(--kp)))}' +
    '.scene.pixel .px-v1{' + o + 'transform-origin:50% 0;transform:scaleY(calc(1 + .9545*var(--kp)))}' +
    '.scene.pixel .px-v2{' + o + 'transform-origin:50% 0;transform:scaleY(calc(1 + .7*var(--kp)))}' +
    '.scene.pixel .px-pull{transform:translateY(calc(10.5px*var(--kp)))}.scene.pixel .px-beam{opacity:calc(.1 + .9*var(--kp)*var(--L,1))}' +
    '.scene.pixel .px-dim{opacity:calc(.66*(1 - var(--kp)*var(--L,1)))}.scene.pixel .px-body{transform:translate(calc(var(--bx,0)*1px),calc(var(--by,0)*1px))}.scene.pixel .px-stars{opacity:var(--stars,0)}' +
    '.scene.pixel .px-c1{opacity:var(--c1,0)}.scene.pixel .px-c2{opacity:var(--c2,0)}.scene.pixel .px-c3{opacity:var(--c3,0)}.scene.pixel .px-fogr{opacity:var(--fog,0)}' +
    '.scene.pixel .px-rain,.scene.pixel .px-snow,.scene.pixel .px-flash{display:none}' +
    '.scene[data-wx="rain"] .px-rain,.scene[data-wx="storm"] .px-rain{display:block;animation:pxr .6s steps(8) infinite}.scene[data-wx="snow"] .px-snow{display:block;animation:pxs 3s steps(8) infinite}' +
    '.scene[data-wx="storm"] .px-flash{display:block;opacity:0;animation:flashf 7s steps(1) infinite}@keyframes pxr{to{transform:translateY(8px)}}@keyframes pxs{to{transform:translateY(8px)}}' +
    '[data-phase="running"] .scene.pixel .px-pull{animation:scb .5s steps(2) infinite}';
  document.head.appendChild(st);
})();

/* animation driver: gravity-like fall (ease-in) when released, smooth hand reset (ease-in-out) when locked again */
var K = { cur: 0, target: 0, raf: 0, init: false };
function setK(v) {
  K.cur = v;
  var kp = (Math.round(v * 12) / 12).toFixed(4), kk = v.toFixed(4);
  var els = document.querySelectorAll('.scene');
  for (var i = 0; i < els.length; i++) { els[i].style.setProperty('--k', kk); els[i].style.setProperty('--kp', kp); }
}
function sceneSync(p) {
  var t = p === 'released' ? 1 : (p === 'locked' || p === 'other') ? 0 : K.target;
  if (!K.init) { if (p === 'offline') return; K.init = true; K.target = t; setK(t); return; }
  if (t === K.target) return;
  K.target = t;
  var from = K.cur, t0 = performance.now(), dur = (t > from ? 1700 : 1500) * Math.abs(t - from) + 1;
  cancelAnimationFrame(K.raf);
  (function step(now) {
    var u = Math.min(1, (now - t0) / dur);
    var e = t > from ? u * u : (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    setK(from + (t - from) * e);
    if (u < 1) K.raf = requestAnimationFrame(step);
  })(t0);
}

/* ---- window outside: time of day + weather (all CSS variables on every .scene; the same palette drives fine and pixel) */
function h2r(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function r2h(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function mix(a, b, t) { var x = h2r(a), y = h2r(b); return r2h([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
var SKYK = [[0, '#070d22', '#16254a', '#dfe7ff'], [4.6, '#0f1a3c', '#2b3a68', '#dfe7ff'], [5.9, '#3d4c7c', '#e98c6c', '#ffd9a0'], [7.2, '#6fa6e0', '#f7dcb2', '#fff1c0'], [10, '#4f93e0', '#cfe6fb', '#fff6d6'],
  [14.5, '#4a8fdc', '#d3e8fc', '#fff6d6'], [17, '#6a9bd6', '#ffd29a', '#ffe2a8'], [18.4, '#4b4f8c', '#f39a6a', '#ffb980'], [19.6, '#1b2552', '#6a4f78', '#dfe7ff'], [21.2, '#0a1230', '#1b2a52', '#dfe7ff'], [24, '#070d22', '#16254a', '#dfe7ff']];
function skyAt(h) { for (var i = 0; i < SKYK.length - 1; i++) { var a = SKYK[i], b = SKYK[i + 1]; if (h >= a[0] && h <= b[0]) { var t = (h - a[0]) / (b[0] - a[0]); return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)]; } } return [SKYK[0][1], SKYK[0][2], SKYK[0][3]]; }
var WX_NAME = { clear: '晴', partly: '多雲', cloudy: '陰', fog: '霧', rain: '雨', storm: '雷雨', snow: '雪' };
var WX_L = { clear: 1, partly: .92, cloudy: .62, fog: .55, rain: .45, storm: .35, snow: .78 };
var WX_CLOUD = { clear: [.3, 0, 0, 0, 0], partly: [.85, .75, .5, 0, 0], cloudy: [.9, .95, .9, .9, .85], fog: [.4, .4, .4, .4, .4], rain: [.95, .95, .95, .95, .95], storm: [1, 1, 1, 1, 1], snow: [.9, .9, .9, .85, .85] };
var WX_GRAY = { clear: 0, partly: .12, cloudy: .5, fog: .55, rain: .62, storm: .8, snow: .4 };
var WX_DARK = { clear: 0, partly: 0, cloudy: .08, fog: 0, rain: .18, storm: .32, snow: 0 };
function wmo(c) { if (c === 0) return 'clear'; if (c <= 2) return 'partly'; if (c === 3) return 'cloudy'; if (c === 45 || c === 48) return 'fog'; if (c >= 95) return 'storm'; if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow'; if (c >= 51) return 'rain'; return 'clear'; }
var SKY_LOCATION = { lat: 25.04, lon: 121.56, place: '台北' };   // 改成你家附近的座標，天空會跟著當地天氣
function skyCfg() {
  var c = Object.assign({ mode: 'auto', hour: 12, wx: 'clear' }, SKY_LOCATION, store.get('sky', {}));
  // Migrate the original unnamed Taipei demo default, preserving custom locations.
  if (+c.lat === 25.04 && +c.lon === 121.56 && (!c.place || c.place === SKY_LOCATION.place)) Object.assign(c, SKY_LOCATION);
  c.place = Math.abs(c.lat - SKY_LOCATION.lat) < .000001 && Math.abs(c.lon - SKY_LOCATION.lon) < .000001 ? SKY_LOCATION.place : '自訂位置';
  return c;
}
function saveSky(p) {
  var c = Object.assign(skyCfg(), p);
  c.place = Math.abs(c.lat - SKY_LOCATION.lat) < .000001 && Math.abs(c.lon - SKY_LOCATION.lon) < .000001 ? SKY_LOCATION.place : '自訂位置';
  store.set('sky', c); emit('sky');
}
var wxRequest = 0;
S.wx = { cat: 'clear', temp: null, ok: false, loading: true, time: '' };
function skyNow() {
  var c = skyCfg(), h, w;
  if (c.mode === 'manual') { h = +c.hour; w = c.wx; }
  else {
    var m = /(\d+):(\d+):/.exec((S.st && S.st.timeSynced && S.st.localTime) || ''), d = new Date();
    h = m ? (+m[1] + +m[2] / 60) : (d.getHours() + d.getMinutes() / 60); w = (S.wx && S.wx.cat) || 'clear';
  }
  return { h: h, wx: w, manual: c.mode === 'manual' };
}
function dayFactor(h) { var el = Math.sin(Math.PI * (h - 6) / 12); return Math.max(0, Math.min(1, (el + .05) / .55)); }
function skyLabel() {
  var n = skyNow(), h = n.h, t = (h < 5 || h >= 19.6) ? '夜晚' : h < 7.5 ? '清晨' : h < 17 ? '白天' : '黃昏';
  if (!n.manual && !S.wx.ok) return t + ' · ' + (S.wx.loading ? '天氣讀取中' : '未取得天氣');
  return t + ' · ' + (WX_NAME[n.wx] || '晴') + (!n.manual && S.wx && S.wx.temp != null ? ' · ' + S.wx.temp + '°C' : '') + (n.manual ? '（模擬）' : '');
}
NAMES.weatherInfo = function () {
  var c = skyCfg(), label = c.place + ' · ' + c.lat + ', ' + c.lon;
  if (c.mode === 'manual') return label + ' · 手動預覽，未使用即時天氣';
  return label + ' · Open‑Meteo 模式資料' + (S.wx.ok ? ' · 資料時間 ' + S.wx.time.replace('T', ' ') + '（台灣）' : S.wx.loading ? ' · 查詢中' : ' · 查詢失敗，景色僅為示意');
};
NAMES.weatherPlace = function () { return skyCfg().place; };
NAMES.weatherUpdated = function () {
  if (skyCfg().mode === 'manual') return '手動預覽';
  return S.wx.ok ? '資料 ' + S.wx.time.slice(5, 16).replace('T', ' ') : S.wx.loading ? '同步中' : '暫無資料';
};
function applySky() {
  var n = skyNow(), h = n.h, wx = n.wx, dayF = dayFactor(h), L = (.1 + .9 * dayF) * (WX_L[wx] || 1);
  var c = skyAt(h), top = c[0], bot = c[1], sun = c[2], gray = WX_GRAY[wx] || 0, dark = WX_DARK[wx] || 0;
  var gcol = mix('#8d97a3', '#2a303c', 1 - dayF), glow = Math.max(0, 1 - Math.abs(h - 5.9) / 1.3, 1 - Math.abs(h - 18.2) / 1.3);
  top = mix(mix(top, gcol, gray), '#10131a', dark); bot = mix(mix(bot, gcol, gray * .9), '#10131a', dark * .7);
  var sunUp = h >= 5.7 && h <= 18.4, u = sunUp ? (h - 5.7) / 12.7 : (((h < 5.7 ? h + 24 : h) - 18.4) / 11.3);
  var body = mix(sunUp ? sun : '#e8edf8', top, gray * .7);
  var hill = function (base, night) { return mix(mix(mix(base, night, 1 - dayF), '#c98a7a', glow * .22), gcol, gray * .45); };
  var cloud = mix(mix(mix('#ffffff', '#aab3bd', gray), '#2d3550', 1 - dayF), '#ffc9a0', glow * .3);
  var cov = WX_CLOUD[wx] || [0, 0, 0, 0, 0], night = Math.max(0, Math.min(1, 1 - dayF * 2.2)), stars = night * (wx === 'clear' ? 1 : wx === 'partly' ? .55 : 0);
  var fog = wx === 'fog' ? .62 : wx === 'rain' ? .1 : wx === 'snow' ? .18 : 0;
  var V = {
    '--sc-sky1': top, '--sc-sky2': bot, '--sc-sun': body, '--sc-cloud': cloud, '--sc-rain': mix('#d6e6f6', '#6f82a0', 1 - dayF),
    '--sc-hill1': hill('#b4d2c4', '#2a3d4c'), '--sc-hill2': hill('#8bb9a3', '#1e3140'), '--sc-hill3': hill('#5d9177', '#142331'),
    '--sx': (138 + 124 * u).toFixed(1), '--sy': (200 - 130 * Math.sin(Math.PI * u)).toFixed(1), '--hs': sunUp ? 1 : .55,
    '--bx': Math.round(20 + 22 * u) - 35, '--by': Math.round(25 - 12 * Math.sin(Math.PI * u)) - 20,
    '--L': L.toFixed(3), '--stars': stars.toFixed(2), '--fog': fog,
    '--c1': cov[0], '--c2': cov[1], '--c3': cov[2], '--c4': cov[3], '--c5': cov[4]
  };
  for (var i = 0; i < 5; i++) V['--px-sky' + (i + 1)] = mix(top, bot, i / 4);
  V['--px-sun'] = body; V['--px-halo'] = mix(body, mix(top, bot, .5), .55); V['--px-cloud'] = cloud;
  V['--px-hill1'] = hill('#86a68f', '#2a3d4c'); V['--px-hill2'] = hill('#5e8a73', '#1e3140'); V['--px-pine'] = hill('#3f6b57', '#142331'); V['--px-rain'] = V['--sc-rain'];
  var els = document.querySelectorAll('.scene');
  for (var k in V) for (var j = 0; j < els.length; j++) els[j].style.setProperty(k, V[k]);
  for (var j2 = 0; j2 < els.length; j2++) els[j2].setAttribute('data-wx', wx);
}
function fetchWx() {
  var c = skyCfg(), request = ++wxRequest; if (c.mode === 'manual') return;
  S.wx = { cat: 'clear', temp: null, ok: false, loading: true, time: '' }; emit('wx');
  function failed() { if (request !== wxRequest) return; S.wx = { cat: 'clear', temp: null, ok: false, loading: false, time: '' }; emit('wx'); }
  try {
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&current=weather_code,temperature_2m&timezone=Asia%2FTaipei', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('weather HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (request !== wxRequest) return;
        if (!d || !d.current || !Number.isFinite(d.current.weather_code) || !Number.isFinite(d.current.temperature_2m) || typeof d.current.time !== 'string') throw new Error('invalid weather');
        S.wx = { cat: wmo(d.current.weather_code), temp: Math.round(d.current.temperature_2m), ok: true, loading: false, time: d.current.time }; emit('wx');
      }).catch(failed);
  } catch (e) { failed(); }
}
on(function (st, w) { if (w === 'status' || w === 'wx' || w === 'sky' || w === 'art') applySky(); if (w === 'sky') fetchWx(); });
setInterval(applySky, 60000); setTimeout(fetchWx, 800); setInterval(fetchWx, 900000);

/* components */
function artMode(el) { return store.get('art', (el && el.getAttribute('data-art')) || 'fine'); }
C.scene = function (el) {
  function draw() {
    var m = artMode(el), slice = el.getAttribute('data-fit') === 'slice';
    el.innerHTML = m === 'pixel' ? scenePixel() : sceneFine(slice);
    if (slice && m === 'pixel') { var s = el.firstChild; s.setAttribute('preserveAspectRatio', 'xMidYMid slice'); }
    setK(K.cur); applySky();
  }
  draw(); on(function (s, w) { if (w === 'art') draw(); });
};
C.art = function (el) {
  function draw() {
    var m = artMode(el);
    el.innerHTML = '<div class="rc-seg" role="group" aria-label="插圖風格"><button class="' + (m === 'fine' ? 'on' : '') + '" data-art="fine">精緻</button><button class="' + (m === 'pixel' ? 'on' : '') + '" data-art="pixel">像素</button></div>';
  }
  draw(); on(function (s, w) { if (w === 'art') draw(); });
  el.addEventListener('click', function (e) { var b = e.target.closest('[data-art]'); if (b) setArt(b.getAttribute('data-art')); });
};
function setArt(m) { store.set('art', m); emit('art'); }
window.addEventListener('message', function (e) { if (e.data && e.data.cgArt) setArt(e.data.cgArt); });
window.addEventListener('message', function (e) { if (e.data && e.data.cgSky) { store.set('sky', e.data.cgSky); emit('sky'); } });
C.sky = function (el) {
  function draw() {
    var c = skyCfg();
    el.innerHTML = '<div class="field"><label>窗外景色</label><div class="rc-seg"><button class="' + (c.mode === 'auto' ? 'on' : '') + '" data-m="auto">自動</button><button class="' + (c.mode === 'manual' ? 'on' : '') + '" data-m="manual">手動預覽</button></div></div>' +
      (c.mode === 'manual'
        ? '<div class="field"><label>時間 <b id="sk-hv">' + pad(Math.floor(c.hour)) + ':' + pad(Math.round((c.hour % 1) * 60)) + '</b></label><input type="range" id="sk-h" min="0" max="23.75" step="0.25" value="' + c.hour + '"></div>' +
          '<div class="field"><label>天氣</label><div class="rc-seg">' + Object.keys(WX_NAME).map(function (k) { return '<button class="' + (c.wx === k ? 'on' : '') + '" data-wx="' + k + '">' + WX_NAME[k] + '</button>'; }).join('') + '</div></div>'
        : '<div class="weather-auto"><div class="weather-location" data-private><div class="field"><label>緯度</label><input id="sk-lat" type="number" min="-90" max="90" step="any" value="' + Number(c.lat).toFixed(6) + '"></div><div class="field"><label>經度</label><input id="sk-lon" type="number" min="-180" max="180" step="any" value="' + Number(c.lon).toFixed(6) + '"></div></div>' +
          '<div class="weather-actions"><button type="button" class="btn" data-location="xinshi" data-private>預設地點</button><button type="button" class="btn" data-refresh-wx>更新天氣</button></div>' +
          '<div class="weather-summary"><strong data-bind="outside"></strong><span class="weather-place" data-private data-bind="weatherPlace"></span><span class="weather-place share-only">位置已隱藏</span>' +
          '<div class="weather-meta"><span>Open‑Meteo · 區域估算</span><span data-bind="weatherUpdated"></span></div></div></div>');
  }
  draw();
  el.addEventListener('click', function (e) {
    var m = e.target.closest('[data-m]'), w = e.target.closest('[data-wx]');
    if (m) { saveSky({ mode: m.dataset.m }); draw(); } else if (w) { saveSky({ wx: w.dataset.wx }); draw(); }
    else if (e.target.closest('[data-location]')) { saveSky(Object.assign({ mode: 'auto' }, SKY_LOCATION)); draw(); }
    else if (e.target.closest('[data-refresh-wx]')) fetchWx();
    paint();
  });
  el.addEventListener('input', function (e) {
    if (e.target.id === 'sk-h') { var v = +e.target.value; document.getElementById('sk-hv').textContent = pad(Math.floor(v)) + ':' + pad(Math.round((v % 1) * 60)); saveSky({ hour: v }); }
  });
  el.addEventListener('change', function (e) {
    if (e.target.id === 'sk-lat' || e.target.id === 'sk-lon') {
      var value = +e.target.value, max = e.target.id === 'sk-lat' ? 90 : 180;
      if (e.target.value.trim() === '' || !Number.isFinite(value) || Math.abs(value) > max) { toast('請輸入有效經緯度', true); draw(); paint(); return; }
      saveSky(e.target.id === 'sk-lat' ? { lat: value } : { lon: value });
    }
  });
};
C.styles = function (el) {
  if (Q.get('embed')) { el.innerHTML = ''; return; }
  var cur = location.pathname.split('/').pop().replace('.html', ''), list = [['apple', 'Apple'], ['google', 'Google']];
  el.innerHTML = '<div class="field"><label>介面風格（隨時切換）</label><div class="rc-seg">' + list.map(function (s) { return '<button class="' + (cur === s[0] ? 'on' : '') + '" data-s="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div></div>';
  el.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; store.set('style', b.dataset.s); location.href = b.dataset.s + '.html' + location.search; });
};
