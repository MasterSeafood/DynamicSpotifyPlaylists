
const auth = require('./auth');
// const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const https = require('https');
const querystring = require('querystring');
const axios = require('axios');

var playlistID = null;
var dynplaylistID = '14SsYXXLTLIbYH7hklNKYR';

var songDuration = null,
    songProgress = null,
    songID = null;

var isSessionActive = false;

var hasRetrievedDynPlaylist = false;

var skipMap = new Map();


//get a random item from Map
function getRandomKey(map) {
    let items = Array.from(map.keys());
    return items[Math.floor(Math.random() * items.length)];
}

function addSong(playlistID, songID){
    var dataRequest = {
        url: 'https://api.spotify.com/v1/playlists/'+playlistID+'/tracks',
        headers: { 'Authorization': 'Bearer ' + auth.access_token },
        body:{
            uris: ["spotify:track:"+songID]
        },

        json:true
    }

    request.post(dataRequest, function(error, response, body){
        if(!error && response.statusCode === 201){
            console.log("successfully added song");

        }else{
            console.log("failed to add song");
            console.log(response.statusCode);
            console.log(error);
            console.log(body);
        }
    });


}

function addRecommendedSong(playlistID, songID){
    var dataRequest = {
        url: 'https://api.spotify.com/v1/recommendations',
        headers: { 'Authorization': 'Bearer ' + auth.access_token },
        qs: {
            seed_artists: '',
            seed_genres: '',
            seed_tracks: songID,
            limit: 1
        },

        json: true
    }

    request.get(dataRequest, function(error, response, body){
        if(!error && response.statusCode === 200){
            console.log("successfully retrieved recommendation");
            // console.log(body.tracks[0].name);
            // console.log(body.tracks[0].id);

            addSong(playlistID, body.tracks[0].id);
            skipMap.set(body.tracks[0].id, 0);
            
        }else{
            console.log("failed to retrieve recommendation");
            console.log(response.statusCode);
            console.log(error);
            console.log(body);
        }
    });
}



function scrapePlaylist(endpoint){

    if(!endpoint){
        return;
    }
    
    var dataRequest = {
        url: endpoint,
        headers: { 'Authorization': 'Bearer ' + auth.access_token },
        json: true
    }

    request.get(dataRequest, function(error, response, body){
        if(!error && response.statusCode === 200){

            console.log("retrieved some songs");
            //copy song ids into map
            for(let song of body.items){
                skipMap.set(song.track.id, 0);
            }

            scrapePlaylist(body.next);
                
            
                

        }else{
            console.log("playlist songs request");
            console.log(error);
            console.log(response.statusCode);
            return;
        }
    });
    


}


function removeSong(playlistID, songID){

    // var payload = JSON.stringify({
    //     'tracks': [{'uri':'spotify:track:'+songID}]
    // });

    // const options = {
    //     hostname: 'api.spotify.com',
    //     // port: 443,
    //     path: '/v1/playlists/' + playlistID+'/tracks',
    //     method: 'DELETE',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': 'Bearer ' + auth.access_token
    //         // 'X-Auth-Token': authenticationToken
    //     }
    // };

    // const req = https.request(options, res => {
    //     console.log(res);
    //     console.log(`statusCode: ${res.statusCode}`);

    //     // res.on('data', d => {
    //     //     process.stdout.write(d);
    //     // });
    // });
    // req.write(payload);
    // req.on('error', (e) => {
    //     console.error(e);
    //   });
    // req.end();


    // axios.delete('https://api.spotify.com/v1/playlists/'+playlistID+'/tracks', {
    //     headers: { 'Authorization': 'Bearer ' + auth.access_token },
    //     data: {
    //         tracks: [{'uri':'spotify:track:'+songID}]
    //     }

    // }).then(
    //     function() {console.log("deleted it")}
    // );
    var removeRequest = {
        url: 'https://api.spotify.com/v1/playlists/'+playlistID+'/tracks',
        headers: { 'Authorization': 'Bearer ' + auth.access_token
        },

        body: {tracks:[
            {
                uri: 'spotify:track:'+songID
            }
        ]},
        
            
    
        json: true

    }

    request.delete(removeRequest, function(error, response, body){
        if(!error && response.statusCode === 200){
            console.log("successfully removed track");
        }else{
            console.log("error when removing track");
            console.log(response.statusCode);
            console.log(error);
            console.log(body);
        }


    });



}



var listener = setInterval(function(){

    if(auth.access_token){ //if access token exists

        // console.log(auth.access_token);

        if(!hasRetrievedDynPlaylist){

            scrapePlaylist('https://api.spotify.com/v1/playlists/'+dynplaylistID+'/tracks');

            

            // var playListSongRequest = {
            //     url: 'https://api.spotify.com/v1/playlists/'+dynplaylistID+'/tracks',
            //     headers: { 'Authorization': 'Bearer ' + auth.access_token },
            //     json: true

            // }

            // request.get(playListSongRequest, function(error, response, body){
            //     if(!error && response.statusCode === 200){

                    
            //         for(let song of body.items){
            //             skipMap.set(song.track.id, 0);
            //         }
            //         console.log(body);








            //     }else{
            //         console.log("playlist songs request");
            //         console.log(error);
            //         console.log(response.statusCode);
            //     }
            // });

            hasRetrievedDynPlaylist = true;
        }
            // console.log(skipMap.size);

            // for(const i of skipMap.entries()){
            //     console.log(i);
            // }



        var dataRequest = {
            url: 'https://api.spotify.com/v1/me/player',
            headers: { 'Authorization': 'Bearer ' + auth.access_token },
            json: true
        }
        // console.log(auth.access_token);
        request.get(dataRequest, function(error, response, body){

            if(!error && response.statusCode === 200){

                playlistID = body.context.external_urls.spotify.slice(34, 56);

                if(playlistID == dynplaylistID){
                    //Playing a dynamic playlist

                    if(isSessionActive){ //if session is already active
                        if(body.item.id != songID && songProgress <= songDuration/2){ //if detected skip event
                            console.log("skipped");
                            var skipCount = skipMap.get(songID);
                            skipMap.set(songID, ++skipCount);

                            if(skipCount>=1){
                                removeSong(dynplaylistID, songID);
                                skipMap.delete(songID);

                                if(skipMap.size < 20){
                                    addRecommendedSong(dynplaylistID, getRandomKey(skipMap));
                                }

                                

                                // console.log(getRandomKey(skipMap));


                            }
                        }

                    }else{
                        isSessionActive = true;
                    }


                    //get updated data
                    songID = body.item.id;
                    songProgress = body.progress_ms;
                    songDuration = body.item.duration_ms;





                }else{
                    console.log("Not playing a dynamic playlist");
                    isSessionActive = false;
                }

            }else{
                console.log('playlist ID request');
                console.log(error);
                console.log(response.statusCode);
            }
            

            



        });

        // if(playlistID && playlistID == dynplaylistID){
        //     //Playing a dynamic playlist
            

        //     // console.log(true);

        // }else{
        //     // console.log(false);
        //     console.log("Not playing a dynamic playlist");
        // }

        // console.log(songID);
        // console.log(songProgress + " / " + songDuration);


        
        


    }
}, 1000);



