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

        if (option.dataset.disabled === 'true') return;
        
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

  // 등록 폼 유효성 검사 (alert 방식)
  const registerForm = document.querySelector('.form');
  registerForm?.addEventListener('submit', (e) => {
    const fruitType = document.getElementById('selectedFruitType');
    const quantity = registerForm.querySelector('input[name="quantity"]');

    if (!fruitType.value) {
      alert('등록할 과일 종류를 선택해주세요!');
      e.preventDefault();
      return;
    }

    if (!quantity.value || Number(quantity.value) < 1) {
      alert('과일 수량을 1 이상으로 입력해주세요!');
      e.preventDefault();
      return;
    }
  });

  // D-Day 계산
  document.querySelectorAll('.d-day').forEach(el => {
    const dateStr = el.getAttribute('data-registered');
    if (!dateStr) return;

    const regDateOnly = new Date(dateStr);
    regDateOnly.setHours(0, 0, 0, 0);

    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    const expireDate = new Date(regDateOnly);
    expireDate.setDate(expireDate.getDate() + 30);

    const dday = Math.floor((expireDate - todayDateOnly) / (1000 * 60 * 60 * 24));
    el.textContent = `D-${dday}`;
  });

  // URL 쿼리 기반 알림 처리
  const qs = window.location.search;

  if (qs.includes('cancelSuccess=true')) {
    alert('등록이 취소되었습니다');
  } else if (qs.includes('error=not_enough')) {
    alert('보유하신 과일이 부족합니다');
  } else if (qs.includes('error=exchange_limit')) {
    alert('하루에 최대 3번까지만 교환 요청할 수 있습니다.');
  } else if (qs.includes('error=already_exchanged')) {
    alert('이미 교환된 과일입니다.');
  } else if (qs.includes('error=server')) {
    alert('요청 처리 중 오류가 발생했습니다.');
  } else if (qs.includes('success=exchange')) {
    alert('교환이 완료되었습니다!');
  }

  // URL 정리 (알림 후 주소 깔끔하게 유지)
  history.replaceState(null, '', '/market');
});
