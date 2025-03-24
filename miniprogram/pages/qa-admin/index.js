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
    isAdmin: false,
    openId: ''
  },

  onLoad: function() {
    this.getOpenId();
  },
  
  onShow: function() {
    // 每次显示页面时检查权限
    this.checkAdmin();
  },

  // 获取用户openId
  getOpenId: function() {
    wx.showLoading({
      title: '加载中',
    });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.openid) {
        const openId = res.result.openid;
        this.setData({
          openId: openId
        });
        this.checkAdmin();
      } else {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },

  // 检查是否为管理员
  checkAdmin: function() {
    const { openId } = this.data;
    console.log('openId',openId);
    // 检查openId是否为管理员
    const isAdmin = true
    
    this.setData({
      isAdmin: true
    });
    
    if (isAdmin) {
      this.fetchQAList();
    }
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
      isEditing: false,
      showForm: true
    });
  },

  // 编辑问答
  editQA: function(e) {
    if (!this.data.isAdmin) return;
    
    const { id } = e.currentTarget.dataset;
    const qa = this.data.qaList.find(item => item._id === id);
    if (qa) {
      this.setData({
        currentQA: { ...qa },
        isEditing: true,
        showForm: true
      });
    }
  },

  // 删除问答
  deleteQA: function(e) {
    if (!this.data.isAdmin) return;
    
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '提示',
      content: '确定要删除这个问答吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中',
          });
          
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'manageQA',
              action: 'delete',
              data: { _id: id }
            }
          }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
              wx.showToast({
                title: '删除成功',
              });
              this.fetchQAList();
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error(err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 表单输入处理
  onQuestionInput: function(e) {
    this.setData({
      'currentQA.question': e.detail.value
    });
  },

  onAnswerInput: function(e) {
    this.setData({
      'currentQA.answer': e.detail.value
    });
  },

  onKeywordInput: function(e) {
    this.setData({
      keywordInput: e.detail.value
    });
  },

  // 添加关键词
  addKeyword: function() {
    const { keywordInput, currentQA } = this.data;
    if (keywordInput.trim()) {
      const keywords = [...currentQA.keywords, keywordInput.trim()];
      this.setData({
        'currentQA.keywords': keywords,
        keywordInput: ''
      });
    }
  },

  // 删除关键词
  removeKeyword: function(e) {
    const { index } = e.currentTarget.dataset;
    const { currentQA } = this.data;
    const keywords = [...currentQA.keywords];
    keywords.splice(index, 1);
    this.setData({
      'currentQA.keywords': keywords
    });
  },

  // 提交表单
  submitForm: function() {
    if (!this.data.isAdmin) return;
    
    const { currentQA, isEditing } = this.data;
    
    if (!currentQA.question.trim() || !currentQA.answer.trim()) {
      wx.showToast({
        title: '问题和答案不能为空',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: isEditing ? '更新中' : '添加中',
    });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'manageQA',
        action: isEditing ? 'update' : 'add',
        data: currentQA
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({
          title: isEditing ? '更新成功' : '添加成功',
        });
        this.setData({
          showForm: false
        });
        this.fetchQAList();
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
  },

  // 取消表单
  cancelForm: function() {
    this.setData({
      showForm: false
    });
  }
}); 