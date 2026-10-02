<template>
  <div class="page">
    <h2 class="page-title">消息中心</h2>
    <div class="message-layout">
      <!-- 左侧 320px：会话/通知 双 Tab（前端设计文档 §6.1 消息中心线框） -->
      <aside class="message-side">
        <el-tabs v-model="activeTab" class="message-tabs">
          <el-tab-pane name="chat">
            <template #label>
              <span class="tab-label">
                聊天
                <el-badge v-if="totalChatUnread > 0" :value="totalChatUnread" :max="99" class="tab-badge" />
              </span>
            </template>
            <div v-loading="convsLoading" class="conv-list">
              <EmptyBlock
                v-if="!convsLoading && conversations.length === 0"
                description="还没有会话，去商品页找卖家聊聊吧" />
              <div
                v-for="conv in conversations"
                :key="conv.id"
                class="conv-item"
                :class="{ active: isConvActive(conv) }"
                @click="openConversation(conv)">
                <el-badge :value="conv.unreadCount" :hidden="!conv.unreadCount" :max="99">
                  <el-avatar :size="42" :src="conv.peerAvatar || undefined">
                    {{ nicknameInitial(conv.peerNickname) }}
                  </el-avatar>
                </el-badge>
                <div class="conv-body">
                  <div class="conv-top">
                    <span class="conv-name">{{ conv.peerNickname }}</span>
                    <span class="conv-time">{{ formatTime(conv.lastMsgAt) }}</span>
                  </div>
                  <div class="conv-preview">{{ conv.lastMsg || '新的会话' }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane name="notify">
            <template #label>
              <span class="tab-label">
                通知
                <el-badge v-if="msgStore.unreadNotify > 0" :value="msgStore.unreadNotify" :max="99" class="tab-badge" />
              </span>
            </template>
            <div class="notify-toolbar">
              <el-button
                size="small"
                text
                type="primary"
                :disabled="msgStore.unreadNotify === 0"
                @click="readAllNotifications">
                全部已读
              </el-button>
            </div>
            <div v-loading="notifLoading" class="notify-list">
              <EmptyBlock v-if="!notifLoading && notifications.length === 0" description="暂无通知" />
              <div
                v-for="item in notifications"
                :key="item.id"
                class="notify-item"
                :class="{ unread: item.isRead === 0 }"
                @click="readNotification(item)">
                <el-icon class="notify-icon" :size="20">
                  <component :is="notifyIcon(item.type)" />
                </el-icon>
                <div class="notify-body">
                  <div class="notify-top">
                    <span class="notify-title">{{ item.title }}</span>
                    <span class="notify-time">{{ formatTime(item.createdAt) }}</span>
                  </div>
                  <div class="notify-content">{{ item.content }}</div>
                </div>
                <span v-if="item.isRead === 0" class="unread-dot" />
              </div>
            </div>
            <div v-if="notifTotal > notifQuery.pageSize" class="notify-pager">
              <el-pagination
                v-model:current-page="notifQuery.pageNum"
                layout="prev, pager, next"
                :page-size="notifQuery.pageSize"
                :total="notifTotal"
                small
                @current-change="loadNotifications" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </aside>

      <!-- 右侧：聊天窗（CHT-02 实时） -->
      <main class="message-main">
        <template v-if="activeTab === 'chat'">
          <template v-if="activePeer.userId">
            <header class="chat-header">
              <el-avatar :size="32" :src="activePeer.avatar || undefined">
                {{ nicknameInitial(activePeer.nickname) }}
              </el-avatar>
              <span class="chat-peer-name">{{ activePeer.nickname }}</span>
              <el-tag v-if="activePeer.creditLevel" size="small" type="success" effect="light">
                {{ activePeer.creditLevel }}
              </el-tag>
            </header>
            <div ref="bubbleScrollRef" class="bubble-flow">
              <div v-if="hasMoreMessages" class="load-more">
                <el-button size="small" text type="primary" :loading="messagesLoading" @click="loadOlderMessages">
                  加载更早消息
                </el-button>
              </div>
              <EmptyBlock v-if="!messagesLoading && messages.length === 0" description="打个招呼吧～" :image-size="90" />
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="bubble-row"
                :class="{ mine: msg.senderId === myUserId }">
                <!-- 商品卡片消息（CHT-03）：缩略图+标题+价格小卡气泡 -->
                <div
                  v-if="msg.msgType === 'GOODS_CARD'"
                  class="goods-card-bubble"
                  @click="goGoods(msg)">
                  <el-image :src="msg.goods?.coverUrl" fit="cover" class="goods-card-thumb">
                    <template #error>
                      <div class="goods-card-thumb goods-card-thumb-empty">🛒</div>
                    </template>
                  </el-image>
                  <div class="goods-card-info">
                    <div class="goods-card-title">{{ msg.goods?.title || '商品已删除' }}</div>
                    <div class="goods-card-price">¥{{ msg.goods?.price ?? '--' }}</div>
                  </div>
                </div>
                <!-- 文本气泡：自己右绿白字，对方左白底 -->
                <template v-else>
                  <div class="bubble">{{ msg.content }}</div>
                  <span v-if="msg.senderId === myUserId" class="read-state">
                    {{ isMessageRead(msg) ? '已读' : '未读' }}
                  </span>
                </template>
              </div>
            </div>
            <footer class="chat-input">
              <!-- 从商品页带入的商品卡片（主代理"聊一聊"按钮经 /message?peerUserId=&goodsId= 接入） -->
              <div v-if="pendingGoods" class="pending-goods">
                <el-image :src="pendingGoods.coverUrl" fit="cover" class="pending-goods-thumb" />
                <span class="pending-goods-title">{{ pendingGoods.title }}</span>
                <el-button size="small" type="primary" :loading="sending" @click="sendGoodsCard">作为卡片发送</el-button>
                <el-button size="small" text @click="pendingGoods = null">移除</el-button>
              </div>
              <div v-if="sendErrorText" class="send-error">{{ sendErrorText }}</div>
              <div class="input-row">
                <el-input
                  v-model="draft"
                  type="textarea"
                  :rows="2"
                  resize="none"
                  maxlength="500"
                  show-word-limit
                  placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                  @keydown.enter="onEnterSend" />
                <el-button type="primary" class="send-btn" :loading="sending" @click="sendText">发送</el-button>
              </div>
            </footer>
          </template>
          <EmptyBlock v-else description="选择左侧会话开始聊天" />
        </template>
        <template v-else>
          <EmptyBlock description="通知列表见左侧，点击未读通知即可标记已读" />
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell, CircleCheck, ShoppingCart, Star, WarningFilled } from '@element-plus/icons-vue'
import EmptyBlock from '@/components/EmptyBlock.vue'
import { getGoods } from '@/api/goods'
import { getUserProfile } from '@/api/user'
import {
  markAllNotificationsRead,
  markConversationRead,
  markNotificationRead,
  pageChatMessages,
  pageConversations,
  pageNotifications,
  sendChatMessage
} from '@/api/message'
import { useUserStore } from '@/stores/user'
import { useMsgStore } from '@/stores/msg'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const msgStore = useMsgStore()

// ==================== 状态 ====================
const activeTab = ref('chat')
const conversations = ref([])
const convsLoading = ref(false)
const totalChatUnread = computed(() =>
  conversations.value.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0))

const activeConv = ref(null)
// 从"聊一聊"等入口带来、尚无会话记录的对方信息（惰性：首次发消息才建会话，CHT-01）
const draftPeer = ref(null)
const messages = ref([])
const messagesLoading = ref(false)
const msgQuery = ref({ pageNum: 1, pageSize: 20 })
const msgTotal = ref(0)
const hasMoreMessages = computed(() => messages.value.length < msgTotal.value)
const bubbleScrollRef = ref(null)

const draft = ref('')
const sending = ref(false)
const sendErrorText = ref('')
const pendingGoods = ref(null)
const readConfirmedIds = ref(new Set())

const notifications = ref([])
const notifLoading = ref(false)
const notifQuery = ref({ pageNum: 1, pageSize: 20 })
const notifTotal = ref(0)

const myUserId = computed(() => userStore.userInfo?.userId)
const activePeer = computed(() => {
  if (activeConv.value) {
    return {
      userId: activeConv.value.peerUserId,
      nickname: activeConv.value.peerNickname,
      avatar: activeConv.value.peerAvatar
    }
  }
  return draftPeer.value || { userId: null, nickname: '', avatar: null }
})

// ==================== 会话（CHT-01） ====================
async function loadConversations() {
  convsLoading.value = true
  try {
    const res = await pageConversations({ pageNum: 1, pageSize: 100 })
    conversations.value = res.data.list
  } finally {
    convsLoading.value = false
  }
}

function isConvActive(conv) {
  if (activeConv.value) return conv.id === activeConv.value.id
  return !!draftPeer.value && conv.peerUserId === draftPeer.value.userId
}

async function openConversation(conv) {
  activeConv.value = { ...conv }
  draftPeer.value = null
  msgQuery.value.pageNum = 1
  messages.value = []
  msgTotal.value = 0
  readConfirmedIds.value = new Set()
  sendErrorText.value = ''
  await loadMessages()
  // 拉取即已读（后端同事务打点 read_at），本地同步清零红点
  const target = conversations.value.find((item) => item.id === conv.id)
  if (target) target.unreadCount = 0
  msgStore.refresh()
}

async function loadMessages() {
  if (!activeConv.value) return
  messagesLoading.value = true
  try {
    const res = await pageChatMessages(activeConv.value.id, { ...msgQuery.value })
    msgTotal.value = res.data.total
    // 后端按 created_at 倒序分页，聊天窗转为正序展示
    const ascList = [...res.data.list].reverse()
    if (msgQuery.value.pageNum === 1) {
      messages.value = ascList
      await nextTick()
      scrollToBottom()
    } else {
      const prevHeight = bubbleScrollRef.value?.scrollHeight || 0
      messages.value = [...ascList, ...messages.value]
      await nextTick()
      if (bubbleScrollRef.value) {
        // 加载更早消息后保持视口停在原位置
        bubbleScrollRef.value.scrollTop = bubbleScrollRef.value.scrollHeight - prevHeight
      }
    }
  } finally {
    messagesLoading.value = false
  }
}

async function loadOlderMessages() {
  if (!hasMoreMessages.value || messagesLoading.value) return
  msgQuery.value.pageNum += 1
  await loadMessages()
}

// ==================== 发消息（CHT-02/03/06） ====================
function onEnterSend(event) {
  if (event.shiftKey) return
  event.preventDefault()
  sendText()
}

async function sendText() {
  const content = draft.value.trim()
  if (!content) return
  if (!activePeer.value.userId || activePeer.value.userId === myUserId.value) return
  sending.value = true
  sendErrorText.value = ''
  try {
    const res = await sendChatMessage({
      peerUserId: activePeer.value.userId,
      msgType: 'TEXT',
      content
    })
    appendMessage(res.data)
    draft.value = ''
    syncConversationAfterSend(res.data)
  } catch (error) {
    // 敏感词命中（GOODS_SENSITIVE）等业务错误：字段下方红字提示命中词
    sendErrorText.value = error.message || '发送失败'
  } finally {
    sending.value = false
  }
}

async function sendGoodsCard() {
  if (!pendingGoods.value || !activePeer.value.userId) return
  sending.value = true
  sendErrorText.value = ''
  try {
    const res = await sendChatMessage({
      peerUserId: activePeer.value.userId,
      msgType: 'GOODS_CARD',
      content: String(pendingGoods.value.goodsId)
    })
    appendMessage(res.data)
    pendingGoods.value = null
    syncConversationAfterSend(res.data)
  } catch (error) {
    sendErrorText.value = error.message || '发送失败'
  } finally {
    sending.value = false
  }
}

function appendMessage(message) {
  if (messages.value.some((item) => item.id === message.id)) return
  messages.value.push(message)
  nextTick(scrollToBottom)
}

/** 发送成功后同步左侧会话摘要（新会话则整表刷新以拿到正确头像/昵称） */
async function syncConversationAfterSend(message) {
  const convId = message.conversationId
  if (!activeConv.value) {
    await loadConversations()
    const conv = conversations.value.find((item) => item.id === convId)
    if (conv) activeConv.value = { ...conv }
    draftPeer.value = null
    return
  }
  const target = conversations.value.find((item) => item.id === convId)
  if (target) {
    target.lastMsg = message.msgType === 'GOODS_CARD' ? '[商品]' : message.content
    target.lastMsgAt = message.createdAt
    conversations.value.sort((a, b) => (b.lastMsgAt || '').localeCompare(a.lastMsgAt || ''))
  }
  msgStore.refresh()
}

function goGoods(message) {
  const goodsId = message.goods?.goodsId || Number(message.content)
  if (goodsId) router.push(`/goods/${goodsId}`)
}

function scrollToBottom() {
  const el = bubbleScrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

// ==================== WebSocket 实时（CHT-02/05） ====================
const ws = ref(null)
let wsReconnectDelay = 1000
let wsReconnectTimer = null
let wsManualClosed = false

function resolveWsUrl() {
  // 优先环境变量；默认同源 /ws（生产同域部署，开发由 Vite 代理转发）
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.host}/ws`
}

function connectWs() {
  const token = localStorage.getItem('campus_market_token')
  if (!token || wsManualClosed) return
  disconnectWs(false)
  try {
    ws.value = new WebSocket(`${resolveWsUrl()}?token=${encodeURIComponent(token)}`)
  } catch (error) {
    scheduleWsReconnect()
    return
  }
  ws.value.onopen = () => {
    wsReconnectDelay = 1000
  }
  ws.value.onmessage = (event) => handleWsPayload(event.data)
  ws.value.onclose = scheduleWsReconnect
  ws.value.onerror = () => ws.value?.close()
}

function scheduleWsReconnect() {
  if (wsManualClosed) return
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer)
  wsReconnectTimer = setTimeout(() => {
    wsReconnectDelay = Math.min(wsReconnectDelay * 2, 15000)
    connectWs()
  }, wsReconnectDelay)
}

function disconnectWs(manual) {
  wsManualClosed = manual
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer)
    wsReconnectTimer = null
  }
  if (ws.value) {
    ws.value.onclose = null
    ws.value.onerror = null
    ws.value.onmessage = null
    try {
      ws.value.close()
    } catch (error) {
      // 连接已断开，忽略
    }
    ws.value = null
  }
}

function handleWsPayload(raw) {
  let payload
  try {
    payload = JSON.parse(raw)
  } catch (error) {
    return
  }
  if (payload.type === 'CHAT_NEW') {
    onWsNewMessage(payload.message)
  } else if (payload.type === 'CHAT_READ') {
    onWsReadReceipt(payload)
  } else if (payload.type === 'ERROR') {
    ElMessage.error(payload.message || '消息发送失败')
  }
}

async function onWsNewMessage(message) {
  msgStore.refresh()
  if (activeConv.value && message.conversationId === activeConv.value.id) {
    appendMessage(message)
    if (message.senderId !== myUserId.value) {
      // 聊天窗打开时到达的新消息立即打点已读（CHT-05）
      try {
        await markConversationRead(activeConv.value.id)
      } catch (error) {
        // 已读打点失败不阻塞展示
      }
    }
    const target = conversations.value.find((item) => item.id === message.conversationId)
    if (target) {
      target.lastMsg = message.msgType === 'GOODS_CARD' ? '[商品]' : message.content
      target.lastMsgAt = message.createdAt
      target.unreadCount = 0
      conversations.value.sort((a, b) => (b.lastMsgAt || '').localeCompare(a.lastMsgAt || ''))
    }
    return
  }
  // 非当前会话：会话列表本地更新（不在列表中则整表刷新兜底）
  const target = conversations.value.find((item) => item.id === message.conversationId)
  if (target) {
    target.lastMsg = message.msgType === 'GOODS_CARD' ? '[商品]' : message.content
    target.lastMsgAt = message.createdAt
    if (message.senderId !== myUserId.value) target.unreadCount = (target.unreadCount || 0) + 1
    conversations.value.sort((a, b) => (b.lastMsgAt || '').localeCompare(a.lastMsgAt || ''))
  } else {
    await loadConversations()
  }
}

function onWsReadReceipt(payload) {
  if (activeConv.value && payload.conversationId === activeConv.value.id) {
    readConfirmedIds.value = new Set([...readConfirmedIds.value,
      ...messages.value.filter((msg) => msg.senderId === myUserId.value).map((msg) => msg.id)])
  }
}

// ==================== 通知（NTF-01/02） ====================
async function loadNotifications() {
  notifLoading.value = true
  try {
    const res = await pageNotifications({ ...notifQuery.value })
    notifications.value = res.data.list
    notifTotal.value = res.data.total
  } finally {
    notifLoading.value = false
  }
}

async function readNotification(item) {
  if (item.isRead !== 0) return
  await markNotificationRead(item.id)
  item.isRead = 1
  msgStore.refresh()
}

async function readAllNotifications() {
  await markAllNotificationsRead()
  notifications.value.forEach((item) => {
    item.isRead = 1
  })
  msgStore.refresh()
  ElMessage.success('通知已全部标记为已读')
}

const NOTIFY_ICONS = { ORDER: ShoppingCart, AUDIT: CircleCheck, REPORT: WarningFilled, CREDIT: Star, SYSTEM: Bell }
function notifyIcon(type) {
  return NOTIFY_ICONS[type] || Bell
}

// ==================== 工具 ====================
/** 相对时间（前端设计文档 §7）：<60min "x 分钟前"；当天 HH:mm；当年 MM-DD；跨年 yyyy-MM-dd */
function formatTime(value) {
  if (!value) return ''
  const date = new Date(String(value).replace(/-/g, '/'))
  if (Number.isNaN(date.getTime())) return String(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs >= 0 && diffMs < 60 * 1000) return '刚刚'
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))} 分钟前`
  const pad = (num) => String(num).padStart(2, '0')
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (date.getFullYear() === now.getFullYear()) return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function nicknameInitial(nickname) {
  return (nickname || '?').slice(0, 1)
}

function isMessageRead(message) {
  return !!message.readAt || readConfirmedIds.value.has(message.id)
}

// ==================== 生命周期 ====================
onMounted(async () => {
  if (!userStore.isLoggedIn) return
  await Promise.all([loadConversations(), loadNotifications()])
  msgStore.refresh()
  // "聊一聊"入口（主代理汇合接线）：/message?peerUserId=x&goodsId=y
  const peerUserId = Number(route.query.peerUserId)
  if (peerUserId && peerUserId !== myUserId.value) {
    const existing = conversations.value.find((conv) => conv.peerUserId === peerUserId)
    if (existing) {
      await openConversation(existing)
    } else {
      draftPeer.value = { userId: peerUserId, nickname: '对方', avatar: null }
      getUserProfile(peerUserId)
        .then((res) => {
          if (draftPeer.value && draftPeer.value.userId === peerUserId) {
            draftPeer.value = {
              userId: peerUserId,
              nickname: res.data.nickname || '对方',
              avatar: res.data.avatar,
              creditLevel: res.data.creditLevel
            }
          }
        })
        .catch(() => {})
    }
  }
  const goodsId = Number(route.query.goodsId)
  if (goodsId) {
    getGoods(goodsId)
      .then((res) => {
        pendingGoods.value = {
          goodsId,
          title: res.data.title,
          price: res.data.price,
          coverUrl: res.data.images?.[0]?.thumbUrl || null
        }
      })
      .catch(() => {})
  }
  connectWs()
})

onBeforeUnmount(() => {
  disconnectWs(true)
})
</script>

<style scoped>
.message-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 200px);
  min-height: 480px;
}

.message-side {
  width: 320px;
  flex-shrink: 0;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.message-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.message-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-badge {
  transform: translateY(-8px);
}

.conv-list,
.notify-list {
  flex: 1;
  overflow-y: auto;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: background 200ms;
}

.conv-item:hover {
  background: var(--color-page-bg);
}

.conv-item.active {
  background: var(--color-primary-bg);
}

.conv-body {
  flex: 1;
  min-width: 0;
}

.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.conv-name {
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time,
.notify-time {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.conv-preview {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notify-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0;
}

.notify-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  position: relative;
}

.notify-item:hover {
  background: var(--color-page-bg);
}

.notify-icon {
  color: var(--color-primary);
  margin-top: 2px;
}

.notify-body {
  flex: 1;
  min-width: 0;
}

.notify-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.notify-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.notify-content {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notify-item.unread .notify-title {
  color: var(--color-primary-dark);
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-danger, #f56c6c);
  flex-shrink: 0;
  margin-top: 8px;
}

.notify-pager {
  padding: 8px 0;
  display: flex;
  justify-content: center;
}

.message-main {
  flex: 1;
  min-width: 0;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.chat-peer-name {
  font-weight: 600;
  color: #303133;
}

.bubble-flow {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-page-bg);
}

.load-more {
  text-align: center;
}

.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.bubble-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 68%;
  padding: 9px 14px;
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  color: #303133;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: var(--shadow-card);
  line-height: 1.5;
}

.bubble-row.mine .bubble {
  background: var(--color-primary);
  color: #fff;
}

.read-state {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.goods-card-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  width: 240px;
  cursor: pointer;
  transition: box-shadow 200ms;
}

.goods-card-bubble:hover {
  box-shadow: var(--shadow-card-hover);
}

.goods-card-thumb {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-image);
  flex-shrink: 0;
}

.goods-card-thumb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-page-bg);
  font-size: 20px;
}

.goods-card-info {
  flex: 1;
  min-width: 0;
}

.goods-card-title {
  font-size: 13px;
  color: #303133;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goods-card-price {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-accent);
}

.chat-input {
  border-top: 1px solid var(--color-border);
  padding: 10px 16px 14px;
}

.pending-goods {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-control);
  margin-bottom: 10px;
}

.pending-goods-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-image);
}

.pending-goods-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.send-error {
  color: var(--el-color-danger, #f56c6c);
  font-size: 12px;
  margin-bottom: 6px;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.send-btn {
  height: 54px;
}
</style>
