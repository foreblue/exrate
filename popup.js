document.addEventListener('DOMContentLoaded', function() {
  // 여기에 팝업이 열릴 때 실행될 코드를 작성합니다
  console.log('Extension popup opened');
  
  // 예시: content div에 메시지 추가
  const contentDiv = document.getElementById('content');
  contentDiv.textContent = '익스텐션이 성공적으로 로드되었습니다!';
});

// DOM 요소 가져오기
const baseCurrencySelect = document.getElementById('base-currency');
const targetCurrencySelect = document.getElementById('target-currency');
const amountInput = document.getElementById('amount');
const convertedAmountSpan = document.getElementById('converted-amount');
const exchangeRateSpan = document.getElementById('exchange-rate');
const updateTimeSpan = document.getElementById('update-time');
const errorMessageDiv = document.getElementById('error-message');
const swapButton = document.getElementById('swap-currencies');
const baseCurrencyLabel = document.getElementById('base-currency-label');
const targetCurrencyLabel = document.getElementById('target-currency-label');
const addFavoriteButton = document.getElementById('add-favorite');
const favoritesList = document.getElementById('favorites-list');

// 즐겨찾기 목록 관리
let favorites = [];

// 즐겨찾기 목록 로드
async function loadFavorites() {
  try {
    const result = await chrome.storage.local.get('favorites');
    favorites = result.favorites || [];
    renderFavorites();
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
}

// 즐겨찾기 목록 저장
async function saveFavorites() {
  try {
    await chrome.storage.local.set({ favorites });
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
}

// 즐겨찾기 목록 렌더링
function renderFavorites() {
  favoritesList.innerHTML = '';
  favorites.forEach((favorite, index) => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.textContent = `${favorite.fromCurrency}/${favorite.toCurrency}`;
    
    // 즐겨찾기 항목 클릭 시 해당 통화쌍으로 변경
    item.addEventListener('click', () => {
      baseCurrencySelect.value = favorite.fromCurrency;
      targetCurrencySelect.value = favorite.toCurrency;
      fetchAndUpdateExchangeRate();
    });

    // 삭제 버튼 추가
    const deleteButton = document.createElement('span');
    deleteButton.textContent = '×';
    deleteButton.style.marginLeft = '8px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      favorites.splice(index, 1);
      saveFavorites();
      renderFavorites();
    });
    
    item.appendChild(deleteButton);
    favoritesList.appendChild(item);
  });
}

// 즐겨찾기 추가
function addToFavorites() {
  const fromCurrency = baseCurrencySelect.value;
  const toCurrency = targetCurrencySelect.value;

  // 이미 존재하는지 확인
  const exists = favorites.some(
    fav => fav.fromCurrency === fromCurrency && fav.toCurrency === toCurrency
  );

  if (exists) {
    showError('이미 즐겨찾기에 추가되어 있습니다.');
    return;
  }

  // 최대 5개까지만 저장
  if (favorites.length >= 5) {
    showError('즐겨찾기는 최대 5개까지만 저장할 수 있습니다.');
    return;
  }

  favorites.push({ fromCurrency, toCurrency });
  saveFavorites();
  renderFavorites();
}

// 환율 계산 함수
function calculateExchange(amount, rate) {
  if (isNaN(amount) || isNaN(rate) || rate === 0) {
    return '0.00';
  }
  return (amount * rate).toFixed(2);
}

// UI 업데이트 함수
function updateUI(data, amount) {
  const { rate, fromCurrency, toCurrency, timestamp } = data;
  const converted = calculateExchange(amount, rate);

  exchangeRateSpan.textContent = `1 ${fromCurrency} = ${rate.toFixed(2)} ${toCurrency}`;
  convertedAmountSpan.textContent = converted;
  updateTimeSpan.textContent = new Date(timestamp).toLocaleString();
  baseCurrencyLabel.textContent = fromCurrency;
  targetCurrencyLabel.textContent = toCurrency;
  errorMessageDiv.classList.remove('show');
  errorMessageDiv.textContent = '';
}

// 에러 메시지 표시 함수
function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.classList.add('show');
}

// 환율 정보 요청 및 UI 업데이트 함수
async function fetchAndUpdateExchangeRate() {
  const baseCurrency = baseCurrencySelect.value;
  const targetCurrency = targetCurrencySelect.value;
  const amount = parseFloat(amountInput.value) || 0;

  if (baseCurrency === targetCurrency) {
    showError('기준 통화와 대상 통화는 같을 수 없습니다.');
    updateUI({ rate: 1, fromCurrency: baseCurrency, toCurrency: targetCurrency, timestamp: new Date().toISOString() }, amount);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EXCHANGE_RATE',
      fromCurrency: baseCurrency,
      toCurrency: targetCurrency
    });

    if (response && response.success) {
      updateUI(response.data, amount);
      console.log('Exchange rate updated from', response.source, response.data);
    } else {
      throw new Error(response.error || '알 수 없는 에러가 발생했습니다.');
    }
  } catch (error) {
    console.error('Error fetching or updating exchange rate:', error);
    showError(error.message || '환율 정보를 가져오는데 실패했습니다.');
  }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
  // 즐겨찾기 목록 로드
  loadFavorites();
  
  // 초기 환율 조회
  fetchAndUpdateExchangeRate();

  // 통화 선택 변경 시 업데이트
  baseCurrencySelect.addEventListener('change', fetchAndUpdateExchangeRate);
  targetCurrencySelect.addEventListener('change', fetchAndUpdateExchangeRate);
  
  // 금액 입력 시 업데이트
  amountInput.addEventListener('input', () => {
    const base = baseCurrencySelect.value;
    const target = targetCurrencySelect.value;
    const currentRateText = exchangeRateSpan.textContent;
    const match = currentRateText.match(/1\s*\w+\s*=\s*([\d,.]+)\s*\w+/);
    if(match && match[1]){
      const rate = parseFloat(match[1].replace(/,/g, ''));
      const amount = parseFloat(amountInput.value) || 0;
      const converted = calculateExchange(amount, rate);
      convertedAmountSpan.textContent = converted;
      baseCurrencyLabel.textContent = base;
      targetCurrencyLabel.textContent = target;
    } else {
      fetchAndUpdateExchangeRate();
    }
  });

  // 통화 교환 버튼 클릭 시
  swapButton.addEventListener('click', () => {
    const temp = baseCurrencySelect.value;
    baseCurrencySelect.value = targetCurrencySelect.value;
    targetCurrencySelect.value = temp;
    fetchAndUpdateExchangeRate();
  });

  // 즐겨찾기 추가 버튼 클릭 시
  addFavoriteButton.addEventListener('click', addToFavorites);
}); 