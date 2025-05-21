const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });

    const [columns] = await connection.query('DESCRIBE item');

    console.log('📋  테이블 구조:');
    columns.forEach(col => {
      console.log(`${col.Field} (${col.Type}) | Null: ${col.Null} | Key: ${col.Key} | Default: ${col.Default}`);
    });

    await connection.end();
  } catch (err) {
    console.error('❌ 테이블 구조 조회 실패:', err.message);
  }
})();
