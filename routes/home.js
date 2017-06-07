const db = require('../db')

module.exports = (req, res) => {
  db.getUser(req.session.userid)
  .then(user => {
    req.viewArgs.userName = user.name
    return db.getMessages(req.session.userid, req.session.pwhash)
  })
  .then(msgs => {
    req.viewArgs.messages = msgs
    res.render('home', req.viewArgs)
  })
}