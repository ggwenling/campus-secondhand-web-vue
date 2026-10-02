<template>
  <div class="page swap-publish">
    <h2 class="page-title">{{ isEdit ? '编辑交换' : '发布交换' }}</h2>
    <el-card shadow="never" class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" class="narrow-form">
        <el-form-item label="物品分类" prop="categoryPath">
          <el-cascader
            v-model="form.categoryPath"
            :options="categories"
            :props="{ value: 'id', label: 'name', emitPath: true }"
            placeholder="选择二级分类"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="如：九成新山地车换平板" />
        </el-form-item>
        <el-form-item label="我的物品" prop="myItemDesc">
          <el-input
            v-model="form.myItemDesc"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="描述你拿出的物品：名称、成色、使用情况、瑕疵等"
          />
        </el-form-item>
        <el-form-item label="想要的物品" prop="wantItemDesc">
          <el-input
            v-model="form.wantItemDesc"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="描述你希望换到的物品与可接受范围"
          />
        </el-form-item>
        <el-form-item label="接受补差价">
          <el-switch v-model="form.allowDiff" :active-value="1" :inactive-value="0" />
          <span class="hint">{{ form.allowDiff === 1 ? '对方可补差价给你（或你补差价给对方，具体线下协商）' : '只接受等值交换' }}</span>
        </el-form-item>
        <el-form-item v-if="form.allowDiff === 1" label="期望差价" prop="diffAmount">
          <el-input-number v-model="form.diffAmount" :min="0" :precision="2" :step="10" style="width: 200px" />
          <span class="hint">元，填 0 表示可协商</span>
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
// 发布/编辑交换（PRD SWP-01、§5.5）：单栏表单 + 差价开关联动金额（前端设计文档 §6.1）
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { publishSwapPost, updateSwapPost, getSwapPost } from '@/api/swap'
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
  myItemDesc: '',
  wantItemDesc: '',
  allowDiff: 0,
  diffAmount: null
})

const rules = {
  categoryPath: [{ required: true, message: '请选择物品分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  myItemDesc: [{ required: true, message: '请描述你的物品', trigger: 'blur' }],
  wantItemDesc: [{ required: true, message: '请描述想要的物品', trigger: 'blur' }]
}

// 关闭差价开关时清空金额，避免提交脏数据（后端也会强制置 NULL）
watch(() => form.allowDiff, (val) => {
  if (val === 0) form.diffAmount = null
})

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  listCategories().then((res) => { categories.value = res.data || [] }).catch(() => {})
  if (isEdit.value) {
    const res = await getSwapPost(route.query.id)
    const d = res.data
    form.categoryPath = d.parentCategoryId ? [d.parentCategoryId, d.categoryId] : [d.categoryId]
    form.title = d.title
    form.myItemDesc = d.myItemDesc
    form.wantItemDesc = d.wantItemDesc
    form.allowDiff = d.allowDiff ?? 0
    form.diffAmount = d.diffAmount === null || d.diffAmount === undefined ? null : Number(d.diffAmount)
  }
})

async function submit() {
  await formRef.value.validate()
  if (form.allowDiff === 1 && (form.diffAmount === null || form.diffAmount === undefined)) {
    ElMessage.warning('接受补差价时请填写期望差价金额')
    return
  }
  const payload = {
    title: form.title,
    categoryId: form.categoryPath[form.categoryPath.length - 1],
    myItemDesc: form.myItemDesc,
    wantItemDesc: form.wantItemDesc,
    allowDiff: form.allowDiff,
    diffAmount: form.allowDiff === 1 ? form.diffAmount : null
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateSwapPost(route.query.id, payload)
      ElMessage.success('修改已保存')
      router.push(`/swap/${route.query.id}`)
    } else {
      const res = await publishSwapPost(payload)
      ElMessage.success('发布成功')
      router.push(`/swap/${res.data}`)
    }
  } catch (err) {
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
  max-width: 760px;
  padding-bottom: 8px;
}
.hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
