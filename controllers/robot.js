const User = require('../models/User');
const RobotAction = require('../models/RobotAction');
const Robot = require('../models/Robot');


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
exports.postRobots = async (req, res, next) => {
  const { broker, symbol } = req.body;
  const robot = new Robot();
  robot.symbol = symbol;
  robot.broker = broker;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    storeRobot(user, robot);
    req.flash('success', { msg: 'Your Robot has been stored!' });
    res.redirect('/account');
  });
};


/**
 * PUT /api/robots/:robot_id
 * Update info of robot.
 */
exports.putRobots = (req, res, next) => {
  // const { message } = req.body;
  const message = 'id:995437,action:sell,order:2,type:dax30';
  const messagePreparationArray = message.split(',');
  const messageObj = {};
  messagePreparationArray.forEach((element) => {
    const needle = element.indexOf(':');
    const key = element.substring(0, needle);
    const value = element.substring(needle + 1);
    messageObj[key] = value;
  });
  console.log(messageObj);

  User.findOne({ 'robots.robot_id': messageObj.id }, (err, user) => {
    if (err) { return next(err); }
    if (user) {
      user.robots.forEach( (robot) => {
        if(robot.robot_id == messageObj.id){
          user.robots.pull({ _id: robot.id })
          robot.last_active = Date.now();
          user.robots.push(robot);

          user.save((err) => {
            if (err) { return next(err); }
          });

          // TODO check robot info and send command!

          res.status(200).send('ok');
        }
      });
    }
  });
};


/**
 * DELETE /api/robots/:id
 * Delete new robot.
 */
exports.removeRobots = (req, res, next) => {
  const { robot_id } = req.params;
  User.findById(req.user.id, (err, user) => {
      if (err) { return next(err); }
      if (user) {
          user.robots.forEach( (robot) => {
            if(robot.robot_id == robot_id){
              user.robots.pull({ _id: robot.id })
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
      action.createdAt = Date.now();

      action.save((err) => {
        if (err) {
          if (err.code === 11000) {
            res.status(400).send('error');
          }
          return next(err);
        }
        res.status(200).send('ok');
      });
    }else{
      res.status(400).send('Your robot is not verified!');
    }
  });
};


async function storeRobot(user, robot) {

   let random = 0;
   do {
      random = Math.floor((Math.random() * 999999) + 1);
   } while (await checkInDb(random));

   robot.robot_id = random;
   // robot.last_active = Date.now();
   user.robots.push(robot);

    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'Error!' });
          return res.redirect('/account');
        }
        return next(err);
      }

    });

}


async function checkInDb(id) {
    try {
        let idFound = await User.findOne({ 'robots.robot_id': id });
        if (idFound) return true;
        else return false;
    }
    catch (err) {
        console.log(err);
        return false;
    }

}
