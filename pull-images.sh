set -e
HARBOR="192.168.21.228"
OPENPAI_PROJECT="openpai"
IMAGE_TAG="v1.0.0"

independent_v0170="
prom/alertmanager:v0.15.1\n
frameworkcontroller/frameworkcontroller:v0.6.0\n
hivedscheduler/hivedscheduler:v0.2.6\n
everpeace/k8s-host-device-plugin:latest\n
elasticsearch:7.4.0\n
nvidia/k8s-device-plugin:1.0.0-beta4\n
alpine:3.6"
#${HARBOR}/kubernetes/goolge_containers/kubernetes-dashboard-amd64:v1.10.1"
#${HARBOR}/kubernetes/goolge_containers/kube-scheduler:v1.16.7"

openpai_v0170="
${OPENPAI_PROJECT}/dev-box:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/grafana:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/prometheus:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/log-manager-logrotate:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/log-manager-nginx:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/fluentd:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/internal-storage-create:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/job-exporter:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/node-exporter:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/postgresql:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/postgresql-init-client:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/pylon:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/rest-server:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/storage-manager:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/watchdog:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/webportal:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/kube-runtime:${IMAGE_TAG}\n"

independent="
mirrorgooglecontainers/kubernetes-dashboard-amd64:v1.10.1\n
busybox:1.31.1\n
prom/alertmanager:v0.15.1\n
frameworkcontroller/frameworkcontroller:v0.6.0\n
everpeace/k8s-host-device-plugin:latest\n
nvidia/k8s-device-plugin:1.0.0-beta4"
#${HARBOR}/kubernetes/goolge_containers/kubernetes-dashboard-amd64:v1.10.1"

openpai="
${OPENPAI_PROJECT}/dev-box:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/hivedscheduler:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/kube-scheduler:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/grafana:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/prometheus:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/log-manager-logrotate:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/log-manager-nginx:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/fluentd:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/internal-storage-create:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/job-exporter:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/node-exporter:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/postgresql:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/postgresql-init-client:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/pylon:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/rest-server:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/storage-manager:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/watchdog:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/webportal:${IMAGE_TAG}\n
${OPENPAI_PROJECT}/openpai-runtime:${IMAGE_TAG}"

## ----------------- Main ---------------------
echo -e $independent | while read line
do
    echo "pulling $line ...."
    docker pull $line
    docker tag $line ${HARBOR}/openpai/$line
    docker push ${HARBOR}/openpai/$line
done

echo -e $openpai | while read line
do
    echo "pulling $line ...."
    docker pull $line
    docker tag $line ${HARBOR}/$line
    docker push ${HARBOR}/$line
done
