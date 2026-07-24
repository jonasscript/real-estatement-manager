const microsoftService = require('./microsoftService');
const { query } = require('../config/database');

class PaymentEmailService {
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async getInstallmentEmailData(installmentId) {
    const result = await query(
      `SELECT i.id,
              i.installment_number,
              i.amount,
              i.due_date,
              i.status,
              c.id AS client_id,
              c.assigned_seller_id,
              u.email AS client_email,
              u.first_name AS client_first_name,
              u.last_name AS client_last_name,
              pp.real_estate_id,
              re.name AS real_estate_name,
              pm.name AS model_name,
              unit.identifier AS unit_identifier,
              CONCAT(ph.name, ' / ', b.name, ' - ', unit.identifier) AS full_location,
              seller_user.id AS assigned_seller_user_id
       FROM installments i
       JOIN clients c ON i.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN property_purchases pp ON i.property_purchase_id = pp.id
       LEFT JOIN real_estates re ON pp.real_estate_id = re.id
       LEFT JOIN properties p ON pp.property_id = p.id
       LEFT JOIN units unit ON p.unit_id = unit.id
       LEFT JOIN blocks b ON unit.block_id = b.id
       LEFT JOIN phases ph ON b.phase_id = ph.id
       LEFT JOIN property_models pm ON p.property_model_id = pm.id
       LEFT JOIN sellers seller ON c.assigned_seller_id = seller.id
       LEFT JOIN users seller_user ON seller.user_id = seller_user.id
       WHERE i.id = $1`,
      [installmentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Installment not found');
    }

    return result.rows[0];
  }

  canSendEmailForInstallment(data, user) {
    if (user.role_name === 'system_admin') {
      return true;
    }

    if (user.role_name === 'real_estate_admin') {
      return Number(data.real_estate_id) === Number(user.real_estate_id || user.realEstateId);
    }

    if (user.role_name === 'seller') {
      return Number(data.assigned_seller_user_id) === Number(user.id);
    }

    return false;
  }

  buildMessage(data) {
    const dueDate = new Date(data.due_date).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const amount = Number(data.amount).toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD',
    });
    const statusLabels = {
      pending: 'Pendiente',
      overdue: 'Vencida',
      late: 'Atrasada',
      pending_approval: 'En revision',
      paid: 'Pagada',
    };
    const clientName = this.escapeHtml(`${data.client_first_name} ${data.client_last_name}`.trim());
    const propertyName = this.escapeHtml(data.model_name || 'Propiedad');
    const propertyLocation = this.escapeHtml(data.full_location || '');
    const realEstateName = this.escapeHtml(data.real_estate_name || 'la inmobiliaria');
    const installmentNumber = this.escapeHtml(data.installment_number);
    const statusLabel = this.escapeHtml(statusLabels[data.status] || data.status || 'Pendiente');
    const propertyBlock = data.full_location
      ? `
        <tr>
          <td style="padding: 14px 0; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 5px;">Propiedad</div>
            <div style="font-size: 15px; font-weight: 700; color: #111827;">${propertyName}</div>
            <div style="font-size: 13px; color: #4b5563; margin-top: 3px;">${propertyLocation}</div>
          </td>
        </tr>
      `
      : '';

    return {
      subject: `Recordatorio de pago - Cuota #${data.installment_number}`,
      body: {
        contentType: 'HTML',
        content: `
          <!doctype html>
          <html>
            <body style="margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif; color: #111827;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f3f4f6; padding: 28px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);">
                      <tr>
                        <td style="background: #0f766e; padding: 28px 30px;">
                          <div style="font-size: 13px; color: #ccfbf1; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;">Recordatorio de pago</div>
                          <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 26px; line-height: 1.25; font-weight: 800;">Cuota #${installmentNumber}</h1>
                          <p style="margin: 8px 0 0; color: #ecfeff; font-size: 15px; line-height: 1.5;">${realEstateName}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 30px;">
                          <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.6;">Hola <strong>${clientName}</strong>,</p>
                          <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #374151;">
                            Te compartimos el detalle de tu cuota para que puedas revisar el vencimiento y realizar el pago correspondiente.
                          </p>

                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; margin: 0 0 22px;">
                            <tr>
                              <td style="padding: 18px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px;">Monto a pagar</div>
                                <div style="font-size: 30px; line-height: 1; font-weight: 800; color: #0f766e;">${amount}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 18px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="50%" style="padding: 16px 12px 16px 0; border-bottom: 1px solid #e5e7eb;">
                                      <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 5px;">Vencimiento</div>
                                      <div style="font-size: 15px; font-weight: 700; color: #111827;">${dueDate}</div>
                                    </td>
                                    <td width="50%" style="padding: 16px 0 16px 12px; border-bottom: 1px solid #e5e7eb;">
                                      <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 5px;">Estado</div>
                                      <span style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 13px; font-weight: 700;">${statusLabel}</span>
                                    </td>
                                  </tr>
                                  ${propertyBlock}
                                </table>
                              </td>
                            </tr>
                          </table>

                          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px;">
                            <div style="font-size: 14px; line-height: 1.6; color: #065f46;">
                              Si ya realizaste el pago, por favor comunicate con tu asesor o comparte el comprobante para actualizar tu estado.
                            </div>
                          </div>

                          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #374151;">
                            Saludos,<br>
                            <strong>${realEstateName}</strong>
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 16px 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                            Este correo fue enviado como recordatorio de una cuota registrada en el sistema de pagos inmobiliarios.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      },
      toRecipients: [
        {
          emailAddress: {
            address: data.client_email,
            name: clientName,
          },
        },
      ],
    };
  }

  async sendInstallmentEmail(installmentId, senderUser) {
    const data = await this.getInstallmentEmailData(installmentId);

    if (!this.canSendEmailForInstallment(data, senderUser)) {
      throw new Error('Access denied to this installment');
    }

    if (!data.client_email) {
      throw new Error('Client email not available');
    }

    const message = this.buildMessage(data);
    await microsoftService.sendMail(senderUser.id, message);

    const insertResult = await query(
      `INSERT INTO payment_email_logs (
         installment_id, client_id, sent_by, recipient_email, subject, status, sent_at
       )
       VALUES ($1, $2, $3, $4, $5, 'sent', CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        data.id,
        data.client_id,
        senderUser.id,
        data.client_email,
        message.subject,
      ]
    );

    return insertResult.rows[0];
  }
}

module.exports = new PaymentEmailService();
