const express = require('express');
const { z } = require('zod');
const Cve = require('../models/Cve');

const router = express.Router();

const emptyToUndef = z.string().transform(s => (s?.trim() ? s : undefined));

const querySchema = z.object({
  id: emptyToUndef.optional(),
  keyword: emptyToUndef.optional(),
  year: emptyToUndef.refine(v => !v || /^\d{4}$/.test(v), { message: 'year must be YYYY' }).optional(),
  scoreMin: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(10).optional()),
  scoreVer: emptyToUndef.optional(),
  modifiedLastDays: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(1).optional()),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).optional(),
  limit: z.preprocess(v => Number(v ?? 10), z.number().int()).optional(),
  sort: emptyToUndef.optional()
});

const allowedLimits = [10, 50, 100, 200, 500];

function yearRangeUTC(y) {
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
  return { start, end };
}

router.get('/', async (req, res) => {
  try {
    const q = querySchema.parse(req.query);
    const filter = {};

    if (q.id) filter._id = q.id;

    if (q.keyword) filter.descriptions = { $regex: q.keyword, $options: 'i' };

    if (q.year) {
      const y = parseInt(q.year, 10);
      const { start, end } = yearRangeUTC(y);
      filter.$and = (filter.$and || []);
      filter.$and.push({
        $or: [
          { published: { $gte: start, $lt: end } },
          { _id: { $regex: `^CVE-${y}-`, $options: 'i' } }
        ]
      });
    }

    if (q.modifiedLastDays) {
      const since = new Date();
      since.setDate(since.getDate() - q.modifiedLastDays);
      filter.$and = (filter.$and || []);
      filter.$and.push({ lastModified: { $gte: since } });
    }

    if (typeof q.scoreMin === 'number') {
      const min = q.scoreMin;
      if (q.scoreVer === 'v2') {
        filter.$and = (filter.$and || []);
        filter.$and.push({ 'cvss.v2.baseScore': { $exists: true, $gte: min } });
      } else if (q.scoreVer === 'v3') {
        filter.$and = (filter.$and || []);
        filter.$and.push({ 'cvss.v3.baseScore': { $exists: true, $gte: min } });
      } else {
        filter.$and = (filter.$and || []);
        filter.$and.push({
          $or: [
            { 'cvss.v3.baseScore': { $exists: true, $gte: min } },
            { 'cvss.v2.baseScore': { $exists: true, $gte: min } }
          ]
        });
      }
    }

    if (filter.$and && filter.$and.length === 1) {
      const solo = filter.$and[0];
      delete filter.$and;
      Object.assign(filter, solo);
    }

    const limit = allowedLimits.includes(q.limit) ? q.limit : 10;
    const page = q.page ?? 1;
    const skip = (page - 1) * limit;

    const sortKey = q.sort || '-published';
    const sortField = sortKey.startsWith('-') ? sortKey.slice(1) : sortKey;
    const sortDir = sortKey.startsWith('-') ? -1 : 1;
    const sort = { [sortField]: sortDir };

    console.log('Built filter:', JSON.stringify(filter));

    const [results, total] = await Promise.all([
      Cve.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Cve.countDocuments(filter)
    ]);

    res.json({ total, page, limit, results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    console.error('Query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cve = await Cve.findById(req.params.id).lean();
    if (!cve) {
      return res.status(404).json({ error: 'CVE not found' });
    }
    res.json(cve);
  } catch (error) {
    console.error('Detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
