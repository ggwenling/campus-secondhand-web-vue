<template>
  <div class="page login-page">
    <el-card class="login-card" shadow="always">
      <h2 class="login-title">登录校园二手</h2>
      <el-form :model="form" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="用户名" data-testid="login-username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" data-testid="login-password" />
        </el-form-item>
        <el-button type="primary" class="submit" native-type="submit" :loading="loading">登 录</el-button>
      </el-form>
      <div class="links">
        <router-link to="/register">没有账号？去注册</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const data = await userStore.login(form)
    if (data.banned) {
      // 封禁用户可登录但功能全被拦截（PRD §4.1），登录即展示封禁通知
      ElMessageBox.alert(data.banReason || '账号已被封禁', '封禁通知', {
        confirmButtonText: '我知道了',
        type: 'error'
      })
    } else {
      ElMessage.success('登录成功')
    }
    router.push(route.query.redirect || '/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}
.login-card {
  width: 480px;
  border-radius: var(--radius-card);
}
.login-title {
  text-align: center;
  margin: 0 0 20px;
}
.submit {
  width: 100%;
}
.links {
  margin-top: 16px;
  text-align: center;
  color: #409eff;
}
</style>
