const express = require('express');
const router = express.Router();
const marketService = require('../services/marketService');

// 유저 ID 추출 (없을 경우 테스트용 기본값 1)
const getUserId = (req) => req.session.user?.user_id || 1;

// 마켓 메인 화면
router.get('/', async (req, res) => {
  const userId = getUserId(req);
  const { error, success } = req.query;

  try {
    const { fruits, inventory, remainingExchanges } = await marketService.getMarketMainData(userId);

    res.render('market', {
      fruits,
      inventory,
      remainingExchanges,
      user: { user_id: userId },
      error,
      success
    });
  } catch (err) {
    console.error('[GET /market] 마켓 메인 로딩 오류:', err);
    res.status(500).send('마켓 정보를 불러오는 데 실패했습니다.');
  }
});

// 과일 등록
router.post('/register', async (req, res) => {
  const { itemTypeId, quantity } = req.body;
  const userId = getUserId(req);

  if (!itemTypeId || !quantity) {
    return res.status(400).send('과일 종류와 수량을 입력해주세요.');
  }

  try {
    await marketService.registerFruit(userId, itemTypeId, Number(quantity));
    res.redirect('/market');
  } catch (err) {
    console.error('[POST /market/register] 과일 등록 오류:', err.message);

    if (err.message.includes('보관함에 과일이 부족합니다')) {
      return res.redirect('/market?error=not_enough');
    }

    res.status(500).send('과일 등록 중 오류가 발생했습니다.');
  }
});

// 교환 요청
router.post('/exchange/:registrationId', async (req, res) => {
  const userId = getUserId(req);
  const { registrationId } = req.params;

  try {
    await marketService.exchangeFruit(registrationId, userId);
    res.redirect('/market?success=exchange');
  } catch (err) {
    console.error('[POST /market/exchange] 교환 처리 오류:', err.message);

    if (err.message.includes('3번까지만')) {
      return res.redirect('/market?error=exchange_limit');
    }

    if (err.message.includes('이미 교환된')) {
      return res.redirect('/market?error=already_exchanged');
    }

    res.status(500).send('교환 요청 처리 중 오류가 발생했습니다.');
  }
});

// 등록 취소
router.post('/cancel/:registrationId', async (req, res) => {
  const userId = getUserId(req);
  const { registrationId } = req.params;

  try {
    await marketService.cancelRegistration(userId, registrationId);
    res.redirect('/market?cancel=1');
  } catch (err) {
    console.error('[POST /market/cancel] 등록 취소 오류:', err);
    res.status(500).send('등록 취소 중 오류가 발생했습니다.');
  }
});

module.exports = router;
