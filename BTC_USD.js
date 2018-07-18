let ws;
function WebSocketConnector() {

    if ("WebSocket" in window) {
        let url = "wss://api.bitfinex.com/ws/2";
        ws = new WebSocket(url);

        ws.onopen = function (event) {
            // subscribe to data
            console.log(event);
            let action = {
                "event": 'subscribe',
                "channel": 'ticker',
                "symbol": 'tBTCUSD'
            };
            ws.send(JSON.stringify(action));
        };

        ws.onmessage = function (event) {
            let received_data = JSON.parse(event.data);

            if (!Array.isArray(received_data)) {
                console.log("SPECIAL EVENT");
                console.log(received_data);

                if (received_data.hasOwnProperty("event")) {
                    // handle info events
                    if (received_data["event"] === "info") {
                        switch (received_data["code"]) {
                            case 20051:
                                console.log("STOP/RESTART SERVER - RECONNECT");
                                break;
                            case 20060:
                                console.log("SERVER ENTERED MAINTAINCE MODE");
                                break;
                            case 20061:
                                console.log("ALL SERVICES AVAILABLE AGAIN");
                                break;
                        }
                    }

                    // handle error events
                    if (received_data["event"] === "error") {
                        switch (received_data["code"]) {
                            case 10000:
                                console.log("UNKNOWN EVENT");
                                break;
                            case 10001:
                                console.log("UNKNOWN PAIR");
                                break;
                            case 10300:
                                console.log("SUBSCRIPTION FAILED");
                                break;
                            case 10301:
                                console.log("ALREADY SUBSCRIBED");
                                break;
                            case 10302:
                                console.log("UNKNOWN CHANNEL");
                                break;
                            case 10400:
                                console.log("UNSUBSCRIBE FAILED");
                                break;
                            case 10401:
                                console.log("NOT SUBSCRIBED");
                        }
                    }

                    if (received_data["event"] === "subscribed") {
                        console.log("SUBSCRIBED");

                    }

                    if (received_data["event"] === "unsubscribed") {
                        console.log("UNSUBSCRIBED");

                    }
                }
            }
            //received actual data
            if (Array.isArray(received_data)) {
                if ("hb" !== received_data[1]) {
                    console.log(received_data);
                    update_table(received_data);
                }

            }

        };

        ws.onclose = function () {
            console.log("CLOSED");
        };
    }

    else
        {
            console.log("NO WEBSOCKET SUPPORT");
        }
    }

    WebSocketConnector();


function update_table(data) {
    let rows = document.getElementsByTagName("table")[0].rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].cells[1].innerHTML = data[1][i];
    }
}
