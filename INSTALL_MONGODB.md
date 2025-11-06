# Install MongoDB Locally (Windows)

## Method 1: Download Installer (Recommended)

1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0.x (latest)
   - Platform: Windows
   - Package: MSI
3. Click **Download**
4. Run the installer
5. Choose **Complete** installation
6. Check **"Install MongoDB as a Service"**
7. Click **Install**

## Method 2: Using Chocolatey

If you have Chocolatey installed:
```bash
choco install mongodb
```

## After Installation

### Start MongoDB:
```bash
# Option A: If installed as service (automatic)
net start MongoDB

# Option B: Manual start
mongod --dbpath C:\data\db
```

### Create data directory (if needed):
```bash
mkdir C:\data\db
```

### Update .env file:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nvd_cves
```

### Test connection:
```bash
mongosh
```

## Verify MongoDB is Running

```bash
netstat -an | findstr :27017
```

You should see: `TCP    127.0.0.1:27017`
