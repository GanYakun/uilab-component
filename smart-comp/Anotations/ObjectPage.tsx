/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-27 14:22:44
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Utils from '../Process/utils'


/**
 * 获取manifest配置
 * @param {*} manifest 
 * @param {*} routeName 
 * @returns 
 */
const _getManifestConfig = async () => {
    const { manifest, routeName } = await Utils.getUi5Config()
    if (manifest) {
        const { options } = manifest['sap.ui5']['routing']['targets'][routeName]
        const { settings, } = options;
        const { entitySet } = settings;
        return {
            entitySet,
        }
    }
    return {}
}

const getConfig = async ({ location }) => {
    const { entitySet } = await _getManifestConfig()
    const { currentAnnotations, currentEntityTypeData } = await Utils.getEntitySetConfig(entitySet)

    console.log({
        currentAnnotations,
        currentEntityTypeData,
        location,
        entitySet
    })
    return {
        entitySet,
    }
}

export {
    getConfig
}