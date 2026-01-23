const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, '../uploads/profile-photos');
const reportUploadDir = path.join(__dirname, '../uploads/reports');

if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

if (!fs.existsSync(reportUploadDir)) {
  fs.mkdirSync(reportUploadDir, { recursive: true });
}

// Configure storage for profile photos
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// Configure storage for report images
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `report-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, and PNG images are allowed'), false);
  }
};

// Configure multer instances
const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

const reportUpload = multer({
  storage: reportStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadProfilePhoto = profileUpload.single('profilePhoto');

// For report images, accept both 'image' and 'Image' (case-insensitive handling)
const uploadReportImage = (req, res, next) => {
  // Use .any() to accept any field name, then manually check for image file
  reportUpload.any()(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Find the image file (case-insensitive field name matching)
    let imageFile = null;
    
    if (req.files && req.files.length > 0) {
      // Find file with fieldname that matches 'image' (case-insensitive)
      imageFile = req.files.find(f => f.fieldname.toLowerCase() === 'image');
      
      // If no match found, use the first file (fallback for any field name)
      if (!imageFile) {
        imageFile = req.files[0];
        console.warn(`Warning: File uploaded with field name "${imageFile.fieldname}", expected "image"`);
      }
    }
    
    // Attach the file to req.file for compatibility with existing code
    req.file = imageFile;
    
    // Remove req.files to avoid confusion
    delete req.files;
    
    next();
  });
};

module.exports = {
  uploadProfilePhoto,
  uploadReportImage,
  profileUploadDir,
  reportUploadDir
};
