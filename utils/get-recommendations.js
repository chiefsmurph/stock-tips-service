const { get, mapObject, sortBy } = require('underscore');

const getRecommendations = (positions = []) => {

  const recs = {
    zScoreFinal: p => -p.zScoreFinal,
    zScoreSum: p => -p.zScoreSum,
    sentiment: p => -p.stSent.bullBearScore,
    oversold: p => p.scan.dailyRSI,
    unusualVolume: p => -p.scan.zScores.projectedVolumeTo2WeekAvg,
  };

  const withScans = positions.filter(p => p.scan);
  let remaining = [
    ...withScans
  ];
  return mapObject(recs, sortVal => {
    const [remainingPick, overallPick] = [remaining, withScans]
      .map(arr => (sortBy(arr, sortVal).shift() || {}).ticker);
    // remove remainingPick from remaining
    remaining = remaining.filter(p => p.ticker !== remainingPick);
    return remainingPick === overallPick 
      ? remainingPick 
      : [remainingPick, overallPick];
  });
};
module.exports = getRecommendations;