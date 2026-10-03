<template>
  <el-container class="layout">
    <el-header class="header">
      <div class="header-inner">
        <router-link to="/" class="logo">🏫 校园二手</router-link>
        <el-menu mode="horizontal" :default-active="activeMenu" router class="nav" :ellipsis="false">
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/goods">商品</el-menu-item>
          <el-menu-item index="/want">求购</el-menu-item>
          <el-menu-item index="/swap">交换</el-menu-item>
        </el-menu>
        <div class="actions">
          <el-button type="primary" @click="router.push('/publish')">发布</el-button>
          <template v-if="userStore.isLoggedIn">
            <el-tooltip content="通知" placement="bottom">
              <el-badge :value="msgStore.unreadNotify" :hidden="!msgStore.unreadNotify" :max="99" class="icon-badge">
                <el-button text @click="router.push('/message?tab=notify')">
                  <el-icon :size="18"><Bell /></el-icon>
                </el-button>
              </el-badge>
            </el-tooltip>
            <el-tooltip content="消息" placement="bottom">
              <el-badge :value="msgStore.unreadChat" :hidden="!msgStore.unreadChat" :max="99" class="icon-badge">
                <el-button text @click="router.push('/message')">
                  <el-icon :size="18"><ChatDotRound /></el-icon>
                </el-button>
              </el-badge>
            </el-tooltip>
            <el-dropdown @command="handleCommand">
              <span class="user-entry">
                <el-icon><User /></el-icon>
                {{ userStore.userInfo?.nickname || '我的' }}
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="orders">我的订单</el-dropdown-item>
                  <el-dropdown-item command="message" divided>消息中心</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button text @click="router.push('/login')">登录</el-button>
            <el-button @click="router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </el-header>
    <el-main class="main">
      <!-- 受限 / 封禁全局提示（PRD §4.1 / §5.7）：导航栏下方、页面内容之上 -->
      <div v-if="notice" class="global-notice">
        <el-alert :title="notice.text" :type="notice.type" :closable="false" show-icon />
      </div>
      <router-view />
    </el-main>
    <el-footer class="footer">校园二手交易系统 · 线下面交 · 平台不经手资金</el-footer>
  </el-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMsgStore } from '@/stores/msg'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const msgStore = useMsgStore()

// ---- 受限 / 封禁全局提示（先声明，供下方轮询与模板使用）----
// 数据来源：userStore.userInfo（banned/banReason/bannedUntil 由登录响应与 /users/me 的 status 映射而来）
const isBanned = computed(() => userStore.userInfo?.banned === true)
const banText = computed(() => {
  const base = '账号已被封禁，暂不能发布、互动、下单与发送消息'
  const reason = userStore.userInfo?.banReason
  const until = userStore.userInfo?.bannedUntil
  const extra = []
  if (reason) extra.push(`原因：${reason}`)
  if (until) extra.push(`解封时间：${until}`)
  return extra.length ? `${base}（${extra.join('；')}）` : base
})
const notice = computed(() => {
  if (!userStore.isLoggedIn) return null
  if (isBanned.value) return { type: 'error', text: banText.value }
  const score = userStore.userInfo?.creditScore
  if (typeof score === 'number' && score < 60) {
    return {
      type: 'warning',
      text: '信用分低于 60，暂不能发布 / 下单 / 应约 / 发起交换；完成交易与获得好评可恢复'
    }
  }
  return null
})

// 刷新页面后恢复登录态用户资料；登录期间轮询消息/通知双红点（PRD CHT-05/NTF-02）
// 封禁账号不启动轮询：其业务接口一律 40301，轮询只会反复弹出错误提示
onMounted(async () => {
  if (!userStore.isLoggedIn) return
  await userStore.fetchProfile().catch(() => {})
  if (!isBanned.value) msgStore.startPolling()
})
watch(() => userStore.isLoggedIn, async (loggedIn) => {
  if (loggedIn) {
    // 登录后补拉完整资料以获取 creditScore 与封禁态（登录响应已带 banned，此处兜底刷新）
    if (userStore.userInfo?.creditScore === undefined) {
      await userStore.fetchProfile().catch(() => {})
    }
    if (!isBanned.value) msgStore.startPolling()
  } else {
    msgStore.stopPolling()
  }
})
watch(isBanned, (banned) => {
  if (banned) msgStore.stopPolling()
  else if (userStore.isLoggedIn) msgStore.startPolling()
})
onUnmounted(() => msgStore.stopPolling())

// 详情类路由（/goods/1、/want/2…）高亮对应一级导航
const activeMenu = computed(() => `/${route.path.split('/')[1]}`)

async function handleCommand(command) {
  if (command === 'logout') {
    await userStore.logout()
    router.push('/')
    return
  }
  router.push(`/${command}`)
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 32px;
  height: 60px;
}
.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}
.nav {
  flex: 1;
  border-bottom: none;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #303133;
}
.main {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0;
}
.global-notice {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px 0;
}
.footer {
  text-align: center;
  color: #909399;
  font-size: 13px;
  background: transparent;
}
</style>
