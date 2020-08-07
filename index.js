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
  const ip = (client.handshake.headers['x-forwarded-for'] || client.handshake.address.address).split(',')[0];
  const userAgent = client.request.headers['user-agent'];

  let isAuth = false;
  console.log('new client connected incoming...');
  rhSocket.emit('client:act', 'log', 'CHIEFSMURPH.COM VISITOR', { ip, userAgent });

  const sendCheapest = () => 
    rhSocket.emit(
      'client:act', 
      'getCheapest', 
      cheapest => client.emit('server:cheapest', cheapest)
    );
  client.on('client:auth', authString => {
    if (authString === 'peace leave') {
      rhSocket.emit('client:act', 'log', 'CHIEFSMURPH.COM AUTHD', { ip, userAgent });
      isAuth = true;
      authConnections[client.id] = client;
      emitChartData(client);
      sendCheapest();
    } else {
      rhSocket.emit('client:act', 'log', 'AUTH DENIED TO CHIEFSMURPH.COM', { ip, userAgent });
    }
    client.on('client:log', logString => {
      rhSocket.emit('client:act', 'log', logString, { ip, userAgent });
    });
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