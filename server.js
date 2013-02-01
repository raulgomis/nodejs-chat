/*
    Keep a global list of currently connected clients
    -----------------------------------------------
*/
var clients = [];



/*
    Create an http server to serve the client.html file
    ---------------------------------------------------
*/
var http = require("http");
var fs = require("fs");
var httpServer = http.createServer(function(request, response) {
    fs.readFile(__dirname + "/client.html", "utf8", function(error, content) {
        response.writeHeader(200, {"Content-Type": "text/html"});
        response.end(content);
    });
}).listen(process.env.PORT || 80);


/*
    Listen for and handle socket.io connections
    -------------------------------------------
*/
var io = require("socket.io").listen(httpServer);

io.configure(function () {
	io.enable('browser client minification');  // send minified client
	io.enable('browser client etag');          // apply etag caching logic based on version number
	io.enable('browser client gzip');          // gzip the file
	io.set('log level', 1);                    // reduce logging
	/*io.set('transports', [                     // enable all transports (optional if you want flashsocket)
	    'websocket'
	  , 'flashsocket'
	  , 'htmlfile'
	  , 'xhr-polling'
	  , 'jsonp-polling'
	]);*/
	io.set('transports', [ 'xhr-polling']);                    // enable all transports (optional if you want flashsocket)
	io.set("polling duration", 10); 
});

io.sockets.on("connection", function(socket) {


    /*
        Handle requests to join the chat-room
        -------------------------------------
    */
    socket.on('join', function(nick, callback) {
		try{
			// If the nickname isn't in use, join the user
			if (clients.indexOf(nick) < 0) {

				// Store the nickname, we'll use it when sending messages
				socket.nick = nick;

				// Add the nickname to the global list
				clients.push(nick);

				// Send a message to all clients that a new user has joined
				socket.broadcast.emit("user-joined", nick);
				
				console.log(nick)
				
				// Callback to the user with a successful flag and the list of clients
				if(typeof callback === "function"){
					callback(true, clients);
				}

			// If the nickname is already in use, reject the request to join
			} else {
				callback(false);
			}
		}
		catch(err){
			console.log(err)
		}
    });

    
    /*
        Handle chat messages
        --------------------
    */
    socket.on("chat", function(message) {
        // Check that the client has already joined successfully,
        // and that the message isn't just an empty string,
        // then foward the message to all clients
        if (socket.nick && message) {
            io.sockets.emit("chat", {sender: socket.nick, message: message});
        }
    });


    /*
        Handle client disconnection
        ---------------------------
    */
    socket.on("disconnect", function() {
        // Check that the user has already joined successfully
        if (socket.nick) {
            // Remove the client from the global list
            clients.splice(clients.indexOf(socket.nick), 1);
            // Let all the remaining clients know of the disconnect
            io.sockets.emit("user-left", socket.nick);
        }
    });

});
