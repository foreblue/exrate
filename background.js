// 백그라운드에서 실행될 코드
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// 여기에 필요한 이벤트 리스너나 백그라운드 작업을 추가할 수 있습니다 