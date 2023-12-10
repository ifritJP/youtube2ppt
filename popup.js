"use strict";

if ( typeof browser !== 'undefined' ) {
    browser.runtime.onMessage.addListener(async (msg) => {
    });

    browser.runtime.sendMessage({type: "test"}).then(async res => {
        console.log( res );
    });
}
