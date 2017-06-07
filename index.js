const express = require('express')
const hbs = require('express-handlebars')
const pathJoin = require('path').join
const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const bodyparser = require('body-parser')

const viewRouter = require('./view-router.js')
const db = require('./db')


const app = express()

app.engine('handlebars', hbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')

app.use(session({
  store: new SQLiteStore,
  secret: process.env.COOKIE_SECRET || 'nothing',
  cookie: {maxAge: 24 * 60 * 60 * 1000},
  saveUninitialized: false,
  resave: true
}))

app.use(bodyparser.urlencoded({extended: false}))
app.use(bodyparser.json())

app.use('/static', express.static(pathJoin(__dirname, 'static')))
app.use((req, res, next) => {
  if (!req.session.loggedIn && req.url != '/login' && req.url != '/createuser' && req.url != '/loginuser')
    res.redirect('/login')
  else
    next()
})
app.use((req, res, next) => {
  req.viewArgs = {loggedIn: !!req.session.loggedIn}
  next()
})
app.use('/', viewRouter)

app.listen(process.env.PORT || 8000)