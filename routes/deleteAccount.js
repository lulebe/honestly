const db = require('../db')

module.exports = (req, res) => {
  db.deleteAccount(req.session.userid)
  .then(() => {
    req.session.destroy()
    res.redirect('/login')
  })
}