var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var config = require('./config');

// Create authenticated Authy and Twilio API clients
var authy = require('authy')(config.authyKey);
var twilioClient = require('twilio')(config.accountSid, config.authToken);
// var dbURI = 'mongodb://localhost:27017/foodCoin';
var dbURI = 'mongodb://foodcoin:foodcoin@ds119578.mlab.com:19578/foodcoin';

mongoose.connect(dbURI); 
// Used to generate password hash
var SALT_WORK_FACTOR = 10;

// Define user model schema
var UserSchema = new mongoose.Schema({
    fName: {
        type: String,
//        required: true
    },
    lName: {
        type: String,
//        required: true
    },
    countryCode: {
        type: String,
//        required: true
    },
    phone: {
        type: String,
//        required: true
    },
    verified: {
        type: Boolean,
//        default: false
    },
    authyId: String,
    email: {
        type: String,
//        required: true,
//        unique: true
    },
    password: {
        type: String,
//        required: true
    }
});

// Middleware executed before save - hash the user's password
/*UserSchema.pre('save', function(next) {
    var self = this;

    // only hash the password if it has been modified (or is new)
    if (!self.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hashSync(self.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            self.password = hash;
            next();
        });
    });
});*/

// Test candidate password
UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    var self = this;
    bcrypt.compare(candidatePassword, self.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

// Send a verification token to this user
UserSchema.methods.sendAuthyToken = function(cb) {
    var self = this;
    console.log("In User.sendAuthyToken");
    console.log("self.authyId:"+self.authyId);
    if (!self.authyId) {
        // Register this user if it's a new user
        authy.register_user(self.email, self.phone, self.countryCode, 
            function(err, response) {
                
            if (err || !response.user) return cb.call(self, err);
            self.authyId = response.user.id;
            self.save(function(err, doc) {
                if (err || !doc) return cb.call(self, err);
                self = doc;
                sendToken();
            });
        });
    } else {
        // Otherwise send token to a known user
        sendToken();
    }

    // With a valid Authy ID, send the 2FA token for this user
    function sendToken() {
        authy.request_sms(self.authyId, true, function(err, response) {
            cb.call(self, err);
        });
    }
};

UserSchema.methods.verifyLogin = function(cb) {
	console.log("In Verify User Login");
	var self = this;
	console.log("self.email:"+self.email);
	console.log("self.authyId:"+self.authyId);
    sendToken();
    // With a valid Authy ID, send the 2FA token for this user
    function sendToken() {
        authy.request_sms(self.authyId, true, function(err, response) {
            cb.call(self, err);
        });
    }
};

// Test a 2FA token
UserSchema.methods.verifyAuthyToken = function(otp, cb) {
    var self = this;
    authy.verify(self.authyId, otp, function(err, response) {
        cb.call(self, err, response);
    });
};

// Send a text message via twilio to this user
UserSchema.methods.sendMessage = function(message, cb) {
    var self = this;
    twilioClient.sendMessage({
        to: self.countryCode+self.phone,
        from: config.twilioNumber,
        body: message
    }, function(err, response) {
        cb.call(self, err);
    });
};

// Export user model
module.exports = mongoose.model('User', UserSchema);