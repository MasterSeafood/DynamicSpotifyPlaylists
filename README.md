# Dynamic Spotify Playlists

A Node.js server to remove frequently-skipped tracks and add similar songs on a Spotify playlist.

## Details
The user first provides authorization using the Spotify Web API. Once the access token is retrieved, the server retrieves playlist data using the Spotify Web API and constantly monitors for skip events. When a track is skipped a certain amount of times, it is removed from the playlist and a new similar track is added depending on the size of the playlist. 

Written in **Javascript**

Uses: **Node.js (with Express), Spotify Web API**

## How to use
1. Clone or download this repository.
2. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) and create a new app.
   - In the settings, add `http://localhost:8888/callback` to "Redirect URIs"
3. Replace `CLIENT_ID` and `CLIENT_SECRET` in `auth.js` with the IDs found on the dashboard
4. Copy the link to the desired playlist, and replace `PLAYLIST_ID` in `app.js` with the ID portion of the link
   - For example, a link such as `https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM?si=e362beaca53a454b` would have an ID of `0vvXsWCC9xrXsKd4FyS8kM`
5. Optionally, modify the other settings such as `skipCountThreshold` and `targetPlaylistSize` to your preference
6. Install Node.js if you haven't already and run `node app.js` in the main directory of this repository

Enjoy!
 
