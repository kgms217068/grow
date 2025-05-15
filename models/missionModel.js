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