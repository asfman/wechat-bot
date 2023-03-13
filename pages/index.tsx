import { useRef, useState, useEffect } from 'react'
import clsx from 'clsx'
import Logo from '@/components/openai_logo'
import SendIcon from '@/components/send_icon'
import LoadingLogo from '@/components/loading_logo'
import { streamAsyncIterable } from '@/lib/stream-async-iterable'

let abortController = new AbortController()

export default function OpenApi() {
  const [ conversation, setConversation ] = useState(false)
  const [ stream, setStream] = useState(true)
  const [ text, setText ] = useState('')
  const [ results, setResults ] = useState<any[]>([])
  const [ loading, setLoading ] = useState(false)

  const divRef = useRef<HTMLDivElement>(null)

  const scrollToTop = () => {
    if (!divRef.current) return
    divRef.current.scroll({
      top: divRef.current.scrollHeight,
      behavior: "smooth"
    })
  }

  const streamHandler = () => {
    setStream(!stream)
  }

  const cancelHandler = () => {
    abortController.abort()
    abortController = new AbortController()
    setLoading(false)
  }

  const sendMessage = () => {
    if (loading) return
    if (text === '') return

    const result = { text: '', inputText: text, createdAt: Date.now() }
    let newResults = [ ...results, result ]
    setResults(newResults)
    setText('')
    setTimeout(() => scrollToTop())

    let messages: any[] = []
    if (!conversation) {
      messages = [ { role: 'user', content: text } ]
    } else {
      newResults.forEach(result => {
        messages.push({
          role: 'user',
          content: result.inputText
        })
        if (result.text)
        messages.push({
          role: 'assistant',
          content: result.text
        })
      })
    }
    console.log(JSON.stringify(messages))
    const data = { messages, stream }
    const fetchData = async () => {
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: abortController.signal
      })
      for await (const chunk of streamAsyncIterable(res.body!)) {
        // sometimes return multi chunks
        let str = new TextDecoder().decode(chunk)
        const lines = str.split("\n\n").filter(item => item != '')
        str = lines.pop()??'null'
        console.log(str)
        console.log('-'.repeat(33))
        try {
          const result = JSON.parse(str.trim())
          if (!result) continue
          newResults = newResults.map((message) => {
            if(!message.id || message.id === result.id) {
              return { ...message, ...result }
            }
            return message
          })
          setResults(newResults)
          setTimeout(() => scrollToTop())
        } catch(err) {
          console.error(err)
          console.log(str)
        }
      }
      newResults = newResults.map((result, index) => {
        if (index === newResults.length - 1)
          return { ...result, done: true }
        return result
      })
      setResults(newResults)
    }
    setLoading(true)
    fetchData().catch(console.error).finally(() => setLoading(false))
  }

  const submitHandler = () => {
    sendMessage()
  }

  const keyDownHandler = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(event.code === 'Enter' && (event.ctrlKey || event.metaKey))
      sendMessage()
  }

  const changeHandler = (event: any) => {
    setText(event.target.value)
  }

  const reset = () => {
    setResults([])
  }

  const conversationHandler = () => {
    reset()
    setConversation(!conversation)
  }


  return <>
      <main className="h-screen flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-end">
            <input type="checkbox" checked={conversation} onChange={ conversationHandler }  name="conversation" className="align-middle mr-2" />
            <label htmlFor="conversation">conversation</label>

            <input type="checkbox" checked={stream} onChange={ streamHandler }  name="stream" className="align-middle mr-2 ml-2" />
            <label htmlFor="stream">stream</label>
        </div>
        <div ref={divRef} className="grow overflow-y-auto h-full rounded-md shadow box-border m-6 preview border-base-300 bg-base-200 divide-y">
          {
            results.map((result, index) => {
              return <div key={index} className="chat-wrapper p-10">
                <div className="chat-header">
                  <strong>me</strong>
                  <time className="text-xs opacity-50 ml-2">{new Intl.DateTimeFormat("af").format(new Date(result.createdAt)) + ' ' +  new Date(result.createdAt).toLocaleTimeString()}</time>
                </div>
                <div className="mt-3 text-slate-500">
                  {result.inputText}
                </div>
              <div className="chat chat-start mt-6">
                <div className="chat-image avatar mr-3">
                  <Logo className="w-[30px] h-[30px] rounded-lg bg-emerald-600 text-white" />
                </div>
                <div className="chat-bubble">
                  { result.created &&
                  <time className="text-xs opacity-50 ml-2">{new Intl.DateTimeFormat("af").format(new Date(result.created*1000)) + ' ' +  new Date(result.created*1000).toLocaleTimeString()}</time>
                  }
                  <pre className={clsx('p-3 overflow-auto', result.text.trim().indexOf('\n') === -1 ? 'whitespace-normal': '', !result.done ? 'result' : '')}>
                  {result.text.replace(/^\n{1,}/, '')}
                </pre>
</div>
              </div>
            </div>
            })
          }
        </div>
        { loading &&
        <div className="flex items-center justify-center">
          <span className="underline cursor-pointer text-blue-600" onClick={() => cancelHandler()}>stop</span>
        </div>
        }
        <div className="relative m-6 shrink-0">
          <textarea onKeyDown={ keyDownHandler } rows={3} className="border box-border p-4 pr-20 focus:outline-none resize-none rounded-md w-full rounded-md shadow-md text-lg" value={text} onChange={ changeHandler }></textarea>
          <div onClick={ submitHandler } className={ clsx('absolute right-8 -translate-y-1/2 top-1/2 w-10 h-10 text-xl rounded-full bg-emerald-400 flex items-center justify-center text-white', loading ? 'bg-slate-200': 'cursor-pointer') }>
            { !loading ?
            <SendIcon />
            :
            <LoadingLogo />
          }
          </div>
        </div>
      </main>
  </>
}

