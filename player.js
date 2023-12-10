let youTubeIframeAPIReady;

window.addEventListener( "load", function() {
    const save = setupFromURL( document.location.href );

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


function setupFromURL( urltxt ) {
    let url = new URL( urltxt );
    let query = url.searchParams;
    
    return setup( query.get( "videoid" ), query.get( "width" ), query.get( "height" ) );
}

function setup( video_id, player_width, player_height ) {
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
    
    const shrinkSize = 4;

    let browseCapture = true;
    let diff_thresh = 500000;
    if ( typeof browser == 'undefined' ) {
        browseCapture = false;
        diff_thresh = 1000;
    }

    
    let tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    class TimeInfo {
        constructor( sec, smallImage ) {
            this.sec = sec;
            this.smallImage = smallImage;
            this.scene = null;
            this.sameInfo = null;
        }
        
    }

    function createCanvasForImageData( imgData ) {
        let canvas = document.createElement("canvas");
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        let ctx = canvas.getContext( "2d" );
        ctx.putImageData( imgData, 0, 0 );
        return canvas;
    }


    function createCanvasForImage( img ) {
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        let ctx = canvas.getContext( "2d" );
        ctx.drawImage( img, 0, 0 );
        return canvas;
    }

    
    
    let timeMap = new Map();
    function timeKeySort() {
        let keyList = Array.from( timeMap.keys() ).sort( function( sec1, sec2 ) {
            if ( sec1 < sec2 ) {
                return -1;
            } else if (sec1 > sec2 ) {
                return 1;
            } else {
                return 0;
            }
        });
        return keyList;
    }


    async function save( progress ) {
        let pres = new PptxGenJS();

        let keyList = timeKeySort();
        for ( index = 0; index < keyList.length; index++ ) {
            const sec = keyList[ index ];
            progress( index, keyList.length );
            
            const timeInfo = timeMap.get( sec );
            const img = timeInfo.scene;
            if ( img ) {
                // 時間がかかる処理なので、 Promise 化する
                const promise = new Promise((resolve) => {
                    setTimeout(() => {

                        let slide = pres.addSlide();

                        // let textboxText = `Hello World from PptxGenJS! ${img.width}, ${img.height}`;
                        // let textboxOpts = { x: 1, y: 1, color: "363636" };
                        // slide.addText(textboxText, textboxOpts);

                        let canvas = createCanvasForImageData( img );
                        let url = canvas.toDataURL();
                        slide.addImage({ data: url,
                                         x: "10%", y: "5%", w: "80%", h:"80%"
                                       } );
                        resolve();
                    }, 1 );
                });                
                await promise;
            }
        }
        progress( keyList.length, keyList.length );
        

        await pres.writeFile();
    }

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
    

    /**
       指定秒数の timeInfo を取得する。
       
    */
    function getTimeInfo( sec ) {
        let prev = timeMap.get( sec );
        if ( prev === undefined ) {
            // timeMap に sec が登録されていない場合、
            // timeMap に登録されている時間情報をソートして、直前のものを探す
            let keyList = timeKeySort().reverse();
            const index = keyList.findIndex( ( key ) => timeMap.get( key ).sec <= sec );
            if ( index >= 0 )  {
                prev = timeMap.get( keyList[ index ] );
            }
        }
        if ( prev ) {
            if ( prev.sameInfo ) {
                if ( prev.sameInfo == prev ) {
                    return prev;
                }
                return getTimeInfo( prev.sameInfo.sec );
            }
            return prev;
        }
        return null;
    }

    /**
       timeInfo1, timeInfo2 に格納している smallImage の画像を比較して、
       シーンが異なるかどうかを判定する。

       現状は単純な差分の絶対値の合計が閾値を越えているかどうかで判定している。
    */
    function isSceneChange( timeInfo1, timeInfo2 ) {
        const img1 = timeInfo1.smallImage.data;
        const img2 = timeInfo2.smallImage.data;

        let totalDiff = 0;
        for ( index = 0; index < img1.length; index++ ) {
            const diff = img1[ index ] - img2[ index ];
            totalDiff += Math.abs( diff );
        }
        console.log( `diff total ${totalDiff} ${timeInfo1.sec}, ${timeInfo2.sec} `);
        return totalDiff > diff_thresh;
    }

    function onPlayerReady(event) {
        player.playVideo();
    }

    function onPlayerStateChange() {
        if ( player.getPlayerState() == 1 ) {
            if ( intervalId ) {
            } else {
                intervalId = setInterval( async function () {
                    // 再生中かどうか確認し、
                    // 再生画面をキャプチャして画面が切り替わっているかどうかの情報を、
                    // timeMap に設定する。
                    if ( player.getPlayerState() == 1 ) {
                        let sec = Math.floor( player.getCurrentTime() );
                        console.log( sec );
                        if ( timeMap.get( sec ) ) {
                        } else {
                            let img = await captureImage();
                            let small = await shrinkImage( img, shrinkSize );
                            let timeInfo = new TimeInfo( sec, small );
                            let prev = getTimeInfo( sec - 1 );
                            timeMap.set( sec, timeInfo );
                            if ( prev ) {
                                if ( isSceneChange( timeInfo, prev ) ) {
                                    timeInfo.scene = img;
                                    
                                    let div = document.getElementById( "app2" );
                                    let canvas = createCanvasForImageData( small );
                                    //let canvas = createCanvasForImageData( img );
                                    div.appendChild( canvas );
                                } else {
                                    timeInfo.sameInfo = prev;
                                }
                            } else {
                                timeInfo.scene = img;
                            }
                            if ( timeInfo.scene ) {
                                console.log( "scene change -- " + sec );
                            }
                        }
                    }
                }, 2000 );
            }
        } else {
            clearInterval( intervalId );
            intervalId = null;
        }
    }

    function stopVideo() {
        player.stopVideo();
    }

    async function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            img.src = url;
        });
    }

    /**
       表示中のカレントタブを画像データに変換して返す。
    */
    async function captureImage() {
        if ( browseCapture ) {
            let tabs = await browser.tabs.query({ active: true, currentWindow: true });
            let activeTab = tabs[ 0 ];

            // タブのスクリーンショットを取得
            let imageUrl = await browser.tabs.captureVisibleTab(
                activeTab.windowId, { format: 'png' } );

            let img = await loadImage( imageUrl );
            let canvas = createCanvasForImage( img );
            let ctx = canvas.getContext( "2d" );
            let playerEle = document.getElementById( "player" );
            let rect = playerEle.getBoundingClientRect();

            // スケールの調整
            let bodyRect = document.body.getBoundingClientRect();
            let magX = img.width / activeTab.width;
            let magY = img.height / activeTab.height;
            
            
            return ctx.getImageData( rect.x * magX, rect.y * magY,
                                     rect.width * magX, rect.height * magY );
        }

        // browseCapture が false の場合は、ダミー画像を生成して返す。
        let canvas = document.createElement("canvas");
        const height = 400;
        const width = height * 3;
        canvas.height = height;
        canvas.width = width;
            
        let ctx = canvas.getContext( "2d" );
        ctx.font = `${height}px serif`;
        let date = Date.now();
        const interval = 1;
        let txt = "" + Math.floor((Math.floor(date / 1000) % 1000) / interval) * interval;
        ctx.fillText( txt, 0, height );
        console.log( txt );

        const img = ctx.getImageData( 0, 0, width, height );
        return img;
    }

    /**
       img を mag 分の 1 に縮小した画像 ImageData を返す。
    */
    async function shrinkImage( imgData, mag ) {
        let canvasSrc = createCanvasForImageData( imgData );

        let canvas = document.createElement("canvas");
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        let ctx = canvas.getContext( "2d" );
        ctx.drawImage( canvasSrc, 0, 0, imgData.width/mag, imgData.height/mag );

        return await ctx.getImageData( 0, 0, imgData.width/mag, imgData.height/mag );
    }

    return save;
}

// www.youtube.com/iframe_api のスクリプトロード後、
// iframe_api のスクリプトからロードされる。
function onYouTubeIframeAPIReady() {
    youTubeIframeAPIReady();
}
