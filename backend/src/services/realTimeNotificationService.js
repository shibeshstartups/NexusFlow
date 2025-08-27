import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisService from './redisService.js';
import backgroundJobService, { JobType } from './backgroundJobService.js';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';

class RealTimeNotificationService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.userSockets = new Map(); // socketId -> userId
    this.isInitialized = false;
  }

  /**
   * Initialize Socket.IO server with Redis adapter
   */
  initialize(httpServer) {
    try {
      // Create Socket.IO server
      this.io = new Server(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:5173',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Setup Redis adapter for multi-server scaling
      this.setupRedisAdapter();

      // Setup authentication middleware
      this.setupAuthentication();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup room management
      this.setupRoomManagement();

      this.isInitialized = true;
      logger.info('Real-time notification service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize real-time notification service:', error);
      throw error;
    }
  }

  /**
   * Setup Redis adapter for horizontal scaling
   */
  async setupRedisAdapter() {
    try {
      if (redisService.isConnected) {
        const pubClient = redisService.createRedisClient();
        const subClient = redisService.createRedisClient();
        
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter configured');
      }
    } catch (error) {
      logger.warn('Failed to setup Redis adapter, running in single-server mode:', error);
    }
  }

  /**
   * Setup authentication middleware
   */
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.id;
        
        if (!userId) {
          return next(new Error('Invalid token'));
        }

        socket.userId = userId;
        socket.userRole = decoded.role || 'user';
        socket.authenticated = true;
        
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup main event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      socket.on('disconnect', () => this.handleDisconnection(socket));
      socket.on('join-project', (data) => this.handleJoinProject(socket, data));
      socket.on('leave-project', (data) => this.handleLeaveProject(socket, data));
      socket.on('typing-start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing-stop', (data) => this.handleTypingStop(socket, data));
      socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
      socket.on('subscribe-upload', (data) => this.handleSubscribeUpload(socket, data));
      socket.on('unsubscribe-upload', (data) => this.handleUnsubscribeUpload(socket, data));
      socket.on('mark-notification-read', (data) => this.handleMarkNotificationRead(socket, data));
      socket.on('get-online-users', (data) => this.handleGetOnlineUsers(socket, data));
    });
  }

  /**
   * Setup room management for projects and uploads
   */
  setupRoomManagement() {
    // Auto-cleanup empty rooms every 5 minutes
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 5 * 60 * 1000);
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    const userId = socket.userId;
    
    // Track user connection
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);
    this.userSockets.set(socket.id, userId);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Notify about user coming online
    this.broadcastUserStatus(userId, 'online');

    // Send pending notifications
    this.sendPendingNotifications(socket);

    logger.info('User connected to real-time service', { 
      userId, 
      socketId: socket.id,
      totalConnections: this.connectedUsers.get(userId).size
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    const userId = socket.userId;
    
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id);
      
      // If no more connections for this user
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
        this.broadcastUserStatus(userId, 'offline');
      }
    }
    
    this.userSockets.delete(socket.id);

    logger.info('User disconnected from real-time service', { 
      userId, 
      socketId: socket.id 
    });
  }

  /**
   * Handle joining project room
   */
  handleJoinProject(socket, data) {
    const { projectId } = data;
    const roomName = `project:${projectId}`;
    
    socket.join(roomName);
    
    // Notify others in the project
    socket.to(roomName).emit('user-joined-project', {
      userId: socket.userId,
      projectId,
      timestamp: new Date()
    });

    logger.debug('User joined project room', { 
      userId: socket.userId, 
      projectId, 
      roomName 
    });
  }

  /**
   * Handle leaving project room
   */
  handleLeaveProject(socket, data) {
    const { projectId } = data;
    const roomName = `project:${projectId}`;
    
    socket.leave(roomName);
    
    // Notify others in the project
    socket.to(roomName).emit('user-left-project', {
      userId: socket.userId,
      projectId,
      timestamp: new Date()
    });

    logger.debug('User left project room', { 
      userId: socket.userId, 
      projectId, 
      roomName 
    });
  }

  /**
   * Handle typing indicators
   */
  handleTypingStart(socket, data) {
    const { projectId, context } = data;
    const roomName = `project:${projectId}`;
    
    socket.to(roomName).emit('user-typing', {
      userId: socket.userId,
      projectId,
      context,
      typing: true,
      timestamp: new Date()
    });
  }

  handleTypingStop(socket, data) {
    const { projectId, context } = data;
    const roomName = `project:${projectId}`;
    
    socket.to(roomName).emit('user-typing', {
      userId: socket.userId,
      projectId,
      context,
      typing: false,
      timestamp: new Date()
    });
  }

  /**
   * Handle cursor movement for collaboration
   */
  handleCursorMove(socket, data) {
    const { projectId, position, context } = data;
    const roomName = `project:${projectId}`;
    
    socket.to(roomName).emit('cursor-moved', {
      userId: socket.userId,
      projectId,
      position,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Handle upload progress subscriptions
   */
  handleSubscribeUpload(socket, data) {
    const { uploadId } = data;
    const roomName = `upload:${uploadId}`;
    
    socket.join(roomName);
    
    logger.debug('User subscribed to upload progress', { 
      userId: socket.userId, 
      uploadId 
    });
  }

  handleUnsubscribeUpload(socket, data) {
    const { uploadId } = data;
    const roomName = `upload:${uploadId}`;
    
    socket.leave(roomName);
    
    logger.debug('User unsubscribed from upload progress', { 
      userId: socket.userId, 
      uploadId 
    });
  }

  /**
   * Handle notification read status
   */
  handleMarkNotificationRead(socket, data) {
    const { notificationId } = data;
    
    // Update notification status in database
    // Implementation depends on notification storage system
    
    socket.emit('notification-marked-read', {
      notificationId,
      timestamp: new Date()
    });
  }

  /**
   * Handle getting online users
   */
  handleGetOnlineUsers(socket, data) {
    const { projectId } = data;
    const roomName = `project:${projectId}`;
    
    const room = this.io.sockets.adapter.rooms.get(roomName);
    const onlineUsers = [];
    
    if (room) {
      for (const socketId of room) {
        const userId = this.userSockets.get(socketId);
        if (userId && !onlineUsers.includes(userId)) {
          onlineUsers.push(userId);
        }
      }
    }
    
    socket.emit('online-users', {
      projectId,
      users: onlineUsers,
      timestamp: new Date()
    });
  }

  /**
   * Send notifications to specific users
   */
  async sendNotificationToUser(userId, notification) {
    if (!this.isInitialized) return;

    const userRoom = `user:${userId}`;
    
    this.io.to(userRoom).emit('notification', {
      ...notification,
      timestamp: new Date(),
      id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Store notification for offline users
    if (!this.connectedUsers.has(userId)) {
      await this.storePendingNotification(userId, notification);
    }

    logger.debug('Notification sent to user', { userId, notification });
  }

  /**
   * Send notifications to project members
   */
  async sendNotificationToProject(projectId, notification, excludeUserId = null) {
    if (!this.isInitialized) return;

    const projectRoom = `project:${projectId}`;
    
    // Get project members from database
    const projectMembers = await this.getProjectMembers(projectId);
    
    for (const memberId of projectMembers) {
      if (memberId !== excludeUserId) {
        await this.sendNotificationToUser(memberId, {
          ...notification,
          projectId
        });
      }
    }

    logger.debug('Notification sent to project', { projectId, notification });
  }

  /**
   * Send upload progress updates
   */
  sendUploadProgress(uploadId, progress) {
    if (!this.isInitialized) return;

    const uploadRoom = `upload:${uploadId}`;
    
    this.io.to(uploadRoom).emit('upload-progress', {
      uploadId,
      progress,
      timestamp: new Date()
    });

    logger.debug('Upload progress sent', { uploadId, progress });
  }

  /**
   * Send file sharing notifications
   */
  async sendFileSharedNotification(fileId, sharedWith, sharedBy) {
    const notification = {
      type: 'file-shared',
      title: 'File Shared',
      message: `A file has been shared with you`,
      data: {
        fileId,
        sharedBy,
        action: 'view-file'
      },
      priority: 'normal'
    };

    if (Array.isArray(sharedWith)) {
      for (const userId of sharedWith) {
        await this.sendNotificationToUser(userId, notification);
      }
    } else {
      await this.sendNotificationToUser(sharedWith, notification);
    }
  }

  /**
   * Send project activity notifications
   */
  async sendProjectActivityNotification(projectId, activity, userId) {
    const notification = {
      type: 'project-activity',
      title: 'Project Activity',
      message: activity.message,
      data: {
        projectId,
        activity: activity.type,
        userId
      },
      priority: 'low'
    };

    await this.sendNotificationToProject(projectId, notification, userId);
  }

  /**
   * Send system notifications
   */
  async sendSystemNotification(userId, notification) {
    const systemNotification = {
      ...notification,
      type: 'system',
      priority: 'high'
    };

    await this.sendNotificationToUser(userId, systemNotification);
  }

  /**
   * Broadcast user online/offline status
   */
  broadcastUserStatus(userId, status) {
    this.io.emit('user-status-changed', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Send pending notifications to newly connected users
   */
  async sendPendingNotifications(socket) {
    try {
      const pendingNotifications = await this.getPendingNotifications(socket.userId);
      
      for (const notification of pendingNotifications) {
        socket.emit('notification', notification);
      }
      
      // Clear pending notifications
      await this.clearPendingNotifications(socket.userId);
    } catch (error) {
      logger.error('Failed to send pending notifications:', error);
    }
  }

  /**
   * Store notifications for offline users
   */
  async storePendingNotification(userId, notification) {
    try {
      const key = `pending_notifications:${userId}`;
      const notifications = await redisService.get(key) || [];
      
      notifications.push({
        ...notification,
        storedAt: new Date()
      });
      
      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(0, notifications.length - 50);
      }
      
      await redisService.set(key, notifications, 7 * 24 * 3600); // 7 days TTL
    } catch (error) {
      logger.error('Failed to store pending notification:', error);
    }
  }

  /**
   * Get pending notifications for user
   */
  async getPendingNotifications(userId) {
    try {
      const key = `pending_notifications:${userId}`;
      return await redisService.get(key) || [];
    } catch (error) {
      logger.error('Failed to get pending notifications:', error);
      return [];
    }
  }

  /**
   * Clear pending notifications for user
   */
  async clearPendingNotifications(userId) {
    try {
      const key = `pending_notifications:${userId}`;
      await redisService.del(key);
    } catch (error) {
      logger.error('Failed to clear pending notifications:', error);
    }
  }

  /**
   * Get project members (placeholder - implement based on your data model)
   */
  async getProjectMembers(projectId) {
    // This should query your database to get project members
    // For now, returning empty array
    return [];
  }

  /**
   * Clean up empty rooms
   */
  cleanupEmptyRooms() {
    if (!this.io) return;

    const rooms = this.io.sockets.adapter.rooms;
    let cleanedRooms = 0;

    for (const [roomName, room] of rooms) {
      // Skip user rooms and rooms with active connections
      if (roomName.startsWith('user:') || room.size > 0) {
        continue;
      }

      // Clean up project and upload rooms
      if (roomName.startsWith('project:') || roomName.startsWith('upload:')) {
        this.io.sockets.adapter.del(roomName);
        cleanedRooms++;
      }
    }

    if (cleanedRooms > 0) {
      logger.debug(`Cleaned up ${cleanedRooms} empty rooms`);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: Array.from(this.connectedUsers.values())
        .reduce((total, sockets) => total + sockets.size, 0),
      rooms: this.io ? this.io.sockets.adapter.rooms.size : 0,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.io) {
      logger.info('Shutting down real-time notification service...');
      
      // Notify all connected clients
      this.io.emit('server-shutdown', {
        message: 'Server is shutting down, please reconnect in a moment',
        timestamp: new Date()
      });
      
      // Close all connections
      this.io.close();
      
      logger.info('Real-time notification service shutdown complete');
    }
  }
}

// Singleton instance
const realTimeNotificationService = new RealTimeNotificationService();

export default realTimeNotificationService;