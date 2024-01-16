"use strict";

let youTubeIframeAPIReady;

const PLAYER_STATE_INI = -1;
const PLAYER_STATE_END = 0;
const PLAYER_STATE_PLAY = 1;
const PLAYER_STATE_PAUSE = 2;
const PLAYER_STATE_BUF = 3;
const PLAYER_STATE_READY = 5;


window.addEventListener( "load", async function() {
    setupFromURL( document.location.href );
});

async function setupFromURL( urltxt ) {
    let url = new URL( urltxt );
    let query = url.searchParams;
    
    return await setup( query.get( "videoid" ),
                        query.get( "width" ), query.get( "height" ) );
}

async function setup( video_id, player_width, player_height ) {
    if ( ! video_id ) {
        alert( "not found 'video_id'" );
        return;
    }
    if ( ! player_width ) {
        player_width = 1280;
    }
    if ( ! player_height ) {
        player_height = 640;
    }
    
    let tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    let player;
    let intervalId;
    youTubeIframeAPIReady = function () {
        player = new YT.Player('player', {
            height: player_height.toString( 10 ),
            width: player_width.toString( 10 ),
            videoId: video_id,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
            }
        });
    };
 
    async function onPlayerReady(event) {
        //await player.playVideo();
    }

    async function onPlayerStateChange() {
        return await onPlayerStateChangeFromYT( player );
    }

    let time_el = document.getElementById( "time" );
    let state_el = document.getElementById( "state" );
    async function onPlayerStateChangeFromYT( playerYT ) {
        console.log( "change", playerYT, playerYT.getPlayerState );
        let state = await playerYT.getPlayerState();
        if ( state_el.value != state ) {
            state_el.value = state;
            time_el.value = Math.floor( await playerYT.getCurrentTime() );
        }
        if ( state == PLAYER_STATE_PLAY ) {
            if ( intervalId ) {
            } else {
                intervalId = setInterval( async function () {
                    if ( await playerYT.getPlayerState() == PLAYER_STATE_PLAY ) {
                        time_el.value = Math.floor( await playerYT.getCurrentTime() );
                    }
                }, 100 );
            }
        } else {
            clearInterval( intervalId );
            intervalId = null;
        }
    }
}

// www.youtube.com/iframe_api のスクリプトロード後、
// iframe_api のスクリプトからロードされる。
function onYouTubeIframeAPIReady() {
    youTubeIframeAPIReady();
}
