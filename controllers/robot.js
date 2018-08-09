const User = require('../models/User');


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
      broker,
      profit: '',
      mac: '',
      ip: '',
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
