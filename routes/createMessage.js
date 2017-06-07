const db = require('../db')

module.exports = (req, res) => {
  if (!req.body.message || req.body.message.length < 10)
    return res.redirect(req.url)
  db.createMessage(req.params.userId, req.body.message)
  .then(() => {
    return db.getUser(req.params.userId)
  })
  .then(user => {
    req.viewArgs.msgSuccess = true
    req.viewArgs.user = user
    res.render('user', req.viewArgs)
  })
}