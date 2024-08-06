$(document).ready(function() {
    function updateStatusMessage(message, color = "black") {
        console.log(message); // Muestra el mensaje en la consola
        $("#status-message").text(message).css("color", color);
    }

    $("#generate-report").click(async function() {
        $("#status-message").text("").css("color", "black");
        updateStatusMessage("Generación del informe iniciada");

        let startDate = $("#start-date").val();
        let endDate = $("#end-date").val();
        let selectedGroupIds = $("#selected-groups .group").map(function() {
            return $(this).data("id");
        }).get();
        let selectedGroupNames = $("#selected-groups .group").map(function() {
            return $(this).text().trim().replace(' X', '');
        }).get();

        if (startDate && endDate && selectedGroupIds.length) {
            updateStatusMessage("Fechas y grupos seleccionados. Generando informe...", "black");
            $("#generate-report").prop("disabled", true);
            $("#status-message").removeClass().addClass("status-message status-message_GENERATING").text("Se está generando su informe").css("color", "black");
            $("#loading-icon").show();
            $("#progress-container").show();
            $("#progress-bar").attr("value", 0).attr("max", selectedGroupIds.length);
            $("#progress-percentage").text("0%");

            function convertToUnixTimestamp(dateString) {
                return Math.floor(new Date(dateString).getTime() / 1000);
            }

            let startTimestamp = convertToUnixTimestamp(startDate);
            let endTimestamp = convertToUnixTimestamp(endDate);
            let maxIntervalHours = 1;

            async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
                try {
                    let response = await fetch(url, options);
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return await response.json();
                } catch (error) {
                    if (retries > 0) {
                        updateStatusMessage(`Retrying due to error: ${error.message}`, "black");
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return fetchWithRetry(url, options, retries - 1, delay * 2);
                    } else {
                        updateStatusMessage(`Failed after retries: ${error.message}`, "black");
                        throw error;
                    }
                }
            }

            async function fetchEventsForGroup(groupId, timeFrom, timeTill) {
                const url = 'http://10.144.2.194/zabbix/api_jsonrpc.php';
                const options = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "event.get",
                        params: {
                            output: ["eventid", "name", "clock", "severity", "hosts", "r_eventid"],
                            groupids: [groupId],
                            time_from: timeFrom,
                            time_till: timeTill,
                            search: { name: "Unavailable by ICMP ping" },
                            severities: [4],
                            selectHosts: ["name"],
                            sortfield: "clock",
                            sortorder: "DESC"
                        },
                        auth: "68f08dd04965819aebf23bc2659a239f",
                        id: 2
                    })
                };
                updateStatusMessage(`Fetching events for group ${groupId} from ${timeFrom} to ${timeTill}`, "black");
                return fetchWithRetry(url, options).catch(error => {
                    updateStatusMessage(`Error al consultar eventos para el grupo ${groupId}: ${error.message}`, "black");
                    return { error: true, groupId: groupId };
                });
            }

            async function fetchHostsForGroup(groupId) {
                const url = 'http://10.144.2.194/zabbix/api_jsonrpc.php';
                const options = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                };
                updateStatusMessage(`Fetching hosts for group ${groupId}`, "black");
                return fetchWithRetry(url, options).catch(error => {
                    updateStatusMessage(`Error al consultar hosts para el grupo ${groupId}: ${error.message}`, "black");
                    return { error: true, groupId: groupId };
                });
            }

            async function fetchResolveTime(eventId) {
                const url = 'http://10.144.2.194/zabbix/api_jsonrpc.php';
                const options = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "event.get",
                        params: {
                            output: ["clock"],
                            eventids: [eventId]
                        },
                        auth: "68f08dd04965819aebf23bc2659a239f",
                        id: 2
                    })
                };
                updateStatusMessage(`Fetching resolve time for event ${eventId}`, "black");
                let response = await fetchWithRetry(url, options);
                return response.result && response.result.length > 0 ? parseInt(response.result[0].clock) : null;
            }

            function mapSeverityToDescription(severityId) {
                const severityMap = { 4: "High" };
                return severityMap[severityId] || "Unknown";
            }

            function convertToColombianTime(unixTimestamp) {
                return new Date(unixTimestamp * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota" });
            }

            function calculateDuration(startTimestamp, endTimestamp) {
                let durationSeconds = endTimestamp - startTimestamp;
                let hours = Math.floor(durationSeconds / 3600);
                let minutes = Math.floor((durationSeconds % 3600) / 60);
                return `${hours}h ${minutes}m`;
            }

            async function processGroup(groupId, groupName, index, totalGroups) {
                try {
                    let allEvents = [];
                    let allHosts = [];

                    let intervalDuration = maxIntervalHours * 3600;
                    let intervalsProcessed = 0;
                    let totalIntervals = Math.ceil((endTimestamp - startTimestamp) / intervalDuration);

                    for (let currentStart = startTimestamp; currentStart < endTimestamp; currentStart += intervalDuration) {
                        let currentEnd = Math.min(currentStart + intervalDuration, endTimestamp);
                        updateStatusMessage(`Processing interval from ${currentStart} to ${currentEnd}`, "black");
                        let eventData = await fetchEventsForGroup(groupId, currentStart, currentEnd);
                        if (eventData.error) {
                            throw new Error(`Error fetching events for group ${groupId}`);
                        }
                        allEvents = allEvents.concat(eventData.result || []);
                        intervalsProcessed++;
                        let progressValue = index + (intervalsProcessed / totalIntervals);
                        let percentage = Math.round((progressValue / totalGroups) * 100);
                        $("#progress-bar").attr("value", progressValue);
                        $("#progress-percentage").text(`${percentage}%`);
                        updateStatusMessage(`Progreso: ${progressValue}/${totalGroups} (${percentage}%)`, "black");
                        await new Promise(resolve => setTimeout(resolve, 50)); // Reducido a 50 ms para suavizar la actualización
                    }

                    let hostData = await fetchHostsForGroup(groupId);
                    if (hostData.error) {
                        throw new Error(`Error fetching hosts for group ${groupId}`);
                    }
                    allHosts = hostData.result || [];

                    let reportData = await Promise.all(allEvents.map(async event => {
                        let host = allHosts.find(h => h.hostid === event.hosts[0].hostid);
                        let startTime = event.clock;
                        let resolveTime = event.r_eventid ? await fetchResolveTime(event.r_eventid) : null;
                        let duration = calculateDuration(startTime, resolveTime);

                        return {
                            "Hora Inicio": convertToColombianTime(startTime),
                            "Estado": mapSeverityToDescription(event.severity),
                            "Host": host ? host.name : "Desconocido",
                            "IP": host && host.interfaces.length > 0 ? host.interfaces[0].ip : "Desconocida",
                            "Departamento": host && host.inventory ? host.inventory.site_state : "Desconocido",
                            "Municipio": host && host.inventory ? host.inventory.site_city : "Desconocido",
                            "Problema": "Unavailable by ICMP ping",
                            "Hora Restauración": resolveTime ? convertToColombianTime(resolveTime) : "No Resuelto",
                            "Duración": resolveTime ? calculateDuration(startTime, resolveTime) : "Sin Datos"
                        };
                    }));

                    let sheetName = groupName.replace(/[:\/\\?*|\s]/g, "_");
                    let truncatedName = sheetName.length > 25 ? sheetName.substring(0, 25) + "..." : sheetName;
                    let ws = XLSX.utils.json_to_sheet(reportData);
                    XLSX.utils.book_append_sheet(wb, ws, truncatedName);

                } catch (error) {
                    updateStatusMessage(`Error al procesar el grupo ${groupId}: ${error.message}`, "black");
                }
            }

            async function processGroupsInBatches(groupIds, batchSize) {
                for (let i = 0; i < groupIds.length; i += batchSize) {
                    let batch = groupIds.slice(i, i + batchSize);
                    updateStatusMessage(`Procesando lote: ${i} a ${i + batchSize}`, "black");
                    let promises = batch.map(async (groupId, j) => {
                        let groupName = selectedGroupNames[i + j];
                        await processGroup(groupId, groupName, i + j, selectedGroupIds.length);
                    });
                    await Promise.all(promises);
                    let progressValue = i + batchSize;
                    let percentage = Math.round((progressValue / selectedGroupIds.length) * 100);
                    $("#progress-bar").attr("value", progressValue);
                    $("#progress-percentage").text(`${percentage}%`);
                }
            }

            const BATCH_SIZE = 1; // Limitar a 1 para reducir la carga
            let wb = XLSX.utils.book_new();

            try {
                await processGroupsInBatches(selectedGroupIds, BATCH_SIZE);

                let filename = `Informe_${startDate}_${endDate}_${selectedGroupNames.join('|')}.xlsx`;
                XLSX.writeFile(wb, filename);
                updateStatusMessage(`Informe generado con éxito: ${filename}`, "white");
                $("#download-report").attr("href", `Generar_Informe/${filename}`).show();
                $("#generate-report").prop("disabled", false);
                $("#loading-icon").hide();
                $("#progress-container").hide();
                $("#generate-new-report").show();

                // Mostrar mensaje emergente
                alert(`Informe generado con éxito: ${filename}`);
                
                // Actualizar la página después de 7 segundos
                //setTimeout(() => {
                  //  location.reload();
                //}, 7000);
            } catch (error) {
                updateStatusMessage(`Error al generar el informe: ${error.message}`, "black");
                $("#generate-report").prop("disabled", false);
                $("#loading-icon").hide();
                $("#progress-container").hide();
            }
        } else {
            alert("Por favor, complete todos los campos antes de generar el informe.");
        }
    });
});
