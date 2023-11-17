const app = getApp();
import { setGlobalData, getGlobalData } from '../../../globalData';

function canUseJSONP(request) {
  return !(request.method && request.method !== 'GET');
}

function isAbsoluteUrl(url) {
  return (
    url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('file://') === 0
  );
}

function isLocalUrl(url) {
  if (!isAbsoluteUrl(url)) {
    return true;
  }

  return false;
}

exports.defaultHttpClient = {
  request: (function createRequest() {
    var that = this;

    return function (request, success, error) {
      var url = request.requestUri;
      var timer;
      timer = setTimeout(() => {
        wx.showLoading({ title: 'loading...' });
      }, getGlobalData('showLoadingTime'));
      return wx.request({
        url: request.requestUri,
        method: request.method,
        data: request.body,
        header: request.headers,
        success: function (resp) {
          var statusText = resp.errMsg + '';
          var statusCode = parseInt(resp.statusCode);
          if (statusCode === 1223) {
            statusCode = 204;
            statusText = 'No Content';
          }
          var cookies = resp.cookies;
          var cookiesString = [];
          if (cookies && cookies.length) {
            cookies.some((cookie) => {
              cookiesString.push(cookie.split(';')[0]);
            });
          }
          var response = {
            cookies: cookies,
            cookiesString: cookiesString.join('; '),
            requestUri: url,
            statusCode: statusCode,
            statusText: statusText,
            headers: resp.header,
            body: resp.data,
          };

          if (
            statusCode >= 200 &&
            statusCode <= 299 &&
            resp.data &&
            (typeof resp.data === 'object' || resp.data.indexOf(':ERROR MESSAGE:') === -1)
          ) {
            success(response);
          } else {
            console.log(statusCode);
            if (statusCode === 401) {
              wx.showModal({
                title: '提示',
                content: '由于您长时间未操作，当前登录已过期，点击确定重新登录',
                showCancel: false,
                success(res) {
                  if (res.confirm) {
                    setGlobalData('AppLaunchFlag', false);
                    const pages = getCurrentPages();
                    const currentPage = pages[pages.length - 1];
                    currentPage.setData({ ready: false });
                    currentPage.onLoad();
                  }
                },
              });
              return false;
            }
            console.log('%c Request error', 'color:red', resp);
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

            error({ message: 'HTTP request failed', request: request, response: response });
          }
        },
        timeout: request.timeoutMS ? request.timeoutMS : 5000,
        fail: function (resp) {
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

          var response = {
            requestUri: url,
            statusCode: statusCode,
            statusText: statusText,
            headers: resp.header,
            body: resp.data,
          };

          error({ message: 'HTTP request failed 2', request: request, response: response });
        },
        complete(resp) {
          clearTimeout(timer);
          wx.hideLoading({
            fail() {
              //捕捉没有showLoading的错误,不能删除
            },
          });
        },
      });
    };
  })(),
};

exports.canUseJSONP = canUseJSONP;
exports.isAbsoluteUrl = isAbsoluteUrl;
exports.isLocalUrl = isLocalUrl;
