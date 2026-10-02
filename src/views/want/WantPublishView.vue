<template>
  <div class="page want-publish">
    <h2 class="page-title">{{ isEdit ? '编辑求购' : '发布求购' }}</h2>
    <el-card shadow="never" class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="narrow-form">
        <el-form-item label="期望分类" prop="categoryPath">
          <el-cascader
            v-model="form.categoryPath"
            :options="categories"
            :props="{ value: 'id', label: 'name', emitPath: true }"
            placeholder="选择二级分类"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="如：求购二手《数据结构》教材" />
        </el-form-item>
        <el-form-item label="心理价">
          <el-input-number v-model="form.budget" :min="0" :precision="2" :step="1" style="width: 200px" />
          <span class="hint">留空表示价格面议</span>
        </el-form-item>
        <el-form-item label="求购描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
            placeholder="说明所需物品的版本、成色要求、期望面交时间地点等"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="submitting" @click="submit">
            {{ isEdit ? '保存修改' : '发 布' }}
          </el-button>
          <el-button size="large" @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
// 发布/编辑求购（PRD REQ-01/02、§5.4）：单栏表单；敏感词命中时后端在 message 中返回命中词
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { publishWantPost, updateWantPost, getWantPost } from '@/api/want'
import { listCategories } from '@/api/goods'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isEdit = computed(() => !!route.query.id)
const formRef = ref()
const submitting = ref(false)
const categories = ref([])

const form = reactive({
  categoryPath: [],
  title: '',
  budget: null,
  description: ''
})

const rules = {
  categoryPath: [{ required: true, message: '请选择期望分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入求购描述', trigger: 'blur' }]
}

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  listCategories().then((res) => { categories.value = res.data || [] }).catch(() => {})
  if (isEdit.value) {
    const res = await getWantPost(route.query.id)
    const d = res.data
    form.categoryPath = d.parentCategoryId ? [d.parentCategoryId, d.categoryId] : [d.categoryId]
    form.title = d.title
    form.budget = d.budget === null || d.budget === undefined ? null : Number(d.budget)
    form.description = d.description
  }
})

async function submit() {
  await formRef.value.validate()
  const payload = {
    title: form.title,
    description: form.description,
    categoryId: form.categoryPath[form.categoryPath.length - 1],
    budget: form.budget === null || form.budget === undefined ? null : form.budget
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateWantPost(route.query.id, payload)
      ElMessage.success('修改已保存')
      router.push(`/want/${route.query.id}`)
    } else {
      const res = await publishWantPost(payload)
      ElMessage.success('发布成功')
      router.push(`/want/${res.data}`)
    }
  } catch (err) {
    // 未认证 → 引导认证（PRD §4.1）
    if ((err?.message || '').includes('认证')) router.push('/verify')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-card {
  border-radius: var(--radius-card);
}
.narrow-form {
  max-width: 720px;
  padding-bottom: 8px;
}
.hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
