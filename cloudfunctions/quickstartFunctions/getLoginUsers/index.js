const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 获取登录用户列表
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 先检查当前用户是否为管理员
    const adminCheck = await db.collection('admins').where({
      openid: wxContext.OPENID
    }).get()
    
    if (adminCheck.data.length === 0) {
      return {
        success: false,
        message: '没有管理员权限'
      }
    }
    
    // 获取登录用户列表
    const loginUsers = await db.collection('loginUsers').get()
    
    return {
      success: true,
      data: loginUsers.data
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
} 