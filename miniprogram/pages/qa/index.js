const app = getApp();
Page({
  data: {
    qaList: [],
    inputQuestion: '',
    currentAnswer: '',
    showAnswer: false,
    isAdmin: false,
    username: '',
    userInfo: null,
    showAuthModal: false // 控制授权弹窗显示
  },

  onLoad: function() {
    this.fetchQAList();
    
    // 获取 openid
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    
    if (openid) {
      // 检查管理员权限
      app.checkAdminPermission(openid).then(isAdmin => {
        console.log('页面获取到的管理员权限:', isAdmin);
        this.setData({ isAdmin: isAdmin });
      });
    }
    
    // 检查是否已有用户信息 - 添加安全检查
    const userInfo = (app && app.globalData && app.globalData.userInfo) || wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
    } else {
      // 首次进入，显示授权弹窗
      this.setData({
        showAuthModal: true
      });
    }

    // 监听管理员状态变化 - 修复错误
    try {
      if (typeof this.getOpenerEventChannel === 'function') {
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel && typeof eventChannel.on === 'function') {
          eventChannel.on('adminStatusChanged', data => {
            console.log('管理员状态变化:', data.isAdmin);
            this.setData({ isAdmin: data.isAdmin });
          });
        }
      }
    } catch (error) {
      console.error('设置事件监听失败:', error);
    }
  },

  onShow: function() {
    // 强制从存储中读取管理员状态
    const isAdmin = wx.getStorageSync('isAdmin') || false;
    
    this.setData({
      isAdmin: isAdmin,
      // 每次显示页面时清空输入框
      inputQuestion: ''
    });
    
    // 每次显示页面时重新获取问答列表
    this.fetchQAList();
    
    // 如果没有用户信息，显示授权弹窗
    if (!this.data.userInfo && !wx.getStorageSync('userInfo')) {
      this.setData({
        showAuthModal: true
      });
    }

    // 设置当前选中的 tabBar 项
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
      
      // 强制多次更新 TabBar，确保状态正确
      this.getTabBar().updateTabBar();
      
      // 延迟更新，确保在所有异步操作完成后更新
      setTimeout(() => {
        this.getTabBar().updateTabBar();
      }, 200);
      
      setTimeout(() => {
        this.getTabBar().updateTabBar();
      }, 500);
    }
  },
  
  // 获取用户信息
  getUserProfile: function() {
    app.getUserProfile().then(userInfo => {
      this.setData({
        userInfo: userInfo,
        showAuthModal: false,
        isAdmin: app.globalData.isAdmin
      });
    }).catch(err => {
      console.error('获取用户信息失败', err);
    });
  },
  
  // 关闭授权弹窗
  closeAuthModal: function() {
    this.setData({
      showAuthModal: false
    });
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
            
            // 使用正则表达式替换所有img标签，添加固定宽高样式
            item.answer = item.answer.replace(/<img[^>]*>/g, (match) => {
              // 保留原始img标签的所有属性，但添加固定宽高样式
              return match.replace(/<img/, '<img style="width:40rpx;height:40rpx;display:inline-block;vertical-align:middle;"');
            });
          }
          return item;
        });
        
        this.setData({
          qaList: qaList
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
    const question = this.data.inputQuestion.trim();
    if (!question) {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '查询中',
    });
    
    // 先在本地数据库查询
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'searchQA',
        question: question
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.data && res.result.data.length > 0) {
        // 找到匹配的问题
        const answer = res.result.data[0].answer;
        
        // 处理富文本内容，确保正确显示
        let processedAnswer = answer;
        if (typeof answer === 'string') {
          // 处理可能的HTML实体编码问题
          processedAnswer = answer.replace(/&amp;/g, '&')
                                 .replace(/&lt;/g, '<')
                                 .replace(/&gt;/g, '>')
                                 .replace(/&quot;/g, '"')
                                 .replace(/&#39;/g, "'");
          
          // 使用正则表达式替换所有img标签，添加类名和点击事件
          processedAnswer = processedAnswer.replace(/<img[^>]*>/g, (match) => {
            // 提取原始src属性
            const srcMatch = match.match(/src=["']([^"']*)["']/);
            const srcValue = srcMatch ? srcMatch[1] : '';
            
            // 移除现有的style属性
            let cleanedTag = match.replace(/\sstyle="[^"]*"/g, '');
            
            // 添加我们的固定样式、类名和点击事件
            return cleanedTag.replace(/<img/, `<img class="clickable-image" style="width:40rpx;height:40rpx;display:inline-block;vertical-align:middle;" data-src="${srcValue}" bindtap="previewImage"`);
          });
        }
        
        this.setData({
          currentAnswer: processedAnswer,
          showAnswer: true,
          answerSource: 'database'
        });
        
        // 添加延时，确保富文本渲染完成后再添加点击事件
        setTimeout(() => {
          this.addImageClickEvent();
        }, 300);
      } else {
        // 本地没有找到，调用星火大模型
        this.querySparkAI(question);
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

  // 添加图片点击事件处理函数
  addImageClickEvent: function() {
    const that = this;
    // 获取富文本容器内的所有图片
    wx.createSelectorQuery()
      .selectAll('.answer-text .rich-text-content image')
      .boundingClientRect(function(rects) {
        // 为每个图片元素添加点击事件
        if (rects && rects.length) {
          rects.forEach(function(rect) {
            rect.node && rect.node.addEventListener('tap', function(e) {
              const src = e.target.dataset.src || e.target.src;
              if (src) {
                // 使用微信预览图片API
                wx.previewImage({
                  current: src,
                  urls: [src]
                });
              }
            });
          });
        }
      })
      .exec();
  },

  // 图片预览函数 - 用于直接在WXML中绑定的点击事件
  previewImage: function(e) {
    const src = e.currentTarget.dataset.src;
    if (src) {
      wx.previewImage({
        current: src,
        urls: [src]
      });
    }
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
    
    // 设置超时处理
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          result: {
            success: false,
            errMsg: '查询超时'
          }
        });
      }, 10000); // 10秒超时
    });
    
    // 云函数调用
    const cloudPromise = wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'searchQA',
        keyword: keyword
      }
    });
    
    // 使用 Promise.race 处理超时
    Promise.race([cloudPromise, timeoutPromise])
      .then(res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          if (res.result.found) {
            // 显示找到的答案
            this.setData({
              currentAnswer: res.result.data.answer,
              showAnswer: true,
              answerSource: res.result.data.source || 'database'
            });
          } else {
            // 没有找到答案，显示默认回答
            this.setData({
              currentAnswer: res.result.data.answer || '建议挂号看医生',
              showAnswer: true,
              answerSource: res.result.data.source || 'default'
            });
          }
        } else {
          console.error('查询失败:', res.result ? res.result.errMsg : '未知错误');
          
          // 显示默认回答
          this.setData({
            currentAnswer: '建议挂号看医生',
            showAnswer: true,
            answerSource: 'default'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('查询失败:', err);
        
        // 显示默认回答
        this.setData({
          currentAnswer: '建议挂号看医生',
          showAnswer: true,
          answerSource: 'default'
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
      wx.showToast({
        title: '您没有管理权限',
        icon: 'none'
      });
    }
  }
}); 