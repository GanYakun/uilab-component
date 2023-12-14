import { history } from 'umi';
import { stringify } from 'querystring';

export const onPageChange = (initialState: any, loginPath: string) => {
    const { location } = history;
      const { query = {}, search, pathname } = location;
      const { redirect } = query;
      if (!window.location.href.includes("/#/")) {
        window.location.assign(window.location.origin + "/#/");
      }
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        if (!redirect) {
          history.replace({
            pathname: loginPath,
            search: stringify({
              redirect: pathname + search,
            }),
          });
        } else {
          history.push(loginPath);
        }
      }
}