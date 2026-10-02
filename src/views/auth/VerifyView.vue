<template>
  <div class="page auth-page">
    <el-card class="auth-card" shadow="always">
      <h2 class="auth-title">校园认证</h2>
      <p class="auth-sub">学号 + 校园邮箱验证码，认证后才能发布、下单和聊天（PRD §4.1）</p>
      <el-alert
        v-if="isDemo"
        title="演示环境：验证码已打印到后端控制台日志，无需真实邮箱"
        type="info"
        show-icon
        :closable="false"
        class="demo-tip"
      />

      <el-result v-if="userStore.isVerified" icon="success" title="已完成校园认证" sub-title="可以去发布商品了">
        <template #extra>
          <el-button type="primary" @click="router.push('/publish')">去发布</el-button>
          <el-button @click="router.push('/profile')">返回个人中心</el-button>
        </template>
      </el-result>

      <el-form v-else ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleCertify">
        <el-form-item label="学号" prop="studentNo">
          <el-input v-model="form.studentNo" placeholder="学号（全局唯一，认证后不可更改）" data-testid="verify-student-no" />
        </el-form-item>
        <el-form-item label="校园邮箱" prop="campusEmail">
          <el-input v-model="form.campusEmail" placeholder="例如 20240001@stu.example.edu.cn" data-testid="verify-email" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="form.code" maxlength="6" placeholder="6 位数字" data-testid="verify-code" />
            <el-button :disabled="countdown > 0" :loading="sending" @click="handleSend">
              {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-button type="primary" class="submit" native-type="submit" :loading="loading">完成认证</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { sendVerifyCode, submitVerifyCode } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()

// 演示模式标识：.env.development 的 VITE_DEMO_MODE（与后端 app.demo-mode 对应）
const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

const formRef = ref()
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let timer = null

const form = reactive({ studentNo: '', campusEmail: '', code: '' })

const rules = {
  studentNo: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  campusEmail: [
    { required: true, message: '请输入校园邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为 6 位数字', trigger: 'blur' }
  ]
}

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

onUnmounted(() => timer && clearInterval(timer))

async function handleSend() {
  if (!form.studentNo || !form.campusEmail) {
    ElMessage.warning('请先填写学号和校园邮箱')
    return
  }
  sending.value = true
  try {
    await sendVerifyCode({ studentNo: form.studentNo, campusEmail: form.campusEmail })
    ElMessage.success('验证码已发送')
    startCountdown()
  } finally {
    sending.value = false
  }
}

async function handleCertify() {
  await formRef.value.validate()
  loading.value = true
  try {
    await submitVerifyCode(form)
    ElMessage.success('校园认证通过！')
    await userStore.fetchProfile()
    router.push('/profile')
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
  margin: 0 0 16px;
}
.demo-tip {
  margin-bottom: 16px;
}
.code-row {
  display: flex;
  gap: 12px;
  width: 100%;
}
.submit {
  width: 100%;
}
</style>
