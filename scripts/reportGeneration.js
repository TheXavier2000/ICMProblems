$(document).ready(function() {
    $("#generate-report").click(function() {
        let startDate = $("#start-date").val();
        let endDate = $("#end-date").val();
        let selectedGroupIds = $("#selected-groups .group").map(function() {
            return $(this).data("id");
        }).get();
        let selectedGroupNames = $("#selected-groups .group").map(function() {
            return $(this).text().trim().replace(' X', '');
        }).get();
        let selectedSeverityIds = $("#selected-severities").data("selectedSeverityIds") || [];

        if (startDate && endDate && selectedGroupIds.length) {
            $("#status-message").removeClass().addClass("status-message status-message_GENERATING").text("Se está generando su informe...");
            $("#download-report").hide(); // Oculta el botón de descarga mientras se genera el informe

            // Función para convertir fechas a timestamps UNIX
            function convertToUnixTimestamp(dateString) {
                let date = new Date(dateString);
                return Math.floor(date.getTime() / 1000);
            }

            let startTimestamp = convertToUnixTimestamp(startDate);
            let endTimestamp = convertToUnixTimestamp(endDate);

            // Cargar el JSON de severidades
            fetch('../json/severities.json')
                .then(response => response.json())
                .then(severities => {
                    // Crear un mapa de severidades
                    let severityMap = {};
                    severities.forEach(severity => {
                        severityMap[severity.id] = severity.name;
                    });

                    // Función para consultar eventos por grupo
                    function fetchEventsForGroup(groupId) {
                        return fetch('http://10.144.2.194/zabbix/api_jsonrpc.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                jsonrpc: "2.0",
                                method: "event.get",
                                params: {
                                    output: ["name", "clock", "severity", "hosts"],
                                    groupids: [groupId],
                                    time_from: startTimestamp,
                                    time_till: endTimestamp,
                                    search: {
                                        name: "Unavailable by ICMP ping"
                                    },
                                    selectHosts: ["name"],
                                    sortfield: "clock",
                                    sortorder: "DESC"
                                },
                                auth: "68f08dd04965819aebf23bc2659a239f",
                                id: 2
                            })
                        }).then(response => response.json());
                    }

                    // Función para consultar detalles de los hosts por grupo
                    function fetchHostsForGroup(groupId) {
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
                                    groupids: [groupId],
                                    selectInterfaces: ["ip"],
                                    selectInventory: ["site_state", "site_city"]
                                },
                                auth: "68f08dd04965819aebf23bc2659a239f",
                                id: 2
                            })
                        }).then(response => response.json());
                    }

                    // Crear un array de promesas para cada grupo
                    let promises = selectedGroupIds.map((groupId, index) => {
                        return fetchEventsForGroup(groupId).then(eventData => {
                            return fetchHostsForGroup(groupId).then(hostData => {
                                let events = eventData.result;
                                let hosts = hostData.result;

                                // Procesar eventos y hosts
                                let reportData = events.map(event => {
                                    let host = hosts.find(h => h.hostid === event.hosts[0].hostid);
                                    return {
                                        "Hora Inicio": new Date(event.clock * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
                                        "Estado": severityMap[event.severity], // Usar el nombre de la severidad en lugar del ID
                                        "Host": host ? host.name : "Desconocido",
                                        "IP": host && host.interfaces.length > 0 ? host.interfaces[0].ip : "Desconocida",
                                        "Departamento": host && host.inventory ? host.inventory.site_state : "Desconocido",
                                        "Municipio": host && host.inventory ? host.inventory.site_city : "Desconocido",
                                        "Problema": "Unavailable by ICMP ping" // Agregar el nombre del problema
                                    };
                                });

                                return {
                                    groupName: selectedGroupNames[index],
                                    data: reportData
                                };
                            });
                        });
                    });

                    // Ejecutar todas las promesas
                    Promise.all(promises).then(results => {
                        // Crear el archivo Excel con todas las hojas
                        let wb = XLSX.utils.book_new();

                        results.forEach(result => {
                            let sheetName = result.groupName;

                            // Reemplazar caracteres no permitidos con "|"
                            sheetName = sheetName.replace(/[:\/\\?\*\[\]]/g, '|');

                            // Truncar nombre y añadir "..." si es necesario
                            let truncatedName = sheetName.length > 25 ? sheetName.substring(0, 25) + "..." : sheetName;

                            let ws = XLSX.utils.json_to_sheet(result.data);
                            XLSX.utils.book_append_sheet(wb, ws, truncatedName);
                        });

                        // Convertir el libro a un archivo descargable
                        let wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });

                        function s2ab(s) {
                            let buf = new ArrayBuffer(s.length);
                            let view = new Uint8Array(buf);
                            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                            return buf;
                        }

                        let blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
                        let formattedStartDate = startDate.replace(/-/g, "/");
                        let formattedEndDate = endDate.replace(/-/g, "/");
                        let fileName = `informe_${formattedStartDate}_${formattedEndDate}_${selectedGroupNames.join("_")}.xlsx`;
                        let link = document.createElement("a");
                        if (link.download !== undefined) {
                            let url = URL.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", fileName);
                            link.style.visibility = "hidden";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }

                        $("#status-message").removeClass().addClass("status-message status-message_OK").text("Informe generado exitosamente.");
                        $("#download-report").show();

                        // Limpiar los campos después de generar el informe
                        $("#start-date").val(""); // Limpiar fecha de inicio
                        $("#end-date").val(""); // Limpiar fecha final
                        $("#end-date").prop("disabled", true); // Deshabilitar campo de fecha final
                        $("#selected-groups").empty(); // Limpiar grupos seleccionados
                        $("#selected-group-message").text(""); // Limpiar mensaje de grupos seleccionados
                    }).catch(error => {
                        console.error('Error al generar el informe:', error);
                        $("#status-message").removeClass().addClass("status-message status-message_ERROR").text("Error al generar el informe.");
                    });
                }).catch(error => {
                    console.error('Error al cargar las severidades:', error);
                    $("#status-message").removeClass().addClass("status-message status-message_ERROR").text("Error al cargar las severidades.");
                });
        } else {
            $("#status-message").removeClass().addClass("status-message status-message_INCOMPLETE").text("Por favor, seleccione las fechas y grupos requeridos.");
        }
    });
});
