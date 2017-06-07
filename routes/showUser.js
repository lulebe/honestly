const db = require('../db')

module.exports = (req, res) => {
  db.getUser(req.params.userId)
  .then(user => {
    req.viewArgs.user = user
    res.render('user', req.viewArgs)
  })
}