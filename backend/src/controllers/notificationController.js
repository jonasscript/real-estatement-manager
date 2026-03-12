const notificationService = require('../services/notificationService');
const { validationResult } = require('express-validator');

class NotificationController {
  // Get user's notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
        type: req.query.type,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      };

      const notifications = await notificationService.getUserNotifications(userId, filters);

      res.json({
        message: 'Notifications retrieved successfully',
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({
        error: 'Failed to retrieve notifications'
      });
    }
  }

  // Get notification by ID
  async getNotificationById(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await notificationService.getNotificationById(notificationId, userId);

      res.json({
        message: 'Notification retrieved successfully',
        data: notification
      });
    } catch (error) {
      console.error('Get notification by ID error:', error);
      res.status(error.message === 'Notification not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve notification'
      });
    }
  }

  // Create notification
  async createNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const notificationData = {
        ...req.body,
        senderId: req.user.id
      };

      const notification = await notificationService.createNotification(notificationData);

      res.status(201).json({
        message: 'Notification created successfully',
        data: notification
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({
        error: error.message || 'Failed to create notification'
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await notificationService.markAsRead(notificationId, userId);

      res.json({
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(error.message === 'Notification not found' ? 404 : 500).json({
        error: error.message || 'Failed to mark notification as read'
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const result = await notificationService.markAllAsRead(userId);

      res.json({
        message: result.message
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        error: 'Failed to mark notifications as read'
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await notificationService.deleteNotification(notificationId, userId);

      res.json({
        message: 'Notification deleted successfully',
        data: notification
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(error.message === 'Notification not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete notification'
      });
    }
  }

  // Get notification statistics
  async getNotificationStatistics(req, res) {
    try {
      const userId = req.user.id;
      const statistics = await notificationService.getNotificationStatistics(userId);

      res.json({
        message: 'Notification statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get notification statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve notification statistics'
      });
    }
  }
}

module.exports = new NotificationController();