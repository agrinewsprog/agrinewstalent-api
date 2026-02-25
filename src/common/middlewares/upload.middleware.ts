import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ROOT = path.join(__dirname, '..', '..', '..', 'public', 'uploads');

function makeStorage(subdir: string, prefix: string) {
  const dest = path.join(ROOT, subdir);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}-${Date.now()}${ext}`);
    },
  });
}

export const uploadAvatar = multer({
  storage: makeStorage('avatars', 'avatar'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
    }
  },
});

export const uploadResume = multer({
  storage: makeStorage('resumes', 'resume'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
});
