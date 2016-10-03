import recastai from 'recastai'
import request from 'superagent'
import Kik from '@kikinteractive/kik'
import http from 'http'
import config from './config.js'
import util from 'util'
import moment from 'moment'


const bot = new Kik({
  username: config.kik.username,
  apiKey: config.kik.apiKey,
  baseUrl: config.kik.baseUrl,
})
const params = {}
const perso = {}

function getRecast(message) {
  return new Promise((resolve, reject) => {
    client.textRequest(message, (res, err) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}
function callRecast(msg) {
  params.text = msg
  params.language = 'en'
  return new Promise ((resolve, reject) => {
    const req = request.post('https://api-development.recast.ai/v2/converse')
    .set('Authorization', `Token ${config.recast.request_token}`)
    .send(params)
    req.end((err, res) => {
      if (err) {
        console.log('err')
        console.log(err)
        reject(err)
      } else {
        if (params.converse_token === undefined) {
          params.converse_token = res.body.results.converse_token
        }
        resolve(res.body.results)
      }
    })
  })
}
function callNasa (info) {
  console.log('call nasa')
  let apicall = String(info)
  return new Promise ((resolve, reject) => {
    const req = request.get(apicall)
    console.log('call done')
    req.end((err, res) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        res = JSON.parse(res.text)
        resolve(res)
      }
    })
  })
}

function buttonContinu() {
  let tab = ['yes continue.', 'No don\'t continue.']
  let msg =  Kik.Message.text('More picture ?').addResponseKeyboard(tab)
  bot.send(msg,'henri.recastai')
}

function showPicture(res) {
  res = res.toLowerCase()

  callNasa('https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&camera=' + res +'&api_key=' + config.nasa.token).then(link => {
    bot.send(Kik.Message.picture(String(link.photos[1].img_src))
    .setAttributionName('NASA')
    .setAttributionIcon('http://wallpapercave.com/wp/gScmGae.png'),
    'henri.recastai')
    buttonContinu()
  })
}

function buttonPicture () {
  let tab = ['FHAZ','NAVCAM','MAST','CHEMCAM','RHAZ']
  let msg =  Kik.Message.text('wich camera you like to see ?').addResponseKeyboard(tab)
  bot.send(msg,'henri.recastai')
}

function buttonApodinfo () {
  let tab = ['info on the picture', 'picture of the day before']
  let msg =  Kik.Message.text('what would you like to do ?').addResponseKeyboard(tab)
  bot.send(msg,'henri.recastai')
}

function apodImage(res, a) {
  console.log(res)
  let tab = res.split('T')
  perso.time = tab[0]
  callNasa('https://api.nasa.gov/planetary/apod?date='+ tab[0]+'&hd=true&api_key=' + config.nasa.token).then(link => {
    if (a === true ) {
      console.log('avant le message')
      bot.send(Kik.Message.text(String(link.explanation)),'henri.recastai')
      buttonApodinfo()

    }
    else {
    bot.send(Kik.Message.picture(String(link.url))
    .setAttributionName('NASA')
    .setAttributionIcon('http://wallpapercave.com/wp/gScmGae.png'),
    'henri.recastai')
    buttonApodinfo()
    }
  })
}

bot.updateBotConfiguration()

bot.onTextMessage((message) => {

  if (message.body=== 'FHAZ' || message.body=== 'NAVCAM'
  || message.body=== 'CHEMCAM' || message.body=== 'RHAZ' || message.body=== 'MAST') {
    showPicture(message.body)
  } else if(message.body === 'yes continue.') {
    buttonPicture()
  } else if (message.body === 'picture of the day before' || message.body === 'info on the picture') {
    if (message.body === 'picture of the day before') {
    let newTime = moment(perso.time)
    let a  = newTime.subtract(6, 'day')
    apodImage(a.format(), false)
  } else {
    apodImage(perso.time, true)
  }
  }
  else {
    console.log(message.body)
    callRecast(message.body).then((res) => {
      res.replies.forEach(send => {
        message.reply(send)
      })
      if(res.action != null && res.action.done === true) {
        if (res.action.slug === 'mars-rover') {
        buttonPicture()
        }
        if (res.action.slug === 'apod') {
          apodImage(res.memory.date.time, false)
        }
    }
    })
  }
})

let server = http
.createServer(bot.incoming())
.listen(process.env.PORT || 8080)
