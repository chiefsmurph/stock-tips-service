const getRecommendations = (positions = []) => {
  return positions
    .filter(p => p.zScoreFinal && p.scan)
    .sort((a, b) => b.zScoreFinal - a.zScoreFinal)
    .slice(0, 3)
    .map(p => p.ticker);
};
module.exports = getRecommendations;