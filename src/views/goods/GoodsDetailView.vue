<template>
  <div class="page">
    <h2 class="page-title">商品详情</h2>
    <el-card shadow="never" class="placeholder-card">
      <el-empty :description="`商品 #${route.params.id}：图集 / 信息 / 卖家卡片（信用等级）/ 相似推荐 / 聊一聊·想要·收藏（GDS-05）`" />
    </el-card>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
