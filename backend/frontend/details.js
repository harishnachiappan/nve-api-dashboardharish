const getCveIdFromUrl = () => {
  const pathParts = window.location.pathname.split('/');
  return pathParts[pathParts.length - 1];
};

const fetchCveDetails = async () => {
  const cveId = getCveIdFromUrl();
  
  try {
    const response = await fetch(`/api/cves/${cveId}`);
    
    if (response.status === 404) {
      showError('CVE not found');
      return;
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch CVE details');
    }
    
    const cve = await response.json();
    renderDetails(cve);
  } catch (error) {
    showError(error.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
};

const renderDetails = (cve) => {
  document.getElementById('cveId').textContent = cve._id;
  document.getElementById('publishedDate').textContent = new Date(cve.published).toLocaleString();
  document.getElementById('lastModified').textContent = new Date(cve.lastModified).toLocaleString();
  document.getElementById('description').textContent = cve.descriptions;

  if (cve.cvss?.v3?.baseScore) {
    document.getElementById('cvssV3Section').style.display = 'block';
    document.getElementById('cvssV3Score').textContent = cve.cvss.v3.baseScore;
    
    const severity = cve.cvss.v3.severity;
    const severitySpan = document.getElementById('cvssV3Severity');
    severitySpan.textContent = severity;
    severitySpan.className = `severity-${severity.toLowerCase()}`;
    
    document.getElementById('cvssV3Vector').textContent = cve.cvss.v3.vector || 'N/A';
  }

  if (cve.cvss?.v2?.baseScore) {
    document.getElementById('cvssV2Section').style.display = 'block';
    document.getElementById('cvssV2Score').textContent = cve.cvss.v2.baseScore;
    
    const severity = cve.cvss.v2.severity;
    const severitySpan = document.getElementById('cvssV2Severity');
    severitySpan.textContent = severity;
    severitySpan.className = `severity-${severity.toLowerCase()}`;
    
    document.getElementById('cvssV2Vector').textContent = cve.cvss.v2.vector || 'N/A';
  }

  document.getElementById('detailCard').style.display = 'block';
};

const showError = (message) => {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
};

fetchCveDetails();
