const marketService = require('../services/marketService');

exports.getMarketMain = async (req, res) => {
  const userId = req.user.user_id;
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
    res.redirect('/market?error=server');
  }
};

exports.registerFruit = async (req, res) => {
  const { itemTypeId, quantity } = req.body;
  const userId = req.user.user_id;

  if (!itemTypeId || !quantity) {
    return res.redirect('/market?error=server');
  }

  try {
    await marketService.registerFruit(userId, itemTypeId, Number(quantity));
    res.redirect('/market');
  } catch (err) {
    console.error('[POST /market/register] 과일 등록 오류:', err.message);

    if (err.message.includes('보관함에 과일이 부족합니다')) {
      return res.redirect('/market?error=not_enough');
    }

    res.redirect('/market?error=server');
  }
};

exports.exchangeFruit = async (req, res) => {
  const userId = req.user.user_id;
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

    res.redirect('/market?error=server');
  }
};

exports.cancelRegistration = async (req, res) => {
  const userId = req.user.user_id;
  const { registrationId } = req.params;

  try {
    await marketService.cancelRegistration(userId, registrationId);
    res.redirect('/market?cancelSuccess=true');
  } catch (err) {
    console.error('[POST /market/cancel] 등록 취소 오류:', err);
    res.redirect('/market?error=server');
  }
};