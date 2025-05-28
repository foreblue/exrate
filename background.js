// 백그라운드에서 실행될 코드
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// 여기에 필요한 이벤트 리스너나 백그라운드 작업을 추가할 수 있습니다 

// 환율 정보 캐시 (메모리 내 저장)
let exchangeRateCache = {
  data: null, // { rate, fromCurrency, toCurrency, timestamp }
  timestamp: null,
  expiry: 5 * 60 * 1000 // 5분
};

// 네이버 금융에서 환율 정보 가져오기
async function fetchExchangeRateFromNaver(fromCurrency, toCurrency) {
  console.log(`Fetching exchange rate for ${fromCurrency} to ${toCurrency}`);
  const url = `https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_${fromCurrency}${toCurrency}&page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    
    // 환율 정보가 있는 td 요소 찾기
    const rateMatch = text.match(/<td class="num">([\d,.]+)<\/td>/);
    if (rateMatch && rateMatch[1]) {
      const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
      if (isNaN(rate)) {
        throw new Error('Failed to parse rate from Naver HTML (NaN)');
      }
      console.log("Rate found:", rate);
      return {
        rate,
        fromCurrency,
        toCurrency,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Could not find rate element in Naver HTML');
    }
  } catch (error) {
    console.error('Error fetching exchange rate from Naver:', error);
    throw error;
  }
}

// 팝업으로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_EXCHANGE_RATE') {
    const { fromCurrency, toCurrency } = request;
    console.log(`Message received: GET_EXCHANGE_RATE for ${fromCurrency} to ${toCurrency}`);

    if (exchangeRateCache.data &&
        exchangeRateCache.data.fromCurrency === fromCurrency &&
        exchangeRateCache.data.toCurrency === toCurrency &&
        exchangeRateCache.timestamp &&
        (Date.now() - exchangeRateCache.timestamp < exchangeRateCache.expiry)) {
      console.log('Returning cached data:', exchangeRateCache.data);
      sendResponse({ success: true, data: exchangeRateCache.data, source: 'cache' });
      return false;
    }

    fetchExchangeRateFromNaver(fromCurrency, toCurrency)
      .then(data => {
        exchangeRateCache.data = data;
        exchangeRateCache.timestamp = Date.now();
        console.log('API call successful, returning data:', data);
        sendResponse({ success: true, data, source: 'api' });
      })
      .catch(error => {
        console.error('API call failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  return false;
});

console.log('Background script loaded.'); 