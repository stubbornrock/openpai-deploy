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

function _reset_openpai_k8s(){
    pushd ${KUBESPRAY_PATH} > /dev/null
    _playbook_exec -i inventory/pai-cluster/host.ini reset.yml
    popd > /dev/null
}
_reset_openpai_k8s
