const sqlite = require('sqlite3')
const Promise = require('bluebird')
const exec = require('child_process').execSync
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const crypto2 = require('crypto2')

module.exports = {
  createUser,
  loginUser,
  getUser,
  listOtherUsers,
  createMessage,
  getMessages,
  deleteMessage,
  deleteAccount,
  encryptMsg
}

if (!fs.existsSync(path.join(__dirname, 'data.db'))) {
  exec('cp ' + path.resolve(__dirname, 'template.db') + ' ' + path.resolve(__dirname, 'data.db'))
}

const db = new sqlite.Database('data.db')

function createUser (username, password) {
  let hashedPw = null
  let bcryptPw = null
  let privKey = null
  let pubKey = null
  return Promise.fromNode(cb => db.get('SELECT * FROM users WHERE name = ?', username, cb))
  .then(userExists => {
    if (userExists)
      return Promise.reject(new Error('User exists already.'))
  })
  .then(() => {
    return Promise.fromNode(cb => bcrypt.hash(password, 10, cb))
  })
  .then(hp => {
    bcryptPw = hp
    return new Promise((resolve, reject) => {
      crypto2.createKeyPair((err, priv, pub) => {
        if (err)
          reject(err)
        pubKey = pub
        const pwhasher = crypto.createHash('sha256')
        pwhasher.update(password)
        hashedPw = pwhasher.digest('base64')
        const cipher = crypto.createCipher('aes-256-cbc', hashedPw)
        privKey = cipher.update(priv, 'utf-8', 'base64')
        privKey += cipher.final('base64')
        resolve()
      })
    })
  })
  .then(() => {
    return Promise.fromNode(cb => db.run('INSERT INTO users (name, password, pubkey, privkey) VALUES (?, ?, ?, ?)', username, bcryptPw, pubKey, privKey, function (err) {
      if (err)
        cb(err)
      else
        cb(null, this.lastID)
    }))
  })
  .then(lastId => {
    return Promise.fromNode(cb => db.get('SELECT * FROM users WHERE id = ?', lastId, (err, user) => {
      if (err)
        cb(err)
      user.pwhash = hashedPw
      cb(null, user)
    }))
  })
}


function loginUser (username, password) {
  let hashedPw = null
  let user = null
  return Promise.fromNode(cb => db.get('SELECT * FROM users WHERE name = ?', username, cb))
  .then(u => {
    if (!u)
      return Promise.reject(new Error('User was not found.'))
    user = u
    return Promise.fromNode(cb => bcrypt.compare(password, user.password, cb))
  })
  .then(pwcheckresult => {
    if (!pwcheckresult)
      return Promise.reject(new Error('Password is incorrect.'))
    const pwhasher = crypto.createHash('sha256')
    pwhasher.update(password)
    user.pwhash = pwhasher.digest('base64')
    return Promise.resolve(user)
  })
}

function getUser (userid) {
  return Promise.fromNode(cb => db.get('SELECT * FROM users WHERE id = ?', userid, cb))
}

function listOtherUsers (userid) {
  return Promise.fromNode(cb => db.all('SELECT * FROM users WHERE id != ?', userid, cb))
}

function createMessage (userid, message) {
  return Promise.fromNode(cb => db.get('SELECT * FROM users WHERE id = ?', userid, cb))
  .then(user => {
    const key = user.pubkey
    return encryptMsg(key, message)
  })
  .then(encmsg => {
    return Promise.fromNode(cb => db.run('INSERT INTO messages (toUser, content) VALUES (?, ?)', userid, encmsg, cb))
  })
}

function getMessages (userid, pwkey) {
  let privKey = null
  let msgs = []
  return Promise.fromNode(cb => db.get('SELECT * FROM users WHERE id = ?', userid, cb))
  .then(user => {
    const decipher = crypto.createDecipher('aes-256-cbc', pwkey)
    privKey = decipher.update(user.privkey, 'base64', 'utf-8')
    privKey += decipher.final('utf-8')
    return Promise.resolve()
  })
  .then(() => {
    return Promise.fromNode(cb => db.all('SELECT * FROM messages WHERE toUser = ?', userid, cb))
  })
  .then(encmsgs => {
    return Promise.mapSeries(encmsgs, msg => {
      return decryptMsg(privKey, msg)
      .then(decmsg => {
        msgs.push(decmsg)
      })
    })
  })
  .then(() => {
    return Promise.resolve(msgs)
  })
}

function deleteMessage (userid, messageid) {
  return Promise.fromNode(cb => db.run('DELETE FROM messages WHERE id = ? AND toUser = ?', messageid, userid, cb))
}

function deleteAccount (userid) {
  return Promise.fromNode(cb => db.run('DELETE FROM users WHERE id = ?', userid, cb))
  .then(() => {
    return Promise.fromNode(cb => db.run('DELETE FROM messages WHERE toUser = ?', userid, cb))
  })
}



function encryptMsg (key, msg) {
  let encmsg = ''
  const msgBuf = Buffer.from(msg, 'utf-8')
  return Promise.mapSeries(splitBuffer(msgBuf), buf => {
    return Promise.fromNode(cb => crypto2.encrypt.rsa(buf.toString('utf-8'), key, (err, encrypted) => {
      if (err)
        cb(err)
      encmsg += encrypted + '++++-++-++++'
      cb(null)
    }))
  })
  .then(() => {
    return Promise.resolve(encmsg)
  })
}

function decryptMsg (key, msg) {
  const parts = msg.content.split('++++-++-++++').filter(i => i.length > 0)
  msg.content = ''
  return Promise.mapSeries(parts, part => {
    return Promise.fromNode(cb => crypto2.decrypt.rsa(part, key, (err, decrypted) => {
      if (err)
        cb(err)
      msg.content += decrypted
      cb(null)
    }))
  })
  .then(() => {
    return Promise.resolve(msg)
  })
}

function splitBuffer (buf) {
  let tooLong = buf.length > 215
  if (!tooLong)
    return [buf]
  const buffers = []
  let lastStart = 0
  for (let i = 0; i < Math.floor(buf.length/215); i++) {
    buffers.push(buf.slice(i*215, i*215+214))
    lastStart = i*215+215
  }
  buffers.push(buf.slice(lastStart))
  return buffers
}