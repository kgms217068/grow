// models/missionModel.js
const { promisePool } = require('../db/db');

exports.getAllMissions = async () => {
  const [rows] = await promisePool.query('SELECT * FROM mission ORDER BY mission_id');
  return rows;
};

exports.getAllMissionsWithStatus = async (userId) => {
  const sql = `
    SELECT m.*, 
           me.mission_execution_id, 
           c.checked
    FROM mission m
    LEFT JOIN mission_execution me ON m.mission_id = me.mission_id AND me.user_id = ?
    LEFT JOIN certification c ON me.mission_execution_id = c.mission_execution_id
    ORDER BY m.mission_id ASC
  `;
  const [rows] = await promisePool.query(sql, [userId]);
  return rows;
};
exports.getMissionsForUser = async (userId) => {
  const sql = `
    SELECT m.*, me.mission_execution_id, c.checked
    FROM mission_execution me
    JOIN mission m ON m.mission_id = me.mission_id
    LEFT JOIN certification c ON me.mission_execution_id = c.mission_execution_id
    WHERE me.user_id = ?
    ORDER BY m.mission_id ASC
  `;
  const [rows] = await promisePool.query(sql, [userId]);
    console.log("rows:",rows);
  return rows;

};

exports.assignInitialMissionsToUser = async (userId) => {
  // 예: 모든 mission_id 중에서 1단계(step=1) 또는 가장 기본 미션만 할당
  const [missions] = await promisePool.query(
    `SELECT mission_id FROM mission WHERE level = 1`
  );

  const insertQueries = missions.map((mission) =>
    promisePool.query(
      `INSERT INTO mission_execution (user_id, mission_id) VALUES (?, ?)`,
      [userId, mission.mission_id]
    )
  );

  await Promise.all(insertQueries);
};
