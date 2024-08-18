$(document).ready(function() {
    function updateStatusMessage(message, color = "black") {
        console.log(message);
        $("#status-message").text(message).css("color", color);
    }

    $("#generate-report").click(async function() {
        $("#status-message").text("").css("color", "black");


        let startDate = $("#start-date").val();
        let endDate = $("#end-date").val();
        let selectedGroupIds = $("#selected-groups .group").map(function() {
            return $(this).data("id");
        }).get();
        let selectedGroupNames = $("#selected-groups .group").map(function() {
            return $(this).text().trim().replace(' X', '');
        }).get();
        let selectedProblems = $("#selected-problems .problem").map(function() {
            return $(this).text().trim().replace(' X', '');
        }).get();

        // Validar si todos los campos requeridos están completos
        if (!startDate || !endDate || selectedGroupIds.length === 0 || selectedProblems.length === 0) {
            alert("Es necesario llenar todos los campos: fechas, grupos y problemas.");
        return;  // Detener la ejecución si falta algún campo
        }

        updateStatusMessage("Generación del informe iniciada");
        $("#generate-report").prop("disabled", true);  // Deshabilitar el botón
        $("#loading-icon").show();

        if (startDate && endDate && selectedGroupIds.length && selectedProblems.length) {
            //updateStatusMessage("Fechas y grupos seleccionados. Generando informe...", "black");
            //$("#generate-report").prop("disabled", true);
            $("#status-message").removeClass().addClass("status-message status-message_GENERATING").text("Se está generando su informe").css("color", "black");
            //$("#loading-icon").show();
            $("#progress-container").show();
            $("#progress-bar").attr("value", 0).attr("max", selectedGroupIds.length);
            $("#progress-percentage").text("0%");

            function convertToUnixTimestamp(dateString, isEndDate = false) {
                // Crear una fecha ajustada a la zona horaria de Colombia (UTC-5)
                let date = new Date(dateString + "T00:00:00-05:00");  // Ajuste manual de la hora
            
                if (isEndDate) {
                    // Establecer la hora al final del día (23:59:59.999) en la zona horaria de Colombia
                    date.setHours(23, 59, 59, 999);
                } else {
                    // Establecer la hora al inicio del día (00:00:00) en la zona horaria de Colombia
                    date.setHours(0, 0, 0, 0);
                }
            
                // Convertir la fecha a timestamp UNIX
                return Math.floor(date.getTime() / 1000);
            }
            
            

            let startTimestamp = convertToUnixTimestamp(startDate);  // Inicia a las 00:00:00
            let endTimestamp = convertToUnixTimestamp(endDate, true);  // Termina a las 23:59:59
            
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

            async function fetchEventsForGroup(groupId, timeFrom, timeTill, problemName) {
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
                            search: { name: problemName },
                            severities: [4],
                            selectHosts: ["name"],
                            sortfield: "clock",
                            sortorder: "DESC"
                        },
                        auth: "68f08dd04965819aebf23bc2659a239f",
                        id: 2
                    })
                };
                updateStatusMessage(`Fetching events for group ${groupId} from ${timeFrom} to ${timeTill} with problem ${problemName}`, "black");
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

            function sanitizeSheetName(name) {
                // Reemplazar caracteres no permitidos en nombres de hojas
                return name.replace(/[\/\\\*\[\]:\?]/g, '|');
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
            
                        // Aquí, recorremos todos los problemas seleccionados
                        for (let problem of selectedProblems) {
                            let eventData = await fetchEventsForGroup(groupId, currentStart, currentEnd, problem);
                            if (eventData.error) {
                                throw new Error(`Error fetching events for group ${groupId}`);
                            }
                            allEvents = allEvents.concat(eventData.result || []);
                        }
            
                        intervalsProcessed++;
                        let progressValue = index + (intervalsProcessed / totalIntervals);
                        let percentage = Math.round((progressValue / totalGroups) * 100);
                        $("#progress-bar").attr("value", progressValue);
                        $("#progress-percentage").text(`${percentage}%`);
                        updateStatusMessage(`Progreso: ${progressValue}/${totalGroups} (${percentage}%)`, "black");
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
            
                    let hostData = await fetchHostsForGroup(groupId);
                    if (hostData.error) {
                        throw new Error(`Error fetching hosts for group ${groupId}`);
                    }
                    allHosts = hostData.result || [];
            
                    let reportData = [];
                    for (let event of allEvents) {
                        let host = allHosts.find(h => h.hostid === event.hosts[0].hostid);
                        let startTime = event.clock;
                        let resolveTime = event.r_eventid ? await fetchResolveTime(event.r_eventid) : null;
                        let duration = calculateDuration(startTime, resolveTime);
            
                        // Verificamos si el nombre del evento incluye el problema actual
                        for (let problem of selectedProblems) {
                            if (event.name.includes(problem)) {
                                reportData.push({
                                    "Hora Inicio": convertToColombianTime(startTime),
                                    "Estado": mapSeverityToDescription(event.severity),
                                    "Host": host ? host.name : "Desconocido",
                                    "IP": host && host.interfaces.length > 0 ? host.interfaces[0].ip : "Desconocida",
                                    "Departamento": host && host.inventory ? host.inventory.site_state : "Desconocido",
                                    "Municipio": host && host.inventory ? host.inventory.site_city : "Desconocido",
                                    "Problema": problem, // Problema específico
                                    "Hora Restauración": resolveTime ? convertToColombianTime(resolveTime) : "No resuelto",
                                    "Duración": resolveTime ? duration : "En curso"
                                });
                            }
                        }
                    }
            
                    return reportData;
            
                } catch (error) {
                    updateStatusMessage(`Error en el grupo ${groupId} (${groupName}): ${error.message}`, "black");
                    return [];
                }
            }
            

            let allData = [];
            let groupedData = {};

            for (let i = 0; i < selectedGroupIds.length; i++) {
                let groupId = selectedGroupIds[i];
                let groupName = selectedGroupNames[i];
                updateStatusMessage(`Procesando grupo ${groupId} (${groupName})`, "black");

                let groupData = await processGroup(groupId, groupName, i, selectedGroupIds.length);
                groupedData[groupName] = groupData;

                let progressPercentage = Math.round(((i + 1) / selectedGroupIds.length) * 100);
                $("#progress-bar").attr("value", i + 1);
                $("#progress-percentage").text(`${progressPercentage}%`);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (Object.keys(groupedData).length === 0) {
                updateStatusMessage("No se encontraron datos para el rango de fechas y grupos seleccionados.", "black");
                $("#loading-icon").hide();
                $("#progress-container").hide();
                $("#generate-report").prop("disabled", false);
                return;
            }

            updateStatusMessage("Generando archivo Excel...", "black");

            let workbook = XLSX.utils.book_new();
            for (let [groupName, data] of Object.entries(groupedData)) {
                let sanitizedGroupName = sanitizeSheetName(groupName);
                let worksheet = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedGroupName);
            }

            let excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

            // Para descargar el archivo Excel
            let blob = new Blob([excelBuffer], { type: "application/octet-stream" });
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${selectedGroupNames.join('|')}|${startDate}|${endDate}.xlsx`;
            link.click();

            updateStatusMessage("Informe generado con éxito", "green");
            $("#loading-icon").hide();
            $("#progress-container").hide();
            $("#generate-report").prop("disabled", false);

        } else {
            updateStatusMessage("Por favor, selecciona un rango de fechas y al menos un grupo.", "red");
        }
    });
});