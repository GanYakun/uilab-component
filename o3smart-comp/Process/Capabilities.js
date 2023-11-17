

/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-30 10:50:44
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-03-28 20:55:21
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Process/UI.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Other from './Other'
const { getTextValueByData } = Other

/**
 * 判断当前对象是否 Insert、updata、delete，
 * Capabilities...
 * @param {*} annotations 当前对象的annotations
 * @returns 
 */
const getObjectRestrictions = (annotations) => {
    let result = {
        Deletable: true,
        Insertable: true,
        Updatable: true,
        UnSortable: [],//禁止排序的字段
    };

    const _getValue = (record, currentType, currentProperty) => {
        let _result = true;
        for (let a of record) {
            const { propertyValue, type } = a;
            if (type === currentType) {
                if (propertyValue) {
                    for (let b of propertyValue) {
                        const { property, bool, collection } = b;
                        if (property === currentProperty) {
                            if (bool) {
                                const text = getTextValueByData('bool', b);
                                _result = text !== 'false';
                            }
                            if (collection) {
                                const arr = []
                                for (let c of collection) {
                                    const { propertyPath } = c
                                    for (let d of propertyPath) {
                                        const { text } = d
                                        arr.push(text)
                                    }
                                }
                                if (arr.length > 0) {
                                    _result = arr
                                }
                            }
                        }
                    }
                }
            }
        }
        return _result;
    };

    if (annotations) {
        //是否配置对应的Capabilities UI.CreateHidden
        for (let a of annotations) {
            const { term, record, bool } = a;
            switch (term) {
                case 'Capabilities.DeleteRestrictions':
                    result.Deletable = _getValue(record, 'Capabilities.DeleteRestrictionsType', 'Deletable');
                    break
                case 'Org.OData.Capabilities.V1.DeleteRestrictions':
                    result.Deletable = _getValue(record, 'Org.OData.Capabilities.V1.DeleteRestrictionsType', 'Deletable');
                    break
                case 'Capabilities.InsertRestrictions':
                    result.Insertable = _getValue(record, 'Capabilities.InsertRestrictionsType', 'Insertable');
                    break
                case 'Org.OData.Capabilities.V1.InsertRestrictions':
                    result.Insertable = _getValue(record, 'Org.OData.Capabilities.V1.InsertRestrictionsType', 'Insertable');
                    break
                case 'Capabilities.UpdateRestrictions':
                    result.Updatable = _getValue(record, 'Capabilities.UpdateRestrictionsType', 'Updatable');
                    break
                case 'Org.OData.Capabilities.V1.UpdateRestrictions':
                    result.Updatable = _getValue(record, 'Org.OData.Capabilities.V1.UpdateRestrictionsType', 'Updatable');
                    break
                case 'UI.UpdateHidden':
                    result.Updatable = bool && bool !== 'true'
                    break
                case 'Capabilities.SortRestrictions':
                    const UnSortableArr = _getValue(record, 'Capabilities.SortRestrictionsType', 'NonSortableProperties')
                    result.UnSortable = UnSortableArr ? UnSortableArr : []
                    break
                case 'Org.OData.Capabilities.V1.SortRestrictions':
                    const UnSortableArr1 = _getValue(record, 'Org.OData.Capabilities.V1.SortRestrictionsType', 'NonSortableProperties')
                    result.UnSortable = UnSortableArr1 ? UnSortableArr1 : []
                    break
                case 'UI.CreateHidden':
                    result.Insertable = bool && bool !== 'true'
                    break
            }
        }
    }

    return result;
};

export default {
    getObjectRestrictions
}
