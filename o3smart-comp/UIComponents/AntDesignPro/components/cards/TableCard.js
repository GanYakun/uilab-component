/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-02-02 14:43:17
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import PropTypes from 'prop-types';
import { Table } from 'antd';

const TableCard = (props) => {
    const {
        dataSource,
        tabs,
        columns
    } = props

    const currentColumns = columns.map((item) => {
        const { path, label, type } = item
        if (type === "UI.DataField") {
            return { title: label, dataIndex: path, ellipsis: true }
        }
    })

    console.log({ dataSource, currentColumns })

    return (
        <Table
            dataSource={dataSource}
            columns={currentColumns}
            rowKey='@odata.id'
            tableLayout='fixed'
            pagination={false}
        />
    )


};

TableCard.propTypes = {
};

TableCard.defaultProps = {

};

export default TableCard;