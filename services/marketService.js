const { promisePool } = require('../db/db');
const marketModel = require('../models/marketModel');

function getKSTDateTimeString() {
  const date = new Date();
  const kst = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);

  return kst.replace(' ', 'T').replace('T', ' ').replaceAll('.', ':'); // → '2025-05-25 19:35:00'
}

module.exports = {
getMarketMainData: async (userId) => {
  await marketModel.deleteOldItems();
  const [fruits] = await marketModel.getMarketItems();
  const [inventory] = await marketModel.getInventoryList();

  const conn = await promisePool.getConnection();
  const [[{ count: exchangeCount }]] = await marketModel.getTodayExchangeCount(conn, userId);
  conn.release();

  const remainingExchanges = Math.max(0, 3 - exchangeCount);

  return { fruits, inventory, remainingExchanges };
},

registerFruit: async (userId, itemTypeId, quantity) => {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [[inventoryRow]] = await marketModel.getInventoryIdByUserId(conn, userId);
    const inventoryId = inventoryRow?.inventory_id;
    if (!inventoryId) throw new Error('보관함 없음');

    const [check] = await marketModel.getItemCount(conn, itemTypeId, inventoryId);

    if (!check.length) {
      throw new Error('보관함에 해당 과일이 없습니다.');
    }

    const available = Number(check[0].item_count);
    const countToDeduct = Number(quantity);

    if (available < countToDeduct) {
      throw new Error('보관함에 과일이 부족합니다.');
    }

    const registeredDate = getKSTDateTimeString(); // 예: 2025-05-25 10:31:17

    // 등록
    await marketModel.insertGrowMarketItem(conn, userId, itemTypeId, registeredDate, countToDeduct);

    const [result] = await marketModel.deductItemCount(conn, countToDeduct, itemTypeId, inventoryId);
if (result.affectedRows === 0) {
  throw new Error('과일 차감 실패: 보관함 수량 부족 또는 충돌');
}

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
,

//과일 교환 로직
exchangeFruit: async (registrationId, userId) => {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    // 오늘 교환 횟수 확인
    const [[{ count }]] = await marketModel.getTodayExchangeCount(conn, userId);
    if (count >= 3) {
      throw new Error('오늘은 교환 요청을 3번까지만 할 수 있습니다.');
    }

    // 교환 항목 가져오기
    const [[item]] = await marketModel.getGrowMarketItemByRegistrationId(conn, registrationId);
    if (!item) throw new Error('등록된 과일을 찾을 수 없습니다.');

    await marketModel.updateIsSold(conn, registrationId, userId);

    const [[{ inventory_id }]] = await marketModel.getInventoryIdByUserId(conn, userId);
    await marketModel.increaseItemCount(conn, item.item_type_id, inventory_id, item.count);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
},

 cancelRegistration: async (userId, registrationId) => {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await marketModel.getGrowMarketItemById(conn, registrationId, userId);
    if (!result.length) throw new Error('등록 항목 없음');

    const itemTypeId = result[0].item_type_id;
    const count = result[0].count;

    // growmarket에서 삭제
    await marketModel.deleteGrowMarketItem(conn, registrationId, userId);

    // ✅ user_id → inventory_id 조회
    const [[inventoryRow]] = await marketModel.getInventoryIdByUserId(conn, userId);
    const inventoryId = inventoryRow?.inventory_id;
    if (!inventoryId) throw new Error('보관함 없음');

    // ✅ 보관함 아이템 수량 증가
    await marketModel.increaseItemCount(conn, itemTypeId, inventoryId, count);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}}