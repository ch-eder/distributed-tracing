# Tracing an Application with Apache SkyWalking

To be able to trace an application with SkyWalking, several steps have to be performed. This file explains the steps necessary for starting a SkyWalking server and integrating SkyWalking into the AWS Lambda environment.

**Content:**
- [Start a SkyWalking Server](#anker-start_sigNoz_server)
- [Make SkyWalking available for usage in AWS Lambda](#anker-sigNoz_aws_lambda)
- [Tracing Interactions with SkyWalking](#anker-using_sigNoz)

<a name="anker-start_sigNoz_server"></a>
## Start a SkyWalking Server

In this documentation, SkyWalking is started by running a Docker container on an AWS EC2 Instance.
If Docker is not installed on your EC2 Instance yet, install docker following the instructions in [`installations.md`](../other/installations.md).

SkyWalking can then be started using different storage options. Two options are explained in the following.

In both cases, the containers are started in a user-defined network. Therefore, first create a new network:

```
docker network create elasticskywalking
```

<details><summary><b>H2 storage</b></summary>

For H2 storage, SkyWalking can be started with the following command:

```
docker run -d \
  --name oap \
  --network elasticskywalking \
  -p 12800:12800 \
  -p 11800:11800 \
  apache/skywalking-oap-server:9.0.0
```

> **Note:** If the heap size provided by the docker container is not enough to run the application, use `JAVA_OPTS` to adjust it as necessary. E.g., `-e JAVA_OPTS='-Xmx200m'`

</details>

<details><summary><b>ElasticSearch storage</b></summary>

When using ElasticSearch, several steps have to be performed:

First, start ElasticSearch inside the network:

```
docker run -d \
  --name elasticsearch \
  --network elasticskywalking \
  -p 9200:9200 \
  -p 9300:9300 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.0
```

> **Note:** To ensure that elasticsearch is up and running, curl can be used to send an example request. E.g., determine the IP of the container by running `docker network inspect elasticskywalking`. Then enter `curl <ip>:9200`.

Subsequently, start the SkyWalking while specifying `SW_STORAGE` and `SW_STORAGE_ES_CLUSTER_NODES`.

```
docker run -d \
  --name oap \
  --network elasticskywalking \
  -e SW_STORAGE=elasticsearch \
  -e SW_STORAGE_ES_CLUSTER_NODES=elasticsearch:9200 \
  -p 12800:12800 \
  -p 11800:11800 \
  apache/skywalking-oap-server:9.0.0
```

> **Note:** If the heap size provided by the docker container is not enough to run the application, use `JAVA_OPTS` to adjust it as necessary. E.g., `-e JAVA_OPTS='-Xmx200m'`

</details>

The UI has to be started separately using the following command:

```
docker run -d \
  --name oap-ui \
  --network elasticskywalking \
  -p 8080:8080 \
  -e SW_OAP_ADDRESS=http://oap:12800 \
  apache/skywalking-ui:9.0.0
```

After starting the server, SkyWalking can be accessed using the following address: http://\<host>:8080, where \<host> is the IP-Address of the EC2 Instance Docker is running on.

> **Note:** To be accessible, the port (8080) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `8080` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)

<a name="anker-sigNoz_aws_lambda"></a>
## Make SkyWalking available for usage in AWS Lambda

In order to be able to use SkyWalking in Lambda, its dependencies have to be added to the respective functions. This can be done by using a layer. Therefore, follow the instructions for creating a Lambda Layer explained in [lambda_instructions.md](../other/lambda_instructions.md), and install the following module:

```
npm install --save skywalking-backend-js
```

> **Note:** The layer used in the master thesis (`sw_layer`) can be found [here](../lambda_resources). Note that all following examples will refer to the usage of this very layer.

<a name="anker-using_sigNoz"></a>
## Tracing Interactions with SkyWalking

SkyWalking provides auto-tracing capabilities. However, it is still necessary to include tracing code in the respective functions. The tracing is enabled by including the following code:

```javascript
const { default: agent, AWSLambdaTriggerPlugin } = require('skywalking-backend-js');

agent.start({
  serviceName: 'service-name',
  collectorAddress: 'address:11800',
});

exports.handler = AWSLambdaTriggerPlugin.wrap(async function (event) {
  // ...
});
```

However, the configuration can also be done by using environment variables. A selection of essential variables is given in the following. A complete overview can be found on the [github repository](https://github.com/apache/skywalking-nodejs).

| Variable | Value | Description |
| -----| -----| ---- |
| `SW_AGENT_COLLECTOR_BACKEND_SERVICES` | \<host>:11800 | Endpoint of the Skywalking Backend where Telemetry Data is sent to. |
| `SW_AGENT_NAME` | e.g., order_service | Name of the current service. |

When specifying environment variables, SkyWalking can simply be integrated using the following code:

```javascript
const { default: agent, AWSLambdaTriggerPlugin } = require('skywalking-backend-js');

agent.start();

exports.handler = AWSLambdaTriggerPlugin.wrap(async function (event) {
  // ...
});
```

The telemetry data is sent to the specified endpoint running on port 11800.

> **Note:** To be accessible, the port (11800) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `11800` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)
