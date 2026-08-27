import type { ResourceItem } from './types';

/** Seed data shown before the first live fetch from docker/kubectl. */
export const INITIAL_DOCKER_RESOURCES: Record<string, ResourceItem[]> = {
  containers: [
    { id: 'c102a39f', name: 'nginx-ingress-gateway', type: 'Container', image: 'nginx:alpine', status: 'running', cpu: 12, memory: 128, ip: '172.17.0.2', ports: '80:80, 443:443', age: '2d' },
    { id: 'f87b2011', name: 'redis-cache-cluster', type: 'Container', image: 'redis:7-alpine', status: 'running', cpu: 4, memory: 64, ip: '172.17.0.3', ports: '6379:6379', age: '5d' },
    { id: 'a912e45d', name: 'postgres-db-primary', type: 'Container', image: 'postgres:15', status: 'running', cpu: 18, memory: 512, ip: '172.17.0.4', ports: '5432:5432', age: '10d' },
    { id: 'b5510c8e', name: 'payment-microservice-api', type: 'Container', image: 'node:18-slim', status: 'stopped', cpu: 0, memory: 0, ip: '172.17.0.5', ports: '3000:3000', age: '1d' }
  ],
  images: [
    { id: 'img-nginx', name: 'nginx:alpine', type: 'Image', status: 'active', cpu: 0, memory: 0, age: '15d', ports: '23.4 MB' },
    { id: 'img-redis', name: 'redis:7-alpine', type: 'Image', status: 'active', cpu: 0, memory: 0, age: '30d', ports: '32.1 MB' },
    { id: 'img-postgres', name: 'postgres:15', type: 'Image', status: 'active', cpu: 0, memory: 0, age: '45d', ports: '379 MB' }
  ],
  volumes: [
    { id: 'vol-postgres', name: 'pg_data_vol', type: 'Volume', status: 'active', cpu: 0, memory: 0, age: '10d', ports: 'Local /var/lib/postgresql/data' },
    { id: 'vol-redis', name: 'redis_config_vol', type: 'Volume', status: 'active', cpu: 0, memory: 0, age: '5d', ports: 'Local /data' }
  ],
  networks: [
    { id: 'net-bridge', name: 'bridge', type: 'Network', status: 'active', cpu: 0, memory: 0, age: '60d', ports: 'bridge / local' },
    { id: 'net-overlay', name: 'app_overlay_net', type: 'Network', status: 'active', cpu: 0, memory: 0, age: '12d', ports: 'overlay / swarm' }
  ]
};

export const INITIAL_K8S_RESOURCES: Record<string, ResourceItem[]> = {
  pods: [
    { id: 'pod-auth', name: 'auth-service-589f6d79b-4k2x9', type: 'Pod', image: 'auth-service:v1.4.2', status: 'running', cpu: 15, memory: 256, ip: '10.244.1.15', age: '3d' },
    { id: 'pod-pay', name: 'payment-gateway-7c4d989f-8m1l2', type: 'Pod', image: 'payment-gateway:v2.1', status: 'running', cpu: 22, memory: 312, ip: '10.244.2.42', age: '5d' },
    { id: 'pod-worker', name: 'background-worker-6b8c9d-9q5z1', type: 'Pod', image: 'worker:latest', status: 'CrashLoopBackOff', cpu: 0, memory: 0, ip: '10.244.1.88', age: '1d' },
    { id: 'pod-front', name: 'frontend-nextjs-84b79c-3t7v4', type: 'Pod', image: 'nextjs-app:v3.0.1', status: 'running', cpu: 8, memory: 180, ip: '10.244.2.19', age: '7d' }
  ],
  deployments: [
    { id: 'dep-auth', name: 'auth-service', type: 'Deployment', image: 'Replicas: 2/2', status: 'active', cpu: 15, memory: 512, age: '30d' },
    { id: 'dep-payment', name: 'payment-gateway', type: 'Deployment', image: 'Replicas: 1/1', status: 'active', cpu: 22, memory: 312, age: '25d' },
    { id: 'dep-worker', name: 'background-worker', type: 'Deployment', image: 'Replicas: 0/1 (Degraded)', status: 'CrashLoopBackOff', cpu: 0, memory: 0, age: '12d' }
  ],
  statefulsets: [
    { id: 'sts-db', name: 'postgres-db-stateful', type: 'StatefulSet', image: 'Replicas: 1/1', status: 'active', cpu: 18, memory: 512, age: '15d' }
  ],
  services: [
    { id: 'svc-auth', name: 'auth-service-svc', type: 'Service', image: 'ClusterIP / Port 80', status: 'active', cpu: 0, memory: 0, ip: '10.96.42.11', age: '30d' },
    { id: 'svc-payment', name: 'payment-svc', type: 'Service', image: 'LoadBalancer / Port 443', status: 'active', cpu: 0, memory: 0, ip: '34.120.45.99', age: '25d' }
  ],
  ingress: [
    { id: 'ing-main', name: 'main-routing-ingress', type: 'Ingress', image: 'nginx-ingress', status: 'active', cpu: 0, memory: 0, ip: 'api.omniterminal.dev', age: '30d' }
  ],
  configmaps: [
    { id: 'cm-app', name: 'app-global-config', type: 'ConfigMap', image: 'Keys: 8', status: 'active', cpu: 0, memory: 0, age: '45d' },
    { id: 'sec-db', name: 'database-credentials-secret', type: 'Secret', image: 'Keys: 3 (Encrypted)', status: 'active', cpu: 0, memory: 0, age: '45d' }
  ],
  helmReleases: [
    { id: 'helm-nginx', name: 'ingress-nginx', type: 'HelmRelease', image: 'Chart: ingress-nginx-4.8.3 / Version: 1.9.4', status: 'deployed', cpu: 0, memory: 0, age: '12d', ip: 'Revision: 2' },
    { id: 'helm-prometheus', name: 'prometheus-stack', type: 'HelmRelease', image: 'Chart: kube-prometheus-stack-55.0.0 / Version: v0.70.0', status: 'deployed', cpu: 0, memory: 0, age: '4d', ip: 'Revision: 1' },
    { id: 'helm-redis', name: 'redis-cluster', type: 'HelmRelease', image: 'Chart: redis-18.6.1 / Version: 7.2.3', status: 'failed', cpu: 0, memory: 0, age: '2h', ip: 'Revision: 3' }
  ],
  crds: [
    { id: 'crd-cert', name: 'certificates.cert-manager.io', type: 'CRD', image: 'Group: cert-manager.io / Scope: Namespaced', status: 'active', cpu: 0, memory: 0, age: '30d' },
    { id: 'crd-issuer', name: 'clusterissuers.cert-manager.io', type: 'CRD', image: 'Group: cert-manager.io / Scope: Cluster', status: 'active', cpu: 0, memory: 0, age: '30d' },
    { id: 'crd-prom', name: 'prometheuses.monitoring.coreos.com', type: 'CRD', image: 'Group: monitoring.coreos.com / Scope: Cluster', status: 'active', cpu: 0, memory: 0, age: '15d' }
  ]
};
