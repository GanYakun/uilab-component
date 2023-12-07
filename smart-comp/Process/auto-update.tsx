/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-07 15:04:13
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-07 15:34:10
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/auto-update.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
let lastSrcs: string | any[];

const scriptReg = /\<scripts.*src=["'](?<src>[^"']+)/gm

//获取最新页面中的script链接
async function extractNewScripts() {
    const html = await fetch('/?_timestamp=' + Date.now()).then((resp) => resp.text())
    console.log({ html })
    scriptReg.lastIndex = 0;
    let result = []
    let match: any;
    while ((match = scriptReg.exec(html))) {
        result.push(match.groups.src)
    }
    return result
}

async function needUpdate() {
    const newScripts = await extractNewScripts()
    if (!lastSrcs) {
        lastSrcs = newScripts;
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

const DURATION = 5000
function autoRefresh() {
    setTimeout(async () => {
        const willUpdate = await needUpdate()
        if (willUpdate) {
            const result = confirm('检测到新版本，是否更新？')
            if (result) {
                location.reload()
            }
        }
        autoRefresh()
    }, DURATION);
}

autoRefresh()