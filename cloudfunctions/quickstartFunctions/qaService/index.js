// 引入星火AI服务
const sparkService = require('../sparkService');

// 搜索问答
async function searchQA(keyword, db) {
  console.log('搜索关键词:', keyword);
  
  try {
    // 1. 优先完全匹配问题
    console.log('尝试完全匹配问题');
    const exactMatchResult = await db.collection('qa').where({
      question: keyword
    }).get();
    
    if (exactMatchResult.data && exactMatchResult.data.length > 0) {
      console.log('找到完全匹配的问题:', exactMatchResult.data[0].question);
      return {
        success: true,
        found: true,
        data: {
          ...exactMatchResult.data[0],
          source: 'exact_match'
        }
      };
    }
    
    // 2. 尝试模糊匹配问题（去掉问题编号等前缀）
    console.log('尝试模糊匹配问题（去掉前缀）');
    // 去掉可能的问题编号前缀，如"26. "
    const cleanKeyword = keyword.replace(/^\d+\.\s*/, '');
    
    const fuzzyQuestionResult = await db.collection('qa').where({
      question: db.RegExp({
        regexp: cleanKeyword,
        options: 'i'
      })
    }).get();
    
    if (fuzzyQuestionResult.data && fuzzyQuestionResult.data.length > 0) {
      console.log('找到模糊匹配的问题:', fuzzyQuestionResult.data[0].question);
      return {
        success: true,
        found: true,
        data: {
          ...fuzzyQuestionResult.data[0],
          source: 'fuzzy_match'
        }
      };
    }
    
    // 3. 尝试匹配关键词
    console.log('尝试匹配关键词');
    const keywordResult = await db.collection('qa').where({
      keywords: db.command.all([keyword])
    }).get();
    
    if (keywordResult.data && keywordResult.data.length > 0) {
      console.log('找到匹配关键词的问题:', keywordResult.data[0].question);
      return {
        success: true,
        found: true,
        data: {
          ...keywordResult.data[0],
          source: 'keyword_match'
        }
      };
    }
    
    // 4. 尝试模糊匹配关键词
    console.log('尝试模糊匹配关键词');
    const keywordFuzzyResult = await db.collection('qa').where({
      keywords: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }).get();
    
    if (keywordFuzzyResult.data && keywordFuzzyResult.data.length > 0) {
      console.log('找到模糊匹配关键词的问题:', keywordFuzzyResult.data[0].question);
      return {
        success: true,
        found: true,
        data: {
          ...keywordFuzzyResult.data[0],
          source: 'keyword_fuzzy_match'
        }
      };
    }
    
    // 5. 如果以上都没找到，尝试调用AI
    console.log('尝试调用AI');
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
}

module.exports = {
  searchQA
}; 