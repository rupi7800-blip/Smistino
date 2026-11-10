/* =========================================================
   SMISTINO — script "ponte" per Google
   Gira sul TUO account Google, nessun server esterno.
   Fa tre cose:
   1. legge le email di questo account Gmail e le passa all'app;
   2. riceve i messaggi di WhatsApp, Telegram, SMS e altre app
      (inoltrati dal telefono o dal tuo bot Telegram) e li tiene
      in un foglio Google finché l'app non li scarica;
   3. (facoltativo) mette su Gmail le etichette "Smistino/<sezione>".

   Hai più account Gmail? Crea uno script così per OGNI account
   (stessa procedura) e aggiungilo nell'app: non c'è limite.

   ISTRUZIONI
   1. Scrivi qui sotto una parola segreta (la stessa da mettere nell'app).
   2. Salva, scegli la funzione "installa" e premi Esegui (accetta i permessi).
   3. Esegui il deployment → Nuovo deployment → App web
      Esegui come: Me · Chi può accedere: Chiunque → copia l'URL /exec.
   ========================================================= */
const CODICE_SEGRETO = 'scrivi-qui-la-tua-parola-segreta';

const NOME_FOGLIO = 'Smistino – messaggi in arrivo';
const GIORNI_CONSERVAZIONE = 45;
const MAX_EMAIL = 300;

/** Da eseguire una volta: prepara il foglio e il controllo automatico ogni 5 minuti */
function installa() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ciclo').timeBased().everyMinutes(5).create();
  foglio_();
  GmailApp.getUserLabelByName('Smistino') || GmailApp.createLabel('Smistino');
  Logger.log('Smistino installato per ' + Session.getEffectiveUser().getEmail() + '. Ora fai il deployment come App web.');
}

/** Gira da solo ogni 5 minuti: scarica i messaggi del bot Telegram e fa pulizia */
function ciclo() {
  try { leggiTelegram_(); } catch (e) { Logger.log('Telegram: ' + e); }
  const p = PropertiesService.getScriptProperties();
  const oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  if (p.getProperty('pulizia') !== oggi) { pulisci_(); p.setProperty('pulizia', oggi); }
}

// ================= indirizzo web chiamato dall'app =================
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.token || p.token !== CODICE_SEGRETO) return json_({ error: 'token' });
  const props = PropertiesService.getScriptProperties();
  const azione = p.azione || 'leggi';

  if (azione === 'info') {
    return json_({ ok: true, account: Session.getEffectiveUser().getEmail(), telegram: props.getProperty('tgNome') || '', versione: 1 });
  }
  if (azione === 'telegram') return json_(impostaTelegram_(p.bot || ''));
  if (azione === 'invia') return json_(salvaMessaggio_(p));
  if (azione === 'etichetta') {
    const ids = String(p.ids || '').split(',').filter(Boolean).slice(0, 40);
    const nome = 'Smistino/' + String(p.sez || 'Altro').replace(/\//g, '-');
    const lab = GmailApp.getUserLabelByName(nome) || GmailApp.createLabel(nome);
    let fatte = 0;
    ids.forEach(id => {
      try {
        const t = GmailApp.getMessageById(id).getThread();
        t.getLabels().forEach(l => { if (l.getName().indexOf('Smistino/') === 0 && l.getName() !== nome) t.removeLabel(l); });
        t.addLabel(lab); fatte++;
      } catch (err) { /* email cancellata */ }
    });
    return json_({ ok: true, fatte: fatte });
  }

  // ---- leggi: email nuove + messaggi delle app ----
  try { leggiTelegram_(); } catch (err) { /* riprova al prossimo giro */ }
  const giorni = Math.max(1, Math.min(60, parseInt(p.giorni || '7', 10)));
  const dopo = parseInt(p.dopo || '0', 10) || 0;
  const daSec = Math.max(Math.floor(Date.now() / 1000) - giorni * 86400, Math.floor(dopo / 1000) - 900);
  const emails = [];
  if (p.email !== '0') {
    GmailApp.search('after:' + daSec + ' -in:spam -in:trash', 0, 150).forEach(t => {
      const labels = t.getLabels().map(l => l.getName());
      t.getMessages().forEach(m => {
        if (m.getDate().getTime() / 1000 < daSec || emails.length >= MAX_EMAIL) return;
        emails.push({
          id: m.getId(), threadId: t.getId(), from: m.getFrom(), to: m.getTo(), cc: m.getCc(),
          deliveredTo: header_(m, 'Delivered-To'), forwardedTo: header_(m, 'X-Forwarded-To'),
          listUnsub: !!header_(m, 'List-Unsubscribe'),
          subject: m.getSubject(), date: m.getDate().toISOString(),
          body: (m.getPlainBody() || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 5000),
          labels: labels, unread: m.isUnread(),
          attachments: m.getAttachments({ includeInlineImages: false }).map(a => a.getName()).slice(0, 8)
        });
      });
    });
  }
  return json_({ ok: true, account: Session.getEffectiveUser().getEmail(), emails: emails, messaggi: messaggiDopo_(dopo), ora: new Date().toISOString() });
}

/** Riceve i messaggi inoltrati dal telefono (MacroDroid, Tasker, Automate, IFTTT, Comandi rapidi…) */
function doPost(e) {
  let d = {};
  try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { d = {}; }
  const p = Object.assign({}, (e && e.parameter) || {}, d);
  if (!p.token || p.token !== CODICE_SEGRETO) return json_({ error: 'token' });
  if (!p.testo && !p.text && !p.messaggio && !p.body && !p.notification && e && e.postData && e.postData.type === 'text/plain' && !d.token) {
    p.testo = e.postData.contents; // corpo semplice: tutto il testo è il messaggio
  }
  return json_(salvaMessaggio_(p));
}

// ================= messaggi delle app =================
function salvaMessaggio_(p) {
  const pick = function () { for (let i = 0; i < arguments.length; i++) { const v = p[arguments[i]]; if (v != null && String(v).trim() !== '') return String(v).trim(); } return ''; };
  const app = pick('app', 'canale', 'applicazione', 'package', 'pacchetto') || 'Altro';
  let da = pick('da', 'from', 'mittente', 'titolo', 'title', 'sender');
  let chat = pick('chat', 'conversazione', 'gruppo', 'group');
  let testo = pick('testo', 'text', 'messaggio', 'message', 'body', 'notification', 'contenuto');
  if (!testo) return { ok: false, error: 'testo vuoto' };
  // notifiche di riepilogo di WhatsApp/Telegram: inutili
  if (/^\d+ (nuovi )?messaggi( da \d+ chat)?$/i.test(testo) || /^(messaggi da \d+ chat|checking for new messages|controllo nuovi messaggi in corso)/i.test(testo)) return { ok: true, ignorato: 'riepilogo' };
  // "Nome @ Gruppo" o "Gruppo: Nome" (formati delle notifiche WhatsApp)
  if (!chat && da) {
    let m = da.match(/^(.+?)\s@\s(.+)$/);
    if (m) { chat = m[2]; da = m[1]; }
    else if ((m = da.match(/^(.+?):\s(.+)$/))) { chat = m[1]; da = m[2]; }
    else chat = da;
  }
  da = da.replace(/\s\(\d+ messaggi?\)$/i, '');
  chat = chat.replace(/\s\(\d+ messaggi?\)$/i, '');
  // doppioni: stessa notifica entro 10 minuti
  const firma = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, app + '|' + chat + '|' + da + '|' + testo));
  const cache = CacheService.getScriptCache();
  if (cache.get(firma)) return { ok: true, ignorato: 'doppione' };
  cache.put(firma, '1', 600);
  const quando = pick('ora', 'date', 'data', 'time', 'timestamp');
  let ts = Date.now();
  if (quando) { const n = Number(quando); const dt = isNaN(n) ? new Date(quando) : new Date(n < 1e12 ? n * 1000 : n); if (!isNaN(dt.getTime())) ts = dt.getTime(); }
  const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  foglio_().appendRow([id, Date.now(), ts, app, da, chat, testo.slice(0, 4000), pick('numero', 'telefono', 'phone')]);
  return { ok: true, id: id };
}

function messaggiDopo_(dopo) {
  const sh = foglio_();
  const n = sh.getLastRow();
  if (n < 2) return [];
  const da = Math.max(2, n - 800);
  return sh.getRange(da, 1, n - da + 1, 8).getValues()
    .filter(r => r[0] && Number(r[1]) > dopo)
    .map(r => ({ id: String(r[0]), ricevuto: Number(r[1]), date: new Date(Number(r[2])).toISOString(), app: String(r[3]), da: String(r[4]), chat: String(r[5]), testo: String(r[6]), numero: String(r[7] || '') }));
}

// ================= bot Telegram =================
function impostaTelegram_(tok) {
  const props = PropertiesService.getScriptProperties();
  if (!tok) { ['tgBot', 'tgNome', 'tgOffset', 'tgChat'].forEach(k => props.deleteProperty(k)); return { ok: true, telegram: '' }; }
  const r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/getMe', { muteHttpExceptions: true }).getContentText());
  if (!r.ok) return { ok: false, error: 'token del bot non valido' };
  // niente webhook: lo script legge i messaggi ogni 5 minuti
  UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/deleteWebhook', { muteHttpExceptions: true });
  props.setProperty('tgBot', tok); props.setProperty('tgNome', r.result.username); props.deleteProperty('tgChat');
  return { ok: true, telegram: r.result.username };
}

function leggiTelegram_() {
  const props = PropertiesService.getScriptProperties();
  const tok = props.getProperty('tgBot');
  if (!tok) return;
  const off = props.getProperty('tgOffset') || '0';
  const r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/getUpdates?timeout=0&limit=100&offset=' + off, { muteHttpExceptions: true }).getContentText());
  if (!r.ok) return;
  let ultimo = Number(off);
  r.result.forEach(u => {
    ultimo = Math.max(ultimo, u.update_id + 1);
    const m = u.message || u.edited_message;
    if (!m) return;
    // il bot ascolta solo te: la prima persona che gli scrive diventa la proprietaria
    const padrone = props.getProperty('tgChat');
    if (!padrone) props.setProperty('tgChat', String(m.chat.id));
    else if (padrone !== String(m.chat.id)) return;
    if (m.text === '/start') { invia_(tok, m.chat.id, '👋 Ciao! Inoltrami i messaggi che vuoi smistare: li trovi nell\'app Smistino.'); return; }
    let testo = m.text || m.caption || (m.photo ? '[foto]' : m.voice ? '[messaggio vocale]' : m.video ? '[video]' : m.document ? '[file ' + (m.document.file_name || '') + ']' : m.sticker ? '[sticker]' : m.location ? '[posizione]' : m.contact ? '[contatto ' + m.contact.first_name + ' ' + (m.contact.phone_number || '') + ']' : '[messaggio]');
    let da = '', chat = '', quando = m.date;
    const o = m.forward_origin;
    if (o) {
      quando = o.date || quando;
      if (o.type === 'user') da = nome_(o.sender_user);
      else if (o.type === 'hidden_user') da = o.sender_user_name;
      else if (o.type === 'chat') { chat = o.sender_chat.title; da = o.author_signature || chat; }
      else if (o.type === 'channel') { chat = o.chat.title; da = o.author_signature || chat; }
    } else if (m.forward_from || m.forward_sender_name || m.forward_from_chat) {
      quando = m.forward_date || quando;
      da = m.forward_from ? nome_(m.forward_from) : m.forward_sender_name || (m.forward_from_chat && m.forward_from_chat.title) || '';
      if (m.forward_from_chat) chat = m.forward_from_chat.title;
    } else {
      // scritto o condiviso direttamente al bot: "#whatsapp Mario: testo" per indicare app e mittente
      let app = 'telegram';
      const tag = testo.match(/^#(\w+)\s+/);
      if (tag) { app = tag[1]; testo = testo.slice(tag[0].length); }
      const mm = testo.match(/^([^:\n]{2,40}):\s+([\s\S]+)$/);
      if (mm) { da = mm[1]; testo = mm[2]; } else da = 'Inviato al bot';
      salvaMessaggio_({ app: app, da: da, chat: da, testo: testo, ora: quando });
      return;
    }
    salvaMessaggio_({ app: 'telegram', da: da || 'Telegram', chat: chat || da, testo: testo, ora: quando });
  });
  props.setProperty('tgOffset', String(ultimo));
}
function nome_(u) { return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '' : ''; }
function invia_(tok, chat, testo) { UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/sendMessage', { method: 'post', payload: { chat_id: chat, text: testo }, muteHttpExceptions: true }); }

// ================= supporto =================
function foglio_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('foglio'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(NOME_FOGLIO);
    ss.getSheets()[0].appendRow(['id', 'ricevuto', 'data', 'app', 'da', 'chat', 'testo', 'numero']);
    ss.getSheets()[0].setFrozenRows(1);
    props.setProperty('foglio', ss.getId());
  }
  return ss.getSheets()[0];
}
function pulisci_() {
  const sh = foglio_(), n = sh.getLastRow();
  if (n < 3) return;
  const lim = Date.now() - GIORNI_CONSERVAZIONE * 86400000;
  const v = sh.getRange(2, 2, n - 1, 1).getValues();
  let vecchie = 0;
  while (vecchie < v.length && Number(v[vecchie][0]) < lim) vecchie++;
  if (vecchie) sh.deleteRows(2, vecchie);
}
function header_(m, nome) { try { return m.getHeader(nome) || ''; } catch (e) { return ''; } }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
