import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getChatUnread, getNotificationUnreadCount } from '@/api/message'
import { useUserStore } from '@/stores/user'

/**
 * 消息红点 store（PRD CHT-05 / NTF-01，前端设计文档 §4.1）：
 * unreadChat=未读私信数、unreadNotify=未读通知数，30s 轮询刷新。
 * 供主代理汇合接线：MainLayout 轮询启动（登录后 startPolling、登出 stopPolling），
 * 导航徽标读 unreadChat / unreadNotify。
 */
export const useMsgStore = defineStore('msg', () => {
  const unreadChat = ref(0)
  const unreadNotify = ref(0)

  const POLL_INTERVAL_MS = 30000
  let timer = null

  /** 拉取一次双红点计数；未登录/请求失败静默（下一轮轮询兜底） */
  async function refresh() {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) {
      unreadChat.value = 0
      unreadNotify.value = 0
      return
    }
    try {
      const [chatRes, notifyRes] = await Promise.all([
        getChatUnread(),
        getNotificationUnreadCount()
      ])
      unreadChat.value = Number(chatRes.data?.messageCount ?? 0)
      unreadNotify.value = Number(notifyRes.data ?? 0)
    } catch (error) {
      // 静默失败：红点非关键数据，等待下一轮
    }
  }

  function startPolling() {
    stopPolling()
    refresh()
    timer = setInterval(refresh, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { unreadChat, unreadNotify, refresh, startPolling, stopPolling }
})
