import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  clearToken, clearRefreshToken, getToken, getRefreshToken, setToken, setRefreshToken
} from '@/utils/auth'
import { login as loginApi, logout as logoutApi, register as registerApi, getMyProfile } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  // 登录态用户信息：昵称/头像/认证状态/信用等级等（PRD §4.1），登录与 fetchProfile 填充
  const userInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  // 校园认证通过才可发布/下单/聊天（PRD §4.1）
  const isVerified = computed(() => userInfo.value?.authStatus === 1)

  /** 双 token + 用户摘要落 store（PRD USR-02） */
  function applyAuth(data) {
    token.value = data.token
    setToken(data.token)
    setRefreshToken(data.refreshToken || '')
    userInfo.value = {
      userId: data.userId,
      nickname: data.nickname,
      avatar: data.avatar,
      authStatus: data.authStatus,
      banned: data.banned === true
    }
    return data
  }

  async function login(form) {
    const res = await loginApi(form)
    return applyAuth(res.data)
  }

  async function register(form) {
    const res = await registerApi(form)
    return applyAuth(res.data)
  }

  /** 拉取完整资料（个人中心/导航展示，USR-04）；401 等错误由 request.js 统一处理 */
  async function fetchProfile() {
    if (!isLoggedIn.value) return null
    const res = await getMyProfile()
    userInfo.value = { ...userInfo.value, ...res.data, banned: false }
    return userInfo.value
  }

  function reset() {
    token.value = ''
    userInfo.value = null
    clearToken()
    clearRefreshToken()
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      reset()
    }
  }

  return { token, userInfo, isLoggedIn, isVerified, login, register, fetchProfile, logout }
})
