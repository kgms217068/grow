// /public/js/market.js

function confirmCancel() {
  return confirm('정말로 등록을 취소하시겠습니까?');
}

document.addEventListener('DOMContentLoaded', () => {
  const selectWrapper = document.querySelector('.custom-select-wrapper');
  const trigger = selectWrapper?.querySelector('.custom-select-trigger');
  const options = selectWrapper?.querySelectorAll('.custom-option');
  const hiddenInput = document.getElementById('selectedFruitType');

  if (trigger && options && hiddenInput) {
    trigger.addEventListener('click', () => {
      selectWrapper.classList.toggle('open');
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        const label = option.textContent;
        hiddenInput.value = value;
        trigger.textContent = label;
        selectWrapper.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!selectWrapper.contains(e.target)) {
        selectWrapper.classList.remove('open');
      }
    });
  }

  // 알림 처리
  if (window.location.search.includes('cancelSuccess=true')) {
    alert('등록이 취소되었습니다');
    history.replaceState(null, '', '/market');
  }
  if (window.location.search.includes('error=not_enough')) {
    alert('보유하신 과일이 부족합니다');
    history.replaceState(null, '', '/market');
  }
  if (window.location.search.includes('error=exchange_limit')) {
    alert('하루에 최대 3번까지만 교환 요청할 수 있습니다.');
    history.replaceState(null, '', '/market');
  }
  if (window.location.search.includes('success=exchange')) {
    alert('교환이 완료되었습니다!');
    history.replaceState(null, '', '/market');
  }
});