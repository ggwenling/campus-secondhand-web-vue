<template>
  <div class="page order-list-page">
    <h2 class="page-title">我的订单</h2>

    <el-tabs v-model="activeTab" class="order-tabs" @tab-change="search">
      <el-tab-pane label="我买到的" name="buyer" />
      <el-tab-pane label="我卖出的" name="seller" />
    </el-tabs>

    <div class="toolbar">
      <el-select v-model="status" class="status-select" placeholder="全部状态" clearable @change="search">
        <el-option v-for="(meta, key) in STATUS_META" :key="key" :label="meta.label" :value="key" />
      </el-select>
      <span class="total-note">共 {{ total }} 笔</span>
    </div>

    <div v-if="loading" class="order-stack">
      <el-skeleton v-for="i in 4" :key="i" :rows="3" animated class="skeleton-row" />
    </div>
    <template v-else>
      <div v-if="orders.length" class="order-stack">
        <el-card v-for="order in orders" :key="order.id" class="order-card" shadow="never" @click="goDetail(order)">
          <!-- 商品缩略 -->
          <el-image class="goods-thumb" :src="order.goodsCoverUrl || undefined" fit="cover" loading="lazy">
            <template #error>
              <div class="thumb-fallback">无图</div>
            </template>
          </el-image>

          <div class="order-main">
            <div class="order-line-1">
              <span class="goods-title">{{ order.goodsTitle || '（商品已不可见）' }}</span>
              <el-tag :type="STATUS_META[order.status]?.type || 'info'" size="small" effect="light">
                {{ STATUS_META[order.status]?.label || order.status }}
              </el-tag>
            </div>
            <div class="order-line-2">
              <span class="order-no">单号 {{ order.orderNo }}</span>
              <span class="counterpart">
                {{ order.viewRole === 'buyer' ? '卖家' : '买家' }}：{{ order.counterpartNickname || '校园用户' }}
              </span>
              <el-tag size="small" :type="creditTagType(order.counterpartCreditScore)" effect="plain">
                信用 {{ creditLevel(order.counterpartCreditScore) }}
              </el-tag>
            </div>
            <div class="order-line-3">
              <PriceText :value="order.amount" />
              <span class="time-note">{{ relativeTime(order.createdAt) }}</span>
            </div>
          </div>

          <!-- 操作按钮组：随状态与角色显隐（PRD ORD-02~04/06） -->
          <div class="order-actions" @click.stop>
            <el-button v-if="order.canConfirm" type="primary" size="small" @click="onConfirm(order)">确认出售</el-button>
            <el-button v-if="order.canReject" size="small" @click="onReject(order)">拒绝</el-button>
            <el-button v-if="order.canCancel" size="small" type="danger" plain @click="onCancel(order)">取消订单</el-button>
            <el-button v-if="order.canComplete" type="primary" size="small" @click="onComplete(order)">
              {{ order.type === 'SWAP' ? '确认收货' : '确认收款' }}
            </el-button>
            <el-button v-if="order.canReview" type="warning" size="small" plain @click="goDetail(order)">去评价</el-button>
            <el-button size="small" text type="primary" @click="goDetail(order)">查看详情</el-button>
          </div>
        </el-card>
      </div>
      <EmptyBlock v-else description="暂无订单，去挑选一件闲置吧" action-text="去逛逛" @action="router.push('/goods')" />
    </template>

    <div class="pager-row">
      <el-pagination
        v-model:current-page="pageNum"
        :page-size="pageSize"
        :page-sizes="[20, 40, 60]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @current-change="load"
        @size-change="search"
      />
    </div>
  </div>
</template>

<script setup>
// 订单列表（PRD ORD-05 / 前端设计文档 §6.1）：买到/卖出 el-tabs + 状态筛选 +
// 订单行卡（缩略/对方/金额/状态 tag/操作按钮随状态与角色显隐）
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pageOrders, confirmOrder, rejectOrder, cancelOrder, completeOrder } from '@/api/order'
import PriceText from '@/components/PriceText.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'

const STATUS_META = {
  WAIT_CONFIRM: { label: '待确认', type: 'warning' },
  SCHEDULED: { label: '待面交', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' }
}

const router = useRouter()
const activeTab = ref('buyer')
const status = ref('')
const orders = ref([])
const total = ref(0)
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(20)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const params = { role: activeTab.value, pageNum: pageNum.value, pageSize: pageSize.value }
    if (status.value) params.status = status.value
    const res = await pageOrders(params)
    orders.value = res.data.list || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

function search() {
  pageNum.value = 1
  load()
}

function goDetail(order) {
  router.push(`/orders/${order.id}`)
}

async function onConfirm(order) {
  await ElMessageBox.confirm('确认出售该商品？确认后请与买家约定面交时间。', '确认出售', { type: 'warning' })
  await confirmOrder(order.id)
  ElMessage.success('已确认，订单进入待面交')
  load()
}

async function onReject(order) {
  const { value } = await ElMessageBox.prompt('拒绝后订单将取消，商品重新上架。可填写拒绝理由：', '拒绝订单', {
    inputPlaceholder: '理由（可选，200 字内）',
    confirmButtonClass: 'el-button--danger'
  })
  await rejectOrder(order.id, value || '')
  ElMessage.success('已拒绝，商品已重新上架')
  load()
}

async function onCancel(order) {
  await ElMessageBox.confirm('取消后订单不可恢复，商品将重新上架。', '取消订单', {
    type: 'warning',
    confirmButtonText: '确定取消',
    cancelButtonText: '再想想'
  })
  await cancelOrder(order.id, '')
  ElMessage.success('订单已取消')
  load()
}

async function onComplete(order) {
  const tip = order.type === 'SWAP'
    ? '请务必当面确认收到物品后再点击确认。'
    : '请务必当面验收并收到款项后再点击确认。'
  await ElMessageBox.confirm(tip, '确认完成交易', { type: 'warning' })
  await completeOrder(order.id)
  ElMessage.success('操作成功')
  load()
}

// ---- 通用展示（前端设计文档 §7：相对时间 / 信用四档） ----
function relativeTime(value) {
  if (!value) return ''
  const t = new Date(value.replace(/-/g, '/'))
  const diff = Date.now() - t.getTime()
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  const sameDay = new Date().toDateString() === t.toDateString()
  if (sameDay) return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  if (t.getFullYear() === new Date().getFullYear()) {
    return `${t.getMonth() + 1}-${String(t.getDate()).padStart(2, '0')}`
  }
  return value.slice(0, 10)
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
.order-list-page {
  max-width: 1200px;
  margin: 0 auto;
}
.page-title {
  margin: 24px 0 8px;
}
.order-tabs :deep(.el-tabs__item.is-active) {
  color: var(--color-primary);
}
.order-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--color-primary);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.status-select {
  width: 160px;
}
.total-note {
  color: #909399;
  font-size: 13px;
}
.order-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-row {
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  padding: 16px;
}
.order-card {
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.order-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-4px);
}
.order-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
}
.goods-thumb {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-image);
  flex-shrink: 0;
  background: var(--color-page-bg);
}
.thumb-fallback {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  background: var(--color-page-bg);
}
.order-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.order-line-1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.goods-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-line-2 {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #606266;
  font-size: 13px;
}
.order-no {
  color: #909399;
}
.order-line-3 {
  display: flex;
  align-items: center;
  gap: 12px;
}
.time-note {
  color: #909399;
  font-size: 12px;
}
.order-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  flex-shrink: 0;
  min-width: 96px;
}
.order-actions .el-button {
  margin-left: 0;
}
.pager-row {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}
</style>
