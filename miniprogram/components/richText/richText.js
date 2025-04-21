const supportDateFormat = ['YY-MM', 'YY.MM.DD', 'YY-MM-DD', 'YY/MM/DD', 'YY.MM.DD HH:MM', 'YY/MM/DD HH:MM', 'YY-MM-DD HH:MM']; //支持的日期格式
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //编辑器是否只读
    readOnly: {
      type: Boolean,
      value: false
    },
    //编辑器默认提示语
    placeholder: {
      type: String,
      value: '开始编辑吧...'
    },
    //插入的日期格式
    formatDate: {
      type: String,
      value: 'YY/MM/DD'
    },
    buttonTxt: {
      type: String,
      value: '保存'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    formats: {}, //样式集合
    textTool: false, //文本工具是否显示，默认隐藏
  },

  /**
   * 组件的方法列表
   */
  methods: {
    //富文本工具点击事件
    toolEvent(res) {
      let {
        tool_name
      } = res.currentTarget.dataset;
      switch (tool_name) {
        case 'insertImage': //插入图片
          this.insertImageEvent();
          break;
        case 'showTextTool': //展示文字编辑工具
          this.showTextTool();
          break;
        case 'insertDate': //插入日期
          this.insertDate();
          break;
        case 'undo': //撤退（向前）
          this.undo();
          break;
        case 'redo': //撤退（向后）
          this.restore();
          break;
        case 'clear': //清除
          this.clearBeforeEvent();
          break;
      }
    },

    //编辑器初始化完成时触发
    onEditorReady() {
      console.log('编辑器初始化完成时触发')
      this.triggerEvent('onEditorReady');
      // 返回一个 SelectorQuery 对象实例。在自定义组件或包含自定义组件的页面中，应使用this.createSelectorQuery()来代替。
      // https://developers.weixin.qq.com/miniprogram/dev/api/wxml/wx.createSelectorQuery.html 
      this.createSelectorQuery().select('#editor').context(res => {
        console.log('createSelectorQuery=>', res)
        this.editorCtx = res.context;
        let rtTxt = '';
        this.setContents(rtTxt); //设置富文本内容
      }).exec();
    },

    //设置富文本内容
    setContents(richtext) {
      console.log('设置富文本内容:', richtext);
      
      // 确保 editorCtx 已初始化
      if (!this.editorCtx) {
        console.error('编辑器上下文未初始化');
        // 尝试重新获取编辑器上下文
        this.createSelectorQuery().select('#editor').context(res => {
          if (res && res.context) {
            this.editorCtx = res.context;
            this._setContentsWithRetry(richtext);
          } else {
            console.error('获取编辑器上下文失败');
          }
        }).exec();
        return;
      }
      
      // 处理图片链接问题
      if (richtext && typeof richtext === 'string') {
        // 首先解码HTML实体
        richtext = richtext.replace(/&amp;/g, '&')
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'");
        
        // 处理图片样式，添加样式限制宽度
        richtext = richtext.replace(/<img/g, '<img style="max-width:100%;height:auto;"');
        
        // 查找所有云存储图片链接
        const cloudImgRegex = /https:\/\/\S+?-cloud\S+?\.tcb\.qcloud\.la\/\S+?(?=["'\s])/g;
        const fileIDs = [];
        let match;
        
        // 收集所有云存储图片ID
        while ((match = cloudImgRegex.exec(richtext)) !== null) {
          // 清理URL，移除查询参数
          let fileID = match[0].split('?')[0];
          if (!fileIDs.includes(fileID)) {
            fileIDs.push(fileID);
          }
        }
        
        if (fileIDs.length > 0) {
          console.log('发现云存储图片:', fileIDs);
          
          // 获取临时文件链接
          wx.cloud.getTempFileURL({
            fileList: fileIDs,
            success: res => {
              console.log('获取临时链接成功:', res);
              
              // 替换内容中的图片链接
              let newContent = richtext;
              res.fileList.forEach(file => {
                if (file.tempFileURL) {
                  // 使用正则表达式替换所有匹配的链接（包括带查询参数的版本）
                  const baseFileID = file.fileID.split('?')[0];
                  const escapedFileID = baseFileID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(escapedFileID + '(\\?[^"\'\\s]*)?', 'g');
                  newContent = newContent.replace(regex, file.tempFileURL);
                }
              });
              
              // 设置处理后的内容
              this._setContentsWithRetry(newContent);
            },
            fail: err => {
              console.error('获取临时链接失败:', err);
              // 仍然尝试设置原始内容
              this._setContentsWithRetry(richtext);
            }
          });
        } else {
          // 没有发现云存储图片，直接设置内容
          this._setContentsWithRetry(richtext);
        }
      } else {
        // 不是字符串，直接设置内容
        this._setContentsWithRetry(richtext);
      }
    },

    // 添加带重试的内容设置方法
    _setContentsWithRetry(richtext, retryCount = 0) {
      // 确保内容是字符串
      if (richtext === null || richtext === undefined) {
        richtext = '';
      }
      
      // 如果不是字符串，尝试转换
      if (typeof richtext !== 'string') {
        try {
          richtext = richtext.toString();
        } catch (e) {
          console.error('内容转换为字符串失败:', e);
          richtext = '';
        }
      }
      
      this.editorCtx.setContents({
        html: richtext,
        success: res => {
          console.log('[setContents success]', res);
        },
        fail: err => {
          console.error('[setContents fail]', err);
          
          // 如果失败且重试次数小于3，则延迟重试
          if (retryCount < 3) {
            setTimeout(() => {
              this._setContentsWithRetry(richtext, retryCount + 1);
            }, 300);
          }
        }
      });
    },

    //撤销
    undo() {
      this.editorCtx.undo();
      this.triggerEvent('undo');
    },

    //恢复
    restore() {
      this.editorCtx.redo();
      this.triggerEvent('restore');
    },

    /**
     * 修改样式，样式item点击事件
     * @param {String} name 样式名称 
     * @param {String} value 样式值
     */
    format(res) {
      let {
        name,
        value
      } = res.target.dataset;
      if (!name) return;
      this.editorCtx.format(name, value);
    },

    // 通过 Context 方法改变编辑器内样式时触发，返回选区已设置的样式
    onStatusChange(res) {
      const formats = res.detail;
      console.log('onStatusChange=>',res)
      this.setData({
        formats
      })
    },

    //在光标位置插入下换线
    insertDivider() {
      this.editorCtx.insertDivider({
        success: res => {
          console.log('[insert divider success]', res)
        }
      })
    },

    //清空编辑器内容
    clear() {
      this.editorCtx.clear({
        success: res => {
          this.triggerEvent('clearSuccess');
        }
      })
    },

    //清空编辑器内容前的事件
    clearBeforeEvent() {
      this.triggerEvent('clearBeforeEvent');
    },

    //清除当前选区的样式
    removeFormat() {
      this.editorCtx.removeFormat();
    },

    //插入日期
    insertDate() {
      if (supportDateFormat.indexOf(this.data.formatDate) < 0) {
        console.error(`Format Date ${this.data.formatDate} error \n It should be one of them [${supportDateFormat}]`)
        return;
      }
      let formatDate = this.getThisDate(this.data.formatDate);
      this.editorCtx.insertText({
        text: formatDate
      })
    },

    //插入图片事件
    insertImageEvent() {
      //触发父组件选择图片方法
      this.triggerEvent('insertImageEvent', {});
    },

    /**
     * 插入图片方法
     * @param {String} path 图片地址，仅支持 http(s)、base64、云图片(2.8.0)、临时文件(2.8.3)
     */
    insertImageMethod(path) {
      return new Promise((resolve, reject) => {
        // 检查是否是云存储路径
        if (path.startsWith('cloud://') || path.indexOf('-cloud') > -1) {
          // 获取临时链接
          wx.cloud.getTempFileURL({
            fileList: [path],
            success: res => {
              if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                // 使用临时链接插入图片
                this.editorCtx.insertImage({
                  src: res.fileList[0].tempFileURL,
                  data: {
                    id: 'image',
                    fileID: path // 保存原始fileID以便后续使用
                  },
                  success: res => {
                    resolve(res);
                  },
                  fail: res => {
                    console.error('插入图片失败:', res);
                    reject(res);
                  }
                });
              } else {
                reject(new Error('获取临时链接失败'));
              }
            },
            fail: err => {
              console.error('获取临时链接失败:', err);
              reject(err);
            }
          });
        } else {
          // 直接插入本地或网络图片
          this.editorCtx.insertImage({
            src: path,
            data: {
              id: 'image'
            },
            success: res => {
              resolve(res);
            },
            fail: res => {
              console.error('插入图片失败:', res);
              reject(res);
            }
          });
        }
      });
    },

    //保存按钮事件，获取编辑器内容
    getEditorContent() {
      this.editorCtx.getContents({
        success: res => {
          // console.log('[getContents rich text success]', res)
          this.triggerEvent('getEditorContent', {
            value: res,
          });
        }
      })
    },

    //show文本工具栏
    showTextTool() {
      this.setData({
        textTool: !this.data.textTool
      })
    },

    //编辑器聚焦时触发
    bindfocus(res) {
      this.triggerEvent('bindfocus', {
        value: res,
      });
    },
    //编辑器失去焦点时触发
    bindblur(res) {
      this.triggerEvent('bindblur', {
        value: res,
      });
    },

    //编辑器输入中时触发
    bindinput(res) {
      this.triggerEvent('bindinput', {
        value: res,
      });
    },

    /**
     * 返回当前日期
     * @format {String} 需要返回的日期格式
     */
    getThisDate(format) {
      let date = new Date(),
        year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate(),
        h = date.getHours(),
        m = date.getMinutes();

      //数值补0方法
      const zero = (value) => {
        if (value < 10) return '0' + value;
        return value;
      }

      switch (format) {
        case 'YY-MM':
          return year + '-' + zero(month);
        case 'YY.MM.DD':
          return year + '.' + zero(month) + '.' + zero(day);
        case 'YY-MM-DD':
          return year + '-' + zero(month) + '-' + zero(day);
        case 'YY.MM.DD HH:MM':
          return year + '.' + zero(month) + '.' + zero(day) + ' ' + zero(h) + ':' + zero(m);
        case 'YY/MM/DD HH:MM':
          return year + '/' + zero(month) + '/' + zero(day) + ' ' + zero(h) + ':' + zero(m);
        case 'YY-MM-DD HH:MM':
          return year + '-' + zero(month) + '-' + zero(day) + ' ' + zero(h) + ':' + zero(m);
        default:
          return year + '/' + zero(month) + '/' + zero(day);
      }
    }
  },

  /**
   * 组件生命周期函数-在组件布局完成后执行)
   */
  ready() {

  },
})