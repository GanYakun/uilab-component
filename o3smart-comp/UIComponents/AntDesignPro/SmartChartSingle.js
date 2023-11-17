/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-01-11 18:12:10
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { EditableProTable } from '@ant-design/pro-components';

import {
    Chart
} from 'bizcharts';
import PropTypes from 'prop-types';
import { Button, Divider, Select, Popover, Space, Row, Col } from 'antd'
import { getConfig } from '../../Anotations/SmartChartSingle'
import ChartRegister from './ChartComponent/ChartRegister';
const { getChartName, getChartComponent } = ChartRegister

//获取聚合字段标签
const getMeasureLabel = (measure, chartConfigObj) => {

    let measureLabel = chartConfigObj.aggregatedPropertyList[measure] ?
        chartConfigObj.aggregatedPropertyList[measure].text : measure

    return measureLabel
}

const SmartChartSingle = (props) => {
    const {
        entitySet,
        qualifier,
        targetPath,
        queryEntity
    } = props

    let {
        Analytics,
        annoRequest,
        chartConfigObj
    } = getConfig({ entitySet, qualifier, targetPath, queryEntity })

    //参数准备
    const [currentRecord, setCurrentRecord] = useState(null)       //currentRecord:当前图表数据源
    const [repeatRequestRecord, setRepeatRequest] = useState(null) //repeatRequestRecord:当前图表配置项字段
    let fileReader = new FileReader()
    //将变更后的图表配置项内容拼接成可发送请求的参数
    let Dimensions = []
    let Measures = []
    if (repeatRequestRecord != null) {
        for (let key of repeatRequestRecord) {
            if (key.dimension) {
                Dimensions.push({
                    text: key.dimension,
                    dimensionType: key.dimensionType
                })
            } else if (key.measure) {
                Measures.push({
                    text: key['measure'],
                    measureType: key.measureType
                })
            }
        }
    } else {
        for (let key of chartConfigObj.dimensionTypes) {
            Dimensions.push({
                text: key.dimension,
                dimensionType: key.dimensionType
            })
        }
        for (let key of chartConfigObj.measures) {
            Measures.push({
                text: key.measure,
                measureType: key.measureType
            })
        }
    }

    //请求图表数据
    const fetch = async () => {
        const result = await annoRequest({ Dimensions, Measures })
        if (result) {
            setCurrentRecord(result.data)
            console.log({ ChartResult: result.data }, 'result.data')
        }
    }
    useEffect(() => {
        fetch()
    }, [repeatRequestRecord])

    //拼接图表组件所需数据源
    const _setChartData = () => {
        let dataChart = []
        let total = 0

        if (currentRecord != null) {
            for (let annoRecordKey of currentRecord.value) {
                for (let measureKey of Measures) {
                    total += annoRecordKey[measureKey.text]
                }
            }
            for (let measureKey of Measures) {

                for (let annoRecordKey of currentRecord.value) {
                    let color = ''
                    let group = ''
                    let measure = getMeasureLabel(measureKey.text, chartConfigObj).toString();

                    for (let dimensionKey of Dimensions) {
                        let dim = annoRecordKey[dimensionKey.text];
                        if (dimensionKey.dimensionType == 'Series') {
                            color = color == '' ? dim : `${color}/ ${dim}`
                        }
                        if (dimensionKey.dimensionType == 'Category') {
                            group = group == '' ? dim : `${group}/ ${dim}`
                        }
                    }

                    if (group == '') {
                        group = `${measure}`
                    } else {
                        color = color == '' ? `${measure}` : `${color}/ ${measure}`
                    }

                    dataChart.push({
                        color: color,
                        group: group,
                        measure: annoRecordKey[measureKey.text],
                        pieColor: `${group}/ ${color}`,
                        percent: parseFloat((annoRecordKey[measureKey.text] / total).toFixed(2))
                    })
                }
            }
        }
        return dataChart
    }

    let currentChartType = chartConfigObj.currentChartType
    const dataChart = _setChartData()
    return (
        <div>
            <SectionChartEnginine
                currentChartType={currentChartType}
                chartConfigObj={chartConfigObj}
                Analytics={Analytics}
                dataChart={dataChart}
                setRepeatRequest={setRepeatRequest}
            />
        </div>
    )
};


const chartTypeMap = {
    'Column': '柱状图',
    'Line': '折线图',
    'Bar': '条形图',
    'Pie': '饼状图',
    'Bubble': '气泡图',
}

const ChartReturn = ({ chart, chartType, handleChange, setRepeatRequest, currentChartType, Analytics, chartConfigObj }, ...props) => {
    return (
        <div>
            <ChartConfigBar handleChange={handleChange} setRepeatRequest={setRepeatRequest} currentChartType={currentChartType} Analytics={Analytics} chartConfigObj={chartConfigObj} />
            {chart[chartType]}
        </div>)
}

const chartTypeList = getChartName()


const SectionChartEnginine = ({ dataChart, currentChartType, Analytics, chartConfigObj, setRepeatRequest }, ...props) => {
   
    const [chartType, setChartType] = useState(currentChartType)
    const handleChange = (value) => {
        setChartType(value)
    }
    let chart = {}
 
    for (let key of chartTypeList) {
       
        let chartComponent = getChartComponent(key)
        chart[key] =
            <div style={{ width: "100%", height: "220px" }}>
                <Chart height="100%" width="95%" padding="auto" appendPadding={[0, 0, 0, 60]} data={dataChart} filter={[
                    ['measure', val => val != null]]} autoFit scale={scale} onIntervalClick={e => {
                        const states = e.target.cfg.element.getStates();
                    }}
                    interactions={['element-active']}>{chartComponent}
                </Chart>
            </div>
    }

    return <ChartReturn
        chartType={chartType} chart={chart} handleChange={handleChange}
        setRepeatRequest={setRepeatRequest} currentChartType={currentChartType}
        Analytics={Analytics} chartConfigObj={chartConfigObj}
    />
}


//图表类型选择组件
const SelectComponent = ({ handleChange, currentChartType }, ...props) => {
    let item = 0
    const selectOption = new Array(chartTypeList.length).fill(1).map((_, index) => {
        item++
        return { label: chartTypeMap[chartTypeList[item - 1]], value: chartTypeList[item - 1] }
    })
    return (
        <div>
            <Select
                onSelect={handleChange} style={{ width: 70, marginBottom: 10, marginTop: 20 }}
                defaultValue={chartTypeMap[currentChartType]}
                options={selectOption}
            >
            </Select>
        </div>
    )
}

//图表设置栏组件
const ChartConfigBar = ({ handleChange, currentChartType, Analytics, chartConfigObj, setRepeatRequest, ...props }) => {
    return (
        <div>
            <Row justify="end">
                <Space direction="horizontal" align="baseline" size="small">
                    <Col span={8}>
                        <Popover placement="right" title="视图设置" content={ChartOptionList({ Analytics, chartConfigObj, setRepeatRequest })} trigger="click">
                            <Button icon={<SettingOutlined />} type="dashed"></Button>
                        </Popover>
                    </Col>
                    <Col span={8}>
                        <SelectComponent handleChange={handleChange} currentChartType={currentChartType} />
                    </Col>
                </Space>
            </Row>
            <Divider style={{ marginTop: 0 }} />
        </div>
    )
}


//图表配置项（图表维度、维度类型及度量、度量类型配置）组件
const ChartOptionList = ({ chartConfigObj, setRepeatRequest, ...props }) => {
    let measureKey = chartConfigObj.measures
    let dimensionKey = chartConfigObj.dimensionTypes

    const [editableKeys2, setEditableRowKeys2] = useState(() => measureKey.map((item) => item.id));
    const [dataSource2, setDataSource2] = useState(() => measureKey);
    const [editableKeys, setEditableRowKeys] = useState(() => dimensionKey.map((item) => item.id2));
    const [dataSource, setDataSource] = useState(() => dimensionKey);



    const measureColumns = [
        {
            title: '度量',
            key: 'measure',
            dataIndex: 'measure',
            valueType: 'select',
            valueEnum: chartConfigObj.aggregatedPropertyList
        },
        {
            title: '类型',
            key: 'measureType',
            dataIndex: 'measureType',
            valueType: 'select',
            valueEnum: chartConfigObj.measureTypeList
        },
        {
            title: '操作',
            valueType: 'option',
            width: 250,
            render: () => {
                return null;
            },
        },
    ];

    const dimensionColumns = [
        {
            title: '维度',
            key: 'dimension',
            dataIndex: 'dimension',
            valueType: 'select',
            valueEnum: chartConfigObj.groupablePropertyList,
        },
        {
            title: '类型',
            key: 'dimensionType',
            dataIndex: 'dimensionType',
            valueType: 'select',
            valueEnum: chartConfigObj.dimensionTypeList
        },
        {
            title: '操作',
            valueType: 'option',
            width: 250,
            render: () => {
                return null;
            },
        },
    ];
    return (
        <div>
            <EditableProTable headerTitle="维" columns={dimensionColumns} rowKey="id2" scroll={{
                x: 960,
            }} value={dataSource} onChange={setDataSource} recordCreatorProps={{
                newRecordType: 'dataSource',
                record: () => ({
                    id2: Date.now(),

                }),
            }} toolBarRender={() => {
                return [
                    <Button type="primary" key="save" onClick={() => {
                        // dataSource 就是当前数据，可以调用 api 将其保存
                        let chartOptionListData = []
                        for (let key of dataSource) {
                            chartOptionListData.push({
                                dimension: key.dimension,
                                dimensionType: key.dimensionType
                            })
                        }
                        for (let key of dataSource2) {
                            chartOptionListData.push({
                                measure: key.measure,
                                measureType: key.measureType
                            })
                        }
                        setRepeatRequest(chartOptionListData)
                    }}>
                        保存数据
                    </Button>,
                ];
            }} editable={{
                type: 'multiple',
                editableKeys: editableKeys,
                actionRender: (row, config, defaultDoms) => {
                    return [defaultDoms.delete];
                },
                onValuesChange: (record, recordList) => {
                    console.log(recordList, 'recordList')
                    setDataSource(recordList);
                },
                onChange: setEditableRowKeys
            }} />
            <EditableProTable headerTitle="度" onChange={setDataSource2} columns={measureColumns} rowKey="id" scroll={{
                x: 960,
            }} value={dataSource2} recordCreatorProps={{
                newRecordType: 'dataSource',
                record: () => ({
                    id: Date.now(),
                }),
            }} editable={{
                type: 'multiple',
                editableKeys: editableKeys2,
                actionRender: (row, config, defaultDoms) => {
                    return [defaultDoms.delete];
                },
                onValuesChange: (record, recordList) => {
                    setDataSource2(recordList)
                },
                onChange: setEditableRowKeys2,
            }} />
        </div>
    );
}

const scale = {
    LifeExpectancy: {
        alias: '人均寿命（年）',
        nice: true,
    },
    Population: {
        // type: 'pow',
        alias: '人口总数'
    },
    GDP: {
        alias: '人均国内生产总值($)',
        nice: true,
    },
    Country: {
        alias: '国家/地区'
    },
    continent: {
        alias: '所属洲'
    },
    y: {
        alias: '销售量'
    }
};

const data = [
    {
        "continent": "Americas",
        "Country": "Argentina",
        "LifeExpectancy": 75.32,
        "GDP": 12779.37964,
        "Population": 40301927
    }, {
        "continent": "Americas",
        "Country": "Brazil",
        "LifeExpectancy": 72.39,
        "GDP": 9065.800825,
        "Population": 190010647
    }, {
        "continent": "Americas",
        "Country": "Canada",
        "LifeExpectancy": 80.653,
        "GDP": 36319.23501,
        "Population": 33390141
    }, {
        "continent": "Americas",
        "Country": "Chile",
        "LifeExpectancy": 78.553,
        "GDP": 13171.63885,
        "Population": 16284741
    }, {
        "continent": "Americas",
        "Country": "Colombia",
        "LifeExpectancy": 72.889,
        "GDP": 7006.580419,
        "Population": 44227550
    }, {
        "continent": "Americas",
        "Country": "Costa Rica",
        "LifeExpectancy": 78.782,
        "GDP": 9645.06142,
        "Population": 4133884
    }, {
        "continent": "Americas",
        "Country": "Cuba",
        "LifeExpectancy": 78.273,
        "GDP": 8948.102923,
        "Population": 11416987
    }, {
        "continent": "Americas",
        "Country": "Dominican Republic",
        "LifeExpectancy": 72.235,
        "GDP": 6025.374752,
        "Population": 9319622
    }, {
        "continent": "Americas",
        "Country": "Ecuador",
        "LifeExpectancy": 74.994,
        "GDP": 6873.262326,
        "Population": 13755680
    }, {
        "continent": "Americas",
        "Country": "El Salvador",
        "LifeExpectancy": 71.878,
        "GDP": 5728.353514,
        "Population": 6939688
    }, {
        "continent": "Americas",
        "Country": "Guatemala",
        "LifeExpectancy": 70.259,
        "GDP": 5186.050003,
        "Population": 12572928
    }, {
        "continent": "Americas",
        "Country": "Honduras",
        "LifeExpectancy": 70.198,
        "GDP": 3548.330846,
        "Population": 7483763
    }, {
        "continent": "Americas",
        "Country": "Jamaica",
        "LifeExpectancy": 72.567,
        "GDP": 7320.880262,
        "Population": 2780132
    }, {
        "continent": "Americas",
        "Country": "Mexico",
        "LifeExpectancy": 76.195,
        "GDP": 11977.57496,
        "Population": 108700891
    }, {
        "continent": "Americas",
        "Country": "Nicaragua",
        "LifeExpectancy": 72.899,
        "GDP": 2749.320965,
        "Population": 5675356
    }, {
        "continent": "Americas",
        "Country": "Panama",
        "LifeExpectancy": 75.537,
        "GDP": 9809.185636,
        "Population": 3242173
    }, {
        "continent": "Americas",
        "Country": "Paraguay",
        "LifeExpectancy": 71.752,
        "GDP": 4172.838464,
        "Population": 6667147
    }, {
        "continent": "Americas",
        "Country": "Peru",
        "LifeExpectancy": 71.421,
        "GDP": 7408.905561,
        "Population": 28674757
    }, {
        "continent": "Americas",
        "Country": "Puerto Rico",
        "LifeExpectancy": 78.746,
        "GDP": 19328.70901,
        "Population": 3942491
    }, {
        "continent": "Americas",
        "Country": "Trinidad and Tobago",
        "LifeExpectancy": 69.819,
        "GDP": 18008.50924,
        "Population": 1056608
    }, {
        "continent": "Americas",
        "Country": "United States",
        "LifeExpectancy": 78.242,
        "GDP": 42951.65309,
        "Population": 301139947
    }, {
        "continent": "Americas",
        "Country": "Uruguay",
        "LifeExpectancy": 76.384,
        "GDP": 10611.46299,
        "Population": 3447496
    }, {
        "continent": "Americas",
        "Country": "Venezuela",
        "LifeExpectancy": 73.747,
        "GDP": 11415.80569,
        "Population": 26084662
    }, {
        "continent": "Asia",
        "Country": "China",
        "LifeExpectancy": 72.961,
        "GDP": 4959.114854,
        "Population": 1318683096
    }, {
        "continent": "Asia",
        "Country": "Hong Kong, China",
        "LifeExpectancy": 82.208,
        "GDP": 39724.97867,
        "Population": 6980412
    }, {
        "continent": "Asia",
        "Country": "Japan",
        "LifeExpectancy": 82.603,
        "GDP": 31656.06806,
        "Population": 127467972
    }, {
        "continent": "Asia",
        "Country": "Korea, Dem. Rep.",
        "LifeExpectancy": 67.297,
        "GDP": 1593.06548,
        "Population": 23301725
    }, {
        "continent": "Asia",
        "Country": "Korea, Rep.",
        "LifeExpectancy": 78.623,
        "GDP": 23348.13973,
        "Population": 49044790
    }, {
        "continent": "Europe",
        "Country": "Albania",
        "LifeExpectancy": 76.423,
        "GDP": 5937.029526,
        "Population": 3600523
    }, {
        "continent": "Europe",
        "Country": "Austria",
        "LifeExpectancy": 79.829,
        "GDP": 36126.4927,
        "Population": 8199783
    }, {
        "continent": "Europe",
        "Country": "Belgium",
        "LifeExpectancy": 79.441,
        "GDP": 33692.60508,
        "Population": 10392226
    }, {
        "continent": "Europe",
        "Country": "Bosnia and Herzegovina",
        "LifeExpectancy": 74.852,
        "GDP": 7446.298803,
        "Population": 4552198
    }, {
        "continent": "Europe",
        "Country": "Bulgaria",
        "LifeExpectancy": 73.005,
        "GDP": 10680.79282,
        "Population": 7322858
    }, {
        "continent": "Europe",
        "Country": "Croatia",
        "LifeExpectancy": 75.748,
        "GDP": 14619.22272,
        "Population": 4493312
    }, {
        "continent": "Europe",
        "Country": "Czech Republic",
        "LifeExpectancy": 76.486,
        "GDP": 22833.30851,
        "Population": 10228744
    }, {
        "continent": "Europe",
        "Country": "Denmark",
        "LifeExpectancy": 78.332,
        "GDP": 35278.41874,
        "Population": 5468120
    }, {
        "continent": "Europe",
        "Country": "Finland",
        "LifeExpectancy": 79.313,
        "GDP": 33207.0844,
        "Population": 5238460
    }, {
        "continent": "Europe",
        "Country": "France",
        "LifeExpectancy": 80.657,
        "GDP": 30470.0167,
        "Population": 61083916
    }, {
        "continent": "Europe",
        "Country": "Germany",
        "LifeExpectancy": 79.406,
        "GDP": 32170.37442,
        "Population": 82400996
    }, {
        "continent": "Europe",
        "Country": "Greece",
        "LifeExpectancy": 79.483,
        "GDP": 27538.41188,
        "Population": 10706290
    }, {
        "continent": "Europe",
        "Country": "Hungary",
        "LifeExpectancy": 73.338,
        "GDP": 18008.94444,
        "Population": 9956108
    }, {
        "continent": "Europe",
        "Country": "Iceland",
        "LifeExpectancy": 81.757,
        "GDP": 36180.78919,
        "Population": 301931
    }, {
        "continent": "Europe",
        "Country": "Ireland",
        "LifeExpectancy": 78.885,
        "GDP": 40675.99635,
        "Population": 4109086
    }, {
        "continent": "Europe",
        "Country": "Italy",
        "LifeExpectancy": 80.546,
        "GDP": 28569.7197,
        "Population": 58147733
    }, {
        "continent": "Europe",
        "Country": "Montenegro",
        "LifeExpectancy": 74.543,
        "GDP": 9253.896111,
        "Population": 684736
    }, {
        "continent": "Europe",
        "Country": "Netherlands",
        "LifeExpectancy": 79.762,
        "GDP": 36797.93332,
        "Population": 16570613
    }, {
        "continent": "Europe",
        "Country": "Norway",
        "LifeExpectancy": 80.196,
        "GDP": 49357.19017,
        "Population": 4627926
    }, {
        "continent": "Europe",
        "Country": "Poland",
        "LifeExpectancy": 75.563,
        "GDP": 15389.92468,
        "Population": 38518241
    }, {
        "continent": "Europe",
        "Country": "Portugal",
        "LifeExpectancy": 78.098,
        "GDP": 20509.64777,
        "Population": 10642836
    }, {
        "continent": "Europe",
        "Country": "Romania",
        "LifeExpectancy": 72.476,
        "GDP": 10808.47561,
        "Population": 22276056
    }, {
        "continent": "Europe",
        "Country": "Serbia",
        "LifeExpectancy": 74.002,
        "GDP": 9786.534714,
        "Population": 10150265
    }, {
        "continent": "Europe",
        "Country": "Slovak Republic",
        "LifeExpectancy": 74.663,
        "GDP": 18678.31435,
        "Population": 5447502
    }, {
        "continent": "Europe",
        "Country": "Slovenia",
        "LifeExpectancy": 77.926,
        "GDP": 25768.25759,
        "Population": 2009245
    }, {
        "continent": "Europe",
        "Country": "Spain",
        "LifeExpectancy": 80.941,
        "GDP": 28821.0637,
        "Population": 40448191
    }, {
        "continent": "Europe",
        "Country": "Sweden",
        "LifeExpectancy": 80.884,
        "GDP": 33859.74835,
        "Population": 9031088
    }, {
        "continent": "Europe",
        "Country": "Switzerland",
        "LifeExpectancy": 81.701,
        "GDP": 37506.41907,
        "Population": 7554661
    }, {
        "continent": "Europe",
        "Country": "Turkey",
        "LifeExpectancy": 71.777,
        "GDP": 8458.276384,
        "Population": 71158647
    }, {
        "continent": "Europe",
        "Country": "United Kingdom",
        "LifeExpectancy": 79.425,
        "GDP": 33203.26128,
        "Population": 60776238
    }, {
        "continent": "Oceania",
        "Country": "Australia",
        "LifeExpectancy": 81.235,
        "GDP": 34435.36744,
        "Population": 20434176
    }, {
        "continent": "Oceania",
        "Country": "New Zealand",
        "LifeExpectancy": 80.204,
        "GDP": 25185.00911,
        "Population": 4115771
    }
];

const cols = {};

const colorMap = {
    Asia: '#1890FF',
    Americas: '#2FC25B',
    Europe: '#FACC14',
    Oceania: '#223273',
};

SmartChartSingle.propTypes = {
    entitySet: PropTypes.string.isRequired,
};

SmartChartSingle.defaultProps = {

};

export default SmartChartSingle;