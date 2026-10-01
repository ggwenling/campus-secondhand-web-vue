import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearToken, getToken } from '@/utils/auth'

// 后端统一响应结构 { code, message, data }，code=0 成功（见后端 common/api/Result）
const SUCCESS_CODE = 0
// 未登录/凭证失效错误码：清除本地登录态并跳转登录页
const AUTH_EXPIRED_CODES = [40100, 40101]

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
