const moment = require('moment');
const User = require('../models/User');
const RobotAction = require('../models/RobotAction');
const Robot = require('../models/Robot');
const Live = require('../models/Live');


/**
 * GET /api/robots
 * Get all robots for user.
 */
exports.getRobots = (req, res) => {
  const { robots } = req.user;
  return res.status(200).send(robots);
};

async function checkInDb(id) {
  try {
    const idFound = await User.findOne({ 'robots.robot_id': id });
    if (idFound) return true;
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function storeRobot(user, robot) {
  let random = '0';
  do {
    random = Math.floor((Math.random() * 999999) + 1).toString();
  } while (await checkInDb(random));

  robot.robot_id = random;
  // robot.last_active = Date.now();
  user.robots.push(robot);

  user.save((err) => {
    if (err) { console.log(err); }
  });
}

/**
 * POST /api/robots/create
 * Store new robot.
 */
exports.postRobots = async (req, res, next) => {
  const { broker, symbol, accountNumber } = req.body;
  req.assert('broker', 'Broker cannot be blank').notEmpty();
  req.assert('symbol', 'Symbol cannot be blank').notEmpty();
  req.assert('accountNumber', 'Account cannot be blank').notEmpty();
  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  const robot = new Robot();
  robot.symbol = symbol;
  robot.broker = broker;
  robot.account_number = accountNumber;
  await User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    storeRobot(user, robot);
  });

  req.flash('success', { msg: 'Your Robot has been stored!' });
  res.redirect('/account');
};


/**
 * PUT /api/robots/:robot_id
 * Update info of robot.
 */
exports.putRobots = async (req, res, next) => {
  const { message } = req.body;
  console.log(message);
  const messagePreparationArray = message.split(',');
  const messageObj = {};
  messagePreparationArray.forEach((element) => {
    const needle = element.indexOf(':');
    const key = element.substring(0, needle);
    const value = element.substring(needle + 1);
    messageObj[key] = value;
  });
  console.log(messageObj);
  let action = 'ok';

  await User.findOne({ 'robots.robot_id': messageObj.id }, (err, user) => {
    if (err) { return next(err); }
    if (user) {
      user.robots.forEach(async (robot) => {
        if (robot.robot_id === messageObj.id) {
          if (robot.account_number === messageObj.account_id) {
            user.robots.pull({ _id: robot.id });
            robot.last_active = Date.now();
            user.robots.push(robot);

            // user.update({'robots.robot_id': robot.id }, { '$set': { 'robots.$.last_active': Date.now() }},  (err) =>{
            //   console.log(err);
            // });

            
            await Live.findOne({ robot_id: robot.robot_id }, (err, liveRobot) => {
              if (err) { return next(err); }
              if (liveRobot) {
                if (liveRobot.pending_action) {
                  const actionTime = moment(liveRobot.pending_time);
                  const now = moment(Date.now());
                  const secondsDiff = now.diff(actionTime, 'seconds');
                  if (secondsDiff <= process.env.SEND_ACTION_LIMIT_TIME) {
                    action = liveRobot.pending_action;
                  } else {
                    action = 'Late for action!';
                  }
                  liveRobot.pending_action = null;
                  liveRobot.pending_time = null;
                  liveRobot.save((err) => { if (err) { return next(err); } });
                }
              } else {
                const live = new Live();
                live.robot_id = robot.robot_id;
                live.symbol = robot.symbol;
                live.save((err) => { if (err) { return next(err); } });
              }
            });
            res.status(200).send(action);
          } else {
            res.status(200).send('Account is not correct!');
          }
        }
        
      user.save((err) => { if (err) { return next(err); } });
      });


    } else {
      res.status(200).send('Not found Robot!');
    }
  });
};


/**
 * DELETE /api/robots/:id
 * Delete new robot.
 */
exports.removeRobots = (req, res, next) => {
  const { robotId } = req.params;
  console.log(robotId);
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    if (user) {
      user.robots.forEach((robot) => {
        if (robot.robot_id === robotId) {
          user.robots.pull({ _id: robot.id });
        }
      });
      user.save((err) => {
        if (err) {
          if (err.code === 11000) {
            req.flash('errors', { msg: 'Error!' });
            return res.redirect('/account');
          }
          return next(err);
        }
      });
      req.flash('success', { msg: 'Your Robot has been removed!' });
      res.redirect('/account');
    }
  });
};

/**
 * POST /api/trader
 * Store new robot actions.
 */
exports.postActions = (req, res, next) => {
  const { message } = req.body;
  const messagePreparationArray = message.split(',');
  const messageObj = {};
  messagePreparationArray.forEach((element) => {
    const needle = element.indexOf(':');
    const key = element.substring(0, needle);
    const value = element.substring(needle + 1);
    messageObj[key] = value;
  });
  console.log(messageObj);
  console.log(process.env.ROBOTS);
  const verificatedRobots = process.env.ROBOTS.split(',');
  verificatedRobots.forEach((robot) => {
    if (robot === messageObj.id) {
      const action = new RobotAction();
      action.symbol = messageObj.type;
      action.action = messageObj.action;
      action.order = messageObj.order;
      action.robot_id = messageObj.id;
      action.createdAt = Date.now();

      Live.find({ symbol: messageObj.type }).then( (lives) =>{
        lives.forEach( (live) => {
            if(live.pending_action){
              live.pending_action = messageObj.action + '|' + live.pending_action;
            } else {
              live.pending_action = messageObj.action;
            }
            live.pending_time = Date.now();
            live.save((err) => { if (err) { return next(err); } });
        });
      });

      action.save((err) => {
        if (err) { return next(err); }
        res.status(200).send('ok');
      });
    } else {
      res.status(400).send('Your robot is not verified!');
    }
  });
};
