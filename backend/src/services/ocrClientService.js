const axios = require('axios');
const FormData = require('form-data');

class OcrClientService {
  constructor() {
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  async _getToken() {
    const now = Date.now();
    if (this._token && now < this._tokenExpiresAt) {
      return this._token;
    }

    const baseUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.OCR_CLIENT_ID || 'backend-client',
      client_secret: process.env.OCR_CLIENT_SECRET || 'super-secret-change-in-production',
    });

    const { data } = await axios.post(`${baseUrl}/auth/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    this._token = data.access_token;
    // Refresh 60 seconds before actual expiry
    this._tokenExpiresAt = now + (data.expires_in - 60) * 1000;
    return this._token;
  }

  /**
   * Send a file buffer to the OCR service for scanning.
   * @param {Buffer} fileBuffer
   * @param {string} filename
   * @param {string} mimetype
   * @returns {Promise<object>} OCR result with extracted_data
   */
  async scan(fileBuffer, filename, mimetype) {
    const baseUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
    const token = await this._getToken();

    const form = new FormData();
    form.append('file', fileBuffer, { filename, contentType: mimetype });

    const { data } = await axios.post(`${baseUrl}/ocr/scan`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
      timeout: 60000,
    });

    return data;
  }
}

module.exports = new OcrClientService();
