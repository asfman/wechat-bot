import axios from 'axios';

export async function getSymbolPrice(symbol: string): Promise<string> {
  try {
    const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
    if (response.status === 200) {
      const price = parseFloat(response.data.price);
      return `${symbol}的当前价格为：${price}`;
    }
    return `response status: ${response.status}`;
  } catch (error: any) {
    let errMsg = '';
    if (error.response && error.response.status === 400) {
      const responseData = error.response.data;
      errMsg = `请求失败：错误代码 ${responseData.code}，错误消息：${responseData.msg}`;
    } else {
      errMsg = `获取${symbol}的价格时出错：` + error.message;
    }
    return errMsg;
  }
}
