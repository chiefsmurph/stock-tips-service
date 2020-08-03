const socketIOClient = require('socket.io-client');
const io = require('socket.io')();
const { pick } = require('underscore')
const { rhEndpoint, options } = require('./config');

const rhSocket = socketIOClient(rhEndpoint, options);
const toPercents = require('./utils/to-percents');
const getRecommendations = require('./utils/get-recommendations');

let curAppState = {};

const authConnections = {};

io.on('connection', client => {
  let isAuth = false;
  console.log('new client connected incoming...');
  const sendCheapest = () => 
    rhSocket.emit(
      'client:act', 
      'getCheapest', 
      cheapest => client.emit('server:stock-data', { cheapest } )
    );
  client.on('client:auth', authString => {
    if (authString === 'peace leave') {
      console.log('yes this one is authed');
      isAuth = true;
      authConnections[client.id] = client;
      emitChartData(client);
      sendCheapest();
    }
  });
  client.on('disconnect', () => {
    console.log('connection disconnect');
    delete authConnections[client.id];
  });
});
io.listen(3001);

const allAuthed = {
  emit: (...args) => {
    Object.values(authConnections)
      .forEach(socket => socket.emit(...args));
  }
};

const emitChartData = (socket = allAuthed) => 
  socket && socket.emit('server:stock-data', {
    recommendations: getRecommendations(curAppState.positions),
    chartData: toPercents(curAppState.balanceReports)
  });


rhSocket.on('server:data-update', data => {
  const nextAppState = {
    ...curAppState,
    ...pick(data, ['balanceReports', 'positions'])
  };
  nextAppState.positions = nextAppState.positions.alpaca.map(p => pick(p, ['ticker', 'zScoreFinal', 'zScoreSum', 'scan', 'stSent']));
  
  if (JSON.stringify(curAppState) !== JSON.stringify(nextAppState)) {
    console.log('app state has been updated from rhSocket');
    curAppState = nextAppState;
    console.log(getRecommendations(curAppState.positions));
    emitChartData(); // to all
  }
});

rhSocket.on('server:balance-report', ({ report }) => {
  curAppState.balanceReports.push(report);
  emitChartData(); // to all
});