// ============================================================
// # 🧭 📌  THE RAIL DOWN THE SIDE OF EVERY SCREEN
// # 🔤 JavaScript
// # 🎯 Builds Academia's side rail and puts it on the page: the two
// #    sites, the five courses, and Topics. It can be made narrow and
// #    it remembers which way it was left.
// # 🔗 It does NOT decide what is on screen. Not one line here sets
// #    .hidden on anything. The buttons carry a name and ask, and the
// #    file that owns the screens answers - because MyTerm already has
// #    an owner for that and a second one would disagree with it the
// #    first time either changed. Until that owner is wired up
// #    (AcademiaScreens) the buttons mark themselves and do nothing
// #    else, which is the honest halfway state: visible, inert, and
// #    impossible to mistake for working.
// ============================================================
(() => {
  'use strict';

  // Two sites, five courses, one topics view. The codes are the ones
  // the catalogue uses, spaces and all, so nothing has to be translated
  // later when the real course data arrives
  const SITES = [
    { id: 'academia', name: 'Academia' },
    { id: 'maslakh',  name: 'Almaslakh' }
  ];
  const COURSES = ['ACCT 210', 'FIN 250', 'MGT 210', 'MGT 301', 'MIS 250'];

  const KEEP = 'academia-myterm:rail';

  const svg = d =>
    '<svg class="ac-tab-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

  const ICON = {
    academia: svg('<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>'),
    maslakh:  svg('<path d="M3 7h18M3 12h18M3 17h18"/>'),
    course:   svg('<path d="M4 4h10a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4v14"/>'),
    topics:   svg('<path d="M4 6h16M4 12h10M4 18h13"/>')
  };

  const tab = (screen, icon, label, on) =>
    '<button type="button" data-ac-screen="' + screen + '"' +
    (on ? ' class="ac-is-active"' : '') + '>' + icon +
    '<span class="ac-tab-tx">' + label + '</span></button>';

  function build() {
    const rail = document.createElement('aside');
    rail.className = 'ac-sidebar';
    rail.id = 'ac-rail';
    rail.innerHTML =
      '<div class="ac-side-head"><div class="ac-side-brand">' +
        '<div class="ac-side-logo">Academia</div>' +
      '</div></div>' +

      '<nav class="ac-tabs">' +
        SITES.map((s, i) => tab(s.id, ICON[s.id], s.name, i === 0)).join('') +
      '</nav>' +

      '<nav class="ac-tabs ac-tabs--courses">' +
        COURSES.map(c => tab('course:' + c, ICON.course, c, false)).join('') +
      '</nav>' +

      '<nav class="ac-tabs ac-tabs--me">' +
        tab('topics', ICON.topics, 'Topics', false) +
      '</nav>';

    // The handle lives outside the rail: it must stay reachable when
    // the rail is narrow, and a child of a 64px box cannot straddle
    // that box's own edge
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'ac-side-handle';
    handle.id = 'ac-handle';
    handle.setAttribute('aria-label', 'Narrow the rail');
    // The mark says "rail", not "direction" - so it never turns. The
    // stylesheet pins it with !important for exactly that reason
    handle.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round"><path d="M9 4v16"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>';

    document.body.appendChild(rail);
    document.body.appendChild(handle);
    return handle;
  }

  function setNarrow(on) {
    document.body.classList.toggle('ac-side-rail', on);
    const h = document.getElementById('ac-handle');
    if (h) h.setAttribute('aria-label', on ? 'Widen the rail' : 'Narrow the rail');
    try { localStorage.setItem(KEEP, on ? 'narrow' : 'wide'); } catch (e) {}
  }

  function start() {
    // The page opts in. Without this class the rail's stylesheet does
    // nothing to the body, so a page that never builds a rail is left
    // exactly as it was
    document.body.classList.add('ac-on');
    document.documentElement.setAttribute('data-ac-lang', 'en');

    const handle = build();
    let narrow = false;
    try { narrow = localStorage.getItem(KEEP) === 'narrow'; } catch (e) {}
    setNarrow(narrow);

    handle.addEventListener('click', () =>
      setNarrow(!document.body.classList.contains('ac-side-rail')));

    // The sheen follows the pointer across the rail
    const rail = document.getElementById('ac-rail');
    rail.addEventListener('pointermove', e => {
      const r = rail.getBoundingClientRect();
      rail.style.setProperty('--ac-mx', (e.clientX - r.left) + 'px');
      rail.style.setProperty('--ac-my', (e.clientY - r.top) + 'px');
    });

    // Marking only. The screen owner is not here yet, and pretending
    // otherwise would hide the fact that it is still missing
    rail.addEventListener('click', e => {
      const b = e.target.closest('[data-ac-screen]');
      if (!b) return;
      rail.querySelectorAll('[data-ac-screen]')
          .forEach(x => x.classList.remove('ac-is-active'));
      b.classList.add('ac-is-active');
    });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
})();
