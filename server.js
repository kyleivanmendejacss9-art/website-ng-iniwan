const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cookieParser = require('cookie-parser');

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const ADMIN_PASSWORD = 'Kyle143';

// In-memory visitor analytics logs store
const visitorLogs = [];

// Advanced parser to extract real device models and OS
function parseDevice(userAgent = '') {
  if (/windows nt/i.test(userAgent)) return 'Windows PC';
  if (/macintosh|mac os x/i.test(userAgent)) return 'Mac OS PC';
  if (/ipad/i.test(userAgent)) return 'iPad Tablet';
  if (/iphone/i.test(userAgent)) return 'iPhone';

  // Extract Android specific model identifiers from User-Agent string
  if (/android/i.test(userAgent)) {
    const match = userAgent.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const parts = match[1].split(';');
      for (let part of parts) {
        part = part.trim();
        if (
          !part.startsWith('Linux') &&
          !part.startsWith('Android') &&
          !part.includes('Build') &&
          !part.includes('Mobile') &&
          !part.includes('Safari') &&
          !part.includes('AppleWebKit') &&
          part.length > 1
        ) {
          return part.replace(/\/.*$/, '').trim();
        }
      }
    }
    return 'Android Mobile';
  }

  if (/mobile/i.test(userAgent)) return 'Mobile Device';
  return 'Desktop Browser';
}

// Helper to record visitor activity
function recordActivity(req, action) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
  const userAgent = req.headers['user-agent'] || '';
  const device = parseDevice(userAgent);
  const now = new Date();
  
  const timestamp = now.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  });

  const recent = visitorLogs[0];
  if (recent && recent.ip === ip && recent.action === action && (now - new Date(recent.rawTime) < 2000)) {
    return;
  }

  visitorLogs.unshift({
    ip: ip.replace(/^.*:/, ''),
    device,
    action,
    timestamp,
    rawTime: now
  });

  if (visitorLogs.length > 50) visitorLogs.pop();
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let resourceType = 'auto';
    if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else {
      resourceType = 'raw';
    }

    return {
      folder: 'website-ng-iniwan',
      resource_type: resourceType,
      quality: 'auto:eco',
      fetch_format: 'auto',
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' }
      ]
    };
  }
});

const upload = multer({ storage: storage });

const requireAdmin = (req, res, next) => {
  if (req.cookies.isAdmin === 'true') {
    next();
  } else {
    res.redirect('/?error=Unauthorized');
  }
};

// Home Route - Logs visits and refreshes
app.get('/', async (req, res) => {
  const isAdmin = req.cookies.isAdmin === 'true';
  const error = req.query.error;

  recordActivity(req, 'Opened / Refreshed Website');

  try {
    const result = await cloudinary.search
      .expression('folder:website-ng-iniwan')
      .sort_by('created_at', 'desc')
      .max_results(30)
      .execute();

    let totalBytes = 0;
    result.resources.forEach(file => {
      totalBytes += file.bytes || 0;
    });
    const totalStorageMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const storageLimitMB = 100;
    const storagePercent = Math.min(100, (totalStorageMB / storageLimitMB) * 100).toFixed(1);

    res.render('index', { 
      files: result.resources, 
      isAdmin, 
      error, 
      totalStorageMB, 
      storageLimitMB, 
      storagePercent,
      visitorLogs: isAdmin ? visitorLogs : [] 
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.render('index', { files: [], isAdmin, error: 'Failed to load media.', totalStorageMB: '0.00', storageLimitMB: 100, storagePercent: 0, visitorLogs: [] });
  }
});

// Download tracking route
app.get('/track-download', (req, res) => {
  const { url, name } = req.query;
  if (url) {
    const fileName = name || 'Media File';
    recordActivity(req, `Downloaded: ${fileName}`);
    res.redirect(url);
  } else {
    res.redirect('/');
  }
});

app.post('/admin-login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.cookie('isAdmin', 'true', { httpOnly: true, maxAge: 86400000 });
    res.redirect('/');
  } else {
    res.redirect('/?error=Incorrect Password');
  }
});

app.get('/admin-logout', (req, res) => {
  res.clearCookie('isAdmin');
  res.redirect('/');
});

app.post('/upload', requireAdmin, upload.single('file'), (req, res) => {
  res.redirect('/');
});

app.post('/delete', requireAdmin, async (req, res) => {
  const { public_id, resource_type } = req.body;
  try {
    await cloudinary.uploader.destroy(public_id, { resource_type: resource_type || 'image' });
    res.redirect('/');
  } catch (err) {
    console.error('Delete error:', err);
    res.redirect('/?error=Failed to delete file');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
