import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '@/router'
import { clearToken, getToken } from '@/utils/auth'

// 后端统一响应结构 { code, message, data }，code=0 成功（见后端 common/api/Result）
const SUCCESS_CODE = 0
// 未登录/凭证失效错误码：清除本地登录态并跳转登录页
const AUTH_EXPIRED_CODES = [40100, 40101]
// 封禁（40301）/信用受限（40302）——M7 全局提示与引导（PRD §3.1）
const CODE_BANNED = 40301
const CODE_RESTRICTED = 40302

// 封禁弹窗去重：弹窗未关闭期间忽略后续 40301，避免连续请求刷屏
let bannedDialogOpen = false

function showBannedDialog(message) {
  if (bannedDialogOpen) return
  bannedDialogOpen = true
  ElMessageBox.alert(message || '账号已被封禁', '账号状态提醒', {
    confirmButtonText: '我知道了',
    type: 'warning',
    showClose: false,
    callback: () => { bannedDialogOpen = false }
  })
}

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== SUCCESS_CODE) {
      if (AUTH_EXPIRED_CODES.includes(res.code)) {
        clearToken()
        router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
      } else if (res.code === CODE_BANNED) {
        // 封禁用户可登录查看封禁原因与期限（PRD §3.1），不强制登出，仅弹窗告知
        showBannedDialog(res.message)
        return Promise.reject(new Error(res.message || 'Error'))
      } else if (res.code === CODE_RESTRICTED) {
        // 受限用户（信用分 <60）：浏览/聊天/处理已有订单不受影响，创建类操作被拒并引导恢复信用
        ElMessage.warning(`${res.message || '信用分受限'}（完成订单可获得信用分，恢复至 60 分后自动解除）`)
        return Promise.reject(new Error(res.message || 'Error'))
      }
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  (error) => {
    ElMessage.error(error.message || '网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
