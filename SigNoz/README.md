# Tracing an Application with SigNoz

To trace an application with SigNoz, several steps have to be performed. This file explains the steps necessary for starting a SigNoz server and integrating SigNoz into the AWS Lambda environment.

**Content:**
- [Start a SigNoz Server](#anker-start_sigNoz_server)
- [Make SigNoz available for usage in AWS Lambda](#anker-sigNoz_aws_lambda)
- [Tracing Interactions with SigNoz](#anker-using_sigNoz)

<a name="anker-start_sigNoz_server"></a>
## Start a SigNoz Server

In this documentation, SigNoz is started by using git and docker-compose on an AWS EC2 Instance.
If git and / or docker-compose is not installed on your EC2 Instance yet, install them following the instructions in [`installations.md`](../other/installations.md).

SigNoz can then be started using  the following command:

```
git clone -b main https://github.com/SigNoz/signoz.git && cd signoz/deploy/

docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d
```

After starting the server, SigNoz can be accessed using the following address: http://\<host>:3301, where \<host> is the IP-Address of the EC2 Instance Docker is running on.

> **Note:** To be accessible, the port (3301) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `3301` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)

<a name="anker-sigNoz_aws_lambda"></a>
## Make SigNoz available for usage in AWS Lambda

SigNoz uses OpenTelemetry for instrumentation purposes. In order to be able to use OpenTelemetry in Lambda, the AWS Distro for OpenTelemetry (ADOT) can be used. To add ADOT to a function, link the following layer:

```
arn:aws:lambda:<region>:901920570463:layer:aws-otel-nodejs-amd64-ver-1-2-0:1
```

In addition, for the tracing to work, the X-Ray Active Tracing setting for the function has to be enabled.

<a name="anker-using_sigNoz"></a>
## Tracing Interactions with SigNoz

OpenTelemetry provides auto-tracing capabilities. Therefore, it is not necessary to explicitly add the instrumentation to the code.

However, different configurations have to be set. This is done via environment variables and includes the `AWS_LAMBDA_EXEC_WRAPPER`, the `OTEL_EXPORTER_OTLP_ENDPOINT`, and the `OTEL_SERVICE_NAME`:

| Variable | Value | Description |
| -----| -----| ---- |
| `AWS_LAMBDA_EXEC_WRAPPER` | /opt/otel-handler | Path to OpenTelemetry Agent which automatically instruments application. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | http://\<host>:4318 | Endpoint of the SigNoz Collector where Telemetry Data is sent to. |
| `OTEL_SERVICE_NAME` | e.g., orderService | Name of the current service. |

The telemetry data is then sent to the specified OTLP collector endpoint running on port 4318.

> **Note:** To be accessible, the port (4318) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `4318` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)
