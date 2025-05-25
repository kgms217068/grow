// services/scrapService.js
const db = require('../models/db');

exports.getUserScraps = async (userId) => {
  const [rows] = await db.promise().query(
    `SELECT p.post_id, p.post_title, p.post_content, s.scrap_date
     FROM scrap s
     JOIN post p ON s.post_id = p.post_id
     WHERE s.user_id = ?
     ORDER BY s.scrap_date DESC`,
    [userId]
  );
  return rows;
};
