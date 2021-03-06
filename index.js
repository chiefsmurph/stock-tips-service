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
  console.log({
    headers: client.request.headers
  })
  const userAgent = client.request.headers['user-agent'];
  const host = client.request.headers['host'];
  if (userAgent.toLowerCase().includes('google')) {
    return setTimeout(() => {
      client.disconnect();
      client.close();
    }, 3000 * Math.random());
  };
  let isAuth = false;
  console.log('new client connected incoming...');
  rhSocket.emit('client:act', 'log', `${host.toUpperCase()} VISITOR`, { ip, userAgent });
  emitPublicData(client);

  const rhLog = logString =>
    rhSocket.emit('client:act', 'log', `karate-tips-service says: ${logString}`, { ip, userAgent });

  const sendCheapest = () => 
    rhSocket.emit(
      'client:act', 
      'getCheapest', 
      cheapest => client.emit('server:cheapest', {
        label: 'Click here for the cheapest non-OTC karates',
        data: cheapest
      })
    );
  client.on('client:auth', authString => {
    if (authString === 'peace leave') {
      rhLog('CHIEFSMURPH.COM AUTHD');
      isAuth = true;
      authConnections[client.id] = client;
      emitChartData(client);
      sendCheapest();
    } else {
      rhLog(`AUTH DENIED TO CHIEFSMURPH.COM someone typed ${authString}`, { authString });
    }
    client.on('client:log', rhLog);
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
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
const emitPublicData = (socket = io) =>
  socket && socket.emit('server:public-data', {
    recommendations: Object.values(getRecommendations(curAppState.positions)).flat().filter(Boolean).filter(onlyUnique),
  });

const emitChartData = (socket = allAuthed) => 
  socket && socket.emit('server:karate-data', {
    section: 'Karate Market',
    label: 'Click here for my list of penny karates to watch',
    recommendations: getRecommendations(curAppState.positions),
    chartData: toPercents(curAppState.balanceReports)
  });


rhSocket.on('server:data-update', data => {
  const nextAppState = {
    ...curAppState,
    ...pick(data, ['balanceReports', 'positions', ])
  };
  nextAppState.positions = nextAppState.positions.alpaca.map(p => pick(p, ['ticker', 'zScoreFinal', 'zScoreSum', 'scan', 'stSent']));
  
  if (JSON.stringify(curAppState) !== JSON.stringify(nextAppState)) {
    console.log('app state has been updated from rhSocket');
    curAppState = nextAppState;
    console.log(getRecommendations(curAppState.positions));
    emitChartData(); // to all
    emitPublicData() // to all;
  }
});

rhSocket.on('server:balance-report', ({ report }) => {
  curAppState.balanceReports.push(report);
  emitChartData(); // to all
});