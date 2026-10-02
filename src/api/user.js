import request from './request'

// 用户与认证模块接口（PRD USR-01 ~ USR-06、§5.1）
export const login = (data) => request.post('/auth/login', data)
export const register = (data) => request.post('/auth/register', data)
export const logout = () => request.post('/auth/logout')
export const refreshToken = (data) => request.post('/auth/refresh', data)

export const getMyProfile = () => request.get('/users/me')
export const getMyOverview = () => request.get('/users/me/overview')
export const getUserProfile = (userId) => request.get(`/users/${userId}`)
export const updateProfile = (data) => request.put('/users/me', data)

// 校园认证（PRD USR-03 / §5.1）
export const sendVerifyCode = (data) => request.post('/auth/verify-code/send', data)
export const submitVerifyCode = (data) => request.post('/auth/verify-code/check', data)
