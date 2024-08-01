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

        // Verificar si todos los campos están completos
        if (startDate && endDate && selectedGroupIds.length) {
            // Bloquear la interfaz de usuario mientras se genera el informe
            $("#generate-report").prop("disabled", false); // Desactivar el botón de generar informe
            $("#status-message").removeClass().addClass("status-message status-message_GENERATING").text("Se está generando su informe");
            $("#loading-icon").show(); // Mostrar el icono de carga
            $("#download-report").hide(); // Ocultar el botón de descarga mientras se genera el informe

            // Función para convertir fechas a timestamps UNIX
            function convertToUnixTimestamp(dateString) {
                let date = new Date(dateString);
                return Math.floor(date.getTime() / 1000);
            }

            let startTimestamp = convertToUnixTimestamp(startDate);
            let endTimestamp = convertToUnixTimestamp(endDate);

            // Función para consultar eventos por grupo
            function fetchEventsForGroup(groupId) {
                console.log(`Consultando eventos para el grupo ${groupId}...`);
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
                            severities: [4], // Usar el número 4
                            selectHosts: ["name"],
                            sortfield: "clock",
                            sortorder: "DESC"
                        },
                        auth: "68f08dd04965819aebf23bc2659a239f",
                        id: 2
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error en la respuesta de la API: ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`Eventos obtenidos para el grupo ${groupId}:`, data);
                    return data;
                })
                .catch(error => {
                    console.error(`Error al consultar eventos para el grupo ${groupId}:`, error);
                    return { error: true, groupId: groupId }; // Retornar objeto de error
                });
            }

            // Función para consultar detalles de los hosts por grupo
            function fetchHostsForGroup(groupId) {
                console.log(`Consultando hosts para el grupo ${groupId}...`);
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
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error en la respuesta de la API: ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`Hosts obtenidos para el grupo ${groupId}:`, data);
                    return data;
                })
                .catch(error => {
                    console.error(`Error al consultar hosts para el grupo ${groupId}:`, error);
                    return { error: true, groupId: groupId }; // Retornar objeto de error
                });
            }

            // Función para mapear severidades a descripciones
            function mapSeverityToDescription(severityId) {
                const severityMap = {
                    4: "High"
                    // Puedes agregar más severidades aquí si es necesario
                };
                return severityMap[severityId] || "Unknown";
            }

            // Crear un array de promesas para cada grupo
            let promises = selectedGroupIds.map((groupId, index) => {
                return fetchEventsForGroup(groupId).then(eventData => {
                    if (eventData.error) {
                        return { error: true, groupId: groupId }; // Manejar error en la consulta de eventos
                    }
                    return fetchHostsForGroup(groupId).then(hostData => {
                        if (hostData.error) {
                            return { error: true, groupId: groupId }; // Manejar error en la consulta de hosts
                        }
                        let events = eventData.result;
                        let hosts = hostData.result;

                        // Procesar eventos y hosts
                        let reportData = events.map(event => {
                            let host = hosts.find(h => h.hostid === event.hosts[0].hostid);
                            return {
                                "Hora Inicio": new Date(event.clock * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
                                "Estado": mapSeverityToDescription(event.severity), // Mapear el ID de la severidad a su descripción
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
                let wb = XLSX.utils.book_new();

                results.forEach(result => {
                    if (result.error) {
                        console.warn(`No se pudo obtener datos para el grupo ${result.groupId}`);
                        return;
                    }

                    let sheetName = result.groupName.replace(/[:\/\\?\*\[\]]/g, '|');
                    let truncatedName = sheetName.length > 25 ? sheetName.substring(0, 25) + "..." : sheetName;
                    let ws = XLSX.utils.json_to_sheet(result.data);
                    XLSX.utils.book_append_sheet(wb, ws, truncatedName);
                });

                if (wb.SheetNames.length > 0) {
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

                    console.log("Informe generado correctamente.");
                    $("#status-message").removeClass().addClass("status-message status-message_OK").text("Informe generado correctamente.");
                    $("#download-report").show(); // Mostrar el botón de descarga
                } else {
                    console.error("No se pudo generar el informe. No se obtuvieron datos válidos.");
                    $("#status-message").removeClass().addClass("status-message status-message_ERROR").text("No se pudo generar el informe. No se obtuvieron datos válidos.");
                }

                $("#loading-icon").hide(); // Ocultar el icono de carga
                //$("#generate-report").prop("disabled", false); // Reactivar el botón de generar informe
            }).catch(error => {
                console.error("Error al generar el informe:", error);
                $("#status-message").removeClass().addClass("status-message status-message_ERROR").text("Error al generar el informe.");
                $("#loading-icon").hide(); // Ocultar el icono de carga en caso de error
                //$("#generate-report").prop("disabled", false); // Reactivar el botón de generar informe
            });
        } else {
            $("#status-message").removeClass().addClass("status-message status-message_ERROR").text("Por favor, complete todos los campos.");
            $("#loading-icon").hide(); // Ocultar el icono de carga si los campos están incompletos
        }
    });
});
