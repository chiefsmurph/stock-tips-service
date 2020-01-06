const socketIOClient = require('socket.io-client');
const io = require('socket.io')();
const { pick } = require('underscore')
const { rhEndpoint } = require('./config');

const rhSocket = socketIOClient(rhEndpoint);


let curAppState = {};

io.on('connection', client => {
  console.log('new client connected incoming...');
  emitAppState(client);
});
io.listen(3001);

const emitAppState = (socket = io) => 
  socket && socket.emit('server:data-update', curAppState);


rhSocket.on('server:data-update', data => {
  console.log('data update has been received from rhSocket');

  const nextAppState = {
    ...curAppState,
    ...pick(data, ['derivedCollections', 'lastCollectionRefresh'])
  };

  if (JSON.stringify(curAppState) !== JSON.stringify(nextAppState)) {
    console.log('app state has been updated');
    curAppState = nextAppState;
    emitAppState(); // to all
  }
});