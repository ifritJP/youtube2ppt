browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === "test") {
        return Promise.resolve( "dummy response" );
    }
});

// Open the UI to navigate the collection images in a tab.
browser.browserAction.onClicked.addListener( async () => {

    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    let activeTab = tabs[ 0 ];
    let url = new URL( activeTab.url );
    let query = url.searchParams;


    let rect;
    try {
        let result = await browser.scripting.executeScript( {
            target: {
                tabId: activeTab.id
            },
            func: function () {
                let rect = document.getElementById( "ytd-player" ).getBoundingClientRect();
                return { width: Math.floor(rect.width),
                         height: Math.floor( rect.height ) };
            }
        } );
        rect = result[ 0 ].result;
    } catch ( err ) {
        console.error( err );
    }
    
    

    let videoId = query.get( "v" );
    let path = `./popup.html?width=${rect.width}&height=${rect.height}`;
    
    if ( videoId ) {
        path += "&videoid=" + videoId;
    }
    try {
        await browser.windows.create({
            type: "popup", url: path,
            //type: "normal", url: "/popup.html",
            top: 0, left: 0, width: rect.width, height: rect.height + 100,
        });
    } catch (err) {
        console.error(err);
    }
});
