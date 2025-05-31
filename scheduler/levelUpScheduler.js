const cron = require('node-cron');
const { promisePool } = require('../db/db');

// 매일 새벽 3시에 실행 (테스트용으로는 매분마다 * * * * * 사용 가능)
cron.schedule('0 3 * * *', async () => {
  console.log('[cron] 쉬어가기 사용자 체크 중...');

  try {
    const [users] = await promisePool.query(`
      SELECT user_id FROM level_option
      WHERE selected_option = 'WAIT' AND selected_date <= DATE_SUB(NOW(), INTERVAL 3 DAY)
    `);

    for (const user of users) {
      const userId = user.user_id;

      await promisePool.query(`
        UPDATE user SET level = level + 1 WHERE user_id = ?
      `, [userId]);

      await promisePool.query(`
        DELETE FROM level_option WHERE user_id = ?
      `, [userId]);

      console.log(`[cron] user_id=${userId} → 레벨업 완료`);
    }
  } catch (err) {
    console.error('[cron] 쉬어가기 처리 실패:', err);
  }
});

