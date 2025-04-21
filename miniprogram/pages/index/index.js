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

  fetchQAList: function() {
    wx.showLoading({
      title: '加载中',
    });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getQAList'
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.data) {
        // 处理富文本内容，确保正确显示
        const qaList = res.result.data.map(item => {
          // 如果答案是HTML格式，确保它能被rich-text正确解析
          if (item.answer && typeof item.answer === 'string') {
            // 处理可能的HTML实体编码问题
            item.answer = item.answer.replace(/&amp;/g, '&')
                                     .replace(/&lt;/g, '<')
                                     .replace(/&gt;/g, '>')
                                     .replace(/&quot;/g, '"')
                                     .replace(/&#39;/g, "'");
          }
          return item;
        });
        
        this.setData({
          qaList: qaList
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

});
