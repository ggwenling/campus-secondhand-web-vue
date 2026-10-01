<template>
  <div class="page">
    <h2 class="page-title">求购详情</h2>
    <el-card shadow="never" class="placeholder-card">
      <el-empty :description="`求购帖 #${route.params.id}：帖子信息 + 卖家应约（报价+留言，REQ-03）`" />
    </el-card>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
