/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-02-02 16:50:42
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ProList } from '@ant-design/pro-components';
import { Button, Progress } from 'antd';
import { useState } from 'react';

const ListCard = (props) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const dataSource = [
        {
            title: '语雀的天空',
            avatar: 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
        },
        {
            title: 'Ant Design',
            avatar: 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
        },
        {
            title: '蚂蚁金服体验科技',
            avatar: 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
        },
        {
            title: 'TechUI',
            avatar: 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
        },
    ];

    return (
        <ProList
            metas={{
                title: {
                    render: () => (<div style={{
                        minWidth: 200,
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}>
                        <div style={{
                            width: '200px',
                        }}>
                            <div>K1023494</div>
                            <Progress percent={80} />
                        </div>
                    </div>),
                },
            }}
            rowKey="title"
            rowSelection={false}
            dataSource={dataSource} />
    )


};

ListCard.propTypes = {
};

ListCard.defaultProps = {

};

export default ListCard;