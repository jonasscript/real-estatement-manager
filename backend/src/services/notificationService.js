const { query } = require('../config/database');

class NotificationService {
  // Get user notifications
  async getUserNotifications(userId, filters = {}) {
    try {
      let queryText = `
        SELECT n.*, u.first_name as sender_first_name, u.last_name as sender_last_name
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.recipient_id = $1
      `;
      const queryParams = [userId];
      let paramIndex = 2;

      // Add filters
      if (filters.isRead !== undefined) {
        queryText += ` AND n.is_read = $${paramIndex}`;
        queryParams.push(filters.isRead);
        paramIndex++;
      }

      if (filters.type) {
        queryText += ` AND n.type = $${paramIndex}`;
        queryParams.push(filters.type);
        paramIndex++;
      }

      queryText += ' ORDER BY n.created_at DESC';

      if (filters.limit) {
        queryText += ` LIMIT $${paramIndex}`;
        queryParams.push(filters.limit);
      }

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get notification by ID
  async getNotificationById(notificationId, userId) {
    try {
      const queryText = `
        SELECT n.*, u.first_name as sender_first_name, u.last_name as sender_last_name
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.id = $1 AND n.recipient_id = $2
      `;
      const result = await query(queryText, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create notification
  async createNotification(notificationData) {
    try {
      const { recipientId, senderId, type, title, message, relatedClientId, relatedPaymentId } = notificationData;

      const insertQuery = `
        INSERT INTO notifications (
          recipient_id, sender_id, type, title, message,
          related_client_id, related_payment_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await query(insertQuery, [
        recipientId, senderId, type, title, message, relatedClientId, relatedPaymentId
      ]);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const updateQuery = `
        UPDATE notifications
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND recipient_id = $2
        RETURNING *
      `;
      const result = await query(updateQuery, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const updateQuery = `
        UPDATE notifications
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE recipient_id = $1 AND is_read = false
      `;
      const result = await query(updateQuery, [userId]);

      return { message: `${result.rowCount} notifications marked as read` };
    } catch (error) {
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const deleteQuery = 'DELETE FROM notifications WHERE id = $1 AND recipient_id = $2 RETURNING *';
      const result = await query(deleteQuery, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStatistics(userId) {
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
          COUNT(CASE WHEN type = 'payment_uploaded' THEN 1 END) as payment_uploads,
          COUNT(CASE WHEN type = 'payment_approved' THEN 1 END) as payment_approvals,
          COUNT(CASE WHEN type = 'payment_rejected' THEN 1 END) as payment_rejections,
          COUNT(CASE WHEN type = 'payment_overdue' THEN 1 END) as overdue_alerts
        FROM notifications
        WHERE recipient_id = $1
      `;

      const result = await query(statsQuery, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create bulk notifications
  async createBulkNotifications(notifications) {
    try {
      if (notifications.length === 0) return [];

      const values = [];
      const params = [];
      let paramIndex = 1;

      notifications.forEach(notification => {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
        params.push(
          notification.recipientId,
          notification.senderId,
          notification.type,
          notification.title,
          notification.message,
          notification.relatedClientId || null,
          notification.relatedPaymentId || null
        );
        paramIndex += 7;
      });

      const insertQuery = `
        INSERT INTO notifications (
          recipient_id, sender_id, type, title, message,
          related_client_id, related_payment_id
        )
        VALUES ${values.join(', ')}
        RETURNING *
      `;

      const result = await query(insertQuery, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Clean up old notifications (for maintenance)
  async cleanupOldNotifications(daysOld = 90) {
    try {
      const deleteQuery = `
        DELETE FROM notifications
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
        AND is_read = true
      `;
      const result = await query(deleteQuery);

      return { message: `${result.rowCount} old notifications deleted` };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new NotificationService();