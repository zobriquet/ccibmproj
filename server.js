const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');


const ARDUINO_PORT = '/dev/cu.usbmodem48CA4359FDA42'; //port closest to me

const port = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const wss = new WebSocketServer({ port: 8081 });

let connectedSocket = null;

wss.on('connection', (ws) => {
  connectedSocket = ws;
  console.log('p5.js layout connected!');
});

parser.on('data', (data) => {
  if (connectedSocket && connectedSocket.readyState === 1) {
    connectedSocket.send(data); // sends the rawpot1,pot2 string to p5.js
  }
});

console.log(`Server running. Listening to Arduino on ${ARDUINO_PORT}...`);