# Loki Telemetry API Extension in Go

Based on the example in https://github.com/aws-samples/aws-lambda-extensions/tree/main/go-example-telemetry-api-extension.

This proof-of-concept code is not production ready. Use it with your own discretion after testing thoroughly.


This sample extension: 
1. Registers the extension with Lambda Extensions API (see `extensionApi/client.go`)
2. Starts a local HTTP server to receive incoming telemetry events from the Telemetry API (see `telemetryApi/listener.go`)
3. Subscribes to the Telemetry API to start receiving incoming telemetry events (see `telemetryApi/client.go`)
4. Receives telemetry events, batches them, and dispatches **only** the log events to a grafana loki(see `telemetryApi/dispatcher.go`)

![](sample-extension-seq-diagram.png)

Adapt `loki/promtail.go` for your need.

## Build package and dependencies

To build and deploy this layer, run:


```bash
task publish
```

Note the ARN and use it as the Lambda Layer.

## Function Invocation and Extension Execution

Configure the extension by setting below environment variables

* `LOKI_IP` - the IP of the loki server. This poc runs *without* authentocation.
* `DISPATCH_MIN_BATCH_SIZE` - optimize dispatching telemetry by telling the dispatcher how many log events you want it to batch. On function invoke the telemetry will be dispatched only if number of log events collected so far is greater than `DISPATCH_MIN_BATCH_SIZE`. On function shutdown the telemetry will be dispatched  regardless of how many log events were collected so far. 

