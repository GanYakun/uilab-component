/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-17 17:20:15
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-28 17:10:03
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/utils/odata/odata.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-17 17:20:15
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-20 15:03:02
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/utils/odata/odata.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { deepCopy } from '../util';
import { message } from 'antd';
import { getLocale } from 'umi';
import './index';
let odatajs = window.odatajs;
const odata = {};

odata.read = function (requests, handler) {
  return new Promise((resolve, reject) => {
    if (requests instanceof Array) {
      var __batchRequests = [];
      requests.some((_request) => {
        var requestUri = _processUri(_request);
        __batchRequests.push({
          requestUri,
          method: 'GET',
          headers: {
            Accept: 'application/json;odata.metadata=minimal;IEEE754Compatible=true',
            'Content-Type': 'application/json;charset=UTF-8;IEEE754Compatible=true',
            ..._request.headers,
            'Accept-Language': getLocale(),
          },
        });
      });
      var batchRequest = _buildRequest({
        requestUri: `${window.serviceUrl}$batch`,
        method: 'POST',
        data: {
          __batchRequests,
        },
      });
      odatajs.oData.request(
        batchRequest,
        function (response_data) {
          //batch的时候整个请求不会报错,要分析里面的错误
          var __batchResponses = [];
          if (response_data && response_data.__batchResponses) {
            response_data.__batchResponses.some((_response) => {
              if (!_response.data && _response.response.body) {
                _response.data = JSON.parse(_response.response.body);
              }
              _response = Object.assign(_response, _response.response);
              if (_response.statusCode) {
                _response.statusCode = parseInt(_response.statusCode);
              }
              __batchResponses.push(_response);
            });
          }
          resolve && resolve(__batchResponses);
        },
        function (response_data, response) {
          reject && reject(response);
        },
        odatajs.oData.batch.batchHandler,
      );
    } else {
      var params;
      if (requests instanceof String || typeof requests === 'string') {
        params = {
          requestUri: !requests.url ? _processUri(requests) : requests.url + _processUri(requests),
          method: 'GET',
        };
      } else {
        params = {
          requestUri: !requests.url ? _processUri(requests) : requests.url + _processUri(requests),
          method: requests.method ? requests.method : 'GET',
        };
      }

      var urlOrRequest = _buildRequest(params);

      if (!handler) {
        handler = deepCopy(odatajs.oData.defaultHandler);
        handler.accept = 'application/json;odata.metadata=full;';
      }

      odatajs.oData.read(
        urlOrRequest,
        function (response_data, response) {
          resolve && resolve(response);
        },
        function (err) {
          resolve && resolve(err.response);
        },
        handler,
      );
    }
  });
};

odata.submit = function (requests) {
  return new Promise((resolve, reject) => {
    var isArray = true;
    if (!(requests instanceof Array)) {
      requests = [requests];
      isArray = false;
    }
    var __batchRequests = [];
    requests.some((_request) => {
      var requestUri = _processUri(_request);
      __batchRequests.push({
        requestUri,
        url: _request.url,
        method: _request.method ? _request.method : 'POST',
        body: JSON.stringify(_request.body),
        headers: {
          Accept: 'application/json;odata.metadata=minimal',
          'Content-Type': 'application/json;charset=UTF-8;',
          'Accept-Language': getLocale(),
          ..._request.headers,
        },
      });
    });
    var batchRequest = _buildRequest({
      requestUri: `${window.serviceUrl}$batch`,
      method: 'POST',
      data: {
        __batchRequests,
      },
    });
    odatajs.oData.request(
      batchRequest,
      function (response_data) {
        //batch的时候整个请求不会报错,要分析里面的错误
        var __batchResponses = [];
        if (response_data && response_data.__batchResponses) {
          response_data.__batchResponses.some((_response) => {
            if (!_response.data && _response.response && _response.response.body) {
              _response.data = JSON.parse(_response.response.body);
            }
            _response = Object.assign(_response, _response.response);
            if (_response.statusCode) {
              _response.statusCode = parseInt(_response.statusCode);
            }
            __batchResponses.push(_response);
          });

          if (!isArray) {
            __batchResponses = __batchResponses[0];
          }
        }
        if (!isArray) {
          const { statusCode, data } = __batchResponses;
          if (statusCode < 300) {
            resolve && resolve(__batchResponses);
          } else {
            message.error(data ? data.error.message : "请求时发生错误！");
            resolve && resolve(false);
          }
        } else {
          const index = __batchResponses.findIndex((item) => item.statusCode > 300);
          if (index === -1) {
            resolve && resolve(__batchResponses);
          } else {
            message.error(__batchResponses[index].data.error.message);
            resolve && resolve(false);
          }
        }
      },
      function (response_data, response) {
        var __batchResponses = response_data.__batchResponses;
        if (!isArray && __batchResponses) {
          __batchResponses = __batchResponses[0];
        }
        reject && reject([__batchResponses, response]);
      },
      odatajs.oData.batch.batchHandler,
    );
  });
};

function _buildRequest(params) {
  var url = '/' + params.requestUri;
  params.requestUri = url;
  if (!params.headers) {
    params.headers = {};
  }
  params.headers['Accept-Language'] = getLocale();
  return params;
}

function _processUri(option) {
  if (typeof option == 'string') {
    return encodeURI(option);
  }

  var url = option.path;

  //判断当前应用
  if (!option.parameters) {
    option.parameters = {};
  }

  var params = [];
  for (var key in option.parameters) {
    var value = option.parameters[key];
    if (typeof value == 'object') {
      if (key === '$expand') {
        params.push('$expand=' + _processExpand(value));
      }
    } else {
      params.push(key + '=' + value);
    }
  }

  return url + encodeURI(params.length ? '?' + params.join('&') : '');
}

function _processExpand(expand) {
  var rtn = [];
  for (var entity in expand) {
    var param = expand[entity];
    var params = [];
    for (var key in param) {
      var value = param[key];
      if (typeof value == 'string') {
        params.push(key + '=' + value);
      } else {
        params.push('$expand=' + _processExpand(value));
      }
    }
    var paramsExpand = '(' + params.join(';') + ')';
    if (paramsExpand == '()') {
      paramsExpand = '';
    }
    rtn.push(entity + paramsExpand);
  }
  return rtn.join(',');
}

export default odata;
