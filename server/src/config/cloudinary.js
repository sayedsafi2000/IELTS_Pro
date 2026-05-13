// ── FILE: server/src/config/cloudinary.js ──
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ielts/audio',
    resource_type: 'video',
    allowed_formats: ['mp3', 'wav', 'm4a', 'ogg'],
    transformation: [{ quality: 'auto' }],
  },
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ielts/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ielts/documents',
    resource_type: 'raw',
    allowed_formats: ['pdf'],
  },
});

const speakingStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ielts/speaking',
    resource_type: 'video',
    allowed_formats: ['mp3', 'wav', 'webm', 'ogg', 'm4a'],
  },
});

const uploadAudio    = multer({ storage: audioStorage });
const uploadImage    = multer({ storage: imageStorage });
const uploadDocument = multer({ storage: documentStorage });
const uploadSpeaking = multer({ storage: speakingStorage });

module.exports = {
  cloudinary,
  uploadAudio,
  uploadImage,
  uploadDocument,
  uploadSpeaking
};