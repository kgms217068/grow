require('dotenv').config();
const mysql = require('mysql2/promise');

async function alterCommentDateColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('🛠 `comment.creation_date` 컬럼을 DATETIME으로 변경합니다...\n');

    // 변경 전 정보 확인
    const [before] = await connection.execute(`SHOW COLUMNS FROM comment LIKE 'creation_date'`);
    console.log('🔍 변경 전:', before[0]);

    // 컬럼 타입 변경
    await connection.execute(`
      ALTER TABLE comment
      MODIFY COLUMN creation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('\n✅ 컬럼 타입 변경 완료!\n');

    // 변경 후 정보 확인
    const [after] = await connection.execute(`SHOW COLUMNS FROM comment LIKE 'creation_date'`);
    console.log('🔍 변경 후:', after[0]);

  } catch (error) {
    console.error('❌ 컬럼 변경 실패:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔌 DB 연결 종료');
  }
}

alterCommentDateColumn();