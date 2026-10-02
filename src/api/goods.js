import request from './request'

// 商品模块接口（PRD GDS-01~08）。上传走同一封装便于统一鉴权与错误处理
export const pageGoods = (params) => request.get('/goods', { params })
export const getGoods = (id) => request.get(`/goods/${id}`)
export const publishGoods = (data) => request.post('/goods', data)
export const updateGoods = (id, data) => request.put(`/goods/${id}`, data)
export const deleteGoods = (id) => request.delete(`/goods/${id}`)
export const offSaleGoods = (id) => request.post(`/goods/${id}/off-sale`)
export const onSaleGoods = (id) => request.post(`/goods/${id}/on-sale`)
export const restoreGoods = (id) => request.post(`/goods/${id}/restore`)

export const listCategories = () => request.get('/categories')
export const listTags = () => request.get('/tags')

export const addFavorite = (goodsId) => request.post('/favorites', { goodsId })
export const removeFavorite = (goodsId) => request.delete(`/favorites/${goodsId}`)
export const pageMyFavorites = (params) => request.get('/favorites/my', { params })

/** 上传单张图片，返回 { url, thumbUrl }（GDS-01） */
export const uploadImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
