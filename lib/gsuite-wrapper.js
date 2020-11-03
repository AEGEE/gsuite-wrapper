const {runGsuiteOperation, gsuiteOperations} = require('./google-suite.js');

const log = require('./util/logger.js');

const redis = require('./redis.js').db;

// API DEFINITION

exports.createGroup = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const data = req.body;

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;

  if (!data.groupName || !data.primaryEmail || !data.bodyPK){

    response.message = 'Validation error: primaryEmail, groupName, or bodyPK is absent or empty';
    statusCode = 400;

  } else {

    try {
      let result = await runGsuiteOperation(gsuiteOperations.addGroup, data);
      response = {success: result.success, message: result.data.email + ' group has been created', data: result.data };
      statusCode = result.code;

      redis.hset('group:' + data.bodyPK, 'GsuiteAccount', data.primaryEmail);
      redis.set('primary:' + data.bodyPK, data.primaryEmail);
      redis.set('id:' + data.primaryEmail, data.bodyPK);

    } catch (GsuiteError){
      log.warn('GsuiteError');
      response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
      statusCode = GsuiteError.code;
    }

  }

  return res.status(statusCode).json(response);
};

exports.deleteGroup = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const bodyPK = req.params.bodyPK;
  log.debug(bodyPK);

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;
  let groupID = '';

  if (bodyPK){
    groupID = await redis.get('primary:' + bodyPK);
    log.debug(groupID);
  }
  if (!groupID){

    response.message = 'Error: no group matching bodyPK ' + bodyPK;
    statusCode = 404;

  } else {

    const data = {primaryEmail: groupID};
    log.debug(data.primaryEmail);

    try {
      let result = await runGsuiteOperation(gsuiteOperations.deleteGroup, data);
      response = {success: result.success, message: data.primaryEmail + ' group has been deleted', data: result.data };
      statusCode = result.code;
      log.debug(result);
      if (result.success) {
        await redis.del('group:' + bodyPK, 'primary:' + bodyPK, 'id:' + groupID).catch(err => console.log('redis error: ' + err));
      }

    } catch (GsuiteError){
      log.warn('GsuiteError');
      response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
      statusCode = GsuiteError.code;
    }
  }

  return res.status(statusCode).json(response);
};

exports.createAccount = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const data = req.body;

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;

  if (!data.userPK ||
        !data.primaryEmail ||
        !data.secondaryEmail ||
        !data.password ||
        !data.antenna ||
        !data.name.givenName ||
        !data.name.familyName){

    response.message = 'Validation error: a required property is absent or empty';
    statusCode = 400;


  } else {

    const payload = {
      suspended: true,
      primaryEmail: data.primaryEmail,
      name: data.name,
      password: data.password,
      hashFunction: 'SHA-1',
      recoveryEmail: data.secondaryEmail,
      emails: [
        {
          address: data.secondaryEmail,
          type: 'home',
          customType: '',
          primary: true,
        },
      ],
      organizations: [
        {
          department: data.antenna,
        },
      ],
      orgUnitPath: '/individuals',
      includeInGlobalAddressList: true,
    };

    try {
      let result = await runGsuiteOperation(gsuiteOperations.addAccount, payload);
      response = {success: result.success, message: result.data.primaryEmail + ' account has been created', data: result.data };
      statusCode = result.code;

      redis.hset('user:' + data.userPK, 'GsuiteAccount', data.primaryEmail, 'SecondaryEmail', data.secondaryEmail);
      redis.set('primary:' + data.userPK, data.primaryEmail);
      redis.set('primary:' + data.secondaryEmail, data.primaryEmail);
      redis.set('id:' + data.primaryEmail, data.userPK);
      redis.set('secondary:' + data.primaryEmail, data.secondaryEmail);

    } catch (GsuiteError){
      log.warn('GsuiteError');
      response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
      statusCode = GsuiteError.code;
    }

  }

  return res.status(statusCode).json(response);
};

exports.editAccount = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const personPK = req.params.userPK;
  const data = req.body;

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;

  if (!personPK || Object.keys(data).length === 0){

    response.message = 'Validation error: the primary key or payload is absent or empty';
    statusCode = 400;

  } else {

    const removeEmpty = (obj) => {
      Object.keys(obj).forEach((key) => (obj[key] == null) && delete obj[key]);
      return obj;
    };

    const payload = removeEmpty(Object.assign(
      {},
      data,
      {hashFunction: data.password ? 'SHA-1' : null},
      {emails: data.secondaryEmail ? [
        {
          address: data.secondaryEmail,
          type: 'home',
          customType: '',
          primary: true,
        },
      ] : null},
      {organizations: data.antennae ? [ { department: data.antennae.toString() } ] : null},
    ));

    if (Object.keys(payload).length > 0){

      payload.userKey = personPK;

      try {
        let result = await runGsuiteOperation(gsuiteOperations.editAccount, payload);
        response = {success: result.success, message: result.data[0].primaryEmail + ' account has been updated', data: result.data };
        statusCode = result.code;
      } catch (GsuiteError){
        log.warn('GsuiteError');
        response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
        statusCode = GsuiteError.code;
      }
    }
  }

  return res.status(statusCode).json(response);
};
// Possible values for data.operation: add|remove|upgrade|downgrade
exports.editMembershipToGroup = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const personPK = req.params.userPK;
  const data = req.body;

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;

  if (!data.groupPK ||
        !data.operation ||
        data.operation === 'upgrade' || // NOT IMPLEMENTED YET
        data.operation === 'downgrade' || // NOT IMPLEMENTED YET
        (data.operation !== 'add' &&
        data.operation !== 'remove')){

    response.message = 'Validation error: operation empty or not valid; or primaryKey is absent or empty';
    statusCode = 400;

  } else {

    const userID = await redis.get('primary:' + personPK);
    const groupID = await redis.get('primary:' + data.groupPK);
    log.debug(userID);
    log.debug(groupID);
    data.primaryEmail = groupID;
    data.userName = userID;

    try {
      let operation = null;
      data.operation === 'add'
        ? operation = gsuiteOperations.addUserInGroup
        : data.operation === 'remove' ? operation = gsuiteOperations.removeUserFromGroup
          : operation = gsuiteOperations.changeUserGroupPrivilege; ;

      let result = await runGsuiteOperation(operation, data);
      response = {success: result.success, message: result.data.email + ' membership has been created', data: result.data };
      statusCode = result.code;

      if (data.operation === 'add'){
        redis.sadd('membership:' + userID, groupID);
        redis.sadd('members:' + groupID, userID);
      }
      if (data.operation === 'remove'){
        await redis.srem('membership:' + userID, groupID);
        await redis.srem('members:' + groupID, userID);
      }

    } catch (GsuiteError){
      log.warn('GsuiteError');
      response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
      statusCode = GsuiteError.code;
    }

  }

  return res.status(statusCode).json(response);
};

exports.updateAlias = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const personPK = req.params.userPK;
  const data = req.body;

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;

  if (!data.aliasName ||
        !data.operation ||
        (data.operation !== 'add' &&
        data.operation !== 'remove')){

    response.message = 'Validation error: operation empty or not valid; or aliasName is absent or empty';
    statusCode = 400;

  } else {

    const operation = (data.operation === 'add' ? gsuiteOperations.addEmailAlias : gsuiteOperations.removeEmailAlias);

    const userID = await redis.get('primary:' + personPK);
    log.debug(userID);
    data.primaryEmail = userID;

    const payload = {
      primaryEmail: userID,
      aliasName: data.aliasName,
    };

    try {

      let result = await runGsuiteOperation(operation, payload);
      response = {success: result.success, message: result.data.email + ' membership has been created', data: result.data };
      statusCode = result.code;

      if (data.operation === 'add'){
        redis.pipeline()
          .hset('user:' + personPK, 'GsuiteAlias', data.aliasName)
          .set('alias:' + personPK, data.aliasName)
          .set('primary:' + data.aliasName, userID)
          .sadd('alias:' + userID, data.aliasName)
          .exec();
      }
      if (data.operation === 'remove'){
        await redis.pipeline()
          .srem('alias:' + userID, data.aliasName)
          .del('alias:' + personPK, 'primary:' + data.aliasName)
          .hdel('user:' + personPK, 'GsuiteAlias')
          .exec();
      }

    } catch (GsuiteError){
      log.warn(GsuiteError.errors);
      log.warn(req.headers['test-title']);
      // console.log(GsuiteError.errors);
      response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
      statusCode = GsuiteError.code;
    }

  }

  return res.status(statusCode).json(response);
};

exports.getAliasFromRedis = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const personPK = req.params.userPK;

  const userID = await redis.get('primary:' + personPK);
  log.debug(userID);

  const response = {success: true,
    message: 'Aliases as follow',
    data: '' };

  const aliases = await redis.smembers('alias:' + userID)
    .catch(err => {
      response.success = false;
      response.message = 'Something with redis';
      response.data = err;
    });

  response.data = aliases;

  return res.status(200).json(response);
};

exports.createCalEvent = async function(req, res, next) {
  log.debug(req.headers['test-title']);

  const data = req.body;

  let response = {success: false, message: 'Undefined error'};
  let statusCode = 500;

  if (!data.name ||
        !data.startDate ||
        !data.endDate ||
        !data.description ||
        !data.location ||
        !data.eventID){

    response.message = 'Validation error: a required property is absent or empty';
    statusCode = 400;

  } else {

    const payload = {
      id: data.eventID,
      summary: data.name,
      location: data.location,
      description: data.description,
      start: {
        // 'dateTime': '2015-05-28T09:00:00-07:00',
        // 'date': '2015-05-28',
        date: data.startDate,
        timeZone: 'Europe/Brussels',
      },
      end: {
        date: data.endDate,
        timeZone: 'Europe/Brussels',
      },
      reminders: {
        useDefault: false,
        overrides: [
          {method: 'email', minutes: 24 * 60},
          {method: 'popup', minutes: 10},
        ],
      },
    };

    try {
      let result = await runGsuiteOperation(gsuiteOperations.addEvent, payload);
      response = {success: true, message: result.data + 'Event has been created', data: result.data };
      statusCode = result.code;
      // console.log(result.data); //FIXME remove next time
    } catch (GsuiteError){
      log.warn('GsuiteError');
      response = {success: false, errors: GsuiteError.errors, message: GsuiteError.errors[0].message };
      statusCode = GsuiteError.code;
    }

  }

  return res.status(statusCode).json(response);
};

// HELPER or INTERNAL METHODS/VARS
