var Subscriber = require('../models/Subscriber');

// Create a function to handle Twilio SMS / MMS webhook requests
exports.webhook = function(request, response) {

    // Get the user's phone number
    var phone = request.body.From;

    // Try to find a subscriber with the given phone number
    Subscriber.findOne({
        phone: phone
    }, function(err, sub) {
        if (err) return respond('Derp! Please text back again later.');

        if (!sub) {
            // If there's no subscriber associated with this phone number,
            // create one
            var newSubscriber = new Subscriber({
                phone: phone,
                team:''
            });

            newSubscriber.save(function(err, newSub) {
                if (err || !newSub) 
                    return respond('We couldn\'t sign you up - try again.');

                // We're signed up but not subscribed - prompt to subscribe
                respond('Thanks for contacting us! Text "yes" to ' 
                    + 'receive updates via text message.');
            });
        } else {
            // For an existing user, process any input message they sent and
            // send back an appropriate message

            processMessage(sub);
        }
    });

    // Process any message the user sent to us
    function processMessage(subscriber) {
        // get the text message command sent by the user
        var msg = request.body.Body || '';
        msg = msg.toLowerCase().trim();



        // Conditional logic to do different things based on the command from
        // the user
        if (msg === 'yes' || msg === 'no') {
            // If the user has elected to subscribe for messages, flip the bit
            // and indicate that they have done so.
            subscriber.subscribed = msg === 'yes';
            subscriber.save(function(err) {
                if (err)
                    return respond('We could not subscribe you - please try '
                        + 'again.');

                // Otherwise, our subscription has been updated
                var responseMessage = 'You are now subscribed for updates. What team number are you on?';
                if (!subscriber.subscribed)
                    responseMessage = 'You have unsubscribed. Text "yes"'
                        + ' to start receiving updates again.';

                respond(responseMessage);
            });
        } else {

           // respond('I dont understand your command');
            // If we don't recognize the command, text back with the list of
            // available commands
            var teamNumber = getTeamNumber(msg);

            console.log('Here we are : ' + msg);

            if (!subscriber.subscribed){
                responseMessage = 'You must first text "yes" to subscribe';
            }
            else{
                if(teamNumber != 0){
                    var responseMessage = 'You are on team number : ' + teamNumber + ' .... Good luck!';                
                    subscriber.team = teamNumber;
                    subscriber.save(function (err){
                        if(err)
                            return respond('Something wrong. Please try again');
                        //respond(responseMessage);
                    });
                }
                else
                {
                    var responseMessage = 'Please text your team number or text "no" to unsubscribe.';
                    
                }
            }
            respond(responseMessage);

        }
    }

    // Set Content-Type response header and render XML (TwiML) response in a 
    // Jade template - sends a text message back to user
    function respond(message) {
        response.type('text/xml');
        response.render('twiml', {
            message: message
        });
    }
};
// Get team number 
    function getTeamNumber(msg) {
        // get the text message command sent by the user
        //var msg = request.body.Body || '';
        msg = msg.toLowerCase().trim();

        var allTheNumbers;
        var temp = msg.match(/^\d+|\d+\b|\d+(?=\w)/g);
        // console.log('temp = ' + temp);

        if (temp === null && typeof temp === "object") {
            return 0;
        } else {
            allTheNumbers = temp.map(function (v) {return +v;});
            // console.log('allTheNumbers = ' + allTheNumbers);            
        }

        // console.log('first number found was ' + allTheNumbers[0]);
        return allTheNumbers[0];
    };

// Handle form submission
exports.sendMessages = function(request, response) {
    // Get message info from form submission
    var message = request.body.message;
    var imageUrl = request.body.imageUrl;
    var teamnumber = request.body.teamnumber;

    // Use model function to send messages to all subscribers
    Subscriber.sendMessage(teamnumber, message, imageUrl, function(err) {
        if (err) {
            request.flash('errors', err.message);
        } else {
            request.flash('successes', 'Messages on their way!');
        }

        response.redirect('/');
    });
};