// models/missionModel.js
const { promisePool } = require('../db/db');

exports.getAllMissions = async () => {
  const [rows] = await promisePool.query('SELECT * FROM mission ORDER BY mission_id');
  return rows;
};
