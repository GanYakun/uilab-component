/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-08-22 14:38:04
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import PropTypes from 'prop-types';
import { Typography } from 'antd';
import { getConfig } from '../../Anotations/DataPoint'
import { SmartField } from '../config'

const DataPoint = (props) => {
    const {
        record,
        entitySet,
        property,
        isReadOnly,
        onBlur
    } = props
    const {
        Value: path,
        Visualization } = property
    let {
        displayValue,
    } = getConfig({ record, entitySet, path })

    //渲染入口
    const _render = () => {
        let option
        switch (Visualization) {
            case 'UI.VisualizationType/Rating':
                option = {
                    record,
                    entitySet,
                    path,
                    isReadOnly,
                    fieldType: 'Rate',
                    onBlur: (value) => {
                        onBlur(value, path, record)
                    }
                }
                return (
                    <SmartField
                        {...option}
                    />
                )
            case 'UI.VisualizationType/Progress':
                option = {
                    record,
                    entitySet,
                    path,
                    isReadOnly,
                    fieldType: 'Progress',
                    onBlur: (value) => {
                        onBlur(value, path, record)
                    },
                    dataPointProperty: property
                }
                return (
                    <SmartField
                        {...option}
                    />
                )
            default:
                option = {
                    record,
                    entitySet,
                    path,
                    isReadOnly,
                    onBlur: (value) => {
                        onBlur(value, path, record)
                    },
                    dataPointProperty: property
                }
                return (
                    isReadOnly ?
                        < Typography.Title
                            level={2}
                            style={{ marginLeft: 10, color: '#6a6d70', fontSize: 26 }
                            }>
                            {`${displayValue ? displayValue:''}`}
                        </Typography.Title > :
                        <SmartField
                            {...option}
                        />
                )
        }
    }

    return _render()
};

DataPoint.propTypes = {
    entitySet: PropTypes.string.isRequired,
};

DataPoint.defaultProps = {

};

export default DataPoint;