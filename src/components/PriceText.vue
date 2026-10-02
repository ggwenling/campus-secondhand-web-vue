<template>
  <span class="price-text" :class="{ free: isFree }">
    <template v-if="!isFree">
      <span class="symbol">¥</span><span class="amount">{{ formatted }}</span>
    </template>
    <template v-else>免费赠送</template>
  </span>
</template>

<script setup>
// 价格统一展示（前端设计文档 §3.3）：¥14px + 金额 18px 加粗 + 强调色；0 = 免费
import { computed } from 'vue'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  size: { type: String, default: 'normal' } // normal | large
})

const isFree = computed(() => Number(props.value) === 0)
const formatted = computed(() => Number(props.value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
</script>

<style scoped>
.price-text {
  color: var(--color-accent);
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
}
.symbol {
  font-size: 14px;
  font-weight: 600;
}
.amount {
  font-size: 18px;
  font-weight: 700;
}
.price-text.large .amount {
  font-size: 28px;
}
.price-text.large .symbol {
  font-size: 18px;
}
.price-text.free {
  color: var(--color-primary);
  font-weight: 700;
  font-size: 16px;
}
</style>
