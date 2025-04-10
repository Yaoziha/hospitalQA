Page({
  data: {
    userInfo: {},
    isLoggedIn: false,
    isAdmin: false,
    userList: [],
    currentPage: 1,
    pageSize: 10,
    hasMoreUsers: false
  },

  onLoad: function() {
    this.checkLoginStatus();
  },

  onShow: function() {
    // 每次显示页面时检查登录状态和管理员权限
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const that = this;
    
    // 先从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const isAdmin = wx.getStorageSync('isAdmin');
    
    if (userInfo) {
      that.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isAdmin: isAdmin || false
      });
      
      // 如果是管理员，获取用户列表
      if (isAdmin) {
        that.fetchUserList();
      }
    } else {
      // 如果本地没有，尝试从服务器获取
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getOpenId'
        }
      }).then(res => {
        if (res.result && res.result.openid) {
          // 获取openid成功，查询用户信息
          const db = wx.cloud.database();
          db.collection('loginUsers').where({
            _openid: res.result.openid
          }).get().then(dbRes => {
            if (dbRes.data && dbRes.data.length > 0) {
              const user = dbRes.data[0];
              
              // 保存到本地存储
              wx.setStorageSync('userInfo', user.userInfo || {});
              wx.setStorageSync('isAdmin', user.isAdmin || false);
              
              that.setData({
                isLoggedIn: true,
                userInfo: user.userInfo || {},
                isAdmin: user.isAdmin || false
              });
              
              // 如果是管理员，获取用户列表
              if (user.isAdmin) {
                that.fetchUserList();
              }
            } else {
              that.setData({
                isLoggedIn: false,
                userInfo: {},
                isAdmin: false
              });
            }
          }).catch(err => {
            console.error('查询用户信息失败', err);
          });
        }
      }).catch(err => {
        console.error('获取openid失败', err);
      });
    }
  },

  // 用户登录
  login: function() {
    const that = this;
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        const userInfo = profileRes.userInfo;
        
        // 获取openid
        wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'getOpenId'
          }
        }).then(res => {
          if (res.result && res.result.openid) {
            const openid = res.result.openid;
            
            // 保存用户信息到数据库
            const db = wx.cloud.database();
            
            // 先查询用户是否已存在
            db.collection('loginUsers').where({
              _openid: openid
            }).get().then(dbRes => {
              if (dbRes.data && dbRes.data.length > 0) {
                // 用户已存在，更新信息
                const user = dbRes.data[0];
                db.collection('loginUsers').doc(user._id).update({
                  data: {
                    userInfo: userInfo,
                    updateTime: db.serverDate()
                  }
                }).then(() => {
                  // 保存到本地存储
                  wx.setStorageSync('userInfo', userInfo);
                  wx.setStorageSync('isAdmin', user.isAdmin || false);
                  
                  that.setData({
                    isLoggedIn: true,
                    userInfo: userInfo,
                    isAdmin: user.isAdmin || false
                  });
                  
                  wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                  });
                  
                  // 如果是管理员，获取用户列表
                  if (user.isAdmin) {
                    that.fetchUserList();
                  }
                }).catch(err => {
                  console.error('更新用户信息失败', err);
                  wx.showToast({
                    title: '登录失败',
                    icon: 'none'
                  });
                });
              } else {
                // 新用户，创建记录
                db.collection('loginUsers').add({
                  data: {
                    userInfo: userInfo,
                    isAdmin: false,
                    createTime: db.serverDate(),
                    updateTime: db.serverDate()
                  }
                }).then(() => {
                  // 保存到本地存储
                  wx.setStorageSync('userInfo', userInfo);
                  wx.setStorageSync('isAdmin', false);
                  
                  that.setData({
                    isLoggedIn: true,
                    userInfo: userInfo,
                    isAdmin: false
                  });
                  
                  wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                  });
                }).catch(err => {
                  console.error('创建用户记录失败', err);
                  wx.showToast({
                    title: '登录失败',
                    icon: 'none'
                  });
                });
              }
            }).catch(err => {
              console.error('查询用户失败', err);
              wx.showToast({
                title: '登录失败',
                icon: 'none'
              });
            });
          } else {
            wx.showToast({
              title: '获取用户ID失败',
              icon: 'none'
            });
          }
        }).catch(err => {
          console.error('获取openid失败', err);
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败', err);
      }
    });
  },

  // 获取手机号
  getPhoneNumber: function(e) {
    console.log('getPhoneNumber', e);
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '未授权获取手机号',
        icon: 'none'
      });
      return;
    }

    const that = this;
    const app = getApp();
    
    wx.showLoading({
      title: '处理中',
    });

    // 使用云函数解析手机号
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getPhoneNumber',
        cloudID: e.detail.cloudID
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.phoneInfo && res.result.phoneInfo.phoneNumber) {
        const phoneNumber = res.result.phoneInfo.phoneNumber;
        
        // 使用app.js中已存储的openid
        const openid = app.globalData.openid || wx.getStorageSync('openid');
        
        if (!openid) {
          wx.showToast({
            title: '获取用户ID失败',
            icon: 'none'
          });
          return;
        }
        
        const db = wx.cloud.database();
        
        // 查询用户
        db.collection('loginUsers').where({
          _openid: openid
        }).get().then(dbRes => {
          if (dbRes.data && dbRes.data.length > 0) {
            // 更新用户信息
            const user = dbRes.data[0];
            const userInfo = that.data.userInfo || {};
            
            db.collection('loginUsers').doc(user._id).update({
              data: {
                'userInfo.phoneNumber': phoneNumber,
                updateTime: db.serverDate()
              }
            }).then(() => {
              // 更新本地存储
              userInfo.phoneNumber = phoneNumber;
              wx.setStorageSync('userInfo', userInfo);
              
              that.setData({
                userInfo: userInfo
              });
              
              wx.showToast({
                title: '手机号绑定成功',
                icon: 'success'
              });
            }).catch(err => {
              console.error('更新手机号失败', err);
              wx.showToast({
                title: '保存手机号失败',
                icon: 'none'
              });
            });
          } else {
            // 如果用户不存在，创建新用户
            const userInfo = that.data.userInfo || {};
            userInfo.phoneNumber = phoneNumber;
            
            db.collection('loginUsers').add({
              data: {
                _openid: openid,
                userInfo: userInfo,
                isAdmin: false,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            }).then(() => {
              // 更新本地存储
              wx.setStorageSync('userInfo', userInfo);
              
              that.setData({
                isLoggedIn: true,
                userInfo: userInfo
              });
              
              wx.showToast({
                title: '手机号绑定成功',
                icon: 'success'
              });
            }).catch(err => {
              console.error('创建用户失败', err);
              wx.showToast({
                title: '绑定手机号失败',
                icon: 'none'
              });
            });
          }
        }).catch(err => {
          console.error('查询用户失败', err);
          wx.showToast({
            title: '绑定手机号失败',
            icon: 'none'
          });
        });
      } else {
        console.error('获取手机号失败', res);
        wx.showToast({
          title: '获取手机号失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('调用云函数失败', err);
      wx.showToast({
        title: '绑定手机号失败',
        icon: 'none'
      });
    });
  },

  // 获取用户列表
  fetchUserList: function() {
    const that = this;
    const db = wx.cloud.database();
    
    wx.showLoading({
      title: '加载中',
    });
    
    console.log('开始获取用户列表，页码:', that.data.currentPage, '每页数量:', that.data.pageSize);
    
    // 使用云函数获取用户列表，绕过权限限制
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getUserList',
        page: that.data.currentPage,
        pageSize: that.data.pageSize
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result) {
        console.log('获取用户列表成功，数量:', res.result.users);
        
        // 检查是否有更多用户
        const hasMore = res.result.users.length === that.data.pageSize;
        
        that.setData({
          userList: res.result.users,
          hasMoreUsers: hasMore
        });
      } else {
        console.error('获取用户列表失败，返回结果格式不正确', res);
        wx.showToast({
          title: '获取用户列表失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('调用云函数失败', err);
      wx.showToast({
        title: '获取用户列表失败',
        icon: 'none'
      });
    });
  },

  // 切换用户管理员状态
  toggleAdminStatus: function(e) {
    const userId = e.currentTarget.dataset.id;
    const isAdmin = e.currentTarget.dataset.isAdmin;
    const that = this;
    
    wx.showModal({
      title: isAdmin ? '移除管理员' : '设为管理员',
      content: isAdmin ? '确定要移除该用户的管理员权限吗？' : '确定要将该用户设为管理员吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          });
          
          // 直接更新数据库
          const db = wx.cloud.database();
          
          db.collection('loginUsers').doc(userId).update({
            data: {
              isAdmin: !isAdmin,
              updateTime: db.serverDate()
            }
          }).then(() => {
            wx.hideLoading();
            
            wx.showToast({
              title: '操作成功',
              icon: 'success'
            });
            
            // 刷新用户列表
            that.fetchUserList();
          }).catch(err => {
            wx.hideLoading();
            console.error('操作失败', err);
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 上一页
  prevPage: function() {
    if (this.data.currentPage > 1) {
      this.setData({
        currentPage: this.data.currentPage - 1
      }, () => {
        this.fetchUserList();
      });
    }
  },

  // 下一页
  nextPage: function() {
    if (this.data.hasMoreUsers) {
      this.setData({
        currentPage: this.data.currentPage + 1
      }, () => {
        this.fetchUserList();
      });
    }
  },

  // 修改昵称方法
  updateUserProfile: function() {
    const that = this;
    const app = getApp();
    
    // 获取当前昵称
    const currentNickname = that.data.userInfo.nickName || '微信用户';
    
    // 弹出输入框让用户修改昵称
    wx.showModal({
      title: '修改昵称',
      content: '',
      editable: true,  // 可编辑模式
      placeholderText: currentNickname, // 默认显示当前昵称
      success: function(res) {
        if (res.confirm) {
          // 用户点击了确定按钮
          const newNickname = res.content.trim();
          
          // 如果用户没有输入任何内容，使用原昵称
          if (!newNickname) {
            wx.showToast({
              title: '昵称不能为空',
              icon: 'none'
            });
            return;
          }
          
          // 使用app.js中已存储的openid
          const openid = app.globalData.openid || wx.getStorageSync('openid');
          
          if (!openid) {
            wx.showToast({
              title: '获取用户ID失败',
              icon: 'none'
            });
            return;
          }
          
          const db = wx.cloud.database();
          
          // 查询用户
          db.collection('loginUsers').where({
            _openid: openid
          }).get().then(dbRes => {
            if (dbRes.data && dbRes.data.length > 0) {
              const user = dbRes.data[0];
              
              // 创建新的用户信息对象
              const newUserInfo = {...that.data.userInfo};
              newUserInfo.nickName = newNickname;
              
              // 更新用户信息
              db.collection('loginUsers').doc(user._id).update({
                data: {
                  'userInfo.nickName': newNickname,
                  updateTime: db.serverDate()
                }
              }).then(() => {
                // 更新本地存储和页面数据
                wx.setStorageSync('userInfo', newUserInfo);
                
                that.setData({
                  userInfo: newUserInfo
                });
                
                wx.showToast({
                  title: '昵称已更新',
                  icon: 'success'
                });
              }).catch(err => {
                console.error('更新用户信息失败', err);
                wx.showToast({
                  title: '更新失败',
                  icon: 'none'
                });
              });
            } else {
              // 如果用户不存在，创建新用户
              const newUserInfo = {
                nickName: newNickname,
                avatarUrl: '/images/icons/default-avatar.png'
              };
              
              db.collection('loginUsers').add({
                data: {
                  _openid: openid,
                  userInfo: newUserInfo,
                  isAdmin: false,
                  createTime: db.serverDate(),
                  updateTime: db.serverDate()
                }
              }).then(() => {
                // 更新本地存储和页面数据
                wx.setStorageSync('userInfo', newUserInfo);
                wx.setStorageSync('isAdmin', false);
                
                that.setData({
                  isLoggedIn: true,
                  userInfo: newUserInfo,
                  isAdmin: false
                });
                
                wx.showToast({
                  title: '昵称已设置',
                  icon: 'success'
                });
              }).catch(err => {
                console.error('创建用户失败', err);
                wx.showToast({
                  title: '设置失败',
                  icon: 'none'
                });
              });
            }
          }).catch(err => {
            console.error('查询用户失败', err);
            wx.showToast({
              title: '更新失败',
              icon: 'none'
            });
          });
        }
      }
    });
  }
}); 