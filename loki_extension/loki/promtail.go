package loki

import (
	"log"
	"os"
	"time"

	"github.com/afiskon/promtail-client/promtail"
)

type LogEntry struct {
	Record string    `json:"record"`
	Time   string `json:"time"`
	Type   string    `json:"type"`
}

var (
	loki promtail.Client
	conf promtail.ClientConfig
	function_name string
	err error
)
// Init Promtail Client
func init(){
	source_name := "Lambda"
	function_name = os.Getenv("AWS_LAMBDA_FUNCTION_NAME")
	labels := "{source=\""+source_name+"\",function=\""+function_name+"\"}"
	lokiIp := os.Getenv("LOKI_IP")
	if len(lokiIp) == 0 {
		panic("LOKI Ip undefined")
	}
	conf = promtail.ClientConfig{
		PushURL:            "http://"+lokiIp+":3100/api/prom/push",
		Labels:             labels,
		BatchWait:          5 * time.Second,
		BatchEntriesNumber: 10000,
		SendLevel: 			promtail.INFO,
		PrintLevel: 		promtail.ERROR,
	}
	loki, err = promtail.NewClientProto(conf)
	if err != nil {
		log.Println("Promtail init error")
		log.Println(err)
	}
	


}

func LokiSend(record *string){
	tstamp := time.Now().String()
	source_name := "lambda"
	loki.Infof("source = %s, function= %s,  time = %s, record = %v\n", source_name, function_name, tstamp, *record)
}

func LokiShutdown(){
	loki.Shutdown()
}