apiVersion: v1
kind: ConfigMap
metadata:
  name: flask-config
data:
  MYSQL_HOST: "mysql"
  MYSQL_PORT: "3306"
  MYSQL_DATABASE: "interview_db"

---

apiVersion: v1
kind: Secret
metadata:
  name: flask-secret
type: Opaque
stringData:
  MYSQL_USER: "<YOUR_MYSQL_USER>"
  MYSQL_PASSWORD: "<YOUR_MYSQL_PASSWORD>"
  GEMINI_API_KEY: "<YOUR_GEMINI_API_KEY>"
