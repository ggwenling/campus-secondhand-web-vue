<template>
  <div class="page detail-page">
    <el-skeleton v-if="loading" :rows="6" animated class="detail-skeleton" />

    <template v-else-if="detail">
      <div class="detail-top">
        <!-- 左：图集 -->
        <div class="gallery">
          <el-carousel
            v-if="detail.images?.length"
            height="420px"
            :autoplay="false"
            indicator-position="outside"
            arrow="always"
          >
            <el-carousel-item v-for="img in detail.images" :key="img.url">
              <img :src="img.url" class="gallery-img" alt="" />
            </el-carousel-item>
          </el-carousel>
          <div v-else class="gallery-empty">暂无图片</div>
        </div>

        <!-- 右：信息 + 操作 + 卖家卡 -->
        <div class="info-col">
          <h1 class="title">{{ detail.title }}</h1>
          <div class="price-row">
            <PriceText :value="detail.price" size="large" />
          </div>
          <div class="tag-row">
            <el-tag type="info" effect="plain">{{ conditionText }}</el-tag>
            <el-tag effect="light">{{ detail.parentCategoryName }} / {{ detail.categoryName }}</el-tag>
            <el-tag v-for="t in detail.tags" :key="t.id" size="small" effect="light">{{ t.name }}</el-tag>
          </div>
          <div class="stat-row">
            <span><el-icon><View /></el-icon> 浏览 {{ detail.viewCount }}</span>
            <span><el-icon><Star /></el-icon> 想要 {{ detail.wantCount }}</span>
            <span><el-icon><CollectionTag /></el-icon> 收藏 {{ detail.favoriteCount }}</span>
            <span v-if="detail.tradeLocation" class="loc"><el-icon><Location /></el-icon> {{ detail.tradeLocation }}</span>
          </div>
          <div v-if="detail.courseName || detail.isbn" class="textbook-row">
            <el-tag v-if="detail.courseName" type="warning" effect="plain">课程：{{ detail.courseName }}</el-tag>
            <el-tag v-if="detail.isbn" type="warning" effect="plain">ISBN：{{ detail.isbn }}</el-tag>
          </div>

          <div class="action-row">
            <el-button type="primary" size="large" @click="handleChat">
              <el-icon><ChatDotRound /></el-icon>&nbsp;聊一聊
            </el-button>
            <el-tooltip v-if="detail.status !== 'ON_SALE'" :content="statusTip" placement="top">
              <el-button type="warning" size="large" disabled>
                <el-icon><Star /></el-icon>&nbsp;{{ wantLabel }}
              </el-button>
            </el-tooltip>
            <el-button v-else type="warning" size="large" @click="handleWant">
              <el-icon><Star /></el-icon>&nbsp;想要
            </el-button>
            <el-button size="large" :type="detail.favorited ? 'danger' : 'default'" plain @click="toggleFavorite">
              <el-icon><CollectionTag /></el-icon>&nbsp;{{ detail.favorited ? '已收藏' : '收藏' }}
            </el-button>
          </div>

          <!-- 举报商品入口（非本人） -->
          <div v-if="!isOwner" class="report-row">
            <el-button link type="info" size="small" @click="openReport('GOODS')">
              <el-icon><Warning /></el-icon>&nbsp;举报商品
            </el-button>
          </div>

          <UserCard v-if="detail.seller" :user="detail.seller" class="seller-card" />

          <!-- 举报该用户入口（非本人） -->
          <div v-if="!isOwner && detail.seller" class="report-row">
            <el-button link type="info" size="small" @click="openReport('USER')">
              <el-icon><Warning /></el-icon>&nbsp;举报该用户
            </el-button>
          </div>

          <!-- 卖家本人操作（GDS-02）：OFF_SALE→重新上架（on-sale）；DELETED（仅本人可见）→恢复（restore） -->
          <div v-if="isOwner" class="owner-row">
            <el-tag type="info" effect="plain">这是你发布的商品</el-tag>
            <el-button size="small" @click="router.push(`/publish?id=${detail.id}`)">编辑</el-button>
            <el-button v-if="detail.status === 'ON_SALE'" size="small" @click="doOffSale">下架</el-button>
            <el-button v-if="detail.status === 'OFF_SALE'" size="small" type="primary" plain @click="doOnSale">
              重新上架
            </el-button>
            <el-button v-if="detail.status === 'DELETED'" size="small" type="primary" plain @click="doRestore">
              恢复（30 天内）
            </el-button>
            <el-button size="small" type="danger" plain @click="doDelete">删除</el-button>
          </div>
        </div>
      </div>

      <el-card shadow="never" class="desc-card">
        <template #header><b>商品描述</b></template>
        <div class="desc-text">{{ detail.description }}</div>
      </el-card>

      <div class="section-head"><h2 class="section-title">相似推荐</h2></div>
      <div v-if="similar.length" class="card-grid">
        <GoodsCard v-for="g in similar" :key="g.id" :goods="g" />
      </div>
      <EmptyBlock v-else description="暂无相似商品" :image-size="90" />
    </template>

    <EmptyBlock
      v-else
      description="商品不存在或已删除"
      action-text="回首页看看"
      @action="router.push('/')"
    />

    <ReportDialog
      v-model:visible="reportVisible"
      :target-type="reportTarget.type"
      :target-id="reportTarget.id"
      :target-title="reportTarget.title"
    />
  </div>
</template>

<script setup>
// 商品详情（PRD GDS-05/06/08）：图集 + 信息 + 收藏 + 卖家卡 + 相似推荐；浏览埋点由后端完成
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getGoods, pageGoods, addFavorite, removeFavorite, offSaleGoods, onSaleGoods, restoreGoods, deleteGoods } from '@/api/goods'
import { confirmAction } from '@/utils/confirm'
import { createOrder } from '@/api/order'
import { sendChatMessage } from '@/api/message'
import { useUserStore } from '@/stores/user'
import PriceText from '@/components/PriceText.vue'
import UserCard from '@/components/UserCard.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'
import ReportDialog from '@/components/ReportDialog.vue'

const CONDITION = { 1: '全新', 2: '几乎全新', 3: '轻微使用', 4: '明显使用' }

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const detail = ref(null)
const similar = ref([])
const loading = ref(true)

const conditionText = computed(() => CONDITION[detail.value?.conditionLevel] || '—')

/** 非在售时的"想要"按钮提示与文案（PRD §5.3 商品状态机） */
const statusTip = computed(() => ({
  IN_TRANSACTION: '该商品已有买家下单，交易进行中',
  SOLD: '该商品已售出',
  OFF_SALE: '该商品已下架',
  DELETED: '该商品已删除'
}[detail.value?.status] || '当前不可下单'))
const wantLabel = computed(() => (detail.value?.status === 'SOLD' ? '已售出' : '想要'))
const isOwner = computed(() =>
  detail.value && userStore.userInfo?.userId && detail.value.seller?.id === userStore.userInfo.userId
)

// ---- 举报（RPT-01）：商品举报 / 卖家用户举报，本人不显示入口 ----
const reportVisible = ref(false)
const reportTargetType = ref('GOODS')
const reportTarget = computed(() =>
  reportTargetType.value === 'USER'
    ? { type: 'USER', id: detail.value?.seller?.id ?? null, title: detail.value?.seller?.nickname || '' }
    : { type: 'GOODS', id: detail.value?.id ?? null, title: detail.value?.title || '' }
)

function openReport(type) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  reportTargetType.value = type
  reportVisible.value = true
}

watch(() => route.params.id, load, { immediate: true })

// 请求序号守卫（验收 P3）：快速切换商品时丢弃过期响应，防旧数据覆盖新数据
let loadSeq = 0

async function load() {
  const id = route.params.id
  if (!id) return
  const seq = ++loadSeq
  loading.value = true
  try {
    const res = await getGoods(id)
    if (seq !== loadSeq) return
    detail.value = res.data
    // 相似推荐（REC-03）：后端按"同分类 + 共享标签"离线计算并缓存，随详情一并返回；
    // 若推荐结果为空（如无标签且同类商品少），回退为同分类热门商品
    similar.value = (detail.value?.similarGoods || []).filter((g) => g.id !== detail.value.id).slice(0, 6)
    if (!similar.value.length && detail.value?.categoryId) {
      const sim = await pageGoods({ categoryId: detail.value.categoryId, pageNum: 1, pageSize: 7, sort: 'hot' })
      if (seq !== loadSeq) return
      similar.value = (sim.data.list || []).filter((g) => g.id !== detail.value.id).slice(0, 6)
    }
  } catch {
    if (seq !== loadSeq) return
    detail.value = null
  } finally {
    if (seq === loadSeq) {
      loading.value = false
    }
  }
}

/** 想要 = 下单（PRD ORD-01）：生成待确认订单并锁定商品，去订单详情约面交 */
async function handleWant() {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  try {
    const res = await createOrder(detail.value.id)
    ElMessage.success('下单成功！请在聊天中与卖家约好面交时间地点')
    router.push(`/orders/${res.data.id}`)
  } catch (err) {
    const msg = err?.message || ''
    if (msg.includes('认证')) router.push('/verify')
  }
}

/** 聊一聊（PRD CHT-03）：发送商品卡片建立会话，进入消息中心继续沟通 */
async function handleChat() {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!detail.value.seller?.id) return
  try {
    await sendChatMessage({
      peerUserId: detail.value.seller.id,
      msgType: 'GOODS_CARD',
      content: String(detail.value.id)
    })
    ElMessage.success('已发送商品卡片')
    router.push('/message')
  } catch {
    /* 敏感词/限频等错误由 request.js 统一提示 */
  }
}

async function toggleFavorite() {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (detail.value.favorited) {
    await removeFavorite(detail.value.id)
    detail.value.favorited = false
    detail.value.favoriteCount -= 1
    ElMessage.success('已取消收藏')
  } else {
    await addFavorite(detail.value.id)
    detail.value.favorited = true
    detail.value.favoriteCount += 1
    ElMessage.success('已加入收藏')
  }
}

async function doOffSale() {
  if (!(await confirmAction('下架后商品将不在列表展示，可随时重新上架', '下架商品', { type: 'warning' }))) return
  await offSaleGoods(detail.value.id)
  ElMessage.success('已下架')
  load()
}

async function doOnSale() {
  await onSaleGoods(detail.value.id)
  ElMessage.success('已重新上架')
  load()
}

async function doRestore() {
  await restoreGoods(detail.value.id)
  ElMessage.success('已恢复，确认无误后可点击"重新上架"')
  load()
}

async function doDelete() {
  const ok = await confirmAction('删除后商品不再公开展示，30 天内可自行恢复', '删除商品', {
    type: 'warning',
    confirmButtonText: '删除'
  })
  if (!ok) return
  await deleteGoods(detail.value.id)
  ElMessage.success('已删除')
  router.push('/')
}
</script>

<style scoped>
.detail-skeleton {
  background: var(--color-card-bg);
  padding: 24px;
  border-radius: var(--radius-card);
  margin: 24px 0;
}
.detail-top {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  padding: 24px 0;
}
.gallery {
  background: var(--color-card-bg);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.gallery-img {
  width: 100%;
  height: 420px;
  object-fit: cover;
  display: block;
}
.gallery-empty {
  height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}
.info-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.title {
  font-size: 22px;
  margin: 0;
  line-height: 1.5;
}
.price-row {
  padding: 12px 16px;
  background: var(--color-card-bg);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-card);
}
.tag-row,
.textbook-row,
.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.stat-row {
  color: #909399;
  font-size: 13px;
}
.stat-row span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.loc {
  margin-left: auto;
}
.action-row {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}
.owner-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.report-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.desc-card {
  border-radius: var(--radius-card);
  margin-bottom: 24px;
}
.desc-text {
  white-space: pre-wrap;
  line-height: 1.8;
}
.section-head {
  margin: 0 0 16px;
}
.section-title {
  font-size: 20px;
  margin: 0;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
</style>
