# Tracing an Application with Zipkin

To be able to trace an application with Zipkin, several steps have to be performed. This file explains the steps necessary for starting a Zipkin server and integrating Zipkin into the AWS Lambda environment.

**Content:**
- [Start a Zipkin Server](#anker-start_zipkin_server)
- [Make Zipkin available for usage in AWS Lambda](#anker-zipkin_aws_lambda)
- [Tracing Interactions with Zipkin](#anker-using_zipkin)

<a name="anker-start_zipkin_server"></a>
## Start a Zipkin Server

In this documentation, Zipkin is started by running a Docker container on an AWS EC2 Instance.
If Docker is not installed on your EC2 Instance yet, install docker following the instructions in [`installations.md`](../other/installations.md).

Zipkin can then be started using different storage options. In the following, two available options are explained:

<details><summary><b>In-memory storage</b></summary>

For in-memory storage, Zipkin can be started with the following command:

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

</details>

<details><summary><b>ElasticSearch storage</b></summary>

When using ElasticSearch, several steps have to be performed:

Create a new network:

```
docker network create elasticzipkin
```

Start ElasticSearch inside the network:

```
docker run -d \
  --name db \
  --network elasticzipkin \
  -p 9200:9200 \
  -p 9300:9300 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.0
```

> **Note:** To ensure that elasticsearch is up and running, curl can be used to send an example request. E.g., determine the IP of the container by running `docker network inspect elasticzipkin`. Then enter `curl <ip>:9200`.

Start the Zipkin-Backend while specifying the `STORAGE_TYPE` and `ES_HOSTS`:

```
docker run -d \
  --name zipkin \
  --network elasticzipkin \
  -e STORAGE_TYPE=elasticsearch \
  -e ES_HOSTS=http://db:9200 \
  -p 9411:9411 \
  openzipkin/zipkin
```

</details>

After starting the server, Zipkin can be accessed using the following address: http://\<host>:9411, where \<host> is the IP-Address of the EC2 Instance Docker is running on.

> **Note:** To be accessible, the port (9411) has to be added to the security role. This can be done using the following steps:
> - Go to the EC2 dashboard
> - scroll down to `Netzwerk & Sicherheit` and select `Sicherheitsgruppen`
> - select the `Sicherheitsgruppe`, which is used for the AMI
> - click on `Regeln für eingehenden Datenverkehr bearbeiten`
> - Add an entry with: `Benutzerdefiniertes TCP` (Typ), `TCP` (Protokoll), `9411` (Portbereich), `Anywhere-IPv4` or `Benutzerdefiniert, 0.0.0.0/0` (Quelle)

<a name="anker-zipkin_aws_lambda"></a>
## Make Zipkin available for usage in AWS Lambda

In order to be able to use Zipkin in Lambda, its dependencies have to be added to the respective functions. This can be done by using a layer.
Therefore, follow the instructions for creating a Lambda Layer explained in [`creating_lambda_layer.md`](../other/lambda_instructions.md), and add the following dependencies:

```
"node-fetch": "^2.6.6",
"zipkin": "^0.22.0",
"zipkin-context-cls": "^0.22.0",
"zipkin-transport-http": "^0.22.0"
```

Additionally, add the following script for simplifying the creation of a tracer:

```javascript
const {
  Tracer,
  BatchRecorder,
  jsonEncoder: { JSON_V2 }
} = require('zipkin');
const CLSContext = require('zipkin-context-cls');
const { HttpLogger } = require('zipkin-transport-http');

function tracerFactory (zipkinEndpoint = 'localhost:9411', serviceName = 'service_a') {
  return new Tracer({
    ctxImpl: new CLSContext('zipkin'),
    recorder: new BatchRecorder({
      logger: new HttpLogger({
        endpoint: 'http://' + zipkinEndpoint + '/api/v2/spans',
        jsonEncoder: JSON_V2
      })
    }),
    localServiceName: serviceName
  });
}

module.exports = tracerFactory;
```

Upload the layer and link it to the respective functions.

> **Note:** In the master thesis, the script was encapsulated in a `zipkin-tracing-factory` module and made available using an `index.js` file. The used layer (`zipin_layer_core`) can be found [here](../../lambda_resources). Note that all following examples will refer to the usage of this very layer.

<a name="anker-using_zipkin"></a>
## Tracing Interactions with Zipkin

After performing these steps, Zipkin can be used to trace interactions in Lambda functions. Note, however, that it is necessary to add the instrumentation to the code explicitly. This repository includes the documentation for instrumenting the following use cases:

- [Instrumenting a Lambda function invocation](lambda_function/README.md)
- [Instrumenting an `axios` request](http_request/README.md)
- [Instrumenting DynamoDB read / write operation](dynamodb_operation/README.md)
