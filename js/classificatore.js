/* =========================================================
   Smistino — classificatore multi-sezione
   Codice puro (senza pagina): decide in quale sezione va ogni
   messaggio (email, WhatsApp, Telegram, SMS…) ed estrae date,
   scadenze, importi, codici e contatti.

   Fiducia:
   - ALTA  → smistato in automatico (regola tua, mittente imparato,
             segnali forti e nessun dubbio con un'altra sezione)
   - MEDIA → messo nella sezione più probabile ma con "Confermi?"
   - BASSA → resta in "Da smistare": decidi tu, e Smistino impara.
   ========================================================= */
var Smista = (function () {
  'use strict';

  // ---------- sezioni di partenza (tutte modificabili dall'app) ----------
  var SEZIONI_BASE = [
    { id: 'lavoro', nome: 'Lavoro', colore: '#4f5bd5', icona: 'lavoro',
      parole: ['riunione', 'meeting', 'call', 'progetto', 'cliente', 'clienti', 'preventivo', 'contratto', 'collega', 'colleghi', 'ufficio', 'turno', 'turni', 'ferie', 'permesso',
        'busta paga', 'cedolino', 'stipendio', 'colloquio di lavoro', 'candidatura', 'curriculum', 'offerta di lavoro', 'scadenza progetto', 'report', 'presentazione', 'verbale riunione',
        'ordine del giorno', 'fornitore', 'fornitori', 'consegna lavori', 'cantiere', 'partita iva', 'fattura n', 'nota spese', 'trasferta', 'smart working', 'agenda di lavoro'],
      domini: [] },
    { id: 'persone', nome: 'Famiglia e amici', colore: '#ec4899', icona: 'persone', chat: true,
      parole: ['mamma', 'papà', 'papa', 'nonna', 'nonno', 'zia', 'zio', 'cugino', 'cugina', 'fratello', 'sorella', 'figlio', 'figlia', 'amore', 'tesoro', 'ti voglio bene', 'baci',
        'compleanno', 'auguri', 'buon compleanno', 'cena', 'pranzo', 'aperitivo', 'stasera', 'ci vediamo', 'ci sentiamo', 'come stai', 'weekend', 'festa', 'matrimonio', 'battesimo',
        'comunione', 'pizza', 'grigliata', 'vacanze insieme', 'foto', 'ahah', 'ahahah', 'haha'],
      domini: [] },
    { id: 'salute', nome: 'Salute', colore: '#14b8a6', icona: 'salute',
      parole: ['prenotazione visita', 'visita specialistica', 'visita', 'referto', 'referti', 'impegnativa', 'ricetta medica', 'ricetta elettronica', 'ricovero', 'prericovero', 'day hospital',
        'intervento chirurgico', 'ambulatorio', 'esami del sangue', 'analisi del sangue', 'prelievo', 'ecografia', 'risonanza', 'tac', 'radiografia', 'mammografia', 'colonscopia', 'gastroscopia',
        'elettrocardiogramma', 'ecg', 'holter', 'fisioterapia', 'terapia', 'farmaco', 'farmaci', 'piano terapeutico', 'esenzione', 'ticket sanitario', 'fascicolo sanitario', 'cup',
        'certificato medico', 'certificato di malattia', 'medico di base', 'medico curante', 'pediatra', 'dentista', 'specialista', 'pronto soccorso', 'dimissione', 'paziente', 'farmacia'],
      domini: ['asl', 'ausl', 'usl', 'ats-', 'asst-', 'aulss', 'aou', 'azienda-ospedaliera', 'ospedal', 'policlinic', 'irccs', 'clinica', 'casadicura', 'poliambulator', 'sanita', 'fse',
        'fascicolosanitario', 'recup', 'prenotasalute', 'laborator', 'diagnostic', 'radiolog', 'centromedico', 'humanitas', 'auxologico', 'multimedica', 'synlab', 'cerba', 'lifebrain',
        'grupposandonato', 'gemelli', 'niguarda', 'maugeri', 'bambinogesu', 'miodottore', 'doctolib', 'paginemediche', 'ricettaelettronica'] },
    { id: 'banca', nome: 'Banca e pagamenti', colore: '#0ea5e9', icona: 'banca',
      parole: ['bonifico', 'addebito', 'accredito', 'estratto conto', 'saldo', 'movimento', 'movimenti', 'carta di credito', 'carta di debito', 'pagamento ricevuto', 'pagamento effettuato',
        'hai ricevuto', 'hai inviato', 'transazione', 'operazione', 'mutuo', 'prestito', 'rata', 'finanziamento', 'iban', 'conto corrente', 'home banking', 'internet banking',
        'disposizione', 'ricarica', 'prelievo bancomat', 'pos', 'investimenti', 'dossier titoli', 'rendiconto', 'documento di sintesi'],
      domini: ['intesasanpaolo', 'isybank', 'unicredit', 'bancobpm', 'bpm.it', 'fineco', 'ing.it', 'bper', 'mps.it', 'credem', 'bnl.it', 'credit-agricole', 'credem', 'mediolanum', 'widiba',
        'hype.it', 'revolut', 'n26', 'paypal', 'satispay', 'nexi', 'americanexpress', 'aexp', 'illimity', 'buddybank', 'bancaditalia', 'postepay', 'bancoposta', 'chebanca', 'webank',
        'bancasella', 'sella.it', 'deutsche-bank', 'findomestic', 'agos', 'compass', 'scalapay', 'klarna', 'wise.com', 'tinaba', 'bancaetica', 'bcc', 'creval', 'popso'] },
    { id: 'acquisti', nome: 'Acquisti e spedizioni', colore: '#f59e0b', icona: 'acquisti',
      parole: ['ordine', 'il tuo ordine', 'ordine n', 'conferma d\'ordine', 'spedizione', 'spedito', 'spedita', 'in consegna', 'consegnato', 'consegna prevista', 'corriere', 'tracking',
        'tracciamento', 'pacco', 'ritiro', 'locker', 'punto di ritiro', 'reso', 'rimborso', 'ricevuta d\'acquisto', 'acquisto', 'fattura d\'acquisto', 'articolo', 'carrello'],
      domini: ['amazon', 'ebay', 'zalando', 'aliexpress', 'temu', 'shein', 'brt.it', 'gls-', 'gls.', 'dhl', 'ups.com', 'sda.it', 'inpost', 'fedex', 'tnt', 'vinted', 'subito.it', 'mediaworld',
        'unieuro', 'euronics', 'decathlon', 'ikea', 'leroymerlin', 'zara', 'hm.com', 'esselunga', 'carrefour', 'coop', 'glovo', 'deliveroo', 'justeat', 'etsy', 'wish', 'idealo', 'eprice',
        'yoox', 'privalia', 'veepee', 'manomano', 'bricoman', 'brico', 'apple.com/it/shop', 'nespresso'] },
    { id: 'casa', nome: 'Casa e bollette', colore: '#84cc16', icona: 'casa',
      parole: ['bolletta', 'bollette', 'fattura luce', 'fattura gas', 'luce', 'gas', 'energia', 'fornitura', 'acqua', 'rifiuti', 'tari', 'condominio', 'amministratore', 'affitto', 'canone',
        'fibra', 'internet', 'modem', 'linea', 'contatore', 'autolettura', 'lettura', 'pod', 'pdr', 'rid', 'domiciliazione', 'scadenza pagamento', 'importo da pagare', 'assicurazione casa',
        'caldaia', 'manutenzione', 'idraulico', 'elettricista', 'trasloco', 'canone rai'],
      domini: ['enel', 'eni.com', 'plenitude', 'a2a', 'edison', 'hera', 'iren', 'acea', 'sorgenia', 'iberdrola', 'engie', 'illumia', 'octopus', 'pulsee', 'nen.it', 'tim.it', 'telecomitalia',
        'vodafone', 'windtre', 'iliad', 'fastweb', 'ho-mobile', 'verymobile', 'kena', 'sky.it', 'tiscali', 'eolo', 'linkem', 'verisure', 'acquedotto', 'brianzacque', 'mmspa',
        'capholding', 'gruppocap', 'amsa', 'econord'] },
    { id: 'burocrazia', nome: 'Enti e burocrazia', colore: '#64748b', icona: 'burocrazia',
      parole: ['comune di', 'agenzia delle entrate', 'inps', 'inail', 'f24', '730', 'isee', 'spid', 'cie', 'carta d\'identità', 'passaporto', 'multa', 'verbale', 'contravvenzione',
        'bollo auto', 'aci', 'motorizzazione', 'revisione', 'patente', 'raccomandata', 'notifica atto', 'pec', 'posta certificata', 'tribunale', 'avvocato', 'notaio', 'commercialista',
        'dichiarazione dei redditi', 'cartella esattoriale', 'agenzia riscossione', 'pagopa', 'avviso di pagamento', 'iuv', 'anagrafe', 'certificato di residenza', 'protocollo', 'pratica'],
      domini: ['inps.it', 'inail.it', 'agenziaentrate', 'agenziariscossione', 'gov.it', 'comune.', 'regione.', 'provincia.', 'pec.', 'legalmail', 'postacert', 'aci.it',
        'ilportaledellautomobilista', 'mit.gov', 'pagopa', 'io.italia', 'cittadinanzattiva', 'giustizia.it', 'notariato', 'fatturapa', 'spid', 'poste.it', 'posteitaliane'] },
    { id: 'studio', nome: 'Studio e scuola', colore: '#8b5cf6', icona: 'studio',
      parole: ['università', 'universita', 'ateneo', 'appello', 'appello d\'esame', 'sessione d\'esame', 'esame di', 'prenotazione esame', 'lezione', 'lezioni', 'docente', 'professore',
        'professoressa', 'corso di laurea', 'cfu', 'piano di studi', 'iscrizione', 'immatricolazione', 'tasse universitarie', 'tesi', 'laurea', 'segreteria studenti', 'libretto',
        'compiti', 'compito in classe', 'interrogazione', 'registro elettronico', 'colloqui', 'pagella', 'scuola', 'maestra', 'webinar didattico', 'piattaforma e-learning', 'moodle'],
      domini: ['unisr', 'unisanraffaele', 'uniroma5', '.edu', 'unimi', 'polimi', 'unipv', 'uninsubria', 'unicatt', 'bocconi', 'unibo', 'unito', 'unipd', 'uniecampus', 'unipegaso',
        'unimercatorum', 'uninettuno', 'unifortunato', 'spaggiari', 'classeviva', 'argosoft', 'portaleargo', 'nuvola', 'axioscloud', 'istruzione.it', 'moodle'] },
    { id: 'sport', nome: 'Sport e club', colore: '#ef4444', icona: 'sport',
      parole: ['allenamento', 'allenamenti', 'gara', 'gare', 'regata', 'partita', 'torneo', 'campionato', 'convocazione', 'convocati', 'tesseramento', 'tessera', 'quota sociale',
        'iscrizione gara', 'certificato medico sportivo', 'palestra', 'squadra', 'atleti', 'società sportiva', 'asd', 'club', 'sci club', 'skipass', 'maestro di sci', 'uscita in barca',
        'canottaggio', 'trasferta gara', 'risultati gara', 'classifica', 'training lab', 'circuito', 'workout'],
      domini: ['fisi', 'federcanottaggio', 'canottaggio.org', 'coni.it', 'fidal', 'figc', 'federciclismo', 'strava', 'garmin', 'polar', 'suunto', 'virginactive', 'mcfit', 'technogym',
        'skipass', 'sciclub', 'sportclub', 'endu.net', 'wedosport'] },
    { id: 'viaggi', nome: 'Viaggi', colore: '#06b6d4', icona: 'viaggi',
      parole: ['volo', 'prenotazione hotel', 'conferma prenotazione', 'check-in', 'check in', 'carta d\'imbarco', 'biglietto', 'biglietti', 'treno', 'binario', 'itinerario', 'noleggio auto',
        'traghetto', 'soggiorno', 'struttura ricettiva', 'b&b', 'hotel', 'partenza', 'arrivo', 'gate', 'bagaglio', 'pnr', 'codice di prenotazione'],
      domini: ['booking', 'airbnb', 'ryanair', 'easyjet', 'wizzair', 'ita-airways', 'vueling', 'lufthansa', 'trenitalia', 'italotreno', 'expedia', 'edreams', 'trainline', 'flixbus',
        'volagratis', 'lastminute', 'skyscanner', 'hotels.com', 'trivago', 'tripadvisor', 'moby', 'tirrenia', 'gnv', 'rentalcars', 'hertz', 'europcar', 'sixt', 'autostrade', 'trenord'] },
    { id: 'account', nome: 'Account e sicurezza', colore: '#0f766e', icona: 'account',
      parole: ['codice di verifica', 'codice di sicurezza', 'codice otp', 'otp', 'verifica il tuo', 'verifica la tua', 'conferma il tuo indirizzo', 'nuovo accesso', 'accesso da un nuovo',
        'nuovo dispositivo', 'reimposta la password', 'reimpostazione password', 'cambio password', 'password', 'autenticazione a due fattori', 'avviso di sicurezza', 'attività sospetta',
        'il tuo account', 'non condividerlo', 'codice di accesso', 'per accedere', 'abbonamento rinnovato', 'rinnovo abbonamento', 'il tuo abbonamento'],
      domini: ['accounts.google', 'google.com', 'apple.com', 'id.apple', 'microsoft', 'live.com', 'github', 'dropbox', 'icloud', 'adobe', 'netflix', 'spotify', 'disneyplus', 'primevideo',
        'dazn', 'nowtv', 'openai', 'anthropic', 'canva', 'notion', 'zoom.us'] },
    { id: 'social', nome: 'Social e notifiche', colore: '#a855f7', icona: 'social',
      parole: ['ti ha menzionato', 'ha commentato', 'ha messo mi piace', 'nuovo follower', 'ha iniziato a seguirti', 'richiesta di amicizia', 'ti ha taggato', 'nuovi post', 'ha condiviso',
        'hai nuove notifiche', 'nuova connessione', 'visualizzato il tuo profilo', 'live ora'],
      domini: ['facebook', 'facebookmail', 'instagram', 'linkedin', 'tiktok', 'twitter', 'x.com', 'youtube', 'pinterest', 'reddit', 'tumblr', 'threads', 'snapchat', 'twitch', 'discord',
        'quora', 'medium.com', 'substack', 'telegram.org', 'whatsapp.com'] },
    { id: 'promo', nome: 'Promozioni e newsletter', colore: '#94a3b8', icona: 'promo', silenziosa: true,
      parole: ['newsletter', 'disiscriviti', 'annulla iscrizione', 'cancella iscrizione', 'unsubscribe', 'offerta', 'offerte', 'sconto', 'sconti', 'promo', 'promozione', 'coupon', 'saldi',
        'black friday', 'cyber monday', 'acquista ora', 'compra ora', 'spedizione gratuita', 'novità per te', 'solo per oggi', 'ultimi giorni', 'codice sconto', 'raccolta punti', 'vinci',
        'concorso', 'lotteria', 'webinar gratuito', 'non perdere', 'esclusiva', '-50%', '-30%', '-20%'],
      domini: ['newsletter', 'news.', 'mailing', 'mailchimp', 'sendinblue', 'brevo', 'mailup', 'groupon', 'marketing', 'promo.', 'offerte.', 'info.'] }
  ];

  var STOP = ' il lo la i gli le un uno una di da in con su per tra fra a e o ma se che chi non più piu del della dello dei degli delle al allo alla ai agli alle dal dalla dai dalle nel nella nei nelle sul sulla sui sulle ' +
    'questo questa questi queste quello quella sono sei siamo siete hanno abbiamo avete essere avere fare come dove quando anche ancora molto poco tutto tutti tutta tutte ' +
    'ciao salve gentile gentili buongiorno buonasera grazie saluti cordiali distinti egregio spett spettabile cliente oggetto email mail messaggio http https www com net ' +
    'your the and for you this that with from have will are was not our more info here click qui link ';

  // ---------- utilità ----------
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i').replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u');
  }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var cacheRe = {};
  function contiene(testo, parola) {
    var w = norm(parola).trim();
    if (!w) return false;
    // parola intera per le parole corte (tac, ecg, cup, pos, otp…) e per quelle che finiscono con lettera
    if (w.length <= 5) {
      var re = cacheRe[w] || (cacheRe[w] = new RegExp('(^|[^a-z0-9])' + reEsc(w) + '([^a-z0-9]|$)'));
      return re.test(testo);
    }
    return testo.indexOf(w) !== -1;
  }
  function indirizzo(from) {
    var m = String(from || '').match(/<([^>]+)>/);
    return norm(m ? m[1] : from).trim();
  }
  function dominio(addr) { var i = addr.indexOf('@'); return i >= 0 ? addr.slice(i + 1) : ''; }
  function nomeMittente(from) {
    var s = String(from || '').replace(/<[^>]+>/, '').replace(/"/g, '').trim();
    return s || indirizzo(from);
  }
  function chiaveChat(msg) { return norm((msg.canale || 'chat') + '|' + (msg.chat || msg.from || '')).trim(); }
  function parole(testo) {
    return norm(testo).replace(/[^a-z0-9àèéìòù'\s]/g, ' ').split(/\s+/).filter(function (w) {
      return w.length >= 4 && w.length <= 24 && !/^\d+$/.test(w) && STOP.indexOf(' ' + w + ' ') === -1;
    });
  }

  /**
   * msg: { tipo:'email'|'chat', canale, from, to, subject, body, chat, labels:[], listUnsub:bool, attachments:[] }
   * cfg: { sezioni:[...], regole:{ mittenti:{indirizzo|dominio: idSezione}, chat:{chiave: idSezione}, parole:{idSezione:{parola:n}} } }
   * ritorna { sezione, fiducia:'alta'|'media'|'bassa', motivi:[], classifica:[{id,p}] }
   */
  function classifica(msg, cfg) {
    cfg = cfg || {};
    var sezioni = (cfg.sezioni || SEZIONI_BASE).filter(function (s) { return !s.off; });
    var regole = cfg.regole || {};
    var esiste = function (id) { return sezioni.some(function (s) { return s.id === id; }); };
    var chat = msg.tipo === 'chat';
    var addr = chat ? '' : indirizzo(msg.from);
    var dom = dominio(addr);

    // 1) decisioni certe: regole tue
    if (chat) {
      var k = chiaveChat(msg), rc = (regole.chat || {})[k];
      if (rc && esiste(rc)) return { sezione: rc, fiducia: 'alta', motivi: ['Chat che hai assegnato tu'], classifica: [] };
    } else {
      var rm = regole.mittenti || {};
      var hit = rm[addr] ? addr : (dom && rm[dom] ? dom : Object.keys(rm).filter(function (r) { return r.indexOf('@') < 0 && dom && dom.slice(-r.length - 1) === '.' + r; })[0]);
      if (hit && esiste(rm[hit])) return { sezione: rm[hit], fiducia: 'alta', motivi: [hit === addr ? 'Mittente che hai assegnato tu' : 'Dominio che hai assegnato tu (' + hit + ')'], classifica: [] };
      // etichetta Gmail "Smistino/<Sezione>" messa da te a mano
      var lab = (msg.labels || []).map(norm).filter(function (l) { return l.indexOf('smistino/') === 0; })[0];
      if (lab) {
        var sl = sezioni.filter(function (s) { return 'smistino/' + norm(s.nome) === lab; })[0];
        if (sl) return { sezione: sl.id, fiducia: 'alta', motivi: ['Etichetta Gmail "' + sl.nome + '"'], classifica: [] };
      }
    }

    // 2) punteggio per ogni sezione
    var subj = norm(msg.subject || '');
    var body = norm(String(msg.body || '').slice(0, 8000));
    var mittTesto = norm(msg.from || '') + ' ' + norm(msg.chat || '');
    var tok = parole((msg.subject || '') + ' ' + String(msg.body || '').slice(0, 600));
    var appreso = regole.parole || {};
    var totTok = {};
    Object.keys(appreso).forEach(function (sid) { Object.keys(appreso[sid]).forEach(function (w) { totTok[w] = (totTok[w] || 0) + appreso[sid][w]; }); });

    var punti = sezioni.map(function (s) {
      var p = 0, mot = [], forte = false;
      var dm = (s.domini || []).filter(function (d) { d = norm(d); return d && (addr.indexOf(d) !== -1 || (chat && d.length >= 5 && mittTesto.indexOf(d) !== -1)); });
      if (dm.length) { p += 7; forte = true; mot.push('Mittente tipico (' + (dom || dm[0]) + ')'); }
      var inSubj = [], inBody = [];
      // nelle chat non c'è oggetto: il testo (breve) vale come un oggetto
      (s.parole || []).forEach(function (w) {
        if (subj && contiene(subj, w)) inSubj.push(w);
        else if (contiene(body, w)) (chat ? inSubj : inBody).push(w);
      });
      if (inSubj.length) { p += Math.min(inSubj.length * 4, 12); forte = true; mot.push((chat ? 'Parole: ' : 'Oggetto: ') + inSubj.slice(0, 3).join(', ')); }
      if (inBody.length) { p += Math.min(inBody.length * 1.5, 6); mot.push('Testo: ' + inBody.slice(0, 4).join(', ')); }
      // parole imparate dalle tue scelte
      var ap = appreso[s.id];
      if (ap) {
        var a = 0, vis = {};
        tok.forEach(function (w) { if (vis[w]) return; vis[w] = 1; var n = ap[w] || 0; if (n >= 2 && totTok[w]) a += 1.6 * (n / totTok[w]); });
        a = Math.min(a, 6);
        if (a >= 1) { p += a; mot.push('Simile a messaggi che hai messo qui'); if (a >= 3) forte = true; }
      }
      if ((s.canali || []).indexOf(msg.canale) >= 0) { p += 2; mot.push('Canale ' + msg.canale); }
      if (s.id === 'promo' && msg.listUnsub) { p += 5; forte = true; mot.push('Email di massa (link per disiscriversi)'); }
      return { id: s.id, p: Math.round(p * 10) / 10, mot: mot, forte: forte };
    });

    // le email di massa difficilmente sono personali
    if (msg.listUnsub) punti.forEach(function (x) { if (x.id === 'persone' || x.id === 'lavoro') x.p -= 3; });
    punti.sort(function (a, b) { return b.p - a.p; });
    var top = punti[0] || { p: 0 }, sec = punti[1] || { p: 0 };
    var out = { classifica: punti.slice(0, 4).map(function (x) { return { id: x.id, p: x.p }; }) };

    if (top.p >= 9 && top.forte && top.p - sec.p >= 4) { out.sezione = top.id; out.fiducia = 'alta'; out.motivi = top.mot; }
    else if (top.p >= 4) { out.sezione = top.id; out.fiducia = 'media'; out.motivi = top.mot.concat(sec.p >= 4 ? ['Potrebbe essere anche: ' + nomeSez(sezioni, sec.id)] : []); }
    else {
      // un messaggio di chat senza segnali di solito è personale
      var def = sezioni.filter(function (s) { return s.chat; })[0];
      if (chat && def) { out.sezione = def.id; out.fiducia = 'media'; out.motivi = ['Chat senza segnali particolari']; }
      else { out.sezione = 'smistare'; out.fiducia = 'bassa'; out.motivi = top.p > 0 ? top.mot : ['Nessun segnale chiaro']; }
    }
    return out;
  }
  function nomeSez(sezioni, id) { var s = sezioni.filter(function (x) { return x.id === id; })[0]; return s ? s.nome : id; }

  /** quando confermi o sposti: impara le parole del messaggio per quella sezione */
  function impara(msg, idSezione, regole) {
    regole.parole = regole.parole || {};
    var t = regole.parole[idSezione] = regole.parole[idSezione] || {};
    var vis = {};
    parole((msg.subject || '') + ' ' + String(msg.body || '').slice(0, 600)).forEach(function (w) {
      if (vis[w]) return; vis[w] = 1; t[w] = Math.min((t[w] || 0) + 1, 50);
    });
    // tiene il dizionario leggero
    var k = Object.keys(t);
    if (k.length > 400) k.sort(function (a, b) { return t[a] - t[b]; }).slice(0, k.length - 400).forEach(function (w) { delete t[w]; });
  }
  function disimpara(msg, idSezione, regole) {
    var t = regole.parole && regole.parole[idSezione];
    if (!t) return;
    parole((msg.subject || '') + ' ' + String(msg.body || '').slice(0, 600)).forEach(function (w) { if (t[w]) { t[w]--; if (t[w] <= 0) delete t[w]; } });
  }

  // ---------- estrazione dati ----------
  var MESI = { gennaio: 1, gen: 1, febbraio: 2, feb: 2, marzo: 3, mar: 3, aprile: 4, apr: 4, maggio: 5, mag: 5, giugno: 6, giu: 6,
    luglio: 7, lug: 7, agosto: 8, ago: 8, settembre: 9, set: 9, sett: 9, ottobre: 10, ott: 10, novembre: 11, nov: 11, dicembre: 12, dic: 12 };
  var GIORNI = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function estraiDate(testo, rif) {
    rif = rif ? new Date(rif) : new Date();
    var out = [], t = String(testo || ''), m;
    var re1 = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g;
    while ((m = re1.exec(t))) { var y = +m[3]; if (y < 100) y += 2000; out.push({ g: +m[1], m: +m[2], a: y, pos: m.index, len: m[0].length }); }
    var re2 = /\b(\d{1,2})\s*(?:°\s*)?(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|gen|feb|mar|apr|mag|giu|lug|ago|sett?|ott|nov|dic)\.?(?:\s+(\d{4}))?\b/gi;
    while ((m = re2.exec(t))) {
      var mese = MESI[m[2].toLowerCase()], anno = m[3] ? +m[3] : rif.getFullYear();
      if (!m[3] && new Date(anno, mese - 1, +m[1]) < new Date(rif.getFullYear(), rif.getMonth(), rif.getDate())) anno++;
      out.push({ g: +m[1], m: mese, a: anno, pos: m.index, len: m[0].length });
    }
    // relative: oggi / stasera / domani / dopodomani / lunedì… (tipiche delle chat)
    var tn = norm(t);
    var re3 = /\b(oggi|stasera|stamattina|domani|dopodomani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\b(?:\s+(?:sera|mattina|pomeriggio|prossimo|prossima))?/g;
    while ((m = re3.exec(tn))) {
      var w = m[1], d = new Date(rif.getFullYear(), rif.getMonth(), rif.getDate());
      if (w === 'domani') d.setDate(d.getDate() + 1);
      else if (w === 'dopodomani') d.setDate(d.getDate() + 2);
      else if (GIORNI[w] != null) { var diff = (GIORNI[w] - d.getDay() + 7) % 7; d.setDate(d.getDate() + (diff || 7)); }
      // le relative valgono solo se c'è un orario vicino (altrimenti è chiacchiera)
      var vicino = tn.slice(m.index, m.index + 40);
      if (!/\b(alle|ore|h\.?)\s*\d{1,2}([:.]\d{2})?\b|\b\d{1,2}[:.]\d{2}\b/.test(vicino) && w !== 'stasera') continue;
      out.push({ g: d.getDate(), m: d.getMonth() + 1, a: d.getFullYear(), pos: m.index, len: m[0].length, rel: true });
    }
    return out.filter(function (d) { return d.g >= 1 && d.g <= 31 && d.m >= 1 && d.m <= 12 && d.a >= 2000 && d.a <= 2100; })
      .sort(function (a, b) { return a.pos - b.pos; });
  }
  function orarioVicino(testo, pos) {
    var f = testo.slice(pos, pos + 70);
    var m = f.match(/\b(?:ore|alle|alle ore|h\.?|dalle)\s*(\d{1,2})(?:[:.](\d{2}))?\b/i) || f.match(/\b(\d{1,2})[:.](\d{2})\b(?![\/.\-]\d)/);
    if (!m) { var pr = testo.slice(Math.max(0, pos - 40), pos); m = pr.match(/\b(?:ore|alle|h\.?)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:del|di|il)?\s*$/i); }
    if (!m) return '';
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (h > 23 || mi > 59) return '';
    return pad(h) + ':' + pad(mi);
  }
  function tipoData(prima, dopo) {
    var p = norm(prima), x = norm(prima + ' ' + dopo);
    if (/(scadenz|scade|entro (il|e non oltre)?|da pagare|termine ultimo|pagare entro|data limite|rinnov)/.test(p)) return 'Scadenza';
    if (/(consegn|arriv|in transito|ritir)/.test(p)) return 'Consegna';
    if (/(appuntament|visita|riunion|incontro|meeting|call|colloqui|lezion|allenament|gara|regata|partit|cena|pranzo|festa|evento|check.?in|partenza|volo|treno|esame|appello|prenotat|ci vediamo|ritrovo|convoca)/.test(x)) return 'Appuntamento';
    return 'Data';
  }
  function telefoni(testo) {
    var out = [], m, re = /(?:\+39[\s.]?)?\b(0\d{1,4}[\s./-]?\d{3,4}[\s./-]?\d{2,5}|3\d{2}[\s./-]?\d{3}[\s./-]?\d{3,4}|800[\s.]?\d{3}[\s.]?\d{3})\b/g;
    while ((m = re.exec(testo))) {
      var n = m[0].replace(/[^\d+]/g, ''), dg = n.replace(/^\+39/, '');
      if (dg.length >= 6 && dg.length <= 11 && out.indexOf(n) === -1) out.push(n);
    }
    return out.slice(0, 5);
  }
  function importi(testo) {
    var out = [], m, re = /(?:€|eur\b|euro\b)\s?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)|(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s?(?:€|eur\b|euro\b)/gi;
    while ((m = re.exec(testo))) {
      var v = (m[1] || m[2]).replace(/\s/g, ''), f = v.indexOf(',') >= 0 ? v.replace(/\./g, '').replace(',', '.') : v;
      var n = parseFloat(f);
      if (n > 0 && n < 10000000) { var s = '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); if (out.indexOf(s) < 0) out.push(s); }
    }
    return out.slice(0, 4);
  }
  function codici(testo) {
    var out = [], m;
    var add = function (tipo, v) { if (v && !out.some(function (c) { return c.valore === v; })) out.push({ tipo: tipo, valore: v }); };
    if ((m = testo.match(/\b(?:codice(?: di)?(?: verifica| sicurezza| accesso)?|otp|pin|code)\b[^\d\n]{0,25}\b(\d{4,8})\b/i))) add('Codice di verifica', m[1]);
    if ((m = testo.match(/\b(?:tracking|tracciamento|numero di spedizione|n\.? spedizione|lettera di vettura|ldv)\b[^A-Za-z0-9\n]{0,20}([A-Z0-9]{8,30})\b/i))) add('Spedizione', m[1]);
    if ((m = testo.match(/\b(?:codice|numero|n\.|nr\.?)\s*(?:di\s*|del(?:l')?\s*)?(prenotazione|ordine|pratica|protocollo|cliente|contratto|fattura)\s*[:n°.#\s]*([A-Z0-9][A-Z0-9\-\/]{3,})/i))) add(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(), m[2]);
    if ((m = testo.match(/\bcodice avviso[^\d]{0,12}(\d{18})\b/i))) add('Avviso pagoPA', m[1]);
    if ((m = testo.match(/\bPNR\b[^A-Z0-9]{0,8}([A-Z0-9]{6})\b/))) add('PNR', m[1]);
    return out.slice(0, 4);
  }
  function links(testo) {
    var out = [], m, re = /https?:\/\/[^\s<>"')\]]+/g;
    while ((m = re.exec(testo))) {
      var u = m[0].replace(/[.,;:]+$/, '');
      if (/unsubscribe|disiscriv|optout|pixel|track\.|\/open\?|utm_/i.test(u)) continue;
      if (out.indexOf(u) < 0) out.push(u);
    }
    return out.slice(0, 5);
  }
  function emails(testo) {
    var out = [], m, re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    while ((m = re.exec(testo))) { var e = m[0].toLowerCase(); if (out.indexOf(e) < 0 && !/noreply|no-reply|donotreply/.test(e)) out.push(e); }
    return out.slice(0, 4);
  }

  /** estrae date future, importi, codici e contatti */
  function estrai(msg, oggi) {
    var testo = (msg.subject ? msg.subject + '\n' : '') + String(msg.body || '');
    var rif = msg.date ? new Date(msg.date) : new Date();
    oggi = oggi ? new Date(oggi) : new Date();
    var inizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    var eventi = [], visti = {};
    var tn = norm(testo);
    estraiDate(testo, rif).forEach(function (d) {
      var data = new Date(d.a, d.m - 1, d.g);
      if (data < inizioOggi) return;
      var src = d.rel ? tn : testo;
      var prima = src.slice(Math.max(0, d.pos - 90), d.pos), dopo = src.slice(d.pos, d.pos + 90);
      if (/(emess|emission|nat[oa] il|nascita|inviat|stampat|del giorno|in data)\s*$/i.test(prima.slice(-25))) return;
      var ora = orarioVicino(src, d.pos + d.len);
      if (!ora && d.rel && /stasera/.test(dopo.slice(0, 10))) ora = '';
      var tipo = tipoData(prima, dopo);
      var chiave = ymd(data) + ' ' + ora;
      if (visti[chiave]) return; visti[chiave] = 1;
      // titolo: per le email l'oggetto, per le chat la frase intorno alla data
      var frase = (msg.tipo === 'chat' || !msg.subject) ? String(msg.body || '').split(/\n|[.!?]\s/).filter(function (f) { return norm(f).indexOf(norm(src.slice(d.pos, d.pos + d.len))) >= 0; })[0] : '';
      var titolo = (frase || msg.subject || String(msg.body || '').slice(0, 60)).trim().slice(0, 90);
      eventi.push({ data: ymd(data), ora: ora, tipo: tipo, titolo: titolo, certo: tipo !== 'Data' && (!!ora || tipo === 'Scadenza' || tipo === 'Consegna') });
    });
    var addr = msg.tipo === 'chat' ? '' : indirizzo(msg.from);
    return {
      eventi: eventi.slice(0, 6),
      importi: importi(testo),
      codici: codici(testo),
      telefoni: telefoni(testo),
      link: links(testo),
      emails: emails(testo).filter(function (e) { return e !== addr; })
    };
  }

  return {
    SEZIONI_BASE: SEZIONI_BASE, classifica: classifica, impara: impara, disimpara: disimpara, estrai: estrai,
    estraiDate: estraiDate, norm: norm, indirizzo: indirizzo, dominio: dominio, nomeMittente: nomeMittente, chiaveChat: chiaveChat
  };
})();
if (typeof module !== 'undefined') module.exports = Smista;
