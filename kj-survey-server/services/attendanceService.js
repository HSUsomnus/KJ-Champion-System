const db = require('../config/db');

const compareZhHant = (left, right) => left.localeCompare(right, 'zh-Hant');

/**
 * 取得 confirmed 成員及其推薦人，供後台未填名冊使用。
 */
const listConfirmedMembersWithRecommender = async (executor = db) => {
  const result = await executor.query(
    `SELECT name, star_rank, recommender_name FROM survey_members WHERE status = 'confirmed' ORDER BY name`
  );
  return result.rows;
};

/**
 * 依 confirmed 成員名單與表單提交計算各推薦人組別的填寫進度。
 */
const computeAttendance = (members, submissions, nameFieldKey = 'name') => {
  const submittedNames = new Set(
    submissions.map((submission) => submission.answers?.[nameFieldKey])
  );
  const groupedMembers = new Map();

  for (const member of members) {
    const recommender = member.recommender_name == null
      || member.recommender_name.trim() === ''
      ? null
      : member.recommender_name;
    const groupMembers = groupedMembers.get(recommender) || [];
    groupMembers.push({
      name: member.name,
      star_rank: member.star_rank,
      filled: submittedNames.has(member.name),
    });
    groupedMembers.set(recommender, groupMembers);
  }

  const groups = Array.from(groupedMembers, ([recommender, groupMembers]) => {
    groupMembers.sort((left, right) => compareZhHant(left.name, right.name));
    return {
      recommender,
      total: groupMembers.length,
      filled: groupMembers.filter((member) => member.filled).length,
      members: groupMembers,
    };
  }).sort((left, right) => {
    if (left.recommender === null) return 1;
    if (right.recommender === null) return -1;
    return compareZhHant(left.recommender, right.recommender);
  });

  return {
    totalMembers: members.length,
    totalFilled: groups.reduce((total, group) => total + group.filled, 0),
    groups,
  };
};

module.exports = {
  computeAttendance,
  listConfirmedMembersWithRecommender,
};
