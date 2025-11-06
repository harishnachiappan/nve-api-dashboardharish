const { normalizeCve } = require('./ingest');

describe('CVE Normalization', () => {
  test('should extract English description', () => {
    const nvdItem = {
      cve: {
        id: 'CVE-2024-1234',
        published: '2024-01-01T00:00:00.000',
        lastModified: '2024-01-02T00:00:00.000',
        descriptions: [
          { lang: 'es', value: 'Descripción en español' },
          { lang: 'en', value: 'English description' }
        ],
        metrics: {}
      }
    };

    const result = normalizeCve(nvdItem);
    expect(result.descriptions).toBe('English description');
  });

  test('should prefer CVSS v3 over v2', () => {
    const nvdItem = {
      cve: {
        id: 'CVE-2024-1234',
        published: '2024-01-01T00:00:00.000',
        lastModified: '2024-01-02T00:00:00.000',
        descriptions: [{ lang: 'en', value: 'Test' }],
        metrics: {
          cvssMetricV31: [{
            cvssData: {
              baseScore: 9.8,
              baseSeverity: 'CRITICAL',
              vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
            }
          }],
          cvssMetricV2: [{
            cvssData: {
              baseScore: 7.5,
              vectorString: 'AV:N/AC:L/Au:N/C:P/I:P/A:P'
            },
            baseSeverity: 'HIGH'
          }]
        }
      }
    };

    const result = normalizeCve(nvdItem);
    expect(result.cvss.v3.baseScore).toBe(9.8);
    expect(result.cvss.v3.severity).toBe('CRITICAL');
    expect(result.cvss.v2.baseScore).toBe(7.5);
  });

  test('should handle missing CVSS data', () => {
    const nvdItem = {
      cve: {
        id: 'CVE-2024-1234',
        published: '2024-01-01T00:00:00.000',
        lastModified: '2024-01-02T00:00:00.000',
        descriptions: [{ lang: 'en', value: 'Test' }],
        metrics: {}
      }
    };

    const result = normalizeCve(nvdItem);
    expect(result.cvss.v3).toBeNull();
    expect(result.cvss.v2).toBeNull();
  });

  test('should parse dates correctly', () => {
    const nvdItem = {
      cve: {
        id: 'CVE-2024-1234',
        published: '2024-01-15T10:30:00.000',
        lastModified: '2024-02-20T15:45:00.000',
        descriptions: [{ lang: 'en', value: 'Test' }],
        metrics: {}
      }
    };

    const result = normalizeCve(nvdItem);
    expect(result.published).toBeInstanceOf(Date);
    expect(result.lastModified).toBeInstanceOf(Date);
    expect(result.published.getFullYear()).toBe(2024);
  });
});
