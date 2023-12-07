/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-07 15:04:13
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-07 16:17:32
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/auto-update.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import localStorage from 'localStorage';
import { getLocale } from 'umi'
let lastSrcs: any[] = JSON.parse(localStorage.getItem('lastSrcs'));
const scriptReg = /\<script.*src=["'](?<src>[^"']+)/gm

//获取最新页面中的script链接
async function extractNewScripts() {
    const html = await fetch('/?_timestamp=' + Date.now()).then((resp) => resp.text())
    scriptReg.lastIndex = 0;
    let result = []
    let match: any;
    while ((match = scriptReg.exec(html))) {
        result.push(match.groups.src)
    }
    return result
}

//判断是否需要更新
async function needUpdate() {
    const newScripts = await extractNewScripts()
    console.log({ newScripts, lastSrcs, getLocale: getLocale() })
    if (!lastSrcs) {
        lastSrcs = newScripts;
        localStorage.setItem('lastSrcs', JSON.stringify(lastSrcs));
        return false
    }
    let result = false
    if (lastSrcs.length !== newScripts.length) {
        result = true
    }
    for (let i = 0; i < lastSrcs.length; i++) {
        if (lastSrcs[i] !== newScripts[i]) {
            result = true
            break
        }
    }
    lastSrcs = newScripts;
    return result
}

/**
 * 自动刷新
 */
const DURATION = 5000
function autoRefresh() {
    setTimeout(async () => {
        const willUpdate = await needUpdate()
        if (willUpdate) {
            const result = confirm(getLocale() === 'en' ? 'New version detected, do you want to update it?' : '检测到新版本，是否更新?')
            if (result) {
                localStorage.removeItem('lastSrcs')
                location.reload()
            }
        }
        autoRefresh()
    }, DURATION);
}

autoRefresh()