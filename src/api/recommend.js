import request from './request'

// 推荐模块接口（PRD REC-01~03 / §6.6）：结果由后端定时任务离线计算写入 Redis，接口直读缓存
/** 首页猜你喜欢：登录用户个性化，游客/新用户热门兜底 */
export const recommendHome = (limit = 12) => request.get('/recommend/home', { params: { limit } })
/** 热度榜 Top N（首页右侧栏，REC-02 冷启动口径） */
export const recommendHot = (limit = 10) => request.get('/recommend/hot', { params: { limit } })
/** 商品详情相似推荐（同分类 + 共享标签，排除自身） */
  request.get(`/recommend/similar/${goodsId}`, { params: { limit } })
