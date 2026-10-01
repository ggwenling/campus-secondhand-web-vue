import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 路由表对齐 PRD §7.1 前台 13 个页面；登录/注册/认证合并为一个路由组
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('@/views/home/HomeView.vue'), meta: { title: '首页' } },
      { path: 'goods', name: 'GoodsList', component: () => import('@/views/goods/GoodsListView.vue'), meta: { title: '商品列表' } },
      { path: 'goods/:id', name: 'GoodsDetail', component: () => import('@/views/goods/GoodsDetailView.vue'), meta: { title: '商品详情' } },
      { path: 'publish', name: 'GoodsPublish', component: () => import('@/views/goods/GoodsPublishView.vue'), meta: { title: '发布商品', requireAuth: true } },
      // 求购（REQ）：静态路由在前，:id 动态路由在后，避免 /want/publish 被当作详情
      { path: 'want', name: 'WantSquare', component: () => import('@/views/want/WantSquareView.vue'), meta: { title: '求购广场' } },
      { path: 'want/publish', name: 'WantPublish', component: () => import('@/views/want/WantPublishView.vue'), meta: { title: '发布求购', requireAuth: true } },
      { path: 'want/:id', name: 'WantDetail', component: () => import('@/views/want/WantDetailView.vue'), meta: { title: '求购详情' } },
      // 交换（SWP）
      { path: 'swap', name: 'SwapSquare', component: () => import('@/views/swap/SwapSquareView.vue'), meta: { title: '交换广场' } },
      { path: 'swap/publish', name: 'SwapPublish', component: () => import('@/views/swap/SwapPublishView.vue'), meta: { title: '发布交换', requireAuth: true } },
      { path: 'swap/:id', name: 'SwapDetail', component: () => import('@/views/swap/SwapDetailView.vue'), meta: { title: '交换详情' } },
      { path: 'message', name: 'MessageCenter', component: () => import('@/views/message/MessageCenterView.vue'), meta: { title: '消息中心', requireAuth: true } },
      { path: 'orders', name: 'OrderList', component: () => import('@/views/order/OrderListView.vue'), meta: { title: '我的订单', requireAuth: true } },
      { path: 'orders/:id', name: 'OrderDetail', component: () => import('@/views/order/OrderDetailView.vue'), meta: { title: '订单详情', requireAuth: true } },
      { path: 'profile', name: 'Profile', component: () => import('@/views/user/ProfileView.vue'), meta: { title: '个人中心', requireAuth: true } },
      // 登录 / 注册 / 校园认证路由组（PRD §7.1：三个小页合并）
      { path: 'login', name: 'Login', component: () => import('@/views/auth/LoginView.vue'), meta: { title: '登录' } },
      { path: 'register', name: 'Register', component: () => import('@/views/auth/RegisterView.vue'), meta: { title: '注册' } },
      { path: 'verify', name: 'Verify', component: () => import('@/views/auth/VerifyView.vue'), meta: { title: '校园认证', requireAuth: true } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 登录守卫：仅校验"是否登录"。校园认证状态/信用受限/封禁的细粒度拦截由后端接口返回码驱动（PRD §4.1）
router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requireAuth && !userStore.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 校园二手交易系统` : '校园二手交易系统'
})

export default router
