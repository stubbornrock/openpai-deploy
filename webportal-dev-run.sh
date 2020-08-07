pushd pai/src/webportal > /dev/null
cat << __EOT__ > .env
LAUNCHER_TYPE=k8s
LOG_TYPE=log-manager
REST_SERVER_URI=http://192.168.19.33:9186
PROMETHEUS_URI=http://192.168.19.33:9091
GRAFANA_URI=http://192.168.19.33:3000
K8S_DASHBOARD_URI=https://192.168.19.33:9090
K8S_API_SERVER_URI=https://192.168.19.33:6443
ALERT_MANAGER_URI=http://192.168.19.33:9093
REGISTRY_SERVER_URI=http://192.168.21.228:8080
APPLICATION_SERVER_URI=https://192.168.19.118:8443
DATASET_SERVER_URI=http://192.168.21.228:9000
LABEL_SERVER_URI=http://192.168.21.228:8081
MODEL_SERVER_URI=http://192.168.19.39
DEVELOP_PLATFORM_URI=http://192.168.21.102:8081
EXPORTER_PORT=9100
JOB_HISTORY=true
AUTHN_METHOD=basic
PROM_SCRAPE_TIME=300s
WEBPORTAL_PLUGINS=[{"uri": "http://192.168.19.33:32767/submit-job-v2/plugin.js", "id": "submit-job-v2", "title": "作业提交V2"}, {"uri": "http://192.168.19.33:32767/marketplace/plugin.js", "id": "marketplace", "title": "模板仓库"}]
#WEBPORTAL_PLUGINS=[{"uri": "http://192.168.21.221:9290/plugin.js", "id": "submit-job-v2", "title": "作业提交V2"}, {"uri": "http://192.168.21.221:9291/plugin.js", "id": "marketplace", "title": "模板仓库"}]
#WEBPORTAL_PLUGINS=[{"uri": "http://192.168.19.33:32767/submit-job-v2/plugin.js", "id": "submit-job-v2", "title": "作业提交V2"}, {"uri": "http://192.168.21.221:9291/plugin.js", "id": "marketplace", "title": "模板仓库"}]
__EOT__
npm run dev
popd > /dev/null
