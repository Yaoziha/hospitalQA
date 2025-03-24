/*
 * @Descripttion: 
 * @version: 
 * @Author: yaozihan
 * @Date: 2025-03-24 10:18:41
 * @LastEditors: yaozihan
 * @LastEditTime: 2025-03-24 10:18:52
 */
// 获取所有问答列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const result = await db.collection('qa').get();
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e
    };
  }
}; 