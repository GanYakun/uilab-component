/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-10-24 15:06:45
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2022-12-12 13:42:48
 * @FilePath: /uilab-gbms/lib/o3smart-comp/CustomComponents/Video/VideoSection.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * Facets:获取解析值的配置的配置
 * record:未解析的数据
 * entitySet:主对象
 * title:标题
 */


import React, { useState, useEffect } from 'react';
import { ReactSVG } from 'react-svg'
import PropTypes from 'prop-types';
import { getConfig as smartFieldGetConfig } from '../../Anotations/SmartField'


let SvgSction = (props) => {
  const { Facets, entitySet, record, title } = props

  //获取svg容器
  const getSvgDoc = (svg) => {
    record && analysisData(svg, record, Facets)
  };

  const analysisData = (svg, data, Facets) => {
    let arr = []
    Facets && Facets.fields.map((path) => {
      let obj = {}
      let parmas = {
        record: data,
        entitySet: entitySet,
        path: path
      }
      const paths = path.split('/')
      obj.value = smartFieldGetConfig(parmas).displayValue
      obj.label = smartFieldGetConfig(parmas).label
      obj.id = paths[paths.length - 1]
      arr.push(obj)
    })
    queryDataBySvgId(svg, arr)
  }


  const queryDataBySvgId = (svgDoc, dataArr) => {
    let svgAssignTitleId = svgDoc.getElementById('title')
    if (svgAssignTitleId) {
      svgAssignTitleId.textContent = title
    }
    dataArr && dataArr.map((item) => {
      let { value, id } = item
      if (value) {
        let svgAssignID = svgDoc.getElementById(id)
        if (svgAssignID) {
          svgAssignID.textContent = String(value)
          svgAssignID.setAttribute(
            'transform',
            'translate(' +
            (svgAssignID.transform.animVal[0].matrix.e -
              (String(value).length - 1) *
              2) +
            ',' +
            svgAssignID.transform.animVal[0].matrix.f +
            ')',
          );
          svgAssignID.style.fontSize = '10px'
        }
      }
    })
  }


  return (
    <ReactSVG
      src={`https://gbms.oss-cn-hangzhou.aliyuncs.com/Demo/test.svg`}
      id={'embedSvg'}
      afterInjection={(error, svg) => {
        if (error) {
          console.error(error)
          return
        }
        getSvgDoc(svg)
      }}
      hidden={false}
      style={{ width: '100%', display: 'grid' }}
    ></ReactSVG>
  )
}

SvgSction.propTypes = {
  Facets: PropTypes.object.isRequired,
  record: PropTypes.object.isRequired,
  entitySet: PropTypes.string.isRequired,
  title: PropTypes.string,
};
SvgSction.defaultProps = {

};

export default SvgSction;

