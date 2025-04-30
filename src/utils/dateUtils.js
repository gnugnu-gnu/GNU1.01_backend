function getNextDate(lastDate, cycle) {
  const date = new Date(lastDate);
  date.setDate(date.getDate() + cycle);
  return date.toISOString().split('T')[0];
}

module.exports = { getNextDate };