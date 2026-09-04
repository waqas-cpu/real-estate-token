# Kubernetes Migration Architecture Guide

This document defines how the RWA Real Estate Tokenization platform migrates from Docker Compose to a production-grade Kubernetes (k8s) cluster (such as AWS EKS, Google GKE, or Azure AKS).

---

## 1. Mapping Matrix: Docker Compose → Kubernetes Objects

| Docker Compose Component | Kubernetes Object | Production Specification |
| :--- | :--- | :--- |
| **`reverse-proxy`** | `Ingress` + Ingress-Nginx Controller | TLS termination via cert-manager, automated Let's Encrypt certificates |
| **`frontend`** | `Deployment` + `Service` (ClusterIP) | 2–5 replicas, HPA on CPU > 70%, unprivileged Nginx image |
| **`backend`** | `Deployment` + `Service` (ClusterIP) | 3–10 replicas, HPA on CPU > 60% and memory > 75%, non-root user `rwa` |
| **`worker`** | `Deployment` (Worker) | 1–3 replicas (or `Keda` scaled queue consumer) |
| **`indexer`** | `StatefulSet` or `Deployment` | 1 active replica with persistent checkpoint volume |
| **`oracle`** | `Deployment` | 2 replicas with leader election to avoid duplicate submissions |
| **`postgres`** | Managed Service (AWS RDS / Cloud SQL) | Replaced by managed PostgreSQL 16 with Multi-AZ failover and automated backups |
| **`redis`** | Managed Service (AWS ElastiCache / MemoryStore) | Replaced by managed Redis cluster with in-transit and at-rest encryption |
| **`rwa-data` network** | `NetworkPolicy` | Denies all ingress from external pods except authorized backend pods |

---

## 2. Kubernetes Network Policies (Zero Trust Segmentation)

In Kubernetes, pod-to-pod isolation is achieved via `NetworkPolicy` objects rather than bridge networks:

### Data Tier Network Policy (`network-policy-data.yaml`)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-data-tier
  namespace: rwa-platform
spec:
  podSelector:
    matchLabels:
      tier: data # Applied to internal PostgreSQL / Redis pods
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: rwa-backend
        - podSelector:
            matchLabels:
              app: rwa-worker
        - podSelector:
            matchLabels:
              app: rwa-indexer
      ports:
        - protocol: TCP
          port: 5432
        - protocol: TCP
          port: 6379
```

---

## 3. Production Ingress & TLS Configuration (`ingress.yaml`)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rwa-ingress
  namespace: rwa-platform
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "20m"
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - app.yourrwa.com
      secretName: rwa-tls-cert
  rules:
    - host: app.yourrwa.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: rwa-backend-svc
                port:
                  number: 3001
          - path: /health/
            pathType: Prefix
            backend:
              service:
                name: rwa-backend-svc
                port:
                  number: 3001
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rwa-frontend-svc
                port:
                  number: 80
```

---

## 4. Horizontal Pod Autoscaling (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rwa-backend-hpa
  namespace: rwa-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rwa-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 5. Migration Checklist

- [ ] Provision managed PostgreSQL (e.g. AWS Aurora PostgreSQL or Google Cloud SQL) with private VPC peering.
- [ ] Provision managed Redis (AWS ElastiCache or Redis Enterprise Cloud) with encryption in-transit and auth token.
- [ ] Install `External Secrets Operator` to pull secrets from AWS Secrets Manager or HashiCorp Vault.
- [ ] Configure `cert-manager` for automated SSL/TLS certificates on Ingress.
- [ ] Configure Prometheus / Grafana / OpenTelemetry collector to scrape `/health` and metrics endpoints.
- [ ] Execute smoke test across Ingress routing, compliance verification, and blockchain RPC calls.
