<template>
  <div class="page">
    <!-- 轮播图：数据来自后台运营配置（PRD ADM-07） -->
    <div class="banner">轮播图占位（ADM-07 运营配置）</div>

    <!-- 分类导航：默认分类见 PRD §12.1 -->
    <h2 class="page-title">分类导航</h2>
    <div class="category-bar">
      <el-tag v-for="name in categories" :key="name" class="category-tag" effect="plain">{{ name }}</el-tag>
    </div>

    <h2 class="page-title">猜你喜欢</h2>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="个性化推荐位（REC-01：行为加权 + 冷启动热门），共 10 个商品位" />
    </el-card>

    <h2 class="page-title">最新发布</h2>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="最新商品流（GDS-03：20 条/页分页）" />
    </el-card>
  </div>
</template>

<script setup>
// PRD §12.1 默认分类，接口实现后改为从后端拉取树形分类（ADM-06）
const categories = [
  '教材书籍', '数码电子', '电脑配件', '生活用品', '服饰鞋包',
  '运动健身', '美妆护肤', '乐器', '代步工具', '其他'
]
</script>

<style scoped>
.banner {
  height: 200px;
  border-radius: 8px;
  background: linear-gradient(120deg, #a1c4fd, #c2e9fb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  margin-bottom: 24px;
}
.category-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.category-tag {
  cursor: pointer;
  font-size: 14px;
  padding: 8px 12px;
}
.placeholder-card {
  margin-bottom: 24px;
}
</style>
