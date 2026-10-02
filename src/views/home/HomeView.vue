<template>
  <div class="page home-page">
    <!-- 轮播：主色渐变 hero 兜底（§8-3），真实轮播数据随 ADM-07 运营配置上线 -->
    <el-carousel height="300px" class="hero" :autoplay="false">
      <el-carousel-item>
        <div class="hero-slide">
          <h1>校园淘 · 让闲置流动起来</h1>
          <p>认证同学 · 可信交易 · 线下面交</p>
        </div>
      </el-carousel-item>
    </el-carousel>

    <!-- 分类宫格：10 个一级分类（PRD §12.1） -->
    <div class="category-grid">
      <div v-for="c in categories" :key="c.id" class="category-item" @click="goCategory(c)">
        <el-icon :size="26"><Grid /></el-icon>
        <span>{{ c.name }}</span>
      </div>
    </div>

    <div class="content-grid">
      <div class="main-col">
        <!-- 猜你喜欢：REC-01 上线前以热门兜底（PRD REC-02 冷启动口径） -->
        <div class="section-head">
          <h2 class="section-title">猜你喜欢</h2>
          <span class="section-note">个性化推荐上线前展示热门商品</span>
        </div>
        <div v-if="hotLoading" class="card-grid">
          <el-skeleton v-for="i in 8" :key="i" :rows="3" animated class="skeleton-card" />
        </div>
        <template v-else>
          <div v-if="hotGoods.length" class="card-grid">
            <GoodsCard v-for="g in hotGoods" :key="g.id" :goods="g" />
          </div>
          <EmptyBlock v-else description="还没有商品，快来发布第一件闲置" action-text="去发布" @action="router.push('/publish')" />
        </template>

        <div class="section-head">
          <h2 class="section-title">最新发布</h2>
        </div>
        <div v-if="latestLoading" class="card-grid">
          <el-skeleton v-for="i in 8" :key="i" :rows="3" animated class="skeleton-card" />
        </div>
        <template v-else>
          <div v-if="latestGoods.length" class="card-grid">
            <GoodsCard v-for="g in latestGoods" :key="g.id" :goods="g" />
          </div>
          <EmptyBlock v-else description="暂无最新发布" />
        </template>
        <div class="pager-row">
          <el-pagination
            v-model:current-page="latestPage"
            layout="prev, pager, next"
            :page-size="12"
            :total="latestTotal"
            @current-change="loadLatest"
          />
        </div>
      </div>

      <div class="side-col">
        <el-card shadow="never" class="side-card">
          <template #header><b>平台公告</b></template>
          <el-empty description="公告随运营配置上线（ADM-07）" :image-size="80" />
        </el-card>
        <el-card shadow="never" class="side-card">
          <template #header><b>热度榜 · Top 10</b></template>
          <div v-if="hotList.length" class="rank-list">
            <div v-for="(g, idx) in hotList" :key="g.id" class="rank-item" @click="router.push(`/goods/${g.id}`)">
              <span class="rank-no" :class="{ top: idx < 3 }">{{ idx + 1 }}</span>
              <span class="rank-title">{{ g.title }}</span>
              <span class="rank-heat">{{ g.viewCount }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无数据" :image-size="80" />
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
// 首页（前端设计文档 §6.1）：渐变 hero + 分类宫格 + 商品流 + 公告/热度榜侧栏
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { pageGoods, listCategories } from '@/api/goods'
import GoodsCard from '@/components/GoodsCard.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'

const router = useRouter()

const categories = ref([])
const hotGoods = ref([])
const hotLoading = ref(true)
const latestGoods = ref([])
const latestTotal = ref(0)
const latestPage = ref(1)
const latestLoading = ref(true)
const hotList = ref([])

onMounted(async () => {
  listCategories().then((res) => { categories.value = res.data || [] }).catch(() => {})
  pageGoods({ pageNum: 1, pageSize: 8, sort: 'hot' })
    .then((res) => {
      hotGoods.value = res.data.list || []
      hotList.value = (res.data.list || []).slice(0, 10)
    })
    .finally(() => { hotLoading.value = false })
  loadLatest()
})

function goCategory(c) {
  router.push({ path: '/goods', query: { categoryId: c.id } })
}

async function loadLatest() {
  latestLoading.value = true
  try {
    const res = await pageGoods({ pageNum: latestPage.value, pageSize: 12, sort: 'latest' })
    latestGoods.value = res.data.list || []
    latestTotal.value = res.data.total || 0
  } finally {
    latestLoading.value = false
  }
}
</script>

<style scoped>
.hero {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
}
.hero-slide {
  height: 100%;
  background: linear-gradient(120deg, #00b578, #33c48f);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.hero-slide h1 {
  font-size: 34px;
  margin: 0;
  letter-spacing: 2px;
}
.hero-slide p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  background: var(--color-card-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  color: #303133;
  font-size: 13px;
  transition: transform 0.2s, box-shadow 0.2s, color 0.2s;
}
.category-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  color: var(--color-primary);
}
.content-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
}
.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 8px 0 16px;
}
.section-title {
  font-size: 20px;
  margin: 0;
}
.section-note {
  color: #909399;
  font-size: 12px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.skeleton-card {
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  padding: 12px;
}
.pager-row {
  display: flex;
  justify-content: center;
  margin: 16px 0 24px;
}
.side-card {
  border-radius: var(--radius-card);
  margin-bottom: 16px;
}
.rank-list {
  display: flex;
  flex-direction: column;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  cursor: pointer;
  font-size: 13px;
}
.rank-item:hover .rank-title {
  color: var(--color-primary);
}
.rank-no {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--color-page-bg);
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}
.rank-no.top {
  background: var(--color-primary);
  color: #fff;
}
.rank-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-heat {
  color: #909399;
  font-size: 12px;
}
</style>
