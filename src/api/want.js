import request from './request'

// 求购模块接口（PRD REQ-01~04）。广场/详情公开，写操作由后端校验登录 + 校园认证 + 信用受限
export const pageWantPosts = (params) => request.get('/want-posts', { params })
export const getWantPost = (id) => request.get(`/want-posts/${id}`)
export const publishWantPost = (data) => request.post('/want-posts', data)
export const updateWantPost = (id, data) => request.put(`/want-posts/${id}`, data)
export const closeWantPost = (id, reason) => request.post(`/want-posts/${id}/close`, { reason })
export const removeWantPost = (id) => request.delete(`/want-posts/${id}`)
export const restoreWantPost = (id) => request.post(`/want-posts/${id}/restore`)

/** 应约（REQ-03） */
export const createOffer = (postId, data) => request.post(`/want-posts/${postId}/offers`, data)
export const pageMyOffers = (params) => request.get('/want-posts/offers/my', { params })
export const withdrawOffer = (offerId) => request.post(`/want-posts/offers/${offerId}/withdraw`)
export const acceptOffer = (offerId) => request.post(`/want-posts/offers/${offerId}/accept`)
export const rejectOffer = (offerId, reason) => request.post(`/want-posts/offers/${offerId}/reject`, { reason })
