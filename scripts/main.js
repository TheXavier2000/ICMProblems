$.getScript("../scripts/dates.js")
    .done(function() {
        console.log("dates.js cargado correctamente.");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error al cargar dates.js:", textStatus, errorThrown);
    });

$.getScript("../scripts/jsonQueries.js")
    .done(function() {
        console.log("jsonQueries.js cargado correctamente.");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error al cargar jsonQueries.js:", textStatus, errorThrown);
    });

$.getScript("../scripts/filters.js")
    .done(function() {
        console.log("filters.js cargado correctamente.");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error al cargar filters.js:", textStatus, errorThrown);
    });

$.getScript("../scripts/reportGeneration.js")
    .done(function() {
        console.log("reportGeneration.js cargado correctamente.");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error al cargar reportGeneration.js:", textStatus, errorThrown);
    });
