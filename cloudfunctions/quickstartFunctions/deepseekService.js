/*
 * @Descripttion: 
 * @version: 
 * @Author: yaozihan
 * @Date: 2025-03-25 10:28:59
 * @LastEditors: yaozihan
 * @LastEditTime: 2025-03-25 10:29:10
 */
// 引入 axios 用于发送 HTTP 请求
const axios = require('axios');

// 调用 DeepSeek AI 的函数
async function askDeepSeek(question) {
  try {
    // 这里需要替换为您的 DeepSeek API 密钥和端点
    const apiKey = 'your_deepseek_api_key';
    const endpoint = 'https://api.deepseek.com/v1/chat/completions';  // 请替换为实际的 DeepSeek API 端点
    
    const response = await axios({
      method: 'post',
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'deepseek-chat',  // 请替换为您要使用的 DeepSeek 模型
        messages: [
          {
            role: 'system',
            content: '你是一个医疗助手，请用简洁专业的语言回答医疗相关问题。'
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 500
      }
    });
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return {
        success: true,
        answer: response.data.choices[0].message.content
      };
    } else {
      return {
        success: false,
        error: '未获取到有效回答'
      };
    }
  } catch (error) {
    console.error('调用 DeepSeek API 失败:', error);
    return {
      success: false,
      error: error.message || '调用 AI 服务失败'
    };
  }
}

module.exports = {
  askDeepSeek
}; 