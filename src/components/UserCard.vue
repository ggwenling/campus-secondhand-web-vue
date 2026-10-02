<template>
  <el-card class="user-card" shadow="never">
    <div class="seller-row">
      <el-avatar :size="48" :src="user?.avatar || undefined">{{ (user?.nickname || '同')[0] }}</el-avatar>
      <div class="seller-info">
        <div class="seller-name">
          <span class="nickname">{{ user?.nickname || '校园用户' }}</span>
          <el-tag v-if="user?.authStatus === 1" type="success" size="small" effect="light">已认证</el-tag>
        </div>
        <div class="seller-credit">
          <el-tag size="small" :type="creditTagType" effect="light">信用 {{ creditLevel }}</el-tag>
          <span class="credit-score">{{ user?.creditScore ?? '—' }} 分</span>
        </div>
      </div>
    </div>
    <el-divider style="margin: 12px 0" />
    <div class="seller-tip">面交前请在聊天中约好时间地点，见面验货后再确认（PRD §5.3）</div>
  </el-card>
</template>

<script setup>
// 卖家信息卡（前端设计文档 §6.1 商品详情）：头像/昵称/认证徽章/信用等级
import { computed } from 'vue'

const props = defineProps({
  user: { type: Object, default: null }
})

const creditLevel = computed(() => {
  const s = props.user?.creditScore ?? 0
  if (s >= 120) return '优秀'
  if (s >= 80) return '良好'
  if (s >= 60) return '一般'
  return '受限'
})

const creditTagType = computed(() => {
  const s = props.user?.creditScore ?? 0
  if (s >= 120) return 'success'
  if (s >= 80) return 'primary'
  if (s >= 60) return 'warning'
  return 'danger'
})
</script>

<style scoped>
.user-card {
  border-radius: var(--radius-card);
}
.seller-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.seller-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.seller-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nickname {
  font-weight: 600;
}
.seller-credit {
  display: flex;
  align-items: center;
  gap: 8px;
}
.credit-score {
  color: #909399;
  font-size: 12px;
}
.seller-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}
</style>
