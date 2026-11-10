# Smistino

**Tutti i tuoi messaggi, già al posto giusto.**
Web app (PWA) che raccoglie email illimitate e messaggi di WhatsApp, Telegram, SMS e qualsiasi altra app, e li smista da sola in sezioni (Lavoro, Famiglia e amici, Salute, Banca, Acquisti, Casa e bollette, Enti e burocrazia, Studio, Sport, Viaggi, Account e sicurezza, Social, Promozioni — tutte modificabili, e puoi crearne di nuove).

## Come smista
- **Fiducia alta** → va diretto nella sezione (regola tua, mittente/chat imparato, segnali forti).
- **Fiducia media** → messo nella sezione più probabile con "Ho indovinato?".
- **Fiducia bassa** → resta in **Da smistare**: scegli tu e Smistino impara mittente, chat e parole.
- Trova da solo date (scadenze, appuntamenti, consegne — anche "domani alle 20" nelle chat), importi, codici (OTP, spedizioni, prenotazioni, pagoPA), telefoni e link.

## Fonti
| Fonte | Come |
|---|---|
| Gmail (quante vuoi) | uno script `ponte/Codice.gs` per ogni account, istruzioni nell'app |
| Outlook, Libero, iCloud, PEC… | inoltro automatico verso una Gmail collegata: Smistino le riconosce dall'indirizzo |
| WhatsApp, SMS, Signal, Messenger… (Android) | MacroDroid/Tasker inoltrano le notifiche allo script (`doPost`) |
| Telegram | bot personale (BotFather) letto dallo script ogni 5 minuti |
| Qualsiasi app | Condividi → Smistino (PWA installata su Android), oppure Incolla |
| Chat intere / email salvate | Importa: WhatsApp .txt/.zip, Telegram result.json, file .eml |

I dati restano sul telefono (IndexedDB). Lo script gira sul tuo account Google e tiene i messaggi delle app in un foglio "Smistino – messaggi in arrivo" (pulito dopo 45 giorni).

## File
- `index.html`, `css/style.css`, `js/app.js` — app
- `js/classificatore.js` — smistamento ed estrazione dati (codice puro, testabile con node)
- `js/importa.js` — lettura chat esportate, zip ed .eml
- `js/esempi.js` — messaggi di prova
- `ponte/Codice.gs` — script Google Apps Script
- `sw.js`, `js/aggiornamenti.js`, `version.json` — funzionamento offline e tasto **Aggiorna**

## Aggiornamenti
A ogni modifica aumenta la versione sia in `version.json` sia in `data-version` dentro `index.html`: comparirà il tasto "Aggiorna".
