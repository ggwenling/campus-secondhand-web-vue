<template>
  <div class="page want-detail">
    <el-skeleton v-if="loading" :rows="8" animated class="skeleton-card" />
    <template v-else-if="post">
      <el-card shadow="never" class="main-card">
        <div class="detail-head">
          <h2 class="title">{{ post.title }}</h2>
          <el-tag v-if="post.status !== 'OPEN'" size="small" type="info">{{ statusText(post.status) }}</el-tag>
        </div>
        <div class="price-row">
          <span class="label">心理价</span>
          <PriceText v-if="hasBudget" :value="post.budget" size="large" />
          <span v-else class="negotiable">价格面议</span>
          <el-tag size="small" effect="plain" type="info">{{ post.categoryName || '未分类' }}</el-tag>
          <span class="meta">{{ post.offerCount ?? 0 }} 条应约 · {{ post.createdAt }}</span>
        </div>
        <el-divider />
        <p class="desc">{{ post.description }}</p>
      </el-card>

      <div class="two-col">
        <div class="left-col">
          <UserCard :user="post.publisher" />
          <!-- 举报入口（非帖主本人） -->
          <div v-if="!isOwner" class="report-row">
            <el-button link type="info" size="small" @click="openReport('WANT')">
              <el-icon><Warning /></el-icon>&nbsp;举报该求购帖
            </el-button>
            <el-button link type="info" size="small" @click="openReport('USER')">
              <el-icon><Warning /></el-icon>&nbsp;举报该用户
            </el-button>
          </div>
        </div>

        <el-card shadow="never" class="action-card">
          <template #header><b>我的操作</b></template>

          <!-- 应约者视角（PRD REQ-03） -->
          <template v-if="myOffer">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="我的报价">
                <PriceText :value="myOffer.price" />
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag size="small" :type="offerTagType(myOffer.status)" effect="light">
                  {{ offerStatusText(myOffer.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="myOffer.message" label="留言">{{ myOffer.message }}</el-descriptions-item>
            </el-descriptions>
            <div class="action-row">
              <el-button v-if="myOffer.status === 0" type="danger" plain @click="doWithdraw">撤回应约</el-button>
              <el-button
                v-if="myOffer.orderId"
                type="primary"
                @click="router.push(`/orders/${myOffer.orderId}`)"
              >查看订单</el-button>
            </div>
          </template>

          <!-- 游客/未认证/受限：给出明确原因（PRD §3.1） -->
          <template v-else-if="!canOfferAction">
            <el-alert
              :title="offerHint"
              :type="post.canOffer === false && !userStore.isLoggedIn ? 'info' : 'warning'"
              :closable="false"
              show-icon
            />
            <div class="action-row">
              <el-button v-if="!userStore.isLoggedIn" type="primary" @click="goLogin">登录后应约</el-button>
              <el-button v-else-if="!userStore.isVerified" type="primary" @click="router.push('/verify')">
                去完成校园认证
              </el-button>
            </div>
          </template>

          <!-- 可应约 -->
          <template v-else>
            <p class="tip">填写你的报价和留言，求购者会选择一条应约成交。</p>
            <el-button type="primary" size="large" style="width: 100%" @click="offerDialog = true">
              我要应约
            </el-button>
          </template>
        </el-card>
      </div>

      <!-- 求购者视角：应约列表（PRD REQ-03/04，仅帖主可见） -->
      <el-card v-if="isOwner" shadow="never" class="offer-card">
        <template #header>
          <div class="card-head">
            <b>收到的应约（{{ (post.offers || []).length }}）</b>
            <div v-if="canManage" class="owner-actions">
              <el-button size="small" @click="router.push(`/want/publish?id=${post.id}`)">编辑</el-button>
              <el-button size="small" type="warning" plain @click="doClose">关闭求购</el-button>
              <el-button size="small" type="danger" plain @click="doRemove">删除</el-button>
            </div>
          </div>
        </template>
        <el-table v-if="(post.offers || []).length" :data="post.offers" style="width: 100%">
          <el-table-column label="应约人" width="180">
            <template #default="{ row }">
              <div class="offer-user">
                <el-avatar :size="26" :src="row.avatar || undefined">{{ (row.nickname || '同')[0] }}</el-avatar>
                <span>{{ row.nickname || '校园用户' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="报价" width="120">
            <template #default="{ row }"><PriceText :value="row.price" /></template>
          </el-table-column>
          <el-table-column label="留言" min-width="200">
            <template #default="{ row }">{{ row.message || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="offerTagType(row.status)" effect="light">
                {{ offerStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 0 && canManage">
                <el-button size="small" type="primary" @click="doAccept(row)">接受</el-button>
                <el-button size="small" plain @click="doReject(row)">拒绝</el-button>
              </template>
              <el-button
                v-else-if="row.orderId"
                size="small"
                type="primary"
                link
                @click="router.push(`/orders/${row.orderId}`)"
              >查看订单</el-button>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>
        <EmptyBlock v-else description="还没有收到应约，试试分享给同学" :image-size="80" />
      </el-card>

      <!-- 应约弹窗 -->
      <el-dialog v-model="offerDialog" title="提交应约" width="440px">
        <el-form ref="offerFormRef" :model="offerForm" :rules="offerRules" label-width="70px">
          <el-form-item label="报价" prop="price">
            <el-input-number v-model="offerForm.price" :min="0" :precision="2" :step="1" style="width: 180px" />
            <span class="hint">元</span>
          </el-form-item>
          <el-form-item label="留言">
            <el-input
              v-model="offerForm.message"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="说明成色、可面交时间地点等"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="offerDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="doOffer">提交应约</el-button>
        </template>
      </el-dialog>
    </template>

    <EmptyBlock v-else description="求购帖不存在或已删除" action-text="返回广场" @action="router.push('/want')" />

    <ReportDialog
      v-model:visible="reportVisible"
      :target-type="reportTarget.type"
      :target-id="reportTarget.id"
      :target-title="reportTarget.title"
    />
  </div>
</template>

<script setup>
// 求购详情（PRD REQ-02/03/04 / 前端设计文档 §6.1）：
// 描述卡 + 发布者卡 + 应约弹窗；帖主额外可见应约列表（接受生成订单 / 拒绝）与编辑关闭删除
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { confirmAction, promptAction } from '@/utils/confirm'
import {
  getWantPost, createOffer, acceptOffer, rejectOffer, withdrawOffer, closeWantPost, removeWantPost
} from '@/api/want'
import { useUserStore } from '@/stores/user'
import PriceText from '@/components/PriceText.vue'
import UserCard from '@/components/UserCard.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'
import ReportDialog from '@/components/ReportDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const post = ref(null)
const loading = ref(true)
const submitting = ref(false)
const offerDialog = ref(false)
const offerFormRef = ref()
const offerForm = reactive({ price: null, message: '' })
const offerRules = { price: [{ required: true, message: '请填写报价', trigger: 'blur' }] }

const STATUS = { OPEN: '求购中', DEALT: '已成交', CLOSED: '已关闭' }
const OFFER_STATUS = { 0: '待处理', 1: '已接受', 2: '已拒绝', 3: '已撤回' }
const statusText = (s) => STATUS[s] || s
const offerStatusText = (s) => OFFER_STATUS[s] ?? s
const offerTagType = (s) => ({ 0: 'warning', 1: 'success', 2: 'info', 3: 'info' }[s] || 'info')

const hasBudget = computed(() => post.value?.budget !== null && post.value?.budget !== undefined)
const myOffer = computed(() => post.value?.myOffer || null)
const isOwner = computed(
  () => !!userStore.userInfo?.userId && post.value?.publisher?.id === userStore.userInfo.userId
)
const canManage = computed(() => isOwner.value && post.value?.status === 'OPEN')
const canOfferAction = computed(() => post.value?.canOffer === true)

// ---- 举报（RPT-01）：求购帖举报 / 发布者用户举报，本人不显示入口 ----
const reportVisible = ref(false)
const reportTargetType = ref('WANT')
const reportTarget = computed(() =>
  reportTargetType.value === 'USER'
    ? { type: 'USER', id: post.value?.publisher?.id ?? null, title: post.value?.publisher?.nickname || '' }
    : { type: 'WANT', id: post.value?.id ?? null, title: post.value?.title || '' }
)

function openReport(type) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    goLogin()
    return
  }
  reportTargetType.value = type
  reportVisible.value = true
}

const offerHint = computed(() => {
  if (!userStore.isLoggedIn) return '登录并完成校园认证后即可应约'
  if (isOwner.value) return '这是你自己发布的求购帖，不能应约'
  if (!userStore.isVerified) return '完成校园认证后才能应约'
  if (post.value?.status !== 'OPEN') return '该求购帖已关闭或已成交，不能再应约'
  return '当前账号信用分受限，暂不能应约'
})

// 路由参数变化时重载（验收 P3：前进/后退复用组件时 onMounted 不会再次触发）
watch(() => route.params.id, load, { immediate: true })

async function load() {
  loading.value = true
  try {
    const res = await getWantPost(route.params.id)
    post.value = res.data
  } catch {
    post.value = null
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

async function doOffer() {
  await offerFormRef.value.validate()
  submitting.value = true
  try {
    await createOffer(post.value.id, { price: offerForm.price, message: offerForm.message || undefined })
    ElMessage.success('应约已提交，等待求购者处理')
    offerDialog.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

async function doWithdraw() {
  const ok = await confirmAction('确定撤回这条应约吗？撤回后可再次提交。', '撤回应约', {
    type: 'warning',
    confirmButtonText: '撤回'
  })
  if (!ok) return
  await withdrawOffer(myOffer.value.id)
  ElMessage.success('已撤回')
  await load()
}

async function doAccept(row) {
  const ok = await confirmAction(
    `接受「${row.nickname}」的报价 ¥${Number(row.price).toFixed(2)}？接受后将生成订单，其余应约自动关闭。`,
    '接受应约',
    { type: 'warning', confirmButtonText: '接受并生成订单' }
  )
  if (!ok) return
  await acceptOffer(row.id)
  ElMessage.success('已接受，订单已生成，请到订单详情查看')
  await load()
}

async function doReject(row) {
  const reason = await promptAction('可填写拒绝理由（选填）', '拒绝应约', {
    inputPlaceholder: '如：价格不合适 / 已找到更合适的',
    confirmButtonText: '拒绝',
    inputValue: ''
  })
  if (reason === null) return
  await rejectOffer(row.id, reason || undefined)
  ElMessage.success('已拒绝该应约')
  await load()
}

async function doClose() {
  const reason = await promptAction('关闭后该帖不再接收应约，已有待处理应约将失效', '关闭求购帖', {
    inputPlaceholder: '关闭理由（选填）',
    confirmButtonText: '关闭',
    inputValue: ''
  })
  if (reason === null) return
  await closeWantPost(post.value.id, reason || undefined)
  ElMessage.success('已关闭')
  await load()
}

async function doRemove() {
  const ok = await confirmAction('删除后帖子不再公开展示，30 天内可以恢复。确定删除？', '删除求购帖', {
    type: 'warning',
    confirmButtonText: '删除'
  })
  if (!ok) return
  await removeWantPost(post.value.id)
  ElMessage.success('已删除')
  router.push('/want')
}
</script>

<style scoped>
.skeleton-card {
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  padding: 20px;
}
.main-card,
.action-card,
.offer-card {
  border-radius: var(--radius-card);
}
.main-card {
  margin-bottom: 16px;
}
.detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title {
  font-size: 22px;
  margin: 0;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.price-row .label {
  color: #909399;
  font-size: 13px;
}
.negotiable {
  color: var(--color-primary);
  font-weight: 700;
  font-size: 18px;
}
.meta {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}
.desc {
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.left-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.report-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 4px;
}
.action-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.tip {
  color: #909399;
  font-size: 13px;
  margin: 0 0 12px;
}
.hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.owner-actions {
  display: flex;
  gap: 8px;
}
.offer-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: #c0c4cc;
}
</style>
