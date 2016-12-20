var mongo = require("./mongo");
// var mongoURL = "mongodb://localhost:27017/foodCoin";
var syslog = require('syslog');
var Syslogd = require('syslogd');
var logger = syslog.createClient(514, 'localhost');
var mongoURL='mongodb://foodcoin:foodcoin@ds119578.mlab.com:19578/foodcoin'
var bcrypt = require('bcrypt-nodejs');
var User = require('./User');

exports.signin = function(req,res)
{

	var email, password;
	var json_responses;
	
	email = req.param("email");
	password = req.param("password");
	
	console.log("email:"+email);
	console.log("password:"+password);
	
	if(email === '' || password === '' || email === undefined || password === undefined){
		json_responses = {"statusMsg" : "Email or Password is empty", "statusCode" : 404, "email": email};
		res.send(json_responses);
	}
	
	else{
		mongo.connect(mongoURL, function(){
			console.log('Connected to mongo at: ' + mongoURL);
			var coll = mongo.connectToCollection('users');
			//var res = {};
			coll.findOne({email: email}, function(err, user){
				if(err){
					json_responses = {"statusMsg" : "Error", "statusCode" : 404, "email": null};
					
					res.send(json_responses);
				}
				
				if (user) {
					console.log("user.password:"+user.password);
					// This way subsequent requests will know the user is logged in.
					if(bcrypt.compareSync(password,user.password)){
						//req.session.email = email;
						console.log("Session Initialized");

						console.log("DOing syslog");

                        Syslogd(function(info) {

							 info = {
							 facility: 7
							 , severity: 22
							 , tag: 'tag'
							 , time: new Date(),
							  hostname: 'FoodCOIn'
							 , address: '127.0.0.1'
							 , family: 'IPv4'
							 , port: null
							 , size: 39
							 , msg: 'info'
							 }

                        }).listen(514, function(err) {
                            console.log('start')
                        });

                        logger.info({
                            "timestamp": new Date(),
                            "hostname": "foodCoin",
                            "severity": "INFO",
                            "summary": "login failed",
                            "category": "authentication",
                            "source": "login",
                            "tags": [
                                "login",
                                "userAccess",
                                "failure"
                            ],
                            "details": {
                                "username": email

                            }
                        });
						/* First Page After Login
						 * sessionStatus = true;
						sessionEmail = req.session.email;
						res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');*/
						
						/* While Logout
						 * req.session.destroy();*/
						var verifyUser = new User(user);
						console.log("verifyUser:"+verifyUser.email);
						verifyUser.verifyLogin(function(err) {
	                        if (err) {
	                            console.log('errors', 'There was a problem sending '
	                                + 'your token - sorry :(');
	                        }
	                        console.log("User Saved and Auth Key Sent.");
	                        // Send to token verification page
	                        res.send({"id" : verifyUser._id});
	                    });
						
						/*json_responses = {"statusMsg" : "Valid Login", "statusCode" : 200, "id": user._id};
						
						res.send(json_responses);*/
					}
					else{

						json_responses = {"statusMsg" : "Invalid Login", "statusCode" : 404, "email": null};
                        console.log("DOing syslog");
                        logger.log({
                            "timestamp": new Date(),
                            "hostname": "foodCoin",
                            "severity": "INFO",
                            "summary": "login failed",
                            "category": "authentication",
                            "source": "login",
                            "tags": [
                                "login",
                                "userAccess",
                                "failure"
                            ],
                            "details": {
                                "username": email
                            }
                        });
						
						res.send(json_responses);
					}
					

				} else {
					console.log("Invalid Username");
					
					json_responses = {"statusMsg" : "Invalid Username", "statusCode" : 404, "email": null};
					
					res.send(json_responses);
				}
			});
		});
	}
};