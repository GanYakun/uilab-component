/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-24 08:43:47
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartFilterBar'
// import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { QueryFilter } from '@ant-design/pro-components';
import { Input } from 'antd';
import "./index.less";
import { DownOutlined } from '@ant-design/icons';

type AdvancedSearchProps = {
    setTypeParams?: (params: any) => void;
    entitySet?: any;
};
export default (props: AdvancedSearchProps) => {
    const { entitySet, setTypeParams } = props
    const [currentState, setCurrentState] = useState<any>()
    const [searchText, setSearchText] = useState<{ key: string, value: string }[]>([]);
    const [showFilter, setShowFilter] = useState<boolean>(false);

    //初始化方法
    const init = async () => {
        const result = await getConfig({ entitySet })
        if (result) {
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])
    /**
     * 设置文本框的数据
     */
    useEffect(() => {
        if (currentState && currentState.annoSelectionFields && !searchText.length) {
            currentState.annoSelectionFields.forEach((item) => {
                searchText.push({
                    key: item.path,
                    value: ""
                })
            })
            setSearchText([...searchText])
        }
    }, [currentState])
    return (
        <div className='smart-filter-bar' onClick={() => setShowFilter(!showFilter)}>
            <div className='smart-filter-bar-standard'>
                <div onClick={(e) => {
                    e.stopPropagation()
                }}>
                    <span>标准*</span><DownOutlined />
                </div>
                {/* <div>
                    <DownOutlined />
                </div> */}
            </div>

            {showFilter ? (
                <QueryFilter
                    submitter={false}
                    span={24}
                    labelWidth="auto"
                    split
                >
                    <div className='smart-filter-bar-hover' onClick={(e) => {
                        e.stopPropagation()
                    }}>
                        <div className='smart-filter-bar-hover-ip' style={{ display: "flex" }}>
                            {
                                currentState?.annoSelectionFields && currentState?.annoSelectionFields.map((item, index) => {
                                    return <div key={index}>
                                        <span>{item.label}</span>
                                        <Input
                                            placeholder="请输入"
                                            value={searchText[index]?.value || ""}
                                            onChange={(e) => {
                                                searchText[index].value = e.target.value;
                                                setSearchText([...searchText]);
                                            }}
                                            style={{ maxWidth: 522, minWidth: 200, marginRight: 20 }}
                                        />
                                    </div>
                                })
                            }
                        </div>
                        <div className='smart-filter-bar-hover-op'>
                            <div onClick={() => {
                                setTypeParams && setTypeParams(searchText);
                            }}>执行</div>
                            <div onClick={() => {
                                let list: { key: string, value: string }[] = [];
                                searchText.forEach((item) => {
                                    list.push({
                                        ...item,
                                        value: ""
                                    })
                                })
                                setSearchText([...list]);
                                setTypeParams && setTypeParams([]);
                            }}>清空过滤</div>
                        </div>
                    </div>
                </QueryFilter>
            ) : null
            }
        </div >
    )
}
