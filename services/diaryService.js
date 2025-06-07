const db = require('../models/db');

exports.getUserDiaries = async (userId) => {
  const [rows] = await db.promise().query(
    `SELECT d.diary_id, d.title, d.content, d.mission_execution_id, 
            m.level, m.description AS mission_content,
            me.completed_date AS diary_date,
            e.emotion_tag_name AS emotion_tag
     FROM diary d
     JOIN mission_execution me ON d.mission_execution_id = me.mission_execution_id
     JOIN mission m ON me.mission_id = m.mission_id
     LEFT JOIN emotion e ON d.diary_id = e.diary_id
     WHERE me.user_id = ?
     ORDER BY me.completed_date DESC`,
    [userId]
  );

  // ✅ 감정 태그를 배열로 묶기
  const diaryMap = new Map();

  for (const row of rows) {
    const {
      diary_id, title, content, mission_execution_id,
      level, mission_content, diary_date, emotion_tag
    } = row;

    if (!diaryMap.has(diary_id)) {
      diaryMap.set(diary_id, {
        diary_id,
        title,
        content,
        mission_execution_id,
        level,
        mission_content,
        diary_date,
        emotion_tag: emotion_tag ? [emotion_tag] : []
      });
    } else if (emotion_tag) {
      diaryMap.get(diary_id).emotion_tag.push(emotion_tag);
    }
  }

  return Array.from(diaryMap.values());
};
