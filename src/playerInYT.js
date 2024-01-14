"use strict";

class Player {
    constructor( tabId, onStateChangeFn ) {
        this.tabId = tabId;
        this.prevState = -1;
        
        this.intervalId = setInterval( async function ( self ) {
            let state = await self.getPlayerState();
            if ( state != self.prevState ) {
                console.log( "change", state, self.prevState );
                self.prevState = state;
                onStateChangeFn( self );
            }
        }, 1000, this );

        console.log( "constructor", this.getPlayerState(), this.getCurrentTime() );
    }

    async getPlayerState() {
        let result;
        try {
            let resp = await browser.scripting.executeScript( {
                target: {
                    tabId: this.tabId
                },
                func: function () {
                    return parseInt( document.getElementById( "state" ).value );
                }
            } );
            result = resp[ 0 ].result;
        } catch ( err ) {
            console.error( err );
        }
        return result;
    }
    async getCurrentTime() {
        let result;
        try {
            let resp = await browser.scripting.executeScript( {
                target: {
                    tabId: this.tabId
                },
                func: function () {
                    return parseInt( document.getElementById( "time" ).value );
                }
            } );
            result = resp[ 0 ].result;
        } catch ( err ) {
            console.error( err );
        }
        return result;
    }

    async getClientRect() {
        let result;
        try {
            let resp = await browser.scripting.executeScript( {
                target: {
                    tabId: this.tabId
                },
                func: function () {
                    let player_el = document.getElementById( "player" );
                    let rect = player_el.getBoundingClientRect();
                    return { x:rect.x, y:rect.y,
                             width: rect.width, height: rect.height };
                }
            } );
            result = resp[ 0 ].result;
        } catch ( err ) {
            console.error( err );
        }
        return result;
    }
}
async function createPlayerInYT( tabId, onStateChangeFn ) {
    return new Player( tabId, onStateChangeFn );
}
