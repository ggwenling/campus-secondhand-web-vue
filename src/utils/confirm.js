import { ElMessageBox } from 'element-plus'

/**
 * 危险操作确认（验收 P3）：Element Plus 的 confirm/prompt 在用户点"取消"时会 reject，
 * 直接 await 会产生 unhandled rejection——统一经此封装，取消返回 false/null。
 */
export async function confirmAction(message, title = '提示', options = {}) {
  try {
    await ElMessageBox.confirm(message, title, { type: 'warning', ...options })
    return true
  } catch {
    return false
  }
}

/** 输入弹窗：确认返回输入值，取消返回 null（调用方以 null 判断中止） */
export async function promptAction(message, title = '提示', options = {}) {
  try {
    const { value } = await ElMessageBox.prompt(message, title, options)
    return value
  } catch {
    return null
  }
}
