const User = require('../models/User');
const RobotAction = require('../models/RobotAction');


/**
 * GET /api/robots
 * Get all robots for user.
 */
exports.getRobots = (req, res) => {
  const { robots } = req.user;
  return res.status(200).send(robots);
};


/**
 * POST /api/robots/create
 * Store new robot.
 */
exports.postRobots = (req, res, next) => {
  const { broker, symbol } = req.body;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.robots.push({
      robot_id: '123456',
      account_number: null,
      broker,
      profit: null,
      mac: null,
      ip: null,
      symbol,
      last_active: Date.now()
    });

    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'Error!' });
          return res.redirect('/account');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /api/trader
 * Store new robot actions.
 */
exports.postActions = (req, res, next) => {
  // const { message } = req.body;
  const message = 'id:12345,action:sell,order:2,type:dax30';
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

      action.save((err) => {
        if (err) {
          if (err.code === 11000) {
            res.status(400).send('error');
          }
          return next(err);
        }
        res.status(200).send('ok');
      });
    }
  });
};
