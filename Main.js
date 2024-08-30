const SPOTIFY_userId = "USER_ID";
const SPOTIFY_clientToken = "CLIENT_TOKEN";
const SPOTIFY_authToken = "AUTH_TOKEN";
const YOUTUBE_apiKey = "YOUTUBE_API";

const youtubePlaylistId = `PLAYLIST_ID`;
const spotifyPlaylistTitle = `PLAYLIST_NAME`;
const spotifyPlaylistDescription = `PLAYLIST_DESCRIPTION`;

async function SPOTIFY_createNewPlaylist(playlistTitle, playlistDescription) {
    try {
        const response = await fetch(`https://api.spotify.com/v1/users/${SPOTIFY_userId}/playlists`, {
            method: "POST",
            headers: {
                "Authorization": SPOTIFY_authToken,
                "client-token": SPOTIFY_clientToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: playlistTitle,
                description: playlistDescription,
                public: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function SPOTIFY_searchSong(query) {
    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
            method: "GET",
            headers: {
                "Authorization": SPOTIFY_authToken,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.tracks.items;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function SPOTIFY_findSong(query) {
    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
            method: "GET",
            headers: {
                "Authorization": SPOTIFY_authToken,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const tracks = data.tracks.items;

        const queryLower = removeAccents(query.toLowerCase());
        const isRemixSearch = queryLower.includes("remix");

        for (let track of tracks) {
            const trackName = removeAccents(track.name.toLowerCase());
            const artists = track.artists.map(artist => removeAccents(artist.name.toLowerCase()));

            if (queryLower.includes(trackName) && artists.some(artist => queryLower.includes(artist))) {
                if (isRemixSearch) {
                    if (trackName.includes("remix")) {
                        return track;
                    }
                } else {
                    return track;
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function SPOTIFY_addTrackToPlaylist(playlistId, trackUri) {
    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: "POST",
            headers: {
                "Authorization": SPOTIFY_authToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uris: [trackUri]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function YOUTUBE_getPlaylistSongs(playlistId) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_apiKey}`;
    let songs = [];
    let nextPageToken = '';

    try {
        do {
            const response = await fetch(`${url}&pageToken=${nextPageToken}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            data.items.forEach(item => {
                songs.push(item.snippet.title);
            });

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        return songs;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function convertYouTubeToSpotify(youtubePlaylistId, spotifyPlaylistTitle, spotifyPlaylistDescription) {
    // Step 1: Get songs from YouTube playlist
    const youtubeSongs = await YOUTUBE_getPlaylistSongs(youtubePlaylistId);
    if (!youtubeSongs) {
        console.error('Failed to retrieve YouTube playlist songs.');
        return;
    }

    // Step 2: Create a new Spotify playlist
    const spotifyPlaylist = await SPOTIFY_createNewPlaylist(spotifyPlaylistTitle, spotifyPlaylistDescription);
    if (!spotifyPlaylist) {
        console.error('Failed to create Spotify playlist.');
        return;
    }

    // Step 3: Search and add songs to Spotify playlist
    for (const songTitle of youtubeSongs) {
        const spotifyTrack = await SPOTIFY_findSong(songTitle);
        if (spotifyTrack) {
            await SPOTIFY_addTrackToPlaylist(spotifyPlaylist.id, spotifyTrack.uri);
        } else {
            console.warn(`Song not found on Spotify: ${songTitle}`);
        }
    }

    console.log(`Successfully converted YouTube playlist to Spotify playlist: ${spotifyPlaylist.external_urls.spotify}`);
}

convertYouTubeToSpotify(youtubePlaylistId, spotifyPlaylistTitle, spotifyPlaylistDescription);
