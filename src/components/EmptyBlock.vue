<template>
  <div class="empty-block">
    <el-empty :description="description" :image-size="imageSize">
      <el-button v-if="actionText" type="primary" @click="$emit('action')">{{ actionText }}</el-button>
    </el-empty>
  </div>
</template>

<script setup>
// 全站空态包装（前端设计文档 §7）：空态必配引导动作
defineProps({
  description: { type: String, default: '暂无数据' },
  actionText: { type: String, default: '' },
  imageSize: { type: Number, default: 120 }
})
defineEmits(['action'])
</script>

<style scoped>
.empty-block {
  padding: 16px 0;
}
</style>
