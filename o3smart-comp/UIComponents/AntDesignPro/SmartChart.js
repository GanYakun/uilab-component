import { useState, useEffect } from 'react';
import { getConfig } from '../../Anotations/SmartChart'
import { array_get } from '../../../utils/util';
import React from "react";
import {
  Chart,
  Area,
  Line,
  Legend,
  Tooltip,
  Axis,
  Coord,
  Geom,
  Annotation,
  View,
  PieChart,
  Coordinate,
  Interval,
  Point,
  getTheme,
  Interaction,
  BulletChart
} from 'bizcharts';

const SmartChart = (props) => {
  const {
    entitySet,
    record,
    isSet,
    queryEntity,
    chartAnnotation,
    target,
    mode,
    inSection
  } = props

  //Chart相关方法
  //将图表数据转化为标签所需要的数据格式（单位精度转换）
  const labelTest = (num, accuracy) => {
    if (accuracy) {
      if (num < 5000) {
        num = num
      }
      else if (num >= 5000 && num < 100000000) {
        num = (num / 10000).toFixed(accuracy) + '万'
      } else if (num > 100000000) {
        num = (num / 100000000).toFixed(accuracy) + '亿'
      }
    } else {
      if (num < 5000) {
        num = num
      }
      else if (num >= 5000 && num < 100000000) {
        num = Math.round(num / 10000) + '万'
      } else if (num > 100000000) {
        num = Math.round(num / 100000000) + '亿'
      }
    }
    return num
  }

  const getTargetValue = (data, dataPointObject, target) => {
    let targetValue = 0;
    if (array_get(dataPointObject, target + '.decimal')) {
      targetValue = array_get(dataPointObject, target + '.decimal');
    }
    else if (data[array_get(dataPointObject, target + '.path')]) {
      targetValue = data[array_get(dataPointObject, target + '.path')];
    }

    return parseInt(targetValue) || 0;

  }

  const [options, setOptions] = useState(null);

  // //入口
  useEffect(() => {
    getOptions();
  }, []);


  const getOptions = async () => {
    const { chartConfigObj, chartConfig, annoRequest } = getConfig({
      record,
      entitySet,
      queryEntity,
      chartAnnotation,
      isSet,
      target
    })

    let chart = (
      <><></></>
    )

    const _setChartData = (chartConfig, chartConfigObj) => {
      let dataForChart = [];
      let targetNavigation = {}
      if (chartConfigObj.entitySetFull.search('/') !== -1) {
        const arr = target.split('/')
        targetNavigation = arr[0]
      }
      let resultOfRecord = Object.keys(record)
      let count = 0
      switch (chartConfig.ChartType.enumMember) {
        case 'UI.ChartType/Column':
          if (resultOfRecord.includes(targetNavigation)) {
            for (let key2 of record[targetNavigation]) {
              if (count < 20) {
                dataForChart.push({
                  x: key2[chartConfigObj.oDimensions[0].text].toString(),
                  y: key2[chartConfigObj.oMeasures[0].text],
                  z: key2[array_get(chartConfigObj.dataPointObject, 'Criticality' + '.path')]
                })
                count++
              }
            }
          }
          break

        case 'UI.ChartType/Line':
          if (resultOfRecord.includes(targetNavigation)) {
            for (let key2 of record[targetNavigation]) {
              if (count < 100) {
                let measureData = key2[chartConfigObj.oMeasures[0].text]
                if (measureData == null){
                  measureData = 0;
                }
                dataForChart.push({
                  x: key2[chartConfigObj.oDimensions[0].text].toString(),
                  y: measureData,
                  z: '2'
                })
              }
              if (chartConfigObj.oMeasures[1] != undefined && count < 100) {
                let measureData = key2[chartConfigObj.oMeasures[1].text]
                if (measureData == null){
                  measureData = 0;
                }
                dataForChart.push({
                  x: key2[chartConfigObj.oDimensions[0].text].toString(),
                  y: measureData,
                  z: '3'
                })
                count++;
              }
              if (chartConfigObj.oMeasures[2] != undefined && count < 100) {
                let measureData = key2[chartConfigObj.oMeasures[2].text]
                if (measureData == null){
                  measureData = 0;
                }
                dataForChart.push({
                  x: key2[chartConfigObj.oDimensions[0].text].toString(),
                  y: measureData,
                  z: '1'
                })
              }
            }
          } 
          break

        case 'UI.ChartType/Bar':
          let maxValue = []
          if (resultOfRecord.includes(targetNavigation)) {
            for (let key2 of record[targetNavigation]) {
              dataForChart.push({
                x: key2[chartConfigObj.oDimensions[0].text].toString(),
                y: key2[chartConfigObj.oMeasures[0].text],
                z: key2[array_get(chartConfigObj.dataPointObject, 'Criticality' + '.path')],
              })
            }
            for (let key3 of dataForChart) {
              maxValue.push(key3.y)
            }
            maxValue = maxValue.sort(function (a, b) { return b - a })
            maxValue = maxValue[0]
            dataForChart = dataForChart.slice(0, 3).reverse()
            for (let key4 of record[targetNavigation]) {
              dataForChart.push({
                x: key4[chartConfigObj.oDimensions[0].text].toString(),
                y: maxValue - key4[chartConfigObj.oMeasures[0].text],
                z: null,
              })
            }
            dataForChart = dataForChart.slice(0, 6)
          }
          break

        case 'UI.ChartType/Area':
          if (resultOfRecord.includes(targetNavigation)) {
            for (let key2 of record[targetNavigation]) {
              if (count < 100) {
                dataForChart.push({
                  x: key2[chartConfigObj.oDimensions[0].text].toString(),
                  y: key2[chartConfigObj.oMeasures[0].text],
                  num: chartConfigObj.oMeasures[0].text
                });
                count++;
                if (chartConfigObj.dataPointObject.CriticalityCalculation) {
                  chartConfigObj.dataPointObject.CriticalityCalculation.record[0]['propertyValue'].some(function (item2) {
                    if (item2.decimal) {
                      dataForChart.push(
                        {
                          x: key2[chartConfigObj.oDimensions[0].text].toString(),
                          y: parseFloat(item2.decimal),
                          num: item2.property
                        }
                      );
                    }
                  });
                }
              }
            }
          }
          break

        case 'UI.ChartType/Pie':
          if (inSection == false || mode == "LineItem") {
            if (resultOfRecord.includes(chartConfigObj.oMeasures[0].text)) {
              let criticalityValue = getTargetValue(record, chartConfigObj.dataPointObject, 'Criticality')
              let max = getTargetValue(record, chartConfigObj.dataPointObject, 'MaximumValue');
              var value = getTargetValue(record, chartConfigObj.dataPointObject, 'Value');
              dataForChart = {
                data: [{
                  item: chartConfigObj.oMeasures[0].text,
                  percent: Math.round(value / max * 100) / 100,
                  max: max,
                  criticalityValue: criticalityValue
                },
                {
                  item: 'other',
                  percent: Math.round((max - value) / max * 100) / 100,
                  value: value,
                  criticalityValue: null
                }
                ]
              }
            }
          } 
          break

        case 'UI.ChartType/Bullet':
          if (resultOfRecord.includes(chartConfigObj.oMeasures[0].text)) {
            var forecastValue = getTargetValue(record, chartConfigObj.dataPointObject, 'ForecastValue');
            var maximumValue = getTargetValue(record, chartConfigObj.dataPointObject, 'MaximumValue');
            var value = getTargetValue(record, chartConfigObj.dataPointObject, 'Value');
            var chartTarget = getTargetValue(record, chartConfigObj.dataPointObject, 'TargetValue');
            dataForChart = {
              data: [
                {
                  title: '',
                  ranges: [
                    forecastValue,
                    maximumValue
                  ],
                  measures: [value],
                  target: [chartTarget],
                }
              ],
              measureField: 'measures',
              rangeField: 'ranges',
              targetField: 'target',
              xField: 'title',
              color: {
                range: ['#a1dbb1', '#a1dbb1'], measure: '#3fa45b', target: '#050506',
              },
              label: {
                measure: {
                  offsetX: -25,
                  offsetY: -30,
                  style: {
                    fill: '#fff',
                  }
                },
                target: {
                  offsetX: -20,
                  offsetY: 30,
                  style: {
                    fill: '#fff',
                  }
                }
              },
              size: {
                measure: 10, range: 18, target: 30
              },
              bulletStyle: {
                target: {
                  lineWidth: 2
                }
              },
              xAxis: {
                line: null,
              },
              yAxis: {
                label: null, grid: {
                  line: null
                }
              },
            };
            if (chartTarget == 0) {
              dataForChart.size.target = 0;
            }
            if (mode == 'LineItem') {
              dataForChart.size.range = 10;
              dataForChart.size.target = 0;
            }
          }
          break

        case 'UI.ChartType/Donut':
          if (resultOfRecord.includes(chartConfigObj.oMeasures[0].text)) {
            let targetValue = getTargetValue(record, chartConfigObj.dataPointObject, 'TargetValue');
            var value = getTargetValue(record, chartConfigObj.dataPointObject, 'Value');
            let criticalityValue = getTargetValue(record, chartConfigObj.dataPointObject, 'Criticality')
            dataForChart = {
              data: [{
                item: chartConfigObj.oMeasures[0].text,
                percent: value / targetValue,
                criticalityValue: criticalityValue
              },
              {
                item: 'other',
                percent: (targetValue - value) / targetValue,
                criticalityValue: null
              }
              ],
              content: {
                title: chartConfigObj.oMeasures[0].text,
                rate: Math.round(value / targetValue * 100) + '%'
              },
            }
          }
          break

        case 'UI.ChartType/BarStacked':
          let total = 0
          if (resultOfRecord.includes(targetNavigation)) {
            for (let key2 of record[targetNavigation]) {
              total += key2[chartConfigObj.oMeasures[0].text]
            }
            for (let key2 of record[targetNavigation]) {
              if (count < 31) {
                dataForChart.push({
                  x: chartConfigObj.oDimensions[0].text.toString(),
                  y: key2[chartConfigObj.oMeasures[0].text],
                  criticalityValue: key2[array_get(chartConfigObj.dataPointObject, 'Criticality' + '.path')],
                  type: key2[chartConfigObj.oDimensions[0].text],
                  percent: ((key2[chartConfigObj.oMeasures[0].text] / total) * 100).toFixed(2) + '%'
                })
                count++;
              }
            }
          }  
        default:
          break
      }
      return dataForChart
    }

    const dataForChart = _setChartData(chartConfig, chartConfigObj)
    switch (chartConfig.ChartType.enumMember) {
      case 'UI.ChartType/Area':
        chart = <ChartTypeArea dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Bullet':
        chart = <ChartTypeBullet dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Line':
        chart = <ChartTypeLine dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Redar':
        chart = <ChartTypeRedar dataChart={dataChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Pie':
        chart = <ChartTypePie dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Bar':
        chart = <ChartTypeBar dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Column':
        chart = <ChartTypeColumn dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/Donut':
        chart = <ChartTypeDonut dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      case 'UI.ChartType/BarStacked':
        chart = <ChartTypeBarStacked dataChart={dataForChart} chartConfigObj={chartConfigObj} />
        break
      default:
        break
    }
    setOptions({
      chart
    });
  }


  //Custom-Defined component
  const ChartDescription = ({ chartConfigObj, mode }) => {
    let descriptionContent = chartConfigObj.chartDescription
    let descriptionDisplay = 'block'
    let accessibilityDisplay = 'none'
    if (descriptionContent == undefined) {
      accessibilityDisplay = 'block'
    }
    if (mode == 'LineItem') {
      descriptionDisplay = 'none';
    }
    return (
      <div>
        <div className='accessibility' style={{ display: accessibilityDisplay, height: 20.83, width: 168 }}></div>
        <div className="chartDescription" style={{
          display: descriptionDisplay, verticalAlign: 'top', maxWidth: '100%',
          textOverflow: 'ellipsis', textAlign: 'left', fontSize: '.875rem', fontWeight: 'normal', borderRadius: '0.25rem',
          cursor: 'text', fontFamily: '"72","72full",Arial,Helvetica,sans-serif', color: '#6a6d70', marginBottom: 7.5
        }}>{descriptionContent}
        </div>
      </div>
    )
  }

  const MicroChartLabel = ({ dataChart, labelPosition, chartConfigObj }) => {
    let measureArr = []
    let dataChartArr = Object.values(dataChart)
    let topTitleLeft = labelTest(dataChartArr[0].y)
    let buttomTitleLeft = dataChartArr[0].x
    let buttomTitleRight = dataChartArr[dataChartArr.length - 1].x
    for (let key of dataChart) {
      if (key.num == chartConfigObj.oMeasures[0].text || key.num == undefined) {
        measureArr.push(key.y)
      }
    }
    let topTitleRight = labelTest(measureArr[measureArr.length - 1])
    if (labelPosition == 'top') {
      return (
        <div>
          <div style={{ textAlign: 'start', display: 'inline-block', width: 84, height: 16 }} className="topTitleLeft" >{topTitleLeft}</div>
          <div style={{ textAlign: 'end', display: 'inline-block', width: 84, height: 16 }} className="topTitleRight">{topTitleRight}</div>
        </div>
      )
    } else if (labelPosition == 'buttom') {
      return (
        <div>
          <div style={{ textAlign: 'start', display: 'inline-block', width: 84, height: 16 }} className="buttomTitleLeft" >{buttomTitleLeft}</div>
          <div style={{ textAlign: 'end', display: 'inline-block', width: 84, height: 16 }} className="buttomTitleRight">{buttomTitleRight}</div>
        </div>
      )
    }
  }

  const PieChartLabel = ({ dataChart, mode }) => {
    let upLabel = dataChart.data[1].value
    let downLabel = dataChart.data[0].max
    let headerLabelDisplay = 'inline-block'
    let tableLabelDisplay = 'none'
    if (mode == 'LineItem') {
      headerLabelDisplay = 'none';
      tableLabelDisplay = 'inline-block';
      upLabel = labelTest(dataChart.data[1].value, 3);
    }
    return (
      <div>
        <div className="pieChartHeaderLabel1" style={{ float: 'left', marginInline: 5, display: headerLabelDisplay }}>
          <div style={{ color: colorMapForColor[dataChart.data[0].criticalityValue], textAlign: 'match-parent', marginInline: 5, fontWeight: 'bold', fontSize: 20, height: 22.22, width: 50.06 }}>{upLabel + '.0'}</div> <div style={{ textAlign: 'center', fontSize: 18 }}>{downLabel}</div> </div>
        <div className="pieChartTableLabel" style={{ display: tableLabelDisplay, height: 16, width: 32 }}>
          <div style={{ color: colorMapForColor[dataChart.data[0].criticalityValue], textAlign: 'left', marginInline: 5, fontSize: 4, height: 16/* , width: 20 */ }}>{upLabel}</div> </div>
      </div>
    )
  }

  //Micro-Chart component
  const ChartTypePie = ({ dataChart, chartConfigObj, ...props }) => {
    const brandFill = "#dc0d0e";
    let pieColor = '#ccc'
    let height = 72, width = 72, radius = 0.95, outLayerWidth = 168, outLayerHeight = 72,
      chartBoxHeight = 72, chartBoxWidth = 72;

    if (mode == 'LineItem') {
      height = height / 4;
      width = width / 4;
      radius = 1;
      pieColor = '#fff'
      chartBoxWidth = 18;
      outLayerWidth = 54;
      chartBoxHeight = outLayerHeight = 18;
    }
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} mode={mode} />
        <div className="chartOutLayer" style={{ height: outLayerHeight, width: outLayerWidth, display: 'inline-block' }}>
          <div className="chartBox" style={{ float: 'left', display: 'inline-block', height: chartBoxHeight, width: chartBoxWidth }}>
            <Chart height={height} width={width} {...dataChart}  autoFit pure
            >
              <Coordinate type="theta" radius={radius} />
              <Tooltip showTitle={false} />
              <Axis visible={false} />
              <Interval
                position="percent"
                adjust="stack"
                color={['criticalityValue', val => {
                  if (val == null) { return pieColor } else { return colorMapForColor[val]; }
                }]}
                style={{
                  lineWidth: 1,
                  stroke: '#fff',
                }}
              />
            </Chart>
          </div>
          <PieChartLabel dataChart={dataChart} mode={mode} />
        </div>
      </div>
    )
  }

  const ChartTypeBullet = ({ dataChart, chartConfigObj, ...props }) => {
    let height = 32, width = 178;
    let display = 'inline-block'
    let topLabel = dataChart.data[0].target[0]
    let buttomLabel = dataChart.data[0].measures[0]
    if (mode == 'LineItem') {
      height = (height / 4) * 3;
      width = 95;
      display = 'none'
    }

    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} mode={mode} />
        <div className="topLabelBox" style={{ display: display, height: 16, width: 168 }} >
          <div className="chartLabel" style={{ display: display, height: 13, width: 53, position: 'relative', fontWeight: 'bold', maxWidth: '100%', textAlign: 'center', marginInline: 58, fontSize: '.75rem' }}>{topLabel}</div></div>
        <BulletChart height={height} padding="auto" appendPadding={[0, 0, 0, 0]} animate={false} width={width} {...dataChart} />
        <div className="buttomLabelBox" style={{ display: display, height: 16, width: 168 }} >
          <div className="buttomLabel" style={{ display: display, height: 13, width: 53, position: 'relative', fontWeight: 'normal', maxWidth: '100%', textAlign: 'center', marginInline: 58, fontSize: '.75rem' }}>{buttomLabel}</div>
        </div>
      </div>
    )
  }

  const ChartTypeDonut = ({ dataChart, chartConfigObj, ...props }) => {
    let labelValue = dataChart.content.rate
    let height = 72, width = 72, size = 5, fontSize = 18, innerRadius = 0.8, content = dataChart.content.rate,
      outLayerHeight = 72, chartBoxWidth = 72, chartBoxHeight = 72, outLayerWidth = 168, tableLabelDisplay = 'none';
    if (mode == 'LineItem') {
      height = height / 4;
      width = width / 4;
      size = size / 4;
      chartBoxHeight = chartBoxWidth = 18;
      outLayerWidth = 54;
      outLayerHeight = 18;
      content = null;
      tableLabelDisplay = 'inline-block';
    }
    const brandFill = "#dc0d0e";
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} mode={mode} />
        <div className="chartOutLayer" style={{ height: outLayerHeight, width: outLayerWidth }}>
          <div className="chartBox" style={{ display: 'inline-block', height: chartBoxHeight, width: chartBoxWidth, markerStart: 0 }}>
            <Chart {...dataChart} height={height} width={width} padding="auto" pure autoFit>
              <Legend visible={false} />
              {/* 绘制图形 */}
              <View
                {...dataChart}
                scale={{
                  percent: {
                    formatter: (val) => {
                      return (val * 100).toFixed(2) + "%";
                    },
                  },
                }}
              >
                <Coordinate type="theta" innerRadius={innerRadius} />
                <Annotation.Text
                  position={["50%", "50%"]}
                  content={content}
                  style={{
                    lineHeight: "240px",
                    fontSize: fontSize,
                    fill: colorMapForColor[dataChart.data[0].criticalityValue],
                    textAlign: "center",
                  }}
                />
                <Interval
                  position="percent"
                  adjust="stack"
                  color={['criticalityValue', val => {
                    if (val == null) { return '#ccc' } /* else if (val == undefined){ return 'blue'} */ else { return colorMapForColor[val]; }
                  }]}
                  size={size}
                  intervalConfig={{
                    style: { fillOpacity: 0.7 },
                    size: [
                      "item",
                      (item) => {
                        return item === "已完成" ? 8 : 8;
                      },
                    ],
                  }}
                />
              </View>
            </Chart></div>
          <div className="pieChartTableLabel" style={{ display: tableLabelDisplay, height: 16, width: 32 }}>
            <div style={{ color: colorMapForColor[dataChart.data[0].criticalityValue], textAlign: 'right', marginInline: 5, fontSize: 4, height: 16, width: 32 }}>{labelValue}</div> </div>
        </div>
      </div>
    )
  }

  const ChartTypeArea = ({ dataChart, chartConfigObj, ...props }) => {
    let height = 40.67, width = 168;
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} />
        <MicroChartLabel dataChart={dataChart} labelPosition='top' chartConfigObj={chartConfigObj} />
        <Chart height={height} width={width} data={dataChart} pure autoFit>
          <Area color="num" position="x*y" />
          <Line color="num" position="x*y" size={'1'} />
        </Chart>
        <MicroChartLabel dataChart={dataChart} labelPosition='buttom' chartConfigObj={chartConfigObj} />
      </div>
    )
  }

  const ChartTypeBarStacked = ({ dataChart, chartConfigObj, ...props }) => {
    let height = 56, width = 168;
    let typeCounter = 0;
    let colorString = 'criticalityValue'
    if (dataChart[0].criticalityValue == undefined) {
      colorString = 'type';
    }
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} />
        <div className="Box" style={{ display: 'block', width: 168, height: 10 }}></div>
        <Chart height={height} width={width} theme={{ maxColumnWidth: 120 }} data={dataChart} pure>
          <Coordinate transpose />
          <Interval adjust={[{ type: 'stack' }]}
            color={[colorString, val => {
              if (colorString == 'type') { let typeArr = []; if (!typeArr.includes(val)) { typeCounter = typeCounter + 1; val = typeCounter } return colorMapForBarStack[val] } else { return colorMapForColor[val] }
            }]}
            size={15.99}
            position="x*y"
            tooltip="percentage"
            style={{
              lineWidth: 1,
              stroke: '#fff',
            }}
            label={['percentage', {
              position: 'middle',
              offset: 0,
              style: { fill: '#fff' },
              layout: { type: 'limit-in-shape' }
            }]}
          />
          <Tooltip />
        </Chart>
      </div>
    )
  }

  const ChartTypeColumn = ({ dataChart, chartConfigObj }, ...proprs) => {
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} />
        <MicroChartLabel dataChart={dataChart} labelPosition='top' chartConfigObj={chartConfigObj} />
        <Chart height={42} width={168} padding="auto" data={dataChart} pure autoFit >
          <Interval
            position="x*y"
            tooltip="y"
            marginRatio={0.01}
            color={['z', val => {
              if (val[0] == "z") { return 'rgb(88, 153, 218)' } else { return colorMapForColor[val] }
            }]}
            size={(172 - 4 * dataChart.length) / dataChart.length}
          />
          <Tooltip />
        </Chart>
        <MicroChartLabel dataChart={dataChart} labelPosition='buttom' chartConfigObj={chartConfigObj} />
      </div>
    )
  }

  const ChartTypeBar = ({ dataChart, chartConfigObj, ...props }) => {
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} />
        <div style={{ width: 168, height: 82 }}>
          <Chart
            height={'100%'}
            width={'100%'}
            data={dataChart}
            size={6}
            padding="auto"
            appendPadding={[10, 0, 0, 0]}
            autoFit
            pure
          >
            <Annotation.Text
              position={["0%", '6%']}
              content={dataChart[2].x}
              style={{
                fontSize: 12,
                fontWeight: 'normal',
                fill: "#000",
              }}
            />
            <Annotation.Text
              position={["75%", '6%']}
              content={'val', val => { val = labelTest(dataChart[2].y, 3); return val }}
              style={{
                fontSize: 12,
                fontWeight: 'normal',
                fill: "#000",
              }}
            />
            <Annotation.Text
              position={["0%", "40%"]}
              content={dataChart[1].x}
              style={{
                fontSize: 12,
                fill: "#000",
                textAlign: "left",
              }}
            />
            <Annotation.Text
              position={["75%", "40%"]}
              content={'val', val => { val = labelTest(dataChart[1].y, 3); return val }}
              style={{
                fontSize: 12,
                fill: "#000",
                textAlign: "left",
              }}
            />
            <Annotation.Text
              position={["0%", "74%"]}
              content={dataChart[0].x}
              style={{
                fontSize: 12,
                fill: "#000",
                textAlign: "left",
              }}
            />
            <Annotation.Text
              position={["75%", "74%"]}
              content={'val', val => { val = labelTest(dataChart[0].y, 3); return val }}
              style={{
                fontSize: 12,
                fill: "#000",
                textAlign: "left",
              }}
            />
            <Coord transpose />
            <Axis name="x" visible={false} />
            <Axis name="y" visible={false} height={82} />
            <Tooltip />
            {/* 凸显类型 color={['age', '#E6F6C8-#3376CB']} */}
            <Interval
              type="stack"
              position="x*y"
              color={["z", val => { if (val == null) { return '#ccc' } else { if (val[0] == "z") { return 'rgb(88, 153, 218)' } else { return colorMapForColor[val] } } }]}

              size={6}
              style={{
                lineWidth: 1,
                stroke: '#fff',
              }}
              adjust={[
                {
                  type: 'stack',
                  reverseOrder: false,
                }
              ]}
            >
            </Interval>
          </Chart>
        </div>
      </div>
    )
  }

  const ChartTypeLine = ({ dataChart, chartConfigObj }, ...proprs) => {
    let height = 32, width = 157;
    return (
      <div>
        <ChartDescription chartConfigObj={chartConfigObj} />
        <MicroChartLabel dataChart={dataChart} labelPosition='top' chartConfigObj={chartConfigObj} />
        <Chart scale={{ sum: { min: 0, type: 'linear-strict' } }} autoFit height={height} width={width} pure data={dataChart}>
          <Line position="x*y" size={2} base={2} color={['z', val => { return colorMapForColor[val] }]} />
          <Tooltip shared={true} showCrosshairs />
        </Chart>
        <MicroChartLabel dataChart={dataChart} labelPosition='buttom' chartConfigObj={chartConfigObj} />
      </div>
    )
  }

  const colorMapForColor = {
    '0': '#5899DA',
    '1': '#dc0d0e',
    '3': '#3fa45b',
    '2': '#de890d',
  };

  const colorMapForBarStack = {
    '0': '#E8743B',
    '1': '#5899DA',
    '2': '#E8743B',
    '3': '#ED4A7B',
    '4': '#ED4A7B',
    '5': '#945ECF',
    '6': '#13A4B4',
    '7': '#525DF4',
    '8': '#BF3991',
    '9': '#6C8893',
    '10': '#EE6868',
    '11': '#2F6497',
    '12': '#5899DA'
  };


  //model chart component
  const ChartTypeRedar = ({ dataChart, ...props }) => {
    let height = 128.89, width = 200;
    if (mode == 'LineItem') {
      height = height / 2;
      width = width / 2;
    }
    return (
      <Chart
        height={height}
        width={width}
        data={dataChart}
        scale={scale}
        onAxisLabelClick={console.log}
        scale={{
          sum: {
            min: 0,
            max: 40000,
            alias: '销售量'
          }
        }}
      >
        <Coordinate type="polar" radius={0.85} />
        <Line
          position="dim*sum"
          size={3}
        />
        <Area
          position="dim*sum"
          color="#6294f9"
        />
        <Axis name="sum" grid={{ line: { type: 'line' } }} />
        <Axis
          name="dim"
          line={false}
          verticalLimitLength={40000}
          label={{
            autoHide: false,
            autoEllipsis: true
          }} />
      </Chart>
    )

  }

  //渲染入口
  const _render = () => {
    let { chart } = options;
    return chart;
  }
  return options && _render();
};

export default SmartChart;