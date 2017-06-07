const db = require('../db')

module.exports = (req, res) => {
  db.deleteMessage(req.session.userid, req.params.messageId)
  .then(() => {
    res.redirect('/')
  })
}