import ChartMap from './ChartMap'
const { getChartMap } = ChartMap

let chartMapList = getChartMap()

const getChartName = () => {
    
    let chartNameList = []
    for (let key of chartMapList.keys()){
        chartNameList.push(key)
    }
    
    return chartNameList
}

const getChartComponent = (chartName) => {
  
    return chartMapList.get(chartName)
}

export default {
    getChartName,
    getChartComponent
}

