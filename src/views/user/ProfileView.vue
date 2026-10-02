<template>
  <div class="page profile-page">
    <div class="profile-grid">
      <!-- 左：个人卡（前端设计文档 §6.1 个人中心） -->
      <el-card class="side-card" shadow="never">
        <div class="me-head">
          <el-avatar :size="72" :src="profile?.avatar || undefined">
            {{ (profile?.nickname || '我').slice(0, 1) }}
          </el-avatar>
          <div class="me-name">
            <div class="name-row">
              <span class="nickname">{{ profile?.nickname || '—' }}</span>
              <el-tag v-if="profile?.authStatus === 1" type="success" size="small" effect="light">校园已认证</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">未认证</el-tag>
            </div>
            <el-tag size="small" :type="levelTagType" effect="light">信用 {{ levelText }}</el-tag>
          </div>
        </div>

        <div class="credit-block">
          <div class="credit-line">
            <span>信用分</span>
            <b class="credit-score">{{ profile?.creditScore ?? '—' }}</b>
            <span class="credit-max">/ 150</span>
          </div>
          <el-progress :percentage="creditPercent" :stroke-width="8" :show-text="false" />
          <div class="credit-note">优秀 ≥120 · 良好 80~119 · 一般 60~79 · 受限 &lt;60（PRD §5.7）</div>
        </div>

        <el-descriptions :column="1" border size="small" class="me-info">
          <el-descriptions-item label="学号">{{ profile?.studentNoMasked || '未认证' }}</el-descriptions-item>
          <el-descriptions-item label="校园邮箱">{{ profile?.campusEmailMasked || '未认证' }}</el-descriptions-item>
          <el-descriptions-item label="学院">{{ profile?.college || '—' }}</el-descriptions-item>
          <el-descriptions-item label="简介">{{ profile?.bio || '—' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ profile?.createdAt || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="side-actions">
          <el-button type="primary" plain @click="openEdit">编辑资料</el-button>
          <el-button v-if="profile?.authStatus !== 1" type="primary" @click="router.push('/verify')">
            去校园认证
          </el-button>
        </div>
      </el-card>

      <!-- 右：数据 Tab（商品/订单/举报数据随 M2/M3/M6 上线接入） -->
      <el-card class="main-card" shadow="never">
        <el-tabs>
          <el-tab-pane label="我的商品">
            <el-empty description="商品数据随 M2 商品中心联调后在此展示" />
          </el-tab-pane>
          <el-tab-pane label="收藏">
            <el-empty description="收藏数据随 M2 商品中心联调后在此展示（GDS-06）" />
          </el-tab-pane>
          <el-tab-pane label="买到的">
            <el-empty description="订单数据随 M3 交易闭环上线后在此展示（ORD-05）" />
          </el-tab-pane>
          <el-tab-pane label="卖出的">
            <el-empty description="订单数据随 M3 交易闭环上线后在此展示（ORD-05）" />
          </el-tab-pane>
          <el-tab-pane label="收到的评价">
            <el-empty description="评价数据随 M3 交易闭环上线后在此展示（ORD-06）" />
          </el-tab-pane>
          <el-tab-pane label="我的举报">
            <el-empty description="举报进度随 M7 上线后在此展示（RPT-02）" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- 编辑资料弹窗 -->
    <el-dialog v-model="editVisible" title="编辑资料" width="480px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            action="/api/uploads"
            name="file"
            :headers="uploadHeaders"
            :show-file-list="false"
            accept="image/jpeg,image/png,image/webp"
            :on-success="onAvatarUploaded"
          >
            <el-avatar :size="56" :src="editForm.avatar || undefined">
              {{ (editForm.nickname || '我').slice(0, 1) }}
            </el-avatar>
            <div class="avatar-hint">点击更换（jpg/png/webp ≤5MB）</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" maxlength="50" />
        </el-form-item>
        <el-form-item label="学院">
          <el-input v-model="editForm.college" maxlength="100" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { updateProfile } from '@/api/user'
import { getToken } from '@/utils/auth'

const router = useRouter()
const userStore = useUserStore()

const profile = computed(() => userStore.userInfo)
const loading = ref(false)

const creditPercent = computed(() =>
  Math.round(Math.min(Math.max(profile.value?.creditScore ?? 0, 0), 150) / 150 * 100)
)

const levelText = computed(() => {
  const s = profile.value?.creditScore ?? 0
  if (s >= 120) return '优秀'
  if (s >= 80) return '良好'
  if (s >= 60) return '一般'
  return '受限'
})

const levelTagType = computed(() => {
  const s = profile.value?.creditScore ?? 0
  if (s >= 120) return 'success'
  if (s >= 80) return 'primary'
  if (s >= 60) return 'warning'
  return 'danger'
})

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  loading.value = true
  try {
    await userStore.fetchProfile()
  } finally {
    loading.value = false
  }
})

// ---- 编辑资料 ----
const editVisible = ref(false)
const saving = ref(false)
const editForm = reactive({ nickname: '', avatar: '', college: '', bio: '' })
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${getToken()}` }))

function openEdit() {
  editForm.nickname = profile.value?.nickname || ''
  editForm.avatar = profile.value?.avatar || ''
  editForm.college = profile.value?.college || ''
  editForm.bio = profile.value?.bio || ''
  editVisible.value = true
}

function onAvatarUploaded(response) {
  // el-upload 走原生 XHR，不走 axios 拦截器，需自行解包 {code,message,data}
  if (response.code === 0 && response.data?.url) {
    editForm.avatar = response.data.url
    ElMessage.success('头像已上传')
  } else {
    ElMessage.error(response.message || '头像上传失败')
  }
}

async function saveProfile() {
  if (!editForm.nickname) {
    ElMessage.warning('昵称不能为空')
    return
  }
  saving.value = true
  try {
    await updateProfile(editForm)
    ElMessage.success('资料已更新')
    editVisible.value = false
    await userStore.fetchProfile()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  padding: 24px 0;
}
.side-card,
.main-card {
  border-radius: var(--radius-card);
}
.me-head {
  display: flex;
  align-items: center;
  gap: 16px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nickname {
  font-size: 18px;
  font-weight: 600;
}
.me-name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.credit-block {
  margin: 20px 0;
}
.credit-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  color: #606266;
}
.credit-score {
  font-size: 24px;
  color: var(--color-primary);
}
.credit-max {
  color: #909399;
  font-size: 12px;
}
.credit-note {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}
.me-info {
  margin-bottom: 16px;
}
.side-actions {
  display: flex;
  gap: 12px;
}
.avatar-uploader {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.avatar-hint {
  color: #909399;
  font-size: 12px;
}
</style>
