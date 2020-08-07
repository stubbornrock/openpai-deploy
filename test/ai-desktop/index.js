const axios = require('axios');
const { URL } = require('url');

TKE_ENDPOINT='http://192.168.19.120:32757'

const _getClient = () => {
    const config = {
        baseURL: new URL(TKE_ENDPOINT).toString(),
        maxRedirects: 0,
        timeout: 5 * 1000,
        withCredentials: true
    };
    const client = axios.create(config);
    return client;
};

//生成请求所携带的 cookies
const _generateTKECookies = async () => {
    const client = _getClient();
    let code = 200;
    let url = '/tree?token=chengs';
    let loginRes = await client.get(url);
    console.log(loginRes);
}

_generateTKECookies()
