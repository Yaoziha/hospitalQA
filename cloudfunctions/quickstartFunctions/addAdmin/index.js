const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 添加管理员
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
    
    const { openid } = event.data
    
    // 检查要添加的用户是否已经是管理员
    const existCheck = await db.collection('admins').where({
      openid: openid
    }).get()
    
    if (existCheck.data.length > 0) {
      return {
        success: false,
        message: '该用户已经是管理员'
      }
    }
    
    // 获取用户信息
    const userInfo = await db.collection('loginUsers').where({
      openid: openid
    }).get()
    
    // 添加管理员
    await db.collection('admins').add({
      data: {
        openid: openid,
        userInfo: userInfo.data.length > 0 ? userInfo.data[0].userInfo : null,
        createTime: db.serverDate(),
        createBy: wxContext.OPENID
      }
    })
    
    return {
      success: true,
      message: '添加管理员成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
} 