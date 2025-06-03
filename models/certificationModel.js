const { promisePool } = require('../db/db');

exports.saveCertification = async ({ mission_execution_id, user_id, image_source }) => {
  const sql = `
    INSERT INTO certification (mission_execution_id, certification_date, user_id, image_source, checked)
    VALUES (?, now(),?, ?, false)
  `;
  await promisePool.query(sql, [mission_execution_id, user_id, image_source]);
};

exports.getCertificationsByUser = async (userId) => {
  const [rows] = await promisePool.query(`
    SELECT c.certification_id, c.mission_execution_id, c.user_id, me.mission_id, c.checked
    FROM certification c
    JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
    WHERE c.user_id = ?
  `, [userId]);
  return rows;
};

exports.saveDiary = async ({ mission_execution_id, title, content, emotions }) => {
  const diarySql = `INSERT INTO diary (title, content,mission_execution_id) VALUES (?, ?, ?)`;
  const [result] = await promisePool.query(diarySql, [title, content,mission_execution_id]);

  const diaryId = result.insertId;

  const emotionSql = `INSERT INTO emotion (diary_id, emotion_tag_name) VALUES ?`;
  const emotionData = emotions.map(e => [diaryId, e]);

  await promisePool.query(emotionSql, [emotionData]);
};
