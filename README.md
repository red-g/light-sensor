# light-sensor

A web server which monitors the serial port for light data, converts it to lux, then graphs it on the client. In order to install your dependencies, run "npm install-all", after which you can build and run your application. The command "npm start" will build and run the app (which must be run the first time, or after any changes), while "node index.js" will just run it.

Note: this server requires that you have node and npm installed.

<h2>Setup</h2>
 To get the server monitoring real light values, plug in a device which writes light data to the serial port, with each piece of data on a new line. By default, the CONNECTED variable in the index.js file is set to false, so the site will generate dummy data instead of listening to the serial port. You will need to specify your own serial port name and baud rate.

 <h2>Example implementation</h2>
 Our implementation used an arduino hooked up to a light detector circuit on a bread board (just a photoresistor and a 2.2k ohm resistor), with the following program running on the arduino:

```
//change this to match whichever analog input pin you use.
int lightPin=A0;
//the delay time between updates
int dv=250;
int lightVal;

void setup() {
// put your setup code here, to run once:
pinMode(lightPin, INPUT);
// 9600 is the baud rate
Serial.begin(9600);
}

void loop() {
// put your main code here, to run repeatedly:
lightVal = analogRead(lightPin);
Serial.println(lightVal);
delay(dv);
}

```

The lux conversion mechanism will likely still need to be updated, even with a similar setup to ours.
