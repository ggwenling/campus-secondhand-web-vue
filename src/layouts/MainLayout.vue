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
      <router-view />
    </el-main>
    <el-footer class="footer">校园二手交易系统 · 线下面交 · 平台不经手资金</el-footer>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

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
  color: #409eff;
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
.footer {
  text-align: center;
  color: #909399;
  font-size: 13px;
  background: transparent;
}
</style>
