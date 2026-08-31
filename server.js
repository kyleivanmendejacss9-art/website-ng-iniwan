const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Kyle143';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'website-ng-iniwan',
        resource_type: 'auto'
    }
});

const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', async (req, res) => {
    try {
        const isAdmin = req.cookies.admin_auth === ADMIN_PASSWORD;
        const result = await cloudinary.search
            .expression('folder:website-ng-iniwan')
            .sort_by('created_at', 'desc')
            .max_results(30)
            .execute();
        
        res.render('index', { files: result.resources || [], isAdmin, error: req.query.error });
    } catch (err) {
        console.error(err);
        res.render('index', { files: [], isAdmin: false, error: null });
    }
});

app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie('admin_auth', ADMIN_PASSWORD, { httpOnly: true, secure: true, maxAge: 86400000 });
        res.redirect('/');
    } else {
        res.redirect('/?error=Incorrect+Password');
    }
});

app.get('/admin-logout', (req, res) => {
    res.clearCookie('admin_auth');
    res.redirect('/');
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (req.cookies.admin_auth !== ADMIN_PASSWORD) {
        return res.status(403).send("Access Denied: Admin privileges required to upload.");
    }
    res.redirect('/');
});

app.post('/delete', async (req, res) => {
    if (req.cookies.admin_auth !== ADMIN_PASSWORD) {
        return res.status(403).send("Access Denied: Admin privileges required to delete.");
    }
    try {
        const { public_id, resource_type } = req.body;
        await cloudinary.uploader.destroy(public_id, { resource_type: resource_type || 'auto' });
    } catch (err) {
        console.error("Error deleting file:", err);
    }
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
