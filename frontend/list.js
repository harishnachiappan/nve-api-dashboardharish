let currentPage = 1;
let currentFilters = {};

const fetchCves = async () => {
  const limit = document.getElementById('resultsPerPage').value;
  const sort = document.getElementById('sortBy').value;
  
  const params = new URLSearchParams({
    page: currentPage,
    limit,
    sort,
    ...currentFilters
  });

  showLoading(true);
  hideError();

  try {
    const response = await fetch(`/api/cves?${params}`);
    if (!response.ok) throw new Error('Failed to fetch CVEs');
    
    const data = await response.json();
    renderTable(data.results);
    renderPagination(data.total, data.page, data.limit);
    document.getElementById('totalRecords').textContent = data.total;
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
};

const renderTable = (cves) => {
  const tbody = document.getElementById('cveTableBody');
  tbody.innerHTML = '';
  
  if (cves.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No CVEs found</td></tr>';
    document.getElementById('cveTable').style.display = 'table';
    return;
  }

  cves.forEach(cve => {
    const row = document.createElement('tr');
    
    const score = cve.cvss?.v3?.baseScore || cve.cvss?.v2?.baseScore || 'N/A';
    const severity = cve.cvss?.v3?.severity || cve.cvss?.v2?.severity || 'N/A';
    const severityClass = `severity-${severity.toLowerCase()}`;
    const version = cve.cvss?.v3?.baseScore != null ? 'v3' : cve.cvss?.v2?.baseScore != null ? 'v2' : '';
    
    const description = cve.descriptions.length > 100 
      ? cve.descriptions.substring(0, 100) + '...' 
      : cve.descriptions;

    row.innerHTML = `
      <td><strong>${cve._id}</strong></td>
      <td>${new Date(cve.published).toLocaleDateString()}</td>
      <td>${new Date(cve.lastModified).toLocaleDateString()}</td>
      <td>${score}${version ? ' (' + version + ')' : ''}</td>
      <td><span class="${severityClass}">${severity}</span></td>
      <td>${description}</td>
    `;
    
    row.addEventListener('click', () => {
      window.location.href = `/cves/${cve._id}`;
    });
    
    tbody.appendChild(row);
  });

  document.getElementById('cveTable').style.display = 'table';
};

const renderPagination = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = page <= 1;
  prevBtn.addEventListener('click', () => {
    currentPage--;
    fetchCves();
  });
  pagination.appendChild(prevBtn);

  const pageInfo = document.createElement('span');
  pageInfo.textContent = `Page ${page} of ${totalPages || 1}`;
  pageInfo.style.padding = '0 15px';
  pagination.appendChild(pageInfo);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = page >= totalPages || totalPages === 0;
  nextBtn.addEventListener('click', () => {
    currentPage++;
    fetchCves();
  });
  pagination.appendChild(nextBtn);
};

const showLoading = (show) => {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('cveTable').style.display = show ? 'none' : 'table';
};

const showError = (message) => {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
};

const hideError = () => {
  document.getElementById('errorMessage').style.display = 'none';
};

document.getElementById('applyFilters').addEventListener('click', () => {
  currentFilters = {};
  
  const cveId = document.getElementById('filterCveId').value.trim();
  if (cveId) currentFilters.id = cveId;
  
  const year = document.getElementById('filterYear').value.trim();
  if (year) currentFilters.year = year;
  
  const scoreMin = document.getElementById('filterScoreMin').value.trim();
  if (scoreMin) {
    currentFilters.scoreMin = scoreMin;
    currentFilters.scoreVer = document.getElementById('filterScoreVer').value;
  }
  
  const modifiedDays = document.getElementById('filterModifiedDays').value.trim();
  if (modifiedDays) currentFilters.modifiedLastDays = modifiedDays;
  
  const keyword = document.getElementById('filterKeyword').value.trim();
  if (keyword) currentFilters.keyword = keyword;
  
  currentPage = 1;
  fetchCves();
});

document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('filterCveId').value = '';
  document.getElementById('filterYear').value = '';
  document.getElementById('filterScoreMin').value = '';
  document.getElementById('filterScoreVer').value = '';
  document.getElementById('filterModifiedDays').value = '';
  document.getElementById('filterKeyword').value = '';
  currentFilters = {};
  currentPage = 1;
  fetchCves();
});

document.getElementById('resultsPerPage').addEventListener('change', () => {
  currentPage = 1;
  fetchCves();
});

document.getElementById('sortBy').addEventListener('change', () => {
  fetchCves();
});

fetchCves();
