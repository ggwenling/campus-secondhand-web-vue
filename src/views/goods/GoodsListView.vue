<template>
  <div class="page list-page">
    <div class="list-grid">
      <!-- 左筛选器（前端设计文档 §6.1 商品列表） -->
      <el-card class="filter-card" shadow="never">
        <template #header><b>筛选</b></template>
        <el-radio-group v-model="mode" class="mode-row" @change="onModeChange">
          <el-radio-button value="all">全部商品</el-radio-button>
          <el-radio-button value="textbook">教材专区</el-radio-button>
        </el-radio-group>

        <div class="filter-block">
          <div class="filter-label">分类</div>
          <el-tree
            ref="treeRef"
            :data="categories"
            :props="{ label: 'name', children: 'children' }"
            node-key="id"
            highlight-current
            :expand-on-click-node="false"
            @node-click="onCategoryClick"
          />
        </div>

        <div class="filter-block">
          <div class="filter-label">价格区间</div>
          <div class="price-row">
            <el-input-number v-model="filters.minPrice" :min="0" :precision="2" :controls="false" placeholder="最低价" />
            <span class="dash">—</span>
            <el-input-number v-model="filters.maxPrice" :min="0" :precision="2" :controls="false" placeholder="最高价" />
          </div>
        </div>

        <div class="filter-block">
          <div class="filter-label">成色</div>
          <el-checkbox-group v-model="conditionPicked" class="condition-group">
            <el-checkbox v-for="(text, level) in CONDITION" :key="level" :value="Number(level)">{{ text }}</el-checkbox>
          </el-checkbox-group>
        </div>

        <template v-if="mode === 'textbook'">
          <div class="filter-block">
            <div class="filter-label">课程名（GDS-07）</div>
            <el-input v-model="filters.courseName" placeholder="如：高等数学" clearable />
          </div>
          <div class="filter-block">
            <div class="filter-label">ISBN</div>
            <el-input v-model="filters.isbn" placeholder="ISBN" clearable />
          </div>
        </template>

        <div class="filter-actions">
          <el-button type="primary" @click="search">确定</el-button>
          <el-button @click="reset">重置</el-button>
        </div>
      </el-card>

      <!-- 右：排序 + 商品网格 -->
      <div class="result-col">
        <div class="result-head">
          <el-radio-group v-model="filters.sort" @change="search">
            <el-radio-button value="latest">最新</el-radio-button>
            <el-radio-button value="priceAsc">价格↑</el-radio-button>
            <el-radio-button value="priceDesc">价格↓</el-radio-button>
            <el-radio-button value="hot">热度</el-radio-button>
          </el-radio-group>
          <span class="total-note">共 {{ total }} 件</span>
        </div>

        <div v-if="loading" class="card-grid">
          <el-skeleton v-for="i in 8" :key="i" :rows="3" animated class="skeleton-card" />
        </div>
        <template v-else>
          <div v-if="goodsList.length" class="card-grid">
            <GoodsCard v-for="g in goodsList" :key="g.id" :goods="g" />
          </div>
          <EmptyBlock
            v-else
            description="没有符合条件的商品"
            action-text="去发布一件"
            @action="router.push('/publish')"
          />
        </template>

        <div class="pager-row">
          <el-pagination
            v-model:current-page="filters.pageNum"
            :page-size="filters.pageSize"
            :page-sizes="[20, 40, 60]"
            layout="total, sizes, prev, pager, next"
            :total="total"
            @current-change="load"
            @size-change="search"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 商品列表（PRD GDS-03/04/07）：分类/价格/成色筛选 + 排序 + 分页 + 教材专区 Tab
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pageGoods, listCategories } from '@/api/goods'
import GoodsCard from '@/components/GoodsCard.vue'
import EmptyBlock from '@/components/EmptyBlock.vue'

const CONDITION = { 1: '全新', 2: '几乎全新', 3: '轻微使用', 4: '明显使用' }

const route = useRoute()
const router = useRouter()

const mode = ref(route.query.tab === 'textbook' ? 'textbook' : 'all')
const categories = ref([])
const treeRef = ref()
const goodsList = ref([])
const total = ref(0)
const loading = ref(true)
const conditionPicked = ref([])

const filters = reactive({
  pageNum: Number(route.query.pageNum) || 1,
  pageSize: 20,
  categoryId: Number(route.query.categoryId) || null,
  conditionLevel: null,
  minPrice: undefined,
  maxPrice: undefined,
  q: route.query.q || '',
  courseName: '',
  isbn: '',
  sort: 'latest'
})

onMounted(async () => {
  listCategories().then((res) => { categories.value = res.data || [] }).catch(() => {})
  load()
})

function onModeChange() {
  filters.courseName = ''
  filters.isbn = ''
  search()
}

function onCategoryClick(node) {
  filters.categoryId = node.id
  search()
}

function buildParams() {
  const params = {
    pageNum: filters.pageNum,
    pageSize: filters.pageSize,
    sort: filters.sort
  }
  if (filters.categoryId) params.categoryId = filters.categoryId
  if (conditionPicked.value.length === 1) params.conditionLevel = conditionPicked.value[0]
  if (filters.minPrice != null) params.minPrice = filters.minPrice
  if (filters.maxPrice != null) params.maxPrice = filters.maxPrice
  if (filters.q) params.q = filters.q
  if (mode.value === 'textbook') {
    if (filters.courseName) params.courseName = filters.courseName
    if (filters.isbn) params.isbn = filters.isbn
  }
  return params
}

async function load() {
  loading.value = true
  try {
    const res = await pageGoods(buildParams())
    goodsList.value = res.data.list || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

function search() {
  filters.pageNum = 1
  load()
}

function reset() {
  filters.categoryId = null
  conditionPicked.value = []
  filters.minPrice = undefined
  filters.maxPrice = undefined
  filters.q = ''
  filters.courseName = ''
  filters.isbn = ''
  treeRef.value?.setCheckedKeys([])
  if (treeRef.value?.getCurrentNode) treeRef.value.setCurrentKey(null)
  search()
}
</script>

<style scoped>
.list-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  padding: 24px 0;
}
.filter-card {
  border-radius: var(--radius-card);
  align-self: start;
  position: sticky;
  top: 76px;
}
.mode-row {
  width: 100%;
  margin-bottom: 16px;
}
.mode-row :deep(.el-radio-button) {
  width: 50%;
}
.mode-row :deep(.el-radio-button__inner) {
  width: 100%;
}
.filter-block {
  margin-bottom: 16px;
}
.filter-label {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}
.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-row .el-input-number {
  width: 100%;
}
.dash {
  color: #909399;
}
.condition-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.filter-actions {
  display: flex;
  gap: 12px;
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.total-note {
  color: #909399;
  font-size: 13px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.skeleton-card {
  border-radius: var(--radius-card);
  background: var(--color-card-bg);
  padding: 12px;
}
.pager-row {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}
</style>
