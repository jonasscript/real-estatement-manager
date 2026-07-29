const nodemailer = require('nodemailer');

class SesEmailService {
  constructor() {
    this.transporter = null;
  }

  get region() {
    return process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1';
  }

  get host() {
    return process.env.EMAIL_HOST || process.env.AWS_SES_SMTP_HOST || `email-smtp.${this.region}.amazonaws.com`;
  }

  get port() {
    return Number(process.env.EMAIL_PORT || process.env.AWS_SES_SMTP_PORT || 587);
  }

  get defaultSenderDomain() {
    return process.env.AWS_SES_DOMAIN || 'nubbik.com';
  }

  get defaultSenderLocalPart() {
    return process.env.AWS_SES_FROM_LOCAL_PART || 'no-reply';
  }

  get defaultSenderName() {
    return process.env.AWS_SES_FROM_NAME || 'River Building';
  }

  get auth() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Amazon SES SMTP credentials are not configured');
    }

    return {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    };
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        requireTLS: this.port === 587,
        auth: this.auth,
      });
    }

    return this.transporter;
  }

  normalizeDomain(domain) {
    return String(domain || '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();
  }

  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  getEmailDomain(email) {
    return String(email || '').split('@')[1]?.toLowerCase() || '';
  }

  buildSourceAddress(senderName, senderEmail) {
    const cleanName = String(senderName || '').replace(/"/g, '').trim();
    return cleanName ? `"${cleanName}" <${senderEmail}>` : senderEmail;
  }

  buildDefaultSenderEmail() {
    const localPart = String(this.defaultSenderLocalPart || '').trim();
    const domain = this.normalizeDomain(this.defaultSenderDomain);

    if (!localPart || !domain) {
      throw new Error('Default SES sender is not configured');
    }

    return `${localPart}@${domain}`;
  }

  resolveSender({ senderName, senderEmail, senderDomain }) {
    if (senderEmail || senderDomain) {
      const normalizedEmail = this.normalizeEmail(senderEmail);
      const normalizedDomain = this.normalizeDomain(senderDomain);

      this.validateSender({
        senderEmail: normalizedEmail,
        senderDomain: normalizedDomain,
      });

      return {
        senderName,
        senderEmail: normalizedEmail,
        senderDomain: normalizedDomain,
        usedDefaultSender: false,
      };
    }

    const defaultSenderEmail = this.buildDefaultSenderEmail();
    const defaultSenderDomain = this.normalizeDomain(this.defaultSenderDomain);

    this.validateSender({
      senderEmail: defaultSenderEmail,
      senderDomain: defaultSenderDomain,
    });

    return {
      senderName: this.defaultSenderName,
      senderEmail: defaultSenderEmail,
      senderDomain: defaultSenderDomain,
      usedDefaultSender: true,
    };
  }

  validateSender({ senderEmail, senderDomain }) {
    const normalizedDomain = this.normalizeDomain(senderDomain);
    const emailDomain = this.getEmailDomain(senderEmail);

    if (!senderEmail || !normalizedDomain) {
      throw new Error('Real estate SES sender is not configured');
    }

    if (emailDomain !== normalizedDomain) {
      throw new Error('SES sender email must match the configured domain');
    }
  }

  async sendEmail({ senderName, senderEmail, senderDomain, to, subject, html, text, replyTo }) {
    const resolvedSender = this.resolveSender({ senderName, senderEmail, senderDomain });

    const result = await this.getTransporter().sendMail({
      from: this.buildSourceAddress(resolvedSender.senderName, resolvedSender.senderEmail),
      to,
      replyTo: replyTo || resolvedSender.senderEmail,
      subject,
      html,
      text: text || subject,
    });

    return {
      ...result,
      senderEmail: resolvedSender.senderEmail,
      senderDomain: resolvedSender.senderDomain,
      senderName: resolvedSender.senderName,
      usedDefaultSender: resolvedSender.usedDefaultSender,
    };
  }
}

module.exports = new SesEmailService();
