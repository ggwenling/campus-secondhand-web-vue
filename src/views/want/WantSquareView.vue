<template>
  <div class="page want-square">
    <div class="page-head">
      <div>
        <h2 class="page-title">求购广场</h2>
        <p class="page-sub">说出你想要的，让有货的同学来找你</p>
      </div>
      <el-radio-group v-model="query.status" @change="reload">
        <el-radio-button value="OPEN">求购中</el-radio-button>
        <el-radio-button value="DEALT">已成交</el-radio-button>
        <el-radio-button value="CLOSED">已关闭</el-radio-button>
      </el-radio-group>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-cascader
          v-model="query.categoryId"
          :options="categories"
          :props="{ value: 'id', label: 'name', emitPath: false, checkStrictly: true }"
          placeholder="期望分类"
          clearable
          style="width: 200px"
          @change="reload"
        />
        <el-input
          v-model="query.q"
          placeholder="搜索标题或描述"
          clearable
          style="width: 260px"
          @keyup.enter="reload"
          @clear="reload"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="query.sort" style="width: 150px" @change="reload">
          <el-option label="最新发布" value="latest" />
          <el-option label="预算高到低" value="budgetDesc" />
        </el-select>
        <el-button type="primary" @click="reload">筛选</el-button>
      </div>
    </el-card>

    <div v-if="loading" class="post-grid">
      <el-skeleton v-for="i in 4" :key="i" :rows="4" animated class="skeleton-card" />
    </div>
    <template v-else>
      <div v-if="posts.length" class="post-grid">
        <el-card
          v-for="post in posts"
          :key="post.id"
          shadow="never"
          class="post-card"
          @click="router.push(`/want/${post.id}`)"
        >
          <div class="post-top">
            <h3 class="post-title">{{ post.title }}</h3>
            <el-tag v-if="post.status !== 'OPEN'" size="small" type="info">{{ statusText(post.status) }}</el-tag>
          </div>
          <p class="post-desc">{{ post.description }}</p>
          <div class="post-price">
            <span class="label">心理价</span>
            <PriceText v-if="post.budget !== null && post.budget !== undefined" :value="post.budget" />
            <span v-else class="negotiable">价格面议</span>
          </div>
          <div class="post-foot">
            <div class="publisher">
              <el-avatar :size="28" :src="post.publisher?.avatar || undefined">
                {{ (post.publisher?.nickname || '同')[0] }}
              </el-avatar>
              <span class="nickname">{{ post.publisher?.nickname || '校园用户' }}</span>
              <el-tag size="small" effect="plain" type="info">{{ post.categoryName || '未分类' }}</el-tag>
            </div>
            <div class="foot-right">
              <span v-if="post.myOfferStatus === 0" class="my-state pending">已应约 · 待处理</span>
              <span v-else-if="post.myOfferStatus === 1" class="my-state success">应约已接受</span>
              <span v-else-if="post.myOfferStatus === 2" class="my-state muted">应约被拒绝</span>
              <span class="offer-count"><el-icon><ChatLineSquare /></el-icon>{{ post.offerCount ?? 0 }}</span>
              <span class="time">{{ shortTime(post.createdAt) }}</span>
            </div>
          </div>
        </el-card>
      </div>
      <EmptyBlock
        v-else
        description="还没有求购帖，发布一条试试"
        action-text="发布求购"
        @action="goPublish"
      />
    </template>

    <div v-if="total > query.pageSize" class="pager-row">
      <el-pagination
        v-model:current-page="query.pageNum"
        layout="total, prev, pager, next"
        :page-size="query.pageSize"
        :total="total"
        @current-change="load"
      />
    </div>

    <div class="fab-wrap">
      <el-button type="primary" size="large" round class="fab" @click="goPublish">
        <el-icon><Plus /></el-icon>&nbsp;发布求购
      </el-button>
    </div>
  </div>
</template>

<script setup>
// 求购广场（PRD REQ-02 / 前端设计文档 §6.1）：双列大卡 + 状态/分类/关键词筛选 + 悬浮发布按钮
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { pageWantPosts } from '@/api/want'
import { listCategories } from '@/api/goods'
import PriceText from '@/components/PriceText.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'

const router = useRouter()

const posts = ref([])
const total = ref(0)
const loading = ref(true)
const categories = ref([])
const query = reactive({
  pageNum: 1,
  pageSize: 10,
  status: 'OPEN',
  categoryId: null,
  q: '',
  sort: 'latest'
})

const STATUS = { OPEN: '求购中', DEALT: '已成交', CLOSED: '已关闭' }
const statusText = (s) => STATUS[s] || s
const shortTime = (t) => (t ? String(t).slice(0, 16) : '')

onMounted(() => {
  listCategories().then((res) => { categories.value = res.data || [] }).catch(() => {})
  load()
})

function reload() {
  query.pageNum = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await pageWantPosts({ ...query, categoryId: query.categoryId || undefined })
    posts.value = res.data.list || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

function goPublish() {
  router.push('/want/publish')
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-sub {
  color: #909399;
  font-size: 13px;
  margin: 4px 0 0;
}
.filter-card {
  border-radius: var(--radius-card);
  margin-bottom: 20px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.post-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.skeleton-card {
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  padding: 16px;
}
.post-card {
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}
.post-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.post-title {
  font-size: 17px;
  margin: 0 0 8px;
  line-height: 1.4;
}
.post-desc {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}
.post-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.post-price .label {
  color: #909399;
  font-size: 12px;
}
.negotiable {
  color: var(--color-primary);
  font-weight: 600;
}
.post-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}
.publisher {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
.foot-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}
.my-state.pending {
  color: var(--color-primary);
  font-weight: 600;
}
.my-state.success {
  color: var(--color-primary);
}
.my-state.muted {
  color: #c0c4cc;
}
.offer-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.pager-row {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}
.fab-wrap {
  position: fixed;
  right: max(32px, calc((100vw - 1200px) / 2 + 32px));
  bottom: 48px;
  z-index: 10;
}
.fab {
  box-shadow: 0 8px 24px rgba(0, 181, 120, 0.32);
}
</style>
