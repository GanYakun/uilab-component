import {
    Chart,
    Tooltip,
    Line,
    Legend
} from 'bizcharts'

const LineChart = (props) => {
    let { dataChart } = props
    let chartName = getChartName()
    let chartMap = new Map()
    chartMap.set(
        chartName,
        <Chart height="100%" width="95%" padding="auto" data={dataChart} appendPadding={[0, 0, 0, 60]} autoFit scale={scale}>
           <Legend name="Population" visible={false} />
                <Point
                    position="GDP*LifeExpectancy"
                    color={["continent", val => {
                        return colorMap[val];
                    }]}
                    shape="circle"
                    size={["Population", [4, 65]]}
                    style={['continent', (val) => {
                        return {
                            lineWidth: 1,
                            strokeOpacity: 1,
                            fillOpacity: 0.3,
                            stroke: colorMap[val],
                        };
                    }]}
                    tooltip="continent*Country"
                />
                <Axis name='GDP' grid={{
                    line: {
                        style: {
                            stroke: '#e3e3e3'
                        }
                    }
                }} />
                <Axis name='LifeExpectancy' grid={{
                    line: {
                        style: {
                            stroke: '#e3e3e3'
                        }
                    }
                }} />
        </Chart>
    )

    return chartMap
}


export default LineChart
