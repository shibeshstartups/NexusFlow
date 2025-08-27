import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface NotificationData {
  fileId?: string;
  projectId?: string;
  uploadId?: string;
  userId?: string;
  [key: string]: unknown;
}

interface UserActivityData {
  typing?: boolean;
  position?: { x: number; y: number };
  [key: string]: unknown;
}

interface UserJoinedData {
  userId: string;
  projectId: string;
  timestamp: string;
}

interface UserLeftData {
  userId: string;
  projectId: string;
  timestamp: string;
}

interface UserTypingData {
  userId: string;
  typing: boolean;
  context?: string;
  timestamp: string;
}

interface CursorMovedData {
  userId: string;
  position: { x: number; y: number };
  context?: string;
  timestamp: string;
}

interface UserStatusData {
  userId: string;
  status: 'online' | 'offline';
  timestamp: string;
}

interface OnlineUsersData {
  users: string[];
}

interface ServerShutdownData {
  message: string;
  estimatedDowntime?: number;
}

interface Notification {
  id: string;
  type: 'file-shared' | 'project-activity' | 'upload-progress' | 'system' | 'collaboration';
  title: string;
  message: string;
  data?: NotificationData;
  priority: 'low' | 'normal' | 'high';
  timestamp: Date;
  read?: boolean;
}

interface UploadProgress {
  uploadId: string;
  progress: number;
  timestamp: Date;
}

interface UserActivity {
  userId: string;
  activity: 'typing' | 'cursor-move' | 'online' | 'offline';
  context?: string;
  data?: UserActivityData;
  timestamp: Date;
}

interface RealTimeState {
  connected: boolean;
  notifications: Notification[];
  uploadProgress: Record<string, UploadProgress>;
  userActivity: Record<string, UserActivity>;
  onlineUsers: string[];
  unreadCount: number;
}

interface UseRealTimeNotificationsOptions {
  autoConnect?: boolean;
  enableUploadProgress?: boolean;
  enableCollaboration?: boolean;
  maxNotifications?: number;
}

export const useRealTimeNotifications = (options: UseRealTimeNotificationsOptions = {}) => {
  const {
    autoConnect = true,
    enableUploadProgress = true,
    enableCollaboration = true,
    maxNotifications = 100
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RealTimeState>({
    connected: false,
    notifications: [],
    uploadProgress: {},
    userActivity: {},
    onlineUsers: [],
    unreadCount: 0
  });

  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [subscribedUploads, setSubscribedUploads] = useState<Set<string>>(new Set());

  // Event handlers
  const handleNotification = useCallback((notification: Notification) => {
    setState(prev => {
      const newNotifications = [notification, ...prev.notifications].slice(0, maxNotifications);
      const unreadCount = newNotifications.filter(n => !n.read).length;
      
      return {
        ...prev,
        notifications: newNotifications,
        unreadCount
      };
    });

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        tag: notification.id
      });
    }
  }, [maxNotifications]);

  const handleUploadProgress = useCallback((progress: UploadProgress) => {
    setState(prev => ({
      ...prev,
      uploadProgress: {
        ...prev.uploadProgress,
        [progress.uploadId]: progress
      }
    }));
  }, []);

  const handleUserJoinedProject = useCallback((data: UserJoinedData) => {
    setState(prev => ({
      ...prev,
      userActivity: {
        ...prev.userActivity,
        [data.userId]: {
          userId: data.userId,
          activity: 'online',
          timestamp: new Date(data.timestamp)
        }
      }
    }));
  }, []);

  const handleUserLeftProject = useCallback((data: UserLeftData) => {
    setState(prev => {
      const newUserActivity = { ...prev.userActivity };
      delete newUserActivity[data.userId];
      
      return {
        ...prev,
        userActivity: newUserActivity
      };
    });
  }, []);

  const handleUserTyping = useCallback((data: UserTypingData) => {
    setState(prev => ({
      ...prev,
      userActivity: {
        ...prev.userActivity,
        [data.userId]: {
          userId: data.userId,
          activity: 'typing',
          context: data.context,
          data: { typing: data.typing },
          timestamp: new Date(data.timestamp)
        }
      }
    }));

    // Clear typing indicator after 3 seconds
    if (data.typing) {
      setTimeout(() => {
        setState(prev => {
          const newUserActivity = { ...prev.userActivity };
          if (newUserActivity[data.userId]?.activity === 'typing') {
            newUserActivity[data.userId] = {
              ...newUserActivity[data.userId],
              data: { typing: false }
            };
          }
          return { ...prev, userActivity: newUserActivity };
        });
      }, 3000);
    }
  }, []);

  const handleCursorMoved = useCallback((data: CursorMovedData) => {
    setState(prev => ({
      ...prev,
      userActivity: {
        ...prev.userActivity,
        [data.userId]: {
          userId: data.userId,
          activity: 'cursor-move',
          context: data.context,
          data: { position: data.position },
          timestamp: new Date(data.timestamp)
        }
      }
    }));
  }, []);

  const handleUserStatusChanged = useCallback((data: UserStatusData) => {
    setState(prev => {
      const newOnlineUsers = data.status === 'online' 
        ? [...prev.onlineUsers, data.userId].filter((id, index, arr) => arr.indexOf(id) === index)
        : prev.onlineUsers.filter(id => id !== data.userId);
      
      return {
        ...prev,
        onlineUsers: newOnlineUsers
      };
    });
  }, []);

  const handleOnlineUsers = useCallback((data: OnlineUsersData) => {
    setState(prev => ({
      ...prev,
      onlineUsers: data.users
    }));
  }, []);

  const handleServerShutdown = useCallback((data: ServerShutdownData) => {
    console.warn('Server shutdown notification:', data.message);
    // Could show a toast notification to the user
  }, []);

  // Setup socket event handlers
  const setupSocketEventHandlers = useCallback((socket: Socket) => {
    // Connection events
    socket.on('connect', () => {
      setState(prev => ({ ...prev, connected: true }));
      console.log('Connected to real-time notification service');
    });

    socket.on('disconnect', (reason) => {
      setState(prev => ({ ...prev, connected: false }));
      console.log('Disconnected from real-time service:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setState(prev => ({ ...prev, connected: false }));
    });

    // Notification events
    socket.on('notification', handleNotification);

    // Upload progress events
    if (enableUploadProgress) {
      socket.on('upload-progress', handleUploadProgress);
    }

    // Collaboration events
    if (enableCollaboration) {
      socket.on('user-joined-project', handleUserJoinedProject);
      socket.on('user-left-project', handleUserLeftProject);
      socket.on('user-typing', handleUserTyping);
      socket.on('cursor-moved', handleCursorMoved);
      socket.on('user-status-changed', handleUserStatusChanged);
      socket.on('online-users', handleOnlineUsers);
    }

    // System events
    socket.on('server-shutdown', handleServerShutdown);
  }, [enableUploadProgress, enableCollaboration, handleNotification, handleUploadProgress, handleUserJoinedProject, handleUserLeftProject, handleUserTyping, handleCursorMoved, handleUserStatusChanged, handleOnlineUsers, handleServerShutdown]);

  // Connect to socket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found for socket connection');
      return;
    }

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    setupSocketEventHandlers(socket);
    socketRef.current = socket;
  }, [setupSocketEventHandlers]);

  // Disconnect from socket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, connected: false }));
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Public methods
  const joinProject = useCallback((projectId: string) => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('join-project', { projectId });
    setCurrentProject(projectId);
    
    // Request online users for this project
    socketRef.current.emit('get-online-users', { projectId });
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('leave-project', { projectId });
    if (currentProject === projectId) {
      setCurrentProject(null);
    }
  }, [currentProject]);

  const subscribeToUpload = useCallback((uploadId: string) => {
    if (!socketRef.current?.connected || !enableUploadProgress) return;
    
    socketRef.current.emit('subscribe-upload', { uploadId });
    setSubscribedUploads(prev => new Set(prev).add(uploadId));
  }, [enableUploadProgress]);

  const unsubscribeFromUpload = useCallback((uploadId: string) => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('unsubscribe-upload', { uploadId });
    setSubscribedUploads(prev => {
      const newSet = new Set(prev);
      newSet.delete(uploadId);
      return newSet;
    });
    
    // Clean up progress data
    setState(prev => {
      const newUploadProgress = { ...prev.uploadProgress };
      delete newUploadProgress[uploadId];
      return { ...prev, uploadProgress: newUploadProgress };
    });
  }, []);

  const startTyping = useCallback((context?: string) => {
    if (!socketRef.current?.connected || !currentProject) return;
    
    socketRef.current.emit('typing-start', { 
      projectId: currentProject, 
      context 
    });
  }, [currentProject]);

  const stopTyping = useCallback((context?: string) => {
    if (!socketRef.current?.connected || !currentProject) return;
    
    socketRef.current.emit('typing-stop', { 
      projectId: currentProject, 
      context 
    });
  }, [currentProject]);

  const moveCursor = useCallback((position: { x: number; y: number }, context?: string) => {
    if (!socketRef.current?.connected || !currentProject) return;
    
    socketRef.current.emit('cursor-move', { 
      projectId: currentProject, 
      position, 
      context 
    });
  }, [currentProject]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('mark-notification-read', { notificationId });
    
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: prev.notifications.filter(n => n.id !== notificationId && !n.read).length
    }));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0
    }));
  }, []);

  const getUploadProgress = useCallback((uploadId: string) => {
    return state.uploadProgress[uploadId];
  }, [state.uploadProgress]);

  const getUserActivity = useCallback((userId: string) => {
    return state.userActivity[userId];
  }, [state.userActivity]);

  const isUserTyping = useCallback((userId: string, context?: string) => {
    const activity = state.userActivity[userId];
    return activity?.activity === 'typing' && 
           activity?.data?.typing === true &&
           (!context || activity?.context === context);
  }, [state.userActivity]);

  const isUserOnline = useCallback((userId: string) => {
    return state.onlineUsers.includes(userId);
  }, [state.onlineUsers]);

  return {
    // State
    ...state,
    currentProject,
    subscribedUploads: Array.from(subscribedUploads),
    
    // Connection management
    connect,
    disconnect,
    
    // Project collaboration
    joinProject,
    leaveProject,
    startTyping,
    stopTyping,
    moveCursor,
    
    // Upload progress
    subscribeToUpload,
    unsubscribeFromUpload,
    getUploadProgress,
    
    // Notifications
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    
    // User activity
    getUserActivity,
    isUserTyping,
    isUserOnline,
    
    // Utilities
    socket: socketRef.current
  };
};

export default useRealTimeNotifications;