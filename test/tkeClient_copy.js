//导入模块
const axios = require('axios');
const yaml = require('js-yaml');
const qs = require('querystring');
const fs = require('fs');
const mustache = require('mustache');
const logger = require('@pai/config/logger');
const { URL } = require('url');
const { TKE_PVC, TKE_DEPLOYMENT, TKE_SERVICE } = require('./tkeDeploymentTemplate');
const { tkeServer } = require('@pai/config/tkestack');
const { readCookies,
    updateCookies,
    createDesktop,
    updateDesktop,
    getDesktop,
    getAllDesktops,
    deleteDesktop
} = require('./crudK8s.js');

//定义全局常量
const AI_DESKTOP_PREFIX = 'ai-desktop-';
const REQUEST_COOKIES_RETRIES = 2;

//生成TKEStack的axios请求客户端
const _getClient = () => {
    const config = {
        baseURL: new URL(tkeServer.uri).toString(),
        maxRedirects: 0,
        timeout: 5 * 1000,
        withCredentials: true
    };
    const client = axios.create(config);
    //请求response拦截器
    client.interceptors.response.use(
        resp => {
            return resp;
        },
        error => {
            if (302 === error.response.status || 303 === error.response.status) {
                return error.response;
            } else {
                logger.error(error);
                throw `请求返回出错: ${error}`;
            };
        }
    );
    return client;
};

//生成请求所携带的 cookies
const _generateTKECookies = async () => {
    const client = _getClient();
    let code = 200;
    let url = '/';
    let cookies = ['language=zh', 'regionId=1'];
    // 经过2次redirect后，会生成用户登录的路径
    do {
        let loginRes = await client.get(url);
        logger.debug("Request URL:" + url + "\tStatus:" + loginRes.status);
        if (302 === loginRes.status) {
            code = loginRes.status;
            url = loginRes.headers.location;
        } else {
            break;
        }
    }
    while (code === 302);
    // 经过5次跳转后，才能够获取获取系统的Cookies
    let method = 'POST';
    do {
        let validateRes = null;
        //第一次发送post请求
        if (method === 'POST') {
            validateRes = await client.post(url, qs.stringify(tkeServer.auth));
            method = 'GET';
        } else {
            validateRes = await client.get(url);
        }
        logger.debug("Request URL:" + url + "\tStatus:" + validateRes.status);
        // 登录系统的redirect 跳转码有 302,303 两种
        if (302 === validateRes.status || 303 === validateRes.status) {
            code = validateRes.status;
            url = validateRes.headers.location;
            if (validateRes.headers.hasOwnProperty('set-cookie')) {
                let tkeCookie = validateRes.headers["set-cookie"][0];
                cookies.push(tkeCookie.split(';')[0]);
                break;
            }
        } else {
            break;
        }
    }
    while (code === 302 || code === 303);
    //生成cookies
    if (cookies.length < 3) {
        return null;
    } else {
        return cookies.join(";");
    }
}

// 获取cookies并缓存到k8s中
const _readCookies = async (retry = false) => {
    let cookies = null
    if (retry == false) {
        try {
            cookies = await readCookies();
            //logger.debug("TKE Cookies 已经缓存...")
        } catch (error) {
            cookies = await _generateTKECookies();
            await updateCookies(cookies);
        }
    } else {
        cookies = await _generateTKECookies();
        await updateCookies(cookies);
    }
    return cookies;
}

// 使用Cookie向tkestack API 发送请求
const _requestWithCookie = async (url, method, data) => {
    const client = _getClient();
    let cookies = await _readCookies();
    let count = 0
    while (count < REQUEST_COOKIES_RETRIES) {
        if (cookies !== null) {
            try {
                let headers = { 'Cookie': cookies, 'X-TKE-ClusterName': tkeServer.cluster };
                if (method === 'GET') {
                    let resp = await client.get(url, { headers: headers });
                    return resp.data;
                } else if (method === 'POST') {
                    return await client.post(url, data, { headers: headers });
                } else if (method === 'DELETE') {
                    return await client.delete(url, { data: data, headers: headers });
                } else if (method === 'PATCH') {
                    headers['Content-Type'] = 'application/strategic-merge-patch+json';
                    return await client.patch(url, data, { headers: headers });
                } else {
                    throw '请求方法有误！请选择[GET, POST, DELETE, PATCH]';
                }
                break;
            } catch (error) {
                logger.warn('发送' + url + '请求失败，重新获取COOKIES发送...');
            }
        } else {
            logger.warn('获取COOKIES失败 COOKIES is null！重新获取COOKIES...');
        }
        count++;
        logger.warn("尝试第" + count + "次重新获取COOKIES...");
        cookies = await _readCookies(true);
    }
}

// 创建TKESTACK deployment
const _generateTKEDeployment = (data) => {
    // 使用数据进行模板渲染
    const storageStr = mustache.render(TKE_PVC, data);
    const storageObj = yaml.safeLoad(storageStr);

    const deploymentStr = mustache.render(TKE_DEPLOYMENT, data);
    const deploymentObj = yaml.safeLoad(deploymentStr);

    const serviceStr = mustache.render(TKE_SERVICE, data);
    const serviceObj = yaml.safeLoad(serviceStr);

    return {
        storageObj: storageObj,
        deploymentObj: deploymentObj,
        serviceObj: serviceObj
    }
}

// 创建deployment
const createTKEDeployment = async (username,
    deploymentName,
    gpuType,
    vcudaCore = tkeServer.default_gpu,
    vcudaMemory = tkeServer.default_gpu_memory) => {
    let suffix = Date.now().toString(16);
    suffix = suffix.substring(suffix.length - 6);
    const data = {
        name: (deploymentName !== undefined) ? deploymentName : `${AI_DESKTOP_PREFIX}${suffix}`,
        namespace: tkeServer.namespace,
        username: username,
        token: Buffer.from(username).toString('base64'),
        image: tkeServer.image,
        storage: tkeServer.storage,
        defaultCpu: tkeServer.default_cpu,
        defaultMemory: tkeServer.default_memory,
        gpuType: gpuType,
        vcudaCore: vcudaCore * 100,
        vcudaMemory: vcudaMemory,
        nfs_hosts: tkeServer.nfs_hosts,
        nfs_path: tkeServer.nfs_path,
        nfs: tkeServer.nfs,
    }
    const { storageObj, deploymentObj, serviceObj } = _generateTKEDeployment(data);
    const requestURL = `/apis/platform.tkestack.io/v1/clusters/${tkeServer.cluster}/apply`
    try {
        // 创建 Service, pvc
        // deployName 为空时,就创建Service,pvc,projectlist
        if (deploymentName === undefined) {
            //Service创建
            await _requestWithCookie(requestURL, 'POST', serviceObj);
            //判断是否为
            if (!tkeServer.nfs) {
                //pvc创建
                const pvcs = await listTKEPVCs();
                if (pvcs.includes(username)) {
                    //username 用做pvc的名字
                    logger.warn(`用户${username} 的pvc已经存在可直接使用.`);
                } else {
                    await _requestWithCookie(requestURL, "POST", storageObj);
                }
            }
            //默认在etcd中创建云桌面中的部分信息
            createDesktop(`${AI_DESKTOP_PREFIX}${suffix}`);
        }
        // 创建 deployment
        await _requestWithCookie(requestURL, 'POST', deploymentObj);

    } catch (error) {
        throw '创建VNC Deployments 失败：' + error;
    }
}
// 重启deployment
const resumeTKEDeployment = async (deployment) => {
    let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${deployment}`;
    let replicas = { 'spec': { 'replicas': 1 } };
    const startResponse = await _requestWithCookie(requestURL, 'PATCH', replicas);
    if (startResponse.status !== 201) {
        logger.error(`云桌面${deployment}启动失败！`)
        throw `云桌面${deployment}启动失败！`
    } else {
        logger.info(`云桌面${deployment}启动成功！`)
    }
}

//暂停deployment，释放云桌面所占用资源，但是保留相关配置
const suspendTKEDeployment = async (deployment) => {
    let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${deployment}`;
    let replicas = { 'spec': { 'replicas': 0 } };
    const stopResponse = await _requestWithCookie(requestURL, 'PATCH', replicas);
    if (stopResponse.status !== 201) {
        logger.error(`云桌面${deployment}暂停失败！`)
        throw `云桌面${deployment}暂停失败！`
    } else {
        logger.info(`云桌面${deployment}暂停成功！`)
    }

}

// 删除 deployment
const deleteTKEDeployment = async (deployment) => {
    try {
        // 删除 deployment
        let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${deployment}`;
        let dataObj = { propagationPolicy: "Background" };
        await _requestWithCookie(requestURL, 'DELETE', dataObj);
        // 删除 Service
        requestURL = `/api/v1/namespaces/${tkeServer.namespace}/services/${deployment}`;
        await _requestWithCookie(requestURL, 'DELETE', dataObj);
        // 删除PVC
        // 保留用户数据先注释掉
        //requestURL = `/api/v1/namespaces/${tkeServer.namespace}/persistentvolumeclaims/${deployment}`;
        //await _requestWithCookie(requestURL, 'DELETE', dataObj);

        //删除etcd中的记录
        deleteDesktop(deployment);

    } catch (error) {
        throw '删除VNC Deployments 失败：' + error;
    }
}

// 列出所有的deployment
const listTKEDeployment = async () => {
    // 获取deployments 列表
    let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments`
    const deploymentResp = await _requestWithCookie(requestURL, 'GET');
    // 获取所有的services 列表
    requestURL = `/api/v1/namespaces/${tkeServer.namespace}/services`
    const serviceResp = await _requestWithCookie(requestURL, 'GET');
    let services = {}
    serviceResp.items.forEach(element => {
        let key = element.metadata.name;
        services[key] = element;
    });
    // 获取所有etcd存储的数据
    let allDesktops = await getAllDesktops();
    console.log(allDesktops);
    // 返回客户端需要的信息
    let deployments = [];
    deploymentResp.items
        .filter(element => element.metadata.name.startsWith(AI_DESKTOP_PREFIX))
        .forEach(async (element) => {
            // 计算持续天数
            const createDate = new Date(element.metadata.creationTimestamp).getTime();
            const nowDate = Date.now();
            const durationDays = Math.ceil((nowDate - createDate) / (1000 * 3600 * 24));
            // 计算资源规格
            let resources = {}
            const deploymentContainers = element.spec.template.spec.containers;
            deploymentContainers.forEach(container => {
                const limits = container.resources.limits;
                for (let [key, value] of Object.entries(limits)) {
                    if ('tencent.com/vcuda-core' === key) {
                        key = 'gpu';
                        value = (value / 100).toFixed(1);
                    }
                    if ('tencent.com/vcuda-memory' === key) {
                        key = 'gpuMemory';
                        value = value * 256;
                    }
                    if (key in resources) {
                        resources[key] += value;
                    } else {
                        resources[key] = value;
                    }
                }
            });
            // 计算是否启动成功
            let deploymentStatus = false
            if (element.status.readyReplicas >= 1 && element.status.readyReplicas === element.status.replicas) {
                deploymentStatus = true
            }
            // 计算是否可以停止
            let restopStatus = true
            if (element.status.replicas === undefined) {
                restopStatus = false;
            }

            // 获取etcd数据库中的信息
            let projectlist = [];
            let hostIP = '';
            let deviceIdx = '';

            const desktop = allDesktops[element.metadata.name];
            if (desktop) {
                //获取项目列表
                projectlist = desktop['projectlist'];
                hostIP = desktop['hostIP'];
                deviceIdx = desktop['deviceIdx'];
            } else {
                //创建云桌面
                createDesktop(element.metadata.name);
            }
            if (!hostIP) {
                // 获取deployment的pods列表
                let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${element.metadata.name}/pods`;
                const podsResp = await _requestWithCookie(requestURL, 'GET');
                const pod = podsResp.items[0];
                if (pod.metadata.annotations['tencent.com/gpu-assigned'] && pod.metadata.annotations['tencent.com/gpu-assigned'] === 'true') {
                    //查询赋值
                    hostIP = pod.metadata.annotations['tencent.com/predicate-node'];
                    deviceIdx = `/dev/nvidia${pod.metadata.annotations['tencent.com/predicate-gpu-idx-0']}`;
                    //更新到数据库中
                    updateDesktop(element.metadata.name, {'hostIP': hostIP, 'deviceIdx': deviceIdx});
                }
            }
            // 页面返回对象
            let deploy = {
                name: element.metadata.name,
                creationTimestamp: element.metadata.creationTimestamp.replace('T', ' ').replace('Z',''),
                durationDays: durationDays,
                username: element.metadata.labels.username,
                status: deploymentStatus,
                resources: resources,
                projectlist: projectlist,
                restopStatus: restopStatus,
                hostIP: hostIP,
                deviceIdx: deviceIdx
            }
            deployments.push(deploy);
        });
    return deployments;
}

//通过deploymentName获取deployments
const getTKEDeployment = async (deploymentName) => {
    // 获取某一个deployment
    let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${deploymentName}`;
    const deployment = await _requestWithCookie(requestURL, 'GET');
    // 获取一个service
    requestURL = `/api/v1/namespaces/${tkeServer.namespace}/services/${deploymentName}`;
    const service = await _requestWithCookie(requestURL, 'GET');

    let deploy = null;
    if (deployment && service) {
        // 计算持续天数
        const createDate = new Date(deployment.metadata.creationTimestamp).getTime();
        const nowDate = Date.now();
        const durationDays = Math.ceil((nowDate - createDate) / (1000 * 3600 * 24));
        // 计算资源规格
        let resources = {}
        const deploymentContainers = deployment.spec.template.spec.containers;
        deploymentContainers.forEach(container => {
            const limits = container.resources.limits;
            for (let [key, value] of Object.entries(limits)) {
                if ('tencent.com/vcuda-core' === key) {
                    key = 'gpu';
                    value = (value / 100).toFixed(1);
                }
                if ('tencent.com/vcuda-memory' === key) {
                    key = 'gpuMemory';
                    value = value * 256;
                }
                if (key in resources) {
                    resources[key] += value;
                } else {
                    resources[key] = value;
                }
            }
        });
        // 生成服务端访问的baseURL
        let basePath = undefined;
        const authToken = Buffer.from(deployment.metadata.labels.username).toString('base64');
        const accessPort = service.spec.ports[0].nodePort;
        const hosts = tkeServer.hosts.split(',');
        const accessHost = hosts[Math.floor(Math.random() * hosts.length)];
        basePath = `http://${accessHost}:${accessPort}`;

        // 生成云桌面所有的工具地址
        const tools = [
            {
                'key': 'noVNC',
                'name': 'AI云桌面',
                'description': '可视化AI云桌面Linux操作系统',
                'url': `${basePath}/login?next=${encodeURIComponent('/tools/vnc/?password=vncpassword')}&token=${authToken}`
            },
            {
                'key': 'lab',
                'name': 'Jupyter Lab',
                'description': '是包括了notebook的下一代用户界面，界面模块化，可在同一个窗口同时打开多个notebook',
                'url': `${basePath}/login?next=${encodeURIComponent('/lab')}&token=${authToken}`
            },
            {
                'key': 'vscode',
                'name': 'VSCode开发工具',
                'description': '可视化VSCode开发集成环境',
                'url': `${basePath}/login?next=${encodeURIComponent('/tools/vscode/')}&token=${authToken}`
            },
            {
                'key': 'terminal',
                'name': 'Shell命令行终端',
                'description': 'Web Shell 命令行终端',
                'url': `${basePath}/login?next=${encodeURIComponent('/terminals/main/')}&token=${authToken}`
            },
            {
                'key': 'netdata',
                'name': 'NetData桌面资源监控',
                'description': 'netdata实时、动态展示系统资源信息',
                'url': `${basePath}/login?next=${encodeURIComponent('/tools/netdata/')}&token=${authToken}`
            },
            {
                'key': 'glances',
                'name': 'Glance桌面资源监控',
                'description': 'Glances比top命令工具更强大的系统监控工具',
                'url': `${basePath}/login?next=${encodeURIComponent('/tools/glances/')}&token=${authToken}`
            },
            {
                'key': 'filebrowser',
                'name': '云桌面文件系统',
                'description': '文件系统工具实现云桌面工作空间文件操作',
                'url': `${basePath}/login?next=${encodeURIComponent('/shared/filebrowser/files/workspace/?token=admin')}&token=${authToken}`
            }
        ]
        // 计算是否启动成功
        let deploymentStatus = false
        if (deployment.status.readyReplicas >= 1 && deployment.status.readyReplicas === deployment.status.replicas) {
            deploymentStatus = true
        }

        // 获取etcd数据库中的信息
        let projectlist = [];
        let hostIP = '';
        let deviceIdx = '';

        const desktop = await getDesktop(deployment.metadata.name);
        if (desktop) {
            //获取项目列表
            projectlist = desktop['projectlist'];
            hostIP = desktop['hostIP'];
            deviceIdx = desktop['deviceIdx'];
        } else {
            //创建云桌面
            createDesktop(element.metadata.name);
        }
        if (!hostIP) {
            // 获取deployment的pods列表
            let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${deployment.metadata.name}/pods`;
            const podsResp = await _requestWithCookie(requestURL, 'GET');
            const pod = podsResp.items[0];
            if (pod.metadata.annotations['tencent.com/gpu-assigned'] && pod.metadata.annotations['tencent.com/gpu-assigned'] === 'true') {
                //查询赋值
                hostIP = pod.metadata.annotations['tencent.com/predicate-node'];
                deviceIdx = `/dev/nvidia${pod.metadata.annotations['tencent.com/predicate-gpu-idx-0']}`;
                //更新到数据库中
                updateDesktop(deployment.metadata.name, {hostIP:hostIP, deviceIdx:deviceIdx});
            }
        }

        // 页面返回对象
        deploy = {
            name: deployment.metadata.name,
            creationTimestamp: deployment.metadata.creationTimestamp.replace('T', ' ').replace('Z',''),
            durationDays: durationDays,
            username: deployment.metadata.labels.username,
            status: deploymentStatus,
            resources: resources,
            projectlist: projectlist,
            hostIP: hostIP,
            deviceIdx: deviceIdx,
            desktopTools: { 'toolCollection': { 'tools': tools } }
        }
    } else {
        logger.error(`获取${deploymentName}deployment: ${deployment} service: ${service} 失败！！！`);
    }
    return deploy;
}

// 列出所有的pvcs
const listTKEPVCs = async () => {
    //获取命名空间的 pvcs 的列表
    let requestURL = `/api/v1/namespaces/${tkeServer.namespace}/persistentvolumeclaims`
    const pvcsResp = await _requestWithCookie(requestURL, 'GET');
    let pvcs = [];
    pvcsResp.items.forEach(item => pvcs.push(item.metadata.name));
    return pvcs;
}

// 统计所有deployment的gpu，gpumemory使用情况
const getDeploymentsUtilization = async () => {
    // 获取deployments 列表
    let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments`
    const deploymentResp = await _requestWithCookie(requestURL, 'GET');
    // 返回客户端需要的信息
    let utilization = {
        'totalGPU': tkeServer.total_gpu,
        'totalGPUMemory': tkeServer.total_gpu_memory,
        'defaultGPU': tkeServer.default_gpu,
        'defaultGPUMemory': tkeServer.default_gpu_memory,
        'usedGPU': 0,
        'usedGPUMemory': 0,
        'availableGPU': 0,
        'availableGPUMemory': 0
    };
    deploymentResp.items
        .filter(element => element.metadata.name.startsWith(AI_DESKTOP_PREFIX))
        .forEach(element => {
            // 计算资源规格
            const deploymentContainers = element.spec.template.spec.containers;
            deploymentContainers.forEach(container => {
                const limits = container.resources.limits;
                for (let [key, value] of Object.entries(limits)) {
                    if ('tencent.com/vcuda-core' === key) {
                        utilization.usedGPU += parseInt(value);
                    }
                    if ('tencent.com/vcuda-memory' === key) {
                        utilization.usedGPUMemory += parseInt(value);
                    }
                }
            });
        });
    utilization.usedGPU = (utilization.usedGPU / 100).toFixed(2);
    utilization.availableGPU = (utilization.totalGPU - utilization.usedGPU).toFixed(2);
    utilization.availableGPUMemory = utilization.totalGPUMemory - utilization.usedGPUMemory;
    return utilization;
}

// 获取所有的GPU类型
const getTKEGpuTypes = async () => {
    return tkeServer.gpu_types.split(',');
}

// 更新云桌面的项目列表
const updateProjectlistToDesktop = async (desktopName, projectlist) => {
    try {
        projects = projectlist.split(',');
        await updateDesktop(desktopName, {'projectlist': projects});
    } catch (error) {
        throw `云桌面${desktopName}` + '更新Projectslist失败：' + error;
    }
}

//获取一个项目，列出所有包含该项目的云桌面列表
const listDesktopsWithProject = async (project) => {
    let deployments = await listTKEDeployment();
    const desktops = deployments.filter(item => item.projectlist.includes(project));
    return desktops;
}

// 删除云桌面的项目列表中的某一个项目
const removeProjectFromDesktopProjectlist = async (desktopName, project) => {
    try {
        const desktop = await getDesktop(desktopName);
        let projectlist = desktop.projectlist.filter(item => item !== project);
        await updateDesktop(desktopName, {'projectlist': projectlist});
    } catch (error) {
        throw `云桌面${desktopName}` + '删除Project失败：' + error;
    }
}

//删除一个项目，更新所有云桌面的项目列表
const updateAllDesktopProjectlist = async (project, desktoplist) => {
    desktoplist.forEach(async (desktop) => {
        try {
            await removeProjectFromDesktopProjectlist(desktop, project);
        } catch (error) {
            logger.error(`从${desktop}的grouplist中删除${project}失败！！`);
        }
    });
}

//exports
module.exports = {
    createTKEDeployment,
    resumeTKEDeployment,
    deleteTKEDeployment,
    listTKEDeployment,
    getTKEDeployment,
    getDeploymentsUtilization,
    getTKEGpuTypes,
    updateProjectlistToDesktop,
    listDesktopsWithProject,
    removeProjectFromDesktopProjectlist,
    updateAllDesktopProjectlist,
    suspendTKEDeployment,
}
