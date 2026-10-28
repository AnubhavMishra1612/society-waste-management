import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const defaultUploadDir = isVercel ? path.join('/tmp', 'uploads') : path.resolve(__dirname, '../../../uploads');
const uploadDir = process.env.LOCAL_UPLOAD_PATH || defaultUploadDir;
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn(`[SocietyClean] Note: upload directory ${uploadDir} could not be created (${err.message}).`);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('UNSUPPORTED_MEDIA_TYPE: Only JPEG, PNG and WebP images are permitted');
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    cb(error, false);
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter
});
