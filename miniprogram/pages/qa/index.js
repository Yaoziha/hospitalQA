const app = getApp();
Page({
  data: {
    qaList: [],
    inputQuestion: '',
    currentAnswer: '',
    showAnswer: false,
    isAdmin: false,
    username: ''
  },

  onLoad: function() {
    this.fetchQAList();
  },

  onShow: function() {
    // 检查是否为管理员
    const username = wx.getStorageSync('username') || '';
    this.setData({
      isAdmin: username === 'ads',
      username: username,
      // 每次显示页面时清空输入框
      inputQuestion: ''
    });
    
    // 每次显示页面时重新获取问答列表
    this.fetchQAList();
  },

  // 获取问答列表
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
      if (res.result && res.result.success) {
        this.setData({
          qaList: res.result.data
        });
      } else {
        wx.showToast({
          title: '获取问题失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: '获取问题失败',
        icon: 'none'
      });
    });
  },

  // 输入问题
  onInputChange: function(e) {
    this.setData({
      inputQuestion: e.detail.value
    });
  },

  // 清空输入框
  clearInput: function() {
    this.setData({
      inputQuestion: ''
    });
  },

  // 提交问题
  submitQuestion: function() {
    const { inputQuestion } = this.data;
    if (!inputQuestion.trim()) {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }

    this.searchQuestion(inputQuestion);
  },

  // 选择预设问题
  selectQuestion: function(e) {
    const { question } = e.currentTarget.dataset;
    this.setData({
      inputQuestion: question
    });
    this.searchQuestion(question);
  },

  // 搜索问题
  searchQuestion: function(keyword) {
    wx.showLoading({
      title: '查询中',
    });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'searchQA',
        keyword: keyword
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        if (res.result.found) {
          this.setData({
            currentAnswer: res.result.data.answer,
            showAnswer: true
          });
        } else {
          this.setData({
            currentAnswer: '建议挂号看医生',
            showAnswer: true
          });
        }
      } else {
        wx.showToast({
          title: '查询失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: '查询失败',
        icon: 'none'
      });
    });
  },

  // 关闭答案
  closeAnswer: function() {
    this.setData({
      showAnswer: false,
      currentAnswer: ''
    });
  },

  // 进入管理页面
  goToAdmin: function() {
    if (this.data.isAdmin) {
      wx.switchTab({
        url: '/pages/qa-admin/index',
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '请输入管理员用户名',
        editable: true,
        success: (res) => {
          if (res.confirm) {
            const username = res.content;
            if (username === 'ads') {
              wx.setStorageSync('username', username);
              wx.switchTab({
                url: '/pages/qa-admin/index',
              });
            } else {
              wx.showToast({
                title: '用户名错误',
                icon: 'none'
              });
            }
          }
        }
      });
    }
  }
}); 