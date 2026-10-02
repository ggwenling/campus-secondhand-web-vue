import request from './request'

// 消息中心接口（PRD CHT-01~06 / NTF-01~02，M4）
// 聊天（CHT）：WebSocket 端点 /ws?token=xxx 由 stores/msg.js 或视图直连，不走 axios
export const pageConversations = (params) => request.get('/chats/conversations', { params })
export const pageChatMessages = (conversationId, params) =>
  request.get(`/chats/conversations/${conversationId}/messages`, { params })
export const sendChatMessage = (data) => request.post('/chats/messages', data)
export const markConversationRead = (conversationId) =>
  request.post(`/chats/conversations/${conversationId}/read`)
export const getChatUnread = () => request.get('/chats/unread')

// 通知（NTF）
export const pageNotifications = (params) => request.get('/notifications', { params })
export const getNotificationUnreadCount = () => request.get('/notifications/unread-count')
export const markNotificationRead = (id) => request.post(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => request.post('/notifications/read-all')
