/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-04 18:10:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-20 13:42:37
 * @FilePath: /qiankun/uiLab/apps/launchPad/src/pages/LaunchPad.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import './index.less';
import { getRouteFiles, getSecurityPermissionGroup } from '../../../../../config/appConfig'
import { history as umiHistory } from 'umi';
import { FormattedMessage } from "react-intl";
import { useModel } from 'umi';
import { FileSyncOutlined, FileDoneOutlined } from '@ant-design/icons';
import { Progress, Statistic } from 'ant5';

const LaunchPad: React.FC = () => {
  const [dataSource, setDataSource] = useState<any>([]);
  let { initialState } = useModel('@@initialState');
  useEffect(() => {
    let arr: any = [];
    const access = getSecurityPermissionGroup(initialState?.currentUser);

    getRouteFiles().forEach(item => {
      let routes: any[] = [];
      item?.routes?.forEach((childItem) => {
        if (access[childItem.routes[0].access]) {
          routes.push(childItem);
        }
      })
      if (routes.length) {
        arr.push({
          icon: item.icon,
          name: item.name,
          path: item.path,
          routes
        })
      }
    })
    setDataSource(arr);
  }, [])
  //页面跳转
  const _historyPush = (url: string) => {
    umiHistory.push({
      pathname: url,
      query: {},
    })
  }

  const tagEnum = {
    'supplierparty-manage': <Statistic title="Registered" value={112} prefix={<FileDoneOutlined />} valueStyle={{ color: '#3f8600' }} />,
    'supplierapprove-managebyapplication': <Progress type="circle" percent={30} size={60} />,
    'supplierapprove-managebyprocurement': <Statistic title="To be registered" value={47} prefix={<FileSyncOutlined />} valueStyle={{ color: '#00BFFF' }} />,
    'supplierapprove-managebycompliance': <Statistic title="To be registered" value={12} prefix={<FileSyncOutlined />} valueStyle={{ color: '#00BFFF' }} />,
  }

  return <div>
    {dataSource?.map((item: any, index: number) => {
      return <div key={index} className='container'>
        <div className='groupName'><FormattedMessage id={`menu.${item.name}`} /></div>
        <div className='pannel'>
          {
            item?.routes?.map((childItem: any, childIndex: number) => {
              return (
                !childItem?.hideInMenu && <div className='pannel-item' key={`child-${childIndex}`} onClick={() => {
                  if (childItem?.isLink) {
                    console.log(childItem?.entry)
                    window.open(childItem?.entry)
                  } else {
                    _historyPush(`${item.path}/${childItem.name}`)
                  }
                }}>
                  <div style={{ width: "100%" }}>
                    <div>
                      <img width={32} height={32} src={`AppImages/${childItem.name}.png`} onError={(e) => { e.target.onerror = null; e.target.src = 'navigate@2x.png' }} />
                    </div>
                    <div className='title'><FormattedMessage id={`menu.${item.name}.${childItem.name}`} /></div>
                    <div className='description'></div>
                  </div>
                  <div className='tags'>
                    {tagEnum[childItem.name]}
                  </div>
                  {/* <div className='bottom'>
                    <img className='navigate' src='navigate@2x.png' />
                  </div> */}
                </div>
              )
            })
          }
        </div>
      </div>
    })}
  </div>
}

export default LaunchPad;