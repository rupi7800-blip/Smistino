/* Smistino — messaggi di prova (per vedere come funziona senza collegare nulla) */
function ESEMPI(adesso) {
  'use strict';
  var n = adesso ? new Date(adesso) : new Date();
  function giorno(d) { var x = new Date(n); x.setDate(x.getDate() + d); return x; }
  function it(d) { var x = giorno(d); return (x.getDate() < 10 ? '0' : '') + x.getDate() + '/' + (x.getMonth() < 9 ? '0' : '') + (x.getMonth() + 1) + '/' + x.getFullYear(); }
  function fa(ore) { return new Date(n.getTime() - ore * 36e5).toISOString(); }
  return {
    email: [
      { id: 'demo-e1', acc: 'demo-pers', from: 'Amazon.it <conferma-spedizione@amazon.it>', subject: 'Il tuo ordine è stato spedito', date: fa(2),
        body: 'Ciao, il tuo pacco è in viaggio!\nOrdine n. 405-1234567-8910111\nConsegna prevista il ' + it(2) + '.\nNumero di spedizione: BRT0123456789IT\nTotale ordine: 39,90 €' },
      { id: 'demo-e2', acc: 'demo-pers', from: 'Enel Energia <noreply@enel.it>', subject: 'La tua nuova bolletta luce è disponibile', date: fa(5),
        body: 'Gentile cliente, è disponibile la bolletta di ottobre.\nImporto da pagare: 84,30 €\nScadenza: ' + it(12) + '\nIl pagamento avverrà con addebito diretto sul conto.' },
      { id: 'demo-e3', acc: 'demo-pers', from: 'CUP ASST Sette Laghi <cup@asst-settelaghi.it>', subject: 'Promemoria prenotazione visita ortopedica', date: fa(8),
        body: 'Le ricordiamo la visita ortopedica prenotata per il giorno ' + it(6) + ' alle ore 10:30 presso Ospedale di Circolo, Viale Borri 57, Varese.\nCodice prenotazione: VA2026-88123\nPortare impegnativa e tessera sanitaria.' },
      { id: 'demo-e4', acc: 'demo-pers', from: 'Intesa Sanpaolo <comunicazioni@intesasanpaolo.com>', subject: 'Hai ricevuto un bonifico', date: fa(11),
        body: 'Ti informiamo che sul tuo conto è stato accreditato un bonifico di 250,00 EUR da ROSSI MARIO. Causale: quota palestra novembre.' },
      { id: 'demo-e5', acc: 'demo-pers', from: 'Zalando <news@info.zalando.it>', subject: 'Fino a -50% solo per oggi 🔥', date: fa(13), listUnsub: true,
        body: 'Offerte esclusive su scarpe e abbigliamento sportivo. Spedizione gratuita. Se non vuoi più ricevere queste email clicca qui per disiscriverti.' },
      { id: 'demo-e6', acc: 'demo-pers', from: 'Google <no-reply@accounts.google.com>', subject: 'Avviso di sicurezza: nuovo accesso', date: fa(20),
        body: 'È stato rilevato un nuovo accesso al tuo account Google da un dispositivo Windows. Se sei stato tu, non devi fare nulla.' },
      { id: 'demo-e7', acc: 'demo-lav', from: 'Marco Bianchi <marco.bianchi@studiobianchi.it>', subject: 'Riunione progetto palestra comunale', date: fa(3),
        body: 'Ciao Roberto, ti confermo la riunione con il cliente per il nuovo progetto il ' + it(3) + ' alle 15:00 in ufficio. Porta il preventivo aggiornato.\nMarco' },
      { id: 'demo-e8', acc: 'demo-lav', from: 'Segreteria Studenti <segreteria@unisanraffaele.gov.it>', subject: 'Apertura appello d\'esame di Fisiologia', date: fa(26),
        body: 'Si comunica che sono aperte le iscrizioni all\'appello d\'esame di Fisiologia. L\'esame si terrà il ' + it(16) + ' alle ore 9:00 sulla piattaforma. Le iscrizioni chiudono il ' + it(10) + '.' },
      { id: 'demo-e9', acc: 'demo-pers', from: 'Trenitalia <noreply@trenitalia.it>', subject: 'Il tuo biglietto: Milano Centrale → Bolzano', date: fa(30),
        body: 'Grazie per aver acquistato con Trenitalia. Partenza il ' + it(9) + ' alle 07:25 da Milano Centrale. PNR: K7XQ2B. Importo: 42,90 €' },
      { id: 'demo-e10', acc: 'demo-pers', from: 'Comune di Taino <protocollo@comune.taino.va.it>', subject: 'Avviso di pagamento TARI 2026', date: fa(40),
        body: 'Si trasmette l\'avviso di pagamento TARI. Codice avviso: 301000000012345678. Importo 146,00 euro, da pagare entro il ' + it(20) + ' tramite pagoPA.' },
      { id: 'demo-e11', acc: 'demo-pers', from: 'Paolo <paolo.verdi76@gmail.com>', subject: 'quella cosa', date: fa(1),
        body: 'Ti giro il file di cui parlavamo, dimmi cosa ne pensi.' }
    ],
    chat: [
      { id: 'demo-c1', canale: 'whatsapp', chat: 'Mamma', da: 'Mamma', testo: 'Domani sera cena da noi alle 20? Porta il vino 🍷', date: fa(1.5) },
      { id: 'demo-c2', canale: 'whatsapp', chat: 'Mamma', da: 'Mamma', testo: 'Ha chiamato anche la zia, viene pure lei', date: fa(1.4) },
      { id: 'demo-c3', canale: 'whatsapp', chat: 'Sci Club Taino – Training Lab', da: 'Luca', testo: 'Ricordo a tutti: allenamento Training Lab giovedì alle 19 in palestra. Portate il certificato medico sportivo se non l\'avete ancora consegnato!', date: fa(4) },
      { id: 'demo-c4', canale: 'whatsapp', chat: 'Sport Club Renese', da: 'Allenatore Gianni', testo: 'Convocazione regata regionale: ritrovo sabato alle 7:30 al pontile. Conferma la presenza dei ragazzi.', date: fa(6) },
      { id: 'demo-c5', canale: 'telegram', chat: 'Giulia', da: 'Giulia', testo: 'Ciao! Ti va un aperitivo venerdì alle 19?', date: fa(2.5) },
      { id: 'demo-c6', canale: 'telegram', chat: 'Offerte Tech', da: 'Offerte Tech', testo: 'SCONTO -30% su smartwatch Garmin, solo per oggi! Codice sconto TECH30', date: fa(9) },
      { id: 'demo-c7', canale: 'sms', chat: 'PosteInfo', da: 'PosteInfo', testo: 'Il codice di verifica per accedere all\'app è 482913. Non condividerlo con nessuno.', date: fa(0.5) },
      { id: 'demo-c8', canale: 'whatsapp', chat: 'Andrea', da: 'Andrea', testo: 'Tutto ok?', date: fa(7) }
    ]
  };
}
