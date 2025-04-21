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
  // const openid = wxContext.OPENID;
  
  // // 检查是否为管理员
  // const adminResult = await db.collection('admins').where({
  //   openid: openid
  // }).get();
  // console.log('adminResultadminResultadminResultadminResultadminResult:', adminResult,openid);
  // if (!adminResult.data || adminResult.data.length === 0) {
  //   return {
  //     success: false,
  //     error: '无权限'
  //   };
  // }
  
  // 分页获取用户列表
  const page = event.page || 1;
  const pageSize = event.pageSize || 10;
  const skip = (page - 1) * pageSize;
  
  try {
    const usersResult = await db.collection('loginUsers')
      .orderBy('createTime', 'desc')
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

// 获取管理员列表
async function getAdmins(event, context) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 检查是否为管理员
  const adminResult = await db.collection('admins').where({
    openid: openid
  }).get();
  
  if (!adminResult.data || adminResult.data.length === 0) {
    return {
      success: false,
      error: '无权限'
    };
  }
  
  try {
    const adminsResult = await db.collection('admins').get();
    
    return {
      success: true,
      admins: adminsResult.data || []
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err
    };
  }
}

// 添加管理员
async function addAdmin(event, context) {
  const wxContext = cloud.getWXContext();
  const currentUserOpenid = wxContext.OPENID;
  
  // 检查当前用户是否为管理员
  const adminResult = await db.collection('admins').where({
    openid: currentUserOpenid
  }).get();
  
  if (!adminResult.data || adminResult.data.length === 0) {
    return {
      success: false,
      message: '无权限'
    };
  }
  
  const { openid, nickname } = event.data;
  
  // 检查用户是否已经是管理员
  const existingAdmin = await db.collection('admins').where({
    openid: openid
  }).get();
  
  if (existingAdmin.data && existingAdmin.data.length > 0) {
    return {
      success: false,
      message: '该用户已经是管理员'
    };
  }
  
  // 添加到管理员集合
  try {
    await db.collection('admins').add({
      data: {
        openid: openid,
        nickname: nickname,
        createTime: db.serverDate(),
        createdBy: currentUserOpenid
      }
    });
    
    return {
      success: true
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: '添加管理员失败',
      error: err
    };
  }
}

// 移除管理员
async function removeAdmin(event, context) {
  const wxContext = cloud.getWXContext();
  const currentUserOpenid = wxContext.OPENID;
  
  // 检查当前用户是否为管理员
  const adminResult = await db.collection('admins').where({
    openid: currentUserOpenid
  }).get();
  
  if (!adminResult.data || adminResult.data.length === 0) {
    return {
      success: false,
      message: '无权限'
    };
  }
  
  const { openid } = event.data;
  
  // 查找要删除的管理员记录
  const targetAdmin = await db.collection('admins').where({
    openid: openid
  }).get();
  
  if (!targetAdmin.data || targetAdmin.data.length === 0) {
    return {
      success: false,
      message: '该用户不是管理员'
    };
  }
  
  // 移除管理员
  try {
    await db.collection('admins').doc(targetAdmin.data[0]._id).remove();
    
    return {
      success: true
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: '移除管理员失败',
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
  getAdmins,
  addAdmin,
  removeAdmin
}; 