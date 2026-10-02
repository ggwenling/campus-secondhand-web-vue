<template>
  <div class="page swap-detail">
    <el-skeleton v-if="loading" :rows="8" animated class="skeleton-card" />
    <template v-else-if="post">
      <el-card shadow="never" class="main-card">
        <div class="detail-head">
          <h2 class="title">{{ post.title }}</h2>
          <el-tag v-if="post.status !== 'OPEN'" size="small" type="info">{{ statusText(post.status) }}</el-tag>
          <el-tag v-if="post.allowDiff === 1" size="small" type="warning" effect="light">
            可补差价{{ hasDiffAmount ? ` ¥${Number(post.diffAmount).toFixed(2)}` : '' }}
          </el-tag>
          <span class="meta">{{ post.categoryName || '未分类' }} · {{ post.createdAt }}</span>
        </div>

        <!-- 双方物品对照（前端设计文档 §6.1 交换详情） -->
        <div class="item-swap">
          <div class="item-box">
            <span class="item-label"><el-icon><Box /></el-icon> 帖主的物品</span>
            <p class="item-text">{{ post.myItemDesc }}</p>
          </div>
          <div class="swap-arrow">
            <el-icon :size="28"><Switch /></el-icon>
            <span class="arrow-text">交换</span>
          </div>
          <div class="item-box want">
            <span class="item-label"><el-icon><Star /></el-icon> 想要的物品</span>
            <p class="item-text">{{ post.wantItemDesc }}</p>
          </div>
        </div>
      </el-card>

      <div class="two-col">
        <UserCard :user="post.publisher" />

        <el-card shadow="never" class="action-card">
          <template #header><b>我的操作</b></template>

          <template v-if="myRequest">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="我的物品说明">{{ myRequest.itemDesc }}</el-descriptions-item>
              <el-descriptions-item v-if="myRequest.goodsId" label="关联商品">
                <span class="link" @click="router.push(`/goods/${myRequest.goodsId}`)">
                  {{ myRequest.goodsTitle || '查看商品' }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag size="small" :type="requestTagType(myRequest.status)" effect="light">
                  {{ requestStatusText(myRequest.status) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <div class="action-row">
              <el-button
                v-if="myRequest.orderId"
                type="primary"
                @click="router.push(`/orders/${myRequest.orderId}`)"
              >查看交换订单</el-button>
            </div>
          </template>

          <template v-else-if="!post.canRequest">
            <el-alert :title="requestHint" type="warning" :closable="false" show-icon />
            <div class="action-row">
              <el-button v-if="!userStore.isLoggedIn" type="primary" @click="goLogin">登录后发起交换</el-button>
              <el-button v-else-if="!userStore.isVerified" type="primary" @click="router.push('/verify')">
                去完成校园认证
              </el-button>
            </div>
          </template>

          <template v-else>
            <p class="tip">填写你的物品说明，也可以关联你在售的商品，帖主同意后即生成交换订单。</p>
            <el-button type="primary" size="large" style="width: 100%" @click="openRequestDialog">
              发起交换
            </el-button>
          </template>
        </el-card>
      </div>

      <!-- 帖主视角：请求列表（PRD SWP-03） -->
      <el-card v-if="isOwner" shadow="never" class="request-card">
        <template #header>
          <div class="card-head">
            <b>收到的交换请求（{{ (post.requests || []).length }}）</b>
            <div v-if="canManage" class="owner-actions">
              <el-button size="small" @click="router.push(`/swap/publish?id=${post.id}`)">编辑</el-button>
              <el-button size="small" type="warning" plain @click="doClose">关闭交换</el-button>
              <el-button size="small" type="danger" plain @click="doRemove">删除</el-button>
            </div>
          </div>
        </template>
        <el-table v-if="(post.requests || []).length" :data="post.requests" style="width: 100%">
          <el-table-column label="发起人" width="170">
            <template #default="{ row }">
              <div class="req-user">
                <el-avatar :size="26" :src="row.avatar || undefined">{{ (row.nickname || '同')[0] }}</el-avatar>
                <span>{{ row.nickname || '校园用户' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="物品说明" min-width="220">
            <template #default="{ row }">{{ row.itemDesc }}</template>
          </el-table-column>
          <el-table-column label="关联商品" width="170">
            <template #default="{ row }">
              <span v-if="row.goodsId" class="link" @click="router.push(`/goods/${row.goodsId}`)">
                {{ row.goodsTitle || '查看商品' }}
              </span>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="requestTagType(row.status)" effect="light">
                {{ requestStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 0 && canManage">
                <el-button size="small" type="primary" @click="doAccept(row)">同意</el-button>
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
        <EmptyBlock v-else description="还没有收到交换请求" :image-size="80" />
      </el-card>

      <!-- 发起交换弹窗 -->
      <el-dialog v-model="requestDialog" title="发起交换" width="480px">
        <el-form ref="requestFormRef" :model="requestForm" :rules="requestRules" label-width="90px">
          <el-form-item label="物品说明" prop="itemDesc">
            <el-input
              v-model="requestForm.itemDesc"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
              placeholder="说明你想拿来交换的物品：名称、成色、入手时间等"
            />
          </el-form-item>
          <el-form-item label="关联商品">
            <el-select
              v-model="requestForm.goodsId"
              placeholder="可选：选择你在售的商品"
              clearable
              filterable
              style="width: 100%"
              :loading="myGoodsLoading"
            >
              <el-option v-for="g in myGoods" :key="g.id" :label="g.title" :value="g.id" />
            </el-select>
            <div class="hint">关联后帖主可直接查看商品详情（仅展示在售商品）</div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="requestDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="doRequest">提交请求</el-button>
        </template>
      </el-dialog>
    </template>

    <EmptyBlock v-else description="交换帖不存在或已删除" action-text="返回广场" @action="router.push('/swap')" />
  </div>
</template>

<script setup>
// 交换详情（PRD SWP-02/03 / 前端设计文档 §6.1）：双方物品对照 + 发起交换弹窗（可关联在售商品）
// + 帖主视角请求列表（同意生成 SWAP 订单 / 拒绝）
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSwapPost, createSwapRequest, acceptSwapRequest, rejectSwapRequest, closeSwapPost, removeSwapPost } from '@/api/swap'
import { pageMyGoods } from '@/api/goods'
import { useUserStore } from '@/stores/user'
import UserCard from '@/components/UserCard.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const post = ref(null)
const loading = ref(true)
const submitting = ref(false)
const requestDialog = ref(false)
const requestFormRef = ref()
const requestForm = reactive({ itemDesc: '', goodsId: null })
const requestRules = { itemDesc: [{ required: true, message: '请填写你的物品说明', trigger: 'blur' }] }
const myGoods = ref([])
const myGoodsLoading = ref(false)

const STATUS = { OPEN: '交换中', DEALT: '已成交', CLOSED: '已关闭' }
const REQUEST_STATUS = { 0: '待处理', 1: '已同意', 2: '已拒绝' }
const statusText = (s) => STATUS[s] || s
const requestStatusText = (s) => REQUEST_STATUS[s] ?? s
const requestTagType = (s) => ({ 0: 'warning', 1: 'success', 2: 'info' }[s] || 'info')

const hasDiffAmount = computed(
  () => post.value?.diffAmount !== null && post.value?.diffAmount !== undefined && Number(post.value.diffAmount) > 0
)
const myRequest = computed(() => post.value?.myRequest || null)
const isOwner = computed(
  () => !!userStore.userInfo?.userId && post.value?.publisher?.id === userStore.userInfo.userId
)
const canManage = computed(() => isOwner.value && post.value?.status === 'OPEN')

const requestHint = computed(() => {
  if (!userStore.isLoggedIn) return '登录并完成校园认证后即可发起交换'
  if (isOwner.value) return '这是你自己发布的交换帖，不能对自己发起交换'
  if (!userStore.isVerified) return '完成校园认证后才能发起交换'
  if (post.value?.status !== 'OPEN') return '该交换帖已关闭或已成交'
  return '当前账号信用分受限，暂不能发起交换'
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await getSwapPost(route.params.id)
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

async function openRequestDialog() {
  requestDialog.value = true
  if (myGoods.value.length) return
  myGoodsLoading.value = true
  try {
    // 关联商品可选（SWP-02）：仅列出自己在售商品
    const res = await pageMyGoods({ pageNum: 1, pageSize: 50 })
    myGoods.value = (res.data.list || []).filter((g) => g.status === 'ON_SALE')
  } catch {
    myGoods.value = []
  } finally {
    myGoodsLoading.value = false
  }
}

async function doRequest() {
  await requestFormRef.value.validate()
  submitting.value = true
  try {
    await createSwapRequest(post.value.id, {
      itemDesc: requestForm.itemDesc,
      goodsId: requestForm.goodsId || undefined
    })
    ElMessage.success('交换请求已提交，等待帖主处理')
    requestDialog.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

async function doAccept(row) {
  await ElMessageBox.confirm(
    `同意「${row.nickname}」的交换请求？同意后将生成交换订单，其余请求自动关闭，双方确认完成即交易成功。`,
    '同意交换',
    { type: 'warning', confirmButtonText: '同意并生成订单' }
  )
  await acceptSwapRequest(row.id)
  ElMessage.success('已同意，交换订单已生成')
  await load()
}

async function doReject(row) {
  const { value } = await ElMessageBox.prompt('可填写拒绝理由（选填）', '拒绝交换请求', {
    inputPlaceholder: '如：物品不太合适',
    confirmButtonText: '拒绝',
    inputValue: ''
  })
  await rejectSwapRequest(row.id, value || undefined)
  ElMessage.success('已拒绝该请求')
  await load()
}

async function doClose() {
  const { value } = await ElMessageBox.prompt('关闭后该帖不再接收交换请求，已有待处理请求将失效', '关闭交换帖', {
    inputPlaceholder: '关闭理由（选填）',
    confirmButtonText: '关闭',
    inputValue: ''
  })
  await closeSwapPost(post.value.id, value || undefined)
  ElMessage.success('已关闭')
  await load()
}

async function doRemove() {
  await ElMessageBox.confirm('删除后帖子不再公开展示，30 天内可以恢复。确定删除？', '删除交换帖', {
    type: 'warning',
    confirmButtonText: '删除'
  })
  await removeSwapPost(post.value.id)
  ElMessage.success('已删除')
  router.push('/swap')
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
.request-card {
  border-radius: var(--radius-card);
}
.main-card {
  margin-bottom: 16px;
}
.detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.title {
  font-size: 22px;
  margin: 0;
}
.meta {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}
.item-swap {
  display: grid;
  grid-template-columns: 1fr 90px 1fr;
  align-items: stretch;
  gap: 12px;
  margin-top: 18px;
}
.item-box {
  background: var(--color-page-bg);
  border-radius: var(--radius-card);
  padding: 14px 16px;
}
.item-box.want {
  background: var(--color-primary-bg);
}
.item-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}
.item-text {
  font-size: 14px;
  color: #303133;
  line-height: 1.7;
  margin: 8px 0 0;
  white-space: pre-wrap;
}
.swap-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--color-primary);
}
.arrow-text {
  font-size: 12px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
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
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
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
.req-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.link {
  color: var(--color-primary);
  cursor: pointer;
}
.muted {
  color: #c0c4cc;
}
</style>
