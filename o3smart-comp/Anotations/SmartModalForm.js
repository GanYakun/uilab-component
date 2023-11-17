/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-09-27 17:02:07
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
    Other,
    Ui
} from '../Process/index';
import Odata from '../../utils/odata/odata';
import moment from 'moment'
const {
    parseActionByName,
    parseDataByPath
} = Other

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
let SmartModalFormConfig = {
    annoRequest: null,
    approverDataRequest: null,//审批类型的数据
}

//设置请求
const _setRequest = () => {
    return async (path, body, boundActionData, actionCollection, isQuickCreateAction, isQuickCreateActionType) => {
        //console.log({ path, body, boundActionData,isQuickCreateAction })
        //对于日期数据个数处理 格式化 
        for (let key of Object.keys(body)) {
            let times = body[key];
            let reg = /^[0-9,/:-\s]+$/;
            if ((typeof times === 'string' && times.constructor === String) && !isNaN(Date.parse(new Date(times.replace(/-/g, '/')))) && isNaN(times) && reg.test(times)) {
                console.log(times, "times是日期格式！")
                body[key] = moment(times).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
            }
        }

        //判断是否为QuickCreate 需要deepInsert
        if (isQuickCreateAction) {
            let currentBody = {}
            for (let key of Object.keys(body)) {
                if (key.search('/') === -1) {
                    currentBody[key] = body[key]
                } else {
                    const arr = key.split('/')
                    let obj = {};
                    let currentObj = obj;
                    for (let i = 0; i < arr.length; i++) {
                        let key1 = arr[i];
                        if (i === arr.length - 1) {
                            currentObj[key1] = body[key]; // 或者设置为你想要的默认值
                        } else {
                            currentObj[key1] = {};
                            currentObj = currentObj[key1];
                        }
                    }
                    currentBody = { ...currentBody, ...obj }
                }
            }
            let option = {
                path: `${path}`,
                body: currentBody,
            }
            switch (isQuickCreateActionType) {
                case 'create':
                    option.method = 'POST'
                    break;
                case 'edit':
                    option.method = 'PATCH'
                    break;
                case 'delete':
                    option.method = 'DELETE'
                    break;
                default:
                    break;
            }
            return await Odata.submit(option);
        } else {
            //判断是否是boundAction
            if (boundActionData && boundActionData.length > 0 && !actionCollection) {
                const arr = []
                boundActionData.map((item, index) => {
                    let option = {
                        path: `${item['@odata.id']}/${path}`,
                        method: 'POST',
                        headers: {},
                        body: body,
                    }

                    if (window['SAP-ContextId']) {
                        option.headers['SAP-ContextId'] = window['SAP-ContextId']
                    }
                    arr.push(option)
                })
                return await Odata.submit(arr);
            } else {
                let option = {
                    path,
                    method: 'POST',
                    headers: {},
                    body: body,
                };
                if (window['SAP-ContextId']) {
                    option.headers['SAP-ContextId'] = window['SAP-ContextId']
                }
                return await Odata.submit(option);
            }
        }
    }
}

//获取审批类型的数据
const _getApproverData = () => {
    return async (actionName, record) => {
        if (!SmartModalFormConfig.approverData && actionName === 'com.dpbird.SubmitApproval') {
            let option = {
                path: `${record['@odata.id']}/com.dpbird.GetApproverData()`,
                method: 'GET',
            }
            const result = await Odata.submit(option)
            return result?.data?.value;
        }
    }
}


/**
 * 解析入口
 */
const getConfig = (params) => {
    const { actionName, entitySet, record } = params
    SmartModalFormConfig = { ...parseActionByName(actionName) }
    SmartModalFormConfig.annoRequest = _setRequest(entitySet, actionName)
    SmartModalFormConfig.approverDataRequest = _getApproverData()
    //console.log({ SmartModalFormConfig })
    return SmartModalFormConfig
}

export {
    getConfig
}