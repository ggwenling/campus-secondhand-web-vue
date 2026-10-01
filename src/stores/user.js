import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { clearToken, getToken, setToken } from '@/utils/auth'
import { login as loginApi, logout as logoutApi } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  // 登录后由 /users/me 拉取：含昵称、头像、认证状态、信用等级、受限/封禁状态（PRD §4.1）
  const userInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  // 校园认证通过才可发布/下单/聊天（PRD §4.1），接口实现后在此统一判断
  const isVerified = computed(() => userInfo.value?.verified === true)

  async function login(form) {
    const res = await loginApi(form)
    token.value = res.data.token
    setToken(res.data.token)
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      token.value = ''
      userInfo.value = null
      clearToken()
    }
  }

  return { token, userInfo, isLoggedIn, isVerified, login, logout }
})
