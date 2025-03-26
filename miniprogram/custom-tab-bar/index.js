const app = getApp();

Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#1296db",
    list: [
      {
        pagePath: "/pages/qa/index",
        text: "宣教问答",
        iconPath: "/images/tabbar/home.png",
        selectedIconPath: "/images/tabbar/home-active.png"
      }
    ],
    isAdmin: false
  },

  lifetimes: {
    attached: function() {
      // 在组件实例进入页面节点树时执行
      this.updateTabBar();
    },
    ready: function() {
      // 在组件在视图层布局完成后执行
      this.updateTabBar();
    }
  },

  pageLifetimes: {
    show: function() {
      // 页面被展示时执行
      this.updateTabBar();
    }
  },

  methods: {
    updateTabBar: function() {
      // 强制从存储中读取管理员状态，避免使用可能过时的 app.globalData
      const isAdmin = wx.getStorageSync('isAdmin') || false;
      
      console.log('TabBar 更新，管理员状态:', isAdmin);
      
      let tabList = [
        {
          pagePath: "/pages/qa/index",
          text: "宣教问答",
          iconPath: "/images/tabbar/home.png",
          selectedIconPath: "/images/tabbar/home-active.png"
        }
      ];
      
      // 如果是管理员，添加管理选项卡
      if (isAdmin === true) {
        tabList.push({
          pagePath: "/pages/qa-admin/index",
          text: "管理",
          iconPath: "/images/tabbar/venue.png",
          selectedIconPath: "/images/tabbar/venue-active.png"
        });
      }
      
      this.setData({
        list: tabList,
        isAdmin: isAdmin
      });
    },

    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      // 如果点击的是管理选项卡，先检查是否为管理员
      if (url === "/pages/qa-admin/index") {
        const isAdmin = wx.getStorageSync('isAdmin') || false;
        
        if (!isAdmin) {
          wx.showToast({
            title: '您没有管理权限',
            icon: 'none'
          });
          return;
        }
      }
      
      wx.switchTab({ url });
      this.setData({
        selected: data.index
      });
    }
  }
}); 