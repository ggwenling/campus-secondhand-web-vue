<template>
  <div class="page auth-page">
    <el-card class="auth-card" shadow="always">
      <h2 class="auth-title">注册校园二手</h2>
      <p class="auth-sub">注册后完成校园认证即可发布、下单和聊天</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleRegister">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3~50 个字符，注册后不可修改" data-testid="register-username" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="展示在商品与聊天中的名字" data-testid="register-nickname" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="6~64 位" data-testid="register-password" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再输入一次" data-testid="register-confirm" />
        </el-form-item>
        <el-button type="primary" class="submit" native-type="submit" :loading="loading">注 册</el-button>
      </el-form>
      <div class="links">
        <router-link to="/login">已有账号？去登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', nickname: '', password: '', confirmPassword: '' })

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '长度须为 3~50 个字符', trigger: 'blur' }
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 64, message: '长度须为 6~64 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) =>
        value === form.password ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: 'blur'
    }
  ]
}

async function handleRegister() {
  await formRef.value.validate()
  loading.value = true
  try {
    await userStore.register(form)
    ElMessage.success('注册成功')
    // 注册成功强引导校园认证（前端设计文档 §6.1：注册成功自动登录并强引导跳认证页）
    ElMessageBox.alert(
      '发布商品、下单和聊天需要先完成校园认证（学号 + 校园邮箱验证码）。',
      '欢迎加入！',
      { confirmButtonText: '去认证', type: 'success' }
    ).then(() => router.push('/verify')).catch(() => router.push('/'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding-top: 48px;
}
.auth-card {
  width: 480px;
  border-radius: var(--radius-card);
}
.auth-title {
  text-align: center;
  margin: 0 0 4px;
}
.auth-sub {
  text-align: center;
  color: #909399;
  font-size: 13px;
  margin: 0 0 20px;
}
.submit {
  width: 100%;
}
.links {
  margin-top: 16px;
  text-align: center;
}
.links a {
  color: var(--color-primary);
  font-size: 13px;
}
</style>
