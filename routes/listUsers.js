const db = require('../db')

module.exports = (req, res) => {
  db.listOtherUsers(req.session.userid)
  .then(users => {
    req.viewArgs.users = users
    res.render('users', req.viewArgs)
  })
}