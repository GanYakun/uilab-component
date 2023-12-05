import lodash from 'lodash'

const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second]
    .map(formatNumber)
    .join(':')}`;
};

const dateFormat = (date_ori, fmt) => {
  let o = {
    'M+': date_ori.getMonth() + 1, //月份
    'd+': date_ori.getDate(), //日
    'h+': date_ori.getHours(), //小时
    'm+': date_ori.getMinutes(), //分
    's+': date_ori.getSeconds(), //秒
    'q+': Math.floor((date_ori.getMonth() + 3) / 3), //季度
    S: date_ori.getMilliseconds(), //毫秒
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(RegExp.$1, (date_ori.getFullYear() + '').substr(4 - RegExp.$1.length));
  for (let k in o)
    if (new RegExp('(' + k + ')').test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length),
      );
  return fmt;
};

const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

const addRpx = (val) => {
  if (val == '0') return val;
  return isNaN(Number(val)) ? val : val + 'rpx';
};

const humpToLine = (str) => {
  if (str.toLowerCase() === str) return str;
  return str
    .split('')
    .map((item) => {
      if (item === '-') return item;
      return item.toUpperCase() === item ? '-' + item.toLowerCase() : item;
    })
    .join('');
};

const array_get = ($array, $key, $default) => {
  if ($key == undefined) {
    return $array;
  }
  if ($key in $array) {
    return $array[$key];
  }

  let $rtn = $array;
  $key.split('.').some(function ($segment) {
    if ($array[$segment]) {
      $array = $array[$segment];
      $rtn = $array;
    } else {
      $rtn = $default;
      return false;
    }
  });

  return $rtn;
};

const array_set = ($array, $key, $value) => {
  if (!$key) return;
  var $keyArr = $key.split('.');
  for (var i = 0; i < $keyArr.length - 1; i++) {
    if ($array.hasOwnProperty($keyArr[i])) {
      $array = $array[$keyArr[i]];
    } else {
      for (var k = $keyArr.length - 1; i <= k; k--) {
        var w = $value;
        $value = {};
        $value[$keyArr[k]] = w;
      }
      $array[$keyArr[i]] = $value[$keyArr[i]];
      return;
    }
  }
  $array[$keyArr[i]] = $value;
};

const deepCopy = (target) => {
  let copyed_objs = [];
  function _deepCopy(target) {
    if (typeof target !== 'object' || !target) {
      return target;
    }
    for (let i = 0; i < copyed_objs.length; i++) {
      if (copyed_objs[i].target === target) {
        return copyed_objs[i].copyTarget;
      }
    }
    let obj = {};
    if (Array.isArray(target)) {
      obj = []; //处理target是数组的情况
    }
    copyed_objs.push({ target: target, copyTarget: obj });
    Object.keys(target).forEach((key) => {
      if (obj[key]) {
        return;
      }
      obj[key] = _deepCopy(target[key]);
    });
    return obj;
  }

  return _deepCopy(target);
};

const _typeof = (obj) => {
  let s = Object.prototype.toString.call(obj);
  return s.match(/\[object (.*?)\]/)[1].toLowerCase();
};

const getLocalTime = (i, ori_date) => {
  i = i || 0;
  ori_date = ori_date || new Date();
  let d = new Date(ori_date);
  let len = d.getTime();
  let offset = d.getTimezoneOffset() * 60000;
  let utcTime = len + offset;
  let resultDate = new Date(utcTime + 3600000 * i);
  let isoDate = new Date(
    resultDate.getTime() - resultDate.getTimezoneOffset() * 60000,
  ).toISOString();
  return isoDate;
};

const cssRgba = (sColor, opacity, rgbFlag) => {
  function getNumber(color) {
    return color.charAt(0) == '#' ? color.substring(1, 7) : color;
  }

  function getR(color) {
    return parseInt(getNumber(color).substring(0, 2), 16);
  }

  function getG(color) {
    return parseInt(getNumber(color).substring(2, 4), 16);
  }

  function getB(color) {
    return parseInt(getNumber(color).substring(4, 6), 16);
  }

  opacity = opacity || 0.5;
  if (sColor.length === 4) {
    let sColorNew = '#';
    for (let i = 1; i < 4; i += 1) {
      sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
    }
    sColor = sColorNew;
  }
  let R = getR(sColor),
    G = getG(sColor),
    B = getB(sColor);
  if (opacity == 1) {
    return `rgb(${R},${G},${B})`;
  } else if (rgbFlag) {
    return `${R},${G},${B}`;
  } else {
    return `rgba(${R},${G},${B},${opacity})`;
  }
};

const formatStrToObj = (str, splitMark) => {
  let reslut = {};
  if (str) {
    str.split(',').forEach((item) => {
      let [key, val] = item.trim().split(splitMark);
      //如果是boolean类型，需要做这个转换
      if ('false' === val) {
        val = false;
      } else if ('true' === val) {
        val = true;
      }
      reslut[key] = val;
    });
  }
  return reslut;
};

const formatObjToStr = (obj, fn) => {
  let result = '';
  Object.keys(obj).forEach((key) => {
    result += fn(key, obj[key]);
  });
  return result;
};

class ObjStyle {
  constructor(obj) {
    for (let key in obj) {
      this[key] = obj[key];
    }
  }

  toString() {
    let reslut = '';

    for (let key in this) {
      reslut += humpToLine(key) + ':' + addRpx(this[key]) + ';';
    }
    return reslut;
  }
}

const parseContentMetaData = (ContentMetaData) => {
  let result = {};
  ContentMetaData.forEach((item) => {
    let [key, val] = [item.metaDataPredicateId, item.metaDataValue];
    result[key] = new ObjStyle(formatStrToObj(val, '='));
    if (key == 'block-style-parms') result['block-style'] = result[key].toString();
    if (key == 'comp-style-parms') result['comp-style'] = result[key].toString();
    if (key == 'comp-child-style-parms') result['comp-child-style'] = result[key].toString();
  });
  return result;
};

const processContent = (content) => {
  let tmpContent = {};
  if (array_get(content, 'contentName')) {
    tmpContent['contentName'] = array_get(content, 'contentName');
  }
  if (array_get(content, 'DecoratorContent.DataResource.dataResourceTypeId') == 'CLIENT_COMP') {
    tmpContent['type'] = array_get(content, 'DecoratorContent.DataResource.objectInfo');
  } else if (array_get(content, 'DataResource.dataResourceTypeId') == 'CLIENT_COMP') {
    tmpContent['type'] = array_get(content, 'DataResource.objectInfo');
  } else if (array_get(content, 'DataResource.dataResourceTypeId') == 'IMAGE_OBJECT') {
    tmpContent['imageUrl'] = array_get(content, 'DataResource.objectInfo');
  }
  if (array_get(content, 'FromContentAssoc') && array_get(content, 'FromContentAssoc').length) {
    tmpContent['SubContent'] = [];
    array_get(content, 'FromContentAssoc').some((fromContentAssoc) => {
      let _subContent = processContent(fromContentAssoc.ToContent);
      if (_subContent) {
        let data = {};
        if (_subContent.type) data.type = _subContent.type;
        if (_subContent.imageUrl) data.imageUrl = _subContent.imageUrl;
        if (fromContentAssoc.mapKey) data.mapKey = fromContentAssoc.mapKey;
        if (
          fromContentAssoc.ToContent.ContentMetaData &&
          fromContentAssoc.ToContent.ContentMetaData.length > 0
        )
          data.ContentMetaData = fromContentAssoc.ToContent.ContentMetaData;
        if (_subContent.SubContent) data.SubContent = _subContent.SubContent;
        tmpContent['SubContent'].push(data);
      }
    });
    if (tmpContent['SubContent'].length == 0) {
      delete tmpContent['SubContent'];
    }
  }
  return tmpContent;
};

const urlencode = (str) => {
  //       discuss at: https://locutus.io/php/urlencode/
  //      original by: Philip Peterson
  //      improved by: Kevin van Zonneveld (https://kvz.io)
  //      improved by: Kevin van Zonneveld (https://kvz.io)
  //      improved by: Brett Zamir (https://brett-zamir.me)
  //      improved by: Lars Fischer
  //      improved by: Waldo Malqui Silva (https://fayr.us/waldo/)
  //         input by: AJ
  //         input by: travc
  //         input by: Brett Zamir (https://brett-zamir.me)
  //         input by: Ratheous
  //      bugfixed by: Kevin van Zonneveld (https://kvz.io)
  //      bugfixed by: Kevin van Zonneveld (https://kvz.io)
  //      bugfixed by: Joris
  // reimplemented by: Brett Zamir (https://brett-zamir.me)
  // reimplemented by: Brett Zamir (https://brett-zamir.me)
  //           note 1: This reflects PHP 5.3/6.0+ behavior
  //           note 1: Please be aware that this function
  //           note 1: expects to encode into UTF-8 encoded strings, as found on
  //           note 1: pages served as UTF-8
  //        example 1: urlencode('Kevin van Zonneveld!')
  //        returns 1: 'Kevin+van+Zonneveld%21'
  //        example 2: urlencode('https://kvz.io/')
  //        returns 2: 'https%3A%2F%2Fkvz.io%2F'
  //        example 3: urlencode('https://www.google.nl/search?q=Locutus&ie=utf-8')
  //        returns 3: 'https%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3DLocutus%26ie%3Dutf-8'

  str = str + '';

  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/:/g, '%3')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E')
    .replace(/%20/g, '+');
};

const http_build_query = () => { };

const empty = (mixedVar) => {
  //  discuss at: https://locutus.io/php/empty/
  // original by: Philippe Baumann
  //    input by: Onno Marsman (https://twitter.com/onnomarsman)
  //    input by: LH
  //    input by: Stoyan Kyosev (https://www.svest.org/)
  // bugfixed by: Kevin van Zonneveld (https://kvz.io)
  // improved by: Onno Marsman (https://twitter.com/onnomarsman)
  // improved by: Francesco
  // improved by: Marc Jansen
  // improved by: Rafał Kukawski (https://blog.kukawski.pl)
  //   example 1: empty(null)
  //   returns 1: true
  //   example 2: empty(undefined)
  //   returns 2: true
  //   example 3: empty([])
  //   returns 3: true
  //   example 4: empty({})
  //   returns 4: true
  //   example 5: empty({'aFunc' : function () { alert('humpty'); } })
  //   returns 5: false

  let undef;
  let key;
  let i;
  let len;
  let emptyValues = [undef, null, false, 0, '', '0'];

  for (i = 0, len = emptyValues.length; i < len; i++) {
    if (mixedVar === emptyValues[i]) {
      return true;
    }
  }

  if (typeof mixedVar === 'object') {
    for (key in mixedVar) {
      if (mixedVar.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  }

  return false;
};

const throttle = (fn, delay) => {
  let previous = 0;
  // 使用闭包返回一个函数并且用到闭包函数外面的变量previous
  return function () {
    let _this = this;
    let args = arguments;
    let now = new Date();
    if (now - previous > delay) {
      fn.apply(_this, args);
      previous = now;
    }
  };
};

const debounce = (func, wait = 250, immediate = true) => {
  let timerout;
  return function () {
    let context = this;
    let args = arguments;
    clearTimeout(timerout);
    if (immediate) {
      let callNow = !timerout;
      timerout = setTimeout(() => {
        timerout = null;
      }, wait);
      if (callNow) func.apply(context, args);
    } else {
      timerout = setTimeout(function () {
        func.apply(context, args);
      }, wait);
    }
  };
};

const betterThrottle = (fn, interval = 100) => {
  let timeout = null;
  let lastTime = 0;
  return function (...args) {
    clearTimeout(timeout);
    let now = Date.now();
    let _interval = now - lastTime;

    if (_interval >= interval) {
      lastTime = now;
      fn.apply(this, args);
    } else {
      let _lastTime = lastTime;
      timeout = setTimeout(() => {
        if (_lastTime === lastTime) {
          lastTime = Date.now();
          fn.apply(this, args);
        }
      }, interval - _interval);
    }
  };
};

const optimisticUpdate = (delay = 250) => {
  let dataArr = [],
    commitData,
    timeout;
  return async function ({ oValue, commit, success, fail }) {
    dataArr.push(oValue);
    clearTimeout(timeout);
    try {
      if (delay) {
        commitData = await new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            commit()
              .then((result) => {
                resolve(result);
              })
              .catch((_) => {
                reject();
              });
          }, delay);
        });
      } else {
        commitData = await commit();
      }
      dataArr.length = 0;
      success(commitData);
    } catch (err) {
      fail(dataArr[0]);
      dataArr.length = 0;
    }
  };
};

const fixDate = (strTime, timezone) => {
  if (!strTime) {
    return '';
  }
  let tempDate = new Date(strTime + timezone);
  if (tempDate == 'Invalid Date') {
    strTime = strTime.replace(/T/g, ' ');
    strTime = strTime.replace(/Z/g, ' ');
    strTime = strTime.replace(/-/g, '/');
    strTime = strTime.replace(/\.\d+/, ' ');
    tempDate = new Date(strTime + timezone);
  }
  return tempDate;
};

const getWxLoginCode = () => {
  return new Promise((resolve) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code);
        } else {
          console.log('登录失败！' + res.errMsg);
        }
      },
      fail(res) {
        console.log('登录失败！' + res.errMsg);
      },
    });
  });
};

const WXGlobalRequest = async (option) => {
  return new Promise((resolve) => {
    let set_headers = {};
    let cookie = wx.getStorageSync('xCookie');
    let ACCESSTOKEN = wx.getStorageSync('ACCESSTOKEN');
    if (cookie) {
      set_headers['Cookie'] = cookie;
    }
    if (ACCESSTOKEN) {
      set_headers['ACCESSTOKEN'] = ACCESSTOKEN;
    }
    wx.request({
      url: option.url,
      data: option.data || {},
      method: option.method || 'GET',
      dataType: 'text',
      responseType: 'text',
      timeout: option.timeout ? option.timeout : 5000,
      header: Object.assign(
        {
          Accept: 'application/json;odata.metadata=minimal;IEEE754Compatible=true',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'X-CSRF-Token': 'Fetch',
        },
        set_headers || {},
      ),
      success: (resp) => {
        if (resp.statusCode >= 300) {
          if (statusCode === 401) {
            wx.showModal({
              title: '提示',
              content: '由于您长时间未操作，当前登录已过期，点击确定重新登录',
              showCancel: false,
              success(res) {
                if (res.confirm) {
                  setGlobalData('userLoginId', '');
                  const pages = getCurrentPages();
                  const currentPage = pages[pages.length - 1];
                  currentPage.setData({ ready: false });
                  currentPage.onLoad();
                }
              },
            });
            return false;
          }
          var content = '';
          if (typeof resp.data === 'object') {
            if (resp.data.error && resp.data.error.message) {
              content = resp.data.error.message;
            }
          } else {
            content = (resp.data + '').replace(/<[^>]+>/g, '');
          }
          wx.showModal({
            title: '服务器错误: 1001',
            content: content,
            showCancel: false,
          });
          resolve(false);
        } else {
          resolve(resp);
        }
      },
      fail: (resp) => {
        var statusText = resp.errMsg + '';
        var statusCode = parseInt(resp.statusCode);
        if (statusCode === 1223) {
          statusCode = 204;
          statusText = 'No Content';
        }

        wx.showModal({
          title: '服务器错误: 1002',
          content: statusText,
          showCancel: false,
        });
      },
    });
  });
};

const refreshAccessToken = (opt) => {
  return new Promise(async (resolve) => {
    let url = `https://dev.dpbirdlab.com/basecamp/control/refreshToken?app=${opt.app}`;
    let option = {
      url: url,
      method: 'POST',
      timeout: opt.requestTimeout,
    };
    let result = await WXGlobalRequest(option);
    let ACCESSTOKEN = result.header.ACCESSTOKEN;
    let TokenValidTime = result.header.TokenValidTime;
    let cookies = result.cookies;
    let cookieArr = [];
    for (let v of cookies) {
      let cookie_item = v.split(';')[0];
      cookieArr.push(cookie_item);
    }
    let xCookie = cookieArr.join(';');
    wx.setStorageSync('xCookie', xCookie);
    wx.setStorageSync('ACCESSTOKEN', ACCESSTOKEN);
    wx.setStorageSync('TokenValidTime', TokenValidTime);
    wx.setStorageSync('TokenCurrentTime', new Date().getTime());
    resolve(result);
  });
};

const filterByDate = () => { };

const filterByDateQuery = () => { };

const funDifference = (object, other) => {
  let diff = {};
  let vChildren;
  for (var key in object) {
    if (
      typeof object[key] === 'object' &&
      typeof other[key] === 'object' &&
      object[key] &&
      other[key]
    ) {
      vChildren = funDifference(object[key], other[key]);
      if (Object.keys(vChildren).length > 0) {
        diff[key] = vChildren;
      }
    } else if (object[key] !== other[key]) {
      diff[key] = object[key];
    }
  }
  /*  return diff */
  if (diff == {}) {
    return null;
  } else {
    return diff;
  }
};

/**
 * 解析当前执行的路由
 * @returns 
 */
const getCurrentRouter = () => {
  const href = window.location.href;
  const hrefArr = href.split('/');
  if (hrefArr.length > 1) {
    const path = hrefArr[hrefArr.length - 1];
    const routeArr = path.split('?');
    const routeName = routeArr[0]
    return { path, routeName };
  }
  return false
};

/**
 * 通过当前应用的manifest,解析获取当前微应用的路由数据
 * @param {*} manifest 
 * @returns 
 */
const getAppRoutesByManifest = (manifest) => {
  const result = []
  const ListReportUrl = `../../../../lib/o3smart-comp/UIPages/ListReport`
  const ObjectPageUrl = `../../../../lib/o3smart-comp/UIPages/ObjectPage`
  const OverviewPageURl = '../../../../lib/o3smart-comp/UIPages/OverviewPage'

  //1.判断是否为ovp页面
  if (manifest["sap.ovp"]) {
    result.push({
      path: `/OverviewPage`,
      component: OverviewPageURl,
    }, {
      path: `/`,
      redirect: `/OverviewPage`,
    })
  } else {
    const { routes, targets } = manifest["sap.ui5"]["routing"]
    for (let a of routes) {
      const { name } = a
      if (targets[name]) {
        const { name: targetName } = targets[name]
        switch (targetName) {
          case `sap.fe.templates.ListReport`:
            result.push({
              path: `/${name}`,
              component: ListReportUrl,
            }, {
              path: `/`,
              redirect: `/${name}`,
            })
            break;
          case `sap.fe.templates.ObjectPage`:
            result.push({
              path: `/${name}`,
              component: ObjectPageUrl,
            })
            break;
          default:
            break;
        }
      }
    }
  }
  return result
}

/**
 * 通过当前应用的manifest,解析获取当前微应用的路由数据
 * @param {*} manifest 
 * @returns 
 */
const getCurrentRouterParams = () => {
  const result = {}
  var query = window.location.search.substring(1);
  if (query !== '') {
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      result[pair[0]] = pair[1]
    }
  }
  return result
}

/**
 * 比较两个对象的不同
 * @param {*} obj1 
 * @param {*} obj2 
 * @returns 
 */
const getObjectDiff = (obj1, obj2) => {
  const diff = Object.keys(obj1).reduce((result, key) => {
    if (!obj2.hasOwnProperty(key)) {
      result.push(key);
    } else if (lodash.isEqual(obj1[key], obj2[key])) {
      const resultKeyIndex = result.indexOf(key);
      result.splice(resultKeyIndex, 1);
    }
    return result;
  }, Object.keys(obj2));

  return diff;
}

/**
 * Unicode转中文汉字
 * @param {*} str 
 * @returns 
 */
const reconvert = (str) => {
  str = str.replace(/(\\u)(\w{1,4})/gi, function ($0) {
    return (String.fromCharCode(parseInt((escape($0).replace(/(%5Cu)(\w{1,4})/g, "$2")), 16)));
  });
  str = str.replace(/(&#x)(\w{1,4});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, "$2"), 16));
  });
  str = str.replace(/(&#)(\d{1,6});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23)(\d{1,6})(%3B)/g, "$2")));
  });

  return str;
}

/**
 * 
 * @param {*} path 字段
 * @param {*} label 显示
 * @param {*} formatMessage 工具类 
 * @returns 
 */
const getTextByI18n = (label, formatMessage, path)=>{
  return label && label.search('@i18n>') === -1 ? label ? label : path : label ? formatMessage({ id: label }) : path
}

export {
  getTextByI18n,
  getCurrentRouter,
  getCurrentRouterParams,
  getAppRoutesByManifest,
  formatTime,
  dateFormat,
  array_get,
  array_set,
  getLocalTime,
  cssRgba,
  deepCopy,
  _typeof,
  formatStrToObj,
  formatObjToStr,
  parseContentMetaData,
  processContent,
  http_build_query,
  empty,
  throttle,
  debounce,
  betterThrottle,
  optimisticUpdate,
  urlencode,
  fixDate,
  getWxLoginCode,
  WXGlobalRequest,
  refreshAccessToken,
  filterByDate,
  filterByDateQuery,
  funDifference,
  getObjectDiff,
  reconvert
};


