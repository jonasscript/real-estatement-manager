const axios = require('axios');
const authService = require('./authService');

class MicrosoftService {
  constructor() {
    this.authority = 'https://login.microsoftonline.com';
    this.graphUrl = 'https://graph.microsoft.com/v1.0';
    this.scopes = ['openid', 'profile', 'email', 'User.Read'];
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

}

module.exports = new MicrosoftService();
