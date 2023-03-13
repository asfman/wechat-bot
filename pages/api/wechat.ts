import type { NextApiRequest, NextApiResponse } from 'next'
import { WechatyBuilder } from 'wechaty'
import { Configuration, OpenAIApi } from 'openai'
import { fetchSSE } from '@/lib/openai'

const apiKey = process.env.OPENAI_API_KEY

if (apiKey === undefined)
  throw new Error('OPENAI_API_KEY is not defined')

const configuration = new Configuration({
  apiKey,
})
const openai = new OpenAIApi(configuration)
const wechaty = WechatyBuilder.build()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const qrcodeUrl: string = await new Promise((resolve) => {
    wechaty
      .on('scan', (qrcode, status) => {
        const qrcodeUrl = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`
        console.log(`Scan QR Code to login: ${status}\n${qrcodeUrl}`)
        resolve(qrcodeUrl)
      })
      .on('login', (user) => {
        console.log(`User ${user} logged in`)
      })
      .on('message', async (message) => {
        const talker: any = message.talker()
        const text = message.text()
        const room = message.room()
        //if (room) {
          //const topic = await room.topic()
          //console.log(`Room: ${topic} Contact: ${talker.name()} Text: ${text}`)
        //} else {
          //console.log(`Contact: ${talker.name()} Text: ${text}`)
        //}
        const permitGroupName = 'robot'
        if (room && (await room.topic()) == permitGroupName && text) {
          console.log(`in ${permitGroupName} room`)
          await fetchSSE(openai, [{ role: 'user', content: text }], async function onMessage(data: any) {
            console.log(JSON.stringify(data))
            const reply = data.choices[0].message.content
            reply && await message.say(reply.trim())
          }, false)
          return
        }
        let reResult = /\/gpt\s+(.+)\s*$/.exec(text??'')
        // message.self():  message.talker() == message.wechaty.userSelf()
        if (reResult) {
          console.log('ping', reResult[1])
          const messages = [
            { role: 'user', content: reResult[1] }
          ]
          await fetchSSE(openai, messages, async function onMessage(data: any) {
            const reply = data.choices[0].message.content
            console.log('pong', reply)
            reply && await message.say(reply.trim())
          }, false)
        }
      })
    wechaty.start()
  })
  res.redirect(qrcodeUrl)
}
