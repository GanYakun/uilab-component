/*
 * @Author: lx.jin
 * @Date: 2021-10-08 12:00:55
 * @LastEditTime: 2023-07-31 12:00:27
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Description: In User Settings Edit
 * @FilePath: /Union-Wechat/utils/storage/metadataStorage.js
 */
import localStorage from 'localStorage';
import { getCurrentRouter } from '../util'

let metadataStorage = {
  get: (key) => {
    return JSON.parse(localStorage.getItem(key))
  },
  set: async (key, data) => {

    //兼容localStorage 最多保留10的应用数据
    const uilabApp = localStorage.getItem('uilabApp');
    if (uilabApp) {
      let { data: currentUilabApp } = JSON.parse(uilabApp)
      //1.判断是否需要填写到 uilabApp缓存
      if (!currentUilabApp.includes(key)) {
        currentUilabApp = [...currentUilabApp, key]
      }
      //2.判断是否需要替换
      if (currentUilabApp.length > 9) {
        const removeKey = currentUilabApp[0]
        currentUilabApp = currentUilabApp.filter((element, index) => index > 0)
        await localStorage.removeItem(removeKey)//删除第一项
      }
      //3.保存结果
      const obj = {
        data: currentUilabApp,
        expire: new Date().getTime() + 1000 * 60 * 60 * 24, //过期时间一天
      };
      await localStorage.setItem('uilabApp', JSON.stringify(obj));

    } else {
      const obj = {
        data: [key],
        expire: new Date().getTime() + 1000 * 60 * 60 * 24, //过期时间一天
      };
      await localStorage.setItem('uilabApp', JSON.stringify(obj));
    }

    //存储应用数据
    const obj = {
      data,
      expire: new Date().getTime() + 1000 * 60 * 60 * 24, //过期时间一天
    };
    await localStorage.setItem(key, JSON.stringify(obj));
  },
  clear: async () => {
    await localStorage.clear()
  }
};

export default metadataStorage;
