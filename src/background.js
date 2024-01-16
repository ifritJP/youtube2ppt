if ( globalThis[ "chrome" ] === "undefine" ) {
    globalThis[ "chrome" ] = browser;
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "test") {
        return Promise.resolve( "dummy response" );
    }
});

// Open the UI to navigate the collection images in a tab.
chrome.action.onClicked.addListener( async () => {
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let activeTab = tabs[ 0 ];
    let url = new URL( activeTab.url );
    let query = url.searchParams;


    // activeTab の権限を有効にするため、
    // クリックを youtube と github.io の 2 回に分ける。
    // <all_urls> を指定すれば 2 回に分ける必要がないが、
    // <all_urls> は権限が大き過ぎるのでその対策。
    if ( url.host == "ifritjp.github.io" ) {
        await chrome.windows.create({
            type: "popup", url: `./popup.html?tabid=${activeTab.id}`,
            top: 0, left: 0, width: 300, height: 400,
        });
    } else {
        let rect;
        try {
            let result = await chrome.scripting.executeScript( {
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
        if ( videoId ) {
            let base = "https://ifritjp.github.io/sub/youtube2ppt/server/popup.html";
            let path = base + `?width=${rect.width}&height=${rect.height}`;
            path += "&videoid=" + videoId;

            await chrome.tabs.create({ url: path });
        }
    }
});
