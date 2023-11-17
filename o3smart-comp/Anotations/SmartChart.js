/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-10-12 14:29:19
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
  Other
} from '../Process/index';
import { array_get } from '../../utils/util';

const {
  parseDataByPath,
  getAnnotationByAnnotationPath
} = Other

/** 
 * 根据annotation解析chart所需要的数据结构配置项
 */
const SmartChartConfig = {
  annoRequest: null,
  chartConfigObj: null,
}
/**
 * 解析入口
 */
const getConfig = (params) => {
  const { record, entitySet, queryEntity, chartAnnotation, isSet, target, inSection } = params
  const {
    currentAnnotations,
    currentEntityTypeName,
    currentEntityTypeData,
    currentEntitySetData
  } = parseDataByPath(entitySet)
  let chartConfig = {};
  chartAnnotation.propertyValue.some(propertyValue => {
    chartConfig[propertyValue.property] = propertyValue;
  });

  let entitySetFull;
  if (target.indexOf('/') !== -1) {
    //navication
    let navigationPath = target.split('/')[0];
    entitySetFull = queryEntity + '/' + navigationPath;
  } else {
    entitySetFull = queryEntity
  }

  let measures = array_get(chartConfig, 'Measures.collection.0.propertyPath.0.text');
  //找到Measures 和 对应的 UI.ChartMeasureAttributeType
  let MeasureAttributesRecords = array_get(chartConfig, 'MeasureAttributes.collection.0.record', []);

  let dataPointAnnotationPath;
  let findMeasure = false;
  MeasureAttributesRecords.some(item => {
    item.propertyValue.some(property => {
      if (property.property == 'Measure' && property.propertyPath == measures) {
        findMeasure = true;
      }
      if (findMeasure && property.property == 'DataPoint') {
        dataPointAnnotationPath = property.annotationPath;
        return true;
      }
    });
    if (dataPointAnnotationPath) {
      return true;
    }
  });

  const dataPointAnnotation = getAnnotationByAnnotationPath(dataPointAnnotationPath, currentAnnotations, currentEntitySetData);
  let select = [];
  let groupBy = [];
  let aggregate = [];
  //Dimensions
  let oDimensions = array_get(chartConfig, 'Dimensions.collection.0.propertyPath');
  if (oDimensions) {
    oDimensions.some(item => {
      select.push(item.text);
      groupBy.push(item.text);
    });
  }

  let oMeasures = array_get(chartConfig, 'Measures.collection.0.propertyPath');
  if (oMeasures) {
    oMeasures.some(item => {
      select.push(item.text);
      aggregate.push(item.text + ' with sum as ' + item.text + 'Sum');
    });
  }
  let chartDescription = array_get(chartConfig,'Description.string')

  let dataPointObject = {};
  dataPointAnnotation?.['record']?.[0]?.['propertyValue']?.some((propertyValue) => {
    dataPointObject[propertyValue.property] = propertyValue;
  });

  let chartConfigObj = {
    select,chartDescription, groupBy, aggregate, oDimensions, oMeasures, isSet, dataPointAnnotation, entitySetFull, dataPointObject, inSection
  }


  SmartChartConfig.chartConfig = chartConfig
  SmartChartConfig.chartConfigObj = chartConfigObj
  return SmartChartConfig
}

//chartItem from Ui.js:parseLineItem
const getRequestFields = (chartItem) => {
  let select = [];

  let chartConfig = {};
  chartItem.value.chartAnnotation.propertyValue.some(propertyValue => {
    chartConfig[propertyValue.property] = propertyValue;
  });

  let measures = array_get(chartConfig, 'Measures.collection.0.propertyPath.0.text');
  //找到Measures 和 对应的 UI.ChartMeasureAttributeType
  let MeasureAttributesRecords = array_get(chartConfig, 'MeasureAttributes.collection.0.record', []);
  let dataPointAnnotationPath;
  let findMeasure = false;
  MeasureAttributesRecords.some(item => {
    item.propertyValue.some(property => {
      if (property.property == 'Measure' && property.propertyPath == measures) {
        findMeasure = true;
      }
      if (findMeasure && property.property == 'DataPoint') {
        dataPointAnnotationPath = property.annotationPath;
        return true;
      }
    });
    if (dataPointAnnotationPath) {
      return true;
    }
  });

  let oDimensions = array_get(chartConfig, 'Dimensions.collection.0.propertyPath');
  if (oDimensions) {
    oDimensions.some(item => {
      if(!select.includes(item.text)){
        select.push(item.text);
      }
    });
  }

  let oMeasures = array_get(chartConfig, 'Measures.collection.0.propertyPath');
  if (oMeasures) {
    oMeasures.some(item => {
      if(!select.includes(item.text)){
        select.push(item.text);
      }
    });
  }

  const { currentAnnotations, currentEntitySetData } = parseDataByPath(chartItem.value.targetEntitySet)
  const dataPointAnnotation = getAnnotationByAnnotationPath(dataPointAnnotationPath, currentAnnotations, currentEntitySetData);
  if(dataPointAnnotation){
    dataPointAnnotation['record'][0]['propertyValue'].some((propertyValue) => {
      if (propertyValue.path) {
        if(!select.includes(propertyValue.path)){
          select.push(propertyValue.path);
        }
      }
    });
  }
  
  return select;
}
export {
  getConfig, getRequestFields
}