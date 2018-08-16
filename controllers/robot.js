const moment = require('moment');
const User = require('../models/User');
const RobotAction = require('../models/RobotAction');
const Robot = require('../models/Robot');
const Live = require('../models/Live');
const Transaction = require('../models/Transaction');


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
    const idFound = await Robot.findOne({ robot_id: id });
    if (idFound) return true;
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function storeRobot(robot) {
  let random = '0';
  do {
    random = Math.floor((Math.random() * 999999) + 1).toString();
  } while (await checkInDb(random));

  robot.robot_id = random;
  robot.save((err) => { if (err) { console.log(err); } });
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

  await User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    if (user) {
      const robot = new Robot();
      robot.symbol = symbol;
      robot.broker = broker;
      robot.account_number = accountNumber;
      robot.user = req.user.id;
      robot.last_active = Date.now();
      storeRobot(robot);
    }
  });

  req.flash('success', { msg: 'Your Robot has been stored!' });
  res.redirect('/account');
};


/**
 * PUT /api/robots
 * Update info of robot.
 */
exports.putRobots = async (req, res, next) => {
  const { message } = req.body;
  console.log(message);
  // message += ',transactions:123456-1.20-12.03.2018-12.03.2018/123456-1.20-12.03.2018-12.03.2018';
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

  Robot.findOne({ robot_id: messageObj.id }, async (err, robot) => {
    if (err) { return next(err); }
    if (robot) {
      if (robot.account_number === messageObj.account_id) {
        if (messageObj.transactions) {
          const transactionsArray = messageObj.transactions.split('/');
          transactionsArray.forEach((transaction) => {
            // TODO check for existing transaction
            const [orderTicket, profit, openDate, closeDate] = transaction.split('-');
            const transactionObj = new Transaction();
            if (transaction.split('-').length === 4) {
              transactionObj.robot_id = robot.robot_id;
              transactionObj.order_ticket = orderTicket;
              transactionObj.profit = profit;
              transactionObj.open_date = openDate;
              transactionObj.close_date = closeDate;
              transactionObj.save((err) => { if (err) { return next(err); } });
            }
          });
        }

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
              liveRobot.last_active = Date.now();
              liveRobot.save((err) => { if (err) { return next(err); } });
            }
          } else {
            const live = new Live();
            live.robot_id = robot.robot_id;
            live.symbol = robot.symbol;
            live.last_active = Date.now();
            live.save((err) => { if (err) { return next(err); } });
          }
            robot.last_active = Date.now();
            robot.save((err) => { if (err) { return next(err); } });
        });
        res.status(200).send(action);
      } else {
        res.status(200).send('Robot is placed on different account!');
      }
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
  Robot.remove({ robot_id: robotId }, (err) => {
    if (err) { return next(err); }
  });

  req.flash('success', { msg: 'Your Robot has been removed!' });
  res.redirect('/account');
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
          if (live.pending_action) {
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
