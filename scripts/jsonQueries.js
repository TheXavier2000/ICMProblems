$(document).ready(function() {
    // Objeto global para almacenar hostids por grupo
    window.groupHosts = {};

    // Cargar y seleccionar grupos desde la API de Zabbix
    function fetchGroups() {
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
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.result) {
                throw new Error("No se encontraron grupos o error en la consulta.");
            }
            let groups = data.result;

            $("#group-search").autocomplete({
                source: groups.map(group => ({
                    label: group.name,
                    value: group.groupid
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
                        $("#group-search").val("");

                        // Obtener los hostids para el grupo seleccionado
                        fetchHostIdsForGroup(selectedGroupId);
                    }

                    $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
                    $("#group-search").autocomplete("close");
                    return false;
                }
            });
        })
        .catch(error => console.error('Error al cargar grupos:', error));
    }

    fetchGroups(); // Llamar a la función para cargar los grupos al cargar la página

    // Función para eliminar un grupo seleccionado
    window.removeGroup = function(groupId) {
        $(`#selected-groups .group[data-id='${groupId}']`).remove();
        $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
        delete window.groupHosts[groupId]; // Eliminar los hostids almacenados para el grupo
    };

    // Función para obtener los hostids para un grupo
    function fetchHostIdsForGroup(groupId) {
        fetch('http://10.144.2.194/zabbix/api_jsonrpc.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "host.get",
                params: {
                    groupids: [groupId],
                    output: ["hostid", "name"]
                },
                auth: "68f08dd04965819aebf23bc2659a239f",
                id: 1
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.result) {
                throw new Error("No se encontraron hosts para el grupo.");
            }
            window.groupHosts[groupId] = data.result.map(host => host.hostid);

            // Asegúrate de actualizar algún indicador o hacer algo cuando se obtienen los hostids
        })
        .catch(error => console.error(`Error al obtener hosts para el grupo ${groupId}:`, error));
    }
});
