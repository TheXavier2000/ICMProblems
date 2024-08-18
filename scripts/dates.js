$(document).ready(function() {
    // Función para agregar botones personalizados al selector de fecha
    function addCustomButtons(input) {
        setTimeout(function() {
            let buttonPane = $(input).datepicker("widget").find(".ui-datepicker-buttonpane");

            // Eliminar el botón "Done"
            buttonPane.find(".ui-datepicker-close").remove();

            // Botón para seleccionar la fecha de hoy
            if (buttonPane.find(".ui-datepicker-today").length === 0) {
                $("<button>", {
                    text: "Hoy",
                    class: "ui-datepicker-today ui-state-default ui-priority-primary ui-corner-all",
                    click: function() {
                        let today = new Date();
                        today.setHours(0, 0, 0, 0);  // Ajustar la hora a 00:00:00 local
                        $(input).datepicker('setDate', today);
                        $(input).datepicker("hide");
                    }
                }).appendTo(buttonPane);
            }

            // Botón para borrar la fecha seleccionada
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

    // Inicializar el selector de fecha de inicio
    $("#start-date").datepicker({
        dateFormat: "yy-mm-dd",
        onSelect: function(selectedDate) {
            let startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);  // Ajustar la hora a las 00:00:00 local
            $("#start-date").datepicker('setDate', startDate);  // Actualizar con la hora ajustada
            $("#end-date").datepicker("option", "minDate", selectedDate);
            $("#end-date").prop("disabled", false);
        },
        beforeShow: function(input, inst) {
            addCustomButtons(input);
        },
        showButtonPanel: true
    });

    // Inicializar el selector de fecha de fin
    $("#end-date").prop("disabled", true).datepicker({
        dateFormat: "yy-mm-dd",
        maxDate: 0,
        onSelect: function(selectedDate) {
            let endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);  // Ajustar la hora a las 23:59:59 local
            $("#end-date").datepicker('setDate', endDate);  // Actualizar con la hora ajustada
            let startDate = $("#start-date").val();
            if (startDate && selectedDate < startDate) {
                $("#start-date").datepicker("setDate", endDate);
            }
        },
        beforeShow: function(input, inst) {
            addCustomButtons(input);
        },
        showButtonPanel: true
    });

    // Limpiar las fechas seleccionadas
    $("#clear-dates").click(function() {
        $("#start-date").val("");
        $("#end-date").val("");
        $("#end-date").prop("disabled", true);
    });
});
