

//Get required node modules
const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

var client_id = '3956675b5bb54b899834683f1ce57a98'; // Your client id 
var client_secret = ''; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri 

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
 var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };


var stateKey = 'spotify_auth_state';

var app = express(); //generate new app

var access_token = null;
var refresh_token = null;

//use these libraries
app.use(express.static(__dirname + '/public')) 
   .use(cors())
   .use(cookieParser());


app.get('/login', function(req, res){
    //This code when we request a login 
    //need to send a GET API call to spotify auth api

    //add a cookie to our request
    var state = generateRandomString(16);
    res.cookie(stateKey, state);


    //these are the permissions we want
    var scope = 'user-read-playback-state playlist-modify-private playlist-modify-public';


    //forward this api call to Spotify
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));

});


app.get('/callback', function(req, res){
    //Spotify sends back a call with code and state

    var code = req.query.code || null;
    var state = req.query.state || null;

    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if(state === null || state !== storedState){ //state has changed (not the same)
        res.redirect('/#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));

    } else { //state is the same
        res.clearCookie(stateKey);

        //prepare authorization request for tokens
        var authRequest = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
              code: code,
              redirect_uri: redirect_uri,
              grant_type: 'authorization_code'
            },
            headers: {
              'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authRequest, function(error, response, body){
            if(!error && response.statusCode === 200){ //if request was successful

                console.log("access token retrieved");
                //get access and refresh tokens
                access_token = body.access_token,
                refresh_token = body.refresh_token;

                module.exports.access_token = access_token;
                module.exports.refresh_token = refresh_token;

                

                /*
                var accessRequest = {
                    url: 'https://api.spotify.com/v1/me/player',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                }

                //make a API call to get the desired data
                request.get(accessRequest, function(error, response, body){

                    console.log(body.item.name);
                });
                


                //redirect to the browser passing the access and refresh tokens as queries
                res.redirect('/#' +
                querystring.stringify({
                    access_token: access_token,
                    refresh_token: refresh_token
                }));
                */
            } else {
                res.redirect('/#' + 
                querystring.stringify({
                    error: 'invalid_token'
                }));
            }
        });

    }
});

app.get('/refresh_token', function(req, res){
    //requesting new access and refresh token from refresh token
    var refresh_token = req.query.refresh_token;

    //compose request
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        },
        json: true
    };



    //make the request
    request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
        var access_token = body.access_token;
        res.send({ //What does this do?
        'access_token': access_token
        });
    }
    });
    
});

module.exports.access_token = access_token;
module.exports.refresh_token = refresh_token;
module.exports.app = app;

console.log('Active on port 8888');
app.listen(8888);



