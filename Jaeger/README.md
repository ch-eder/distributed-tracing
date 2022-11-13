# Tracing an Application with Jaeger

To be able to trace an application with Jaeger, several steps have to be performed. This file explains the steps necessary for starting a Jaeger server and integrating Jaeger into the AWS Lambda environment.

**Content:**
- [Start a Jaeger Server](#anker-start_jaeger_server)
- [Make Jaeger available for usage in AWS Lambda](#anker-jaeger_aws_lambda)
- [Tracing Interactions with Jaeger](#anker-using_jaeger)

<a name="anker-start_jaeger_server"></a>
## Start a Jaeger Server

In this documentation, Jaeger is started by running a Docker container on an AWS EC2 Instance.
If Docker is not installed on your EC2 Instance yet, install docker following the instructions in [`installations.md`](../other/installations.md).

Jaeger can then be started using different storage options. In the following, two available options are explained:

<details><summary><b>In-memory storage</b></summary>

For in-memory storage, Jaeger can be started with the following command:

```
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -e JAEGER_DISABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.37
```

`JAEGER_DISABLED=true` can be set to disable self-tracing in the Jaeger backend.

</details>

<details><summary><b>ElasticSearch storage</b></summary>

When using ElasticSearch, several steps have to be performed:

Create a new network:

```
docker network create elasticjaeger
```

Start ElasticSearch inside the network:

```
docker run -d \
  --name elasticsearch \
  --network elasticjaeger \
  -p 9200:9200 \
  -p 9300:9300 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.0
```

> **Note:** To ensure that elasticsearch is up and running, curl can be used to send an example request. E.g., determine the IP of the container by running `docker network inspect elasticjaeger`. Then enter `curl <ip>:9200`.

Start the Jaeger while specifying the `SPAN_STORAGE_TYPE` and `ES_SERVER_URLS`. Additionally, `JAEGER_DISABLED=true` can be set to disable self-tracing in the Jaeger backend.

```

docker run -d \
  --name jaeger \
  --network elasticjaeger \
  -e SPAN_STORAGE_TYPE=elasticsearch \
  -e ES_SERVER_URLS=http://elasticsearch:9200 \
  -e COLLECTOR_OTLP_ENABLED=true \
  -e JAEGER_DISABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:1.37
```

</details>

After starting the server, Jaeger can be accessed using the following address: http://\<host>:16686, where \<host> is the IP-Address of the EC2 Instance Docker is running on.

> **Note:** In order to be accessible, the port (16686) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `16686` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)

<a name="anker-jaeger_aws_lambda"></a>
## Make Jaeger available for usage in AWS Lambda

As of 2022, Jaeger uses OpenTelemetry for instrumentation purposes. In order to be able to use OpenTelemetry in Lambda, the AWS Distro for OpenTelemetry (ADOT) can be used. To add ADOT to a function, link the following layer:

```
arn:aws:lambda:<region>:901920570463:layer:aws-otel-nodejs-amd64-ver-1-2-0:1
```

In addition, for the tracing to work, the X-Ray Active Tracing setting for the function has to be enabled.

<a name="anker-using_jaeger"></a>
## Tracing Interactions with Jaeger

OpenTelemetry provides auto-tracing capabilities. Therefore, it is not necessary to explicitly add the instrumentation to the code.

However, different configurations have to be set. This is done via environment variables and includes the `AWS_LAMBDA_EXEC_WRAPPER`, the `OTEL_EXPORTER_OTLP_ENDPOINT`, and the `OTEL_SERVICE_NAME`:

| Variable | Value | Description |
| -----| -----| ---- |
| `AWS_LAMBDA_EXEC_WRAPPER` | /opt/otel-handler | Path to OpenTelemetry Agent which automatically instruments application. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | http://\<host>:4318 | Endpoint of the Jaeger Collector where Telemetry Data is sent to. |
| `OTEL_SERVICE_NAME` | e.g., orderService | Name of the current service. |

The telemetry data is then sent to the specified OTLP collector endpoint running on port 4318.

> **Note:** In order to be accessible, the port (4318) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `4318` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)
