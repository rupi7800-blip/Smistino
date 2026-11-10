/* =========================================================
   Ponte — fa collaborare AgendApp, Smistino e Cartellina
   File identico nelle tre app (js/ponte.js).

   Come funziona
   - Ogni app pubblica un "pacchetto" con quello che condivide
     (appuntamenti, scadenze, email di salute, mittenti…).
   - Le app stanno sullo stesso indirizzo (utente.github.io), quindi
     sullo stesso telefono leggono i pacchetti delle altre dal
     salvataggio locale condiviso: niente server, niente account.
   - Automatico: si condivide da solo a ogni modifica e all'apertura.
     Manuale: si condivide solo con il tasto "Condividi e ricevi".
   - Su un altro dispositivo (o su iPhone, dove ogni app sulla Home
     ha il suo salvataggio separato) si usa Esporta / Importa pacchetto.

   Uso nell'app:
     Ponte.init({ app, pubblica(), ricevi(da, dati), scollega(da), dopo(), toast(msg), descr:{altraApp:'testo'} })
     Ponte.cambiato()   dopo ogni salvataggio
     Ponte.apri()       apre il pannello "Collega le app"
   ========================================================= */
(function () {
  'use strict';

  var V = 1, PREF = 'ponte.v1.';
  var APPS = {
    agendapp: { nome: 'AgendApp', colore: '#14244a', cartella: 'AgendApp' },
    smistino: { nome: 'Smistino', colore: '#5b4fe0', cartella: 'Smistino' },
    cartellina: { nome: 'Cartellina', colore: '#1f9a87', cartella: 'Cartellina-' }
  };
  var cfg = null, me = '', tPub = null, tPull = null, inCorso = false;

  // ---------- utilità ----------
  function leggi(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function scrivi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function quando(ts) {
    if (!ts) return 'mai';
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'adesso';
    if (m < 60) return m + ' min fa';
    if (m < 1440) return Math.round(m / 60) + ' ore fa';
    var d = new Date(ts); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function altre() { return Object.keys(APPS).filter(function (a) { return a !== me; }); }
  function toast(t, ms) { if (cfg && cfg.toast) cfg.toast(t, ms); }

  // ---------- impostazioni (per app) ----------
  function imp() {
    var x = leggi(PREF + 'imp.' + me) || {};
    if (x.attivo == null) x.attivo = false;
    if (x.auto == null) x.auto = true;
    x.con = x.con || {}; altre().forEach(function (a) { if (x.con[a] == null) x.con[a] = true; });
    x.ricevuto = x.ricevuto || {};
    x.ignora = x.ignora || {};
    x.hash = x.hash || '';
    return x;
  }
  function salvaImp(x) { scrivi(PREF + 'imp.' + me, x); }
  function pacchetto(a) { var p = leggi(PREF + 'pkt.' + a); return p && p.v === V && p.app === a ? p : null; }
  function baseUrl() { return location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, ''); }
  function urlApp(a) {
    var p = pacchetto(a);
    if (p && p.url) return p.url;
    return baseUrl().replace(/[^/]+\/$/, '') + APPS[a].cartella + '/';
  }

  // ---------- pubblica ----------
  function costruisci() {
    var dati = {};
    try { dati = cfg.pubblica() || {}; } catch (e) { console.warn('Ponte: pubblica', e); }
    return { v: V, app: me, nome: APPS[me].nome, url: baseUrl(), ts: Date.now(), dati: dati };
  }
  /** scrive il proprio pacchetto se è cambiato; true se è cambiato */
  function pubblica(forza) {
    var x = imp();
    if (!x.attivo) return false;
    var p = costruisci(), h = hash(JSON.stringify(p.dati));
    if (!forza && h === x.hash && pacchetto(me)) return false;
    p.hash = h;
    if (!scrivi(PREF + 'pkt.' + me, p)) { toast('Ponte: memoria piena, non riesco a condividere'); return false; }
    x.hash = h; salvaImp(x);
    return true;
  }
  function cambiato() {
    var x = imp();
    if (!x.attivo || !x.auto) { segnale(); return; }
    clearTimeout(tPub);
    tPub = setTimeout(function () { pubblica(false); }, 1200);
  }

  // ---------- ricevi ----------
  /** legge i pacchetti delle altre app; ritorna il numero di cose cambiate */
  function ricevi(manuale, forza) {
    var x = imp();
    if (!x.attivo || inCorso) return 0;
    inCorso = true;
    var tot = 0, frasi = [];
    altre().forEach(function (a) {
      if (!x.con[a]) return;
      var p = pacchetto(a);
      if (!p) return;
      if (!forza && p.ts <= (x.ricevuto[a] || 0)) return;
      var r = null;
      try { r = cfg.ricevi(a, p.dati || {}, p); } catch (e) { console.warn('Ponte: ricevi da ' + a, e); }
      x = imp(); x.ricevuto[a] = p.ts; salvaImp(x);
      if (r && r.n) { tot += r.n; if (r.testo) frasi.push(APPS[a].nome + ': ' + r.testo); }
    });
    inCorso = false;
    if (tot) {
      try { if (cfg.dopo) cfg.dopo(); } catch (e) { /* no */ }
      toast('🔗 ' + frasi.join(' · '), 4500);
      pubblica(false); // es. stati "fatto" aggiornati
    } else if (manuale) toast('🔗 Tutto già allineato');
    segnale();
    return tot;
  }
  function sincronizza(manuale) {
    var x = imp();
    if (!x.attivo) { apri(); return; }
    pubblica(!!manuale);
    var n = ricevi(manuale, !!manuale);
    if (manuale) {
      var viste = altre().filter(function (a) { return x.con[a] && pacchetto(a); });
      if (!viste.length) toast('Condiviso. Non vedo ancora le altre app su questo dispositivo: aprile e attiva "Collega le app" anche lì.', 6000);
    }
    return n;
  }
  function novita() {
    var x = imp();
    if (!x.attivo) return altre().some(function (a) { return pacchetto(a); }) ? 1 : 0;
    return altre().filter(function (a) { var p = pacchetto(a); return x.con[a] && p && p.ts > (x.ricevuto[a] || 0); }).length;
  }

  // ---------- file (altri dispositivi / iPhone) ----------
  function esporta() {
    var p = costruisci(); p.hash = hash(JSON.stringify(p.dati));
    var d = new Date(), nome = 'ponte-' + me + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json';
    var testo = JSON.stringify(p);
    try {
      var file = new File([testo], nome, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Pacchetto ' + APPS[me].nome, text: 'Da importare in AgendApp, Smistino o Cartellina' }).catch(function () {});
        return;
      }
    } catch (e) { /* passa al download */ }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([testo], { type: 'application/json' })); a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Pacchetto salvato: aprilo con "Importa pacchetto" nell\'altra app', 4500);
  }
  function importa() {
    var i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.multiple = true;
    i.onchange = function () {
      var files = Array.prototype.slice.call(i.files);
      Promise.all(files.map(function (f) { return f.text().then(function (t) { return JSON.parse(t); }).catch(function () { return null; }); })).then(function (lista) {
        var x = imp(), ok = 0;
        lista.forEach(function (p) {
          if (!p || p.v !== V || !APPS[p.app] || p.app === me) return;
          var c = pacchetto(p.app);
          if (!c || (p.ts || 0) >= (c.ts || 0)) scrivi(PREF + 'pkt.' + p.app, p);
          x.con[p.app] = true; ok++;
        });
        if (!ok) { toast('Il file non è un pacchetto di AgendApp, Smistino o Cartellina'); return; }
        if (!x.attivo) { x.attivo = true; }
        salvaImp(x);
        var n = ricevi(false, true);
        if (!n) toast('Pacchetto letto: niente di nuovo');
        pubblica(true);
        if (document.querySelector('.pnt-bg')) apri();
      });
    };
    i.click();
  }

  // ---------- interfaccia ----------
  var CSS = '.pnt-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:inherit;cursor:pointer;padding:0}' +
    '.pnt-btn svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.pnt-btn.on svg{stroke-width:2.4}.pnt-btn i{position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:#ff5a4e;box-shadow:0 0 0 2px #fff}' +
    '.pnt-bg{position:fixed;inset:0;z-index:9000;background:rgba(10,14,30,.45);display:flex;align-items:flex-end;justify-content:center;animation:pntf .2s}' +
    '@keyframes pntf{from{opacity:0}}@keyframes pnts{from{transform:translateY(40px)}}' +
    '.pnt{background:#fff;color:#1b2033;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font:15px/1.45 inherit;font-family:inherit;animation:pnts .25s;box-sizing:border-box}' +
    '@media(min-width:700px){.pnt-bg{align-items:center}.pnt{border-radius:22px}}' +
    '.pnt h2{margin:0;font-size:20px}.pnt h3{margin:0;font-size:15.5px}.pnt p{margin:6px 0}.pnt .pm{color:#6b7280;font-size:13.5px}' +
    '.pnt-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}.pnt-h .g{flex:1}.pnt-x{border:0;background:#f1f3f8;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;color:#1b2033}' +
    '.pnt-card{border:1px solid #e6e8f0;border-radius:16px;padding:13px 14px;margin:10px 0;background:#fafbfe}' +
    '.pnt-row{display:flex;align-items:center;gap:12px}.pnt-row .g{flex:1;min-width:0}' +
    '.pnt-dot{width:38px;height:38px;border-radius:12px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex:none}' +
    '.pnt-sw{position:relative;width:48px;height:28px;flex:none}.pnt-sw input{opacity:0;width:0;height:0;position:absolute}' +
    '.pnt-sw span{position:absolute;inset:0;background:#cfd4e0;border-radius:20px;transition:.2s;cursor:pointer}.pnt-sw span:after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.25)}' +
    '.pnt-sw input:checked+span{background:#22a06b}.pnt-sw input:checked+span:after{transform:translateX(20px)}' +
    '.pnt-seg{display:flex;background:#eef0f6;border-radius:12px;padding:3px;margin-top:10px}.pnt-seg button{flex:1;border:0;background:transparent;padding:9px;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;color:#4b5263}.pnt-seg button.on{background:#fff;color:#1b2033;box-shadow:0 1px 3px rgba(0,0,0,.12)}' +
    '.pnt-b{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.pnt-b button,.pnt-b a{flex:1 1 auto;border:0;border-radius:12px;padding:12px 14px;font:inherit;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;background:#eef0f6;color:#1b2033}' +
    '.pnt-b .pri{background:#1b2033;color:#fff}.pnt-tag{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:20px;background:#e7f6ee;color:#167a4c;margin-top:4px}.pnt-tag.no{background:#fff1e6;color:#b4520f}' +
    '.pnt a.pl{color:inherit;font-weight:700;font-size:13px}.pnt.off .pnt-sez{opacity:.45;pointer-events:none}' +
    '@media(prefers-color-scheme:dark){.pnt{background:#171b26;color:#eef1f8}.pnt .pm{color:#9aa3b5}.pnt-card{background:#1f2431;border-color:#2c3344}.pnt-x,.pnt-b button,.pnt-b a{background:#2a3040;color:#eef1f8}.pnt-seg{background:#2a3040}.pnt-seg button{color:#b8c0d2}.pnt-seg button.on{background:#3a4256;color:#fff}.pnt-b .pri{background:#eef1f8;color:#171b26}.pnt-btn i{box-shadow:0 0 0 2px #171b26}}';
  var ICONA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.6 10.7 15.4 7.3M8.6 13.3l6.8 3.4"/></svg>';
  function css() {
    if (document.getElementById('pnt-css')) return;
    var s = document.createElement('style'); s.id = 'pnt-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function segnale() {
    var x = imp(), n = novita();
    Array.prototype.forEach.call(document.querySelectorAll('.pnt-btn'), function (b) {
      b.classList.toggle('on', x.attivo);
      b.innerHTML = ICONA + (n ? '<i></i>' : '');
      b.title = x.attivo ? (n ? 'Novità dalle altre app' : 'App collegate') : 'Collega le app';
    });
  }
  function mettiTasto() {
    css();
    Array.prototype.forEach.call(document.querySelectorAll('[data-ponte-slot]'), function (slot) {
      if (slot.querySelector('.pnt-btn')) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pnt-btn'; b.setAttribute('aria-label', 'Collega le app');
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); apri(); });
      slot.appendChild(b);
    });
    segnale();
  }
  function chiudi() { var b = document.querySelector('.pnt-bg'); if (b) b.remove(); }
  function apri() {
    css(); chiudi();
    var x = imp();
    var h = '<div class="pnt' + (x.attivo ? '' : ' off') + '" role="dialog" aria-modal="true"><div class="pnt-h"><div class="g"><h2>Collega le app</h2><p class="pm" style="margin:2px 0 0">' + esc(APPS[me].nome) + ' lavora insieme alle altre tue app</p></div><button class="pnt-x" data-p="chiudi" aria-label="Chiudi">×</button></div>' +
      '<div class="pnt-card" style="background:transparent"><div class="pnt-row"><div class="g"><h3>Collaborazione</h3><p class="pm" style="margin:2px 0 0">' + (x.attivo ? 'Attiva' : 'Spenta: le app non si scambiano niente') + '</p></div><label class="pnt-sw"><input type="checkbox" data-p="attivo"' + (x.attivo ? ' checked' : '') + '><span></span></label></div>' +
      '<div class="pnt-sez"><div class="pnt-seg"><button data-p="auto" class="' + (x.auto ? 'on' : '') + '">Automatica</button><button data-p="manuale" class="' + (x.auto ? '' : 'on') + '">Manuale</button></div>' +
      '<p class="pm">' + (x.auto ? 'Si aggiornano da sole: a ogni modifica e quando apri l\'app.' : 'Si aggiornano solo quando premi "Condividi e ricevi".') + '</p></div></div><div class="pnt-sez">';
    altre().forEach(function (a) {
      var p = pacchetto(a), A = APPS[a], nuovo = p && p.ts > (x.ricevuto[a] || 0);
      h += '<div class="pnt-card"><div class="pnt-row"><div class="pnt-dot" style="background:' + A.colore + '">' + A.nome.charAt(0) + '</div><div class="g"><h3>' + esc(A.nome) + '</h3><p class="pm" style="margin:2px 0 0">' + esc((cfg.descr || {})[a] || '') + '</p>' +
        (p ? '<span class="pnt-tag">' + (nuovo ? 'Novità da ricevere · ' : 'Collegata · ') + 'aggiornata ' + quando(p.ts) + '</span>' : '<span class="pnt-tag no">Non ancora vista su questo dispositivo</span> <a class="pl" href="' + esc(urlApp(a)) + '" target="_blank" rel="noopener">Apri ' + esc(A.nome) + ' ›</a>') +
        '</div><label class="pnt-sw"><input type="checkbox" data-p="con" data-a="' + a + '"' + (x.con[a] ? ' checked' : '') + '><span></span></label></div></div>';
    });
    h += '<div class="pnt-b"><button class="pri" data-p="sync">Condividi e ricevi ora</button></div></div>' +
      '<h3 style="margin:18px 0 4px">Altro telefono o iPhone</h3><p class="pm">Se le app non si vedono (altro dispositivo, o iPhone con le app sulla Home), passa i dati con un file. Importare un pacchetto attiva la collaborazione.</p>' +
      '<div class="pnt-b"><button data-p="esporta">Esporta pacchetto</button><button data-p="importa">Importa pacchetto</button></div>' +
      '<p class="pm" style="margin-top:16px">Tutto resta su questo dispositivo: nessun server, nessun account.</p></div>';
    var bg = document.createElement('div');
    bg.className = 'pnt-bg'; bg.innerHTML = h;
    bg.addEventListener('click', function (e) {
      if (e.target === bg) { chiudi(); return; }
      var el = e.target.closest('[data-p]'); if (!el || el.tagName === 'INPUT') return;
      var k = el.dataset.p, y = imp();
      if (k === 'chiudi') chiudi();
      if (k === 'auto' || k === 'manuale') { y.auto = k === 'auto'; salvaImp(y); if (y.auto) sincronizza(false); apri(); }
      if (k === 'sync') { sincronizza(true); apri(); }
      if (k === 'esporta') esporta();
      if (k === 'importa') importa();
    });
    bg.addEventListener('change', function (e) {
      var el = e.target, y = imp();
      if (el.dataset.p === 'attivo') {
        y.attivo = el.checked;
        if (!y.attivo) {
          var n = 0; altre().forEach(function (a) { try { n += (cfg.scollega && cfg.scollega(a, true)) || 0; } catch (er) { /* no */ } });
          if (n && confirm('Tolgo da ' + APPS[me].nome + ' anche le ' + n + ' cose arrivate dalle altre app?')) { altre().forEach(function (a) { cfg.scollega(a, false); }); if (cfg.dopo) cfg.dopo(); }
          try { localStorage.removeItem(PREF + 'pkt.' + me); } catch (er) { /* no */ }
          y.hash = ''; salvaImp(y); toast('Collaborazione spenta');
        } else { y.ricevuto = {}; y.hash = ''; salvaImp(y); sincronizza(false); toast('🔗 App collegate'); }
        apri(); segnale();
      }
      if (el.dataset.p === 'con') {
        var a = el.dataset.a; y.con[a] = el.checked;
        if (el.checked) { delete y.ricevuto[a]; salvaImp(y); ricevi(false, true); }
        else {
          salvaImp(y);
          var m = (cfg.scollega && cfg.scollega(a, true)) || 0;
          if (m && confirm('Tolgo le ' + m + ' cose arrivate da ' + APPS[a].nome + '?')) { cfg.scollega(a, false); if (cfg.dopo) cfg.dopo(); }
        }
        apri();
      }
    });
    document.body.appendChild(bg);
  }

  // ---------- avvio ----------
  function init(c) {
    cfg = c; me = c.app;
    if (!APPS[me]) throw new Error('Ponte: app sconosciuta ' + me);
    mettiTasto();
    var x = imp();
    if (x.attivo && x.auto) setTimeout(function () { pubblica(false); ricevi(false); }, 900);
    // un'altra app (in un'altra scheda o finestra) ha pubblicato
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key.indexOf(PREF + 'pkt.') !== 0 || e.key === PREF + 'pkt.' + me) return;
      var y = imp();
      if (y.attivo && y.auto) { clearTimeout(tPull); tPull = setTimeout(function () { ricevi(false); }, 400); } else segnale();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { var y = imp(); if (y.attivo && y.auto) { clearTimeout(tPub); pubblica(false); } return; }
      var z = imp(); if (z.attivo && z.auto) { pubblica(false); ricevi(false); } else segnale();
    });
  }

  window.Ponte = {
    init: init,
    apri: apri,
    cambiato: cambiato,
    sincronizza: sincronizza,
    mettiTasto: mettiTasto,
    attivo: function () { return imp().attivo; },
    collegata: function (a) { var x = imp(); return x.attivo && !!x.con[a]; },
    nome: function (a) { return (APPS[a] || { nome: a }).nome; },
    colore: function (a) { return (APPS[a] || { colore: '#64748b' }).colore; },
    /** l'utente ha eliminato un elemento arrivato da un'altra app: non rimetterlo */
    ignora: function (uid) { var x = imp(); x.ignora[uid] = Date.now(); salvaImp(x); },
    ignorato: function (uid) { return !!imp().ignora[uid]; }
  };
})();
