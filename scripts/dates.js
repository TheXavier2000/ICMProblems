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
            let startDate = $("#start-date").val();
            if (startDate) {
                if (selectedDate < startDate) {
                    $("#start-date").datepicker("setDate", selectedDate);
                }
            }
        }
    });

    // Limpiar las fechas seleccionadas
    $("#clear-dates").click(function() {
        $("#start-date").val("");
        $("#end-date").val("");
        $("#end-date").prop("disabled", true);
    });
});
