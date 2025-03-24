const getOpenId = require('./getOpenId/index');
const getQAList = require('./getQAList/index');
const searchQA = require('./searchQA/index');
const manageQA = require('./manageQA/index');

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId.main(event, context);
    case 'getQAList':
      return await getQAList.main(event, context);
    case 'searchQA':
      return await searchQA.main(event, context);
    case 'manageQA':
      return await manageQA.main(event, context);
  }
};
        
