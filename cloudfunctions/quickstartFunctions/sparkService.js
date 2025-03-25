// 引入必要的模块
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');

// 讯飞星火认知大模型配置
const SPARK_APP_ID = '703c4c21';
const SPARK_API_KEY = '90fdd1818d012b3fcff6fd43c3788e70';
const SPARK_API_SECRET = 'MTZkNmE5NjQ0NTg5YTM1NjhmOThmMTcz';
const SPARK_DOMAIN = 'lite';  // general 或 generalv2

// 生成鉴权URL
function createSparkUrl() {
  const host = 'spark-api.xf-yun.com';
  const path = `/v1.1/chat`;
  const url = `wss://${host}${path}`;
  
  // 生成RFC1123格式的时间戳
  const now = new Date();
  const date = now.toUTCString();
  
  // 拼接字符串
  let signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  
  // 使用hmac-sha256进行加密
  const hmac = crypto.createHmac('sha256', SPARK_API_SECRET);
  hmac.update(signatureOrigin);
  const signature = hmac.digest('base64');
  
  // 构建authorization
  const authorizationOrigin = `api_key="${SPARK_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  
  // 拼接url
  return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
}

// 调用讯飞星火认知大模型
async function askSpark(question) {
  return new Promise((resolve, reject) => {
    try {
      // 创建WebSocket连接
      const url = createSparkUrl();
      const ws = new WebSocket(url);
      
      let answer = '';
      
      // 构建请求数据
      const requestData = {
        header: {
          app_id: SPARK_APP_ID,
          uid: 'wechat_miniprogram_user'
        },
        parameter: {
          chat: {
            domain: SPARK_DOMAIN,
            temperature: 0.5,
            max_tokens: 1024
          }
        },
        payload: {
          message: {
            text: [
              { role: 'system', content: '你是一个医疗助手，请用简洁专业的语言回答医疗相关问题。' },
              { role: 'user', content: question }
            ]
          }
        }
      };
      
      // 连接建立时发送数据
      ws.on('open', function() {
        console.log('WebSocket连接已建立');
        ws.send(JSON.stringify(requestData));
      });
      
      // 接收消息
      ws.on('message', function(data) {
        const response = JSON.parse(data);
        console.log('收到消息:', response);
        
        if (response.header.code !== 0) {
          ws.close();
          reject(new Error(`调用星火API失败: ${response.header.message}`));
          return;
        }
        
        // 提取回答内容
        if (response.payload && response.payload.choices && response.payload.choices.text) {
          const content = response.payload.choices.text[0].content;
          answer += content;
        }
        
        // 判断是否结束
        if (response.header.status === 2) {
          ws.close();
          resolve({
            success: true,
            answer: answer
          });
        }
      });
      
      // 错误处理
      ws.on('error', function(error) {
        console.error('WebSocket错误:', error);
        reject({
          success: false,
          error: error.message || '调用星火API失败'
        });
      });
      
      // 连接关闭
      ws.on('close', function() {
        console.log('WebSocket连接已关闭');
        if (!answer) {
          reject({
            success: false,
            error: '未获取到有效回答'
          });
        }
      });
      
      // 设置超时
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          reject({
            success: false,
            error: '请求超时'
          });
        }
      }, 30000); // 30秒超时
      
    } catch (error) {
      console.error('调用星火API失败:', error);
      reject({
        success: false,
        error: error.message || '调用AI服务失败'
      });
    }
  });
}

module.exports = {
  askSpark
}; 