#!/bin/bash
BASE_PATH="/"

mkdir -p ${BASE_PATH}/pai-cluster-config
cat ./restserver-dev-configs/pai-cluster-config/layout.yaml > ${BASE_PATH}/pai-cluster-config/layout.yaml
cat ./restserver-dev-configs/pai-cluster-config/services-configuration.yaml > ${BASE_PATH}/pai-cluster-config/services-configuration.yaml

mkdir -p ${BASE_PATH}/group-configuration
cat ./restserver-dev-configs/group-configuration/group.yaml > ${BASE_PATH}/group-configuration/group.yaml

mkdir -p ${BASE_PATH}/hived-spec
cat ./restserver-dev-configs/hived-spec/hivedscheduler.yaml > ${BASE_PATH}/hived-spec/hivedscheduler.yaml
cat ./restserver-dev-configs/hived-spec/policy.cfg > ${BASE_PATH}/hived-spec/policy.cfg

mkdir -p ${BASE_PATH}/k8s-job-exit-spec-configuration
cat ./restserver-dev-configs/k8s-job-exit-spec-configuration/k8s-job-exit-spec.yaml > ${BASE_PATH}/k8s-job-exit-spec-configuration/k8s-job-exit-spec.yaml

mkdir -p ${BASE_PATH}/tkestack-configuration
cat ./restserver-dev-configs/tkestack-configuration/tkestack.yaml > ${BASE_PATH}/tkestack-configuration/tkestack.yaml

mkdir -p ${BASE_PATH}/harbor-configuration
cat ./restserver-dev-configs/harbor-configuration/harbor.yaml > ${BASE_PATH}/harbor-configuration/harbor.yaml

mkdir -p ${BASE_PATH}/konga-configuration
cat ./restserver-dev-configs/konga-configuration/konga.yaml > ${BASE_PATH}/konga-configuration/konga.yaml

mkdir -p ${BASE_PATH}/aiaccount-configuration
cat ./restserver-dev-configs/aiaccount-configuration/account.yaml > ${BASE_PATH}/aiaccount-configuration/account.yaml

mkdir -p ${BASE_PATH}/docker-build-configuration
cat ./restserver-dev-configs/docker-build-configuration/docker-build.yaml > ${BASE_PATH}/docker-build-configuration/docker-build.yaml

mkdir -p ${BASE_PATH}/develop-platform
cat ./restserver-dev-configs/develop-platform/develop.yaml > ${BASE_PATH}/develop-platform/develop.yaml

mkdir -p ~/.kube/
cat ./restserver-dev-configs/.kube/config > ~/.kube/config

pushd pai/src/rest-server > /dev/null

#cat << __EOT__ > .env
#LAUNCHER_TYPE=k8s
#LAUNCHER_PRIORITY_CLASS="true"
#LAUNCHER_RUNTIME_IMAGE="192.168.21.228/openpai/openpai-runtime:v1.0.0"
#LAUNCHER_RUNTIME_IMAGE_PULL_SECRETS="pai-secret"
#LAUNCHER_SCHEDULER="hivedscheduler"
#HIVED_WEBSERVICE_URI="http://192.168.19.33:30096"
#LOG_MANAGER_PORT="9103"
#RATE_LIMIT_API_PER_MIN="600"
#RATE_LIMIT_LIST_JOB_PER_MIN="60"
#RATE_LIMIT_SUBMIT_JOB_PER_HOUR="60"
#JWT_SECRET=pai-secret
#JWT_TOKEN_EXPIRE_TIME=7d
#WEBPORTAL_URL=http://192.168.19.33:80
#AUTHN_METHOD=basic
#DEFAULT_PAI_ADMIN_USERNAME=admin
#DEFAULT_PAI_ADMIN_PASSWORD=admin-password
#K8S_APISERVER_URI=https://192.168.19.33:6443
#AZ_RDMA="false"
#DEBUGGING_RESERVATION_SECONDS="604800"
#RBAC_IN_CLUSTER="true"
#SQL_CONNECTION_STR="postgresql://root:rootpass@192.168.19.33:5432/openpai"
#JOB_HISTORY="true"
#__EOT__

cat << __EOT__ > .env
LAUNCHER_TYPE=k8s
LAUNCHER_PRIORITY_CLASS="true"
LAUNCHER_RUNTIME_IMAGE=192.168.24.21/openpai/openpai-runtime:v1.5.0
LAUNCHER_RUNTIME_IMAGE_PULL_SECRETS=pai-secret
LAUNCHER_SCHEDULER=hivedscheduler
HIVED_WEBSERVICE_URI=http://192.168.21.236:30096
LOG_MANAGER_PORT="9103"
LOG_MANAGER_ADMIN_NAME=admin
LOG_MANAGER_ADMIN_PASSWORD=admin
RATE_LIMIT_API_PER_MIN="600"
RATE_LIMIT_LIST_JOB_PER_MIN="120"
RATE_LIMIT_SUBMIT_JOB_PER_HOUR="3600"
SCHEDULE_PORT_START="15000"
SCHEDULE_PORT_END="40000"
JWT_SECRET=pai-secret
JWT_TOKEN_EXPIRE_TIME=7d
WEBPORTAL_URL=http://192.168.21.236:80
AUTHN_METHOD=basic
DEFAULT_PAI_ADMIN_USERNAME=admin
DEFAULT_PAI_ADMIN_PASSWORD=admin-password
K8S_APISERVER_URI=https://192.168.21.236:6443
AZ_RDMA="false"
DEBUGGING_RESERVATION_SECONDS="604800"
RBAC_IN_CLUSTER="true"
SQL_CONNECTION_STR=postgresql://root:rootpass@192.168.21.236:5432/openpai
SQL_MAX_CONNECTION="50"
JOB_HISTORY="true"
WRITE_MERGER_URL=http://192.168.21.236:9748
DEFAULT_COMPUTING_DEVICE_TYPE=nvidia.com/gpu
HIVED_COMPUTING_DEVICE_ENVS=NVIDIA_VISIBLE_DEVICES,HIVED_VISIBLE_DEVICES
__EOT__

nodemon index.js
popd > /dev/null
