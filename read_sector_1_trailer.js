'use strict';


var express = require('express'),
    cors = require('cors')
    pcsc = require('pcsclite');


var app = express(),
    pcsc = pcsc(),
    lastRead = false;


// Enabling CORS for all routes.
app.use(cors());


// API
app.get('/', function (req, res) {
    res.send(lastRead);

    // Preventing multiple reads of the same read.
    lastRead = false;
});


// Start web server.
var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

  console.log('Remote RFID server API available at http://%s:%s', host, port);
});


// PC/SC interface.
pcsc.on('reader', function(reader) {
    console.log('Reader detected:', reader);

    reader.on('error', function(err) {
        console.log('Error(', reader.name, '):', err.message);
    });

    reader.on('status', function(status) {
        console.log('Status(', reader.name, '):', status);

        // Check changes.
        var changes = this.state ^ status.state;
        if (changes) {
            
            // Card removed.
            if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
                console.log('Status(', reader.name, '): Card removed');
                
                reader.disconnect(reader.SCARD_LEAVE_CARD, function(err) {
                    if (err) {
                        console.log('Error(', reader.name, '):', err);
                    }
                    else {
                        console.log('Status(', reader.name, '): Disconnected');
                    }
                });

            }

            // Card inserted.
            else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
                console.log('Status(', reader.name, '): Card inserted');
                
                reader.connect({ share_mode : this.SCARD_SHARE_SHARED }, function(err, protocol) {
                    if (err) {
                        console.log('Error(', reader.name, '):', err);
                    }
                    else {
							var readBlock = 0x07;
							
							//AUTHENTICATE FIRST SECTOR 15
							var messageAuthenticate = new Buffer([0xFF, 0x86, 0x00, 0x00, 0x05, 
																  0x01, 0x00, 0x3F, 0x60, 0x00]);
							
							reader.transmit(messageAuthenticate, 40, protocol, function(err, dataAuthenciate) {
								if (err) {
									console.log('Error(', reader.name, '):', err);
								}
								else {	
									console.log("AUTHENTICATION OK!!!");
									console.log(dataAuthenciate);
									
									
									var messageRead = new Buffer([0xFF, 0xB0, 0x00, 0x3F, 0x10]);
									
									//BLOCK ICERISINDEKI 16 BYTE OKUNUR
									reader.transmit(messageRead, 40, protocol, function(err, dataRead) {
										if (err) {
											console.log('Error(', reader.name, '):', err);
										}
										else {	
											console.log("READ BLOCK");
											console.log(dataRead);
										}
										
										
									});
									
									
									
								}
							});
								
             
                    }
                });
            }
        }
    });

    reader.on('end', function() {
        console.log('Status(', reader.name, '): Removed');

        // Release resources.
        reader.close();
        pcsc.close();
    });
});

pcsc.on('error', function(err) {
    console.log('Error( PCSC ): ', err);
});
