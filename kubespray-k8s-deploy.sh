#!/bin/bash
# docker exec -it hyperkube:v1.14.2 bash;scp /hyperkube 10.10.0.1:/var/www/html/kubernetes/
# yum install kubeadm-1.14.2; cp /usr/bin/kubeadm /var/www/html/kubernetes/
# kubeadm init --kubernetes-version=v1.14.2 --pod-network-cidr=10.244.0.0/16 --service-cidr=10.96.0.0/12 --ignore-preflight-errors=Swap

BASE_PATH=`pwd`
KUBESPRAY_PATH=${BASE_PATH}/kubespray/
OPENPAI_PATH=${BASE_PATH}/pai
export ANSIBLE_INVALID_TASK_ATTRIBUTE_FAILED=False #ansile2.8 bug
export ANSIBLE_CONFIG=${KUBESPRAY_PATH}/ansible.cfg

sed -i "s#^log_path.*#log_path=${BASE_PATH}/deploy-k8s.log#g" ${ANSIBLE_CONFIG}
rm -rf ${BASE_PATH}/deploy-k8s.log

function _playbook_exec(){
    /usr/bin/ansible-playbook -b --become-user=root $*
}

function _openpai_runtime(){
    pushd ${OPENPAI_PATH}/contrib/kubespray/ > /dev/null
    #_playbook_exec -i ${BASE_PATH}/host.ini copy-daemon-openpai-default-runtime.yml --v0.17.0
    #_playbook_exec -i ${BASE_PATH}/host.ini copy-daemon-openpai-nvidia-runtime.yml --v0.17.0

    #_playbook_exec -i ${BASE_PATH}/host.ini drivers-install.yaml
    #/etc/openpai/daemon.json
    _playbook_exec -i ${BASE_PATH}/host.ini docker-runtime-setup.yml
    popd > /dev/null
}

function _deploy_openpai_k8s(){
    rm -rf ${KUBESPRAY_PATH}/inventory/pai-cluster
    cp -rfp ${KUBESPRAY_PATH}/inventory/sample ${KUBESPRAY_PATH}/inventory/pai-cluster
    #cp ${OPENPAI_PATH}/contrib/kubespray/quick-start/openpai.yml ${KUBESPRAY_PATH}/inventory/pai-cluster --v0.17.0
    cp ${BASE_PATH}/data/cluster-cfg/openpai.yml ${KUBESPRAY_PATH}/inventory/pai-cluster
    cp ${BASE_PATH}/host.ini ${KUBESPRAY_PATH}/inventory/pai-cluster
    cp ${BASE_PATH}/user-define.yml ${KUBESPRAY_PATH}/inventory/pai-cluster
    pushd ${KUBESPRAY_PATH} > /dev/null
    _playbook_exec -i inventory/pai-cluster/host.ini cluster.yml -e "@inventory/pai-cluster/openpai.yml" -e "@inventory/pai-cluster/user-define.yml"
    popd > /dev/null
}
_openpai_runtime
_deploy_openpai_k8s
