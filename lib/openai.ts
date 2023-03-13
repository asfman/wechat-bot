import { Configuration, OpenAIApi } from 'openai'

export async function fetch(openai: OpenAIApi, messages: any[], onMessage: (data: any) => void, stream: boolean = false): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const res: any = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      stream,
    }, stream ? { responseType: 'stream' } : {});
    if (stream) {
      let promiseChain = Promise.resolve();
      res.data.on('data', (chunk: ArrayBuffer) => {
        let data = new TextDecoder().decode(chunk);
        let chunks = data.trim().split(/\n+/);
        chunks.forEach((data) => {
          data = data.trim().replace(/^data:\s*/, '');
          promiseChain = promiseChain.then(() => {
            return new Promise(async (rsv) => {
              if (data === '[DONE]') {
                console.log(data);
                resolve();
                return;
              }
              await onMessage(data);
              rsv();
            });
          });
        });
      });
    } else {
      console.log('no stream');
      onMessage(res.data);
      resolve();
    }
  });
}

export async function fetchSSE(openai: OpenAIApi, messages: any[], onMessage: (data: any) => void, stream: boolean = false): Promise<void>  {
  return new Promise(async (resolveSSE, reject) => {
    const res: any = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      stream,
    }, stream ? { responseType: 'stream' } : {});
    if (stream) {
      const { createParser } = await import('eventsource-parser');
      // promise 按序执行
      let promiseChain = Promise.resolve();
      const parser = createParser((event) => {
        if (event.type !== 'event') return;
        promiseChain = promiseChain.then(() => {
          return new Promise(async (resolve) => {
            if (event.data == '[DONE]') {
              resolveSSE();
              return;
            }
            await onMessage(event.data);
            resolve();
          });
        });
      });
      res.data.on('data', (chunk: ArrayBuffer) => {
        let data = new TextDecoder().decode(chunk);
        parser.feed(data);
      });
    } else {
      console.log('no stream');
      onMessage(res.data);
    }
  });
}
