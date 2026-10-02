<template>
  <div class="page order-detail-page">
    <div v-if="loading" class="detail-grid">
      <el-skeleton :rows="6" animated class="skeleton-block" />
      <el-skeleton :rows="4" animated class="skeleton-block" />
    </div>

    <template v-else-if="order">
      <div class="detail-grid">
        <!-- 左列：时间线 + 商品卡 + 金额卡 -->
        <div class="detail-main">
          <el-card class="block-card" shadow="never">
            <template #header>
              <div class="card-head">
                <b>订单进度</b>
                <el-tag :type="STATUS_META[order.status]?.type || 'info'" size="small" effect="light">
                  {{ STATUS_META[order.status]?.label || order.status }}
                </el-tag>
              </div>
            </template>

            <el-steps :active="stepActive" align-center finish-status="success">
              <el-step title="下单" :description="order.createdAt" />
              <el-step
                :title="order.type === 'SWAP' ? '创建即成立' : '卖家确认'"
                :description="order.confirmedAt || '—'"
              />
              <el-step title="面交" :description="faceTip" />
              <el-step title="完成" :description="order.completedAt || '—'" />
            </el-steps>

            <!-- SWAP 双确认（T7）：分别展示双方确认状态与时间 -->
            <div v-if="order.type === 'SWAP'" class="swap-confirm">
              <div class="swap-row">
                <span>买方（发起方）确认收货：</span>
                <el-tag v-if="order.buyerConfirmedAt" type="success" size="small">已确认 {{ order.buyerConfirmedAt }}</el-tag>
                <el-tag v-else type="info" size="small">待确认</el-tag>
              </div>
              <div class="swap-row">
                <span>卖方（帖主）确认收货：</span>
                <el-tag v-if="order.sellerConfirmedAt" type="success" size="small">已确认 {{ order.sellerConfirmedAt }}</el-tag>
                <el-tag v-else type="info" size="small">待确认</el-tag>
              </div>
            </div>

            <!-- 取消原因（如有） -->
            <el-alert
              v-if="order.status === 'CANCELLED'"
              class="cancel-alert"
              type="info"
              :closable="false"
              :title="`订单已取消（${CANCELLED_BY_LABEL[order.cancelledBy] || order.cancelledBy || '未知'}）`"
              :description="order.cancelReason || ''"
            />

            <div v-if="order.status === 'SCHEDULED'" class="face-tip">
              面交请在公共场所当面验货，确认无误后再点击确认，保障双方信用（PRD §5.3）。
            </div>

            <!-- 详情页操作按钮 -->
            <div class="detail-actions">
              <el-button v-if="order.canConfirm" type="primary" @click="onConfirm">确认出售</el-button>
              <el-button v-if="order.canReject" @click="onReject">拒绝</el-button>
              <el-button v-if="order.canCancel" type="danger" plain @click="onCancel">取消订单</el-button>
              <el-button v-if="order.canComplete" type="primary" @click="onComplete">
                {{ order.type === 'SWAP' ? '确认收货' : '确认收款' }}
              </el-button>
            </div>
          </el-card>

          <!-- 商品卡：点击跳详情 -->
          <el-card class="block-card" shadow="never">
            <template #header><b>商品信息</b></template>
            <div v-if="order.goodsId" class="goods-card" @click="router.push(`/goods/${order.goodsId}`)">
              <el-image class="goods-thumb" :src="order.goodsCoverUrl || undefined" fit="cover" loading="lazy">
                <template #error><div class="thumb-fallback">无图</div></template>
              </el-image>
              <div class="goods-info">
                <div class="goods-title">{{ order.goodsTitle }}</div>
                <PriceText :value="order.amount" />
              </div>
            </div>
            <div v-else class="no-goods">该订单类型（{{ TYPE_LABEL[order.type] }}）不关联具体商品</div>
          </el-card>
        </div>

        <!-- 右列：双方 + 评价区 -->
        <div class="detail-side">
          <el-card class="block-card" shadow="never">
            <template #header><b>交易双方</b></template>
            <div class="party-row">
              <el-avatar :size="40" :src="order.buyer?.avatar || undefined">{{ (order.buyer?.nickname || '买')[0] }}</el-avatar>
              <div class="party-info">
                <div class="party-name">{{ order.buyer?.nickname || '校园用户' }}</div>
                <el-tag size="small" :type="creditTagType(order.buyer?.creditScore)" effect="plain">
                  信用 {{ creditLevel(order.buyer?.creditScore) }}
                </el-tag>
              </div>
            </div>
            <el-divider style="margin: 12px 0" />
            <div class="party-row">
              <el-avatar :size="40" :src="order.seller?.avatar || undefined">{{ (order.seller?.nickname || '卖')[0] }}</el-avatar>
              <div class="party-info">
                <div class="party-name">{{ order.seller?.nickname || '校园用户' }}</div>
                <el-tag size="small" :type="creditTagType(order.seller?.creditScore)" effect="plain">
                  信用 {{ creditLevel(order.seller?.creditScore) }}
                </el-tag>
              </div>
            </div>
            <el-divider style="margin: 12px 0" />
            <div class="meta-line"><span>订单类型</span><span>{{ TYPE_LABEL[order.type] || order.type }}</span></div>
            <div class="meta-line"><span>订单编号</span><span>{{ order.orderNo }}</span></div>
            <div class="meta-line"><span>成交金额</span><PriceText :value="order.amount" /></div>
          </el-card>

          <!-- 评价区：el-rate + textarea，已评只读（PRD ORD-06） -->
          <el-card class="block-card" shadow="never">
            <template #header><b>交易评价</b></template>
            <div v-if="myReview" class="review-done">
              <div class="review-head">
                <span>我的评价</span>
                <el-rate :model-value="myReview.score" disabled />
              </div>
              <div class="review-content">{{ myReview.content || '（未填写内容）' }}</div>
            </div>
            <div v-else-if="order.status === 'COMPLETED' && order.canReview" class="review-form">
              <div class="review-head">
                <span>给对方评价</span>
                <el-rate v-model="reviewForm.score" />
              </div>
              <el-input
                v-model="reviewForm.content"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                placeholder="说说这次交易体验（可选，200 字内）"
              />
              <el-button type="primary" class="review-submit" :disabled="!reviewForm.score" @click="submitReview">
                提交评价
              </el-button>
            </div>
            <div v-else class="review-empty">{{ reviewPlaceholder }}</div>

            <template v-if="counterReview">
              <el-divider style="margin: 12px 0" />
              <div class="review-head">
                <span>对方评价</span>
                <el-rate :model-value="counterReview.score" disabled />
              </div>
              <div class="review-content">{{ counterReview.content || '（未填写内容）' }}</div>
            </template>
          </el-card>
        </div>
      </div>
    </template>

    <el-card v-else shadow="never" class="placeholder-card">
      <el-empty description="订单不存在或无权查看">
        <el-button type="primary" @click="router.push('/orders')">返回我的订单</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
// 订单详情（PRD ORD-04~06 / 前端设计文档 §6.1）：el-steps 时间线（SALE/PURCHASE 单确认、
// SWAP 双确认分别展示双方确认状态与时间）+ 取消原因 + 评价区 + 商品卡跳详情
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getOrder, confirmOrder, rejectOrder, cancelOrder, completeOrder, reviewOrder } from '@/api/order'
import PriceText from '@/components/PriceText.vue'

const STATUS_META = {
  WAIT_CONFIRM: { label: '待确认', type: 'warning' },
  SCHEDULED: { label: '待面交', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' }
}
const TYPE_LABEL = { SALE: '出售', PURCHASE: '求购', SWAP: '交换' }
const CANCELLED_BY_LABEL = { BUYER: '买家取消', SELLER: '卖家拒绝', TIMEOUT: '超时自动取消' }

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const order = ref(null)
const loading = ref(true)
const reviewForm = reactive({ score: 0, content: '' })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await getOrder(route.params.id)
    order.value = res.data
  } catch (e) {
    order.value = null
  } finally {
    loading.value = false
  }
}

// 时间线步进：下单=0、确认=1、面交=2、完成=3；取消停在当前阶段
const stepActive = computed(() => {
  const status = order.value?.status
  if (status === 'COMPLETED') return 4
  if (status === 'SCHEDULED') return 2
  if (status === 'CANCELLED') return order.value?.confirmedAt ? 2 : 1
  return 1
})

const faceTip = computed(() => {
  if (!order.value) return ''
  if (order.value.status === 'COMPLETED') return order.value.completedAt
  return '线下当面验货'
})

const myReview = computed(() => {
  const uid = userStore.userInfo?.userId
  return order.value?.reviews?.find((r) => String(r.reviewerId) === String(uid)) || null
})

const counterReview = computed(() => {
  const uid = userStore.userInfo?.userId
  return order.value?.reviews?.find((r) => String(r.reviewerId) !== String(uid)) || null
})

const reviewPlaceholder = computed(() => {
  const status = order.value?.status
  if (status !== 'COMPLETED') return '订单完成后（7 天内）双方可互评，允许弃评'
  return '已过评价期（完成后 7 天内有效）或您不是本单参与方'
})

async function submitReview() {
  if (!reviewForm.score) return
  await reviewOrder(order.value.id, { score: reviewForm.score, content: reviewForm.content })
  ElMessage.success('评价成功')
  load()
}

async function onConfirm() {
  await ElMessageBox.confirm('确认出售该商品？确认后请与买家约定面交时间。', '确认出售', { type: 'warning' })
  await confirmOrder(order.value.id)
  ElMessage.success('已确认，订单进入待面交')
  load()
}

async function onReject() {
  const { value } = await ElMessageBox.prompt('拒绝后订单将取消，商品重新上架。可填写拒绝理由：', '拒绝订单', {
    inputPlaceholder: '理由（可选，200 字内）',
    confirmButtonClass: 'el-button--danger'
  })
  await rejectOrder(order.value.id, value || '')
  ElMessage.success('已拒绝')
  load()
}

async function onCancel() {
  await ElMessageBox.confirm('取消后订单不可恢复，商品将重新上架。', '取消订单', {
    type: 'warning',
    confirmButtonText: '确定取消',
    cancelButtonText: '再想想'
  })
  await cancelOrder(order.value.id, '')
  ElMessage.success('订单已取消')
  load()
}

async function onComplete() {
  const tip = order.value.type === 'SWAP'
    ? '请务必当面确认收到物品后再点击确认。'
    : '请务必当面验收并收到款项后再点击确认。'
  await ElMessageBox.confirm(tip, '确认完成交易', { type: 'warning' })
  await completeOrder(order.value.id)
  ElMessage.success('操作成功')
  load()
}

function creditLevel(score) {
  const s = score ?? 0
  if (s >= 120) return '优秀'
  if (s >= 80) return '良好'
  if (s >= 60) return '一般'
  return '受限'
}

function creditTagType(score) {
  const s = score ?? 0
  if (s >= 120) return 'success'
  if (s >= 80) return 'primary'
  if (s >= 60) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.order-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  padding: 24px 0;
}
.detail-main,
.detail-side {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.skeleton-block {
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  padding: 20px;
}
.block-card {
  border-radius: var(--radius-card);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.swap-confirm {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-control);
  padding: 12px 16px;
}
.swap-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
.cancel-alert {
  margin-top: 16px;
}
.face-tip {
  margin-top: 16px;
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}
.detail-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}
.goods-card {
  display: flex;
  gap: 12px;
  cursor: pointer;
  align-items: center;
  border-radius: var(--radius-control);
  transition: background 0.2s ease;
}
.goods-card:hover {
  background: var(--color-page-bg);
}
.goods-thumb {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-image);
  flex-shrink: 0;
  background: var(--color-page-bg);
}
.thumb-fallback {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
}
.goods-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.goods-title {
  font-weight: 600;
}
.no-goods {
  color: #909399;
  font-size: 13px;
}
.party-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.party-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.party-name {
  font-weight: 600;
}
.meta-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
  padding: 4px 0;
}
.meta-line span:first-child {
  color: #909399;
}
.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.review-content {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.review-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.review-submit {
  align-self: flex-end;
}
.review-empty {
  color: #909399;
  font-size: 13px;
}
.placeholder-card {
  margin: 24px 0;
  border-radius: var(--radius-card);
}
</style>
