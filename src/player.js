"use strict";

let youTubeIframeAPIReady;

const PLAYER_STATE_INI = -1;
const PLAYER_STATE_END = 0;
const PLAYER_STATE_PLAY = 1;
const PLAYER_STATE_PAUSE = 2;
const PLAYER_STATE_BUF = 3;
const PLAYER_STATE_READY = 5;


async function setupFromURL( urltxt, setupPlayer ) {
    let url = new URL( urltxt );
    let query = url.searchParams;

    let activeTab = await browser.tabs.get( parseInt( query.get( "tabid" ) ) );
    
    return await setup( query.get( "videoid" ),
                        query.get( "width" ), query.get( "height" ),
                        activeTab, setupPlayer );
}

function loadPlayer() {
    let tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

class TimeInfo {
    constructor( sec, smallImage ) {
        this.sec = sec;
        this.smallImage = smallImage;
        this.scene = null;
        this.sameInfo = null;
    }
}

class Controller {
    static async create( video_id, player_width, player_height, activeTab, setupPlayer ) {
        let cont = new Controller( video_id, player_width, player_height, activeTab );
        if ( setupPlayer ) {
            cont.player = await setupPlayer(
                activeTab.id,
                async () => await cont.onPlayerStateChangeFromYT() );
        }
        return cont;
    }
    
    constructor( video_id, player_width, player_height, activeTab ) {
        this.activeTab = activeTab;
        if ( ! player_width ) {
            player_width = 1280;
        }
        this.player_width = player_width;
        if ( ! player_height ) {
            player_height = 640;
        }
        this.player_height = player_height;

        this.shrinkSize = 4;

        this.browseCapture = true;
        this.diff_thresh = 500000;
        if ( typeof browser == 'undefined' ) {
            this.browseCapture = false;
            this.diff_thresh = 1000;
        }
        

        this.timeMap = new Map();


        this.player = undefined;
        this.intervalId = undefined;
        youTubeIframeAPIReady = function ( self ) {
            return () => {
                if ( !video_id ) {
                    alert( "not found 'video_id'" );
                    return;
                }
                
                this.player = new YT.Player('player', {
                    height: self.player_height.toString( 10 ),
                    width: self.player_width.toString( 10 ),
                    videoId: video_id,
                    events: {
                        'onReady': () => self.onPlayerReady,
                        'onStateChange': () => self.onPlayerStateChange(),
                    }
                });
            };
        }(this);
    }


    createCanvasForImageData( imgData ) {
        let canvas = document.createElement("canvas");
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        let ctx = canvas.getContext( "2d" );
        ctx.putImageData( imgData, 0, 0 );
        return canvas;
    }


    createCanvasForImage( img ) {
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        let ctx = canvas.getContext( "2d" );
        ctx.drawImage( img, 0, 0 );
        return canvas;
    }

    
    
    timeKeySort() {
        let keyList = Array.from( this.timeMap.keys() ).sort( function( sec1, sec2 ) {
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


    async save( progress ) {
        let pres = new PptxGenJS();

        let keyList = this.timeKeySort();
        for ( let index = 0; index < keyList.length; index++ ) {
            const sec = keyList[ index ];
            progress( index, keyList.length );
            
            const timeInfo = this.timeMap.get( sec );
            const img = timeInfo.scene;
            if ( img ) {
                // 時間がかかる処理なので、 Promise 化する
                const promise = new Promise((resolve) => {
                    setTimeout(() => {

                        let slide = pres.addSlide();

                        // let textboxText = `Hello World from PptxGenJS! ${img.width}, ${img.height}`;
                        // let textboxOpts = { x: 1, y: 1, color: "363636" };
                        // slide.addText(textboxText, textboxOpts);

                        let canvas = this.createCanvasForImageData( img );
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

    /**
       指定秒数の timeInfo を取得する。
       
    */
    getTimeInfo( sec ) {
        let prev = this.timeMap.get( sec );
        if ( prev === undefined ) {
            // timeMap に sec が登録されていない場合、
            // timeMap に登録されている時間情報をソートして、直前のものを探す
            let keyList = this.timeKeySort().reverse();
            const index = keyList.findIndex(
                ( key ) => this.timeMap.get( key ).sec <= sec );
            if ( index >= 0 )  {
                prev = this.timeMap.get( keyList[ index ] );
            }
        }
        if ( prev ) {
            if ( prev.sameInfo ) {
                if ( prev.sameInfo == prev ) {
                    return prev;
                }
                return this.getTimeInfo( prev.sameInfo.sec );
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
    isSceneChange( timeInfo1, timeInfo2 ) {
        const img1 = timeInfo1.smallImage.data;
        const img2 = timeInfo2.smallImage.data;

        let totalDiff = 0;
        for ( let index = 0; index < img1.length; index++ ) {
            const diff = img1[ index ] - img2[ index ];
            totalDiff += Math.abs( diff );
        }
        console.log( `diff total ${totalDiff} ${timeInfo1.sec}, ${timeInfo2.sec} `);
        return totalDiff > this.diff_thresh;
    }

    async onPlayerReady(event) {
        await this.player.playVideo();
    }

    async onPlayerStateChange() {
        return await this.onPlayerStateChangeFromYT();
    }

    async onPlayerStateChangeFromYT() {
        console.log( "change", this.player, this.player.getPlayerState );
        if ( await this.player.getPlayerState() == PLAYER_STATE_PLAY ) {
            if ( this.intervalId ) {
            } else {
                this.intervalId = setInterval( async function ( self ) {
                    // 再生中かどうか確認し、
                    // 再生画面をキャプチャして画面が切り替わっているかどうかの情報を、
                    // timeMap に設定する。
                    if ( await self.player.getPlayerState() == PLAYER_STATE_PLAY ) {
                        let sec = Math.floor( await self.player.getCurrentTime() );
                        console.log( sec );
                        if ( self.timeMap.get( sec ) ) {
                        } else {
                            let img = await self.captureImage();
                            let small = await self.shrinkImage( img, self.shrinkSize );
                            let timeInfo = new TimeInfo( sec, small );
                            let prev = self.getTimeInfo( sec - 1 );
                            self.timeMap.set( sec, timeInfo );
                            if ( prev ) {
                                if ( self.isSceneChange( timeInfo, prev ) ) {
                                    timeInfo.scene = img;
                                    
                                    let div = document.getElementById( "app2" );
                                    let canvas = self.createCanvasForImageData( small );
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
                }, 2000, this );
            }
        } else {
            clearInterval( this.intervalId );
            this.intervalId = null;
        }
    }

    async stopVideo() {
        await this.player.stopVideo();
    }

    async loadImage(url) {
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
    async captureImage() {
        if ( this.browseCapture ) {
            // let tabs = await browser.tabs.query({ active: true, currentWindow: true });
            // let activeTab = tabs[ 0 ];

            // タブのスクリーンショットを取得
            let imageUrl = await browser.tabs.captureVisibleTab(
                this.activeTab.windowId, { format: 'png' } );

            let img = await this.loadImage( imageUrl );
            let canvas = this.createCanvasForImage( img );
            let ctx = canvas.getContext( "2d" );
            let rect = await this.player.getClientRect();

            // スケールの調整
            let bodyRect = document.body.getBoundingClientRect();
            let magX = img.width / this.activeTab.width;
            let magY = img.height / this.activeTab.height;
            
            
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
    async shrinkImage( imgData, mag ) {
        let canvasSrc = this.createCanvasForImageData( imgData );

        let canvas = document.createElement("canvas");
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        let ctx = canvas.getContext( "2d" );
        ctx.drawImage( canvasSrc, 0, 0, imgData.width/mag, imgData.height/mag );

        return await ctx.getImageData( 0, 0, imgData.width/mag, imgData.height/mag );
    }
}


async function setup( video_id, player_width, player_height, activeTab, setupPlayer ) {

    let cont = await Controller.create(
        video_id, player_width, player_height, activeTab, setupPlayer );

    return async ( progress ) => cont.save( progress );
}

// www.youtube.com/iframe_api のスクリプトロード後、
// iframe_api のスクリプトからロードされる。
function onYouTubeIframeAPIReady() {
    youTubeIframeAPIReady();
}
