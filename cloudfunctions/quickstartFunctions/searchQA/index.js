/*
 * @Descripttion: 
 * @version: 
 * @Author: yaozihan
 * @Date: 2025-03-24 10:19:13
 * @LastEditors: yaozihan
 * @LastEditTime: 2025-03-24 10:19:22
 */
// 搜索问题
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { keyword } = event;
  try {
    // 先尝试精确匹配问题
    let result = await db.collection('qa').where({
      question: keyword
    }).get();
    
    // 如果没有精确匹配，尝试模糊匹配
    if (result.data.length === 0) {
      result = await db.collection('qa').where(_.or([
        {
          question: db.RegExp({
            regexp: keyword,
            options: 'i',
          })
        },
        {
          keywords: _.all([db.RegExp({
            regexp: keyword,
            options: 'i',
          })])
        }
      ])).get();
    }
    
    if (result.data.length > 0) {
      return {
        success: true,
        found: true,
        data: result.data[0]
      };
    } else {
      return {
        success: true,
        found: false,
        message: "建议挂号看医生"
      };
    }
  } catch (e) {
    return {
      success: false,
      errMsg: e
    };
  }
}; 