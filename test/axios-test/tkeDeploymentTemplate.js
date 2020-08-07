const TKE_DEPLOYMENT = `
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    k8s-app: {{ name }}
    ctpai-app: {{ name }}
    username: {{ username }}
  name: {{ name }}
  namespace: {{ namespace }}
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: {{ name }}
      ctpai-app: {{ name }}
      username: {{ username }}
  template:
    metadata:
      labels:
        k8s-app: {{ name }}
        ctpai-app: {{ name }}
        username: {{ username }}
    spec:
      {{#gpuType}}
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: ctpai/gpuType
                operator: In
                values:
                - {{ gpuType }}
      {{/gpuType}}
      containers:
      - image: {{ image }}
        imagePullPolicy: Always
        name: {{ name }}
        resources:
          limits:
            cpu: 500m
            memory: 1Gi
            tencent.com/vcuda-core: {{ vcudaCore }}
            tencent.com/vcuda-memory: {{ vcudaMemory }}
          requests:
            cpu: 250m
            memory: 256Mi
            tencent.com/vcuda-core: {{ vcudaCore }}
            tencent.com/vcuda-memory: {{ vcudaMemory }}
      restartPolicy: Always`

const TKE_SERVICE = `
apiVersion: v1
kind: Service
metadata:
  name: {{ name }}
  namespace: {{ namespace }}
spec:
  type: NodePort
  externalTrafficPolicy: Cluster
  sessionAffinity: None
  ports:
  - name: tcp-ai-desktop
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    k8s-app: {{ name }}
    ctpai-app: {{ name }}
    username: {{ username }}`

// module exports
module.exports = {
    TKE_DEPLOYMENT,
    TKE_SERVICE
}
