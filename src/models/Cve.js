const mongoose = require('mongoose');

const cveSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  published: { type: Date, required: true, index: true },
  lastModified: { type: Date, required: true, index: true },
  descriptions: { type: String, required: true },
  cvss: {
    v3: {
      baseScore: { type: Number, index: true },
      severity: String,
      vector: String
    },
    v2: {
      baseScore: Number,
      severity: String,
      vector: String
    }
  }
}, { _id: false });

module.exports = mongoose.model('Cve', cveSchema);
