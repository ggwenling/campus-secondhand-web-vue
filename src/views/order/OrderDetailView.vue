<template>
  <div class="page">
    <h2 class="page-title">订单详情</h2>
    <el-card shadow="never" class="placeholder-card">
      <el-empty :description="`订单 #${route.params.id}：状态时间线（待确认→待面交→已完成/已取消）+ 面交提示 + 互评入口（ORD-04~06 / §5.3）`" />
    </el-card>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
