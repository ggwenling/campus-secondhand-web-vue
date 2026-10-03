import request from './request'

// 举报模块接口（PRD RPT-01/02）。写操作由后端校验登录；图片上传复用 goods.js 的 uploadImage
export const submitReport = (data) => request.post('/reports', data)
export const pageMyReports = (params) => request.get('/reports/my', { params })
