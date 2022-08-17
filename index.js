const express = require("express")
const ws = require("ws")
const fs = require("fs")

//initializes server and websocket 
const app = express();
const wss = new ws.Server({noServer: true});

const PORT = 3000;

//lux calculation. This is very specific to your own design and hardware, so it is not likely to be of much use.
//
//In the likely case you do need to replace this section, define a new toLux function which takes in a number reading
// from the serial port and gives back the lux value.

const resistance = 2200;
const LDR = p => resistance * (1024 / p - 1);
const stabilize = ldr => Math.log10(ldr/616);//or Math.log10(ldr) - Math.log10(616)
const logOut = s => 2.059 * Math.log(6.731 - 4.85 * s);

function toLux(reading) {
    const ldr = LDR(reading);
    const stable = stabilize(ldr);
    const logout = logOut(stable);
    return 10 ** logout;
}

//the path to the light data json file
const JSONDATA = "./data.jsonl";

//get the latest time from the data file
function getLatestTime() {
    const data = fs.readFileSync(JSONDATA, "utf8").toString().split("\n");
    return data.length >= 2 ? JSON.parse(data[data.length-2]).time : 0;
}

//Timing system. Starts at last saved time value and ticks up 1 for each new data point
let time = getLatestTime();
console.log("Time:", time);
const nextPoint = (lux) => ({time: time += 1, lux });

//sends message to all clients using websocket
const broadcast = (msg) => {for (const client of wss.clients) client.send(msg);}

//Data writing and saving system. 
let writer = null;

//temporarily changes writer from null to a write stream, reverting back to null when the finish event is triggered.
function nextWriter() {
    writer = fs.createWriteStream(JSONDATA, { flags: 'a'});
    writer.once('finish', () => {
        writer = null;
        broadcast("false")
    });
}

//processes the latest data point, sending it to all clients
function update(lux) {
    const point = nextPoint(lux)
    const jsonpoint = JSON.stringify(point)
    if (writer !== null) writer.write(jsonpoint + "\n");
    broadcast(jsonpoint)
}

//endpoint for data download
app.get('/file', (req, res) => {
    res.download(JSONDATA);
})

//endpoint to start and stop writing to file
app.put('/file', (req, res) => {
    const setwrite = JSON.parse(req.query.writing);
    const writing = writer !== null;
    res.send("Recieved")
    if (setwrite === writing) return;
    if (setwrite) {
        nextWriter();
        broadcast("true");
        console.log("Started writing");
    } else { 
        writer.end();
        console.log("Stopped writing");
    };
})

//endpoint to clear file
app.put('/file/clear', (req, res) => {
    fs.truncate(JSONDATA, () => res.send("Cleared"));
})

//endpoint to get current writing status of file. Used to initialize client.
app.get('/file/writing', (req, res) => {
    res.send(writer !== null)
})

//loads client to express
app.use(express.static("client/build"))

const server = app.listen(PORT, () => console.log(`Server started @ http://localhost:${PORT}`))

//web socket handling
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
       wss.emit('connection', ws, request);
    })
  })

//indicates whether the computer is currently connected to a serial port. When false, the server will generate dummy data.
const CONNECTED = false;

if (CONNECTED) {
    const { SerialPort, ReadlineParser } = require('serialport');
    //the name of the serial port the computer is connected to. You can check in the arduino IDE if that is what you are using.
    const SERIALPORTNAME = '/dev/cu.usbmodem14201';
    //the baudrate is set in microcontroller's code, this value should be set to match
    const BAUDRATE = 9600;

    //initializes serial port connection and the parser to read the input, which expects data separates by newlines.
    const serialport = new SerialPort({ path: SERIALPORTNAME, baudRate: BAUDRATE });
    const parser = serialport.pipe(new ReadlineParser());

    serialport.on("open", () => {
        console.log('Serial port open');
    });
    parser.on('data', data => update(toLux(Number(data))));
}
else {
    const genrand = () => (600 / (1 + Math.E ** -Math.random())) + 200;
    setInterval(() => update(toLux(genrand())), 100);
}