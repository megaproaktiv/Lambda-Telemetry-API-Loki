package loki

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/afiskon/promtail-client/promtail"
)

type LogEntry struct {
	Record string `json:"record"`
	Time   string `json:"time"`
	Type   string `json:"type"`
}

var (
	loki       promtail.Client
	conf       promtail.ClientConfig
	labels     []string
	sendLabels []string
	err        error
)

// Init Promtail Client
func init() {
	labels = []string{"source=\"lambda\""}
	sendLabels = []string{"source = lambda"}
	timeout := 5000
	printLevel := promtail.ERROR
	sendLevel := promtail.INFO

	for _, element := range os.Environ() {
		if strings.HasPrefix(element, "OTEL_EXPORTER_OTLP_TIMEOUT") || strings.HasPrefix(element, "OTEL_EXPORTER_OTLP_LOGS_TIMEOUT"){
			v := strings.Split(element, "=")
			if configuredTimeout, err := strconv.Atoi(v[1]); err != nil {
				timeout = configuredTimeout
			}
		} else if strings.HasPrefix(element, "LOKI_SEND_LEVEL") {
			v := strings.Split(element, "=")
			if configuredSendLevel, err := strconv.Atoi(v[1]); err != nil {
				timeout = configuredSendLevel
			}
		} else if strings.HasPrefix(element, "LOKI_PRINT_LEVEL") {
			v := strings.Split(element, "=")
			if configuredPrintLevel, err := strconv.Atoi(v[1]); err != nil {
				timeout = configuredPrintLevel
			}
		} else if strings.HasPrefix(element, "OTEL_LABEL_") {
			v := strings.Split(strings.TrimPrefix(element, "OTEL_LABEL_"), "=")
			key := strings.ToLower(v[0])
			val := v[1]
			labels = append(labels, fmt.Sprintf("%s=\"%s\"", key, val))
			sendLabels = append(labels, fmt.Sprintf("%s = %s", key, val))
		}
	}

	lokiIp := os.Getenv("LOKI_IP")
	if len(lokiIp) == 0 {
		panic("LOKI Ip undefined")
	}
	conf = promtail.ClientConfig{
		PushURL:            fmt.Sprintf("%s/api/v1/push", lokiIp),
		Labels:             fmt.Sprintf("{%s}", strings.Join(labels, ",")),
		BatchWait:          time.Duration(timeout * int(time.Millisecond)),
		BatchEntriesNumber: 10000,
		SendLevel:          sendLevel,
		PrintLevel:         printLevel,
	}
	loki, err = promtail.NewClientProto(conf)
	if err != nil {
		log.Println("Promtail init error")
		log.Println(err)
	}
}

func LokiSend(record *string) {
	tstamp := time.Now().String()
	loki.Infof("%s, time = %s, record = %v\n", strings.Join(sendLabels, ", "), tstamp, *record)
}

func LokiShutdown() {
	loki.Shutdown()
}
