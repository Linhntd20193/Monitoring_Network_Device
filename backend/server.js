const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock data
const incidents = [
  {
    id: 'INC-1042',
    severity: 'critical',
    title: 'Link failure on core-sw-07',
    devices: ['core-sw-07', '+3'],
    site: 'Site 3',
    alertCount: 20,
    ageMinutes: 52,
    openedTime: '09:41',
    probableCause: 'Link failure Gi0/1',
    confidence: 87,
    status: 'Open'
  },
  {
    id: 'INC-1041',
    severity: 'major',
    title: 'Routing flap (OSPF)',
    devices: ['edge-rt-12'],
    site: 'Site 7',
    alertCount: 9,
    ageMinutes: 31,
    openedTime: '10:02',
    probableCause: 'Routing flap (OSPF)',
    confidence: 74,
    status: 'Open'
  },
  {
    id: 'INC-1039',
    severity: 'major',
    title: 'Device overload (CPU)',
    devices: ['fw-edge-02'],
    site: 'Site 1',
    alertCount: 6,
    ageMinutes: 72,
    openedTime: '08:21',
    probableCause: 'Device overload (CPU)',
    confidence: 69,
    status: 'Open'
  },
  {
    id: 'INC-1044',
    severity: 'minor',
    title: 'Configuration error',
    devices: ['acc-sw-31'],
    site: 'Site 9',
    alertCount: 3,
    ageMinutes: 12,
    openedTime: '10:21',
    probableCause: 'Configuration error',
    confidence: 58,
    status: 'Open'
  },
  {
    id: 'INC-1040',
    severity: 'minor',
    title: 'Hardware fault (fan)',
    devices: ['dist-sw-05'],
    site: 'Site 2',
    alertCount: 2,
    ageMinutes: 44,
    openedTime: '09:29',
    probableCause: 'Hardware fault (fan)',
    confidence: 63,
    status: 'Open'
  },
  {
    id: 'INC-1043',
    severity: 'minor',
    title: 'Link failure Fa0/12',
    devices: ['acc-sw-18'],
    site: 'Site 5',
    alertCount: 2,
    ageMinutes: 20,
    openedTime: '10:13',
    probableCause: 'Link failure Fa0/12',
    confidence: 61,
    status: 'Open'
  }
];

const incidentDetails = {
  'INC-1042': {
    id: 'INC-1042',
    severity: 'critical',
    title: 'Link failure on core-sw-07',
    site: 'Site 3',
    openedTime: '09:41',
    ageMinutes: 52,
    alertCount: 20,
    status: 'Open',
    probableCauses: [
      {
        rank: 1,
        title: 'Link failure on core-sw-07 Gi0/1',
        confidence: 87,
        evidence: [
          'Syslog 09:41:12 %LINK-3-UPDOWN: Gi0/1 changed state to down',
          'Metric ifOperStatus = down since 09:41',
          '19 downstream alerts within 2 minutes (e.g. alert A-20431)'
        ]
      },
      {
        rank: 2,
        title: 'Hardware fault on the Gi0/1 transceiver',
        confidence: 41,
        evidence: [
          'Two CRC error spikes on Gi0/1 at 09:32 and 09:38'
        ]
      },
      {
        rank: 3,
        title: 'Configuration change on the peer device',
        confidence: 22,
        evidence: [
          'Config change logged on dist-sw-02 at 09:36'
        ]
      }
    ],
    recommendedActions: [
      'Check the cable and transceiver on core-sw-07 Gi0/1.',
      'If the port stays down, move traffic to the standby link and replace the transceiver.',
      'When traffic is restored, confirm recovery below.'
    ],
    alerts: [
      { time: '09:41:12', device: 'core-sw-07', message: 'Interface Gi0/1 down' },
      { time: '09:41:20', device: 'dist-sw-02', message: 'BGP neighbour 10.3.0.7 lost' },
      { time: '09:41:31', device: 'acc-sw-33', message: 'Uplink unreachable' }
    ]
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NOC Assistant Backend is running' });
});

app.get('/api/incidents', (req, res) => {
  const { severity, search } = req.query;
  let filtered = [...incidents];

  if (severity && severity !== 'all') {
    filtered = filtered.filter(inc => inc.severity === severity);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(inc =>
      inc.title.toLowerCase().includes(q) ||
      inc.devices.some(d => d.toLowerCase().includes(q)) ||
      inc.site.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: filtered.length,
    data: filtered.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.ageMinutes - b.ageMinutes;
    })
  });
});

app.get('/api/incidents/:id', (req, res) => {
  const incident = incidentDetails[req.params.id];
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, data: incident });
});

app.get('/api/dashboard-stats', (req, res) => {
  res.json({
    success: true,
    data: {
      openIncidents: incidents.length,
      alertsGroupedToday: 142,
      criticalOver45min: incidents.filter(i => i.severity === 'critical' && i.ageMinutes > 45).length,
      devicesMonitored: 1200
    }
  });
});

app.post('/api/incidents/:id/escalate', (req, res) => {
  const incident = incidentDetails[req.params.id];
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  incident.status = 'Escalated';
  res.json({ success: true, message: 'Incident escalated' });
});

app.post('/api/incidents/:id/close', (req, res) => {
  const incident = incidentDetails[req.params.id];
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  incident.status = 'Closed';
  res.json({ success: true, message: 'Incident closed' });
});

app.post('/api/incidents/:id/feedback', (req, res) => {
  const { causeRank, feedback } = req.body;
  res.json({
    success: true,
    message: `Feedback recorded: cause ${causeRank} marked as ${feedback}`
  });
});

app.post('/api/incidents/:id/chat', (req, res) => {
  const { message } = req.body;
  const incident = incidentDetails[req.params.id];

  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  const lowerMsg = message.toLowerCase();
  let response = 'I can only answer questions about the selected incident ' + req.params.id + '.';

  if (/why|cause|happen|fail|down|link|interface|bgp|ospf|cpu|error/i.test(message)) {
    response = `Interface Gi0/1 on core-sw-07 went down at 09:41 and 19 downstream alerts followed within 2 minutes, so the link failure is the most likely origin. Evidence: syslog 09:41:12 LINK-3-UPDOWN, alert A-20431, metric ifOperStatus=down`;
  }

  res.json({
    success: true,
    message: response
  });
});

app.listen(PORT, () => {
  console.log(`NOC Assistant Backend running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
