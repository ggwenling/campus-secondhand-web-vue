<template>
  <div class="page">
    <h2 class="page-title">交换详情</h2>
    <el-card shadow="never" class="placeholder-card">
      <el-empty :description="`交换帖 #${route.params.id}：我的物品 / 想要的物品 / 是否补差价 + 发起交换（SWP-02）`" />
    </el-card>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
