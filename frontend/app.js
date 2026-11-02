/* NOC Assistant Frontend - API Integration */
(function () {
  const API_BASE = 'http://localhost:3001/api';
  let currentIncidentId = 'INC-1042';
  let allIncidents = [];

  var root = document.documentElement;
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 3000);
  }

  async function apiCall(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      toast('Error connecting to server');
      return null;
    }
  }

  // Theme toggle
  var saved = store('theme');
  if (saved) root.setAttribute('data-theme', saved);
  var tt = document.getElementById('theme-toggle');
  if (tt) tt.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('theme', next);
  });

  // ===== DASHBOARD PAGE =====
  async function loadDashboard() {
    const stats = await apiCall('/dashboard-stats');
    if (!stats) return;

    document.getElementById('stat-open').textContent = stats.data.openIncidents;
    document.getElementById('stat-alerts').textContent = stats.data.alertsGroupedToday;
    document.getElementById('stat-critical').textContent = stats.data.criticalOver45min;
    document.getElementById('stat-devices').textContent = stats.data.devicesMonitored;

    await loadIncidents();
  }

  async function loadIncidents(severity = 'all', search = '') {
    const params = new URLSearchParams();
    if (severity !== 'all') params.append('severity', severity);
    if (search) params.append('search', search);

    const result = await apiCall(`/incidents?${params}`);
    if (!result) return;

    allIncidents = result.data;
    renderIncidentTable(result.data);
    document.getElementById('shown-count').textContent = result.count;
    document.getElementById('empty-state').hidden = result.count > 0;
  }

  function renderIncidentTable(incidents) {
    const rows = document.getElementById('incident-rows');
    if (!rows) return;

    rows.innerHTML = incidents.map(inc => `
      <tr data-sev="${inc.severity}">
        <td><span class="badge ${inc.severity}">
          ${inc.severity === 'critical' ? '▲' : inc.severity === 'major' ? '■' : '●'}
          ${inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
        </span></td>
        <td><a href="incident.html?id=${inc.id}" onclick="window.currentIncidentId='${inc.id}'">${inc.id}</a></td>
        <td>${inc.devices.join(' ')}</td>
        <td>${inc.alertCount}</td>
        <td>${formatAge(inc.ageMinutes)}</td>
        <td>${inc.probableCause} <span class="muted">(${inc.confidence} %)</span></td>
      </tr>
    `).join('');
  }

  function formatAge(minutes) {
    if (minutes < 60) return minutes + ' min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} h ${mins} min`;
  }

  // Dashboard filter
  var filter = document.getElementById('sev-filter');
  var search = document.getElementById('inc-search');
  if (filter) {
    filter.addEventListener('change', function () {
      loadIncidents(filter.value, search ? search.value : '');
    });
  }
  if (search) {
    search.addEventListener('input', function () {
      loadIncidents(filter ? filter.value : 'all', search.value);
    });
  }

  var off = document.getElementById('offline-demo');
  if (off) {
    off.addEventListener('click', function () {
      var b = document.getElementById('offline-banner');
      b.hidden = !b.hidden;
    });
  }

  // ===== INCIDENT DETAIL PAGE =====
  async function loadIncidentDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const incidentId = urlParams.get('id') || currentIncidentId;

    const result = await apiCall(`/incidents/${incidentId}`);
    if (!result) return;

    const incident = result.data;
    currentIncidentId = incidentId;

    // Title and meta
    const title = document.getElementById('incident-title');
    if (title) {
      title.innerHTML = `${incidentId} · ${incident.title}
        <span class="badge ${incident.severity}">▲ ${incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}</span>
        <span class="badge neutral" id="status-badge">${incident.status}</span>`;
    }

    const meta = document.getElementById('incident-meta');
    if (meta) {
      meta.textContent = `UC-03 · ${incident.site} · Opened ${incident.openedTime} · Open for ${incident.ageMinutes} minutes · ${incident.alertCount} grouped alerts`;
    }

    // Show escalation banner for critical incidents over 45 min
    const banner = document.getElementById('escalation-banner');
    if (banner && incident.severity === 'critical' && incident.ageMinutes > 45) {
      banner.hidden = false;
    }

    // Probable causes
    const causesContainer = document.getElementById('causes-container');
    if (causesContainer && incident.probableCauses) {
      causesContainer.innerHTML = incident.probableCauses.map((cause, idx) => `
        <article class="cause">
          <div class="head">
            <div><span class="rank">${cause.rank}</span><strong>${cause.title}</strong></div>
            <div>Confidence ${cause.confidence} % <span class="meter" role="img" aria-label="Confidence ${cause.confidence} percent"><span style="width:${cause.confidence}%"></span></span>${cause.confidence < 50 ? '<span class="badge warn">low confidence</span>' : ''}</div>
          </div>
          <ul class="evidence">
            ${cause.evidence.map(e => `<li>${e}</li>`).join('')}
          </ul>
          <div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="btn small" type="button" data-feedback="correct" data-cause="${cause.rank}" aria-pressed="false">Mark correct</button>
            <button class="btn small" type="button" data-feedback="incorrect" data-cause="${cause.rank}" aria-pressed="false">Mark incorrect</button>
            <span class="fb-status muted" aria-live="polite"></span>
          </div>
        </article>
      `).join('');

      // Feedback handlers
      document.querySelectorAll('[data-feedback]').forEach(btn => {
        btn.addEventListener('click', async function () {
          const cause = btn.closest('.cause');
          cause.querySelectorAll('[data-feedback]').forEach(b => {
            b.setAttribute('aria-pressed', b === btn);
          });
          const st = cause.querySelector('.fb-status');
          st.textContent = btn.dataset.feedback === 'correct' ? 'Marked correct' : 'Marked incorrect';
          await apiCall(`/incidents/${incidentId}/feedback`, {
            method: 'POST',
            body: JSON.stringify({
              causeRank: btn.dataset.cause,
              feedback: btn.dataset.feedback
            })
          });
          toast('Feedback saved to audit log');
        });
      });
    }

    // Recommended actions
    const actionsContainer = document.getElementById('actions-container');
    if (actionsContainer && incident.recommendedActions) {
      actionsContainer.innerHTML = incident.recommendedActions.map(action => `<li>${action}</li>`).join('');
    }

    // Alerts
    const alertsContainer = document.getElementById('alerts-container');
    const alertCount = document.getElementById('alert-count');
    if (alertsContainer && incident.alerts) {
      alertCount.textContent = `(${incident.alerts.length})`;
      alertsContainer.innerHTML = incident.alerts.map(alert => `
        <tr>
          <td class="mono">${alert.time}</td>
          <td>${alert.device}</td>
          <td>${alert.message}</td>
        </tr>
      `).join('');
    }

    // Chat form
    const form = document.getElementById('chat-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const err = document.getElementById('chat-error');
        const q = input.value.trim();
        if (!q) {
          err.hidden = false;
          input.focus();
          return;
        }
        err.hidden = true;

        // Add user message
        const log = document.getElementById('chat-log');
        const userMsg = document.createElement('div');
        userMsg.className = 'msg user';
        userMsg.textContent = q;
        log.appendChild(userMsg);

        // Get response from API
        const response = await apiCall(`/incidents/${incidentId}/chat`, {
          method: 'POST',
          body: JSON.stringify({ message: q })
        });

        if (response) {
          const botMsg = document.createElement('div');
          botMsg.className = 'msg bot';
          botMsg.textContent = response.message;
          log.appendChild(botMsg);
        }

        log.scrollTop = log.scrollHeight;
        input.value = '';
      });
    }

    // Escalation
    const esc = document.getElementById('escalate-btn');
    if (esc) {
      esc.addEventListener('click', async function () {
        await apiCall(`/incidents/${incidentId}/escalate`, { method: 'POST' });
        document.getElementById('status-badge').textContent = 'Escalated';
        document.getElementById('escalation-banner').hidden = true;
        toast('Incident escalated to an expert');
      });
    }

    const later = document.getElementById('escalate-later');
    if (later) {
      later.addEventListener('click', function () {
        document.getElementById('escalation-banner').hidden = true;
        toast('Reminder in 15 minutes');
      });
    }

    // Close dialog
    const dlg = document.getElementById('close-dialog');
    const openClose = document.getElementById('open-close');
    if (dlg && openClose) {
      const closeText = document.getElementById('close-dialog-text');
      if (closeText) closeText.textContent = `${incidentId} will be closed and a report will be drafted for you to review.`;

      openClose.addEventListener('click', function () {
        if (dlg.showModal) dlg.showModal();
        else dlg.setAttribute('open', '');
      });

      document.getElementById('close-cancel').addEventListener('click', function () { dlg.close(); });
      document.getElementById('close-confirm').addEventListener('click', async function () {
        await apiCall(`/incidents/${incidentId}/close`, { method: 'POST' });
        toast('Incident closed');
        window.location.href = 'dashboard.html';
      });
    }
  }

  // Tabs (admin page)
  document.querySelectorAll('[role=tablist]').forEach(function (list) {
    var tabs = list.querySelectorAll('[role=tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var sel = t === tab;
          t.setAttribute('aria-selected', sel);
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !sel;
        });
      });
    });
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
    addUser.reset();
    toast('User added');
  });

  // Results export
  var exp = document.getElementById('export-btn');
  if (exp) exp.addEventListener('click', function () {
    var lines = ['# Results report', ''];
    document.querySelectorAll('#metric-rows tr').forEach(function (r) {
      lines.push('- ' + Array.prototype.map.call(r.children, function (c) { return c.textContent.trim(); }).join(' | '));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'results-report.md';
    a.click();
    toast('Results report exported (Markdown)');
  });

  // Initialize based on page
  if (window.location.pathname.includes('dashboard')) {
    loadDashboard();
  } else if (window.location.pathname.includes('incident')) {
    loadIncidentDetail();
  }

  // Make functions global for inline onclick
  window.currentIncidentId = currentIncidentId;
})();
