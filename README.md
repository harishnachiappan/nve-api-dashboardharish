# NVD CVE Dashboard

A full-stack application for fetching, storing, and displaying CVE (Common Vulnerabilities and Exposures) data from the National Vulnerability Database (NVD).

## Features

- **Data Ingestion**: Automated fetching from NVD API with pagination support
- **Data Cleansing**: Normalization, de-duplication, and CVSS score preference (v3 over v2)
- **Periodic Sync**: Daily incremental sync via cron scheduler
- **Search & Filter**: Multiple filter options (ID, year, score, modified date, keyword)
- **Server-side Pagination**: Configurable results per page (10/50/100)
- **Server-side Sorting**: Sort by published or modified date (ascending/descending)
- **Responsive UI**: Clean, modern interface with detail view

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Installation

1. **Clone and navigate to project**:
   ```bash
   cd nvd-cve-dashboard
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**:
   Create `backend/.env`:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/nvd_cves
   PORT=5000
   ```

4. **Start MongoDB** (if local):
   ```bash
   mongod
   ```

5. **Run the application**:
   ```bash
   npm run dev
   ```

6. **Access the dashboard**:
   Open http://localhost:5000

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### 1. List CVEs
```
GET /api/cves
```

**Query Parameters** (all optional):

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `id` | string | Filter by CVE ID | `CVE-2024-1234` |
| `year` | string | Filter by publication year (YYYY) | `2024` |
| `scoreMin` | number | Minimum CVSS score (0-10) | `7.5` |
| `scoreVer` | string | CVSS version (`v2` or `v3`) | `v3` |
| `modifiedLastDays` | number | CVEs modified in last N days | `30` |
| `keyword` | string | Search in description | `windows` |
| `page` | number | Page number (default: 1) | `2` |
| `limit` | number | Results per page (10/50/100, default: 10) | `50` |
| `sort` | string | Sort field (`published`, `-published`, `lastModified`, `-lastModified`) | `-published` |

**Response** (200 OK):
```json
{
  "total": 12345,
  "page": 1,
  "limit": 10,
  "results": [
    {
      "_id": "CVE-2024-1234",
      "published": "2024-01-15T10:30:00.000Z",
      "lastModified": "2024-02-20T15:45:00.000Z",
      "descriptions": "A vulnerability in...",
      "cvss": {
        "v3": {
          "baseScore": 9.8,
          "severity": "CRITICAL",
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        },
        "v2": {
          "baseScore": 7.5,
          "severity": "HIGH",
          "vector": "AV:N/AC:L/Au:N/C:P/I:P/A:P"
        }
      }
    }
  ]
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid query parameters",
  "details": [...]
}
```

#### 2. Get CVE by ID
```
GET /api/cves/:id
```

**Parameters**:
- `id` (path): CVE identifier (e.g., `CVE-2024-1234`)

**Response** (200 OK):
```json
{
  "_id": "CVE-2024-1234",
  "published": "2024-01-15T10:30:00.000Z",
  "lastModified": "2024-02-20T15:45:00.000Z",
  "descriptions": "A vulnerability in...",
  "cvss": { ... }
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "CVE not found"
}
```

#### 3. Health Check
```
GET /api/health
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Architecture

### Backend Stack
- **Node.js + Express**: REST API server
- **MongoDB + Mongoose**: Database and ODM
- **Axios**: HTTP client for NVD API
- **Zod**: Input validation
- **node-cron**: Scheduled jobs

### Frontend Stack
- **Vanilla JavaScript**: No framework dependencies
- **HTML5 + CSS3**: Responsive design

### Data Flow
```
NVD API → Ingestion Service → Normalization → MongoDB → REST API → Frontend
                ↓
         Scheduler (Daily)
```

## Database Schema

**Collection**: `cves`

```javascript
{
  _id: "CVE-2024-1234",           // Primary key
  published: ISODate,              // Indexed
  lastModified: ISODate,           // Indexed
  descriptions: String,
  cvss: {
    v3: {
      baseScore: Number,           // Indexed
      severity: String,
      vector: String
    },
    v2: {
      baseScore: Number,
      severity: String,
      vector: String
    }
  }
}
```

## Testing

Run unit tests:
```bash
npm test
```

Tests cover:
- CVE normalization (English description, CVSS preference)
- Date parsing
- Missing data handling

## Scheduler

The application runs a daily incremental sync at **00:30** to fetch CVEs modified in the last 24 hours.

To manually trigger a full sync, modify `src/server.js` and call:
```javascript
await fullSync(10); // Fetch 10 pages
```

## Security Features

- ✅ Input validation with Zod
- ✅ No credentials in code (environment variables)
- ✅ Safe error messages (no stack traces exposed)
- ✅ MongoDB injection prevention via Mongoose
- ✅ CORS enabled for cross-origin requests

## Project Structure

```
nvd-cve-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── Cve.js
│   │   ├── routes/
│   │   │   └── cves.js
│   │   ├── services/
│   │   │   ├── nvd.js
│   │   │   ├── ingest.js
│   │   │   └── ingest.test.js
│   │   ├── db.js
│   │   ├── scheduler.js
│   │   └── server.js
│   ├── .env
│   ├── package.json
│   └── jest.config.js
└── frontend/
    ├── index.html
    ├── cves-list.html
    ├── cve-details.html
    ├── styles.css
    ├── list.js
    └── details.js
```

## Deployment

### MongoDB Atlas
1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string
3. Update `.env`: `MONGODB_URI=mongodb+srv://...`

### Backend Hosting (Render/Railway/Fly.io)
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

### Frontend
Frontend is served by Express as static files (already configured).

## Future Enhancements

- CSV export functionality
- Email alerts for critical CVEs
- Charts and analytics dashboard
- Full-text search with Elasticsearch
- Rate limiting for public API
- OpenAPI/Swagger documentation

## License

ISC

## Author

**Harish Nachiappan R**
