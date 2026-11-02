/**
 * Filter and sort incidents by severity, search query, and age
 * @param {Array} incidents - Array of incident objects
 * @param {string} severity - Severity filter ('critical', 'major', 'minor', or 'all')
 * @param {string} search - Search query to match against title, devices, or site
 * @returns {Array} Filtered and sorted incidents
 */
function filterIncidents(incidents, severity = 'all', search = '') {
  if (!Array.isArray(incidents)) {
    throw new TypeError('incidents must be an array');
  }

  let filtered = [...incidents];

  // Filter by severity
  if (severity && severity !== 'all') {
    if (!['critical', 'major', 'minor'].includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }
    filtered = filtered.filter(inc => inc.severity === severity);
  }

  // Filter by search query
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(inc =>
      inc.title.toLowerCase().includes(q) ||
      (inc.devices && inc.devices.some(d => d.toLowerCase().includes(q))) ||
      (inc.site && inc.site.toLowerCase().includes(q))
    );
  }

  // Sort by severity (critical first), then by age
  const severityOrder = { critical: 0, major: 1, minor: 2 };
  filtered.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.ageMinutes - b.ageMinutes;
  });

  return filtered;
}

module.exports = { filterIncidents };
