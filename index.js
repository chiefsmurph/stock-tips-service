const socketIOClient = require('socket.io-client');
const io = require('socket.io')();
const { pick } = require('underscore')
const { rhEndpoint, options } = require('./config');

const rhSocket = socketIOClient(rhEndpoint, options);
const toPercents = require('./utils/to-percents');
const getRecommendations = require('./utils/get-recommendations');

let curAppState = {};

io.on('connection', client => {
  console.log('new client connected incoming...');
  emitChartData(client);
});
io.listen(3001);

const emitChartData = (socket = io) => 
  socket && socket.emit('server:stock-data', {
    recommendations: getRecommendations((curAppState.positions || {}).alpaca),
    chartData: toPercents(curAppState.balanceReports)
  });


rhSocket.on('server:data-update', data => {
  const nextAppState = pick(data, ['balanceReports', 'positions']);
  nextAppState.positions = nextAppState.positions.map(p => pick(p, ['ticker', 'zScoreFinal']));
  
  if (JSON.stringify(curAppState) !== JSON.stringify(nextAppState)) {
    console.log('app state has been updated from rhSocket');
    curAppState = nextAppState;
    emitChartData(); // to all
  }
});

rhSocket.on('server:balance-report', ({ report }) => {
  curAppState.balanceReports.push(report);
  emitChartData(); // to all
});