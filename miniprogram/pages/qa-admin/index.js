const app = getApp();

Page({
  data: {
    qaList: [],
    currentQA: {
      _id: '',
      question: '',
      answer: '',
      keywords: []
    },
    keywordInput: '',
    isEditing: false,
    showForm: false,
    isAdmin: false
  },

  onLoad: function() {
    // 检查是否为管理员 - 添加安全检查
    const isAdmin = (app && app.globalData && app.globalData.isAdmin) || wx.getStorageSync('isAdmin') || false;
    this.setData({
      isAdmin: isAdmin
    });
    
    if (isAdmin) {
      this.fetchQAList();
    }
  },
  
  onShow: function() {
    // 每次显示页面时检查权限 - 添加安全检查
    const isAdmin = (app && app.globalData && app.globalData.isAdmin) || wx.getStorageSync('isAdmin') || false;
    this.setData({
      isAdmin: isAdmin
    });
    
    if (isAdmin) {
      this.fetchQAList();
    }
    
    // 设置当前选中的 tabBar 项
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
      // 更新 tabBar
      this.getTabBar().updateTabBar();
    }
  },

  // 获取手机号验证管理员身份
  getPhoneNumber: function (e) {
    console.log('getPhoneNumber',e);
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '未授权获取手机号',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '验证中',
    });

    // 调用云函数验证手机号
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'verifyAdmin',
        data: {
          cloudID: e.detail.cloudID
        }
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        // 设置为管理员
        app.globalData.isAdmin = true;
        wx.setStorageSync('isAdmin', true);
        
        this.setData({
          isAdmin: true
        });
        
        // 获取问答列表
        this.fetchQAList();
        
        wx.showToast({
          title: '验证成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '非管理员手机号',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: '验证失败',
        icon: 'none'
      });
    });
  },

  // 获取问答列表
  fetchQAList: function() {
    if (!this.data.isAdmin) return;
    
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

  // 显示添加表单
  showAddForm: function() {
    if (!this.data.isAdmin) return;
    
    this.setData({
      currentQA: {
        _id: '',
        question: '',
        answer: '',
        keywords: []
      },
      keywordInput: '',
      isEditing: false,
      showForm: true
    });
  },

  // 编辑问答
  editQA: function(e) {
    if (!this.data.isAdmin) return;
    
    const id = e.currentTarget.dataset.id;
    const qa = this.data.qaList.find(item => item._id === id);
    if (qa) {
      this.setData({
        currentQA: {
          _id: qa._id,
          question: qa.question,
          answer: qa.answer,
          keywords: qa.keywords || []
        },
        keywordInput: '',
        isEditing: true,
        showForm: true
      });
    }
  },

  // 删除问答
  deleteQA: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个问答吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中',
          });
          
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'deleteQA',
              data: {
                id: id
              }
            }
          }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
              // 更新列表
              this.fetchQAList();
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } else {
              console.error('删除失败:', res);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('删除失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 问题输入
  onQuestionInput: function(e) {
    this.setData({
      'currentQA.question': e.detail.value
    });
  },

  // 答案输入
  onAnswerInput: function(e) {
    this.setData({
      'currentQA.answer': e.detail.value
    });
  },

  // 关键词输入
  onKeywordInput: function(e) {
    this.setData({
      keywordInput: e.detail.value
    });
  },

  // 添加关键词
  addKeyword: function() {
    const keyword = this.data.keywordInput.trim();
    if (!keyword) {
      wx.showToast({
        title: '请输入关键词',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否已存在
    if (this.data.currentQA.keywords.includes(keyword)) {
      wx.showToast({
        title: '关键词已存在',
        icon: 'none'
      });
      return;
    }
    
    // 添加关键词
    const keywords = [...this.data.currentQA.keywords, keyword];
    this.setData({
      'currentQA.keywords': keywords,
      keywordInput: ''
    });
  },

  // 删除关键词
  removeKeyword: function(e) {
    const index = e.currentTarget.dataset.index;
    const keywords = [...this.data.currentQA.keywords];
    keywords.splice(index, 1);
    this.setData({
      'currentQA.keywords': keywords
    });
  },

  // 取消表单
  cancelForm: function() {
    this.setData({
      showForm: false
    });
  },

  // 提交表单
  submitForm: function() {
    const { currentQA, isEditing } = this.data;
    
    // 验证表单
    if (!currentQA.question.trim()) {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }
    
    if (!currentQA.answer.trim()) {
      wx.showToast({
        title: '请输入答案',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: isEditing ? '更新中' : '添加中',
    });
    
    // 调用云函数
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: isEditing ? 'updateQA' : 'addQA',
        data: {
          id: isEditing ? currentQA._id : '',
          question: currentQA.question,
          answer: currentQA.answer,
          keywords: currentQA.keywords
        }
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        // 更新列表
        this.fetchQAList();
        
        // 关闭表单
        this.setData({
          showForm: false
        });
        
        wx.showToast({
          title: isEditing ? '更新成功' : '添加成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: isEditing ? '更新失败' : '添加失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: isEditing ? '更新失败' : '添加失败',
        icon: 'none'
      });
    });
  }
}); 