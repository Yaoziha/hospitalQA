/*
 * @Descripttion: 
 * @version: 
 * @Author: yaozihan
 * @Date: 2025-03-24 09:50:44
 * @LastEditors: yaozihan
 * @LastEditTime: 2025-04-10 20:22:26
 */
// app.js
App({
  // 先初始化 globalData
  globalData: {
    userInfo: null,
    isAdmin: false,
    openid: ''
  },
  
  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-0ga3nbcdb54e23d1',
        traceUser: true,
      });
    }
    
    // 获取用户openid
    this.getUserOpenId().then(openid => {
      if (openid) {
        // 检查管理员权限
        return this.checkAdminPermission(openid);
      }
    }).catch(err => {
      console.error('初始化失败', err);
    });
    
    // 获取本地存储的用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    
    // 获取本地存储的管理员状态
    const isAdmin = wx.getStorageSync('isAdmin');
    if (isAdmin) {
      this.globalData.isAdmin = isAdmin;
    }
  },
  
  // 获取用户openid
  getUserOpenId: function() {
    return wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      if (res.result && res.result.openid) {
        const openid = res.result.openid;
        this.globalData.openid = openid;
        wx.setStorageSync('openid', openid);
        
        // 记录登录用户
        this.recordLoginUser(openid);
        
        return openid;
      }
      return null;
    }).catch(err => {
      console.error('获取openid失败', err);
      return null;
    });
  },
  
  // 检查是否有管理权限
  checkAdminPermission: function(openid) {
    if (!openid) {
      console.log('openid为空，无法检查管理员权限');
      return Promise.reject(new Error('openid为空'));
    }
    
    console.log('正在检查管理员权限，openid:', openid);
    
    return wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'checkAdminPermission',
        openid: openid
      }
    }).then(res => {
      console.log('云函数返回结果:', res);
      
      if (res && res.result) {
        const isAdmin = res.result.isAdmin;
        console.log('管理员权限检查结果:', isAdmin);
        
        // 先设置存储，再设置全局变量
        wx.setStorageSync('isAdmin', isAdmin);
        this.globalData.isAdmin = isAdmin;
        
        // 立即更新所有页面的 TabBar
        const pages = getCurrentPages();
        pages.forEach(page => {
          if (typeof page.getTabBar === 'function' && page.getTabBar()) {
            setTimeout(() => {
              page.getTabBar().updateTabBar();
            }, 100);
          }
        });
        
        return isAdmin;
      } else {
        // 确保非管理员状态被正确设置
        wx.setStorageSync('isAdmin', false);
        this.globalData.isAdmin = false;
        
        // 立即更新所有页面的 TabBar
        const pages = getCurrentPages();
        pages.forEach(page => {
          if (typeof page.getTabBar === 'function' && page.getTabBar()) {
            setTimeout(() => {
              page.getTabBar().updateTabBar();
            }, 100);
          }
        });
        
        return false;
      }
    }).catch(err => {
      console.error('检查管理员权限失败', err);
      
      // 确保非管理员状态被正确设置
      wx.setStorageSync('isAdmin', false);
      this.globalData.isAdmin = false;
      
      // 立即更新所有页面的 TabBar
      const pages = getCurrentPages();
      pages.forEach(page => {
        if (typeof page.getTabBar === 'function' && page.getTabBar()) {
          setTimeout(() => {
            page.getTabBar().updateTabBar();
          }, 100);
        }
      });
      
      return false;
    });
  },
  
  // 获取用户信息
  getUserProfile: function() {
    return new Promise((resolve, reject) => {
      // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
      wx.getUserProfile({
        desc: '用于完善用户资料',
        lang: 'zh_CN',
        success: (res) => {
          console.log('getUserProfile 成功:', res);
          if (res.userInfo) {
            const userInfo = res.userInfo;
            
            // 存储用户信息
            this.globalData.userInfo = userInfo;
            wx.setStorageSync('userInfo', userInfo);
            
            // 记录登录用户
            const openid = this.globalData.openid || wx.getStorageSync('openid');
            if (openid) {
              this.recordLoginUser(openid, userInfo);
            }
            
            resolve(userInfo);
          } else {
            console.error('getUserProfile 返回的 userInfo 为空');
            reject(new Error('获取用户信息失败'));
          }
        },
        fail: (err) => {
          console.error('getUserProfile 失败:', err);
          reject(err);
        },
        complete: () => {
          console.log('getUserProfile 完成');
        }
      });
    });
  },
  
  // 记录登录用户
  recordLoginUser: function(openid, userInfoParam) {
    if (!openid) {
      console.error('记录登录用户失败: openid 为空');
      return;
    }
    
    // 优先使用传入的 userInfo，其次使用全局变量，最后使用本地存储
    const userInfo = userInfoParam || this.globalData.userInfo || wx.getStorageSync('userInfo');
    
    if (!userInfo) {
      console.error('记录登录用户失败: userInfo 为空');
      return;
    }
    
    console.log('准备记录登录用户:', openid, userInfo);
    
    const db = wx.cloud.database();
    // 先查询是否已存在该用户
    db.collection('loginUsers').where({
      openid: openid
    }).get().then(res => {
      if (res.data.length === 0) {
        // 不存在则添加
        console.log('添加新用户:', openid, userInfo);
        db.collection('loginUsers').add({
          data: {
            openid: openid,
            userInfo: userInfo,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        }).then(() => {
          console.log('添加登录用户成功');
        }).catch(err => {
          console.error('添加登录用户失败', err);
        });
      } else {
        // 存在则更新
        console.log('更新用户信息:', openid, userInfo, res.data[0]._id);
        
        // 检查现有记录中的 userInfo 字段类型
        const existingUserInfo = res.data[0].userInfo;
        
        // 如果现有的 userInfo 不是对象，需要先删除该记录再重新创建
        if (typeof existingUserInfo !== 'object' || existingUserInfo === null) {
          console.log('现有 userInfo 不是对象，需要重建记录');
          
          // 删除现有记录
          db.collection('loginUsers').doc(res.data[0]._id).remove()
            .then(() => {
              console.log('删除旧记录成功，准备创建新记录');
              
              // 创建新记录
              return db.collection('loginUsers').add({
                data: {
                  openid: openid,
                  userInfo: userInfo,
                  createTime: db.serverDate(),
                  updateTime: db.serverDate()
                }
              });
            })
            .then(() => {
              console.log('重建登录用户记录成功');
            })
            .catch(err => {
              console.error('重建登录用户记录失败', err);
            });
        } else {
          // 如果现有的 userInfo 是对象，直接更新
          db.collection('loginUsers').doc(res.data[0]._id).update({
            data: {
              userInfo: userInfo,
              updateTime: db.serverDate()
            }
          }).then(() => {
            console.log('更新登录用户成功');
          }).catch(err => {
            console.error('更新登录用户失败', err);
          });
        }
      }
    }).catch(err => {
      console.error('查询登录用户失败', err);
    });
  }
});
