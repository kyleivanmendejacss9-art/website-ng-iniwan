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
      quality: 'auto',
      fetch_format: 'auto'
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

app.get('/', async (req, res) => {
  const isAdmin = req.cookies.isAdmin === 'true';
  const error = req.query.error;
  try {
    const result = await cloudinary.search
      .expression('folder:website-ng-iniwan')
      .sort_by('created_at', 'desc')
      .max_results(30)
      .execute();

    // Calculate total storage in MB
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
      storagePercent 
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.render('index', { files: [], isAdmin, error: 'Failed to load media.', totalStorageMB: '0.00', storageLimitMB: 100, storagePercent: 0 });
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
