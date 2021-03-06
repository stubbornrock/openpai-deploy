pushd pai/src/rest-server > /dev/null
cat << __EOT__ > .env
LAUNCHER_TYPE=k8s
LAUNCHER_PRIORITY_CLASS="False"
LAUNCHER_RUNTIME_IMAGE=192.168.21.228/openpai/kube-runtime:v0.17.0
LAUNCHER_RUNTIME_IMAGE_PULL_SECRETS=pai-secret
LAUNCHER_SCHEDULER=hivedscheduler
HIVED_WEBSERVICE_URI=http://192.168.19.33:30096
LOG_MANAGER_PORT="9103"
JWT_SECRET=pai-secret
JWT_TOKEN_EXPIRE_TIME=7d
WEBPORTAL_URL=192.168.19.33
AUTHN_METHOD=basic
DEFAULT_PAI_ADMIN_USERNAME=admin
DEFAULT_PAI_ADMIN_PASSWORD=admin-password
ELASTICSEARCH_URI=http://192.168.19.33:30100
K8S_APISERVER_URI=https://192.168.19.33:6443
AZ_RDMA="false"
DEBUGGING_RESERVATION_SECONDS="604800"
RBAC_IN_CLUSTER="true"
__EOT__
npm run start
popd > /dev/null
