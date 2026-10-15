const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads/listings');

const save = async (buffer, { listingId, filename, mimeType }) => {
  const listingDir = path.join(UPLOADS_DIR, listingId.toString());
  await fs.mkdir(listingDir, { recursive: true });

  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const baseName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  const mainFilename = `${baseName}.webp`;
  const thumbFilename = `${baseName}-thumb.webp`;

  const mainPath = path.join(listingDir, mainFilename);
  const thumbPath = path.join(listingDir, thumbFilename);

  // Resize and convert to webp
  await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(mainPath);

  await sharp(buffer)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 60 })
    .toFile(thumbPath);

  return {
    url: `/uploads/listings/${listingId}/${mainFilename}`,
    thumbnailUrl: `/uploads/listings/${listingId}/${thumbFilename}`,
    key: `${listingId}/${baseName}`,
    width: 1600, // approximation
    height: 1200 // approximation
  };
};

const remove = async (key) => {
  try {
    const mainPath = path.join(UPLOADS_DIR, `${key}.webp`);
    const thumbPath = path.join(UPLOADS_DIR, `${key}-thumb.webp`);
    await fs.unlink(mainPath).catch(() => {});
    await fs.unlink(thumbPath).catch(() => {});
  } catch (e) {
    console.error('Local storage remove error:', e);
  }
};

module.exports = { save, remove };
