const app = getApp();

Page({
  data: {
    loginUsers: [],
    admins: [],
    isAdmin: false,
    loading: false
  },

  onLoad: function() {
    // 检查是否为管理员
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('isAdmin') || false;
    this.setData({ isAdmin: isAdmin });
    
    if (isAdmin) {
      this.fetchLoginUsers();
      this.fetchAdmins();
    } else {
      wx.showToast({
        title: '您没有管理权限',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/qa/index'
        });
      }, 1500);
    }
  },
  
  onShow: function() {
    // 检查是否为管理员
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('isAdmin') || false;
    this.setData({ isAdmin: isAdmin });
    
    if (isAdmin) {
      this.fetchLoginUsers();
      this.fetchAdmins();
    }
  },
  
  // 获取登录用户列表
  fetchLoginUsers: function() {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getLoginUsers'
      }
    }).then(res => {
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        this.setData({
          loginUsers: res.result.data
        });
      } else {
        wx.showToast({
          title: '获取用户列表失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ loading: false });
      console.error('获取用户列表失败', err);
      wx.showToast({
        title: '获取用户列表失败',
        icon: 'none'
      });
    });
  },
  
  // 获取管理员列表
  fetchAdmins: function() {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getAdmins'
      }
    }).then(res => {
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        this.setData({
          admins: res.result.data
        });
      } else {
        wx.showToast({
          title: '获取管理员列表失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ loading: false });
      console.error('获取管理员列表失败', err);
      wx.showToast({
        title: '获取管理员列表失败',
        icon: 'none'
      });
    });
  },
  
  // 添加管理员
  addAdmin: function(e) {
    const openid = e.currentTarget.dataset.openid;
    const nickname = e.currentTarget.dataset.nickname;
    
    wx.showModal({
      title: '确认添加',
      content: `确定要将 ${nickname || openid} 设为管理员吗？`,
      success: res => {
        if (res.confirm) {
          this.setData({ loading: true });
          
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'addAdmin',
              data: {
                openid: openid
              }
            }
          }).then(res => {
            this.setData({ loading: false });
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: '添加成功',
                icon: 'success'
              });
              
              // 刷新列表
              this.fetchAdmins();
            } else {
              wx.showToast({
                title: res.result.message || '添加失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            this.setData({ loading: false });
            console.error('添加管理员失败', err);
            wx.showToast({
              title: '添加管理员失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },
  
  // 删除管理员
  removeAdmin: function(e) {
    const id = e.currentTarget.dataset.id;
    const nickname = e.currentTarget.dataset.nickname;
    const openid = e.currentTarget.dataset.openid;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除管理员 ${nickname || openid} 吗？`,
      success: res => {
        if (res.confirm) {
          this.setData({ loading: true });
          
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'removeAdmin',
              data: {
                id: id
              }
            }
          }).then(res => {
            this.setData({ loading: false });
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 刷新列表
              this.fetchAdmins();
            } else {
              wx.showToast({
                title: res.result.message || '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            this.setData({ loading: false });
            console.error('删除管理员失败', err);
            wx.showToast({
              title: '删除管理员失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    // 刷新管理员和用户列表
    this.fetchAdmins();
    this.fetchLoginUsers();
    
    // 完成刷新
    wx.stopPullDownRefresh();
  }
}); 