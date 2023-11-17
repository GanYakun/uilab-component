/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-10-24 15:06:45
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2022-11-02 18:54:22
 * @FilePath: /uilab-gbms/lib/o3smart-comp/CustomComponents/Video/VideoSection.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './index.less';
import "videojs-flvjs-es6";
import odata from '../../../utils/odata/odata';


export const VideoJS = (props) => {
    const videoRef = useRef();
    const playerRef = useRef();
    const { onReady, queryEntity, record } = props;
    let timer

    //心跳检测
    const sendTranscodingRequest = async () => {
        let option = {
            path: `${queryEntity}/com.dpbird.sendTranscodingRequest`,
            method: 'POST',
            parameters: {},
        };
        timer = setTimeout(async () => {
            const result = await odata.submit(option)
            if (result && result.data) {
                console.log({ sendTranscodingRequest: result })
                sendTranscodingRequest()
            } else {
                clearTimeout(timer)
            }
        }, 10000);
    }

    useEffect(() => {
        if (record) {
            const { videoUrl, videoFormat } = record
            const options = {
                autoplay: true,
                controls: true,
                paused: true,
                sources: [{
                    src: videoUrl,
                    type: videoFormat
                }]
            }
            console.log({ videoOption: options })
            // Make sure Video.js player is only initialized once
            if (!playerRef.current) {
                const videoElement = videoRef.current;

                if (!videoElement) return;

                const player = playerRef.current = videojs(videoElement, options, () => {
                    videojs.log('player is ready');
                    sendTranscodingRequest()
                    onReady && onReady(player);
                });

                // You could update an existing player in the `else` block here
                // on prop change, for example:
            } else {
                const player = playerRef.current;

                player.autoplay(options.autoplay);
                player.src(options.sources);
            }
        }

    }, [record, videoRef]);

    // Dispose the Video.js player when the functional component unmounts
    useEffect(() => {
        const player = playerRef.current;
        return () => {
            if (player) {
                player.dispose();
                playerRef.current = null;
            }
            if (timer) {
                clearTimeout(timer)
            }
        };
    }, [playerRef]);

    return (
        <div data-vjs-player>
            <video ref={videoRef} className='video-js vjs-big-play-centered' />
        </div>
    );
}

export default VideoJS;
