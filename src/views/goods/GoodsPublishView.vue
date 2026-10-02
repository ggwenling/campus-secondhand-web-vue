<template>
  <div class="page publish-page">
    <h2 class="page-title">{{ isEdit ? '编辑商品' : '发布商品' }}</h2>
    <div class="publish-grid">
      <!-- 左：表单（前端设计文档 §6.1 发布商品） -->
      <el-card shadow="never" class="form-card">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
          <el-form-item label="分类" prop="categoryPath">
            <el-cascader
              v-model="form.categoryPath"
              :options="categoryOptions"
              :props="{ value: 'id', label: 'name', emitPath: true }"
              placeholder="选择二级分类"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="品牌/型号/成色一眼可读" />
          </el-form-item>
          <el-form-item label="标签" prop="tagIds">
            <el-select v-model="form.tagIds" multiple :multiple-limit="5" placeholder="最多选 5 个（可选）" style="width: 100%">
              <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="成色" prop="conditionLevel">
            <el-radio-group v-model="form.conditionLevel">
              <el-radio-button :value="1">全新</el-radio-button>
              <el-radio-button :value="2">几乎全新</el-radio-button>
              <el-radio-button :value="3">轻微使用</el-radio-button>
              <el-radio-button :value="4">明显使用</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="价格" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" style="width: 200px" />
            <span class="price-hint">0 元 = 免费赠送</span>
          </el-form-item>
          <el-form-item label="交易地点">
            <el-input v-model="form.tradeLocation" maxlength="100" placeholder="如：东门快递点 / 图书馆门口" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="5" maxlength="500" show-word-limit
              placeholder="购买渠道、使用时长、瑕疵说明等" />
          </el-form-item>
          <template v-if="isTextbook">
            <el-form-item label="课程名">
              <el-input v-model="form.courseName" maxlength="100" placeholder="如：高等数学（教材专区检索用）" />
            </el-form-item>
            <el-form-item label="ISBN">
              <el-input v-model="form.isbn" maxlength="20" placeholder="教材 ISBN" />
            </el-form-item>
          </template>
          <el-form-item>
            <el-button type="primary" size="large" :loading="submitting" @click="submit">
              {{ isEdit ? '保存修改' : '发 布' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 右：图片上传（1~9 张，首张为封面） -->
      <el-card shadow="never" class="upload-card">
        <template #header><b>商品图片（1~9 张，首张为封面）</b></template>
        <el-upload
          drag
          multiple
          accept="image/jpeg,image/png,image/webp"
          :show-file-list="false"
          :http-request="doUpload"
        >
          <el-icon :size="40" color="#c0c4cc"><UploadFilled /></el-icon>
          <div class="upload-tip">拖拽或点击上传，单张 ≤5MB</div>
        </el-upload>
        <div v-if="images.length" class="img-list">
          <div v-for="(img, idx) in images" :key="img.url" class="img-item">
            <img :src="img.thumbUrl || img.url" alt="" />
            <el-tag v-if="idx === 0" class="cover-tag" size="small" type="success">封面</el-tag>
            <el-button class="img-del" size="small" circle type="danger" @click="images.splice(idx, 1)">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
        <EmptyBlock v-else description="还没有上传图片" :image-size="80" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
// 发布/编辑商品（PRD GDS-01/02、§5.2）：表单 + 多图上传 + 教材动态字段 + 敏感词提示
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listCategories, listTags, uploadImage, publishGoods, updateGoods, getGoods } from '@/api/goods'
import { useUserStore } from '@/stores/user'
import EmptyBlock from '@/components/EmptyBlock.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isEdit = computed(() => !!route.query.id)
const formRef = ref()
const submitting = ref(false)
const categories = ref([])
const tags = ref([])
const images = ref([])

// 编辑回填的原始状态（判断教材字段用）
const editParentCategoryId = ref(null)

const form = reactive({
  categoryPath: [],
  title: '',
  tagIds: [],
  conditionLevel: 2,
  price: null,
  tradeLocation: '',
  description: '',
  courseName: '',
  isbn: ''
})

const rules = {
  categoryPath: [{ required: true, message: '请选择分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  conditionLevel: [{ required: true, message: '请选择成色', trigger: 'change' }],
  price: [{ required: true, message: '请填写价格', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const categoryOptions = computed(() => categories.value || [])

// 所选分类是否属于"教材书籍"（一级分类 id=1，PRD §12.1）
const isTextbook = computed(() => {
  if (form.categoryPath?.length === 2) {
    return form.categoryPath[0] === 1
  }
  return editParentCategoryId.value === 1
})

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  listCategories().then((res) => { categories.value = res.data || [] })
  listTags().then((res) => { tags.value = res.data || [] })
  if (isEdit.value) {
    const res = await getGoods(route.query.id)
    const d = res.data
    form.categoryPath = d.parentCategoryId ? [d.parentCategoryId, d.categoryId] : [d.categoryId]
    editParentCategoryId.value = d.parentCategoryId
    form.title = d.title
    form.tagIds = (d.tags || []).map((t) => t.id)
    form.conditionLevel = d.conditionLevel
    form.price = Number(d.price)
    form.tradeLocation = d.tradeLocation || ''
    form.description = d.description
    form.courseName = d.courseName || ''
    form.isbn = d.isbn || ''
    images.value = (d.images || []).map((i) => ({ url: i.url, thumbUrl: i.thumbUrl || i.url }))
  }
})

async function doUpload({ file }) {
  try {
    const res = await uploadImage(file)
    if (images.value.length >= 9) {
      ElMessage.warning('最多 9 张图片')
      return
    }
    images.value.push(res.data)
  } catch {
    /* 错误提示由 request.js 统一处理 */
  }
}

async function submit() {
  await formRef.value.validate()
  if (images.value.length < 1) {
    ElMessage.warning('请至少上传 1 张商品图片')
    return
  }
  const payload = {
    title: form.title,
    description: form.description,
    categoryId: form.categoryPath[form.categoryPath.length - 1],
    conditionLevel: form.conditionLevel,
    price: form.price ?? 0,
    tradeLocation: form.tradeLocation || undefined,
    tagIds: form.tagIds,
    images: images.value
  }
  if (isTextbook.value) {
    payload.courseName = form.courseName || undefined
    payload.isbn = form.isbn || undefined
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateGoods(route.query.id, payload)
      ElMessage.success('修改已保存')
      router.push(`/goods/${route.query.id}`)
    } else {
      const res = await publishGoods(payload)
      ElMessage.success('发布成功')
      router.push(`/goods/${res.data}`)
    }
  } catch (err) {
    // 未认证/信用受限引导（PRD §4.1）：后端返回 AUTH_NOT_CERTIFIED / ACCOUNT_RESTRICTED
    const msg = err?.message || ''
    if (msg.includes('认证')) router.push('/verify')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.publish-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  padding-bottom: 24px;
}
.form-card,
.upload-card {
  border-radius: var(--radius-card);
}
.price-hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
.upload-tip {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}
.img-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}
.img-item {
  position: relative;
}
.img-item img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-image);
  display: block;
}
.cover-tag {
  position: absolute;
  top: 6px;
  left: 6px;
}
.img-del {
  position: absolute;
  top: 6px;
  right: 6px;
}
</style>
