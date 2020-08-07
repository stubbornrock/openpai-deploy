#!/bin/bash
HOST_PAI_DEPLOY="./data"

CONTAINER_PAI_DEPLOY="/root/pai-deploy"
CONTAINER_PAI_DIR="${CONTAINER_PAI_DEPLOY}/pai"
CONTAINER_KUBESPRAY_DIR="${CONTAINER_PAI_DEPLOY}/kubespray"
CONTAINER_PAI_KUBESPRAY_DIR="${CONTAINER_PAI_DEPLOY}/pai/contrib/kubespray/"

CONTAINER_TEMPLATES_DIR="${CONTAINER_PAI_DEPLOY}/quick-start-config"

CONTAINER_USER_CONFIG="${CONTAINER_PAI_DEPLOY}/hosts"
CONTAINER_PLUGIN_DIR="${CONTAINER_PAI_DEPLOY}/device_plugins"


function _dev_box_exec(){
    docker exec -it dev-box $*
}

#准备k8s文件及openpai的配置模板到
# => /root/pai-deploy/cluster-cfg
# => /root/pai-deploy/quick-start-config
function generate_cluster_configs(){
    _dev_box_exec "/bin/bash ${CONTAINER_PAI_KUBESPRAY_DIR}script/configuration.sh -m ${CONTAINER_USER_CONFIG}/master.csv -w ${CONTAINER_USER_CONFIG}/worker.csv -c ${CONTAINER_USER_CONFIG}/config.yml"

    echo -e "\033[32mConfigurations generate success!\033[0m"
    tree ${HOST_PAI_DEPLOY}/cluster-cfg
    tree ${HOST_PAI_DEPLOY}/quick-start-config
}

#部署k8s后执行
function generagte_openpai_configs(){
    # 部署获取设备信息
    _dev_box_exec "kubectl apply --overwrite=true -f $CONTAINER_PLUGIN_DIR/nvidia-device-plugin.yml"
    sleep 5
    _dev_box_exec "kubectl apply --overwrite=true -f $CONTAINER_PLUGIN_DIR/amd-device-plugin.yml"
    sleep 5
    # 生成配置文件
    mkdir -p ${HOST_PAI_DEPLOY}/cluster-configuration/
    _dev_box_exec "python3 ${CONTAINER_PAI_KUBESPRAY_DIR}script/openpai-generator.py -m ${CONTAINER_USER_CONFIG}/master.csv -w ${CONTAINER_USER_CONFIG}/worker.csv -c ${CONTAINER_USER_CONFIG}/config.yml -t ${CONTAINER_TEMPLATES_DIR} -o ${CONTAINER_PAI_DEPLOY}/cluster-configuration/"
    # 删除服务
    _dev_box_exec "kubectl delete -f $CONTAINER_PLUGIN_DIR/nvidia-device-plugin.yml"
    _dev_box_exec "kubectl delete -f $CONTAINER_PLUGIN_DIR/amd-device-plugin.yml"
}

function _get_k8s_nodes(){
    _dev_box_exec "kubectl get node"
}

# 创建命名空间
function _create_pai_storage_namespace(){
    _dev_box_exec "kubectl create namespace pai-storage"
}

# 推送服务配置
function _push_service_configs(){
    _dev_box_exec "python ${CONTAINER_PAI_DIR}/paictl.py config push -p ${CONTAINER_PAI_DEPLOY}/cluster-configuration -m service -c /root/.kube/config"
}

function _start_pai_service(){
   
    if [[ $# -ne 0 ]];then
        _dev_box_exec "python ${CONTAINER_PAI_DIR}/paictl.py service start -c /root/.kube/config -n $*"
    else
        _dev_box_exec "python ${CONTAINER_PAI_DIR}/paictl.py service start -c /root/.kube/config"
    fi
}

function _stop_pai_service(){
   if [[ $# -ne 0 ]];then
       _dev_box_exec "python ${CONTAINER_PAI_DIR}/paictl.py service stop -c /root/.kube/config -n $*"
   else
       _dev_box_exec "python ${CONTAINER_PAI_DIR}/paictl.py service stop -c /root/.kube/config"
   fi
}

USAGE(){
    msg="USAGE:\n./pai-manager.sh [--k8s-config-generate
                  --pai-config-generate
                  --pai-config-push
                  --pai-service-start [service]
                  --pai-service-stop [service]]"
    echo -e "\033[31m$msg\033[0m"
}

action=$1
service=$2
if   [[ $action == "--k8s-config" ]];then
    generate_cluster_configs
elif [[ $action == "--pai-config" ]];then
    read -p "You must deployed k8s and dev-box is available to k8s ?(y/n):" ok
    if [[ $ok == "y" ]];then
        generagte_openpai_configs
    fi
elif [[ $action == "--pai-config-push" ]];then
    _push_service_configs
elif [[ $action == "--pai-service-start" ]];then
    _start_pai_service $service
elif [[ $action == "--pai-service-stop" ]];then
    _stop_pai_service $service
else
    USAGE
fi
