/*
 * @Author: lx.jin
 * @Date: 2021-09-26 14:04:35
 * @LastEditTime: 2021-09-26 19:01:08
 * @LastEditors: lx.jin
 * @Description: In User Settings Edit
 * @FilePath: /Union-PC/Union/src/utils/odata/annotation.js
 */
import metadataStorage from '../storage/metadataStorage';
import odatautils from './lib/odata/odatautils';
import { array_get } from '../util';

var annotation = {};
annotation.processData = async (data, edmItem, properties) => {
  if (!(properties instanceof Array)) {
    properties = [properties];
  }
  var metadataRebuild = await metadataStorage.getRebuild();
  if (data instanceof Array) {
    var newData = [];
    data.some((item) => {
      newData.push(annotation._processData(item, edmItem, properties, metadataRebuild));
    });
    return newData;
  } else {
    return annotation._processData(data, edmItem, properties, metadataRebuild);
  }
};
annotation._processData = (data, edmItem, properties, metadataRebuild) => {
  properties.some((property) => {
    var odata_type;
    if ((odata_type = data[property + '@odata.type'])) {
      odata_type = odata_type.replace('#' + metadataRebuild.namespace + '.', '');
      var odata_type_edmItem = metadataRebuild.edmItems[odata_type];
      if (odata_type_edmItem.type === 'enumType') {
        data[property + '__label'] = annotation.enumTypeCommon(
          odata_type,
          data[property],
          'Core.Description',
          odata_type_edmItem.data,
        );
      }
    }
  });

  return data;
};
annotation.entityType = async (entityType, term) => {
  var metadata = await metadataStorage.get();
  odatautils.lookupInSchema();
  var namespace = metadata.data.dataServices.schema[0].namespace;
  console.log(odatautils.lookupEntityType(namespace + '.' + entityType, metadata.data));
};

annotation.enumType = async (edmItem, property, term) => {
  var metadataRebuild = await metadataStorage.getRebuild();

  var enumTypeData = array_get(metadataRebuild, `edmItems.${edmItem}.data`);
  if (!enumTypeData || !enumTypeData.member) {
    return undefined;
  }

  var text = annotation.enumTypeCommon(edmItem, property, term, enumTypeData);

  return text;
};

annotation.enumTypeCommon = (edmItem, property, term, enumTypeData) => {
  var text;
  if (enumTypeData) {
    enumTypeData.member.some((member) => {
      if (member.name === property) {
        var annotations = member.annotation;
        if (annotations) {
          annotations.some((_annotation) => {
            if (_annotation.term === term) {
              text = array_get(_annotation, 'string.0.text');
              return true;
            }
          });
        }
        return true;
      }
    });
  }

  return text;
};

export default annotation;
