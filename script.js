$(document).ready(function() {
    $("#start-date").datepicker({
        dateFormat: "yy-mm-dd",
        onSelect: function(selectedDate) {
            $("#end-date").datepicker("option", "minDate", selectedDate);
            $("#end-date").prop("disabled", false); // Habilita el campo de fecha final
        }
    });

    $("#end-date").prop("disabled", true).datepicker({
        dateFormat: "yy-mm-dd",
        maxDate: 0,
        onSelect: function(selectedDate) {
            let startDate = $("#start-date").val();
            if (startDate) {
                if (selectedDate < startDate) {
                    $("#start-date").datepicker("setDate", selectedDate);
                }
            }
        }
    });

    $("#generate-report").click(function() {
        let startDate = $("#start-date").val();
        let endDate = $("#end-date").val();

        if (startDate && endDate) {
            $("#status-message").text("Se está generando su informe...");
            $("#download-report").hide(); // Oculta el enlace de descarga mientras se genera el informe

            // Función para convertir fechas a timestamps UNIX
            function convertToUnixTimestamp(dateString) {
                let date = new Date(dateString);
                return Math.floor(date.getTime() / 1000);
            }

            let startTimestamp = convertToUnixTimestamp(startDate);
            let endTimestamp = convertToUnixTimestamp(endDate);

            // Consultar eventos
            fetch('http://10.144.2.194/zabbix/api_jsonrpc.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "event.get",
                    params: {
                        output: ["name", "clock", "severity", "hosts"],
                        groupids: ["53", "50", "52"],
                        time_from: startTimestamp,
                        time_till: endTimestamp,
                        search: {
                            name: "Unavailable by ICMP ping"
                        },
                        severities: [4],
                        selectHosts: ["name"],
                        sortfield: "clock",
                        sortorder: "DESC"
                    },
                    auth: "68f08dd04965819aebf23bc2659a239f",
                    id: 2
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.result) {
                    throw new Error("No se encontraron eventos o error en la consulta.");
                }
                let events = data.result;

                // Consultar detalles de los hosts
                return fetch('http://10.144.2.194/zabbix/api_jsonrpc.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "host.get",
                        params: {
                            output: ["hostid", "name"],
                            groupids: ["53", "50", "52"],
                            selectInterfaces: ["ip"],
                            selectInventory: ["site_state", "site_city"]
                        },
                        auth: "68f08dd04965819aebf23bc2659a239f",
                        id: 2
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.result) {
                        throw new Error("No se encontraron hosts o error en la consulta.");
                    }
                    let hosts = data.result;

                    // Cruce de datos y generación del informe
                    let reportData = events.map(event => {
                        let host = hosts.find(h => h.hostid === event.hosts[0].hostid);
                        return {
                            "Hora Inicio": new Date(event.clock * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
                            "Estado": event.severity,
                            "Host": host ? host.name : "Desconocido",
                            "IP": host && host.interfaces.length > 0 ? host.interfaces[0].ip : "Desconocida",
                            "Departamento": host && host.inventory ? host.inventory.site_state : "Desconocido",
                            "Municipio": host && host.inventory ? host.inventory.site_city : "Desconocido"
                        };
                    });

                    // Verificar los datos antes de convertir a CSV
                    console.log("Datos del informe:", reportData);

                    // Convertir datos a CSV usando PapaParse
                    let csv = Papa.unparse(reportData);
                    console.log("CSV generado:", csv);

                    // Crear un archivo descargable
                    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    let url = URL.createObjectURL(blob);
                    console.log("URL del archivo CSV:", url);

                    // Asignar URL al enlace de descarga y mostrarlo
                    $("#download-report")
                        .attr("href", url)
                        .attr("download", "Informe_Equipos.csv")
                        .show(); // Muestra el enlace de descarga

                    $("#status-message").text("El informe está disponible para su descarga.");
                });
            })
            .catch(error => {
                console.error('Error al generar el informe:', error);
                $("#status-message").text("Error al generar el informe. Por favor, inténtelo de nuevo.");
            });
        } else {
            $("#status-message").text("Por favor, llene todos los campos antes de generar el informe.");
        }
    });
});
