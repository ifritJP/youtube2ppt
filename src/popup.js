"use strict";

window.addEventListener( "load", async function() {
    const save = await setupFromURL( document.location.href, createPlayerInYT );

    document.getElementById( "save" ).addEventListener( "click", async function() {
        const progress = document.getElementById( "save-progress" );
        const progressing = document.getElementById( "save-progressing" );

        progress.style.display = "block";
        progress.value = 0;
        progress.max = 100;
        await save( function( index, max ) {
            if ( index == max ) {
                progressing.style.display = "block";
                progress.style.display = "none";
            } else {
                progress.max = max;
                progress.value = index;
            }
        });
        progress.value = progress.max;
        progressing.style.display = "none";
        progress.style.display = "block";
    } );
});


if ( typeof browser !== 'undefined' ) {
    browser.runtime.onMessage.addListener(async (msg) => {
    });

    browser.runtime.sendMessage({type: "test"}).then(async res => {
        console.log( res );
    });
}
