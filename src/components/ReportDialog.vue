<template>
  <el-dialog
    :model-value="visible"
    title="举报"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
    @closed="reset"
  >
    <!-- 顶部：当前举报对象（标题 + 目标类型中文） -->
    <div class="report-target">
      <span class="target-label">举报对象</span>
      <span class="target-value">{{ targetTitle || '—' }}</span>
      <el-tag size="small" type="info" effect="plain">{{ targetTypeText }}</el-tag>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="72px">
      <el-form-item label="举报类型" prop="reportType">
        <el-select v-model="form.reportType" placeholder="请选择举报类型" style="width: 100%">
          <el-option v-for="opt in REPORT_TYPES" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="补充说明">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="请描述违规情况，便于管理员核实（选填）"
        />
      </el-form-item>
      <el-form-item label="证据截图">
        <el-upload
          v-model:file-list="fileList"
          list-type="picture-card"
          :limit="3"
          accept="image/jpeg,image/png,image/webp"
          :http-request="handleUpload"
          :before-upload="beforeUpload"
          :on-exceed="onExceed"
          :on-success="onUploadSuccess"
          :on-error="onUploadError"
          :on-preview="onPreview"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
        <div class="upload-tip">最多 3 张，支持 jpg / png / webp，单张 ≤5MB</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交举报</el-button>
    </template>

    <el-dialog v-model="previewVisible" title="证据预览" width="560px" append-to-body>
      <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="" />
    </el-dialog>
  </el-dialog>
</template>

<script setup>
// 举报弹窗（PRD RPT-01 / 前端设计文档 §6.1、§7）：类型选择 + 补充说明 + 证据截图，登录后提交
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { uploadImage } from '@/api/goods'
import { submitReport } from '@/api/report'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  // 支持 v-model:visible 或 visible + update:visible 两种用法
  visible: { type: Boolean, default: false },
  targetType: { type: String, default: 'GOODS' },
  targetId: { type: [Number, String], default: null },
  targetTitle: { type: String, default: '' }
})
const emit = defineEmits(['update:visible', 'submitted'])

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const REPORT_TYPES = [
  { value: 'VIOLATION', label: '违规内容' },
  { value: 'FRAUD', label: '诈骗欺诈' },
  { value: 'COUNTERFEIT', label: '假冒伪劣' },
  { value: 'OTHER', label: '其他' }
]
const TARGET_TYPE_TEXT = { GOODS: '商品', WANT: '求购', SWAP: '交换', USER: '用户' }
const targetTypeText = computed(() => TARGET_TYPE_TEXT[props.targetType] || '内容')

const formRef = ref()
const form = reactive({ reportType: '', description: '' })
const rules = { reportType: [{ required: true, message: '请选择举报类型', trigger: 'change' }] }
const fileList = ref([])
const submitting = ref(false)
const previewVisible = ref(false)
const previewUrl = ref('')

/** 自定义上传：复用 uploadImage（走统一鉴权与错误处理），onSuccess 回填 {url, thumbUrl} */
async function handleUpload(options) {
  try {
    const res = await uploadImage(options.file)
    options.onSuccess(res.data)
  } catch (err) {
    options.onError(err)
  }
}

function beforeUpload(file) {
  const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  if (!okType) {
    ElMessage.warning('仅支持 jpg / png / webp 格式图片')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('单张图片不能超过 5MB')
    return false
  }
  return true
}

function onExceed() {
  ElMessage.warning('最多上传 3 张证据截图')
}

function onUploadSuccess(response, file) {
  if (response?.url) {
    // picture-card 预览读取 file.url，这里回填真实地址
    file.url = response.url
  } else {
    ElMessage.error('图片上传失败')
  }
}

function onUploadError(err, file) {
  // 失败提示已由 request.js 统一给出，这里仅移除失败项
  fileList.value = fileList.value.filter((f) => f.uid !== file.uid)
  void err
}

function onPreview(file) {
  previewUrl.value = file.url
  previewVisible.value = true
}

function close() {
  emit('update:visible', false)
}

function reset() {
  form.reportType = ''
  form.description = ''
  fileList.value = []
  submitting.value = false
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (fileList.value.some((f) => f.status === 'uploading' || f.status === 'ready')) {
    ElMessage.warning('证据图片上传中，请稍候')
    return
  }
  const images = fileList.value
    .map((f) => f.response?.url || f.url)
    .filter(Boolean)
    .slice(0, 3)

  submitting.value = true
  try {
    await submitReport({
      targetType: props.targetType,
      targetId: props.targetId,
      reportType: form.reportType,
      description: form.description || undefined,
      images: images.length ? images : undefined
    })
    ElMessage.success('举报已提交，可在个人中心查看处理进度')
    close()
    emit('submitted')
  } catch {
    /* 失败信息由 request.js 统一提示 */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.report-target {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--color-page-bg);
  border-radius: var(--radius-control);
  font-size: 13px;
}
.target-label {
  color: #909399;
  flex-shrink: 0;
}
.target-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}
.upload-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}
.preview-img {
  width: 100%;
  border-radius: var(--radius-image);
  display: block;
}
</style>
