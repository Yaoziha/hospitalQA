// 引入星火AI服务
const sparkService = require('../sparkService');

// 优化搜索函数
exports.searchQA = async function(keyword, db) {
  try {
    console.log('开始搜索问题:', keyword);
    
    // 设置超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('数据库查询超时')), 8000);
    });
    
    // 数据库查询
    const queryPromise = db.collection('qa').get();
    
    // 使用 Promise.race 确保不会无限等待
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (!result || !result.data) {
      console.log('未找到匹配的问答');
      return {
        success: true,
        found: false,
        data: {
          answer: '建议挂号看医生',
          source: 'default'
        }
      };
    }
    
    // 简化搜索逻辑，提高效率
    const qaList = result.data;
    let bestMatch = null;
    let highestScore = 0;
    
    for (const qa of qaList) {
      // 计算相似度分数
      const score = calculateSimilarity(keyword, qa.question, qa.keywords || []);
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = qa;
      }
    }
    
    // 如果找到匹配度高的问答
    if (bestMatch && highestScore > 0.6) {
      console.log('找到匹配的问答:', bestMatch.question);
      return {
        success: true,
        found: true,
        data: bestMatch
      };
    }
    
    // 未找到匹配的问答，尝试使用星火AI
    console.log('未找到高匹配度的问答，尝试使用星火AI');
    try {
      const sparkResult = await sparkService.askSpark(keyword);
      if (sparkResult && sparkResult.success) {
        return {
          success: true,
          found: true,
          data: {
            answer: sparkResult.answer,
            source: 'spark'
          }
        };
      }
    } catch (sparkErr) {
      console.error('星火AI调用失败:', sparkErr);
    }
    
    // 星火AI也失败，返回默认回答
    return {
      success: true,
      found: false,
      data: {
        answer: '建议挂号看医生',
        source: 'default'
      }
    };
  } catch (err) {
    console.error('搜索问题时出错:', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};

// 计算相似度的辅助函数
function calculateSimilarity(keyword, question, keywords) {
  // 直接包含关键词的情况
  if (keywords && keywords.length > 0) {
    for (const kw of keywords) {
      if (keyword.includes(kw)) {
        return 1.0; // 完全匹配
      }
    }
  }
  
  // 问题包含关键词的情况
  if (question.includes(keyword)) {
    return 0.9;
  }
  
  // 关键词包含在问题中的情况
  if (keyword.includes(question)) {
    return 0.8;
  }
  
  // 简单的字符匹配
  let matchCount = 0;
  for (let i = 0; i < keyword.length; i++) {
    if (question.includes(keyword[i])) {
      matchCount++;
    }
  }
  
  return matchCount / keyword.length * 0.7;
} 