const socketIOClient = require('socket.io-client');
const io = require('socket.io')();
const { pick } = require('underscore')
const { rhEndpoint, options } = require('./config');

const rhSocket = socketIOClient(rhEndpoint, options);
const toPercents = require('./utils/to-percents');

let curAppState = {};

io.on('connection', client => {
  console.log('new client connected incoming...');
  emitChartData(client);
});
io.listen(3001);

const emitChartData = (socket = io) => 
  socket && socket.emit('server:stock-data', toPercents(curAppState.balanceReports));


rhSocket.on('server:data-update', data => {

  const nextAppState = {
    ...curAppState,
    ...pick(data, ['balanceReports'])
  };

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