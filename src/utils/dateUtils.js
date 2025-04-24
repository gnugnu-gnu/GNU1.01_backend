const getNextDate = (lastDate, cycle) => {
    const last = new Date(lastDate);
    last.setDate(last.getDate() + cycle);
    return last.toISOString().split('T')[0];
  };
  
  const getStatus = (nextDate, today) => {
    const next = new Date(nextDate);
    const todayDate = new Date(today);
    const diff = Math.round((todayDate - next) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `${diff}일 전`;   // 과거
    if (diff === 0) return '오늘';          // 오늘
    return `${-diff}일 뒤`;                 // 미래
  };
  
  module.exports = { getNextDate, getStatus };