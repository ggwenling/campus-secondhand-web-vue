import request from './request'

// 订单模块接口（PRD ORD-01~07 + CRD-03）。鉴权与错误提示由 request.js 统一处理

/** 下单（ORD-01）：对在售商品创建 SALE 订单并锁定商品 */
export const createOrder = (goodsId) => request.post('/orders', { goodsId })

/** 我的订单分页（ORD-05）：role=buyer|seller，status 可选 */
export const pageOrders = (params) => request.get('/orders', { params })

/** 订单详情（ORD-05）：含时间线/双方确认状态/互评内容 */
export const getOrder = (id) => request.get(`/orders/${id}`)

/** 卖家确认出售（ORD-02） */
export const confirmOrder = (id) => request.post(`/orders/${id}/confirm`)

/** 卖家拒绝（ORD-02），reason 可选 */
export const rejectOrder = (id, reason) => request.post(`/orders/${id}/reject`, { reason })

/** 买家取消（ORD-03），reason 可选 */
export const cancelOrder = (id, reason) => request.post(`/orders/${id}/cancel`, { reason })

/** 确认完成（ORD-04）：SALE/PURCHASE 卖家单确认；SWAP 双方各自确认 */
export const completeOrder = (id) => request.post(`/orders/${id}/complete`)

/** 交易互评（ORD-06）：{ score, content } */
export const reviewOrder = (id, data) => request.post(`/orders/${id}/review`, data)

/** 某人收到的评价分页（CRD-03，公开） */
export const pageReviews = (params) => request.get('/reviews', { params })
