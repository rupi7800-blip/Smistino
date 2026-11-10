/* =========================================================
   Smistino — importazione di chat esportate e file email
   - WhatsApp: "Esporta chat" (.txt o .zip, Android e iPhone)
   - Telegram Desktop: "Esporta cronologia chat" in JSON (result.json)
   - Email salvate: file .eml
   - Testo libero incollato
   Tutto avviene sul telefono: i file non vengono inviati a nessuno.
   ========================================================= */
var Importa = (function () {
  'use strict';

  // ---------- ZIP (solo lettura, metodi "store" e "deflate") ----------
  function leggiZip(buf) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf), fine = -1;
    for (var i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { fine = i; break; } }
    if (fine < 0) return Promise.reject(new Error('Archivio zip non valido'));
    var n = dv.getUint16(fine + 10, true), p = dv.getUint32(fine + 16, true), voci = [];
    for (var k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var metodo = dv.getUint16(p + 10, true), comp = dv.getUint32(p + 20, true), lnome = dv.getUint16(p + 28, true),
        lextra = dv.getUint16(p + 30, true), lcomm = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      var nome = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + lnome));
      voci.push({ nome: nome, metodo: metodo, comp: comp, off: off });
      p += 46 + lnome + lextra + lcomm;
    }
    return Promise.resolve(voci.map(function (v) {
      v.leggi = function () {
        var h = v.off, inizio = h + 30 + dv.getUint16(h + 26, true) + dv.getUint16(h + 28, true);
        var dati = u8.slice(inizio, inizio + v.comp);
        if (v.metodo === 0) return Promise.resolve(new TextDecoder().decode(dati));
        if (v.metodo !== 8 || typeof DecompressionStream === 'undefined') return Promise.reject(new Error('Compressione non supportata da questo browser'));
        var s = new Blob([dati]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Response(s).text();
      };
      return v;
    }));
  }

  // ---------- WhatsApp ----------
  // Android: 10/11/26, 14:05 - Mario: testo     iPhone: [10/11/26, 14:05:33] Mario: testo
  var RE_WA = /^‎?\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:-|–)?\s*([^:]{1,60}?):\s([\s\S]*)$/;
  var RE_WA_SIS = /^‎?\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}[:.]\d{2}/;
  function whatsapp(testo, chatNome) {
    var righe = String(testo).replace(/\r/g, '').split('\n'), out = [], cur = null, persone = {};
    righe.forEach(function (r) {
      var m = r.match(RE_WA);
      if (m) {
        var a = +m[3]; if (a < 100) a += 2000;
        var h = +m[4]; if (m[7]) { var pm = /p/i.test(m[7]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
        // il formato può essere gg/mm o mm/gg: se il mese supera 12 è all'americana
        var g = +m[1], me = +m[2]; if (me > 12 && g <= 12) { var t = g; g = me; me = t; }
        var d = new Date(a, me - 1, g, h, +m[5], +(m[6] || 0));
        var testoMsg = m[9].replace(/‎/g, '');
        if (/^<(Media omessi|Media omitted|allegato:)|^(immagine|video|audio|sticker|GIF) omess[oa]$|‎?(image|video|audio|sticker) omitted$/i.test(testoMsg)) testoMsg = '[allegato]';
        cur = { da: m[8].replace(/‎/g, '').trim(), testo: testoMsg, date: d.toISOString() };
        persone[cur.da] = (persone[cur.da] || 0) + 1;
        out.push(cur);
      } else if (RE_WA_SIS.test(r)) {
        cur = null; // messaggio di sistema (crittografia, "ha aggiunto"…)
      } else if (cur && r.trim()) {
        cur.testo += '\n' + r;
      }
    });
    var nomi = Object.keys(persone);
    var chat = chatNome || (nomi.length <= 2 ? nomi.sort(function (x, y) { return persone[x] - persone[y]; })[0] : 'Gruppo WhatsApp');
    return out.filter(function (m) { return m.testo && m.testo !== '[allegato]' && !/^(questo messaggio è stato eliminato|this message was deleted|hai eliminato questo messaggio)$/i.test(m.testo.trim()); })
      .map(function (m) { return { canale: 'whatsapp', chat: chat, da: m.da, testo: m.testo, date: m.date }; });
  }
  function nomeChatDaFile(nome) {
    var n = String(nome || '').replace(/\.(txt|zip)$/i, '').replace(/^.*[\\/]/, '');
    var m = n.match(/(?:Chat WhatsApp con|WhatsApp Chat with|WhatsApp Chat -|Chat de WhatsApp con)\s+(.+)$/i);
    return m ? m[1].trim() : '';
  }

  // ---------- Telegram (JSON di Telegram Desktop) ----------
  function testoTg(t) {
    if (typeof t === 'string') return t;
    if (Array.isArray(t)) return t.map(function (x) { return typeof x === 'string' ? x : (x && x.text) || ''; }).join('');
    return '';
  }
  function telegram(json) {
    var chats = json.chats && json.chats.list ? json.chats.list : [json];
    var out = [];
    chats.forEach(function (c) {
      var chat = c.name || (c.type === 'saved_messages' ? 'Messaggi salvati' : 'Chat Telegram');
      (c.messages || []).forEach(function (m) {
        if (m.type !== 'message') return;
        var t = testoTg(m.text) || (m.photo ? '[foto]' : m.media_type ? '[' + m.media_type.replace(/_/g, ' ') + ']' : '');
        if (!t) return;
        out.push({ canale: 'telegram', chat: chat, da: m.from || m.forwarded_from || chat, testo: t, date: new Date(m.date).toISOString() });
      });
    });
    return out;
  }

  // ---------- email .eml ----------
  function decodificaParola(s) {
    return String(s || '').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (_, cs, enc, txt) {
      try {
        var bytes;
        if (/b/i.test(enc)) { var bin = atob(txt); bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
        else { var q = txt.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, function (x, h) { return String.fromCharCode(parseInt(h, 16)); }); bytes = new Uint8Array(q.length); for (var j = 0; j < q.length; j++) bytes[j] = q.charCodeAt(j); }
        return new TextDecoder(cs).decode(bytes);
      } catch (e) { return txt; }
    }).replace(/\?=\s+=\?/g, '');
  }
  function qp(s) { return s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, function (x, h) { return String.fromCharCode(parseInt(h, 16)); }); }
  function utf8(bin) { try { var b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i) & 255; return new TextDecoder('utf-8').decode(b); } catch (e) { return bin; } }
  function eml(testo) {
    var t = String(testo).replace(/\r/g, ''), sep = t.indexOf('\n\n');
    var head = t.slice(0, sep).replace(/\n[ \t]+/g, ' '), corpo = t.slice(sep + 2);
    var h = {};
    head.split('\n').forEach(function (r) { var i = r.indexOf(':'); if (i > 0) h[r.slice(0, i).toLowerCase()] = r.slice(i + 1).trim(); });
    // prende la prima parte text/plain (o text/html ripulita)
    var ct = h['content-type'] || '', bnd = (ct.match(/boundary="?([^";]+)"?/i) || [])[1];
    var parte = corpo, pct = ct, pte = h['content-transfer-encoding'] || '';
    if (bnd) {
      var parti = corpo.split('--' + bnd).slice(1);
      var pick = null;
      parti.forEach(function (p) {
        var s = p.indexOf('\n\n'); if (s < 0) return;
        var ph = p.slice(0, s).replace(/\n[ \t]+/g, ' ').toLowerCase();
        if (/content-type:\s*multipart/.test(ph)) { var nb = (p.slice(0, s).match(/boundary="?([^";\n]+)"?/i) || [])[1]; if (nb) { var sub = p.split('--' + nb).slice(1).filter(function (x) { return /text\/plain/i.test(x.slice(0, 300)); })[0]; if (sub && !pick) pick = sub; } return; }
        if (/text\/plain/.test(ph) && !pick) pick = p;
        else if (/text\/html/.test(ph) && !pick) pick = p;
      });
      if (pick) { var s2 = pick.indexOf('\n\n'); var phh = pick.slice(0, s2); parte = pick.slice(s2 + 2); pct = (phh.match(/content-type:\s*([^\n]+)/i) || [])[1] || ''; pte = (phh.match(/content-transfer-encoding:\s*([^\n]+)/i) || [])[1] || ''; }
    }
    pte = pte.toLowerCase().trim();
    if (pte === 'base64') { try { parte = utf8(atob(parte.replace(/\s/g, ''))); } catch (e) { /* lascia così */ } }
    else if (pte === 'quoted-printable') parte = utf8(qp(parte));
    if (/html/i.test(pct)) parte = parte.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    var d = h.date ? new Date(h.date) : new Date();
    return {
      from: decodificaParola(h.from), to: decodificaParola(h.to), subject: decodificaParola(h.subject),
      date: (isNaN(d) ? new Date() : d).toISOString(), body: parte.replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000),
      listUnsub: !!h['list-unsubscribe'], deliveredTo: h['delivered-to'] || ''
    };
  }

  /**
   * file: File del browser → Promise<{ tipo:'chat'|'email', messaggi:[...], nome }>
   */
  function daFile(file) {
    var nome = file.name || '';
    if (/\.zip$/i.test(nome) || file.type === 'application/zip') {
      return file.arrayBuffer().then(leggiZip).then(function (voci) {
        var txt = voci.filter(function (v) { return /\.txt$/i.test(v.nome) && !/__MACOSX/.test(v.nome); })[0];
        var js = voci.filter(function (v) { return /\.json$/i.test(v.nome); })[0];
        if (txt) return txt.leggi().then(function (t) { return { tipo: 'chat', messaggi: whatsapp(t, nomeChatDaFile(nome) || nomeChatDaFile(txt.nome)), nome: nome }; });
        if (js) return js.leggi().then(function (t) { return { tipo: 'chat', messaggi: telegram(JSON.parse(t)), nome: nome }; });
        var emls = voci.filter(function (v) { return /\.eml$/i.test(v.nome); });
        if (emls.length) return Promise.all(emls.slice(0, 300).map(function (v) { return v.leggi(); })).then(function (l) { return { tipo: 'email', messaggi: l.map(eml), nome: nome }; });
        throw new Error('Nello zip non c\'è una chat riconoscibile');
      });
    }
    return file.text().then(function (t) {
      if (/\.json$/i.test(nome) || /^\s*\{/.test(t)) return { tipo: 'chat', messaggi: telegram(JSON.parse(t)), nome: nome };
      if (/\.eml$/i.test(nome) || /^(received|return-path|from|delivered-to|mime-version|x-[\w-]+):/im.test(t.slice(0, 400))) return { tipo: 'email', messaggi: [eml(t)], nome: nome };
      var wa = whatsapp(t, nomeChatDaFile(nome));
      if (wa.length) return { tipo: 'chat', messaggi: wa, nome: nome };
      throw new Error('Formato non riconosciuto');
    });
  }

  return { daFile: daFile, whatsapp: whatsapp, telegram: telegram, eml: eml, leggiZip: leggiZip, nomeChatDaFile: nomeChatDaFile };
})();
if (typeof module !== 'undefined') module.exports = Importa;
