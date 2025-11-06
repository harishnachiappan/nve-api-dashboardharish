const axios = require('axios');

const NVD_BASE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

const fetchCves = async (params = {}) => {
  try {
    const response = await axios.get(NVD_BASE_URL, { 
      params,
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error('NVD API error:', error.message);
    throw error;
  }
};

module.exports = { fetchCves };
