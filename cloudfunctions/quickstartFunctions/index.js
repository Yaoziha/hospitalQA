/*
 * @Descripttion: 
 * @version: 
 * @Author: yaozihan
 * @Date: 2025-03-24 09:50:44
 * @LastEditors: yaozihan
 * @LastEditTime: 2025-03-25 10:32:18
 */
const getOpenId = require('./getOpenId/index');
const getQAList = require('./getQAList/index');
// const searchQA = require('./searchQA/index');
const manageQA = require('./manageQA/index');
const checkAdminPermission = require('./checkAdminPermission/index');
const getLoginUsers = require('./getLoginUsers/index');
const getAdmins = require('./getAdmins/index');
const addAdmin = require('./addAdmin/index');
const removeAdmin = require('./removeAdmin/index');

// 引入 QA 服务模块
const qaService = require('./qaService');

// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId.main(event, context);
    case 'getQAList':
      return await getQAList.main(event, context);
    case 'searchQA':
      return await qaService.searchQA(event.keyword, db);
    case 'manageQA':
      return await manageQA.main(event, context);
    case 'checkAdminPermission':
      return await checkAdminPermission.main(event, context);
    case 'getLoginUsers':
      return await getLoginUsers.main(event, context);
    case 'getAdmins':
      return await getAdmins.main(event, context);
    case 'addAdmin':
      return await addAdmin.main(event, context);
    case 'removeAdmin':
      return await removeAdmin.main(event, context);
  }
};
        
