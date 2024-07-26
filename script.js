$(document).ready(function() {
    function addCustomButtons(input) {
        setTimeout(function() {
            let buttonPane = $(input).datepicker("widget").find(".ui-datepicker-buttonpane");

            // Eliminar el botón "Done"
            buttonPane.find(".ui-datepicker-close").remove();

            if (buttonPane.find(".ui-datepicker-today").length === 0) {
                $("<button>", {
                    text: "Hoy",
                    class: "ui-datepicker-today ui-state-default ui-priority-primary ui-corner-all",
                    click: function() {
                        let today = new Date();
                        $(input).datepicker('setDate', today);
                        $(input).datepicker("hide");
                    }
                }).appendTo(buttonPane);
            }

            if (buttonPane.find(".ui-datepicker-clear").length === 0) {
                $("<button>", {
                    text: "Borrar",
                    class: "ui-datepicker-clear ui-state-default ui-priority-primary ui-corner-all",
                    click: function() {
                        $(input).val("");
                        $(input).datepicker("hide");
                    }
                }).appendTo(buttonPane);
            }
        }, 1);
    }

    $("#start-date").datepicker({
        dateFormat: "yy-mm-dd", // Formato de fecha adecuado para tu aplicación
        onSelect: function(selectedDate) {
            $("#end-date").datepicker("option", "minDate", selectedDate);
            $("#end-date").prop("disabled", false); // Habilitar el campo de fecha final al seleccionar una fecha de inicio
        },
        beforeShow: function(input, inst) {
            addCustomButtons(input);
        },
        showButtonPanel: true // Mostrar panel de botones
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
        },
        beforeShow: function(input, inst) {
            addCustomButtons(input);
        },
        showButtonPanel: true // Mostrar panel de botones
    });

    // Botón para limpiar fechas
    $("#clear-dates").click(function() {
        $("#start-date").val(""); // Limpiar fecha de inicio
        $("#end-date").val(""); // Limpiar fecha final
        $("#end-date").prop("disabled", true); // Deshabilitar campo de fecha final
    });

    // Lógica para cargar y seleccionar grupos
    fetch('http://10.144.2.194/zabbix/api_jsonrpc.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "hostgroup.get",
            params: {
                output: ["groupid", "name"]
            },
            auth: "68f08dd04965819aebf23bc2659a239f",
            id: 1
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.result) {
            throw new Error("No se encontraron grupos o error en la consulta.");
        }
        let groups = data.result;

        // Configurar el autocompletado
        $("#group-search").autocomplete({
            source: groups.map(group => ({
                label: group.name,  // Texto a mostrar en la lista de sugerencias
                value: group.groupid // Valor que se seleccionará
            })),
            select: function(event, ui) {
                let selectedGroupId = ui.item.value;
                let selectedGroupName = ui.item.label;

                if ($("#selected-groups .group[data-id='" + selectedGroupId + "']").length === 0) {
                    $("#selected-groups").append(
                        `<div class="group" data-id="${selectedGroupId}">
                            ${selectedGroupName} <span class="remove-group" onclick="removeGroup('${selectedGroupId}')">X</span>
                        </div>`
                    );
                    $("#group-search").val(""); // Limpiar el campo de búsqueda
                }

                $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
                $("#group-search").autocomplete("close"); // Cerrar la lista de autocompletado
                return false; // Prevenir el autocompletado de llenar el campo
            }
        });
    })
    .catch(error => console.error('Error al cargar grupos:', error));

    // Función para eliminar un grupo
    window.removeGroup = function(groupId) {
        $(`#selected-groups .group[data-id='${groupId}']`).remove();
        $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
    };

    $("#generate-report").click(function() {
        let startDate = $("#start-date").val();
        let endDate = $("#end-date").val();
        let selectedGroupIds = $("#selected-groups .group").map(function() { return $(this).data("id"); }).get(); // Obtiene los IDs de los grupos seleccionados
        let selectedGroupNames = $("#selected-groups .group").map(function() { return $(this).text().trim().replace(' X', ''); }).get(); // Obtiene los nombres de los grupos seleccionados
    
        if (startDate && endDate && selectedGroupIds.length) {
            $("#status-message").text("Se está generando su informe...");
            $("#download-report").hide(); // Oculta el botón de descarga mientras se genera el informe
    
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
                        groupids: selectedGroupIds, // Usar los grupos seleccionados
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
                            groupids: selectedGroupIds, // Usar los grupos seleccionados
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
                            "Municipio": host && host.inventory ? host.inventory.site_city : "Desconocido",
                            "Problema": "Unavailable by ICMP ping" // Agregar el nombre del problema
                        };
                    });
    
                    // Convertir datos a Excel usando SheetJS
                    let wb = XLSX.utils.book_new();
                    let ws = XLSX.utils.json_to_sheet(reportData);
    
                    // Aplicar negrilla a los encabezados
                    ws["!cols"] = [
                        { wpx: 200 }, { wpx: 100 }, { wpx: 150 }, { wpx: 100 }, { wpx: 150 }, { wpx: 150 }, { wpx: 200 }
                    ]; // Ajustar el ancho de las columnas si es necesario
                    ws["!rows"] = [];
                    ws["A1"].s = { font: { bold: true } };
                    ws["B1"].s = { font: { bold: true } };
                    ws["C1"].s = { font: { bold: true } };
                    ws["D1"].s = { font: { bold: true } };
                    ws["E1"].s = { font: { bold: true } };
                    ws["F1"].s = { font: { bold: true } };
                    ws["G1"].s = { font: { bold: true } };
    
                    XLSX.utils.book_append_sheet(wb, ws, "Informe");
    
                    // Crear un archivo descargable
                    let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    let blob = new Blob([wbout], { type: "application/octet-stream" });
                    let fileName = `informe_${startDate}_${endDate}_${selectedGroupNames.join("_")}.xlsx`;
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
    
                    $("#status-message").addClass("status-message_OK").text("Informe generado exitosamente.");
                    $("#download-report").show();
    
                    // Limpiar los campos después de generar el informe
                    $("#start-date").val(""); // Limpiar fecha de inicio
                    $("#end-date").val(""); // Limpiar fecha final
                    $("#end-date").prop("disabled", true); // Deshabilitar campo de fecha final
                    $("#selected-groups").empty(); // Limpiar grupos seleccionados
                    $("#selected-group-message").text(""); // Limpiar mensaje de grupos seleccionados
                });
            })
            .catch(error => {
                console.error('Error al generar el informe:', error);
                $("#status-message").addClass("status-message_ERROR").text("Error al generar el informe.");
            });
        } else {
            $("#status-message").addClass("status-message_INCOMPLETE").text("Por favor, seleccione las fechas y grupos requeridos.");
        }
    });
    
});
