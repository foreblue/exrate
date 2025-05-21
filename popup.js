document.addEventListener('DOMContentLoaded', function() {
  // 여기에 팝업이 열릴 때 실행될 코드를 작성합니다
  console.log('Extension popup opened');
  
  // 예시: content div에 메시지 추가
  const contentDiv = document.getElementById('content');
  contentDiv.textContent = '익스텐션이 성공적으로 로드되었습니다!';
}); 