const axios = require('axios');
const authService = require('./authService');
const { query } = require('../config/database');

class MicrosoftService {
  constructor() {
    this.authority = 'https://login.microsoftonline.com';
    this.graphUrl = 'https://graph.microsoft.com/v1.0';
    this.scopes = ['openid', 'profile', 'email', 'offline_access', 'User.Read', 'Mail.Send'];
  }

  get tenantId() {
    return process.env.MICROSOFT_TENANT_ID || 'common';
  }

  get clientId() {
    return process.env.MICROSOFT_CLIENT_ID;
  }

  get clientSecret() {
    return process.env.MICROSOFT_CLIENT_SECRET;
  }

  get redirectUri() {
    return process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback';
  }

  get frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:4200';
  }

  assertConfigured() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Microsoft OAuth is not configured');
    }
  }

  buildAuthorizationUrl(state) {
    this.assertConfigured();
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: this.scopes.join(' '),
      state,
      prompt: 'select_account',
    });

    return `${this.authority}/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    this.assertConfigured();
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
    });

    const { data } = await axios.post(
      `${this.authority}/${this.tenantId}/oauth2/v2.0/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return data;
  }

  async refreshAccessToken(userId) {
    const stored = await query(
      'SELECT microsoft_refresh_token FROM users WHERE id = $1',
      [userId]
    );

    const refreshToken = stored.rows[0]?.microsoft_refresh_token;
    if (!refreshToken) {
      throw new Error('Microsoft session not connected');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
    });

    const { data } = await axios.post(
      `${this.authority}/${this.tenantId}/oauth2/v2.0/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const expiresAt = data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000)
      : null;

    await query(
      `UPDATE users
       SET microsoft_access_token = $1,
           microsoft_refresh_token = COALESCE($2, microsoft_refresh_token),
           microsoft_token_expires_at = $3,
           microsoft_scopes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        data.access_token,
        data.refresh_token || null,
        expiresAt,
        data.scope || null,
        userId,
      ]
    );

    return data.access_token;
  }

  async getProfile(accessToken) {
    const { data } = await axios.get(`${this.graphUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return data;
  }

  async loginWithCode(code) {
    const tokens = await this.exchangeCodeForTokens(code);
    const profile = await this.getProfile(tokens.access_token);
    return authService.authenticateMicrosoftUser(profile, tokens);
  }

  async getValidAccessToken(userId) {
    this.assertConfigured();
    const result = await query(
      `SELECT microsoft_access_token, microsoft_refresh_token, microsoft_token_expires_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user?.microsoft_access_token) {
      throw new Error('Microsoft session not connected');
    }

    const expiresAt = user.microsoft_token_expires_at
      ? new Date(user.microsoft_token_expires_at).getTime()
      : 0;

    if (expiresAt && expiresAt > Date.now() + 60000) {
      return user.microsoft_access_token;
    }

    return this.refreshAccessToken(userId);
  }

  async sendMail(userId, message) {
    const accessToken = await this.getValidAccessToken(userId);

    await axios.post(
      `${this.graphUrl}/me/sendMail`,
      {
        message,
        saveToSentItems: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

module.exports = new MicrosoftService();
