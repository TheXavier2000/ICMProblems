$(document).ready(function() {
    // Función para truncar el nombre si es demasiado largo
    function truncateName(name, maxLength) {
        if (name.length > maxLength) {
            return name.substring(0, maxLength) + '...';
        }
        return name;
    }

    // Ajusta el ancho y la posición del menú desplegable
    function adjustDropdownMenuPosition($input, $dropdownMenu) {
        const offset = $input.offset();
        const width = $input.outerWidth();
        const height = $input.outerHeight();

        $dropdownMenu.css({
            top: offset.top + height, // Ajusta para que el menú esté justo debajo del campo de texto
            left: offset.left,
            width: width // Ajusta el ancho para que coincida con el campo de texto
        });
    }

    // Lógica de carga de grupos
    function loadGroups() {
        let cacheBuster = new Date().getTime();

        $.getJSON('../json/groups.json?v=' + cacheBuster, function(data) {
            console.log("Datos de grupos cargados:", data);

            if (Array.isArray(data)) {
                $("#group-search").autocomplete({
                    source: data.map(item => ({
                        label: item.name,
                        value: item.id
                    })),
                    minLength: 0,
                    open: function(event, ui) {
                        adjustDropdownMenuPosition($("#group-search"), $("#group-dropdown-menu"));
                        $("#group-dropdown-menu").show(); // Muestra el dropdown-menu al abrir el autocompletado
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
                        $("#group-dropdown-menu").hide(); // Asegúrate de ocultar el dropdown-menu después de seleccionar
                        return false;
                    }
                });

                let dropdownContent = data.map(item => (
                    `<div data-id="${item.id}">${item.name}</div>`
                )).join('');
                $("#group-dropdown-menu").html(dropdownContent);
            } else {
                console.error("El formato de los datos no es un array.");
                $("#group-dropdown-menu").html('<div>Error al procesar los datos</div>');
            }

            $("#group-dropdown-menu").on('click', 'div', function() {
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
                $("#group-dropdown-menu").hide();
            });
        }).fail(function(jqxhr, textStatus, error) {
            console.error("Error al cargar groups.json: ", textStatus, error);
        });
    }

    // Lógica de carga de problemas
    function loadProblems() {
        let cacheBuster = new Date().getTime();

        $.getJSON('../json/problems.json?v=' + cacheBuster, function(data) {
            console.log("Datos de problemas cargados:", data);

            if (Array.isArray(data)) {
                $("#problem-search").autocomplete({
                    source: data.map(item => ({
                        label: item.name,
                        value: item.id
                    })),
                    minLength: 0,
                    open: function(event, ui) {
                        adjustDropdownMenuPosition($("#problem-search"), $("#problem-dropdown-menu"));
                        $("#problem-dropdown-menu").show(); // Muestra el dropdown-menu al abrir el autocompletado
                    },
                    select: function(event, ui) {
                        let selectedProblemId = ui.item.value;
                        let selectedProblemName = ui.item.label;

                        if ($("#selected-problems .problem[data-id='" + selectedProblemId + "']").length === 0) {
                            $("#selected-problems").append(
                                `<div class="problem" data-id="${selectedProblemId}">
                                    ${truncateName(selectedProblemName, 25)} <span class="remove-problem">X</span>
                                </div>`
                            );
                            $("#problem-search").val("");
                        }

                        $("#selected-problem-message").text("Problemas seleccionados: " + $("#selected-problems .problem").map(function() { return $(this).text().trim(); }).get().join(", "));
                        $("#problem-dropdown-menu").hide(); // Asegúrate de ocultar el dropdown-menu después de seleccionar
                        return false;
                    }
                });

                let dropdownContent = data.map(item => (
                    `<div data-id="${item.id}">${item.name}</div>`
                )).join('');
                $("#problem-dropdown-menu").html(dropdownContent);
            } else {
                console.error("El formato de los datos no es un array.");
                $("#problem-dropdown-menu").html('<div>Error al procesar los datos</div>');
            }

            $("#problem-dropdown-menu").on('click', 'div', function() {
                let selectedProblemId = $(this).data('id');
                let selectedProblemName = $(this).text();

                if ($("#selected-problems .problem[data-id='" + selectedProblemId + "']").length === 0) {
                    $("#selected-problems").append(
                        `<div class="problem" data-id="${selectedProblemId}">
                            ${truncateName(selectedProblemName, 25)} <span class="remove-problem">X</span>
                        </div>`
                    );
                    $("#problem-search").val("");
                }

                $("#selected-problem-message").text("Problemas seleccionados: " + $("#selected-problems .problem").map(function() { return $(this).text().trim(); }).get().join(", "));
                $("#problem-dropdown-menu").hide();
            });
        }).fail(function(jqxhr, textStatus, error) {
            console.error("Error al cargar problems.json: ", textStatus, error);
        });
    }

    loadGroups();
    loadProblems();

    $("#group-search").on("focus", function() {
        adjustDropdownMenuPosition($(this), $("#group-dropdown-menu"));
        $("#group-dropdown-menu").show();
    });

    $("#problem-search").on("focus", function() {
        adjustDropdownMenuPosition($(this), $("#problem-dropdown-menu"));
        $("#problem-dropdown-menu").show();
    });

    $(document).on('mousedown', function(event) {
        if (!$(event.target).closest('#group-dropdown-menu, #group-search').length) {
            $("#group-dropdown-menu").hide();
        }
        if (!$(event.target).closest('#problem-dropdown-menu, #problem-search').length) {
            $("#problem-dropdown-menu").hide();
        }
    });

    $("#generate-report").on("click", function() {
        $("#status-message").text("Generando informe...");
        //$("#loading-icon").show();
        //$(this).prop("disabled", true);

        // Capturar el problema seleccionado
        let selectedProblems = $("#selected-problems .problem").map(function() {
            return $(this).text().trim();
        }).get().join(", ");

        // Aquí puedes usar `selectedProblems` en la lógica para generar el informe.
        console.log("Problemas seleccionados para el informe:", selectedProblems);

        // Llamar a la función para generar el informe (si es necesario)
        // generateReport();
    });

    $("#generate-new-report").on("click", function() {
        $("#group-search").val("");
        $("#selected-groups").empty();
        $("#selected-group-ids").val("");
        $("#problem-search").val("");
        $("#selected-problems").empty();
        $("#selected-problem-ids").val("");
        $("#generate-report").show();
        $("#start-date").val("");
        $("#end-date").val("");
        $(this).hide();
    });

    // Manejar la eliminación de problemas
    $("#selected-problems").on("click", ".remove-problem", function() {
        let problemId = $(this).parent().data('id');
        $("#selected-problems .problem[data-id='" + problemId + "']").remove();
        $("#selected-problem-message").text("Problemas seleccionados: " + $("#selected-problems .problem").map(function() { return $(this).text().trim(); }).get().join(", "));
    });
});
