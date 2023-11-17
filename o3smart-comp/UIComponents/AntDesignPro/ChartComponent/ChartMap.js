import {
    Tooltip,
    Line,
    Point,
    Legend,
    Coordinate,
    Axis,
    Interval,
    Interaction,
} from 'bizcharts'

const BarChart = 'Bar'
const LineChart = 'Line'
const PieChart = 'Pie'
const ColumnChart = 'Column'

let chartMap = new Map()

const getBarChartMap = () => {
    let chartName = BarChart
    chartMap.set(chartName,
        <div>
            <Coordinate transpose scale={[1, -1]} />
            <Axis
                name="group"
                label={{
                    offset: 12
                }}
            />
            <Axis name="measure" position={"right"} />
            <Tooltip />
            {/* 凸显类型 color={['age', '#E6F6C8-#3376CB']} */}
            <Interval
                type="stack"
                position="group*measure"
                color={"color"}
                style={{
                    lineWidth: 1,
                    stroke: '#fff',
                }}
                adjust={[
                    {
                      type: "dodge",
                      marginRatio: 1 / 32
                    }
                  ]}
            >
            </Interval>
        </div>
    )

    return chartMap
}

const getLineChartMap = () => {
    let chartName = LineChart
    chartMap.set(chartName,
        <div>
            <Line
                position="group*measure"
                tooltip="measure"
                color="color"
            />
            <Point position="group*measure" shape='circle' />
            <Legend position="bottom"
            />
            <Tooltip />
        </div>
    )

    return chartMap
}

const getPieChartMap = () => {
    let chartName = PieChart
    chartMap.set(chartName,
        <div>
            <Coordinate type="theta" radius={1} />
            <Axis visible={false} />
            <Interval
                position="percent"
                adjust="stack"
                color="pieColor"
                style={{
                    // marginInline: 1000,
                    lineWidth: 1,
                    stroke: '#fff',
                }}
                state={{
                    selected: {
                        style: (t) => {
                            const res = getTheme().geometries.interval.rect.selected.style(t);
                            return { ...res, fill: 'red' }
                        }
                    }
                }}
            />
            <Interaction type='element-single-selected' />
        </div>
    )

    return chartMap
}

const getColumChartMap = () => {
    let chartName = ColumnChart
    chartMap.set(chartName,
        <div>
            <Interval
                adjust={[
                    {
                        type: 'dodge',
                        marginRatio: 0,
                        Grouped: 'color'
                    },
                ]}
                color="color"
                position="group*measure"
            />
            <Tooltip shared />
            <Interaction type="active-region" />
        </div>
    )

    return chartMap
}

const getChartMap = () => {
    getBarChartMap()
    getLineChartMap()
    getPieChartMap()
    getColumChartMap()
    return chartMap
}

export default {
    getBarChartMap,
    getLineChartMap,
    getPieChartMap,
    getChartMap,
    getColumChartMap
}
