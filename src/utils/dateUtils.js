const getNextDate = (lastDate, cycle) => {
    const last = new Date(lastDate);
    last.setDate(last.getDate() + cycle);
    return last.toISOString().split('T')[0];
  };

  module.exports = { getNextDate, getStatus };