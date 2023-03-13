import axios from 'axios';

export async function sendMessage(messages: Array<{ role: string; content: string }>) {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const { data } = await axios.post(apiUrl, {
    'model': 'gpt-3.5-turbo',
    messages
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });
  console.log(data);
  return data;
}
