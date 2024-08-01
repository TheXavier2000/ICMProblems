$(document).ready(function() {
    // Función para truncar el nombre del grupo si es demasiado largo
    function truncateName(name, maxLength) {
        if (name.length > maxLength) {
            return name.substring(0, maxLength) + '...';
        }
        return name;
    }

    // Lógica de carga de grupos
    function loadGroups() {
        let cacheBuster = new Date().getTime();

        $.getJSON('../json/groups.json?v=' + cacheBuster, function(data) {
            console.log("Datos cargados:", data);

            if (Array.isArray(data)) {
                $("#group-search").autocomplete({
                    source: data.map(item => ({
                        label: item.name,
                        value: item.id
                    })),
                    minLength: 0,
                    open: function(event, ui) {
                        $("#dropdown-menu").show(); // Muestra el dropdown-menu al abrir el autocompletado
                    },
                    select: function(event, ui) {
                        let selectedGroupId = ui.item.value;
                        let selectedGroupName = ui.item.label;

                        if ($("#selected-groups .group[data-id='" + selectedGroupId + "']").length === 0) {
                            $("#selected-groups").append(
                                `<div class="group" data-id="${selectedGroupId}">
                                    ${truncateName(selectedGroupName, 25)} <span class="remove-group" onclick="removeGroup('${selectedGroupId}')">X</span>
                                </div>`
                            );
                            $("#group-search").val("");
                        }

                        $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
                        $("#dropdown-menu").hide(); // Asegúrate de ocultar el dropdown-menu después de seleccionar
                        return false;
                    }
                });

                let dropdownContent = data.map(item => (
                    `<div data-id="${item.id}">${item.name}</div>`
                )).join('');
                $("#dropdown-menu").html(dropdownContent);
            } else {
                console.error("El formato de los datos no es un array.");
                $("#dropdown-menu").html('<div>Error al procesar los datos</div>');
            }

            $("#dropdown-menu").on('click', 'div', function() {
                let selectedGroupId = $(this).data('id');
                let selectedGroupName = $(this).text();

                if ($("#selected-groups .group[data-id='" + selectedGroupId + "']").length === 0) {
                    $("#selected-groups").append(
                        `<div class="group" data-id="${selectedGroupId}">
                            ${truncateName(selectedGroupName, 25)} <span class="remove-group" onclick="removeGroup('${selectedGroupId}')">X</span>
                        </div>`
                    );
                    $("#group-search").val("");
                }

                $("#selected-group-message").text("Grupos seleccionados: " + $("#selected-groups .group").map(function() { return $(this).text().trim(); }).get().join(", "));
                $("#dropdown-menu").hide();
            });
        }).fail(function(jqxhr, textStatus, error) {
            console.error("Error al cargar groups.json: ", textStatus, error);
        });
    }

    loadGroups();

    $("#group-search").on("focus", function() {
        $("#dropdown-menu").show();
    });

    $(document).on('mousedown', function(event) {
        if (!$(event.target).closest('#dropdown-menu, #group-search').length) {
            $("#dropdown-menu").hide();
        }
    });

    $("#generate-report").on("click", function() {
        $(this).prop("disabled", true);
        $("#status-message").removeClass().addClass("status-message status-message_INCOMPLETE").text("Generando informe...");
        $("#loading-icon").show();
    });
    
    $("#generate-new-report").on("click", function() {
        // Solo permitir limpiar los campos si el botón no está deshabilitado
        if (!$(this).prop("disabled")) {
            $("#group-search").val("");
            $("#selected-groups").empty();
            $("#selected-group-ids").val("");
            $("#generate-report").show();
            $("#start-date").val("");
            $("#end-date").val("");
            $(this).hide();
        }
    });
    
});
