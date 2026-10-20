/* Interaction prototype — no network calls (REQ-014). All data on the pages is simulated. */
(function () {
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // Theme toggle
  var saved = store('theme');
  if (saved) root.setAttribute('data-theme', saved);
  var tt = document.getElementById('theme-toggle');
  if (tt) tt.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); store('theme', next);
  });

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3000);
  }

  // Tabs (admin page)
  document.querySelectorAll('[role=tablist]').forEach(function (list) {
    var tabs = list.querySelectorAll('[role=tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var sel = t === tab;
          t.setAttribute('aria-selected', sel);
          document.getElementById(t.getAttribute('aria-controls')).hidden = !sel;
        });
      });
    });
  });

  // Dashboard: filter + empty state + offline banner demo
  var filter = document.getElementById('sev-filter');
  var rows = document.querySelectorAll('#incident-rows tr');
  var empty = document.getElementById('empty-state');
  var search = document.getElementById('inc-search');
  function applyFilter() {
    if (!rows.length) return;
    var sev = filter ? filter.value : 'all';
    var q = search ? search.value.trim().toLowerCase() : '';
    var shown = 0;
    rows.forEach(function (r) {
      var ok = (sev === 'all' || r.dataset.sev === sev) && (!q || r.textContent.toLowerCase().indexOf(q) > -1);
      r.hidden = !ok; if (ok) shown++;
    });
    if (empty) empty.hidden = shown !== 0;
    var cnt = document.getElementById('shown-count');
    if (cnt) cnt.textContent = shown;
  }
  if (filter) filter.addEventListener('change', applyFilter);
  if (search) search.addEventListener('input', applyFilter);
  var off = document.getElementById('offline-demo');
  if (off) off.addEventListener('click', function () {
    var b = document.getElementById('offline-banner'); b.hidden = !b.hidden;
  });

  // Incident detail: feedback
  document.querySelectorAll('[data-feedback]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cause = btn.closest('.cause');
      cause.querySelectorAll('[data-feedback]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn); });
      var st = cause.querySelector('.fb-status');
      if (st) st.textContent = btn.dataset.feedback === 'correct' ? 'Marked correct' : 'Marked incorrect';
      toast('Feedback saved to audit log');
    });
  });

  // Incident detail: chat
  var form = document.getElementById('chat-form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('chat-input');
    var err = document.getElementById('chat-error');
    var q = input.value.trim();
    if (!q) { err.hidden = false; input.focus(); return; }
    err.hidden = true;
    var log = document.getElementById('chat-log');
    var u = document.createElement('div'); u.className = 'msg user'; u.textContent = q; log.appendChild(u);
    var b = document.createElement('div'); b.className = 'msg bot';
    var related = /why|cause|happen|fail|down|link|interface|bgp|ospf|cpu|error/i.test(q);
    if (related) {
      b.innerHTML = 'Interface Gi0/1 on core-sw-07 went down at 09:41 and 19 downstream alerts followed within 2 minutes, so the link failure is the most likely origin.<span class="cite">Evidence: syslog 09:41:12 LINK-3-UPDOWN, alert A-20431, metric ifOperStatus=down</span>';
    } else {
      b.textContent = 'I can only answer questions about the selected incident INC-1042.';
    }
    log.appendChild(b); log.scrollTop = log.scrollHeight; input.value = '';
  });

  // Incident detail: escalation prompt + close dialog
  var esc = document.getElementById('escalate-btn');
  if (esc) esc.addEventListener('click', function () {
    document.getElementById('status-badge').textContent = 'Escalated';
    document.getElementById('escalation-banner').hidden = true;
    toast('Incident escalated to an expert');
  });
  var later = document.getElementById('escalate-later');
  if (later) later.addEventListener('click', function () {
    document.getElementById('escalation-banner').hidden = true; toast('Reminder in 15 minutes');
  });
  var dlg = document.getElementById('close-dialog');
  var openClose = document.getElementById('open-close');
  if (dlg && openClose) {
    openClose.addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
    document.getElementById('close-cancel').addEventListener('click', function () { dlg.close(); });
    document.getElementById('close-confirm').addEventListener('click', function () { window.location.href = 'report.html'; });
  }
  var llm = document.getElementById('llm-demo');
  if (llm) llm.addEventListener('click', function () {
    var down = document.getElementById('llm-down'), ok = document.getElementById('llm-ok');
    down.hidden = !down.hidden; ok.hidden = !ok.hidden;
  });

  // Report: save, draft kept locally
  var rep = document.getElementById('report-form');
  if (rep) {
    var draft = store('report-draft');
    var ta = document.getElementById('rep-actions');
    if (draft && ta) ta.value = draft;
    if (ta) ta.addEventListener('input', function () { store('report-draft', ta.value); });
    rep.addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('rep-status').textContent = 'Saved';
      document.getElementById('rep-status').className = 'badge ok';
      toast('Report saved');
    });
  }

  // Admin: add user (demo)
  var addUser = document.getElementById('user-form');
  if (addUser) addUser.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('new-name').value.trim();
    if (!name) { document.getElementById('new-name-error').hidden = false; return; }
    document.getElementById('new-name-error').hidden = true;
    var tr = document.createElement('tr');
    tr.innerHTML = '<td></td><td></td><td><span class="badge ok">Active</span></td>';
    tr.children[0].textContent = name;
    tr.children[1].textContent = document.getElementById('new-role').value;
    document.getElementById('user-rows').appendChild(tr);
    addUser.reset(); toast('User added');
  });

  // Results export
  var exp = document.getElementById('export-btn');
  if (exp) exp.addEventListener('click', function () {
    var lines = ['# Results report', ''];
    document.querySelectorAll('#metric-rows tr').forEach(function (r) {
      lines.push('- ' + Array.prototype.map.call(r.children, function (c) { return c.textContent.trim(); }).join(' | '));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results-report.md'; a.click();
    toast('Results report exported (Markdown)');
  });
})();
