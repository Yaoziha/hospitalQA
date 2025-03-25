// 引入星火服务
const sparkService = require('./sparkService');

// 搜索问答的函数
async function searchQA(keyword, db) {
  try {
    // 先在数据库中查询
    const qaCollection = db.collection('qa');
    const _ = db.command;
    
    // 查询问题中包含关键词的记录
    const questionResult = await qaCollection.where({
      question: db.RegExp({
        regexp: keyword,
        options: 'i',
      })
    }).get();
    
    // 查询关键词列表中包含关键词的记录
    const keywordResult = await qaCollection.where({
      keywords: _.elemMatch(_.eq(keyword))
    }).get();
    
    // 合并结果并去重
    const allResults = [...questionResult.data, ...keywordResult.data];
    const uniqueResults = [];
    const idSet = new Set();
    
    allResults.forEach(item => {
      if (!idSet.has(item._id)) {
        idSet.add(item._id);
        uniqueResults.push(item);
      }
    });
    
    if (uniqueResults.length > 0) {
      // 找到匹配的问答
      return {
        success: true,
        found: true,
        data: uniqueResults[0]
      };
    } else {
      // 数据库中没有找到，尝试调用讯飞星火AI
      try {
        const sparkResult = await sparkService.askSpark(keyword);
        
        if (sparkResult.success) {
          return {
            success: true,
            found: true,
            data: {
              question: keyword,
              answer: sparkResult.answer,
              source: 'spark'  // 标记来源为星火
            }
          };
        } else {
          // 星火API调用失败，返回默认回答
          return {
            success: true,
            found: false,
            data: {
              answer: '建议挂号看医生'
            }
          };
        }
      } catch (aiError) {
        console.error('调用星火API失败:', aiError);
        // 星火API调用失败，返回默认回答
        return {
          success: true,
          found: false,
          data: {
            answer: '建议挂号看医生'
          }
        };
      }
    }
  } catch (error) {
    console.error('搜索问答失败:', error);
    return {
      success: false,
      error: error
    };
  }
}

module.exports = {
  searchQA
}; 