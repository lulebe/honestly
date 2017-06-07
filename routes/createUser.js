const db = require('../db')

module.exports = (req, res) => {
  if (!req.body.username || !req.body.password || req.body.username.length < 1 || req.body.password.length < 1) {
    req.viewArgs.hasError = true
    req.viewArgs.error = 'Please provide a username and password.'
    return res.render('login', req.viewArgs)
  }
  db.createUser(req.body.username, req.body.password)
  .then(user => {
    req.session.loggedIn = true
    req.session.userid = user.id
    req.session.pwhash = user.pwhash
    res.redirect('/')
  })
  .catch(err => {
    console.log(err)
    req.viewArgs.hasError = true
    req.viewArgs.error = err.message
    return res.render('login', req.viewArgs)
  })
}