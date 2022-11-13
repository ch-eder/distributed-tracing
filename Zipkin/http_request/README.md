# Instrument `axios` http request

The following describes how a lambda function can be instrumented to record an `axios` http request.

**Content:**
- [Prerequisites](#anker-prerequisites)
- [Necessary Steps](#anker-necessary_steps)
- [Usage](#anker-usage)

<a name="anker-prerequisites"></a>
## Prerequisites

As with no tracing, the `axios` module has to be installed in a [lambda layer](../../other/lambda_instructions.md) and linked to the function. The installatin can be performed by using the following command:

```
npm install --save axios
```

> **Note:** The layer used in the master thesis (`layer_axios`) can be found [here](../../../lambda_resources). Note that all following examples will refer to the usage of this very layer.

<a name="anker-necessary_steps"></a>
## Necessary Steps

Since there is a pre-existing instrumented library for capturing `axios` http requests, no new instrumentation has to be implemented from scratch. Instead, the [`zipkin-instrumentation-axiosjs`](https://github.com/openzipkin/zipkin-js/tree/master/packages/zipkin-instrumentation-axiosjs) library can be used. To use the library, install it in a new [`lambda_layer`](../../other/lambda_instructions.md) using the following command.

```
npm install zipkin-instrumentation-axiosjs --save
```

> **Note:** The layer used in the master thesis (`zipkin_layer_axios`) can be found [here](../../../lambda_resources). Note that all following examples will refer to the usage of this very layer.

<a name="anker-usage"></a>
## Usage

After linking the necessary layers ([`zipkin_layer_core`](../../../lambda_resources) and [`zipkin_layer_axios`](../../../lambda_resources)), the instrumentation can be performed as listed in the following details sections:

<details><summary><b>GET Request</b></summary>

```javascript
const axios = require('axios');
const tracerFactory = require('zipkin-tracing-factory');
const wrapAxios = require('zipkin-instrumentation-axiosjs');

const tracer = tracerFactory(process.env.ZIPKIN_ENDPOINT, process.env.SERVICE_NAME);

// wrap axios
const serviceName = process.env.SERVICE_NAME;
const remoteServiceName = 'user_service';
const zipkinAxios = wrapAxios(axios, { tracer, serviceName, remoteServiceName });

exports.handler = async function (event) {
  try {
    // use wrapped version of axios
    const response = await zipkinAxios.get('https://example.com/users/2');
    return response.data;
  } catch (error) {
    console.error(error.message);
  }
};
```

</details>

<details><summary><b>POST Request</b></summary>

```javascript
const axios = require('axios');
const tracerFactory = require('zipkin-tracing-factory');
const wrapAxios = require('zipkin-instrumentation-axiosjs');

const tracer = tracerFactory(process.env.ZIPKIN_ENDPOINT, process.env.SERVICE_NAME);

// wrap axios
const serviceName = process.env.SERVICE_NAME;
const remoteServiceName = 'user_service';
const zipkinAxios = wrapAxios(axios, { tracer, serviceName, remoteServiceName });

exports.handler = async function (event) {
  try {
    const data = {
      first_name: 'Mats',
      last_name: 'Winter',
      email: 'mats.winter@example.com',
      job: 'Backend Developer'
    };

    // use wrapped version of axios
    const response = await zipkinAxios.post('https://example.com/users', data);
    return response.data;
  } catch (error) {
    console.error(error.message);
  }
};
```

</details>

Additionally, set the following environment variables:

| Variable | Value | Description |
| -----| -----| ---- |
| `ZIPKIN_ENDPOINT` | <your_host>:9411| Host on which Zipkin Backend is running. |
| `SERVICE_NAME` | e.g., orderService | Name of the current service. |
