const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 检查管理员权限
exports.main = async (event, context) => {
  console.log('checkAdminPermission 云函数开始执行，参数:', event);
  
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('检查的openid:', openid);
  
  try {
    // 查询用户是否在管理员列表中
    const adminCheck = await db.collection('admins').where({
      openid: openid
    }).get()
    
    console.log('查询结果:', adminCheck);
    
    const isAdmin = adminCheck.data && adminCheck.data.length > 0
    
    console.log('是否为管理员:', isAdmin);
    
    return {
      success: true,
      isAdmin: isAdmin,
      openid: openid
    }
  } catch (error) {
    console.error('查询出错:', error);
    
    // 即使出错，也返回一个有效的结果
    return {
      success: false,
      isAdmin: false,
      message: error.message || '未知错误',
      openid: openid
    }
  }
} 