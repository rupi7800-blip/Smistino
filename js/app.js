/* =========================================================
   Smistino — app principale
   Tutti i messaggi (email illimitate + WhatsApp, Telegram, SMS
   e altre app) in un posto solo, già smistati per sezione.
   Dati salvati solo sul telefono (IndexedDB).
   ========================================================= */
(function () {
  'use strict';

  // ---------------------------------------------------------
  // Utilità
  // ---------------------------------------------------------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function at(g, ora) { var d = parseYmd(g); if (ora) { var h = ora.split(':'); d.setHours(+h[0], +h[1], 0, 0); } return d; }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  var GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  var GGL = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var MML = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function fmtData(s) { var d = parseYmd(s); return GG[d.getDay()] + ' ' + d.getDate() + ' ' + MM[d.getMonth()]; }
  function fmtLunga(s) { var d = parseYmd(s); return GGL[d.getDay()] + ' ' + d.getDate() + ' ' + MML[d.getMonth()]; }
  function quando(s) {
    var diff = Math.round((parseYmd(s) - parseYmd(ymd(new Date()))) / 864e5);
    if (diff === 0) return 'Oggi'; if (diff === 1) return 'Domani'; if (diff > 1 && diff < 7) return 'Tra ' + diff + ' giorni';
    return fmtData(s);
  }
  function quandoMsg(iso) {
    var d = new Date(iso), ora = new Date();
    if (ymd(d) === ymd(ora)) return hm(d);
    var ieri = new Date(ora); ieri.setDate(ieri.getDate() - 1);
    if (ymd(d) === ymd(ieri)) return 'ieri';
    if (ora - d < 6 * 864e5) return GG[d.getDay()];
    return d.getDate() + ' ' + MM[d.getMonth()] + (d.getFullYear() !== ora.getFullYear() ? ' ' + String(d.getFullYear()).slice(2) : '');
  }
  function plur(n, uno, tanti) { return n + ' ' + (n === 1 ? uno : tanti); }
  function fmtTs(ts) { var d = new Date(ts); return d.getDate() + ' ' + MM[d.getMonth()] + ' ' + hm(d); }
  var N = Smista.norm;

  // ---------------------------------------------------------
  // Icone
  // ---------------------------------------------------------
  var IC = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chevup: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17l9-10"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    reply: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v4"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    plug: '<svg viewBox="0 0 24 24"><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/></svg>',
    rules: '<svg viewBox="0 0 24 24"><path d="M4 6h10M4 12h7M4 18h10"/><path d="m16 15 2 2 4-4"/><circle cx="18" cy="6" r="2"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    move: '<svg viewBox="0 0 24 24"><path d="M3 7h13l-3-3M21 17H8l3 3"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    // sezioni
    lavoro: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
    persone: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    salute: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    banca: '<svg viewBox="0 0 24 24"><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>',
    acquisti: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/></svg>',
    casa: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M12 13l-2 3h4l-2 3"/></svg>',
    burocrazia: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="12" cy="15" r="2.5"/></svg>',
    studio: '<svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/></svg>',
    sport: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/></svg>',
    viaggi: '<svg viewBox="0 0 24 24"><path d="M10.5 13.5 3 11l1.5-1.5 8 1L17 6a2 2 0 0 1 3 3l-4.5 4.5 1 8L15 23l-2.5-7.5L9 19v3l-1.5-1.5L6 18l-2.5-1.5L2 15h3z"/></svg>',
    account: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    social: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/></svg>',
    promo: '<svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    smistare: '<svg viewBox="0 0 24 24"><path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/></svg>',
    cartella: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    auto: '<svg viewBox="0 0 24 24"><path d="M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4z"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg>',
    animali: '<svg viewBox="0 0 24 24"><circle cx="5" cy="10" r="2"/><circle cx="9" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M12 11c-3 0-6 4.5-6 7a2.5 2.5 0 0 0 3.5 2.3 6 6 0 0 1 5 0A2.5 2.5 0 0 0 18 18c0-2.5-3-7-6-7z"/></svg>',
    // canali
    chat: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/><path d="M9 9.5c.3 1.8 2.6 4.3 4.6 4.7l1-1"/></svg>',
    telegram: '<svg viewBox="0 0 24 24"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg>',
    sms: '<svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>'
  };
  var ICONE_SEZ = ['lavoro', 'persone', 'salute', 'banca', 'acquisti', 'casa', 'burocrazia', 'studio', 'sport', 'viaggi', 'account', 'social', 'promo', 'auto', 'animali', 'cartella', 'star', 'cal', 'bell'];
  var COLORI = ['#4f5bd5', '#ec4899', '#14b8a6', '#0ea5e9', '#f59e0b', '#84cc16', '#64748b', '#8b5cf6', '#ef4444', '#06b6d4', '#0f766e', '#a855f7', '#94a3b8', '#f97316', '#22c55e', '#e11d48'];
  function ic(nome, px) { var s = IC[nome] || IC.cartella; return px ? s.replace('<svg', '<svg style="width:' + px + 'px;height:' + px + 'px"') : s; }

  var CANALI_BASE = [
    { id: 'whatsapp', nome: 'WhatsApp', colore: '#25d366', icona: 'whatsapp', app: ['whatsapp', 'com.whatsapp', 'com.whatsapp.w4b', 'whatsapp business'] },
    { id: 'telegram', nome: 'Telegram', colore: '#229ed9', icona: 'telegram', app: ['telegram', 'org.telegram.messenger', 'org.thunderdog.challegram'] },
    { id: 'sms', nome: 'SMS', colore: '#f97316', icona: 'sms', app: ['sms', 'messaggi', 'messages', 'com.google.android.apps.messaging', 'com.samsung.android.messaging', 'com.android.mms'] }
  ];
  var DOMINI_LIBERI = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.it', 'libero.it', 'hotmail.com', 'hotmail.it', 'outlook.com', 'outlook.it', 'live.com', 'live.it', 'icloud.com', 'me.com',
    'virgilio.it', 'alice.it', 'tim.it', 'tiscali.it', 'fastwebnet.it', 'email.it', 'inwind.it', 'aruba.it', 'pec.it', 'legalmail.it', 'msn.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.it'];

  // ---------------------------------------------------------
  // Dati (IndexedDB, con riserva su localStorage)
  // ---------------------------------------------------------
  var KEY = 'smistino.dati';
  function def() {
    return {
      v: 1,
      sezioni: Smista.SEZIONI_BASE.map(function (s) { var c = JSON.parse(JSON.stringify(s)); c.notifica = !s.silenziosa && s.id !== 'social'; return c; }),
      regole: { mittenti: {}, chat: {}, parole: {} },
      account: [], canali: JSON.parse(JSON.stringify(CANALI_BASE)),
      msg: {}, scadenze: [], notificati: {}, ponteMitt: {},
      imp: { nome: '', intervallo: 10, giorni: 7, autoScadenze: true, imparaMittenti: true, promemoria: true, notifiche: true, ultimoCanale: 'whatsapp', viste: 0 }
    };
  }
  var D = def();
  var DB = null;
  function apriDB() {
    return new Promise(function (ok) {
      if (!window.indexedDB) return ok(null);
      try {
        var r = indexedDB.open('smistino', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { ok(null); };
      } catch (e) { ok(null); }
    });
  }
  function leggi() {
    return apriDB().then(function (db) {
      DB = db;
      if (!db) { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
      return new Promise(function (ok) {
        var t = db.transaction('kv').objectStore('kv').get(KEY);
        t.onsuccess = function () { ok(t.result || null); };
        t.onerror = function () { ok(null); };
      });
    });
  }
  function unisci(d) {
    var b = def();
    d = d || {};
    Object.keys(b).forEach(function (k) {
      if (d[k] == null) d[k] = b[k];
      else if (k === 'imp' || k === 'regole') Object.keys(b[k]).forEach(function (j) { if (d[k][j] == null) d[k][j] = b[k][j]; });
    });
    return d;
  }
  var tSave = null;
  function save(subito) {
    clearTimeout(tSave);
    var fai = function () {
      if (DB) { try { DB.transaction('kv', 'readwrite').objectStore('kv').put(D, KEY); return; } catch (e) { /* passa a localStorage */ } }
      try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { pulisci(true); try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e2) { toast('Memoria piena: fai un backup e pulisci'); } }
    };
    if (subito) fai(); else tSave = setTimeout(fai, 300);
    if (window.Ponte) Ponte.cambiato();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(true); });

  // archivio leggero: promo/social vecchie si accorciano, oltre 1 anno si tolgono (non stellati)
  function pulisci(forte) {
    var ora = Date.now(), lista = Object.keys(D.msg);
    lista.forEach(function (k) {
      var m = D.msg[k], eta = ora - new Date(m.date).getTime();
      var sil = sez(m.sezione).silenziosa || m.sezione === 'social';
      if (m.stella) return;
      if (eta > (forte ? 120 : 365) * 864e5 || (sil && eta > (forte ? 20 : 60) * 864e5)) { delete D.msg[k]; return; }
      if (sil && m.body && m.body.length > 1200) m.body = m.body.slice(0, 1200);
    });
    D.scadenze = D.scadenze.filter(function (s) { return at(s.data, '23:59') > ora - 30 * 864e5; });
    Object.keys(D.notificati).forEach(function (k) { if (D.notificati[k] < ora - 60 * 864e5) delete D.notificati[k]; });
  }

  // ---------------------------------------------------------
  // Sezioni, account, canali
  // ---------------------------------------------------------
  var SMISTARE = { id: 'smistare', nome: 'Da smistare', colore: '#ff8a3d', icona: 'smistare' };
  function sez(id) { return id === 'smistare' ? SMISTARE : (D.sezioni.filter(function (s) { return s.id === id; })[0] || SMISTARE); }
  function sezAttive() { return D.sezioni.filter(function (s) { return !s.off; }); }
  function cfg() { return { sezioni: D.sezioni, regole: D.regole }; }
  function account(id) { return D.account.filter(function (a) { return a.id === id; })[0]; }
  function canale(id) { return D.canali.filter(function (c) { return c.id === id; })[0]; }
  function fonte(m) {
    if (m.tipo === 'chat') { var c = canale(m.canale) || { nome: m.canale, colore: '#64748b', icona: 'chat' }; return { nome: c.nome, colore: c.colore, icona: c.icona || 'chat' }; }
    var a = account(m.fonte) || { nome: 'Email', colore: '#64748b' };
    return { nome: a.nome || a.indirizzo, colore: a.colore || '#64748b', icona: 'mail' };
  }
  function canaleDaApp(app) {
    var a = N(app).trim();
    if (!a) return canale('sms') ? 'sms' : D.canali[0].id;
    var c = D.canali.filter(function (x) { return x.id === a || N(x.nome) === a || (x.app || []).some(function (p) { p = N(p); return p && (a === p || a.indexOf(p) >= 0); }); })[0];
    if (c) return c.id;
    // app nuova: la aggiungo da sola
    var nome = app.replace(/^(com|org|net)\./, '').split('.').filter(function (x) { return !/^(android|apps|app|messenger|messaging)$/.test(x); }).pop() || app;
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    var nuovo = { id: 'c' + hash(a), nome: nome, colore: COLORI[D.canali.length % COLORI.length], icona: 'chat', app: [a] };
    D.canali.push(nuovo);
    return nuovo.id;
  }

  // ---------------------------------------------------------
  // Interfaccia di base
  // ---------------------------------------------------------
  function toast(msg, ms) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toastRoot').appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2600);
  }
  function sheet(titolo, html, onMount) {
    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-h"><h2>' + titolo + '</h2><button class="x" data-act="closeSheet" aria-label="Chiudi">' + IC.x + '</button></div>' + html + '</div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) chiudiSheet(); });
    $('#sheetRoot').appendChild(bg);
    var s = bg.querySelector('.sheet');
    if (onMount) onMount(s);
    return s;
  }
  function chiudiSheet(tutti) {
    var all = $$('#sheetRoot .sheet-bg');
    if (!all.length) return;
    if (tutti) all.forEach(function (x) { x.remove(); }); else all[all.length - 1].remove();
  }
  function banner(html, onAct, ms) {
    var b = document.createElement('div');
    b.className = 'banner'; b.innerHTML = html;
    b.addEventListener('click', function (e) { var a = e.target.closest('[data-b]'); if (a) { if (onAct) onAct(a.dataset.b); b.remove(); } });
    $('#bannerRoot').appendChild(b);
    if (ms) setTimeout(function () { b.remove(); }, ms);
    return b;
  }
  function copia(t, msg) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast(msg || 'Copiato ✓'); }, function () { prompt('Copia:', t); });
    else prompt('Copia:', t);
  }

  // ---------------------------------------------------------
  // Navigazione
  // ---------------------------------------------------------
  var VIEWS = {};
  var ALTRO = { fonti: 1, importa: 1, regole: 1, impostazioni: 1, guida: 1, altro: 1 };
  function route() {
    var parts = (location.hash || '#/home').slice(2).split('/');
    var name = VIEWS[parts[0]] ? parts[0] : 'home';
    $$('.tabbar a').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === (ALTRO[name] ? 'altro' : name)); });
    var v = $('#view');
    v.innerHTML = '';
    VIEWS[name](v, parts.slice(1).map(decodeURIComponent));
    aggiornaBadge();
  }
  function ridisegna() { var y = window.scrollY; route(); window.scrollTo(0, y); }
  window.addEventListener('hashchange', function () { chiudiSheet(true); route(); window.scrollTo(0, 0); });

  var ACT = {};
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); e.stopPropagation(); fn(el, e); }
  });
  ACT.closeSheet = function () { chiudiSheet(); };
  ACT.go = function (el) { location.hash = el.dataset.to; };
  ACT.copia = function (el) { copia(el.dataset.t); };

  // ---------------------------------------------------------
  // Elenchi e conteggi
  // ---------------------------------------------------------
  function tutti() { return Object.keys(D.msg).map(function (k) { return D.msg[k]; }); }
  function nonLetti(lista) { return lista.filter(function (m) { return !m.letto && !m.mio; }).length; }
  function daSmistare() { return tutti().filter(function (m) { return m.sezione === 'smistare' && !m.mio; }); }
  function daConfermare() { return tutti().filter(function (m) { return m.fiducia === 'media' && !m.mio; }); }
  function contaSez() {
    var c = {};
    tutti().forEach(function (m) {
      var x = c[m.sezione] = c[m.sezione] || { tot: 0, nuovi: 0 };
      x.tot++; if (!m.letto && !m.mio) x.nuovi++;
    });
    return c;
  }
  function aggiornaBadge() {
    var n = daSmistare().length, b = $('#navBadge');
    b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
  }
  function chatKey(m) { return Smista.chiaveChat({ canale: m.canale, chat: m.chat, from: m.da }); }

  // ---------------------------------------------------------
  // Arrivo dei messaggi: classifica, estrai, avvisa
  // ---------------------------------------------------------
  function perClassificare(m) {
    return { tipo: m.tipo, canale: m.canale, from: m.tipo === 'chat' ? m.da : m.from, to: m.to, subject: m.subject, body: m.body, chat: m.chat, labels: m.labels, listUnsub: m.listUnsub, date: m.date };
  }
  function classificaMsg(m) {
    var r = Smista.classifica(perClassificare(m), cfg());
    m.sezione = r.sezione; m.fiducia = r.fiducia; m.motivi = r.motivi;
    m.alt = (r.classifica || []).filter(function (x) { return x.id !== r.sezione && x.p >= 3; }).slice(0, 2).map(function (x) { return x.id; });
  }
  /** lista di messaggi già normalizzati → aggiunge quelli nuovi */
  function aggiungi(lista, opz) {
    opz = opz || {};
    var st = { nuovi: 0, perSez: {}, scadenze: 0, primo: null };
    lista.forEach(function (m) {
      if (!m || !m.id || D.msg[m.id]) return;
      m.arrivato = Date.now();
      if (m.tipo === 'chat') m.chatKey = chatKey(m);
      classificaMsg(m);
      if (opz.storico) m.letto = true;
      m.estratto = Smista.estrai(perClassificare(m), new Date());
      D.msg[m.id] = m; st.nuovi++;
      if (!st.primo) st.primo = m.id;
      if (!m.mio) st.perSez[m.sezione] = (st.perSez[m.sezione] || 0) + 1;
      if (D.imp.autoScadenze && !m.mio && !sez(m.sezione).silenziosa) st.scadenze += autoScadenze(m);
    });
    save();
    return st;
  }
  function autoScadenze(m) {
    var n = 0;
    (m.estratto.eventi || []).forEach(function (ev) {
      if (!ev.certo || haScadenza(m.id, ev)) return;
      D.scadenze.push({ id: uid(), data: ev.data, ora: ev.ora, tipo: ev.tipo, titolo: ev.titolo, msgId: m.id, sezione: m.sezione, auto: true, fatto: false });
      n++;
    });
    return n;
  }
  function haScadenza(msgId, ev) { return D.scadenze.some(function (s) { return s.msgId === msgId && s.data === ev.data && (s.ora || '') === (ev.ora || ''); }); }

  function normEmail(e, accId) {
    return { id: 'e-' + accId + '-' + e.id, gid: e.id, threadId: e.threadId, tipo: 'email', fonte: accId, from: e.from || '', to: e.to || '', cc: e.cc || '', subject: e.subject || '',
      body: String(e.body || '').slice(0, 8000), date: e.date || new Date().toISOString(), labels: e.labels || [], attachments: e.attachments || [], listUnsub: !!e.listUnsub,
      letto: e.unread === false, demo: !!e.demo };
  }
  function normChat(m) {
    var c = m.canale || canaleDaApp(m.app || '');
    var id = m.id ? 'c-' + m.id : 'c-' + hash(c + '|' + (m.chat || '') + '|' + (m.da || '') + '|' + m.date + '|' + m.testo);
    return { id: id, tipo: 'chat', canale: c, chat: m.chat || m.da || 'Chat', da: m.da || m.chat || '', body: String(m.testo || '').slice(0, 6000), date: m.date || new Date().toISOString(),
      numero: m.numero || '', mio: !!m.mio, demo: !!m.demo };
  }
  function avvisa(st, manuale) {
    var parti = Object.keys(st.perSez).filter(function (k) { return k === 'smistare' || sez(k).notifica; })
      .map(function (k) { return sez(k).nome + ' ' + st.perSez[k]; });
    if (!st.nuovi) { if (manuale) toast('Nessun messaggio nuovo'); return; }
    if (!parti.length) { if (manuale) toast(st.nuovi + ' nuovi (sezioni silenziose)'); return; }
    var extra = st.scadenze ? ' · ' + st.scadenze + ' in scadenza' : '';
    toast('📬 ' + parti.join(' · ') + extra, 4000);
    if (D.imp.notifiche) notificaSistema('📬 Smistino: ' + st.nuovi + ' nuov' + (st.nuovi > 1 ? 'i' : 'o'), parti.join(' · ') + extra, { tipo: 'posta' });
  }

  // ---------------------------------------------------------
  // Collegamento con gli script Google (uno per ogni Gmail)
  // ---------------------------------------------------------
  function urlScript(a, extra) {
    var u = new URL(a.url);
    u.searchParams.set('token', a.token || '');
    Object.keys(extra || {}).forEach(function (k) { u.searchParams.set(k, extra[k]); });
    return u.toString();
  }
  function chiama(a, extra) {
    return fetch(urlScript(a, extra)).then(function (r) { if (!r.ok) throw new Error('il server ha risposto ' + r.status); return r.json(); })
      .then(function (j) { if (j.error) throw new Error(j.error === 'token' ? 'parola segreta sbagliata' : j.error); return j; });
  }
  function destinatario(e) { return N([e.to, e.cc, e.deliveredTo, e.forwardedTo].join(' ')); }
  var inControllo = {};
  function controllaAccount(a, manuale) {
    if (!a.url || inControllo[a.id] || !navigator.onLine) return Promise.resolve(null);
    inControllo[a.id] = true;
    return chiama(a, { giorni: a.ultimo ? D.imp.giorni : Math.max(D.imp.giorni, a.giorni || 7), dopo: a.ultimo || 0 })
      .then(function (j) {
        var inoltri = D.account.filter(function (x) { return x.tipo === 'inoltro' && x.indirizzo; });
        var email = (j.emails || []).map(function (e) {
          var acc = a.id, dest = destinatario(e);
          inoltri.forEach(function (x) { if ((!x.via || x.via === a.id) && dest.indexOf(N(x.indirizzo)) >= 0) acc = x.id; });
          return normEmail(e, acc);
        });
        var chat = (j.messaggi || []).map(function (m) { return normChat({ id: m.id, app: m.app, chat: m.chat, da: m.da, testo: m.testo, date: m.date, numero: m.numero }); });
        if (j.account && !a.indirizzo) a.indirizzo = j.account;
        a.ultimo = Math.max(a.ultimo || 0, Date.parse(j.ora || '') - 60000 || Date.now() - 60000);
        a.ultimoControllo = Date.now(); a.errore = '';
        var st = aggiungi(email.concat(chat));
        if (a.etichette) etichettaGmail(email.map(function (m) { return D.msg[m.id]; }).filter(function (m) { return m && m.fiducia === 'alta'; }));
        return st;
      })
      .catch(function (e) {
        a.errore = String(e.message || e).replace('Failed to fetch', 'script non raggiungibile'); save();
        if (manuale) toast(a.nome + ': ' + a.errore, 4000);
        return null;
      })
      .then(function (st) { inControllo[a.id] = false; return st; });
  }
  function controllaTutti(manuale) {
    var lista = D.account.filter(function (a) { return a.tipo === 'gmail' && a.url && !a.pausa; });
    if (!lista.length) { if (manuale) toast('Aggiungi prima un account email in Fonti'); return Promise.resolve(); }
    if (manuale) toast('Controllo ' + lista.length + ' account…');
    var tot = { nuovi: 0, perSez: {}, scadenze: 0 };
    return lista.reduce(function (p, a) {
      return p.then(function () { return controllaAccount(a, manuale); }).then(function (st) {
        if (!st) return;
        tot.nuovi += st.nuovi; tot.scadenze += st.scadenze;
        Object.keys(st.perSez).forEach(function (k) { tot.perSez[k] = (tot.perSez[k] || 0) + st.perSez[k]; });
      });
    }, Promise.resolve()).then(function () {
      save(); avvisa(tot, manuale);
      if (/^#\/(home|posta|sezioni|scadenze|fonti)?/.test(location.hash) && !$('#sheetRoot .sheet-bg')) ridisegna(); else aggiornaBadge();
    });
  }
  function etichettaGmail(lista) {
    var gruppi = {};
    lista.forEach(function (m) {
      if (!m || m.tipo !== 'email' || !m.gid || m.demo) return;
      var a = account(m.fonte); if (a && a.tipo === 'inoltro') a = account(a.via);
      if (!a || a.tipo !== 'gmail' || !a.etichette || m.sezione === 'smistare') return;
      var k = a.id + '|' + m.sezione; (gruppi[k] = gruppi[k] || { a: a, s: sez(m.sezione).nome, ids: [] }).ids.push(m.gid);
    });
    Object.keys(gruppi).forEach(function (k) {
      var g = gruppi[k];
      for (var i = 0; i < g.ids.length; i += 30) chiama(g.a, { azione: 'etichetta', sez: g.s, ids: g.ids.slice(i, i + 30).join(',') }).catch(function () {});
    });
  }

  // ---------------------------------------------------------
  // Spostare e confermare (Smistino impara)
  // ---------------------------------------------------------
  function mittente(m) { return Smista.indirizzo(m.from); }
  function domLibero(d) { return !d || DOMINI_LIBERI.indexOf(d) >= 0; }
  /** sposta un messaggio; modo: 'uno' | 'mittente' | 'dominio' | 'chat' */
  function sposta(id, sid, modo) {
    var m = D.msg[id]; if (!m) return { altri: 0 };
    var prima = m.sezione;
    if (prima !== sid && prima !== 'smistare') Smista.disimpara(perClassificare(m), prima, D.regole);
    m.sezione = sid; m.fiducia = 'alta'; m.confermato = true; m.motivi = ['Scelto da te'];
    if (sid !== 'smistare') Smista.impara(perClassificare(m), sid, D.regole);
    var altri = 0, chiave = null, tipoR = null;
    if (modo === 'chat' && m.chatKey) { tipoR = 'chat'; chiave = m.chatKey; }
    else if (modo === 'mittente' && mittente(m)) { tipoR = 'mittenti'; chiave = mittente(m); }
    else if (modo === 'dominio') { var d = Smista.dominio(mittente(m)); if (!domLibero(d)) { tipoR = 'mittenti'; chiave = d; } }
    if (tipoR && sid !== 'smistare') {
      D.regole[tipoR][chiave] = sid;
      // gli altri messaggi dello stesso mittente/chat ancora in dubbio seguono la regola
      tutti().forEach(function (o) {
        if (o.id === id || o.confermato) return;
        var stesso = tipoR === 'chat' ? o.chatKey === chiave : (mittente(o) === chiave || Smista.dominio(mittente(o)) === chiave);
        if (stesso && o.sezione !== sid) { o.sezione = sid; o.fiducia = 'alta'; o.motivi = [tipoR === 'chat' ? 'Chat che hai assegnato tu' : 'Mittente che hai assegnato tu']; altri++; }
      });
    }
    // le scadenze seguono il messaggio
    D.scadenze.forEach(function (s) { if (s.msgId === id) s.sezione = sid; });
    if (prima === 'smistare' && sid !== 'smistare' && D.imp.autoScadenze) autoScadenze(m);
    save();
    etichettaGmail([m]);
    return { altri: altri, regola: tipoR ? { tipo: tipoR, chiave: chiave } : null };
  }
  function spostaConAvviso(id, sid) {
    var m = D.msg[id]; if (!m) return;
    var modo = 'uno';
    if (m.tipo === 'chat') modo = 'chat';
    else if (D.imp.imparaMittenti && mittente(m)) modo = 'mittente';
    var r = sposta(id, sid, modo);
    chiudiSheet(true); ridisegna();
    var testo = '✓ In ' + sez(sid).nome + (r.altri ? ' (+' + r.altri + ' simili)' : '');
    if (r.regola && sid !== 'smistare') {
      var chi = r.regola.tipo === 'chat' ? 'questa chat' : r.regola.chiave;
      banner('<div class="ticon" style="background:' + sez(sid).colore + '">' + ic(sez(sid).icona) + '</div><div class="grow"><b>' + esc(testo) + '</b><span class="small muted">Anche i prossimi da ' + esc(chi) + ' andranno qui</span></div><button class="btn sm ghost" data-b="solo">Solo questo</button>',
        function (a) { if (a === 'solo') { delete D.regole[r.regola.tipo][r.regola.chiave]; save(); toast('Ok, regola non salvata'); } }, 6000);
    } else toast(testo);
  }
  ACT.conferma = function (el) { var m = D.msg[el.dataset.id]; if (m) spostaConAvviso(m.id, el.dataset.s || m.sezione); };
  ACT.sposta = function (el) { scegliSezione(el.dataset.id); };
  function scegliSezione(id) {
    var m = D.msg[id]; if (!m) return;
    var h = '<p class="small muted" style="margin-top:0">' + (m.tipo === 'chat' ? 'Sposto la chat <b>' + esc(m.chat) + '</b>: anche i prossimi messaggi andranno lì.' : 'Sposto l\'email' + (D.imp.imparaMittenti ? ': anche le prossime di <b>' + esc(mittente(m)) + '</b> andranno lì.' : '.')) + '</p><div class="sgrid">' +
      sezAttive().map(function (s) { return '<button class="stile' + (s.id === m.sezione ? ' on' : '') + '" data-scegli="' + s.id + '" style="--c:' + s.colore + '"><i>' + ic(s.icona) + '</i><b>' + esc(s.nome) + '</b></button>'; }).join('') +
      '<button class="stile" data-scegli="__nuova" style="--c:#94a3b8"><i>' + IC.plus + '</i><b>Nuova sezione</b></button></div>';
    if (m.tipo === 'email' && mittente(m)) {
      var d = Smista.dominio(mittente(m));
      h += '<div class="seg" id="modoSp" style="margin-top:12px"><button data-m="uno">Solo questa</button><button data-m="mittente" class="on">Mittente</button>' + (domLibero(d) ? '' : '<button data-m="dominio">Tutto @' + esc(d) + '</button>') + '</div>';
    }
    sheet('Sposta in…', h, function (s) {
      var modo = m.tipo === 'chat' ? 'chat' : (D.imp.imparaMittenti ? 'mittente' : 'uno');
      $$('#modoSp button', s).forEach(function (b) { b.classList.toggle('on', b.dataset.m === modo); });
      var seg = $('#modoSp', s);
      if (seg) seg.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; modo = b.dataset.m; $$('#modoSp button', s).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      s.addEventListener('click', function (e) {
        var b = e.target.closest('[data-scegli]'); if (!b) return;
        if (b.dataset.scegli === '__nuova') { formSezione({}, function (ns) { var r = sposta(id, ns.id, modo); chiudiSheet(true); ridisegna(); toast('✓ In ' + ns.nome + (r.altri ? ' (+' + r.altri + ')' : '')); }); return; }
        if (modo === 'mittente' || modo === 'chat') { spostaConAvviso(id, b.dataset.scegli); return; }
        var r = sposta(id, b.dataset.scegli, modo); chiudiSheet(true); ridisegna();
        toast('✓ In ' + sez(b.dataset.scegli).nome + (r.altri ? ' (+' + r.altri + ' simili)' : ''));
      });
    });
  }

  // ---------------------------------------------------------
  // HOME
  // ---------------------------------------------------------
  function saluto() {
    var h = new Date().getHours();
    return (h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera') + (D.imp.nome ? ', ' + esc(D.imp.nome) : '');
  }
  function prossimeScadenze(n) {
    var lim = Date.now() - 36e5;
    return D.scadenze.filter(function (s) { return !s.fatto && at(s.data, s.ora || '23:59').getTime() >= lim; })
      .sort(function (a, b) { return at(a.data, a.ora || '23:59') - at(b.data, b.ora || '23:59'); }).slice(0, n || 999);
  }
  VIEWS.home = function (v) {
    var cnt = contaSez(), ds = daSmistare().length, dc = daConfermare().length;
    var vuota = !Object.keys(D.msg).length;
    var oggi = new Date();
    var h = '<div class="hello"><h1>' + saluto() + ' 👋</h1><p>' + GGL[oggi.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + oggi.getDate() + ' ' + MML[oggi.getMonth()] + '</p></div>';
    if (vuota) {
      h += '<div class="card"><div class="row" style="align-items:flex-start"><img src="icons/logo.svg" width="58" height="58" alt="" style="border-radius:16px"><div class="grow"><h2>Ciao, sono Smistino!</h2><p class="small muted" style="margin:4px 0 0">Raccolgo email e messaggi da tutte le tue app e li metto da solo nella sezione giusta.</p></div></div>' +
        '<ol class="steps" style="margin-top:14px"><li><b>Collega le tue email</b><br><span class="small muted">Tutti gli account che vuoi: Gmail, Outlook, Libero, PEC…</span></li><li><b>Fai arrivare WhatsApp, Telegram, SMS</b><br><span class="small muted">In automatico dal telefono, con un bot, condividendo o importando le chat.</span></li><li><b>Correggimi quando sbaglio</b><br><span class="small muted">Imparo i mittenti e le parole: sbaglio sempre meno.</span></li></ol>' +
        '<div class="btns"><button class="btn" data-act="go" data-to="#/fonti">Collega le fonti</button><button class="btn sec" data-act="demo">Prova con esempi</button></div></div>';
    }
    if (ds || dc) {
      h += '<div class="hero" data-act="go" data-to="#/posta/' + (ds ? 'smistare' : 'confermare') + '"><div class="lbl">' + (ds ? 'Da smistare' : 'Da confermare') + '</div><h2>' + (ds ? ds + ' messagg' + (ds > 1 ? 'i aspettano' : 'io aspetta') + ' te' : dc + ' messagg' + (dc > 1 ? 'i' : 'io') + ' da confermare') + '</h2>' +
        '<div class="when">' + (ds ? 'Non sono sicuro di dove metterl' + (ds > 1 ? 'i' : 'o') + ': dimmelo tu, imparo.' : 'Li ho messi dove credo: basta un tocco per confermare.') + '</div>' +
        (ds && dc ? '<div class="quick" style="margin-top:10px"><span class="qa">' + dc + ' da confermare</span></div>' : '') + '</div>';
    }
    h += '<div class="section-title"><h2>Sezioni</h2><a href="#/sezioni">Gestisci</a></div><div class="sgrid">';
    sezAttive().forEach(function (s) {
      var c = cnt[s.id] || { tot: 0, nuovi: 0 };
      h += '<a class="stile" href="#/posta/' + s.id + '" style="--c:' + s.colore + '"><i>' + ic(s.icona) + '</i><b>' + esc(s.nome) + '</b><small>' + (c.nuovi ? '<em>' + plur(c.nuovi, 'nuovo', 'nuovi') + '</em>' : c.tot ? plur(c.tot, 'messaggio', 'messaggi') : 'vuota') + '</small>' + (s.notifica ? '' : '<span class="mute" title="Senza notifiche">' + ic('bell', 12) + '</span>') + '</a>';
    });
    h += '</div>';
    var sc = prossimeScadenze(3);
    if (sc.length) h += '<div class="section-title"><h2>In arrivo</h2><a href="#/scadenze">Tutte</a></div>' + sc.map(scadItem).join('');
    var ultimi = tutti().filter(function (m) { return !m.mio && !sez(m.sezione).silenziosa; }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
    if (ultimi.length) h += '<div class="section-title"><h2>Ultimi arrivati</h2><a href="#/posta">Tutti</a></div>' + ultimi.map(msgCard).join('');
    var att = D.account.filter(function (a) { return a.tipo === 'gmail'; });
    if (att.length) h += '<div class="status-line" style="justify-content:center;margin-top:16px">' + att.map(function (a) { return '<i class="' + (a.errore ? 'err' : 'on') + '" title="' + esc(a.nome) + '"></i>'; }).join('') + '<span>' + att.length + ' account · ultimo controllo ' + (Math.max.apply(null, att.map(function (a) { return a.ultimoControllo || 0; })) ? fmtTs(Math.max.apply(null, att.map(function (a) { return a.ultimoControllo || 0; }))) : 'mai') + '</span><button class="linkbtn small" data-act="controllaTutti">Controlla</button></div>';
    v.innerHTML = h;
  };
  ACT.controllaTutti = function () { controllaTutti(true); };

  // ---------------------------------------------------------
  // POSTA (tutte le fonti insieme)
  // ---------------------------------------------------------
  var filtro = { q: '', fonte: '', limite: 60 };
  function snippet(m) { return String(m.body || '').replace(/\s+/g, ' ').trim().slice(0, 110); }
  function fiduciaTag(m) {
    if (m.sezione === 'smistare') return '<span class="tag acc">da smistare</span>';
    if (m.fiducia === 'media' && !m.confermato) return '<span class="tag warn">?</span>';
    return '';
  }
  function msgCard(m, opz) {
    opz = opz || {};
    var f = fonte(m), s = sez(m.sezione);
    var tagSez = opz.senzaSez || m.sezione === 'smistare' ? '' : '<span class="tag" style="background:' + s.colore + '1f;color:' + s.colore + '">' + esc(s.nome) + '</span>';
    var conferma = m.fiducia === 'media' && !m.confermato ? '<div class="act"><button class="btn sm" data-act="conferma" data-id="' + esc(m.id) + '">' + IC.check + esc(s.nome) + '</button>' +
      (m.alt || []).slice(0, 1).map(function (a) { return '<button class="btn sm sec" data-act="conferma" data-id="' + esc(m.id) + '" data-s="' + a + '">' + esc(sez(a).nome) + '</button>'; }).join('') + '<button class="btn sm ghost" data-act="sposta" data-id="' + esc(m.id) + '">Altro…</button></div>' : '';
    if (m.sezione === 'smistare') conferma = '<div class="act">' + (m.alt || []).slice(0, 2).map(function (a) { return '<button class="btn sm sec" data-act="conferma" data-id="' + esc(m.id) + '" data-s="' + a + '">' + esc(sez(a).nome) + '</button>'; }).join('') + '<button class="btn sm" data-act="sposta" data-id="' + esc(m.id) + '">' + IC.move + 'Smista</button></div>';
    var sc = (m.estratto && m.estratto.eventi || []).filter(function (e) { return e.certo; }).slice(0, 2).map(function (e) { return '<span class="tag grey">' + ic('cal', 12) + fmtData(e.data) + (e.ora ? ' ' + e.ora : '') + '</span>'; }).join('');
    var titolo = m.tipo === 'chat' ? esc(m.chat) : esc(Smista.nomeMittente(m.from));
    var riga2 = m.tipo === 'chat' ? (opz.conteggio > 1 ? '<span class="small muted">' + opz.conteggio + ' messaggi · </span>' : '') + (m.da && m.da !== m.chat ? '<b>' + esc(m.da) + ':</b> ' : '') + esc(snippet(m)) : '<b class="subj">' + esc(m.subject || '(senza oggetto)') + '</b> ' + esc(snippet(m));
    return '<div class="mail' + (m.letto || m.mio ? '' : ' unread') + '" data-act="' + (m.tipo === 'chat' && opz.gruppo ? 'apriChat' : 'apri') + '" data-id="' + esc(m.id) + '">' +
      '<div class="av" style="background:' + f.colore + '">' + (m.tipo === 'chat' ? ic(f.icona) : esc((titolo.replace(/&\w+;/g, '').trim().charAt(0) || '@').toUpperCase())) + '</div>' +
      '<div class="grow"><div class="row"><span class="from grow ellipsis">' + titolo + '</span>' + (m.stella ? ic('star', 13) : '') + '<span class="small muted">' + quandoMsg(m.date) + '</span></div>' +
      '<p class="snip">' + riga2 + '</p><div class="row wrap tags"><span class="tag src" style="color:' + f.colore + '">' + esc(f.nome) + '</span>' + tagSez + fiduciaTag(m) + sc + '</div>' + conferma + '</div></div>';
  }
  function filtra(lista, sid) {
    var q = N(filtro.q.trim());
    return lista.filter(function (m) {
      if (sid === 'smistare' && m.sezione !== 'smistare') return false;
      if (sid === 'confermare' && !(m.fiducia === 'media' && !m.confermato)) return false;
      if (sid === 'nonletti' && (m.letto || m.mio)) return false;
      if (sid === 'stella' && !m.stella) return false;
      if (sid && !{ smistare: 1, confermare: 1, nonletti: 1, stella: 1 }[sid] && m.sezione !== sid) return false;
      if (filtro.fonte && (m.tipo === 'chat' ? m.canale : m.fonte) !== filtro.fonte) return false;
      if (q && N([m.from, m.subject, m.body, m.chat, m.da].join(' ')).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }
  // le chat si raggruppano per conversazione
  function raggruppa(lista) {
    var out = [], visti = {};
    lista.forEach(function (m) {
      if (m.tipo !== 'chat') { out.push({ m: m }); return; }
      var k = m.chatKey + '|' + m.sezione;
      if (visti[k]) { visti[k].n++; if (!m.letto && !m.mio) visti[k].nuovi++; return; }
      visti[k] = { m: m, n: 1, nuovi: !m.letto && !m.mio ? 1 : 0, gruppo: true };
      out.push(visti[k]);
    });
    return out;
  }
  VIEWS.posta = function (v, p) {
    var sid = p[0] || '';
    var all = tutti(), cnt = contaSez();
    var titolo = !sid ? 'Tutti i messaggi' : sid === 'confermare' ? 'Da confermare' : sid === 'nonletti' ? 'Non letti' : sid === 'stella' ? 'Importanti' : sez(sid).nome;
    var s = sez(sid);
    var h = '<div class="page-head"><div><h1>' + esc(titolo) + '</h1><p>' + (sid && D.sezioni.some(function (x) { return x.id === sid; }) ? 'Smistati qui in automatico' : 'Email e chat di tutte le fonti') + '</p></div>' +
      '<div class="row">' + (sid && D.sezioni.some(function (x) { return x.id === sid; }) ? '<button class="iconbtn" data-act="modSez" data-id="' + sid + '" title="Modifica sezione">' + IC.edit + '</button>' : '') + '<button class="iconbtn" data-act="controllaTutti" title="Controlla ora">' + IC.refresh + '</button></div></div>';
    h += '<div class="search" style="margin-bottom:10px">' + IC.search + '<input class="inp" id="pQ" placeholder="Cerca in mittenti, oggetti, testi, chat…" value="' + esc(filtro.q) + '"></div>';
    var chip = function (id, nome, n, col) { return '<button class="chip' + (sid === id ? ' on' : '') + '" data-act="go" data-to="#/posta' + (id ? '/' + id : '') + '"' + (col && sid !== id ? ' style="border-color:' + col + '55"' : '') + '>' + (col ? '<i class="pt" style="background:' + col + '"></i>' : '') + esc(nome) + (n ? '<span class="n">' + n + '</span>' : '') + '</button>'; };
    h += '<div class="chips">' + chip('', 'Tutti', nonLetti(all)) + chip('smistare', 'Da smistare', daSmistare().length, SMISTARE.colore) + chip('confermare', 'Da confermare', daConfermare().length) +
      chip('nonletti', 'Non letti', 0) + chip('stella', '★ Importanti', 0) +
      sezAttive().map(function (x) { return chip(x.id, x.nome, (cnt[x.id] || {}).nuovi, x.colore); }).join('') + '</div>';
    var fonti = D.account.map(function (a) { return [a.id, '✉ ' + (a.nome || a.indirizzo)]; }).concat(D.canali.map(function (c) { return [c.id, '💬 ' + c.nome]; }));
    h += '<div class="row" style="margin:2px 0 10px"><select class="inp sm" id="pF"><option value="">Tutte le fonti</option>' + fonti.map(function (f) { return '<option value="' + f[0] + '"' + (filtro.fonte === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm ghost" data-act="tuttiLetti" data-s="' + esc(sid) + '">' + IC.check + 'Letti</button></div><div id="pList"></div>';
    if (s.id === 'smistare' && sid === 'smistare') h = h.replace('<div id="pList"></div>', '<p class="small muted" style="margin:0 2px 10px">Non sono sicuro: tocca la sezione giusta. Imparo il mittente (o la chat) e la prossima volta decido da solo.</p><div id="pList"></div>');
    v.innerHTML = h;
    var disegna = function () {
      var lst = raggruppa(filtra(all, sid));
      var vis = lst.slice(0, filtro.limite);
      $('#pList').innerHTML = vis.length ? vis.map(function (x) { return msgCard(x.m, { gruppo: x.gruppo, conteggio: x.n, senzaSez: !!sid && !{ nonletti: 1, stella: 1, confermare: 1 }[sid] }); }).join('') +
        (lst.length > vis.length ? '<button class="btn ghost block" data-act="altri">Mostra altri (' + (lst.length - vis.length) + ')</button>' : '') :
        '<div class="card flat empty"><div class="big" style="color:var(--pri)">' + ic(sid ? s.icona : 'smistare', 64) + '</div>' + (sid === 'smistare' ? 'Tutto smistato 👍' : filtro.q ? 'Nessun risultato.' : 'Ancora nessun messaggio qui.') + '</div>';
    };
    $('#pQ').addEventListener('input', function () { filtro.q = this.value; filtro.limite = 60; disegna(); });
    $('#pF').addEventListener('change', function () { filtro.fonte = this.value; disegna(); });
    disegna();
  };
  ACT.altri = function () { filtro.limite += 60; ridisegna(); };
  ACT.tuttiLetti = function (el) {
    var l = filtra(tutti(), el.dataset.s).filter(function (m) { return !m.letto; });
    if (!l.length) { toast('Già tutti letti'); return; }
    l.forEach(function (m) { m.letto = true; }); save(); ridisegna(); toast(l.length + ' segnati come letti');
  };

  // ---------------------------------------------------------
  // Dettaglio messaggio
  // ---------------------------------------------------------
  function trovatoHtml(m) {
    var x = m.estratto || {}, h = '';
    (x.eventi || []).forEach(function (ev, i) {
      var gia = D.scadenze.filter(function (s) { return s.msgId === m.id && s.data === ev.data && (s.ora || '') === (ev.ora || ''); })[0];
      h += '<div class="found"><div class="row"><div class="ticon" style="background:' + colTipo(ev.tipo) + ';width:36px;height:36px">' + IC.cal + '</div><div class="grow"><b>' + esc(ev.tipo) + '</b> · <span style="text-transform:capitalize">' + fmtLunga(ev.data) + '</span>' + (ev.ora ? ' · ' + ev.ora : '') + '<br><span class="small muted ellipsis">' + esc(ev.titolo) + '</span></div>' +
        (gia ? '<span class="tag ok">✓ in elenco</span>' : '<button class="btn sm" data-act="aggScad" data-id="' + esc(m.id) + '" data-i="' + i + '">' + IC.plus + 'Aggiungi</button>') + '</div></div>';
    });
    var chips = '';
    (x.importi || []).forEach(function (v) { chips += '<span class="qa web">' + esc(v) + '</span>'; });
    (x.codici || []).forEach(function (c) { chips += '<button class="qa web" data-act="copia" data-t="' + esc(c.valore) + '">' + IC.copy + esc(c.tipo) + ': <b>' + esc(c.valore) + '</b></button>'; });
    (x.telefoni || []).forEach(function (t) { chips += '<a class="qa call" href="tel:' + esc(t) + '">' + IC.phone + esc(t) + '</a>'; });
    (x.link || []).slice(0, 3).forEach(function (u) { var host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { host = 'link'; } chips += '<a class="qa web" href="' + esc(u) + '" target="_blank" rel="noopener">' + IC.link + esc(host) + '</a>'; });
    if (chips) h += '<div class="quick" style="margin:8px 0">' + chips + '</div>';
    return h ? '<h3 style="margin:14px 0 8px">Cosa ho trovato</h3>' + h : '';
  }
  function sezBar(m) {
    var s = sez(m.sezione);
    var h = '<div class="sezbar" style="--c:' + s.colore + '"><div class="ticon" style="background:' + s.colore + '">' + ic(s.icona) + '</div><div class="grow"><b>' + esc(s.nome) + '</b><br><span class="small muted">' + esc((m.motivi || []).slice(0, 2).join(' · ')) + '</span></div><button class="btn sm sec" data-act="sposta" data-id="' + esc(m.id) + '">' + IC.move + 'Sposta</button></div>';
    if (m.sezione === 'smistare' || (m.fiducia === 'media' && !m.confermato)) {
      var opz = (m.sezione === 'smistare' ? [] : [m.sezione]).concat(m.alt || []).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 3);
      h += '<div class="confbar"><span class="small"><b>' + (m.sezione === 'smistare' ? 'Dove lo metto?' : 'Ho indovinato?') + '</b></span><div class="quick">' +
        opz.map(function (a) { return '<button class="btn sm' + (a === m.sezione ? '' : ' sec') + '" data-act="conferma" data-id="' + esc(m.id) + '" data-s="' + a + '">' + (a === m.sezione ? IC.check : '') + esc(sez(a).nome) + '</button>'; }).join('') + '</div></div>';
    }
    return h;
  }
  ACT.apri = function (el) { var m = D.msg[el.dataset.id]; if (!m) return; if (m.tipo === 'chat') apriChat(m.id); else apriEmail(m.id); };
  ACT.apriChat = function (el) { apriChat(el.dataset.id); };
  function apriEmail(id) {
    var m = D.msg[id]; if (!m) return;
    m.letto = true; save();
    var f = fonte(m), d = new Date(m.date), a = account(m.fonte) || {};
    var h = '<div class="row" style="margin-bottom:8px"><div class="av" style="background:' + f.colore + '">' + esc((Smista.nomeMittente(m.from).charAt(0) || '@').toUpperCase()) + '</div><div class="grow"><b class="ellipsis" style="display:block">' + esc(Smista.nomeMittente(m.from)) + '</b><span class="small muted ellipsis" style="display:block">' + esc(mittente(m)) + '</span></div></div>' +
      '<p class="small muted" style="margin:0 0 10px">' + d.getDate() + ' ' + MML[d.getMonth()] + ' ' + d.getFullYear() + ', ' + hm(d) + ' · <span style="color:' + f.colore + ';font-weight:800">' + esc(f.nome) + '</span>' + (a.indirizzo ? ' (' + esc(a.indirizzo) + ')' : '') + '</p>' + sezBar(m) + trovatoHtml(m);
    if ((m.attachments || []).length) h += '<div class="quick" style="margin:8px 0">' + m.attachments.map(function (x) { return '<span class="qa web">' + IC.file + esc(x) + '</span>'; }).join('') + '</div>';
    h += '<h3 style="margin:14px 0 6px">Testo</h3><div class="mailbody">' + linkify(m.body || '') + '</div>';
    var rispondi = 'mailto:' + encodeURIComponent(mittente(m)) + '?subject=' + encodeURIComponent('Re: ' + (m.subject || ''));
    var gm = account(m.fonte); if (gm && gm.tipo === 'inoltro') gm = account(gm.via);
    var gmailUrl = m.gid && !m.demo && gm && gm.tipo === 'gmail' ? 'https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(gm.indirizzo || '') + '#all/' + encodeURIComponent(m.gid) : '';
    h += '<div class="btns" style="margin-top:14px"><a class="btn" href="' + esc(rispondi) + '">' + IC.reply + 'Rispondi</a>' + (gmailUrl ? '<a class="btn sec" href="' + esc(gmailUrl) + '" target="_blank" rel="noopener">' + IC.mail + 'Apri in Gmail</a>' : '') + '</div>' +
      ponteEmailHtml(m) +
      '<div class="btns" style="margin-top:8px"><button class="btn ghost sm" data-act="stella" data-id="' + esc(m.id) + '">' + IC.star + (m.stella ? 'Togli importante' : 'Importante') + '</button><button class="btn ghost sm" data-act="nonLetto" data-id="' + esc(m.id) + '">' + IC.eye + 'Non letto</button><button class="btn danger sm" data-act="elimina" data-id="' + esc(m.id) + '">' + IC.trash + '</button></div>' +
      '<p class="src">Eliminare qui toglie il messaggio solo da Smistino, non dalla tua casella.</p>';
    sheet(esc(m.subject || '(senza oggetto)'), h);
    aggiornaBadge();
  }
  function linkify(t) {
    return esc(t).replace(/https?:\/\/[^\s<>&]+(?:&amp;[^\s<>&]+)*/g, function (u) { var r = u.replace(/&amp;/g, '&'); return '<a href="' + esc(r) + '" target="_blank" rel="noopener">' + (u.length > 60 ? u.slice(0, 57) + '…' : u) + '</a>'; });
  }
  function apriChat(id) {
    var m = D.msg[id]; if (!m) return;
    var msgs = tutti().filter(function (o) { return o.chatKey === m.chatKey; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    msgs.forEach(function (o) { o.letto = true; }); save();
    var c = canale(m.canale) || { nome: m.canale, colore: '#64748b' };
    var altrui = msgs.filter(function (o) { return !o.mio; });
    var ultimo = altrui.filter(function (o) { return o.fiducia === 'alta'; }).pop() || altrui.pop() || m;
    var h = '<p class="small muted" style="margin:-6px 0 10px"><span style="color:' + c.colore + ';font-weight:800">' + esc(c.nome) + '</span> · ' + plur(msgs.length, 'messaggio', 'messaggi') + '</p>' + sezBar(ultimo);
    h += '<div class="thread">';
    var giorno = '';
    msgs.slice(-150).forEach(function (o) {
      var d = new Date(o.date), g = ymd(d);
      if (g !== giorno) { giorno = g; h += '<div class="daysep">' + (g === ymd(new Date()) ? 'Oggi' : fmtLunga(g)) + '</div>'; }
      var evs = (o.estratto && o.estratto.eventi || []);
      h += '<div class="bubble' + (o.mio ? ' mio' : '') + '">' + (o.da && o.da !== o.chat && !o.mio ? '<b style="color:' + c.colore + '">' + esc(o.da) + '</b>' : '') + '<span>' + linkify(o.body) + '</span>' +
        (o.sezione !== ultimo.sezione ? '<em class="small" style="color:' + sez(o.sezione).colore + '">' + esc(sez(o.sezione).nome) + '</em>' : '') +
        evs.map(function (ev, i) { var gia = haScadenza(o.id, ev); return '<button class="mini" data-act="' + (gia ? 'go' : 'aggScad') + '" data-to="#/scadenze" data-id="' + esc(o.id) + '" data-i="' + i + '">' + ic('cal', 12) + fmtData(ev.data) + (ev.ora ? ' ' + ev.ora : '') + (gia ? ' ✓' : ' +') + '</button>'; }).join('') +
        '<small>' + hm(d) + '</small></div>';
    });
    h += '</div>';
    var x = (ultimo.estratto || {});
    if ((x.codici || []).length || (x.telefoni || []).length) h += trovatoHtml({ id: ultimo.id, estratto: { codici: x.codici, telefoni: x.telefoni } });
    h += '<div class="btns" style="margin-top:12px">' + rispondiChat(m) + '</div><div class="btns" style="margin-top:8px"><button class="btn danger sm" data-act="eliminaChat" data-k="' + esc(m.chatKey) + '">' + IC.trash + 'Togli la chat da Smistino</button></div>';
    sheet(esc(m.chat), h, function (s) { var t = $('.thread', s); if (t) t.scrollTop = t.scrollHeight; });
    aggiornaBadge();
  }
  function rispondiChat(m) {
    var num = tutti().filter(function (o) { return o.chatKey === m.chatKey && o.numero; }).map(function (o) { return o.numero; })[0] || '';
    var d = String(num).replace(/\D/g, ''); if (/^3\d{8,9}$/.test(d)) d = '39' + d;
    if (m.canale === 'whatsapp') return '<a class="btn" style="background:#25d366" href="' + (d ? 'https://wa.me/' + d : 'https://wa.me/') + '" target="_blank" rel="noopener">' + IC.whatsapp + 'Apri WhatsApp</a>';
    if (m.canale === 'telegram') return '<a class="btn" style="background:#229ed9" href="tg://resolve" target="_blank" rel="noopener">' + IC.telegram + 'Apri Telegram</a>';
    if (m.canale === 'sms') return '<a class="btn" style="background:#f97316" href="sms:' + esc(num) + '">' + IC.sms + 'Rispondi via SMS</a>';
    return '<button class="btn sec" data-act="copia" data-t="' + esc(m.body) + '">' + IC.copy + 'Copia testo</button>';
  }
  function ponteEmailHtml(m) {
    if (!window.Ponte || !Ponte.collegata('cartellina') || m.demo) return '';
    if (m.sezione === 'salute' || m.aCartellina) return '<p class="small muted" style="margin:10px 2px 0">' + IC.share.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"') + ' Condivisa con Cartellina' + (m.aCartellina && m.sezione !== 'salute' ? ' · <button class="linkbtn small" data-act="aCartellina" data-id="' + esc(m.id) + '">annulla</button>' : '') + '</p>';
    return '<div class="btns" style="margin-top:8px"><button class="btn sec sm" data-act="aCartellina" data-id="' + esc(m.id) + '" style="--c:#1f9a87">' + IC.share + 'Manda a Cartellina</button></div>';
  }
  ACT.aCartellina = function (el) {
    var m = D.msg[el.dataset.id]; if (!m) return;
    m.aCartellina = !m.aCartellina; save();
    if (m.aCartellina && window.Ponte) Ponte.sincronizza(false);
    toast(m.aCartellina ? 'Mandata a Cartellina ✓' : 'Non più condivisa');
    chiudiSheet(); apriEmail(m.id);
  };
  ACT.ponte = function () { if (window.Ponte) Ponte.apri(); };
  ACT.stella = function (el) { var m = D.msg[el.dataset.id]; m.stella = !m.stella; save(); chiudiSheet(); apriEmail(m.id); ridisegnaSotto(); };
  ACT.nonLetto = function (el) { var m = D.msg[el.dataset.id]; m.letto = false; save(); chiudiSheet(true); ridisegna(); };
  ACT.elimina = function (el) { delete D.msg[el.dataset.id]; save(); chiudiSheet(true); ridisegna(); toast('Tolto da Smistino'); };
  ACT.eliminaChat = function (el) {
    if (!confirm('Togliere tutti i messaggi di questa chat da Smistino?')) return;
    tutti().forEach(function (m) { if (m.chatKey === el.dataset.k) delete D.msg[m.id]; }); save(); chiudiSheet(true); ridisegna();
  };
  function ridisegnaSotto() { var y = window.scrollY; var v = $('#view'); var parts = (location.hash || '#/home').slice(2).split('/'); var n = VIEWS[parts[0]] ? parts[0] : 'home'; v.innerHTML = ''; VIEWS[n](v, parts.slice(1).map(decodeURIComponent)); window.scrollTo(0, y); }
  ACT.aggScad = function (el) {
    var m = D.msg[el.dataset.id], ev = m.estratto.eventi[+el.dataset.i];
    formScadenza({ data: ev.data, ora: ev.ora, tipo: ev.tipo, titolo: ev.titolo, msgId: m.id, sezione: m.sezione });
  };

  // ---------------------------------------------------------
  // SEZIONI
  // ---------------------------------------------------------
  VIEWS.sezioni = function (v) {
    var cnt = contaSez();
    var h = '<div class="page-head"><div><h1>Sezioni</h1><p>Dove Smistino mette ogni messaggio</p></div><button class="btn sm" data-act="nuovaSez">' + IC.plus + 'Nuova</button></div>';
    var ds = daSmistare().length;
    h += '<a class="item" href="#/posta/smistare" style="text-decoration:none;color:inherit"><div class="ticon" style="background:' + SMISTARE.colore + '">' + IC.smistare + '</div><div class="grow"><h3>Da smistare</h3><p>Quelli su cui ho dubbi</p></div>' + (ds ? '<b class="num" style="color:var(--acc)">' + ds + '</b>' : '') + ic('right', 20) + '</a>';
    D.sezioni.forEach(function (s, i) {
      var c = cnt[s.id] || { tot: 0, nuovi: 0 };
      var nreg = Object.keys(D.regole.mittenti).filter(function (k) { return D.regole.mittenti[k] === s.id; }).length + Object.keys(D.regole.chat).filter(function (k) { return D.regole.chat[k] === s.id; }).length;
      h += '<div class="item' + (s.off ? ' off' : '') + '" data-act="go" data-to="#/posta/' + s.id + '"><div class="ticon" style="background:' + s.colore + '">' + ic(s.icona) + '</div><div class="grow"><h3 class="ellipsis">' + esc(s.nome) + (s.off ? ' <span class="tag grey">spenta</span>' : '') + '</h3><p class="ellipsis">' + plur(c.tot, 'messaggio', 'messaggi') + (c.nuovi ? ' · <b style="color:' + s.colore + '">' + plur(c.nuovi, 'nuovo', 'nuovi') + '</b>' : '') + ' · ' + plur(nreg, 'regola', 'regole') + (s.notifica ? '' : ' · 🔕') + '</p></div>' +
        (i ? '<button class="iconbtn sm" data-act="ordSez" data-i="' + i + '" data-d="-1" aria-label="Sposta su">' + ic('chevup', 16) + '</button>' : '') + '<button class="iconbtn sm" data-act="modSez" data-id="' + s.id + '" aria-label="Modifica">' + ic('edit', 16) + '</button></div>';
    });
    h += '<p class="disclaimer">Ogni sezione ha parole e mittenti tipici: Smistino li usa per capire dove va un messaggio. Ogni volta che sposti qualcosa impara da solo.</p>';
    v.innerHTML = h;
  };
  ACT.ordSez = function (el) { var i = +el.dataset.i, j = i + (+el.dataset.d); if (j < 0) return; var t = D.sezioni[i]; D.sezioni[i] = D.sezioni[j]; D.sezioni[j] = t; save(); ridisegna(); };
  ACT.nuovaSez = function () { formSezione({}); };
  ACT.modSez = function (el) { formSezione(D.sezioni.filter(function (s) { return s.id === el.dataset.id; })[0]); };
  function formSezione(s, dopo) {
    s = s || {};
    var nuova = !s.id, colore = s.colore || COLORI[D.sezioni.length % COLORI.length], icona = s.icona || 'cartella';
    var h = '<form id="fSez"><label class="f"><span>Nome</span><input class="inp" name="nome" required placeholder="Es. Condominio, Auto, Cane, Associazione…" value="' + esc(s.nome || '') + '"></label>' +
      '<label class="f"><span>Colore</span></label><div class="swatch" id="sCol">' + COLORI.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" class="' + (c === colore ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
      '<label class="f" style="margin-top:12px"><span>Icona</span></label><div class="icopick" id="sIc">' + ICONE_SEZ.map(function (n) { return '<button type="button" data-i="' + n + '" class="' + (n === icona ? 'on' : '') + '">' + ic(n) + '</button>'; }).join('') + '</div>' +
      '<label class="f" style="margin-top:12px"><span>Parole tipiche (separate da virgola)</span><textarea class="inp" name="parole" placeholder="Es. assemblea, amministratore, rata condominiale">' + esc((s.parole || []).join(', ')) + '</textarea></label>' +
      '<label class="f"><span>Mittenti o domini tipici (separati da virgola)</span><textarea class="inp" name="domini" placeholder="Es. studioamministrazioni.it, mario.rossi@gmail.com" style="min-height:60px">' + esc((s.domini || []).join(', ')) + '</textarea></label>' +
      '<label class="toggle"><span><b>Notifiche</b><br><span class="small muted">Avvisami quando arriva qualcosa qui</span></span><span class="switch"><input type="checkbox" name="notifica"' + (s.notifica !== false ? ' checked' : '') + '><i></i></span></label>' +
      '<label class="toggle"><span><b>Chat personali</b><br><span class="small muted">Le chat senza segnali finiscono qui</span></span><span class="switch"><input type="checkbox" name="chat"' + (s.chat ? ' checked' : '') + '><i></i></span></label>' +
      (nuova ? '' : '<label class="toggle"><span><b>Sezione attiva</b><br><span class="small muted">Spenta: non riceve nuovi messaggi</span></span><span class="switch"><input type="checkbox" name="attiva"' + (s.off ? '' : ' checked') + '><i></i></span></label>') +
      '<button class="btn block" type="submit" style="margin-top:10px">' + IC.check + 'Salva sezione</button>' + (nuova ? '' : '<button type="button" class="btn danger block" id="sDel" style="margin-top:8px">' + IC.trash + 'Elimina sezione</button>') + '</form>';
    sheet(nuova ? 'Nuova sezione' : esc(s.nome), h, function (sh) {
      $('#sCol', sh).addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; colore = b.dataset.c; $$('#sCol button', sh).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      $('#sIc', sh).addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; icona = b.dataset.i; $$('#sIc button', sh).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      var del = $('#sDel', sh);
      if (del) del.addEventListener('click', function () {
        if (!confirm('Eliminare la sezione "' + s.nome + '"? I suoi messaggi tornano in "Da smistare".')) return;
        D.sezioni = D.sezioni.filter(function (x) { return x.id !== s.id; });
        tutti().forEach(function (m) { if (m.sezione === s.id) { m.sezione = 'smistare'; m.fiducia = 'bassa'; m.confermato = false; } });
        ['mittenti', 'chat'].forEach(function (t) { Object.keys(D.regole[t]).forEach(function (k) { if (D.regole[t][k] === s.id) delete D.regole[t][k]; }); });
        delete D.regole.parole[s.id];
        save(); chiudiSheet(true); location.hash = '#/sezioni'; ridisegna(); toast('Sezione eliminata');
      });
      $('#fSez', sh).addEventListener('submit', function (e) {
        e.preventDefault();
        var f = new FormData(e.target), lista = function (k) { return String(f.get(k) || '').split(/[,\n]/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); };
        var rec = nuova ? { id: 's' + uid() } : s;
        rec.nome = String(f.get('nome')).trim(); rec.colore = colore; rec.icona = icona; rec.parole = lista('parole'); rec.domini = lista('domini');
        rec.notifica = !!f.get('notifica'); rec.chat = !!f.get('chat'); if (!nuova) rec.off = !f.get('attiva');
        if (!rec.nome) return;
        if (rec.chat) D.sezioni.forEach(function (x) { if (x !== rec) x.chat = false; });
        if (nuova) D.sezioni.push(rec);
        save(); chiudiSheet(); toast('Sezione salvata ✓');
        if (nuova) riclassifica(true);
        if (dopo) dopo(rec); else ridisegna();
      });
    });
  }
  /** ripassa i messaggi non confermati con le regole aggiornate */
  function riclassifica(silenzioso) {
    var n = 0;
    tutti().forEach(function (m) {
      if (m.confermato || (m.fiducia === 'alta' && !silenzioso)) return;
      var prima = m.sezione; classificaMsg(m); if (m.sezione !== prima) n++;
    });
    save();
    return n;
  }

  // ---------------------------------------------------------
  // SCADENZE e appuntamenti trovati nei messaggi
  // ---------------------------------------------------------
  var COL_T = { Scadenza: '#ef4444', Appuntamento: '#4f5bd5', Consegna: '#f59e0b', Data: '#64748b' };
  function colTipo(t) { return COL_T[t] || '#64748b'; }
  function scadItem(s) {
    var d = parseYmd(s.data), m = D.msg[s.msgId], se = sez(s.sezione);
    return '<div class="item' + (s.fatto ? ' off' : '') + '" data-act="apriScad" data-id="' + s.id + '"><div class="date"><small>' + GG[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + MM[d.getMonth()] + '</small></div>' +
      '<div class="bar" style="background:' + colTipo(s.tipo) + '"></div><div class="grow"><h3 class="ellipsis">' + esc(s.titolo) + '</h3><p class="ellipsis">' + esc(s.tipo) + (s.ora ? ' · ore ' + s.ora : '') + (s.sezione ? ' · <span style="color:' + se.colore + '">' + esc(se.nome) + '</span>' : '') + (m ? ' · ' + esc(fonte(m).nome) : '') + '</p></div>' +
      '<button class="tick' + (s.fatto ? ' on' : '') + '" data-act="fattoScad" data-id="' + s.id + '" aria-label="Fatto">' + IC.check + '</button></div>';
  }
  VIEWS.scadenze = function (v) {
    var pros = prossimeScadenze(), fatte = D.scadenze.filter(function (s) { return s.fatto; }).slice(-10).reverse();
    var h = '<div class="page-head"><div><h1>In arrivo</h1><p>Scadenze, appuntamenti e consegne trovati nei messaggi</p></div><button class="iconbtn" data-act="exportIcs" title="Esporta nel calendario">' + IC.down + '</button></div>';
    if (!pros.length) h += '<div class="card flat empty"><div class="big" style="color:var(--pri)">' + ic('cal', 64) + '</div>Niente in programma.<br><span class="small muted">Quando un messaggio contiene una data (bolletta, visita, riunione, cena…) la trovi qui.</span></div>';
    var gruppo = '';
    pros.forEach(function (s) {
      var g = quando(s.data);
      var etichetta = /^(Oggi|Domani|Tra)/.test(g) ? g : 'Più avanti';
      if (etichetta !== gruppo) { gruppo = etichetta; h += '<div class="section-title"><h2>' + gruppo + '</h2></div>'; }
      h += scadItem(s);
    });
    if (fatte.length) h += '<div class="section-title"><h2>Fatte</h2></div>' + fatte.map(scadItem).join('');
    h += '<button class="fab" data-act="nuovaScad" aria-label="Nuova">' + IC.plus + '</button>';
    v.innerHTML = h;
  };
  ACT.fattoScad = function (el) { var s = D.scadenze.filter(function (x) { return x.id === el.dataset.id; })[0]; s.fatto = !s.fatto; s.fattoTs = Date.now(); save(); ridisegna(); };
  ACT.nuovaScad = function () { formScadenza({ data: ymd(new Date()), tipo: 'Scadenza' }); };
  ACT.apriScad = function (el) {
    var s = D.scadenze.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!s) return;
    var m = D.msg[s.msgId];
    var h = '<p style="margin:0 0 10px"><span class="tag" style="background:' + colTipo(s.tipo) + '22;color:' + colTipo(s.tipo) + '">' + esc(s.tipo) + '</span> <b style="text-transform:capitalize">' + fmtLunga(s.data) + (s.ora ? ' · ore ' + s.ora : '') + '</b></p>' +
      (s.note ? '<p class="mailbody" style="max-height:none">' + esc(s.note) + '</p>' : '') +
      (m ? '<button class="btn ghost block sm" data-act="apri" data-id="' + esc(m.id) + '">' + IC.mail + 'Vedi il messaggio di origine</button>' : '') +
      '<div class="btns" style="margin-top:12px"><button class="btn sec" data-act="modScad" data-id="' + s.id + '">' + IC.edit + 'Modifica</button><button class="btn ghost" data-act="icsUna" data-id="' + s.id + '">' + IC.cal + 'Calendario</button><button class="btn danger" data-act="delScad" data-id="' + s.id + '">' + IC.trash + '</button></div>';
    sheet(esc(s.titolo), h);
  };
  ACT.modScad = function (el) { chiudiSheet(); formScadenza(D.scadenze.filter(function (x) { return x.id === el.dataset.id; })[0]); };
  ACT.delScad = function (el) { D.scadenze = D.scadenze.filter(function (x) { return x.id !== el.dataset.id; }); save(); chiudiSheet(true); ridisegna(); toast('Eliminata'); };
  function formScadenza(s) {
    var nuova = !s.id, tipo = s.tipo || 'Scadenza';
    var h = '<form id="fSc"><div class="seg" id="scT">' + ['Scadenza', 'Appuntamento', 'Consegna'].map(function (t) { return '<button type="button" data-t="' + t + '" class="' + (t === tipo ? 'on' : '') + '">' + t + '</button>'; }).join('') + '</div>' +
      '<label class="f" style="margin-top:12px"><span>Cosa</span><input class="inp" name="titolo" required value="' + esc(s.titolo || '') + '"></label>' +
      '<div class="two"><label class="f"><span>Giorno</span><input class="inp" type="date" name="data" required value="' + esc(s.data || ymd(new Date())) + '"></label><label class="f"><span>Ora</span><input class="inp" type="time" name="ora" value="' + esc(s.ora || '') + '"></label></div>' +
      '<label class="f"><span>Note</span><textarea class="inp" name="note">' + esc(s.note || '') + '</textarea></label><button class="btn block" type="submit">' + IC.check + 'Salva</button></form>';
    sheet(nuova ? 'Aggiungi in arrivo' : 'Modifica', h, function (sh) {
      $('#scT', sh).addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b) return; tipo = b.dataset.t; $$('#scT button', sh).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      $('#fSc', sh).addEventListener('submit', function (e) {
        e.preventDefault(); var f = new FormData(e.target);
        var rec = { id: s.id || uid(), tipo: tipo, titolo: String(f.get('titolo')).trim(), data: f.get('data'), ora: f.get('ora'), note: String(f.get('note') || '').trim(), msgId: s.msgId || '', sezione: s.sezione || '', fatto: !!s.fatto, auto: false };
        if (nuova) D.scadenze.push(rec); else D.scadenze = D.scadenze.map(function (x) { return x.id === rec.id ? rec : x; });
        save(); chiudiSheet(); toast('Salvato ✓'); ridisegnaSotto();
        if ($('#sheetRoot .sheet-bg') && rec.msgId && D.msg[rec.msgId]) { chiudiSheet(true); ACT.apri({ dataset: { id: rec.msgId } }); }
      });
    });
  }
  // promemoria: la sera prima alle 18 e 2 ore prima
  function controllaScadenze(now) {
    if (!D.imp.promemoria) return;
    D.scadenze.forEach(function (s) {
      if (s.fatto) return;
      var inizio = at(s.data, s.ora || '09:00');
      if (inizio < now) return;
      var vigilia = at(s.data, '18:00'); vigilia.setDate(vigilia.getDate() - 1);
      var due = new Date(inizio.getTime() - 2 * 36e5);
      [['v', vigilia, 'Domani'], ['2h', due, 'Tra poco']].forEach(function (x) {
        var k = s.id + '|' + x[0];
        if (now >= x[1] && !D.notificati[k] && !(x[0] === '2h' && !s.ora)) {
          D.notificati[k] = Date.now(); save();
          var t = x[2] + ': ' + s.titolo + (s.ora ? ' alle ' + s.ora : '');
          notificaSistema('⏰ ' + t, s.tipo, { tipo: 'scadenza', id: s.id });
          if (!document.hidden) banner('<div class="ticon" style="background:' + colTipo(s.tipo) + '">' + IC.cal + '</div><div class="grow"><b>' + esc(t) + '</b><span class="small muted">' + esc(s.tipo) + '</span></div><button class="btn sm ghost" data-b="ok">OK</button>', null, 30000);
        }
      });
    });
  }

  // ---------------------------------------------------------
  // FONTI: email illimitate e app di messaggi
  // ---------------------------------------------------------
  VIEWS.fonti = function (v) {
    var cnt = {};
    tutti().forEach(function (m) { var k = m.tipo === 'chat' ? m.canale : m.fonte; cnt[k] = (cnt[k] || 0) + 1; });
    var h = '<div class="page-head"><div><h1>Fonti</h1><p>Da dove arrivano i messaggi</p></div><button class="iconbtn" data-act="controllaTutti" title="Controlla ora">' + IC.refresh + '</button></div>';
    h += '<div class="section-title"><h2>Email <span class="muted small">' + D.account.length + '</span></h2><button class="linkbtn" data-act="nuovoAcc">+ Aggiungi</button></div>';
    if (!D.account.length) h += '<div class="card flat empty small">Nessuna email collegata. Puoi aggiungerne quante vuoi.</div>';
    D.account.forEach(function (a) {
      var tipo = a.tipo === 'gmail' ? 'Gmail · script' : a.tipo === 'inoltro' ? 'Inoltrata a ' + esc((account(a.via) || {}).nome || 'Gmail') : 'Solo importazione';
      var stato = a.tipo === 'gmail' ? (a.errore ? '<span style="color:var(--danger)">' + esc(a.errore) + '</span>' : a.ultimoControllo ? 'controllata ' + fmtTs(a.ultimoControllo) : 'mai controllata') : '';
      h += '<div class="item" data-act="modAcc" data-id="' + a.id + '"><div class="av" style="background:' + (a.colore || '#64748b') + '">' + IC.mail + '</div><div class="grow"><h3 class="ellipsis">' + esc(a.nome || a.indirizzo) + (a.pausa ? ' <span class="tag grey">in pausa</span>' : '') + '</h3><p class="ellipsis">' + esc(a.indirizzo || '') + ' · ' + tipo + '</p>' + (stato ? '<p class="small">' + stato + '</p>' : '') + '</div><span class="small muted">' + (cnt[a.id] || 0) + '</span></div>';
    });
    h += '<div class="section-title"><h2>App di messaggi <span class="muted small">' + D.canali.length + '</span></h2><button class="linkbtn" data-act="nuovoCanale">+ Aggiungi</button></div>';
    D.canali.forEach(function (c) {
      h += '<div class="item" data-act="apriCanale" data-id="' + c.id + '"><div class="av" style="background:' + c.colore + '">' + ic(c.icona || 'chat') + '</div><div class="grow"><h3>' + esc(c.nome) + '</h3><p class="ellipsis">' + plur(cnt[c.id] || 0, 'messaggio', 'messaggi') + ' · ' + (c.id === 'telegram' && botTelegram() ? 'bot @' + esc(botTelegram()) + ' · ' : '') + 'tocca per collegare</p></div>' + ic('right', 20) + '</div>';
    });
    h += '<div class="section-title"><h2>Altri modi</h2></div><div class="menu">' +
      '<a href="#/importa"><i style="background:#ede9fe;color:#6d28d9">' + IC.up + '</i><b>Importa</b><small>Chat esportate, file .eml</small></a>' +
      '<a href="#" data-act="incolla"><i style="background:#fff1e6;color:#c2410c">' + IC.copy + '</i><b>Incolla</b><small>Testo copiato da qualsiasi app</small></a></div>' +
      '<p class="disclaimer">Su Android, con Smistino installato sulla schermata Home, puoi anche usare <b>Condividi → Smistino</b> da WhatsApp, Telegram e qualsiasi altra app.</p>';
    v.innerHTML = h;
  };
  function gmailCollegati() { return D.account.filter(function (a) { return a.tipo === 'gmail' && a.url; }); }
  function botTelegram() { var a = D.account.filter(function (x) { return x.telegram; })[0]; return a ? a.telegram : ''; }

  ACT.nuovoAcc = function () { formAccount({}); };
  ACT.modAcc = function (el) { formAccount(account(el.dataset.id)); };
  function formAccount(a) {
    a = a || {};
    var nuovo = !a.id, tipo = a.tipo || (gmailCollegati().length ? 'inoltro' : 'gmail'), colore = a.colore || COLORI[(D.account.length * 3) % COLORI.length];
    var h = '<form id="fAcc"><div class="seg" id="aTipo"><button type="button" data-t="gmail">Gmail</button><button type="button" data-t="inoltro">Altra email</button><button type="button" data-t="manuale">Solo import</button></div>' +
      '<p class="small muted" id="aDesc" style="margin:10px 2px"></p>' +
      '<div class="two"><label class="f"><span>Nome</span><input class="inp" name="nome" placeholder="Es. Personale, Lavoro, PEC" value="' + esc(a.nome || '') + '"></label><label class="f"><span>Indirizzo</span><input class="inp" name="indirizzo" type="email" placeholder="nome@esempio.it" value="' + esc(a.indirizzo || '') + '"></label></div>' +
      '<label class="f"><span>Colore</span></label><div class="swatch" id="aCol">' + COLORI.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" class="' + (c === colore ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
      // gmail
      '<div data-solo="gmail" style="margin-top:12px"><details' + (a.url ? '' : ' open') + '><summary style="font-weight:800;cursor:pointer;margin-bottom:10px">Come collegarla (5 minuti, una volta per account)</summary><ol class="steps">' +
      '<li>Dal computer apri <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> <b>con questo account Gmail</b>: si crea un progetto nuovo.</li>' +
      '<li>Cancella il testo che c\'è e incolla lo script (tasto <b>Copia script</b> qui sotto).</li>' +
      '<li>Alla riga <code>CODICE_SEGRETO</code> scrivi una parola segreta a tua scelta e salva.</li>' +
      '<li>Scegli la funzione <b>installa</b> e premi <b>Esegui</b>: accetta i permessi (è il tuo script).</li>' +
      '<li><b>Esegui il deployment → Nuovo deployment</b>, tipo <b>App web</b>, "Esegui come: Me", "Chi può accedere: Chiunque". Copia l\'URL che finisce con <code>/exec</code>.</li>' +
      '<li>Incolla qui URL e parola segreta e premi <b>Salva e prova</b>.</li></ol>' +
      '<div class="btns" style="margin-bottom:12px"><button type="button" class="btn sec sm" data-act="copiaScript">' + IC.copy + 'Copia script</button><button type="button" class="btn ghost sm" data-act="vediScript">Vedi script</button></div></details>' +
      '<label class="f"><span>URL dello script (finisce con /exec)</span><input class="inp" name="url" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(a.url || '') + '"></label>' +
      '<label class="f"><span>Parola segreta</span><input class="inp" name="token" autocomplete="off" value="' + esc(a.token || '') + '"></label>' +
      '<label class="f"><span>Al primo collegamento leggi gli ultimi</span><select class="inp" name="giorni">' + [3, 7, 14, 30, 60].map(function (n) { return '<option value="' + n + '"' + ((a.giorni || 7) === n ? ' selected' : '') + '>' + n + ' giorni</option>'; }).join('') + '</select></label>' +
      '<label class="toggle"><span><b>Etichette su Gmail</b><br><span class="small muted">Mette "Smistino/Sezione" anche nella tua casella</span></span><span class="switch"><input type="checkbox" name="etichette"' + (a.etichette ? ' checked' : '') + '><i></i></span></label>' +
      (nuovo ? '' : '<label class="toggle"><span><b>In pausa</b><br><span class="small muted">Non controllarla per ora</span></span><span class="switch"><input type="checkbox" name="pausa"' + (a.pausa ? ' checked' : '') + '><i></i></span></label>') + '</div>' +
      // inoltro
      '<div data-solo="inoltro" style="margin-top:12px"><label class="f"><span>La inoltro a questa Gmail collegata</span><select class="inp" name="via">' + (gmailCollegati().length ? gmailCollegati().map(function (g) { return '<option value="' + g.id + '"' + (a.via === g.id ? ' selected' : '') + '>' + esc(g.nome || g.indirizzo) + '</option>'; }).join('') : '<option value="">— prima collega una Gmail —</option>') + '</select></label>' +
      '<details><summary style="font-weight:800;cursor:pointer;margin-bottom:8px">Come attivare l\'inoltro automatico</summary><ol class="steps">' +
      '<li><b>Outlook / Hotmail:</b> Impostazioni → Posta → Inoltro → Abilita, indirizzo della tua Gmail, "Conserva una copia".</li>' +
      '<li><b>Libero, Virgilio, Tiscali, Aruba, PEC:</b> nella webmail cerca "Inoltro" o "Regole/Filtri" → inoltra tutto alla Gmail (lasciando una copia).</li>' +
      '<li><b>iCloud:</b> icloud.com → Mail → Impostazioni → Inoltra le email a…</li>' +
      '<li><b>Yahoo:</b> l\'inoltro automatico è a pagamento; in alternativa salva le email come .eml e usa <b>Importa</b>.</li>' +
      '<li>Smistino riconosce le email inoltrate dall\'indirizzo che hai scritto qui sopra e le mostra con il colore di questo account.</li></ol></details></div>' +
      '<div data-solo="manuale" style="margin-top:12px"><p class="small muted">Per caselle che non puoi collegare: le email arrivano da <b>Importa</b> (file .eml) o <b>Incolla</b>.</p></div>' +
      '<button class="btn block" type="submit" style="margin-top:12px">' + IC.check + 'Salva' + ' e prova</button>' + (nuovo ? '' : '<button type="button" class="btn danger block" id="aDel" style="margin-top:8px">' + IC.trash + 'Elimina account</button>') + '</form>';
    var DESC = { gmail: 'Smistino legge la casella con un piccolo script che crei tu sul tuo account Google. Uno script per ogni Gmail: puoi aggiungerne quante vuoi.', inoltro: 'Per Outlook, Libero, iCloud, PEC e le altre: imposti l\'inoltro automatico verso una Gmail già collegata e Smistino le separa da sola.', manuale: 'Nessun collegamento: importi i file delle email o incolli il testo.' };
    sheet(nuovo ? 'Nuovo account email' : esc(a.nome || a.indirizzo), h, function (s) {
      function mostra() {
        $$('#aTipo button', s).forEach(function (b) { b.classList.toggle('on', b.dataset.t === tipo); });
        $$('[data-solo]', s).forEach(function (x) { x.hidden = x.dataset.solo !== tipo; });
        $('#aDesc', s).textContent = DESC[tipo];
      }
      mostra();
      $('#aTipo', s).addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { tipo = b.dataset.t; mostra(); } });
      $('#aCol', s).addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; colore = b.dataset.c; $$('#aCol button', s).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      var del = $('#aDel', s);
      if (del) del.addEventListener('click', function () {
        var n = tutti().filter(function (m) { return m.fonte === a.id; }).length;
        if (!confirm('Eliminare l\'account "' + (a.nome || a.indirizzo) + '"' + (n ? ' e i suoi ' + n + ' messaggi in Smistino' : '') + '?')) return;
        tutti().forEach(function (m) { if (m.fonte === a.id) delete D.msg[m.id]; });
        D.account = D.account.filter(function (x) { return x.id !== a.id; });
        D.account.forEach(function (x) { if (x.via === a.id) x.via = ''; });
        save(); chiudiSheet(true); ridisegna(); toast('Account eliminato');
      });
      $('#fAcc', s).addEventListener('submit', function (e) {
        e.preventDefault();
        var f = new FormData(e.target), rec = nuovo ? { id: 'a' + uid() } : a;
        rec.tipo = tipo; rec.colore = colore;
        rec.nome = String(f.get('nome') || '').trim(); rec.indirizzo = String(f.get('indirizzo') || '').trim().toLowerCase();
        if (!rec.nome) rec.nome = rec.indirizzo || (tipo === 'gmail' ? 'Gmail' : 'Email');
        if (tipo === 'gmail') {
          var url = String(f.get('url') || '').trim();
          if (url && !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) { toast('L\'URL deve iniziare con https://script.google.com/', 3500); return; }
          if (url !== rec.url) rec.ultimo = 0;
          rec.url = url; rec.token = String(f.get('token') || '').trim(); rec.giorni = +f.get('giorni') || 7; rec.etichette = !!f.get('etichette'); rec.pausa = !!f.get('pausa'); rec.errore = '';
        } else if (tipo === 'inoltro') {
          rec.via = f.get('via') || '';
          if (!rec.indirizzo) { toast('Scrivi l\'indirizzo email che inoltri'); return; }
        }
        if (nuovo) D.account.push(rec);
        save(); chiudiSheet();
        if (tipo === 'gmail' && rec.url) {
          toast('Provo il collegamento…');
          chiama(rec, { azione: 'info' }).then(function (j) {
            if (j.account && !rec.indirizzo) rec.indirizzo = j.account;
            if (j.telegram) rec.telegram = j.telegram;
            save(); chiediNotifiche();
            return controllaAccount(rec, true).then(function (st) { if (st) { avvisa(st, true); if (!st.nuovi) toast('Collegata ✓ ' + (rec.indirizzo || ''), 3000); } ridisegna(); });
          }).catch(function (err) { rec.errore = String(err.message || err).replace('Failed to fetch', 'script non raggiungibile'); save(); ridisegna(); toast('Errore: ' + rec.errore, 4500); });
        } else { ridisegna(); toast('Account salvato ✓'); }
      });
    });
  }
  var scriptTesto = null;
  function caricaScript() { return scriptTesto ? Promise.resolve(scriptTesto) : fetch('ponte/Codice.gs').then(function (r) { return r.text(); }).then(function (t) { scriptTesto = t; return t; }); }
  ACT.copiaScript = function () { caricaScript().then(function (t) { return navigator.clipboard.writeText(t); }).then(function () { toast('Script copiato ✓ — incollalo su script.google.com', 3500); }).catch(function () { ACT.vediScript(); }); };
  ACT.vediScript = function () { caricaScript().then(function (t) { sheet('Script ponte per Google', '<p class="small muted" style="margin-top:0">Tieni premuto per selezionare e copiare.</p><pre class="code" style="max-height:60vh;user-select:text">' + esc(t) + '</pre>'); }); };

  // ---- app di messaggi ----
  ACT.nuovoCanale = function () { formCanale({}); };
  function formCanale(c, dopo) {
    var nuovo = !c.id, colore = c.colore || COLORI[(D.canali.length * 5) % COLORI.length], icona = c.icona || 'chat';
    var h = '<form id="fCa"><label class="f"><span>Nome dell\'app</span><input class="inp" name="nome" required placeholder="Es. Signal, Messenger, Instagram, Slack, Teams, Discord" value="' + esc(c.nome || '') + '"></label>' +
      '<label class="f"><span>Come si chiama nelle notifiche / pacchetto Android (facoltativo)</span><input class="inp" name="app" placeholder="Es. signal, org.thoughtcrime.securesms" value="' + esc((c.app || []).join(', ')) + '"></label>' +
      '<label class="f"><span>Colore</span></label><div class="swatch" id="cCol">' + ['#25d366', '#229ed9', '#3a76f0', '#0084ff', '#e1306c', '#611f69', '#5865f2', '#6264a7', '#f97316', '#64748b'].concat(COLORI.slice(0, 6)).map(function (k) { return '<button type="button" data-c="' + k + '" style="background:' + k + '" class="' + (k === colore ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
      '<button class="btn block" type="submit" style="margin-top:14px">' + IC.check + 'Salva</button>' + (nuovo || CANALI_BASE.some(function (b) { return b.id === c.id; }) ? '' : '<button type="button" class="btn danger block" id="cDel" style="margin-top:8px">' + IC.trash + 'Elimina</button>') + '</form>';
    sheet(nuovo ? 'Nuova app di messaggi' : esc(c.nome), h, function (s) {
      $('#cCol', s).addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; colore = b.dataset.c; $$('#cCol button', s).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      var del = $('#cDel', s);
      if (del) del.addEventListener('click', function () {
        if (!confirm('Eliminare ' + c.nome + ' e i suoi messaggi in Smistino?')) return;
        tutti().forEach(function (m) { if (m.canale === c.id) delete D.msg[m.id]; });
        D.canali = D.canali.filter(function (x) { return x.id !== c.id; }); save(); chiudiSheet(true); ridisegna();
      });
      $('#fCa', s).addEventListener('submit', function (e) {
        e.preventDefault(); var f = new FormData(e.target);
        var rec = nuovo ? { id: 'c' + uid(), icona: icona } : c;
        rec.nome = String(f.get('nome')).trim(); rec.colore = colore;
        rec.app = String(f.get('app') || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
        if (rec.app.indexOf(N(rec.nome)) < 0) rec.app.unshift(N(rec.nome));
        if (nuovo) D.canali.push(rec);
        save(); chiudiSheet(); toast('Salvato ✓'); if (dopo) dopo(rec); else ridisegna();
      });
    });
  }
  ACT.apriCanale = function (el) { apriCanale(el.dataset.id); };
  function apriCanale(id) {
    var c = canale(id); if (!c) return;
    var g = gmailCollegati();
    var h = '<p class="small muted" style="margin-top:0">' + esc(c.nome) + ' non permette ad altre app di leggere le chat, quindi Smistino usa queste strade. Scegli quella che preferisci (puoi usarne più di una).</p>';
    // 1) automatico da notifiche
    h += '<div class="way"><h3>' + IC.spark + ' Automatico dalle notifiche <span class="tag ok">Android</span></h3><p class="small">Ogni notifica di ' + esc(c.nome) + ' viene inoltrata al tuo script Google e arriva qui da sola, già smistata.</p>';
    if (!g.length) h += '<p class="small" style="color:var(--danger)">Serve prima un account Gmail collegato (lo script fa da "casella").</p><button class="btn sm" data-act="go" data-to="#/fonti">Collega una Gmail</button>';
    else {
      var a = g[0], url = urlScript(a, { app: c.nome });
      h += (g.length > 1 ? '<label class="f"><span>Script da usare</span><select class="inp" id="cwA">' + g.map(function (x) { return '<option value="' + x.id + '">' + esc(x.nome) + '</option>'; }).join('') + '</select></label>' : '') +
        '<ol class="steps"><li>Installa l\'app gratuita <b>MacroDroid</b> dal Play Store e dalle il permesso di leggere le notifiche.</li>' +
        '<li>Nuova macro → <b>Trigger:</b> Notifica → Notifica ricevuta → app <b>' + esc(c.nome) + '</b>.</li>' +
        '<li><b>Azione:</b> Connettività → <b>Richiesta HTTP</b>, metodo <b>POST</b>, URL qui sotto.</li>' +
        '<li>Corpo della richiesta, tipo <b>application/json</b>: copia il modello qui sotto, poi sostituisci <code>TITOLO</code> e <code>TESTO</code> con i "testi magici" <i>Titolo notifica</i> e <i>Testo notifica</i> (tasto <b>…</b> accanto al campo).</li>' +
        '<li>Salva la macro e fatti mandare un messaggio di prova.</li></ol>' +
        '<label class="f"><span>URL</span><div class="row"><input class="inp grow" id="cwU" readonly value="' + esc(url) + '"><button type="button" class="iconbtn" data-act="copiaCampo" data-f="cwU">' + IC.copy + '</button></div></label>' +
        '<label class="f"><span>Corpo (JSON)</span><div class="row"><input class="inp grow" id="cwB" readonly value="' + esc('{"da":"TITOLO","testo":"TESTO"}') + '"><button type="button" class="iconbtn" data-act="copiaCampo" data-f="cwB">' + IC.copy + '</button></div></label>' +
        '<button type="button" class="btn sec sm" data-act="provaWebhook" data-c="' + c.id + '">' + IC.spark + 'Manda un messaggio di prova</button>' +
        '<p class="src">Funziona anche con Tasker, Automate, IFTTT o Comandi rapidi di iPhone: basta mandare <code>da</code> e <code>testo</code> a quell\'URL. Su iPhone le notifiche non si possono leggere in automatico: usa Condividi o il bot Telegram.</p>';
    }
    h += '</div>';
    // 2) bot telegram
    if (c.id === 'telegram') {
      var bot = botTelegram();
      h += '<div class="way"><h3>' + IC.telegram + ' Bot Telegram personale <span class="tag ok">Android e iPhone</span></h3>' +
        (bot ? '<p class="small">Collegato: <b>@' + esc(bot) + '</b>. Inoltra a questo bot i messaggi che vuoi smistare: arrivano qui con il mittente originale.</p><div class="btns"><a class="btn sm" style="background:#229ed9" href="https://t.me/' + esc(bot) + '" target="_blank" rel="noopener">Apri il bot</a><button class="btn sm ghost" data-act="botTg" data-x="1">Scollega</button></div>' :
          '<ol class="steps"><li>Su Telegram apri <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>, scrivi <code>/newbot</code>, scegli un nome: ricevi un <b>token</b>.</li><li>Incollalo qui e premi Collega.</li><li>Apri il tuo bot e premi <b>Avvia</b>: da quel momento ascolta solo te.</li><li>Inoltra al bot i messaggi (anche tanti insieme). Puoi anche scrivergli <code>#signal Mario: testo</code> per messaggi di altre app.</li></ol>' +
          (g.length ? '<div class="row"><input class="inp grow" id="tgTok" placeholder="123456:ABC-DEF…" autocomplete="off"><button class="btn sm" data-act="botTg">Collega</button></div>' : '<p class="small" style="color:var(--danger)">Serve prima un account Gmail collegato.</p>')) + '</div>';
    }
    // 3) condividi e importa
    h += '<div class="way"><h3>' + IC.share + ' Condividi con Smistino</h3><p class="small">In ' + esc(c.nome) + ' tieni premuto un messaggio (o selezionane tanti) → <b>Condividi</b> o <b>Copia</b>. Con Smistino installato su Android appare tra le app di condivisione; altrimenti usa <b>Incolla</b>.</p><button class="btn sm sec" data-act="incolla" data-c="' + c.id + '">' + IC.copy + 'Incolla messaggi</button></div>';
    h += '<div class="way"><h3>' + IC.up + ' Importa una chat intera</h3><p class="small">' + (c.id === 'whatsapp' ? 'Apri la chat → ⋮ → Altro → <b>Esporta chat</b> → Senza media → salva il file e importalo qui.' : c.id === 'telegram' ? 'Telegram Desktop → Impostazioni → Avanzate → <b>Esporta dati</b> (formato JSON) e importa <code>result.json</code>.' : 'Se l\'app permette di esportare le chat in testo, importa il file qui.') + '</p><button class="btn sm sec" data-act="go" data-to="#/importa">' + IC.up + 'Importa file</button></div>';
    h += '<button class="btn ghost block sm" data-act="modCanale" data-id="' + c.id + '" style="margin-top:6px">' + IC.edit + 'Nome, colore e riconoscimento</button>';
    sheet(esc(c.nome), h, function (s) {
      var sel = $('#cwA', s);
      if (sel) sel.addEventListener('change', function () { $('#cwU', s).value = urlScript(account(sel.value), { app: c.nome }); });
    });
  }
  ACT.modCanale = function (el) { chiudiSheet(); formCanale(canale(el.dataset.id)); };
  ACT.copiaCampo = function (el) { copia($('#' + el.dataset.f).value); };
  ACT.provaWebhook = function (el) {
    var sel = $('#cwA'), a = sel ? account(sel.value) : gmailCollegati()[0], c = canale(el.dataset.c);
    toast('Invio prova…');
    chiama(a, { azione: 'invia', app: c.nome, da: 'Prova Smistino', testo: 'Messaggio di prova da ' + c.nome + ': se lo vedi, il collegamento funziona ✓' })
      .then(function () { return controllaAccount(a, true); }).then(function (st) { if (st && st.nuovi) { chiudiSheet(true); avvisa(st, true); location.hash = '#/posta'; } else toast('Inviato: controlla tra poco'); })
      .catch(function (e) { toast('Errore: ' + (e.message || e), 4000); });
  };
  ACT.botTg = function (el) {
    var g = gmailCollegati(); if (!g.length) return;
    var a = D.account.filter(function (x) { return x.telegram; })[0] || g[0];
    var tok = el.dataset.x ? '' : ($('#tgTok') || {}).value || '';
    if (!el.dataset.x && !/^\d+:[\w-]{20,}$/.test(tok.trim())) { toast('Il token sembra sbagliato (es. 123456:ABC…)'); return; }
    chiama(a, { azione: 'telegram', bot: tok.trim() }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'errore');
      D.account.forEach(function (x) { delete x.telegram; });
      if (j.telegram) a.telegram = j.telegram;
      save(); chiudiSheet(); apriCanale('telegram');
      toast(j.telegram ? 'Bot @' + j.telegram + ' collegato ✓ — aprilo e premi Avvia' : 'Bot scollegato', 4000);
    }).catch(function (e) { toast('Errore: ' + (e.message || e), 4000); });
  };

  // ---------------------------------------------------------
  // INCOLLA / CONDIVIDI
  // ---------------------------------------------------------
  // "[14:05, 10/11/2026] Mario: testo" (copia di più messaggi da WhatsApp)
  var RE_COPIA = /^\[(\d{1,2})[:.](\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]\s([^:]{1,60}):\s?([\s\S]*)$/;
  function leggiIncollato(t) {
    var out = [], cur = null;
    String(t || '').replace(/\r/g, '').split('\n').forEach(function (r) {
      var m = r.match(RE_COPIA);
      if (m) { var a = +m[5]; if (a < 100) a += 2000; cur = { da: m[6].trim(), testo: m[7], date: new Date(a, +m[4] - 1, +m[3], +m[1], +m[2]).toISOString() }; out.push(cur); }
      else if (cur) cur.testo += '\n' + r;
    });
    if (out.length) return out;
    var wa = Importa.whatsapp(t, '');
    if (wa.length) return wa.map(function (x) { return { da: x.da, testo: x.testo, date: x.date }; });
    return [];
  }
  ACT.incolla = function (el) { formIncolla({ canale: el.dataset.c }); };
  function formIncolla(pre) {
    pre = pre || {};
    var can = pre.canale || D.imp.ultimoCanale || 'whatsapp';
    var opzA = D.account.map(function (a) { return '<option value="a:' + a.id + '">✉ ' + esc(a.nome) + '</option>'; }).join('');
    var h = '<form id="fIn"><label class="f"><span>Da quale app?</span><select class="inp" name="dove">' + D.canali.map(function (c) { return '<option value="c:' + c.id + '"' + (c.id === can ? ' selected' : '') + '>💬 ' + esc(c.nome) + '</option>'; }).join('') + opzA + '<option value="__nuova">+ Un\'altra app…</option></select></label>' +
      '<div class="two" id="inChat"><label class="f"><span>Chat / gruppo</span><input class="inp" name="chat" placeholder="Es. Mamma, Calcetto" value="' + esc(pre.chat || '') + '"></label><label class="f"><span>Chi l\'ha scritto</span><input class="inp" name="da" placeholder="Se diverso dalla chat" value="' + esc(pre.da || '') + '"></label></div>' +
      '<label class="f" id="inOgg" hidden><span>Mittente e oggetto</span><input class="inp" name="from" placeholder="mittente@esempio.it" style="margin-bottom:8px"><input class="inp" name="subject" placeholder="Oggetto"></label>' +
      '<label class="f"><span>Testo</span><textarea class="inp" name="testo" required style="min-height:140px" placeholder="Incolla qui il messaggio (anche più messaggi copiati insieme)">' + esc(pre.testo || '') + '</textarea></label>' +
      '<p class="small muted" id="inInfo" style="margin:-4px 2px 10px"></p><button class="btn block" type="submit">' + IC.spark + 'Smista</button></form>';
    sheet('Aggiungi messaggi', h, function (s) {
      var dove = $('[name=dove]', s), ta = $('[name=testo]', s);
      function agg() {
        var email = /^a:/.test(dove.value);
        $('#inChat', s).hidden = email; $('#inOgg', s).hidden = !email;
        var n = email ? 0 : leggiIncollato(ta.value).length;
        $('#inInfo', s).textContent = n > 1 ? 'Riconosciuti ' + n + ' messaggi con data e mittente.' : '';
        if (n && !$('[name=chat]', s).value) { var l = leggiIncollato(ta.value); var nomi = l.map(function (x) { return x.da; }).filter(function (x, i, a) { return a.indexOf(x) === i; }); if (nomi.length === 1) $('[name=chat]', s).value = nomi[0]; }
      }
      dove.addEventListener('change', function () {
        if (dove.value === '__nuova') { formCanale({}, function (c) { var o = document.createElement('option'); o.value = 'c:' + c.id; o.textContent = '💬 ' + c.nome; dove.insertBefore(o, dove.lastElementChild); dove.value = o.value; agg(); }); }
        agg();
      });
      ta.addEventListener('input', agg); agg();
      $('#fIn', s).addEventListener('submit', function (e) {
        e.preventDefault(); var f = new FormData(e.target), d = String(f.get('dove')), testo = String(f.get('testo')).trim(); if (!testo) return;
        var lista;
        if (/^a:/.test(d)) {
          lista = [normEmail({ id: 'inc-' + uid(), from: f.get('from'), subject: f.get('subject'), body: testo, date: new Date().toISOString(), unread: true }, d.slice(2))];
        } else {
          var cid = d.slice(2); D.imp.ultimoCanale = cid;
          var chat = String(f.get('chat') || '').trim(), da = String(f.get('da') || '').trim();
          var parsed = leggiIncollato(testo);
          if (parsed.length && !chat) { var nomi = parsed.map(function (x) { return x.da; }).filter(function (x, i, a) { return a.indexOf(x) === i; }); chat = nomi.length === 1 ? nomi[0] : nomi.slice(0, 3).join(', '); }
          lista = (parsed.length ? parsed : [{ da: da || chat || 'Sconosciuto', testo: testo, date: new Date().toISOString() }]).map(function (x) {
            return normChat({ canale: cid, chat: chat || x.da, da: x.da, testo: x.testo, date: x.date });
          });
        }
        var st = aggiungi(lista);
        chiudiSheet();
        if (!st.nuovi) { toast('Già presenti in Smistino'); return; }
        var m = D.msg[st.primo];
        toast(st.nuovi > 1 ? st.nuovi + ' messaggi smistati ✓' : '✓ In ' + sez(m.sezione).nome);
        ridisegna();
        setTimeout(function () { ACT.apri({ dataset: { id: st.primo } }); }, 120);
      });
    });
  }

  // ---------------------------------------------------------
  // IMPORTA file
  // ---------------------------------------------------------
  VIEWS.importa = function (v) {
    v.innerHTML = '<div class="page-head"><div><h1>Importa</h1><p>Chat esportate ed email salvate</p></div></div>' +
      '<label class="drop" id="dz"><input type="file" id="fileIn" multiple accept=".txt,.zip,.json,.eml,text/plain,application/zip,application/json,message/rfc822"><div class="big" style="color:var(--pri)">' + ic('up', 56) + '</div><b>Scegli i file</b><span class="small muted">WhatsApp (.txt / .zip) · Telegram (result.json) · Email (.eml)</span></label>' +
      '<div class="card"><h3>WhatsApp</h3><p class="small muted" style="margin:4px 0 0">Apri la chat → ⋮ (o il nome in alto su iPhone) → <b>Esporta chat</b> → <b>Senza media</b> → salva il file o condividilo con Smistino.</p></div>' +
      '<div class="card"><h3>Telegram</h3><p class="small muted" style="margin:4px 0 0">Da computer: Telegram Desktop → Impostazioni → Avanzate → <b>Esporta dati di Telegram</b> (o dentro una chat: ⋮ → Esporta cronologia) → formato <b>JSON</b>. Importa <code>result.json</code>.</p></div>' +
      '<div class="card"><h3>Email da altre caselle</h3><p class="small muted" style="margin:4px 0 0">Da quasi tutte le webmail puoi scaricare un messaggio come <b>.eml</b> ("Scarica", "Salva come", "Mostra originale"). Puoi importarne tanti insieme, anche in uno zip.</p></div>' +
      '<p class="disclaimer">I file vengono letti sul telefono: non vengono caricati da nessuna parte.</p>';
    $('#fileIn').addEventListener('change', function () { importaFile(Array.prototype.slice.call(this.files)); this.value = ''; });
  };
  function importaFile(files) {
    if (!files.length) return;
    toast('Leggo ' + files.length + ' file…');
    Promise.all(files.map(function (f) { return Importa.daFile(f).catch(function (e) { return { errore: e.message || String(e), nome: f.name }; }); })).then(function (ris) {
      var err = ris.filter(function (r) { return r.errore; });
      if (err.length) toast(err[0].nome + ': ' + err[0].errore, 4500);
      var chat = [], email = [];
      ris.forEach(function (r) { if (r.tipo === 'chat') chat = chat.concat(r.messaggi); else if (r.tipo === 'email') email = email.concat(r.messaggi); });
      if (chat.length || email.length) anteprimaImport(chat, email);
    });
  }
  function anteprimaImport(chat, email) {
    var persone = {}, chatNomi = {};
    chat.forEach(function (m) { persone[m.da] = (persone[m.da] || 0) + 1; chatNomi[m.chat] = 1; });
    var nomi = Object.keys(persone).sort(function (a, b) { return persone[b] - persone[a]; });
    var unaChat = Object.keys(chatNomi).length === 1;
    var h = '';
    if (chat.length) {
      h += '<div class="card flat"><b>' + chat.length + ' messaggi</b> in ' + Object.keys(chatNomi).length + ' chat (' + esc(canale(chat[0].canale) ? canale(chat[0].canale).nome : chat[0].canale) + ')</div>' +
        (unaChat ? '<label class="f"><span>Nome della chat</span><input class="inp" id="imChat" value="' + esc(Object.keys(chatNomi)[0]) + '"></label>' : '') +
        '<label class="f"><span>Tu chi sei nella chat? (i tuoi messaggi non contano come nuovi)</span><select class="inp" id="imIo"><option value="">— nessuno —</option>' + nomi.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
        '<label class="f"><span>Quali messaggi</span><select class="inp" id="imGg"><option value="30">Ultimi 30 giorni</option><option value="90" selected>Ultimi 90 giorni</option><option value="365">Ultimo anno</option><option value="0">Tutti</option></select></label>';
    }
    if (email.length) h += '<div class="card flat"><b>' + email.length + ' email</b></div><label class="f"><span>Mettile nell\'account</span><select class="inp" id="imAcc">' + (D.account.length ? D.account.map(function (a) { return '<option value="' + a.id + '">' + esc(a.nome) + '</option>'; }).join('') : '') + '<option value="__nuovo">+ Nuovo account "Importate"</option></select></label>';
    h += '<button class="btn block" id="imGo">' + IC.spark + 'Importa e smista</button>';
    sheet('Importazione', h, function (s) {
      $('#imGo', s).addEventListener('click', function () {
        var lista = [];
        if (chat.length) {
          var io = ($('#imIo', s) || {}).value || '', gg = +(($('#imGg', s) || {}).value || 0), lim = gg ? Date.now() - gg * 864e5 : 0, nome = $('#imChat', s) ? $('#imChat', s).value.trim() : '';
          lista = lista.concat(chat.filter(function (m) { return !lim || new Date(m.date).getTime() >= lim; }).map(function (m) {
            return normChat({ canale: m.canale, chat: nome || m.chat, da: m.da === io ? 'Io' : m.da, testo: m.testo, date: m.date, mio: !!io && m.da === io });
          }));
        }
        if (email.length) {
          var accId = $('#imAcc', s).value;
          if (accId === '__nuovo') { var na = { id: 'a' + uid(), tipo: 'manuale', nome: 'Importate', indirizzo: '', colore: '#8b5cf6' }; D.account.push(na); accId = na.id; }
          lista = lista.concat(email.map(function (e) { return normEmail({ id: 'imp-' + hash(e.from + e.subject + e.date), from: e.from, to: e.to, subject: e.subject, body: e.body, date: e.date, listUnsub: e.listUnsub, unread: false }, accId); }));
        }
        var st = aggiungi(lista, { storico: true });
        chiudiSheet();
        var parti = Object.keys(st.perSez).map(function (k) { return sez(k).nome + ' ' + st.perSez[k]; });
        toast(st.nuovi ? 'Importati ' + st.nuovi + ': ' + parti.slice(0, 3).join(' · ') : 'Nessun messaggio nuovo da importare', 4500);
        location.hash = '#/posta';
      });
    });
  }

  // ---------------------------------------------------------
  // REGOLE
  // ---------------------------------------------------------
  VIEWS.regole = function (v) {
    var rm = D.regole.mittenti, rc = D.regole.chat;
    var parole = Object.keys(D.regole.parole).reduce(function (n, k) { return n + Object.keys(D.regole.parole[k]).length; }, 0);
    var riga = function (tipo, k, sid, label) { var s = sez(sid); return '<div class="toggle" style="padding:9px 0"><span class="grow ellipsis small"><b>' + esc(label) + '</b>' + (tipo === 'mittenti' && D.ponteMitt[k] ? ' <span class="muted">· da Cartellina</span>' : '') + '</span><span class="tag" style="background:' + s.colore + '1f;color:' + s.colore + '">' + esc(s.nome) + '</span><button class="linkbtn small" style="color:var(--danger);margin-left:8px" data-act="togliRegola" data-t="' + tipo + '" data-k="' + esc(k) + '">Togli</button></div>'; };
    var h = '<div class="page-head"><div><h1>Regole</h1><p>Quello che Smistino ha imparato da te</p></div></div>';
    h += '<div class="card"><h3>Mittenti e domini <span class="muted small">' + Object.keys(rm).length + '</span></h3>' + (Object.keys(rm).length ? Object.keys(rm).sort().map(function (k) { return riga('mittenti', k, rm[k], k); }).join('') : '<p class="small muted">Nessuna. Si creano quando sposti o confermi un\'email.</p>') +
      '<div class="row" style="margin-top:10px"><input class="inp grow" id="rgM" placeholder="indirizzo o dominio (es. enel.it)"><select class="inp" id="rgS" style="width:auto">' + sezAttive().map(function (s) { return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('') + '</select><button class="iconbtn" data-act="addRegola">' + IC.plus + '</button></div></div>';
    h += '<div class="card"><h3>Chat <span class="muted small">' + Object.keys(rc).length + '</span></h3>' + (Object.keys(rc).length ? Object.keys(rc).sort().map(function (k) { var p = k.split('|'); var c = canale(p[0]); return riga('chat', k, rc[k], (c ? c.nome : p[0]) + ' · ' + p.slice(1).join('|')); }).join('') : '<p class="small muted">Nessuna. Si creano quando sposti o confermi una chat.</p>') + '</div>';
    h += '<div class="card"><div class="row"><div class="grow"><h3>Parole imparate</h3><p class="small muted" style="margin:2px 0 0">' + parole + ' parole collegate alle sezioni dalle tue scelte</p></div>' + (parole ? '<button class="btn sm ghost" data-act="azzeraParole">Azzera</button>' : '') + '</div></div>';
    h += '<button class="btn sec block" data-act="riclassifica">' + IC.refresh + 'Ripassa i messaggi non confermati</button>';
    v.innerHTML = h;
  };
  ACT.togliRegola = function (el) {
    var k = el.dataset.k;
    if (D.ponteMitt[k] && window.Ponte) { Ponte.ignora('cartellina:mitt:' + k); delete D.ponteMitt[k]; }
    delete D.regole[el.dataset.t][k]; save(); ridisegna();
  };
  ACT.addRegola = function () {
    var k = $('#rgM').value.trim().toLowerCase().replace(/^@/, ''); if (!k) return;
    D.regole.mittenti[k] = $('#rgS').value; save();
    var n = 0; tutti().forEach(function (m) { if (m.tipo === 'email' && !m.confermato && (mittente(m) === k || Smista.dominio(mittente(m)) === k || Smista.dominio(mittente(m)).slice(-k.length - 1) === '.' + k)) { m.sezione = D.regole.mittenti[k]; m.fiducia = 'alta'; m.motivi = ['Regola tua']; n++; } });
    save(); ridisegna(); toast('Regola aggiunta' + (n ? ' · ' + n + ' email spostate' : ''));
  };
  ACT.azzeraParole = function () { if (!confirm('Dimenticare le parole imparate? Le regole su mittenti e chat restano.')) return; D.regole.parole = {}; save(); ridisegna(); };
  ACT.riclassifica = function () { var n = riclassifica(false); ridisegna(); toast(n ? n + ' messaggi cambiati di sezione' : 'Nessun cambiamento'); };

  // ---------------------------------------------------------
  // ALTRO e IMPOSTAZIONI
  // ---------------------------------------------------------
  VIEWS.altro = function (v) {
    var nf = D.account.length + D.canali.length;
    v.innerHTML = '<div class="page-head"><div><h1>Altro</h1></div></div><div class="menu">' +
      '<a href="#/fonti"><i style="background:var(--pri-l);color:var(--pri-d)">' + IC.plug + '</i><b>Fonti</b><small>' + nf + ' tra email e app</small></a>' +
      '<a href="#/importa"><i style="background:#ede9fe;color:#6d28d9">' + IC.up + '</i><b>Importa</b><small>Chat ed email salvate</small></a>' +
      '<a href="#" data-act="incolla"><i style="background:#fff1e6;color:#c2410c">' + IC.copy + '</i><b>Incolla</b><small>Da qualsiasi app</small></a>' +
      '<a href="#/regole"><i style="background:#e0f2fe;color:#0369a1">' + IC.rules + '</i><b>Regole</b><small>Cosa ho imparato</small></a>' +
      '<a href="#/posta/stella"><i style="background:#fef3c7;color:#b45309">' + IC.star + '</i><b>Importanti</b><small>Messaggi con la stella</small></a>' +
      '<a href="#" data-act="ponte"><i style="background:#e7f6ee;color:#167a4c">' + IC.share + '</i><b>Collega le app</b><small>' + (window.Ponte && Ponte.attivo() ? 'AgendApp e Cartellina collegate' : 'AgendApp e Cartellina') + '</small></a>' +
      '<a href="#/impostazioni"><i style="background:#eef0f6;color:var(--ink2)">' + IC.gear + '</i><b>Impostazioni</b><small>Notifiche, backup</small></a></div>' +
      '<div class="card" style="margin-top:14px"><h3>I tuoi messaggi restano tuoi</h3><p class="small muted" style="margin:6px 0 0">Tutto è salvato solo su questo telefono. Email e messaggi passano dagli script che crei tu sul tuo account Google: nessun server esterno. Fai ogni tanto un backup.</p></div>' +
      '<p class="disclaimer">Smistino v' + ((window.AppUpdate && window.AppUpdate.current) || '1.0.0') + '</p>';
  };
  VIEWS.impostazioni = function (v) {
    var I = D.imp;
    var sw = function (k, t, d) { return '<label class="toggle"><span><b>' + t + '</b>' + (d ? '<br><span class="small muted">' + d + '</span>' : '') + '</span><span class="switch"><input type="checkbox" data-imp="' + k + '"' + (I[k] ? ' checked' : '') + '><i></i></span></label>'; };
    var notif = !('Notification' in window) ? 'non supportate' : Notification.permission === 'granted' ? 'attive ✓' : Notification.permission === 'denied' ? 'bloccate (sbloccale dalle impostazioni del browser)' : 'da attivare';
    var n = Object.keys(D.msg).length;
    var h = '<div class="page-head"><div><h1>Impostazioni</h1></div></div>' +
      '<div class="card"><label class="f" style="margin:0"><span>Il tuo nome (per il saluto)</span><input class="inp" data-impv="nome" value="' + esc(I.nome) + '" placeholder="Facoltativo"></label></div>' +
      '<div class="section-title"><h2>Smistamento</h2></div><div class="card">' +
      '<div class="two"><label class="f"><span>Controlla ogni</span><select class="inp" data-impv="intervallo">' + [5, 10, 15, 30, 60].map(function (x) { return '<option value="' + x + '"' + (+I.intervallo === x ? ' selected' : '') + '>' + x + ' minuti</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>Guarda indietro</span><select class="inp" data-impv="giorni">' + [1, 3, 7, 14].map(function (x) { return '<option value="' + x + '"' + (+I.giorni === x ? ' selected' : '') + '>' + x + ' giorn' + (x > 1 ? 'i' : 'o') + '</option>'; }).join('') + '</select></label></div>' +
      sw('imparaMittenti', 'Impara i mittenti', 'Quando sposti un\'email, le prossime dello stesso mittente vanno lì') +
      sw('autoScadenze', 'Scadenze automatiche', 'Segna in "In arrivo" le date trovate con certezza') + '</div>' +
      '<div class="section-title"><h2>Avvisi</h2></div><div class="card">' +
      sw('notifiche', 'Notifica i nuovi messaggi', 'Solo per le sezioni con le notifiche accese') + sw('promemoria', 'Promemoria scadenze', 'La sera prima alle 18 e 2 ore prima') +
      '<div class="toggle"><span><b>Notifiche del telefono</b><br><span class="small muted">' + notif + '</span></span>' + ('Notification' in window && Notification.permission === 'default' ? '<button class="btn sm" data-act="attivaNotifiche">Attiva</button>' : '') + '</div></div>' +
      '<div class="section-title"><h2>I tuoi dati</h2></div><div class="card"><p class="small muted" style="margin:0 0 10px">' + n + ' messaggi · ' + D.scadenze.length + ' scadenze · ' + D.account.length + ' account</p>' +
      '<div class="btns"><button class="btn sec" data-act="backup">' + IC.down + 'Backup</button><button class="btn ghost" data-act="ripristina">' + IC.up + 'Ripristina</button></div>' +
      '<button class="btn ghost block" style="margin-top:8px" data-act="exportIcs">' + IC.cal + 'Esporta scadenze nel calendario</button>' +
      (tutti().some(function (m) { return m.demo; }) ? '<button class="btn ghost block" style="margin-top:8px" data-act="togliDemo">Togli i messaggi di prova</button>' : '') +
      '<button class="btn ghost block" style="margin-top:8px" data-act="pulisciVecchi">Alleggerisci l\'archivio</button>' +
      '<button class="btn danger block" style="margin-top:8px" data-act="cancellaTutto">' + IC.trash + 'Cancella tutti i dati</button></div>' +
      '<div class="card"><div class="row"><div class="grow"><b>Versione ' + ((window.AppUpdate && window.AppUpdate.current) || '1.0.0') + '</b><br><span class="small muted">Il tasto Aggiorna compare in alto quando c\'è una novità</span></div><button class="btn sm sec" data-act="checkUpd">Controlla</button></div></div>';
    v.innerHTML = h;
    $$('[data-imp]', v).forEach(function (el) { el.addEventListener('change', function () { D.imp[el.dataset.imp] = el.checked; save(); if (el.checked && /notifiche|promemoria/.test(el.dataset.imp)) chiediNotifiche(); }); });
    $$('[data-impv]', v).forEach(function (el) { el.addEventListener('change', function () { var k = el.dataset.impv; D.imp[k] = (k === 'intervallo' || k === 'giorni') ? +el.value : el.value.trim(); save(); if (k === 'intervallo') avviaPolling(); }); });
  };
  ACT.attivaNotifiche = function () { Notification.requestPermission().then(function () { ridisegna(); }); };
  ACT.checkUpd = function () { if (window.AppUpdate) window.AppUpdate.check().then(function (x) { if (!x) toast('Hai già l\'ultima versione ✓'); }); };
  function scarica(nome, testo, tipo) {
    var blob = new Blob([testo], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  ACT.backup = function () { scarica('smistino-backup-' + ymd(new Date()) + '.json', JSON.stringify(D), 'application/json'); toast('Backup scaricato ✓'); };
  ACT.ripristina = function () {
    var i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = function () {
      var r = new FileReader();
      r.onload = function () {
        try { var x = JSON.parse(r.result); if (!x.msg || !x.sezioni) throw 0; if (!confirm('Sostituire i dati attuali con il backup?')) return; D = unisci(x); save(true); toast('Dati ripristinati ✓'); route(); }
        catch (e) { toast('File di backup non valido'); }
      };
      r.readAsText(i.files[0]);
    };
    i.click();
  };
  ACT.cancellaTutto = function () {
    if (!confirm('Cancellare TUTTI i dati di Smistino da questo telefono? (Le tue caselle email non vengono toccate.)')) return;
    if (!confirm('Sicuro? Consiglio prima un backup. Confermi?')) return;
    D = def(); save(true); location.hash = '#/home'; route(); toast('Dati cancellati');
  };
  ACT.pulisciVecchi = function () { var n = Object.keys(D.msg).length; pulisci(true); save(); ridisegna(); toast('Tolti ' + (n - Object.keys(D.msg).length) + ' messaggi vecchi'); };
  ACT.togliDemo = function () {
    tutti().forEach(function (m) { if (m.demo) delete D.msg[m.id]; });
    D.scadenze = D.scadenze.filter(function (s) { return D.msg[s.msgId] || !s.msgId; });
    D.account = D.account.filter(function (a) { return !a.demo; });
    save(); route(); toast('Messaggi di prova rimossi');
  };
  ACT.demo = function () {
    if (D.msg['e-demo-pers-demo-e1']) { toast('Gli esempi sono già caricati'); location.hash = '#/posta'; return; }
    var ex = ESEMPI(new Date());
    [{ id: 'demo-pers', tipo: 'manuale', nome: 'Personale (prova)', indirizzo: 'rupi.prova@gmail.com', colore: '#4f5bd5', demo: true },
      { id: 'demo-lav', tipo: 'manuale', nome: 'Lavoro (prova)', indirizzo: 'roberto@studio-prova.it', colore: '#0ea5e9', demo: true }].forEach(function (a) { if (!account(a.id)) D.account.push(a); });
    var lista = ex.email.map(function (e) { var m = normEmail(e, e.acc); m.demo = true; m.letto = false; return m; })
      .concat(ex.chat.map(function (c) { return normChat({ id: c.id, canale: c.canale, chat: c.chat, da: c.da, testo: c.testo, date: c.date, demo: true }); }));
    var st = aggiungi(lista);
    var parti = Object.keys(st.perSez).map(function (k) { return sez(k).nome + ' ' + st.perSez[k]; });
    toast('Ho smistato ' + st.nuovi + ' messaggi di prova: ' + parti.slice(0, 4).join(' · ') + '…', 5000);
    location.hash = '#/home'; ridisegna();
  };

  // calendario .ics
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&'); }
  function icsDt(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function icsEvento(s) {
    var r = ['BEGIN:VEVENT', 'UID:' + s.id + '@smistino', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'];
    if (s.ora) { var x = at(s.data, s.ora); r.push('DTSTART:' + icsDt(x), 'DTEND:' + icsDt(new Date(x.getTime() + 36e5))); }
    else r.push('DTSTART;VALUE=DATE:' + s.data.replace(/-/g, ''));
    r.push('SUMMARY:' + icsEsc((s.tipo === 'Scadenza' ? '⏰ ' : '') + s.titolo), 'DESCRIPTION:' + icsEsc([s.tipo, s.note].filter(Boolean).join('\n')),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(s.titolo), 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT');
    return r.join('\r\n');
  }
  function icsWrap(x) { return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Smistino//IT\r\nCALSCALE:GREGORIAN\r\n' + x.join('\r\n') + '\r\nEND:VCALENDAR'; }
  ACT.exportIcs = function () { var l = prossimeScadenze(); if (!l.length) { toast('Niente da esportare'); return; } scarica('smistino-scadenze.ics', icsWrap(l.map(icsEvento)), 'text/calendar'); toast('Aprilo per aggiungerlo al calendario ✓', 3500); };
  ACT.icsUna = function (el) { var s = D.scadenze.filter(function (x) { return x.id === el.dataset.id; })[0]; scarica(s.titolo.replace(/\W+/g, '-').slice(0, 40) + '.ics', icsWrap([icsEvento(s)]), 'text/calendar'); };

  // ---------------------------------------------------------
  // Notifiche di sistema
  // ---------------------------------------------------------
  function chiediNotifiche() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    Notification.requestPermission().then(function (p) { if (p === 'granted') toast('Notifiche attivate ✓'); });
  }
  function notificaSistema(titolo, testo, dati) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    var opz = { body: testo, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: (dati && (dati.id || dati.tipo)) || ('s' + Date.now()), data: dati || {} };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (r) { r.showNotification(titolo, opz); }).catch(function () {});
    else { try { new Notification(titolo, opz); } catch (e) { return false; } }
    return true;
  }

  // ---------------------------------------------------------
  // Ponte: collaborazione con AgendApp e Cartellina
  // ---------------------------------------------------------
  var AREA = { lavoro: 'lavoro', persone: 'famiglia', salute: 'salute', banca: 'finanze', acquisti: 'personale', casa: 'casa', burocrazia: 'personale', studio: 'studio', sport: 'sport', viaggi: 'svago', account: 'personale', social: 'personale', promo: 'personale' };
  function areaDi(sid) {
    if (AREA[sid]) return AREA[sid];
    var n = N(sez(sid).nome || '');
    if (/auto|moto|mezz|veicol/.test(n)) return 'mezzi';
    if (/cane|gatto|animal|veterin/.test(n)) return 'animali';
    return 'altro';
  }
  function numImporto(t) { var n = parseFloat(String(t || '').replace(/[^\d,]/g, '').replace(',', '.')); return n > 0 ? n : ''; }
  function pontePubblica() {
    var lim = ymd(new Date(Date.now() - 30 * 864e5)), eventi = [], messaggi = [];
    D.scadenze.forEach(function (s) {
      if (!s.data || s.data < lim) return;
      var m = D.msg[s.msgId];
      if (m && m.demo) return;
      var imp = m && m.estratto && (m.estratto.importi || [])[0];
      var tipo = s.tipo === 'Appuntamento' ? 'appuntamento' : (imp && /banca|casa|burocrazia|acquisti/.test(s.sezione) ? 'pagamento' : 'scadenza');
      var origine = m ? (m.tipo === 'chat' ? 'Messaggio ' + fonte(m).nome + ' · ' + m.chat : 'Email di ' + Smista.nomeMittente(m.from) + (m.subject ? ' — ' + m.subject : '')) : '';
      eventi.push({ id: s.id, tipo: tipo, titolo: (s.tipo === 'Consegna' ? 'Consegna: ' : '') + s.titolo, data: s.data, ora: s.ora || '', note: [s.note, origine].filter(Boolean).join('\n'),
        area: areaDi(s.sezione), importo: tipo === 'pagamento' ? numImporto(imp) : '', fatto: !!s.fatto, fattoTs: s.fattoTs || 0 });
    });
    // a Cartellina: i messaggi della sezione Salute e quelli che le mandi tu
    var limM = Date.now() - 60 * 864e5;
    tutti().filter(function (m) { return !m.mio && !m.demo && (m.sezione === 'salute' || m.aCartellina) && new Date(m.date).getTime() >= limM; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 150).forEach(function (m) {
        var chat = m.tipo === 'chat';
        messaggi.push({ id: m.id, gid: m.gid || '', tipo: m.tipo, from: chat ? (m.da || m.chat) : m.from, subject: chat ? 'Messaggio ' + fonte(m).nome + ' da ' + m.chat : (m.subject || ''),
          body: String(m.body || '').slice(0, 3500), date: m.date, labels: m.labels || [], attachments: m.attachments || [], scelta: !!m.aCartellina });
      });
    return { eventi: eventi, messaggi: messaggi };
  }
  function ponteRicevi(da, dati) {
    var n = 0, parti = [];
    if (da === 'cartellina') {
      // i medici e gli ospedali di Cartellina finiscono sempre in Salute
      var sal = D.sezioni.filter(function (s) { return s.id === 'salute' && !s.off; })[0], nuovi = 0;
      if (sal) (dati.mittenti || []).forEach(function (a) {
        a = String(a || '').trim().toLowerCase();
        if (!a || D.regole.mittenti[a] || Ponte.ignorato('cartellina:mitt:' + a)) return;
        if (a.indexOf('@') < 0 && DOMINI_LIBERI.indexOf(a) >= 0) return;
        D.regole.mittenti[a] = 'salute'; D.ponteMitt[a] = 1; nuovi++;
      });
      if (nuovi) { var sp = riclassifica(true); n += nuovi; parti.push(nuovi + ' mittent' + (nuovi === 1 ? 'e' : 'i') + ' sanitar' + (nuovi === 1 ? 'io' : 'i') + (sp ? ', ' + sp + ' messaggi spostati' : '')); }
    }
    // stato "fatto" segnato nelle altre app (AgendApp)
    var f = dati.fatti || {}, fatti = 0;
    Object.keys(f).forEach(function (k) {
      if (k.indexOf('smistino:') !== 0) return;
      var s = D.scadenze.filter(function (x) { return x.id === k.slice(9); })[0], v = f[k];
      if (!s || !v || (v.ts || 0) <= (s.fattoTs || 0) || !!v.f === !!s.fatto) return;
      s.fatto = !!v.f; s.fattoTs = v.ts; fatti++;
    });
    if (fatti) { n += fatti; parti.push(fatti + ' scadenz' + (fatti === 1 ? 'a segnata' : 'e segnate') + ' come fatt' + (fatti === 1 ? 'a' : 'e')); }
    if (n) save();
    return { n: n, testo: parti.join(', ') };
  }
  function ponteScollega(da, prova) {
    if (da !== 'cartellina') return 0;
    var l = Object.keys(D.ponteMitt);
    if (!prova && l.length) { l.forEach(function (k) { if (D.regole.mittenti[k] === 'salute') delete D.regole.mittenti[k]; }); D.ponteMitt = {}; riclassifica(true); save(); }
    return l.length;
  }
  function avviaPonte() {
    if (!window.Ponte) return;
    Ponte.init({
      app: 'smistino', pubblica: pontePubblica, ricevi: ponteRicevi, scollega: ponteScollega, dopo: ridisegna, toast: toast,
      descr: {
        agendapp: 'Riceve le scadenze, i pagamenti e gli appuntamenti che trovo nei messaggi. Se li segni fatti lì, lo so anch\'io.',
        cartellina: 'Riceve le email e i messaggi della sezione Salute (e quelli che le mandi tu). Io imparo i suoi medici e ospedali.'
      }
    });
  }

  // ---------------------------------------------------------
  // Avvio
  // ---------------------------------------------------------
  var pollTimer = null;
  function avviaPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () { controllaTutti(false); }, Math.max(5, +D.imp.intervallo || 10) * 60000);
  }
  function ultimoControllo() { return Math.max.apply(null, [0].concat(D.account.map(function (a) { return a.ultimoControllo || 0; }))); }
  function gestisciParametri() {
    var p = new URLSearchParams(location.search);
    var testo = [p.get('title'), p.get('text'), p.get('url')].filter(Boolean).join('\n').trim();
    if (testo) setTimeout(function () { formIncolla({ testo: testo }); }, 300);
    if (p.get('vai')) location.hash = '#/' + p.get('vai');
    if (p.get('scadenza')) setTimeout(function () { ACT.apriScad({ dataset: { id: p.get('scadenza') } }); }, 300);
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.tipo === 'scadenza' && d.id) ACT.apriScad({ dataset: { id: d.id } });
      if (d.tipo === 'posta') location.hash = '#/posta';
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { controllaScadenze(new Date()); if (Date.now() - ultimoControllo() > 3 * 60000) controllaTutti(false); }
  });
  window.addEventListener('online', function () { controllaTutti(false); });
  // file condivisi o trascinati sulla pagina
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) importaFile(Array.prototype.slice.call(e.dataTransfer.files)); });

  leggi().then(function (d) {
    D = unisci(d);
    pulisci(false); save();
    gestisciParametri();
    route();
    avviaPonte();
    setInterval(function () { controllaScadenze(new Date()); }, 30000);
    setTimeout(function () { controllaScadenze(new Date()); }, 1500);
    avviaPolling();
    setTimeout(function () { controllaTutti(false); }, 2500);
  });
  window.Smistino = { get dati() { return D; }, aggiungi: aggiungi, normChat: normChat, normEmail: normEmail };
})();
