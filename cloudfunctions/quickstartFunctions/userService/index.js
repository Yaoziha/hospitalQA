// 用户服务相关云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 检查登录状态
async function checkLoginStatus(event, context) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 查询用户信息
  const userResult = await db.collection('loginUsers').where({
    _openid: openid
  }).get();
  
  if (userResult.data && userResult.data.length > 0) {
    const user = userResult.data[0];
    return {
      isLoggedIn: true,
      userInfo: user.userInfo || {},
      isAdmin: user.isAdmin || false
    };
  } else {
    return {
      isLoggedIn: false
    };
  }
}

// 用户登录
async function login(event, context) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const userInfo = event.userInfo || {};
  
  // 查询用户是否已存在
  const userResult = await db.collection('loginUsers').where({
    _openid: openid
  }).get();
  
  if (userResult.data && userResult.data.length > 0) {
    // 用户已存在，更新信息
    const user = userResult.data[0];
    await db.collection('loginUsers').doc(user._id).update({
      data: {
        userInfo: userInfo,
        updateTime: new Date()
      }
    });
    
    return {
      success: true,
      isAdmin: user.isAdmin || false
    };
  } else {
    // 新用户，创建记录
    await db.collection('loginUsers').add({
      data: {
        _openid: openid,
        userInfo: userInfo,
        isAdmin: false,
        createTime: new Date(),
        updateTime: new Date()
      }
    });
    
    return {
      success: true,
      isAdmin: false
    };
  }
}

// 获取手机号
async function getPhoneNumber(event, context) {
  const wxContext = cloud.getWXContext();
  
  try {
    // 解析手机号
    const phoneInfo = await cloud.getOpenData({
      list: [event.cloudID]
    });
    
    return {
      success: true,
      phoneNumber: phoneInfo.list[0].data.phoneNumber
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err
    };
  }
}

// 更新用户信息
async function updateUserInfo(event, context) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const userInfo = event.userInfo || {};
  
  try {
    // 查询用户
    const userResult = await db.collection('loginUsers').where({
      _openid: openid
    }).get();
    
    if (userResult.data && userResult.data.length > 0) {
      // 更新用户信息
      const user = userResult.data[0];
      await db.collection('loginUsers').doc(user._id).update({
        data: {
          userInfo: userInfo,
          updateTime: new Date()
        }
      });
      
      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: '用户不存在'
      };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err
    };
  }
}

// 获取用户列表
async function getUserList(event, context) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 检查是否为管理员
  const adminResult = await db.collection('loginUsers').where({
    _openid: openid,
    isAdmin: true
  }).get();
  
  if (!adminResult.data || adminResult.data.length === 0) {
    return {
      success: false,
      error: '无权限'
    };
  }
  
  // 分页获取用户列表
  const page = event.page || 1;
  const pageSize = event.pageSize || 10;
  const skip = (page - 1) * pageSize;
  
  try {
    const usersResult = await db.collection('loginUsers')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    return {
      success: true,
      users: usersResult.data.filter(user => user.userInfo.nickName !== '微信用户') || []
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err
    };
  }
}

// 更新管理员状态
async function updateAdminStatus(event, context) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 检查操作者是否为管理员
  const adminResult = await db.collection('loginUsers').where({
    _openid: openid,
    isAdmin: true
  }).get();
  
  if (!adminResult.data || adminResult.data.length === 0) {
    return {
      success: false,
      error: '无权限'
    };
  }
  
  // 更新目标用户的管理员状态
  try {
    await db.collection('loginUsers').doc(event.userId).update({
      data: {
        isAdmin: event.isAdmin,
        updateTime: new Date()
      }
    });
    
    return {
      success: true
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err
    };
  }
}

// 导出所有函数
module.exports = {
  checkLoginStatus,
  login,
  getPhoneNumber,
  updateUserInfo,
  getUserList,
  updateAdminStatus
}; 