/*
 * @Descripttion: 
 * @version: 
 * @Author: yaozihan
 * @Date: 2025-03-24 09:50:44
 * @LastEditors: yaozihan
 * @LastEditTime: 2025-03-24 10:40:14
 */
Page({
  data: {
    // 空数据，不需要原模板的数据
  },

  onLoad: function() {
    // 使用switchTab跳转到tabBar页面
    wx.switchTab({
      url: '/pages/qa/index',
    });
  },

});
