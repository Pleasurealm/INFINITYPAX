/* ============================================================
   Infinity Pax — shared roster profiling & email generation
   Ported from the team-pack generator. Pure, no DOM.
   Exposes window.IPProfile
   Sectors: luxury retail · hospitality · private homes · HNW
   ============================================================ */
(function (global) {
  'use strict';

  var TRADE = {
    'Electrician':        { label: 'Electrician',              roles: ['Estate Maintenance Electrician', 'Luxury Property Facilities'],           sal: '£38–46k', line: 'a qualified electrician, so I can carry out electrical work and property maintenance across a private home or estate alongside my security duties' },
    'Plumber':            { label: 'Plumber',                  roles: ['Estate Maintenance Plumber', 'Property Facilities Operative'],            sal: '£36–44k', line: 'a qualified plumber, so I bring hands-on maintenance and building-services skills for private homes and estates on top of guarding' },
    'Carpenter':          { label: 'Carpenter / Joiner',       roles: ['Estate Carpenter / Fit-out', 'Property Maintenance Joiner'],              sal: '£34–42k', line: 'a skilled carpenter and joiner, useful for fit-out, repairs and upkeep in luxury properties and estates' },
    'Brick Layer':        { label: 'Bricklayer',               roles: ['Estate Grounds & Masonry', 'Property Maintenance'],                       sal: '£34–42k', line: 'a skilled bricklayer, adding practical grounds and property-maintenance capability on a private estate' },
    'Painter':            { label: 'Painter & Decorator',      roles: ['Estate Painter & Decorator', 'Luxury Property Finisher'],                 sal: '£30–38k', line: 'a painter and decorator, useful for keeping a luxury home or estate immaculately presented' },
    'Plant Operator':     { label: 'Plant Operator',           roles: ['Estate Grounds / Plant', 'Groundskeeping'],                               sal: '£34–44k', line: 'a certified plant operator, adding grounds and estate-maintenance capability' },
    'Veh Mechanics':      { label: 'Vehicle Technician',       roles: ['Private Fleet Technician', 'Estate Vehicle Care'],                        sal: '£32–40k', line: 'an experienced vehicle mechanic, able to keep a private fleet serviced and roadworthy' },
    'Armourer':           { label: 'Close Protection / Armourer', roles: ['Close Protection (with CP top-up)', 'Private Estate Security & Stores'], sal: '£34–45k', line: 'a trained armourer with weapons-handling experience, well suited to specialist and close-protection security for high-net-worth clients' },
    'Chef':               { label: 'Chef',                     roles: ['Private Household Chef', 'Hotel / Hospitality Kitchen'],                  sal: '£30–42k', line: 'a working chef, able to cover private-household and hospitality catering to a high standard' },
    'Care Taker':         { label: 'Caretaker',                roles: ['Estate Caretaker', 'Household / Property Attendant'],                     sal: '£26–34k', line: 'an experienced caretaker, comfortable with the upkeep, security and smooth running of a private home or estate' },
    'Clerk/IT':           { label: 'IT & Admin',               roles: ['Household / Estate Administrator', 'CCTV & Control Room'],                sal: '£28–36k', line: 'IT- and admin-literate, suited to household administration, CCTV and control-room support' },
    'Private car driver': { label: 'Private Chauffeur',        roles: ['Private Chauffeur', 'HNW Close Protection Driver'],                       sal: '£32–44k', line: 'an experienced chauffeur, discreet and reliable behind the wheel for private and high-net-worth clients' }
  };
  var HEAD_ORDER = ['Electrician', 'Plumber', 'Carpenter', 'Brick Layer', 'Plant Operator', 'Veh Mechanics', 'Painter', 'Armourer', 'Chef', 'Care Taker', 'Clerk/IT', 'Private car driver'];
  var SEC_ROLES = ['Luxury Retail Security / Concierge', 'Hotel & Hospitality Security', 'Residential Concierge (private homes)', 'Private Estate / Household Security', 'HNW Front-of-House / Guest Host'];

  function parseQuals(quals) {
    var toks = String(quals || '').split('/').map(function (s) { return s.trim(); }).filter(Boolean);
    var hasSIA = toks.some(function (t) { return /^SIA$/i.test(t); });
    var isDriver = toks.some(function (t) { return /driver/i.test(t); });
    return { toks: toks, hasSIA: hasSIA, isDriver: isDriver };
  }

  function profile(person) {
    var q = parseQuals(person.quals);
    var head = HEAD_ORDER.find(function (h) {
      return q.toks.some(function (t) { return t.toLowerCase() === h.toLowerCase(); });
    });
    var trade = head ? TRADE[head] : null;
    var roles = [];
    if (q.hasSIA) {
      roles = SEC_ROLES.slice();
      if (q.isDriver) roles.push('Private Chauffeur / Security Driver');
      if (trade) roles = roles.concat(trade.roles);
    } else {
      roles = trade ? trade.roles.slice() : [];
      if (q.isDriver) roles = roles.concat(['Logistics / Delivery Driver', 'Security / Chauffeur Driver']);
    }
    roles = roles.filter(function (r, i, a) { return a.indexOf(r) === i; }).slice(0, 6);

    var sal = q.hasSIA ? (q.isDriver ? '£28–35k' : '£28–34k') : '£26–34k';
    if (trade) sal = trade.sal;

    var chips = [];
    if (q.hasSIA) chips.push('SIA licensed');
    if (trade) chips.push(trade.label);
    if (q.isDriver && (!trade || head !== 'Private car driver')) chips.push('Full UK licence');

    return { hasSIA: q.hasSIA, isDriver: q.isDriver, head: head || null, trade: trade, roles: roles, sal: sal, chips: chips };
  }

  function email(person, pr) {
    pr = pr || profile(person);
    var driverLine = pr.isDriver ? ' I hold a full UK driving licence and am happy to drive as part of the role.' : '';
    var open, tradeSentence = '';
    if (pr.trade) tradeSentence = ' In addition to front-of-house and guarding duties, I am ' + pr.trade.line + '.';
    if (pr.hasSIA) {
      open = 'I am writing to apply for security and front-of-house positions in luxury retail, hospitality, private homes and with high-net-worth clients. I hold a valid SIA licence and am a reliable, discreet security professional from an established ex-forces-led team known for immaculate conduct and dependability.';
    } else if (pr.trade) {
      open = 'I am writing to apply for ' + pr.trade.label.toLowerCase() + ' and related roles supporting luxury retail, hospitality, private homes and high-net-worth clients. I am a reliable, discreet worker from an established ex-forces-led team, ' + pr.trade.line + '.';
      tradeSentence = '';
    } else {
      open = 'I am writing to apply for suitable positions in luxury retail, hospitality, private homes and with high-net-worth clients. I am a reliable, discreet worker from an established ex-forces-led team.';
    }
    var salLine = ' I am based in Greater London, available immediately, and seeking a competitive salary (guide ' + pr.sal + ').';
    var body = 'Dear Hiring Team,\n\n' + open + tradeSentence + driverLine + salLine +
      ' I would welcome the opportunity to discuss how I can contribute, and references are available on request.\n\n' +
      'Kind regards,\n' + person.name + '\n' + person.phone + ' · via Infinity Pax';
    var roleWord = pr.hasSIA ? 'SIA security' : (pr.trade ? pr.trade.label : 'General');
    var subject = person.name + ' — ' + roleWord + (pr.trade && pr.hasSIA ? ' + ' + pr.trade.label : '') + ' — available now, London';
    return { subject: subject, body: body };
  }

  function counts(roster) {
    var c = { total: roster.length, sia: 0, drivers: 0, trades: 0 };
    roster.forEach(function (p) {
      var pr = profile(p);
      if (pr.hasSIA) c.sia++;
      if (pr.isDriver) c.drivers++;
      if (pr.trade) c.trades++;
    });
    return c;
  }

  global.IPProfile = { TRADE: TRADE, profile: profile, email: email, counts: counts, parseQuals: parseQuals };
})(window);
