<template>
  <el-card class="goods-card" shadow="never" @click="router.push(`/goods/${goods.id}`)">
    <div class="cover-wrap">
      <img v-if="goods.coverUrl" :src="goods.coverUrl" class="cover" loading="lazy" alt="" />
      <div v-else class="cover cover-fallback">暂无图片</div>
      <el-tag v-if="goods.status && goods.status !== 'ON_SALE'" class="status-tag" size="small" type="info">
        {{ statusText }}
      </el-tag>
    </div>
    <div class="card-body">
      <div class="title">{{ goods.title }}</div>
      <PriceText :value="goods.price" />
      <div class="meta-row">
        <el-tag size="small" type="info" effect="plain">{{ conditionText }}</el-tag>
        <el-tag v-for="tag in (goods.tags || []).slice(0, 3)" :key="tag.id" size="small" effect="light">
          {{ tag.name }}
        </el-tag>
        <span v-if="(goods.tags || []).length > 3" class="more-tag">+{{ goods.tags.length - 3 }}</span>
      </div>
      <div class="foot-row">
        <span class="stat"><el-icon><View /></el-icon>{{ goods.viewCount ?? 0 }}</span>
        <span class="stat"><el-icon><Star /></el-icon>{{ goods.wantCount ?? 0 }}</span>
        <span class="time">{{ shortTime }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
// 全站复用商品卡（前端设计文档 §6.1）：4:3 封面 + 两行标题 + 价格 + 标签行 + 计数；悬停上浮（§8-1）
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PriceText from './PriceText.vue'

const props = defineProps({
  goods: { type: Object, required: true }
})

const router = useRouter()

const CONDITION = { 1: '全新', 2: '几乎全新', 3: '轻微使用', 4: '明显使用' }
const STATUS = { IN_TRANSACTION: '交易中', SOLD: '已售出', OFF_SALE: '已下架' }

const conditionText = computed(() => CONDITION[props.goods.conditionLevel] || '—')
const statusText = computed(() => STATUS[props.goods.status] || '')
const shortTime = computed(() => {
  const t = props.goods.createdAt
  return t ? String(t).slice(5, 10) : ''
})
</script>

<style scoped>
.goods-card {
  cursor: pointer;
  border-radius: var(--radius-card);
  transition: transform 0.2s, box-shadow 0.2s;
}
.goods-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}
.cover-wrap {
  position: relative;
}
.cover {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-image);
  display: block;
  background: var(--color-page-bg);
}
.cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 13px;
}
.status-tag {
  position: absolute;
  top: 8px;
  right: 8px;
}
.card-body {
  padding: 12px 4px 4px;
}
.title {
  font-size: 14px;
  line-height: 1.5;
  height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0;
  flex-wrap: wrap;
}
.more-tag {
  color: #909399;
  font-size: 12px;
}
.foot-row {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #909399;
  font-size: 12px;
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.time {
  margin-left: auto;
}
</style>
