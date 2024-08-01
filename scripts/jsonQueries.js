$(document).ready(function() {
    // Cargar y seleccionar grupos desde la API de Zabbix
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
                }

                $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
                $("#group-search").autocomplete("close");
                return false;
            }
        });
    })
    .catch(error => console.error('Error al cargar grupos:', error));

    // Función para eliminar un grupo seleccionado
    window.removeGroup = function(groupId) {
        $(`#selected-groups .group[data-id='${groupId}']`).remove();
        $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
    };
});
