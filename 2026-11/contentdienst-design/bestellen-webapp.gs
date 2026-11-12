/**
 * SpotlessPro Contentdienst - bestelling ontvangen (Apps Script web app).
 * Implementeren als: Web-app, uitvoeren als "Ik", toegang "Iedereen". Geen externe diensten.
 * Verwerkt POST (text/plain, JSON) van bestel.html: valideert, mailt de bestelling naar ADMIN en bevestigt aan de klant met de betaallink.
 */
const ADMIN = 'habbekratsalgorythms@gmail.com';
const TERMS = 'https://habbekratsalgorythms.github.io/contentdienst/voorwaarden.html';
const PRIVACY = 'https://habbekratsalgorythms.github.io/contentdienst/privacy.html';
const PRODUCTS = {
  content: {name: 'Contentpakket', price: '€79 inclusief 21% btw', link: 'https://payment-links.mollie.com/payment/tSyVpTpDtBwsyTrXQ4zYT'},
  website: {name: 'Website', price: '€195 inclusief 21% btw', link: 'https://payment-links.mollie.com/payment/q7rpyHGYd2QXqZohXKobH'}
};
const FIELDS = [
  ['bedrijfsnaam', 'Bedrijfsnaam', true, 100], ['kvk', 'KvK-nummer', true, 20], ['btw', 'Btw-nummer (optioneel)', false, 30],
  ['straat', 'Factuuradres - straat en huisnummer', true, 100], ['postcode', 'Factuuradres - postcode', true, 12], ['plaats', 'Factuuradres - plaats', true, 60],
  ['contact', 'Contactpersoon', true, 80], ['email', 'E-mailadres (ook voor factuur)', true, 120],
  ['wat', 'Wat doet uw bedrijf?', true, 400], ['werkgebied', 'Plaats / werkgebied', true, 100], ['diensten', 'Top 3 diensten of producten', true, 400],
  ['toon', 'Toon', true, 20], ['aanspreek', 'Aanspreekvorm', true, 20], ['extra', 'Platforms (contentpakket) of openbare contactgegevens (website)', true, 400]
];
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\r/g, '').trim().slice(0, max); }
function doGet() { return out({ok: true, service: 'SpotlessPro bestellen'}); }
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!raw || raw.length > 12000) return out({ok: false, error: 'invalid'});
    const d = JSON.parse(raw);
    if (d.website2) return out({ok: true}); // honeypot: doe alsof het gelukt is
    const p = PRODUCTS[d.pakket];
    if (!p) return out({ok: false, error: 'pakket'});
    if (d.akkoord !== true) return out({ok: false, error: 'akkoord'});
    const v = {};
    for (const f of FIELDS) { v[f[0]] = clean(d[f[0]], f[3]); if (f[2] && !v[f[0]]) return out({ok: false, error: 'veld:' + f[0]}); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return out({ok: false, error: 'email'});
    const cache = CacheService.getScriptCache();
    const kEmail = 'e_' + Utilities.base64EncodeWebSafe(v.email.toLowerCase()).slice(0, 80);
    const total = Number(cache.get('total') || 0), perEmail = Number(cache.get(kEmail) || 0);
    if (total >= 60 || perEmail >= 3) return out({ok: false, error: 'limiet'});
    cache.put('total', String(total + 1), 3600); cache.put(kEmail, String(perEmail + 1), 3600);
    const lines = FIELDS.map(f => f[1] + ': ' + v[f[0]]).join('\n');
    const body = 'Nieuwe bestelling: ' + p.name + '\nPrijs: ' + p.price + '\n\n' + lines + '\n\nAkkoord algemene voorwaarden: ja';
    MailApp.sendEmail({to: ADMIN, subject: 'NIEUWE BESTELLING ' + p.name + ' - ' + v.bedrijfsnaam, body: body, name: 'SpotlessPro Contentdienst', replyTo: v.email});
    MailApp.sendEmail({
      to: v.email, subject: 'Uw bestelling bij SpotlessPro Contentdienst', name: 'SpotlessPro Contentdienst',
      body: 'Bedankt voor uw bestelling bij SpotlessPro Contentdienst.\n\nPakket: ' + p.name + '\nPrijs: ' + p.price + '\nBetaal veilig met iDEAL: ' + p.link + '\nAlgemene voorwaarden: ' + TERMS + '\nPrivacyverklaring: ' + PRIVACY + '\n\nLevering binnen vijf werkdagen na betaling en complete intake. Logo\'s of foto\'s kunt u als antwoord op deze mail meesturen (alleen met rechten en toestemmingen).\n\nContact: ' + ADMIN
    });
    return out({ok: true});
  } catch (err) {
    return out({ok: false, error: 'server'});
  }
}
