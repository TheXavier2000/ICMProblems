$(document).ready(function() {
    // Función para truncar nombres largos
    function truncateName(name, maxLength) {
        return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
    }

    // Cargar datos para el autocompletado de grupos
    $.getJSON('../json/groups.json', function(data) {
        $("#group-search").autocomplete({
            source: data.map(item => ({
                label: item.name,
                value: item.id
            })),
            select: function(event, ui) {
                let selectedGroupId = ui.item.value;
                let selectedGroupName = ui.item.label;

                // Verificar si el grupo ya está seleccionado
                if ($("#selected-groups .group[data-id='" + selectedGroupId + "']").length === 0) {
                    $("#selected-groups").append(
                        `<div class="group" data-id="${selectedGroupId}">
                            ${truncateName(selectedGroupName, 25)} <span class="remove-group" onclick="removeGroup('${selectedGroupId}')">X</span>
                        </div>`
                    );
                    $("#group-search").val(""); // Limpiar el campo de búsqueda
                }

                // Actualizar el mensaje de grupos seleccionados
                $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
                $("#group-search").autocomplete("close"); // Cerrar la lista de autocompletado
                return false; // Evitar que el valor seleccionado se coloque en el campo de búsqueda
            }
        });
    });

    // Cargar datos para el autocompletado de severidades
    $.getJSON('../json/severities.json', function(data) {
        $("#severities-search").autocomplete({
            source: data.map(item => ({
                label: item.name,
                value: item.id
            })),
            select: function(event, ui) {
                let selectedSeverityId = ui.item.value;
                let selectedSeverityName = ui.item.label;
    
                // Guardar el ID de severidad seleccionada en el array selectedSeverityIds
                let selectedSeverityIds = $("#selected-severities").data("selectedSeverityIds") || [];
                if (!selectedSeverityIds.includes(selectedSeverityId)) {
                    selectedSeverityIds.push(selectedSeverityId);
                    $("#selected-severities").data("selectedSeverityIds", selectedSeverityIds);
    
                    $("#selected-severities").append(
                        `<div class="severity" data-id="${selectedSeverityId}">
                            ${truncateName(selectedSeverityName, 25)} <span class="remove-severity" onclick="removeSeverity('${selectedSeverityId}')">X</span>
                        </div>`
                    );
                    $("#severities-search").val("");
                }
    
                $("#selected-severity-message").text("Severidades seleccionadas: " + $("#selected-severities .severity").map(function() { return $(this).text().trim(); }).get().join(", "));
                $("#severities-search").autocomplete("close");
                return false;
            }
        });
    });
    
    function removeSeverity(severityId) {
        let selectedSeverityIds = $("#selected-severities").data("selectedSeverityIds") || [];
        selectedSeverityIds = selectedSeverityIds.filter(id => id !== severityId);
        $("#selected-severities").data("selectedSeverityIds", selectedSeverityIds);
    
        $(`#selected-severities .severity[data-id='${severityId}']`).remove();
    
        $("#selected-severity-message").text("Severidades seleccionadas: " + $("#selected-severities .severity").map(function() { return $(this).text().trim(); }).get().join(", "));
    }
    
    function truncateName(name, maxLength) {
        return name.length > maxLength ? name.substring(0, maxLength - 3) + '...' : name;
    }
    

    // Función para eliminar un grupo seleccionado
    window.removeGroup = function(groupId) {
        $(`#selected-groups .group[data-id='${groupId}']`).remove();
        $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
    };

    // Función para eliminar una severidad seleccionada
    window.removeSeverity = function(severityId) {
        let selectedSeverityIds = $("#selected-severities").data("selectedSeverityIds") || [];
        selectedSeverityIds = selectedSeverityIds.filter(id => id !== severityId);
        $("#selected-severities").data("selectedSeverityIds", selectedSeverityIds);

        $(`#selected-severities .severity[data-id='${severityId}']`).remove();
        $("#selected-severity-message").text("Severidades seleccionadas: " + $("#selected-severities .severity").map(function() { return $(this).text().trim(); }).get().join(", "));
    };
});
