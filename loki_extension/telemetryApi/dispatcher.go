// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package telemetryApi

import (
	"loki-extension/loki"

	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"

	"github.com/golang-collections/go-datastructures/queue"
)

type Dispatcher struct {
	httpClient   *http.Client
	lokiIp       string
	minBatchSize int64
}

func NewDispatcher() *Dispatcher {
	dispatchMinBatchSize, err := strconv.ParseInt(os.Getenv("DISPATCH_MIN_BATCH_SIZE"), 0, 16)
	if err != nil {
		dispatchMinBatchSize = 1
	}

	return &Dispatcher{
		httpClient:   &http.Client{},
		minBatchSize: dispatchMinBatchSize,
	}
}

func (d *Dispatcher) Dispatch(ctx context.Context, logEventsQueue *queue.Queue, force bool) {
	if !logEventsQueue.Empty() && (force || logEventsQueue.Len() >= d.minBatchSize) {
		l.Info("[dispatcher:Dispatch] Dispatching :", logEventsQueue.Len(), " log events")
		// Logging Event from Lambda function

		logEntries, _ := logEventsQueue.Get(logEventsQueue.Len())

		for _, log := range logEntries {
			logEntry := loki.LogEntry{}
			bodyBytes, _ := json.Marshal(log)
			err := json.Unmarshal(bodyBytes, &logEntry)
			if err != nil {
				l.Warn("Could not send to loki")
				l.Warn(err)
				// Return to queue
				logEventsQueue.Put(logEntry)
				continue
			}
			loki.LokiSend(&logEntry.Record)
		}
	}
}
