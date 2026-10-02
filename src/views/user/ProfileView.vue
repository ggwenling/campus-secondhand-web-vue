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

      <!-- 右：数据 Tab（USR-06 / GDS-06 / ORD-05 / CRD-03，懒加载） -->
      <el-card class="main-card" shadow="never">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="我的商品" name="goods" />
          <el-tab-pane label="收藏" name="favorites" />
          <el-tab-pane label="买到的" name="bought" />
          <el-tab-pane label="卖出的" name="sold" />
          <el-tab-pane label="收到的评价" name="reviews" />
          <el-tab-pane label="信用记录" name="credits" />
          <el-tab-pane label="我的举报" name="reports" />

          <!-- 我的商品 -->
          <div v-show="activeTab === 'goods'" class="tab-body">
            <div v-if="tabLoading.goods" class="card-grid"><el-skeleton v-for="i in 4" :key="i" :rows="3" animated /></div>
            <div v-else-if="myGoods.length" class="card-grid">
              <GoodsCard v-for="g in myGoods" :key="g.id" :goods="g" />
            </div>
            <EmptyBlock v-else description="还没有发布过商品" action-text="去发布" @action="router.push('/publish')" />
          </div>

          <!-- 收藏 -->
          <div v-show="activeTab === 'favorites'" class="tab-body">
            <div v-if="tabLoading.favorites" class="card-grid"><el-skeleton v-for="i in 4" :key="i" :rows="3" animated /></div>
            <div v-else-if="favorites.length" class="card-grid">
              <GoodsCard v-for="f in favorites" :key="f.id" :goods="f.goods" />
            </div>
            <EmptyBlock v-else description="还没有收藏的商品" action-text="去逛逛" @action="router.push('/goods')" />
          </div>

          <!-- 买到的 / 卖出的 -->
          <div v-show="activeTab === 'bought' || activeTab === 'sold'" class="tab-body">
            <div v-if="tabLoading[activeTab]"><el-skeleton :rows="5" animated /></div>
            <template v-else>
              <div v-if="orderRows.length">
                <div v-for="o in orderRows" :key="o.id" class="order-row" @click="router.push(`/orders/${o.id}`)">
                  <img :src="o.goodsCoverUrl || ''" class="row-cover" alt="" />
                  <div class="row-main">
                    <div class="row-title">{{ o.goodsTitle }}</div>
                    <div class="row-counterpart">
                      <el-avatar :size="20" :src="o.counterpartAvatar || undefined">{{ (o.counterpartNickname || '同')[0] }}</el-avatar>
                      {{ o.counterpartNickname }}
                    </div>
                  </div>
                  <PriceText :value="o.amount" />
                  <el-tag size="small" :type="orderTagType(o.status)" effect="light">{{ orderText(o.status) }}</el-tag>
                  <span class="row-time">{{ shortTime(o.createdAt) }}</span>
                  <el-button size="small" text type="primary">详情</el-button>
                </div>
                <div class="pager-row">
                  <el-pagination layout="prev, pager, next" :page-size="10" :total="orderTotal"
                    :current-page="orderPage" @current-change="(p) => loadOrders(activeTab, p)" />
                </div>
              </div>
              <EmptyBlock v-else description="暂无订单" :image-size="100" />
            </template>
          </div>

          <!-- 收到的评价 -->
          <div v-show="activeTab === 'reviews'" class="tab-body">
            <div v-if="tabLoading.reviews"><el-skeleton :rows="5" animated /></div>
            <template v-else>
              <div v-if="reviewList.length" class="review-list">
                <div v-for="r in reviewList" :key="r.id" class="review-item">
                  <el-avatar :size="36" :src="r.reviewerAvatar || undefined">{{ (r.reviewerNickname || '同')[0] }}</el-avatar>
                  <div class="review-main">
                    <div class="review-head">
                      <span class="review-name">{{ r.reviewerNickname }}</span>
                      <el-rate :model-value="r.score" disabled size="small" />
                      <span class="review-time">{{ shortTime(r.createdAt) }}</span>
                    </div>
                    <div class="review-content">{{ r.content || '默认好评' }}</div>
                  </div>
                </div>
              </div>
              <EmptyBlock v-else description="还没有收到评价，完成交易后互评（ORD-06）" :image-size="100" />
            </template>
          </div>

          <!-- 信用记录 -->
          <div v-show="activeTab === 'credits'" class="tab-body">
            <div v-if="tabLoading.credits"><el-skeleton :rows="5" animated /></div>
            <template v-else>
              <div v-if="creditList.length" class="credit-list">
                <div v-for="c in creditList" :key="c.id" class="credit-item">
                  <div class="credit-info">
                    <div class="credit-reason">{{ creditReason(c.reason) }}</div>
                    <div class="credit-time">{{ c.createdAt }}</div>
                  </div>
                  <div class="credit-change">
                    <b :class="c.scoreChange >= 0 ? 'plus' : 'minus'">{{ c.scoreChange >= 0 ? '+' : '' }}{{ c.scoreChange }}</b>
                    <span class="credit-after">→ {{ c.afterScore }} 分</span>
                  </div>
                </div>
                <div class="pager-row">
                  <el-pagination layout="prev, pager, next" :page-size="10" :total="creditTotal"
                    :current-page="creditPage" @current-change="(p) => loadCredits(p)" />
                </div>
              </div>
              <EmptyBlock v-else description="暂无信用变动记录，完成交易可加分（PRD §5.7）" :image-size="100" />
            </template>
          </div>

          <!-- 我的举报 -->
          <div v-show="activeTab === 'reports'" class="tab-body">
            <EmptyBlock description="举报进度随 M7 上线后在此展示（RPT-02）" :image-size="100" />
          </div>
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
// 个人中心（PRD USR-04~06 / GDS-06 / ORD-05 / CRD-03 / §5.7）：七 Tab 懒加载
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { updateProfile, getMyCredits } from '@/api/user'
import { pageMyGoods, pageMyFavorites } from '@/api/goods'
import { pageOrders, pageReviews } from '@/api/order'
import { getToken } from '@/utils/auth'
import GoodsCard from '@/components/GoodsCard.vue'
import PriceText from '@/components/PriceText.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'

const router = useRouter()
const userStore = useUserStore()

const profile = computed(() => userStore.userInfo)
const activeTab = ref('goods')

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

// ---- Tab 数据（懒加载，一次拉取后缓存） ----
const tabLoading = reactive({ goods: false, favorites: false, bought: false, sold: false, reviews: false, credits: false })
const loaded = reactive({})
const myGoods = ref([])
const favorites = ref([])
const orderRows = ref([])
const orderTotal = ref(0)
const orderPage = ref(1)
const reviewList = ref([])
const creditList = ref([])
const creditTotal = ref(0)
const creditPage = ref(1)

watch(activeTab, (tab) => {
  if (tab === 'goods') loadGoods()
  else if (tab === 'favorites') loadFavorites()
  else if (tab === 'bought' || tab === 'sold') loadOrders(tab, 1)
  else if (tab === 'reviews') loadReviews()
  else if (tab === 'credits') loadCredits(1)
}, { immediate: true })

async function loadGoods() {
  if (loaded.goods) return
  tabLoading.goods = true
  try {
    const res = await pageMyGoods({ pageNum: 1, pageSize: 50 })
    myGoods.value = res.data.list || []
    loaded.goods = true
  } finally { tabLoading.goods = false }
}

async function loadFavorites() {
  if (loaded.favorites) return
  tabLoading.favorites = true
  try {
    const res = await pageMyFavorites({ pageNum: 1, pageSize: 50 })
    favorites.value = (res.data.list || []).filter((f) => f.goods)
    loaded.favorites = true
  } finally { tabLoading.favorites = false }
}

async function loadOrders(tab, page) {
  const role = tab === 'bought' ? 'buyer' : 'seller'
  tabLoading[tab] = true
  try {
    const res = await pageOrders({ role, pageNum: page, pageSize: 10 })
    orderRows.value = res.data.list || []
    orderTotal.value = res.data.total || 0
    orderPage.value = page
    loaded[tab] = true
  } finally { tabLoading[tab] = false }
}

async function loadReviews() {
  if (loaded.reviews) return
  tabLoading.reviews = true
  try {
    const res = await pageReviews({ revieweeId: profile.value?.userId, pageNum: 1, pageSize: 20 })
    reviewList.value = res.data.list || []
    loaded.reviews = true
  } finally { tabLoading.reviews = false }
}

async function loadCredits(page) {
  tabLoading.credits = true
  try {
    const res = await getMyCredits({ pageNum: page, pageSize: 10 })
    creditList.value = res.data.list || []
    creditTotal.value = res.data.total || 0
    creditPage.value = page
  } finally { tabLoading.credits = false }
}

// ---- 展示映射 ----
const ORDER_TEXT = { WAIT_CONFIRM: '待确认', SCHEDULED: '待面交', COMPLETED: '已完成', CANCELLED: '已取消' }
const ORDER_TAG = { WAIT_CONFIRM: 'warning', SCHEDULED: 'primary', COMPLETED: 'success', CANCELLED: 'info' }
const CREDIT_REASON = {
  ORDER_COMPLETE: '完成交易加分',
  REPORT_VALID: '发布违规内容',
  CANCEL_TIMEOUT: '订单超时未确认',
  MALICIOUS_REPORT: '恶意举报',
  ADMIN_ADJUST: '管理员调整'
}
function orderText(s) { return ORDER_TEXT[s] || s }
function orderTagType(s) { return ORDER_TAG[s] || 'info' }
function creditReason(r) { return CREDIT_REASON[r] || r }
function shortTime(t) { return t ? String(t).slice(5, 16) : '' }

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
.tab-body {
  min-height: 240px;
  padding-top: 8px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.order-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}
.order-row:hover {
  background: var(--color-primary-bg);
  border-radius: var(--radius-control);
}
.row-cover {
  width: 64px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-image);
  background: var(--color-page-bg);
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-counterpart {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
.row-time {
  color: #909399;
  font-size: 12px;
}
.pager-row {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.review-list,
.credit-list {
  display: flex;
  flex-direction: column;
}
.review-item,
.credit-item {
  display: flex;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
}
.review-main {
  flex: 1;
}
.review-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.review-name {
  font-weight: 600;
  font-size: 13px;
}
.review-time {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}
.review-content {
  color: #606266;
  font-size: 13px;
  margin-top: 4px;
}
.credit-info {
  flex: 1;
}
.credit-reason {
  font-size: 14px;
}
.credit-time {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
.credit-change {
  text-align: right;
}
.credit-change .plus {
  color: var(--color-primary);
  font-size: 16px;
}
.credit-change .minus {
  color: #f56c6c;
  font-size: 16px;
}
.credit-after {
  display: block;
  color: #909399;
  font-size: 12px;
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
