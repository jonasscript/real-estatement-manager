const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary.
   * @param {Buffer} fileBuffer
   * @param {string} originalName
   * @param {string} mimetype
   * @returns {Promise<{ secure_url: string, public_id: string }>}
   */
  uploadBuffer(fileBuffer, originalName, mimetype) {
    const folder = process.env.CLOUDINARY_FOLDER || 'payment-proofs';
    const resourceType = mimetype === 'application/pdf' ? 'raw' : 'image';
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${folder}/${Date.now()}-${baseName}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  deleteByPublicId(publicId, resourceType = 'image') {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}

module.exports = new CloudinaryService();
