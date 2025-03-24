// 管理问答（添加、修改、删除）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    if (action === 'add') {
      // 添加新问答
      const result = await db.collection('qa').add({
        data: {
          question: data.question,
          answer: data.answer,
          keywords: data.keywords || []
        }
      });
      return {
        success: true,
        data: result
      };
    } else if (action === 'update') {
      // 更新问答
      const result = await db.collection('qa').doc(data._id).update({
        data: {
          question: data.question,
          answer: data.answer,
          keywords: data.keywords || []
        }
      });
      return {
        success: true,
        data: result
      };
    } else if (action === 'delete') {
      // 删除问答
      const result = await db.collection('qa').doc(data._id).remove();
      return {
        success: true,
        data: result
      };
    }
    return {
      success: false,
      errMsg: '未知操作'
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e
    };
  }
}; 