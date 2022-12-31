

//Require node modules
const auth = require('./auth');
const request = require('request'); // "Request" library


var dynplaylistID = 'PlAYLIST_ID';
var skipCountThreshold = 1;
var targetPlaylistSize = 20;


var playlistID = null;

var songDuration = null,
    songProgress = null,
    songID = null;

var isSessionActive = false;

var hasRetrievedDynPlaylist = false;

var skipMap = new Map();



//function to get a random key from a Map
function getRandomKey(map) {
    let items = Array.from(map.keys());
    return items[Math.floor(Math.random() * items.length)];
}

//function to add a song to a playlist
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
            console.log("Successfully added song");

        }else{
            console.log("Failed to add song");

        }
    });


}

//function to add a similar song to a playlist
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
            console.log("Successfully retrieved recommendation");

            //Get recommended song and add to playlist and skipMap
            addSong(playlistID, body.tracks[0].id);
            skipMap.set(body.tracks[0].id, 0);
            
        }else{
            console.log("Failed to retrieve recommendation");

        }
    });
}


//Function to get songs from playlist and store in skipMap
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

            console.log("Retrieved some songs");

            //copy list of song ids into skipMap
            for(let song of body.items){
                skipMap.set(song.track.id, 0);
            }

            //Recursively scrape next set of songs 
            scrapePlaylist(body.next);
                
            
                

        }else{
            console.log("Failed to retrieve songs from playlist");

            return;
        }
    });
    


}

//Function to remove a song from a playlist
function removeSong(playlistID, songID){

    
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
            console.log("Successfully removed track");
        }else{
            console.log("Failed to remove track");

        }


    });



}


//Function that runs every 1 second
var listener = setInterval(function(){

    if(auth.access_token){ //if access token exists

        if(!hasRetrievedDynPlaylist){ //First time retrieving playlist tracks

            scrapePlaylist('https://api.spotify.com/v1/playlists/'+dynplaylistID+'/tracks');


            hasRetrievedDynPlaylist = true;
        }


        //Get currently playing playlist 
        var dataRequest = {
            url: 'https://api.spotify.com/v1/me/player',
            headers: { 'Authorization': 'Bearer ' + auth.access_token },
            json: true
        }

        request.get(dataRequest, function(error, response, body){
            if(!error && response.statusCode === 200){

                //Get playlist ID 
                playlistID = body.context.external_urls.spotify.slice(34, 56);

                if(playlistID == dynplaylistID){ 
                    //Playing a dynamic playlist

                    if(isSessionActive){ //if session is already active
                        if(body.item.id != songID && songProgress <= songDuration/2){ //if detected skip event
                            console.log("Skipped");
                            var skipCount = skipMap.get(songID);
                            skipMap.set(songID, ++skipCount); //update skip count

                            if(skipCount>=skipCountThreshold){ //Need to remove a song

                                removeSong(dynplaylistID, songID);
                                skipMap.delete(songID);

                                if(skipMap.size < targetPlaylistSize){ //If below target size, add a similar song
                                    addRecommendedSong(dynplaylistID, getRandomKey(skipMap));
                                }

                        


                            }
                        }

                    }else{ //Session is not active yet
                        isSessionActive = true;
                    }


                    //update data
                    songID = body.item.id;
                    songProgress = body.progress_ms;
                    songDuration = body.item.duration_ms;





                }else{
                    isSessionActive = false;
                }

            }else{
                console.log('Failed to get currently playing playlist');

            }
            

            



        });



    }
}, 1000);



