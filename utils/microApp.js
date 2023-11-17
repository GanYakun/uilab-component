/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-09 12:07:33
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-09-01 17:19:12
 * @FilePath: /uilab/lib/utils/microApp.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import odata from './odata/odata';
import odatajs from './odata/index';
import storage from './storage/metadataStorage'
import { message } from 'antd';
const loginPath = '/user/login';

/**
 * 子应用初始化：
 * 1.解析当前应用的annotation.xml
 * 2.获取当前应用的matadata
 * 3.获取当前应用的manifest.json
 * @param {object} appConfig 
 */
const microAppInit = async (appConfig, appName) => {
    message.open({
        type: 'loading',
        content: '配置文件加载中..',
        duration: 0,
    });

    const { manifest, annotationUrl, i18nUrl, title, LaucnPadConfig } = appConfig
    let annotations = odatajs.oData.metadata.metadataParser(
        null,
        await getXmlDoc(annotationUrl),
    );
    const { id, dataSources } = manifest['sap.app']
    const { annotation, mainService } = dataSources
    const serviceUrl = mainService.uri.slice(1)
    window.serviceUrl = serviceUrl
    window.micrAppName = appName
    window.micrAppTitle = title
    let metadata = await getMetadata()
    //console.log({ serviceUrl, annotations, manifest, metadata, i18nData })

    //合并annotations
    //console.log({ annotations: annotations.dataServices.schema[0].annotations, metadata: metadata.dataServices.schema[0].annotations })
    if (annotations && annotations.dataServices) {
        metadata.dataServices.schema[0].annotations = metadata.dataServices.schema[0].annotations ? metadata.dataServices.schema[0].annotations : []
        metadata.dataServices.schema[0].annotations = annotations.dataServices.schema[0].annotations ? metadata.dataServices.schema[0].annotations.concat(annotations.dataServices.schema[0].annotations) : metadata.dataServices.schema[0].annotations
    }
    //await storage.clear()
    await storage.set(appName, {
        manifest,
        metadata,
        serviceUrl,
        LaucnPadConfig
    })
    return {
        manifest,
        metadata,
        serviceUrl,
        i18nJson: i18nUrl ? await getI18nJson(i18nUrl) : null
    }
}

/**
 * 获取xmlDoc对象，兼容浏览器
 * @param {string} path 
 * @returns 
 */
const getXmlDoc = async (path) => {
    return new Promise((resolve, reject) => {
        let oReq = new XMLHttpRequest();
        oReq.open('GET', path);
        oReq.send();
        oReq.onload = function () {
            if (oReq.readyState === oReq.DONE) {
                if (oReq.status === 200) {
                    resolve(oReq.responseText);
                }
            } else {
                reject(false);
            }
        };
    });
};

/**
 * 获取metadata对象，兼容浏览器
 * @param {string} path 
 * @returns 
 */
const getMetadata = async () => {
    const options = {
        path: `$metadata`,
        parameters: {
        },
    };
    const result = await odata.read(options, odatajs.oData.metadataHandler);
    if (result) {
        message.destroy()
        const { data, statusCode } = result
        if (statusCode < 300) {
            return data
        } else if (statusCode === 401) {
            window.history.pushState(null, '', `${loginPath}`)
            message.open({
                type: 'error',
                content: '登录状态失效，请重新登录!',
            });
        } else {
            window.history.pushState(null, '', `${loginPath}`)
            message.open({
                type: 'error',
                content: `服务器请求异常，状态码:${statusCode}`,
            });
        }
    }
}

/**
 * 获取I18n配置文件
 * @param {string} path 
 * @returns 
 */
const getI18nJson = async (i18nUrl) => {
    const i18nJson = {}
    let i18nData = await getXmlDoc(i18nUrl)
    let resArr = i18nData.split('\n')
    for (let item of resArr) {
        if (item.search('=') !== -1) {
            const arr = item.split('=')
            if (arr.length === 2) {
                i18nJson[`{@i18n>${arr[0]}}`] = arr[1]
            }
        }
    }
    return i18nJson
}

export default { microAppInit, getXmlDoc }