const { uniq } = require('underscore');
const getTrend = require('./get-trend');

module.exports = (balanceReports = [], numDays = 1) => {

  if (!balanceReports || !balanceReports.length) return [];

  let copy = [...balanceReports];
  copy = copy.map(report => ({
    ...report,
    date: (new Date(report.time)).toLocaleDateString()
  }));

  const mostRecent = copy.pop().date;

  const prevClose = copy.slice().reverse().find(r => r.date !== mostRecent && r.isRegularHours);

  const onlyToday = copy.filter(r =>  (new Date(r.time)) > Date.now() - 1000 * 60 * 60 * 24 * numDays );

  const percs = onlyToday.map(r => ({
    sp500: getTrend(r.indexPrices.sp500, prevClose.indexPrices.sp500),
    nasdaq: getTrend(r.indexPrices.nasdaq, prevClose.indexPrices.nasdaq),
    russell2000: getTrend(r.indexPrices.russell2000, prevClose.indexPrices.russell2000),
    alpacaBalance: getTrend(r.alpacaBalance, prevClose.alpacaBalance),
    time: r.time
  }));

  return percs;
};