const { fetchCves } = require('./nvd');
const Cve = require('../models/Cve');

const normalizeCve = (nvdItem) => {
  const cve = nvdItem.cve;
  
  const englishDesc = cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description';
  
  const cvssData = {
    v3: null,
    v2: null
  };

  const v3Metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0];
  if (v3Metrics) {
    cvssData.v3 = {
      baseScore: Number(v3Metrics.cvssData.baseScore),
      severity: v3Metrics.cvssData.baseSeverity,
      vector: v3Metrics.cvssData.vectorString
    };
  }

  const v2Metrics = cve.metrics?.cvssMetricV2?.[0];
  if (v2Metrics) {
    cvssData.v2 = {
      baseScore: Number(v2Metrics.cvssData.baseScore),
      severity: v2Metrics.baseSeverity,
      vector: v2Metrics.cvssData.vectorString
    };
  }

  return {
    _id: cve.id,
    published: new Date(cve.published),
    lastModified: new Date(cve.lastModified),
    descriptions: englishDesc,
    cvss: cvssData
  };
};

const upsertCve = async (cveData) => {
  await Cve.updateOne(
    { _id: cveData._id },
    { $set: cveData },
    { upsert: true }
  );
};

const fullSync = async (maxPages = 1) => {
  console.log(`Starting full sync (${maxPages} page(s))...`);
  let totalProcessed = 0;
  
  for (let page = 0; page < maxPages; page++) {
    const startIndex = page * 100;
    console.log(`Fetching page ${page + 1}, startIndex: ${startIndex}`);
    
    const data = await fetchCves({ 
      startIndex, 
      resultsPerPage: 100 
    });
    
    for (const item of data.vulnerabilities) {
      const normalized = normalizeCve(item);
      await upsertCve(normalized);
      totalProcessed++;
    }
    
    console.log(`Processed ${totalProcessed} CVEs so far`);
    
    if (startIndex + 100 >= data.totalResults) break;
  }
  
  console.log(`✓ Full sync complete: ${totalProcessed} CVEs processed`);
  return totalProcessed;
};

const incrementalSync = async (hours = 24) => {
  const now = new Date();
  const lastModEndDate = now.toISOString();
  const lastModStartDate = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  
  console.log(`Starting incremental sync (last ${hours}h)...`);
  let totalProcessed = 0;
  let startIndex = 0;
  
  while (true) {
    const data = await fetchCves({
      lastModStartDate,
      lastModEndDate,
      startIndex,
      resultsPerPage: 100
    });
    
    for (const item of data.vulnerabilities) {
      const normalized = normalizeCve(item);
      await upsertCve(normalized);
      totalProcessed++;
    }
    
    startIndex += 100;
    if (startIndex >= data.totalResults) break;
  }
  
  console.log(`✓ Incremental sync complete: ${totalProcessed} CVEs updated`);
  return totalProcessed;
};

module.exports = { normalizeCve, upsertCve, fullSync, incrementalSync };
