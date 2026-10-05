import request from './request'

// 交换模块接口（PRD SWP-01~03）。广场/详情公开，写操作由后端校验登录 + 校园认证 + 信用受限
export const pageSwapPosts = (params) => request.get('/swap-posts', { params })
export const getSwapPost = (id) => request.get(`/swap-posts/${id}`)
export const publishSwapPost = (data) => request.post('/swap-posts', data)
export const updateSwapPost = (id, data) => request.put(`/swap-posts/${id}`, data)
export const closeSwapPost = (id, reason) => request.post(`/swap-posts/${id}/close`, { reason })
export const removeSwapPost = (id) => request.delete(`/swap-posts/${id}`)

/** 交换请求（SWP-02/03） */
export const createSwapRequest = (postId, data) => request.post(`/swap-posts/${postId}/requests`, data)
export const acceptSwapRequest = (requestId) => request.post(`/swap-posts/requests/${requestId}/accept`)
export const rejectSwapRequest = (requestId, reason) =>
  request.post(`/swap-posts/requests/${requestId}/reject`, { reason })
